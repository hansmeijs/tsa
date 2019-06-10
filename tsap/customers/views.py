
# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.db.models.functions import Lower
from django.http import HttpResponse

from django.shortcuts import render, redirect
from django.utils import timezone
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, CreateView, View

from companies.models import Customer, Order, Scheme, Team

from customers.forms import CustomerAddForm
from companies.views import LazyEncoder
from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_customer, check_date_overlap
from tsap.functions import get_date_from_str, create_dict_with_empty_attr, get_iddict_variables, \
                        get_date_WDM_from_dte, get_date_WDMY_from_dte, get_date_DMY_from_dte, get_weekdaylist_for_DHM, \
                        remove_empty_attr_from_dict

import json

import logging
logger = logging.getLogger(__name__)

# PR2019-01-04 from https://stackoverflow.com/questions/19734724/django-is-not-json-serializable-when-using-ugettext-lazy


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
                self.new_customer.modifiedby = self.request.user
                # PR2018-06-07 datetime.now() is timezone naive, whereas timezone.now() is timezone aware, based on the USE_TZ setting
                self.new_customer.modifiedat = timezone.now()

                # save examyear with commit
                # PR2018-08-04 debug: don't forget argument (request), otherwise gives error 'tuple index out of range' at request = args[0]
                self.new_customer.save(request=self.request)

            return redirect('customer_list_url')
        else:
            #If the form is invalid, render the invalid form.
            return render(self.request, 'customer_add.html', {'form': form})



# === Customer ===================================== PR2019-03-27
@method_decorator([login_required], name='dispatch')
class CustomerListView(View):

    def get(self, request):
        param = {}
        if request.user.company is not None:
            # add customer_list to headerbar parameters PR2019-03-02
            customers = Customer.objects.filter(company=request.user.company)
            # set headerbar parameters PR 2018-08-06
            param = get_headerbar_param(request, {'customers': customers})
            #logger.debug('EmployeeListView param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'customers.html', param)


@method_decorator([login_required], name='dispatch')
class CustomerUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= CustomerUploadView ============= ')

# --- Create empty row_dict with keys for all fields. Unused ones will be removed at the end
        field_list = ('id', 'code', 'name', 'email', 'telephone',
                      'datefirst', 'datelast', 'inactive', 'modifiedby', 'modifiedat')

        row_dict = {}  # this one is not working: row_dict = dict.fromkeys(field_list, {})
        for field in field_list:
            row_dict[field] = {}

        if request.user is not None and request.user.company is not None:
# --- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

            if 'row_upload' in request.POST:
                # row_upload: {'pk': '4', 'code': 'mcb'}
                row_upload = json.loads(request.POST['row_upload'])
                if row_upload is not None:
                    logger.debug('row_upload ' + str(row_upload))

                    customer = None
                    if 'pk' in row_upload and row_upload['pk']:
# --- check if it is new record, get company if is existing record
                        # new_record has pk 'new_1' etc
                        if row_upload['pk'].isnumeric():
                            pk_int = int(row_upload["pk"])
                            customer = Customer.objects.filter(id=pk_int, company=request.user.company).first()
                        else:
                            # this attribute 'new': 'new_1' is necessary to lookup unsaved request row on page
                            row_dict['id']['new_id'] = row_upload['pk']

                        is_new_record = False
                        save_changes = False

# ++++ enter new record ++++++++++++++++++++++++++++++++++++
                        if customer is None:
# --- validate if 'code' or 'name already exist and are not blank
                            new_value = {'code': '', 'name': ''}
                            for field in ('code', 'name'):
                                if field in row_upload:
                                    value_upload = row_upload[field] #if row_upload[field] else ''
                                    msg_err = validate_customer(field, value_upload, request.user.company)
                                    if msg_err:
                                        row_dict[field]['err'] = msg_err
                                    else:
                                        new_value[field] = value_upload

# --- add record if not has_error and both fields have value
                            if new_value['code'] and new_value['name']:
                                logger.debug('customer.save')
                                customer = Customer(company=request.user.company,
                                                    code=new_value['code'],
                                                    name=new_value['name'])
                                customer.save(request=self.request)
                                is_new_record = True

# ++++ existing and new customer ++++++++++++++++++++++++++++++++++++
                        if customer is not None:
                            # logger.debug('field: ' + str(field))
# --- add pk to row_dict
                            pk_int = customer.pk
                            row_dict['id']['pk'] = pk_int

# --- delete record when key 'delete' exists in
                            if 'delete' in row_upload:
                                logger.debug('before delete ' + customer.name)
                                customer.delete(request=self.request)
                        # check if customer still exist
                                customer = Customer.objects.filter(id=pk_int, company=request.user.company).first()
                                if customer is None:
                                    row_dict['id']['deleted'] = True
                                else:
                                    msg_err = _('This record could not be deleted.')
                                    row_dict['id']['del_err'] = msg_err

                                logger.debug('after delete row_dict: ' + str(row_dict))
                            else:  # not a deleted record

# --- validate if fields 'code' or 'name already exist and are not blank (when new record this is already done)
                                if not is_new_record:
                                    for field in ('code', 'name'):
                                        if field in row_upload:
                                            value_upload = row_upload[field] if row_upload[field] else ''
                                            msg_err = validate_customer(field, value_upload, request.user.company, pk_int)
                                            if msg_err:
                                                row_dict[field]['err'] = msg_err
                                            else:
                                                value_saved = getattr(customer, field, '')
                                                logger.debug('value_saved: ' + str(value_saved))
                                                if value_upload != value_saved:
                                                    setattr(customer, field, value_upload)
                                                    row_dict[field]['upd'] = True
                                                    save_changes = True

    # --- save changes in text fields
                                for field in ('email', 'telephone'):
                                    if field in row_upload:
                                        new_value = row_upload[field] if row_upload[field] else ''
                                        saved_value = getattr(customer, field, '')
                                        # logger.debug('new_value: ' + str(new_value) + ', saved_value: ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(customer, field, new_value)
                                            row_dict[field]['upd'] = True
                                            save_changes = True

    # --- save changes in date fields
                                for field in ('datefirst', 'datelast'):
                                    if field in row_upload:
                                        new_date, msg_err = get_date_from_str(row_upload[field], False) # False = blank_allowed
                                        logger.debug('new_date: ' + str(new_date))
                                # check if date is valid (empty date is ok)
                                        if msg_err is not None:
                                            row_dict[field]['err'] = msg_err
                                        else:
                                # check overlap, only when both fields have value
                                            is_datefirst = True if field == 'datefirst' else False
                                            date_first = new_date if is_datefirst else customer.datefirst
                                            date_last = customer.datelast if is_datefirst else new_date
                                            msg_err = check_date_overlap(date_first, date_last, is_datefirst)
                                            if msg_err is not None:
                                                row_dict[field]['err'] = msg_err
                                            else:
                                                saved_date = getattr(customer, field, None)
                                                if new_date != saved_date:
                                                    setattr(customer, field, new_date)
                                                    row_dict[field]['upd'] = True
                                                    save_changes = True

    # --- save changes in inactive field
                                for field in ('inactive', 'locked'):
                                    if field in row_upload:
                                        new_value = row_upload[field] if row_upload[field] else False
                                        saved_value = getattr(customer, field, False)
                                        if new_value != saved_value:
                                            setattr(customer, field, new_value)
                                            row_dict[field]['upd'] = True
                                            save_changes = True

    # --- save changes
                                if save_changes:
                                    customer.save(request=self.request)
                                    logger.debug('customer updated: ' + str(customer.name) + ' pk: ' + str(customer.pk))

    # enter saved value in row_dict when value is updated
                                # add modified_by and modifiedat here,
                                # otherwise the attr row_dict['modified_by'] will be deleted in de next code block
                                logger.debug('row_dict updated: ' + str(row_dict))
                                is_updated = False
                                for field in row_dict:
                                    if 'upd' in row_dict[field] or 'err' in row_dict[field]:
                                        if 'upd' in row_dict[field]:
                                            is_updated = True
                                        if field in ('datefirst', 'datelast'):
                                            field_str = field + '_str'
                                            logger.debug('field_str: ' + str(field_str))
                                            saved_value_str = getattr(customer, field_str, None)
                                            logger.debug('saved_value_str: ' + str(saved_value_str))
                                            if saved_value_str:
                                                row_dict[field]['val'] = saved_value_str
                                        elif field in ('inactive', 'locked'):
                                            row_dict[field]['val'] = getattr(customer, field, False)
                                        else:
                                            row_dict[field]['val'] = getattr(customer, field, '')

                                    if 'err' in row_dict[field]:
                                        is_updated = True
                                        if field in ('datefirst', 'datelast'):
                                            field_str = field + '_str'
                                            logger.debug('field_str: ' + str(field_str))
                                            saved_value_str = getattr(customer, field_str, None)
                                            logger.debug('saved_value_str: ' + str(saved_value_str))
                                            if saved_value_str:
                                                row_dict[field]['val'] = saved_value_str
                                        elif field in ('inactive', 'locked'):
                                            row_dict[field]['val'] = getattr(customer, field, False)
                                        else:
                                            row_dict[field]['val'] = getattr(customer, field, '')

                                # add modified_by and modifiedat attributes when updated
                                #if is_updated:
                                if is_updated:
                                    row_dict['modifiedby']['val'] = customer.modifiedby.username_sliced
                                    row_dict['modifiedat']['val'] = customer.modifiedat

# --- remove empty attributes from row_dict
        # cannot iterate through row_dict because it changes during iteration
        for field in field_list:
            if not row_dict[field]:
                del row_dict[field]


        row_update = {'row_update': row_dict}
       # row_update = {'row_upd': {'idx': {'pk': '1'}, 'code': {'status': 'upd'}, 'modified_by': {'val': 'Hans'},
        #              'modifiedat': {'val': '29 mrt 2019 10.20u.'}}}

        logger.debug('row_update: ')
        logger.debug( str(row_update))

        return HttpResponse(json.dumps(row_update, cls=LazyEncoder))



# === Order ===================================== PR2019-03-27
@method_decorator([login_required], name='dispatch')
class OrderListView(View):

    def get(self, request):
        param = {}
        if request.user.company is not None:
            orders = Order.objects.filter(customer__company=request.user.company)
            param = get_headerbar_param(request, {'orders': orders})
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'orders.html', param)



@method_decorator([login_required], name='dispatch')
class OrderUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= OrderUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
            # - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

# - get upload_dict from request.POST
            upload_dict = {}
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'parent_pk': 3, 'table': 'orders'},
                #               'code': {'update': True, 'value': 'ee'}}

                instance = None

# - get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    field_list = ('id', 'code', 'name', 'datefirst', 'datelast', 'inactive')
                    update_dict = create_dict_with_empty_attr(field_list)

# - check if parent exists (customer is parent of order)
                    parent_instance = Order.get_parent_instance(parent_pk_int, update_dict, request.user.company)
                    logger.debug('parent_instance: ' + str(parent_instance))
                    if parent_instance:
# - Delete item
                        if is_delete:
                            Order.delete_instance(pk_int, parent_pk_int, update_dict, request.user.company)

# === Create new order or customer
                        elif is_create:
                            code = None
                            name = None
                            code_dict = upload_dict.get('code')
                            if code_dict:
                                code = code_dict.get('value')
                            name_dict = upload_dict.get('name')
                            if name_dict:
                                name = name_dict.get('value')
                            if name is None:
                                name = code
                            instance = Order.create_instance(parent_instance, code, name, temp_pk_str, update_dict, request)
                            logger.debug('new instance: ' + str(instance))

# - update instance
                        else:
                            instance = Order.get_instance(pk_int, update_dict, request.user.company)
                            logger.debug('instance: ' + str(instance))

                            # update_item, also when it is a created item
                            if instance:
                                update_instance(instance, upload_dict, update_dict, request, user_lang)
                            logger.debug('updated instance: ' + str(instance))

                    # --- remove empty attributes from update_dict
                    remove_empty_attr_from_dict(update_dict)
                    logger.debug('update_dict: ' + str(update_dict))

                    if update_dict:
                        item_update_dict['item_update'] = update_dict

    # update schemeitem_list when changes are made
                    if table == 'customer':
                        scheme_list = Scheme.create_scheme_list(instance.order, user_lang)
                        if scheme_list:
                            item_update_dict['scheme_list'] = scheme_list
                    elif table == 'team':
                        team_list = Team.create_team_list(instance.scheme)
                        if team_list:
                            item_update_dict['team_list'] = team_list

            # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
            update_dict_json = json.dumps(item_update_dict, cls=LazyEncoder)
            return HttpResponse(update_dict_json)


@method_decorator([login_required], name='dispatch')
class OrderDownloadDatalistView(View):  # PR2019-03-10
    # function updates customers list
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= OrderDownloadDatalistView ============= ')
        logger.debug('request.POST' + str(request.POST) )
        # 'datalist_download': ['{"customers": true,"orders":true}']}>
        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                customers = Customer.objects.filter(company=request.user.company).order_by(Lower('code'))
                customer_list = []
                for customer in customers:
                    dict = {'pk': customer.id, 'code': customer.code}
                    if customer.datefirst:
                        dict['datefirst'] = customer.datefirst
                    if customer.datelast:
                        dict['datelast'] = customer.datelast
                    if customer.inactive:
                        dict['inactive'] = customer.inactive
                    customer_list.append(dict)
                datalists = {'customers': customer_list}

        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        # logger.debug('datalists_json:')
        # logger.debug(str(datalists_json))

        return HttpResponse(datalists_json)

def get_parent_instance(table, parent_pk_int, update_dict, company):
    # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-06-06
    parent_instance = None
    if parent_pk_int:
        if table == 'order':
            parent_instance = Customer.objects.filter(id=parent_pk_int, company=company).first()
        if parent_instance:
            update_dict['id']['parent_pk'] = parent_pk_int
            update_dict['id']['table'] = table
    return parent_instance


def get_instance(table, pk_int, parent_instance, update_dict):
    # function returns instance of table PR2019-06-06
    instance = None
    if pk_int and parent_instance:
        if table == 'customer':
            instance = Customer.objects.filter(id=pk_int, company=parent_instance).first()
        elif table == 'order':
            instance = Order.objects.filter(id=pk_int, customer=parent_instance).first()
        if instance:
            update_dict['id']['pk_int'] = pk_int
    return instance


# === Create new order
def create_instance(table, parent_instance, code, name, temp_pk_str, update_dict, request):
    instance = None
    pk_int = None
    parent_pk_int = None
# - parent and code are required
    if parent_instance and code:
# - create instance
        if table == 'order':
            instance = Order(customer=parent_instance, code=code, name=name)
        elif table == 'customer':
            instance = Customer(company=parent_instance, code=code, name=name)
# - save instance
        instance.save(request=request)
# - create error when instance not created
        if instance is None:
            msg_err = _('This %(instancename) could not be created.') % {'instancename': table}
            update_dict['id']['error'] = msg_err
        else:
# - put info in id_dict
            update_dict['id']['created'] = True
            update_dict['id']['pk'] = instance.pk
            if table == 'order':
                update_dict['id']['parent_pk'] = instance.customer.pk
            elif table == 'customer':
                update_dict['id']['parent_pk'] = instance.company.pk

# this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
        if temp_pk_str:
            update_dict['id']['temp_pk'] = temp_pk_str

    return instance


#######################################################
def update_instance(instance, upload_dict, update_dict, request, user_lang):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_instance')
    logger.debug(upload_dict)
    # upload_dict: {'id': {'temp_pk': 'new_2', 'create': True, 'parent_pk': 3, 'table': 'orders'},
    # 'code': {'update': True, 'value': 'ee'}}

    save_changes = False

# - get_iddict_variables
    id_dict = upload_dict.get('id')
    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# --- save changes in field 'code', required field
    for field in ['code', 'name']:
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('field_dict: ' + str(field_dict))

            new_value = field_dict.get('value')
            saved_value = getattr(instance, field, None)
            logger.debug('new_value: ' + str(new_value) + ' saved_value: ' + str(saved_value))

            # fields are required
            if new_value and new_value != saved_value:
                setattr(instance, field, new_value)
                logger.debug('attr ' + field + 'saved to: ' + str(new_value))
                update_dict[field]['updated'] = True
                update_dict[field]['value'] = new_value
                save_changes = True
                logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))

# update scheme_list when code has changed
            update_scheme_list = True

# --- save changes in date fields
    for field in ['datefirst', 'datelast']:
        # field_dict rosterdate: {'value': '2019-05-31', 'update':
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('field_dict ' + field + ': ' + str(field_dict) + str(type(field_dict)))
            field_value = field_dict.get('value')  # field_value: '2019-04-12'
            new_date, msg_err = get_date_from_str(field_value, False)  # False = blank_allowed
            if msg_err is not None:
                update_dict[field]['err'] = msg_err
            else:
                saved_date = getattr(instance, field, None)
                if new_date != saved_date:
                    setattr(instance, field, new_date)
                    update_dict[field]['updated'] = True
                    save_changes = True

    # --- save changes in date fields
    for field in ['inactive']:
        if field in upload_dict:
            logger.debug('upload_dict: ' + str(upload_dict))
            field_dict = upload_dict.get(field)
            logger.debug('field_dict: ' + str(field_dict))

            is_inactive = False
            value = field_dict.get('value')
            logger.debug('value: ' + str(value))
            if value == 'true':
                is_inactive = True
            logger.debug('is_inactive: ' + str(is_inactive) + ' type: ' + str(type(is_inactive)))

            saved_value = getattr(instance, field, None)
            logger.debug('saved_value: ' + str(saved_value) + ' type: ' + str(type(saved_value)))

            # fields are required
            if is_inactive != saved_value:
                setattr(instance, field, is_inactive)
                logger.debug('attr ' + field + 'saved to: ' + str(is_inactive))
                update_dict[field]['updated'] = True
                update_dict[field]['value'] = is_inactive
                save_changes = True
                logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))

    # logger.debug('update_dict: ' + str(update_dict))

            # logger.debug('time_duration: ' + str(schemeitem.time_duration) + str(type(schemeitem.time_duration)))
    # --- save changes
    if save_changes:
        instance.save(request=request)

        for field in update_dict:
            saved_value = getattr(instance, field)

            date_fields = ['datefirst', 'datelast']
            if field in date_fields:
                if saved_value:
                    update_dict[field]['value'] = str(saved_value)
                    update_dict[field]['wdm'] = get_date_WDM_from_dte(saved_value, user_lang)
                    update_dict[field]['wdmy'] = get_date_WDMY_from_dte(saved_value, user_lang)
                    update_dict[field]['dmy'] = get_date_DMY_from_dte(saved_value, user_lang)
                    update_dict[field]['offset'] = get_weekdaylist_for_DHM(saved_value, user_lang)
            elif field == 'code':
                if saved_value:
                    update_dict[field]['value'] = saved_value
            elif field == 'cycle':
                update_dict[field]['value'] = saved_value


# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    logger.debug('update_dict: ' + str(update_dict))



"""
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
                logger.debug('Customer.objects: ' + str(Customer.objects) + str(type(Customer.objects)))

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
"""