from django.db import connection
from django.db.models import Q, Value
from django.db.models.functions import  Coalesce, Lower
from datetime import datetime

from django.utils.translation import ugettext_lazy as _

from tsap import functions as f
from tsap import constants as c
from companies import models as m

import logging
import json
logger = logging.getLogger(__name__)

def create_employee_list(company, user_lang, inactive=None, rangemin=None, rangemax=None):
    # --- create list of all active employees of this company PR2019-06-16
    #logger.debug(' --- create_employee_list   ')
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

    # FIELDS_EMPLOYEE = ('id', 'company', 'code', 'datefirst', 'datelast',
    #                    'namelast', 'namefirst', 'email', 'telephone', 'identifier',
    #                    'address', 'zipcode', 'city', 'country',
    #                    'payrollcode', 'wagerate', 'wagecode', 'workhours', 'workdays', 'leavedays',
    #                    'priceratejson', 'additionjson', 'inactive', 'locked')

    if instance:

# ---  get min max date
        datefirst = getattr(instance, 'datefirst')
        datelast = getattr(instance, 'datelast')

        workhours = getattr(instance, 'workhours', 0)  # workhours per week * 60, unit is minute
        workdays = getattr(instance, 'workdays', 0) # workdays per week * 1440, unit is minute (one day has 1440 minutes)
        workhoursperday = 0
        if workhours and workdays:
            workhoursperday = round(workhours / workdays * 1440)  # round to whole minutes

        for field in c.FIELDS_EMPLOYEE:
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.company.pk
                field_dict['table'] = 'employee'
                item_dict['pk'] = instance.pk

            elif field == 'company':
                pass

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
                field_dict['display'] = f.display_pricerate(pricerate, False, user_lang)

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


def create_teammember_list(filter_dict, company, user_lang):
    # --- create list of all teammembers of this order PR2019-08-29
    #logger.debug(' ----- create_teammember_list  -----  ')
    #logger.debug('filter_dict' + str(filter_dict) )
    # teammember: {customer_pk: selected_customer_pk, order_pk: selected_order_pk},

    customer_pk = filter_dict.get('customer_pk')
    order_pk = filter_dict.get('order_pk')
    employee_nonull = filter_dict.get('employee_nonull', False)
    is_template = filter_dict.get('is_template')

    crit = Q(team__scheme__order__customer__company=company)
    if is_template is not None:
        crit.add(Q(istemplate=is_template), crit.connector)
    if employee_nonull:
        crit.add(Q(employee__isnull=False), crit.connector)
    if order_pk:
        crit.add(Q(team__scheme__order_id=order_pk), crit.connector)
    elif customer_pk:
        crit.add(Q(team__scheme__order__customer_id=customer_pk), crit.connector)

    teammembers = m.Teammember.objects\
        .select_related('employee')\
        .select_related('team')\
        .select_related('team__scheme')\
        .select_related('team__scheme__order')\
        .select_related('team__scheme__order__customer') \
        .filter(crit).order_by(Lower('employee__code'))
    # was:
        # .annotate(datelast_nonull=Coalesce('datelast', Value(datetime(2500, 1, 1)))) \
        # .filter(crit).order_by('employee__code', '-datelast_nonull')  # .filter(crit).order_by('-datelast_nonull')

    # iterator: from https://medium.com/@hansonkd/performance-problems-in-the-django-orm-1f62b3d04785
    #logger.debug('teammembers.query')
    #logger.debug(teammembers.query)

    teammember_list = []
    for teammember in teammembers:

        item_dict = {}
        create_teammember_dict(teammember, item_dict, user_lang)

        if item_dict:
            teammember_list.append(item_dict)

    return teammember_list

def create_teammember_dict(teammember, item_dict, user_lang):
    # --- create dict of this teammember PR2019-07-26
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    #logger.debug ('--- create_teammember_dict ---')
    #logger.debug ('item_dict' + str(item_dict))

    # PR2019-12-20 Note: 'scheme' and 'order' are not model fields, but necessary for absence update
    # FIELDS_TEAMMEMBER = ('id', 'team', 'employee', 'replacement', 'datefirst', 'datelast',
    #                      'scheme', 'order',
    #                      'cat', 'isabsence', 'issingleshift', 'istemplate',
    #                      'wagefactorcode', 'pricecode', 'additioncode', 'override')

    if teammember:
        is_singleshift = teammember.issingleshift
        is_absence = teammember.isabsence

        #logger.debug('teammember ' + str(teammember) + str(type(teammember)))
        #logger.debug('teammember.datefirst ' + str(teammember.datefirst) + str(type(teammember.datefirst)))
        #logger.debug('teammember.datelast ' + str(teammember.datelast) + str(type(teammember.datelast)))
# ---  get datefirst/ datelast of scheme, order and employee
        team = teammember.team
        scheme = team.scheme
        order = scheme.order

        team_code = team.code if team.code else ''

        employee_datefirst, employee_datelast = None, None
        employee = teammember.employee
        if employee:
            employee_datefirst = employee.datefirst
            employee_datelast = employee.datelast

        for field in c.FIELDS_TEAMMEMBER:

# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = teammember.pk
                field_dict['ppk'] = teammember.team.pk
                field_dict['table'] = 'teammember'
                if teammember.isabsence:
                    field_dict['isabsence'] = True
                if teammember.issingleshift:
                    field_dict['issingleshift'] = True
                if teammember.istemplate:
                    field_dict['istemplate'] = True
                item_dict['pk'] = teammember.pk

            # team is parent of teammember
            elif field == 'team':
                if team:
                    field_dict['pk'] = team.pk
                    field_dict['ppk'] = team.scheme.pk
                    if team_code:
                        field_dict['code'] = team_code
                    schemeteam_code = team_code if is_absence or is_singleshift else ' - '.join([scheme.code, team_code])
                    field_dict['display'] = schemeteam_code

            elif field == 'scheme':
                if scheme:
                    field_dict['pk'] = scheme.pk
                    field_dict['ppk'] = order.pk
                    scheme_code = scheme.code if scheme.code else ''
                    if scheme_code:
                        field_dict['code'] = scheme_code
                    schemeteam_code = ' - '.join([scheme.code, team_code]) if is_singleshift else scheme_code
                    field_dict['value'] = schemeteam_code

            elif field == 'order':
                if order:
                    order_code = order.code if order.code else ''
                    cust_code = order.customer.code if order.customer.code else ''
                    cust_order_code = ' - '.join([cust_code, order_code])
                    field_dict['pk'] = order.pk
                    field_dict['ppk'] = order.customer_id
                    field_dict['code'] = order_code
                    field_dict['cust_order_code'] = cust_order_code
                    field_dict['value'] = cust_order_code

            elif field == 'employee':
                employee = teammember.employee
                if employee:
                    field_dict['pk'] = employee.pk
                    field_dict['ppk'] = employee.company_id
                    if employee.code:
                        field_dict['code'] = employee.code
                    if employee.inactive:
                        field_dict['inactive'] = employee.inactive
                    if employee.workhours:
                        field_dict['workhours'] = employee.workhours

            elif field == 'replacement':
                replacement = teammember.replacement
                if replacement:
                    field_dict['pk'] = replacement.pk
                    field_dict['ppk'] = replacement.company_id
                    if replacement.code:
                        field_dict['code'] = replacement.code

            elif field in ['datefirst', 'datelast']:
                # if is_absence or is_singleshift: get datefirst / datelast from scheme
                # is restshift or schemshift: get datefirst / datelast from teammember

                if is_absence or is_singleshift:
                    instance = scheme
                    outer_mindate = f.date_latest_of_two(order.datefirst, employee_datefirst)
                    outer_maxdate = f.date_earliest_of_two(order.datelast, employee_datelast)
                else:
                    instance = teammember
                    outer_mindate = f.date_latest_of_three(scheme.datefirst, order.datefirst, employee_datefirst)
                    outer_maxdate = f.date_earliest_of_three(scheme.datelast, order.datelast, employee_datelast)

                value = getattr(instance, field)

                if field == 'datefirst':
                    mindate = outer_mindate
                    maxdate = f.date_earliest_of_two(instance.datelast, outer_maxdate)
                else:
                    mindate = f.date_latest_of_two(instance.datefirst, outer_mindate)
                    maxdate = outer_maxdate

                if value or outer_mindate or outer_maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_obj=value,
                            mindate=mindate,
                            maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(
                            field_dict=field_dict,
                            date_obj=value,
                            mindate=mindate,
                            maxdate=maxdate)

            elif field in ('isabsence', 'issingleshift', 'istemplate'):
                pass

            else:
                value = getattr(teammember, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

# 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(item_dict)
    return item_dict
# === end of create_teammember_dict


def create_employee_pricerate_list(company, user_lang):
    #logger.debug(' --- create_employee_pricerate_list --- ')

    pricerate_list = []

# 1 create list of employees with teammembers, LEFT JOIN, includes employees without teammember
    #  LOWER(e.code) must be in SELECT
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    newcursor = connection.cursor()
    newcursor.execute("""WITH tm_sub AS (SELECT tm.id AS tm_id, tm.employee_id AS e_id, tm.team_id AS team_id, 
            c.code AS c_code, o.code AS o_code, s.code AS s_code, 
            tm.priceratejson AS tm_priceratejson, tm.override AS tm_override,  
            LOWER(c.code) AS c_lower, LOWER(o.code) AS o_lower, LOWER(s.code) AS s_lower 
            FROM companies_teammember AS tm 
            INNER JOIN companies_team AS t ON (tm.team_id = t.id)
            INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
            INNER JOIN companies_order AS o ON (s.order_id = o.id) 
            INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
            WHERE (c.company_id = %(cid)s) AND (o.cat < %(cat)s) 
            ORDER BY c_lower, o_lower, s_lower ASC )  
        SELECT e.id, e.company_id, e.code AS e_code, e.priceratejson, tm_sub.tm_id, tm_sub.team_id, tm_sub.tm_priceratejson, tm_sub.tm_override, 
        tm_sub.c_code, tm_sub.o_code, tm_sub.s_code,LOWER(e.code) AS e_lower  
        FROM companies_employee AS e 
        LEFT JOIN tm_sub ON (e.id = tm_sub.e_id)
        WHERE (e.company_id = %(cid)s) 
        ORDER BY e_lower ASC""", {
              'cid': company.pk,
              'cat': c.SHIFT_CAT_0512_ABSENCE})
    teammember_rows = newcursor.fetchall()
    #logger.debug('++++++++++ teammember_rows >' + str(teammember_rows))

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
                display_text = f.display_pricerate(employee_pricerate, False, user_lang)
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
                display_text = f.display_pricerate(teammember_pricerate, False, user_lang)
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
