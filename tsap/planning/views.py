# PR2019-03-24
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.db.models import Q, Value
from django.db.models.functions import Lower, Coalesce
from django.http import HttpResponse
from django.shortcuts import render, redirect #, get_object_or_404
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from datetime import date, time, datetime, timedelta
from timeit import default_timer as timer

from accounts.models import Usersetting
from accounts import dicts as ad
from companies.views import LazyEncoder
from customers import dicts as cust_dicts

from tsap import constants as c
from tsap import functions as f
from tsap import locale as loc
from planning import dicts as d
from planning import prices as p
from planning import rosterfill as r
from planning import employeeplanning as emplan
from employees import dicts as ed

from tsap.settings import TIME_ZONE
from tsap.headerbar import get_headerbar_param

from companies import models as m
from companies import dicts as cd

from tsap.validators import validate_code_name_identifier

import pytz
import json

import logging
logger = logging.getLogger(__name__)


# === DatalistDownloadView ===================================== PR2019-05-23
@method_decorator([login_required], name='dispatch')
class DatalistDownloadView(View):  # PR2019-05-23
    #logging.disable(logging.CRITICAL)  # logging.CRITICAL disables logging calls with levels <= CRITICAL
    logging.disable(logging.NOTSET)  # logging.NOTSET re-enables logging

    def post(self, request):
        #logger.debug(' ')
        #logger.debug(' ++++++++++++++++++++ DatalistDownloadView ++++++++++++++++++++ ')
        #logger.debug('request.POST' + str(request.POST))

        starttime = timer()
        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                if request.POST['download']:

                    f.system_updates()
# ----- get user_lang
                    user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                    activate(user_lang)
# ----- get comp_timezone PR2019-06-14
                    comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
                    timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
# ----- get interval
                    interval = request.user.company.interval if request.user.company.interval else 15
# ----- get datalist_request
                    datalist_request = json.loads(request.POST['download'])
                    #logger.debug('datalist_request: ' + str(datalist_request) + ' ' + str(type(datalist_request)))

# ----- get settings -- first get settings, these are used in other downloads
                    # download_setting will update usersetting with items in request_item, and retrieve saved settings
                    request_item = datalist_request.get('setting')
                    new_setting_dict = download_setting(request_item, user_lang, comp_timezone, timeformat, interval, request)
                    # only add setting_dict to  datalists when called by request_item 'setting'
                    if request_item and new_setting_dict:
                        datalists['setting_dict'] = new_setting_dict

                    #logger.debug('new_setting_dict: ' + str(new_setting_dict))
# new_setting_dict: {'user_lang': 'nl', 'comp_timezone': 'Europe/Amsterdam',
                    # 'timeformat': '24h', 'interval': 5, 'selected_pk': {'sel_customer_pk': 748, 'sel_order_pk': 1520, 'sel_scheme_pk': 2111,
                    # 'sel_paydatecode_pk': 0,
                    # 'sel_paydate_iso': '2020-05-31'}, 'sel_page': 'page_payroll', 'sel_btn': 'payroll'}
                    #logger.debug('new_setting_dict: ' + str(new_setting_dict))
                    sel_page = new_setting_dict.get('sel_page')
                    saved_btn = new_setting_dict.get('sel_btn')
                    saved_customer_pk = new_setting_dict.get('sel_customer_pk')
                    saved_order_pk = new_setting_dict.get('sel_order_pk')
                    saved_scheme_pk = new_setting_dict.get('sel_scheme_pk')
                    saved_employee_pk = new_setting_dict.get('sel_employee_pk')
                    sel_paydatecode_pk = new_setting_dict.get('sel_paydatecode_pk')
                    sel_paydate_iso = new_setting_dict.get('sel_paydate_iso')

# ----- company setting
                    request_item = datalist_request.get('companysetting')
                    if request_item:
                        companysetting_dict = cd.get_companysetting(request_item, user_lang, request)
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
                        quicksave_dict = Usersetting.get_jsonsetting(c.KEY_USER_QUICKSAVE, request.user)
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
                        datalists['employee_rows'] = ed.create_employee_rows(request_item, {}, request)

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
# ----- abscat_list
                    if datalist_request.get('abscat_list'):
                        datalists['abscat_list'] = cust_dicts.create_abscat_order_list(request)
                    request_item = datalist_request.get('abscat_rows')
                    if request_item:
                        datalists['abscat_rows'] = cust_dicts.create_abscat_order_rows(
                            request=request, request_item=request_item)

# ----- absence_rows used in scheme and employee
                    request_item = datalist_request.get('absence_rows')
                    if request_item:
                        datalists['absence_rows'] = ed.create_absence_rows(
                            filter_dict=request_item,
                            teammember_pk=None,
                            msg_dict = {},
                            request=request)

# - page_scheme_list - lists with all schemes, shifts, teams, schemeitems and teammembers of selected order_pk
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
                        dict_list = d.create_scheme_list(
                            filter_dict=request_item,
                            company=request.user.company,
                            comp_timezone=comp_timezone,
                            user_lang=user_lang)
                        datalists['scheme_list'] = dict_list
# ----- shift
                    request_item = datalist_request.get('shift')
                    if request_item:
                        shift_list, shift_rows = d.create_shift_list(
                            filter_dict=request_item,
                            company=request.user.company,
                            user_lang=user_lang)
                        if shift_list:
                            datalists['shift_list'] = shift_list
                        if shift_rows:
                            datalists['shift_rows'] = shift_rows
# ----- team
                    request_item = datalist_request.get('team')
                    if request_item:
                        dict_list = d.create_team_list(
                            filter_dict=request_item,
                            company=request.user.company)
                        datalists['team_list'] = dict_list
# ----- teammember
                    request_item = datalist_request.get('teammember_list')
                    if request_item:
                        dict_list = ed.create_teammember_list(
                            filter_dict=request_item,
                            company=request.user.company,
                            user_lang=user_lang)
                        # is_absence = f.get_dict_value(request_item, ('is_absence',), False)
                        #key_str = 'absence_list' if is_absence else 'teammember_list'
                        datalists['teammember_list'] = dict_list

# ----- schemeitem
                    request_item = datalist_request.get('schemeitem')
                    if request_item:
                        dict_list = d.create_schemeitem_list(filter_dict=request_item, company=request.user.company)
                        datalists['schemeitem_list'] = dict_list
# ----- price -- used in page price
                    request_item = datalist_request.get('price')
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
                        emplhournote_rows = d.create_emplhournote_rows(
                            period_dict=roster_period_dict,
                            last_emplhour_check=last_emplhour_check,
                            request=request)

                        # PR2019-11-18 debug don't use 'if emplhour_list:, blank lists must also be returned
                        if is_emplhour_check:
                            if no_changes:
                                datalists = {'no_changes': True}
                            else:
                                datalists['emplhour_updates'] = emplhour_rows
                                if emplhournote_rows:
                                    datalists['emplhournote_updates'] = emplhournote_rows
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
                            datalists['emplhournote_rows'] = emplhournote_rows

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
                        datalists['payroll_period_detail_list'] = \
                            ed.create_payroll_detail_listNEW(payroll_period, comp_timezone, timeformat, user_lang, request)

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
# - wagefactor_rows
                    if datalist_request.get('wagefactor_rows'):
                        datalists['wagefactor_rows'] = ed.create_wagefactor_rows(request, {})
# - functioncode_list
                    if datalist_request.get('functioncode_rows'):
                        datalists['functioncode_rows'] = ed.create_functioncode_rows(None, {}, request)

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
                    #logger.debug('............datalists setting_dict: ' + str(datalists.get('setting_dict')))
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
                    #logger.debug('............datalists setting_dict: ' + str(datalists.get('setting_dict')))
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
                    #logger.debug('............datalists setting_dict: ' + str(datalists.get('setting_dict')))

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
                        datalists['rosterdate_check'] = d.get_rosterdate_check(request_item, request)

# - user_list
                    request_item = datalist_request.get('user_list')
                    if request_item:
                        datalists['user_list'] = ad.create_user_list(request)

# 9. return datalists
        # PR2020-05-23 debug: datalists = {} gives parse error.
        # elapsed_seconds to the rescue: now datalists will never be empty
        elapsed_seconds = int(1000 * (timer() - starttime) ) /1000
        datalists['elapsed_seconds'] = elapsed_seconds

        datalists_json = json.dumps(datalists, cls=LazyEncoder)

        return HttpResponse(datalists_json)


def download_setting(request_item, user_lang, comp_timezone, timeformat, interval, request):  # PR2020-07-01
    #logger.debug(' --- download_setting --- ' )
    #logger.debug('request_item: ' + str(request_item) )
    # this function get settingss from request_item.
    # if not in request_item, it takes the saved settings.
    new_setting_dict = {'user_lang': user_lang,
                        'comp_timezone': comp_timezone,
                        'timeformat': timeformat,
                        'interval': interval}
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

        saved_setting_dict = Usersetting.get_jsonsetting(key, request.user)
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
            #logger.debug('Usersetting.set_jsonsetting from download_setting')
            Usersetting.set_jsonsetting(key, new_selected_pk_dict, request.user)

# - get rest of keys
        for key in request_item:
            if key != 'selected_pk':
                has_changed = False
                new_page_dict = {}
                saved_setting_dict = Usersetting.get_jsonsetting(key, request.user)

                request_dict = request_item.get(key)
                #logger.debug('saved_setting_dict: ' + str(saved_setting_dict))
                #logger.debug('request_dict: ' + str(request_dict))
################################
# get page
                if key[:4] == 'page':
                    # if 'page_' in request: and saved_btn == 'planning': also retrieve period
                    new_setting_dict['sel_page'] = key
                    #logger.debug('new_setting_dict: ' + str(new_setting_dict))
                    sel_keys = ('sel_btn', 'period_start', 'period_end', 'grid_range')
                    for sel_key in sel_keys:
                        saved_value = saved_setting_dict.get(sel_key)
                        #logger.debug('sel_key: ' + str(sel_key))
                        #logger.debug('saved_value: ' + str(saved_value))
                        new_value = saved_value
                        if request_dict and sel_key in request_dict:
                            request_value = request_dict.get(sel_key)
                            #logger.debug('request_value: ' + str(request_value))
                            if request_value is None:
                                if saved_value is not None:
                                    has_changed = True
                            elif request_value != saved_value:
                                new_value = request_value
                                has_changed = True
                        if new_value is not None:
                            new_page_dict[sel_key] = new_value
                            new_setting_dict[sel_key] = new_value
                        #logger.debug('new_setting_dict: ' + str(new_setting_dict))

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
                    #logger.debug('Usersetting.set_jsonsetting from download_setting')
                    Usersetting.set_jsonsetting(key, new_page_dict, request.user)
    return new_setting_dict


def download_page_scheme_list(request_item, datalists, saved_order_pk, saved_scheme_pk, saved_btn, user_lang, comp_timezone, request):
    #logger.debug(' ============= download_page_scheme_list ============= ')

# check which info must be retrieved, get saved_btn etc from settings if not given in upload_dict
    is_template = request_item.get('istemplate', False)
    if 'isabsence' in request_item:
        is_absence = request_item.get('isabsence', False)
    else:
        is_absence = (saved_btn == 'btn_absence')
    #logger.debug('is_template: ' + str(is_template) + ' is_absence: ' + str(is_absence))

# - get holiday_dict from previous year thru next year PR2020-07-07
    # holiday_dict is used in schemes.js Grid_CreateTblShiftsNoCycle
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

            #logger.debug('template_order: ' + str(template_order))
    #logger.debug('new_order_pk: ' + str(new_order_pk))
    absence_customer_pk = None
    if is_absence:
        # when btn_absence: get abscat list and all absence orders
        # - check if absence_customer exists, create if not exists
# - get abscat list, create one if not exists
        absence_customer = cust_dicts.get_or_create_absence_customer(request)
        if absence_customer:
            absence_customer_pk = absence_customer.pk
            abscat_list = cust_dicts.create_abscat_order_list(request)
            if abscat_list:
                datalists['abscat_list'] = abscat_list
# - get teammember_list list, create one if not exists
        filter_dict = {'employee_nonull': False, 'is_template': False, 'is_absence': True}
        dict_list = ed.create_teammember_list(
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

        filter_dict = {'customer_pk': absence_customer_pk, 'order_pk': new_order_pk, 'isabsence': is_absence}
        # PR2020-05-23 get all all schemes, shifts, teams, schemeitems and teammembers of selected order
        checked_customer_pk, checked_order_pk = \
            d.create_page_scheme_list(
                filter_dict=filter_dict,
                datalists=datalists,
                company=request.user.company,
                comp_timezone=comp_timezone,
                user_lang=user_lang)

        #logger.debug('checked_customer_pk' + str(checked_customer_pk))
        #logger.debug('checked_order_pk' + str(checked_order_pk))
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
            # TODO get rid of set_selected_pk
            selected_pk_dict = Usersetting.set_selected_pk(new_setting, request.user)
        
           #logger.debug('selected_pk_dict' + str(selected_pk_dict))
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


def download_employee_planning(table_dict, planning_period_dict, datalists, saved_customer_pk, saved_order_pk,
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


# === RosterView ===================================== PR2019-05-26
@method_decorator([login_required], name='dispatch')
class RosterView(View):

    def get(self, request):
        #logger.debug(' ============= RosterView ============= ')
        user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
        activate(user_lang)
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'roster.html')


# === SchemesView ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class SchemesView(View):

    def get(self, request):
        param = {}
        #logger.debug(' ============= SchemesView ============= ')
        if request.user.company is not None:

# --- get user_lang
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT

# --- get weekdays translated
            lang = user_lang if user_lang in c.WEEKDAYS_ABBREV else c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[lang])

# --- get months translated
            lang = user_lang if user_lang in c.MONTHS_ABBREV else c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[lang])

# --- get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# ---  get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

# get timeformat
            timeformat = '24h' # or 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in c.TIMEFORMATS:
                timeformat = '24h'

            param = get_headerbar_param(request, {})


        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'schemes.html', param)


@method_decorator([login_required], name='dispatch')
class SchemeTemplateUploadView(View):  # PR2019-07-20 PR2020-07-02
    def post(self, request, *args, **kwargs):
        #logger.debug(' ====== SchemeTemplateUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_planner:

 # - Reset language
            # PR2019-08-24 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# get comp_timezone
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: { Note: 'pk' is pk of scheme that will be copied to template
                # 'copytotemplate': {'id': {'pk': 1482, 'ppk': 1270, 'istemplate': True, 'table': 'scheme', 'mode': 'copyto'},
                # 'code': {'value': '4 daags SJABLOON', 'update': True}}}

                copyto_order_pk, copyto_customer_pk, new_scheme_pk = None, None,  None
                dict = upload_dict.get('copytotemplate')
                if dict:
                    template_customer_pk = copy_to_template(upload_dict['copytotemplate'], request)
                else:
                    dict = upload_dict.get('copyfromtemplate')
                    if dict:
                        template_scheme_pk = f.get_dict_value(dict, ('id', 'pk'), 0)
                        template_order_pk = f.get_dict_value(dict, ('id', 'ppk'), 0)
                        scheme_code = f.get_dict_value(dict, ('code', 'value'))
                        copyto_order_pk = f.get_dict_value(dict, ('copyto_order', 'pk'))
                        copyto_customer_pk = f.get_dict_value(dict, ('copyto_order', 'ppk'))

                        new_scheme_pk = copyfrom_template(template_scheme_pk, template_order_pk, scheme_code, copyto_order_pk, request)
                        order_dict = dict.get('copyto_order')
                        if order_dict:
                            template_customer_pk = order_dict.get('ppk')

# upload_dict: {'id': {'pk': 1346, 'ppk': 1235, 'istemplate': True, 'table': 'scheme', 'mode': 'copyfrom'},
                # 'copyto_order': {'pk': 1238, 'ppk': 597},
                # 'code': {'value': 'grgrgrg=========', 'update': True}}

# - get template_custome, needed to refresh scheme_list after update
                """
                customer = None
                if template_customer_pk:
                    customer = m.Customer.objects.get_or_none(
                        id=template_customer_pk,
                        company=request.user.company
                    )

                if customer:
                """
                if True:
# 8. update scheme_list
                    # templates and normal schemes are in one table, so dont filter on customer_pk
                    # filters by customer, therefore no need for istemplate or inactve filter
                    # dont show singleshifts
                    saved_order_pk = copyto_order_pk
                    saved_scheme_pk = new_scheme_pk
                    saved_btn = 'btn_grid'
                    request_item = {'order_pk': copyto_order_pk, 'istemplate': False}
                    download_page_scheme_list(request_item, update_wrap, saved_order_pk, saved_scheme_pk,
                                                saved_btn, user_lang, comp_timezone, request)

                    update_wrap['copied_from_template'] = {
                        'customer_pk': copyto_customer_pk,
                        'order_pk': copyto_order_pk,
                        'scheme_pk': new_scheme_pk,
                        'is_template_mode': False}  # leave templates and go back to normal schemes

                    """
                    scheme_list = d.create_scheme_list(
                        filter_dict={'customer_pk': None, 'is_singleshift': None},
                        company=request.user.company,
                        comp_timezone=comp_timezone,
                        user_lang=user_lang)
                    if scheme_list:
                        update_wrap['scheme_list'] = scheme_list

                    shift_list = d.create_shift_list(
                        filter_dict={'customer_pk': None},
                        company=request.user.company,
                        user_lang=user_lang)
                    if shift_list:
                        update_wrap['shift_list'] = shift_list

                    team_list = d.create_team_list(
                        filter_dict={'customer_pk': None},
                        company=request.user.company)
                    if team_list:
                        update_wrap['team_list'] = team_list

                    teammember_list = ed.create_teammember_list(
                        filter_dict={'isabsence': None},
                        company=request.user.company,
                        user_lang=user_lang)
                    if teammember_list:
                        update_wrap['teammember_list'] = teammember_list

                    schemeitem_list = d.create_schemeitem_list( filter_dict={'customer_pk': None}, company=request.user.company)
                    if schemeitem_list:
                        update_wrap['schemeitem_list'] = schemeitem_list

                    update_wrap['refresh_tables'] = {'new_scheme_pk': new_scheme_pk}
                    """
        update_dict_json = json.dumps(update_wrap, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

        #datalists_json = json.dumps(datalists, cls=LazyEncoder)
        #return HttpResponse(datalists_json)




def copy_to_template(upload_dict, request):  # PR2019-08-24  # PR2020-03-11
    #logger.debug(' ====== copy_to_template ============= ')
    #logger.debug(upload_dict)

    newtemplate_customer_pk, copyfrom_scheme, newtemplate_order = None, None, None

# - get pk_int ppk_int and newtemplate_code
    # Note: 'pk' in upload_dict is pk of scheme that will be copied to template
    copyfrom_scheme_pk = int(f.get_dict_value(upload_dict, ('id', 'pk'), 0))
    copyfrom_scheme_ppk = int(f.get_dict_value(upload_dict, ('id', 'ppk'), 0))
    newtemplate_code = f.get_dict_value(upload_dict, ('code','value'))

    if copyfrom_scheme_pk and copyfrom_scheme_ppk and newtemplate_code:
        table = 'scheme'
# - check if copyfrom_order exists (order is parent of scheme)
        copyfrom_order = m.Order.objects.get_or_none(id=copyfrom_scheme_ppk, customer__company=request.user.company)
        if copyfrom_order:
# - check if copyfrom_scheme exists
            copyfrom_scheme = m.Scheme.objects.get_or_none(id=copyfrom_scheme_pk, order=copyfrom_order)
# - check if newtemplate_order exists, create if not exists
            newtemplate_order = cust_dicts.get_or_create_template_order(request)
# - return newtemplate_customer_pk, needed to refresh scheme_list after update
            newtemplate_customer_pk = newtemplate_order.customer_id

    is_ok = False
# - copy scheme to template  (don't copy datefirst, datelast)
    newtemplate_scheme = None
    if copyfrom_scheme and newtemplate_order:

        #logger.debug('copyfrom_scheme: ' + str(copyfrom_scheme))
        #logger.debug('newtemplate_order: ' + str(newtemplate_order))
        #logger.debug('newtemplate_code: ' + str(newtemplate_code))
        #logger.debug('len: ' + str(len(newtemplate_code)))
        if len(newtemplate_code) > c.CODE_MAX_LENGTH:
            newtemplate_code = newtemplate_code[:c.CODE_MAX_LENGTH]
        try:
            newtemplate_scheme = m.Scheme(
                order=newtemplate_order,
                code=newtemplate_code,
                # dont copy: cat=template_cat,
                # dont copy: isabsence=template_isabsence,
                istemplate=True,
                cycle=copyfrom_scheme.cycle,
                # dont copy: billable=template_billable,
                excludecompanyholiday=copyfrom_scheme.excludecompanyholiday,
                divergentonpublicholiday=copyfrom_scheme.divergentonpublicholiday,
                excludepublicholiday=copyfrom_scheme.excludepublicholiday,
                nohoursonsaturday=copyfrom_scheme.nohoursonsaturday,
                nohoursonsunday=copyfrom_scheme.nohoursonsunday,
                nohoursonpublicholiday=copyfrom_scheme.nohoursonpublicholiday,
                # dont copy: pricecode=template_pricecode,
                # dont copy: additioncode=template_additioncode,
                # dont copy: taxcode=template_taxcode
            )
            newtemplate_scheme.save(request=request)
            is_ok = True
        except:
            pass
            #logger.debug('Error copy_to_template create newtemplate_scheme: upload_dict: ' + str(upload_dict))

    #logger.debug('newtemplate_scheme: ' + str(newtemplate_scheme))
    mapping_shifts = {}
    if is_ok and newtemplate_scheme:
# - copy shifts to template
        try:
            for shift in m.Shift.objects.filter(scheme=copyfrom_scheme):
                newtemplate_shift = m.Shift(
                    scheme=newtemplate_scheme,
                    code=shift.code,
                    isrestshift=shift.isrestshift,
                    istemplate=True,
                    offsetstart=shift.offsetstart,
                    offsetend=shift.offsetend,
                    breakduration=shift.breakduration,
                    timeduration=shift.timeduration,
                    # dont copy: cat=shift.cat,
                    # dont copy: billable=shift.billable,
                    # dont copy: pricecode=shift.pricecode,
                    # dont copy: additioncode=shift.additioncode,
                    # dont copy: taxcode=shift.taxcode,
                    # dont copy: wagefactorcode=shift.wagefactorcode
                )
                newtemplate_shift.save(request=request)
                # make dict with mapping of old and new shift_id
                mapping_shifts[shift.pk] = newtemplate_shift.pk
        except:
            is_ok = False
            #logger.debug('Error copy_to_template create newtemplate_shift: newtemplate_scheme: ' + str(newtemplate_scheme) + ' ' +str(type(newtemplate_scheme)))

    #logger.debug('mapping_shifts: ' + str(mapping_shifts))
# - copy teams to template
    mapping_teams = {}
    if is_ok:
        try:
            for team in m.Team.objects.filter(scheme=copyfrom_scheme):
                newtemplate_team = m.Team(
                    scheme=newtemplate_scheme,
                    code=team.code,
                    issingleshift=team.issingleshift,
                    istemplate=True
                    # dont copy: cat=team.cat,
                    # dont copy: isabsence=team.isabsence,
                )
                newtemplate_team.save(request=request)
                # make dict with mapping of old and new team_id
                mapping_teams[team.pk] = newtemplate_team.pk

# - copy teammembers of this team to template
                teammembers = m.Teammember.objects.filter(team=team)
                for teammember in teammembers:
                    # dont copy employee, replacement and datfirst datelast
                    newtemplate_teammember = m.Teammember(
                        team=newtemplate_team,
                        istemplate=True
                        # dont copy: issingleshift=teammember.issingleshift,
                        # dont copy: cat=teammember.cat,
                        # dont copy: isabsence=teammember.isabsence,
                        # dont copy: wagefactorcode=teammember.wagefactorcode,
                        # dont copy: pricecode=teammember._pricecode,
                        # dont copy: additioncode=teammember.additioncode,
                        # dont copy: override=teammember.override
                    )
                    newtemplate_teammember.save(request=request)
        except:
            is_ok = False
            #logger.debug('Error copy_to_template create newtemplate_team: newtemplate_scheme: ' + str(newtemplate_scheme) + ' ' + str(type(newtemplate_scheme)))
    #logger.debug('mapping_teams: ' + str(mapping_teams))
# - copy schemeitems to template
    if is_ok:
        try:
            for schemeitem in m.Schemeitem.objects.filter(scheme=copyfrom_scheme):
             # loopkup shift
                template_shift = None
                if schemeitem.shift:
                    template_shift_pk = mapping_shifts.get(schemeitem.shift.pk)
                    if template_shift_pk:
                        template_shift = m.Shift.objects.get_or_none(pk=template_shift_pk)
            # loopkup team
                template_team = None
                if schemeitem.team:
                    template_team_pk = mapping_teams.get(schemeitem.team.pk)
                    if template_team_pk:
                        template_team = m.Team.objects.get_or_none(pk=template_team_pk)
                newtemplate_schemeitem = m.Schemeitem(
                    scheme=newtemplate_scheme,
                    shift=template_shift,
                    team=template_team,
                    rosterdate=schemeitem.rosterdate,
                    onpublicholiday=schemeitem.onpublicholiday,
                    # dont copy: issingleshift=schemeitem.issingleshift,
                    istemplate=True
                    # dont copy: cat=schemeitem.cat,
                    # dont copy: isabsence=schemeitem.isabsence,
                )
                newtemplate_schemeitem.save(request=request)
        except:
            is_ok = False
            #logger.debug('Error copy_to_template create newtemplate_schemeitem: newtemplate_scheme: ' + str(newtemplate_scheme) + ' ' + str(type(newtemplate_scheme)))
    if not is_ok:
        newtemplate_customer_pk = None
    return newtemplate_customer_pk


def copyfrom_template(template_scheme_pk, template_order_pk, scheme_code, copyto_order_pk, request):  # PR2019-07-26 PR2020-07-02
    #logger.debug(' ====== copyfrom_template ============= ')
    # thids function copies the template scheme plus shifts, teams, teammembers, schemeitems
    # and saves it as a new scheme of order with 'copyto_order_pk'
    # return value is new_scheme_pk

    new_scheme_pk = 0

    template_scheme, new_scheme_order, new_scheme, is_ok = None, None, None, False
    if template_scheme_pk and template_order_pk and copyto_order_pk and scheme_code:
# - check if template_scheme and template_scheme exist (order is parent of scheme)
        template_order = m.Order.objects.get_or_none(id=template_order_pk, customer__company=request.user.company)
        template_scheme = m.Scheme.objects.get_or_none(id=template_scheme_pk, order=template_order)

# - check if the order exists to which the template will be copied
        new_scheme_order = m.Order.objects.get_or_none(id=copyto_order_pk, customer__company=request.user.company)

    if template_scheme and new_scheme_order:
        try:
# - copy template_scheme to new_scheme (don't copy datefirst, datelast)
            new_scheme = m.Scheme(
                order=new_scheme_order,
                code=scheme_code,
                istemplate=False,
                cycle=template_scheme.cycle,
                # dont copy: billable=template_scheme.billable,
                excludecompanyholiday=template_scheme.excludecompanyholiday,
                divergentonpublicholiday=template_scheme.divergentonpublicholiday,
                excludepublicholiday=template_scheme.excludepublicholiday,
                nohoursonsaturday=template_scheme.nohoursonsaturday,
                nohoursonsunday=template_scheme.nohoursonsunday,
                nohoursonpublicholiday=template_scheme.nohoursonpublicholiday,
                # dont copy: cat=template_scheme.cat,
                # dont copy: isabsence=template_scheme.isabsence,
                # dont copy: pricecode=template_scheme.pricecode,
                # dont copy: additioncode=template_scheme.additioncode,
                # dont copy: taxcode=template_scheme.taxcode
            )
            new_scheme.save(request=request)
        except:
            pass
            #logger.debug('Error copyfrom_template create new_scheme: scheme_code: ' + str(scheme_code) + ' new_scheme_order: ' + str(new_scheme_order) + ' ' + str(type(new_scheme_order)))

    is_ok = True
    shift_mapping = {}
    if new_scheme:
        try:
            new_scheme_pk = new_scheme.pk
# - copy template_shifts to scheme
            template_shifts = m.Shift.objects.filter(scheme=template_scheme)
            for template_shift in template_shifts:
                new_shift = m.Shift(
                    scheme=new_scheme,
                    code=template_shift.code,
                    isrestshift=template_shift.isrestshift,
                    istemplate=False,
                    offsetstart=template_shift.offsetstart,
                    offsetend=template_shift.offsetend,
                    breakduration=template_shift.breakduration,
                    timeduration=template_shift.timeduration,
                    # dont copy: cat=template_shift.cat,
                    # dont copy: billable=template_shift.billable,
                    # dont copy: pricecode=template_shift.pricecode,
                    # dont copy: additioncode=template_shift.additioncode,
                    # dont copy: taxcode=template_shift.taxcode,
                    # dont copy: wagefactorcode=template_shift.wagefactorcode
                )
                new_shift.save(request=request)
                # make dict with mapping of old and new team_id
                shift_mapping[template_shift.pk] = new_shift.pk
            #logger.debug('template_shifts mapping: ' + str(shift_mapping))
        except:
            is_ok = False
            #logger.debug('Error copyfrom_template create new_scheme: scheme_code: ' + str(scheme_code) + ' new_scheme_order: ' + str(new_scheme_order) + ' ' + str(type(new_scheme_order)))

# - copy template_teams to scheme
    team_mapping = {}
    if is_ok:
        try:
            template_teams = m.Team.objects.filter(scheme=template_scheme)
            for template_team in template_teams:
                new_team = m.Team(
                    scheme=new_scheme,
                    code=template_team.code,
                    istemplate=False
                    # dont copy: cat=template_team.cat,
                    # dont copy: isabsence=template_team.isabsence,
                )
                new_team.save(request=request)
                # make dict with mapping of old and new team_id
                team_mapping[template_team.pk] = new_team.pk

# - copy teammembers of this team to template
                template_teammembers = m.Teammember.objects.filter(team=template_team)
                for template_teammember in template_teammembers:
                    # dont copy employee, replacement and datfirst datelast
                    new_teammember = m.Teammember(
                        team=new_team,
                        istemplate=False
                    )
                    new_teammember.save(request=request)
        except:
            is_ok = False
            #logger.debug('Error copyfrom_template create new_scheme: scheme_code: ' + str(scheme_code) +
                         #' new_scheme_order: ' + str(new_scheme_order) + ' ' + str(type(new_scheme_order)))

# - copy template_schemeitems to schemeitems
    if is_ok:
        try:
            template_schemeitems = m.Schemeitem.objects.filter(scheme=template_scheme)
            for template_schemeitem in template_schemeitems:

            # - lookup shift, add to new_schemeitem when found
                new_shift = None
                if template_schemeitem.shift:
                    lookup_shift_pk = shift_mapping[template_schemeitem.shift_id]
                    new_shift = m.Shift.objects.get_or_none(pk=lookup_shift_pk)

            # - lookup team, add to new_schemeitem when found
                new_team = None
                if template_schemeitem.team:
                    lookup_team_pk = team_mapping[template_schemeitem.team_id]
                    new_team = m.Team.objects.get_or_none(pk=lookup_team_pk)

                #logger.debug('template_schemeitem: ' + str(template_schemeitem))
                new_schemeitem = m.Schemeitem(
                    scheme=new_scheme,
                    shift=new_shift,
                    team=new_team,
                    rosterdate=template_schemeitem.rosterdate,
                    onpublicholiday=template_schemeitem.onpublicholiday,
                    istemplate=False
                    # dont copy: cat=template_schemeitem.cat,
                    # dont copy: isabsence=template_schemeitem.isabsence,
                    # dont copy: issingleshift=template_schemeitem.issingleshift,
                    # don't copy these fields: billable, pricerate, priceratejson, additionjson
                )
                new_schemeitem.save(request=request)
        except:
            is_ok = False
            #logger.debug('Error copyfrom_template create new_scheme: scheme_code: ' + str(scheme_code) + ' new_scheme_order: ' + str(new_scheme_order) + ' ' + str(type(new_scheme_order)))
    if not is_ok:
        new_scheme_pk = None
    return new_scheme_pk


def create_deafult_templates(request, user_lang):  # PR2019-08-24
    #logger.debug(' ====== create_deafult_templates ============= ')

 # get locale text of standard scheme
    lang = user_lang if user_lang in c.SCHEME_24H_DEFAULT else c.LANG_DEFAULT
    scheme_locale = c.SCHEME_24H_DEFAULT[lang] # (code, cycle, excludeweekend, excludepublicholiday) PR2019-08-24

# - check if template_order exists, create if not exists
    template_order = cust_dicts.get_or_create_template_order(request)
    #logger.debug("template_order: " + str(template_order.pk) + ' ' + str(template_order.code))

# - add scheme to template  (don't add datefirst, datelast)
    template_scheme = m.Scheme(
        order=template_order,
        istemplate=True,
        code=scheme_locale[0],
        cycle=scheme_locale[1],
        excludecompanyholiday=scheme_locale[2],
        excludepublicholiday=scheme_locale[3]
    )
    template_scheme.save(request=request)

# - add shifts to template
    mapping_shift = {}
    shifts_locale = c.SHIFT_24H_DEFAULT[lang] # (code, cycle, excludeweekend, excludepublicholiday) PR2019-08-24
    for index, shift in enumerate(shifts_locale):
        template_shift = m.Shift(
            scheme=template_scheme,
            istemplate=True,
            code=shift[0]
        )
        if shift[1]:
            template_shift.offsetstart=shift[1]
        if shift[2]:
            template_shift.offsetend=shift[2]
        if shift[3]:
            template_shift.breakduration=shift[3]
        template_shift.save(request=request)
# make dict with mapping of index in shifts_locale and new shift_id
        mapping_shift[index] = template_shift.pk

# - add teams to template
    mapping_team = {}
    teams_locale = c.TEAM_24H_DEFAULT[lang]  # (code, cycle, excludecompanyholiday, excludepublicholiday) PR2019-08-24
    for index, team_code in enumerate(teams_locale):

# - add teams to template
        template_team = m.Team(
            scheme=template_scheme,
            istemplate=True,
            code=team_code
        )
        template_team.save(request=request)
        # make dict with mapping of index in shifts_locale and new shift_id
        mapping_team[index] = template_team.pk

# - add schemeitems to template
    for index, item in enumerate(c.SCHEMEITEM_24H_DEFAULT):
        # 0 = cycleday, 1 = shift, 2 = team
        cycleday = item[0]

# get rosterdate
        today = date.today()
        rosterdate = today + timedelta(days=cycleday)

# get shift
        shift = None
        shift_pk = mapping_shift[item[1]]  # item[1] is shift_index
        if shift_pk:
            shift = m.Shift.objects.get_or_none(pk=shift_pk, scheme=template_scheme)
 # get team
        team = None
        team_pk = mapping_team[item[2]]  # item[2] is team_index
        if team_pk:
            team = m.Team.objects.get_or_none(pk=team_pk, scheme=template_scheme)
# TODO get on_publicholiday
        on_publicholiday = False

# - copy schemeitems to template
        # fields: scheme, shift, team, wagefactor, rosterdate , timestart, timeend, timeduration
        # TODO add  scheme=newtemplate_scheme,
        #           shift=template_shift,
        #           team=template_team,
        #           rosterdate=schemeitem.rosterdate,
        #           onpublicholiday=schemeitem.onpublicholiday,
        #           issingleshift=schemeitem.issingleshift,
        #           istemplate=True
        #           # dont copy: cat=schemeitem.cat,
        #           # dont copy: isabsence=schemeitem.isabsence,

        template_schemeitem = m.Schemeitem(
            scheme=template_scheme,
            rosterdate=rosterdate,
            onpublicholiday=on_publicholiday,
            istemplate=True,
        )
        if team:
            template_schemeitem.team = team
        if shift:
            template_schemeitem.shift = shift
            # TODO calc timestart timeend timeduration

# save template_schemeitem
        template_schemeitem.save(request=request)
        #logger.debug('template_schemeitem.shift: ' + str(template_schemeitem.shift))


# === GridUploadView ===================================== PR2020-03-18
@method_decorator([login_required], name='dispatch')
class GridUploadView(UpdateView):  #PR2020-03-18

    def post(self, request, *args, **kwargs):
       #logger.debug(' ')
       #logger.debug(' ============= GridUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_planner:

# 1. Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# b. get comp_timezone
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# 2. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
               #logger.debug('upload_dict: ' + str(upload_dict))
                eplh_update_list = []

# 3. get iddict variables
                table = f.get_dict_value(upload_dict, ('id', 'table'))
                if table == 'team':
                    update_wrap = team_upload(request, upload_dict, comp_timezone, user_lang)

        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class SchemeOrShiftOrTeamUploadView(UpdateView):  # PR2019-05-25

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= SchemeOrShiftOrTeamUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_planner:

# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)
# - get comp_timezone
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
# - get upload_dict from request.POST
            upload_json = request.POST.get("upload")
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('..........upload_dict: ' + str(upload_dict))
# - save quicksave
            # quicksave is saved via UploadUserSetting
# - get iddict variables
                table = f.get_dict_value(upload_dict, ('id','table'))
                if table == 'scheme':
                    update_wrap = scheme_upload(request, upload_dict, comp_timezone, user_lang)
                elif table == 'shift':
                    update_dict = shift_upload(request, upload_dict, user_lang)
                    # 7. add update_dict to update_wrap
                    if update_dict:
                        #update_wrap['shift_update'] = update_dict
                        update_wrap['shift_update_list'] = [update_dict]
                    # update shift_list when changes are made
                        shift_list = d.create_shift_list({}, request.user.company, user_lang)
                        if shift_list:
                            update_wrap['shift_list'] = shift_list
                    # update schemeitem_list when changes are made
                    # necessary to update offset in schemeitems
                        schemeitem_list = d.create_schemeitem_list(filter_dict={}, company=request.user.company)
                        if schemeitem_list:
                            update_wrap['schemeitem_list'] = schemeitem_list

                        teammember_list = ed.create_teammember_list(
                            filter_dict={'isabsence': False},
                            company=request.user.company,
                            user_lang=user_lang)
                        if teammember_list:
                            update_wrap['teammember_list'] = teammember_list

                    # 6. also recalc schemitems
                    # PR2019-12-11 dont update offset / time in schemeitems any more
                    # recalc_schemeitems(instance, request, comp_timezone)

                elif table == 'team':
                    update_wrap = team_upload(request, upload_dict, comp_timezone, user_lang)

# 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


def scheme_upload(request, upload_dict, comp_timezone, user_lang):  # PR2019-05-31
    #logger.debug(' --- scheme_upload --- ')
    #logger.debug('upload_dict: ' + str(upload_dict))

    update_wrap = {}
# - get iddict variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = id_dict.get('table', '')
        pk_int = id_dict.get('pk')
        ppk_int = id_dict.get('ppk')
        row_index = id_dict.get('rowindex', '')
        is_create = ('create' in id_dict)
        is_delete = ('delete' in id_dict)
# - create empty update_dict with fields
        update_dict = f.create_update_dict(
            c.FIELDS_SCHEME,
            table=table,
            pk=pk_int,
            ppk=ppk_int,
            row_index=row_index)
# - check if parent exists (order is parent of scheme)
        parent = m.Order.objects.get_or_none(id=ppk_int, customer__company=request.user.company)
        if parent:
# +++ delete instance
            if is_delete:
                instance = m.Scheme.objects.get_or_none(id=pk_int, order=parent)
                if instance:
                    # shift, team and schemeitem have on_delete=CASCADE set.
                    # Therefore they don't have to be deleted separately
                    this_text = _("Scheme '%(suffix)s'") % {'suffix': instance.code}
                    # update_dict is no longer used in delete_instance, msg_dict is not in use yet PR2020-10-14
                    msg_dict = {}
                    deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                    if deleted_ok:
                        # instance will stay after delete, therefore must set instance = None
                        update_dict['id']['deleted'] = True
            else:
# +++ create new scheme
                if is_create:
                    instance = create_scheme(parent, upload_dict, update_dict, request)
# - get existing scheme
                else:
                    instance = m.Scheme.objects.get_or_none(id=pk_int, order=parent)
# +++ update scheme, also when it is created
                if instance:
                    update_scheme(instance, upload_dict, update_dict, request)
# - put updated saved values in update_dict, skip when deleted_ok, needed when delete fails
            if instance:
                d.create_scheme_dict(instance, update_dict, user_lang)
# - remove empty attributes from update_dict
            f.remove_empty_attr_from_dict(update_dict)
# - add update_dict to update_wrap
            if update_dict:
                update_wrap['scheme_update'] = update_dict
# - update scheme_list when changes are made
                # alle schemes are loaded when scheme page loaded, including template and inactive
                scheme_list = d.create_scheme_list(
                    filter_dict={'customer_pk': parent.customer_id},
                    company=request.user.company,
                    comp_timezone=comp_timezone,
                    user_lang=user_lang)
                if scheme_list:
                    update_wrap['scheme_list'] = scheme_list
# - update schemeitem_list when changes are made
                # filters by customer, therefore no need for istemplate or inactve filter
                schemeitem_list = d.create_schemeitem_list(filter_dict={'customer_pk': parent.customer_id}, company=request.user.company)
                if schemeitem_list:
                    update_wrap['schemeitem_list'] = schemeitem_list
    return update_wrap


def shift_upload(request, upload_dict, user_lang):  # PR2019-08-08 PR2020-03-16
    #logger.debug('-------------- shift_upload-------------- ')
    #logger.debug('upload_dict' + str(upload_dict))

# 1. get iddict variables
    #id_dict = upload_dict.get('id')
    #pk_int, ppk_int, temp_pk_str, is_create, is_delete, is_absence, table, mode, row_index = f.get_iddict_variables(id_dict)
    table = f.get_dict_value(upload_dict, ('id', 'table'))
    pk_int = f.get_dict_value(upload_dict, ('id', 'pk'))
    ppk_int = f.get_dict_value(upload_dict, ('id', 'ppk'))
    temp_pk_str = f.get_dict_value(upload_dict, ('id', 'temp_pk_str'))
    row_index = f.get_dict_value(upload_dict, ('id', 'row_index'))
    is_create = f.get_dict_value(upload_dict, ('id', 'create'))
    is_delete = f.get_dict_value(upload_dict, ('id', 'delete'))

# 2. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    update_dict = f.create_update_dict(
        c.FIELDS_SHIFT,
        table=table,
        pk=pk_int,
        ppk=ppk_int,
        row_index=row_index)
# FIELDS_SHIFT = ('id', 'scheme', 'code', 'cat', 'isrestshift', 'istemplate', 'billable',
    #                 'offsetstart', 'offsetend', 'breakduration', 'timeduration',
    #                 'wagefactorcode', 'pricecode', 'additioncode', 'taxcode')

    update_dict = {}  # this one is not working: update_dict = dict.fromkeys(field_list, {})
    for field in c.FIELDS_SHIFT:
        update_dict[field] = {}
    update_dict['id']['table'] = table
    if temp_pk_str:
        update_dict['id']['temp_pk'] = temp_pk_str
    if row_index:
        update_dict['id']['row_index'] = row_index

# 3. check if parent exists (customer is parent of order)
    parent = m.Scheme.objects.get_or_none( id=ppk_int, order__customer__company=request.user.company)
    #logger.debug('parent' + str(parent))
    if parent:
        update_dict['id']['ppk'] = parent.pk
# B. Delete instance
        if is_delete:
            instance = m.Shift.objects.get_or_none(id=pk_int, scheme=parent)
            #logger.debug('instance' + str(instance))
            if instance.code:
                this_text = _("Shift '%(suffix)s'") % {'suffix': instance.code}
            else:
                this_text = _('This shift')
            # add pk here, because instance will be deleted
            update_dict['id']['pk'] = instance.pk
            # delete_instance
            # msg_dict is not in use yet PR2020-10-14
            msg_dict = {}
            deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
            #logger.debug('deleted_ok' + str(deleted_ok))
            if deleted_ok:
                instance = None
                update_dict['id']['deleted'] = True
# C. Create new shift
        elif is_create:
           #logger.debug('is_create' + str(is_create))
            # create_shift adds 'temp_pk', 'created' to id_dict, and 'error' to code_dict
            instance = create_shift_instance(parent, upload_dict, update_dict, request)
# D. Get existing shift
        else:
            instance = m.Shift.objects.get_or_none(id=pk_int, scheme=parent)
# E. update shift, also when it is created
        #logger.debug('instance' + str(instance))
        if instance:
            update_dict['id']['pk'] = instance.pk
            update_shift_instance(instance, parent, upload_dict, update_dict, user_lang, request)

# 8. put updated saved values in update_dict, skip dict when deleted_ok, dict is needed when delete fails
            d.create_shift_dict(instance, update_dict, user_lang)

            #logger.debug('.......update_dict' + str(update_dict))
# 9. remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(update_dict)

    #logger.debug('------- update_dict' + str(update_dict))
# 10. return update_dict
    return update_dict


def team_upload(request, upload_dict, comp_timezone, user_lang):  # PR2019-05-31
    #logger.debug(' --- team_upload --- ')
    #logger.debug(upload_dict)

    update_wrap = {}
    deleted_or_created_ok = False

# 1. get iddict variables  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
    id_dict = upload_dict.get('id')

    table = 'team'
    pk_int, ppk_int = None, None
    is_create, is_delete, is_absence, is_template = False, False, False, False

    if id_dict:
        table = id_dict.get('table', '')
        pk_int = id_dict.get('pk')
        ppk_int = id_dict.get('ppk')
        is_create = ('create' in id_dict)
        is_delete = ('delete' in id_dict)

# 2. create new update_dict with all fields and id_dict. Unused ones will be removed at the end
    update_dict = f.create_update_dict(
        c.FIELDS_TEAM,
        table=table,
        pk=pk_int,
        ppk=ppk_int)

# 3. check if parent exists (scheme is parent of team)
    parent = m.Scheme.objects.get_or_none(
        id=ppk_int,
        order__customer__company=request.user.company)
    if parent:
        #logger.debug('parent' + str(parent))

# 4. Delete instance
        if is_delete:
            instance = m.Team.objects.get_or_none(id=pk_int, scheme=parent)
            #logger.debug('instance' + str(instance))
            if instance:
                this_text = _("Team %(suffix)s") % {'suffix': instance.code}
                # delete_instance
                # msg_dict is not in use yet PR2020-10-14
                msg_dict = {}
                update_dict['id']['pk'] = instance.pk
                deleted_or_created_ok = m.delete_instance(instance, msg_dict, request, this_text)
                #logger.debug('deleted_or_created_ok' + str(deleted_or_created_ok))
                if deleted_or_created_ok:
                    instance = None
                    update_dict['id']['deleted'] = True
                #logger.debug('update_dict' + str(update_dict))

# 5. Create new team
        elif is_create:
            # create_team adds 'temp_pk', 'created' to id_dict, and 'error' to code_dict
            instance = create_team(upload_dict, update_dict, user_lang, request)
            if instance:
                deleted_or_created_ok = True

# 6. Get existing team
        else:
             instance = m.Team.objects.get_or_none(id=pk_int, scheme=parent)

# 7. update team, also when it is created
       #logger.debug('instance' + str(instance))
        if instance:
            update_team(instance, parent, upload_dict, update_dict, request)

# 8. put updated saved values in update_dict, skip dict when deleted_ok, dict is needed when delete fails
            d.create_team_dict(instance, update_dict)

# 9. remove empty attributes from update_dict
    f.remove_empty_attr_from_dict(update_dict)
    #logger.debug('remove_empty_attr_from_dict update_dict: ' + str(update_dict))

# 2. add update_dict to update_wrap
    if update_dict:
        # update_wrap['team_update'] = update_dict
        update_wrap['team_update_list'] = [update_dict]

# 3. update teammember_list when team is created or deleted
    if deleted_or_created_ok:
        order_pk = None
        if parent.order:
            order_pk = parent.order.pk
        table_dict = {'order_pk': order_pk}
        teammember_list = ed.create_teammember_list(table_dict, request.user.company, user_lang)
        if teammember_list:
            update_wrap['teammember_list'] = teammember_list

        #logger.debug('teammember_list: ' + str(teammember_list))
# 4 return update_wrap
    #logger.debug('update_wrap' + str(update_wrap))
    return update_wrap


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_team(upload_dict, update_dict, user_lang, request):
    #logger.debug(' --- create_team --- ')
    # --- create team # PR2019-10-01
    # Note: all keys in update_dict must exist by running create_update_dict first
    team = None

# 1. get iddict variables
    id_dict = upload_dict.get('id')
    if id_dict:
        table = 'team'
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')

    # b. save temp_pk_str in in 'id' of update_dict'
        if temp_pk_str:  # attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            update_dict['id']['temp_pk'] = temp_pk_str

# 2. get parent team
        #parent = m.get_parent(table, ppk_int, update_dict, request)
        parent = m.Scheme.objects.get_or_none(id=ppk_int, order__customer__company=request.user.company)
        if parent:

# 4. create team name
            team_code = f.get_code_with_sequence('team', parent, user_lang)
            #logger.debug('team_code: ' + str(team_code))

    # 4. create and save team
            team = m.Team(
                scheme=parent,
                code=team_code)
            team.save(request=request)
            team_pk = team.pk
            #logger.debug(' --- new  team_pk: ' + str(team_pk))

    # 6. put info in update_dict
            update_dict['id']['created'] = True
            update_dict['id']['pk'] = team.pk
            update_dict['pk'] = team.pk

 # ===== Create new teammember without employee
            # don't add empty teammember, is confusing PR2019-12-07
            # change of plan: do add empty teammember PR2020-01-15
            teammember = m.Teammember(team_id=team_pk )
            teammember.save(request=request)

    return team
######################

def update_team(instance, parent, upload_dict, update_dict, request):
    # --- update existing and new team PR2019-10-18
    #  add new values to update_dict (don't reset update_dict, it has values)
    #  also refresh timestart timeend in schemeitems
    #logger.debug(' ----- update_team ----- ')
    #logger.debug('upload_dict: ' + str(upload_dict))

#  get comp_timezone
    comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

    has_error = False
    if instance:
        # FIELDS_TEAM = ('id', 'scheme', 'cat', 'code'),

        table = 'team'
        save_changes = False
        for field in c.FIELDS_TEAM:
            # --- get field_dict from  item_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
                    # a. get new_value
                    new_value = field_dict.get('value')

# 2. save changes in field 'code'
                    if field in ['code']:
            # a. get old value
                        saved_value = getattr(instance, field)
                        # field 'code' is required
                        if new_value != saved_value:
            # b. validate code
                            msg_err = validate_code_name_identifier(
                                table=table,
                                field=field,
                                new_value=new_value,
                                is_absence=False,
                                parent=parent,
                                update_dict=update_dict,
                                msg_dict={},
                                request=request,
                                this_pk=instance.pk)
                            if not msg_err:
             # c. save field if changed and no_error
                                setattr(instance, field, new_value)
                                is_updated = True
# 3. save changes in fields 'cat'
                    elif field in ['cat']:
                        if not new_value:
                            new_value = 0
                        saved_value = getattr(instance, field, 0)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

    # 5. add 'updated' to field_dict'
                    if is_updated:
                        update_dict[field]['updated'] = True
                        save_changes = True
                        #logger.debug('update_dict: ' + str(update_dict))

 # 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
            except:
                has_error = True
                msg_err = _('This team could not be updated.')
                update_dict['id']['error'] = msg_err

# 6. put updated saved values in update_dict
        d.create_team_dict(instance, update_dict)
    return has_error

############################
@method_decorator([login_required], name='dispatch')
class SchemeitemDownloadView(View):  # PR2019-03-10
    # function downloads scheme, teams and schemeitems of selected scheme
    def post(self, request, *args, **kwargs):
        #logger.debug(' ====++++++++==== SchemeItemDownloadView ============= ')
        #logger.debug('request.POST' + str(request.POST) )
        # {'scheme_download': ['{"scheme_pk":18}']}

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
# - Reset language
                # PR2019-03-15 Debug: language gets lost, get request.user.lang again
                user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                activate(user_lang)

# - get comp_timezone PR2019-06-14
                comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

                if request.POST['scheme_download']:
                    scheme_download = json.loads(request.POST['scheme_download'])
                    #logger.debug('scheme_download: ' + str(scheme_download) + str(type(scheme_download)))
                    # scheme_download: {'scheme_pk': 18}
                    scheme_pk = int(scheme_download.get('scheme_pk', '0'))
                    scheme = m.Scheme.objects.filter(order__customer__company=request.user.company,
                                                    pk=scheme_pk,
                                                    ).first()
                    if scheme:
                        scheme_dict = {}
                        d.create_scheme_dict(scheme, scheme_dict, user_lang)

                        datalists = {'scheme': scheme_dict}
                        #logger.debug('datalists: ' + str(datalists))

                        # create shift_list
                        shift_list, shift_rows = d.create_shift_list(
                            filter_dict={'customer_pk': scheme.order.customer_id},
                            company=request.user.company,
                            user_lang=user_lang)
                        if shift_list:
                            datalists['shift_list'] = shift_list
                        if shift_rows:
                            datalists['shift_rows'] = shift_rows

                        # create team_list
                        team_list = d.create_team_list(
                            filter_dict={'customer_pk': scheme.order.customer_id},
                            company=request.user.company)
                        if team_list:
                            datalists['team_list'] = team_list

                        # create schemeitem_list
                        schemeitem_list = d.create_schemeitem_list(filter_dict={'customer_pk': scheme.order.customer_id}, company=request.user.company)
                        if schemeitem_list:
                            datalists['schemeitem_list'] = schemeitem_list
                            # shift_list.sort()
                            datalists['shift_list'] = shift_list

                        # today is used for new schemeitem without previous rosterday
                        today_dict = {'value': str(date.today()),
                                      'wdm': f.get_date_WDM_from_dte(date.today(), user_lang),
                                      'wdmy': f.format_WDMY_from_dte(date.today(), user_lang),
                                      'dmy': f.format_DMY_from_dte(date.today(), user_lang),
                                      'offset': f.get_weekdaylist_for_DHM(date.today(), user_lang)}

                        datalists['today'] = today_dict

                        datalists['months'] = c.MONTHS_ABBREV[user_lang]
                        datalists['weekdays'] = c.WEEKDAYS_ABBREV[user_lang]

        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        #logger.debug('datalists_json:')
        #logger.debug(str(datalists_json))

        # {"scheme": {"pk": 18, "code": "MCB scheme", "cycle": 7, "weekend": 1, "publicholiday": 1, "inactive": false},
        #  "team_list": [{"pk": 1, "code": "Team A"}],
        #  "schemeitem_list": [{"pk": 4, "rosterdate": "2019-04-27", "shift": ""},
        #                      {"pk": 5, "rosterdate": "2019-04-27", "shift": ""},

        return HttpResponse(datalists_json)


@method_decorator([login_required], name='dispatch')
class SchemeitemFillView(UpdateView):  # PR2019-06-05

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= SchemeitemFillView ============= ')

        item_update_dict = {}

        if request.user is not None and request.user.company is not None and request.user.is_perm_planner:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
            # upload_dict: {'scheme_pk': 19}
                upload_dict = json.loads(upload_json)
                scheme_pk = upload_dict.get('scheme_pk')
                mode = upload_dict.get('mode')

                #logger.debug('scheme_pk: ' + str(scheme_pk))
                #logger.debug('mode: ' + str(mode))

            # get scheme
                scheme = None
                cycle = 0
                scheme_datefirst = None
                scheme_datelast = None

                schemeitem_list = []
                has_new_schemeitem = False

                if scheme_pk:
                    scheme = m.Scheme.objects.filter(id=scheme_pk, order__customer__company=request.user.company).first()
                #logger.debug('scheme: ' + str(scheme))

                if scheme:
                # get info from scheme
                    cycle_days = scheme.cycle
                    if scheme.datefirst:
                        scheme_datefirst = scheme.datefirst
                    if scheme.datelast:
                        scheme_datelast = scheme.datelast

                    #logger.debug('cycle_days: ' + str(cycle_days))
# --- Autofill
                    if mode == 'autofill':
                        if cycle_days > 1:
            # create schemeitem_list of all schemes of this order, except this scheme  PR2019-05-12
                            #schemeitems = Schemeitem.objects.filter(scheme__order=scheme.order).exclude(scheme=scheme)
                            #for schemeitem in schemeitems:
                            #    schemeitem_dict = {}
                            #    d.create_schemeitem_dict(schemeitem, schemeitem_dict)
                            #    schemeitem_list.append(schemeitem_dict)
                            #logger.debug('other schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                            #logger.debug('other id_dict: ' + str(schemeitem_dict.get('id')))

            # get first_rosterdate and last_rosterdate from schemeitems of this scheme
                            schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                            first_rosterdate = None
                            last_rosterdate = None
                            enddate_plusone = None
                            date_add = 0

                            for schemeitem in schemeitems:

            # append existing schemeitems to schemeitem_list
                                # schemeitem, user_lang, is_created=False, is_deleted=False, updated_list=None):
                                schemeitem_dict = {}
                                d.create_schemeitem_dict(schemeitem, schemeitem_dict)
                                schemeitem_list.append(schemeitem_dict)
                                #logger.debug('existing schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                                #logger.debug('existing id_dict: ' + str(schemeitem_dict.get('id')))

            # get number of days between first_rosterdate and last_rosterdate_plusone
                                if first_rosterdate is None or schemeitem.rosterdate < first_rosterdate:
                                    first_rosterdate = schemeitem.rosterdate
                                if last_rosterdate is None or schemeitem.rosterdate > last_rosterdate:
                                    last_rosterdate = schemeitem.rosterdate
                                date_add = f.get_date_diff_plusone(first_rosterdate, last_rosterdate)
                                enddate_plusone = first_rosterdate + timedelta(days=cycle_days)
                                #logger.debug('rosterdate: ' + str(schemeitem.rosterdate) + ' first: ' + str(first_rosterdate) +' last: ' + str(last_rosterdate))
                                #logger.debug('date_add: ' + str(date_add))

                            if date_add > 0:
                                for n in range(cycle_days):  # range(6) is the values 0 to 5.
                                    for schemeitem in schemeitems:
                                        days = (date_add * (n + 1))
                                        #logger.debug('days: ' + str(days))
                                        new_rosterdate = schemeitem.rosterdate + timedelta(days=days)
                                        #logger.debug('new_rosterdate: ' + str(new_rosterdate))

                        # check if new_rosterdate falls within range of scheme
                                        in_range = f.date_within_range(scheme_datefirst, scheme_datelast, new_rosterdate)
                                        if in_range:
                                            if new_rosterdate < enddate_plusone:
                                                new_schemeitem = m.Schemeitem(
                                                    scheme=schemeitem.scheme,
                                                    shift=schemeitem.shift,
                                                    team=schemeitem.team,
                                                    rosterdate=new_rosterdate,
                                                    onpublicholiday=schemeitem.onpublicholiday,
                                                    issingleshift=schemeitem.issingleshift,
                                                    istemplate=schemeitem.istemplate
                                                    # dont copy: cat=schemeitem.cat,
                                                    # dont copy: isabsence=schemeitem.isabsence,
                                                )

                         # calculate 'timestart, 'timeend', timeduration
                                                #calc_schemeitem_timeduration(new_schemeitem, {}, comp_timezone)

                                                new_schemeitem.save(request=self.request)
                                                #logger.debug('new schemeitem: ' + str(new_schemeitem.pk) + ' ' + str(new_schemeitem.rosterdate))
                                                has_new_schemeitem = True

                    # append new schemeitem to schemeitem_list, with attr 'created'
                                                #schemeitem_dict = {}
                                                #d.create_schemeitem_dict(schemeitem, schemeitem_dict)
                                                #schemeitem_list.append(schemeitem_dict)

# --- Dayup Daydown
                    elif mode in ['dayup', 'daydown']:
                        date_add = -1 if mode == 'dayup' else 1
                        #logger.debug('date_add: ' + str(date_add) + ' ' + str(type(date_add)))
                        schemeitems = m.Schemeitem.objects.filter(scheme=scheme)

                        field_list = c.FIELDS_SCHEMEITEM
                        # FIELDS_SCHEMEITEM = ('pk', 'id', 'scheme', 'shift', 'team',
                        #                      'rosterdate', 'onpublicholiday', 'timestart', 'timeend',
                        #                      'timeduration', 'inactive')
                        for schemeitem in schemeitems:

                # a. change rosterdate, update
                            new_rosterdate = schemeitem.rosterdate + timedelta(days=date_add)
                            new_rosterdate_iso = new_rosterdate.isoformat()
                            #logger.debug('new_rosterdate_iso: ' + str(new_rosterdate_iso) + ' ' + str(type(new_rosterdate_iso)))

                # b. create upload_dict, is used to update fields in  update_schemeitem
                            id_dict = {'pk': schemeitem.id, 'ppk': schemeitem.scheme.id, 'table': 'schemeitem'}
                            upload_dict = {}
                            upload_dict['id'] = id_dict
                            upload_dict['rosterdate'] = {'value': new_rosterdate_iso, 'update': True}

                # c. create empty item_update with keys for all fields. Unused ones will be removed at the end
                            item_update = f.create_update_dict(
                                c.FIELDS_SCHEMEITEM,
                                table='schemeitem',
                                pk=schemeitem.id,
                                ppk=schemeitem.scheme.id,
                                row_index=None)

                # d. update and save schemeitem
                            update_schemeitem_instance(schemeitem, upload_dict, item_update, request)

# --- Previous Next cycle
                    elif mode in ['prev', 'next']:
                        # get first_rosterdate and last_rosterdate from schemeitems of this scheme
                        date_add = -cycle_days if mode == 'prev' else cycle_days

                        first_rosterdate = None
                        last_rosterdate = None
                        schemeitems = m.Schemeitem.objects.filter(
                            scheme=scheme,
                            scheme__order__customer__company=request.user.company
                            ).order_by('rosterdate')

                        for schemeitem in schemeitems:
                            new_rosterdate_dte = schemeitem.rosterdate + timedelta(days=date_add)
                            update_schemeitem_rosterdate(schemeitem, new_rosterdate_dte, comp_timezone)
                            if first_rosterdate is None or schemeitem.rosterdate < first_rosterdate:
                                first_rosterdate = schemeitem.rosterdate
                            if last_rosterdate is None or schemeitem.rosterdate > last_rosterdate:
                                last_rosterdate = schemeitem.rosterdate

                        cyclestartdate = first_rosterdate

                        ddiff_timedelta = last_rosterdate - first_rosterdate
                        ddiff_int = 1 + ddiff_timedelta.days
                        #logger.debug('first_rosterdate: ' + str(first_rosterdate) + ' ' + str(type(first_rosterdate)))
                        #logger.debug('last_rosterdate: ' + str(last_rosterdate) + ' ' + str(type(last_rosterdate)))
                        #logger.debug('ddiff: ' + str(ddiff_int) + ' ' + str(type(ddiff_int)))
                        # ddiff: 0:00:00 <class 'datetime.timedelta'>
                        # first_rosterdate: 2019-12-26 <class 'datetime.date'>

                        # put dates outside range in range, starting at cyclestartdate
                        for schemeitem in schemeitems:
                            update_schemeitem_rosterdate(schemeitem, cyclestartdate, comp_timezone)

                    elif mode == 'delete':
                        schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                        for schemeitem in schemeitems:
                            schemeitem.delete()

                # e. create schemeitem_list
                schemeitem_list = d.create_schemeitem_list( filter_dict={'customer_pk': scheme.order.customer_id}, company=request.user.company)

                if has_new_schemeitem:
                    item_update_dict['update_dict'] = {'created': True}
                if schemeitem_list:
                    item_update_dict['schemeitem_list'] = schemeitem_list

        return HttpResponse(json.dumps(item_update_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class SchemeItemUploadView(UpdateView):  # PR2019-07-22

    def post(self, request, *args, **kwargs):
       #logger.debug('============= SchemeItemUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_planner:

# 1. get upload_list from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:

# 2. loop through upload_list
                # upload_json can be dict or list of dicts PR2020-04-28
                upload_list_or_dict = json.loads(upload_json)
                if isinstance(upload_list_or_dict, dict) :
                    upload_list = [upload_list_or_dict]
                else:
                    upload_list = upload_list_or_dict

                update_list = []
                for upload_dict in upload_list:
                   #logger.debug('upload_dict: ' + str(upload_dict))

# 3. get iddict variables
                    table = f.get_dict_value(upload_dict, ('id', 'table'))
                    pk_int = f.get_dict_value(upload_dict, ('id', 'pk'))
                    ppk_int = f.get_dict_value(upload_dict, ('id', 'ppk'))
                    temp_pk = f.get_dict_value(upload_dict, ('id', 'temp_pk'))
                    cell_id_str = f.get_dict_value(upload_dict, ('id', 'cell_id'))
                    is_create = f.get_dict_value(upload_dict, ('id', 'create'))
                    is_delete = f.get_dict_value(upload_dict, ('id', 'delete'))
                    mode = f.get_dict_value(upload_dict, ('id', 'mode'))

# 4. Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    update_dict = {}  # this one is not working: update_dict = dict.fromkeys(field_list, {})
                    for field in c.FIELDS_SCHEMEITEM:
                        update_dict[field] = {}
                    update_dict['id']['table'] = table
                    if cell_id_str:
                        update_dict['id']['cell_id'] = cell_id_str
                    if temp_pk:
                        update_dict['id']['temp_pk'] = temp_pk
# 5. check if parent exists (scheme is parent of schemeitem)
                    parent = m.Scheme.objects.get_or_none(id=ppk_int, order__customer__company=request.user.company)
                   #logger.debug('parent: ' + str(parent))
                    if parent:
                        update_dict['id']['ppk'] = parent.pk
# B. Delete instance
                        if is_delete:
                            this_text = _("This shift")
                            instance = m.Schemeitem.objects.get_or_none(id=pk_int, scheme=parent)
                            # PR20202-06-21 debug: you can delete same row twice, because of asynchronic update
                            # gives error: 'NoneType' object has no attribute 'pk'
                            # solved by adding if instance:
                            if instance:
                                # add pk here, because instance will be deleted
                                update_dict['id']['pk'] = instance.pk
                                # delete_instance
                                # msg_dict is not in use yet PR2020-10-14
                                msg_dict = {}
                                deleted_ok = m.delete_instance(instance, msg_dict, request, this_text)
                                if deleted_ok:
                                    instance = None
                                    update_dict['id']['deleted'] = True
# C. Create new schemeitem
                        elif is_create:
                            # create_schemeitem adds 'created' or 'error' to id_dict
                            instance = create_schemeitem_instance(parent, upload_dict, update_dict, request)
# D. Get existing instance
                        else:
                            instance = m.Schemeitem.objects.get_or_none(id=pk_int, scheme=parent)
# E. Update instance, also when it is created
                        if instance:
                            update_dict['id']['pk'] = instance.pk
                            update_schemeitem_instance(instance, upload_dict, update_dict, request)
# F. Add all saved values to update_dict, add id_dict to update_dict
                        d.create_schemeitem_dict(instance, update_dict)
    # 6. remove empty attributes from update_dict
                        f.remove_empty_attr_from_dict(update_dict)
    # 7. add update_dict to update_wrap
                        if update_dict:
                            if mode == 'grid':
                                update_list.append(update_dict)
                            else:
                                update_wrap['schemeitem_update'] = update_dict
                if update_list:
                    update_wrap['si_update_list'] = update_list
    # 8. update schemeitem_list when changes are made
                    #item_list = d.create_schemeitem_list( filter_dict={'customer_pk': parent.order.customer_id}, company=request.user.company)
                    #if item_list:
                     #   update_wrap['schemeitem_list'] = item_list

        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))
####################################
# === ReviewView ===================================== PR2019-08-20
@method_decorator([login_required], name='dispatch')
class ReviewView(View):

    def get(self, request):
        param = {}
        #logger.debug(' ============= ReviewView ============= ')
        if request.user is not None and request.user.company is not None and request.user.is_perm_accman:
    # get user_lang
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

     # get weekdays translated
            lang = user_lang if user_lang in c.WEEKDAYS_ABBREV else c.LANG_DEFAULT
            weekdays_json = json.dumps(c.WEEKDAYS_ABBREV[lang])

    # get months translated
            lang = user_lang if user_lang in c.MONTHS_ABBREV else c.LANG_DEFAULT
            months_json = json.dumps(c.MONTHS_ABBREV[lang])

    # get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

    # get timeformat
            timeformat = 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in c.TIMEFORMATS:
                timeformat = '24h'

            param = get_headerbar_param(request, {
                'lang': lang,
                'weekdays': weekdays_json,
                'months': months_json,

                'interval': interval,
                'timeformat': timeformat
            })
            #logger.debug(param)
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'review.html', param)


@method_decorator([login_required], name='dispatch')
class EmplhourDownloadDatalistView(View):  # PR2019-03-10
    # function updates employee, customer and shift list
    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= EmplhourDownloadDatalistView ============= ')
        #logger.debug('request.POST' + str(request.POST) )

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                # request.POST:
                # download = {"rosterdatefirst": rosterdatefirst, 'rosterdatelast': rosterdatelast}

                rosterdate_first = None
                rosterdate_last = None
                # filter roster dat in Javascript
                # employees in range of rosterdate_first rosterdate_last
                #                rosterdate_first-----------------------rosterdate_last
                #   datefirst-------------------------datelast
                #
                #  datelast >= rosterdate_first | rosterdate_first = None | datelast = None
                #  &
                #  datefirst <= rosterdate_last | rosterdate_last = None | datefirst = None
                #  &
                #  company = request.user.company &  inactive=False

                #filters =  Q(company=request.user.company) & Q(inactive=False)
                #if rosterdate_first:
                #    filters = filters & (Q(datelast__gte=rosterdate_first) | Q(datelast=None))
                #if rosterdate_last:
                #    filters = filters & (Q(datefirst__lte=rosterdate_last) | Q(datefirst=None))


                orders = m.Order.objects.filter(customer__company=request.user.company, inactive=False).order_by(Lower('code'))
                order_list = []
                for order in orders:
                    dict = {'pk': order.id, 'code': order.code}
                    if order.datefirst:
                        dict['datefirst'] = order.datefirst
                    if order.datelast:
                        dict['datelast'] = order.datelast
                    order_list.append(dict)

                employees = m.Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
                employee_list = []
                for employee in employees:
                    dict = {'pk': employee.id, 'code': employee.code}
                    if employee.datefirst:
                        dict['datefirst'] = employee.datefirst
                    if employee.datelast:
                        dict['datelast'] = employee.datelast
                    employee_list.append(dict)

                datalists = {'order': order_list, 'employee': employee_list}


        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        #logger.debug('datalists_json:')
        #logger.debug(str(datalists_json))

        return HttpResponse(datalists_json)


def upload_period(interval_upload, request):  # PR2019-07-10
    #logger.debug(' ============= upload_interval ============= ')
    #logger.debug('interval_upload: ' + str(interval_upload))
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}

    item_update_dict = {}
    if request.user is not None and request.user.company is not None:
        if interval_upload:

# get saved period_dict
            period_dict = d.get_period_from_settings(request)
            save_setting = False

# update period_dict with settings from upload_period_dict
            upload_period_dict = interval_upload
            if 'periodstart' in upload_period_dict:
                period_dict['periodstart'] = upload_period_dict['periodstart']
                save_setting = True
            if 'periodend' in upload_period_dict:
                period_dict['periodend'] = upload_period_dict['periodend']
                save_setting = True
            if 'range' in upload_period_dict:
                period_dict['range'] = upload_period_dict['range']
                save_setting = True
            if 'interval' in upload_period_dict:
                period_dict['interval'] = int(upload_period_dict['interval'])
                save_setting = True
            if 'overlap' in upload_period_dict:
                period_dict['overlap'] = int(upload_period_dict['overlap'])
                save_setting = True
            if 'auto' in upload_period_dict:
                period_dict['auto'] = bool(upload_period_dict['auto'])
                save_setting = True

# get values from saved / updated period_dict
            interval = int(period_dict['interval'])
            overlap = int(period_dict['overlap'])
            range = int(period_dict['range'])
# range must be at least overlap + interval
            if range < overlap + interval:
                range = overlap + interval
                save_setting = True

# save updated period_dict
            if save_setting:
                period_dict_json = json.dumps(period_dict)  # dumps takes an object and produces a string:
                #logger.debug('period_dict_json: ' + str(period_dict_json))

                Usersetting.set_jsonsetting(c.KEY_USER_PERIOD_EMPLHOUR, period_dict_json, request.user)

# calculate  updated period_dict
            # get today_midnight_local_iso
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            today_utc = d.get_rosterdate_utc(date.today())
            today_utc = d.get_datetime_utc(datetime.utcnow())
            #logger.debug('CCCCCCC today_utc: ' + str(today_utc) + str(type(today_utc)))
            today_midnight_local = d.get_rosterdate_midnight_local(today_utc, comp_timezone)
            #logger.debug('today_midnight_local: ' + str(today_midnight_local) + str(type(today_midnight_local)))
            # today_midnight_local_iso = today_midnight_local.isoformat()
            #logger.debug('today_midnight_local_iso: ' + str(today_midnight_local_iso) + str( type(today_midnight_local_iso)))

# get now in utc
            now_dt = datetime.utcnow()
            #logger.debug('now_dt: ' + str(now_dt) + ' type: ' + str(type(now_dt)))
            # now_dt: 2019-07-10 14:48:15.742546 type: <class 'datetime.datetime'>
            now_utc = now_dt.replace(tzinfo=pytz.utc)  # NOTE: it works only with a fixed utc offset
            #logger.debug('now_utc: ' + str(now_utc) + ' type: ' + str(type(now_utc)))
            # now_utc: 2019-07-10 14:48:15.742546+00:00 type: <class 'datetime.datetime'>

# convert now to local
            # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
            # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
            timezone = pytz.timezone(comp_timezone)
            now_local = now_utc.astimezone(timezone)
            #logger.debug('now_local: ' + str(now_local) + str(type(now_local)))
            # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

# split now_local
            year_int, month_int, date_int, hour_int, minute_int = d.split_datetime(now_local)
            #logger.debug(
            #     'now_local_arr: ' + str(year_int) + ';' + str(month_int) + ';' + str(date_int) + ';' + str(
            #        hour_int) + ';' + str(minute_int))
            # now_local_arr: 2019;7;10;16

# get index of current interval (with interval = 6 hours, interval 6-12h has index 1
            interval_index = int(hour_int / interval)
            #logger.debug('xxx interval: ' + str(interval) + ' interval_index: ' + str(interval_index))

# get local start time of current interval
            interval_starthour = interval * interval_index
            interval_start_local = today_midnight_local + timedelta(hours=interval_starthour)
            #logger.debug('interval_start_local: ' + str(interval_start_local) + str(type(interval_start_local)))

# get local start time of current range (is interval_start_local minus overlap)
            range_start = -overlap
            range_start_local = interval_start_local + timedelta(hours=range_start)
            #logger.debug('range_start: ' + str(range_start) + ' range_start_local: ' + str(range_start_local))

# get start time of current range in UTC
            utc = pytz.UTC
            range_start_utc = range_start_local.astimezone(utc)
            #logger.debug('range_start_utc: ' + str(range_start_utc))

# get utc end time of current range ( = local start time of current range plus range
            range_end_utc = range_start_utc + timedelta(hours=range)
            #logger.debug('range: ' + str(range) + ' utc >>>>>> range_end_utc: ' + str(range_end_utc))

# get local end time of current range ( = local start time of current range plus range
            range_end_local = range_start_local + timedelta(hours=range)
            #logger.debug('range: ' + str(range) + ' range_end_local: ' + str(range_end_local))

# get end time of current range in UTC
            overlap_end_utc = range_end_local.astimezone(utc)
            #logger.debug('overlap_end_utc: ' + str(overlap_end_utc))

@method_decorator([login_required], name='dispatch')
class EmplhourDownloadView(UpdateView):  # PR2020-05-07

    def post(self, request, *args, **kwargs):
        #logger.debug(' ')
        #logger.debug(' ============= EmplhourDownloadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:

            # 3. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict: ' + str(upload_dict))
                if 'shiftdict' in upload_dict:
                    shift_dict = upload_dict.get('shiftdict')
                    #logger.debug('shift_dict: ' + str(shift_dict))
                    rosterdate_iso = shift_dict.get('rosterdate')
                    emplhour_pk = f.get_dict_value(shift_dict, ('emplhour_pk',), 0)
                    rosterdate_dte, msg_txt = f.get_date_from_ISOstring(rosterdate_iso)
                    #logger.debug('rosterdate_dte: ' + str(rosterdate_dte))
                    #logger.debug('emplhour_pk: ' + str(emplhour_pk))
                    if rosterdate_dte:
                        sql_emplhour = """ SELECT o.id, 
                            CONCAT(c.code,' - ',o.code), 
                            COALESCE(oh.shiftcode, '---'), 
                            eh.id, e.id, 
                            COALESCE(e.code, '---') 
                            
                            FROM companies_emplhour AS eh 
                            LEFT JOIN companies_employee AS e ON (eh.employee_id = e.id)
                            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id) 
                            LEFT JOIN companies_schemeitem AS si ON (si.id = oh.schemeitem_id) 
                            INNER JOIN companies_shift AS sh ON (sh.id = si.shift_id) 
                            INNER JOIN companies_order AS o ON (o.id = oh.order_id) 
                            INNER JOIN companies_customer AS c ON (c.id = o.customer_id)   
                            WHERE c.company_id = %(compid)s
                            AND eh.rosterdate = CAST(%(rd)s AS DATE)
                            AND NOT eh.id = %(ehid)s
                            AND NOT oh.isabsence AND NOT oh.isrestshift
                            AND eh.status < 2
                            """
                        newcursor = connection.cursor()
                        newcursor.execute(sql_emplhour, {
                            'compid': request.user.company_id,
                            'ehid': emplhour_pk,
                            'rd': rosterdate_dte
                        })
                        rows = newcursor.fetchall()
                        eplh_dict = {}
                        for row in rows:
                            #logger.debug ('row: ' + str(row))
                            if row[0] not in eplh_dict:
                                eplh_dict[row[0]] = {'cust_ordr_code': row[1]}
                            ordr_dict = eplh_dict[row[0]]
                            if ordr_dict:
                                if row[2] not in ordr_dict:
                                    ordr_dict[row[2]] = {'shft_code': row[2]}
                                shft_dict = ordr_dict[row[2]]
                                if shft_dict:
                                    shft_dict[row[3]] = {'pk': row[4], 'ppk': request.user.company_id, 'code': row[5]}

                        update_wrap['emplh_shift_dict'] = eplh_dict

        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class EmplhourUploadView(UpdateView):  # PR2019-06-23

    def post(self, request, *args, **kwargs):
        #logger.debug(' ')
        #logger.debug(' ============= EmplhourUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_supervisor:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict: ' + str(upload_dict))

                eplh_update_list = [] # list of emplhour_pk's that must be put in emplhour_rows
                check_overlap_list = [] # check_overlap_list contains employee_pk's that must be checked
                clear_overlap_list = [] # clear_overlap_list contains emplhour_pk's that must be cleared:
                error_list = []
                deleted_list = []

# - get iddict variables
                pk_int = f.get_dict_value (upload_dict, ('id', 'pk'))
                ppk_int = f.get_dict_value (upload_dict, ('id', 'ppk'))
                is_create = f.get_dict_value (upload_dict, ('id', 'create'), False)
                is_delete = f.get_dict_value (upload_dict, ('id', 'delete'), False)
                shift_option = f.get_dict_value (upload_dict, ('id', 'shiftoption'))

# - add new employee to check_overlap_list
                new_employee_pk = f.get_dict_value(upload_dict, ('employee', 'pk'))
                if new_employee_pk:
                    check_overlap_list.append(new_employee_pk)

                emplhour = None
# - Create new orderhour / emplhour if is_create:
                # update_emplhour is also called when emplhour is_created, save_to_log is called in update_emplhour
                if is_create:
                    emplhour, orderhour = create_orderhour_emplhour(upload_dict, error_list, request)
                else:
# - else: check if orderhour exists (orderhour is orderhour of emplhour)
                    orderhour = m.Orderhour.objects.get_or_none(id=ppk_int, order__customer__company=request.user.company)
                    if orderhour:
                        emplhour = m.Emplhour.objects.get_or_none(id=pk_int, orderhour=orderhour)

                if emplhour:
# - add emplhour to eplh_update_list, list of emplhour.pk's to be added to emplhour_updates
                    eplh_update_list.append(emplhour.pk)

# - add current employee to check_overlap_list
                    # add current employee_pk to check_overlap_list
                    if emplhour.employee and emplhour.employee.pk not in check_overlap_list:
                        check_overlap_list.append(emplhour.employee.pk)

# ============ Delete emplhour if is_delete
                    if is_delete:
                        # delete_emplhour first saves to log and updates date_deleted in Companysetting.datetimesetting2
                        # the deletes emplhour and - if orderhour has no more emplhours - also deletes orderhour
                        deleted_row = m.delete_emplhour_instance(emplhour, request)
                        if deleted_row:
                            deleted_list.append(deleted_row)
                    else:
                        # shift options are: enter_employee, change_absence, make_absent, split_shift, switch_shift
# ============ make employee absent
                        if shift_option == 'make_absent':
                            # make_absence_shift creates a new absence emplhour, current one will be updated in update_emplhour
                            make_absence_shift(emplhour, orderhour, upload_dict, eplh_update_list, check_overlap_list, comp_timezone, request)

                        elif shift_option == 'change_absence':
                            # change_absence_shift changes order in orderhour
                            if 'abscat' in upload_dict:
                                change_absence_shift(emplhour, upload_dict, eplh_update_list, request)

                        if shift_option == 'moveto_shift':
                            # moveto_shift removes the current employee from the current emplhour record
                            # and replaces the employee of the selected emplhour with the current employee
                            moveto_shift_dict = moveto_shift(emplhour, upload_dict, eplh_update_list, check_overlap_list, comp_timezone, timeformat, user_lang, request)
                            if moveto_shift_dict:
                                eplh_update_list.append(moveto_shift_dict)
                        elif shift_option == 'tab_switch':
                            pass
                        elif shift_option == 'split_shift':
                            make_split_shift(emplhour, upload_dict, eplh_update_list, check_overlap_list, comp_timezone, request)

# E. Update emplhour, also when it is created, not when is_delete
                        update_emplhour(emplhour, upload_dict, error_list, clear_overlap_list,
                                                  request, comp_timezone, timeformat, user_lang, eplh_update_list)
# 6. create list of updated emplhour_rows
                filter_dict = {'eplh_update_list': eplh_update_list}
                emplhour_rows = d.create_emplhour_rows(filter_dict, request, None, is_delete)
                if deleted_list:
                    emplhour_rows.extend(deleted_list)
                if emplhour_rows:
                    update_wrap['emplhour_updates'] = emplhour_rows

                # - also get emplhournote (roster page)
                emplhournote_rows = d.create_emplhournote_rows(
                    period_dict=filter_dict,
                    last_emplhour_check=None,
                    request=request)
                if emplhournote_rows:
                    update_wrap['emplhournote_updates'] = emplhournote_rows

# - check for overlap - check_overlap_list contains employee_pk's that must be checked
                # PR2020-05-13 debug: when removing employee the emplhour overlap must be deleted
                # - check_overlap_list contains employee_pk's that must be checked
                # - clear_overlap_list contains emplhour_pk's that must be cleared
                #logger.debug('check_overlap_list' + str(check_overlap_list) + ' ' + str(type(check_overlap_list)))
                #logger.debug('clear_overlap_list' + str(clear_overlap_list) + ' ' + str(type(clear_overlap_list)))
                overlap_dict = {}
                if check_overlap_list:
                    # this is only for testing:
                    update_wrap['check_overlap_list'] = check_overlap_list
                    datefirst_iso = upload_dict.get('period_datefirst')
                    datelast_iso = upload_dict.get('period_datelast')
                    #logger.debug('upload_dict: ' + str(upload_dict))
                    #logger.debug('datefirst_iso: ' + str(datefirst_iso) + ' ' + str(type(datefirst_iso)))
                    #logger.debug('datelast_iso: ' + str(datelast_iso) + ' ' + str(type(datelast_iso)))
                    if datefirst_iso and datelast_iso:
                        overlap_dict = f.check_emplhour_overlap(datefirst_iso, datelast_iso, check_overlap_list, request)

                    # add emplhour_pk of removed employees to overlap_dict - to remove overlap from these emplhours
                if clear_overlap_list:
                    for emplhour_pk in clear_overlap_list:
                        if emplhour_pk not in overlap_dict:
                            overlap_dict[emplhour_pk] = {}
                if overlap_dict:
                    update_wrap['overlap_dict'] = overlap_dict
            #update_wrap['update_list'] = eplh_update_list

# 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


def create_orderhour_emplhour(upload_dict, error_list, request):
   #logger.debug(' --- create_orderhour_emplhour --- ')
   #logger.debug('upload_dict: ' + str(upload_dict))

    rosterdate_dte, order, orderhour, emplhour, schemeitem_pk, teammember_pk = None, None, None, None, None, None

# - get rosterdate
    field = 'rosterdate'
    if field in upload_dict:
        rosterdate_iso = f.get_dict_value(upload_dict, (field, 'value'))  # new_value: '2019-04-12'
        rosterdate_dte, msg_err = f.get_date_from_ISOstring(rosterdate_iso, True)  # True = blank_not_allowed
        if msg_err is not None:
            error_list.append(msg_err)

# - get parent 'order'
    field = 'orderhour'
    if field in upload_dict:  # orderhour: {'value': 'UTS - UTS', 'order_pk': 59, 'update': True}}
        order_pk = f.get_dict_value(upload_dict, (field, 'order_pk'))
        if order_pk:
            order = m.Order.objects.get_or_none(customer__company=request.user.company, pk=order_pk)

    if rosterdate_dte and order:
        is_restshift = False
        is_absence = order.customer.isabsence

# - get billable from shift and scheme (if a shift is selected), and from order, customer and company
        # get shift (may be blank)
        shift = None
        if 'shift' in upload_dict:
            shift_pk = f.get_dict_value(upload_dict, ('shift', 'pk'))
            if shift_pk:
                shift = m.Shift.objects.get_or_none(scheme__order= order, pk=shift_pk)
                if shift:
                    is_restshift = shift.isrestshift
        is_billable = f.get_billable_from_order_shift(order, shift)

# try to get schemeitem_pk, teammember_pk PR2020-07-05
        # don't.'schemeitem_pk / teammember_pk / rosterdate combination is used to skip planned records when
        # rostedate is made for a second time or more.
        # a planned shift might be skipped because of an added shift

# - get invoicedate
        # TODO get invoicedate from order settings, make it end of this month for now
        invoice_date = f.get_lastof_month(rosterdate_dte)

# - create orderhour
        # shift_code will be saved in update_emplhour
        orderhour = m.Orderhour(
            order=order,
            ordercode=order.code,
            customercode=order.customer.code,
            rosterdate=rosterdate_dte,
            isabsence=is_absence,
            isrestshift=is_restshift,
            isbillable=is_billable,
            invoicedate=invoice_date
        )
        orderhour.save(request=request)

# - create error when orderhour not created
    if orderhour is None:
        msg_err = _('This item could not be created.')
        error_list.append(msg_err)

# - subtract 1 from used entries
    #  > individual entries will be calculated at the beginning of each month

# - emplhour has no employee yet: set paydayecode = None and paydate = last date of month
    paydate = f.get_lastof_month(orderhour.rosterdate)

# +++ create emplhour
    if orderhour:
        exceldate = f.get_Exceldate_from_datetime(orderhour.rosterdate)
        # an added emplhour has always haschanged=True, to see difference with planned emplhours PR20202-07-21
        emplhour = m.Emplhour(
            orderhour=orderhour,
            rosterdate=orderhour.rosterdate,
            exceldate=exceldate,
            paydate=paydate,
            haschanged=True
        )
        emplhour.save(request=request, last_emplhour_updated=True)

    if emplhour is None:
        msg_err = _('This item could not be created.')
        error_list.append(msg_err)

    return emplhour, orderhour


def make_absence_shift(emplhour, orderhour, upload_dict, eplh_update_list, check_overlap_list, comp_timezone, request):
    #logger.debug(' --- make_absence_shift --- ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    # in make_absence_shift:
    #  create absence record with current employee, absence order
    #   - current employee will become absence employee, must always have value
    #   - if first shiftpart is absence: time start of absence  = timestart of current shift
    #               time end of absence  = upload_dict.timestart
    #   - if last shiftpart is absence: time start of absence  = upload_dict.timeend
    #                                   time end of absence  = timeend of current shift
    # in update_emplhour:
    #   - current employee will be replaced by upload_dict.employee or None.
    #   - if first shiftpart is absence: time start of emplhour = upload_dict.timestart
    #                                   time end of emplhour stays the same
    #   - if last shiftpart is absence: time start of emplhour stays the same
    #                                   time end of emplhour = upload_dict.timeend

    # upload_dict: {'id': {'pk': 12006, 'ppk': 11455, 'table': 'emplhour', 'isabsence': False, 'shiftoption': 'make_absent'},
    # 'employee': {'field': 'employee', 'pk': 2622, 'ppk': 3, 'code': 'Francois L', 'update': True},
    # 'abscat': {'pk': 1448, 'ppk': 705, 'code': 'Ziek', 'table': 'order', 'isabsence': True, 'update': True},
    # 'split': 'split_before',
    # 'offsetstart': {'value': 600, 'update': True}}

    rosterdate_dte = orderhour.rosterdate

# - lookup abscat_order_pk in abscat_dict
    abscat_order_pk = None
    abscat_dict = upload_dict.get('abscat')
    if abscat_dict:
        abscat_order_pk = abscat_dict.get('pk')

# - lookup abscat_order
    abscat_order = None
    if abscat_order_pk:
        abscat_order = m.Order.objects.get_or_none(
            id=abscat_order_pk,
            customer__company=request.user.company,
            isabsence=True)

# - if abscat_order not found: set default abscat if category not entered (default abscat has lowest sequence)
    if abscat_order is None:
        # lookup abscat_cust if order not found, create abscat_cust and abscat_order if not exist
        abscat_cust = cust_dicts.get_or_create_absence_customer(request)
        if abscat_cust:
            # get abscat_order with lowest sequence
            abscat_order = m.Order.objects.filter(
                customer=abscat_cust,
                isabsence=True
            ).order_by('sequence').first()

# - lookup current employee from emplhour
    if abscat_order:
        absent_employee = emplhour.employee
        #logger.debug('abscat_order: ' + str(abscat_order))
        #logger.debug('absent_employee: ' + str(absent_employee))

        if absent_employee:
# - add absent_employee to check_overlap_list
            if absent_employee and absent_employee.pk not in check_overlap_list:
                check_overlap_list.append(absent_employee.pk)

# 4. get is_publicholiday, is_companyholiday of this date from Calendar
            # set absence to zero on public holidays and weekends when 'nohoursonsaturday' etc
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)

# - get nopay. These fields are in order and scheme. For absence: use table 'order'
            abscat_nopay = abscat_order.nopay

# - get nohours  These fields are in order and scheme. For absence: use table 'order'
            nohours_onsaturday, nohours_onsunday, nohours_onpublicholiday, nohours_oncompanyholidayNIU = \
                get_nosat_sun_ph_ch_from_emplhour(emplhour)
            abscat_nohours = (is_saturday and nohours_onsaturday) or \
                            (is_sunday and nohours_onsunday) or \
                            (is_publicholiday and nohours_onpublicholiday)
            #logger.debug('abscat_nohours: ' + str(abscat_nohours))

# - calculate time_duration et cetera
            offset_start, offset_end, excel_start, excel_end = None, None, None, None
            time_start, time_end, time_duration, = None, None, 0
            # break_duration = 0 in absence shift, break_duration is counted in current emplhour
            break_duration = 0
    # - skip when abscat_nohours
            if not abscat_nohours:

    # - get split, offset_start, offset_end
                split = upload_dict.get('split')
                if split == 'split_before':
                    # when split_before: offsetstart contains the start time of the original shift.
                    # This is the end time of the absence shift
                    offset_start = emplhour.offsetstart
                    offset_end = f.get_dict_value(upload_dict, ('offsetstart', 'value'))
                elif split == 'split_after':
                    # when split_after: offsetend contains the end time of the original shift.
                    # This is the start time of the absence shift
                    offset_start = f.get_dict_value(upload_dict, ('offsetend', 'value'))
                    offset_end = emplhour.offsetend

    # - calculate time_start, time_end, time_duration, excel_start, excel_end
                nohours_onsaturday, nohours_onsunday, nohours_onpublicholiday, nohours_oncompanyholiday = \
                    get_nosat_sun_ph_ch_from_emplhour(emplhour)

                # when employee_pk is None time_duration will be set to None
                employee_pk = absent_employee.pk if absent_employee else None

                # when time_duration is None: time_duration will get value of employee_wmpd
                # not when absence_shift is a split absence_shift
                employee_wmpd = None
                if absent_employee and split not in ('split_before', 'split_after'):
                    if absent_employee.workminutesperday:
                        employee_wmpd = absent_employee.workminutesperday
                    elif absent_employee.company.workminutesperday:
                        employee_wmpd = absent_employee.company.workminutesperday

                time_start, time_end, planned_durationNIU, time_duration, billing_durationNIU, excel_dateNIU, excel_start, excel_end = \
                    f.calc_timedur_plandur_from_offset(
                        rosterdate_dte=emplhour.rosterdate,
                        is_absence=True, is_restshift=False, is_billable=False,
                        is_sat=is_saturday, is_sun=is_sunday, is_ph=is_publicholiday, is_ch=is_companyholiday,
                        row_offsetstart=offset_start, row_offsetend=offset_end,
                        row_breakduration=break_duration, row_timeduration=0,
                        row_nosat=nohours_onsaturday, row_nosun=nohours_onsunday,
                        row_noph=nohours_onpublicholiday, row_noch=nohours_oncompanyholiday,
                        row_employee_pk=employee_pk, row_employee_wmpd=employee_wmpd,
                        comp_timezone=comp_timezone)

# create new abscat_orderhour
            #  remove tilde from absence category (tilde is used for line break in payroll tables) PR2020-08-14
            abscat_customer_code = abscat_order.customer.code.replace('~', '') if abscat_order.customer.code else None
            abscat_order_code = abscat_order.code.replace('~', '') if abscat_order.code else None
            new_orderhour = m.Orderhour(
                order=abscat_order,
                # Note: don't set schemeitem=orderhour.schemeitem. This is only used in planned orderhours
                customercode=abscat_customer_code,
                ordercode=abscat_order_code,
                # shiftcode = None
                rosterdate=rosterdate_dte,
                invoicedate=None,
                isbillable=False,
                isabsence=True,
                isrestshift=False,
                status=c.STATUS_000_NONE
            )
            new_orderhour.save(request=request)

 # create new emplhour record with current employee
            if new_orderhour:
                # don't copy schemeitemid / teammemberid - it is link with scheme/teammember
                # calculate excelstart and excelend, otherwise check overlap does not work PR2020-05-13
                excel_date = f.get_Exceldate_from_datetime(rosterdate_dte)
                excel_start = excel_date * 1440
                excel_end = excel_date * 1440 + 1440

            # get paydate from absent_employee.paydatecode
                firstdateNIU, paydate = recalc_paydate(rosterdate_dte, absent_employee.paydatecode)
                # an added absence emplhour has always haschanged=True PR2020-07-21
                new_emplhour = m.Emplhour(
                    orderhour=new_orderhour,
                    employee=absent_employee,
                    employeecode=absent_employee.code,

                    rosterdate=rosterdate_dte,
                    exceldate=f.get_Exceldate_from_datetime(rosterdate_dte),

                    paydatecode=absent_employee.paydatecode,
                    paydate=paydate,
                    nopay=abscat_nopay,
                    excelstart=excel_start,
                    excelend=excel_end,
                    # dont copy shift, is confusing. Was: shift=orderhour.shift,
                    # plannedduration = 0, billingduration = 0 , breakduration = 0
                    timestart=time_start,
                    timeend=time_end,
                    offsetstart=offset_start,
                    offsetend=offset_end,
                    timeduration=time_duration,
                    status=c.STATUS_000_NONE,
                    haschanged=True,
                    hasnote=True
                )
                new_emplhour.save(request=request, last_emplhour_updated=True)

# - create notes
                if new_emplhour:
            # put 'Absent from' in new emplhour
                    c_o_code = orderhour.customercode if orderhour.customercode else ''
                    if orderhour.ordercode:
                        c_o_code += ' - ' + orderhour.ordercode
                    if orderhour.shiftcode:
                        c_o_code += ', ' + orderhour.shiftcode

                    note = str(_('Absent from ')) + c_o_code
                    emplhournote = m.Emplhournote(
                        emplhour=new_emplhour,
                        note=note,
                        isusernote=False
                    )
                    emplhournote.save(request=request)
            # put 'is absent' in current emplhour
                    absent_employee_code = absent_employee.code if absent_employee.code else '---'
                    note = absent_employee_code + str(_(' is absent'))
                    if abscat_order_code:
                        note += ' (' + abscat_order_code + ')'
                    emplhournote = m.Emplhournote(
                        emplhour=emplhour,
                        note=note,
                        isusernote=False
                    )
                    emplhournote.save(request=request)
            
                    emplhour.hasnote=True
                    emplhour.save()

# - save to log
                m.save_to_emplhourlog(new_emplhour.pk, request, False)  # is_deleted=False

                if new_emplhour:
                    if new_emplhour.pk not in eplh_update_list:
                        eplh_update_list.append(new_emplhour.pk)

# --- end of make_absence_shift


def change_absence_shift(emplhour, upload_dict, eplh_update_list, request):  # PR2020-04-13
    #logger.debug(' --- change_absence_shift --- ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    # this function changes the absence order in the orderhour.

# - get parent (orderhour is parent of emplhour)
    orderhour = emplhour.orderhour
    cur_order = orderhour.order

# - lookup abscat_order_pk in abscat_dict
    abscat_order_pk = None
    abscat_dict = upload_dict.get('abscat')
    if abscat_dict:
        abscat_order_pk = abscat_dict.get('pk')

# - lookup abscat_order
    abscat_order = None
    if abscat_order_pk:
        abscat_order = m.Order.objects.get_or_none(
            id=abscat_order_pk,
            customer__company=request.user.company,
            isabsence=True)
        if abscat_order and abscat_order != cur_order:
            # change order in orderhour PR2020-07-21
            #  remove tilde from absence category (tilde is used for line break in payroll tables) PR2020-08-31
            new_customer_code = abscat_order.customer.code.replace('~', '') if abscat_order.customer.code else None
            new_order_code = abscat_order.code.replace('~', '') if abscat_order.code else None

# - when abscat changes 'no hours on saturday' etc can also change. Hours must be recalculated as well PR2020-09-21
            # get is_publicholiday, is_companyholiday of this rosterdate from Calendar
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(orderhour.rosterdate, request)

            # - get nohours and nopay. Thse fields are in order and scheme. For absence: use table 'order'
            abscat_nopay = abscat_order.nopay
            abscat_nohours = (is_saturday and abscat_order.nohoursonsaturday) or \
                          (is_sunday and abscat_order.nohoursonsunday) or \
                          (is_publicholiday and abscat_order.nohoursonpublicholiday)

            # split shifts can have multiple emplhour records in one orderhour
            # absence records cannot be split, because modal woindow with that option not enabled when absence record

            # TODO: payroll manager must be able to split absence records for rcorrection purposes PR2020-09-22
            emplhours = m.Emplhour.objects.filter(orderhour=orderhour)
            duration_changed_in_one_row = False
            # when abscat is changed to a 'no_hours' abscat: set duration = 0.
            # leave duration otherwise
            for emplhour in emplhours:
                save_emplhour = False
                if abscat_nopay != emplhour.nopay:
                    emplhour.nopay = abscat_nopay
                    save_emplhour = True
                if abscat_nohours and emplhour.timeduration:
                    emplhour.timeduration = 0
                    save_emplhour = True
                if save_emplhour:
                    emplhour.haschanged = True
                    emplhour.save(request=request, last_emplhour_updated=True)
    # - save to log
                    m.save_to_emplhourlog(emplhour.pk, request, False)  # is_deleted=False

                    if emplhour.pk not in eplh_update_list:
                        eplh_update_list.append(emplhour.pk)

            orderhour.order=abscat_order
            orderhour.customercode = new_customer_code
            orderhour.ordercode = new_order_code
            orderhour.save(request=request, last_emplhour_updated=True)

# --- end of change_absence_shift


def moveto_shift(emplhour, upload_dict, eplh_update_list, check_overlap_list, comp_timezone, timeformat, user_lang, request):
    #logger.debug(' --- moveto_shift --- ')
    #logger.debug('upload_dict: ' + str(upload_dict))

    # moveto_shift removes the current employee from the current emplhour record
    # and replaces the employee of the selected emplhour with the current employee
    # when key 'employee' exists in upload_dict:
    #   'employee' containsthe employee of the 'moveto' emplhour
    #   this employee will be put in the current emplhour records

    #  upload_dict: {id: {pk: 10201, ppk: 9681, table: "emplhour", shiftoption: "moveto_shift", rowindex: 4},
    #                 employee: {pk: "2620", ppk: undefined, table: "employee", update: true}
    #                 moveto_emplhour_pk: 10205
    #                 period_datefirst: "2020-07-01"
    #                 period_datelast: "2020-07-31"}

    update_dict = {}

# - lookup moveto_emplhour
    # don't change when status is START_CONFIRMED or higher (this is also filtered in EmplhourDownloadView)
    # also don't change when locked, lockedpaydate or lockedinvoice
    moveto_emplhour_pk = upload_dict.get('moveto_emplhour_pk')
    moveto_emplhour = None
    if moveto_emplhour_pk:
        moveto_emplhour = m.Emplhour.objects.get_or_none(
            pk=moveto_emplhour_pk,
            orderhour__order__customer__company_id=request.user.company,
            orderhour__lockedinvoice=False,
            lockedpaydate=False,
            status__lt=c.STATUS_004_START_CONFIRMED,
            locked=False
        )

    if moveto_emplhour:

# - get employee from current emplhour
        cur_emplhour_employee = emplhour.employee

# get paydate from employee.paydatecode and moveto_emplhour.rosterdate
        if cur_emplhour_employee:
            firstdateNIU, paydate = recalc_paydate(moveto_emplhour.rosterdate, cur_emplhour_employee.paydatecode)

            # if moveto_emplhour.employee was empty: fill in timeduration, otherwise: let it stay PR2020-07-24
            # this is added, because timeduration is set to 0 when employee is None
            if moveto_emplhour.employee is None:
                # - calculate new_minutes from timestart and timeend, returns 0 when timestart or timeend is None
                time_duration = f.get_timeduration(
                    timestart=moveto_emplhour.timestart,
                    timeend=moveto_emplhour.timeend,
                    breakduration=moveto_emplhour.breakduration)
                moveto_emplhour.timeduration = time_duration

            moveto_emplhour.employee = cur_emplhour_employee
            moveto_emplhour.employeecode = cur_emplhour_employee.code

            moveto_emplhour.paydatecode = cur_emplhour_employee.paydatecode
            moveto_emplhour.paydate = paydate
            moveto_emplhour.isreplacement = False
            moveto_emplhour.haschanged = True
            moveto_emplhour.save(request=request, last_emplhour_updated=True)

# - save to log
            m.save_to_emplhourlog(moveto_emplhour.pk, request, False)  # is_deleted=False

# - add moveto_emplhour to eplh_update_list
            if moveto_emplhour and moveto_emplhour.pk not in eplh_update_list:
                eplh_update_list.append(moveto_emplhour.pk)

# - add employee to check_overlap_list
        if cur_emplhour_employee.pk not in check_overlap_list:
            check_overlap_list.append(cur_emplhour_employee.pk)

# --- end of moveto_shift

def make_split_shift(emplhour, upload_dict, eplh_update_list, check_overlap_list, comp_timezone, request):
    #logger.debug(' ------------- make_split_shift ------------- ')
    #logger.debug('upload_dict: ' + str(upload_dict))
    # first create split record with upload_dict.employee, if blank: with current employee
    # - time start of the split shift = upload_dict.timeend (i.e. timeend of current shift)
    # - the timeend of the current emplhour will will be replaced in update_emplhour
    # current employee stays the same in update_emplhour > remove from upload_dict
    # make_split_shift makes changes in upload_dict.timeend
    # timeend in original emplhour will be changed in update_emplhour

    #  a new emplhour record will be created for the selected employee
    # time start of the split shift = upload_dict.timeend (i.e. timeend of current shift)
    # the timeend of the current emplhour will will be replaced in update_emplhour

    # upload_dict: {'id': {'pk': 8229, 'ppk': 7736, 'table': 'emplhour', 'isabsence': False, 'shiftoption': 'split_shift', 'rowindex': 6},
    # 'splitemployee': {'field': 'employee', 'update': True, 'pk': 2619, 'ppk': 3, 'code': 'Gomes Bravio NM'},
    # 'timeend': {'value': 870, 'update': True},

# - get parent (orderhour is parent of emplhour)
     # when split: orderhour stays the same, put issplitshift = True in orderhour
    orderhour = emplhour.orderhour
    orderhour.issplitshift = True
    rosterdate_dte = orderhour.rosterdate

# - get new_employee
    # get new_employee from upload_dict.employee. If blank: use current employee
    # current employee stays the same in update_emplhour, therefore upload_dict may not have an employee_dict
    # remove employee_dict from upload_dict with 'pop' function
    new_employee = None
    employee_dict = upload_dict.pop('employee', None)
    if employee_dict:
        employee_pk = employee_dict.get('pk')
        if employee_pk:
            new_employee = m.Employee.objects.get_or_none(id=employee_pk, company=request.user.company)
# - use current employee when no new employee is found
    if new_employee is None:
        new_employee = emplhour.employee

# - add employee and new_employee to check_overlap_list
    if emplhour.employee and emplhour.employee.pk not in check_overlap_list:
        check_overlap_list.append(emplhour.employee.pk)
    if new_employee and new_employee.pk not in check_overlap_list:
        check_overlap_list.append(new_employee.pk)

    #logger.debug('check_overlap_list: ' + str(check_overlap_list))

# - calculate time_duration et cetera
    offset_start, offset_end, excel_start, excel_end = None, None, None, None
    # break_duration = 0 in split part of shift, break_duration is counted in current emplhour
    break_duration = 0

# - get split, offset_start, offset_end
    split = upload_dict.get('split')
    if split == 'split_before':
        # when split_before: offsetstart contains the start time of the original shift.
        # This is the end time of the absence shift
        offset_start = emplhour.offsetstart
        offset_end = f.get_dict_value(upload_dict, ('offsetstart', 'value'))
    elif split == 'split_after':
        # when split_after: offsetend contains the end time of the original shift.
        # This is the start time of the absence shift
        offset_start = f.get_dict_value(upload_dict, ('offsetend', 'value'))
        offset_end = emplhour.offsetend

# - calculate timestart, timeend, time_duration, excel_start, excel_end
    # set absence to zero on public holidays and weekends when 'nohoursonsaturday' etc
    is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
        f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)

    nohours_onsaturday, nohours_onsunday, nohours_onpublicholiday, nohours_oncompanyholiday = \
        get_nosat_sun_ph_ch_from_emplhour(emplhour)

    # when employee_pk is None time_duration will be set to None
    employee_pk = new_employee.pk if new_employee else None

    # when time_duration is None: time_duration will get value of employee_wmpd
    # not when absence_shift is a split absence_shift
    employee_wmpd = None
    if new_employee and split not in ('split_before', 'split_after'):
        if new_employee.workminutesperday:
            employee_wmpd = new_employee.workminutesperday
        elif new_employee.company.workminutesperday:
            employee_wmpd = new_employee.company.workminutesperday

    time_start, time_end, planned_durationNIU, time_duration, billing_durationNIU, excel_dateNIU, excel_start, excel_end = \
        f.calc_timedur_plandur_from_offset(
            rosterdate_dte=emplhour.rosterdate,
            is_absence=True, is_restshift=False, is_billable=False,
            is_sat=is_saturday, is_sun=is_sunday, is_ph=is_publicholiday, is_ch=is_companyholiday,
            row_offsetstart=offset_start, row_offsetend=offset_end,
            row_breakduration=break_duration, row_timeduration=0,
            row_nosat=nohours_onsaturday, row_nosun=nohours_onsunday,
            row_noph=nohours_onpublicholiday, row_noch=nohours_oncompanyholiday,
            row_employee_pk=employee_pk, row_employee_wmpd=employee_wmpd,
            comp_timezone=comp_timezone)

# - calculate date_part
    date_part = f.calc_datepart(offset_start, offset_end)

# - calculate billing_duration
    # when shift is not billable: billing_duration stays 0, all planned hours are billed in current emplhour
    # when shift is billable: both split emplhour and current emplhour have billing_duration = time_duration
    billing_duration = 0
    if orderhour.isbillable:
        billing_duration = time_duration

# calculate amount, addition and tax
    amount, addition, tax = f.calc_amount_addition_tax_rounded(
                billing_duration=billing_duration,
                is_absence=orderhour.isabsence,
                is_restshift=orderhour.isrestshift,
                price_rate=orderhour.pricerate,
                addition_rate=orderhour.additionrate,
                tax_rate=orderhour.taxrate)
    new_wage = 0
    new_overlap = 0

# get paydatecode and paydate from employee.paydatecode and moveto_emplhour.rosterdate
    firstdateNIU, paydate = recalc_paydate(orderhour.rosterdate, new_employee.paydatecode)

# - create new emplhour record
    new_emplhour = m.Emplhour(
        orderhour=orderhour,
        rosterdate=emplhour.rosterdate,
        exceldate=emplhour.exceldate,

        employee=new_employee,
        employeecode=new_employee.code,
        # cat=0,
        isreplacement=emplhour.isreplacement,
        datepart=date_part,

        paydate=paydate,
        paydatecode=new_employee.paydatecode,
        lockedpaydate=emplhour.lockedpaydate,
        nopay=emplhour.nopay,

        timestart=time_start,
        timeend=time_end,
        breakduration=break_duration,
        timeduration=time_duration,
        plannedduration=0,
        billingduration=billing_duration,

        offsetstart=offset_start,
        offsetend=offset_end,
        excelstart=excel_start,
        excelend=excel_end,

        functioncode=new_employee.functioncode,
        wagecode=new_employee.wagecode,
        wagefactorcode=emplhour.wagefactorcode,
        wagerate=emplhour.wagerate,
        wagefactor=emplhour.wagefactor,
        wage=new_wage,

        amount=amount,
        addition=addition,
        tax=tax,

        status=c.STATUS_000_NONE,
        haschanged=True,
        overlap=new_overlap,
        hasnote=True,

        schemeitemid=emplhour.schemeitemid,
        teammemberid=emplhour.teammemberid
    )
    orderhour.save(request=request)
    new_emplhour.save(request=request, last_emplhour_updated=True)

# - create notes
    if new_emplhour:
        # put 'Shift is split' in new emplhour
        note = str(_('Shift is split'))
        emplhournote = m.Emplhournote(
            emplhour=new_emplhour,
            note=note,
            isusernote=False
        )
        emplhournote.save(request=request)
        # put 'Shift is split' in current emplhour
        emplhournote = m.Emplhournote(
            emplhour=emplhour,
            note=note,
            isusernote=False
        )
        emplhournote.save(request=request)

        emplhour.hasnote = True
        emplhour.save()


# - save to log
    m.save_to_emplhourlog(new_emplhour.pk, request, False)  # is_deleted=False

# - add moveto_emplhour to eplh_update_list
    if new_emplhour and new_emplhour.pk not in eplh_update_list:
        eplh_update_list.append(new_emplhour.pk)

# end of make_split_shift


#######################################################
def update_emplhour(emplhour, upload_dict, error_list, clear_overlap_list, request, comp_timezone, timeformat, user_lang, eplh_update_list):
    # --- saves updates in existing and new emplhour PR2-019-06-23
    # only called by EmplhourUploadView
    # also update orderhour when time has changed
    #logger.debug(' --------- update_emplhour -------------')
    #logger.debug('upload_dict: ' + str(upload_dict))

# upload_dict: {'id': {'pk': 11760, 'ppk': 11215, 'table': 'emplhour'},
    # 'nopay': {'value': True, 'update': True},
    # 'wagefactorcode': {'pk': None, 'update': True}}

    has_changed = False
    if emplhour:
        save_orderhour = False
        save_changes = False
        recalc_duration = False
        is_create = f.get_dict_value(upload_dict, ('id', 'create'), False)
        is_restshift = emplhour.orderhour.isrestshift
        is_absence = emplhour.orderhour.isabsence
        is_billable = emplhour.orderhour.isbillable

        for field in c.FIELDS_EMPLHOUR:
# --- get field_dict from  upload_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    #logger.debug('field: ' + str(field))
                    is_updated = False
# ---   save changes in field 'rosterdate'
                    if field == 'rosterdate':
                        pass  # change rosterdate in emplhour not allowed
# ---   save changes in field 'order'
                    elif field == 'order':
                        pass  # change order only possible in change_absence_shift
# ---   save changes in field 'employee'
                    # 'employee': {'field': 'employee', 'update': True, 'pk': 1675, 'ppk': 2, 'code': 'Wilson, Jose'}}
                    elif field == 'employee':
                        old_employee_pk = None  # is used at end for update_emplhour_overlap
                # - get current employee
                        cur_employee = emplhour.employee
                        if cur_employee:
                            old_employee_pk = cur_employee.pk
                        #logger.debug('cur_employee: ' + str(cur_employee))
                # - get new employee
                        new_employee = None
                        new_employee_pk = field_dict.get('pk')
                        #logger.debug('field_dict[' + field + ']: ' + str(field_dict))
                        if new_employee_pk:
                            new_employee = m.Employee.objects.filter(company=request.user.company, pk=new_employee_pk).first()
                            if new_employee is None:
                                new_employee_pk = None
                        #logger.debug('new_employee: ' + str(new_employee))
                # - save field if changed
                        # employee_pk is not required, new_employee_pk may be None
                        if new_employee_pk != old_employee_pk:
                # - update field employee in emplhour, also field employeecode
                            setattr(emplhour, field, new_employee)
                            new_employeecode = new_employee.code if new_employee else None
                            setattr(emplhour, 'employeecode', new_employeecode)
                # - reset 'isreplacement'
                            emplhour.isreplacement = False
                            is_updated = True
                            has_changed = True
                # - also recalc_duration, so set or remove timeduraton when employee has changed
                            recalc_duration = True
                # - add functioncode, wagecode, paydatecode from employee, recalc paydate
                            if new_employee:
                                emplhour.functioncode = new_employee.functioncode
                                emplhour.wagecode = new_employee.wagecode

                                emplhour.paydatecode = new_employee.paydatecode
                                firstdateNIU, paydate = recalc_paydate(emplhour.rosterdate, new_employee.paydatecode)
                                emplhour.paydate = paydate
                            else:
                                # remove paydatecode when no employee, reset paydate to monthly, 31
                                emplhour.functioncode = None
                                emplhour.wagecode = None
                                emplhour.paydatecode = None
                                firstdateNIU, paydate = recalc_paydate(emplhour.rosterdate, None)
                                emplhour.paydate = paydate
                # - add emplhour_pk to clear_overlap_list, to remove overlap from this emplhour
                            # clear_overlap_list contains emplhour_pk's that must be cleared
                            if emplhour.pk not in clear_overlap_list:
                                clear_overlap_list.append(emplhour.pk)
                            #logger.debug('save new_employee')
# ---   save changes in field 'shift'.
                    #  Note: field 'shift' is in orderhour, not emplhour!!
                    # 'shift': {'code': '08:00 - 1:00', 'update': True}
                    elif field == 'shiftcode':
                        new_shiftcode = field_dict.get('value')
                        orderhour = emplhour.orderhour
                        setattr(orderhour, 'shiftcode', new_shiftcode)
                        #logger.debug('shiftcode  new_value: ' + str(new_shiftcode))
                        save_orderhour = True
                        is_updated = True
# ---   save changes in field 'timestart', 'timeend'
                    elif field in ('offsetstart', 'offsetend'):
                        # 'offsetstart': {'value': -560, 'update': True}}
                        # use saved_rosterdate to calculate time from offset
                        #logger.debug('field: ' + str(field))
                        #logger.debug('emplhour.rosterdate: ' + str(emplhour.rosterdate))
                        if emplhour.rosterdate:
                    # - get new offset of this emplhour
                            # value = 0 means midnight, value = null means blank
                            new_offset_int = field_dict.get('value')
                            #logger.debug('new_offset_int: ' + str(new_offset_int))
                    # -  set timeduration to 0 when is calculated duration and offset is set to None PR2020-08-23
                            if new_offset_int is None:
                                if emplhour.offsetstart is not None and emplhour.offsetend is not None:
                                    emplhour.timeduration = 0
                    # - save offsetstart, offsetend PR2020-04-09
                            setattr(emplhour, field, new_offset_int)
                    # - get timestart/timeend from rosterdate and offsetstart /-end
                            # timestart/timeend will be recalculated in recalc_duration

                    # - also save excelstart, excelend PR2020-05-11
                            # excelstart, excelend will be recalculated in recalc_duration
                            excel_field = 'excelstart' if field == 'offsetstart' else  'excelend'
                            excel_date = f.get_Exceldate_from_datetime(emplhour.rosterdate)
                            offset_nonull = new_offset_int if new_offset_int else 0
                            excel_value = excel_date * 1440 + offset_nonull
                            setattr(emplhour, excel_field, excel_value)
                            #logger.debug('excel_field: ' + str(excel_field))
                            #logger.debug('excel_value: ' + str(excel_value))
                    # - set is_updated and  recalc_duration to True
                            is_updated = True
                            recalc_duration = True
                            has_changed = True
# ---   save changes in breakduration and timeduration field
                    elif field in ('breakduration', 'timeduration'):
                        new_minutes = field_dict.get('value', 0)
                        #logger.debug('field: ' + str(field))
                        #logger.debug('new_minutes: ' + str(new_minutes))
                        # PR2020-02-22 debug. Default '0' not working. breakduration = None gives error, Not null
                        if new_minutes is None:
                            new_minutes = 0
                        # duration unit in database is minutes
                        # value of timeduration will be recalculated if 'timestart' and 'timeend' both are not None
                        old_minutes = getattr(emplhour, field, 0)
                        #logger.debug('old_minutes: ' + str(old_minutes))
                        if new_minutes != old_minutes:
                            setattr(emplhour, field, new_minutes)
                            is_updated = True
                            recalc_duration = True
                            has_changed = True

#############################################
                        # Wagcode not in use yet  # TODO make wagecode with items , like pricecode. Wage not in use yet
# ---   save changes in functioncode
                    elif field == 'functioncode':
                   # - get current instance
                        old_instance_pk = emplhour.functioncode_id

                        new_pk = field_dict.get('pk')
                        if new_pk:
                            new_instance = m.Wagecode.objects.get_or_none(
                                    id=new_pk,
                                    isfunctioncode=True,
                                    company=request.user.company)
                            if new_instance is None:
                                new_pk = None
                    # - save field if changed
                            # new_pk is not required, new_pk may be None
                            if new_pk != old_instance_pk:
                                setattr(emplhour, field, new_instance)
                                is_updated = True
                                has_changed = True

#############################################
                                # ---   save changes in breakduration and timeduration field
                    elif field == 'nopay':
                        old_nopay = emplhour.nopay
                        new_nopay = field_dict.get('value', False)

                        #logger.debug('old_nopay: ' + str(old_nopay))
                        #logger.debug('new_nopay: ' + str(new_nopay))

                        if new_nopay != old_nopay:
                            emplhour.nopay = new_nopay
                            # remove wagefactor when new_nopay = True
                            if new_nopay:
                                emplhour.wagefactorcode = None
                                emplhour.wagefactorcaption = None
                                emplhour.wagefactor = 0
                            is_updated = True
                            has_changed = True


                    elif field == 'wagefactorcode':
                        # calculated other fields are: wagefactor wagecode , wagerate , wage
                        # values of these 3 fields are stored in table 'Wagecode'
                        # fields of wagefactor are:
                        #    wagefactorcode  (= wagefactorcode_id),
                        #    wagefactor (= reate,   # /1.000.000 unitless, 0 = factor 100%  = 1.000.000)
                        #    wagefactorcaption =  Wagecode.code

                        # Wagcode not in use yet  # TODO make wagecode with items , like pricecode. Wage not in use yet
                # - get current instance
                        old_instance_pk = emplhour.wagefactorcode_id

                        new_pk = field_dict.get('pk')


                        #logger.debug('old_instance_pk: ' + str(old_instance_pk))
                        #logger.debug('new_pk: ' + str(new_pk))

                        if new_pk:
                            new_instance = m.Wagecode.objects.get_or_none(
                                id=new_pk,
                                iswagefactor=True,
                                company=request.user.company)
                            if new_instance is None:
                                new_pk = None
                            # new_pk is not required, new_pk may be None
                            if new_pk != old_instance_pk:
                                emplhour.wagefactorcode = new_instance
                                emplhour.wagefactorcaption = new_instance.code if new_instance else None
                                emplhour.wagefactor = new_instance.wagerate if new_instance else 0 # wagefactor is NoNull field
                                is_updated = True
                                has_changed = True
                                # reset nopay when wagefactor has value
                                if new_pk:
                                    emplhour.nopay = False

###########################################
# ---   save changes in field 'status' when clicked on confirmstart or confirmend
                    elif field in ('confirmstart', 'confirmend'):
                        old_status_sum = getattr(emplhour, field, 0)
                        new_confirmed = field_dict.get('value', False)
                        new_value = c.STATUS_004_START_CONFIRMED if field == 'confirmstart' else c.STATUS_016_END_CONFIRMED
                        if new_confirmed:
                            new_status_sum = old_status_sum + new_value
                        else:
                            new_status_sum = old_status_sum - new_value
                        setattr(emplhour, field, new_status_sum)
                        is_updated = True
# ---   save changes in field 'status'
                    elif field in ('status'):
                        # field_dict[status]: {'value': 2, 'update': True}}
                        # PR2019-07-17 status is stored as sum of status
                        new_status = field_dict.get('value', 0)
                        old_status_sum = getattr(emplhour, field, 0)
                        if 'remove' in field_dict:
                            new_status_sum = d.remove_status_from_statussum(new_status, old_status_sum)
                        else:
                            new_status_sum = d.add_status_to_statussum(new_status, old_status_sum)
                        if new_status_sum != old_status_sum:
                            setattr(emplhour, field, new_status_sum)
                            is_updated = True
# ---   set save_changes = True if is_updated
                    if is_updated:
                        save_changes = True
# --- end of for loop ---

# --- recalculate timeduration and amount, addition, tax, wage
        #logger.debug('calculate working hours')
        if recalc_duration:
            #logger.debug(' --- recalc_duration --- ')
            # TODO skip absence hours when nohoursonweekend or nohoursonpublicholiday >>> NOT when changing hours???
            save_changes = True

            # - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(
                    rosterdate_dte=emplhour.rosterdate,
                    request=request)
            employee_pk = emplhour.employee.pk if emplhour.employee else None
            employee_wmpd = emplhour.employee.workminutesperday if emplhour.employee else None

            nohours_onsaturday, nohours_onsunday, nohours_onpublicholiday, nohours_oncompanyholiday = \
                get_nosat_sun_ph_ch_from_emplhour(emplhour)

            timestart, timeend, planned_durationNIU, time_duration, billing_duration, excel_dateNIU, excel_start, excel_end = \
                f.calc_timedur_plandur_from_offset(
                    rosterdate_dte=emplhour.rosterdate,
                    is_absence=is_absence, is_restshift=is_restshift, is_billable=is_billable,
                    is_sat=is_saturday, is_sun=is_sunday,
                    is_ph=is_publicholiday, is_ch=is_companyholiday,
                    row_offsetstart=emplhour.offsetstart, row_offsetend=emplhour.offsetend,
                    row_breakduration=emplhour.breakduration, row_timeduration=emplhour.timeduration,
                    row_nosat=nohours_onsaturday, row_nosun=nohours_onsunday,
                    row_noph=nohours_onpublicholiday, row_noch=nohours_oncompanyholiday,
                    row_employee_pk=employee_pk, row_employee_wmpd=employee_wmpd,
                    comp_timezone=comp_timezone)

            emplhour.timestart = timestart
            emplhour.timeend = timeend
            # dont change planned_duration
            emplhour.timeduration = time_duration
            emplhour.billingduration = billing_duration
            # dont change  'excel_date'
            emplhour.excelstart = excel_start
            emplhour.excelend = excel_end

    # get pricerate, additionrate, taxrate
            pricecode = f.get_pat_code_cascade('shift', 'pricecode', emplhour.orderhour, request)
            pricecode_pk = pricecode.pk if pricecode else None
            price_rate = f.get_pricerate_from_pricecodeitem(
                'pricecode', pricecode_pk, emplhour.rosterdate)

            additioncode = f.get_pat_code_cascade('shift', 'additioncode', emplhour.orderhour, request)
            additioncode_pk = additioncode.pk if additioncode else None
            addition_rate = f.get_pricerate_from_pricecodeitem(
                'additioncode', additioncode_pk, emplhour.rosterdate)

            taxcode = f.get_pat_code_cascade('shift', 'taxcode', emplhour.orderhour, request)
            taxcode_pk = taxcode.pk if taxcode else None
            tax_rate = f.get_pricerate_from_pricecodeitem(
                'taxcode', taxcode_pk, emplhour.rosterdate)

    # - calculate amount, addition and tax
            amount, addition, tax = f.calc_amount_addition_tax_rounded(
                billing_duration=emplhour.billingduration,
                is_absence=emplhour.orderhour.order.isabsence,
                is_restshift=emplhour.orderhour.isrestshift,
                price_rate=price_rate,
                addition_rate=addition_rate,
                tax_rate=tax_rate)

            emplhour.pricerate = price_rate
            emplhour.additionrate = addition_rate
            emplhour.taxrate = tax_rate

            emplhour.amount = amount
            emplhour.addition = addition
            emplhour.tax = tax

# - calculate amount, addition and tax
            # NOT IN USE YET
            #wage = f.calc_wage_rounded(time_duration, is_restshift, nopay, wagerate, wagefactor)

            # also recalculate datepart when start- and endtime are given # PR2020-03-23
            date_part = 0
            if emplhour.rosterdate and emplhour.timestart and emplhour.timeend:
                offset_start = f.get_offset_from_datetimelocal(emplhour.rosterdate, emplhour.timestart)
                offset_end = f.get_offset_from_datetimelocal(emplhour.rosterdate, emplhour.timeend)
                date_part = f.calc_datepart(offset_start, offset_end)
            setattr(emplhour, 'datepart', date_part)

# 6. save changes
        is_created = f.get_dict_value (upload_dict, ('id', 'create'), False)
        if save_changes or is_created:
            try:
# - save orderhour
                if save_orderhour:
                    orderhour = emplhour.orderhour
                    orderhour.save(request=request)
                # has_changed is only true when a field is updated that triggered the 'has_changed' icaon.
                # these fields are: 'employee', 'offsetstart', 'offsetend', 'breakduration', 'timeduration'
                # change 'order' is only possible in change_absence_shift
                if has_changed:
                    emplhour.haschanged = True
# - save emplhour
                emplhour.save(request=request, last_emplhour_updated=True)
                #logger.debug('emplhour.save timeduration: ' + str(emplhour.timeduration))
# - save to log after saving emplhour and orderhour, also when emplhour is_created
                m.save_to_emplhourlog(emplhour.pk, request, False) # is_deleted=False
            except:
                msg_err = _('An error occurred. This shift could not be updated.')
                error_list.append(msg_err)
# --- end of update_emplhour -----------------------

def get_nosat_sun_ph_ch_from_emplhour(emplhour): # PR20120-09-09
    #logger.debug(' --- get_nosat_sun_ph_ch_from_emplhour ---')
    # function gets nohours_onsaturday etc from order and scheme of this emplhour
    # absence nohours_onsaturday etc are stored in order, not in scheme
    nohours_onsaturday = False
    nohours_onsunday = False
    nohours_onpublicholiday = False
    nohours_oncompanyholiday = False
    if emplhour:
        nohours_onsaturday = emplhour.orderhour.order.nohoursonsaturday
        nohours_onsunday = emplhour.orderhour.order.nohoursonsunday
        nohours_onpublicholiday = emplhour.orderhour.order.nohoursonpublicholiday
        nohours_oncompanyholiday = emplhour.orderhour.order.nohoursoncompanyholiday

        # nopay and nosat etc in scheme are not in use (yet) PR2020-10-09
        schemeitem = emplhour.orderhour.schemeitem
        if False:  # to be replaced by: if schemeitem:
            scheme = schemeitem.scheme
            # nopay and nosat etc in scheme are not in use (yet) PR2020-10-09
            if scheme:
                # don't use nohoursonsunday = scheme.nohoursonsunday, because it will override order.nohoursonsunday
                # or do we want to let override order_nosat by scheme.nosat when false?
                # in that case it needs a null value and boolean cannot do.
                if scheme.nohoursonsaturday:
                    nohours_onsaturday = True
                if scheme.nohoursonsunday:
                    nohours_onsunday = True
                if scheme.nohoursonpublicholiday:
                    nohours_onpublicholiday = True
                if scheme.nohoursoncompanyholiday:
                    nohours_oncompanyholiday = True

    return nohours_onsaturday, nohours_onsunday, nohours_onpublicholiday, nohours_oncompanyholiday

def recalc_orderhourXXX(orderhour): # PR2019-10-11
    #logger.debug(' --- recalc_orderhour ---')
    #logger.debug('orderhour: ' + str(orderhour))

# is orderhou billable?
# PR20202-02-15 NOT IN USE, but let it stay for the code (for now)

    if orderhour:
        # get timeduration from emplhour is isbillable, skip when isrestshift
        # fieldname in emplhour is timeduration, fieldname in orderhour is duration,
        #logger.debug('orderhour.isrestshift: ' + str(orderhour.isrestshift))

        duration_sum = 0
        amount_sum = 0
        if not orderhour.isrestshift:
            emplhours = m.Emplhour.objects.filter(orderhour_id=orderhour.pk)
            # orderhour can have multiple emplhours, count sum of timeduration and claculated amount
            has_employee_pricerate = False
            if emplhours:
                for emplhour in emplhours:
                    #logger.debug('---- emplhour: ' + str(emplhour.pk))
                    this_timeduration = 0
                    this_pricerate = 0
                    this_amount = 0

                    if emplhour.timeduration:
                        this_timeduration = emplhour.timeduration
                        duration_sum += this_timeduration

                    # emplhour.pricerate can be zero, don't use if emplhour.pricerate:
                    if emplhour.pricerate is not None:
                        this_pricerate = emplhour.pricerate
                        has_employee_pricerate = True
                    elif orderhour.pricerate:
                        this_pricerate = orderhour.pricerate

                    if this_pricerate:
                        this_amount = (this_timeduration / 60) * (this_pricerate)
                        amount_sum += this_amount

                    #logger.debug('this_timeduration: ' + str(this_timeduration))
                    #logger.debug('this_pricerate: ' + str(this_pricerate))
                    #logger.debug('this_amount: ' + str(this_amount))
            #logger.debug('duration_sum: ' + str(duration_sum))
            #logger.debug('amount_sum: ' + str(amount_sum))
            #logger.debug('has_employee_pricerate: ' + str(has_employee_pricerate))
            #logger.debug('orderhour.isbillable: ' + str(orderhour.isbillable))

            if orderhour.isbillable:
                # use emplhour timeduration when isbillable
                #logger.debug('orderhour.isbillable: ' + str(orderhour.isbillable))
                orderhour.duration = duration_sum
                # use emplhour pricerate, except when none of the emplhour records has emplhour.pricerate
                if has_employee_pricerate:
                    orderhour.amount = amount_sum
                else:
                    orderhour.amount = (duration_sum / 60) * (orderhour.pricerate)
                #logger.debug('isbillable duration_sum: ' + str(duration_sum))
                #logger.debug('isbillable orderhour.duration: ' + str(orderhour.duration))
                #logger.debug('isbillable orderhour.amount: ' + str(orderhour.amount))
            else:
                # if not billable calculate average price and multiply with orderhour.duration
                if has_employee_pricerate:
                    amount = 0
                    if duration_sum:
                        amount = (orderhour.duration) * (amount_sum / duration_sum)
                    orderhour.amount = amount
                #logger.debug('else orderhour.amount: ' + str(orderhour.amount))

# get pricerate from emplhour if it has value
        orderhour.tax = orderhour.amount * orderhour.taxrate / 10000  # taxrate 600 = 6%

        #logger.debug('orderhour.tax: ' + str(orderhour.tax))
        orderhour.save()
        #logger.debug('>>>>>>>>>> orderhour.duration: ' + str(orderhour.duration))


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def update_scheme(instance, upload_dict, update_dict, request):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    #logger.debug('   ')
    #logger.debug(' ============= update_scheme')
    #logger.debug('upload_dict: ' + str(upload_dict))

    # FIELDS_SCHEME = ('id', 'order', 'cat', 'isabsence', 'issingleshift', 'isdefaultweekshift', 'istemplate',
    #                  'code', 'datefirst', 'datelast',
    #                  'cycle', 'billable', 'excludecompanyholiday', 'excludepublicholiday', 'divergentonpublicholiday',
    #                  'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday',
    #                  'pricecode', 'additioncode', 'taxcode', 'inactive')

    save_changes = False
    delete_onph_rows = False
    if instance:
        table = 'scheme'
        for field in c.FIELDS_SCHEME:
            # --- get field_dict from  item_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
# a. get new_value
                    new_value = field_dict.get('value')
# 2. save changes in field 'code'
                    if field in ['code']:
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:
                            # TODO code can have inactive duplicates
                            has_error = False  # v.validate_code_name_identifier(table, field, new_value, False, parent, update_dict, {}, request,  this_pk=None)
                            if not has_error:
                                setattr(instance, field, new_value)
                                is_updated = True
# 3. save changes in fields 'cat'
                    elif field in ['cat']:
                        if not new_value:
                            new_value = 0
                        saved_value = getattr(instance, field, 0)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 3. save changes in field 'billable'
                    elif field in ['billable']:
                        is_override = field_dict.get('override', False)
                        is_billable = field_dict.get('billable', False)
                       #logger.debug('is_override: ' + str(is_override))
                       #logger.debug('is_billable: ' + str(is_billable))
                        new_value = 0
                        if is_override:
                            new_value = 2 if is_billable else 1
                       #logger.debug('new_value: ' + str(new_value))
                        saved_value = getattr(instance, field, 0)
                       #logger.debug('saved_value: ' + str(saved_value))

                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 4. save changes in fields 'priceratejson'
                    elif field in ['priceratejson']:
                        pass
                        # TODO save pricerate with date and wagefactor
                        # was: pricerate_is_updated = f.save_pricerate_to_instance(instance, rosterdate, wagefactor, new_value, update_dict, field)
                        #if pricerate_is_updated:
                        #    is_updated = True

# 3. save changes in field 'cycle'
                    elif field == 'cycle':
                        #logger.debug('field: ' + str(field))
                        # when no cycle : make cycle 32.767  max value of PositiveSmallIntegerField is 32.767
                        if not new_value:
                            new_value = 32767
                        new_cycle = int(new_value)
                        saved_value = getattr(instance, field)
                        #logger.debug('new_cycle: ' + str(new_cycle))
                        #logger.debug('saved_value: ' + str(saved_value))
                        if new_cycle != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True
# 4. save changes in date fields
                    elif field in ['datefirst', 'datelast']:
                        # a. get new_date
                        new_date, msg_err = f.get_date_from_ISOstring(new_value, False)  # False = blank_allowed
                        # b. validate value
                        if msg_err:
                            has_error = True
                            if update_dict:
                                update_dict[field]['error'] = msg_err
                        else:
                            # c. save field if changed and no_error
                            old_date = getattr(instance, field)
                            if new_date != old_date:
                                setattr(instance, field, new_date)
                                is_updated = True
# 4. save changes in field 'inactive'
                    # fields: 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday' are only used in absence
                    elif field in ('excludepublicholiday', 'excludecompanyholiday', 'divergentonpublicholiday', 'inactive'):
                        new_value = field_dict.get('value', False)
                        saved_value = getattr(instance, field)

                        #logger.debug('field: ' + str(field) + ' new_value: ' + str(new_value) + ' saved_value: ' + str(saved_value))
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True
                            delete_onph_rows = field == 'divergentonpublicholiday' and not new_value
# 4. add 'updated' to field_dict'
                    if is_updated:
                        save_changes = True
                        if update_dict:
                            update_dict[field]['updated'] = True
                            #logger.debug('updated: ' + str(True))

# 5. save changes
        if save_changes:
            try:
                instance.save(request=request)
                #logger.debug('instance field: ' + str(getattr(instance, field)))
            except:
                save_changes = False
                msg_err = _('This scheme could not be updated.')
                if update_dict:
                    update_dict['id']['error'] = msg_err
                #logger.debug('msg_err: ' + str(msg_err))

# 5. when 'divergentonpublicholiday' is changed from truw to false
    # the existing 'onpublicholiday' schemitems must be deleted PR2020-05-07
            if instance and save_changes and delete_onph_rows:
                m.Schemeitem.objects.filter(scheme=instance, onpublicholiday=True).delete()

   #logger.debug('scheme changes have been saved: ' + str(save_changes))

    return save_changes


#######################################################
def update_schemeitem_instance(instance, upload_dict, update_dict, request):
    # --- update field with 'update' in it + calcutated fields in existing and new instance PR2019-07-22
    # add new values to update_dict (don't reset update_dict, it has values)
   #logger.debug(' ---------- update_schemeitem_instance ---------- ')
   #logger.debug('upload_dict: ' + str(upload_dict))

    # FIELDS_SCHEMEITEM = ('id', 'scheme', 'shift', 'team','rosterdate',
    #                      'cat', 'onpublicholiday', 'isabsence', 'issingleshift', 'istemplate', 'inactive')

    if instance:
        save_changes = False
        for field in c.FIELDS_SCHEMEITEM:
            # --- get field_dict from  item_dict  if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                # new schemeitem saves also scheme, rosterdate and shift.
                # when creating schemeitem rosterdate and shift dont need 'update' in upload_dict
                if 'update' in field_dict:
                    is_updated = False
# 1. get new_value
                    new_value = field_dict.get('value')
                   #logger.debug('............field: ' + str(field))
                   #logger.debug('............field_dict: ' + str(field_dict))
                   #logger.debug('new_value: ' + str(new_value))

# 2. skip changes in field 'rosterdate'
                    if field == 'rosterdate':
                        pass
                        #new_date, msg_err = f.get_date_from_ISOstring(new_value, True)  # True = blank_not_allowed
                        #if msg_err :
                        #    update_dict[field]['error'] = msg_err
                        #else:
                        #    saved_date = getattr(instance, field)
                        #    if new_date != saved_date:
                        #        setattr(instance, field, new_date)
                        #        recalc = True

# 3. save changes in fields 'cat'
                    # not in use, maybe we need it some other time
                    elif field in ['cat']:
                        pass
                        #if not new_value:
                        #    new_value = 0
                        #saved_value = getattr(instance, field, 0)
                        #if new_value != saved_value:
                        #    setattr(instance, field, new_value)
                        #    is_updated = True

# 4. save changes in field 'shift'
                    elif field == 'shift':
    # a. get new value
                        new_shift_pk = int(field_dict.get('pk', 0))
                        # TODO put shift_pk in id pk in all cases
                        # in scheme page, grid shift_pk is stored in id pk PR2020-05-03
                        if not new_shift_pk:
                            new_shift_pk = f.get_dict_value(field_dict, ('id', 'pk'), 0)
                       #logger.debug('new_shift_pk: ' + str(new_shift_pk))

    # b. remove shift from schemeitem when new_shift_pk is None
                        if not new_shift_pk:
                            msg_err = _('Shift cannot be blank.')
                            update_dict[field]['error'] = msg_err
                           #logger.debug('msg_err: ' + str(msg_err))

                        else:
    # c. check if shift exists
                            new_shift = m.Shift.objects.get_or_none(pk=new_shift_pk, scheme=instance.scheme)
                           #logger.debug('new_shift: ' + str(new_shift))
                            if new_shift is None:
                                msg_err = _('Shift cannot be blank.')
                                update_dict['id']['error'] = msg_err
                               #logger.debug('msg_err: ' + str(msg_err))
                            else:
                                saved_shift = instance.shift
                                if new_shift != saved_shift:
                                    setattr(instance, field, new_shift)
                                    is_updated = True

# 5. save changes in field 'team'
                    elif field == 'team':
    # a. get new pk
                        new_team_pk = f.get_dict_value(field_dict, ('pk',), 0)
                        # this gives error 'Nonetype : new_team_pk = int(field_dict.get('pk', 0))
                        # TODO put team_pk in id pk in all cases
                        # in scheme page, grid shift_pk is stored in id pk PR2020-05-03
                        if not new_team_pk:
                            new_team_pk = f.get_dict_value(field_dict, ('id', 'pk'), 0)
                       #logger.debug('new_team_pk: ' + str(new_team_pk))
    # b. remove team from schemeitem when pk is None
                        if not new_team_pk:
                            setattr(instance, field, None)
                            is_updated = True
                        else:
    # c. check if team exists
                            team = m.Team.objects.get_or_none( id=new_team_pk, scheme=instance.scheme)
                           #logger.debug('team: ' + str(team))
    # d. upate team in schemeitem
                            if team is None:
                                msg_err = _('This field could not be updated.')
                                update_dict[field]['error'] = msg_err
                            else:
                                setattr(instance, field, team)
                                is_updated = True

# 6. cannot save changes in field 'onpublicholiday'
                    elif field == 'onpublicholiday':
                        pass

# 6. save changes in field 'inactive'
                    elif field == 'inactive':
                        saved_value = getattr(instance, field, False)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 7. add 'updated' to field_dict'
                    if is_updated:
                        update_dict[field]['updated'] = True
                        save_changes = True

       #logger.debug('................update_dict: ' + str(update_dict))
# 8. save changes
        if save_changes:
            try:
                instance.save(request=request)
# 9. add 'updated' to id_dict, only if no create or delete exist'
                if 'created' not in update_dict['id'] and 'deleted' not in update_dict['id']:
                    update_dict['id']['updated'] = True
               #logger.debug('---------- update_dict: ' + str(update_dict))
            except:
                msg_err = _('This item could not be updated.')
                if 'id' not in update_dict:
                    update_dict['id'] = {}
                update_dict['id']['error'] = msg_err

# NOT IN USE
def get_rangemin_rangemaxXXX (upload_dict, request):  # PR2019-08-19
    rangemin = None
    rangemax = None

    period_dict = {}
    if 'period' in upload_dict:  # PR2019-07-09
        # period': {'period': 12, 'interval': 6, 'overlap': 0, 'auto': True}}

# get saved period_dict
        period_dict = d.get_period_from_settings(request)

# get today_midnight_local_iso
        comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# get today_midnight_local_iso
        today_utc = d.get_datetime_utc(datetime.utcnow())
        today_midnight_local = d.get_rosterdate_midnight_local(today_utc, comp_timezone)
        #logger.debug('today_midnight_local: ' + str(today_midnight_local) + str(type(today_midnight_local)))
        # today_midnight_local_iso = today_midnight_local.isoformat()
        #logger.debug('today_midnight_local_iso: ' + str(today_midnight_local_iso) + str( type(today_midnight_local_iso)))

# get now in utc
        now_dt = datetime.utcnow()
        #logger.debug('now_dt: ' + str(now_dt) + ' type: ' + str(type(now_dt)))
        # now_dt: 2019-07-10 14:48:15.742546 type: <class 'datetime.datetime'>
        now_utc = now_dt.replace(tzinfo=pytz.utc)  # NOTE: it works only with a fixed utc offset
        #logger.debug('now_utc: ' + str(now_utc) + ' type: ' + str(type(now_utc)))
        # now_utc: 2019-07-10 14:48:15.742546+00:00 type: <class 'datetime.datetime'>

# convert now to local
        # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
        # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
        timezone = pytz.timezone(comp_timezone)
        now_local = now_utc.astimezone(timezone)
        #logger.debug('now_local: ' + str(now_local) + str(type(now_local)))
        # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

# split now_local
        year_int, month_int, date_int, hour_int, minute_int = d.split_datetime(now_local)
        #logger.debug('now_local_arr: ' + str(year_int) + ';' + str(month_int) + ';' + str(date_int) + ';' + str(hour_int) + ';' + str(minute_int))
        # now_local_arr: 2019;7;10;16

# get interval
        interval = int(period_dict['interval'])
        interval_index = int(hour_int / interval)
        #logger.debug('xxx interval: ' + str(interval) + ' interval_index: ' + str(interval_index))

# get local start time of current interval
        interval_starthour = interval * interval_index
        #logger.debug('interval_starthour: ' + str(interval_starthour))
        interval_start_local = today_midnight_local + timedelta(hours=interval_starthour)
        #logger.debug('interval_start_local: ' + str(interval_start_local) + str(type(interval_start_local)))

        interval_end_local = interval_start_local + timedelta(hours=interval)
        #logger.debug('interval: ' + str(interval) + ' interval_end_local: ' + str(interval_end_local))

# get local start time of current interval with overlap
        overlap = int(period_dict['overlap'])
        overlap_start = -overlap
        overlap_start_local = interval_start_local + timedelta(hours=overlap_start)
        #logger.debug('overlap_start: ' + str(overlap_start) +  ' overlap_start_local: ' + str(overlap_start_local))

        utc = pytz.UTC
        overlap_start_utc = overlap_start_local.astimezone(utc)
        #logger.debug('mmmm  overlap_start_utc: ' + str(overlap_start_utc))

        # get local end time of current interval with overlap
        overlap_end_local = interval_end_local + timedelta(hours=overlap)
        #logger.debug(  'overlap: ' + str(overlap) + ' overlap_end_local: ' + str(overlap_end_local))

        overlap_end_utc = overlap_end_local.astimezone(utc)
        #logger.debug('mmmm  overlap_end_utc: ' + str(overlap_end_utc))

# get starthour of current interval
        # from https://riptutorial.com/python/example/4540/constructing-timezone-aware-datetimes

        # get local end time of current interval with
        # range = period_dict['range']
        # year_add, month_add, date_add, hour_add = d.get_range(range)
        #logger.debug('range: ' + str(range))
        #logger.debug(str(year_add) + ' ; ' + str(month_add) + ' ; ' + str(date_add) + ' ; ' + str(hour_add))

# convert now to local
        # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
        # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
        timezone = pytz.timezone(comp_timezone)
        #logger.debug('timezone: ' + str(timezone) + str(type(timezone)))

        # convert starthour to utc
        # get endhour of current interval with offset
        range = int(period_dict['range'])
        year_int, month_int, date_int, hour_int = d.get_range(range)
        interval_endhour_offset = interval_starthour + range

        rangemin = f.get_datetime_UTC_from_ISOstring(period_dict['datetimestart'])

        # rangemin: 2019-07-09T00:00:00+02:00 type: <class 'str'>
        # rangemin: 2019-07-09 00:00:00+00:00 type: <class 'datetime.datetime'>
        #logger.debug('rangemin: ' + str(rangemin) + ' type: ' + str(type(rangemin)))

        rangemin_arr = f.get_datetimearray_from_ISOstring(period_dict['datetimestart'])
        year_int = int(rangemin_arr[0])
        month_int = int(rangemin_arr[1])
        date_int = int(rangemin_arr[2])
        hour_int = int(rangemin_arr[3])
        #logger.debug(str(year_int) + ' ; ' + str(month_int) + ' ; ' + str(date_int) + ' ; ' + str(hour_int))

        arr = period_dict['range'].split(';')
        year_add = int(arr[0])
        month_add = int(arr[1])
        date_add = int(arr[2])
        hour_add = int(arr[3])
        if year_add:
            year_int = year_int + year_add
        if month_add:
            month_int = month_int + month_add
        if date_add:
            date_int = date_int + date_add
        if hour_add:
            hour_int = hour_int + hour_add
        rangemax = datetime(year_int, month_int, date_int, hour_int)
        #logger.debug('rangemax: ' + str(rangemax) + ' type: ' + str(type(rangemax)))
        # rangemax: 2019-07-16 00:00:00 type: <class 'datetime.datetime'>
        # rangemax_utc = rangemax.astimezone(pytz.UTC)
        # #logger.debug('rangemax_utc: ' + str(rangemax_utc) + ' type: ' + str(type(rangemax_utc)))
        # rangemax_utc: 2019-07-16 04:00:00+00:00 type: <class 'datetime.datetime'>
    return rangemin, rangemax, period_dict


# <<<<<<<<<< recalculate timeduration >>>>>>>>>>>>>>>>>>>
def calc_schemeitem_timedurationXXX(schemeitem, update_dict, comp_timezone):
    #logger.debug('------------------ calc_schemeitem_timeduration --------------------------')
    # called by SchemeitemFillView, update_schemeitem_instance and update_shift_instance > recalc_schemeitems
    offsetstart = 0
    offsetend = 0
    breakduration = 0
    is_restshift = False
    msg_err = None

# a. check if shift exists
    shift = schemeitem.shift
    if shift is None:
        msg_err = _('Shift is blank. Time cannot be calculated.')
    else:
# b. get offsetstart of this shift
        offsetstart = getattr(shift, 'offsetstart', 0)
# c. get offsetend of this shift
        offsetend = getattr(shift, 'offsetend')
# d. get breakduration of this shift
        breakduration = getattr(shift, 'breakduration', 0)
# e. get is_restshift of this shift
        is_restshift = getattr(shift, 'isrestshift', False)

    #logger.debug('offsetstart :' + str(offsetstart) + ' offsetend :' + str(offsetend))

# f. if error: set 'timestart', 'timeend' to None, 'timeduration' to 0
    if msg_err:
        # when called by SchemeitemFillView, update_dict is blank
        if update_dict:
            if 'timestart' in update_dict:
                update_dict['timestart']['error'] = msg_err
        setattr(schemeitem, 'timeduration', 0)
        for fld in ('timestart', 'timeend'):
            setattr(schemeitem, fld, None)
    else:

# calculate field 'timestart' 'timeend', based on field rosterdate and offset, also when rosterdate_has_changed
# TOD replace by calc_timestart_time_end_from_offset

# a. convert stored date_obj 'rosterdate' '2019-08-09' to datetime object 'rosterdatetime_naive'
        rosterdatetime_naive = f.get_datetime_naive_from_dateobject(schemeitem.rosterdate)
        # #logger.debug(' schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
            # schemeitem.rosterdate: 2019-11-21 <class 'datetime.date'>
        # #logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))
            # rosterdatetime_naive: 2019-11-21 00:00:00 <class 'datetime.datetime'>

# b. get starttime from rosterdate and offsetstart
        new_starttime = f.get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetstart,
            comp_timezone=comp_timezone)
        # #logger.debug(' new_starttime: ' + str(new_starttime) + ' ' + str(type(new_starttime)))
        # must be stored als utc??
        # No, tzinfo is mot stored in database, therefore both local and utc are stored as the same datetime
        setattr(schemeitem, 'timestart', new_starttime)
        # #logger.debug('saved timestart: ' + str(getattr(schemeitem, 'timestart')))

# c. get endtime from rosterdate and offsetstart
        # #logger.debug('c. get endtime from rosterdate and offsetstart ')
        new_endtime = f.get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetend,
            comp_timezone=comp_timezone)
        # #logger.debug(' new_endtime: ' + str(new_endtime) + ' ' + str(type(new_endtime)))

        # must be stored als utc??
        # No, tzinfo is mot stored in database, therefore both local and utc are stored as the same datetime
        setattr(schemeitem, 'timeend', new_endtime)
        # #logger.debug(' saved timeend: ' + str(getattr(schemeitem, 'timeend')))

# e. recalculate timeduration
        fieldname = 'timeduration'
        if schemeitem.timestart and schemeitem.timeend:
            datediff = schemeitem.timeend - schemeitem.timestart
            datediff_minutes = int((datediff.total_seconds() / 60))
            new_value = int(datediff_minutes - breakduration)

 # when rest shift : timeduration = 0     # cst = 0 = normal, 1 = rest
            if is_restshift:
                new_value = 0

            if fieldname not in update_dict:
                update_dict[fieldname] = {}
            setattr(schemeitem, fieldname, new_value)
            update_dict[fieldname]['updated'] = True

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_shift_instance(parent, upload_dict, update_dict, request):
    # --- create shift # PR2019-08-08 PR2020-03-16
    shift = None
    if parent:
# 1. Get value of 'code'
        code = None
        code_dict = upload_dict.get('code')
        if code_dict:
            code = code_dict.get('value')
        if code:
# 2. validate code
            msg_err = validate_code_name_identifier('shift', 'code', code, False, parent, update_dict, {}, request)
            if not msg_err:
# 4. create and save shift
                try:
                    shift = m.Shift(
                        scheme=parent,
                        code=code,
                        istemplate=parent.istemplate
                    )
                    shift.save(request=request)
                except:
# 5. return msg_err when shift not created
                    msg_err = _('This shift could not be created.')
                    update_dict['code']['error'] = msg_err
                else:
# 6. put info in update_dict
                    update_dict['id']['created'] = True
    return shift

def update_shift_instance(instance, parent, upload_dict, update_dict, user_lang, request):
    # --- update existing and new shift PR2019-09-08 PR2020-03-16
    #  add new values to update_dict (don't reset update_dict, it has values)
    #logger.debug(' ---------- update_shift_instance ---------- ')
    #logger.debug('upload_dict: ' + str(upload_dict))

    # FIELDS_SHIFT = ('id', 'scheme', 'code', 'cat', 'isrestshift', 'istemplate', 'billable',
    #                 'offsetstart', 'offsetend', 'breakduration', 'timeduration',
    #                 'wagefactorcode', 'pricecode', 'additioncode', 'taxcode')

    if instance:
        save_changes = False
        for field in c.FIELDS_SHIFT:
            # --- get field_dict from item_dict if it exists
            field_dict = upload_dict[field] if field in upload_dict else {}
            if field_dict:
                if 'update' in field_dict:
                    is_updated = False
# 1. get new_value
                    new_value = field_dict.get('value')

# 2. save changes in field 'code'
                    if field == 'code':
                        saved_value = getattr(instance, field)
                        # field 'code' is required
                        if new_value != saved_value:
            # a. validate code
                            #  validate_code_name_identifier add mes_err to update_dict
                            msg_err = validate_code_name_identifier(
                                table='shift',
                                field=field,
                                new_value=new_value,
                                is_absence=False,
                                parent=parent,
                                update_dict=update_dict,
                                msg_dict={},
                                request=request,
                                this_pk=instance.pk)
                            if not msg_err:
             # b. save field if changed and no_error
                                setattr(instance, field, new_value)
                                is_updated = True
# 3. save changes in fields 'cat'
                    # not in use, maybe we need it some other time
                    elif field in ['cat']:
                        pass
                        #if not new_value:
                        #    new_value = 0
                        #saved_value = getattr(instance, field, 0)
                        #if new_value != saved_value:
                        #    setattr(instance, field, new_value)
                        #    is_updated = True

# 4. save changes in field 'billable'
                    elif field in ['billable']:
                        # TODO check if correct
                        is_override = field_dict.get('override', False)
                        is_billable = field_dict.get('billable', False)
                        #logger.debug('is_override: ' + str(is_override))
                        #logger.debug('is_billable: ' + str(is_billable))
                        new_value = 0
                        if is_override:
                            new_value = 2 if is_billable else 1
                        #logger.debug('new_value: ' + str(new_value))
                        saved_value = getattr(instance, field, 0)
                        #logger.debug('saved_value: ' + str(saved_value))

                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 5. save changes in field 'isrestshift'
                    elif field in ['isrestshift']:
                        new_value = field_dict.get('value', False)
                        saved_value = getattr(instance, field, False)
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# 6. save changes in fields 'offsetstart', 'offsetend',
                    elif field in ('offsetstart', 'offsetend'):
                        saved_value = getattr(instance, field)
                        if new_value != saved_value:  # (None != 0)=True (None != None)=False
        # a. save field if changed and no_error
                            setattr(instance, field, new_value)
                            is_updated = True
        # b. set min or max in other field
                            if field == 'offsetstart':
                                offsetend_minvalue = 0
                                if new_value and new_value > 0:
                                    offsetend_minvalue = new_value
                                if update_dict:
                                    update_dict['offsetend']['minvalue'] = offsetend_minvalue
                            elif field == 'offsetend':
                                offsetstart_maxvalue =  1440
                                if new_value and new_value < 1440:
                                    offsetstart_maxvalue = new_value
                                if update_dict:
                                    update_dict['offsetstart']['maxvalue'] = offsetstart_maxvalue

# 7. save changes in fields  'breakduration', 'timeduration'
                    elif field in ('breakduration', 'timeduration'):
                        #logger.debug('field: ' + str(field))
                        new_value = field_dict.get('value', 0)
                        #logger.debug('new_value: ' + str(new_value))
                        saved_value = getattr(instance, field, 0)
                        #logger.debug('saved_value: ' + str(saved_value))
                        if new_value != saved_value:
                            setattr(instance, field, new_value)
                            is_updated = True

# TODO save changes in fields 'wagefactorcode', 'pricecode', 'additioncode', 'taxcode'

# 8. add 'updated' to field_dict'
                    if is_updated:
                        update_dict[field]['updated'] = True
                        save_changes = True

# 9. save changes
        if save_changes:
            try:
                instance.save(request=request)
# 10. add 'updated' to id_dict, only if no create or delete exist'
                if 'created' not in update_dict['id'] and 'deleted' not in update_dict['id']:
                    update_dict['id']['updated'] = True
                #logger.debug('---------- update_dict: ' + str(update_dict))
            except:
                msg_err = _('This shift could not be updated.')
                if 'id' not in update_dict:
                    update_dict['id'] = {}
                    update_dict['id']['error'] = msg_err


def recalc_schemeitemsXXX(instance, request, comp_timezone):
    if instance:
        schemeitems = m.Schemeitem.objects.filter(shift=instance, scheme__order__customer__company=request.user.company)
        for schemeitem in schemeitems:
            update_dict = {}

            #calc_schemeitem_timeduration(schemeitem, update_dict, comp_timezone)
            schemeitem.save(request=request)


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def create_scheme(parent, upload_dict, update_dict, request):
    # --- create scheme # PR2019-07-21
    # Note: all keys in update_dict must exist by running create_update_dict first
    #logger.debug(' --- create_scheme')
    #logger.debug(upload_dict)
    instance = None
    if parent:
# - Get value of 'code' (Scheme has no field 'name')
        code = None
        code_dict = upload_dict.get('code')
        if code_dict:
            code = code_dict.get('value')
# - validate code
        msg_err = validate_code_name_identifier('scheme', 'code', code, False, parent, update_dict, {}, request)
        if not msg_err:
            instance = m.Scheme(order=parent, code=code)
            instance.save(request=request)
# - return msg_err when instance not created
    if instance is None:
        update_dict['id']['error'] = _('This scheme could not be created.')
    else:
# - put info in update_dict
        update_dict['id']['created'] = True
    return instance


def create_schemeitem_instance (parent, upload_dict, update_dict, request):
    #logger.debug(' --- create_schemeitem_instance')
    # --- create schemeitem # PR2019-07-22 PR2020-03-15
    instance = None
    if parent:
# 1. get value of 'rosterdate' - required, but not on_ph
        # when onpublicholiday: add today's date as rosterdate. Will not be used, but is required
        on_publicholiday = f.get_dict_value(upload_dict, ('onpublicholiday', 'value'), False)
        new_value = f.get_dict_value(upload_dict, ('rosterdate', 'value'))
        #logger.debug('new_value: ' + str(new_value))
        # When creating public holiday new_value = "onph' and get_date_from_ISO returns None PR2020-05-04
        # was: rosterdate, msg_err = f.get_date_from_ISOstring(new_value, True)  # True = blank not allowed
        rosterdate = f.get_date_from_ISO(new_value)
        #logger.debug('rosterdate: ' + str(rosterdate))
# 2. get value of 'shift' - required
        # TODO put shift.pk in id pk in all cases
        shift_pk = f.get_dict_value(upload_dict, ('shift','pk'))# from scheme.js Grid_SchemitemClicked PR20202-05-04
        if not shift_pk:
            shift_pk = f.get_dict_value(upload_dict, ('shift', 'id', 'pk'))
        shift = m.Shift.objects.get_or_none(id=shift_pk, scheme=parent)
        #logger.debug('shift_pk: ' + str(shift_pk))
        #logger.debug('shift: ' + str(shift))
# 3. create schemeitem
        if rosterdate or on_publicholiday:
            if shift:
                instance = m.Schemeitem(
                    scheme=parent,
                    rosterdate=rosterdate,
                    shift=shift,
                    onpublicholiday=on_publicholiday,
                    isabsence=parent.isabsence,
                    issingleshift = parent.issingleshift,
                    istemplate=parent.istemplate
                )
                instance.save(request=request)
# 4. return msg_err when instance not created
    if instance is None:
        update_dict['id']['error'] = _('This shift could not be created.')
    else:
# 5. put info in update_dict
        update_dict['id']['created'] = True
        # pk will be added later
    return instance

def update_schemeitem_rosterdate(schemeitem, new_rosterdate_dte, comp_timezone):  # PR2019-07-31
    # update the rosterdate of a schemeitem when it is outside the current cycle,
    # it will be replaced  with a rosterdate that falls within within the current cycle, by adding n x cycle days
    # the timestart and timeend will also be updates
    #logger.debug(' --- update_schemeitem_rosterdate new_rosterdate_dte --- ')
    #logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))

    # the curent cycle has index 0. It starts with new_rosterdate and ends with new_rosterdate + cycle -1

    if schemeitem and new_rosterdate_dte:
        # new_rosterdate_naive = f.get_datetime_naive_from_dateobject(new_rosterdate_dte)
        new_si_rosterdate_naive = schemeitem.get_rosterdate_within_cycle(new_rosterdate_dte)
        #logger.debug(' new_rosterdate_naive: ' + str(new_rosterdate_naive) + ' ' + str(type(new_rosterdate_naive)))
        # new_rosterdate_naive: 2019-08-27 00:00:00 <class 'datetime.datetime'>
        #logger.debug(' new_si_rosterdate_naive: ' + str(new_si_rosterdate_naive) + ' ' + str(type(new_si_rosterdate_naive)))
        # new_si_rosterdate_naive: 2019-08-29 00:00:00 <class 'datetime.datetime'>

        if new_si_rosterdate_naive:
            # save new_si_rosterdate
            #logger.debug('old si_rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
            # old si_rosterdate: 2019-08-29 <class 'datetime.date'>
            schemeitem.rosterdate = new_si_rosterdate_naive
            #logger.debug('new_si_rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
            # new_si_rosterdate: 2019-07-27 <class 'datetime.date'>

            # convert to dattime object
            new_si_rosterdatetime = f.get_datetime_naive_from_dateobject(new_si_rosterdate_naive)

            # get new_schemeitem.time_start and new_schemeitem.time_end
            new_timestart = None
            new_timeend = None
            breakduration = 0
            if new_si_rosterdatetime:
                shift = schemeitem.shift
                if shift:
                    offsetstart = getattr(shift, 'offsetstart', 0 )
                    new_timestart = f.get_datetimelocal_from_offset(
                        rosterdate=new_si_rosterdatetime,
                        offset_int=offsetstart,
                        comp_timezone=comp_timezone)

                    offsetend = getattr(shift, 'offsetend', 0)
                    new_timeend = f.get_datetimelocal_from_offset(
                        rosterdate=new_si_rosterdatetime,
                        offset_int=offsetend,
                        comp_timezone=comp_timezone)

                    breakduration = getattr(shift, 'breakduration', 0)

            schemeitem.timestart = new_timestart
            schemeitem.timeend = new_timeend
            #logger.debug('new_timeend: ' + str(new_timeend) + ' ' + str(type(new_timeend)))

            # get new_schemeitem.timeduration
            new_timeduration = 0
            if new_timestart and new_timeend:
                new_timeduration = f.get_timeduration(
                    timestart=new_timestart,
                    timeend=new_timeend,
                    breakduration=breakduration)
            schemeitem.timeduration = new_timeduration

            #logger.debug('new_timeduration: ' + str(new_timeduration) + ' ' + str(type(new_timeduration)))
            # save without (request=request) keeps modifiedby and modifieddate
            schemeitem.save()
            #logger.debug('schemeitem.saved rosterdate: ' + str(schemeitem.rosterdate))


def update_paydates_in_paydatecode(rosterdate_dte, paydatecode_pk, request):  # PR2020-06-19 PR2020-09-27
    # update the paydates of all paydatecodes to the nearest date from this rosterdate_dte
    # only called by FillRosterdate
    #logger.debug(' --- update_paydatecode new_rosterdate_dte --- ')
    #logger.debug('new_rosterdate_dte: ' + str(rosterdate_dte) + ' ' + f.format_WDMY_from_dte(rosterdate_dte, 'nl'))

    crit = Q(company=request.user.company)
    if paydatecode_pk is not None:
        crit.add(Q(pk=paydatecode_pk), crit.connector)

    paydatecodes = m.Paydatecode.objects.filter(crit)
    for paydatecode in paydatecodes:
        firstdate_of_period_dte, new_paydate_dte = recalc_paydate(rosterdate_dte, paydatecode)
        paydatecode.datelast = new_paydate_dte
        paydatecode.datefirst = firstdate_of_period_dte
        # save without (request=request) keeps modifiedby and modifieddate
        paydatecode.save()


def recalc_paydate(rosterdate_dte, paydatecode):  # PR2020-06-22
    # function update the paydates of all paydatecodes to the nearest date from rosterdate_dte
    # called by update_paydates_in_paydatecode, create_paydateitems_inuse_list, recalc_paydate_in_emplhours
    #logger.debug(' ------ recalculate_paydate --- ')
    #logger.debug('............ paydatecode: ' + str(paydatecode))
    #logger.debug('............ new_rosterdate_dte: ' + str(rosterdate_dte) + ' ' + f.format_WDMY_from_dte(rosterdate_dte, 'nl'))
    new_paydate_dte = None
    firstdate_of_period = None

    if paydatecode:
        recurrence = paydatecode.recurrence
        referencedate_dte = paydatecode.referencedate
        paydate_dayofmonth = paydatecode.dayofmonth
    else:
        # if paydatecode = None: use montly, 31 as paydate
        recurrence = 'monthly'
        referencedate_dte = None
        paydate_dayofmonth = 31

    if rosterdate_dte:
        if recurrence in ('weekly', 'biweekly'):
            # floor_division_part = days_diff // quotient  # // floor division returns the integral part of the quotient.
            # The % (modulo) operator yields the remainder from the division of the first argument by the second.
            #  16 // 14 =  1     16 % 14 =  2
            # -16 // 14 = -2    -16 % 14 = 12
            days_diff = f.get_datediff_days_from_dateOBJ(rosterdate_dte, referencedate_dte)
            quotient = 7 if recurrence == 'weekly' else 14
            remainder = days_diff % quotient  # % modulus returns the decimal part (remainder) of the quotient
            new_paydate_dte = f.add_days_to_date(rosterdate_dte, remainder)
            firstdate_of_period = f.add_days_to_date(new_paydate_dte, 1 - quotient)

        elif recurrence == "monthly":
            # PR20202-07-03 debug: rosterday_dayofmonth <= paydate_dayofmonth gave error
            # because paydate_dayofmonth was None. Set to 31 when None.
            if not paydate_dayofmonth:
                paydate_dayofmonth = 31
# - check if rosterday_dayofmonth is greater than paydate_dayofmonth. If so: paydate is in next month
            rosterday_dayofmonth = rosterdate_dte.day
            firstof_thismonth_dte = f.get_firstof_thismonth(rosterdate_dte)

# new paydate is in same month as rosterdate
            if rosterday_dayofmonth <= paydate_dayofmonth:
        # if paydate_dayofmonth is in same month as rosterdate: new_paydate is last of month
                firstof_previousmonth = f.get_firstof_previousmonth(rosterdate_dte)
                try:
                    new_paydate_dte = date(firstof_thismonth_dte.year, firstof_thismonth_dte.month, paydate_dayofmonth)
                except:
                    # get last tof moth when date does not eists (i.e. Feb 30)
                    new_paydate_dte = f.get_lastof_month(firstof_thismonth_dte)
                try:
                    firstdate_of_period = date(firstof_previousmonth.year, firstof_previousmonth.month, 1 + paydate_dayofmonth)
                except:
                    firstdate_of_period = firstof_thismonth_dte
            else:
        # if paydate_dayofmonth is in next month from rosterdate: new_paydate is last of month
                firstof_nextmonth_dte = f.get_firstof_nextmonth(rosterdate_dte)
                try:
                    new_paydate_dte = date(firstof_nextmonth_dte.year, firstof_nextmonth_dte.month, paydate_dayofmonth)
                except:
                    new_paydate_dte = f.get_lastof_month(firstof_nextmonth_dte)
                try:
                    firstdate_of_period = date(firstof_thismonth_dte.year, firstof_thismonth_dte.month, 1 + paydate_dayofmonth)
                except:
                    firstdate_of_period = firstof_nextmonth_dte

        elif recurrence == 'irregular':
# - get the first closing day that is greater than or equal to this rosterdate
            paydateitem = m.Paydateitem.objects.filter(paydatecode=paydatecode, datelast__gte=rosterdate_dte)\
                .order_by('datelast').first()

            if paydateitem and paydateitem.datelast:
                new_paydate_dte = paydateitem.datelast
# - get the first closing day before new_paydate_dte
                first_paydateitem = m.Paydateitem.objects.filter(paydatecode=paydatecode, datelast__lt=new_paydate_dte)\
                    .order_by('-datelast').first()
                if first_paydateitem and first_paydateitem.datelast:
                    # first date of period is one day after last day of previous periode
                    firstdate_of_period = f.add_days_to_date(first_paydateitem.datelast, 1)

    #logger.debug('............ new_paydate_dte: ' + str(new_paydate_dte) + ' ' + f.format_WDMY_from_dte(new_paydate_dte, 'nl'))
    #logger.debug('............ firstdate_of_period: ' + str(firstdate_of_period) + ' ' + f.format_WDMY_from_dte(firstdate_of_period, 'nl'))
    return firstdate_of_period, new_paydate_dte
# - end of recalc_paydate



@method_decorator([login_required], name='dispatch')
class EmplhournoteUploadView(UpdateView):  # PR2020-10-14

    def post(self, request, *args, **kwargs):
        #logger.debug(' ')
        #logger.debug(' ============= EmplhournoteUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                # upload_dict = {id: {ppk: 12301, table: "Emplhournote", create: true}
                #                note: {value: "this is a note", update: true} }
                upload_dict = json.loads(upload_json)

# - get iddict variables
                ppk_int = f.get_dict_value (upload_dict, ('id', 'ppk'))
                is_create = f.get_dict_value (upload_dict, ('id', 'create'), False)
                note = f.get_dict_value (upload_dict, ('note', 'value'))

                emplhournote = None
# - Create new orderhour / emplhour if is_create:
                # update_emplhour is also called when emplhour is_created, save_to_log is called in update_emplhour
                if is_create and ppk_int and note:
                    emplhour = m.Emplhour.objects.get_or_none(pk=ppk_int)
                    if emplhour:
                        emplhournote = m.Emplhournote(
                            emplhour=emplhour,
                            note=note,
                            isusernote=True
                        )
                        emplhournote.save(request=request)

# - also set emplhour.hasnote = True, save emplhour and update last_emplhour_updated PR2020-10-26
                        emplhour.hasnote = True
                        emplhour.save(request=request, last_emplhour_updated=True)

# 6. create list of updated emplhour_row
                        filter_dict = {'eplh_update_list': [emplhour.pk]}
                        emplhour_rows = d.create_emplhour_rows(filter_dict, request, None, False)
                        if emplhour_rows:
                            update_wrap['emplhour_updates'] = emplhour_rows

# - also get emplhournote (roster page)
                        emplhournote_rows = d.create_emplhournote_rows(
                            period_dict=filter_dict,
                            last_emplhour_check=None,
                            request=request)
                        if emplhournote_rows:
                            update_wrap['emplhournote_updates'] = emplhournote_rows

# 9. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))