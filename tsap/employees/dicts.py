from django.db import connection
from django.db.models import Q, Value
from django.db.models.functions import  Coalesce, Lower
from datetime import datetime

from django.utils.translation import ugettext_lazy as _

from tsap import functions as f
from tsap import constants as c
from companies import models as m
from planning import views as plv

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
        e.identifier, e.payrollcode, e.workhours, e.workdays, e.leavedays, e.workminutesperday,
        fc.id AS fc_id, fc.code AS fn_code, wc.id AS wc_id, wc.code AS wc_code, pdc.id AS pdc_id, pdc.code AS pdc_code, 
        e.locked, e.inactive
    
        FROM companies_employee AS e 
        LEFT JOIN companies_wagecode AS wc ON (wc.id = e.wagecode_id) 
        LEFT JOIN companies_wagecode AS fc ON (fc.id = e.functioncode_id) 
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id) 
 
        WHERE e.company_id = %(compid)s
        AND ( e.datefirst <= CAST(%(rdl)s AS DATE) OR e.datefirst IS NULL OR %(rdl)s IS NULL )
        AND ( e.datelast >= CAST(%(rdf)s AS DATE) OR e.datelast IS NULL OR %(rdf)s IS NULL )
        AND ( e.inactive = CAST(%(inactive)s AS BOOLEAN) OR %(inactive)s IS NULL )
        ORDER BY LOWER(e.code) ASC
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
    # --- create dict of this employee from dictfetchall PR2020-06-18

    if instance:
# ---  get min max date
        datefirst = instance.get('datefirst')
        datelast = instance.get('datelast')

        workhours = instance.get('workhours', 0)  # workhours per week * 60, unit is minute
        workdays = instance.get('workdays', 0) # workdays per week * 1440, unit is minute (one day has 1440 minutes)
        workminutesperday = instance.get('workminutesperday', 0)

        for field in c.FIELDS_EMPLOYEE:
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.get('id')
                field_dict['ppk'] = instance.get('company_id')
                field_dict['table'] = 'employee'

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

            elif field in ['functioncode', 'wagecode', 'paydatecode']:
                prefix = ''
                if field == 'functioncode':
                    prefix = 'fc'
                elif field == 'wagecode':
                    prefix = 'wc'
                elif field == 'paydatecode':
                    prefix = 'pdc'
                pk = instance.get(prefix + '_id')
                code = instance.get(prefix + '_code')
                if pk:
                    field_dict['pk'] = pk
                    field_dict['value'] = code

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
            fld = 'workminutesperday'
            if fld not in item_dict:
                item_dict[fld] = {}
            item_dict[fld]['value'] = workminutesperday

# 7. remove empty attributes from item_update
    f.remove_empty_attr_from_dict(item_dict)
    return create_employee_dict_from_sql
# >>>   end create_employee_dict



def create_employee_dict(instance, item_dict, user_lang):
    # --- create dict of this employee PR2019-07-26 PR2020-06-18

    if instance:

# ---  get min max date
        datefirst = getattr(instance, 'datefirst')
        datelast = getattr(instance, 'datelast')

        workhours = getattr(instance, 'workhours', 0)  # workhours per week * 60, unit is minute
        workdays = getattr(instance, 'workdays', 0) # workdays per week * 1440, unit is minute (one day has 1440 minutes)
        workminutesperday = getattr(instance, 'workminutesperday', 0)  # workhours per week * 60, unit is minute

        for field in c.FIELDS_EMPLOYEE:
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.company.pk
                field_dict['table'] = 'employee'

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

            elif field in ['functioncode', 'wagecode', 'paydatecode']:
                pk = getattr(instance, field)
                if field == 'functioncode':
                    if instance.functioncode:
                        field_dict['pk'] = instance.functioncode.pk
                        field_dict['value'] = instance.functioncode.code
                elif field == 'wagecode':
                    if instance.wagecode:
                        field_dict['pk'] = instance.wagecode.pk
                        field_dict['value'] = instance.wagecode.code
                elif field == 'paydatecode':
                    if instance.paydatecode:
                        field_dict['pk'] = instance.paydatecode.pk
                        field_dict['value'] = instance.paydatecode.code

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
            fld = 'workminutesperday'
            if fld not in item_dict:
                item_dict[fld] = {}
            item_dict[fld]['value'] = workminutesperday

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
        s.nohoursonsunday AS s_nosun,
        s.nohoursonpublicholiday AS s_noph,
        
        e.inactive AS e_inactive,
        e.workminutesperday AS e_workminutesperday,
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
        ORDER BY LOWER(e.code) ASC 
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
                    field_dict['workminutesperday'] = tm.get('e_workminutesperday')

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

def create_paydatecodes_inuse_list(period_dict, request):
    # logger.debug(' ----------- create_paydatecodes_inuse_list ----------- ')
    # create list of paydatecodes that are in table emplhour PR2020-06-23

    paydatecodes_inuse_list = []
    if request.user.company:
        # TODO None is for testing only, remove
        period_datefirst = None  # period_dict.get('period_datefirst')
        period_datelast = None  # period_dict.get('period_datelast')
        if period_datefirst is None:
            period_datefirst = '1900-01-01'
        if period_datelast is None:
            period_datelast = '2500-01-01'

# - fill paydatecode_list, it contains list of all paydatecodes en paydates in this selection
        # dont show emplhours without employee
        sql_paydatecodes_inuse = """
                SELECT pdc.id, pdc.code  
                FROM companies_paydatecode AS pdc 
                INNER JOIN companies_emplhour AS eh ON (eh.paydatecode_id = pdc.id)
                WHERE (pdc.company_id = %(compid)s)  
                AND (eh.employee_id IS NOT NULL)
                AND (eh.rosterdate IS NOT NULL) 
                AND (eh.rosterdate >= CAST(%(df)s AS DATE) OR %(df)s IS NULL)
                AND (eh.rosterdate <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL)
                GROUP BY pdc.id, pdc.code
                ORDER BY pdc.code
            """
        newcursor = connection.cursor()
        newcursor.execute(sql_paydatecodes_inuse, {
            'compid': request.user.company_id, 'df': period_datefirst, 'dl': period_datelast
        })
        paydatecodes_inuse_list = newcursor.fetchall()

# add 'Blank payrollperiod' when thre are paydates without paydatecode
        sql_empty_paydatecodes_inuse = """
            SELECT eh.id
            FROM companies_emplhour AS eh
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            WHERE (c.company_id = %(compid)s)  
            AND (eh.paydatecode_id IS NULL) 
            AND (eh.employee_id IS NOT NULL)
            AND (eh.rosterdate IS NOT NULL) 
            AND (eh.rosterdate >= CAST(%(df)s AS DATE) OR %(df)s IS NULL)
            AND (eh.rosterdate <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL)
            LIMIT 1
            """
        newcursor.execute(sql_empty_paydatecodes_inuse, {
            'compid': request.user.company_id, 'df': period_datefirst, 'dl': period_datelast
        })
        empty_paydatecode_inuse = newcursor.fetchone()
        if empty_paydatecode_inuse:
            paydatecodes_inuse_list.append( [0, _('Without payrollperiod')] )

    return paydatecodes_inuse_list


def create_paydateitems_inuse_list(period_dict, request):
    #logger.debug(' ============= create_paydateitems_inuse_list ============= ')
    # create list of paydates with paydatecode_id that are in table emplhour PR2020-06-23

    paydateitems_inuse_list = []
    if request.user.company:
        # TODO None is for testing only, remove
        period_datefirst = None  # period_dict.get('period_datefirst')
        period_datelast = None  # period_dict.get('period_datelast')
        if period_datefirst is None:
            period_datefirst = '1900-01-01'
        if period_datelast is None:
            period_datelast = '2500-01-01'

# - fill paydateitems_inuse_list it contains list of all paydatecodes en paydates in this selection
        sql_paydates_inuse = """
            SELECT DISTINCT 
                CASE WHEN eh.paydatecode_id IS NULL THEN 0 ELSE eh.paydatecode_id END AS pdc_id, 
                eh.paydate
            FROM companies_emplhour AS eh
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            WHERE c.company_id = %(compid)s 
            AND (eh.paydate IS NOT NULL) 
            AND (eh.rosterdate IS NOT NULL) AND (eh.rosterdate >= CAST(%(df)s AS DATE)) AND (eh.rosterdate <= CAST(%(dl)s AS DATE))
            ORDER BY eh.paydate ASC
            """
        newcursor = connection.cursor()
        newcursor.execute(sql_paydates_inuse, {
            'compid': request.user.company_id,
            'df': period_datefirst,
            'dl': period_datelast
        })
        rows = newcursor.fetchall()

# - add start date of each paydateitem to row
        for row in rows:
            pdc_id = row[0]
            datelast_dte = row[1]
            paydates_row = [pdc_id, datelast_dte]
            paydatecode = m.Paydatecode.objects.get_or_none(id=pdc_id, company=request.user.company)
            if paydatecode:
                firstdate_of_period, new_paydate_dteNIU = plv.recalc_paydate(datelast_dte, paydatecode)
                if firstdate_of_period:
                    paydates_row.append(firstdate_of_period)
            paydateitems_inuse_list.append(paydates_row)
    return paydateitems_inuse_list


def create_payroll_abscat_list(sel_paydatecode_pk, sel_paydate_iso, request):
    #logger.debug(' ============= create_payroll_abscat_list ============= ')
    # sql return list of all absence orders in use in this payroll period
    paydatecode_pk = sel_paydatecode_pk
    paydate_iso = sel_paydate_iso
    # paydatecode_pk = 0 is used in sql, don't change it to None

    sql_abscat_orders = """
        SELECT DISTINCT o.id AS o_id, o.code AS o_code, o.sequence AS o_seq, LOWER(o.code) AS o_code_lc
        FROM companies_emplhour AS eh
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        WHERE c.company_id = %(compid)s 
        AND ( (eh.paydatecode_id = %(pdcid)s) OR (eh.paydatecode_id IS NULL AND %(pdcid)s = 0 ))
        AND (eh.paydate = CAST(%(pdte)s AS DATE) OR %(pdte)s IS NULL)
        AND o.isabsence AND NOT oh.isrestshift
        ORDER BY LOWER(o.code)
        """
    newcursor = connection.cursor()
    newcursor.execute(sql_abscat_orders, {
        'compid': request.user.company_id,
        'pdcid': paydatecode_pk,
        'pdte': paydate_iso
    })
    payroll_abscat_list = newcursor.fetchall()
    return payroll_abscat_list
# --- end of create_payroll_abscat_list-


def create_payroll_list_groupedby_rosterdate_NIU(table_dict, sel_paydatecode_pk, sel_paydate_iso, request):
    #logger.debug(' ============= create_payroll_list_groupedby_rosterdate ============= ')
    # create crosstab list of employees with absence hours PR2020-06-12

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    payroll_list = []
    payroll_per_period_list = []

    if request.user.company:
        paydatecode_pk = table_dict.get('paydatecode_pk')
        if paydatecode_pk is None:
            paydatecode_pk = sel_paydatecode_pk
            paydate_iso = sel_paydate_iso
        else:
            paydate_iso = table_dict.get('paydate_iso')
        # change paydatecode_pk = 0 to None, otherwise no records will be retrieved
        paydatecode_pk = paydatecode_pk if paydatecode_pk else None

        sql_absence = """
            SELECT eh.rosterdate AS eh_rd, eh.employee_id AS e_id, e.code AS e_code, o.id AS o_id, 
            SUM(eh.timeduration) AS eh_td, 
            0 AS eh_pd,
            eh.paydatecode_id AS eh_pdcid,
            eh.paydate AS eh_pdte,
            pdc.code AS pdc_code

            FROM companies_emplhour AS eh
            INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id) 

            WHERE c.company_id = %(compid)s 

            GROUP BY eh.rosterdate, eh.employee_id, e.code, o.id, eh.paydatecode_id, eh.paydate, pdc.code
            """
#             AND (eh.paydatecode_id = %(pdcid)s)
        #             AND (eh.paydate = CAST(%(pdte)s AS DATE)  OR %(pdte)s IS NULL)
        #             AND o.isabsence AND NOT oh.isrestshift
        #             AND NOT eh.timeduration = 0

        sql_noabsence = """
            SELECT eh.rosterdate AS eh_rd, eh.employee_id AS e_id, e.code AS e_code, 0 AS o_id, 
            SUM(eh.timeduration) AS eh_td, 
            SUM(eh.plannedduration) AS eh_pd,
            eh.paydatecode_id AS eh_pdcid,
            eh.paydate AS eh_pdte,
            pdc.code AS pdc_code

            FROM companies_emplhour AS eh
            INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id) 

            WHERE c.company_id = %(compid)s 

            GROUP BY eh.rosterdate, eh.employee_id, e.code, eh.paydatecode_id, eh.paydate, pdc.code
            """
        #             AND (eh.paydatecode_id = %(pdcid)s)
        #             AND (eh.paydate = CAST(%(pdte)s AS DATE)  OR %(pdte)s IS NULL)
        #             AND NOT o.isabsence AND NOT oh.isrestshift
        #             AND NOT eh.timeduration = 0
        sql_union = sql_absence + ' UNION ' + sql_noabsence + ' ORDER BY 2'
        # PR2020-06-13 debug: SUM(sub.eh_pd) returned string, CAST added to cast to number
        # payroll_list = [ 0: employee_pk, 1: employee_code, 2: rosterdate_iso, 3: planned_duration, 4: dict { order_id: timeduration, ...}
        sql_json = """ SELECT sub.e_id, sub.e_code, sub.eh_rd, CAST(SUM(sub.eh_pd) AS INT), 
                        json_object_agg(sub.o_id, sub.eh_td), 
                        sub.eh_pdcid, sub.eh_pdte, sub.pdc_code

                    FROM (""" + sql_union + """) AS sub 
                    GROUP BY eh_rd, sub.e_id, sub.e_code, sub.eh_pdcid, sub.eh_pdte, sub.pdc_code
                    ORDER BY 2,3 """

        newcursor = connection.cursor()
        newcursor.execute(sql_json, {
            'compid': request.user.company_id,
            'pdcid': paydatecode_pk,
            'pdte': paydate_iso
        })
        payroll_list = newcursor.fetchall()

    return payroll_list
# - end of create_payroll_list_groupedby_rosterdate


def create_payroll_period_detail_list(sel_paydatecode_pk, sel_paydate_iso, request):
    #logger.debug(' ============= create_payroll_period_detail_list ============= ')
    # create crosstab list of employees with absence hours PR2020-06-12

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    payroll_list_detail = []
    if request.user.company:
        paydatecode_pk = sel_paydatecode_pk
        paydate_iso = sel_paydate_iso
        # paydatecode_pk = 0 is used in sql, don't change it to None

        #logger.debug('paydatecode_pk: ' + str(paydatecode_pk) + ' ' + str(type(paydatecode_pk)))
        #logger.debug('paydate_iso: ' + str(paydate_iso) + ' ' + str(type(paydate_iso)))
        sql_detail = """
            SELECT eh.id, eh.rosterdate, eh.employee_id, e.code, 
            CASE WHEN o.isabsence THEN o.id ELSE 0 END,
            CONCAT(c.code,' - ',o.code), 
            CASE WHEN o.isabsence THEN 0 ELSE eh.plannedduration END, 
            eh.timeduration

            FROM companies_emplhour AS eh
            INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

            WHERE c.company_id = %(compid)s 
            AND NOT oh.isrestshift
            AND ( (eh.paydatecode_id = %(pdcid)s) OR (eh.paydatecode_id IS NULL AND %(pdcid)s = 0 ))
            AND (eh.paydate = CAST(%(pdte)s AS DATE)  OR %(pdte)s IS NULL)
 
            ORDER BY e.code, eh.rosterdate, o.code
            """

        newcursor = connection.cursor()
        newcursor.execute(sql_detail, {
            'compid': request.user.company_id,
            'pdcid': paydatecode_pk,
            'pdte': paydate_iso
        })
        payroll_list_detail = newcursor.fetchall()

    return payroll_list_detail
# - end of create_payroll_period_detail_list

def create_payroll_period_agg_list(sel_paydatecode_pk, sel_paydate_iso, request):
    #logger.debug(' ============= create_payroll_period_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of 1 paydateitem, grouped by employee PR2020-06-24

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    create_payroll_period_agg_list = []
    if request.user.company:
        paydatecode_pk = sel_paydatecode_pk
        paydate_iso = sel_paydate_iso
        # paydatecode_pk = 0 is used in sql, don't change it to None

        #logger.debug('paydatecode_pk:  ' + str(paydatecode_pk))
        #logger.debug('paydate_iso:  ' + str(paydate_iso))
        sql_absence = """
            SELECT eh.employee_id AS e_id, e.code AS e_code, o.id AS o_id, 
            SUM(eh.timeduration) AS eh_td, 
            0 AS eh_pd,
            CASE WHEN eh.paydatecode_id IS NULL THEN 0 ELSE eh.paydatecode_id END AS eh_pdcid,
            eh.paydate AS eh_pdte

            FROM companies_emplhour AS eh
            INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            
            WHERE c.company_id = %(compid)s   
            AND o.isabsence AND NOT oh.isrestshift

            AND ( (eh.paydatecode_id = %(pdcid)s) OR (eh.paydatecode_id IS NULL AND %(pdcid)s = 0 ))
            AND (eh.paydate = CAST(%(pdte)s AS DATE) OR %(pdte)s IS NULL)
                
            GROUP BY eh.paydatecode_id, eh.paydate, eh.employee_id, e.code, o.id
            """
#             AND NOT eh.timeduration = 0
        sql_noabsence = """
            SELECT eh.employee_id AS e_id, e.code AS e_code, 0 AS o_id, 
            SUM(eh.timeduration) AS eh_td, 
            SUM(eh.plannedduration) AS eh_pd,
            CASE WHEN eh.paydatecode_id IS NULL THEN 0 ELSE eh.paydatecode_id END AS eh_pdcid,
            eh.paydate AS eh_pdte
            
            FROM companies_emplhour AS eh
            INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            
            WHERE c.company_id = %(compid)s 
            AND NOT o.isabsence AND NOT oh.isrestshift

            AND ( (eh.paydatecode_id = %(pdcid)s) OR (eh.paydatecode_id IS NULL AND %(pdcid)s = 0 ))
            AND (eh.paydate = CAST(%(pdte)s AS DATE) OR %(pdte)s IS NULL)
            
            GROUP BY eh.paydatecode_id, eh.paydate, eh.employee_id, e.code
            """
        #             AND NOT eh.timeduration = 0
        sql_union = sql_absence + ' UNION ' + sql_noabsence + ' ORDER BY 2'
        # PR2020-06-13 debug: SUM(sub.eh_pd) returned string, CAST added to cast to number
        # payroll_list = [ 0: employee_pk, 1: employee_code, 2: planned_duration, 3: dict { order_id: timeduration, ...}

        #SELECT sub.e_id, sub.e_code, sub.eh_rd, CAST(SUM(sub.eh_pd) AS INT),
              #          json_object_agg(sub.o_id, sub.eh_td),
               #         sub.eh_pdcid, sub.eh_pdte, sub.pdc_code

        sql_json = """ SELECT sub.eh_pdcid, sub.eh_pdte, sub.e_id, sub.e_code, CAST(SUM(sub.eh_pd) AS INT), 
                        json_object_agg(sub.o_id, sub.eh_td)
                        FROM (""" + sql_union + """) AS sub 
                        GROUP BY sub.e_id, sub.e_code, sub.eh_pdcid, sub.eh_pdte
                        ORDER BY sub.e_code """
        newcursor = connection.cursor()
        newcursor.execute(sql_json, {
            'compid': request.user.company_id,
            'pdcid': paydatecode_pk,
            'pdte': paydate_iso
        })
        create_payroll_period_agg_list = newcursor.fetchall()

    return create_payroll_period_agg_list
# - end of create_payroll_period_agg_list


def create_paydatecode_list(period_dict, datalists, request):
    #logger.debug(' --- create_paydatecode_list --- ')
    #logger.debug('is_absence: ' + str(is_absence) + ' is_template: ' + str(is_template) + ' inactive: ' + str(inactive))

# --- create list of payrollperiods of this company PR2029-06-17
    paydate_list = []
    paydateitem_list = []
    if request.user.company:
        company_pk = request.user.company_id

        period_datefirst = period_dict.get('period_datefirst')
        period_datelast = period_dict.get('period_datelast')
        # Note: both datefirst_agg and datelast_agg are ordered by datelast, to keep sequece in both lists the same
        sql_paydateitem_sub = """
            SELECT 
                pdi.paydatecode_id, 
                ARRAY_AGG( TO_CHAR(pdi.datefirst, 'YYYY-MM-DD') ORDER BY pdi.datelast) AS datefirst_agg,
                ARRAY_AGG( TO_CHAR(pdi.datelast, 'YYYY-MM-DD') ORDER BY pdi.datelast) AS datelast_agg
            FROM companies_paydateitem AS pdi
            WHERE ( (pdi.datelast >= CAST(%(df)s AS DATE) ) OR ( CAST(%(df)s AS DATE) IS NULL) )
            AND ( (pdi.datelast <= CAST(%(dl)s AS DATE) ) OR ( CAST(%(dl)s AS DATE) IS NULL) )
            GROUP BY pdi.paydatecode_id
            """

        sql_paydatecode = """
            SELECT pdc.id, pdc.company_id AS comp_id, pdc.code, pdc.recurrence, pdc.dayofmonth, pdc.referencedate, 
            pdc.datefirst, pdc.datelast, pdc.isdefault, pdc.afascode, pdc.inactive,
            pdi.datefirst_agg, pdi.datelast_agg
            FROM companies_paydatecode AS pdc
            LEFT JOIN (""" + sql_paydateitem_sub + """) AS pdi ON (pdi.paydatecode_id = pdc.id)
            WHERE pdc.company_id = %(compid)s 
            ORDER BY LOWER(pdc.code) ASC
            """
        newcursor = connection.cursor()
        newcursor.execute(sql_paydatecode, {
            'compid': company_pk,
            'df': period_datefirst,
            'dl': period_datelast
        })
        paydatecodes = f.dictfetchall(newcursor)

        paydatecode_list = []
        for paydatecode in paydatecodes:
            #logger.debug('paydatecode: ' + str(paydatecode))
            item_dict = create_paydatecode_dict_sql(paydatecode)
            if item_dict:
                paydatecode_list.append(item_dict)
        if paydatecode_list:
            datalists['paydatecode_list'] = paydatecode_list

        sql_paydateitem = """
            SELECT pdi.id AS pdi_id, pdc.id AS pdc_id, 
            pdi.datefirst, pdi.datelast, pdi.year, pdi.period
            FROM companies_paydateitem AS pdi
            INNER JOIN companies_paydatecode AS pdc ON (pdc.id = pdi.paydatecode_id)
            WHERE ( pdc.company_id = %(compid)s ) 
            AND ( (pdi.datelast >= CAST(%(df)s AS DATE) ) OR ( CAST(%(df)s AS DATE) IS NULL) )
            AND ( (pdi.datelast <= CAST(%(dl)s AS DATE) ) OR ( CAST(%(dl)s AS DATE) IS NULL) )
            ORDER BY pdi.datelast
            """
        newcursor.execute(sql_paydateitem, {
            'compid': company_pk,
            'df': period_datefirst,
            'dl': period_datelast
        })
        paydateitems = f.dictfetchall(newcursor)
        paydateitem_list = []
        for paydateitem in paydateitems:
            item_dict = create_paydateitem_dict_sql(paydateitem)
            if item_dict:
                paydateitem_list.append(item_dict)
        if paydateitem_list:
            datalists['paydateitem_list'] = paydateitem_list
# --- end of create_paydatecode_list

def create_paydatecode_dict_sql(paydate):
    # --- create dict of this paydate PR2020-06-17
    item_dict = {}
    if paydate:
        # FIELDS_PAYDATECODE = ('id', 'company',  'code', 'recurrence', 'weekday', 'date', 'paydate', 'isdefault', 'inactive')
        for field in c.FIELDS_PAYDATECODE:
            field_dict = {}
            if field == 'id':
                field_dict['pk'] = paydate.get('id')
                field_dict['ppk'] = paydate.get('comp_id')
                field_dict['table'] = 'paydatecode'

            elif field in ('code', 'afascode', 'recurrence', 'dayofmonth', 'referencedate',
                            'datefirst', 'datelast', 'datefirst_agg', 'datelast_agg', 'isdefault', 'inactive'):
                value = paydate.get(field)
                if value:
                    field_dict['value'] = value
            if field_dict:
                item_dict[field] = field_dict
    return item_dict


def create_paydatecode_dict(instance, item_dict):
    # --- create dict of this paydate PR2020-06-17
    if instance:
        for field in c.FIELDS_PAYDATECODE:
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}
            if field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.company.pk
                field_dict['table'] = 'paydatecode'

            elif field in ('code', 'recurrence', 'dayofmonth', 'referencedate',
                            'datefirst', 'datelast', 'afascode', 'isdefault', 'inactive'):
                value = getattr(instance, field)
                if value:
                    field_dict['value'] = value
            if field_dict:
                item_dict[field] = field_dict
    f.remove_empty_attr_from_dict(item_dict)
# end of create_paydatecode_dict


def create_paydateitem_dict_sql(paydateitem):
    #logger.debug(' --- create_paydateitem_dict_sql --- ')
    # --- create dict of this paydate PR2020-06-17
    item_dict = {}
    if paydateitem:
        for field in c.FIELDS_PAYDATEITEM:
            field_dict = {}
            if field == 'id':
                field_dict['pk'] = paydateitem.get('pdi_id')
                field_dict['ppk'] = paydateitem.get('pdc_id')
                field_dict['table'] = 'paydateitem'

            elif field in ('datefirst', 'datelast', 'year', 'period'):
                value = paydateitem.get(field)
                if value:
                    field_dict['value'] = value
            if field_dict:
                item_dict[field] = field_dict
    return item_dict

