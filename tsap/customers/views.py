
# PR2019-03-02
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.db.models.functions import Lower
from django.http import HttpResponse

from django.shortcuts import render, redirect
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from companies.models import Customer, Order, Scheme, Team, delete_instance
from companies.views import LazyEncoder

from planning.dicts import remove_empty_attr_from_dict
from customers.dicts import create_customer_dict, create_order_list, create_order_dict

from tsap.headerbar import get_headerbar_param
from tsap.constants import CODE_MAX_LENGTH, ABSENCE, ABSENCE_CATEGORY, LANG_DEFAULT, \
                    CAT_02_ABSENCE, CAT_03_TEMPLATE,  WEEKDAYS_ABBREV, MONTHS_ABBREV, TEMPLATE_TEXT
from tsap.settings import TIME_ZONE
from tsap.functions import get_date_from_ISOstring, create_dict_with_empty_attr, get_iddict_variables, set_fielddict_date
from tsap.validators import validate_code_or_name

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

        update_wrap = {}
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

    # 4. Create empty item_update with keys for all fields. Unused ones will be removed at the end
                    field_list = ('pk', 'id', 'code', 'name', 'identifier', 'inactive')
                    item_update = create_dict_with_empty_attr(field_list)

    # 5. check if parent exists (company is parent of customer)
                    instance = None
                    parent = request.user.company
                    if parent:
# B. Delete instance
                        if is_delete:
                            instance = get_instance(table, pk_int, parent)
                            this_text = _("Customer '%(tbl)s'") % {'tbl': instance.code}
                            delete_instance(instance, item_update, request, this_text)

# C. Create new customer
                        elif is_create:
                            instance = create_customer_or_order(upload_dict, item_update, request)

# D. Get existing instance
                        else:
                            instance = get_instance(table, pk_int, parent)

# E. Update instance, also when it is created
                        if instance:
                            update_customer_or_order(instance, upload_dict, item_update, request, user_lang)
                            logger.debug('updated instance: ' + str(instance))
                            update_wrap['item_dict'] = create_customer_dict(instance)

# 6. remove empty attributes from item_update
                    remove_empty_attr_from_dict(item_update)
                    logger.debug('item_update: ' + str(item_update))

# 7. add item_update to update_wrap
                    if item_update:
                        update_wrap['item_update'] = item_update

# 8. update customer_list when changes are made
                        # inactive = None: include active and inactive
                       #  inactive = None
                        # customer_list = create_customer_list(request.user.company, inactive, CAT_00_NORMAL)
                        # if customer_list:
                            # update_wrap['customer_list'] = customer_list

# 9. return item_update =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_wrap_json = json.dumps(update_wrap, cls=LazyEncoder)
        return HttpResponse(update_wrap_json)


# === Order ===================================== PR2019-03-27
@method_decorator([login_required], name='dispatch')
class OrderListView(View):

    def get(self, request):
        param = {}
        if request.user.company is not None:
            orders = Order.objects.filter(customer__company=request.user.company)

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
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
            activate(user_lang)

    # b. get comp_timezone PR2019-06-14
            # NIU comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

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
                    pk_int, ppk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)
                    logger.debug('id_dict: ' + str(id_dict))

    # 4. Create empty item_update with keys for all fields. Unused ones will be removed at the end
                    field_list = ('pk', 'id', 'code', 'name', 'identifier', 'datefirst', 'datelast', 'inactive')
                    item_update = create_dict_with_empty_attr(field_list)
                    logger.debug('item_update: ' + str(item_update))

    # 5. check if parent exists (customer is parent of order)
                    parent = get_parent_instance(table, ppk_int, request.user.company)
                    logger.debug('parent: ' + str(parent))
                    if parent:
                        instance = None
# B. Delete instance
                        if is_delete:
                            instance = get_instance(table, pk_int, parent)
                            this_text = _("Order '%(tbl)s'") % {'tbl': instance.code}
                            delete_instance(instance, item_update, request, this_text)

# C. Create new order
                        elif is_create:
                            instance = create_customer_or_order(upload_dict, item_update, request)
                            logger.debug('new instance: ' + str(instance))

# D. get existing instance
                        else:
                            instance = get_instance(table, pk_int, parent)
                            logger.debug('instance: ' + str(instance))

# E. update instance, also when it is created
                        if instance:
                            update_customer_or_order(instance, upload_dict, item_update, request, user_lang)

                        logger.debug('updated instance: ' + str(instance))

# 6. remove empty attributes from item_update
                    remove_empty_attr_from_dict(item_update)
                    logger.debug('item_update: ' + str(item_update))

# 7. add item_update to update_wrap
                    if item_update:
                        update_wrap['item_update'] = item_update

# 9. update order_list when changes are made
                    # inactive = None: include active and inactive
                    order_list = create_order_list(company=request.user.company)  #  cat=CAT_00_NORMAL,
                    if order_list:
                        update_wrap['order_list'] = order_list
        # 8. return item_update =
        # item_update =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


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
def create_instance(table, parent_instance, code, name, temp_pk_str, item_update, request):
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
            item_update['id']['error'] = msg_err
        else:
# - put info in id_dict
            item_update['id']['created'] = True
            item_update['id']['pk'] = instance.pk
            if table == 'order':
                item_update['id']['ppk'] = instance.customer.pk
            elif table == 'customer':
                item_update['id']['ppk'] = instance.company.pk

# this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
        if temp_pk_str:
            item_update['id']['temp_pk'] = temp_pk_str

    return instance


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_customer_or_order(upload_dict, item_update, request):
    # --- create customer or order # PR2019-06-24
    # Note: all keys in item_update must exist by running create_dict_with_empty_attr first
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
    # b. save temp_pk_str in in 'id' of item_update'
        if temp_pk_str:
            # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            item_update['id']['temp_pk'] = temp_pk_str

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
                    item_update['code']['error'] = msg_err
                else:
                    msg_err = validate_code_or_name(table, 'name', name, parent_pk)
                    if msg_err:
                        item_update['name']['error'] = msg_err

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
                    item_update['id']['error'] = msg_err
                else:

# 6. put info in item_update
                    item_update['id']['created'] = True
                   # item_update['code']['updated'] = True
                    #item_update['name']['updated'] = True

    logger.debug('item_update: ' + str(item_update))
    return instance

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_customer_or_order(instance, upload_dict, item_update, request, user_lang):
    # --- update existing and new customer or order PR2019-06-24
    # add new values to item_update (don't reset item_update, it has values)
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

        item_update['pk'] = pk_int
        item_update['id']['pk'] = pk_int
        item_update['id']['ppk'] = parent_pk
        item_update['id']['table'] = table

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
                        msg_err = validate_code_or_name(table, field, new_value, parent_pk, pk_int)
                        if msg_err:
                            item_update[field]['error'] = msg_err
                        else:
    # c. save field if changed and no_error
                            setattr(instance, field, new_value)
                            item_update[field]['updated'] = True
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
                        item_update[field]['error'] = msg_err
                    else:
    # c. save field if changed and no_error
                        old_date = getattr(instance, field, None)
                        if new_date != old_date:
                            setattr(instance, field, new_date)
                            save_changes = True
                            item_update[field]['updated'] = True
                            logger.debug('date saved: ' + str(instance.datefirst))

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
                        item_update[field]['updated'] = True
                        save_changes = True

                # logger.debug('timeduration: ' + str(schemeitem.timeduration) + str(type(schemeitem.timeduration)))
# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                item_update['id']['error'] = msg_err

# 6. put updated saved values in item_update
        logger.debug('for field in item_update: ' + str(item_update))
        create_order_dict(instance, item_update)
        """
        for field in item_update:
            if field not in ('id', 'pk'):

                saved_value = getattr(instance, field)
                if field in ['code', 'name', 'inactive']:
                    if saved_value:
                        item_update[field]['value'] = saved_value
                # also add date when empty, to add min max date
                elif field == 'datefirst':
                    maxdate = getattr(instance, 'datelast')
                    set_fielddict_date(dict=item_update[field], dte=saved_value, maxdate=maxdate)
                elif field == 'datelast':
                    mindate = getattr(instance, 'datefirst')
                    set_fielddict_date(dict=item_update[field], dte=saved_value, mindate=mindate)

        # 7. remove empty attributes from item_update
        remove_empty_attr_from_dict(item_update)
        logger.debug('item_update: ' + str(item_update))
        """
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


# === Create new 'template' customer and order
def create_template_order(request):
    # logger.debug(" === create_template_order ===")

    order = None

    user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
    template_locale = TEMPLATE_TEXT[user_lang]

# 1. check if 'template' customer exists for this company - only one 'template' customer allowed
    customer = Customer.objects.get_or_none(company=request.user.company, cat=CAT_03_TEMPLATE)
    if customer is None:
# 2. create 'template' customer if not exists
        customer = Customer(company=request.user.company,
                            code=template_locale,
                            name=template_locale,
                            cat=CAT_03_TEMPLATE)
        customer.save(request=request)
        # logger.debug("customer.save: " + str(customer.pk) + str(customer.code))

    if customer:
# 3. check if 'template' customer has order - only one 'template' order allowed
        order = Order.objects.get_or_none(customer=customer)
        if order is None:

# 4. create 'template' order if not exists
            order = Order(customer=customer,
                          code=template_locale,
                          name=template_locale,
                          cat=CAT_03_TEMPLATE)
            order.save(request=request)
            # logger.debug("order.save: " + str(order.pk) + ' ' + str(order.code))

    return order


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_parent_instance(table, ppk_int, company):
    # function checks if parent exists, writes 'parent_pk' and 'table' in item_update['id'] PR2019-06-17
    parent = None
    if ppk_int:
        if table == 'customer':
            parent = company
        elif table == 'order':
            parent = Customer.objects.get_or_none(id=ppk_int, company=company)
    return parent

def get_instance(table, pk_int, parent):
    # function checks if parent exists, writes 'parent_pk' and 'table' in item_update['id'] PR2019-06-17
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
            settings = Companysetting.get_setting(KEY_CUSTOMER_COLDEFS, request.user.company)
            stored_setting = {}
            if settings:
                stored_setting = json.loads(Companysetting.get_setting(KEY_CUSTOMER_COLDEFS, request.user.company))

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
                    stored_setting = json.loads(Companysetting.get_setting(KEY_CUSTOMER_COLDEFS, request.user.company))
                    # stored_setting = {'worksheetname': 'VakschemaQuery', 'no_header': False,
                    #                   'coldefs': {'customer': 'level_abbrev', 'orderdatefirst': 'sector_abbrev'}}

                    # don't replace keyvalue when new_setting[key] = ''
                    for key in new_setting:
                        if new_setting[key]:
                            stored_setting[key] = new_setting[key]
                    stored_setting_json = json.dumps(stored_setting)

                    # save stored_setting_json
                    Companysetting.set_setting(KEY_CUSTOMER_COLDEFS, stored_setting_json, request.user)

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