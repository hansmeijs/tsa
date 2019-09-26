
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

from customers.dicts import create_customer_list, create_customer_dict, create_order_list, create_order_dict

from tsap.headerbar import get_headerbar_param

from tsap.settings import TIME_ZONE

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
        #logger.debug(' ============= CustomerUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:
# A.
    # 1. Reset languag
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

    # 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                # logger.debug('upload_dict' + str(upload_dict))

    # 3. get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)

# TODO check identifier for duplicates and empty
    # 4. Create empty update_dict with keys for all fields. Unused ones will be removed at the end

# =====  CUSTOMER  ==========
                    if table == "customer":
                        # FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier',
                        # 'email', 'telephone', 'interval', 'inactive')
                        field_list = c.FIELDS_CUSTOMER

                        update_dict = f.create_dict_with_empty_attr(field_list)

        # 5. check if parent exists (company is parent of customer)
                        parent = request.user.company
                        logger.debug('parent: ' + str(parent))
                        if parent:
    # B. Delete instance
                            if is_delete:
                                instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)
                                if instance:
                                    this_text = _("Customer '%(tbl)s'") % {'tbl': instance.code}
                                    m.delete_instance(instance, update_dict, request, this_text)
                            else:
    # C. Create new customer
                                if is_create:
                                    instance = create_customer(upload_dict, update_dict, request)
        # D. Get existing instance
                                else:
                                    instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)
        # E. Update instance, also when it is created
                                if instance:
                                    update_customer(instance, parent, upload_dict, update_dict, request)

        # 6. remove empty attributes from update_dict
                        f.remove_empty_attr_from_dict(update_dict)

        # 7. add update_dict to update_wrap
                        if update_dict:
                            update_list = []
                            update_list.append(update_dict)

                            update_wrap['update_list'] = update_list

        # 8. update order_list when changes are made
                        # inactive = None: include active and inactive
                        customer_list = create_customer_list(company=request.user.company, cat=c.SHIFT_CAT_0000_NORMAL)
                        if customer_list:
                            update_wrap['customer'] = customer_list

# =====  ORDER  ==========
                    elif table == "order":
        # 4. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                        logger.debug('==== ORDER === ')
                        #FIELDS_ORDER = ('id', 'customer', 'cat', 'code', 'name', 'datefirst', 'datelast',
                        # 'sequence', 'identifier', 'rate', 'taxcode', 'interval', 'locked', 'inactive')
                        field_list = c.FIELDS_ORDER

                        update_dict = f.create_dict_with_empty_attr(field_list)
                        logger.debug('upload_dict: ' + str(upload_dict))

        # 5. check if parent exists (customer is parent of order)
                        parent = m.get_parent(table, ppk_int, update_dict, request)
                        logger.debug('parent: ' + str(parent))
                        if parent:
    # B. Delete instance
                            if is_delete:
                                instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
                                if instance:
                                    this_text = _("Order '%(tbl)s'") % {'tbl': instance.code}
                                    m.delete_instance(instance, update_dict, request, this_text)
                            else:
    # C. Create new order
                                if is_create:
                                    instance = create_order(upload_dict, update_dict, request)
    # D. Get existing instance
                                else:
                                    instance = m.get_instance(table, pk_int, parent, update_dict)
    # E. update instance, also when it is created
                                if instance:
                                    update_order(instance, parent, upload_dict, update_dict, request)

    # 6. remove empty attributes from update_dict
                        f.remove_empty_attr_from_dict(update_dict)

    # 7. add update_dict to update_wrap
                        if update_dict:
                            update_list = []
                            update_list.append(update_dict)

                            update_wrap['update_list'] = update_list

    # 8. update order_list when changes are made
                        # inactive = None: include active and inactive
                        order_list = create_order_list(company=request.user.company)  # cat=SHIFT_CAT_0000_NORMAL,
                        if order_list:
                            update_wrap['order'] = order_list

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
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat = f.get_iddict_variables(id_dict)

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
                            m.delete_instance(instance, update_dict, request, this_text)
# C. Create new order
                        elif is_create:
                            instance = create_order(upload_dict, update_dict, request)
# D. Get existing instance
                        else:
                            instance = m.get_instance(table, pk_int, parent, update_dict)
# E. update instance, also when it is created
                        if instance:
                            update_order(instance, parent, upload_dict, update_dict, request)

    # 6. remove empty attributes from update_dict
                    f.remove_empty_attr_from_dict(update_dict)

    # 7. add update_dict to update_wrap
                    if update_dict:
                        update_wrap['item_update'] = update_dict

    # 8. update order_list when changes are made
                    # inactive = None: include active and inactive
                    order_list = create_order_list(company=request.user.company)  #  cat=SHIFT_CAT_0000_NORMAL,
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
    # upload_dict: {'id': {'temp_pk': 'new_2', 'create': True, 'parent_pk': 3, 'table': 'order'},
    # 'code': {'update': True, 'value': 'ee'}}

    save_changes = False
    has_error = False

# FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier', 'email', 'telephone', 'interval', 'inactive')

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'customer'
        pk_int = instance.pk
        ppk_int = instance.company.pk

        update_dict['pk'] = pk_int
        update_dict['ppk'] = ppk_int

        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = ppk_int
        update_dict['id']['table'] = table

# 2. save changes in field 'code', 'name'
        for field in ['code', 'name']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field)

                    # fields 'code', 'name' are required
                    if new_value != saved_value:
    # b. validate code or name

                        has_error = v.validate_code_name_identifier(table, field, new_value, parent, update_dict, this_pk=None)
                        if not has_error:
    # c. save field if changed and no_error
                            setattr(instance, field, new_value)
                            update_dict[field]['updated'] = True
                            save_changes = True

        # 3. save changes in fields 'namefirst', 'namelast'
        for field in ['identifier', 'email', 'telephone']:
            field_dict = upload_dict.get(field)
            if field_dict:
                # a. get new and old value
                if 'update' in field_dict:
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        update_dict[field]['updated'] = True
                        save_changes = True

        # 3. save changes in fields 'namefirst', 'namelast'
        for field in ['cat', 'interval']:
            field_dict = upload_dict.get(field)
            if field_dict:
                # a. get new and old value
                if 'update' in field_dict:
                    new_value = field_dict.get('value', 0)
                    saved_value = getattr(instance, field, 0)
                    if new_value != saved_value:
                        setattr(instance, field, new_value)
                        update_dict[field]['updated'] = True
                        save_changes = True

# 4. save changes in field 'inactive'
        field = 'inactive'
        logger.debug('field: ' + str(field))
        field_dict = upload_dict.get(field)
        logger.debug('field_dict: ' + str(field_dict))
        if field_dict:
            if 'update' in field_dict:
                new_value = field_dict.get('value')
                logger.debug('new_value: ' + str(new_value) + ' ' + str(type(new_value)))
                saved_value = getattr(instance, field, False)
                logger.debug('saved_value: ' + str(saved_value) + ' ' + str(type(saved_value)))
                if new_value != saved_value:
                    setattr(instance, field, new_value)
                    update_dict[field]['updated'] = True
                    save_changes = True
                    logger.debug('new saved_value: ' + str(getattr(instance, field, False)) + ' ' + str(type(getattr(instance, field, False))))

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        create_customer_dict(instance, update_dict)

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
def update_order(instance, parent, upload_dict, update_dict, request):
    # --- update existing and new customer or order PR2019-06-24
    # add new values to update_dict (don't reset update_dict, it has values)
    # logger.debug(' --- update_order --- ')

    save_changes = False
    has_error = False

# 1. get_iddict_variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table', '')
        pk_int = instance.pk
        ppk_int = instance.customer.pk

        update_dict['pk'] = pk_int
        update_dict['id']['pk'] = pk_int
        update_dict['id']['ppk'] = ppk_int
        update_dict['id']['table'] = table

# 2. save changes in field 'code', 'name'
        for field in ['code', 'name']:
            if field in upload_dict:
    # a. get new and old value
                field_dict = upload_dict.get(field)
                if 'update' in field_dict:
                    new_value = field_dict.get('value')
                    saved_value = getattr(instance, field)

                    # fields 'code', 'name' are required
                    if new_value != saved_value:
    # b. validate code or name

                        has_error = v.validate_code_name_identifier(table, field, new_value, parent, update_dict, pk_int)
                        if not has_error:
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
                    new_value = field_dict.get('value')  # new_value: '2019-04-12'
                    new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
    # b. validate value
                    if msg_err:
                        has_error = True
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
            try:
                instance.save(request=request)
            except:
                has_error = True
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        create_order_dict(instance, update_dict)

    return has_error
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

