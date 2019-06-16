# PR2019-03-24
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Value
from django.db.models.functions import Lower, Coalesce
from django.http import HttpResponse
from django.shortcuts import render, redirect #, get_object_or_404
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from datetime import date, datetime, timedelta

from companies.views import LazyEncoder
from tsap.constants import MONTHS_ABBREV, WEEKDAYS_ABBREV, TIMEFORMATS, STATUS_EMPLHOUR_01_CREATED, \
    KEY_COMP_NEXT_ROSTERDATE_FILL

from tsap.functions import get_date_from_str, get_datetimeaware_from_datetimeUTC, \
                    get_timeDHM_from_dhm, get_datetimelocal_from_DHM, get_date_WDM_from_dte, format_WDMY_from_dte, format_DMY_from_dte, \
                    get_weekdaylist_for_DHM, get_date_HM_from_minutes, create_dict_with_empty_attr, remove_empty_attr_from_dict, \
                    get_date_diff_plusone, get_time_minutes, get_iddict_variables, get_fielddict_variables , \
                    get_minutes_from_DHM, get_date_yyyymmdd, \
                    fielddict_str, fielddict_date, fielddict_datetime, fielddict_duration

from tsap.validators import date_within_range

from tsap.settings import TIME_ZONE, LANGUAGE_CODE
from tsap.headerbar import get_headerbar_param

from companies.models import Customer, Order, Scheme, Schemeitembase, Schemeitem, Team, Teammember, \
    Employee, Emplhour, Orderhour, Companysetting, create_customer_list

import pytz
import json

import logging
logger = logging.getLogger(__name__)

# === RealizationView ===================================== PR2019-05-26
@method_decorator([login_required], name='dispatch')
class RealizationView(View):

    def get(self, request):
        param = {}
        logger.debug(' ============= EmplhourView ============= ')
        if request.user.company is not None:
            datefirst = None
            datelast = None
            crit = (Q(orderhour__order__customer__company=request.user.company) | Q(employee__company=request.user.company))
            if datefirst:
                crit.add(Q(rosterdate__gte=datefirst), crit.connector)
            if datelast:
                crit.add(Q(rosterdate__lte=datelast), crit.connector)
            #emplhours = Emplhour.objects.filter(crit)
            emplhours = Emplhour.objects.all()

            for emplhour in emplhours:
                string = str(emplhour.id)
                if emplhour.rosterdate:
                    string += ' - rosterdate: ' + str(emplhour.rosterdate)
                if emplhour.orderhour:
                    string += ' - order: ' + str(emplhour.orderhour.order.code)
                logger.debug(string)

            employees = Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
            employee_list = []
            for employee in employees:
                employee_list.append({'pk': employee.id, 'code': employee.code})
            employee_json = json.dumps(employee_list)

            # get weekdays translated
            lang = request.user.lang if request.user.lang else LANGUAGE_CODE
            if not lang in WEEKDAYS_ABBREV:
                lang = LANGUAGE_CODE
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[lang])

            # get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

            # get timeformat
            timeformat = 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in TIMEFORMATS:
                timeformat = '24h'

            param = get_headerbar_param(request, {
                'items': emplhours,
                'employee_list': employee_json,
                'lang': lang,
                'weekdays': weekdays_json,
                'interval': interval,
                'timeformat': timeformat
            })
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'realization.html', param)


# === EmplhourView ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class EmplhourView(View):

    def get(self, request):
        param = {}
        logger.debug(' ============= EmplhourView ============= ')
        if request.user.company is not None:
            datefirst = None
            datelast = None
            crit = (Q(orderhour__order__customer__company=request.user.company) | Q(employee__company=request.user.company))
            if datefirst:
                crit.add(Q(rosterdate__gte=datefirst), crit.connector)
            if datelast:
                crit.add(Q(rosterdate__lte=datelast), crit.connector)
            #emplhours = Emplhour.objects.filter(crit)
            emplhours = Emplhour.objects.all()

            for emplhour in emplhours:
                string = str(emplhour.id)
                if emplhour.rosterdate:
                    string += ' - rosterdate: ' + str(emplhour.rosterdate)
                if emplhour.orderhour:
                    string += ' - order: ' + str(emplhour.orderhour.order.code)
                logger.debug(string)

            employees = Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
            employee_list = []
            for employee in employees:
                employee_list.append({'pk': employee.id, 'code': employee.code})
            employee_json = json.dumps(employee_list)

            # get weekdays translated
            lang = request.user.lang if request.user.lang else LANGUAGE_CODE
            if not lang in WEEKDAYS_ABBREV:
                lang = LANGUAGE_CODE
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[lang])

            # get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

            # get timeformat
            timeformat = 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in TIMEFORMATS:
                timeformat = '24h'

            param = get_headerbar_param(request, {
                'items': emplhours,
                'employee_list': employee_json,
                'lang': lang,
                'weekdays': weekdays_json,
                'interval': interval,
                'timeformat': timeformat
            })
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'emplhours.html', param)


@method_decorator([login_required], name='dispatch')
class EmplhourFillRosterdateView(UpdateView):  # PR2019-05-26

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourFillRosterdateView ============= ')

        update_dict = {}
        if request.user is not None and request.user.company is not None:
            # --- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

            # - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            logger.debug('request.POST: ' + str(request.POST))
            # request.POST: <QueryDict: {'fill_rosterdate': ['{"rosterdate":"2019-05-26"}']}>
            if 'rosterdate_fill' in request.POST:
                # NOT IN USE: upload_dict = json.loads(request.POST['rosterdate_fill'])

#  get fill_rosterdate from Companysetting
                fill_rosterdate = None
                setting = Companysetting.get_setting(KEY_COMP_NEXT_ROSTERDATE_FILL, request.user.company)
                if setting:
                    fill_rosterdate, msg_err = get_date_from_str(setting, False) # False = blank allowed
            # if not found: make fill_rosterdate = first schemeitem rosterdate
                if not fill_rosterdate:
                    schemeitem = Schemeitem.objects.filter(
                                    scheme__order__customer__company=request.user.company).first()
                    if schemeitem:
                        fill_rosterdate = schemeitem.rosterdate

                if fill_rosterdate:
# create recordset of schemeitem records with rosterdate = fill_rosterdate

                    # from: https://stackoverflow.com/questions/5235209/django-order-by-position-ignoring-null
                    # Coalesce works by taking the first non-null value.  So we give it
                    # a date far before any non-null values of last_active.  Then it will
                    # naturally sort behind instances of Box with a non-null last_active value.
                    crit = (Q(rosterdate=fill_rosterdate)) & \
                           (Q(scheme__order__issystem=False)) & \
                           (Q(scheme__order__inactive=False)) & \
                           (Q(scheme__order__datefirst__lte=fill_rosterdate) | Q(scheme__order__datefirst__isnull=True)) & \
                           (Q(scheme__order__datelast__gte=fill_rosterdate) | Q(scheme__order__datelast__isnull=True)) & \
                           (Q(scheme__order__customer__issystem=False)) & \
                           (Q(scheme__order__customer__inactive=False)) & \
                           (Q(scheme__order__customer__company=request.user.company))
                    schemeitems = Schemeitem.objects.filter(crit)
                    # logger.debug(schemeitems.query)

                    for schemeitem in schemeitems:

                # create new_orderhour
                        new_orderhour = Orderhour(
                            order=schemeitem.scheme.order,
                            rosterdate=fill_rosterdate,
                            schemeitem=schemeitem,
                            taxrate=schemeitem.scheme.order.taxrate,
                            duration=schemeitem.timeduration,
                            status=STATUS_EMPLHOUR_01_CREATED,
                            rate=schemeitem.scheme.order.rate,
                            amount=(schemeitem.timeduration / 60) * (schemeitem.scheme.order.rate))
                        new_orderhour.save(request=self.request)

                # lookup employee
                        team = schemeitem.team
                        employee = None
                        teammembers = Teammember.objects.annotate(
                            new_datelast=Coalesce('datelast', Value(datetime(2200, 1, 1))
                            )).filter(employee__isnull=False, team=team).order_by('-new_datelast')
                        for teammember in teammembers:
                            logger.debug('teammember.employee: ' + str(teammember.employee) + ' datelast: ' + str(teammember.datelast))
                            employee = teammember.employee
                        wagecode = None
                        if employee:
                            wagecode = employee.wagecode

                # create new emplhour
                        if new_orderhour:
                            new_emplhour = Emplhour(
                                orderhour=new_orderhour,
                                schemeitem=schemeitem,
                                rosterdate=fill_rosterdate,
                                timestart = schemeitem.timestart,
                                timeend = schemeitem.timeend,
                                timeduration=schemeitem.timeduration,
                                breakduration=schemeitem.breakduration,
                                employee=employee,
                                wagecode=wagecode,
                                timestatus=STATUS_EMPLHOUR_01_CREATED)
                            new_emplhour.save(request=self.request)


                # update rosterdate in schemeitem
                        # after filling orderhours and emplhours: add cycle days to rosterdate, except when cycle = 0
                        # recalc timestart timeend
                        cycle = schemeitem.scheme.cycle
                        new_rosterdate = None
                        if cycle:
                            new_rosterdate = schemeitem.rosterdate + timedelta(days=cycle)
                            schemeitem.rosterdate = new_rosterdate
                            schemeitem.save(request=self.request)

                            # get new_schemeitem.time_start
                            new_time_start = None
                            if new_rosterdate and schemeitem.timestartdhm:
                                new_time_start = get_datetimelocal_from_DHM(
                                    new_rosterdate, schemeitem.timestartdhm, comp_timezone)
                            # get new_schemeitem.time_start
                            new_time_end = None
                            if new_rosterdate and schemeitem.timeenddhm:
                                new_time_end = get_datetimelocal_from_DHM(
                                    new_rosterdate, schemeitem.timeenddhm, comp_timezone)
                            # get new_schemeitem.timeduration
                            new_timeduration = None
                            if new_time_start and new_time_end:
                                new_timeduration = get_time_minutes(
                                    new_time_start,
                                    new_time_end,
                                    schemeitem.breakduration)

                # update next_rosterdate_fill in companysettings
                    new_fill_rosterdate = fill_rosterdate + timedelta(days=1)
                    setting = get_date_yyyymmdd(new_fill_rosterdate)
                    Companysetting.set_setting(KEY_COMP_NEXT_ROSTERDATE_FILL, setting, request.user.company)
                    update_dict = {'next_rosterdate': setting}

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

@method_decorator([login_required], name='dispatch')
class EmplhourUploadView(UpdateView):  # PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourUploadView ============= ')

        # --- Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        field_list = ('id', 'rosterdate', 'order', 'employee', 'shift',
                      'timestart', 'timeend', 'breakduration', 'timeduration', 'timestatus',
                       'orderhourduration', 'orderhourstatus', 'modifiedby', 'modifiedat')
        update_dict = create_dict_with_empty_attr(field_list)

        if request.user is not None and request.user.company is not None:
            # --- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

            # - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            if 'row_upload' in request.POST:
                # row_upload: {'pk': 'new_1', 'rosterdate': '2019-04-01'}
                # row_upload: {'pk': '16', 'order': 2}
                # row_upload: {'pk': '19', 'timestatus': 3}
                row_upload = json.loads(request.POST['row_upload'])
                if row_upload is not None:
                    logger.debug('row_upload: ' + str(row_upload))
                    emplhour = None

# ++++ check if a record with this pk exists
                    if 'pk' in row_upload and row_upload['pk']:
        # --- check if it is new record, get company if is existing record
                        # new_record has pk 'new_1' etc
                        if row_upload['pk'].isnumeric():
                            pk_int = int(row_upload['pk'])
                            emplhour = Emplhour.objects.filter(id=pk_int, employee__company=request.user.company).first()
                        else:
                            # this attribute 'new': 'new_1' is necessary to lookup request row on page
                            update_dict['id']['new'] = row_upload['pk']
                            # update_dict: {'id': {'new': 'new_1'}, 'code': {},...

# ++++ save new record ++++++++++++++++++++++++++++++++++++
                        if emplhour is None:
                            # --- add record i
                            emplhour = Emplhour(employee__company=request.user.company)
                            emplhour.save(request=self.request)

        # ---  after saving new record: subtract 1 from company.balance
                            # TODO change to companyinvoice request.user.company.balance -= 1
                            request.user.company.save(request=self.request)

# ++++ existing and new emplhour ++++++++++++++++++++++++++++++++++++
                        if emplhour is not None:
        # --- add pk to update_dict
                            pk_int = emplhour.pk
                            update_dict['id']['pk'] = pk_int

                            save_changes = False
# ++++  delete record when key 'delete' exists in
                            if 'delete' in row_upload:
                                emplhour.delete(request=self.request)
        # --- check if emplhour still exist
                                emplhour = Emplhour.objects.filter(id=pk_int, employee__company=request.user.company).first()
                                if emplhour is None:
                                    update_dict['id']['deleted'] = True
                                else:
                                    msg_err = _('This item could not be deleted.')
                                    update_dict['id']['del_err'] = msg_err

                            else:
# ++++  not a deleted record
# --- save changes in field order, employee and shift
                                for field in ('order', 'employee', 'shift'):
                                    if field in row_upload:
                                        logger.debug('field ' + str(field))
                                        logger.debug('row_upload ' + str(row_upload))

                                        pk_obj = int(row_upload[field])
                                        object = None
                                        if field == 'order':
                                            object = Order.objects.filter(
                                                id=pk_obj,
                                                customer__company=request.user.company
                                            ).first()
                                            logger.debug('object ' + str(object))
                                        elif field == 'employee':
                                            object = Employee.objects.filter(
                                                id=pk_obj,
                                                company=request.user.company
                                            ).first()
                                        elif field == 'shift':
                                            pass
                                            # TODO
                                            #object = Shift.objects.filter(
                                            #    id=pk_obj,
                                            #    company=request.user.company
                                            #).first()
                                        if object:
                                            logger.debug('setattr object' + str(object))
                                            setattr(emplhour, field, object)
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('after setattr object' + str(object))

# --- save changes in date fields
                                for field  in ('rosterdate',):
                                    if field in row_upload:
                                        logger.debug('field ' + str(field))
                                        logger.debug('row_upload ' + str(row_upload))

                                        new_date, msg_err = get_date_from_str(row_upload[field], True) # True = blank_not_allowed
                                        logger.debug('new_date: ' + str(new_date) + str(type(new_date)))
                                        # check if date is valid (empty date is ok)
                                        if msg_err is not None:
                                            update_dict[field]['err'] = msg_err
                                        else:
                                            saved_date = getattr(emplhour, field, None)
                                            logger.debug('saved_date: ' + str(saved_date) + str(type(saved_date)))
                                            if new_date != saved_date:
                                                logger.debug('save date: ' + str(new_date) + str(type(new_date)))
                                                setattr(emplhour, field, new_date)
                                                update_dict[field]['upd'] = True
                                                save_changes = True

# --- save changes in time fields
                                # row_upload: {'pk': '16', 'timestart': '0;17;12'}
                                for field in ('timestart', 'timeend'):
                                    if field in row_upload:
                                        if ';' in row_upload[field]:
                                            arr = row_upload[field].split(';')
                                            day_offset = int(arr[0])
                                            new_hour = int(arr[1])
                                            new_minute = int(arr[2])

                                            msg_err = None
                                            # TODO check if date is valid (empty date is ok)
                                            if msg_err is not None:
                                                update_dict[field]['err'] = msg_err
                                            else:
                                                # row_upload: {'pk': '26', 'timestart': '1;4;48'}
                                                saved_datetime = getattr(emplhour, field, None)
                                                # saved_datetime: 2019-03-30 03:48:00+00:00
                                                logger.debug('saved_datetime: ' + str(saved_datetime))
                                                # get rosterdate when no saved_datetime
                                                dt_naive = None
                                                if saved_datetime is None:
                                                    if emplhour.rosterdate is not None:
                                                        dt_naive = datetime(emplhour.rosterdate.year,
                                                                            emplhour.rosterdate.month,
                                                                            emplhour.rosterdate.day,
                                                                            new_hour,
                                                                            new_minute)
                                                else:
                                                    saved_datetime_aware = get_datetimeaware_from_datetimeUTC(saved_datetime, comp_timezone)
                                                    # saved_datetime_aware: 2019-03-30 04:48:00+01:00
                                                    logger.debug('saved_datetime_aware: ' + str(saved_datetime_aware))

                                                    offset_datetime = saved_datetime_aware + timedelta(days=day_offset)
                                                    # offset_datetime: 2019-03-31 04:48:00+01:00
                                                    logger.debug('offset_datetime: ' + str(offset_datetime))

                                                    dt_naive = datetime(offset_datetime.year,
                                                                        offset_datetime.month,
                                                                        offset_datetime.day,
                                                                        new_hour,
                                                                        new_minute)
                                                # dt_naive: 2019-03-31 04:48:00
                                                logger.debug( 'dt_naive: ' + str(dt_naive))

                                                # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
                                                timezone = pytz.timezone(comp_timezone)
                                                # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
                                                logger.debug( 'timezone: ' + str(timezone) + str( type(timezone)))

                                                dt_localized = timezone.localize(dt_naive)
                                                # dt_localized: 2019-03-31 04:48:00+02:00
                                                logger.debug('dt_localized: ' + str(dt_localized))

                                                utc = pytz.UTC
                                                dt_as_utc = dt_localized.astimezone(utc)
                                                # dt_as_utc: 2019-03-31 02:48:00+00:00
                                                logger.debug( 'dt_as_utc: ' + str(dt_as_utc))

                                                setattr(emplhour, field, dt_as_utc)
                                                update_dict[field]['upd'] = True
                                                save_changes = True
                                                emplhour.save(request=self.request)
                                                # datetimesaved: 2019-03-31 02:48:00+00:00
                                                logger.debug('datetimesaved: ' + str(getattr(emplhour, field, None)))
# --- save changes in breakduration field
                                for field in ('timeduration', 'breakduration',):
                                    # row_upload: {'pk': '18', 'breakduration': '0.5'}
                                    if field in row_upload:
                                        logger.debug('row_upload[' + field + ']: ' + str(row_upload[field]))
                                        value_str = row_upload[field]
                                        logger.debug('value_str: <' + str(value_str) + '> type: ' + str(type(value_str)))
                                        logger.debug([value_str])

                                        # replace comma by dot
                                        value_str = value_str.replace(',', '.')
                                        value_str = value_str.replace(' ', '')
                                        value_str = value_str.replace("'", "")
                                        value = float(value_str) if value_str != '' else 0

                                        # duration unit in database is minutes
                                        new_value = 60 * value
                                        logger.debug('new_value ' + str(new_value) + ' ' + str(type(new_value)))
                                        saved_value = getattr(emplhour, field, None)
                                        logger.debug('saved_value[' + field + ']: ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            logger.debug('setattr ' + str(new_value))
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('update_dict[' + field + ']: ' + str(update_dict[field]))
                                #TODO: change end time whem timeduration has changed
# --- save changes in other fields
                                for field in ('timestatus', 'orderhourstatus'):
                                    if field in row_upload:
                                        logger.debug('row_upload[' + field + ']: ' + str(row_upload[field]))
                                        new_value = int(row_upload[field])
                                        logger.debug('new_value ' + str(new_value))
                                        saved_value = getattr(emplhour, field, None)
                                        logger.debug('saved_value ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            logger.debug('setattr ' + str(new_value))
                                            update_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('update_dict[field] ' + str(update_dict[field]))


# --- calculate working hours
                                if save_changes:
                                    logger.debug('calculate working hours')
                                    if emplhour.timestart and emplhour.timeend:
                                        # duration unit in database is minutes
                                        saved_break_minutes = int(getattr(emplhour, 'breakduration', 0))
                                        logger.debug('saved_breakduration: ' + str(saved_break_minutes) +  str(type(saved_break_minutes)))

                                        datediff = emplhour.timeend - emplhour.timestart
                                        logger.debug('datediff: ' + str(datediff) +  str(type(datediff)))
                                        datediff_minutes = (datediff.total_seconds() / 60)
                                        logger.debug('datediff_minutes: ' + str(datediff_minutes) +  str(type(datediff_minutes)))
                                        new_time_minutes = datediff_minutes - saved_break_minutes
                                        logger.debug('new_time_minutes: ' + str(new_time_minutes) +  str(type(new_time_minutes)))

                                        saved_time_minutes = getattr(emplhour, 'timeduration', 0)
                                        logger.debug('saved_time_minutes: ' + str(saved_time_minutes) + str(type(saved_time_minutes)))

                                        if new_time_minutes != saved_time_minutes:
                                            emplhour.timeduration = new_time_minutes
                                            update_dict['timeduration']['upd'] = True
                                            save_changes = True

                                            #logger.debug('timeduration: ' + str(emplhour.timeduration) + str(type(emplhour.timeduration)))
# --- save changes
                                if save_changes:
                                    emplhour.save(request=self.request)
                                    logger.debug('changes saved ')
                                    for field in update_dict:
                                        saved_value = None
                                        saved_html = None
                                        # 'upd' has always value True, or it does not exist
                                        if 'upd' in update_dict[field]:
                                            try:
                                                if field == 'order':
                                                    saved_value = emplhour.order.code
                                                elif field == 'employee':
                                                    saved_value = emplhour.employee.code
                                                elif field == 'shift':
                                                    saved_value = emplhour.shift.code
                                                elif field == 'timestart':
                                                    saved_value = emplhour.timestart_datetimelocal
                                                    saved_html = emplhour.timestartdhm
                                                elif field == 'timeend':
                                                    saved_value = emplhour.timeend_datetimelocal
                                                    saved_html = emplhour.timeenddhm
                                                elif field == 'timeduration':
                                                    saved_value = emplhour.time_hours
                                                elif field == 'breakduration':
                                                    saved_value = emplhour.breakhours
                                                else:
                                                    saved_value = getattr(emplhour, field, None)
                                            except:
                                                pass
                                        if saved_value:
                                            update_dict[field]['val'] = saved_value
                                            if saved_html:
                                                update_dict[field]['html'] = saved_html

# --- remove empty attributes from update_dict
        remove_empty_attr_from_dict(update_dict)

        row_update = {'row_update': update_dict}
        # row_update = {'row_update': {'idx': {'pk': '1'}, 'code': {'status': 'upd'}, 'modifiedby': {'val': 'Hans'},
        #              'modifiedat': {'val': '29 mrt 2019 10.20u.'}}}

        logger.debug('row_update: ')
        logger.debug(str(row_update))
        row_update_json = json.dumps(row_update, cls=LazyEncoder)
        logger.debug(str(row_update_json))

        return HttpResponse(row_update_json)


@method_decorator([login_required], name='dispatch')
class EmplhourDownloadDatalistView(View):  # PR2019-03-10
    # function updates employee, customer and shift list
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourDownloadDatalistView ============= ')
        # logger.debug('request.POST' + str(request.POST) )

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                # request.POST:
                # datalist_download = {"rosterdatefirst": rosterdatefirst, 'rosterdatelast': rosterdatelast}

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


                orders = Order.objects.filter(customer__company=request.user.company, inactive=False).order_by(Lower('code'))
                order_list = []
                for order in orders:
                    dict = {'pk': order.id, 'code': order.code}
                    if order.datefirst:
                        dict['datefirst'] = order.datefirst
                    if order.datelast:
                        dict['datelast'] = order.datelast
                    order_list.append(dict)

                employees = Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
                employee_list = []
                for employee in employees:
                    dict = {'pk': employee.id, 'code': employee.code}
                    if employee.datefirst:
                        dict['datefirst'] = employee.datefirst
                    if employee.datelast:
                        dict['datelast'] = employee.datelast
                    employee_list.append(dict)

                datalists = {'orders': order_list, 'employees': employee_list}


        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        # logger.debug('datalists_json:')
        # logger.debug(str(datalists_json))

        return HttpResponse(datalists_json)


# === SchemesView ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class SchemesView(View):

    def get(self, request):
        param = {}
        # logger.debug(' ============= SchemesView ============= ')
        if request.user.company is not None:


# --- get user_lang
            user_lang = request.user.lang if request.user.lang else LANGUAGE_CODE
            if not user_lang in WEEKDAYS_ABBREV:
                user_lang = LANGUAGE_CODE

# --- create list of all active customers of this company
            include_inactive = False
            customer_json = json.dumps(create_customer_list(request.user.company, user_lang, include_inactive))

# --- create list of all active orders of this company
            # order_json = json.dumps(create_order_list(request.user.company))


# --- get weekdays translated
            if not user_lang in WEEKDAYS_ABBREV:
                user_lang = LANGUAGE_CODE
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[user_lang])

# --- get months translated
            if not user_lang in MONTHS_ABBREV:
                user_lang = LANGUAGE_CODE
            months_json = json.dumps(MONTHS_ABBREV[user_lang])

# --- get today
            today_dict = {'value': str(date.today()),
                          'wdm': get_date_WDM_from_dte(date.today(), user_lang),
                          'wdmy': format_WDMY_from_dte(date.today(), user_lang),
                          'dmy': format_DMY_from_dte(date.today(), user_lang),
                          'offset': get_weekdaylist_for_DHM(date.today(), user_lang)}
            today_json = json.dumps(today_dict)

# ---  get interval
            interval = 1
            if request.user.company.interval:
                interval = request.user.company.interval

# get timeformat
            # timeformat = 'AmPm'
            timeformat = '24h'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in TIMEFORMATS:
                timeformat = '24h'

            param = get_headerbar_param(request, {
                'customer_list': customer_json,
                'lang': user_lang,
                'weekdays': weekdays_json,
                'months': months_json,
                'today': today_json,
                'interval': interval,
                'timeformat': timeformat
            })

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'schemes.html', param)


@method_decorator([login_required], name='dispatch')
class SchemeUploadView(View):  # PR2019-06-06
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
            # - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

# - get upload_dict from request.POST
            upload_dict = {}
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'pk': 19, 'parent_pk': 6}, 'cycle': {'update': True, 'value': '6'}}

                instance = None
                parent_instance = None

# - get_iddict_variables
                id_dict = upload_dict.get('id')
                if id_dict:
                    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, table = get_iddict_variables(id_dict)

# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
                    field_list = ()
                    if table == 'scheme':
                        field_list = ('id', 'code', 'cycle', 'datefirst', 'datelast')
                    elif table == 'team':
                        field_list = ('id', 'code')
                    update_dict = create_dict_with_empty_attr(field_list)

# - check if parent exists (scheme is parent of schemeitem, team is parent of teammember (and scheme is parent of team)
                    parent_instance = get_parent_instance(table, parent_pk_int, update_dict, request.user.company)
                    logger.debug('update_dict: ' + str(update_dict))

# - Delete item
                    if is_delete:
                        delete_instance(table, pk_int, parent_instance, update_dict, self.request)

# === Create new schemeitem or teammember
                    elif is_create:
                        code = None
                        code_dict = upload_dict.get('code')
                        if code_dict:
                            code = code_dict.get('value')
                        instance = create_instance(table, parent_instance, code, temp_pk_str, update_dict, request)

# - get instance if update
                    else:
                        instance = get_instance(table, pk_int, parent_instance, update_dict)
                    logger.debug('instance: ' + str(instance))

# update_item, also when it is a created item
                    if instance:
                        update_instance(instance, upload_dict, update_dict, self.request, user_lang)

# --- remove empty attributes from update_dict
                    remove_empty_attr_from_dict(update_dict)
                    if update_dict:
                        item_update_dict['item_update'] = update_dict

                    # update schemeitem_list when changes are made
                    if table == 'scheme':
                        scheme_list = Scheme.create_scheme_list(instance.order, user_lang)
                        if scheme_list:
                            item_update_dict['scheme_list'] = scheme_list
                    elif table == 'team':
                        team_list = Team.create_team_list(instance.scheme.order)
                        if team_list:
                            item_update_dict['team_list'] = team_list

        # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(item_update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


@method_decorator([login_required], name='dispatch')
class DatalistDownloadView(View):  # PR2019-05-23

    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= DatalistDownloadView ============= ')
        # logger.debug(request)

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                if request.POST['datalist_download']:
                    user_lang = request.user.lang if request.user.lang else 'nl'
                    activate(user_lang)

# - get comp_timezone PR2019-06-14
                    comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
                    # logger.debug('request.user.company.timezone: ' + str(request.user.company.timezone))

                    datalist_dict = json.loads(request.POST['datalist_download'])
                    # logger.debug('datalist_dict: ' + str(datalist_dict) + ' ' + str(type(datalist_dict)))

                    # datalist_dict: {"customers": {inactive: false}, "orders": {inactive: true},
                    #                   "employees": {inactive: false}, "rosterdate": true});

                    # datalist_dict: {'schemes': {'order_pk': 48}, 'schemeitems': {'order_pk': 48},
                    #                   'shifts': {'order_pk': 48}, 'teams': {'order_pk': 48}}

                    for table in datalist_dict:
                        table_dict = datalist_dict[table]

# - get include_inactive from table_dict
                        include_inactive = False
                        if 'inactive' in table_dict:
                            include_inactive = table_dict['inactive']
                        # logger.debug('datalist table: ' + str(table) + ' include_inactive: ' + str(include_inactive) + ' ' + str(type(include_inactive)))

# - get order from table_dict
                        order_pk = table_dict.get('order_pk')
                        order = None
                        if order_pk:
                            order = Order.objects.filter(customer__company=request.user.company, pk=order_pk).first()
                        # logger.debug('order: ' + str(order) + ' ' + str(type(order)))

                        list = []
                        if table == 'customers':
                            list = create_customer_list(request.user.company, user_lang, include_inactive)
                        if table == 'orders':
                            list = create_order_list(request.user.company, user_lang, include_inactive)
                        if table == 'employees':
                            list = create_employee_list(request.user.company)
                        if order:
                            if table == 'schemes':
                                list = Scheme.create_scheme_list(order, user_lang)
                            if table == 'schemeitems':
                                list = Schemeitem.create_schemeitem_list(order, comp_timezone, user_lang)
                            if table == 'teams':
                                list = Team.create_team_list(order)
                            if table == 'teammembers':
                                list = Teammember.create_teammember_list(order, user_lang)
                            if table == 'shifts':
                                list = Schemeitem.create_shift_list(order)
                        if list:
                            datalists[table] = list

                        if table == 'rosterdate':
                            datalists[table] = get_next_rosterdate(request.user.company, user_lang)

        datalists_json = json.dumps(datalists, cls=LazyEncoder)

        return HttpResponse(datalists_json)

@method_decorator([login_required], name='dispatch')
class SchemeOrTeamUploadView(UpdateView):  # PR2019-05-25

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeOrTeamUploadView ============= ')
        logger.debug('request.POST' + str(request.POST))
        # {'upload': ['{"id":{"temp_pk":"new_1","create":true,"parent_pk":46},"code":{"update":true,"value":"new"}}']}>
        update_dict = {}
        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)
            tblName = ''
            if 'scheme' in request.POST:
                tblName = 'scheme'
            elif 'team' in request.POST:
                tblName = 'team'
            if tblName:
                upload_json = request.POST.get(tblName, None)
                if upload_json:
                    upload_dict = json.loads(upload_json)
                    update_dict = {}
                    if tblName == 'scheme':
                        update_dict = SchemeUpload(request, upload_dict, user_lang)
                    elif tblName == 'team':
                        update_dict = TeamUpload(request, upload_dict)

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

def SchemeUpload(request, upload_dict, user_lang):  # PR2019-05-31
    logger.debug(' --- SchemeUpload --- ')
    logger.debug(upload_dict)
    #  {'id': {'temp_pk': 'new_1', 'create': True, 'parent_pk': 6}, 'code': {'update': True, 'value': 'new'}}

# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    scheme_update_dict = {}
    field_list = ('id', 'order', 'code', 'cycle')
    update_dict = create_dict_with_empty_attr(field_list)

# --- get id_dict  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
    id_dict = upload_dict.get('id')
    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)
# check if parent exists
    order = get_order(request.user.company, parent_pk_int)
# check if scheme exists
    if order:
        scheme = None
        save_changes = False
# ===== Create new scheme
        if 'create' in id_dict:
            # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            if temp_pk_str:
                update_dict['id']['temp_pk'] = temp_pk_str
            scheme = Scheme(order=order)
            scheme.save(request=request)
            if scheme:
                update_dict['id']['created'] = True
                save_changes = True
        else:
# ===== or get existing scheme
            scheme = Scheme.objects.filter(id=pk_int, order=order).first()
        if scheme:
            update_dict['id']['pk'] = scheme.pk
            update_dict['id']['parent_pk'] = scheme.order.pk
            logger.debug('scheme: ' + str(scheme))
# ===== Delete scheme
        if 'delete' in id_dict and not 'create' in id_dict:
            scheme.delete(request=request)
# check if record still exist
            scheme = Scheme.objects.filter(id=pk_int, order=order).first()
            if scheme is None:
                update_dict['id']['deleted'] = True
            else:
                msg_err = _('This scheme could not be deleted.')
                update_dict['id']['del_err'] = msg_err
        else:
# --- save changes in field 'code' and 'cycle'
            save_changes = False
            field = 'code'
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                new_value = field_dict.get('value')
                saved_value = getattr(scheme, field, None)
                # don't update empty code - it will eras existing code
                if new_value and new_value != saved_value:
                    setattr(scheme, field, new_value)
                    update_dict[field]['updated'] = True
                    save_changes = True
            field = 'cycle'
            if field in upload_dict:
                field_dict = upload_dict.get(field)
                new_value = field_dict.get('value')
                saved_value = getattr(scheme, field, None)
                # code = 0 is valid (oce only), don't skip
                if new_value != saved_value:
                    setattr(scheme, field, new_value)
                    update_dict[field]['updated'] = True
                    save_changes = True
            for field  in ['datefirst', 'datelast']:
                if field in upload_dict:
                    field_dict = upload_dict.get(field)
                    field_value = field_dict.get('value')  # field_value: '2019-04-12'
                    new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
                    if msg_err is not None:
                        update_dict[field]['err'] = msg_err
                    else:
                        saved_date = getattr(scheme, field, None)
                        if new_date != saved_date:
                            setattr(scheme, field, new_date)
                            update_dict[field]['updated'] = True
                        save_changes = True

# --- save changes
        if save_changes:
            scheme.save(request=request)

            for field in update_dict:
                if field == 'code':
                    if scheme.code:
                        update_dict[field]['value'] = scheme.code
                if field == 'cycle':
                    update_dict[field]['value'] = scheme.cycle

# --- update scheme_list
            scheme_list = Scheme.create_scheme_list(scheme.order, user_lang)
            logger.debug('scheme_list: ' + str(scheme_list))
            if scheme_list:
                scheme_update_dict['scheme_list'] = scheme_list

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    if update_dict:
        scheme_update_dict['scheme_update'] = update_dict

    # update_dict: {'id': {'temp_pk': 'new_1', 'created': True, 'pk': 51, 'parent_pk': 6},
        # 'code': {'updated': True, 'value': 'new'},
        # 'cycle': {'value': 0}}
    return scheme_update_dict

def TeamUpload(request, upload_dict):  # PR2019-05-31
        logger.debug(' --- TeamUpload --- ')
        logger.debug(upload_dict)
        # {'id': {'pk': 104, 'delete': True, 'parent_pk': 20}}
        # {'id': {'temp_pk': 'new_2', 'create': True, 'parent_pk': 20}, 'code': {'update': True, 'value': 'ZZ'}}
# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        team_update_dict = {}
        field_list = ('id', 'scheme', 'code')
        update_dict = create_dict_with_empty_attr(field_list)

# --- get id_dict  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
        id_dict = upload_dict.get('id')
        pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# check if parent exists
        scheme = get_scheme(request.user.company, parent_pk_int)
# check if team exists
        if scheme:
            team = None
            save_changes = False
# ===== Create new team
            if 'create' in id_dict:
                # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
                if temp_pk_str:
                    update_dict['id']['temp_pk'] = temp_pk_str
                team = Team(scheme=scheme)
                team.save(request=request)
                if team:
                    update_dict['id']['created'] = True
                    save_changes = True
            else:
# ===== or get existing team
                team = Team.objects.filter(id=pk_int, scheme=scheme).first()
            if team:
                update_dict['id']['pk'] = team.pk
                update_dict['id']['parent_pk'] = team.scheme.pk
# ===== Delete team
                if 'delete' in id_dict and not 'create' in id_dict:
                    team.delete(request=request)
# check if record still exist
                    team = Team.objects.filter(id=pk_int, scheme=scheme).first()
                    if team is None:
                        update_dict['id']['deleted'] = True
                    else:
                        msg_err = _('This team could not be deleted.')
                        update_dict['id']['del_err'] = msg_err
                else:
# --- save changes in field 'code'
                    save_changes = False
                    field = 'code'
                    if field in upload_dict:
                        field_dict = upload_dict.get(field)
                        new_value = field_dict.get('value')
                        saved_value = getattr(team, field, None)
                        # don't update empty code - it will eras existing code
                        if new_value and new_value != saved_value:
                            setattr(team, field, new_value)
                            update_dict[field]['updated'] = True
                            save_changes = True
# --- save changes
            if save_changes:
                team.save(request=request)

                for field in update_dict:
                    if field == 'code':
                        if team.code:
                            update_dict[field]['value'] = team.code
# --- update team_list
                team_list = Team.create_team_list(scheme.order)
                if team_list:
                    team_update_dict['team_list'] = team_list

# --- remove empty attributes from update_dict
        remove_empty_attr_from_dict(update_dict)
        if update_dict:
            team_update_dict['team_update'] = update_dict
        # update_dict: {'id': {'temp_pk': 'new_2', 'created': True, 'pk': 109, 'parent_pk': 20},
        #               'code': {'updated': True, 'value': 'ZZ'}}
        # update_dict: {'id': {'pk': 108, 'parent_pk': 20, 'del_err': 'Dit team kon niet worden gewist.'}}

        return team_update_dict


def get_order(company, order_pk):
    order = None
    if order_pk:
        order = Order.objects.filter(id=order_pk,customer__company=company).first()
    return order


def get_scheme(company, scheme_pk):
    scheme = None
    if scheme_pk:
        scheme = Scheme.objects.filter( id=scheme_pk, order__customer__company=company).first()
    return scheme


@method_decorator([login_required], name='dispatch')
class SchemeitemDownloadView(View):  # PR2019-03-10
    # function downloads scheme, teams and schemeitems of selected scheme
    def post(self, request, *args, **kwargs):
        # logger.debug(' ====++++++++==== SchemeItemDownloadView ============= ')
        # logger.debug('request.POST' + str(request.POST) )
        # {'scheme_download': ['{"scheme_pk":18}']}

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                # - Reset language
                # PR2019-03-15 Debug: language gets lost, get request.user.lang again
                user_lang = request.user.lang if request.user.lang else 'nl'
                activate(user_lang)

# - get comp_timezone PR2019-06-14
                comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

                if request.POST['scheme_download']:
                    scheme_download = json.loads(request.POST['scheme_download'])
                    # logger.debug('scheme_download: ' + str(scheme_download) + str(type(scheme_download)))
                    # scheme_download: {'scheme_pk': 18}
                    scheme_pk = int(scheme_download.get('scheme_pk', '0'))
                    scheme = Scheme.objects.filter(order__customer__company=request.user.company,
                                                    pk=scheme_pk,
                                                    ).first()
                    if scheme:
                        scheme_dict = {}
                        scheme_dict['id'] = {'pk': scheme.id, 'parent_pk': scheme.order.id}
                        scheme_dict['code'] = {'value': scheme.code}
                        scheme_dict['cycle'] = {'value': scheme.cycle}
                        scheme_dict['weekend'] = {'value': scheme.weekend}
                        scheme_dict['publicholiday'] = {'value': scheme.publicholiday}
                        scheme_dict['inactive'] = {'value': scheme.inactive}

                        datalists = {'scheme': scheme_dict}
                        # logger.debug('datalists: ' + str(datalists))

                        # create shift_list
                        shift_list = Schemeitem.create_shift_list(scheme.order)
                        if shift_list:
                            datalists['shift_list'] = shift_list

                        # create team_list
                        team_list = Team.create_team_list(scheme.order)
                        if team_list:
                            datalists['team_list'] = team_list

                        # create schemeitem_list
                        schemeitem_list = Schemeitem.create_schemeitem_list(scheme.order, comp_timezone, user_lang)
                        if schemeitem_list:
                            datalists['schemeitem_list'] = schemeitem_list
                            # shift_list.sort()
                            datalists['shift_list'] = shift_list

                        # today is used for new schemeitem without previous rosterday
                        today_dict = {'value': str(date.today()),
                                      'wdm': get_date_WDM_from_dte(date.today(), user_lang),
                                      'wdmy': format_WDMY_from_dte(date.today(), user_lang),
                                      'dmy': format_DMY_from_dte(date.today(), user_lang),
                                      'offset': get_weekdaylist_for_DHM(date.today(), user_lang)}

                        datalists['today'] = today_dict

                        datalists['months'] = MONTHS_ABBREV[user_lang]
                        datalists['weekdays'] = WEEKDAYS_ABBREV[user_lang]

        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        # logger.debug('datalists_json:')
        # logger.debug(str(datalists_json))

        # {"scheme": {"pk": 18, "code": "MCB scheme", "cycle": 7, "weekend": 1, "publicholiday": 1, "inactive": false},
        #  "team_list": [{"pk": 1, "code": "Team A"}],
        #  "schemeitem_list": [{"pk": 4, "rosterdate": "2019-04-27", "shift": ""},
        #                      {"pk": 5, "rosterdate": "2019-04-27", "shift": ""},

        return HttpResponse(datalists_json)

@method_decorator([login_required], name='dispatch')
class SchemeitemFillView(UpdateView):  # PR2019-06-05

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeitemFillView ============= ')

        item_update_dict = {}

        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

            logger.debug('request.POST: ' + str(request.POST))

# - get "schemeitem_dayup" schemeitem_daydown "schemeitem_fill"
            parameter = ''
            if 'schemeitem_autofill' in request.POST:
                parameter = 'schemeitem_autofill'
            elif 'schemeitem_dayup' in request.POST:
                parameter = 'schemeitem_dayup'
            elif 'schemeitem_daydown' in request.POST:
                parameter = 'schemeitem_daydown'
            logger.debug('parameter: ' + str(parameter))

# - get upload_dict from request.POST
            upload_json = request.POST.get(parameter, None)
            if upload_json:
            # upload_dict: {'scheme_pk': 19}
                upload_dict = json.loads(upload_json)
                scheme_pk = upload_dict.get('scheme_pk')

            # get scheme
                scheme = None
                cycle = 0
                scheme_datefirst = None
                scheme_datelast = None

                schemeitem_list = []
                has_new_schemeitem = False

                if scheme_pk:
                    scheme = Scheme.objects.filter(id=scheme_pk, order__customer__company=request.user.company).first()
                logger.debug('scheme: ' + str(scheme))

                if scheme:
                # get info from scheme
                    if scheme.cycle:
                        cycle = scheme.cycle
                    if scheme.datefirst:
                        scheme_datefirst = scheme.datefirst
                    if scheme.datelast:
                        scheme_datelast = scheme.datelast

# --- Autofill
                    if parameter == 'schemeitem_autofill':
                        if cycle > 1:
            # create list of schemeitems of scheme of this order, exept this scheme  PR2019-05-12
                            schemeitems = Schemeitem.objects.filter(scheme__order=scheme.order).exclude(scheme=scheme)
                            for schemeitem in schemeitems:
                                schemeitem_dict = Schemeitem.create_schemeitem_dict(schemeitem, comp_timezone, user_lang)
                                schemeitem_list.append(schemeitem_dict)
                                logger.debug('other schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                                logger.debug('other id_dict: ' + str(schemeitem_dict.get('id')))

            # get first_rosterdate and last_rosterdate from schemeitems of this scheme
                            schemeitems = Schemeitem.objects.filter(scheme=scheme)
                            first_rosterdate = None
                            last_rosterdate = None
                            enddate_plusone = None
                            date_add = 0
                            for schemeitem in schemeitems:

            # append existing schemeitems to schemeitem_list
                                # schemeitem, user_lang, temp_pk=None, is_created=False, is_deleted=False, updated_list=None):
                                schemeitem_dict = Schemeitem.create_schemeitem_dict(schemeitem, comp_timezone, user_lang)
                                schemeitem_list.append(schemeitem_dict)
                                logger.debug('existing schemeitem: ' + str(schemeitem.pk) + ' ' + str(schemeitem.rosterdate))
                                logger.debug('existing id_dict: ' + str(schemeitem_dict.get('id')))

            # get number of days between first_rosterdate and last_rosterdate_plusone
                                if first_rosterdate is None or schemeitem.rosterdate < first_rosterdate:
                                    first_rosterdate = schemeitem.rosterdate
                                if last_rosterdate is None or schemeitem.rosterdate > last_rosterdate:
                                    last_rosterdate = schemeitem.rosterdate
                                date_add = get_date_diff_plusone(first_rosterdate, last_rosterdate)
                                enddate_plusone = first_rosterdate + timedelta(days=cycle)
                                logger.debug('date_add: ' + str(date_add))

                            if date_add > 0:
                                for n in range(scheme.cycle): # range(6) is the values 0 to 5.
                                    for schemeitem in schemeitems:
                                        days = (date_add * (n + 1))
                                        new_rosterdate = schemeitem.rosterdate + timedelta(days=days)

                        # check date range of scheme
                                        in_range = date_within_range(scheme_datefirst, scheme_datelast, new_rosterdate)
                                        if in_range:
                                            if new_rosterdate < enddate_plusone:
                        # create new schemeitem, with same base as copied schemeitem

                                            # get new_schemeitem.time_start
                                                new_time_start = None
                                                if new_rosterdate and schemeitem.timestartdhm:
                                                    new_time_start = get_datetimelocal_from_DHM(
                                                        new_rosterdate, schemeitem.timestartdhm, comp_timezone)
                                            # get new_schemeitem.time_start
                                                new_time_end = None
                                                if new_rosterdate and schemeitem.timeenddhm:
                                                    new_time_end = get_datetimelocal_from_DHM(
                                                        new_rosterdate, schemeitem.timeenddhm, comp_timezone)
                                            # get new_schemeitem.timeduration
                                                new_timeduration = None
                                                if new_time_start and new_time_end:
                                                    new_timeduration = get_time_minutes(
                                                        new_time_start,
                                                        new_time_end,
                                                        schemeitem.breakduration)

                                            # create new schemeitem
                                                new_schemeitem = Schemeitem(
                                                    base=schemeitem.base,
                                                    scheme=schemeitem.scheme,
                                                    rosterdate=new_rosterdate,
                                                    team=schemeitem.team,
                                                    shift=schemeitem.shift,
                                                    timestartdhm=schemeitem.timestartdhm,
                                                    timestart=new_time_start,
                                                    timeenddhm = schemeitem.timeenddhm,
                                                    timeend = new_time_end,
                                                    breakduration=schemeitem.breakduration,
                                                    timeduration=new_timeduration
                                                )

                                                new_schemeitem.save(request=self.request)
                                                logger.debug('new schemeitem: ' + str(new_schemeitem.pk) + ' ' + str(new_schemeitem.rosterdate))
                                                has_new_schemeitem = True

                    # append new schemeitem to schemeitem_list, with attr 'created'
                                                # schemeitem, user_lang, temp_pk=None, is_created=False, is_deleted=False, updated_list=None):
                                                schemeitem_dict = Schemeitem.create_schemeitem_dict(new_schemeitem, comp_timezone, user_lang)
                                                schemeitem_list.append(schemeitem_dict)
                                                logger.debug('new id_dict: ' + str(schemeitem_dict.get('id')))

# --- Dayup Daydown
                    elif parameter in ['schemeitem_dayup', 'schemeitem_daydown']:
                        date_add = -1 if parameter == 'schemeitem_dayup' else 1
                        logger.debug('date_add: ' + str(date_add) + ' type: ' + str(type(date_add)))
                        schemeitems = Schemeitem.objects.filter(scheme=scheme)
                        for schemeitem in schemeitems:

                    # change rosterdate, update
                            new_rosterdate = schemeitem.rosterdate + timedelta(days=date_add)
                            logger.debug('new_rosterdate: ' + str(new_rosterdate) + ' type: ' + str(type(new_rosterdate)))

                            schemeitem.rosterdate = new_rosterdate
                    # update timestart, timeend, timeduration
                            if schemeitem.timestartdhm:
                                schemeitem.time_start = get_datetimelocal_from_DHM(
                                    new_rosterdate,
                                    schemeitem.timestartdhm,
                                    comp_timezone)
                            if schemeitem.timeend:
                                schemeitem.timeend = get_datetimelocal_from_DHM(
                                    new_rosterdate,
                                    schemeitem.timeenddhm,
                                    comp_timezone)

                            schemeitem.timeduration = get_time_minutes(
                                schemeitem.timestart,
                                schemeitem.timeend,
                                schemeitem.breakduration)
                    # save schemeitem
                            schemeitem.save(request=self.request)
                            logger.debug('schemeitem.rosterdate: ' + str(schemeitem.rosterdate))

                        schemeitem_list = Schemeitem.create_schemeitem_list(scheme.order, comp_timezone, user_lang)

                if has_new_schemeitem:
                    item_update_dict['item_update'] = {'created': True}
                if schemeitem_list:
                    item_update_dict['schemeitem_list'] = schemeitem_list

        return HttpResponse(json.dumps(item_update_dict, cls=LazyEncoder))


@method_decorator([login_required], name='dispatch')
class SchemeItemUploadView(UpdateView):  # PR2019-06-01
    # also for teammembers
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeItemUploadView ============= ')

        item_update_dict = {}
        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# - get upload_dict from request.POST
            upload_dict = {}
            upload_json = request.POST.get('schemeitem_upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))

                # upload_dict: {'id': {'temp_pk': 'new_4', 'create': True, 'parent_pk': 82, 'table': 'teammembers'},
                #             'team': {'update': True, 'value': 'PLoeg B', 'pk': 82},
                #         'employee': {'update': True, 'value': 'Arlienne', 'pk': 282}}

                # upload_dict: {'id': {'pk': 682, 'parent_pk': 19}, 'rosterdate': {'value': '2019-04-03', 'update': True}}

                # upload_dict:  {'id': {'temp_pk': 'new_6', 'create': True, 'parent_pk': 2, 'table': 'schemeitems'},
                # 'rosterdate': {'update': True, 'value': '2019-06-12'},
                # 'shift':      {'update': True, 'value': 'av'},
                # 'team':       {'update': True}}

            pk_int = 0
            parent_pk_int = 0
            temp_pk_str = ''
            is_create = False
            is_delete = False
            tablename = ''
            msg_err = ''

            scheme = None
            team = None
            employee = None
            schemeitem = None
            teammember = None

            shift_list = []
            team_list = []
            update_dict = {}

# - get_iddict_variables, put id_dict in update_dict
            id_dict = upload_dict.get('id')
            if id_dict:
                pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)
                # id_dict is added to update_dict after check if parent_exists and item_exists
            logger.debug('id_dict: ' + str(id_dict))
            # id_dict: {'temp_pk': 'new_3', 'create': True, 'parent_pk': 2, 'table': 'schemeitems'}
            # id_dict: {'pk': 178, 'parent_pk': 6, 'table': 'schemeitems'}

# - Create empty update_dict with keys for all fields if not exist. Unused ones will be removed at the end
              # this one is not working: update_dict = dict.fromkeys(field_list, {})
            field_list = ()
            if tablename == 'schemeitems':
                field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                              'timestart', 'timeend', 'timeduration', 'breakduration')
            elif tablename == 'teammembers':
                field_list = ('id', 'team', 'employee', 'datefirst', 'datelast')
            update_dict = create_dict_with_empty_attr(field_list)
            logger.debug('update_dict: ' + str(update_dict))

# - check if parent exists (scheme is parent of schemeitem, team is parent of teammember (and scheme is parent of team)
            parent_exists = False
            if parent_pk_int:
                if tablename == 'schemeitems':
                    scheme = Scheme.objects.filter(id=parent_pk_int, order__customer__company=request.user.company).first()
                    if scheme:
                        parent_exists = True
                elif tablename == 'teammembers':
                    team = Team.objects.filter( id=parent_pk_int,scheme__order__customer__company=request.user.company).first()
                    if team:
                        scheme = team.scheme
                        parent_exists = True
            if parent_exists:
                update_dict['id']['parent_pk'] = parent_pk_int
                update_dict['id']['table'] = tablename

# check if item exists
            item_exists = False
            if pk_int and parent_exists and not is_create:
                if tablename == 'schemeitems':
                    schemeitem = Schemeitem.objects.filter(id=pk_int, scheme=scheme).first()
                    if schemeitem:
                        item_exists = True
                elif tablename == 'teammembers':
                    teammember = Teammember.objects.filter(id=pk_int, team=team).first()
                    if teammember:
                        item_exists = True
                if item_exists:
                    update_dict['id']['pk'] = pk_int
                    # logger.debug('item_exists: ' + str(update_dict))
            logger.debug('update_dict: ' + str(update_dict))

# - check if employee exists - employee is required field of teammember, is skipped in schemeitems (no field employee)
            employee_exists = False
            if tablename == 'teammembers':
                employee_dict = upload_dict.get('employee')
                if employee_dict:
                    employee_pk = employee_dict.get('pk')
                    if employee_pk:
                        employee = Employee.objects.filter(id=employee_pk, company=request.user.company).first()
                        if employee:
                            employee_exists = True

# ===== Delete schemeitem
            if is_delete:
                if item_exists:
                    item_exists = False
                    if tablename == 'schemeitems':
                        schemeitem.delete(request=self.request)
            # check if record still exists
                        schemeitem = Schemeitem.objects.filter(id=pk_int, scheme=scheme).first()
                        if schemeitem is None:
                            update_dict['id']['deleted'] = True
                        else:
                            msg_err = _('This shift could not be deleted.')
                            update_dict['id']['del_err'] = msg_err
                    elif tablename == 'teammembers':
                        teammember.delete(request=self.request)
            # check if record still exists
                        teammember = Teammember.objects.filter(id=pk_int, team=team).first()
                        if teammember is None:
                            update_dict['id']['deleted'] = True
                        else:
                            msg_err = _('This teammember could not be deleted.')
                            update_dict['id']['error'] = msg_err

# === Create new schemeitem or teammember
            elif is_create:
                if parent_exists:
                    if tablename == 'schemeitems':
                        logger.debug('Create new schemeitem: ')

                        is_update, rosterdate_str = get_fielddict_variables(upload_dict, 'rosterdate')
                        rosterdate, msg_err = get_date_from_str(rosterdate_str, True)
                        # logger.debug('Create  schemeitem rosterdate: ' + str(rosterdate) + ' type' + str(type(rosterdate)))
                        if msg_err:
                            update_dict['rosterdate']['error'] = msg_err
                        else:

        # When new schemeitems record: First create base record. base.id is used in SchemeItem. Create also saves new record
                            base = Schemeitembase.objects.create()
                            schemeitem = Schemeitem(base=base, scheme=scheme, rosterdate=rosterdate)
                            schemeitem.save(request=self.request)
                            test_pk_int = schemeitem.pk

                        # check if record exists
                            schemeitem = Schemeitem.objects.filter(id=test_pk_int, scheme=scheme).first()
                            if schemeitem:
                                # logger.debug('created schemeitem: ' + str(schemeitem))
                                item_exists = True
                                pk_int = schemeitem.pk
                                update_dict['rosterdate'] = fielddict_date(schemeitem.rosterdate, user_lang)
                                update_dict['rosterdate']['updated'] = True
        # Subtract 1 from company.balance
                                # TODO change: ---  after saving new record: subtract 1 from company.balance
                                # request.user.company.balance -= 1
                                request.user.company.save(request=self.request)

                    elif tablename == 'teammembers':
                        if employee_exists:
# check if this employee already existst in this team
                            msg_err = Teammember.validate_employee_exists_in_teammembers(employee, team, 0)
                            if not msg_err:
                    # create new teammember with this team and this employee
                                teammember = Teammember(team=team, employee=employee)
                                teammember.save(request=self.request)
                                test_pk_int = teammember.pk
                    # check if record exists
                                teammember = Teammember.objects.filter(id=test_pk_int, team=team).first()
                                if teammember:
                                    item_exists = True
                                    pk_int = teammember.pk

                    if not item_exists:
                        if not msg_err:
                            msg_err = _('This item could not be created.')
                        update_dict['id']['error'] = msg_err
                    else:
                        update_dict['id']['created'] = True
                        update_dict['id']['pk'] = pk_int
                        update_dict['id']['parent_pk'] = parent_pk_int
                    # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
                        if temp_pk_str:
                            update_dict['id']['temp_pk'] = temp_pk_str

                        if tablename == 'teammembers':
                # also create team dict, for display in table
                            update_dict['team']['pk'] = teammember.team.pk
                            update_dict['team']['value'] = teammember.team.code
                            update_dict['team']['updated'] = True

                            # also create employee dict, for display in table
                            update_dict['employee']['pk'] = teammember.employee.pk
                            update_dict['employee']['value'] = teammember.employee.code
                            update_dict['employee']['updated'] = True

            logger.debug('new update_dict: ' + str(update_dict))

# update_schemeitem
            if item_exists:
                if tablename == 'schemeitems':
                    update_schemeitem(scheme, schemeitem, upload_dict, update_dict, self.request, comp_timezone, user_lang)
                    schemeitem.save(request=self.request)

                elif tablename == 'teammembers':
                    update_teammember(teammember, team, upload_dict, update_dict, self.request, user_lang)
                    teammember.save(request=self.request)

            logger.debug('>> update_dict: ' + str(update_dict))

# --- remove empty attributes from update_dict
            remove_empty_attr_from_dict(update_dict)
            if update_dict:
                item_update_dict['item_update'] = update_dict

            # update schemeitem_list when changes are made
            if tablename == 'schemeitems':
                schemeitem_list = Schemeitem.create_schemeitem_list(scheme.order, comp_timezone, user_lang)
                if schemeitem_list:
                    item_update_dict['schemeitem_list'] = schemeitem_list

         # update shift_list
                shift_list = Schemeitem.create_shift_list(scheme.order)
                if shift_list:
                    item_update_dict['shift_list'] = shift_list

        # update team_list
                team_list = Team.create_team_list(scheme.order)
                if team_list:
                    item_update_dict['team_list'] = team_list

            elif tablename == 'teammembers':
                teammember_list = Teammember.create_teammember_list(scheme.order, user_lang)
                if teammember_list:
                    item_update_dict['teammember_list'] = teammember_list

        logger.debug('>> item_update_dict: ' + str(item_update_dict))
        return HttpResponse(json.dumps(item_update_dict, cls=LazyEncoder))


def update_teammember(teammember, team, upload_dict, update_dict, request, user_lang):
    # --- update existing and new teammmber PR2-019-06-01
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_teammmber')
    logger.debug('upload_dict' + str(upload_dict))
    logger.debug('update_dict' + str(update_dict))
    # {'id': {'temp_pk': 'new_26', 'create': True, 'parent_pk': 1, 'table': 'teammembers'},
    # 'team': {'update': True, 'value': 'Team A', 'pk': 1},
    # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}

    save_changes = False

# --- save changes in field 'employee'
    # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}
    for field in ['employee']:
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('upload_dict[' + field + ']: ' + str(field_dict) + ' ' + str(type(field_dict)))
            if 'update' in field_dict:
                pk = field_dict.get('pk')
                employee = None
                if pk:
                    employee = Employee.objects.filter(id=pk, company=request.user.company).first()
                logger.debug('employee]: ' + str(employee) + ' ' + str(type(employee)))
                add_employee = False
                if field == 'employee':
                    if employee == None:
                        update_dict[field]['error'] = _('This field cannot be blank.')
                    else:
                        msg_err = Teammember.validate_employee_exists_in_teammembers(employee, team, teammember.pk)
                        if msg_err:
                            update_dict[field]['error'] = msg_err
                        else:
                            add_employee = True
                if add_employee:
                    setattr(teammember, field, employee)
                    update_dict[field]['updated'] = True
                    save_changes = True

# - save changes in rosterdate field
    for field in ['datefirst', 'datelast']:
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('field_dict ' + field + ': ' + str(field_dict) + str(type(field_dict)))
            # field_dict datefirst: {'value': '2019-05-31', 'update':
            field_value = field_dict.get('value') # field_value: '2019-04-12'
            new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
            # new_date: 2019-04-12 <class 'datetime.date'>
            # check if date is valid (empty date is not allowed)

            if msg_err is not None:
                update_dict[field]['err'] = msg_err
            else:
                saved_date = getattr(teammember, field, None)
                if new_date != saved_date:
                    # setattr() sets the value 'new_date' of the attribute 'field' of the object 'teammember'
                    setattr(teammember, field, new_date)
                    update_dict[field]['updated'] = True

                    save_changes = True

# --- save changes
    if save_changes:
        teammember.save(request=request)

        for field in update_dict:
            if field in ['datefirst', 'datelast']:
                date = getattr(teammember, field)
                if date:
                    update_dict[field]['value'] = str(date)
                    update_dict[field]['wdm'] = get_date_WDM_from_dte(date, user_lang)
                    update_dict[field]['wdmy'] = format_WDMY_from_dte(date, user_lang)
                    update_dict[field]['dmy'] = format_DMY_from_dte(date, user_lang)
                    update_dict[field]['offset'] = get_weekdaylist_for_DHM(date, user_lang)
            elif field in ['employee']:
                employee = getattr(teammember, field)
                if employee:
                    update_dict[field]['value'] = teammember.employee.code
                    update_dict[field]['team_pk'] = teammember.employee.id

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    logger.debug('update_dict: ' + str(update_dict))


#######################################################
def update_instance(instance, upload_dict, update_dict, request, user_lang):
    # --- update existing and new instance PR2019-06-06
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_scheme')
    logger.debug(upload_dict)

    save_changes = False
    date_fields = ['rosterdate', 'datefirst', 'datelast']
# - get_iddict_variables
    id_dict = upload_dict.get('id')
    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# --- save changes in field 'code', required field
    field = 'code'
    if field in upload_dict:
        field_dict = upload_dict.get(field)
        new_value = field_dict.get('value')
        saved_value = getattr(instance, field, None)
        if new_value and new_value != saved_value:
            setattr(instance, field, new_value)
            logger.debug('attr ' + field + 'saved to: ' + str(new_value))
            update_dict[field]['updated'] = True
            save_changes = True
            logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))

# update scheme_list when code has changed
            update_scheme_list = True

# --- save changes in field 'code', required field, default=0
    field = 'cycle'
    if field in upload_dict:
        #'cycle': {'update': True, 'value': '4'}}
        field_dict = upload_dict.get(field)
        # should I add this?: if 'update' in field_dict:
        new_value = field_dict.get('value')
        saved_value = getattr(instance, field, None)
        if new_value != saved_value:
            setattr(instance, field, new_value)
            logger.debug('attr ' + field + 'saved to: ' + str(new_value))
            update_dict[field]['updated'] = True
            save_changes = True
            logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))

# --- save changes in date fields
    for field in date_fields:
        # field_dict rosterdate: {'value': '2019-05-31', 'update':
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('field_dict ' + field + ': ' + str(field_dict) + str(type(field_dict)))
            field_value = field_dict.get('value')  # field_value: '2019-04-12'
            new_date, msg_err = get_date_from_str(field_value, False)  # False = blank_allowed
            if msg_err is not None:
                update_dict[field]['err'] = msg_err
            else:
                saved_date = getattr(instance, field, None)
                if new_date != saved_date:
                    setattr(instance, field, new_date)
                    update_dict[field]['updated'] = True
                    save_changes = True

    # logger.debug('update_dict: ' + str(update_dict))

            # logger.debug('timeduration: ' + str(schemeitem.timeduration) + str(type(schemeitem.timeduration)))
    # --- save changes
    if save_changes:
        instance.save(request=request)

        for field in update_dict:
            saved_value = getattr(instance, field)
            if field in date_fields:
                if saved_value:
                    update_dict[field]['value'] = str(saved_value)
                    update_dict[field]['wdm'] = get_date_WDM_from_dte(saved_value, user_lang)
                    update_dict[field]['wdmy'] = format_WDMY_from_dte(saved_value, user_lang)
                    update_dict[field]['dmy'] = format_DMY_from_dte(saved_value, user_lang)
                    update_dict[field]['offset'] = get_weekdaylist_for_DHM(saved_value, user_lang)
            elif field == 'code':
                if saved_value:
                    update_dict[field]['value'] = saved_value
            elif field == 'cycle':
                update_dict[field]['value'] = saved_value


# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    logger.debug('update_dict: ' + str(update_dict))


#######################################################
def update_schemeitem(scheme, schemeitem, upload_dict, update_dict, request, comp_timezone, user_lang):
    # --- update existing and new schemeitem and teammmber PR2-019-06-01
    # add new values to update_dict (don't reset update_dict, it has values)
    logger.debug(' ============= update_schemeitem / teammmber')
    logger.debug('upload_dict: ' + str(upload_dict))
    # {'id': {'temp_pk': 'new_26', 'create': True, 'parent_pk': 1, 'table': 'teammembers'},
    # 'team': {'update': True, 'value': 'Team A', 'pk': 1},
    # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}

    # - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    # - update_dict is created in SchemeItemUploadView, contains id_dict with pk etc.

    save_changes = False

# - get_iddict_variables
    id_dict = upload_dict.get('id')
    pk_int, parent_pk_int, temp_pk_str, is_create, is_delete, tablename = get_iddict_variables(id_dict)

# - save changes in field 'rosterdate'
    field = 'rosterdate'
    rosterdate_has_changed = False
    msg_err = None
    dict = {}
    if field in upload_dict:
        field_upload = upload_dict.get(field) # {'value': '2019-05-31', 'update':
        field_value = field_upload.get('value') # field_value: '2019-04-12'
        new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
        if msg_err is None:
            old_date = getattr(schemeitem, field, None)
            rosterdate_has_changed = (new_date != old_date)
            setattr(schemeitem, field, new_date)
    dict = fielddict_date(schemeitem.rosterdate, user_lang)
    if msg_err is not None:
        dict['error'] = msg_err
    if rosterdate_has_changed:
        dict['updated'] = True
    update_dict[field] = dict

# --- save changes in field 'shift'
    field = 'shift'
    is_updated = False
    dict = {}
    if field in upload_dict:
        field_upload = upload_dict.get(field)
        new_value = field_upload.get('value')
        old_value = getattr(schemeitem, field, None)
        is_updated = (new_value != old_value)
        setattr(schemeitem, field, new_value)

    saved_value = getattr(schemeitem, field)
    if saved_value:
        dict = fielddict_str(saved_value)
    if is_updated:
        dict['updated'] = True

# lookup first shift with this name in Schemeitem
        lookup_schemeitem = Schemeitem.objects.filter(scheme=scheme,shift__iexact=saved_value).first()
        if lookup_schemeitem:
            if schemeitem.timestartdhm != lookup_schemeitem.timestartdhm:
                schemeitem.timestartdhm = lookup_schemeitem.timestartdhm
                schemeitem.timestart = lookup_schemeitem.timestart
                update_dict['timestart']['updated'] = True
            if schemeitem.timeenddhm != lookup_schemeitem.timeenddhm:
                schemeitem.timeenddhm = lookup_schemeitem.timeenddhm
                schemeitem.timeend = lookup_schemeitem.timeend
                update_dict['timeend']['updated'] = True
            if schemeitem.breakduration != lookup_schemeitem.breakduration:
                schemeitem.breakduration = lookup_schemeitem.breakduration
                update_dict['breakduration']['updated'] = True
            schemeitem.timeduration = lookup_schemeitem.timeduration

    update_dict[field] = dict

# --- save changes in field 'team'
    # 'team': {'update': True, 'value': 'Team A', 'pk': 1},
    field = 'team'
    is_updated = False
    team = None
    dict = {}
    if field in upload_dict:
        field_upload = upload_dict.get(field)

        logger.debug('field_upload[' + field + ']: ' + str(field_upload))

        team_code = field_upload.get('value')
        team_pk = field_upload.get('pk')
        logger.debug('team_code[' + str(team_pk )+ ']: ' + str(team_code))

        # remove team from schemeitem when team_code is None
        if not team_code:
            # set field blank
            if schemeitem.team:
                schemeitem.team = None
                is_updated = True
        else:
            if team_pk:
                # check if team exists
                team = Team.objects.filter(scheme=scheme, pk=team_pk).first()
            # create team if it does not exist
            if team is None:
                team = Team(scheme=scheme, code=team_code)
                team.save(request=request)
            # update schemeitem
            if team:
                # setattr() sets the value ('team') of the specified attribute ('field') of the specified object (schemeitem)
                setattr(schemeitem, field, team)
                is_updated = True
    if is_updated:
        dict['updated'] = True
    if schemeitem.team:
        dict['value'] = schemeitem.team.code
        dict['team_pk'] = schemeitem.team.id
    update_dict[field] = dict

    logger.debug('update_dict[' + field + ']: ' + str(dict))
    # --- save changes in time fields
    # upload_dict: {'id': {'pk': 4, 'parent_pk': 18}, 'timestart': {'value': '0;11;15', 'update': True}}

    for field in ('timestart', 'timeend'):
        is_updated = False
        new_value_dhm = None
        dict = {}
        if field in upload_dict:
            field_upload = upload_dict.get(field)
            if 'value' in field_upload:
                # timestart': {'value': '0;3;45', 'o_value': '2019-04-27T02:36:00+02:00'}}
                new_value_dhm = field_upload.get('value')
                old_value_dhm = getattr(schemeitem, field + 'dhm', None)
                is_updated = (new_value_dhm != old_value_dhm)
                setattr(schemeitem, field + 'dhm', new_value_dhm)
        # calculate field 'timestart' 'timeend'., also when rosterdate_has_changed
        if rosterdate_has_changed or is_updated:
            new_datetime = get_datetimelocal_from_DHM(schemeitem.rosterdate, new_value_dhm, comp_timezone)
            setattr(schemeitem, field, new_datetime)
            is_updated = True
        saved_value_dhm = getattr(schemeitem, field + 'dhm')
        saved_datetime = getattr(schemeitem, field)
        dict = fielddict_datetime(schemeitem.rosterdate, saved_value_dhm, saved_datetime, comp_timezone, user_lang)
        if is_updated:
            dict['updated'] = True
        update_dict[field] = dict

# --- save changes in breakduration field
    for field in ('breakduration',):
        is_updated = False
        new_minutes = None
        # breakduration: {'value': '0;0;15', 'update': True}
        if field in upload_dict:
            field_upload = upload_dict.get(field)
            if 'value' in field_upload:
                new_minutes = get_minutes_from_DHM(field_upload.get('value'))
                # duration unit in database is minutes
                old_minutes = getattr(schemeitem, field, 0)
                if new_minutes != old_minutes:
                    setattr(schemeitem, field, new_minutes)
                    is_updated = True
    saved_minutes = getattr(schemeitem, field)
    dict = fielddict_duration (saved_minutes, user_lang)
    if is_updated:
        dict['updated'] = True
    update_dict[field] = dict

# --- recalculate timeduration
    # logger.debug('calculate working hours')
    field = 'timeduration'
    new_minutes = 0
    old_minutes = getattr(schemeitem, field, 0)
    if schemeitem.timestart and schemeitem.timeend:
        saved_break_minutes = int(getattr(schemeitem, 'breakduration', 0))
        datediff = schemeitem.timeend - schemeitem.timestart
        datediff_minutes = int((datediff.total_seconds() / 60))
        new_minutes = int(datediff_minutes - saved_break_minutes)

    if new_minutes != old_minutes:
        setattr(schemeitem, field, new_minutes)
        is_updated = True

    saved_minutes = getattr(schemeitem, field, 0)
    dict = fielddict_duration (saved_minutes, user_lang)
    if is_updated:
        dict['updated'] = True
    update_dict[field] = dict

# --- save changes
    schemeitem.save(request=request)

# --- remove empty attributes from update_dict
    remove_empty_attr_from_dict(update_dict)

    # logger.debug('update_dict: ' + str(update_dict))


def create_order_list(company, user_lang, include_inactive):
    # --- create list of all active orders of this company PR2019-06-09

    crit = Q(customer__company=company)
    if not include_inactive:
        crit.add(Q(inactive=False), crit.connector)
    orders = Order.objects.filter(crit).order_by(Lower('customer__code'), Lower('code'))

    order_list = []
    if orders:
        for order in orders:
            dict = {'pk': order.pk}
            dict['id'] = {'pk': order.pk, 'parent_pk': order.customer.pk}
            if order.code:
                dict['code'] = {'value': order.code}
            if order.name:
                dict['name'] = {'value': order.name}

            for field in ['code', 'name', 'inactive']:
                value = getattr(order, field)
                if value:
                    dict[field] = {'value': value}

            for field in ['datefirst', 'datelast']:
                value = getattr(order, field)
                if value:
                    dict[field] = {'value': value,
                                   'wdm': get_date_WDM_from_dte(value, user_lang),
                                   'wdmy': format_WDMY_from_dte(value, user_lang),
                                   'dmy': format_DMY_from_dte(value, user_lang),
                                   'offset': get_weekdaylist_for_DHM(value, user_lang)}

            order_list.append(dict)
    return order_list


def create_employee_list(company):
# --- create list of all active employees of this company PR2019-05-30
    employees = Employee.objects.filter(
        company=company,
        inactive=False
    ).order_by(Lower('code'))
    employee_list = []
    for employee in employees:
        dict = {'pk': employee.pk, 'id': {'pk': employee.pk, 'parent_pk': employee.company.pk},
                'code': {'value': employee.code}}
        employee_list.append(dict)
    return employee_list


def get_parent_instance(table, parent_pk_int, update_dict, company):
    # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-06-06
    parent_instance = None
    if parent_pk_int:
        if table == 'scheme':
            parent_instance = Order.objects.filter(id=parent_pk_int, customer__company=company).first()
        elif table == 'team':
            parent_instance = Scheme.objects.filter(id=parent_pk_int, order__customer__company=company).first()
        if parent_instance:
            update_dict['id']['parent_pk'] = parent_pk_int
            update_dict['id']['table'] = table
    return parent_instance


def get_instance(table, pk_int, parent_instance, update_dict):
    # function returns instance of table PR2019-06-06
    instance = None
    if pk_int and parent_instance:
        if table == 'scheme':
            instance = Scheme.objects.filter(id=pk_int, order=parent_instance).first()
        elif table == 'team':
            instance = Team.objects.filter(id=pk_int, scheme=parent_instance).first()
        if instance:
            update_dict['id']['pk'] = pk_int
    return instance


# ===== Delete item
def delete_instance(table, pk_int, parent_instance, update_dict, request):
    # function deletes instance of table,  PR2019-06-06

    instance = get_instance(table, pk_int, parent_instance, update_dict)

    if instance:
        pk_int = instance.id
        instance.delete(request=request)

    # check if instance still exists
        check_instance = None
        if table == 'scheme':
            check_instance = Scheme.objects.filter(id=pk_int).first()
        elif table == 'team':
            check_instance = Team.objects.filter(id=pk_int, ).first()
        if check_instance is None:
            update_dict['id']['deleted'] = True
        else:
            msg_err = _('This item could not be deleted.')
            update_dict['id']['error'] = msg_err

    return update_dict


# === Create new scheme or team
def create_instance(table, parent_instance, code, temp_pk_str, update_dict, request):
    instance = None
    pk_int = None
    parent_pk_int = None
# - parent and code are required
    if parent_instance and code:
# - create instance
        if table == 'scheme':
            instance = Scheme(order=parent_instance, code=code)
        elif table == 'team':
            instance = Team(scheme=parent_instance, code=code)
# - save instance
        instance.save(request=request)
# - create error when instnce not created
        if instance is None:
            msg_err = _('This item could not be created.')
            update_dict['id']['error'] = msg_err
        else:
# - put info in id_dict
            update_dict['id']['created'] = True
            update_dict['id']['pk'] = instance.pk
            if table == 'scheme':
                update_dict['id']['parent_pk'] = instance.order.pk
            elif table == 'team':
                update_dict['id']['parent_pk'] = instance.scheme.pk

# this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
        if temp_pk_str:
            update_dict['id']['temp_pk'] = temp_pk_str

    return instance



def create_date_dict(rosterdate, user_lang, status_text):
    dict = None
    if rosterdate:
        dict = {}
        dict['value'] = rosterdate
        dict['wdm'] = get_date_WDM_from_dte(rosterdate, user_lang)
        dict['wdmy'] = format_WDMY_from_dte(rosterdate, user_lang)
        dict['dmy'] = format_DMY_from_dte(rosterdate, user_lang)
        dict['offset'] = get_weekdaylist_for_DHM(rosterdate, user_lang)
    if status_text:
        if dict is None:
            dict = {}
        dict[status_text] = True

    return dict

def get_next_rosterdate(company, user_lang):
    # get first rosterdate off all scheeemitens of companay PR2019-06-07
    next_rosterdate_dict = None
    schemeitem = Schemeitem.objects.filter(scheme__order__customer__company=company).first()
    if schemeitem:
        next_rosterdate_dict = create_date_dict(schemeitem.rosterdate, user_lang, 'updated')
    return next_rosterdate_dict
"""
# dont forget to  update create_shift_list when time fields have changed
                        for field in ('timestart', 'timeend'):
                            if field in upload_dict:
                                field_dict = upload_dict.get(field)
                                if 'value' in field_dict:
                                    # timestart': {'value': '0;3;45', 'o_value': '2019-04-27T02:36:00+02:00'}}
                                    field_value = field_dict.get('value')
                                    if ';' in field_value:
                                        logger.debug('field_value[' + field + ']: ' + str(field_value))

                                        arr = field_value.split(';')
                                        day_offset = int(arr[0])
                                        new_hour = int(arr[1])
                                        new_minute = int(arr[2])

                                        msg_err = None
                                        # TODO check if date is valid (empty date is ok)
                                        if msg_err is not None:
                                            update_dict[field]['err'] = msg_err
                                            logger.debug('msg_err: ' + str(msg_err))
                                        else:
                                            # row_upload: {'pk': '26', 'timestart': '1;4;48'}
                                            saved_datetime = getattr(schemeitem, field, None)
                                            # saved_datetime: 2019-03-30 03:48:00+00:00
                                            logger.debug('saved_datetime: ' + str(saved_datetime))
                                            # get rosterdate when no saved_datetime
                                            dt_naive = None
                                            if saved_datetime is None:
                                                if schemeitem.rosterdate is not None:
                                                    dt_naive = datetime(schemeitem.rosterdate.year,
                                                                        schemeitem.rosterdate.month,
                                                                        schemeitem.rosterdate.day,
                                                                        new_hour,
                                                                        new_minute)
                                            else:
                                                saved_datetime_aware = get_datetimeaware_from_datetimeUTC(saved_datetime, comp_timezone)
                                                # saved_datetime_aware: 2019-03-30 04:48:00+01:00
                                                logger.debug('saved_datetime_aware: ' + str(saved_datetime_aware))

                                                offset_datetime = saved_datetime_aware + timedelta(days=day_offset)
                                                # offset_datetime: 2019-03-31 04:48:00+01:00
                                                logger.debug('offset_datetime: ' + str(offset_datetime))

                                                dt_naive = datetime(offset_datetime.year,
                                                                    offset_datetime.month,
                                                                    offset_datetime.day,
                                                                    new_hour,
                                                                    new_minute)
                                            # dt_naive: 2019-03-31 04:48:00
                                            logger.debug( 'dt_naive: ' + str(dt_naive))

                                            # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
                                            timezone = pytz.timezone(comp_timezone)
                                            # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
                                            logger.debug( 'timezone: ' + str(timezone) + str( type(timezone)))

                                            dt_localized = timezone.localize(dt_naive)
                                            # dt_localized: 2019-03-31 04:48:00+02:00
                                            logger.debug('dt_localized: ' + str(dt_localized))

                                            utc = pytz.UTC
                                            dt_as_utc = dt_localized.astimezone(utc)
                                            # dt_as_utc: 2019-03-31 02:48:00+00:00
                                            logger.debug( 'dt_as_utc: ' + str(dt_as_utc))

                                            setattr(schemeitem, field, dt_as_utc)
                                            update_dict[field]['updated'] = True
                                            save_changes = True
                                            calculate_hours = True
                                            schemeitem.save(request=self.request)
                                            # datetimesaved: 2019-03-31 02:48:00+00:00
                                            logger.debug('datetimesaved: ' + str(getattr(schemeitem, field, None)))
"""
