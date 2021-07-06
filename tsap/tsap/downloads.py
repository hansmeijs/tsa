# PR2019-03-24 PR2021-05-15
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import View

from datetime import date, datetime
from timeit import default_timer as timer

from accounts import dicts as ad
from companies.views import LazyEncoder
from customers import dicts as cust_dicts

from tsap import settings as s
from tsap import constants as c
from tsap import functions as f
from tsap import locale as loc

from planning import dicts as d
from planning import prices as p
from planning import rosterfill as r
from planning import employeeplanning as emplan

from employees import dicts as ed
from customers import dicts as cd

from companies import dicts as comp_dicts

import json
import logging
logger = logging.getLogger(__name__)

# PR2021-01-09 value is stored in .env
if s.LOGGING_HIDE == 'NOTSET':
    log_level = logging.NOTSET
elif s.LOGGING_HIDE == 'DEBUG':
    log_level = logging.DEBUG
elif s.LOGGING_HIDE == 'WARNING':
    log_level = logging.WARNING
elif s.LOGGING_HIDE == 'ERROR':
    log_level = logging.ERROR
else:
    log_level = logging.CRITICAL


# === DatalistDownloadView ===================================== PR2019-05-23 PR2021-01-10
@method_decorator([login_required], name='dispatch')
class DatalistDownloadView(View):  # PR2019-05-23

    def post(self, request):
        logging_on = False
        if logging_on:
            logger.debug(' ')
            logger.debug(' ++++++++++++++++++++ DatalistDownloadView ++++++++++++++++++++ ')
            logger.debug('request.POST' + str(request.POST))

        starttime = timer()
        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                if request.POST['download']:

# ----- make system updates
                    f.system_updates()
# ----- get user_lang
                    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                    activate(user_lang)


# - get comp_timezone PR2019-06-14
                    comp_timezone = request.user.company.timezone if request.user.company.timezone else s.TIME_ZONE
                    timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
                    interval = request.user.company.interval if request.user.company.interval else 15
                    skip_check_updates = s.SKIP_CHECK_UPDATES
# ----- get datalist_request
                    datalist_request = json.loads(request.POST['download'])

# ----- get settings -- first get settings, these are used in other downloads
                    # download_setting will update usersetting with items in request_item, and retrieve saved settings
                    request_item = datalist_request.get('setting')
                    new_setting_dict = download_setting(request_item, user_lang, comp_timezone, timeformat, interval, skip_check_updates, request)
                    # only add setting_dict to datalists when called by request_item 'setting'

                    # TODO move properties to setting_dict and permit_dict (does not exist yet) instead of roster_period
                    if request_item and new_setting_dict:
                        datalists['setting_dict'] = new_setting_dict

# new_setting_dict: {'user_lang': 'nl', 'comp_timezone': 'Europe/Amsterdam',
                    # 'timeformat': '24h', 'interval': 5, 'selected_pk': {'sel_customer_pk': 748, 'sel_order_pk': 1520, 'sel_scheme_pk': 2111,
                    # 'sel_paydatecode_pk': 0,
                    # 'sel_paydate_iso': '2020-05-31'}, 'sel_page': 'page_payroll', 'sel_btn': 'payroll'}

                    sel_page = new_setting_dict.get('sel_page')
                    saved_btn = new_setting_dict.get('sel_btn')
                    saved_order_pk = new_setting_dict.get('sel_order_pk')
                    saved_scheme_pk = new_setting_dict.get('sel_scheme_pk')

                    if logging_on:
                        logger.debug('new_setting_dict: ' + str(new_setting_dict))
# ----- company setting
                    request_item = datalist_request.get('companysetting')
                    if request_item:
                        companysetting_dict = comp_dicts.get_companysetting(request_item, user_lang, request)
                        datalists['companysetting_dict'] = companysetting_dict
# ----- locale
                    request_item = datalist_request.get('locale')
                    if request_item:
                        # request_item: {page: "employee"}
                        datalists['locale_dict'] = loc.get_locale_dict(request_item, user_lang, comp_timezone, timeformat, interval, request)

# ----- quicksave
                    request_item = datalist_request.get('quicksave')
                    if request_item:
                        # get quicksave from Usersetting
                        quicksave_dict = request.user.get_usersetting(c.KEY_USER_QUICKSAVE)
                        datalists['quicksave'] = quicksave_dict
# ----- submenu
                    request_item = datalist_request.get('submenu')
                    if request_item:
                        submenu_dict = {}
                        if request.user.is_role_system_and_perm_sysadmin:
                            submenu_dict['user_is_role_system_and_perm_sysadmin'] = True
                        if request.user.is_role_company_and_perm_sysadmin:
                            submenu_dict['user_is_role_company_and_perm_sysadmin'] = True
                        if submenu_dict:
                            datalists['submenu_dict'] = submenu_dict
# ----- company
                    request_item = datalist_request.get('company')
                    if request_item:
                        company_dict = cust_dicts.create_company_list(company=request.user.company)
                        if company_dict:
                            datalists['company_dict'] = company_dict
# ----- companyinvoice
                    request_item = datalist_request.get('companyinvoice')
                    if request_item:
                        companyinvoice_list= cust_dicts.create_companyinvoice_list(company=request.user.company)
                        if companyinvoice_list:
                            datalists['companyinvoice_list'] = companyinvoice_list

# ----- employee
                    request_item = datalist_request.get('employee_list')
                    if request_item:
                        employee_list, employee_rows = ed.create_employee_list(request=request, user_lang=user_lang)
                        datalists['employee_list'] = employee_list
                    request_item = datalist_request.get('employee_rows')
                    if request_item:
                        datalists['employee_rows'] = ed.create_employee_rows(request_item, request)

# ----- customer
                    request_item = datalist_request.get('customer_rows')
                    if request_item:
                        customer_list, customer_rows = cust_dicts.create_customer_list(
                            request=request,
                            is_absence=request_item.get('isabsence'),
                            is_template=request_item.get('istemplate'),
                            is_inactive=request_item.get('inactive'))
                        datalists['customer_list'] = customer_list
                        datalists['customer_rows'] = customer_rows
# ----- order
                    request_item = datalist_request.get('order_rows')
                    if request_item:
                        # show all when isabsence / istemplate / inactive is None
                        order_list, order_rows = cust_dicts.create_order_list(
                            request=request,
                            is_absence=request_item.get('isabsence'),
                            is_template=request_item.get('istemplate'),
                            is_inactive=request_item.get('inactive'))
                        datalists['order_list'] = order_list
                        datalists['order_rows'] = order_rows
# ----- abscat_rows
                    request_item = datalist_request.get('abscat_rows')
                    if request_item:
                        datalists['abscat_rows'] = cust_dicts.create_order_rows(
                            request=request,
                            is_absence=True
                            )

# ----- absence_rows used in scheme and employee
                    request_item = datalist_request.get('absence_rows')
                    if request_item:
                        datalists['absence_rows'] = ed.create_absence_rows(
                            filter_dict=request_item,
                            teammember_pk=None,
                            msg_dict = {},
                            request=request)

# ----- page_scheme_list - lists with all schemes, shifts, teams, schemeitems and teammembers of selected order_pk
                    request_item = datalist_request.get('page_scheme_list')
                    if request_item:
                        download_page_scheme_list(request_item, datalists, saved_order_pk, saved_scheme_pk,
                                                    saved_btn, user_lang, comp_timezone, request)

# ----- schemes_dict - dict with all schemes with shifts, teams, schemeitems and teammembers
                    request_item = datalist_request.get('schemes_dict')
                    if request_item:
                        # get all schemes, because of validation schemenames
                        dict_list = d.create_schemes_extended_dict(
                            filter_dict=request_item,
                            company=request.user.company,
                            comp_timezone=comp_timezone,
                            user_lang=user_lang)
                        datalists['schemes_dict'] = dict_list
# ----- scheme
                    request_item = datalist_request.get('scheme')
                    if request_item:
                        # get all schemes, because of validation schemenames
                        scheme_rows, dict_list = d.create_scheme_list(
                            filter_dict=request_item,
                            company=request.user.company,
                            comp_timezone=comp_timezone,
                            user_lang=user_lang)
                        datalists['scheme_list'] = dict_list
# ----- shift
                    request_item = datalist_request.get('shift')
                    if request_item:
                        shift_rows = d.create_shift_rows(
                            filter_dict=request_item,
                            company=request.user.company)
                        if shift_rows:
                            datalists['shift_rows'] = shift_rows
# ----- team
                    request_item = datalist_request.get('team')
                    if request_item:
                        dict_list = d.create_team_rows(
                            filter_dict=request_item,
                            company=request.user.company)
                        datalists['team_list'] = dict_list
# ----- teammember
                    request_item = datalist_request.get('teammember_list')
                    if request_item:
                        dict_list = ed.ed_create_teammember_list(
                            filter_dict=request_item,
                            company=request.user.company,
                            user_lang=user_lang)
                        # is_absence = f.get_dict_value(request_item, ('is_absence',), False)
                        #key_str = 'absence_list' if is_absence else 'teammember_list'
                        datalists['teammember_list'] = dict_list

# ----- schemeitem
                    request_item = datalist_request.get('schemeitem')
                    if request_item:
                        schemeitem_list, schemeitem_rows= d.create_schemeitem_list(filter_dict=request_item, company=request.user.company)
                        datalists['schemeitem_list'] = schemeitem_list
                        datalists['schemeitem_rows'] = schemeitem_rows
# ----- price_list -- used in page price (review)
                    request_item = datalist_request.get('price_list')
                    if request_item:
                        datalists['price_list'] = p.create_price_list( filter_dict=request_item, request=request)
# ----- pricecode
                    request_item = datalist_request.get('pricecode')
                    if request_item:
                        rosterdate = f.get_dict_value(request_item, 'rosterdate')
                        datalists['pricecode_list'] = p.create_pricecode_list(rosterdate, request=request)

# ----- 'planning_period', 'calendar_period', 'roster_period', 'payroll_period', 'review_period'
                    for key in ('planning_period', 'calendar_period', 'roster_period',
                                'payroll_period', 'review_period', 'user_period'):
                        request_item = datalist_request.get(key)
                        # also get planning_period_dict at startup of page  when btn = 'planning'
                        # also get calendar_period_dict at startup of page when btn = 'calendar'
                        if (request_item is not None) or \
                                (key == 'planning_period' and saved_btn == 'planning') or \
                                (key == 'calendar_period' and saved_btn == 'calendar') or \
                                (key == 'payroll_period' and sel_page == 'page_payroll') or \
                                (key == 'review_period' and sel_page == 'page_review'):
                            # save new period and retrieve saved period
                            datalists[key] = d.period_get_and_save(key, request_item,
                                                                         comp_timezone, timeformat, interval, user_lang, request)
# ----- emplhour (roster page)
                    request_item = datalist_request.get('emplhour')
                    roster_period_dict = datalists.get('roster_period')
                    if request_item and roster_period_dict:
                        # d.check_overlapping_shifts(range_start_iso, range_end_iso, request)  # PR2019-09-18
                        # don't use the variable 'list', because table = 'period' and will create dict 'period_list'
                        # roster_period_dict is already retrieved
                        is_emplhour_check = (request_item.get('mode') == "emplhour_check")
                        emplhour_rows, no_changes, last_emplhour_check, last_emplhour_updated, last_emplhour_deleted, new_last_emplhour_check = \
                            d.create_emplhour_list(
                                period_dict=roster_period_dict,
                                is_emplhour_check=is_emplhour_check,
                                request=request)
                        # - also get emplhournote (roster page)
                        if not is_emplhour_check:
                            last_emplhour_check = None

                        # PR2019-11-18 debug don't use 'if emplhour_list:, blank lists must also be returned
                        if is_emplhour_check:
                            if no_changes:
                                datalists = {'no_changes': True}
                            else:
                                datalists['emplhour_updates'] = emplhour_rows
                                # TODO updates of notes
                                #if emplhournote_rows:
                                #    datalists['emplhournote_updates'] = emplhournote_rows
                            if last_emplhour_check:
                                datalists['last_emplhour_check'] = last_emplhour_check
                            if last_emplhour_updated:
                                datalists['last_emplhr_updated'] = last_emplhour_updated
                            if last_emplhour_deleted:
                                datalists['last_emplhr_deleted'] = last_emplhour_deleted
                            if new_last_emplhour_check:
                                datalists['new_last_emplr_check'] = new_last_emplhour_check
                        else:
                            datalists['emplhour_rows'] = emplhour_rows

# ----- emplhourallowance_rows
                    request_item = datalist_request.get('emplhourallowance')
                    if request_item:
                        # TODO last_emplhour_check
                        last_emplhour_check = None
                        datalists['emplhourallowance_rows'] = d.create_emplhourallowance_rows(
                            request=request,
                            period_dict=roster_period_dict,
                            last_emplhour_check=last_emplhour_check)

# ----- emplhournote_rows
                    request_item = datalist_request.get('emplhournote')
                    if request_item:
                        # TODO last_emplhour_check
                        last_emplhour_check = None
                        datalists['emplhournote_rows'] = d.create_emplhournote_rows(
                            period_dict=roster_period_dict,
                            last_emplhour_check=last_emplhour_check,
                            request=request)

# ----- ordernote_rows
                    request_item = datalist_request.get('ordernote')
                    if request_item:
                        datalists['ordernote_rows'] = cd.create_ordernote_rows(
                            period_dict=roster_period_dict,
                            request=request)
# ----- employeenote_rows
                    request_item = datalist_request.get('employeenote')
                    if request_item:
                        datalists['employeenote_rows'] = ed.create_employeenote_rows(
                            period_dict=roster_period_dict,
                            request=request)
# ----- emplhourstatus_rows
                    request_item = datalist_request.get('emplhourstatus')
                    if request_item:
                        # TODO last_emplhour_check
                        last_emplhour_check = None
                        datalists['emplhourstatus_rows'] = d.create_emplhourstatus_rows(
                            period_dict=roster_period_dict,
                            last_emplhour_check=last_emplhour_check,
                            request=request)
# ----- overlap
                    request_item = datalist_request.get('overlap')
                    if request_item:
                        datefirst_iso = f.get_dict_value( datalists, ('roster_period', 'period_datefirst'))
                        datelast_iso = f.get_dict_value( datalists, ('roster_period', 'period_datelast'))
                        employee_pk_list = request_item.get('employee_pk_list')
                        overlap_dict = f.check_emplhour_overlap(datefirst_iso, datelast_iso, employee_pk_list, request)
                        if overlap_dict:
                            datalists['overlap_dict'] = overlap_dict
# ----- review_list
                    request_item = datalist_request.get('review_list')
                    review_period_dict = datalists.get('review_period')
                    if request_item and review_period_dict:
                        # btn 'employee' / 'customer' is stored in  review_period_dict
                        btn_select = review_period_dict.get('btn')
                        # review_period_dict is already retrieved
                        if btn_select == 'employee':
                            datalists['review_list'] = d.create_review_employee_list(
                                period_dict=review_period_dict,
                                comp_timezone=comp_timezone,
                                request=request)
                        else:
                            datalists['review_list'] = d.create_review_customer_list(
                                period_dict=review_period_dict,
                                comp_timezone=comp_timezone,
                                request=request)

# ----- billing_list
                    request_item = datalist_request.get('billing_list')
                    if request_item:
                        period_dict = datalists.get('review_period')
                        datalists['billing_agg_list'] = \
                            cust_dicts.create_billing_agg_list(period_dict, request)
                        datalists['billing_rosterdate_list'] = \
                            cust_dicts.create_billing_rosterdate_list(period_dict, request)
                        datalists['billing_detail_list'] = \
                            cust_dicts.create_billing_detail_list(period_dict, request)
# ----- payroll_list
                    request_item = datalist_request.get('payroll_list')
                    if request_item:
                        payroll_period = f.get_dict_value(datalists, ('payroll_period',))
                        datalists['payroll_hours_detail_list'] = \
                            ed.create_payroll_detail_listNEW(payroll_period, comp_timezone, timeformat, user_lang, request)
                        datalists['payroll_alw_detail_list'] = \
                            ed.create_payroll_allowance_rows(payroll_period, comp_timezone, timeformat, user_lang, request)

# - paydatecode_rows
                    request_item = datalist_request.get('paydatecode_rows')
                    if request_item:
                        period_dict = {}
                        paydatecode_rows, paydateitem_rows = ed.create_paydatecode_rows(period_dict, None,{}, request)
                        datalists['paydatecode_rows'] = paydatecode_rows
                        datalists['paydateitem_rows'] = paydateitem_rows
# - wagecode_list
                    request_item = datalist_request.get('wagecode_list')
                    if request_item:
                        ed.create_wagecode_list(request_item, datalists, request)

# - get all rows of table Wagecode (wagefactor_rows, allowance_rows,  functioncode_rows)
                    if datalist_request.get('wagecode_rows'):
                        datalists['wagecode_rows'] = ed.create_wagecode_rows(None, request, {})
# - wagefactor_rows
                    if datalist_request.get('wagefactor_rows'):
                        datalists['wagefactor_rows'] = ed.create_wagecode_rows('wfc', request, {})

# - allowance_rows
                    if datalist_request.get('allowance_rows'):
                        datalists['allowance_rows'] = ed.create_wagecode_rows('alw', request, {})

# - ehal_afas_rows
                    if datalist_request.get('ehal_afas_rows'):
                        payroll_period = datalists.get('payroll_period')
                        datalists['ehal_afas_rows'] = ed.create_afas_ehal_rows(payroll_period, user_lang, request)

# - functioncode_rows are stored in wagecode_rows, key 'fnc' PR2021-03-01
                    # TODO replace functioncode_rows in employee page
                    if datalist_request.get('functioncode_rows'):
                        datalists['functioncode_rows'] = ed.create_wagecode_rows('fnc', request, {})

# - published_rows
                    if datalist_request.get('published_rows'):
                        payroll_period = datalists.get('payroll_period')
                        datalists['published_rows'] = ed.create_published_rows(payroll_period, request)

# ----- employee_calendar
                    """
                    request_item = datalist_request.get('employee_calendar')
                    calendar_period_dict = datalists.get('calendar_period')
                    # TODO 'employee_calendar' and 'employee_planning' use same function create_employee_planning
                    # calendar is for one employee / one week, planningcan be for multiple
                    # TODO merge both
                    # also get employee_calendar at startup of page
                    # empty dict (dict = {} ) is also Falsey
                    if (request_item is not None and calendar_period_dict) or \
                            (sel_page == 'page_employee' and saved_btn == 'calendar' and calendar_period_dict):

                        download_employee_calendar(request_item, calendar_period_dict, datalists, saved_customer_pk,
                                                   saved_order_pk, user_lang, comp_timezone, timeformat, request)
# ----- customer_calendar
                    request_item = datalist_request.get('customer_calendar')
                    # also get customer_planning at startup of page
                    if (request_item is not None and calendar_period_dict) or \
                            (sel_page == 'page_customer' and saved_btn == 'calendar' and calendar_period_dict):

                        download_customer_calendar(request_item, calendar_period_dict, datalists, saved_order_pk,
                                                   user_lang, comp_timezone, timeformat, request)
                   """
# ----- employee_planning OLD
                   # request_item = datalist_request.get('employee_planningOLD')
                   # planning_period_dict = datalists.get('planning_period')
                    # also get employee_planning at startup of page
                    # employee_planning is also called by page_customer
                    #if (request_item is not None and planning_period_dict) or \
                    #        (saved_btn == 'planning' and planning_period_dict):
                   #     download_employee_planning(request_item, planning_period_dict, datalists, saved_customer_pk,
                   #                                saved_order_pk, saved_employee_pk, sel_page,
                   #                                user_lang, comp_timezone, timeformat, request)

# ----- employee_planning NEW
                    request_item = datalist_request.get('employee_planningNEW')
                    planning_period_dict = datalists.get('planning_period')
                    # also get employee_planning at startup of page
                    # employee_planning is also called by page_customer
                    if (request_item is not None and planning_period_dict) or \
                            (saved_btn == 'planning' and planning_period_dict):
                        order_pk = f.get_dict_value(request_item, ('order_pk',))

                        planning_list, customer_dictlist, order_dictlist, elapsed_seconds = \
                            emplan.create_employee_planningNEW(planning_period_dict, order_pk, comp_timezone, request)

                        # PR2020-05-23 debug: datalists = {} gives parse error.
                        # elapsed_seconds to the rescue: now datalists will never be empty
                        datalists['employee_planning_list_elapsed_seconds'] = elapsed_seconds
                        datalists['employee_planning_listNEW'] = planning_list
                        datalists['employee_planning_customer_dictlist'] = customer_dictlist
                        datalists['employee_planning_order_dictlist'] = order_dictlist

# ----- customer_planning
                    # TODO
                    """
                    request_item = datalist_request.get('customer_planning')
                    # also get customer_planning at startup of page
                    if (request_item is not None and planning_period_dict) or \
                            (sel_page == 'page_customer' and saved_btn == 'planning' and planning_period_dict):
                        download_customer_planning(request_item, planning_period_dict, datalists, saved_customer_pk,
                                                   saved_order_pk, user_lang, comp_timezone, timeformat, request)
                    """
# ----- rosterdate_check
                    request_item = datalist_request.get('rosterdate_check')
                    if request_item:
                        # rosterdate_check: {rosterdate: "2019-11-14"}
                        # rosterdate_check: {mode: "delete"}
                        datalists['rosterdate_check'] = d.check_rosterdate_emplhours(request_item, user_lang, request)

# - user_list
                    request_item = datalist_request.get('user_list')
                    if request_item:
                        datalists['user_list'] = ad.create_user_list(request)

# 9. return datalists
        # PR2020-05-23 debug: datalists = {} gives parse error.
        # elapsed_seconds to the rescue: now datalists will never be empty
        elapsed_seconds = int(1000 * (timer() - starttime) ) / 1000
        datalists['elapsed_seconds'] = elapsed_seconds

        datalists_json = json.dumps(datalists, cls=LazyEncoder)

        return HttpResponse(datalists_json)


def download_setting(request_item, user_lang, comp_timezone, timeformat, interval, skip_check_updates, request):
    logging_on = s.LOGGING_ON
    if logging_on:
        logger.debug(' --- download_setting --- ' )
        logger.debug('request_item: ' + str(request_item) )
    # this function get settingss from request_item.  # PR2020-07-01 PR2021-07-06
    # if not in request_item, it takes the saved settings.

    new_setting_dict = {'user_lang': user_lang,
                        'comp_timezone': comp_timezone,
                        'timeformat': timeformat,
                        'interval': interval,
                        'skip_check_updates': skip_check_updates
                        }
    # <PERMIT>
    # put all permits in new_setting_dict
    if request.user.is_perm_employee:
        new_setting_dict['requsr_perm_employee'] = request.user.is_perm_employee
    if request.user.is_perm_planner:
        new_setting_dict['requsr_perm_planner'] = request.user.is_perm_planner
    if request.user.is_perm_supervisor:
        new_setting_dict['requsr_perm_supervisor'] = request.user.is_perm_supervisor
    if request.user.is_perm_hrman:
        new_setting_dict['requsr_perm_hrman'] = request.user.is_perm_hrman
    if request.user.is_perm_accman:
        new_setting_dict['requsr_perm_accman'] = request.user.is_perm_accman
    if request.user.is_perm_sysadmin:
        new_setting_dict['requsr_perm_sysadmin'] = request.user.is_perm_sysadmin
    if request.user.permitcustomers:
        new_setting_dict['requsr_perm_customers'] = request.user.permitcustomers
    if request.user.permitorders:
        new_setting_dict['requsr_perm_orders'] = request.user.permitorders

    # request_item: {'selected_pk': {'sel_paydatecode_pk': 23, 'sel_paydate_iso': '2020-05-22'}}
    if request_item:
# - always get selected pks from key 'selected_pk'
        key = 'selected_pk'
        has_changed = False
        sel_keys = ('sel_customer_pk', 'sel_order_pk', 'sel_scheme_pk',
                    'sel_employee_pk', 'sel_paydatecode_pk', 'sel_paydate_iso')

        saved_setting_dict = request.user.get_usersetting(key)
        new_selected_pk_dict = {}

        request_dict = request_item.get(key)
        for sel_key in sel_keys:
            saved_value = saved_setting_dict.get(sel_key)
            new_value = saved_value
            if request_dict and sel_key in request_dict:
                request_value = request_dict.get(sel_key)
                if request_value is None:
                    if saved_value is not None:
                        has_changed = True
                elif request_value != saved_value:
                    new_value = request_value
                    has_changed = True
            if new_value is not None:
                new_selected_pk_dict[sel_key] = new_value
                new_setting_dict[sel_key] = new_value
        if has_changed:
            request.user.set_usersetting(key, new_selected_pk_dict)

# - get rest of keys
        for key in request_item:
            if key != 'selected_pk':
                has_changed = False
                new_page_dict = {}
                saved_setting_dict = request.user.get_usersetting(key)

                request_dict = request_item.get(key)
                if logging_on:
                    logger.debug('saved_setting_dict: ' + str(saved_setting_dict))
                    logger.debug('request_dict: ' + str(request_dict))
################################
# get page
                if key[:4] == 'page':
                    # if 'page_' in request: and saved_btn == 'planning': also retrieve period
                    new_setting_dict['sel_page'] = key
                    if logging_on:
                        logger.debug('new_setting_dict: ' + str(new_setting_dict))
                    sel_keys = ('sel_btn', 'period_start', 'period_end', 'grid_range')
                    for sel_key in sel_keys:
                        saved_value = saved_setting_dict.get(sel_key)
                        if logging_on:
                            logger.debug('sel_key: ' + str(sel_key))
                            logger.debug('saved_value: ' + str(saved_value))
                        new_value = saved_value
                        if request_dict and sel_key in request_dict:
                            request_value = request_dict.get(sel_key)
                            if logging_on:
                                logger.debug('request_value: ' + str(request_value))
                            if request_value is None:
                                if saved_value is not None:
                                    has_changed = True
                            elif request_value != saved_value:
                                new_value = request_value
                                has_changed = True
                        if new_value is not None:
                            new_page_dict[sel_key] = new_value
                            new_setting_dict[sel_key] = new_value
                        if logging_on:
                            logger.debug('new_setting_dict: ' + str(new_setting_dict))

###################################
# get others, with key = 'value'
                else:
                    sel_key = 'value'
                    saved_value = saved_setting_dict.get(sel_key)
                    new_value = saved_value
                    if request_dict and sel_key in request_dict:
                        request_value = request_dict.get(sel_key)
                        if request_value is None:
                            if saved_value is not None:
                                has_changed = True
                        elif request_value != saved_value:
                            new_value = request_value
                            has_changed = True
                    if new_value is not None:
                        new_page_dict[key] = new_value
                        new_setting_dict[key] = new_value
# - save
                if has_changed:
                    request.user.set_usersetting(key, new_page_dict)
    return new_setting_dict


def download_page_scheme_list(request_item, datalists, saved_order_pk, saved_scheme_pk, saved_btn, user_lang, comp_timezone, request):

    logging_on = s.LOGGING_ON
    if logging_on:
        logger.debug(' ============= download_page_scheme_list ============= ')

# - check which info must be retrieved, get saved_btn etc from settings if not given in upload_dict
    is_template = request_item.get('istemplate', False)
    if 'isabsence' in request_item:
        is_absence = request_item.get('isabsence', False)
    else:
        is_absence = (saved_btn == 'btn_absence')

    if logging_on:
        logger.debug('is_template: ' + str(is_template) + ' is_absence: ' + str(is_absence))

# - get holiday_dict from previous year thru next year PR2020-07-07
    # holiday_dict is used in schemes.js Grid_FillTblShiftsNoCycle
    now = datetime.now()
    last_year_jan01 = date(now.year - 1, 1, 1)
    next_year_dec31 = date(now.year + 1, 12, 31)
    holiday_dict = f.get_holiday_dict(last_year_jan01, next_year_dec31, user_lang, request)
    if holiday_dict:
        datalists['holiday_dict'] = holiday_dict

    new_order_pk = request_item.get('order_pk')
    if new_order_pk is None:
        # get saved order if no new_order given (happens at opening of page),
        # not when is_template or is_absence
        new_order_pk = saved_order_pk

    if is_template:
        # - check if template_order exists, create if not exists
        template_order = cust_dicts.get_or_create_template_order(request)
        if template_order:
            new_order_pk = template_order.pk

# - get abscat list, create one if not exists
    absence_customer_pk = None
    if is_absence:
        # when btn_absence: get abscat list and all absence orders
        # - check if absence_customer exists, create if not exists
        absence_customer = cust_dicts.get_or_create_absence_customer(logging_on, request)
        if absence_customer:
            absence_customer_pk = absence_customer.pk
            abscat_list = cust_dicts.create_abscat_order_list(request)
            if abscat_list:
                datalists['abscat_list'] = abscat_list

# - get teammember_list list, create one if not exists
        filter_dict = {'employee_nonull': False, 'is_template': False, 'is_absence': True}
        dict_list = ed.ed_create_teammember_list(
            filter_dict=filter_dict,
            company=request.user.company,
            user_lang=user_lang)
        datalists['teammember_list'] = dict_list

    else:

        # +++ filter allowed orders when user has 'permitcustomers' or 'permitorders'
        # <PERMITS> PR2020-11-02
        #     # show only customers in request.user.permitcustomers or request.user.permitorders, show all when empty
        permitcustomers_list = request.user.permitcustomers
        permitorders_list = request.user.permitorders
        if permitcustomers_list or permitorders_list:
            pass

# - get all schemes, shifts, teams, schemeitems and teammembers of selected order PR2020-05-23
        filter_dict = {'customer_pk': absence_customer_pk, 'order_pk': new_order_pk, 'isabsence': is_absence}
        checked_customer_pk, checked_order_pk = \
            d.create_page_scheme_list(
                filter_dict=filter_dict,
                datalists=datalists,
                company=request.user.company,
                comp_timezone=comp_timezone,
                user_lang=user_lang)

        if logging_on:
            logger.debug('checked_customer_pk' + str(checked_customer_pk))
            logger.debug('checked_order_pk' + str(checked_order_pk))

        if is_template or is_absence:
            # in template mode or absence mode: don't save setting
            selected_pk_dict = {'sel_customer_pk': checked_customer_pk,
                                'sel_order_pk': checked_order_pk}
        elif checked_order_pk == saved_order_pk:
            # on opening page: order_pk has not changed: don't reset scheme_pk, dont update settings
            selected_pk_dict = {'sel_customer_pk': checked_customer_pk,
                                'sel_order_pk': checked_order_pk,
                                'sel_scheme_pk': saved_scheme_pk}
        else:
            # when order has changed: update settings, reset scheme_pk in settings
            new_setting = {'sel_customer_pk': checked_customer_pk,
                           'sel_order_pk': checked_order_pk,
                           'sel_scheme_pk': 0}

            selected_pk_dict = request.user.get_usersetting('selected_pk')
            if logging_on:
                logger.debug('selected_pk_dict' + str(selected_pk_dict))

            # don't replace setting_dict, you will lose page info. Add key 'selected_pk' instead
            datalists_setting_dict = datalists.get('setting_dict')
            if datalists_setting_dict:
                # PR20202-06-07 debug: gave error: 'NoneType' object does not support item assignment
                # was: datalists_selected_pk_dict = datalists_setting_dict.get('selected_pk')
                datalists_selected_pk_dict = f.get_dict_value(datalists_setting_dict, ('selected_pk',), {})
                if selected_pk_dict:
                    datalists_selected_pk_dict['sel_customer_pk'] = selected_pk_dict.get('sel_customer_pk', 0)
                    datalists_selected_pk_dict['sel_order_pk'] = selected_pk_dict.get('sel_order_pk', 0)
                    datalists_selected_pk_dict['sel_scheme_pk'] = selected_pk_dict.get('sel_scheme_pk', 0)

                    datalists['setting_dict']['selected_pk'] = datalists_selected_pk_dict

# NIU
def download_employee_calendar(table_dict, calendar_period_dict, datalists, saved_customer_pk, saved_order_pk,
                               user_lang, comp_timezone, timeformat, request):
   #logger.debug('table_dict: ' + str(table_dict))
    dict_list = []
    logfile = []
    customer_pk = None
    employee_pk = None
    if table_dict:
        employee_pk = table_dict.get('employee_pk')
        order_pk = table_dict.get('order_pk')
        if order_pk is None:
            customer_pk = table_dict.get('customer_pk')
    else:
        order_pk = saved_order_pk
        if order_pk is None:
            customer_pk = saved_customer_pk

    #logger.debug('employee_pk: ' + str(employee_pk))
    #logger.debug('customer_pk: ' + str(customer_pk))
    #logger.debug('order_pk: ' + str(order_pk))
    # calendar must have customer_pk, order_pk or employee_pk
    if customer_pk or order_pk or employee_pk:
        add_shifts_without_employee = calendar_period_dict.get('add_shifts_without_employee', False)
        skip_absence_and_restshifts = calendar_period_dict.get('skip_absence_and_restshifts', False)

        datefirst_iso, datelast_iso, customer_pk, order_pk, employee_pk, functioncode_pk, paydatecode_pk = None, None, None, None, None, None, None
        if calendar_period_dict:
            datefirst_iso = calendar_period_dict.get('period_datefirst')
            datelast_iso = calendar_period_dict.get('period_datelast')
            customer_pk = calendar_period_dict.get('customer_pk')
            order_pk = calendar_period_dict.get('order_pk')
            employee_pk = calendar_period_dict.get('employee_pk')
            functioncode_pk = calendar_period_dict.get('functioncode_pk')
            paydatecode_pk = calendar_period_dict.get('paydatecode_pk')

        #logger.debug('skip_absence_and_restshifts' + str(skip_absence_and_restshifts))
        orderby_rosterdate_customer = False
        dict_list, short_list, logfile = r.create_employee_planning(
            datefirst_iso=datefirst_iso,
            datelast_iso=datelast_iso,
            customer_pk=customer_pk,
            order_pk=order_pk,
            employee_pk=employee_pk,
            functioncode_pk= functioncode_pk,
            paydatecode_pk=paydatecode_pk,
            add_shifts_without_employee=add_shifts_without_employee,
            skip_absence_and_restshifts=skip_absence_and_restshifts,
            orderby_rosterdate_customer=orderby_rosterdate_customer,
            comp_timezone=comp_timezone,
            timeformat=timeformat,
            user_lang=user_lang,
            request=request)

    datalists['employee_calendar_list'] = dict_list
    if logfile:
        datalists['logfile'] = logfile


def download_customer_calendar(table_dict, calendar_period_dict, datalists, saved_order_pk,
                               user_lang, comp_timezone, timeformat, request):
   #logger.debug('table_dict: ' + str(table_dict))
    # selected order is retrieved table_dict 'customer_calendar'.
    # iF not provided: use saved_order_pk
    # order_pk cannot be blank
    #logger.debug('table_dict: customer_calendar' + str(table_dict))

    order_pk = None
    if table_dict:
        order_pk = table_dict.get('order_pk')
    if order_pk is None:
        order_pk = saved_order_pk

    datefirst_iso, datelast_iso = None, None
    if calendar_period_dict:
        datefirst_iso = calendar_period_dict.get('period_datefirst')
        datelast_iso = calendar_period_dict.get('period_datelast')

    dict_list = r.create_customer_planning(
        datefirst_iso=datefirst_iso,
        datelast_iso=datelast_iso,
        customer_pk=None,
        order_pk=order_pk,
        comp_timezone=comp_timezone,
        timeformat=timeformat,
        user_lang=user_lang,
        request=request)
    datalists['customer_calendar_list'] = dict_list


def download_employee_planning_NIU(table_dict, planning_period_dict, datalists, saved_customer_pk, saved_order_pk,
                                  saved_employee_pk, saved_page, user_lang, comp_timezone, timeformat, request):
    #logger.debug(' ----------  download_employee_planning  ---------- ')
    #logger.debug('table_dict' + str(table_dict))
    customer_pk = None
    skip_restshifts = False
    orderby_rosterdate_customer = False

    # table_dict{'employee_pk': None, 'add_shifts_without_employee': False, 'skip_restshifts': False, 'orderby_rosterdate_customer': False}
    if table_dict:
        employee_pk = table_dict.get('employee_pk')
        customer_pk = None
        order_pk = table_dict.get('order_pk')
        if order_pk is None:
            customer_pk = table_dict.get('customer_pk')
        add_shifts_without_employee = table_dict.get('add_shifts_without_employee', False)
        skip_restshifts = table_dict.get('skip_restshifts', False)
        orderby_rosterdate_customer = table_dict.get('orderby_rosterdate_customer', False)
    else:
        employee_pk = saved_employee_pk
        order_pk = saved_order_pk
        if order_pk is None:
            customer_pk = saved_customer_pk

        add_shifts_without_employee = True if saved_page == 'page_customer' else False

    datefirst_iso, datelast_iso, customer_pk, order_pk, employee_pk, functioncode_pk, paydatecode_pk = None, None, None, None, None, None, None
    if planning_period_dict:
        datefirst_iso = planning_period_dict.get('period_datefirst')
        datelast_iso = planning_period_dict.get('period_datelast')
        customer_pk = planning_period_dict.get('customer_pk')
        order_pk = planning_period_dict.get('order_pk')
        employee_pk = planning_period_dict.get('employee_pk')
        functioncode_pk = planning_period_dict.get('functioncode_pk')
        paydatecode_pk = planning_period_dict.get('paydatecode_pk')

    dict_list, short_list, logfile = r.create_employee_planning(
        datefirst_iso=datefirst_iso,
        datelast_iso=datelast_iso,
        customer_pk=customer_pk,
        order_pk=order_pk,
        employee_pk=employee_pk,
        functioncode_pk= functioncode_pk,
        paydatecode_pk=paydatecode_pk,
        add_shifts_without_employee=add_shifts_without_employee,
        skip_absence_and_restshifts=skip_restshifts,
        orderby_rosterdate_customer=orderby_rosterdate_customer,
        comp_timezone=comp_timezone,
        timeformat=timeformat,
        user_lang=user_lang,
        request=request)
    datalists['employee_planning_list'] = dict_list
    datalists['employee_planning_short_list'] = short_list
    datalists['logfile'] = logfile


def download_customer_planning(table_dict, planning_period_dict, datalists, saved_customer_pk, saved_order_pk,
                               user_lang, comp_timezone, timeformat, request):
    customer_pk = None
    #logger.debug('table_dict: customer_planning' + str(table_dict))
    if table_dict:
        customer_pk = None
        order_pk = table_dict.get('order_pk')
        if order_pk is None:
            customer_pk = table_dict.get('customer_pk')
    else:
        order_pk = saved_order_pk
        if order_pk is None:
            customer_pk = saved_customer_pk

    datefirst_iso, datelast_iso = None, None
    if planning_period_dict:
        datefirst_iso = planning_period_dict.get('period_datefirst')
        datelast_iso = planning_period_dict.get('period_datelast')

    dict_list = r.create_customer_planning(
        datefirst_iso=datefirst_iso,
        datelast_iso=datelast_iso,
        customer_pk=customer_pk,
        order_pk=order_pk,
        comp_timezone=comp_timezone,
        timeformat=timeformat,
        user_lang=user_lang,
        request=request)
    datalists['customer_planning_list'] = dict_list

