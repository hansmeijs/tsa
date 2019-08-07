
# PR2019-03-02

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, Http404

from django.db.models.functions import Lower
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

from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_COLDEFS, \
        LANG_DEFAULT, WEEKDAYS_ABBREV, MONTHS_ABBREV, COLDEF_EMPLOYEE, CAPTION_EMPLOYEE

from tsap.functions import get_date_from_ISOstring, get_iddict_variables, create_dict_with_empty_attr, get_datetimearray_from_ISOstring
from planning.dicts import remove_empty_attr_from_dict
from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_namelast_namefirst, validate_code_name_id, validate_employee_has_emplhours

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

    # get user_lang
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT

     # get weekdays translated
            lang = user_lang if user_lang in WEEKDAYS_ABBREV else LANG_DEFAULT
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[lang])

    # get months translated
            lang = user_lang if user_lang in MONTHS_ABBREV else LANG_DEFAULT
            months_json = json.dumps(MONTHS_ABBREV[lang])

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
                            instance = get_instance(table, pk_int, parent, update_dict)
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
                            instance = get_instance(table, pk_int, parent, update_dict)
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
    # get user_lang
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT

    # get coldef_list employee
            lang = user_lang if user_lang in COLDEF_EMPLOYEE else LANG_DEFAULT
            coldef_list = COLDEF_EMPLOYEE[lang]

    # get caption list employee
            lang = user_lang if user_lang in CAPTION_EMPLOYEE else LANG_DEFAULT
            captions_dict = CAPTION_EMPLOYEE[lang]

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
            param = get_headerbar_param(request, {'captions': captions, 'settings': coldefs_json})

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

                    Companysetting.set_setting(KEY_EMPLOYEE_COLDEFS, new_setting_json, request.user.company)

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
                stored_setting_json = Companysetting.get_setting(KEY_EMPLOYEE_COLDEFS, request.user.company)
                codecalc  = 'linked'
                if stored_setting_json:
                    stored_setting = json.loads(stored_setting_json)
                    if stored_setting:
                        codecalc = stored_setting.get('codecalc', 'linked')
                # logger.debug('codecalc: ' + str(codecalc))

                if 'employees' in request.POST:
                    employees = json.loads(request.POST['employees'])

            # detect dateformat of field 'datefirst'
                    format_str = detect_dateformat(employees, 'datefirst')
                    logger.debug("format_str: " + str(format_str))

                    for employee in employees:
                        logger.debug('--------- import employee   ------------')
                        logger.debug(str(employee))
                        # 'code', 'namelast', 'namefirst',  'prefix', 'email', 'tel', 'datefirst',
                        employee_dict = {}

                        #field_list = ('id', 'code', 'namefirst', 'namelast', 'email', 'telephone', 'identifier',
                        #             'datefirst', 'datelast', 'wagecode', 'workhours', 'inactive')

                        namelast = employee.get('namelast', '')[0:NAME_MAX_LENGTH]
                        namefirst = employee.get('namefirst', '')[0:NAME_MAX_LENGTH]

                        logger.debug('namelast: ' + str(namelast) + ' namefirst: ' + str(namefirst))

                        # truncate input if necessary
# get code or calculate code, depending on value of 'codecalcc
                        code = ''
                        if codecalc == 'firstname':
                            code = get_lastname_firstfirstname(namelast, namefirst)[0:CODE_MAX_LENGTH]
                        elif codecalc == 'initials':
                            code = get_lastname_initials(namelast, namefirst, True)[0:CODE_MAX_LENGTH]  # PR2019-08-05
                        elif codecalc == 'nospace':
                            code = get_lastname_initials(namelast, namefirst, False)[0:CODE_MAX_LENGTH]  # PR2019-08-05
                        else:  #  codecalc == 'linked'
                            code = employee.get('code', '')[0:CODE_MAX_LENGTH]

             # check if employee code already exists
                        logger.debug('code: ' + str(code))
                        has_error = validate_code_name_id(tablename, 'code', code, request.user.company, employee_dict)
                        if not has_error:
            # check if employee identifier already exists
                            identifier = employee.get('identifier', '')[0:CODE_MAX_LENGTH]
                            logger.debug('identifier: ' + str(identifier))
                            has_error = validate_code_name_id(tablename, 'identifier', code, request.user.company, employee_dict)
                            if not has_error:
                                logger.debug('identifier not has_error ')
            # check if employee namefirst / namelast combination already exists
                                has_error = validate_namelast_namefirst(namelast, namefirst, request.user.company, employee_dict)
                                if not has_error:
                                    logger.debug('namelast, namefirst not has_error ')
                                    email = employee.get('email', '')[0:NAME_MAX_LENGTH]
                                    telephone = employee.get('tel', '')[0:USERNAME_SLICED_MAX_LENGTH]

                                    datefirst_str = employee.get('datefirst')
                                    datefirst_iso = ''
                                    if datefirst_str and format_str:
                                        datefirst_iso = get_dateISO_from_string(datefirst_str, format_str)

                                    datelast_str = employee.get('datelast')
                                    datelast_iso = ''
                                    if datelast_str and format_str:
                                        datelast_iso = get_dateISO_from_string(datelast_str, format_str)

                                    wagecode = employee.get('wagecode')
                                    workhours = employee.get('workhours', 0)
                                    leavedays = employee.get('leavedays', 0)


                                    new_employee = Employee(
                                        company=request.user.company,
                                        code=code,
                                        namelast=namelast
                                    )
                                    logger.debug('new_employee.code: ' + str(new_employee.code))

                                    if namefirst:
                                        new_employee.namefirst = namefirst
                                    if identifier:
                                        new_employee.identifier = identifier
                                    if email:
                                        new_employee.email = email
                                    if telephone:
                                        new_employee.tel = telephone
                                    if datefirst_iso:
                                        new_employee.datefirst = datefirst_iso
                                        logger.debug('datefirst_dte:' + str(datefirst_iso) + str(type(datefirst_iso)))
                                        logger.debug('new_employee.datefirst: ' + str(new_employee.datefirst))
                                    if datelast_iso:
                                        new_employee.datelast = datelast_iso
                                        logger.debug('datelast_dte:' + str(datelast_iso) + str(type(datelast_iso)))
                                        logger.debug('new_employee.datelast: ' + str(new_employee.datelast))

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
                has_error = validate_code_name_id(table, 'code', code, parent, update_dict)

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

                # validate_code_name_id checks for null, too long and exists. Puts msg_err in update_dict
                    has_error = validate_code_name_id('employee', field, new_value, parent, update_dict, instance.pk)

                    if not has_error:
                        if new_value and new_value != saved_value:
                            setattr(instance, field, new_value)
                            # logger.debug('attr ' + field + 'saved to: ' + str(new_value))
                            update_dict[field]['updated'] = True
                            save_changes = True
                            # logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))
        # update scheme_list when code has changed
                            update_scheme_list = True

        # TODO  # validate_namelast_namefirst
        # has_error = validate_namelast_namefirst(namelast, namefirst, company, update_dict, this_pk=None):

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

def detect_dateformat(dict, field):
    #logger.debug(' --- detect_dateformat ---')
    # PR2019-08-05 get first letter of each firstname
    # detect date format
    format_str = ''
    arr00_max = 0
    arr01_max = 0
    arr02_max = 0
    for item in dict:
        arr00 = 0
        arr01 = 0
        arr02 = 0

        date_string = item.get(field)
        if date_string:
            arr = get_datetimearray_from_ISOstring(date_string)

            isok = False
            if len(arr) > 2:

                if arr[0].isnumeric():
                    arr00 = int(arr[0])
                    if arr[1].isnumeric():
                        arr01 = int(arr[1])
                        if arr[2].isnumeric():
                            arr02 = int(arr[2])
                            isok = True
            if isok:
                if arr00 > arr00_max:
                    arr00_max = arr00
                if arr01 > arr01_max:
                    arr01_max = arr01
                if arr02 > arr02_max:
                    arr02_max = arr02

    year_pos = -1
    day_pos = -1

    if arr00_max > 31 and arr01_max <= 31 and arr02_max <= 31:
        year_pos = 0
        if arr01_max > 12 and arr02_max <= 12:
            day_pos = 1
        elif arr02_max > 12 and arr01_max <= 12:
            day_pos = 2
    elif arr01_max > 31 and arr00_max <= 31 and arr02_max <= 31:
        year_pos = 1
        if arr00_max > 12 and arr02_max <= 12:
            day_pos = 0
        elif arr02_max > 12 and arr00_max <= 12:
            day_pos = 2
    elif arr02_max > 31 and arr00_max <= 31 and arr01_max <= 31:
        year_pos = 2
        if arr00_max > 12 and arr01_max <= 12:
            day_pos = 0
        elif arr01_max > 12 and arr00_max <= 12:
            day_pos = 1

    if day_pos == -1:
        if year_pos == 0:
            day_pos = 2
        elif year_pos == 2:
            day_pos = 0

    if year_pos > -1 and day_pos > -1:
        if year_pos == 0 and day_pos == 2:
                format_str = 'yyyy-mm-dd'
        if year_pos == 2:
            if day_pos == 0:
                format_str = 'dd-mm-yyyy'
            if day_pos == 1:
                format_str = 'mm-dd-yyyy'

    #logger.debug('max00: ' + str(arr00_max) + 'max01: ' + str(arr01_max) + ' max02: ' + str(arr02_max))
    #logger.debug('format_str: ' + str(format_str))
    return format_str

def get_dateISO_from_string(date_string, format=None):  # PR2019-08-06
    #logger.debug('... get_dateISO_from_string ...')
    #logger.debug('date_string: ' + str(date_string), ' format: ' + str(format))

    # function converts string into given format
    if format is None:
        format = 'yyyy-mm-dd'

    new_dat_str = ''
    if date_string:
        # replace / by -
        date_string = date_string.replace('/', '-')
        if '-' in date_string:
            arr = date_string.split('-')
            if len(arr) >= 2:
                day_int = 0
                month_int = 0
                year_int = 0
                if format == 'dd-mm-yyyy':
                    day_int = int(arr[0])
                    month_int = int(arr[1])
                    year_int = int(arr[2])
                elif format == 'mm-dd-yyyy':
                    month_int = int(arr[0])
                    day_int = int(arr[1])
                    year_int = int(arr[2])
                elif format == 'yyyy-mm-dd':
                    year_int = int(arr[0])
                    month_int = int(arr[1])
                    day_int = int(arr[2])
                #logger.debug('year_int: ' + str(year_int) + ' month_int: ' + str(month_int) + ' day_int:' + str(day_int))

                if year_int < 100:
                    currentYear = datetime.now().year
                    remainder = currentYear % 100 # 2019 -> 19
                    year100_int = currentYear // 100 # 2019 -> 20
                    # currentYear = 2019, remainder = 19. When year_int <=29 convert to 2009, else convert to 1997
                    if year_int <= remainder + 10:
                        year_int = year_int + year100_int * 100
                    else:
                        year_int = year_int + (year100_int - 1) * 100

                year_str = '0000' + str(year_int)
                year_str = year_str[-4:]
                month_str = '00' + str(month_int)
                month_str = month_str[-2:]

                day_str = '00' + str(day_int)
                day_str = day_str[-2:]
                #logger.debug('year_str: ' + str(year_str) + ' month_str: ' + str(month_str) + ' day_str:' + str(day_str))

                new_dat_str = '-'.join([year_str, month_str, day_str])

    #logger.debug('new_dat_str: ' + str(new_dat_str))
    return new_dat_str
