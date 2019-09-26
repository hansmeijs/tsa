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

from datetime import date, time, datetime, timedelta

from accounts.models import Usersetting
from companies.views import LazyEncoder
from customers.dicts import create_customer_list, create_order_list, create_absencecategory_list, get_or_create_special_order

from tsap import constants as c
from tsap import functions as f
from planning import dicts as d
from employees import dict as e

from employees.views import update_team_code

from tsap.settings import TIME_ZONE
from tsap.headerbar import get_headerbar_param

from companies import models as m

from tsap.validators import validate_code_name_identifier

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
                    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                    activate(user_lang)

# - get comp_timezone PR2019-06-14
                    comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
                    # logger.debug('request.user.company.timezone: ' + str(request.user.company.timezone))

                    datalist_dict = json.loads(request.POST['datalist_download'])
                    logger.debug('datalist_dict: ' + str(datalist_dict) + ' ' + str(type(datalist_dict)))

                    # datalist_dict: {"customer": {inactive: false}, "order": {inactive: true},
                    #                   "employee": {inactive: false}, "rosterdate": true});

                    # datalist_dict: {'rosterdatefirst': '2019-04-03', 'rosterdatelast': '2019-04-05'} <class 'dict'>

                    # datalist_dict: {'scheme': {'order_pk': 33, 'inactive': True},
                                        # 'schemeitem': {'order_pk': 33},
                                        # 'shift': {'order_pk': 33},
                                        # 'team': {'order_pk': 33},
                                        # 'teammember': {'order_pk': 33}} <class 'dict'>

                    for table in datalist_dict:
                        table_dict = datalist_dict[table]
                        # logger.debug('table_dict: ' + str(table_dict))

# - get include_inactive from table_dict
                        include_inactive = False
                        if 'inactive' in table_dict:
                            include_inactive = table_dict['inactive']
                        # logger.debug('datalist table: ' + str(table))

                        list = []

                        if table == 'submenu':
                            datalists[table] = {}
                            if request.user.is_role_system_and_perm_admin:
                                datalists[table]['user_is_role_system_and_perm_admin'] = True
                            if request.user.is_role_company_and_perm_admin:
                                datalists[table]['user_is_role_company_and_perm_admin'] = True

                        elif table == 'customer':
                            # shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacemenet, 512=absence, 1024=rest, 4096=template
                            cat = table_dict.get('cat')  # None = all
                            cat_lt = table_dict.get('cat_lt')  # None = all
                            inactive = table_dict.get('inactive') # True: show inactive only, False: active only , None: show all
                            list = create_customer_list(company=request.user.company, cat=cat, cat_lt=cat_lt, inactive=inactive)

                        elif table == 'order':
                            # default: show orders with cat normal, internal, hide absence and template
                            cat = table_dict.get('cat')  # None = all
                            cat_lt = table_dict.get('cat_lt')  # None = all
                            inactive = False if not include_inactive else None
                            list = create_order_list(company=request.user.company, cat=cat, cat_lt=cat_lt, inactive=inactive)

                        elif table == 'order_template':
                            # inactive = None: include active and inactive, False: only active
                            list = create_order_list(company=request.user.company, cat=c.SHIFT_CAT_4096_TEMPLATE)

                        elif table == 'scheme_template':
                            list = d.create_scheme_template_list(request)

                        elif table == 'schemeitem_template':
                            list = d.create_schemeitem_template_list(request, comp_timezone)

                        elif table == 'abscat':
                            list = create_absencecategory_list(request)

                        elif table == 'employee':
                            list = e.create_employee_list(company=request.user.company)

                        elif table == 'replacement':
                            list = d.create_replacementshift_list(table_dict, request.user.company)

                        elif table == 'teammember':
                            list = e.create_teammember_list(table_dict, request.user.company)

                        elif table == 'period':
                            logger.debug(' table: ' + str(table))
                            get_current = False
                            if 'mode' in table_dict:
                                if table_dict['mode'] == 'current':
                                    get_current = True

                            period_dict = d.get_period_dict_and_save(request, get_current)
                            datalists[table] = period_dict
                            # datalist[period]: {'mode': 'range', 'interval': 24, 'overlap_prev': 24, 'overlap_next': 24,
                            # 'periodstart': '2019-07-29T22:00:00+00:00', 'periodend': '2019-08-01T22:00:00+00:00',
                            # 'range': '0;0;0;0', 'rangestart': '2019-03-30', 'rangeend': '', 'today': '2019-08-01'}

                            is_range = False
                            show_all = False
                            if 'mode' in period_dict:
                                if period_dict['mode'] == 'range':
                                    is_range = True
                                if 'range' in period_dict:
                                    if period_dict['range'] == '0;0;0;0':
                                        show_all = True

                            period_timestart_utc = None
                            period_timeend_utc = None
                            range_start_iso = ''
                            range_end_iso = ''
                            if is_range:
                                if 'rangestart' in period_dict:
                                    range_start_iso = period_dict['rangestart']
                                if 'rangeend' in period_dict:
                                    range_end_iso = period_dict['rangeend']
                            else:
                                if 'periodstart' in period_dict:
                                    period_timestart_iso = period_dict['periodstart']
                                    period_timestart_utc = f.get_datetime_UTC_from_ISOstring(period_timestart_iso)
                                if 'periodend' in period_dict:
                                    period_timeend_iso = period_dict['periodend']
                                    period_timeend_utc = f.get_datetime_UTC_from_ISOstring(period_timeend_iso)


                            d.check_overlapping_shifts(range_start_iso, range_end_iso, request)  # PR2019-09-18

                            emplhour_list = d.create_emplhour_list(company=request.user.company,
                                                                 comp_timezone=comp_timezone,
                                                                 time_min=period_timestart_utc,
                                                                 time_max=period_timeend_utc,
                                                                 range_start_iso=range_start_iso,
                                                                 range_end_iso=range_end_iso,
                                                                 show_all=show_all)  # PR2019-08-01

                            if emplhour_list:
                                datalists['emplhour'] = emplhour_list

                        elif table == 'review':
                            # TODO period
                            datefirst = None
                            datelast = None

                            datalists[table] = d.create_review_list(datefirst, datelast, request)

                        elif table == 'rosterdatefill':
                            datalists[table] = d.get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)

                        elif table == 'quicksave':
                            # get quicksave from Usersetting
                            quicksave_str = Usersetting.get_setting(c.KEY_USER_QUICKSAVE, request.user)
                            quicksave = True if quicksave_str == '1' else False
                            datalists[table] = {'value': quicksave}

                        else:
                            # - get customer from table_dict
                            customer_pk = table_dict.get('customer_pk')
                            if customer_pk:
                                customer = m.Customer.objects.get_or_none(
                                    company=request.user.company,
                                    pk=customer_pk)
                            # logger.debug('order: ' + str(order) + ' ' + str(type(order)))
                            # logger.debug('table: ' + str(table) + ' ' + str(type(table)))
                            # logger.debug('include_inactive: ' + str(include_inactive) + ' ' + str(type(include_inactive)))

                                if customer:
                                    # logger.debug('if order: ')
                                    if table == 'scheme':
                                        list = d.create_scheme_list(
                                            request=request,
                                            customer=customer,
                                            include_inactive=include_inactive)
                                    elif table == 'schemeitem':
                                        list = d.create_schemeitem_list(
                                            request=request,
                                            customer=customer,
                                            comp_timezone=comp_timezone)
                                    elif table == 'shift':
                                        list = d.create_shift_list(
                                            request=request,
                                            customer=customer)
                                    elif table == 'team':
                                        list = d.create_team_list(
                                            request=request,
                                            customer=customer)

                        if list:
                            datalists[table] = list

                        # logger.debug('datalist ' + str(table) + ' done')

        datalists_json = json.dumps(datalists, cls=LazyEncoder)

        return HttpResponse(datalists_json)


# === RosterView ===================================== PR2019-05-26
@method_decorator([login_required], name='dispatch')
class RosterView(View):

    def get(self, request):
        param = {}
        # logger.debug(' ============= RosterView ============= ')
        if request.user.company is not None:
            # datefirst = None
            # datelast = None
            # crit = (Q(orderhour__order__customer__company=request.user.company) | Q(employee__company=request.user.company))
            # if datefirst:
            #     crit.add(Q(rosterdate__gte=datefirst), crit.connector)
            # if datelast:
            #     crit.add(Q(rosterdate__lte=datelast), crit.connector)
            #emplhours = m.Emplhour.objects.filter(crit)
            # emplhours = m.Emplhour.objects.all()

            # for emplhour in emplhours:
            #     string = str(emplhour.id)
            #     if emplhour.rosterdate:
            #          string += ' - rosterdate: ' + str(emplhour.rosterdate)
            #      if emplhour.orderhour:
            #         string += ' - order: ' + str(emplhour.orderhour.order.code)

            employees = m.Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
            employee_list = []
            for employee in employees:
                employee_list.append({'pk': employee.id, 'code': employee.code})
            employee_json = json.dumps(employee_list)

            # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

    # get user_lang
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT

    # get weekdays translated
            lang = user_lang if user_lang in c.WEEKDAYS_ABBREV else c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[lang])

    # get months translated
            lang = user_lang if user_lang in c.MONTHS_ABBREV else c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[lang])

            # get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

            # get timeformat
            timeformat = 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in c.TIMEFORMATS:
                timeformat = '24h'

            # get quicksave from Usersetting
            quicksave = 0
            quicksave_str = Usersetting.get_setting(c.KEY_USER_QUICKSAVE, request.user)
            if quicksave_str:
                quicksave = int(quicksave_str)

            # get_current = False
            # period_dict = d.get_period_dict_and_save(request, get_current)
            # period_json = json.dumps(period_dict)


            # TODO change to today in period_dict  today =  get_today(request)

            # --- get today
            today_dict = {'value': str(date.today()),
                          'wdm': f.get_date_WDM_from_dte(date.today(), user_lang),
                          'wdmy': f.format_WDMY_from_dte(date.today(), user_lang),
                          'dmy': f.format_DMY_from_dte(date.today(), user_lang),
                          'offset': f.get_weekdaylist_for_DHM(date.today(), user_lang)}
            today_json = json.dumps(today_dict)

            param = get_headerbar_param(request, {
                'lang': user_lang,
                'timezone': comp_timezone,
                'timeformat': timeformat,
                'interval': interval,
                'weekdays': weekdays_json,
                'months': months_json,
                'today': today_json,
                'quicksave': quicksave
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
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT

# --- get weekdays translated
            lang = user_lang if user_lang in c.WEEKDAYS_ABBREV else c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[lang])

# --- get months translated
            lang = user_lang if user_lang in c.MONTHS_ABBREV else c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[lang])

# --- create list of all active customers of this company
            # inactive = False: include only active instances
            customer_list = create_customer_list(company=request.user.company,
                                                 inactive=False,
                                                 cat_lt=c.SHIFT_CAT_0512_ABSENCE)
            customer_json = json.dumps(customer_list)

# --- create list of all active orders of this company
            # order_json = json.dumps(create_order_list(request.user.company))

            # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            # logger.debug('comp_timezone: ' + str(comp_timezone))

# ---  get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

# get timeformat
            timeformat = '24h' # or 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in c.TIMEFORMATS:
                timeformat = '24h'

# --- get today
            today_dict = {'value': str(date.today()),
                          'wdm': f.get_date_WDM_from_dte(date.today(), user_lang),
                          'wdmy': f.format_WDMY_from_dte(date.today(), user_lang),
                          'dmy': f.format_DMY_from_dte(date.today(), user_lang),
                          'offset': f.get_weekdaylist_for_DHM(date.today(), user_lang)}
            today_json = json.dumps(today_dict)


# get quicksave from Usersetting
            quicksave = False
            quicksave_str = Usersetting.get_setting(c.KEY_USER_QUICKSAVE, request.user)
            if quicksave_str:
                quicksave = int(quicksave_str)

# get quicksave from Usersetting
            quicksave_str = Usersetting.get_setting(c.KEY_USER_QUICKSAVE, request.user)
            quicksave = True if quicksave_str == '1' else False

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
class SchemeUploadView(UpdateView):  # PR2019-07-21

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            # comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# - get upload_dict from request.POST
            logger.debug('request.POST: ' + str(request.POST))
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))

# 1. get_iddict_variables
                id_dict = upload_dict.get('id')
                pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)
                logger.debug('id_dict: ' + str(id_dict))

# 2. Create empty item_update with keys for all fields. Unused ones will be removed at the end
                field_list = ('id', 'order', 'code', 'cycle', 'datefirst', 'datelast',
                    'excludeweekend', 'excludepublicholiday', 'locked', 'inactive')
                item_update = f.create_dict_with_empty_attr(field_list)

# 3. check if parent exists (order is parent of scheme)
                parent = m.Order.objects.get_or_none(id=ppk_int, customer__company=request.user.company)
                if parent:
                    instance = None

# B. Delete instance
                    if is_delete:
                        instance = m.Scheme.objects.get_or_none(id=pk_int, order=parent)
                        if instance:
                            this_text = _("Scheme '%(tbl)s'") % {'tbl': instance.code}
                            m.delete_instance(instance, item_update, request, this_text)

# C. Create new scheme
                    elif is_create:
                        instance = create_scheme(parent, upload_dict, item_update, request, temp_pk_str)
                        # logger.debug('new instance: ' + str(instance))

# D. get existing instance
                    else:
                        instance = m.Scheme.objects.get_or_none(id=pk_int, order=parent)

# E. update instance, also when it is created
                    if instance:
                        update_scheme(instance, upload_dict, item_update, request)
                    # logger.debug('updated instance: ' + str(instance))

# F. add all saved values to item_update
                    # logger.debug('item_update before : ' + str(item_update))
                    d.create_scheme_dict(instance, item_update)
                    # logger.debug('item_update after  : ' + str(item_update))

# 6. remove empty attributes from item_update
                    f.remove_empty_attr_from_dict(item_update)
                    # logger.debug('item_update: ' + str(item_update))

# 7. add item_update to update_wrap
                    if item_update:
                        update_wrap['item_update'] = item_update

# 8. update scheme_list when changes are made
                    scheme_list = d.create_scheme_list(request=request,
                                                       order=parent,
                                                       include_inactive=False)
                    if scheme_list:
                        update_wrap['scheme'] = scheme_list

        # logger.debug('update_wrap: ' + str(update_wrap))
        update_dict_json = json.dumps(update_wrap, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


@method_decorator([login_required], name='dispatch')
class SchemeTemplateUploadView(View):  # PR2019-07-20
    def post(self, request, *args, **kwargs):
        logger.debug(' ====== SchemeTemplateUploadView ============= ')
        item_update_dict = {}
        if request.user is not None and request.user.company is not None:

 # - Reset language
            # PR2019-08-24 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

            upload_dict = {}
            if 'createdefaulttemplate' in request.POST:
                upload_json = request.POST.get('createdefaulttemplate', None)
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    if upload_dict:
                        create_deafult_templates(request, user_lang)

            elif 'copyfromtemplate' in request.POST:
                upload_json = request.POST.get('copyfromtemplate', None)
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    if upload_dict:
                        copyfrom_template(upload_dict, request)

            elif 'copytotemplate' in request.POST:
# - get upload_dict from request.POST
                upload_dict = {}
                upload_json = request.POST.get('copytotemplate', None)
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    if upload_dict:
                        copy_to_template(upload_dict, request)

# - copy scheme_items to template  (don't copy datefirst, datelast)

        # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

def copy_to_template(upload_dict, request):  # PR2019-08-24
    logger.debug(' ====== copy_to_template ============= ')

# - get_iddict_variables
    id_dict = upload_dict.get('id')

    template_code = None
    if 'code' in upload_dict:
        code_dict = upload_dict['code']
        if 'value' in code_dict:
            template_code = code_dict['value']

    if id_dict and template_code:
        table = 'scheme'
        pk_int = int(id_dict.get('pk', 0))
        ppk_int = int(id_dict.get('ppk', 0))
        logger.debug('pk_int: ' + str(pk_int) + ' ppk_int: ' + str(ppk_int))

# - check if parent exists (scheme is parent of schemeitem, team is parent of teammember (and scheme is parent of team)
        # parent_instance adds 'parent_pk' and 'table' to update_dict['id']
        # TODO make corrections update_dict
        update_dict = {}
        parent = m.get_parent(table, ppk_int, update_dict, request)
        logger.debug('parent_instance: ' + str(parent))

# - get scheme
        # TODO update_dict
        instance = m.get_instance(table, pk_int, parent, update_dict)
        logger.debug('instance: ' + str(instance))

# - check if template_order exists, create if not exists
        template_order = get_or_create_special_order(c.SHIFT_CAT_4096_TEMPLATE, request)
        logger.debug("template_order: " + str(template_order.pk) + ' ' + str(template_order.code))

# - copy scheme to template  (don't copy datefirst, datelast)
        template_scheme = m.Scheme(
            order=template_order,
            cat=c.SHIFT_CAT_4096_TEMPLATE,
            code=template_code,
            cycle=instance.cycle,
            excludeweekend=instance.excludeweekend,
            excludepublicholiday=instance.excludepublicholiday)
        template_scheme.save(request=request)

# - copy shifts to template
        shifts = m.Shift.objects.filter(scheme=instance)
        mapping_shifts = {}
        for shift in shifts:
            template_shift = m.Shift(
                scheme=template_scheme,
                cat=shift.cat,
                code=shift.code,
                offsetstart=shift.offsetstart,
                offsetend=shift.offsetend,
                breakduration=shift.breakduration,
                wagefactor=shift.wagefactor
            )
            template_shift.save(request=request)
            # make dict with mapping of old and new shift_id
            mapping_shifts[shift.pk] = template_shift.pk
        logger.debug('mapping_shifts: ' + str(mapping_shifts))

# - copy teams to template
        teams = m.Team.objects.filter(scheme=instance)
        count = 0
        mapping_teams = {}
        for team in teams:
            count += 1
            this_text = _("Employee %(tbl)s") % {'tbl': str(count)}
            logger.debug('this_text: ' + str(this_text))

            template_team = m.Team(
                scheme=template_scheme,
                code=this_text,
                cat=c.SHIFT_CAT_4096_TEMPLATE)
            template_team.save(request=request)
            # make dict with mapping of old and new team_id
            mapping_teams[team.pk] = template_team.pk
        logger.debug('mapping_teams: ' + str(mapping_teams))

# - copy schemeitems to template
        # Schemeitem ordering = ['rosterdate', 'timestart']
        schemeitems = m.Schemeitem.objects.filter(scheme=instance)
        # first item has cyclestart = True (needed for startdate of copied scheme, set False after first item
        is_cyclestart = True
        for schemeitem in schemeitems:
            logger.debug('schemeitem: ' + str(schemeitem))
            template_schemeitem = m.Schemeitem(
                scheme=template_scheme,
                shift=schemeitem.shift,
                rosterdate=schemeitem.rosterdate,
                iscyclestart=is_cyclestart,
                timestart=schemeitem.timestart,
                timeend=schemeitem.timeend,
                timeduration=schemeitem.timeduration,
            )
            is_cyclestart = False

    # loopkup shift
            if schemeitem.shift:
                lookup_shift_pk = mapping_shifts[schemeitem.shift.pk]
                shift = m.Shift.objects.get_or_none(pk=lookup_shift_pk)
                if shift:
                    template_schemeitem.shift = shift

    # loopkup team
            if schemeitem.team:
                lookup_team_pk = mapping_teams[schemeitem.team.pk]
                team = m.Team.objects.get_or_none(pk=lookup_team_pk)
                if team:
                    template_schemeitem.team = team

    # save template_schemeitem
            template_schemeitem.save(request=request)
            logger.debug('template_schemeitem.shift: ' + str(template_schemeitem.shift))


def copyfrom_template(upload_dict, request):  # PR2019-07-26
    # logger.debug(' ====== copyfrom_template ============= ')

    # {copyfromtemplate: "{"id":{"pk":44,"ppk":4,"table":"template_scheme"},
    #                       "code":{"value":"24 uur","update":true},
    #                       "order":{"pk":2}}"}
    # NOTE: {id: {pk is template_pk, ppk is template_ppk
    item_update_dict = {}

# - get_iddict_variables
    id_dict = upload_dict.get('id')
    # "id":{"pk":44,"ppk":2,"table":"scheme"}

# - get order_pk of  new scheme
    order_pk = None
    if 'order' in upload_dict:
        order_dict = upload_dict['order']
        if 'pk' in order_dict:
            order_pk = order_dict['pk']
    # logger.debug('order_pk: ' + str(order_pk) + ' ' + str(type(order_pk)))

# - get new scheme_code
    scheme_code = None
    if 'code' in upload_dict:
        code_dict = upload_dict['code']
        if 'value' in code_dict:
            scheme_code = code_dict['value']

    if id_dict and order_pk and scheme_code:
    # get template scheme
        table = 'scheme'
        template_pk_int = int(id_dict.get('pk', 0))
        template_ppk_int = int(id_dict.get('ppk', 0))
        # logger.debug('template_pk_int: ' + str(template_pk_int) + ' template_ppk_int: ' + str(template_ppk_int))

    # - check if scheme parent exists (order is parent of scheme)
        # TODO update_dict
        update_dict = {}
        template_parent = m.get_parent(table, template_ppk_int, update_dict, request)
        # logger.debug('template_parent: ' + str(template_parent))
        # TODO update_dict
        update_dict = {}
        template_scheme = m.get_instance(table, template_pk_int, template_parent, update_dict)
        # logger.debug('template_scheme: ' + str(template_scheme))

# - check if scheme parent exists (order is parent of scheme)
        scheme_parent = m.get_parent(table, order_pk, update_dict, request)
        # logger.debug('scheme_parent: ' + str(scheme_parent))

        if template_scheme and scheme_parent:
# - copy template to scheme   (don't copy datefirst, datelast)
            new_scheme = m.Scheme(
                order=scheme_parent,
                cat=c.SHIFT_CAT_0000_NORMAL,
                code=scheme_code,
                cycle=template_scheme.cycle,
                excludeweekend=template_scheme.excludeweekend,
                excludepublicholiday=template_scheme.excludepublicholiday)
            new_scheme.save(request=request)
            # logger.debug('new_scheme: ' + str(new_scheme.code) + ' new_scheme_pk: ' + str(new_scheme.pk))

            if new_scheme:
    # - copy template_teams to scheme
                template_teams = m.Team.objects.filter(scheme=template_scheme)
                mapping = {}
                for team in template_teams:
                    new_team = m.Team(
                        scheme=new_scheme,
                        code=team.code)
                    new_team.save(request=request)
                    # make dict with mapping of old and new team_id
                    mapping[team.pk] = new_team.pk
                # logger.debug('mapping: ' + str(mapping))

    # - copy template_schemeitems to schemeitems
                template_schemeitems = m.Schemeitem.objects.filter(scheme=template_scheme)
                for schemeitem in template_schemeitems:
                    # logger.debug('schemeitem: ' + str(schemeitem))
                    new_schemeitem = m.Schemeitem(
                        scheme=new_scheme,
                        rosterdate=schemeitem.rosterdate,
                        cyclestart=schemeitem.cyclestart,
                        shift=schemeitem.shift,
                        timestart=schemeitem.timestart,
                        offsetstart=schemeitem.offsetstart,
                        timeend=schemeitem.timeend,
                        offsetend=schemeitem.offsetend,
                        breakduration=schemeitem.breakduration,
                        timeduration=schemeitem.timeduration,
                    )
                    # loopkup team
                    if schemeitem.team:
                        lookup_team_pk = mapping[schemeitem.team.pk]
                        team = m.Team.objects.get_or_none(pk=lookup_team_pk)
                        if team:
                            new_schemeitem.team = team
                    new_schemeitem.save(request=request)
                    # logger.debug('new_schemeitem.shift: ' + str(new_schemeitem.shift))

def create_deafult_templates(request, user_lang):  # PR2019-08-24
    logger.debug(' ====== create_deafult_templates ============= ')

 # get locale text of standard scheme
    lang = user_lang if user_lang in c.SCHEME_24H_DEFAULT else c.LANG_DEFAULT
    scheme_locale = c.SCHEME_24H_DEFAULT[lang] # (code, cycle, excludeweekend, excludepublicholiday) PR2019-08-24

# - check if template_order exists, create if not exists
    template_order = get_or_create_special_order(c.SHIFT_CAT_4096_TEMPLATE, request)
    logger.debug("template_order: " + str(template_order.pk) + ' ' + str(template_order.code))

# - add scheme to template  (don't add datefirst, datelast)
    template_scheme = m.Scheme(
        order=template_order,
        cat=c.SHIFT_CAT_4096_TEMPLATE,
        code=scheme_locale[0],
        cycle=scheme_locale[1],
        excludeweekend=scheme_locale[2],
        excludepublicholiday=scheme_locale[3])
    template_scheme.save(request=request)

# - add shifts to template
    mapping_shift = {}
    shifts_locale = c.SHIFT_24H_DEFAULT[lang] # (code, cycle, excludeweekend, excludepublicholiday) PR2019-08-24
    for index, shift in enumerate(shifts_locale):
        template_shift = m.Shift(
            scheme=template_scheme,
            cat=c.SHIFT_CAT_4096_TEMPLATE,
            code=shift[0])
        if shift[1]:
            template_shift.offsetstart=shift[1]
        if shift[2]:
            template_shift.offsetend=shift[2]
        if shift[3]:
            template_shift.breakduration=shift[3]
        template_shift.save(request=request)
# make dict with mapping of index in shifts_locale and new shift_id
        mapping_shift[index] = template_shift.pk

# - add teams to template
    mapping_team = {}
    teams_locale = c.TEAM_24H_DEFAULT[lang]  # (code, cycle, excludeweekend, excludepublicholiday) PR2019-08-24
    for index, team_code in enumerate(teams_locale):

# - add teams to template
        template_team = m.Team(
            scheme=template_scheme,
            cat=c.SHIFT_CAT_4096_TEMPLATE,
            code=team_code)
        template_team.save(request=request)
        # make dict with mapping of index in shifts_locale and new shift_id
        mapping_team[index] = template_team.pk

# - add schemeitems to template
    for index, item in enumerate(c.SCHEMEITEM_24H_DEFAULT):
        # 0 = cycleday, 1 = shift, 2 = team
        cycleday = item[0]

# get rosterdate
        today = date.today()
        rosterdate = today + timedelta(days=cycleday)

# first item has cyclestart = True (needed for startdate of copied scheme, set False after first item
        is_cyclestart = True

# get shift
        shift = None
        shift_pk = mapping_shift[item[1]]  # item[1] is shift_index
        if shift_pk:
            shift = m.Shift.objects.get_or_none(pk=shift_pk, scheme=template_scheme)
 # get team
        team = None
        team_pk = mapping_team[item[2]]  # item[2] is team_index
        if team_pk:
            team = m.Team.objects.get_or_none(pk=team_pk, scheme=template_scheme)

# - copy schemeitems to template
        # fields: scheme, shift, team, wagefactor, rosterdate , iscyclestart, timestart, timeend, timeduration

        template_schemeitem = m.Schemeitem(
            scheme=template_scheme,
            rosterdate=rosterdate,
            iscyclestart=is_cyclestart,
        )
        if team:
            template_schemeitem.team = team
        if shift:
            template_schemeitem.shift = shift
            # TODO calc timestart timeend timeduration

# save template_schemeitem
        template_schemeitem.save(request=request)
        logger.debug('template_schemeitem.shift: ' + str(template_schemeitem.shift))

        is_cyclestart = False


@method_decorator([login_required], name='dispatch')
class SchemeOrShiftOrTeamUploadView(UpdateView):  # PR2019-05-25

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeOrShiftOrTeamUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # b. get comp_timezone
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            upload_json = request.POST.get("upload")
            if upload_json:
                upload_dict = json.loads(upload_json)
                # logger.debug('upload_dict ' + str(upload_dict))

            # 1. get_iddict_variables
                table = ''
                id_dict = upload_dict.get('id')
                if id_dict:
                    table = id_dict.get('table', '')

                update_wrap = {}
                if table == 'scheme':
                    update_wrap = scheme_upload(request, upload_dict, user_lang)
                if table == 'shift':
                    update_wrap = shift_upload(request, upload_dict, comp_timezone)
                elif table == 'team':
                    update_wrap = team_upload(request, upload_dict, comp_timezone)

# 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


def scheme_upload(request, upload_dict, user_lang):  # PR2019-05-31
    # logger.debug(' --- scheme_upload --- ')
    # logger.debug(upload_dict)
    #  {'id': {'temp_pk': 'new_1', 'create': True, 'parent_pk': 6}, 'code': {'update': True, 'value': 'new'}}

    update_wrap = {}
    instance = None

# 1. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    # FIELDS_SCHEME = ('id', 'order', 'cat', 'code', 'datefirst', 'datelast',
    #                  'cycle', 'excludeweekend', 'excludepublicholiday', 'inactive')
    field_list = c.FIELDS_SCHEME
    update_dict = f.create_dict_with_empty_attr(field_list)

    # 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)
    # logger.debug('id_dict: ' + str(id_dict))

# 5. check if parent exists (order is parent of scheme)
    parent = m.Order.objects.get_or_none(id=ppk_int, customer__company=request.user.company)
    if parent:

# B. Delete instance
        if is_delete:
            instance = m.Scheme.objects.get_or_none(id=pk_int, order=parent)
            if instance:
                this_text = _("Scheme '%(tbl)s'") % {'tbl': instance.code}
                m.delete_instance(instance, update_dict, request, this_text)

# C. Create new scheme
        elif is_create:
            instance = create_scheme(parent, upload_dict, update_dict, request, temp_pk_str)
            # logger.debug('new instance: ' + str(instance))

# D. get existing instance
        else:
            instance = m.Scheme.objects.get_or_none(id=pk_int, order=parent)

# E. update instance, also when it is created
        if instance:
            update_scheme( instance, upload_dict, update_dict, request)

# 6. remove empty attributes from update_dict
        f.remove_empty_attr_from_dict(update_dict)
        # logger.debug('update_dict: ' + str(update_dict))

# 7. add update_dict to update_wrap
        if update_dict:
            update_wrap['scheme_update'] = update_dict

# 9. update order_list when changes are made
        scheme_list = d.create_scheme_list(request=request,
                                           order=parent,
                                           include_inactive=False)
        if scheme_list:
            update_wrap['scheme_list'] = scheme_list

    return update_wrap


def shift_upload(request, upload_dict, comp_timezone):  # PR2019-08-08
    # --- update existing and new teammmber PR2019-09-08
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- shift_upload ---')
    logger.debug('upload_dict' + str(upload_dict))

    # id: {pk: 116, ppk: 1107, table: "shift"}
    # offsetend: {value: "1040", update: true}

    update_wrap = {}

# 1. save quicksave
    if 'quicksave' in upload_dict:
        quicksave_bool = upload_dict.get('quicksave', False)
        quicksave_str = '1' if quicksave_bool else '0'
        Usersetting.set_setting(c.KEY_USER_QUICKSAVE, quicksave_str, request.user)  # PR2019-07-02

# 2. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    update_dict = f.create_dict_with_empty_attr(c.FIELDS_SHIFT)

# 3. get_iddict_variables
    id_dict = upload_dict.get('id')
    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)

# 4. check if parent exists (customer is parent of order)
     # get_parent adds 'ppk' and 'table' to id_dict
    parent = m.get_parent(table, ppk_int, update_dict, request)
    if parent:

# B. Delete instance
        if is_delete:
            # get_instance adds 'pk'to id_dict and adds pk_dict
            instance = m.get_instance(table, pk_int, parent, update_dict)
            if instance.code:
                this_text = _("Shift '%(tbl)s'") % {'tbl': instance.code}
            else:
                this_text = _('This shift')
            # delete_instance adds 'deleted' or 'error' to id_dict
            delete_ok = m.delete_instance(instance, update_dict, request, this_text)
            if delete_ok:
                instance = None

# C. Create new shift
        elif is_create:
            # create_shift adds 'temp_pk', 'created' to id_dict, and 'error' to code_dict
            instance = create_shift(upload_dict, update_dict, request)

# D. Get existing instance
        else:
            instance = m.get_instance(table, pk_int, parent, update_dict)

# E. update instance, also when it is created
        if instance:
            update_shift(instance, parent, upload_dict, update_dict, request)

# F. Add all saved values to update_dict, add id_dict to update_dict
            d.create_shift_dict(instance, update_dict)

# 6. remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(update_dict)

# 7. add update_dict to update_wrap
    if update_dict:
        update_wrap['item_update'] = update_dict

# 8. update shift_list
    shift_list = d.create_shift_list(
        request=request,
        customer=parent.order.customer)
    if shift_list:
        update_wrap['shift_list'] = shift_list

# 9. update schemeitem_list when changes are made
    item_list = d.create_schemeitem_list(
        request=request,
        customer=parent.order.customer,
        comp_timezone=comp_timezone)

    if item_list:
        update_wrap['schemeitem'] = item_list

# 10. return update_wrap
    return update_wrap


def team_upload(request, upload_dict, comp_timezone):  # PR2019-05-31
    logger.debug(' --- team_upload --- ')
    logger.debug(upload_dict)

    # {'id': {'table': 'team', 'create': True, 'temp_pk': 'new_2', 'ppk': 1107},
    # 'code': {'field': 'code', 'value': 'Look R', 'update': True},
    # 'employee': {'table': 'employee', 'pk': 433, 'ppk': 2, 'value': 'Look R', 'update': True}}

    update_wrap = {}

# 1 Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    update_dict = f.create_dict_with_empty_attr(c.FIELDS_TEAM) # FIELDS_TEAM = ('pk', 'id', 'code')

# 2. get_iddict_variables  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
    id_dict = upload_dict.get('id')
    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)
    logger.debug('pk_int: ' + str(pk_int) + ' ppk_int: ' + str(ppk_int))

# check if parent exists
    scheme = m.Scheme.objects.get_or_none(id=ppk_int, order__customer__company=request.user.company)
    logger.debug('scheme: ' + str(scheme))
    if scheme:
        save_changes = False
        team = None
# ===== Create new team
        if 'create' in id_dict:

# only create team when employee is given
            employee = None
            if 'employee' in upload_dict:
                employee_dict = upload_dict['employee']
                employee_pk = employee_dict.get('pk')
                if employee_pk:
                    employee = m.Employee.objects.get_or_none(id=employee_pk, company=request.user.company)
            if employee:
                logger.debug('employee: ' + str(employee))

                # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
                if temp_pk_str:
                    update_dict['id']['temp_pk'] = temp_pk_str

                team = m.Team(scheme=scheme)
                if employee.code:
                    team.code = employee.code
                team.save(request=request)
                logger.debug('team: ' + str(team))

                if team:


                    update_dict['id']['created'] = True
                    save_changes = True
                    employee_dict = {'pk': employee.pk, 'ppk': employee.company.pk,
                                     'code': employee.code, 'updated': True}
                    update_dict['employee'] = employee_dict

# ===== Create new teammember
                    # TODO give value to variables
                    workhoursperday = 0
                    wagerate = 0
                    wagefactor = 0
                    teammember = m.Teammember(
                        team=team,
                        employee=employee,
                        cat=cat,
                        workhoursperday=workhoursperday,
                        wagerate=wagerate,
                        wagefactor=wagefactor
                    )
                    teammember.save(request=request)
                    logger.debug('teammember: ' + str(teammember))

        else:
# ===== or get existing team
            team = m.Team.objects.filter(id=pk_int, scheme=scheme).first()
        if team:
            update_dict['pk'] = team.pk
            update_dict['ppk'] = team.scheme.pk

            update_dict['id']['pk'] = team.pk
            update_dict['id']['ppk'] = team.scheme.pk
            update_dict['id']['table'] = 'team'

            update_dict['code'] = {'value': team.code, 'updated': True}
            logger.debug('update_dict: ' + str(update_dict))
            # update_dict: {'pk': 1313, 'id': {'temp_pk': 'new_2', 'created': True, 'pk': 1313, 'ppk': 1116, 'table': 'team'},
            # 'code': {}, 'employee': {'pk': 1269, 'ppk': 2, 'code': 'Zhen X', 'updated': True}, 'ppk': 1116}

# ===== Delete team
            if 'delete' in id_dict and not 'create' in id_dict:
                team.delete(request=request)
# check if record still exist
                team = m.Team.objects.filter(id=pk_int, scheme=scheme).first()
                if team is None:
                    update_dict['id']['deleted'] = True
                else:
                    msg_err = _('This team could not be deleted.')
                    update_dict['id']['del_err'] = msg_err
            else:

# --- save changes in field 'code'
                field = 'code'
                new_value = None
                saved_value = None
                logger.debug('field: ' + str(field))

                if field in upload_dict:
                    field_dict = upload_dict.get(field)
                    new_value = field_dict.get('value')
                saved_value = getattr(team, field, None)
                logger.debug('new_value: ' + str(new_value) + ' saved_value: ' + str(saved_value))
                if not new_value and not saved_value:
                    new_value = _('Select employee') + '...'
                logger.debug('new_value: ' + str(new_value) + ' saved_value: ' + str(saved_value))
                # don't update empty code - it will erase existing code
                if new_value and new_value != saved_value:
                    setattr(team, field, new_value)
                    update_dict[field]['updated'] = True
                    save_changes = True
        logger.debug('update_dict: ' + str(update_dict))

# --- save changes
        if save_changes:
            team.save(request=request)
            logger.debug('team saved: ', team.code)

            for field in update_dict:
                if field == 'code':
                    if team.code:
                        update_dict[field]['value'] = team.code

# --- update team_list
            team_list = d.create_team_list(
                request=request,
                customer=scheme.order.customer)
            if team_list:
                update_wrap['team_list'] = team_list

# --- update teammember_list
            table_dict = {'order_pk': scheme.order}
            teammember_list = e.create_teammember_list(table_dict, request.user.company)
            if teammember_list:
                update_wrap['teammember_list'] = teammember_list

# 6. remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(update_dict)

# 7. add update_dict to update_wrap
    if update_dict:
        update_wrap['team_update'] = update_dict

# 9. update schemeitem_list when changes are made
    item_list = d.create_schemeitem_list(
        request=request,
        customer=scheme.order.customer,
        comp_timezone=comp_timezone)
    if item_list:
        update_wrap['schemeitem'] = item_list
    return update_wrap


def get_order(company, order_pk):
    order = None
    if order_pk:
        order = m.Order.objects.filter(id=order_pk,customer__company=company).first()
    return order


def get_scheme(company, scheme_pk):
    scheme = None
    if scheme_pk:
        scheme = m.Scheme.objects.filter( id=scheme_pk, order__customer__company=company).first()
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
                user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                activate(user_lang)

# - get comp_timezone PR2019-06-14
                comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

                if request.POST['scheme_download']:
                    scheme_download = json.loads(request.POST['scheme_download'])
                    # logger.debug('scheme_download: ' + str(scheme_download) + str(type(scheme_download)))
                    # scheme_download: {'scheme_pk': 18}
                    scheme_pk = int(scheme_download.get('scheme_pk', '0'))
                    scheme = m.Scheme.objects.filter(order__customer__company=request.user.company,
                                                    pk=scheme_pk,
                                                    ).first()
                    if scheme:
                        scheme_dict = {}
                        d.create_scheme_dict(scheme, scheme_dict)

                        datalists = {'scheme': scheme_dict}
                        # logger.debug('datalists: ' + str(datalists))

                        # create shift_list
                        shift_list = d.create_shift_list(
                            request=request,
                            customer=scheme.order.customer)
                        if shift_list:
                            datalists['shift_list'] = shift_list

                        # create team_list
                        team_list = d.create_team_list(
                            request=request,
                            customer=scheme.order.customer)
                        if team_list:
                            datalists['team_list'] = team_list

                        # create schemeitem_list
                        schemeitem_list = d.create_schemeitem_list(
                            request=request,
                            customer=scheme.order.customer,
                            comp_timezone=comp_timezone)
                        if schemeitem_list:
                            datalists['schemeitem_list'] = schemeitem_list
                            # shift_list.sort()
                            datalists['shift_list'] = shift_list

                        # today is used for new schemeitem without previous rosterday
                        today_dict = {'value': str(date.today()),
                                      'wdm': f.get_date_WDM_from_dte(date.today(), user_lang),
                                      'wdmy': f.format_WDMY_from_dte(date.today(), user_lang),
                                      'dmy': f.format_DMY_from_dte(date.today(), user_lang),
                                      'offset': f.get_weekdaylist_for_DHM(date.today(), user_lang)}

                        datalists['today'] = today_dict

                        datalists['months'] = c.MONTHS_ABBREV[user_lang]
                        datalists['weekdays'] = c.WEEKDAYS_ABBREV[user_lang]

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
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
            # upload_dict: {'scheme_pk': 19}
                upload_dict = json.loads(upload_json)
                scheme_pk = upload_dict.get('scheme_pk')
                mode = upload_dict.get('mode')

                logger.debug('scheme_pk: ' + str(scheme_pk))
                logger.debug('mode: ' + str(mode))

            # get scheme
                scheme = None
                cycle = 0
                scheme_datefirst = None
                scheme_datelast = None

                schemeitem_list = []
                has_new_schemeitem = False

                if scheme_pk:
                    scheme = m.Scheme.objects.filter(id=scheme_pk, order__customer__company=request.user.company).first()
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
                    if mode == 'autofill':
                        if cycle > 1:
            # create schemeitem_list of all schemes of this order, exept this scheme  PR2019-05-12
                            #schemeitems = Schemeitem.objects.filter(scheme__order=scheme.order).exclude(scheme=scheme)
                            #for schemeitem in schemeitems:
                            #    schemeitem_dict = {}
                            #    d.create_schemeitem_dict(schemeitem, schemeitem_dict, comp_timezone)
                            #    schemeitem_list.append(schemeitem_dict)
                            #    logger.debug('other schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                            #    logger.debug('other id_dict: ' + str(schemeitem_dict.get('id')))

            # get first_rosterdate and last_rosterdate from schemeitems of this scheme
                            schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                            first_rosterdate = None
                            last_rosterdate = None
                            enddate_plusone = None
                            date_add = 0

                            for schemeitem in schemeitems:

            # append existing schemeitems to schemeitem_list
                                # schemeitem, user_lang, temp_pk=None, is_created=False, is_deleted=False, updated_list=None):
                                schemeitem_dict = {}
                                d.create_schemeitem_dict(schemeitem, schemeitem_dict, comp_timezone)
                                schemeitem_list.append(schemeitem_dict)
                                # logger.debug('existing schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                                # logger.debug('existing id_dict: ' + str(schemeitem_dict.get('id')))

            # get number of days between first_rosterdate and last_rosterdate_plusone
                                if first_rosterdate is None or schemeitem.rosterdate < first_rosterdate:
                                    first_rosterdate = schemeitem.rosterdate
                                if last_rosterdate is None or schemeitem.rosterdate > last_rosterdate:
                                    last_rosterdate = schemeitem.rosterdate
                                date_add = f.get_date_diff_plusone(first_rosterdate, last_rosterdate)
                                enddate_plusone = first_rosterdate + timedelta(days=cycle)
                                # logger.debug('rosterdate: ' + str(schemeitem.rosterdate) + ' first: ' + str(first_rosterdate) +' last: ' + str(last_rosterdate))
                                # logger.debug('date_add: ' + str(date_add))

                            if date_add > 0:
                                for n in range(scheme.cycle):  # range(6) is the values 0 to 5.
                                    for schemeitem in schemeitems:
                                        days = (date_add * (n + 1))
                                        # logger.debug('days: ' + str(days))
                                        new_rosterdate = schemeitem.rosterdate + timedelta(days=days)
                                        # logger.debug('new_rosterdate: ' + str(new_rosterdate))

                        # check if new_rosterdate falls within range of scheme
                                        in_range = f.date_within_range(scheme_datefirst, scheme_datelast, new_rosterdate)
                                        if in_range:
                                            if new_rosterdate < enddate_plusone:

                         # create new schemeitem
                                                new_schemeitem = m.Schemeitem(
                                                    scheme=schemeitem.scheme,
                                                    rosterdate=new_rosterdate,
                                                    team=schemeitem.team,
                                                    shift=schemeitem.shift,
                                                    timeduration=0
                                                )   # timeduration cannot be blank

                         # calculate 'timestart, 'timeend', timeduration
                                                calc_schemeitem_timeduration(new_schemeitem, {}, comp_timezone)

                                                new_schemeitem.save(request=self.request)
                                                # logger.debug('new schemeitem: ' + str(new_schemeitem.pk) + ' ' + str(new_schemeitem.rosterdate))
                                                has_new_schemeitem = True

                    # append new schemeitem to schemeitem_list, with attr 'created'
                                                #schemeitem_dict = {}
                                                #d.create_schemeitem_dict(schemeitem, schemeitem_dict, comp_timezone)
                                                #schemeitem_list.append(schemeitem_dict)

# --- Dayup Daydown
                    elif mode in ['dayup', 'daydown']:
                        date_add = -1 if mode == 'dayup' else 1
                        # logger.debug('date_add: ' + str(date_add) + ' ' + str(type(date_add)))
                        schemeitems = m.Schemeitem.objects.filter(scheme=scheme)

                        field_list = c.FIELDS_SCHEMEITEM
                        # FIELDS_SCHEMEITEM = ('pk', 'id', 'scheme', 'shift', 'team',
                        #                      'rosterdate', 'iscyclestart', 'timestart', 'timeend',
                        #                      'timeduration', 'inactive')
                        for schemeitem in schemeitems:

                # a. change rosterdate, update
                            new_rosterdate = schemeitem.rosterdate + timedelta(days=date_add)
                            new_rosterdate_iso = new_rosterdate.isoformat()
                            # logger.debug('new_rosterdate_iso: ' + str(new_rosterdate_iso) + ' ' + str(type(new_rosterdate_iso)))

                # b. create upload_dict, is used to update fields in  update_schemeitem
                            upload_dict = {}
                            upload_dict['id'] = {'pk': schemeitem.id, 'ppk': schemeitem.scheme.id, 'table': 'schemeitem'}
                            upload_dict['rosterdate'] = {'value': new_rosterdate_iso, 'update': True}

                # c. create empty item_update with keys for all fields. Unused ones will be removed at the end
                            item_update = f.create_dict_with_empty_attr(field_list)

                # d. update and save schemeitem
                            update_schemeitem(schemeitem, upload_dict, item_update, request, comp_timezone)

                    elif mode == 'delete':
                        schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                        for schemeitem in schemeitems:
                            schemeitem.delete()

                # e. create schemeitem_list
                schemeitem_list = d.create_schemeitem_list(
                    request=request,
                    customer=scheme.order.customer,
                    comp_timezone=comp_timezone)

                if has_new_schemeitem:
                    item_update_dict['item_update'] = {'created': True}
                if schemeitem_list:
                    item_update_dict['schemeitem_list'] = schemeitem_list

        return HttpResponse(json.dumps(item_update_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class SchemeItemUploadView(UpdateView):  # PR2019-07-22

    def post(self, request, *args, **kwargs):
        logger.debug('============= SchemeItemUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:
# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))

    # b. save quicksave
                if 'quicksave' in upload_dict:
                    quicksave_bool = upload_dict.get('quicksave', False)
                    quicksave_str = '1' if quicksave_bool else '0'
                    Usersetting.set_setting(c.KEY_USER_QUICKSAVE, quicksave_str, request.user)  # PR2019-07-02

# 3. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                update_dict = f.create_dict_with_empty_attr(c.FIELDS_SCHEMEITEM)

# 4. get_iddict_variables
                id_dict = upload_dict.get('id')
                pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)

# 5. check if parent exists (scheme is parent of schemeitem)
                # get_parent adds 'ppk' and 'table' to id_dict
                parent = m.get_parent(table, ppk_int, update_dict, request)
                if parent:
# B. Delete instance
                    if is_delete:
                        # delete_instance adds 'deleted' or 'error' to id_dict
                        this_text = _("This shift")
                        instance = m.Schemeitem.objects.get_or_none(id=pk_int, scheme=parent)
                        delete_ok = m.delete_instance(instance, update_dict, request, this_text)
                        if delete_ok:
                            instance = None
# C. Create new schemeitem
                    elif is_create:
                        # create_shift adds 'temp_pk', 'created' to id_dict, and 'error' to code_dict
                        instance = create_schemeitem(parent, upload_dict, update_dict, request, temp_pk_str)
# D. Get existing instance
                    else:
                        instance = m.get_instance(table, pk_int, parent, update_dict)
# E. Update instance, also when it is created
                    if instance:
                        update_schemeitem(instance, upload_dict, update_dict, request, comp_timezone)

# F. Add all saved values to update_dict, add id_dict to update_dict
                    d.create_schemeitem_dict(instance, update_dict, comp_timezone)

# 6. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)

# 7. add update_dict to update_wrap
                    if update_dict:
                        update_wrap['item_update'] = update_dict

# 8. update schemeitem_list when changes are made
                    item_list = d.create_schemeitem_list(
                        request=request,
                        customer=parent.order.customer,
                        comp_timezone=comp_timezone)
                    if item_list:
                        update_wrap[table] = item_list

        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))

#######################################

@method_decorator([login_required], name='dispatch')
class TeammemberUploadView(UpdateView):  # PR2019-07-28

    def post(self, request, *args, **kwargs):
        logger.debug('============= TeammemberUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

            # b. get comp_timezone PR2019-06-14
            # comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))

                # upload_dict: {'id': {'pk': 93, 'table': 'teammember', 'mode': 'absence', 'cat': 512},
                # 'employee': {'pk': 290},
                # 'team': {'pk': 1300, 'value': 'Vakantie', 'ppk': 1112, 'update': True}}

                # upload_dict: {'id': {'pk': 93, 'ppk': 1299, 'table':
                # 'teammember', 'mode': 'absence', 'cat': 512},
                # 'employee': {'pk': 290},
                # 'team': {'pk': 1300, 'value': 'Vakantie', 'ppk': 1112, 'update': True}}

                # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'table': 'teammember', 'mode': 'absence', 'cat': 512},
                # 'employee': {'pk': 290},
                # 'team': {'pk': 1299, 'value': 'Ziekte', 'ppk': 1111, 'update': True}}

                # upload_dict: {'id': {'temp_pk': 'new_8', 'create': True, 'ppk': 1121, 'table': 'teammember', 'delete': True}}

# 3. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                # c.FIELDS_TEAMMEMBER = ('id', 'team', 'cat', 'employee', 'datefirst', 'datelast',
                #                       'workhoursperday', 'wagerate', 'wagefactor', 'scheme', 'order', 'customer')
                update_dict = f.create_dict_with_empty_attr(c.FIELDS_TEAMMEMBER)

# 4. get_iddict_variables
                id_dict = upload_dict.get('id')
                pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)
                logger.debug('id_dict: ' + str(id_dict))
                logger.debug('mode: ' + str(mode) + ' table: ' + str(table) + ' pk_int: ' + str(pk_int) + ' ppk_int: ' + str(ppk_int))

# 5. new absence has no parent, get ppk_int from team_dict and put it back in upload_dict
                if is_create and mode == 'absence':
                    team_dict = upload_dict.get('team')
                    if team_dict:
                        ppk_int = int(team_dict.get('pk', 0))
                        upload_dict['id']['ppk'] = ppk_int

# 5. check if parent exists (team is parent of teammember)
                parent = m.get_parent(table, ppk_int, update_dict, request)
                logger.debug('parent: ' + str(parent))

                if parent:
# B. Delete instance
                    # check if name of deleted teammember equals name of the team.code, must be changed later
                    teamcode_needs_update = False
                    if is_delete:
                        this_text = _('This teammember')
                        logger.debug('is_delete: ' + str(is_delete))
                        instance = m.get_instance(table, pk_int, parent, update_dict)
                        if instance:
                            teamcode_equals_employeecode = False
                            logger.debug('teammember: ' + str(parent))
                            if instance.employee and instance.team:
                                logger.debug('employee.code: ' + str(instance.employee.code))
                                logger.debug('team.code: ' + str(parent.code))
                                teamcode_equals_employeecode = (parent.code == instance.employee.code)
                                logger.debug('teamcode_equals_employeecode: ' + str(teamcode_equals_employeecode))
                            deleted_ok = m.delete_instance(instance, update_dict, request, this_text)

                            # update team code when deleted_ok, not when absence
                            if mode != 'absence' and teamcode_equals_employeecode and deleted_ok:
                                teamcode_needs_update = True

                    # delete team if there are no more teammembers
                        logger.debug('team=parent: ' + str(parent))
                        teammembers_exist = m.Teammember.objects.filter(team=parent).exists()
                        logger.debug('teammembers_exist: ' + str(teammembers_exist))

                        if not teammembers_exist:
                            logger.debug('no more Teammembers')
                            deleted_ok = m.delete_instance(parent, update_dict, request, this_text)
                            logger.debug('team deleted:' + str(deleted_ok))
                            # no need to update team, it does not exist
                            if deleted_ok:
                                teamcode_needs_update = False

                        logger.debug('teamcode_needs_update:' + str(teamcode_needs_update))
# C. Create new teammember
                    elif is_create:
                        instance = create_teammember(upload_dict, update_dict, request)
                        if instance and mode != 'absence':
                            teamcode_needs_update = True
# D. get existing instance
                    else:
                        instance = m.get_instance(table, pk_int, parent, update_dict)
# E. update instance, also when it is created
                    if instance:
                        update_teammember(instance, upload_dict, update_dict, request, user_lang)

# 9. update team_code if necessary
                    if teamcode_needs_update:
                        update_team_code(parent, request)

# F. Add all saved values to update_dict, add id_dict to update_dict
                    e.create_teammember_dict(instance, update_dict)

# 6. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)

# 7. add update_dict to update_wrap
                    if update_dict:
                        update_wrap['item_update'] = update_dict

# 8. update teammember_list
                    team_list = d.create_team_list(
                        request=request,
                        customer=parent.scheme.order.customer)
                    if team_list:
                        update_wrap['team'] = team_list

                    table_dict = {'order_pk': parent.scheme.order}
                    teammember_list = e.create_teammember_list(table_dict, request.user.company)
                    if teammember_list:
                        update_wrap['teammember'] = teammember_list


# 8. update team_list
                    team_list = d.create_team_list(
                        request=request,
                        customer=parent.scheme.order.customer)
                    if team_list:
                        update_wrap['team'] = team_list

        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))

####################################
# === ReviewView ===================================== PR2019-08-20
@method_decorator([login_required], name='dispatch')
class ReviewView(View):

    def get(self, request):
        param = {}
        # logger.debug(' ============= ReviewView ============= ')
        if request.user.company is not None:
    # get user_lang
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

     # get weekdays translated
            lang = user_lang if user_lang in c.WEEKDAYS_ABBREV else c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[lang])

    # get months translated
            lang = user_lang if user_lang in c.MONTHS_ABBREV else c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[lang])

    # get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

    # get timeformat
            timeformat = 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in c.TIMEFORMATS:
                timeformat = '24h'



            param = get_headerbar_param(request, {
                'lang': lang,
                'weekdays': weekdays_json,
                'months': months_json,

                'interval': interval,
                'timeformat': timeformat
            })
            # logger.debug(param)
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'review.html', param)


@method_decorator([login_required], name='dispatch')
class EmplhourUploadViewXXX(UpdateView):  # PR2019-03-04

    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= EmplhourUploadView ============= ')

        # --- Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        field_list = ('id', 'rosterdate', 'order', 'employee', 'shift',
                      'timestart', 'timeend', 'breakduration', 'timeduration', 'status',
                       'orderhourduration', 'orderhourstatus', 'modifiedby', 'modifiedat')
        update_dict = f.create_dict_with_empty_attr(field_list)

        if request.user is not None and request.user.company is not None:
    # --- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

            # - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            if 'item_upload' in request.POST:
                # item_upload: {'pk': 'new_1', 'rosterdate': '2019-04-01'}
                # item_upload: {'pk': '16', 'order': 2}
                # item_upload: {'pk': '19', 'status': 3}
                emplhour_upload = json.loads(request.POST['item_upload'])
                if emplhour_upload is not None:
                    # logger.debug('emplhour_upload: ' + str(emplhour_upload))
                    emplhour = None

# ++++ check if a record with this pk exists
                    if 'pk' in emplhour_upload and emplhour_upload['pk']:
        # --- check if it is new record, get company if is existing record
                        # new_record has pk 'new_1' etc
                        if emplhour_upload['pk'].isnumeric():
                            pk_int = int(emplhour_upload['pk'])
                            emplhour = m.Emplhour.objects.filter(id=pk_int, employee__company=request.user.company).first()
                        else:
                            # this attribute 'new': 'new_1' is necessary to lookup request row on page
                            update_dict['id']['new'] = emplhour_upload['pk']
                            # update_dict: {'id': {'new': 'new_1'}, 'code': {},...

# ++++ save new record ++++++++++++++++++++++++++++++++++++
                        if emplhour is None:
                            # --- add record i
                            emplhour = m.Emplhour(employee__company=request.user.company)
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
                                emplhour = m.Emplhour.objects.filter(id=pk_int, employee__company=request.user.company).first()
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
                                        # logger.debug('field ' + str(field))
                                        # logger.debug('emplhour_upload ' + str(emplhour_upload))

                                        pk_obj = int(emplhour_upload[field])
                                        object = None
                                        if field == 'order':
                                            object = m.Order.objects.filter(
                                                id=pk_obj,
                                                customer__company=request.user.company
                                            ).first()
                                            # logger.debug('object ' + str(object))
                                        elif field == 'employee':
                                            object = m.Employee.objects.filter(
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
                                            # logger.debug('setattr object' + str(object))
                                            setattr(emplhour, field, object)
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            # logger.debug('after setattr object' + str(object))

# --- save changes in date fields
                                for field in ('rosterdate',):
                                    if field in emplhour_upload:
                                        # logger.debug('field ' + str(field))
                                        # logger.debug('emplhour_upload ' + str(emplhour_upload))

                                        new_date, msg_err = f.get_date_from_ISOstring(emplhour_upload[field], True) # True = blank_not_allowed
                                        # logger.debug('new_date: ' + str(new_date) + str(type(new_date)))
                                        # check if date is valid (empty date is ok)
                                        if msg_err is not None:
                                            update_dict[field]['err'] = msg_err
                                        else:
                                            saved_date = getattr(emplhour, field, None)
                                            # logger.debug('saved_date: ' + str(saved_date) + str(type(saved_date)))
                                            if new_date != saved_date:
                                                # logger.debug('save date: ' + str(new_date) + str(type(new_date)))
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
                                                # logger.debug('saved_datetime: ' + str(saved_datetime))
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
                                                    saved_datetime_aware = f.get_datetimelocal_from_datetimeUTC(saved_datetime, comp_timezone)
                                                    # saved_datetime_aware: 2019-03-30 04:48:00+01:00
                                                    # logger.debug('saved_datetime_aware: ' + str(saved_datetime_aware))

                                                    offset_datetime = saved_datetime_aware + timedelta(days=day_offset)
                                                    # offset_datetime: 2019-03-31 04:48:00+01:00
                                                    # logger.debug('offset_datetime: ' + str(offset_datetime))

                                                    dt_naive = datetime(offset_datetime.year,
                                                                        offset_datetime.month,
                                                                        offset_datetime.day,
                                                                        new_hour,
                                                                        new_minute)
                                                # dt_naive: 2019-03-31 04:48:00
                                                # logger.debug( 'dt_naive: ' + str(dt_naive))

                                                # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
                                                timezone = pytz.timezone(comp_timezone)
                                                # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
                                                # logger.debug( 'timezone: ' + str(timezone) + str( type(timezone)))

                                                dt_localized = timezone.localize(dt_naive)
                                                # dt_localized: 2019-03-31 04:48:00+02:00
                                                # logger.debug('dt_localized: ' + str(dt_localized))

                                                utc = pytz.UTC
                                                dt_as_utc = dt_localized.astimezone(utc)
                                                # dt_as_utc: 2019-03-31 02:48:00+00:00
                                                # logger.debug( 'dt_as_utc: ' + str(dt_as_utc))

                                                setattr(emplhour, field, dt_as_utc)
                                                update_dict[field]['upd'] = True
                                                save_changes = True
                                                emplhour.save(request=self.request)
                                                # datetimesaved: 2019-03-31 02:48:00+00:00
                                                # logger.debug('datetimesaved: ' + str(getattr(emplhour, field, None)))
# --- save changes in breakduration field
                                for field in ('timeduration', 'breakduration',):
                                    # item_upload: {'pk': '18', 'breakduration': '0.5'}
                                    if field in emplhour_upload:
                                        # logger.debug('item_upload[' + field + ']: ' + str(emplhour_upload[field]))
                                        value_str = emplhour_upload[field]
                                        # logger.debug('value_str: <' + str(value_str) + ' ' + str(type(value_str)))
                                        # logger.debug([value_str])

                                        # replace comma by dot
                                        value_str = value_str.replace(',', '.')
                                        value_str = value_str.replace(' ', '')
                                        value_str = value_str.replace("'", "")
                                        value = float(value_str) if value_str != '' else 0

                                        # duration unit in database is minutes
                                        new_value = 60 * value
                                        # logger.debug('new_value ' + str(new_value) + ' ' + str(type(new_value)))
                                        saved_value = getattr(emplhour, field, None)
                                        # logger.debug('saved_value[' + field + ']: ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            # logger.debug('setattr ' + str(new_value))
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            # logger.debug('update_dict[' + field + ']: ' + str(update_dict[field]))

# --- save changes in other fields
                                for field in ('status', 'orderhourstatus'):
                                    if field in emplhour_upload:
                                        # logger.debug('emplhour_upload[' + field + ']: ' + str(emplhour_upload[field]))
                                        new_value = int(emplhour_upload[field])
                                        # logger.debug('new_value ' + str(new_value))
                                        saved_value = getattr(emplhour, field, None)
                                        # logger.debug('saved_value ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            # logger.debug('setattr ' + str(new_value))
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            # logger.debug('update_dict[field] ' + str(update_dict[field]))

# --- calculate working hours
                                if save_changes:
                                    # logger.debug('calculate working hours')
                                    if emplhour.timestart and emplhour.timeend:
                                        # duration unit in database is minutes
                                        saved_break_minutes = int(getattr(emplhour, 'breakduration', 0))
                                        # logger.debug('saved_breakduration: ' + str(saved_break_minutes) +  str(type(saved_break_minutes)))

                                        datediff = emplhour.timeend - emplhour.timestart
                                        # logger.debug('datediff: ' + str(datediff) +  str(type(datediff)))
                                        datediff_minutes = (datediff.total_seconds() / 60)
                                        # logger.debug('datediff_minutes: ' + str(datediff_minutes) +  str(type(datediff_minutes)))
                                        new_time_minutes = datediff_minutes - saved_break_minutes
                                        # logger.debug('new_time_minutes: ' + str(new_time_minutes) +  str(type(new_time_minutes)))

                                        saved_time_minutes = getattr(emplhour, 'timeduration', 0)
                                        # logger.debug('saved_time_minutes: ' + str(saved_time_minutes) + str(type(saved_time_minutes)))

                                        if new_time_minutes != saved_time_minutes:
                                            emplhour.timeduration = new_time_minutes
                                            update_dict['timeduration']['upd'] = True
                                            save_changes = True

                                            #logger.debug('timeduration: ' + str(emplhour.timeduration) + str(type(emplhour.timeduration)))
# --- save changes
                                if save_changes:
                                    emplhour.save(request=self.request)
                                    # logger.debug('changes saved ')
                                    for field in update_dict:
                                        saved_value = None
                                        saved_html = None
                                        # 'upd' has always value True, or it does not exist
                                        if 'upd' in update_dict[field]:
                                            try:
                                                # TODO make corrections
                                                if field == 'order':
                                                    saved_value = emplhour.order.code
                                                elif field == 'employee':
                                                    saved_value = emplhour.employee.code
                                                elif field == 'shift':
                                                    saved_value = emplhour.shift.code
                                                elif field == 'timestart':
                                                    saved_value = emplhour.timestart_datetimelocal
                                                    saved_html = emplhour.offsetstart
                                                elif field == 'timeend':
                                                    saved_value = emplhour.timeend_datetimelocal
                                                    saved_html = emplhour.offsetend
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
        f.remove_empty_attr_from_dict(update_dict)

        row_update = {'row_update': update_dict}
        # row_update = {'row_update': {'idx': {'pk': '1'}, 'code': {'status': 'upd'}, 'modifiedby': {'val': 'Hans'},
        #              'modifiedat': {'val': '29 mrt 2019 10.20u.'}}}

        # logger.debug('row_update: ')
        # logger.debug(str(row_update))
        row_update_json = json.dumps(row_update, cls=LazyEncoder)
        # logger.debug(str(row_update_json))

        return HttpResponse(row_update_json)


@method_decorator([login_required], name='dispatch')
class EmplhourDownloadDatalistView(View):  # PR2019-03-10
    # function updates employee, customer and shift list
    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= EmplhourDownloadDatalistView ============= ')
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


                orders = m.Order.objects.filter(customer__company=request.user.company, inactive=False).order_by(Lower('code'))
                order_list = []
                for order in orders:
                    dict = {'pk': order.id, 'code': order.code}
                    if order.datefirst:
                        dict['datefirst'] = order.datefirst
                    if order.datelast:
                        dict['datelast'] = order.datelast
                    order_list.append(dict)

                employees = m.Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
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
    # logger.debug(' ============= upload_interval ============= ')
    # logger.debug('interval_upload: ' + str(interval_upload))
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    item_update_dict = {}
    if request.user is not None and request.user.company is not None:
        if interval_upload:

# get saved period_dict
            period_dict = d.get_period_from_settings(request)
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
                # logger.debug('period_dict_json: ' + str(period_dict_json))

                Usersetting.set_setting(c.KEY_USER_EMPLHOUR_PERIOD, period_dict_json, request.user)
                update_emplhour_list = True

# calculate  updated period_dict
            # get today_midnight_local_iso
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            today_utc = d.get_rosterdate_utc(date.today())
            today_utc = d.get_datetime_utc(datetime.utcnow())
            # logger.debug('CCCCCCC today_utc: ' + str(today_utc) + str(type(today_utc)))
            today_midnight_local = d.get_rosterdate_midnight_local(today_utc, comp_timezone)
            # logger.debug('today_midnight_local: ' + str(today_midnight_local) + str(type(today_midnight_local)))
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
            # logger.debug('now_local: ' + str(now_local) + str(type(now_local)))
            # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

# split now_local
            year_int, month_int, date_int, hour_int, minute_int = d.split_datetime(now_local)
            # logger.debug(
            #     'now_local_arr: ' + str(year_int) + ';' + str(month_int) + ';' + str(date_int) + ';' + str(
            #        hour_int) + ';' + str(minute_int))
            # now_local_arr: 2019;7;10;16

# get index of current interval (with interval = 6 hours, interval 6-12h has index 1
            interval_index = int(hour_int / interval)
            # logger.debug('xxx interval: ' + str(interval) + ' interval_index: ' + str(interval_index))

# get local start time of current interval
            interval_starthour = interval * interval_index
            interval_start_local = today_midnight_local + timedelta(hours=interval_starthour)
            # logger.debug('interval_start_local: ' + str(interval_start_local) + str(type(interval_start_local)))

# get local start time of current range (is interval_start_local minus overlap)
            range_start = -overlap
            range_start_local = interval_start_local + timedelta(hours=range_start)
            # logger.debug('range_start: ' + str(range_start) + ' range_start_local: ' + str(range_start_local))

# get start time of current range in UTC
            utc = pytz.UTC
            range_start_utc = range_start_local.astimezone(utc)
            # logger.debug('range_start_utc: ' + str(range_start_utc))

# get utc end time of current range ( = local start time of current range plus range
            range_end_utc = range_start_utc + timedelta(hours=range)
            # logger.debug('range: ' + str(range) + ' utc >>>>>> range_end_utc: ' + str(range_end_utc))

# get local end time of current range ( = local start time of current range plus range
            range_end_local = range_start_local + timedelta(hours=range)
            # logger.debug('range: ' + str(range) + ' range_end_local: ' + str(range_end_local))

# get end time of current range in UTC
            overlap_end_utc = range_end_local.astimezone(utc)
            # logger.debug('overlap_end_utc: ' + str(overlap_end_utc))


@method_decorator([login_required], name='dispatch')
class PeriodUploadView(UpdateView):  # PR2019-07-12

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= PeriodUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# A.
    # 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            # logger.debug('comp_timezone: ' + str(comp_timezone))

            new_period_dict = {}

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('period_upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                # logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'next': True, 'period': {'period': 8, 'interval': 0, 'overlap': 0, 'auto': False,
                # 'periodstart': '2019-07-12T06:00:00.000Z', 'periodend': '2019-07-12T14:00:00.000Z'}}

                # upload_dict: {'period': {'setting': True, 'interval': 3, 'overlap_prev': 2, 'overlap_next': 1}}
                # upload_dict: {'period': {'mode': 'current'}}

    # 3. get upload_period_dict and saved_period_dict
                if 'period' in upload_dict:
                    # 'period': {'period': 8, 'interval': 0, 'overlap': 0, 'auto': False,
                    # {'period': {'next': True}}
                    upload_period_dict = upload_dict['period']

                    # get saved period_dict
                    saved_period_dict = d.get_period_from_settings(request)
                    # logger.debug('saved_period_dict: ' + str(saved_period_dict))
                    # period_dict: {'range': '0;0;1;0', 'period': 6, 'interval': 6, 'overlap': 0, 'auto': True}
                    # saved_period_dict: {'mode': 'current', 'interval': 24, 'overlap_prev': 0, 'overlap_next': 0,
                    # 'periodstart': '2019-08-31T22:00:00+00:00', 'periodend': '2019-09-01T22:00:00+00:00',
                    # 'range': '0;0;0;0', 'rangestart': '2019-08-19', 'rangeend': ''}

                    new_period_dict = saved_period_dict

                    period_timestart_utc = None
                    period_timeend_utc = None
                    range_start_iso = None
                    range_end_iso = None

     # get mode from upload_period_dict, default is 'saved'
                    mode = 'saved'
                    if 'mode' in upload_period_dict:
                        if upload_period_dict['mode']:
                            mode = upload_period_dict['mode']

    # when mode = 'setting': save new settings in saved_period_dict, reset mode to current
            # mode 'setting' sets interval and overlap. Get new values from upload_period_dict
                    if mode == 'setting':
                        mode = 'current'
                        for field in ['interval', 'overlap_prev', 'overlap_next']:
                            if field in upload_period_dict:
                                saved_period_dict[field] = upload_period_dict[field]

    # when mode = 'saved' or 'setting': get mode from saved_period_dict, default is 'current'
                    if mode in ['saved', 'setting']:
                        mode = 'current'
                        if 'mode' in saved_period_dict:
                            if saved_period_dict['mode']:
                                mode = saved_period_dict['mode']

                    if mode == 'current':
                        new_period_dict['mode'] = 'current'

                        interval_int = int(new_period_dict['interval'])
                        overlap_prev_int = int(new_period_dict['overlap_prev'])
                        overlap_next_int = int(new_period_dict['overlap_next'])
                        # logger.debug('interval: ' + str(interval_int) + 'overlap_prev: ' + str(overlap_prev_int) + 'overlap_next: ' + str(overlap_next_int))

         # get start- and end-time of current period in UTC
                        period_timestart_utc, period_timeend_utc = d.get_current_period(
                                                    interval_int, overlap_prev_int, overlap_next_int, request)
                        if period_timestart_utc:
                            new_period_dict['periodstart'] = period_timestart_utc.isoformat()

                        if period_timeend_utc:
                            new_period_dict['periodend'] = period_timeend_utc.isoformat()

                        # logger.debug('period_timestart_utc: ' + str(period_timestart_utc) + 'period_timeend_utc: ' + str(period_timeend_utc))
                        # period_timestart_utc: 2019-08-31 22:00:00+00:00period_timeend_utc: 2019-09-01 22:00:00+00:00

                    elif mode == 'prev' or mode == 'next':
                        new_period_dict['mode'] = 'prevnext'

                        # Attention: add / subtract interval must be done in local time, because of DST
                        interval_int = 0
                        if 'interval' in saved_period_dict:
                            interval_int = saved_period_dict['interval']
                        new_period_dict['interval'] = interval_int

                        overlap_prev_int = 0
                        if 'overlap_prev' in saved_period_dict:
                            overlap_prev_int = saved_period_dict['overlap_prev']

                        overlap_next_int = 0
                        if 'overlap_next' in saved_period_dict:
                            overlap_next_int = saved_period_dict['overlap_next']

                        if 'periodstart' in saved_period_dict:
                            period_start_iso = saved_period_dict['periodstart']
                            # logger.debug('period_start_iso: ' + str(period_start_iso) + ' ' + str(type(period_start_iso)))

                            period_timestart_utc, period_timeend_utc = d.get_prevnext_period(
                                mode,
                                period_start_iso,
                                interval_int,
                                overlap_prev_int,
                                overlap_next_int,
                                comp_timezone)

                            if period_timestart_utc:
                                new_period_dict['periodstart'] = period_timestart_utc.isoformat()

                            if period_timeend_utc:
                                new_period_dict['periodend'] = period_timeend_utc.isoformat()

                    elif (mode == 'range'):
                        new_period_dict['mode'] = 'range'
                        # logger.debug('mode == range: ')

                        for field in ['range', 'rangestart']:
                            if field in upload_period_dict:
                                new_period_dict[field] = upload_period_dict[field]

                        range = ""
                        if 'range' in new_period_dict:
                            range = new_period_dict['range']
                        # logger.debug('range: ' + str(range))

                        if 'rangestart' in new_period_dict:
                            range_start_iso = new_period_dict['rangestart']
                            # period_timestart_utc = f.get_datetime_UTC_from_ISOstring(range_start_iso)

                            range_end_iso = d.get_range_enddate_iso(range, range_start_iso, comp_timezone)
                            new_period_dict['rangeend'] = range_end_iso

                        # logger.debug('new_period_dict: ' + str(new_period_dict))
# 9. return emplhour_list
                    show_all = False
                    emplhour_list = d.create_emplhour_list(company=request.user.company,
                                                         comp_timezone=comp_timezone,
                                                         time_min=period_timestart_utc,
                                                         time_max=period_timeend_utc,
                                                         range_start_iso=range_start_iso,
                                                         range_end_iso=range_end_iso,
                                                         show_all=show_all)  # PR2019-08-01


                    # debug: must also upload when list is empty
                    item_update_dict['emplhour'] = emplhour_list

                    # 'periodend': '2019-07-11T14:00:00.000Z'}}

                period_dict_json = json.dumps(new_period_dict)  # dumps takes an object and produces a string:
                # logger.debug('new_period_dict: ' + str(new_period_dict))

                Usersetting.set_setting(c.KEY_USER_EMPLHOUR_PERIOD, period_dict_json, request.user)

                item_update_dict['period'] = new_period_dict

        datalists_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(datalists_json)


@method_decorator([login_required], name='dispatch')
class ReplacementUploadView(UpdateView):  # PR2019-08-18

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= ReplacementUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# 3. get upload_dict from request.POST
            upload_json = request.POST.get('replacement', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))


@method_decorator([login_required], name='dispatch')
class EmplhourUploadView(UpdateView):  # PR2019-06-23

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
            logger.debug('request.POST: ' + str(request.POST))
            # request.POST: <QueryDict: {'emplhour': ['{"id":{"pk":9,"ppk":9,"table":"emplhour"},
            # "timestart":{"offset":"-1;5;0","rosterdate":"2019-07-25","update":true}}']}>

            #id: {temp_pk: "new_1", create: true, table: "emplhour"}
            # orderhour: {value: "MCB - Habaai", order_pk: 6, update: true}
            # rosterdate: {value: "2019-07-26", update: true}

            # QueryDict: {'item_upload': ['{"id":{"pk":79,"ppk":80,"table":"emplhour"},"status":{"value":2,"update":true}}']}>


# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# 2. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# 3. get upload_dict from request.POST
            upload_json = request.POST.get('emplhour', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                # logger.debug('upload_dict: ' + str(upload_dict))
                # logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'pk': 153, 'parent_pk': 158, 'table': 'emplhour'},
                # 'timestart': {'value': '2019-06-22T11:15:00.000Z', 'update': True}}

                # upload_dict: {'id': {'pk': 445, 'ppk': 450, 'table': 'emplhour'}, 'status': {'value': 2, 'update': True}}

                # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'table': 'emplhour'},
                #               'rosterdate': {'value': '2019-04-13', 'update': True},
                #               'orderhour': {'value': 'MCB - Hato', 'order_pk': 32, 'update': True}}

    # 4. get period
                update_emplhour_list = False
                rangemin, rangemax, period_dict = get_rangemin_rangemax(upload_dict, request)

                eplh_update_list = []

    # 3. save quicksave
                if 'quicksave' in upload_dict:
                    quicksave_bool = upload_dict.get('quicksave', False)
                    quicksave_str = '1' if quicksave_bool else '0'
                    Usersetting.set_setting(c.KEY_USER_QUICKSAVE, quicksave_str, request.user)  # PR2019-07-02

# 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)
                    # id_dict is added to update_dict after check if parent_exists and item_exists
                    # logger.debug('id_dict: ' + str(id_dict))
                    # id_dict: {'temp_pk': 'new_3', 'create': True, 'parent_pk': 154, 'table': 'emplhour'}
                    # id_dict: {'id': {'pk': 150, 'parent_pk': 154, 'table': 'emplhour'}
                    # id_dict: {'temp_pk': 'new_1', 'create': True, 'table': 'emplhour'}

# 4. Create empty update_dict with keys for all fields if not exist. Unused ones will be removed at the end
                    # this one is not working: update_dict = dict.fromkeys(field_list, {})
                    update_dict = f.create_dict_with_empty_attr(c.FIELDS_EMPLHOUR)

# C. Create new orderhour / emplhour - before check if parent exists
                    parent = None
                    instance = None
                    if is_create:
                        instance, parent = create_orderhour_emplhour(upload_dict, update_dict, request)
                    else:
# 5. check if parent exists (orderhour is parent of emplhour)
                        parent = m.get_parent(table, ppk_int, update_dict, request)
                        if parent:
                            instance = m.Emplhour.objects.get_or_none(id=pk_int, orderhour=parent)

                    if instance:
# B. Delete instance
                        if is_delete:
                            m.delete_instance(table, instance, update_dict, request)
# D. get existing instance
                        else:
                            # logger.debug('instance: ' + str(instance))

                            # logger.debug('instance: ' + str(instance))
                            mode = upload_dict.get('mode', '')
# ============ make employee absent
                            if mode == 'absent':
                                # check if abscat dict is empty
                                if upload_dict['abscat']:
                                    make_absent(instance, upload_dict, request)

                            if mode == 'switch':
                                pass
                            if mode == 'switch':
                                pass
                            if mode == 'split':
                                split_shift(instance, upload_dict, request)

# E. Update instance, also when it is created
                            update_emplhour(instance, upload_dict, update_dict, request, comp_timezone, eplh_update_list)
                            logger.debug('111111111111111 eplh_update_list: ' + str(eplh_update_list))

# F. Add all saved values to update_dict, add id_dict to update_dict
                            d.create_emplhour_dict(update_dict, comp_timezone)

# 6. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)

# 7. add update_dict to item_update_dict
                    if update_dict:
                        item_update_dict['item_update'] = update_dict

                        logger.debug('2222222222222222222 eplh_update_list: ' + str(eplh_update_list))
                        if eplh_update_list:
                            for eplh_id in eplh_update_list:
                                row_dict = {}
                                update_dictXX = {}
                                item_dict, pk_int = d.create_emplhour_itemdict(row_dict, update_dictXX, c.FIELDS_EMPLHOUR, comp_timezone)
                                # def create_emplhour_itemdict(row_dict, update_dict, field_tuple, comp_timezone):  # PR2019-09-21
# 8. update emplhour_list when changes are made

                        if update_emplhour_list:
                            # inactive = False: include only active instances

                            # get period_timestart_utc and period_timeend_utc
                            period_timestart_utc = None
                            period_timeend_utc = None
                            if 'periodstart' in period_dict:
                                period_timestart_iso = period_dict['periodstart']
                                period_timestart_utc = f.get_datetime_UTC_from_ISOstring(period_timestart_iso)
                            if 'periodend' in period_dict:
                                period_timeend_iso = period_dict['periodend']
                                period_timeend_utc = f.get_datetime_UTC_from_ISOstring(period_timeend_iso)

                            show_all = False
                            emplhour_list = d.create_emplhour_list(company=request.user.company,
                                                                 comp_timezone=comp_timezone,
                                                                 time_min=period_timestart_utc,
                                                                 time_max=period_timeend_utc,
                                                                 range_start_iso=rangemin,
                                                                 range_end_iso=rangemax,
                                                                 show_all=show_all)  # PR2019-08-01


                            if emplhour_list:
                                item_update_dict['emplhour_list'] = emplhour_list

# 9. return update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)




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
        rosterdate, msg_err = f.get_date_from_ISOstring(new_value, True)  # True = blank_not_allowed
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
            order = m.Order.objects.get_or_none(customer__company=request.user.company, pk=order_pk)

# create orderhour
    if rosterdate and order:
        yearindex = rosterdate.year
        monthindex = rosterdate.month
        weekindex = rosterdate.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        orderhour = m.Orderhour(
            order=order,
            rosterdate=rosterdate,
            yearindex=yearindex,
            monthindex=monthindex,
            weekindex=weekindex
        )
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

        # subtract 1 from used entries

# create emplhour
    # create orderhour
    if orderhour:
        emplhour = m.Emplhour(
            orderhour=orderhour,
            rosterdate=orderhour.rosterdate,
            yearindex=orderhour.yearindex,
            monthindex=orderhour.monthindex,
            weekindex=orderhour.weekindex
        )
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

def make_absent(emplhour, upload_dict, request):
    logger.debug('make_absent')
    logger.debug(str(upload_dict))
    # {'id': {'pk': 85, 'ppk': 85, 'table': 'emplhour', 'rosterdate': '2019-08-23'},
    # 'mode': 'absent',
    # 'employee': {'field': 'employee', 'pk': 196, 'ppk': 2, 'code': 'Albertus G R'},
    # 'replacement': {'field': 'replacement', 'pk': 300, 'ppk': 2, 'code': 'Scoop J J M'},
    # 'abscat': {'field': 'absent', 'pk': 1090, 'ppk': 217, 'code': 'Buitengewoon verlof'}}

    # in upload_dict is employee the current employee, to be added to abscat emplhour;
    #  replacement employee must be put in original emplhour
    # therefore use replacement as 'employee', in update_item the original employee will be repalced by replacement

# - get replacement employee
    # not necessary, replacement employee will be put in ecurrent emplhour in update_item

# - get parent (orderhour) of emplhour
    parent = emplhour.orderhour

    abscat_dict = upload_dict.get('abscat')
    if abscat_dict:
        abscat_pk = abscat_dict.get('pk')
        abscat_parent_pk = abscat_dict.get('ppk')

        if abscat_pk:
            abscat_order = m.Order.objects.filter(id=abscat_pk, cat=c.SHIFT_CAT_0512_ABSENCE).first()
            if abscat_order:
# create new abscat_orderhour record if it does not exist
                abscat_orderhour = m.Orderhour(
                    order=abscat_order,
                    schemeitem=parent.schemeitem,
                    rosterdate=parent.rosterdate,
                    yearindex=parent.yearindex,
                    monthindex=parent.monthindex,
                    weekindex=parent.weekindex,
                    payperiodindex=parent.payperiodindex,
                    cat=c.SHIFT_CAT_0512_ABSENCE,
                    shift=parent.shift,
                    duration=parent.duration
                )
                abscat_orderhour.save(request=request)
                if abscat_orderhour:

# FIELDS_EMPLHOUR = ('pk', 'id', 'orderhour', 'employee', 'rosterdate', 'cat', 'shift',
#                         'timestart', 'timeend', 'timeduration', 'breakduration',
#                         'wagerate', 'wagefactor', 'wage', 'status')

# create new abscat_emplhour record
                    abscat_emplhour = m.Emplhour(orderhour=abscat_orderhour)
# put current employee in abscat_emplhour
                    abscat_emplhour.employee = emplhour.employee
# copy other fields to abscat_emplhour
                    abscat_emplhour.rosterdate = emplhour.rosterdate
                    abscat_emplhour.cat = c.SHIFT_CAT_0512_ABSENCE
                    abscat_emplhour.shift = emplhour.shift
                    abscat_emplhour.timestart = emplhour.timestart
                    abscat_emplhour.timeend = emplhour.timeend
                    abscat_emplhour.timeduration = emplhour.timeduration
                    abscat_emplhour.breakduration = emplhour.breakduration
                    abscat_emplhour.wagerate = emplhour.wagerate
                    abscat_emplhour.wage = emplhour.wage
                    abscat_emplhour.status = c.STATUS_00_NONE
                    abscat_emplhour.save(request=request)

def split_shift(emplhour, upload_dict, request):
    logger.debug('split_shift')
    logger.debug(str(upload_dict))

    # upload_dict: {
    # 'id': {'pk': 308, 'ppk': 302, 'table': 'emplhour', 'rosterdate': '2019-08-25'},
    # 'mode': 'split',
    # 'employee': {'field': 'employee', 'pk': 234, 'ppk': 2, 'code': 'Richardson R M'},
    # 'replacement': {'field': 'replacement', 'pk': 219, 'ppk': 2, 'code': 'Daal E I J'}}

    pk_int = 0
    ppk_int = 0
    id_dict = upload_dict.get('id')
    if id_dict:
        pk_int = int(id_dict.get('pk', 0))
        ppk_int = int(id_dict.get('ppk', 0))

# get replacement employee
    reployee = None
    field_dict = upload_dict.get('replacement')
    if field_dict:
        repl_pk_int = int(field_dict.get('pk', 0))
        reployee = m.Employee.objects.get_or_none(pk=repl_pk_int, company=request.user.company)

        logger.debug('reployee' + str(reployee))
# - get emplhour))
    split_emplhour = None
    orderhour = m.Orderhour.objects.get_or_none(pk=ppk_int, order__customer__company=request.user.company)
    if orderhour:
        logger.debug('cur_orderhour' + str(orderhour))
# - get emplhour))
        emplhour = m.Emplhour.objects.get_or_none(pk=pk_int, orderhour=orderhour)
        if emplhour:
            logger.debug('emplhour' + str(emplhour))
# create new split_emplhour record
            split_emplhour = m.Emplhour(
                orderhour=orderhour,
                rosterdate=emplhour.rosterdate,
                cat=emplhour.cat,
                shift=emplhour.shift,
                timeduration=0,
                breakduration=0,
                status=c.STATUS_00_NONE
            )
            # TODO  wagerate  wagefactor  wage cald timeduratio

# put current employee in abscat_emplhour
            if reployee:
                split_emplhour.employee = reployee
            split_emplhour.save(request=request)

    logger.debug('split_emplhour' + str(split_emplhour))


#######################################################
def update_emplhour(instance, upload_dict, update_dict, request, comp_timezone, eplh_update_list):
    # --- update existing and new emplhour PR2-019-06-23
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_ emplhour ---')
    logger.debug('upload_dict: ' + str(upload_dict))
    logger.debug('update_dict: ' + str(update_dict))
    logger.debug('instance: ' + str(instance))
    # upload_dict: {'id': {'pk': 11, 'ppk': 11, 'table': 'emplhour'},
    # 'select': 'absent',
    # 'employee': {'field': 'employee', 'pk': 30, 'ppk': 1, 'code': 'Anoushelly'},
    # 'abscat': {'field': 'abscat', 'pk': 9, 'ppk': 6}}

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table', '')
        pk_int = instance.pk
        ppk_int = instance.orderhour.pk

        update_dict['pk'] = pk_int
        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = ppk_int
        update_dict['id']['table'] = table

        save_changes = False

# 2. save changes in field 'rosterdate' (should not be possible)
        field = 'rosterdate'
        # rosterdate_has_changed = False
        # msg_err = None
        if field in upload_dict:
    # a. get new and old value
            field_dict = upload_dict.get(field) # {'value': '2019-05-31', 'update':
            if 'update' in field_dict:
                new_value = field_dict.get('value') # new_value: '2019-04-12'
                new_date, msg_err = f.get_date_from_ISOstring(new_value, True)  # True = blank_not_allowed
        # b. validate new_date
                # field 'rosterdate' is required
                if msg_err is not None:
                    update_dict[field]['error'] = msg_err
                else:
        # c. save field if changed and no_error
                    old_date = getattr(instance, field, None)
                    if new_date != old_date:
                        yearindex = new_date.year
                        monthindex = new_date.month
                        weekindex = new_date.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)

                        setattr(instance, field, new_date)
                        setattr(instance, 'yearindex', yearindex)
                        setattr(instance, 'monthindex', monthindex)
                        setattr(instance, 'weekindex', weekindex)

                        save_changes = True
                        update_dict[field]['updated'] = True

        saved_rosterdate_iso = getattr(instance, field)

# 3. save changes in field 'employee'
        # 'employee': {'update': True, 'value': 'Kevin', 'pk': 1},
        field = 'employee'
        new_employee_pk = None
        old_employee_pk = None

        # new employee is stored as 'replacement' in upload_dict
        if 'replacement' in upload_dict:
            employee = None
            logger.debug('upload_dict[replacement] found')

    # a. get new and old employee_pk
            field_dict = upload_dict.get('replacement')
            logger.debug('field_dict[' + field + ']: ' + str(field_dict))

            new_employee_pk = field_dict.get('pk')
            old_employee_pk = None
            if instance.employee_id:
                old_employee_pk = instance.employee_id
    # b. check if employee exists
            if new_employee_pk:
                employee = m.Employee.objects.filter(company=request.user.company, pk=new_employee_pk).first()
                if employee is None:
                    new_employee_pk = None
    # c. save field if changed

            logger.debug('new_employee_pk: ' + str(new_employee_pk) + 'old_employee_pk: ' + str(old_employee_pk))
            # employee_pk is not required
            if new_employee_pk != old_employee_pk:
    # update field employee in emplhour
                # setattr() sets the value ('team') of the specified attribute ('field') of the specified object (emplhour)
                setattr(instance, field, employee)
                save_changes = True

                logger.debug('save new_employee')

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
                logger.debug('field_dict: ' + str(field_dict))
# ????????????????????? TODO  change to offset_int
                # 'timestart': {'value': '0;9;0', 'update': True, 'rosterdate': '2019-08-13'}}
                if 'update' in field_dict:
                    # use saved_rosterdate instead of rosterdate from dict
                    if saved_rosterdate_iso:

        # a. get offset of this emplhour
                        new_offset_int = field_dict.get('value')

        # b. convert rosterdate '2019-08-09' to datetime object
                        logger.debug(' saved_rosterdate_iso: ' + str(saved_rosterdate_iso))
                        rosterdatetime = f.get_datetime_naive_from_dateobject(saved_rosterdate_iso)
                        logger.debug(' rosterdatetime: ' + str(rosterdatetime))

        # c. get timestart/timeend from rosterdate and offsetstart
                        logger.debug('get timestart/timeend from rosterdate and offsetstart ')
                        new_datetimelocal = f.get_datetimelocal_from_offset(
                            rosterdate=rosterdatetime,
                            offset_int=new_offset_int,
                            comp_timezone=comp_timezone)
                        logger.debug(' new_datetimelocal: ' + str(new_datetimelocal))
                        # must be stored als utc??
                        # No, tzinfo is mot stored in database, therefore both local and utc are stored as the same datetime
                        setattr(instance, field, new_datetimelocal)
                        save_changes = True
                        update_dict[field]['updated'] = True
                        logger.debug('saved new_datetimelocal (' + field + '): ' + str(getattr(instance, field)))

# --- save changes in breakduration field
        field = 'breakduration'
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            if 'value' in field_dict:
                new_minutes = field_dict.get('value',0)
                # duration unit in database is minutes
                old_minutes = getattr(instance, field, 0)
                if new_minutes != old_minutes:
                    setattr(instance, field, new_minutes)
                    save_changes = True
                    update_dict[field]['updated'] = True

# 4. save changes in field 'status'
        field = 'status'
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            # field_dict[status]: {'value': 2, 'update': True}}
            # PR2019-07-17 status is stored as sum of status

            new_status = field_dict.get('value', 0)
            old_status_sum = getattr(instance, field, 0)
            new_status_sum = 0
            if 'update' in field_dict:
                new_status_sum = d.add_status_to_statussum(new_status, old_status_sum)

            if 'remove' in field_dict:
                new_status_sum = d.remove_status_from_statussum(new_status, old_status_sum)
                # if remove STATUS_08_LOCKED : also remove STATUS_02_START_CONFIRMED and STATUS_04_END_CONFIRMED
                if new_status == c.STATUS_08_LOCKED:
                    new_status_sum = d.remove_status_from_statussum(c.STATUS_02_START_CONFIRMED, new_status_sum)
                    new_status_sum = d.remove_status_from_statussum(c.STATUS_04_END_CONFIRMED, new_status_sum)
            if new_status_sum != old_status_sum:
                setattr(instance, field, new_status_sum)
                save_changes = True
                update_dict[field]['updated'] = True

# --- recalculate timeduration
        # logger.debug('calculate working hours')
        field = 'timeduration'
        new_minutes = 0
        old_minutes = getattr(instance, field, 0)
        if instance.timestart and instance.timeend:
            saved_break_minutes = int(getattr(instance, 'breakduration', 0))

            new_minutes = f.get_time_minutes(
                timestart=instance.timestart,
                timeend=instance.timeend,
                break_minutes=saved_break_minutes)

        if new_minutes != old_minutes:
            setattr(instance, field, new_minutes)
            save_changes = True
            update_dict[field]['updated'] = True

# 6. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                msg_err = _('This item could not be updated.')
                if 'id' not in update_dict:
                    update_dict['id'] = {}
                update_dict['id']['error'] = msg_err

# 7. update overlap
            if instance:
                rosterdate= instance.rosterdate
                employee = instance.employee
                if rosterdate and employee:
                    d.update_emplhour_overlap(employee.pk, instance.rosterdate, request, eplh_update_list)
                    if old_employee_pk and old_employee_pk != employee.pk:
                        d.update_emplhour_overlap(old_employee_pk, instance.rosterdate, request, eplh_update_list)

def update_teammember(instance, upload_dict, update_dict, request, user_lang):
    # --- update existing and new teammmber PR2-019-06-01
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_teammmber ---')
    logger.debug('upload_dict' + str(upload_dict))

    # upload_dict{'id': {'pk': 93, 'ppk': 1299, 'table': 'teammember', 'mode': 'absence', 'cat': 512},
    # 'employee': {'pk': 290},
    # 'team': {'pk': 1300, 'value': 'Vakantie', 'ppk': 1112, 'update': True}}

    save_changes = False
    has_error = False

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'teammember'
        mode = upload_dict.get('mode', '')
        logger.debug('mode: ' + str(mode))

        pk_int = instance.pk
        ppk_int = instance.team.pk

        update_dict['pk'] = pk_int
        update_dict['ppk'] = ppk_int
        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = ppk_int
        update_dict['id']['table'] = table

        #  field_list = ('id', 'team', 'employee', 'datefirst', 'datelast')

        field = 'team'
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('field_dict [' + field + ']: ' + str(field_dict))
            # 'team': {'pk': 1300, 'value': 'Vakantie', 'ppk': 1112, 'update': True}}

            if 'update' in field_dict:
                pk = field_dict.get('pk', 0)
                ppk = field_dict.get('ppk', 0)
                team = None
                if pk:
                    team = m.Team.objects.get_or_none(id=pk, scheme__order__customer__company=request.user.company)
                logger.debug('team]: ' + str(team) + ' ' + str(type(team)))

                if team is None:
                    update_dict[field]['error'] = _('This field cannot be blank.')
                else:
                    setattr(instance, field, team)
                    update_dict[field]['updated'] = True
                    save_changes = True


# 2. save changes in field 'employee'
        # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}

        field = 'employee'
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('upload_dict[' + field + ']: ' + str(field_dict) + ' ' + str(type(field_dict)))
            # upload_dict[employee]: {'value': 'Birthingday', 'pk': 32, 'update': True}

            if 'update' in field_dict:
                pk = field_dict.get('pk')
                employee = None
                if pk:
                    employee = m.Employee.objects.get_or_none(id=pk, company=request.user.company)
                logger.debug('employee]: ' + str(employee) + ' ' + str(type(employee)))

                if employee is None:
                    update_dict[field]['error'] = _('This field cannot be blank.')
                else:
                    msg_err = e.validate_employee_exists_in_teammembers(employee, instance.team, instance.pk)
                    if msg_err:
                        update_dict[field]['error'] = msg_err
                    else:
                        setattr(instance, field, employee)
                        update_dict[field]['updated'] = True
                        save_changes = True


        field = 'workhoursperday'
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            if 'update' in field_dict:
                # value is entered as string ('7.5'), in hours
                # TODO add hour picker in page
                value = str(field_dict.get('value'))

                # convert workhoursperday_hours to minutes
                value_float, msg_err = f.get_float_from_string(value)
                if msg_err:
                    update_dict[field]['error'] = msg_err
                else:
                    new_value = int(value_float * 60)
                    old_value = getattr(instance, field, 0)
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        save_changes = True
                        update_dict[field]['updated'] = True

# 4. save changes in  field datefirst datelast
        for field in ['datefirst', 'datelast']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    new_value = field_dict.get('value')  # new_value: '2019-04-12'
                    new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
    # b. validate value
                    if msg_err:
                        update_dict[field]['error'] = msg_err
                    else:
    # c. save field if changed and no_error
                        old_date = getattr(instance, field, None)
                        if new_date != old_date:
                            setattr(instance, field, new_date)
                            save_changes = True
                            update_dict[field]['updated'] = True
                            logger.debug('date saved: ' + str(instance.datefirst))
                            save_changes = True
# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        e.create_teammember_dict(instance, update_dict)

             # if field in ['employee']:
             #   employee = getattr(instance, field)
             #   if employee:
             #       update_dict[field]['value'] = instance.employee.code
             #       update_dict[field]['team_pk'] = instance.employee.id

# --- remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(update_dict)

    logger.debug('update_dict: ' + str(update_dict))


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_scheme(instance, upload_dict, update_dict, request):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_scheme')
    logger.debug('upload_dict: ' + str(upload_dict))
    # {'id': {'pk': 4, 'ppk': 38, 'table': 'scheme'}, 'datefirst': {'value': '2019-07-19', 'update': True}}

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'scheme'
        pk_int = instance.pk
        ppk_int = instance.order.pk

        update_dict['pk'] = pk_int
        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = ppk_int
        update_dict['id']['table'] = table

        save_changes = False

# 2. save changes in field 'code'
        fieldname = 'code'
        if fieldname in upload_dict:
    # a. get new and old value
            field_dict = upload_dict.get(fieldname)
            if 'update' in field_dict:
                new_value = field_dict.get('value')
                saved_value = getattr(instance, fieldname)
                # field 'code' is required
                if new_value != saved_value:
    # b. validate code
                    #TODO check if correct

                    parent = instance.order
                    has_error = validate_code_name_identifier(table, fieldname, new_value, parent, update_dict, pk_int)
                    if not has_error:
    # c. save field if changed and no_error
                        setattr(instance, fieldname, new_value)
                        update_dict[fieldname]['updated'] = True
                        save_changes = True

# 3. save changes in field 'cycle'
        fieldname = 'cycle'
        if fieldname in upload_dict:
    # a. get new and old value
            field_dict = upload_dict.get(fieldname)
            if 'update' in field_dict:
                # new_value is string, can be ''.
                new_value = field_dict.get('value')
                if new_value is None:
                    msg_err = _('Cycle cannot be blank')
                    update_dict[fieldname]['error'] = msg_err
                else:
                    new_cycle = int(new_value)
                    saved_value = getattr(instance, fieldname, None)
                    if new_cycle != saved_value:
        # c. save field if changed and no_error
                        setattr(instance, fieldname, new_value)
                        update_dict[fieldname]['updated'] = True
                        save_changes = True

# 4. save changes in date fields
        for field in ('datefirst', 'datelast'):
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    # logger.debug("field: " + str(field) + " field_dict: " + str(field_dict))
                    new_value = field_dict.get('value')
                    new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed

                    saved_date = getattr(instance, field)
                    # logger.debug("new_value: " + str(new_value) + " saved_date: " + str(saved_date))

                    if msg_err is not None:
                        update_dict[field]['error'] = msg_err
                    else:
    # c. save field if changed and no_error
                        if new_date != saved_date:
                            setattr(instance, field, new_date)
                            update_dict[field]['updated'] = True
                            save_changes = True

# 4. save changes in field 'inactive'
        fieldname = 'inactive'
        if fieldname in upload_dict:
            # a. get new and old value
            field_dict = upload_dict.get(fieldname)
            if 'update' in field_dict:
                value = field_dict.get('value')
                is_inactive = True if value == 'true' else False
                saved_value = getattr(instance, fieldname, None)
                if is_inactive != saved_value:
                    setattr(instance, field, is_inactive)
                    update_dict[field]['updated'] = True
                    save_changes = True
# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                msg_err = _('This scheme could not be updated.')
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        # logger.debug('for field in update_dict: ' + str(update_dict))

        for fieldname in update_dict:
            if fieldname not in ('id', 'pk', 'order'):
                saved_value = getattr(instance, fieldname)
                if fieldname in ['code', 'cycle', 'inactive']:
                    if saved_value:
                        update_dict[fieldname]['value'] = saved_value
                # also add date when empty, to add min max date
                elif fieldname == 'datefirst':
                    maxdate = getattr(instance, 'datelast')
                    f.set_fielddict_date(field_dict=update_dict[fieldname], date_value=saved_value, maxdate=maxdate)
                elif fieldname == 'datelast':
                    mindate = getattr(instance, 'datefirst')
                    f.set_fielddict_date(field_dict=update_dict[fieldname], date_value=saved_value, mindate=mindate)


#######################################################
def update_schemeitem(instance, upload_dict, update_dict, request, comp_timezone, recalc=False):
    # --- update field with 'update' in it + calcutated fields in existing and new instance PR2019-07-22
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_schemeitem')
    logger.debug('upload_dict: ' + str(upload_dict))
    # logger.debug('update_dict: ' + str(update_dict))
    #upload_dict: {'id': {'pk': 7, 'ppk': 1, 'table': 'schemeitem'},
    #               'rosterdate': {'value': '2019-03-30', 'update': True},
    #               'shift': {'value': 'nacht', 'update': True}}

# upload_dict: {'id': {'pk': 2, 'ppk': 1, 'table': 'schemeitem'},
    # 'rosterdate': {'value': datetime.date(2019, 3, 27), 'update': True}}

    save_changes = False
    recalc = False

# 1. save changes in field 'rosterdate'
    fieldname = 'rosterdate'
    if fieldname in upload_dict:
        field_dict = upload_dict.get(fieldname) # {'value': '2019-05-31', 'update':
        if 'update' in field_dict:
    # a. get new and old value
            new_value = field_dict.get('value')
    # b. validate new_date; field 'rosterdate' is required
            # logger.debug('new_value: ' + str(new_value) + ' '  + str(type(new_value)))
            new_date, msg_err = f.get_date_from_ISOstring(new_value, True)  # True = blank_not_allowed
            if msg_err is not None:
                update_dict[fieldname]['error'] = msg_err
            else:
    # c. save field if changed and no_error
                saved_date = getattr(instance, fieldname)
                # logger.debug("new_date: " + str(new_date) + " saved_date: " + str(saved_date))
                if new_date != saved_date:
                    setattr(instance, fieldname, new_date)
                    update_dict[fieldname]['updated'] = True
                    recalc = True

# 2. save changes in field 'shift'
    fieldname = 'shift'
    if fieldname in upload_dict:
        field_dict = upload_dict.get(fieldname)
        if 'update' in field_dict:
    # a. get new and old value
            new_shift_pk = int(field_dict.get('pk', 0))
            logger.debug('new_shift_pk: ' + str(new_shift_pk))

    # b. remove shift from schemeitem when new_shift_pk is None
            if not new_shift_pk:
                # set field blank
                if instance.shift:
                    instance.shift = None
                    update_dict[fieldname]['updated'] = True
                    recalc = True
            else:
     # c. check if shift exists
                new_shift = m.Shift.objects.get_or_none(scheme=instance.scheme, pk=new_shift_pk)
                if new_shift is None:
                    msg_err = _('This field could not be updated.')
                    update_dict[fieldname]['error'] = msg_err
                else:
                    saved_shift = getattr(instance, fieldname)
                    if new_shift != saved_shift:
            # b. recalc and save if changed
                        setattr(instance, fieldname, new_shift)
                        update_dict[fieldname]['updated'] = True
                        recalc = True

# 3. save changes in field 'team'
    # team: {value: "B", pk: 3, update: true}
    fieldname = 'team'
    if fieldname in upload_dict:
    # a. get new and old pk
        field_dict = upload_dict.get(fieldname)
        if 'update' in field_dict:
            new_team_pk = int(field_dict.get('pk', 0))
            logger.debug('new_team_pk: ' + str(new_team_pk) + ' code: ' + str(field_dict.get('value')))

    # b. remove team from schemeitem when pk is None
            if not field_dict.get('value'):
                # set field blank if has value
                if getattr(instance, fieldname):
                    setattr(instance, fieldname, None)
                    save_changes = True
                    update_dict[fieldname]['updated'] = True
            else:
    # c. check if team existst
                team = m.Team.objects.get_or_none(id=new_team_pk, scheme__order__customer__company=request.user.company)

    # d. upate tem in schemeitem
                if team is None:
                    msg_err = _('This field could not be updated.')
                    update_dict[fieldname]['error'] = msg_err
                else:
                    setattr(instance, fieldname, team)
                    update_dict[fieldname]['updated'] = True
                    save_changes = True

# 4. save changes in field 'timestart', 'timeend'
    # these are calculated fields, will be updated in recalc

# 5. save changes in field 'inactive'
    fieldname = 'inactive'
    if fieldname in upload_dict:
        field_dict = upload_dict.get(fieldname)
        if 'update' in field_dict:
            is_inactive = field_dict.get('value')
            saved_value = getattr(instance, fieldname, False)
            if is_inactive != saved_value:
                setattr(instance, fieldname, is_inactive)
                update_dict[fieldname]['updated'] = True
                save_changes = True

    if recalc:
        save_changes = True
        calc_schemeitem_timeduration(instance, update_dict, comp_timezone)

# 6. save changes
    if save_changes:
        try:
            instance.save(request=request)
        except:
            msg_err = _('This item could not be updated.')
            if 'id' not in update_dict:
                update_dict['id' ] = {}
            update_dict['id']['error'] = msg_err


def get_rangemin_rangemax (upload_dict, request):  # PR2019-08-19
    rangemin = None
    rangemax = None

    period_dict = {}
    if 'period' in upload_dict:  # PR2019-07-09
        # period': {'period': 12, 'interval': 6, 'overlap': 0, 'auto': True}}

# get saved period_dict
        period_dict = d.get_period_from_settings(request)

# get today_midnight_local_iso
        comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# get today_midnight_local_iso
        today_utc = d.get_datetime_utc(datetime.utcnow())
        today_midnight_local = d.get_rosterdate_midnight_local(today_utc, comp_timezone)
        # logger.debug('today_midnight_local: ' + str(today_midnight_local) + str(type(today_midnight_local)))
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
        # logger.debug('now_local: ' + str(now_local) + str(type(now_local)))
        # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

# split now_local
        year_int, month_int, date_int, hour_int, minute_int = d.split_datetime(now_local)
        # logger.debug('now_local_arr: ' + str(year_int) + ';' + str(month_int) + ';' + str(date_int) + ';' + str(hour_int) + ';' + str(minute_int))
        # now_local_arr: 2019;7;10;16

# get interval
        interval = int(period_dict['interval'])
        interval_index = int(hour_int / interval)
        # logger.debug('xxx interval: ' + str(interval) + ' interval_index: ' + str(interval_index))

# get local start time of current interval
        interval_starthour = interval * interval_index
        # logger.debug('interval_starthour: ' + str(interval_starthour))
        interval_start_local = today_midnight_local + timedelta(hours=interval_starthour)
        # logger.debug('interval_start_local: ' + str(interval_start_local) + str(type(interval_start_local)))

        interval_end_local = interval_start_local + timedelta(hours=interval)
        # logger.debug('interval: ' + str(interval) + ' interval_end_local: ' + str(interval_end_local))

# get local start time of current interval with overlap
        overlap = int(period_dict['overlap'])
        overlap_start = -overlap
        overlap_start_local = interval_start_local + timedelta(hours=overlap_start)
        # logger.debug('overlap_start: ' + str(overlap_start) +  ' overlap_start_local: ' + str(overlap_start_local))

        utc = pytz.UTC
        overlap_start_utc = overlap_start_local.astimezone(utc)
        # logger.debug('mmmm  overlap_start_utc: ' + str(overlap_start_utc))

        # get local end time of current interval with overlap
        overlap_end_local = interval_end_local + timedelta(hours=overlap)
        # logger.debug(  'overlap: ' + str(overlap) + ' overlap_end_local: ' + str(overlap_end_local))

        overlap_end_utc = overlap_end_local.astimezone(utc)
        # logger.debug('mmmm  overlap_end_utc: ' + str(overlap_end_utc))

# get starthour of current interval
        # from https://riptutorial.com/python/example/4540/constructing-timezone-aware-datetimes

        # get local end time of current interval with
        # range = period_dict['range']
        # year_add, month_add, date_add, hour_add = d.get_range(range)
        # logger.debug('range: ' + str(range))
        # logger.debug(str(year_add) + ' ; ' + str(month_add) + ' ; ' + str(date_add) + ' ; ' + str(hour_add))

# convert now to local
        # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
        # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
        timezone = pytz.timezone(comp_timezone)
        # logger.debug('timezone: ' + str(timezone) + str(type(timezone)))

        # convert starthour to utc
        # get endhour of current interval with offset
        range = int(period_dict['range'])
        year_int, month_int, date_int, hour_int = d.get_range(range)
        interval_endhour_offset = interval_starthour + range

        rangemin = f.get_datetime_UTC_from_ISOstring(period_dict['datetimestart'])

        # rangemin: 2019-07-09T00:00:00+02:00 type: <class 'str'>
        # rangemin: 2019-07-09 00:00:00+00:00 type: <class 'datetime.datetime'>
        # logger.debug('rangemin: ' + str(rangemin) + ' type: ' + str(type(rangemin)))

        rangemin_arr = f.get_datetimearray_from_ISOstring(period_dict['datetimestart'])
        year_int = int(rangemin_arr[0])
        month_int = int(rangemin_arr[1])
        date_int = int(rangemin_arr[2])
        hour_int = int(rangemin_arr[3])
        # logger.debug(str(year_int) + ' ; ' + str(month_int) + ' ; ' + str(date_int) + ' ; ' + str(hour_int))

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
        # logger.debug('rangemax: ' + str(rangemax) + ' type: ' + str(type(rangemax)))
        # rangemax: 2019-07-16 00:00:00 type: <class 'datetime.datetime'>
        # rangemax_utc = rangemax.astimezone(pytz.UTC)
        #  logger.debug('rangemax_utc: ' + str(rangemax_utc) + ' type: ' + str(type(rangemax_utc)))
        # rangemax_utc: 2019-07-16 04:00:00+00:00 type: <class 'datetime.datetime'>
    return rangemin, rangemax, period_dict


# <<<<<<<<<< recalculate timeduration >>>>>>>>>>>>>>>>>>>
def calc_schemeitem_timeduration(schemeitem, update_dict, comp_timezone):
    # logger.debug('------------------ calc_schemeitem_timeduration --------------------------')

    offsetstart = 0
    offsetend = 0
    breakduration = 0
    shift_cat = c.SHIFT_CAT_0000_NORMAL
    msg_err = None

# a. check if shift exists
    shift = schemeitem.shift
    if shift is None:
        msg_err = _('Shift is blank. Time cannot be calculated.')
    else:
# b. get offsetstart of this shift
        offsetstart = getattr(shift, 'offsetstart', 0)
# c. get offsetend of this shift
        offsetend = getattr(shift, 'offsetend')
# d. get breakduration of this shift
        breakduration = getattr(shift, 'breakduration', 0)
# e. get shift_cat of this shift
        shift_cat = getattr(shift, 'cat', c.SHIFT_CAT_0000_NORMAL)

    # logger.debug('offsetstart :' + str(offsetstart) + ' offsetend :' + str(offsetend))

    if msg_err:
        # when called by SchemeitemFillView, update_dict is blank
        if update_dict:
            if 'timestart' in update_dict:
                update_dict['timestart']['error'] = msg_err
        setattr(schemeitem, 'timeduration', 0)
        for fld in ('timestart', 'timeend'):
            setattr(schemeitem, fld, None)
    else:
        # calculate field 'timestart' 'timeend', based on field rosterdate and offset, also when rosterdate_has_changed

# a. convert stored rosterdate '2019-08-09' to datetime object
        rosterdatetime_naive = f.get_datetime_naive_from_dateobject(schemeitem.rosterdate)
        logger.debug(' schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
        logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))

# b. get starttime from rosterdate and offsetstart
        logger.debug(' b. get starttime from rosterdate and offsetstart ')
        new_starttime = f.get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetstart,
            comp_timezone=comp_timezone)
        logger.debug(' new_starttime: ' + str(new_starttime) + ' ' + str(type(new_starttime)))
        # must be stored als utc??
        # No, tzinfo is mot stored in database, therefore both local and utc are stored as the same datetime
        setattr(schemeitem, 'timestart', new_starttime)
        logger.debug('saved timestart: ' + str(getattr(schemeitem, 'timestart')))

# c. get endtime from rosterdate and offsetstart
        logger.debug('c. get endtime from rosterdate and offsetstart ')
        new_endtime = f.get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetend,
            comp_timezone=comp_timezone)
        logger.debug(' new_endtime: ' + str(new_endtime) + ' ' + str(type(new_endtime)))

        # must be stored als utc??
        # No, tzinfo is mot stored in database, therefore both local and utc are stored as the same datetime
        setattr(schemeitem, 'timeend', new_endtime)
        # logger.debug(' saved timeend: ' + str(getattr(schemeitem, 'timeend')))

# e. recalculate timeduration
        fieldname = 'timeduration'
        if schemeitem.timestart and schemeitem.timeend:
            datediff = schemeitem.timeend - schemeitem.timestart
            datediff_minutes = int((datediff.total_seconds() / 60))
            new_value = int(datediff_minutes - breakduration)

 # when rest shift : timeduration = 0     # cst = 0 = normal, 1 = rest
            if shift_cat == c.SHIFT_CAT_1024_RESTSHIFT:
                new_value = 0

            if fieldname not in update_dict:
                update_dict[fieldname] = {}
            setattr(schemeitem, fieldname, new_value)
            update_dict[fieldname]['updated'] = True


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_shift(upload_dict, update_dict, request):
    # --- create shift # PR2019-08-08
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    # logger.debug(' --- create_shift')
    # logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    shift = None

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'shift'
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')

    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:  # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent shift
        parent = m.get_parent(table, ppk_int, update_dict, request)
        if parent:

# 3. Get value of 'code'
            code = None
            code_dict = upload_dict.get('code')
            if code_dict:
                code = code_dict.get('value')
            if code:
# c. validate code
                has_error = validate_code_name_identifier(table, 'code', code, parent, update_dict)
                if not has_error:
# 4. create and save shift
                    try:
                        shift = m.Shift(scheme=parent, code=code)
                        shift.save(request=request)
                    except:
# 5. return msg_err when shift not created
                        msg_err = _('This shift could not be created.')
                        update_dict['code']['error'] = msg_err
                    else:
# 6. put info in update_dict
                        update_dict['id']['created'] = True
                        update_dict['id']['pk'] = shift.pk
                        update_dict['pk'] = shift.pk

    return shift

def update_shift(instance, parent, upload_dict, update_dict, request):
    # --- update existing and new shift PR2019-09-08
    #  add new values to update_dict (don't reset update_dict, it has values)
    #  also refresh timestart timeend in schemeitems

    logger.debug(' ----- update_shift ----- ')
    logger.debug('upload_dict: ' + str(upload_dict))

    save_changes = False
    has_error = False

#  get comp_timezone
    comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# FIELDS_SHIFT = ('id', 'code', 'cat', 'offsetstart', 'offsetend', 'breakduration', 'wagefactor')
# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'shift'
        pk_int = instance.pk
        ppk_int = instance.scheme.pk

        update_dict['pk'] = pk_int

        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = ppk_int
        update_dict['id']['table'] = table

# 2. save changes in field 'code'
        field = 'code'
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            if 'update' in field_dict:
    # a. get new and old value
                new_value = field_dict.get('value')
                saved_value = getattr(instance, field)
                logger.debug('saved_value: ' + str(saved_value))
                if new_value != saved_value:
    # b. validate code
                    has_error = validate_code_name_identifier(table, field, new_value, parent, update_dict, pk_int)
                    if not has_error:
     # c. save field if changed and no_error
                        setattr(instance, field, new_value)
                        update_dict[field]['updated'] = True
                        if new_value:
                            update_dict[field]['value'] = new_value
                        save_changes = True

# 3. save changes in fields 'offsetstart', 'offsetend',
        for field in ('offsetstart', 'offsetend'):
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                logger.debug('upload_dict: ' + str(upload_dict))
                if 'update' in field_dict:
    # a. get new and old value
                    new_value = field_dict.get('value')
                    logger.debug('new_value' + str(new_value) + ' ' + str(type(new_value)))
                    saved_value = getattr(instance, field)
                    logger.debug('saved_value' + str(saved_value) + ' ' + str(type(saved_value)))

                    if new_value != saved_value:  # (None != 0)=True (None != None)=False
    # c. save field if changed and no_error
                        logger.debug('>>>>>>>>>>>> save new_value' + str(new_value))
                        setattr(instance, field, new_value)
                        update_dict[field]['updated'] = True
                        update_dict[field]['value'] = new_value
                        save_changes = True

                        logger.debug('=========== saved new_value' + str(getattr(instance, field)))

    # d. set min or max in other field
                        if field == 'offsetstart':
                            offsetend_minvalue = 0
                            if new_value and new_value > 0:
                                offsetend_minvalue = new_value
                            update_dict['offsetend']['minvalue'] = offsetend_minvalue
                        elif field == 'offsetend':
                            offsetstart_maxvalue =  1440
                            if new_value and new_value < 1440:
                                offsetstart_maxvalue = new_value
                            update_dict['offsetstart']['maxvalue'] = offsetstart_maxvalue

# 4. save changes in fields 'cat', 'breakduration', 'wagefactor'
        for field in ('cat', 'wagefactor'):
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    new_value = field_dict.get('value', 0)
                    saved_value = getattr(instance, field)
                    logger.debug('saved_value: ' + str(saved_value))
                    if new_value != saved_value:
    # c. save field if changed
                        setattr(instance, field, new_value)
                        update_dict[field]['updated'] = True
                        update_dict[field]['value'] = new_value

                        save_changes = True

        field = 'breakduration'
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            if 'update' in field_dict:
                new_value = field_dict.get('value')
                if new_value is None:
                    new_value = 0
                old_value = getattr(instance, field, 0)
                logger.debug('new_value: ' + str(new_value) + ' old_value: ' + str(old_value))
                if new_value != old_value:
                    setattr(instance, field, new_value)
                    save_changes = True
                    update_dict[field]['updated'] = True

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                msg_err = _('This shift could not be updated.')
                update_dict['id']['error'] = msg_err

# 6. also recalc schemitems
            recalc_schemeitems(instance, request, comp_timezone)

# 6. put updated saved values in update_dict #PR2019-08-25 debug: don't, it erases pk from deleted instance
        # d.create_shift_dict(shift, update_dict)

    return has_error


def recalc_schemeitems(instance, request, comp_timezone):
    if instance:
        schemeitems = m.Schemeitem.objects.filter(shift=instance, scheme__order__customer__company=request.user.company)
        for schemeitem in schemeitems:
            update_dict = {}
            calc_schemeitem_timeduration(schemeitem, update_dict, comp_timezone)
            schemeitem.save(request=request)


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_team(upload_dict, update_dict, request):
    # --- create team # PR2019-08-08
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    # logger.debug(' --- team')
    # logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    team = None

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'team'
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')
    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:  # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str
# 2. get parent of team
        parent = m.get_parent(table, ppk_int, update_dict, request)
        if parent:
# 3. Get value of 'code'
            code = None
            code_dict = upload_dict.get('code')
            if code_dict:
                code = code_dict.get('value')
            if code:
    # c. validate code
                has_error = validate_code_name_identifier(table, 'code', code, parent, update_dict)
                if not has_error:
# 4. create and save team
                    team = m.Team(scheme=parent, code=code)
                    team.save(request=request)

# 5. return msg_err when team not created
                    if team.pk is None:
                        msg_err = _('This team could not be created.')
                        update_dict['code']['error'] = msg_err
                    else:
# 6. put info in update_dict
                        update_dict['id']['created'] = True

    return team


def create_scheme(parent, upload_dict, update_dict, request, temp_pk_str=None):
    # --- create scheme # PR2019-07-21
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    # logger.debug(' --- create_scheme')
    # logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    instance = None

# 1. save temp_pk_str in in 'id' of update_dict'# attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
    if temp_pk_str:
        update_dict['id']['temp_pk'] = temp_pk_str

    if parent:
# 2. Get value of 'code' (Scheme has no field 'name')
        code = None
        code_dict = upload_dict.get('code')
        if code_dict:
            code = code_dict.get('value')

# c. validate code
        has_error = validate_code_name_identifier('scheme', 'code', code,  parent, update_dict)

        if not has_error:
            instance = m.Scheme(order=parent, code=code)
            instance.save(request=request)

# 5. return msg_err when instance not created
    if instance is None:
        update_dict['id']['error'] = _('This scheme could not be created.')
    else:
# 6. put info in update_dict
        update_dict['id']['created'] = True

    return instance


def create_schemeitem (parent, upload_dict, update_dict, request, temp_pk_str=None):
    # --- create schemeitem # PR2019-07-22
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    # logger.debug(' --- create_schemeitem')
    # logger.debug(upload_dict)
    # upload_dict: {'id': {'temp_pk': 'new_3', 'create': True, 'ppk': 1, 'table': 'schemeitems'},
    # 'rosterdate': {'value': '2019-07-22', 'update': True},

    instance = None

# 1. save temp_pk_str in in 'id' of update_dict'# attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
    if temp_pk_str:
        if 'id' not in update_dict:
            update_dict['id'] = {}
        update_dict['id']['temp_pk'] = temp_pk_str

    if parent:
# 2. Get value of 'rosterdate'
        rosterdate = None
        msg_err = None

        rosterdate_dict = upload_dict.get('rosterdate')
        if rosterdate_dict:
            new_value = rosterdate_dict.get('value')
            rosterdate, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed

# c. validate code
        if msg_err is not None:
            update_dict['rosterdate']['error'] = msg_err
        else:
            instance = m.Schemeitem(scheme=parent, rosterdate=rosterdate, timeduration=0)
            instance.save(request=request)

# 3. return msg_err when instance not created
    if instance is None:
        update_dict['id']['error'] = _('This shift could not be created.')
    else:
# 6. put info in update_dict
        update_dict['id']['created'] = True

    return instance

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_teammember(upload_dict, update_dict, request):
    # --- create teammember # PR2019-07-26
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    logger.debug(' --- create_teammember')
    logger.debug(upload_dict)
    # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'table': 'teammember', 'mode': 'absence', 'ppk': 1300},
    # 'team': {'pk': 1300, 'value': 'Vakantie', 'ppk': 1112, 'update': True}}

    instance = None

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'teammember'
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')
        cat = int(id_dict.get('cat', 0))

        logger.debug(' temp_pk_str: ' + str(temp_pk_str) + ' ppk_int: ' + str(ppk_int))

    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:
            # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent instance
            parent = m.get_parent(table, ppk_int, update_dict, request)
            if parent:
                logger.debug('table: ' + str(table) + ' parent: ' + str(parent) + ' model: ' + str(parent.__class__.__name__))

# 3. get employee
                # employee: {value: "Chester", pk: 75, update: true}
                field_dict = upload_dict.get('employee')
                if field_dict:
                    employee_pk =  field_dict.get('pk')
                    if employee_pk:
                        employee = m.get_instance('employee', employee_pk, request.user.company, update_dict)
                    # 3. return msg_err when employee is None
                        if employee is None:
                            update_dict['employee']['error'] = _('Employee cannot be blank.')
                        else:
 # c. create Teammember
                            instance = m.Teammember(team=parent, employee=employee, cat=cat)
                            instance.save(request=request)

 # 3. return msg_err when instance not created
                            if instance.pk is None:
                                msg_err = _('This teammember could not be created.')
                                update_dict['id']['error'] = msg_err

                            else:
                        # 6. put info in update_dict
                                update_dict['id']['created'] = True

        logger.debug(' update_dict: ' + str(update_dict))
    return instance
