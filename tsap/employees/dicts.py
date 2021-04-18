from django.db import connection
from django.db.models import Q

from django.http import HttpResponse

from datetime import date, datetime, timedelta

from decimal import Decimal, getcontext

from django.utils.translation import ugettext_lazy as _

from tsap import settings as s
from tsap import functions as f
from tsap import constants as c
from companies import models as m
from planning import views as plv
from planning import rosterfill as plrf
from planning import employeeplanning as emplan

import xlsxwriter
from xlsxwriter.utility import xl_rowcol_to_cell

import logging
logger = logging.getLogger(__name__)


def create_employee_rows(request_item, request):
    # --- create rows of all employees of this company PR2019-06-16 PR2020-09-09
    #     add messages to employee_row
    #logger.debug(' =============== create_employee_rows ============= ')

    sql_keys = {'compid': request.user.company.pk}

    # get list of allowed employees i.e. when user has permitcustomers or permitorders,
    # the allowed employees are the employees or replacement employees of the allowed customers / orders
    allowed_employees_list = f.get_allowed_employees_and_replacements(request)
    if allowed_employees_list:
        allowed_str = "(e.id IN (SELECT UNNEST(%(eid_arr)s::INT[]))) AS allowed,"
        sql_keys['eid_arr'] = allowed_employees_list
    else:
        allowed_str = "TRUE AS allowed,"

    employee_pk_list = request_item.get('employee_pk_list')
    employee_pk = request_item.get('employee_pk')
    datefirst_iso = request_item.get('datefirst')
    datelast_iso = request_item.get('datelast')
    is_inactive = request_item.get('inactive')

    sql_list = ["SELECT e.id, e.company_id AS comp_id, e.code, e.datefirst, e.datelast,",
        "e.namelast, e.namefirst, e.email, e.telephone, e.address, e.zipcode, e.city, e.country,",
        "e.identifier, e.payrollcode, e.workhoursperweek, e.leavedays, e.workminutesperday,",
        "fnc.id AS fnc_id, fnc.code AS fnc_code, wgc.id AS wgc_id, wgc.code AS wgc_code, pdc.id AS pdc_id, pdc.code AS pdc_code,",
        "e.locked, e.inactive, ",
        allowed_str,
        "CONCAT('employee_', e.id::TEXT) AS mapid",
        "FROM companies_employee AS e",
        "LEFT JOIN companies_wagecode AS wgc ON (wgc.id = e.wagecode_id)",
        "LEFT JOIN companies_wagecode AS fnc ON (fnc.id = e.functioncode_id)",
        "LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id)",
        "WHERE (e.company_id = %(compid)s::INT)"]

    if employee_pk_list:
        # when employee_pk_list has value: skip other filters
        sql_list.append("AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )")
        sql_keys['eid_arr'] = employee_pk_list
    elif employee_pk:
        # when employee_pk has value: skip other filters
        sql_list.append("AND (e.id = %(eid)s::INT)")
        sql_keys['eid'] = employee_pk
    else:
        if datefirst_iso:
            sql_list.append(' AND (e.datelast >= CAST(%(rdf)s AS DATE) OR e.datelast IS NULL)')
            sql_keys['rdl'] = datelast_iso
        if datelast_iso:
            sql_list.append('AND (e.datefirst <= CAST(%(rdl)s AS DATE) OR e.datefirst IS NULL)')
            sql_keys['rdl'] = datelast_iso
        if is_inactive is not None:
            if is_inactive:
                sql_list.append('AND e.inactive')
            else:
                sql_list.append('AND NOT e.inactive')
        sql_list.append('ORDER BY LOWER(e.code)')

    sql_employee = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql_employee, sql_keys)
    employee_rows = f.dictfetchall(newcursor)

    return employee_rows
# --- end of create_employee_rows


def create_employee_list(request, user_lang, is_inactive=None, datefirst_iso=None, datelast_iso=None, employee_pk=None):
    # --- create list of all active employees of this company PR2019-06-16
    #logger.debug(' --- create_employee_list   ')
    # PR2020-05-11 with Django model it took 10 seconds - with sql it takes ??? to be tested

    #logger.debug(' =============== create_employee_list ============= ')
    company = request.user.company

    sql_filter = {'compid': company.pk}
    sql_list = ["SELECT e.id, e.company_id AS comp_id, e.code, e.datefirst, e.datelast,",
                "e.namelast, e.namefirst, e.email, e.telephone, e.address, e.zipcode, e.city, e.country,",
                "e.identifier, e.payrollcode, e.workhoursperweek, e.leavedays, e.workminutesperday,",
                "fnc.id AS fnc_id, fnc.code AS fnc_code, wgc.id AS wgc_id, wgc.code AS wgc_code, pdc.id AS pdc_id, pdc.code AS pdc_code,",
                "e.locked, e.inactive,",
                "CONCAT('employee_', e.id::TEXT) AS mapid",
                "FROM companies_employee AS e",
                "LEFT JOIN companies_wagecode AS wgc ON (wgc.id = e.wagecode_id)",
                "LEFT JOIN companies_wagecode AS fnc ON (fnc.id = e.functioncode_id)",
                "LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id)",
                "WHERE (e.company_id = %(compid)s::INT)"]

    if employee_pk:
        # when employee_pk has value: skip other filters
        sql_list.append("AND (e.id = %(eid)s::INT)")
        sql_filter['eid'] = employee_pk
    else:
        if datefirst_iso:
            sql_list.append("AND (e.datelast >= CAST(%(rdf)s AS DATE) OR e.datelast IS NULL)")
            sql_filter['rdl'] = datelast_iso
        if datelast_iso:
            sql_list.append("AND (e.datefirst <= CAST(%(rdl)s AS DATE) OR e.datefirst IS NULL)")
            sql_filter['rdl'] = datelast_iso
        if is_inactive is not None:
            sql_list.append("AND (e.inactive = CAST(%(inactive)s AS BOOLEAN))")
            sql_filter['inactive'] = is_inactive
    sql_list.append("ORDER BY LOWER(e.code)")

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


def ed_create_teammember_list(filter_dict, company, user_lang):
    #logger.debug(' ----- ed_create_teammember_list  -----  ')
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

    employee_nonull = filter_dict.get('employee_nonull', False)
    # PR2021-03-28 debug. Don't filter on is_template. Since order_pk is the template order, no need to filter on is_template
    is_template = filter_dict.get('is_template')

    # not in use (yet?):
    #d atelast_iso =  filter_dict.get('datelast')
    # AND ( e.datelast >= CAST(%(rdl)s AS DATE) OR e.datelast IS NULL OR %(rdl)s IS NULL )

    sql_schemeitem_shift_list = ["SELECT si.team_id AS t_id,",
            "ARRAY_AGG(si.id) AS si_id_arr,",
            "ARRAY_AGG(si.shift_id) AS sh_id_arr,",
            "ARRAY_AGG(sh.code) AS sh_code_arr,",
            "ARRAY_AGG(si.isabsence) AS si_abs_arr,",
            "ARRAY_AGG(sh.isrestshift) AS sh_rest_arr,",
            "ARRAY_AGG(sh.offsetstart) AS sh_os_arr,",
            "ARRAY_AGG(sh.offsetend) AS sh_oe_arr,",
            "ARRAY_AGG(sh.breakduration) AS sh_bd_arr,",
            "ARRAY_AGG(sh.timeduration) AS sh_td_arr,",

            "ARRAY_AGG(sh.nohoursonweekday) AS sh_nowd_arr,",
            "ARRAY_AGG(sh.nohoursonsaturday) AS sh_nosat_arr,",
            "ARRAY_AGG(sh.nohoursonsunday) AS sh_nosun_arr,",
            "ARRAY_AGG(sh.nohoursonpublicholiday) AS sh_noph_arr",

            "FROM companies_schemeitem AS si",
            "INNER JOIN companies_shift AS sh ON (sh.id = si.shift_id)",
            "GROUP BY si.team_id"]
    sql_schemeitem_shift = ' '.join(sql_schemeitem_shift_list)

    sql_list = ["SELECT  tm.id, CONCAT('teammember_', tm.id::TEXT) AS mapid, 'teammember' AS table,",
                "t.id AS t_id, s.id AS s_id, o.id AS o_id, c.id AS c_id,",
        "c.company_id AS comp_id, e.id AS e_id, r.id AS r_id,",
        "tm.isabsence AS tm_isabsence, tm.istemplate AS tm_istemplate,",
        "tm.modifiedat AS modat, COALESCE(SUBSTRING (au.username, 7), '') AS modby_usr,",
        "COALESCE(t.code, '') AS t_code, COALESCE(s.code, '') AS s_code, COALESCE(o.code, '') AS o_code, ",
        "COALESCE(c.code, '') AS c_code, COALESCE(e.code, '') AS e_code, COALESCE(r.code, '') AS r_code,",

        "o.nohoursonweekday AS o_nowd, o.nohoursonsaturday AS o_nosat,",
        "o.nohoursonsunday AS o_nosun, o.nohoursonpublicholiday AS o_noph,",
        "si_sh_sub.sh_nowd_arr, si_sh_sub.sh_nosat_arr, si_sh_sub.sh_nosun_arr, si_sh_sub.sh_noph_arr,",

        "e.inactive AS e_inactive, e.workminutesperday AS e_workminutesperday, ",
        "r.inactive AS r_inactive, r.workhoursperweek AS r_workhoursperweek,",

        "tm.datefirst AS tm_df, tm.datelast AS tm_dl,",
        "s.datefirst AS s_df, s.datelast AS s_dl, o.datefirst AS o_df, o.datelast AS o_dl,",
        "e.datefirst AS e_df, e.datelast AS e_dl, r.datefirst AS r_df, r.datelast AS r_dl,",

        "GREATEST(s.datefirst, o.datefirst) AS o_s_datemin, LEAST(s.datelast, o.datelast) AS o_s_datemax,",

        "si_sh_sub.si_id_arr, si_sh_sub.sh_id_arr, si_sh_sub.sh_code_arr, si_sh_sub.si_abs_arr,",
        "si_sh_sub.sh_rest_arr, si_sh_sub.sh_os_arr, si_sh_sub.sh_oe_arr, si_sh_sub.sh_bd_arr, si_sh_sub.sh_td_arr",

        "FROM companies_teammember AS tm",
        "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
        "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
        "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
        "LEFT JOIN companies_employee AS e ON (e.id = tm.employee_id)",
        "LEFT JOIN companies_employee AS r ON (r.id = tm.replacement_id) ",
        "LEFT JOIN accounts_user AS au ON (au.id = tm.modifiedby_id)",
        "LEFT JOIN (" + sql_schemeitem_shift + ") AS si_sh_sub ON (si_sh_sub.t_id = t.id)",
        "WHERE c.company_id = %(comp_id)s::INT"]

    sql_keys = {'comp_id': company.id}
    #if is_template:
    #    sql_list.append('AND c.istemplate')
    # else:
    #   sql_list.append('AND NOT c.istemplate')

    if employee_nonull:
        sql_list.append('AND e.id IS NOT NULL')
    if teammember_pk:
        sql_keys['tm_id'] = teammember_pk
        sql_list.append('AND tm.id = %(tm_id)s::INT')
    elif order_pk:
        sql_keys['o_id'] = order_pk
        sql_list.append('AND o.id = %(o_id)s::INT')
        sql_list.append('ORDER BY LOWER(e.code) NULLS LAST')
    elif customer_pk:
        sql_keys['c_id'] = teammember_pk
        sql_list.append('AND c.id = %(c_id)s::INT')
        sql_list.append('ORDER BY LOWER(e.code) NULLS LAST')

    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    teammember_rows = f.dictfetchall(newcursor)

    teammember_list = []
    for row in teammember_rows:
        item_dict = {}
        create_teammember_dict_from_sql(row, item_dict, user_lang)
        if item_dict:
            teammember_list.append(item_dict)

    return teammember_list, teammember_rows


def create_teammember_dict_from_sql(tm, item_dict, user_lang):
    # --- create dict of this teammember PR2019-07-26
    #logger.debug ('--- create_teammember_dict ---')
    #logger.debug ('tm: ' + str(tm))
    #logger.debug ('item_dict: ' + str(item_dict))

    # PR2019-12-20 Note: 'scheme' and 'order' are not model fields, but necessary for absence update
    # FIELDS_TEAMMEMBER = ('id', 'team', 'employee', 'replacement', 'datefirst', 'datelast', 'scheme', 'order',
    #                      'cat', 'isabsence', 'istemplate', 'wagefactorcode',)

    if tm:
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

            elif field == 'order':
                field_dict['pk'] = tm.get('o_id')
                field_dict['ppk'] = tm.get('c_id')
                field_dict['code'] = tm.get('o_code')
                field_dict['display'] = ' - '.join([tm.get('c_code'), tm.get('o_code')])
                field_dict['datefirst'] = tm.get('o_df')
                field_dict['datelast'] = tm.get('o_dl')

                field_dict['nohoursonweekday'] = tm.get('o_nowd')
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
                # if is_absence: get datefirst / datelast from scheme
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

            elif field in ('isabsence', 'istemplate'):
                pass

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
    # FIELDS_TEAMMEMBER = ('id', 'team', 'employee', 'replacement', 'datefirst', 'datelast','scheme', 'order',
    #                      'cat', 'isabsence', 'istemplate','wagefactorcode',)

    if teammember:
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
                # if is_absence: get datefirst / datelast from scheme
                # is restshift or schemshift: get datefirst / datelast from teammember

                if is_absence:
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

            elif field in ('isabsence', 'istemplate'):
                pass

            update_dict[field] = field_dict

# 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(update_dict)
    return update_dict
# === end of create_teammember_dict_from_model


def create_absence_rows(filter_dict, teammember_pk, msg_dict, request):
    #logger.debug(' ----- create_absence_rows  -----  ')
    #logger.debug('filter_dict: ' + str(filter_dict) )
    # create list of all absence teammembers and teammembers with shift  PR2020-06-30 PR2020-08-28

    is_template = False # not in use yet
    period_datefirst = filter_dict.get('period_datefirst')
    period_datelast = filter_dict.get('period_datelast')

# get list of allowed employees i.e. when user has permitcustomers or permitorders,
    # the allowed employees are the employees or replacemenet employees of the allowed customers / orders
    allowed_employees_list = f.get_allowed_employees_and_replacements(request)
    #logger.debug('allowed_employees_list: ' + str(allowed_employees_list))

    sql_keys = {'compid': request.user.company.pk}
    if allowed_employees_list:
        allowed_str = "(e.id IN (SELECT UNNEST(%(eid_arr)s::INT[]))) AS allowed,"
        sql_keys['eid_arr'] = allowed_employees_list
    else:
        allowed_str = "TRUE AS allowed,"

    sql_schemeitem_list = ["SELECT si.team_id AS t_id,",
            "ARRAY_AGG(si.id) AS si_id_arr,",
            "ARRAY_AGG(si.shift_id) AS sh_id_arr,",
            "ARRAY_AGG(sh.code) AS sh_code_arr,",
            "ARRAY_AGG(si.isabsence) AS si_abs_arr,",
            "ARRAY_AGG(sh.isrestshift) AS sh_rest_arr,",
            "ARRAY_AGG(sh.offsetstart) AS sh_os_arr,",
            "ARRAY_AGG(sh.offsetend) AS sh_oe_arr,",
            "ARRAY_AGG(sh.breakduration) AS sh_bd_arr,",
            "ARRAY_AGG(sh.timeduration) AS sh_td_arr",

            "FROM companies_schemeitem AS si",
            "INNER JOIN companies_shift AS sh ON (sh.id = si.shift_id)",
            "GROUP BY si.team_id"]
    sql_schemeitem_shift = ' '.join(sql_schemeitem_list)

    sql_list = ["SELECT tm.id, t.id AS t_id, s.id AS s_id, o.id AS o_id, c.id AS c_id,",
        "CONCAT('absence_', tm.id::TEXT) AS mapid, c.company_id AS comp_id, e.id AS e_id,",
        "COALESCE(t.code, '') AS t_code, COALESCE(s.code, '') AS s_code,",
        "COALESCE(REPLACE (o.code, '~', ''),'') AS o_code, COALESCE(REPLACE (c.code, '~', ''),'') AS c_code,",
        "COALESCE(e.code, '') AS e_code,",
        allowed_str,
        "c.istemplate AS c_istemplate, c.isabsence AS c_isabsence,",
        "o.nohoursonweekday AS o_nowd, o.nohoursonsaturday AS o_nosat, o.nohoursonsunday AS o_nosun, o.nohoursonpublicholiday AS o_noph,",
        "s.cycle AS s_cycle,",
        "e.inactive AS e_inactive, e.workminutesperday AS e_workminutesperday,",
        "tm.datefirst AS tm_df, tm.datelast AS tm_dl, rpl.id AS rpl_id, rpl.code AS rpl_code,",
        "tm.modifiedat AS modat, COALESCE(SUBSTRING (au.username, 7), '') AS modby_usr,",

        "s.datefirst AS s_df, s.datelast AS s_dl, o.datefirst AS o_df, o.datelast AS o_dl,",
        "e.datefirst AS e_df, e.datelast AS e_dl, rpl.datefirst AS rpl_df, rpl.datelast AS rpl_dl,",
        "si_sh_sub.si_id_arr, si_sh_sub.sh_id_arr, si_sh_sub.sh_code_arr, si_sh_sub.si_abs_arr, si_sh_sub.sh_rest_arr,",
        "si_sh_sub.sh_os_arr, si_sh_sub.sh_oe_arr, si_sh_sub.sh_bd_arr, si_sh_sub.sh_td_arr",

        "FROM companies_teammember AS tm",
        "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
        "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
        "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
        "INNER JOIN companies_employee AS e ON (e.id = tm.employee_id)",
        "LEFT JOIN companies_employee AS rpl ON (rpl.id = tm.replacement_id)",
        "LEFT JOIN (" + sql_schemeitem_shift + ") AS si_sh_sub ON (si_sh_sub.t_id = t.id)",
        "LEFT JOIN accounts_user AS au ON (au.id = tm.modifiedby_id)",
        "WHERE c.company_id = %(compid)s::INT AND c.isabsence"]

    if teammember_pk:
        sql_list.append('AND tm.id = %(tm_id)s::INT')
        sql_keys['tm_id'] = teammember_pk
    else:
        if period_datefirst:
            sql_list.append('AND s.datelast >= %(df)s::DATE')
            sql_keys['df'] = period_datefirst
        if period_datelast:
            sql_list.append('AND s.datefirst <= %(dl)s::DATE')
            sql_keys['dl'] = period_datelast
        sql_list.append('ORDER BY LOWER(e.code), tm.datefirst NULLS LAST, s.datefirst NULLS LAST')
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
        period_datefirst, period_datelast = None, None
        if period_dict:
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
        period_datefirst, period_datelast = None, None
        if period_dict:
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


####################===============@@@@@@@@@@@@@@@@@@@@@@@
def create_payroll_detail_listNEW(payroll_period, comp_timezone, timeformat, user_lang, request):
    logger.debug(' +++++++++++ create_payroll_detail_listNEW +++++++++++ ')
    #logger.debug('payroll_period: ' + str(payroll_period))

    payrollperiod_detail_list = []
    if request.user.company:

        period_datefirst, period_datelast, paydatecode_pk = None, None, None
        sel_view = payroll_period.get('sel_view')
        #logger.debug('sel_view: ' + str(sel_view))
        if sel_view =='calendar_period':
            period_datefirst = f.get_dict_value(payroll_period, ('period_datefirst',))
            period_datelast = f.get_dict_value(payroll_period, ('period_datelast',))
        else:
            paydatecode_pk = payroll_period.get('paydatecode_pk')
            period_datefirst = payroll_period.get('paydateitem_datefirst')
            period_datelast = payroll_period.get('paydateitem_datelast')

        customer_pk = f.get_dict_value(payroll_period, ('customer_pk',))
        order_pk = f.get_dict_value(payroll_period, ('order_pk',))

        employee_pk_list = f.get_dict_value(payroll_period, ('employee_pk_list',))
        functioncode_pk_list = f.get_dict_value(payroll_period, ('functioncode_pk_list',))

# - get list of rosterdates that are in emplhour in selected period
        # if paydatecode_pk and paydateitem_datelast have values: these will be used, use period_datefirst / last otherwise
        rosterdate_rows = get_rosterdates_of_emplhour_period(
            period_datefirst=period_datefirst,
            period_datelast=period_datelast,
            paydatecode_pk=paydatecode_pk,
            request=request)
        #logger.debug('rosterdate_rows: ' + str(rosterdate_rows))
###############################
# +++++ loop through dates of selected period
        datefirst_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datefirst)
        datelast_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datelast)
        if datefirst_dte and datelast_dte:
            rosterdate_dte = datefirst_dte
            while rosterdate_dte <= datelast_dte:
                rosterdate_iso = rosterdate_dte.isoformat()

                if rosterdate_dte in rosterdate_rows:
    # - when emplhour records of this rosterdate exist: get emplhour records and add them to payrollperiod_detail_list
                    detail_listONEDAY = create_payrollperiod_detail_listONDEDAY(
                        rosterdate=rosterdate_iso,
                        customer_pk=customer_pk,
                        order_pk=order_pk,
                        paydatecode_pk=paydatecode_pk,
                        employee_pk_list=employee_pk_list,
                        functioncode_pk_list=functioncode_pk_list,
                        request=request)
                    if detail_listONEDAY:
                        payrollperiod_detail_list.extend(detail_listONEDAY)

                else:
                    #logger.debug(' ')
                    #logger.debug('short_list: ')
                    #for row in short_list:
                    #    #logger.debug('      ' + str(row))

        # PR2020-11-08 replaced by this one
                    planning_period_dict = {'period_datefirst': rosterdate_iso, 'period_datelast': rosterdate_iso}
                    if paydatecode_pk:
                        planning_period_dict['paydatecode_pk'] = paydatecode_pk
                    if employee_pk_list:
                        planning_period_dict['employee_pk_list'] = employee_pk_list
                    if functioncode_pk_list:
                        planning_period_dict['functioncode_pk_list'] = functioncode_pk_list

                    short_list, customer_dictlist, order_dictlist, elapsed_seconds = \
                    emplan.create_employee_planningNEW(planning_period_dict, order_pk, comp_timezone, request)

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
            rosterdate_rows = get_rosterdates_of_emplhour_period(
                period_datefirst=period_datefirst,
                period_datelast=period_datelast,
                paydatecode_pk=None,
                request=request)
            #logger.debug('rosterdate_rows: ' + str(rosterdate_rows))

            ###############################
            # +++++ loop through dates that are not in payrollperiod_detail_list and add planning

            datefirst_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datefirst)
            datelast_dte, msg_txtNIU = f.get_date_from_ISOstring(period_datelast)

            rosterdate_dte = datefirst_dte
            while rosterdate_dte <= datelast_dte:
                if rosterdate_dte not in rosterdate_rows:
                    # - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
                    is_saturday, is_sunday, is_publicholiday, is_companyholiday = f.get_issat_issun_isph_isch_from_calendar(
                        rosterdate_dte, request)
                    # - create list with all teammembers of this_rosterdate
                    # this functions retrieves a list of tuples with data from the database
                    rows = plrf.get_employee_calendar_rows(
                        rosterdate_dte=rosterdate_dte,
                        is_saturday=is_saturday,
                        is_sunday=is_sunday,
                        is_publicholiday=is_publicholiday,
                        is_companyholiday=is_companyholiday,
                        customer_pk=None,
                        order_pk=None,
                        employee_pk=None,
                        functioncode_pk=None,
                        paydatecode_pk=None,
                        company_id=request.user.company.pk
                    )
                    # - add rows to all_rows
                    payrollperiod_detail_list.extend(rows)
                # - add one day to rosterdate
                rosterdate_dte = rosterdate_dte + timedelta(days=1)
        # +++++ end of loop
            #################################


    return payrollperiod_detail_list
# --- end of create_payroll_detail_list

def get_rosterdates_of_emplhour_period(period_datefirst, period_datelast, paydatecode_pk, request):
    #logger.debug(' ============= get_rosterdates_of_emplhour_period ============= ')
    # create list of rosterdates that are in selected period PR2020-09-07 PR2020-11-19
    #  - filter on period_datefirst and/or period_datelast
    #  - if paydatecode_pk: filter also on paydatecode_pk
    sql_keys = {'compid': request.user.company_id}
    sql_list = ["SELECT eh.rosterdate",
            "FROM companies_emplhour AS eh",
            "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
            "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
            "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
            "WHERE c.company_id = %(compid)s"]
    if paydatecode_pk:
        sql_list.append("AND eh.paydatecode_id = %(pdc_id)s::INT")
        sql_keys['pdc_id'] = paydatecode_pk
    else:
        if period_datefirst:
            sql_list.append('AND eh.rosterdate >= CAST(%(df)s AS DATE)')
            sql_keys['df'] = period_datefirst
        if period_datelast:
            sql_list.append('AND eh.rosterdate <= CAST(%(dl)s AS DATE)')
            sql_keys['dl'] = period_datelast
    sql_list.append('GROUP BY eh.rosterdate')
    sql = ' '.join(sql_list)
    #logger.debug('sql: ' + str(sql))

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    rosterdate_rows = newcursor.fetchall()
    #logger.debug('rosterdate_rows: ' + str(rosterdate_rows))
    rosterdate_list = []
    for row in rosterdate_rows:
        rosterdate_list.append(row[0])

    return rosterdate_list
# - end of get_rosterdates_of_emplhour_period


def create_payrollperiod_detail_listONDEDAY(rosterdate, customer_pk, order_pk,
                                            employee_pk_list, functioncode_pk_list, paydatecode_pk, request):

    #logger.debug(' ============= create_payrollperiod_detail_listONDEDAY ============= ')
    # create crosstab list of employees with absence hours PR2020-06-12  PR2021-02-15

    #logger.debug('rosterdate' + str(rosterdate))
    # see https://postgresql.verite.pro/blog/2018/06/19/crosstab-pivot.html
    # see https://stackoverflow.com/questions/3002499/postgresql-crosstab-query/11751905#11751905

    sql_keys = {'compid': request.user.company_id, 'rd': rosterdate}
    sql_list = ["SELECT eh.id AS emplhour_id,  eh.rosterdate, eh.employee_id AS e_id,  e.code AS e_code,",
        "e.identifier AS e_identifier, e.payrollcode AS e_payrollcode, oh.id AS oh_id,",
        "o.id AS o_id, o.code AS o_code, o.identifier AS o_identifier,",
        "c.code AS c_code, c.isabsence, CONCAT(c.code, ' - ', o.code) AS c_o_code,",
        "eh.offsetstart, eh.offsetend, eh.exceldate, eh.excelstart, eh.excelend,",

        "CASE WHEN c.isabsence THEN 0 ELSE eh.plannedduration END AS plandur,",
        "CASE WHEN NOT c.isabsence THEN eh.timeduration ELSE 0 END AS timedur,",
        "CASE WHEN c.isabsence THEN eh.timeduration ELSE 0 END AS absdur,",
        "eh.timeduration AS totaldur,",

        "eh.functioncode_id AS fnc_id, fnc.code AS fnc_code, pdc.id AS pdc_id, pdc.code AS pdc_code,",
        "eh.wagefactorcode_id AS wfc_id, eh.wagefactorcaption AS wfc_code, eh.wagefactor AS wfc_rate, eh.nohours,",
        "eh.wagecode_id AS wgc_id, eh.wagerate, eh.wage",

        "FROM companies_emplhour AS eh",
        "LEFT JOIN companies_employee AS e ON (e.id = eh.employee_id)",
        "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
        "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
        "LEFT JOIN companies_wagecode AS fnc ON (fnc.id = eh.functioncode_id)",
        "LEFT JOIN companies_wagecode AS wfc ON (wfc.id = eh.wagefactorcode_id) ",
        "LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id)",

        "WHERE c.company_id = %(compid)s",
        "AND NOT oh.isrestshift",
        "AND eh.rosterdate = CAST(%(rd)s AS DATE)"]
    if customer_pk:
        sql_list.append('AND c.id = %(c_id)s::INT')
        sql_keys['c_id'] = customer_pk
    if order_pk:
        sql_list.append('AND o.id = %(o_id)s::INT')
        sql_keys['o_id'] = order_pk

    if paydatecode_pk:
        sql_list.append('AND pdc.id = %(pdc_id)s::INT')
        sql_keys['pdc_id'] = paydatecode_pk

    if employee_pk_list:
        sql_keys['eid_arr'] = employee_pk_list
        sql_list.append('AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )')
    if functioncode_pk_list:
        sql_keys['fnc_id_arr'] = functioncode_pk_list
        sql_list.append('AND e.functioncode_id IN ( SELECT UNNEST( %(fnc_id_arr)s::INT[] ) )')

    sql_list.append('ORDER BY LOWER(e.code), LOWER(o.code)')

    sql = ' '.join(sql_list)
    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
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


def create_paydatecode_rows(period_dict, paydatecode_pk, msg_dict, request):
    #logger.debug(' --- create_paydatecode_rows --- ')
    #logger.debug('is_absence: ' + str(is_absence) + ' is_template: ' + str(is_template) + ' inactive: ' + str(inactive))

    paydatecode_rows = []
    paydateitem_rows = []

# --- create list of payrollperiods of this company PR2029-06-17
    if request.user.company:
        company_pk = request.user.company_id

        period_datefirst, period_datelast = None, None
        if period_dict:
            period_datefirst = period_dict.get('period_datefirst')
            period_datelast = period_dict.get('period_datelast')
        # Note: both datefirst_agg and datelast_agg are ordered by datelast, to keep sequece in both lists the same
        # to prevent errors when there pdi.datelast occurs multiple times: order by , sort when createing table in JS

        sql_keys = {'compid': company_pk}
        sql_sub_list = []
        sql_sub_list.append("""SELECT pdi.paydatecode_id, 
                CONCAT('paydatecode_', pdi.paydatecode_id::TEXT) AS mapid,
                ARRAY_AGG( pdi.year ORDER BY pdi.year, pdi.period ) AS year_agg,
                ARRAY_AGG( pdi.period ORDER BY pdi.year, pdi.period ) AS period_agg,
                ARRAY_AGG( TO_CHAR(pdi.datefirst, 'YYYY-MM-DD') ORDER BY pdi.year, pdi.period ) AS datefirst_agg,
                ARRAY_AGG( TO_CHAR(pdi.datelast, 'YYYY-MM-DD') ORDER BY pdi.year, pdi.period ) AS datelast_agg
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

        sql_list = ["SELECT pdc.id, pdc.company_id AS comp_id,",
            "CONCAT('paydatecode_', pdc.id::TEXT) AS mapid,",
            "pdc.code, pdc.recurrence, pdc.dayofmonth, pdc.referencedate,",
            "pdc.datefirst, pdc.datelast, pdc.isdefault, pdc.afascode, pdc.inactive,",
            "pdi.year_agg, pdi.period_agg, pdi.datefirst_agg, pdi.datelast_agg",
            "FROM companies_paydatecode AS pdc",
            "LEFT JOIN (" + sql_sub + ") AS pdi ON (pdi.paydatecode_id = pdc.id)",
            "WHERE pdc.company_id = %(compid)s",
            "ORDER BY LOWER(pdc.code) ASC"]

        sql = ' '.join(sql_list)
        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        paydatecode_rows = f.dictfetchall(newcursor)

# --- create list of payrollitems of this company
        sql_paydateitem_keys = {'compid': company_pk}
        sql_paydateitem_list = []
        sql_paydateitem_list.append("""
            SELECT pdi.id, pdc.id AS pdc_id, 
            CONCAT('paydateitem_', pdi.id::TEXT) AS mapid,
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

        rows = create_bi_weekly_monthly_paydateitem_rows(paydatecode_rows)
        paydateitem_rows.extend(rows)
    return paydatecode_rows, paydateitem_rows
# --- end of create_paydatecode_rows


def create_bi_weekly_monthly_paydateitem_rows(paydatecode_rows):
    #logger.debug(' --- create_paydatecode_rows --- ')
    # --- create list of paydateitems of weekly, biweekly and monthly paydatecodes PR2020-09-23

    # may be replaced by  get_today_usertimezone, to get now in user timezone
    # today_dte, now_usercomp_dtm = f.get_today_usertimezone(period_dict)
    now = datetime.now()
    this_year = now.year

    rows = []
    for row in paydatecode_rows:
        recurrence = row.get('recurrence')
        #logger.debug('recurrence: ' + str(recurrence))
        #logger.debug('code: ' + str(row.get('code')))

        if recurrence in ['weekly', 'biweekly', 'monthly']:
            paydatecode_pk = row.get('id')
            dayofmonth = row.get('dayofmonth')
            reference_datelast_dte = f.get_date_from_ISO(row.get('referencedate'))
            datefirst_nextmonth_dte = None

            #logger.debug('dayofmonth: ' + str(dayofmonth))
            #logger.debug('reference_datelast_dte: ' + str(reference_datelast_dte))

            if recurrence == 'monthly':
                if not dayofmonth:
                    dayofmonth = 31
                for year in range(this_year -2, this_year + 2, 1):  # range(start_value, end_value, step), end_value is not included!
                    if year == this_year -2:
                        # only get last period of this year, to calculate datefirst of first month in next year
                        # when new date is not valid, subtract one day till it gets a valid day.
                        datelast_dte = f.get_dayofmonth_orlesswheninvalid(year, 12, dayofmonth)
                        datefirst_nextmonth_dte = f.add_days_to_date(datelast_dte, 1)
                    else:
                        for month in range(1 , 13, 1):  # range(start_value, end_value, step), end_value is not included!
                            # when new date is not valid, subtract one day till it gets a valid day.
                            datelast_dte = f.get_dayofmonth_orlesswheninvalid(year, month, dayofmonth)
                            datelast_iso = datelast_dte.isoformat()
                            datefirst_iso = datefirst_nextmonth_dte.isoformat()
                            datefirst_nextmonth_dte = f.add_days_to_date(datelast_dte, 1)

                            row = {'id': str(paydatecode_pk) + "-" + datelast_iso,
                                   'mapid': 'paydateitem_' + str(paydatecode_pk) + "-" + datelast_iso,
                                   'pdc_id': paydatecode_pk,
                                   'datefirst': datefirst_iso,
                                   'datelast': datelast_iso,
                                   'year': year,
                                   'period': month}
                            rows.append(row)

            if recurrence in ['weekly', 'biweekly']:
                pivot_dayofmonth = 7 if recurrence == 'biweekly' else 4
                length_of_period = 14 if recurrence == 'biweekly' else 7
                range_of_year = 26 if recurrence == 'biweekly' else 52

                weekday_ref_datelast = 5
                if recurrence == 'biweekly':
                    if not reference_datelast_dte:
                        reference_datelast_dte = date(this_year, 1, length_of_period)
                    weekday_ref_datelast = reference_datelast_dte.isoweekday()
                elif recurrence == 'weekly':
                    # weekdayindex is stored in dayofmonth. Default is 5 (Friday)
                    if not dayofmonth:
                        dayofmonth = 5
                    weekday_ref_datelast = dayofmonth
                #logger.debug('weekday_ref_datelast: ' + str(weekday_ref_datelast))

                for year in range(this_year -1, this_year + 2, 1):  # range(start_value, end_value, step), end_value is not included!
                    # count weeknr: 'ISO 8601:
                    #   week 1 is de week is, waarin de eerste donderdag van dat jaar zit,
                    #   en de week waar 4 januari in valt.
                    # first period is period that contains jan_04
                    # calculate difference in weekday of reference_datelast and weekday of jan_04
                    # add diff to jan_04 to get llast date of first period
                    pivotdate_dte = date(year, 1, pivot_dayofmonth)
                    weekday_pivotdate = pivotdate_dte.isoweekday()
                    weekdays_diff = weekday_ref_datelast - weekday_pivotdate
                    if weekdays_diff < 0:
                        weekdays_diff += length_of_period
                    datelast_of_firstweekofyear = f.add_days_to_date(pivotdate_dte, weekdays_diff)

                    pivotdate_next_year_dte = date(year + 1, 1, pivot_dayofmonth)
                    pivotdate_next_year_iso = pivotdate_next_year_dte.isoformat()

                    for period in range(1, range_of_year + 2, 1):  # range(start_value, end_value, step), end_value is not included!
                        #logger.debug ('recurrence: ' + str(recurrence) + ' year: ' + str(year) + ' period: ' + str(period))

                        days_add = (period - 1) * length_of_period
                        datelast_dte = f.add_days_to_date(datelast_of_firstweekofyear, days_add)
                        datelast_iso = datelast_dte.isoformat()
                        datefirst_dte = f.add_days_to_date(datelast_dte, 1 - length_of_period)
                        datefirst_iso = datefirst_dte.isoformat()
                        # skip 27th quincena if it contains jan-07 of next year
                        # skip 53th week if it contains jan-04 of next year
                        if datelast_iso < pivotdate_next_year_iso:
                            #logger.debug ('datefirst_iso: ' + str(datefirst_iso) + ' datelast_iso: ' + str(datelast_iso))
                            row = {'id': str(paydatecode_pk) + "-" + datelast_iso,
                                   'mapid': 'paydateitem_' + str(paydatecode_pk) + "-" + datelast_iso,
                                   'pdc_id': paydatecode_pk,
                                   'datefirst': datefirst_iso,
                                   'datelast': datelast_iso,
                                   'year': year,
                                   'period': period}
                            rows.append(row)

    return rows
# ------------------------------------------------------

def create_wagecode_list(period_dict, datalists, request):
    #logger.debug(' --- create_wagecode_list --- ')

# --- create list of wagecodes of this company PR2029-06-17
    if request.user.company:
        company_pk = request.user.company_id

        period_datefirst, period_datelast = None, None
        if period_dict:
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


def create_wagecode_rows(key_str, request, msg_dict, pk_int=None):
    # --- create list of wagecodes filter by key_str of this company PR2020-06-17 PR2020-09-15 PR2021-01-30
    #     add messages to wagecode_rows
    #logger.debug(' --- create_wagecode_rows --- ')
    #logger.debug('key_str: ' + str(key_str))
    #logger.debug('pk_int: ' + str(pk_int))
    #logger.debug('msg_dict: ' + str(msg_dict))

    wagerate_line, isdefault_line = '', ''
    if key_str is None or key_str ==  'wfc':
        isdefault_line = "CASE WHEN comp.wagefactorcode_id = w.id THEN TRUE ELSE FALSE END AS isdefault,"
        wagerate_line = "w.wagerate,"
    elif key_str == 'alw':
        wagerate_line = "w.wagerate,"

    sql_keys = {'compid': request.user.company.pk, 'key': key_str}
    sql_list = [
        "SELECT w.id, w.company_id AS comp_id, CONCAT('wagecode_', w.id::TEXT) AS mapid,",
        "w.key, w.code, w.description,", wagerate_line, isdefault_line, " w.inactive",
        "FROM companies_wagecode AS w",
        "INNER JOIN companies_company AS comp ON (comp.id = w.company_id)",
        "WHERE w.company_id = %(compid)s::INT"]

    if pk_int:
        sql_keys['pk'] = pk_int
        sql_list.append('AND (w.id = %(pk)s)')
    else:
        if key_str is not None:
            sql_keys['key'] = key_str
            sql_list.append("AND w.key=%(key)s")
        sql_list.append('ORDER BY LOWER(w.code)')
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    wagecode_rows = f.dictfetchall(newcursor)

# - add messages to wagefactor_row
    if pk_int and wagecode_rows and msg_dict:
        # when pk_int has value there is only 1 row
        row = wagecode_rows[0]
        if row:
            for key, value in msg_dict.items():
                row[key] = value
    return wagecode_rows
# --- end of create_wagecode_rows


def create_afas_hours_rows(period_dict, user_lang, request):
    # --- create list of wagecodes filter by key_str of this company PR2020-06-17 PR2020-09-15 PR2021-01-30
    #     add messages to wagecode_rows
    logging_on = s.LOGGING_ON

    company_pk = request.user.company.pk
    rosterdatefirst, rosterdatelast, paydateitem_year, paydateitem_period = None, None, 0, 0
    paydatecode_pk, sel_view, dates = None, None, ''
    if period_dict:
        sel_view = period_dict.get('sel_view')
        if sel_view == 'payroll_period':
            paydateitem_year = period_dict.get('paydateitem_year')
            paydateitem_period = period_dict.get('paydateitem_period')
            paydatecode_pk = period_dict.get('paydatecode_pk')
        else:
            rosterdatefirst = period_dict.get('period_datefirst')
            rosterdatelast = period_dict.get('period_datelast')
            dates = period_dict.get('dates_display_short')

    sql_keys = {'compid': company_pk}
    if sel_view == 'payroll_period':
        sql_keys['year'] = paydateitem_year
        sql_keys['period'] = paydateitem_period
        pdc_line = "pdc.code AS pdc_code, %(year)s::TEXT AS pdi_year, %(period)s::TEXT AS pdi_period,"
    else:
        sql_keys['dates'] = dates
        pdc_line = "pdc.code AS pdc_code, '' AS pdi_year, '' AS pdi_period,"

    sql_list = [
        "SELECT eh.id, c.company_id AS comp_id,"
        "eh.wagefactorcode_id, wfc.code AS wfc_code, wfc.wagerate AS wfc_wagerate, eh.functioncode_id,",
        "eh.rosterdate::TEXT AS eh_rosterdate, eh.timeduration AS eh_timeduration,",
        pdc_line,
        "e.paydatecode_id AS e_pdc_id, e.payrollcode AS e_payrollcode, CONCAT(e.namelast, ', ', e.namefirst) AS e_name,",
        "o.identifier AS o_identifier, CONCAT(o.code, ' - ', c.code) AS c_o_code",

        "FROM companies_emplhour AS eh",
        "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
        "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",

        "INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)",
        "LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id)",
        "LEFT JOIN companies_wagecode AS wfc ON (wfc.id = eh.wagefactorcode_id)",

        "WHERE c.company_id = %(compid)s::INT",


    ]
    if paydatecode_pk:
        sql_keys['pdc_pk'] = paydatecode_pk
        sql_list.append("AND e.paydatecode_id = %(pdc_pk)s::INT")
    elif rosterdatefirst and rosterdatelast:
        sql_keys['rdf'] = rosterdatefirst
        sql_keys['rdl'] = rosterdatelast
        sql_list.append("AND eh.rosterdate >= %(rdf)s::DATE AND eh.rosterdate <= %(rdl)s::DATE")

    sql_list.append("ORDER BY eh.rosterdate, LOWER(e.namelast), LOWER(e.namefirst)")
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    afas_hours_rows = f.dictfetchall(newcursor)

    response = create_afas_hours_xlsx(period_dict, afas_hours_rows, user_lang, request)
    return response
# --- end of create_afas_hours_rows


def create_afas_hours_xlsx(period_dict, afas_hours_rows, user_lang, request):  # PR2021-02-13
    logger.debug(' ----- create_afas_hours_xlsx -----')

    # from https://stackoverflow.com/questions/16393242/xlsxwriter-object-save-as-http-response-to-create-download-in-django
    #logger.debug('period_dict: ' + str(period_dict))

# ---  create file Name and worksheet Name
    company_name = request.user.company.name
    today_dte = f.get_today_dateobj()
    today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)

    title = str(_('Export hours to AFAS'))
    file_name = title + " " + today_dte.isoformat() + ".xlsx"
    worksheet_name = str(_('Hours'))

# create the HttpResponse object ...
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = "attachment; filename=" + file_name

    field_captions = (str(_('Payroll period')), str(_('Year')), str(_('Period')), str(_('Date')),
                      str(_('Employee code')), str(_('Employee')), str(_('Company')),
                      str(_('Order code')), str(_('Order')),
                      str(_('Wage component')), str(_('Hours')),
                      str(_('Percentage')))

    field_names = ('pdc_code', 'pdi_year', 'pdi_period', 'eh_rosterdate',
                   'e_payrollcode', 'e_name',
                   'comp_id', 'o_identifier', 'c_o_code',
                   'wfc_code', 'eh_timeduration', 'wfc_wagerate')

    field_width = (25, 10, 10, 15,   20, 30,   10, 15, 25,   15,  10, 10 )

# .. and pass it into the XLSXWriter
    book = xlsxwriter.Workbook(response, {'in_memory': True})
    sheet = book.add_worksheet(worksheet_name)

    #cell_format = book.add_format({'bold': True, 'font_color': 'red'})
    bold = book.add_format({'bold': True})

    tblHead_format = book.add_format({'bold': True})
    tblHead_format.set_bottom()
    tblHead_format.set_bg_color('#d8d8d8') #   #d8d8d8;  /* light grey 218 218 218 100%

    for i, width in enumerate(field_width):
        sheet.set_column(i, i, width)

# --- title row
    # was: sheet.write(0, 0, str(_('Report')) + ':', bold)
    sheet.write(0, 0, str(_('Report')) + ':')
    sheet.write(0, 1, title)
    sheet.write(1, 0, str(_('Company')) + ':')
    sheet.write(1, 1, company_name)
    sheet.write(2, 0, str(_('Date')) + ':')
    sheet.write(2, 1, today_formatted)
# ---  period row
    paydatecode_code = period_dict.get('paydatecode_code')
    dates_display_short = period_dict.get('dates_display_short')
    paydateitem_period = str(period_dict.get('paydateitem_period'))
    paydateitem_year = str(period_dict.get('paydateitem_year', ''))

    row_index = 4
    sel_view = period_dict.get('sel_view')
    if sel_view == 'payroll_period':
        sheet.write(row_index, 0, str(_('Payroll period')) + ":")
        sheet.write(row_index, 1, paydatecode_code)
        row_index += 1
        sheet.write(row_index, 0,  str(_('Year')) + ":")
        sheet.write(row_index, 1, paydateitem_year)
        row_index += 1
        sheet.write(row_index, 0,  str(_('Period')) + ":")
        sheet.write(row_index, 1, paydateitem_period)
        row_index += 1
        sheet.write(row_index, 0,  str(_('Dates')) + ":")
        sheet.write(row_index, 1, dates_display_short)
        row_index += 3
    else:
        sheet.write(row_index, 0, str(_('Period')) + ":")
        sheet.write(row_index, 1, dates_display_short)
        row_index += 2

    for i, caption in enumerate(field_captions):
        sheet.write(row_index, i, caption, tblHead_format)

    if len(afas_hours_rows):
        for row in afas_hours_rows:
            row_index +=1
            for i, field_name in enumerate(field_names):
                value = row.get(field_name)
                logger.debug(field_name + str(value))
                if field_name == 'eh_rosterdate':
                    logger.debug('value: ' + str(value) + str(type(value)))
                    if value:
                        arr = value.split('-')
                        value = '-'.join((arr[2], arr[1], arr[0]))
                    else:
                        value = ''
                elif field_name =='wfc_wagerate':
                    percentage = "0"
                    if value:
                        logger.debug('value' + str(value))
                        percentage = str( value / 10000)
                        logger.debug('percentage' + str(percentage))
                    value = percentage
                elif field_name =='eh_timeduration':
                    value = str(value / 60) if value else "0"
                sheet.write(row_index, i, value)
    book.close()
    return response
# --- end of create_afas_hours_xlsx


def create_afas_ehal_rows(period_dict, user_lang, request):
    # --- create list of wagecodes filter by key_str of this company PR2020-06-17 PR2020-09-15 PR2021-01-30
    #     add messages to wagecode_rows
    logging_on = s.LOGGING_ON

    company_pk = request.user.company.pk
    rosterdatefirst, rosterdatelast, paydateitem_year, paydateitem_period = None, None, 0, 0
    paydatecode_pk, sel_view, dates = None, None, ''
    if period_dict:
        sel_view = period_dict.get('sel_view')
        if sel_view == 'payroll_period':
            paydateitem_year = period_dict.get('paydateitem_year')
            paydateitem_period = period_dict.get('paydateitem_period')
            paydatecode_pk = period_dict.get('paydatecode_pk')
        else:
            rosterdatefirst = period_dict.get('period_datefirst')
            rosterdatelast = period_dict.get('period_datelast')
            dates = period_dict.get('dates_display_short')

    sql_keys = {'compid': company_pk}
    if sel_view == 'payroll_period':
        sql_keys['year'] = paydateitem_year
        sql_keys['period'] = paydateitem_period
        pdc_line = "pdc.code AS pdc_code, %(year)s::TEXT AS pdi_year, %(period)s::TEXT AS pdi_period,"
    else:
        sql_keys['dates'] = dates
        pdc_line = "pdc.code AS pdc_code, (EXTRACT(YEAR FROM eh.rosterdate))::TEXT AS pdi_year, '' AS pdi_period,"

    sql_list = [
        "SELECT alw.id, comp.id AS comp_id, comp.identifier AS comp_identifier,",
        "alw.code AS alw_code, alw.description AS alw_description,"
        "ehal.rate AS ehal_rate, ehal.quantity AS ehal_quantity, ehal.amount AS ehal_amount,"
        "eh.rosterdate AS eh_rosterdate,",
         pdc_line,
        "e.payrollcode AS e_payrollcode, CONCAT(e.namelast, ', ', e.namefirst) AS e_name,",
        "o.identifier AS o_identifier, CONCAT(o.code, ' - ', c.code) AS c_o_code",

        "FROM companies_emplhourallowance AS ehal",
        "INNER JOIN companies_wagecode AS alw ON (alw.id = ehal.allowancecode_id)",
        "INNER JOIN companies_emplhour AS eh ON (eh.id = ehal.emplhour_id)",
        "INNER JOIN companies_employee AS e ON (e.id = eh.employee_id)",
        "LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id)",

        "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
        "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
        "INNER JOIN companies_company AS comp ON (comp.id = c.company_id)",
        "WHERE comp.id = %(compid)s::INT"
    ]
    if paydatecode_pk:
        sql_keys['pdc_pk'] = paydatecode_pk
        sql_list.append("AND e.paydatecode_id = %(pdc_pk)s::INT")
    elif rosterdatefirst and rosterdatelast:
        sql_keys['rdf'] = rosterdatefirst
        sql_keys['rdl'] = rosterdatelast
        sql_list.append("AND eh.rosterdate >= %(rdf)s::DATE AND eh.rosterdate <= %(rdl)s::DATE")

    sql_list.append("ORDER BY eh.rosterdate, LOWER(e.namelast), LOWER(e.namefirst)")
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    afas_ehal_rows = f.dictfetchall(newcursor)

    response = create_afas_ehal_xlsx(period_dict, afas_ehal_rows, user_lang, request)
    return response
# --- end of create_afas_ehal_rows


def create_afas_ehal_xlsx(period_dict, afas_ehal_rows, user_lang, request):  # PR2021-02-13
    logging_on = s.LOGGING_ON
    if logging_on:
        logger.debug(' ----- create_afas_ehal_xlsx -----')

    # from https://stackoverflow.com/questions/16393242/xlsxwriter-object-save-as-http-response-to-create-download-in-django
    #logger.debug('period_dict: ' + str(period_dict))

# ---  create file Name and worksheet Name
    company_name = request.user.company.name
    today_dte = f.get_today_dateobj()
    today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)

    title = str(_('Export allowances to AFAS'))
    file_name = title + " " + today_dte.isoformat() + ".xlsx"
    worksheet_name = str(_('Allowances'))

# create the HttpResponse object ...
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = "attachment; filename=" + file_name

    field_captions = (str(_('Payroll period')), str(_('Year')), str(_('Period')), str(_('Date')),
                      str(_('Employee code')), str(_('Employee')), str(_('Company')),
                      str(_('Order code')), str(_('Order')),
                      str(_('Wage component')), str(_('Description')),
                      str(_('Rate')), str(_('Quantity')), str(_('Amount')))

    field_names = ('pdc_code', 'pdi_year', 'pdi_period', 'eh_rosterdate', 'e_payrollcode', 'e_name',
                   'comp_identifier', 'o_identifier', 'c_o_code', 'alw_code', 'alw_description',
                   'ehal_rate', 'ehal_quantity', 'ehal_amount')

    field_width = (25, 10, 10, 10,   15, 30,   10, 15, 25, 15, 25,    10, 10, 10)

# .. and pass it into the XLSXWriter
    book = xlsxwriter.Workbook(response, {'in_memory': True})
    sheet = book.add_worksheet(worksheet_name)

    #cell_format = book.add_format({'bold': True, 'font_color': 'red'})
    bold = book.add_format({'bold': True})

    tblHead_format = book.add_format({'bold': True})
    tblHead_format.set_bottom()
    tblHead_format.set_bg_color('#d8d8d8') #   #d8d8d8;  /* light grey 218 218 218 100%

    for i, width in enumerate(field_width):
        sheet.set_column(i, i, width)

# --- title row
    # was: sheet.write(0, 0, str(_('Report')) + ':', bold)
    sheet.write(0, 0, str(_('Report')) + ':')
    sheet.write(0, 1, title)
    sheet.write(1, 0, str(_('Company')) + ':')
    sheet.write(1, 1, company_name)
    sheet.write(2, 0, str(_('Created on')) + ':')
    sheet.write(2, 1, today_formatted)

# ---  period row
    paydatecode_code = period_dict.get('paydatecode_code')
    dates_display_short = period_dict.get('dates_display_short')
    paydateitem_period = str(period_dict.get('paydateitem_period'))
    paydateitem_year = str(period_dict.get('paydateitem_year', ''))

    row_index = 4
    sel_view = period_dict.get('sel_view')
    if sel_view == 'payroll_period':
        sheet.write(row_index, 0, str(_('Payroll period')) + ":")
        sheet.write(row_index, 1, paydatecode_code)
        row_index += 1
        sheet.write(row_index, 0,  str(_('Year')) + ":")
        sheet.write(row_index, 1, paydateitem_year)
        row_index += 1
        sheet.write(row_index, 0,  str(_('Period')) + ":")
        sheet.write(row_index, 1, paydateitem_period)
        row_index += 1
        sheet.write(row_index, 0,  str(_('Dates')) + ":")
        sheet.write(row_index, 1, dates_display_short)
        row_index += 3
    else:
        sheet.write(row_index, 0, str(_('Period')) + ":")
        sheet.write(row_index, 1, dates_display_short)
        row_index += 2

    for i, caption in enumerate(field_captions):
        sheet.write(row_index, i, caption, tblHead_format)

    rows_length = len(afas_ehal_rows)
    if rows_length:
        #first_detail_row = row_index + 1
        #last_detail_row = row_index + rows_length
        for row in afas_ehal_rows:
            row_index +=1
            for i, field_name in enumerate(field_names):
                value = row.get(field_name)

                if value is not None:
                    if field_name == 'eh_rosterdate':
                        year = str(value.year)
                        month = ('0' + str(value.month))[-2:]
                        day = ('0' + str(value.day))[-2:]
                        value = '-'.join((day, month, year))
                        if logging_on:
                            logger.debug('value: ' + str(value) + ' value' + str(type(value)))

                    elif field_name in ('ehal_rate', 'ehal_amount'):
                        value = str(value / 100)
                    elif field_name =='ehal_quantity':
                        value = str(value / 10000)
                    sheet.write(row_index, i, value)
        """
        AFAS sheets use text, not numbers. Cannot use SUM here.
        if rows_length > 1:
            row_index += 2
            for i, field_name in enumerate(field_names):

                upper_cell_ref = xl_rowcol_to_cell(first_detail_row, i)  # cell_ref: 10,0 > A11
                lower_cell_ref = xl_rowcol_to_cell(last_detail_row, i)  # cell_ref: 10,0 > A11

                sum_cell_ref = xl_rowcol_to_cell(row_index, i)  # cell_ref: 10,0 > A11
                print('cell_ref: ' + str(row_index) + ',' + str( i) + ' > ' + str(sum_cell_ref))

                formula = ''.join(['=SUM(', upper_cell_ref, ':', lower_cell_ref,')'])
                sheet.write_formula(sum_cell_ref, formula)
        """
    book.close()
    return response

# --- end of create_afas_ehal_xlsx

#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

def create_afas_invoice_rows(period_dict, customer_list, order_list, hidden_fields_list, user_lang, request):
    # --- create_afas_invoice_rows PR2021-01-30 PR2021-03-31 PR2021-04-17
    logging_on = False # s.LOGGING_ON
    if logging_on:
        logger.debug('===== create_afas_invoice_rows ===== ')

    rows = []

    company_pk = request.user.company.pk
    if company_pk and period_dict and (customer_list or order_list):
        rosterdatefirst = period_dict.get('period_datefirst')
        rosterdatelast = period_dict.get('period_datelast')

        sql_keys = {'compid': company_pk, 'df': rosterdatefirst, 'dl': rosterdatelast}

        if logging_on:
            logger.debug(' --- create_ehal_afas_rows --- ')
            logger.debug('rosterdatefirst: ' + str(rosterdatefirst))
            logger.debug('rosterdatelast:  ' + str(rosterdatelast))
            logger.debug('customer_list:   ' + str(customer_list))
            logger.debug('order_list:   ' + str(order_list))

        # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
        sql_list = ["WITH eh_sub AS (SELECT eh.orderhour_id AS oh_id,",
                                                    "ARRAY_AGG(eh.id) AS eh_id_agg,",
                                                    "ARRAY_AGG(eh.employee_id) AS e_id,",
                                                    "COALESCE(STRING_AGG(DISTINCT e.code, '; '),'---') AS e_code,",
                                                    "ARRAY_AGG(DISTINCT e.code) AS e_code_agg,",
                                                    "ARRAY_AGG(eh.timeduration) AS eh_timedur_agg,",
                                                    "ARRAY_AGG(eh.pricerate) AS eh_pricerate_agg,",

                                                    "SUM(eh.plannedduration) AS eh_plandur_sum,",
                                                    "SUM(eh.timeduration) AS eh_timedur_sum,",
                                                    "SUM(eh.billingduration) AS eh_billdur_sum,",
                                                    "SUM(eh.amount) AS eh_amount_sum,",
                                                    "SUM(eh.addition) AS eh_add_sum,",
                                                    "SUM(eh.tax) AS eh_tax_sum",
                                                    # TODO check if this can replace python aclculation, if not: delete
                                                    #"(SUM(eh.amount) + SUM(eh.addition)) / NULLIF( (SUM(eh.billingduration) / 60) , 0 ) AS oh_pricerate_calc",

                                                    "FROM companies_emplhour AS eh",
                                                    "LEFT OUTER JOIN companies_employee AS e ON (eh.employee_id=e.id)",
                                                    "GROUP BY oh_id)",

                                           "SELECT COALESCE(c.code,'-') AS c_code,  COALESCE(o.code,'-') AS o_code,",
                                           "c.identifier AS c_identifier, eh_sub.e_code AS e_code, ",
                                           #"to_json(oh.rosterdate) AS rosterdate_str,",
                                           "oh.rosterdate AS oh_rosterdate, ",
                                           "oh.id AS oh_id, o.id AS ordr_id, c.id AS cust_id, c.company_id AS comp_id,",
                                           "eh_sub.e_code_agg AS e_code_agg, eh_sub.eh_id_agg AS eh_id_agg,",
                                            "eh_sub.e_id AS e_id_arr, eh_sub.eh_pricerate_agg,",

                                           "oh.shiftcode AS oh_shiftcode, oh.isbillable AS oh_bill,",
                                           "oh.additionrate AS oh_addrate, oh.taxrate AS oh_taxrate, ",
                                           # "oh_pricerate_calc,",

                                           "eh_sub.eh_plandur_sum, eh_sub.eh_timedur_sum, eh_sub.eh_billdur_sum,",
                                           "eh_sub.eh_amount_sum, eh_sub.eh_add_sum, eh_sub.eh_tax_sum, eh_sub.eh_timedur_agg",

                                           "FROM companies_orderhour AS oh",
                                           "INNER JOIN eh_sub ON (eh_sub.oh_id=oh.id)",
                                           "INNER JOIN companies_order AS o ON (oh.order_id=o.id)",
                                           "INNER JOIN companies_customer AS c ON (o.customer_id=c.id)",

                                           "WHERE (c.company_id = %(compid)s) AND NOT c.isabsence AND NOT oh.isrestshift",
                                           "AND (oh.rosterdate >= %(df)s) AND (oh.rosterdate <= %(dl)s)",
                                   ]
        if customer_list and order_list:
            sql_keys['cid_arr'] = customer_list
            sql_keys['oid_arr'] = order_list
            sql_list.append("AND ( c.id IN (SELECT UNNEST( %(cid_arr)s::INT[])) OR o.id IN (SELECT UNNEST( %(oid_arr)s::INT[])) )")
        elif customer_list:
            sql_keys['cid_arr'] = customer_list
            sql_list.append("AND c.id IN (SELECT UNNEST( %(cid_arr)s::INT[]))")
        elif order_list:
            sql_keys['oid_arr'] = order_list
            sql_list.append("AND o.id IN (SELECT UNNEST( %(oid_arr)s::INT[]))")

        sql_list.append("ORDER BY LOWER(c.code), c.id, LOWER(o.code), o.id, oh.rosterdate, LOWER(eh_sub.e_code)")
        sql = ' '.join(sql_list)

        with connection.cursor() as cursor:
            cursor.execute(sql, sql_keys)
            rows = f.dictfetchall(cursor)

        if logging_on:
            logger.debug('sql: ' + str(sql))
            logger.debug('rows: ' + str(rows))

    response = create_afas_invoice_xlsx(period_dict, rows, hidden_fields_list, user_lang, request)
    return response
# --- end of create_afas_invoice_rows


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_afas_invoice_xlsx(period_dict, afas_ehal_rows, hidden_fields_list, user_lang, request):  # PR2021-02-13 PR2021-04-17
    logging_on = False # s.LOGGING_ON
    if logging_on:
        logger.debug(' ----- create_afas_invoice_xlsx -----')

    # from https://stackoverflow.com/questions/16393242/xlsxwriter-object-save-as-http-response-to-create-download-in-django

    # To change the decimal precision, you call decimal.getcontext() and set the .prec attribute.
    getcontext().prec = 10

# ---  create file Name and worksheet Name
    company_name = request.user.company.name
    today_dte = f.get_today_dateobj()
    today_formatted = f.format_WDMY_from_dte(today_dte, user_lang)

    title = str(_('Export invoice to AFAS'))
    file_name = title + " " + today_dte.isoformat() + ".xlsx"
    worksheet_name = str(_('Invoices'))

# create the HttpResponse object ...
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = "attachment; filename=" + file_name

# .. and pass it into the XLSXWriter
    book = xlsxwriter.Workbook(response, {'in_memory': True})
    sheet = book.add_worksheet(worksheet_name)

    #cell_format = book.add_format({'bold': True, 'font_color': 'red'})
    bold = book.add_format({'bold': True})

    tblHead_format = book.add_format({'bold': True})
    tblHead_format.set_bottom()
    tblHead_format.set_bg_color('#d8d8d8') #   #d8d8d8;  /* light grey 218 218 218 100%
    col_index = 0
    for field in c.AFAS_INVOICE_FIELD_LIST:
        if field not in ('headerrows', 'totalrow') and field not in hidden_fields_list:
            #  set_column(first_col, last_col, width, cell_format, options)
            width = f.get_dict_value(c.AFAS_INVOICE_FIELDS, (field,'width'))
            sheet.set_column(col_index, col_index, width)
            col_index += 1

# --- title row
    if 'headerrows' not in hidden_fields_list:
        sheet.write(0, 0, str(_('Report')) + ':', bold)
        sheet.write(1, 0, str(_('Company')) + ':', bold)
        sheet.write(2, 0, str(_('Report date')) + ':', bold)
        sheet.write(0, 1, title, bold)
        sheet.write(1, 1, company_name, bold)
        sheet.write(2, 1, today_formatted, bold)

    # ---  period row
        dates_display_short = period_dict.get('dates_display_short')

        sheet.write(5, 0,  str(_('Period')) + ":")
        sheet.write(5, 1, dates_display_short)

        row_index = 7
    else:
        row_index = 0

    col_index = 0
    for field in c.AFAS_INVOICE_FIELD_LIST:
        if field not in ('headerrows', 'totalrow') and field not in hidden_fields_list:
            #  set_column(first_col, last_col, width, cell_format, options)
            caption = str(f.get_dict_value(c.AFAS_INVOICE_FIELDS, (field, 'caption')))
            sheet.write(row_index, col_index, caption, tblHead_format)
            col_index += 1

    total_plandur = 0
    total_timedur = 0
    total_billdur = 0
    total_amount = 0

    if len(afas_ehal_rows):
        for row in afas_ehal_rows:
            row_index += 1

            billdur_sum = row.get('eh_billdur_sum', 0)
            amount_sum = row.get('eh_amount_sum', 0)
            addition_sum = row.get('eh_add_sum', 0)

            total_plandur += row.get('eh_plandur_sum', 0)
            total_timedur += row.get('eh_timedur_sum', 0)
            total_billdur += billdur_sum
            total_amount += (amount_sum + addition_sum)

            hours_decimal = Decimal(str(billdur_sum)) / Decimal("60")
            total_decimal = ( Decimal(str(amount_sum)) +  Decimal(str(addition_sum)) ) / Decimal('100')

            if logging_on:
                logger.debug('------------- ')
                logger.debug('billdur_sum: ' + str(billdur_sum) + ' ' + str(type(billdur_sum)))
                logger.debug('amount_sum: ' + str(amount_sum) + ' ' + str(type(amount_sum)))
                logger.debug('addition_sum: ' + str(addition_sum) + ' ' + str(type(addition_sum)))
                logger.debug('total_decimal: ' + str(total_decimal) + ' ' + str(type(total_decimal)))
                logger.debug('hours_decimal: ' + str(hours_decimal) + ' ' + str(type(hours_decimal)))

            col_index = 0
            for field_name in c.AFAS_INVOICE_FIELD_LIST:
                if field_name not in ('headerrows', 'totalrow') and field_name not in hidden_fields_list:
                    if field_name == 'oh_rosterdate':
                        value = row.get(field_name)
                        display = '-'.join((('0' + str(value.day))[-2:], ('0' + str(value.month))[-2:], str(value.year)))
                    elif field_name in ('eh_plandur_sum', 'eh_timedur_sum', 'eh_billdur_sum'):
                        value = row.get(field_name)
                        if value:
                            value_decimal = Decimal(str(value / 60)).quantize(Decimal("1.00"), rounding='ROUND_HALF_UP')
                            display = str(value_decimal).replace(',', '.')
                        else:
                            display = '0'
                    elif field_name == 'eh_amount_sum':
                        if amount_sum or addition_sum:
                            total_rounded = total_decimal.quantize(Decimal("1.00"), rounding='ROUND_HALF_UP')
                            display = str(total_rounded).replace(',', '.')
                        else:
                            display = '0'

                    elif field_name == 'oh_pricerate_calc':
                        # can be replaced by vaulue of oh_pricerate_calc
                        if billdur_sum:
                            rate = total_decimal / hours_decimal
                            rate_decimal = rate.quantize(Decimal("1.00"), rounding='ROUND_HALF_UP')
                            display = str(rate_decimal).replace(',', '.')
                        else:
                            display = '0'
                    else:
                        display = row.get(field_name)
                    sheet.write(row_index, col_index, display)
                    col_index += 1

# print total row
    if 'totalrow' not in hidden_fields_list:
        row_index += 2
        col_index = 0
        for field_name in c.AFAS_INVOICE_FIELD_LIST:
            if field_name not in ('headerrows', 'totalrow') and field_name not in hidden_fields_list:
                display = ''
                if field_name == 'c_identifier':
                    display = str(_('Total'))
                elif field_name in ('eh_plandur_sum', 'eh_timedur_sum', 'eh_billdur_sum'):
                    total_dur = 0
                    if field_name == 'eh_plandur_sum':
                        total_dur = total_plandur
                    elif field_name == 'eh_timedur_sum':
                        total_dur = total_timedur
                    elif field_name == 'eh_billdur_sum':
                        total_dur = total_billdur
                    if total_dur:
                        dur_decimal = Decimal(str(total_dur)) / Decimal("60")
                        dur_rounded = dur_decimal.quantize(Decimal("1.00"), rounding='ROUND_HALF_UP')
                        display = str(dur_rounded).replace(',', '.')
                    else:
                        display = '0'
                elif field_name == 'oh_pricerate_calc':
                    if total_billdur:
                        amount_decimal = Decimal(str(total_amount)) / Decimal("100")
                        billdur_decimal = Decimal(str(total_billdur)) / Decimal("60")
                        rate_decimal = amount_decimal / billdur_decimal
                        rate_rounded = rate_decimal.quantize(Decimal("1.00"), rounding='ROUND_HALF_UP')
                        display = str(rate_rounded).replace(',', '.')
                    else:
                        display = '0'
                elif field_name == 'eh_amount_sum':
                    if total_amount :
                        amount_decimal = Decimal(str(total_amount)) / Decimal("100")
                        amount_rounded = amount_decimal.quantize(Decimal("1.00"), rounding='ROUND_HALF_UP')
                        display = str(amount_rounded).replace(',', '.')
                    else:
                        display = '0'

                sheet.write(row_index, col_index, display, tblHead_format)
                col_index += 1

    book.close()
    return response

# --- end of create_afas_invoice_xlsx
#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_payroll_allowance_rows(period_dict, comp_timezone, timeformat, user_lang, request):  # PR2021-01-31
    #logger.debug(' ============= create_payroll_allowance_rows ============= ')
    #logger.debug('period_dict: ' + str(period_dict))

    company_pk = request.user.company.pk

    rosterdatefirst, rosterdatelast = None, None
    if period_dict:
        rosterdatefirst = period_dict.get('period_datefirst')
        rosterdatelast = period_dict.get('period_datelast')
    #emplhour_pk_list = period_dict.get('eplh_update_list')

    #logger.debug('rosterdatefirst: ' + str(rosterdatefirst))
    #logger.debug('rosterdatelast: ' + str(rosterdatelast))

    emplhourallowance_rows = {}
    sql_list = []
    sql_keys = {'comp_id': company_pk, 'rdf': rosterdatefirst, 'rdl': rosterdatelast}

    if company_pk and rosterdatefirst and rosterdatelast:
        ehal_list = ["SELECT ehal.id, ehal.emplhour_id, ehal.quantity, ehal.amount, ehal.modifiedat,",
            "alw.id AS alw_id, alw.code, alw.description, alw.wagerate,",
            "COALESCE(SUBSTRING (u.username, 7), '') AS modifiedby",
            "FROM companies_emplhourallowance AS ehal",
            "INNER JOIN companies_wagecode AS alw ON (alw.id = ehal.allowancecode_id)  ",
            "LEFT JOIN accounts_user AS u ON (u.id = ehal.modifiedby_id)"]
        ehal_sub = ' '.join(ehal_list)

        ehal_group_list = [
            "SELECT ehal.emplhour_id,",
            "ARRAY_AGG(ehal.id ORDER BY ehal.id) AS ehal_id_agg,",
            "ARRAY_AGG(ehal.alw_id ORDER BY ehal.id) AS alw_id_agg,",
            "ARRAY_AGG(ehal.code ORDER BY ehal.id) AS code_agg,",
            "ARRAY_AGG(ehal.description ORDER BY ehal.id) AS description_agg,",
            "ARRAY_AGG(ehal.wagerate ORDER BY ehal.id) AS wagerate_agg,",
            "ARRAY_AGG(ehal.quantity ORDER BY ehal.id) AS quantity_agg,",
            "ARRAY_AGG(ehal.amount ORDER BY ehal.id) AS amount_agg,",
            "ARRAY_AGG(ehal.modifiedby ORDER BY ehal.id) AS modifiedby_agg,",
            "ARRAY_AGG(ehal.modifiedat ORDER BY ehal.id) AS modifiedat_agg",

            "FROM (" + ehal_sub + ") AS ehal",
            "GROUP BY ehal.emplhour_id"]

        ehal_group = ' '.join(ehal_group_list)

        eh_list = [
            "SELECT eh.id AS emplhour_id, eh.rosterdate, eh.employee_id AS e_id, e.code AS e_code,",
            "e.identifier AS e_identifier, e.payrollcode AS e_payrollcode, oh.id AS oh_id,",
            "o.id AS o_id, o.code AS o_code, o.identifier AS o_identifier,",
            "c.code AS c_code, c.isabsence, CONCAT(c.code, ' - ', o.code) AS c_o_code,",

            "eh.functioncode_id AS fnc_id, fnc.code AS fnc_code, pdc.id AS pdc_id, pdc.code AS pdc_code,",
            "eh.wagefactorcode_id AS wfc_id, eh.wagefactorcaption AS wfc_code, eh.wagefactor AS wfc_rate, eh.nohours,",
            "eh.wagecode_id AS wgc_id, eh.wagerate, eh.wage,",

            "ehal.ehal_id_agg, ehal.alw_id_agg, ehal.code_agg, ehal.description_agg, ehal.wagerate_agg,",
            "ehal.quantity_agg, ehal.amount_agg, ehal.modifiedby_agg, ehal.modifiedat_agg",

            "FROM companies_emplhour AS eh",
            "INNER JOIN (" + ehal_group + ") AS ehal ON (ehal.emplhour_id = eh.id)",
            "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
            "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
            "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",

            "LEFT JOIN companies_employee AS e ON (e.id = eh.employee_id)",

           "LEFT JOIN companies_wagecode AS fnc ON (fnc.id = eh.functioncode_id)",
           "LEFT JOIN companies_wagecode AS wfc ON (wfc.id = eh.wagefactorcode_id) ",
           "LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = eh.paydatecode_id)",

            "AND eh.rosterdate >= %(rdf)s::DATE AND eh.rosterdate <= %(rdl)s::DATE",
            "WHERE c.company_id = %(comp_id)s::INT"]
        sql = ' '.join(eh_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        emplhourallowance_rows = f.dictfetchall(newcursor)

    return emplhourallowance_rows
# - end of create_payroll_allowance_rows


def create_employeenote_rows(period_dict, request):  # PR2021-02-16
    #logger.debug(' ============= create_employeenote_rows ============= ')
    #logger.debug('period_dict: ' + str(period_dict))

    company_pk = request.user.company.pk

    rosterdatefirst, rosterdatelast, employee_pk_list = None, None, None
    if period_dict:
        rosterdatefirst = period_dict.get('period_datefirst')
        rosterdatelast = period_dict.get('period_datelast')
        employee_pk_list = period_dict.get('employee_pk_list')

    employeenote_rows = {}

    sql_keys = {'comp_id': company_pk}
    if company_pk:
        sql_sub_list = ["SELECT en.id, en.employee_id, en.note, en.modifiedat,",
             "COALESCE(SUBSTRING (u.username, 7), '') AS modifiedby",
            "FROM companies_employeenote AS en",
            "LEFT JOIN accounts_user AS u ON (u.id = en.modifiedby_id)",
            "ORDER BY en.modifiedat"]
        sql_sub = ' '.join(sql_sub_list)
        sql_list = ["SELECT e.id,",
            "ARRAY_AGG(en_sub.id ORDER BY en_sub.id) AS id_agg,",
            "ARRAY_AGG(en_sub.note ORDER BY en_sub.id) AS note_agg,",
            "ARRAY_AGG(en_sub.modifiedby ORDER BY en_sub.id) AS modifiedby_agg,",
            "ARRAY_AGG(en_sub.modifiedat ORDER BY en_sub.id) AS modifiedat_agg",

            "FROM companies_employee AS e",
            "INNER JOIN (" + sql_sub + ") AS en_sub ON (en_sub.employee_id = e.id)",
            "WHERE e.company_id = %(comp_id)s::INT"]

        if employee_pk_list:
            sql_keys['e_id_arr'] = employee_pk_list
            sql_list.append('AND e.id IN ( SELECT UNNEST( %(e_id_arr)s::INT[] ) )')

        elif rosterdatefirst and rosterdatelast:
            sql_keys['rdf'] = rosterdatefirst
            sql_keys['rdl'] = rosterdatelast
            sql_list.append('AND e.datelast >= %(rdf)s::DATE AND e.datefirst <= %(rdl)s::DATE')

        sql_list.append('GROUP BY e.id')
        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        employeenote_rows = f.dictfetchrows(newcursor)

    return employeenote_rows
# - end of create_employeenote_rows