from django.db import connection
from django.db.models import Q, Value, Max
from django.db.models.functions import Coalesce

from datetime import date, datetime, timedelta
from timeit import default_timer as timer

from accounts.models import Usersetting
from companies import models as m

from tsap.settings import TIME_ZONE
from tsap import constants as c
from tsap import functions as f

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

def get_rosterdate_check(upload_dict, request):  # PR2019-11-11
    logger.debug(' --- get_rosterdate_check --- ')
    # function gets rosterdate from upload_dict. If None: lookup last roserdate in orderhour and add one day to it.
    # Generates a "SELECT MAX..." query, return value is a dict
    # # upload_dict: (input) {rosterdate: "2019-11-14"} or (create) {next: True} or (delete) {last: True}
    # 'rosterdate_check': {'mode': 'delete', 'rosterdate': '2019-12-14'}} <class 'dict'>

    # default value for rosterdate is today
    rosterdate = date.today()
    rosterdate_iso = rosterdate.isoformat()

    mode = upload_dict.get('mode')
    rosterdate_dict = {'mode': mode}
    logger.debug('mode: ' + str(mode))

# if rosterdate in dict: check this rosterdate, otherwise check last rosterdate or next
    if 'rosterdate' in upload_dict:
        rosterdate_iso = upload_dict.get('rosterdate')
        rosterdate = f.get_dateobj_from_dateISOstring(rosterdate_iso)
    else:

# get last rosterdate of Orderhour
        max_rosterdate_dict = m.Orderhour.objects.\
            filter(order__customer__company=request.user.company).\
            aggregate(Max('rosterdate'))
        # last_rosterdate_dict: {'rosterdate__max': datetime.date(2019, 12, 19)} <class 'dict'>
        if max_rosterdate_dict:
            rosterdate = max_rosterdate_dict['rosterdate__max'] # datetime.date(2019, 10, 28)
            if rosterdate:
                rosterdate_iso = rosterdate.isoformat()

# in create mode: get next rosterdate
            if rosterdate and mode == 'create':
                # add one day to change rosterdate
                rosterdate = rosterdate + timedelta(days=1)
                rosterdate_iso = rosterdate.isoformat()
    if rosterdate is None:
        rosterdate = date.today()

    if 'rosterdate':
        rosterdate_count, rosterdate_confirmed = check_rosterdate_confirmed(rosterdate, request.user.company)
        rosterdate_dict['rosterdate'] = rosterdate_iso
        rosterdate_dict['count'] = rosterdate_count
        rosterdate_dict['confirmed'] = rosterdate_confirmed

    return rosterdate_dict


def check_rosterdate_confirmed(rosterdate_dte, company):  # PR2019-11-12
    # logger.debug(' ============= check_rosterdate_confirmed ============= ')
    # logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
    # check if rosterdate has orderhours / emplhours. If so, check if there are lockes  /confirmed shifts

# get emplhour records of this date and status less than STATUS_02_START_CONFIRMED, also delete records with rosterdate Null
    row_count_confirmed_or_locked = 0
    # count emplhour records on this date
    row_count = m.Emplhour.objects.filter(
        orderhour__order__customer__company=company,
        rosterdate=rosterdate_dte).count()

    if(row_count):
    # if any: count emplhour records that are confirmed
        row_count_confirmed_or_locked = m.Emplhour.objects.filter(
            orderhour__order__customer__company=company,
            rosterdate=rosterdate_dte,
            status__gte=c.STATUS_02_START_CONFIRMED).count()

    # logger.debug('row_count: ' + str(row_count) + ' row_count_confirmed_or_locked: ' + str(row_count_confirmed_or_locked))
    return row_count, row_count_confirmed_or_locked


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
                period_endtime_utc = get_period_endtime(period_starttime_utc, interval_int, overlap_prev_int, overlap_next_int)
                period_endtime_iso = period_endtime_utc.isoformat()
                new_period_dict['periodend'] = period_endtime_iso

    # add today to dict
        today = f.get_today_local_iso(request)
        new_period_dict['today'] = today

        period_dict_json = json.dumps(new_period_dict)  # dumps takes an object and produces a string:
        Usersetting.set_setting(c.KEY_USER_PERIOD_EMPLHOUR, period_dict_json, request.user)

    # logger.debug('new_period_dict: ' + str(new_period_dict))
    return new_period_dict


def get_current_period(interval_int, overlap_prev_int, overlap_next_int, request):  # PR2019-07-12
    # logger.debug(' ============= get_current_period ============= ')
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    period_starttime_utc = None
    period_endtime_utc = None

    if request.user is not None and request.user.company is not None:

# get comp_timezone
        comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

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


def get_prevnext_period(prevnext, period_timestart_iso, interval_int, overlap_prev_int,  overlap_next_int, comp_timezone):  # PR2019-07-13
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


def get_range_enddate_iso(range, range_startdate_iso, comp_timezone):  # PR2019-08-01
    logger.debug(' ============= get_range_enddate_iso ============= ')
    logger.debug(' range_startdate_iso: ' + str(range_startdate_iso) + ' rang: ' + str(range))
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

# split range
    year_add = 0
    month_add = 0
    day_add = 0
    hour_add = 0
    if range:
        if ';' in range:
            arr = range.split(';')
            year_add = int(arr[0])
            month_add = int(arr[1])
            day_add = int(arr[2])
            hour_add = int(arr[3])


# split range_startdate_iso
    arr = f.get_datetimearray_from_ISOstring(range_startdate_iso)
    year_int = int(arr[0])
    month_int = int(arr[1])
    date_int = int(arr[2])

    datetime_end = None
    range_end_iso = ''
    range_end_date = None
# add range year/month/day/hour
    if year_add  or month_add:
        new_month = month_int + month_add
        if new_month >= 12:
            new_month = new_month % 12  # % modulus returns the decimal part (remainder) of the quotient
            year_add = year_add + new_month // 12  # // floor division returns the integral part of the quotient.
            # The % (modulo) operator yields the remainder from the division of the first argument by the second.
        new_year = year_int + year_add

        date_end_plus_one = date(new_year, new_month, date_int)
        datetime_end_plus_one = f.get_datetime_naive_from_dateobject(date_end_plus_one)
        datetime_end = datetime_end_plus_one + timedelta(days=-1)
        range_end_date = datetime_end.date()

    elif day_add > 0:
        # convert range_timestart_utc to range_timestart_local
        date_start = f.get_date_from_ISOstring(range_startdate_iso)
        datetime_start = f.get_datetimenaive_from_ISOstring(range_startdate_iso)
        logger.debug(' datetime_start: ' + str(datetime_start) + ' rang: ' + str(type(datetime_start)))
        # previous day is end date
        day_add -= 1
        datetime_end = datetime_start + timedelta(days=day_add)
        range_end_date = datetime_end.date()

    if range_end_date:
        range_end_iso = range_end_date.isoformat()

    return range_end_iso


def get_period_from_settings(request):  # PR2019-07-09
    # logger.debug(' ============= get_period_from_settings ============= ')

    period_dict = {}
    if request.user is not None and request.user.company is not None:

# get period from Usersetting
        saved_period_dict = {}
        dict_json = Usersetting.get_setting(c.KEY_USER_PERIOD_EMPLHOUR, request.user)
        if dict_json:
            saved_period_dict = json.loads(dict_json)

# if not found: get period from Companysetting
        else:
            dict_json = m.Companysetting.get_setting(c.KEY_USER_PERIOD_EMPLHOUR, request.user.company)
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

def create_scheme_list(request, is_singleshift, is_template, inactive, user_lang):
    # logger.debug(' --- create_scheme_list --- ')
    # logger.debug('is_singleshift: ' + str(is_singleshift))

# --- create list of schemes of this company, absence=false PR2019-11-22
    crit = (Q(order__customer__company=request.user.company) & Q(isabsence=False))
    if is_singleshift is not None:
        crit.add(Q(issingleshift=is_singleshift), crit.connector)
    if is_template is not None:
        crit.add(Q(istemplate=is_template), crit.connector)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)

    schemes = m.Scheme.objects.filter(crit)
    # logger.debug('schemes SQL: ' + str(schemes.query))

    scheme_list = []
    for scheme in schemes:
        item_dict = {}
        create_scheme_dict(scheme, item_dict, user_lang)

        if item_dict:
            scheme_list.append(item_dict)

    return scheme_list


def create_scheme_dict(scheme, item_dict, user_lang):
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

                is_override, is_billable = f.get_billable_scheme(scheme)
                if 'billable' not in item_dict:
                    item_dict['billable'] = {}
                item_dict['billable']['override'] = is_override
                item_dict['billable']['billable'] = is_billable

            elif field in ['cycle']:
                field_dict['value'] = getattr(scheme, field, 0)

            # also add date when empty, to add min max date
            elif field == 'datefirst':
                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_value=scheme_datefirst,
                    mindate=order_datefirst,
                    maxdate=maxdate)
            elif field == 'datelast':
                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_value=scheme_datelast,
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

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_schemeitem_template_list(request, comp_timezone, user_lang):
    # --- create list of all template schemes of this company PR2019-07-24
    # logger.debug("========== create_schemeitem_template_list ==== ")

    schemeitem_list = []
    order = m.Order.objects.get_or_none(
        customer__company=request.user.company,
        istemplate=True
    )
    #logger.debug("order: " + str(order))
    if order:
        schemeitem_list = create_schemeitem_list(
            request=request,
            customer=order.customer,
            is_singleshift=None,
            comp_timezone=comp_timezone,
            user_lang=user_lang)

    #logger.debug("schemeitem_list " + str(schemeitem_list))
    return schemeitem_list


def create_schemeitem_list(request, customer, is_singleshift, comp_timezone, user_lang):
    # create list of schemeitems of this scheme PR2019-09-28

    crit = Q(scheme__order__customer__company=request.user.company)
    if customer:
        crit.add(Q(scheme__order__customer=customer), crit.connector)
    if is_singleshift:
        crit.add(Q(issingleshift=is_singleshift), crit.connector)
    schemeitems = m.Schemeitem.objects.filter(crit).order_by('rosterdate', 'shift__offsetstart')

    schemeitem_list = []
    for schemeitem in schemeitems:
        item_dict = {}
        create_schemeitem_dict(schemeitem, item_dict, comp_timezone, user_lang)

        if item_dict:
            schemeitem_list.append(item_dict)

    return schemeitem_list


def create_schemeitem_dict(schemeitem, item_dict, comp_timezone, user_lang):
    # --- create dict of this schemeitem PR2019-07-22
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('item_dict' + str(item_dict))

    if schemeitem:
        # FIELDS_SCHEMEITEM = ('id', 'scheme', 'shift', 'team',
        #                      'cat', 'istemplate', 'billable',
        #                      'rosterdate', 'iscyclestart',
        #                      'offsetstart', 'offsetend', 'breakduration', 'timeduration',
        #                      'priceratejson', 'additionjson', 'inactive')

        offsetstart_value = getattr(schemeitem, 'offsetstart')
        offsetend_value = getattr(schemeitem, 'offsetend')
        breakduration_value = getattr(schemeitem, 'breakduration')

        # calculate timeduration
        timeduration = 0
        timeduration_minus_break = 0
        if offsetstart_value is not None and offsetend_value is not None:
            timeduration = offsetend_value - offsetstart_value
            timeduration_minus_break = timeduration


        for field in c.FIELDS_SCHEMEITEM:

 # --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = schemeitem.pk
                field_dict['ppk'] = schemeitem.scheme.pk
                field_dict['table'] = 'schemeitem'
                if schemeitem.istemplate:
                    field_dict['istemplate'] = True

                item_dict['pk'] = schemeitem.pk

            elif field == 'scheme':
                scheme = getattr(schemeitem, field)
                if scheme:
                    field_dict['pk'] = scheme.id
                    field_dict['value'] = scheme.code

            elif field in ('iscyclestart', 'inactive'):
                field_dict['value'] = getattr(schemeitem, field, False)

            elif field == 'cat':
                cat_sum = getattr(schemeitem, field, 0)
                field_dict['value'] = cat_sum

                is_override, is_billable = f.get_billable_schemeitem(schemeitem)
                if 'billable' not in item_dict:
                    item_dict['billable'] = {}
                item_dict['billable']['override'] = is_override
                item_dict['billable']['billable'] = is_billable

            elif field == 'rosterdate':
                rosterdate = getattr(schemeitem, field)
                cycle_startdate = None
                cycle_enddate = None
                schemeitem_cyclestart = m.Schemeitem.objects.filter(
                    scheme=schemeitem.scheme,
                    iscyclestart=True
                ).first()
                if schemeitem_cyclestart is None:
                     # lookup lowest rosterdate if iscyclestart is not set
                    schemeitem_cyclestart = m.Schemeitem.objects.filter(
                        scheme=schemeitem.scheme
                    ).order_by('rosterdate').first()
                if schemeitem_cyclestart:
                    cycle_startdate = schemeitem_cyclestart.rosterdate
                    days = (schemeitem.scheme.cycle - 1)
                    cycle_enddate = cycle_startdate + timedelta(days=days)

                f.set_fielddict_date(
                    field_dict=field_dict,
                    date_value=rosterdate,
                    mindate=cycle_startdate,
                    maxdate=cycle_enddate)

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
                field_dict['value'] = timeduration_minus_break

            elif field in ['priceratejson']:
                f.get_fielddict_pricerate(
                    table='schemeitem',
                    instance=schemeitem,
                    field_dict=field_dict,
                    user_lang=user_lang)

            elif field == 'shift':
                shift = getattr(schemeitem, field)
                if shift:
                    field_dict['pk'] = shift.id
                    field_dict['value'] = shift.code

                    if shift.isrestshift:
                        field_dict['value_R'] = shift.code + ' (R)'

                    value = getattr(shift, 'offsetstart')
                    if value is not None:
                        field_dict['offsetstart'] = {'value': value}

                    value = getattr(shift, 'offsetend')
                    if value is not None:
                        field_dict['offsetend'] = {'value': value}

                    value = getattr(shift, 'breakduration')
                    if value is not None:
                        field_dict['breakduration'] = {'value': value}

                    value = getattr(shift, 'timeduration')
                    if value is not None:
                        field_dict['timeduration'] = {'value': value}

            elif field == 'team':
                team = getattr(schemeitem, field)
                if team:
                    field_dict['pk'] = team.id
                    field_dict['value'] = team.code


            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


def create_shift_list( customer, user_lang, request):
    # create list of shifts of this order PR2019-08-08
    # logger.debug(' --- create_shift_list --- ')
    shift_list = []

    crit = Q(scheme__order__customer__company=request.user.company)
    if customer:
        crit.add(Q(scheme__order__customer=customer), crit.connector)
    shifts = m.Shift.objects.select_related('scheme').filter(crit)

    for shift in shifts:
        update_dict = {}
        create_shift_dict(shift, update_dict, user_lang)

        if update_dict:
            shift_list.append(update_dict)

    return shift_list


def create_shift_dict(shift, update_dict, user_lang):
    # logger.debug(' ----- create_shift_dict ----- ')
    # update_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    # FIELDS_SHIFT = ('id', 'code', 'cat', 'offsetstart', 'offsetend', 'breakduration', 'timeduration', 'wagefactor')

    if shift:
        offsetstart_value = shift.offsetstart
        offsetend_value = shift.offsetend
        breakduration_value = shift.breakduration if shift.breakduration else 0

        # logger.debug('shiftcode: ' + str(shift.code))
        #  logger.debug('shift.offsetstart: ' + str(shift.offsetstart))
        # logger.debug('shift.offsetend: ' + str(shift.offsetend))
        # logger.debug('offsetstart_value: ' + str(offsetstart_value))
        # logger.debug('offsetend_value: ' + str(offsetend_value))

# calculate timeduration
        timeduration = 0
        timeduration_minus_break = 0
        if offsetstart_value is not None and offsetend_value is not None:
            timeduration = offsetend_value - offsetstart_value
            timeduration_minus_break = timeduration

        for field in c.FIELDS_SHIFT:

# --- get field_dict from  item_dict if it exists
            field_dict = update_dict[field] if field in update_dict else {}

# --- create field_dict 'id'
            if field == 'id':
                field_dict['pk'] = shift.pk
                field_dict['ppk'] = shift.scheme.pk
                field_dict['table'] = 'shift'
                if shift.istemplate:
                    field_dict['istemplate'] = True
                update_dict['pk'] = shift.pk

            elif field == 'cat':
                cat_sum = getattr(shift, field, 0)
                field_dict['value'] = cat_sum

            elif field in ['isrestshift', 'istemplate']:
                value = getattr(shift, field, False)
                field_dict['value'] = value

            elif field == 'billable':
                # TODO
                pass

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

 # calculate timeduration
            elif field == 'timeduration':
                field_dict['value'] = timeduration_minus_break


            elif field in ['priceratejson']:
                f.get_fielddict_pricerate(
                    table='shift',
                    instance=shift,
                    field_dict=field_dict,
                    user_lang=user_lang)


            # 5. create field_dict 'code', 'offsetstart', 'offsetend', 'breakduration'
            elif field == 'code':
                value = getattr(shift, field, None)
                if value:
                    field_dict['value'] = value

            if field_dict:
                update_dict[field] = field_dict

    # logger.debug('update_dict: ' + str(update_dict))
    # 7. remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(update_dict)
# --- end of create_shift_dict


def create_team_list(request, customer, is_singleshift):
    # create list of teams of this order PR2019-09-02
    # logger.debug(' ----- create_team_list  -----  ')
    team_list = []

    crit = Q(scheme__order__customer__company=request.user.company)
    if is_singleshift:
        crit.add(Q(issingleshift=is_singleshift), crit.connector)
    if customer:
        crit.add(Q(scheme__order__customer=customer), crit.connector)
        is_singleshift = is_singleshift,

    teams = m.Team.objects.select_related('scheme').filter(crit)
    # logger.debug(teammembers.query)

    for team in teams:
        item_dict = {}
        create_team_dict(team, item_dict)

        if item_dict:
            team_list.append(item_dict)

    return team_list


def create_team_dict(team, item_dict):
    # --- create dict of this team PR2019-08-08
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug(' --- create_team_dict ---')
    # logger.debug('item_dict: ' + str(item_dict))
    # FIELDS_TEAM = ('id', 'scheme', 'cat', 'code')
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

                item_dict['pk'] = team.pk

        # scheme is parent of team
            elif field == 'scheme':
                scheme = team.scheme
                field_dict['pk'] = scheme.pk
                field_dict['ppk'] = scheme.order.pk
                if scheme.code:
                    field_dict['value'] = scheme.code

            elif field == 'cat':
                field_dict['value'] = getattr(team, field, 0)

            elif field == 'code':
                code, suffix, title = get_team_code(team)
                if code:
                    field_dict['value'] = code
                if suffix:
                    field_dict['suffix'] = suffix
                if title:
                    field_dict['title'] = title

# 5. add field_dict to item_dict
            if field_dict:
                item_dict[field] = field_dict

# 6. remove empty attributes from item_dict
    f.remove_empty_attr_from_dict(item_dict)
# --- end of create_team_dict
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def period_get_and_save(period_dict, request, comp_timezone):   # PR2019-11-16
    # logger.debug(' ============== period_get_and_save ================ ')
    # logger.debug(' period_dict: ' + str(period_dict))
    # period_dict: {'get': True, 'now': [2019, 11, 17, 7, 9]}
    # period_dict: {'period_index': 6, 'extend_index': 4, 'extend_offset': 360, 'now': [2019, 11, 17, 7, 41]}

    update_dict = {}

    if period_dict:
# 1. check if values must be retrieved from Usersetting
        get_saved = period_dict.get('get', False)

# 2. get now from period_dict, if not in period_dict: create 'now' (should not be possible)
        now_arr = period_dict.get('now')
    # b. if 'now' is not in period_dict: create 'now' (should not be possible)
        if now_arr is None:
            now = datetime.now()
            now_arr = [now.year, now.month, now.day, now.hour, now.minute]
    # c. get today_iso, today_dte and now_usercomp_dtm from now_arr
        # now is the time of the computer of the current user. May be different from company local
        year_str = str(now_arr[0])
        month_str = str(now_arr[1])
        date_str = str(now_arr[2])
        today_iso = '-'.join([year_str, month_str, date_str])
        # today_iso: 2019-11-17 <class 'str'>
        today_dte = f.get_date_from_arr(now_arr)
        # today_dte: 2019-11-17 <class 'datetime.date'>
        now_usercomp_dtm = f.get_datetime_from_arr(now_arr)
        # now: 2019-11-17 07:41:00 <class 'datetime.datetime'>
        # logger.debug('now_arr: ' + str(now_arr))
        # logger.debug('today_dte: ' + str(today_dte))

# 3. get saved period_dict if get_saved = True
        key = None
        page = period_dict.get('page')
        if page == 'roster':
            key = c.KEY_USER_PERIOD_ROSTER
        elif page == 'review':
            key = c.KEY_USER_PERIOD_REVIEW
        elif page == 'emplhour':
            key = c.KEY_USER_PERIOD_EMPLHOUR
        if get_saved and key:
            period_dict = Usersetting.get_jsonsetting(key, request.user)

# 4. create update_dict
        update_dict = {'page': key, 'now': now_arr}
        # period_dict comes either from argument or from Usersetting
        period_tag = 'today'
        extend_offset = 0
        periodstart = None
        periodend = None
        if period_dict:
            period_tag = period_dict.get('period_tag', 'today')
            extend_offset = period_dict.get('extend_offset', 0)
            periodstart = period_dict.get('periodstart')
            periodend = period_dict.get('periodend')

        update_dict['period_tag'] = period_tag
        update_dict['extend_offset'] = extend_offset
        if periodstart is not None:
            update_dict['periodstart'] = periodstart
        if periodend is not None:
            update_dict['periodend'] = periodend

 # 5. save update_dict
        Usersetting.set_jsonsetting(key, update_dict, request.user)
        # new update_dict: {'period_index': 6, 'extend_index': 4, 'extend_offset': 360, 'now': [2019, 11, 17, 7, 41]}

        # default tag is 'today'
        rosterdatefirst_dte = today_dte
        rosterdatelast_dte = today_dte
        # default offest start is 0 - offset, (midnight - offset)
        # default offest start is 1440 + offset (24 h after midnight + offset)
        # value for morning, evening, night and day are different
        offset_firstdate = 0 - extend_offset
        offset_lastdate = 1440 + extend_offset


        if period_tag != 'now':  # 60: 'Now'
            if period_tag == 'tnight':  # 1: 'This night', offset_firstdate is default:  0 - offset
                offset_lastdate = 360 + extend_offset
            elif period_tag == 'tmorning':  #  2: 'This morning'
                offset_firstdate = 360 - extend_offset
                offset_lastdate = 720 + extend_offset
            elif period_tag == 'tafternoon':  # 3: 'This afternoon'
                offset_firstdate = 720 - extend_offset
                offset_lastdate = 1080 + extend_offset
            elif period_tag == 'tevening':  # 4: 'This evening', , offset_lastdate is default: 1440 + offset
                offset_firstdate = 1080 - extend_offset
            elif period_tag == 'Today':  # 5: 'Today'
                pass
            elif period_tag == 'tomorrow':  # 6: 'Tomorrow'
                rosterdatefirst_dte = f.add_days_to_date(today_dte, 1)
                rosterdatelast_dte = rosterdatefirst_dte
            elif period_tag == 'yesterday':  # 7: 'Yesterday'
                rosterdatefirst_dte = f.add_days_to_date(today_dte, -1)
                rosterdatelast_dte = rosterdatefirst_dte
            elif period_tag == 'tweek':  # 8: 'This week'
                rosterdatefirst_dte = f.get_firstof_week(today_dte, 0)
                rosterdatelast_dte = f.get_lastof_week(today_dte, 0)
            elif period_tag == 'lweek':  # 8: 'Last week'
                rosterdatefirst_dte = f.get_firstof_week(today_dte, -1)
                rosterdatelast_dte = f.get_lastof_week(today_dte, -1)
            elif period_tag == 'nweek':  # 8: 'Next week'
                rosterdatefirst_dte = f.get_firstof_week(today_dte, 1)
                rosterdatelast_dte = f.get_lastof_week(today_dte, 1)
            elif period_tag == 'tmonth':  # 9: 'This month'
                rosterdatefirst_dte = f.get_firstof_month(today_dte)
                rosterdatelast_dte = f.get_lastof_month(today_dte)
            elif period_tag == 'lmonth':  # 9: 'This month'
                firstof_thismonth_dte = f.get_firstof_month(today_dte)
                firstof_lastmonth_dte = f.add_month_to_firstof_month(firstof_thismonth_dte, -1)
                lastof_lastmonth_dte = f.get_lastof_month(firstof_lastmonth_dte)
                rosterdatefirst_dte = firstof_lastmonth_dte
                rosterdatelast_dte = lastof_lastmonth_dte
            elif period_tag == 'nmonth':  # 9: 'Next month'
                firstof_thismonth_dte = f.get_firstof_month(today_dte)
                firstof_nextmonth_dte = f.add_month_to_firstof_month(firstof_thismonth_dte, 1)
                lastof_nextmonth_dte = f.get_lastof_month(firstof_nextmonth_dte)
                rosterdatefirst_dte = firstof_nextmonth_dte
                rosterdatelast_dte = lastof_nextmonth_dte
            elif period_tag == 'other':  # 10: 'Custom period'
                # if one date blank: use other date, if both blank: use today
                if periodstart is None:
                    if periodend is None:
                        periodstart = today_iso
                        periodend = today_iso
                    else:
                        periodstart = periodend
                else:
                    if periodend is None:
                        periodend = periodstart
                rosterdatefirst_dte = f.get_dateobj_from_dateISOstring(periodstart)
                rosterdatelast_dte = f.get_dateobj_from_dateISOstring(periodend)

            periodstart_datetimelocal = f.get_datetimelocal_from_offset(rosterdatefirst_dte, offset_firstdate, comp_timezone)
            periodend_datetimelocal = f.get_datetimelocal_from_offset(rosterdatelast_dte, offset_lastdate, comp_timezone)

        else:
            periodstart_datetimelocal = now_usercomp_dtm - timedelta(minutes=extend_offset)
            periodend_datetimelocal = now_usercomp_dtm + timedelta(minutes=extend_offset)

        rosterdatefirst_minus1 = rosterdatefirst_dte - timedelta(days=1)
        rosterdatelast_plus1 = rosterdatelast_dte + timedelta(days=1)

        update_dict['periodstart'] = periodstart_datetimelocal
        update_dict['periodend'] = periodend_datetimelocal
        update_dict['rosterdatefirst'] = rosterdatefirst_dte.isoformat()
        update_dict['rosterdatelast'] = rosterdatelast_dte.isoformat()
        update_dict['rosterdatefirst_minus1'] = rosterdatefirst_minus1.isoformat()
        update_dict['rosterdatelast_plus1'] = rosterdatelast_plus1.isoformat()

    # logger.debug('update_dict: ' + str(update_dict))
    #  update_dict: {'period_index': 6, 'extend_index': 4, 'extend_offset': 360,
    #  'now': [2019, 11, 17, 7, 58],
    #  'periodstart': datetime.datetime(2019, 11, 17, 18, 0, tzinfo=<DstTzInfo 'Europe/Amsterdam' CET+1:00:00 STD>),
    #  'periodend': datetime.datetime(2019, 11, 19, 6, 0, tzinfo=<DstTzInfo 'Europe/Amsterdam' CET+1:00:00 STD>),
    #  'rosterdatefirst': '2019-11-17', 'rosterdatelast': '2019-11-19'}

    return update_dict

def create_emplhour_list(period_dict, company, comp_timezone): # PR2019-11-16
    # logger.debug(' ============= create_emplhour_list ============= ')

    periodstart_datetimelocal = period_dict.get('periodstart')
    periodend_datetimelocal = period_dict.get('periodend')
    rosterdatefirst = period_dict.get('rosterdatefirst')
    rosterdatelast = period_dict.get('rosterdatelast')
    rosterdatefirst_minus1 = period_dict.get('rosterdatefirst_minus1')
    rosterdatelast_plus1 = period_dict.get('rosterdatelast_plus1')

    starttime = timer()

    # Exclude template.

#$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    company_id = company.pk
    customer_id = None
    order_id = None
    employee_id = None

# show emplhour records with :
    # LEFT JOIN employee (also records without employee are shown)
    # - this company
    # - this customer if not blank
    # - this order if not blank
    # - this employee if not blank
    # - this rosterdate
    # - within time range
    #   NOTE: don't forget to add also: emplhourtimestart/end IS NULL OR periodtimestart/end IS NULL

    # Note: filter also on min max rosterdate, in case timestart / end is null

    # Note: when emplhourtimestart is blank filter on rosterdatefirst instead of rosterdatefirst_minus1
    # AND (eh.rosterdate >= %(rdfm1)s)  AND (eh.rosterdate <= %(rdlp1)s)
    # instead:
    # AND CASE WHEN eh.timestart IS NULL THEN (eh.rosterdate >= %(rdf)s) ELSE (eh.rosterdate >= %(rdfm1)s) END
    # AND CASE WHEN eh.timeend IS NULL THEN (eh.rosterdate <= %(rdl)s) ELSE (eh.rosterdate <= %(rdlp1)s) END

    newcursor = connection.cursor()
    newcursor.execute("""
        SELECT eh.id AS eh_id, oh.id AS oh_id, o.id AS o_id, eh.rosterdate AS eh_rd, eh.shift AS eh_sh, 
        eh.timestart AS eh_ts, eh.timeend AS eh_te, eh.status AS eh_st, eh.overlap AS eh_ov,
        eh.breakduration AS eh_bd, eh.timeduration AS eh_td, eh.plannedduration AS eh_pd, 
        c.code AS c_code, o.code AS o_code, 
        e.id AS e_id, e.code AS e_code
        FROM companies_emplhour AS eh 
        LEFT JOIN companies_employee AS e ON (eh.employee_id = e.id)
        INNER JOIN companies_orderhour AS oh ON (eh.orderhour_id = oh.id) 
        INNER JOIN companies_order AS o ON (oh.order_id = o.id) 
        INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
        WHERE (c.company_id = %(cid)s) 
        AND (c.id = %(cust_id)s OR %(cust_id)s IS NULL)
        AND (o.id = %(ord_id)s OR %(ord_id)s IS NULL)
        AND (eh.employee_id = %(empl_id)s OR %(empl_id)s IS NULL)
        AND CASE WHEN eh.timestart IS NULL THEN (eh.rosterdate >= %(rdf)s) ELSE (eh.rosterdate >= %(rdfm1)s) END
        AND CASE WHEN eh.timeend IS NULL THEN (eh.rosterdate <= %(rdl)s) ELSE (eh.rosterdate <= %(rdlp1)s) END 
        AND (eh.timestart < %(pte)s OR eh.timestart IS NULL OR %(pte)s IS NULL)
        AND (eh.timeend > %(pts)s OR eh.timeend IS NULL OR %(pts)s IS NULL)
        ORDER BY eh.rosterdate ASC, eh.timestart ASC, LOWER(c.code) ASC, LOWER(o.code) ASC
            """, {
                'cid': company_id,
                'cust_id': customer_id,
                'ord_id': order_id,
                'empl_id': employee_id,
                'rdf': rosterdatefirst,
                'rdl': rosterdatelast,
                'rdfm1': rosterdatefirst_minus1,
                'rdlp1': rosterdatelast_plus1,
                'pts': periodstart_datetimelocal,
                'pte': periodend_datetimelocal
                })

    # logger.debug("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")

    # logger.debug("rosterdatefirst_minus1: " + str(rosterdatefirst_minus1))
    # logger.debug("rosterdatelast_plus1: " + str(rosterdatelast_plus1))
    # logger.debug("periodstart_datetimelocal: " + str(periodstart_datetimelocal))
    # logger.debug("periodend_datetimelocal: " + str(periodend_datetimelocal))

    emplhours_rows = f.dictfetchall(newcursor)
    # dictfetchall returns a list with dicts for each emplhour row
    # emplhours_rows:  [ {'eh_id': 4504, 'eh_rd': datetime.date(2019, 11, 14), 'c_code': 'MCB', 'o_code': 'Punda', 'e_code': 'Bernardus-Cornelis, Yaha'},

    # FIELDS_EMPLHOUR = ('id', 'orderhour', 'rosterdate', 'cat', 'employee', 'shift',
    #                         'timestart', 'timeend', 'timeduration', 'breakduration',
    #                         'wagerate', 'wagefactor', 'wage', 'status', 'overlap')
    field_tuple = c.FIELDS_EMPLHOUR

    emplhour_list = []
    for row in emplhours_rows:
        # logger.debug("row: " + str(row))
        item_dict = {}
#>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# --- start of create_emplhour_itemdict

        # get pk and ppk
        pk_int = row.get('eh_id') # emplhour.id
        ppk_int = row.get('oh_id')  # orderhour.id

        rosterdate = row.get('eh_rd')  # instance.rosterdate
        timestart = row.get('eh_ts')  # instance.timestart
        timeend = row.get('eh_te')  # instance.timeend
        overlap = row.get('eh_ov')  # instance.overlap if instance.overlap else 0

        # lock field when status = locked or higher
        status_sum = row.get('eh_st')  # instance.status
        status_conf_start = f.get_status_value(status_sum, 1)
        status_conf_end = f.get_status_value(status_sum, 2)
        status_locked = (status_sum >= c.STATUS_08_LOCKED)

        fields = ('id', 'orderhour', 'employee', 'rosterdate', 'cat',
                           'yearindex', 'monthindex', 'weekindex', 'payperiodindex',
                           'isrestshift', 'shift',
                           'timestart', 'timeend', 'timeduration', 'breakduration', 'plannedduration',)

        fields = ('id', 'orderhour', 'employee', 'rosterdate', 'cat',
                           'yearindex', 'monthindex', 'weekindex', 'payperiodindex',
                           'isrestshift', 'shift',
                           'timestart', 'timeend', 'timeduration', 'breakduration', 'plannedduration',
                             'status', 'overlap', 'locked')
        for field in fields:
            field_dict = {}

            # 2. lock date when locked=true of  timestart and timeend are both confirmed
            if status_locked or (status_conf_start and status_conf_end):
                field_dict['locked'] = True
            elif field in ('timestart', 'employee')and status_conf_start:
                field_dict['locked'] = True
            elif field == 'timeend'and status_conf_end:
                field_dict['locked'] = True

            if field == 'id':
                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int
                field_dict['table'] = 'emplhour'
                item_dict['pk'] = pk_int

            # orderhour is parent of emplhour
            elif field == 'orderhour':
                field_dict['pk'] = ppk_int
                field_dict['ppk'] = row.get('o_id')   # order.id
                field_dict['value'] = ' - '.join([row.get('c_code'), row.get('o_code')])

            elif field == 'employee':
                e_id = row.get('e_id')
                if e_id is not None:
                    # if employee_id does not exist in row, it returns 'None'. Therefore default value 0 does not work
                    field_dict['pk'] = e_id  # employee.id
                    field_dict['ppk'] = company_id
                    field_dict['value'] = row.get('e_code', '')
                    #  make field red when has overlap
                    if overlap:  # overlap: 1 overlap start, 2 overlap end, 3 full overlap
                        field_dict['overlap'] = True
                    #  lock field employee when start is confirmed > already locked above

            elif field == 'rosterdate':
                if rosterdate:
                    field_dict['value'] = rosterdate.isoformat()

            # also add date when empty, to add min max date
            elif field in ('timestart', 'timeend'):
                has_overlap = (field == 'timestart' and overlap in (1, 3)) or \
                              (field == 'timeend' and overlap in (2, 3))
                set_fielddict_datetime(field=field,
                                       field_dict=field_dict,
                                       rosterdate=rosterdate,
                                       timestart_utc=timestart,
                                       timeend_utc=timeend,
                                       has_overlap=has_overlap,
                                       comp_timezone=comp_timezone)

            elif field == 'shift':
                eh_sh = row.get('eh_sh')
                if eh_sh:
                    field_dict['value'] = eh_sh

            elif field == 'breakduration':
                eh_bd = row.get('eh_bd')
                if eh_bd:
                    field_dict['value'] = eh_bd

            elif field == 'timeduration':
                eh_td = row.get('eh_td')
                if eh_td:
                    field_dict['value'] = eh_td

            elif field == 'status':
                field_dict['value'] = status_sum
            #else:
               # value = getattr(instance, field)
              #  if value:
                #    field_dict['value'] = value

            item_dict[field] = field_dict

        # --- remove empty attributes from update_dict
        f.remove_empty_attr_from_dict(item_dict)

# --- end of create_emplhour_itemdict
 # >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

        # logger.debug('create_emplhour_itemdict: ' + str(item_dict))
        if item_dict:
            emplhour_list.append(item_dict)

    # logger.debug('list elapsed time  is :')
    # logger.debug(timer() - starttime)

    return emplhour_list

# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

def create_emplhour_itemdict(emplhour, item_dict, comp_timezone):  # PR2019-09-21
    # --- create dict of this emplhour PR2019-10-11
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    # logger.debug(' ============= create_emplhour_dict ============= ')
    # logger.debug(str(update_dict))

    if emplhour:
        #  FIELDS_EMPLHOUR = ('id', 'orderhour', 'rosterdate', 'cat', 'employee', 'shift',
        #                'timestart', 'timeend', 'timeduration', 'breakduration',
        #                'wagerate', 'wagefactor', 'wage', 'status', 'overlap')


# get pk and ppk
        pk_int = emplhour.pk
        ppk_int = emplhour.orderhour.pk

        rosterdate = emplhour.rosterdate
        timestart = emplhour.timestart
        timeend = emplhour.timeend
        overlap = emplhour.overlap if emplhour.overlap else 0

# lock field when status = locked or higher
        status_value = getattr(emplhour, 'status', 0)
        locked = (status_value >= c.STATUS_08_LOCKED)

        for field in c.FIELDS_EMPLHOUR:

# --- get field_dict from  item_dict  if it exists
            field_dict = item_dict[field] if field in item_dict else {}

# 2. lock date when confirmed, field is already locked when locked = True
            if locked:
                field_dict['locked'] = True
            else:
                status_check = c.STATUS_02_START_CONFIRMED if field == 'timestart' else c.STATUS_04_END_CONFIRMED
                if status_found_in_statussum(status_check, status_value):
                    field_dict['locked'] = True

            if field == 'id':
                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int
                field_dict['table'] = 'emplhour'
                if emplhour.isabsence:
                    field_dict['isabsence'] = True

                item_dict['pk'] = pk_int

            # orderhour is parent of emplhour
            elif field == 'orderhour':
                orderhour = emplhour.orderhour
                if orderhour:
                    field_dict['pk'] = ppk_int
                    field_dict['ppk'] = orderhour.order.pk
                    cust_code = ''
                    order_code = ''
                    order = orderhour.order
                    if order:
                        if order.code:
                            order_code = order.code
                        customer = order.customer
                        if customer.code:
                            cust_code =  customer.code
                    field_dict['value'] = ' - '.join([cust_code, order_code])

            elif field == 'employee':
                employee = emplhour.employee
                if employee:

                    # if employee_id does not exist in row, it returns 'None'. Therefore default value 0 does not work
                    employee_pk = employee.pk

                    field_dict['pk'] = employee.pk
                    field_dict['ppk'] = employee.company.pk
                    field_dict['value'] = employee.code if employee.code else ''
                    #  make field red when has overlap
                    if overlap: # overlap: 1 overlap start, 2 overlap end, 3 full overlap
                        field_dict['overlap'] = True
                    #  lock field employee when start is confirmed
                    if status_value >= c.STATUS_02_START_CONFIRMED:
                        field_dict['locked'] = True

            elif field == 'rosterdate':
                if rosterdate:
                    field_dict['value'] = rosterdate.isoformat()

            # also add date when empty, to add min max date
            elif field in ('timestart', 'timeend'):
                has_overlap = (field == 'timestart' and overlap in (1,3)) or \
                              (field == 'timeend' and overlap in (2,3))
                set_fielddict_datetime(field=field,
                                       field_dict=field_dict,
                                       rosterdate=rosterdate,
                                       timestart_utc=timestart,
                                       timeend_utc=timeend,
                                       has_overlap=has_overlap,
                                       comp_timezone=comp_timezone)

            elif field == 'overlap':
                pass

            else:
                value = getattr(emplhour, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

# --- remove empty attributes from update_dict
        f.remove_empty_attr_from_dict(item_dict)

# --- end of create_emplhour_itemdict
# @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

def create_emplhour_dict(update_dict, comp_timezone):
    # logger.debug ('--- create_emplhour_dict ---')
    # logger.debug ('update_dict: ' + str(update_dict))
    # update_dict: {'id': {'ppk': 3145, 'table': 'emplhour', 'pk': 3625},
    # 'orderhour': {}, 'rosterdate': {}, 'cat': {},
    # 'employee': {'updated': True, 'value': 'Windster L I L', 'pk': 269},
    # 'shift': {}, 'timestart': {}, 'timeend': {}, 'timeduration': {}, 'breakduration': {},
    # 'wagerate': {}, 'wagefactor': {}, 'wage': {}, 'status': {}, 'overlap': {}, 'pk': 3625}

    item_dict = {}
    id_dict = update_dict.get('id')
    if 'id' in update_dict:
        pk_int = id_dict.get('pk',0)
        # logger.debug ('pk_int' + str(pk_int) + ' ' + str(type(pk_int)))

        if pk_int:
            row_dict = m.Emplhour.objects\
                .select_related('employee')\
                .select_related('orderhour')\
                .select_related('orderhour__order')\
                .select_related('orderhour__order__customer')\
                .select_related('orderhour__order__customer__company')\
                .filter(id=pk_int)\
                .values('id', 'cat', 'status', 'overlap', 'shift', 'wagerate', 'wagefactor', 'wage',
                        'employee_id', 'employee__company_id', 'employee__code',
                        'rosterdate', 'timestart', 'timeend', 'breakduration', 'timeduration',
                        'orderhour_id', 'orderhour__order_id', 'orderhour__order__code', 'orderhour__order__customer__code'
                        )\
                .first()

            create_emplhour_itemdict(row_dict, update_dict, c.FIELDS_EMPLHOUR, comp_timezone)


def create_emplhour_dictOLD(instance, item_dict, comp_timezone):
    # --- create dict of this emplhour PR2019-09-02
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    #logger.debug ('--- create_emplhour_dict ---')
    #logger.debug ('item_dict' + str(item_dict))

    # FIELDS_EMPLHOUR = ('id', 'orderhour', 'rosterdate', 'cat', 'employee', 'shift',
    #                    'timestart', 'timeend', 'timeduration', 'breakduration',
    #                    'wagerate', 'wagefactor', 'wage', 'status')
    field_tuple = c.FIELDS_EMPLHOUR

    if instance:
# lock field when status = locked or higher
        status_value = instance.status
        locked = (status_value >= c.STATUS_08_LOCKED)

# get pk and ppk
        pk_int = instance.id
        ppk_int = instance.orderhour.id


        table = 'emplhour'
        for field in field_tuple:
# 1. get or create field_dict
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict = {}

# 2. lock date when confirmed, field is already locked when locked = True
            if locked:
                item_dict[field]['locked'] = True
            else:
                status_check = c.STATUS_02_START_CONFIRMED if field == 'timestart' else c.STATUS_04_END_CONFIRMED
                if status_found_in_statussum(status_check, status_value):
                    item_dict[field]['locked'] = True

# 3. create pk, ppk, table keys
            if field == 'id':
                item_dict['pk'] = pk_int
                item_dict['ppk'] = ppk_int

                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int
                field_dict['cat'] = instance.cat  # required, default = 0
                field_dict['table'] = table

            # orderhour is parent of emplhour
            elif field == 'orderhour':
                if instance.orderhour:
                    orderhour = instance.orderhour
                    field_dict['pk'] = orderhour.pk
                    field_dict['ppk'] = orderhour.order_id

                    order_code = ''
                    cust_code = ''
                    order = orderhour.order
                    if order:
                        if order.code:
                            order_code = order.code
                        customer = order.customer
                        if customer:
                            if customer.code:
                                cust_code = customer.code
                        field_dict['value'] = ' - '.join([cust_code, order_code])

            elif field == 'employee':
                employee = instance.employee
                if employee:
                    field_dict['pk'] = employee.pk
                    field_dict['ppk'] = employee.company_id
                    if employee.code:
                        field_dict['value'] = employee.code

            elif field == 'rosterdate':
                if instance.rosterdate:
                    field_dict['value'] = instance.rosterdate.isoformat()

            # also add date when empty, to add min max date
            elif field in ('timestart', 'timeend'):
                # TODO calculate overlap
                has_overlap = False
                set_fielddict_datetime(field=field,
                                       field_dict=field_dict,
                                       rosterdate=instance.rosterdate,
                                       timestart_utc=instance.timestart,
                                       timeend_utc=instance.timeend,
                                       has_overlap=has_overlap,
                                       comp_timezone=comp_timezone)

            # also zero when empty
            elif field in ('breakduration', 'timeduration', 'wagerate', 'wagefactor', 'wage'):
                field_dict['value'] = getattr(instance, field, 0)

            else:
                value = getattr(instance, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

# --- remove empty attributes from update_dict > is called outside this function
        #f.remove_empty_attr_from_dict(item_dict)

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
        replacement_period = m.Companysetting.get_setting(
            key_str=c.KEY_COMP_REPLACEMENT_PERIOD,
            company=company,
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

                # create_schemeitem_dict(table_dict, company, comp_timezone, user_lang)
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
                        if emplhour.shift:
                            cust_order_shift += ' - ' + emplhour.shift
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
                logger.debug('teammember.pk: ' + str(teammember.pk))
                # if teammember.employee:
                    # logger.debug('teammember.employee: ' + str(teammember.employee.code))

                item_dict = {}                # check if teammemember is the first teammember
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
                                # create_schemeitem_dict(table_dict, company, comp_timezone, user_lang)

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

    return_dict = {'replacement': True} # just to make dict not empty
    if rosterdate_list:
        return_dict['replacement_dates'] = rosterdate_list
    if replacementshift_list:
        return_dict['replacement_list'] = replacementshift_list
    return return_dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_review_list(period_dict, company, comp_timezone):  # PR2019-08-20
    # create list of shifts of this order PR2019-08-08
    # logger.debug(' --- create_review_list --- ')
    # logger.debug('datefirst:  ' + str(datefirst) + ' datelast:  ' + str(datelast))


    review_list = []
    if company:
        logger.debug(' ============= create_emplhour_list ============= ')

        rosterdatefirst = period_dict.get('rosterdatefirst')
        rosterdatelast = period_dict.get('rosterdatelast')

        # logger.debug(emplhours.query)
        # from django.db import connection
        # logger.debug(connection.queries)
        if rosterdatefirst is None:
            rosterdatefirst = '1900-01-01'
        if rosterdatelast is None:
            rosterdatelast = '2500-01-01'
        cursor = connection.cursor()
        # fields in review_list:
        #  0: oh.id, 1: o.id, 2: c.id, 3: rosterdate_json, 4: yearindex, 5: monthindex 6: weekindex, 7: payperiodindex,
        #  8: cust_code, 9: order_code, 10: order_cat, 11: shift
        #  12: oh_duration, 13: oh.billable, 14: oh.pricerate, 15: oh.amount, 16: oh.tax,
        #  17: eh_id_arr, 18: eh_dur_sum, 19: eh_wage_sum,
        #  20: e_id_arr, 21: e_code_arr, 22: eh_duration_arr,
        #  23: eh_wage_arr, 24: eh_wagerate_arr, 25: eh_wagefactor_arr.  26: diff
#  case when oh.duration>0 then oh.duration-eh_sub.e_dur else 0 end as diff

        orderby_cust_code = 1  # index of ordered column
        orderby_ord_code = 2
        orderby_e_code_arr = 3
        orderby_oh_rosterdate = 4
        # don't show rest shifts)
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
        show_restshifts = False
        cursor.execute("""WITH eh_sub AS (SELECT eh.orderhour_id AS oh_id, 
                                                ARRAY_AGG(eh.id) AS eh_id,
                                                ARRAY_AGG(eh.employee_id) AS e_id,
                                                COALESCE(STRING_AGG(DISTINCT e.code, '; '),'-') AS e_code,
                                                ARRAY_AGG(eh.timeduration) AS e_dur,
                                                ARRAY_AGG(eh.wage) AS e_wage,
                                                ARRAY_AGG(eh.wagerate) AS e_wr,
                                                ARRAY_AGG(eh.wagefactor) AS e_wf,
                                                SUM(eh.timeduration) AS eh_dur, 
                                                SUM(eh.wage) AS eh_wage  
                                                FROM companies_emplhour AS eh
                                                LEFT OUTER JOIN companies_employee AS e ON (eh.employee_id=e.id) 
                                                GROUP BY oh_id) 
                                       SELECT COALESCE(c.code,'-') AS cust_code,  COALESCE(o.code,'-') AS ord_code,
                                       eh_sub.e_code AS e_code_arr, oh.rosterdate AS oh_rd, to_json(oh.rosterdate) AS rosterdate, 
                                       oh.id AS oh_id, o.id AS ord_id, c.id AS cust_id, 
                                       oh.yearindex AS yi, oh.monthindex AS mi, oh.weekindex AS wi, oh.payperiodindex AS pi,              
                                       o.isabsence as o_isabs, COALESCE(oh.shift,'-') AS oh_shift, 
                                       oh.duration AS oh_dur, oh.isbillable AS oh_bill, oh.pricerate AS oh_prrate, 
                                       oh.amount AS oh_amount, oh.tax AS oh_tax, 
                                       eh_sub.eh_id AS eh_id_arr, eh_sub.eh_dur AS eh_dur, eh_sub.eh_wage AS eh_wage, 
                                       eh_sub.e_id AS e_id, eh_sub.e_dur AS e_dur, 
                                       eh_sub.e_wage AS e_wage, eh_sub.e_wr AS e_wr, eh_sub.e_wf AS e_wf, 
                                       case when o.isabsence = FALSE then oh.duration-eh_sub.eh_dur else 0 end as dur_diff  
                                       FROM companies_orderhour AS oh
                                       INNER JOIN eh_sub ON (eh_sub.oh_id=oh.id)
                                       INNER JOIN companies_order AS o ON (oh.order_id=o.id)
                                       INNER JOIN companies_customer AS c ON (o.customer_id=c.id)
                                       WHERE (c.company_id = %(cid)s) 
                                       AND (oh.rosterdate IS NOT NULL) 
                                       AND (oh.rosterdate >= %(df)s)
                                       AND (oh.rosterdate <= %(dl)s)
                                       AND (oh.isrestshift = FALSE) 
                                        ORDER BY %(order1)s ASC, %(order2)s ASC, %(order3)s ASC, %(order4)s ASC""",
                                       {'cat': c.SHIFT_CAT_0512_ABSENCE,
                                        'cid': company.id,
                                        'df': rosterdatefirst,
                                        'dl': rosterdatelast,
                                        'order1': orderby_cust_code,
                                        'order2': orderby_ord_code,
                                        'order3': orderby_oh_rosterdate,
                                        'order4': orderby_e_code_arr
                                        })
#                                        ORDER BY c_code ASC, o_code ASC, oh.rosterdate ASC""",
#                                          WHERE (c.company_id = %s)
        #                                        AND (oh.rosterdate IS NOT NULL)
        #                                        AND (oh.rosterdate >= %s)
        #                                        AND (oh.rosterdate <= %s)


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
                        WHERE c.company_id = %(cid)s)     
        UPDATE companies_emplhour AS eh
        SET overlap = 0
        FROM oh_sub 
        WHERE (eh.orderhour_id = oh_sub.oh_id)
        AND (eh.overlap IS NOT NULL) 
        AND (eh.rosterdate >= %(df)s)
        AND (eh.rosterdate <= %(dl)s)""", {'cid': request.user.company_id, 'df': datefirst, 'dl': datelast})

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
    #        logger.debug('test employee: ' + str(employee) + ' datefirst: ' + str(member.datefirst) + ' datelast: ' + str(member.datelast))

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
        WHERE (c.company_id = %(cid)s) 
            AND (eh.employee_id IS NOT NULL) 
            AND (eh.rosterdate IS NOT NULL) 
            AND (eh.rosterdate >= %(df)s)
            AND (eh.rosterdate <= %(dl)s)
        GROUP BY empl_id
        HAVING COUNT(eh.id) > 1""",
        {'cid': request.user.company_id, 'df': datefirst_extended, 'dl': datelast_extended})
    employee_list = cursor.fetchall()
    # logger.debug('employee_list: ' + str(employee_list) + ' ' + str(type(employee_list)))
    # employee_list: [(393,), (155,), (363,), (1252,), (265,), (281,), (1352,)] <class 'list'>

# 4. loop through list of employees with multiple emplhours
    for item in employee_list:
        employee_id = item[0]
        # logger.debug('employee_id: ' + str(employee_id) + ' ' + str(type(employee_id)))

        # eplh_update_list not in use in check_overlapping_shifts
        eplh_update_list = []
        update_overlap(employee_id, datefirst, datelast, datefirst_extended, datelast_extended, request, eplh_update_list)


# @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
def update_emplhour_overlap(employee_id, rosterdate, request, eplh_update_list):  # PR2019-09-21
    logger.debug('--- update_emplhour_overlap --- ' + str(employee_id))
    logger.debug('rosterdate' + str(rosterdate) + ' ' + str(type(rosterdate)))
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

    logger.debug('eplh_update_list: ' + str(eplh_update_list))


def update_overlap(employee_id, datefirst, datelast, datefirst_extended, datelast_extended, request, eplh_update_list):  # PR2019-09-21
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
    #        logger.debug('test employee: ' + str(employee) + ' datefirst: ' + str(member.datefirst) + ' datelast: ' + str(member.datelast))


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
        ).\
        filter(crit).\
        values('id', 'timestart_nonull', 'timeend_nonull').\
        order_by('id')
    # logger.debug(str(emplhours_extended.query))
    # logger.debug(str(emplhours_extended))

# 5. loop through narrow queryset
    for emplhour in emplhours:
        # logger.debug(str(emplhour.employee.code) + ' ' + str(emplhour.shift)  + ' ' + str(emplhour.rosterdate))

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
                elif a < x < b <= y:    #  a < x and b > x and b <= y:
                    # logger.debug(' overlap_start (a < x and b > x and b <= y)')
                    overlap_start = 1
                elif  x <= a < y < b:   #  a >= x and a < y and b > y:
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

def get_rosterdatefill_dict(rosterdate_fill_dte, company):  # PR2019-11-12
    rosterdate_dict = {}
    # count added orderhours
    row_count = m.Orderhour.objects.filter(
        order__customer__company=company,
        rosterdate=rosterdate_fill_dte.isoformat()
    ).count()
    rosterdate_dict['row_count'] = row_count
    rosterdate_dict['rosterdate'] = rosterdate_fill_dte.isoformat()

    return rosterdate_dict


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def set_fielddict_datetime(field, field_dict, rosterdate, timestart_utc, timeend_utc, has_overlap, comp_timezone):
    # logger.debug(" ")
    # logger.debug(" ------- set_fielddict_datetime ---------- ")
    # logger.debug("rosterdate " + str(rosterdate) + ' ' + str(type(rosterdate)))
    # logger.debug("timestart_utc " + str(timestart_utc) + ' ' + str(type(timestart_utc)))
    # logger.debug("timeend_utc " + str(timeend_utc) + ' ' + str(type(timeend_utc)))
    # logger.debug("comp_timezone " + str(comp_timezone) + ' ' + str(type(comp_timezone)))

    timezone = pytz.timezone(comp_timezone)

    # get mindatetime and  maxdatetime
    min_datetime_utc, max_datetime_utc = get_minmax_datetime_utc(field, rosterdate,
                                                                 timestart_utc, timeend_utc, comp_timezone)

    min_offset_int = None
    if min_datetime_utc:
        min_datetime_local = min_datetime_utc.astimezone(timezone)
        min_offset_int = f.get_offset_from_datetimelocal(rosterdate, min_datetime_local)
        # logger.debug("min_datetime_utc " + str(min_datetime_utc) + ' ' + str(type(min_datetime_utc)))
        #  logger.debug("min_datetime_local " + str(min_datetime_local) + ' ' + str(type(min_datetime_local)))
        # logger.debug("min_offset_int " + str(min_offset_int) + ' ' + str(type(min_offset_int)))

    max_offset_int = None
    if max_datetime_utc:
        max_datetime_local = max_datetime_utc.astimezone(timezone)
        max_offset_int = f.get_offset_from_datetimelocal(rosterdate, max_datetime_local)
        # logger.debug("rosterdate " + str(rosterdate) + ' ' + str(type(rosterdate)))
        # logger.debug("max_datetime_utc " + str(max_datetime_utc) + ' ' + str(type(max_datetime_utc)))
        # logger.debug("max_datetime_local " + str(max_datetime_local) + ' ' + str(type(max_datetime_local)))
        # logger.debug("max_offset_int " + str(max_offset_int) + ' ' + str(type(max_offset_int)))

    field_dict['field'] = field

    datetime_utc = None
    offset_int = None
    if field == "timestart":
        datetime_utc = timestart_utc
        if datetime_utc:
            datetime_local = datetime_utc.astimezone(timezone)
            offset_int = f.get_offset_from_datetimelocal(rosterdate, datetime_local)

            # logger.debug("datetime_utc.isoformat() " + str(datetime_utc.isoformat()) + ' ' + str(type(datetime_utc.isoformat())))
            # logger.debug("datetime_local " + str(datetime_local) + ' ' + str(type(datetime_local)))
            # logger.debug("offset_int " + str(offset_int) + ' ' + str(type(offset_int)))

    elif field == "timeend":
        datetime_utc = timeend_utc
        if datetime_utc:
            datetime_local = datetime_utc.astimezone(timezone)
            offset_int = f.get_offset_from_datetimelocal(rosterdate, datetime_local)

            # logger.debug("datetime_utc.isoformat() " + str(datetime_utc.isoformat()) + ' ' + str(type(datetime_utc.isoformat())))
            # logger.debug("datetime_local " + str(datetime_local) + ' ' + str(type(datetime_local)))
            # logger.debug("offset_int " + str(offset_int) + ' ' + str(type(offset_int)))

    if offset_int is not None:
        field_dict['offset'] = offset_int

    if min_offset_int is not None:
        field_dict['minoffset'] = min_offset_int

    if max_offset_int is not None:
        field_dict['maxoffset'] = max_offset_int

    if datetime_utc:
        field_dict['datetime'] = datetime_utc.isoformat()
    if min_datetime_utc:
        field_dict['mindatetime'] = min_datetime_utc.isoformat()
    if max_datetime_utc:
        field_dict['maxdatetime'] = max_datetime_utc.isoformat()
    if rosterdate:
        field_dict['rosterdate'] = rosterdate
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


def get_rosterdate_midnight_local(rosterdate_utc, comp_timezone): # PR2019-07-09
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
        comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

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
        logger.debug('interval_starttime_local: ' + str(interval_starttime_local))

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
        #logger.debug("datetime_midnight_naive: " + str(datetime_naive) + str(type(datetime_naive)))

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
        #logger.debug("rosterdate_midnight_naive: " + str(rosterdate_naive) + str(type(rosterdate_naive)))

        # localize can only be used with naive datetime objects. It does not change the datetime, olny adds tzinfo
        rosterdate_utc = pytz.utc.localize(rosterdate_naive)
        # rosterdate_utc: 2019-06-23 00:00:00+00:00
        # logger.debug("rosterdate_utc: " + str(rosterdate_utc))

    return rosterdate_utc

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# TODO not in use
def get_rosterdate_current(company): # PR2019-06-16
#get next rosterdate from companysetting
    rd_cur_str = m.Companysetting.get_setting(c.KEY_COMP_ROSTERDATE_CURRENT, company)
    rosterdate, msg_err = f.get_date_from_ISOstring(rd_cur_str)

    # logger.debug('rosterdate: ' + str(rosterdate) + ' type: ' + str(type(rosterdate)))
# if no date found in settings: get first rosterdate of all schemitems of company PR2019-06-07
    if rosterdate is None:
        schemeitem = m.Schemeitem.objects.filter(scheme__order__customer__company=company).first()
        if schemeitem:
            rosterdate = schemeitem.rosterdate
    if rosterdate is None:
        rosterdate = date.today()
    return rosterdate


def get_rosterdate_next(company): # PR2019-06-17
    #get current rosterdate from companysetting and add one day
    rosterdate_current = get_rosterdate_current(company)
    rosterdate_next = rosterdate_current + timedelta(days=1)
    return rosterdate_next


def get_rosterdate_previous(company): # PR2019-06-17
    #get current rosterdate from companysetting and add one day
    rosterdate_current = get_rosterdate_current(company)
    rosterdate_previous = rosterdate_current + timedelta(days=-1)
    return rosterdate_previous


def get_customer_order_code(order, delim=' '): # PR2019-08-16
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
        teammembers = m.Teammember.objects\
            .select_related('employee')\
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
            count +=1
    suffix = ''
    if count == 0:
        suffix = ' (-)'
    elif count > 1:
        suffix = ' (' + str(count) + ')'

    return team.code, suffix, team_title
