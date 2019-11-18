# PR2019-07-31
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.db.models import Q
from django.db.models.functions import Lower
from django.http import HttpResponse

from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView

from datetime import datetime, timedelta

from companies.views import LazyEncoder

from tsap import constants as c
from tsap import functions as f
from planning import dicts as d

from planning.dicts import get_rosterdatefill_dict, create_emplhour_list,\
    get_period_from_settings, get_timesstartend_from_perioddict

from tsap.settings import TIME_ZONE, LANGUAGE_CODE

from companies import models as m

import json
import random

import logging
logger = logging.getLogger(__name__)


@method_decorator([login_required], name='dispatch')
class FillRosterdateView(UpdateView):  # PR2019-05-26

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= FillRosterdateView ============= ')

        update_dict = {}
        if request.user is not None and request.user.company is not None:
# - reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            if 'upload' in request.POST:
                upload_dict = json.loads(request.POST['upload'])
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'mode': 'create', 'rosterdate': '2019-12-20', 'count': 0, 'confirmed': 0}
                mode = upload_dict.get('mode')
                rosterdate_iso = upload_dict.get('rosterdate')
                rosterdate_dte, msg_txt = f.get_date_from_ISOstring(rosterdate_iso)

                logger.debug('rosterdate_dte: ' + str(rosterdate_dte))

                update_list = []
                dict = {}
                if mode == 'create':
                    logfile = []
# FillRosterdate
                    FillRosterdate(rosterdate_dte, update_list, comp_timezone, user_lang, logfile, request)
                    dict['mode'] = 'create'
                    dict['rosterdate'] = get_rosterdatefill_dict(rosterdate_dte, request.user.company)
                    dict['logfile'] = logfile

                elif mode == 'delete':
                    dict['mode'] = 'delete'
# RemoveRosterdate
                    RemoveRosterdate(rosterdate_iso, request, comp_timezone)

                if dict:
                    update_dict['rosterdate'] = dict

                period_dict = get_period_from_settings(request)
                period_timestart_utc, period_timeend_utc = get_timesstartend_from_perioddict(period_dict, request)
                # TODO range
                show_all = False
                # list = update_list

                # logger.debug(('????????????? update_list: ' + str(update_list)))

                # list = create_emplhour_list(company=request.user.company,
                #                                      comp_timezone=comp_timezone,
                #                                     time_min=None,
                #                                     time_max=None,
                #                                      range_start_iso='',
                #                                      range_end_iso='',
                #                                      show_all=show_all)  # PR2019-08-01

                # debug: also update table in window when list is empty, Was: if list:
                # update_dict['emplhour_list'] = list

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

#######################################################

def FillRosterdate(new_rosterdate_dte, update_list, comp_timezone, user_lang, logfile, request):  # PR2019-08-01

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

# 2 delete existing emplhour and orderhour records of this rosterdate if they are not confirmed or locked
        # deleted_count, deleted_count_oh = delete_emplhours_orderhours(new_rosterdate_dte, request)

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

        logfile.append('================================ ')
        logfile.append('   Absence')
        logfile.append('================================ ')

# 2 create list of employees who are absent on new rosterdate
        create_absent_emplhours(new_rosterdate_dte, absence_dict, logfile, request)



#$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
# 4. create shifts
        # loop through all customers of this company, except for absence and template
        # shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacemenet, 512=absence, 1024=rest, 4096=template
        customers = m.Customer.objects.filter(company=request.user.company, isabsence=False)
        if not customers:
            logfile.append('================================ ')
            logfile.append('Customer: No customers found.')
            logfile.append('================================ ')
        else:
    # iterate through customers
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
    # iterate through orders
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
                                # TODO allow teammembers without scheme
                                schemes = m.Scheme.objects.filter(order=order)
                                if not schemes:
                                    logfile.append("      order has no schemes.")
                                else:
    # iterate through schemes
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
                                            # TODO subquery schemeitems
                                            schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                                            if not schemeitems:
                                                logfile.append("     scheme ' has no shifts.")
                                            else:
                                                count_skipped_not_on_rosterdate = 0
                                                count_skipped_restshift = 0
    # iterate through schemeitems
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
                                                                entries_employee_list=entries_employee_list,
                                                                entries_count=entries_count,
                                                                absence_dict=absence_dict,
                                                                rest_dict=rest_dict,
                                                                update_list=update_list,
                                                                comp_timezone=comp_timezone,
                                                                logfile=logfile,
                                                                request=request)  # PR2019-08-12

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


def add_orderhour_emplhour(schemeitem, new_rosterdate_dte,
                            entries_employee_list, entries_count, absence_dict, rest_dict, update_list,
                           comp_timezone, logfile, request):  # PR2019-08-12

    logger.debug(' ============= add_orderhour_emplhour ============= ')
    # logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))
    # logger.debug('schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))

# get info from shift
    shift_code = '-'
    shift_cat = 0
    shift_breakduration = 0
    shift_wagefactor = 0
    shift_isrestshift = False
    shift = schemeitem.shift
    if shift:
        shift_cat = getattr(shift, 'cat', 0)
        shift_code = getattr(shift, 'code', '-')
        shift_breakduration = getattr(shift, 'breakduration', 0)
        shift_wagefactor = getattr(shift, 'wagefactor', 0)
        shift_isrestshift = getattr(shift, 'isrestshift', False)

# get info from order
    tax_rate = 0
    order = schemeitem.scheme.order
    if order:
        if order.taxcode:
            tax_code = order.taxcode
            if tax_code.taxrate:
                tax_rate = tax_code.taxrate

# get pricerate info from schemeitem or shift, scheme, order
    # pricerate, additionrate and amount can be overwritten by teammember
    pricerate = get_schemeitem_pricerate(schemeitem)
    # logger.debug('pricerate: ' + str(pricerate) + ' ' + str(type(pricerate)))

    # TODO add get_schemeitem_additionrate(schemeitem)
    additionrate  = 0

# get billable info from schemeitem or shift, scheme, order, company
    is_override, is_billable = f.get_billable_schemeitem(schemeitem)

    timeduration = getattr(schemeitem, 'timeduration', 0)

    # with restshift: amount = 0, pricerate = 0, additionrate  = 0, billable = false
    if shift_isrestshift:
        pricerate = 0
        additionrate = 0
        is_billable = False

    amount = (timeduration / 60) * (pricerate) * (1 + additionrate / 10000)
    tax = amount * tax_rate / 10000  # taxrate 600 = 6%

# iterate through the teammembers of the team of this schemeitem
    # - iterate through team.teammembers within range
    teammembers = m.Teammember.objects.filter(team=schemeitem.team)
    for teammember in teammembers:
        logger.debug('teammember: ' + str(teammember))

# 1. check if emplhours from this schemeitem/teammmeber/rosterdate already exist
    # (happens when FillRosterdate for this rosterdate is previously used)

        # emplhour is linked with schemeitem by rosterdate / schemeitemid / teammmeberid, not by Foreignkey
        # when creating roster only one emplhour is created per orderhour. It contains status STATUS_01_CREATED = True.
        # split emplhour records or absence emplhour records have STATUS_01_CREATED = False.
        # NOT TRUE: emplhour can be made absent, which changes the parent of emplhour. Keep the connection with the schemeitem
        #       must be: employee made absent gets new emplhour record, existing gets new employee

        orderhour = None

        linked_emplhours = m.Emplhour.objects.filter(
            rosterdate=new_rosterdate_dte,
            teammemberid=teammember.id,
            schemeitemid=schemeitem.id,
            orderhour__order=schemeitem.scheme.order)
        if linked_emplhours:
# b. make list of orderhour_id of records to be deleted or skipped
            locked_orderhourid_list = []
            tobedeleted_orderhourid_list = []
            linked_emplhour = None
            for linked_emplhour in linked_emplhours:
# c. check if status is STATUS_02_START_CONFIRMED or higher
                # skip update this orderhour when it is locked or has status STATUS_02_START_CONFIRMED or higher
                if linked_emplhour.has_status_confirmed_or_higher:
                    locked_orderhourid_list.append(linked_emplhour.orderhour_id)
                    logfile.append("       Shift '" + str(shift_code) + "' of " + str(
                        schemeitem.rosterdate) + " already exist and is locked. Shift will be skipped.")
# d. check if status is STATUS_01_CREATED
                # this record is made by FillRosterdate, values of this record will be updated
                elif linked_emplhour.has_status01_created:
                    orderhour = linked_emplhour.orderhour
                    locked_orderhourid_list.append(orderhour.pk)
                    logfile.append("       Shift '" + str(shift_code) + "' of " + str(
                        schemeitem.rosterdate) + " already exist and will be overwritten.")
# e. if status is STATUS_00_NONE
                else:
                    pass
                    # Nor correct, because records made by FillRosterdate always have STATUS_01_CREATED
                    # and added records have no reammemberid therefore are not in this queryset
                    # this record is added later nad not confirmed / locked: delete this record
                    logfile.append("       Shift '" + str(shift_code) + "' of " + str(
                        schemeitem.rosterdate) + " is not planned and will be deleted.")
                    ppk_int = linked_emplhour.orderhour_id
                    tobedeleted_orderhourid_list.append(ppk_int)
# f. delete emplhour record
                    deleted_ok = m.delete_instance(linked_emplhour, {}, request)
                    if deleted_ok:
                        instance = None

# 2. delete orderhour records of deleted emplhour records
            # TODO check and correct (linked_emplhour not right, I think)
            if tobedeleted_orderhourid_list:
                for oh_pk in tobedeleted_orderhourid_list:
            # skip delete when orderhour contains emplhours that are not deleted
                    if oh_pk not in locked_orderhourid_list:
            # delete orderhour records of deleted emplhour records,
                        deleted_ok = m.delete_instance(linked_emplhour, {}, request)
                        if deleted_ok:
                            instance = None
# 3. if orderhour not exists: create new orderhour
        if orderhour is None:
    # a. create new orderhour
            yearindex = new_rosterdate_dte.year
            monthindex = new_rosterdate_dte.month
            weekindex = new_rosterdate_dte.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
            #  week 1 is de week, waarin de eerste donderdag van dat jaar zit
            # TODO payperiodindex
            payperiodindex = 0
            orderhour = m.Orderhour(
                order=schemeitem.scheme.order,
                schemeitem=schemeitem,
                rosterdate=new_rosterdate_dte,
                yearindex=yearindex,
                monthindex=monthindex,
                weekindex=weekindex,
                payperiodindex=payperiodindex,
                status=c.STATUS_01_CREATED
            )

# 4. add values to new record or replace values of existing orderhour
        if orderhour:
            orderhour.cat = shift_cat
            orderhour.isbillable = is_billable
            orderhour.isrestshift = shift_isrestshift
            orderhour.shift = shift_code
            orderhour.duration = schemeitem.timeduration
            orderhour.pricerate = pricerate
            orderhour.additionrate = additionrate
            orderhour.taxrate = tax_rate
            orderhour.amount = amount
            orderhour.tax = tax

            orderhour.save(request=request)

# 4. create new emplhour
        add_emplhour(
            orderhour=orderhour,
            schemeitem=schemeitem,
            teammember=teammember,
            shift_code=shift_code,
            shift_cat=shift_cat,
            shift_breakduration=shift_breakduration,
            shift_wagefactor=shift_wagefactor,
            shift_isrestshift=shift_isrestshift,
            timeduration=timeduration,
            logfile=logfile,
            update_list=update_list,
            entries_employee_list=entries_employee_list,
            entries_count=entries_count,
            comp_timezone=comp_timezone,
            request=request)

        # logger.debug("           entries_count '" + str(entries_count))
        # logger.debug("           entries_employee_list '" + str(entries_employee_list))

# 33333333333333333333333333333333333333333333333333

def add_emplhour(orderhour, schemeitem, teammember,
            shift_code, shift_cat, shift_breakduration, shift_wagefactor, shift_isrestshift, timeduration,
            logfile, update_list, entries_employee_list, entries_count, comp_timezone, request):
    logger.debug('add_emplhour: ' + str(add_emplhour))
    # create new emplhour
    if orderhour and schemeitem and teammember:

        # TODO give value
        payperiodindex=0
        wagerate = 0
        wage = 0
        pricerate = None
        overlap = 0

        # TODO check if wagefactor calculation is correct
        wagefactor = 0
        if teammember.wagefactor:
            wagefactor = teammember.wagefactor
        elif shift_wagefactor:
            wagefactor = shift_wagefactor

        new_emplhour = m.Emplhour(
            orderhour=orderhour,
            rosterdate=orderhour.rosterdate,
            yearindex=orderhour.yearindex,
            monthindex=orderhour.monthindex,
            weekindex=orderhour.weekindex,
            payperiodindex=payperiodindex,
            cat=shift_cat,
            isrestshift=shift_isrestshift,
            shift=shift_code,
            timestart=schemeitem.timestart,
            timeend=schemeitem.timeend,
            timeduration=timeduration,
            breakduration=shift_breakduration,
            wagerate=wagerate,
            wagefactor=wagefactor,
            wage=wage,
            pricerate=pricerate,
            status=c.STATUS_01_CREATED,
            overlap=overlap
        )

        employee_pk = 0
        employee_text = ''

        employee = teammember.employee
        if employee:
            employee_pk = employee.id
            new_emplhour.employee = employee
            new_emplhour.wagecode = employee.wagecode
            new_emplhour.wagerate = employee.wagerate
            employee_text = " with employee: " + str(employee.code) + "."

            logger.debug('with employee: ' + str(employee.code))
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

        if new_emplhour:
            # - put info in id_dict
            id_dict = {'pk': new_emplhour.pk, 'ppk': new_emplhour.orderhour.pk, 'created': True}
            update_dict = {'id': id_dict}
            logger.debug(('update_dict: ' + str(update_dict)))

            d.create_emplhour_itemdict(new_emplhour, update_dict, comp_timezone)
            logger.debug(('update_dict: ' + str(update_dict)))

            update_list.append(update_dict)

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

# >>>>>>>>>>>>>>>>>>>>>>>


def get_teammember_on_rosterdate_with_logfile(teammember, schemeitem, rosterdate_dte, absence_dict, rest_dict, logfile):

    add_teammember = False

    if teammember and rosterdate_dte:
        # don't filter teammmembers within range datefirst/datelast, but give message further

        employee = teammember.employee
# 1. skip if employee is absent
        # absence_dict = {111: 'Vakantie', 112: 'Ziek'}

        if employee.pk in absence_dict:
            range = get_range_text(teammember.datefirst, teammember.datelast)  # True: with parentheses
            logfile.append("           Employee '" + employee.code + "' is absent (" + absence_dict[employee.pk] + ") " + range + ".")
        else:
            has_rest_shift = False
            if employee.pk in rest_dict:
                # rest_dict = {111: [(timestart, timeend, cust-order), (timestart, timeend, cust-ord]}

# 3. skip if shift is within range of rest shift
                rest_list = rest_dict[employee.pk]
                for rest_item in rest_list:
                    has_rest_shift = f.period_within_range(rest_item[0], rest_item[1], schemeitem.timestart,
                                                         schemeitem.timeend)
                    if has_rest_shift:
                        logfile.append("           Employee '" + employee.code + "' has rest shift from: " + rest_item[2] + ".")
                        break

            if not has_rest_shift:
                if not f.date_within_range(employee.datefirst, employee.datelast, rosterdate_dte):
                    range = get_range_text(employee.datefirst, employee.datelast, True)  # True: with parentheses
                    logfile.append("           Employee '" + employee.code + "' not in service " + range )
                elif not f.date_within_range(teammember.datefirst, teammember.datelast, rosterdate_dte):
                    range = get_range_text(teammember.datefirst, teammember.datelast)
                    logfile.append("           Employee '" + employee.code + "', rosterdate outside shift period of employee: " + range + ".")
                else:
                    add_teammember = True


    return add_teammember


# 33333333333333333333333333333333333333333333333333

def add_absence_orderhour_emplhour(order, teammember, new_rosterdate_dte, request):  # PR2019-09-01
    logger.debug(' XXXXXXXXXXXXXX============= add_absence_orderhour_emplhour ============= ')
    logger.debug('order: ' + str(order))
    logger.debug('teammember: ' + str(teammember))
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
            isabsence=True,
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
                isabsence=True,
                status=c.STATUS_01_CREATED) # gets status created when time filled in by schemeitem
            new_emplhour.save(request=request)
            is_added = True

    return is_added


def create_absent_emplhours(new_rosterdate_dte, absence_dict, logfile, request):  # PR2019-11-18
    # 2 create create_absent_emplhours of employees who are absent on new rosterdate
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    #  LOWER(e.code) must be in SELECT
    newcursor = connection.cursor()
    newcursor.execute("""
                SELECT tm.id, o.id, tm.employee_id, e.code, o.code, tm.datefirst, tm.datelast, LOWER(e.code) 
                FROM companies_teammember AS tm 
                INNER JOIN companies_employee AS e ON (tm.employee_id = e.id)
                INNER JOIN companies_team AS t ON (tm.team_id = t.id)
                INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
                INNER JOIN companies_order AS o ON (s.order_id = o.id) 
                INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                WHERE (c.company_id = %(cid)s) AND (o.isabsence = TRUE) 
                AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)
                AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)
                AND (e.datefirst <= %(rd)s OR e.datefirst IS NULL)
                AND (e.datelast >= %(rd)s OR e.datelast IS NULL)
                ORDER BY LOWER(e.code) ASC
            """, {
        'cid': request.user.company_id,
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
            logger.debug(str(item))
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
                    team__scheme__order__isabsence=True,
                    pk=item[0]
                )
                if teammember:
                    order = teammember.team.scheme.order

# add_absence_orderhour_emplhour
                    is_added = add_absence_orderhour_emplhour(order, teammember, new_rosterdate_dte, request)

                if is_added:
                    range = get_range_text(item[5], item[6], True)  # True: with parentheses
                    logfile.append("       " + item[3] + " has absence '" + item[4] + "' " + range + ".")
                else:
                    logfile.append("       Error adding absence '" + item[4] + "' of " + item[3] + " on " + str(
                        new_rosterdate_dte.isoformat()) + ".")

    else:
        logfile.append('   no absent employees on ' + str(new_rosterdate_dte.isoformat()) + '.')


def delete_emplhours_orderhours(new_rosterdate_dte, request): # PR2019-11-18
    # delete existing shifts of this rosterdate if they are not confirmed or locked
    newcursor = connection.cursor()

# a delete emplhour records
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.

    #  - this company
    #  - this rosterdate
    #  - eh_status less than confirmed_start
    #  - oh_status less than locked
    newcursor.execute(""" 
                DELETE FROM companies_emplhour AS eh
                WHERE (eh.rosterdate = %(rd)s) 
                AND (eh.status < %(eh_status)s) 
                AND orderhour_id IN (
                    SELECT oh.id AS oh_id FROM companies_orderhour AS oh
                    INNER JOIN companies_order AS o ON (oh.order_id = o.id) 
                    INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                    WHERE (c.company_id = %(cid)s) 
                    AND (oh.status < %(oh_status)s) 
                    AND (oh.rosterdate = %(rd)s)
                )
                """, {
        'cid': request.user.company_id,
        'eh_status': c.STATUS_02_START_CONFIRMED,
        'oh_status': c.STATUS_08_LOCKED,
        'rd': new_rosterdate_dte})
    deleted_count = newcursor.rowcount

# b delete 'childless' orderhour records (i.e. without emplhour records)
    #  - this company
    #  - this rosterdate
    #  - oh_status less than locked
    #  - without emplhour records

    newcursor.execute(""" 
            DELETE FROM companies_orderhour AS oh
            WHERE order_id IN (
                SELECT o.id AS o_id FROM companies_order AS o
                INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                WHERE (c.company_id = %(cid)s) 
            )
            AND id NOT IN (
                SELECT orderhour_id FROM companies_emplhour
            )
            AND (oh.rosterdate = %(rd)s) 
            AND (oh.status < %(oh_status)s) 
            """, {
        'cid': request.user.company_id,
        'oh_status': c.STATUS_08_LOCKED,
        'rd': new_rosterdate_dte})
    deleted_count_oh = newcursor.rowcount

    return deleted_count, deleted_count_oh

#^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


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

# NOT IN USE
def create_rest_shifts(new_rosterdate_dte, absence_dict, rest_dict, logfile, request):
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
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    newcursor = connection.cursor()
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
    # rest_rows >
    # [(1380, 'Albertus, Michael', 412, 'MCB', 'Punda', datetime.date(2019, 4, 4), None, None, 'rust', 3),
    # (1380, 'Albertus, Michael', 412, 'MCB', 'Punda', datetime.date(2019, 4, 5), None, None, 'rust', 3),
    # (1554, 'Sluis, Christepher', 401, 'MCB', 'Punda', datetime.date(2019, 4, 4), None, None, 'rust', 3),
    # (1554, 'Sluis, Christepher', 401, 'MCB', 'Punda', datetime.date(2019, 4, 5), None, None, 'rust', 3),
    # (1619, 'Davelaar, Clinton', 408, 'MCB', 'Punda', datetime.date(2019, 4, 4), None, None, 'rust', 3),
    # (1619, 'Davelaar, Clinton', 408, 'MCB', 'Punda', datetime.date(2019, 4, 5), None, None, 'rust', 3)]

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

                if teammember:
                    order = teammember.team.scheme.order
                    is_added = add_absence_orderhour_emplhour(
                        order=order,
                        teammember=teammember,
                        new_rosterdate_dte=new_rosterdate_dte,
                        request=request,
                        abscat=c.SHIFT_CAT_1024_RESTSHIFT)

                if is_added:
                    logfile.append("       " + item[1] + " has rest from '" + item[3] + " - " + item[4] + "' on " + str(
                        item[5].isoformat()) + ".")
                else:
                    logfile.append("       Error adding absence '" + item[3] + "' of " + item[1] + " on " + str(
                        new_rosterdate_dte.isoformat()) + ".")
    else:
        logfile.append('   no rest shifts on ' + str(new_rosterdate_dte.isoformat()) + '.')

#######################################################

def create_customer_planning(datefirst, datelast, customer_list, comp_timezone, request):
    logger.debug(' ============= create_customer_planning ============= ')
    # this function creates a list with planned roster, without saving emplhour records  # PR2019-11-09

    # logger.debug('datefirst: ' + str(datefirst) + ' ' + str(type(datefirst)))
    # logger.debug('datelast: ' + str(datelast) + ' ' + str(type(datelast)))

    customer_planning_dictlist = []
    if datefirst and datelast:
    # this function calcuates the planning per employee per day.
    # TODO make SQL that generates rows for al dates at once, maybe also for all employees  dates at once
# A. First create a list of employee_id's, that meet the given criteria

    # 1. create 'extende range' -  add 1 day at beginning and end for overlapping shifts of previous and next day
        datefirst_dte = f.get_date_from_ISO(datefirst)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datefirst_minus_one_dtm = datefirst_dte + timedelta(days=-1)  # datefirst_dtm: 1899-12-31 <class 'datetime.date'>
        datefirst_minus_one = datefirst_minus_one_dtm.isoformat()  # datefirst_iso: 1899-12-31 <class 'str'>
        # this is not necessary: rosterdate_minus_one = rosterdate_minus_one_iso.split('T')[0]  # datefirst_extended: 1899-12-31 <class 'str'>
        # logger.debug('datefirst_minusone: ' + str(datefirst_minusone) + ' ' + str(type(datefirst_minusone)))

        datelast_dte = f.get_date_from_ISO(datelast)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_plus_one_dtm = datelast_dte + timedelta(days=1)
        datelast_plus_one = datelast_plus_one_dtm.isoformat()

    # 2. get reference date
        # reference date is the first date of the range (could be any date)
        # all offsets are calculated in minutes from the refdate.
        refdate = datefirst_minus_one

        # 2. create list of filtered employee_id's:
        # employee_list contains id's of filtered employees
        # filter: inactive=false, within range, no template
        company_id = request.user.company.pk
        customer_id_dictlist = create_customer_id_list(datefirst, datelast, customer_list, company_id)
        # logger.debug('customer_id_dictlist: ' + str(customer_id_dictlist))
        # employee_id_dictlist: {477: {}, 478: {}}

# B. loop through list of customer_id's
        for customer_id in customer_id_dictlist:
            #logger.debug('customer_id: ' + str(customer_id))

    # 1. loop through dates, also get date before and after rosterdate
        # a. loop through 'extende range' - add 1 day at beginning and end for overlapping shifts of previous and next day
            rosterdate = datefirst_minus_one
            customer_rows_dict = {}
            compare_dict = {}
            while rosterdate <= datelast_plus_one:

        # b. create dict with teammembers of this customer and this_rosterdate
                # this functions retrieves the data from the database
                rows = get_teammember_rows_per_date_per_customer(rosterdate, customer_id, refdate, company_id)
                for row in rows:
                    fake_id = str(row['tm_id']) + '-' + str(row['ddif'])
                    customer_rows_dict[fake_id] = row

        # c. add one day to rosterdate
                rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
                rosterdate_plus_one_dtm = rosterdate_dte + timedelta(days=1)
                rosterdate = rosterdate_plus_one_dtm.isoformat()

# '503-7': {'rosterdate': '2019-10-05', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 7, 'o_cat': 512, 'o_seq': 2, 'osdif': 10080, 'oedif': 11520}}
            for fid in customer_rows_dict:
                row = customer_rows_dict[fid]
                # logger.debug('row' + str(row))

        # create employee_planning dict
                planning_dict = create_customer_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone, company_id)
                if planning_dict:
                    customer_planning_dictlist.append(planning_dict)

    # logger.debug('@@@@@@@@@@@@@@@@ employee_planning_dictlist' + str(employee_planning_dictlist))

    # logger.debug('employee_planning_dictlist' + str(employee_planning_dictlist))
    return customer_planning_dictlist


def create_customer_id_list(datefirst, datelast, customer_list, company_id):
    logger.debug(' ============= create_customer_id_list ============= ')
    # this function creates a list customer_id's, that meet the given criteria PR2019-11-09

    customer_id_dictlist = {}
    if datefirst and datelast:

        # 2. set criteria:
        #  - not inactive: customer, order, scheme
        #  - teammember date in (part of) range
        #  - order date in (part of) range
        #  - scheme date in (part of) range
        #  - no template
        crit = Q(team__scheme__order__customer__company=company_id) & \
               Q(team__scheme__order__customer__inactive=False) & \
               Q(team__scheme__order__inactive=False) & \
               Q(team__scheme__inactive=False) & \
               Q(team__scheme__order__customer__cat__lt=c.SHIFT_CAT_4096_TEMPLATE) & \
               (Q(team__scheme__order__datefirst__lte=datelast) | Q(team__scheme__order__datefirst__isnull=True)) & \
               (Q(team__scheme__order__datelast__gte=datefirst) | Q(team__scheme__order__datelast__isnull=True)) & \
               (Q(team__scheme__datefirst__lte=datelast) | Q(team__scheme__datefirst__isnull=True)) & \
               (Q(team__scheme__datelast__gte=datefirst) | Q(team__scheme__datelast__isnull=True)) & \
               (Q(datefirst__lte=datelast) | Q(datefirst__isnull=True)) & \
               (Q(datelast__gte=datefirst) | Q(datelast__isnull=True))
        if customer_list:
            crit.add(Q(team__scheme__order__customer_id__in=customer_list), crit.connector)

        customer_id_list = m.Teammember.objects \
            .select_related('team') \
            .select_related('team__scheme__order') \
            .select_related('team__scheme__order__customer') \
            .select_related('team__scheme__order__customer__company') \
            .filter(crit).values_list('team__scheme__order__customer__id', flat=True).distinct().order_by(Lower('team__scheme__order__customer__code'))
        for customer_id in customer_id_list:
            customer_id_dictlist[customer_id] = {}

        logger.debug('customer_id_dictlist: ' + str(customer_id_dictlist))

    return customer_id_dictlist


def get_teammember_rows_per_date_per_customer(rosterdate, customer_id, refdate, company_id):
    logger.debug('get_teammember_rows_per_date_per_customer')
    # 1 create list of teammembers of this customer on this rosterdate

# 1 create list of teams with LEFT JOIN schemeitem and INNNER JOIN teammember
    # range from prev_rosterdate thru next_rosterdate
    # filter datefirst and datelast of: employee, teammember, order, scheme
    # filter not inactive
    # filter schemeitem for this rosterdate
    # filter employee

    # no absence, restshift, template
    newcursor = connection.cursor()
#                     WHERE (e.company_id = %(cid)s) AND (tm.cat < %(cat_lt)s)
    #                     AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)
    #                     AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)

# PR2019-11-11


# CASE WHEN field1>0 THEN field2/field1 ELSE 0 END  AS field3
    # reuse calculated fields in query only possible if you make subquery
    # from https://stackoverflow.com/questions/8840228/postgresql-using-a-calculated-column-in-the-same-query/36530228

# PR2019-11-11 don't know why i added this: ( teammember offset overrides schemeitem offset)
# CASE WHEN si_sub.sh_os IS NULL THEN CASE WHEN tm_sub.tm_os IS NULL THEN 0 ELSE tm_sub.tm_os END ELSE si_sub.sh_os END AS offsetstart,

# teammember offset is only used for absence, in that case there is no schemeitem
# field jsonsetting contains simple shifts: { 0: [480, 990, 30] 1:[...] exwk: true, exph: true }
#  1: Monday [offsetstart, offsetend, breakduration] exwk: excludeweekend, exph: excludepublicholiday

    # the e_sub group query selects the active employees within date range,
    # returns the employee code, last and first name
    # returns the offsetstart and offsetend, referenced to refdate, as array (can handle multiple absences on rosterdate)
    # [{'e_id': 1388, 'e_code': 'Adamus, Gerson', 'e_nl': 'Adamus', 'e_nf': 'Gerson Bibiano',  'sq_abs_os': [8640, 8640], 'sq_abs_oe': [10080, 10080]},
    #  {'e_id': 1637, 'e_code': 'Bulo, Herbert', 'e_nl': 'Bulo', 'e_nf': 'Herbert', 'sq_abs_os': [None], 'sq_abs_oe': [None]}]

    # the si_sub query returns de schemitems of this rosterdate
    # it returns only schemitems when the difference between si_date and rosterdate is multiple of cycle.
    # no rest shifts, no inactive schemeitems, only schemitems within date range,
    # WHERE MOD((CAST(%(rd)s AS date) - CAST(si.rosterdate AS date)), s.cycle) = 0
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    newcursor.execute("""
        SELECT
            %(rd)s AS rosterdate, sq.tm_id, sq.si_id, 
            sq.ddif, sq.offsetstart + 1440 * sq.ddif AS osdif,            
            sq.offsetend + 1440 * sq.ddif AS oedif, 
            sq.sh_os, sq.sh_oe, sq.sh_br, sq.sh_code,  
            sq.e_id, sq.e_code, sq.e_nl, sq.e_nf, sq.abs_os, sq.abs_oe, 
            sq.o_id, sq.o_code, sq.c_id, sq.comp_id, sq.c_code
        FROM (
            WITH e_sub AS (
                SELECT
                    sqe.e_id, sqe.e_code, sqe.e_nl, sqe.e_nf,  
                    ARRAY_AGG(sqe.tm_abs_os) AS abs_os,
                    ARRAY_AGG(sqe.tm_abs_oe) AS abs_oe 
                FROM (
                    WITH tm_abs AS (
                        SELECT tm.employee_id AS e_id, 
                        (CAST(%(rd)s AS date) - CAST(%(ref)s AS date)) * 1440 + COALESCE(tm.offsetstart, 0) AS ref_os, 
                        (CAST(%(rd)s AS date) - CAST(%(ref)s AS date)) * 1440 + COALESCE(tm.offsetend, 1440) AS ref_oe 
                        FROM companies_teammember AS tm 
                        WHERE (tm.cat = %(abs_cat)s)  
                        AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)  
                        AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL) 
                    )
                    SELECT e.id AS e_id, COALESCE(e.code,'-') AS e_code, e.namelast AS e_nl, e.namefirst AS e_nf, 
                        tm_abs.ref_os AS tm_abs_os, tm_abs.ref_oe AS tm_abs_oe 
                        FROM companies_employee AS e 
                        LEFT JOIN tm_abs ON (e.id = tm_abs.e_id) 
                        WHERE (e.inactive = false) 
                        AND (e.datefirst <= %(rd)s OR e.datefirst IS NULL) AND (e.datelast >= %(rd)s OR e.datelast IS NULL) 
                ) AS sqe  
                GROUP BY sqe.e_id, sqe.e_code, sqe.e_nl, sqe.e_nf 
            ), 
            si_sub AS (SELECT si.id AS si_id, si.team_id AS t_id,  
                sh.code AS sh_code, 
                sh.offsetstart AS sh_os, sh.offsetend AS sh_oe, sh.breakduration AS sh_br,
                s.cycle AS s_c, s.datefirst AS s_df, s.datelast AS s_dl  
                FROM companies_schemeitem AS si 
                LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
                INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
                WHERE (si.inactive = false) 
                AND MOD((CAST(%(rd)s AS date) - CAST(si.rosterdate AS date)), s.cycle) = 0 
                AND (NOT sh.isrestshift) 
                AND (s.datefirst <= %(rd)s OR s.datefirst IS NULL) 
                AND (s.datelast >= %(rd)s OR s.datelast IS NULL)
            ) 
            SELECT tm.id AS tm_id, t.id AS t_id, 
            e_sub.e_id, e_sub.e_code, e_sub.e_nl, e_sub.e_nf, e_sub.abs_os, e_sub.abs_oe, 
            o.id AS o_id, o.code AS o_code, 
            o.datefirst AS o_df, o.datelast AS o_dl, c.id AS c_id, c.code AS c_code, c.company_id AS comp_id, 
            si_sub.si_id, si_sub.sh_code, si_sub.sh_os, si_sub.sh_oe, si_sub.sh_br, si_sub.s_c, si_sub.s_df, si_sub.s_dl, 
            (CAST(%(rd)s AS date) - CAST(%(ref)s AS date)) AS ddif,  
            CASE WHEN si_sub.sh_os IS NULL THEN CASE WHEN tm.offsetstart IS NULL THEN 0 ELSE tm.offsetstart END ELSE si_sub.sh_os END AS offsetstart, 
            CASE WHEN si_sub.sh_oe IS NULL THEN CASE WHEN tm.offsetend IS NULL THEN 1440 ELSE tm.offsetend END ELSE si_sub.sh_oe END AS offsetend 
            FROM companies_teammember AS tm 
            LEFT JOIN e_sub ON (tm.employee_id = e_sub.e_id)
            INNER JOIN companies_team AS t ON (tm.team_id = t.id) 
            INNER JOIN si_sub ON (t.id = si_sub.t_id)
            INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
            INNER JOIN companies_order AS o ON (s.order_id = o.id) 
            INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
            WHERE (c.company_id = %(cid)s) AND (c.id = %(cust_id)s) 
            AND (tm.cat < %(abs_cat)s) 
            AND (o.datefirst <= %(rd)s OR o.datefirst IS NULL)
            AND (o.datelast >= %(rd)s OR o.datelast IS NULL)
            AND (s.inactive = false) AND (o.inactive = false)  
        ) AS sq  
        ORDER BY sq.c_code ASC, sq.o_code ASC, rosterdate ASC, osdif ASC
            """, {
                'cid': company_id,
                'abs_cat': c.SHIFT_CAT_0512_ABSENCE,
                'cust_id': customer_id,
                'rd': rosterdate,
                'ref': refdate
                })

    logger.debug("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")
    rows = f.dictfetchall(newcursor)
    logger.debug(str(rows))
    logger.debug("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")

    # row: [{'rosterdate': '2019-11-07', 'tm_id': 545, 'si_id': 386, 'ddif': 6, 'osdif': 8610, 'oedif': 9060, 'sh_os': -30, 'sh_oe': 420, 'sh_br': 30, 'sh_code': 'nacht', 'e_id': None, 'e_code': None, 'e_nl': None, 'e_nf': None, 'abs_os': None, 'abs_oe': None, 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'},
    #       {'rosterdate': '2019-11-07', 'tm_id': 573, 'si_id': 387, 'ddif': 6, 'osdif': 9060, 'oedif': 9540, 'sh_os': 420, 'sh_oe': 900, 'sh_br': 60, 'sh_code': 'dag', 'e_id': 1386, 'e_code': 'Bernardus-Cornelis, Yaha', 'e_nl': 'Bernardus-Cornelis', 'e_nf': 'Yahaira Kemberly Girigoria', 'abs_os': [8640, 8640], 'abs_oe': [10080, 10080], 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'},
    #       {'rosterdate': '2019-11-07', 'tm_id': 542, 'si_id': 388, 'ddif': 6, 'osdif': 9540, 'oedif': 10050, 'sh_os': 900, 'sh_oe': 1410, 'sh_br': 30, 'sh_code': 'avond', 'e_id': 1667, 'e_code': 'Nocento, Rodney', 'e_nl': 'Nocento', 'e_nf': 'Rodney', 'abs_os': [None], 'abs_oe': [None], 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'}]

    return rows

def check_absent_employee(row):
    # roww: {'rosterdate': '2019-11-07', 'tm_id': 573, 'si_id': 387,
    # 'ddif': 6, 'osdif': 9060, 'oedif': 9540, 'sh_os': 420, 'sh_oe': 900, 'sh_br': 60,
    # 'sh_code': 'dag', 'e_id': 1386, 'e_code': 'Bernardus-Cornelis, Yaha',
    # 'abs_os': [8640, 8640], 'abs_oe': [10080, 10080],
    # 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'},
    # abs_os contains list of referenced offsetstart of (multple) absent rows
    # abs_oe contains list of corresponding referenced offsetend
    is_absent = False
    abs_os = row.get('abs_os')   # 'abs_os': [8640, 8640]
    abs_oe = row.get('abs_oe')   # 'abs_oe': [10080, 10080]
    ref_shift_os = row.get('osdif')   # 'osdif': 9060,
    ref_shift_oe = row.get('oedif')   # 'oedif': 9540,
    if abs_os and abs_oe:
        for index, abs_os_value in enumerate(abs_os):
            # get corresponding value in abs_oe
            abs_oe_value = abs_oe[index]
            if abs_os_value and abs_oe_value:
                is_absent = f.check_offset_overlap(abs_os_value, abs_oe_value, ref_shift_os, ref_shift_oe)
                if is_absent:
                    break

    return is_absent

def create_customer_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone, company_id): # PR2019-10-27
    logger.debug(' --- create_customer_planning_dict --- ')
    # logger.debug('row: ' + str(row))
    # row: {'rosterdate': '2019-09-28', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan',
    # 'ddif': 0, 'o_cat': 512, 'o_seq': 1, 'osdif': 0, 'oedif': 1440}
    planning_dict = {}
    if row:
        rosterdate = row['rosterdate']

        employee_is_absent = check_absent_employee(row)

    # skip teammemebers of schemes that are not assigned to schemeitem
        # skip if shift is not absence and has no schemeitem >> is filtered in query

        rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        # to skip datefirst_dte_minus_one and datelast_dte_plus_one
        if datefirst_dte <= rosterdate_dte <= datelast_dte:
            # a. convert rosterdate '2019-08-09' to datetime object
            rosterdatetime_naive = f.get_datetime_naive_from_ISOstring(rosterdate)
            # logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))

            timestart = f.get_datetimelocal_from_offset(
                rosterdate=rosterdatetime_naive,
                offset_int=row['sh_os'],
                comp_timezone=comp_timezone)

            # c. get endtime from rosterdate and offsetstart
            # logger.debug('c. get endtime from rosterdate and offsetstart ')
            timeend = f.get_datetimelocal_from_offset(
                rosterdate=rosterdatetime_naive,
                offset_int=row['sh_oe'],
                comp_timezone=comp_timezone)
            # logger.debug(' timeend: ' + str(timeend) + ' ' + str(type(timeend)))
            # fake orderhours_pk equals fake emplhour_pk
            planning_dict = {'id': {'pk': fid, 'ppk': fid, 'table': 'planning'}, 'pk': fid}

            if employee_is_absent:
                planning_dict['employee'] = {'pk': None, 'ppk': None, 'value': _('(absent)')}
            else:
                planning_dict['employee'] = {
                    'pk': row['e_id'],
                    'ppk': company_id,
                    'value': row.get('e_code', '-')
                }

            planning_dict['order'] = {
                'pk': row['o_id'],
                'ppk': row['c_id'],
                'value': row.get('o_code','')
            }

            planning_dict['customer'] = {
                'pk': row['c_id'],
                'ppk': row['comp_id'],
                'value': row.get('c_code','')
            }

            planning_dict['rosterdate'] = {'value': rosterdate}
            planning_dict['shift'] = {'value': row['sh_code']}

            planning_dict['timestart'] = {'field': "timestart", 'datetime': timestart, 'offset': row.get('sh_os')}
            planning_dict['timeend'] = {'field': "timeend", 'datetime': timeend, 'offset': row.get('sh_oe')}

            # TODO delete and specify overlap
            if 'overlap' in row:
                planning_dict['overlap'] = {'value': row['overlap']}

            breakduration = row.get('sh_br', 0)
            if breakduration:
                planning_dict['breakduration'] = {'field': "breakduration", 'value': breakduration}

            duration = 0
            offset_start = row.get('sh_os')
            offset_end = row.get('sh_oe')

            if offset_start is not None and offset_end is not None:
                duration = offset_end - offset_start - breakduration
            planning_dict['duration'] = {'field': "duration", 'value': duration}


            # monthindex: {value: 4}
            # weekindex: {value: 15}
            # yearindex: {value: 2019}
    logger.debug('planning_dict' + str(planning_dict))
    return planning_dict


#######################################################

def create_employee_planning(datefirst, datelast, employee_list, comp_timezone, request):
    # logger.debug(' ============= create_employee_planning ============= ')
# this function creates a list with planned roster, without saving emplhour records  # PR2019-10-24

    # logger.debug('datefirst: ' + str(datefirst) + ' ' + str(type(datefirst)))
    # logger.debug('datelast: ' + str(datelast) + ' ' + str(type(datelast)))

    employee_planning_dictlist = []
    if datefirst and datelast:
    # this function calcuates the planning per employee per day.
    # TODO make SQL that generates rows for al dates at once, maybe also for all employees  dates at once

# A. First create a list of employee_id's, that meet the given criteria

    # 1. create 'extende range' -  add 1 day at beginning and end for overlapping shifts of previous and next day
        datefirst_dte = f.get_date_from_ISO(datefirst)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datefirst_minus_one_dtm = datefirst_dte + timedelta(days=-1)  # datefirst_dtm: 1899-12-31 <class 'datetime.date'>
        datefirst_minus_one = datefirst_minus_one_dtm.isoformat()  # datefirst_iso: 1899-12-31 <class 'str'>
        # this is not necessary: rosterdate_minus_one = rosterdate_minus_one_iso.split('T')[0]  # datefirst_extended: 1899-12-31 <class 'str'>
        # logger.debug('datefirst_minusone: ' + str(datefirst_minusone) + ' ' + str(type(datefirst_minusone)))

        datelast_dte = f.get_date_from_ISO(datelast)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_plus_one_dtm = datelast_dte + timedelta(days=1)
        datelast_plus_one = datelast_plus_one_dtm.isoformat()

    # 2. get reference date
        # reference date is the first date of the range (could be any date)
        # all offsets are calculated in minutes from the refdate.
        refdate = datefirst_minus_one

    # 2. create list of filtered employee_id's:
        # employee_list contains id's of filtered employees
        # filter: inactive=false, within range, no template
        company_id = request.user.company.pk
        employee_id_dictlist = create_employee_id_list(datefirst, datelast, employee_list, company_id)
        # logger.debug('employee_id_dictlist: ' + str(employee_id_dictlist))
        # employee_id_dictlist: {1388: {}, 1380: {}, 1465: {}, 1494: {}, 1384: {}, 1414: {}, 1609: {}, 1669: {}}

# B. loop through list of employee_id's
        for employee_id in employee_id_dictlist:

    # 1. loop through dates, also get date before and after rosterdate
        # a. loop through 'extende range' - add 1 day at beginning and end for overlapping shifts of previous and next day
            rosterdate = datefirst_minus_one
            employee_rows_dict = {}
            compare_dict = {}
            while rosterdate <= datelast_plus_one:

        # b. create dict with teammembers of this employee and this_rosterdate
                # this functions retrieves the data from the database
                rows = get_teammember_rows_per_date_per_employee(rosterdate, employee_id, refdate, company_id)
                for row in rows:
                    fake_id = str(row['tm_id']) + '-' + str(row['ddif'])
                    employee_rows_dict[fake_id] = row

        # c. split rows in absencerows, restrows and shiftrows
                    add_to_compare_dict(fake_id, row, compare_dict)

        # c. add one day to rosterdate
                rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
                rosterdate_plus_one_dtm = rosterdate_dte + timedelta(days=1)
                rosterdate = rosterdate_plus_one_dtm.isoformat()

# employee_rows_dict{
# '469-0': {'rosterdate': '2019-09-28', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 0, 'o_cat': 512, 'o_seq': 1, 'osdif': 0, 'oedif': 1440},
# '469-1': {'rosterdate': '2019-09-29', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 1, 'o_cat': 512, 'o_seq': 1, 'osdif': 1440, 'oedif': 2880},
# '469-2': {'rosterdate': '2019-09-30', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 2, 'o_cat': 512, 'o_seq': 1, 'osdif': 2880, 'oedif': 4320},
# '469-3': {'rosterdate': '2019-10-01', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 3, 'o_cat': 512, 'o_seq': 1, 'osdif': 4320, 'oedif': 5760},
# '503-4': {'rosterdate': '2019-10-02', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 4, 'o_cat': 512, 'o_seq': 2, 'osdif': 5760, 'oedif': 7200},
# '503-5': {'rosterdate': '2019-10-03', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 5, 'o_cat': 512, 'o_seq': 2, 'osdif': 7200, 'oedif': 8640},
# '503-6': {'rosterdate': '2019-10-04', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 6, 'o_cat': 512, 'o_seq': 2, 'osdif': 8640, 'oedif': 10080},
# '503-7': {'rosterdate': '2019-10-05', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 7, 'o_cat': 512, 'o_seq': 2, 'osdif': 10080, 'oedif': 11520}}
            for fid in employee_rows_dict:
                row = employee_rows_dict[fid]
                # logger.debug('row' + str(row))

    # check if shift has overlap with other shifts
                has_overlap, delete_this_row = compare_rows(fid, row, compare_dict)
    # skip if this row must be deleted
                if not delete_this_row:
                    if has_overlap:
                        row['overlap'] = True

        # create employee_planning dict
                    planning_dict = create_employee_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone, company_id)
                    if planning_dict:
                        employee_planning_dictlist.append(planning_dict)

    # logger.debug('@@@@@@@@@@@@@@@@ employee_planning_dictlist' + str(employee_planning_dictlist))

    # logger.debug('employee_planning_dictlist' + str(employee_planning_dictlist))
    return employee_planning_dictlist


def create_employee_id_list(datefirst, datelast, employee_list, company_id):
    # logger.debug(' ============= create_employee_id_list ============= ')
    # this function creates a list employee_id's, that meet the given criteria PR2019-10-28

    employee_id_dictlist = {}
    if datefirst and datelast:

# 2. set criteria:
        #  - employee not null
        #  - not inactive: employee, customer, order, scheme
        #  - empoloyee in service in (part of) range,
        #  - teammember date in (part of) range
        #  - order date in (part of) range
        #  - scheme date in (part of) range
        #  - no template
        crit = Q(team__scheme__order__customer__company=company_id) & \
               Q(employee__isnull=False) & \
               Q(employee__inactive=False) & \
               Q(team__scheme__order__customer__inactive=False) & \
               Q(team__scheme__order__inactive=False) & \
               Q(team__scheme__inactive=False) & \
               Q(team__scheme__order__customer__cat__lt=c.SHIFT_CAT_4096_TEMPLATE) & \
               (Q(employee__datefirst__lte=datelast) | Q(employee__datefirst__isnull=True)) & \
               (Q(employee__datelast__gte=datefirst) | Q(employee__datelast__isnull=True)) & \
               (Q(team__scheme__order__datefirst__lte=datelast) | Q(team__scheme__order__datefirst__isnull=True)) & \
               (Q(team__scheme__order__datelast__gte=datefirst) | Q(team__scheme__order__datelast__isnull=True)) & \
               (Q(team__scheme__datefirst__lte=datelast) | Q(team__scheme__datefirst__isnull=True)) & \
               (Q(team__scheme__datelast__gte=datefirst) | Q(team__scheme__datelast__isnull=True)) & \
               (Q(datefirst__lte=datelast) | Q(datefirst__isnull=True)) & \
               (Q(datelast__gte=datefirst) | Q(datelast__isnull=True))
        if employee_list:
            crit.add(Q(employee__id__in=employee_list), crit.connector)

        employee_id_list = m.Teammember.objects\
            .select_related('employee')\
            .select_related('team')\
            .select_related('team__scheme__order')\
            .select_related('team__scheme__order__customer')\
            .select_related('team__scheme__order__customer__company')\
            .filter(crit).values_list('employee__id', flat=True).distinct().order_by(Lower('employee__code'))
        for employee_id in employee_id_list:
            employee_id_dictlist[employee_id] = {}
    return employee_id_dictlist


def get_teammember_rows_per_date_per_employee(rosterdate, employee_id, refdate, company_id):
    # 1 create list of teammembers of this employee on this rosterdate

# 1 create list of teams with LEFT JOIN schemeitem and INNNER JOIN teammember
    # range from prev_rosterdate thru next_rosterdate
    # filter datefirst and datelast of: employee, teammember, order, scheme
    # filter not inactive
    # filter schemeitem for this rosterdate
    # filter employee

# CASE WHEN field1>0 THEN field2/field1 ELSE 0 END  AS field3
    # reuse calculated fields in query only possible if you make subquery
    # from https://stackoverflow.com/questions/8840228/postgresql-using-a-calculated-column-in-the-same-query/36530228
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.

    # get teams of this rosterdate with:
    #  - filter this company
    #  - no template
    #  - rosterdate within range of order
    #  - scheme and order not inactive
    # LEFT JOIN schemeitem with: (also teams without schemeitem are given)
    #  - has correct cycleday
    #  - rosterdate within range of scheme
    # INNER JOIN teammembers with:
    #  - INNER JOINN employees (only teammembers with employee are given
    #  - filter this employee company
    #  - no template
    #  - rosterdate within range of employee
    #  - rosterdate within range of teammember
    #  - employee not inactive
    newcursor = connection.cursor()
    newcursor.execute("""
        SELECT
            %(rd)s AS rosterdate, sq.tm_id, sq.si_id, 
            sq.ddif, sq.o_cat, sq.o_seq, 
            sq.offsetstart + 1440 * sq.ddif AS osdif,            
            sq.offsetend + 1440 * sq.ddif AS oedif, 
            sq.sh_os, sq.sh_oe, sq.sh_br, sq.sh_code, sq.sh_rest, 
            sq.e_id, sq.e_code, sq.e_nl, sq.e_nf, 
            sq.s_id, sq.s_code, 
            sq.o_id, sq.o_code, sq.o_abs, 
            sq.c_id, sq.c_code, sq.comp_id 
        FROM (
            WITH tm_sub AS (
                    SELECT tm.id AS tm_id, tm.team_id AS t_id,e.id AS e_id, e.code AS e_code, e.namelast AS e_nl, e.namefirst AS e_nf, 
                    e.datefirst AS e_df, e.datelast AS e_dl, tm.datefirst AS tm_df, tm.datelast AS tm_dl, 
                    tm.offsetstart AS tm_os, tm.offsetend AS tm_oe 
                    FROM companies_teammember AS tm 
                    INNER JOIN companies_employee AS e ON (tm.employee_id = e.id) 
                    WHERE (e.company_id = %(cid)s) AND (tm.cat < %(cat_lt)s) 
                    AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)
                    AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)
                    AND (e.datefirst <= %(rd)s OR e.datefirst IS NULL)
                    AND (e.datelast >= %(rd)s OR e.datelast IS NULL) 
                    AND (e.inactive = false) 
                    AND (tm.employee_id = %(eid)s)
                ), 
                si_sub AS (SELECT si.id AS si_id, si.team_id AS t_id,  
                    sh.code AS sh_code, sh.isrestshift AS sh_rest, 
                    sh.offsetstart AS sh_os, sh.offsetend AS sh_oe, sh.breakduration AS sh_br 
                    FROM companies_schemeitem AS si 
                    LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
                    INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
                    WHERE MOD((CAST(%(rd)s AS date) - CAST(si.rosterdate AS date)), s.cycle) = 0 
                    AND (s.datefirst <= %(rd)s OR s.datefirst IS NULL) 
                    AND (s.datelast >= %(rd)s OR s.datelast IS NULL)
                ) 
            SELECT t.id AS t_id, 
            s.id AS s_id, s.code AS s_code, s.cycle AS s_c, s.datefirst AS s_df, s.datelast AS s_dl,   
            o.id AS o_id, o.code AS o_code, o.cat AS o_cat, o.sequence AS o_seq, o.isabsence AS o_abs, 
            o.datefirst AS o_df, o.datelast AS o_dl, c.id AS c_id, c.code AS c_code, c.company_id AS comp_id, 
            tm_sub.tm_id, tm_sub.e_id, tm_sub.e_code, tm_sub.e_nl, tm_sub.e_nf, tm_sub.e_df, tm_sub.e_dl, tm_sub.tm_df, tm_sub.tm_dl, tm_sub.tm_os, tm_sub.tm_oe,
            si_sub.si_id, si_sub.sh_code, si_sub.sh_rest, si_sub.sh_os, si_sub.sh_oe, si_sub.sh_br, 
            (CAST(%(rd)s AS date) - CAST(%(ref)s AS date)) AS ddif,  
            CASE WHEN si_sub.sh_os IS NULL THEN CASE WHEN tm_sub.tm_os IS NULL THEN 0 ELSE tm_sub.tm_os END ELSE si_sub.sh_os END AS offsetstart, 
            CASE WHEN si_sub.sh_oe IS NULL THEN CASE WHEN tm_sub.tm_oe IS NULL THEN 1440 ELSE tm_sub.tm_oe END ELSE si_sub.sh_oe END AS offsetend 
            FROM companies_team AS t 
            INNER JOIN tm_sub ON (t.id = tm_sub.t_id)
            LEFT JOIN si_sub ON (t.id = si_sub.t_id)
            INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
            INNER JOIN companies_order AS o ON (s.order_id = o.id) 
            INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
            WHERE (c.company_id = %(cid)s) AND (o.cat < %(cat_lt)s) 
            AND (o.datefirst <= %(rd)s OR o.datefirst IS NULL)
            AND (o.datelast >= %(rd)s OR o.datelast IS NULL)
            AND (s.inactive = false) AND (o.inactive = false)  
        ) AS sq  
            """, {
                'cid': company_id,
                'cat_lt': c.SHIFT_CAT_4096_TEMPLATE,
                'eid': employee_id,
                'rd': rosterdate,
                'ref': refdate
                })
    rows = f.dictfetchall(newcursor)

    # row: {'rosterdate': '2019-10-02', 't_id': 1515, 'o_id': 1188, 'o_code': 'Buitengewoon', 'o_cat': 512, 'o_seq': 3,
    # 'o_df': None, 'o_dl': None, 'c_id': 477, 'c_code': 'Afwezig', 'tm_id': 504,
    # 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'e_df': datetime.date(2018, 6, 13), 'e_dl': datetime.date(2019, 12, 20),
    # 'tm_df': None, 'tm_dl': None, 'si_rd': None, 'sh_code': None,
    # 'sh_os': None, 'sh_oe': None, 's_c': None, 's_df': None, 's_dl': None}

    return rows


def add_to_compare_dict(fid, row, tm_dicts):
    # list of extendesd rows: employee_id: { ddif: [ [cat, osdif, oedif, seq], [cat, osdif, oedif, seq] ],  ddif: [] }
    #  cat = shift, rest, abs
    # fid added to skip current row when comparing, otherwise it will compare with itself
    if row:
        # row: {'rosterdate': '2019-10-01', 'tm_id': 505, 'e_id': 1374, 'e_code': 'Zimmerman, Braijen',
        #       'ddif': 3, 'o_cat': 512, 'osdif': None, 'oedif': None}

# create tm_row
        # tm_row = [osdif, oedif, cat, seq],
        is_absence = row.get('o_abs', False)
        is_restshift = row.get('sh_rest', False)
        if is_absence:  # was: f.get_absence(row['o_cat']):
            cat = 'a'
        elif is_restshift:  # was:  row['sh_rest']:
            cat = 'r'
        else:
            cat = 's'
        tm_row = [fid, cat, row['osdif'], row['oedif'], row['o_seq']]

# add tm_row to list of previous day, current day and next day
        #  tm_dicts = { 0: [], 1: []}
        for idx in [-1,0,1]:
            ddif = row['ddif'] + idx
            if ddif not in tm_dicts:
                tm_dicts[ddif] = []
            tm_dicts[ddif].append(tm_row)


def compare_rows(fid, row, compare_dict):
    logger.debug(" --- compare_rows ---")
    # This function checks for overlap

    # compare_dict: {
    # -1: [['568-0', 'a', 0, 1440, 4]],
    #  0: [['568-0', 'a', 0, 1440, 4], ['568-1', 'a', 1440, 2880, 4]],
    #  1: [['568-0', 'a', 0, 1440, 4], ['568-1', 'a', 1440, 2880, 4], ['568-2', 'a', 2880, 4320, 4]],
    #  2: [['568-1', 'a', 1440, 2880, 4], ['568-2', 'a', 2880, 4320, 4], ['568-3', 'a', 4320, 5760, 4]]}


    #  rows
    # {{'469-0': {'rosterdate': '2019-09-28', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 0, 'o_cat': 512, 'o_seq': 1, 'osdif': 0, 'oedif': 1440},
    # '469-1': {'rosterdate': '2019-09-29', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 1, 'o_cat': 512, 'o_seq': 1, 'osdif': 1440, 'oedif': 2880},
    # '469-2': {'rosterdate': '2019-09-30', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 2, 'o_cat': 512, 'o_seq': 1, 'osdif': 2880, 'oedif': 4320},
    # '469-3': {'rosterdate': '2019-10-01', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 3, 'o_cat': 512, 'o_seq': 1, 'osdif': 4320, 'oedif': 5760},
    # '503-3': {'rosterdate': '2019-10-01', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 3, 'o_cat': 512, 'o_seq': 2, 'osdif': 4320, 'oedif': 5760},
    # '503-4': {'rosterdate': '2019-10-02', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 4, 'o_cat': 512, 'o_seq': 2, 'osdif': 5760, 'oedif': 7200},
    # '503-5': {'rosterdate': '2019-10-03', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 5, 'o_cat': 512, 'o_seq': 2, 'osdif': 7200, 'oedif': 8640},
    # '503-6': {'rosterdate': '2019-10-04', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 6, 'o_cat': 512, 'o_seq': 2, 'osdif': 8640, 'oedif': 10080},
    # '503-7': {'rosterdate': '2019-10-05', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 7, 'o_cat': 512, 'o_seq': 2, 'osdif': 10080, 'oedif': 11520}}

    has_overlap = False
    delete_this_row = False

# 1. get ext_tm_list (extended teammember dict) from compare_dict
    ddiff = row['ddif']
    ext_tm_list = compare_dict.get(ddiff)
    if ext_tm_list:
        is_absence = row.get('o_abs', False)
        is_restshift = row.get('sh_rest', False)
        if is_absence: # was  f.get_absence(row['o_cat']):
            cat = 'a'
        elif is_restshift: # was row['sh_rest']:
            cat = 'r'
        else:
            cat = 's'
        cur_row = [fid, cat, row['osdif'], row['oedif'], row['o_seq']]

# loop through rows of ext_tm_list
        # ext_tm_list: [['568-0', 'a', 0, 1440, 4], ['568-1', 'a', 1440, 2880, 4]],
        for ext_row in ext_tm_list:
            ext_tm_fid = ext_row[0]
# skip the current row in ext_tm_list
            if fid != ext_tm_fid:
                # check if cur_row and ext_row have overlap
                overlap, delete = f.check_shift_overlap(cur_row, ext_row)
                if overlap:
                    has_overlap = True
                    if delete:
                        delete_this_row = True
                        break
                    # delete row if it has overlap
                    # TODO: this doesn't take in account 'double overlap': row may pop because of row that will pop later

                    # popped = employee_rows.pop(cur_fid)
                    # logger.debug("popped: " + str(popped))

    return has_overlap, delete_this_row
#$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$


def check_overlapping_shiftrows(employee_rows, employee_dict):
    logger.debug(" --- check_overlapping_shiftrows ---")
    # This function checks if shifts overlap absence rows, rest rows and other shift rows

    # employee_dict{
    # 2: {'shift': {'ext': {'544-1': {}}},
    # 	  'abs':   {'cur': {'570-2': {}}, 'ext': {'570-1': {}, '570-2': {}, '570-3': {}} },
    # 	  'rest':  {'cur': {'544-2': {}}, 'ext': {'544-2': {}, '544-3': {}}}},


# 1. iterate over days in employee_dict with 'cur' rows in cat 'abs'
    for ddif in employee_dict:
        ddict = employee_dict[ddif]
# look for ['abs']['cur'] dict (
        shift_dict = ddict.get('shift')
        if shift_dict:
            cur_shift_dict = shift_dict.get('cur')
            if cur_shift_dict:
                ext_shift_dict = shift_dict.get('ext')

                ext_rest_dict = {}
                rest_dict = ddict.get('rest')
                if rest_dict:
                    ext_rest_dict = rest_dict.get('ext')

# check for overlap with extended absence rows
                abs_dict = ddict.get('abs')
                if abs_dict:
                    ext_abs_dict = abs_dict.get('ext')
                    if ext_abs_dict:
                        for cur_fid in cur_shift_dict:
                            cur_row = employee_rows.get(cur_fid)  # row may be deleted
                            if cur_row:
                                for ext_fid in ext_abs_dict:
                                    # skip current row
                                    if ext_fid != cur_fid:
                                        ext_row = employee_rows.get(ext_fid)  # row may be deleted
                                        # check if cur_row and ext_row have overlap
                                        has_overlap = f.check_shift_overlap(cur_row, ext_row)
                                        if has_overlap:
                                            # delete row if it has overlap
                                            popped = employee_rows.pop(cur_fid)
                                            logger.debug("popped: " + str(popped))
                                            break


def create_employee_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone, company_id): # PR2019-10-27
    # logger.debug(' --- create_employee_planning_dict --- ')
    logger.debug('row: ' + str(row))
    # row: {'rosterdate': '2019-09-28', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan',
    # 'ddif': 0, 'o_cat': 512, 'o_seq': 1, 'osdif': 0, 'oedif': 1440}
    planning_dict = {}
    if row:
        rosterdate = row['rosterdate']
        is_absence = row.get('o_abs', False)
        is_restshift = row.get('sh_rest', False)

    # skip teammemebers of schemes that are not assigned to schemeitem
        # skip if shift is not absence and has no schemeitem
        has_schemeitem = row.get('si_id', False)
        if is_absence or has_schemeitem:

            rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
            # to skip datefirst_dte_minus_one and datelast_dte_plus_one
            if datefirst_dte <= rosterdate_dte <= datelast_dte:
                # a. convert rosterdate '2019-08-09' to datetime object
                rosterdatetime_naive = f.get_datetime_naive_from_ISOstring(rosterdate)
                # logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))

                offset_start = row.get('sh_os')
                offset_end = row.get('sh_oe')

                timestart = f.get_datetimelocal_from_offset(
                    rosterdate=rosterdatetime_naive,
                    offset_int=offset_start,
                    comp_timezone=comp_timezone)
                logger.debug(' timestart: ' + str(timestart) + ' ' + str(type(timestart)))

                # c. get endtime from rosterdate and offsetstart
                # logger.debug('c. get endtime from rosterdate and offsetstart ')
                timeend = f.get_datetimelocal_from_offset(
                    rosterdate=rosterdatetime_naive,
                    offset_int=offset_end,
                    comp_timezone=comp_timezone)
                logger.debug(' timeend: ' + str(timeend) + ' ' + str(type(timeend)))
                # fake orderhours_pk equals fake emplhour_pk
                planning_dict = {'id': {'pk': fid, 'ppk': fid, 'table': 'planning'}, 'pk': fid}

                planning_dict['cat'] = {'value': row['o_cat']}
                planning_dict['employee'] = {
                    'pk': row['e_id'],
                    'ppk': company_id,
                    'value': row.get('e_code', ''),
                    'namelast': row.get('e_nl', ''),
                    'namefirst': row.get('e_nf', ''), }

                planning_dict['order'] = {
                    'pk': row['o_id'],
                    'ppk': row['c_id'],
                    'value': row.get('o_code',''),
                    'isabsence': is_absence
                }

                planning_dict['scheme'] = {
                    'pk': row['s_id'],
                    'ppk': row['o_id'],
                    'value': row.get('s_code','')
                }

                planning_dict['customer'] = {
                    'pk': row['c_id'],
                    'ppk': row['comp_id'],
                    'value': row.get('c_code','')
                }

                planning_dict['rosterdate'] = {'value': rosterdate}
                planning_dict['shift'] = {'value': row['sh_code'], 'isrestshift': is_restshift}

                planning_dict['timestart'] = {'field': "timestart", 'datetime': timestart, 'offset': offset_start}
                planning_dict['timeend'] = {'field': "timeend", 'datetime': timeend, 'offset': offset_end}

                # TODO delete and specify overlap
                if 'overlap' in row:
                    planning_dict['overlap'] = {'value': row['overlap']}

                breakduration = row.get('sh_br', 0)
                if breakduration:
                    planning_dict['breakduration'] = {'field': "breakduration", 'value': breakduration}

                duration = 0

                if offset_start is not None and offset_end is not None:
                    if not is_absence and not is_restshift:
                        duration = offset_end - offset_start - breakduration
                planning_dict['duration'] = {'field': "duration", 'value': duration}


                # monthindex: {value: 4}
                # weekindex: {value: 15}
                # yearindex: {value: 2019}
    return planning_dict

# [{'rosterdate': '2019-04-13', 't_id': 1410, 'o_id': 1145, 'o_code': 'Punda', 'o_df': None, 'o_dl': None, 'c_code': 'MCB',
# 'tm_id': 408, 'e_id': 1619, 'e_code': 'Davelaar, Clinton', 'e_df': datetime.date(2012, 1, 1), 'e_dl': None,
# 'tm_df': None, 'tm_dl': None, 'si_rd': datetime.date(2019, 4, 16),
# 'sh_code': 'rust', 'sh_os': 600, 'sh_oe': 2160, 's_c': 3, 's_df': None, 's_dl': None}]

# check if si.rosterdate equals rosetdrate: (CAST(rdate AS date) - CAST(si.rdte AS date)) as DateDifference
# datediff_days // cycle_int

# filter cycle_schemeiteam goes as follos:
# cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
# get DateDifference between this_rosterdate and si_rosterdate:
# (CAST(this_rosterdate AS date) - CAST(si_rosterdate AS date)) as DateDifference
# si_rosterdate is cycledate when remainder of diff / cydcle is 0
# Python: // operator: Floor division - division that results into whole number adjusted to the left in the number line
# Python remainder is: datediff_days // cycle_int = 0
# Postgresql: remainder is modulo function: MOD(x,y) or:
# Postgresql remainder is: MOD((CAST(this_rosterdate AS date) - CAST(si_rosterdate AS date)), cycle) = 0

# end of create_employee_planning_dictlist
#######################################################
