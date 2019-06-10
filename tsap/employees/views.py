
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

from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_MAPPED_COLDEFS
from tsap.functions import get_date_from_str
from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_employee_code, validate_employee_name,employee_email_exists, check_date_overlap

from companies.models import Company, Companysetting, Employee
from employees.forms import EmployeeAddForm, EmployeeEditForm

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

            testEmployee = Employee
            logger.debug('testEmployee: ' + str(testEmployee)+ str(type(testEmployee)))

            logger.debug('testEmployee.objects: ' + str(testEmployee.objects)+ str(type(testEmployee.objects)))


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

            # set headerbar parameters PR 2018-08-06
            param = get_headerbar_param(request, {'employees': employees})
            #logger.debug('EmployeeListView param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'employees.html', param)


@method_decorator([login_required], name='dispatch')
class EmployeeAddView(CreateView):

    def get(self, request, *args, **kwargs):
        logger.debug('EmployeeAddView get' )
        # logger.debug('ExamyearAddView get request: ' + str(request))
        # permission:   user.is_authenticated AND user.is_role_insp_or_system
        form = EmployeeAddForm(request=request)

        # set headerbar parameters PR 2018-08-06
        param = get_headerbar_param(request, {'form': form})
        logger.debug('EmployeeAddView param: ' + str(param))

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
class EmployeeUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmployeeUploadView ============= ')
        if request.user is not None and request.user.company is not None:
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            activate(request.user.lang if request.user.lang else 'nl')

            # create dict and empty field attributes for all fields (unused ones will be removed at the end
            field_list = ('id', 'code', 'namelast', 'namefirst', 'prefix', 'email',
                          'telephone', 'datefirst',  'modifiedby',  'modifiedat')
            empl_dict = {}
            for field in field_list:
                empl_dict[field] = {}

            if 'employee' in request.POST:
                employee_upload = json.loads(request.POST['employee'])
                if employee_upload is not None:
                    logger.debug('employee_upload: ' + str(employee_upload))
                    #  employee_upload: {'pk': '9', 'blank_code': 'blank',
                    #  'namelast': 'Regales', 'namefirst': 'Ruëny David Tadeo',
                    #  'prefix': 'None', 'email': 'None', 'telephone': 'None', 'blank_datefirst': 'blank'}
                    if 'pk' in employee_upload and employee_upload['pk']:
                        this_pk = None
                        employee = None
                        # new_record has pk 'new_1' etc
                        if employee_upload['pk'].isnumeric():
                            this_pk = int(employee_upload['pk'])
                        else:
                            empl_dict['id']['new'] = employee_upload['pk']

                        new_code = None
                        new_namelast = None
                        new_namefirst = None
                        save_record = False

# ++++++++++++++ new record ++++++++++++++++++
                        if this_pk is None:
                    # validate if code is not blank
                            field = 'code'
                            if 'blank_' + field in employee_upload:
                                msg_dont_add = _("Employee code cannot be blank.")
                                empl_dict[field]['err'] = msg_dont_add

                    # validate if code already exists
                            elif field in employee_upload:
                                msg_dont_add = validate_employee_code(employee_upload[field], request.user.company)
                                if msg_dont_add is not None:
                                    empl_dict[field]['err'] = msg_dont_add
                            else:
                                new_code = employee_upload[field]

                    # validate if namelast is not blank
                            field = 'namelast'
                            if 'blank_' + field in employee_upload:
                                msg_dont_add = _("Last name cannot be blank.")
                                empl_dict[field]['err'] = msg_dont_add
                            elif field in employee_upload:
                                new_namelast = employee_upload[field]

                    # validate if namefirst is not blank
                            field = 'namefirst'
                            if 'blank_' + field in employee_upload:
                                msg_dont_add = _("First name cannot be blank.")
                                empl_dict[field]['err'] = msg_dont_add
                            elif field in employee_upload:
                                new_namefirst = employee_upload[field]

                    # validate if name already exists
                            if new_namelast and new_namefirst:
                                msg_dont_add = validate_employee_name(new_namelast,
                                                               new_namefirst,
                                                               request.user.company)
                                if msg_dont_add is not None:
                                    new_namelast = None
                                    new_namefirst = None
                                    empl_dict['namelast']['err'] = msg_dont_add
                                    empl_dict['namefirst']['err'] = msg_dont_add

                    # add record if not has_error
                            if new_code and new_namelast and new_namefirst:
                                employee = Employee(company=request.user.company,
                                                    code=new_code,
                                                    namelast=new_namelast,
                                                    namefirst=new_namefirst,
                                                    )
                                employee.save(request=self.request)
                                logger.debug('employee_added: ' + str(employee.namelast))
                                empl_dict['id']['pk'] = employee.pk
# ++++++++++++++ existing record ++++++++++++++++++
                        else:  # if not is_new_record
                    # get employee record
                            employee = Employee.objects.filter(id=this_pk, company=request.user.company).first()
                            logger.debug('existing employee: ' + str(employee.namelast) + str(type(employee.nam_last)))

                    # validate if employee is None
                            if employee is None:
                                msg_dont_add = _("Employee not found.")
                                empl_dict['namelast']['err'] = msg_dont_add
                            else:
                                empl_dict['id']['pk'] = employee.pk
                                # logger.debug('empl_dict[id][pk]: ' + str(empl_dict['id']['pk']))

                    # validate if code is blank
                                field = 'code'
                                if 'blank_' + field in employee_upload:
                                    saved_value = getattr(employee, field, '')
                                    msg_dont_add = _("Employee code cannot be blank.")
                                    empl_dict[field]['err'] = msg_dont_add
                                    empl_dict[field]['val'] = saved_value

                    # validate if code already exists
                                elif field in employee_upload:
                                    new_value = employee_upload[field]
                                    saved_value = getattr(employee, field, '')
                                    msg_dont_add = validate_employee_code(new_value, request.user.company, employee.pk)
                                    if msg_dont_add is not None:
                                        empl_dict[field]['err'] = msg_dont_add
                                        empl_dict[field]['val'] = saved_value
                                    else:
                                        if new_value != saved_value:
                                            setattr(employee, field, new_value)
                                            empl_dict[field]['upd'] = True
                                            empl_dict[field]['val'] = new_value
                                            save_record = True

                    # validate if namelast is not blank
                                msg_dont_add = None
                                field = 'namelast'
                                saved_namelast = getattr(employee, field, '')
                                if 'blank_' + field in employee_upload:
                                    msg_dont_add = _("Last name cannot be blank.")
                                    empl_dict[field]['err'] = msg_dont_add
                                    empl_dict[field]['val'] = saved_namelast
                                elif field in employee_upload:
                                    new_namelast = employee_upload[field]

                    # validate if namefirst is not blank
                                field = 'namefirst'
                                saved_namefirst = getattr(employee, field, '')
                                if 'blank_' + field in employee_upload:
                                    msg_dont_add = _("First name cannot be blank.")
                                    empl_dict[field]['err'] = msg_dont_add
                                    empl_dict[field]['val'] = saved_namefirst
                                elif field in employee_upload:
                                    new_namefirst = employee_upload[field]

                    # validate if name already exists
                                if new_namelast or new_namefirst:
                                    check_namelast = new_namelast if new_namelast else saved_namelast
                                    check_namefirst = new_namefirst if new_namefirst else saved_namefirst
                                    msg_dont_add = validate_employee_name(check_namelast,
                                                                        check_namefirst,
                                                                        request.user.company,
                                                                        this_pk)
                                    if msg_dont_add is not None:
                                        new_namelast = None
                                        new_namefirst = None
                                        empl_dict['namelast']['err'] = msg_dont_add
                                        empl_dict['namelast']['val'] = saved_namelast
                                        empl_dict['namefirst']['err'] = msg_dont_add
                                        empl_dict['namefirst']['val'] = saved_namefirst
                                    else:
                                        if new_namelast:
                                            if new_namelast != saved_namelast:
                                                setattr(employee, 'namelast', new_namelast)
                                                empl_dict['namelast']['upd'] = True
                                                empl_dict['namelast']['val'] = new_namelast
                                                save_record = True
                                        if new_namefirst:
                                            if new_namefirst != saved_namefirst:
                                                setattr(employee, 'namefirst', new_namefirst)
                                                empl_dict['namefirst']['upd'] = True
                                                empl_dict['namefirst']['val'] = new_namefirst
                                                save_record = True


# ++++++++++++++ update rest of fields (new + existing) ++++++++++++++++++
                        if employee:
                            for field in ('prefix', 'email', 'telephone'):
                                saved_value = getattr(employee, field,'')
                                if 'blank_' + field in employee_upload:
                                    if saved_value:
                                        setattr(employee, field, None)
                                        empl_dict[field] = {'upd': True, 'val': ''}
                                        save_record = True

                                elif field in employee_upload:
                                    new_value = employee_upload[field]
                                    if new_value != saved_value:
                                        setattr(employee, field, new_value)
                                        empl_dict[field] = {'upd': True, 'val': new_value}
                                        save_record = True

# update inactive field
                            field = 'inactive'
                            if field in employee_upload:
                                new_value = False
                                saved_value = getattr(employee, field, False)
                                if employee_upload[field]: #if employee_upload[field].lower() == 'true':
                                    new_value = True
                                if new_value != saved_value:
                                    setattr(employee, field, new_value)
                                    empl_dict[field] = {'upd': True, 'val': employee.inactive}
                                    save_record = True

# update date field
                            msg_dont_add = None
                            field = 'datefirst'

                            if field in employee_upload:
                                if not field:
                                    saved_datefirst = getattr(employee, field)
                                    if saved_datefirst:
                                        setattr(employee, field, None)
                                        empl_dict[field] = {'upd': True}
                                        save_record = True
                                else:
                                    new_value = employee_upload[field]
                                    logger.debug('new_value: ' +  str(new_value))
                                    new_datefirst = get_date_from_str(new_value, False) # False = blank_allowed
                                    logger.debug('new_date: ' + str(new_datefirst))

                                    saved_datefirst = employee.datefirst
                                    logger.debug('employee.datefirst: ' + str(employee.datefirst))

                                    setattr(employee, 'datefirst', new_datefirst)
                                    employee.save(request=self.request)

                                    logger.debug('aftersave employee.datefirst: ' + str(employee.datefirst))

                                    if new_datefirst and employee.datelast:
                                        msg_dont_add = check_date_overlap(new_datefirst, employee.datelast, True)
                                    if msg_dont_add:
                                        empl_dict[field] = {'err': msg_dont_add, 'val': employee.datefirst}
                                    elif new_datefirst != saved_datefirst:
                                        setattr(employee, field, new_datefirst)
                                        empl_dict[field] = {'upd': True, 'val': employee.datefirst}
                                        save_record = True

# ++++++++++++++ save ++++++++++++++++++
                            # remove empty elements from empl_dict
                            for field in field_list:
                                if not empl_dict[field]:
                                    del empl_dict[field]
                            logger.debug('empl_dict: ' +  str(empl_dict))

                            if save_record:
                                employee.save(request=self.request)

                                field = 'modifiedby'
                                saved_value = getattr(employee, field)
                                logger.debug('saved_value: ' + str(saved_value))
                                logger.debug('saved_value.username_sliced: ' + str(saved_value.username_sliced))
                                if saved_value:
                                    empl_dict[field] = {'upd': True, 'val': saved_value.username_sliced}

                                field = 'modifiedat'
                                request_user_lang = '-'
                                if request.user.lang:
                                    request_user_lang = request.user.lang
                                logger.debug('request_user_lang: ' +  str(request_user_lang))

                                saved_value = employee.modifiedat_str(request_user_lang)
                                logger.debug('saved_value: (' +  str(request_user_lang) + ') ' + str(saved_value))
                                if saved_value:
                                    empl_dict[field] = {'upd': True, 'val': saved_value}


                        logger.debug('empl_dict' + str(empl_dict) + str(type(empl_dict)))
                        resp = json.dumps({'empl_upd': empl_dict}, cls=LazyEncoder)
                        logger.debug('resp:')
                        logger.debug(str(resp))

            return HttpResponse(json.dumps({'empl_upd': empl_dict}, cls=LazyEncoder))

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
            if request.user.lang == 'en':
                coldef_list = [
                    {'tsaKey': 'code', 'caption': 'Code'},
                    {'tsaKey': 'namelast', 'caption': 'Last name'},
                    {'tsaKey': 'namefirst', 'caption': 'First name'},
                    {'tsaKey': 'prefix', 'caption': 'Prefix'},
                    {'tsaKey': 'email', 'caption': 'Email address'},
                    {'tsaKey': 'tel', 'caption': 'Telephone'},
                    {'tsaKey': 'datefirst', 'caption': 'First date in service'}
                ]

                captions_dict = {'no_file': 'No file is currently selected',
                                 'link_columns': 'Link columns',
                                 'click_items': 'Click items to link or unlink columns',
                                 'excel_columns': 'Excel columns',
                                 'tsa_columns': 'TSA columns',
                                 'linked_columns': 'Linked columns'}

            else:
                coldef_list = [
                    {'tsaKey': 'code', 'caption': 'Code'},
                    {'tsaKey': 'namelast', 'caption': 'Achternaam'},
                    {'tsaKey': 'namefirst', 'caption': 'Voornaam'},
                    {'tsaKey': 'prefix', 'caption': 'Tussenvoegsel'},
                    {'tsaKey': 'email', 'caption': 'E-mail adres'},
                    {'tsaKey': 'tel', 'caption': 'Telefoon'},
                    {'tsaKey': 'datefirst', 'caption': 'Datum in dienst'},
                ]

                captions_dict = {'no_file': 'Er is geen bestand geselecteerd',
                                 'link_columns': 'Koppel kolommen',
                                 'click_items': 'Klik op namen om kolommen te koppelen of ontkoppelen',
                                 'excel_columns': 'Excel kolommen',
                                 'tsa_columns': 'TSA kolommen',
                                 'linked_columns': 'Gekoppelde kolommen'}



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
            settings = Companysetting.get_setting(KEY_EMPLOYEE_MAPPED_COLDEFS, request.user)
            stored_setting = {}
            if settings:
                stored_setting = json.loads(Companysetting.get_setting(KEY_EMPLOYEE_MAPPED_COLDEFS, request.user))
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
        logger.debug(' ============= EmployeeImportUploadSetting ============= ')
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
                    logger.debug('new_setting' + str(new_setting) + str(type(new_setting)))
                    new_coldefs = {}
                    if new_setting:
                        if 'coldefs' in new_setting:
                            new_coldefs = new_setting['coldefs']
                    logger.debug('new_coldefs' + str(new_coldefs) + str(type(new_coldefs)))

                    # get stored setting from Companysetting
                    stored_setting_json = Companysetting.get_setting(KEY_EMPLOYEE_MAPPED_COLDEFS, request.user)
                    stored_setting = {}
                    stored_coldefs = {}
                    if stored_setting_json:
                        stored_setting = json.loads(stored_setting_json)
                    # stored_setting = {'worksheetname': 'Compleetlijst',
                    #                   'coldefs': {'namelast': 'R_NAAM', 'namefirst': 'Voor_namen'}}
                    logger.debug('stored_setting: <' + str(stored_setting) + '>')

                    if stored_setting:
                        if 'coldefs' in stored_setting:
                            stored_coldefs = stored_setting['coldefs']
                    logger.debug('stored_coldefs' + str(stored_coldefs) + str(type(stored_coldefs)))

                    for key in new_coldefs:
                        value = str(new_coldefs[key])
                        # don't replace keyvalue when new_coldefs[key] = ''
                        if value:
                            stored_coldefs[key] = value
                    #replace  stored_setting['coldefs']  with  stored_coldefs
                    stored_setting['coldefs'] = stored_coldefs

                    # don't replace keyvalue when new_setting[key] = ''
                    for key in new_setting:
                        logger.debug('key in new_setting' + str(key) + str(type(key)))
                        if not key == 'coldefs':
                            # no_header is Boolean, convert to string
                            value = str(new_setting[key])
                            logger.debug('value in new_setting' + str(value) + str(type(value)))
                            if value:
                                stored_setting[key] = value

                    logger.debug('stored_setting' + str(stored_setting))
                    stored_setting_json = json.dumps(stored_setting)
                    logger.debug('stored_setting_json' + str(stored_setting_json))

                    # save stored_setting_json
                    # Companysetting.set_setting(KEY_EMPLOYEE_MAPPED_COLDEFS, stored_setting_json, request.user)

        return HttpResponse(json.dumps("Student import settings uploaded!", cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class EmployeeImportUploadData(View):  # PR2018-12-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= OrderImportUploadData ============= ')

        if request.user is not None :
            if request.user.company is not None:
                # get school and department of this schoolyear
                #company = Company.objects.filter(company=request.user.company).first()
                #if request.user.department is not None:
                #    department = Department.objects.filter(department=request.user.department).first()

                employees = json.loads(request.POST['employees'])
                params = []

                for employee in employees:
                    logger.debug('--------- import employee   ------------')
                    logger.debug('import employee:')
                    logger.debug(str(employee))
                    # 'code', 'namelast', 'namefirst',  'prefix', 'email', 'tel', 'datefirst',
                    data = {}
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
                    msg_dont_add = validate_employee_code(code, request.user.company)
                    if msg_dont_add:
                        logger.debug('employee_exists: ' + str(msg_dont_add))
                    else:
                        logger.debug('employee does not exists')

                    # check if employee already exists
                    msg_dont_add = validate_employee_name(namelast, namefirst, request.user.company)
                    if msg_dont_add:
                        logger.debug('employee_exists: ' + str(msg_dont_add))
                    else:
                        logger.debug('employee does not exists')

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

                    # ========== create new employee, but only if no errors found
                    if msg_dont_add:
                        logger.debug('employee not created: ' + str(msg_dont_add))
                        # TODO stud_log.append(_("employee not created."))
                    else:
                        new_employee = Employee(
                            company=request.user.company,
                            code=code,
                            namelast=namelast
                        )

                        logger.debug('new_employee.namelast: ' + str(new_employee.namelast))
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
                        except:
                            has_error = True
                            data['e_lastname'] = _('An error occurred. The employee data is not saved.')

                        if new_employee.pk:
                            if new_employee.code:
                                data['s_code'] = new_employee.code
                            if new_employee.namelast:
                                data['s_namelast'] = new_employee.namelast
                            if new_employee.namefirst:
                                data['s_namefirst'] = new_employee.namefirst
                            if new_employee.prefix:
                                data['s_prefix'] = new_employee.prefix
                            if new_employee.email:
                                data['s_email'] = new_employee.email
                            if new_employee.telephone:
                                data['s_telephone'] = new_employee.telephone
                            if new_employee.datefirst:
                                data['s_datefirst'] = new_employee.datefirst

                        # logger.debug(str(new_student.id) + ': Student ' + new_student.lastname_firstname_initials + ' created ')

                        # from https://docs.quantifiedcode.com/python-anti-patterns/readability/not_using_items_to_iterate_over_a_dictionary.html
                        # for key, val in student.items():
                        #    logger.debug( str(key) +': ' + val + '" found in "' + str(student) + '"')

                    # json_dumps_err_list = json.dumps(msg_list, cls=f.LazyEncoder)
                    if len(data) > 0:
                        params.append(data)
                    # params.append(new_employee)

                # return HttpResponse(json.dumps(params))
                return HttpResponse(json.dumps(params, cls=LazyEncoder))
