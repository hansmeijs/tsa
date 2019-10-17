# PR2019-07-31
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.db.models import Q, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse

from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView

from datetime import datetime, timedelta

from companies.views import LazyEncoder

from tsap import constants as c
from tsap import functions as f
from tsap import validators as v
from planning import dicts as d

from planning.dicts import get_rosterdatefill_dict, create_emplhour_list,\
    get_period_from_settings, get_timesstartend_from_perioddict

from tsap.settings import TIME_ZONE, LANGUAGE_CODE

from companies import models as m

import json

import logging
logger = logging.getLogger(__name__)


@method_decorator([login_required], name='dispatch')
class FillRosterdateView(UpdateView):  # PR2019-05-26

    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= FillRosterdateView ============= ')

        update_dict = {}
        if request.user is not None and request.user.company is not None:
# - reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            if 'rosterdate_fill' in request.POST:
                rosterdate_fill_dict = json.loads(request.POST['rosterdate_fill'])
                # rosterdate_fill_dict: ['{"fill":"2019-07-16"}']}>

                rosterdate_fill = None
                rosterdate_remove = None

                update_list = []

                if 'fill' in rosterdate_fill_dict:
                    rosterdate_str = rosterdate_fill_dict['fill']
                    rosterdate_fill_dte, msg_txt = f.get_date_from_ISOstring(rosterdate_str)
                    logfile = []
                    FillRosterdate(rosterdate_fill_dte, update_list, request, comp_timezone, user_lang, logfile)

                # update rosterdate_current in companysettings
                    m.Companysetting.set_setting(c.KEY_COMP_ROSTERDATE_CURRENT, rosterdate_fill_dte, request.user.company)
                    update_dict['rosterdate'] = get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)
                    update_dict['logfile'] = logfile

                elif 'remove' in rosterdate_fill_dict:
                    rosterdate_str = rosterdate_fill_dict['remove']
                    rosterdate_remove_dte, msg_txt = f.get_date_from_ISOstring(rosterdate_str)
                    RemoveRosterdate(rosterdate_remove_dte, request, comp_timezone)

                # update rosterdate_current in companysettings
                    rosterdate_current_dte = rosterdate_remove_dte + timedelta(days=-1)
                    m.Companysetting.set_setting(c.KEY_COMP_ROSTERDATE_CURRENT, rosterdate_current_dte, request.user.company)
                    update_dict['rosterdate'] = get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)

                period_dict = get_period_from_settings(request)
                period_timestart_utc, period_timeend_utc = get_timesstartend_from_perioddict(period_dict, request)
                # TODO range
                show_all = False
                list = update_list

                # logger.debug(('update_list: ' + str(update_list)))
                """
                list = create_emplhour_list(company=request.user.company,
                                                     comp_timezone=comp_timezone,
                                                     time_min=None,
                                                     time_max=None,
                                                     range_start_iso='',
                                                     range_end_iso='',
                                                     show_all=show_all)  # PR2019-08-01
                """
                # debug: also update table in window when list is empty, Was: if list:
                update_dict['emplhour_list'] = list

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

#######################################################

def FillRosterdate(new_rosterdate_dte, update_list, request, comp_timezone, user_lang, logfile):  # PR2019-08-01

    logger.debug(' ============= FillRosterdate ============= ')
    logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))
    # logger.debug('isocalendar year: ' + str(new_rosterdate_dte.isocalendar()[0]))
    # logger.debug('isocalendar weeknr: ' + str(new_rosterdate_dte.isocalendar()[1]))
    # logger.debug('isocalendar: daynr' + str(new_rosterdate_dte.isocalendar()[2]))
    # logger.debug('isocalendar' + str(new_rosterdate_dte.isocalendar()))
    # new_rosterdate_dte: 2019-04-10 <class 'datetime.date'>

    if new_rosterdate_dte:
        # update schemeitem rosterdate.
        absence_dict = {}  # {111: 'Vakantie', 112: 'Ziek'}
        rest_dict = {}     # {111: [(timestart, end), (timestart, end)], 112: [(timestart, end)]}

# 1. update the rosterdate of schemeitem when it is outside the current cycle,
        # before filling emplhours with rosterdate you must update the schemitems.
        # rosterdates that are before the new rosterdate must get a date on or after the new rosterdate
        # time start and timeend will also be updated in this function

        # DON't add 1 cycle to today's schemeitems, added rosterday must be visible in planning, to check
        # next_rosterdate = new_rosterdate_dte + timedelta(days=1)
        # update_schemeitem_rosterdate(schemeitem, next_rosterdate, comp_timezone)

        schemeitems = m.Schemeitem.objects.filter(scheme__order__customer__company=request.user.company)
        for schemeitem in schemeitems:
            update_schemeitem_rosterdate(schemeitem, new_rosterdate_dte, comp_timezone)

        entries_count = 0
        entry_balance = m.get_entry_balance(request, comp_timezone)
        entries_employee_list = []

        logger.debug('entry_balance: ' + str(entry_balance))
        dte_formatted = f.format_WDMY_from_dte(new_rosterdate_dte, user_lang)
        # ===============================================================
        logfile.append('===================================================================================== ')
        logfile.append('  ' + str(request.user.company.code) + '  -  Fill roster of date: ' + str(dte_formatted))
        logfile.append('===================================================================================== ')
        # ===============================================================

        # first add absence records, so shifts can be skipped when absence exist

# 2 create list of employees who are absent on new rosterdate
        #  LOWER(e.code) must be in SELECT
        newcursor = connection.cursor()
        newcursor.execute("""SELECT tm.id, o.id, tm.employee_id, e.code, o.code, tm.datefirst, tm.datelast, LOWER(e.code) 
        FROM companies_teammember AS tm 
        INNER JOIN companies_employee AS e ON (tm.employee_id = e.id)
        INNER JOIN companies_team AS t ON (tm.team_id = t.id)
        INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
        INNER JOIN companies_order AS o ON (s.order_id = o.id) 
        INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
        WHERE (c.company_id = %(cid)s) AND (o.cat = %(cat)s) 
        AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)
        AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)
        AND (e.datefirst <= %(rd)s OR e.datefirst IS NULL)
        AND (e.datelast >= %(rd)s OR e.datelast IS NULL)
        ORDER BY LOWER(e.code) ASC""", {
            'cid': request.user.company_id,
            'cat': c.SHIFT_CAT_0512_ABSENCE,
            'rd': new_rosterdate_dte})
        absence_rows = newcursor.fetchall()
        logger.debug('++++++++++ absence_rows >' + str(absence_rows))
        # (446, 'Agata G M', 'Buitengewoon', 'agata g m'),
        # (446, 'Agata G M', 'Vakantie', 'agata g m'),

        logfile.append('================================ ')
        logfile.append('   Absence')
        logfile.append('================================ ')
        if absence_rows:
            empl_id = 0
            for item in absence_rows:
                logger.debug( str(item))
                # (0: tm_id, 1: order_id, 2: employee_id, 3: 'Agata G M', 4: 'Buitengewoon', 5: datefirst, 6: datelast 7: 'agata g m'),
                if empl_id == item[2]:
                    logfile.append("            " + item[3] + " is already absent. Absence '" + item[4] + "' skipped.")
                else:
                    empl_id = item[2]
                    # add item to absence_dict. Key is Empoloyee_id, value is category (for logging only)
                    absence_dict[item[2]] = item[4]
                    is_added = False
                    # teammember is needed to get absence hours
                    teammember = m.Teammember.objects.get_or_none(
                        team__scheme__order__customer__company=request.user.company,
                        team__scheme__order__cat=c.SHIFT_CAT_0512_ABSENCE,
                        pk=item[0]
                    )
                    if teammember:
                        order = teammember.team.scheme.order
                        is_added = add_absence_orderhour_emplhour(
                            order, teammember, new_rosterdate_dte, request, c.SHIFT_CAT_0512_ABSENCE)
                    if is_added:
                        range = get_range_text(item[5], item[6], True)  # True: with parentheses
                        logfile.append("       " + item[3] + " has absence '" + item[4] + "' " + range + ".")
                    else:
                        logfile.append("       Error adding absence '" + item[4] + "' of " + item[3] + " on " + str(new_rosterdate_dte.isoformat()) + ".")

        else:
            logfile.append('   no absent employees on ' + str(new_rosterdate_dte.isoformat()) + '.')

# 3. create list of employees who have rest_shifts on new_rosterdate_dte, also on previous and next rosterdate
        logger.debug('absence_dict:  ' + str(absence_dict))

        # absence_dict = {361: 'Vakantie', 446: 'Buitengewoon', 363: 'Ziekte', 290: 'Vakantie', 196: 'Buitengewoon', 341: 'Vakantie', 152: 'Onbetaald'}
        logger.debug(str('############################'))
        # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.

        # function MOD(x,y) gives remainder of x/y.
        # (si.rosterdate - %s) is the difference between si.rosterdate and new_rosterdate_dte in days
        # When (MOD(si.rosterdate - newdate, cycle) = 0) the difference is a multiple of cycle
        # only shifts whose rosterdate difference is a multiple of cycle are selected

        # select also records with diff -1 and 1, because shift can extend to the following or previous day
        # PR2019-09-07 debug: added also rest shift of previous / next day. Filter: add only restshift on rosterdate:

        # filter also on datfirst datelast of order, schemeitem and teammember
        newcursor.execute("""WITH tm_sub AS (SELECT tm.team_id AS tm_teamid, tm.id AS tm_id, 
                                tm.datefirst as tm_df, tm.datelast as tm_dl,  
                                e.id AS e_id, e.code AS e_code 
                                FROM companies_teammember AS tm
                                INNER JOIN companies_employee AS e ON (tm.employee_id = e.id) ), 
                            si_sub AS (SELECT si.team_id AS si_teamid, 
                                si.rosterdate AS sh_rd, si.timestart AS sh_ts, si.timeend AS sh_te,
                                sh.code AS sh_code, sh.isrestshift AS sh_rst 
                                FROM companies_schemeitem AS si
                                INNER JOIN companies_shift AS sh ON (si.shift_id = sh.id) )
        SELECT DISTINCT tm_sub.e_id, tm_sub.e_code, tm_sub.tm_id, c.code, o.code, 
        si_sub.sh_rd, si_sub.sh_ts, si_sub.sh_te,  si_sub.sh_code, s.cycle  
        FROM companies_team AS t 
        INNER JOIN tm_sub ON (t.id = tm_sub.tm_teamid)
        INNER JOIN si_sub ON (t.id = si_sub.si_teamid)
        INNER JOIN companies_teammember AS tm ON (t.id = tm.team_id)
        INNER JOIN companies_schemeitem AS si ON (t.id = si.team_id)
        INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
        INNER JOIN companies_order AS o ON (s.order_id = o.id) 
        INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
        WHERE (c.company_id = %(cid)s) AND (si_sub.sh_rst) 
        AND (MOD(si_sub.sh_rd - %(rd)s, s.cycle) >= -1)
        AND (MOD(si_sub.sh_rd - %(rd)s, s.cycle) <= 1) 
        AND (o.datefirst <= %(rd)s OR o.datefirst IS NULL) AND (o.datelast >= %(rd)s OR o.datelast IS NULL)
        AND (s.datefirst <= %(rd)s OR s.datefirst IS NULL) AND (s.datelast >= %(rd)s OR s.datelast IS NULL)
        AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL) AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)
        ORDER BY tm_sub.e_id ASC""",
                          {'cid': request.user.company_id,
                           'rd': new_rosterdate_dte})
        rest_rows = newcursor.fetchall()
        logger.debug('------- rest_rows >' + str(rest_rows))
        # rest_rows: [(1554, 'Sluis, Christepher', 401, 'MCB', 'Punda', datetime.date(2019, 3, 31), None, None, 'rust', 1)]
        logfile.append('================================ ')
        logfile.append('   Rest shifts')
        logfile.append('================================ ')
        if rest_rows:
            empl_id = 0
            row_list = []
            for item in rest_rows:
                # item = [ 0: employee_id, 1: employee_code, 2: teammember_id, 3: customer_code, 4: order_code,
                # 5: rosterdate, 6: timestart, 7: timeend, 8: shift_code  9: cycle ]

                # when empl_id changed: add row_dict to rest_dict, reset row_dict and empl_id.
                # Also add row_dict to rest_dict at the end!!

                # rest_dict = {111: [[timestart, timeend, cust-order), (timestart, timeend, cust-ord]}

                if empl_id != item[0]:
                    if row_list:
                        rest_dict[empl_id] = row_list
                    row_list = []
                    empl_id = item[0]

                item_tuple = (item[6], item[7], item[3] + ' - ' + item[4])
                row_list.append(item_tuple)

                # [(294,
                # 'Windster R A',
                # 120,
                # 'Giro',
                # 'Jan Noorduynweg',
                # 7,
                # datetime.date(2019, 10, 24),
                # datetime.datetime(2019, 10, 23, 20, 0, tzinfo=<UTC>),
                # datetime.datetime(2019, 10, 24, 5, 0, tzinfo=<UTC>),
                # 'rust')

                # teammember is needed to get absence hours

                # logger.debug('item[5]: ' + str(item[5]) + ' ' + str(type(item[5])))
                # logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))

                # PR2019-09-07 debug: added also rest shift of previous / next day. Filter: add only restshift on rosterdate:
                if item[5] == new_rosterdate_dte:
                    is_added = False
                    teammember = m.Teammember.objects.get_or_none(
                        team__scheme__order__customer__company=request.user.company,
                        pk=item[2]
                    )
                    """
                    if teammember:
                        order = teammember.team.scheme.order
                        is_added = add_absence_orderhour_emplhour(
                            order=order,
                            teammember=teammember,
                            new_rosterdate_dte=new_rosterdate_dte,
                            request=request,
                            abscat=c.SHIFT_CAT_1024_RESTSHIFT)
                    """
                    if is_added:
                        logfile.append("       " + item[1] + " has rest from '" + item[3] + " - " + item[4] + "' on " + str(item[5].isoformat()) + ".")
                    else:
                        logfile.append("       Error adding absence '" + item[3] + "' of " + item[1] + " on " + str(new_rosterdate_dte.isoformat()) + ".")
        else:
            logfile.append('   no rest shifts on ' + str(new_rosterdate_dte.isoformat()) + '.')

# 4. create shifts
        # loop through all customers of this company, except for absence and template
        # shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacemenet, 512=absence, 1024=rest, 4096=template
        customers = m.Customer.objects.filter(company=request.user.company, cat__lt=c.SHIFT_CAT_0512_ABSENCE)
        if not customers:
            logfile.append('================================ ')
            logfile.append('Customer: No customers found.')
            logfile.append('================================ ')
        else:
            for customer in customers:
                logfile.append('================================ ')
                logfile.append('Customer: ' + customer.code)
                logfile.append('================================ ')

                if customer.locked:
                    logfile.append("   - customer is locked.")
                elif customer.inactive:
                    logfile.append("   - customer is inactive.")
                else:
                    orders = m.Order.objects.filter(customer=customer)
                    if not orders:
                        logfile.append("   - customer has no orders.")
                    else:
                        for order in orders:
                            logfile.append('- - - - - - - - - - - - - - - - - - - - - - - - - - ')
                            logfile.append('   Order: ' + str(order.code))
                            if order.locked:
                                logfile.append("      order is locked.")
                            elif order.inactive:
                                logfile.append("      order is inactive.")
                            elif not f.date_within_range(order.datefirst, order.datelast, new_rosterdate_dte):
                                range = get_range_text(order.datefirst, order.datelast, True)  # True: with parentheses
                                logfile.append("      rosterdate outside order period " + range)
                            else:
                                schemes = m.Scheme.objects.filter(order=order)
                                if not schemes:
                                    logfile.append("      order has no schemes.")
                                else:
                                    for scheme in schemes:
                                        scheme_code = getattr(scheme, 'code', '-')
                                        range = get_range_text(scheme.datefirst, scheme.datelast, True)  # True: with parentheses

                                        logfile.append('. . . . . . . . . . . . . . . . . . . . . . . . .')
                                        logfile.append('   Scheme: ' + str(scheme_code) + ' ' + range)

                                        if scheme.inactive:
                                            logfile.append("     scheme is inactive.")
                                        elif not f.date_within_range(scheme.datefirst, scheme.datelast, new_rosterdate_dte):
                                            logfile.append("     scheme skipped. Rosterdate outside scheme period." )
                                        else:
                                            schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                                            if not schemeitems:
                                                logfile.append("     scheme ' has no shifts.")
                                            else:
                                                count_skipped_not_on_rosterdate = 0
                                                count_skipped_restshift = 0
                                                for schemeitem in schemeitems:
                                                    new_schemeitem_rosterdate_dte = schemeitem.rosterdate
                                                    # new_schemeitem_rosterdate_dte: 2019-10-30 <class 'datetime.date'>

                                                    shift_code = '-'
                                                    shift = schemeitem.shift
                                                    if shift:
                                                        shift_code = getattr(shift, 'code', '-')
                                                    shift_code = "       Shift '" + shift_code

                                 # 3. skip if schemeitem.rosterdate does not equal new_rosterdate_dte
                                                    if new_schemeitem_rosterdate_dte != new_rosterdate_dte:
                                                        count_skipped_not_on_rosterdate += 1
                                                    else:
                                                        if not schemeitem.shift:
                                                            logfile.append(shift_code + "' is blank.")
                                                        elif schemeitem.inactive:
                                                            logfile.append(shift_code + "' is inactive on this date.")
                                                        elif schemeitem.shift.cat == c.SHIFT_CAT_1024_RESTSHIFT:
                                            # skip rest shift
                                                            count_skipped_restshift += 1
                                                        else:
                                                            range = f.formatWHM_from_datetime(
                                                                schemeitem.timestart,
                                                                comp_timezone,
                                                                user_lang) + ' - ' + \
                                                                f.formatWHM_from_datetime(
                                                                    schemeitem.timeend,
                                                                    comp_timezone,
                                                                    user_lang)
                                                            logfile.append(shift_code + "'   (" + range + ')')

                                                            add_orderhour_emplhour(
                                                                schemeitem=schemeitem,
                                                                new_rosterdate_dte=new_rosterdate_dte,
                                                                request=request,
                                                                entries_employee_list=entries_employee_list,
                                                                entries_count=entries_count,
                                                                absence_dict=absence_dict,
                                                                rest_dict=rest_dict,
                                                                update_list=update_list,
                                                                comp_timezone=comp_timezone,
                                                                logfile=logfile)  # PR2019-08-12


                                                if count_skipped_restshift:
                                                    skipped_text = str(count_skipped_restshift) + " rest shifts were skipped"
                                                    if count_skipped_restshift == 1:
                                                        skipped_text = "1 rest shift was skipped"
                                                    logfile.append("       " + skipped_text)
                                                if count_skipped_not_on_rosterdate:
                                                    skipped_text = str(count_skipped_not_on_rosterdate) + " shifts were skipped (not on this rosterdate)"
                                                    if count_skipped_not_on_rosterdate == 1:
                                                        skipped_text = "1 shift was skipped (not on this rosterdate)"
                                                    logfile.append("       " + skipped_text)

        if entries_count == 0:
            entry_text = 'No shifts were'
        elif entries_count == 1:
            entry_text = '1 shift was'
        else:
            entry_text = str(entries_count) + ' shifts were'
        entry_text += ' subtracted from your balance.'
        # logger.debug('===============================================================')
        # logger.debug(entry_text)
        # logger.debug('===============================================================')


def add_orderhour_emplhour(schemeitem, new_rosterdate_dte, request,
    entries_employee_list, entries_count, absence_dict, rest_dict, update_list, comp_timezone, logfile):  # PR2019-08-12

    logger.debug(' ============= add_orderhour_emplhour ============= ')
    # logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))
    # logger.debug('schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))

    oh_is_locked = False

# get info from shift
    shift_code = '-'
    shift_cat = 0
    shift_breakduration = 0
    shift_wagefactor = 0
    shift_isrestshift = False
    shift = schemeitem.shift
    if shift:
        if shift.cat:
            shift_cat = shift.cat
        if shift.code:
            shift_code = shift.code
        if shift.breakduration:
            shift_breakduration = shift.breakduration
        if shift.wagefactor:
            shift_wagefactor = shift.wagefactor
        shift_isrestshift = shift.isrestshift

# get info from order
    tax_rate = 0
    order = schemeitem.scheme.order
    if order:
        if order.taxcode:
            tax_code = order.taxcode
            if tax_code.taxrate:
                tax_rate = tax_code.taxrate

# get pricerate info from schemeitem or shift, scheme, order
    pricerate = get_schemeitem_pricerate(schemeitem)
    # pricerate and amount can be overwritten by teammember

    logger.debug('pricerate: ' + str(pricerate) + ' ' + str(type(pricerate)))

# get billable info from schemeitem or shift, scheme, order, company
    is_override, is_billable = f.get_billable_schemeitem(schemeitem)

    timeduration = getattr(schemeitem, 'timeduration', 0)
    amount = 0
    tax = 0
    # with restshift: amount = 0, pricerate = 0, billable = false
    if shift_isrestshift:
        pricerate = 0
        is_billable = False
    else:
        amount = (timeduration / 60) * (pricerate)
        tax = amount * tax_rate / 10000  # taxrate 600 = 6%

# 1. update existing orderhour that is linked to this schemeitem
    # a. check if an orderhour from this schemeitem and this rosterdate already exists
    orderhour = m.Orderhour.objects.filter(
        schemeitem=schemeitem,
        order=schemeitem.scheme.order,
        rosterdate=schemeitem.rosterdate).first()
    if orderhour:
# b. if exists, check if status is STATUS_02_START_CONFIRMED or higher
        # skip update this orderhour when it is locked or has status STATUS_02_START_CONFIRMED or higher
        oh_is_locked = (orderhour.status > c.STATUS_01_CREATED or orderhour.locked)
        if oh_is_locked:
            logfile.append("       Shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " already exist and is locked. Shift will be skipped.")
        else:
            logfile.append("       Shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " already exist and will be overwritten.")

# 5. if not exists: create new orderhour
    else:
        yearindex = new_rosterdate_dte.year
        monthindex = new_rosterdate_dte.month
        weekindex = new_rosterdate_dte.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        #  week 1 is de week, waarin de eerste donderdag van dat jaar zit
        # TODO payperiodindex

        orderhour = m.Orderhour(
            order=schemeitem.scheme.order,
            schemeitem=schemeitem,
            rosterdate=new_rosterdate_dte,
            yearindex=yearindex,
            monthindex=monthindex,
            weekindex=weekindex,
            status=c.STATUS_01_CREATED
        )

# d. if new record or not locked: replace values of existing orderhour
    if orderhour and not oh_is_locked:
        orderhour.shift = shift_code
        orderhour.cat = shift_cat
        orderhour.duration = schemeitem.timeduration
        orderhour.isrestshift = shift_isrestshift
        orderhour.isbillable = is_billable
        orderhour.pricerate = pricerate
        orderhour.amount = amount
        orderhour.taxrate = tax_rate
        orderhour.tax = tax
        orderhour.save(request=request)

# create new emplhour, not when oh_is_locked
        new_emplhour = m.Emplhour(
            orderhour=orderhour,
            rosterdate=orderhour.rosterdate,
            yearindex=orderhour.yearindex,
            monthindex=orderhour.monthindex,
            weekindex=orderhour.weekindex,
            shift=shift_code,
            cat = shift_cat,
            timestart=schemeitem.timestart,
            timeend=schemeitem.timeend,
            timeduration=timeduration,
            breakduration=shift_breakduration,
            wagefactor=shift_wagefactor,
            status=c.STATUS_01_CREATED)

# - lookup first employee within range in team.teammembers
       #  teammember = m.Teammember.get_first_teammember_on_rosterdate(schemeitem.team, new_rosterdate_dte)
        teammember = get_first_teammember_on_rosterdate_with_logfile(
            schemeitem=schemeitem,
            rosterdate_dte=new_rosterdate_dte,
            absence_dict=absence_dict,
            rest_dict=rest_dict,
            logfile=logfile
        )
        employee_text = ", no employee was found for this shift."

        employee_pk = 0
        if teammember:
            new_emplhour.wagefactor = teammember.wagefactor

            # add employee (employe=null is filtered out)
            employee = teammember.employee
            if employee:
                employee_pk = employee.id
                new_emplhour.employee = employee
                new_emplhour.wagecode = employee.wagecode
                new_emplhour.wagerate = employee.wagerate
                employee_text = " with employee: " + str(employee.code) + "."

# if teammember.override if override=TRue: use teammember/employee pricerate, else: use orderhour pricerate
                if teammember.override:
                    pricerate = None
                    if teammember.pricerate:
                        pricerate = teammember.pricerate
                    elif employee.pricerate:
                        pricerate = employee.pricerate
                    if pricerate:
                        new_emplhour.pricerate = pricerate

        new_emplhour.save(request=request)

        if new_emplhour :
            # - put info in id_dict
            id_dict = {'pk': new_emplhour.pk, 'ppk': new_emplhour.orderhour.pk, 'created': True }
            update_dict = {'id': id_dict}
            logger.debug(('update_dict: ' + str(update_dict)))

            d.create_emplhour_itemdict(new_emplhour, update_dict, comp_timezone)
            logger.debug(('update_dict: ' + str(update_dict)))

            update_list.append(update_dict)
            logger.debug(('update_list: ' + str(update_list)))

        logfile.append("           Shift '" + str(shift_code) + "' is added" + employee_text)

#  add entry to entries_count
# if shift has employee: skip if employee was already added, if no employee: add always
        # logger.debug("xxxxx    entries_count '" + str(entries_count))
        # logger.debug("xxxxx    employee_id '" + str(employee_id))
        # logger.debug("xxxxx    entries_employee_list '" + str(entries_employee_list))
        if employee_pk:
            if employee_pk not in entries_employee_list:
                logger.debug("ADD        employee_id '" + str(employee_pk) + "' not in " + str(entries_employee_list))
                entries_count += 1
                entries_employee_list.append(employee_pk)
            else:
                logger.debug("           employee_id '" + str(employee_pk) + "' found in " + str(entries_employee_list))
        else:
            # logger.debug("ADD        employee_id '" + str(employee_id) + "' is 0")
            entries_count += 1

        # logger.debug("           entries_count '" + str(entries_count))
        # logger.debug("           entries_employee_list '" + str(entries_employee_list))

# 33333333333333333333333333333333333333333333333333

def get_first_teammember_on_rosterdate_with_logfile(schemeitem, rosterdate_dte, absence_dict, rest_dict, logfile):

    added_teammember = None

    team = schemeitem.team
    if team and rosterdate_dte:
        # don't filter teammmembers within range datefirst/datelast, but give message further

# 1. iterate through teammembers
        teammembers = m.Teammember.objects\
            .annotate(datelast_nonull=Coalesce('datelast', Value(datetime(2500, 1, 1))))\
            .filter(team=team)\
            .order_by('datelast_nonull')

        if not teammembers:
            logfile.append("       This shift has no employees.")
        else:
            for teammember in teammembers:
                empl = teammember.employee
# 2. skip if employee is absent
                # absence_dict = {111: 'Vakantie', 112: 'Ziek'}

                if empl.pk in absence_dict:
                    range = get_range_text(teammember.datefirst, teammember.datelast)  # True: with parentheses
                    logfile.append("           Employee '" + empl.code + "' is absent (" + absence_dict[empl.pk] + ") " + range + ".")
                else:
                    has_rest_shift = False
                    if empl.pk in rest_dict:
                        # rest_dict = {111: [(timestart, timeend, cust-order), (timestart, timeend, cust-ord]}

 # 3. skip if shift is within range of rest shift
                        rest_list = rest_dict[empl.pk]
                        for rest_item in rest_list:
                            has_rest_shift = f.period_within_range(rest_item[0], rest_item[1], schemeitem.timestart,
                                                                 schemeitem.timeend)
                            if has_rest_shift:
                                logfile.append("           Employee '" + empl.code + "' has rest shift from: " + rest_item[2] + ".")
                                break

                    if not has_rest_shift:
                        if not f.date_within_range(empl.datefirst, empl.datelast, rosterdate_dte):
                            range = get_range_text(empl.datefirst, empl.datelast, True)  # True: with parentheses
                            logfile.append("           Employee '" + empl.code + "' not in service " + range )
                        elif not f.date_within_range(teammember.datefirst, teammember.datelast, rosterdate_dte):
                            range = get_range_text(teammember.datefirst, teammember.datelast)
                            logfile.append("           Employee '" + empl.code + "', rosterdate outside shift period of employee: " + range + ".")
                        else:
                            added_teammember = teammember
                            break

    return added_teammember


# 33333333333333333333333333333333333333333333333333


def add_absence_orderhour_emplhour(order, teammember, new_rosterdate_dte, request, abscat):  # PR2019-09-01
    is_added = False
    if order and teammember:
        yearindex = new_rosterdate_dte.year
        monthindex = new_rosterdate_dte.month
        weekindex = new_rosterdate_dte.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        # TODO payperiodindex
        orderhour = m.Orderhour(
            order=order,
            rosterdate=new_rosterdate_dte,
            yearindex=yearindex,
            monthindex=monthindex,
            weekindex=weekindex,
            payperiodindex=0,
            cat=abscat,
            status=c.STATUS_01_CREATED)  # gets status created when time filled in by schemeitem
        orderhour.save(request=request)

        if orderhour:
    # create new emplhour
            # workhours_per_day_minutes = workhours_minutes / workdays_minutes * 1440
            workhoursperday = getattr(teammember, 'workhoursperday', 0)
            if not workhoursperday:
                if teammember.employee:
                    workhours = getattr(teammember.employee, 'workhours', 0)
                    workdays = getattr(teammember.employee, 'workdays', 0)
                    if workhours and workdays:
                        workhoursperday = workhours / workdays * 1440

            new_emplhour = m.Emplhour(
                orderhour=orderhour,
                rosterdate=new_rosterdate_dte,
                yearindex=yearindex,
                monthindex=monthindex,
                weekindex=weekindex,
                payperiodindex=0,  # TODO
                employee=teammember.employee,
                teammember=teammember,
                timeduration=workhoursperday,
                cat=abscat,
                status=c.STATUS_01_CREATED) # gets status created when time filled in by schemeitem
            new_emplhour.save(request=request)
            is_added = True
    return is_added


def update_schemeitem_rosterdate(schemeitem, new_rosterdate_dte, comp_timezone):  # PR2019-07-31
    # update the rosterdate of a schemeitem when it is outside the current cycle,
    # it will be replaced  with a rosterdate that falls within within the current cycle, by adding n x cycle days
    # the timestart and timeend will also be updates
    # logger.debug(' --- update_schemeitem_rosterdate new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))

    # the curent cycle has index 0. It starts with new_rosterdate and ends with new_rosterdate + cycle -1

    if schemeitem and new_rosterdate_dte:
        # new_rosterdate_naive = f.get_datetime_naive_from_dateobject(new_rosterdate_dte)
        new_si_rosterdate_naive = schemeitem.get_rosterdate_within_cycle(new_rosterdate_dte)
        # logger.debug(' new_rosterdate_naive: ' + str(new_rosterdate_naive) + ' ' + str(type(new_rosterdate_naive)))
        # new_rosterdate_naive: 2019-08-27 00:00:00 <class 'datetime.datetime'>
        # logger.debug(' new_si_rosterdate_naive: ' + str(new_si_rosterdate_naive) + ' ' + str(type(new_si_rosterdate_naive)))
        # new_si_rosterdate_naive: 2019-08-29 00:00:00 <class 'datetime.datetime'>

        if new_si_rosterdate_naive:
            # save new_si_rosterdate
            # logger.debug('old si_rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
            # old si_rosterdate: 2019-08-29 <class 'datetime.date'>
            schemeitem.rosterdate = new_si_rosterdate_naive
            # logger.debug('new_si_rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
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
            # logger.debug('new_timeend: ' + str(new_timeend) + ' ' + str(type(new_timeend)))

            # get new_schemeitem.timeduration
            new_timeduration = 0
            if new_timestart and new_timeend:
                new_timeduration = f.get_time_minutes(
                    timestart=new_timestart,
                    timeend=new_timeend,
                    break_minutes=breakduration)
            schemeitem.timeduration = new_timeduration

            # logger.debug('new_timeduration: ' + str(new_timeduration) + ' ' + str(type(new_timeduration)))
            # save without (request=request) keeps modifiedby and modifieddate
            schemeitem.save()
            # logger.debug('schemeitem.saved rosterdate: ' + str(schemeitem.rosterdate))


###############
# moved to model schemeitem - TODO let it stay till other one is tested
def get_schemeitem_rosterdate_within_cycle(schemeitem, new_rosterdate):
    new_si_rosterdate = None
    # new_rosterdate has format : 2019-07-27 <class 'datetime.date'>
    # update the rosterdate of a schemeitem when it is outside the current cycle,
    # it will be replaced  with a rosterdate that falls within within the current cycle, by adding n x cycle days
    # the timestart and timeend will also be changed

    # the curent cycle has index 0. It starts with new_rosterdate and ends with new_rosterdate + cycle -1

    if schemeitem and new_rosterdate:
        si_rosterdate = schemeitem.rosterdate
        # logger.debug('si_rosterdate: ' + str(si_rosterdate) + ' ' + str(type(si_rosterdate)))
        # logger.debug('new_rosterdate: ' + str(new_rosterdate) + ' ' + str(type(new_rosterdate)))
        # logger.debug('si_time: ' + str(schemeitem.timestart) + ' - ' + str(schemeitem.timeend))

        datediff = si_rosterdate - new_rosterdate  # datediff is class 'datetime.timedelta'
        datediff_days = datediff.days  # <class 'int'>
        # logger.debug('datediff_days: ' + str(datediff_days))

        cycle_int = schemeitem.scheme.cycle
        # logger.debug('cycle: ' + str(cycle_int) + ' ' + str(type(cycle_int)))
        if cycle_int:
            # cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
            # // operator: Floor division - division that results into whole number adjusted to the left in the number line
            index = datediff_days // cycle_int
            # logger.debug('index: ' + str(index) + ' ' + str(type(index)))
            # adjust si_rosterdate when index <> 0
            if index:
                # negative index adds positive day and vice versa
                days_add = cycle_int * index * -1
                # logger.debug('days_add: ' + str(days_add) + ' ' + str(type(days_add)))
                new_si_rosterdate = si_rosterdate + timedelta(days=days_add)

    return new_si_rosterdate


#################

# 5555555555555555555555555555555555555555555555555555555555555555555555555555

def RemoveRosterdate(rosterdate_current, request, comp_timezone):  # PR2019-06-17
    # logger.debug(' ============= RemoveRosterdate ============= ')
    # logger.debug(' rosterdate_current:' + str(rosterdate_current))

    if rosterdate_current:
# - create recordset of orderhour records with rosterdate = rosterdate_current
#   Don't filter on schemeitem Is Not Null (schemeitem Is Not Null when generated by Scheme, schemeitem Is Null when manually added)

# check orderhour status:, skip if STATUS_02_START_CONFIRMED or higher
        crit = Q(orderhour__order__customer__company=request.user.company) & \
               Q(rosterdate=rosterdate_current) & \
               (Q(status__gte=c.STATUS_02_START_CONFIRMED) | Q(orderhour__status__gte=c.STATUS_02_START_CONFIRMED))
        count = m.Emplhour.objects.filter(crit).count()
        # logger.debug(' count:' + str(count))

        if count:
            if count == 1:
                msg_err = _('This date has 1 shift that is confirmed. It can not be deleted.') %{'count': count}
            else:
                msg_err = _('This date has %(count)s shifts that are confirmed. They cannot be deleted.') %{'count': count}
            #TODO return msg_err

# get orderhour records of this date and status less than STATUS_02_START_CONFIRMED, also delete records with rosterdate Null
        crit = Q(order__customer__company=request.user.company) & \
              ((Q(rosterdate=rosterdate_current) & Q(status__lt=c.STATUS_02_START_CONFIRMED)) | Q(rosterdate__isnull=True))
        orderhours = m.Orderhour.objects.filter(crit)
        for orderhour in orderhours:
            # logger.debug(' orderhour:' + str(orderhour))
            delete_orderhour = True
# get emplhours of this orderhour
            emplhours = m.Emplhour.objects.filter(orderhour=orderhour)
            for emplhour in emplhours:
                logger.debug(' emplhour:' + str(emplhour))
                # check emplhours status:, skip if STATUS_02_START_CONFIRMED or higher
                if emplhour.status < c.STATUS_02_START_CONFIRMED \
                        or not orderhour.rosterdate \
                        or not emplhour.rosterdate:
                    emplhour.delete(request=request)
                else:
                    delete_orderhour = False
# delete orderhour
            if delete_orderhour:
                orderhour.delete(request=request)

def get_range_text(datefirst, datelast, parenthesis=False):
    range_text = ''
    if datefirst is not None:
        range_text = 'from ' + str(datefirst)
        if datelast is not None:
            range_text = range_text + ' thru ' + str(datelast)
    else:
        if datelast is not None:
            range_text = 'thru ' + str(datelast)
    if range_text and parenthesis:
        range_text = '(' + range_text + ')'
    return range_text


def get_schemeitem_pricerate(schemeitem):
    # PR2019-10-10 rate is in cents.
    # Value 'None' removes current value, gives inherited value
    # value '0' gives rate zero (if you dont want to charge for these hours

    field = 'priceratejson'
    pricerate = f.get_pricerate_from_instance(schemeitem, field, None, None)
    logger.debug('schemeitem pricerate' + str(pricerate))
    if pricerate is None and schemeitem.shift:
        pricerate = f.get_pricerate_from_instance(schemeitem.shift, field, None, None)
        logger.debug('shift pricerate' + str(pricerate))
    if pricerate is None and schemeitem.scheme:
        pricerate = f.get_pricerate_from_instance(schemeitem.scheme, field, None, None)
        logger.debug('scheme pricerate' + str(pricerate))
        if pricerate is None and schemeitem.scheme.order:
            pricerate = f.get_pricerate_from_instance(schemeitem.scheme.order, field, None, None)
            logger.debug('order pricerate' + str(pricerate))
    if pricerate is None:
        pricerate = 0
    return pricerate