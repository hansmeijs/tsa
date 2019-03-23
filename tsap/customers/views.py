# PR2019-03-02
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from django.core.mail import send_mail
from django.db import connection
from django.db.models.functions import Lower
from django.http import HttpResponse, HttpResponseRedirect, Http404

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

from tsap.functions import get_date_int_from_yyyymmdd
from tsap.headerbar import get_headerbar_param
from tsap.constants import KEY_CUSTOMER_MAPPED_COLDEFS
from companies.models import Company, Companysetting, Department
from customers.models import Customer, Order
from customers.forms import CustomerAddForm, CustomerEditForm
from tsap.validators import customer_exists, check_date_overlap

import logging
logger = logging.getLogger(__name__)

# PR2019-01-04 from https://stackoverflow.com/questions/19734724/django-is-not-json-serializable-when-using-ugettext-lazy

# === LazyEncoder ===================================== PR2019-03-04
class LazyEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, Promise):
            return force_text(obj)
        return super(LazyEncoder, self).default(obj)


# === Customer ===================================== PR2019-03-02
@method_decorator([login_required], name='dispatch')
class CustomerListView(View):

    def get(self, request):
        param = {}

        if request.user.company is not None:
            # add customer_list to headerbar parameters PR2019-03-02
            customers = Customer.objects.filter(company=request.user.company)
            customer_list = []
            for customer in customers:
                dict = {}
                dict['id'] = customer.id
                dict['name'] = customer.name
                customer_list.append(dict)
            customer_list = json.dumps(customer_list)
            #logger.debug('customer_list: ' + str(customer_list))

            # set headerbar parameters PR 2018-08-06
            param = get_headerbar_param(request, {'customers': customers})
            #logger.debug('CustomerListView param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'customers.html', param)


@method_decorator([login_required], name='dispatch')
class CustomerAddView(CreateView):

    def get(self, request, *args, **kwargs):
        logger.debug('CustomerAddView get' )
        # logger.debug('ExamyearAddView get request: ' + str(request))
        # permission:   user.is_authenticated AND user.is_role_insp_or_system
        form = CustomerAddForm(request=request)

        # set headerbar parameters PR 2018-08-06
        param = get_headerbar_param(request, {'form': form})
        logger.debug('CustomerAddView param: ' + str(param))

        # render(request, template_name, context=None (A dictionary of values to add to the template context), content_type=None, status=None, using=None)
        return render(request, 'customer_add.html', param)

    def post(self, request, *args, **kwargs):
        self.request = request
        # logger.debug('ExamyearAddView post self.request: ' + str(self.request))

        form = CustomerAddForm(self.request.POST, request=self.request)  # this one doesn't work: form = ExamyearAddForm(request=request)

        if form.is_valid():
            # logger.debug('ExamyearAddView post is_valid form.data: ' + str(form.data))

            if self.request.user.company:
                # save examyear without commit
                self.new_customer = form.save(commit=False)
                self.new_customer.company = self.request.user.company
                self.new_customer.modified_by = self.request.user
                # PR2018-06-07 datetime.now() is timezone naive, whereas timezone.now() is timezone aware, based on the USE_TZ setting
                self.new_customer.modified_at = timezone.now()

                # save examyear with commit
                # PR2018-08-04 debug: don't forget argument (request), otherwise gives error 'tuple index out of range' at request = args[0]
                self.new_customer.save(request=self.request)

            return redirect('customer_list_url')
        else:
            """If the form is invalid, render the invalid form."""
            return render(self.request, 'customer_add.html', {'form': form})

@method_decorator([login_required], name='dispatch')
class CustomerEditView(UpdateView):
    # PR2018-04-17 debug: Specifying both 'fields' and 'form_class' is not permitted.
    model = Customer
    form_class = CustomerEditForm
    template_name = 'customer_edit.html'
    pk_url_kwarg = 'pk'
    context_object_name = 'customer'

    def form_valid(self, form):
        customer = form.save(commit=False)
        # PR2018-08-04 debug: don't forget argument (self.request), otherwise gives error 'tuple index out of range' at request = args[0]
        customer.save(request=self.request)
        return redirect('customer_list_url')

@method_decorator([login_required], name='dispatch')
class CustomerDeleteView(DeleteView):
    model = Customer
    template_name = 'customer_delete.html'  # without template_name Django searches for examyear_confirm_delete.html
    success_url = reverse_lazy('customer_list_url')

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        if self.request.user:
            self.object.delete(request=self.request)
            return HttpResponseRedirect(self.get_success_url())
        else:
            raise Http404  # or return HttpResponse('404_url')


@method_decorator([login_required], name='dispatch')
class CustomerUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= CustomerUploadView ============= ')
        if request.user is not None and request.user.company is not None:
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            activate(request.user.lang if request.user.lang else 'nl')

            param = {}
            if 'customer' in request.POST:
                customer_upload = json.loads(request.POST['customer'])
                # {'pk': '4', 'code': 'mcb'}
                if customer_upload is not None:
                    logger.debug('customer_upload: ' + str(customer_upload))
                    # field_list = ('code', 'name', 'datefirst', 'datelast')
                                 # not use: 'deplist', 'locked', 'inactive', 'modby', 'modat')

                    if 'pk' in customer_upload:
                        if customer_upload['pk']:
                            this_pk = int(customer_upload['pk'])
                            customer = Customer.objects.filter(id=this_pk, company=request.user.company).first()

                            if customer is not None:
                                for field in ('code', 'name', 'datefirst', 'datelast'):
                                    if field in customer_upload:
                                        save_record = False
                                        cust_dict = {}
                                        id_str = 'id_' + field + '_' + str(customer.pk)
                                        newvalue = customer_upload[field]
                                        oldvalue = ''
                                        date_first_int = 0
                                        date_last_int = 0

                                        # validations #
                                        # check if name already exists,
                                        # function customer_exists also gives error on empty field
                                        msg_dont_add = None
                                        if field == 'code' or field == 'name':
                                            msg_dont_add = customer_exists(field, newvalue, request.user.company, this_pk)
                                        elif field == 'datefirst':
                                            date_first_int = get_date_int_from_yyyymmdd(newvalue)
                                            if date_first_int and customer.date_last:
                                                msg_dont_add = check_date_overlap(date_first_int, customer.date_last, True)
                                        elif field == 'datelast':
                                            date_last_int = get_date_int_from_yyyymmdd(newvalue)
                                            if customer.date_first and date_last_int:
                                                msg_dont_add = check_date_overlap(customer.date_first, date_last_int, False)

                                        if msg_dont_add:
                                            cust_dict['err'] = msg_dont_add
                                        else:
                                            if field == 'code':
                                                oldvalue = customer.code if customer.code else ''
                                            elif field == 'name':
                                                oldvalue = customer.name if customer.name else ''
                                            elif field == 'datefirst':
                                                oldvalue = str(customer.date_first) if customer.date_first else ''
                                            elif field == 'datelast':
                                                oldvalue = str(customer.date_last) if customer.date_last else ''

                                            if newvalue != oldvalue:
                                                save_record = True
                                                cust_dict['upd'] = True

                                            if field == 'code':
                                                customer.code = newvalue
                                            elif field == 'name':
                                                customer.name = newvalue
                                            elif field == 'datefirst':
                                                customer.date_first = get_date_int_from_yyyymmdd(newvalue)
                                            elif field == 'datelast':
                                                customer.date_last = get_date_int_from_yyyymmdd(newvalue)

                                        if save_record:
                                            customer.save(request=self.request)

                                        if field == 'code':
                                            cust_dict['val'] = customer.code  # if customer.code else ''
                                        elif field == 'name':
                                            cust_dict['val'] = customer.name  # if customer.name else ''
                                        elif field == 'datefirst':
                                            cust_dict['val'] = customer.date_first_str
                                        elif field == 'datelast':
                                            cust_dict['val'] = customer.date_last_str

                                        param[id_str] = cust_dict

                                param['id_modby_' + str(customer.pk)] = {'val': customer.modified_by}
                                param['id_modat_' + str(customer.pk)] = {'val': customer.modified_at}

                                #logger.debug('param: ' + str(param))

            return HttpResponse(json.dumps({'cust_upd': param}, cls=LazyEncoder))

# === Order ===================================== PR2019-03-09
@method_decorator([login_required], name='dispatch')
class OrderImportView(View):

    def get(self, request):
        param = {}

        if request.user.company is not None:
            # coldef_list = [{'tsaKey': 'customer', 'caption': _('Company name')},
            #                      {'tsaKey': 'ordername', 'caption': _('Order name')},
            #                      {'tsaKey': 'orderdatefirst', 'caption': _('First date order')},
            #                      {'tsaKey': 'orderdatelast', 'caption': _('Last date order')} ]
# LOCALE #
            if request.user.lang == 'en':
                coldef_list = [
                    {'tsaKey': 'customer', 'caption': 'Customer'},
                    {'tsaKey': 'ordername', 'caption': 'Order'},
                    {'tsaKey': 'orderdatefirst', 'caption': 'Start date order'},
                    {'tsaKey': 'orderdatelast', 'caption': 'End date order'}
                ]

                captions_dict = {'no_file': 'No file is currently selected',
                                 'link_columns': 'Link columns',
                                 'click_items': 'Click items to link or unlink columns',
                                 'excel_columns': 'Excel columns',
                                 'tsa_columns': 'TSA columns',
                                 'linked_columns': 'Linked columns'}

            else:
                coldef_list = [
                    {'tsaKey': 'customer', 'caption': 'Cliënt'},
                    {'tsaKey': 'ordername', 'caption': 'Opdracht'},
                    {'tsaKey': 'orderdatefirst', 'caption': 'Begindatum opdracht'},
                    {'tsaKey': 'orderdatelast', 'caption': 'Einddatum opdracht'}
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
            settings = Companysetting.get_setting(KEY_CUSTOMER_MAPPED_COLDEFS, request.user)
            stored_setting = {}
            if settings:
                stored_setting = json.loads(Companysetting.get_setting(KEY_CUSTOMER_MAPPED_COLDEFS, request.user))

            # stored_setting = {'worksheetname': 'VakschemaQuery', 'no_header': False,
            #                   'coldefs': {'customer': 'level_abbrev', 'orderdatefirst': 'sector_abbrev'}}

            # don't replace keyvalue when new_setting[key] = ''
            self.no_header = False
            self.ws_name = ''
            if 'no_header' in stored_setting:
                self.no_header = bool(stored_setting['no_header'])
            if 'worksheetname' in stored_setting:
                self.ws_name = stored_setting['worksheetname']

            if 'coldefs' in stored_setting:
                stored_coldefs = stored_setting['coldefs']
                # skip if stored_coldefs does not exist
                if stored_coldefs:
                    # loop through coldef_list
                    for coldef in coldef_list:
                        # coldef = {'tsaKey': 'customer', 'caption': 'Cliënt'}
                        # get fieldname from coldef
                        fieldname = coldef.get('tsaKey')
                        if fieldname:  # fieldname should always be present
                            # check if fieldname exists in stored_coldefs
                            if fieldname in stored_coldefs:
                                # if so, add Excel name with key 'excKey' to coldef
                                coldef['excKey'] = stored_coldefs[fieldname]



            coldefs_dict = {
                'worksheetname': self.ws_name,
                'no_header': self.no_header,
                'stored_coldefs': coldef_list
            }
            coldefs_json = json.dumps(coldefs_dict, cls=LazyEncoder)

            captions = json.dumps(captions_dict, cls=LazyEncoder)

            #param = get_headerbar_param(request, {'stored_columns': coldef_list, 'captions': captions})
            param = get_headerbar_param(request, {'captions': captions, 'settings': coldefs_json})

            #logger.debug('param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'order_import.html', param)


@method_decorator([login_required], name='dispatch')
class OrderImportUploadSetting(View):   # PR2019-03-10
    # function updates mapped fields, no_header and worksheetname in table Companysetting
    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= OrderImportUploadSetting ============= ')
        #logger.debug('request.POST' + str(request.POST) )

        if request.user is not None :
            if request.user.company is not None:
                # request.POST:
                # {'setting': ['{"worksheetname":"Level",
                #                "no_header":false,
                #                "coldefs":{"customer":"level_name","ordername":"level_abbrev"}}']}>

                #fieldlist = ["customer", "ordername", "orderdatefirst", "orderdatelast"]

                if request.POST['setting']:
                    new_setting = json.loads(request.POST['setting'])
                    # get stored setting from Companysetting
                    stored_setting = json.loads(Companysetting.get_setting(KEY_CUSTOMER_MAPPED_COLDEFS, request.user))
                    # stored_setting = {'worksheetname': 'VakschemaQuery', 'no_header': False,
                    #                   'coldefs': {'customer': 'level_abbrev', 'orderdatefirst': 'sector_abbrev'}}

                    # don't replace keyvalue when new_setting[key] = ''
                    for key in new_setting:
                        if new_setting[key]:
                            stored_setting[key] = new_setting[key]
                    stored_setting_json = json.dumps(stored_setting)

                    # save stored_setting_json
                    Companysetting.set_setting(KEY_CUSTOMER_MAPPED_COLDEFS, stored_setting_json, request.user)

        return HttpResponse(json.dumps("Student import settings uploaded!", cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class OrderImportUploadData(View):  # PR2018-12-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= OrderImportUploadData ============= ')

        if request.user is not None :
            if request.user.company is not None:
                # get school and department of this schoolyear
                #company = Company.objects.filter(company=request.user.company).first()
                #if request.user.department is not None:
                #    department = Department.objects.filter(department=request.user.department).first()

                orders = json.loads(request.POST['orders'])
                params = []

                for order in orders:

                    # ------------ import order   -----------------------------------
                    logger.debug(' ')
                    logger.debug('import order:')
                    logger.debug(str(order))

                    # order = {'customer': 'MCB bank', 'ordername': 'Barber',
                    #           'orderdatefirst': '3/2/18', 'orderdatelast': '12/12/10'},

                    data = {}
                    has_error = False
                    dont_add = False

                    # check if customer name and  ordername are not None
                    customername =  order.get('customer')
                    logger.debug('customername: ' + str(customername))
                    ordername =  order.get('ordername')
                    logger.debug('ordername: ' + str(ordername))
                    if customername and ordername:
                        cust_code = customername[0:12]
                        order_code = ordername[0:12]
                        # check if customer already exists

                        customer = Customer.objects.filter(code__iexact=cust_code, company=request.user.company).first()
                        logger.debug('cust_code customer: ' + str(customer))
                        if customer is None:
                            customer = Customer.objects.filter(name__iexact=customername, company=request.user.company).first()
                            logger.debug('customername customer: ' + str(customer))
                        # create new customer if customer does not exist in company
                        if customer is None:
                            customer = Customer(company=request.user.company,code=cust_code,name=customername)
                            customer.save(request=request)
                            logger.debug('new customer: ' + str(customer))
                        if customer.pk:
                            logger.debug('customer pk: ' + str(customer.pk))
                            # ========== create new order, but only if no errors found
                            if dont_add:
                                logger.debug('order not created: ')
                                # TODO stud_log.append(_("order not created."))
                            else:
                                new_order = Order(
                                    customer=customer,
                                    code=order_code,
                                    name=ordername
                                )
                                logger.debug('new_order code: ' + str(new_order.code))

                                try:
                                    # new_order.save(request=request)
                                    new_order.save(request=request)
                                except:
                                    has_error = True
                                    data['e_lastname'] = _('An error occurred. The order data is not saved.')

                                if new_order.pk:
                                    if new_order.code:
                                        data['s_code'] = new_order.code
                                    if new_order.name:
                                        data['s_name'] = new_order.name

                                # logger.debug(str(new_student.id) + ': Student ' + new_student.lastname_firstname_initials + ' created ')

                                # from https://docs.quantifiedcode.com/python-anti-patterns/readability/not_using_items_to_iterate_over_a_dictionary.html
                                # for key, val in student.items():
                                #    logger.debug( str(key) +': ' + val + '" found in "' + str(student) + '"')

                    # json_dumps_err_list = json.dumps(msg_list, cls=f.LazyEncoder)
                    if len(data) > 0:
                        params.append(data)
                    # params.append(new_order)

                # return HttpResponse(json.dumps(params))
                return HttpResponse(json.dumps(params, cls=LazyEncoder))

