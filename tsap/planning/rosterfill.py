# PR2019-07-31
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Value
from django.db.models.functions import Lower, Coalesce
from django.http import HttpResponse

from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView

from datetime import datetime, timedelta

from companies.views import LazyEncoder

from tsap import constants as c
from tsap import functions as f
from tsap import validators as v

from planning.dicts import get_rosterdatefill_dict, create_emplhour_list,\
    get_period_from_settings, get_timesstartend_from_perioddict

from tsap.settings import TIME_ZONE, LANGUAGE_CODE

from companies import models as m

import json

import logging
logger = logging.getLogger(__name__)


@method_decorator([login_required], name='dispatch')
class EmplhourFillRosterdateView(UpdateView):  # PR2019-05-26

    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= EmplhourFillRosterdateView ============= ')

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

                if 'fill' in rosterdate_fill_dict:
                    rosterdate_str = rosterdate_fill_dict['fill']
                    rosterdate_fill_dte, msg_txt = f.get_date_from_ISOstring(rosterdate_str)
                    logfile = []
                    FillRosterdate(rosterdate_fill_dte, request, comp_timezone, logfile)

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

                show_all = False
                list = create_emplhour_list(company=request.user.company,
                                                     comp_timezone=comp_timezone,
                                                     user_lang=user_lang,
                                                     time_min=period_timestart_utc,
                                                     time_max=period_timeend_utc,
                                                     range_start_iso='',
                                                     range_end_iso='',
                                                     show_all=show_all)  # PR2019-08-01

                # debug: also update table in window when list is empty, Was: if list:
                update_dict['emplhour'] = list

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

#######################################################

def FillRosterdate(new_rosterdate_dte, request, comp_timezone, logfile):  # PR2019-08-01

    logger.debug(' ============= FillRosterdate ============= ')
    logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))
    logger.debug('isocalendar year: ' + str(new_rosterdate_dte.isocalendar()[0]))
    logger.debug('isocalendar weeknr: ' + str(new_rosterdate_dte.isocalendar()[1]))
    logger.debug('isocalendar: daynr' + str(new_rosterdate_dte.isocalendar()[2]))
    logger.debug('isocalendar' + str(new_rosterdate_dte.isocalendar()))
    # new_rosterdate_dte: 2019-04-10 <class 'datetime.date'>

    if new_rosterdate_dte:
        # update schemeitem rosterdate.
        # before filling emplhours with rosterdate you must update the schemitems.
        # rosterdates that are before the new rosterdate must get a date on or aftter the new rosterdate

        entry_count = 0
        entry_balance = m.get_entry_balance(request, comp_timezone)
        logger.debug('entry_balance: ' + str(entry_balance))
#===============================================================
        logfile.append('================================================ ')
        logfile.append('  Fill roster of date: ' + str(new_rosterdate_dte))
        logfile.append('================================================ ')
#===============================================================

# loop through all customers:, except for absence and template
        customers = m.Customer.objects.filter(company=request.user.company, cat__lt=c.SHIFT_CAT_0512_ABSENCE)
        if not customers:
            logfile.append('No customers found.')
        else:
            for customer in customers:
                logfile.append('================================ ')
                logfile.append('Customer: ' + str(customer.code))
                if customer.locked:
                    logfile.append('    - customer is locked')
                elif customer.inactive:
                    logfile.append('    - customer is inactive')
                else:
                    orders = m.Order.objects.filter(customer=customer)
                    if not orders:
                        logfile.append('    - customer has no orders')
                    else:
                        for order in orders:
                            logfile.append('---------------------- ')
                            logfile.append('Order: ' + str(order.code))
                            if order.locked:
                                logfile.append(' - order is locked')
                            elif order.inactive:
                                logfile.append(' - order is inactive')
                            elif not f.date_within_range(order.datefirst, order.datelast, new_rosterdate_dte):
                                logfile.append(' - rosterdate outside order period: ' + str(order.datefirst) + ' - ' + str(order.datelast))
                            else:
                                schemes = m.Scheme.objects.filter(order=order)
                                if not schemes:
                                    logfile.append(' - order has no schemes')
                                else:
                                    for scheme in schemes:
                                        range = ''
                                        if scheme.datefirst:
                                            range = ' from ' + str(scheme.datefirst)
                                        if scheme.datelast:
                                            range += ' thru ' + str(scheme.datelast)
                                        logfile.append('   Scheme: ' + str(scheme.code) + range)
                                        if scheme.inactive:
                                            logfile.append("     scheme is inactive.")
                                        elif not f.date_within_range(scheme.datefirst, scheme.datelast, new_rosterdate_dte):
                                            logfile.append('     scheme skipped. Rosterdate outside scheme period')
                                        else:
                                            schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                                            if not schemeitems:
                                                logfile.append("     scheme  has no shifts.")
                                            else:
            # 1. create a recordset of schemeitem records with rosterdate = new_rosterdate_dte
                                            #   Exclude cat absence and template (# order cat = # 00 = normal, 10 = internal, 20 = rest, 30 = absence, 90 = template
                                            #   Exclude inactive scheme)
                                            #  order and scheme must be in range datefirst - datelast
                                            #crit = Q(scheme__order__customer__company=request.user.company)  & \
                                            #       Q(scheme__cat__lte=SHIFT_CAT_0001_INTERNAL) & \
                                            #       Q(scheme__inactive=False) & \
                                            #       (Q(scheme__order__datefirst__lte=new_rosterdate_dte) | Q(scheme__order__datefirst__isnull=True)) & \
                                            #       (Q(scheme__order__datelast__gte=new_rosterdate_dte) | Q(scheme__order__datelast__isnull=True)) & \
                                            #       (Q(scheme__datefirst__lte=new_rosterdate_dte) | Q(scheme__datefirst__isnull=True)) & \
                                            #       (Q(scheme__datelast__gte=new_rosterdate_dte) | Q(scheme__datelast__isnull=True))
                                            #schemeitems = m.Schemeitem.objects.filter(crit)
                                            # logger.debug(schemeitems.query)

                                                for schemeitem in schemeitems:
         # 2. update the rosterdate of schemeitem when it is outside the current cycle,
                                                    update_schemeitem_rosterdate(schemeitem, new_rosterdate_dte, comp_timezone)
                                                    #logger.debug(' new schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
                                                    # new schemeitem.rosterdate: 2019-08-30 00:00:00 <class 'datetime.datetime'>
                                                    new_schemeitem_rosterdate_naive = schemeitem.rosterdate
                                                    # logger.debug(' new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))
                                                    new_schemeitem_rosterdate_dte = new_schemeitem_rosterdate_naive.date()
                                                    # logger.debug(' new_schemeitem_rosterdate_dte: ' + str(new_schemeitem_rosterdate_dte) + ' ' + str(type(new_schemeitem_rosterdate_dte)))
                                                    # new_rosterdate_dte: 2019-08-29 <class 'datetime.date'>
        # 3. skip if schemeitem.rosterdate does not equal new_rosterdate_dte
                                                    shift_code = '-'
                                                    if schemeitem.shift:
                                                        shift_code = schemeitem.shift.code
                                                    logfile.append("     shift: '" + str(shift_code) + "' of " + str(new_schemeitem_rosterdate_dte) + "")

                                                    if new_schemeitem_rosterdate_dte != new_rosterdate_dte:
                                                        logfile.append("       shift skipped. Date not equal to this rosterdate")
                                                    else:
                                                        if schemeitem.inactive:
                                                            logfile.append("       shift is inactive.")
                                                        else:
                                                            if not schemeitem.shift:
                                                                logfile.append("       shift is blank.")
                                                            else:
                                                                if schemeitem.shift.cat == c.SHIFT_CAT_0064_RESTSHIFT:
                                                                    # TODO add to rest order, to prevent overlapping shifts
                                                                    logfile.append('       shift is rest shift')
                                                                else:
                                                                    AddSchemeitem(schemeitem, new_rosterdate_dte, request, comp_timezone, entry_count, logfile)  # PR2019-08-12

                                                                # DON't add 1 cycle to today's schemeitems, added rosterday must be visible in planning, to check
                                                                #next_rosterdate = new_rosterdate_dte + timedelta(days=1)
                                                                # update_schemeitem_rosterdate(schemeitem, next_rosterdate, comp_timezone)

def AddSchemeitem(schemeitem, new_rosterdate_dte, request, comp_timezone, entry_count, logfile):  # PR2019-08-12

    logger.debug(' ============= AddSchemeitem ============= ')
    logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))
    logger.debug('schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))

    oh_is_locked = False
    shift_code = '-'
    if schemeitem.shift:
        shift_code = schemeitem.shift.code
# 4. update existing orderhour that is linked to this schemeitem
# a. check if an orderhour from this schemeitem and this rosterdate already exists

    # fields of orderhour are:
    #   order, schemeitem, rosterdate, yearindex, monthindex, weekindex,
    #   shift, duration, status, rate, amount, sequence, locked, modifiedby, modifiedat

    orderhour = m.Orderhour.objects.filter(
        schemeitem=schemeitem,
        order=schemeitem.scheme.order,
        rosterdate=schemeitem.rosterdate).first()
    if orderhour:
        shift_code = '-'
        if schemeitem.shift:
            shift_code = schemeitem.shift.code

        logfile.append("       shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " already exist.")

# b. if exists, check if status is STATUS_02_START_CONFIRMED or higher
        # skip update this orderhour when it is locked or has status STATUS_02_START_CONFIRMED or higher
        oh_is_locked = (orderhour.status > c.STATUS_01_CREATED or orderhour.locked)

        if oh_is_locked:
            logfile.append("       shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " already exist and is locked. Shift will be skipped.")
        else:
            logfile.append("       shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " already exist and will be overwritten.")

# 5. if not exists: create new orderhour
    else:
        yearindex = new_rosterdate_dte.year
        monthindex = new_rosterdate_dte.month
        weekindex = new_rosterdate_dte.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        #  week 1 is de week, waarin de eerste donderdag van dat jaar zit
        #weekday = new_rosterdate_dte.weekday() #  0 = Monday
        # quincena 1 starts day after begin of week 1 (assumption)

        orderhour = m.Orderhour(
            order=schemeitem.scheme.order,
            schemeitem=schemeitem,
            rosterdate=new_rosterdate_dte,
            yearindex=yearindex,
            monthindex=monthindex,
            weekindex=weekindex
        )

    entry_count = entry_count + 1

# get shift info
    shift_code = None
    shift_breakduration = 0
    shift_wagefactor = 0
    if schemeitem.shift:
        if schemeitem.shift.breakduration:
            shift_breakduration = schemeitem.shift.breakduration
        if schemeitem.shift.code:
            shift_code = schemeitem.shift.code
        if schemeitem.shift.wagefactor:
            shift_wagefactor = schemeitem.shift.wagefactor

# get order info
    order_rate = 0
    if schemeitem.scheme.order:
        if schemeitem.scheme.order.rate:
            order_rate = schemeitem.scheme.order.rate


# get schemeitem info
    timeduration = 0
    if schemeitem.timeduration:
        timeduration = schemeitem.timeduration
    amount = (timeduration / 60) * (order_rate)

# d. if not locked: replace values of existing orderhour
    if orderhour and not oh_is_locked:
        orderhour.order = schemeitem.scheme.order
        orderhour.schemeitem = schemeitem
        orderhour.rosterdate = new_rosterdate_dte
        orderhour.yearindex = new_rosterdate_dte.year
        orderhour.monthindex = new_rosterdate_dte.month
        orderhour.weekindex = new_rosterdate_dte.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        orderhour.shift = shift_code
        orderhour.duration = schemeitem.timeduration
        orderhour.status = c.STATUS_01_CREATED
        orderhour.rate = order_rate
        orderhour.amount = amount

        orderhour.save(request=request)

        logfile.append("       shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " is added to roster.")

# create new emplhour, not when oh_is_locked
        # create new emplhour

        new_emplhour = m.Emplhour(
            orderhour=orderhour,
            rosterdate=orderhour.rosterdate,
            yearindex=orderhour.yearindex,
            monthindex=orderhour.monthindex,
            weekindex=orderhour.weekindex,
            shift=shift_code,
            timestart=schemeitem.timestart,
            timeend=schemeitem.timeend,
            timeduration=timeduration,
            breakduration=shift_breakduration,
            wagefactor=shift_wagefactor,
            status=c.STATUS_01_CREATED)

# - lookup first employee within range in team.teammembers
       #  teammember = m.Teammember.get_first_teammember_on_rosterdate(schemeitem.team, new_rosterdate_dte)
        teammember = m.Teammember.get_first_teammember_on_rosterdate_with_logfile(schemeitem.team, new_rosterdate_dte, logfile)
        if teammember:
            # add employee (employe=null is filtered out)
            employee = teammember.employee
            if employee:
                logfile.append("       shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " is added to roster.")
                logger.debug("       employee: '" + str(employee.code) + "' is added")
                new_emplhour.employee = employee
                new_emplhour.wagecode = employee.wagecode
        new_emplhour.save(request=request)
    logger.debug(' entry_count: ' + str( entry_count))

    logger.debug(logfile)
    m.entry_balance_subtract(entry_count, request, comp_timezone)  # PR2019-08-04


def update_schemeitem_rosterdate(schemeitem, new_rosterdate_dte, comp_timezone):  # PR2019-07-31
    # update the rosterdate of a schemeitem when it is outside the current cycle,
    # it will be replaced  with a rosterdate that falls within within the current cycle, by adding n x cycle days
    # the timestart and timeend will also be changed
    # logger.debug(' --- update_schemeitem_rosterdate new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))

    # the curent cycle has index 0. It starts with new_rosterdate and ends with new_rosterdate + cycle -1

    if schemeitem and new_rosterdate_dte:
        new_rosterdate_naive = f.get_datetime_naive_from_date(new_rosterdate_dte)
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
            new_si_rosterdatetime = f.get_datetime_naive_from_date(new_si_rosterdate_naive)

            # get new_schemeitem.time_start and new_schemeitem.time_end
            new_timestart = None
            new_timeend = None
            breakduration = 0
            if new_si_rosterdatetime:
                if schemeitem.shift:
                    if schemeitem.shift.offsetstart:
                        new_timestart = f.get_datetimelocal_from_offset(
                            rosterdate=new_si_rosterdatetime,
                            offset=schemeitem.shift.offsetstart,
                            comp_timezone=comp_timezone)
                    if schemeitem.shift.offsetend:
                        new_timeend = f.get_datetimelocal_from_offset(
                            rosterdate=new_si_rosterdatetime,
                            offset=schemeitem.shift.offsetend,
                            comp_timezone=comp_timezone)
                    if schemeitem.shift.breakduration:
                        breakduration = schemeitem.shift.breakduration
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
    logger.debug(' ============= RemoveRosterdate ============= ')
    logger.debug(' rosterdate_current:' + str(rosterdate_current))

    if rosterdate_current:
# - create recordset of orderhour records with rosterdate = rosterdate_current and schemeitem Is Not Null
#   schemeitem Is Not Null when generated by Scheme, schemeitem Is Null when manually added
        crit = Q(rosterdate=rosterdate_current) & \
               Q(schemeitem__isnull=False) & \
               Q(order__customer__company=request.user.company)
        orderhours = m.Orderhour.objects.filter(crit)

        for orderhour in orderhours:

# check emplhours status: TODO skip if STATUS_02_START_CONFIRMED or higher
            # crit = Q(orderhour=orderhour) &  Q(status__gte=STATUS_02_START_CONFIRMED)

            #emplhours_exist = Emplhour.objects.filter(crit).exists()

            #for emplhour in emplhours:
    # check orderhour status: skip if STATUS_02_START_CONFIRMED or higher
            #    if orderhour.status < STATUS_02_START_CONFIRMED:
            #        skip_update = True
            #    else:
            #        is_update = True
            #    emplhour.delete(request=request)

    # check orderhour status: skip if STATUS_02_START_CHECKED or higher
            #if orderhour.status < STATUS_02_START_CONFIRMED:
            #    skip_update = True
            #else:
            #    is_update = True

# delete emplhours of orderhour
            emplhours = m.Emplhour.objects.filter(orderhour=orderhour)
            for emplhour in emplhours:
                emplhour.delete(request=request)

# delete orderhour
            orderhour.delete(request=request)
