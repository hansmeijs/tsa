from django.db import connection
from django.db.models import Q
from tsap import constants as c
from tsap import functions as f
from companies import models as m
import json
import logging
logger = logging.getLogger(__name__)

def create_company_list(company):
    #logger.debug(' --- create_customer_list --- ')
    item_dict = {}
    if company:
        # FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier', 'email', 'telephone',
        # 'interval', 'inactive')
        for field in c.FIELDS_COMPANY:

            # --- get field_dict from  item_dict  if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = company.pk
                field_dict['table'] = 'company'
                item_dict['pk'] = company.pk

            else:
                value = getattr(company, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

    return item_dict


# ====== create_companyinvoice_list ======= PR2020-04-14
def create_companyinvoice_list(company):
    logger.debug(' --- create_customer_list --- ')
    # logger.debug('is_absence: ' + str(is_absence) + ' is_template: ' + str(is_template) + ' inactive: ' + str(inactive))

    # --- create list of customers of this company PR2019-09-03
    # .order_by(Lower('code')) is in model
    crit = Q(company=company)
    #if is_absence is not None:
    #    crit.add(Q(isabsence=is_absence), crit.connector)
    #if is_template is not None:
    #    crit.add(Q(istemplate=is_template), crit.connector)
    #if inactive is not None:
    #    crit.add(Q(inactive=inactive), crit.connector)
    companyinvoices = m.Companyinvoice.objects.filter(crit)
    logger.debug(str(companyinvoices.query))

    companyinvoice_list = []
    for companyinvoice in companyinvoices:
        item_dict = create_companyinvoice_dict(companyinvoice)
        logger.debug('companyinvoice_dict: ' + str(item_dict))

        if item_dict:
            companyinvoice_list.append(item_dict)

    return companyinvoice_list

# ====== create_companyinvoice_dict ======= PR2020-04-14
def create_companyinvoice_dict(companyinvoice):
    logger.debug(' --- create_companyinvoice_dict --- ')
    item_dict = {}
    if companyinvoice:
# FIELDS_COMPANYINVOICE = ('id', 'company', 'cat', 'entries', 'used', 'balance', 'entryrate',
#                          'datepayment', 'dateexpired', 'expired', 'note', 'locked')
        for field in c.FIELDS_COMPANYINVOICE:
            # --- get field_dict from  item_dict if it exists, if not: create empty dict
            field_dict = {}
            if field == 'id':
                field_dict['pk'] = companyinvoice.pk
                field_dict['ppk'] = companyinvoice.company.pk
                field_dict['table'] = 'companyinvoice'

            elif field == 'company':
                field_dict['pk'] = companyinvoice.company.pk
                field_dict['code'] = companyinvoice.company.code

            elif field == 'cat':
                field_dict['value'] = getattr(companyinvoice, field, 0)

            else:
                value = getattr(companyinvoice, field)
                if value:
                    field_dict['value'] = value
            if field_dict:
                item_dict[field] = field_dict
    return item_dict


def create_customer_list(company, is_absence=None, is_template=None, inactive=None):
    #logger.debug(' --- create_customer_list --- ')
    #logger.debug('is_absence: ' + str(is_absence) + ' is_template: ' + str(is_template) + ' inactive: ' + str(inactive))

# --- create list of customers of this company PR2019-09-03
    # .order_by(Lower('code')) is in model
    crit = Q(company=company)
    if is_absence is not None:
        crit.add(Q(isabsence=is_absence), crit.connector)
    if is_template is not None:
        crit.add(Q(istemplate=is_template), crit.connector)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    customers = m.Customer.objects.filter(crit)
    #logger.debug(str(customers.query))

    customer_list = []
    for customer in customers:
        item_dict = {}
        create_customer_dict(customer, item_dict)

        if item_dict:
            customer_list.append(item_dict)

    return customer_list

def create_customer_dict(customer, item_dict):
    # --- create dict of this customer PR2019-09-28
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    if customer:
        # FIELDS_CUSTOMER = id', 'company', 'cat', 'isabsence', 'istemplate', 'code', 'name', 'identifier',
        #                   'contactname', 'address', 'zipcode', 'city', 'country', 'email', 'telephone', 'interval',
        #                   'billable', 'pricecode', 'additioncode', 'taxcode', 'invoicecode', 'inactive', 'locked')

        for field in c.FIELDS_CUSTOMER:
# --- get field_dict from  item_dict  if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = customer.pk
                field_dict['ppk'] = customer.company.pk
                field_dict['table'] = 'customer'
                item_dict['pk'] = customer.pk
                if customer.isabsence:
                    field_dict['isabsence'] = True
                if customer.istemplate:
                    field_dict['istemplate'] = True

            elif field in ['company']:
                pass

            elif field in ['cat', 'interval']:
                field_dict['value'] = getattr(customer, field, 0)

            elif field in ['billable']:
                value = getattr(customer, field, 0)
                if not value:
                    comp_billable = getattr(customer.company, field, 0)
                    if comp_billable:
                        value = comp_billable * -1  # inherited value gets negative sign
                if value:
                    field_dict['value'] = value

            elif field in ['pricecode', 'additioncode', 'taxcode', 'invoicecode']:
                pass
                #pati = getattr(customer, field)
                #if pati:
                #    field_dict['pk'] = pati.pk
                #    field_dict['ppk'] = pati.company_id
                #    if pati.code:
                #        field_dict['note'] = pati.note

            else:
                value = getattr(customer, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


def create_order_list(company, user_lang, is_absence=None, is_template=None, is_inactive=None):
    #logger.debug(' --- create_order_list --- ')
    # Order of absence and template are made by system and cannot be updated
    # absence orders are loaded in create_abscat_list

    # date filter not in use (yet)
    datefirst_iso, datelast_iso = None, None

    sql_order = """ SELECT o.id AS o_id, c.id AS c_id, 
        COALESCE(o.code, '') AS o_code,
        COALESCE(c.code, '') AS c_code,
        CONCAT(c.code, ' - ', o.code) AS c_o_code,

        o.name,
        o.contactname,  o.address, o.zipcode,  o.city,  o.country, 
        o.identifier, 

        o.billable AS o_billable,
        o.sequence AS o_sequence,

        o.pricecode_id AS o_pc_id, 
        o.additioncode_id AS o_ac_id, 
        o.taxcode_id AS o_tc_id, 
        o.invoicecode_id AS o_ic_id,  
        
        o.datefirst, o.datelast,
        o.isabsence, o.istemplate ,
        o.inactive

        FROM companies_order AS o 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id)  

        WHERE c.company_id = %(compid)s
        AND ( o.datefirst <= CAST(%(rdl)s AS DATE) OR o.datefirst IS NULL OR %(rdl)s IS NULL )
        AND ( o.datelast >= CAST(%(rdf)s AS DATE) OR o.datelast IS NULL OR %(rdf)s IS NULL )
        AND ( o.inactive = CAST(%(inactive)s AS BOOLEAN) OR %(inactive)s IS NULL )
        AND ( o.isabsence = CAST(%(isabsence)s AS BOOLEAN) OR %(isabsence)s IS NULL )
        AND ( o.istemplate = CAST(%(istemplate)s AS BOOLEAN) OR %(istemplate)s IS NULL )
        AND ( c.inactive = CAST(%(inactive)s AS BOOLEAN) OR %(inactive)s IS NULL )
        ORDER BY LOWER(c.code), LOWER(o.code)
        """
    newcursor = connection.cursor()
    newcursor.execute(sql_order, {
        'compid': company.id,
        'rdf': datefirst_iso,
        'rdl': datelast_iso,
        'isabsence': is_absence,
        'istemplate': is_template,
        'inactive': is_inactive
    })
    orders = f.dictfetchall(newcursor)

    order_list = []
    for order in orders:
        item_dict = {}
        create_order_dict_from_sql(order, item_dict)

        if item_dict:
            order_list.append(item_dict)

    return order_list

#????????????

def create_order_dict_from_sql(instance, item_dict):
    # --- create dict of this order PR2019-09-28
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    # FIELDS_ORDER = ('id', 'customer', 'cat', 'isabsence', 'istemplate', 'code', 'name', 'datefirst', 'datelast',
    #                 'contactname', 'address', 'zipcode', 'city', 'country', 'identifier',
    #                 'billable', 'sequence', 'pricecode', 'additioncode', 'taxcode', 'invoicecode', 'inactive', 'locked')

    if instance:

# ---  get min max date
        datefirst = instance.get('datefirst')
        datelast = instance.get('datelast')

        for field in c.FIELDS_ORDER:

# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.get('o_id')
                field_dict['ppk'] = instance.get('c_id')
                field_dict['table'] = 'order'
                field_dict['isabsence'] = instance.get('isabsence', False)
                field_dict['istemplate'] = instance.get('istemplate', False)

            elif field == 'customer':
                field_dict['pk'] = instance.get('c_id')
                field_dict['code'] = instance.get('c_code')

            elif field == 'code':
                field_dict['value'] = instance.get('o_code')
                field_dict['cust_ordr_code'] = instance.get('c_o_code')

            elif field in ('name', 'identifier','contactname', 'address', 'zipcode',  'city',  'country'):
                value = instance.get(field)
                if value:
                    field_dict['value'] = value

            elif field in ['datefirst', 'datelast']:
                # also add date when empty, to add min max date
                if datefirst or datelast:
                    if field == 'datefirst':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_obj=datefirst,
                            maxdate=datelast)
                    elif field == 'datelast':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_obj=datelast,
                            mindate=datefirst)

            elif field == 'inactive':
                field_dict['value'] = instance.get(field)

            #elif field == 'billable':
                # use billable only in price page
                #value = instance.get('o_billable')
                #if not value:
                #    cust_billable = getattr(order.customer, field, 0)
                #    if cust_billable:
                #        value = cust_billable * -1  # inherited value gets negative sign
                #    else:
                #        comp_billable = getattr(order.customer.company, field, 0)
                #        if comp_billable:
                #            value = comp_billable * -1  # inherited value gets negative sign
                #if value:
                #    field_dict['value'] = value

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


def create_order_dict(order, item_dict):
    # --- create dict of this order PR2019-09-28
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    if order:
# ---  get min max date
        datefirst = getattr(order, 'datefirst')
        datelast = getattr(order, 'datelast')

        for field in c.FIELDS_ORDER:

# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = order.pk
                field_dict['ppk'] = order.customer.pk
                field_dict['table'] = 'order'
                if order.isabsence:
                    field_dict['isabsence'] = True
                if order.istemplate:
                    field_dict['istemplate'] = True

                item_dict['pk'] = order.pk

            elif field == 'customer':
                customer = getattr(order, field)
                if customer:
                    field_dict['pk'] = customer.pk
                    if customer.code:
                        field_dict['code'] = customer.code
                    if customer.inactive:
                        field_dict['inactive'] = customer.inactive

            elif field in ['cat']:
                cat_sum = getattr(order, field, 0)
                if cat_sum:
                    field_dict['value'] = cat_sum

            elif field == 'billable':
                value = getattr(order, field, 0)
                if not value:
                    cust_billable = getattr(order.customer, field, 0)
                    if cust_billable:
                        value = cust_billable * -1  # inherited value gets negative sign
                    else:
                        comp_billable = getattr(order.customer.company, field, 0)
                        if comp_billable:
                            value = comp_billable * -1  # inherited value gets negative sign
                if value:
                    field_dict['value'] = value

            elif field in ['datefirst', 'datelast']:
                # also add date when empty, to add min max date
                if datefirst or datelast:
                    if field == 'datefirst':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_obj=datefirst,
                            maxdate=datelast)
                    elif field == 'datelast':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_obj=datelast,
                            mindate=datefirst)

            elif field in ('nopay', 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday'):
                value = getattr(order, field, False)
                if value:
                    field_dict['value'] = value

            elif field in [ 'pricecode', 'additioncode', 'taxcode', 'invoicecode']:
                pass
                """
                                instance = getattr(order, field)
                                if instance:
                                    field_dict['pk'] = instance.pk
                                    field_dict['ppk'] = instance.company_id
                                    if instance.code:
                                        field_dict['code'] = instance.code
                """
            else:
                value = getattr(order, field)
                if value:
                    field_dict['value'] = value

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)
# end of create_order_dict


def create_absencecategory_list(request):
    # --- create list of all active absence categories of this company PR2019-06-25
    # each absence category contains abscat_customer, abscat_order
    order_list = []

    logger.debug(" --- create_absencecategory_list ---")
    # create an absence customer, order scheme and teams if they do not exist yet PR2019-07-27
    get_or_create_absence_customer(request)
    logger.debug(" --- get_or_create_absence_customer ---")
    # order by priority: which is sequence desc
    orders = m.Order.objects.filter(customer__company=request.user.company, isabsence=True)

    for order in orders:
        logger.debug(" --- for order in orders ---")
        dict = create_absencecat_dict(order, request)
        order_list.append(dict)

    return order_list


def create_absencecat_dict(order, request):
# --- create dict of this absence category PR2019-06-25
# if scheme or team of this order does not exist: create it
    logger.debug(" --- create_absencecat_dict ---")
    logger.debug("order: ", order)
    item_dict = {}
    if order:
        abscat_code = getattr(order, 'code', '-')
        customer = order.customer
        customer_code =  getattr(customer, 'code', '-')
        logger.debug("abscat_code: ", abscat_code)

        item_dict['id'] = {
            'pk': order.pk,
            'ppk': order.customer.pk,
            'isabsence': order.isabsence,
            'table': 'order'
        }
        item_dict['pk'] = order.pk
        item_dict['ppk'] = order.customer.pk
        item_dict['code'] = {'value': abscat_code}
        item_dict['identifier'] = {'value': getattr(order, 'identifier')}
        item_dict['sequence'] = {'value': getattr(order, 'sequence')}

        item_dict['nopay'] = {'value': getattr(order, 'nopay', False)}
        item_dict['nohoursonsaturday'] = {'value': getattr(order, 'nohoursonsaturday', False)}
        item_dict['nohoursonsunday'] = {'value': getattr(order, 'nohoursonsunday', False)}
        item_dict['nohoursonpublicholiday'] = {'value': getattr(order, 'nohoursonpublicholiday', False)}

        item_dict['inactive'] = {'value': getattr(order, 'inactive', False)}

        item_dict['customer'] = {
            'pk': customer.pk,
            'ppk': customer.company_id,
            'code': customer_code
        }

    return item_dict


# === Create new 'absence' customer and orders. Every absence teammember has its own scheme and team (and shift)
def get_or_create_absence_customer(request):
    #logger.debug(" === get_or_create_absence_customer ===")

# 1. get locale text of absene categories
    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
    if user_lang in c.ABSENCE:
        absence_locale = c.ABSENCE[user_lang]
    else:
        absence_locale = c.ABSENCE[c.LANG_DEFAULT]
        # absence_locale = ('Afwezig', 'Afwezigheid')

# 2. check if 'absence' customer exists for this company - only one 'absence' customer allowed
    # don't use get_or_none, it wil return None when multiple absence customers exist, therefore adding another record
    abs_cust = m.Customer.objects.filter(
        company=request.user.company,
        isabsence=True
    ).first()
    if abs_cust is None:

# 3. create 'absence' customer if not exists
        abs_cust = m.Customer(company=request.user.company,
                            code=absence_locale[0],
                            name=absence_locale[1],
                            isabsence=True)
        abs_cust.save(request=request)

    if abs_cust:

# 4. check if 'absence' customer has categories (orders)
        absence_orders_exist = m.Order.objects.filter(customer=abs_cust).exists()

# 5. if no orders exist: create absence_orders - they contain the absence categories
        if not absence_orders_exist:
            create_absence_orders(abs_cust, user_lang, request)

    return abs_cust


def create_absence_orders(abs_cust, user_lang, request):
# === Create new 'absence' orders PR2019-06-24 PR2019-12-18
    #logger.debug(" === create_absence_orders ===")

    if user_lang in c.ABSENCE_CATEGORY:
        categories_locale = c.ABSENCE_CATEGORY[user_lang]
    else:
        categories_locale = c.ABSENCE_CATEGORY[c.LANG_DEFAULT]

    # ABSENCE_CATEGORY: ('0', 'Unknown', 'Unknown', '1'),, etc
    # fields: (sequence, code, name (niu: default category)

    if abs_cust:
        for category in categories_locale:
            sequence = category[0]
            code = category[1]
            name = category[2]
            # default category = category[3]

# 1. create 'absence' order - contains absence categories
            order = m.Order(customer=abs_cust,
                        code=code,
                        name=name,
                        sequence=sequence,
                        isabsence=True)
            order.save(request=request)


# === Create new 'template' customer and order
def get_or_create_template_order(request):
    #logger.debug(" --- get_or_create_template_order ---")

    order = None
    # get user_lang
    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT

# get locale text
    lang = user_lang if user_lang in c.TEMPLATE_TEXT else c.LANG_DEFAULT
    template_locale = c.TEMPLATE_TEXT[lang]

# 1. check if 'template' customer exists for this company - only one 'template' customer allowed
    # don't use get_or_none, it wil return None when multiple customers exist, and create even more instances
    customer = m.Customer.objects.filter(
        company=request.user.company,
        istemplate=True).first()
    if customer is None:
        if template_locale:

# 2. create 'template' customer if not exists
            customer = m.Customer(
                company=request.user.company,
                code=template_locale,
                name=template_locale,
                istemplate=True
            )
            customer.save(request=request)

# 3. check if 'template' customer has order - only one 'template' order allowed
    if customer:
         # don't use get_or_none, it wil return None when multiple customers exist
        order = m.Order.objects.filter(
            customer=customer
        ).first()
        if order is None:
# 4. create 'template' order if not exists
            order = m.Order(
                customer=customer,
                code=template_locale,
                name=template_locale,
                istemplate=True
            )
            order.save(request=request)
    return order


def create_order_pricerate_list(company, user_lang):
    #logger.debug(' --- create_order_pricerate_list --- ')

    # --- create list of all active customers of this company PR2019-09-03, no absence, no template

    pricerate_list = []

    # --- create list of active orders of this customer
    orders = m.Order.objects.filter(
        customer__company=company,
        isabsence=False,
        istemplate=False,
        inactive=False
    )
    for order in orders:
        customer = order.customer

        # table filters on customer_pk
        item_dict = {
            'pk': order.pk,
            'id': {'pk': order.pk, 'ppk': customer.pk, 'table': 'order'},
            'customer': {'pk': customer.pk, 'code': customer.code}
        }

        field = 'code'
        code = getattr(order, field, '-')
        item_dict[field] = {'value': code}

        field = 'cat'
        value = getattr(order, field, 0)
        if value:
            item_dict[field] = {'value': value}

        is_override, is_billable = f.get_billable_order(order)
        item_dict['billable'] = {'override': is_override, 'billable': is_billable}

        field = 'priceratejson'
        field_dict = {}
        f.get_fielddict_pricerate(
            table='order',
            instance=order,
            field_dict=field_dict,
            user_lang=user_lang)
        if field_dict:
            item_dict[field] = field_dict

        pricerate_list.append(item_dict)

# --- create list of schemes of this order
        schemes = m.Scheme.objects.filter(
            order=order,
            cat__lt=c.SHIFT_CAT_0512_ABSENCE  # no absence, template or rest shifts
        )
        for scheme in schemes:
            # table filters on customer_pk
            item_dict = {'id': {'pk': scheme.pk, 'ppk': scheme.order.pk, 'table': 'scheme'},
                         'pk': scheme.pk,
                         'customer': {'pk': customer.pk, 'code': customer.code}
            }

            field = 'code'
            code = '    ' + getattr(scheme, field, '-')
            item_dict[field] = {'value': code}

            field = 'cat'
            value = getattr(scheme, field, 0)
            if value:
                item_dict[field] = {'value': value}

            is_override, is_billable = f.get_billable_scheme(scheme)
            item_dict['billable'] = {'override': is_override, 'billable': is_billable}

            field = 'priceratejson'
            field_dict = {}
            f.get_fielddict_pricerate(
                table='scheme',
                instance=scheme,
                field_dict=field_dict,
                user_lang=user_lang)
            if field_dict:
                item_dict[field] = field_dict

            pricerate_list.append(item_dict)

# --- create list of shifts of this scheme
            shifts = m.Shift.objects.filter(
                scheme=scheme,
                cat__lt=c.SHIFT_CAT_0512_ABSENCE # no absence, template or rest shifts
            )
            for shift in shifts:
                # table filters on customer_pk
                item_dict = {'id': {'pk': shift.pk, 'ppk': shift.scheme.pk, 'table': 'shift'},
                             'pk': shift.pk,
                             'customer': {'pk': customer.pk, 'code': customer.code}
                }

                field = 'code'
                code = '        ' + getattr(shift, field, '-')
                item_dict[field] = {'value': code}

                field = 'cat'
                value = getattr(order, field, 0)
                if value:
                    item_dict[field] = {'value': value}

                is_override, is_billable = f.get_billable_shift(shift)
                item_dict['billable'] = {'override': is_override, 'billable': is_billable}

                field = 'priceratejson'
                field_dict = {}
                f.get_fielddict_pricerate(
                    table='shift',
                    instance=shift,
                    field_dict=field_dict,
                    user_lang=user_lang)
                if field_dict:
                    item_dict[field] = field_dict

                pricerate_list.append(item_dict)

    return pricerate_list


def create_billing_agg_list(period_dict, request):
    logger.debug(' ============= create_billing_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of 1 paydateitem, grouped by employee PR2020-06-24

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    logger.debug('period_dict:  ' + str(period_dict))

    period_datefirst = period_dict.get('period_datefirst')
    period_datelast = period_dict.get('period_datelast')
    order_pk = period_dict.get('order_pk')
    order_pk = order_pk if order_pk else None  # this changes '0' into 'None'
    customer_pk = None
    if order_pk is None:
        customer_pk = period_dict.get('customer_pk')
        customer_pk = customer_pk if customer_pk else None

    logger.debug('period_datefirst:  ' + str(period_datefirst))
    logger.debug('period_datelast:  ' + str(period_datelast))
    logger.debug('order_pk:  ' + str(order_pk))

    sql_billing = """
        SELECT o.id AS o_id, 
        COALESCE(c.code,'-') AS c_code,
        COALESCE(o.code,'-') AS o_code,
        
        SUM(eh.timeduration) AS eh_timedur, 
        SUM(eh.plannedduration) AS eh_plandur,
        SUM(eh.billingduration) AS eh_bildur,
        SUM(eh.amount) + SUM(eh.addition) AS eh_total_amount,
        SUM(oh.isbillable::int) AS is_billable,
        SUM((NOT oh.isbillable)::int) AS not_billable,
        SUM(oh.nobill::int) AS is_nobill,
        SUM((NOT oh.nobill)::int) AS not_nobill

        FROM companies_emplhour AS eh
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT o.isabsence AND NOT oh.isrestshift
        AND ( c.id = %(cid)s OR %(cid)s IS NULL )
        AND ( o.id = %(oid)s OR %(oid)s IS NULL )
        AND ( (eh.rosterdate >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
        AND ( (eh.rosterdate <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )
        GROUP BY o.id, c.code, o.code
        ORDER BY LOWER(c.code), LOWER(o.code)
        """
    newcursor = connection.cursor()
    newcursor.execute(sql_billing, {
        'compid': request.user.company_id,
        'cid': customer_pk,
        'oid': order_pk,
        'df': period_datefirst,
        'dl': period_datelast
    })
    billing_agg_list = f.dictfetchall(newcursor)
    """
    logger.debug('---------------------')
    for row in billing_agg_list:
        logger.debug(str(row))
    logger.debug('.......................')
    """
    return billing_agg_list
# - end of billing_agg_list


def create_billing_rosterdate_list(period_dict, request):
    logger.debug(' ============= create_billing_rosterdate_list ============= ')

    period_datefirst = period_dict.get('period_datefirst')
    period_datelast = period_dict.get('period_datelast')
    order_pk = period_dict.get('order_pk')
    order_pk = order_pk if order_pk else None  # this changes '0' into 'None'
    customer_pk = None
    if order_pk is None:
        customer_pk = period_dict.get('customer_pk')
        customer_pk = customer_pk if customer_pk else None

    logger.debug('period_datefirst:  ' + str(period_datefirst))
    logger.debug('period_datelast:  ' + str(period_datelast))
    logger.debug('order_pk:  ' + str(order_pk))

    sql_billing = """
        SELECT o.id AS o_id, 
        COALESCE(c.code,'-') AS c_code,
        COALESCE(o.code,'-') AS o_code,
        oh.rosterdate AS oh_rosterdate,
        
        SUM(eh.timeduration) AS eh_timedur, 
        SUM(eh.plannedduration) AS eh_plandur,
        SUM(eh.billingduration) AS eh_bildur,
        SUM(eh.amount) + SUM(eh.addition) AS eh_total_amount,
        SUM(oh.isbillable::int) AS is_billable,
        SUM((NOT oh.isbillable)::int) AS not_billable,
        SUM(oh.nobill::int) AS is_nobill,
        SUM((NOT oh.nobill)::int) AS not_nobill

        FROM companies_emplhour AS eh
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT o.isabsence AND NOT oh.isrestshift
        AND ( c.id = %(cid)s OR %(cid)s IS NULL )
        AND ( o.id = %(oid)s OR %(oid)s IS NULL )
        AND ( (eh.rosterdate >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
        AND ( (eh.rosterdate <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )

        GROUP BY o.id, c.code, o.code, oh.rosterdate
        ORDER BY LOWER(c.code), LOWER(o.code), oh.rosterdate
        """
    #             AND NOT o.isabsence AND NOT oh.isrestshift
    #             AND ( o.id = %(oid)s OR %(oid)s IS NULL )
    #             AND ( (eh.rosterdate >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
    #             AND ( (eh.rosterdate <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )

    newcursor = connection.cursor()
    newcursor.execute(sql_billing, {
        'compid': request.user.company_id,
        'cid': customer_pk,
        'oid': order_pk,
        'df': period_datefirst,
        'dl': period_datelast
    })
    billing_rosterdate_list = f.dictfetchall(newcursor)
    """
    logger.debug('---------------------')
    for row in billing_rosterdate_list:
        logger.debug(str(row))
    logger.debug('.......................')
    """
    return billing_rosterdate_list
# - end of billing_agg_list


def create_billing_detail_list(period_dict, request):
    logger.debug(' ============= create_billing_detail_list ============= ')

    period_datefirst = period_dict.get('period_datefirst')
    period_datelast = period_dict.get('period_datelast')
    order_pk = period_dict.get('order_pk')
    order_pk = order_pk if order_pk else None  # this changes '0' into 'None'
    customer_pk = None
    if order_pk is None:
        customer_pk = period_dict.get('customer_pk')
        customer_pk = customer_pk if customer_pk else None

    logger.debug('period_datefirst:  ' + str(period_datefirst))
    logger.debug('period_datelast:  ' + str(period_datelast))
    logger.debug('order_pk:  ' + str(order_pk))

    sql_billing = """
        SELECT oh.id AS oh_id, o.id AS o_id, 
        COALESCE(STRING_AGG(DISTINCT e.code, '; '),'---') AS e_code,
        oh.rosterdate AS oh_rosterdate,
        oh.shift AS oh_shift,
        SUM(eh.timeduration) AS eh_timedur, 
        SUM(eh.plannedduration) AS eh_plandur,
        SUM(eh.billingduration) AS eh_bildur,
        SUM(eh.amount) + SUM(eh.addition) AS eh_total_amount,
        SUM(oh.isbillable::int) AS is_billable,
        SUM((NOT oh.isbillable)::int) AS not_billable,
        SUM(oh.nobill::int) AS is_nobill,
        SUM((NOT oh.nobill)::int) AS not_nobill

        FROM companies_emplhour AS eh
        LEFT JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT o.isabsence AND NOT oh.isrestshift
        AND ( c.id = %(cid)s OR %(cid)s IS NULL )
        AND ( o.id = %(oid)s OR %(oid)s IS NULL )
        AND ( (eh.rosterdate >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
        AND ( (eh.rosterdate <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )

        GROUP BY oh.id, o.id, oh.rosterdate, oh.shift
        ORDER BY oh.rosterdate, LOWER(oh.shift)
        """
    #             AND NOT o.isabsence AND NOT oh.isrestshift
    #             AND ( o.id = %(oid)s OR %(oid)s IS NULL )
    #             AND ( (eh.rosterdate >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
    #             AND ( (eh.rosterdate <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )

    newcursor = connection.cursor()
    newcursor.execute(sql_billing, {
        'compid': request.user.company_id,
        'cid': customer_pk,
        'oid': order_pk,
        'df': period_datefirst,
        'dl': period_datelast
    })
    billing_detail_list = f.dictfetchall(newcursor)
    """
    logger.debug('---------------------')
    for row in billing_detail_list:
        logger.debug(str(row))
    logger.debug('.......................')
    """
    return billing_detail_list
# - end of create_billing_detail_list

