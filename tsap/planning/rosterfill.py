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

                    FillRosterdate(rosterdate_fill_dte, request, comp_timezone)

                # update rosterdate_current in companysettings
                    m.Companysetting.set_setting(c.KEY_COMP_ROSTERDATE_CURRENT, rosterdate_fill_dte, request.user.company)
                    update_dict['rosterdate'] = get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)

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

def FillRosterdate(new_rosterdate, request, comp_timezone):  # PR2019-08-01
    logger.debug(' ============= FillRosterdate ============= ')
    logger.debug('new_rosterdate: ' + str(new_rosterdate) + ' ' + str(type(new_rosterdate)))
    logger.debug('isocalendar year: ' + str(new_rosterdate.isocalendar()[0]))
    logger.debug('isocalendar weeknr: ' + str(new_rosterdate.isocalendar()[1]))
    logger.debug('isocalendar: daynr' + str(new_rosterdate.isocalendar()[2]))
    logger.debug('isocalendar' + str(new_rosterdate.isocalendar()))
    # new_rosterdate: 2019-04-10 <class 'datetime.date'>

    if new_rosterdate:
        # update schemeitem rosterdate.
        # before filling emplhours with rosterdate you must update the schemitems.
        # rosterdates that are before the new rosterdate must get a date on or aftter the new rosterdate

        entry_count = 0
        entry_balance = m.get_entry_balance(request, comp_timezone)
        logger.debug('entry_balance: ' + str(entry_balance))
#===============================================================
        logger.debug('#===============================================================: ')
        logger.debug('Fill roster of date: ' + str(new_rosterdate))
        logger.debug('#===============================================================: ')
#===============================================================

# loop through all customers:
        customers = m.Customer.objects.filter(company=request.user.company)
        if not customers:
            logger.debug('No customers')
        else:
            for customer in customers:
                logger.debug('================================ ')
                logger.debug('Customer: ' + str(customer.code))
                if customer.locked:
                    logger.debug('    - customer is locked')
                elif customer.inactive:
                    logger.debug('    - customer is inactive')
                else:
                    orders = m.Order.objects.filter(customer=customer)
                    if not orders:
                        logger.debug('    - customer has no orders')
                    else:
                        for order in orders:
                            logger.debug('---------------------- ')
                            logger.debug('Order: ' + str(order.code))
                            if order.locked:
                                logger.debug(' - order is locked')
                            elif order.inactive:
                                logger.debug(' - order is inactive')
                            elif not v.date_within_range(order.datefirst, order.datelast, new_rosterdate):
                                logger.debug(' - rosterdate not within order period: ' + str(order.datefirst) + ' - ' + str(order.datelast))
                            else:
                                schemes = m.Scheme.objects.filter(order=order)
                                if not schemes:
                                    logger.debug(' - order has no schemes')
                                else:
                                    for scheme in schemes:
                                        if scheme.inactive:
                                            logger.debug("     Scheme '" + str(scheme.code) + "' is inactive.")
                                        elif not v.date_within_range(scheme.datefirst, scheme.datelast, new_rosterdate):
                                            logger.debug("     Scheme '" + str(scheme.code) + "' skipped. Rosterdate not within scheme period: " + str(scheme.datefirst) + " - " + str(scheme.datelast))
                                        else:
                                            schemeitems = m.Schemeitem.objects.filter(scheme=scheme)
                                            if not schemeitems:
                                                logger.debug("     Scheme '" + str(scheme.code) + "' has no shifts.")
                                            else:
                                                logger.debug("     Scheme: '" + str(scheme.code) + "':")
            # 1. create a recordset of schemeitem records with rosterdate = new_rosterdate
                                            #   Exclude cat absence and template (0 = normal, 1 = internal, 2 = absence, 3 = template)
                                            #   Exclude inactive scheme)
                                            #  order and scheme must be in range datefirst - datelast
                                            #crit = Q(scheme__order__customer__company=request.user.company)  & \
                                            #       Q(scheme__cat__lte=CAT_01_INTERNAL) & \
                                            #       Q(scheme__inactive=False) & \
                                            #       (Q(scheme__order__datefirst__lte=new_rosterdate) | Q(scheme__order__datefirst__isnull=True)) & \
                                            #       (Q(scheme__order__datelast__gte=new_rosterdate) | Q(scheme__order__datelast__isnull=True)) & \
                                            #       (Q(scheme__datefirst__lte=new_rosterdate) | Q(scheme__datefirst__isnull=True)) & \
                                            #       (Q(scheme__datelast__gte=new_rosterdate) | Q(scheme__datelast__isnull=True))
                                            #schemeitems = m.Schemeitem.objects.filter(crit)
                                            # logger.debug(schemeitems.query)

                                                for schemeitem in schemeitems:
         # 2. update the rosterdate of schemeitem when it is outside the current cycle,
                                                    update_schemeitem_rosterdate(schemeitem, new_rosterdate, comp_timezone)

        # 3. skip if schemeitem.rosterdate does not equal new_rosterdate
                                                    if schemeitem.rosterdate == new_rosterdate:
                                                        if schemeitem.inactive:
                                                            logger.debug('  - shift ' + str(schemeitem.shift)  + ' is inactive')
                                                        else:
                                                            if not schemeitem.shift:
                                                                logger.debug('  - shift is blank')
                                                            else:
                                                                if schemeitem.shift.cat == 1:
                                                                    # TODO add to rest order, to prevent overlapping shifts
                                                                    logger.debug('  - shift ' + str(schemeitem.shift)  + ' is rest shift')
                                                                else:
                                                                    logger.debug(' add shift: ' + str(schemeitem.shift) + ' to roster')
                                                                    AddSchemeitem(schemeitem, new_rosterdate, request, comp_timezone, entry_count)  # PR2019-08-12

                                                                # OR DON't?? add 1 cycle to today's schemeitems
                                                                #next_rosterdate = new_rosterdate + timedelta(days=1)
                                                                # update_schemeitem_rosterdate(schemeitem, next_rosterdate, comp_timezone)

def AddSchemeitem(schemeitem, new_rosterdate, request, comp_timezone, entry_count):  # PR2019-08-12

    oh_is_locked = False
# 4. update existing orderhour that is linked to this schemeitem
# a. check if an orderhour from this schemeitem and this rosterdate already exists

    # fields of orderhour are:
    #   order, schemeitem, rosterdate, yearindex, monthindex, weekindex,
    #   shift, duration, status, rate, amount, taxrate, locked, modifiedby, modifiedat

    orderhour = m.Orderhour.objects.filter(
        schemeitem=schemeitem,
        order=schemeitem.scheme.order,
        rosterdate=schemeitem.rosterdate).first()
    if orderhour:
# b. if exists, check if status is STATUS_02_START_CONFIRMED or higher
        # skip update this orderhour when it is locked or has status STATUS_02_START_CONFIRMED or higher
        oh_is_locked = (orderhour.status > c.STATUS_01_CREATED or orderhour.locked)

# 5. if not exists: create new orderhour
    else:
        orderhour = m.Orderhour(
            order=schemeitem.scheme.order,
            schemeitem=schemeitem,
            rosterdate=new_rosterdate)
    entry_count = entry_count + 1

# get shift info
    shift_code = None
    shift_breakduration = 0
    if schemeitem.shift:
        if schemeitem.shift.breakduration:
            shift_breakduration = schemeitem.shift.breakduration
        if schemeitem.shift.code:
            shift_code = schemeitem.shift.code

# get order info
    order_rate = 0
    order_taxrate = 0
    if schemeitem.scheme.order:
        if schemeitem.scheme.order.rate:
            order_rate = schemeitem.scheme.order.rate
        if schemeitem.scheme.order.taxrate:
            order_taxrate = schemeitem.scheme.order.taxrate

# get schemeitem info
    timeduration = 0
    if schemeitem.timeduration:
        timeduration = schemeitem.timeduration
    amount = (timeduration / 60) * (order_rate)


# d. if not locked: replace values of existing orderhour
    if orderhour and not oh_is_locked:
        orderhour.order = schemeitem.scheme.order
        orderhour.schemeitem = schemeitem
        orderhour.rosterdate = new_rosterdate
        orderhour.yearindex = new_rosterdate.year
        orderhour.monthindex = new_rosterdate.month
        orderhour.weekindex = new_rosterdate.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        orderhour.shift = shift_code
        orderhour.duration = schemeitem.timeduration
        orderhour.status = c.STATUS_01_CREATED
        orderhour.rate = order_rate
        orderhour.amount = amount
        orderhour.taxrate = order_taxrate

        orderhour.save(request=request)

        logger.debug("       shift: '" + str(orderhour.shift) + "' is added")

# create new emplhour, not when oh_is_locked
        # create new emplhour

        new_emplhour = m.Emplhour(
            orderhour=orderhour,
            rosterdate=new_rosterdate,
            shift=shift_code,
            timestart=schemeitem.timestart,
            timeend=schemeitem.timeend,
            timeduration=timeduration,
            breakduration=shift_breakduration,
            wagefactor=schemeitem.wagefactor,
            status=c.STATUS_01_CREATED)

# - lookup first employee within range in team.teammembers
        teammember = m.Teammember.get_first_teammember_on_rosterdate(schemeitem.team, new_rosterdate)
        if teammember:
            # add employee (employe=null is filtered out)
            employee = teammember.employee
            if employee:
                logger.debug("       employee: '" + str(employee.code) + "' is added")
                new_emplhour.employee = employee
                new_emplhour.wagecode = employee.wagecode
        new_emplhour.save(request=request)
    logger.debug(' entry_count: ' + str( entry_count))
    m.entry_balance_subtract(entry_count, request, comp_timezone)  # PR2019-08-04


def update_schemeitem_rosterdate(schemeitem, new_rosterdate, comp_timezone):  # PR2019-07-31
    # update the rosterdate of a schemeitem when it is outside the current cycle,
    # it will be replaced  with a rosterdate that falls within within the current cycle, by adding n x cycle days
    # the timestart and timeend will also be changed

    # the curent cycle has index 0. It starts with new_rosterdate and ends with new_rosterdate + cycle -1

    if schemeitem:
        logger.debug('----- update_schemeitem_rosterdate ')

        if new_rosterdate:
            si_rosterdate = schemeitem.rosterdate
            logger.debug('si_rosterdate: ' + str(si_rosterdate) + ' ' + str(type(si_rosterdate)))
            logger.debug('new_rosterdate: ' + str(new_rosterdate) + ' ' + str(type(new_rosterdate)))
            logger.debug('si_time: ' + str(schemeitem.timestart) + ' - ' + str(schemeitem.timeend))

            datediff = si_rosterdate - new_rosterdate  # datediff is class 'datetime.timedelta'
            datediff_days = datediff.days  # <class 'int'>
            logger.debug('datediff_days: ' + str(datediff_days))

            cycle_int = schemeitem.scheme.cycle
            logger.debug('cycle: ' + str(cycle_int) + ' ' + str(type(cycle_int)))
            if cycle_int:
                # cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
                # // operator: Floor division - division that results into whole number adjusted to the left in the number line
                index = datediff_days // cycle_int
                logger.debug('index: ' + str(index) + ' ' + str(type(index)))
                # adjust si_rosterdate when index <> 0
                if index:
                    # negative index adds positive day and vice versa
                    days_add = cycle_int * index * -1
                    logger.debug('days_add: ' + str(days_add) + ' ' + str(type(days_add)))
                    new_si_rosterdate = si_rosterdate + timedelta(days=days_add)

                    # save new_si_rosterdate
                    schemeitem.rosterdate = new_si_rosterdate
                    logger.debug('new_si_rosterdate: ' + str(new_si_rosterdate) + ' ' + str(type(new_si_rosterdate)))
                    # new_si_rosterdate: 2019-07-27 <class 'datetime.date'>

                    # convert to dattime object
                    new_si_rosterdatetime = f.get_datetime_naive_from_date(new_si_rosterdate)

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
                    logger.debug('new_timeend: ' + str(new_timeend) + ' ' + str(type(new_timeend)))

                    # get new_schemeitem.timeduration
                    new_timeduration = 0
                    if new_timestart and new_timeend:
                        new_timeduration = f.get_time_minutes(
                            timestart=new_timestart,
                            timeend=new_timeend,
                            break_minutes=breakduration)
                    schemeitem.timeduration = new_timeduration

                    logger.debug('new_timeduration: ' + str(new_timeduration) + ' ' + str(type(new_timeduration)))
                    # save without (request=request) keeps modifiedby and modifieddate
                    schemeitem.save()
                    logger.debug('schemeitem.saved rosterdate: ' + str(schemeitem.rosterdate))


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
