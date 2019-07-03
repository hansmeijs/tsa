
# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.db.models.functions import Lower
from django.http import HttpResponse

from django.shortcuts import render, redirect
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from companies.models import Customer, Order, Scheme, Team, validate_code_or_name

from companies.views import LazyEncoder
from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_customer, check_date_overlap
from tsap.constants import CODE_MAX_LENGTH, ABSENCE, ABSENCE_CATEGORY, LANG_DEFAULT, TYPE_00_NORMAL, TYPE_02_ABSENCE
from tsap.functions import get_date_from_str, create_dict_with_empty_attr, get_iddict_variables, \
                        get_date_WDM_from_dte, format_WDMY_from_dte, format_DMY_from_dte, get_weekdaylist_for_DHM, \
                        remove_empty_attr_from_dict, get_date_yyyymmdd, set_fielddict_date
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
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

            param = get_headerbar_param(request, {
                'ppk': request.user.company.pk,
                'lang': user_lang
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'customers.html', param)


@method_decorator([login_required], name='dispatch')
class CustomerUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= CustomerUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# A.
    # 1. Reset languag
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'parent_pk': 3, 'table': 'order'},
                #               'code': {'update': True, 'value': 'ee'}}

    # 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

    # 4. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    field_list = ('pk', 'id', 'code', 'name', 'identifier', 'inactive')
                    update_dict = create_dict_with_empty_attr(field_list)

    # 5. check if parent exists (company is parent of customer)
                    instance = None
                    parent = request.user.company
                    if parent:
# B. Delete instance
                        if is_delete:
                            instance = get_instance(table, pk_int, parent)
                            delete_customer_or_order(table, instance, update_dict, request)

# C. Create new customer
                        elif is_create:
                            instance = create_customer_or_order(upload_dict, update_dict, request)

# D. Get existing instance
                        else:
                            instance = get_instance(table, pk_int, parent)

# E. Update instance, also when it is created
                        if instance:
                            update_customer_or_order(instance, upload_dict, update_dict, request, user_lang)
                            logger.debug('updated instance: ' + str(instance))
                            item_update_dict['item_dict'] = create_customer_dict(instance)

# 6. remove empty attributes from update_dict
                    remove_empty_attr_from_dict(update_dict)
                    logger.debug('update_dict: ' + str(update_dict))

# 7. add update_dict to item_update_dict
                    if update_dict:
                        item_update_dict['item_update'] = update_dict

# 8. update customer_list when changes are made
                        # inactive = None: include active and inactive
                       #  inactive = None
                        # customer_list = create_customer_list(request.user.company, inactive, TYPE_00_NORMAL)
                        # if customer_list:
                            # item_update_dict['customer_list'] = customer_list

# 9. return update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


# === Order ===================================== PR2019-03-27
@method_decorator([login_required], name='dispatch')
class OrderListView(View):

    def get(self, request):
        param = {}
        if request.user.company is not None:
            orders = Order.objects.filter(customer__company=request.user.company)
            param = get_headerbar_param(request, {'order': orders})
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'orders.html', param)


@method_decorator([login_required], name='dispatch')
class OrderUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= OrderUploadView ============= ')

        item_update_dict = {}
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
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'parent_pk': 3, 'table': 'order'},
                #               'code': {'update': True, 'value': 'ee'}}

    # 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

                    instance = None
    # 4. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    field_list = ('pk', 'id', 'code', 'name', 'identifier', 'datefirst', 'datelast', 'inactive')
                    update_dict = create_dict_with_empty_attr(field_list)

    # 5. check if parent exists (customer is parent of order)
                    parent = get_parent_instance('order', parent_pk_int, request.user.company)
                    if parent:

# B. Delete instance
                        if is_delete:
                            instance = get_instance(table, pk_int, parent)
                            delete_customer_or_order(table, instance, update_dict, request)

# C. Create new order
                        elif is_create:
                            instance = create_customer_or_order(upload_dict, update_dict, request)
                            logger.debug('new instance: ' + str(instance))

# D. get existing instance
                        else:
                            instance = get_instance(table, pk_int, parent)
                            logger.debug('instance: ' + str(instance))

# E. update instance, also when it is created
                        if instance:
                            update_customer_or_order(instance, upload_dict, update_dict, request, user_lang)

                        logger.debug('updated instance: ' + str(instance))

# 6. remove empty attributes from update_dict
                    remove_empty_attr_from_dict(update_dict)
                    logger.debug('update_dict: ' + str(update_dict))

# 7. add update_dict to item_update_dict
                    if update_dict:
                        item_update_dict['item_update'] = update_dict

# 9. update order_list when changes are made
                    # inactive = None: include active and inactive, issystem = None: include issystem and non-system
                    order_list = create_order_list(request.user.company, user_lang)
                    if order_list:
                        item_update_dict['order_list'] = order_list
        # 8. return update_dict =
        # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        return HttpResponse(json.dumps(item_update_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class OrderDownloadDatalistView(View):  # PR2019-03-10
    # function updates customers list
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= OrderDownloadDatalistView ============= ')
        logger.debug('request.POST' + str(request.POST) )
        # 'datalist_download': ['{"customer": {inactive: false},"order":{inactive: false}}']}>
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


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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
            msg_err = _('This item could not be created.')
            update_dict['id']['error'] = msg_err
        else:
# - put info in id_dict
            update_dict['id']['created'] = True
            update_dict['id']['pk'] = instance.pk
            if table == 'order':
                update_dict['id']['ppk'] = instance.customer.pk
            elif table == 'customer':
                update_dict['id']['ppk'] = instance.company.pk

# this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
        if temp_pk_str:
            update_dict['id']['temp_pk'] = temp_pk_str

    return instance


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_customerXXX(customer, upload_dict, update_dict, request, user_lang):
    # --- update existing and new customer PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_customer')
    logger.debug(upload_dict)
    # upload_dict: {'id': {'temp_pk': 'new_2', 'create': True, 'parent_pk': 3, 'table': 'customer'},
    # 'code': {'update': True, 'value': 'ee'}}

    # table = 'customer'
    parent = customer.company
    save_changes = False

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

# 2. save changes in field 'code', 'name'
        for field in ['code', 'name']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                new_value = field_dict.get('value')
                saved_value = getattr(customer, field, None)

                # fields 'code', 'name' are required
                if new_value and new_value != saved_value:
    # b. validate code or name
                    msg_err = validate_code_or_name(table, field, new_value, parent, pk_int)
                    if msg_err:
                        update_dict[field]['error'] = msg_err
                    else:
    # c. save field if changed and no_error
                        setattr(customer, field, new_value)
                        update_dict[field]['updated'] = True
                        save_changes = True

# 3. save changes in date fields
        for field in ['datefirst', 'datelast']:
            # field_dict rosterdate: {'value': '2019-05-31', 'update':
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                # logger.debug('field_dict ' + field + ': ' + str(field_dict) + str(type(field_dict)))
                field_value = field_dict.get('value')  # field_value: '2019-04-12'
    # b. validate value
                new_date, msg_err = get_date_from_str(field_value, False)  # False = blank_allowed
                saved_date = getattr(customer, field, None)
                if msg_err:
                    update_dict[field]['error'] = msg_err
                else:
    # c.  save field if no_error
                    if new_date != saved_date:
                        setattr(customer, field, new_date)
                        update_dict[field]['updated'] = True
                        save_changes = True

# 4. save changes in field 'inactive'
        for field in ['inactive']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                value = field_dict.get('value')
                is_inactive = True  if value == 'true' else False
                saved_value = getattr(customer, field, None)
                # logger.debug('saved_value: ' + str(saved_value) + ' type: ' + str(type(saved_value)))

                if is_inactive != saved_value:
    # b.  save field if no_error
                    setattr(customer, field, is_inactive)
                    update_dict[field]['updated'] = True
                    save_changes = True

                # logger.debug('timeduration: ' + str(schemeitem.timeduration) + str(type(schemeitem.timeduration)))
# 5. save changes
        if save_changes:
            try:
                customer.save(request=request)
            except:
                msg_err = _('This customer could not be updated.')
                update_dict['id']['error'] = msg_err

# 6. put saved value in update_dict
        for field in update_dict:
            if field != 'id' and field != 'pk':
                saved_value = getattr(customer, field)
                logger.debug('saved_value of ' + field + ': ' + str(saved_value) + ' type: ' + str(type(saved_value)))
                if saved_value:
                    update_dict[field]['value'] = saved_value
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def delete_customer_or_order(table, instance, update_dict, request):
    # function deletes instance of table,  PR2019-06-24

    if instance:
        try:
            instance.delete(request=request)
            update_dict['id']['deleted'] = True
        except:
            msg_err = _('This %(tbl)s could not be deleted.') % {'tbl': table}
            update_dict['id']['error'] = msg_err


def create_customer_or_order(upload_dict, update_dict, request):
    # --- create customer or order # PR2019-06-24
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    logger.debug(' --- create_customer_or_order')
    logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    instance = None

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        pk_int, parent_pk, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

        logger.debug('pk_int: ' + str(pk_int) + ' parent_pk: ' + str(parent_pk) + '  temp_pk_str: ' + str(temp_pk_str))
        logger.debug(' is_create: ' + str(is_create) + ' is_delete: ' + str(is_delete))
    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:
            # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent instance
        parent = get_parent_instance(table, parent_pk, request.user.company)
        if parent:
            logger.debug('table: ' + str(table) + ' parent: ' + str(parent) + ' model: ' + str(parent.__class__.__name__))

            # 3. Get value of 'code' and 'name'
            code = None
            name = None
            code_dict = upload_dict.get('code')
            if code_dict:
                code = code_dict.get('value')
            name_dict = upload_dict.get('name')
            if name_dict:
                name = name_dict.get('value')

    # b. copy code to name if name is empty, also vice versa (slice name is necessary)
            if name is None:
                name = code
            elif code is None:
                code = name[:CODE_MAX_LENGTH]
            if code and name:
                logger.debug('code: ' + str(code) + ' name: ' + str(name))

    # c. validate code and name
                msg_err = validate_code_or_name(table, 'code', code, parent_pk)

                if msg_err:
                    update_dict['code']['error'] = msg_err
                else:
                    msg_err = validate_code_or_name(table, 'name', name, parent_pk)
                    if msg_err:
                        update_dict['name']['error'] = msg_err

# 4. create and save 'customer' or 'order'
                    else:
                        if table =='customer':
                            instance = Customer(company=parent, code=code, name=name)
                        elif table =='order':
                            instance = Order(customer=parent, code=code, name=name)
                        instance.save(request=request)

# 5. return msg_err when instance not created
                if instance is None:
                    if table == 'customer':
                        msg_err = _('This customer could not be created.')
                    elif table =='order':
                        msg_err = _('This order could not be created.')
                    update_dict['id']['error'] = msg_err
                else:

# 6. put info in update_dict
                    update_dict['id']['created'] = True
                   # update_dict['code']['updated'] = True
                    #update_dict['name']['updated'] = True

    logger.debug('update_dict: ' + str(update_dict))
    return instance

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_customer_or_order(instance, upload_dict, update_dict, request, user_lang):
    # --- update existing and new customer or order PR2019-06-24
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_customer_or_order --- ')
    logger.debug('upload_dict: ' + str(upload_dict))
    # upload_dict: {'id': {'temp_pk': 'new_2', 'create': True, 'parent_pk': 3, 'table': 'order'},
    # 'code': {'update': True, 'value': 'ee'}}

    save_changes = False

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table', '')
        pk_int = instance.pk
        parent_pk = None
        if table == 'customer':
            parent_pk = instance.company.pk
        elif table == 'order':
            parent_pk = instance.customer.pk

        update_dict['pk'] = pk_int
        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = parent_pk
        update_dict['id']['table'] = table

# 2. save changes in field 'code', 'name'
        for field in ['code', 'name']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field, None)

                    # fields 'code', 'name' are required
                    if new_value != saved_value:
    # b. validate code or name
                        msg_err = validate_code_or_name(table, field, new_value, parent_pk, pk_int)
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
    # c. save field if changed and no_error
                            setattr(instance, field, new_value)
                            update_dict[field]['updated'] = True
                            save_changes = True

# 3. save changes in date fields
        for field in ['datefirst', 'datelast']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    field_value = field_dict.get('value')  # field_value: '2019-04-12'
    # b. validate value
                    new_date, msg_err = get_date_from_str(field_value, False)  # False = blank_allowed
                    saved_date = getattr(instance, field, None)
                    if msg_err:
                        update_dict[field]['error'] = msg_err
                    else:
    # c.  save field if no_error
                        if new_date != saved_date:
                            setattr(instance, field, new_date)
                            update_dict[field]['updated'] = True
                            save_changes = True

# 4. save changes in field 'inactive'
        for field in ['inactive']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    value = field_dict.get('value')
                    is_inactive = True  if value == 'true' else False
                    saved_value = getattr(instance, field, None)
                    # logger.debug('saved_value: ' + str(saved_value) + ' type: ' + str(type(saved_value)))

                    if is_inactive != saved_value:
    # b.  save field if no_error
                        setattr(instance, field, is_inactive)
                        update_dict[field]['updated'] = True
                        save_changes = True

                # logger.debug('timeduration: ' + str(schemeitem.timeduration) + str(type(schemeitem.timeduration)))
# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        for field in update_dict:
            if field != 'id' and field != 'pk':
                saved_value = getattr(instance, field)
                logger.debug('new saved_value of ' + field + ': ' + str(saved_value) + ' type: ' + str(type(saved_value)))
                if saved_value:
                    if field in ['code', 'name', 'inactive']:
                        update_dict[field]['value'] = saved_value
                    if field in ['datefirst', 'datelast']:
                        # saves 'value', 'dm', 'wdm', wdmy', 'dmy', 'offset' in update_dict[field]
                        set_fielddict_date(update_dict[field], saved_value, user_lang)


def create_customer_list(company, inactive=None, type=None):

# --- create list of all active customers of this company PR2019-06-16
    crit = Q(company=company)
    if type is not None:
        crit.add(Q(type=type), crit.connector)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    customers = Customer.objects.filter(crit)  # order_by(Lower('code')) is in model class Meta

    customer_list = []
    for customer in customers:
        dict = create_customer_dict(customer)
        customer_list.append(dict)
    return customer_list


def create_customer_dict(instance):
# --- create dict of this customer PR2019-06-19
    dict = {}
    if instance:
        parent_pk = instance.company.pk
        dict['pk'] = instance.pk
        dict['id'] = {'pk': instance.pk, 'ppk': parent_pk, 'table': 'customer'}

        for field in ['code', 'name', 'identifier', 'email', 'telephone', 'inactive']:
            value = getattr(instance, field, None)
            if value:
                dict[field] = {'value': value}


        # NOT IN USE
        #    if instance.datefirst:
        #        dict['datefirst'] = {
        #            'value': get_date_yyyymmdd(instance.datefirst),
        #            'wdmy': format_WDMY_from_dte(instance.datefirst, user_lang)}
        #    if instance.datelast:
        #        dict['datelast'] = {
        #            'value': get_date_yyyymmdd(instance.datelast),
        #            'wdmy': format_WDMY_from_dte(instance.datelast, user_lang)
        #        }
    return dict


def create_order_list(company, user_lang, inactive = None, type=TYPE_00_NORMAL):
# --- create list of all active orders of this company PR2019-06-16

    crit = (Q(customer__company=company)) & \
           (Q(customer__type=type))
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    orders = Order.objects.filter(crit).order_by('taxrate')  # field 'taxrate' is used to store sequence

    order_list = []
    for order in orders:
        dict = create_order_dict(order, user_lang)
        order_list.append(dict)
    return order_list

def create_order_dict(instance, user_lang):
# --- create dict of this order PR2019-06-25
    dict = {}
    if instance:
        parent_pk = instance.customer.pk


        dict['pk'] = instance.pk
        dict['id'] = {'pk': instance.pk, 'ppk': parent_pk, 'table': 'order'}

        for field in ['code', 'name', 'identifier', 'datefirst', 'datelast', 'inactive']:
            value = getattr(instance, field, None)
            if value:
                if field in ['code', 'name', 'identifier', 'inactive']:
                    dict[field] = {'value': value}
                if field in ['datefirst', 'datelast']:
                    dict[field] = {}
                    format_list = ['value', 'dmy', 'wdmy']
                    set_fielddict_date(dict[field], value, user_lang, None, format_list)

    return dict
# >>>>>>>>>>>>>>>>>>>
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# === Create new 'absence' customer, order and scheme and team
def create_absence_customer(request):
    # logger.debug(" === create_absence_customer ===")

    user_lang = request.user.lang if request.user.lang else LANG_DEFAULT

    # - create 'absence' orders - contains absence categoriesuser_lang
    if user_lang in ABSENCE:
        absence_locale = ABSENCE[user_lang]
    else:
        absence_locale = ABSENCE[LANG_DEFAULT]
    if user_lang in ABSENCE_CATEGORY:
        categories_locale = ABSENCE_CATEGORY[user_lang]
    else:
        categories_locale = ABSENCE_CATEGORY[LANG_DEFAULT]

# - check if 'absence' customer exists for this company - only one 'absence' customer allowed
    customer = Customer.objects.get_or_none(company=request.user.company, type=TYPE_02_ABSENCE)
    # logger.debug(" absence_customer_exists: " + str(customer))
    #from django.db import connection
    # logger.debug( connection.queries)

    if customer:
# - check if 'absence' customer has categories (orders)
        absence_orders_exist = Order.objects.filter(customer=customer).exists()
        if not absence_orders_exist:
# - if no orders exist: create 'absence' orders - contains absence categories
            for category in ABSENCE_CATEGORY:
                create_absence_order(customer, category, request)

    else:
    # - create 'absence' customer instance
        # logger.debug(" create 'absence' customer instance " )
        # logger.debug(absence_locale)

        customer = Customer(company=request.user.company,
                            code=absence_locale,
                            name=absence_locale,
                            type=TYPE_02_ABSENCE)
    # - save instance
        customer.save(request=request)

        for category in categories_locale:
            create_absence_order(customer, category, request)

# === Create new 'absence' customer, order and scheme and team PR2019-06-24
def create_absence_order(absence_customer, category, request):
    # logger.debug(" === create_absence_order ===")

    if absence_customer and category:
        # sequencce is stored in field 'taxrate'
        sequence = category[0]
        code = category[1]
        name = category[2]
# - create 'absence' orders - contains absence categories
        order = Order(customer=absence_customer, code=code, name=name, taxrate=sequence, type=TYPE_02_ABSENCE)
        order.save(request=request)
        # logger.debug(" order.save: " + str(order))
# - create scheme
        scheme = Scheme(order=order, code=code, type=TYPE_02_ABSENCE)
        scheme.save(request=request)
        # logger.debug(" scheme.save: " + str(scheme))
# - create team
        team = Team(scheme=scheme, code=code)
        team.save(request=request)
        # logger.debug(" team.save: " + str(team))

def create_absencecategory_list(company):
    # --- create list of all active absence categories of this company PR2019-06-25

    order_list = []

    crit = (Q(customer__company=company) &
                Q(type=TYPE_02_ABSENCE) &
                Q(inactive=False))
    orders = Order.objects.filter(crit).order_by('taxrate')  # field 'taxrate' contains sequence of absence

    for order in orders:
        dict = create_absencecat_dict(order)
        order_list.append(dict)

    return order_list

def create_absencecat_dict(instance):
# --- create dict of this absece category PR2019-06-25
    dict = {}
    if instance:
        parent_pk = instance.customer.pk

        dict['pk'] = instance.pk
        dict['id'] = {'pk': instance.pk, 'ppk': parent_pk, 'table': 'order'}

        value = getattr(instance, 'name', None)
        if value:
            # use model field 'name' in datalist filed 'code'
            dict['code'] = {'value': value}

    return dict


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_parent_instance(table, parent_pk_int, company):
    # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-06-17
    parent = None
    if parent_pk_int:
        if table == 'customer':
            parent = company
        elif table == 'order':
            parent = Customer.objects.get_or_none(id=parent_pk_int, company=company)
    return parent

def get_instance(table, pk_int, parent):
    # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-06-17
    instance = None
    if pk_int:
        if table == 'customer':
            instance = Customer.objects.get_or_none(id=pk_int, company=parent)
        elif table == 'order':
            instance = Order.objects.get_or_none(id=pk_int, customer=parent)

    return instance







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
            if request.user.lang == LANG_EN:
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
            settings = Companysetting.get_setting(KEY_CUSTOMER_MAPPED_COLDEFS, request.user.company)
            stored_setting = {}
            if settings:
                stored_setting = json.loads(Companysetting.get_setting(KEY_CUSTOMER_MAPPED_COLDEFS, request.user.company))

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
                    stored_setting = json.loads(Companysetting.get_setting(KEY_CUSTOMER_MAPPED_COLDEFS, request.user.company))
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

                orders = json.loads(request.POST['order'])
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