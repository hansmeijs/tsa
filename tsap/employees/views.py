
# PR2019-03-02

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, Http404

from django.db.models.functions import Lower
from django.shortcuts import render, redirect #, get_object_or_404
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, DeleteView, View, ListView, CreateView, FormView

import json
from django.utils.functional import Promise
from django.utils.encoding import force_text
from django.core.serializers.json import DjangoJSONEncoder

from tsap.settings import TIME_ZONE

from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_COLDEFS, \
        LANG_DEFAULT, WEEKDAYS_ABBREV, MONTHS_ABBREV, COLDEF_EMPLOYEE, CAPTION_EMPLOYEE

from tsap.functions import get_date_from_ISOstring, get_iddict_variables, create_dict_with_empty_attr
from planning.dicts import remove_empty_attr_from_dict
from tsap.headerbar import get_headerbar_param
from tsap.validators import check_date_overlap, validate_code_or_name, validate_employee_has_emplhours

from companies.models import Companysetting, Employee, get_parent, get_instance, delete_instance
from employees.forms import EmployeeAddForm, EmployeeEditForm
from employees.dict import create_employee_list, create_employee_dict

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
            employees = Employee.objects.filter(company=request.user.company)
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

            # get weekdays translated
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            if not user_lang in WEEKDAYS_ABBREV:
                user_lang = LANG_DEFAULT
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[user_lang])

            # get months translated
            if not user_lang in MONTHS_ABBREV:
                user_lang = LANG_DEFAULT
            months_json = json.dumps(MONTHS_ABBREV[user_lang])

            param = get_headerbar_param(request, {
                'employees': employees,
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
    model = Employee
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
    model = Employee
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
class EmployeeUploadView(UpdateView):# PR2019-07-30

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmployeeUploadView ============= ')
        # upload_dict: {'id': {'pk': 107, 'parent_pk': 1, 'table': 'employees'}, 'code': {'value': 'Abdula', 'update': True}}
        # upload: "{"id":{"pk":103,"delete":true,"table":"employee"}}"


        update_wrap = {}
        if request.user is not None and request.user.company is not None:
# A.
    # 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'pk': 36, 'delete': True, 'table': 'employee'}}

    # 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

    # 4. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    field_list = ('id', 'code', 'namefirst', 'namelast', 'email', 'telephone', 'identifier',
                                  'datefirst', 'datelast', 'wagecode', 'workhours', 'inactive')
                    update_dict = create_dict_with_empty_attr(field_list)

    # 5. check if parent exists (company is parent of employee)
                    # company is parent of employee
                    ppk_int = request.user.company.pk
                    instance = None
                    #logger.debug('table: ' + str(table))
                    parent = get_parent(table, ppk_int, update_dict, request)
                    #logger.debug('parent: ' + str(parent))
                    if parent:
# B. Delete instance
                        if is_delete:
                            instance = get_instance(table, pk_int, update_dict, parent)
                            this_text = _("Employee '%(tbl)s'") % {'tbl': instance.code}
     # 2. check if employee has emplhours
                            has_emplhours = validate_employee_has_emplhours(instance, update_dict)
                            if not has_emplhours:
                                delete_instance(instance, update_dict, request, this_text)
# C. Create new employee
                        elif is_create:
                            instance = create_employee(upload_dict, update_dict, request)
# - update instance
                        else:
                            instance = get_instance(table, pk_int, update_dict, parent)
                            logger.debug('instance: ' + str(instance))

                            # update_item, also when it is a created item
                            if instance:
                                update_employee(instance, parent, upload_dict, update_dict, request, user_lang)
                            # logger.debug('updated instance: ' + str(instance))

# --- remove empty attributes from update_dict
                    remove_empty_attr_from_dict(update_dict)
                    # logger.debug('update_dict: ' + str(update_dict))

                    if update_dict:
                        update_wrap['item_update'] = update_dict

# update schemeitem_list when changes are made
                    if instance:
                        employee_list = create_employee_list(instance.company)
                        if employee_list:
                            update_wrap['employee_list'] = employee_list

# 9. return update_wrap
            return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))

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
            coldef_list = COLDEF_EMPLOYEE[request.user.lang]
            captions_dict = CAPTION_EMPLOYEE[request.user.lang]



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
            settings = Companysetting.get_setting(KEY_EMPLOYEE_COLDEFS, request.user.company)
            stored_setting = {}
            if settings:
                stored_setting = json.loads(Companysetting.get_setting(KEY_EMPLOYEE_COLDEFS, request.user.company))
            # stored_setting = {'worksheetname': 'VakschemaQuery', 'no_header': False,
            #                   'coldefs': {'employee': 'level_abbrev', 'orderdatefirst': 'sector_abbrev'}}

            # don't replace keyvalue when new_setting[key] = ''
            self.no_header = False
            self.worksheetname = ''
            if 'no_header' in stored_setting:
                self.no_header = True if Lower(stored_setting['no_header']) == 'true' else False
            if 'worksheetname' in stored_setting:
                self.worksheetname = stored_setting['worksheetname']

            if 'coldefs' in stored_setting:
                stored_coldefs = stored_setting['coldefs']
                # skip if stored_coldefs does not exist
                if stored_coldefs:
                    # loop through coldef_list
                    for coldef in coldef_list:
                        # coldef = {'tsaKey': 'employee', 'caption': 'Cliënt'}
                        # get fieldname from coldef
                        fieldname = coldef.get('tsaKey')
                        if fieldname:  # fieldname should always be present
                            # check if fieldname exists in stored_coldefs
                            if fieldname in stored_coldefs:
                                # if so, add Excel name with key 'excKey' to coldef
                                coldef['excKey'] = stored_coldefs[fieldname]



            coldefs_dict = {
                'worksheetname': self.worksheetname,
                'no_header': self.no_header,
                'coldefs': coldef_list
            }
            coldefs_json = json.dumps(coldefs_dict, cls=LazyEncoder)

            captions = json.dumps(captions_dict, cls=LazyEncoder)

            #param = get_headerbar_param(request, {'stored_columns': coldef_list, 'captions': captions})
            param = get_headerbar_param(request, {'captions': captions, 'settings': coldefs_json})

            #logger.debug('param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'employee_import.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadSetting(View):   # PR2019-03-10
    # function updates mapped fields, no_header and worksheetname in table Companysetting
    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= EmployeeImportUploadSetting ============= ')
        #logger.debug('request.POST' + str(request.POST) )

        if request.user is not None :
            if request.user.company is not None:
                # request.POST:
                # {'setting': ['{"worksheetname":"Level",
                #                "no_header":false,
                #                "coldefs":{"employee":"level_name","ordername":"level_abbrev"}}']}>

                #fieldlist = ["employee", "ordername", "orderdatefirst", "orderdatelast"]

                if request.POST['setting']:
                    new_setting = json.loads(request.POST['setting'])
                    # logger.debug('new_setting' + str(new_setting) + str(type(new_setting)))
                    # new_setting{'worksheetname': 'Compleetlijst', 'no_header': False,
                    # 'coldefs': {'code': 'R_NAAM', 'namelast': 'ANAAM', 'namefirst': 'Voor_namen'}}

                    new_coldefs = {}
                    if new_setting:
                        if 'coldefs' in new_setting:
                            new_coldefs = new_setting['coldefs']
                    # logger.debug('new_coldefs' + str(new_coldefs) + str(type(new_coldefs)))
                    # new_coldefs{'code': 'R_NAAM', 'namelast': 'ANAAM', 'namefirst': 'Voor_namen'}

                    # get stored setting from Companysetting
                    stored_setting_json = Companysetting.get_setting(KEY_EMPLOYEE_COLDEFS, request.user.company)
                    stored_setting = {}
                    stored_coldefs = {}
                    if stored_setting_json:
                        stored_setting = json.loads(stored_setting_json)
                    # stored_setting = {'worksheetname': 'Compleetlijst',
                    #                   'coldefs': {'namelast': 'R_NAAM', 'namefirst': 'Voor_namen'}}
                    # logger.debug('stored_setting: <' + str(stored_setting) + '>')

                    if stored_setting:
                        if 'coldefs' in stored_setting:
                            stored_coldefs = stored_setting['coldefs']
                    # logger.debug('stored_coldefs' + str(stored_coldefs) + str(type(stored_coldefs)))

                    for key in new_coldefs:
                        value = str(new_coldefs[key])
                        # don't replace keyvalue when new_coldefs[key] = ''
                        if value:
                            stored_coldefs[key] = value
                    #replace  stored_setting['coldefs']  with  stored_coldefs
                    stored_setting['coldefs'] = stored_coldefs

                    # don't replace keyvalue when new_setting[key] = ''
                    for key in new_setting:
                        # logger.debug('key in new_setting' + str(key) + str(type(key)))
                        if not key == 'coldefs':
                            # no_header is Boolean, convert to string
                            value = str(new_setting[key])
                            #  logger.debug('value in new_setting' + str(value) + str(type(value)))
                            if value:
                                stored_setting[key] = value

                    # logger.debug('stored_setting' + str(stored_setting))
                    stored_setting_json = json.dumps(stored_setting)
                    # logger.debug('stored_setting_json' + str(stored_setting_json))

                    # save stored_setting_json
                    Companysetting.set_setting(KEY_EMPLOYEE_COLDEFS, stored_setting_json, request.user.company)

        return HttpResponse(json.dumps("Import settings uploaded", cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadData(View):  # PR2018-12-04

    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= EmployeeImportUploadData ============= ')

        if request.user is not None:
            if request.user.company is not None:
                # get school and department of this schoolyear
                #company = Company.objects.filter(company=request.user.company).first()
                #if request.user.department is not None:
                #    department = Department.objects.filter(department=request.user.department).first()
                params = []
                if 'employees' in request.POST:
                    employees = json.loads(request.POST['employees'])
                    # logger.debug("employees")
                    #  logger.debug(str(employees))

                    for employee in employees:
                        # logger.debug('--------- import employee   ------------')
                        # logger.debug('import employee:')
                        # logger.debug(str(employee))
                        # 'code', 'namelast', 'namefirst',  'prefix', 'email', 'tel', 'datefirst',
                        employee_dict = {}
                        has_error = False
                        dont_add = False

                        # truncate input if necessary
                        code = employee.get('code', '')[0:CODE_MAX_LENGTH]
                        namelast = employee.get('namelast', '')[0:NAME_MAX_LENGTH]
                        namefirst = employee.get('namefirst', '')[0:NAME_MAX_LENGTH]
                        prefix = employee.get('prefix', '')[0:CODE_MAX_LENGTH]
                        email = employee.get('email', '')[0:NAME_MAX_LENGTH]
                        telephone = employee.get('tel', '')[0:USERNAME_SLICED_MAX_LENGTH]
                        datefirst = employee.get('datefirst', '')

                        # check if employee already exists
                        # msg_dont_add = validate_employee_code(code, request.user.company)
                        # if msg_dont_add:
                        #     logger.debug('employee_exists: ' + str(msg_dont_add))
                        # else:
                        #     logger.debug('employee does not exists')

                        # check if employee already exists
                        #  msg_dont_add = validate_employee_name(namelast, namefirst, request.user.company)
                        # if msg_dont_add:
                        #     logger.debug('employee_exists: ' + str(msg_dont_add))
                        #  else:
                        #    logger.debug('employee does not exists')

                        # check if email address already exists
                        #if email:
                        #    msg_dont_add = employee_email_exists(email, request.user.company)
                        #    if msg_dont_add:
                        #        logger.debug('emmail_exists: ' + str(msg_dont_add))
                       #     else:
                       #        logger.debug('email does not exists')
                        #    skip_email = bool(msg_dont_add)
                        #else:
                        #    skip_email = True
                        msg_dont_add = None
                        # ========== create new employee, but only if no errors found
                        if msg_dont_add:
                            pass
                            # logger.debug('employee not created: ' + str(msg_dont_add))
                            # TODO stud_log.append(_("employee not created."))
                        else:
                            new_employee = Employee(
                                company=request.user.company,
                                code=code,
                                namelast=namelast
                            )
                            # logger.debug('new_employee: ' + str(new_employee))

                            # logger.debug('new_employee.namelast: ' + str(new_employee.namelast))
                            if namefirst:
                                new_employee.namefirst = namefirst
                            if prefix:
                                new_employee.prefix = prefix
                            if email:
                                new_employee.email = email
                            if telephone:
                                new_employee.tel = telephone

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
                                if new_employee.namelast:
                                    employee_dict['s_namelast'] = new_employee.namelast
                                if new_employee.namefirst:
                                    employee_dict['s_namefirst'] = new_employee.namefirst
                                if new_employee.prefix:
                                    employee_dict['s_prefix'] = new_employee.prefix
                                if new_employee.email:
                                    employee_dict['s_email'] = new_employee.email
                                if new_employee.telephone:
                                    employee_dict['s_telephone'] = new_employee.telephone
                                if new_employee.datefirst:
                                    employee_dict['s_datefirst'] = new_employee.datefirst

                            # logger.debug(str(new_student.id) + ': Student ' + new_student.lastname_firstname_initials + ' created ')

                            # from https://docs.quantifiedcode.com/python-anti-patterns/readability/not_using_items_to_iterate_over_a_dictionary.html
                            # for key, val in student.items():
                            #    logger.debug( str(key) +': ' + val + '" found in "' + str(student) + '"')

                        # json_dumps_err_list = json.dumps(msg_list, cls=f.LazyEncoder)
                        if len(employee_dict) > 0:
                            params.append(employee_dict)
                        # params.append(new_employee)

                # return HttpResponse(json.dumps(params))
                return HttpResponse(json.dumps(params, cls=LazyEncoder))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_employee(upload_dict, update_dict, request):
    # --- create employee # PR2019-07-30
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    # logger.debug(' --- create_customer_or_order')
    # logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    instance = None

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'employee'
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')

    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:
            # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent instance
        parent = get_parent(table, ppk_int, update_dict, request)
        if parent:

# 3. Get value of 'code'
            code = None
            code_dict = upload_dict.get('code')
            if code_dict:
                code = code_dict.get('value')

            if code:

    # c. validate code checks null, max len and exists
                has_error = validate_code_or_name(table, 'code', code, parent, update_dict)

                if not has_error:
# 4. create and save 'customer' or 'order'
                    instance = Employee(company=parent, code=code)
                    instance.save(request=request)

# 5. return msg_err when instance not created
                    if instance.pk is None:
                        msg_err = _('This employee could not be created.')
                        update_dict['code']['error'] = msg_err
                    else:

# 6. put info in update_dict
                        update_dict['id']['created'] = True

    # logger.debug('update_dict: ' + str(update_dict))
    return instance

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


#######################################################
def update_employee(instance, parent, upload_dict, update_dict, request, user_lang):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_employee')
    logger.debug(upload_dict)
    # upload_dict: {'id': {'temp_pk': 'new_2', 'create': True, 'parent_pk': 3, 'table': 'order'},
    # 'code': {'update': True, 'value': 'ee'}}

    save_changes = False
    has_error = False

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# 2. save changes in field 'code', required field
        for field in ('code',):
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    logger.debug('field: ' + str(field) + ' field_dict: ' + str(field_dict))
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field)
                    logger.debug('new_value: ' + str(new_value) + ' saved_value: ' + str(saved_value))

                # validate_code_or_name checks for null, too long and exists. Puts msg_err in update_dict
                    has_error = validate_code_or_name('employee', field, new_value, parent, update_dict, instance.pk)

                    if not has_error:
                        if new_value and new_value != saved_value:
                            setattr(instance, field, new_value)
                            # logger.debug('attr ' + field + 'saved to: ' + str(new_value))
                            update_dict[field]['updated'] = True
                            save_changes = True
                            # logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))
        # update scheme_list when code has changed
                            update_scheme_list = True

        # TODO  # validate_employee_namelast_namefirst
        # has_error = validate_employee_namelast_namefirst(namelast, namefirst, company, update_dict, this_pk=None):

# 3. save changes in fields 'namefirst', 'namelast'
        for field in ['namefirst', 'namelast', 'identifier']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field)
                    # logger.debug('new_value: ' + str(new_value) + ' saved_value: ' + str(saved_value))

    # b. validate - see above
    # c. save field if changed
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        update_dict[field]['updated'] = True
                        save_changes = True

# 3. save changes in date fields
        for field in ['datefirst', 'datelast']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    new_value = field_dict.get('value')  # new_value: '2019-04-12'
                    new_date, msg_err = get_date_from_ISOstring(new_value, False)  # False = blank_allowed
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
                            # logger.debug('date saved: ' + str(instance.datefirst))

# 4. save changes in field 'inactive'
        for field in ['inactive']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    value = field_dict.get('value')
                    is_inactive = True  if value == 'true' else False
                    saved_value = getattr(instance, field, None)
                    # logger.debug('saved_value: ' + str(saved_value) + ' ' + str(type(saved_value)))

                    if is_inactive != saved_value:
    # b.  save field if no_error
                        setattr(instance, field, is_inactive)
                        update_dict[field]['updated'] = True
                        save_changes = True

 # 5. save changes
        if save_changes:
            if save_changes:
                try:
                    instance.save(request=request)
                except:
                    msg_err = _('This employee could not be updated.')
                    update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
    create_employee_dict(instance, update_dict)



