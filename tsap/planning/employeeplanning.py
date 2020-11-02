# PR2019-03-24 PR2020-10-25
from django.db import connection

from django.utils.translation import ugettext_lazy as _
from datetime import timedelta
from timeit import default_timer as timer

from tsap import functions as f

import logging
logger = logging.getLogger(__name__)


def create_employee_planningNEW(planning_period_dict, datalists, comp_timezone, request):  #PR2020-10-25
    #logger.debug('   ')
    #logger.debug(' ++++++++++++++  create_employee_planningNEW  ++++++++++++++ ')
    #logger.debug('planning_period_dict: ' + str(planning_period_dict))

    datefirst_iso = planning_period_dict.get('period_datefirst')
    datelast_iso = planning_period_dict.get('period_datelast')
    include_inactive = planning_period_dict.get('include_inactive')
    employee_pk_list = planning_period_dict.get('employee_pk_list')
    functioncode_pk_list = planning_period_dict.get('functioncode_pk_list')

    if datefirst_iso and datelast_iso:
        # - convert datefirst and datelast into date_objects
        datefirst_dte = f.get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_dte = f.get_date_from_ISO(datelast_iso)

        # - check if calendar contains dates of this year, fill if necessary
        starttime = timer()
        f.check_and_fill_calendar(datefirst_dte, datelast_dte, request)
        #logger.debug( 'check_and_fill_calendar.extend: ' + str(time() - starttime))
        planning_list = []
        customer_dictlist = {}
        order_dictlist = {}
        # ---  create employee_list with employees:
        # - not inactive
        # - in service on rosterdate
        # calculate for each rosterdate, to get proper 'in service' value

        employee_dictlist = create_employee_dictlist(request=request,
                                                     datefirst_iso=datefirst_iso,
                                                     datelast_iso=datelast_iso,
                                                     employee_pk_list=employee_pk_list,
                                                     functioncode_pk_list=functioncode_pk_list)

# +++++ +++++ +++++ +++++ +++++ +++++
# +++++ loop through dates +++++
        rosterdate_dte = datefirst_dte
        while rosterdate_dte <= datelast_dte:
# ---  get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this rosterdate
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)
            rosterdate_iso = rosterdate_dte.isoformat()
            #logger.debug('  ===================  rosterdate_iso: ' + str(rosterdate_iso) + ' ===================')

            #logger.debug( 'employee_dictlist: ' + str(employee_dictlist))
            #for key, value in employee_dictlist.items():
            #    logger.debug( 'employee_dict: ' + str(key) + ' code: ' + str(value.get('code', '---')))

# ---  create list of teammember- / absence- / restshifts of this rosterdate with employee of this rosterdate
            # PR2020-10-13
            # Why two dictlists? : one with only key=e_id and value = arr(tm_si_id)
            #                      other with key tm_si_id and values of teammember;
            # instead of everything in AGGARR: because it must be possible to delete double abensce shifts. Is only possible with separate tm  abs listlsit

            # eid_tmsid_arr:  {2608: ['2084_4170', '2058_3826']}
            eid_tmsid_arr = get_eid_tmsid_arr(
                request=request,
                rosterdate_iso=rosterdate_iso,
                is_publicholiday=is_publicholiday,
                is_companyholiday=is_companyholiday,
                absrest_only=False,
                employee_pk_list=employee_pk_list,
                functioncode_pk_list=functioncode_pk_list
            )

# ---  create list with info of teammember- / absence- / restshifts of this rosterdate
            #  tm_si_id_info = { '1802_3998': {'tm_si_id': '1802_3998', 'tm_id': 1802, 'si_id': 3998, 'e_id': 2620,
            #                                       'rpl_id': 2619, 'switch_id': None, 'isabs': False, 'isrest': True,
            #                                       'sh_os_nonull': 0, 'sh_oe_nonull': 1440, 'o_seq': -1},
            tm_si_id_info = get_teammember_info (
                request=request,
                rosterdate_iso=rosterdate_iso,
                is_publicholiday=is_publicholiday,
                is_companyholiday=is_companyholiday,
                employee_pk_list=employee_pk_list,
                functioncode_pk_list=functioncode_pk_list
            )

# ---  remove overlapping absence- / restshifts
            remove_double_absence_restrows(eid_tmsid_arr, tm_si_id_info)  # PR2020-10-23
            #logger.debug('----- tm_si_id_info after remove: ')
            #for key, value in tm_si_id_info.items():
            #    logger.debug('     ' + str(key) + ': ' + str(value))

# ---  create list of teammembers:
            # - this company
            # - not istemplate,
            # - with absence, also when absence_order is inactive (is that ok?)
            # - customer, order, scheme not inactive, except when isabsence
            # - with rosterdate within range datefirst-datelast of teammember, scheme and order
            # - with schemeitem that matches rosterdate or is divergentonpublicholiday schemeitem when is_publicholiday
            teammember_list = create_teammember_list(request=request,
                                    rosterdate_iso=rosterdate_iso,
                                    is_publicholiday=is_publicholiday,
                                    is_companyholiday=is_companyholiday)

# ---  loop through list of teammembers:
            for i, row in enumerate(teammember_list):

                #logger.debug(' ')
                #logger.debug(' ------------------- row  -------------------------------')
                #logger.debug('row: ' + str(row))
                # TODO create filter
                employee_pk, functioncode_pk, paydatecode_pk = None, None, None
                skip_absence_and_restshifts, add_shifts_without_employee = False, False

                # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
                add_row = calculate_add_row_to_dictNEW(
                    row=row,
                    employee_dictlist=employee_dictlist,
                    eid_tmsid_arr=eid_tmsid_arr,
                    tm_si_id_info=tm_si_id_info,
                    rosterdate_dte=rosterdate_dte,
                    filter_employee_pk=employee_pk,
                    filter_functioncode_pk=functioncode_pk,
                    filter_paydatecode_pk=paydatecode_pk,
                    skip_absence_and_restshifts=skip_absence_and_restshifts,
                    add_shifts_without_employee=add_shifts_without_employee
                    )
                # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
                # logger.debug( 'row: ' + str(row))

# - add row to planning
                if add_row:
                    planning_dict = add_row_to_planning(
                            row=row,
                            rosterdate_dte=rosterdate_dte,
                            employee_dictlist=employee_dictlist,
                            customer_dictlist=customer_dictlist,
                            order_dictlist=order_dictlist,
                            is_saturday=is_saturday,
                            is_sunday=is_sunday,
                            is_publicholiday=is_publicholiday,
                            is_companyholiday=is_companyholiday,
                            comp_timezone=comp_timezone,
                            request=request)
                    if planning_dict:
                        planning_list.append(planning_dict)

# - add one day to rosterdate
            rosterdate_dte = rosterdate_dte + timedelta(days=1)
# +++++ end of loop through dates
# +++++ +++++ +++++ +++++ +++++ +++++

# - sort rows  - not in use
        # from https://stackoverflow.com/questions/5212870/sorting-a-python-list-by-two-fields
        # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
        # caused bij idx_e_code = None. Coalesce added in query.
        #  Idem with idx_sh_os_nonull. idx_sh_os must stay, may have null value for updating
        # sorted_rows = sorted(employee_dictlist, key=operator.itemgetter('c_code', 'o_code'))

        # from https://stackoverflow.com/questions/1143671/how-to-sort-objects-by-multiple-keys-in-python
        #sorted_rows = sorted(planning_list, key=lambda k: (k['e_code'].lower(), k['rosterdate'], k['c_o_code'].lower()))
        #logger.debug('sorted_rows' + str(sorted_rows))

# PR2020-05-23 debug: datalists = {} gives parse error.
        # elapsed_seconds to the rescue: now datalists will never be empty
        elapsed_seconds = timer() - starttime
        datalists['employee_planning_list_elapsed_seconds'] = elapsed_seconds

        datalists['employee_planning_listNEW'] = planning_list
        datalists['employee_planning_customer_dictlist'] = customer_dictlist
        datalists['employee_planning_order_dictlist'] = order_dictlist


def add_row_to_planning(row, rosterdate_dte, employee_dictlist, customer_dictlist, order_dictlist, is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                           comp_timezone, request):  # PR2020-01-5 PR2020-08-14
    #logger.debug(' ============= add_orderhour_emplhour ============= ')
    #logger.debug('row: ' + str(row))
    """
    row: {'tm_id': 1975, 'tm_si_id': '1975_4000', 'tm_rd': datetime.date(2020, 10, 26), 't_id': 2905, 't_code': 'Agata', 
    's_id': 2356, 's_code': 'Agata', 'o_id': 1521, 'o_code': 'Piscadera', 'o_identifier': 'O-008', 'c_id': 749, 'c_code': 'Centrum', 'comp_id': 3, 
    'si_id': 4000, 'sh_id': 1517, 'sh_code': '08.30 - 17.00', 'sh_isbill': True, 'o_seq': -1, 'si_mod': 'n',
     'e_id': 2625, 'rpl_id': None, 'switch_id': None, 'tm_df': None, 'tm_dl': None, 
     's_df': None, 's_dl': None, 's_cycle': 1, 's_exph': False, 's_exch': False, 's_dvgph': False, 
     'o_s_nosat': False, 'o_s_nosun': False, 'o_s_noph': False, 'o_s_noch': False, 
     'sh_os': 510, 'sh_oe': 1020, 'sh_bd': 90, 'sh_td': 420, 'sh_wfc_id': 11, 'sh_wfc_code': 'W100', 'sh_wfc_rate': 1000000, 'o_nopay': False, 
     'isreplacement': False}
    """

    planning_dict_short = {}
    if row:
        e_id = row.get('e_id')
        e_code, e_identifier, e_payrollcode = None, None, None
        e_fnc_id, e_fnc_code, e_wgc_id, e_wgc_code,  e_pdc_id, e_pdc_code = None, None, None, None, None, None

        if e_id:
            employee_dict = employee_dictlist.get(e_id)
            #logger.debug('employee_dict: ' + str(employee_dict))
            if employee_dict:
                e_code = employee_dict.get('code')
                #logger.debug('e_code: ' + str(e_code))
                e_identifier = employee_dict.get('identifier')
                e_payrollcode = employee_dict.get('payrollcode')

                e_fnc_id = employee_dict.get('fnc_id')
                e_fnc_code = employee_dict.get('fnc_code')

                e_wgc_id = employee_dict.get('wgc_id')
                e_wgc_code = employee_dict.get('wgc_code')

                e_pdc_id = employee_dict.get('pdc_id')
                e_pdc_code = employee_dict.get('pdc_code')

        if e_code is None:
            # necessary for sorted list
            e_code = '---'

# create note when employee is absent
        note_absent_eid = row.get('note_absent_eid')
        note = None
        if note_absent_eid is not None:
            # employee_dictlist: { 2608: {'id': 2608, 'comp_id': 3, 'code': 'Colpa de, William',
            absent_employee_dict = employee_dictlist.get(note_absent_eid)
            if absent_employee_dict:
                absent_e_code = absent_employee_dict.get('code')
                if absent_e_code:
                    is_replacement = row.get('isreplacement', False)
                    if is_replacement:
                        note = str(_('replaces ')) + absent_e_code
                    else:
                        note = absent_e_code  + str(_(' is absent'))

        mode = row.get('si_mod')
        is_absence = (mode == 'a')
        is_restshift = (mode == 'r')
        tm_rd = row.get('tm_rd')

        # get pk info from row
        c_id = row.get('c_id')
        o_id = row.get('o_id')
        si_id = row.get('si_id')
        tm_id = row.get('tm_id')
        o_code = row.get('o_code')
        c_code = row.get('c_code')
        sh_code = row.get('sh_code')

        # - get is_billable info from shift, order, company
        is_billable = row.get('sh_isbill') # this is part of sql: and not is_absence and not is_restshift)
        sh_os = row.get('sh_os')
        sh_oe = row.get('sh_oe')
        sh_bd = row.get('sh_bd')
        sh_td = row.get('sh_td')
        o_s_nosat = row.get('o_s_nosat')
        o_s_nosun = row.get('o_s_nosun')
        o_s_noph = row.get('o_s_noph')
        o_s_noch = row.get('o_s_noch')
        e_wmpd = row.get('e_wmpd')

        # - get employee info from row
        # NOTE: row_employee can be different from teammember.employee (when replacement employee)
        #       - employee info in row is replaced by replacement employee info in function calculate_add_row_to_dict
        #       - row.get('isreplacement] got its value in calculate_add_row_to_dict, in sql it is is set False
        employee_pk = row.get('e_id')

        #  row['isreplacement'] is added in function calculate_add_row_to_dict
        is_replacement = row.get('isreplacement')

#>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        timestart, timeend, planned_duration, time_duration, billing_duration, excel_date, excel_start, excel_end = \
            f.calc_timedur_plandur_from_offset(
                rosterdate_dte, is_absence, is_restshift, is_billable,
                is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                sh_os, sh_oe, sh_bd, sh_td, o_s_nosat, o_s_nosun, o_s_noph, o_s_noch,
                employee_pk, e_wmpd, comp_timezone)

        absdur = time_duration if is_absence else 0
        timedur = 0 if is_absence else time_duration
        totaldur = time_duration
#>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# add employee to order_list, for filtering planning per order
        if c_id and o_id and not is_absence:
            e_id_nonull = -1
            if e_id :
                e_id_nonull = e_id
            if c_id not in customer_dictlist:
                customer_dictlist[c_id] = []
            customer_list = customer_dictlist[c_id]
            if e_id_nonull not in customer_list:
                customer_list.append(e_id_nonull)

            if o_id not in order_dictlist:
                order_dictlist[o_id] = []
            order_list = order_dictlist[o_id]
            if e_id_nonull not in order_list:
                order_list.append(e_id_nonull)
        #logger.debug('e_code: ' + str(e_code))
        #logger.debug('o_code: ' + str(o_code))
        #logger.debug('planned_duration: ' + str(planned_duration))
        #logger.debug('time_duration: ' + str(time_duration))

        planning_dict_short = {
                    'fid': '_'.join([str(tm_id), str(si_id), str(tm_rd)]),
                    'e_id': e_id,
                    'e_code': e_code,
                    'e_identifier': e_identifier,
                    'e_payrollcode': e_payrollcode,
                    #'order_pk': o_id,
                    #'order_id': o_id,
                    'o_id': o_id,
                    'o_code': o_code,
                    'o_identifier': row.get('o_identifier'),
                    'c_id': c_id,
                    'c_code': c_code,
                    'c_o_code': ' '.join( (c_code, '-', o_code)),

                    'sh_code': sh_code,
                    'rosterdate': tm_rd,
                    'offsetstart': row.get('sh_os'),
                    'offsetend': row.get('sh_oe'),
                    'breakduration': row.get('sh_bd'),
                    'isrestshift': is_restshift,
                    'isabsence': is_absence,

                    'emplhour_id': None,
                    'employee_id': e_id,
                    'exceldate': excel_date,
                    'excelstart': excel_start,
                    'excelend': excel_end,
                    'plandur': planned_duration,
                    'timedur': timedur,
                    'absdur': absdur,
                    'totaldur': totaldur,

                    'e_fnc_id': e_fnc_id,
                    'e_fnc_code': e_fnc_code,
                    'e_wgc_id': e_wgc_id,
                    'e_wgc_code': e_wgc_code,
                    'e_pdc_id': e_pdc_id,
                    'e_pdc_code': e_pdc_code,

                    'sh_wfc_id': row.get('sh_wfc_id'),
                    'sh_wfc_code': row.get('sh_wfc_code'),
                    'sh_wfc_rate': row.get('sh_wfc_rate'),
                    'o_nopay': row.get('o_nopay'),

                    'note': note,
                    'note_absent_eid': row.get('note_absent_eid'),
                    'isreplacement': is_replacement
        }

    ##>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    return planning_dict_short


def create_employee_dictlist(request, datefirst_iso, datelast_iso, employee_pk_list, functioncode_pk_list):
    #logger.debug(' =============== create_employee_dictlist ============= ')
    #logger.debug('datefirst_iso: ' + str(datefirst_iso) + ' datelast_iso: ' + str(datelast_iso))
    # --- create rows of employees of this company, in servie on rosterdate, not inactive PR2020-10-11

    employee_dict = {}
    if request.user.company.pk:
        sql_keys = {'comp_id': request.user.company.pk}

        sql_list = [""" SELECT e.id, e.company_id AS comp_id, e.code, e.datefirst, e.datelast,
            e.namelast, e.namefirst, 
            e.identifier, e.payrollcode, 
            fnc.id AS fnc_id, fnc.code AS fnc_code, 
            wgc.id AS wgc_id, wgc.code AS wgc_code, 
            pdc.id AS pdc_id, pdc.code AS pdc_code, 
            e.locked, e.inactive
    
            FROM companies_employee AS e 
            LEFT JOIN companies_wagecode AS fnc ON (fnc.id = e.functioncode_id) 
            LEFT JOIN companies_wagecode AS wgc ON (wgc.id = e.wagecode_id) 
            LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id) 
    
            WHERE (e.company_id = %(comp_id)s::INT)
            """]
        # don't filter on range or inactive when filter on employee_pk_list or functioncode_pk_list
        if employee_pk_list:
            sql_list.append('AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )' )
            sql_keys['eid_arr'] = employee_pk_list
        elif functioncode_pk_list:
            sql_list.append('AND e.functioncode_id IN ( SELECT UNNEST( %(fncid_arr)s::INT[] ) )')
            sql_keys['fncid_arr'] = employee_pk_list
        else:
            sql_list.append('AND (NOT e.inactive)')
            if datefirst_iso:
                sql_list.append('AND (e.datelast >= %(df)s::DATE OR e.datelast IS NULL)')
                sql_keys['df'] = datefirst_iso
            if datelast_iso:
                sql_list.append('AND (e.datefirst <= %(dl)s::DATE OR e.datefirst IS NULL)')
                sql_keys['dl'] = datelast_iso

        sql_list.append('ORDER BY LOWER(e.code)')

        sql_employee = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql_employee, sql_keys)
        employee_dict = f.dictfetchrows(newcursor)

        #newcursor.execute(sql_employee, sql_keys)
        #logger.debug('create_employee_dictlist: ')
        #for value in f.dictfetchall(newcursor):
        #    logger.debug(str(value))
        #logger.debug('  ---------------------------')

    return employee_dict
# --- end of create_employee_dictlist


def create_teammember_list(request, rosterdate_iso, is_publicholiday, is_companyholiday):
    #logger.debug(' ------------- create_teammember_dict ----------------- ')
    #logger.debug('rosterdate_iso: ' + str(rosterdate_iso))
    # --- create rows of all teammembers of this company in this period, not inactive PR2020-10-11

    sql_schemeitem = get_sql_schemeitem()

    sql_teammember = """
        SELECT 
        tm.id AS tm_id,
        CONCAT(tm.id::TEXT, '_', si_sub.si_id::TEXT) AS tm_si_id,
        
        %(rd)s::DATE AS tm_rd,
        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(REPLACE (o.code, '~', ''),'') AS o_code,     
        COALESCE(o.identifier,'') AS o_identifier, 
        c.id AS c_id, 
        COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, 
        c.company_id AS comp_id, 

        si_sub.si_id,
        si_sub.sh_id,
        COALESCE(si_sub.sh_code,'') AS sh_code,

        CASE WHEN c.isabsence OR si_sub.sh_rest THEN FALSE ELSE
            CASE WHEN si_sub.sh_bill = 0 OR si_sub.sh_bill IS NULL THEN
                CASE WHEN o.billable = 0 OR o.billable IS NULL THEN
                    CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END 
                ELSE 
                    CASE WHEN o.billable = 2 THEN TRUE ELSE FALSE END
                END
            ELSE 
                CASE WHEN si_sub.sh_bill = 2 THEN TRUE ELSE FALSE END
            END 
        END AS sh_isbill,

        CASE WHEN c.isabsence THEN o.sequence ELSE -1 END AS o_seq,

        si_sub.si_mod,

        tm.employee_id AS e_id,
        tm.replacement_id AS rpl_id, 
        tm.switch_id AS switch_id, 
        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,
        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.cycle AS s_cycle,
        

        s.excludepublicholiday AS s_exph,
        s.excludecompanyholiday AS s_exch,
        s.divergentonpublicholiday AS s_dvgph,

        CASE WHEN o.nohoursonsaturday OR s.nohoursonsaturday THEN TRUE ELSE FALSE END AS o_s_nosat,
        CASE WHEN o.nohoursonsunday OR s.nohoursonsunday THEN TRUE ELSE FALSE END AS o_s_nosun,
        CASE WHEN o.nohoursonpublicholiday OR s.nohoursonpublicholiday THEN TRUE ELSE FALSE END AS o_s_noph,
        CASE WHEN o.nohoursoncompanyholiday OR s.nohoursoncompanyholiday THEN TRUE ELSE FALSE END AS o_s_noch,

        si_sub.sh_os, si_sub.sh_oe, si_sub.sh_bd, si_sub.sh_td,

        CASE WHEN si_sub.sh_wfc_id IS NULL THEN comp.wagefactorcode_id ELSE si_sub.sh_wfc_id END AS sh_wfc_id,
        CASE WHEN si_sub.sh_wfc_id IS NULL THEN wfc.code ELSE si_sub.sh_wfc_code END AS sh_wfc_code,
        CASE WHEN si_sub.sh_wfc_id IS NULL THEN COALESCE(wfc.wagerate, 0) ELSE si_sub.sh_wfc_rate END AS sh_wfc_rate,

        o.nopay AS o_nopay

        FROM companies_teammember AS tm 
        INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
        INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
        INNER JOIN companies_order AS o ON (o.id = s.order_id) 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        INNER JOIN companies_company AS comp ON (comp.id = c.company_id) 
    
        INNER JOIN  ( """ + sql_schemeitem + """ ) AS si_sub ON (si_sub.t_id = t.id)
    
        LEFT JOIN companies_wagecode AS wfc ON (wfc.id = comp.wagefactorcode_id)
    
        WHERE (c.company_id = %(comp_id)s)
        AND (NOT c.inactive OR c.isabsence) AND (NOT o.inactive OR o.isabsence) AND (NOT s.inactive OR s.isabsence)
        AND (NOT o.istemplate)
        AND (tm.datefirst <= %(rd)s::DATE OR tm.datefirst IS NULL) AND (tm.datelast  >= %(rd)s::DATE OR tm.datelast IS NULL)
        AND (s.datefirst <= %(rd)s::DATE OR s.datefirst IS NULL) AND (s.datelast  >= %(rd)s::DATE OR s.datelast IS NULL)
        AND (o.datefirst <= %(rd)s::DATE OR o.datefirst IS NULL) AND (o.datelast  >= %(rd)s::DATE OR o.datelast IS NULL)
    """

    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_keys = {'comp_id': request.user.company.pk,
                'rd':rosterdate_iso,
                'ph': is_publicholiday,
                'ch': is_companyholiday}

    newcursor = connection.cursor()
    newcursor.execute(sql_teammember, sql_keys)
    rows = f.dictfetchall(newcursor)

    #newcursor.execute(sql_teammember, sql_keys)
    #frows = f.dictfetchall(newcursor)
    #for value in frows:
    #    logger.debug('sql_teammember: ' + str(value))
    #logger.debug('  ---------------------------')

    return rows

# --- end of create_employee_rows

#######################################################
def calculate_add_row_to_dictNEW(row, employee_dictlist, eid_tmsid_arr, tm_si_id_info, rosterdate_dte,
                                 filter_employee_pk, filter_functioncode_pk, filter_paydatecode_pk,
                                 skip_absence_and_restshifts, add_shifts_without_employee):
    #logger.debug('------------ calculate_add_row_to_dictNEW ------------------------------ ')
    #logger.debug('row: ' + str(row))
    #logger.debug('filter_employee_pk' + str(filter_employee_pk))

    # filter_employee_is_replacement is only used in create_employee_planning
    # filter_employee_is_replacement is only true when employee and replacement are not the same
    # in case an employee is also his replacement...
    # TODO: filter_employee_is_replacement = (filter_employee_pk) and (filter_employee_pk != row[idx_e_id]) and (filter_employee_pk == row[idx_rpl_id])
    filter_employee_is_replacement = False

    add_row_to_dict = False
    # row['isreplacement'] is added in this function
    is_replacement = False

    si_mod = row.get('si_mod')
    e_id = row.get('e_id')
    tm_id = row.get('tm_id')
    si_id = row.get('si_id')
    tm_si_id = '_'.join((str(tm_id), str(si_id))) if tm_id and si_id else None

    c_code_FOR_TESTING = f.get_dict_value(row, ('c_code',))
    o_code_FOR_TESTING = f.get_dict_value(row, ('o_code',))
    e_code_FOR_TESTING = f.get_dict_value(employee_dictlist, (e_id, 'code'))
    #logger.debug( '--- ' + str(e_code_FOR_TESTING) + ' - ' + str(c_code_FOR_TESTING) + ' - ' + str(o_code_FOR_TESTING) + ' si_mod: ' + str(si_mod))

# >>>>> SHIFT IS INACTIVE
    # inactive shifts are filtered out in get_sql_schemeitem
# >>>>> SHIFT IS ABSENCE OR REST SHIFT
    if si_mod in ('a', 'r'):
        #logger.debug('SHIFT IS ABSENCE OR REST SHIFT')

        if not skip_absence_and_restshifts:
            if filter_employee_is_replacement:
                # no #logfile made when called by create_employee_planning
                pass
            elif e_id:
# - don't add absence or rest shift when employee is None
# - check if tm_si_id in tm_si_id_info. if not: the absence / restshift is removed because it is a double
                #logger.debug('tm_si_id: ' + str(tm_si_id))
                if tm_si_id in tm_si_id_info:
                    add_row_to_dict = True
                    #logger.debug('tm_si_id in tm_si_id_info ---> add_row_to_dict')
                #else:
                #    logger.debug('tm_si_id not in tm_si_id_info')

# >>>>> SHIFT IS NORMAL SHIFT
    else:
        #logger.debug('SHIFT IS NORMAL SHIFT')
        """       
        employee_dictlist: { 2608: {'id': 2608, 'comp_id': 3, 'code': 'Colpa de, William', 
                                    'datefirst': datetime.date(1991, 11, 25), 'datelast': None, 'namelast': 'Colpa de', 
                                    'namefirst': 'William Hendrik', 'identifier': '1991.02.29.04', 'payrollcode': 'PC003', 
                                    'fnc_id': 48, 'fnc_code': 'Tripoli', 'locked': False, 'inactive': False}, ... }
                
        eid_tmsid_arr: {2608: {'e_id': 2608, 'tm_si_id_arr': ['2086_4174']}, ... }
         
        tm_si_id_info: {'2086_4174': {'tm_si_id': '2086_4174', 'tm_id': 2086, 'si_id': 4174, 'e_id': 2608, 'rpl_id': 2617, 'switch_id': None, 
                                           'isabs': True, 'isrest': False, 'sh_os_nonull': 0, 'sh_oe_nonull': 1440, 'o_seq': 2}, ... }
        
        row: { 'tm_id': 1803, 'tm_df': None, 'tm_dl': None,  't_id': 2743, 't_code': 'Ploeg B', 'si_id': 3758, 'si_mod': 'n', 
            's_id': 2196, 's_code': 'Dagavondrooster-14daags', 's_df': None, 's_dl': None, 's_cycle': 14, 's_exph': True, 's_exch': False, 's_dvgph': False, 
            'o_id': 1541, 'o_code': 'ZRO', 'o_identifier': '', 'o_seq': -1, 'c_id': 757, 'c_code': 'Zero Securitas', 'comp_id': 3, 
            'o_s_nosat': False, 'o_s_nosun': False, 'o_s_noph': False,  'o_s_noch': False, 
            'sh_id': 1348, 'sh_code': '14.00 - 22.00', 'sh_isbill': False, 'sh_os': 840, 'sh_oe': 1260, 'sh_bd': 0, 'sh_td': 420, 
            'sh_wfc_id': 11, 'sh_wfc_code': 'W100', 'sh_wfc_rate': 1000000, 'o_nopay': False
            'e_id': 2621, 'rpl_id': None, 'switch_id': None} 
        """

# - normal shift is always added (inactive and range are already filtered out)
        add_row_to_dict = True
        #logger.debug('normal shift is always added ---> add_row_to_dict')

# ---  check if employee exists, is in service and active ( employee_dictlist is made once for the whole planning period PR2020-10-30)
        employee_exists_inservice_active = check_employee_exists_inservice_active(e_id, employee_dictlist, rosterdate_dte)
        #logger.debug('employee_exists_inservice_active: ' + str(employee_exists_inservice_active))
        if employee_exists_inservice_active:
    # -  employee exists, is in service and is active:
            #logger.debug('teammember has employee: ' + str(e_id))
            has_overlap, rpl_id, absent_from_tm_si_id = \
                check_employee_for_absence_or_overlap(
                    row=row,
                    e_id=e_id,
                    eid_tmsid_arr=eid_tmsid_arr,
                    tm_si_id_info=tm_si_id_info,
                    is_replacement=False)
            if has_overlap:
                row['note_absent_eid'] = e_id
                #logger.debug('employee has_overlap')
                # TODO add 'absent from to absent row
                e_id = None
        else:
            e_id = None

    # -  employee does not exist, is not in service or is inactive:
            #logger.debug('teammember has no employee')
# - if no employee: check if teammember has replacement employee
            rpl_id = row.get('rpl_id')
        # remove e_id from row when e_id not in service or has overlap
        if e_id is None:
            row['e_id'] = None

        #logger.debug('employee: ' + str(e_id) + ' replacement employee: ' + str(rpl_id))
        if rpl_id:

# ---  check if replacement employee exists, is in service and active ( employee_dictlist is made once for the whole planning period PR2020-10-30)
            replacement_exists_inservice_active = check_employee_exists_inservice_active(rpl_id, employee_dictlist, rosterdate_dte)
            if replacement_exists_inservice_active:
                #logger.debug('replacement exists, is inservice and is active')
    # - check if replacement employee is absent or has rest shift or has overlap with other shift:
                replacement_has_overlap, rpl_idNIU, absent_from_tm_si_id = \
                    check_employee_for_absence_or_overlap(
                        row=row,
                        e_id=rpl_id,
                        eid_tmsid_arr=eid_tmsid_arr,
                        tm_si_id_info=tm_si_id_info,
                        is_replacement=True)
                #logger.debug('replacement has overlap: ' + str(replacement_has_overlap))

                if replacement_has_overlap:
                    rpl_id = None
                else:
                    is_replacement = True
            else:
                rpl_id = None
                #logger.debug('teammember has no replacement employee  ---> add shift without employee')
            if rpl_id:
                row['e_id'] = rpl_id
    row['isreplacement'] = is_replacement
# - check if employee has the right funtioncode_pk / paydatecode_pk when filter is on. PR2020-09-28

    #logger.debug('add_row_to_dict: ' + str(add_row_to_dict) + ' row[e_id]: ' + str(row['e_id']) + ' row[isreplacement]: ' + str(row['isreplacement']))
    #logger.debug('row: ' + str(row))
    return add_row_to_dict
#  ----- end of calculate_add_row_to_dictNEW


#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
def remove_double_absence_restrows(eid_tmsid_arr, tm_si_id_info):  # PR2020-10-23
    #logger.debug(" --- remove_double_absence_restrows ---")
    #logger.debug('eid_tmsid_arr: ' + str(eid_tmsid_arr))
    # This function checks for overlapping absence rows / rest rows
    # only absence rows with the same os and oe will be skipped

# - loop through list of employees with abs/rest tm_si_id list
    # eid_tmsid_arr: {2608: ['2084_4170', '2058_3826']}
    for e_id, tm_si_id_arr in eid_tmsid_arr.items():
        #  'tm_si_id_arr' = ['2084_4170', '2058_3826']
        if tm_si_id_arr:
# - count amount of absence shifts - only when multiple found they must be checked
            for tm_si_id in tm_si_id_arr:
# get row info - note: info might be deleted if it is double absence
#  tm_si_id_info = { '1802_3998': {'tm_si_id': '1802_3998', 'tm_id': 1802, 'si_id': 3998, 'e_id': 2620,
#                                       'rpl_id': 2619, 'switch_id': None, 'isabs': False, 'isrest': True,
#                                       'sh_os_nonull': 0, 'sh_oe_nonull': 1440, 'o_seq': -1},
                row = tm_si_id_info.get(tm_si_id)
                if row:
                    row_isabs = row.get('isabs', False)
                    row_isrest = row.get('isrest', False)
                    if row_isabs or row_isrest:
                        row_tm_id = row.get('tm_id')
                        row_si_id = row.get('si_id')
                        row_tm_si_id = '_'.join((str(row_tm_id), str(row_si_id))) if row_tm_id and row_si_id else None
                        row_os_nonull = row.get('sh_os_nonull') if row.get('sh_os_nonull') else 0
                        row_oe_nonull = row.get('sh_oe_nonull') if row.get('sh_oe_nonull') else 1440
                        row_o_seq = row.get('o_seq') if row.get('o_seq') else -1

                        #logger.debug("  ")
                        #logger.debug("---------- row_tm_si_id: " + str(row_tm_si_id) + "  row_o_seq: " + str(row_o_seq))
                        #logger.debug("     row: " + str(row))

    # ---  loop again through array of absence and restshifts of this employee, fo find overlapping absence or rest shifts
                        #  tm_si_id_arr =  ['2047_4123', '2094_4233']
                        for lookup_tm_si_id in tm_si_id_arr:
                            #logger.debug("lookup_tm_si_id: " + str(lookup_tm_si_id))
    # --- skip when row and lookup are the same
                            if row_tm_si_id == lookup_tm_si_id:
                                #logger.debug('---> row and lookup are the same')
                                pass
                            else:
                                lookup_info = tm_si_id_info.get(lookup_tm_si_id)
    # --- skip when lookup_info does not exist any more - might be deleted if it is double absence
                                if lookup_info is None:
                                    #logger.debug('---> lookup_info not found (popped)')
                                    pass
                                else:
                                    lookup_isabs = lookup_info.get('isabs', False)
                                    lookup_isrest = lookup_info.get('isrest', False)
                                    if lookup_isabs or lookup_isrest:
                                        lookup_os_nonull = lookup_info.get('sh_os_nonull')
                                        lookup_oe_nonull = lookup_info.get('sh_oe_nonull')
                                        lookup_o_seq = lookup_info.get('o_seq', -1)

                                # only remove absence row when os and oe are equal
                                        remove_row = False
                                        if row_os_nonull == lookup_os_nonull and row_oe_nonull == lookup_oe_nonull:
                                            #logger.debug('---> os and oe are equal')
                                            #logger.debug('     row_isrest: ' + str(row_isrest) + ' lookup_isrest: ' + str( lookup_isrest))
                                            #logger.debug('     row_os_nonull: ' + str(row_os_nonull) + ' row_oe_nonull: ' + str(row_oe_nonull))
                                            #logger.debug('     row_o_seq: ' + str(row_o_seq) + ' lookup_o_seq: ' + str(lookup_o_seq))
                                            if row_isrest:
                                                if lookup_isabs:
                                                    # - remove rest row when there is also an absence row
                                                    #logger.debug('--> remove rest row when also absence found')
                                                    remove_row = True
                                                elif lookup_isrest:
                                                    # when row and lookup are both rest shifts:
                                                    # - remove the row when it has lower tm_si_id than lookup row
                                                    # - to make sure that a rest shift is not skipped twice
                                                    if row_tm_si_id < lookup_tm_si_id:
                                                        #logger.debug('--> remove rest row whith lower tm_si_id')
                                                        remove_row = True
                                                    #else:
                                                        #logger.debug('--> keep rest row whith higher tm_si_id')
                                            elif row_isabs:
                                                if lookup_isrest:
                                                    pass
                                                    #logger.debug('--> keep absence row when lookup_isrest')
                                # check which absence has priority (higher sequence is higher priority
                                                elif row_o_seq < lookup_o_seq:
                                                    # skip row when it has lower priority than lookup row
                                                    #logger.debug('---> remove row when it has lower priority than lookup row')
                                                    remove_row = True
                                                elif row_o_seq == lookup_o_seq:
                                                    #logger.debug('equal priority')
                                                    # when equal priority: skip the one with lower tm_si_id than lookup row
                                                    #  to make sure that a shift is not skipped twice
                                                    if row_tm_si_id < lookup_tm_si_id:
                                                        #logger.debug('---> remove row when row_tm_si_id < lookup_tm_si_id')
                                                        remove_row = True
                                                    #else:
                                                        #logger.debug('---> keep absence row whith higher row_tm_si_id')
                                                #else:
                                                    #logger.debug('---> keep absence row whith higher row_o_seq')
                                        #else:
                                            #logger.debug('---> os and oe are not equal')

                                        if remove_row:
                                            #logger.debug("     >>> remove_double_absence_restrow: " + str(tm_si_id))
                                            tm_si_id_info.pop(tm_si_id)
                                            break

# --- end of remove_double_absence_restrows


def check_employee_exists_inservice_active(e_id, employee_dictlist, rosterdate_dte):  # PR2020-10-30
    #logger.debug('------------ check_employee_exists_inservice_active ------------------------------ ')
# ---  check if employee is in service and active ( employee_dictlist is made once for the whole planning period)
    employee_exists_inservice_active = False
    if e_id:
        employee_dict = employee_dictlist.get(e_id)
        if employee_dict:
            #logger.debug('inactive: ' + str(employee_dict.get('inactive', False)))

            # inactive is already filtered out while getting employee_dictlist, but let it stay
            if not employee_dict.get('inactive', False):
                datefirst_dte = employee_dict.get('datefirst')
                #logger.debug('datefirst_dte: ' + str(datefirst_dte) + str(type(datefirst_dte)))
                if (datefirst_dte is None) or (datefirst_dte <= rosterdate_dte):
                    datelast_dte = employee_dict.get('datelast')
                    #logger.debug('datelast_dte: ' + str(datelast_dte)+ str(type(datelast_dte)))
                    if (datelast_dte is None) or (datelast_dte >= rosterdate_dte):
                        employee_exists_inservice_active = True

    #logger.debug('employee_exists_inservice_active: ' + str(employee_exists_inservice_active))
    return employee_exists_inservice_active


def check_employee_for_absence_or_overlap(row, e_id, eid_tmsid_arr, tm_si_id_info, is_replacement):  # PR2020-10-31
    #logger.debug('------------ check_employee_for_absence_or_overlap ------------------------------ ')

    has_overlap = False
    rpl_id = None
    absent_from_tm_si_id = None
    if e_id is not None:

# - get list of teammembers (shifts) of employee
        #logger.debug('employee: ' + str(e_id))
        # eid_tmsid_arr:  {2608: ['2084_4170', '2058_3826']}
        tm_si_id_arr = eid_tmsid_arr.get(e_id)
        if tm_si_id_arr is not None:
            # tm_si_id_arr: ['2084_4170', '2058_3826']
            #logger.debug('employee has tm_si_id_arr: ' + str(tm_si_id_arr))

            # ---  get info from row
            row_tm_id = row.get('tm_id')
            row_si_id = row.get('si_id')
            row_os_nonull = row.get('sh_os', 0)
            row_oe_nonull = row.get('sh_oe', 1440)

            absence_rpl_id = None
# - if employee has teammembers: loop through tm_si_id_arr to check for absence
            for tm_si_id in tm_si_id_arr:
                tm_si_info = tm_si_id_info.get(tm_si_id)
# - skip when tmsid_info_dict is None: tm_si_info might be removed because it is a double
                if tm_si_info is not None:
                    #logger.debug('tm_si_info: ' + str(tm_si_info))
# ---  check if employee is absent or has rest shift:
                    # - when full day absence or rest shift:
                    #   - always skip shift
                    # - when absence or rest shift is part of day:
                    #   - skip shift only when shift is completely within range of absence
                    # - when is_replacement:
                    #   - also skip shift when shift has overlap with a normal shift of replacement

                    this_tm_has_overlap, this_tm_rpl_id, lookup_tm_si_id = has_overlap_with_other_shift(
                        row_tm_id=row_tm_id,
                        row_si_id=row_si_id,
                        row_os_nonull=row_os_nonull,
                        row_oe_nonull=row_oe_nonull,
                        tm_si_info=tm_si_info,
                        check_replacement_employee=is_replacement)

                    if this_tm_has_overlap:
                        has_overlap = True
                        if this_tm_rpl_id is not None and absence_rpl_id is None:
                            absence_rpl_id = this_tm_rpl_id

                        # used to put not 'absent from' in absence row
                        if lookup_tm_si_id:
                            absent_from_tm_si_id = lookup_tm_si_id

# ---  check if teammember has replacement employee:
# ---  if not check if absence has replacement employee:
            rpl_id = row.get('rpl_id')
            #logger.debug('teammember replacement employee = ' + str(rpl_id))
            #logger.debug('absence replacement employee = ' + str(absence_rpl_id))
            if rpl_id is None and absence_rpl_id is not None:
                rpl_id = absence_rpl_id

# - TODO check if employee has the right funtioncode_pk / paydatecode_pk when filter is on. PR2020-09-28

    #logger.debug('     has_overlap: ' + str(has_overlap) + ' replacement employee: ' + str(rpl_id))
    #logger.debug('------------ end of check_employee_for_absence_or_overlap ----------------------- ')

    return has_overlap, rpl_id, absent_from_tm_si_id
#  ----- end of check_employee_for_absence_or_overlap


def has_overlap_with_other_shift(row_tm_id, row_si_id, row_os_nonull, row_oe_nonull,
                                  tm_si_info, check_replacement_employee):
    #logger.debug('--- has_overlap_with_other_shift ---  ')
    # This function checks for overlap with absence PR2020-10-13
    # it checks if range 'offset_start - offset_end' of row are partly within range of lookup absence / rest shift
    # when offset_start is None it will be replaced by 0, when offset_end is None it will be replaced by 1440
    # only shift of this rosterdate are checked, not rows of previous and next day

    # - when full day absence or rest shift: always skip shift
    # - when absence or rest shift is part of day:
    # when normal employee:
    #   - skip shift only when shift is completely within range of absence / rest shift
    # when replacement employee:
    #   - also check overlap with normal shifts
    #   - skip shift when shift is partly within range of absence / rest shift / normal shift

    has_overlap = False
    absence_rpl_id = None
    lookup_tm_si_id = None

    # tm_si_id_info = {
    #    '1802_3998': {'tm_si_id': '1802_3998', 'tm_id': 1802, 'si_id': 3998, 'e_id': 2620, 'rpl_id': 2619,
    #                  'tm_switch_id': None, 'isabs': False, 'isrest': True, 'sh_os_nonull': 0, 'sh_oe_nonull': 1440,
    #                  'o_seq': -1},

    if tm_si_info :

        lookup_isabs = tm_si_info.get('isabs', False)
        lookup_isrest = tm_si_info.get('isrest', False)
# - skip check normal shifts, except when employee is replacement.
        if check_replacement_employee or lookup_isabs or lookup_isrest:
            lookup_tm_id = tm_si_info.get('tm_id')
            lookup_si_id = tm_si_info.get('si_id')
            lookup_tm_si_id = tm_si_info.get('tm_si_id')
            # TODO split shift when partial absence: PR2020-10-17
            #  - employee has full day shift, employee is absent in the morning with replacement)
            #  - create absence emplhour for employee in the morning
            #  - split shift, with replacement employee in the morning and employee in the afternoon
# - skip if row and lookup are the same
            if row_tm_id != lookup_tm_id or row_si_id != lookup_si_id:
                lookup_os_nonull = tm_si_info.get('sh_os_nonull')
                lookup_oe_nonull = tm_si_info.get('sh_oe_nonull')
                lookup_rpl_id = tm_si_info.get('rpl_id')
# when row is full day absence or rest row (or normal shift is full day ore more)
#   - always skip row (also if shift starts previous day or ends next day)
                if lookup_os_nonull <= 0 and lookup_oe_nonull >= 1440:
                    has_overlap = True
                else:
                    if check_replacement_employee:
# when replacement employee:
#   - also check overlap with normal shifts
#   - skip shift when shift is partly within range of absence / rest shift / normal shift
                        if row_os_nonull < lookup_oe_nonull and row_oe_nonull > lookup_os_nonull:
                            has_overlap = True
                    else:
# when normal employee:
#   - skip shift only when shift is completely within range of absence / rest shift
                        if row_os_nonull >= lookup_os_nonull and row_oe_nonull <= lookup_oe_nonull:
                            has_overlap = True

# only return replacement employee from absence when checking normal employee,
                # when multiple absence rows: get the first replacement employee that is found
                if has_overlap and not check_replacement_employee and absence_rpl_id is None:
                    absence_rpl_id = lookup_rpl_id
# lookup_tm_si_id is used to put note 'absent from' in absent row
    if not has_overlap:
        lookup_tm_si_id = None
    return has_overlap, absence_rpl_id, lookup_tm_si_id
# --- end of has_overlap_with_other_shift


def get_sql_schemeitem():
    # this sql uses parameters 'rd', 'ph' and 'ch'
    return """SELECT si.id AS si_id, 
            si.team_id AS t_id, 
            si.shift_id AS sh_id, 
            sh.code AS sh_code,
            si.isabsence AS si_abs,
            CASE WHEN sh.id IS NULL THEN FALSE ELSE sh.isrestshift END AS sh_rest,
            si.inactive AS si_inactive,
            s.datefirst AS s_df,
            s.datelast AS s_dl,
            s.cycle AS s_cycle,

            s.excludepublicholiday AS s_exph,
            s.excludecompanyholiday AS s_exch,
            s.divergentonpublicholiday AS s_dvgph,

            s.nohoursonsaturday AS s_nosat,
            s.nohoursonsunday AS s_nosun,
            s.nohoursonpublicholiday AS s_noph,
            s.nohoursoncompanyholiday AS s_noch,

            si.onpublicholiday AS si_onph,
            CAST(si.rosterdate AS date) AS si_rd,

            CASE WHEN c.isabsence THEN 'a' ELSE 
                CASE WHEN si.shift_id IS NULL THEN '-' ELSE 
                    CASE WHEN sh.isrestshift THEN 'r' ELSE 'n' END 
                END
            END AS si_mod,

            CASE WHEN sh.isrestshift THEN 0 ELSE sh.billable END AS sh_bill,

            sh.offsetstart AS sh_os,
            sh.offsetend AS sh_oe,
            COALESCE(sh.offsetstart, 0) AS sh_os_nonull, 
            COALESCE(sh.offsetend, 1440) AS sh_oe_nonull,
            COALESCE(sh.breakduration, 0) AS sh_bd, 
            COALESCE(sh.timeduration, 0) AS sh_td,

            sh.pricecode_id AS sh_prc_id,
            sh.additioncode_id AS sh_adc_id,
            sh.taxcode_id AS sh_txc_id,

            sh.wagefactorcode_id AS sh_wfc_id,
            wfc.code AS sh_wfc_code,
            COALESCE(wfc.wagerate, 0) AS sh_wfc_rate

            FROM companies_schemeitem AS si 
            INNER JOIN companies_scheme AS s ON (s.id = si.scheme_id) 
            INNER JOIN companies_order AS o ON (o.id = s.order_id) 
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
             
            LEFT JOIN companies_shift AS sh ON (sh.id = si.shift_id) 
            LEFT JOIN companies_wagecode AS wfc ON (wfc.id = sh.wagefactorcode_id)

            WHERE (NOT si.inactive) AND 
                (
                    (   s.divergentonpublicholiday 
                        AND (si.onpublicholiday = CAST(%(ph)s AS BOOLEAN)) 
                        AND (si.onpublicholiday OR MOD(si.rosterdate - %(rd)s::DATE, s.cycle) = 0 
                    ) 
                    OR
                    (   NOT s.divergentonpublicholiday 
                        AND MOD(si.rosterdate - %(rd)s::DATE, s.cycle) = 0 ) 
                        AND ( (NOT s.excludepublicholiday) OR ( s.excludepublicholiday AND NOT CAST(%(ph)s AS BOOLEAN) ) )  
                    )
                )
            AND 
                ( NOT CAST(%(ch)s AS BOOLEAN) OR NOT s.excludecompanyholiday )
            """
# --- end of get_sql_schemeitem

def get_eid_tmsid_arr(request, rosterdate_iso, is_publicholiday, is_companyholiday, absrest_only,
                         employee_pk_list=None, functioncode_pk_list=None):
    #logger.debug('  -----  get_eid_tmsid_arr  ----- is_publicholiday: ' + str(is_publicholiday))
    # PR2020-10-13
    # two dictlists: one with only key=e_id and value = arr(tm_si_id)
    # other with key tm_si_id and values of teammember;
    # instead of everything in AGGARR: because it must be possible to delete double abensce shifts. Is only possible with separate tm  abs listlsit

    sql_schemeitem = get_sql_schemeitem()
    sql_list = ["""
        SELECT tm.employee_id AS e_id, CONCAT(tm.id , '_', si_sub.si_id) AS tm_si_id

        FROM companies_teammember AS tm 
        INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
        INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
        INNER JOIN companies_order AS o ON (o.id = s.order_id) 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        INNER JOIN companies_employee AS e ON (e.id = tm.employee_id) 

        INNER JOIN  ( """ + sql_schemeitem + """ ) AS si_sub ON (si_sub.t_id = t.id)

        WHERE (c.company_id = %(comp_id)s)
        AND ( NOT o.istemplate )
    """]
    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_keys = {'comp_id': request.user.company.pk,
                'rd':rosterdate_iso,
                'ph': is_publicholiday,
                'ch': is_companyholiday}
    # don't filter on range or inactive when filter on employee_pk_list or functioncode_pk_list

    if employee_pk_list:
        sql_list.append('AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )')
        sql_keys['eid_arr'] = employee_pk_list
    elif functioncode_pk_list:
        sql_list.append('AND e.functioncode_id IN ( SELECT UNNEST( %(fncid_arr)s::INT[] ) )')
        sql_keys['fncid_arr'] = employee_pk_list
    else:
        if absrest_only:
            sql_list.append('AND ( (c.isabsence) OR (si_sub.sh_rest AND NOT c.inactive AND NOT o.inactive AND NOT s.inactive ) )')
        else:
            sql_list.append('AND ( (c.isabsence) OR (NOT c.isabsence AND NOT c.inactive AND NOT o.inactive AND NOT s.inactive) )')
        sql_list.append("""
            AND ( tm.datefirst <= %(rd)s::DATE OR tm.datefirst IS NULL ) AND ( tm.datelast >= %(rd)s::DATE OR tm.datelast IS NULL )
            AND ( s.datefirst <= %(rd)s::DATE OR s.datefirst IS NULL ) AND ( s.datelast >= %(rd)s::DATE OR s.datelast IS NULL )
            AND ( o.datefirst <= %(rd)s::DATE OR o.datefirst IS NULL ) AND ( o.datelast >= %(rd)s::DATE OR o.datelast IS NULL )
            AND ( NOT e.inactive )
            AND ( e.datefirst <= %(rd)s::DATE OR e.datefirst IS NULL ) AND ( e.datelast >= %(rd)s::DATE OR e.datelast IS NULL )
        """)
    sql = ' '.join(sql_list)

    sql_teammember_aggr = """
        SELECT sq.e_id, ARRAY_AGG(sq.tm_si_id) AS tm_si_id_arr
        FROM (""" + sql + """) AS sq 
        GROUP BY sq.e_id
    """
    newcursor = connection.cursor()
    newcursor.execute(sql_teammember_aggr, sql_keys)
    rows = dict(newcursor.fetchall())

    #logger.debug('----- sql_teammember_aggr: ')
    #for key, value in rows.items():
    #  logger.debug('     ' + str(key) + ': ' + str(value))

    # returns: {2608: ['2084_4179'], 2617: ['2058_4178'], 2625: ['1821_4177', '2089_4214']}
    return rows
# --- end of get_eid_tmsid_arr


def get_teammember_info(request, rosterdate_iso, is_publicholiday, is_companyholiday,
                                          employee_pk_list=None, functioncode_pk_list=None):
    #logger.debug('  -----  get_teammember_info   -----')
    #logger.debug('is_publicholiday: ' + str(is_publicholiday))
    #logger.debug('is_companyholiday: ' + str(is_companyholiday))
    # PR2020-10-14
    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_schemeitem = get_sql_schemeitem()
    sql_list = ["""
        SELECT CONCAT(tm.id , '_', si_sub.si_id) AS tm_si_id, 
            tm.id AS tm_id, 
            si_sub.si_id,
            tm.employee_id AS e_id,
            tm.replacement_id AS rpl_id, 
            tm.switch_id AS switch_id, 
            c.isabsence AS isabs,
            si_sub.sh_rest AS isrest,
            si_sub.sh_os_nonull,
            si_sub.sh_oe_nonull,
            c.code AS c_code,
            o.code AS o_code,
            CASE WHEN c.isabsence = TRUE THEN o.sequence ELSE -1 END AS o_seq

        FROM companies_teammember AS tm 
        INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
        INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
        INNER JOIN companies_order AS o ON (o.id = s.order_id) 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        INNER JOIN companies_employee AS e ON (e.id = tm.employee_id) 

        INNER JOIN  ( """ + sql_schemeitem + """ ) AS si_sub ON (si_sub.t_id = t.id)

        WHERE ( c.company_id = %(comp_id)s )
        AND ( NOT o.istemplate ) 
    """]
    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_keys = {'comp_id': request.user.company.pk,
                'rd': rosterdate_iso,
                'ph': is_publicholiday,
                'ch': is_companyholiday}
    # don't filter on range or inactive when filter on employee_pk_list or functioncode_pk_list

    if employee_pk_list:
        sql_list.append('AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )')
        sql_keys['eid_arr'] = employee_pk_list
    elif functioncode_pk_list:
        sql_list.append('AND e.functioncode_id IN ( SELECT UNNEST( %(fncid_arr)s::INT[] ) )')
        sql_keys['fncid_arr'] = employee_pk_list
    else:
        sql_list.append("""
            AND ( (c.isabsence) OR (NOT c.isabsence AND NOT c.inactive AND NOT o.inactive AND NOT s.inactive) )
            AND ( tm.datefirst <= %(rd)s::DATE OR tm.datefirst IS NULL ) AND ( tm.datelast >= %(rd)s::DATE OR tm.datelast IS NULL )
            AND ( s.datefirst <= %(rd)s::DATE OR s.datefirst IS NULL ) AND ( s.datelast >= %(rd)s::DATE OR s.datelast IS NULL )
            AND ( o.datefirst <= %(rd)s::DATE OR o.datefirst IS NULL ) AND ( o.datelast >= %(rd)s::DATE OR o.datelast IS NULL )
            AND ( NOT e.inactive )
            AND ( e.datefirst <= %(rd)s::DATE OR e.datefirst IS NULL ) AND ( e.datelast >= %(rd)s::DATE OR e.datelast IS NULL )
        """)
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    rows = f.dictfetchrows(newcursor)

    #logger.debug('----- teammember_info: ')
    #for key, value in rows.items():
    #  logger.debug('     ' + str(key) + ': ' + str(value))
    return rows
# --- end of get_teammember_info


