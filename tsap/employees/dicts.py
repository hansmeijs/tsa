from django.db import connection
from django.db.models import Q

from datetime import timedelta

from django.utils.translation import ugettext_lazy as _

from tsap import functions as f
from tsap import constants as c
from companies import models as m
from planning import views as plv
from planning import rosterfill as plrf

import logging
logger = logging.getLogger(__name__)


def create_employee_rows(request_item, msg_dict, request):
    # --- create rows of all employees of this company PR2019-06-16 PR2020-09-09
    #     add messages to employee_row
    #logger.debug(' =============== create_employee_rows ============= ')

    employee_pk = request_item.get('employee_pk')
    datefirst_iso = request_item.get('datefirst')
    datelast_iso = request_item.get('datelast')
    is_inactive = request_item.get('isinactive')

    sql_keys = {'compid': request.user.company.pk}

    sql_list = []
    sql_list.append(""" SELECT e.id, e.company_id AS comp_id, e.code, e.datefirst, e.datelast,
        e.namelast, e.namefirst, e.email, e.telephone, e.address, e.zipcode, e.city, e.country,
        e.identifier, e.payrollcode, e.workhoursperweek, e.leavedays, e.workminutesperday,
        fnc.id AS fnc_id, fnc.code AS fnc_code, wgc.id AS wgc_id, wgc.code AS wgc_code, pdc.id AS pdc_id, pdc.code AS pdc_code, 
        e.locked, e.inactive, 
        CONCAT('employee_', e.id::TEXT) AS mapid

        FROM companies_employee AS e 
        LEFT JOIN companies_wagecode AS wgc ON (wgc.id = e.wagecode_id) 
        LEFT JOIN companies_wagecode AS fnc ON (fnc.id = e.functioncode_id) 
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id) 

        WHERE (e.company_id = %(compid)s::INT)
        """)

    if employee_pk:
        # when employee_pk has value: skip other filters
        sql_list.append(' AND (e.id = %(eid)s::INT)')
        sql_keys['eid'] = employee_pk
    else:
        if datefirst_iso:
            sql_list.append(' AND (e.datelast >= CAST(%(rdf)s AS DATE) OR e.datelast IS NULL)')
            sql_keys['rdl'] = datelast_iso
        if datelast_iso:
            sql_list.append('AND (e.datefirst <= CAST(%(rdl)s AS DATE) OR e.datefirst IS NULL)')
            sql_keys['rdl'] = datelast_iso
        if is_inactive is not None:
            sql_list.append('AND (e.inactive = CAST(%(inactive)s AS BOOLEAN))')
            sql_keys['inactive'] = is_inactive
        sql_list.append('ORDER BY LOWER(e.code)')

    sql_employee = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql_employee, sql_keys)
    employee_rows = f.dictfetchall(newcursor)

# - add messages to employee_row
    if employee_pk and employee_rows:
        # when teammember_pk has value there is only 1 row
        row = employee_rows[0]
        if row:
            for key, value in msg_dict.items():
                row[key] = value
    return employee_rows
# --- end of create_employee_rows


def create_employee_list(company, user_lang, is_inactive=None, datefirst_iso=None, datelast_iso=None, employee_pk=None):
    # --- create list of all active employees of this company PR2019-06-16
    #logger.debug(' --- create_employee_list   ')
    # PR2020-05-11 with Django model it took 10 seconds - with sql it takes ??? to be tested

    #logger.debug(' =============== create_employee_list ============= ')

    sql_filter = {'compid': company.pk}
    sql_list = [""" SELECT e.id, e.company_id AS comp_id, e.code, e.datefirst, e.datelast,
        e.namelast, e.namefirst, e.email, e.telephone, e.address, e.zipcode, e.city, e.country,
        e.identifier, e.payrollcode, e.workhoursperweek, e.leavedays, e.workminutesperday,
        fnc.id AS fnc_id, fnc.code AS fnc_code, wgc.id AS wgc_id, wgc.code AS wgc_code, pdc.id AS pdc_id, pdc.code AS pdc_code, 
        e.locked, e.inactive, 
        CONCAT('employee_', e.id::TEXT) AS mapid
        
        FROM companies_employee AS e 
        LEFT JOIN companies_wagecode AS wgc ON (wgc.id = e.wagecode_id) 
        LEFT JOIN companies_wagecode AS fnc ON (fnc.id = e.functioncode_id) 
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id) 
 
        WHERE (e.company_id = %(compid)s::INT)
        """]
    if employee_pk:
        # when employee_pk has value: skip other filters
        sql_list.append(' AND (e.id = %(eid)s::INT)')
        sql_filter['eid'] = employee_pk
    else:
        if datefirst_iso:
            sql_list.append(' AND (e.datelast >= CAST(%(rdf)s AS DATE) OR e.datelast IS NULL)')
            sql_filter['rdl'] = datelast_iso
        if datelast_iso:
            sql_list.append('AND (e.datefirst <= CAST(%(rdl)s AS DATE) OR e.datefirst IS NULL)')
            sql_filter['rdl'] = datelast_iso
        if is_inactive is not None:
            sql_list.append('AND (e.inactive = CAST(%(inactive)s AS BOOLEAN))')
            sql_filter['inactive'] = is_inactive
    sql_list.append('ORDER BY LOWER(e.code)')
    sql_employee = ' '.join(sql_list)
    newcursor = connection.cursor()
    newcursor.execute(sql_employee, sql_filter)
    employee_rows = f.dictfetchall(newcursor)

    employee_list = []
    for row in employee_rows:
        item_dict = {}
        create_employee_dict_from_sql(row, item_dict, user_lang)
        if item_dict:
            employee_list.append(item_dict)
    return employee_list, employee_rows


def create_employee_dict_from_sql(instance,  item_dict, user_lang):
    # --- create dict of this employee from dictfetchall PR2020-06-18

    if instance:
# ---  get min max date
        datefirst = instance.get('datefirst')
        datelast = instance.get('datelast')

        workhoursperweek = instance.get('workhoursperweek', 0)  # workhours per week * 60, unit is minute
        #workdays = instance.get('workdays', 0) # workdays per week * 1440, unit is minute (one day has 1440 minutes)
        workminutesperday = instance.get('workminutesperday', 0)

        for field in c.FIELDS_EMPLOYEE:
# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                field_dict['pk'] = instance.get('id')
                field_dict['ppk'] = instance.get('comp_id')
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
            elif field == 'workminutesperday':
                if workminutesperday:
                    field_dict['value'] = workminutesperday

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

# 7. remove empty attributes from item_update
    f.remove_empty_attr_from_dict(item_dict)
    return create_employee_dict_from_sql
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


def create_absence_rows(filter_dict, teammember_pk, msg_dict, request):
    #logger.debug(' ----- create_absence_rows  -----  ')
    #logger.debug('filter_dict: ' + str(filter_dict) )
    # create list of all absence teammembers and teammemebers with shift  PR2020-06-30 PR2020-08-28

    is_template = False # not in use yet
    period_datefirst = filter_dict.get('period_datefirst')
    period_datelast = filter_dict.get('period_datelast')

    sql_keys = {'compid': request.user.company_id}

    sql_list = []

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

    sql_list.append(""" SELECT tm.id, t.id AS t_id, s.id AS s_id, o.id AS o_id, c.id AS c_id,
        CONCAT('absence_', tm.id::TEXT) AS mapid,
        c.company_id AS comp_id,
        e.id AS e_id,
        
        COALESCE(t.code, '') AS t_code,
        COALESCE(s.code, '') AS s_code,
        COALESCE(REPLACE (o.code, '~', ''),'') AS o_code, 
        COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, 
        COALESCE(e.code, '') AS e_code,

        c.istemplate AS c_istemplate,
        c.isabsence AS c_isabsence,
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
        rpl.id AS rpl_id,
        rpl.code AS rpl_code,
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
        LEFT JOIN companies_employee AS rpl ON (rpl.id = tm.replacement_id) 
        LEFT JOIN (""" + sql_schemeitem_shift + """) AS si_sh_sub ON (si_sh_sub.t_id = t.id)    

        WHERE (c.company_id = %(compid)s::INT) 
        AND (c.isabsence)""")

    if teammember_pk:
        sql_list.append('AND tm.id = CAST(%(tm_id)s AS INTEGER)')
        sql_keys['tm_id'] = teammember_pk
    else:
        sql_list.append("""
            AND (s.datelast >= CAST(%(df)s AS DATE) OR %(df)s IS NULL)
            AND (s.datefirst <= CAST(%(dl)s AS DATE) OR %(dl)s IS NULL)
            ORDER BY LOWER(e.code), tm.datefirst NULLS LAST, s.datefirst NULLS LAST
            """)
        sql_keys['df'] = period_datefirst
        sql_keys['dl'] = period_datelast

    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    absence_rows = f.dictfetchall(newcursor)
    if teammember_pk and absence_rows:
        # when teammember_pk has value there is only 1 row
        row = absence_rows[0]
        if row:
            for key, value in msg_dict.items():
                row[key] = value
    return absence_rows


def create_employee_pricerate_list(company, user_lang):
    #logger.debug(' --- create_employee_pricerate_list --- ')

    pricerate_list = []

    # TODO remove SHIFT_CAT_0512_ABSENCE
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
    #logger.debug(' ----------- create_paydatecodes_inuse_list ----------- ')
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

# - fill paydatecode_rows, it contains list of all paydatecodes en paydates in this selection
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


def create_employees_inuse_list(period_dict, request):
    #logger.debug(' ----------- create_employees_inuse_list ----------- ')
    # create list of employees that are in table emplhour, filtered by period datefirst / datelast PR2020-08-15

    #logger.debug('period_dict: ' + str(period_dict))
    period_datefirst = f.get_dict_value(period_dict, ('period_datefirst',))
    period_datelast = f.get_dict_value(period_dict, ('period_datelast',))

    #logger.debug('period_datefirst: ' + str(period_datefirst))
    #logger.debug('period_datelast: ' + str(period_datelast))

    company_pk = request.user.company.pk
    sql_keys = {'compid': company_pk}

    sql_list = []
    sql_list.append("""
        SELECT eh.employee_id AS id, e.code

        FROM companies_emplhour AS eh
        INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT oh.isrestshift
        """)
    if period_datefirst:
        sql_list.append('AND eh.rosterdate >= CAST(%(rdf)s AS DATE)')
        sql_keys['rdf'] = period_datefirst
    if period_datelast:
        sql_list.append(' AND eh.rosterdate <= CAST(%(rdl)s AS DATE)')
        sql_keys['rdl'] = period_datelast

    sql_list.append('GROUP BY eh.employee_id, e.code ORDER BY LOWER(e.code)')
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    employees_inuse_list = f.dictfetchall(newcursor)
    #logger.debug('employees_inuse_list: ' + str(employees_inuse_list))

    return employees_inuse_list
# ---  end of create_employees_inuse_list

def create_customers_inuse_list(period_dict, request):
    #logger.debug(' ----------- create_customers_inuse_list ----------- ')
    # create list of employees that are in table emplhour, filtered by period datefirst / datelast PR2020-08-15

    period_datefirst = f.get_dict_value(period_dict, ('period_datefirst',))
    period_datelast = f.get_dict_value(period_dict, ('period_datelast',))

    company_pk = request.user.company.pk

    sql_keys = {'compid': company_pk}

    sql_list = []
    sql_list.append("""
        SELECT c.id AS id, oh.customercode

        FROM companies_emplhour AS eh
        INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT c.isabsence AND NOT oh.isrestshift
        """)
    if period_datefirst:
        sql_list.append('AND eh.rosterdate >= CAST(%(df)s AS DATE)')
        sql_keys['df'] = period_datefirst
    if period_datelast:
        sql_list.append(' AND eh.rosterdate <= CAST(%(dl)s AS DATE)')
        sql_keys['dl'] = period_datelast

    sql_list.append('GROUP BY c.id, oh.customercode ORDER BY LOWER(oh.customercode)')
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    return f.dictfetchall(newcursor)
# ---  end of create_customers_inuse_list


def create_orders_inuse_list(period_dict, request):
    #logger.debug(' ----------- create_orders_inuse_list ----------- ')
    # create list of orders that are in table orderhour, filtered by period datefirst / datelast PR2020-08-15

    period_datefirst = f.get_dict_value(period_dict, ('period_datefirst',))
    period_datelast = f.get_dict_value(period_dict, ('period_datelast',))

    company_pk = request.user.company.pk

    sql_keys = {'compid': company_pk}

    sql_list = []
    sql_list.append("""
            SELECT o.id AS id, c.id AS customer_id, oh.ordercode

            FROM companies_emplhour AS eh
            INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

            WHERE c.company_id = %(compid)s 
            AND NOT c.isabsence AND NOT oh.isrestshift
            """)
    if period_datefirst:
        sql_list.append('AND eh.rosterdate >= CAST(%(df)s AS DATE)')
        sql_keys['df'] = period_datefirst
    if period_datelast:
        sql_list.append(' AND eh.rosterdate <= CAST(%(dl)s AS DATE)')
        sql_keys['dl'] = period_datelast

    sql_list.append('GROUP BY o.id, c.id, oh.ordercode ORDER BY LOWER(oh.ordercode)')
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    return f.dictfetchall(newcursor)
# ---  end of create_orders_inuse_list

##################
def create_payroll_abscat_list(payroll_period, request):
    #logger.debug(' +++++++++++ create_payroll_abscat_list +++++++++++ ')
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

####################===============@@@@@@@@@@@@@@@@@@@@@@@
def create_payroll_detail_listNEW(payroll_period, comp_timezone, timeformat, user_lang, request):
    #logger.debug(' +++++++++++ create_payroll_detail_list +++++++++++ ')
    #logger.debug('payroll_period: ' + str(payroll_period))
    payrollperiod_detail_list = []
    if request.user.company:
        paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
        paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))
        period_datefirst = None
        period_datelast = None
        if paydatecode_pk and paydate_iso:
            pass
            # when paydatecode_pk and paydate_iso have value:
            # set startdate and enddate of payroll period as period_datefirst / period_datelast
        else:
            period_datefirst = f.get_dict_value(payroll_period, ('period_datefirst',))
            period_datelast = f.get_dict_value(payroll_period, ('period_datelast',))

# - get list of rosterdates that are in emplhour in selected period
        # if paydatecode_pk and paydate_iso have values: these will be used, use period_datefirst / last otherwise
        rosterdate_rows = get_rosterdates_of_emplhour_period(
            period_datefirst,
            period_datelast,
            paydatecode_pk,
            paydate_iso,
            request)

###############################
# +++++ loop through dates of selected period
        datefirst_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datefirst)
        datelast_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datelast)

        rosterdate_dte = datefirst_dte
        while rosterdate_dte <= datelast_dte:
            rosterdate_iso = rosterdate_dte.isoformat()
            if rosterdate_dte in rosterdate_rows:
# - when emplhour records of this rosterdate exist: add them to payrollperiod_detail_list
                detail_listONEDAY = create_payrollperiod_detail_listONDEDAY(
                    rosterdate=rosterdate_iso,
                    request=request)
                if detail_listONEDAY:
                    payrollperiod_detail_list.extend(detail_listONEDAY)
            else:
# - if not: add planning day of this rosterdate
                dict_listNIU, short_list, logfileNIU = plrf.create_employee_planning(
                    datefirst_iso=rosterdate_iso,
                    datelast_iso=rosterdate_iso,
                    customer_pk=None,
                    order_pk=None,
                    employee_pk=None,
                    add_shifts_without_employee=True,
                    skip_absence_and_restshifts=False,
                    orderby_rosterdate_customer=False,
                    comp_timezone=comp_timezone,
                    timeformat=timeformat,
                    user_lang=user_lang,
                    request=request)

                # - add rows to all_rows
                payrollperiod_detail_list.extend(short_list)
            # - add one day to rosterdate
            rosterdate_dte = rosterdate_dte + timedelta(days=1)
    # +++++ end of loop
        #################################


    return payrollperiod_detail_list
# --- end of create_payroll_detail_list

####################===============@@@@@@@@@@@@@@@@@@@@@@@

def create_payroll_detail_list(payroll_period, request):
    #logger.debug(' +++++++++++ create_payroll_detail_list +++++++++++ ')
    payrollperiod_detail_list = []
    if request.user.company:
        paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
        paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))
        if paydatecode_pk and paydate_iso:
            payrollperiod_detail_list = create_paydate_detail_list(
                paydatecode_pk=paydatecode_pk,
                paydate_iso=paydate_iso,
                request=request)
        else:
            period_datefirst = f.get_dict_value(payroll_period, ('period_datefirst',))
            period_datelast = f.get_dict_value(payroll_period, ('period_datelast',))
            payrollperiod_detail_list = create_payrollperiod_detail_list(
                period_datefirst=period_datefirst,
                period_datelast=period_datelast,
                request=request)
    # - get list of rosterdates that are in payrollperiod_detail_list
            # TODO add planning to payrollperiod_detail_list

            rosterdate_rows = get_rosterdates_of_emplhour_period(period_datefirst, period_datelast, request)
            #logger.debug('rosterdate_rows: ' + str(rosterdate_rows))

            ###############################
            # +++++ loop through dates that are not in payrollperiod_detail_list and add planning

            datefirst_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datefirst)
            datelast_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datelast)

            rosterdate_dte = datefirst_dte
            while rosterdate_dte <= datelast_dte:
                if rosterdate_dte not in rosterdate_rows:
                    # - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
                    is_saturday, is_sunday, is_publicholiday, is_companyholiday = f.get_issat_issun_isph_isch_from_rosterdate(
                        rosterdate_dte, request)
                    # - create list with all teammembers of this_rosterdate
                    # this functions retrieves a list of tuples with data from the database
                    rows = plrf.get_employee_calendar_rows(rosterdate_dte,
                                                    is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                                                    None, None, None, request.user.company.pk)

                    # - add rows to all_rows
                    payrollperiod_detail_list.extend(rows)
                # - add one day to rosterdate
                rosterdate_dte = rosterdate_dte + timedelta(days=1)
        # +++++ end of loop
            #################################


    return payrollperiod_detail_list
# --- end of create_payroll_detail_list

def get_rosterdates_of_emplhour_period(period_datefirst, period_datelast, paydatecode_pk, paydate_iso,request):
    #logger.debug(' ============= get_rosterdates_of_emplhour_period ============= ')
    # create list of rosterdates that are in selected period PR2020-09-07
    # if paydatecode_pk and paydate_iso: filter on paydatecode_pk and paydate_iso
    # else : filter on period_datefirst and/or period_datelast
    sql_keys = {'compid': request.user.company_id}
    sql_list = ["""SELECT eh.rosterdate
            FROM companies_emplhour AS eh
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
            INNER JOIN companies_order AS o ON (o.id = oh.order_id)
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            WHERE c.company_id = %(compid)s"""]
    if paydatecode_pk and paydate_iso:
        sql_list.append("""AND eh.paydatecode_id = CAST(%(pdc_id)s AS INTEGER)
                           AND eh.paydate = CAST(%(paydate)s AS DATE)""")
        sql_keys['pdc_id'] = paydatecode_pk
        sql_keys['paydate'] = paydate_iso
    else:
        if period_datefirst:
            sql_list.append('AND eh.rosterdate >= CAST(%(df)s AS DATE)')
            sql_keys['df'] = period_datefirst
        if period_datelast:
            sql_list.append('AND eh.rosterdate <= CAST(%(dl)s AS DATE)')
            sql_keys['dl'] = period_datelast
    sql_list.append('GROUP BY eh.rosterdate')
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    rosterdate_rows = newcursor.fetchall()
    rosterdate_list = []
    for row in rosterdate_rows:
        rosterdate_list.append(row[0])

    return rosterdate_list
# - end of get_rosterdates_of_emplhour_period


def create_payrollperiod_detail_listONDEDAY(rosterdate, request):
    #logger.debug(' ============= create_payrollperiod_detail_listONDEDAY ============= ')
    # create crosstab list of employees with absence hours PR2020-06-12

    #logger.debug('rosterdate' + str(rosterdate))
    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    sql_detail = """
        SELECT eh.id AS emplhour_id, 
        eh.rosterdate, 
        eh.employee_id AS e_id, 
        e.code AS e_code, 
        e.identifier AS e_identifier, 
        e.payrollcode AS e_payrollcode, 
        
        oh.id AS oh_id,
        o.id AS order_id,
        
        o.code AS o_code,
        o.identifier AS o_identifier,
        c.code AS c_code,
        CONCAT(c.code, ' - ', o.code) AS c_o_code,

        eh.offsetstart,
        eh.offsetend,

        eh.exceldate,
        eh.excelstart,
        eh.excelend, 
                      
        c.isabsence,
        CASE WHEN c.isabsence THEN 0 ELSE eh.plannedduration END AS plandur, 
        CASE WHEN NOT c.isabsence THEN eh.timeduration ELSE 0 END AS timedur,
        CASE WHEN c.isabsence THEN eh.timeduration ELSE 0 END AS absdur, 
        eh.timeduration AS totaldur, 

        eh.functioncode_id AS fnc_id,
        fnc.code AS functioncode,
        
        eh.wagefactorcode_id AS wfc_id,
        wfc.code AS wagefactorcode,
        eh.wagefactor, 
        
        eh.wagecode_id AS wgc_id,
        eh.wagerate,
        eh.wage, 
        eh.paydate,
        pdc.id AS pdc_id,
        pdc.code AS paydatecode,
        eh.wagecode_id AS wgc_id
        
        FROM companies_emplhour AS eh
        LEFT JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        LEFT JOIN companies_wagecode AS fnc ON (fnc.id = eh.functioncode_id) 
        LEFT JOIN companies_wagecode AS wfc ON (wfc.id = eh.wagefactorcode_id) 
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id) 

        WHERE c.company_id = %(compid)s 
        AND NOT oh.isrestshift
        AND (eh.rosterdate = CAST(%(rd)s AS DATE) )

        ORDER BY e.code, o.code
        """

    newcursor = connection.cursor()
    newcursor.execute(sql_detail, {
        'compid': request.user.company_id,
        'rd': rosterdate
    })
    payroll_list_detail = f.dictfetchall(newcursor)
    return payroll_list_detail


# - end of create_payrollperiod_detail_listONDEDAY

def create_payrollperiod_detail_list(period_datefirst, period_datelast, request):
    #logger.debug(' ============= create_payrollperiod_detail_list ============= ')
    # create crosstab list of employees with absence hours PR2020-06-12

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    sql_detail = """
        SELECT eh.id AS emplhour_id, eh.rosterdate, eh.employee_id, e.code AS employee_code, 
        CASE WHEN o.isabsence THEN o.id ELSE 0 END AS order_id,
        CONCAT(REPLACE (c.code, '~', ''), ' - ', REPLACE (o.code, '~', '')) AS c_o_code,
        
        eh.offsetstart,
        eh.offsetend,
         
        eh.exceldate,
        eh.excelstart,
        eh.excelend,               
        
        CASE WHEN c.isabsence THEN 0 ELSE eh.plannedduration END AS plandur, 
        CASE WHEN NOT c.isabsence THEN eh.timeduration ELSE 0 END AS timedur,
        CASE WHEN c.isabsence THEN eh.timeduration ELSE 0 END AS absdur, 
        eh.timeduration AS totaldur, 
        
        fc.code AS functioncode,
        wf.code AS wagefactor,
        pdc.code AS paydatecode

        FROM companies_emplhour AS eh
        LEFT JOIN companies_employee AS e ON (e.id = eh.employee_id)
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
    payroll_list_detail = f.dictfetchall(newcursor)
    return payroll_list_detail
# - end of create_payrollperiod_detail_list


def create_paydate_detail_list(paydatecode_pk, paydate_iso, request):
    #logger.debug(' ============= create_paydate_detail_list ============= ')
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
        LEFT JOIN companies_employee AS e ON (e.id = eh.employee_id)
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
# - end of create_paydate_detail_list

def create_paydate_agg_list(payroll_period, request):
    #logger.debug(' ============= create_paydate_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of 1 paydateitem, grouped by employee PR2020-07-15

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    paydate_agg_list = []
    if request.user.company:
        # paydatecode_pk = None is used in sql, don't change it to 0
        paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
        paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))

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


def create_paydatecode_agg_listNIU(payroll_period, request):
    #logger.debug(' ============= create_paydatecode_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of 1 paydateitem, grouped by employee PR2020-07-15

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905
    paydatecode_pk = f.get_dict_value(payroll_period, ('paydatecode_pk',))
    paydate_iso = f.get_dict_value(payroll_period, ('paydate_iso',))

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
# - end of create_paydatecode_agg_list


def create_payroll_agg_listXXX(period_dict, request):
    #logger.debug(' ============= create_payrollperiod_agg_list ============= ')
    # create crosstab list of worked- and absence hours, of selected period, grouped by employee PR2020-07-15 PR2020-08-14

    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    period_datefirst = f.get_dict_value(period_dict, ('period_datefirst',))
    period_datelast = f.get_dict_value(period_dict, ('period_datelast',))

    paydatecode_pk = f.get_dict_value(period_dict, ('paydatecode_pk',))
    paydate_iso = f.get_dict_value(period_dict, ('paydate_iso',))

    company_pk = request.user.company.pk

    customer_pk = None
    order_pk = period_dict.get('order_pk')
    # only get customer_pk when order_pk = None
    if order_pk is None:
        customer_pk = period_dict.get('customer_pk')

    employee_pk = period_dict.get('employee_pk')
    # is_absence can be False, True or None
    is_absence =  period_dict.get('isabsence')

    sql_keys = {'comp_id': company_pk}

    sql_list = []
    sql_list.append("""
        SELECT eh.employee_id AS e_id, e.code AS e_code, 
        SUM(eh.timeduration) AS eh_td, 
        SUM(eh.plannedduration) AS eh_pd,
        json_object_agg(o.id, o.isabsence) AS isabsence_agg,
        json_object_agg(o.id, eh.timeduration) AS eh_timedur_agg,
        STRING_AGG(DISTINCT wc.code, '; ') AS wc_code,
        STRING_AGG(DISTINCT fc.code, '; ') AS fc_code,
        STRING_AGG(DISTINCT pdc.code, '; ') AS pdc_code

        FROM companies_emplhour AS eh
        INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)
        INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        
        LEFT JOIN companies_wagecode AS wc ON (wc.id = eh.wagecode_id) 
        LEFT JOIN companies_wagecode AS fc ON (fc.id = eh.functioncode_id) 
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id) 

        WHERE c.company_id = %(comp_id)s 
        AND NOT oh.isrestshift
        """)
    #             AND NOT eh.timeduration = 0

    # PR2020-06-13 debug: SUM(sub.eh_pd) returned string, CAST added to cast to number
    # payroll_list = [ 0: employee_pk, 1: employee_code, 2: planned_duration, 3: dict { order_id: timeduration, ...}

    if period_datefirst:
        sql_list.append('AND eh.rosterdate >= CAST(%(df)s AS DATE)')
        sql_keys['df'] = period_datefirst
    if period_datelast:
        sql_list.append(' AND eh.rosterdate <= CAST(%(dl)s AS DATE)')
        sql_keys['dl'] = period_datelast
    if paydatecode_pk is not None:
        if paydatecode_pk == 0:
            sql_list.append('AND (eh.paydatecode_id IS NULL)')
        else:
            sql_list.append('AND (eh.paydatecode_id = %(pdcid)s)')
            sql_keys['pdcid'] = paydatecode_pk
        if paydate_iso:
            sql_list.append('AND eh.paydate = CAST(%(pdte)s AS DATE)')
            sql_keys['pdte'] = paydate_iso
    if order_pk:
        sql_list.append('AND o.id = %(ord_id)s')
        sql_keys['ord_id'] = order_pk
    elif customer_pk:
        sql_list.append('AND c.id = %(cust_id)s')
        sql_keys['cust_id'] = customer_pk
    if employee_pk:
        sql_list.append('AND eh.employee_id = %(e_id)s')
        sql_keys['e_id'] = employee_pk
    if is_absence is not None:
        if is_absence:
            sql_list.append('AND c.isabsence')
        else:
            sql_list.append('AND NOT c.isabsence')
    if paydatecode_pk is None:
        sql_list.append('GROUP BY eh.employee_id, e.code, eh.paydatecode_id, eh.paydate ORDER BY LOWER(e.code)')
    else:
        sql_list.append('GROUP BY eh.employee_id, e.code ORDER BY LOWER(e.code)')
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    return f.dictfetchall(newcursor)
# - end of create_payrollperiod_agg_list


def create_paydatecode_rows(period_dict, request):
    #logger.debug(' --- create_paydatecode_rows --- ')
    #logger.debug('is_absence: ' + str(is_absence) + ' is_template: ' + str(is_template) + ' inactive: ' + str(inactive))

    paydatecode_rows = []
    paydateitem_rows = []

# --- create list of payrollperiods of this company PR2029-06-17
    if request.user.company:
        company_pk = request.user.company_id

        period_datefirst = period_dict.get('period_datefirst')
        period_datelast = period_dict.get('period_datelast')
        # Note: both datefirst_agg and datelast_agg are ordered by datelast, to keep sequece in both lists the same
        # to prevent errors when there pdi.datelast occurs multiple times: order by , sort when createing table in JS

        sql_keys = {'compid': company_pk}
        sql_sub_list = []
        sql_sub_list.append("""SELECT pdi.paydatecode_id, 
                ARRAY_AGG( TO_CHAR(pdi.datefirst, 'YYYY-MM-DD') ORDER BY pdi.id) AS datefirst_agg,
                ARRAY_AGG( TO_CHAR(pdi.datelast, 'YYYY-MM-DD') ORDER BY pdi.id) AS datelast_agg
            FROM companies_paydateitem AS pdi""")
        if period_datefirst or period_datelast:
            sql_sub_list.append('WHERE')
        if period_datefirst:
            sql_sub_list.append('pdi.datelast >= CAST(%(df)s AS DATE)')
            sql_keys['df'] = period_datefirst
        if period_datefirst and period_datelast:
            sql_sub_list.append('AND')
        if period_datelast:
            sql_sub_list.append('pdi.datelast <= CAST(%(dl)s AS DATE)')
            sql_keys['dl'] = period_datelast
        sql_sub_list.append('GROUP BY pdi.paydatecode_id')
        sql_sub = ' '.join(sql_sub_list)

        sql = """SELECT pdc.id, pdc.company_id AS comp_id, 
            CONCAT('paydatecode_', pdc.id::TEXT) AS mapid,
            pdc.code, pdc.recurrence, pdc.dayofmonth, pdc.referencedate, 
            pdc.datefirst, pdc.datelast, pdc.isdefault, pdc.afascode, pdc.inactive,
            pdi.datefirst_agg, pdi.datelast_agg
            FROM companies_paydatecode AS pdc
            LEFT JOIN (""" + sql_sub + """) AS pdi ON (pdi.paydatecode_id = pdc.id)
            WHERE pdc.company_id = %(compid)s 
            ORDER BY LOWER(pdc.code) ASC
            """
        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        paydatecode_rows = f.dictfetchall(newcursor)

        sql_paydateitem_keys = {'compid': company_pk}
        sql_paydateitem_list = []
        sql_paydateitem_list.append("""
            SELECT pdi.id AS pdi_id, pdc.id AS pdc_id, 
            pdi.datefirst, pdi.datelast, pdi.year, pdi.period
            FROM companies_paydateitem AS pdi
            INNER JOIN companies_paydatecode AS pdc ON (pdc.id = pdi.paydatecode_id)
            WHERE pdc.company_id = %(compid)s
            """)
        if period_datefirst:
            sql_paydateitem_list.append('AND pdi.datelast >= CAST(%(df)s AS DATE)')
            sql_paydateitem_keys['df'] = period_datefirst
        if period_datelast:
            sql_paydateitem_list.append('AND pdi.datelast <= CAST(%(dl)s AS DATE)')
            sql_paydateitem_keys['dl'] = period_datelast
        sql_paydateitem_list.append('ORDER BY pdi.datelast')
        sql_paydateitem = ' '.join(sql_paydateitem_list)

        newcursor.execute(sql_paydateitem, sql_paydateitem_keys)
        paydateitem_rows = f.dictfetchall(newcursor)

    return paydatecode_rows, paydateitem_rows
# --- end of create_paydatecode_rows


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
    #logger.debug(' --- create_wagecode_list --- ')

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


def create_wagefactor_rows(request, msg_dict, wagefactor_pk=None):
    # --- create list of wagefactors of this company PR2020-06-17 PR2020-09-15
    #     add messages to wagefactor_row
    #logger.debug(' --- create_wagefactor_rows --- ')

    sql_keys = {'compid': request.user.company.pk}

    sql_list = []
    sql_list.append(""" 
        SELECT wfc.id, wfc.company_id AS comp_id,
        CONCAT('wagefactor_', wfc.id::TEXT) AS mapid,
        wfc.code, wfc.wagerate, wfc.inactive
        FROM companies_wagecode AS wfc
        WHERE wfc.iswagefactor AND wfc.company_id = %(compid)s
        """)

    if wagefactor_pk:
        sql_list.append('AND (wfc.id = %(wfc_id)s)')
        sql_keys['wfc_id'] = wagefactor_pk
    else:
        sql_list.append('ORDER BY LOWER(wfc.code)')
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    wagefactor_rows = f.dictfetchall(newcursor)

# - add messages to wagefactor_row
    if wagefactor_pk and wagefactor_rows:
        # when wagefactor_pk has value there is only 1 row
        row = wagefactor_rows[0]
        if row:
            for key, value in msg_dict.items():
                row[key] = value
    return wagefactor_rows
# --- end of create_wagefactor_rows


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
# end of create_wagefactor_dict


def create_functioncode_rows(request):
    #logger.debug(' --- create_functioncode_rows --- ')
# --- create list of functioncodes of this company PR2029-06-17 PR2020-09-05
    sql = """
        SELECT fnc.id, 
        fnc.company_id AS comp_id,
        CONCAT('functioncode_', fnc.id::TEXT) AS mapid,
        fnc.code,
        fnc.inactive
        FROM companies_wagecode AS fnc
        WHERE fnc.company_id = %(compid)s 
        AND fnc.isfunctioncode
        ORDER BY LOWER(fnc.code)
        """
    newcursor = connection.cursor()
    newcursor.execute(sql, {'compid': request.user.company_id})
    return f.dictfetchall(newcursor)
# --- end of create_functioncode_rows
