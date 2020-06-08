
# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.db.models import Q, Value
from django.db.models.functions import Lower, Coalesce
from django.shortcuts import render, redirect #, get_object_or_404
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.translation import activate, pgettext_lazy, ugettext_lazy as _

from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, DeleteView, View, CreateView

from datetime import date, time, datetime, timedelta

import json
from django.utils.functional import Promise
from django.utils.encoding import force_text
from django.core.serializers.json import DjangoJSONEncoder

from tsap.settings import TIME_ZONE

from tsap import constants as c
from tsap import functions as f

from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_namelast_namefirst, validate_code_name_identifier, validate_employee_has_emplhours

from accounts.models import Usersetting
from companies import models as m
from companies import dicts as compdicts
from employees.forms import EmployeeAddForm, EmployeeEditForm
from employees import dicts as d
from customers import dicts as cd
from planning import dicts as pld
from planning import views as plvw
from planning import rosterfill as plrf

import logging
logger = logging.getLogger(__name__)


# === LazyEncoder ===================================== PR2019-03-04
# PR2019-01-04 https://stackoverflow.com/questions/19734724/django-is-not-json-serializable-when-using-ugettext-lazy
class LazyEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, Promise):
            return force_text(obj)
        return super(LazyEncoder, self).default(obj)


# === Employee ===================================== PR2019-03-02
@method_decorator([login_required], name='dispatch')
class EmployeeListView(View):

    def get(self, request):
        param = {}

        if request.user.company is not None:

# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# b. get comp_timezone and timeformat
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h

# ---  get interval
            interval = 15
            if request.user.company.interval:
                interval = request.user.company.interval

     # get weekdays translated
            lang = user_lang if user_lang in c.WEEKDAYS_ABBREV else c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[lang])

    # get months translated
            lang = user_lang if user_lang in c.MONTHS_ABBREV else c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[lang])

            param = get_headerbar_param(request, {
                'lang': user_lang,
                'timezone': comp_timezone,
                'timeformat': timeformat,
                'interval': interval,
                'weekdays': weekdays_json,
                'months': months_json,
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'employees.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeUploadView(UpdateView):  # PR2019-07-30

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmployeeUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)

                logger.debug('upload_dict' + str(upload_dict))
# 3. get iddict variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, is_absence, table, mode, row_index = f.get_iddict_variables(id_dict)
                    update_dict = {}
# A. check if parent exists  (company is parent of employee)
                    parent = request.user.company
                    if parent:

# B. create new update_dict with all fields and id_dict. Unused ones will be removed at the end
                        update_dict = f.create_update_dict(
                            c.FIELDS_EMPLOYEE,
                            table=table,
                            pk=pk_int,
                            ppk=parent.pk,
                            temp_pk=temp_pk_str,
                            row_index=row_index)

# C. Delete employee
                        if is_delete:
                            instance = m.Employee.objects.get_or_none(id=pk_int, company=parent)
                            if instance:
                                this_text = _("Employee '%(tbl)s'") % {'tbl': instance.code}
                        # a. check if employee has emplhours, put msg_err in update_dict when error
                                has_emplhours = validate_employee_has_emplhours(instance, update_dict)
                                if not has_emplhours:
                        # b. check if there are teammembers with this employee: absence teammembers, remove employee from shift teammembers
                                    delete_employee_from_teammember(instance, request)
                        # c. delete employee
                                    deleted_ok = m.delete_instance(instance, update_dict, request, this_text)
                                    if deleted_ok:
                                        instance = None
                        else:
# D. Create new employee
                            if is_create:
                                instance = create_employee(upload_dict, update_dict, request)
# E. Get existing employee
                            else:
                                instance = m.Employee.objects.get_or_none(id=pk_int, company=parent)

# F. Update employee, also when it is created
                            if instance:
                                update_employee(instance, parent, upload_dict, update_dict, user_lang, request)

# G. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
                        if instance:
                            d.create_employee_dict(instance, update_dict, user_lang)

# H. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)

# I. add update_dict to update_wrap
                    if update_dict:
                        update_list = []
                        update_list.append(update_dict)
                        update_wrap['update_list'] = update_list

# J. return update_wrap
            return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
@method_decorator([login_required], name='dispatch')
class TeammemberUploadView(UpdateView):  # PR2019-12-06
    # this function is called bij employee.js, customer.js and scheme.js
    def post(self, request, *args, **kwargs):
        logger.debug('  ')
        logger.debug(' ===================== TeammemberUploadView ===================== ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# b. get comp_timezone and timeformat
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h

# 2. get upload_dict from request.POST
            upload_json = request.POST.get("upload")
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))

# 3. save quicksave
            # quicksave is saved in UploadUserSettings

# 4. get iddict variables
                # mode = f.get_dict_value(upload_dict, ('id','mode'))
                shift_option = f.get_dict_value(upload_dict, ('id','shiftoption'))
                is_absence = f.get_dict_value(upload_dict, ('id','isabsence'))

                # key 'mode' is used in calendar_employee_upload etc .
                # from customer_calendar shiftoption': 'schemeshift'
                # from employee calendar : mode: "create" shiftoption: "issingleshift" "isabsence"
                # from planning: shiftoption: "grid_team"

                update_dict = {}
                if shift_option in ('issingleshift', 'isabsence'):
                    logger.debug('------------ shift_option: ' + str(shift_option))
                    # called by employee page, calendar
                    calendar_dictlist, logfile = calendar_employee_upload(shift_option, request, upload_dict, comp_timezone, timeformat, user_lang)

                    # TODO calendar_header_dict has no value. Is necessary??
                    # update_wrap['calendar_header_dict'] = calendar_header_dict

                    # function create_updated_employee_calendar_list adds the follwing items to update_wrap:
                    # 'scheme_list', 'team_list', 'shift_list', 'teammember_list', 'schemeitem_list']

                    update_wrap = create_updated_employee_calendar_list(upload_dict, comp_timezone, user_lang, request)
                    if calendar_dictlist:
                        update_wrap['employee_calendar_list'] = calendar_dictlist
                    if logfile:
                        update_wrap['logfile'] = logfile

                elif shift_option == 'schemeshift':
                    # 'table' has no value in mode 'schemeshift'

                    calendar_dictlist, logfile = calendar_employee_upload(shift_option, request, upload_dict, comp_timezone, timeformat, user_lang)
                    if calendar_dictlist:
                        update_wrap['employee_calendar_list'] = calendar_dictlist
                    if logfile:
                        update_wrap['logfile'] = logfile

                    create_updated_order_calendar_list(upload_dict, update_wrap, comp_timezone, timeformat, user_lang, request)

                elif shift_option == 'grid_team':
                    # 'table' has no value in mode 'grid_team'
                    update_wrap = grid_team_upload(request, upload_dict, comp_timezone, timeformat, user_lang)

                elif shift_option == 'grid_shift':
                    # 'table' has no value in mode 'grid_team'
                    update_wrap = grid_shift_upload(request, upload_dict, user_lang)

                else:
                    table = f.get_dict_value(upload_dict, ('id','table'), '')
                    #logger.debug('table: ' + str(table))
                    if table == 'teammember':
                        # called by scheme page, teammember table update
                        # TODO replace 'id.isabsence' by shift_option == 'isabsence':
                        if is_absence:
                            update_dict = absence_upload(request, upload_dict, user_lang)
                            update_wrap['absence_update'] = update_dict
                        else:
                            update_dict = teammember_upload(request, upload_dict, user_lang)
                            update_wrap['teammember_update'] = update_dict

                if shift_option:
                    # get saved calendar_period_dict
                    period_dict = {'get': True}
                    calendar_period_dict = pld.period_get_and_save('calendar_period', period_dict,
                                                                 comp_timezone, timeformat, user_lang, request)

                    datefirst_iso = calendar_period_dict.get('rosterdatefirst')
                    datelast_iso = calendar_period_dict.get('rosterdatelast')
                    #logger.debug('datefirst_iso: ' + str(datefirst_iso))
                    #logger.debug('datelast_iso: ' + str(datelast_iso))

            # 3. get employee
                    # was double ??
                    """
                    employee_pk = None
                    employee_dict = upload_dict.get('employee')
                    #logger.debug('ooooooooooooooooooooooooooo employee_dict: ' + str(employee_dict))
                    if employee_dict:
                        employee_pk = employee_dict.get('pk')
                    #logger.debug('employee_pk: ' + str(employee_pk))
                    logfile = []
                    employee_calendar_list, logfile = plrf.create_employee_planning(
                        datefirst_iso=datefirst_iso,
                        datelast_iso=datelast_iso,
                        customer_pk=None,
                        order_pk=None,
                        employee_pk=employee_pk,
                        add_empty_shifts=False,
                        skip_absence_and_restshifts=False,
                        orderby_rosterdate_customer=False,
                        comp_timezone=comp_timezone,
                        timeformat=timeformat,
                        user_lang=user_lang,
                        request=request)
                    if employee_calendar_list:
                        update_wrap['employee_calendar_list'] = employee_calendar_list
                    """
        #logger.debug('update_wrap: ' + str(update_wrap))

        # 9. return update_wrap
        update_wrap_json = json.dumps(update_wrap, cls=LazyEncoder)

        return HttpResponse(update_wrap_json)

#######################################

def grid_team_upload(request, upload_dict, comp_timezone, timeformat, user_lang): # PR2019-12-06
    logger.debug('============= grid_team_upload ============= ')
    # this function is called by TeammemberUploadView shift_option 'grid_team'

# upload_dict: {
    # 'id': {'shiftoption': 'grid_team'},
    # 'team': {'id': {'pk': '2132', 'ppk': 1655, 'table': 'team', 'mode': 'update'}, 'code': {'value': 'Ploeg Bac', 'update': True}}}
    #  'teammembers_dict': {
    #       '1222': {'id': {'pk': [1222], 'ppk': 2277, 'table': 'teammember', 'mode': 'none', 'shiftoption': 'schemeshift'}}},

    calendar_dictlist = []
    logfile = []

    updates = {}
# ++++++++++++++++  update team from upload_dict ++++++++++++++++
    upload_team_dict = upload_dict.get('team')
    team_ppk = f.get_dict_value(upload_dict, ('team', 'id', 'ppk'))
    scheme = m.Scheme.objects.get_or_none(id=team_ppk, order__customer__company=request.user.company)
    #logger.debug('scheme: ' + str(scheme))
    team, mapped_teampk_dict = update_instance_from_item_dict('team', upload_team_dict, scheme, user_lang, request)
    #logger.debug('team: ' + str(team) )

    if team is None:
        # team is deleted
        team_update = upload_team_dict
        #logger.debug('........... team_update: ' + str(team_update))
        updates['team_update_list'] = [team_update]
    else:
        team_update = pld.create_team_dict(team, upload_team_dict)
        updates['team_update_list'] = [team_update]

# ++++++++++++++++  update teammember from upload_dict ++++++++++++++++
        teammembers_list = upload_dict.get('teammembers_list')
        teammember_updates = update_teammembers_from_uploaddict(
            teammembers_list=teammembers_list,
            mapped_teampks=mapped_teampk_dict,
            user_lang=user_lang,
            request=request)

        if teammember_updates:
            updates['tm_update_list'] = teammember_updates
    return updates
#######################################


def grid_shift_upload(request, upload_dict, user_lang): # PR2019-12-06
    logger.debug(' ----- grid_shift_upload -----')
    logger.debug('upload_dict: ' + str(upload_dict))
    # this function is called by TeammemberUploadView shift_option 'grid_shift'

    updates = {}
# ++++++++++++++++  update shift from upload_dict ++++++++++++++++
    upload_shift_dict = upload_dict.get('shift')
    logger.debug('upload_shift_dict: ' + str(upload_shift_dict))

    shift_ppk = f.get_dict_value(upload_dict, ('shift', 'id', 'ppk'))
    scheme = m.Scheme.objects.get_or_none(id=shift_ppk, order__customer__company=request.user.company)

    shift, mapped_shiftpk_dict = update_instance_from_item_dict('shift', upload_shift_dict, scheme, user_lang, request)

    logger.debug('........... upload_shift_dict: ' + str(upload_shift_dict))

    if shift is None:
        # shift is deleted
        shift_update = upload_shift_dict
        updates['shift_update_list'] = [shift_update]
    else:
        shift_update = pld.create_shift_dict(shift, upload_shift_dict, user_lang)
        updates['shift_update_list'] = [shift_update]

    logger.debug('........... shift_update: ' + str(shift_update))
    return updates
#######################################



def calendar_order_upload(request, upload_dict, comp_timezone, timeformat, user_lang): # PR2019-12-06

    # this disables the logger, except for critical
    # logging.disable(logging.CRITICAL)
    #logger.debug('++++++++++++++++++++++ calendar_order_upload ++++++++++++++++++++++ ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    #logger.debug('--- ')

    # upload_dict: {
        # 'id': {'mode': 'schemeshift'},
        # 'rosterdate': '2020-01-03',
        # 'calendar_datefirst': '2019-12-30', 'calendar_datelast': '2020-01-05',
        # 'weekday_index': 5, 'weekday_list': ['-', '-', '-', '-', '-', 'update1528', '-', '-'],
        # 'teammember_list': [{'id': {'pk': 'new3', 'ppk': 1919, 'create': True},
        # 'team': {'pk': 1919, 'ppk': 1563, 'code': 'Ploeg 1'}, 'update': True,
        # 'employee': {'field': 'employee', 'pk': 2585, 'ppk': 3, 'code': 'Gomes Bravio NM', 'update': True}}],
        # 'order': {'id': {'pk': 1372, 'ppk': 648, 'table': 'order'}},
        # 'scheme': {'id': {'pk': 1563, 'ppk': 1372, 'table': 'scheme', 'isdefaultweekshift': True}, 'cycle': {'value': 7}},
        # 'shift': {'id': {'pk': 528, 'ppk': 1563, 'table': 'shift'}},
        # 'schemeitem': {'id': {'pk': 1528, 'ppk': 1563, 'table': 'schemeitem'}}, 'team': {'id': {'pk': 1919, 'ppk': 1563, 'table': 'team'}}}

    # upload_dict: {
        #  {'id': {'mode': 'schemeshift'},
        #  'rosterdate': '2020-01-07',
        #  'calendar_datefirst': '2020-01-06', 'calendar_datelast': '2020-01-12',
        #  'weekday_index': 2,
        #  'weekday_list': ['-', '-', 'update1658,2017,578,1657,2018,579', '-', '-', '-', '-', '-'],
        #  'teammember_list': [], 'order': {'id': {'pk': 1370, 'ppk': 648, 'table': 'order'}, 'code': {'value': 'Rooi Katootje'}}, 'scheme': {'pk': 1607, 'id': {'pk': 1607, 'ppk': 1370, 'table': 'scheme'}, 'billable': {'override': False, 'billable': False}, 'cat': {'value': 0}, 'isdefaultweekshift': {'value': True}, 'code': {'value': 'Schema 1'}, 'cycle': {'value': 7}, 'excludepublicholiday': {'value': True}},
        #  'shift': {'id': {'pk': 'new5', 'ppk': 1607, 'create': True}, 'code': {'value': '01.00 - 02.00', 'update': True}, 'offsetstart': {'value': 60, 'minoffset': -720, 'maxoffset': 120, 'update': True}, 'offsetend': {'value': 120, 'minoffset': 60, 'maxoffset': 2160, 'update': True}, 'breakduration': {'value': 0, 'minoffset': 0, 'maxoffset': 60}, 'timeduration': {'value': 60, 'minoffset': 0, 'maxoffset': 1440}, 'update': True},
        #  'team': {'id': {'pk': 2018, 'ppk': 1607, 'table': 'team'}, 'scheme': {'pk': 1607, 'ppk': 1370, 'code': 'Schema 1'}, 'code': {'value': 'Ploeg B'}},
        #  'schemeitem': {'id': {'table': 'schemeitem', 'pk': 1657, 'ppk': 1607}}}


    update_wrap = {}
    scheme_has_changed = False
    team_has_changed = False
    teammembers_have_changed = False
    shifts_have_changed = False

# 1. get iddict variables
    is_create = False
    id_dict = upload_dict.get('id')
    if id_dict:
        is_create = ('create' in id_dict)  # 'create' means create new scheme
    #logger.debug('is_create: ' + str(is_create))

# --- ORDER ---
    order = None
    order_pk = None
    order_dict = upload_dict.get('order')
    if order_dict:
        id_dict = order_dict.get('id')
        if id_dict:
            order_pk = id_dict.get('pk')
            order = m.Order.objects.get_or_none(
                customer__company=request.user.company,
                pk=order_pk
            )
    #logger.debug('order: ' + str(order))

# --- SCHEME ---
# get scheme info: datefirst, datelast, excludepublicholiday, excludecompanyholiday
    scheme = None
    if order:
        scheme_dict = upload_dict.get('scheme')
        if scheme_dict:
            scheme_pk, scheme_ppk, is_create, is_delete = None, None, False, False
            id_dict = scheme_dict.get('id')
            if id_dict:
                scheme_pk = id_dict.get('pk')
                scheme_ppk = id_dict.get('ppk')
                is_create = ('create' in id_dict)
                is_delete = ('delete' in id_dict)
            #logger.debug('scheme_pk: ' + str(scheme_pk))

            if is_create:
                # get scheme name with next sequence
                code_with_sequence = f.get_code_with_sequence('scheme', order, user_lang)
                scheme = m.Scheme(
                    order_id=scheme_ppk,
                    code=code_with_sequence,
                    isdefaultweekshift=True
                    # cycle = 7 (default)
                )
                scheme.save(request=request)
                scheme_has_changed = True
            else:
                scheme = m.Scheme.objects.get_or_none(id=scheme_pk, order__customer__company=request.user.company)
            #logger.debug('scheme: ' + str(scheme))

            if scheme:
                if is_delete:
                    scheme.delete(request=request)
                    scheme = None
                    scheme_has_changed = True
                else:
                    update_dict = {}
                    scheme_has_changed = plvw.update_scheme(scheme, scheme_dict, update_dict, request)

# --- TEAM ---
    team = None
    mapped_team_pk_dict = {}
    if scheme:
        team_dict = upload_dict.get('team')
        #logger.debug('team_dict: ' + str(team_dict))
        if team_dict:
            team_pk, is_create, is_delete = 0, False, False
            id_dict = team_dict.get('id')
            if id_dict:
                team_pk = id_dict.get('pk')
                is_create = ('create' in id_dict)
                is_delete = ('delete' in id_dict)
            if is_create:
                field_dict = team_dict.get('code')
                code_value = field_dict.get('value')
                if code_value is None:
                    code_value = f.get_code_with_sequence('team', scheme, user_lang)
                team = m.Team(
                    scheme=scheme,
                    code=code_value)
                team.save(request=request)
                #logger.debug('team: ' + str(team))
                # put new team.pk in mapped_team_pk_dict, to be used for adding teammember
                mapped_team_pk_dict[team_pk] = team.pk
                #logger.debug('mapped_team_pk_dict: ' + str(mapped_team_pk_dict))
                team_has_changed = True
        # ---  TEAMMEMBER ---
                # also add teammember without employee > teammmeber will be added further
            else:
                team = m.Team.objects.get_or_none(id=team_pk, scheme__order__customer__company=request.user.company)
            # team has no other fields to be updated
        #logger.debug('team: ' + str(team))

# --- SHIFT ---
        # if current shift has changed it will be updated in plvw.update_shift_instance when 'update' in field_dict
        # if shift is added: this shift will be put in selected schemeitems. There are no multiple shift uploads (like with teammembers)
        shift = None
        shift_dict = upload_dict.get('shift')
        #logger.debug('shift_dict: ' + str(shift_dict))
        if shift_dict:
            shift_pk, is_create, is_delete = 0, False, False
            id_dict = shift_dict.get('id')
            if id_dict:
                shift_pk = id_dict.get('pk')
                is_create = ('create' in id_dict)
                is_delete = ('delete' in id_dict)
            if is_create:
                new_shift_code = None
                code_dict = shift_dict.get('code')
                if code_dict:
                    new_shift_code = code_dict.get('value')
                    #logger.debug('new_shift_code: ' + str(new_shift_code))
                if new_shift_code is None:
                    new_shift_code = f.get_code_with_sequence('shift', scheme, user_lang)

                #logger.debug('new_shift_code: ' + str(new_shift_code))
                shift = m.Shift(
                    scheme=scheme,
                    code=new_shift_code
                )
                shift.save(request=request)
                shifts_have_changed = True
            else:
                shift = m.Shift.objects.get_or_none(id=shift_pk,
                                                    scheme__order__customer__company=request.user.company)
                # TODO only when data has changed
                shifts_have_changed = True
            # update other fields when 'update' in field_dict
            if shift:
                update_dict = {}
                plvw.update_shift_instance(shift, scheme, shift_dict, update_dict, user_lang, request)

# --- SCHEMEITEM ---
    # 1. get rosterdate and weekday_index. This is the date and weekday of the calendercolumn that is clcked on
        clicked_rosterdate_iso = upload_dict.get('rosterdate')
        clicked_rosterdate_dte = f.get_date_from_ISO(clicked_rosterdate_iso)
        #logger.debug('clicked_rosterdate_dte: ' + str(clicked_rosterdate_dte) + ' ' + str(type(clicked_rosterdate_dte)))

        # weekday_list: ['-', '-', '-', 'update1466,1467', '-', 'create', '-', '-']
        # 'weekday_list': ['-', '-', 'update1657,2018,578', '-', 'create', '-', '-', '-'],
        weekday_list = upload_dict.get('weekday_list')
        #logger.debug('weekday_list: ' + str(weekday_list) + ' ' + str(type(weekday_list)))

        # get schemeitem that is clicked on, in case weekday has multiple schemeitems
        schemeitem_dict = upload_dict.get('schemeitem')
        #logger.debug('schemeitem_dict: ' + str(schemeitem_dict))

        selected_scheme_pk = scheme.pk
        selected_schemeitem_pk = None
        if schemeitem_dict:
            id_dict = schemeitem_dict.get('id')
            if id_dict:
                selected_schemeitem_pk = id_dict.get('pk')
        #logger.debug('selected_schemeitem_pk: ' + str(selected_schemeitem_pk))
        #logger.debug('clicked_rosterdate_dte: ' + str(clicked_rosterdate_dte))
        # 'weekday_list': ['-', '-', '-', 'update,1665,1607,-,-', '-', 'delete,1667,1607,-,-', '-', '-'],
        if clicked_rosterdate_dte and weekday_list:
            # loop through weekdays
            for weekday_index in range(1,8):
                weekdaylist_value = weekday_list[weekday_index]
                # weekdaylist_value: delete,1667,1607,-,-
                #logger.debug('weekdaylist_value: ' + str(weekdaylist_value))
                if ',' in weekdaylist_value:
                    # loop through es of this day
                    schemeitems_arr = weekdaylist_value.split('|')
                    #logger.debug('schemeitems_arr: ' + str(schemeitems_arr))
                    #logger.debug('len(schemeitems_arr): ' + str(len(schemeitems_arr)))
                    for schemeitem in schemeitems_arr:
                        pk_arr = schemeitem.split(',')
                        # mode = 'create', 'update' or 'delete'
                        mode = pk_arr[0]
                        schemeitem_pk = pk_arr[1]
                        scheme_pk = pk_arr[2]
                        #logger.debug('mode: ' + str(mode))
                        #logger.debug('scheme_pk: ' + str(scheme_pk))

                        if mode == 'create':
                            days_add = weekday_index - clicked_rosterdate_dte.isoweekday()
                            rosterdate_dte = clicked_rosterdate_dte + timedelta(days=days_add)
                            #logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))

                            # TODO onpublicholiday
                            on_publicholiday= False
                            schemeitem = m.Schemeitem(
                                scheme=scheme,
                                rosterdate=rosterdate_dte,
                                team=team,
                                shift=shift,
                                onpublicholiday=on_publicholiday
                            )
                            schemeitem.save(request=request)
                            #logger.debug('created schemeitem: ' + str(schemeitem) + ' ' + str(type(schemeitem)))

                        elif mode in ('update', 'delete'):
                            # with multiple schemeitems all schemeitem of this scheme on this day will be updated or deleted

                            #logger.debug('mode update delete: ')
                            schemeitem = None
                            if schemeitem_pk:
                                schemeitem = m.Schemeitem.objects.get_or_none(
                                    id=schemeitem_pk,
                                    scheme__order__customer__company=request.user.company
                                )
                                #logger.debug('schemeitem: ' + str(schemeitem))
                            if schemeitem:
                                if mode == 'delete':
                                    #logger.debug('delete schemeitem: ' + str(schemeitem) + ' ' + str(type(schemeitem)))
                                    schemeitem.delete(request=request)
                                else:
                                    schemeitem.team = team
                                    schemeitem.shift = shift
                                    schemeitem.save(request=request)
                                    #logger.debug('update schemeitem: ' + str(schemeitem) + ' ' + str(type(schemeitem)))
                            if mode == 'delete':
                                # delete scheme completely when there are no schemeitems left in this scheme
                                count = m.Schemeitem.objects.filter(scheme=scheme).count()
                                if count == 0:
                                    #logger.debug('scheme.delete: ' + str(scheme) + ' ' + str(type(scheme)))
                                    # shifts, teams annd teammembers of this scheme will also be deleted because of on_delete=CASCADE
                                    scheme.delete(request=request)

# --- TEAMMEMBER ---
        teammember_list = upload_dict.get('teammember_list')
        #logger.debug('---------------------teammember_list: ' + str(teammember_list))
        if teammember_list:
            for teammember_dict in teammember_list:
                #logger.debug('teammember_dict: ' + str(teammember_dict))
                id_dict = teammember_dict.get('id')
                if id_dict:
                    is_create = 'create' in id_dict
                    is_delete = 'delete' in id_dict
                    #logger.debug('is_create: ' + str(is_create))
                    #logger.debug('is_delete: ' + str(is_delete))

                    # parent_team of teammember can be different from team in upload_dict!!!
                    team_pk_str = id_dict.get('ppk')
                    #logger.debug('team_pk_str: ' + str(team_pk_str) + str(type(team_pk_str)))
                    #logger.debug('mapped_team_pk_dict: ' + str(mapped_team_pk_dict))
                    try:
                        team_pk = int(team_pk_str)
                    except:
                        # if pk_str = 'new4': get mapped new pk from  mapped_team_pk_dict
                        # mapped_team_pk_dict is filled when creating new teams
                        team_pk = mapped_team_pk_dict[team_pk_str]
                    #logger.debug('team_pk: ' + str(team_pk))

                    parent_team = None
                    if team_pk:
                        parent_team = m.Team.objects.get_or_none(id=team_pk, scheme=scheme)
                    #logger.debug('parent_team: ' + str(parent_team))
                    if parent_team:
                        teammember = None
                        if is_create:
                            teammember = m.Teammember(team=parent_team)
                            teammember.save(request=request)
                        else:
                            teammember_pk = id_dict.get('pk')
                            #logger.debug('teammember_pk: ' + str(teammember_pk))
                            if teammember_pk:
                                teammember = m.Teammember.objects.get_or_none(id=teammember_pk, team=team)
                                if is_delete:
                                    teammember.delete(request=request)
                        #logger.debug('teammember: ' + str(teammember))
                        if teammember:
                            update_dict = {}
                            # teammember.save is part of update_teammember
                            teammembers_have_changed = update_teammember(teammember, teammember_dict, update_dict, request)

# J create updated ordere_calendar_list
    datefirst_iso = upload_dict.get('calendar_datefirst')
    datelast_iso = upload_dict.get('calendar_datelast')

    #logger.debug('order_pk: ' + str(order_pk))
    #logger.debug('datefirst_iso: ' + str(datefirst_iso))
    #logger.debug('datelast_iso: ' + str(datelast_iso))

    if order_pk is not None and datefirst_iso is not None and datelast_iso is not None:
        customer_pk = None
        #logger.debug('mmmmmmmmmmmmmmm calendar_dictlist: ')

        calendar_dictlist = plrf.create_customer_planning(
            datefirst_iso=datefirst_iso,
            datelast_iso=datelast_iso,
            customer_pk=customer_pk,
            order_pk=order_pk,
            comp_timezone=comp_timezone,
            timeformat=timeformat,
            user_lang=user_lang,
            request=request)

        #logger.debug('calendar_dictlist: ' + str(calendar_dictlist))
        if calendar_dictlist:
            update_wrap['customer_calendar_list'] = calendar_dictlist

# 8. update scheme_list when changes are made
    filter_dict = {'order_pk': order_pk}
    scheme_list = pld.create_scheme_list(
        filter_dict=filter_dict,
        company=request.user.company,
        comp_timezone=comp_timezone,
        user_lang=user_lang)

    if scheme_list:
        update_wrap['scheme_list'] = scheme_list

    team_list = pld.create_team_list(
        filter_dict=filter_dict,
        company=request.user.company)
    if team_list:
        update_wrap['team_list'] = team_list

    shift_list = pld.create_shift_list(
        filter_dict=filter_dict,
        company=request.user.company,
        user_lang=user_lang)
    if shift_list:
        update_wrap['shift_list'] = shift_list

    teammember_list = d.create_teammember_list(
        filter_dict=filter_dict,
        company=request.user.company,
        user_lang=user_lang)
    if teammember_list:
        update_wrap['teammember_list'] = teammember_list

    schemeitem_list = pld.create_schemeitem_list(filter_dict=filter_dict, company=request.user.company)
    if schemeitem_list:
        update_wrap['schemeitem_list'] = schemeitem_list

    # this enables the logger
    logging.disable(logging.NOTSET)

    logging.debug('looging turned on again')
 # J. return update_wrap
    return update_wrap

#######################################
# absence upload from employee calendar
# upload_dict: {
# 'id': {'mode': 'create', 'shiftoption': 'isabsence'},
# 'rosterdate': '2020-04-06', 'calendar_datefirst': '2020-04-06', 'calendar_datelast': '2020-04-12', 'weekday_index': 1,
# 'order': {'pk': '1450', 'ppk': '705', 'table': 'order', 'isabsence': True, 'code': 'Vakantie', 'mode': 'update'},
# 'scheme': {'id': {'pk': 'new4', 'ppk': '1450', 'table': 'scheme', 'mode': 'create', 'shiftoption': 'isabsence'}, 'cycle': {'value': 1}, 'code': {'value': 'van Delden JM'},
#                   'datefirst': {'value': '2020-04-06'}, 'datelast': {'value': '2020-04-06'}, 'excludepublicholiday': {'value': False}, 'excludecompanyholiday': {'value': False}},
# 'teams_list': [  {'id': {'pk': 'new5', 'ppk': '1450', 'table': 'team', 'mode': 'create', 'shiftoption': 'isabsence'}, 'code': {'value': 'van Delden JM'}}],
# 'shifts_list': [ {'id': {'pk': 'new6', 'ppk': '1450', 'table': 'shift', 'mode': 'create', 'shiftoption': 'isabsence'},
#                   'code': {'value': '08.00 - 17.00'}, 'offsetstart': {'value': 480}, 'offsetend': {'value': 1020}, 'breakduration': {'value': 0}, 'timeduration': {'value': 540}}],
# 'employee': {'pk': 2606, 'ppk': None, 'table': 'employee', 'code': None},
# 'teammembers_list': [ {'id': {'pk': 'new7', 'ppk': 'new5', 'table': 'teammember', 'mode': 'create', 'shiftoption': 'isabsence'},
#                         'employee': {'pk': 2606, 'ppk': None, 'table': 'employee', 'code': None},
#                         'replacement': {'pk': 2606, 'ppk': None, 'table': 'employee', 'code': None},
#                         'datefirst': {'value': '2020-04-06'}, 'datelast': {'value': '2020-04-06'},
#                         }],
# 'schemeitems_list': [ {'id': {'pk': 'new8', 'ppk': 'new4', 'table': 'schemeitem', 'mode': 'create', 'shiftoption': 'isabsence'},
#                       'onpublicholiday': True, 'rosterdate': {'value': '2020-04-06'}, 'team': {'pk': 'new5'}, 'shift': {'pk': 'new6'}}]}
def calendar_employee_upload(shift_option, request, upload_dict, comp_timezone, timeformat, user_lang): # PR2019-12-06
    logger.debug(' ')
    logger.debug('============= calendar_employee_upload ============= ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    # this function is called by TeammemberUploadView option 'issingleshift', 'isabsence', 'schemeshift'

    calendar_dictlist = []
    logfile = []

# - get employee - employee is required in 'issingleshift' and 'isabsence'
    employee = None
    employee_pk = None
    employee_dict = upload_dict.get('employee')
    if employee_dict:
        employee_pk = employee_dict.get('pk')
        employee = m.Employee.objects.get_or_none(
            company=request.user.company,
            pk=employee_pk
        )
    #logger.debug('employee: ' + str(employee))
    if shift_option in ('issingleshift', 'isabsence'):
        if employee is None:
            return [], []

# - get order - order is required
    order = None
    order_dict = upload_dict.get('order')
    if order_dict:
        order_pk = order_dict.get('pk')
        order = m.Order.objects.get_or_none(
            customer__company=request.user.company,
            pk=order_pk
        )
    #logger.debug('order: ' + str(order))
    if order is None:
        return [], []

# - ++++++++++++++++  update scheme, shifts, teams, teammembers and schemeitems from upload_dict
    update_scheme_shift_team_tm_si(upload_dict, user_lang, request)
# - ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++

# - create updated employee_calendar_list
    datefirst = upload_dict.get('calendar_datefirst')
    datelast = upload_dict.get('calendar_datelast')
    #logger.debug('datefirst: ' + str(datefirst) + ' ' + str(type(datefirst)))
    #logger.debug('datelast: ' + str(datelast) + ' ' + str(type(datelast)))
    #logger.debug('employee_pk: ' + str(employee_pk) + ' ' + str(type(employee_pk)))

    if employee_pk is not None and datefirst is not None and datelast is not None:
        #logger.debug('employee_pk is not None and datefirst is not None and datelast is not None: ')
        customer_id, order_id = None, None
        add_empty_shifts = False
        skip_restshifts = False
        orderby_rosterdate_customer = False

        calendar_dictlist, logfile = plrf.create_employee_planning(datefirst, datelast, customer_id, order_id, employee_pk,
                                               add_empty_shifts, skip_restshifts, orderby_rosterdate_customer,
                                                comp_timezone, timeformat, user_lang, request)
        #logger.debug('calendar_dictlist: ' + str(calendar_dictlist))

    # J. return calendar_dictlist
    return calendar_dictlist, logfile


def update_scheme_shift_team_tm_si(upload_dict, user_lang, request): # PR2020-04-06
    logger.debug(' ')
    logger.debug('=========== update_scheme_shift_team_tm_si ==========  ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    # this function is called by TeammemberUploadView option 'issingleshift', 'isabsence', 'schemeshift'

# - get order - order is required
    order = None
    order_pk = f.get_dict_value(upload_dict, ('order', 'pk'))
    if order_pk:
        order = m.Order.objects.get_or_none(
            customer__company=request.user.company,
            pk=order_pk
        )
    logger.debug('order: ' + str(order))

    if order:
# - update scheme from upload_dict
        # only one scheme is used, mapped_schemepk_dict is necessary when it is a new scheme
        scheme_dict = upload_dict.get('scheme')
        scheme, mapped_schemepk_dict = update_instance_from_item_dict('scheme', scheme_dict, order, user_lang, request)
        logger.debug('scheme: ' + str(scheme))

        if scheme:
# - update shifts from upload_dict
            shifts_list = upload_dict.get('shifts_list')
            mapped_shiftpk_dict = update_shifts_from_uploaddict(shifts_list, mapped_schemepk_dict, scheme, user_lang, request)
            logger.debug('mapped_shiftpk_dict: ' + str(mapped_shiftpk_dict))

# - update teams from upload_dict
            teams_list = upload_dict.get('teams_list')
            logger.debug('teams_list: ' + str(teams_list))
            mapped_teampk_dict = update_teams_from_uploaddict(teams_list, mapped_schemepk_dict, scheme, user_lang, request)
            logger.debug('mapped_teampk_dict: ' + str(mapped_teampk_dict))

# - update teammember from upload_dict
            teammembers_list = upload_dict.get('teammembers_list')
            update_teammembers_from_uploaddict(
                teammembers_list=teammembers_list,
                mapped_teampks=mapped_teampk_dict,
                user_lang=user_lang,
                request=request)

# - update_schemeitems_from_list
            schemeitems_list = upload_dict.get('schemeitems_list')
            update_schemeitems_from_list(
                    schemeitems_list=schemeitems_list,
                    mapped_schemepk_dict=mapped_schemepk_dict,
                    mapped_shiftpks=mapped_shiftpk_dict,
                    mapped_teampks=mapped_teampk_dict,
                    parent=scheme,
                    user_lang=user_lang,
                    request=request)

            # TODO also delete scheme when there are no schemeitems left in this scheme
            # team, teammember, shift and schemeitem are cascade delete, will be deleted when scheme is deleted


def update_shifts_from_uploaddict (shifts_list, mapped_schemepk_dict, scheme, user_lang, request):
    #logger.debug(' ')
    #logger.debug(' ++++++++++++++++  update_shifts_from_uploaddict ++++++++++++++++ ')

    mapped_pk_dict = {}
    if shifts_list:
        table = 'shift'
        for shift_dict in shifts_list:
            #logger.debug('shift_dict: ' + str(shift_dict))

# - replace scheme_pk 'new7' by pk of saved scheme, using mapped_schemepk_dict
            # not necessary, parent = scheme, there is only one scheme
            # true, but it can be a new scheme with scheme_pk 'new7'
            scheme_pk = f.get_dict_value(shift_dict, ('id', 'ppk'))
            #logger.debug('scheme_pk: ' + str(scheme_pk))
            if mapped_schemepk_dict and scheme_pk in mapped_schemepk_dict:
                mapped_schemepk = mapped_schemepk_dict.get(scheme_pk)
                #logger.debug('mapped_schemepk: ' + str(mapped_schemepk))
                shift_dict['id']['ppk'] = mapped_schemepk
                #logger.debug('new shift_dict[id]: ' + str(shift_dict['id']))

            instance, mapped_pk = update_instance_from_item_dict(table, shift_dict, scheme, user_lang, request)
            # update adds dict 'mapped_pk' to dict 'mapped_pk_dict'
            mapped_pk_dict.update(mapped_pk)
    return mapped_pk_dict


def update_teams_from_uploaddict (teams_list, mapped_schemepk_dict, scheme, user_lang, request):
    logger.debug(' ')
    logger.debug('++++++++++++++++  update_teams_from_uploaddict ++++++++++++++++ ')

    mapped_pk_dict = {}
    if teams_list:
        table = 'team'
        for team_dict in teams_list:
            logger.debug('team_dict: ' + str(team_dict))

# - replace scheme_pk 'new7' by pk of saved scheme, using mapped_schemepk_dict
            # not necessary, parent = scheme, there is only one scheme
            # true, but it can be a new scheme with scheme_pk 'new7'
            scheme_pk = f.get_dict_value(team_dict, ('id', 'ppk'))
            #logger.debug('scheme_pk: ' + str(scheme_pk))
            if mapped_schemepk_dict and scheme_pk in mapped_schemepk_dict:
                mapped_schemepk = mapped_schemepk_dict.get(scheme_pk)
                #logger.debug('mapped_schemepk: ' + str(mapped_schemepk))
                team_dict['id']['ppk'] = mapped_schemepk
                #logger.debug('new team_dict[id]: ' + str(team_dict['id']))

            instance, mapped_pk = update_instance_from_item_dict(table, team_dict, scheme, user_lang, request)
            # update adds dict 'mapped_pk' to dict 'mapped_pk_dict'
            mapped_pk_dict.update(mapped_pk)
    return mapped_pk_dict


def update_teammembers_from_uploaddict (teammembers_list, mapped_teampks, user_lang, request):
    logger.debug(' ')
    logger.debug(' ++++++++++++++++  update_teammembers_from_uploaddict ++++++++++++++++ ')

    teammember_updates = []
    if teammembers_list:
        table = 'teammember'
        for item_dict in teammembers_list:
            logger.debug('item_dict: ' + str(item_dict))

    # replace parent 'team_pk' = 'new7' by pk of saved item, using mapped_pks
            team_pk = f.get_dict_value(item_dict, ('id', 'ppk'))
            logger.debug('team_pk: ' + str(team_pk) + ' ' + str(type(team_pk)))
            logger.debug('mapped_teampks: ' + str(mapped_teampks))
            if mapped_teampks and team_pk in mapped_teampks:
                team_pk = mapped_teampks.get(team_pk)
    # get parent 'team'
            logger.debug('new team_pk: ' + str(team_pk) + ' ' + str(type(team_pk)))
            if team_pk:
                team = m.Team.objects.get_or_none(pk=team_pk,
                    scheme__order__customer__company=request.user.company)
                if team:
    # update teammember'
                    teammember, mapped_dict_NIU = update_instance_from_item_dict(table, item_dict, team, user_lang, request)

    # return teammember_dict when row is updated, created or deleted
                    teammember_update = d.create_teammember_dict_from_model(teammember, item_dict, user_lang)
                    logger.debug('.......... item_dict: ' + str(item_dict))
                    teammember_updates.append(teammember_update)
                    logger.debug('teammember_update: ' + str(teammember_update))
    return teammember_updates
# === end of update_teammembers_from_uploaddict

def update_schemeitems_from_list (schemeitems_list, mapped_schemepk_dict, mapped_shiftpks, mapped_teampks, parent, user_lang, request):
    #logger.debug(' ')
    #logger.debug('# ++++++++++++++++  update_schemeitems_from_list ++++++++++++++++ ')
    #logger.debug('parent: ' + str(parent) + ' ' + str(type(parent)))
    #logger.debug('schemeitems_list: ' + str(schemeitems_list) + ' ' + str(type(schemeitems_list)))
    #  item_dict: {
    #  'id': {'pk': 'new11', 'ppk': 'new6', 'table': 'schemeitem', 'mode': 'create', 'shiftoption': 'issingleshift'},
    #  'rosterdate': '2020-02-07',
    #  'onpublicholiday': False,
    #  'shift': {'pk': 'new7', 'code': '05.00 - 08.00'},
    #  'team': {'pk': 'new8', 'code': 'van Delden JM'}}

    mapped_pk_dict = {}
    if schemeitems_list:
        table = 'schemeitem'
        for item_dict in schemeitems_list:
            #logger.debug('item_dict: ' + str(item_dict))

# - replace scheme_pk 'new7' by pk of saved scheme, using mapped_schemepk_dict
            # not necessary, parent = scheme, there is only one scheme
            # true, but it can be a new scheme with scheme_pk 'new7'
            scheme_pk = f.get_dict_value(item_dict, ('id', 'ppk'))
            #logger.debug('scheme_pk: ' + str(scheme_pk))
            if mapped_schemepk_dict and scheme_pk in mapped_schemepk_dict:
                mapped_schemepk = mapped_schemepk_dict.get(scheme_pk)
                item_dict['id']['ppk'] = mapped_schemepk
                #logger.debug('mapped_schemepk: ' + str(mapped_schemepk))
                #logger.debug('new item_dict[id]: ' + str(item_dict['id']))

# - replace shift_pk 'new9' by pk of saved item, using mapped_shiftpks
            shift_pk = f.get_dict_value(item_dict, ('shift', 'pk'))
            #logger.debug('shift_pk: ' + str(shift_pk))
            if mapped_shiftpks and shift_pk in mapped_shiftpks:
                mapped_shiftpk = mapped_shiftpks.get(shift_pk)
                #logger.debug('mapped_shiftpk: ' + str(mapped_shiftpk))
                item_dict['shift']['pk'] = mapped_shiftpk
                #logger.debug('new item_dict[shift]: ' + str(item_dict['shift']))

# - replace team_pk 'new8' by pk of saved item, using mapped_teampks
            team_pk = f.get_dict_value(item_dict, ('team', 'pk'))
            #logger.debug('team_pk: ' + str(team_pk))
            #logger.debug('mapped_teampks: ' + str(mapped_teampks))
            if mapped_teampks and team_pk in mapped_teampks:
                mapped_teampk = mapped_teampks.get(team_pk)
                #logger.debug('mapped_teampk: ' + str(mapped_teampk))
                item_dict['team']['pk'] = mapped_teampk
                #logger.debug('new item_dict[team]: ' + str(item_dict['team']))

            instance, mapped_pk_dictNIU = update_instance_from_item_dict(table, item_dict, parent, user_lang, request)
# === end of update_schemeitems_from_list


def update_instance_from_item_dict (table, item_dict, parent, user_lang, request):
    #logging.disable(logging.CRITICAL)  # logging.CRITICAL disables logging calls with levels <= CRITICAL
    logging.disable(logging.NOTSET)  # logging.NOTSET re-enables logging
    logger.debug('----------------  update instance from items_dict ------------------ ')
    logger.debug('table: ' + str(table))
    logger.debug('parent: ' + str(parent) + ' ' + str(type(parent)))
    logger.debug('item_dict: ' + str(item_dict))

    # item_dict: {'id': {'pk': 'new9', 'ppk': '1424', 'table': 'scheme', 'mode': 'create', 'shiftoption': 'isabsence', 'cycle': 1},
    #       'code': 'Colpa de WH', 'datefirst': '2020-02-05', 'datelast': '2020-02-07', 'excludepublicholiday': False, 'excludecompanyholiday': False}
    instance = None
    mapped_pk_dict = {}
    id_dict = {}
    if item_dict:
        # TODO: go back to 'create' and 'delete' instead of mode
        # only mode 'create' and 'delete' are used in this function.
        # tag 'update' is not used in this function, instead it detects changed values
        mode = f.get_dict_value(item_dict, ('id', 'mode'))
        is_create = f.get_dict_value(item_dict, ('id', 'create'), False)
        is_delete = f.get_dict_value(item_dict, ('id', 'delete'), False)
        # shiftopions in fields are: 'isabsence', 'issingleshift'
        shift_option = f.get_dict_value(item_dict, ('id', 'shiftoption'))
        pk = f.get_dict_value(item_dict, ('id', 'pk'))
        is_absence = (shift_option == 'isabsence')
        is_singleshift = (shift_option == 'issingleshift')
        # TODO onpublicholiday
        divergent_onpublicholiday = False
        on_publicholiday = False

        is_created, is_deleted, is_updated = False, False, False
        if is_create or mode == 'create':
            if table == 'scheme':
                # when absence cycle = 1, when singleshift cycle = 7
                cycle = f.get_dict_value(item_dict, ('cycle', 'value'), 7)
                code = f.get_dict_value(item_dict, ('code', 'value'), c.SCHEME_TEXT[user_lang])
                instance = m.Scheme(order=parent,
                                    code=code,
                                    cycle=cycle,
                                    divergentonpublicholiday=divergent_onpublicholiday,
                                    isabsence=is_absence,
                                    issingleshift=is_singleshift)
            if table == 'shift':
                code = f.get_dict_value(item_dict, ('code', 'value'), c.SHIFT_TEXT[user_lang])
                instance = m.Shift(scheme=parent,
                                   code=code)
            elif table == 'team':
                code = f.get_dict_value(item_dict, ('code', 'value'), c.TEAM_TEXT[user_lang])
                instance = m.Team(scheme=parent,
                                  code=code,
                                  isabsence=is_absence, issingleshift=is_singleshift)
            elif table == 'teammember':
                instance = m.Teammember(team=parent,
                                        isabsence=is_absence, issingleshift=is_singleshift)
            elif table == 'schemeitem':
                rosterdate = f.get_dict_value(item_dict, ('rosterdate', 'value'))
                #logger.debug('parent: ' + str(parent) + ' ' + str(type(parent)))
                #logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
                #logger.debug('is_absence: ' + str(is_absence) + ' ' + str(type(is_absence)))
                #logger.debug('is_singleshift: ' + str(is_singleshift) + ' ' + str(type(is_singleshift)))
                if rosterdate:
                    instance = m.Schemeitem(scheme=parent,
                                            rosterdate=rosterdate,
                                            onpublicholiday=on_publicholiday,
                                            isabsence=is_absence,
                                            issingleshift=is_singleshift,
                                            inactive=False,
                                            )

            logger.debug('instance: ' + str(instance) +  ' ' + str(type(instance)))
            if instance:
                instance.save(request=request)
                mapped_pk_dict[pk] = instance.pk
                item_dict['id']['pk'] = instance.pk
                item_dict['id']['mode'] = 'created'
                item_dict['id']['created'] = True
                is_created = True
            logger.debug('is_created: ' + str(is_created))

        elif pk:
            if table == 'scheme':
                instance = m.Scheme.objects.get_or_none(pk=pk,
                    order__customer__company=request.user.company)
            if table == 'shift':
                instance = m.Shift.objects.get_or_none(pk=pk,
                    scheme__order__customer__company=request.user.company)
            elif table == 'team':
                instance = m.Team.objects.get_or_none(pk=pk,
                    scheme__order__customer__company=request.user.company)
            elif table == 'teammember':
                instance = m.Teammember.objects.get_or_none(pk=pk,
                    team__scheme__order__customer__company=request.user.company)
            elif table == 'schemeitem':
                instance = m.Schemeitem.objects.get_or_none(pk=pk,
                    scheme__order__customer__company=request.user.company)

            logger.debug('existing instance: ' + str(instance) + ' ' + str(type(instance)))
            if instance and (is_delete or mode == 'delete'):
                has_schemeitems_tobe_deleted = False
                if table == 'shift':
                    has_schemeitems_tobe_deleted = m.Schemeitem.objects.filter(scheme=parent, shift=instance).exists()
                #logger.debug('has_schemeitems_tobe_deleted: ' + str(has_schemeitems_tobe_deleted))

                instance.delete(request=request)
                instance = None
                item_dict['id']['mode'] = 'deleted'
                item_dict['id']['deleted'] = True
                is_deleted = True
                if has_schemeitems_tobe_deleted:
                    m.Schemeitem.objects.filter(scheme=parent, shift=instance).delete()

        if instance:
            # loop through fields in item_dict. Fields in item_dict are updated,
            # no need for 'update=true' in dict, therefore also 'key 'value ' not needed

    # change parent - only when absence and table = scheme: order changes when changing abscat
            if is_absence and  table == 'scheme':
                new_order_pk = f.get_dict_value(item_dict, ('id', 'ppk'))
                #logger.debug('new_order_pk: ' + str(new_order_pk))
                if new_order_pk and new_order_pk != parent.pk:
                    new_order = m.Order.objects.get_or_none(pk=new_order_pk,
                                    customer__company=request.user.company)
                    #logger.debug('new_order: ' + str(new_order))
                    if new_order:
                        instance.order = new_order
                        is_updated = True

            for field, field_dict in item_dict.items():
                # field 'id' already retrieved
                # field 'rosterdate' only occurs in table 'schemeitem' and cannot be changed in this function
                # field 'scheme' occurs in table 'shift', 'team' and 'schemeitem', it cannot be changed
                # PR2020-06-07 debug: 'update' gave error TODO get rid of 'update', i dont think its necessary
                if field != 'id' and field != 'rosterdate' and field != 'scheme' and field != 'update':
                    logger.debug('field: ' + str(field) + ' field_dict: ' + str(field_dict) + ' ' + str(type(field_dict)))
                    old_value = getattr(instance, field)
                    logger.debug('old_value: ' + str(old_value) + ' ' + str(type(old_value)))

            # get new_value
                    new_value = None
                    if field in ('team', 'shift', 'employee', 'replacement'):
                        pk_int = field_dict.get('pk')
                        if pk_int:
                            if field in ('employee', 'replacement'):
                                new_value = m.Employee.objects.get_or_none(
                                    pk=pk_int,
                                    company=request.user.company)
                            elif field == 'team':
                                new_value = m.Team.objects.get_or_none(
                                    pk=pk_int,
                                    scheme__order__customer__company=request.user.company)
                            elif field == 'shift':
                                new_value = m.Shift.objects.get_or_none(
                                    pk=pk_int,
                                    scheme__order__customer__company=request.user.company)

                    elif field == 'code':
                        new_value = field_dict.get('value')
                        if new_value is None:
                            new_value = f.get_code_with_sequence(table, parent, user_lang)

                    elif field == 'cycle':
                        new_value = field_dict.get('value')
                        if new_value is None:
                            new_value = 7

                    elif field in ('datefirst', 'datelast'):
                        new_value_iso = field_dict.get('value')
                        # was: new_value = f.get_dateobj_from_dateISOstring(new_value_iso)
                        new_value = f.get_date_from_ISO(new_value_iso)

                    elif field in ('offsetstart', 'offsetend'):
                        new_value = field_dict.get('value')

                    elif field in ('breakduration', 'timeduration'):
                        # note: timeduration is calculated in page js.
                        new_value = field_dict.get('value')
                        if new_value is None:
                            new_value = 0

                    elif field in ('excludepublicholiday', 'divergentonpublicholiday', 'excludecompanyholiday', 'onpublicholiday', 'isrestshift', 'inactive'):
                        new_value = field_dict.get('value')
                        if new_value is None:
                            new_value = False

                    elif field in ('isabsence', 'issingleshift'):
                        new_value = item_dict.get(field)
                        if new_value is None:
                            new_value = False

                    # only save when value has changed
                    logger.debug('new_value: ' + str(new_value) + ' ' + str(type(new_value)))
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True
                        # datefirst / datelast could be str, gave error. Changed to dict. Let isinstance stay
                        if isinstance(field_dict, dict):
                            field_dict['updated'] = True
                            if 'update' in field_dict:
                                field_dict.pop('update')
                    logger.debug('is_updated: ' + str(is_updated) )
            if is_updated:
                instance.save(request=request)
                if not is_created and not is_deleted:
                    item_dict['id']['mode'] = 'updated'
                    item_dict['id']['updated'] = True
                logger.debug('-----> instance of ' + table + ' is saved: ' + str(instance))
            else:
                if not is_created and not is_deleted:
                    item_dict['id']['mode'] = 'unchanged'
                logger.debug(' -----> instance of ' + table + ' is NOT saved: ' + str(instance))
    #  ++++++++++++++++  end update_from_teamsdict ++++++++++++++++
    return instance, mapped_pk_dict

#######################################

def absence_upload(request, upload_dict, user_lang): # PR2019-12-13
    logger.debug(' --- absence_upload ---')
    logger.debug('upload_dict: ' + str(upload_dict))

    update_dict = {}

# 1. get iddict variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table', '')
        pk_int = id_dict.get('pk')
        ppk_int = id_dict.get('ppk')
        temp_pk_str = id_dict.get('temp_pk', '')
        row_index = id_dict.get('rowindex', '')
        is_create = ('create' in id_dict)
        is_delete = ('delete' in id_dict)

        logger.debug('is_delete: ' + str(is_delete))
        logger.debug('is_create: ' + str(is_create))

        logger.debug('temp_pk_str: ' + str(temp_pk_str))

# 2. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        update_dict = f.create_update_dict(
            c.FIELDS_TEAMMEMBER,
            table=table,
            pk=pk_int,
            ppk=ppk_int,
            temp_pk=temp_pk_str,
            row_index=row_index)

# A. Delete teammember and its schemeitems, team and scheme
        if is_delete:
            teammember = m.Teammember.objects.get_or_none(
                id=pk_int,
                team__scheme__order__customer__company=request.user.company)
            logger.debug('teammember: ' + str(teammember))

            if teammember:
                team = teammember.team
                if team:
                    scheme = team.scheme
                    if scheme:
                        order = scheme.order
                        order_code = ''
                        if order:
                            order_code = getattr(order, 'code','')
                        this_text = _("Absence '%(tbl)s'") % {'tbl': order_code}
                        # delete_instance adds 'deleted' or 'error' to id_dict
                        # teammember, team, shift and schemeitem all have 'on_delete=CASCADE'
                        # therefore deleting scheme also deletes the other records
                        deleted_ok = m.delete_instance(scheme, update_dict, request, this_text)
                        logger.debug('deleted_ok: ' + str(deleted_ok))
        else:

# A. get absence category info from order: new_order_pk
            new_order = None
            is_order_update = False
            new_order_dict = upload_dict.get('order')

            logger.debug('new_order_dict: ' + str(new_order_dict))
            if new_order_dict:
                is_order_update = new_order_dict.get('update', False)
                if is_order_update:
                    new_order_pk = new_order_dict.get('pk', 0)
                    if new_order_pk:
                        new_order = m.Order.objects.get_or_none(
                            id=new_order_pk,
                            customer__company=request.user.company
                        )
                    if new_order is None:
                        is_order_update = False
            logger.debug('new_order: ' + str(new_order))

# B. get info from scheme: datefirst, datelast
            is_datefirst_update = False
            datefirst_dte = None
            field_dict = upload_dict.get('datefirst')
            if field_dict:
                is_datefirst_update = field_dict.get('update', False)
                datefirst_iso = field_dict.get('value')
                datefirst_dte = f.get_date_from_ISO(datefirst_iso)
                logger.debug('datefirst_iso: ' + str(datefirst_iso))

            is_datelast_update = False
            datelast_dte = None
            field_dict = upload_dict.get('datelast')
            if field_dict:
                is_datelast_update = field_dict.get('update', False)
                datelast_iso = field_dict.get('value', '')
                datelast_dte = f.get_date_from_ISO(datelast_iso)
                logger.debug('datelast_iso: ' + str(datelast_iso))

# C. get offset_start, offset_end, time_duration
            offset_start, is_offsetstart_update = None, False
            field_dict = upload_dict.get('offsetstart')
            if field_dict:
                is_offsetstart_update = field_dict.get('update', False)
                offset_start = field_dict.get('value')
                logger.debug('offset_start: ' + str(offset_start))
            #logger.debug('is_offsetstart_update: ' + str(is_offsetstart_update))

            offset_end, is_offset_end_update = None, False
            field_dict = upload_dict.get('offsetend')
            if field_dict:
                is_offset_end_update = field_dict.get('update', False)
                offset_end = field_dict.get('value')
                logger.debug('offset_end: ' + str(offset_end))
            #logger.debug('is_offset_end_update: ' + str(is_offset_end_update))

            breakduration, is_breakduration_update = 0, False
            field_dict = upload_dict.get('breakduration')
            if field_dict:
                is_breakduration_update = field_dict.get('update', False)
                breakduration = field_dict.get('value', 0)
                logger.debug('breakduration: ' + str(breakduration))
            #logger.debug('is_breakduration_update: ' + str(is_breakduration_update))

            timeduration, is_timeduration_update = 0, False
            field_dict = upload_dict.get('timeduration', 0)
            if field_dict:
                is_timeduration_update = field_dict.get('update', False)
                timeduration = field_dict.get('value')
                logger.debug('timeduration: ' + str(timeduration))
            #logger.debug('is_timeduration_update: ' + str(is_timeduration_update))

# C: if is_create: create new scheme, shift, team, teammember and schemeitem(s)
            teammember = None
            if is_create:
                logger.debug('is_create: ' + str(is_create))
# D. get absence order
                if new_order is not None:
                    # employee is required
                    employee = None
                    employee_dict = upload_dict.get('employee')
                    logger.debug('employee_dict: ' + str(employee_dict))
                    if employee_dict:
                        employee_pk = employee_dict.get('pk')
                        if employee_pk:
                            employee = m.Employee.objects.get_or_none(
                                pk=employee_pk,
                                company=request.user.company)
                    logger.debug('employee: ' + str(employee))

                    if employee is not None:
        # - create new scheme with cycle = 7
                        # TODO Note: do not set excludepublicholiday=True, set timeduration=0 instead PR2020-04-26
                        scheme_code = employee.code if employee.code else c.SCHEME_TEXT[user_lang]
                        scheme = m.Scheme(
                            order=new_order,
                            code=scheme_code,
                            isabsence=True,
                            cycle=7,
                            datefirst=datefirst_dte,
                            datelast=datelast_dte)
                        scheme.save(request=request)
                        logger.debug('scheme: ' + str(scheme))

                        if scheme:
        # - create new shift
                            shift_code = upload_dict.get('shift_code', '-')
                            # TODO upload shifts_list with code, timestrat-end duration
                            shift = m.Shift(
                                scheme=scheme,
                                code=shift_code,
                                isrestshift=False,
                                istemplate=False,
                                offsetstart=offset_start,
                                offsetend=offset_end,
                                breakduration=breakduration,
                                timeduration=timeduration
                            )
                            shift.save(request=request)
                            logger.debug('shift: ' + str(shift))
                # create new team
                            team_code = employee.code if employee.code else c.TEAM_TEXT[user_lang]
                            team = m.Team(
                                scheme=scheme,
                                code=team_code,
                                isabsence=True)
                            team.save(request=request)
                            logger.debug('team: ' + str(team))

                # create new teammember
                            # datefirst is saved in scheme, not in teammember
                            teammember = m.Teammember(
                                team=team,
                                employee=employee,
                                isabsence=True)
                            teammember.save(request=request)
                            logger.debug('teammember: ' + str(teammember))

                            update_dict['id']['created'] = True

                # create new schemeitem
                            # create only schemeitem for each weekday in service?? Dont, just make hours = 0 on weekdays not in servce
                            # get the monday date of this week
                            this_date = f.get_firstof_week(date.today(), 0)
                            # add schemeitem for each day of the week, except for weekends (isoweekday = 6 or 7)
                            for i in range(1, 8):
                                # TODO onpublicholiday
                                on_publicholiday = False

                                # TODO shift instead of timestart-end duration
                                # dont count absence im weekends
                                # TODo only count absence on working days, with max workhours per day
                                saved_timeduration = timeduration if i < 6 else 0
                                schemeitem = m.Schemeitem(
                                    scheme=scheme,
                                    team=team,
                                    rosterdate=this_date,
                                    onpublicholiday=on_publicholiday,
                                    isabsence=True
                                )
                                schemeitem.save(request=request)
                                this_date = f.add_days_to_date(this_date, 1)
                                #logger.debug('schemeitem rosterdate: ' + str(schemeitem.rosterdate))

# C. If not is_create: get existing teammember
            else:
                scheme = None
                team = None
                teammember = m.Teammember.objects.get_or_none(
                    id=pk_int,
                    team__scheme__order__customer__company=request.user.company)
                if teammember:
                    team = teammember.team
                    if team:
                        scheme= team.scheme
                #logger.debug('teammember: ' + str(teammember))
                #logger.debug('scheme: ' + str(scheme))

# upate order in table scheme if it has changed
                if scheme is not None:
                    if is_order_update:
                        if new_order != scheme.order:
                            scheme.order = new_order
                            update_dict['order']['updated'] = True
                    if is_datefirst_update:
                        if datefirst_dte != scheme.datefirst:
                            scheme.datefirst = datefirst_dte
                            update_dict['datefirst']['updated'] = True
                    if is_datelast_update:
                        if datelast_dte != scheme.datefirst:
                            scheme.datelast = datelast_dte
                            update_dict['datelast']['updated'] = True
                    if is_order_update or is_datefirst_update or is_datelast_update:
                        scheme.save(request=request)

                if is_offsetstart_update or is_offset_end_update or is_breakduration_update or is_timeduration_update:
                    schemeitems = m.Schemeitem.objects.filter(
                        team=team,
                        scheme__order__customer__company=request.user.company)

                    for schemeitem in schemeitems:
                        # dont count absence im weekends
                        # TODo only count absence on working days, with max workhours per day
                        weekday = schemeitem.rosterdate.isoweekday()
                        saved_timeduration = timeduration if weekday < 6 else 0

                        schemeitem.offsetstart = offset_start
                        schemeitem.offsetend = offset_end
                        schemeitem.breakduration = breakduration
                        schemeitem.timeduration = saved_timeduration
                        schemeitem.save(request=request)

# f. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
            if teammember:
                d.create_teammember_dict_from_model(teammember, update_dict, user_lang)

# h. remove empty attributes from update_dict
        f.remove_empty_attr_from_dict(update_dict)

# J. return update_dict
    return update_dict


def teammember_upload(request, upload_dict, user_lang): # PR2019-12-25
    #logger.debug(' ---------------- teammember_upload ---------------- ')
    #logger.debug(' upload_dict: ' + str(upload_dict))
# Absence is updated in absence_upload

# upload_dict =  {
    # 'id': {'pk': 910, 'ppk': 1987, 'table': 'teammember'},
    # 'datefirst': {'value': '2020-01-15', 'update': True}}
    # 'employee': {'pk': 2576, 'ppk': 3, 'update': True}}
    # 'replacement': {'pk': 2586, 'ppk': 3, 'update': True}}

    update_dict = {}

# 1. get iddict variables
    id_dict = upload_dict.get('id')
    if id_dict:
        pk_int, ppk_int, temp_pk_str, is_create, is_delete, is_absence, table, mode, row_index = f.get_iddict_variables(id_dict)

        #logger.debug(' is_create: ' + str(is_create))
        #logger.debug(' mode: ' + str(mode))
# 2. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        # # teammember wagerate not in use
        # # teammember pricerate not in use
        update_dict = f.create_update_dict(
            c.FIELDS_TEAMMEMBER,
            table=table,
            pk=pk_int,
            ppk=ppk_int,
            temp_pk=temp_pk_str,
            row_index=row_index)

# A. new absence has no parent, get ppk_int from team_dict and put it back in upload_dict
        # absence is handled bij absence_upload
        # is_absence = f.get_fielddict_variableXXX(upload_dict, 'isabsence', 'value')
        #logger.debug('is_absence: ' + str(is_absence))
        # if is_create and is_absence:
        #    team_dict = upload_dict.get('team')
        #    #logger.debug('team_dict: ' + str(team_dict))
        #    if team_dict:
        #        ppk_int = int(team_dict.get('pk', 0))
         #       upload_dict['id']['ppk'] = ppk_int
        #        #logger.debug('team_dict ppk_int ' + str(ppk_int))

# 2. check if parent exists (team is parent of teammember)
        parent = m.Team.objects.get_or_none(id=ppk_int, scheme__order__customer__company=request.user.company)
        if parent:
# B. Delete instance
            if is_delete:
                instance = m.Teammember.objects.get_or_none(id=pk_int, team__scheme__order__customer__company=request.user.company)
                #logger.debug('instance: ' + str(instance))
                if instance:
                    deleted_ok = m.delete_instance(instance, update_dict, request)
                    if deleted_ok:
                        instance = None
            else:
# C. Create new teammember
                if is_create:
                    instance = create_teammember(upload_dict, update_dict, request)
# D. get existing instance
                else:
                    instance = m.Teammember.objects.get_or_none(id=pk_int, team=parent)
# E. update instance, also when it is created
                if instance:
                    update_teammember(instance, upload_dict, update_dict, request)
# f. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
            if instance:
                d.create_teammember_dict_from_model(instance, update_dict, user_lang)

# h. remove empty attributes from update_dict
        f.remove_empty_attr_from_dict(update_dict)
        #logger.debug('update_dict: ' + str(update_dict))

# J. return update_dict
    return update_dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_teammember(upload_dict, update_dict, request):
    # --- create teammember # PR2019-07-26
    # Note: all keys in update_dict must exist by running create_update_dict first
    #logger.debug(' --- create_teammember')
    #logger.debug(' upload_dict: ' + str(upload_dict))

    # upload_dict:
    # 'id': {'temp_pk': 'new_1', 'create': True, 'table': 'teammember', 'ppk': 1396},
    # 'cat': {'value': 512},
    # 'employee': {'pk': 2104, 'code': 'aa', 'workhoursperday': 0},
    # 'team': {'pk': 1396, 'value': 'Vakantie', 'ppk': 1136, 'cat': 512, 'update': True},
    # 'workhoursperday': {'value': 0, 'update': True}}

    # upload_dict: {
    # 'isabsence': {'value': True},
    # 'id': {'create': True, 'temp_pk': 'teammember_new2', 'table': 'teammember'},
    # 'employee': {'pk': 2361, 'code': 'Buijze, Yinetd', 'workhoursperday': 0},
    # 'order': {'pk': 1251, 'value': 'Buitengewoon', 'ppk': 607, 'is_absence': True, 'update': True}}

    instance = None

# 1. get iddict variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table')
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk')

    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:  # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent instance
            parent = m.get_parent(table, ppk_int, update_dict, request)
            if parent:
                #logger.debug(' parent: ' + str(parent.code))
# 3. get employee
                # employee: {value: "Chester", pk: 75, update: true}
                field_dict = upload_dict.get('employee')
                #logger.debug(' field_dict: ' + str(field_dict))
                if field_dict:
                    employee_pk = field_dict.get('pk')
                    if employee_pk:
                        employee = m.Employee.objects.get_or_none(id=employee_pk, company=request.user.company)
                        #logger.debug(' employee: ' + str(employee))
                    # 3. return msg_err when employee is None
                        if employee is None:
                            update_dict['id']['error'] = _('Employee cannot be blank.')
                        else:
# 4. create and save Teammember. Copy cat from parent ('team')
                            try:
                                instance = m.Teammember(
                                    team=parent,
                                    employee=employee,
                                    cat=parent.cat,
                                    isabsence=parent.isabsence
                                )
                                instance.save(request=request)
                            except:
                                update_dict['id']['error'] = _('This teammember could not be created.')
                            else:
                                update_dict['id']['pk'] = instance.pk
                                update_dict['id']['created'] = True

    #logger.debug(' instance: ' + str(instance))
    #logger.debug(' update_dict: ' + str(update_dict))
    return instance

def update_teammember(instance, upload_dict, update_dict, request):
    # --- update existing and new teammmber PR2-019-06-01
    # called by teammember_upload, absence_upload
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_teammmber ---')
    #logger.debug('upload_dict' + str(upload_dict))

    # absence upload_dict{
    # 'isabsence': {'value': True},
    # 'id': {'create': True, 'temp_pk': 'teammember_new2', 'table': 'teammember'},
    # 'employee': {'pk': 2569, 'code': 'Crisostomo Ortiz, Rayna', 'workhoursperday': 480},
    # 'order': {'pk': 1265, 'ppk': 610, 'update': True}}

    has_changed = False
    if instance:

# 1. get iddict variables
        save_changes = False
        for field in c.FIELDS_TEAMMEMBER:

# --- get field_dict from  item_dict if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    if field not in update_dict:
                        update_dict[field] = {}

                    is_updated = False
# a. get new_value
                    new_value = field_dict.get('value')

# 2. save changes in field 'team' (in absence mode parent 'team'' can be changed)
                    # PR2019-12-19 not any more - team and scheme are part of teammember absence, order will be changed

# 2. save changes in field 'employee'
                    # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}
                    # remove employee: employee: {update: true}
                    if field in ['employee', 'replacement']:
                        #logger.debug('field: ' + str(field))
                        pk = field_dict.get('pk')
                        #logger.debug('pk: ' + str(pk))
                        employee = None
                        if pk:
                            employee = m.Employee.objects.get_or_none(
                                id=pk,
                                company=request.user.company)

                        #logger.debug('employee: ' + str(employee))
                # also update when employee = None: employee will be removed
                        setattr(instance, field, employee)
                        is_updated = True

# 3. save changes in date fields
                    elif field in ['datefirst', 'datelast']:
        # a. get new_date
                        # was: new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
                        new_date = f.get_date_from_ISO(new_value)
        # c. save field if changed and no_error
                        old_date = getattr(instance, field, None)
                        if new_date != old_date:
                            setattr(instance, field, new_date)
                            is_updated = True

        # 4. save changes in field 'override'
                    elif field == 'override':
                        if not new_value:
                            new_value = False
                        saved_value = getattr(instance, field, False)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

        # 5. add 'updated' to field_dict'
                    if is_updated:
                        save_changes = True
                        update_dict[field]['updated'] = True
                        if 'update' in field_dict:
                            field_dict.pop('update')

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
                has_changed = True
            except:
                update_dict['id']['error'] = _('This teammember could not be updated.')

    logger.debug('update_dict: ' + str(update_dict))
    return has_changed


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# === EmployeeImportView ===================================== PR2019-03-09
@method_decorator([login_required], name='dispatch')
class EmployeeImportView(View):

    def get(self, request):
        param = {}

        if request.user.company is not None:
            # coldef_list = [{'tsaKey': 'employee', 'caption': _('Company name')},
            #                      {'tsaKey': 'ordername', 'caption': _('Order name')},
            #                      {'tsaKey': 'orderdatefirst', 'caption': _('First date order')},
            #                      {'tsaKey': 'orderdatelast', 'caption': _('Last date order')} ]
# LOCALE #
    # get user_lang
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT

    # get coldef_list  and caption
            coldef_list = c.COLDEF_EMPLOYEE
            captions_dict = c.CAPTION_IMPORT

            # oooooooooooooo get_mapped_coldefs_order ooooooooooooooooooooooooooooooooooooooooooooooooooo
            # function creates dict of fieldnames of table Order
            # and gets mapped coldefs from table Companysetting
            # It is used in ImportOrdert to map Excel fieldnames to TSA fieldnames
            # mapped_coldefs: {
            #     "worksheetname": "Compleetlijst",
            #     "no_header": 0,
            #     "coldefs": [{"tsaKey": "idnumber", "caption": "ID nummer", "excKey": "ID"},
            #                 {"tsapKey": "lastname", "caption": "Achternaam", "excKey": "ANAAM"}, ....]
            #logger.debug('==============get_mapped_coldefs_order ============= ')

            mapped_coldefs = {}

            # get mapped coldefs from table Companysetting
            # get stored setting from Companysetting
            stored_setting = {}
            settings_json = m.Companysetting.get_setting(c.KEY_EMPLOYEE_COLDEFS, request.user.company)
            #logger.debug('settings_json: ' + str(settings_json))
            if settings_json:
                stored_setting = json.loads(m.Companysetting.get_setting(c.KEY_EMPLOYEE_COLDEFS, request.user.company))
            # stored_setting = {'worksheetname': 'VakschemaQuery', 'no_header': False,
            #                   'coldefs': {'employee': 'level_abbrev', 'orderdatefirst': 'sector_abbrev'}}

            # don't replace keyvalue when new_setting[key] = ''
            self.has_header = True
            self.worksheetname = ''
            self.codecalc = 'linked'
            if 'has_header' in stored_setting:
                self.has_header = False if Lower(stored_setting['has_header']) == 'false' else True
            if 'worksheetname' in stored_setting:
                self.worksheetname = stored_setting['worksheetname']
            if 'codecalc' in stored_setting:
                self.codecalc = stored_setting['codecalc']

            if 'coldefs' in stored_setting:
                stored_coldefs = stored_setting['coldefs']
                #logger.debug('stored_coldefs: ' + str(stored_coldefs))

                # skip if stored_coldefs does not exist
                if stored_coldefs:
                    # loop through coldef_list
                    for coldef in coldef_list:
                        # coldef = {'tsaKey': 'employee', 'caption': 'Cliënt'}
                        # get fieldname from coldef
                        fieldname = coldef.get('tsaKey')
                        #logger.debug('fieldname: ' + str(fieldname))

                        if fieldname:  # fieldname should always be present
                            # check if fieldname exists in stored_coldefs
                            if fieldname in stored_coldefs:
                                # if so, add Excel name with key 'excKey' to coldef
                                coldef['excKey'] = stored_coldefs[fieldname]
                                #logger.debug('stored_coldefs[fieldname]: ' + str(stored_coldefs[fieldname]))

            coldefs_dict = {
                'worksheetname': self.worksheetname,
                'has_header': self.has_header,
                'codecalc': self.codecalc,
                'coldefs': coldef_list
            }
            coldefs_json = json.dumps(coldefs_dict, cls=LazyEncoder)

            captions = json.dumps(captions_dict, cls=LazyEncoder)

            #param = get_headerbar_param(request, {'stored_columns': coldef_list, 'captions': captions})
            param = get_headerbar_param(request, {'captions': captions, 'setting': coldefs_json})

            #logger.debug('param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'employee_import.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadSetting(View):   # PR2019-03-10
    # function updates mapped fields, no_header and worksheetname in table Companysetting
    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= EmployeeImportUploadSetting ============= ')
        #.debug('request.POST' + str(request.POST) )
        companysetting_dict = {}
        if request.user is not None :
            if request.user.company is not None:
                if request.POST['upload']:
                    new_setting_json = request.POST['upload']
                    # new_setting is in json format, no need for json.loads and json.dumps
                    #logger.debug('new_setting_json' + str(new_setting_json))

                    new_worksheetname = ''
                    new_has_header = True
                    new_code_calc = ''
                    new_coldefs = {}
                    settings_key = c.KEY_EMPLOYEE_COLDEFS
                    stored_json = m.Companysetting.get_jsonsetting(settings_key, request.user.company)
                    if stored_json:
                        stored_setting = json.loads(stored_json)
                        #logger.debug('stored_setting: ' + str(stored_setting))
                        if stored_setting:
                            new_has_header = stored_setting.get('has_header', True)
                            new_worksheetname = stored_setting.get('worksheetname', '')
                            new_code_calc = stored_setting.get('codecalc', '')
                            new_coldefs = stored_setting.get('coldefs', {})

                    if new_setting_json:
                        new_setting = json.loads(new_setting_json)
                        #logger.debug('new_setting' + str(new_setting))
                        if new_setting:
                            if 'worksheetname' in new_setting:
                                new_worksheetname = new_setting.get('worksheetname', '')
                            if 'has_header' in new_setting:
                                new_has_header = new_setting.get('has_header', True)
                            if 'codecalc' in new_setting:
                                new_code_calc = new_setting.get('codecalc')
                            if 'coldefs' in new_setting:
                                new_coldefs = new_setting.get('coldefs', {})
                        #logger.debug('new_code_calc' + str(new_code_calc))
                    new_setting = {'worksheetname': new_worksheetname,
                                   'has_header': new_has_header,
                                   'codecalc': new_code_calc,
                                   'coldefs': new_coldefs}
                    new_setting_json = json.dumps(new_setting)
                    #logger.debug('new_setting' + str(new_setting))
                    #logger.debug('---  set_jsonsettingg  ------- ')
                    #logger.debug('new_setting_json' + str(new_setting_json))
                    #logger.debug(new_setting_json)
                    m.Companysetting.set_jsonsetting(c.KEY_EMPLOYEE_COLDEFS, new_setting_json, request.user.company)

        # only for testing
                    # ----- get user_lang
                    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                    tblName = 'employee'
                    coldefs_dict = compdicts.get_stored_coldefs_dict(tblName, user_lang, request)
                    if coldefs_dict:
                        companysetting_dict['coldefs'] = coldefs_dict
                    #logger.debug('new_setting from saved ' + str(coldefs_dict))

                    #m.Companysetting.set_setting(c.KEY_EMPLOYEE_COLDEFS, new_setting_json, request.user.company)

        return HttpResponse(json.dumps(companysetting_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadData(View):  # PR2018-12-04 PR2019-08-05 PR2020-06-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ========================== EmployeeImportUploadData ========================== ')
        params = {}
        if request.user is not None:
            if request.user.company is not None:
                upload_json = request.POST.get('upload', None)
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    if upload_dict:
# - Reset language
                        # PR2019-03-15 Debug: language gets lost, get request.user.lang again
                        user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                        activate(user_lang)
# - get is_test, codecalc, dateformat, tsaKey_list
                        is_test = upload_dict.get('test', False)
                        codecalc = upload_dict.get('codecalc', 'linked')
                        dateformat = upload_dict.get('dateformat', '')
                        tsaKey_list = upload_dict.get('tsaKey_list')

                        logger.debug('tsaKey_list: ' + str(tsaKey_list))
                        if tsaKey_list:
# - get lookup_field
                            # lookup_field is field that determines if employee alreay exist.
                            # check if one of the fields 'payrollcode', 'identifier' or 'code' exists
                            # first in the list is lookup_field
                            lookup_field = None
                            if 'payrollcode' in tsaKey_list:
                                lookup_field = 'payrollcode'
                            elif 'identifier' in tsaKey_list:
                                lookup_field = 'identifier'
                                lookup_caption = str(_('identifier'))
                            logger.debug('lookup_field: ' + str(lookup_field))
# - get upload_dict from request.POST
                            employee_list = upload_dict.get('employees')
                            if employee_list:
                                today_dte = f.get_today_dateobj()
                                today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)
                                double_line_str = '=' * 80
                                indent_str = ' ' * 5
                                space_str = ' ' * 25
                                logfile = []
                                logfile.append(double_line_str)
                                logfile.append( '  ' + str(request.user.company.code) + '  -  ' +
                                                str(_('Import employees')) + ' ' + str(_('date')) + ': ' + str(today_formatted))
                                logfile.append(double_line_str)

                                if lookup_field is None:
                                    info_txt = str(_('There is no field given to lookup employees. Employees cannot be imported.'))
                                    logfile.append(indent_str + info_txt)
                                else:
                                    if is_test:
                                        info_txt = str(_("This is a test. Employee data are not saved."))
                                    else:
                                        info_txt = str(_("Employee data are saved."))
                                    logfile.append(indent_str + info_txt)
                                    lookup_caption = str(get_field_caption('employee', lookup_field))
                                    info_txt = str(_("Employees are looked up by the field: '%(fld)s'.") % {'fld': lookup_caption})
                                    logfile.append(indent_str + info_txt)
                                    if dateformat:
                                        info_txt = str(_("The date format is: '%(fld)s'.") % {'fld': dateformat})
                                        logfile.append(indent_str + info_txt)
                                    update_list = []
                                    for empl_dict in employee_list:
                                        # from https://docs.quantifiedcode.com/python-anti-patterns/readability/not_using_items_to_iterate_over_a_dictionary.html
                                        # for key, val in student.items():
                                        # logger.debug( str(key) +': ' + val + '" found in "' + str(student) + '"')
                                        # check if value of lookup_field occurs mutiple times
                                        lookup_value = empl_dict.get(lookup_field)
                                        lookup_count = 0
                                        if lookup_value:
                                            count = 0
                                            for dict in employee_list:
                                                value = dict.get(lookup_field)
                                                if value and value == lookup_value:
                                                    lookup_count += 1
                                        update_dict = upload_employee(empl_dict, lookup_field, lookup_count, tsaKey_list, is_test, codecalc, dateformat, indent_str, space_str, logfile, request)
                                        # json_dumps_err_list = json.dumps(msg_list, cls=f.LazyEncoder)
                                        if update_dict:  # 'Any' returns True if any element of the iterable is true.
                                            update_list.append(update_dict)

                                    if update_list:  # 'Any' returns True if any element of the iterable is true.
                                        params['employee_list'] = update_list
                                if logfile:  # 'Any' returns True if any element of the iterable is true.
                                    params['logfile'] = logfile
                                            # params.append(new_employee)

         # return HttpResponse(json.dumps(params))
        return HttpResponse(json.dumps(params, cls=LazyEncoder))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def upload_employee(empl_dict, lookup_field, lookup_count, tsaKey_list, is_test, codecalc, format_str, indent_str, space_str, logfile, request):  # PR2019-12-17 PR2020-06-03
    logger.debug('----------------- import employee  --------------------')
    logger.debug(str(empl_dict))
    # 'code', 'namelast', 'namefirst',  'prefix', 'email', 'tel', 'datefirst',

# - get index and lookup info from empl_dict
    row_index = empl_dict.get('rowindex', -1)
    new_payrollcode = empl_dict.get('payrollcode')
    new_identifier = empl_dict.get('identifier')

    namelast_str = empl_dict.get('namelast', '')[0:c.NAME_MAX_LENGTH]
    new_namelast = namelast_str if namelast_str else None

    namefirst_str = empl_dict.get('namefirst', '')[0:c.NAME_MAX_LENGTH]
    new_namefirst = namefirst_str if namefirst_str else None

# - get code or calculate code, depending on value of 'codecalc
    new_code = None
    if codecalc == 'firstname':
        code_str = get_lastname_firstfirstname(new_namelast, new_namefirst)
    elif codecalc == 'initials':
        code_str = get_lastname_initials(new_namelast, new_namefirst, True)  # PR2019-08-05
    elif codecalc == 'nospace':
        code_str = get_lastname_initials(new_namelast, new_namefirst, False)  # PR2019-08-05
    else:  # codecalc == 'linked'
        code_str = empl_dict.get('code')
    if code_str:
        new_code = code_str[0:c.CODE_MAX_LENGTH]
    if not new_code:
        new_code = None
    code_text = (code_str + space_str)[:30]

# - create update_dict
    update_dict = {'id': {'table': 'employee', 'rowindex': row_index}}

# - lookup employee in database
    # multiple_found and value_too_long return the lookup_value of the error field
    lookup_field_caption = str(get_field_caption('employee', lookup_field))
    lookup_field_capitalized = '-'
    if lookup_field_caption:
        lookup_field_capitalized = lookup_field_caption.capitalize()
    logger.debug('lookup_field: ' + str(lookup_field))
    logger.debug('lookup_field_caption: ' + str(lookup_field_caption))
    logger.debug('lookup_field_capitalized: ' + str(lookup_field_capitalized))

    lookup_value =  empl_dict.get(lookup_field)
    logger.debug('lookup_value: ' + str(lookup_value))

    employee, no_lookup_value, value_too_long, multiple_found = lookup_employee(lookup_field, lookup_value, request)

    logger.debug('employee: ' + str(employee))
    logger.debug('multiple_found: ' + str(multiple_found))
    logger.debug('no_lookup_value: ' + str(no_lookup_value))

    no_code_value = False if new_code else True
    no_namelast_value = False if new_namelast else True

    logger.debug('no_code_value: <' + str(no_code_value) + '>')
    logger.debug('new_code: <' + str(new_code) + '>')

# - give row_error when lookup went wrong
    is_skipped_str = str(_("is skipped."))
    skipped_str = str(_("Skipped."))
    logfile.append(indent_str)
    msg_err = None
    if lookup_count > 1:
        log_str = str(_("%(fld)s '%(val)s' is not unique in Excel file.") % {'fld': lookup_field_capitalized, 'val': lookup_value})
        msg_err = ' '.join((skipped_str, log_str))
    elif no_code_value :
        field_caption = str(get_field_caption('employee', 'code'))
        log_str = str(_("No value for required field: '%(fld)s'.") % {'fld': field_caption})
        msg_err = ' '.join((skipped_str, log_str))
    elif no_namelast_value:
        field_caption = str(get_field_caption('employee', 'namelast'))
        log_str = str(_("No value for required field: '%(fld)s'.") % {'fld': field_caption})
        msg_err = ' '.join((skipped_str, log_str))
    elif no_lookup_value:
        log_str = str(_("No value for lookup field: '%(fld)s'.") % {'fld': lookup_field_caption})
        msg_err = ' '.join((skipped_str, log_str))
    elif value_too_long:
        value_too_long_str = str(_("Value '%(fld)s' is too long.") % {'fld': value_too_long})
        max_str = str(_("Max %(fld)s characters.") % {'fld': c.CODE_MAX_LENGTH})
        log_str =  value_too_long_str + ' ' + max_str
        msg_err = ' '.join((skipped_str, value_too_long_str, max_str))
    elif multiple_found:
        log_str = str(_("Value '%(fld)s' is found multiple times.") % {'fld': lookup_value})
        msg_err = ' '.join((skipped_str, log_str))

    if msg_err:
        update_dict['row_error'] = msg_err
        update_dict[lookup_field] = {'error': msg_err}
        logfile.append(code_text + is_skipped_str)
        logfile.append(' ' * 30 + log_str)
    else:
# - create new employee when employee not found in database
        is_existing_employee = False
        save_instance = False

        if employee is None:
            employee = m.Employee(
                company=request.user.company,
                code=new_code,
                namelast=new_namelast
            )


            if employee:
                save_instance = True
                update_dict['id']['created'] = True
                logfile.append(code_text + str(_('is added.')))
            else:
# - give error msg when creating employee failed
                error_str = str(_("An error occurred. The employee is not added."))
                logfile.append(" ".join((code_text, error_str )))
                update_dict['row_error'] = error_str
        else:
            is_existing_employee = True
            logfile.append(code_text + str(_('already exists.')))

        if employee:
            # add 'id' at the end, after saving the employee. Pk doent have value until instance is saved
            #update_dict['id']['pk'] = employee.pk
            #update_dict['id']['ppk'] = employee.company.pk
            #if is_created_employee:
            #    update_dict['id']['created'] = True

            # PR2020-06-03 debug: ... + (list_item) gives error: must be str, not __proxy__
            # solved bij wrapping with str()
            blank_str = '<' + str(_('blank')) + '>'
            was_str = str(_('was') + ': ')
            for field in c.FIELDS_EMPLOYEE:
                # --- get field_dict from  upload_dict  if it exists
                if field in tsaKey_list:
                    field_dict = {}
                    field_caption = str(get_field_caption('employee', field))
                    caption_txt = (indent_str + field_caption + space_str)[:30]

                    logger.debug('field: ' + str(field))

                    if field in ('code', 'telephone', 'zipcode', 'identifier', 'payrollcode',
                                 'namelast', 'namefirst', 'email', 'address', 'city', 'country'):
                        if field == 'code':
                            new_value = new_code
                        else:
                            new_value = empl_dict.get(field)
            # check length of new_value
                        max_len = c.CODE_MAX_LENGTH \
                            if field in ('code', 'telephone', 'zipcode', 'identifier', 'payrollcode') \
                            else c.NAME_MAX_LENGTH
                        if max_len and new_value and len(new_value) > max_len:
                            msg_err = str(_("'%(val)s' is too long. Maximum is %(max)s characters'.") % {
                                'val': new_value, 'max': max_len})
                            field_dict['error'] = msg_err
                        else:
                # - replace '' by None
                            if not new_value:
                                new_value = None
                            field_dict['value'] = new_value
                            if not is_existing_employee:
                                logfile.append(caption_txt + (new_value or blank_str))
                # - get saved_value
                            saved_value = getattr(employee, field)
                            if new_value != saved_value:
                # put new value in employee instance
                                logger.debug('new_value: <' + str(new_value) + '>')
                                logger.debug('length : ' + str(len(new_value)))
                                setattr(employee, field, new_value)
                                logger.debug('setattr in employee instance: ' + str(new_value))
                                logger.debug('new value is put in employee instance: ' + str(new_value))
                                field_dict['updated'] = True
                                save_instance = True
                # create field_dict and log
                                if is_existing_employee:
                                    old_value_str = was_str + (saved_value or blank_str)
                                    field_dict['info'] = field_caption + ' ' + old_value_str
                                    update_str = ((new_value or blank_str) + space_str)[:25] + old_value_str
                                    logfile.append(caption_txt + update_str)

                    elif field in ('datefirst', 'datelast'):
            # - get new value, convert to date, using format_str
                        new_value = empl_dict.get(field)
                        new_date_dte = None
            # - get saved_value
                        saved_dte = getattr(employee, field)
                        saved_date_iso = None
                        if saved_dte:
                            saved_date_iso = saved_dte.isoformat()
                        old_value_str = was_str + (saved_date_iso or blank_str)

            # - validate new value
                        msg_err = None
                        if new_value and format_str:
                            date_iso = f.get_dateISO_from_string(new_value, format_str)
                            new_date_dte = f.get_date_from_ISO(date_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
                            if new_date_dte is None:
                                msg_err = str(_("'%(val)s' is not a valid date.") % {'val': new_value})
                        if msg_err:
                            field_dict['error'] = msg_err
                            if is_existing_employee:
                                field_dict['info'] = field_caption + ' ' + old_value_str
                                update_str = (msg_err + space_str)[:25] + old_value_str
                                logfile.append(caption_txt + update_str)
                        else:
                            new_date_iso = None
                            if new_date_dte:
                                new_date_iso = new_date_dte.isoformat()
                            field_dict['value'] = new_date_iso
                            if not is_existing_employee:
                                logfile.append(caption_txt + (new_date_iso or blank_str))
                            if new_date_dte != saved_dte:
                # put new value in employee instance
                                logger.debug('field: ' + str(field))
                                logger.debug('new_date_dte: ' + str(new_date_dte))
                                setattr(employee, field, new_date_dte)
                                logger.debug('new value is put in employee instance: ' + str(new_date_dte))
                                field_dict['updated'] = True
                                save_instance = True
                # create field_dict and log
                                if is_existing_employee:
                                    field_dict['info'] = field_caption + ' ' + old_value_str
                                    update_str = ((new_date_iso or blank_str) + space_str)[:25] + old_value_str
                                    logfile.append(caption_txt + update_str)

                    elif field in ('workhours', 'workdays', 'leavedays'):
            # - get new value, convert to number
                        new_value = empl_dict.get(field)
                        new_value_float, msg_err = f.get_float_from_string(new_value)
                        logger.debug('new_value: ' + str(new_value))
                        logger.debug('new_value_float: ' + str(new_value_float))
                        if msg_err:
                            field_dict['error'] = msg_err
                        else:
                            multiplier = 60 if field == 'workhours' else 1440
                            new_value_minutes = int(new_value_float * multiplier)
                            field_dict['value'] = new_value_minutes

                            new_value_rounded = int(0.5 + 100 * new_value_float) / 100
                            new_value_str = str(new_value_rounded) if new_value_rounded else blank_str
                            if not is_existing_employee:
                                logfile.append(caption_txt + new_value_str )

                # - get saved_valueoyee
                            saved_value_minutes = getattr(employee, field)
                            if new_value_minutes != saved_value_minutes:
                # put new value in employee instance

                                logger.debug('field: ' + str(field))
                                logger.debug('new_value_minutes: ' + str(new_value_minutes))
                                setattr(employee, field, new_value_minutes)
                                logger.debug('new value is put in employee instance: ' + str(new_value_minutes))
                                field_dict['updated'] = True
                                save_instance = True
                # create field_dict and log
                                if is_existing_employee:
                                    saved_hours_or_days = int(0.5 + 100 * saved_value_minutes / multiplier) / 100
                                    saved_hours_or_days_str = str(saved_hours_or_days) if saved_value_minutes else blank_str
                                    old_value_str = was_str + saved_hours_or_days_str
                                    field_dict['info'] = field_caption + ' ' + old_value_str
                                    logfile.append(caption_txt + (new_value_str + space_str)[:25] + old_value_str)

                    # set inactive True if employee more than 1 month out of service
                    if field == 'datelast':
                        today_dte = f.get_today_dateobj()

                        #logger.debug('employee.inactive: ' + str(employee.inactive) + ' ' + str(type(employee.inactive)))
                        #logger.debug('employee.datelast: ' + str(employee.datelast) + ' ' + str(type(employee.datelast)))
                        #logger.debug('today_dte: ' + str(today_dte) + ' ' + str(type(today_dte)))

                        if not employee.inactive and employee.datelast and today_dte and employee.datelast < today_dte:
                            logger.debug('field: ' + str(field))
                            logger.debug('new_value_minutes: ' + str(True))
                            setattr(employee, 'inactive', True)
                            logger.debug('new value is put in employee instance: ' + str(True))
                            update_dict['inactive'] = {'value': True, 'updated': True}
                            save_instance = True
                            title_01 = str(_('Last date in service is in the past.'))
                            title_02 = str(_('Employee is made inactive.'))
                            field_dict['info'] = title_01 + ' ' + title_02
                            caption_txt = ' ' * 30
                            logfile.append(caption_txt + title_01)
                            logfile.append(caption_txt + title_02)

            # add field_dict to update_dict
                    update_dict[field] = field_dict

            # TODO: lookup wagecode in tablewagecode, create if not exists

           # dont save data when it is a test run
            if not is_test and save_instance:
                employee.save(request=request)
                update_dict['id']['pk'] = employee.pk
                update_dict['id']['ppk'] = employee.company.pk
                # wagerate wagecode
                # priceratejson additionjson
                try:
                    employee.save(request=request)
                    update_dict['id']['pk'] = employee.pk
                    update_dict['id']['ppk'] = employee.company.pk
                except:
    # - give error msg when creating employee failed
                    error_str = str(_("An error occurred. The employee data is not saved."))
                    logfile.append(" ".join((code_text, error_str)))
                    update_dict['row_error'] = error_str
    return update_dict
# --- end for employee in employees

def get_field_caption(table, field):
    caption = ''
    if table == 'employee':
        if field == 'code':
            caption = _('Short name')
        if field == 'namelast':
            caption = _('Last name')
        if field == 'namefirst':
            caption = _('First name')
        if field == 'email':
            caption = _('Email address')
        if field == 'telephone':
            caption = _('Telephone')
        if field == 'identifier':
            caption = _('ID-number')
        if field == 'payrollcode':
            caption = _('Payroll code')
        if field == 'address':
            caption = _('Address')
        if field == 'zipcode':
            caption = _('Zip code')
        if field == 'city':
            caption = _('City')
        if field == 'country':
            caption = _('Country')
        if field == 'datefirst':
            caption = _('First date in service')
        if field == 'datelast':
            caption = _('Last date in service')
        if field == 'workhours':
            caption = _('Workhours per week')
        if field == 'workdays':
            caption = _('Workdays per week')
        if field == 'leavedays':
            caption = _('Leave days per year')
    return caption

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def lookup_employee(lookup_field, lookup_value, request):  # PR2019-12-17 PR2020-06-02
    logger.debug('----------- lookup_employee ----------- ')
    # function searches for existing employee in the following order: payrollcode, identifier, short name

    logger.debug('lookup_field: ' + str(lookup_field))
    logger.debug('lookup_value: ' + str(lookup_value) + ' ' + str(type(lookup_value)))

    employee = None
    no_value = True
    value_too_long = None
    multiple_found = None

# - search employee by identifier
    if lookup_value:
        no_value = False
    # check if value is not too long
        if len(lookup_value) > c.CODE_MAX_LENGTH:
            # dont lookup other fields when lookup_value is too long
            value_too_long = lookup_value
        else:
    # check if identifier__iexact already exists
            employees = None
            if lookup_field == 'payrollcode':
                employees = m.Employee.objects.filter(payrollcode__iexact=lookup_value,company=request.user.company)
            elif lookup_field == 'identifier':
                employees = m.Employee.objects.filter( identifier__iexact=lookup_value, company=request.user.company)
            row_count = 0
            for employee in employees:
                row_count += 1
            if row_count > 1:
                multiple_found = lookup_value
                employee = None

    return employee, no_value, value_too_long, multiple_found


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_employee(upload_dict, update_dict, request):
    # --- create employee # PR2019-07-30
    # Note: all keys in update_dict must exist by running create_update_dict first
    #logger.debug(' --- create_employee')

    instance = None

# 1. get iddict variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table')
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')

    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str: # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent instance
        parent = m.get_parent(table, ppk_int, update_dict, request)
        if parent:

# 3. Get value of 'code'
            code = None
            code_dict = upload_dict.get('code')
            if code_dict:
                code = code_dict.get('value')
            if code:

    # c. validate code checks null, max len and exists
                has_error = validate_code_name_identifier(table, 'code', code, parent, update_dict, request)
                if not has_error:
# 4. create and save 'customer' or 'order'
                    try:
                        instance = m.Employee(
                            company=parent,
                            code=code)
                        instance.save(request=request)
                    except:
                        update_dict['id']['error'] = _('This employee could not be created.')
                    else:
# 6. put info in update_dict
                        update_dict['id']['pk'] = instance.pk
                        update_dict['id']['created'] = True
                        update_dict['code']['updated'] = True
    return instance


#######################################################
def update_employee(instance, parent, upload_dict, update_dict, user_lang, request):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    #logger.debug(' --- update_employee')
    #logger.debug('upload_dict' + str(upload_dict))

    has_error = False
    if instance:
# 1. get iddict variables
        #  FIELDS_EMPLOYEE = ('id', 'code', 'namelast', 'namefirst',
        #           'email', 'telephone', 'identifier', 'payrollcode',
        #           'address', 'zipcode', 'city', 'country',
        #           'datefirst', 'datelast', 'wagecode', 'workhours', 'workdays', 'leavedays', 'workhoursperday', 'inactive')

        save_changes = False
        for field in c.FIELDS_EMPLOYEE:

# --- get field_dict from  upload_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
# a. get new_value
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field)

# 2. save changes in field 'code', required field
                    if field in ['code', 'identifier']:
                        if new_value != saved_value:
            # validate_code_name_id checks for null, too long and exists. Puts msg_err in update_dict
                            has_error = validate_code_name_identifier(
                                table='employee',
                                field=field,
                                new_value=new_value, parent=parent,
                                update_dict=update_dict,
                                request=request,
                                this_pk=instance.pk)
                            if not has_error:
                                # c. save field if changed and no_error
                                setattr(instance, field, new_value)
                                is_updated = True

    # 3. save changes in fields 'namefirst', 'namelast'
                    elif field in ['namefirst', 'namelast']:
                        if new_value != saved_value:
                            name_first = None
                            name_last = None
                            if field == 'namefirst':
                                name_first = new_value
                                name_last = getattr(instance, 'namelast')
                            elif field == 'namelast':
                                name_first = getattr(instance, 'namefirst')
                                name_last = new_value
                            # check if employee namefirst / namelast combination already exists
                            has_error = validate_namelast_namefirst(
                                namelast=name_last,
                                namefirst=name_first,
                                company=request.user.company,
                                update_field=field,
                                update_dict=update_dict,
                                this_pk=instance.pk)
                            if not has_error:
                                setattr(instance, field, new_value)
                                is_updated = True

# 3. save changes in date fields
                    elif field in ['datefirst', 'datelast']:
        # a. get new_date
                        new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
        # b. validate value
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                            has_error = True
                        else:
        # c. save field if changed and no_error
                            old_date = getattr(instance, field, None)
                            if new_date != old_date:
                                setattr(instance, field, new_date)
                                is_updated = True

# 4. save changes in fields 'pricerate'
                    elif field in ['pricerate']:
                        new_rate, msg_err = f.get_rate_from_value(new_value)
                        #logger.debug('new_rate' + str(new_rate))
                        #logger.debug('msg_err' + str(msg_err))
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
                            saved_value = getattr(instance, field)
                            if new_rate != saved_value:
                                setattr(instance, field, new_rate)
                                is_updated = True

                    elif field in ['XXworkhours', 'XXworkdays', 'XXleavedays']:
                        # convert workhoursperday_hours to minutes per week
                        value_float, msg_err = f.get_float_from_string(new_value)
                        #logger.debug('>>>>>>>>>>>>>>value_float: ' + str(value_float) + ' ' + str(type(value_float)))

                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
                            # get workdays from instance
                            workdays = getattr(instance, 'workdays', c.WORKDAYS_DEFAULT)
                            #logger.debug('workdays: ' + str(workdays) + ' ' + str(type(workdays)))

                            new_workhours_pwk = int(value_float * workdays / 24)  # (hours * 60) / (workdays_in_minutes / 1440)
                            #logger.debug('new_workhours_pwk: ' + str(new_workhours_pwk) + ' ' + str(type(new_workhours_pwk)))

                            old_value = getattr(instance, 'workhours', 0)
                            if new_workhours_pwk != old_value:
                                setattr(instance, 'workhours', new_workhours_pwk)
                                save_changes = True
                                update_dict[field]['updated'] = True
                                #logger.debug('new_workhours_pwk[' + field + ']: ' + str(new_workhours_pwk))
                                #logger.debug('saved_value workhours]: ' + str(getattr(instance, 'workhours')))

# 4. save changes in field 'inactive'
                    elif field == 'inactive':
                        #logger.debug('inactive new_value]: ' + str(new_value) + ' ' + str(type(new_value)))
                        saved_value = getattr(instance, field)
                        #logger.debug('inactive saved_value]: ' + str(saved_value) + ' ' + str(type(saved_value)))
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True
                            #logger.debug('inactive is_updated]: ' + str(is_updated) + ' ' + str(type(is_updated)))

                    else:
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 4. add 'updated' to field_dict'
                    if is_updated:
                        update_dict[field]['updated'] = True
                        save_changes = True
# --- end of for loop ---

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                update_dict['id']['error'] = _('This employee could not be updated.')

# 6. put updated saved values in update_dict
        d.create_employee_dict(instance, update_dict, user_lang)


    return has_error
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def get_lastname_initials(namelast, namefirst, with_space):  # PR2019-08-05
    # get lastname plus initials: Martina K L G
    lastname_initials = ''

    initials = ''
    if namefirst:
        initials = get_initials(namefirst, with_space)

    if namelast:
        lastname_initials = namelast
        if initials:
            lastname_initials = lastname_initials + ' ' + initials
    else:
        if initials:
            lastname_initials = initials

    return lastname_initials

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_lastname_firstfirstname(namelast, namefirst):  # PR2019-08-05
    # get lastname plus first firstname: Martina, Kevin
    lastname_firstfirstname = ''

    firstfirstname = ''
    if namefirst:
        firstfirstname = get_firstfirstname(namefirst)

    if namelast:
        lastname_firstfirstname = namelast
        if firstfirstname:
            lastname_firstfirstname = lastname_firstfirstname + ', ' + firstfirstname
    else:
        if firstfirstname:
            lastname_firstfirstname = firstfirstname

    return lastname_firstfirstname


def get_firstfirstname(firstnames):
    # PR2019-08-05 split first names'
    firstfirstname = ''
    if firstnames:
        arr = firstnames.split()  # If separator is not provided then any white space is a separator.
        firstfirstname = arr[0]
    return firstfirstname


def get_initials(firstnames, with_space):
    #logger.debug(' --- get_initials ---')
    # PR2019-08-05 get first letter of each firstname

    initials = ''
    if firstnames:
        arr = firstnames.split()  # If separator is not provided then any white space is a separator.
        for firstname in arr:
            if initials and with_space:
                initials = initials + ' '
            initial = firstname[0]
            initials = initials + initial.upper()
    #logger.debug('initials: ' + str(initials))
    return initials


def delete_employee_from_teammember(employee, request):
    #logger.debug(' --- delete_employee_from_teammember ---')
    # delete employee from teammember records, update team.code if necessary PR2019-09-15
    # if teammember is absence: teammember will be deleted.
    # else: employee will be removed from teammember
    # Note: don't delete teammember when it is not part of a scheme, is order and stays
    if employee:
        #logger.debug(' --- employee <' + str() + '> has the following teammembers:')
        for teammember in m.Teammember.objects.filter(employee=employee):
# delete teammember if is_absence
            #logger.debug(' --- teammember ' + str(teammember.id) + ' is_absence ' + str(is_absence))
            if teammember.isabsence:
                teammember.delete(request=request)
                #logger.debug(' --- delete_employee_from_ ABSENCE')
            else:
# if not absence: remove employee from teammember
                teammember.employee = None
                teammember.save(request=request)
                #logger.debug(' --- remove employee from teammember')


def create_updated_employee_calendar_list(upload_dict, comp_timezone, user_lang, request):
    #logger.debug('++++++++++++++++++++++ create_updated_order_calendar_list ++++++++++++++++++++++ ')
    # J create updated employee_calendar_list
    datefirst = upload_dict.get('calendar_datefirst')
    datelast = upload_dict.get('calendar_datelast')

    employee_pk = None
    employee_dict = upload_dict.get('employee')
    if employee_dict:
        employee_pk = employee_dict.get('pk')

    update_wrap = {}
    if employee_pk is not None and datefirst is not None and datelast is not None:

 # 8. update scheme_list when changes are made
        filter_dict = {'order_pk': None}
        scheme_list = pld.create_scheme_list(
            filter_dict=filter_dict,
            company=request.user.company,
            comp_timezone=comp_timezone,
            user_lang=user_lang)

        if scheme_list:
            update_wrap['scheme_list'] = scheme_list

        team_list = pld.create_team_list(
            filter_dict=filter_dict,
            company=request.user.company)
        if team_list:
            update_wrap['team_list'] = team_list

        shift_list = pld.create_shift_list(
            filter_dict=filter_dict,
            company=request.user.company,
            user_lang=user_lang)
        if shift_list:
            update_wrap['shift_list'] = shift_list

        teammember_list = d.create_teammember_list(
            filter_dict=filter_dict,
            company=request.user.company,
            user_lang=user_lang)
        if teammember_list:
            update_wrap['teammember_list'] = teammember_list

        schemeitem_list = pld.create_schemeitem_list( filter_dict=filter_dict, company=request.user.company)
        if schemeitem_list:
            update_wrap['schemeitem_list'] = schemeitem_list

    return update_wrap

def create_updated_order_calendar_list(upload_dict, update_wrap, comp_timezone, timeformat, user_lang, request):
    #logger.debug('++++++++++++++++++++++ create_updated_order_calendar_list ++++++++++++++++++++++ ')

    # J create updated ordere_calendar_list
    datefirst_iso = upload_dict.get('calendar_datefirst')
    datelast_iso = upload_dict.get('calendar_datelast')

    order_pk = None
    order_dict = upload_dict.get('order')
    if order_dict:
        order_pk = order_dict.get('pk')

    #logger.debug('order_pk: ' + str(order_pk))
    #logger.debug('datefirst_iso: ' + str(datefirst_iso))
    #logger.debug('datelast_iso: ' + str(datelast_iso))


    if order_pk is not None and datefirst_iso is not None and datelast_iso is not None:
        customer_pk = None
        #logger.debug('mmmmmmmmmmmmmmm calendar_dictlist: ')

        calendar_dictlist = plrf.create_customer_planning(
            datefirst_iso=datefirst_iso,
            datelast_iso=datelast_iso,
            customer_pk=customer_pk,
            order_pk=order_pk,
            comp_timezone=comp_timezone,
            timeformat=timeformat,
            user_lang=user_lang,
            request=request)

        #logger.debug('calendar_dictlist: ' + str(calendar_dictlist))
        if calendar_dictlist:
            update_wrap['customer_calendar_list'] = calendar_dictlist

    # 8. update scheme_list when changes are made
    filter_dict = {'order_pk': order_pk}
    scheme_list = pld.create_scheme_list(
        filter_dict=filter_dict,
        company=request.user.company,
        comp_timezone=comp_timezone,
        user_lang=user_lang)

    if scheme_list:
        update_wrap['scheme_list'] = scheme_list

    team_list = pld.create_team_list(
        filter_dict=filter_dict,
        company=request.user.company)
    if team_list:
        update_wrap['team_list'] = team_list

    shift_list = pld.create_shift_list(
        filter_dict=filter_dict,
        company=request.user.company,
        user_lang=user_lang)
    if shift_list:
        update_wrap['shift_list'] = shift_list

    teammember_list = d.create_teammember_list(
        filter_dict=filter_dict,
        company=request.user.company,
        user_lang=user_lang)
    if teammember_list:
        update_wrap['teammember_list'] = teammember_list

    schemeitem_list = pld.create_schemeitem_list( filter_dict=filter_dict, company=request.user.company)
    if schemeitem_list:
        update_wrap['schemeitem_list'] = schemeitem_list

    # this enables the logger
    logging.disable(logging.NOTSET)
    #logging.debug('logging turned on again')
