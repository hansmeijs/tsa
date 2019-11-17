
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
from datetime import date, datetime

import json
from django.utils.functional import Promise
from django.utils.encoding import force_text
from django.core.serializers.json import DjangoJSONEncoder

from tsap.settings import TIME_ZONE

from tsap import constants as c
from tsap import functions as f

from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_namelast_namefirst, validate_code_name_identifier, validate_employee_has_emplhours

from companies import models as m
from employees.forms import EmployeeAddForm, EmployeeEditForm
from employees import dicts as d
from planning import dicts as pld

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

            param = get_headerbar_param(request, {
                'lang': user_lang,
                'timezone': comp_timezone,
                'weekdays': weekdays_json,
                'months': months_json,
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'employees.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeAddView(CreateView):

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
class EmployeeEditView(UpdateView):
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
class EmployeeDeleteView(DeleteView):
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

    # a. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # b. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)

    # c. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)

    # d. Create empty update_dict with keys for all fields. Unused ones will be removed at the end

                    # FIELDS_EMPLOYEE = ('id', 'company', 'code', 'datefirst', 'datelast',
                    #                    'namelast', 'namefirst', 'email', 'telephone', 'identifier',
                    #                    'address', 'zipcode', 'city', 'country',
                    #                    'payrollcode', 'wagerate', 'wagecode', 'workhours', 'workdays', 'leavedays',
                    #                    'priceratejson', 'additionjson', 'inactive', 'locked')
                    update_dict = f.create_update_dict(c.FIELDS_EMPLOYEE, id_dict)

    # e. check if parent exists (company is parent of employee)
                    # get_parent adds 'ppk' and 'table' to update_dict
                    parent = m.get_parent(table, ppk_int, update_dict, request)
                    if parent:
# D. Delete instance
                        if is_delete:
                            instance = m.Employee.objects.get_or_none(id=pk_int, company=parent)
                            if instance:
                                this_text = _("Employee '%(tbl)s'") % {'tbl': instance.code}
     # a. check if employee has emplhours
                                has_emplhours = validate_employee_has_emplhours(instance, update_dict)
                                if not has_emplhours:
    # b. check if there are teammembers with this employee
                                    delete_employee_from_teammember(instance, request)
     # c. delete employee
                                    deleted_ok = m.delete_instance(instance, update_dict, request, this_text)
                                    if deleted_ok:
                                        instance = None
                        else:
# B. Create new employee
                            if is_create:
                                instance = create_employee(upload_dict, update_dict, request)
    # C. Get existing employee
                            else:
                                instance = m.Employee.objects.get_or_none(id=pk_int, company=parent)

# E. Update employee, also when it is created
                            if instance:
                                update_employee(instance, parent, upload_dict, update_dict, user_lang, request)

    # b. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)
    # c. add update_dict to update_wrap
                    if update_dict:
                        update_list = []
                        update_list.append(update_dict)
                        update_wrap['update_list'] = update_list

# F. return update_wrap
            return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

#######################################

@method_decorator([login_required], name='dispatch')
class TeammemberUploadView(UpdateView):  # PR2019-07-28

    def post(self, request, *args, **kwargs):
        # logger.debug('============= TeammemberUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

    # a. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

    # b. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                # logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {id: {temp_pk: "new_1", create: true, table: "teammember"}
                #               cat: {value: 512}
                #               employee: {pk: 0, code: null, workhoursperday: 0}
                #               team: {pk: 3, value: "Ziek", ppk: 3, cat: 0, update: true}
                #               workhoursperday: {value: 0, update: true}

                # upload_dict: {'id': {'pk': 471, 'ppk': 1517, 'table': 'teammember', 'delete': True}}

    # c. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)

    # d. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    # FIELDS_TEAMMEMBER = ('id', 'team', 'cat', 'employee', 'datefirst', 'datelast',
                    #                      'workhoursperday', 'wagerate', 'wagefactor',
                    #                      'offsetstart', 'offsetend',
                    #                      'priceratejson', 'additionjson', 'override', 'jsonsetting')

                    # # teammember wagerate not in use
                    # # teammember pricerate not in use
                    update_dict = f.create_update_dict(c.FIELDS_TEAMMEMBER, id_dict)

# A. new absence has no parent, get ppk_int from team_dict and put it back in upload_dict
                    is_absence = f.get_fielddict_variable(upload_dict, 'isabsence', 'value')
                    if is_create and is_absence:
                        team_dict = upload_dict.get('team')
                        # logger.debug('team_dict: ' + str(team_dict))
                        if team_dict:
                            ppk_int = int(team_dict.get('pk', 0))
                            upload_dict['id']['ppk'] = ppk_int
                            # logger.debug('team_dict ppk_int ' + str(ppk_int))

    # 2. check if parent exists (team is parent of teammember)
                    parent = m.Team.objects.get_or_none(id=ppk_int, scheme__order__customer__company=request.user.company)
                    if parent:
# B. Delete instance
                        if is_delete:
                            instance = m.Teammember.objects.get_or_none(id=pk_int, team__scheme__order__customer__company=request.user.company)
                            # logger.debug('instance: ' + str(instance))
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

# g. update schemeitem_list when changes are made
                        schemeitem_list = pld.create_schemeitem_list(
                            request=request,
                            customer=parent.scheme.order.customer,
                            comp_timezone=comp_timezone,
                            user_lang=user_lang)
                        if schemeitem_list:
                            update_wrap['schemeitem_list'] = schemeitem_list

 # h. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)
                    # logger.debug('update_dict: ' + str(update_dict))

# I. add update_dict to update_wrap
                    if update_dict:
                        update_list = []
                        update_list.append(update_dict)
                        update_wrap['update_list'] = update_list

# J. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_teammember(upload_dict, update_dict, request):
    # --- create teammember # PR2019-07-26
    # Note: all keys in update_dict must exist by running create_update_dict first
    # logger.debug(' --- create_teammember')

    # upload_dict:
    # 'id': {'temp_pk': 'new_1', 'create': True, 'table': 'teammember', 'ppk': 1396},
    # 'cat': {'value': 512},
    # 'employee': {'pk': 2104, 'code': 'aa', 'workhoursperday': 0},
    # 'team': {'pk': 1396, 'value': 'Vakantie', 'ppk': 1136, 'cat': 512, 'update': True},
    # 'workhoursperday': {'value': 0, 'update': True}}
    instance = None

# 1. get_iddict_variables
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


                # logger.debug(' parent: ' + str(parent.code))
# 3. get employee
                # employee: {value: "Chester", pk: 75, update: true}
                field_dict = upload_dict.get('employee')
                # logger.debug(' field_dict: ' + str(field_dict))
                if field_dict:
                    employee_pk = field_dict.get('pk')
                    if employee_pk:
                        employee = m.Employee.objects.get_or_none(id=employee_pk, company=request.user.company)
                        # logger.debug(' employee: ' + str(employee))
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

    return instance

def update_teammember(instance, upload_dict, update_dict, request):
    # --- update existing and new teammmber PR2-019-06-01
    # add new values to update_dict (don't reset update_dict, it has values)
    # logger.debug(' --- update_teammmber ---')
    # logger.debug('upload_dict' + str(upload_dict))

    has_error = False
    if instance:

# 1. get_iddict_variables
        save_changes = False
        for field in c.FIELDS_TEAMMEMBER:

# --- get field_dict from  item_dict if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
# a. get new_value
                    new_value = field_dict.get('value')

# 2. save changes in field 'team' (in absence mode parent 'team'' can be changed)
                    if field == 'team':
                        pk = field_dict.get('pk', 0)
                        team = None
                        if pk:
                            team = m.Team.objects.get_or_none(
                                id=pk,
                                scheme__order__customer__company=request.user.company)
                        # logger.debug('team]: ' + str(team) + ' ' + str(type(team)))

                        if team is None:
                            update_dict[field]['error'] = _('This field cannot be blank.')
                            has_error = True
                        else:
                            setattr(instance, field, team)
                            is_updated = True

# 2. save changes in field 'employee'
            # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}
                    elif field == 'employee':
                        pk = field_dict.get('pk')
                        employee = None
                        if pk:
                            employee = m.Employee.objects.get_or_none(
                                id=pk,
                                company=request.user.company)
                        # logger.debug('employee]: ' + str(employee) + ' ' + str(type(employee)))

                        # don't skip blank: teammember ccan be blank
                        #if employee is None:
                        #    update_dict[field]['error'] = _('This field cannot be blank.')
                        #    has_error = True
                        #else:
                            # don't skip double: employee can be multiple times in team, at different dates
                            # msg_err = e.validate_employee_exists_in_teammembers(employee, instance.team, instance.pk)
                            #if msg_err:
                            #    update_dict[field]['error'] = msg_err
                            #    has_error = True
                            #else:
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
            except:
                update_dict['id']['error'] = _('This teammember could not be updated.')
                has_error = True

    return has_error


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
            lang = user_lang if user_lang in c.CAPTION_EMPLOYEE else c.LANG_DEFAULT
            captions_dict = c.CAPTION_EMPLOYEE[lang]

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
            self.no_header = False
            self.worksheetname = ''
            self.codecalc = 'linked'
            if 'no_header' in stored_setting:
                self.no_header = True if Lower(stored_setting['no_header']) == 'true' else False
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
                'no_header': self.no_header,
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

        params = []
        if request.user is not None:
            if request.user.company is not None:
                tablename = 'employee'

# get stored setting from Companysetting
                stored_setting_json = m.Companysetting.get_setting(c.KEY_EMPLOYEE_COLDEFS, request.user.company)
                codecalc  = 'linked'
                if stored_setting_json:
                    stored_setting = json.loads(stored_setting_json)
                    if stored_setting:
                        codecalc = stored_setting.get('codecalc', 'linked')
                # logger.debug('codecalc: ' + str(codecalc))

                if 'employees' in request.POST:
                    employees = json.loads(request.POST['employees'])

            # detect dateformat of field 'datefirst'
                    format_str = f.detect_dateformat(employees, 'datefirst')
                    logger.debug("detect_dateformat format_str: " + str(format_str))

                    for employee in employees:
                        logger.debug('--------- import employee   ------------')
                        logger.debug(str(employee))
                        # 'code', 'namelast', 'namefirst',  'prefix', 'email', 'tel', 'datefirst',
                        employee_dict = {}

                        #field_list = ('id', 'code', 'namefirst', 'namelast', 'email', 'telephone', 'identifier',
                        #             'datefirst', 'datelast', 'wagecode', 'workhours', 'inactive')

                        namelast = None
                        namelast_str = employee.get('namelast', '')[0:c.NAME_MAX_LENGTH]
                        if namelast_str:
                            namelast = namelast_str

                        namefirst = None
                        namefirst_str = employee.get('namefirst', '')[0:c.NAME_MAX_LENGTH]
                        if namefirst_str:
                            namefirst = namefirst_str
                        logger.debug('namelast: ' + str(namelast) + ' namefirst: ' + str(namefirst))

                        # truncate input if necessary
# get code or calculate code, depending on value of 'codecalcc
                        code = None
                        if codecalc == 'firstname':
                            code_str = get_lastname_firstfirstname(namelast_str, namefirst_str)
                        elif codecalc == 'initials':
                            code_str = get_lastname_initials(namelast_str, namefirst_str, True) # PR2019-08-05
                        elif codecalc == 'nospace':
                            code_str = get_lastname_initials(namelast_str, namefirst_str, False)  # PR2019-08-05
                        else:  #  codecalc == 'linked'
                            code_str = employee.get('code', '')
                        if code_str:
                            code = code_str[0:c.CODE_MAX_LENGTH]

                        identifier = None
                        identifier_str = employee.get('identifier', '')[0:c.CODE_MAX_LENGTH]
                        if identifier_str:
                            identifier = identifier_str

             # check if employee code already exists
                        has_error = validate_code_name_identifier(tablename, 'code', code, request.user.company, employee_dict)
                        if has_error:
                            logger.debug('code <' + str(code) + '> has error: ' + str(employee_dict))
                        else:
                            logger.debug('code <' + str(code) + '> has no error ')

            # check if employee identifier already exists
                            has_error = validate_code_name_identifier(tablename, 'identifier', code, request.user.company, employee_dict)
                            if has_error:
                                logger.debug('identifier <' + str(identifier) + '> has error: ' + str(employee_dict))
                            else:
                                logger.debug('identifier <' + str(identifier) + '> has no error')

            # check if employee namefirst / namelast combination already exists
                                has_error = validate_namelast_namefirst(namelast_str, namefirst_str, request.user.company, 'namelast', employee_dict)
                                if has_error:
                                    logger.debug('namelast, namefirst has error: ' + str(employee_dict))
                                else:
                                    logger.debug('namelast, namefirst has no error')

                                    new_employee = m.Employee(
                                        company=request.user.company,
                                        code=code,
                                        namelast=namelast,
                                        namefirst=namefirst,
                                        identifier=identifier
                                    )
                                    logger.debug('saved new_employee: ' + str(new_employee.code))

                                    email = employee.get('email', '')[0:c.NAME_MAX_LENGTH]
                                    if email:
                                        new_employee.email = email

                                    telephone = employee.get('tel', '')[0:c.USERNAME_SLICED_MAX_LENGTH]
                                    if telephone:
                                        new_employee.tel = telephone

                                    datefirst_str = employee.get('datefirst')
                                    datefirst_iso = ''
                                    if datefirst_str and format_str:
                                        datefirst_iso = f.get_dateISO_from_string(datefirst_str, format_str)

                                    datelast_str = employee.get('datelast')
                                    datelast_iso = ''
                                    if datelast_str and format_str:
                                        datelast_iso = f.get_dateISO_from_string(datelast_str, format_str)

                                    if datefirst_iso:
                                        new_employee.datefirst = datefirst_iso
                                        logger.debug('datefirst_dte:' + str(datefirst_iso) + str(type(datefirst_iso)))
                                        logger.debug('new_employee.datefirst: ' + str(new_employee.datefirst))
                                    if datelast_iso:
                                        new_employee.datelast = datelast_iso
                                        logger.debug('datelast_dte:' + str(datelast_iso) + str(type(datelast_iso)))
                                        logger.debug('new_employee.datelast: ' + str(new_employee.datelast))

                                    # workhours per week * 60
                                    workhours_per_week_minutes = 0
                                    workhours = employee.get('workhours', 0)
                                    if workhours:
                                        workhours_float, msg_err = f.get_float_from_string(workhours)
                                        workhours_per_week_minutes = int(workhours_float * 60)
                                    new_employee.workhours = workhours_per_week_minutes

                                    # workdays per week * 1440 (one day has 1440 minutes)
                                    workdays_per_week_minutes = 0
                                    workdays = employee.get('workdays', 0)
                                    if workdays:
                                        workdays_float, msg_err = f.get_float_from_string(workdays)
                                        workdays_per_week_minutes = int(workdays_float * 1440)
                                    new_employee.workdays = workdays_per_week_minutes

                                    # leave days per year, full time, * 1440 (one day has 1440 minutes)
                                    leavedays_per_year_minutes = 0
                                    leavedays = employee.get('leavedays', 0)
                                    if leavedays:
                                        leavedays_float, msg_err = f.get_float_from_string(leavedays)
                                        leavedays_per_year_minutes = int(leavedays_float * 1440)
                                    new_employee.leavedays = leavedays_per_year_minutes

                                    payrollcode = employee.get('payrollcode')
                                    if payrollcode:
                                        new_employee.payrollcode = payrollcode

                                    # TODO: lookup wagecode in tablewagecode, create if not exists

                                    try:
                                        new_employee.save(request=request)
                                        # logger.debug('saved new_employee: ' + str(new_employee))
                                    except:
                                        has_error = True
                                        employee_dict['e_lastname'] = _('An error occurred. The employee data is not saved.')
                                        # logger.debug('has_error: ' + str(new_employee))

                                    if new_employee.pk:
                                        if new_employee.code:
                                            employee_dict['s_code'] = new_employee.code
                                        if new_employee.identifier:
                                            employee_dict['s_identifier'] = new_employee.identifier
                                        if new_employee.namelast:
                                            employee_dict['s_namelast'] = new_employee.namelast
                                        if new_employee.namefirst:
                                            employee_dict['s_namefirst'] = new_employee.namefirst
                                        if new_employee.email:
                                            employee_dict['s_email'] = new_employee.email
                                        if new_employee.telephone:
                                            employee_dict['s_telephone'] = new_employee.telephone
                                        if new_employee.datefirst:
                                            employee_dict['s_datefirst'] = new_employee.datefirst
                                        if new_employee.datelast:
                                            employee_dict['s_datelast'] = new_employee.datelast
                                        if new_employee.datelast:
                                            employee_dict['s_datelast'] = new_employee.datelast
                                        if new_employee.workhours:
                                            employee_dict['s_workhours'] = new_employee.workhours/60
                                        if new_employee.workdays:
                                            # workdays per week * 1440 (one day has 1440 minutes)
                                            employee_dict['s_workdays'] = new_employee.workdays/1440
                                        if new_employee.leavedays:
                                            # leave days per year, full time, * 1440 (one day has 1440 minutes)
                                            employee_dict['s_leavedays'] = new_employee.leavedays/1440
                                        if new_employee.payrollcode:
                                            employee_dict['s_payrollcode'] = new_employee.payrollcode

                                    # logger.debug(str(new_student.id) + ': Student ' + new_student.lastname_firstname_initials + ' created ')

                            # from https://docs.quantifiedcode.com/python-anti-patterns/readability/not_using_items_to_iterate_over_a_dictionary.html
                            # for key, val in student.items():
                            #    logger.debug( str(key) +': ' + val + '" found in "' + str(student) + '"')

                        # json_dumps_err_list = json.dumps(msg_list, cls=f.LazyEncoder)
                        if any(employee_dict):  # 'Any' returns True if any element of the iterable is true.
                            params.append(employee_dict)
                        # params.append(new_employee)

                    # --- end for employee in employees

         # return HttpResponse(json.dumps(params))
        return HttpResponse(json.dumps(params, cls=LazyEncoder))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_employee(upload_dict, update_dict, request):
    # --- create employee # PR2019-07-30
    # Note: all keys in update_dict must exist by running create_update_dict first
    # logger.debug(' --- create_customer_or_order')

    instance = None

# 1. get_iddict_variables
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
# 1. get_iddict_variables
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
    logger.debug(' --- delete_employee_from_teammember ---')
    # delete employee from teammember records, update team.code if necessary PR2019-09-15
    # if teammember is absence: teammember will be deleted.
    # else: employee will be removed from teammember
    # TODO also delete teammember when it is not part of a scheme
    if employee:
        logger.debug(' --- employee <' + str() + '> has the following teammembers:')
        for teammember in m.Teammember.objects.filter(employee=employee):
            logger.debug(' --- teammember ' + str(teammember.id) + ' <' + str(teammember.team.code) + '> cat ' + str(teammember.team.catcode))
        logger.debug(' --- loop teammembers:')

        for teammember in m.Teammember.objects.filter(employee=employee):

# delete teammember if is_absence
            is_absence = teammember.isabsence
            logger.debug(' --- teammember ' + str(teammember.id) + ' is_absence ' + str(is_absence))
            if is_absence:
                teammember.delete(request=request)
                logger.debug(' --- delete_employee_from_ ABSENCE')
            else:
# if not absence: remove employee from teammember
                teammember.employee = None
                teammember.save(request=request)
                logger.debug(' --- remove employee from teammember')




