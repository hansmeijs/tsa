# PR2019-03-24 PR2020-10-25
from django.db import connection

from django.utils.translation import ugettext_lazy as _
from datetime import timedelta
from timeit import default_timer as timer

from tsap import settings as s
from tsap import functions as f
from tsap import constants as c

from operator import itemgetter
import logging
logger = logging.getLogger(__name__)


def create_employee_planningNEW(planning_period_dict, order_pk, comp_timezone, request):  #PR2020-10-25
    logging_on = False  # s.LOGGING_ON
    if logging_on:
        logger.debug('   ')
        logger.debug(' ++++++++++++++  create_employee_planningNEW  ++++++++++++++ ')
        logger.debug('planning_period_dict: ' + str(planning_period_dict))

    datefirst_iso, datelast_iso, paydatecode_pk, pp_employee_pk_list, functioncode_pk_list = None, None, None, None, None
    if planning_period_dict:
        datefirst_iso = planning_period_dict.get('period_datefirst')
        datelast_iso = planning_period_dict.get('period_datelast')
        paydatecode_pk = planning_period_dict.get('paydatecode_pk')
        pp_employee_pk_list = planning_period_dict.get('employee_pk_list')
        functioncode_pk_list = planning_period_dict.get('functioncode_pk_list')

    """
        if paydatecode_pk:
            sql_list.append('AND pdc.id = %(pdc_id)s::INT')
            sql_keys['pdc_id'] = paydatecode_pk
    """

    planning_list, customer_dictlist, order_dictlist, elapsed_seconds = [], [], [], 0
    if datefirst_iso and datelast_iso:
        # - convert datefirst and datelast into date_objects
        datefirst_dte = f.get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_dte = f.get_date_from_ISO(datelast_iso)

# - check if calendar contains dates of this year, fill if necessary
        starttime = timer()
        f.check_and_fill_calendar(datefirst_dte, datelast_dte, request)

        if logging_on:
            logger.debug( 'check_and_fill_calendar: ' + str(timer() - starttime))

        planning_list = []
        customer_dictlist = {}
        order_dictlist = {}

# - get list of allowed employees when user has permitcustomers or permitorders,
        # - get list of employees and replacements of allowed customers / orders  PR2020-11-07
        # - returns empty list when all employees are allowed
        # - no other filters are used in this function
        allowed_employees_list = f.get_allowed_employees_and_replacements(request)

        if logging_on:
            logger.debug('allowed_employees_list: ' + str(allowed_employees_list))
            logger.debug('order_pk: ' + str(order_pk))

# - when only shifts of order_pk are selected (when called by planning page)
        # - employee_pk_list_from_order is a list of all employees and replacements
        #   it includes 'None' when there are shifts without employee (does not check empty replacements)
        # - order_pk_list is a list of all orders of these employees (except empty employee)
        # in this way you can print a planning of the employees of one order that also contain the shifts of other orders
        employee_pk_list_from_order = None
        if order_pk:
            # this function first a list of all employees and replacements of this order
            # - only when order and customer are active and not istemplate
            # note: list includes employees / replacements that are inactive or not in service
            # PR2020-11-09 debug: must also add absence replacement employees
            employee_pk_list_from_order = get_employeeplanning_employee_pk_list(order_pk, request)

            if logging_on:
                logger.debug('employee_pk_list_from_order: ' + str(employee_pk_list_from_order))

# - create employee_pk_list, a combination of allowed_employees_list and employee_pk_list_from_order
        employee_pk_list, employee_pk_nonull, order_pk_list = [], [], []
        if employee_pk_list_from_order:
            if allowed_employees_list:
                for pk in employee_pk_list_from_order:
                    if pk in allowed_employees_list:
                        employee_pk_list.append(pk)
            else:
                employee_pk_list = employee_pk_list_from_order
        else:
            if allowed_employees_list:
                employee_pk_list = allowed_employees_list

# - remove 'None' from employee_pk_list
        if employee_pk_list:
            # was: employee_pk_nonull = get_employees_active_inservce(employee_pk_list, datefirst_iso, datelast_iso, request)

            employee_pk_nonull = []
            for pk in employee_pk_list:
                if pk:
                    employee_pk_nonull.append(pk)

            if logging_on:
                logger.debug('employee_pk_nonull: ' + str(employee_pk_nonull))
            # TODO: replace by employee_pk_list.pop(None)

# - add the absence replacements of the employees to employee_pk_nonull
            # - replacements that are also in employee_pk_nonull are skipped
            absence_replacement_pk_list = get_employeeplanning_absence_replacement_pk_list (employee_pk_nonull, datefirst_iso, datelast_iso, request)

            if logging_on:
                logger.debug('absence_replacement_pk_list: ' + str(absence_replacement_pk_list))
            if absence_replacement_pk_list:
                employee_pk_nonull.extend(absence_replacement_pk_list)

            if logging_on:
                logger.debug('..... employee_pk_list: ' + str(employee_pk_list))
                logger.debug('..... absence_replacement_pk_list: ' + str(absence_replacement_pk_list))
                logger.debug('..... employee_pk_nonull: ' + str(employee_pk_nonull))

# - if pp_employee_pk_list has value: remove all employees that are not in pp_employee_pk_list
            if pp_employee_pk_list and len(pp_employee_pk_list) and len(employee_pk_nonull):
                for pk in employee_pk_nonull:
                    if pk not in pp_employee_pk_list:
                        employee_pk_nonull.pop(pk)

# - make a list of all orders of the employees + replacements of the selected order_pk
            # this function first makes  a list of all orders of the employees of the selected order_pk
            # - only when customer, order and scheme are active and not istemplate
            # in this way you can print a planning of the employees of one order that also contain the shifts of other orders
            order_pk_list = get_employeeplanning_order_list(employee_pk_nonull, request)
            if logging_on:
                logger.debug('order_pk_list: ' + str(order_pk_list))

# +++++ +++++ +++++ +++++ +++++ +++++
# +++++ loop through dates +++++
        rosterdate_dte = datefirst_dte
        while rosterdate_dte <= datelast_dte:
# ---  get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this rosterdate
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)
            rosterdate_iso = rosterdate_dte.isoformat()


            if logging_on:
                logger.debug('  ===================  rosterdate_iso: ' + str(rosterdate_iso) + ' ===================')
                logger.debug('employee_pk_nonull: ' + str(employee_pk_nonull))

# ---  create employee_list with employees:
            # filter:
            # - employee not inactive
            # - employee in service in range datefirst_iso - datelast_iso
            # - filter on paydatecode_pk, employee_pk_list, functioncode_pk_list if exists
            # calculate for each rosterdate, to get proper 'in service' value
            employee_dictlist = create_employee_dictlist(request=request,
                                                         datefirst_iso=rosterdate_iso,
                                                         datelast_iso=rosterdate_iso,
                                                         paydatecode_pk=paydatecode_pk,
                                                         employee_pk_list=employee_pk_nonull,
                                                         functioncode_pk_list=functioncode_pk_list)
            """
            employee_dictlist = 
            {4: {'id': 4, 'comp_id': 8, 'code': 'Colpa de, William', 'datefirst': None, 'datelast': None, 'namelast': 'Colpa de', 'namefirst': 'William Hendrik', 
            'identifier': '1991.02.29.04', 'payrollcode': 'M001', 
            'fnc_id': 5, 'fnc_code': 'bewaker', 'wgc_id': None, 'wgc_code': None, 
            'pdc_id': 4, 'pdc_code': 'Loonperiode', 'prc_id': None, 'locked': False, 'inactive': False, 'e_wmpd': 300},
            7: {'id': 7, 'comp_id': 8, 'code': 'Giterson, Lisette', 'datefirst': None, 'datelast': None, 
            'namelast': 'Giterson', 'namefirst': 'Lisette Sylvia enzo', 'identifier': '1984101610', 'payrollcode': None, 
            'fnc_id': 20, 'fnc_code': 'secretaresse', 
            'wgc_id': 20, 'wgc_code': 'secretaresse', 
            'pdc_id': None, 'pdc_code': None, 'prc_id': None, 'locked': False, 'inactive': False, 'e_wmpd': 480},  
            """

            if logging_on:
                logger.debug('employee_dictlist: ' + str(employee_dictlist))

# ---  create dict of wagecode and wagecodeitems of this rosterdate (without filter 'key'
            wagecode_dictlist = create_wagecode_dictlist(request, rosterdate_iso, rosterdate_iso)
            """
            wagecode_dictlist: 
               {2: {'id': 2, 'comp_id': 8, 'key': 'wfc', 'code': 'W150', 'description': None, 
               'wagerate': 1500000, 'datefirst': None, 'datelast': None, 'comp_wfc_id': 3},
            """
            default_wagefactor_pk = get_default_wagefactor_pk(request)

# ---  create list of teammember- / absence- / restshifts of this rosterdate as dict
            # PR2020-10-13
            # Why two dictlists? : one with only key = e_id and value = list of 'tm_si_id'
            #                      other with key tm_si_id and values of teammember;
            # instead of everything in AGGARR: because it must be possible to delete double abensce shifts. Is only possible with separate tm  abs listlsit

            #  eid_tmsid_arr = {2625: ['2045_4119', '2124_4336'], 2608: ['2054_4152'], 2617: ['2047_4125']}
            #  tm_si_id_info = {'2045_4119': {'tm_si_id': '2045_4119', 'e_id': 2625, 'rpl_id': None, 'switch_id': None,
            #                   'tm_id': 2045, 'si_id': 4119, 'sh_os_nonull': 0, 'sh_oe_nonull': 1440,
            #                   'sh_prc_id': None, 'sh_adc_id': None, 'sh_txc_id': None,
            #                   'isabs': False, 'isrest': True, 'c_code': 'ACU', 'o_code': 'Rif', 'o_seq': -1}, ..... }

            # filters:
            # - customer no template
            # - scheme, order, customer not inactive
            # - teammember, scheme, order within range datefirst_iso - datelast_iso
            # - filter on paydatecode_pk, employee_pk_list, functioncode_pk_list if exists
            # calculate for each rosterdate, to get proper 'in service' value

            eid_tmsid_arr, tm_si_id_info = get_teammember_info (
                request=request,
                rosterdate_iso=rosterdate_iso,
                is_publicholiday=is_publicholiday,
                is_companyholiday=is_companyholiday,
                paydatecode_pk=paydatecode_pk,
                employee_pk_list=employee_pk_nonull,
                functioncode_pk_list=functioncode_pk_list
            )

    # ---  remove overlapping absence- / restshifts
            remove_double_absence_restrows(eid_tmsid_arr, tm_si_id_info)  # PR2020-10-23

            if logging_on:
                logger.debug('----- tm_si_id_info after remove: ')
                for key, value in tm_si_id_info.items():
                    logger.debug('..... ' + str(key) + ': ' + str(value))

# ---  create list of shifts (teammembers):
            # filters:
            # - customer no template
            # - includes absence tm's (not when absence_order is inactive)
            # - scheme, order, customer not inactive
            # - teammember, scheme, order within range datefirst_iso - datelast_iso
            # - filter on paydatecode_pk, employee_pk_list, functioncode_pk_list if exists
            # - with schemeitem that matches rosterdate or is divergentonpublicholiday schemeitem when is_publicholiday
            # - when order_pk has value: get only the shifts of the orders in order_pk_list
            # - when employee_pk_list has value: get only the shifts when tm.employee_id in employee_pk_list

            teammember_list = emplan_create_teammember_list(request=request,
                                    rosterdate_iso=rosterdate_iso,
                                    is_publicholiday=is_publicholiday,
                                    is_companyholiday=is_companyholiday,
                                    order_pk_list=order_pk_list,
                                    employee_pk_list=employee_pk_nonull)
            """
            teammember_list 
            NORMAL SHIFT
           [ {'tm_id': 30, 'tm_si_id': '30_170', 'tm_rd': datetime.date(2021, 2, 21), 't_id': 32, 't_code': 'Ploeg A', 
            's_id': 8, 's_code': 'Schema 1', 'o_id': 9, 'o_code': 'Mahaai', 'o_identifier': 'O-009', 'c_id': 3, 'c_code': 'Centrum', 'comp_id': 8,
             'si_id': 170, 'sh_id': 69, 'sh_code': '14.00 - 16.00', 'sh_isbill': False, 'si_mod': 'n', 'e_id': 8, 'rpl_id': None, 'switch_id': None, 
             'tm_df': None, 'tm_dl': None, 's_df': datetime.date(2021, 1, 1), 's_dl': None, 's_cycle': 7, 's_exph': False, 's_exch': False, 's_dvgph': True, 
             'o_sh_nowd': False, 'o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False, 'o_seq': 0, 
             'wfc_onwd_id': 4, 'wfc_onsat_id': 1, 'wfc_onsun_id': 2, 'wfc_onph_id': 11, 
             'o_wfc_onwd_id': None, 'o_wfc_onsat_id': None, 'o_wfc_onsun_id': None, 'o_wfc_onph_id': None, 
             'sh_os': 840, 'sh_oe': 960, 'sh_os_nonull': 840, 'sh_oe_nonull': 960, 'sh_bd': 0, 'sh_td': 0, 
             'sh_prc_override': False, 'sh_prc_id': 1, 'sh_adc_id': None, 'sh_txc_id': None, 'o_inv_id': None}
            ABSENCE
            {'tm_id': 44, 'tm_si_id': '44_175', 'tm_rd': datetime.date(2021, 2, 21), 't_id': 37, 't_code': 'Giterson, Lisette', 
            's_id': 12, 's_code': 'Giterson, Lisette', 'o_id': 14, 'o_code': 'Onbetaaldtest', 'o_identifier': 'test', 'c_id': 4, 'c_code': 'Afwezig', 'comp_id': 8, 
            'si_id': 175, 'sh_id': 71, 'sh_code': '-', 'sh_isbill': False, 'si_mod': 'a', 'e_id': 7, 'rpl_id': None, 'switch_id': None, 
            'tm_df': None, 'tm_dl': None, 's_df': None, 's_dl': None, 's_cycle': 1, 's_exph': False, 's_exch': False, 's_dvgph': False, 
            'o_sh_nowd': False, 'o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False, 'o_seq': 44, 
            'wfc_onwd_id': None, 'wfc_onsat_id': None, 'wfc_onsun_id': None, 'wfc_onph_id': None, 
            'o_wfc_onwd_id': 1, 'o_wfc_onsat_id': 9, 'o_wfc_onsun_id': 12, 'o_wfc_onph_id': 4, 
            'sh_os': None, 'sh_oe': None, 'sh_os_nonull': 0, 'sh_oe_nonull': 1440, 'sh_bd': 0, 'sh_td': 0, 
            'sh_prc_override': False, 'sh_prc_id': 1, 'sh_adc_id': None, 'sh_txc_id': None, 'o_inv_id': None} ]
    
            """

# - sort rows
            # TODO test
            # PR2020-11-08 from https://stackoverflow.com/questions/72899/how-do-i-sort-a-list-of-dictionaries-by-a-value-of-the-dictionary

            # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
            # caused bij idx_e_code = None. Coalesce added in query.
            #  Idem with idx_sh_os_nonull. idx_sh_os must stay, may have null value for updating
            sorted_rows = sorted(teammember_list, key=itemgetter('sh_os_nonull', 'c_code', 'o_code'))

# ---  loop through list of teammembers:
            for i, row in enumerate(teammember_list):

                #logger.debug(' ')
                #logger.debug(' ------------------- row  -------------------------------')
                #logger.debug('row: ' + str(row))

                # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
                add_row = calculate_add_row_to_dictNEW(
                    row=row,
                    employee_dictlist=employee_dictlist,
                    eid_tmsid_arr=eid_tmsid_arr,
                    tm_si_id_info=tm_si_id_info,
                    rosterdate_dte=rosterdate_dte
                    )
                # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
                # #logger.debug( 'row: ' + str(row))

# - add row to planning
    # filter paydatecode_pk PR2020-11-19
    # - when paydatecode_pk has value: add only rows with this pdc_pk
    # - dont filter before calculate_add_row_to_dictNEW, because replacement employees must be shown as well
                #logger.debug( 'paydatecode_pk: ' + str(paydatecode_pk))
                if add_row and paydatecode_pk:
                    # e_id can be a replacement employee
                    same_paydatecode = False
                    e_id = row.get('e_id')
                    if e_id and employee_dictlist:
                        e_pdc_pk = f.get_dict_value(employee_dictlist, (e_id, 'pdc_id'))
                        same_paydatecode = (e_pdc_pk == paydatecode_pk)
                    add_row = same_paydatecode

                if add_row:
                    planning_dict = add_row_to_planning(
                            row=row,
                            rosterdate_dte=rosterdate_dte,
                            employee_dictlist=employee_dictlist,
                            customer_dictlist=customer_dictlist,
                            order_dictlist=order_dictlist,
                            wagecode_dictlist=wagecode_dictlist,
                            default_wagefactor_pk=default_wagefactor_pk,
                            tm_si_id_info=tm_si_id_info,
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

        elapsed_seconds = timer() - starttime

    return planning_list, customer_dictlist, order_dictlist, elapsed_seconds


def add_row_to_planning(row, rosterdate_dte, employee_dictlist, customer_dictlist, order_dictlist, wagecode_dictlist, default_wagefactor_pk, tm_si_id_info,
                        is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                        comp_timezone, request):  # PR2020-01-5 PR2020-08-14
    logging_on = False  # s.LOGGING_ON
    if logging_on:
        logger.debug(' ============= add_orderhour_emplhour ============= ')
    #logger.debug('row: ' + str(row))
    """
    row: {'tm_id': 1975, 'tm_si_id': '1975_4000', 'tm_rd': datetime.date(2020, 10, 26), 't_id': 2905, 't_code': 'Agata', 
    's_id': 2356, 's_code': 'Agata', 'o_id': 1521, 'o_code': 'Piscadera', 'o_identifier': 'O-008', 'c_id': 749, 'c_code': 'Centrum', 'comp_id': 3, 
    'si_id': 4000, 'sh_id': 1517, 'sh_code': '08.30 - 17.00', 'sh_isbill': True, 'o_seq': -1, 'si_mod': 'n',
     'e_id': 2625, 'rpl_id': None, 'switch_id': None, 'tm_df': None, 'tm_dl': None, 
     's_df': None, 's_dl': None, 's_cycle': 1, 's_exph': False, 's_exch': False, 's_dvgph': False, 
     'o_sh_nowd': False, 'o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False, 
     'sh_os': 510, 'sh_oe': 1020, 'sh_bd': 90, 'sh_td': 420, 'sh_wfc_id': 11, 'wfc_code': 'W100', 'wfc_rate': 1000000, 
     'isreplacement': False}
    """

    planning_dict_short = {}
    if row:
        e_id = row.get('e_id')
        e_code, e_identifier, e_payrollcode = None, None, None
        fnc_id, fnc_code, wgc_id, wgc_code,  pdc_id, pdc_code, e_wmpd = None, None, None, None, None, None, None

        if e_id:
            employee_dict = employee_dictlist.get(e_id)

            if logging_on:
                logger.debug('employee_dict: ' + str(employee_dict))
            if employee_dict:
                e_code = employee_dict.get('code')

                e_identifier = employee_dict.get('identifier')
                e_payrollcode = employee_dict.get('payrollcode')

                fnc_id = employee_dict.get('fnc_id')
                fnc_code = employee_dict.get('fnc_code')

                wgc_id = employee_dict.get('wgc_id')
                wgc_code = employee_dict.get('wgc_code')

                pdc_id = employee_dict.get('pdc_id')
                pdc_code = employee_dict.get('pdc_code')

                e_wmpd = employee_dict.get('e_wmpd')

                #TODO add price stc to planning
                e_prc_id = employee_dict.get('prc_id')
                e_adc_id = employee_dict.get('adc_id')

        if e_code is None:
            # necessary for sorted list
            e_code = '---'

        if logging_on:
            logger.debug('e_wmpd: ' + str(e_wmpd))
# create note when employee is absent
        note_absent_eid = row.get('note_absent_eid')
        # TODO note_absence_o_code is not working yet
        # note_absence_o_code =  row.get('note_absence_o_code')
        note = None
        if note_absent_eid is not None:
            # employee_dictlist: { 2608: {'id': 2608, 'comp_id': 3, 'code': 'Colpa de, William',

            if logging_on:
                logger.debug('note_absent_eid: ' + str(note_absent_eid))
            absent_employee_dict = employee_dictlist.get(note_absent_eid)

            if logging_on:
                logger.debug('absent_employee_dict: ' + str(absent_employee_dict))
            if absent_employee_dict:
                absent_e_code = absent_employee_dict.get('code')

                if logging_on:
                    logger.debug('absent_e_code: ' + str(absent_e_code))
                if absent_e_code:
                    note = absent_e_code + str(_(' is absent'))
                    # TODO add abscat
                    # if abscat_order_code:
                    #    note += ' (' + abscat_order_code + ')'

                if logging_on:
                    logger.debug('note: ' + str(note))

            if logging_on:
                logger.debug('employee_dictlist: ' + str(employee_dictlist))

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
        sh_id = row.get('sh_id')
        sh_code = row.get('sh_code')

        # - get is_billable info from shift, order, company
        is_billable = row.get('sh_isbill') # this is part of sql: and not is_absence and not is_restshift)
        sh_os = row.get('sh_os')
        sh_oe = row.get('sh_oe')
        sh_bd = row.get('sh_bd')
        sh_td = row.get('sh_td')

        o_sh_nowd = row.get('o_sh_nowd')
        o_sh_nosat = row.get('o_sh_nosat')
        o_sh_nosun = row.get('o_sh_nosun')
        o_sh_noph = row.get('o_sh_noph')

        # - get employee info from row
        # NOTE: row_employee can be different from teammember.employee (when replacement employee)
        #       - employee info in row is replaced by replacement employee info in function calculate_add_row_to_dict
        #       - row.get('isreplacement] got its value in calculate_add_row_to_dict, in sql it is is set False
        employee_pk = row.get('e_id')

        #  row['isreplacement'] is added in function calculate_add_row_to_dict
        is_replacement = row.get('isreplacement', False)

        default_wmpd = request.user.company.workminutesperday
        timestart, timeend, planned_duration, time_duration, billing_duration, no_hours, excel_date, excel_start, excel_end = \
            f.calc_timedur_plandur_from_offset(
                rosterdate_dte=rosterdate_dte,
                is_absence=is_absence, is_restshift=is_restshift, is_billable=is_billable,
                is_sat=is_saturday, is_sun=is_sunday, is_ph=is_publicholiday, is_ch=is_companyholiday,
                row_offsetstart=sh_os, row_offsetend=sh_oe, row_breakduration=sh_bd, row_timeduration=sh_td,
                row_plannedduration=0, update_plandur = True,
                row_nohours_onwd=o_sh_nowd, row_nohours_onsat=o_sh_nosat,
                row_nohours_onsun=o_sh_nosun, row_nohours_onph=o_sh_noph,
                row_employee_pk=employee_pk, row_employee_wmpd=e_wmpd,
                default_wmpd=default_wmpd,
                comp_timezone=comp_timezone)

        absdur = time_duration if is_absence else 0
        timedur = 0 if is_absence else time_duration
        totaldur = time_duration
#>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# customer_list and order_list contain list of e_id's (None= -1), for filtering planning per order
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

        if logging_on:
            logger.debug('e_code: ' + str(e_code))
            logger.debug('o_code: ' + str(o_code))
            logger.debug('planned_duration: ' + str(planned_duration))
            logger.debug('time_duration: ' + str(time_duration))

        o_nopay = False # row.get('o_nopay', False)

# get wagefactor from order or shift
        wagefactor_pk = get_wagefactorpk_from_row(
            row, default_wagefactor_pk, is_absence, is_restshift, is_saturday, is_sunday, is_publicholiday)
        wagefactor_code, wagefactor_rate = None, None
        if wagefactor_pk:
            wagecode_dict = wagecode_dictlist.get(wagefactor_pk)
            wagefactor_code = wagecode_dict.get('code')
            wagefactor_rate = wagecode_dict.get('wagerate', 0)

        planning_dict_short = {
                    # TODO replace fid by mapid in functions that use fid
                    'fid': '_'.join([str(tm_id), str(si_id), str(tm_rd)]),
                    'mapid': '_'.join([str(tm_id), str(si_id), str(tm_rd)]),
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

                    'sh_id': sh_id,
                    'sh_code': sh_code,
                    'rosterdate': tm_rd,
                    'offsetstart': sh_os,
                    'offsetend': sh_oe,
                    'breakduration': sh_bd,
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

                    'fnc_id': fnc_id,
                    'fnc_code': fnc_code,
                    'wgc_id': wgc_id,
                    'wgc_code': wgc_code,
                    'pdc_id': pdc_id,
                    'pdc_code': pdc_code,

                    'wfc_id': wagefactor_pk,
                    'wfc_code': wagefactor_code,
                    'wfc_rate': wagefactor_rate,

                    'note': note,
                    'note_absent_eid': note_absent_eid,
                    # 'note_absence_o_code': note_absence_o_code,
                    'isreplacement': is_replacement
        }
        if note_absent_eid:
            if logging_on:
                logger.debug('===============planning_dict_short with note_absent_eid========================')
                logger.debug(planning_dict_short)

    return planning_dict_short

#==================================

def get_wagefactorpk_from_row(row, default_wagefactor_pk, is_absence, is_restshift, is_saturday, is_sunday, is_publicholiday):
    #logger.debug(' =============== get_default_wagefactor_pk ============= ')
    # get wagefactor from order (when absence) or from shift (when normal shift) or None (when restshift) # PR2021-02-17

    wagefactor_pk = None
    if is_restshift:
        # no wagefactor when restshift
        pass
    elif is_absence:
        # get wagefactor from order (= abscat) when absence
        if is_publicholiday:
            wagefactor_pk = row.get('o_wfc_onph_id')
        elif is_sunday:
            wagefactor_pk = row.get('o_wfc_onsun_id')
        elif is_saturday:
            wagefactor_pk = row.get('o_wfc_onsat_id')
        # get wagefactor of weekday wagefactor if no value found
        if wagefactor_pk is None:
            wagefactor_pk = row.get('o_wfc_onwd_id')
        if wagefactor_pk is None:
            wagefactor_pk = default_wagefactor_pk
    else:
        # get wagefactor from shift when normal shift
        if is_publicholiday:
            wagefactor_pk = row.get('wfc_onph_id')
        elif is_sunday:
            wagefactor_pk = row.get('wfc_onsun_id')
        elif is_saturday:
            wagefactor_pk = row.get('wfc_onsat_id')
        # get wagefactor of weekday wagefactor if no value found
        if wagefactor_pk is None:
            wagefactor_pk = row.get('wfc_onwd_id')
        if wagefactor_pk is None:
            wagefactor_pk = default_wagefactor_pk
    return wagefactor_pk


def get_default_wagefactor_pk(request):
    #logger.debug(' =============== get_default_wagefactor_pk ============= ')
    # --- get default wagefactor of this company
    default_wagefactor_pk = None
    if request.user.company.pk:
        sql_keys = {'comp_id': request.user.company.pk}
        sql = "SELECT comp.wagefactorcode_id FROM companies_company AS comp WHERE (comp.id = %(comp_id)s::INT)"

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        wagefactor_pk_tuple = newcursor.fetchone()
        #logger.debug(str(wagefactor_pk_tuple))
        if wagefactor_pk_tuple:
            default_wagefactor_pk = wagefactor_pk_tuple[0]

    return default_wagefactor_pk
# --- end of get_default_wagefactor_id


def create_wagecode_dictlist(request, datefirst_iso, datelast_iso, wagecode_pk=None):
    #logger.debug(' =============== create_wagecode_dictlist ============= ')
    #logger.debug('datefirst_iso: ' + str(datefirst_iso) + ' datelast_iso: ' + str(datelast_iso))
    # --- create rows of employees of this company, in servie in range, not inactive PR2020-10-11

    wagecode_dictlist = {}
    if request.user.company.pk:
        sql_keys = {'comp_id': request.user.company.pk}

        sql_list = ["SELECT wgc.id, wgc.company_id AS comp_id,",
            "wgc.key, wgc.code, wgc.description,",
            "COALESCE(wi.wagerate, wgc.wagerate, 0) AS wagerate,",
            "wi.datefirst, wi.datelast,",
            "comp.wagefactorcode_id AS comp_wfc_id",
            "FROM companies_wagecode AS wgc",
            "INNER JOIN companies_company AS comp ON (comp.id = wgc.company_id)",
            "LEFT JOIN companies_wagecodeitem AS wi ON (wgc.id = wi.wagecode_id)",
            "WHERE (wgc.company_id = %(comp_id)s::INT) AND (NOT wgc.inactive)"]

        if datefirst_iso:
            sql_list.append("AND (wi.datelast >= %(df)s::DATE OR wi.datelast IS NULL)")
            sql_keys['df'] = datefirst_iso
        if datelast_iso:
            sql_list.append("AND (wi.datefirst <= %(dl)s::DATE OR wi.datefirst IS NULL)")
            sql_keys['dl'] = datelast_iso

        if wagecode_pk:
            sql_keys['wgc_id'] = wagecode_pk
            sql_list.append("AND (wgc.id = %(wgc_id)s::INT)" )

        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        wagecode_dictlist = f.dictfetchrows(newcursor)
        #logger.debug(str(wagecode_dictlist))

        #newcursor.execute(sql_employee, sql_keys)
        #logger.debug('create_wagecode_dictlist: ')
        #for value in f.dictfetchall(newcursor):
        #    logger.debug(str(value))
        #logger.debug('  ---------------------------')

    return wagecode_dictlist
# --- end of create_wagecode_dictlist


def create_employee_dictlist(request, datefirst_iso, datelast_iso, paydatecode_pk, employee_pk_list, functioncode_pk_list):
    #logger.debug(' =============== create_employee_dictlist ============= ')
    #logger.debug('datefirst_iso: ' + str(datefirst_iso) + ' datelast_iso: ' + str(datelast_iso))
    # --- create rows of employees of this company, in servie in range, not inactive PR2020-10-11

    employee_dictlist = {}
    if request.user.company.pk:
        sql_keys = {'comp_id': request.user.company.pk}

        sql_list = ["SELECT e.id, e.company_id AS comp_id, e.code, e.datefirst, e.datelast, e.namelast, e.namefirst, e.identifier, e.payrollcode,",
            "fnc.id AS fnc_id, fnc.code AS fnc_code, wgc.id AS wgc_id, wgc.code AS wgc_code,",
            "pdc.id AS pdc_id, pdc.code AS pdc_code, e.pricecode_id AS prc_id, e.locked, e.inactive, ",
            "CASE WHEN e.workminutesperday IS NULL OR e.workminutesperday = 0 THEN COALESCE(comp.workminutesperday, " + \
                    str(c.EMPLOYEE_DEFAULT_WORKMINUTES) + ") ELSE e.workminutesperday END AS e_wmpd",

            "FROM companies_employee AS e",
            "INNER JOIN companies_company AS comp ON (comp.id = e.company_id)",
            "LEFT JOIN companies_wagecode AS fnc ON (fnc.id = e.functioncode_id)",
            "LEFT JOIN companies_wagecode AS wgc ON (wgc.id = e.wagecode_id)",
            "LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id)",

            "WHERE (e.company_id = %(comp_id)s::INT) AND (NOT e.inactive)"]

        if datefirst_iso:
            sql_list.append("AND (e.datelast >= %(df)s::DATE OR e.datelast IS NULL)")
            sql_keys['df'] = datefirst_iso
        if datelast_iso:
            sql_list.append("AND (e.datefirst <= %(dl)s::DATE OR e.datefirst IS NULL)")
            sql_keys['dl'] = datelast_iso

        if paydatecode_pk:
            sql_list.append("AND (e.paydatecode_id = %(pdc_id)s::INT)" )
            sql_keys['pdc_id'] = paydatecode_pk

        if employee_pk_list:
            sql_list.append("AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )" )
            sql_keys['eid_arr'] = employee_pk_list

        if functioncode_pk_list:
            sql_list.append("AND e.functioncode_id IN ( SELECT UNNEST( %(fncid_arr)s::INT[] ) )")
            sql_keys['fncid_arr'] = employee_pk_list

        sql_list.append("ORDER BY LOWER(e.code)")

        sql_employee = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql_employee, sql_keys)
        employee_dictlist = f.dictfetchrows(newcursor)

        #logger.debug('employee_dictlist: ' + str(employee_dictlist))
        #newcursor.execute(sql_employee, sql_keys)
        #logger.debug('create_employee_dictlist: ')
        #for value in f.dictfetchall(newcursor):
        #    #logger.debug(str(value))
        #logger.debug('  ---------------------------')

    return employee_dictlist
# --- end of create_employee_dictlist


def emplan_create_teammember_list(request, rosterdate_iso, is_publicholiday, is_companyholiday, order_pk_list, employee_pk_list):
    # --- create rows of all teammembers of this company in this period, not inactive PR2020-10-11  PR2021-02-17
    logging_on = False  # s.LOGGING_ON
    if logging_on:
        logger.debug(' ------------- emplan_create_teammember_dict ----------------- ')
        logger.debug('order_pk_list' + str(order_pk_list))
        logger.debug('rosterdate_iso: ' + str(rosterdate_iso))

    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_keys = {'comp_id': request.user.company.pk,
                'rd': rosterdate_iso,
                'ph': is_publicholiday,
                'ch': is_companyholiday}

    sql_schemeitem = get_sql_schemeitem()

    sql_list = ["SELECT tm.id AS tm_id, CONCAT(tm.id::TEXT, '_', si_sub.si_id::TEXT) AS tm_si_id, %(rd)s::DATE AS tm_rd,",
        "t.id AS t_id,  COALESCE(t.code,'') AS t_code, s.id AS s_id, COALESCE(s.code,'') AS s_code,",
        "o.id AS o_id, COALESCE(REPLACE (o.code, '~', ''),'') AS o_code, COALESCE(o.identifier,'') AS o_identifier,",
        "c.id AS c_id, COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, c.company_id AS comp_id,",
        "si_sub.si_id, si_sub.sh_id, COALESCE(si_sub.sh_code,'') AS sh_code,",

        "CASE WHEN c.isabsence OR si_sub.sh_rest THEN FALSE ELSE",
        "CASE WHEN si_sub.sh_bill = 0 OR si_sub.sh_bill IS NULL THEN",
        "CASE WHEN o.billable = 0 OR o.billable IS NULL THEN",
        "CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END ELSE ",
        "CASE WHEN o.billable = 2 THEN TRUE ELSE FALSE END END ELSE",
        "CASE WHEN si_sub.sh_bill = 2 THEN TRUE ELSE FALSE END END END AS sh_isbill,",

        "si_sub.si_mod, tm.employee_id AS e_id, tm.replacement_id AS rpl_id, tm.switch_id AS switch_id, tm.datefirst AS tm_df, tm.datelast AS tm_dl,",
        "s.datefirst AS s_df, s.datelast AS s_dl, s.cycle AS s_cycle,",
        "s.excludepublicholiday AS s_exph, s.excludecompanyholiday AS s_exch, s.divergentonpublicholiday AS s_dvgph,",

        "CASE WHEN o.nohoursonweekday OR si_sub.sh_nowd THEN TRUE ELSE FALSE END AS o_sh_nowd,",
        "CASE WHEN o.nohoursonsaturday OR si_sub.sh_nosat THEN TRUE ELSE FALSE END AS o_sh_nosat,",
        "CASE WHEN o.nohoursonsunday OR si_sub.sh_nosun THEN TRUE ELSE FALSE END AS o_sh_nosun,",
        "CASE WHEN o.nohoursonpublicholiday OR si_sub.sh_noph THEN TRUE ELSE FALSE END AS o_sh_noph,",

        "CASE WHEN c.isabsence THEN COALESCE(o.sequence, 0) ELSE 0 END AS o_seq, ",

        "si_sub.wfc_onwd_id, si_sub.wfc_onsat_id, si_sub.wfc_onsun_id, si_sub.wfc_onph_id,",

        "o.wagefactorcode_id AS o_wfc_onwd_id, o.wagefactoronsat_id AS o_wfc_onsat_id,",
        "o.wagefactoronsun_id AS o_wfc_onsun_id, o.wagefactoronph_id AS o_wfc_onph_id,",

        "si_sub.wfc_onwd_id, si_sub.wfc_onsat_id, si_sub.wfc_onsun_id, si_sub.wfc_onph_id,",
        "si_sub.sh_os, si_sub.sh_oe, si_sub.sh_os_nonull, si_sub.sh_oe_nonull, si_sub.sh_bd, si_sub.sh_td,",

        "si_sub.sh_prc_override,",
        "COALESCE(si_sub.sh_prc_id, o.pricecode_id, comp.pricecode_id) AS sh_prc_id,",
        "COALESCE(si_sub.sh_adc_id, o.additioncode_id, comp.additioncode_id) AS sh_adc_id,",
        "COALESCE(si_sub.sh_txc_id, o.taxcode_id, comp.taxcode_id) AS sh_txc_id,",
        "COALESCE(o.invoicecode_id, c.invoicecode_id) AS o_inv_id",

        "FROM companies_teammember AS tm",
        "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
        "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
        "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
        "INNER JOIN companies_company AS comp ON (comp.id = c.company_id)",
        "INNER JOIN  ( " + sql_schemeitem + " ) AS si_sub ON (si_sub.t_id = t.id)",
        #"LEFT JOIN companies_wagecode AS wfc ON (wfc.id = comp.wagefactorcode_id)",

        "WHERE (c.company_id = %(comp_id)s) AND (NOT c.istemplate)",
        "AND (NOT c.inactive AND NOT o.inactive AND NOT s.inactive)",
        "AND (tm.datefirst <= %(rd)s::DATE OR tm.datefirst IS NULL) AND (tm.datelast  >= %(rd)s::DATE OR tm.datelast IS NULL)",
        "AND (s.datefirst <= %(rd)s::DATE OR s.datefirst IS NULL) AND (s.datelast  >= %(rd)s::DATE OR s.datelast IS NULL)",
        "AND (o.datefirst <= %(rd)s::DATE OR o.datefirst IS NULL) AND (o.datelast  >= %(rd)s::DATE OR o.datelast IS NULL)"]

    if order_pk_list:
        sql_list.append("AND o.id IN ( SELECT UNNEST( %(oid_arr)s::INT[] ) )")
        sql_keys['oid_arr'] = order_pk_list

    if employee_pk_list:
        sql_list.append("AND (tm.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) ) OR tm.employee_id IS NULL)")
        sql_keys['eid_arr'] = employee_pk_list

    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)
    rows = f.dictfetchall(newcursor)

    if logging_on:
        newcursor.execute(sql, sql_keys)
        frows = f.dictfetchall(newcursor)
        logger.debug('sql_teammember: ')
        logger.debug('  ---------------------------')
        for row in frows:
            logger.debug(row)
            logger.debug('  ---------------------------')

    return rows

# --- end of emplan_create_teammember_list

#######################################################
def calculate_add_row_to_dictNEW(row, employee_dictlist, eid_tmsid_arr, tm_si_id_info, rosterdate_dte):
    logging_on = False  # s.LOGGING_ON
    if logging_on:
        logger.debug('  ')
        logger.debug('------------ calculate_add_row_to_dictNEW ------------------------------ ')
        #logger.debug('row: ' + str(row))

    # filter_employee_is_replacement is only used in create_employee_planning
    # filter_employee_is_replacement is only true when employee and replacement are not the same
    # in case an employee is also his replacement...
    # TODO: filter_employee_is_replacement = (filter_employee_pk) and (filter_employee_pk != row[idx_e_id]) and (filter_employee_pk == row[idx_rpl_id])
    filter_employee_is_replacement = False

    add_row_to_dict = False
    # row['isreplacement'] is added in this function
    is_replacement = False
    rpl_id = None

    si_mod = row.get('si_mod')
    e_id = row.get('e_id')
    tm_id = row.get('tm_id')
    si_id = row.get('si_id')
    tm_si_id = '_'.join((str(tm_id), str(si_id))) if tm_id and si_id else None

# >>>>> SHIFT IS INACTIVE
    # inactive shifts are filtered out in get_sql_schemeitem

# >>>>> SHIFT IS ABSENCE OR REST SHIFT
    if si_mod in ('a', 'r'):

        if logging_on:
            logger.debug('SHIFT IS ABSENCE OR REST SHIFT')

        if filter_employee_is_replacement:
            # no #logfile made when called by create_employee_planning
            pass
        elif e_id:
# - don't add absence or rest shift when employee is None
# - check if tm_si_id in tm_si_id_info. if not: the absence / restshift is removed because it is a double
            if logging_on:
                logger.debug('tm_si_id: ' + str(tm_si_id))
            if tm_si_id in tm_si_id_info:
                add_row_to_dict = True
                if logging_on:
                    logger.debug('tm_si_id in tm_si_id_info ---> add_row_to_dict')
            else:
                if logging_on:
                    logger.debug('tm_si_id not in tm_si_id_info')

# >>>>> SHIFT IS NORMAL SHIFT
    else:
        if logging_on:
            logger.debug('SHIFT IS NORMAL SHIFT')
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
            'o_s_nowd': False, 'o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False,  'o_s_noch': False, 
            'sh_id': 1348, 'sh_code': '14.00 - 22.00', 'sh_isbill': False, 'sh_os': 840, 'sh_oe': 1260, 'sh_bd': 0, 'sh_td': 420, 
            'wfc_id': 11, 'wfc_code': 'W100', 'wfc_rate': 1000000, 
            'e_id': 2621, 'rpl_id': None, 'switch_id': None} 
        """

# - normal shift is always added (inactive and range are already filtered out)
        add_row_to_dict = True
        if logging_on:
            logger.debug('normal shift is always added ---> add_row_to_dict')

# ---  check if employee exists, is in service and active ( employee_dictlist is made once for the whole planning period PR2020-10-30)
        employee_exists_inservice_active = check_employee_exists_inservice_active(e_id, employee_dictlist, rosterdate_dte)
        #logger.debug('employee exists, is in service and is active: ' + str(employee_exists_inservice_active))
        if employee_exists_inservice_active:
    # -  employee exists, is in service and is active:
            #logger.debug('teammember has employee: ' + str(e_id))
            has_overlap, lookup_rpl_id, absence_tm_si_id, absence_o_code = \
                check_employee_for_absence_or_overlap(
                    row=row,
                    e_id=e_id,
                    eid_tmsid_arr=eid_tmsid_arr,
                    tm_si_id_info=tm_si_id_info,
                    is_replacement=False,
                    logging_on=logging_on)
            if has_overlap:
                rpl_id = lookup_rpl_id
                row['note_absent_eid'] = e_id
                row['note_absence_tm_si_id'] = absence_tm_si_id
                # TODO note_absence_o_code is not working yet
                # row['note_absence_o_code'] = absence_o_code

                if logging_on:
                    logger.debug('employee has overlap: rpl_id: ' + str(lookup_rpl_id) + ' absence_tm_si_id: ' + str(absence_tm_si_id))

                absence_tm_si_id_dict = tm_si_id_info.get(absence_tm_si_id)
                if absence_tm_si_id_dict:
                    row_sh_code = row.get('sh_code')
                    row_o_code = row.get('o_code')
                    row_c_code = row.get('c_code')
                    c_o_code = row_c_code if row_c_code else ''
                    if row_o_code:
                        c_o_code += ' - ' + row_o_code
                    if row_sh_code:
                        c_o_code += ', ' + row_sh_code
                    note = str(_('Absent from ')) + c_o_code
                    absence_tm_si_id_dict['note_absent_from'] = note

                    if logging_on:
                        logger.debug('note_absent_from: ' + str(note))
                e_id = None
            else:
                if logging_on:
                    logger.debug('employee has no overlap, no rpl_id added')
        else:
            e_id = None

    # -  employee does not exist, is not in service or is inactive:
            if logging_on:
                logger.debug('teammember has no employee')

# - if no employee: check if teammember has replacement employee
            rpl_id = row.get('rpl_id')
        # remove e_id from row when e_id not in service or has overlap
        if e_id is None:
            row['e_id'] = None

        if logging_on:
            logger.debug('employee: ' + str(e_id) + ' replacement employee: ' + str(rpl_id))
        if rpl_id:
            if logging_on:
                logger.debug('------- check if replacement employee exists, is in service and isactive: ')

# ---  check if replacement employee exists, is in service and active ( employee_dictlist is made once for the whole planning period PR2020-10-30)
            replacement_exists_inservice_active = check_employee_exists_inservice_active(rpl_id, employee_dictlist, rosterdate_dte)
            if replacement_exists_inservice_active:
                if logging_on:
                    logger.debug('replacement exists, is in service and is active')
    # - check if replacement employee is absent or has rest shift or has overlap with other shift:
                replacement_has_overlap, rpl_idNIU, absence_tm_si_idNIU, absence_o_codeNIU = \
                    check_employee_for_absence_or_overlap(
                        row=row,
                        e_id=rpl_id,
                        eid_tmsid_arr=eid_tmsid_arr,
                        tm_si_id_info=tm_si_id_info,
                        is_replacement=True,
                        logging_on=logging_on
                    )

                if logging_on:
                    logger.debug('replacement has overlap: ' + str(replacement_has_overlap))

                if replacement_has_overlap:
                    rpl_id = None
                else:
                    is_replacement = True
            else:
                rpl_id = None
                if logging_on:
                    logger.debug('replacement does not exist, is not in service or is inactive  ---> add shift without employee')
            if rpl_id:
                row['e_id'] = rpl_id
    row['isreplacement'] = is_replacement
# - check if employee has the right funtioncode_pk / paydatecode_pk when filter is on. PR2020-09-28

    if logging_on:
        logger.debug('add_row_to_dict: ' + str(add_row_to_dict) + ' row[e_id]: ' + str(row['e_id']) + ' row[isreplacement]: ' + str(row['isreplacement']))

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
                                        # PR2021-04-08 debug. tel Romy Nieuwenhuis. Error creating new roster.
                                        # gave error: '<' not supported between instances of 'int' and 'NoneType'
                                        # apparently this one still gives None value:
                                        #   lookup_os_nonull = lookup_info.get('sh_os_nonull')
                                        #   lookup_oe_nonull = lookup_info.get('sh_oe_nonull')
                                        #   lookup_o_seq = lookup_info.get('o_seq', -1)
                                        # use this one instead:
                                        lookup_os_nonull = lookup_info.get('sh_os_nonull') if lookup_info.get('sh_os_nonull') else 0
                                        lookup_oe_nonull = lookup_info.get('sh_oe_nonull') if lookup_info.get('sh_oe_nonull') else 1440
                                        lookup_o_seq = lookup_info.get('o_seq') if lookup_info.get('o_seq') else -1

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


def check_employee_for_absence_or_overlap(row, e_id, eid_tmsid_arr, tm_si_id_info, is_replacement, logging_on=False):  # PR2020-10-31 PR2021-02-22
    if logging_on:
        logger.debug('----- check_employee_for_absence_or_overlap ----- ')
        logger.debug('     e_id: ' + str(e_id))

    has_overlap = False
    rpl_id = None
    absence_tm_si_id = None
    absence_o_code = None
    if e_id is not None:

# - get list of teammembers (shifts) of employee
        # eid_tmsid_arr:  {2608: ['2084_4170', '2058_3826']}
        tm_si_id_arr = eid_tmsid_arr.get(e_id)
        if logging_on:
            logger.debug('     tm_si_id_arr: ' + str(tm_si_id_arr))

        if tm_si_id_arr is not None:
            # tm_si_id_arr: ['2084_4170', '2058_3826']

    # ---   get info from row
            row_tm_id = row.get('tm_id')
            row_si_id = row.get('si_id')

            # PR202011-01 debug: row.get('sh_os', 0) still gives error in function 'has_overlap_with_other_shift':
            #                    Exception Value: '>=' not supported between instances of 'NoneType' and 'int'
            # solved by adding: if row_os_nonull is None:   row_os_nonull = 0
            row_os_nonull = row.get('sh_os', 0)
            if row_os_nonull is None:
                row_os_nonull = 0
            row_oe_nonull = row.get('sh_oe', 1440)
            if row_oe_nonull is None:
                row_oe_nonull = 1440

            absence_rpl_id = None
# +++  if employee has teammembers: loop through tm_si_id_arr to check for absence
            for tm_si_id in tm_si_id_arr:
                tm_si_info = tm_si_id_info.get(tm_si_id)
        # - skip when tm_si_info is None: tm_si_info might be removed because it is a double
                if tm_si_info is not None:
                    if logging_on:
                        logger.debug('     tm_si_info: ' + str(tm_si_id) +
                                     ' e_id: ' + str(f.get_dict_value(tm_si_info, ('e_id',))) +
                                     ' rpl_id: ' + str(f.get_dict_value(tm_si_info, ('rpl_id',))) +
                                     ' isabs: ' + str(f.get_dict_value(tm_si_info, ('isabs',))) +
                                     ' isrest: ' + str(f.get_dict_value(tm_si_info, ('isrest',))) +
                                     ' order: ' + str(f.get_dict_value(tm_si_info, ('c_code',))) + ' ' +
                                     str(f.get_dict_value(tm_si_info, ('o_code',))) )

        # ---  check if employee is absent or has rest shift:
                    # - when full day absence or rest shift:
                    #   - always skip shift
                    # - when absence or rest shift is part of day:
                    #   - skip shift only when shift is completely within range of absence
                    # - when is_replacement:
                    #   - also skip shift when shift has overlap with a normal shift of replacement

                    this_tm_has_overlap, this_tm_rpl_id, lookup_tm_si_id, lookup_o_code = \
                        has_overlap_with_other_shift(
                            row_tm_id=row_tm_id,
                            row_si_id=row_si_id,
                            row_os_nonull=row_os_nonull,
                            row_oe_nonull=row_oe_nonull,
                            tm_si_info=tm_si_info,
                            check_replacement_employee=is_replacement,
                            logging_on=logging_on)

                    if this_tm_has_overlap:
                        has_overlap = True
                        if this_tm_rpl_id is not None and absence_rpl_id is None:
                            absence_rpl_id = this_tm_rpl_id

                        # used to put 'absent from' in absence row
                        if lookup_tm_si_id:
                            absence_tm_si_id = lookup_tm_si_id
                            absence_o_code = lookup_o_code

# ---  check if teammember has replacement employee:
# ---  if not check if absence has replacement employee:
            rpl_id = row.get('rpl_id')
            if rpl_id is None:
                if logging_on:
                    logger.debug('     teammember has no replacement')
                if absence_rpl_id is None:
                    if logging_on:
                        logger.debug('     absence has no replacement')
                    pass
                else:
                    rpl_id = absence_rpl_id
                    if logging_on:
                        logger.debug('     absence has replacement: ' + str(absence_rpl_id))
            else:
                if logging_on:
                    logger.debug('     teammember has replacement: ' + str(rpl_id))
# - TODO check if employee has the right funtioncode_pk / paydatecode_pk when filter is on. PR2020-09-28

    if logging_on:
        logger.debug('     has_overlap: ' + str(has_overlap) + ' replacement employee: ' + str(rpl_id))
        logger.debug('----- end of check_employee_for_absence_or_overlap ----- ')

    return has_overlap, rpl_id, absence_tm_si_id, absence_o_code
#  ----- end of check_employee_for_absence_or_overlap


def has_overlap_with_other_shift(row_tm_id, row_si_id, row_os_nonull, row_oe_nonull,
                                  tm_si_info, check_replacement_employee, logging_on=False):
    if logging_on:
        logger.debug('--- has_overlap_with_other_shift ---  ')
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
    lookup_o_code = None

    # tm_si_id_info = {
    #    '1802_3998': {'tm_si_id': '1802_3998', 'tm_id': 1802, 'si_id': 3998, 'e_id': 2620, 'rpl_id': 2619,
    #                  'tm_switch_id': None, 'isabs': False, 'isrest': True, 'sh_os_nonull': 0, 'sh_oe_nonull': 1440,
    #                  'o_seq': -1},

    if tm_si_info :

        lookup_isabs = tm_si_info.get('isabs', False)
        lookup_isrest = tm_si_info.get('isrest', False)
        if logging_on:
            logger.debug('     lookup_isabs: ' + str(lookup_isabs) + ' lookup_isrest: ' + str(lookup_isrest) + ' check_replacement_employee: ' + str(check_replacement_employee))

        #####################################################################################
        # PR2021-02-21 request from Guido: don't skip shifts when employee has restshift    #
        #####################################################################################
        skip_check_restshift_overlap = True
        if skip_check_restshift_overlap:
            lookup_isrest = False
        # - skip check normal shifts, except when employee is replacement.
        if check_replacement_employee or lookup_isabs or lookup_isrest:
            lookup_tm_id = tm_si_info.get('tm_id')
            lookup_si_id = tm_si_info.get('si_id')
            lookup_tm_si_id = tm_si_info.get('tm_si_id')
            lookup_o_code = tm_si_info.get('o_code')
            # TODO split shift when partial absence: PR2020-10-17
            #  - employee has full day shift, employee is absent in the morning with replacement)
            #  - create absence emplhour for employee in the morning
            #  - split shift, with replacement employee in the morning and employee in the afternoon

            if logging_on:
                logger.debug('     lookup_tm_si_id: ' + str(lookup_tm_si_id) + ' lookup_o_code: ' + str(lookup_o_code))

# - skip if row and lookup are the same
            if row_tm_id != lookup_tm_id or row_si_id != lookup_si_id:
                lookup_os_nonull = tm_si_info.get('sh_os_nonull')
                lookup_oe_nonull = tm_si_info.get('sh_oe_nonull')
                lookup_rpl_id = tm_si_info.get('rpl_id')
                if logging_on:
                    logger.debug('        row_os_nonull: ' + str(row_os_nonull) + '    row_oe_nonull: ' + str(row_oe_nonull))
                    logger.debug('     lookup_os_nonull: ' + str(lookup_os_nonull) + ' lookup_oe_nonull: ' + str(lookup_oe_nonull))

# when row is full day absence or rest row (or normal shift is full day ore more)
#   - always skip row (also if shift starts previous day or ends next day)
                if lookup_os_nonull <= 0 and lookup_oe_nonull >= 1440:
                    has_overlap = True
                    if logging_on:
                        logger.debug('     always skip row when row is full day absence or rest row  --> has_overlap = True')
                else:
                    if check_replacement_employee:
# when replacement employee:
#   - also check overlap with normal shifts
#   - skip shift when shift is partly within range of absence / rest shift / normal shift
                        if row_os_nonull < lookup_oe_nonull and row_oe_nonull > lookup_os_nonull:
                            has_overlap = True
                            if logging_on:
                                logger.debug('     skip shift when shift is partly within range of absence / rest shift / normal shift --> has_overlap = True')
                    else:
# when normal employee:
#   - skip shift only when shift is completely within range of absence / rest shift
                        if row_os_nonull >= lookup_os_nonull and row_oe_nonull <= lookup_oe_nonull:
                            has_overlap = True
                            if logging_on:
                                logger.debug('     skip shift only when shift is completely within range of absence / rest shift --> has_overlap = True')

# only return replacement employee from absence when checking normal employee,
                # when multiple absence rows: get the first replacement employee that is found
                if has_overlap and not check_replacement_employee and absence_rpl_id is None:
                    absence_rpl_id = lookup_rpl_id
                    if logging_on:
                        logger.debug('     absence_rpl_id: ' + str(absence_rpl_id))
# lookup_tm_si_id is used to put note 'absent from' in absent row
    if not has_overlap:
        lookup_tm_si_id = None
        lookup_o_code = None
    if logging_on:
        logger.debug('     has_overlap: ' + str(has_overlap) + ' absence_rpl_id: ' + str(absence_rpl_id) + ' lookup_tm_si_id: ' + str(lookup_tm_si_id) )
        logger.debug('---')
    return has_overlap, absence_rpl_id, lookup_tm_si_id, lookup_o_code
# --- end of has_overlap_with_other_shift


def get_sql_schemeitem():
    # this sql uses parameters 'rd', 'ph' and 'ch'
    sql_list = ["SELECT si.id AS si_id, si.team_id AS t_id, si.shift_id AS sh_id, sh.code AS sh_code,",
            "CONCAT(REPLACE (c.code, '~', ''), ' - ', REPLACE (o.code, '~', '')) AS c_o_code,",
            "si.isabsence AS si_abs, CASE WHEN sh.id IS NULL THEN FALSE ELSE sh.isrestshift END AS sh_rest,",
            "si.inactive AS si_inactive, s.datefirst AS s_df, s.datelast AS s_dl, s.cycle AS s_cycle,",
            "s.excludepublicholiday AS s_exph, s.excludecompanyholiday AS s_exch, s.divergentonpublicholiday AS s_dvgph,",
            "sh.nohoursonweekday AS sh_nowd, sh.nohoursonsaturday AS sh_nosat, sh.nohoursonsunday AS sh_nosun, sh.nohoursonpublicholiday AS sh_noph,",
            "si.onpublicholiday AS si_onph, CAST(si.rosterdate AS date) AS si_rd,",
            "CASE WHEN c.isabsence THEN 'a' ELSE CASE WHEN si.shift_id IS NULL THEN '-' ELSE CASE WHEN sh.isrestshift THEN 'r' ELSE 'n' END END END AS si_mod,",
            "CASE WHEN sh.isrestshift THEN 0 ELSE sh.billable END AS sh_bill,",
            "sh.offsetstart AS sh_os, sh.offsetend AS sh_oe,",
            "COALESCE(sh.offsetstart, 0) AS sh_os_nonull, COALESCE(sh.offsetend, 1440) AS sh_oe_nonull,",
            "COALESCE(sh.breakduration, 0) AS sh_bd, COALESCE(sh.timeduration, 0) AS sh_td,",
            "sh.pricecodeoverride AS sh_prc_override, sh.pricecode_id AS sh_prc_id, sh.additioncode_id AS sh_adc_id, sh.taxcode_id AS sh_txc_id,",

            "sh.wagefactorcode_id AS wfc_onwd_id, sh.wagefactoronsat_id AS wfc_onsat_id,",
            "sh.wagefactoronsun_id AS wfc_onsun_id, sh.wagefactoronph_id AS wfc_onph_id",

            "FROM companies_schemeitem AS si",
            "INNER JOIN companies_scheme AS s ON (s.id = si.scheme_id)",
            "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
            "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
            "INNER JOIN companies_shift AS sh ON (sh.id = si.shift_id)",
            "LEFT JOIN companies_wagecode AS wfc ON (wfc.id = sh.wagefactorcode_id)",

            "WHERE (NOT si.inactive)",
            "AND ( (s.divergentonpublicholiday AND (si.onpublicholiday = CAST(%(ph)s AS BOOLEAN)) AND (si.onpublicholiday OR MOD(si.rosterdate - %(rd)s::DATE, s.cycle) = 0)",
            "OR ( NOT s.divergentonpublicholiday AND MOD(si.rosterdate - %(rd)s::DATE, s.cycle) = 0 )",
            "AND ( (NOT s.excludepublicholiday) OR ( s.excludepublicholiday AND NOT CAST(%(ph)s AS BOOLEAN) ) )))",
            "AND ( NOT CAST(%(ch)s AS BOOLEAN) OR NOT s.excludecompanyholiday )"]

    sql_schemeitem = ' '.join(sql_list)
    return sql_schemeitem
# --- end of get_sql_schemeitem


def get_eid_tmsid_arr(request, rosterdate_iso, is_publicholiday, is_companyholiday,
                         paydatecode_pk, employee_pk_list, functioncode_pk_list):
    #logger.debug('  -----  get_eid_tmsid_arr  ----- is_publicholiday: ' + str(is_publicholiday))
    #logger.debug('employee_pk_list' + str(employee_pk_list))
    # PR2020-10-13
    # two dictlists: one with only key=e_id and value = arr(tm_si_id)
    # other with key tm_si_id and values of teammember;
    # instead of everything in AGGARR: because it must be possible to delete double abensce shifts. Is only possible with separate tm  abs listlsit
    # PR2020-11-09 debug: employee was skipped because it had restshift in inactive order. Solved by filter NOT inactive
    # -only show active schemes, orders, customers
    # only show employees, schemes, orders, customers within range

    sql_schemeitem = get_sql_schemeitem()
    sql_list = ["SELECT tm.employee_id AS e_id, CONCAT(tm.id , '_', si_sub.si_id) AS tm_si_id",
                "FROM companies_teammember AS tm",
                "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
                "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
                "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                "INNER JOIN companies_employee AS e ON (e.id = tm.employee_id)",
                "INNER JOIN  ( " + sql_schemeitem + " ) AS si_sub ON (si_sub.t_id = t.id)",
                "WHERE c.company_id = %(comp_id)s",
                "AND NOT c.istemplate",
                "AND NOT e.inactive AND NOT c.inactive AND NOT o.inactive AND NOT s.inactive",
                "AND ( tm.datefirst <= %(rd)s::DATE OR tm.datefirst IS NULL ) AND ( tm.datelast >= %(rd)s::DATE OR tm.datelast IS NULL )",
                "AND ( s.datefirst <= %(rd)s::DATE OR s.datefirst IS NULL ) AND ( s.datelast >= %(rd)s::DATE OR s.datelast IS NULL )",
                "AND ( o.datefirst <= %(rd)s::DATE OR o.datefirst IS NULL ) AND ( o.datelast >= %(rd)s::DATE OR o.datelast IS NULL )",
                "AND ( e.datefirst <= %(rd)s::DATE OR e.datefirst IS NULL ) AND ( e.datelast >= %(rd)s::DATE OR e.datelast IS NULL )"]

    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_keys = {'comp_id': request.user.company.pk,
                'rd':rosterdate_iso,
                'ph': is_publicholiday,
                'ch': is_companyholiday}
    # don't filter on range or inactive when filter on employee_pk_list or functioncode_pk_list

    if paydatecode_pk:
        sql_list.append("AND (e.paydatecode_id = %(pdc_id)s::INT)")
        sql_keys['pdc_id'] = paydatecode_pk

    if employee_pk_list:
        sql_list.append('AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )')
        sql_keys['eid_arr'] = employee_pk_list

    if functioncode_pk_list:
        sql_list.append('AND e.functioncode_id IN ( SELECT UNNEST( %(fncid_arr)s::INT[] ) )')
        sql_keys['fncid_arr'] = employee_pk_list

    sql = ' '.join(sql_list)

    sql_teammember_aggr = "SELECT sq.e_id, ARRAY_AGG(sq.tm_si_id) AS tm_si_id_arr FROM (" + sql + ") AS sq  GROUP BY sq.e_id"

    newcursor = connection.cursor()
    newcursor.execute(sql_teammember_aggr, sql_keys)
    rows = dict(newcursor.fetchall())

    #logger.debug('----- sql_teammember_aggr: ')
    #for key, value in rows.items():
        #logger.debug('     ' + str(key) + ': ' + str(value))

    # returns: {2608: ['2084_4179'], 2617: ['2058_4178'], 2625: ['1821_4177', '2089_4214']}
    return rows
# --- end of get_eid_tmsid_arr


def get_teammember_info(request, rosterdate_iso, is_publicholiday, is_companyholiday,
                        paydatecode_pk,  employee_pk_list, functioncode_pk_list):
    #logger.debug('  -----  get_teammember_info   -----')
    #logger.debug('is_publicholiday: ' + str(is_publicholiday))
    #logger.debug('is_companyholiday: ' + str(is_companyholiday))
    # PR2020-10-14
    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_schemeitem = get_sql_schemeitem()
    sql_list = ["SELECT CONCAT(tm.id , '_', si_sub.si_id) AS tm_si_id, tm.employee_id AS e_id,",
            "tm.replacement_id AS rpl_id, tm.switch_id AS switch_id, tm.id AS tm_id, si_sub.si_id, ",
            "si_sub.sh_os_nonull, si_sub.sh_oe_nonull, si_sub.sh_prc_id, si_sub.sh_adc_id, si_sub.sh_txc_id,",
            "c.isabsence AS isabs, si_sub.sh_rest AS isrest, c.code AS c_code, o.code AS o_code,",
            "CASE WHEN c.isabsence = TRUE THEN o.sequence ELSE -1 END AS o_seq",
        "FROM companies_teammember AS tm",
        "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
        "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
        "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
        "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
        "INNER JOIN companies_employee AS e ON (e.id = tm.employee_id)",
        "INNER JOIN  ( " + sql_schemeitem + " ) AS si_sub ON (si_sub.t_id = t.id)",

        "WHERE ( c.company_id = %(comp_id)s ) AND ( NOT c.istemplate )",
        "AND ( NOT c.inactive AND NOT o.inactive AND NOT s.inactive )",
        "AND ( tm.datefirst <= %(rd)s::DATE OR tm.datefirst IS NULL ) AND ( tm.datelast >= %(rd)s::DATE OR tm.datelast IS NULL )",
        "AND ( s.datefirst <= %(rd)s::DATE OR s.datefirst IS NULL ) AND ( s.datelast >= %(rd)s::DATE OR s.datelast IS NULL )",
        "AND ( o.datefirst <= %(rd)s::DATE OR o.datefirst IS NULL ) AND ( o.datelast >= %(rd)s::DATE OR o.datelast IS NULL )"]
        #"AND ( NOT e.inactive )",
        #"AND ( e.datefirst <= %(rd)s::DATE OR e.datefirst IS NULL ) AND ( e.datelast >= %(rd)s::DATE OR e.datelast IS NULL )"]


    # sql_schemeitem uses parameters 'rd', 'ph' and 'ch'
    sql_keys = {'comp_id': request.user.company.pk,
                'rd': rosterdate_iso,
                'ph': is_publicholiday,
                'ch': is_companyholiday}
    # don't filter on range or inactive when filter on employee_pk_list or functioncode_pk_list

    if paydatecode_pk:
        sql_list.append("AND (e.paydatecode_id = %(pdc_id)s::INT)")
        sql_keys['pdc_id'] = paydatecode_pk

    if employee_pk_list:
        sql_list.append("AND e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )")
        sql_keys['eid_arr'] = employee_pk_list

    if functioncode_pk_list:
        sql_list.append("AND e.functioncode_id IN ( SELECT UNNEST( %(fncid_arr)s::INT[] ) )")
        sql_keys['fncid_arr'] = employee_pk_list

    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql, sql_keys)

    # function dictfetchrows:
    #  was: return_dict = f.dictfetchrows(newcursor)
    columns = [col[0] for col in newcursor.description]
    return_dict = {}
    agg_dict = {}
    for row in newcursor.fetchall():
        tm_si_id = row[0]
        e_id = row[1]
        return_dict[tm_si_id] = dict(zip(columns, row))
        if e_id not in agg_dict:
            agg_dict[e_id] = []
        agg_dict[e_id].append(tm_si_id)

    #logger.debug('----- teammember_info: ')
    #for key, value in rows.items():
    #  #logger.debug('     ' + str(key) + ': ' + str(value))
    return agg_dict, return_dict
# --- end of get_teammember_info


def get_employeeplanning_employee_pk_list(order_pk, request):
    #logger.debug('  -----  get_employeeplanning_employee_pk_list   -----')
    # PR2020-11-05
    # this function first makes a list of all employees and replacements of this order
    # - only when customer and order are active and not istemplate
    # next step is to make a list of all orders of the employees in employee_pk_list
    # in this way you can print a planning of the employees of one order tyha talso contain the shifts of other orders

    employee_pk_list = None
    if order_pk:
        sql_list = ["SELECT tm.employee_id AS e_id, tm.replacement_id AS rpl_id",
                    "FROM companies_teammember AS tm",
                    "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
                    "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
                    "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                    "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                    "WHERE c.company_id = %(comp_id)s::INT",
                    "AND o.id = %(o_id)s::INT AND NOT o.inactive AND NOT c.inactive AND NOT c.istemplate",
                    "GROUP BY tm.employee_id, tm.replacement_id"]
        sql_keys = {'comp_id': request.user.company.pk,
                    'o_id': order_pk}
        sql = ' '.join(sql_list)
        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        rows = newcursor.fetchall()

        row_list = []
        for row in rows:
            # also addd when id is None
            if row[0] not in row_list:
                row_list.append(row[0])
            if row[1] not in row_list:
                row_list.append(row[1])
        if len(row_list):
            employee_pk_list = row_list
    return employee_pk_list


def get_employeeplanning_order_list(employee_pk_nonull, request):
    #logger.debug('  -----  get_employeeplanning_order_list   -----')
    # PR2020-11-05
    # this function first makes  a list of all orders of the employees of the selected order_pk
    # - only when customer, order and scheme are active and not istemplate
    # in this way you can print a planning of the employees of one order that also contain the shifts of other orders

    order_pk_list = []
    if employee_pk_nonull:
        sql_list = ["SELECT o.id AS o_id",
                    "FROM companies_teammember AS tm",
                    "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
                    "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
                    "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                    "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",

                    "WHERE c.company_id = %(comp_id)s::INT",
                    "AND NOT s.inactive AND NOT o.inactive AND NOT c.inactive AND NOT c.istemplate",
                    "AND tm.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )",
                    "GROUP BY o.id"]
        sql_keys = {'comp_id': request.user.company.pk,
                    'eid_arr': employee_pk_nonull}
        sql = ' '.join(sql_list)
        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        rows = newcursor.fetchall()

        for row in rows:
            if row[0] and row[0] not in order_pk_list:
                order_pk_list.append(row[0])

    #logger.debug('order_pk_list: ' + str(order_pk_list))
    return order_pk_list


def get_employees_active_inservce(employee_pk_list, datefirst_iso, datelast_iso, request):
    #logger.debug('  -----  get_employees_active_inservce   -----')
    # PR2020-11-05
    # this function first makes a list of all employees and replacements of this order
    # - only when customer and order are active and not istemplate
    # then makes a list of all orders of the employees
    # in this way you can print a planning of the employees of one order tyha talso contain the shifts of other orders

    # PR2020-11-09 debug: UNNEST list can not contain NULL values

    employees_active_inservce_list = []
    if employee_pk_list:
        # PR2020-11-09 debug: UNNEST list can not contain NULL values
        # remove None from list
        employee_pk_nonull = []
        for pk in employee_pk_list:
            if pk:
                employee_pk_nonull.append(pk)
        if employee_pk_nonull:
            sql_keys = {'comp_id': request.user.company.pk,
                        'eid_arr': employee_pk_nonull}
            sql_list = ["SELECT e.id AS e_id FROM companies_employee AS e",
                        "WHERE e.company_id = %(comp_id)s::INT AND NOT e.inactive ",
                        "AND ( e.id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) ) )"]
            if datefirst_iso:
                sql_list.append("AND (e.datelast >= %(df)s::DATE OR e.datelast IS NULL)")
                sql_keys['df'] = datefirst_iso
            if datelast_iso:
                sql_list.append("AND (e.datefirst <= %(dl)s::DATE OR e.datefirst IS NULL)")
                sql_keys['dl'] = datelast_iso
            sql_list.append("GROUP BY e.id")
            sql = ' '.join(sql_list)

            newcursor = connection.cursor()
            newcursor.execute(sql, sql_keys)
            rows = newcursor.fetchall()

            for row in rows:
                if row[0] not in employees_active_inservce_list:
                    employees_active_inservce_list.append(row[0])

    return employees_active_inservce_list


def get_employeeplanning_absence_replacement_pk_list(employee_pk_nonull, datefirst_iso, datelast_iso, request):
    #logger.debug('  -----  get_employeeplanning_absence_replacement_pk_list   -----')
    #logger.debug('     employee_pk_nonull: ' + str(employee_pk_nonull))
    # PR2020-11-09
    # this function makes a list of absence replacements of the employees in employee_pk_nonull
    # - replacements that are also in employee_pk_nonull are skipped

    replacement_pk_list = []
    if employee_pk_nonull:
        sql_keys = {'comp_id': request.user.company.pk,
                    'eid_arr': employee_pk_nonull}
        sql_list = ["SELECT tm.replacement_id",
                    "FROM companies_teammember AS tm",
                    "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
                    "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
                    "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                    "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                    "WHERE c.company_id = %(comp_id)s::INT",
                    "AND c.isabsence AND NOT c.istemplate",
                    "AND tm.replacement_id IS NOT NULL",
                    "AND ( tm.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) ) )"]
        if datefirst_iso:
            sql_list.extend(["AND (tm.datelast >= %(df)s::DATE OR tm.datelast IS NULL)",
                            "AND (s.datelast >= %(df)s::DATE OR s.datelast IS NULL)",
                            "AND (o.datelast >= %(df)s::DATE OR o.datelast IS NULL)"])
            sql_keys['df'] = datefirst_iso
        if datelast_iso:
            sql_list.extend(["AND (tm.datefirst <= %(dl)s::DATE OR tm.datefirst IS NULL)",
                            "AND (s.datefirst <= %(dl)s::DATE OR s.datefirst IS NULL)",
                            "AND (o.datefirst <= %(dl)s::DATE OR o.datefirst IS NULL)"])
            sql_keys['dl'] = datelast_iso
        sql_list.append("GROUP BY tm.replacement_id")
        sql = ' '.join(sql_list)
        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        rows = newcursor.fetchall()

        for row in rows:
            # value None is already filtered out in query, but let it stay
            if row[0] :
                if row[0] not in replacement_pk_list and row[0] not in employee_pk_nonull:
                    replacement_pk_list.append(row[0])

    #logger.debug('     replacement_pk_list: ' + str(replacement_pk_list))
    return replacement_pk_list


