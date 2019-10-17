from django.db import connection
from django.db.models import Q, Value
from django.db.models.functions import  Coalesce, Lower
from datetime import datetime

from django.utils.translation import ugettext_lazy as _

from tsap import functions as f
from tsap import constants as c
from companies import models as m

import logging
logger = logging.getLogger(__name__)

def create_employee_list(company, user_lang, inactive=None, rangemin=None, rangemax=None):
    # --- create list of all active employees of this company PR2019-06-16
    # logger.debug(' --- create_employee_list   ')
    crit = Q(company=company)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    if rangemax is not None:
        crit.add(Q(datefirst__lte=rangemax) | Q(datefirst__isnull=True), crit.connector)
    if rangemin is not None:
        crit.add(Q(datelast__gte=rangemin) | Q(datelast__isnull=True), crit.connector)

    employees = m.Employee.objects\
        .select_related('wagecode')\
        .filter(crit)\
        .order_by(Lower('code'))

    employee_list = []
    for employee in employees:
        item_dict = {}
        create_employee_dict(employee, item_dict, user_lang)
        if item_dict:
            employee_list.append(item_dict)
    return employee_list

def create_employee_dict(instance, item_dict, user_lang):
    # --- create dict of this employee PR2019-07-26

    # FIELDS_EMPLOYEE = ('id', 'code', 'datefirst', 'datelast',
    #                    'namelast', 'namefirst', 'email', 'telephone', 'identifier',
    #                    'address', 'zipcode', 'city', 'country',
    #                    'payrollcode', 'wagerate', 'wagecode',
    #                    'workhours', 'workdays', 'leavedays', 'priceratejson', 'inactive')

    if instance:

# ---  get min max date
        datefirst = getattr(instance, 'datefirst')
        datelast = getattr(instance, 'datelast')

        workhours = getattr(instance, 'workhours', 0)
        workdays = getattr(instance, 'workdays', 0)
        workhoursperday = 0
        if workhours and workdays:
            workhoursperday = int(workhours / workdays * 1440)

        for field in c.FIELDS_EMPLOYEE:
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.company.pk
                field_dict['table'] = 'employee'
                item_dict['pk'] = instance.pk

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

            elif field == 'workhours':
                if workhours:
                    field_dict['value'] = workhours
            elif field == 'workdays':
                if workdays:
                    field_dict['value'] = workdays

            elif field in ['priceratejson']:
                pricerate = getattr(instance, field)
                if pricerate is not None:
                    field_dict['value'] = pricerate
                field_dict['display'] = f.get_rate_display(pricerate, user_lang)

            else:
                value = getattr(instance, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

        if workhours and workdays:
            fld = 'workhoursperday'
            if fld not in item_dict:
                item_dict[fld] = {}
            item_dict[fld]['value'] = workhoursperday

# 7. remove empty attributes from item_update
    f.remove_empty_attr_from_dict(item_dict)
# >>>   end create_employee_dict


def create_teammember_list(table_dict, company, user_lang):
    # --- create list of all teammembers of this order PR2019-08-29
    #logger.debug(' ----- create_teammember_list  -----  ')
    #logger.debug('table_dict' + str(table_dict) )
    # teammember: {order_pk: null datefirst: null datelast: null}

    cat = table_dict.get('cat')
    datefirst = table_dict.get('datefirst')
    datelast = table_dict.get('datelast')
    order = table_dict.get('order')

    crit = Q(team__scheme__order__customer__company=company)
    # if cat:
        # crit.add(Q(team__scheme__order__cat=cat), crit.connector)
    # if order:
        # crit.add(Q(order=order), crit.connector)
    # if datelast:
        # crit.add(Q(datefirst__lte=datelast) | Q(datefirst__isnull=True), crit.connector)
    # if datefirst:
        # crit.add(Q(datelast__gte=datefirst) | Q(datelast__isnull=True), crit.connector)
    # iterator: from https://medium.com/@hansonkd/performance-problems-in-the-django-orm-1f62b3d04785

    #         teammembers = m.Teammember.objects\
    #             .select_related('employee')\
    #             .annotate(datelast_nonull=Coalesce('datelast', Value(datetime(2500, 1, 1))))\
    #             .filter(team_id=team_id, employee__isnull=False)\
    #             .values('id', 'employee__code', 'datelast_nonull')\
    #             .order_by('-datelast_nonull')
    #         logger.debug('teammembers SQL: ' + str(teammembers.query))


    teammembers = m.Teammember.objects\
        .select_related('employee')\
        .select_related('team')\
        .select_related('team__scheme')\
        .select_related('team__scheme__order')\
        .select_related('team__scheme__order__customer') \
        .annotate(datelast_nonull=Coalesce('datelast', Value(datetime(2500, 1, 1)))) \
        .filter(crit).order_by('-datelast_nonull')

    # iterator: from https://medium.com/@hansonkd/performance-problems-in-the-django-orm-1f62b3d04785
    # logger.debug(teammembers.query)

    teammember_list = []
    for teammember in teammembers:

        item_dict = {}
        create_teammember_dict(teammember, item_dict, user_lang)

        if item_dict:
            teammember_list.append(item_dict)

    return teammember_list

def create_teammember_dict(instance, item_dict, user_lang):
    # --- create dict of this teammember PR2019-07-26
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('item_dict' + str(item_dict))

    # c.FIELDS_TEAMMEMBER = ('id', 'team', 'cat', 'employee', 'datefirst', 'datelast',
    #                       'workhoursperday', 'wagerate', 'wagefactor', 'scheme', 'order', 'customer')

    if instance:

# ---  get min max date
        teammember_datefirst = getattr(instance, 'datefirst')
        scheme_datefirst = None
        scheme = instance.team.scheme
        if scheme:
            scheme_datefirst = getattr(scheme, 'datefirst')
            if scheme_datefirst is None:
                if scheme.order:
                    scheme_datefirst = getattr(scheme.order, 'datefirst')
        employee_datefirst = None
        if instance.employee:
            employee_datefirst = getattr(instance.employee, 'datefirst')
        mindate_scheme_employee = f.date_latest_of_two(scheme_datefirst, employee_datefirst)
        mindate = f.date_latest_of_two(mindate_scheme_employee, teammember_datefirst)

        teammember_datelast = getattr(instance, 'datelast')
        scheme_datelast = None
        if scheme:
            scheme_datelast = getattr(scheme, 'datelast')
            if scheme_datelast is None:
                if scheme.order:
                    scheme_datelast = getattr(scheme.order, 'datelast')
        employee_datelast = None
        if instance.employee:
            employee_datelast = getattr(instance.employee, 'datelast')
        maxdate_scheme_employee = f.date_earliest_of_two(scheme_datelast, employee_datelast)
        maxdate = f.date_earliest_of_two(maxdate_scheme_employee, teammember_datelast)

        for field in c.FIELDS_TEAMMEMBER:

# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.team.pk
                field_dict['table'] = 'teammember'
                item_dict['pk'] = instance.pk

            elif field in ['cat']:
                cat_sum = getattr(instance, field, 0)
                field_dict['value'] = cat_sum

            # team is parent of teammember
            elif field == 'team':
                if instance.team:
                    team = instance.team
                    field_dict['pk'] = team.pk
                    field_dict['ppk'] = team.scheme.pk
                    if team.code:
                        field_dict['code'] = team.code
                    if team.cat:
                        field_dict['cat'] = team.cat

                    order = team.scheme.order
                    if order:
                        order_dict = {'pk': order.pk}
                        if order.code:
                            order_dict['code'] = order.code
                        item_dict['order'] = order_dict
                        if order.cat:
                            order_dict['cat'] = order.cat
                        item_dict['order'] = order_dict

            elif field == 'employee':
                employee = instance.employee
                if employee:
                    field_dict['pk'] = employee.pk
                    field_dict['ppk'] = employee.company_id
                    if employee.code:
                        field_dict['code'] = employee.code
                    if employee.workhours:
                        field_dict['workhours'] = employee.workhours

            elif field in ['datefirst', 'datelast']:
                # also add date when empty, to add min max date
                value = getattr(instance, field)
                if value or mindate or maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_value=value,
                            maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_value=value,
                            mindate=mindate)

            elif field in ['priceratejson']:
                pricerate = getattr(instance, field)
                if pricerate is not None:
                    field_dict['value'] = pricerate
                field_dict['display'] = f.get_rate_display(pricerate, user_lang)

            elif field == 'workhoursperday':
                workhoursperday = getattr(instance, field, 0)
                if workhoursperday == 0:
                    employee= instance.employee
                    if employee:
                        workhours = getattr(employee, 'workhours', c.WORKHOURS_DEFAULT)
                        workdays = getattr(employee, 'workdays', c.WORKHOURS_DEFAULT)
                        if workhours and workdays:
                            workhoursperday = workhours / workdays * 1440
                field_dict['value'] = workhoursperday

            else:
                value = getattr(instance, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

# 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(item_dict)
# >>>>>>>>>>>>>>>>>>>


def create_employee_pricerate_list(company, user_lang):
    logger.debug(' --- create_employee_pricerate_list --- ')

    pricerate_list = []

# 1 create list of employees with teammembers, LEFT JOIN, includes employees wiyhout teammember
    #  LOWER(e.code) must be in SELECT
    newcursor = connection.cursor()
    newcursor.execute("""WITH tm_sub AS (SELECT tm.id AS tm_id, tm.employee_id AS e_id, tm.team_id AS team_id, 
            c.code AS c_code, o.code AS o_code, s.code AS s_code, 
            tm.pricerate AS tm_pricerate, tm.override AS tm_override,  
            LOWER(c.code) AS c_lower, LOWER(o.code) AS o_lower, LOWER(s.code) AS s_lower 
            FROM companies_teammember AS tm 
            INNER JOIN companies_team AS t ON (tm.team_id = t.id)
            INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
            INNER JOIN companies_order AS o ON (s.order_id = o.id) 
            INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
            WHERE (c.company_id = %(cid)s) AND (o.cat < %(cat)s) 
            ORDER BY c_lower, o_lower, s_lower ASC )  
        SELECT e.id, e.company_id, e.code AS e_code, e.pricerate, tm_sub.tm_id, tm_sub.team_id, tm_sub.tm_pricerate, tm_sub.tm_override, 
        tm_sub.c_code, tm_sub.o_code, tm_sub.s_code,LOWER(e.code) AS e_lower  
        FROM companies_employee AS e 
        LEFT JOIN tm_sub ON (e.id = tm_sub.e_id)
        WHERE (e.company_id = %(cid)s) 
        ORDER BY e_lower ASC""", {
              'cid': company.pk,
              'cat': c.SHIFT_CAT_0512_ABSENCE})
    teammember_rows = newcursor.fetchall()
    # logger.debug('++++++++++ teammember_rows >' + str(teammember_rows))

    # (395, 1456, 'Abienso, Curvin', 'MCB', 'Punda', 'dag', None, None, False, 'abienso, curvin', 'mcb', 'punda', 'dag')

    if teammember_rows:
        previous_employee_pk = 0
        for item in teammember_rows:
            item_dict = {}
            # e.id, e.company_id, e.code AS e_code, e.pricerate, tm_sub.tm_id, tm_sub.c_code, tm_sub.o_code, tm_sub.s_code,

            employee_pk = item[0]
            employee_ppk = item[1]
            employee_code = item[2]
            employee_pricerate = item[3] if item[3] else 0
            teammember_pk = item[4] if item[4] else 0
            teammember_ppk = item[5] if item[5] else 0
            teammember_pricerate = item[6] if item[6] else 0
            teammember_override = item[7] if item[7] else False
            customer_code = item[8] if item[8] else ''
            order_code = item[9] if item[9] else ''
            scheme_code = item[10] if item[10] else ''
            # create employee row when employee_pk has changed

# create employee row when employee_pk has changed
            if employee_pk != previous_employee_pk:
                previous_employee_pk = employee_pk
                item_dict = {}
                item_dict['employee_pk'] = employee_pk
                item_dict['id'] = {'pk': employee_pk, 'ppk': employee_ppk, 'table': 'employee'}
                item_dict['employee'] = {'value': employee_code}
                display_text = f.get_rate_display(employee_pricerate, user_lang)
                item_dict['priceratejson'] = {'value': employee_pricerate, 'display': display_text}
                pricerate_list.append(item_dict)

            if teammember_pk:
                item_dict = {}
                item_dict['employee_pk'] = employee_pk
                item_dict['id'] = {'pk': teammember_pk, 'ppk': teammember_ppk, 'table': 'teammember'}
                teammmember_code =  customer_code
                if order_code:
                    teammmember_code += ' - ' + order_code
                item_dict['order'] = {'value': teammmember_code}
                display_text = f.get_rate_display(teammember_pricerate, user_lang)
                item_dict['priceratejson'] = {'value': teammember_pricerate, 'display': display_text}
                item_dict['override'] = {'value': teammember_override}
                pricerate_list.append(item_dict)

    return pricerate_list

def validate_employee_exists_in_teammembers(employee, team, this_pk):  # PR2019-06-11
    # - check if employee exists - employee is required field of teammember, is skipped in schemeitems (no field employee)
    msg_err = None
    exists = False
    if employee and team:
        crit = Q(team=team) & Q(employee=employee)
        if this_pk:
            crit.add(~Q(pk=this_pk), crit.connector)
        exists = m.Teammember.objects.filter(crit).exists()
    if exists:
        msg_err = _('This employee already exists.')
    return msg_err
