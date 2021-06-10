
# PR2019-03-02
from django.contrib.auth.decorators import login_required
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

from tsap import settings
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
        param = get_headerbar_param(request)
        return render(request, 'customers.html', param)


@method_decorator([login_required], name='dispatch')
class CustomerUploadView(UpdateView):# PR2019-03-04 PR2021-03-21

    def post(self, request, *args, **kwargs):
        logging_on = settings.LOGGING_ON
        update_wrap = {}
        messages = []
        if request.user is not None and request.user.company is not None:

# - reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)

# - get variables
                table = upload_dict.get('table')
                pk_int = upload_dict.get('pk')
                ppk_int = upload_dict.get('ppk')
                map_id = upload_dict.get('mapid')
                is_create = upload_dict.get('create', False)
                is_delete = upload_dict.get('delete', False)

                # PR2021-03-21 is_absence is always False when called byCustomerUploadView.
                is_absence = False

                if logging_on:
                    logger.debug(' ============= CustomerUploadView ============= ')
                    logger.debug('upload_dict: ' + str(upload_dict))
                    logger.debug('pk_int:    ' + str(pk_int))
                    logger.debug('ppk_int:   ' + str(ppk_int))
                    logger.debug('map_id:    ' + str(map_id))
                    logger.debug('is_create: ' + str(is_create))
                    logger.debug('is_delete: ' + str(is_delete))

# TODO check identifier for duplicates

                updated_list = []
                deleted_list = []
                messages = []
                msg_dict = {}
                is_created = False

# =====  CUSTOMER  ==========
                if table == "customer":

# - check if parent with ppk_int exists and is same as request.user.company
                    parent = m.Company.objects.get_or_none(id=ppk_int)
                    if parent and ppk_int == request.user.company_id:

# +++ Delete customer
                        if is_delete:
                            instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)
                            if instance:
                                this_text = _("Customer '%(tbl)s'") % {'tbl': instance.code}

                        # - check if customer has emplhours or schemes
                                # validate_order_has_emplhours_or_schemes, returns msg_err when error
                                msg_err = v.validate_customer_has_emplhours_or_schemes(instance)
                                if logging_on and msg_err:
                                    logger.debug('msg_err: ' + str(msg_err))

                                if msg_err:
                                    msg_dict['err_delete'] = msg_err
                                else:
                        # - create deleted_row, to be sent back to page
                                    deleted_row = {'pk': instance.pk,
                                                   'mapid': map_id,
                                                   'deleted': True}
                        # - delete customer
                                    msg_dict = m.delete_instance(instance, request, this_text)
                                    if msg_dict:
                                        messages.append(msg_dict)
                                    else:
                                # - add deleted_row to deleted_list
                                        deleted_list.append(deleted_row)
                                        instance = None
                                        if logging_on:
                                            logger.debug('delete customer ok')
                                            logger.debug('deleted_row: ' + str(deleted_row))

                        else:
# +++  Create new customer
                            if is_create:
                                instance, msg_err = create_new_customer(parent, upload_dict, request)
                                if msg_err:
                                    msg_dict['err_create'] = msg_err
                                    instance = None
                                if instance:
                                    is_created = True
                                if logging_on:
                                    logger.debug('customer instance:   ' + str(instance))
                                    logger.debug('msg_err: ' + str(msg_err))
                                    logger.debug('is_created: ' + str(is_created))

# +++  Get existing customer
                            else:
                                instance = m.Customer.objects.get_or_none(id=pk_int, company=parent)
                            if logging_on:
                                logger.debug('customer instance:   ' + str(instance))
                                logger.debug('is_created: ' + str(is_created))

# +++  Update customer, also when it is created
                            if instance:
                                update_customer(instance, parent, upload_dict, logging_on, request)
# +++  create order_row, add deleted_row
# G. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
                        if instance:
                            updated_list = cd.create_customer_rows(
                                request=request,
                                customer_pk=instance.pk)
                            if updated_list and updated_list[0]:
                                updated_row = updated_list[0]
                                if is_created:
                                    # - add 'created' to updated_row, to show OK when new row is added to table
                                    updated_row['created'] = True
                                if msg_dict:
                                    updated_row.update({'msg': msg_dict})

                        if deleted_list:
                            updated_list.extend(deleted_list)

# =====  ORDER  ==========
                elif table == "order":

# - check if parent exists (customer is parent of order)
                    parent = m.Customer.objects.get_or_none(id=ppk_int, company=request.user.company)
                    #logger.debug('parent: ' + str(parent))
                    #logger.debug('is_delete: ' + str(is_delete))
                    if parent:
# +++  Delete order
                        if is_delete:
                            instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
                            if instance:
                                this_text = _("Order '%(tbl)s'") % {'tbl': instance.code}

                        # - check if order has emplhours or schemes
                                is_abscat = False
                                # validate_order_has_emplhours_or_schemes, returns msg_err when error
                                msg_err = v.validate_order_has_emplhours_or_schemes(instance, is_abscat)
                                if logging_on and msg_err:
                                    logger.debug('msg_err: ' + str(msg_err))

                                if msg_err:
                                    msg_dict['err_delete'] = msg_err
                                else:
                       # - create deleted_row, to be sent back to page
                                    deleted_row = {'pk': instance.pk,
                                                   'mapid': map_id,
                                                   'deleted': True}
                        # - delete order
                                    msg_dict = m.delete_instance(instance, request, this_text)
                                    if msg_dict:
                                        messages.append(msg_dict)
                                    else:
                                # - add deleted_row to deleted_list
                                        deleted_list.append(deleted_row)
                                        instance = None
                                        if logging_on:
                                            logger.debug('delete order ok')
                                            logger.debug('deleted_row: ' + str(deleted_row))

                        else:

# +++  Create new order
                            if is_create:
                                instance, msg_err = create_order(parent, is_absence, upload_dict, logging_on, request)
                                if instance:
                                    is_created = True
                                if msg_err:
                                    msg_dict['err_create'] = msg_err
# +++  Get existing order
                            else:
                                instance = m.Order.objects.get_or_none(id=pk_int, customer=parent)
                            if logging_on:
                                logger.debug('instance:   ' + str(instance))
                                logger.debug('is_created: ' + str(is_created))

# +++  Update order, also when it is created
                            if instance:
                                update_order(instance, parent, upload_dict, logging_on, request)

# +++  create order_row, add deleted_row
# G. put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
                        if instance:
                            updated_list = cd.create_order_rows(
                                request=request,
                                is_absence=is_absence,
                                order_pk=instance.pk)

                            if updated_list and updated_list[0]:
                                updated_row = updated_list[0]
                                if is_created:
                                # - add 'created' to updated_row, to show OK when new row is added to table
                                    updated_row['created'] = True
                                if msg_dict:
                                    updated_row.update({'msg': msg_dict})
                        if deleted_list:
                            updated_list.extend(deleted_list)
# =====  END ORDER  ==========

#  - add update_list to update_wrap
                if table == "customer":
                    update_wrap['updated_customer_rows'] = updated_list
                else:
                    update_wrap['updated_order_rows'] = updated_list

# - return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class OrdernoteUploadView(UpdateView):  # PR2021-02-16

    def post(self, request, *args, **kwargs):
        logger.debug(' ')
        logger.debug(' ============= OrdernoteUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)

# - get iddict variables
                ppk_int = upload_dict.get('ppk')
                is_create = upload_dict.get('create', False)
                note = upload_dict.get('note')

                logger.debug('upload_dict: ' + str(upload_dict))
                logger.debug('ppk_int: ' + str(ppk_int))
                logger.debug('is_create: ' + str(is_create))

# - get parent (order)
                order = m.Order.objects.get_or_none(pk=ppk_int, customer__company=request.user.company)
                if order:
# - Create new note:
                    if is_create and note:
                        ordernote = m.Ordernote(
                            order=order,
                            note=note
                        )
                        ordernote.save(request=request)
# - get employeenote_rows
                        filter_dict = {'order_pk_list': [order.pk]}
                        ordernote_rows = cd.create_ordernote_rows(
                            period_dict=filter_dict,
                            request=request)
                        if ordernote_rows:
                            update_wrap['ordernote_updates'] = ordernote_rows

# 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))
# - end of OrdernoteUploadView





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

                logging_on = settings.LOGGING_ON

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
                                update_order(instance, parent, upload_dict, logging_on, request)
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


def create_new_customer(parent, upload_dict, request):
    # --- create customer or order # PR2019-06-24 PR2021-03-21
    # Note: all keys in update_dict must exist by running create_update_dict first
    #logger.debug(' --- create_customer')

    instance = None
    msg_err = None

    table = 'customer'

# 2. get parent instance
    if parent:
# 3. Get value of 'code' and 'name'
        code = upload_dict.get('code')
        name = upload_dict.get('name')

# b. copy code to name if name is empty, also vice versa (slice name is necessary)
        if name is None:
            name = code
        elif code is None:
            code = name[:c.CODE_MAX_LENGTH]
        if code and name:

# c. validate code and name
            msg_err = v.validate_code_name_identifier(table, 'code', code, False, parent, request)
            if not msg_err:
                msg_err = v.validate_code_name_identifier(table, 'name', name, False, parent, request)

# 4. create and save customer
                if not msg_err:
                    try:
                        instance = m.Customer(company=parent, code=code, name=name)
                        instance.save(request=request)
                    except Exception as e:
# 5. return msg_err when instance not created
                        instance = None
                        logger.error(getattr(e, 'message', str(e)))
                        msg_err = _('This customer could not be created.')

    return instance, msg_err


def update_customer(instance, parent, upload_dict, logging_on, request):
    # --- update existing and new customer or order PR2019-06-24
    # add new values to update_dict (don't reset update_dict, it has values)

    if logging_on:
        logger.debug(' --- update_customer --- ')
        logger.debug('upload_dict: ' + str(upload_dict))

    err_list = []
    if instance:
        # FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier', 'email', 'telephone',
        # 'interval', 'inactive')
        table = 'customer'
        save_changes = False

        for field, field_value in upload_dict.items():
            if logging_on:
                logger.debug('field:       ' + str(field))
                logger.debug('field_value: ' + str(field_value))

# - save changes in field 'code', 'name', 'identifier'
            if field in ['code', 'name', 'identifier']:
    # - get new_value
                new_value = field_value
    # - get old value
                saved_value = getattr(instance, field)
                # fields 'code', 'name' are required
                if new_value != saved_value:
        # - validate code or name
                #  (code, name: blank_not_allowed, unique in customer; identifier: blank_not_allowed, unique in company
                    msg_err = v.validate_code_name_identifier(table, field,
                        new_value, False, parent, request, instance.pk)
                    if msg_err:
                        err_list.append(msg_err)
                    else:
        # - save field if changed and no_error
                        setattr(instance, field, new_value)
                        save_changes = True

# 3. save changes in fields 'email', 'telephone'
            elif field in ['email', 'telephone']:
                new_value = field_value
                saved_value = getattr(instance, field)
                if new_value != saved_value:
                    setattr(instance, field, new_value)
                    save_changes = True

# 3. save changes in fields 'interval'
            elif field in ['interval']:
                new_value = field_value if field_value else 5
                saved_value = getattr(instance, field, 5)
                if new_value != saved_value:
                    setattr(instance, field, new_value)
                    save_changes = True

# 4. save changes in field 'inactive'
            elif field == 'inactive':
                new_value = field_value if field_value else False
                saved_value = getattr(instance, field)
                if new_value != saved_value:
                    setattr(instance, field, new_value)
                    save_changes = True
# --- end of for loop ---

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except Exception as e:
                logger.error(getattr(e, 'message', str(e)))
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                err_list.append(msg_err)

    return err_list


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_order(parent, is_absence, upload_dict, logging_on, request):
    # --- create customer or order # PR2019-06-24
    # Note: all keys in update_dict must exist by running create_update_dict first
    if logging_on:
        logger.debug(' --- create_order   ---- ')
        logger.debug(' upload_dict ', str(upload_dict))
        logger.debug('is_absence: ' + str(is_absence))

    table = 'order'
    instance = None
    msg_err = None

# 2. get parent instance
    if parent:
# 3. Get value of 'code' and 'name'
        code = upload_dict.get('code')
        name = upload_dict.get('name')
        # is_absence is a parameter of this function

# b. copy code to name if name is empty, also vice versa (slice name is necessary)
        if name is None:
            name = code
        elif code is None:
            code = name[:c.CODE_MAX_LENGTH]

        if logging_on:
            logger.debug('code: ' + str(code))
            logger.debug('name: ' + str(name))

# c. validate code and name
        if code and name:
            # validator creates key 'code' or 'name' in update_dict if they don't exist
            msg_err = v.validate_code_name_identifier(table, 'code', code, False, parent, request)
            if logging_on and msg_err:
                logger.debug('msg_err' + str(msg_err))

            if not msg_err:
                msg_err = v.validate_code_name_identifier(table, 'name', name, False, parent, request)

# 4. create and save order
                if not msg_err:
                    instance = m.Order(
                        customer=parent,
                        code=code,
                        name=name,
                        isabsence=is_absence
                    )
                    instance.save(request=request)
                    if logging_on:
                        logger.debug('instance' + str(instance) + ' pk: ' + str(instance.pk))

# 5. return msg_err when instance not created
                    if instance.pk is None:
                        msg_err = _('This order could not be created.')

    return instance, msg_err

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_order(instance, parent, upload_dict, logging_on, request):
    # --- update existing and new customer or order PR2019-06-24 PR2021-03-21
    # called by CustomerUploadView, PricerateUploadView, PayrollUploadView.upload_abscat_order

    if logging_on:
        logger.debug(' --- update_order --- ')
        logger.debug('upload_dict: ' + str(upload_dict))

    err_list = []
    if instance:
        table = 'order'
        save_changes = False
        recalc_nohours = False
        recalc_wagefactor = False

        comp_timezone = request.user.company.timezone if request.user.company.timezone else settings.TIME_ZONE

        for field, field_value in upload_dict.items():
            if logging_on:
                logger.debug('field:       ' + str(field))
                logger.debug('field_value: ' + str(field_value))

# - save changes in field 'code', 'name', 'identifier'
            if field in ['code', 'name', 'identifier']:
    # - get new_value
                new_value = field_value
    # - get old value
                saved_value = getattr(instance, field)
                # fields 'code', 'name' are required
                if new_value != saved_value:
    # - validate field  (code, name: blank_not_allowed, unique in customer; identifier: blank_not_allowed, unique in company
                    msg_err = v.validate_code_name_identifier(table, field,
                           new_value, False, parent, request, instance.pk)
                    if msg_err:
                        err_list.append(msg_err)
                    else:
    # - save field if changed and no_error
                        setattr(instance, field, new_value)
                        save_changes = True

# - save changes in field 'sequence'
            elif field == 'sequence':
                new_value = field_value
                saved_value = getattr(instance, field)
                if new_value != saved_value:
                    setattr(instance, field, new_value)
                    save_changes = True

# - save changes in field 'billable'
            elif field in ['billable']:
                is_billable = field_value if field_value else False
                is_override = upload_dict.get('override', False)
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
                    save_changes = True

# - save changes in date fields
            elif field in ['datefirst', 'datelast']:
                # not used in abscat_order
                new_value = field_value
# a. get new_date
                new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
# b. validate value
                if msg_err:
                    err_list.append(msg_err)
                else:
# c. save field if changed and no_error
                    old_date = getattr(instance, field)
                    if new_date != old_date:
                        setattr(instance, field, new_date)
                        save_changes = True

            elif field in ('nohoursonweekday', 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday'):
                # only used in abscat_order
# a. get old value
                new_value = field_value if field_value else False
                saved_value = getattr(instance, field, False)
                if new_value != saved_value:
# c. save field if changed
                    setattr(instance, field, new_value)
                    save_changes = True
                    recalc_nohours = True

            elif field in ('wagefactorcode', 'wagefactoronsat', 'wagefactoronsun', 'wagefactoronph'):
                # only used in abscat_order, normal orders get wfc values from shift
                # a. get old value
                new_pk_int = field_value if field_value else False
                new_wagefactor = m.Wagecode.objects.get_or_none(
                    id=new_pk_int,
                    key= 'wfc')
                saved_wagefactor = getattr(instance, field, False)
                if new_wagefactor != saved_wagefactor:
                    # c. save field if changed
                    setattr(instance, field, new_wagefactor)
                    save_changes = True
                    recalc_wagefactor = True
                if logging_on:
                    logger.debug('new_pk_int: ' + str(new_pk_int))
                    logger.debug('new_wagefactor: ' + str(new_wagefactor))
                    logger.debug('saved_wagefactor: ' + str(saved_wagefactor))
                    logger.debug('save_changes: ' + str(save_changes))

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

# 4. save changes in field 'taxcode'.
            elif field in ['taxcode']:
    # a. get new taxcode_pk
                new_taxcode_pk = field_value # field 'taxcode' contains taxcode.pk
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
                        err_list.append(msg_err)
                    else:
                        setattr(instance, field, taxcode)
                        save_changes = True
    # d. remove taxcode from order when pk is None
                else:
                    if instance.taxcode is not None:
                        instance.taxcode = None
                        save_changes = True

# 5. save changes in field 'inactive'
            elif field == 'inactive':
                new_value = field_value if field_value else False
                saved_value = getattr(instance, field)
                if new_value != saved_value:
                    setattr(instance, field, new_value)
                    save_changes = True
# --- end of for loop ---

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except Exception as e:
                logger.error(getattr(e, 'message', str(e)))
                msg_err = _('This %(tbl)s could not be updated.') % {'tbl': table}
                err_list.append(msg_err)
            finally:
                # TODO recalc emplhour records when necessary
                if recalc_wagefactor:
                    update_wagefactor_in_emplhour(instance, request)
                if recalc_nohours:
                    update_nohours_in_emplhour(instance, comp_timezone, request)
    return err_list
# - end of update_order
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def update_nohours_in_emplhour(abscat_order, comp_timezone, request):
    # logger.debug(' --- update_nohours_in_emplhour --- ')  # PR2021-02-28
    # - update field billable, amount, addition, tax in all orderhour records that are not locked
    logging_on = settings.LOGGING_ON
    if logging_on:
        logger.debug(' --- update_nohours_in_emplhour --- ')  # PR2021-02-28

    if abscat_order:

# - get emplhour records of this abscat_order that are not locked
        emplhours = m.Emplhour.objects.filter(
            orderhour__order=abscat_order,
            payrollpublished_id__isnull=True
        )
        for emplhour in emplhours:
            rosterdate_dte = emplhour.rosterdate
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)

# - get nohours These fields are in order and scheme. For absence only fields in table 'order' are used
            nohours_onwd = abscat_order.nohoursonweekday
            nohours_onsat = abscat_order.nohoursonsaturday
            nohours_onsun = abscat_order.nohoursonsunday
            nohours_onph = abscat_order.nohoursonpublicholiday

            if logging_on:
                logger.debug('is_saturday:       ' + str(is_saturday))
                logger.debug('is_sunday:         ' + str(is_sunday))
                logger.debug('is_publicholiday:  ' + str(is_publicholiday))
                logger.debug('is_companyholiday: ' + str(is_companyholiday))
                logger.debug('nohours_onwd:      ' + str(nohours_onwd))
                logger.debug('nohours_onsat:     ' + str(nohours_onsat))
                logger.debug('nohours_onsun:     ' + str(nohours_onsun))
                logger.debug('nohours_onph:      ' + str(nohours_onph))

# - calculate timeduration
            default_wmpd = request.user.company.workminutesperday
            employee_wmpd = 0
            if emplhour.employee:
                employee_wmpd = emplhour.employee.workminutesperday
            timestart, timeend, planned_duration, time_duration, billing_duration, no_hours, excel_date, excel_start, excel_end = \
                f.calc_timedur_plandur_from_offset(
                    rosterdate_dte=rosterdate_dte,
                    is_absence=True, is_restshift=False, is_billable=False,
                    is_sat=is_saturday, is_sun=is_sunday, is_ph=is_publicholiday, is_ch=is_companyholiday,
                    row_offsetstart=emplhour.offsetstart, row_offsetend=emplhour.offsetend,
                    row_breakduration=emplhour.breakduration, row_timeduration=emplhour.timeduration,
                    row_plannedduration=0, update_plandur=True,
                    row_nohours_onwd=nohours_onwd,
                    row_nohours_onsat=nohours_onsat,
                    row_nohours_onsun=nohours_onsun,
                    row_nohours_onph=nohours_onph,
                    row_employee_pk=emplhour.employee_id,
                    row_employee_wmpd=employee_wmpd,
                    default_wmpd=default_wmpd,
                    comp_timezone=comp_timezone)

            if logging_on:
                logger.debug(
                    'plandur: ' + str(planned_duration) + ' timedur: ' + str(time_duration) + ' billdur: ' + str(
                        billing_duration))
                logger.debug(
                    'excel_date: ' + str(excel_date) + ' excel_start: ' + str(excel_start) + ' excel_end: ' + str(
                        excel_end))
            if time_duration != emplhour.timeduration:
                emplhour.timeduration = time_duration
                emplhour.save(request=request)
# - end of update_nohours_in_emplhour

def update_wagefactor_in_emplhour(abscat_order, request):
    # logger.debug(' --- update_wagefactor_in_emplhour --- ')  # PR2021-02-28
    # - update field billable, amount, addition, tax in all orderhour records that are not locked

    # - update wagefactor in emplhour records of this abscat_order that are not locked
    if abscat_order:
        default_wagefactor = None
        if abscat_order.customer.company:
            wfc_pk = abscat_order.customer.company.wagefactorcode_id
            if wfc_pk:
                default_wagefactor = m.Wagecode.objects.get_or_none(pk=wfc_pk, key='wfc')

        wfc_onwd = abscat_order.wagefactorcode
        wfc_onsat = abscat_order.wagefactoronsat
        wfc_onsun = abscat_order.wagefactoronsun
        wfc_onph = abscat_order.wagefactoronph

        emplhours = m.Emplhour.objects.filter(
            orderhour__order=abscat_order,
            payrollpublished_id__isnull=False
        )
        for emplhour in emplhours:
            rosterdate_dte = emplhour.rosterdate
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)
        # get wagefactor from order (= abscat) when absence
            wagefactor = None
            if is_publicholiday:
                wagefactor = wfc_onph
            elif is_sunday:
                wagefactor = wfc_onsun
            elif is_saturday:
                wagefactor = wfc_onsat
            # get wagefactor of weekday wagefactor if no value found
            if wagefactor is None:
                wagefactor = wfc_onwd
            if wagefactor is None:
                wagefactor = default_wagefactor
            if wagefactor != emplhour.wagefactorcode:
                emplhour.wagefactorcode = wagefactor
                if wagefactor:
                    emplhour.wagefactor = wagefactor.wagerate if wagefactor else 0
                    emplhour.wagefactorcaption = wagefactor.code
                else:
                    emplhour.wagefactor = 0
                    emplhour.wagefactorcaption = None
                emplhour.save(request=request)
# - end of update_wagefactor_in_emplhour

# >>>>>>>   ORDER IMPORT >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# === OrderImportView ===================================== PR2020-01-01
@method_decorator([login_required], name='dispatch')
class OrderImportView(View):
    #logger.debug(' ============= OrderImportView ============= ')

    def get(self, request):
        param = get_headerbar_param(request)
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
                    stored_json = request.user.company.get_companysetting(settings_key)
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
                    request.user.company.set_companysetting(c.KEY_ORDER_COLDEFS, new_setting_json)

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
        stored_setting_json = request.user.company.get_companysetting(c.KEY_ORDER_COLDEFS)

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
