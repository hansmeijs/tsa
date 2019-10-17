
# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.db.models.functions import Lower
from django.http import HttpResponse

from django.shortcuts import render
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from companies import models as m
from companies.views import LazyEncoder

from customers import dicts as d

from tsap.headerbar import get_headerbar_param

from tsap.settings import TIME_ZONE
from planning.views import update_scheme, update_shift

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

            # get weekdays translated
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            if not user_lang in c.WEEKDAYS_ABBREV:
                user_lang = c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[user_lang])

            # get months translated
            if not user_lang in c.MONTHS_ABBREV:
                user_lang = c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[user_lang])

            param = get_headerbar_param(request, {
                'ppk': request.user.company.pk,
                'lang': user_lang,
                'weekdays': weekdays_json,
                'months': months_json,
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'customers.html', param)


@method_decorator([login_required], name='dispatch')
class CustomerUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= CustomerUploadView ============= ')

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

# 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)

# TODO check identifier for duplicates and empty

# =====  CUSTOMER  ==========
                    if table == "customer":
    # 4. create empty update_dict with fields
                        # FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier',
                        # 'email', 'telephone', 'interval', 'inactive')
                        update_dict = f.create_dict_with_empty_attr(c.FIELDS_CUSTOMER)

# 5. check if parent exists (company is parent of customer)
                        parent = request.user.company
                        if parent:
# B. Delete instance
                            if is_delete:
                                instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)
                                if instance:
                                    this_text = _("Customer '%(tbl)s'") % {'tbl': instance.code}
                                    m.delete_instance(instance, table, update_dict, request, this_text)
                            else:
# C. Create new customer
                                if is_create:
                                    instance = create_customer(upload_dict, update_dict, request)
# D. Get existing customer
                                else:
                                    instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)
# E. Update customer, also when it is created
                                if instance:
                                    update_customer(instance, parent, upload_dict, update_dict, request)

 # F. remove empty attributes from update_dict
                        f.remove_empty_attr_from_dict(update_dict)

 # G. add update_dict to update_wrap
                        if update_dict:
                            update_list = [update_dict]
                            # TODO return multiple changed items
                            update_wrap['update_list'] = update_list
# 8. update order_list when changes are made
                        # inactive = None: include active and inactive
                        customer_list = d.create_customer_list(
                            company=request.user.company,
                            cat_lt=c.SHIFT_CAT_0512_ABSENCE)
                        if customer_list:
                            update_wrap['customer_list'] = customer_list

# =====  ORDER  ==========
                    elif table == "order":

    # 1. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                        update_dict = f.create_dict_with_empty_attr(c.FIELDS_ORDER)
                        logger.debug('upload_dict: ' + str(upload_dict))

    # 2. check if parent exists (customer is parent of order)
                        parent = m.Customer.objects.get_or_none(id=ppk_int, company=request.user.company)
                        logger.debug('parent: ' + str(parent))
                        if parent:
# B. Delete instance
                            if is_delete:
                                instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
                                if instance:
                                    this_text = _("Order '%(tbl)s'") % {'tbl': instance.code}
                                    m.delete_instance(instance, table, update_dict, request, this_text)
                            else:
# C. Create new order
                                if is_create:
                                    instance = create_order(upload_dict, update_dict, request)
    # D. Get existing instance
                                else:
                                    instance = m.get_instance(table, pk_int, parent, update_dict)
    # E. update instance, also when it is created
                                if instance:
                                    update_order(instance, parent, upload_dict, update_dict, user_lang, request)

    # 6. remove empty attributes from update_dict
                        f.remove_empty_attr_from_dict(update_dict)

    # 7. add update_dict to update_wrap
                        if update_dict:
                            update_list = []
                            update_list.append(update_dict)
                            update_wrap['update_list'] = update_list

    # 8. update order_list when changes are made
                        # inactive = None: include active and inactive
                        order_list = d.create_order_list(company=request.user.company, user_lang=user_lang)  # cat=SHIFT_CAT_0000_NORMAL,
                        if order_list:
                            update_wrap['order_list'] = order_list

     # 9. return update_wrap

        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))



@method_decorator([login_required], name='dispatch')
class PricerateUploadView(UpdateView):# PR2019-10-02

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= PricerateUploadView ============= ')

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
                logger.debug('upload_dict: ' + str(upload_dict))

    # 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    update_dict = {}
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)
                    logger.debug('table: ' + str(table) + ' ppk_int: ' + str(ppk_int))
# =====  ORDER  ==========
                    if table == "order":
                        update_dict = f.create_dict_with_empty_attr(c.FIELDS_ORDER)
                        parent = m.Customer.objects.get_or_none(id=ppk_int, company=request.user.company)
                        logger.debug('parent: ' + str(parent))
                        if parent:
                            instance = m.get_instance(table, pk_int, parent, update_dict)
                            logger.debug('parent: ' + str(instance))
                            if instance:
                                update_order(instance, parent, upload_dict, update_dict, user_lang, request)
                        f.remove_empty_attr_from_dict(update_dict)
# =====  SCHEME  ==========
                    if table == "scheme":
                        update_dict = f.create_dict_with_empty_attr(c.FIELDS_SCHEME)
                        parent = m.Order.objects.get_or_none(id=ppk_int, customer__company=request.user.company)
                        logger.debug('SCHEME parent: ' + str(parent))
                        if parent:
                            instance = m.get_instance(table, pk_int, parent, update_dict)
                            logger.debug('SCHEME instance: ' + str(instance))
                            if instance:
                                update_scheme(instance, upload_dict, update_dict, user_lang, request)
                        f.remove_empty_attr_from_dict(update_dict)
# =====  SHIFT  ==========
                    if table == "shift":
                        update_dict = f.create_dict_with_empty_attr(c.FIELDS_SHIFT)
                        parent = m.Scheme.objects.get_or_none(id=ppk_int, order__customer__company=request.user.company)
                        logger.debug('SHIFT parent: ' + str(parent))
                        if parent:
                            instance = m.get_instance(table, pk_int, parent, update_dict)
                            logger.debug('SHIFT instance: ' + str(instance))
                            if instance:
                                update_shift(instance, parent, upload_dict, update_dict, user_lang, request)
                        f.remove_empty_attr_from_dict(update_dict)
                    if update_dict:
                        update_wrap['update_dict'] = update_dict
# 8. create pricerate_list
                    pricerate_list = d.create_order_pricerate_list(company=request.user.company, user_lang=user_lang)
                    if pricerate_list:
                        update_wrap['pricerate_list'] = pricerate_list

     # 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


# === Order ===================================== PR2019-03-27
@method_decorator([login_required], name='dispatch')
class OrderListView(View):

    def get(self, request):
        param = {}
        if request.user.company is not None:
            orders = m.Order.objects.filter(customer__company=request.user.company)

            # b. get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            # get weekdays translated
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            if not user_lang in c.WEEKDAYS_ABBREV:
                user_lang = c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[user_lang])

            # get months translated
            if not user_lang in c.MONTHS_ABBREV:
                user_lang = c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[user_lang])

            param = get_headerbar_param(request, {
                'order': orders,
                'lang': user_lang,
                'timezone': comp_timezone,
                'weekdays': weekdays_json,
                'months': months_json,
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'orders.html', param)


@method_decorator([login_required], name='dispatch')
class OrderUploadView(UpdateView):# PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= OrderUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:
# A.
    # 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict' + str(upload_dict))

    # 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode = f.get_iddict_variables(id_dict)

    # 4. Create empty update_dict with keys for all fields. Unused ones will be removed at the end

                    #FIELDS_ORDER = ('id', 'customer', 'cat', 'code', 'name', 'datefirst', 'datelast',
                    #                'sequence', 'identifier', 'rate', 'taxcode', 'locked', 'inactive')
                    field_list = c.FIELDS_ORDER
                    update_dict = f.create_dict_with_empty_attr(field_list)
                    # logger.debug('update_dict: ' + str(update_dict))

    # 5. check if parent exists (customer is parent of order)
                    parent = m.get_parent(table, ppk_int, update_dict, request)
                    if parent:
# B. Delete instance
                        if is_delete:
                            instance = m.get_instance(table, pk_int, parent, update_dict)
                            this_text = _("Order '%(tbl)s'") % {'tbl': instance.code}
                            m.delete_instance(instance, table, update_dict, request, this_text)
# C. Create new order
                        elif is_create:
                            instance = create_order(upload_dict, update_dict, request)
# D. Get existing instance
                        else:
                            instance = m.get_instance(table, pk_int, parent, update_dict)
# E. update instance, also when it is created
                        if instance:
                            update_order(instance, parent, upload_dict, update_dict, user_lang, request)

    # 6. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)

    # 7. add update_dict to update_wrap
                    if update_dict:
                        update_wrap['update_dict'] = update_dict

    # 8. update order_list when changes are made
                    # inactive = None: include active and inactive
                    order_list = d.create_order_list(company=request.user.company, user_lang=user_lang)  #  cat=SHIFT_CAT_0000_NORMAL,
                    if order_list:
                        update_wrap['order_list'] = order_list
# 9. return update_wrap
        # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_insXXXXXXXXXXtance(table, parent_instance, code, name, temp_pk_str, update_dict, request):
    instance = None
    pk_int = None
    parent_pk_int = None
# - parent and code are required
    if parent_instance and code:
# - create instance
        if table == 'order':
            instance = m.Order(customer=parent_instance, code=code, name=name)
        elif table == 'customer':
            instance = m.Customer(company=parent_instance, code=code, name=name)
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
def create_customer(upload_dict, update_dict, request):
    # --- create customer or order # PR2019-06-24
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    logger.debug(' --- create_customer')
    logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    instance = None

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'customer'
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')

        # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:
            # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent instance
        parent = m.get_parent(table, ppk_int, update_dict, request)
        if parent:

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
                code = name[:c.CODE_MAX_LENGTH]
            if code and name:

    # c. validate code and name
                has_error = v.validate_code_name_identifier(table, 'code', code, parent, update_dict)
                if not has_error:
                    has_error = v.validate_code_name_identifier(table, 'name', name, parent, update_dict)

# 4. create and save 'customer' or 'order'
                    if not has_error:
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
    logger.debug(' --- update_customer --- ')
    logger.debug('upload_dict: ' + str(upload_dict))

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
                            has_error = v.validate_code_name_identifier(table, field, new_value, parent, update_dict, this_pk=None)
                            if not has_error:
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

# 6. put updated saved values in update_dict
        d.create_customer_dict(instance, update_dict)

    return has_error

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_order(upload_dict, update_dict, request):
    # --- create customer or order # PR2019-06-24
    # Note: all keys in update_dict must exist by running create_dict_with_empty_attr first
    # logger.debug(' --- create_customer_or_order')
    # logger.debug(upload_dict)
    # {'id': {'temp_pk': 'new_1', 'create': True, 'ppk': 1, 'table': 'customer'}, 'code': {'value': 'nw4', 'update': True}}

    instance = None

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'order'
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')

    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:  # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent instance
        parent = m.get_parent(table, ppk_int, update_dict, request)
        if parent:

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
                code = name[:c.CODE_MAX_LENGTH]
            if code and name:

    # c. validate code and name
                has_error = v.validate_code_name_identifier(table, 'code', code, parent, update_dict)
                if not has_error:
                    has_error = v.validate_code_name_identifier(table, 'name', name, parent, update_dict)

# 4. create and save 'customer' or 'order'
                    if not has_error:
                        instance = m.Order(customer=parent, code=code, name=name)
                        instance.save(request=request)

# 5. return msg_err when instance not created
                        if instance.pk is None:
                            msg_err = _('This order could not be created.')
                            update_dict['code']['error'] = msg_err
                        else:
# 6. put info in update_dict
                            update_dict['id']['created'] = True

    return instance

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_order(instance, parent, upload_dict, update_dict, user_lang, request):
    # --- update existing and new customer or order PR2019-06-24
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' --- update_order --- ')
    logger.debug('upload_dict: ' + str(upload_dict))

    has_error = False
    if instance:
        # FIELDS_ORDER = ('id', 'customer', 'cat', 'code', 'name', 'datefirst', 'datelast',
        #                 'sequence', 'identifier', 'priceratejson', 'taxcode', 'locked', 'inactive')
        table = 'order'
        save_changes = False
        for field in c.FIELDS_ORDER:
            # --- get field_dict from  item_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
# a. get new_value
                    new_value = field_dict.get('value')
                    logger.debug('new_value: ' + str(new_value))

# 2. save changes in field 'code', 'name'
                    if field in ['code', 'name']:
        # a. get old value
                        saved_value = getattr(instance, field)
                        # fields 'code', 'name' are required
                        if new_value != saved_value:
        # b. validate code or name
                            has_error = v.validate_code_name_identifier(table, field,
                                                                        new_value, parent, update_dict, instance.pk)
                            if not has_error:
        # c. save field if changed and no_error
                                setattr(instance, field, new_value)
                                is_updated = True

        # 3. save changes in field 'billable'
                    elif field in ['billable']:
                        is_override = field_dict.get('override', False)
                        is_billable = field_dict.get('billable', False)
                        logger.debug('is_override: ' + str(is_override))
                        logger.debug('is_billable: ' + str(is_billable))
                        new_value = 0
                        if is_override:
                            new_value = 2 if is_billable else 1
                        logger.debug('new_value: ' + str(new_value))
                        saved_value = getattr(instance, field, 0)
                        logger.debug('saved_value: ' + str(saved_value))

                        if new_value != saved_value:
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
                            old_date = getattr(instance, field)
                            if new_date != old_date:
                                setattr(instance, field, new_date)
                                is_updated = True

    # 4. save changes in fields 'priceratejson'
                    elif field in ['priceratejson']:
                        logger.debug('field: ' + str(field))
                        # TODO save pricerate with date and wagefactor
                        rosterdate = None
                        wagefactor = None

                        pricerate_is_updated = f.save_pricerate_to_instance(instance, rosterdate, wagefactor, new_value, update_dict, field)
                        if pricerate_is_updated:
                            is_updated = True

                        logger.debug('instance.priceratejson: ' + str(instance.priceratejson))
                        logger.debug('is_updated: ' + str(is_updated))

    # 4. save changes in field 'taxcode'
                    elif field in ['taxcode']:
            # a. get new taxcode_pk
                        new_taxcode_pk = int(field_dict.get('pk', 0))
                        if new_taxcode_pk:
            # b. check if new_taxcode exists
                            taxcode = m.Taxcode.objects.get_or_none(id=new_taxcode_pk, company=request.user.company)
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

    # 5. add 'updated' to field_dict'
                    if is_updated:
                        update_dict[field]['updated'] = True
                        save_changes = True
                        logger.debug('update_dict[field]: ' + str(update_dict[field]))

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        d.create_order_dict(instance, update_dict, user_lang)

    return has_error
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

