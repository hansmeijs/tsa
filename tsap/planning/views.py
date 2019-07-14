# PR2019-03-24
from django.contrib.auth.decorators import login_required
from datetime import date, datetime, timedelta
from django.db.models import Q, Value
from django.db.models.functions import Lower, Coalesce
from django.http import HttpResponse
from django.shortcuts import render, redirect #, get_object_or_404
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from datetime import date, datetime, timedelta


from accounts.models import Usersetting
from companies.views import LazyEncoder
from customers.views import create_customer_list, create_order_list, create_absencecategory_list

from tsap.constants import MONTHS_ABBREV, WEEKDAYS_ABBREV, TIMEFORMATS, STATUS_EMPLHOUR_00_NONE, STATUS_EMPLHOUR_01_CREATED, \
    KEY_COMP_ROSTERDATE_CURRENT, KEY_USER_EMPLHOUR_PERIOD, LANG_DEFAULT, TYPE_02_ABSENCE, TYPE_00_NORMAL, KEY_USER_QUICKSAVE

from tsap.functions import get_date_from_str, get_datetimelocal_from_datetimeUTC, \
                    get_datetimearray_from_ISOstring, get_datetimelocal_from_DHM, get_date_WDM_from_dte, \
                    format_WDMY_from_dte, format_DMY_from_dte, \
                    get_weekdaylist_for_DHM, create_dict_with_empty_attr, \
                    get_date_diff_plusone, get_time_minutes, get_iddict_variables, get_fielddict_variables, \
                    get_minutes_from_DHM, get_datetime_UTC_from_ISOstring, \
                    fielddict_str, set_fielddict_date, fielddict_datetime, fielddict_duration, \
                    get_datetime_LOCAL_from_ISOstring


from planning.dicts import remove_empty_attr_from_dict, create_emplhour_dict, get_rosterdatefill_dict, get_datetime_utc, \
    create_emplhour_list, create_scheme_list, create_schemeitem_list, create_shift_list, \
    set_fielddict_datetime, get_rosterdate_utc, get_rosterdate_midnight_local, split_datetime, get_range, get_period_dict_and_save, \
    get_period_from_settings, get_prevnext_period

from tsap.validators import date_within_range

from tsap.settings import TIME_ZONE, LANGUAGE_CODE
from tsap.headerbar import get_headerbar_param

from companies.models import Company, Order, Scheme, Schemeitembase, Schemeitem, Team, Teammember, \
    Employee, Emplhour, Orderhour, Companysetting

import pytz
import json

import logging
logger = logging.getLogger(__name__)


# === DatalistDownloadView ===================================== PR2019-05-23
@method_decorator([login_required], name='dispatch')
class DatalistDownloadView(View):  # PR2019-05-23

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= DatalistDownloadView ============= ')

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                if request.POST['datalist_download']:
# - get user_lang
                    user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
                    activate(user_lang)
# - get comp_timezone PR2019-06-14
                    comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
                    # logger.debug('request.user.company.timezone: ' + str(request.user.company.timezone))

                    datalist_dict = json.loads(request.POST['datalist_download'])
                    logger.debug('datalist_dict: ' + str(datalist_dict) + ' ' + str(type(datalist_dict)))

                    # datalist_dict: {"customer": {inactive: false}, "order": {inactive: true},
                    #                   "employee": {inactive: false}, "rosterdate": true});

                    # datalist_dict: {'scheme': {'order_pk': 48}, 'schemeitems': {'order_pk': 48},
                    #                   'shift': {'order_pk': 48}, 'teams': {'order_pk': 48}}

                    # datalist_dict: {'rosterdatefirst': '2019-04-03', 'rosterdatelast': '2019-04-05'} <class 'dict'>

                    for table in datalist_dict:
                        table_dict = datalist_dict[table]

# - get include_inactive from table_dict
                        include_inactive = False
                        if 'inactive' in table_dict:
                            include_inactive = table_dict['inactive']
                        # logger.debug('datalist table: ' + str(table) + ' include_inactive: ' + str(include_inactive) + ' ' + str(type(include_inactive)))

                        list = []
                        if table == 'customer':
                            # inactive = None: include active and inactive, False: only active
                            inactive = False if not include_inactive else None
                            list = create_customer_list(request.user.company, inactive, TYPE_00_NORMAL)

                        elif table == 'order':
                            # inactive = None: include active and inactive, False: only active
                            inactive = False if not include_inactive else None
                            list = create_order_list(request.user.company, user_lang, inactive)

                        elif table == 'abscat':
                            # inactive = None: include active and inactive, False: only active
                            # inactive = False if not include_inactive else None

                            # logger.debug('absencecat create_absencecategory_list ')
                            list = create_absencecategory_list(request.user.company)

                        elif table == 'employee':
                            list = Employee.create_employee_list(False, request.user.company, user_lang)

                        elif table == 'emplhour':
                            logger.debug(' table: ' + str(table))
                            period_timestart_iso = None
                            period_timeend_iso = None

                            period_dict = get_period_dict_and_save(request, False)  # get_current = False
                            if 'periodstart' in period_dict:
                                period_timestart_iso = period_dict['periodstart']
                            if 'periodend' in period_dict:
                                period_timeend_iso = period_dict['periodend']

                            period_timestart_utc = get_datetime_UTC_from_ISOstring(period_timestart_iso)
                            period_timeend_utc = get_datetime_UTC_from_ISOstring(period_timeend_iso)
                            logger.debug('vv period_timestart_utc: ' + str(period_timestart_utc))
                            logger.debug('vv period_timeend_utc: ' + str(period_timeend_utc))

                            if period_timestart_iso and period_timeend_iso:
                                list = create_emplhour_list(period_timestart_utc, period_timeend_utc, request.user.company, comp_timezone, user_lang)

                        else:
                            # - get order from table_dict
                            order_pk = table_dict.get('order_pk')
                            order = None
                            if order_pk:
                                order = Order.objects.get_or_none(customer__company=request.user.company,
                                                             pk=order_pk)
                            logger.debug('order: ' + str(order) + ' ' + str(type(order)))
                            logger.debug('table: ' + str(table) + ' ' + str(type(table)))

                            if order:
                                if table == 'scheme':
                                    list = create_scheme_list(order, include_inactive, user_lang)
                                if table == 'schemeitem':
                                    list = create_schemeitem_list(order, comp_timezone, user_lang)
                                if table == 'team':
                                    list = Team.create_team_list(order)
                                if table == 'teammember':
                                    list = Teammember.create_teammember_list(order, user_lang)
                                if table == 'shift':
                                    list = create_shift_list(order)
                        if list:
                            datalists[table] = list

                        if table == 'rosterdatefill':
                            datalists[table] = get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)

                        if table == 'period':
                            get_current = True
                            if 'current' in table_dict:
                                get_current = table_dict['current']
                            datalists[table] = get_period_dict_and_save(request, get_current)
                            logger.debug('datalist[period]: ' + str(datalists[table]))

        datalists_json = json.dumps(datalists, cls=LazyEncoder)

        return HttpResponse(datalists_json)


# === RosterView ===================================== PR2019-
# 05-26
@method_decorator([login_required], name='dispatch')
class RosterView(View):

    def get(self, request):
        param = {}
        logger.debug(' ============= RosterView ============= ')
        if request.user.company is not None:
            # datefirst = None
            # datelast = None
            # crit = (Q(orderhour__order__customer__company=request.user.company) | Q(employee__company=request.user.company))
            # if datefirst:
            #     crit.add(Q(rosterdate__gte=datefirst), crit.connector)
            # if datelast:
            #     crit.add(Q(rosterdate__lte=datelast), crit.connector)
            #emplhours = Emplhour.objects.filter(crit)
            # emplhours = Emplhour.objects.all()

            # for emplhour in emplhours:
            #     string = str(emplhour.id)
            #     if emplhour.rosterdate:
            #          string += ' - rosterdate: ' + str(emplhour.rosterdate)
            #      if emplhour.orderhour:
            #         string += ' - order: ' + str(emplhour.orderhour.order.code)

            employees = Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
            employee_list = []
            for employee in employees:
                employee_list.append({'pk': employee.id, 'code': employee.code})
            employee_json = json.dumps(employee_list)

            # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            # logger.debug('comp_timezone: ' + str(comp_timezone))
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            # get weekdays translated
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            if not user_lang in WEEKDAYS_ABBREV:
                user_lang = LANG_DEFAULT
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[user_lang])

            # get months translated
            if not user_lang in MONTHS_ABBREV:
                user_lang = LANG_DEFAULT
            months_json = json.dumps(MONTHS_ABBREV[user_lang])


            # get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

            # get timeformat
            timeformat = 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in TIMEFORMATS:
                timeformat = '24h'

            # get quicksave from Usersetting
            quicksave = 0
            quicksave_str = Usersetting.get_setting(KEY_USER_QUICKSAVE, request.user)
            if quicksave_str:
                quicksave = int(quicksave_str)

            get_current = True
            period_dict = get_period_dict_and_save(request, get_current)
            period_json = json.dumps(period_dict)

            param = get_headerbar_param(request, {
                'lang': user_lang,
                'timezone': comp_timezone,
                'timeformat': timeformat,
                'interval': interval,
                'weekdays': weekdays_json,
                'months': months_json,
                'quicksave': quicksave,
                'period': period_json
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'roster.html', param)


# === SchemesView ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class SchemesView(View):

    def get(self, request):
        param = {}
        # logger.debug(' ============= SchemesView ============= ')
        if request.user.company is not None:


# --- get user_lang
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            if not user_lang in WEEKDAYS_ABBREV:
                user_lang = LANGUAGE_CODE

# --- create list of all active customers of this company
            # inactive = False: include only active instances
            inactive = False
            customer_list = create_customer_list(request.user.company, inactive, TYPE_00_NORMAL)
            customer_json = json.dumps(customer_list)

# --- create list of all active orders of this company
            # order_json = json.dumps(create_order_list(request.user.company))

            # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            # logger.debug('comp_timezone: ' + str(comp_timezone))

# --- get weekdays translated
            if not user_lang in WEEKDAYS_ABBREV:
                user_lang = LANGUAGE_CODE
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[user_lang])

# --- get months translated
            if not user_lang in MONTHS_ABBREV:
                user_lang = LANGUAGE_CODE
            months_json = json.dumps(MONTHS_ABBREV[user_lang])

# ---  get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

# get timeformat
            # timeformat = 'AmPm'
            timeformat = '24h'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in TIMEFORMATS:
                timeformat = '24h'

# --- get today
            today_dict = {'value': str(date.today()),
                          'wdm': get_date_WDM_from_dte(date.today(), user_lang),
                          'wdmy': format_WDMY_from_dte(date.today(), user_lang),
                          'dmy': format_DMY_from_dte(date.today(), user_lang),
                          'offset': get_weekdaylist_for_DHM(date.today(), user_lang)}
            today_json = json.dumps(today_dict)


# get quicksave from Usersetting
            quicksave = 0
            quicksave_str = Usersetting.get_setting(KEY_USER_QUICKSAVE, request.user)
            if quicksave_str:
                quicksave = int(quicksave_str)

            param = get_headerbar_param(request, {
                'customer_list': customer_json,
                'lang': user_lang,
                'timezone': comp_timezone,
                'weekdays': weekdays_json,
                'months': months_json,
                'interval': interval,
                'quicksave': quicksave,
                'timeformat': timeformat,
                'today': today_json
            })


        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'schemes.html', param)


@method_decorator([login_required], name='dispatch')
class SchemeUploadView(View):  # PR2019-06-06
    def post(self, request, *args, **kwargs):
        logger.debug(' ====== SchemeUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

# - get upload_dict from request.POST
            upload_dict = {}
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'pk': 19, 'parent_pk': 6}, 'cycle': {'update': True, 'value': '6'}}
                # upload_dict: {'id': {'pk': 14, 'parent_pk': 2}, 'pk': 14, 'datelast': {'update': True, 'value': '2019-06-25'}}
                instance = None
                parent_instance = None

# - get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    field_list = ()
                    if table == 'scheme':
                        field_list = ('id', 'code', 'cycle', 'datefirst', 'datelast')
                    elif table == 'team':
                        field_list = ('id', 'code')
                    update_dict = create_dict_with_empty_attr(field_list)

# - check if parent exists (scheme is parent of schemeitem, team is parent of teammember (and scheme is parent of team)
                    # parent_instance adds 'parent_pk' and 'table' to update_dict['id']
                    parent_instance = get_parent_instance(table, parent_pk_int, update_dict, request.user.company)
                    logger.debug('parent_instance: ' + str(parent_instance))

# - Delete item
                    if is_delete:
                        delete_instance(table, pk_int, parent_instance, update_dict, self.request)

# === Create new schemeitem or teammember
                    elif is_create:
                        code = None
                        code_dict = upload_dict.get('code')
                        if code_dict:
                            code = code_dict.get('value')
                        # update_scheme adds 'created', 'pk', 'error' to to update_dict['id'] and adds update_dict['pk']
                        instance = create_instance(table, parent_instance, code, temp_pk_str, update_dict, request)

# - get instance if update
                    else:

                        update_dict['id']['pk'] = pk_int
                        update_dict['pk'] = pk_int
                        # get_instance adds 'pk' to update_dict['id'] and adds update_dict['pk']
                        instance = get_instance(table, pk_int, parent_instance, update_dict)
                    logger.debug('instance: ' + str(instance))

# update_item, also when it is a created item
                    if instance:
                        # update_scheme adds 'value' 'error' 'updated' to update_dict['fieldname']
                        update_scheme(instance, upload_dict, update_dict, self.request, user_lang)

# --- remove empty attributes from update_dict
                    remove_empty_attr_from_dict(update_dict)
                    if update_dict:
                        item_update_dict[table + '_update'] = update_dict

                    # update schemeitem_list when changes are made
                    if table == 'scheme':
                        include_inactive = True
                        scheme_list = create_scheme_list(instance.order, include_inactive, user_lang)


                        if scheme_list:
                            item_update_dict['scheme_list'] = scheme_list
                    elif table == 'team':
                        team_list = Team.create_team_list(instance.scheme.order)
                        if team_list:
                            item_update_dict['team_list'] = team_list

        # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


@method_decorator([login_required], name='dispatch')
class SchemeOrTeamUploadView(UpdateView):  # PR2019-05-25

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeOrTeamUploadView ============= ')
        logger.debug('request.POST' + str(request.POST))
        # {'upload': ['{"id":{"temp_pk":"new_1","create":true,"ppk":46},"code":{"update":true,"value":"new"}}']}>
        update_dict = {}
        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)
            tblName = ''
            if 'scheme' in request.POST:
                tblName = 'scheme'
            elif 'team' in request.POST:
                tblName = 'team'
            if tblName:
                upload_json = request.POST.get(tblName, None)
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    update_dict = {}
                    if tblName == 'scheme':
                        update_dict = SchemeUpload(request, upload_dict, user_lang)
                    elif tblName == 'team':
                        update_dict = TeamUpload(request, upload_dict)

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


def SchemeUpload(request, upload_dict, user_lang):  # PR2019-05-31
    logger.debug(' --- SchemeUpload --- ')
    logger.debug(upload_dict)
    #  {'id': {'temp_pk': 'new_1', 'create': True, 'parent_pk': 6}, 'code': {'update': True, 'value': 'new'}}

# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    scheme_update_dict = {}
    field_list = ('id', 'order', 'code', 'cycle')
    update_dict = create_dict_with_empty_attr(field_list)

# --- get id_dict  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
    id_dict = upload_dict.get('id')
    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)
# check if parent exists
    order = get_order(request.user.company, parent_pk_int)
# check if scheme exists
    if order:
        scheme = None
        save_changes = False
# ===== Create new scheme
        if 'create' in id_dict:
            # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            if temp_pk_str:
                update_dict['id']['temp_pk'] = temp_pk_str
            scheme = Scheme(order=order)
            scheme.save(request=request)
            if scheme:
                update_dict['id']['created'] = True
                save_changes = True
        else:
# ===== or get existing scheme
            scheme = Scheme.objects.filter(id=pk_int, order=order).first()
        if scheme:
            update_dict['id']['pk'] = scheme.pk
            update_dict['id']['ppk'] = scheme.order.pk
            logger.debug('scheme: ' + str(scheme))
# ===== Delete scheme
        if 'delete' in id_dict and not 'create' in id_dict:
            scheme.delete(request=request)
# check if record still exist
            scheme = Scheme.objects.filter(id=pk_int, order=order).first()
            if scheme is None:
                update_dict['id']['deleted'] = True
            else:
                msg_err = _('This scheme could not be deleted.')
                update_dict['id']['del_err'] = msg_err
        else:
# --- save changes in field 'code' and 'cycle'
            save_changes = False
            field = 'code'
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                new_value = field_dict.get('value')
                saved_value = getattr(scheme, field, None)
                # don't update empty code - it will eras existing code
                if new_value and new_value != saved_value:
                    setattr(scheme, field, new_value)
                    update_dict[field]['updated'] = True
                    save_changes = True
            field = 'cycle'
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                new_value = field_dict.get('value')
                saved_value = getattr(scheme, field, None)
                # code = 0 is valid (oce only), don't skip
                if new_value != saved_value:
                    setattr(scheme, field, new_value)
                    update_dict[field]['updated'] = True
                    save_changes = True
            for field  in ['datefirst', 'datelast']:
                if field in upload_dict:
                    field_dict = upload_dict.get(field)
                    field_value = field_dict.get('value')  # field_value: '2019-04-12'
                    new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
                    if msg_err is not None:
                        update_dict[field]['err'] = msg_err
                    else:
                        saved_date = getattr(scheme, field, None)
                        if new_date != saved_date:
                            setattr(scheme, field, new_date)
                            update_dict[field]['updated'] = True
                        save_changes = True

# --- save changes
        if save_changes:
            scheme.save(request=request)

            for field in update_dict:
                if field == 'code':
                    if scheme.code:
                        update_dict[field]['value'] = scheme.code
                if field == 'cycle':
                    update_dict[field]['value'] = scheme.cycle

# --- update scheme_list
            include_inactive = False
            scheme_list = create_scheme_list(scheme.order, include_inactive, user_lang)
            logger.debug('scheme_list: ' + str(scheme_list))
            if scheme_list:
                scheme_update_dict['scheme_list'] = scheme_list

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    if update_dict:
        scheme_update_dict['scheme_update'] = update_dict

    # update_dict: {'id': {'temp_pk': 'new_1', 'created': True, 'pk': 51, 'parent_pk': 6},
        # 'code': {'updated': True, 'value': 'new'},
        # 'cycle': {'value': 0}}
    return scheme_update_dict


def TeamUpload(request, upload_dict):  # PR2019-05-31
        logger.debug(' --- TeamUpload --- ')
        logger.debug(upload_dict)
        # {'id': {'pk': 104, 'delete': True, 'parent_pk': 20}}
        # {'id': {'temp_pk': 'new_2', 'create': True, 'parent_pk': 20}, 'code': {'update': True, 'value': 'ZZ'}}
# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        team_update_dict = {}
        field_list = ('id', 'scheme', 'code')
        update_dict = create_dict_with_empty_attr(field_list)

# --- get id_dict  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
        id_dict = upload_dict.get('id')
        pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# check if parent exists
        scheme = get_scheme(request.user.company, parent_pk_int)
# check if team exists
        if scheme:
            team = None
            save_changes = False
# ===== Create new team
            if 'create' in id_dict:
                # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
                if temp_pk_str:
                    update_dict['id']['temp_pk'] = temp_pk_str
                team = Team(scheme=scheme)
                team.save(request=request)
                if team:
                    update_dict['id']['created'] = True
                    save_changes = True
            else:
# ===== or get existing team
                team = Team.objects.filter(id=pk_int, scheme=scheme).first()
            if team:
                update_dict['id']['pk'] = team.pk
                update_dict['id']['ppk'] = team.scheme.pk
# ===== Delete team
                if 'delete' in id_dict and not 'create' in id_dict:
                    team.delete(request=request)
# check if record still exist
                    team = Team.objects.filter(id=pk_int, scheme=scheme).first()
                    if team is None:
                        update_dict['id']['deleted'] = True
                    else:
                        msg_err = _('This team could not be deleted.')
                        update_dict['id']['del_err'] = msg_err
                else:
# --- save changes in field 'code'
                    save_changes = False
                    field = 'code'
                    if field in upload_dict:
                        field_dict = upload_dict.get(field)
                        new_value = field_dict.get('value')
                        saved_value = getattr(team, field, None)
                        # don't update empty code - it will eras existing code
                        if new_value and new_value != saved_value:
                            setattr(team, field, new_value)
                            update_dict[field]['updated'] = True
                            save_changes = True
# --- save changes
            if save_changes:
                team.save(request=request)

                for field in update_dict:
                    if field == 'code':
                        if team.code:
                            update_dict[field]['value'] = team.code
# --- update team_list
                team_list = Team.create_team_list(scheme.order)
                if team_list:
                    team_update_dict['team_list'] = team_list

# --- remove empty attributes from update_dict
        remove_empty_attr_from_dict(update_dict)
        if update_dict:
            team_update_dict['team_update'] = update_dict
        # update_dict: {'id': {'temp_pk': 'new_2', 'created': True, 'pk': 109, 'parent_pk': 20},
        #               'code': {'updated': True, 'value': 'ZZ'}}
        # update_dict: {'id': {'pk': 108, 'parent_pk': 20, 'del_err': 'Dit team kon niet worden gewist.'}}

        return team_update_dict


def get_order(company, order_pk):
    order = None
    if order_pk:
        order = Order.objects.filter(id=order_pk,customer__company=company).first()
    return order


def get_scheme(company, scheme_pk):
    scheme = None
    if scheme_pk:
        scheme = Scheme.objects.filter( id=scheme_pk, order__customer__company=company).first()
    return scheme


@method_decorator([login_required], name='dispatch')
class SchemeitemDownloadView(View):  # PR2019-03-10
    # function downloads scheme, teams and schemeitems of selected scheme
    def post(self, request, *args, **kwargs):
        # logger.debug(' ====++++++++==== SchemeItemDownloadView ============= ')
        # logger.debug('request.POST' + str(request.POST) )
        # {'scheme_download': ['{"scheme_pk":18}']}

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                # - Reset language
                # PR2019-03-15 Debug: language gets lost, get request.user.lang again
                user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
                activate(user_lang)

# - get comp_timezone PR2019-06-14
                comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

                if request.POST['scheme_download']:
                    scheme_download = json.loads(request.POST['scheme_download'])
                    # logger.debug('scheme_download: ' + str(scheme_download) + str(type(scheme_download)))
                    # scheme_download: {'scheme_pk': 18}
                    scheme_pk = int(scheme_download.get('scheme_pk', '0'))
                    scheme = Scheme.objects.filter(order__customer__company=request.user.company,
                                                    pk=scheme_pk,
                                                    ).first()
                    if scheme:
                        scheme_dict = {}
                        scheme_dict['id'] = {'pk': scheme.id, 'ppk': scheme.order.id}
                        scheme_dict['code'] = {'value': scheme.code}
                        scheme_dict['cycle'] = {'value': scheme.cycle}
                        scheme_dict['weekend'] = {'value': scheme.weekend}
                        scheme_dict['publicholiday'] = {'value': scheme.publicholiday}
                        scheme_dict['inactive'] = {'value': scheme.inactive}

                        datalists = {'scheme': scheme_dict}
                        # logger.debug('datalists: ' + str(datalists))

                        # create shift_list
                        shift_list = create_shift_list(scheme.order)
                        if shift_list:
                            datalists['shift_list'] = shift_list

                        # create team_list
                        team_list = Team.create_team_list(scheme.order)
                        if team_list:
                            datalists['team_list'] = team_list

                        # create schemeitem_list
                        schemeitem_list = create_schemeitem_list(scheme.order, comp_timezone, user_lang)
                        if schemeitem_list:
                            datalists['schemeitem_list'] = schemeitem_list
                            # shift_list.sort()
                            datalists['shift_list'] = shift_list

                        # today is used for new schemeitem without previous rosterday
                        today_dict = {'value': str(date.today()),
                                      'wdm': get_date_WDM_from_dte(date.today(), user_lang),
                                      'wdmy': format_WDMY_from_dte(date.today(), user_lang),
                                      'dmy': format_DMY_from_dte(date.today(), user_lang),
                                      'offset': get_weekdaylist_for_DHM(date.today(), user_lang)}

                        datalists['today'] = today_dict

                        datalists['months'] = MONTHS_ABBREV[user_lang]
                        datalists['weekdays'] = WEEKDAYS_ABBREV[user_lang]

        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        # logger.debug('datalists_json:')
        # logger.debug(str(datalists_json))

        # {"scheme": {"pk": 18, "code": "MCB scheme", "cycle": 7, "weekend": 1, "publicholiday": 1, "inactive": false},
        #  "team_list": [{"pk": 1, "code": "Team A"}],
        #  "schemeitem_list": [{"pk": 4, "rosterdate": "2019-04-27", "shift": ""},
        #                      {"pk": 5, "rosterdate": "2019-04-27", "shift": ""},

        return HttpResponse(datalists_json)

@method_decorator([login_required], name='dispatch')
class SchemeitemFillView(UpdateView):  # PR2019-06-05

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeitemFillView ============= ')

        item_update_dict = {}

        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            logger.debug('request.POST: ' + str(request.POST))

# - get "schemeitem_dayup" schemeitem_daydown "schemeitem_fill"
            parameter = ''
            if 'schemeitem_autofill' in request.POST:
                parameter = 'schemeitem_autofill'
            elif 'schemeitem_dayup' in request.POST:
                parameter = 'schemeitem_dayup'
            elif 'schemeitem_daydown' in request.POST:
                parameter = 'schemeitem_daydown'
            logger.debug('parameter: ' + str(parameter))

# - get upload_dict from request.POST
            upload_json = request.POST.get(parameter, None)
            if upload_json:
            # upload_dict: {'scheme_pk': 19}
                upload_dict = json.loads(upload_json)
                scheme_pk = upload_dict.get('scheme_pk')

            # get scheme
                scheme = None
                cycle = 0
                scheme_datefirst = None
                scheme_datelast = None

                schemeitem_list = []
                has_new_schemeitem = False

                if scheme_pk:
                    scheme = Scheme.objects.filter(id=scheme_pk, order__customer__company=request.user.company).first()
                logger.debug('scheme: ' + str(scheme))

                if scheme:
                # get info from scheme
                    if scheme.cycle:
                        cycle = scheme.cycle
                    if scheme.datefirst:
                        scheme_datefirst = scheme.datefirst
                    if scheme.datelast:
                        scheme_datelast = scheme.datelast

# --- Autofill
                    if parameter == 'schemeitem_autofill':
                        if cycle > 1:
            # create list of schemeitems of scheme of this order, exept this scheme  PR2019-05-12
                            schemeitems = Schemeitem.objects.filter(scheme__order=scheme.order).exclude(scheme=scheme)
                            for schemeitem in schemeitems:
                                schemeitem_dict = Schemeitem.create_schemeitem_dict(schemeitem, comp_timezone, user_lang)
                                schemeitem_list.append(schemeitem_dict)
                                logger.debug('other schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                                logger.debug('other id_dict: ' + str(schemeitem_dict.get('id')))

            # get first_rosterdate and last_rosterdate from schemeitems of this scheme
                            schemeitems = Schemeitem.objects.filter(scheme=scheme)
                            first_rosterdate = None
                            last_rosterdate = None
                            enddate_plusone = None
                            date_add = 0
                            for schemeitem in schemeitems:

            # append existing schemeitems to schemeitem_list
                                # schemeitem, user_lang, temp_pk=None, is_created=False, is_deleted=False, updated_list=None):
                                schemeitem_dict = Schemeitem.create_schemeitem_dict(schemeitem, comp_timezone, user_lang)
                                schemeitem_list.append(schemeitem_dict)
                                logger.debug('existing schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                                logger.debug('existing id_dict: ' + str(schemeitem_dict.get('id')))

            # get number of days between first_rosterdate and last_rosterdate_plusone
                                if first_rosterdate is None or schemeitem.rosterdate < first_rosterdate:
                                    first_rosterdate = schemeitem.rosterdate
                                if last_rosterdate is None or schemeitem.rosterdate > last_rosterdate:
                                    last_rosterdate = schemeitem.rosterdate
                                date_add = get_date_diff_plusone(first_rosterdate, last_rosterdate)
                                enddate_plusone = first_rosterdate + timedelta(days=cycle)
                                logger.debug('date_add: ' + str(date_add))

                            if date_add > 0:
                                for n in range(scheme.cycle): # range(6) is the values 0 to 5.
                                    for schemeitem in schemeitems:
                                        days = (date_add * (n + 1))
                                        new_rosterdate = schemeitem.rosterdate + timedelta(days=days)

                        # check date range of scheme
                                        in_range = date_within_range(scheme_datefirst, scheme_datelast, new_rosterdate)
                                        if in_range:
                                            if new_rosterdate < enddate_plusone:
                        # create new schemeitem, with same base as copied schemeitem

                                            # get new_schemeitem.time_start
                                                new_time_start = None
                                                if new_rosterdate and schemeitem.timestartdhm:
                                                    new_time_start = get_datetimelocal_from_DHM(
                                                        new_rosterdate, schemeitem.timestartdhm, comp_timezone)
                                            # get new_schemeitem.time_start
                                                new_time_end = None
                                                if new_rosterdate and schemeitem.timeenddhm:
                                                    new_time_end = get_datetimelocal_from_DHM(
                                                        new_rosterdate, schemeitem.timeenddhm, comp_timezone)
                                            # get new_schemeitem.timeduration
                                                new_timeduration = None
                                                if new_time_start and new_time_end:
                                                    new_timeduration = get_time_minutes(
                                                        new_time_start,
                                                        new_time_end,
                                                        schemeitem.breakduration)

                                            # create new schemeitem
                                                new_schemeitem = Schemeitem(
                                                    base=schemeitem.base,
                                                    scheme=schemeitem.scheme,
                                                    rosterdate=new_rosterdate,
                                                    team=schemeitem.team,
                                                    shift=schemeitem.shift,
                                                    timestartdhm=schemeitem.timestartdhm,
                                                    timestart=new_time_start,
                                                    timeenddhm = schemeitem.timeenddhm,
                                                    timeend = new_time_end,
                                                    breakduration=schemeitem.breakduration,
                                                    timeduration=new_timeduration
                                                )

                                                new_schemeitem.save(request=self.request)
                                                logger.debug('new schemeitem: ' + str(new_schemeitem.pk) + ' ' + str(new_schemeitem.rosterdate))
                                                has_new_schemeitem = True

                    # append new schemeitem to schemeitem_list, with attr 'created'
                                                # schemeitem, user_lang, temp_pk=None, is_created=False, is_deleted=False, updated_list=None):
                                                schemeitem_dict = Schemeitem.create_schemeitem_dict(new_schemeitem, comp_timezone, user_lang)
                                                schemeitem_list.append(schemeitem_dict)
                                                logger.debug('new id_dict: ' + str(schemeitem_dict.get('id')))

# --- Dayup Daydown
                    elif parameter in ['schemeitem_dayup', 'schemeitem_daydown']:
                        date_add = -1 if parameter == 'schemeitem_dayup' else 1
                        logger.debug('date_add: ' + str(date_add) + ' type: ' + str(type(date_add)))
                        schemeitems = Schemeitem.objects.filter(scheme=scheme)
                        for schemeitem in schemeitems:

                    # change rosterdate, update
                            new_rosterdate = schemeitem.rosterdate + timedelta(days=date_add)
                            logger.debug('new_rosterdate: ' + str(new_rosterdate) + ' type: ' + str(type(new_rosterdate)))

                            schemeitem.rosterdate = new_rosterdate
                    # update timestart, timeend, timeduration
                            if schemeitem.timestartdhm:
                                schemeitem.time_start = get_datetimelocal_from_DHM(
                                    new_rosterdate,
                                    schemeitem.timestartdhm,
                                    comp_timezone)
                            if schemeitem.timeend:
                                schemeitem.timeend = get_datetimelocal_from_DHM(
                                    new_rosterdate,
                                    schemeitem.timeenddhm,
                                    comp_timezone)

                            schemeitem.timeduration = get_time_minutes(
                                schemeitem.timestart,
                                schemeitem.timeend,
                                schemeitem.breakduration)
                    # save schemeitem
                            schemeitem.save(request=self.request)
                            logger.debug('schemeitem.rosterdate: ' + str(schemeitem.rosterdate))

                        schemeitem_list = Schemeitem.create_schemeitem_list(scheme.order, comp_timezone, user_lang)

                if has_new_schemeitem:
                    item_update_dict['item_update'] = {'created': True}
                if schemeitem_list:
                    item_update_dict['schemeitem_list'] = schemeitem_list

        return HttpResponse(json.dumps(item_update_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class SchemeItemUploadView(UpdateView):  # PR2019-06-01
    # also for teammembers
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeItemUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

    # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            logger.debug('comp_timezone: ' + str(comp_timezone))


# - get upload_dict from request.POST
            upload_dict = {}
            upload_json = request.POST.get('schemeitem_upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))

                # upload_dict: {'id': {'temp_pk': 'new_4', 'create': True, 'parent_pk': 82, 'table': 'teammembers'},
                #             'team': {'update': True, 'value': 'PLoeg B', 'pk': 82},
                #         'employee': {'update': True, 'value': 'Arlienne', 'pk': 282}}

                # upload_dict: {'id': {'pk': 682, 'parent_pk': 19}, 'rosterdate': {'value': '2019-04-03', 'update': True}}

                # upload_dict:  {'id': {'temp_pk': 'new_6', 'create': True, 'parent_pk': 2, 'table': 'schemeitems'},
                # 'rosterdate': {'update': True, 'value': '2019-06-12'},
                # 'shift':      {'update': True, 'value': 'av'},
                # 'team':       {'update': True}}

            pk_int = 0
            parent_pk_int = 0
            temp_pk_str = ''
            is_create = False
            is_delete = False
            tablename = ''
            msg_err = ''

            scheme = None
            team = None
            employee = None
            schemeitem = None
            teammember = None

            shift_list = []
            team_list = []
            update_dict = {}

# - get_iddict_variables, put id_dict in update_dict
            id_dict = upload_dict.get('id')
            if id_dict:
                pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)
                # id_dict is added to update_dict after check if parent_exists and item_exists
            logger.debug('id_dict: ' + str(id_dict))
            # id_dict: {'temp_pk': 'new_3', 'create': True, 'parent_pk': 2, 'table': 'schemeitems'}
            # id_dict: {'pk': 178, 'parent_pk': 6, 'table': 'schemeitems'}

# - Create empty update_dict with keys for all fields if not exist. Unused ones will be removed at the end
              # this one is not working: update_dict = dict.fromkeys(field_list, {})
            field_list = ()
            if tablename == 'schemeitems':
                field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                              'timestart', 'timeend', 'timeduration', 'breakduration')
            elif tablename == 'teammembers':
                field_list = ('id', 'team', 'employee', 'datefirst', 'datelast')
            update_dict = create_dict_with_empty_attr(field_list)
            logger.debug('update_dict: ' + str(update_dict))

# - check if parent exists (scheme is parent of schemeitem, team is parent of teammember (and scheme is parent of team)
            parent_exists = False
            if parent_pk_int:
                if tablename == 'schemeitems':
                    scheme = Scheme.objects.filter(id=parent_pk_int, order__customer__company=request.user.company).first()
                    if scheme:
                        parent_exists = True
                elif tablename == 'teammembers':
                    team = Team.objects.filter( id=parent_pk_int,scheme__order__customer__company=request.user.company).first()
                    if team:
                        scheme = team.scheme
                        parent_exists = True
            if parent_exists:
                update_dict['id']['ppk'] = parent_pk_int
                update_dict['id']['table'] = tablename

# check if item exists
            item_exists = False
            if pk_int and parent_exists and not is_create:
                if tablename == 'schemeitems':
                    schemeitem = Schemeitem.objects.filter(id=pk_int, scheme=scheme).first()
                    if schemeitem:
                        item_exists = True
                elif tablename == 'teammembers':
                    teammember = Teammember.objects.filter(id=pk_int, team=team).first()
                    if teammember:
                        item_exists = True
                if item_exists:
                    update_dict['id']['pk'] = pk_int
                    # logger.debug('item_exists: ' + str(update_dict))
            logger.debug('update_dict: ' + str(update_dict))

# - check if employee exists - employee is required field of teammember, is skipped in schemeitems (no field employee)
            employee_exists = False
            if tablename == 'teammembers':
                employee_dict = upload_dict.get('employee')
                if employee_dict:
                    employee_pk = employee_dict.get('pk')
                    if employee_pk:
                        employee = Employee.objects.filter(id=employee_pk, company=request.user.company).first()
                        if employee:
                            employee_exists = True

# ===== Delete schemeitem
            if is_delete:
                if item_exists:
                    item_exists = False
                    if tablename == 'schemeitems':
                        schemeitem.delete(request=self.request)
            # check if record still exists
                        schemeitem = Schemeitem.objects.filter(id=pk_int, scheme=scheme).first()
                        if schemeitem is None:
                            update_dict['id']['deleted'] = True
                        else:
                            msg_err = _('This shift could not be deleted.')
                            update_dict['id']['del_err'] = msg_err
                    elif tablename == 'teammembers':
                        teammember.delete(request=self.request)
            # check if record still exists
                        teammember = Teammember.objects.filter(id=pk_int, team=team).first()
                        if teammember is None:
                            update_dict['id']['deleted'] = True
                        else:
                            msg_err = _('This teammember could not be deleted.')
                            update_dict['id']['error'] = msg_err

# === Create new schemeitem or teammember
            elif is_create:
                if parent_exists:
                    if tablename == 'schemeitems':
                        logger.debug('Create new schemeitem: ')

                        is_update, rosterdate_str = get_fielddict_variables(upload_dict, 'rosterdate')
                        rosterdate, msg_err = get_date_from_str(rosterdate_str, True)
                        # logger.debug('Create  schemeitem rosterdate: ' + str(rosterdate) + ' type' + str(type(rosterdate)))
                        if msg_err:
                            update_dict['rosterdate']['error'] = msg_err
                        else:

        # When new schemeitems record: First create base record. base.id is used in SchemeItem. Create also saves new record
                            base = Schemeitembase.objects.create()
                            schemeitem = Schemeitem(base=base, scheme=scheme, rosterdate=rosterdate)
                            schemeitem.save(request=self.request)
                            test_pk_int = schemeitem.pk

                        # check if record exists
                            schemeitem = Schemeitem.objects.filter(id=test_pk_int, scheme=scheme).first()
                            if schemeitem:
                                # logger.debug('created schemeitem: ' + str(schemeitem))
                                item_exists = True
                                pk_int = schemeitem.pk

                                update_dict['rosterdate']['updated'] = True
                                set_fielddict_date(update_dict['rosterdate'], schemeitem.rosterdate, user_lang)

        # Subtract 1 from company.balance
                                # TODO change: ---  after saving new record: subtract 1 from company.balance
                                # request.user.company.balance -= 1
                                request.user.company.save(request=self.request)

                    elif tablename == 'teammembers':
                        if employee_exists:
# check if this employee already existst in this team
                            msg_err = Teammember.validate_employee_exists_in_teammembers(employee, team, 0)
                            if not msg_err:
                    # create new teammember with this team and this employee
                                teammember = Teammember(team=team, employee=employee)
                                teammember.save(request=self.request)
                                test_pk_int = teammember.pk
                    # check if record exists
                                teammember = Teammember.objects.filter(id=test_pk_int, team=team).first()
                                if teammember:
                                    item_exists = True
                                    pk_int = teammember.pk

                    if not item_exists:
                        if not msg_err:
                            msg_err = _('This item could not be created.')
                        update_dict['id']['error'] = msg_err
                    else:
                        update_dict['id']['created'] = True
                        update_dict['id']['pk'] = pk_int
                        update_dict['id']['ppk'] = parent_pk_int
                    # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
                        if temp_pk_str:
                            update_dict['id']['temp_pk'] = temp_pk_str

                        if tablename == 'teammembers':
                # also create team dict, for display in table
                            update_dict['team']['pk'] = teammember.team.pk
                            update_dict['team']['value'] = teammember.team.code
                            update_dict['team']['updated'] = True

                            # also create employee dict, for display in table
                            update_dict['employee']['pk'] = teammember.employee.pk
                            update_dict['employee']['value'] = teammember.employee.code
                            update_dict['employee']['updated'] = True

            logger.debug('new update_dict: ' + str(update_dict))

# update_schemeitem
            if item_exists:
                if tablename == 'schemeitems':
                    update_schemeitem(scheme, schemeitem, upload_dict, update_dict, self.request, comp_timezone, user_lang)
                    schemeitem.save(request=self.request)

                elif tablename == 'teammembers':
                    update_teammember(teammember, team, upload_dict, update_dict, self.request, user_lang)
                    teammember.save(request=self.request)

            logger.debug('>> update_dict: ' + str(update_dict))

# --- remove empty attributes from update_dict
            remove_empty_attr_from_dict(update_dict)
            if update_dict:
                item_update_dict['item_update'] = update_dict

            # update schemeitem_list when changes are made
            if tablename == 'schemeitems':
                schemeitem_list = Schemeitem.create_schemeitem_list(scheme.order, comp_timezone, user_lang)
                if schemeitem_list:
                    item_update_dict['schemeitem_list'] = schemeitem_list

         # update shift_list
                shift_list = Schemeitem.create_shift_list(scheme.order)
                if shift_list:
                    item_update_dict['shift_list'] = shift_list

        # update team_list
                team_list = Team.create_team_list(scheme.order)
                if team_list:
                    item_update_dict['team_list'] = team_list

            elif tablename == 'teammembers':
                teammember_list = Teammember.create_teammember_list(scheme.order, user_lang)
                if teammember_list:
                    item_update_dict['teammember_list'] = teammember_list

        return HttpResponse(json.dumps(item_update_dict, cls=LazyEncoder))


# === EmplhourView ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class EmplhourView(View):

    def get(self, request):
        param = {}
        # logger.debug(' ============= EmplhourView ============= ')
        if request.user.company is not None:
            datefirst = None
            datelast = None
            crit = (Q(orderhour__order__customer__company=request.user.company) | Q(employee__company=request.user.company))
            if datefirst:
                crit.add(Q(rosterdate__gte=datefirst), crit.connector)
            if datelast:
                crit.add(Q(rosterdate__lte=datelast), crit.connector)
            #emplhours = Emplhour.objects.filter(crit)
            emplhours = Emplhour.objects.all()

            for emplhour in emplhours:
                string = str(emplhour.id)
                if emplhour.rosterdate:
                    string += ' - rosterdate: ' + str(emplhour.rosterdate)
                if emplhour.orderhour:
                    string += ' - order: ' + str(emplhour.orderhour.order.code)
                # logger.debug(string)

            employees = Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
            employee_list = []
            for employee in employees:
                employee_list.append({'pk': employee.id, 'code': employee.code})
            employee_json = json.dumps(employee_list)

            # get weekdays translated
            lang = request.user.lang if request.user.lang else LANG_DEFAULT
            if not lang in WEEKDAYS_ABBREV:
                lang = LANGUAGE_CODE
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[lang])

            # get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

            # get timeformat
            timeformat = 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in TIMEFORMATS:
                timeformat = '24h'

            # get quicksave from Usersetting
            quicksave = 0
            quicksave_str = Usersetting.get_setting(KEY_USER_QUICKSAVE, request.user)
            if quicksave_str:
                quicksave = int(quicksave_str)

            param = get_headerbar_param(request, {
                'items': emplhours,
                'employee_list': employee_json,
                'lang': lang,
                'weekdays': weekdays_json,
                'interval': interval,
                'quicksave': quicksave,
                'timeformat': timeformat
            })
            logger.debug(param)
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'emplhours.html', param)


@method_decorator([login_required], name='dispatch')
class EmplhourFillRosterdateView(UpdateView):  # PR2019-05-26

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourFillRosterdateView ============= ')

        update_dict = {}
        if request.user is not None and request.user.company is not None:
# - reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)
# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            logger.debug('request.POST: ' + str(request.POST))

# set emplhour period
            period_dict = None
            if 'emplhour_period' in request.POST:
                period_dict = json.loads(request.POST['emplhour_period'])
                # emplh_period: {'timestart': '2019-06-18T00:00:00', 'length: '0;0;1;12', (y-m-d-h, 0=all)
                # 'interval: '6', 'hour
                # 'offset: -2 'hour
                # auto: True}

                if 'timestart' in period_dict:
                    pass
                if 'range' in period_dict:
                    pass
                if 'interval' in period_dict:
                    pass
                if 'auto' in period_dict:
                    pass
                if 'overlap' in period_dict:
                    pass

                # update emplhour_period in usersettings
                Usersetting.set_setting(KEY_USER_EMPLHOUR_PERIOD, dict, request.user)

            else:
                period_dict = Usersetting.get_setting(KEY_USER_EMPLHOUR_PERIOD, request.user)
                if period_dict is None:
                    period_dict = Company.get_setting(KEY_USER_EMPLHOUR_PERIOD, request.user)
                    if period_dict is None:
                        today_utc = get_rosterdate_utc(date.today())
                        today_midnight_local = get_rosterdate_midnight_local(today_utc,comp_timezone)
                        period_dict = {}
                        period_dict['timestart'] = today_midnight_local
                        period_dict['range'] = '0;0;1;0'
                        period_dict['interval'] = 6
                        period_dict['auto'] = True
                        period_dict['overlap'] = 0
                logger.debug(str(period_dict))
                # {'timestart': datetime.datetime(2019, 7, 9, 0, 0, tzinfo=<DstTzInfo 'Europe/Amsterdam' CEST+2:00:00 DST>),
                # 'range': '0;0;1;0',
                # 'interval': 6,
                # 'auto': True,
                # 'overlap': -2}

            if 'rosterdate_fill' in request.POST:
                rosterdate_fill_dict = json.loads(request.POST['rosterdate_fill'])
                # rosterdate_fill_dict: {'fill': '2019-06-18'} type: <class 'dict'>

                rosterdate_fill = None
                rosterdate_remove = None
                if 'fill' in rosterdate_fill_dict:
                    rosterdate_str = rosterdate_fill_dict['fill']
                    rosterdate_fill_dte, msg_txt = get_date_from_str(rosterdate_str)

                    FillRosterdate(rosterdate_fill_dte, request, comp_timezone)

                # update rosterdate_current in companysettings
                    Companysetting.set_setting(KEY_COMP_ROSTERDATE_CURRENT, rosterdate_fill_dte, request.user.company)
                    update_dict['rosterdate'] = get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)

                elif 'remove' in rosterdate_fill_dict:
                    rosterdate_str = rosterdate_fill_dict['remove']
                    rosterdate_remove_dte, msg_txt = get_date_from_str(rosterdate_str)
                    RemoveRosterdate(rosterdate_remove_dte, request, comp_timezone)

                # update rosterdate_current in companysettings
                    rosterdate_current_dte = rosterdate_remove_dte + timedelta(days=-1)
                    Companysetting.set_setting(KEY_COMP_ROSTERDATE_CURRENT, rosterdate_current_dte, request.user.company)
                    update_dict['rosterdate'] = get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)

                datefirst = None
                datelast = None
                list = create_emplhour_list(datefirst, datelast, request.user.company, comp_timezone, user_lang)
                if list:
                    update_dict['emplhour'] = list

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


@method_decorator([login_required], name='dispatch')
class EmplhourUploadView(UpdateView):  # PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourUploadView ============= ')

        # --- Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        field_list = ('id', 'rosterdate', 'order', 'employee', 'shift',
                      'timestart', 'timeend', 'breakduration', 'timeduration', 'timestatus',
                       'orderhourduration', 'orderhourstatus', 'modifiedby', 'modifiedat')
        update_dict = create_dict_with_empty_attr(field_list)

        if request.user is not None and request.user.company is not None:
            # --- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

            # - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            if 'emplhour_upload' in request.POST:
                # emplhour_upload: {'pk': 'new_1', 'rosterdate': '2019-04-01'}
                # emplhour_upload: {'pk': '16', 'order': 2}
                # emplhour_upload: {'pk': '19', 'timestatus': 3}
                emplhour_upload = json.loads(request.POST['emplhour_upload'])
                if emplhour_upload is not None:
                    logger.debug('emplhour_upload: ' + str(emplhour_upload))
                    emplhour = None

# ++++ check if a record with this pk exists
                    if 'pk' in emplhour_upload and emplhour_upload['pk']:
        # --- check if it is new record, get company if is existing record
                        # new_record has pk 'new_1' etc
                        if emplhour_upload['pk'].isnumeric():
                            pk_int = int(emplhour_upload['pk'])
                            emplhour = Emplhour.objects.filter(id=pk_int, employee__company=request.user.company).first()
                        else:
                            # this attribute 'new': 'new_1' is necessary to lookup request row on page
                            update_dict['id']['new'] = emplhour_upload['pk']
                            # update_dict: {'id': {'new': 'new_1'}, 'code': {},...

# ++++ save new record ++++++++++++++++++++++++++++++++++++
                        if emplhour is None:
                            # --- add record i
                            emplhour = Emplhour(employee__company=request.user.company)
                            emplhour.save(request=self.request)

        # ---  after saving new record: subtract 1 from company.balance
                            # TODO change to companyinvoice request.user.company.balance -= 1
                            request.user.company.save(request=self.request)

# ++++ existing and new emplhour ++++++++++++++++++++++++++++++++++++
                        if emplhour is not None:
        # --- add pk to update_dict
                            pk_int = emplhour.pk
                            update_dict['id']['pk'] = pk_int

                            save_changes = False
# ++++  delete record when key 'delete' exists in
                            if 'delete' in emplhour_upload:
                                emplhour.delete(request=self.request)
        # --- check if emplhour still exist
                                emplhour = Emplhour.objects.filter(id=pk_int, employee__company=request.user.company).first()
                                if emplhour is None:
                                    update_dict['id']['deleted'] = True
                                else:
                                    msg_err = _('This item could not be deleted.')
                                    update_dict['id']['del_err'] = msg_err

                            else:
# ++++  not a deleted record
# --- save changes in field order, employee and shift
                                for field in ('order', 'employee', 'shift'):
                                    if field in emplhour_upload:
                                        logger.debug('field ' + str(field))
                                        logger.debug('emplhour_upload ' + str(emplhour_upload))

                                        pk_obj = int(emplhour_upload[field])
                                        object = None
                                        if field == 'order':
                                            object = Order.objects.filter(
                                                id=pk_obj,
                                                customer__company=request.user.company
                                            ).first()
                                            logger.debug('object ' + str(object))
                                        elif field == 'employee':
                                            object = Employee.objects.filter(
                                                id=pk_obj,
                                                company=request.user.company
                                            ).first()
                                        elif field == 'shift':
                                            pass
                                            # TODO
                                            #object = Shift.objects.filter(
                                            #    id=pk_obj,
                                            #    company=request.user.company
                                            #).first()
                                        if object:
                                            logger.debug('setattr object' + str(object))
                                            setattr(emplhour, field, object)
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('after setattr object' + str(object))

# --- save changes in date fields
                                for field  in ('rosterdate',):
                                    if field in emplhour_upload:
                                        logger.debug('field ' + str(field))
                                        logger.debug('emplhour_upload ' + str(emplhour_upload))

                                        new_date, msg_err = get_date_from_str(emplhour_upload[field], True) # True = blank_not_allowed
                                        logger.debug('new_date: ' + str(new_date) + str(type(new_date)))
                                        # check if date is valid (empty date is ok)
                                        if msg_err is not None:
                                            update_dict[field]['err'] = msg_err
                                        else:
                                            saved_date = getattr(emplhour, field, None)
                                            logger.debug('saved_date: ' + str(saved_date) + str(type(saved_date)))
                                            if new_date != saved_date:
                                                logger.debug('save date: ' + str(new_date) + str(type(new_date)))
                                                setattr(emplhour, field, new_date)
                                                update_dict[field]['upd'] = True
                                                save_changes = True

# --- save changes in time fields
                                # emplhour_upload: {'pk': '16', 'timestart': '0;17;12'}
                                for field in ('timestart', 'timeend'):
                                    if field in emplhour_upload:
                                        if ';' in emplhour_upload[field]:
                                            arr = emplhour_upload[field].split(';')
                                            day_offset = int(arr[0])
                                            new_hour = int(arr[1])
                                            new_minute = int(arr[2])

                                            msg_err = None
                                            # TODO check if date is valid (empty date is ok)
                                            if msg_err is not None:
                                                update_dict[field]['err'] = msg_err
                                            else:
                                                # emplhour_upload: {'pk': '26', 'timestart': '1;4;48'}
                                                saved_datetime = getattr(emplhour, field, None)
                                                # saved_datetime: 2019-03-30 03:48:00+00:00
                                                logger.debug('saved_datetime: ' + str(saved_datetime))
                                                # get rosterdate when no saved_datetime
                                                dt_naive = None
                                                if saved_datetime is None:
                                                    if emplhour.rosterdate is not None:
                                                        dt_naive = datetime(emplhour.rosterdate.year,
                                                                            emplhour.rosterdate.month,
                                                                            emplhour.rosterdate.day,
                                                                            new_hour,
                                                                            new_minute)
                                                else:
                                                    saved_datetime_aware = get_datetimelocal_from_datetimeUTC(saved_datetime, comp_timezone)
                                                    # saved_datetime_aware: 2019-03-30 04:48:00+01:00
                                                    logger.debug('saved_datetime_aware: ' + str(saved_datetime_aware))

                                                    offset_datetime = saved_datetime_aware + timedelta(days=day_offset)
                                                    # offset_datetime: 2019-03-31 04:48:00+01:00
                                                    logger.debug('offset_datetime: ' + str(offset_datetime))

                                                    dt_naive = datetime(offset_datetime.year,
                                                                        offset_datetime.month,
                                                                        offset_datetime.day,
                                                                        new_hour,
                                                                        new_minute)
                                                # dt_naive: 2019-03-31 04:48:00
                                                logger.debug( 'dt_naive: ' + str(dt_naive))

                                                # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
                                                timezone = pytz.timezone(comp_timezone)
                                                # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
                                                logger.debug( 'timezone: ' + str(timezone) + str( type(timezone)))

                                                dt_localized = timezone.localize(dt_naive)
                                                # dt_localized: 2019-03-31 04:48:00+02:00
                                                logger.debug('dt_localized: ' + str(dt_localized))

                                                utc = pytz.UTC
                                                dt_as_utc = dt_localized.astimezone(utc)
                                                # dt_as_utc: 2019-03-31 02:48:00+00:00
                                                logger.debug( 'dt_as_utc: ' + str(dt_as_utc))

                                                setattr(emplhour, field, dt_as_utc)
                                                update_dict[field]['upd'] = True
                                                save_changes = True
                                                emplhour.save(request=self.request)
                                                # datetimesaved: 2019-03-31 02:48:00+00:00
                                                logger.debug('datetimesaved: ' + str(getattr(emplhour, field, None)))
# --- save changes in breakduration field
                                for field in ('timeduration', 'breakduration',):
                                    # emplhour_upload: {'pk': '18', 'breakduration': '0.5'}
                                    if field in emplhour_upload:
                                        logger.debug('emplhour_upload[' + field + ']: ' + str(emplhour_upload[field]))
                                        value_str = emplhour_upload[field]
                                        logger.debug('value_str: <' + str(value_str) + '> type: ' + str(type(value_str)))
                                        logger.debug([value_str])

                                        # replace comma by dot
                                        value_str = value_str.replace(',', '.')
                                        value_str = value_str.replace(' ', '')
                                        value_str = value_str.replace("'", "")
                                        value = float(value_str) if value_str != '' else 0

                                        # duration unit in database is minutes
                                        new_value = 60 * value
                                        logger.debug('new_value ' + str(new_value) + ' ' + str(type(new_value)))
                                        saved_value = getattr(emplhour, field, None)
                                        logger.debug('saved_value[' + field + ']: ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            logger.debug('setattr ' + str(new_value))
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('update_dict[' + field + ']: ' + str(update_dict[field]))
                                #TODO: change end time whem timeduration has changed
# --- save changes in other fields
                                for field in ('timestatus', 'orderhourstatus'):
                                    if field in emplhour_upload:
                                        logger.debug('emplhour_upload[' + field + ']: ' + str(emplhour_upload[field]))
                                        new_value = int(emplhour_upload[field])
                                        logger.debug('new_value ' + str(new_value))
                                        saved_value = getattr(emplhour, field, None)
                                        logger.debug('saved_value ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            logger.debug('setattr ' + str(new_value))
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('update_dict[field] ' + str(update_dict[field]))


# --- calculate working hours
                                if save_changes:
                                    logger.debug('calculate working hours')
                                    if emplhour.timestart and emplhour.timeend:
                                        # duration unit in database is minutes
                                        saved_break_minutes = int(getattr(emplhour, 'breakduration', 0))
                                        logger.debug('saved_breakduration: ' + str(saved_break_minutes) +  str(type(saved_break_minutes)))

                                        datediff = emplhour.timeend - emplhour.timestart
                                        logger.debug('datediff: ' + str(datediff) +  str(type(datediff)))
                                        datediff_minutes = (datediff.total_seconds() / 60)
                                        logger.debug('datediff_minutes: ' + str(datediff_minutes) +  str(type(datediff_minutes)))
                                        new_time_minutes = datediff_minutes - saved_break_minutes
                                        logger.debug('new_time_minutes: ' + str(new_time_minutes) +  str(type(new_time_minutes)))

                                        saved_time_minutes = getattr(emplhour, 'timeduration', 0)
                                        logger.debug('saved_time_minutes: ' + str(saved_time_minutes) + str(type(saved_time_minutes)))

                                        if new_time_minutes != saved_time_minutes:
                                            emplhour.timeduration = new_time_minutes
                                            update_dict['timeduration']['upd'] = True
                                            save_changes = True

                                            #logger.debug('timeduration: ' + str(emplhour.timeduration) + str(type(emplhour.timeduration)))
# --- save changes
                                if save_changes:
                                    emplhour.save(request=self.request)
                                    logger.debug('changes saved ')
                                    for field in update_dict:
                                        saved_value = None
                                        saved_html = None
                                        # 'upd' has always value True, or it does not exist
                                        if 'upd' in update_dict[field]:
                                            try:
                                                if field == 'order':
                                                    saved_value = emplhour.order.code
                                                elif field == 'employee':
                                                    saved_value = emplhour.employee.code
                                                elif field == 'shift':
                                                    saved_value = emplhour.shift.code
                                                elif field == 'timestart':
                                                    saved_value = emplhour.timestart_datetimelocal
                                                    saved_html = emplhour.timestartdhm
                                                elif field == 'timeend':
                                                    saved_value = emplhour.timeend_datetimelocal
                                                    saved_html = emplhour.timeenddhm
                                                elif field == 'timeduration':
                                                    saved_value = emplhour.time_hours
                                                elif field == 'breakduration':
                                                    saved_value = emplhour.breakhours
                                                else:
                                                    saved_value = getattr(emplhour, field, None)
                                            except:
                                                pass
                                        if saved_value:
                                            update_dict[field]['val'] = saved_value
                                            if saved_html:
                                                update_dict[field]['html'] = saved_html

# --- remove empty attributes from update_dict
        remove_empty_attr_from_dict(update_dict)

        row_update = {'row_update': update_dict}
        # row_update = {'row_update': {'idx': {'pk': '1'}, 'code': {'status': 'upd'}, 'modifiedby': {'val': 'Hans'},
        #              'modifiedat': {'val': '29 mrt 2019 10.20u.'}}}

        logger.debug('row_update: ')
        logger.debug(str(row_update))
        row_update_json = json.dumps(row_update, cls=LazyEncoder)
        logger.debug(str(row_update_json))

        return HttpResponse(row_update_json)


@method_decorator([login_required], name='dispatch')
class EmplhourDownloadDatalistView(View):  # PR2019-03-10
    # function updates employee, customer and shift list
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourDownloadDatalistView ============= ')
        # logger.debug('request.POST' + str(request.POST) )

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                # request.POST:
                # datalist_download = {"rosterdatefirst": rosterdatefirst, 'rosterdatelast': rosterdatelast}

                rosterdate_first = None
                rosterdate_last = None
                # filter roster dat in Javascript
                # employees in range of rosterdate_first rosterdate_last
                #                rosterdate_first-----------------------rosterdate_last
                #   datefirst-------------------------datelast
                #
                #  datelast >= rosterdate_first | rosterdate_first = None | datelast = None
                #  &
                #  datefirst <= rosterdate_last | rosterdate_last = None | datefirst = None
                #  &
                #  company = request.user.company &  inactive=False

                #filters =  Q(company=request.user.company) & Q(inactive=False)
                #if rosterdate_first:
                #    filters = filters & (Q(datelast__gte=rosterdate_first) | Q(datelast=None))
                #if rosterdate_last:
                #    filters = filters & (Q(datefirst__lte=rosterdate_last) | Q(datefirst=None))


                orders = Order.objects.filter(customer__company=request.user.company, inactive=False).order_by(Lower('code'))
                order_list = []
                for order in orders:
                    dict = {'pk': order.id, 'code': order.code}
                    if order.datefirst:
                        dict['datefirst'] = order.datefirst
                    if order.datelast:
                        dict['datelast'] = order.datelast
                    order_list.append(dict)

                employees = Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
                employee_list = []
                for employee in employees:
                    dict = {'pk': employee.id, 'code': employee.code}
                    if employee.datefirst:
                        dict['datefirst'] = employee.datefirst
                    if employee.datelast:
                        dict['datelast'] = employee.datelast
                    employee_list.append(dict)

                datalists = {'order': order_list, 'employee': employee_list}


        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        # logger.debug('datalists_json:')
        # logger.debug(str(datalists_json))

        return HttpResponse(datalists_json)


def upload_period(interval_upload, request):  # PR2019-07-10
    logger.debug(' ============= upload_interval ============= ')
    logger.debug('interval_upload: ' + str(interval_upload))
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    item_update_dict = {}
    if request.user is not None and request.user.company is not None:
        if interval_upload:

# get saved period_dict
            period_dict = get_period_from_settings(request)
            save_setting = False

# update period_dict with settings from upload_period_dict
            upload_period_dict = interval_upload
            if 'periodstart' in upload_period_dict:
                period_dict['periodstart'] = upload_period_dict['periodstart']
                save_setting = True
            if 'periodend' in upload_period_dict:
                period_dict['periodend'] = upload_period_dict['periodend']
                save_setting = True
            if 'range' in upload_period_dict:
                period_dict['range'] = upload_period_dict['range']
                save_setting = True
            if 'interval' in upload_period_dict:
                period_dict['interval'] = int(upload_period_dict['interval'])
                save_setting = True
            if 'overlap' in upload_period_dict:
                period_dict['overlap'] = int(upload_period_dict['overlap'])
                save_setting = True
            if 'auto' in upload_period_dict:
                period_dict['auto'] = bool(upload_period_dict['auto'])
                save_setting = True

# get values from saved / updated period_dict
            interval = int(period_dict['interval'])
            overlap = int(period_dict['overlap'])
            range = int(period_dict['range'])
# range must be at least overlap + interval
            if range < overlap + interval:
                range = overlap + interval
                save_setting = True

# save updated period_dict
            if save_setting:
                period_dict_json = json.dumps(period_dict)  # dumps takes an object and produces a string:
                logger.debug('period_dict_json: ' + str(period_dict_json))

                Usersetting.set_setting(KEY_USER_EMPLHOUR_PERIOD, period_dict_json, request.user)
                update_emplhour_list = True

# calculate  updated period_dict
            # get today_midnight_local_iso
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            today_utc = get_rosterdate_utc(date.today())
            today_utc = get_datetime_utc(datetime.utcnow())
            # logger.debug('CCCCCCC today_utc: ' + str(today_utc) + str(type(today_utc)))
            today_midnight_local = get_rosterdate_midnight_local(today_utc, comp_timezone)
            logger.debug('today_midnight_local: ' + str(today_midnight_local) + str(type(today_midnight_local)))
            # today_midnight_local_iso = today_midnight_local.isoformat()
            # logger.debug('today_midnight_local_iso: ' + str(today_midnight_local_iso) + str( type(today_midnight_local_iso)))

# get now in utc
            now_dt = datetime.utcnow()
            # logger.debug('now_dt: ' + str(now_dt) + ' type: ' + str(type(now_dt)))
            # now_dt: 2019-07-10 14:48:15.742546 type: <class 'datetime.datetime'>
            now_utc = now_dt.replace(tzinfo=pytz.utc)  # NOTE: it works only with a fixed utc offset
            # logger.debug('now_utc: ' + str(now_utc) + ' type: ' + str(type(now_utc)))
            # now_utc: 2019-07-10 14:48:15.742546+00:00 type: <class 'datetime.datetime'>

# convert now to local
            # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
            # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
            timezone = pytz.timezone(comp_timezone)
            now_local = now_utc.astimezone(timezone)
            logger.debug('now_local: ' + str(now_local) + str(type(now_local)))
            # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

# split now_local
            year_int, month_int, date_int, hour_int, minute_int = split_datetime(now_local)
            logger.debug(
                'now_local_arr: ' + str(year_int) + ';' + str(month_int) + ';' + str(date_int) + ';' + str(
                    hour_int) + ';' + str(minute_int))
            # now_local_arr: 2019;7;10;16

# get index of current interval (with interval = 6 hours, interval 6-12h has index 1
            interval_index = int(hour_int / interval)
            logger.debug('xxx interval: ' + str(interval) + ' interval_index: ' + str(interval_index))

# get local start time of current interval
            interval_starthour = interval * interval_index
            interval_start_local = today_midnight_local + timedelta(hours=interval_starthour)
            logger.debug('interval_start_local: ' + str(interval_start_local) + str(type(interval_start_local)))

# get local start time of current range (is interval_start_local minus overlap)
            range_start = -overlap
            range_start_local = interval_start_local + timedelta(hours=range_start)
            logger.debug('range_start: ' + str(range_start) + ' range_start_local: ' + str(range_start_local))

# get start time of current range in UTC
            utc = pytz.UTC
            range_start_utc = range_start_local.astimezone(utc)
            logger.debug('range_start_utc: ' + str(range_start_utc))

# get utc end time of current range ( = local start time of current range plus range
            range_end_utc = range_start_utc + timedelta(hours=range)
            logger.debug('range: ' + str(range) + ' utc >>>>>> range_end_utc: ' + str(range_end_utc))

# get local end time of current range ( = local start time of current range plus range
            range_end_local = range_start_local + timedelta(hours=range)
            logger.debug('range: ' + str(range) + ' range_end_local: ' + str(range_end_local))

# get end time of current range in UTC
            overlap_end_utc = range_end_local.astimezone(utc)
            logger.debug('overlap_end_utc: ' + str(overlap_end_utc))


@method_decorator([login_required], name='dispatch')
class PeriodUploadView(UpdateView):  # PR2019-07-12

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= PeriodUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# A.
    # 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

    # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            # logger.debug('comp_timezone: ' + str(comp_timezone))

            new_period_dict = {}

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('period_upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'next': True, 'period': {'period': 8, 'interval': 0, 'overlap': 0, 'auto': False,
                # 'periodstart': '2019-07-12T06:00:00.000Z',
                # 'periodend': '2019-07-12T14:00:00.000Z'}}

                # upload_dict: {'period': {'setting': True, 'interval': 3, 'overlap_prev': 2, 'overlap_next': 1}}

    # 3. save period
                update_emplhour_list = False
                if 'period' in upload_dict:
                    # 'period': {'period': 8, 'interval': 0, 'overlap': 0, 'auto': False,
                    # {'period': {'next': True}}
                    upload_period_dict = upload_dict['period']
                    # get saved period_dict
                    saved_period_dict = get_period_from_settings(request)
                    logger.debug('saved_period_dict: ' + str(saved_period_dict))
                    # period_dict: {'range': '0;0;1;0', 'period': 6, 'interval': 6, 'overlap': 0, 'auto': True}

                    set_current = False
                    set_prev = False
                    set_next = False
                    set_setting = False
                    if 'current' in upload_period_dict:
                        set_current = True
                    elif 'prev' in upload_period_dict:
                        set_prev = True
                    elif 'next' in upload_period_dict:
                        set_next = True
                    elif 'setting' in upload_period_dict:
                        set_setting = True

                    if set_setting:
                        new_period_dict = saved_period_dict

                        for field in ['interval', 'overlap_prev', 'overlap_next']:
                            if field in upload_period_dict:
                                new_period_dict[field] = upload_period_dict[field]

                        # recalculate period datrtdatime
                        field = 'current'
                        if field in upload_period_dict:
                            if field == True:
                                #TODO reclaculate period datrtdatime
                                pass

                    elif set_current:
                        new_period_dict = saved_period_dict
                        new_period_dict['current'] = True

                        # get_period_dict_and_save gets saved period_dict, adds 'current' and current periodstart/end
                        new_period_dict = get_period_dict_and_save(request, True)  # get_current = True
                        logger.debug('new_period_dict: ' + str(new_period_dict))

                        period_start_utc = get_datetime_UTC_from_ISOstring(new_period_dict['periodstart'])
                        period_end_utc = get_datetime_UTC_from_ISOstring(new_period_dict['periodend'])

                    # 9. return emplhour_list
                        emplhour_list = create_emplhour_list(period_start_utc, period_end_utc, request.user.company,
                                                             comp_timezone, user_lang)
                        if emplhour_list:
                            item_update_dict['emplhour'] = emplhour_list

                    elif set_prev or set_next:
                        new_period_dict = saved_period_dict
                        new_period_dict['current'] = False

                        # Attention: add/subtract interval must be don in local time, because of DST

                        interval_int = 0
                        if 'interval' in saved_period_dict:
                            interval_int = saved_period_dict['interval']

                        overlap_prev_int = 0
                        if 'overlap_prev' in saved_period_dict:
                            overlap_prev_int = saved_period_dict['overlap_prev']

                        overlap_next_int = 0
                        if 'overlap_next' in saved_period_dict:
                            overlap_next_int = saved_period_dict['overlap_next']

                        if 'periodstart' in saved_period_dict:
                            period_start_iso = saved_period_dict['periodstart']
                            logger.debug('period_start_iso: ' + str(period_start_iso) + ' ' + str(type(period_start_iso)))

                            prevnext = 'next' if set_next else 'prev'
                            prevnext_timestart_utc, prevnext_timeend_utc = get_prevnext_period(
                                prevnext,
                                period_start_iso,
                                interval_int,
                                overlap_prev_int,
                                overlap_next_int,
                                comp_timezone)

                            if prevnext_timestart_utc:
                                new_period_dict['periodstart'] = prevnext_timestart_utc.isoformat()

                            if prevnext_timeend_utc:
                                new_period_dict['periodend'] = prevnext_timeend_utc.isoformat()

                 # 9. return emplhour_list
                            emplhour_list = create_emplhour_list(prevnext_timestart_utc, prevnext_timeend_utc, request.user.company,
                                                                 comp_timezone, user_lang)
                            if emplhour_list:
                                item_update_dict['emplhour'] = emplhour_list

                    elif set_setting:
                        new_period_dict = saved_period_dict

                        for field in ['interval', 'overlap_prev', 'overlap_next']:
                            if field in upload_period_dict:
                                new_period_dict[field] = upload_period_dict[field]
                        field = 'current'
                        if field in upload_period_dict:
                            if field == True:
                                #TODO reclaculate period datrtdatime
                                pass

                    # 'periodend': '2019-07-11T14:00:00.000Z'}}

                period_dict_json = json.dumps(new_period_dict)  # dumps takes an object and produces a string:
                logger.debug('period_dict_json: ' + str(period_dict_json))

                Usersetting.set_setting(KEY_USER_EMPLHOUR_PERIOD, period_dict_json, request.user)

                item_update_dict['period'] = new_period_dict

        datalists_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(datalists_json)



@method_decorator([login_required], name='dispatch')
class EmplhourUploadView(UpdateView):  # PR2019-06-23

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# A.
    # 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

        # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            # logger.debug('comp_timezone: ' + str(comp_timezone))

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('emplhour_upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'pk': 153, 'parent_pk': 158, 'table': 'emplhour'},
                # 'timestart': {'value': '2019-06-22T11:15:00.000Z', 'update': True}}

                # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'table': 'emplhour'},
                #               'rosterdate': {'value': '2019-06-26', 'update': True},
                #               'orderhour': {'value': 'UTS - UTS', 'order_pk': 59, 'update': True}}

    # 3. save period
                update_emplhour_list = False
                rangemin = None
                rangemax = None
                if 'period' in upload_dict:  # PR2019-07-09
                    # period': {'period': 12, 'interval': 6, 'overlap': 0, 'auto': True}}

                    # get saved period_dict
                    period_dict = get_period_from_settings(request)

         # get today_midnight_local_iso
                    comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

         # get today_midnight_local_iso
                    today_utc = get_rosterdate_utc(date.today())
                    today_utc = get_datetime_utc(datetime.utcnow())
                    # logger.debug('CCCCCCC today_utc: ' + str(today_utc) + str(type(today_utc)))
                    today_midnight_local = get_rosterdate_midnight_local(today_utc, comp_timezone)
                    logger.debug('CCCCCCC today_midnight_local: ' + str(today_midnight_local) + str(type(today_midnight_local)))
                    # today_midnight_local_iso = today_midnight_local.isoformat()
                    # logger.debug('CCCCCCC today_midnight_local_iso: ' + str(today_midnight_local_iso) + str( type(today_midnight_local_iso)))

        # get now in utc
                    now_dt = datetime.utcnow()
                    #logger.debug('now_dt: ' + str(now_dt) + ' type: ' + str(type(now_dt)))
                    # now_dt: 2019-07-10 14:48:15.742546 type: <class 'datetime.datetime'>
                    now_utc = now_dt.replace(tzinfo=pytz.utc)  # NOTE: it works only with a fixed utc offset
                    #logger.debug('now_utc: ' + str(now_utc) + ' type: ' + str(type(now_utc)))
                    # now_utc: 2019-07-10 14:48:15.742546+00:00 type: <class 'datetime.datetime'>

        # convert now to local
                    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
                    # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
                    timezone = pytz.timezone(comp_timezone)
                    now_local = now_utc.astimezone(timezone)
                    logger.debug('now_local: ' + str(now_local) + str(type(now_local)))
                    # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

        # split now_local
                    year_int, month_int, date_int, hour_int, minute_int = split_datetime(now_local)
                    logger.debug('now_local_arr: ' + str(year_int) + ';' + str(month_int) + ';' + str(date_int) + ';' + str(hour_int) + ';' + str(minute_int))
                    # now_local_arr: 2019;7;10;16

        # get interval
                    interval = int(period_dict['interval'])
                    interval_index = int(hour_int / interval)
                    logger.debug('xxx interval: ' + str(interval) + ' interval_index: ' + str(interval_index))

        # get local start time of current interval
                    interval_starthour = interval * interval_index
                    logger.debug('interval_starthour: ' + str(interval_starthour))
                    interval_start_local = today_midnight_local + timedelta(hours=interval_starthour)
                    logger.debug('>>>>interval_start_local: ' + str(interval_start_local) + str(type(interval_start_local)))

                    interval_end_local = interval_start_local + timedelta(hours=interval)
                    logger.debug('interval: ' + str(interval) + ' interval_end_local: ' + str(interval_end_local))

        # get local start time of current interval with overlap
                    overlap = 11 #int(period_dict['overlap'])
                    overlap_start = -overlap
                    overlap_start_local = interval_start_local + timedelta(hours=overlap_start)

                    logger.debug('overlap_start: ' + str(overlap_start) +  ' overlap_start_local: ' + str(overlap_start_local))

                    utc = pytz.UTC
                    overlap_start_utc = overlap_start_local.astimezone(utc)
                    logger.debug('mmmm  overlap_start_utc: ' + str(overlap_start_utc))

        # get local end time of current interval with overlap

                    overlap_end_local = interval_end_local + timedelta(hours=overlap)
                    logger.debug(
                        'overlap: ' + str(overlap) + ' overlap_end_local: ' + str(overlap_end_local))

                    overlap_end_utc = overlap_end_local.astimezone(utc)
                    logger.debug('mmmm  overlap_end_utc: ' + str(overlap_end_utc))

                    # get starthour of current interval
                    # from https://riptutorial.com/python/example/4540/constructing-timezone-aware-datetimes

        # get local end time of current interval with
                    #range = period_dict['range']
                   # year_add, month_add, date_add, hour_add = get_range(range)
                    #logger.debug('range: ' + str(range))
                    #logger.debug(str(year_add) + ' ; ' + str(month_add) + ' ; ' + str(date_add) + ' ; ' + str(hour_add))


                    # convert now to local
                    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
                    # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
                    timezone = pytz.timezone(comp_timezone)
                    logger.debug('timezone: ' + str(timezone) + str(type(timezone)))


                    # convert starthour to utc
                    # get endhour of current interval with offset
                    range = int(period_dict['range'])
                    year_int, month_int, date_int, hour_int = get_range(range)
                    interval_endhour_offset = interval_starthour + range


                    rangemin = get_datetime_UTC_from_ISOstring(period_dict['datetimestart'])

                    # rangemin: 2019-07-09T00:00:00+02:00 type: <class 'str'>
                    # rangemin: 2019-07-09 00:00:00+00:00 type: <class 'datetime.datetime'>
                    logger.debug('rangemin: ' + str(rangemin) + ' type: ' + str(type(rangemin)))

                    rangemin_arr = get_datetimearray_from_ISOstring(period_dict['datetimestart'])
                    year_int = int(rangemin_arr[0])
                    month_int = int(rangemin_arr[1])
                    date_int = int(rangemin_arr[2])
                    hour_int = int(rangemin_arr[3])
                    logger.debug(str(year_int) + ' ; ' + str(month_int) + ' ; ' + str(date_int) + ' ; ' + str(hour_int))

                    arr = period_dict['range'].split(';')
                    year_add = int(arr[0])
                    month_add = int(arr[1])
                    date_add = int(arr[2])
                    hour_add = int(arr[3])
                    if year_add:
                        year_int = year_int + year_add
                    if month_add:
                        month_int = month_int + month_add
                    if date_add:
                        date_int = date_int + date_add
                    if hour_add:
                        hour_int = hour_int + hour_add
                    rangemax = datetime(year_int, month_int, date_int, hour_int)
                    logger.debug('rangemax: ' + str(rangemax) + ' type: ' + str(type(rangemax)))
                    # rangemax: 2019-07-16 00:00:00 type: <class 'datetime.datetime'>
                    rangemax_utc = rangemax.astimezone(pytz.UTC)
                    logger.debug('rangemax_utc: ' + str(rangemax_utc) + ' type: ' + str(type(rangemax_utc)))
                    # rangemax_utc: 2019-07-16 04:00:00+00:00 type: <class 'datetime.datetime'>

    # 3. save quicksave
                if 'quicksave' in upload_dict:
                    quicksave_bool = upload_dict.get('quicksave', False)
                    quicksave_str = '1' if quicksave_bool else '0'
                    Usersetting.set_setting(KEY_USER_QUICKSAVE, quicksave_str, request.user)  # PR2019-07-02

    # 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)
                    # id_dict is added to update_dict after check if parent_exists and item_exists
                    logger.debug('id_dict: ' + str(id_dict))
                    # id_dict: {'temp_pk': 'new_3', 'create': True, 'parent_pk': 154, 'table': 'emplhour'}
                    # id_dict: {'id': {'pk': 150, 'parent_pk': 154, 'table': 'emplhour'}
                    # id_dict: {'temp_pk': 'new_1', 'create': True, 'table': 'emplhour'}

    # 4. Create empty update_dict with keys for all fields if not exist. Unused ones will be removed at the end
                    # this one is not working: update_dict = dict.fromkeys(field_list, {})
                    field_list = ('id', 'orderhour', 'employee', 'wagecode', 'rosterdate',
                                'timestart', 'timeend', 'timeduration', 'breakduration', 'timestatus')
                    update_dict = create_dict_with_empty_attr(field_list)

# C. Create new orderhour / emplhour - before check if parent exists
                    parent = None
                    instance = None
                    if is_create:
                        instance, parent = create_orderhour_emplhour(upload_dict, update_dict, request)
                    else:
# 5. check if parent exists (orderhour is parent of emplhour)
                        parent = get_parent_instance(table, parent_pk_int, request.user.company)
                        if parent:
                            instance = get_instance(table, pk_int, parent)

# TODO 'select': 'absent', not necessary
                        # TODO dont create employeedict when empty
                        # 'employee': {'field': 'employee', 'pk': 0, 'parent_pk': 0, 'code': ''},

                        # upload_dict: {
                        #  'id': {'pk': 137, 'parent_pk': 141, 'table': 'emplhour'},
                        #  'select': 'absent',
                        #  'employee': {'field': 'employee', 'pk': 638, 'parent_pk': 1, 'code': 'Charjamin'},
                        #  'abscat': {'field': 'abscat', 'pk': 73, 'parent_pk': 61}}

                    if instance:
# B. Delete instance
                        if is_delete:
                            delete_instance(table, instance, update_dict, request)
# D. get existing instance
                        else:
                            logger.debug('instance: ' + str(instance))
# ============make employee absent
                            if 'abscat' in upload_dict:
                                # - check if employee exists
                                employee = None
                                employee_dict = upload_dict.get('employee')
                                if employee_dict:
                                    employee_pk = employee_dict.get('pk')
                                    if employee_pk:
                                        employee = get_instance('employee', employee_pk, request.user.company)
                                make_absent(instance, employee, upload_dict, request)

# E. Update instance, also when it is created
                            update_emplhour(instance, upload_dict, update_dict, request, comp_timezone, user_lang)
                            logger.debug('updated instance: ' + str(instance))
                            item_update_dict['item_dict'] = create_emplhour_dict(instance, comp_timezone, user_lang)

# 6. remove empty attributes from update_dict
                    remove_empty_attr_from_dict(update_dict)
                    logger.debug('update_dict: ' + str(update_dict))

# 7. add update_dict to item_update_dict
                    if update_dict:
                        item_update_dict['item_update'] = update_dict

# 8. update emplhour_list when changes are made
                        if update_emplhour_list:
                            # inactive = False: include only active instances

                            emplhour_list = create_emplhour_list(rangemin, rangemax, request.user.company, comp_timezone, user_lang)
                            if emplhour_list:
                                item_update_dict['emplhour_list'] = emplhour_list

# 9. return update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


def delete_instance(table, instance, update_dict, request):
    # function deletes instance of table,  PR2019-07-03
    if instance:
        try:
            instance.delete(request=request)
            update_dict['id']['deleted'] = True
        except:
            itemtext = _('This item')
            if table == 'company':
                itemtext = _('This company')
            if table == 'customer':
                itemtext = _('This customer')
            if table == 'order':
                itemtext = _('This order')
            if table == 'scheme':
                itemtext = _('This scheme')
            elif table == 'team':
                itemtext = _('This team')
            elif table == 'employee':
                itemtext = _('This employee')
            msg_err = _('%(tbl)s could not be deleted.') % {'tbl': itemtext}
            update_dict['id']['error'] = msg_err


def create_orderhour_emplhour(upload_dict, update_dict, request):

    #  'rosterdate': {'value': '2019-06-26', 'update': True},
    #               'orderhour': {'value': 'UTS - UTS', 'order_pk': 59, 'update': True}}

    id_dict = upload_dict.get('id')
    if id_dict:
    # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
        temp_pk_str = id_dict.get('temp_pk', '')
        if temp_pk_str:
            update_dict['id']['temp_pk'] = temp_pk_str

# get rosterdate
    rosterdate = None
    order = None
    orderhour = None
    emplhour = None

    field = 'rosterdate'
    if field in upload_dict:
        # a. get new and old value
        field_dict = upload_dict.get(field)  #  'rosterdate': {'value': '2019-06-26', 'update': True},

        new_value = field_dict.get('value')  # new_value: '2019-04-12'
        rosterdate, msg_err = get_date_from_str(new_value, True)  # True = blank_not_allowed
        # b. validate new_date
        # field 'rosterdate' is required
        if msg_err is not None:
            update_dict[field]['error'] = msg_err

# get parent 'order'
    field = 'orderhour'
    if field in upload_dict:
        # a. get new and old value
        field_dict = upload_dict.get(field)  # orderhour': {'value': 'UTS - UTS', 'order_pk': 59, 'update': True}}

        order_pk = field_dict.get('order_pk')
        if order_pk:
            order = Order.objects.get_or_none(customer__company=request.user.company, pk=order_pk)

# create orderhour
    if rosterdate and order:
        orderhour = Orderhour(rosterdate=rosterdate, order=order)
        orderhour.save(request=request)
    # - create error when instance not created
    if orderhour is None:
        msg_err = _('This item could not be created.')
        update_dict['id']['error'] = msg_err
    else:
        # - put info in id_dict
        update_dict['id']['created'] = True
        update_dict['id']['pk'] = orderhour.pk
        update_dict['pk'] = orderhour.pk
        # 'parent_pk' is added to update_dict['id'] in function get_parent_instance

# create emplhour
    # create orderhour
    if orderhour:
        emplhour = Emplhour(rosterdate=rosterdate, orderhour=orderhour)
        emplhour.save(request=request)

    if emplhour is None:
        msg_err = _('This item could not be created.')
        update_dict['id']['error'] = msg_err
    else:
        # - put info in id_dict
        update_dict['id']['created'] = True
        update_dict['id']['pk'] = emplhour.pk
        update_dict['id']['ppk'] = orderhour.pk
        # 'parent_pk' is added to update_dict['id'] in function get_parent_instance

    return emplhour, orderhour

    """
    is_update, rosterdate_str = get_fielddict_variables(upload_dict, 'rosterdate')
    rosterdate, msg_err = get_date_from_str(rosterdate_str, True)
    # logger.debug('Create  schemeitem rosterdate: ' + str(rosterdate) + ' type' + str(type(rosterdate)))
    if msg_err:
        update_dict['rosterdate']['error'] = msg_err
    else:
    
        # When new schemeitems record: First create orderhour record. base.id is used in SchemeItem. Create also saves new record
        orderhour = Orderhour.objects.create()
        emplhour = Schemeitem(orderhour=orderhour, rosterdate=rosterdate)
        schemeitem.save(request=self.request)
        test_pk_int = schemeitem.pk
    
        # check if record exists
        schemeitem = Schemeitem.objects.filter(id=test_pk_int, scheme=scheme).first()
        if schemeitem:
            # logger.debug('created schemeitem: ' + str(schemeitem))
            item_exists = True
            pk_int = schemeitem.pk
    
            update_dict['rosterdate']['updated'] = True
            set_fielddict_date(update_dict['rosterdate'], schemeitem.rosterdate, user_lang)
    
            # Subtract 1 from company.balance
            # TODO change: ---  after saving new record: subtract 1 from company.balance
            # request.user.company.balance -= 1
            request.user.company.save(request=self.request)
    
    if not item_exists:
        if not msg_err:
            msg_err = _('This item could not be created.')
        update_dict['id']['error'] = msg_err
    else:
        update_dict['id']['created'] = True
        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = parent_pk_int
        # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
        if temp_pk_str:
            update_dict['id']['temp_pk'] = temp_pk_str
    
    """


def make_absent(emplhour, employee, upload_dict, request):
    # - check if abscat_exists
    abscat_order_exists = False
    abscat_dict = upload_dict.get('abscat')
    if abscat_dict:
        abscat_pk = abscat_dict.get('pk')
        abscat_parent_pk = abscat_dict.get('ppk')
        if abscat_pk:
            abscat_order = Order.objects.get_or_none(id=abscat_pk, customer=abscat_parent_pk, type=TYPE_02_ABSENCE)
            if abscat_order:
                abscat_order_exists = True
                logger.debug('abscat_exists: ' + str(abscat_order_exists))

# - check if abscat orderhour exists
            if abscat_order_exists:
                abscat_orderhour = Orderhour.objects.filter(id=abscat_pk, order=abscat_order).first()
                if abscat_orderhour is None:
# create new abscat_orderhour record if it does not exist
                    abscat_orderhour = Orderhour(order=abscat_order)
                    abscat_orderhour.save(request=request)
                if abscat_orderhour:
                    abscat_emplhour = Emplhour(orderhour=abscat_orderhour)
                    # Note: when abscat: employee is replacement_employee, to be put in emplhour
                    abscat_emplhour.employee = emplhour.employee

                    abscat_emplhour.wagecode = emplhour.wagecode
                    abscat_emplhour.rosterdate = emplhour.rosterdate
                    abscat_emplhour.timestart = emplhour.timestart
                    abscat_emplhour.timeend = emplhour.timeend
                    abscat_emplhour.timeduration = emplhour.timeduration
                    abscat_emplhour.breakduration = emplhour.breakduration
                    abscat_emplhour.timestatus = STATUS_EMPLHOUR_00_NONE

                    abscat_emplhour.save(request=request)

# put replacemenet employee in emplhour, Null if no replacemenet employee
                    if employee:
                        emplhour.employee = employee
                    else:
                        emplhour.employee = None
                    emplhour.save(request=request)


#######################################################
def update_emplhour(instance, upload_dict, update_dict, request, comp_timezone, user_lang):
    # --- update existing and new emplhour PR2-019-06-23
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' -------- update_ emplhour  -------------------')
    logger.debug('upload_dict: ' + str(upload_dict))

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table', '')
        pk_int = instance.pk
        parent_pk = instance.orderhour.pk

        update_dict['pk'] = pk_int
        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = parent_pk
        update_dict['id']['table'] = table

        save_changes = False
        recalc_duration = False

# 2. save changes in field 'rosterdate' (should not be possible)
        field = 'rosterdate'
        # rosterdate_has_changed = False
        # msg_err = None
        if field in upload_dict:
    # a. get new and old value
            field_dict = upload_dict.get(field) # {'value': '2019-05-31', 'update':
            if 'update' in field_dict:
                new_value = field_dict.get('value') # new_value: '2019-04-12'
                new_date, msg_err = get_date_from_str(new_value, True)  # True = blank_not_allowed
        # b. validate new_date
                # field 'rosterdate' is required
                if msg_err is not None:
                    update_dict[field]['error'] = msg_err
                else:
                    old_date = getattr(instance, field, None)
                    if new_date != old_date:
        # c. save field if changed and no_error
                        setattr(instance, field, new_date)
                        save_changes = True
                        recalc_duration = True
                        update_dict[field]['updated'] = True
                        # TODO move to end
                        dict = {}
                        set_fielddict_date(dict, instance.rosterdate, user_lang)
                        if dict:
                            update_dict[field] = dict

# 3. save changes in field 'employee'
        # 'employee': {'update': True, 'value': 'Kevin', 'pk': 1},
        field = 'employee'
        is_updated = False
        if field in upload_dict:
            employee = None
    # a. get new and old employee_pk
            field_dict = upload_dict.get(field)
            logger.debug('field_dict[' + field + ']: ' + str(field_dict))
            new_employee_pk = field_dict.get('pk')
            old_employee_pk = None
            if instance.employee_id:
                old_employee_pk = instance.employee_id
    # b. check if employee exists
            if new_employee_pk:
                employee = Employee.objects.filter(company=request.user.company, pk=new_employee_pk).first()
                if employee is None:
                    new_employee_pk = None
    # c. save field if changed
            # employeek is not required
            if new_employee_pk != old_employee_pk:
    # update field employee in emplhour
                # setattr() sets the value ('team') of the specified attribute ('field') of the specified object (emplhour)
                setattr(instance, field, employee)
                save_changes = True
                update_dict[field]['updated'] = True
                if instance.employee:
                    update_dict[field]['value'] = instance.employee.code
                    update_dict[field]['pk'] = instance.employee.id

        logger.debug('update_dict[' + field + ']: ' + str(update_dict[field]))
        # --- save changes in time fields
        # upload_dict: {'id': {'pk': 4, 'parent_pk': 18}, 'timestart': {'value': '0;11;15', 'update': True}}

# 4. save changes in field 'timestart', 'timeend'
        for field in ('timestart', 'timeend'):
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                # field_dict[timestart]: {'value': '2019-06-22T08:15:00.000Z', 'update': True}
                if 'update' in field_dict:
                    new_dtetime = None
                    if 'datetime' in field_dict:
                        new_value = field_dict.get('datetime')
                        if new_value:
                            new_dtetime = get_datetime_UTC_from_ISOstring(new_value)

                    old_dtetime = getattr(instance, field)
                    if new_dtetime != old_dtetime:
                        setattr(instance, field, new_dtetime)
                        save_changes = True
                        recalc_duration = True
                        update_dict[field]['updated'] = True

# --- save changes in breakduration field
        for field in ('breakduration',):
            is_updated = False
            new_minutes = None
            # breakduration: {'value': '0;0;15', 'update': True}
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                if 'value' in field_dict:
                    value = field_dict.get('value',0) # value can be either '0;0;15' or number
                    if type(value) != int:
                        new_minutes = get_minutes_from_DHM(field_dict.get('value'))
                    else:
                        new_minutes = value
                    # duration unit in database is minutes
                    old_minutes = getattr(instance, field, 0)
                    if new_minutes != old_minutes:
                        setattr(instance, field, new_minutes)
                        save_changes = True
                        recalc_duration = True
                        update_dict[field]['updated'] = True
        saved_minutes = getattr(instance, field)
        dict = fielddict_duration (saved_minutes, user_lang)

# --- recalculate timeduration
        # logger.debug('calculate working hours')
        field = 'timeduration'
        new_minutes = 0
        old_minutes = getattr(instance, field, 0)
        if instance.timestart and instance.timeend:
            saved_break_minutes = int(getattr(instance, 'breakduration', 0))
            datediff = instance.timeend - instance.timestart
            datediff_minutes = int((datediff.total_seconds() / 60))
            new_minutes = int(datediff_minutes - saved_break_minutes)

        if new_minutes != old_minutes:
            setattr(instance, field, new_minutes)
            save_changes = True
            update_dict[field]['updated'] = True

        saved_minutes = getattr(instance, field, 0)
        dict = fielddict_duration (saved_minutes, user_lang)

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                msg_err = _('This item could not be updated.')
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        for field in update_dict:
            if field != 'id' and field != 'pk':
                saved_value = getattr(instance, field)
                logger.debug('new saved_value of ' + field + ': ' + str(saved_value) + ' type: ' + str(type(saved_value)))
                if saved_value:
                    if field in ['code', 'name', 'inactive']:
                        update_dict[field]['value'] = saved_value
                    if field in ['rosterdate']:
                        # saves 'value', 'dm', 'wdm', wdmy', 'dmy', 'offset' in update_dict[field]
                        set_fielddict_date(update_dict[field], saved_value, user_lang)
                if field in ['timestart', 'timeend']:
                    rosterdate = getattr(instance, 'rosterdate')
                    timestart = getattr(instance, 'timestart')
                    timeend = getattr(instance, 'timeend')
                    rosterdate_utc = get_rosterdate_utc(rosterdate)
                    set_fielddict_datetime(field, update_dict[field], rosterdate_utc, timestart, timeend, comp_timezone)

# 7. remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)



def update_teammember(teammember, team, upload_dict, update_dict, request, user_lang):
    # --- update existing and new teammmber PR2-019-06-01
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_teammmber')
    logger.debug('upload_dict' + str(upload_dict))
    logger.debug('update_dict' + str(update_dict))
    # {'id': {'temp_pk': 'new_26', 'create': True, 'parent_pk': 1, 'table': 'teammembers'},
    # 'team': {'update': True, 'value': 'Team A', 'pk': 1},
    # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}

    save_changes = False

# --- save changes in field 'employee'
    # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}
    for field in ['employee']:
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('upload_dict[' + field + ']: ' + str(field_dict) + ' ' + str(type(field_dict)))
            if 'update' in field_dict:
                pk = field_dict.get('pk')
                employee = None
                if pk:
                    employee = Employee.objects.filter(id=pk, company=request.user.company).first()
                logger.debug('employee]: ' + str(employee) + ' ' + str(type(employee)))
                add_employee = False
                if field == 'employee':
                    if employee == None:
                        update_dict[field]['error'] = _('This field cannot be blank.')
                    else:
                        msg_err = Teammember.validate_employee_exists_in_teammembers(employee, team, teammember.pk)
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
                            add_employee = True
                if add_employee:
                    setattr(teammember, field, employee)
                    update_dict[field]['updated'] = True
                    save_changes = True

# - save changes in rosterdate field
    for field in ['datefirst', 'datelast']:
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('field_dict ' + field + ': ' + str(field_dict) + str(type(field_dict)))
            # field_dict datefirst: {'value': '2019-05-31', 'update':
            field_value = field_dict.get('value') # field_value: '2019-04-12'
            new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
            # new_date: 2019-04-12 <class 'datetime.date'>
            # check if date is valid (empty date is not allowed)

            if msg_err is not None:
                update_dict[field]['err'] = msg_err
            else:
                saved_date = getattr(teammember, field, None)
                if new_date != saved_date:
                    # setattr() sets the value 'new_date' of the attribute 'field' of the object 'teammember'
                    setattr(teammember, field, new_date)
                    update_dict[field]['updated'] = True

                    save_changes = True

# --- save changes
    if save_changes:
        teammember.save(request=request)

        for field in update_dict:
            if field in ['datefirst', 'datelast']:
                date = getattr(teammember, field)
                if date:
                    update_dict[field]['value'] = str(date)
                    update_dict[field]['wdm'] = get_date_WDM_from_dte(date, user_lang)
                    update_dict[field]['wdmy'] = format_WDMY_from_dte(date, user_lang)
                    update_dict[field]['dmy'] = format_DMY_from_dte(date, user_lang)
                    update_dict[field]['offset'] = get_weekdaylist_for_DHM(date, user_lang)
            elif field in ['employee']:
                employee = getattr(teammember, field)
                if employee:
                    update_dict[field]['value'] = teammember.employee.code
                    update_dict[field]['team_pk'] = teammember.employee.id

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    logger.debug('update_dict: ' + str(update_dict))


#######################################################
def update_scheme(instance, upload_dict, update_dict, request, user_lang):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_scheme')
    logger.debug(upload_dict)
    # {'id': {'pk': 14, 'parent_pk': 2, 'table': 'scheme'}, 'pk': 14, 'datefirst': {'update': True, 'value': '2019-06-22'}}

    save_changes = False
    field_list = ['code', 'cycle', 'datefirst', 'datelast']
    date_fields = ['datefirst', 'datelast']
    other_fields = ['code', 'cycle']

# - get_iddict_variables
    # id_dict = upload_dict.get('id')
    # pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# --- save changes in field 'code', required field
# --- save changes in field 'cycle', default=0
    for field in field_list:
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug("field: " + str(field) + " field_dict: " + str(field_dict))
            new_value = field_dict.get('value')
            saved_value = getattr(instance, field)
            if field in other_fields:
                if new_value and new_value != saved_value:
                    setattr(instance, field, new_value)
                    update_dict[field]['updated'] = True
                    save_changes = True
            elif field in date_fields: # field_dict rosterdate: {'value': '2019-05-31', 'update':
                new_date, msg_err = get_date_from_str(new_value, False)  # False = blank_allowed
                if msg_err is not None:
                    update_dict[field]['error'] = msg_err
                else:
                    saved_date = getattr(instance, field, None)
                    if new_date != saved_date:
                        setattr(instance, field, new_date)
                        update_dict[field]['updated'] = True
                        save_changes = True
# - save changes
    if save_changes:
        instance.save(request=request)

        for field in update_dict:
            saved_value = getattr(instance, field)
            if field in date_fields:
                if saved_value:
                    set_fielddict_date(update_dict[field], saved_value, user_lang)
            elif field in other_fields:
                if saved_value:
                    update_dict[field]['value'] = saved_value

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    logger.debug('update_dict: ' + str(update_dict))


#######################################################
def update_schemeitem(scheme, schemeitem, upload_dict, update_dict, request, comp_timezone, user_lang):
    # --- update existing and new schemeitem and teammmber PR2-019-06-01
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_schemeitem / teammmber')
    logger.debug('upload_dict: ' + str(upload_dict))
    # {'id': {'temp_pk': 'new_26', 'create': True, 'parent_pk': 1, 'table': 'teammembers'},
    # 'team': {'update': True, 'value': 'Team A', 'pk': 1},
    # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}

    # - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    # - update_dict is created in SchemeItemUploadView, contains id_dict with pk etc.

    save_changes = False

# - get_iddict_variables
    id_dict = upload_dict.get('id')
    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# - save changes in field 'rosterdate'
    field = 'rosterdate'
    rosterdate_has_changed = False
    msg_err = None
    dict = {}
    if field in upload_dict:
        field_upload = upload_dict.get(field) # {'value': '2019-05-31', 'update':
        field_value = field_upload.get('value') # field_value: '2019-04-12'
        new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
        if msg_err is None:
            old_date = getattr(schemeitem, field, None)
            rosterdate_has_changed = (new_date != old_date)
            setattr(schemeitem, field, new_date)

    set_fielddict_date(dict, schemeitem.rosterdate, user_lang)

    if msg_err is not None:
        dict['error'] = msg_err
    if rosterdate_has_changed:
        dict['updated'] = True
    update_dict[field] = dict

# --- save changes in field 'shift'
    field = 'shift'
    is_updated = False
    dict = {}
    if field in upload_dict:
        field_upload = upload_dict.get(field)
        new_value = field_upload.get('value')
        old_value = getattr(schemeitem, field, None)
        is_updated = (new_value != old_value)
        setattr(schemeitem, field, new_value)

    saved_value = getattr(schemeitem, field)
    if saved_value:
        dict = fielddict_str(saved_value)
    if is_updated:
        dict['updated'] = True
        logger.debug('shift dict: ' + str(dict))

# lookup first shift with this name in Schemeitem
        lookup_schemeitem = Schemeitem.objects.filter(scheme=scheme,shift__iexact=saved_value).first()
        logger.debug('lookup_schemeitem: ' + str(lookup_schemeitem))

# if value of lookup_schemeitem is different: put that one in upload dict, it will be changed further on
        if lookup_schemeitem:
            for field in ('timestart', 'timeend', 'breakduration'):
                fieldname = field if  field == 'breakduration' else field + 'dhm'
                old_value = getattr(schemeitem, fieldname, '')
                lookup_value = getattr(lookup_schemeitem, fieldname, '')
                if lookup_value != old_value:
                    # 'timestart': {'update': True},'value': '0;10;15'},
                    if not field in upload_dict:
                        upload_dict[field] = {}
                    upload_dict[field]['value'] = lookup_value
                    upload_dict[field]['update'] = True

    update_dict[field] = dict
    logger.debug('shift update_dict: ' + str(update_dict))

# --- save changes in field 'team'
    # 'team': {'update': True, 'value': 'Team A', 'pk': 1},
    field = 'team'
    is_updated = False
    team = None
    dict = {}
    if field in upload_dict:
        field_upload = upload_dict.get(field)

        logger.debug('field_upload[' + field + ']: ' + str(field_upload))

        team_code = field_upload.get('value')
        team_pk = field_upload.get('pk')
        logger.debug('team_code[' + str(team_pk )+ ']: ' + str(team_code))

        # remove team from schemeitem when team_code is None
        if not team_code:
            # set field blank
            if schemeitem.team:
                schemeitem.team = None
                is_updated = True
        else:
            if team_pk:
                # check if team exists
                team = Team.objects.filter(scheme=scheme, pk=team_pk).first()
            # create team if it does not exist
            if team is None:
                team = Team(scheme=scheme, code=team_code)
                team.save(request=request)
            # update schemeitem
            if team:
                # setattr() sets the value ('team') of the specified attribute ('field') of the specified object (schemeitem)
                setattr(schemeitem, field, team)
                is_updated = True
    if is_updated:
        dict['updated'] = True
    if schemeitem.team:
        dict['value'] = schemeitem.team.code
        dict['team_pk'] = schemeitem.team.id
    update_dict[field] = dict

    logger.debug('update_dict[' + field + ']: ' + str(dict))
    # --- save changes in time fields
    # upload_dict: {'id': {'pk': 4, 'parent_pk': 18}, 'timestart': {'value': '0;11;15', 'update': True}}

    for field in ('timestart', 'timeend'):
        is_updated = False
        new_value_dhm = None
        dict = {}
        if field in upload_dict:
            field_upload = upload_dict.get(field)
            if 'value' in field_upload:
                # timestart': {'value': '0;3;45', 'o_value': '2019-04-27T02:36:00+02:00'}}
                new_value_dhm = field_upload.get('value')
                old_value_dhm = getattr(schemeitem, field + 'dhm', None)
                is_updated = (new_value_dhm != old_value_dhm)
                setattr(schemeitem, field + 'dhm', new_value_dhm)
        # calculate field 'timestart' 'timeend'., also when rosterdate_has_changed
        if rosterdate_has_changed or is_updated:
            new_datetime = get_datetimelocal_from_DHM(schemeitem.rosterdate, new_value_dhm, comp_timezone)
            setattr(schemeitem, field, new_datetime)
            is_updated = True
        saved_value_dhm = getattr(schemeitem, field + 'dhm')
        saved_datetime = getattr(schemeitem, field)
        dict = fielddict_datetime(schemeitem.rosterdate, saved_value_dhm, saved_datetime, comp_timezone, user_lang)
        if is_updated:
            dict['updated'] = True
        update_dict[field] = dict

# --- save changes in breakduration field
    for field in ('breakduration',):
        is_updated = False
        new_minutes = None
        # breakduration: {'value': '0;0;15', 'update': True}
        if field in upload_dict:
            field_upload = upload_dict.get(field)
            if 'value' in field_upload:
                value = field_upload.get('value',0) # value can be either '0;0;15' or number
                if type(value) != int:
                    new_minutes = get_minutes_from_DHM(field_upload.get('value'))
                else:
                    new_minutes = value
                # duration unit in database is minutes
                old_minutes = getattr(schemeitem, field, 0)
                if new_minutes != old_minutes:
                    setattr(schemeitem, field, new_minutes)
                    is_updated = True
    saved_minutes = getattr(schemeitem, field)
    dict = fielddict_duration (saved_minutes, user_lang)
    if is_updated:
        dict['updated'] = True
    update_dict[field] = dict

# --- recalculate timeduration
    # logger.debug('calculate working hours')
    field = 'timeduration'
    new_minutes = 0
    old_minutes = getattr(schemeitem, field, 0)
    if schemeitem.timestart and schemeitem.timeend:
        saved_break_minutes = int(getattr(schemeitem, 'breakduration', 0))
        datediff = schemeitem.timeend - schemeitem.timestart
        datediff_minutes = int((datediff.total_seconds() / 60))
        new_minutes = int(datediff_minutes - saved_break_minutes)

    if new_minutes != old_minutes:
        setattr(schemeitem, field, new_minutes)
        is_updated = True

    saved_minutes = getattr(schemeitem, field, 0)
    dict = fielddict_duration (saved_minutes, user_lang)
    if is_updated:
        dict['updated'] = True
    update_dict[field] = dict

# --- save changes
    schemeitem.save(request=request)

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    # logger.debug('update_dict: ' + str(update_dict))

# 5555555555555555555555555555555555555555555555555555555555555555555555555555

def FillRosterdate(new_rosterdate, request, comp_timezone):  # PR2019-06-17
    logger.debug(' ============= FillRosterdate ============= ')

    if new_rosterdate:
# - create recordset of schemeitem records with rosterdate = new_rosterdate
        # from: https://stackoverflow.com/questions/5235209/django-order-by-position-ignoring-null
        # Coalesce works by taking the first non-null value.  So we give it
        # a date far before any non-null values of last_active.  Then it will
        # naturally sort behind instances of Box with a non-null last_active value.
        crit = (Q(rosterdate=new_rosterdate)) & \
               (Q(scheme__order__customer__company=request.user.company)) & \
               (Q(scheme__datefirst__lte=new_rosterdate) | Q(scheme__datefirst__isnull=True)) & \
               (Q(scheme__datelast__gte=new_rosterdate) | Q(scheme__datelast__isnull=True))
        """
               (Q(scheme__order__customer__company=request.user.company)) & \
               (Q(scheme__order__customer__issystem=False)) & (Q(scheme__order__customer__inactive=False)) & \
               (Q(scheme__order__issystem=False)) & (Q(scheme__order__inactive=False)) & \
               (Q(scheme__order__datefirst__lte=new_rosterdate) | Q(scheme__order__datefirst__isnull=True)) & \
               (Q(scheme__order__datelast__gte=new_rosterdate) | Q(scheme__order__datelast__isnull=True)) & \
               (Q(scheme__datefirst__lte=new_rosterdate) | Q(scheme__datefirst__isnull=True)) & \
               (Q(scheme__datelast__gte=new_rosterdate) | Q(scheme__datelast__isnull=True)) & \
               (Q(scheme__inactive=False))
        """
        schemeitems = Schemeitem.objects.filter(crit)
        logger.debug(schemeitems.query)

        for schemeitem in schemeitems:
            logger.debug('order: ' + schemeitem.scheme.order.code + ' rosterdate: ' + str(schemeitem.rosterdate))
# - create new_orderhour
            new_orderhour = Orderhour(
                order=schemeitem.scheme.order,
                rosterdate=new_rosterdate,
                schemeitem=schemeitem,
                shift=schemeitem.shift,
                taxrate=schemeitem.scheme.order.taxrate,
                duration=schemeitem.timeduration,
                status=STATUS_EMPLHOUR_01_CREATED,
                rate=schemeitem.scheme.order.rate,
                amount=(schemeitem.timeduration / 60) * (schemeitem.scheme.order.rate))
            new_orderhour.save(request=request)

# - lookup employee
            logger.debug('lookup employee ')
            team = schemeitem.team
            employee = None
            wagecode = None
            logger.debug('team: ' + str(team))
            if team:
                # filters teammmebers that have new_rosterdate within range datefirst/datelast
                # order_by datelast, null comes last (with Coalesce changes to '2200-01-01'
                crit = (Q(team=team)) & \
                       (Q(employee__isnull=False)) & \
                       (Q(datefirst__lte=new_rosterdate) | Q(datefirst__isnull=True)) & \
                       (Q(datelast__gte=new_rosterdate) | Q(datelast__isnull=True))
                teammember = Teammember.objects.annotate(
                    new_datelast=Coalesce('datelast', Value(datetime(2200, 1, 1))
                    )).filter(crit).order_by('new_datelast').first()
                if teammember:
                    logger.debug('teammember.employee: ' + str(teammember.employee) + ' datelast: ' + str(teammember.datelast))
                    employee = teammember.employee
                    if employee:
                        wagecode = employee.wagecode

    # create new emplhour
            if new_orderhour:
                new_emplhour = Emplhour(
                    orderhour=new_orderhour,
                    rosterdate=new_rosterdate,
                    timestart = schemeitem.timestart,
                    timeend = schemeitem.timeend,
                    timeduration=schemeitem.timeduration,
                    breakduration=schemeitem.breakduration,
                    employee=employee,
                    wagecode=wagecode,
                    timestatus=STATUS_EMPLHOUR_01_CREATED)
                new_emplhour.save(request=request)

# - update rosterdate in schemeitem
            # after filling orderhours and emplhours: add cycle days to rosterdate, except when cycle = 0
            # recalc timestart timeend
            cycle = schemeitem.scheme.cycle
            if cycle:
                next_rosterdate = schemeitem.rosterdate + timedelta(days=cycle)
                schemeitem.rosterdate = next_rosterdate

        # get new_schemeitem.time_start
                new_timestart = None
                if next_rosterdate and schemeitem.timestartdhm:
                    new_timestart = get_datetimelocal_from_DHM(
                        next_rosterdate, schemeitem.timestartdhm, comp_timezone)
                    schemeitem.timestart = new_timestart
        # get new_schemeitem.time_start
                new_timeend = None
                if next_rosterdate and schemeitem.timeenddhm:
                    new_timeend = get_datetimelocal_from_DHM(
                        next_rosterdate, schemeitem.timeenddhm, comp_timezone)
                    schemeitem.timeend = new_timeend
        # get new_schemeitem.timeduration
                if new_timestart and new_timeend:
                    new_timeduration = get_time_minutes(
                        new_timestart,
                        new_timeend,
                        schemeitem.breakduration)
                    schemeitem.breakduration = new_timeduration
                schemeitem.save(request=request)

# 5555555555555555555555555555555555555555555555555555555555555555555555555555

def RemoveRosterdate(rosterdate_current, request, comp_timezone):  # PR2019-06-17
    logger.debug(' ============= RemoveRosterdate ============= ')

    if rosterdate_current:
# - create recordset of emplhour records with rosterdate = rosterdate_current and schemeitem Not Null
        crit = Q(rosterdate=rosterdate_current) & \
               Q(schemeitem__isnull=False) & \
               Q(order__customer__company=request.user.company)
        orderhours = Orderhour.objects.filter(crit)

        for orderhour in orderhours:

# set rosterdate in schemeitem <cycle> days back
            schemeitem = orderhour.schemeitem
            if schemeitem:
                scheme = schemeitem.scheme
                if scheme:
                    cycle = getattr(scheme, 'cycle')
                    if cycle:
                        old_rosterdate = getattr(schemeitem, 'rosterdate')
                        if old_rosterdate:
                            new_rosterdate = old_rosterdate + timedelta(days=-cycle)

                            schemeitem.rosterdate = new_rosterdate
                    # get new_schemeitem.time_start
                            new_timestart = None
                            if new_rosterdate and schemeitem.timestartdhm:
                                new_timestart = get_datetimelocal_from_DHM(
                                    new_rosterdate, schemeitem.timestartdhm, comp_timezone)
                                schemeitem.timestart = new_timestart
                    # get new_schemeitem.time_start
                            new_timeend = None
                            if new_rosterdate and schemeitem.timeenddhm:
                                new_timeend = get_datetimelocal_from_DHM(
                                    new_rosterdate
                                    , schemeitem.timeenddhm, comp_timezone)
                                schemeitem.timeend = new_timeend
                    # get new_schemeitem.timeduration
                            if new_timestart and new_timeend:
                                new_timeduration = get_time_minutes(
                                    new_timestart,
                                    new_timeend,
                                    schemeitem.breakduration)
                                schemeitem.breakduration = new_timeduration
                            schemeitem.save(request=request)


# delete emplhours of orderhour
            emplhours = Emplhour.objects.filter(orderhour=orderhour)
            for emplhour in emplhours:
                emplhour.delete(request=request)

# delete orderhour
            orderhour.delete(request=request)


# === Create new scheme or team
def create_instance(table, parent_instance, code, temp_pk_str, update_dict, request):
    instance = None
    pk_int = None
    parent_pk_int = None
# - parent and code are required
    if parent_instance and code:
# - create instance
        if table == 'scheme':
            instance = Scheme(order=parent_instance, code=code)
        elif table == 'team':
            instance = Team(scheme=parent_instance, code=code)
# - save instance
        instance.save(request=request)
# - create error when instnce not created
        if instance is None:
            msg_err = _('This item could not be created.')
            update_dict['id']['error'] = msg_err
        else:
# - put info in id_dict
            update_dict['id']['created'] = True
            update_dict['id']['pk'] = instance.pk
            update_dict['pk'] = instance.pk
            # 'parent_pk' is added to update_dict['id'] in function get_parent_instance

# this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
        if temp_pk_str:
            update_dict['id']['temp_pk'] = temp_pk_str

    return instance



# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_parent_instance(table, parent_pk_int, company):
    # logger.debug('get_parent_instance: ' + 'table: ' + str(table) + ' parent_pk_int: ' + str(parent_pk_int) + ' company: ' + str(company))
    # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-06-06

    parent = None
    if parent_pk_int:
        if table == 'scheme':
            parent = Order.objects.get_or_none(id=parent_pk_int, customer__company=company)
        elif table == 'team':
            parent = Scheme.objects.get_or_none(id=parent_pk_int, order__customer__company=company)
        elif table == 'emplhour':
            parent = Orderhour.objects.get_or_none(id=parent_pk_int, order__customer__company=company)
    # logger.debug('parent: ' + str(parent))
    return parent


def get_instance(table, pk_int, parent):
    # function returns instance of table PR2019-06-06
    # logger.debug('====== get_instance: ' + str(table) + ' pk_int: ' + str(pk_int) + ' parent: ' + str(parent))

    instance = None

    if pk_int and parent:
        if table == 'scheme':
            instance = Scheme.objects.get_or_none(id=pk_int, order=parent)
        elif table == 'team':
            instance = Team.objects.get_or_none(id=pk_int, scheme=parent)
        elif table == 'emplhour':
            instance = Emplhour.objects.get_or_none(id=pk_int, orderhour=parent)
        elif table == 'employee':
            instance = Employee.objects.get_or_none(id=pk_int, company=parent)

    return instance

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


"""
# dont forget to  update create_shift_list when time fields have changed
                        for field in ('timestart', 'timeend'):
                            if field in upload_dict:
                                field_dict = upload_dict.get(field)
                                if 'value' in field_dict:
                                    # timestart': {'value': '0;3;45', 'o_value': '2019-04-27T02:36:00+02:00'}}
                                    field_value = field_dict.get('value')
                                    if ';' in field_value:
                                        logger.debug('field_value[' + field + ']: ' + str(field_value))

                                        arr = field_value.split(';')
                                        day_offset = int(arr[0])
                                        new_hour = int(arr[1])
                                        new_minute = int(arr[2])

                                        msg_err = None
                                        # TODO check if date is valid (empty date is ok)
                                        if msg_err is not None:
                                            update_dict[field]['err'] = msg_err
                                            logger.debug('msg_err: ' + str(msg_err))
                                        else:
                                            # row_upload: {'pk': '26', 'timestart': '1;4;48'}
                                            saved_datetime = getattr(schemeitem, field, None)
                                            # saved_datetime: 2019-03-30 03:48:00+00:00
                                            logger.debug('saved_datetime: ' + str(saved_datetime))
                                            # get rosterdate when no saved_datetime
                                            dt_naive = None
                                            if saved_datetime is None:
                                                if schemeitem.rosterdate is not None:
                                                    dt_naive = datetime(schemeitem.rosterdate.year,
                                                                        schemeitem.rosterdate.month,
                                                                        schemeitem.rosterdate.day,
                                                                        new_hour,
                                                                        new_minute)
                                            else:
                                                saved_datetime_aware = get_datetimelocal_from_datetimeUTC(saved_datetime, comp_timezone)
                                                # saved_datetime_aware: 2019-03-30 04:48:00+01:00
                                                logger.debug('saved_datetime_aware: ' + str(saved_datetime_aware))

                                                offset_datetime = saved_datetime_aware + timedelta(days=day_offset)
                                                # offset_datetime: 2019-03-31 04:48:00+01:00
                                                logger.debug('offset_datetime: ' + str(offset_datetime))

                                                dt_naive = datetime(offset_datetime.year,
                                                                    offset_datetime.month,
                                                                    offset_datetime.day,
                                                                    new_hour,
                                                                    new_minute)
                                            # dt_naive: 2019-03-31 04:48:00
                                            logger.debug( 'dt_naive: ' + str(dt_naive))

                                            # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
                                            timezone = pytz.timezone(comp_timezone)
                                            # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
                                            logger.debug( 'timezone: ' + str(timezone) + str( type(timezone)))

                                            dt_localized = timezone.localize(dt_naive)
                                            # dt_localized: 2019-03-31 04:48:00+02:00
                                            logger.debug('dt_localized: ' + str(dt_localized))

                                            utc = pytz.UTC
                                            dt_as_utc = dt_localized.astimezone(utc)
                                            # dt_as_utc: 2019-03-31 02:48:00+00:00
                                            logger.debug( 'dt_as_utc: ' + str(dt_as_utc))

                                            setattr(schemeitem, field, dt_as_utc)
                                            update_dict[field]['updated'] = True
                                            save_changes = True
                                            calculate_hours = True
                                            schemeitem.save(request=self.request)
                                            # datetimesaved: 2019-03-31 02:48:00+00:00
                                            logger.debug('datetimesaved: ' + str(getattr(schemeitem, field, None)))
"""
