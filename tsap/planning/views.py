

# PR2019-03-24
from django.contrib.auth.decorators import login_required
from django.db.models.functions import Lower
from django.db.models import Q, Count
from django.http import HttpResponse
from django.shortcuts import render, redirect #, get_object_or_404
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, DeleteView, View, ListView, CreateView, FormView
from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_MAPPED_COLDEFS

from datetime import datetime, timedelta

from companies.views import LazyEncoder
from tsap.constants import WEEKDAYS_ABBREV, TIMEFORMATS, WEEKEND_CHOICES, PUBLICHOLIDAY_CHOICES
from tsap.functions import get_date_from_str, get_datetimeaware_from_datetimeUTC, get_datetimelocal_from_datetime, get_datetimelocal_DHM
from tsap.settings import TIME_ZONE, LANGUAGE_CODE
from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_employee_code, validate_employee_name,employee_email_exists, check_date_overlap

from companies.models import Customer, Order, Scheme, SchemeItem, Team, Employee, Emplhour

import pytz
import json

import logging
logger = logging.getLogger(__name__)

# === EmplhourView ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class EmplhourView(View):

    def get(self, request):
        param = {}
        logger.debug(' ============= EmplhourView ============= ')
        if request.user.company is not None:
            emplhours = Emplhour.objects.filter(company=request.user.company)

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
                            emplhour = Emplhour.objects.filter(id=pk_int, company=request.user.company).first()
                        else:
                            # this attribute 'new': 'new_1' is necessary to lookup request row on page
                            row_dict['id']['new'] = row_upload['pk']
                            # row_dict: {'id': {'new': 'new_1'}, 'code': {},...

# ++++ save new record ++++++++++++++++++++++++++++++++++++
                        if emplhour is None:
                            # --- add record i
                            emplhour = Emplhour(company=request.user.company)
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
                                emplhour = Emplhour.objects.filter(id=pk_int, company=request.user.company).first()
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
                                            object = Shift.objects.filter(
                                                id=pk_obj,
                                                company=request.user.company
                                            ).first()
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

                                        new_date, msg_err = get_date_from_str(row_upload[field])
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


# === EmplhourView ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class SchemesView(View):

    def get(self, request):
        param = {}
        # logger.debug(' ============= SchemesView ============= ')
        if request.user.company is not None:
            emplhours = Emplhour.objects.filter(company=request.user.company)

# --- create list of all active customers of this company
            customers = Customer.objects.filter(
                company=request.user.company,
                inactive=False
            ).order_by(Lower('code'))
            customer_list = []
            for customer in customers:
                customer_list.append({'pk': customer.id, 'val': customer.code})
            customer_json = json.dumps(customer_list)

# --- create list of all active orders of this company
            orders = Order.objects.filter(
                customer__company=request.user.company,
                inactive=False
            ).order_by(Lower('customer__code'), Lower('code'))
            order_list = []
            for order in orders:
                value = order.code
                parent_id = order.customer.id
                order_list.append({'pk': order.id, 'parent_id': parent_id, 'val': value})
            order_json = json.dumps(order_list)

# --- create list of all active schemes of this company
            schemes = Scheme.objects.filter(
                order__customer__company=request.user.company,
                inactive=False
            ).order_by( Lower('code'))
            scheme_list = []
            for scheme in schemes:
                value = scheme.code
                parent_id = scheme.order.id
                scheme_list.append({'pk': scheme.id, 'parent_id': parent_id, 'val': value})
            scheme_json = json.dumps(scheme_list)

            # --- create list of all active employees of this company
            employees = Employee.objects.filter(
                company=request.user.company,
                inactive=False
            ).order_by(Lower('code'))
            employee_list = []
            for employee in employees:
                employee_list.append({'pk': employee.id, 'code': employee.code})
            employee_json = json.dumps(employee_list)

# --- get weekend_choices and publicholidays_choices translated
            lang = request.user.lang if request.user.lang else LANGUAGE_CODE
            if not lang in WEEKDAYS_ABBREV:
                lang = LANGUAGE_CODE
            weekend_choices = json.dumps(WEEKEND_CHOICES[lang])
            publicholiday_choices = json.dumps(PUBLICHOLIDAY_CHOICES[lang])

# --- get weekdays translated
            lang = request.user.lang if request.user.lang else LANGUAGE_CODE
            if not lang in WEEKDAYS_ABBREV:
                lang = LANGUAGE_CODE
            weekdays_json = json.dumps(WEEKDAYS_ABBREV[lang])

# ---  get interval
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
                'customer_list': customer_json,
                'order_list': order_json,
                'scheme_list': scheme_json,
                'employee_list': employee_json,
                'lang': lang,
                'weekend_choices': weekend_choices,
                'publicholiday_choices': publicholiday_choices,
                'weekdays': weekdays_json,
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
        # {'param': ['{"order_pk":"6","scheme_code":"MCB scheme","cycle":23,"weekend":1,"publicholiday":1}']}>

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
                    weekend = int(param.get('weekend', 0))
                    publicholiday = int(param.get('publicholiday', 0))

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
                                                    cycle=cycle,
                                                    weekend=weekend,
                                                    publicholiday=publicholiday,
                                                    )
                                new_scheme.save(request=self.request)
                                logger.debug('new_scheme: ' + str(new_scheme) + str(type(new_scheme)))

                                # check if scheme is saved
                                if new_scheme.pk:
                                    scheme_pk = new_scheme.pk
                                    row_dict = {"scheme_pk": new_scheme.id,
                                                "code": new_scheme.code,
                                                "cycle": new_scheme.cycle,
                                                "weekend": new_scheme.weekend,
                                                "publicholiday": new_scheme.publicholiday,
                                                }
        update_dict = {'scheme_update': row_dict}
        # update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


@method_decorator([login_required], name='dispatch')
class SchemeDownloadDatalistView(View):  # PR2019-03-10
    # function updates employee, customer and shift list
    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourDownloadDatalistView ============= ')
        logger.debug('request.POST' + str(request.POST) )

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                if request.POST['param_upload']:
                    param_upload = json.loads(request.POST['param_upload'])
                    logger.debug('new_setting' + str(param_upload) + str(type(param_upload)))
                    order_pk = None
                    if param_upload:
                        if 'order_pk' in param_upload:
                            order_pk = int(param_upload['order_pk'])
                    logger.debug('order_pk' + str(order_pk) + str(type(order_pk)))

                    schemes = Scheme.objects.filter(order__customer__company=request.user.company,
                                                    order__id=order_pk,
                                                    ).order_by(Lower('code'))

                    scheme_list = []
                    for scheme in schemes:
                        dict = {'pk': scheme.id,
                                'code': scheme.code,
                                'cycle': scheme.cycle,
                                'weekend': scheme.weekend,
                                'publicholiday': scheme.publicholiday,
                                'inactive': scheme.inactive}

                        scheme_list.append(dict)
                    datalists = {'schemes': scheme_list}

        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        logger.debug('datalists_json:')
        logger.debug(str(datalists_json))

        return HttpResponse(datalists_json)


@method_decorator([login_required], name='dispatch')
class SchemeItemDownloadView(View):  # PR2019-03-10
    # function downloads scheme, teams and schemeitems of selected scheme
    def post(self, request, *args, **kwargs):
        logger.debug(' ====++++++++==== SchemeItemDownloadView ============= ')
        # logger.debug('request.POST' + str(request.POST) )
        # {'scheme_download': ['{"scheme_pk":18}']}

        datalists = {}
        if request.user is not None:
            if request.user.company is not None:
                if request.POST['scheme_download']:
                    scheme_download = json.loads(request.POST['scheme_download'])
                    # logger.debug('scheme_download: ' + str(scheme_download) + str(type(scheme_download)))
                    # scheme_download: {'scheme_pk': 18}
                    scheme_pk = int(scheme_download.get('scheme_pk', '0'))
                    scheme = Scheme.objects.filter(order__customer__company=request.user.company,
                                                    pk=scheme_pk,
                                                    ).first()
                    if scheme:
                        dict = {'pk': scheme.id,
                                'code': scheme.code,
                                'cycle': scheme.cycle,
                                'weekend': scheme.weekend,
                                'publicholiday': scheme.publicholiday,
                                'inactive': scheme.inactive}
                        datalists = {'scheme': dict}
                        # logger.debug('datalists: ' + str(datalists))


                        # create shift_list
                        shift_list = create_shift_list(scheme)
                        if shift_list:
                            datalists['shift_list'] = shift_list

                        # create team_list
                        team_list = create_team_list(scheme)
                        if team_list:
                            datalists['team_list'] = team_list

                        schemeitems = SchemeItem.objects.filter(scheme=scheme)
                        schemeitem_list = []
                        for schemeitem in schemeitems:
                            dict = {'pk': schemeitem.id, 'scheme_pk': schemeitem.scheme.id}
                            if schemeitem.team:
                                dict['team_pk'] = schemeitem.team.id
                                dict['team'] = schemeitem.team.code
                            if schemeitem.shift:
                                dict['shift'] = schemeitem.shift
                            # rosterdate goes after shift, because shift dict must be created first
                            if schemeitem.rosterdate:
                                dict['rosterdate'] = schemeitem.rosterdate
                            if schemeitem.time_start:
                                dict['time_start'] = schemeitem.time_start_datetimelocal
                                dict['time_start_DHM'] = schemeitem.time_start_DHM
                            if schemeitem.time_end:
                                dict['time_end'] = schemeitem.time_end_datetimelocal
                                dict['time_end_DHM'] = schemeitem.time_end_DHM
                            if schemeitem.time_duration:
                                dict['time_duration'] = schemeitem.time_duration
                            if schemeitem.break_start:
                                dict['break_start'] = schemeitem.break_start_datetimelocal
                                dict['break_start_DHM'] = schemeitem.break_start_DHM
                            if schemeitem.break_duration:
                                dict['break_duration'] = schemeitem.break_duration
                            schemeitem_list.append(dict)

                        if schemeitem_list:
                            datalists['schemeitem_list'] = schemeitem_list
                            # shift_list.sort()
                            datalists['shift_list'] = shift_list

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
        # logger.debug('request.POST: ' + str(request.POST))

# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
        field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                      'time_start', 'time_end', 'time_duration', 'break_start', 'break_duration')

        update_dict = {}  # this one is not working: update_dict = dict.fromkeys(field_list, {})

        for field in field_list:
            update_dict[field] = {}

        if request.user is not None and request.user.company is not None:

# - Reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else 'nl'
            activate(user_lang)

            upload_json = request.POST.get('schemeitem_upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'id': {'pk': 18, 'parent_pk': 18},
                #               'rosterdate': {'value': '2019-01-01'},
                #               'shift': {'value': 'nacht2'},
                #               'team': {'value': 'Team A', 'pk': 1}}

    # --- get id_dict
                id_dict = upload_dict.get('id', None)
                pk_str = id_dict.get('pk')
                pk_int = int(id_dict.get('pk', 0))
                logger.debug('pk_int: ' + str(pk_int))

                parent_pk_int = int(id_dict.get('parent_pk', 0))
                logger.debug('parent_pk_int: ' + str(parent_pk_int))

    # check if parent exists
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
                if schemeitem is None:
                    # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
                    update_dict['id']['temp_pk'] = pk_str
                    # update_dict: {'id': {'temp_pk': 'new_1'}, 'code': {},...

                    schemeitem = SchemeItem(scheme=scheme)
                    schemeitem.save(request=self.request)
                    update_dict['id']['created'] = True

                    # TODO change: ---  after saving new record: subtract 1 from company.balance
                    request.user.company.balance -= 1
                    request.user.company.save(request=self.request)

                if schemeitem:
                    update_dict['id']['pk'] = schemeitem.pk
                    update_dict['id']['parent_pk'] = schemeitem.scheme.pk

# ===== Delete scehemeitem
                    if 'delete' in id_dict:
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
# ===== Update schemeitem

# ++++ update existing and new schemeitem ++++++++++++++++++++++++++++++++++++
                        save_changes = False
                        calculate_hours = False
# - save changes in rosterdate field
                        field = 'rosterdate'
                        if field in upload_dict:
                            field_dict = upload_dict.get(field)
                            logger.debug('upload_dict[' + field + ']: ' + str(field_dict) + str(type(field_dict)))
                            # field_dict: {'value': '2019-04-12'}
                            field_value = field_dict.get('value')
                            # field_value: '2019-04-12' <class 'str'>
                            logger.debug('field_value: ' + str(field_value) + str(type(field_value)))
                            new_date, msg_err = get_date_from_str(field_value, True)  # True = blank_not_allowed
                            logger.debug('field: ' + str(field) + ' new_date: ' + str(new_date) + str(type(new_date)))
                            # new_date: 2019-04-12 <class 'datetime.date'>
            # check if date is valid (empty date is not allowed)
                            if msg_err is not None:
                                update_dict[field]['err'] = msg_err
                            else:
                                saved_date = getattr(schemeitem, field, None)
                                logger.debug('saved_date: ' + str(saved_date) + str(type(saved_date)))
                                # saved_date: 2019-04-12 <class 'datetime.date'>
                                if new_date != saved_date:
                                    logger.debug('save date: ' + str(new_date) + str(type(new_date)))
                                    setattr(schemeitem, field, new_date)
                                    update_dict[field]['updated'] = True
                                    save_changes = True
                                    calculate_hours = True

# --- save changes in field 'shift
                        field = 'shift'
                        if field in upload_dict:
                            field_dict = upload_dict.get(field)
                            logger.debug('upload_dict[' + field + ']: ' + str(field_dict) + ' ' + str(type(field_dict)))
                            new_value = field_dict.get('value')
                            saved_value = getattr(schemeitem, field, None)
                            if new_value != saved_value:
                                setattr(schemeitem, field, new_value)
                                logger.debug('setattr ' + str(new_value))
                                update_dict[field]['updated'] = True
                                save_changes = True
                                logger.debug('update_dict[' + field + '] ' + str(update_dict[field]))

                    # update create_shift_list when shift has changed
                                shift_list = create_shift_list(scheme)
                                if shift_list:
                                    update_dict['shift_list'] = shift_list

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
                                    team.save(request=self.request)

                    # update team_list when new team is created
                                    team_list = create_team_list(scheme)
                                    if team_list:
                                        update_dict['team_list'] = team_list
                    # update schemeitem
                                if team:
                                    setattr(schemeitem, field, team)
                                    update_dict[field]['updated'] = True
                                    save_changes = True

# --- save changes in time fields
                        # row_upload: {'pk': '16', 'time_start': '0;17;12'}
# dont forget to  update create_shift_list when time fields have changed
                        for field in ('time_start', 'time_end', 'break_start'):
                            if field in upload_dict:
                                if ';' in upload_dict[field]:
                                    logger.debug('row_upload[' + field + ']: ' + str(upload_dict[field]))

                                    arr = upload_dict[field].split(';')
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
                                    logger.debug('update_dict[' + field + ']: ' + str(update_dict[field]))
                        #TODO: change end time whem time_duration has changed

# --- calculate working hours
                        if calculate_hours:
                            logger.debug('calculate working hours')
                            if schemeitem.time_start and schemeitem.time_end:
                                # duration unit in database is minutes
                                saved_break_minutes = int(getattr(schemeitem, 'break_duration', 0))
                                logger.debug('saved_break_minutes: ' + str(saved_break_minutes) +  str(type(saved_break_minutes)))

                                datediff = schemeitem.time_end - schemeitem.time_start
                                logger.debug('datediff: ' + str(datediff) +  str(type(datediff)))
                                datediff_minutes = (datediff.total_seconds() / 60)
                                logger.debug('datediff_minutes: ' + str(datediff_minutes) +  str(type(datediff_minutes)))
                                new_time_minutes = datediff_minutes - saved_break_minutes
                                logger.debug('new_time_minutes: ' + str(new_time_minutes) +  str(type(new_time_minutes)))

                                saved_time_minutes = getattr(schemeitem, 'time_duration', 0)
                                logger.debug('saved_time_minutes: ' + str(saved_time_minutes) + str(type(saved_time_minutes)))

                                if new_time_minutes != saved_time_minutes:
                                    schemeitem.time_duration = new_time_minutes
                                    update_dict['time_duration']['updated'] = True
                                    save_changes = True

                                            #logger.debug('time_duration: ' + str(schemeitem.time_duration) + str(type(schemeitem.time_duration)))
# --- save changes
                        if save_changes:
                            schemeitem.save(request=self.request)
                            logger.debug('changes saved ')
                            for field in update_dict:
                                saved_value = None
                                saved_html = None
                                saved_pk = None
                                saved_parent_pk = None
                                # 'updated' has always value True, or it does not exist
                                if 'updated' in update_dict[field]:
                                    try:
                                        if field == 'team':
                                            saved_value = schemeitem.team.code
                                            saved_pk = schemeitem.team.id
                                            saved_parent_pk = schemeitem.team.scheme.id
                                        elif field == 'shift':
                                            saved_value = schemeitem.shift
                                        elif field == 'time_start':
                                            saved_value = schemeitem.time_start_datetimelocal
                                            saved_html = schemeitem.time_start_DHM
                                        elif field == 'time_end':
                                            saved_value = schemeitem.time_end_datetimelocal
                                            saved_html = schemeitem.time_end_DHM
                                        elif field == 'break_start':
                                            saved_value = schemeitem.break_start_datetimelocal
                                            saved_html = schemeitem.break_start_DHM
                                        elif field == 'time_duration':
                                            saved_value = schemeitem.time_hours
                                        elif field == 'break_duration':
                                            saved_value = schemeitem.break_hours
                                        else:
                                            saved_value = getattr(schemeitem, field, None)
                                    except:
                                        pass
                                if saved_value:
                                    update_dict[field]['value'] = saved_value
                                    if saved_html:
                                        update_dict[field]['html'] = saved_html
                                    if saved_pk:
                                        update_dict[field]['pk'] = saved_pk
                                    if saved_parent_pk:
                                        update_dict[field]['parent_pk'] = saved_parent_pk

        # --- remove empty attributes from update_dict
        # cannot iterate through update_dict because it changes during iteration
        for field in field_list:
            if not update_dict[field]:
                del update_dict[field]

        schemeitem_update_dict = {'schemeitem_update': update_dict}
        # update_dict = {'row_update': {'idx': {'pk': '1'}, 'code': {'status': 'upd'}, 'modified_by': {'val': 'Hans'},
        #              'modified_at': {'val': '29 mrt 2019 10.20u.'}}}

# schemeitem_update:
        # id: {pk: 15}
        # shift: {upd: true}
        # time_duration: {upd: true, val: 1604.75}




        logger.debug('schemeitem_update_dict: ')
        logger.debug(str(schemeitem_update_dict))
        update_dict_json = json.dumps(schemeitem_update_dict, cls=LazyEncoder)
        logger.debug(str(update_dict_json))

        return HttpResponse(update_dict_json)


def create_shift_list(scheme):
    # create list of shifts of this scheme PR2019-05-01

    shift_list = []
    if scheme:
        schemeitems = SchemeItem.objects.filter(scheme=scheme).\
            exclude(shift__exact='').\
            exclude(shift__isnull=True).\
            values('shift', 'time_start', 'time_end', 'break_start', 'break_duration')\
            .annotate(total=Count('shift'))\
            .order_by(Lower('shift'))

        for item in schemeitems:
            item_dict = {}
            # item: {'shift': 'Shift 2', 'time_start': None, 'time_end': None, 'break_start': None, 'break_duration': 0, 'total': 1} type: <class 'dict'>
            for field in ['shift', 'time_start', 'time_end', 'break_start', 'break_duration']:
                value = None
                value_DHM = None
                if field in ['time_start', 'time_end', 'break_start']:
                    value = get_datetimelocal_from_datetime(item.get(field))
                    value_DHM = get_datetimelocal_DHM(item.get(field), 'nl')
                else:
                    value = item.get(field)
                if value:
                    if field == 'shift':
                        item_dict['code'] = value
                    else:
                        item_dict[field] = value
                if value_DHM:
                    item_dict[field + '_DHM'] = value_DHM

            if item_dict:
                shift_list.append(item_dict)

    return shift_list

def create_team_list(scheme):

    # create list of teams of this scheme PR2019-04-28
    team_list = []
    if scheme:
        teams = Team.objects.filter(scheme=scheme)
        if teams:
            for team in teams:
                dict = {'pk': team.id,
                        'parent_pk': team.scheme.pk,
                        'code': team.code}
                team_list.append(dict)
    return team_list
