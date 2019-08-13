from django.db.models import Q, Count
from django.db.models.functions import Lower, Coalesce

from datetime import date, datetime, timedelta
from timeit import default_timer as timer

from accounts.models import Usersetting
from companies.models import Order, Scheme, Shift, Team, Schemeitem, Emplhour, Companysetting

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
    # ststus = 0 gives always True
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
        today = get_today(request)
        new_period_dict['today'] = today

        period_dict_json = json.dumps(new_period_dict)  # dumps takes an object and produces a string:
        Usersetting.set_setting(c.KEY_USER_EMPLHOUR_PERIOD, period_dict_json, request.user)

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
        datetime_end_plus_one = f.get_datetime_naive_from_date(date_end_plus_one)
        datetime_end = datetime_end_plus_one + timedelta(days=-1)
        range_end_date = datetime_end.date()

    elif day_add > 0:
        # convert range_timestart_utc to range_timestart_local
        date_start = f.get_date_from_ISOstring(range_startdate_iso)
        datetime_start = f.get_datetime_from_ISOstring(range_startdate_iso)
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
        dict_json = Usersetting.get_setting(c.KEY_USER_EMPLHOUR_PERIOD, request.user)
        if dict_json:
            saved_period_dict = json.loads(dict_json)

# if not found: get period from Companysetting
        else:
            dict_json = Companysetting.get_setting(c.KEY_USER_EMPLHOUR_PERIOD, request.user.company)
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


def get_today(request):  # PR2019-07-14
    # logger.debug(' ============= get_current_period ============= ')
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    date_local_iso = None

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

        date_local = now_local.date()

        date_local_iso = date_local.isoformat()
        # logger.debug('date_local_iso: ' + str(date_local_iso) + ' ' + str(type(date_local_iso)))

    return date_local_iso


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_scheme_template_list(company):
    # --- create list of all template schemes of this company PR2019-07-24
    # logger.debug("========== create_scheme_template_list ==== ")

    scheme_list = []
    order = Order.objects.get_or_none(cat=c.CAT_04_TEMPLATE, customer__company=company)

    if order:
        scheme_list = create_scheme_list(order, cat=c.CAT_04_TEMPLATE)

    return scheme_list


def create_scheme_list(order, include_inactive=False, cat=c.CAT_00_NORMAL):
# --- create list of all /  active schemes of this company PR2019-06-16
    #logger.debug("========== create_scheme_list ==== order: " + str(order))
    #logger.debug("include_inactive: " + str(include_inactive))
    scheme_list = []
    if order:
        crit = Q(order=order) & Q(cat=cat)

        if not include_inactive:
            crit.add(Q(inactive=False), crit.connector)
        schemes = Scheme.objects.filter(order=order).order_by(Lower('code'))

        for scheme in schemes:
            #logger.debug("scheme: " + str(scheme))
            item_dict = {}
            create_scheme_dict(scheme, item_dict)
            scheme_list.append(item_dict)
            #logger.debug(item_dict)

    return scheme_list

def create_scheme_dict(instance, item_dict):
    # --- create dict of this scheme PR2019-07-21
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_scheme_dict ---')

    field_tuple = ('code', 'cat', 'cycle', 'datefirst', 'datelast', 'excludeweekend', 'excludepublicholiday', 'inactive')

    if instance:
        item_dict['pk'] = instance.pk

        id_dict = item_dict['id'] if 'id' in item_dict else {}
        id_dict['pk'] = instance.pk
        id_dict['ppk'] = instance.order.pk
        id_dict['table'] = 'scheme'
        item_dict['id'] = id_dict

        for field in field_tuple:

            #item_dict[field]{'error': 'Code moet ingevuld zijn.', 'value': 'weekend33'}
            # logger.debug ('field: ' + str(field))
            if field not in item_dict:
                item_dict[field] = {}

            saved_value = getattr(instance, field)
            # also add date when empty, to add min max date
            if field == 'datefirst':
                maxdate = getattr(instance, 'datelast')
                f.set_fielddict_date(dict=item_dict[field], dte=saved_value, maxdate=maxdate)
            elif field == 'datelast':
                mindate = getattr(instance, 'datefirst')
                f.set_fielddict_date(dict=item_dict[field], dte=saved_value, mindate=mindate)
            elif field == 'cycle':
                # 0 must also be passed as value, required field, default = 0
                if not saved_value:
                    saved_value = 0
                item_dict[field]['value'] = saved_value
            else:
                if saved_value is not None:
                    item_dict[field]['value'] = saved_value
                else:
                    item_dict[field].pop('value', None)

# --- remove empty attributes from item_dict
    f.remove_empty_attr_from_dict(item_dict)

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_schemeitem_template_list(company, comp_timezone):
    # --- create list of all template schemes of this company PR2019-07-24
    #logger.debug("========== create_schemeitem_template_list ==== ")

    schemeitem_list = []
    order = Order.objects.get_or_none(cat=c.CAT_04_TEMPLATE, customer__company=company)
    #logger.debug("order: " + str(order))
    if order:
        schemeitem_list = create_schemeitem_list(order, comp_timezone)

    #logger.debug("schemeitem_list " + str(schemeitem_list))
    return schemeitem_list


def create_schemeitem_list(order, comp_timezone):
    # create list of schemeitems of this scheme PR2019-07-20
    # filter datefirst, datelast not in use
    schemeitem_list = []
    if order:
        crit = (Q(scheme__order=order))
        schemeitems = Schemeitem.objects.filter(crit)

        for schemeitem in schemeitems:
            item_dict = {}
            create_schemeitem_dict(schemeitem, item_dict, comp_timezone)
            if item_dict:
                schemeitem_list.append(item_dict)
    return schemeitem_list


def create_schemeitem_dict(instance, item_dict, comp_timezone):
    # --- create dict of this schemeitem PR2019-07-22
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('item_dict' + str(item_dict))

    if instance:
        for field in c.FIELDS_SCHEMEITEM:
            if field not in item_dict:
                item_dict[field] = {}

            saved_value = getattr(instance, field)

            if field == 'pk':
                item_dict[field] = instance.pk

            elif field == 'id':
                id_dict = item_dict[field] if 'id' in item_dict else {}
                id_dict['pk'] = instance.pk
                id_dict['ppk'] = instance.scheme.pk
                id_dict['table'] = 'schemeitem'
                item_dict[field] = id_dict

            elif field == 'rosterdate':
                f.set_fielddict_date(dict=item_dict[field], dte=saved_value)

            elif field in ('shift', 'team'):
                shift_or_team = getattr(instance, field)
                if shift_or_team:
                    item_dict[field]['pk'] = shift_or_team.id
                    item_dict[field]['value'] = shift_or_team.code
                    if field == 'shift':
                        if shift_or_team.cat == 1:
                            item_dict[field]['value_R'] = shift_or_team.code + ' (R)'
                        breakduration = getattr(shift_or_team, 'breakduration', 0)
                        if breakduration:
                            item_dict['breakduration'] = {'value': breakduration}
                else:
                    item_dict[field].pop('pk', None)
                    item_dict[field].pop('value', None)

            # also add date when empty, to add min max date
            elif field in ('timestart', 'timeend'):
                set_fielddict_datetime(field=field,
                                       field_dict=item_dict[field],
                                       rosterdate=getattr(instance, 'rosterdate'),
                                       timestart_utc=getattr(instance, 'timestart'),
                                       timeend_utc=getattr(instance, 'timeend'),
                                       comp_timezone=comp_timezone)

            # also zero when empty
            elif field in ('breakduration', 'timeduration'):
                if saved_value is None:
                    saved_value = 0
                item_dict[field]['value'] = saved_value

            else:
                if saved_value is not None:
                    item_dict[field]['value'] = saved_value
                else:
                    item_dict[field].pop('value', None)
# --- remove empty attributes from item_dict
        f.remove_empty_attr_from_dict(item_dict)


def create_team_list(order):
    # create list of teams of this order PR2019-08-08
    team_list = []
    if order:
        teams = Team.objects.filter(scheme__order=order)
        if teams:
            for team in teams:
                item_dict = {}
                create_team_dict(team, item_dict)
                team_list.append(item_dict)
    return team_list

def create_team_dict(team, item_dict):
    # --- create dict of this team PR2019-08-08
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    table = 'team'
    if team:
        for field in c.FIELDS_TEAM:
# 1. create field_dict if it does not exist
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict ={}
# 2. create field_dict 'pk'
            if field == 'pk':
                field_dict = team.pk
# 3. create field_dict 'id'
            elif field == 'id':
                field_dict['pk'] = team.pk
                field_dict['ppk'] = team.scheme.pk
                field_dict['table'] = table
# 4. create other field_dicts
            elif field == 'code':
                value = getattr(team, field, None)
                if value:
                    field_dict['value'] = value
# 5. add field_dict to item_dict
            item_dict[field] = field_dict
# 6. remove empty attributes from item_dict
    f.remove_empty_attr_from_dict(item_dict)


def create_shift_list(order, comp_timezone):
    # create list of shifts of this order PR2019-08-08
    logger.debug(' --- create_shift_list --- ')
    shift_list = []
    if order:
        # return all shifts of this order

        # was: lookup shifts in schemeitems
        #shifts = Schemeitem.objects.filter(scheme__order=order).\
        #    exclude(shift__exact='').\
        #    exclude(shift__isnull=True).\
        #    values('scheme_id', 'shift', 'offsetstart', 'offsetend', 'breakduration')\
        #    .annotate(count=Count('shift'))\
        #    .order_by(Lower('shift'))

        shifts = Shift.objects.filter(scheme__order=order)
        for shift in shifts:
            item_dict = {}
            create_shift_dict(shift, item_dict)
            shift_list.append(item_dict)
    return shift_list


def create_shift_dict(shift, item_dict):
    # --- create dict of this shift PR2019-08-08
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    logger.debug('create_shift_dict: ', str(item_dict))

    table = 'shift'
    field_tuple = c.FIELDS_SHIFT

    if shift:
        for field in field_tuple:

# 1. create field_dict if it does not exist
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict ={}

# 2. create field_dict 'pk'
            if field == 'pk':
                field_dict = shift.pk

# 3. create field_dict 'id'
            elif field == 'id':
                field_dict['pk'] = shift.pk
                field_dict['ppk'] = shift.scheme.pk
                field_dict['table'] = table

# 4. create field_dict 'cat'
            elif field == 'cat':
                field_dict['value'] = getattr(shift, field, 0)

# 5. create field_dict 'code', 'offsetstart', 'offsetend', 'breakduration'
            elif field in ('code', 'offsetstart', 'offsetend', 'breakduration'):
                value = getattr(shift, field, None)
                if value:
                    field_dict['value'] = value

# 6. create field_dict 'successor'
            elif field == 'successor':
                successor_id = shift.successor_id
                logger.debug('successor_id: ' + str(successor_id))
                successor = getattr(shift, field)
                if successor_id:
                    field_dict['pk'] = successor.pk
                    #if successor.code:
                    #    field_dict['value'] = successor.code

# 6. add field_dict to item_dict
            item_dict[field] = field_dict

# 7. remove empty attributes from item_dict
    f.remove_empty_attr_from_dict(item_dict)
# --- end of create_shift_dict

def create_date_dict(rosterdate, user_lang, status_text):
    dict = None
    if rosterdate:
        dict = {}
        dict['value'] = rosterdate
        dict['wdm'] = f.get_date_WDM_from_dte(rosterdate, user_lang)
        dict['wdmy'] = f.format_WDMY_from_dte(rosterdate, user_lang)
        dict['dmy'] = f.format_DMY_from_dte(rosterdate, user_lang)
        dict['offset'] = f.get_weekdaylist_for_DHM(rosterdate, user_lang)
    if status_text:
        if dict is None:
            dict = {}
        dict[status_text] = True

    return dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_emplhour_list(company, comp_timezone, user_lang,
                         time_min=None, time_max=None,
                         range_start_iso=None, range_end_iso=None, show_all=False): # PR2019-08-01
    logger.debug(' ============= create_emplhour_list ============= ')

    # TODO select_related on queyset
    #  queryset = Courses.objects.filter(published=True).prefetch_related('modules', 'modules__lessons', 'modules__lessons__exercises')
    # TODO filter also on min max rosterdate, in case timestart / end is null
    starttime = timer()

    # convert period_timestart_iso into period_timestart_local
    # logger.debug('period_timestart_utc: ' + str(period_timestart_utc) + ' ' + str(type(period_timestart_utc)))
    # logger.debug('period_timeend_utc: ' + str(period_timeend_utc)+ ' ' + str(type(period_timeend_utc)))

    #date_min = period_timestart_utc.date()
    #date_max = period_timeend_utc.date()



    # convert period_timestart_iso into period_timestart_local
    logger.debug('period_timestart_utc: ' + str(time_min) + ' ' + str(type(time_min)))
    logger.debug('period_timeend_utc: ' + str(time_max)+ ' ' + str(type(time_max)))
    logger.debug('range_start_iso: ' + str(range_start_iso)+ ' ' + str(type(range_start_iso)))
    logger.debug('range_end_iso: ' + str(range_end_iso)+ ' ' + str(type(range_end_iso)))


   # Exclude template. Cat <= 2 (0 = normal, 1 = internal, 2 = absence, 3 = template)
    crit = Q(orderhour__order__customer__company=company) & \
           Q(orderhour__order__cat__lte=c.CAT_03_ABSENCE)

# range overrules period
    if not show_all:
        if range_start_iso or range_end_iso:
            if range_start_iso:
                crit.add(Q(rosterdate__gte=range_start_iso), crit.connector)
            if range_end_iso:
                crit.add(Q(rosterdate__lte=range_end_iso), crit.connector)
        else:
            if time_min:
                crit.add(Q(timeend__gt=time_min) | Q(timeend__isnull=True), crit.connector)
            if time_max:
                crit.add(Q(timestart__lt=time_max) | Q(timestart__isnull=True), crit.connector)

    emplhours = Emplhour.objects.filter(crit)

    #logger.debug(emplhours.query)
    # SELECT ...
    # WHERE ("companies_customer"."company_id" = 1 AND
    # "companies_emplhour"."rosterdate" >= 2019-07-13 AND "companies_emplhour"."rosterdate" <= 2019-07-14 AND
    # ("companies_emplhour"."timestart" <= 2019-07-14 22:00:00+00:00 OR "companies_emplhour"."timestart" IS NULL) AND
    # ("companies_emplhour"."timeend" >= 2019-07-13 22:00:00+00:00 OR "companies_emplhour"."timeend" IS NULL))
    # ORDER BY "companies_emplhour"."rosterdate" ASC, "companies_emplhour"."timestart" ASC

    #logger.debug('sql elapsed time  is :')
    #logger.debug(timer() - starttime)

    emplhour_list = []
    for emplhour in emplhours:
        dict = create_emplhour_dict(emplhour, comp_timezone, user_lang)
        emplhour_list.append(dict)

    #logger.debug('list elapsed time  is :')
    #logger.debug(timer() - starttime)

    return emplhour_list


def create_emplhour_dict(emplhour, comp_timezone, user_lang):
    # logger.debug('----------- create_emplhour_dict ------------------')
    # logger.debug('emplhour: ' + str(emplhour))

    # create dict of this scheme PR2019-06-29
    emplhour_dict = {}
    field_list = ('id', 'rosterdate', 'orderhour', 'shift', 'employee',
                  'timestart', 'timeend', 'breakduration', 'timeduration', 'status')

    for field in field_list:
        emplhour_dict[field] = {}

    if emplhour:
        field = 'id'
        emplhour_dict[field] = {'pk': emplhour.id, 'ppk': emplhour.orderhour.id}

        field = 'rosterdate'
        rosterdate = getattr(emplhour, field)
        if rosterdate:
            emplhour_dict[field] = f.fielddict_date(rosterdate, user_lang)

        field = 'orderhour'
        if emplhour.orderhour:
            # value = ' - '.join([emplhour.orderhour.order.customer.code, emplhour.orderhour.order.code])
            value = emplhour.orderhour.order.customer.code + ' - ' + emplhour.orderhour.order.code
            if value:
                emplhour_dict[field] = {'value': value, 'orderhour_pk':emplhour.orderhour.id, 'order_pk':emplhour.orderhour.order.id}

        field = 'shift'
        if emplhour.shift:
            value = emplhour.shift
            if value:
                emplhour_dict[field] = {'value': value}

        field = 'employee'
        if emplhour.employee:
            value = emplhour.employee.code
            if value:
             emplhour_dict[field] = {'value': value, 'employee_pk':emplhour.employee.id}

        for field in ['timestart', 'timeend']:
            field_dict = {}
            set_fielddict_datetime(field=field,
                                   field_dict=field_dict,
                                   rosterdate=getattr(emplhour, 'rosterdate'),
                                   timestart_utc=getattr(emplhour, 'timestart'),
                                   timeend_utc=getattr(emplhour, 'timeend'),
                                   comp_timezone=comp_timezone)

            emplhour_dict[field] = field_dict


        for field in ['timeduration', 'breakduration']:
            value = getattr(emplhour, field)
            if value:
                emplhour_dict[field] = f.fielddict_duration(value, user_lang)

        field = 'status'
        value = emplhour.status
        field_dict = {'value': value}
        emplhour_dict[field] = field_dict

# --- remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(emplhour_dict)

    # logger.debug('emplhour_dict: ' + str(emplhour_dict))
    return emplhour_dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_rosterdatefill_dict(company, company_timezone, user_lang):# PR2019-06-17
    rosterdate_dict = {}
    rosterdate_current = get_rosterdate_current(company)
    rosterdate_next = rosterdate_current + timedelta(days=1)
    rosterdate_dict['current'] = {}
    rosterdate_dict['next'] = {}

    # TODO: add min max date
    f.set_fielddict_date(rosterdate_dict['current'], rosterdate_current)
    f.set_fielddict_date(rosterdate_dict['next'], rosterdate_next)

    # companyoffset stores offset from UTC to company_timezone in seconds
    datetime_now = datetime.now()
    timezone = pytz.timezone(company_timezone)
    datetime_now_aware = datetime_now.astimezone(timezone)
    companyoffset = datetime_now_aware.utcoffset().total_seconds()
    rosterdate_dict['companyoffset'] = {'value': companyoffset} # in seconds

    return rosterdate_dict


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def set_fielddict_datetime(field, field_dict, rosterdate, timestart_utc, timeend_utc, comp_timezone):
    # logger.debug(" ------- set_fielddict_datetime ---------- ")
    # logger.debug("rosterdate " + str(rosterdate) + ' ' + str(type(rosterdate)))
    # logger.debug("timestart_utc " + str(timestart_utc) + ' ' + str(type(timestart_utc)))
    # logger.debug("timeend_utc " + str(timeend_utc) + ' ' + str(type(timeend_utc)))
    # logger.debug("comp_timezone " + str(comp_timezone) + ' ' + str(type(comp_timezone)))

    # get mindatetime and  maxdatetime
    min_datetime_utc, max_datetime_utc = get_minmax_datetime_utc(field, rosterdate,
                                                                 timestart_utc, timeend_utc, comp_timezone)

    field_dict['field'] =field

    datetime_utc = None
    if field == "timestart":
        datetime_utc = timestart_utc
    elif field == "timeend":
        datetime_utc = timeend_utc

    if datetime_utc:
        field_dict['datetime'] = datetime_utc.isoformat()
    if min_datetime_utc:
        field_dict['mindatetime'] = min_datetime_utc.isoformat()
    if max_datetime_utc:
        field_dict['maxdatetime'] = max_datetime_utc.isoformat()
    if rosterdate:
        field_dict['rosterdate'] = rosterdate

    #logger.debug('field_dict: '+ str(field_dict))

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
            min_rosterdate_local = f.get_datetimelocal_from_offset(rosterdate, "-1;12;0", comp_timezone)
            min_datetime_utc = min_rosterdate_local.astimezone(pytz.utc)
            # logger.debug("min_rosterdate_local: " + str(min_rosterdate_local))
            # logger.debug("    min_datetime_utc: " + str(min_datetime_utc))

            # get maxdatetime, 24 hours after midnight
            max_rosterdate_local = f.get_datetimelocal_from_offset(rosterdate, "1;0;0", comp_timezone)
            max_rosterdate_utc = max_rosterdate_local.astimezone(pytz.utc)
            # maxdatetime = timeend_utc if that comes before max_rosterdate_utc
            max_datetime_utc = timeend_utc if timeend_utc and timeend_utc < max_rosterdate_utc else max_rosterdate_utc
            # logger.debug("max_rosterdate_local: " + str(max_rosterdate_local))
            # logger.debug("  max_rosterdate_utc: " + str(max_rosterdate_utc))
            # logger.debug("    max_datetime_utc: " + str(max_datetime_utc))

        elif field == field == 'timeend':
            # get mindatetime, equals midnight (midnight = rosterdate 00.00 u)
            min_rosterdate_local = f.get_datetimelocal_from_offset(rosterdate, "0;0;0", comp_timezone)
            min_rosterdate_utc = min_rosterdate_local.astimezone(pytz.utc)
            min_datetime_utc = timestart_utc if timestart_utc and timestart_utc > min_rosterdate_utc else min_rosterdate_utc
            # logger.debug("min_rosterdate_local: " + str(min_rosterdate_local))
            # logger.debug("  min_rosterdate_utc: " + str(min_rosterdate_utc))
            # logger.debug("    min_datetime_utc: " + str(min_datetime_utc))

            # get maxdatetime, 36 hours after midnight (midnight = rosterdate 00.00 u)
            max_rosterdate_local = f.get_datetimelocal_from_offset(rosterdate, "1;12;0", comp_timezone)
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

def get_rosterdate_current(company): # PR2019-06-16
#get next rosterdate from companysetting
    rstdte_current_str = Companysetting.get_setting(c.KEY_COMP_ROSTERDATE_CURRENT, company)
    rosterdate, msg_err = f.get_date_from_ISOstring(rstdte_current_str)

    # logger.debug('rosterdate: ' + str(rosterdate) + ' type: ' + str(type(rosterdate)))
# if no date found in settings: get first rosterdate of all schemitems of company PR2019-06-07
    if rosterdate is None:
        schemeitem = Schemeitem.objects.filter(scheme__order__customer__company=company).first()
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

