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

from tsap.constants import  KEY_COMP_ROSTERDATE_CURRENT, LANG_DEFAULT, CAT_01_INTERNAL, STATUS_01_CREATED
from tsap.functions import get_date_from_ISOstring, get_datetimelocal_from_offset, get_datetime_from_date, get_time_minutes

from planning.dicts import get_rosterdatefill_dict, create_emplhour_list,\
    get_period_from_settings, get_timesstartend_from_perioddict

from tsap.settings import TIME_ZONE, LANGUAGE_CODE

from companies.models import Schemeitem, Teammember, Emplhour, Orderhour, Companysetting

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
            user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
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
                    rosterdate_fill_dte, msg_txt = get_date_from_ISOstring(rosterdate_str)

                    FillRosterdate(rosterdate_fill_dte, request, comp_timezone)

                # update rosterdate_current in companysettings
                    Companysetting.set_setting(KEY_COMP_ROSTERDATE_CURRENT, rosterdate_fill_dte, request.user.company)
                    update_dict['rosterdate'] = get_rosterdatefill_dict(request.user.company, comp_timezone, user_lang)

                elif 'remove' in rosterdate_fill_dict:
                    rosterdate_str = rosterdate_fill_dict['remove']
                    rosterdate_remove_dte, msg_txt = get_date_from_ISOstring(rosterdate_str)
                    RemoveRosterdate(rosterdate_remove_dte, request, comp_timezone)

                # update rosterdate_current in companysettings
                    rosterdate_current_dte = rosterdate_remove_dte + timedelta(days=-1)
                    Companysetting.set_setting(KEY_COMP_ROSTERDATE_CURRENT, rosterdate_current_dte, request.user.company)
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

def FillRosterdate(new_rosterdate, request, comp_timezone):  # PR2019-06-17
    logger.debug(' ============= FillRosterdate ============= ')

    if new_rosterdate:

        # update schemeitem rosterdate.
        # before filling emplhours with rosterdate you must update the schemitems.
        # rosterdates that are before the new rosterdate must get a date on or aftter the new rosterdate

        # - create recordset of schemeitem records with rosterdate = new_rosterdate
        # from: https://stackoverflow.com/questions/5235209/django-order-by-position-ignoring-null
        # Coalesce works by taking the first non-null value.  So we give it
        # a date far before any non-null values of last_active.  Then it will
        # naturally sort behind instances of Box with a non-null last_active value.

# - create recordset of schemeitem records with rosterdate = new_rosterdate
        # from: https://stackoverflow.com/questions/5235209/django-order-by-position-ignoring-null
        # Coalesce works by taking the first non-null value.  So we give it
        # a date far before any non-null values of last_active.  Then it will
        # naturally sort behind instances of Box with a non-null last_active value.
        #crit = (Q(rosterdate=new_rosterdate)) & \
        #       (Q(scheme__order__customer__company=request.user.company)) & \
        #       (Q(scheme__datefirst__lte=new_rosterdate) | Q(scheme__datefirst__isnull=True)) & \
        #       (Q(scheme__datelast__gte=new_rosterdate) | Q(scheme__datelast__isnull=True))

        #   Cat <= 1 (      # 0 = normal, 1 = internal, 2 = absence, 3 = template
        #   Exclude cat absence, 3 = template Cat <= 1 (0 = normal, 1 = internal, 2 = absence, 3 = template)
        #   Exclude inactive scheme)

        crit = Q(scheme__order__customer__company=request.user.company)  & \
               Q(scheme__cat__lte=CAT_01_INTERNAL) & \
               Q(scheme__inactive=False) & \
               (Q(scheme__order__datefirst__lte=new_rosterdate) | Q(scheme__order__datefirst__isnull=True)) & \
               (Q(scheme__order__datelast__gte=new_rosterdate) | Q(scheme__order__datelast__isnull=True)) & \
               (Q(scheme__datefirst__lte=new_rosterdate) | Q(scheme__datefirst__isnull=True)) & \
               (Q(scheme__datelast__gte=new_rosterdate) | Q(scheme__datelast__isnull=True))

        schemeitems = Schemeitem.objects.filter(crit)
        # logger.debug(schemeitems.query)

        logger.debug('new_rosterdate: ' + str(new_rosterdate))
        for schemeitem in schemeitems:

# update the rosterdate of schemeitem when it is outside the current cycle,
            update_schemeitem_rosterdate(schemeitem, new_rosterdate, comp_timezone)

# create new record, only if schemeitem.rosterdate == new_rosterdate
            if schemeitem.rosterdate == new_rosterdate:
                # logger.debug('schemeitem.rosterdate == new_rosterdate: ')
                logger.debug('schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' shift: ' + str(schemeitem.shift))

# check if orderhour from this schemeitem and this rosterdate already exists
                skip_update = False

                is_update = False
                # there should be only one orderhour with this schemeitem and rosterdate
                # TODO handle existing orderhour records
                # orderhour = Orderhour.objects.filter(schemeitem=schemeitem, rosterdate=schemeitem.rosterdate).first()
                orderhour = None # to be removed
                if orderhour:
                    logger.debug('orderhour shift: ' + str(orderhour.shift) + ' status: ' + str(orderhour.status))
                    # check status: skip if STATUS_02_START_CONFIRMED or higher
                    # if STATUS_01_CREATED: replace values
                    if orderhour.status > STATUS_01_CREATED:
                        skip_update = True
                    else:
                        is_update = True
                        orderhour.order=schemeitem.scheme.order
                        orderhour.rosterdate=new_rosterdate
                        orderhour.schemeitem=schemeitem
                        orderhour.shift=schemeitem.shift
                        orderhour.taxrate=schemeitem.scheme.order.taxrate
                        orderhour.duration=schemeitem.timeduration
                        orderhour.status=STATUS_01_CREATED
                        orderhour.rate=schemeitem.scheme.order.rate
                        orderhour.amount=(schemeitem.timeduration / 60) * (schemeitem.scheme.order.rate)
                        orderhour.save(request=request)
                    logger.debug('saved orderhour: ' + str(orderhour.shift) + ' is_update: ' + str(is_update))
# - create new orderhour
                else:
                    orderhour = Orderhour(
                        order=schemeitem.scheme.order,
                        rosterdate=new_rosterdate,
                        schemeitem=schemeitem,
                        shift=schemeitem.shift,
                        taxrate=schemeitem.scheme.order.taxrate,
                        duration=schemeitem.timeduration,
                        status=STATUS_01_CREATED,
                        rate=schemeitem.scheme.order.rate,
                        amount=(schemeitem.timeduration / 60) * (schemeitem.scheme.order.rate))
                    orderhour.save(request=request)

                    logger.debug('new orderhour: ' + str(orderhour.pk) + ' status: ' + str(orderhour.shift))
# - lookup employee
                if not skip_update:
                    # logger.debug('lookup employee ')
                    team = schemeitem.team
                    employee = None
                    wagecode = None

                    # logger.debug('team: ' + str(team))
                    emplhours_added = False
                    if team:
                        logger.debug('team: ' + str(team.code))
                        # filters teammmebers that have new_rosterdate within range datefirst/datelast
                        # order_by datelast, null comes last (with Coalesce changes to '2200-01-01'
                        crit = (Q(team=team)) & \
                               (Q(employee__isnull=False)) & \
                               (Q(employee__datefirst__lte=new_rosterdate) | Q(employee__datefirst__isnull=True)) & \
                               (Q(employee__datelast__gte=new_rosterdate) | Q(employee__datelast__isnull=True)) & \
                               (Q(datefirst__lte=new_rosterdate) | Q(datefirst__isnull=True)) & \
                               (Q(datelast__gte=new_rosterdate) | Q(datelast__isnull=True))

                        teammembers = Teammember.objects.annotate(
                            new_datelast=Coalesce('datelast', Value(datetime(2200, 1, 1))
                            )).filter(crit).order_by('member', 'new_datelast')
                        if teammembers:
                            for teammember in teammembers:
                                # logger.debug(teammember.query)
                                logger.debug('teammember: ' + str(teammember.member) + ' datelast: ' + str(teammember.new_datelast))

                                # create new emplhour
                                new_emplhour = Emplhour(
                                    orderhour=orderhour,
                                    rosterdate=new_rosterdate,
                                    shift=schemeitem.shift,
                                    timestart=schemeitem.timestart,
                                    timeend=schemeitem.timeend,
                                    timeduration=schemeitem.timeduration,
                                    breakduration=schemeitem.breakduration,
                                    wagefactor=schemeitem.wagefactor,
                                    status=STATUS_01_CREATED)
                                # add employee
                                employee = teammember.employee
                                if employee:
                                    logger.debug('employee: ' + str(employee.code))
                                    new_emplhour.employee = employee
                                    new_emplhour.wagecode = employee.wagecode
                                new_emplhour.save(request=request)
                                emplhours_added = True
                    # each orderhour has at least the  SO FAR


                    # TODO handle existing orderhour records
                    """
                    if orderhour:
                        if is_update:
                            # check if emplhour already exists
                            # there can be more  emplhour records for this orderhour (when split)
                            delete_others = False
                            emplhours = Emplhour.objects.filter(orderhour=orderhour)
                            if emplhours:
                                update_emplhour = True
                                for emplhour in emplhours:
                                    if update_emplhour:
                                        # replace emplhour
                                        # emplhour.orderhour = orderhour,
                                        emplhour.rosterdate = new_rosterdate
                                        emplhour.shift = schemeitem.shift
                                        emplhour.timestart = schemeitem.timestart
                                        emplhour.timeend = schemeitem.timeend
                                        emplhour.timeduration = schemeitem.timeduration
                                        emplhour.breakduration = schemeitem.breakduration
                                        emplhour.employee = employee
                                        emplhour.wagecode = wagecode
                                        emplhour.status = STATUS_01_CREATED
                                        emplhour.save(request=request)

                                        update_emplhour = False
                                    else:
                                        emplhour.delete(request=request)
                        else:
                            # create new emplhour
                            new_emplhour = Emplhour(
                                orderhour=orderhour,
                                rosterdate=new_rosterdate,
                                shift=schemeitem.shift,
                                timestart = schemeitem.timestart,
                                timeend = schemeitem.timeend,
                                timeduration=schemeitem.timeduration,
                                breakduration=schemeitem.breakduration,
                                employee=employee,
                                wagecode=wagecode,
                                status=STATUS_01_CREATED)
                            new_emplhour.save(request=request)
                    """
# 33333333333333333333333333333333333333333333333333

def update_schemeitem_rosterdate(schemeitem, new_rosterdate, comp_timezone):  # PR2019-07-31
    # update the rosterdate of a schemeitem when it is outside the current cycle,
    # it will be replaced  with a rosterdate that falls within within the current cycle, by adding n x cycle days
    # the timestart and timeend will also be changed

    # the curent cycle has index 0. It starts with new_rosterdate and ends with new_rosterdate + cycle -1

    if schemeitem:
        # logger.debug('-----')

        if new_rosterdate:
            si_rosterdate = schemeitem.rosterdate
            # logger.debug('si_rosterdate: ' + str(si_rosterdate) + ' ' + 'new_rosterdate: ' + str(new_rosterdate))
            # logger.debug('si_time: ' + str(schemeitem.timestart) + ' - ' + str(schemeitem.timeend))

            datediff = new_rosterdate - si_rosterdate # datediff is class 'datetime.timedelta'
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
                    days_add = cycle_int * index
                    # logger.debug('days_add: ' + str(days_add) + ' ' + str(type(days_add)))
                    new_si_rosterdate = si_rosterdate + timedelta(days=days_add)

                    # save new_si_rosterdate
                    schemeitem.rosterdate = new_si_rosterdate
                    # logger.debug('new_si_rosterdate: ' + str(new_si_rosterdate) + ' ' + str(type(new_si_rosterdate)))
                    # new_si_rosterdate: 2019-07-27 <class 'datetime.date'>

                    # convert to dattime object
                    new_si_rosterdatetime = get_datetime_from_date(new_si_rosterdate)

                    # get new_schemeitem.time_start
                    new_timestart = None
                    if new_si_rosterdatetime and schemeitem.offsetstart:
                        new_timestart = get_datetimelocal_from_offset(
                            new_si_rosterdatetime,
                            schemeitem.offsetstart,
                            comp_timezone)
                    schemeitem.timestart = new_timestart
                    # logger.debug('new_timestart: ' + str(new_timestart) + ' ' + str(type(new_timestart)))

                    # get new_schemeitem.time_end
                    new_timeend = None
                    if new_si_rosterdatetime and schemeitem.offsetend:
                        new_timeend = get_datetimelocal_from_offset(new_si_rosterdatetime,
                                                                    schemeitem.offsetend,
                                                                    comp_timezone)
                    schemeitem.timeend = new_timeend
                    # logger.debug('new_timeend: ' + str(new_timeend) + ' ' + str(type(new_timeend)))

                    # get new_schemeitem.timeduration
                    new_timeduration = 0
                    if new_timestart and new_timeend:
                        new_timeduration = get_time_minutes(
                            new_timestart,
                            new_timeend,
                            schemeitem.breakduration)
                    schemeitem.timeduration = new_timeduration
                    # logger.debug('new_timeduration: ' + str(new_timeduration) + ' ' + str(type(new_timeduration)))
                    # save without (request=request) keeps modifiedby and modifieddate
                    schemeitem.save()
                    # logger.debug('schemeitem.saved: ' + str(schemeitem) + ' ' + str(type(schemeitem)))


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
        orderhours = Orderhour.objects.filter(crit)

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
            emplhours = Emplhour.objects.filter(orderhour=orderhour)
            for emplhour in emplhours:
                emplhour.delete(request=request)

# delete orderhour
            orderhour.delete(request=request)
