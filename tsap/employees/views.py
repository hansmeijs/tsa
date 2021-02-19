# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.db import connection
from django.db.models.functions import Lower
from django.db.models import Q
from django.shortcuts import render
from django.utils.translation import activate, ugettext_lazy as _

from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from datetime import date, time, datetime, timedelta
import pytz
import json
from django.utils.functional import Promise
from django.utils.encoding import force_text
from django.core.serializers.json import DjangoJSONEncoder

from tsap import settings
from tsap import constants as c
from tsap import functions as f
from tsap import validators as v

from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_namelast_namefirst, validate_code_name_identifier, validate_employee_has_emplhours

from accounts.models import Usersetting
from companies import models as m
from companies import dicts as compdicts
from employees.forms import EmployeeAddForm, EmployeeEditForm
from employees import dicts as ed
from customers import dicts as cd
from customers import views as cv
from planning import dicts as pld
from planning import views as plv
from planning import rosterfill as plrf

import math
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
        param = get_headerbar_param(request)
        return render(request, 'employees.html', param)


# === Employee ===================================== PR2020-08-07
@method_decorator([login_required], name='dispatch')
class EmployeeView(View):

    def get(self, request):
        if request.user.company is not None:

# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

        param = {'headerbar_class': settings.HEADER_CLASS}
        return render(request, 'employee.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeUploadView(UpdateView):  # PR2019-07-30

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= EmployeeUploadView ============= ')

        update_wrap = {}
        has_permit = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_planner or request.user.is_perm_hrman)
        if has_permit:
# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict' + str(upload_dict))

# - get id  variables
                employee_pk = f.get_dict_value(upload_dict, ('id', 'pk'))
                is_create = f.get_dict_value(upload_dict, ('id', 'create'), False)
                is_delete = f.get_dict_value(upload_dict, ('id', 'delete'), False)

                employee_rows = []
                append_dict = {}
                error_dict = {}

# A. check if parent exists  (company is parent of employee)
                parent = request.user.company
                if parent:
# C. Delete employee
                    if is_delete:
                        # upload_dict{'id': {'pk': 2772, 'table': 'employee', 'shiftoption': '-', 'delete': True}}
                        employee = m.Employee.objects.get_or_none(id=employee_pk, company=parent)
                        if employee:
                            this_text = _("Employee '%(tbl)s'") % {'tbl': employee.code}
                    # a. check if employee has emplhours, put msg_err in update_dict when error
                            msg_err = validate_employee_has_emplhours(employee)
                            if msg_err:
                                error_dict['err_delete'] = msg_err
                            else:
                    # b. check if there are teammembers with this employee: absence teammembers, remove employee from shift teammembers
                                delete_employee_from_teammember(employee, request)
                    # c. delete employee
                                deleted_ok = m.delete_instance(employee, error_dict, request, this_text)
                                #logger.debug('deleted_ok' + str(deleted_ok))
                                if deleted_ok:
                     # - add deleted_row to absence_rows
                                    employee_rows.append({'pk': employee_pk,
                                                         'mapid': 'employee_' + str(employee_pk),
                                                         'deleted': True})
                                    employee = None
                                #logger.debug('employee_rows' + str(employee_rows))
                    else:
# D. Create new employee
                        if is_create:
                            employee, msg_err = create_employee(upload_dict, request)
                            if employee:
                                append_dict['created'] = True
                            elif msg_err:
                                error_dict['err_create'] = msg_err
# E. Get existing employee
                        else:
                            employee = m.Employee.objects.get_or_none(id=employee_pk, company=parent)

# F. Update employee, also when it is created
                        if employee:
                            update_employee(employee, parent, upload_dict, error_dict, request)

# I. add update_dict to update_wrap
                    if employee:
                        if error_dict:
                            append_dict['error'] = error_dict
                        # new approach: create dict_row PR2020-09-11
                        filter_dict = {'employee_pk': employee.pk}
                        employee_rows = ed.create_employee_rows(
                            request_item=filter_dict,
                            msg_dict=append_dict,
                            request=request)

                update_wrap['updated_employee_rows'] = employee_rows

# - return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class EmployeenoteUploadView(UpdateView):  # PR2021-02-16

    def post(self, request, *args, **kwargs):
        logger.debug(' ')
        logger.debug(' ============= EmployeenoteUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)

# - get iddict variables
                ppk_int = upload_dict.get('ppk')
                is_create = upload_dict.get('create', False)
                note = upload_dict.get('note')

                logger.debug('upload_dict: ' + str(upload_dict))
                logger.debug('ppk_int: ' + str(ppk_int))
                logger.debug('is_create: ' + str(is_create))

# - get parent (employee)
                employee = m.Employee.objects.get_or_none(pk=ppk_int, company=request.user.company)
                if employee:
# - Create new note:
                    if is_create and note:
                        employeenote = m.Employeenote(
                            employee=employee,
                            note=note
                        )
                        employeenote.save(request=request)
# - get employeenote_rows
                        filter_dict = {'employee_pk_list': [employee.pk]}
                        employeenote_rows = ed.create_employeenote_rows(
                            period_dict=filter_dict,
                            request=request)
                        if employeenote_rows:
                            update_wrap['employeenote_updates'] = employeenote_rows
                            logger.debug('employeenote_rows: ' + str(employeenote_rows))
# 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))
# - end of EmployeenoteUploadView


@method_decorator([login_required], name='dispatch')
class TeammemberUploadView(UpdateView):  # PR2019-12-06 PR2021-01-03
    # this function is called bij employee.js, customer.js and scheme.js
    def post(self, request, *args, **kwargs):
        logger.debug('  ')
        logger.debug(' ===================== TeammemberUploadView ===================== ')

        update_wrap = {}
        # <PERMIT> PR2020-11-10
        #  - supervisor, planner and hr_man can add / edit / delete absence

        has_permit = False
        has_permit_absence = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_planner or request.user.is_perm_hrman)
            has_permit_absence = (has_permit or request.user.is_perm_supervisor)

# - Reset language
        # PR2019-03-15 Debug: language gets lost, get request.user.lang again
        user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
        activate(user_lang)

# - get comp_timezone and timeformat and interval
        comp_timezone = request.user.company.timezone if request.user.company.timezone else settings.TIME_ZONE
        timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
        interval = request.user.company.interval if request.user.company.interval else 15

# - get upload_dict from request.POST
        upload_json = request.POST.get("upload")
        if upload_json:
            upload_dict = json.loads(upload_json)
            logger.debug('upload_dict: ' + str(upload_dict))

# upload_dict: upload_dict: {'shiftoption': 'grid_shift', 'mode': 'update',
            # 'shift': { 'mode': 'update', 'isabsence': False
            #           'id': 5, 's_id': 2, 'code': '09.00 - 17.00', 'offsetstart': 540, 'offsetend': 1020,
            #           'breakduration': 240, 'timeduration': 240, 'isrestshift': False}}


# - save quicksave
            # quicksave is saved in UploadUserSettings

# - get shiftoption
            # mode = f.get_dict_value(upload_dict, ('id','mode'))
            shift_option = upload_dict.get('shiftoption')
            #logger.debug('shift_option: ' + str(shift_option))

            # key 'mode' is used in calendar_employee_upload etc .
            # from customer_calendar shiftoption': 'schemeshift'
            # from employee calendar : mode: "create" shiftoption: "isabsence"
            # from planning: shiftoption: "grid_team"

            if shift_option == 'isabsence' and has_permit_absence:
                update_wrap['updated_absence_rows'] = absence_upload(request, upload_dict, user_lang)

            elif shift_option == 'schemeshift' and has_permit:
                # 'table' has no value in mode 'schemeshift'

                calendar_dictlist, logfile = calendar_employee_upload(shift_option, request, upload_dict, comp_timezone, timeformat, user_lang)
                if calendar_dictlist:
                    update_wrap['employee_calendar_list'] = calendar_dictlist
                if logfile:
                    update_wrap['logfile'] = logfile

                create_updated_order_calendar_list(upload_dict, update_wrap, comp_timezone, timeformat, user_lang, request)

            elif shift_option == 'grid_team' and has_permit:
                update_wrap = grid_team_upload(request, upload_dict, comp_timezone, timeformat, user_lang)

            elif shift_option == 'grid_shift' and has_permit:
                update_wrap = grid_shift_upload(request, upload_dict, user_lang)

            elif has_permit:
                # TODO change to shift_option
                table = f.get_dict_value(upload_dict, ('id','table'), '')
                #logger.debug('table: ' + str(table))
                if table == 'teammember':
                    update_dict = teammember_upload(request, upload_dict, user_lang)
                    update_wrap['teammember_update'] = update_dict

            if shift_option == 'schemeshift':
                # get saved calendar_period_dict
                period_dict = {'get': True}
                calendar_period_dict = pld.period_get_and_save('calendar_period', period_dict,
                                                             comp_timezone, timeformat, interval, user_lang, request)

                datefirst_iso = calendar_period_dict.get('rosterdatefirst')
                datelast_iso = calendar_period_dict.get('rosterdatelast')
                #logger.debug('datefirst_iso: ' + str(datefirst_iso))
                #logger.debug('datelast_iso: ' + str(datelast_iso))


# - return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


def grid_team_upload(request, upload_dict, comp_timezone, timeformat, user_lang): # PR2019-12-06
    logger.debug('============= grid_team_upload ============= ')
    # this function is called by TeammemberUploadView shift_option 'grid_team'

    """
    add tm with employee:
        upload_dict: {'id': {'shiftoption': 'grid_team'}, 
        'team': {'id': {'pk': '2755', 'ppk': 2206, 'table': 'team'}}, 
        'teammembers_list': [{'id': {'pk': 'new12', 'ppk': '2755', 'table': 'teammember', 'mode': 'create'}, 
                               'employee': {'pk': 2625, 'ppk': 3, 'code': 'Agata MM', 'update': True}}
                            ]}
                      
    add tm with employee and datefirst:      
          upload_dict: {'id': {'shiftoption': 'grid_team'}, 
          'team': {'id': {'pk': '2755', 'ppk': 2206, 'table': 'team'}}, 
          'teammembers_list': [ {'id': {'pk': 'new15', 'ppk': '2755', 'table': 'teammember', 'mode': 'update'}, 
                                      'employee': {'pk': 2617, 'ppk': 3, 'code': 'Bakhuis RDJ', 'update': True}, 
                                      'datefirst': {'value': '2020-10-24', 'update': True}}
          ]}                  
                            
                   i         
    upload_dict: {'id': {'shiftoption': 'grid_team'}, 
                'team': {'id': {'pk': '2755', 'ppk': 2206, 'table': 'team'}}, 
                'teammembers_list': [{'id': {'pk': 'new3', 'ppk': '2755', 'table': 'teammember', 'mode': 'update'}, 
                'employee': {'pk': 2617, 'ppk': 3, 'code': 'Bakhuis RDJ', 'update': True}, 
                'datefirst': {'value': '2020-10-21', 'update': True}}]}
    2021-01-05          
    upload_dict: {'shiftoption': 'grid_team', 
                'team': {'mode': 'create', 'id': 'new2', 's_id': 2, 'values_changed': True, 'code': 'Ploeg B'},
                 'teammembers_list': [{'id': {'pk': 'new3', 'ppk': 'new2', 'table': 'teammember', 'mode': 'create'}}]}
    """

    update_wrap = {}
    msg_dict = {}
# ++++++++++++++++  update team from upload_dict ++++++++++++++++
    upload_team_dict = upload_dict.get('team')
    #logger.debug('upload_team_dict: ' + str(upload_team_dict))

# - get scheme
    scheme_pk = upload_team_dict.get('s_id')
    scheme = m.Scheme.objects.get_or_none(id=scheme_pk, order__customer__company=request.user.company)

# - get or create team, map team_pk = 'new2' to new team_pk
    team, mapped_teampk_dict, msg_dict = update_instance_from_upload_dict('team', upload_team_dict, scheme, user_lang, request)
    logger.debug('team: ' + str(team) )
    logger.debug(' mapped_teampk_dict: ' + str(mapped_teampk_dict))
    logger.debug(' >>>>>>>>>>>>>>> upload_team_dict: ' + str(upload_team_dict))

    if team is None:
        # team is deleted when team is None. Msg_dict contains: {pk: -- mapid: --  deleted: True}
        team_update = msg_dict
        #logger.debug('........... team is None - team_update: ' + str(team_update))
        update_wrap['team_update_list'] = [team_update]
    else:
        # PR2021-01-05 was: team_update = pld.create_team_dict(team, upload_team_dict)
        filter_dict = {'team_pk': team.pk}
        team_rows = pld.create_team_rows(filter_dict=filter_dict, company=request.user.company)
        team_row = team_rows[0] if team_rows else None

        if team_row and msg_dict:
            team_row.update(msg_dict)

        update_wrap['team_update_list'] = [team_row]

        logger.debug('........................ : ')

# ++++++++++++++++  update teammember from upload_dict ++++++++++++++++
        teammembers_list = upload_dict.get('teammembers_list')

        logger.debug('teammembers_list: ' + str(teammembers_list))
        if teammembers_list:
            for upload_teammember_dict in teammembers_list:
    # - create, delet and update teammember
                teammember, mapped_teammemberpk_dict, msg_dict = update_instance_from_upload_dict('teammember', upload_teammember_dict, team, user_lang, request)

                logger.debug('teammember: ' + str(teammember))
                logger.debug('mapped_teammemberpk_dict: ' + str(mapped_teammemberpk_dict))

    # - return teammemberrow
                if teammember is None:
                    # teammember is deleted when teammember is None. Msg_dict contains: {pk: -- mapid: --  deleted: True}
                    if msg_dict:
                        if 'teammember_update_list' not in update_wrap:
                            update_wrap['teammember_update_list'] = [msg_dict]
                        else:
                            update_wrap['teammember_update_list'].append(msg_dict)

                else:
                    # PR2021-01-05 was: team_update = pld.create_team_dict(team, upload_team_dict)
                    filter_dict = {'teammember_pk': teammember.pk}
                    teammember_list, teammember_rows = ed.ed_create_teammember_list(
                        filter_dict=filter_dict, company=request.user.company, user_lang=user_lang)
                    teammember_row = teammember_rows[0] if teammember_rows else None

                    if teammember_row and msg_dict:
                        teammember_row.update(msg_dict)

                    if 'teammember_update_list' not in update_wrap:
                        update_wrap['teammember_update_list'] = [teammember_row]
                    else:
                        update_wrap['teammember_update_list'].append(teammember_row)

            #teammember_updates = update_teammembers_from_uploaddict(
            #    teammembers_list=teammembers_list,
            #     mapped_teampks=mapped_teampk_dict,
            #    user_lang=user_lang,
            #    request=request)

            #if teammember_updates:
            #    updates['teammember_update_list'] = teammember_updates
    return update_wrap


def grid_shift_upload(request, upload_dict, user_lang): # PR2019-12-06 PR2021-01-03
    logger.debug(' -------------- grid_shift_upload ----------------')
    logger.debug('upload_dict: ' + str(upload_dict))
    # this function is called by TeammemberUploadView shift_option 'grid_shift'

    updates = {}
# ++++++++++++++++  update shift from upload_dict ++++++++++++++++
    upload_shift_dict = upload_dict.get('shift')
    #logger.debug('upload_shift_dict: ' + str(upload_shift_dict))

# upload_dict: {shift: {'id': 5, 's_id': 2, 'code': '09.00 - 17.00', 'offsetstart': 540, 'offsetend': 1020,
    # 'breakduration': 240, 'timeduration': 240, 'isrestshift': False} }

# PR2021-01-09
# upload_dict: {shift: { id: 62, mapid: "shift_62", mode: "delete", rowid: "gridrow_shift_62", s_id: 8, table: "shift"} }

    scheme_pk = upload_shift_dict.get('s_id')
    scheme = m.Scheme.objects.get_or_none(id=scheme_pk, order__customer__company=request.user.company)

    shift, mapped_shiftpk_dict, msg_dict = \
        update_instance_from_upload_dict('shift', upload_shift_dict, scheme, user_lang, request)

    logger.debug('........... shift: ' + str(shift))
    logger.debug('........... mapped_shiftpk_dict: ' + str(mapped_shiftpk_dict))
    logger.debug('........... msg_dict: ' + str(msg_dict))

    if shift is None:
# - shift is deleted:
        # shift is deleted when shift is None. msg_dict contains: {pk: -- mapid: --  deleted: True}
        logger.debug('........... shift is deleted > shift_update: ' + str(msg_dict))
        if msg_dict:
            updates['shift_update_list'] = [msg_dict]

# - shift is created or updated:
    else:
        # PR2021-01-04 was: shift_update = pld.create_shift_dict(shift, upload_shift_dict, user_lang)
        filter_dict = {'shift_pk': shift.pk}
        shift_rows = pld.create_shift_rows(filter_dict=filter_dict, company=request.user.company)
        shift_row = shift_rows[0] if shift_rows else None

        updates['shift_update_list'] = [shift_row]

    logger.debug('........... updates: ' + str(updates))
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
        # 'scheme': {'id': {'pk': 1563, 'ppk': 1372, 'table': 'scheme', }, 'cycle': {'value': 7}},
        # 'shift': {'id': {'pk': 528, 'ppk': 1563, 'table': 'shift'}},
        # 'schemeitem': {'id': {'pk': 1528, 'ppk': 1563, 'table': 'schemeitem'}}, 'team': {'id': {'pk': 1919, 'ppk': 1563, 'table': 'team'}}}

    # upload_dict: {
        #  {'id': {'mode': 'schemeshift'},
        #  'rosterdate': '2020-01-07',
        #  'calendar_datefirst': '2020-01-06', 'calendar_datelast': '2020-01-12',
        #  'weekday_index': 2,
        #  'weekday_list': ['-', '-', 'update1658,2017,578,1657,2018,579', '-', '-', '-', '-', '-'],
        #  'teammember_list': [], 'order': {'id': {'pk': 1370, 'ppk': 648, 'table': 'order'}, 'code': {'value': 'Rooi Katootje'}}, 'scheme': {'pk': 1607, 'id': {'pk': 1607, 'ppk': 1370, 'table': 'scheme'}, 'billable': {'override': False, 'billable': False}, 'cat': {'value': 0}, 'code': {'value': 'Schema 1'}, 'cycle': {'value': 7}, 'excludepublicholiday': {'value': True}},
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
                    #isdefaultweekshift=True
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
                    scheme_has_changed = plv.update_scheme(scheme, scheme_dict, update_dict, request)

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
        # if current shift has changed it will be updated in plv.update_shift_instance when 'update' in field_dict
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
                plv.update_shift_instance(shift, scheme, shift_dict, update_dict, user_lang, request)

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

    team_list = pld.create_team_rows(
        filter_dict=filter_dict,
        company=request.user.company)
    if team_list:
        update_wrap['team_list'] = team_list

    shift_rows = pld.create_shift_rows(
        filter_dict=filter_dict,
        company=request.user.company)
    if shift_rows:
        update_wrap['shift_rows'] = shift_rows

    teammember_list = ed.ed_create_teammember_list(
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

    logging.debug('logging turned on again')
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
    #logger.debug(' ')
    #logger.debug('============= calendar_employee_upload ============= ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    # this function is called by TeammemberUploadView option 'isabsence', 'schemeshift'

    calendar_dictlist = []
    logfile = []

# - get employee - employee is required in 'isabsence'
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
    if shift_option == 'isabsence':
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
    datefirst_iso = upload_dict.get('calendar_datefirst')
    datelast_iso = upload_dict.get('calendar_datelast')
    #logger.debug('datefirst: ' + str(datefirst) + ' ' + str(type(datefirst)))
    #logger.debug('datelast: ' + str(datelast) + ' ' + str(type(datelast)))
    #logger.debug('employee_pk: ' + str(employee_pk) + ' ' + str(type(employee_pk)))

    if employee_pk is not None and datefirst_iso is not None and datelast_iso is not None:
        #logger.debug('employee_pk is not None and datefirst is not None and datelast is not None: ')
        customer_id, order_id = None, None
        add_shifts_without_employee = False
        skip_restshifts = False
        orderby_rosterdate_customer = False
        functioncode_pk = None
        paydatecode_pk = None
        calendar_dictlist, short_list, logfile = \
            plrf.create_employee_planning(
                datefirst_iso=datefirst_iso,
                datelast_iso=datelast_iso,
                customer_pk=customer_id,
                order_pk=order_id,
                employee_pk=employee_pk,
                functioncode_pk=functioncode_pk,
                paydatecode_pk=paydatecode_pk,
                add_shifts_without_employee=add_shifts_without_employee,
                skip_absence_and_restshifts=skip_restshifts,
                orderby_rosterdate_customer=orderby_rosterdate_customer,
                comp_timezone = comp_timezone,
                timeformat = timeformat,
                user_lang = user_lang,
                request = request)

        #logger.debug('calendar_dictlist: ' + str(calendar_dictlist))

    # J. return calendar_dictlist
    return calendar_dictlist, logfile


def update_scheme_shift_team_tm_si(upload_dict, user_lang, request): # PR2020-04-06
    #logger.debug(' ')
    #logger.debug('=========== update_scheme_shift_team_tm_si ==========  ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    # this function is called by TeammemberUploadView option 'isabsence', 'schemeshift'

# - get order - order is required
    order = None
    order_pk = f.get_dict_value(upload_dict, ('order', 'pk'))
    if order_pk:
        order = m.Order.objects.get_or_none(
            customer__company=request.user.company,
            pk=order_pk
        )
    #logger.debug('order: ' + str(order))

    if order:
# - update scheme from upload_dict
        # only one scheme is used, mapped_schemepk_dict is necessary when it is a new scheme
        scheme_dict = upload_dict.get('scheme')
        scheme, mapped_schemepk_dict, msg_dictNIU = update_instance_from_upload_dict('scheme', scheme_dict, order, user_lang, request)
        #logger.debug('scheme: ' + str(scheme))

        if scheme:
# - update shifts from upload_dict
            shifts_list = upload_dict.get('shifts_list')
            mapped_shiftpk_dict = update_shifts_from_uploaddict(shifts_list, mapped_schemepk_dict, scheme, user_lang, request)
            #logger.debug('mapped_shiftpk_dict: ' + str(mapped_shiftpk_dict))

# - update teams from upload_dict
            teams_list = upload_dict.get('teams_list')
            #logger.debug('teams_list: ' + str(teams_list))
            mapped_teampk_dict = update_teams_from_uploaddict(teams_list, mapped_schemepk_dict, scheme, user_lang, request)
            #logger.debug('mapped_teampk_dict: ' + str(mapped_teampk_dict))

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

            instance, mapped_pk, msg_dictNIU = update_instance_from_upload_dict(table, shift_dict, scheme, user_lang, request)
            # update adds dict 'mapped_pk' to dict 'mapped_pk_dict'
            mapped_pk_dict.update(mapped_pk)
    return mapped_pk_dict


def update_teams_from_uploaddict (teams_list, mapped_schemepk_dict, scheme, user_lang, request):
    #logger.debug(' ')
    #logger.debug('++++++++++++++++  update_teams_from_uploaddict ++++++++++++++++ ')

    mapped_pk_dict = {}
    if teams_list:
        table = 'team'
        for team_dict in teams_list:
            #logger.debug('team_dict: ' + str(team_dict))

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

            instance, mapped_pk, msg_dictNIU = update_instance_from_upload_dict(table, team_dict, scheme, user_lang, request)
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
                    teammember, mapped_dict_NIU, msg_dictNIU = update_instance_from_upload_dict(table, item_dict, team, user_lang, request)

    # return teammember_dict when row is updated, created or deleted
                    teammember_update = ed.create_teammember_dict_from_model(teammember, item_dict)
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

            instance, mapped_pk_dictNIU, msg_dict = update_instance_from_upload_dict(table, item_dict, parent, user_lang, request)
# === end of update_schemeitems_from_list


def update_instance_from_upload_dict (table, upload_dict, parent, user_lang, request):  # PR2021-01-04
    #logging.disable(logging.CRITICAL)  # logging.CRITICAL disables logging calls with levels <= CRITICAL
    #logging.disable(logging.NOTSET)  # logging.NOTSET re-enables logging
    logger.debug('----------------  update_instance_from_upload_dict items_dict ------------------ ')
    logger.debug('table: ' + str(table))
    logger.debug('parent: ' + str(parent) + ' ' + str(type(parent)))
    logger.debug('upload_dict: ' + str(upload_dict))

    # upload_dict: {'id': {'pk': 'new9', 'ppk': '1424', 'table': 'scheme', 'mode': 'create', 'shiftoption': 'isabsence', 'cycle': 1},
    #       'code': 'Colpa de WH', 'datefirst': '2020-02-05', 'datelast': '2020-02-07', 'excludepublicholiday': False, 'excludecompanyholiday': False}

# upload_dict: {'id': 5, 's_id': 2, 'code': '09.00 - 17.00', 'offsetstart': 540, 'offsetend': 1020,
    # 'breakduration': 240, 'timeduration': 240, 'isrestshift': False}

    instance = None
    mapped_pk_dict = {}
    msg_dict = {}
    if upload_dict:
        # only mode 'create' and 'delete' are used in this function.
        # tag 'update' is not used in this function, instead it detects changed values
        mode = None
        if 'mode' in upload_dict:
            mode = upload_dict.pop('mode')
        is_absence = upload_dict.get('isabsence', False)

        upload_pk = None
        if 'id' in upload_dict:
            upload_pk = upload_dict.get('id')
        elif 'pk' in upload_dict:
            upload_pk = upload_dict.get('pk')

        logger.debug('mode: ' + str(mode))
        logger.debug('upload_pk: ' + str(upload_pk))
        logger.debug('is_absence: ' + str(is_absence))

        # TODO onpublicholiday
        divergent_onpublicholiday = False
        on_publicholiday = False

        is_created, is_deleted, is_updated = False, False, False

# - create new instance
        if mode == 'create':
            if table == 'scheme':
                # when absence cycle = 1, when singleshift cycle = 7
                cycle = f.get_dict_value(upload_dict, ('cycle', 'value'), 7)
                code = f.get_dict_value(upload_dict, ('code', 'value'), c.SCHEME_TEXT[user_lang])
                instance = m.Scheme(order=parent,
                                    code=code,
                                    cycle=cycle,
                                    divergentonpublicholiday=divergent_onpublicholiday,
                                    isabsence=is_absence)
            if table == 'shift':
                # code = upload_dict.get('code', c.SHIFT_TEXT[user_lang])
                code = upload_dict.get('code', str(_('Shift')))
                instance = m.Shift(scheme=parent,
                                   code=code)
            elif table == 'team':
                code = upload_dict.get('code', str(_('Team')))
                instance = m.Team(scheme=parent,
                                  code=code,
                                  isabsence=is_absence)
            elif table == 'teammember':
                instance = m.Teammember(team=parent,
                                        isabsence=is_absence)
            elif table == 'schemeitem':
                rosterdate = f.get_dict_value(upload_dict, ('rosterdate', 'value'))
                #logger.debug('parent: ' + str(parent) + ' ' + str(type(parent)))
                #logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
                #logger.debug('is_absence: ' + str(is_absence) + ' ' + str(type(is_absence)))
                if rosterdate:
                    instance = m.Schemeitem(scheme=parent,
                                            rosterdate=rosterdate,
                                            onpublicholiday=on_publicholiday,
                                            isabsence=is_absence,
                                            inactive=False,
                                            )
            logger.debug('instance: <' + str(instance) + '> type: ' + str(type(instance)))

            if instance:
                instance.save(request=request)
                mapped_pk_dict[upload_pk] = instance.pk
                msg_dict['created'] = True

                is_created = True
                logger.debug('instance is_created: ' + str(is_created))

# - get existing instance
        elif upload_pk:
            if table == 'scheme':
                instance = m.Scheme.objects.get_or_none(pk=upload_pk,
                    order__customer__company=request.user.company)
            if table == 'shift':
                instance = m.Shift.objects.get_or_none(pk=upload_pk,
                    scheme__order__customer__company=request.user.company)
            elif table == 'team':
                instance = m.Team.objects.get_or_none(pk=upload_pk,
                    scheme__order__customer__company=request.user.company)
            elif table == 'teammember':
                instance = m.Teammember.objects.get_or_none(pk=upload_pk,
                    team__scheme__order__customer__company=request.user.company)
            elif table == 'schemeitem':
                instance = m.Schemeitem.objects.get_or_none(pk=upload_pk,
                    scheme__order__customer__company=request.user.company)
            logger.debug('existing instance: ' + str(instance) + ' ' + str(type(instance)))

# - delete instance, check if there are schemeitems_tobe_deleted
            # note: this is not necessary for teammembers when team is deleted beacuse of cascade delete
            if instance and mode == 'delete':
                if table == 'shift':
    # - if shift: also delete ecisting schemeitems of shift
                    has_schemeitems_tobe_deleted = m.Schemeitem.objects.filter(scheme=parent, shift=instance).exists()
                    if has_schemeitems_tobe_deleted:
                        m.Schemeitem.objects.filter(scheme=parent, shift=instance).delete()

                instance.delete()  # PR2021-01-06 request not needed on delete Was: instance.delete(request=request)
                instance = None
                is_deleted = True

        # - create deleted_row
                msg_dict = {'pk': upload_pk,
                               'mapid': table + '_' + str(upload_pk),
                               'deleted': True}

                logger.debug('instance is_deleted: ' + str(is_deleted))

# - upate new and existing instance, not when mode = delete or None
        if instance and mode in ('create', 'update'):
            logger.debug('upate new and existing instance: ')
            # loop through fields in upload_dict.
            # Fields in upload_dict are updated or not updated, check if new_vale != old_value
            # therefore no need for 'update=true' in dict

    # - change parent - only when absence and table = scheme: order changes when changing abscat
            if is_absence and  table == 'scheme':
                new_order_pk = f.get_dict_value(upload_dict, ('id', 'ppk'))
                #logger.debug('new_order_pk: ' + str(new_order_pk))
                if new_order_pk and new_order_pk != parent.pk:
                    new_order = m.Order.objects.get_or_none(pk=new_order_pk,
                                    customer__company=request.user.company)
                    #logger.debug('new_order: ' + str(new_order))
                    if new_order:
                        instance.order = new_order
                        is_updated = True

            logger.debug('upload_dict: ' + str(upload_dict))
            for field, value in upload_dict.items():
                # field 'rosterdate' only occurs in table 'schemeitem' and cannot be changed in this function
                # field 'scheme' occurs in table 'shift', 'team' and 'schemeitem', it cannot be changed

                if field in ('team', 'shift'):
                    old_value = getattr(instance, field)
                    new_value = None

                    logger.debug('field: ' + str(field) + ' value: ' + str(value))
                    logger.debug('old_value: ' + str(old_value))

                    pk_int = value
                    logger.debug('pk_int: ' + str(pk_int))
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

                    logger.debug('new_value: ' + str(new_value))
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                elif field in ('employee', 'replacement'):
                    old_value = getattr(instance, field)
                    logger.debug('field: ' + str(field) + ' value: ' + str(value))
                    logger.debug('old_value: ' + str(old_value))

                    pk_int = value.get('pk')
                    logger.debug('pk_int: ' + str(pk_int))
                    new_value = m.Employee.objects.get_or_none(
                        pk=pk_int,
                        company=request.user.company)
                    logger.debug('new_value: ' + str(new_value) + ' ' + str(type(new_value)))
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True
                        logger.debug('is_updated: ' + str(is_updated))

                elif field == 'code':
                    old_value = getattr(instance, field)
                    if value:
                        new_value = value
                    else:
                        new_value = f.get_code_with_sequence(table, parent, user_lang)
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                elif field == 'cycle':
                    old_value = getattr(instance, field)
                    new_value = value if value else 7
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                elif field in ('datefirst', 'datelast'):
                    old_value = getattr(instance, field)
                    new_value_iso = value
                    # was: new_value = f.get_dateobj_from_dateISOstring(new_value_iso)
                    new_value = f.get_date_from_ISO(new_value_iso)
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                elif field in ('offsetstart', 'offsetend'):
                    old_value = getattr(instance, field)
                    new_value = value
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                elif field in ('breakduration', 'timeduration'):
                    old_value = getattr(instance, field)
                    # note: timeduration is calculated in page js.
                    new_value = value if value else 0
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                elif field in ('excludepublicholiday', 'divergentonpublicholiday', 'excludecompanyholiday', 'onpublicholiday', 'isrestshift', 'inactive'):
                    old_value = getattr(instance, field)
                    new_value = value if value else False
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                elif field in ('wagefactorcode', 'wagefactoronsat', 'wagefactoronsun', 'wagefactoronph'):
                    old_value = getattr(instance, field)
                    logger.debug('old_value: ' + str(old_value))
                    logger.debug('value: ' + str(value))
                    new_value = m.Wagecode.objects.get_or_none(pk= value, key='wfc')
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

                    logger.debug('new_value: ' + str(new_value))

                # TODO add table if applicable
                elif table in ('addtable_if_applicable',) and field == 'isabsence':
                    old_value = getattr(instance, field)
                    new_value = value if value else False
                    if new_value != old_value:
                        setattr(instance, field, new_value)
                        is_updated = True

# - save changes when is_updated
            if is_updated:
                instance.save(request=request)
                if not is_created and not is_deleted:
                    msg_dict['updated'] = True

# - when teammember: also update modifiedby in team, to show in grid_team modal MGT form
                if table == 'teammember':
                    team = instance.team
                    logger.debug('-----> team : ' + str(team))
                    if team:
                        team.save(request=request)

    #  ++++++++++++++++  end update_from_teamsdict ++++++++++++++++
    return instance, mapped_pk_dict, msg_dict

#######################################

def absence_upload(request, upload_dict, user_lang): # PR2019-12-13 PR2020-08-28  PR2020-10-10
    logger.debug(' --- absence_upload ---')
    logger.debug('upload_dict: ' + str(upload_dict))

    # upload_dict: {'shiftoption': 'isabsence', 'mode': 'create', 'teammember_pk': None,
    #                   'order': {'pk': 13, 'ppk': 4, 'code': 'Vakantie', 'update': True},
    #                   'datefirst': {'value': '2021-01-01', 'update': True},
    #                   'datelast': {'value': '2021-01-08', 'update': True},
    #                   'offsetstart': {'value': 480, 'update': True},
    #                   'offsetend': {'value': 1020, 'update': True},
    #                   'breakduration': {'value': 60, 'update': True},
    #                   'timeduration': {'value': 480, 'update': True},
    #                   'employee': {'pk': 1, 'ppk': 8, 'update': True},
    #                   'replacement': {'pk': 3, 'ppk': 8, 'update': True}}

    absence_rows = []
    msg_dict = {}

    # if data_has_changed in shift or scheme, also update modifiedby / at in teammember, to show latest update in 'Last modifeid' PR2021-01-06
    data_has_changed = False

# - get id  variables
    teammember_pk = upload_dict.get('teammember_pk')
    mode = upload_dict.get('mode')
    is_create = (mode == 'create')
    is_delete = (mode == 'delete')

# +++  Delete teammember and its team, scheme, shifts and schemeitems
    if is_delete:
        teammember = m.Teammember.objects.get_or_none(
            id=teammember_pk,
            team__scheme__order__customer__company=request.user.company)
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

                    # teammember, team, shift and schemeitem all have 'on_delete=CASCADE'
                    # therefore deleting scheme also deletes the other records
                    deleted_ok = m.delete_instance(scheme, msg_dict, request, this_text)
    # - add deleted_row to absence_rows
                    if deleted_ok:
                        absence_rows.append( {'pk': teammember_pk,
                                                'mapid': 'absence_' + str(teammember_pk),
                                                'deleted': True} )
    else:
# +++  when create or update:

# - before creating a new abense scheme you need to know the absence cat (= order), therefore get abscat here
# - get absence category info from order: new_order_pk
        new_order = None
        new_order_pk = upload_dict.get('order_pk')
        if new_order_pk:
            new_order = m.Order.objects.get_or_none(
                id=new_order_pk,
                customer__company=request.user.company
            )

# +++  create :if is_create: create new scheme, shift, team, teammember and schemeitem
        if is_create:
        # - also employee is required
            employee_pk = upload_dict.get('employee_pk')
            scheme, shift, team, teammember, schemeitem = create_absence_item(new_order, employee_pk, request, msg_dict)

# +++  or get existing teammember
        else:
            scheme, shift, team, teammember, schemeitem = get_absence_item(teammember_pk, request)

        logger.debug('teammember: ' + str(teammember))
        if teammember is not None:
# - update changes in scheme.
            scheme_has_changed = False
# - upate order in scheme if it has changed
            if new_order and new_order != scheme.order:
                setattr(scheme, 'order', new_order)
                scheme_has_changed = True

# - upate datefirst and  datelast in table 'scheme'
            datefirst_iso = upload_dict.get('datefirst')
            if datefirst_iso:
                new_datefirst_dte = f.get_date_from_ISO(datefirst_iso)
                if new_datefirst_dte != scheme.datefirst:
                    setattr(scheme, 'datefirst', new_datefirst_dte)
                    scheme_has_changed = True

            datelast_iso = upload_dict.get('datelast')
            if datelast_iso:
                new_datelast_dte = f.get_date_from_ISO(datelast_iso)
                if new_datelast_dte != scheme.datelast:
                    setattr(scheme, 'datelast', new_datelast_dte)
                    scheme_has_changed = True
# - fields excludecompanyholiday, divergentonpublicholiday, excludepublicholiday in table 'scheme' are not in use when absence
# - fields nopay, nohoursonsaturday, nohoursonsunday, nohoursonpublicholiday in table 'scheme' are not in use yet
            if scheme_has_changed:
                scheme.save(request=request)
                data_has_changed = True

# - update changes in shift.
            shift_has_changed = False
# - get offset_start, offset_end, time_duration
            if shift is not None:
            # offsetstart can have value None when value is deleted. Therefore check if key exists
                for field in ('offsetstart', 'offsetend', 'breakduration', 'timeduration'):
                    if field in upload_dict:
                        new_value = upload_dict.get(field)
                        if new_value is None and field in ('breakduration', 'timeduration'):
                            new_value = 0
                        old_value = getattr(shift, field)
                        if new_value != old_value:
                            setattr(shift, field, new_value)
                            shift_has_changed = True
                if shift_has_changed:
                    shift.save(request=request)
                    data_has_changed = True

# - update changes in teammember.
# - get replacement employee - added PR2020-10-10
            # new_replacement can have value None when value is deleted. Therefore check if key exists
            if 'replacement_pk' in upload_dict:
                new_replacement = None
                new_replacement_pk = upload_dict.get('replacement_pk')
                logger.debug('new_replacement_pk: ' + str(new_replacement_pk))
                old_replacement = getattr(teammember, 'replacement')
                if new_replacement_pk:
                    new_replacement = m.Employee.objects.get_or_none(
                        pk=new_replacement_pk,
                        company=request.user.company)
                logger.debug('new_replacement: ' + str(new_replacement))
                logger.debug('old_replacement: ' + str(old_replacement))
                if new_replacement != old_replacement:
                    setattr(teammember, 'replacement', new_replacement)
                    data_has_changed = True
                logger.debug('data_has_changed: ' + str(data_has_changed))

# - save teammember, also when other tables are updated.
        # this is done to update modifiedby and modifiedat in teammember, those will be displayed in modal absence form
            if data_has_changed:
                teammember.save(request=request)

# update schemeitem not necessary - no fields are changed in schemeitem

# f. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
        absence_rows = ed.create_absence_rows(
            filter_dict={},
            teammember_pk=teammember.pk,
            msg_dict=msg_dict,
            request=request)

# J. return update_dict
    return absence_rows
# --- end of absence_upload


def create_absence_item(order, employee_pk, request, msg_dict): # PR2021-01-06
    # function creates a new absence scheme, shift, team, teammember and schemeitem

    scheme, shift, team, teammember, schemeitem = None, None, None, None, None

# - absence category = order
    if order is not None:
# - get employee  - employee is required
        if employee_pk:
            employee = m.Employee.objects.get_or_none(
                pk=employee_pk,
                company=request.user.company)
            if employee is not None:
# - create new absence scheme with cycle = 1
                # NOTE: do not set excludepublicholiday=True etc , set timeduration=0 instead PR2020-04-26
                scheme_code = employee.code if employee.code else _('Absence scheme')
                cycle_one = 1
                scheme = m.Scheme(
                    order=order,
                    code=scheme_code,
                    isabsence=True,
                    cycle=cycle_one,
                    #datefirst=datefirst_dte,
                    #datelast=datelast_dte,
                    #nopay=nopay,
                    #nohoursonsaturday=nohoursonsaturday,
                    #nohoursonsunday=nohoursonsunday,
                    #nohoursonpublicholiday=nohoursonpublicholiday
                    )
                scheme.save(request=request)
                if scheme is not None:
# - create new shift
                    # TODO upload shifts_list with code, timestart-end duration
                    shift = m.Shift(
                        scheme=scheme,
                        code='-',
                        isrestshift=False,
                        istemplate=False,
                        #offsetstart=offset_start,
                        #offsetend=offset_end,
                        #breakduration=break_duration,
                        #timeduration=time_duration
                    )
                    shift.save(request=request)
# - create new team
                    team_code = employee.code if employee.code else _('Absence team')
                    team = m.Team(
                        scheme=scheme,
                        code=team_code,
                        isabsence=True)
                    team.save(request=request)
# - create new teammember
                    # datefirst is saved in scheme, not in teammember
                    teammember = m.Teammember(
                        team=team,
                        employee=employee,
                        #replacement=replacement,
                        isabsence=True)
                    teammember.save(request=request)
                    if teammember:
                        msg_dict['created'] = True
# - create new schemeitem
                    # create only one schemeitem
                    # get the monday date of this week
                    this_date = date.today()
                    # add schemeitem for each day of the week, except for weekends (isoweekday = 6 or 7)
                    schemeitem = m.Schemeitem(
                        scheme=scheme,
                        shift=shift,
                        team=team,
                        rosterdate=this_date,
                        isabsence=True
                    )
                    schemeitem.save(request=request)
                    # logger.debug('schemeitem rosterdate: ' + str(schemeitem.rosterdate))

    return scheme, shift, team, teammember, schemeitem
# --- end of create_absence


def get_absence_item(teammember_pk, request):  # PR2021-01-06
    # function creates a new absence scheme, shift, team, teammember and schemeitem

    scheme, shift, team, teammember, schemeitem = None, None, None, None, None

# - get teammember
    teammember = m.Teammember.objects.get_or_none(
        id=teammember_pk,
        team__scheme__order__customer__company=request.user.company)
    if teammember:
# - get team
        team = teammember.team
        if team is not None:
# - get scheme
            scheme = team.scheme
            if scheme is not None:
# - get shift - absence can only have one shift: get the latest if multiple are found
                shift = m.Shift.objects.filter(scheme=scheme).order_by('-pk').first()
# - get schemitem - absence can only have one schemitem: get the latest if multiple are found
                schemeitem = m.Schemeitem.objects.filter(scheme=scheme).order_by('-pk').first()

    return scheme, shift, team, teammember, schemeitem
# --- end of get_absence_item

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
                    # add pk here, because instance will be deleted
                    update_dict['id']['pk'] = instance.pk
                    # delete_instance
                    # msg_dict is not in use yet PR2020-10-14
                    msg_dict = {}
                    deleted_ok = m.delete_instance(instance, msg_dict, request)
                    if deleted_ok:
                        instance = None
                        update_dict['id']['deleted'] = True
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
                ed.create_teammember_dict_from_model(instance, update_dict)

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
    # 'employee': {'pk': 2104, 'code': 'aa', 'workminutesperday': 0},
    # 'team': {'pk': 1396, 'value': 'Vakantie', 'ppk': 1136, 'cat': 512, 'update': True},
    # 'workminutesperday': {'value': 0, 'update': True}}

    # upload_dict: {
    # 'isabsence': {'value': True},
    # 'id': {'create': True, 'temp_pk': 'teammember_new2', 'table': 'teammember'},
    # 'employee': {'pk': 2361, 'code': 'Buijze, Yinetd', 'workminutesperday': 0},
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
            #parent = m.get_parent(table, ppk_int, update_dict, request)
            parent = m.Team.objects.get_or_none(id=ppk_int, scheme__order__customer__company=request.user.company)
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
    #logger.debug(' --- update_teammmber ---')
    #logger.debug('upload_dict' + str(upload_dict))

    # absence upload_dict{
    # 'isabsence': {'value': True},
    # 'id': {'create': True, 'temp_pk': 'teammember_new2', 'table': 'teammember'},
    # 'employee': {'pk': 2569, 'code': 'Crisostomo Ortiz, Rayna', 'workminutesperday': 480},
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

    #logger.debug('update_dict: ' + str(update_dict))
    return has_changed


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# === EmployeeImportView ===================================== PR2019-03-09
@method_decorator([login_required], name='dispatch')
class EmployeeImportView(View):

    def get(self, request):
        param = get_headerbar_param(request)
        return render(request, 'employee_import.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadSetting(View):   # PR2019-03-10
    # function updates mapped fields, no_header and worksheetname in table Companysetting
    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= EmployeeImportUploadSetting ============= ')
        #logger.debug('request.POST' + str(request.POST) )
        companysetting_dict = {}
        has_permit = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_hrman)
        if has_permit:
            if request.POST['upload']:
                new_setting_json = request.POST['upload']
                # new_setting is in json format, no need for json.loads and json.dumps
                #logger.debug('new_setting_json' + str(new_setting_json))

                new_setting_dict = json.loads(request.POST['upload'])
                #logger.debug('new_setting_dict' + str(new_setting_dict))

                importtable = new_setting_dict.get('importtable')
                #logger.debug('importtable' + str(importtable))

                settings_key = c.KEY_PAYDATECODE_COLDEFS if importtable == 'paydatecode' else c.KEY_EMPLOYEE_COLDEFS
                #logger.debug('settings_key' + str(settings_key))

                new_worksheetname = ''
                new_has_header = True
                new_code_calc = ''
                new_coldefs = {}
                stored_json = request.user.company.get_companysetting(settings_key)
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
                request.user.company.set_companysetting(settings_key, new_setting_json)

    # only for testing
                # ----- get user_lang
                #user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                #tblName = 'employee'
                #coldefs_dict = compdicts.get_stored_coldefs_dict(tblName, user_lang, request)
                #if coldefs_dict:
                #    companysetting_dict['coldefs'] = coldefs_dict
                #logger.debug('new_setting from saved ' + str(coldefs_dict))

                #m.Companysetting.set_setting(c.settings_key, new_setting_json, request.user.company)

        return HttpResponse(json.dumps(companysetting_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadData(View):  # PR2018-12-04 PR2019-08-05 PR2020-06-04

    def post(self, request, *args, **kwargs):
        #logger.debug(' ========================== EmployeeImportUploadData ========================== ')
        params = {}
        has_permit = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_hrman)
        if has_permit:
            # - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                importtable = f.get_dict_value(upload_dict, ('importtable',))
                if importtable == 'employee':
                    params = import_employees(upload_dict, user_lang, request)
                elif importtable == 'paydatecode':
                    params = import_paydatecodes(upload_dict, user_lang, request)
        return HttpResponse(json.dumps(params, cls=LazyEncoder))




def import_employees(upload_dict, user_lang, request):

# - get is_test, codecalc, dateformat, tsaKey_list
    is_test = upload_dict.get('test', False)
    codecalc = upload_dict.get('codecalc', 'linked')
    dateformat = upload_dict.get('dateformat', '')
    tsaKey_list = upload_dict.get('tsaKey_list')

    #logger.debug('tsaKey_list: ' + str(tsaKey_list))

    params = {}
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

# - get upload_dict from request.POST
        employee_list = upload_dict.get('employees')
        if employee_list:
            today_dte = f.get_today_dateobj()
            today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)
            double_line_str = '=' * 80
            indent_str = ' ' * 5
            space_str = ' ' * 30
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
                    # #logger.debug( str(key) +': ' + val + '" found in "' + str(student) + '"')
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
    return params


def import_paydatecodes(upload_dict, user_lang, request):
    #logger.debug(' --- import_paydatecodes --- ')

    # 'paydatecodes': [{'rowindex': 0, 'afascode': '3', 'code': 'HRM / Payroll (Maand vast )',
    # 'year': '2020', 'period': '1', 'datefirst': '01/01/2020', 'paydate': '31/01/2020'}
    # - get is_test, codecalc, dateformat, tsaKey_list
    is_test = upload_dict.get('test', False)

    dateformat = upload_dict.get('dateformat', '')
    tsaKey_list = upload_dict.get('tsaKey_list')

    #logger.debug('dateformat: ' + str(dateformat))
    #logger.debug('tsaKey_list: ' + str(tsaKey_list))
    params = {}
    if tsaKey_list:
        # - get lookup_field
        # lookup_field is field that determines if paydatecode alreay exist.
        # check if one of the fields 'payrollcode', 'identifier' or 'code' exists
        # first in the list is lookup_field
        lookup_field = None
        if 'afascode' in tsaKey_list:
            lookup_field = 'afascode'
        #logger.debug('lookup_field: ' + str(lookup_field))

        paydateitem_list = upload_dict.get('paydatecodes')
        if paydateitem_list:
            today_dte = f.get_today_dateobj()
            today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)
            double_line_str = '=' * 80
            indent_str = ' ' * 5
            space_str = ' ' * 30
            logfile = []
            logfile.append(double_line_str)
            logfile.append('  ' + str(request.user.company.code) + '  -  ' +
                           str(_('Upload payroll periods')) + ' ' + str(_('date')) + ': ' + str(today_formatted))
            logfile.append(double_line_str)

            #logger.debug('lookup_field: ' + str(lookup_field))
            if lookup_field is None:
                info_txt = str(_('There is no field given to lookup payroll periods. Payroll periods cannot be uploaded.'))
                logfile.append(indent_str + info_txt)
            else:
                if is_test:
                    info_txt = str(_("This is a test. The payroll periods are not saved."))
                else:
                    info_txt = str(_("The payroll periods are saved."))
                logfile.append(indent_str + info_txt)
                lookup_caption = str(get_field_caption('paydatecode', lookup_field))
                info_txt = str(_("Payroll periods are looked up by the field: '%(fld)s'.") % {'fld': lookup_caption})
                logfile.append(indent_str + info_txt)
                if dateformat:
                    info_txt = str(_("The date format is: '%(fld)s'.") % {'fld': dateformat})
                    logfile.append(indent_str + info_txt)

                #logger.debug('info_txt: ' + str(info_txt))
                update_list = []
                has_error, paydatecodes_dict = create_paydatecodes_dict(paydateitem_list, tsaKey_list, logfile, indent_str, space_str, request)
                if paydatecodes_dict:
                    for afascode, pdc_dict in paydatecodes_dict.items():
                        pdc_pk = pdc_dict.get('pk')
                        pdc_code = pdc_dict.get('code')
                        paydatecode = None
                        if pdc_pk:
# - get existing paydatecode
                            paydatecode = m.Paydatecode.objects.get_or_none(pk=pdc_pk, company=request.user.company)
                            # TODO check value / update paydatecode
                        elif pdc_code:
# - create paydatecode
                            paydatecode = m.Paydatecode(
                                company=request.user.company,
                                code=pdc_code,
                                recurrence='irregular',
                                afascode=afascode,
                                isdefault=False)
                            paydatecode.save(request=request)
                        if paydatecode:
                            #logger.debug('paydatecode: ' + str(paydatecode.code))
                            for key, pdi_dict in pdc_dict.items():
                                if key not in ('code', 'pk'):
                                    year_period = key
                                    #logger.debug('year_period: ' + str(year_period))
                                    #logger.debug('pdi_dict: ' + str(pdi_dict))

                                    pdi_pk = pdi_dict.get('pk')
                                    pdi_year = pdi_dict.get('year')
                                    pdi_period = pdi_dict.get('period')
                                    pdi_datefirst = pdi_dict.get('datefirst')
                                    pdi_paydate = pdi_dict.get('paydate')

                                    # - validate new value
                                    msg_err = None
                                    pdi_datefirst_dte = None
                                    pdi_paydate_dte = None
                                    if pdi_datefirst and dateformat:
                                        pdi_datefirst_iso = f.get_dateISO_from_string(pdi_datefirst, dateformat)
                                        pdi_datefirst_dte = f.get_date_from_ISO(
                                            pdi_datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
                                        if pdi_datefirst_dte is None:
                                            msg_err = str(_("'%(val)s' is not a valid date.") % {'val': pdi_datefirst})
                                    if pdi_paydate and dateformat:
                                        pdi_paydate_iso = f.get_dateISO_from_string(pdi_paydate, dateformat)
                                        pdi_paydate_dte = f.get_date_from_ISO(
                                            pdi_paydate_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
                                        if pdi_paydate_dte is None:
                                            msg_err = str(_("'%(val)s' is not a valid date.") % {'val': pdi_paydate})

                                    #logger.debug('pdi_pk: ' + str(pdi_pk))
                                    #logger.debug('paydatecode: ' + str(paydatecode) + ' ' + str(type(paydatecode)))
                                    #logger.debug('pdi_year: ' + str(pdi_year) + ' ' + str(type(pdi_year)))
                                    #logger.debug('pdi_period: ' + str(pdi_datefirst_dte) + ' ' + str(type(pdi_datefirst_dte)))
                                    #logger.debug('pdi_paydate_dte: ' + str(pdi_paydate_dte) + ' ' + str(type(pdi_paydate_dte)))
                                    if pdi_pk:
                                        # - get existing paydateitem
                                        paydateitem = m.Paydateitem.objects.get_or_none(pk=pdi_pk, paydatecode=paydatecode)
                                        # TODO check / update paydateitem
                                    elif pdi_year and pdi_paydate:
                                        # - create paydateitem
                                        paydateitem = m.Paydateitem(
                                            paydatecode=paydatecode,
                                            year=pdi_year,
                                            period=pdi_period,
                                            datefirst=pdi_datefirst_dte,
                                            datelast=pdi_paydate_dte
                                        )
                                        paydateitem.save(request=request)

                                    #logger.debug('paydateitem: ' + str(paydateitem))

                if update_list:  # 'Any' returns True if any element of the iterable is true.
                    params['paydateitem_list'] = update_list
            if logfile:  # 'Any' returns True if any element of the iterable is true.
                params['logfile'] = logfile
                # params.append(new_employee)
    return params


def create_paydatecodes_dict(paydateitem_list, tsaKey_list, logfile, indent_str, space_str, request):  # PR2020-06-25
    #logger.debug('--------- create_paydatecodes_dict ------------')
    update_list = []
    mapped_customers_identifier = {}
    mapped_customers_code = {}
    has_error = False
    paydatecodes_dict = {}
    # sorted_dict: {
    # '3': {'code': 'HRM / Payroll (Maand vast )'},
    # '7': {'code': 'HRM / Payroll (Quincena 1)'},
    # '14': {'code': 'HRM/Payroll (Maand Variabel)'},
    # '16': {'code': 'HRM / Payroll BIRGEN'},
    # '17': {'code': 'HRM / Payroll (Quicena Bouw)'}}
    for paydateitem_dict in paydateitem_list:
        afascode = paydateitem_dict.get('afascode')
        afascode_int = None
        try:
            afascode_int = int(afascode)
        except:
            has_error = True
        if not afascode_int:
            has_error = True
        code = paydateitem_dict.get('code')
        if not code:
            has_error = True

        # TODO test max length   paydateitem_dict.get('code', '')[0:c.USERNAME_MAX_LENGTH]
        pdc_dict = {}
        if not has_error:
# - add item if afascode not in pdc_dict
            if afascode_int not in paydatecodes_dict:
                pdc_dict['code'] = code
# check if item already exists in database, lookup pk
                has_multiple, paydatecode_pk = paydatecode_exists(afascode_int, request)
                if has_multiple:
                    has_error = True
                elif paydatecode_pk:
                    pdc_dict['pk'] = paydatecode_pk
                paydatecodes_dict[afascode_int] = pdc_dict
            else:
                pdc_dict = paydatecodes_dict[afascode_int]
                s_code = pdc_dict.get('code')
            # check if code same as code in dict. If not, error
                if code != s_code:
                    has_error = True
# - add paydate item to pdc_dict
        year_int, period_int, year_period = None, None, None
        if not has_error and pdc_dict:
            year = paydateitem_dict.get('year')
            period = paydateitem_dict.get('period')
            year_int, period_int = None, None
            try:
                year_int = int(year)
                period_int = int(period)
            except:
                has_error = True
            if not year_int or not period_int:
                has_error = True
            if not has_error:
                year_period = str(year_int) + '_' + str(period_int)

        if not has_error:
            pdi_dict = {}
            # - add item if afascode not in dict
            if year_period in pdc_dict:
                # double entry
                has_error = True
            else:
                datefirst = paydateitem_dict.get('datefirst')
                paydate = paydateitem_dict.get('paydate')
                rowindex = paydateitem_dict.get('rowindex')
                if not datefirst or not paydate:
                    has_error = True
                else:
                    pdi_dict = {'year': year_int, 'period': period_int,
                                'datefirst': datefirst, 'paydate': paydate, 'rowindex': rowindex}
# check if item already exists in database, lookup pk
                    has_multiple, paydateitem_pk = paydateitem_exists(afascode, year_int, period_int, request)
                    if has_multiple:
                        has_error = True
                    elif paydateitem_pk:
                        pdi_dict['pk'] = paydateitem_pk
            if not has_error and pdi_dict:
                pdc_dict[year_period] = pdi_dict
    if has_error:
        paydatecodes_dict = {}
    return has_error, paydatecodes_dict
# --- end of create_paydatecodes_dict

def paydateitem_exists(afascode, year_int, period_int, request):
    paydateitem_pk = None
    has_multiple = False
    if afascode and year_int and period_int:
        items = m.Paydateitem.objects.filter(
            paydatecode__afascode=afascode,
            year=year_int,
            period=period_int,
            paydatecode__company=request.user.company)
        item_count = 0
        for item in items:
            paydateitem_pk = item.pk
            item_count += 1
        if item_count > 1:
            paydateitem_pk = None
            has_multiple = True
    return has_multiple, paydateitem_pk

def paydatecode_exists(afascode, request):
    paydatecode_pk = None
    has_multiple = False
    if afascode:
        items = m.Paydatecode.objects.filter(
            afascode=afascode,
            company=request.user.company)
        item_count = 0
        for item in items:
            paydatecode_pk = item.pk
            item_count += 1
        if item_count > 1:
            paydatecode_pk = None
            has_multiple = True
    return has_multiple, paydatecode_pk


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def upload_employee(empl_dict, lookup_field, lookup_count, tsaKey_list, is_test, codecalc, format_str, indent_str, space_str, logfile, request):  # PR2019-12-17 PR2020-06-03
    #logger.debug('----------------- import employee  --------------------')
    #logger.debug(str(empl_dict))
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
    #logger.debug('lookup_field: ' + str(lookup_field))
    #logger.debug('lookup_field_caption: ' + str(lookup_field_caption))
    #logger.debug('lookup_field_capitalized: ' + str(lookup_field_capitalized))

    lookup_value =  empl_dict.get(lookup_field)
    #logger.debug('lookup_value: ' + str(lookup_value))

    employee, no_lookup_value, value_too_long, multiple_found = lookup_employee(lookup_field, lookup_value, request)

    #logger.debug('employee: ' + str(employee))
    #logger.debug('multiple_found: ' + str(multiple_found))
    #logger.debug('no_lookup_value: ' + str(no_lookup_value))

    no_code_value = False if new_code else True
    no_namelast_value = False if new_namelast else True

    #logger.debug('no_code_value: <' + str(no_code_value) + '>')
    #logger.debug('new_code: <' + str(new_code) + '>')

# - give row_error when lookup went wrong
    is_skipped_str = str(_("is skipped."))
    skipped_str = str(_("Skipped."))
    logfile.append(indent_str)
    msg_err = None
    log_str = ''
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

            # recalc_emplh_pdc_list etc contains list of employee_pk's to be updated in emplhour table
            recalc_emplh_pdc_list, recalc_emplh_fnc_list, recalc_emplh_wgc_list = [], [], []
            blank_str = '<' + str(_('blank')) + '>'
            was_str = str(_('was') + ': ')
            for field in c.FIELDS_EMPLOYEE:
                # --- get field_dict from  upload_dict  if it exists
                if field in tsaKey_list:
                    #('field: ' + str(field))
                    field_dict = {}
                    field_caption = str(get_field_caption('employee', field))
                    caption_txt = (indent_str + field_caption + space_str)[:30]

                    if field in ('code', 'telephone', 'zipcode', 'identifier', 'payrollcode',
                                 'namelast', 'namefirst', 'email', 'address', 'city', 'country'):
                        if field == 'code':
                            # new_code is created in this function and already checked for max_len
                            new_value = new_code
                        else:
                            new_value = empl_dict.get(field)
            # check length of new_value
                        max_len = c.NAME_MAX_LENGTH \
                            if field in ('namelast', 'namefirst', 'email', 'address', 'city', 'country') \
                            else c.CODE_MAX_LENGTH

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
                                setattr(employee, field, new_value)
                                field_dict['updated'] = True
                                save_instance = True
                # create field_dict and log
                                if is_existing_employee:
                                    old_value_str = was_str + (saved_value or blank_str)
                                    field_dict['info'] = field_caption + ' ' + old_value_str
                                    update_str = ((new_value or blank_str) + space_str)[:25] + old_value_str
                                    logfile.append(caption_txt + update_str)

#####################################
                    elif field in ('paydatecode', 'functioncode', 'wagecode'):
                        #functioncode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
                        #wagecode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True, blank=True)
                        #paydatecode = ForeignKey(Paydatecode, related_name='+', on_delete=SET_NULL, null=True)

                        new_value = empl_dict.get(field)
                    # check length of new_value ( 30 char for paydatecode, 24 for functioncode, wagecode
                        max_len = c.USERNAME_MAX_LENGTH if field == 'paydatecode' else c.CODE_MAX_LENGTH

                        if max_len and new_value and len(new_value) > max_len:
                            msg_err = str(_("'%(val)s' is too long. Maximum is %(max)s characters'.") % {
                                'val': new_value, 'max': max_len})
                            field_dict['error'] = msg_err
                        elif new_value:
                            if field == 'paydatecode':
                                new_instance, is_new_instance = get_or_create_paydatecode_pk(new_value, is_test, request)
                            else:
                                new_instance, is_new_instance = get_or_create_wagecode_functioncode_wagefactor_pk(
                                    field, new_value, is_test, request)
                            field_dict['pk'] = new_instance.pk
                            field_dict['ppk'] = new_instance.company.pk
                            field_dict['code'] = new_value

                            if not is_existing_employee:
                                logfile.append(caption_txt + (new_value or blank_str))
                            # - get saved_value
                            saved_instance = getattr(employee, field)
                            if new_instance != saved_instance:
                                # put new value in employee instance
                                setattr(employee, field, new_instance)
                                field_dict['updated'] = True
                                save_instance = True
                                if field == 'paydatecode':
                                    recalc_emplh_pdc_list.append(employee.pk)
                                elif field == 'functioncode':
                                    recalc_emplh_fnc_list.append(employee.pk)
                                elif field == 'wagecode':
                                    recalc_emplh_wgc_list.append(employee.pk)

                                    # create field_dict and log
                                if is_existing_employee:
                                    saved_instance_code= saved_instance.code if saved_instance else None
                                    old_value_str = was_str + (saved_instance_code or blank_str)
                                    field_dict['info'] = field_caption + ' ' + old_value_str
                                    update_str = ((new_value or blank_str) + space_str)[:25] + old_value_str
                                    logfile.append(caption_txt + update_str)
                                    if is_new_instance:
                                        logfile.append(space_str[:30] + field_caption + ": '" + new_value + "'" + str(_(' is added to the list.')))
                        else:
                            # remove instance from employee
                            saved_instance = getattr(employee, field)
                            if saved_instance:
                                # put new value in employee instance
                                setattr(employee, field, None)
                                field_dict['updated'] = True
                                save_instance = True
                                if field == 'paydatecode':
                                    recalc_emplh_pdc_list.append(employee.pk)
                                elif field == 'functioncode':
                                    recalc_emplh_fnc_list.append(employee.pk)
                                elif field == 'wagecode':
                                    recalc_emplh_wgc_list.append(employee.pk)

                                # create field_dict and log
                                if is_existing_employee:
                                    saved_instance_code= saved_instance.code if saved_instance else None
                                    old_value_str = was_str + (saved_instance_code or blank_str)
                                    field_dict['info'] = field_caption + ' ' + old_value_str
                                    update_str = space_str[:25] + old_value_str
                                    logfile.append(caption_txt + update_str)
######################################
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
                                setattr(employee, field, new_date_dte)
                                field_dict['updated'] = True
                                save_instance = True
                # create field_dict and log
                                if is_existing_employee:
                                    field_dict['info'] = field_caption + ' ' + old_value_str
                                    update_str = ((new_date_iso or blank_str) + space_str)[:25] + old_value_str
                                    logfile.append(caption_txt + update_str)

                    elif field in ('workhoursperweek', 'workminutesperday', 'leavedays'):
            # - get new value, convert to number
                        new_value = empl_dict.get(field)
                        new_value_float, msg_err = f.get_float_from_string(new_value)
                        if msg_err:
                            field_dict['error'] = msg_err
                        else:
                            multiplier = 60 if field == 'workhoursperweek' else 1440
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
                                setattr(employee, field, new_value_minutes)
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

                        if not employee.inactive and employee.datelast and today_dte and employee.datelast < today_dte:
                            setattr(employee, 'inactive', True)
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

                    if employee.pk in recalc_emplh_pdc_list :
                        recalc_emplh_pdc_list.remove(employee.pk)
                    elif employee.pk in recalc_emplh_fnc_list :
                        recalc_emplh_fnc_list.remove(employee.pk)
                    elif employee.pk in recalc_emplh_wgc_list :
                        recalc_emplh_wgc_list.remove(employee.pk)


                if recalc_emplh_pdc_list:
                    recalc_emplhour_paydatecode_NIU(None, recalc_emplh_pdc_list, False, request)

                if recalc_emplh_fnc_list:
                    recalc_emplhour_functioncode(recalc_emplh_fnc_list)
                #if recalc_emplh_wgc_list:
                #    recalc_emplhour_wagecode(recalc_emplh_wgc_list, False)
    return update_dict
# --- end of upload_employee

def get_field_caption(table, field):
    caption = ''
    if table == 'employee':
        if field == 'code':
            caption = _('Short name')
        elif field == 'namelast':
            caption = _('Last name')
        elif field == 'namefirst':
            caption = _('First name')
        elif field == 'email':
            caption = _('Email address')
        elif field == 'telephone':
            caption = _('Telephone')
        elif field == 'identifier':
            caption = _('ID-number')
        elif field == 'payrollcode':
            caption = _('Payroll code')
        elif field == 'address':
            caption = _('Address')
        elif field == 'zipcode':
            caption = _('Zip code')
        elif field == 'city':
            caption = _('City')
        elif field == 'country':
            caption = _('Country')
        elif field == 'datefirst':
            caption = _('First date in service')
        elif field == 'datelast':
            caption = _('Last date in service')
        elif field == 'workhoursperweek':
            caption = _('Working hours per week')
        elif field == 'workminutesperday':
            caption = _('Working hours per day')
        elif field == 'workdays':
            caption = _('Working days per week')
        elif field == 'leavedays':
            caption = _('Leave days per year')
        elif field == 'functioncode':
            caption = _('Function')
        elif field == 'wagecode':
            caption = _('Wage code')
        elif field == 'paydatecode':
            caption = _('Payroll period')

    elif table == 'paydatecode':
        if field == 'afascode':
            caption = _('Code period table')
        elif field == 'code':
            caption = _('Name period table')
        elif field == 'year':
            caption = _('Bookyear')
        elif field == 'period':
            caption = _('Period index')
        elif field == 'datefirst':
            caption = _('Startdate')
        elif field == 'paydate':
            caption = _('Enddate')

    return caption

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def lookup_employee(lookup_field, lookup_value, request):  # PR2019-12-17 PR2020-06-02
    #logger.debug('----------- lookup_employee ----------- ')
    # function searches for existing employee in the following order: payrollcode, identifier, short name

    #logger.debug('lookup_field: ' + str(lookup_field))
    #logger.debug('lookup_value: ' + str(lookup_value) + ' ' + str(type(lookup_value)))

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
def create_employee(upload_dict, request):
    # --- create employee # PR2019-07-30 PR2020-09-11

    employee = None
    msg_err = None

# - get parent
    parent = request.user.company
    if parent:

# - get value of 'code'
        code = None
        code_dict = upload_dict.get('code')
        if code_dict:
            code = code_dict.get('value')
        if code:
# - validate code checks null, max len and exists
            msg_err = validate_code_name_identifier(
                table='employee',
                field='code',
                new_value=code,
                is_absence=False,
                parent=parent,
                update_dict={},
                msg_dict={},
                request=request,
                this_pk=None)
# - create and save employee
            if not msg_err:
                try:
                    employee = m.Employee(
                        company=parent,
                        code=code)
                    employee.save(request=request)
                except:
                    msg_err = str(_("An error occurred. Employee '%(val)s' could not be added.") % {'val': code})

    return employee, msg_err


#######################################################
def update_employee(instance, parent, upload_dict, msg_dict, request):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ------- update_employee -------')
    logger.debug('upload_dict' + str(upload_dict))

    if instance:
# 1. get iddict variables
        #  FIELDS_EMPLOYEE = ('id', 'company', 'code', 'datefirst', 'datelast',
        #                    'namelast', 'namefirst', 'email', 'telephone', 'identifier', 'payrollcode',
        #                    'address', 'zipcode', 'city', 'country',
        #                    #TODO deprecate workdays
        #                    'workhoursperweek', 'workminutesperday', 'workdays', 'leavedays',
        #                    'functioncode', 'wagecode', 'paydatecode',
        #                    'pricecode', 'additioncode', 'inactive', 'locked')

        save_changes = False
        for field in c.FIELDS_EMPLOYEE:

# --- get field_dict from  upload_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
# a. get new_value
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field)

# 2. save changes in field 'code', required field
                    if field in ['code', 'identifier']:
                        if new_value != saved_value:
            # validate_code_name_id checks for null, too long and exists. Puts msg_err in update_dict
                            msg_err = validate_code_name_identifier(
                                table='employee',
                                field=field,
                                new_value=new_value, parent=parent,
                                is_absence=False,
                                update_dict={},
                                msg_dict={},
                                request=request,
                                this_pk=instance.pk)
                            if not msg_err:
                                # c. save field if changed and no_error
                                setattr(instance, field, new_value)
                                save_changes = True
                            else:
                                msg_dict['err_' + field] = msg_err

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
                                msg_dict=msg_dict,
                                this_pk=instance.pk)
                            if not has_error:
                                setattr(instance, field, new_value)
                                save_changes = True

# 3. save changes in date fields
                    elif field in ['datefirst', 'datelast']:
        # a. get new_date
                        new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
        # b. validate value
                        if msg_err:
                            msg_dict['err_' + field] = msg_err
                        else:
        # c. save field if changed and no_error
                            old_date = getattr(instance, field, None)
                            if new_date != old_date:
                                setattr(instance, field, new_date)
                                save_changes = True

# 4. save changes in fields 'pricerate'
                    elif field in ['pricerate']:
                        new_rate, msg_err = f.get_rate_from_value(new_value)
                        #logger.debug('new_rate' + str(new_rate))
                        #logger.debug('msg_err' + str(msg_err))
                        if msg_err:
                            msg_dict['err_' + field] = msg_err
                        else:
                            saved_value = getattr(instance, field)
                            if new_rate != saved_value:
                                setattr(instance, field, new_rate)
                                save_changes = True

                    elif field in ['workhoursperweek', 'workminutesperday', 'leavedays']:
                        if field == 'workhoursperweek':
                            max_value = 10080  # 10080 = 7 * 24 * 60= 168 hours
                            msg_err = _('Working hours per week must be a number between 0 and 168')
                        elif field == 'workminutesperday':
                            max_value = 1440  # 24 * 60 = 24 hours
                            msg_err = _('Working hours per day must be a number between 0 and 24')
                        else:
                            max_value = 525600  # 525600 = 365 * 1440
                            msg_err = _('Leave days per year must be a number between 0 and 365')

                        if new_value is None:
                            new_value = 0
                        if new_value < 0 or new_value > max_value:
                            msg_dict['err_' + field] = msg_err
                        elif new_value != saved_value:
                            setattr(instance, field, new_value)
                            save_changes = True

# 4. save changes in fields functioncode', 'wagecode'
                    elif field in ['functioncode', 'wagecode']:
                        new_value = None
                        new_pk = field_dict.get('value')
                        is_wagecode = (field == 'wagecode')
                        is_functioncode = (field == 'functioncode')
                        logger.debug('new_pk' + str(new_pk))
                        logger.debug('is_functioncode' + str(is_functioncode))
                        key_str = None
                        if is_functioncode:
                            key_str = 'fnc'
                        elif is_wagecode:
                            key_str = 'wgc'
                        if new_pk and key_str:
                            new_value = m.Wagecode.objects.get_or_none(
                                company=request.user.company,
                                pk=new_pk,
                                key=key_str                            )
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            save_changes = True

                    elif field == 'paydatecode':
                        new_value = None
                        new_pk = field_dict.get('value')
                        if new_pk:
                            new_value = m.Paydatecode.objects.get_or_none(
                                company=request.user.company,
                                pk=new_pk
                            )
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            save_changes = True

# 4. save changes in field 'inactive'
                    elif field == 'inactive':
                        #logger.debug('inactive new_value]: ' + str(new_value) + ' ' + str(type(new_value)))
                        saved_value = getattr(instance, field)
                        #logger.debug('inactive saved_value]: ' + str(saved_value) + ' ' + str(type(saved_value)))
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            save_changes = True
                    else:
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            save_changes = True
# --- end of for loop ---

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                msg_dict['err_update'] = _('An error occurred. The changes have not been saved.')

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def get_or_create_wagecode_functioncode_wagefactor_pk(fldName, lookup_value, dont_save, request):
    #logger.debug(" --- get_or_create_wagecode_functioncode_wagefactor_pk ---")

    instance = None
    is_new_instance = False
# -  check if 'functioncode' already exists
    # don't use get_or_none, it wil return None when multiple instances exist, and create even more instances
    if lookup_value:
        crit = Q(company=request.user.company) & \
               Q(code__iexact = lookup_value)
        if fldName == 'iswagecode':
            crit.add(Q(iswagecode=True), crit.connector)
        elif fldName == 'iswagefactor':
            crit.add(Q(iswagefactor=True), crit.connector)
        elif fldName == 'functioncode':
            crit.add(Q(isfunctioncode=True), crit.connector)
        instance = m.Wagecode.objects.filter(crit).first()

# - create new wagecode record if not exists
        if instance is None:
            instance = m.Wagecode(
                company=request.user.company,
                code=lookup_value)
            if fldName == 'iswagecode':
                instance.iswagecode = True
            elif fldName == 'iswagefactor':
                instance.iswagefactor = True
            elif fldName == 'functioncode':
                instance.isfunctioncode = True
            if not dont_save:
                instance.save(request=request)
            is_new_instance = True
    return instance, is_new_instance


def get_or_create_paydatecode_pk(lookup_value, dont_save, request):
    #logger.debug(" --- get_or_create_paydatecode_pk ---")
    instance = None
    is_new_instance = False
# -  check if 'functioncode' already exists
    # don't use get_or_none, it wil return None when multiple instances exist, and create even more instances
    if lookup_value:
        instance = m.Paydatecode.objects.filter(company=request.user.company, code__iexact = lookup_value).first()
# - create new wagecode record if not exists
        if instance is None:
            instance = m.Paydatecode(
                company=request.user.company,
                code=lookup_value
            )
            if not dont_save:
                instance.save(request=request)
            is_new_instance = True
    return instance, is_new_instance



# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# === PayrollView ===================================== PR2020-06-09
@method_decorator([login_required], name='dispatch')
class PayrollView(View):

    def get(self, request):
        param = get_headerbar_param(request)
        #if request.user is not None and request.user.company is not None:
    # get user_lang
            #user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            #activate(user_lang)
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'payroll.html', param)


# === PayrollUploadView ===================================== PR2020-06-09
@method_decorator([login_required], name='dispatch')
class PayrollUploadView(UpdateView):  # PR2020-06-10

    def post(self, request, *args, **kwargs):
        logging_on = True
        if logging_on:
            logger.debug(' ============= PayrollUploadView ============= ')
        update_wrap = {}
        has_permit = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_hrman)
        if has_permit:

# ----- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# ----- get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                table = upload_dict.get('table')
                key_str = upload_dict.get('key')

                if logging_on:
                    logger.debug('upload_dict: ' + str(upload_dict))
                    logger.debug('table: ' + str(table))
                    logger.debug('key_str: ' + str(key_str))

                refresh_employeelist_needed = False
# +++++ ABSENCE CATEGORIES (table = 'abscat')
                if table == 'abscat':
                    update_wrap['updated_abscat_rows'] = upload_abscat_order(upload_dict, logging_on, request)
# +++++ PAYDATECODE
                elif table == 'paydatecode':
                    update_list, refresh_employeelist_needed = upload_paydatecode(upload_dict, user_lang, request)
                    update_wrap['updated_paydatecode_rows'] = update_list

# +++++ WAGECODE (allowance, wagefactor, functionocde, salaryscale
                elif table == 'wagecode':
                    update_wrap['updated_wagecode_rows'] = upload_wagecode(key_str, upload_dict, request, logging_on)

# +++++ WAGE FACTOR TODO to be removed
                #elif table == 'wagefactor':
                #    update_wrap['updated_wagefactor_rows'] = upload_wagecode('wfc', upload_dict, request)
# +++++ ALLOWANCETODO to be removed
                #elif table == 'allowance':
                #    update_wrap['updated_allowance_rows'] = upload_wagecode('alw', upload_dict, request)
# +++++ FUNCTION CODE TODO to be removed
                #elif table == 'functioncode':
                #    update_list, refresh_employeelist_needed = functioncode_upload(upload_dict, request)
                #    update_wrap['updated_functioncode_rows'] = update_list

# +++++ SET EMPLOYEE PAYDATE, FUNCTION
                elif table == 'employee':
                    update_wrap['updated_employee_rows'] = upload_pdc_wgc_fnc_in_employee(upload_dict, request)
# +++++ SET EMPLHOUR WAGEFACTOR
                #elif table == 'emplhour_upload':
                    # NIU updating uemplhour_wagefactor uses EmplhourUploadView - update_emplhour
                    #update_list = upload_emplhour_wagefactor(upload_dict, user_lang, request)
                   # update_wrap['update_list'] = update_list
# +++++ GET EMPLHOUR
                elif table == 'emplhour':
                    emplhour_dict, emplhourlog_list = get_payroll_emplhour(upload_dict, request)
                    update_wrap['emplhour_dict'] = emplhour_dict
                    if emplhourlog_list:
                        update_wrap['emplhourlog_list'] = emplhourlog_list
                if refresh_employeelist_needed:
                    dict_list = ed.create_employee_list(request=request, user_lang=user_lang)
                    update_wrap['employee_list'] = dict_list
# - return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))



# === PayrollImportViewImportView ===================================== PR2020-06-25
@method_decorator([login_required], name='dispatch')
class PayrollImportView(View):

    def get(self, request):
        param = get_headerbar_param(request)
        return render(request, 'payroll_import.html', param)


# === upload_abscat_order ===================================== PR2020-06-17 PR2021-02-14
def upload_abscat_order(upload_dict, logging_on, request):

    #  Note: in upload_dict table = 'abscat', change to 'order' in this function
    table = 'order'
    pk_int = upload_dict.get('pk')
    ppk_int = upload_dict.get('ppk')
    row_index = upload_dict.get('rowindex')
    is_create = upload_dict.get('create', False)
    is_delete = upload_dict.get('delete', False)

    if logging_on:
        logger.debug(' -----  upload_abscat_order  ----- ')
        logger.debug('upload_dict: ' + str(upload_dict))
        logger.debug('pk_int: ' + str(pk_int))
        logger.debug('ppk_int: ' + str(ppk_int))
        logger.debug('row_index: ' + str(row_index))
        logger.debug('is_create: ' + str(is_create))
        logger.debug('is_delete: ' + str(is_delete))

    updated_list = []
    deleted_list = []
    is_created = False
    # - check if parent exists (customer is parent of order)
    if is_create:
        # - get absence_customer, create if not exists
        parent = cd.get_or_create_absence_customer(request)
    else:
        parent = m.Customer.objects.get_or_none(id=ppk_int, company=request.user.company)
    if logging_on:
        logger.debug('parent: ' + str(parent))

    if parent:
        # - create new update_dict with all fields and id_dict. Unused ones will be removed at the end
        update_dict = f.create_update_dict(
            c.FIELDS_ORDER,
            table=table,
            pk=pk_int,
            ppk=parent.pk,
            row_index=row_index)
        # - Delete abscat order
        if is_delete:
            if logging_on:
                logger.debug('is_delete: ' + str(is_delete) + ' ' + str(type(is_delete)))
            instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
            if instance:
                this_text = _("Absence category '%(tbl)s'") % {'tbl': instance.code}
                # a. check if abscat has emplhours, put msg_err in update_dict when error
                is_abscat = True
                has_emplhours = v.validate_order_has_emplhours(instance, update_dict, is_abscat)
                if not has_emplhours:
# - create deleted_row, to be sent back to page
                    deleted_row = {'pk': instance.pk,
                                   'mapid': 'abscat_' + str(instance.pk),
                                   'deleted': True}
# c. delete abscat order
                    # msg_dict is not in use yet PR2020-10-14
                    msg_dict = {}
                    deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                    if deleted_ok:
                        deleted_list.append(deleted_row)
                        instance = None
        else:
# - Create new abscat order
            if is_create:
                instance = cv.create_order(parent, upload_dict, update_dict, request)
                if instance:
                    is_created = True
# - Get existing abscat order
            else:
                instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
            if logging_on:
                logger.debug('instance: ' + str(instance))
# - Update abscat order, also when it is created
            if instance:
                cv.update_order(instance, parent, upload_dict, update_dict, logging_on, request)

# - create abscat_order_rows, add deleted_row
        if instance:
            updated_list = cd.create_abscat_order_rows(request=request, order_pk=instance.pk)
            if is_created:
                # add 'created' to updated_row, to show OK whe nnew row is added to table
                if updated_list[0]:
                    updated_list[0]['created'] = True
        if deleted_list:
            updated_list.extend(deleted_list)

    return updated_list


######################################################
# === functioncode_upload ===========  PR2020-07-18 PR2020-09-20
def functioncode_upload(upload_dict, request):
    #logger.debug(' ===== functioncode_upload =====')
    #logger.debug('upload_dict' + str(upload_dict))
    # Functioncodes are stored in table Wagecode, isfunctioncode = True

    functioncode_rows = []
    deleted_list= []
    msg_dict = {}
    refresh_employeelist_needed = False

# - get id  variables
    pk_int = f.get_dict_value(upload_dict, ('id', 'pk'))
    ppk_int = f.get_dict_value(upload_dict, ('id', 'ppk'))
    is_create = f.get_dict_value(upload_dict, ('id', 'create'), False)
    is_delete = f.get_dict_value(upload_dict, ('id', 'delete'), False)

# - check if parent with ppk_int exists and is same as request.user.company
    parent = m.Company.objects.get_or_none(id=ppk_int)
    if parent and ppk_int == request.user.company_id:

# +++++ Delete Functioncode
        if is_delete:
            instance = m.Wagecode.objects.get_or_none(
                id=pk_int,
                isfunctioncode=True,
                company=parent)
            if instance:
                this_text = _("Function '%(tbl)s'") % {'tbl': instance.code}
    # - check if this Functioncode has emplhours with lockedpaydate=True
                # has_lockedwagecode_emplhours is also used for functioncode
                if instance.has_lockedwagecode_emplhours():
                    msg_err = _('%(this)s has locked roster shifts. It cannot be deleted.') % {'this': this_text}
                    msg_dict['err_delete'] = msg_err
                else:

    # - create deleted_row, to be sent back to page
                    deleted_row = {'pk': instance.pk,
                                   'mapid': 'functioncode_' + str(instance.pk),
                                   'deleted': True}
    # - delete instance
                    # wagecodeitems are not in use for functioncode
                    deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                    if deleted_ok:
                        deleted_list.append(deleted_row)
                        instance = None
                        refresh_employeelist_needed = True
        else:

# +++++ Create new functioncode
            if is_create:
                instance = create_new_functioncode(parent, upload_dict, msg_dict, request)
    # - get existing functioncode
            else:
                instance = m.Wagecode.objects.get_or_none(id=pk_int, isfunctioncode=True, company=parent)

# +++++ Update functioncode, also when it is created
            if instance:
                has_error, code_has_changed = update_functioncode(instance, parent, upload_dict, msg_dict, request)
                if code_has_changed:
                    refresh_employeelist_needed = True
    # - put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
        if instance:
            functioncode_rows = ed.create_wagecode_rows('functioncode', request, msg_dict, instance.pk)
        else:
            pass
        #logger.debug('functioncode_rows' + str(functioncode_rows))

        if deleted_list:
            functioncode_rows.extend(deleted_list)

    return functioncode_rows, refresh_employeelist_needed
# --- end of functioncode_upload


def create_new_functioncode(parent, upload_dict, msg_dict, request):
    # --- create new functioncode # PR20120-07-18  PR2020-09-20

    instance = None
    if parent:
# - get value of 'code'
        code = f.get_dict_value(upload_dict, ('code', 'value'))
        if code:
# - validate code
            msg_err = v.validate_code_name_identifier(
                table='functioncode',
                field='code',
                new_value=code,
                is_absence=False,
                parent=parent,
                update_dict={},
                msg_dict=msg_dict,
                request=request)
            if not msg_err:
# - create and save functioncode
                instance = m.Wagecode(company=parent, code=code, isfunctioncode=True)
                instance.save(request=request)
# - return msg_err when instance not created
                if instance.pk is None:
                    caption = _('This function')
                    msg_dict['err_create'] = _('An error occurred. %(tbl)s could not be created.') % {'tbl': caption}
                else:
# - put iscreated in msg_dict
                    msg_dict['created'] = True
    return instance
# --- end of create_new_functioncode


def update_functioncode(instance, parent, upload_dict, msg_dict, request):
    # --- update existing and new functioncode PR2020-07-18  PR2020-09-20
    # add new values to update_dict (don't reset update_dict, it has values)
    #logger.debug(' --- update_functioncode --- ')

    has_error = False
    code_has_changed = False
    if instance:
        #logger.debug('instance: ' + str(instance))

        save_changes = False
        recalc_emplhour_wagecodes = False
        fields = ('id', 'code', 'inactive' )
        for field in fields:
# - get field_dict from  upload_dict if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if 'update' in field_dict:
# - get new_value
                new_value = field_dict.get('value')
# - save changes in field 'code'
                if field == 'code':
    # a. get old value
                    saved_value = getattr(instance, field)
                    # field 'code' is required, cannot be None
                    if new_value != saved_value:
                        #logger.debug('new_value != saved_value')
    # b. validate code or name
                        msg_err = v.validate_code_name_identifier(
                            table='functioncode',
                            field=field,
                            new_value=new_value,
                            is_absence=False,
                            parent=parent,
                            update_dict={},
                            msg_dict=msg_dict,
                            request=request,
                            this_pk=instance.pk)
                        if not msg_err:
    # c. save field if changed and no_error
                            setattr(instance, field, new_value)
                            save_changes = True
                            code_has_changed = True
# - save changes in boolean fields
                # to be added:  'inactive')
                elif field =='inactive':
                    new_value = field_dict.get('value', False)
                    saved_value = getattr(instance, field, False)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        save_changes = True
# --- end of for loop ---

# +++  save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                caption = _('This function')
                msg_dict['err_update'] = _('An error occurred. %(tbl)s could not be updated.') % {'tbl': caption}

        if not has_error:
            if recalc_emplhour_wagecodes:
                # update paydatecode in all emplhour records that are not locked
                # and recalculate paydate in these emplhour records
                pass
                #TODO
                # recalc_emplhour_paydatecode_NIU(instance.pk, [], True, request)

    return has_error, code_has_changed
# ---  end of update_functioncode


######################################################
# === upload_wagecode ===================================== PR2020-09-15 PR2021-01-29
def upload_wagecode(key_str, upload_dict, request, logging_on):

# upload_dict = { id: {pk: 67, ppk: 3, mapid: "wagefactor_67", table: "wagefactor"}
#               isdefault: {value: true, update: true}

# upload_dict = {'id': {'ppk': 3, 'table': 'wagefactor', 'create': True},
    # 'code': {'value': 'Test', 'update': True},
    # 'wagerate': {'value': 1255500, 'update': True},
    # 'isdefault': {'value': True, 'update': True}}

# upload_dict = {'id': {'pk': 66, 'ppk': 3, 'mapid': 'wagefactor_66', 'table': 'wagefactor', 'delete': True}}

    # Wagefactors are stored in table Wagecode, key = 'wfc'
    pk_int = upload_dict.get('pk')
    ppk_int = upload_dict.get('ppk')
    map_id = upload_dict.get('mapid')
    is_create = upload_dict.get('create', False)
    is_delete = upload_dict.get('delete', False)

    if logging_on:
        logger.debug(' ----- upload_wagecode -----')
        logger.debug('upload_dict' + str(upload_dict))
        logger.debug('key_str: ' + str(key_str))
        logger.debug('pk_int: ' + str(pk_int))
        logger.debug('ppk_int: ' + str(ppk_int))
        logger.debug('map_id: ' + str(map_id))
        logger.debug('is_create: ' + str(is_create))
        logger.debug('is_delete: ' + str(is_delete))

    wagecode_rows = []
    msg_dict = {}

    # TODO implement refresh_employeelist_needed
    refresh_employeelist_needed = False
    #logger.debug('is_create: ' + str(is_create))
    #logger.debug('map_id: ' + str(map_id))

# - check if parent with ppk_int exists and is same as request.user.company
    parent = m.Company.objects.get_or_none(id=ppk_int)
    #logger.debug('parent: ' + str(parent))
    if parent and ppk_int == request.user.company_id:

# +++++ Delete Wagecode
        if is_delete:
            instance = m.Wagecode.objects.get_or_none(id=pk_int, key=key_str, company=parent)
            if instance:
                this_text = _("Wage code '%(tbl)s'") % {'tbl': instance.code}
    # - check if this Wagefactor has emplhours with lockedpaydate=True
                # has_lockedwagecode_emplhours is also used for wagefactor
                if instance.has_lockedwagecode_emplhours():
                    msg_dict['err_delete'] = _('%(tbl)s has locked roster shifts. It cannot be deleted.') % {'tbl': this_text}
                else:
    # - delete_instance, it adds 'deleted' or 'error' to id_dict
                    deleted_row = {'mapid': map_id, 'deleted': True}
                    # wagecodeitems are not in use for wagefactor
                    deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                    if deleted_ok:
                        wagecode_rows.append(deleted_row)
                        instance = None
        else:
# +++++ Create new wagecode
            if is_create:
                instance = create_new_wagecode(key_str, parent, upload_dict, msg_dict, request)

    # - get existing wagecode
            else:
                instance = m.Wagecode.objects.get_or_none(id=pk_int, key=key_str, company=parent)
# +++++ Update wagefactor, also when it is created
            #logger.debug('instance: ' + str(instance))
            if instance:
                update_wagecode(key_str, instance, parent, upload_dict, msg_dict, request, logging_on)

    # - put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
        if instance:
            wagecode_rows = ed.create_wagecode_rows(key_str, request, msg_dict, instance.pk)

    return wagecode_rows
# --- end of upload_wagecode


def create_new_wagecode(key_str, parent, upload_dict, msg_dict, request):
    #logger.debug(' --- create_new_wagecode --- ')
    # --- create new wagefactor # PR2020-07-14 PR2020-09-15 PR2021-01-29
    # put messages in msg_dict
    wagefactor = None

# - get parent
    if parent:
# - get value of 'code'
        code = upload_dict.get('code')
        if code:
# - validate code
            # TODO add validate_code_name_identifier
            # has_error = v.validate_code_name_identifier(table, 'code', code, False, parent, update_dict,{},  request)
            has_error = False
            if not has_error:
# - create and save wagefactor
                try:
                    wagefactor = m.Wagecode(
                        company=parent,
                        code=code,
                        key=key_str)
                    wagefactor.save(request=request)
# - return msg_err when wagefactor not created
                except:
                    msg_dict['err_create'] = _('This wage code could not be created.')
                else:
                    msg_dict['created'] = True
    return wagefactor
# --- end of create_new_wagecode


def update_wagecode(key_str, instance, parent, upload_dict, msg_dict, request, logging_on):
    # --- update existing and new wagefactor PR2020-07-14 PR2020-09-15 PR2021-01-29
    if logging_on:
        logger.debug(' --- update_wagecode --- ')
        logger.debug('upload_dict: ' + str(upload_dict))

    if instance:
        table = 'wagecode'
        save_changes = False
        has_error = False
        recalc_emplhour_wagecodes = False
        # field 'isdefault' is not in Model. Default wagefactor is stored in table 'Company', field 'wagefactorcode_id'
        fields = ('code', 'description', 'wagerate', 'inactive', 'isdefault')

        for field in fields:
# - get value from upload_dict if field exists as key in upload_dict
            if field in upload_dict:
# - get new_value
                new_value = upload_dict.get(field)
                if logging_on:
                    logger.debug('field: ' + str(field))
                    logger.debug('new_value: ' + str(new_value))
# - save changes in field 'code'
                if field == 'code':
    # a. get old value
                    saved_value = getattr(instance, field)
                    if new_value != saved_value:
    # b. validate code or name
                        msg_err = v.validate_code_name_identifier(
                            table, field, new_value, False, parent, {}, {}, request, this_pk=None)
                        if not msg_err:
    # c. save field if changed and no_error
                            setattr(instance, field, new_value)
                            save_changes = True
                        else:
                            has_error = True
                            msg_dict['err_' + field] = msg_err

                elif field == 'description':
                    saved_value = getattr(instance, field)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        save_changes = True

# - save changes in text field, date field and number fields
                elif field == 'wagerate':
                    saved_value = getattr(instance, field)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        save_changes = True
                        recalc_emplhour_wagecodes = True
# - save changes in boolean fields
                elif field =='inactive':
                    new_value = upload_dict.get(field, False)
                    saved_value = getattr(instance, field, False)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        save_changes = True

            # - save default wagefactorcode_id in table 'company'
                elif field == 'isdefault':
                    instance.company.wagefactorcode_id = instance.pk if new_value else None
                    instance.company.save()

# --- end of for loop ---

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                msg_dict['err_update'] = _('An error occurred. The changes have not been saved.')

        if not has_error:
            if recalc_emplhour_wagecodes:
                # update wagecodes in all emplhour records that are not locked
                recalc_emplhour_paydatecode_NIU(instance.pk, [], True, request)
                if key_str == 'alw':
                    recalc_emplhour_allowances(instance, request, logging_on)

# ---  end of update_wagecode

#########################################################
# === upload_paydatecode ======  PR2020-06-17  PR2020-09-22
def upload_paydatecode(upload_dict, user_lang, request):
    logger.debug(' ===== upload_paydatecode =====')
    logger.debug('upload_dict' + str(upload_dict))
    # Paydatecodes are stored in table Paydatecode

    paydatecode_rows = []
    deleted_list= []
    msg_dict = {}
    refresh_employeelist_needed = False

# - get id  variables
    table = upload_dict.get('table')
    pk_int = upload_dict.get( 'pk')
    ppk_int = upload_dict.get( 'ppk')
    is_create = upload_dict.get( 'create', False)
    is_delete = upload_dict.get( 'delete', False)

# - check if parent with ppk_int exists and is same as request.user.company
    parent = m.Company.objects.get_or_none(id=ppk_int)
    if parent and ppk_int == request.user.company_id:
        recurrence = ''
        recalc_emplhour_paydates = False

# +++++ Delete Paydatecode
        if is_delete:
            instance = m.Paydatecode.objects.get_or_none(
                id=pk_int,
                company=parent)
            if instance:
                this_text = _("Payroll period '%(tbl)s'") % {'tbl': instance.code}
    # - check if this paydatecode has emplhours with lockedpaydate=True
                if instance.has_lockedpaydate_emplhours():
                    msg_err = _('%(tbl)s has locked roster shifts. It cannot be deleted.') % {'tbl': this_text}
                    msg_dict['err_delete'] = msg_err
                else:

    # - create deleted_row, to be sent back to page
                    deleted_row = {'pk': instance.pk,
                                   'mapid': 'paydatecode' + str(instance.pk),
                                   'deleted': True}
    # - delete_instance
                    # paydateitems are also deleted because of cascade delete
                    deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                    if deleted_ok:
                        deleted_list.append(deleted_row)
                        instance = None
                        refresh_employeelist_needed = True
        else:

# +++++ Create new paydatecode
            if is_create:
                instance = create_new_paydatecode(parent, upload_dict, msg_dict, request)
    # - get existing paydatecode
            else:
                instance = m.Paydatecode.objects.get_or_none(id=pk_int, company=parent)

# +++++ Update paydatecode, also when it is created
            if instance:
                has_error, code_has_changed, recalc_emplhour_paydates, recurrence = \
                    update_paydatecode(instance, parent, upload_dict, msg_dict, request)
                if code_has_changed:
                    refresh_employeelist_needed = True

    # - put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
        if instance:
            paydatecode_rows = ed.create_paydatecode_rows(
                period_dict={},
                paydatecode_pk=instance.pk,
                msg_dict=msg_dict,
                request=request)

        if recurrence == 'irregular':
            update_dict = {}
            update_paydatecodeitem(instance, upload_dict, update_dict, request)
        else:
            # TODO update the Paydateitem list in JS
            #m.Paydateitem.objects.filter(paydatecode=instance).delete()
            pass

        if recalc_emplhour_paydates:
            # update paydatecode in all emplhour records that are not locked
            # and recalculate paydate in these emplhour records
            recalc_emplhour_paydatecode_NIU(instance.pk, [], True, request)

        if deleted_list:
            paydatecode_rows.extend(deleted_list)

    return paydatecode_rows, refresh_employeelist_needed
# --- end of upload_paydatecode


def create_new_paydatecode(parent, upload_dict, msg_dict, request):
    # --- create new paydatecode # PR2020-06-17 PR2020-09-22
    instance = None
    if parent:
# - get value of 'code'
        code = f.get_dict_value(upload_dict, ('code', 'value'))
        if code:
# - validate code
            msg_err = v.validate_code_name_identifier(
                table='paydatecode',
                field='code',
                new_value=code,
                is_absence=False,
                parent=parent,
                update_dict={},
                msg_dict=msg_dict,
                request=request)
            if not msg_err:
# - create and save paydatecode
                instance = m.Paydatecode(company=parent, code=code)
                instance.save(request=request)
# - return msg_err when instance not created
                if instance.pk is None:
                    caption = _('This payroll period')
                    msg_dict['err_create'] = _('An error occurred. %(tbl)s could not be created.') % {'tbl': caption}
                else:
# - put created in msg_dict
                    msg_dict['created'] = True
    return instance
# --- end of create_new_paydatecode


def update_paydatecode(instance, parent, upload_dict, msg_dict, request):
    # --- update existing and new paydate PR2020-06-17  PR2020-09-22
    # add new values to update_dict (don't reset update_dict, it has values)
    #logger.debug(' --- update_paydatecode --- ')

    #logger.debug('upload_dict: ' + str(upload_dict))
    #logger.debug('update_dict: ' + str(update_dict))
    # upload_dict: {'id': {'table': 'paydatecode', 'ppk': 3, 'create': True},
    # 'recurrence': {'value': 'irregular', 'update': True},
    # 'code': {'value': 'Loonperiode', 'update': True},
    # 'year': {'value': 2020, 'update': True},
    # 'closingdates': {'value': ['2020-06-19', '2020-07-19', '2020-08-19'], 'update': True}}

    has_error, code_has_changed, recalc_emplhour_paydates, recurrence = False, False, False, ''
    if instance:
        save_changes = False
        recalc_emplhour_paydates = False
        recurrence = f.get_dict_value(upload_dict, ('recurrence', 'value'))

        # FIELDS_PAYDATECODE = ('id', 'company', 'code', 'recurrence', 'dayofmonth', 'referencedate',
        #       'datefirst', 'datelast', 'datefirst_agg', 'datelast_agg', 'afascode', 'isdefault', 'inactive')
        for field in c.FIELDS_PAYDATECODE:
# - get field_dict from  upload_dict if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if 'update' in field_dict:
# - get new_value
                new_value = field_dict.get('value')
# - save changes in field 'code'
                if field == 'code':
    # a. get old value
                    saved_value = getattr(instance, field)
                    # field 'code' is required, cannot be None
                    if new_value != saved_value:
    # b. validate code or name
                        msg_err = v.validate_code_name_identifier(
                            table='paydatecode',
                            field=field,
                            new_value=new_value,
                            is_absence=False,
                            parent=parent,
                            update_dict={},
                            msg_dict=msg_dict,
                            request=request,
                            this_pk=instance.pk)
                        if not msg_err:
    # c. save field if changed and no_error
                            setattr(instance, field, new_value)
                            save_changes = True
                            code_has_changed = True
# - save changes in text field, date field and number fields
                elif field in ('recurrence', 'dayofmonth', 'referencedate', 'datefirst', 'datelast', 'afascode'):
                    saved_value = getattr(instance, field)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        save_changes = True
                        recalc_emplhour_paydates = True
# - save changes in boolean fields
                elif field in ['isdefault', 'inactive']:
                    new_value = field_dict.get('value', False)
                    saved_value = getattr(instance, field, False)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        save_changes = True
# --- end of for loop ---

# +++  save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                caption = _('This payroll period')
                msg_dict['err_update'] = _('An error occurred. %(tbl)s could not be updated.') % {'tbl': caption}

                code_has_changed = False
                recalc_emplhour_paydates = False

        if not has_error:
            if recalc_emplhour_paydates:
                # update paydatecode in all emplhour records that are not locked
                # and recalculate paydate in these emplhour records
                pass
                #TODO
                # recalc_emplhour_paydatecode_NIU(instance.pk, [], True, request)

    return has_error, code_has_changed, recalc_emplhour_paydates, recurrence
# ---  end of update_paydatecode


def update_paydatecodeitem(instance, upload_dict, update_dict, request):
    # --- update existing and new paydate PR2020-06-17
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_paydatecodeitem --- ')
    # upload_dict:

    """
    upload_dict: {
    'table': 'paydatecode', 
    'pk': 4, 'ppk': 8, 
    'code': {'value': 'Loonperiode', 'update': True}, 
    'recurrence': {'value': 'irregular', 'update': True}, 
    'closingdates': {'value': ['2024-01-31', '2024-02-29', '2024-03-29', '2024-04-29'], 'year': '2024', 'update': True}}
    """

    closingdates_arr = f.get_dict_value(upload_dict, ('closingdates', 'value'))
    selected_year = f.get_dict_value(upload_dict, ('closingdates', 'year'))
    logger.debug('closingdates_arr: ' + str(closingdates_arr) + str(type(closingdates_arr)))
    logger.debug('selected_year: ' + str(selected_year) + ' ' + str(type(selected_year)))

    paydateitem_list = []
    paydateitems = m.Paydateitem.objects.filter(
        paydatecode=instance,
        year=selected_year
    )
    for paydateitem in paydateitems:
        paydate_last = paydateitem.datelast
        logger.debug('paydate_last: ' + str(paydate_last) + ' ' + str(type(paydate_last)))
        if paydate_last:
            paydate_last_iso = paydate_last.isoformat()
            logger.debug('paydate_last_iso: ' + str(paydate_last_iso) + ' ' + str(type(paydate_last_iso)))
# - remove date from closingdates_arr when it alreay exists in paydateitems, add to paydateitem_list
            if paydate_last_iso in closingdates_arr:
                closingdates_arr.remove(paydate_last_iso)
                paydateitem_list.append({'value': paydate_last_iso})
                logger.debug('paydate_iso in closingdates_arr' )
            else:
                logger.debug('paydate_iso NOT in closingdates_arr' )
# - remove date from paydateitems when it is not in closingdates_arr
                paydateitem.delete(request=request)
                paydateitem_list.append({'value': paydate_last_iso, 'deleted': True})

    logger.debug('paydateitem_list: ' + str(paydateitem_list) + ' ' + str(type(paydateitem_list)))
    logger.debug('closingdates_arr: ' + str(closingdates_arr) + ' ' + str(type(closingdates_arr)))
# - add remaining dates from closingdates_arr to paydateitems
    for closingdate_iso in closingdates_arr:
        closingdate_dte = f.get_dateobj_from_dateISOstring(closingdate_iso)
        logger.debug('closingdate_dte: ' + str(closingdate_dte) )
        paydateitem = m.Paydateitem(
            paydatecode=instance,
            datelast=closingdate_dte,
            year=selected_year
        )
# - save paydateitems and add to paydateitem_list
        paydateitem.save(request=request)
        paydateitem_list.append({'value': closingdate_iso, 'created': True})

# - update datefirst and period in paydateitems of this paydatecode PR2021-02-12
        # also get paydateitems of previous year, to retrieve lastdate of last item of previous year
        previous_year = selected_year -1
        paydateitems = m.Paydateitem.objects.filter(
            paydatecode=instance,
            year__gte=previous_year,
            year__lte=selected_year,
        ).order_by('datelast')

        previous_datelast_dte = None
        this_period = 0
        for paydateitem in paydateitems:
            this_datelast_dte = paydateitem.datelast
            logger.debug('.....this_datelast_dte: ' + str(this_datelast_dte) )
            logger.debug('     year: ' + str(paydateitem.year))
            if paydateitem.year == selected_year:
                this_period += 1
                logger.debug('>>>> this_period: ' + str(this_period) )
                logger.debug('previous_datelast_dte: ' + str(previous_datelast_dte) )
                if previous_datelast_dte is None:
                    # set datefirst of the first paydateitem on January 1st
                    this_datefirst_dte = f.get_firstof_thisyear(selected_year)
                    logger.debug('this_datefirst_dte January 1st: ' + str(this_datefirst_dte) )
                elif previous_datelast_dte < this_datelast_dte:
                    this_datefirst_dte = f.add_days_to_date(previous_datelast_dte, 1)
                    logger.debug('previous_datelast_dte < this_datelast_dte: ' + str(this_datefirst_dte) )
                else:
                    this_datefirst_dte = previous_datelast_dte
                    logger.debug('this_datefirst_dte = previous_datelast_dte: ' + str(this_datefirst_dte) )

                paydateitem.period = this_period
                paydateitem.datefirst = this_datefirst_dte
                paydateitem.save()

            previous_datelast_dte = this_datelast_dte


# - add to paydateitem_list to update_dict
    if paydateitem_list:
        update_dict['paydateitem_list'] = paydateitem_list


# === upload_pdc_wgc_fnc_in_employee ===================================== PR2020-06-18 PR2021-02-12
def upload_pdc_wgc_fnc_in_employee(upload_dict, request):
    # put new paydatecode / wagecode / functioncode in all non-locked employees in employee_list
    # if 'pk' = None the existing value will be removed
    logging_on = True
    if logging_on:
        logger.debug(' ===== upload_pdc_wgc_fnc_in_employee =====')
        logger.debug('upload_dict' + str(upload_dict))
        # upload_dict{'table': 'employee', 'employee_list': [7],
        #               'wagecode': {'pk': 20, key: 'fnc', 'code': 'secretaresse', 'update': True}}

    updated_employee_rows = []
    updated_employee_pk_list = []

    employee_pk_list = f.get_dict_value(upload_dict, ('employee_list',))
    if employee_pk_list:
        pk_int, field_id = None, None
        if 'paydatecode' in upload_dict:
            pk_int = f.get_dict_value(upload_dict, ('paydatecode', 'pk'))
            field_id = 'paydatecode_id'
            # pk_int can be None, when value must be removed
            if pk_int and not m.Paydatecode.objects.filter(pk=pk_int).exists():
                field_id = None
        elif 'wagecode' in upload_dict:
            pk_int = f.get_dict_value(upload_dict, ('wagecode', 'pk'))
            key_str = f.get_dict_value(upload_dict, ('wagecode', 'key'))
            # wagefactorcode and allowance have no field in employee
            if key_str == 'wgc':
                field_id = 'wagecode_id'
            elif key_str == 'fnc':
                field_id = 'functioncode_id'
            # pk_int can be None, when value must be removed
            if pk_int and not m.Wagecode.objects.filter(pk=pk_int).exists():
                field_id = None

        if field_id:
            sql_keys = {'comp_id': request.user.company.pk, 'eid_arr': employee_pk_list}
            sql_list = ['UPDATE companies_employee SET']

            if pk_int:
                sql_keys['fld_pk'] = pk_int
                sql_list.append(field_id + ' = %(fld_pk)s::INT')
            else:
                sql_list.append(field_id + ' = NULL')

            sql_list.append("""WHERE companies_employee.company_id = %(comp_id)s::INT AND id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) ) 
                               RETURNING id""")
            sql = ' '.join(sql_list)

            with connection.cursor() as cursor:
                cursor.execute(sql, sql_keys)
                rows = cursor.fetchall()
                for row in rows:
                    updated_employee_pk_list.append(row[0])

            # updated_employee_pk_list contains list of pk's of updated employees
            if updated_employee_pk_list:
        # update paydatecode / wagecode / functioncode in non-locked emplhour records of updated employees
                update_emplhour_pdc_wgc_fnc(field_id, employee_pk_list, pk_int)

        # create employee_row of all updates employees
                request_item = {'employee_pk_list': updated_employee_pk_list}

                updated_employee_rows = ed.create_employee_rows(request_item, {}, request)
                # --- create rows of all employees of this company PR2019-06-16 PR2020-09-09

    return updated_employee_rows

#############################################

# === update_emplhour_functioncode =========== PR2020-09-21
def update_emplhour_functioncode(employee_pk_list, new_functioncode_pk):
    #logger.debug(' ===== update_emplhour_functioncode =====')
    #logger.debug('employee_pk_list' + str(employee_pk_list))
    #logger.debug('new_functioncode_pk' + str(new_functioncode_pk))

    field = 'functioncode'
    sql_keys = {'eid_arr': employee_pk_list}
    sql_list = ['UPDATE companies_emplhour SET']

    if new_functioncode_pk:
        sql_list.append(field + '_id = %(fld_pk)s::INT')
        sql_keys['fld_pk'] = new_functioncode_pk
    else:
        sql_list.append(field + '_id = NULL')
    sql_list.append("""WHERE NOT companies_emplhour.lockedpaydate AND companies_emplhour.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )""")
    sql = ' '.join(sql_list)

    #logger.debug('sql_keys' + str(sql_keys))
    #logger.debug('sql' + str(sql))
    with connection.cursor() as cursor:
        cursor.execute(sql, sql_keys)
# ---- end of update_emplhour_functioncode


# === update_emplhour_paydatecode =========== PR2020-09-28
def update_emplhour_pdc_wgc_fnc(field_id, employee_pk_list, new_pdc_wgc_fnc_pk):
    #logger.debug(' ===== update_emplhour_paydatecode =====')
    #logger.debug('employee_pk_list' + str(employee_pk_list))
    #logger.debug('new_functioncode_pk' + str(new_functioncode_pk))

    sql_keys = {'eid_arr': employee_pk_list}
    sql_list = ['UPDATE companies_emplhour SET']

    if new_pdc_wgc_fnc_pk:
        sql_list.append(field_id + ' = %(fld_pk)s::INT')
        sql_keys['fld_pk'] = new_pdc_wgc_fnc_pk
    else:
        sql_list.append(field_id + ' = NULL')
    sql_list.append("""
        WHERE NOT companies_emplhour.lockedpaydate 
        AND companies_emplhour.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )
        RETURNING id, rosterdate, employeecode
        """)
    sql = ' '.join(sql_list)

    #logger.debug('sql_keys' + str(sql_keys))
    #logger.debug('sql' + str(sql))
    #with connection.cursor() as cursor:
        #cursor.execute(sql, sql_keys)
        #emplhour_rows = f.dictfetchall(cursor)
        #for row in emplhour_rows:
        #    logger.debug('emplhour_row' + str(row))
# ---- end of update_emplhour_paydatecode


# === upload_emplhour_wagefactor =========== PR2020-09-15
def upload_emplhour_wagefactorNIU(upload_dict, user_lang, request):
    #logger.debug(' ----- upload_emplhour_wagefactor =====')
    #logger.debug('upload_dict' + str(upload_dict))

    update_list = []

   # upload_dict = { id: { pk: 11696, ppk: 11153, table: "emplhour" }, wfc_id: {value: 62, update: true} }

    if upload_dict:
        emplhour_pk = f.get_dict_value(upload_dict, ('id', 'pk'))

        employee_pk_list = upload_dict.get ('employee_pk_list')
        paydatecode_pk = upload_dict.get ('paydatecode_pk')
        functioncode_pk = upload_dict.get ('functioncode_pk')
        for dict in employee_pk_list:
            table = f.get_dict_value(dict, ('id', 'table'))
            pk_int = f.get_dict_value(dict, ('id', 'pk'))
            ppk_int = f.get_dict_value(dict, ('id', 'ppk'))
# A. check if parent with ppk_int exists and is same as request.user.company
            parent = m.Company.objects.get_or_none(id=ppk_int)
            #logger.debug('parent:', parent)
            if parent and ppk_int == request.user.company_id:

        # B. create new update_dict with all fields and id_dict. Unused ones will be removed at the end
                update_dict = f.create_update_dict(
                    c.FIELDS_EMPLOYEE,
                    table=table,
                    pk=pk_int,
                    ppk=parent.pk,
                    row_index=None)

                instance = m.Employee.objects.get_or_none(id=pk_int, company=parent)
                #logger.debug('instance:', instance)
        # F. Update employee, also when it is created
                if instance:
                    update_employee_paydate_function(instance, dict, update_dict, request)

                    ed.create_employee_dict(instance, update_dict, user_lang)
            # - remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)
            # - add update_dict to update_wrap
                    if update_dict:
                        update_list.append(update_dict)

        if employee_pk_list:
            recalc_emplhour_paydatecode_NIU(paydatecode_pk, employee_pk_list, False, request)
    return update_list
# - end of upload_emplhour_wagefactor


# === get_payroll_emplhour ===================================== PR2020-06-28
def get_payroll_emplhour(upload_dict, request):
    #logger.debug(' ===== get_payroll_emplhour =====')
    #logger.debug('upload_dict' + str(upload_dict))

    emplhour_dict = {}
    emplhourlog_list = []
    emplhour_pk = upload_dict.get('emplhour_pk')
    if emplhour_pk:
        sql_emplhour = """
            SELECT eh.id, eh.rosterdate, eh.employeecode, eh.isreplacement, eh.lockedpaydate, eh.nopay,
                eh.timestart, eh.timeend, eh.timeduration, eh.breakduration, eh.plannedduration, eh.billingduration,
                eh.offsetstart, eh.offsetend, eh.wagerate, eh.wagefactor, eh.wage, eh.status, eh.overlap, eh.locked,
                eh.modifiedbyusername, eh.modifiedat, 
                oh.id AS oh_id,
                o.id AS order_id,
                c.id AS customer_id,
                oh.shiftcode, oh.isrestshift, oh.isabsence, 
                oh.ordercode, oh.customercode,
                eh.functioncode_id AS fnc_id,
                eh.wagecode_id AS wgc_id,
                eh.wagefactorcode_id AS wfc_id,
                eh.paydatecode_id AS pdc_id,
                pdc.code AS pdc_code, fnc.code AS fnc_code, wgc.code AS wgc_code, wfc.code AS wfc_code, 
                e.datefirst AS e_datefirst, e.datelast AS e_datelast
            FROM companies_emplhour AS eh
            LEFT JOIN companies_employee AS e ON (e.id = eh.employee_id)
            LEFT JOIN companies_wagecode AS fnc ON (fnc.id = eh.functioncode_id)
            LEFT JOIN companies_wagecode AS wgc ON (wgc.id = eh.wagecode_id)
            LEFT JOIN companies_wagecode AS wfc ON (wfc.id = eh.wagefactorcode_id)
            LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            WHERE c.company_id = %(compid)s 
            AND eh.id = %(emplhid)s
            """
        #  CONCAT(c.code, ' - ', o.code ) AS c_o_code,
        newcursor = connection.cursor()
        newcursor.execute(sql_emplhour, {
            'compid': request.user.company_id,
            'emplhid': emplhour_pk
        })
        emplhour_dict = f.dictfetchone(newcursor)

        sql_emplhourlog = """
            SELECT ehlog.emplhour_id, ehlog.rosterdate, ehlog.employeecode, ehlog.isreplacement, 
                ehlog.timestart, ehlog.timeend, ehlog.timeduration, ehlog.breakduration, 
                ehlog.plannedduration, ehlog.billingduration, ehlog.offsetstart, ehlog.offsetend, 
                ehlog.shiftcode, ehlog.isrestshift, ehlog.isabsence, 
                ehlog.ordercode, ehlog.customercode, 
                ehlog.status, ehlog.modifiedbyusername, ehlog.modifiedat
            FROM companies_emplhourlog AS ehlog
            WHERE ehlog.emplhour_id = %(emplhid)s
            ORDER BY ehlog.modifiedat DESC
            """
        #  CONCAT(c.code, ' - ', o.code ) AS c_o_code,
        newcursor.execute(sql_emplhourlog, {
            'emplhid': emplhour_pk
        })
        emplhourlog_list = f.dictfetchall(newcursor)

    return emplhour_dict, emplhourlog_list


def update_employee_paydate_function(instance, upload_dict, update_dict, request):
    # --- update paydaye or function existing employee PR2020-06-18
    #logger.debug(' --- update_employee_paydate_function --- ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    #logger.debug('instance: ' + str(instance))

    has_error = False
    paydatecode_has_changed = False
    functioncode_has_changed = False
    wagecode_has_changed = False
    if instance:
        save_changes = False
        for field in ('paydatecode', 'functioncode', 'wagecode'):
            #logger.debug('field: ' + str(field))
            # --- get field_dict from  item_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                # field_dict: {'pk': 3, 'code': 'Maandelijks op de 24e', 'update': True}
                #logger.debug('field_dict: ' + str(field_dict))
                if 'update' in field_dict:
                    is_updated = False
# ---   get instance of paydatecode, functioncode, wagecode
                    pk = f.get_dict_value(field_dict, ('pk',))
                    related_instance = None
                    if pk:
                        if field == 'paydatecode':
                            related_instance = m.Paydatecode.objects.get_or_none( id=pk, company=request.user.company)
                        elif field == 'functioncode':
                            related_instance = m.Wagecode.objects.get_or_none( id=pk, isfunctioncode=True, company=request.user.company)
                        elif field == 'wagecode':
                            related_instance = m.Wagecode.objects.get_or_none( id=pk, iswagecode=True, company=request.user.company)
# ---   get old value
                    saved_value = getattr(instance, field)
                    #logger.debug('saved_value: ' + str(saved_value))
                    # also update when instance = None: instance will be removed
                    if related_instance != saved_value:
                        setattr(instance, field, related_instance)
                        is_updated = True
                        if field == 'paydatecode':
                            paydatecode_has_changed = True
                        elif field == 'functioncode':
                            functioncode_has_changed = True
                        elif field == 'wagecode':
                            wagecode_has_changed = True
                        #logger.debug('related_instance: ' + str(related_instance))

# ---   add 'updated' to field_dict'
                    if is_updated:
                        update_dict[field]['updated'] = True
                        save_changes = True
                        #logger.debug('update_dict[field]: ' + str(update_dict[field]))
# --- end of for loop ---

# ---   save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': 'employee'}
                update_dict['id']['error'] = msg_err

                #logger.debug('msg_err: ' + str(msg_err))

        #logger.debug('paydatecode_has_changed: ' + str(paydatecode_has_changed))
        if paydatecode_has_changed:
            paydatecode_pk = instance.paydatecode_id
            employee_pk_list = [instance.pk]
            recalc_emplhour_paydatecode_NIU(paydatecode_pk, employee_pk_list, False, request)
        if functioncode_has_changed:
            employee_pk_list = [instance.pk]
            recalc_emplhour_functioncode(employee_pk_list)

    return has_error


# === recalc_emplhour_functioncode =======  PR2020-07-19 PR2020-09-20
def recalc_emplhour_functioncode(employee_pk_list):
    #logger.debug(' --- recalc_emplhour_functioncode --- ')
    # function updates functioncode_id in all emplhour records in pk_list that are not lockedpaydate
    # Do not update modifiedby_id and modifiedat PR20202-07-19

    # empty employee_pk_list [] is falsey
    if employee_pk_list:

        sql_update_functioncode = """
            UPDATE companies_emplhour AS eh
            SET functioncode_id = e.functioncode_id
            FROM companies_employee AS e
            WHERE eh.employee_id = e.id
            AND NOT eh.lockedpaydate
            AND eh.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )
            RETURNING eh.id;
        """
        # was for testing: RETURNING eh.employee_id, e.code, e.functioncode_id;
        with connection.cursor() as cursor:
            cursor.execute(sql_update_functioncode, {
                'eid_arr': employee_pk_list
            })
           # items = f.dictfetchall(cursor)
           #for item in items:
                #logger.debug('.. updated functioncode_pk: ' + str(item))
# ---  end of recalc_emplhour_functioncode


# === recalc_emplhour_allowances =======  PR2021-02-11
def recalc_emplhour_allowances(wagecode, request, logging_on):
    # function updates rate and amount in in all emplhour records in pk_list that are not lockedpaydate
    if logging_on:
        logger.debug('----- recalc_emplhour_allowances -----')

    if wagecode:
        wagerate = getattr(wagecode, 'wagerate', 0)
        ehals = m.Emplhourallowance.objects.filter(
            allowancecode=wagecode,
            emplhour__lockedpaydate=False,
            emplhour__locked=False
        )
        if logging_on:
            logger.debug('wagecode: ' + str(wagecode))
            logger.debug('wagerate: ' + str(wagerate))
        for ehal in ehals:
            if wagerate != ehal.rate:
                amount = 0
                quantity = ehal.quantity
                if wagerate and ehal.quantity:
                    amount = math.ceil(wagerate * (quantity / 10000))
                ehal.rate = wagerate
                ehal.amount = amount
                ehal.save(request=request)
                if logging_on:
                    logger.debug('wagecode: ' + str(wagecode))
                    logger.debug('quantity: ' + str(quantity))
                    logger.debug('amount: ' + str(amount))
# ---  end of recalc_emplhour_allowances


# === recalc_emplhour_paydatecode_NIU ===================================== PR2020-06-27
def recalc_emplhour_paydatecode_NIU(paydatecode_pk, employee_pk_list, all_employees, request):
    #logger.debug(' --- recalc_emplhour_paydatecode_NIU --- ')
    #logger.debug('paydatecode_pk: ' + str(paydatecode_pk))
    #logger.debug('employee_pk_list: ' + str(employee_pk_list))
    #logger.debug('all_employees: ' + str(all_employees))
    # function updates paydatecode in all emplhour records that are not lockedpaydate

    # if all_employees=True it will update all employee records
    # Do not change modifiedby_id and modifiedat PR20202-07-19

    # Note: at this time paydatecode is linked to employee, therefore filter by employee_pk_list is allowed
    sql_keys = {'comp_id': request.user.company.pk, 'pdc_id': paydatecode_pk}
    sql = None
    sql_list = []
    if employee_pk_list:
        if paydatecode_pk is None:
    # ---   remove paydatecode_pk from empl emplhour records  when no paydatecode_pk:
            #  - that are not lockedpaydate
            #  - only of employees in employee_pk_list
            #  - skip when all_employees = True
            # PR2020-12-04 debug: paydate was not deleted. Was:  , paydate = NULL"
            sql_keys['eid_arr'] = employee_pk_list
            sql_list = ["UPDATE companies_emplhour SET paydatecode_id = NULL",
                        "WHERE NOT lockedpaydate AND employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )",
                        "RETURNING employee_id, paydatecode_id, paydate"]
        else:
    # ---   update paydatecode_id in all emplhour records:
            #  - that are not lockedpaydate
            #  - only of employees in employee_pk_list
            #  - skip when all_employees = True
            sql_keys['eid_arr'] = employee_pk_list
            sql_list = ["UPDATE companies_emplhour  SET paydatecode_id = %(pdc_id)s",
                        "WHERE NOT lockedpaydate AND employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )"]
            #            "RETURNING employee_id, paydatecode_id, paydate"]
    elif all_employees:
# ---   update field paydatecode_id in table emplhour with paydatecode_id of related employee record
        #  - that are not lockedpaydate , filter company_id
        sql_list = ["UPDATE companies_emplhour SET paydatecode_id = companies_employee.paydatecode_id",
                    "FROM companies_employee",
                    "WHERE NOT companies_emplhour.lockedpaydate",
                    "AND companies_employee.company_id = %(comp_id)s::INT",
                    "AND companies_emplhour.employee_id = companies_employee.id"]
        # "RETURNING companies_emplhour.employee_id, companies_employee.code, companies_emplhour.paydatecode_id"
    sql = ' '.join(sql_list)
    # for testing: add "RETURNING"
    if sql:
        with connection.cursor() as cursor:
            cursor.execute(sql, sql_keys)
            #emplhour_rows = f.dictfetchall(cursor)
            #for row in emplhour_rows:
            #    logger.debug('.......... row: ' + str(row))

# --- skip update paydate in emplhour when no when paydatecode_pk is null
    # paydate is already removed above in this function
    # PR2020-12-04 remove update paydate in emplhour
    """
    if paydatecode_pk:
# ---   get first and last rosterdate of not locked emplhour records
        sql_list = ["SELECT MIN(eh.rosterdate), MAX(eh.rosterdate)",
                    "FROM companies_emplhour AS eh",
                    "INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)",
                    "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
                    "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
                    "INNER JOIN companies_customer AS c ON (c.id = o.customer_id) ",
                    "WHERE NOT eh.lockedpaydate AND eh.paydatecode_id = %(pdc_id)s::INT"]

        if employee_pk_list:
            sql_list.append('AND eh.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )')
        elif all_employees:
            sql_list.append('AND c.company_id = %(comp_id)s::INT ')
        sql = ' '.join(sql_list)

        # skip this when paydatecode_pk is null and employee_pk_list has value. Paydate is already removed above in this function
        # This one doesnt work: AND ( paydatecode_id = %(pdc_id)s )
        min_rosterdate_dte = None
        max_rosterdate_dte = None
        with connection.cursor() as cursor:
            cursor.execute(sql, sql_keys)
            min_max_arr = cursor.fetchone()
            if min_max_arr:
                min_rosterdate_dte = min_max_arr[0]
                max_rosterdate_dte = min_max_arr[1]

        #logger.debug('.......... min_rosterdate_dte: ' + str(min_rosterdate_dte) + str(type(min_rosterdate_dte)))
        #logger.debug('.......... max_rosterdate_dte: ' + str(max_rosterdate_dte) + str(type(max_rosterdate_dte)))

        if min_rosterdate_dte:
            rosterdate_dte = min_rosterdate_dte
            if rosterdate_dte and max_rosterdate_dte:

                paydatecode = m.Paydatecode.objects.get_or_none(id=paydatecode_pk, company=request.user.company)
    # iterate till last rosterdate:
                # PR2020-07-14 debug. got error when no items, because max_rosterdate_dte = None and <= is not allowed then
                while rosterdate_dte <= max_rosterdate_dte:
    # ---  get new closingdate for this rosterdate_dte
                    firstdate_of_period_dte, new_paydate_dte = plv.recalc_paydate(rosterdate_dte, paydatecode)

                    #logger.debug('.......... rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
                    #logger.debug('.......... firstdate_of_period_dte: ' + str(firstdate_of_period_dte))
                    #logger.debug('.......... new_paydate_dte: ' + str(new_paydate_dte))
                    #logger.debug('.......... paydatecode_pk: ' + str(paydatecode_pk))

    # ---  update paydate in all emplhours of this rosterdate that are not lockedpaydate of employees in employee_pk_list
                    sql_keys = {'comp_id': request.user.company.pk,
                                'rd': rosterdate_dte,
                                'pdc_id': paydatecode_pk,
                                'paydate': new_paydate_dte}
                    sql_list = ["UPDATE companies_emplhour AS eh SET paydate = %(paydate)s::DATE",
                                "FROM companies_employee AS e",
                                "WHERE NOT lockedpaydate AND e.company_id = %(comp_id)s::INT",
                                "AND eh.employee_id = e.id",
                                "AND eh.rosterdate = %(rd)s::DATE",
                                "AND eh.paydatecode_id = %(pdc_id)s::INT"]
                    if employee_pk_list:
                        sql_keys['eid_arr'] = employee_pk_list
                        sql_list.append('AND eh.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )')
                    elif all_employees:
                        sql_keys['comp_id'] = request.user.company.pk
                        sql_list.append('AND e.company_id = %(comp_id)s::INT')
                    sql_list.append('RETURNING eh.employee_id, e.code, eh.paydatecode_id')
                    sql = ' '.join(sql_list)

                    # was for testing: RETURNING id, employee_id, paydatecode_id, paydate;
                    with connection.cursor() as cursor:
                        cursor.execute(sql, sql_keys)
                        #emplhour_rows = f.dictfetchall(cursor)
                        #for row in emplhour_rows:
                       #    logger.debug('.---- row: ' + str(row))

    # make rosterdate 1 day later than new_paydate_dte
                    rosterdate_dte = f.add_days_to_date(new_paydate_dte, 1)
                # --- end of while loop
    """
# === end of recalc_emplhour_paydatecode_NIU


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

        team_list = pld.create_team_rows(
            filter_dict=filter_dict,
            company=request.user.company)
        if team_list:
            update_wrap['team_list'] = team_list

        shift_rows = pld.create_shift_rows(
            filter_dict=filter_dict,
            company=request.user.company)
        if shift_rows:
            update_wrap['shift_rows'] = shift_rows

        teammember_list = ed.ed_create_teammember_list(
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

    team_list = pld.create_team_rows(
        filter_dict=filter_dict,
        company=request.user.company)
    if team_list:
        update_wrap['team_list'] = team_list

    shift_rows = pld.create_shift_rows(
        filter_dict=filter_dict,
        company=request.user.company)
    if shift_rows:
        update_wrap['shift_rows'] = shift_rows

    teammember_list = ed.ed_create_teammember_list(
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


# === PayrollAfasHoursXlsxView ===================================== PR2021-02-17
@method_decorator([login_required], name='dispatch')
class PayrollAfasHoursXlsxView(View):
    logger.debug('===== PayrollAfasHoursXlsxView ===== ')

    def get(self, request):
        param = {}
        has_permit = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_hrman)
        if has_permit:
# ----- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get saved period_dict
            comp_timezone = request.user.company.timezone if request.user.company.timezone else settings.TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
            interval = request.user.company.interval if request.user.company.interval else 15
            period_dict = pld.period_get_and_save('payroll_period', None, comp_timezone, timeformat, interval, user_lang, request)

            response = ed.create_afas_hours_rows(period_dict, user_lang, request)

            return response
# - end of PayrollAfasHoursXlsxView

# === PayrollAfasEhalXlsxView ===================================== PR2021-02-13
@method_decorator([login_required], name='dispatch')
class PayrollAfasEhalXlsxView(View):
    logger.debug('===== PayrollAfasEhalXlsxView ===== ')

    def get(self, request):
        param = {}
        has_permit = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_hrman)
        if has_permit:
# ----- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get saved period_dict
            comp_timezone = request.user.company.timezone if request.user.company.timezone else settings.TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
            interval = request.user.company.interval if request.user.company.interval else 15
            period_dict = pld.period_get_and_save('payroll_period', None, comp_timezone, timeformat, interval, user_lang, request)

            response = ed.create_afas_ehal_rows(period_dict, user_lang, request)

            return response


# === ReviewlAfasInvoiceXlsxView ===================================== PR2021-02-13
@method_decorator([login_required], name='dispatch')
class ReviewlAfasInvoiceXlsxView(View):
    logger.debug('===== ReviewlAfasInvoiceXlsxView ===== ')

    def get(self, request):
        param = {}
        has_permit = False
        if request.user is not None and request.user.company is not None:
            has_permit = (request.user.is_perm_accman)
        if has_permit:
# ----- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get saved review_period period_dict
            comp_timezone = request.user.company.timezone if request.user.company.timezone else settings.TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
            interval = request.user.company.interval if request.user.company.interval else 15
            period_dict = pld.period_get_and_save('review_period', None, comp_timezone, timeformat, interval, user_lang, request)

            response = ed.create_afas_invoice_rows(period_dict, user_lang, request)

            return response
# - end of ReviewlAfasInvoiceXlsxView