

# PR2019-03-24
from django.contrib.auth.decorators import login_required
from django.db.models.functions import Lower
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import render, redirect #, get_object_or_404
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, DeleteView, View, ListView, CreateView, FormView
from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_MAPPED_COLDEFS

from companies.views import LazyEncoder
from tsap.functions import get_date_from_str
from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_employee_code, validate_employee_name,employee_email_exists, check_date_overlap

from companies.models import Order, Employee, Emplhour, Shift

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
            employees = Employee.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
            employee_list = []
            for employee in employees:
                employee_list.append({'pk': employee.id, 'code': employee.code})
            employee_json = json.dumps(employee_list)
            # logger.debug(employee_json)

            emplhours = Emplhour.objects.filter(company=request.user.company)
            param = get_headerbar_param(request, {'items': emplhours, 'employee_list': employee_json})
        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'emplhours.html', param)


@method_decorator([login_required], name='dispatch')
class EmplhourUploadView(UpdateView):  # PR2019-03-04

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= EmplhourUploadView ============= ')

        # --- Create empty row_dict with keys for all fields. Unused ones will be removed at the end
        field_list = ('id', 'rosterdate', 'order', 'employee', 'shift',
                      'time_start', 'time_end', 'time_duration', 'time_status',
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
                            logger.debug('emplhour.save')
                            emplhour = Emplhour(
                                company=request.user.company
                            )
                            emplhour.save(request=self.request)

        # ---  after saving new record: add 1 to company.entriesused
                            request.user.company.entriesused += 1
                            request.user.company.save(request=self.request)

# ++++ existing and new emplhour ++++++++++++++++++++++++++++++++++++
                        if emplhour is not None:
        # --- add pk to row_dict
                            pk_int = emplhour.pk
                            row_dict['id']['pk'] = pk_int
                            logger.debug('emplhour.pk: ' + str(emplhour.pk))

                            save_changes = False
# ++++  delete record when key 'delete' exists in
                            if 'delete' in row_upload:
                                logger.debug('before delete ' + str(emplhour.pk))
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
                                for field in ('order', 'employee'):
                                    logger.debug('field ' + str(field))
                                    logger.debug('row_upload ' + str(row_upload))
                                    if field in row_upload:
                                        pk_obj = row_upload[field]
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
                                field = 'rosterdate'
                                if field in row_upload:
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

# --- save changes in other fields
                                for field in ('time_status', 'orderhour_status'):
                                    if field in row_upload:
                                        new_value = row_upload[field]
                                        saved_value = getattr(emplhour, field, None)
                                        if new_value != saved_value:
                                            setattr(emplhour, field, new_value)
                                            row_dict[field]['upd'] = True
                                            save_changes = True

# --- save changes
                                if save_changes:
                                    emplhour.save(request=self.request)
                                    logger.debug('changes saved ')
                                    for field in row_dict:
                                        saved_value = None
                                        # 'upd' has always value True, or it does not exist
                                        if 'upd' in row_dict[field]:
                                            try:
                                                if field == 'order':
                                                    saved_value = emplhour.order.code
                                                elif field == 'employee':
                                                    saved_value = emplhour.employee.code
                                                elif field == 'shift':
                                                    saved_value = emplhour.shift.code
                                                else:
                                                    saved_value = getattr(emplhour, field, None)
                                            except:
                                                pass
                                        if saved_value:
                                            row_dict[field]['val'] = saved_value


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
        logger.debug('update_dict_json:')
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

                shifts = Shift.objects.filter(company=request.user.company, inactive=False).order_by(Lower('code'))
                shift_list = []
                for shift in shifts:
                    dict = {'pk': shift.id, 'code': shift.code}
                    shift_list.append(dict)

                datalists = {'orders': order_list, 'employees': employee_list, 'shifts': shift_list}


        datalists_json = json.dumps(datalists, cls=LazyEncoder)
        # logger.debug('datalists_json:')
        # logger.debug(str(datalists_json))

        return HttpResponse(datalists_json)