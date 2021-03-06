from django.db import connection
from django.db.models import Q, Value
from django.db.models.functions import Coalesce

from django.utils.translation import ugettext_lazy as _

from datetime import date, datetime, timedelta

from accounts.models import Usersetting
from companies import models as m

from tsap import settings as s
from tsap import constants as c
from tsap import functions as f
from employees import dicts as ed

from timeit import default_timer as timer

import pytz
import json
import logging

logger = logging.getLogger(__name__)


def status_found_in_statussum(status, status_sum):
    # PR2019-07-17 checks if status is in status_sum
    # e.g.: status_sum=15 will be converted to status_tuple = (1,2,4,8)
    # status = 0 gives always True
    found = False
    if status:
        if status_sum:
            for i in range(8, -1, -1):  # range(start_value, end_value, step), end_value is not included!
                power = 2 ** i
                if status_sum >= power:
                    if power == status:
                        found = True
                        break
                    else:
                        status_sum -= power
    else:
        found = True
    return found


def get_status_tuple_from_sum(status_sum):
    # PR2019-07-17 converts status_sum into tuple,
    # e.g.: status_sum=15 will be converted to status_tuple = (1,2,4,8)
    status_list = []
    if status_sum is not None:
        if status_sum != 0:
            for i in range(8, -1, -1):  # range(start_value, end_value, step), end_value is not included!
                power = 2 ** i
                if status_sum >= power:
                    status_sum -= power
                    status_list.insert(0, power)  # list.insert(0, value) adds at the beginning of the list
    if not status_list:
        status_list = [0]
    return tuple(status_list)


def get_status_sum_from_tuple(status_tuple):
    # PR2019-07-17 converts status_tuple to status_sum
    # e.g.: status_tuple = (1,2,4,8) will be converted to status_sum = 15
    status_sum = 0
    if status_tuple:
        for status in status_tuple:
            status_sum += status

    return status_sum


def add_status_to_statussum(status, old_status_sum):
    # PR2019-07-17 adds status to status_tuple if not yet exists
    # e.g.: status_tuple = (1,2,4,8) will be converted to status_sum = 15
    new_status_sum = old_status_sum
    if old_status_sum:
        if status:
            old_status_tuple = get_status_tuple_from_sum(old_status_sum)
            if status not in old_status_tuple:
                new_status_sum += status
    else:
        new_status_sum = status
    return new_status_sum


def remove_status_from_statussum(status, old_status_sum):
    # PR2019-07-17 adds status to status_tuple if not yet exists
    # e.g.: status_tuple = (1,2,4,8) will be converted to status_sum = 15
    new_status_sum = old_status_sum
    if old_status_sum:
        if status:
            old_status_tuple = get_status_tuple_from_sum(old_status_sum)
            if status in old_status_tuple:
                new_status_sum -= status
    return new_status_sum


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def check_rosterdate_emplhours(upload_dict, user_lang, request):  # PR2019-11-11 PR2020-07-26 PR2021-02-20
    logging_on = s.LOGGING_ON
    if logging_on:
        logger.debug(' --- check_rosterdate_emplhours --- ')
        logger.debug('upload_dict: ' + str(upload_dict))
    # function gets rosterdate from upload_dict. If None: lookup last rosterdate in orderhour and add one day to it.
    # Generates a "SELECT MAX..." query, return value is a dict
    # # upload_dict: (input) {rosterdate: "2019-11-14"} or (create) {next: True} or (delete) {last: True}
    # 'rosterdate_check': {'mode': 'delete', 'rosterdate': '2019-12-14'}} <class 'dict'>

    mode = upload_dict.get('mode')
    rosterdate_dict = {'mode': mode}
    rosterdate_dte, rosterdate_iso = None, None

    # if rosterdate in dict: check this rosterdate, otherwise check last rosterdate or next
    if 'rosterdate' in upload_dict:
        rosterdate_iso = upload_dict.get('rosterdate')
        rosterdate_dte = f.get_dateobj_from_dateISOstring(rosterdate_iso)

    if rosterdate_dte is None:
        # get last rosterdate of Emplhour
        sql_keys = {'comp_id': request.user.company_id}
        sql_list = ["SELECT MAX(eh.rosterdate) AS max_eh_rd",
                    "FROM companies_emplhour AS eh",
                    "INNER JOIN companies_orderhour AS oh ON (eh.orderhour_id = oh.id)",
                    "INNER JOIN companies_order AS o ON (oh.order_id = o.id)",
                    "INNER JOIN companies_customer AS c ON (o.customer_id = c.id)",
                    "WHERE (c.company_id = %(comp_id)s)"]
        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)

        max_rosterdate_tuple = newcursor.fetchone()
        if max_rosterdate_tuple:
            max_rosterdate = max_rosterdate_tuple[0]
            if max_rosterdate:
                rosterdate_dte = max_rosterdate
                rosterdate_iso = rosterdate_dte.isoformat()
                # in create mode: get next rosterdate
                if mode == 'check_create':
                    # add one day to rosterdate_dte
                    rosterdate_dte = rosterdate_dte + timedelta(days=1)
                    rosterdate_iso = rosterdate_dte.isoformat()

    count_emplhour, count_confirmed_or_locked_or_added, count_added, count_may_be_deleted = 0, 0, 0, 0
    msg_list = []
    if rosterdate_dte is None:
        msg_list.append(_('There are no rosters.'))

        if mode == 'check_create':
            rosterdate_dte = date.today()
            rosterdate_iso = rosterdate_dte.isoformat()
            rosterdate_dict['rosterdate'] = rosterdate_iso

            msg_txt = ' '.join((str(_('Rosterdate')),
                                f.format_date_short_from_date(rosterdate_dte, False, False, user_lang),
                                str(_(' will be created.'))))
            msg_list.append(msg_txt)

    else:
        # count Emplhour records of this date
        count_emplhour = check_rosterdate_count(rosterdate_iso, request)
        count_confirmed_or_locked_or_added = count_rosterdate_confirmed_or_lockewd_or_added(rosterdate_iso, request)
        count_may_be_deleted = count_rosterdate_may_be_deleted(rosterdate_iso, request)

        rosterdate_dict['rosterdate'] = rosterdate_iso
        rosterdate_dict['count'] = count_emplhour
        rosterdate_dict['confirmed'] = count_confirmed_or_locked_or_added
        rosterdate_dict['may_be_deleted'] = count_may_be_deleted

        msg_txt = ' '.join(
            (str(_('Rosterdate')), f.format_date_short_from_date(rosterdate_dte, False, False, user_lang)))
        if not count_emplhour:
            msg_txt += str(_(' has no shifts.'))
        elif count_emplhour == 1:
            msg_txt += str(_(' has one shift.'))
        else:
            msg_txt += ' '.join((str(_(' has')), str(count_emplhour), str(_('shifts.'))))
        msg_list.append(msg_txt)

        if count_emplhour:
            added_or_deleted_txt = str(_(' be deleted.')) if mode == 'check_delete' else str(_(' be replaced.'))
            if count_confirmed_or_locked_or_added or count_added:
                msg_txt = ''
                if count_confirmed_or_locked_or_added:
                    if count_confirmed_or_locked_or_added == count_emplhour:
                        if count_confirmed_or_locked_or_added == 1:
                            msg_txt = _('It is a confirmed, locked or added shift.')
                        else:
                            msg_txt = _('They are confirmed, locked or added shifts.')
                    else:
                        if count_confirmed_or_locked_or_added == 1:
                            msg_txt = _('One is a confirmed, locked or added shift.')
                        else:
                            msg_txt = ' '.join((str(count_confirmed_or_locked_or_added),
                                                str(_('are confirmed, locked or added shifts.'))))
                if count_confirmed_or_locked_or_added == 1:
                    msg_txt += ' ' + str(_('This shift will not'))
                else:
                    msg_txt += ' ' + str(_('These shifts will not'))
                msg_txt += added_or_deleted_txt
                msg_list.append(msg_txt)

            if count_may_be_deleted:
                msg_txt = ''
                if count_may_be_deleted == count_emplhour:
                    if count_may_be_deleted == 1:
                        msg_txt = str(_('This shift will'))
                    else:
                        msg_txt = str(_('These shifts will'))
                else:
                    if count_may_be_deleted == 1:
                        msg_txt = str(_('The other shift will'))
                    else:
                        msg_txt = str(_('The other shifts will'))
                msg_txt += added_or_deleted_txt
                msg_list.append(msg_txt)

    rosterdate_dict['msg_list'] = msg_list
    if logging_on:
        logger.debug('rosterdate_dict: ' + str(rosterdate_dict))
    return rosterdate_dict


def check_rosterdate_count(rosterdate_iso, request):  # PR2021-02-20
    # logger.debug(' ============= check_rosterdate_count ============= ')
    # if any: count emplhour records that are confirmed or locked
    sql_keys = {'compid': request.user.company.pk, 'rd': rosterdate_iso}
    sql_list = ["SELECT COUNT(eh.id) AS row_count",
                "FROM companies_emplhour AS eh",
                "INNER JOIN companies_orderhour AS oh ON (eh.orderhour_id = oh.id)",
                "INNER JOIN companies_order AS o ON (oh.order_id = o.id)",
                "INNER JOIN companies_customer AS c ON (o.customer_id = c.id)",
                "WHERE c.company_id = %(compid)s::INT",
                "AND (eh.rosterdate = %(rd)s::DATE)"
                ]
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    row_count_tuple = newcursor.fetchone()

    emplhour_count = 0
    if row_count_tuple:
        emplhour_count = row_count_tuple[0]
    return emplhour_count


def count_rosterdate_may_be_deleted(rosterdate_iso, request):  # PR2021-02-20
    # logger.debug(' ============= count_rosterdate_may_be_deleted ============= ')
    # logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
    # check if rosterdate is not locked, not confirmed and not added row
    # added row has status = even number, confirmed / locked row has status >= 4 (c.STATUS_02_START_CONFIRMED)
    # if any: count emplhour records that are confirmed or locked
    sql_keys = {'compid': request.user.company.pk, 'rd': rosterdate_iso}
    sql_list = ["SELECT COUNT(eh.id)",
                "FROM companies_emplhour AS eh",
                "INNER JOIN companies_orderhour AS oh ON (eh.orderhour_id = oh.id)",
                "INNER JOIN companies_order AS o ON (oh.order_id = o.id)",
                "INNER JOIN companies_customer AS c ON (o.customer_id = c.id)",
                "WHERE c.company_id = %(compid)s::INT",
                "AND (eh.rosterdate = %(rd)s::DATE)",
                "AND MOD(eh.status, 2) = 1"
                "AND eh.status < " + str(c.STATUS_02_START_CONFIRMED),
                "AND eh.payrollpublished_id IS NULL AND eh.invoicepublished_id IS NULL"
                ]
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    row_count_tuple = newcursor.fetchone()

    count_may_be_deleted = 0
    if row_count_tuple:
        count_may_be_deleted = row_count_tuple[0]
    return count_may_be_deleted


def count_rosterdate_confirmed_or_lockewd_or_added(rosterdate_iso, request):  # PR2021-02-20
    # logger.debug(' ============= count_rosterdate_confirmed_or_lockewd_or_added ============= ')
    # logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
    # check if rosterdate has orderhours / emplhours. If so, check if there are locked  /confirmed shifts

    # if any: count emplhour records that are confirmed or locked
    sql_keys = {'compid': request.user.company.pk, 'rd': rosterdate_iso}
    sql_list = ["SELECT COUNT(eh.id)",
                "FROM companies_emplhour AS eh",
                "INNER JOIN companies_orderhour AS oh ON (eh.orderhour_id = oh.id)",
                "INNER JOIN companies_order AS o ON (oh.order_id = o.id)",
                "INNER JOIN companies_customer AS c ON (o.customer_id = c.id)",
                "WHERE c.company_id = %(compid)s::INT",
                "AND (eh.rosterdate = %(rd)s::DATE)",
                "AND ( (eh.status >= " + str(c.STATUS_02_START_CONFIRMED) + ") OR (MOD(eh.status, 2) = 0)",
                "OR (eh.payrollpublished_id IS NOT NULL) OR (eh.invoicepublished_id IS NOT NULL) )"
                ]
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    row_count_tuple = newcursor.fetchone()

    count_confirmed_or_locked_or_added = 0
    if row_count_tuple:
        count_confirmed_or_locked_or_added = row_count_tuple[0]

    return count_confirmed_or_locked_or_added


def get_period_dict_and_save(request, get_current):  # PR2019-07-13
    # logger.debug(' --- get_period_dict_and_save --- ')
    # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}
    # default mode is 'current'
    new_period_dict = {'mode': 'current'}
    if request.user is not None and request.user.company is not None:

        # 1. get saved period_dict
        saved_period_dict = get_period_from_settings(request)
        # logger.debug('saved_period_dict ' + str(saved_period_dict))

        # 2. copy key values from saved_period_dict in new_period_dict (don't copy dict, the loop skips keys that are not in use)
        if saved_period_dict:
            for field in ['mode', 'interval', 'overlap_prev', 'overlap_next',
                          'periodstart', 'periodend',
                          'range', 'rangestart', 'rangeend']:
                if field in saved_period_dict:
                    new_period_dict[field] = saved_period_dict[field]

        # 3. set mode='current' if 'current' in saved_period_dict or get_current=True
        if get_current:
            new_period_dict['mode'] = 'current'
        elif new_period_dict['mode'] == 'current':
            get_current = True
        # logger.debug('new_period_dict ' + str(new_period_dict))

        interval_int = int(new_period_dict['interval'])
        overlap_prev_int = int(new_period_dict['overlap_prev'])
        overlap_next_int = int(new_period_dict['overlap_next'])
        period_starttime_iso = None

        # 4. check if periodstart is present when not get_current. If not found: get_current
        if not get_current:
            if 'periodstart' in new_period_dict:
                period_starttime_iso = new_period_dict['periodstart']
            else:
                get_current = True
        # logger.debug('>>>> period_starttime_iso: ' + str(period_starttime_iso))
        # period_starttime_iso: 2019-07-29T22:00:00+00:00

        if get_current:
            # 5. if get_current: set start time of current period in UTC
            period_start_utc, period_end_utc = get_current_period(interval_int, overlap_prev_int, overlap_next_int,
                                                                  request)
            # put start- and end-time of current period in new_period_dict
            period_start_iso = period_start_utc.isoformat()
            period_end_iso = period_end_utc.isoformat()
            new_period_dict['periodstart'] = period_start_iso
            new_period_dict['periodend'] = period_end_iso
            # 'periodstart': '2019-07-29T22:00:00+00:00', 'periodend': '2019-08-01T22:00:00+00:00',
        else:
            # 6. if not get_current: calculate end time:
            if period_starttime_iso:
                period_starttime_utc = f.get_datetime_UTC_from_ISOstring(period_starttime_iso)
                period_endtime_utc = get_period_endtime(period_starttime_utc, interval_int, overlap_prev_int,
                                                        overlap_next_int)
                period_endtime_iso = period_endtime_utc.isoformat()
                new_period_dict['periodend'] = period_endtime_iso

        # add today to dict
        today = f.get_today_local_iso(request)
        new_period_dict['today'] = today

        period_dict_json = json.dumps(new_period_dict)  # dumps takes an object and produces a string:
        request.user.set_usersetting(c.KEY_USER_PERIOD_EMPLHOUR, period_dict_json)

    # logger.debug('new_period_dict: ' + str(new_period_dict))
    return new_period_dict


def get_current_period(interval_int, overlap_prev_int, overlap_next_int, request):  # PR2019-07-12
    # logger.debug(' ============= get_current_period ============= ')
    # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    period_starttime_utc = None
    period_endtime_utc = None

    if request.user is not None and request.user.company is not None:

        # get comp_timezone
        comp_timezone = request.user.company.timezone if request.user.company.timezone else s.TIME_ZONE

        # get now without timezone
        now_utc_naive = datetime.utcnow()
        # now_utc_naive: 2019-07-10 14:48:15.742546 <class 'datetime.datetime'>

        # convert now to timezone utc
        now_utc = now_utc_naive.replace(tzinfo=pytz.utc)
        # now_utc: 2019-07-10 14:48:15.742546+00:00 <class 'datetime.datetime'>

        # convert now_utc to now_local ( = company timezone)
        # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
        timezone = pytz.timezone(comp_timezone)
        now_local = now_utc.astimezone(timezone)
        # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

        # split now_local
        year_int, month_int, date_int, hour_int, minute_int = split_datetime(now_local)

        # get index of current interval (with interval = 6 hours, interval 6-12h has index 1
        interval_index = 0
        if interval_int:
            interval_index = int(hour_int / interval_int)
        # logger.debug('interval_int: ' + str(interval_int) + ' interval_index: ' + str(interval_index))

        # get local start hour of current interval
        period_starthour = interval_int * interval_index
        # logger.debug('period_starthour: ' + str(period_starthour))

        # get local start time of current interval without timezone
        interval_starttime_naive = datetime(year_int, month_int, date_int, period_starthour, 0)
        # logger.debug('interval_starttime_naive: ' + str(interval_starttime_naive))

        # get local start time of current interval in local timezone ( = company timezone)
        # localize can only be used with naive datetime objects. It does not change the datetime, olny adds tzinfo
        interval_starttime_local = timezone.localize(interval_starttime_naive)
        # logger.debug('interval_starttime_local: ' + str(interval_starttime_local))

        # get local start time of current period (is interval_start_local minus overlap_prev_int)
        period_starttime_local = interval_starttime_local - timedelta(hours=overlap_prev_int)
        # logger.debug('overlap_prev_int: ' + str(overlap_prev_int) + ' period_starttime_local: ' + str(period_starttime_local))

        # get start time of current period in UTC
        period_starttime_utc = period_starttime_local.astimezone(pytz.UTC)
        # logger.debug('period_starttime_utc: ' + str(period_starttime_utc))

        # get utc end time of current period ( = utc start time of current period plus overlap_prev_int + interval + overlap_next_int
        period_int = overlap_prev_int + interval_int + overlap_next_int
        period_endtime_utc = period_starttime_utc + timedelta(hours=period_int)
        # logger.debug('period: ' + str(period_int) + 'period_endtime_utc' + str(period_endtime_utc))

    return period_starttime_utc, period_endtime_utc


def get_prevnext_period(prevnext, period_timestart_iso, interval_int, overlap_prev_int, overlap_next_int,
                        comp_timezone):  # PR2019-07-13
    # logger.debug(' ============= get_prevnext_period ============= ')
    # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    # logger.debug('period_timestart_iso: ' + str(period_timestart_iso) + ' ' + str(type(period_timestart_iso)))
    # logger.debug('interval_int: ' + str(interval_int) + ' ' + str(type(interval_int)))

    hour_add = 0
    if prevnext == 'next':
        hour_add = interval_int
    elif prevnext == 'prev':
        hour_add = -interval_int
    period_int = interval_int + overlap_prev_int + overlap_next_int

    # Attention: add/subtract interval must be done in local time, because of DST

    # convert period_timestart_iso into period_timestart_local
    period_timestart_local = f.get_datetime_LOCAL_from_ISOstring(period_timestart_iso, comp_timezone)
    # logger.debug('period_timestart_local: ' + str(period_timestart_local) + ' ' + str(type(period_timestart_local)))

    # get local start time of new period ( = local start time of current period plus interval)
    prevnext_timestart_local = period_timestart_local + timedelta(hours=hour_add)
    # logger.debug('prevnext_timestart_local: ' + str(prevnext_timestart_local))

    # get start time of new period in UTC
    prevnext_timestart_utc = prevnext_timestart_local.astimezone(pytz.UTC)
    # logger.debug('prevnext_timestart_utc: ' + str(prevnext_timestart_utc))

    # get local end time of new period ( = local start time of new period plus interval + overlap_prev + overlap_next
    prevnext_timeend_local = prevnext_timestart_local + timedelta(hours=period_int)
    # logger.debug('prevnext_timeend_local: ' + str(prevnext_timeend_local))

    # get end time of new period in UTC
    prevnext_timeend_utc = prevnext_timeend_local.astimezone(pytz.UTC)
    # logger.debug('prevnext_timeend_utc: ' + str(prevnext_timeend_utc))

    return prevnext_timestart_utc, prevnext_timeend_utc


def get_timesstartend_from_perioddict(period_dict, request):  # PR2019-07-15
    # logger.debug(' ============= get_timesstartend_from_perioddict ============= ')

    period_timestart_utc = None
    period_timeend_utc = None

    period_timestart_iso = None
    period_timeend_iso = None

    if 'mode' in period_dict:
        if period_dict['mode'] == 'current':
            # get start- and end-time of current period in UTC
            interval_int = 0
            overlap_prev_int = 0
            overlap_next_int = 0
            if period_dict['interval']:
                interval_int = int(period_dict['interval'])
            if period_dict['overlap_prev']:
                overlap_prev_int = int(period_dict['overlap_prev'])
            if period_dict['overlap_next']:
                overlap_next_int = int(period_dict['overlap_next'])

            period_timestart_utc, period_timeend_utc = get_current_period(
                interval_int, overlap_prev_int, overlap_next_int, request)
        else:
            if period_dict['mode'] == 'prevnext':
                if 'periodstart' in period_dict:
                    period_timestart_iso = period_dict['periodstart']
                if 'periodend' in period_dict:
                    period_timeend_iso = period_dict['periodend']
            if period_dict['mode'] == 'range':
                if 'rangestart' in period_dict:
                    period_timestart_iso = period_dict['rangestart']
                if 'rangeend' in period_dict:
                    period_timeend_iso = period_dict['rangeend']
            if period_timestart_iso:
                period_timestart_utc = f.get_datetime_UTC_from_ISOstring(period_timestart_iso)
            if period_timeend_iso:
                period_timeend_utc = f.get_datetime_UTC_from_ISOstring(period_timeend_iso)

    # logger.debug('period_timestart_utc: ' + str(period_timestart_utc))
    # logger.debug('period_timeend_utc: ' + str(period_timeend_utc))

    return period_timestart_utc, period_timeend_utc


def get_period_from_settings(request):  # PR2019-07-09
    # logger.debug(' ============= get_period_from_settings ============= ')

    period_dict = {}
    if request.user is not None and request.user.company is not None:

        # get period from Usersetting
        saved_period_dict = {}
        dict_json = request.user.get_usersetting(c.KEY_USER_PERIOD_EMPLHOUR)
        if dict_json:
            saved_period_dict = json.loads(dict_json)

        # if not found: get period from Companysetting
        else:
            dict_json = request.user.company.get_companysetting(c.KEY_USER_PERIOD_EMPLHOUR)
            if dict_json:
                saved_period_dict = json.loads(dict_json)

        # copy key values from saved_period_dict in period_dict (don't copy dict, the loop skips keys that are not in use)

        for field in ['mode', 'interval', 'overlap_prev', 'overlap_next',
                      'periodstart', 'periodend', 'range', 'rangestart', 'rangeend']:
            period_dict[field] = None

            if saved_period_dict:
                if field in saved_period_dict:
                    period_dict[field] = saved_period_dict[field]

            # if key not found: add key with default value
            # debug. value was Null, gave error: int() argument must be a string, a bytes-like object or a number, not 'NoneType'
            if period_dict[field] is None:
                if field == 'mode':
                    period_dict[field] = 'current'
                if field == 'interval':
                    period_dict[field] = 24
                if field in ['overlap_prev', 'overlap_next']:
                    period_dict[field] = 0
                if field == 'range':
                    period_dict[field] = '0;0;1;0'

    return period_dict


def get_period_endtime(period_starttime_utc, interval_int, overlap_prev_int, overlap_next_int):  # PR2019-07-13
    # logger.debug(' ============= get_period_endtime ============= ')
    # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    # utc end time of period = local start time of period plus overlap_prev_int + interval + overlap_next_int
    period_int = overlap_prev_int + interval_int + overlap_next_int
    period_endtime_utc = period_starttime_utc + timedelta(hours=period_int)
    # logger.debug('period: ' + str(period_int) + 'period_endtime_utc' + str(period_endtime_utc))

    return period_endtime_utc


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_scheme_list(filter_dict, company, comp_timezone, user_lang):  # PR2021-05-26
    # logger.debug(' ------------- create_scheme_list ------------- ')
    # logger.debug('filter_dict: ' + str(filter_dict))

    customer_pk = None
    order_pk = filter_dict.get('order_pk')
    if order_pk is None:
        customer_pk = filter_dict.get('customer_pk')

    sql_keys = {'comp_id': company.id}
    sql_list = ["SELECT s.id, s.code, CONCAT('scheme_', s.id::TEXT) AS mapid, 'scheme' AS table,",
                # "s.id AS pk, o.id  AS ppk,",  # used to fill SBR select table in t_Fill_SelectTable
                "s.cycle, s.datefirst AS s_datefirst, s.datelast  AS s_datelast, s.inactive,",
                "s.modifiedat AS modat, COALESCE(SUBSTRING (au.username, 7), '') AS modby_usr,",
                "c.isabsence AS c_isabsence,",
                "o.id AS o_id, o.istemplate AS o_istemplate, o.datefirst AS o_datefirst, o.datelast  AS o_datelast,",
                "s.excludecompanyholiday, s.excludepublicholiday, s.divergentonpublicholiday",

                "FROM companies_scheme AS s",
                "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                "LEFT JOIN accounts_user AS au ON (au.id = s.modifiedby_id)",

                "WHERE c.company_id = %(comp_id)s "]

    if customer_pk:
        sql_keys['c_id'] = customer_pk
        sql_list.append("AND c.id = %(c_id)s::INT")
    if order_pk:
        sql_keys['o_id'] = order_pk
        sql_list.append("AND o.id = %(o_id)s::INT")

    sql_list.append("ORDER BY LOWER(s.code)")
    sql = ' '.join(sql_list)

    with connection.cursor() as cursor:
        cursor.execute(sql, sql_keys)
        scheme_rows = f.dictfetchall(cursor)

    scheme_list = []
    for row in scheme_rows:
        # logger.debug('row: ' + str(row))
        item_dict = {}
        create_scheme_dict_from_sql(row, item_dict, user_lang)

        if item_dict:
            scheme_list.append(item_dict)

    return scheme_rows, scheme_list


def create_scheme_dict_from_sql(scheme, item_dict, user_lang):
    # logger.debug(' ------------- create_scheme_dict_from_sql ------------- ')
    # --- create dict of this order PR2019-09-28 PR2020-05-24
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    if scheme:
        for field in c.FIELDS_SCHEME:
            # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = scheme.get('s_id')
                field_dict['ppk'] = scheme.get('o_id')
                field_dict['table'] = 'scheme'
                # get order.isabsence and order.istemplate
                field_dict['isabsence'] = scheme.get('c_isabsence', False)
                field_dict['istemplate'] = scheme.get('o_istemplate', False)

            elif field in ['order']:
                pass

            elif field == 'code':
                field_dict['value'] = scheme.get(field, '-')

            elif field in ['cycle']:
                field_dict['value'] = scheme.get(field, 0)

            # also add date when empty, to add min max date
            elif field in ('datefirst', 'datelast'):
                scheme_datefirstlast = scheme.get('s_' + field)
                if scheme_datefirstlast:
                    field_dict['value'] = scheme_datefirstlast
                order_datefirstlast = scheme.get('o_' + field)
                if order_datefirstlast:
                    field_dict['o_' + field] = order_datefirstlast

            # also add date when empty, to add min max date
            elif field in (
            'excludecompanyholiday', 'divergentonpublicholiday', 'excludepublicholiday', 'nohoursonsaturday',
            'nohoursonsunday', 'nohoursonpublicholiday'):
                field_dict['value'] = scheme.get(field, False)

            elif field == 'billable':
                pass

            elif field in ['pricecode', 'additioncode', 'taxcode']:
                pass
                # TODO

            elif field in ['isabsence', 'istemplate']:
                pass

            elif field == 'inactive':
                field_dict['value'] = scheme.get(field, False)

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


# ------------- end of create_scheme_dict_from_sql -------------

def create_scheme_dict(scheme, item_dict, user_lang):
    # logger.debug(' ------------- create_scheme_dict ------------- ')
    # --- create dict of this order PR2019-09-28
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    if scheme:
        # FIELDS_SCHEME = ('id', 'order', 'cat', 'cycle', 'excludecompanyholiday', 'excludepublicholiday', 'inactive')

        # ---  get min max date from scheme and order
        scheme_datefirst = getattr(scheme, 'datefirst')
        order_datefirst = getattr(scheme.order, 'datefirst')
        mindate = f.date_latest_of_two(scheme_datefirst, order_datefirst)  # PR2019-09-12

        scheme_datelast = getattr(scheme, 'datelast')
        order_datelast = getattr(scheme.order, 'datelast')
        maxdate = f.date_earliest_of_two(scheme_datelast, order_datelast)  # PR2019-09-12

        table = 'scheme'
        for field in c.FIELDS_SCHEME:

            # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = scheme.pk
                field_dict['ppk'] = scheme.order.pk
                field_dict['table'] = table
                # get order.isabsence and scheme.order PR2020-03-22
                if scheme.order.isabsence:
                    field_dict['isabsence'] = True
                if scheme.order.istemplate:
                    field_dict['istemplate'] = True

                item_dict['pk'] = scheme.pk

            elif field in ['order']:
                pass

            elif field in ['cat']:
                cat_sum = getattr(scheme, field, 0)
                field_dict['value'] = cat_sum

            elif field in ['cycle']:
                field_dict['value'] = getattr(scheme, field, 0)

            # also add date when empty, to add min max date
            elif field == 'datefirst':
                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_obj=scheme_datefirst,
                    mindate=order_datefirst,
                    maxdate=maxdate)
            elif field == 'datelast':
                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_obj=scheme_datelast,
                    mindate=mindate,
                    maxdate=order_datelast)

            elif field == 'billable':
                value = getattr(scheme, field, 0)
                if not value:
                    ordr_billable = getattr(scheme.order, field, 0)
                    if ordr_billable:
                        value = ordr_billable * -1  # inherited value gets negative sign
                    else:
                        cust_billable = getattr(scheme.order.customer, field, 0)
                        if cust_billable:
                            value = cust_billable * -1  # inherited value gets negative sign
                        else:
                            comp_billable = getattr(scheme.order.customer.company, field, 0)
                            if comp_billable:
                                value = comp_billable * -1  # inherited value gets negative sign
                if value:
                    field_dict['value'] = value

            elif field in ['pricecode', 'additioncode', 'taxcode']:
                pass
                # TODO

            elif field in ['isabsence', 'istemplate']:
                pass

            elif field == 'inactive':
                field_dict['value'] = getattr(scheme, field, False)

            else:
                value = getattr(scheme, field)
                if value:
                    field_dict['value'] = value

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


# ------------- end of create_scheme_dict -------------

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_schemeitem_list(filter_dict, company):
    # ---  create list of all schemeitems of this order PR2019-08-29 PR2020-05-23
    # logger.debug(' ----- create_schemeitem_list  -----  ')
    # logger.debug('filter_dict' + str(filter_dict) )

    customer_pk = None
    order_pk = filter_dict.get('order_pk')
    if order_pk is None:
        customer_pk = filter_dict.get('customer_pk')

    sql_keys = {'comp_id': company.id}

    sql_list = ["SELECT si.id AS si_id, CONCAT('schemeitem_', sh.id::TEXT) AS mapid, 'schemeitem' AS table,",
                "si.rosterdate, si.onpublicholiday, si.inactive, si.cat,",
                "si.modifiedat AS modat, COALESCE(SUBSTRING (au.username, 7), '') AS modby_usr,",
                "s.id AS s_id, s.code AS s_code, o.id AS o_id, o.isabsence, o.istemplate,",
                "sh.id AS sh_id, sh.code AS sh_code, sh.isrestshift AS sh_isrestshift,",
                "sh.offsetstart AS sh_offsetstart, sh.offsetend  AS sh_offsetend,",
                "sh.breakduration AS sh_breakduration, sh.timeduration AS sh_timeduration,",
                "t.id AS t_id, t.code AS t_code",

                "FROM companies_schemeitem AS si",
                "INNER JOIN companies_scheme AS s ON (s.id = si.scheme_id)",
                "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                "LEFT JOIN companies_shift AS sh ON (sh.id = si.shift_id)",
                "LEFT JOIN companies_team AS t ON (t.id = si.team_id)",
                "LEFT JOIN accounts_user AS au ON (au.id = si.modifiedby_id)",

                "WHERE c.company_id = %(comp_id)s"
                ]
    if customer_pk:
        sql_keys['c_id'] = customer_pk
        sql_list.append("AND c.id = %(c_id)s::INT")
    if order_pk:
        sql_keys['o_id'] = order_pk
        sql_list.append("AND o.id = %(o_id)s::INT")

    sql = ' '.join(sql_list)

    with connection.cursor() as cursor:
        cursor.execute(sql, sql_keys)
        schemeitem_rows = f.dictfetchall(cursor)

    schemeitem_list = []
    for row in schemeitem_rows:
        # logger.debug('schemeitem: ' + str(schemeitem))
        item_dict = {}
        create_schemeitem_dict_from_sql(row, item_dict)

        if item_dict:
            schemeitem_list.append(item_dict)

    return schemeitem_list, schemeitem_rows


# ----- end of create_schemeitem_list -----


def create_schemeitem_dict_from_sql(schemeitem, item_dict):
    # --- create dict of this schemeitem PR2019-07-22
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('schemeitem' + str(schemeitem))

    if schemeitem:
        # FIELDS_SCHEMEITEM = ('id', 'scheme', 'shift', 'team','rosterdate', 'onpublicholiday',
        #                      'cat', 'isabsence', 'istemplate', 'inactive')

        for field in c.FIELDS_SCHEMEITEM:
            # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = schemeitem.get('si_id')
                field_dict['ppk'] = schemeitem.get('s_id')
                field_dict['table'] = 'schemeitem'
                field_dict['istemplate'] = schemeitem.get('istemplate')
                field_dict['isabsence'] = schemeitem.get('isabsence')

            elif field in ('istemplate', 'isabsence'):
                pass

            elif field == 'scheme':
                field_dict['pk'] = schemeitem.get('s_id')
                field_dict['ppk'] = schemeitem.get('o_id')
                field_dict['code'] = schemeitem.get('s_code')

            elif field == 'cat':
                pass

            # elif field in ('onpublicholiday', 'cat', 'inactive'):
            elif field in ('onpublicholiday', 'inactive'):
                field_dict['value'] = schemeitem.get(field, False)

            elif field == 'rosterdate':
                rosterdate = schemeitem.get('rosterdate')
                # PR2020-06-08 debug: gave error: 'NoneType' object has no attribute 'isoformat'. if rosterdate added
                if rosterdate:
                    field_dict['value'] = rosterdate.isoformat()

                # --- get excel_start from rosterdate and offsetstart, used to sort schemeitems in datatable on page planning
                excel_date = f.get_Exceldate_from_datetime(rosterdate)
                if excel_date:
                    excel_start = excel_date * 1440
                    offset_start = schemeitem.get('sh_offsetstart')
                    if offset_start:
                        excel_start = excel_start + offset_start
                    field_dict['excelstart'] = excel_start

            elif field == 'shift':
                shift_pk = schemeitem.get('sh_id')
                if shift_pk:
                    field_dict['pk'] = shift_pk
                    shift_code = schemeitem.get('sh_code')
                    is_restshift = schemeitem.get('sh_isrestshift')
                    if is_restshift and shift_code is None:
                        shift_code = _('Rest shift')
                    field_dict['isrestshift'] = is_restshift
                    field_dict['code'] = shift_code

                    for fld in ('offsetstart', 'offsetend'):
                        value = schemeitem.get('sh_' + fld)
                        if value is not None:
                            field_dict[fld] = value

                    for fld in ('breakduration', 'timeduration'):
                        value = schemeitem.get('sh_' + fld, 0)
                        if value:
                            field_dict[fld] = value

            elif field == 'team':
                team_pk = schemeitem.get('t_id')
                if team_pk:
                    team_code = schemeitem.get('t_code')
                    field_dict['pk'] = team_pk
                    field_dict['code'] = team_code
                    field_dict['abbrev'] = get_teamcode_abbrev(team_code)

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


# ----------- end of create_schemeitem_dict_from_sql -----------


def create_schemeitem_dict(schemeitem, item_dict):
    # --- create dict of this schemeitem PR2019-07-22
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('item_dict' + str(item_dict))

    if schemeitem:

        # FIELDS_SCHEMEITEM = ('id', 'scheme', 'shift', 'team','rosterdate', 'onpublicholiday',
        #                      'cat', 'isabsence', 'istemplate', 'inactive')
        for field in c.FIELDS_SCHEMEITEM:
            # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = schemeitem.pk
                field_dict['ppk'] = schemeitem.scheme.pk
                field_dict['table'] = 'schemeitem'
                if schemeitem.istemplate:
                    field_dict['istemplate'] = True

            elif field == 'istemplate':
                pass

            elif field == 'scheme':
                scheme = getattr(schemeitem, field)
                if scheme:
                    field_dict['pk'] = scheme.id
                    field_dict['ppk'] = scheme.order_id
                    field_dict['code'] = scheme.code

            elif field in ('cat',):
                value = getattr(schemeitem, field)
                if value:
                    field_dict['value'] = value

            # elif field in ('onpublicholiday', 'cat', 'inactive'):
            elif field in ('onpublicholiday', 'inactive'):
                value = getattr(schemeitem, field, False)
                # if value:
                field_dict['value'] = value

            elif field == 'rosterdate':
                rosterdate = getattr(schemeitem, field)
                cycle_startdate = None
                cycle_enddate = None

                # lookup lowest rosterdate
                schemeitem_cyclestart = m.Schemeitem.objects.filter(
                    scheme=schemeitem.scheme
                ).exclude(rosterdate__isnull=True).order_by('rosterdate').first()

                if schemeitem_cyclestart:
                    cycle_startdate = schemeitem_cyclestart.rosterdate
                    days = (schemeitem.scheme.cycle - 1)
                    cycle_enddate = cycle_startdate + timedelta(days=days)

                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_obj=rosterdate,
                    mindate=cycle_startdate,
                    maxdate=cycle_enddate)

            elif field == 'shift':
                shift = getattr(schemeitem, field)
                if shift:
                    field_dict['pk'] = shift.id
                    field_dict['code'] = shift.code

                    if shift.isrestshift:
                        field_dict['code_R'] = shift.code + ' (R)'

                    for fld in ('offsetstart', 'offsetend'):
                        value = getattr(shift, fld)
                        if value is not None:
                            field_dict[fld] = value

                    for fld in ('breakduration', 'timeduration'):
                        value = getattr(shift, fld)
                        if value:
                            field_dict[fld] = value

            elif field == 'team':
                team = getattr(schemeitem, field)
                if team:
                    field_dict['pk'] = team.id
                    if team.code:
                        field_dict['code'] = team.code
                        field_dict['abbrev'] = get_teamcode_abbrev(team.code)

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


# ----------- end of create_schemeitem_dict -----------


def create_shift_rows(filter_dict, company):
    # ---  create list of all shifts of this order  PR2019-08-08 PR2020-05-23
    # logger.debug(' --- create_shift_rows --- ')
    # logger.debug('filter_dict' + str(filter_dict))

    # calculate billable_value. Value = value * -1 when it is an inherited value
    """
        sql "comp.billable = 2" is short for CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END"
            "CASE WHEN c.isabsence OR sh.isrestshift THEN FALSE ELSE",
                "CASE WHEN sh.billable = 0 OR sh.billable IS NULL THEN",
                    "CASE WHEN o.billable = 0 OR o.billable IS NULL THEN",
                        "CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END",
                    "ELSE",
                        "CASE WHEN o.billable = 2 THEN TRUE ELSE FALSE END",
                    "END",
                "ELSE",
                    "CASE WHEN sh.billable = 2 THEN TRUE ELSE FALSE END",
                "END ",
            "END AS sh_isbillable,",
    """

    company_pk = company.pk
    sql_keys = {'compid': company_pk}

    sql_list = [
        "SELECT sh.id, sh.code, CONCAT('shift_', sh.id::TEXT) AS mapid, 'shift' AS table,",
        "sh.offsetstart, sh.offsetend, sh.breakduration, sh.timeduration, sh.isrestshift,",
        "s.id AS s_id, o.id AS o_id, c.isabsence AS c_isabsence, c.istemplate AS c_istemplate,",

        "CASE WHEN c.isabsence OR sh.isrestshift THEN FALSE ELSE",
        "CASE WHEN sh.billable = 0 OR sh.billable IS NULL THEN",
        "CASE WHEN o.billable = 0 OR o.billable IS NULL",
        "THEN comp.billable = 2 ELSE o.billable = 2 END",
        "ELSE sh.billable = 2 END",
        "END AS sh_isbillable,",

        "sh.pricecode_id, sh.additioncode_id, sh.taxcode_id,",
        "sh.wagefactorcode_id AS wfc_onwd, sh.wagefactoronsat_id AS wfc_onsat,"
        "sh.wagefactoronsun_id AS wfc_onsun, sh.wagefactoronph_id AS wfc_onph,",
        "sh.modifiedat AS modat, COALESCE(SUBSTRING (au.username, 7), '') AS modby_usr",

        "FROM companies_shift AS sh",
        "INNER JOIN companies_scheme AS s ON (s.id = sh.scheme_id)",
        "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
        "INNER JOIN companies_company AS comp ON (comp.id = c.company_id)",
        "LEFT JOIN accounts_user AS au ON (au.id = sh.modifiedby_id)",
        "WHERE comp.id = %(compid)s::INT"]

    shift_pk = filter_dict.get('shift_pk')
    order_pk = filter_dict.get('order_pk')
    customer_pk = filter_dict.get('customer_pk')
    if shift_pk:
        sql_keys['sh_id'] = shift_pk
        sql_list.append('AND sh.id = %(sh_id)s::INT')
    elif order_pk:
        sql_keys['o_id'] = order_pk
        sql_list.append('AND o.id = %(o_id)s::INT')
    elif customer_pk:
        sql_keys['c_id'] = customer_pk
        sql_list.append('AND ( c.id = CAST(%(c_id)s AS INTEGER))')
    if order_pk or customer_pk:
        sql_list.append('ORDER BY sh.isrestshift, offsetstart NULLS LAST')

    sql = ' '.join(sql_list)
    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    shift_rows = f.dictfetchall(newcursor)

    return shift_rows


def create_shift_dict_from_sqlXXX(shift, update_dict, user_lang):  # PR2020-05-23
    # logger.debug(' ----- create_shift_dict_from_sql ----- ')
    # update_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    # FIELDS_SHIFT = ('id', 'scheme', 'code', 'cat', 'isrestshift', 'istemplate', 'billable',
    #                 'offsetstart', 'offsetend', 'breakduration', 'timeduration',
    #                 'wagefactor', 'priceratejson', 'additionjson')

    if shift:
        offsetstart_value = shift.get('offsetstart')  # offsetstart can have value 'None'
        offsetend_value = shift.get('offsetend')  # offsetend can have value 'None'
        breakduration_value = shift.get('breakduration', 0)
        timeduration_value = shift.get('timeduration', 0)
        is_restshift = shift.get('isrestshift', False)

        # calculate timeduration
        # if both offsetstart and offsetend have value: calculate timeduration
        # else: use stored value of timeduration
        # timeduration = 0 in restshift
        timeduration = f.calc_timeduration_from_values(
            is_restshift=is_restshift,
            offsetstart=offsetstart_value,
            offsetend=offsetend_value,
            breakduration=breakduration_value,
            saved_timeduration=timeduration_value)

        for field in c.FIELDS_SHIFT:

            # --- get field_dict from  item_dict if it exists
            field_dict = update_dict[field] if field in update_dict else {}

            # --- create field_dict 'id'
            if field == 'id':
                field_dict['pk'] = shift.get('id')
                field_dict['ppk'] = shift.get('s_id')
                field_dict['table'] = 'shift'
                field_dict['istemplate'] = shift.get('c_istemplate')
                field_dict['order_pk'] = shift.get('o_id')

            elif field == 'istemplate':
                pass

            elif field == 'isrestshift':
                field_dict['value'] = is_restshift

            elif field == 'code':
                field_dict['value'] = shift.get(field)

            elif field == 'offsetstart':
                # Note: value '0' is a valid value, so don't use 'if value:'
                if offsetstart_value is not None:
                    field_dict['value'] = offsetstart_value
                field_dict["minoffset"] = -720

                maxoffset = 1440
                if offsetend_value is not None:
                    maxoffset = offsetend_value - breakduration_value
                    if maxoffset > 1440:
                        maxoffset = 1440
                field_dict["maxoffset"] = maxoffset

            elif field == 'offsetend':
                # Note: value '0' is a valid value, so don't use 'if value:'
                if offsetend_value is not None:
                    field_dict['value'] = offsetend_value
                field_dict["maxoffset"] = 2160

                minoffset = 0
                if offsetstart_value is not None:
                    minoffset = offsetstart_value + breakduration_value
                    if minoffset < 0:
                        minoffset = 0
                field_dict["minoffset"] = minoffset

            elif field == 'breakduration':
                field_dict['value'] = breakduration_value
                field_dict["minoffset"] = 0
                field_dict["maxoffset"] = timeduration if timeduration < 1440 else 1440

            elif field == 'timeduration':
                if timeduration:
                    field_dict['value'] = timeduration

            if field_dict:
                update_dict[field] = field_dict

    # ---  remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(update_dict)

    shift_update = update_dict
    return shift_update


# ----------- end of create_shift_dict_from_sql -----------


def create_shift_dict(shift, update_dict):  # PR2021-01-04
    # logger.debug(' ----- create_shift_dict ----- ')
    # update_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    if shift:
        scheme = shift.scheme
        order = scheme.order
        customer = order.customer

        # calculate billable_value
        field = 'billable'
        billable_value = getattr(shift, field, 0)
        if not billable_value:
            ordr_billable = getattr(shift.scheme.order, field, 0)
            if ordr_billable:
                billable_value = ordr_billable * -1  # inherited value gets negative sign
            else:
                comp_billable = getattr(shift.scheme.order.customer.company, field, 0)
                if comp_billable:
                    billable_value = comp_billable * -1  # inherited value gets negative sign

        shift_dict = {'mapid': 'shift_' + str(shift.pk),
                      'id': shift.pk,
                      's_id': scheme.pk,
                      'o_id': order.pk,
                      'c_isabsence': getattr(customer, 'isabsence', False),
                      'c_istemplate': getattr(customer, 'istemplate', False),
                      'code': shift.code,  # offsetstart can have value 'None'
                      'offsetstart': shift.offsetstart,  # offsetstart can have value 'None'
                      'offsetend': shift.offsetend,  # offsetend can have value 'None'
                      'breakduration': getattr(shift, 'breakduration', 0),
                      'timeduration': getattr(shift, 'timeduration', 0),
                      'isrestshift': getattr(shift, 'isrestshift', False),
                      'billable': billable_value,
                      'sh_modat': shift.modifiedat,
                      'au_usr': shift.modifiedby.username_sliced if shift.modifiedby else None
                      }
        # NIU  'pricecode_id': None, 'additioncode_id':  None, 'taxcode_id':  None,
        # 'wagefactorcode_id':  None, 'wagefactoronph_id':  None,
        # 'wagefactoronsat_id':  None, 'wagefactoronsun_id':  None

        update_dict['shift'] = shift_dict

    # logger.debug('update_dict: ' + str(update_dict))
    return update_dict


# ----------- end of create_shift_dict -----------


def create_team_rows(filter_dict, company):
    # create list of teams of this order PR2019-09-02 PR2020-05-24 PR2021-01-05
    # logger.debug(' ----- create_team_rows  -----  ')

    company_pk = company.pk
    sql_keys = {'compid': company_pk}

    sql_list = ["SELECT t.id, t.code, CONCAT('team_', t.id::TEXT) AS mapid, 'team' AS table,",
                "s.id AS s_id, s.code AS s_code, o.id AS o_id, c.isabsence AS c_isabsence, o.istemplate AS o_istemplate,",
                "t.modifiedat AS modat, COALESCE(SUBSTRING (au.username, 7), '') AS modby_usr",

                "FROM companies_team AS t",
                "INNER JOIN companies_scheme AS s ON (s.id = t.scheme_id)",
                "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                "LEFT JOIN accounts_user AS au ON (au.id = t.modifiedby_id)",
                "WHERE c.company_id = %(compid)s::INT"]

    team_pk = filter_dict.get('team_pk')
    order_pk = filter_dict.get('order_pk')
    customer_pk = filter_dict.get('customer_pk')
    if team_pk:
        sql_keys['t_id'] = team_pk
        sql_list.append('AND t.id = %(t_id)s::INT')
    elif order_pk:
        sql_keys['o_id'] = order_pk
        sql_list.append('AND o.id = %(o_id)s::INT')
    elif customer_pk:
        sql_keys['c_id'] = customer_pk
        sql_list.append('AND c.id = %(c_id)s::INT')
    if order_pk or customer_pk:
        sql_list.append('ORDER BY t.code')

    sql = ' '.join(sql_list)
    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    team_rows = f.dictfetchall(newcursor)

    return team_rows


def create_team_dict_from_sqlXXX(team, item_dict):
    # --- create dict of this team PR2019-08-08
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug(' --- create_team_dict ---')
    # logger.debug('item_dict: ' + str(item_dict))

    team_update = {}
    # FIELDS_TEAM = ('id', 'scheme', 'cat', 'code', 'isabsence', 'istemplate')
    if team:
        for field in c.FIELDS_TEAM:

            # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            # --- create field_dict 'id'
            if field == 'id':
                field_dict['pk'] = team.get('t_id')
                field_dict['ppk'] = team.get('s_id')
                field_dict['table'] = 'team'
                field_dict['isabsence'] = team.get('c_isabsence')
                field_dict['istemplate'] = team.get('o_istemplate')

            # scheme is parent of team
            elif field == 'scheme':
                field_dict['pk'] = team.get('s_id')
                field_dict['ppk'] = team.get('o_id')
                field_dict['code'] = team.get('s_code')

            elif field == 'code':
                team_code = team.get('t_code')
                team_abbrev = get_teamcode_abbrev(team_code)
                field_dict['value'] = team_code if team_code else '-'
                field_dict['abbrev'] = team_abbrev if team_abbrev else '-'

            # 5. add field_dict to item_dict
            if field_dict:
                item_dict[field] = field_dict

    # 6. remove empty attributes from item_dict
    f.remove_empty_attr_from_dict(item_dict)

    team_update = item_dict
    return team_update


# ----------- end of create_team_dict_from_sql -----------


def create_team_dict(team, item_dict):
    # --- create dict of this team PR2019-08-08
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug(' --- create_team_dict ---')
    # logger.debug('item_dict: ' + str(item_dict))

    team_update = {}
    # FIELDS_TEAM = ('id', 'scheme', 'cat', 'code', 'isabsence',  'istemplate')
    if team:
        for field in c.FIELDS_TEAM:

            # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            # --- create field_dict 'id'
            if field == 'id':
                field_dict['pk'] = team.pk
                field_dict['ppk'] = team.scheme.pk
                field_dict['table'] = 'team'
                if team.isabsence:
                    field_dict['isabsence'] = True
                if team.istemplate:
                    field_dict['istemplate'] = True
                if team.cat:
                    field_dict['cat'] = team.cat

            # scheme is parent of team
            elif field == 'scheme':
                scheme = team.scheme
                field_dict['pk'] = scheme.pk
                field_dict['ppk'] = scheme.order.pk
                if scheme.code:
                    field_dict['code'] = scheme.code

            elif field == 'code':
                code, suffix, title = get_team_code(team)
                if code:
                    field_dict['value'] = code
                    field_dict['abbrev'] = get_teamcode_abbrev(code)
                if suffix:
                    field_dict['suffix'] = suffix
                if title:
                    field_dict['title'] = title

            # 5. add field_dict to item_dict
            if field_dict:
                item_dict[field] = field_dict

    # 6. remove empty attributes from item_dict
    f.remove_empty_attr_from_dict(item_dict)

    team_update = item_dict
    return team_update


# ----------- end of create_team_dict -----------

# =========  get_teamcode_abbrev  === PR2020-03-15 PR2020-05-23
def get_teamcode_abbrev(team_code):
    # logger.debug('get_teamcode_abbrev: ' + str(team_code))
    #  ---  if team_code exists: get first 3 characters from last word as abbrev
    abbrev = ''
    if team_code:
        arr = team_code.split()
        length = len(arr)
        if len:
            abbrev = arr[length - 1][0:3]
    return abbrev


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def period_get_and_save(key, request_item, comp_timezone, timeformat, interval, user_lang, request):
    # PR2019-11-16 PR2020-07-15 PR2020-09-02 PR2021-03-30
    logging_on = False  # s.LOGGING_ON
    if logging_on:
        logger.debug(' ============== period_get_and_save ================ ')
        logger.debug(' key: ' + str(key))
        logger.debug(' request_item: ' + str(request_item))

    # rosterdatefirst / rosterdatelast are used in filter: create_employee_planning / create_customer_planning / review_list
    # periodstart (= periodstart_local_withtimezone) / 'periodend'  is used in: emplhour_list

    # - period_dict comes from request_item
    period_dict = request_item if request_item else {}

    # - check if values must be retrieved from Usersetting
    # {'get': True} not in use any more: get values from saved_period_dict when they are not in period_dict

    # - get saved period_dict
    saved_period_dict = request.user.get_usersetting(key)
    if logging_on:
        logger.debug(' saved_period_dict: ' + str(saved_period_dict))

    # - get customer_pk, order_pk or employee_pk
    # if key exists in dict: use that value (can be null), get saved otherwise

    save_setting = False
    # first get order_pk, if exists: make customer_pk = parent_pk of order
    # also get code, don't get from webpage order_map, because period might be retrieved before order_map

    order_pk = None
    customer_pk = None
    order_code = None
    customer_code = None

    # +++  check if order_pk exists in period_dict
    if 'order_pk' in period_dict:
        new_order_pk = period_dict.get('order_pk')
        if new_order_pk:
            order = m.Order.objects.get_or_none(id=new_order_pk, customer__company=request.user.company)
            if order:
                # order may have been deleted, therefore make save_setting only True when order exists
                save_setting = True
                order_pk = order.pk
                order_code = order.code
                customer_pk = order.customer.pk
                customer_code = order.customer.code
        else:
            # when order_pk = 0 or None in period_dict: means show all orders, therefore make save_setting = True
            save_setting = True
    # - if order_pk doesn't exist in period_dict: check if customer_pk exists in period_dict
    if not order_pk:
        if 'customer_pk' in period_dict:
            new_customer_pk = period_dict.get('customer_pk')
            if new_customer_pk:
                customer = m.Customer.objects.get_or_none(id=new_customer_pk, company=request.user.company)
                if customer:
                    save_setting = True
                    customer_pk = customer.pk
                    customer_code = customer.code
                    # order_pk already has default value 0
            else:
                # when new_customer_pk = 0 in period_dict: means show all new_customers, therefore make save_setting = True
                save_setting = True

    # - if order_pk and customer_pk not in period_dict: check if they exist in saved period
    if not save_setting:
        saved_order_pk = saved_period_dict.get('order_pk')
        order = None
        if saved_order_pk:
            order = m.Order.objects.get_or_none(id=saved_order_pk, customer__company=request.user.company)
            if order:
                order_pk = order.pk
                order_code = order.code
                customer_pk = order.customer.pk
                customer_code = order.customer.code
        # - if order_pk doesn't exist in period_dict: check if order_pk exists in saved period
        if order is None:
            saved_customer_pk = saved_period_dict.get('customer_pk')
            if saved_customer_pk:
                customer = m.Customer.objects.get_or_none(id=saved_customer_pk, company=request.user.company)
                if customer:
                    customer_pk = customer.pk
                    customer_code = customer.code

    # +++  check if employee_pk exists in period_dict
    employee_pk = None
    employee_code = None
    if 'employee_pk' in period_dict:
        new_employee_pk = period_dict.get('employee_pk')
        if new_employee_pk:
            employee = m.Employee.objects.get_or_none(id=new_employee_pk, company=request.user.company)
            if employee:
                # employee may have been deleted, therefore make save_setting only True when employee exists
                save_setting = True
                employee_pk = employee.pk
                employee_code = employee.code
        else:
            # when employee_pk = 0 in period_dict: means show all employees, therefore make save_setting = True
            save_setting = True
    # - if employee_pk doesn't exist in period_dict, check if employee_pk exists in saved period
    else:
        saved_employee_pk = saved_period_dict.get('employee_pk')
        if saved_employee_pk:
            employee = m.Employee.objects.get_or_none(id=saved_employee_pk, company=request.user.company)
            if employee:
                employee_pk = employee.pk
                employee_code = employee.code

    # +++  get emplhour_pk - emplhour_pk is not saved in settings PR2020-06-28
    # emplhour_pk is to be used in review page
    emplhour_pk = period_dict.get('emplhour_pk')

    # +++  get paydatecode_pk
    paydatecode_pk, paydatecode_code, paydateitem_year, paydateitem_period = None, None, None, None
    paydateitem_datefirst, paydateitem_datelast = None, None
    if 'paydatecode_pk' in period_dict:
        new_paydatecode_pk = period_dict.get('paydatecode_pk')
        if new_paydatecode_pk:
            paydatecode = m.Paydatecode.objects.get_or_none(id=new_paydatecode_pk, company=request.user.company)
            if paydatecode:
                # paydatecode may have been deleted, therefore make save_setting only True when paydatecode exists
                paydatecode_pk = paydatecode.pk

                paydatecode_code = period_dict.get('paydatecode_code')
                paydateitem_year = period_dict.get('paydateitem_year')
                paydateitem_period = period_dict.get('paydateitem_period')
                paydateitem_datefirst = period_dict.get('paydateitem_datefirst')
                paydateitem_datelast = period_dict.get('paydateitem_datelast')
                save_setting = True
        else:
            # when paydatecode_pk = 0 in period_dict: means show all paydatecodes, therefore make save_setting = True
            save_setting = True
    # - if paydatecode_pk doesn't exist in period_dict, check if paydatecode_pk exists in saved period
    else:
        saved_paydatecode_pk = saved_period_dict.get('paydatecode_pk')
        if saved_paydatecode_pk:
            paydatecode = m.Paydatecode.objects.get_or_none(id=saved_paydatecode_pk, company=request.user.company)
            if paydatecode:
                paydatecode_pk = paydatecode.pk
                paydatecode_code = saved_period_dict.get('paydatecode_code')
                paydateitem_year = saved_period_dict.get('paydateitem_year')
                paydateitem_period = saved_period_dict.get('paydateitem_period')
                paydateitem_datefirst = saved_period_dict.get('paydateitem_datefirst')
                paydateitem_datelast = saved_period_dict.get('paydateitem_datelast')

    # +++  get is_absence - None: all records, True: absence only, False: absence excluded, None: all records
    is_absence = None
    if 'isabsence' in period_dict:
        is_absence = period_dict.get('isabsence')
        save_setting = True
    else:
        is_absence = saved_period_dict.get('isabsence')

    # +++  get is_restshift - None  # None: all records, True: restshift only, False: restshift excluded, None: all records
    is_restshift = None
    if 'isrestshift' in period_dict:
        is_restshift = period_dict.get('isrestshift')
        save_setting = True
    else:
        is_restshift = saved_period_dict.get('isrestshift')

    # +++  get is_allownace - used in payrool page to show allowance instead of hours
    if 'isallowance' in period_dict:
        is_allowance = period_dict.get('isallowance', False)
        save_setting = True
    else:
        is_allowance = saved_period_dict.get('isallowance', False)
    # logger.debug(' is_allowance: ' + str(is_allowance))

    # +++  get daynightshift
    # value 0: AllShifts, 1: 'NightshiftsOnly', 2: 'DayshiftsOnly', 3: 'EveningshiftsOnly
    if 'daynightshift' in period_dict:
        daynightshift = period_dict.get('daynightshift')

        # logger.debug(' daynightshift: ' + str(daynightshift))
        save_setting = True
    else:
        daynightshift = saved_period_dict.get('daynightshift')
        # logger.debug(' saved_period_dict daynightshift: ' + str(daynightshift))

    # +++  get sel_btn
    if 'sel_btn' in period_dict:
        sel_btn = period_dict.get('sel_btn')
        save_setting = True
    else:
        sel_btn = saved_period_dict.get('sel_btn')

    # +++  get sel_view
    if 'sel_view' in period_dict:
        sel_view = period_dict.get('sel_view')
        save_setting = True
    else:
        sel_view = saved_period_dict.get('sel_view')
    if sel_view is None:
        sel_view = 'calendar_period'

    # +++  get col_hidden - col_hidden ia a tuple of the fieldnames that must be hidden
    if 'col_hidden' in period_dict:
        col_hidden = period_dict.get('col_hidden')
        save_setting = True
    else:
        col_hidden = saved_period_dict.get('col_hidden')

    # +++  get period tag
    period_tag = period_dict.get('period_tag')
    save_period_setting = False
    if period_tag:
        save_period_setting = True
    else:
        # if not found: get period tag from saved setting
        period_tag = saved_period_dict.get('period_tag')
        # if not found: get default period tag
        if not period_tag:
            period_tag = 'tweek' if key == 'calendar_period' else 'tmonth'

    # +++  get extend_offset
    extend_offset = period_dict.get('extend_offset', 0)

    # - calculate periodstart_datetimelocal, periodend_datetimelocal
    period_datefirst_dte, period_datelast_dte, periodstart_datetimelocal, periodend_datetimelocal = \
        calc_periodstart_datetimelocal_periodend_datetimelocal(
            period_dict,
            saved_period_dict,
            save_period_setting,
            period_tag,
            extend_offset,
            comp_timezone)

    # - calculate working days in period  PR2020-07-09
    # 3. loop through dates
    period_workingdays, period_workingdays_incl_ph = \
        f.calc_workingdays_in_period(period_datefirst_dte, period_datelast_dte, request)

    # 4. save update_dict
    if save_setting or save_period_setting:
        setting_tobe_saved = {
            'customer_pk': customer_pk,
            'order_pk': order_pk,
            'employee_pk': employee_pk,
            'isabsence': is_absence,
            'isrestshift': is_restshift,
            'isallowance': is_allowance,
            'daynightshift': daynightshift,
            'sel_btn': sel_btn,
            'col_hidden': col_hidden,
            'sel_view': sel_view,
            'period_tag': period_tag
        }
        # logger.debug(' setting_tobe_saved: ' + str(setting_tobe_saved))

        if period_tag == 'other':
            if period_datefirst_dte:
                setting_tobe_saved['period_datefirst'] = period_datefirst_dte.isoformat()
            if period_datelast_dte:
                setting_tobe_saved['period_datelast'] = period_datelast_dte.isoformat()
        if extend_offset:
            setting_tobe_saved['extend_offset'] = extend_offset

        if paydatecode_pk:
            setting_tobe_saved['paydatecode_pk'] = paydatecode_pk
            setting_tobe_saved['paydatecode_code'] = paydatecode_code
            setting_tobe_saved['paydateitem_datefirst'] = paydateitem_datefirst
            setting_tobe_saved['paydateitem_datelast'] = paydateitem_datelast
            setting_tobe_saved['paydateitem_year'] = paydateitem_year
            setting_tobe_saved['paydateitem_period'] = paydateitem_period

        request.user.set_usersetting(key, setting_tobe_saved)

    # 5. create update_dict
    update_dict = {'key': key,
                   'sel_btn': sel_btn,
                   'sel_view': sel_view,
                   'col_hidden': col_hidden,
                   'comp_timezone': comp_timezone,
                   'timeformat': timeformat,
                   'interval': interval,
                   'user_lang': user_lang,
                   'period_tag': period_tag,
                   'period_workingdays': period_workingdays,
                   'period_workingdays_incl_ph': period_workingdays_incl_ph,
                   'requsr_pk': request.user.pk
                   }

    # <PERMIT>
    # put all permits in update_dict
    if request.user.is_perm_employee:
        update_dict['requsr_perm_employee'] = request.user.is_perm_employee
    if request.user.is_perm_planner:
        update_dict['requsr_perm_planner'] = request.user.is_perm_planner
    if request.user.is_perm_supervisor:
        update_dict['requsr_perm_supervisor'] = request.user.is_perm_supervisor
    if request.user.is_perm_hrman:
        update_dict['requsr_perm_hrman'] = request.user.is_perm_hrman
    if request.user.is_perm_accman:
        update_dict['requsr_perm_accman'] = request.user.is_perm_accman
    if request.user.is_perm_sysadmin:
        update_dict['requsr_perm_sysadmin'] = request.user.is_perm_sysadmin
    if request.user.permitcustomers:
        update_dict['requsr_perm_customers'] = request.user.permitcustomers
    if request.user.permitorders:
        update_dict['requsr_perm_orders'] = request.user.permitorders

    if customer_pk:
        update_dict['customer_pk'] = customer_pk
        update_dict['customer_code'] = customer_code
    if order_pk:
        update_dict['order_pk'] = order_pk
        update_dict['order_code'] = order_code
    if employee_pk:
        update_dict['employee_pk'] = employee_pk
        update_dict['employee_code'] = employee_code
    if emplhour_pk:
        update_dict['emplhour_pk'] = emplhour_pk

    if paydatecode_pk:
        update_dict['paydatecode_pk'] = paydatecode_pk
        update_dict['paydatecode_code'] = paydatecode_code
        update_dict['paydateitem_year'] = paydateitem_year
        update_dict['paydateitem_period'] = paydateitem_period
        update_dict['paydateitem_datefirst'] = paydateitem_datefirst
        update_dict['paydateitem_datelast'] = paydateitem_datelast

    if extend_offset:
        update_dict['extend_offset'] = extend_offset
    if is_absence is not None:
        update_dict['isabsence'] = is_absence
    if is_restshift is not None:
        update_dict['isrestshift'] = is_restshift
    if daynightshift is not None:
        update_dict['daynightshift'] = daynightshift
    if is_allowance is not None:
        update_dict['isallowance'] = is_allowance

    if period_datefirst_dte:
        # period_datefirst_minus1 is used in create_emplhour_list
        period_datefirst_minus1 = period_datefirst_dte - timedelta(days=1)
        update_dict['period_datefirst'] = period_datefirst_dte.isoformat()
        update_dict['period_datefirst_minus1'] = period_datefirst_minus1.isoformat()
    if period_datelast_dte:
        # rosterdatelast_plus1 is used in create_emplhour_list
        period_datelast_plus1 = period_datelast_dte + timedelta(days=1)
        update_dict['period_datelast'] = period_datelast_dte.isoformat()
        update_dict['period_datelast_plus1'] = period_datelast_plus1.isoformat()

    # Note: periodstart_datetimelocal is the local time, stored as a timezone naive datetime
    #       periodstart_datetimelocal: 2020-01-30 18:30:00 <class 'datetime.datetime'>
    if periodstart_datetimelocal:
        update_dict['periodstart_datetimelocal'] = periodstart_datetimelocal
    if periodend_datetimelocal:
        update_dict['periodend_datetimelocal'] = periodend_datetimelocal

    # 5. add calendar header info ( 2020-02-23: {ispublicholiday: true, display: "Karnaval"}
    if period_datefirst_dte and period_datelast_dte:
        holiday_dict = f.get_holiday_dict(period_datefirst_dte, period_datelast_dte, user_lang, request)
        if holiday_dict:
            update_dict.update(holiday_dict)
    if periodstart_datetimelocal and periodend_datetimelocal:
        update_dict['period_display'] = f.format_period_from_datetimelocal(periodstart_datetimelocal,
                                                                           periodend_datetimelocal, timeformat,
                                                                           user_lang)

    if sel_view == 'payroll_period':
        paydateitem_datefirst_dte = f.get_dateobj_from_dateISOstring(paydateitem_datefirst)
        paydateitem_datelast_dte = f.get_dateobj_from_dateISOstring(paydateitem_datelast)
        update_dict['dates_display_long'] = f.format_period_from_date(paydateitem_datefirst_dte,
                                                                      paydateitem_datelast_dte, False,
                                                                      user_lang)
        update_dict['dates_display_short'] = f.format_period_from_date(paydateitem_datefirst_dte,
                                                                       paydateitem_datelast_dte, True,
                                                                       user_lang)
    else:
        update_dict['dates_display_long'] = f.format_period_from_date(period_datefirst_dte, period_datelast_dte, False,
                                                                      user_lang)
        update_dict['dates_display_short'] = f.format_period_from_date(period_datefirst_dte, period_datelast_dte, True,
                                                                       user_lang)

    if logging_on:
        logger.debug('update_dict: ' + str(update_dict))
    return update_dict


# ---  end of period_get_and_save


def calc_periodstart_datetimelocal_periodend_datetimelocal(period_dict, saved_period_dict, save_period_setting,
                                                           period_tag, extend_offset, comp_timezone):
    # get now_usercomp_dtm from now_arr
    # now is the time of the computer of the current user. May be different from company local
    today_dte, now_usercomp_dtm = f.get_today_usertimezone(period_dict)
    logging_on = False
    if logging_on:
        logger.debug('===== calc_periodstart_datetimelocal_periodend_datetimelocal ===== ')
        logger.debug('period_tag: ' + str(period_tag))
        logger.debug('extend_offset: ' + str(extend_offset))
        logger.debug('period_dict: ' + str(period_dict))
        logger.debug('save_period_setting: ' + str(save_period_setting))
        logger.debug('saved_period_dict: ' + str(saved_period_dict))

    # - get periodstart_datetimelocal/periodend_datetimelocal
    period_datefirst_dte = None
    period_datelast_dte = None
    if period_tag == 'now':  # 60: 'Now'
        # a. get now from period_dict
        now_arr = period_dict.get('now')
        # b. if 'now' is not in period_dict: create 'now' (should not be possible)
        if now_arr is None:
            now = datetime.now()
            now_arr = [now.year, now.month, now.day, now.hour, now.minute]
        # c. get now_usercomp_dtm from now_arr
        # now is the time of the computer of the current user. May be different from company local
        # now: 2019-11-17 07:41:00 <class 'datetime.datetime'>
        periodstart_datetimelocal = now_usercomp_dtm - timedelta(minutes=extend_offset)
        periodend_datetimelocal = now_usercomp_dtm + timedelta(minutes=extend_offset)
    else:
        # default offest start is 0 - offset, (midnight - offset)
        # default offest start is 1440 + offset (24 h after midnight + offset)
        # value for morning, evening, night and day are different
        offset_firstdate = 0 - extend_offset
        offset_lastdate = 1440 + extend_offset
        if period_tag == 'tnight':  # 1: 'This night', offset_firstdate is default:  0 - offset
            period_datefirst_dte = today_dte
            period_datelast_dte = period_datefirst_dte
            offset_lastdate = 360 + extend_offset
        elif period_tag == 'tmorning':  # 2: 'This morning'
            period_datefirst_dte = today_dte
            period_datelast_dte = period_datefirst_dte
            offset_firstdate = 360 - extend_offset
            offset_lastdate = 720 + extend_offset
        elif period_tag == 'tafternoon':  # 3: 'This afternoon'
            period_datefirst_dte = today_dte
            period_datelast_dte = period_datefirst_dte
            offset_firstdate = 720 - extend_offset
            offset_lastdate = 1080 + extend_offset
        elif period_tag == 'tevening':  # 4: 'This evening', , offset_lastdate is default: 1440 + offset
            period_datefirst_dte = today_dte
            period_datelast_dte = period_datefirst_dte
            offset_firstdate = 1080 - extend_offset
        elif period_tag == 'today':
            period_datefirst_dte = today_dte
            period_datelast_dte = period_datefirst_dte
        elif period_tag == 'tomorrow':  # 6: 'Tomorrow'
            period_datefirst_dte = f.add_days_to_date(today_dte, 1)
            period_datelast_dte = period_datefirst_dte
        elif period_tag == 'yesterday':  # 7: 'Yesterday'
            period_datefirst_dte = f.add_days_to_date(today_dte, -1)
            period_datelast_dte = period_datefirst_dte
        elif period_tag == 'tweek':  # 8: 'This week'
            period_datefirst_dte = f.get_firstof_week(today_dte, 0)
            period_datelast_dte = f.get_lastof_week(today_dte, 0)
        elif period_tag == 'lweek':  # 8: 'Last week'
            period_datefirst_dte = f.get_firstof_week(today_dte, -1)
            period_datelast_dte = f.get_lastof_week(today_dte, -1)
        elif period_tag == 'nweek':  # 8: 'Next week'
            period_datefirst_dte = f.get_firstof_week(today_dte, 1)
            period_datelast_dte = f.get_lastof_week(today_dte, 1)
        elif period_tag == 'tmonth':  # 9: 'This month'
            period_datefirst_dte = f.get_firstof_thismonth(today_dte)
            period_datelast_dte = f.get_lastof_month(today_dte)
        elif period_tag == 'lmonth':  # 9: 'This month'
            firstof_thismonth_dte = f.get_firstof_thismonth(today_dte)
            firstof_lastmonth_dte = f.add_month_to_firstof_month(firstof_thismonth_dte, -1)
            lastof_lastmonth_dte = f.get_lastof_month(firstof_lastmonth_dte)
            period_datefirst_dte = firstof_lastmonth_dte
            period_datelast_dte = lastof_lastmonth_dte
        elif period_tag == 'nmonth':  # 9: 'Next month'
            firstof_thismonth_dte = f.get_firstof_thismonth(today_dte)
            firstof_nextmonth_dte = f.add_month_to_firstof_month(firstof_thismonth_dte, 1)
            lastof_nextmonth_dte = f.get_lastof_month(firstof_nextmonth_dte)
            period_datefirst_dte = firstof_nextmonth_dte
            period_datelast_dte = lastof_nextmonth_dte
        elif period_tag == 'tyear':  # 'This year'
            currentYear = datetime.now().year
            period_datefirst_dte = date(currentYear, 1, 1)
            period_datelast_dte = date(currentYear, 12, 31)
        elif period_tag == 'lyear':  # 9: 'last year'
            lastYear = datetime.now().year - 1
            period_datefirst_dte = date(lastYear, 1, 1)
            period_datelast_dte = date(lastYear, 12, 31)
        elif period_tag == 'other':  # 10: 'Custom period'
            # in customer planning  'rosterdatefirst' and 'rosterdatelast' is used (date object)
            # in emplhour 'periodstart' and 'periodend' is used (with time, localized)

            # if 'other' in period_dict: get dates from period_dict, (in this case  save_period_setting = True)
            # if 'other' retrieved from saved_period: get dates from saved_period_dict

            period_datefirst_iso, period_datelast_iso = None, None
            if period_dict:
                if save_period_setting:  # save_period_setting is true when period_tag exists in request_item
                    period_datefirst_iso = period_dict.get('period_datefirst')
                    period_datelast_iso = period_dict.get('period_datelast')
            if period_datefirst_iso is None:  # PR2021-02-18 was bug, didnt retrieve saved value
                period_datefirst_iso = saved_period_dict.get('period_datefirst')
            if period_datelast_iso is None:
                period_datelast_iso = saved_period_dict.get('period_datelast')

            # if one date blank: use other date, if both blank: use today. Dont use saved dates when blank
            if period_datefirst_iso is None:
                if period_datelast_iso is None:
                    period_datefirst_iso = today_dte.isoformat()
                    period_datelast_iso = period_datefirst_iso
                else:
                    period_datefirst_iso = period_datelast_iso
            else:
                if period_datelast_iso is None:
                    period_datelast_iso = period_datefirst_iso
            period_datefirst_dte = f.get_dateobj_from_dateISOstring(period_datefirst_iso)
            period_datelast_dte = f.get_dateobj_from_dateISOstring(period_datelast_iso)

            if logging_on:
                logger.debug(' save_period_setting: ' + str(save_period_setting))
                logger.debug(
                    '---> period_datelast_iso: ' + str(period_datelast_iso) + ' ' + str(type(period_datelast_iso)))
                logger.debug(
                    '---> period_datelast_dte: ' + str(period_datelast_dte) + ' ' + str(type(period_datelast_dte)))
        else:
            # in case period_tag not in the list: set to 'tweek'
            period_tag = 'tweek'
            period_datefirst_dte = f.get_firstof_week(today_dte, 0)
            period_datelast_dte = f.get_lastof_week(today_dte, 0)

        periodstart_datetimelocal = f.get_datetimelocal_from_offset(period_datefirst_dte, offset_firstdate,
                                                                    comp_timezone)
        periodend_datetimelocal = f.get_datetimelocal_from_offset(period_datelast_dte, offset_lastdate, comp_timezone)

    if logging_on:
        logger.debug('---> period_datefirst_dte: ' + str(period_datefirst_dte) + ' ' + str(type(period_datefirst_dte)))
        logger.debug('---> period_datelast_dte: ' + str(period_datelast_dte) + ' ' + str(type(period_datelast_dte)))
        logger.debug(
            '---> periodend_datetimelocal: ' + str(periodend_datetimelocal) + ' ' + str(type(periodend_datetimelocal)))

    return period_datefirst_dte, period_datelast_dte, periodstart_datetimelocal, periodend_datetimelocal


# ========================================================================
def create_deletedrows_from_emplhourlog(period_dict, request, last_emplhour_check):
    # get deleted rows from emplhourlog  # PR2020-08-23

    period_datefirst, period_datelast = None, None
    if period_dict:
        period_datefirst = period_dict.get('period_datefirst')
        period_datelast = period_dict.get('period_datelast')

    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    deleted_emplhour_rows = None
    if request.user.company is not None and last_emplhour_check:
        company_pk = request.user.company.pk

        sql_emplhourlog = """SELECT ehlog.emplhour_id AS id, 
            CONCAT('emplhour_', ehlog.emplhour_id::TEXT) AS mapid,
            TRUE AS isdeleted
            
            FROM companies_emplhourlog AS ehlog 
            INNER JOIN companies_order AS o ON (ehlog.order_id = o.id) 
            INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 

            WHERE (c.company_id = %(comp_id)s)
            AND (isdeleted)
            AND (ehlog.rosterdate >= %(rdf)s) AND  (ehlog.rosterdate <= %(rdl)s)
            AND (ehlog.modifiedat > %(last_mod)s)
        """
        sql_keys = {'comp_id': company_pk,
                    'rdf': period_datefirst,
                    'rdl': period_datelast,
                    'last_mod': last_emplhour_check}

        newcursor = connection.cursor()
        newcursor.execute(sql_emplhourlog, sql_keys)
        deleted_emplhour_rows = f.dictfetchall(newcursor)

    return deleted_emplhour_rows


def create_emplhour_rows(period_dict, request, last_emplhour_check=None,
                         show_deleted=False):  # PR2019-11-16 PR2020-08-20
    logger.debug(' ============= create_emplhour_rows ============= ')
    # logger.debug('period_dict: ' + str(period_dict))
    # called by EmplhourUploadView and FillRosterdateView.create_emplhour_list and DatalistDownloadView.create_emplhour_list

    starttime = timer()

    periodstart_local_withtimezone = period_dict.get('periodstart_datetimelocal')
    periodend_local_withtimezone = period_dict.get('periodend_datetimelocal')

    # how to convert local datetime without timezone to utc datetime without timezone
    # step 1: add comp_timezone to datetiem, using localize Can be skipped, periodstart already has comp_timezone
    # this one is correct: localize converts a local naive datetime to a local datetime with company timezone
    # localize can only be used with naive datetime objects. It does not change the datetime, only adds tzinfo
    # timezone = pytz.timezone(comp_timezone)
    # periodstart_local_withtimezone = timezone.localize(periodstart_datetimelocal_withouttimezone)
    # periodend_local_withtimezone = timezone.localize(periodend_datetimelocal_withouttimezone)
    # logger.debug('periodstart_local_withtimezone: ' + str(periodstart_local_withtimezone) + ' ' + str(type(periodstart_local_withtimezone)))
    # periodstart_local_withtimezone: 2020-01-30 19:29:00+01:00 <class 'datetime.datetime'>

    # step 2: convert timezone from comp_timezone to utc
    timezone = pytz.utc
    periodstart_datetime_utc_withtimezone = periodstart_local_withtimezone.astimezone(
        timezone) if periodstart_local_withtimezone else None
    periodend_datetime_utc_withtimezone = periodend_local_withtimezone.astimezone(
        timezone) if periodend_local_withtimezone else None
    # logger.debug('periodstart_datetime_utc_withtimezone: ' + str(periodstart_datetime_utc_withtimezone) + ' ' + str(type(periodstart_datetime_utc_withtimezone)))
    # periodstart_datetime_utc_withtimezone: 2020-01-30 18:29:00+00:00 <class 'datetime.datetime'>

    # step 3: strip timezone from datetime (maybe this is not necessary) Can also be skipped: sqp accepts dattime with utc timezone
    # periodstart_datetime_utc_naive = periodstart_datetime_utc_withtimezone.replace(tzinfo=None)
    # periodend_datetime_utc_naive = periodend_datetime_utc_withtimezone.replace(tzinfo=None)
    # logger.debug('periodstart_datetime_utc_naive: ' + str(periodend_datetime_utc_naive) + ' ' + str(type(periodend_datetime_utc_naive)))
    # periodstart_datetime_utc_naive: 2020-01-30 18:29:00 <class 'datetime.datetime'>
    rosterdatefirst, rosterdatelast, rosterdatefirst_minus1, rosterdatelast_plus1 = None, None, None, None
    if period_dict:
        rosterdatefirst = period_dict.get('period_datefirst')
        rosterdatelast = period_dict.get('period_datelast')
        rosterdatefirst_minus1 = period_dict.get('period_datefirst_minus1')
        rosterdatelast_plus1 = period_dict.get('period_datelast_plus1')

    # Exclude template.

    # $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    if request.user.company is not None:
        company_pk = request.user.company.pk

        customer_pk = None
        order_pk = period_dict.get('order_pk')
        if not order_pk:
            order_pk = None
        # only get customer_pk when order_pk = None
        if order_pk is None:
            customer_pk = period_dict.get('customer_pk')
            if not customer_pk:
                customer_pk = None

        employee_pk = period_dict.get('employee_pk')
        if not employee_pk:
            employee_pk = None

        eplh_update_list = period_dict.get('eplh_update_list')
        # logger.debug('eplh_update_list: ' + str(eplh_update_list) + ' ' + str(type(eplh_update_list)))

        is_absence = period_dict.get('isabsence')
        is_restshift = period_dict.get('isrestshift')
        date_part = period_dict.get('datepart')
        daynightshift = period_dict.get('daynightshift')
        #  show_deleted becomes True when last_emplhour_check is not None
        # or is true when called by create_emplhour_rows and isdeleted

        # show emplhour records with :
        # LEFT JOIN employee (also records without employee are shown)
        # - this company
        # - this customer if not blank
        # - this order if not blank
        # - this employee if not blank
        # - this rosterdate
        # - within time range
        # - exclude corrections; corremplhourid is null added PR2021-05-28
        #   NOTE: don't forget to add also: emplhourtimestart/end IS NULL OR periodtimestart/end IS NULL

        # Note: filter also on min max rosterdate, in case timestart / end is null

        # Note: when emplhourtimestart is blank filter on rosterdatefirst instead of eriod_datefirst_minus1
        # AND (eh.rosterdate >= %(rdfm1)s)  AND (eh.rosterdate <= %(rdlp1)s)
        # instead:
        # AND CASE WHEN eh.timestart IS NULL THEN (eh.rosterdate >= %(rdf)s) ELSE (eh.rosterdate >= %(rdfm1)s) END
        # AND CASE WHEN eh.timeend IS NULL THEN (eh.rosterdate <= %(rdl)s) ELSE (eh.rosterdate <= %(rdlp1)s) END

        sql_keys = {'comp_id': company_pk}
        sql_list = [
            "SELECT eh.id, oh.id AS oh_id, o.id AS o_id, c.id AS c_id, c.company_id AS comp_id,  CONCAT('emplhour_', eh.id::TEXT) AS mapid,",
            "eh.rosterdate, eh.exceldate, oh.customercode, oh.ordercode,CONCAT(oh.customercode, ' - ', oh.ordercode) AS c_o_code,",
            "oh.shiftcode, oh.sortby,",
            "eh.employee_id, eh.employeecode, eh.offsetstart, eh.offsetend, eh.excelstart, eh.excelend, eh.nohours,",
            "eh.breakduration, eh.timeduration, eh.plannedduration, eh.billingduration,",
            "eh.functioncode_id AS fnc_id, fnc.code AS fnc_code, eh.wagefactorcode_id AS wfc_id, wfc.code AS wfc_code, eh.wagefactor,",
            "eh.haschanged, eh.status,",
            # PR2021-02-03 calulate status on client side
            # PR2021-02-10 keep stat_start_conf and stat_end_conf, to update fields in table
            "(MOD(eh.status, 2) = 1) AS stat_planned,",  # (TRUNC( MOD(eh.status, 4) / 2) = 1) AS stat_start_pending,",
            "(TRUNC( MOD(eh.status, 8) / 4) = 1) AS stat_start_conf,",
            # "(TRUNC( MOD(eh.status, 16) / 8) = 1) AS stat_end_pending,",
            "(TRUNC( MOD(eh.status, 32) / 16) = 1) AS stat_end_conf, (TRUNC( MOD(eh.status, 64) / 32) = 1) AS stat_locked,",

            "CASE WHEN eh.payrollpublished_id IS NULL THEN FALSE ELSE TRUE END AS stat_pay_publ,",
            "CASE WHEN eh.invoicepublished_id IS NULL THEN FALSE ELSE TRUE END AS stat_inv_publ,",

            "c.isabsence AS c_isabsence, oh.isrestshift AS oh_isrestshift, oh.issplitshift AS oh_issplitshift, eh.isreplacement AS eh_isrpl,",
            "eh.overlap AS eh_ov, eh.modifiedat AS eh_modat, COALESCE(SUBSTRING (u.username, 7), '') AS u_usr, eh.hasnote",
            "FROM companies_emplhour AS eh",
            "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
            "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
            "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
            "LEFT JOIN accounts_user AS u ON (u.id = eh.modifiedby_id)",
            "LEFT JOIN companies_wagecode AS fnc ON (fnc.id = eh.functioncode_id)",
            "LEFT JOIN companies_wagecode AS wfc ON (wfc.id = eh.wagefactorcode_id)",
            "WHERE (c.company_id = %(comp_id)s)",
            "AND (eh.corremplhourid IS NULL)"]

        if eplh_update_list:
            # no filter on rosterdate when filter on emplhour_pk
            sql_text = 'AND ('
            or_text = ''
            for emplhour_pk in eplh_update_list:
                sql_text += or_text + 'eh.id = ' + str(emplhour_pk) + '::INT'
                or_text = ' OR '
            sql_text += ')'
            sql_list.append(sql_text)
        else:
            sql_list.append(
                "AND CASE WHEN eh.offsetstart IS NULL THEN (eh.rosterdate >= %(rdf)s) ELSE (eh.rosterdate >= %(rdfm1)s) END")
            sql_list.append(
                "AND CASE WHEN eh.offsetend IS NULL THEN (eh.rosterdate <= %(rdl)s) ELSE (eh.rosterdate <= %(rdlp1)s) END")
            sql_keys['rdf'] = rosterdatefirst
            sql_keys['rdfm1'] = rosterdatefirst_minus1
            sql_keys['rdl'] = rosterdatelast
            sql_keys['rdlp1'] = rosterdatelast_plus1

            # ////////////////////////////////////////
            # <PERMIT> PR2020-11-07
            # - when request.user.permitcustomers or request.user.permitorders have value: show only allowed customers / orders
            #  - TODO also show absence records of employees of allowed allowed customers / orders
            allowed_employees_list = f.get_allowed_employees_and_replacements(request)

            permitcustomers_list = []
            if request.user.permitcustomers:
                for c_id in request.user.permitcustomers:
                    permitcustomers_list.append(c_id)

            permitorders_list = []
            if request.user.permitorders:
                for o_id in request.user.permitorders:
                    permitorders_list.append(o_id)

            sql_items = ''
            if permitcustomers_list:
                sql_items += 'OR c.id IN ( SELECT UNNEST( %(cid_arr)s::INT[])) '
                sql_keys['cid_arr'] = permitcustomers_list
            if permitorders_list:
                sql_items += 'OR o.id IN ( SELECT UNNEST( %(oid_arr)s::INT[])) '
                sql_keys['oid_arr'] = permitorders_list
            if permitcustomers_list or permitorders_list:
                if allowed_employees_list:
                    sql_items += 'OR eh.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[])) '
                    sql_keys['eid_arr'] = allowed_employees_list
            if sql_items:
                sql_list.append('AND ( ' + sql_items[3:] + ')')
            # logger.debug('sql_list: ' + str(sql_list))
            # end of <PERMIT> PR2020-11-07
            # ////////////////////////////////////////

            if order_pk:
                sql_list.append('AND o.id = %(ord_id)s')
                sql_keys['ord_id'] = order_pk
            elif customer_pk:
                sql_list.append('AND c.id = %(cust_id)s')
                sql_keys['cust_id'] = customer_pk

            if employee_pk:
                sql_list.append('AND eh.employee_id = %(empl_id)s')
                sql_keys['empl_id'] = employee_pk

            if is_absence is not None:
                sql_list.append('AND c.isabsence = %(isabs)s')
                sql_keys['isabs'] = is_absence

            if is_restshift is not None:
                sql_list.append('AND oh.isrestshift = %(isrest)s')
                sql_keys['isrest'] = is_restshift

            if date_part is not None:
                sql_list.append('AND eh.datepart = %(dp)s')
                sql_keys['dp'] = date_part

            if daynightshift is not None:
                # value 0: AllShifts, 1: 'NightshiftsOnly', 2: 'DayshiftsOnly', 3: 'EveningshiftsOnly
                if daynightshift == 1:
                    sql_list.append('AND eh.offsetstart >= -720 AND eh.offsetstart < 360')
                elif daynightshift == 2:
                    sql_list.append('AND eh.offsetstart >= 360 AND eh.offsetstart < 960')
                elif daynightshift == 3:
                    sql_list.append('AND eh.offsetstart >= 960 AND eh.offsetstart <=2160')

            if periodstart_datetime_utc_withtimezone is not None:
                sql_list.append('AND (eh.timeend > %(pts)s OR eh.timeend IS NULL)')
                sql_keys['pts'] = periodstart_datetime_utc_withtimezone

            if periodend_datetime_utc_withtimezone is not None:
                sql_list.append('AND (eh.timestart < %(pte)s OR eh.timestart IS NULL)')
                sql_keys['pte'] = periodend_datetime_utc_withtimezone

            # when last_emplhour_check: get only records that are updated after last_mod date
            if last_emplhour_check is not None:
                sql_list.append('AND (eh.modifiedat > %(last_mod)s)')
                sql_keys['last_mod'] = last_emplhour_check
                # show_deleted = True

        # if not show_deleted:
        #    sql_list.append('AND (NOT eh.isdeleted)')

        # sql_list.append('ORDER BY eh.rosterdate, c.isabsence, LOWER(o.code), o.id, oh.isrestshift, eh.timestart')
        sql_list.append('ORDER BY eh.rosterdate, c.isabsence, LOWER(o.code), o.id, oh.sortby, eh.excelstart')
        sql_emplhour = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql_emplhour, sql_keys)

        emplhour_rows = f.dictfetchall(newcursor)

        logger.debug('elapsed_seconds: ' + str(int(1000 * (timer() - starttime)) / 1000))

        # for qr in connection.queries:
        # logger.debug('-----------------------------------------------------------------------------')
        # logger.debug(str(qr))
        return emplhour_rows


# ---  end of create_emplhour_rows

# ========================================================================
def create_emplhour_list(period_dict, is_emplhour_check, request):
    # PR2019-11-16 PR2020-08-06
    # logger.debug(' ============= create_emplhour_list ============= ')
    # logger.debug('period_dict: ' + str(period_dict))
    # logger.debug('is_emplhour_check: ' + str(is_emplhour_check))

    # logger.debug('request.user: ' + str(request.user.username_sliced))

    last_emplhour_check = None
    no_updates, no_deletes = False, False
    # retrun value is temp for testing
    # last_emplhour_updated, new_last_emplhour_check = None, None
    last_emplhour_check_format, last_emplhour_updated_format, last_emplhour_deleted_format, new_last_emplhour_check_format = None, None, None, None

    if is_emplhour_check:
        # - get datetime when this user last checked for updates. This is stored in Usersetting key: last_emplhour_check
        key = 'last_emplhour_check'
        last_emplhour_check = Usersetting.get_datetimesetting(key, request.user)
        if last_emplhour_check:
            last_emplhour_check_format = last_emplhour_check.isoformat().replace('T', ' ')[0:19]
        # logger.debug('last_emplhour_check: ' + last_emplhour_check_format)

        # - set new datetime in last_emplhour_check in Usersetting
        # get now without timezone
        now_utc_naive = datetime.utcnow()
        # convert now to timezone utc
        new_last_emplhour_check = now_utc_naive.replace(tzinfo=pytz.utc)
        Usersetting.set_datetimesetting(key, new_last_emplhour_check, request.user)
        if new_last_emplhour_check:
            new_last_emplhour_check_format = new_last_emplhour_check.isoformat().replace('T', ' ')[0:19]
        # logger.debug('new_emplhour_check:  ' + new_last_emplhour_check_format)

        # - get datetime when last emplhour records are updated from Companysetting
        # - is stored in CompanySetting, to mak it faster then checking the emplhour table itself
        key = 'last_emplhour_updated'
        last_emplhour_updated, last_emplhour_deleted = m.Companysetting.get_datetimesetting(key, request.user.company)
        if last_emplhour_updated:
            last_emplhour_updated_format = last_emplhour_updated.isoformat().replace('T', ' ')[0:19]
        # logger.debug('last_emplhr_updated: ' + last_emplhour_updated_format)
        if last_emplhour_deleted:
            last_emplhour_deleted_format = last_emplhour_deleted.isoformat().replace('T', ' ')[0:19]
        # logger.debug('last_emplhr_deleted: ' + last_emplhour_deleted_format)

        # if there are no updated records since last update: skip create_emplhour_rows,
        # also when last_emplhour_updated has no value yet
        if last_emplhour_updated is None:
            no_updates = True
        elif last_emplhour_check and last_emplhour_updated < last_emplhour_check:
            no_updates = True
        # - get deleted records from emplhourlog
        if last_emplhour_deleted is None:
            no_deletes = True
        elif last_emplhour_check and last_emplhour_deleted < last_emplhour_check:
            no_deletes = True

    # logger.debug('no_updates: ' + str(no_updates))
    # logger.debug('no_deletes: ' + str(no_deletes))
    # - get emplhour records, including deleted records
    # no_updates is only true when emplhour_checked and no updates found
    emplhour_rows = []
    if not no_updates:
        emplhour_rows = create_emplhour_rows(period_dict, request, last_emplhour_check)
    if not no_deletes:
        emplhours_deleted_rows = create_deletedrows_from_emplhourlog(period_dict, request, last_emplhour_check)
        # logger.debug('emplhours_deleted_rows: ' + str(emplhours_deleted_rows))
        if emplhours_deleted_rows:
            emplhour_rows.extend(emplhours_deleted_rows)
    no_changes = no_updates and no_deletes

    # return emplhour_rows, no_changes, last_emplhour_check, last_emplhour_updated, new_last_emplhour_check
    return emplhour_rows, no_changes, last_emplhour_check_format, last_emplhour_updated_format, last_emplhour_deleted_format, new_last_emplhour_check_format


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_emplhourallowance_rows(request, period_dict=None, last_emplhour_check=None,
                                  emplhour_pk=None):  # PR2021-02-10
    # logger.debug(' ============= create_emplhourallowance_rows ============= ')
    # logger.debug('period_dict: ' + str(period_dict))

    company_pk = request.user.company.pk

    rosterdatefirst, rosterdatelast = None, None
    if period_dict:
        rosterdatefirst = period_dict.get('period_datefirst')
        rosterdatelast = period_dict.get('period_datelast')

    emplhourallowance_rows = {}
    sql_list = []
    sql_keys = {'comp_id': company_pk}
    if company_pk:
        sql_sub = """SELECT ehal.id, ehal.emplhour_id, ehal.quantity, ehal.amount, ehal.modifiedat,
            alw.id AS alw_id, alw.code, alw.description, alw.wagerate,
            COALESCE(SUBSTRING (u.username, 7), '') AS modifiedby

            FROM companies_emplhourallowance AS ehal
            INNER JOIN companies_wagecode AS alw ON (alw.id = ehal.allowancecode_id)  
            LEFT JOIN accounts_user AS u ON (u.id = ehal.modifiedby_id)

            ORDER BY ehal.modifiedat
        """
        sql_list.append("""SELECT eh.id,             
            ARRAY_AGG(ehal_sub.id ORDER BY ehal_sub.id) AS ehal_id_agg,
            ARRAY_AGG(ehal_sub.alw_id ORDER BY ehal_sub.id) AS alw_id_agg,
            ARRAY_AGG(ehal_sub.code ORDER BY ehal_sub.id) AS code_agg,
            ARRAY_AGG(ehal_sub.description ORDER BY ehal_sub.id) AS description_agg,
            ARRAY_AGG(ehal_sub.wagerate ORDER BY ehal_sub.id) AS wagerate_agg,
            ARRAY_AGG(ehal_sub.quantity ORDER BY ehal_sub.id) AS quantity_agg,
            ARRAY_AGG(ehal_sub.amount ORDER BY ehal_sub.id) AS amount_agg,
            ARRAY_AGG(ehal_sub.modifiedby ORDER BY ehal_sub.id) AS modifiedby_agg,
            ARRAY_AGG(ehal_sub.modifiedat ORDER BY ehal_sub.id) AS modifiedat_agg

            FROM companies_emplhour AS eh
            INNER JOIN (""" + sql_sub + """) AS ehal_sub ON (ehal_sub.emplhour_id = eh.id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id) 
            INNER JOIN companies_order AS o ON (o.id = oh.order_id) 
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

            WHERE c.company_id = %(comp_id)s::INT
        """)
        if emplhour_pk:
            # when emplhour_pk has value: skip other filters
            sql_keys['eh_id'] = emplhour_pk
            sql_list.append('AND eh.id = %(eh_id)s::INT')
        elif rosterdatefirst and rosterdatelast:
            sql_keys['rdf'] = rosterdatefirst
            sql_keys['rdl'] = rosterdatelast
            sql_list.append('AND eh.rosterdate >= %(rdf)s::DATE AND eh.rosterdate <= %(rdl)s::DATE')

            # when last_emplhour_check: get only records that are updated after last_mod date
            if last_emplhour_check is not None:
                sql_keys['last_mod'] = last_emplhour_check
                sql_list.append('AND (eh.modifiedat > %(last_mod)s)')

        sql_list.append('GROUP BY eh.id')
        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        emplhourallowance_rows = f.dictfetchrows(newcursor)

    return emplhourallowance_rows


# - end of create_emplhourallowance_rows

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_emplhourstatus_rows(period_dict, last_emplhour_check, request):  # PR2021-02-12
    # logger.debug(' ============= create_emplhourstatus_rows ============= ')

    company_pk = request.user.company.pk

    rosterdatefirst, rosterdatelast, emplhour_pk_list = None, None, None
    if period_dict:
        rosterdatefirst = period_dict.get('period_datefirst')
        rosterdatelast = period_dict.get('period_datelast')
        emplhour_pk_list = period_dict.get('eplh_update_list')

    emplhourstatus_rows = {}

    if company_pk:
        sql_keys = {'comp_id': company_pk}
        sql_sub_list = ["SELECT ehst.id, ehst.emplhour_id, ehst.status, ehst.isremoved, ehst.modifiedat,",
                        "COALESCE(SUBSTRING (u.username, 7), '') AS modifiedby",
                        "FROM companies_emplhourstatus AS ehst",
                        "LEFT JOIN accounts_user AS u ON (u.id = ehst.modifiedby_id)",
                        "ORDER BY ehst.modifiedat"]
        sql_sub = ' '.join(sql_sub_list)
        sql_list = ["SELECT eh.id, eh.status, eh.modifiedat,",
                    "COALESCE(SUBSTRING (au.username, 7), '') AS modifiedby,",
                    "ARRAY_AGG(ehst_sub.id ORDER BY ehst_sub.id) AS ehst_id_agg,",
                    "ARRAY_AGG(ehst_sub.status ORDER BY ehst_sub.id) AS ehst_status_agg,",
                    "ARRAY_AGG(ehst_sub.isremoved ORDER BY ehst_sub.id) AS ehst_isremoved_agg,",
                    "ARRAY_AGG(ehst_sub.modifiedby ORDER BY ehst_sub.id) AS ehst_modifiedby_agg,",
                    "ARRAY_AGG(ehst_sub.modifiedat ORDER BY ehst_sub.id) AS ehst_modifiedat_agg",

                    "FROM companies_emplhour AS eh",
                    "INNER JOIN (" + sql_sub + ") AS ehst_sub ON (ehst_sub.emplhour_id = eh.id)",
                    "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id) ",
                    "INNER JOIN companies_order AS o ON (o.id = oh.order_id) ",
                    "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                    "LEFT JOIN accounts_user AS au ON (au.id = eh.modifiedby_id)",

                    "WHERE c.company_id = %(comp_id)s::INT"]

        if emplhour_pk_list:
            # when emplhour_pk_list has value: skip other filters
            sql_keys['eh_id_arr'] = emplhour_pk_list
            sql_list.append('AND eh.id IN ( SELECT UNNEST( %(eh_id_arr)s::INT[] ) )')

        elif rosterdatefirst and rosterdatelast:
            sql_keys['rdf'] = rosterdatefirst
            sql_keys['rdl'] = rosterdatelast
            sql_list.append('AND eh.rosterdate >= %(rdf)s::DATE AND eh.rosterdate <= %(rdl)s::DATE')

        # when last_emplhour_check: get only records that are updated after last_mod date
        if last_emplhour_check is not None:
            sql_keys['last_mod'] = last_emplhour_check
            sql_list.append('AND (eh.modifiedat > %(last_mod)s)')

        sql_list.append('GROUP BY eh.id, eh.status, eh.modifiedat, au.username')
        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        emplhourstatus_rows = f.dictfetchrows(newcursor)

    return emplhourstatus_rows


# - end of create_emplhourstatus_rows

def create_emplhournote_rows(period_dict, last_emplhour_check, request):  # PR2020-10-14
    # logger.debug(' ============= create_emplhournote_rows ============= ')
    # logger.debug('period_dict: ' + str(period_dict))

    company_pk = request.user.company.pk

    rosterdatefirst, rosterdatelast, emplhour_pk_list = None, None, None
    if period_dict:
        rosterdatefirst = period_dict.get('period_datefirst')
        rosterdatelast = period_dict.get('period_datelast')
        emplhour_pk_list = period_dict.get('eplh_update_list')

    # logger.debug('emplhour_pk_list: ' + str(emplhour_pk_list))

    emplhournote_rows = {}
    sql_list = []
    sql_keys = {'comp_id': company_pk}
    if company_pk:
        sql_sub = """SELECT ehn.id, ehn.emplhour_id, ehn.note, ehn.isusernote, ehn.modifiedat,
            COALESCE(SUBSTRING (u.username, 7), '') AS modifiedby

            FROM companies_emplhournote AS ehn 
            LEFT JOIN accounts_user AS u ON (u.id = ehn.modifiedby_id)

            ORDER BY ehn.modifiedat
        """
        sql_list.append("""SELECT eh.id,             
            ARRAY_AGG(ehn_sub.id ORDER BY ehn_sub.id) AS id_agg,
            ARRAY_AGG(ehn_sub.note ORDER BY ehn_sub.id) AS note_agg,
            ARRAY_AGG(ehn_sub.modifiedby ORDER BY ehn_sub.id) AS modifiedby_agg,
            ARRAY_AGG(ehn_sub.modifiedat ORDER BY ehn_sub.id) AS modifiedat_agg,
            COUNT(CASE WHEN ehn_sub.isusernote THEN 1 END) AS usernote_count

            FROM companies_emplhour AS eh
            INNER JOIN (""" + sql_sub + """) AS ehn_sub ON (ehn_sub.emplhour_id = eh.id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id) 
            INNER JOIN companies_order AS o ON (o.id = oh.order_id) 
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

            WHERE c.company_id = %(comp_id)s::INT
        """)
        if emplhour_pk_list:
            # when emplhour_pk_list has value: skip other filters
            sql_list.append('AND eh.id IN ( SELECT UNNEST( %(eh_id_arr)s::INT[] ) )')
            sql_keys['eh_id_arr'] = emplhour_pk_list

        elif rosterdatefirst and rosterdatelast:
            sql_keys['rdf'] = rosterdatefirst
            sql_keys['rdl'] = rosterdatelast
            sql_list.append('AND eh.rosterdate >= %(rdf)s::DATE AND eh.rosterdate <= %(rdl)s::DATE')

        # when last_emplhour_check: get only records that are updated after last_mod date
        if last_emplhour_check is not None:
            sql_list.append('AND (eh.modifiedat > %(last_mod)s)')
            sql_keys['last_mod'] = last_emplhour_check

        sql_list.append('GROUP BY eh.id')
        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        emplhournote_rows = f.dictfetchrows(newcursor)

    # logger.debug('emplhournote_rows: ' + str(emplhournote_rows))
    return emplhournote_rows


# - end of create_emplhournote_rows

def create_teammemberabsence_list(dict, company):
    # logger.debug('create_emplabs_list: ' + str(dict))
    # datalist_dict: {'replacement': {'action': 'switch', 'rosterdate': None, 'reployee_pk': 214}} <class 'dict'>
    # {'action': 'switch', 'rosterdate': None, 'reployee_pk': 214, 'reployee_ppk': 2}
    # create list of absence teammmber reocrds of this employee  PR2019-08-29

    teammemberabsence_list = []
    if dict and company:
        employee_pk = getattr(dict, 'employee_pk', 0)
        datemin_dte = getattr(dict, 'datemin', None)
        datemax_dte = getattr(dict, 'datemax', None)

        # 1. get employee
        employee = None
        if employee_pk:
            employee = m.Employee.objects.get_or_none(pk=employee_pk, company=company)
        if employee:

            # 2. get abscat teammmembers of this employee within period
            # TOD remove TEAMMEMBER_CAT_0512_ABSENCE
            crit = Q(employee=employee) & \
                   Q(cat=c.TEAMMEMBER_CAT_0512_ABSENCE)
            if datemin_dte:
                crit.add(Q(datelast__gte=datemin_dte) | Q(datelast__isnull=True), crit.connector)
            if datemax_dte:
                crit.add(Q(datefirst__lte=datemax_dte) | Q(datefirst__isnull=True), crit.connector)

            teammembers = m.Teammember.objects.filter(crit).order_by('datefirst')
            for teammember in teammembers:
                dict = {}
                # 3. create dict
                dict['pk'] = teammember.pk
                dict['ppk'] = teammember.team.pk
                dict['scheme_pk'] = teammember.team.scheme.pk
                dict['order_pk'] = teammember.team.scheme.order.pk
                dict['abscat'] = teammember.team.scheme.order.code
                if teammember.datefirst:
                    dict['datefirst'] = teammember.datefirst
                if teammember.datelast:
                    dict['datelast'] = teammember.datelast

                # 4. add to list
                teammemberabsence_list.append(dict)

    return teammemberabsence_list


# PR2021-05-15 NIU
def create_replacementshift_list(dict, company):
    # logger.debug('create_replacementshift_list: ' + str(dict))
    # datalist_dict: {'replacement': {'action': 'switch', 'rosterdate': None, 'reployee_pk': 214}} <class 'dict'>
    # {'action': 'switch', 'rosterdate': None, 'reployee_pk': 214, 'reployee_ppk': 2}
    # create list of avauilable shifts of this replacement employee PR2019-08-16

    replacementshift_list = []
    rosterdate_list = []

    # 1. set time range
    if company and 'rosterdate' in dict and 'reployee_pk' in dict:
        eplh_list = []
        si_list = []

        # 2. get start date of replacement period
        rosterdate = dict['rosterdate']
        rosterdate_min = f.get_datetimenaive_from_ISOstring(rosterdate)
        # logger.debug('rosterdate_min: ' + str(rosterdate_min) + str(type(rosterdate_min)))

        # 3. get replacement period from Companysetting
        # this period is rosterdate_min till rosterdate_min + REPLACEMENT_PERIOD_DEFAULT (days)
        replacement_period = company.get_companysetting(
            key_str=c.KEY_COMP_REPLACEMENT_PERIOD,
            default_setting=c.REPLACEMENT_PERIOD_DEFAULT
        )

        # 4. get pk of current employee and replacement employee
        employee_pk = dict['employee_pk']
        reployee_pk = dict['reployee_pk']
        # logger.debug('reployee_pk: ' + str(reployee_pk))

        # 5. loop through dates of replacement period
        count = 0
        while count < replacement_period:
            add_rosterdate_to_list = False
            rosterdate_cur_dtm = rosterdate_min + timedelta(days=count)
            rosterdate_cur_iso = rosterdate_cur_dtm.isoformat()
            rosterdate_cur_str = rosterdate_cur_iso.split('T')[0]
            count = count + 1

            # 6. get emplhour records of replacement employee of this date
            # filter company, rosterdate
            # exclude cat: skip emplhours from restshift, absence and template orders (replacement not in use in table order)
            # exclude emplhours that have STATUS_02_START_CONFIRMED or higher
            # TODO remove SHIFT_CAT_0032_REPLACEMENT
            crit = Q(orderhour__order__customer__company=company) & \
                   Q(rosterdate=rosterdate_cur_str) & \
                   Q(orderhour__order__cat__lt=c.SHIFT_CAT_0032_REPLACEMENT) & \
                   Q(status__lt=c.STATUS_02_START_CONFIRMED) & \
                   Q(orderhour__order__locked=False) & \
                   Q(employee_id=reployee_pk)
            emplhours = m.Emplhour.objects.filter(crit)
            # logger.debug('........ emplhours   ' + str(rosterdate_cur_str) + '......... ')

            for emplhour in emplhours:
                eplh_dict = {}

                # create_schemeitem_dict(table_dict, company)
                eplh_dict['rosterdate'] = rosterdate_cur_str
                eplh_dict['eplh_pk'] = emplhour.pk
                eplh_dict['eplh_ppk'] = emplhour.orderhour_id
                eplh_dict['employee_pk'] = employee_pk
                eplh_dict['reployee_pk'] = reployee_pk

                # don't add si_pk to dict, to havedifference between eplh and si record

                if emplhour.orderhour:
                    if emplhour.orderhour.schemeitem:
                        eplh_dict['si_pk'] = emplhour.orderhour.schemeitem_id

                    if emplhour.orderhour.order:
                        cust_order_shift = get_customer_order_code(emplhour.orderhour.order)
                        if emplhour.orderhour.shift:
                            cust_order_shift += ' - ' + emplhour.orderhour.shift
                        if cust_order_shift:
                            eplh_dict['cust_order_shift'] = cust_order_shift

                if emplhour.employee.code:
                    eplh_dict['employee'] = emplhour.employee.code

                    # store schemeitem in list, to check if shift from next section already has emplhour
                eplh_list.append(eplh_dict)
                add_rosterdate_to_list = True

            # 7. lookup teams of replacement employee with this rosterdate
            # exclude absence, rest and template orders
            # exclude employee not in service
            # TODO remove SHIFT_CAT_0512_ABSENCE
            crit = Q(team__scheme__order__customer__company=company) & \
                   Q(team__scheme__order__cat__lt=c.SHIFT_CAT_0512_ABSENCE) & \
                   Q(employee_id=reployee_pk) & \
                   (Q(employee__datefirst__lte=rosterdate_cur_str) | Q(employee__datefirst__isnull=True)) & \
                   (Q(employee__datelast__gte=rosterdate_cur_str) | Q(employee__datelast__isnull=True)) & \
                   (Q(datefirst__lte=rosterdate_cur_str) | Q(datefirst__isnull=True)) & \
                   (Q(datelast__gte=rosterdate_cur_str) | Q(datelast__isnull=True))
            teammembers = m.Teammember.objects.filter(crit)
            # logger.debug('........ teammembers ' + str(rosterdate_cur_str) + '......... ')

            for teammember in teammembers:
                # logger.debug('teammember.pk: ' + str(teammember.pk))
                # if teammember.employee:
                # logger.debug('teammember.employee: ' + str(teammember.employee.code))

                item_dict = {}  # check if teammemember is the first teammember
                first_teammember = m.Teammember.get_first_teammember_on_rosterdate(teammember.team, rosterdate_cur_str)
                if first_teammember:
                    if teammember.employee_id == first_teammember.employee_id:
                        # logger.debug('teammember.employee_id == first_teammember.employee_id ')
                        # now we have the team, of which the replacement employee is the first teammember on this date
                        # next step is to find the schemeitems on this date with this team

                        schemeitems = m.Schemeitem.objects.filter(team_id=teammember.team_id)
                        for schemeitem in schemeitems:

                            # skip inactive schemeitems
                            # logger.debug('. schemeitem: ' + str(schemeitem.pk) + ' rosterdate: ' + str(schemeitem.rosterdate))
                            # get rosterdate of this schemeitem that is within this cycle:
                            si_rosterdate_within_cycle = schemeitem.get_rosterdate_within_cycle(rosterdate_cur_dtm)
                            # logger.debug('... si_rosterdate_within_cycle: ' + str(si_rosterdate_within_cycle) + ' rosterdate_cur_dtm: ' + str(rosterdate_cur_dtm))
                            datediff = si_rosterdate_within_cycle - rosterdate_cur_dtm  # datediff is class 'datetime.timedelta'
                            datediff_days = datediff.days  # <class 'int'>
                            # logger.debug('... datediff_days: ' + str(datediff_days))

                            # if si_rosterdate_within_cycle is same as rosterdate_cur_dtm: c
                            if datediff_days == 0:
                                # create_schemeitem_dict(table_dict, company)

                                si_dict = {'rosterdate': rosterdate_cur_str,
                                           'si_pk': schemeitem.pk,
                                           'tmmbr_pk': teammember.pk,
                                           'team_pk': teammember.team_id,
                                           'team_ppk': teammember.team.scheme.pk,
                                           'employee_pk': employee_pk,
                                           'reployee_pk': reployee_pk}

                                if teammember.employee.code:
                                    si_dict['tmmbr_employee'] = teammember.employee.code

                                if schemeitem.scheme.order:
                                    cust_order_shift = get_customer_order_code(schemeitem.scheme.order)
                                    if schemeitem.shift.code:
                                        cust_order_shift += ' - ' + schemeitem.shift.code
                                    if cust_order_shift:
                                        si_dict['cust_order_shift'] = cust_order_shift

                                si_list.append(si_dict)
                                add_rosterdate_to_list = True
            if add_rosterdate_to_list:
                rosterdate_list.append(rosterdate_cur_str)

                # info needed for switch input:
                # rosterdate
                # eplh_pk if exists > replacement employee will be replaced bij current employee
                # to do check if eplh locked, lock remove
                # if not: team_pk, teammember_pk of current employee
                # check datestartdatend of temmmeber current employee.
                # if teammember current_employee datestart == rosterdate and dateend == rosterdate:
                # replace teammember current_employee by replacement_employee
                # if teammember current_employee datestart != rosterdate and dateend == rosterdate:
                # change teammember current_employee dateend to rosterdate -1
                # add teammember replacement_employee with datestart = rosterdate and dateend = rosterdate
                # else:
                # leave teammember current_employee unchanged
                # add teammember replacement_employee with datestart = rosterdate and dateend = rosterdate

        for eplh_dict in eplh_list:
            replacementshift_list.append(eplh_dict)

            # remove si_dict from si_list if it also exists in eplh_dict
            if 'si_pk' in eplh_dict and 'rosterdate' in eplh_dict:
                eplh_si_pk = eplh_dict['si_pk']
                eplh_rosterdate = eplh_dict['rosterdate']
                if eplh_si_pk and eplh_rosterdate:
                    for idx, si_dict in enumerate(si_list):
                        if 'si_pk' in si_dict and 'rosterdate' in si_dict:
                            si_pk = si_dict['si_pk']
                            si_rosterdate = si_dict['rosterdate']
                            if si_rosterdate == eplh_rosterdate and si_pk == eplh_si_pk:
                                del si_list[idx]
        # add remaining si_dicts to replacementshift_list
        for si_dict in si_list:
            si_pk = si_dict['si_pk']
            si_rosterdate = si_dict['rosterdate']
            # logger.debug(' ADD: si_pk: ' + str(si_pk) + ' si_rosterdate: ' + str(si_rosterdate))
            replacementshift_list.append(si_dict)

    return_dict = {'replacement': True}  # just to make dict not empty
    if rosterdate_list:
        return_dict['replacement_dates'] = rosterdate_list
    if replacementshift_list:
        return_dict['replacement_list'] = replacementshift_list
    return return_dict


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_review_customer_list(period_dict, comp_timezone, request):  # PR2019-08-20
    # create list of shifts of this order PR2019-08-08

    review_list = []
    if request.user.company:
        # logger.debug(' ============= create_review_customer_list ============= ')
        # logger.debug('period_dict:  ' + str(period_dict))

        period_datefirst, period_datelast = None, None
        if period_dict:
            period_datefirst = period_dict.get('period_datefirst')
            period_datelast = period_dict.get('period_datelast')

        if period_datefirst is None:
            period_datefirst = '1900-01-01'
        if period_datelast is None:
            period_datelast = '2500-01-01'

        employee_pk = period_dict.get('employee_pk')
        customer_pk = period_dict.get('customer_pk')
        order_pk = period_dict.get('order_pk')
        # employee_pk searches in ARRAY(employee_id): employee_pk = -1 only searches for empty, 0 = show all
        # employee_pk = None gives error
        # search for empty aray not working
        employee_pk = employee_pk if employee_pk else -1
        # change employee_pk = 0 to None, otherwise no records will be retrieved
        customer_pk = customer_pk if customer_pk else None
        order_pk = order_pk if order_pk else None
        #  no filter on employee, because employee is in subquery.

        # don't show absence and rest shifts in customer view
        # is_absence = False
        # isrestshift = False

        company_id = request.user.company.id

        # logger.debug(emplhours.query)
        # from django.db import connection
        # logger.debug(connection.queries)

        cursor = connection.cursor()

        # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
        is_restshift = False  # None = show all, False = no restshifts, True = restshifts only
        sql_list = ["WITH eh_sub AS (SELECT eh.orderhour_id AS oh_id,",
                    "ARRAY_AGG(eh.id) AS eh_id,",
                    "ARRAY_AGG(eh.employee_id) AS e_id,",
                    "COALESCE(STRING_AGG(DISTINCT e.code, '; '),'---') AS e_code,",
                    "ARRAY_AGG(DISTINCT e.code) AS e_code_arr,",
                    "ARRAY_AGG(eh.timeduration) AS e_dur,",
                    "ARRAY_AGG(eh.wage) AS e_wage,",
                    "ARRAY_AGG(eh.wagerate) AS e_wr,",
                    "ARRAY_AGG(eh.wagefactor) AS e_wf,",
                    "SUM(eh.plannedduration) AS eh_plandur,",
                    "SUM(eh.timeduration) AS eh_timedur,",
                    "SUM(eh.billingduration) AS eh_billdur,",
                    "SUM(eh.amount) AS eh_amount_sum,",
                    "SUM(eh.addition) AS eh_add_sum,",
                    "SUM(eh.tax) AS eh_tax_sum,",
                    "SUM(eh.wage) AS eh_wage_sum",

                    "FROM companies_emplhour AS eh",
                    "LEFT OUTER JOIN companies_employee AS e ON (eh.employee_id=e.id)",
                    "GROUP BY oh_id)",
                    "SELECT COALESCE(c.code,'-') AS cust_code,  COALESCE(o.code,'-') AS ordr_code,",
                    "eh_sub.e_code AS e_code,",
                    "oh.rosterdate AS oh_rd,",
                    "to_json(oh.rosterdate) AS rosterdate,",
                    "oh.id AS oh_id, o.id AS ordr_id, c.id AS cust_id, c.company_id AS comp_id,",
                    "eh_sub.e_code_arr AS e_code_arr,",
                    "oh.isbillable AS oh_bill,",
                    "eh_sub.eh_id AS eh_id_arr,",
                    "eh_sub.e_id AS e_id_arr,",

                    "c.isabsence AS c_isabsence,",
                    "oh.isrestshift AS oh_isrestshift,",
                    "oh.shiftcode AS oh_shiftcode,",

                    "eh.pricerate AS eh_pricerate,",
                    "oh.additionrate AS oh_addrate,",
                    "oh.taxrate AS oh_taxrate,",

                    "CASE WHEN o.isabsence OR oh.isrestshift THEN 0 ELSE eh_sub.eh_plandur END AS eh_plandur,",
                    "CASE WHEN o.isabsence OR oh.isrestshift THEN 0 ELSE eh_sub.eh_timedur END AS eh_timedur,",
                    "CASE WHEN o.isabsence THEN eh_sub.eh_timedur ELSE 0 END AS eh_absdur,",
                    "CASE WHEN o.isabsence OR oh.isrestshift THEN 0 ELSE eh_sub.eh_billdur END AS eh_billdur,",

                    "eh_sub.eh_amount_sum,",
                    "eh_sub.eh_add_sum,",
                    "eh_sub.eh_tax_sum,",

                    "eh_sub.eh_wage_sum,",
                    "eh_sub.e_dur AS e_dur,",
                    "eh_sub.e_wage AS e_wage, eh_sub.e_wr AS e_wr, eh_sub.e_wf AS e_wf",

                    "FROM companies_orderhour AS oh",
                    "INNER JOIN eh_sub ON (eh_sub.oh_id=oh.id)",
                    "INNER JOIN companies_order AS o ON (oh.order_id=o.id)",
                    "INNER JOIN companies_customer AS c ON (o.customer_id=c.id)",

                    "WHERE (c.company_id = %(comp_id)s)",
                    "AND (oh.rosterdate IS NOT NULL) ",
                    "AND (oh.rosterdate >= %(df)s)",
                    " AND (oh.rosterdate <= %(dl)s)",
                    "AND (c.id = %(custid)s OR %(custid)s IS NULL)",
                    "AND (o.id = %(ordid)s OR %(ordid)s IS NULL)",
                    "AND (o.isabsence = FALSE)",
                    "AND (oh.isrestshift = FALSE)",
                    "AND ( (%(emplid)s = -1) OR ( ARRAY[ %(emplid)s ] <@ e_id ) )",

                    "ORDER BY LOWER(c.code), c.id, LOWER(o.code), o.id, oh.rosterdate, LOWER(eh_sub.e_code)"]
        sql = ' '.join(sql_list)
        sql_keys = {'comp_id': company_id,
                    'emplid': employee_pk,
                    'custid': customer_pk,
                    'ordid': order_pk,
                    'df': period_datefirst,
                    'dl': period_datelast
                    }

        with connection.cursor() as cursor:
            cursor.execute(sql, sql_keys)
            # dictfetchall returns a list with dicts for each emplhour row
            review_list = f.dictfetchall(cursor)

    """
                if permitorders_list:
                sql_list.append("AND o.id IN ( SELECT UNNEST( %(oid_arr)s::INT[]))")
                sql_keys['oid_arr'] = permitorders_list
    """

    # string aggregate:  COALESCE(STRING_AGG(DISTINCT e.code, '; '),'-') AS e_code,

    #  COALESCE(ARRAY_AGG(eh.employee_id), ARRAY[1,2]::INT[]) AS e_id,

    #  this one works: AND ( (%(emplid)s IS NULL) OR ( e_id IS NOT NULL AND ARRAY[ %(emplid)s ] <@ e_id ) )
    # PR2020-02-27 from https://til.hashrocket.com/posts/4f6a382260-postgres-containscontained-by-array-operators
    #   POSTGRESQL ‘contains’ array operator: @>  compares two arrays,
    #   returning true if the first array contains all of the elements of the second array.
    #   array[1,2,3] @> array[1,3]; = True
    #   array[1,2,3] @> array[5,9]; = False
    #   array[1,3] <@ array[1,2,3,4]; = True

    return review_list


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_review_employee_list(period_dict, comp_timezone, request):  # PR2019-08-20
    # create list of shifts of this order PR2019-08-08

    review_list = []
    if request.user.company:
        # logger.debug(' ============= create_review_list ============= ')
        # logger.debug('period_dict:  ' + str(period_dict))

        period_datefirst, period_datelast = None, None
        if period_dict:
            period_datefirst = period_dict.get('period_datefirst')
            period_datelast = period_dict.get('period_datelast')

        if period_datefirst is None:
            period_datefirst = '1900-01-01'
        if period_datelast is None:
            period_datelast = '2500-01-01'

        employee_pk = period_dict.get('employee_pk')
        customer_pk = period_dict.get('customer_pk')
        order_pk = period_dict.get('order_pk')

        # change employee_pk = 0 to None, otherwise no records will be retrieved
        employee_pk = employee_pk if employee_pk else None
        customer_pk = customer_pk if customer_pk else None
        order_pk = order_pk if order_pk else None

        #  no filter on employee, because employee is in subquery.

        is_absence = period_dict.get('isabsence')  # is_absence = None: both absence and not absence
        is_restshift = period_dict.get('isrestshift')  # is_restshift = None: both restshift and not restshift

        company_id = request.user.company.id

        # logger.debug(emplhours.query)
        # from django.db import connection
        # logger.debug(connection.queries)

        # logger.debug('period_datefirst: ' + str(period_datefirst) + ' ' + str(type(period_datefirst)))
        # logger.debug('period_datelast: ' + str(period_datelast) + ' ' + str(type(period_datelast)))
        # logger.debug('customer_pk: ' + str(customer_pk) + ' ' + str(type(customer_pk)))
        # logger.debug('order_pk: ' + str(order_pk) + ' ' + str(type(order_pk)))
        # logger.debug('is_absence: ' + str(is_absence) + ' ' + str(type(is_absence)))
        # logger.debug('is_restshift: ' + str(is_restshift) + ' ' + str(type(is_restshift)))

        cursor = connection.cursor()
        # fields in review_list:
        #  0: oh.id, 1: o.id, 2: c.id, 3: rosterdate_json,
        #  8: cust_code, 9: order_code, 10: order_cat, 11: shift
        #  12: oh_duration, 13: oh.billable, 14: eh.pricerate, 15: oh.amount, 16: oh.tax,
        #  17: eh_id_arr, 18: eh_dur_sum, 19: eh_wage_sum,
        #  20: e_id_arr, 21: e_code_arr, 22: eh_duration_arr,
        #  23: eh_wage_arr, 24: eh_wagerate_arr, 25: eh_wagefactor_arr.  26: diff
        #  case when oh.duration>0 then oh.duration-eh_sub.e_dur else 0 end as diff

        orderby_e_code_arr = 1
        orderby_oh_rosterdate = 2
        orderby_cust_code = 3  # index of ordered column
        orderby_ord_code = 4
        # don't show rest shifts)
        # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
        cursor.execute("""SELECT COALESCE(e.code,'---') AS e_code,  
                            COALESCE(c.code,'---') AS cust_code, 
                            COALESCE(o.code,'---') AS ordr_code,
                           eh.rosterdate AS eh_rd, 
                           to_json(eh.rosterdate) AS rosterdate, 
                           eh.id AS eh_id, e.id AS e_id, o.id AS ordr_id, c.id AS cust_id, c.company_id AS comp_id,
                               
                           c.isabsence AS c_isabsence,
                           oh.isrestshift AS oh_isrestshift, 
                           oh.isbillable AS oh_bill, 
                           oh.shiftcode AS oh_shiftcode,
       
                           CASE WHEN o.isabsence OR oh.isrestshift THEN 0 ELSE eh.plannedduration END AS eh_plandur,
                           CASE WHEN o.isabsence OR oh.isrestshift THEN 0 ELSE eh.timeduration END AS eh_timedur,
                           CASE WHEN o.isabsence THEN eh.timeduration ELSE 0 END AS eh_absdur,
                           CASE WHEN o.isabsence OR oh.isrestshift THEN 0 ELSE eh.billingduration END AS eh_billdur,

                           eh.pricerate AS eh_pr_rate,
                           oh.additionrate AS eh_add_rate,
                           oh.taxrate AS eh_tax_rate,
                           eh.amount AS eh_amount,
                           eh.addition AS eh_addition,
                           eh.tax AS eh_tax,
                           
                           eh.wage AS eh_wage, 
                           eh.wagerate AS eh_wr, 
                           eh.wagefactor AS eh_wf

                           FROM companies_emplhour AS eh
                           LEFT JOIN companies_employee AS e ON (eh.employee_id=e.id)
                           INNER JOIN companies_orderhour AS oh ON (eh.orderhour_id=oh.id)
                           INNER JOIN companies_order AS o ON (oh.order_id=o.id)
                           INNER JOIN companies_customer AS c ON (o.customer_id=c.id)
                           WHERE (c.company_id = %(comp_id)s) 
                           AND (oh.rosterdate IS NOT NULL) 
                           AND (oh.rosterdate >= %(df)s)
                           AND (oh.rosterdate <= %(dl)s)
                           AND (eh.employee_id = %(emplid)s OR %(emplid)s IS NULL)
                           AND (c.id = %(custid)s OR %(custid)s IS NULL)
                           AND (o.id = %(ordid)s OR %(ordid)s IS NULL)
                           AND (o.isabsence = %(isabs)s OR %(isabs)s IS NULL)
                           AND (oh.isrestshift = %(isrest)s OR %(isrest)s IS NULL)
                           ORDER BY LOWER(e.code), e.id, eh.rosterdate, LOWER(c.code), c.id, LOWER(o.code), o.id
                           """,
                       {'comp_id': company_id,
                        'emplid': employee_pk,
                        'custid': customer_pk,
                        'ordid': order_pk,
                        'isabs': is_absence,
                        'isrest': is_restshift,
                        'df': period_datefirst,
                        'dl': period_datelast
                        })
        #                                        ORDER BY c_code ASC, o_code ASC, oh.rosterdate ASC""",
        #                                          WHERE (c.company_id = %s)
        #                                        AND (oh.rosterdate IS NOT NULL)
        #                                        AND (oh.rosterdate >= %s)
        #                                        AND (oh.rosterdate <= %s)

        # PR2020-02-14 removed: oh.yearindex AS yi, oh.monthindex AS mi, oh.weekindex AS wi, oh.payperiodindex AS pi,
        # PR2020-02-14 removed: case when o.isabsence = FALSE then oh.duration - eh_sub.eh_dur else 0 end as dur_diff

        # string aggregate:  COALESCE(STRING_AGG(DISTINCT e.code, '; '),'-') AS e_code,

        # WITH td2_sub AS (
        #                   SELECT t1_id, MAX(date) as max_date, count(*) as total
        #                   FROM t2
        #                   GROUP BY t1_id
        # )

        review_list = f.dictfetchall(cursor)
        # dictfetchall returns a list with dicts for each emplhour row

    return review_list


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def reset_overlapping_shifts(datefirst, datelast, request):  # PR2019-09-18

    if not datefirst:
        datefirst = '1900-01-01'
    if not datelast:
        datelast = '2500-01-01'

    # 2. reset overlap in the timerange
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    cursor = connection.cursor()
    cursor.execute("""WITH oh_sub AS (SELECT oh.id AS oh_id  
                        FROM companies_orderhour AS oh 
                        INNER JOIN companies_order AS o ON (oh.order_id = o.id) 
                        INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                        WHERE c.company_id = %(comp_id)s)     
        UPDATE companies_emplhour AS eh
        SET overlap = 0
        FROM oh_sub 
        WHERE (eh.orderhour_id = oh_sub.oh_id)
        AND (eh.overlap IS NOT NULL) 
        AND (eh.rosterdate >= %(df)s)
        AND (eh.rosterdate <= %(dl)s)""", {'comp_id': request.user.company_id, 'df': datefirst, 'dl': datelast})


def check_overlapping_shifts(datefirst, datelast, request):  # PR2019-09-18
    # logger.debug(' === check_overlapping_shifts === ' + ' datefirst: ' + str(datefirst) + ' datelast: ' + str(datelast))

    # cursor.fetchall(): [(427, ), (238, ), (363, )]
    # from https://docs.djangoproject.com/en/2.2/topics/db/sql/
    # warning: Do not use string formatting on raw queries or quote placeholders in your SQL strings!
    # not like this: query = 'SELECT * FROM myapp_person WHERE last_name = %s' % lname
    # neither:       query = "SELECT * FROM myapp_person WHERE last_name = '%s'"
    # the right way: query = 'SELECT * FROM myapp_person WHERE last_name = %s', [lname])

    # convert datelast null into '2500-01-01'.  (function Coalesce changes Null into '2500-01-01')
    # from: https://stackoverflow.com/questions/5235209/django-order-by-position-ignoring-null
    # Coalesce works by taking the first non-null value.  So we give it
    # a date far after any non-null values of last_active.  Then it will
    # naturally sort behind instances of Box with a non-null last_active value.

    # order_by datelast, null comes last (with Coalesce changes to '2500-01-01'
    # - get employee with earliest endatlookup employee in teammembers

    # for testing:
    # teammembers = cls.objects.annotate(
    #     new_datelast=Coalesce('datelast', Value(datetime(2500, 1, 1))
    #                           )).filter(crit).order_by('new_datelast')
    # for member in teammembers:
    #     employee = getattr(member, 'employee')
    #     if employee:
    #        #logger.debug('test employee: ' + str(employee) + ' datefirst: ' + str(member.datefirst) + ' datelast: ' + str(member.datelast))

    # 1. create 'extende range' -  add 1 day at beginning and end for overlapping shifts of previous and next day
    if not datefirst:
        datefirst = '1900-01-01'
    datefirst_dte = f.get_date_from_ISO(datefirst)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
    # logger.debug('datefirst_dte: ' + str(datefirst_dte) + ' ' + str(type(datefirst_dte)))
    datefirst_dtm = datefirst_dte + timedelta(days=-1)  # datefirst_dtm: 1899-12-31 <class 'datetime.date'>
    # logger.debug('datefirst_dtm: ' + str(datefirst_dtm) + ' ' + str(type(datefirst_dtm)))
    datefirst_iso = datefirst_dtm.isoformat()  # datefirst_iso: 1899-12-31 <class 'str'>
    # logger.debug('datefirst_iso: ' + str(datefirst_iso) + ' ' + str(type(datefirst_iso)))
    datefirst_extended = datefirst_iso.split('T')[0]  # datefirst_extended: 1899-12-31 <class 'str'>
    # logger.debug('datefirst_extended: ' + str(datefirst_extended) + ' ' + str(type(datefirst_extended)))

    if not datelast:
        datelast = '2500-01-01'
    datelast_dte = f.get_date_from_ISO(datelast)
    datelast_dtm = datelast_dte + timedelta(days=1)
    datelast_iso = datelast_dtm.isoformat()
    datelast_extended = datelast_iso.split('T')[0]

    # 2. reset overlap in the narrow timerange - i.e. NOT the extended timerange
    reset_overlapping_shifts(datefirst, datelast, request)

    # 3. create list of employees with multiple emplhours in the extended timerange
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    cursor = connection.cursor()
    cursor.execute("""SELECT eh.employee_id AS empl_id, COUNT(eh.id) 
        FROM companies_emplhour AS eh
        INNER JOIN companies_orderhour AS oh ON (eh.orderhour_id=oh.id)
        INNER JOIN companies_order AS o ON (oh.order_id=o.id)
        INNER JOIN companies_customer AS c ON (o.customer_id=c.id)
        WHERE (c.company_id = %(comp_id)s) 
            AND (eh.employee_id IS NOT NULL) 
            AND (eh.rosterdate IS NOT NULL) 
            AND (eh.rosterdate >= %(df)s)
            AND (eh.rosterdate <= %(dl)s)
        GROUP BY empl_id
        HAVING COUNT(eh.id) > 1""",
                   {'comp_id': request.user.company_id, 'df': datefirst_extended, 'dl': datelast_extended})
    employee_list = cursor.fetchall()
    # logger.debug('employee_list: ' + str(employee_list) + ' ' + str(type(employee_list)))
    # employee_list: [(393,), (155,), (363,), (1252,), (265,), (281,), (1352,)] <class 'list'>

    # 4. loop through list of employees with multiple emplhours
    for item in employee_list:
        employee_id = item[0]
        # logger.debug('employee_id: ' + str(employee_id) + ' ' + str(type(employee_id)))

        # eplh_update_list not in use in check_overlapping_shifts
        eplh_update_list = []
        update_overlap(employee_id, datefirst, datelast, datefirst_extended, datelast_extended, request,
                       eplh_update_list)


# @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
def update_emplhour_overlap(employee_id, rosterdate, request, eplh_update_list):  # PR2019-09-21
    # logger.debug('--- update_emplhour_overlap --- ' + str(employee_id))
    # logger.debug('rosterdate' + str(rosterdate) + ' ' + str(type(rosterdate)))
    # 1. create 'extende range' -  add 1 day at beginning and end for overlapping shifts of previous and next day
    # eplh_update_list strores eplh.id's of records that are updated

    datefirst_dtm = rosterdate + timedelta(days=-1)
    datefirst = datefirst_dtm.isoformat().split('T')[0]

    datefirst_extended_dtm = rosterdate + timedelta(days=-2)
    datefirst_extended = datefirst_extended_dtm.isoformat().split('T')[0]

    datelast_dtm = rosterdate + timedelta(days=1)
    datelast = datelast_dtm.isoformat().split('T')[0]

    datelast_extended_dtm = rosterdate + timedelta(days=2)
    datelast_extended = datelast_extended_dtm.isoformat().split('T')[0]

    update_overlap(employee_id, datefirst, datelast, datefirst_extended, datelast_extended, request, eplh_update_list)

    # logger.debug('eplh_update_list: ' + str(eplh_update_list))


def update_overlap(employee_id, datefirst, datelast, datefirst_extended, datelast_extended, request,
                   eplh_update_list):  # PR2019-09-21
    # logger.debug(' === update_overlap === employee_id ' + ' ' + str(employee_id))
    # logger.debug(' datefirst: ' + str(datefirst) + ' datelast: ' + str(datelast))
    # logger.debug(' datefirst_extended: ' + str(datefirst_extended) +  'datelast_extended: ' + str(datelast_extended))
    # logger.debug(' eplh_update_list: ' + str(eplh_update_list))

    # cursor.fetchall(): [(427, ), (238, ), (363, )]
    # from https://docs.djangoproject.com/en/2.2/topics/db/sql/
    # warning: Do not use string formatting on raw queries or quote placeholders in your SQL strings!
    # not like this: query = 'SELECT * FROM myapp_person WHERE last_name = %s' % lname
    # neither:       query = "SELECT * FROM myapp_person WHERE last_name = '%s'"
    # the right way: query = 'SELECT * FROM myapp_person WHERE last_name = %s', [lname])

    # convert datelast null into '2500-01-01'.  (function Coalesce changes Null into '2500-01-01')
    # from: https://stackoverflow.com/questions/5235209/django-order-by-position-ignoring-null
    # Coalesce works by taking the first non-null value.  So we give it
    # a date far after any non-null values of last_active.  Then it will
    # naturally sort behind instances of Box with a non-null last_active value.

    # order_by datelast, null comes last (with Coalesce changes to '2500-01-01'
    # - get employee with earliest endatlookup employee in teammembers

    # for testing:
    # teammembers = cls.objects.annotate(
    #     new_datelast=Coalesce('datelast', Value(datetime(2500, 1, 1))
    #                           )).filter(crit).order_by('new_datelast')
    # for member in teammembers:
    #     employee = getattr(member, 'employee')
    #     if employee:
    #        #logger.debug('test employee: ' + str(employee) + ' datefirst: ' + str(member.datefirst) + ' datelast: ' + str(member.datelast))

    # logger.debug('------- ')
    # logger.debug('------- > employee_id: ' + str(employee_id) + '' + str(type(employee_id)))

    # 1. create queryset of this employee with emplhours in the narrow timerange
    crit = Q(orderhour__order__customer__company=request.user.company) & \
           Q(employee_id=employee_id) & \
           Q(rosterdate__isnull=False) & \
           Q(rosterdate__gte=datefirst) & Q(rosterdate__lte=datelast)
    emplhours = m.Emplhour.objects.annotate(
        timestart_nonull=Coalesce('timestart', Value(datetime(1900, 1, 1))),
        timeend_nonull=Coalesce('timeend', Value(datetime(2500, 1, 1)))
    ).filter(crit).order_by('id')

    # 2. create queryset of this employee with emplhours in the extended timerange
    crit = Q(orderhour__order__customer__company=request.user.company) & \
           Q(employee_id=employee_id) & \
           Q(rosterdate__isnull=False) & \
           Q(rosterdate__gte=datefirst_extended) & Q(rosterdate__lte=datelast_extended)
    emplhours_extended = m.Emplhour.objects.annotate(
        timestart_nonull=Coalesce('timestart', Value(datetime(1900, 1, 1))),
        timeend_nonull=Coalesce('timeend', Value(datetime(2500, 1, 1)))
    ). \
        filter(crit). \
        values('id', 'timestart_nonull', 'timeend_nonull'). \
        order_by('id')
    # logger.debug(str(emplhours_extended.query))
    # logger.debug(str(emplhours_extended))

    # 5. loop through narrow queryset
    for emplhour in emplhours:
        # logger.debug(str(emplhour.employee.code) + ' ' + str(emplhour.rosterdate))

        # 6. loop through extended queryset and check if record overlaps with other record

        overlap_start = 0
        overlap_end = 0
        for sub_eplh in emplhours_extended:
            if sub_eplh['id'] != emplhour.id:
                x = emplhour.timestart_nonull
                y = emplhour.timeend_nonull
                a = sub_eplh['timestart_nonull']
                b = sub_eplh['timeend_nonull']

                # logger.debug(str(emplhour.id) + ': x = ' + str(x.isoformat()) + ' y = ' + str(y.isoformat()))
                # logger.debug(str(sub_eplh['id']) + ': a = ' + str(a.isoformat()) + ' b = ' + str(b.isoformat()))

                # no overlap                x|_________|y
                #               a|_____|b                  a|_____|b
                #                       b <= x     or      a >= y

                # part overlap                x|_________|y
                #                        a|_____|b    a|_____|b
                #        a < x and b > x and b <= y       a < y and a >= x and b > y

                # full overlap              x|______|y
                #                     a|__________________|b
                #                     a <= x    and    b >= y

                # full overlap          x|__________________|y
                #                             a|__|b
                #                     a >= x   and   b <= y

                if (a <= x and b >= y) or (a >= x and b <= y):
                    # logger.debug(' full overlap (a <= x and b >= y) or (a >= x and b <= y)')
                    # full overlap
                    overlap_start = 1
                    overlap_end = 2
                elif a < x < b <= y:  # a < x and b > x and b <= y:
                    # logger.debug(' overlap_start (a < x and b > x and b <= y)')
                    overlap_start = 1
                elif x <= a < y < b:  # a >= x and a < y and b > y:
                    # logger.debug(' overlap_end (a >= x and a < y and b > y)')
                    overlap_end = 2
                # else:
                # logger.debug(' no overlap')

            if overlap_start == 1 and overlap_end == 2:
                break

        # 6. save overlap when changed
        old_overlap = emplhour.overlap
        emplhour.overlap = overlap_start + overlap_end
        emplhour.save()  # save without request parameter: modifiedat and modifiedby will not be updated

        # 6. add emplhour.id to eplh_update_list
        if overlap_start + overlap_end != old_overlap:
            if emplhour.id not in eplh_update_list:
                eplh_update_list.append(emplhour.id)
        # logger.debug('eplh_update_list: ' + str(eplh_update_list))


def get_rosterdatefill_dict(rosterdate_fill_dte, request):  # PR2019-11-12
    rosterdate_dict = {}
    # count added orderhours
    if rosterdate_fill_dte:
        row_count = m.Orderhour.objects.filter(
            order__customer__company=request.user.company,
            rosterdate=rosterdate_fill_dte.isoformat()
        ).count()
        rosterdate_dict['row_count'] = row_count
        rosterdate_dict['rosterdate'] = rosterdate_fill_dte.isoformat()

    return rosterdate_dict


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def set_fielddict_datetime(field, field_dict, rosterdate_dte, timestart_utc, timeend_utc, has_overlap,
                           comp_timezone, timeformat, user_lang):
    # logger.debug(" ")
    # logger.debug(" ------- set_fielddict_datetime ---------- ")
    # logger.debug("rosterdate_dte " + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
    # rosterdate_dte 2020-03-29 <class 'datetime.date'>
    # logger.debug("timestart_utc " + str(timestart_utc) + ' ' + str(type(timestart_utc)))
    # timestart_utc 2020-03-29 16:00:00+00:00 <class 'datetime.datetime'>
    # logger.debug("comp_timezone " + str(comp_timezone) + ' ' + str(type(comp_timezone)))
    # comp_timezone Europe/Amsterdam <class 'str'>

    timezone = pytz.timezone(comp_timezone)

    # get mindatetime and  maxdatetime
    min_datetime_utc, max_datetime_utc = get_minmax_datetime_utc(field, rosterdate_dte,
                                                                 timestart_utc, timeend_utc, comp_timezone)

    min_offset_int = None
    if min_datetime_utc:
        min_datetime_local = min_datetime_utc.astimezone(timezone)
        min_offset_int = f.get_offset_from_datetimelocal(rosterdate_dte, min_datetime_local)

    max_offset_int = None
    if max_datetime_utc:
        max_datetime_local = max_datetime_utc.astimezone(timezone)
        max_offset_int = f.get_offset_from_datetimelocal(rosterdate_dte, max_datetime_local)

    field_dict['field'] = field

    datetime_utc = None
    datetime_local = None
    offset_int = None
    if field == "timestart":
        datetime_utc = timestart_utc
        if datetime_utc:
            datetime_local = datetime_utc.astimezone(timezone)
            offset_int = f.get_offset_from_datetimelocal(rosterdate_dte, datetime_local)
            # logger.debug("datetime_utc.isoformat() " + str(datetime_utc.isoformat()) + ' ' + str(type(datetime_utc.isoformat())))
            # datetime_utc.isoformat() 2020-03-29T16:00:00+00:00 <class 'str'>
            # logger.debug("datetime_local " + str(datetime_local) + ' ' + str(type(datetime_local)))
            # datetime_local 2020-03-29 18:00:00+02:00 <class 'datetime.datetime'>
            # logger.debug("offset_int " + str(offset_int) + ' ' + str(type(offset_int)))
            # offset_int 1080 <class 'int'>

    elif field == "timeend":
        datetime_utc = timeend_utc
        if datetime_utc:
            datetime_local = datetime_utc.astimezone(timezone)
            offset_int = f.get_offset_from_datetimelocal(rosterdate_dte, datetime_local)

    if offset_int is not None:
        field_dict['offset'] = offset_int

    if min_offset_int is not None:
        field_dict['minoffset'] = min_offset_int

    if max_offset_int is not None:
        field_dict['maxoffset'] = max_offset_int

    if datetime_utc:
        field_dict['datetime'] = datetime_utc.isoformat()
        field_dict['exceldatetime'] = f.get_Exceldatetime_from_datetime(datetime_local)

        dt_local_utc_offset = datetime_local.utcoffset()
        # logger.debug("dt_local_utc_offset " + str(dt_local_utc_offset) + ' ' + str(type(dt_local_utc_offset)))
        # dt_local_utc_offset 2:00:00 <class 'datetime.timedelta'>

        days_diff = dt_local_utc_offset.days
        minutes_diff = dt_local_utc_offset.seconds // 60
        field_dict['utcoffset'] = days_diff * 1440 + minutes_diff
        # blank_when_zero must be False, to show midnight in emplhour roster
        field_dict['display'] = f.format_time_element(
            rosterdate_dte=rosterdate_dte,
            offset=offset_int,
            timeformat=timeformat,
            user_lang=user_lang,
            show_weekday=True,
            blank_when_zero=False,
            skip_prefix_suffix=False)

    if min_datetime_utc:
        field_dict['mindatetime'] = min_datetime_utc.isoformat()
    if max_datetime_utc:
        field_dict['maxdatetime'] = max_datetime_utc.isoformat()
    if rosterdate_dte:
        field_dict['rosterdate'] = rosterdate_dte.isoformat()
    if has_overlap:
        field_dict['overlap'] = True

    # logger.debug('field_dict: '+ str(field_dict))


def get_minmax_datetime_utc(field, rosterdate, timestart_utc, timeend_utc, comp_timezone):  # PR2019-08-07
    # logger.debug(" ------- get_minmax_datetime_utc ---------- ")
    # logger.debug(" ------- rosterdate:    " + str(rosterdate) + ' ' + str(type(rosterdate)))
    # logger.debug(" ------- timestart_utc: " + str(timestart_utc) + ' ' + str(type(rosterdate)))
    # logger.debug(" ------- timeend_utc:   " + str(timeend_utc) + ' ' + str(type(timeend_utc)))
    # logger.debug(" ------- comp_timezone: " + str(comp_timezone) + ' ' + str(type(comp_timezone)))

    min_datetime_utc = None
    max_datetime_utc = None

    if rosterdate:
        # this gives wrong date when timezone offset is negative:
        #   rosterdate_midnight_local = get_rosterdate_midnight_local(rosterdate_utc, comp_timezone)

        if field == field == 'timestart':
            # get mindatetime,  (midnight = rosterdate 00.00 u)
            min_rosterdate_local = f.get_datetimelocal_from_offset(
                rosterdate=rosterdate,
                offset_int=-720,
                comp_timezone=comp_timezone)

            min_datetime_utc = min_rosterdate_local.astimezone(pytz.utc)
            # logger.debug("min_rosterdate_local: " + str(min_rosterdate_local))
            # logger.debug("    min_datetime_utc: " + str(min_datetime_utc))

            # get maxdatetime, 24 hours after midnight
            max_rosterdate_local = f.get_datetimelocal_from_offset(
                rosterdate=rosterdate,
                offset_int=1440,
                comp_timezone=comp_timezone)
            max_rosterdate_utc = max_rosterdate_local.astimezone(pytz.utc)
            # maxdatetime = timeend_utc if that comes before max_rosterdate_utc
            max_datetime_utc = timeend_utc if timeend_utc and timeend_utc < max_rosterdate_utc else max_rosterdate_utc
            # logger.debug("max_rosterdate_local: " + str(max_rosterdate_local))
            # logger.debug("  max_rosterdate_utc: " + str(max_rosterdate_utc))
            # logger.debug("    max_datetime_utc: " + str(max_datetime_utc))

        elif field == field == 'timeend':
            # get mindatetime, equals midnight (midnight = rosterdate 00.00 u)
            min_rosterdate_local = f.get_datetimelocal_from_offset(
                rosterdate=rosterdate,
                offset_int=0,
                comp_timezone=comp_timezone)
            min_rosterdate_utc = min_rosterdate_local.astimezone(pytz.utc)
            min_datetime_utc = timestart_utc if timestart_utc and timestart_utc > min_rosterdate_utc else min_rosterdate_utc
            # logger.debug("min_rosterdate_local: " + str(min_rosterdate_local))
            # logger.debug("  min_rosterdate_utc: " + str(min_rosterdate_utc))
            # logger.debug("    min_datetime_utc: " + str(min_datetime_utc))

            # get maxdatetime, 36 hours after midnight (midnight = rosterdate 00.00 u)
            max_rosterdate_local = f.get_datetimelocal_from_offset(
                rosterdate=rosterdate,
                offset_int=2160,
                comp_timezone=comp_timezone)
            max_datetime_utc = max_rosterdate_local.astimezone(pytz.utc)
            # logger.debug("max_rosterdate_local: " + str(max_rosterdate_local))
            # logger.debug("    max_datetime_utc: " + str(max_datetime_utc))

    return min_datetime_utc, max_datetime_utc


def get_rosterdate_midnight_local(rosterdate_utc, comp_timezone):  # PR2019-07-09
    # logger.debug("  ---  get_rosterdate_midnight_local --- " + str(rosterdate_utc))
    rosterdate_midnight_local = None
    if rosterdate_utc:
        # BUG: gives wrong date whem tomezone offset is negative
        # astimezone changes timezone of a timezone aware object, utc time stays the same
        timezone = pytz.timezone(comp_timezone)
        rosterdate_local = rosterdate_utc.astimezone(timezone)
        # logger.debug("rosterdate_local: " + str(rosterdate_local))

        # make the date midnight at local timezone
        rosterdate_midnight_local = rosterdate_local.replace(hour=0, minute=0)
        # logger.debug("rosterdate_midnight_local: " + str(rosterdate_midnight_local))
        # make the date midnight at local timezone

    return rosterdate_midnight_local


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def get_period_endtimeXXXX(interval_int, overlap_prev_int, overlap_next_int, request):  # PR2019-07-12
    # logger.debug(' ============= get_period_endtime ============= ')
    # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    period_starttime_utc = None
    period_endtime_utc = None

    if request.user is not None and request.user.company is not None:

        # get comp_timezone
        comp_timezone = request.user.company.timezone if request.user.company.timezone else s.TIME_ZONE

        # get now without timezone
        now_utc_naive = datetime.utcnow()
        # now_utc_naive: 2019-07-10 14:48:15.742546 <class 'datetime.datetime'>

        # convert now to timezone utc
        now_utc = now_utc_naive.replace(tzinfo=pytz.utc)
        # now_utc: 2019-07-10 14:48:15.742546+00:00 <class 'datetime.datetime'>

        # convert now_utc to now_local ( = company timezone)
        # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
        timezone = pytz.timezone(comp_timezone)
        now_local = now_utc.astimezone(timezone)
        # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

        # split now_local
        year_int, month_int, date_int, hour_int, minute_int = split_datetime(now_local)

        # get index of current interval (with interval = 6 hours, interval 6-12h has index 1
        interval_index = 0
        if interval_int:
            interval_index = int(hour_int / interval_int)
        # logger.debug('interval_int: ' + str(interval_int) + ' interval_index: ' + str(interval_index))

        # get local start hour of current interval
        period_starthour = interval_int * interval_index
        # logger.debug('period_starthour: ' + str(period_starthour))

        # get local start time of current interval without timezone
        interval_starttime_naive = datetime(year_int, month_int, date_int, period_starthour, 0)
        # logger.debug('interval_starttime_naive: ' + str(interval_starttime_naive))

        # get local start time of current interval in local timezone ( = company timezone)
        # localize can only be used with naive datetime objects. It does not change the datetime, olny adds tzinfo
        interval_starttime_local = timezone.localize(interval_starttime_naive)
        # logger.debug('interval_starttime_local: ' + str(interval_starttime_local))

        # get local start time of current period (is interval_start_local minus overlap_prev_int)
        period_starttime_local = interval_starttime_local - timedelta(hours=overlap_prev_int)
        # logger.debug('overlap_prev_int: ' + str(overlap_prev_int) + ' period_starttime_local: ' + str(period_starttime_local))

        # get start time of current period in UTC
        period_starttime_utc = period_starttime_local.astimezone(pytz.UTC)
        # logger.debug('period_starttime_utc: ' + str(period_starttime_utc))

        # get utc end time of current period ( = local start time of current period plus overlap_prev_int + interval + overlap_next_int
        period_int = overlap_prev_int + interval_int + overlap_next_int
        period_endtime_utc = period_starttime_utc + timedelta(hours=period_int)
        # logger.debug('period: ' + str(period_int) + 'period_endtime_utc' + str(period_endtime_utc))

    return period_endtime_utc


def get_range(range):  # PR2019-07-10
    year_int = 0
    month_int = 0
    date_int = 0
    hour_int = 0

    if range:
        if ';' in range:
            arr = range.split(';')
            year_int = int(arr[0])
            month_int = int(arr[1])
            date_int = int(arr[2])
            hour_int = int(arr[3])
    return year_int, month_int, date_int, hour_int


def split_datetime(dt):  # PR2019-07-10
    year_int = 0
    month_int = 0
    date_int = 0
    hour_int = 0
    minute_int = 0
    if dt:
        year_int = dt.year
        month_int = dt.month
        date_int = dt.day
        hour_int = dt.hour
        minute_int = dt.minute

    return year_int, month_int, date_int, hour_int, minute_int


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def get_datetime_utc(dtm):
    datetime_utc = None
    if datetime:
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is dattime-naive, make it datetime aware with  pytz.timezone
        datetime_naive = datetime(dtm.year, dtm.month, dtm.day, dtm.hour, dtm.minute)
        # logger.debug("datetime_midnight_naive: " + str(datetime_naive) + str(type(datetime_naive)))

        # localize can only be used with naive datetime objects. It does not change the datetime, olny adds tzinfo
        datetime_utc = pytz.utc.localize(datetime_naive)
        # datetime_utc: 2019-06-23 00:00:00+00:00
        # logger.debug("datetime_utc: " + str(datetime_utc))
    return datetime_utc


def get_rosterdate_utc(rosterdate):
    rosterdate_utc = None
    if rosterdate:
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is dattime-naive, make it datetime aware with  pytz.timezone
        rosterdate_naive = datetime(rosterdate.year, rosterdate.month, rosterdate.day)
        # logger.debug("rosterdate_midnight_naive: " + str(rosterdate_naive) + str(type(rosterdate_naive)))

        # localize can only be used with naive datetime objects. It does not change the datetime, olny adds tzinfo
        rosterdate_utc = pytz.utc.localize(rosterdate_naive)
        # rosterdate_utc: 2019-06-23 00:00:00+00:00
        # logger.debug("rosterdate_utc: " + str(rosterdate_utc))

    return rosterdate_utc


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def get_customer_order_code(order, delim=' '):  # PR2019-08-16
    customer_order_code = ''
    if order:
        if order.customer.code:
            customer_order_code = order.customer.code
        if order.code:
            order_code = order.code
            customer_order_code += delim + order_code
    return customer_order_code


def get_team_code(team):
    # logger.debug(' --- get_team_code --- ')

    team_title = ''
    count = 0
    if team:

        # 1. iterate through teammembers, latest enddate first
        teammembers = m.Teammember.objects \
            .select_related('employee') \
            .filter(team=team)
        # logger.debug('teammembers SQL: ' + str(teammembers.query))
        for teammember in teammembers:
            # logger.debug('teammember: ' + str(teammember))
            # teammember: {'id': 300, 'employee__code': 'Crisostomo Ortiz R Y', 'datelast_nonull': datetime.datetime(2500, 1, 1, 0, 0)}
            employee = teammember.employee
            if employee:
                if team_title:
                    team_title += '; '
                team_title += employee.code
            count += 1
    suffix = ''
    if count == 0:
        suffix = ' (-)'
    elif count > 1:
        suffix = ' (' + str(count) + ')'

    return team.code, suffix, team_title


# #####################################################################
def create_page_scheme_list(filter_dict, datalists, company, comp_timezone, user_lang):
    # PR2020-05-23 used in scheme page, to retrieve schemes, etc from selected order
    logging_on = s.LOGGING_ON
    if logging_on:
        logger.debug(' ================ create_page_scheme_list ================ ')
        logger.debug('filter_dict: ' + str(filter_dict))

    # customer_pk is only used when is_absence
    checked_customer_pk = None
    checked_order_pk = None
    new_filter_dict = {}
    is_absence = False

    if filter_dict:
        is_absence = filter_dict.get('isabsence', False)
    if is_absence:
        absence_customer_pk = filter_dict.get('customer_pk')
        if m.Customer.objects.filter(pk=absence_customer_pk, company=company).exists():
            checked_customer_pk = absence_customer_pk
    else:
        order_pk = filter_dict.get('order_pk')
        order = m.Order.objects.get_or_none(pk=order_pk, customer__company=company)
        if order:
            checked_order_pk = order.pk
            checked_customer_pk = order.customer.pk

    if checked_order_pk is not None:
        new_filter_dict['order_pk'] = checked_order_pk
    elif checked_customer_pk is not None:
        new_filter_dict['customer_pk'] = checked_customer_pk

    if logging_on:
        logger.debug('is_absence: ' + str(is_absence))
        logger.debug('new_filter_dict: ' + str(new_filter_dict))

    if checked_order_pk is not None or checked_customer_pk is not None:
        # logger.debug('new_filter_dict: ' + str(new_filter_dict))

        if is_absence:
            # ----- absence_list
            teammember_list = ed.ed_create_teammember_list(filter_dict=new_filter_dict, company=company,
                                                           user_lang=user_lang)
            if teammember_list:
                datalists['absence_list'] = teammember_list
        else:
            # ----- scheme_list
            scheme_rows, scheme_list = create_scheme_list(
                filter_dict=new_filter_dict,
                company=company,
                comp_timezone=comp_timezone,
                user_lang=user_lang)
            # TODO scheme_list to ve deprecated PR2021-05-26
            if scheme_list:
                datalists['scheme_list'] = scheme_list
            if scheme_rows:
                datalists['scheme_rows'] = scheme_rows

            if logging_on:
                logger.debug('scheme_list length: ' + str(len(scheme_list)))
            # ----- shift_rows
            shift_rows = create_shift_rows(filter_dict=new_filter_dict, company=company)
            if shift_rows:
                datalists['shift_rows'] = shift_rows

            if logging_on:
                logger.debug('shift_rows length: ' + str(len(shift_rows)))
            # ----- team_rows
            team_rows = create_team_rows(filter_dict=new_filter_dict, company=company)
            if team_rows:
                datalists['team_rows'] = team_rows

            if logging_on:
                logger.debug('team_rows length: ' + str(len(team_rows)))

            # ----- teammember_list
            teammember_list, teammember_rows = ed.ed_create_teammember_list(filter_dict=new_filter_dict,
                                                                            company=company, user_lang=user_lang)
            if teammember_list:
                datalists['teammember_list'] = teammember_list
            if teammember_rows:
                datalists['teammember_rows'] = teammember_rows

            if logging_on:
                logger.debug('teammember_list length: ' + str(len(teammember_list)))
                logger.debug('teammember_rows length: ' + str(len(teammember_rows)))
            # ----- schemeitem_list
            schemeitem_list, schemeitem_rows = create_schemeitem_list(filter_dict=new_filter_dict, company=company)
            if schemeitem_list:
                datalists['schemeitem_list'] = schemeitem_list
                datalists['schemeitem_rows'] = schemeitem_rows

            if logging_on:
                logger.debug('schemeitem_list length: ' + str(len(schemeitem_list)))

    return checked_customer_pk, checked_order_pk


#  --- end of create_schemes_extended_dict ---


def create_schemes_extended_dict(filter_dict, company, comp_timezone, user_lang):
    # PR2020-05-06 to be used in calendar
    # logger.debug(' --- create_schemes_extended_dict --- ')
    # logger.debug('filter_dict: ' + str(filter_dict))

    customer_pk = filter_dict.get('customer_pk')
    order_pk = filter_dict.get('order_pk')
    is_absence = filter_dict.get('is_absence')
    is_template = filter_dict.get('is_template')
    inactive = filter_dict.get('inactive')

    # --- create list of schemes of this company, absence=false PR2019-11-22
    crit = Q(order__customer__company=company)

    if is_absence is not None:
        crit.add(Q(isabsence=is_absence), crit.connector)
    if is_template is not None:
        crit.add(Q(istemplate=is_template), crit.connector)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    if order_pk:
        crit.add(Q(order_id=order_pk), crit.connector)
    elif customer_pk:
        crit.add(Q(order__customer_id=customer_pk), crit.connector)

    schemes = m.Scheme.objects.filter(crit)
    # logger.debug('schemes SQL: ' + str(schemes.query))

    schemes_dict = {}
    for scheme in schemes:
        item_dict = {}
        create_scheme_dict_extended(scheme, item_dict, user_lang)

        if item_dict:
            # add shiftlist to scheme_dict:
            shift_rows = create_shift_rows(
                filter_dict={'scheme_pk': scheme.pk},
                company=company)
            if shift_rows:
                item_dict['shift_rows'] = shift_rows

            # add teamlist to scheme_dict:
            team_list = create_team_rows(
                filter_dict={'scheme_pk': scheme.pk},
                company=company)
            if team_list:
                item_dict['team_list'] = team_list
            # add schemeitem_list to scheme_dict:
            schemeitem_list, schemeitem_rows = create_schemeitem_list(filter_dict={'scheme_pk': scheme.pk},
                                                                      company=company)
            if schemeitem_list:
                item_dict['schemeitem_list'] = schemeitem_list

            schemes_dict[scheme.pk] = item_dict

    return schemes_dict


def create_scheme_dict_extended(scheme, item_dict, user_lang):
    # --- create dict of this order PR2019-09-28
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    if scheme:
        # FIELDS_SCHEME = ('id', 'order', 'cat', 'cycle', 'excludecompanyholiday', 'excludepublicholiday', 'inactive')

        # ---  get min max date from scheme and order
        scheme_datefirst = getattr(scheme, 'datefirst')
        order_datefirst = getattr(scheme.order, 'datefirst')
        mindate = f.date_latest_of_two(scheme_datefirst, order_datefirst)  # PR2019-09-12

        scheme_datelast = getattr(scheme, 'datelast')
        order_datelast = getattr(scheme.order, 'datelast')
        maxdate = f.date_earliest_of_two(scheme_datelast, order_datelast)  # PR2019-09-12

        table = 'scheme'
        for field in c.FIELDS_SCHEME:

            # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = scheme.pk
                field_dict['ppk'] = scheme.order.pk
                field_dict['table'] = table
                if scheme.isabsence:
                    field_dict['isabsence'] = True
                if scheme.istemplate:
                    field_dict['istemplate'] = True

                item_dict['pk'] = scheme.pk

            elif field in ['order']:
                pass

            elif field in ['cat']:
                cat_sum = getattr(scheme, field, 0)
                field_dict['value'] = cat_sum

            elif field in ['cycle']:
                field_dict['value'] = getattr(scheme, field, 0)

            # also add date when empty, to add min max date
            elif field == 'datefirst':
                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_obj=scheme_datefirst,
                    mindate=order_datefirst,
                    maxdate=maxdate)
            elif field == 'datelast':
                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_obj=scheme_datelast,
                    mindate=mindate,
                    maxdate=order_datelast)

            elif field in ['priceratejson']:
                f.get_fielddict_pricerate(
                    table=table,
                    instance=scheme,
                    field_dict=field_dict,
                    user_lang=user_lang)

            elif field in ['isabsence', 'istemplate']:
                pass

            else:
                value = getattr(scheme, field)
                if value:
                    field_dict['value'] = value

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)

