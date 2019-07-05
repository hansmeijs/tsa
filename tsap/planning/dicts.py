from django.db.models import Q, Count
from django.db.models.functions import Lower, Coalesce

from datetime import date, datetime, timedelta
from timeit import default_timer as timer

from companies.models import Customer, Order, Scheme, Schemeitembase, Schemeitem, Team, Teammember, \
    Employee, Emplhour, Orderhour, Companysetting

from tsap.functions import get_date_from_str, get_datetimeaware_from_datetimeUTC, \
                    get_timeDHM_from_dhm, get_datetimelocal_from_DHM, get_date_WDM_from_dte, format_WDMY_from_dte, format_DMY_from_dte, \
                    get_weekdaylist_for_DHM, get_date_HM_from_minutes, create_dict_with_empty_attr, \
                    get_date_diff_plusone, get_time_minutes, get_iddict_variables, get_fielddict_variables , \
                    get_minutes_from_DHM, get_datetime_from_ISO_no_offset, \
                    fielddict_str, set_fielddict_date, fielddict_datetime, fielddict_duration, fielddict_date, \
                    formatDMYHM_from_datetime, formatWHM_from_datetime, format_HM_from_dtetime

from tsap.constants import MONTHS_ABBREV, WEEKDAYS_ABBREV, TIMEFORMATS, STATUS_EMPLHOUR_00_NONE, STATUS_EMPLHOUR_01_CREATED, \
    KEY_COMP_ROSTERDATE_CURRENT, LANG_DEFAULT, TYPE_02_ABSENCE, TYPE_00_NORMAL, KEY_USER_QUICKSAVE

import pytz
import json

import logging
logger = logging.getLogger(__name__)

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
            for field in ['rosterdate']:
                value = getattr(schemeitem, field)
                if value:
                    schemeitem_dict[field] = fielddict_date(value, user_lang)

            for field in ['shift']:
                value = getattr(schemeitem, field)
                if value:
                    field_dict = {'value': value}
                    schemeitem_dict[field] = field_dict

            for field in ['team']:
                if schemeitem.team:
                    value = schemeitem.team.code
                    team_pk = schemeitem.team.id
                    field_dict = {'value': value, 'team_pk':team_pk}
                    if field_dict:
                        schemeitem_dict[field] = field_dict

            for field in ['timestart', 'timeend']:
                field_dict = {}
                value = getattr(schemeitem, field + 'dhm')
                rosterdate = getattr(schemeitem, 'rosterdate')
                if rosterdate:
                    field_dict['rosterdate'] = rosterdate
                datetime = getattr(schemeitem, field)
                if datetime:
                    field_dict['datetime'] = datetime
                if value:
                    field_dict['offset'] = value
                    #field_dict['value'] = value
                    #field_dict['dhm'] = get_timeDHM_from_dhm(rosterdate, value, comp_timezone, user_lang)
                    #field_dict['dmyhm'] = formatDMYHM_from_datetime(datetime, comp_timezone, user_lang)
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

def create_emplhour_list(datefirst, datelast, company, comp_timezone, user_lang): # PR2019-06-16
    logger.debug(' ============= create_emplhour_list ============= ')

    # TODO select_related on queyset
    #  queryset = Courses.objects.filter(published=True).prefetch_related('modules', 'modules__lessons', 'modules__lessons__exercises')

    starttime = timer()

    crit = (Q(orderhour__order__customer__company=company) | Q(employee__company=company))
    if datefirst:
        crit.add(Q(rosterdate__gte=datefirst), crit.connector)
    if datelast:
        crit.add(Q(rosterdate__lte=datelast), crit.connector)
    emplhours = Emplhour.objects.filter(crit)

    print('sql elapsed time  is :')
    print(timer() - starttime)

    emplhour_list = []
    for emplhour in emplhours:
        dict = create_emplhour_dict(emplhour, comp_timezone, user_lang)
        emplhour_list.append(dict)

    print('list elapsed time  is :')
    print(timer() - starttime)

    return emplhour_list


def create_emplhour_dict(emplhour, comp_timezone, user_lang):
    logger.debug('----------- create_emplhour_dict ------------------')
    # logger.debug('emplhour: ' + str(emplhour))

    # create dict of this scheme PR2019-06-29
    emplhour_dict = {}
    field_list = ('id', 'rosterdate', 'customer', 'order', 'shift', 'employee',
                  'timestart', 'timeend', 'breakduration', 'timeduration', 'timestatus')

    for field in field_list:
        emplhour_dict[field] = {}

    if emplhour:
        field = 'id'
        emplhour_dict[field] = {'pk': emplhour.id, 'ppk': emplhour.orderhour.id}

        field = 'rosterdate'
        rosterdate = getattr(emplhour, field)
        if rosterdate:
            emplhour_dict[field] = fielddict_date(rosterdate, user_lang)

        field = 'customer'
        if emplhour.orderhour:
            value = emplhour.orderhour.order.customer.code
            if value:
                emplhour_dict[field] = {'value': value, 'customer_pk': emplhour.orderhour.order.customer.id}

        field = 'order'
        if emplhour.orderhour:
            # value = ' - '.join([emplhour.orderhour.order.customer.code, emplhour.orderhour.order.code])
            value = emplhour.orderhour.order.customer.code + ' - ' + emplhour.orderhour.order.code
            if value:
                emplhour_dict[field] = {'value': value, 'order_pk':emplhour.orderhour.order.id}

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

        for field in ['timestart', 'timeend']:
            field_dict = {}
            datetime = getattr(emplhour, field)
            if rosterdate:
                field_dict['rosterdate'] = rosterdate
            if datetime:
                field_dict['datetime'] = datetime
                #field_dict['value'] = datetime
                #if rosterdate == datetime.date():
                #    field_dict['dhm'] = format_HM_from_dtetime(datetime, comp_timezone, user_lang)
                #else:
                #    field_dict['dhm'] = formatWHM_from_datetime(datetime, comp_timezone, user_lang)
                #field_dict['dmyhm'] = formatDMYHM_from_datetime(datetime, comp_timezone, user_lang)
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

    logger.debug('emplhour_dict: ' + str(emplhour_dict))
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

    logger.debug('rosterdate: ' + str(rosterdate) + ' type: ' + str(type(rosterdate)))
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

