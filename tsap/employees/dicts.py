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
logger = logging.getLogger(__name__)

def create_employee_list(company, user_lang, inactive=None, datefirst_iso=None, datelast_iso=None):
    # --- create list of all active employees of this company PR2019-06-16
    #logger.debug(' --- create_employee_list   ')
    # PR2020-05-11 with Django model it took 10 seconds - with sql it takes ??? to be tested

    #logger.debug(' =============== create_employee_list ============= ')

    sql_employee = """ SELECT e.id, e.company_id, e.code, e.datefirst, e.datelast,
        e.namelast, e.namefirst, e.email, e.telephone, e.address, e.zipcode, e.city, e.country,
        e.identifier, e.payrollcode, e.workhoursperweek, e.leavedays, e.workminutesperday,
        fc.id AS fc_id, fc.code AS fc_code, wc.id AS wc_id, wc.code AS wc_code, pdc.id AS pdc_id, pdc.code AS pdc_code, 
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

        workhoursperweek = instance.get('workhoursperweek', 0)  # workhours per week * 60, unit is minute
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

            elif field == 'workhoursperweek':
                if workhoursperweek:
                    field_dict['value'] = workhoursperweek
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

        if workhoursperweek and workdays:
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

        workhoursperweek = getattr(instance, 'workhoursperweek', 0)  # workhours per week * 60, unit is minute
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

            elif field == 'workhoursperweek':
                if workhoursperweek:
                    field_dict['value'] = workhoursperweek
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

        if workhoursperweek and workdays:
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

    customer_pk = None
    order_pk = None
    teammember_pk = filter_dict.get('teammember_pk')
    if teammember_pk is None:
        order_pk = filter_dict.get('order_pk')
        if order_pk is None:
            customer_pk = filter_dict.get('customer_pk')

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

        o.nopay AS o_nopay,
        o.nohoursonsaturday AS o_nosat,
        o.nohoursonsunday AS o_nosun,
        o.nohoursonpublicholiday AS o_noph,
        
        s.nopay AS s_nopay,
        s.nohoursonsaturday AS s_nosat,
        s.nohoursonsunday AS s_nosun,
        s.nohoursonpublicholiday AS s_noph,
        
        e.inactive AS e_inactive,
        e.workminutesperday AS e_workminutesperday,
        r.inactive AS r_inactive,
        r.workhoursperweek AS r_workhoursperweek,

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
        AND ( tm.id = CAST(%(tm_id)s AS INTEGER) OR %(tm_id)s IS NULL )
        AND ( e.id IS NOT NULL OR %(empl_allownull)s )
        ORDER BY LOWER(e.code) ASC 
        """
        #AND ( e.datelast >= CAST(%(rdl)s AS DATE) OR e.datelast IS NULL OR %(rdl)s IS NULL )

    newcursor = connection.cursor()
    newcursor.execute(sql_teammmember, {
        'compid': company.id,
        'cust_id': customer_pk,
        'ord_id': order_pk,
        'tm_id': teammember_pk,
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

                field_dict['nopay'] = tm.get('s_nopay')
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

                field_dict['nopay'] = tm.get('o_nopay')
                field_dict['nohoursonsaturday'] = tm.get('o_nosat')
                field_dict['nohoursonsunday'] = tm.get('o_nosun')
                field_dict['nohoursonpublicholiday'] = tm.get('o_noph')

            elif field == 'shift':
                # only when is_absence, and there is only 1 shift (should always be the case
                si_id_arr = tm.get('si_id_arr')
                if is_absence and si_id_arr and len(si_id_arr) == 1:
                    field_dict = {'offsetstart': {'value': tm.get('sh_os_arr')[0]},
                                  'offsetend': {'value': tm.get('sh_oe_arr')[0]},
                                  'breakduration': {'value': tm.get('sh_bd_arr')[0]},
                                  'timeduration': {'value': tm.get('sh_td_arr')[0]}}
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
                    field_dict['workhoursperweek'] = tm.get('r_workhoursperweek')
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


def create_teammember_dict_from_model(teammember, update_dict):
    # --- create dict of this teammember PR2019-07-26
    # update_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    #logger.debug ('--- create_teammember_dict_from_model ---')


    # PR2019-12-20 Note: 'scheme' and 'order' are not model fields, but necessary for absence update
    # FIELDS_TEAMMEMBER = ('id', 'team', 'employee', 'replacement', 'datefirst', 'datelast',
    #                      'scheme', 'order',
    #                      'cat', 'isabsence', 'issingleshift', 'istemplate',
    #                      'wagefactorcode', 'pricecode', 'additioncode', 'override')

    if teammember:
        is_singleshift = teammember.issingleshift
        is_absence = teammember.isabsence

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
# --- get field_dict from  update_dict if it exists
            field_dict = update_dict[field] if field in update_dict else {}

            if field == 'id':
                field_dict['pk'] = teammember.pk
                field_dict['ppk'] = teammember.team.pk
                field_dict['table'] = 'teammember'
                field_dict['isabsence'] = is_absence

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
                # field_dict shift {'offsetstart': {'updated': True}, 'timeduration': {'updated': True}}

                id_dict = field_dict['id'] if 'id' in field_dict else {}
                code_dict = field_dict['code'] if 'code' in field_dict else {}
                offsetstart_dict = field_dict['offsetstart']  if 'offsetstart' in field_dict else {}
                offsetend_dict = field_dict['offsetend']  if 'offsetend' in field_dict else {}
                breakduration_dict = field_dict['breakduration']  if 'breakduration' in field_dict else {}
                timeduration_dict = field_dict['timeduration']  if 'timeduration' in field_dict else {}

                # get shift, only if is_absence, cycle = 1 , get first oe
                if scheme and scheme.cycle == 1:
                    shift = m.Shift.objects.filter(scheme=scheme).first()
                    if shift:
                        id_dict = field_dict['id'] if 'id' in field_dict else {}
                        id_dict['pk'] = shift.pk
                        id_dict['ppk'] = shift.scheme.pk
                        code_dict['value'] = shift.code
                        offsetstart_dict['value'] = shift.offsetstart
                        offsetend_dict['value'] = shift.offsetend
                        breakduration_dict['value'] = shift.breakduration
                        timeduration_dict['value'] = shift.timeduration
                field_dict = {'id': id_dict, 'code': code_dict,
                              'offsetstart': offsetstart_dict, 'offsetend': offsetend_dict,
                              'breakduration': breakduration_dict, 'timeduration': timeduration_dict, }

            elif field == 'employee':
                employee = teammember.employee
                if employee:
                    field_dict['pk'] = employee.pk
                    field_dict['ppk'] = employee.company_id
                    field_dict['code'] = employee.code
                    field_dict['inactive'] = employee.inactive
                    field_dict['workhoursperweek'] = employee.workhoursperweek
                    field_dict['datefirst'] = employee.datefirst
                    field_dict['datelast'] = employee.datelast

            elif field == 'replacement':
                replacement = teammember.replacement
                if replacement:
                    field_dict['pk'] = replacement.pk
                    field_dict['ppk'] = replacement.company_id
                    field_dict['code'] = replacement.code
                    field_dict['inactive'] = replacement.inactive
                    field_dict['workhoursperweek'] = replacement.workhoursperweek
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

            update_dict[field] = field_dict

# 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(update_dict)
    return update_dict
# === end of create_teammember_dict_from_model


def create_absence_list(filter_dict, request):
    logger.debug(' ----- create_absence_list  -----  ')
    logger.debug('filter_dict: ' + str(filter_dict) )
    # create list of all absence teammembers PR2020-06-30

    company_pk = request.user.company_id

    period_datefirst = filter_dict.get('period_datefirst')
    period_datelast = filter_dict.get('period_datelast')

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

        COALESCE(t.code, '') AS t_code,
        COALESCE(s.code, '') AS s_code,
        COALESCE(o.code, '') AS o_code,
        COALESCE(c.code, '') AS c_code,
        COALESCE(e.code, '') AS e_code,

        o.nopay AS o_nopay,
        o.nohoursonsaturday AS o_nosat,
        o.nohoursonsunday AS o_nosun,
        o.nohoursonpublicholiday AS o_noph,
        
        s.cycle AS s_cycle,
        s.nopay AS s_nopay,
        s.nohoursonsaturday AS s_nosat,
        s.nohoursonsunday AS s_nosun,
        s.nohoursonpublicholiday AS s_noph,

        e.inactive AS e_inactive,
        e.workminutesperday AS e_workminutesperday,

        tm.datefirst AS tm_df, tm.datelast AS tm_dl, 
        s.datefirst AS s_df, s.datelast AS s_dl, 
        o.datefirst AS o_df, o.datelast AS o_dl, 
        e.datefirst AS e_df, e.datelast AS e_dl, 

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
        INNER JOIN companies_employee AS e ON (e.id = tm.employee_id) 

        LEFT JOIN (""" + sql_schemeitem_shift + """) AS si_sh_sub ON (si_sh_sub.t_id = t.id)    

        WHERE c.company_id = CAST(%(compid)s AS INTEGER)
        AND (o.isabsence)
        AND (s.datelast >= CAST(%(df)s AS DATE) OR %(df)s IS NULL)
        AND (s.datefirst <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL)
        ORDER BY LOWER(e.code), tm.datefirst 
        """
    newcursor = connection.cursor()
    newcursor.execute(sql_teammmember, {
        'compid': company_pk,
        'df': period_datefirst,
        'dl': period_datelast
    })
    teammembers = f.dictfetchall(newcursor)

    absence_list = []
    for teammember in teammembers:
        item_dict = {}
        create_absence_dict_from_sql(teammember, item_dict)
        if item_dict:
            absence_list.append(item_dict)

    return absence_list


def create_absence_dict_from_sql(tm, item_dict):
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
        fields = ('id', 'team','scheme', 'order', 'employee', 'cycle', 'datefirst', 'datelast',
                'offsetstart', 'offsetend', 'breakduration', 'timeduration',
                'nopay', 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday')
        # only when is_absence, and there is only 1 shift (should always be the case
        si_id_arr = tm.get('si_id_arr')
        arr_key = {'cycle': 's_cycle', 'datefirst': 's_df', 'datelast': 's_dl',
                   'offsetstart': 'sh_os_arr', 'offsetend': 'sh_oe_arr', 'breakduration': 'sh_bd_arr', 'timeduration': 'sh_td_arr',
                   'nopay': 'o_nopay',  'nohoursonsaturday': 'o_nosat', 'nohoursonsunday': 'o_nosun', 'nohoursonpublicholiday': 's_noph'}
        for field in fields:
# --- get field_dict from  item_dict if it exists
        # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
            field_dict = item_dict[field] if field in item_dict else {}
            if field == 'id':
                field_dict['pk'] = tm.get('tm_id')
                field_dict['ppk'] = tm.get('t_id')
                field_dict['table'] = 'teammember'
                field_dict['isabsence'] = True
            elif field == 'team':
                field_dict['pk'] = tm.get('t_id')
                field_dict['ppk'] = tm.get('s_id')
                field_dict['code'] = tm.get('t_code')
            elif field == 'scheme':
                field_dict['pk'] = tm.get('s_id')
                field_dict['ppk'] = tm.get('o_id')
                field_dict['code'] = tm.get('s_code')
            elif field == 'order':
                field_dict['pk'] = tm.get('o_id')
                field_dict['ppk'] = tm.get('c_id')
                field_dict['code'] = tm.get('o_code')
            elif field in ('cycle', 'datefirst', 'datelast'):
                field_dict['value'] = tm.get(arr_key[field])
            elif field in ('nopay', 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday'):
                field_dict['value'] = tm.get(arr_key[field], False)
            elif field in ('offsetstart', 'offsetend', 'breakduration', 'timeduration'):
                if si_id_arr and len(si_id_arr) == 1:
                    field_dict['value'] = tm.get(arr_key[field])[0]
            elif field == 'employee':
                field_dict['pk'] = tm.get('e_id')
                field_dict['code'] = tm.get('e_code')
                field_dict['workminutesperday'] = tm.get('e_workminutesperday')
                field_dict['datefirst'] = tm.get('e_df')
                field_dict['datelast'] = tm.get('e_dl')

            item_dict[field] = field_dict
# 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(item_dict)
    return item_dict
# === end of create_teammember_dict_from_sql




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

##################
def create_payroll_abscat_list(payroll_period, request):
    logger.debug(' +++++++++++ create_payroll_abscat_list +++++++++++ ')
    payrollperiod_agg_list = []
    if request.user.company:
        paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
        paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))
        if paydatecode_pk and paydate_iso:
            payrollperiod_agg_list = create_payroll_abscat_paydatecode_list(
                paydatecode_pk=paydatecode_pk,
                paydate_iso=paydate_iso,
                request=request)
        else:
            payrollperiod_agg_list = create_payroll_abscat_period_list(
                period_datefirst=f.get_dict_value(payroll_period, ('period_datefirst',)),
                period_datelast=f.get_dict_value(payroll_period, ('period_datelast',)),
                request=request)

    return payrollperiod_agg_list

def create_payroll_abscat_paydatecode_list(paydatecode_pk, paydate_iso, request):
    #logger.debug(' ============= create_payroll_abscat_list ============= ')
    # sql return list of all absence orders in use in this payroll period

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
# --- end of create_payroll_abscat_paydatecode_list-

def create_payroll_abscat_period_list(period_datefirst, period_datelast, request):
    #logger.debug(' ============= create_payroll_abscat_list ============= ')
    # sql return list of all absence orders in use in this payroll period

    # paydatecode_pk = 0 is used in sql, don't change it to None
    sql_abscat_orders = """
        SELECT DISTINCT o.id AS o_id, o.code AS o_code, o.sequence AS o_seq, LOWER(o.code) AS o_code_lc
        FROM companies_emplhour AS eh
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        WHERE c.company_id = %(compid)s 
        AND o.isabsence AND NOT oh.isrestshift
        AND (eh.rosterdate >= CAST(%(df)s AS DATE) OR %(df)s IS NULL )
        AND (eh.rosterdate <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL )
        ORDER BY LOWER(o.code)
        """
    newcursor = connection.cursor()
    newcursor.execute(sql_abscat_orders, {
        'compid': request.user.company_id,
        'df': period_datefirst,
        'dl': period_datelast
    })
    payroll_abscat_list = newcursor.fetchall()
    return payroll_abscat_list
# --- end of create_payroll_abscat_paydatecode_list-

####################

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

def create_payroll_detail_list(payroll_period, request):
    logger.debug(' +++++++++++ create_payroll_detail_list +++++++++++ ')
    payrollperiod_detail_list = []
    if request.user.company:
        paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
        paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))
        if paydatecode_pk and paydate_iso:
            payrollperiod_detail_list = create_payroll_paydate_detail_list(
                paydatecode_pk=paydatecode_pk,
                paydate_iso=paydate_iso,
                request=request)
        else:
            payrollperiod_detail_list = create_payroll_payrollperiod_detail_list(
                period_datefirst=f.get_dict_value(payroll_period, ('period_datefirst',)),
                period_datelast=f.get_dict_value(payroll_period, ('period_datelast',)),
                request=request)
    return payrollperiod_detail_list
# --- end of create_payroll_detail_list


def create_payroll_paydate_detail_list(paydatecode_pk, paydate_iso, request):
    #logger.debug(' ============= create_payroll_paydate_detail_list ============= ')
    # create crosstab list of employees with absence hours PR2020-06-12

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

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
# - end of create_payroll_paydate_detail_list


def create_payroll_payrollperiod_detail_list(period_datefirst, period_datelast, request):
    # logger.debug(' ============= create_payroll_payrollperiod_detail_list ============= ')
    # create crosstab list of employees with absence hours PR2020-06-12

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    sql_detail = """
        SELECT eh.id, eh.rosterdate, eh.employee_id, e.code, 
        CASE WHEN o.isabsence THEN o.id ELSE 0 END,
        CONCAT(c.code,' - ',o.code), 
        CASE WHEN o.isabsence THEN 0 ELSE eh.plannedduration END, 
        eh.timeduration,
        fc.code AS eh_functioncode,
        wf.code AS eh_wagefactor,
        pdc.code AS eh_paydatecode

        FROM companies_emplhour AS eh
        INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        LEFT JOIN companies_wagecode AS fc ON (fc.id = eh.functioncode_id) 
        LEFT JOIN companies_wagecode AS wf ON (wf.id = eh.wagefactorcode_id) 
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT oh.isrestshift
        AND (eh.rosterdate >= CAST(%(df)s AS DATE) OR %(df)s IS NULL )
        AND (eh.rosterdate <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL )

        ORDER BY e.code, eh.rosterdate, o.code
        """

    newcursor = connection.cursor()
    newcursor.execute(sql_detail, {
        'compid': request.user.company_id,
        'df': period_datefirst,
        'dl': period_datelast
    })
    payroll_list_detail = newcursor.fetchall()

    return payroll_list_detail

# - end of create_payroll_payrollperiod_detail_list


def create_paydate_agg_list(payroll_period, request):
    logger.debug(' ============= create_paydate_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of 1 paydateitem, grouped by employee PR2020-07-15

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    paydate_agg_list = []
    if request.user.company:
        # paydatecode_pk = None is used in sql, don't change it to 0
        paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
        paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))

        logger.debug('paydatecode_pk:  ' + str(paydatecode_pk))
        logger.debug('paydate_iso:  ' + str(paydate_iso))
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

            AND ( (eh.paydatecode_id = %(pdcid)s) OR (eh.paydatecode_id IS NULL AND %(pdcid)s IS NULL ))
            AND (eh.paydate = CAST(%(pdte)s AS DATE) OR %(pdte)s IS NULL)

            GROUP BY eh.paydatecode_id, eh.paydate, eh.employee_id, e.code
            """
        #             AND NOT eh.timeduration = 0
        sql_union = sql_absence + ' UNION ' + sql_noabsence + ' ORDER BY 2'
        # PR2020-06-13 debug: SUM(sub.eh_pd) returned string, CAST added to cast to number
        # payroll_list = [ 0: employee_pk, 1: employee_code, 2: planned_duration, 3: dict { order_id: timeduration, ...}

        # SELECT sub.e_id, sub.e_code, sub.eh_rd, CAST(SUM(sub.eh_pd) AS INT),
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
        paydate_agg_list = newcursor.fetchall()

    return paydate_agg_list
# - end of create_paydate_agg_list

def create_payroll_agg_list(payroll_period, request):
    logger.debug(' +++++++++++ create_payroll_agg_list +++++++++++ ')
    payrollperiod_agg_list = []
    if request.user.company:
        paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
        paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))

        logger.debug('paydatecode_pk:  ' + str(paydatecode_pk))
        logger.debug('paydate_iso:  ' + str(paydate_iso))

        if paydatecode_pk and paydate_iso:
            payrollperiod_agg_list = create_payroll_paydatecode_agg_list(paydatecode_pk, paydate_iso, request)
        else:
            period_datefirst = f.get_dict_value(payroll_period, ('period_datefirst',))
            period_datelast = f.get_dict_value(payroll_period, ('period_datelast',))
            logger.debug('period_datefirst:  ' + str(period_datefirst))
            logger.debug('period_datelast:  ' + str(period_datelast))
            payrollperiod_agg_list = create_payroll_payrollperiod_agg_list(period_datefirst, period_datelast, request)

    return payrollperiod_agg_list

def create_payroll_paydatecode_agg_list(paydatecode_pk, paydate_iso, request):
    logger.debug(' ============= create_payroll_paydatecode_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of 1 paydateitem, grouped by employee PR2020-07-15

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    sql_absence_paydate = """
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
    sql_noabsence_paydate = """
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

    # PR2020-06-13 debug: SUM(sub.eh_pd) returned string, CAST added to cast to number
    # payroll_list = [ 0: employee_pk, 1: employee_code, 2: planned_duration, 3: dict { order_id: timeduration, ...}
    newcursor = connection.cursor()

    sql_json = """ SELECT sub.eh_pdcid, sub.eh_pdte, sub.e_id, sub.e_code, CAST(SUM(sub.eh_pd) AS INT), 
                    json_object_agg(sub.o_id, sub.eh_td)
                    FROM (""" + sql_absence_paydate + ' UNION ' + sql_noabsence_paydate + """ ORDER BY 2) AS sub 
                    GROUP BY sub.e_id, sub.e_code, sub.eh_pdcid, sub.eh_pdte
                    ORDER BY sub.e_code """
    newcursor.execute(sql_json, {
        'compid': request.user.company_id,
        'pdcid': paydatecode_pk,
        'pdte': paydate_iso
    })

    payrollperiod_agg_list = newcursor.fetchall()
    return payrollperiod_agg_list
# - end of create_payroll_paydatecode_agg_list


def create_payroll_payrollperiod_agg_list(period_datefirst, period_datelast, request):
    logger.debug(' ============= create_payroll_payrollperiod_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of selected period, grouped by employee PR2020-07-15

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    sql_absence_period = """
        SELECT eh.employee_id AS e_id, e.code AS e_code, o.id AS o_id, 
        SUM(eh.timeduration) AS eh_td, 
        0 AS eh_pd

        FROM companies_emplhour AS eh
        INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

        WHERE c.company_id = %(compid)s   
        AND o.isabsence AND NOT oh.isrestshift
        AND (eh.rosterdate >= CAST(%(df)s AS DATE) OR %(df)s IS NULL )
        AND (eh.rosterdate <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL )

        GROUP BY eh.employee_id, e.code, o.id
        """

    sql_noabsence_period = """
        SELECT eh.employee_id AS e_id, e.code AS e_code, 0 AS o_id, 
        SUM(eh.timeduration) AS eh_td, 
        SUM(eh.plannedduration) AS eh_pd

        FROM companies_emplhour AS eh
        INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT o.isabsence AND NOT oh.isrestshift
        AND (eh.rosterdate >= CAST(%(df)s AS DATE) OR %(df)s IS NULL )
        AND (eh.rosterdate <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL )

        GROUP BY eh.employee_id, e.code
        """
    #             AND NOT eh.timeduration = 0

    # PR2020-06-13 debug: SUM(sub.eh_pd) returned string, CAST added to cast to number
    # payroll_list = [ 0: employee_pk, 1: employee_code, 2: planned_duration, 3: dict { order_id: timeduration, ...}

    newcursor = connection.cursor()
    logger.debug('period_datefirst and period_datelast: ')
    sql_json = """ SELECT NULL AS eh_pdcid, NULL AS eh_pdte, sub.e_id, sub.e_code, CAST(SUM(sub.eh_pd) AS INT), 
                    json_object_agg(sub.o_id, sub.eh_td)
                    FROM (""" + sql_absence_period + ' UNION ' + sql_noabsence_period + """ ORDER BY 2) AS sub 
                    GROUP BY sub.e_id, sub.e_code
                    ORDER BY sub.e_code """
    newcursor.execute(sql_json, {
        'compid': request.user.company_id,
        'df': period_datefirst,
        'dl': period_datelast
    })

    payrollperiod_agg_list = newcursor.fetchall()
    logger.debug('payrollperiod_agg_list: ' + str(payrollperiod_agg_list))

    return payrollperiod_agg_list
# - end of create_payroll_payrollperiod_agg_list


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
        # to prevent errors when there pdi.datelast occurs multiple times: order by , sort when createing table in JS
        sql_paydateitem_sub = """
            SELECT 
                pdi.paydatecode_id, 
                ARRAY_AGG( TO_CHAR(pdi.datefirst, 'YYYY-MM-DD') ORDER BY pdi.id) AS datefirst_agg,
                ARRAY_AGG( TO_CHAR(pdi.datelast, 'YYYY-MM-DD') ORDER BY pdi.id) AS datelast_agg
            FROM companies_paydateitem AS pdi
            WHERE ( (pdi.datelast >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
            AND ( (pdi.datelast <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )
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
            AND ( (pdi.datelast >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
            AND ( (pdi.datelast <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )
            ORDER BY pdi.datelast
            """
        # was             AND ( (pdi.datelast >= CAST(%(df)s AS DATE) ) OR ( CAST(%(df)s AS DATE) IS NULL) )
        #             AND ( (pdi.datelast <= CAST(%(dl)s AS DATE) ) OR ( CAST(%(dl)s AS DATE) IS NULL) )
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

# ------------------------------------------------------

def create_wagecode_list(period_dict, datalists, request):
    logger.debug(' --- create_wagecode_list --- ')

# --- create list of wagecodes of this company PR2029-06-17
    if request.user.company:
        company_pk = request.user.company_id

        period_datefirst = period_dict.get('period_datefirst')
        period_datelast = period_dict.get('period_datelast')

        # Note: both datefirst_agg and wagerate_agg are ordered by wci.id, to keep sequece in both lists the same
        # to prevent errors when there wci.datelast occurs multiple times: order by wci.id, sort when createing table in JS
        sql_wagecodeitem_sub = """
            SELECT 
                wci.wagecode_id, 
                ARRAY_AGG( TO_CHAR(wci.datefirst, 'YYYY-MM-DD') ORDER BY wci.id) AS datefirst_agg,
                ARRAY_AGG( TO_CHAR(wci.wagerate, 'YYYY-MM-DD') ORDER BY wci.id) AS wagerate_agg
            FROM companies_wagecodeitem AS wci
            WHERE ( (wci.datefirst >= CAST(%(df)s AS DATE) ) OR ( %(df)s IS NULL) )
            AND ( (wci.datefirst <= CAST(%(dl)s AS DATE) ) OR ( %(dl)s IS NULL) )
            GROUP BY wci.wagecode_id
            """
        sql_wagecode = """
            SELECT wc.id, wc.company_id AS comp_id, wc.code, wci.datefirst_agg, wci.wagerate_agg
            FROM companies_wagecode AS wc
            LEFT JOIN (""" + sql_wagecodeitem_sub + """) AS wci ON (wci.wagecode_id = wc.id)
            WHERE wc.company_id = %(compid)s AND wc.iswagecode
            ORDER BY LOWER(wc.code) ASC
            """
        newcursor = connection.cursor()
        newcursor.execute(sql_wagecode, {
            'compid': company_pk,
            'df': period_datefirst,
            'dl': period_datelast
        })
        wagecodes = f.dictfetchall(newcursor)

        wagecode_list = []
        for wagecode in wagecodes:
            logger.debug('wagecode: ' + str(wagecode))
            item_dict = create_wagecode_dict_sql(wagecode)
            if item_dict:
                wagecode_list.append(item_dict)
        if wagecode_list:
            datalists['wagecode_list'] = wagecode_list

# --- end of create_wagecode_list
def create_wagecode_dict_sql(wagecode):
    # --- create dict of this wagecode PR2020-07-13
    item_dict = {}
    if wagecode:
        # FIELDS_WAGECODE = ('id', 'company', 'code', 'datefirst', 'datefirst_agg', 'wagerate_agg') # to be added:  'inactive')
        for field in c.FIELDS_WAGECODE:
            field_dict = {}
            if field == 'id':
                field_dict['pk'] = wagecode.get('id')
                field_dict['ppk'] = wagecode.get('comp_id')
                field_dict['table'] = 'wagecode'

            elif field in ('code',  'datefirst', 'datefirst_agg', 'wagerate_agg'): # to be added:  'inactive')
                value = wagecode.get(field)
                if value:
                    field_dict['value'] = value
            if field_dict:
                item_dict[field] = field_dict
    return item_dict


def create_wagefactor_list(request_item, datalists, request):
    #logger.debug(' --- create_wagefactor_list --- ')

# --- create list of wagefactors of this company PR2029-06-17
    if request.user.company:
        company_pk = request.user.company_id

        sql_wagecode = """
            SELECT wc.id, wc.company_id AS comp_id, wc.code, wc.wagerate
            FROM companies_wagecode AS wc
            WHERE wc.company_id = %(compid)s AND wc.iswagefactor
            ORDER BY LOWER(wc.code) ASC
            """
        newcursor = connection.cursor()
        newcursor.execute(sql_wagecode, {
            'compid': company_pk
        })
        wagefactors = f.dictfetchall(newcursor)

        wagefactor_list = []
        for wagefactor in wagefactors:
            item_dict = create_wagefactor_dict_sql(wagefactor)
            if item_dict:
                wagefactor_list.append(item_dict)
        if wagefactor_list:
            datalists['wagefactor_list'] = wagefactor_list
# --- end of create_wagefactor_list


def create_wagefactor_dict_sql(wagefactor):
    # --- create dict of this wagefactor PR2020-07-13
    item_dict = {}
    if wagefactor:
        item_dict = {'id': {'pk': wagefactor.get('id'),
                             'ppk': wagefactor.get('comp_id'),
                             'table': 'wagefactor'},
                     'code': {'value': wagefactor.get('code')},
                     'wagerate': {'value': wagefactor.get('wagerate')}
                    }
    return item_dict


def create_wagefactor_dict(instance, item_dict):
    # --- create dict of this wagefactor PR2020-07-14
    if instance:
        for field in ('id', 'code', 'wagerate', 'inactive'):
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}
            if field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.company.pk
                field_dict['table'] = 'wagefactor'

            elif field in ('code', 'wagerate', 'inactive'):
                value = getattr(instance, field)
                if value:
                    field_dict['value'] = value
            if field_dict:
                item_dict[field] = field_dict
# end of create_wagefactor_dict



def create_functioncode_list(request_item, datalists, request):
    logger.debug(' --- create_functioncode_list --- ')

# --- create list of functioncodes of this company PR2029-06-17
    if request.user.company:
        company_pk = request.user.company_id

        sql_wagecode = """
            SELECT wc.id, wc.company_id AS comp_id, wc.code
            FROM companies_wagecode AS wc
            WHERE wc.company_id = %(compid)s 
            AND wc.isfunctioncode
            ORDER BY LOWER(wc.code) ASC
            """
        newcursor = connection.cursor()
        newcursor.execute(sql_wagecode, {
            'compid': company_pk
        })
        functioncodes = f.dictfetchall(newcursor)

        functioncode_list = []
        for functioncode in functioncodes:
            item_dict = create_functioncode_dict_sql(functioncode)
            if item_dict:
                functioncode_list.append(item_dict)
        if functioncode_list:
            datalists['functioncode_list'] = functioncode_list
# --- end of create_wagefactor_list


def create_functioncode_dict_sql(functioncode):
    # --- create dict of this functioncode PR2020-07-13
    item_dict = {}
    if functioncode:
        item_dict = {'id': {'pk': functioncode.get('id'),
                             'ppk': functioncode.get('comp_id'),
                             'table': 'functioncode'},
                     'code': {'value': functioncode.get('code')}
                    }
    return item_dict
