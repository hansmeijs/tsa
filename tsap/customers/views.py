
# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse

from django.shortcuts import render
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from companies import models as m
from companies.views import LazyEncoder
from companies import dicts as compdicts

from customers import dicts as cd
from tsap.headerbar import get_headerbar_param
from planning.views import update_scheme, update_shift_instance

from tsap import constants as c
from tsap import functions as f
from tsap import validators as v

import json

import logging
logger = logging.getLogger(__name__)

# PR2019-01-04 from https://stackoverflow.com/questions/19734724/django-is-not-json-serializable-when-using-ugettext-lazy

# === Customer ===================================== PR2019-06-16
@method_decorator([login_required], name='dispatch')
class CustomerListView(View):

    def get(self, request):
        param = {}

        if request.user.company is not None:

# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# 9. return datalists

            param = get_headerbar_param(request, {
                'ppk': request.user.company.pk
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'customers.html', param)


@method_decorator([login_required], name='dispatch')
class CustomerUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= CustomerUploadView ============= ')

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
                #logger.debug('upload_dict: ' + str(upload_dict))

# 3. get iddict variables
                id_dict = f.get_dict_value(upload_dict, ('id',))
                #logger.debug('id_dict: ' + str(id_dict) + ' ' + str(type(id_dict)))
                if id_dict:
                    #logger.debug('upload_dict: ' + str(upload_dict))
                    table = f.get_dict_value(id_dict, ('table',), '')
                    pk_int = f.get_dict_value(id_dict, ('pk',))
                    ppk_int = f.get_dict_value(id_dict, ('ppk',))
                    temp_pk_str = f.get_dict_value(id_dict, ('temp_pk',), '')
                    row_index = f.get_dict_value(id_dict, ('rowindex',))
                    mode = f.get_dict_value(id_dict, ('mode',), '')
                    is_create = ('create' in id_dict)
                    is_delete = ('delete' in id_dict)
                    is_absence = ('isabsence' in id_dict)
                    is_template = ('istemplate' in id_dict)

                    orders_list = f.get_dict_value(upload_dict, ('orders_list',))

                    #logger.debug('table: ' + str(table))
                    #logger.debug('is_delete: ' + str(is_delete))
# TODO check identifier for duplicates

                    updated_customer_rows = []
                    updated_order_rows = []
                    update_dict = {}

# =====  CUSTOMER  ==========
                    if table == "customer":

# A. check if parent with ppk_int exists and is same as request.user.company
                        parent = m.Company.objects.get_or_none(id=ppk_int)
                        #logger.debug('parent:', parent)
                        if parent and ppk_int == request.user.company_id:

# B. create new update_dict with all fields and id_dict. Unused ones will be removed at the end
                            update_dict = f.create_update_dict(
                                c.FIELDS_CUSTOMER,
                                table=table,
                                pk=pk_int,
                                ppk=parent.pk,
                                row_index=row_index)

# C. Delete customer
                            if is_delete:
                                instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)
                                if instance:
                                    this_text = _("Customer '%(tbl)s'") % {'tbl': instance.code}
                                    # delete_instance
                                    # msg_dict is not in use yet PR2020-10-14
                                    msg_dict = {}
                                    deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                                    if deleted_ok:
                                        instance = None
                                        # - create deleted_dict
                                        deleted_dict = {'pk': pk_int,
                                                       'mapid': 'customer_' + str(pk_int),
                                                       'deleted': True}
                                        updated_customer_rows.append(deleted_dict)
                            else:
# D. Create new customer
                                if is_create:
                                    instance = create_new_customer(parent, upload_dict, update_dict, request)
# E. Get existing customer
                                else:
                                    instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)

# F. Update customer, also when it is created
                                if instance:
                                    update_customer(instance, parent, upload_dict, update_dict, request)

# G. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
                            if instance:
                                cd.create_customer_dict(instance, update_dict)

                                customer_listNIU, customer_rows = cd.create_customer_list(
                                    company=request.user.company,
                                    customer_pk=instance.pk)
                                updated_customer_rows.extend(customer_rows)

# H. If new customer has orders_list: list contains new orders, add them to orders
                                #logger.debug('orders_list: '+ str(orders_list))
                                #logger.debug('is_create: ' + str(is_create))
                                #if is_create and orders_list:
                                #    update_orders_list = []
                                #    for new_order_dict in orders_list:
                                #        ppk_str = f.get_dict_value(new_order_dict, ('id', 'ppk'))
                                #        if ppk_str == temp_pk_str:
                                #            update_order_dict = {'id': {'pk': '', 'ppk': '', 'table': 'order'}}
                                #            order = create_order(instance, new_order_dict, update_order_dict, request)
                                #            cd.create_order_dict(order, update_order_dict)
                                #            update_orders_list.append(update_order_dict)
                                #    if update_orders_list:
                                #        update_wrap['update_orders_list'] = update_orders_list

# =====  ORDER  ==========
                    elif table == "order":
                        #logger.debug('table: ' + str(table))
                        #logger.debug('ppk_int: ' + str(ppk_int))

# A. check if parent exists (customer is parent of order)
                        parent = m.Customer.objects.get_or_none(id=ppk_int, company=request.user.company)
                        #logger.debug('parent: ' + str(parent))
                        #logger.debug('is_delete: ' + str(is_delete))
                        if parent:
# B. create new update_dict with all fields and id_dict. Unused ones will be removed at the end
                            update_dict = f.create_update_dict(
                                c.FIELDS_ORDER,
                                table=table,
                                pk=pk_int,
                                ppk=parent.pk,
                                row_index=row_index)
# C. Delete instance
                            if is_delete:
                                instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
                                if instance:
                                    this_text = _("Order '%(tbl)s'") % {'tbl': instance.code}
                                    # delete_instance
                                    # msg_dict is not in use yet PR2020-10-14
                                    msg_dict = {}
                                    deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                                    if deleted_ok:
                                        instance = None
                            # - create deleted_dict
                                        deleted_dict = {'pk': pk_int,
                                                       'mapid': 'order_' + str(pk_int),
                                                       'deleted': True}
                                        updated_order_rows.append(deleted_dict)
                            else:
# D. Create new order
                                if is_create:
                                    instance = create_order(parent, upload_dict, update_dict, request)
# E. Get existing order
                                else:
                                    instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)

# F. update order, also when it is created
                                if instance:
                                    update_order(instance, parent, upload_dict, update_dict, user_lang, request)

# G. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
                            if instance:
                                cd.create_order_dict(instance, update_dict)

                                order_listNIU, order_rows = cd.create_order_list(
                                    company=request.user.company,
                                    order_pk=instance.pk)
                                updated_order_rows.extend(order_rows)

# =====  END ORDER  ==========


# H. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)

# I. add update_dict to update_wrap
                    if update_dict:
                        update_list = []
                        update_list.append(update_dict)
                        update_wrap['update_list'] = update_list

                    if updated_order_rows:
                        update_wrap['updated_order_rows'] = updated_order_rows
                    if updated_customer_rows:
                        update_wrap['updated_customer_rows'] = updated_customer_rows

# J. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class PricerateUploadView(UpdateView):# PR2019-10-02

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= PricerateUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

    # 1. Reset languag
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict: ' + str(upload_dict))

    # 3. get iddict variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    update_dict = {}
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, is_absence, table, mode, row_index = f.get_iddict_variables(id_dict)
                    #logger.debug('table: ' + str(table) + ' ppk_int: ' + str(ppk_int))
# =====  ORDER  ==========
                    if table == "order":
                        update_dict = f.create_update_dict(
                            c.FIELDS_ORDER,
                            table=table,
                            pk=pk_int,
                            ppk=ppk_int,
                            row_index=row_index)

                        parent = m.Customer.objects.get_or_none(id=ppk_int, company=request.user.company)
                        #logger.debug('parent: ' + str(parent))
                        if parent:
                            instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
                            #logger.debug('parent: ' + str(instance))
                            if instance:
                                update_order(instance, parent, upload_dict, update_dict, user_lang, request)
                        f.remove_empty_attr_from_dict(update_dict)
# =====  SCHEME  ==========
                    if table == "scheme":
                        update_dict = f.create_update_dict(
                            c.FIELDS_SCHEME,
                            table=table,
                            pk=pk_int,
                            ppk=ppk_int,
                            row_index=row_index)

                        parent = m.Order.objects.get_or_none(id=ppk_int, customer__company=request.user.company)
                        if parent:
                            instance = m.Scheme.objects.get_or_none(id=pk_int, order=parent)
                            if instance:
                                update_scheme(instance, upload_dict, update_dict, request)
                        f.remove_empty_attr_from_dict(update_dict)
# =====  SHIFT  ==========
                    if table == "shift":
                        update_dict = f.create_update_dict(
                            c.FIELDS_SHIFT,
                            table=table,
                            pk=pk_int,
                            ppk=ppk_int,
                            row_index=row_index)
                        parent = m.Scheme.objects.get_or_none(id=ppk_int, order__customer__company=request.user.company)
                        #logger.debug('SHIFT parent: ' + str(parent))
                        if parent:
                            instance = m.Shift.objects.get_or_none(id=pk_int, scheme=parent)
                            if instance:
                                update_shift_instance(instance, parent, upload_dict, update_dict, user_lang, request)
                        f.remove_empty_attr_from_dict(update_dict)
                    if update_dict:
                        update_wrap['update_dict'] = update_dict
# 8. create pricerate_list
                    pricerate_list = cd.create_order_pricerate_list(company=request.user.company, user_lang=user_lang)
                    if pricerate_list:
                        update_wrap['pricerate_list'] = pricerate_list

     # 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


def create_new_customer(parent, upload_dict, update_dict, request):
    # --- create customer or order # PR2019-06-24
    # Note: all keys in update_dict must exist by running create_update_dict first
    #logger.debug(' --- create_customer')
    #logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    instance = None

# 1. get iddict variables
    # id_dict is added in create_update_dict
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'customer'

# 2. get parent instance
        if parent:
# 3. Get value of 'code' and 'name'
            code = f.get_dict_value(upload_dict, ('code', 'value'))
            name = f.get_dict_value(upload_dict, ('name', 'value'))

    # b. copy code to name if name is empty, also vice versa (slice name is necessary)
            if name is None:
                name = code
            elif code is None:
                code = name[:c.CODE_MAX_LENGTH]
            if code and name:

    # c. validate code and name
                msg_err = v.validate_code_name_identifier(table, 'code', code, False, parent, update_dict, {}, request)
                if not msg_err:
                    msg_err = v.validate_code_name_identifier(table, 'name', name, False, parent, update_dict, {}, request)

    # 4. create and save customer
                    if not msg_err:
                        instance = m.Customer(company=parent, code=code, name=name)
                        instance.save(request=request)

    # 5. return msg_err when instance not created
                        if instance.pk is None:
                            msg_err = _('This customer could not be created.')
                            update_dict['code']['error'] = msg_err
                        else:
    # 6. put info in update_dict
                            update_dict['id']['created'] = True

    return instance


def update_customer(instance, parent, upload_dict, update_dict, request):
    # --- update existing and new customer or order PR2019-06-24
    # add new values to update_dict (don't reset update_dict, it has values)
    #logger.debug(' --- update_customer --- ')
    #logger.debug('upload_dict: ' + str(upload_dict))

    has_error = False
    if instance:
        # FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier', 'email', 'telephone',
        # 'interval', 'inactive')
        table = 'customer'
        save_changes = False
        for field in c.FIELDS_CUSTOMER:

# --- get field_dict from  upload_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
# a. get new_value
                    new_value = field_dict.get('value')

# 2. save changes in field 'code', 'name'
                    if field in ['code', 'name']:
                # a. get old value
                        saved_value = getattr(instance, field)
                        # fields 'code', 'name' are required
                        if new_value != saved_value:
                # b. validate code or name
                            msg_err = v.validate_code_name_identifier(table, field, new_value, False, parent, update_dict, {}, request, this_pk=None)
                            if not msg_err:
                 # c. save field if changed and no_error
                                setattr(instance, field, new_value)
                                is_updated = True

# 3. save changes in fields 'identifier', 'email', 'telephone'
                    elif field in ['identifier', 'email', 'telephone']:
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 3. save changes in fields 'cat', 'interval'
                    elif field in ['cat', 'interval']:
                        if not new_value:
                            new_value = 0
                        saved_value = getattr(instance, field, 0)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 4. save changes in field 'inactive'
                    elif field == 'inactive':
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
                if table == 'customer':
                    msg_err = _('This customer could not be updated.')
                elif table == 'order':
                    msg_err = _('This order could not be updated.')
                else:
                    msg_err = _('This item could not be updated.')
                update_dict['id']['error'] = msg_err

    return has_error


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_order(parent, upload_dict, update_dict, request):
    # --- create customer or order # PR2019-06-24
    # Note: all keys in update_dict must exist by running create_update_dict first
    #logger.debug(' >>>>>>>>>>>> --- create_order   ---- ')
    #logger.debug(' upload_dict ', str(upload_dict))

    instance = None

# 1. get iddict variables
    # update_dict already contains key 'id', all keys are added in create_update_dict
    # value of 'id' are filled in
    table = 'order'

    if 'create' in update_dict['id']:
        del update_dict['id']['create']

# 2. get parent instance
    if parent:
# 3. Get value of 'code' and 'name'
        code = f.get_dict_value(upload_dict, ('code', 'value'))
        name = f.get_dict_value(upload_dict, ('name', 'value'))
        is_absence = f.get_dict_value(upload_dict, ('id', 'isabsence'), False)

# b. copy code to name if name is empty, also vice versa (slice name is necessary)
        if name is None:
            name = code
        elif code is None:
            code = name[:c.CODE_MAX_LENGTH]

        #logger.debug('code' + str(code))
        #logger.debug('name' + str(name))

# c. validate code and name
        if code and name:
            # validator creates key 'code' or 'name' in update_dict if they don't exist
            msg_err = v.validate_code_name_identifier(table, 'code', code, False, parent, update_dict, {}, request)
            #logger.debug('msg_err' + str(msg_err))
            if not msg_err:
                msg_err = v.validate_code_name_identifier(table, 'name', name, False, parent, update_dict, {}, request)

# 4. create and save order
                if not msg_err:
                    instance = m.Order(
                        customer=parent,
                        code=code,
                        name=name,
                        isabsence=is_absence
                    )
                    instance.save(request=request)
                    #logger.debug('instance' + str(instance))

# 5. return msg_err when instance not created
                    if instance.pk is None:
                        msg_err = _('This order could not be created.')
                        update_dict['code'] = {'error': msg_err}
                    else:
# 6. put info in update_dict
                        # rest of the info is added in cd.create_order_dict
                        update_dict['id']['created'] = True

    return instance

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_order(instance, parent, upload_dict, update_dict, user_lang, request):
    # --- update existing and new customer or order PR2019-06-24
    # add new values to update_dict (don't reset update_dict, it has values)
    #logger.debug(' --- update_order --- ')
    #logger.debug('upload_dict: ' + str(upload_dict))

    has_error = False
    if instance:
        table = 'order'
        save_changes = False
        for field in c.FIELDS_ORDER:
            # --- get field_dict from  item_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
# - get new_value
                    new_value = field_dict.get('value')
# - save changes in field 'code', 'name', 'identifier'
                    if field in ['code', 'name', 'identifier']:
        # a. get old value
                        saved_value = getattr(instance, field)
                        # fields 'code', 'name' are required
                        if new_value != saved_value:
        # b. validate code or name
                            msg_err = v.validate_code_name_identifier(table, field,
                                                                        new_value, False, parent, update_dict, {}, request, instance.pk)
                            if not msg_err:
        # c. save field if changed and no_error
                                setattr(instance, field, new_value)
                                is_updated = True

# - save changes in field 'sequence'
                    elif field == 'sequence':
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# - save changes in field 'billable'
                    elif field in ['billable']:
                        is_override = field_dict.get('override', False)
                        is_billable = field_dict.get('billable', False)
                        #logger.debug('is_override: ' + str(is_override))
                        #logger.debug('is_billable: ' + str(is_billable))
                        new_value = 0
                        if is_override:
                            new_value = 2 if is_billable else 1
                        #logger.debug('new_value: ' + str(new_value))
                        saved_value = getattr(instance, field, 0)
                        #logger.debug('saved_value: ' + str(saved_value))

                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# - save changes in date fields
                    elif field in ['datefirst', 'datelast']:
        # a. get new_date
                        new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
        # b. validate value
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                            has_error = True
                        else:
        # c. save field if changed and no_error
                            old_date = getattr(instance, field)
                            if new_date != old_date:
                                setattr(instance, field, new_date)
                                is_updated = True

                    if field in ( 'nopay', 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday'):
        # a. get old value
                        new_value = field_dict.get('value', False)
                        saved_value = getattr(instance, field, False)
                        if new_value != saved_value:
        # c. save field if changed
                            setattr(instance, field, new_value)
                            is_updated = True

    # 4. save changes in fields 'priceratejson'
                    elif field in ['priceratejson']:
                        #logger.debug('field: ' + str(field))
                        # TODO save pricerate with date and wagefactor
                        rosterdate = None
                        wagefactor = None

                        # TODO was: pricerate_is_updated = f.save_pricerate_to_instance(instance, rosterdate, wagefactor, new_value, update_dict, field)
                        #if pricerate_is_updated:
                        #    is_updated = True

                        #logger.debug('instance.priceratejson: ' + str(instance.priceratejson))
                        #logger.debug('is_updated: ' + str(is_updated))

    # 4. save changes in field 'taxcode'
                    elif field in ['taxcode']:
            # a. get new taxcode_pk
                        new_taxcode_pk = int(field_dict.get('pk', 0))
                        if new_taxcode_pk:
            # b. check if new_taxcode exists
                            taxcode = m.Pricecode.objects.get_or_none(
                                id=new_taxcode_pk,
                                istaxcode=True,
                                company=request.user.company
                            )
            # c. upate if exists. msg_err if not found
                            if taxcode is None:
                                msg_err = _('This field could not be updated.')
                                update_dict[field]['error'] = msg_err
                            else:
                                setattr(instance, field, taxcode)
                                is_updated = True
            # d. remove taxcode from order when pk is None
                        else:
                            if instance.taxcode is not None:
                                instance.taxcode = None
                                is_updated = True

    # 5. save changes in field 'inactive'
                    elif field == 'inactive':
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# - add 'updated' to field_dict'
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
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                update_dict['id']['error'] = msg_err

    return has_error
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# >>>>>>>   ORDER IMPORT >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# === OrderImportView ===================================== PR2020-01-01
@method_decorator([login_required], name='dispatch')
class OrderImportView(View):
    #logger.debug(' ============= OrderImportView ============= ')

    def get(self, request):
        param = {}

        if request.user.company is not None:
            request.user.has_permission = True
            if not request.user.has_permission:
                messages.error(request, _("You don't have permission to view this page."))
            else:
        # get user_lang
                user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
        # get caption list order
                caption_dict = c.CAPTION_IMPORT
        # get caption list coldefs_dict
                tblName = 'order'
                coldefs_dict = {}  # get_stored_coldefs_dict(tblName, user_lang, request)
                coldefs_json = json.dumps(coldefs_dict, cls=LazyEncoder)
                caption = json.dumps(caption_dict, cls=LazyEncoder)
                param = get_headerbar_param(request, {'caption': caption, 'setting': coldefs_json})

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'order_import.html', param)


@method_decorator([login_required], name='dispatch')
class OrderImportUploadSetting(View):   # PR2019-03-10
    # function updates mapped fields, has_header and worksheetname in table Companysetting
    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= OrderImportUploadSetting ============= ')
        #logger.debug('request.POST' + str(request.POST) )
        companysetting_dict = {}
        if request.user is not None :
            if request.user.company is not None:
                if request.POST['upload']:
                    new_setting_json = request.POST['upload']
                    # new_setting is in json format, json.loads (gets dict from json) and json.dumps (creates json from dict)
                    #logger.debug('new_setting_json' + str(new_setting_json))

                    new_worksheetname = ''
                    new_has_header = True
                    new_coldefs = {}
                    settings_key = c.KEY_ORDER_COLDEFS
                    stored_json = m.Companysetting.get_jsonsetting(settings_key, request.user.company)
                    if stored_json:
                        stored_setting = json.loads(stored_json)
                        #logger.debug('stored_setting: ' + str(stored_setting))
                        if stored_setting:
                            new_has_header = stored_setting.get('has_header', True)
                            new_worksheetname = stored_setting.get('worksheetname', '')
                            new_coldefs = stored_setting.get('coldefs', {})

                    if new_setting_json:
                        new_setting = json.loads(new_setting_json)
                        if new_setting:
                            if 'worksheetname' in new_setting:
                                new_worksheetname = new_setting.get('worksheetname', '')
                            if 'has_header' in new_setting:
                                new_has_header = new_setting.get('has_header', True)
                            if 'coldefs' in new_setting:
                                new_coldefs = new_setting.get('coldefs', {})
                    new_setting = {'worksheetname': new_worksheetname, 'has_header': new_has_header, 'coldefs': new_coldefs}
                    new_setting_json = json.dumps(new_setting)
                    #logger.debug('---  set_jsonsettingg  ------- ')
                    #logger.debug(new_setting_json)
                    m.Companysetting.set_jsonsetting(c.KEY_ORDER_COLDEFS, new_setting_json, request.user.company)

        # only for testing
                    # ----- get user_lang
                    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                    tblName = 'order'
                    coldefs_dict = compdicts.get_stored_coldefs_dict(tblName, user_lang, request)
                    if coldefs_dict:
                        companysetting_dict['coldefs'] = coldefs_dict
                    #logger.debug('new_setting from saved ' + str(coldefs_dict))

        return HttpResponse(json.dumps(companysetting_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class OrderImportUploadData(View):  # PR2018-12-04 PR2019-08-05

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= OrderImportUploadData ============= ')

# - Reset language
        # PR2019-03-15 Debug: language gets lost, get request.user.lang again
        user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
        activate(user_lang)

# - get stored setting from Companysetting
        stored_setting_json = m.Companysetting.get_jsonsetting(c.KEY_ORDER_COLDEFS, request.user.company)

        tsaKey_list = []
        if stored_setting_json:
            stored_setting = json.loads(stored_setting_json)
            #logger.debug('stored_setting: ' + str(stored_setting) + ' ' + str(type(stored_setting)))
            if stored_setting:
                stored_coldefs = stored_setting.get('coldefs')
                #logger.debug('stored_coldefs: ' + str(stored_coldefs))
                # stored_coldefs: {'namelast': 'ANAAM', 'namefirst': 'Voor_namen', 'identifier': 'ID', ...}
                if stored_coldefs:
                    tsaKey_list = list(stored_coldefs.keys())

        params = {}
        logfile = []

# 2. get upload_dict from request.POST
        order_list = []
        if request.user is not None:
            if request.user.company is not None:
                upload_json = request.POST.get('upload')
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    if upload_dict:
                        order_list = upload_dict.get('orders')
        #logger.debug('order_list: ' + str(order_list))

        if order_list:
            today_dte = f.get_today_dateobj()
            today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)

            logfile.append(
                '===================================================================================== ')
            logfile.append(
                '  ' + str(request.user.company.code) + '  -  Log import orders : ' + str(today_formatted))
            logfile.append(
                '===================================================================================== ')

            format_str = None
            if 'orderdatefirst' in tsaKey_list or 'orderdatelast' in tsaKey_list:
                # detect dateformat of field 'datefirst' and 'datelast'
                datefirst_format_str = f.detect_dateformat(order_list, 'orderdatefirst')
                datelast_format_str = f.detect_dateformat(order_list, 'orderdatelast')
                logfile.append('Detected datefirst_format_str: ' + str(datefirst_format_str))
                logfile.append('Detected datelast_format_str: ' + str(datelast_format_str))
                if datefirst_format_str:
                    if datelast_format_str:
                        if datefirst_format_str == datelast_format_str:
                            format_str = datefirst_format_str
                    else:
                        format_str = datefirst_format_str
                elif datelast_format_str:
                    format_str = datelast_format_str

                if format_str:
                    logfile.append('Detected date format: ' + str(format_str))
                else:
                    logfile.append('No valid or multiple date formats detected. Dates cannot be imported.')

            update_list = []
            mapped_customers_identifier = {}
            mapped_customers_code = {}
            for order_dict in order_list:
                #logger.debug('--------- import order   ------------')
                #logger.debug(str(order_dict))
                # 'code', 'namelast', 'namefirst',  'prefix', 'email', 'tel', 'datefirst',

# A +++++++++++  CUSTOMER

# lookup if customer exists, create if not found, update fields if changed

                update_dict = {}
                is_update = False
                has_error = False
                value = order_dict.get('custcode', '')[0:c.CODE_MAX_LENGTH]
                custcode = value if value else None

                value = order_dict.get('custname', '')[0:c.NAME_MAX_LENGTH]
                custname = value if value else None

                value = order_dict.get('custidentifier', '')[0:c.CODE_MAX_LENGTH]
                custidentifier = value if value else None

# check if custmer is already updated. In that case ccustomer_pk is stored in mapped_customers_identifier or mapped_customers_code
                customer_pk = None
                customer = None
                customer_found_in_map = False
                found_in_field = None
                if custidentifier in mapped_customers_identifier:
                    customer_pk = mapped_customers_identifier.get(custidentifier)
                if customer_pk is None:
                    customer_pk = mapped_customers_code.get(custcode)
                if customer_pk:
                    customer = m.Customer.objects.get_or_none(id=customer_pk, company=request.user.company)
                    if customer:
                        customer_found_in_map = True

                if customer is None:
                # 1. lookup customer by identifier first, then by code. Return customer when found
                # return values 'multiple_found' and 'value_too_long' return the lookup_value of the error field
                    customer, no_value, multiple_found, value_too_long, found_in_field = lookup_customer_or_order(
                        'customer', custcode, custidentifier, None, request)
                    has_error = (no_value or value_too_long or multiple_found)
                    if no_value:
                        logfile.append('This customer is skipped. No_value given for identifier and code.')
                    elif value_too_long:
                        logfile.append('Customer ' + (custcode or '<blank>') + " is skipped. Value '" + value_too_long + "' is too long. Max " + c.CODE_MAX_LENGTH + " characters.")
                    elif multiple_found:
                        logfile.append('Customer ' + (custcode or '<blank>') + " is skipped. Value '" + multiple_found + "' is found multiple times.")

                if not has_error:
# 2. create customer if customer not found
                    if customer is None:
                        if custname is None:
                            custname = custcode
                        customer = m.Customer(
                            company=request.user.company,
                            code=custcode,
                            name=custname
                            )
                        if custidentifier:
                            setattr(customer, 'identifier', custidentifier)
                        customer.save(request=request)

                        logfile.append('Customer ' + str(customer.code) + ' is created.')
                    else:
                        is_update = True
                        # add customer to mapped_customer, so we dont have to look it up again
                        if found_in_field == 'identifier':
                            mapped_customers_identifier[custidentifier] = customer.pk
                        elif found_in_field == 'code':
                            mapped_customers_code[custcode] = customer.pk
                        # skip msg when customer retrieved from map (to porevent multiple messages for same ciustomer
                        if not customer_found_in_map:
                            logfile.append ('Customer ' + str(customer.code) + ' already exists.')

                    if customer:
    # 3. check if fields have changed
                        for field in ('code', 'identifier', 'name', 'contactname', 'address', 'zipcode', 'city', 'country', 'email', 'telephone'):
                            if field in ('code', 'identifier'):
                                max_len = c.USERNAME_SLICED_MAX_LENGTH
                            elif field == 'telephone':
                                max_len = c.CODE_MAX_LENGTH
                            else:
                                max_len = c.NAME_MAX_LENGTH
                            prefix = 'cust'
                            if prefix + field in tsaKey_list:
                                value_str = order_dict.get(prefix + field, '')[0:max_len]
                                new_value = value_str if value_str else None
                                old_value = getattr(customer, field)
                                logfile.append(" " * 10 + 'check changes in  ' + str(field) + ' ' + str(old_value) + ' > ' + str(new_value))
                                if new_value != old_value:
                                    setattr(customer, field, new_value)
                                    is_updated = True
                                    old_str = ' is updated from: ' + (old_value or '<blank>') + ' to: ' if is_update else ''
                                    logfile.append((" " * 10 + 'first name' + " " * 25)[:35] + old_str + (value_str or '<blank>'))

                        customer.save(request=request)

    # B +++++++++++  ORDER

    # lookup if order exists, create if not found, update fields if changed
                        value = order_dict.get('ordercode', '')[0:c.CODE_MAX_LENGTH]
                        ordercode = value if value else None

                        value = order_dict.get('ordername', '')[0:c.NAME_MAX_LENGTH]
                        ordername = value if value else None

                        value = order_dict.get('orderidentifier', '')[0:c.CODE_MAX_LENGTH]
                        orderidentifier = value if value else None

    # return values 'multiple_found' and 'value_too_long' return the lookup_value of the error field
                        order, no_value, multiple_found, value_too_long, found_in_field = lookup_customer_or_order(
                            'order', ordercode, orderidentifier, customer, request)

                        if no_value:
                            logfile.append('Order ' + (ordercode or '<blank>') + ' is skipped. No_value given for identifier and code.')
                        elif value_too_long:
                            logfile.append('Order ' + (ordercode or '<blank>') + " is skipped. Value '" + value_too_long + "' is too long. Max " + c.CODE_MAX_LENGTH + " characters.")
                        elif multiple_found:
                            logfile.append('Order ' + (ordercode or '<blank>') + " is skipped. Value '" + multiple_found + "' is found multiple times.")
                        else:
    # 2. order customer if order not found
                            if order is None:
                                if ordername is None:
                                    ordername = ordercode
                                order = m.Order(
                                    customer=customer,
                                    code=ordercode,
                                    name=ordername
                                )
                                if orderidentifier:
                                    setattr(order, 'identifier', orderidentifier)
                                order.save(request=request)
                                logfile.append('Order ' + str(order.code) + ' is created.')
                            else:
                                is_update = True

                            if order:
                                prefix = 'order'
                                has_changes = False
                                # 3. check if fields have changed
                                for field in ('code', 'identifier', 'name', 'contactname', 'address',
                                               'zipcode', 'city', 'country', 'email', 'telephone', 'datefirst', 'datelast'):
                                    if (prefix + field) in tsaKey_list:
                                        if field in ('datefirst', 'datelast'):
                                            date_str = order_dict.get(field)
                                            new_date_dte = None
                                            old_date_dte = getattr(order, field)

                                            if date_str and format_str:
                                                date_iso = f.get_dateISO_from_string(date_str, format_str)
                                                new_date_dte = f.get_date_from_ISO(
                                                    date_iso)  # date_dte: 1900-01-01 <class 'datetime.date'>
                                            logfile.append(" " * 10 + 'check changes in  ' + str(field) + ' ' + str(old_date_dte) + ' > ' + str(new_date_dte))

                                            if new_date_dte != old_date_dte:
                                                setattr(order, field, new_date_dte)
                                                has_changes = True
                                                old_date_str = old_date_dte.isoformat() if old_date_dte else '<blank>'
                                                new_date_str = new_date_dte.isoformat() if new_date_dte else '<blank>'
                                                old_str = ' is updated from: ' + old_date_str + ' to: ' if is_update else ''
                                                fieldtext = 'first date of order' if field == 'datefirst' else 'last date of order'
                                                logfile.append((" " * 10 + fieldtext + " " * 25)[:35] + old_str + new_date_str)
                                        else:

                                            if field in ('code', 'identifier'):
                                                max_len = c.USERNAME_SLICED_MAX_LENGTH
                                            elif field == 'telephone':
                                                max_len = c.CODE_MAX_LENGTH
                                            else:
                                                max_len = c.NAME_MAX_LENGTH

                                            value_str = order_dict.get(prefix + field, '')[0:max_len]
                                            new_value = value_str if value_str else None
                                            old_value = getattr(order, field)
                                            logfile.append(" " * 10 + 'check changes in  ' + str(field) + ' ' + str(old_value) + ' > ' + str(new_value))
                                            if new_value != old_value:
                                                setattr(order, field, new_value)
                                                has_changes = True
                                                old_str = ' is updated from: ' + (
                                                            old_value or '<blank>') + ' to: ' if is_update else ''
                                                logfile.append(
                                                    (" " * 10 + field + " " * 25)[:35] + old_str + (value_str or '<blank>'))

                                if has_changes:
                                    order.save(request=request)
                                    logfile.append(" " * 10 + 'changes are saved')

            # --- end for order in orders

            # if update_list:  # 'Any' returns True if any element of the iterable is true.
                # params['employee_list'] = update_list
            if logfile:  # 'Any' returns True if any element of the iterable is true.
                params['logfile'] = logfile
                    # params.append(new_employee)

         # return HttpResponse(json.dumps(params))
        return HttpResponse(json.dumps(params, cls=LazyEncoder))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def lookup_customer_or_order(modelname, code, identifier, order_parent, request):  # PR2020-01-01
    # function searches for existing order in the following order: code, identifier
    instance = None
    multiple_found = None
    value_too_long = None
    has_value_count = 0
    found_in_field = None
    for lookup_field in ('identifier', 'code'):
        lookup_value = identifier if lookup_field == 'identifier' else code
# B search order by identifier
        if lookup_value:
            has_value_count += 1
        # check if value is not too long
            if len(lookup_value) > c.CODE_MAX_LENGTH:
                # dont lookup other fields when lookup_value is too long
                value_too_long = lookup_value
                break
            else:
        # check if identifier__iexact already exists
                # don't use count - then you have to call the sql always twice, this way only when multiple found
                row_count = 0
                instance = None
                instances = None
                if modelname == 'customer':
                    if lookup_field == 'identifier':
                        instances = m.Customer.objects.filter(identifier__iexact=lookup_value,
                                                                company=request.user.company)
                    else:
                        instances = m.Customer.objects.filter(code__iexact=lookup_value,
                                                              company=request.user.company)
                elif modelname == 'order':
                    # identifier must be unique for company, ordercode must be unique for customer
                    if lookup_field == 'identifier':
                        instances = m.Order.objects.filter(identifier__iexact=lookup_value, customer=order_parent,
                                                            customer__company=request.user.company)
                    else:
                        instances = m.Order.objects.filter(code__iexact=lookup_value, customer=order_parent,
                                                            customer__company=request.user.company)
                for instance in instances:
                    row_count += 1
                if row_count > 1:
                    multiple_found = lookup_value
                    instance = None
                    break
    # one instance found: dont search other field
        if instance:
            found_in_field = lookup_field
            break
    no_value = (has_value_count == 0)
    return instance, no_value, multiple_found, value_too_long, found_in_field
