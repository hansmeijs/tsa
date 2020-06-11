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

def create_employee_list(company, user_lang, inactive=None, datefirst_iso=None, datelast_iso=None):
    # --- create list of all active employees of this company PR2019-06-16
    #logger.debug(' --- create_employee_list   ')
    # PR2020-05-11 with Django model it took 10 seconds - with sql it takes ??? to be tested

    #logger.debug(' =============== create_employee_list ============= ')

    sql_employee = """ SELECT e.id, e.company_id, e.code, e.datefirst, e.datelast,
        e.namelast, e.namefirst, e.email, e.telephone, e.address, e.zipcode, e.city, e.country,
        e.identifier, e.payrollcode, e.workhours, e.workdays, e.leavedays, 
        CASE WHEN e.workhours = 0 OR e.workdays = 0 THEN 0 ELSE 1440 * e.workhours / e.workdays END AS e_workhoursperday,
        fc.code AS functioncode, wc.code AS wagecode, pc.code AS paydatecode, 
        e.locked, e.inactive
    
        FROM companies_employee AS e 
        LEFT JOIN companies_wagecode AS wc ON (wc.id = e.wagecode_id) 
        LEFT JOIN companies_wagecode AS fc ON (fc.id = e.functioncode_id) 
        LEFT JOIN companies_wagecode AS pc ON (pc.id = e.paydatecode_id) 
 
        WHERE e.company_id = %(compid)s
        AND ( e.datefirst <= CAST(%(rdl)s AS DATE) OR e.datefirst IS NULL OR %(rdl)s IS NULL )
        AND ( e.datelast >= CAST(%(rdf)s AS DATE) OR e.datelast IS NULL OR %(rdf)s IS NULL )
        AND ( e.inactive = CAST(%(inactive)s AS BOOLEAN) OR %(inactive)s IS NULL )
        ORDER BY e.code 
        """
    newcursor = connection.cursor()
    newcursor.execute(sql_employee, {
        'compid': company.id,
        'rdf': datefirst_iso,
        'rdl': datelast_iso,
        'inactive': inactive
    })
    employees = f.dictfetchall(newcursor)

    employee_list = []
    for employee in employees:
        #logger.debug('...................................')
        #logger.debug('employee' + str(employee))
        item_dict = {}
        create_employee_dict_from_sql(employee, item_dict, user_lang)
        if item_dict:
            employee_list.append(item_dict)
    return employee_list


def create_employee_dict_from_sql(instance,  item_dict, user_lang):
    # --- create dict of this employee from dictfetchall PR2020-05-11

    if instance:

# ---  get min max date
        datefirst = instance.get('datefirst')
        datelast = instance.get('datelast')

        workhours = instance.get('workhours', 0)  # workhours per week * 60, unit is minute
        workdays = instance.get('workdays', 0) # workdays per week * 1440, unit is minute (one day has 1440 minutes)
        workhoursperday = instance.get('e_workhoursperday', 0)

        for field in c.FIELDS_EMPLOYEE:
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.get('id')
                field_dict['ppk'] = instance.get('company_id')
                field_dict['table'] = 'employee'
                item_dict['pk'] = instance.get('id')

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
                pricerate = instance.get(field)
                if pricerate is not None:
                    field_dict['value'] = pricerate
                field_dict['display'] = f.display_pricerate(pricerate, False, user_lang)

            else:
                value = instance.get(field)
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
    return create_employee_dict_from_sql
# >>>   end create_employee_dict




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
    #logger.debug(' ----- create_teammember_list  -----  ')
    #logger.debug('filter_dict: ' + str(filter_dict) )
    # teammember: {customer_pk: selected_customer_pk, order_pk: selected_order_pk},
    # create list of all teammembers of this order PR2020-05-16

    order_pk = None
    customer_pk = filter_dict.get('customer_pk')
    if customer_pk is None:
        order_pk = filter_dict.get('order_pk')

    employee_nonull = f.get_dict_value(filter_dict, ('employee_nonull',), False)
    employee_allownull = not employee_nonull

    #logger.debug('employee_allownull: ' + str(employee_allownull) )
    datelast_iso =  filter_dict.get('datelast')

    sql_schemeitem_shift = """
        SELECT si.team_id AS t_id, 
            ARRAY_AGG(si.id) AS si_id_arr,
            ARRAY_AGG(si.shift_id) AS sh_id_arr,
            ARRAY_AGG(sh.code) AS sh_code_arr,
            ARRAY_AGG(si.isabsence) AS si_abs_arr,
            ARRAY_AGG(sh.isrestshift) AS sh_rest_arr,
            ARRAY_AGG(sh.offsetstart) AS sh_os_arr,
            ARRAY_AGG(sh.offsetend) AS sh_oe_arr,
            ARRAY_AGG(sh.breakduration) AS sh_bd_arr,
            ARRAY_AGG(sh.timeduration) AS sh_td_arr

            FROM companies_schemeitem AS si 
            INNER JOIN companies_shift AS sh ON (sh.id = si.shift_id) 
            GROUP BY si.team_id
        """

    sql_teammmember = """ SELECT  tm.id AS tm_id, t.id AS t_id, s.id AS s_id, o.id AS o_id, c.id AS c_id,
        c.company_id AS comp_id,
        e.id AS e_id,
        r.id AS r_id,

        tm.isabsence AS tm_isabsence, 
        tm.istemplate AS tm_istemplate, 
        COALESCE(t.code, '') AS t_code,
        COALESCE(s.code, '') AS s_code,
        COALESCE(o.code, '') AS o_code,
        COALESCE(c.code, '') AS c_code,
        COALESCE(e.code, '') AS e_code,
        COALESCE(r.code, '') AS r_code,
        
        s.nohoursonsaturday AS s_nosat,
        s.nohoursonsunday AS e_nosun,
        s.nohoursonpublicholiday AS e_noph,
        
        e.inactive AS e_inactive,
        CASE WHEN e.workhours = 0 OR e.workdays = 0 THEN 0 ELSE 1440 * e.workhours / e.workdays END AS e_workhoursperday,
        r.inactive AS r_inactive,
        r.workhours AS r_workhours,

        tm.datefirst AS tm_df, tm.datelast AS tm_dl, 
        s.datefirst AS s_df, s.datelast AS s_dl, 
        o.datefirst AS o_df, o.datelast AS o_dl, 
        e.datefirst AS e_df, e.datelast AS e_dl, 
        r.datefirst AS r_df, r.datelast AS r_dl, 

        GREATEST( s.datefirst, o.datefirst) AS o_s_datemin,
        LEAST( s.datelast, o.datelast) AS o_s_datemax,

        si_sh_sub.si_id_arr,
        si_sh_sub.sh_id_arr,
        si_sh_sub.sh_code_arr,
        si_sh_sub.si_abs_arr,
        si_sh_sub.sh_rest_arr,
        si_sh_sub.sh_os_arr,
        si_sh_sub.sh_oe_arr,
        si_sh_sub.sh_bd_arr,
        si_sh_sub.sh_td_arr

        FROM companies_teammember AS tm 
        INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
        INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
        INNER JOIN companies_order AS o ON (o.id = s.order_id) 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
        LEFT JOIN companies_employee AS e ON (e.id = tm.employee_id) 
        LEFT JOIN companies_employee AS r ON (r.id = tm.replacement_id) 
        
        LEFT JOIN (""" + sql_schemeitem_shift + """) AS si_sh_sub ON (si_sh_sub.t_id = t.id)    
 
        WHERE c.company_id = CAST(%(compid)s AS INTEGER)
        AND ( c.id = CAST(%(cust_id)s AS INTEGER) OR %(cust_id)s IS NULL )    
        AND ( o.id = CAST(%(ord_id)s AS INTEGER) OR %(ord_id)s IS NULL )
        AND ( e.id IS NOT NULL OR %(empl_allownull)s )
        ORDER BY e.code 
        """
        #AND ( e.datelast >= CAST(%(rdl)s AS DATE) OR e.datelast IS NULL OR %(rdl)s IS NULL )

    newcursor = connection.cursor()
    newcursor.execute(sql_teammmember, {
        'compid': company.id,
        'cust_id': customer_pk,
        'ord_id': order_pk,
        'empl_allownull': employee_allownull,
        'rdl': datelast_iso
    })
    teammembers = f.dictfetchall(newcursor)

    teammember_list = []
    for teammember in teammembers:
        item_dict = {}
        create_teammember_dict_from_sql(teammember, item_dict, user_lang)

        if item_dict:
            teammember_list.append(item_dict)

    return teammember_list

def create_teammember_dict_from_sql(tm, item_dict, user_lang):
    # --- create dict of this teammember PR2019-07-26
    #logger.debug ('--- create_teammember_dict ---')
    #logger.debug ('tm: ' + str(tm))
    #logger.debug ('item_dict: ' + str(item_dict))

    # PR2019-12-20 Note: 'scheme' and 'order' are not model fields, but necessary for absence update
    # FIELDS_TEAMMEMBER = ('id', 'team', 'employee', 'replacement', 'datefirst', 'datelast',
    #                      'scheme', 'order',
    #                      'cat', 'isabsence', 'issingleshift', 'istemplate',
    #                      'wagefactorcode', 'pricecode', 'additioncode', 'override')

    if tm:
        #is_singleshift = teammember.issingleshift
        is_absence = tm.get('tm_isabsence')
        is_template = tm.get('tm_istemplate')

        #logger.debug('is_absence ' + str(is_absence) + str(type(is_absence)))
        #logger.debug('teammember.datefirst ' + str(teammember.datefirst) + str(type(teammember.datefirst)))
        #logger.debug('teammember.datelast ' + str(teammember.datelast) + str(type(teammember.datelast)))
# ---  get datefirst/ datelast of scheme, order and employee
        employee_datefirst = tm.get('e_df')
        employee_datelast = tm.get('e_dl')

        for field in c.FIELDS_TEAMMEMBER:
# --- get field_dict from  item_dict if it exists
        # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
            field_dict = item_dict[field] if field in item_dict else {}

            #logger.debug('field: ' + str(field))
            if field == 'id':
                field_dict['pk'] = tm.get('tm_id')
                field_dict['ppk'] = tm.get('t_id') # team_id is parent of tm
                field_dict['table'] = 'teammember'
                field_dict['isabsence'] = is_absence
                #if teammember.issingleshift:
                    #field_dict['issingleshift'] = True
                field_dict['istemplate'] =is_template
                # item_dict['pk'] = tm.get('tm_id')

            # team is parent of teammember
            elif field == 'team':
                field_dict['pk'] = tm.get('t_id')
                field_dict['ppk'] = tm.get('s_id')  # used in page scheme, grid team
                field_dict['code'] = tm.get('t_code')
                field_dict['display'] = tm.get('t_code') if is_absence else ' - '.join([tm.get('s_code'), tm.get('t_code')])

            elif field == 'scheme':
                field_dict['pk'] = tm.get('s_id')
                #field_dict['ppk'] = tm.o_id
                field_dict['code'] = tm.get('s_code')
                field_dict['datefirst'] = tm.get('s_df')
                field_dict['datelast'] = tm.get('s_dl')
                field_dict['nohoursonsaturday'] = tm.get('s_nosat')
                field_dict['nohoursonsunday'] = tm.get('s_nosun')
                field_dict['nohoursonpublicholiday'] = tm.get('s_noph')

            elif field == 'order':
                field_dict['pk'] = tm.get('o_id')
                field_dict['ppk'] = tm.get('c_id')
                field_dict['code'] = tm.get('o_code')
                field_dict['display'] = ' - '.join([tm.get('c_code'), tm.get('o_code')])
                field_dict['datefirst'] = tm.get('o_df')
                field_dict['datelast'] = tm.get('o_dl')

            elif field == 'shift':
                # only when is_absence, to get timestart etc
                #if is_absence:
                field_dict['si_id_arr'] = tm.get('si_id_arr')
                field_dict['sh_id_arr'] = tm.get('sh_id_arr')
                field_dict['sh_code_arr'] = tm.get('sh_code_arr')
                field_dict['si_abs_arr'] = tm.get('si_abs_arr')
                field_dict['sh_rest_arr'] = tm.get('sh_rest_arr')
                field_dict['sh_os_arr'] = tm.get('sh_os_arr')
                field_dict['sh_oe_arr'] = tm.get('sh_oe_arr')
                field_dict['sh_bd_arr'] = tm.get('sh_bd_arr')
                field_dict['sh_td_arr'] = tm.get('sh_td_arr')

            elif field == 'employee':
                if tm.get('e_id'):
                    field_dict['pk'] = tm.get('e_id')
                    #field_dict['ppk'] = tm.comp_id
                    field_dict['code'] = tm.get('e_code')
                    field_dict['inactive'] = tm.get('e_inactive', False)
                    field_dict['datefirst'] = tm.get('e_df')
                    field_dict['datelast'] = tm.get('e_dl')
                    field_dict['workhoursperday'] = tm.get('e_workhoursperday')

            elif field == 'replacement':
                #logger.debug('>>>>>>>>>>>>>>>>>>>> field: ' + str(field))
                #logger.debug('tm.get(r_id' + str(tm.get('r_id')))
                if tm.get('r_id'):
                    field_dict['pk'] = tm.get('r_id')
                    #field_dict['ppk'] = tm.comp_id
                    field_dict['code'] = tm.get('r_code')
                    field_dict['inactive'] = tm.get('r_inactive', False)
                    field_dict['workhours'] = tm.get('r_workhours')
                    field_dict['datefirst'] = tm.get('r_df')
                    field_dict['datelast'] = tm.get('r_dl')

            elif field in ['datefirst', 'datelast']:
                # if is_absence or is_singleshift: get datefirst / datelast from scheme
                # is restshift or schemshift: get datefirst / datelast from teammember

                if field == 'datefirst':
                    value = tm.get('tm_df')
                    mindate = tm.get('o_s_datemin')
                    maxdate = f.date_earliest_of_two(tm.get('tm_dl'), tm.get('o_s_datemax'))
                else:
                    value = tm.get('tm_dl')
                    mindate = f.date_latest_of_two(tm.get('tm_df'), tm.get('o_s_datemin'))
                    maxdate = tm.get('o_s_datemax')
                #logger.debug( '>>>>>>>>> field: ' + field + ' ' +    'value: ' + str(value))
                if value or mindate or maxdate:
                    f.set_fielddict_date(

                        field_dict=field_dict,
                        date_obj=value,
                        mindate=mindate,
                        maxdate=maxdate)

            elif field in ('isabsence', 'issingleshift', 'istemplate'):
                pass

            #else:
                #value = getattr(teammember, field)
            #    if value:
            #        field_dict['value'] = value

            item_dict[field] = field_dict

# 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(item_dict)
    return item_dict
# === end of create_teammember_dict_from_sql


def create_teammember_dict_from_model(teammember, item_dict, user_lang):
    # --- create dict of this teammember PR2019-07-26
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    #logger.debug ('--- create_teammember_dict_from_model ---')
    #logger.debug ('teammember: ' + str(teammember))
    #logger.debug ('item_dict' + str(item_dict))

    # PR2019-12-20 Note: 'scheme' and 'order' are not model fields, but necessary for absence update
    # FIELDS_TEAMMEMBER = ('id', 'team', 'employee', 'replacement', 'datefirst', 'datelast',
    #                      'scheme', 'order',
    #                      'cat', 'isabsence', 'issingleshift', 'istemplate',
    #                      'wagefactorcode', 'pricecode', 'additioncode', 'override')

    if teammember:
        is_singleshift = teammember.issingleshift
        is_absence = teammember.isabsence

        #logger.debug('is_absence ' + str(is_absence) + str(type(is_absence)))
        #logger.debug('teammember.datefirst ' + str(teammember.datefirst) + str(type(teammember.datefirst)))
        #logger.debug('teammember.datelast ' + str(teammember.datelast) + str(type(teammember.datelast)))
        #logger.debug('teammember.replacement ' + str(teammember.replacement) + str(type(teammember.replacement)))

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


            #logger.debug('field_dict ' + str(field) + ' ' + str(field_dict))
            if field == 'id':
                field_dict['pk'] = teammember.pk
                field_dict['ppk'] = teammember.team.pk
                field_dict['table'] = 'teammember'
                field_dict['isabsence'] = True
                #field_dict['issingleshift'] = True
                field_dict['istemplate'] = True
                # item_dict['pk'] = teammember.pk

            # team is parent of teammember
            elif field == 'team':
                if team:
                    field_dict['pk'] = team.pk
                    field_dict['ppk'] = team.scheme.pk
                    if team_code:
                        field_dict['code'] = team_code
                    schemeteam_code = team_code if is_absence else ' - '.join([scheme.code, team_code])
                    field_dict['display'] = schemeteam_code

            elif field == 'scheme':
                field_dict['pk'] = scheme.pk
                field_dict['ppk'] = order.pk
                field_dict['code'] = scheme.code if scheme.code else ''
                field_dict['datefirst'] = scheme.datefirst
                field_dict['datelast'] = scheme.datelast

            elif field == 'order':
                if order:
                    order_code = order.code if order.code else ''
                    cust_code = order.customer.code if order.customer.code else ''
                    cust_order_code = ' - '.join([cust_code, order_code])
                    field_dict['pk'] = order.pk
                    field_dict['ppk'] = order.customer_id
                    field_dict['code'] = order_code
                    field_dict['display'] = cust_order_code
                    field_dict['value'] = cust_order_code
                    field_dict['datefirst'] = order.datefirst
                    field_dict['datelast'] = order.datelast

            elif field == 'shift':
                # get shift, only if is_absence, cycle = 1 , get first oe
                if scheme and scheme.cycle == 1:
                    shift = m.Shift.objects.filter(scheme=scheme).first()
                    if shift:
                        field_dict['pk'] = shift.pk
                        field_dict['ppk'] = scheme.pk
                        field_dict['code'] = shift.code
                        field_dict['offsetstart'] = shift.offsetstart
                        field_dict['offsetend'] = shift.offsetend
                        field_dict['breakduration'] = shift.breakduration
                        field_dict['timeduration'] = shift.timeduration

            elif field == 'employee':
                employee = teammember.employee
                if employee:
                    field_dict['pk'] = employee.pk
                    field_dict['ppk'] = employee.company_id
                    field_dict['code'] = employee.code
                    field_dict['inactive'] = employee.inactive
                    field_dict['workhours'] = employee.workhours
                    field_dict['datefirst'] = employee.datefirst
                    field_dict['datelast'] = employee.datelast

            elif field == 'replacement':
                replacement = teammember.replacement
                if replacement:
                    field_dict['pk'] = replacement.pk
                    field_dict['ppk'] = replacement.company_id
                    field_dict['code'] = replacement.code
                    field_dict['inactive'] = replacement.inactive
                    field_dict['workhours'] = replacement.workhours
                    field_dict['datefirst'] = replacement.datefirst
                    field_dict['datelast'] = replacement.datelast

            elif field in ['datefirst', 'datelast']:
                # if is_absence or is_singleshift: get datefirst / datelast from scheme
                # is restshift or schemshift: get datefirst / datelast from teammember

                if is_absence or is_singleshift:
                    instance = scheme
                    outer_mindate = f.date_latest_of_two(order.datefirst, employee_datefirst)
                    outer_maxdate = f.date_earliest_of_two(order.datelast, employee_datelast)
                else:
                    # dont filter on employee datefirst-last. Teammember of shift can be added to roster, even if employee out of service
                    instance = teammember
                    outer_mindate = f.date_latest_of_two(scheme.datefirst, order.datefirst)
                    outer_maxdate = f.date_earliest_of_two(scheme.datelast, order.datelast)

                value = getattr(instance, field)
                if field == 'datefirst':
                    mindate = outer_mindate
                    maxdate = f.date_earliest_of_two(instance.datelast, outer_maxdate)
                else:
                    mindate = f.date_latest_of_two(instance.datefirst, outer_mindate)
                    maxdate = outer_maxdate

                if value or mindate or maxdate:
                    f.set_fielddict_date(
                        field_dict=field_dict,
                        date_obj=value,
                        mindate=mindate,
                        maxdate=maxdate)

            elif field in ('isabsence', 'issingleshift', 'istemplate'):
                pass

            #else:
                #value = getattr(teammember, field)
            #    if value:
            #        field_dict['value'] = value

            item_dict[field] = field_dict

# 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(item_dict)
    return item_dict
# === end of create_teammember_dict_from_model

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
