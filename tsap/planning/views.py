# PR2019-03-24
from django.contrib.auth.decorators import login_required
from django.db.models.functions import Lower
from django.db.models import Q, Count
from django.http import HttpResponse
from django.shortcuts import render, redirect #, get_object_or_404
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from datetime import date, datetime, timedelta

from companies.views import LazyEncoder
from tsap.constants import MONTHS_ABBREV, WEEKDAYS_ABBREV, TIMEFORMATS, STATUS_EMPLHOUR_01_CREATED

from tsap.functions import get_date_from_str, get_datetimeaware_from_datetimeUTC, \
                    get_timeDHM_from_dhm, get_datetimelocal_from_DHM, get_date_WDM_from_dte, get_date_WDMY_from_dte, \
                    get_weekdaylist_for_DHM, get_date_HM_from_minutes
from tsap.settings import TIME_ZONE, LANGUAGE_CODE
from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_employee_code, validate_employee_name,employee_email_exists, check_date_overlap

from companies.models import Customer, Order, Scheme, SchemeItem, Team, Teammember, Employee, Emplhour, Orderhour

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

            logger.debug('request.POST: ' + str(request.POST))
            # request.POST: <QueryDict: {'fill_rosterdate': ['{"rosterdate":"2019-05-26"}']}>
            if 'fill_rosterdate' in request.POST:
                # upload_dict: {'rosterdate': '2019-05-26'}
                upload_dict = json.loads(request.POST['fill_rosterdate'])
                if upload_dict is not None:
                    logger.debug('upload_dict: ' + str(upload_dict))
                    # rosterdate: "2019-05-26"
                    # --- Create empty row_dict with keys for all fields. Unused ones will be removed at the end
                    field_list = ('id', 'rosterdate', 'order', 'employee', 'shift',
                                  'time_start', 'time_end', 'break_duration', 'time_duration', 'time_status',
                                   'orderhour_duration', 'orderhour_status', 'modified_by', 'modified_at')
                    row_dict = {}  # this one is not working: row_dict = dict.fromkeys(field_list, {})
                    for field in field_list:
                        row_dict[field] = {}


# create recordset of schemeitem records with rosterdate = fill_rosterdate

                    rosterdate, msg_err = get_date_from_str(upload_dict['rosterdate'], True)  # True = blank_not_allowed

                    crit = (Q(scheme__order__customer__company=request.user.company)) & \
                           (Q(rosterdate=rosterdate)) & \
                           (Q(scheme__order__datefirst__lte=rosterdate) | Q(scheme__order__datefirst__isnull=True)) & \
                           (Q(scheme__order__datelast__gte=rosterdate) | Q(scheme__order__datelast__isnull=True))

                    schemeitems = SchemeItem.objects.filter(crit)

                    logger.debug(schemeitems.query)
                    # SELECT "id", "locked", "inactive", "modified_by_id", "modified_at", "scheme_id", "team_id",
                    # "rosterdate", "shift", "time_start", "time_start_dhm", "time_end", "time_end_dhm",
                    # "time_duration", "break_duration"
                    # FROM "companies_schemeitem"
                    # INNER JOIN "companies_scheme" ON ("companies_schemeitem"."scheme_id" = "companies_scheme"."id")
                    # INNER JOIN "companies_order" ON ("companies_scheme"."order_id" = "companies_order"."id")
                    # INNER JOIN "companies_customer" ON ("companies_order"."customer_id" = "companies_customer"."id")
                    # WHERE ("companies_customer"."company_id" = 2
                    # AND "companies_schemeitem"."rosterdate" = 2019-04-02
                    # AND ("companies_order"."datefirst" <= 2019-04-02 OR "companies_order"."datefirst" IS NULL)
                    # AND ("companies_order"."datelast" >= 2019-04-02 OR "companies_order"."datelast" IS NULL))
                    # ORDER BY "companies_schemeitem"."rosterdate" ASC, "companies_schemeitem"."time_start" ASC



                    orderhours = Orderhour.objects.all()
                    logger.debug(orderhours.query)
                    # SELECT "id", "locked", "modified_by_id", "modified_at", "order_id",
                    # "rosterdate", "duration", "status", "rate", "amount", "taxrate", "invoice_status"
                    # FROM "companies_orderhour"
                    # ORDER BY "companies_orderhour"."rosterdate" ASC

                    for schemeitem in schemeitems:

                        new_orderhour = Orderhour(
                            order=schemeitem.scheme.order,
                            rosterdate=rosterdate,
                            taxrate=schemeitem.scheme.order.taxrate,
                            duration=schemeitem.time_duration,
                            status=STATUS_EMPLHOUR_01_CREATED,
                            rate=schemeitem.scheme.order.rate,
                            amount=(schemeitem.time_duration / 60) * (schemeitem.scheme.order.rate))
                        new_orderhour.save(request=self.request)
                        # get employee
                        employee = None

                        # emplhours = Emplhour.objects.all()
                        # logger.debug(emplhours.query)
                        # SELECT "id", "locked", "modified_by_id", "modified_at", "employee_id", "orderhour_id", "wagecode_id",
                        # "rosterdate", "time_start", "time_end", "time_duration", "break_duration", "time_status"
                        # FROM "companies_emplhour"
                        # ORDER BY "companies_emplhour"."rosterdate" ASC, "companies_emplhour"."time_start" ASC

                        if new_orderhour:
                            new_emplhour = Emplhour(
                                orderhour=new_orderhour,
                                rosterdate=rosterdate,
                                time_start = schemeitem.time_start,
                                time_end = schemeitem.time_end,
                                time_duration=schemeitem.time_duration,
                                break_duration=schemeitem.break_duration,
                                time_status=STATUS_EMPLHOUR_01_CREATED)
                            if employee:
                                new_emplhour.employee = employee
                                if employee.wagecode:
                                    new_emplhour.wagecode = employee.wagecode
                            new_emplhour.save(request=self.request)

                        logger.debug('time_start: ' + str(new_emplhour.time_start))


        logger.debug('update_dict: ')
        logger.debug(str(update_dict))

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

@method_decorator([login_required], name='dispatch')
class EmplhourUploadView(UpdateView):  # PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourUploadView ============= ')

        # --- Create empty row_dict with keys for all fields. Unused ones will be removed at the end
        field_list = ('id', 'rosterdate', 'order', 'employee', 'shift',
                      'time_start', 'time_end', 'break_duration', 'time_duration', 'time_status',
                       'orderhour_duration', 'orderhour_status', 'modified_by', 'modified_at')
        row_dict = {}  # this one is not working: row_dict = dict.fromkeys(field_list, {})
        for field in field_list:
            row_dict[field] = {}

        if request.user is not None and request.user.company is not None:
            # --- Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

            if 'row_upload' in request.POST:
                # row_upload: {'pk': 'new_1', 'rosterdate': '2019-04-01'}
                # row_upload: {'pk': '16', 'order': 2}
                # row_upload: {'pk': '19', 'time_status': 3}
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
                            row_dict['id']['new'] = row_upload['pk']
                            # row_dict: {'id': {'new': 'new_1'}, 'code': {},...

# ++++ save new record ++++++++++++++++++++++++++++++++++++
                        if emplhour is None:
                            # --- add record i
                            emplhour = Emplhour(employee__company=request.user.company)
                            emplhour.save(request=self.request)

        # ---  after saving new record: subtract 1 from company.balance
                            request.user.company.balance -= 1
                            request.user.company.save(request=self.request)

# ++++ existing and new emplhour ++++++++++++++++++++++++++++++++++++
                        if emplhour is not None:
        # --- add pk to row_dict
                            pk_int = emplhour.pk
                            row_dict['id']['pk'] = pk_int

                            save_changes = False
# ++++  delete record when key 'delete' exists in
                            if 'delete' in row_upload:
                                emplhour.delete(request=self.request)
        # --- check if emplhour still exist
                                emplhour = Emplhour.objects.filter(id=pk_int, employee__company=request.user.company).first()
                                if emplhour is None:
                                    row_dict['id']['deleted'] = True
                                else:
                                    msg_err = _('This record could not be deleted.')
                                    row_dict['id']['del_err'] = msg_err

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
                                            row_dict[field]['upd'] = True
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
                                            row_dict[field]['err'] = msg_err
                                        else:
                                            saved_date = getattr(emplhour, field, None)
                                            logger.debug('saved_date: ' + str(saved_date) + str(type(saved_date)))
                                            if new_date != saved_date:
                                                logger.debug('save date: ' + str(new_date) + str(type(new_date)))
                                                setattr(emplhour, field, new_date)
                                                row_dict[field]['upd'] = True
                                                save_changes = True

# --- save changes in time fields
                                # row_upload: {'pk': '16', 'time_start': '0;17;12'}
                                for field in ('time_start', 'time_end'):
                                    if field in row_upload:
                                        if ';' in row_upload[field]:
                                            arr = row_upload[field].split(';')
                                            day_offset = int(arr[0])
                                            new_hour = int(arr[1])
                                            new_minute = int(arr[2])

                                            msg_err = None
                                            # TODO check if date is valid (empty date is ok)
                                            if msg_err is not None:
                                                row_dict[field]['err'] = msg_err
                                            else:
                                                # row_upload: {'pk': '26', 'time_start': '1;4;48'}
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
                                                    saved_datetime_aware = get_datetimeaware_from_datetimeUTC(saved_datetime, TIME_ZONE)
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
                                                timezone = pytz.timezone(TIME_ZONE)
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
                                                row_dict[field]['upd'] = True
                                                save_changes = True
                                                emplhour.save(request=self.request)
                                                # datetimesaved: 2019-03-31 02:48:00+00:00
                                                logger.debug('datetimesaved: ' + str(getattr(emplhour, field, None)))
# --- save changes in break_duration field
                                for field in ('time_duration','break_duration',):
                                    # row_upload: {'pk': '18', 'break_duration': '0.5'}
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
                                            row_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('row_dict[' + field + ']: ' + str(row_dict[field]))
                                #TODO: change end time whem time_duration has changed
# --- save changes in other fields
                                for field in ('time_status', 'orderhour_status'):
                                    if field in row_upload:
                                        logger.debug('row_upload[' + field + ']: ' + str(row_upload[field]))
                                        new_value = int(row_upload[field])
                                        logger.debug('new_value ' + str(new_value))
                                        saved_value = getattr(emplhour, field, None)
                                        logger.debug('saved_value ' + str(saved_value))
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            logger.debug('setattr ' + str(new_value))
                                            row_dict[field]['upd'] = True
                                            save_changes = True
                                            logger.debug('row_dict[field] ' + str(row_dict[field]))


# --- calculate working hours
                                if save_changes:
                                    logger.debug('calculate working hours')
                                    if emplhour.time_start and emplhour.time_end:
                                        # duration unit in database is minutes
                                        saved_break_minutes = int(getattr(emplhour, 'break_duration', 0))
                                        logger.debug('saved_break_duration: ' + str(saved_break_minutes) +  str(type(saved_break_minutes)))

                                        datediff = emplhour.time_end - emplhour.time_start
                                        logger.debug('datediff: ' + str(datediff) +  str(type(datediff)))
                                        datediff_minutes = (datediff.total_seconds() / 60)
                                        logger.debug('datediff_minutes: ' + str(datediff_minutes) +  str(type(datediff_minutes)))
                                        new_time_minutes = datediff_minutes - saved_break_minutes
                                        logger.debug('new_time_minutes: ' + str(new_time_minutes) +  str(type(new_time_minutes)))

                                        saved_time_minutes = getattr(emplhour, 'time_duration', 0)
                                        logger.debug('saved_time_minutes: ' + str(saved_time_minutes) + str(type(saved_time_minutes)))

                                        if new_time_minutes != saved_time_minutes:
                                            emplhour.time_duration = new_time_minutes
                                            row_dict['time_duration']['upd'] = True
                                            save_changes = True

                                            #logger.debug('time_duration: ' + str(emplhour.time_duration) + str(type(emplhour.time_duration)))
# --- save changes
                                if save_changes:
                                    emplhour.save(request=self.request)
                                    logger.debug('changes saved ')
                                    for field in row_dict:
                                        saved_value = None
                                        saved_html = None
                                        # 'upd' has always value True, or it does not exist
                                        if 'upd' in row_dict[field]:
                                            try:
                                                if field == 'order':
                                                    saved_value = emplhour.order.code
                                                elif field == 'employee':
                                                    saved_value = emplhour.employee.code
                                                elif field == 'shift':
                                                    saved_value = emplhour.shift.code
                                                elif field == 'time_start':
                                                    saved_value = emplhour.time_start_datetimelocal
                                                    saved_html = emplhour.time_start_DHM
                                                elif field == 'time_end':
                                                    saved_value = emplhour.time_end_datetimelocal
                                                    saved_html = emplhour.time_end_DHM
                                                elif field == 'time_duration':
                                                    saved_value = emplhour.time_hours
                                                elif field == 'break_duration':
                                                    saved_value = emplhour.break_hours
                                                else:
                                                    saved_value = getattr(emplhour, field, None)
                                            except:
                                                pass
                                        if saved_value:
                                            row_dict[field]['val'] = saved_value
                                            if saved_html:
                                                row_dict[field]['html'] = saved_html


        # --- remove empty attributes from row_dict
        # cannot iterate through row_dict because it changes during iteration
        for field in field_list:
            if not row_dict[field]:
                del row_dict[field]

        update_dict = {'row_update': row_dict}
        # update_dict = {'row_update': {'idx': {'pk': '1'}, 'code': {'status': 'upd'}, 'modified_by': {'val': 'Hans'},
        #              'modified_at': {'val': '29 mrt 2019 10.20u.'}}}

        logger.debug('update_dict: ')
        logger.debug(str(update_dict))
        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        logger.debug(str(update_dict_json))

        return HttpResponse(update_dict_json)


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
                # param_upload = {"rosterdatefirst": rosterdatefirst, 'rosterdatelast': rosterdatelast}

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

# --- create list of all active customers of this company
            customer_json = json.dumps(create_customer_list(request.user.company))

# --- create list of all active orders of this company
            # order_json = json.dumps(create_order_list(request.user.company))

# --- get user_lang
            user_lang = request.user.lang if request.user.lang else LANGUAGE_CODE
            if not user_lang in WEEKDAYS_ABBREV:
                user_lang = LANGUAGE_CODE

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
                          'wdmy': get_date_WDMY_from_dte(date.today(), user_lang),
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
class SchemeUploadView(View):  # PR2019-03-10
    # function updates employee, customer and shift list
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeUploadView ============= ')
        logger.debug('request.POST' + str(request.POST) )

        # scheme_upload: {'order_pk': '12', 'scheme_code': 'mm', 'cycle': 3, 'weekend': 0, 'publicholiday': 0}
        update_dict = {}
        row_dict = {}
        if request.user.company is not None:
            param_json = request.POST.get('scheme_upload', None)
            if param_json:
                param = json.loads(param_json)
                logger.debug('param: ' + str(param) )
                # param: {'order_pk': '6', 'scheme_code': 'MCB scheme', 'cycle': 3, 'weekend': 1, 'publicholiday': 1}
                order_pk = int(param.get('order_pk', 0))
                if order_pk:
                    scheme_code = param.get('scheme_code', '')
                    cycle = int(param.get('cycle', 1))

                    if order_pk and scheme_code:
                        order = Order.objects.filter(id=order_pk, customer__company=request.user.company).first()
                        logger.debug('order: ' + str(order) + str(type(order)))
                        if order:
                            # check if scheme already exist
                            if not Scheme.objects.filter(
                                        order__customer__company=request.user.company,
                                        order__id=order_pk,
                                        code=scheme_code
                            ).exists():
                                # create new scheme
                                new_scheme = Scheme(order=order,
                                                    code=scheme_code,
                                                    cycle=cycle
                                                    )
                                new_scheme.save(request=self.request)
                                logger.debug('new_scheme: ' + str(new_scheme) + str(type(new_scheme)))

                                # check if scheme is saved
                                if new_scheme.pk:
                                    row_dict = {"id": {"pk": new_scheme.pk, 'parent_pk': new_scheme.order.pk, 'created': True},
                                                'code': {'value': new_scheme.code},
                                                'cycle': {'value': new_scheme.cycle}}
                                    update_dict['scheme'] = row_dict

                                    # --- create list of all active schemes of this company
                                    schemes = Scheme.objects.filter(
                                        order__customer__company=request.user.company,
                                        inactive=False
                                    ).order_by(Lower('code'))
                                    scheme_list = []
                                    for scheme in schemes:
                                        value = scheme.code
                                        parent_id = scheme.order.id
                                        scheme_list.append({'pk': scheme.id, 'parent_pk': parent_id, 'val': value})
                                    if scheme_list:
                                        update_dict['schemes'] = scheme_list


        # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


@method_decorator([login_required], name='dispatch')
class DatalistDownloadView(View):  # PR2019-05-23

    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= DatalistDownloadView ============= ')

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                if request.POST['param_upload']:
                    user_lang = request.user.lang if request.user.lang else 'nl'
                    activate(user_lang)

                    datalist_dict = json.loads(request.POST['param_upload'])
                    # logger.debug('datalist_dict: ' + str(datalist_dict) + ' ' + str(type(datalist_dict)))
                    # datalist_dict: {"customers": {"all": true}, "orders": {"all": true}});

                    # datalist_dict: {'order_pk': 6, 'schemes': True, 'schemeitems': True, 'shifts': True,
                    #                   'teams': True, 'teammembers': True}

        # --- get order if order_pk exists in datalist_dict
                    order_pk = datalist_dict.get('order_pk')
                    order = None
                    if order_pk:
                         order = Order.objects.filter(customer__company=request.user.company, pk=order_pk).first()
                    # logger.debug('order: ' + str(order) + ' ' + str(type(order)))

                    for key in datalist_dict:
                        list = []

                        if key == 'customers':
                            list = create_customer_list(request.user.company)
                        if key == 'orders':
                            list = create_order_list(request.user.company)
                        if key == 'employees':
                            list = create_employee_list(request.user.company)

                        if order:
                            if key == 'schemes':
                                list = create_scheme_list(order, user_lang)
                            if key == 'schemeitems':
                                list = create_schemeitem_list(order, user_lang)
                            if key == 'teams':
                                list = create_team_list(order)
                            if key == 'teammembers':
                                list = create_teammember_list(order)
                            if key == 'shifts':
                                list = create_shift_list(order)

                        if list:
                            datalists[key] = list

        datalists_json = json.dumps(datalists, cls=LazyEncoder)

        return HttpResponse(datalists_json)

@method_decorator([login_required], name='dispatch')
class SchemeOrTeamUploadView(UpdateView):  # PR2019-05-25

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeOrTeamUploadView ============= ')
        update_dict_json = {}
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
    update_dict = create_update_dict(field_list)
# --- get id_dict  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
    id_dict, pk_int, parent_pk_int, temp_pk_str = get_id_dict(upload_dict)
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
            scheme_list = create_scheme_list(scheme.order, user_lang)
            logger.debug('scheme_list: ' + str(scheme_list))
            if scheme_list:
                scheme_update_dict['scheme_list'] = scheme_list

# --- remove empty attributes from update_dict
    # cannot iterate through update_dict because it changes during iteration
    for field in field_list:
        if not update_dict[field]:
            del update_dict[field]
    logger.debug('update_dict: ' + str(update_dict))

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
        update_dict = create_update_dict(field_list)
# --- get id_dict  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
        id_dict, pk_int, parent_pk_int, temp_pk_str = get_id_dict(upload_dict)
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
                team_list = create_team_list(scheme.order)
                if team_list:
                    team_update_dict['team_list'] = team_list
# --- remove empty attributes from update_dict
        # cannot iterate through update_dict because it changes during iteration
        for field in field_list:
            if not update_dict[field]:
                del update_dict[field]
        logger.debug('update_dict: ' + str(update_dict))
        if update_dict:
            team_update_dict['team_update'] = update_dict
        # update_dict: {'id': {'temp_pk': 'new_2', 'created': True, 'pk': 109, 'parent_pk': 20},
        #               'code': {'updated': True, 'value': 'ZZ'}}
        # update_dict: {'id': {'pk': 108, 'parent_pk': 20, 'del_err': 'Dit team kon niet worden gewist.'}}

        return team_update_dict


def create_update_dict(field_list):
# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    update_dict = {}  # this one is not working: update_dict = dict.fromkeys(field_list, {})
    for field in field_list:
        update_dict[field] = {}
    return update_dict

def get_id_dict(upload_dict):
# --- get id_dict  id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18} PR2019-05-31
    id_dict = upload_dict.get('id', None)
    pk_int = 0
    parent_pk_int = 0
    temp_pk_str = ''
    if id_dict:
        pk_str = str(id_dict.get('pk', ''))
        if 'new' in pk_str:
            temp_pk_str = pk_str
        else:
            pk_int = int(id_dict.get('pk', 0))
            temp_pk_str = id_dict.get('temp_pk', '')
        parent_pk_int = int(id_dict.get('parent_pk', 0))

    return id_dict, pk_int, parent_pk_int, temp_pk_str


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
class SchemeItemDownloadView(View):  # PR2019-03-10
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
                        shift_list = create_shift_list(scheme.order)
                        if shift_list:
                            datalists['shift_list'] = shift_list

                        # create team_list
                        team_list = create_team_list(scheme.order)
                        if team_list:
                            datalists['team_list'] = team_list

                        # create schemeitem_list
                        schemeitem_list = create_schemeitem_list(scheme.order, user_lang)
                        if schemeitem_list:
                            datalists['schemeitem_list'] = schemeitem_list
                            # shift_list.sort()
                            datalists['shift_list'] = shift_list

                        # today is used for new schemeitem without previous rosterday
                        today_dict = {'value': str(date.today()),
                                      'wdm': get_date_WDM_from_dte(date.today(), user_lang),
                                      'wdmy': get_date_WDMY_from_dte(date.today(), user_lang),
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
class SchemeItemUploadView(UpdateView):  # PR2019-04-26

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= SchemeItemUploadView ============= ')

        schemeitem_update_dict = {}

        if request.user is not None and request.user.company is not None:
# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

# - get upload_dict from request.POST
            upload_dict = {}
            upload_json = request.POST.get('schemeitem_upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}, 'shift': {'value': 'dag', 'update': True}}

# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
            update_dict = {}  # this one is not working: update_dict = dict.fromkeys(field_list, {})
            field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                          'time_start', 'time_end', 'time_duration', 'break_duration')

            for field in field_list:
                update_dict[field] = {}


# - get id_dict
            field = 'id'
            # id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
            id_dict = upload_dict.get(field, None)

            if id_dict:
                pk_int = 0
                pk_str = str(id_dict.get('pk', ''))
                if 'new' in pk_str:
                    temp_pk_str = pk_str
                else:
                    pk_int = int(id_dict.get('pk', 0))
                    temp_pk_str = id_dict.get('temp_pk', '')

                parent_pk_int = int(id_dict.get('parent_pk', 0))

                is_create = ('create' in id_dict)
                is_delete = ('delete' in id_dict)

                logger.debug('pk_int: ' + str(pk_int) + ' type: ' + str(type(pk_int)))

# - check if parent exists
                scheme = None
                if parent_pk_int:
                    scheme = Scheme.objects.filter(
                        id=parent_pk_int,
                        order__customer__company=request.user.company
                    ).first()
                logger.debug('scheme: ' + str(scheme))

    # check if schemeitem exists
                schemeitem = None
                if scheme:
                    schemeitem = SchemeItem.objects.filter(id=pk_int, scheme=scheme).first()
                    logger.debug('schemeitem: ' + str(schemeitem))

# ===== Create new  schemeitem
                if is_create:
                    # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
                    if temp_pk_str:
                        update_dict['id']['temp_pk'] = temp_pk_str

                    schemeitem = SchemeItem(scheme=scheme)
                    schemeitem.save(request=self.request)
                    logger.debug('new_schemeitem: ' + str(schemeitem))

                    update_dict['id']['created'] = True

                    # TODO change: ---  after saving new record: subtract 1 from company.balance
                    request.user.company.balance -= 1
                    request.user.company.save(request=self.request)

                if schemeitem:
                    update_dict['id']['pk'] = schemeitem.pk
                    update_dict['id']['parent_pk'] = schemeitem.scheme.pk

# ===== Delete schemeitem
                if is_delete:
                    # delete record when exists
                    schemeitem.delete(request=self.request)
# check if record still exist
                    schemeitem = SchemeItem.objects.filter(id=pk_int, scheme=scheme).first()
                    if schemeitem is None:
                        update_dict['id']['deleted'] = True
                    else:
                        msg_err = _('This shift could not be deleted.')
                        update_dict['id']['del_err'] = msg_err
                else:

# update_schemeitem
                    logger.debug('update_dict before: ')
                    logger.debug(str(update_dict))
                    update_schemeitem(scheme, schemeitem, upload_dict, update_dict, field_list, self.request, user_lang)
                    logger.debug('update_dict after: ')
                    logger.debug(str(update_dict))

                # update schemeitem_list when changes are made
                if 'team' in update_dict:
                    if 'updated' in update_dict['team']:
                        team_list = create_team_list(scheme.order)
                        if team_list:
                            schemeitem_update_dict['team_list'] = team_list

                if update_dict:
                    schemeitem_update_dict['schemeitem_update'] = update_dict

                    # update schemeitem_list when changes are made
                    schemeitem_list = create_schemeitem_list(scheme.order, user_lang)
                    if schemeitem_list:
                        schemeitem_update_dict['schemeitem_list'] = schemeitem_list

        update_dict_json = json.dumps(schemeitem_update_dict, cls=LazyEncoder)

        return HttpResponse(update_dict_json)


def update_schemeitem(scheme, schemeitem, upload_dict, update_dict, field_list, request, user_lang):
    # --- update existing and new schemeitem PR2-019-05-08
    logger.debug(' ============= update_schemeitem ============= ')
    logger.debug(upload_dict)

    # - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    # - update_dict is created in SchemeItemUploadView, contains id_dict with pk etc.

    save_changes = False
    calculate_hours = False
    recalc_time_fields = False

    # if upload_dict:
    #    # --- get id_dict
    #    id_dict = upload_dict.get('id', None)
    #    # id_dict: {'temp_pk': 'new_1', 'create': True, 'parent_pk': 18}
    #    if id_dict:
    #        pk_int = int(id_dict.get('pk', 0))
    #        parent_pk_int = int(id_dict.get('parent_pk', 0))
    #
    #        is_new_schemeitem = ('create' in id_dict)
    #        is_delete_schemeitem = ('delete' in id_dict)
    #
    #        temp_pk_str = id_dict.get('temp_pk', '')
    #        logger.debug('pk_int: ' + str(pk_int) + ' type: ' + str(type(pk_int)))

    # - save changes in rosterdate field
    field = 'rosterdate'
    if field in upload_dict:
        field_dict = upload_dict.get(field)
        logger.debug('field_dict ' + field + ': ' + str(field_dict) + str(type(field_dict)))
        # field_dict rosterdate: {'value': '2019-05-31', 'update':
        field_value = field_dict.get('value') # field_value: '2019-04-12'
        new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
        # new_date: 2019-04-12 <class 'datetime.date'>
        # check if date is valid (empty date is not allowed)

        if msg_err is not None:
            update_dict[field]['err'] = msg_err
        else:
            saved_date = getattr(schemeitem, field, None)
            if new_date != saved_date:
                setattr(schemeitem, field, new_date)
                update_dict[field]['updated'] = True

                # calculate new time_start_dte etc at the end
                recalc_time_fields = True

                save_changes = True
                calculate_hours = True

    # --- save changes in field 'shift
    field = 'shift'
    if field in upload_dict:
        field_dict = upload_dict.get(field)
        new_value = field_dict.get('value')
        saved_value = getattr(schemeitem, field, None)
        if new_value != saved_value:
            setattr(schemeitem, field, new_value)
            logger.debug('attr ' + field + 'saved to: ' + str(new_value))

            update_dict[field]['updated'] = True
            save_changes = True
            logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))

            # update create_shift_list when shift has changed
            shift_list = create_shift_list(scheme.order)
            if shift_list:
                update_dict['shift_list'] = shift_list

            # lookup first shift with this name in

            lookup_schemeitem = SchemeItem.objects.filter(
                scheme=scheme,
                shift__iexact=new_value
            ).first()
            if lookup_schemeitem:
                logger.debug('lookup_schemeitem' + str(lookup_schemeitem))
                logger.debug('lookup_schemeitem.time_start_dhm' + str(lookup_schemeitem.time_start_dhm))
                logger.debug('lookup_schemeitem.time_end_dhm' + str(lookup_schemeitem.time_end_dhm))
                logger.debug('lookup_schemeitem.break_duration' + str(lookup_schemeitem.break_duration))

                if schemeitem.time_start_dhm != lookup_schemeitem.time_start_dhm:
                    schemeitem.time_start_dhm = lookup_schemeitem.time_start_dhm
                    schemeitem.time_start = lookup_schemeitem.time_start
                    update_dict["time_start"]['updated'] = True

                if schemeitem.time_end_dhm != lookup_schemeitem.time_end_dhm:
                    schemeitem.time_end_dhm = lookup_schemeitem.time_end_dhm
                    schemeitem.time_end = lookup_schemeitem.time_end
                    update_dict["time_end"]['updated'] = True

                if schemeitem.break_duration != lookup_schemeitem.break_duration:
                    schemeitem.break_duration = lookup_schemeitem.break_duration
                    update_dict["break_duration"]['updated'] = True

                schemeitem.time_duration = lookup_schemeitem.time_duration

                logger.debug('update_dict' + str(update_dict))
    # update time_start etc

    # --- save changes in field 'team'
    field = 'team'
    if field in upload_dict:
        field_dict = upload_dict.get(field)
        logger.debug('upload_dict[' + field + ']: ' + str(field_dict) + ' ' + str(type(field_dict)))
        team_code = field_dict.get('value')
        team_pk = field_dict.get('pk')

        # remove team from schemeitem when team_code is None
        if not team_code:
            # set field blank
            if schemeitem.team:
                schemeitem.team = None
                update_dict[field]['updated'] = True
                save_changes = True
        else:
            team = None
            if team_pk:
                # check if team exists
                team = Team.objects.filter(scheme=scheme, pk=team_pk).first()

            # create team if it does not exist
            if team is None:
                team = Team(scheme=scheme, code=team_code)
                team.save(request=request)

                # update team_list when new team is created
                team_list = create_team_list(scheme.order)
                if team_list:
                    update_dict['team_list'] = team_list
            # update schemeitem
            if team:
                setattr(schemeitem, field, team)
                update_dict[field]['updated'] = True
                save_changes = True

    # --- save changes in time fields
    # upload_dict: {'id': {'pk': 4, 'parent_pk': 18}, 'time_start': {'value': '0;11;15', 'update': True}}

    for field in ('time_start', 'time_end'):
        if field in upload_dict:
            field_dict = upload_dict.get(field)
            logger.debug('upload_dict[' + field + ']: ' + str(field_dict) + ' ' + str(type(field_dict)))
            if 'value' in field_dict:
                # time_start': {'value': '0;3;45', 'o_value': '2019-04-27T02:36:00+02:00'}}
                new_value_dhm = field_dict.get('value')
                saved_value_dhm = getattr(schemeitem, field + '_dhm', None)
                logger.debug('new_value_dhm: <' + str(new_value_dhm) + '> type: ' + str(type(new_value_dhm)))
                logger.debug('saved_value_dhm: <' + str(saved_value_dhm) + '> type: ' + str(type(saved_value_dhm)))
                if new_value_dhm != saved_value_dhm:
                    # save in field 'time_start_dhm' etc'
                    setattr(schemeitem, field + '_dhm', new_value_dhm)
                    update_dict[field]['updated'] = True

                    save_changes = True
                    calculate_hours = True
                    recalc_time_fields = True
                    # calculate new time_start_dte etc
                    new_time_dte = None
                    if new_value_dhm:
                        # is rosterdate has changed: schemeitem already contains new value, rosterdate has changed above
                        rosterdate = getattr(schemeitem, 'rosterdate')
                        logger.debug('rosterdate: <' + str(rosterdate) + '> type: ' + str(type(rosterdate)))

                        if rosterdate:
                            new_time_dte = get_datetimelocal_from_DHM(rosterdate, new_value_dhm)
                            logger.debug('new_time_dte: <' + str(new_time_dte) + '> type: ' + str(type(new_time_dte)))
                    setattr(schemeitem, field, new_time_dte)


        # calculate new time_start_dte etc
    if recalc_time_fields:
        # if rosterdate has changed: schemeitem already contains new value, rosterdate has changed above
        rosterdate = getattr(schemeitem, 'rosterdate')
        for field in ['time_start', 'time_end']:
            new_time_dte = None
            dhm_str = getattr(schemeitem, field + '_dhm', '0,0,0')
            new_time_dte = get_datetimelocal_from_DHM(rosterdate, dhm_str)
            old_time_dte = getattr(schemeitem, field)
            if not new_time_dte == old_time_dte:
                setattr(schemeitem, field, new_time_dte)
                # show new time_start_dhm etc in tablerow (weekday is updated, rest stays the same)
                update_dict[field]['updated'] = True

    # --- save changes in break_duration field
    for field in ('break_duration',):
        # row_upload: {'pk': '18', 'break_duration': '0.5'}
        if field in upload_dict:
            logger.debug('row_upload[' + field + ']: ' + str(upload_dict[field]))
            value_str = upload_dict[field]
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
            saved_value = getattr(schemeitem, field, None)
            logger.debug('saved_value[' + field + ']: ' + str(saved_value))
            if new_value != saved_value:
                setattr(schemeitem, field, new_value)
                logger.debug('setattr ' + str(new_value))
                update_dict[field]['updated'] = True

                save_changes = True
                calculate_hours = True

    # --- calculate working hours
    if calculate_hours:
        logger.debug('calculate working hours')
        field = 'time_duration'
        new_time_minutes = 0
        saved_time_minutes = int(getattr(schemeitem, field, 0))

        if schemeitem.time_start and schemeitem.time_end:
            # duration unit in database is minutes
            saved_break_minutes = int(getattr(schemeitem, 'break_duration', 0))
            logger.debug('saved_time_start: ' + str(schemeitem.time_start) + str(type(schemeitem.time_start)))
            logger.debug('saved_time_end: ' + str(schemeitem.time_end) + str(type(schemeitem.time_end)))
            logger.debug('saved_break_minutes: ' + str(saved_break_minutes) + str(type(saved_break_minutes)))

            datediff = schemeitem.time_end - schemeitem.time_start
            logger.debug('datediff: ' + str(datediff) + str(type(datediff)))

            datediff_minutes = int((datediff.total_seconds() / 60))
            logger.debug('datediff_minutes: ' + str(datediff_minutes) + str(type(datediff_minutes)))

            new_time_minutes = int(datediff_minutes - saved_break_minutes)
            logger.debug('new_time_minutes: ' + str(new_time_minutes) + str(type(new_time_minutes)))

            saved_time_minutes = getattr(schemeitem, field, 0)
            logger.debug('saved_time_minutes: ' + str(saved_time_minutes) + str(type(saved_time_minutes)))

        if new_time_minutes != saved_time_minutes:
            setattr(schemeitem, field, new_time_minutes)
            logger.debug('setattr new_time_minutes: ' + str(new_time_minutes))

            update_dict[field]['updated'] = True
            save_changes = True

    logger.debug('update_dict: ' + str(update_dict))

            # logger.debug('time_duration: ' + str(schemeitem.time_duration) + str(type(schemeitem.time_duration)))
    # --- save changes
    if save_changes:
        schemeitem.save(request=request)

        for field in update_dict:
            if field == 'rosterdate':
                if schemeitem.rosterdate:
                    update_dict[field]['value'] = str(schemeitem.rosterdate)
                    update_dict[field]['wdm'] = get_date_WDM_from_dte(schemeitem.rosterdate, user_lang)
                    update_dict[field]['wdmy'] = get_date_WDMY_from_dte(schemeitem.rosterdate, user_lang)
                    update_dict[field]['offset'] = get_weekdaylist_for_DHM(schemeitem.rosterdate, user_lang)
            elif field == 'team':
                if schemeitem.team:
                    update_dict[field]['value'] = schemeitem.team.code
                    update_dict[field]['team_pk'] = schemeitem.team.id
            elif field == 'shift':
                if schemeitem.shift:
                    update_dict[field]['value'] = schemeitem.shift
            elif field == 'time_start':
                if schemeitem.time_start_dhm:
                    update_dict[field]['value'] = schemeitem.time_start_dhm
                    update_dict[field]['dhm'] = get_timeDHM_from_dhm(
                        schemeitem.rosterdate,
                        schemeitem.time_start_dhm,
                        user_lang)
            elif field == 'time_end':
                if schemeitem.time_end_dhm:
                    update_dict[field]['value'] = schemeitem.time_end_dhm
                    update_dict[field]['dhm'] = get_timeDHM_from_dhm(
                        schemeitem.rosterdate,
                        schemeitem.time_end_dhm,
                        user_lang)
            elif field == 'break_duration':
                if schemeitem.break_duration:
                    update_dict[field]['value'] = schemeitem.break_duration
                    update_dict[field]['hm'] = get_date_HM_from_minutes(
                        schemeitem.break_duration,
                        user_lang)
            elif field == 'time_duration':
                if schemeitem.time_duration:
                    update_dict[field]['value'] = schemeitem.time_duration
                    update_dict[field]['hm'] = get_date_HM_from_minutes(
                        schemeitem.time_duration,
                        user_lang)

    # --- remove empty attributes from update_dict
    # cannot iterate through update_dict because it changes during iteration
    for field in field_list:
        if not update_dict[field]:
            del update_dict[field]

    logger.debug('update_dict: ' + str(update_dict))


def create_customer_list(company):
# --- create list of all active customers of this company PR2019-05-23
    customers = Customer.objects.filter(
        company=company,
        inactive=False
    ).order_by(Lower('code'))
    customer_list = []
    for customer in customers:
        dict = {'pk': customer.pk, 'id': {'pk': customer.pk, 'parent_pk': customer.company.pk},
                'code': {'value': customer.code}}
        customer_list.append(dict)
    return customer_list


def create_order_list(company):
# --- create list of all active orders of this company PR2019-05-23
    order_list = []
    orders = Order.objects.filter(customer__company=company, inactive=False).order_by(Lower('customer__code'), Lower('code'))
    if orders:
        for order in orders:
            dict = {'pk': order.pk, 'id': {'pk': order.pk, 'parent_pk': order.customer.pk},
                    'code': {'value': order.code}}
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


def create_scheme_list(order, user_lang):
# --- create list of all active schemes of this order PR2019-05-23
    scheme_list = []
    if order:
        schemes = Scheme.objects.filter(order=order, inactive=False).order_by( Lower('code'))
        if schemes:
            for scheme in schemes:
                dict = {'pk': scheme.pk,
                        'id': {'pk': scheme.pk,
                        'parent_pk': scheme.order.pk},
                        'code': {'value': scheme.code},
                        'cycle': {'value': getattr(scheme, 'cycle', 0)}}
                for field in ['datefirst', 'datelast']:
                    value = getattr(scheme, field)
                    if value:
                        dict[field] = {'value': value,
                                      'wdm': get_date_WDM_from_dte(value, user_lang),
                                      'wdmy': get_date_WDMY_from_dte(value, user_lang)}
                scheme_list.append(dict)
    return scheme_list


def create_team_list(order):
    # create list of teams of this order PR2019-04-28
    team_list = []
    if order:
        teams = Team.objects.filter(scheme__order=order)
        if teams:
            for team in teams:
                dict = {'pk': team.pk,
                        'id': {'pk': team.pk,
                               'parent_pk': team.scheme.pk},
                        'code': {'value': team.code}}
                team_list.append(dict)
    return team_list

def create_teammember_list(order):
    # create list of teams of this order PR2019-05-27
    logger.debug('create_teammember_list')
    teammember_list = []
    if order:
        teammembers = Teammember.objects.filter(team__scheme__order=order)

        for teammember in teammembers:
            dict = {'pk': teammember.pk,
                    'id': {'pk': teammember.pk,
                           'parent_pk': teammember.team.pk}}
            if teammember.team:
                dict['team'] = {'pk': teammember.team.pk, 'value': teammember.team.code}
            if teammember.employee:
                dict['employee'] = {'pk': teammember.employee.pk, 'value': teammember.employee.code}
            if teammember.replacement:
                dict['replacement'] = {'pk': teammember.replacement.pk, 'value': teammember.replacement.code}
            teammember_list.append(dict)
    return teammember_list


def create_shift_list(order):
    # create list of shifts of this scheme PR2019-05-01

    shift_list = []
    if order:
        # return all shifts that have value from the scheemitems of this scheme
        shifts = SchemeItem.objects.filter(scheme__order=order).\
            exclude(shift__exact='').\
            exclude(shift__isnull=True).\
            values('scheme_id', 'shift', 'time_start_dhm', 'time_end_dhm', 'break_duration')\
            .annotate(count=Count('shift'))\
            .order_by(Lower('shift'))

        for shift in shifts:
            # schemeitem: {'shift': 'Shift 2', 'time_start': None, 'time_end': None, 'break_duration': 0, 'total': 1}

            # add scheme.pk and total to dict 'id'
            dict = {'id': {'parent_pk': shift.get('scheme_id'), 'count': shift.get('count')}}

            for field in ['shift', 'time_start_dhm', 'time_end_dhm', 'break_duration']:
                value = shift.get(field)
                if value:
                    fieldname = field
                    if field == 'shift':
                        fieldname = 'code'
                    dict[fieldname] = {'value': value}

            if dict:
                shift_list.append(dict)
    return shift_list


def create_schemeitem_list(order, user_lang):
    # create list of schemeitems of this scheme PR2019-05-12
    logger.debug("create_schemeitem_list")

    schemeitem_list = []
    logger.debug("order: " + str(order))
    if order:
        schemeitems = SchemeItem.objects.filter(scheme__order=order)

        for schemeitem in schemeitems:
            schemeitem_dict = create_schemeitem_dict(schemeitem, user_lang)
            schemeitem_list.append(schemeitem_dict)

    return schemeitem_list


def create_schemeitem_dict(schemeitem, user_lang, temp_pk = None,
                           is_created = False, is_deleted = False, updated_list = None):
    # create list of schemeitems of this scheme PR2019-05-12
    schemeitem_dict = {}
    field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                  'time_start', 'time_end', 'time_duration', 'break_duration')

    for field in field_list:
        schemeitem_dict[field] = {}
        if updated_list:
            if field in updated_list:
                schemeitem_dict[field]['updated'] = True

    if schemeitem:
        for field in ['id']:
            schemeitem_dict[field] = {'pk': schemeitem.id, 'parent_pk': schemeitem.scheme.id}
            if temp_pk:
                schemeitem_dict[field]['temp_pk'] = temp_pk
            if is_created:
                schemeitem_dict[field]['created'] = True
            if is_deleted:
                schemeitem_dict[field]['deleted'] = True

        if not is_deleted:
            for field in ['rosterdate']:
                value = getattr(schemeitem, field)
                if value:
                    field_dict = {'value': value,
                                  'wdm': get_date_WDM_from_dte(value, user_lang),
                                  'wdmy': get_date_WDMY_from_dte(value, user_lang),
                                  'offset': get_weekdaylist_for_DHM(value, user_lang)}
                    schemeitem_dict[field] = field_dict

            for field in ['shift']:
                value = getattr(schemeitem, field)
                if value:
                    field_dict = {'value': value}
                    schemeitem_dict[field] = field_dict

            for field in ['team']:
                team_pk = None
                field_dict = {}
                if schemeitem.team:
                    value = schemeitem.team.code
                    team_pk = schemeitem.team.id
                    field_dict = {'value': value, 'team_pk':team_pk}
                    if field_dict:
                        schemeitem_dict[field] = field_dict

            for field in ['time_start', 'time_end']:
                value = getattr(schemeitem, field + '_dhm')
                rosterdate = getattr(schemeitem, 'rosterdate')
                if value:
                    field_dict = {'value': value, 'dhm': get_timeDHM_from_dhm(rosterdate, value, user_lang)}
                    schemeitem_dict[field] = field_dict

            for field in ['time_duration', 'break_duration']:
                value = getattr(schemeitem, field)
                if value:
                    field_dict = {'value': value, 'hm': get_date_HM_from_minutes( value, user_lang)}
                    schemeitem_dict[field] = field_dict


    # --- remove empty attributes from update_dict
    # cannot iterate through update_dict because it changes during iteration
    for field in field_list:
        if not schemeitem_dict[field]:
            del schemeitem_dict[field]

    return schemeitem_dict

"""
# dont forget to  update create_shift_list when time fields have changed
                        for field in ('time_start', 'time_end'):
                            if field in upload_dict:
                                field_dict = upload_dict.get(field)
                                if 'value' in field_dict:
                                    # time_start': {'value': '0;3;45', 'o_value': '2019-04-27T02:36:00+02:00'}}
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
                                            # row_upload: {'pk': '26', 'time_start': '1;4;48'}
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
                                                saved_datetime_aware = get_datetimeaware_from_datetimeUTC(saved_datetime, TIME_ZONE)
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
                                            timezone = pytz.timezone(TIME_ZONE)
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
