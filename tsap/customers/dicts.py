from django.db.models import Q
from django.db.models.functions import Lower

from tsap import constants as c
from tsap import functions as f
from companies import models as m

import logging
logger = logging.getLogger(__name__)


def create_customer_list(company, inactive=None, cat=None, cat_lt=None):
    # logger.debug(' --- create_customer_list --- ')

# --- create list of customers of this company PR2019-09-03
    # .order_by(Lower('code')) is in model
    crit = Q(company=company)
    if cat is not None:
        crit.add(Q(cat=cat), crit.connector)
    elif cat_lt is not None:
        crit.add(Q(cat__lt=cat_lt), crit.connector)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    # logger.debug('cat: ' + str(cat) + ' cat_lt: ' + str(cat_lt) + ' inactive: ' + str(inactive))
    customers = m.Customer.objects\
        .filter(crit)\
        .values('id', 'company_id', 'cat', 'code', 'name', 'identifier', 'email', 'telephone', 'interval', 'inactive')\
        .iterator()
    # logger.debug(customers.query)

    # FIELDS_CUSTOMER = ('id', 'company', 'cat', 'code', 'name', 'identifier', 'email', 'telephone', 'interval', 'inactive')
    field_list = c.FIELDS_CUSTOMER
    customer_list = []
    for row_dict in customers:
        item_dict = {}

        pk_int = row_dict.get('id', 0)
        ppk_int = row_dict.get('company_id', 0)
        item_dict['pk'] = pk_int
        item_dict['ppk'] = ppk_int
        item_dict['table'] = 'customer'

        for field in field_list:
            field_dict = {}
            if field in row_dict:
                if field == 'id':
                    field_dict = {'pk': pk_int}
                    field_dict['ppk'] = ppk_int
                    item_dict[field] = field_dict

                elif field in ('cat', 'interval'):
                    field_dict['value'] = row_dict.get(field, 0)

                elif field == 'company':
                    pass

                else:  # ('code', 'name', 'identifier', 'email', 'telephone', 'inactive')
                    value = row_dict.get(field)
                    if value:
                        item_dict[field] = {'value': value}

        # logger.debug('item_dict: ' + str(item_dict))

        customer_list.append(item_dict)
    return customer_list

def create_customer_dict(instance, item_dict):
    # --- create dict of this customer PR2019-07-28

    if instance:
        for field in ['pk', 'id', 'code', 'name', 'identifier', 'inactive']:

            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict ={}

            if field == 'pk':
                field_dict = instance.pk

            elif field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.company.pk
                field_dict['table'] = 'order'

            elif field in ['code', 'name', 'identifier', 'inactive']:
                value = getattr(instance, field, None)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

# 7. remove empty attributes from item_update
    f.remove_empty_attr_from_dict(item_dict)


def create_order_list(company, inactive=None, cat=None, cat_lt=None, rangemin=None, rangemax=None):
# --- create list of all active orders of this company PR2019-06-16
    # logger.debug(' --- create_order_list --- ')
    crit = Q(customer__company=company)
    if cat is not None:
        crit.add(Q(customer__cat=cat), crit.connector)
    elif cat_lt is not None:
        crit.add(Q(customer__cat__lt=cat_lt), crit.connector)

    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    if rangemax is not None:
        crit.add(Q(datefirst__lte=rangemax) | Q(datefirst__isnull=True), crit.connector)
    if rangemin is not None:
        crit.add(Q(datelast__gte=rangemin) | Q(datelast__isnull=True), crit.connector)

    orders = None
    if cat == c.SHIFT_CAT_0512_ABSENCE:
        orders = m.Order.objects.filter(crit).order_by('sequence')
    else:
        orders = m.Order.objects.filter(crit).order_by('customer__code', 'code')  # field 'taxrate' is used to store sequence

    # logger.debug(orders.query)

    order_list = []
    for order in orders:
        item_dict = {}
        create_order_dict(order, item_dict)
        # logger.debug(' item_dict ' + str(item_dict))
        order_list.append(item_dict)
    return order_list

def create_order_dict(order, item_dict):
    # --- create dict of this order PR2019-07-26
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    field_tuple = ('pk', 'id', 'customer', 'code', 'name', 'identifier',
                  'datefirst', 'datelast', 'inactive', 'customer')
    table = 'order'
    if order:
        for field in field_tuple:
# 1. create field_dict if it does not exist
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict ={}
# 2. create field_dict 'pk'
            if field == 'pk':
                field_dict = order.pk
# 3. create field_dict 'id'
            elif field == 'id':
                field_dict['pk'] = order.pk
                field_dict['ppk'] = order.customer.pk
                field_dict['table'] = table
# 4. create field_dict 'customer'
            elif field == 'customer':
                customer = getattr(order, field)
                if customer:
                    field_dict['pk'] = customer.pk
                    if customer.code:
                        field_dict['value'] = customer.code
# 5. create other field_dicts
            elif field in ['code', 'name', 'identifier', 'inactive']:
                value = getattr(order, field, None)
                if value:
                    field_dict['value'] = value

# 6. create  field_dicts 'datefirst', 'datelast'
            # also add date when empty, to add min max date
            elif field in ['datefirst', 'datelast']:
                mindate = getattr(order, 'datefirst')
                maxdate = getattr(order, 'datelast')
                if mindate or maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(dict=field_dict, dte=mindate, maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(dict=field_dict, dte=maxdate, mindate=mindate)
# 7. add field_dict to item_dict
            item_dict[field] = field_dict
# 8. remove empty attributes from item_update
    f.remove_empty_attr_from_dict(item_dict)

# >>>>>>>>>>>>>>>>>>>

def create_absencecategory_list(request):
    # --- create list of all active absence categories of this company PR2019-06-25
    order_list = []

    # create an absence customer, order scheme and teams if they do not exist yet PR2019-07-27
    get_or_create_absence_customer(request)

    crit = (Q(customer__company=request.user.company) &
                Q(cat=c.SHIFT_CAT_0512_ABSENCE))
    orders = m.Order.objects.filter(crit).order_by('sequence')

    for order in orders:
        dict = create_absencecat_dict(order, request)
        order_list.append(dict)

    return order_list


def create_absencecat_dict(instance, request):
# --- create dict of this absece category PR2019-06-25
    # logger.debug(" --- create_absencecat_dict ---")
    dict = {}
    if instance:
        parent_pk = instance.customer.pk

        dict['pk'] = instance.pk
        dict['ppk'] = parent_pk
        dict['table'] = 'order'
        dict['id'] = {'pk': instance.pk, 'ppk': parent_pk, 'table': 'order'}

        code = getattr(instance, 'code', None)
        if code:
            # use model field 'name' in datalist filed 'code'
            dict['code'] = {'value': code}

    # get team of this abscat order, needed for absence in empoloyee page

    # - create 'absence' scheme if not exists
        if not m.Scheme.objects.filter(order=instance).exists():
            scheme = create_absence_scheme(instance, code, request)
        scheme = m.Scheme.objects.filter(order=instance).first()
        # logger.debug("scheme: " + str(scheme))
        if scheme:
    # - create 'absence' team if not exists
            if not m.Team.objects.filter(scheme=scheme).exists():
                create_absence_team(scheme, code, request)
            team = m.Team.objects.filter(scheme=scheme).first()
            # logger.debug("team: " + str(team))
            if team:
                team_dict = {
                    'pk': team.pk,
                    'ppk': team.scheme_id,
                    'code': team.code
                }
                # logger.debug("team_dict: " + str(team_dict))
                dict['team'] = team_dict

    return dict


# === Create new 'absence' customer, order and scheme and team
def get_or_create_absence_customer(request):
    # logger.debug(" === get_or_create_absence_customer ===")

# get locale text of absene categories
    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
    if user_lang in c.ABSENCE:
        absence_locale = c.ABSENCE[user_lang]
    else:
        absence_locale = c.ABSENCE[c.LANG_DEFAULT]
        # absence_locale = ('Afwezig', 'Afwezigheid')

# - check if 'absence' customer exists for this company - only one 'absence' customer allowed
    # don't use get_or_none, it wil return None when multiple absence customers exist, therefore adding another record
    customer = m.Customer.objects.filter(company=request.user.company, cat=c.SHIFT_CAT_0512_ABSENCE).first()
    if customer is None:
# - create 'absence' customer if not exists
        customer = m.Customer(company=request.user.company,
                            code=absence_locale[0],
                            name=absence_locale[1],
                            cat=c.SHIFT_CAT_0512_ABSENCE)
        customer.save(request=request)

    if customer:
# - check if 'absence' customer has categories (orders)
        absence_orders_exist = m.Order.objects.filter(customer=customer).exists()

# - if no orders exist: create 'absence' orders - contains absence categories
        if not absence_orders_exist:
            create_absence_orders(customer, user_lang, request)


def create_absence_orders(customer, user_lang, request):
# === Create new 'absence' customer, order and scheme and team PR2019-06-24
    # logger.debug(" === create_absence_orders ===")

    if user_lang in c.ABSENCE_CATEGORY:
        categories_locale = c.ABSENCE_CATEGORY[user_lang]
    else:
        categories_locale = c.ABSENCE_CATEGORY[c.LANG_DEFAULT]

    # ABSENCE_CATEGORY: ('0', 'Unknown', 'Unknown absence'), etc
    if customer:
        for category in categories_locale:
            # sequencce is stored in field 'taxrate'
            sequence = category[0]
            code = category[1]
            name = category[2]

    # - create 'absence' order - contains absence categories
            order = m.Order(customer=customer,
                          code=code,
                          name=name,
                          sequence=sequence,
                          cat=c.SHIFT_CAT_0512_ABSENCE)
            order.save(request=request)

            if order:
    # - create 'absence' scheme
                scheme = create_absence_scheme(order, code, request)
    # - create 'absence' team
                if scheme:
                    create_absence_team(scheme, code, request)


def create_absence_scheme(order, code, request):
    scheme = m.Scheme(order=order, code=code, cat=c.SHIFT_CAT_0512_ABSENCE)
    scheme.save(request=request)
    # logger.debug(" scheme.save: " + str(scheme))
    return scheme


def create_absence_team(scheme, code, request):
    team = m.Team(scheme=scheme, code=code)
    team.save(request=request)
    # logger.debug(" team.save: " + str(team))
    return team


# === Create new 'template' customer and order
def get_or_create_special_order(category, request):
    # logger.debug(" --- get_or_create_special_order ---")

    order = None

    # get user_lang
    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT

    # get locale text
    template_locale = None
    if category == c.SHIFT_CAT_0256_RESTSHIFT:
        lang = user_lang if user_lang in c.REST_TEXT else c.LANG_DEFAULT
        template_locale = c.REST_TEXT[lang]
    elif category == c.SHIFT_CAT_4096_TEMPLATE:
        lang = user_lang if user_lang in c.TEMPLATE_TEXT else c.LANG_DEFAULT
        template_locale = c.TEMPLATE_TEXT[lang]

    # 1. check if 'template' customer exists for this company - only one 'template' customer allowed
    # don't use get_or_none, it wil return None when multiple customers exist, and create even more instances
    customer = m.Customer.objects.filter(cat=category, company=request.user.company).first()
    if customer is None:
        if template_locale:

            # 2. create 'template' customer if not exists
            customer = m.Customer(company=request.user.company,
                                code=template_locale,
                                name=template_locale,
                                cat=category)
            customer.save(request=request)

# 3. check if 'template' customer has order - only one 'template' order allowed
    # logger.debug('customer: ' + str(customer))
    if customer:
         # don't use get_or_none, it wil return None when multiple customers exist
        order = m.Order.objects.filter(customer=customer).first()
        if order is None:
            # 4. create 'template' order if not exists
            order = m.Order(customer=customer,
                          code=template_locale,
                          name=template_locale,
                          cat=category)
            order.save(request=request)
            # logger.debug("order.save: " + str(order.pk) + ' ' + str(order.code))
    # logger.debug('order: ' + str(order))
    return order

