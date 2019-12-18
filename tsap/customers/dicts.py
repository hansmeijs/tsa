from django.db.models import Q
from django.db.models.functions import Lower

from tsap import constants as c
from tsap import functions as f
from companies import models as m
import json
import logging
logger = logging.getLogger(__name__)

def create_company_list(company):
    # logger.debug(' --- create_customer_list --- ')
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

def create_customer_list(company, is_absence, is_template=None, inactive=None):
    # logger.debug(' --- create_customer_list --- ')
    # logger.debug('is_absence: ' + str(is_absence) + ' is_template: ' + str(is_template) + ' inactive: ' + str(inactive))

# --- create list of customers of this company PR2019-09-03
    # .order_by(Lower('code')) is in model
    crit = (Q(company=company) & Q(isabsence=is_absence))
    if is_template is not None:
        crit.add(Q(istemplate=is_template), crit.connector)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    customers = m.Customer.objects.filter(crit)
    # logger.debug(str(customers.query))

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
        # FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier', 'email', 'telephone',
        # 'interval', 'inactive')
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

            else:
                value = getattr(customer, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


def create_order_list(company, user_lang, is_absence, is_template=None, inactive=None):
    # logger.debug(' --- create_order_list --- ')
    # Order of absence and template are made by system and cannot be updated
    # TODO: make it possible to rename them as company setting

# --- create list of orders of this company PR2019-06-16
    crit = (Q(customer__company=company) & Q(isabsence=is_absence))
    if is_template is not None:
        crit.add(Q(istemplate=is_template), crit.connector)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
        crit.add(Q(customer__inactive=inactive), crit.connector)

    if is_absence:
        orders = m.Order.objects.filter(crit).order_by('sequence')
    else:
        orders = m.Order.objects.filter(crit).order_by('customer__code', 'code')
    # logger.debug(orders.query)

    order_list = []
    for order in orders:
        item_dict = {}
        create_order_dict(order, item_dict, user_lang)

        if item_dict:
            order_list.append(item_dict)

    return order_list


def create_order_dict(order, item_dict, user_lang):
    # --- create dict of this order PR2019-09-28
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table

    if order:
        # FFIELDS_ORDER = ('id', 'customer', 'cat', 'billable', 'code', 'name', 'datefirst', 'datelast',
        #                 'contactname', 'address', 'zipcode', 'city', 'country',
        #                 'sequence', 'identifier', 'billable', 'priceratejson', 'invoicedates', 'taxcode', 'locked', 'inactive')

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
                        field_dict['value'] = customer.code

            elif field in ['cat']:
                cat_sum = getattr(order, field, 0)
                if cat_sum:
                    field_dict['value'] = cat_sum

            elif field in ['billable']:
                is_override, is_billable = f.get_billable_order(order)
                field_dict['override'] = is_override
                field_dict['billable'] = is_billable

                field_dict['value'] = getattr(order, field, 0)

            elif field in ['datefirst', 'datelast']:
                # also add date when empty, to add min max date
                if datefirst or datelast:
                    if field == 'datefirst':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_value=datefirst,
                            maxdate=datelast)
                    elif field == 'datelast':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_value=datelast,
                            mindate=datefirst)

            elif field in ['priceratejson']:
                # TODO add cur_rosterdate, cur_wagefactor
                pricerate = None
                pricerate_json = getattr(order, 'priceratejson')
                # logger.debug('>>  pricerate_json: ' + str(pricerate_json))
                if pricerate_json:
                    pricerate_dict = json.loads(pricerate_json)
                    # logger.debug('pricerate_dict: ' + str(pricerate_dict))
                    pricerate = f.get_pricerate_from_dict(pricerate_dict, None, None)
                    # logger.debug('>>> pricerate: ' + str(pricerate))
                    if pricerate is not None:
                        field_dict['value'] = pricerate
                field_dict['display'] = f.get_rate_display(pricerate, user_lang)
                # logger.debug('field_dict: ' + str(field_dict))

            else:
                value = getattr(order, field)
                if value:
                    field_dict['value'] = value

            if field_dict:
                item_dict[field] = field_dict

    f.remove_empty_attr_from_dict(item_dict)


def create_absencecategory_list(request):
    # --- create list of all active absence categories of this company PR2019-06-25
    # each absence category contains abscat_customer, abscat_order, abscat_scheme and abscat_team
    order_list = []

    # logger.debug(" --- create_absencecategory_list ---")
    # create an absence customer, order scheme and teams if they do not exist yet PR2019-07-27
    get_or_create_absence_customer(request)
    # logger.debug(" --- get_or_create_absence_customer ---")

    orders = m.Order.objects.filter(customer__company=request.user.company, isabsence=True).order_by('sequence')

    for order in orders:
        # logger.debug(" --- for order in orders ---")
        dict = create_absencecat_dict(order, request)
        order_list.append(dict)

    return order_list


def create_absencecat_dict(order, request):
# --- create dict of this absence category PR2019-06-25
# if scheme or team of this order does not exist: create it
    # logger.debug(" --- create_absencecat_dict ---")
    # logger.debug("order: ", order)
    item_dict = {}
    if order:
        abscat_code = getattr(order, 'code', '-')
        # logger.debug("abscat_code: ", abscat_code)

        item_dict['order'] = {
            'pk': order.pk,
            'ppk': order.customer.pk,
            'cat': order.cat,
            'isabsence': order.isabsence,
            'code': order.code,
            'name': order.name
        }


    # get team of this abscat order, needed for absence in employee page

    # - create 'absence' scheme if not exists
        if not m.Scheme.objects.filter(order=order).exists():
            scheme = create_absence_scheme(order, abscat_code, request)
        else:
            scheme = m.Scheme.objects.filter(order=order).first()
        # logger.debug("scheme: " + str(scheme))
        if scheme:
            item_dict['scheme'] = {
                'pk': scheme.pk,
                'ppk': scheme.order.pk,
                'cat': scheme.cat,
                'isabsence': scheme.isabsence,
                'code': scheme.code
            }
    # - create 'absence' team if not exists
            team = None
            if not m.Team.objects.filter(scheme=scheme).exists():
                create_absence_team(scheme, abscat_code, request)
            else:
                team = m.Team.objects.filter(scheme=scheme).first()
            if team:
                item_dict['team'] = {
                    'pk': team.pk,
                    'ppk': team.scheme.pk,
                    'isabsence': team.isabsence,
                    'code': team.code
                }
                item_dict['pk'] = team.pk
                item_dict['ppk'] = scheme.pk
                item_dict['id'] = {'pk': team.pk, 'ppk': scheme.pk, 'table': 'team'}
                item_dict['isabsence'] = {'value': order.isabsence}
                item_dict['code'] = {'value': abscat_code}

    return item_dict


# === Create new 'absence' customer, order and scheme and team
def get_or_create_absence_customer(request):
    # logger.debug(" === get_or_create_absence_customer ===")

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

# 5. if no orders exist: create 'absence' orders - contains absence categories
        if not absence_orders_exist:
            create_absence_orders(abs_cust, user_lang, request)

    return abs_cust


def create_absence_orders(abs_cust, user_lang, request):
# === Create new 'absence' customer, order and scheme and team PR2019-06-24
    # logger.debug(" === create_absence_orders ===")

    if user_lang in c.ABSENCE_CATEGORY:
        categories_locale = c.ABSENCE_CATEGORY[user_lang]
    else:
        categories_locale = c.ABSENCE_CATEGORY[c.LANG_DEFAULT]

    # ABSENCE_CATEGORY: ('0', 'Unknown', 'Unknown', '1'),, etc
    # fields: (sequence, code, name, pricerate). pricerate=1 means default category TODO replcement for pricerate as default cat

    if abs_cust:
        for category in categories_locale:
            sequence = category[0]
            code = category[1]
            name = category[2]
            pricerate = category[3]

# 1. create 'absence' order - contains absence categories
            order = m.Order(customer=abs_cust,
                        code=code,
                        name=name,
                        sequence=sequence,
                        isabsence=True)
            order.save(request=request)
    # this def is only called when order does not exist, therefore also scheme and team don't exist
            if order:
# 2. create 'absence' scheme
                scheme = create_absence_scheme(order, code, request)
# 3. create 'absence' team
                if scheme:
                    create_absence_team(scheme, code, request)


def create_absence_scheme(order, code, request):
    scheme = m.Scheme(
        order=order,
        code=code,
        isabsence=True)
    scheme.save(request=request)
    # logger.debug(" scheme.save: " + str(scheme))
    return scheme


def create_absence_team(scheme, code, request):
    team = m.Team(
        scheme=scheme,
        code=code,
        isabsence=True)
    team.save(request=request)
    # logger.debug(" team.save: " + str(team))
    return team


# === Create new 'template' customer and order
def get_or_create_template_order(request):
    # logger.debug(" --- get_or_create_template_order ---")

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
    # logger.debug('customer: ' + str(customer))
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
            # logger.debug("order.save: " + str(order.pk) + ' ' + str(order.code))
    # logger.debug('order: ' + str(order))
    return order


def create_order_pricerate_list(company, user_lang):
    # logger.debug(' --- create_order_pricerate_list --- ')

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
