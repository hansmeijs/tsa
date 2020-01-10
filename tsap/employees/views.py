
# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.db.models import Q, Value
from django.db.models.functions import Lower, Coalesce
from django.shortcuts import render, redirect #, get_object_or_404
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.translation import activate, ugettext_lazy as _
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
from employees.forms import EmployeeAddForm, EmployeeEditForm
from employees import dicts as d
from customers import dicts as cd
from planning import dicts as pld
from planning import views as plvw
from planning import rosterfill as prf

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

            # add employee_list to headerbar parameters PR2019-03-02
            employees = m.Employee.objects.filter(company=request.user.company)
            employee_list = []
            for employee in employees:
                dict = {}
                dict['id'] = employee.id
                dict['name'] = employee.name
                employee_list.append(dict)
            employee_list = json.dumps(employee_list)
            #logger.debug('employee_list: ' + str(employee_list))

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
class EmployeeAddViewXXX(CreateView):

    def get(self, request, *args, **kwargs):
        # logger.debug('EmployeeAddView get' )
        # logger.debug('ExamyearAddView get request: ' + str(request))
        # permission:   user.is_authenticated AND user.is_role_insp_or_system
        form = EmployeeAddForm(request=request)

        # set headerbar parameters PR 2018-08-06
        param = get_headerbar_param(request, {'form': form})
        # logger.debug('EmployeeAddView param: ' + str(param))

        # render(request, template_name, context=None (A dictionary of values to add to the template context), content_type=None, status=None, using=None)
        return render(request, 'employee_add.html', param)

    def post(self, request, *args, **kwargs):
        self.request = request
        # logger.debug('ExamyearAddView post self.request: ' + str(self.request))

        form = EmployeeAddForm(self.request.POST, request=self.request)  # this one doesn't work: form = ExamyearAddForm(request=request)

        if form.is_valid():
            # logger.debug('ExamyearAddView post is_valid form.data: ' + str(form.data))

            if self.request.user.company:
                # save examyear without commit
                self.new_employee = form.save(commit=False)
                self.new_employee.company = self.request.user.company
                self.new_employee.modifiedby = self.request.user
                # PR2018-06-07 datetime.now() is timezone naive, whereas timezone.now() is timezone aware, based on the USE_TZ setting
                self.new_employee.modifiedat = timezone.now()

                # save examyear with commit
                # PR2018-08-04 debug: don't forget argument (request), otherwise gives error 'tuple index out of range' at request = args[0]
                self.new_employee.save(request=self.request)

            return redirect('employee_list_url')
        else:
            # If the form is invalid, render the invalid form.
            return render(self.request, 'employee_add.html', {'form': form})


@method_decorator([login_required], name='dispatch')
class EmployeeEditViewXXX(UpdateView):
    # PR2018-04-17 debug: Specifying both 'fields' and 'form_class' is not permitted.
    model = m.Employee
    form_class = EmployeeEditForm
    template_name = 'employee_edit.html'
    pk_url_kwarg = 'pk'
    context_object_name = 'employee'

    def form_valid(self, form):
        employee = form.save(commit=False)
        # PR2018-08-04 debug: don't forget argument (self.request), otherwise gives error 'tuple index out of range' at request = args[0]
        employee.save(request=self.request)
        return redirect('employee_list_url')


@method_decorator([login_required], name='dispatch')
class EmployeeDeleteViewXXX(DeleteView):
    model = m.Employee
    template_name = 'employee_delete.html'  # without template_name Django searches for examyear_confirm_delete.html
    success_url = reverse_lazy('employee_list_url')

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        if self.request.user:
            self.object.delete(request=self.request)
            return HttpResponseRedirect(self.get_success_url())
        else:
            raise Http404  # or return HttpResponse('404_url')


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

# 3. get iddict variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)
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
                            temp_pk=temp_pk_str)

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

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= TeammemberUploadView ============= ')

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

# 3. save quicksave
            # quicksave is saved in UploadUserSettings

# 4. get iddict variables
                id_dict = upload_dict.get('id')
                logger.debug('id_dict: ' + str(id_dict))
                if id_dict:
                    table = id_dict.get('table', '')
                    mode = id_dict.get('mode')
                    is_absence = id_dict.get('isabsence', False)
                    logger.debug('is_absence: ' + str(is_absence))
                    if mode == 'singleshift':
                        update_wrap = calendar_employee_upload(request, upload_dict, comp_timezone, timeformat, user_lang)
                    elif mode == 'schemeshift':
                        # 'table' has no value in mode 'schemeshift'
                        update_wrap = calendar_order_upload(request, upload_dict, comp_timezone, timeformat, user_lang)

                    else:
                        #logger.debug('table: ' + str(table))
                        if table == 'teammember':
                            # called by scheme page, teammember table update
                            update_dict = {}
                            if is_absence:
                                update_dict = absence_upload(request, upload_dict, user_lang)
                            else:
                                update_dict = teammember_upload(request, upload_dict, user_lang)
                            update_wrap['teammember_update'] = update_dict


                    if mode in ('absence', 'singleshift', 'schemeshift'):
                   # J create updated employee_calendar_list
                        datefirst = upload_dict.get('calendar_datefirst')
                        datelast = upload_dict.get('calendar_datelast')

                    # 3. get employee
                        employee_pk = None
                        employee_dict = upload_dict.get('employee')
                        if employee_dict:
                            id_dict = employee_dict.get('id')
                            if id_dict:
                                employee_pk = id_dict.get('pk')

                        if employee_pk is not None and datefirst is not None and datelast is not None:
                            customer_id, order_id = None, None

                            # employee_calendar_list = prf.create_employee_calendar(datefirst, datelast, customer_id, order_id, employee_pk,
                             #                                                      comp_timezone, timeformat, user_lang, request)
                            employee_calendar_list, calendar_header_dict = prf.create_employee_calendar(datefirst, datelast, customer_id, order_id, employee_pk,
                                                                                  comp_timezone, timeformat, user_lang, request)
                            logger.debug('???????????????employee_calendar_list: ' + str(employee_calendar_list))
                            logger.debug('??????????????? calendar_header_dict: ' + str(calendar_header_dict))
                            if calendar_header_dict:
                                update_wrap.update(calendar_header_dict=calendar_header_dict)
                            if employee_calendar_list:
                                update_wrap['employee_calendar_list'] = employee_calendar_list

        # logger.debug('update_wrap: ' + str(update_wrap))

        # 9. return update_wrap
        update_wrap_json = json.dumps(update_wrap, cls=LazyEncoder)

        return HttpResponse(update_wrap_json)

#######################################

def calendar_order_upload(request, upload_dict, comp_timezone, timeformat, user_lang): # PR2019-12-06

    logger.debug('============= calendar_order_upload ============= ')
    logger.debug('upload_dict: ' + str(upload_dict))
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
    logger.debug('is_create: ' + str(is_create))

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
    logger.debug('order: ' + str(order))

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

            logger.debug('scheme_pk: ' + str(scheme_pk))
            logger.debug('is_create: ' + str(is_create))
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
            logger.debug('scheme: ' + str(scheme))

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
        logger.debug('team_dict: ' + str(team_dict))
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
                # put new team.pk in mapped_team_pk_dict, to be used for adding teammember
                mapped_team_pk_dict[team_pk] = team.pk
                team_has_changed = True
        # ---  TEAMMEMBER ---
                # also add teammember without employee > teammmeber will be added further
            else:
                team = m.Team.objects.get_or_none(id=team_pk, scheme__order__customer__company=request.user.company)
            # team has no other fields to be updated

# --- SHIFT ---
        # if current shift has changed it will be updated in plvw.update_shift when 'update' in field_dict
        # if shift is added: this shift will be put in selected schemitems. There are no multiple shift uploads (like with teammembers)
        shift = None
        shift_dict = upload_dict.get('shift')
        logger.debug('shift_dict: ' + str(shift_dict))
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
                    logger.debug('new_shift_code: ' + str(new_shift_code))
                if new_shift_code is None:
                    new_shift_code = f.get_code_with_sequence('shift', scheme, user_lang)

                logger.debug('new_shift_code: ' + str(new_shift_code))
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
                plvw.update_shift(shift, scheme, shift_dict, update_dict, user_lang, request)

# --- SCHEMEITEM ---
    # 1. get rosterdate and weekday_index. This is the date and weekday of the calendercolumn that is clcked on
        clicked_rosterdate_iso = upload_dict.get('rosterdate')
        clicked_rosterdate_dte = f.get_date_from_ISO(clicked_rosterdate_iso)
        logger.debug('clicked_rosterdate_dte: ' + str(clicked_rosterdate_dte) + ' ' + str(type(clicked_rosterdate_dte)))

        # weekday_list: ['-', '-', '-', 'update1466,1467', '-', 'create', '-', '-']
        # 'weekday_list': ['-', '-', 'update1657,2018,578', '-', 'create', '-', '-', '-'],
        weekday_list = upload_dict.get('weekday_list')
        logger.debug('weekday_list: ' + str(weekday_list) + ' ' + str(type(weekday_list)))

        # get schemeitem that is clicked on, in case weekday has multiple schemitems
        schemeitem_dict = upload_dict.get('schemeitem')
        logger.debug('schemeitem_dict: ' + str(schemeitem_dict))

        selected_scheme_pk = scheme.pk
        selected_schemeitem_pk = None
        if schemeitem_dict:
            id_dict = schemeitem_dict.get('id')
            if id_dict:
                selected_schemeitem_pk = id_dict.get('pk')
        logger.debug('selected_schemeitem_pk: ' + str(selected_schemeitem_pk))
        logger.debug('clicked_rosterdate_dte: ' + str(clicked_rosterdate_dte))
# 'weekday_list': ['-', '-', '-', 'update,1665,1607,-,-', '-', 'delete,1667,1607,-,-', '-', '-'],
        if clicked_rosterdate_dte and weekday_list:
            # loop through weekdays
            for weekday_index in range(1,8):
                weekdaylist_value = weekday_list[weekday_index]
                # weekdaylist_value: delete,1667,1607,-,-
                logger.debug('weekdaylist_value: ' + str(weekdaylist_value))
                if ',' in weekdaylist_value:
                    # loop through schemitems of this day
                    schemitems_arr = weekdaylist_value.split('|')
                    logger.debug('schemitems_arr: ' + str(schemitems_arr))
                    logger.debug('len(schemitems_arr): ' + str(len(schemitems_arr)))
                    for schemitem in schemitems_arr:
                        pk_arr = schemitem.split(',')
                        # mode = 'create', 'update' or 'delete'
                        mode = pk_arr[0]
                        schemeitem_pk = pk_arr[1]
                        scheme_pk = pk_arr[2]
                        logger.debug('mode: ' + str(mode))
                        logger.debug('scheme_pk: ' + str(scheme_pk))

                        if mode == 'create':
                            days_add = weekday_index - clicked_rosterdate_dte.isoweekday()
                            rosterdate_dte = clicked_rosterdate_dte + timedelta(days=days_add)
                            logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))

                            is_cyclestart = (weekday_index == 1)
                            schemeitem = m.Schemeitem(
                                scheme=scheme,
                                rosterdate=rosterdate_dte,
                                team=team,
                                shift=shift,
                                iscyclestart=is_cyclestart
                            )
                            schemeitem.save(request=request)
                            logger.debug('created schemeitem: ' + str(schemeitem) + ' ' + str(type(schemeitem)))

                        elif mode in ('update', 'delete'):
                            # with multiple schemeitems all schemeitem of this scheme on this day will be updated or deleted

                            schemeitem = None
                            if schemeitem_pk:
                                schemeitem = m.Schemeitem.objects.get_or_none(
                                    id=schemeitem_pk,
                                    scheme__order__customer__company=request.user.company
                                )
                                logger.debug('schemeitem: ' + str(schemeitem))
                            if schemeitem:
                                if mode == 'delete':
                                    logger.debug('delete schemeitem: ' + str(schemeitem) + ' ' + str(type(schemeitem)))
                                    schemeitem.delete(request=request)
                                else:
                                    schemeitem.team = team
                                    schemeitem.shift = shift
                                    schemeitem.save(request=request)
                                    logger.debug('update schemeitem: ' + str(schemeitem) + ' ' + str(type(schemeitem)))
                            if mode == 'delete':
                                # delete scheme completely when there are no schemeitems left in this scheme
                                count = m.Schemeitem.objects.filter(scheme=scheme).count()
                                if count == 0:
                                    logger.debug('scheme.delete: ' + str(scheme) + ' ' + str(type(scheme)))
                                    # shifts, teams annd teammembers of this scheme will also be deleted because of on_delete=CASCADE
                                    scheme.delete(request=request)

# --- TEAMMEMBER ---
        teammember_list = upload_dict.get('teammember_list')
        logger.debug('---------------------teammember_list: ' + str(teammember_list))
        if teammember_list:
            for teammember_dict in teammember_list:
                logger.debug('teammember_dict: ' + str(teammember_dict))
                id_dict = teammember_dict.get('id')
                if id_dict:
                    is_create = 'create' in id_dict
                    is_delete = 'delete' in id_dict
                    logger.debug('is_create: ' + str(is_create))

                    if is_delete:
                        # TODO
                        pass
                    else:
                        # parent_team can be different from team in upload_dict
                        parent_team = None
                        team_pk_str = id_dict.get('ppk')
                        logger.debug('team_pk_str: ' + str(team_pk_str) + str(type(team_pk_str)))
                        logger.debug('mapped_team_pk_dict: ' + str(mapped_team_pk_dict))
                        try:
                            team_pk = int(team_pk_str)
                        except:
                            # if pk_str = 'new4': get mapped new pk from  mapped_team_pk_dict
                            team_pk = mapped_team_pk_dict[team_pk_str]

                        logger.debug('team_pk: ' + str(team_pk))
                        if team_pk:
                            parent_team = m.Team.objects.get_or_none(id=team_pk, scheme=scheme)
                        logger.debug('parent_team: ' + str(parent_team))
                        if parent_team:
                            teammember = None
                            if is_create:
                                teammember = m.Teammember(team=parent_team)
                                teammember.save(request=request)
                            else:
                                teammember_pk = id_dict.get('pk')
                                logger.debug('teammember_pk: ' + str(teammember_pk))
                                if teammember_pk:
                                    teammember = m.Teammember.objects.get_or_none(id=teammember_pk, team=team)
                            logger.debug('teammember: ' + str(teammember))
                            if teammember:
                                update_dict = {}
                                # teammember.save is part of update_teammember
                                teammembers_have_changed = update_teammember(teammember, teammember_dict, update_dict, request)


# J create updated ordere_calendar_list
    datefirst_iso = upload_dict.get('calendar_datefirst')
    datelast_iso = upload_dict.get('calendar_datelast')

    if order_pk is not None and datefirst_iso is not None and datelast_iso is not None:

        calendar_dictlist, calendar_header_dict = prf. create_customer_calendar(
            datefirst_iso,
            datelast_iso,
            order_pk,
            comp_timezone,
            timeformat,
            user_lang,
            request)

        # logger.debug('employee_calendar_list: ' + str(employee_calendar_list))
        if calendar_dictlist:
            update_wrap['order_calendar_list'] = calendar_dictlist
            update_wrap['calendar_header_dict'] = calendar_header_dict

# 8. update scheme_list when changes are made
    filter_dict = {'order_pk': order_pk}
    scheme_list = pld.create_scheme_list(
        filter_dict=filter_dict,
        company=request.user.company,
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

    schemeitem_list = pld.create_schemeitem_list(
        filter_dict=filter_dict,
        company=request.user.company,
        comp_timezone=comp_timezone,
        user_lang=user_lang)
    if schemeitem_list:
        update_wrap['schemeitem_list'] = schemeitem_list

 # J. return update_wrap
    return update_wrap

#######################################

def calendar_employee_upload(request, upload_dict, comp_timezone, timeformat, user_lang): # PR2019-12-06

    logger.debug('============= calendar_employee_upload ============= ')
    logger.debug('upload_dict: ' + str(upload_dict))

# upload_dict:
    # {'id': {'table': 'teammember', 'mode': 'singleshift', 'pk': 800, 'ppk': 1879},
    # 'rosterdate': '2019-12-24', 'calendar_datefirst': '2019-12-23', 'calendar_datelast': '2019-12-29',
    # 'weekday_index': 2,
    # 'team': {'issingleshift': True},
    # 'weekday_list': ['-', '-', 'update1372', '-', '-', '-', '-', '-'],
    # 'employee': {'pk': 2567, 'ppk': 3},
    # 'order': {'pk': 1270, 'ppk': 611},
    # 'scheme': {'
    #       id': {'table': 'scheme', 'issingleshift': True},
    #       'cycle': {'value': 7, 'update': True},
    #       'datefirst': {'update': True},
    #       'datelast': {'update': True},
    #       'excludepublicholiday': {'value': False, 'update': True},
    #       'excludecompanyholiday': {'value': False, 'update': True}},
    # 'teammember': {'id': {'table': 'teammember', 'issingleshift': True, 'pk': 800, 'ppk': 1879}},
    # 'schemeitem': {'id': {'pk': 1372, 'ppk': 1524, 'table': 'schemeitem'},
    # 'offsetstart': {'value': 480, 'update': True},
    # 'offsetend': {'value': 900, 'update': True},
    #  'timeduration': {'value': 420, 'update': True}}}

    update_wrap = {}

# 1. get iddict variables
    is_create, is_delete = False, False
    id_dict = upload_dict.get('id')
    if id_dict:
        # table = 'teammember'
        is_create = ('create' in id_dict)
    logger.debug('is_create: ' + str(is_create))

# 2. get rosterdate and weekday_index. This is the date and weekday of the calendercolumn that is clcked on
    clicked_rosterdate_iso = upload_dict.get('rosterdate')
    clicked_rosterdate_dte = f.get_date_from_ISO(clicked_rosterdate_iso)

# 2. get scheme info: datefirst, datelast, excludepublicholiday, excludecompanyholiday
    scheme_datefirst_dte, scheme_datelast_dte, datefirst_weekday_index = None, None, None
    is_excludepublicholiday, is_excludecompanyholiday = False, False
    scheme_dict = upload_dict.get('scheme')
    if scheme_dict:
        field_dict = scheme_dict.get('excludepublicholiday')
        if field_dict:
            is_excludepublicholiday = field_dict.get('value', False)
        field_dict = scheme_dict.get('excludecompanyholiday')
        if field_dict:
            is_excludecompanyholiday = field_dict.get('value', False)

    # get datefirst and its weekday
        field_dict = scheme_dict.get('datefirst')
        if field_dict:
            value = field_dict.get('value')
            if value:
                scheme_datefirst_dte = f.get_date_from_ISO(value)
                if scheme_datefirst_dte:
                    datefirst_weekday_index = scheme_datefirst_dte.isoweekday()
    # get datelast
        field_dict = scheme_dict.get('datelast')
        if field_dict:
            value = field_dict.get('value')
            if value:
                scheme_datelast_dte = f.get_date_from_ISO(field_dict.get('value'))
    # logger.debug('scheme_datefirst_dte: ' + str(scheme_datefirst_dte) + ' ' + str(type(scheme_datefirst_dte)))
    # logger.debug('datefirst_weekday_index: ' + str(datefirst_weekday_index) + ' ' + str(type(datefirst_weekday_index)))
    # logger.debug('scheme_datelast_dte: ' + str(scheme_datelast_dte) + ' ' + str(type(scheme_datelast_dte)))

# 3. get schemeitem  info:offset_start, offset_end, break_duration, time_duration, pricerate_json, addition_json
    offset_start, offset_end, break_duration, time_duration = None, None, 0, 0
    pricerate_json, addition_json = None, None

    logger.debug('>>>>>>>>>>>>> upload_dict: ' + str(upload_dict))
    logger.debug('>>>>>>>>>>>>> field_dict: ' + str(upload_dict.get('offsetstart', '???')))

    field_dict = upload_dict.get('offsetstart')
    if field_dict:
        offset_start = field_dict.get('value')

    field_dict = upload_dict.get('offsetend')
    if field_dict:
        offset_end = field_dict.get('value')

    field_dict = upload_dict.get('breakduration')
    if field_dict:
        break_duration = field_dict.get('value')

    field_dict = upload_dict.get('timeduration')
    if field_dict:
        time_duration = field_dict.get('value')
    # pricerate_json = None
    # addition_json = None

    logger.debug('offset_start: ' + str(offset_start))
    logger.debug('offset_end: ' + str(offset_end))
    logger.debug('break_duration: ' + str(break_duration))
    logger.debug('time_duration: ' + str(time_duration))

# 3. get employee
    employee = None
    employee_pk = None
    employee_dict = upload_dict.get('employee')
    if employee_dict:
        employee_pk = employee_dict.get('pk')
        employee = m.Employee.objects.get_or_none(
            company=request.user.company,
            pk=employee_pk
        )
    logger.debug('employee: ' + str(employee))

# 4. get order
    order = None
    order_dict = upload_dict.get('order')
    if order_dict:
        order_pk = order_dict.get('pk')
        order = m.Order.objects.get_or_none(
            customer__company=request.user.company,
            pk=order_pk
        )
    logger.debug('order: ' + str(order))

    if order:
        scheme = None
        team = None
        teammember = None

# A. Create new teammember with one schemeitem for each weekday in weekday_list
        if is_create:
            logger.debug('Create new teammember ')

    # create new scheme
            scheme_code = employee.code if employee.code else c.SCHEME_TEXT[user_lang]
            logger.debug('scheme_code: ' + str(scheme_code))
            scheme = m.Scheme(
                order=order,
                code=scheme_code,
                issingleshift = True,
                # cycle = 7 (default)
                datefirst=scheme_datefirst_dte,
                datelast=scheme_datelast_dte,
                excludepublicholiday=is_excludepublicholiday,
                excludecompanyholiday=is_excludecompanyholiday
            )
            scheme.save(request=request)

    # create new team
            if scheme:
                team_code = employee.code if employee.code else c.TEAM_TEXT[user_lang]
                logger.debug('new_team_code: ' + str(team_code))
                team = m.Team(
                    scheme=scheme,
                    code=team_code,
                    issingleshift = True
                )
                team.save(request=request)
                logger.debug('new_team: ' + str(team))

    # create new teammember
                teammember_dict = upload_dict.get('teammember')
                # datefirst is saved in scheme, not in teammember
                if teammember_dict:
                    teammember = m.Teammember(
                        team=team,
                        employee=employee,
                        issingleshift=True
                    )
                    teammember.save(request=request)
                    logger.debug('new_teammember employee: ' + str(teammember.employee))

        else:
# if upate: get existing scheme,team and teammember
            logger.debug('Update existing teammember ')
            teammember_dict = upload_dict.get('teammember')
            if teammember_dict:
                id_dict = teammember_dict.get('id')
                if id_dict:
                    teammember_pk = id_dict.get('pk')
                    logger.debug('teammember_pk : ' + str(teammember_pk))
                    if teammember_pk:
                        # no fields are updated in teammember
                        teammember = m.Teammember.objects.get_or_none(
                            id=teammember_pk,
                            team__scheme__order__customer__company=request.user.company
                        )
                        logger.debug('teammember: ' + str(teammember))
                        if teammember:
                            team = teammember.team
                            logger.debug('team: ' + str(team))
                            if team:
                                scheme = team.scheme
                                logger.debug('scheme: ' + str(scheme))
# update fields in scheme when update (in create mode fields got already value when creating scheme)
                                if scheme :
                                    scheme.datefirst=scheme_datefirst_dte
                                    scheme.datelast=scheme_datelast_dte
                                    scheme.excludepublicholiday=is_excludepublicholiday
                                    scheme.excludecompanyholiday=is_excludecompanyholiday
                                    scheme.save(request=request)

# create and update schemeitems (for existing and created teammember)
        if teammember:
            # weekday_list: [0, 'delete_1106', 'delete_1107', 'update_1091', 'update_1094', 0, "create" 0]
            weekday_list = upload_dict.get('weekday_list')
            logger.debug('weekday_list: ' + str(weekday_list) + ' ' + str(type(weekday_list)))
            if clicked_rosterdate_dte and weekday_list:
                for weekday_index, weekdaylist_value in enumerate(weekday_list):
                    mode = weekdaylist_value[:6]
                    logger.debug('mode: ' + str(mode))
                    schemeitem = None
                    if mode == 'create':
                        days_add = weekday_index - clicked_rosterdate_dte.isoweekday()
                        rosterdate_dte = clicked_rosterdate_dte + timedelta(days=days_add)
                        logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))

                        is_cyclestart = (weekday_index == 1)
                        schemeitem = m.Schemeitem(
                            scheme=scheme,
                            team=team,
                            rosterdate=rosterdate_dte,
                            iscyclestart=is_cyclestart,
                            issingleshift = True
                        )
                        if schemeitem:
                            schemeitem_delete_update_save(schemeitem, mode,
                                                           offset_start, offset_end, break_duration, time_duration,
                                                           pricerate_json, addition_json, request)
                    elif mode in ('update', 'delete'):
                        # weekday can have multiple schemeitems
                        schemeitem_pk_list = weekdaylist_value[6:].split(',')
                        logger.debug('schemeitem_pk_list: ' + str(schemeitem_pk_list))
                        if len(schemeitem_pk_list):
                            for schemeitem_pk in schemeitem_pk_list:
                                logger.debug('schemeitem_pk: ' + str(schemeitem_pk))
                                if schemeitem_pk:
                                    schemeitem = m.Schemeitem.objects.get_or_none(
                                        id=schemeitem_pk,
                                        scheme__order__customer__company=request.user.company
                                    )
                                logger.debug('schemeitem: ' + str(schemeitem))
                                if schemeitem:
                                    schemeitem_delete_update_save(schemeitem, mode,
                                                                   offset_start, offset_end, break_duration, time_duration,
                                                                   pricerate_json, addition_json, request)

                    if mode == 'delete':
                        # also delete teammember, tem and scheme when there are no schemeitems left in this scheme
                        if scheme:
                            count = m.Schemeitem.objects.filter(scheme=scheme).count()
                            if count == 0:
                                # delete teammember
                                teammember.delete(request=request)
                                # delete team
                                team.delete(request=request)
                                # check if there are any shifts (should not be possible
                                if m.Shift.objects.filter(scheme=scheme).count():
                                    m.Shift.objects.filter(scheme=scheme).delete()
                                # delete scheme
                                scheme.delete(request=request)

# J create updated employee_calendar_list
    datefirst = upload_dict.get('calendar_datefirst')
    datelast = upload_dict.get('calendar_datelast')
    logger.debug('datefirst: ' + str(datefirst))
    logger.debug('datelast: ' + str(datelast))
    logger.debug('employee_pk: ' + str(employee_pk))

    if employee_pk is not None and datefirst is not None and datelast is not None:
        customer_id, order_id = None, None
        calendar_dictlist, calendar_header_dict = prf.create_employee_calendar(datefirst, datelast, customer_id, order_id, employee_pk,
                                               comp_timezone, timeformat, user_lang, request)

        #logger.debug('employee_calendar_list: ' + str(employee_calendar_list))
        if calendar_dictlist:
            update_wrap['employee_calendar_list'] = calendar_dictlist
            update_wrap['calendar_header_dict'] = calendar_header_dict
    # J. return update_wrap
    return update_wrap

def schemeitem_delete_update_save(schemeitem, mode,
                              offset_start, offset_end, break_duration, time_duration,
                              pricerate_json, addition_json, request): # PR2019-12-25

    logger.debug('schemeitem_delete_update_save: ' + str(mode))
    logger.debug('offset_start: ' + str(offset_start))
    logger.debug('offset_end: ' + str(offset_end))
    logger.debug('break_duration: ' + str(break_duration))
    logger.debug('time_duration: ' + str(time_duration))

    if schemeitem:
        if mode == 'delete':
            schemeitem.delete(request=request)
        else:
            schemeitem.offsetstart = offset_start
            schemeitem.offsetend = offset_end
            schemeitem.breakduration = break_duration
            schemeitem.timeduration = time_duration
            schemeitem.priceratejson = pricerate_json
            schemeitem.additionjson = addition_json
            schemeitem.save(request=request)

            logger.debug('schemeitem.save schemeitem.offsetstart: ' + str(schemeitem.offsetstart))
#######################################

def absence_upload(request, upload_dict, user_lang): # PR2019-12-13
    logger.debug(' --- absence_upload ---')
    logger.debug('upload_dict: ' + str(upload_dict))

    update_dict = {}

    # upload_dict: {
    #   'id': {'create': True, 'temp_pk': 'teammember_new2', 'table': 'teammember', 'mode': 'absence', 'isabsence': True},
    #   'employee': {'pk': 2556, 'code': 'Levinson, Daniela', 'workhoursperday': 480},
    #   'order': {'pk': 1265, 'value': 'Vakantie', 'ppk': 610, 'is_absence': True, 'update': True}}

# 1. get iddict variables
    id_dict = upload_dict.get('id')
    if id_dict:
        pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)

        logger.debug('is_delete: ' + str(is_delete))
# 2. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        update_dict = f.create_update_dict(
            c.FIELDS_TEAMMEMBER,
            table=table,
            pk=pk_int,
            ppk=ppk_int,
            temp_pk=temp_pk_str)

# A. Delete teammember and its schemitems, team and scheme
        if is_delete:
            teammember = m.Teammember.objects.get_or_none(
                id=pk_int,
                team__scheme__order__customer__company=request.user.company)

            logger.debug('is_delete: ' + str(is_delete))
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
                        # teammember, team, shift and schemitem all have 'on_delete=CASCADE'
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
                logger.debug('is_order_update: ' + str(is_order_update))
                if is_order_update:
                    new_order_pk = new_order_dict.get('pk', 0)
                    if new_order_pk:
                        new_order = m.Order.objects.get_or_none(
                            id=new_order_pk,
                            customer__company=request.user.company
                        )
                    logger.debug('new_order: ' + str(new_order))
                    if new_order is None:
                        is_order_update = False
            logger.debug('is_order_update: ' + str(is_order_update))
            logger.debug('new_order: ' + str(new_order))

# B. get info from scheme: datefirst, datelast
            is_datefirst_update = False
            datefirst_dte = None
            field_dict = upload_dict.get('datefirst')
            if field_dict:
                is_datefirst_update= field_dict.get('update', False)
                datefirst_iso = field_dict.get('value')
                datefirst_dte = f.get_date_from_ISO(datefirst_iso)
                logger.debug('datefirst_iso: ' + str(datefirst_iso))
            logger.debug('is_datefirst_update: ' + str(is_datefirst_update))

            is_datelast_update = False
            datelast_dte = None
            field_dict = upload_dict.get('datelast')
            if field_dict:
                is_datelast_update= field_dict.get('update', False)
                datelast_iso = field_dict.get('value', '')
                datelast_dte = f.get_date_from_ISO(datelast_iso)
                logger.debug('datelast_iso: ' + str(datelast_iso))
            logger.debug('is_datelast_update: ' + str(is_datelast_update))

# C. get info from  schemeitem info: offset_start, offset_end, time_duration
            offset_start, is_offsetstart_update = None, False
            field_dict = upload_dict.get('offsetstart')
            if field_dict:
                is_offsetstart_update = field_dict.get('update', False)
                offset_start = field_dict.get('value')
                logger.debug('offset_start: ' + str(offset_start))
            logger.debug('is_offsetstart_update: ' + str(is_offsetstart_update))

            offset_end, is_offset_end_update = None, False
            field_dict = upload_dict.get('offsetstart')
            if field_dict:
                is_offset_end_update = field_dict.get('update', False)
                offset_start = field_dict.get('value')
                logger.debug('offset_end: ' + str(offset_end))
            logger.debug('is_offset_end_update: ' + str(is_offset_end_update))

            breakduration, is_breakduration_update = 0, False
            field_dict = upload_dict.get('breakduration')
            if field_dict:
                is_breakduration_update = field_dict.get('update', False)
                breakduration = field_dict.get('value')
                logger.debug('breakduration: ' + str(breakduration))
            logger.debug('is_breakduration_update: ' + str(is_breakduration_update))

            timeduration, is_timeduration_update = 0, False
            field_dict = upload_dict.get('timeduration')
            if field_dict:
                is_timeduration_update = field_dict.get('update', False)
                timeduration = field_dict.get('value')
                logger.debug('timeduration: ' + str(timeduration))
            logger.debug('is_timeduration_update: ' + str(is_timeduration_update))

# C: if is_create: create new scheme, team, teammember and schemeitem(s)
            teammember = None
            if is_create:
                logger.debug('is_create: ' + str(is_create))
# D. get absence order
                if new_order is not None:
                    # employee is required
                    employee = None
                    employee_dict = upload_dict.get('employee')
                    if employee_dict:
                        employee_pk = employee_dict.get('pk')
                        if employee_pk:
                            employee = m.Employee.objects.get_or_none(
                                pk=employee_pk,
                                company=request.user.company)
                    logger.debug('employee: ' + str(employee))

                    if employee is not None:
                # create new scheme
                        # TODO: set cycle to 7 if weekdays in service are set
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

                # create new team
                        if scheme:
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
                            # TODO: create schemeitem for each weekday in service
                            # get the monday date of this week
                            this_date = f.get_firstof_week(date.today(), 0)
                            for i in range(1, 8):
                                is_cyclestart = (this_date.isoweekday() == 1)

                                # dont count absence im weekends
                                # TODo only count absence on working days, with max workhours per day
                                saved_timeduration = timeduration if i < 6 else 0
                                schemeitem = m.Schemeitem(
                                    scheme=scheme,
                                    team=team,
                                    rosterdate=this_date,
                                    iscyclestart=is_cyclestart,
                                    isabsence=True,
                                    offsetstart=offset_start,
                                    offsetend=offset_end,
                                    breakduration=breakduration,
                                    timeduration=saved_timeduration
                                )
                                schemeitem.save(request=request)
                                this_date = f.add_days_to_date(this_date, 1)
                                logger.debug('schemeitem rosterdate: ' + str(schemeitem.rosterdate))

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
                logger.debug('teammember: ' + str(teammember))
                logger.debug('scheme: ' + str(scheme))

# upate order in table scheme if it has changed
                if scheme is not None:
                    if is_order_update:
                        scheme.order = new_order
                        # update_dict['scheme']['updated'] = True
                        update_dict['order']['updated'] = True
                    if is_datefirst_update:
                        scheme.datefirst = datefirst_dte
                        update_dict['datefirst']['updated'] = True
                    if is_datelast_update:
                        scheme.datelast = datelast_dte
                        update_dict['datelast']['updated'] = True
                    if is_order_update or is_datefirst_update or is_datelast_update:
                        scheme.save(request=request)

                if is_offsetstart_update or is_offset_end_update or is_breakduration_update or is_timeduration_update:
                    schemeitems = m.Schemeitem.objects.filter(
                        team=team,
                        company=request.user.company)

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
                d.create_teammember_dict(teammember, update_dict, user_lang)

# h. remove empty attributes from update_dict
        f.remove_empty_attr_from_dict(update_dict)

# J. return update_dict
    return update_dict


def teammember_upload(request, upload_dict, user_lang): # PR2019-12-25
    logger.debug('============= TeammemberUploadView ============= ')
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
        pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)

# 2. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        # # teammember wagerate not in use
        # # teammember pricerate not in use
        update_dict = f.create_update_dict(
            c.FIELDS_TEAMMEMBER,
            table=table,
            pk=pk_int,
            ppk=ppk_int,
            temp_pk=temp_pk_str)

# A. new absence has no parent, get ppk_int from team_dict and put it back in upload_dict
        # absence is handled bij absence_upload
        # is_absence = f.get_fielddict_variable(upload_dict, 'isabsence', 'value')
        # logger.debug('is_absence: ' + str(is_absence))
        # if is_create and is_absence:
        #    team_dict = upload_dict.get('team')
        #    logger.debug('team_dict: ' + str(team_dict))
        #    if team_dict:
        #        ppk_int = int(team_dict.get('pk', 0))
         #       upload_dict['id']['ppk'] = ppk_int
        #        logger.debug('team_dict ppk_int ' + str(ppk_int))

# 2. check if parent exists (team is parent of teammember)
        parent = m.Team.objects.get_or_none(id=ppk_int, scheme__order__customer__company=request.user.company)
        if parent:
# B. Delete instance
            if is_delete:
                instance = m.Teammember.objects.get_or_none(id=pk_int, team__scheme__order__customer__company=request.user.company)
                logger.debug('instance: ' + str(instance))
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
                d.create_teammember_dict(instance, update_dict, user_lang)

# h. remove empty attributes from update_dict
        f.remove_empty_attr_from_dict(update_dict)
        # logger.debug('update_dict: ' + str(update_dict))

# J. return update_dict
    return update_dict

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_teammember(upload_dict, update_dict, request):
    # --- create teammember # PR2019-07-26
    # Note: all keys in update_dict must exist by running create_update_dict first
    logger.debug(' --- create_teammember')
    logger.debug(' upload_dict: ' + str(upload_dict))

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

                logger.debug(' parent: ' + str(parent.code))
# 3. get employee
                # employee: {value: "Chester", pk: 75, update: true}
                field_dict = upload_dict.get('employee')
                # logger.debug(' field_dict: ' + str(field_dict))
                if field_dict:
                    employee_pk = field_dict.get('pk')
                    if employee_pk:
                        employee = m.Employee.objects.get_or_none(id=employee_pk, company=request.user.company)
                        logger.debug(' employee: ' + str(employee))
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

    logger.debug(' instance: ' + str(instance))
    logger.debug(' update_dict: ' + str(update_dict))
    return instance

def update_teammember(instance, upload_dict, update_dict, request):
    # --- update existing and new teammmber PR2-019-06-01
    # called by teammember_upload, absence_upload
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_teammmber ---')
    logger.debug('upload_dict' + str(upload_dict))

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
            logger.debug('field_dict' + str(field_dict))
            if field_dict:
                if 'update' in field_dict:
                    logger.debug('field: ' + str(field))
                    logger.debug('field_dict: ' + str(field_dict))

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
                        logger.debug('field: ' + str(field))
                        pk = field_dict.get('pk')
                        logger.debug('pk: ' + str(pk))
                        employee = None
                        if pk:
                            employee = m.Employee.objects.get_or_none(
                                id=pk,
                                company=request.user.company)

                        logger.debug('employee: ' + str(employee))
                # also update when employee = None: employee will be removed
                        setattr(instance, field, employee)
                        is_updated = True

                    elif field == 'workhoursperday':
                        # value is entered as string ('7.5'), in hours
                        # TODO add hour picker in page
                        value = str(field_dict.get('value'))

                        # convert workhoursperday_hours to minutes
                        value_float, msg_err = f.get_float_from_string(value)
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                            has_error = True
                        else:
                            new_value = int(value_float * 60)
                            old_value = getattr(instance, field, 0)
                            if new_value != old_value:
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

        # 4. save changes in fields 'priceratejson'
                    elif field == 'priceratejson':
                        new_rate, msg_err = f.get_rate_from_value(new_value)
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
                            saved_value = getattr(instance, field)
                            if new_rate != saved_value:
                                setattr(instance, field, new_rate)
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
                        update_dict[field]['updated'] = True
                        save_changes = True

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
                has_changed = True
            except:
                update_dict['id']['error'] = _('This teammember could not be updated.')

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

    # get coldef_list employee
            lang = user_lang if user_lang in c.COLDEF_EMPLOYEE else c.LANG_DEFAULT
            coldef_list = c.COLDEF_EMPLOYEE[lang]

    # get caption list employee
            lang = user_lang if user_lang in c.CAPTION_IMPORT else c.LANG_DEFAULT
            captions_dict = c.CAPTION_IMPORT[lang]

            # oooooooooooooo get_mapped_coldefs_order ooooooooooooooooooooooooooooooooooooooooooooooooooo
            # function creates dict of fieldnames of table Order
            # and gets mapped coldefs from table Companysetting
            # It is used in ImportOrdert to map Excel fieldnames to TSA fieldnames
            # mapped_coldefs: {
            #     "worksheetname": "Compleetlijst",
            #     "no_header": 0,
            #     "coldefs": [{"tsaKey": "idnumber", "caption": "ID nummer", "excKey": "ID"},
            #                 {"tsapKey": "lastname", "caption": "Achternaam", "excKey": "ANAAM"}, ....]
            logger.debug('==============get_mapped_coldefs_order ============= ')

            mapped_coldefs = {}

            # get mapped coldefs from table Companysetting
            # get stored setting from Companysetting
            stored_setting = {}
            settings_json = m.Companysetting.get_setting(c.KEY_EMPLOYEE_COLDEFS, request.user.company)
            logger.debug('settings_json: ' + str(settings_json))
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
                # logger.debug('stored_coldefs: ' + str(stored_coldefs))

                # skip if stored_coldefs does not exist
                if stored_coldefs:
                    # loop through coldef_list
                    for coldef in coldef_list:
                        # coldef = {'tsaKey': 'employee', 'caption': 'Cliënt'}
                        # get fieldname from coldef
                        fieldname = coldef.get('tsaKey')
                        # logger.debug('fieldname: ' + str(fieldname))

                        if fieldname:  # fieldname should always be present
                            # check if fieldname exists in stored_coldefs
                            if fieldname in stored_coldefs:
                                # if so, add Excel name with key 'excKey' to coldef
                                coldef['excKey'] = stored_coldefs[fieldname]
                                # logger.debug('stored_coldefs[fieldname]: ' + str(stored_coldefs[fieldname]))

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

            logger.debug('param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'employee_import.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadSetting(View):   # PR2019-03-10
    # function updates mapped fields, no_header and worksheetname in table Companysetting
    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= EmployeeImportUploadSetting ============= ')
        # logger.debug('request.POST' + str(request.POST) )

        if request.user is not None :
            if request.user.company is not None:
                # request.POST:
                # {'setting': ['{"worksheetname":"Level",
                #                "no_header":false,
                #                "coldefs":{"employee":"level_name","ordername":"level_abbrev"}}']}>

                #fieldlist = ["employee", "ordername", "orderdatefirst", "orderdatelast"]

                if request.POST['setting']:
                    new_setting_json = request.POST['setting']
                    # new_setting is in json format, no need for json.loads and json.dumps
                    # new_setting = json.loads(request.POST['setting'])
                    # new_setting_json = json.dumps(new_setting)

                    m.Companysetting.set_setting(c.KEY_EMPLOYEE_COLDEFS, new_setting_json, request.user.company)

        return HttpResponse(json.dumps("Import settings uploaded", cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadData(View):  # PR2018-12-04 PR2019-08-05

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmployeeImportUploadData ============= ')

# 1. Reset language
        # PR2019-03-15 Debug: language gets lost, get request.user.lang again
        user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
        activate(user_lang)

# 2. get stored setting from Companysetting
        codecalc = 'linked'
        tsaKey_list = []
        stored_setting_json = m.Companysetting.get_setting(c.KEY_EMPLOYEE_COLDEFS, request.user.company)
        if stored_setting_json:
            stored_setting = json.loads(stored_setting_json)
            if stored_setting:
                codecalc = stored_setting.get('codecalc', 'linked')
                logger.debug('codecalc: ' + str(codecalc))

                stored_coldefs = stored_setting.get('coldefs')
                logger.debug('stored_coldefs: ' + str(stored_coldefs))
                # stored_coldefs: {'namelast': 'ANAAM', 'namefirst': 'Voor_namen', 'identifier': 'ID', ...}
                if stored_coldefs:
                    tsaKey_list = list(stored_coldefs.keys())

        params = {}
        logfile = []

# 2. get upload_dict from request.POST
        employee_list = []
        if request.user is not None:
            if request.user.company is not None:
                upload_json = request.POST.get('upload', None)
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    if upload_dict:
                        employee_list = upload_dict.get('employees')

        if employee_list:
            today_dte = f.get_today_dateobj()
            today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)

            logfile.append(
                '===================================================================================== ')
            logfile.append(
                '  ' + str(request.user.company.code) + '  -  Import employees : ' + str(today_formatted))
            logfile.append(
                '===================================================================================== ')

            # detect dateformat of field 'datefirst'
            format_str = f.detect_dateformat(employee_list, 'datefirst')
            logger.debug("detect_dateformat format_str: " + str(format_str))

            update_list = []
            for empl_dict in employee_list:
                # logger.debug('--------- import employee   ------------')
                # logger.debug(str(empl_dict))
                # 'code', 'namelast', 'namefirst',  'prefix', 'email', 'tel', 'datefirst',

                update_dict = {}
                is_update = False

                new_payrollcode = empl_dict.get('payrollcode')
                new_identifier = empl_dict.get('identifier')

                namelast_str = empl_dict.get('namelast', '')[0:c.NAME_MAX_LENGTH]
                new_namelast = namelast_str if namelast_str else None

                namefirst_str = empl_dict.get('namefirst', '')[0:c.NAME_MAX_LENGTH]
                new_namefirst = namefirst_str if namefirst_str else None

                # get code or calculate code, depending on value of 'codecalc
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
                code_text = (" " * 5 + code_str + " " * 30)[:35]

# lookup employee
                # multiple_found and value_too_long return the lookup_value of the error field
                employee, no_value, multiple_found, value_too_long = lookup_employee(new_payrollcode, new_identifier, request)
                if no_value:
                    logfile.append(code_text + 'is skipped. No_value given for identifier and payrollcode.')
                elif value_too_long:
                    logfile.append(code_text + "is skipped. Value '" + value_too_long + "' is too long. Max " + c.CODE_MAX_LENGTH + " characters.")
                elif multiple_found:
                    logfile.append(code_text + "is skipped. Value '" + multiple_found + "' is found multiple times.")
                else:

                    if employee is None:
                        employee = m.Employee(
                            company=request.user.company,
                            code=new_code,
                            namelast=new_namelast,
                            namefirst=new_namefirst,
                            identifier=new_identifier,
                            payrollcode=new_payrollcode
                            )
                        logfile.append(code_text + 'is created.')
                    else:
                        is_update = True
                        logfile.append(code_text + 'already exists.')

                    if employee:
                        if 'code' in tsaKey_list:
                            old_code = employee.code if is_update else None
                            if new_code != old_code:
                                employee.code = new_code
                                old_str = ' is updated from: ' + (old_code or '<blank>') + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'short name' + " " * 25)[:35] +
                                               old_str +  (new_code or '<blank>'))

                        if 'namelast' in tsaKey_list:
                            old_value = employee.namelast if is_update else None
                            if new_namelast != old_value:
                                employee.namelast = new_namelast
                                old_str = ' is updated from: ' + (old_value or '<blank>') + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'last name' + " " * 25)[:35] +
                                               old_str + (new_namelast or '<blank>'))

                        if 'namefirst' in tsaKey_list:
                            old_value = employee.namefirst if is_update else None
                            if new_namefirst != old_value:
                                employee.namefirst = new_namefirst
                                old_str = ' is updated from: ' + (old_value or '<blank>') + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'first name' + " " * 25)[:35] +
                                               old_str + (new_namefirst or '<blank>'))

                        if 'identifier' in tsaKey_list:
                            old_value = employee.identifier if is_update else None
                            if new_identifier != old_value:
                                employee.identifier = new_identifier
                                old_str = ' is updated from: ' + (old_value or '<blank>') + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'identifier' + " " * 25)[:35] +
                                               old_str + (new_identifier or '<blank>'))

                        if 'payrollcode' in tsaKey_list:
                            old_value = employee.payrollcode if is_update else None
                            if new_payrollcode != old_value:
                                employee.payrollcode = new_payrollcode
                                old_str = ' is updated from: ' + (old_value or '<blank>') + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'payrollcode' + " " * 25)[:35] +
                                               old_str + (new_payrollcode or '<blank>'))

                        if 'email' in tsaKey_list:
                            email_str = empl_dict.get('email', '')[0:c.NAME_MAX_LENGTH]
                            new_email = email_str if email_str else None
                            old_value = employee.email if is_update else None
                            if new_email != old_value:
                                employee.email = new_email
                                old_str = ' is updated from: ' + (old_value or '<blank>') + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'email address' + " " * 25)[:35] +
                                               old_str + (new_email or '<blank>'))

                        if 'telephone' in tsaKey_list:
                            telephone_str = empl_dict.get('telephone', '')[0:c.USERNAME_SLICED_MAX_LENGTH]
                            new_telephone = telephone_str if telephone_str else None
                            old_value = employee.telephone if is_update else None
                            if new_telephone != old_value:
                                employee.telephone = new_telephone
                                old_str = ' is updated from: ' + (old_value or '<blank>') + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'telephone' + " " * 25)[:35] +
                                               old_str + (new_telephone or '<blank>'))

                        if 'datefirst' in tsaKey_list:
                            datefirst_str = empl_dict.get('datefirst')
                            new_datefirst_dte = None
                            old_datefirst_dte = employee.datefirst if is_update else None
                            if datefirst_str and format_str:
                                datefirst_iso = f.get_dateISO_from_string(datefirst_str, format_str)
                                new_datefirst_dte = f.get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
                            if new_datefirst_dte != old_datefirst_dte:
                                employee.datefirst = new_datefirst_dte
                                old_datefirst_str = old_datefirst_dte.isoformat() if old_datefirst_dte else '<blank>'
                                new_datefirst_str = new_datefirst_dte.isoformat() if new_datefirst_dte else '<blank>'
                                old_str = ' is updated from: ' + old_datefirst_str + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'first date in service' + " " * 25)[:35] +
                                               old_str + new_datefirst_str)

                        if 'datelast' in tsaKey_list:
                            datelast_str = empl_dict.get('datelast')
                            new_datelast_dte = None
                            old_datelast_dte = employee.datelast if is_update else None
                            if datelast_str and format_str:
                                datelast_iso = f.get_dateISO_from_string(datelast_str, format_str)
                                new_datelast_dte = f.get_date_from_ISO(datelast_iso)  # datelast_dte: 1900-01-01 <class 'datetime.date'>
                            if new_datelast_dte != old_datelast_dte:
                                employee.datelast = new_datelast_dte
                                old_datelast_str = old_datelast_dte.isoformat() if old_datelast_dte else '<blank>'
                                new_datelast_str = new_datelast_dte.isoformat() if new_datelast_dte else '<blank>'
                                old_str = ' is updated from: ' + old_datelast_str + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'last date in service' + " " * 25)[:35] +
                                               old_str + new_datelast_str)

                        if 'workhours' in tsaKey_list:
                            workhours = empl_dict.get('workhours')
                            new_workhours_per_week_minutes = 0
                            old_workhours = employee.workhours if is_update else None
                            if workhours:
                                workhours_float, msg_err = f.get_float_from_string(workhours)
                                new_workhours_per_week_minutes = int(workhours_float * 60)
                            if new_workhours_per_week_minutes != old_workhours:
                                employee.workhours = new_workhours_per_week_minutes
                                old_str = ' is updated from: ' + str(old_workhours / 60) + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'workhours per week' + " " * 25)[:35] +
                                               old_str + str(new_workhours_per_week_minutes / 60))

                        if 'workdays' in tsaKey_list:
                            # workdays per week * 1440 (one day has 1440 minutes)
                            workdays = empl_dict.get('workdays')
                            new_workdays_per_week_minutes = 0
                            old_workdays = employee.workdays if is_update else None
                            if workdays:
                                workdays_float, msg_err = f.get_float_from_string(workdays)
                                new_workdays_per_week_minutes = int(workdays_float * 1440)
                            if new_workdays_per_week_minutes != old_workdays:
                                employee.workdays = new_workdays_per_week_minutes
                                old_str = ' is updated from: ' + str(old_workdays / 60) + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'workdays per week' + " " * 25)[:35] +
                                               old_str + str(new_workdays_per_week_minutes / 1440))

                        if 'leavedays' in tsaKey_list:
                        # leave days per year, full time, * 1440 (one day has 1440 minutes)
                            leavedays = empl_dict.get('leavedays')
                            leavedays_per_year_minutes = 0
                            old_leavedays = employee.leavedays if is_update else None
                            if leavedays:
                                leavedays_float, msg_err = f.get_float_from_string(leavedays)
                                leavedays_per_year_minutes = int(leavedays_float * 1440)
                            if leavedays_per_year_minutes != old_leavedays:
                                employee.leavedays = leavedays_per_year_minutes
                                old_str = ' is updated from: ' + str(old_leavedays / 60) + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'leave days per week' + " " * 25)[:35] +
                                               old_str + str(leavedays_per_year_minutes / 1440))

                        if 'datelast' in tsaKey_list:
                            # set inactive True if employee more than 1 month out of service
                            today_dte = f.get_today_dateobj()
                            firstof_thismonth_dte = f.get_firstof_month(today_dte)
                            lastof_thismonth_dte = f.get_lastof_month(today_dte)
                            is_inactive = False
                            if employee.datelast is None:
                                if employee.datefirst is not None:
                                    if employee.datefirst > lastof_thismonth_dte:
                                        is_inactive = True
                            elif employee.datelast < firstof_thismonth_dte:
                                is_inactive = True

                            old_inactive = employee.inactive
                            if is_inactive != old_inactive:
                                employee.inactive = is_inactive
                                old_str = ' is updated from: ' + str(old_inactive) + ' to: ' if is_update else ''
                                logfile.append((" " * 10 + 'inactive' + " " * 25)[:35] +
                                               old_str + str(is_inactive))


                        # TODO: lookup wagecode in tablewagecode, create if not exists

                        try:
                            employee.save(request=request)
                            # logger.debug('saved new_employee: ' + str(new_employee))
                        except:
                            has_error = True
                            update_dict['e_lastname'] = _('An error occurred. The employee data is not saved.')
                            # logger.debug('has_error: ' + str(new_employee))

                        if employee.pk:

                            if employee.code:
                                update_dict['s_code'] = employee.code
                            if employee.identifier:
                                update_dict['s_identifier'] = employee.identifier
                            if employee.namelast:
                                update_dict['s_namelast'] = employee.namelast
                            if employee.namefirst:
                                update_dict['s_namefirst'] = employee.namefirst
                            if employee.email:
                                update_dict['s_email'] = employee.email
                            if employee.telephone:
                                update_dict['s_telephone'] = employee.telephone
                            # address zipcode city country
                            if employee.datefirst:
                                update_dict['s_datefirst'] = employee.datefirst
                            if employee.datelast:
                                update_dict['s_datelast'] = employee.datelast
                            if employee.workhours:
                                update_dict['s_workhours'] = employee.workhours / 60
                            if employee.workdays:
                                # workdays per week * 1440 (one day has 1440 minutes)
                                update_dict['s_workdays'] = employee.workdays / 1440
                            if employee.leavedays:
                                # leave days per year, full time, * 1440 (one day has 1440 minutes)
                                update_dict['s_leavedays'] = employee.leavedays / 1440

                            # wagerate wagecode
                            # priceratejson additionjson

                            # logger.debug(str(new_student.id) + ': Student ' + new_student.lastname_firstname_initials + ' created ')

                            # from https://docs.quantifiedcode.com/python-anti-patterns/readability/not_using_items_to_iterate_over_a_dictionary.html
                            # for key, val in student.items():
                            #    logger.debug( str(key) +': ' + val + '" found in "' + str(student) + '"')

                        # json_dumps_err_list = json.dumps(msg_list, cls=f.LazyEncoder)
                        if update_dict:  # 'Any' returns True if any element of the iterable is true.
                            update_list.append(update_dict)
            # --- end for employee in employees

            if update_list:  # 'Any' returns True if any element of the iterable is true.
                params['employee_list'] = update_list
            if logfile:  # 'Any' returns True if any element of the iterable is true.
                params['logfile'] = logfile
                    # params.append(new_employee)

         # return HttpResponse(json.dumps(params))
        return HttpResponse(json.dumps(params, cls=LazyEncoder))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def lookup_employee(payrollcode, identifier , request):  # PR2019-12-17
    # function searches for existing employee in the followoing order: payrollcode, identifier

    employee = None
    multiple_found = None
    value_too_long = None
    has_value_count = 0
    for lookup_field in ('payrollcode', 'identifier'):
        lookup_value = identifier if lookup_field == 'identifier' else payrollcode
# B search employee by identifier
        if lookup_value:
            has_value_count += 1
        # check if value is not too long
            if len(lookup_value) > c.CODE_MAX_LENGTH:
                # dont lookup other fields when lookup_value is too long
                value_too_long = lookup_value
                break
            else:
        # check if identifier__iexact already exists
                employees = m.Employee.objects.filter(
                    identifier__iexact=lookup_value,
                    company=request.user.company)
                row_count = 0
                employee = None
                for employee in employees:
                    row_count += 1
                if row_count > 1:
                    multiple_found = lookup_value
                    employee = None
                    break
    # one employee found: dont serach rest of fields
        if employee:
            break
    no_value = (has_value_count == 0)
    return employee, no_value, multiple_found, value_too_long


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_employee(upload_dict, update_dict, request):
    # --- create employee # PR2019-07-30
    # Note: all keys in update_dict must exist by running create_update_dict first
    # logger.debug(' --- create_customer_or_order')

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
                has_error = validate_code_name_identifier(table, 'code', code, parent, update_dict)
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
    logger.debug(' --- update_employee')
    logger.debug('upload_dict' + str(upload_dict))

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

# 2. save changes in field 'code', required field
                    if field in ['code', 'identifier']:
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:
            # validate_code_name_id checks for null, too long and exists. Puts msg_err in update_dict
                            has_error = validate_code_name_identifier(
                                table='employee',
                                field=field,
                                new_value=new_value, parent=parent,
                                update_dict=update_dict,
                                this_pk=instance.pk)
                            if not has_error:
                                # c. save field if changed and no_error
                                setattr(instance, field, new_value)
                                is_updated = True

    # 3. save changes in fields 'namefirst', 'namelast'
                    elif field in ['namefirst', 'namelast']:
                        saved_value = getattr(instance, field)
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
                        logger.debug('new_rate' + str(new_rate))
                        logger.debug('msg_err' + str(msg_err))
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
                            saved_value = getattr(instance, field)
                            if new_rate != saved_value:
                                setattr(instance, field, new_rate)
                                is_updated = True

                    elif field in ['workhoursperday']:
                        value = str(field_dict.get('value'))
                        # convert workhoursperday_hours to minutes per week
                        value_float, msg_err = f.get_float_from_string(value)
                        logger.debug('value_float: ' + str(value_float) + ' ' + str(type(value_float)))

                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
                            # get workdays from instance
                            workdays = getattr(instance, 'workdays', c.WORKDAYS_DEFAULT)
                            logger.debug('workdays: ' + str(workdays) + ' ' + str(type(workdays)))

                            new_workhours_pwk = int(value_float * workdays / 24)  # (hours * 60) / (workdays_in_minutes / 1440)
                            logger.debug('new_workhours_pwk: ' + str(new_workhours_pwk) + ' ' + str(type(new_workhours_pwk)))

                            old_value = getattr(instance, 'workhours', 0)
                            if new_workhours_pwk != old_value:
                                setattr(instance, 'workhours', new_workhours_pwk)
                                save_changes = True
                                update_dict[field]['updated'] = True
                                logger.debug('new_workhours_pwk[' + field + ']: ' + str(new_workhours_pwk))
                                logger.debug('saved_value workhours]: ' + str(getattr(instance, 'workhours')))

# 4. save changes in field 'inactive'
                    elif field == 'inactive':
                        logger.debug('inactive new_value]: ' + str(new_value) + ' ' + str(type(new_value)))
                        saved_value = getattr(instance, field)
                        logger.debug('inactive saved_value]: ' + str(saved_value) + ' ' + str(type(saved_value)))
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True
                            logger.debug('inactive is_updated]: ' + str(is_updated) + ' ' + str(type(is_updated)))

                    else:
                        saved_value = getattr(instance, field)
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
    # logger.debug(' --- get_initials ---')
    # PR2019-08-05 get first letter of each firstname

    initials = ''
    if firstnames:
        arr = firstnames.split()  # If separator is not provided then any white space is a separator.
        for firstname in arr:
            if initials and with_space:
                initials = initials + ' '
            initial = firstname[0]
            initials = initials + initial.upper()
    # logger.debug('initials: ' + str(initials))
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
