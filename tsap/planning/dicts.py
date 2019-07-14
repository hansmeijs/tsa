from django.db.models import Q, Count
from django.db.models.functions import Lower, Coalesce

from datetime import date, datetime, timedelta
from timeit import default_timer as timer

from accounts.models import Usersetting
from companies.models import Customer, Order, Scheme, Schemeitembase, Schemeitem, Team, Teammember, \
    Employee, Emplhour, Orderhour, Companysetting

from tsap.settings import TIME_ZONE, LANGUAGE_CODE

from tsap.functions import get_date_from_str, get_date_WDM_from_dte, format_WDMY_from_dte, format_DMY_from_dte, \
                    get_weekdaylist_for_DHM, get_date_HM_from_minutes, set_fielddict_date, \
                    fielddict_duration, fielddict_date, get_datetime_UTC_from_ISOstring, get_datetime_LOCAL_from_ISOstring

from tsap.constants import KEY_COMP_ROSTERDATE_CURRENT, KEY_USER_EMPLHOUR_PERIOD

import pytz
import json

import logging
logger = logging.getLogger(__name__)


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def get_period_dict_and_save(request, get_current):  # PR2019-07-13
    logger.debug(' ============= get_period_dict_and_save ============= ')
    # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    new_period_dict = {}
    if request.user is not None and request.user.company is not None:

        # get saved period_dict
        saved_period_dict = get_period_from_settings(request)

        # copy key values from saved_period_dict in new_period_dict (don't copy dict, the loop skips keys that are not in use)
        if saved_period_dict:
            for field in ['interval', 'overlap_prev', 'overlap_next', 'range', 'periodstart', 'periodend', 'current']:
                if field in saved_period_dict:
                    new_period_dict[field] = saved_period_dict[field]

        if get_current:
            new_period_dict['current'] = True
        else:
            get_current = new_period_dict['current']

        interval_int = int(new_period_dict['interval'])
        overlap_prev_int = int(new_period_dict['overlap_prev'])
        overlap_next_int = int(new_period_dict['overlap_next'])
        period_starttime_iso = None

        logger.debug('>>>>>> new_period_dict: ' + str(new_period_dict))

        # check if periodstart is present when not get_current. If not found: get_current
        if not get_current:
            if 'periodstart' in new_period_dict:
                period_starttime_iso = new_period_dict['periodstart']
            else:
                get_current = True

        logger.debug('>>>> period_starttime_iso: ' + str(period_starttime_iso))

        # if get_current: set start time of current period in UTC
        if get_current:

            # get start- and end-time of current period in UTC
            period_start_utc, period_end_utc = get_current_period(interval_int, overlap_prev_int, overlap_next_int,
                                                                  request)

            # put start- and end-time of current period in new_period_dict
            new_period_dict['periodstart'] = period_start_utc.isoformat()
            new_period_dict['periodend'] = period_end_utc.isoformat()

            logger.debug('period_start_utc.isoformat: ' + str(new_period_dict['periodstart']))
            logger.debug('period_end_utc.isoformat: ' + str(new_period_dict['periodend']))

        else:
            # if not get_current: calculate end time:
            if period_starttime_iso:
                period_starttime_utc = get_datetime_UTC_from_ISOstring(period_starttime_iso)
                period_endtime_utc = get_period_endtime(period_starttime_utc, interval_int, overlap_prev_int, overlap_next_int)
                new_period_dict['periodend'] = period_endtime_utc.isoformat()

                logger.debug('period_starttime_utc: ' + str(period_starttime_utc) )
                logger.debug('period_endtime_utc: ' + str(period_endtime_utc))


        period_dict_json = json.dumps(new_period_dict)  # dumps takes an object and produces a string:
        Usersetting.set_setting(KEY_USER_EMPLHOUR_PERIOD, period_dict_json, request.user)

    logger.debug('new_period_dict: ' + str(new_period_dict))
    return new_period_dict


def get_current_period(interval_int, overlap_prev_int, overlap_next_int, request):  # PR2019-07-12
    logger.debug(' ============= get_current_period ============= ')
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
        logger.debug('overlap_prev_int: ' + str(overlap_prev_int) + ' period_starttime_local: ' + str(period_starttime_local))

# get start time of current period in UTC
        period_starttime_utc = period_starttime_local.astimezone(pytz.UTC)
        logger.debug('period_starttime_utc: ' + str(period_starttime_utc))

# get utc end time of current period ( = local start time of current period plus overlap_prev_int + interval + overlap_next_int
        period_int = overlap_prev_int + interval_int + overlap_next_int
        period_endtime_utc = period_starttime_utc + timedelta(hours=period_int)
        logger.debug('period: ' + str(period_int) + 'period_endtime_utc' + str(period_endtime_utc))

    return period_starttime_utc, period_endtime_utc


def get_prevnext_period(prevnext, period_timestart_iso, interval_int, overlap_prev_int,  overlap_next_int, comp_timezone):  # PR2019-07-13
    logger.debug(' ============= get_prevnext_period ============= ')
    # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    logger.debug('period_timestart_iso: ' + str(period_timestart_iso) + ' ' + str(type(period_timestart_iso)))
    logger.debug('interval_int: ' + str(interval_int) + ' ' + str(type(interval_int)))

    hour_add = 0
    if prevnext == 'next':
        hour_add = interval_int
    elif prevnext == 'prev':
        hour_add = -interval_int
    period_int = interval_int + overlap_prev_int + overlap_next_int

    # Attention: add/subtract interval must be done in local time, because of DST

    # convert period_timestart_iso into period_timestart_local
    period_timestart_local = get_datetime_LOCAL_from_ISOstring(period_timestart_iso, comp_timezone)
    logger.debug('period_timestart_local: ' + str(period_timestart_local) + ' ' + str(type(period_timestart_local)))

    # get local start time of new period ( = local start time of current period plus interval)
    prevnext_timestart_local = period_timestart_local + timedelta(hours=hour_add)
    logger.debug('prevnext_timestart_local: ' + str(prevnext_timestart_local))

    # get start time of new period in UTC
    prevnext_timestart_utc = prevnext_timestart_local.astimezone(pytz.UTC)
    logger.debug('prevnext_timestart_utc: ' + str(prevnext_timestart_utc))

    # get local end time of new period ( = local start time of new period plus interval + overlap_prev + overlap_next
    prevnext_timeend_local = prevnext_timestart_local + timedelta(hours=period_int)
    logger.debug('prevnext_timeend_local: ' + str(prevnext_timeend_local))

    # get end time of new period in UTC
    prevnext_timeend_utc = prevnext_timeend_local.astimezone(pytz.UTC)
    logger.debug('prevnext_timeend_utc: ' + str(prevnext_timeend_utc))


    return prevnext_timestart_utc, prevnext_timeend_utc


def get_period_from_settings(request):  # PR2019-07-09
    # logger.debug(' ============= get_period_from_settings ============= ')

    period_dict = {}
    if request.user is not None and request.user.company is not None:

        # get emplhour period from Usersetting
        period_dict_json = Usersetting.get_setting(KEY_USER_EMPLHOUR_PERIOD, request.user)
        if period_dict_json:
            period_dict = json.loads(period_dict_json)

        # if not found: get emplhour period from Companysetting
        else:
            period_dict_json = Companysetting.get_setting(KEY_USER_EMPLHOUR_PERIOD, request.user.company)
            if period_dict_json:
                period_dict = json.loads(period_dict_json)

        # if one or more keys not found: add key with default value
        if not 'interval' in period_dict:
            period_dict['interval'] = 24
        if not 'overlap_prev' in period_dict:
            period_dict['overlap_prev'] = 0
        if not 'overlap_next' in period_dict:
            period_dict['overlap_next'] = 0
        if not 'range' in period_dict:
            period_dict['range'] = '0;0;1;0'
        if not 'current' in period_dict:
            period_dict['current'] = True

    return period_dict


def get_period_endtime(period_starttime_utc, interval_int, overlap_prev_int, overlap_next_int):  # PR2019-07-13
    logger.debug(' ============= get_period_endtime ============= ')
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    # utc end time of period = local start time of period plus overlap_prev_int + interval + overlap_next_int
    period_int = overlap_prev_int + interval_int + overlap_next_int
    period_endtime_utc = period_starttime_utc + timedelta(hours=period_int)
    # logger.debug('period: ' + str(period_int) + 'period_endtime_utc' + str(period_endtime_utc))

    return period_endtime_utc








# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_scheme_list(order, include_inactive, user_lang):
# --- create list of all /  active schemes of this company PR2019-06-16
    # logger.debug("========== create_scheme_list ==== order: " + str(order))
    scheme_list = []
    if order:
        crit = Q(order=order)
        if not include_inactive:
            crit.add(Q(inactive=False), crit.connector)
        schemes = Scheme.objects.all() #  .filter(order=order).order_by(Lower('code'))

        for scheme in schemes:
            dict = create_scheme_dict(scheme, user_lang)
            scheme_list.append(dict)
    return scheme_list

def create_scheme_dict(instance, user_lang):
    # --- create dict of this scheme PR2019-06-20
    dict = {}
    if instance:
        dict['pk'] = instance.pk
        dict['id'] = {'pk': instance.pk, 'ppk': instance.order.pk, 'table': 'scheme'}

        for field in ['code', 'cycle', 'datefirst', 'datelast', 'inactive']:
            dict[field] = {}
            value = getattr(instance, field, None)
            if field in ['datefirst', 'datelast']:
                if value:
                    set_fielddict_date(dict[field], value, user_lang)
            elif field == 'inactive':
                if value:
                    dict[field] = {'value': value}
            else:
                if value is not None:
                    dict[field] = {'value': value}

# --- remove empty attributes from dict
    remove_empty_attr_from_dict(dict)
    return dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def create_schemeitem_list(order, comp_timezone, user_lang):
    # create list of schemeitems of this scheme PR2019-05-12
    schemeitem_list = []
    if order:
        schemeitems = Schemeitem.objects.filter(scheme__order=order)
        for schemeitem in schemeitems:
            schemeitem_dict = create_schemeitem_dict(schemeitem, comp_timezone, user_lang)
            schemeitem_list.append(schemeitem_dict)
    return schemeitem_list


def create_schemeitem_dict(schemeitem, comp_timezone, user_lang, temp_pk=None, is_created=False, is_deleted=False, updated_list=None):
    logger.debug(" ----- create_schemeitem_dict ----- " )
    # create list of schemeitems of this scheme PR2019-05-12
    schemeitem_dict = {}
    field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                  'timestart', 'timeend', 'timeduration', 'breakduration')

    for field in field_list:
        schemeitem_dict[field] = {}
        if updated_list:
            if field in updated_list:
                schemeitem_dict[field]['updated'] = True

    if schemeitem:
        for field in ['id']:
            schemeitem_dict[field] = {'pk': schemeitem.id, 'ppk': schemeitem.scheme.id}
            if temp_pk:
                schemeitem_dict[field]['temp_pk'] = temp_pk
            if is_created:
                schemeitem_dict[field]['created'] = True
            if is_deleted:
                schemeitem_dict[field]['deleted'] = True

        if not is_deleted:

            field = 'rosterdate'
            rosterdate = getattr(schemeitem, field)

            # get rosterdate midnight
            rosterdate_midnight_local = None
            rosterdate_utc = None
            if rosterdate:
                rosterdate_utc = get_rosterdate_utc(rosterdate)
                rosterdate_midnight_local = get_rosterdate_midnight_local(rosterdate_utc, comp_timezone)

                schemeitem_dict[field] = fielddict_date(rosterdate_utc, user_lang)

            field = 'shift'
            value = getattr(schemeitem, field)
            if value:
                field_dict = {'value': value}
                schemeitem_dict[field] = field_dict

            field = 'team'
            if schemeitem.team:
                value = schemeitem.team.code
                team_pk = schemeitem.team.id
                field_dict = {'value': value, 'team_pk':team_pk}
                if field_dict:
                    schemeitem_dict[field] = field_dict

            for field in ['timestart', 'timeend']:
                field_dict = {}
                timestart = getattr(schemeitem, 'timestart')
                timeend = getattr(schemeitem, 'timeend')
                min_datetime_utc = None
                max_datetime_utc = None

# get mindatetime and  maxdatetime
                if field == 'timestart':
                    # get mindatetime
                    if rosterdate_midnight_local:
                        min_datetime_local = rosterdate_midnight_local + timedelta(hours=-12)
                        # logger.debug("min_datetime_local: " + str(min_datetime_local))
                        min_datetime_utc = min_datetime_local.astimezone(pytz.utc)
                        # logger.debug("min_datetime_utc: " + str(min_datetime_utc))
                    elif timestart:
                        min_datetime_utc = timestart + timedelta(hours=-12)

                    # get maxdatetime
                    if timeend:
                        max_datetime_utc = timeend
                    else:
                        if rosterdate_midnight_local:
                            max_datetime_local = rosterdate_midnight_local + timedelta(days=1)
                            # logger.debug("max_datetime_local: " + str(max_datetime_local))
                            max_datetime_utc = max_datetime_local.astimezone(pytz.utc)
                            # logger.debug("max_datetime_utc: " + str(max_datetime_utc))
                        elif timestart:
                            max_datetime_utc = timestart + timedelta(hours=12)

                elif field == 'timeend':
                    # get mindatetime
                    if timestart:
                        min_datetime_utc = timestart
                    else:
                        if rosterdate_midnight_local:
                            min_datetime_local = rosterdate_midnight_local
                        elif timeend:
                            min_datetime_local = timeend + timedelta(hours=-12)

                    # get maxdatetime
                    if rosterdate_midnight_local:
                        max_datetime_local = rosterdate_midnight_local + timedelta(hours=36)
                        # logger.debug("max_datetime_local: " + str(max_datetime_local))
                        max_datetime_utc = max_datetime_local.astimezone(pytz.utc)
                        # logger.debug("max_datetime_utc: " + str(max_datetime_utc))
                    elif timeend:
                        max_datetime_utc = timeend + timedelta(hours=12)

                datetimevalue = getattr(schemeitem, field)
                if datetimevalue:
                    field_dict['datetime'] = datetimevalue

                if min_datetime_utc:
                    field_dict['mindatetime'] = min_datetime_utc
                if max_datetime_utc:
                    field_dict['maxdatetime'] = max_datetime_utc
                if rosterdate_utc:
                    field_dict['rosterdate'] = rosterdate_utc
                schemeitem_dict[field] = field_dict

            for field in ['timeduration', 'breakduration']:
                field_dict = {}
                value = getattr(schemeitem, field)
                if value:
                    field_dict['value'] = value
                    field_dict['hm'] =get_date_HM_from_minutes( value, user_lang)
                schemeitem_dict[field] = field_dict


# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(schemeitem_dict)

    return schemeitem_dict


def create_shift_list(order):
    # create list of shifts of this scheme PR2019-05-01
    shift_list = []
    if order:
        # return all shifts that have value from the scheemitems of this scheme
        shifts = Schemeitem.objects.filter(scheme__order=order).\
            exclude(shift__exact='').\
            exclude(shift__isnull=True).\
            values('scheme_id', 'shift', 'timestartdhm', 'timeenddhm', 'breakduration')\
            .annotate(count=Count('shift'))\
            .order_by(Lower('shift'))

        for shift in shifts:
            # schemeitem: {'shift': 'Shift 2', 'timestart': None, 'timeend': None, 'breakduration': 0, 'total': 1}

            # add scheme.pk and total to dict 'id'
            dict = {'id': {'ppk': shift.get('scheme_id'), 'count': shift.get('count')}}

            for field in ['shift', 'timestartdhm', 'timeenddhm', 'breakduration']:
                value = shift.get(field)
                if value:
                    fieldname = field
                    if field == 'shift':
                        fieldname = 'code'
                    dict[fieldname] = {'value': value}

            if dict:
                shift_list.append(dict)
    return shift_list


def create_date_dict(rosterdate, user_lang, status_text):
    dict = None
    if rosterdate:
        dict = {}
        dict['value'] = rosterdate
        dict['wdm'] = get_date_WDM_from_dte(rosterdate, user_lang)
        dict['wdmy'] = format_WDMY_from_dte(rosterdate, user_lang)
        dict['dmy'] = format_DMY_from_dte(rosterdate, user_lang)
        dict['offset'] = get_weekdaylist_for_DHM(rosterdate, user_lang)
    if status_text:
        if dict is None:
            dict = {}
        dict[status_text] = True

    return dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_emplhour_list(period_timestart_utc, period_timeend_utc, company, comp_timezone, user_lang): # PR2019-06-16
    logger.debug(' ============= create_emplhour_list ============= ')

    # TODO select_related on queyset
    #  queryset = Courses.objects.filter(published=True).prefetch_related('modules', 'modules__lessons', 'modules__lessons__exercises')
    # TODO filter also on min max rosterdate, in case timestart / end is null
    starttime = timer()

    # convert period_timestart_iso into period_timestart_local
    logger.debug('period_timestart_utc: ' + str(period_timestart_utc) + ' ' + str(type(period_timestart_utc)))
    logger.debug('period_timeend_utc: ' + str(period_timeend_utc)+ ' ' + str(type(period_timeend_utc)))

    date_min = period_timestart_utc.date()
    date_max = period_timeend_utc.date()

    crit = (Q(orderhour__order__customer__company=company)) & \
           (Q(rosterdate__gte=date_min)) & (Q(rosterdate__lte=date_max)) & \
           (Q(timestart__lte=period_timeend_utc) | Q(timestart__isnull=True)) & \
           (Q(timeend__gte=period_timestart_utc) | Q(timeend__isnull=True))

    emplhours = Emplhour.objects.filter(crit)

    logger.debug(emplhours.query)
    # SELECT ...
    # WHERE ("companies_customer"."company_id" = 1 AND
    # "companies_emplhour"."rosterdate" >= 2019-07-13 AND "companies_emplhour"."rosterdate" <= 2019-07-14 AND
    # ("companies_emplhour"."timestart" <= 2019-07-14 22:00:00+00:00 OR "companies_emplhour"."timestart" IS NULL) AND
    # ("companies_emplhour"."timeend" >= 2019-07-13 22:00:00+00:00 OR "companies_emplhour"."timeend" IS NULL))
    # ORDER BY "companies_emplhour"."rosterdate" ASC, "companies_emplhour"."timestart" ASC

    logger.debug('sql elapsed time  is :')
    logger.debug(timer() - starttime)

    emplhour_list = []
    for emplhour in emplhours:
        logger.debug('emplhour.timestart: ' + str(emplhour.timestart))
        dict = create_emplhour_dict(emplhour, comp_timezone, user_lang)
        emplhour_list.append(dict)

    logger.debug('list elapsed time  is :')
    logger.debug(timer() - starttime)

    return emplhour_list


def create_emplhour_dict(emplhour, comp_timezone, user_lang):
    # logger.debug('----------- create_emplhour_dict ------------------')
    # logger.debug('emplhour: ' + str(emplhour))

    # create dict of this scheme PR2019-06-29
    emplhour_dict = {}
    field_list = ('id', 'rosterdate', 'orderhour', 'shift', 'employee',
                  'timestart', 'timeend', 'breakduration', 'timeduration', 'timestatus')

    for field in field_list:
        emplhour_dict[field] = {}

    if emplhour:
        field = 'id'
        emplhour_dict[field] = {'pk': emplhour.id, 'ppk': emplhour.orderhour.id}

        field = 'rosterdate'
        rosterdate = getattr(emplhour, field)
        timezone = pytz.timezone(comp_timezone)

        # get rosterdate midnight
        rosterdate_midnight_local = None

        if rosterdate:
            emplhour_dict[field] = fielddict_date(rosterdate, user_lang)

        #field = 'customer'
        #if emplhour.orderhour:
        #    value = emplhour.orderhour.order.customer.code
        #    if value:
        #        emplhour_dict[field] = {'value': value, 'customer_pk': emplhour.orderhour.order.customer.id}

        field = 'orderhour'
        if emplhour.orderhour:
            # value = ' - '.join([emplhour.orderhour.order.customer.code, emplhour.orderhour.order.code])
            value = emplhour.orderhour.order.customer.code + ' - ' + emplhour.orderhour.order.code
            if value:
                emplhour_dict[field] = {'value': value, 'orderhour_pk':emplhour.orderhour.id, 'order_pk':emplhour.orderhour.order.id}

        field = 'shift'
        if emplhour.orderhour:
            if emplhour.orderhour.schemeitem:
                value = emplhour.orderhour.schemeitem.shift
                if value:
                    emplhour_dict[field] = {'value': value}

        field = 'employee'
        if emplhour.employee:
            value = emplhour.employee.code
            if value:
             emplhour_dict[field] = {'value': value, 'employee_pk':emplhour.employee.id}

        rosterdate_utc = get_rosterdate_utc(rosterdate)

        for field in ['timestart', 'timeend']:
            timestart = getattr(emplhour, 'timestart')
            timeend = getattr(emplhour, 'timeend')
            field_dict = {}
            set_fielddict_datetime(field, field_dict, rosterdate_utc, timestart, timeend, comp_timezone)

            emplhour_dict[field] = field_dict


        for field in ['timeduration', 'breakduration']:
            value = getattr(emplhour, field)
            if value:
                emplhour_dict[field] = fielddict_duration(value, user_lang)

        field = 'timestatus'
        value = emplhour.timestatus
        field_dict = {'value': value}
        emplhour_dict[field] = field_dict

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(emplhour_dict)

    # logger.debug('emplhour_dict: ' + str(emplhour_dict))
    return emplhour_dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_rosterdatefill_dict(company, company_timezone, user_lang):# PR2019-06-17
    rosterdate_dict = {}
    rosterdate_current = get_rosterdate_current(company)
    rosterdate_next = rosterdate_current + timedelta(days=1)
    rosterdate_dict['current'] = {}
    rosterdate_dict['next'] = {}
    set_fielddict_date(rosterdate_dict['current'], rosterdate_current, user_lang)
    set_fielddict_date(rosterdate_dict['next'], rosterdate_next, user_lang)

    # companyoffset stores offset from UTC to company_timezone in seconds
    datetime_now = datetime.now()
    timezone = pytz.timezone(company_timezone)
    datetime_now_aware = datetime_now.astimezone(timezone)
    companyoffset = datetime_now_aware.utcoffset().total_seconds()
    rosterdate_dict['companyoffset'] = {'value': companyoffset} # in seconds

    return rosterdate_dict


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def set_fielddict_datetime(field, field_dict, rosterdate_utc, timestart, timeend, comp_timezone):
    # PR2019-07-07

    # get mindatetime and  maxdatetime
    min_datetime_utc, max_datetime_utc = get_minmax_datetime_utc(
        field, rosterdate_utc, timestart, timeend, comp_timezone)

    datetimevalue = None
    if field == "timestart":
        datetimevalue =timestart
    elif field == "timeend":
        datetimevalue = timeend

    if datetimevalue:
        field_dict['datetime'] = datetimevalue
    if min_datetime_utc:
        field_dict['mindatetime'] = min_datetime_utc
    if max_datetime_utc:
        field_dict['maxdatetime'] = max_datetime_utc
    if rosterdate_utc:
        field_dict['rosterdate'] = rosterdate_utc


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def get_period_endtimeXXXX(interval_int, overlap_prev_int, overlap_next_int, request):  # PR2019-07-12
    logger.debug(' ============= get_period_endtime ============= ')
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

def get_rosterdate_midnight_local(rosterdate_utc, comp_timezone): # PR2019-07-09
    rosterdate_midnight_local = None
    if rosterdate_utc:
        timezone = pytz.timezone(comp_timezone)
        # astimezone changes timezone of a timezone aware object, utc time stays the same
        rosterdate_local = rosterdate_utc.astimezone(timezone)
        # logger.debug("rosterdate_local: " + str(rosterdate_local))

        # make the date midnight at local timezone
        rosterdate_midnight_local = rosterdate_local.replace(hour=0, minute=0)
        # logger.debug("rosterdate_midnight_local: " + str(rosterdate_midnight_local))
        # make the date midnight at local timezone

    return rosterdate_midnight_local

def get_minmax_datetime_utc(field, rosterdate_utc, timestart, timeend, comp_timezone):  # PR2019-07-05
    # logger.debug(" ------- get_minmax_datetime_utc ---------- ")

    min_datetime_utc = None
    max_datetime_utc = None

    if rosterdate_utc:
        rosterdate_midnight_local = get_rosterdate_midnight_local(rosterdate_utc, comp_timezone)

        if field == field == 'timestart':
            # get mindatetime
            min_rosterdate_local = rosterdate_midnight_local + timedelta(hours=-12)
            min_datetime_utc = min_rosterdate_local.astimezone(pytz.utc)
            # get maxdatetime
            max_rosterdate_local = rosterdate_midnight_local + timedelta(hours=24)
            max_rosterdate_utc = max_rosterdate_local.astimezone(pytz.utc)
            max_datetime_utc = timeend if timeend and timeend < max_rosterdate_utc else max_rosterdate_utc

        elif field == field == 'timeend':
            # get mindatetime
            min_rosterdate_utc = rosterdate_midnight_local.astimezone(pytz.utc)
            min_datetime_utc = timestart if timestart and timestart > min_rosterdate_utc else min_rosterdate_utc
            # get maxdatetime
            max_rosterdate_local = rosterdate_midnight_local + timedelta(hours=+36)
            max_datetime_utc = max_rosterdate_local.astimezone(pytz.utc)

    return min_datetime_utc, max_datetime_utc

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>



def remove_empty_attr_from_dict(dict):
# --- function removes empty attributes from dict  PR2019-06-02
    # logger.debug('--- remove_empty_attr_from_dict')
    # logger.debug('dict: ' + str(dict))
# create list of fields in dict
    list = []
    for field in dict:
        list.append(field)
    # logger.debug('list: ' + str(list))
# iterate through list of fields in dict
    # cannot iterate through dict because it changes during iteration
    for field in list:
        if field in dict:
# remove empty attributes from dict
            if not dict[field]:
                del dict[field]
                # logger.debug('deleted: ' + str(field))
    #logger.debug('dict: ' + str(dict))


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def get_rosterdate_current(company): # PR2019-06-16
#get next rosterdate from companysetting
    rstdte_current_str = Companysetting.get_setting(KEY_COMP_ROSTERDATE_CURRENT, company)
    rosterdate, msg_err = get_date_from_str(rstdte_current_str)

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

