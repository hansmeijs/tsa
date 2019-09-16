from django.db.models import Q
from django.utils.translation import activate, ugettext_lazy as _

from companies.models import Employee, Teammember
from tsap import functions as f
from tsap import constants as c

import logging
logger = logging.getLogger(__name__)

def create_employee_list(company, inactive=None, rangemin=None, rangemax=None):
    # --- create list of all active employees of this company PR2019-06-16
    # logger.debug(' --- create_employee_list   ')
    crit = Q(company=company)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    if rangemax is not None:
        crit.add(Q(datefirst__lte=rangemax) | Q(datefirst__isnull=True), crit.connector)
    if rangemin is not None:
        crit.add(Q(datelast__gte=rangemin) | Q(datelast__isnull=True), crit.connector)

    employees = Employee.objects\
        .select_related('wagecode')\
        .filter(crit).order_by('code')\
        .values('id', 'code', 'namelast', 'namefirst', 'email', 'telephone', 'identifier', 'payrollcode',
                'datefirst', 'datelast', 'wagecode', 'workhours', 'workdays', 'leavedays', 'inactive',
                'company_id',
                'wagecode_id', 'wagecode__company__id', 'wagecode__code',
                ) \
        .iterator()

    # logger.debug(employees.query)
    field_list = c.FIELDS_EMPLOYEE  # ('id', 'code', 'namelast', 'namefirst', 'email', 'telephone', 'identifier', 'payrollcode',
                   # 'datefirst', 'datelast', 'wagecode', 'workhours', 'workdays', 'leavedays', 'inactive')

    employee_list = []
    table = 'employee'
    for row_dict in employees:
        item_dict = {}

        pk_int = row_dict.get('id', 0)
        ppk_int = row_dict.get('company_id', 0)
        item_dict['pk'] = pk_int
        item_dict['ppk'] = ppk_int

        workhours = 0
        workdays = 0
        for field in field_list:
            field_dict = {}
            if field in row_dict:
                if field == 'id':
                    field_dict = {'pk': pk_int}
                    field_dict['ppk'] = ppk_int
                    field_dict['table'] = table
                    item_dict[field] = field_dict

                # also add date when empty, to add min max date
                elif field in ['datefirst', 'datelast']:
                    mindate = row_dict.get('datefirst')
                    maxdate = row_dict.get('datelast')
                    if mindate or maxdate:
                        if field == 'datefirst':
                            f.set_fielddict_date(field_dict=field_dict, date_value=mindate, maxdate=maxdate)
                        elif field == 'datelast':
                            f.set_fielddict_date(field_dict=field_dict, date_value=maxdate, mindate=mindate)
                    item_dict[field] = field_dict

                elif field == 'workhours':
                    workhours = row_dict.get('workhours', c.WORKHOURS_DEFAULT)
                    item_dict['workhours'] = {'value': workhours}

                    workdays = row_dict.get('workdays', c.WORKDAYS_DEFAULT)
                    item_dict['workdays'] = {'value': workdays}

                    if workhours and workdays:
                        workhoursperday = workhours / workdays * 1440
                        if workhoursperday:
                            item_dict['workhoursperday'] = {'value': workhoursperday}

                elif field == 'leavedays':
                    leavedays = row_dict.get('leavedays', c.LEAVEDAYS_DEFAULT)
                    if leavedays:
                        item_dict[field] = {'value': leavedays}

                elif field == 'wagecode':
                    field_dict = {}
                    pk_int = row_dict.get('wagecode_id',0)
                    if pk_int:
                        field_dict['pk'] = pk_int
                        field_dict['ppk'] = row_dict.get('wagecode__company__id',0)
                        field_dict['code'] = row_dict.get('wagecode__code', '')
                        field_dict['rate'] = row_dict.get('wagecode__rate', 0)
                        item_dict[field] = field_dict

                else:  # 'code', 'namelast', 'namefirst', 'email', 'telephone', 'identifier', 'payrollcode', 'inactive'
                    value = row_dict.get(field)
                    if value:
                        item_dict[field] = {'value': value}

        if workhours and workdays:
            workhoursperday = workhours / workdays * 1440 # workhours_per_day is in minutes
            item_dict['workhoursperday'] = {'value': workhoursperday}

        employee_list.append(item_dict)
    return employee_list


def create_employee_dict(instance, item_dict):
    # --- create dict of this employee PR2019-07-26

    # FIELDS_EMPLOYEE = ('id', 'code', 'namelast', 'namefirst', 'email', 'telephone', 'identifier', 'payrollcode',
    #                    'datefirst', 'datelast', 'wagecode', 'workhours', 'workdays', 'leavedays', 'workhoursperday', 'inactive')
    field_tuple = c.FIELDS_EMPLOYEE
    table = 'employee'

    if instance:
        # get min max date from employee
        datefirst = getattr(instance, 'datefirst')
        datelast = getattr(instance, 'datelast')

        for field in field_tuple:
            field_dict = item_dict[field] if field in item_dict else {}

            if field == 'id':
                pk_int = instance.pk
                ppk_int = instance.company.pk

                item_dict['pk'] = pk_int
                item_dict['ppk'] = ppk_int

                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int
                field_dict['table'] =table

            elif field in ['code', 'namelast', 'namefirst','identifier',
                           'leavedays', 'inactive']:
                value = getattr(instance, field, None)
                if value:
                    field_dict['value'] = value

            elif field == 'workhours':
                workhours = getattr(instance, 'workhours', 0)
                workdays = getattr(instance, 'workdays', 0)
                if workhours:
                    item_dict['workhours']['value'] = workhours
                if workdays:
                    item_dict['workdays']['value'] = workdays
                if workhours and workdays:
                    item_dict['workhoursperday']['value'] = workhours / workdays * 1440

            # also add date when empty, to add min max date
            elif field in ['datefirst', 'datelast']:
                mindate = getattr(instance, 'datefirst')
                maxdate = getattr(instance, 'datelast')
                if mindate or maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(field_dict=field_dict, date_value=mindate, maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(field_dict=field_dict, date_value=maxdate, mindate=mindate)

            # also add date when empty, to add min max date
            elif field in ['datefirst', 'datelast']:
                if datefirst or datelast:
                    if field == 'datefirst':
                        f.set_fielddict_date(field_dict=field_dict, date_value=datefirst, maxdate=datelast)
                    elif field == 'datelast':
                        f.set_fielddict_date(field_dict=field_dict, date_value=datelast, mindate=datefirst)
                item_dict[field] = field_dict

            item_dict[field] = field_dict
# >>>   end create_employee_dict


def create_teammember_list(table_dict, company):
    # --- create list of all teammembers of this order PR2019-08-29
    # logger.debug(' ----- create_teammember_list  -----  ')
    # logger.debug('table_dict' + str(table_dict) )
    # teammember: {order_pk: null datefirst: null datelast: null}

    cat = table_dict.get('cat')
    datefirst = table_dict.get('datefirst')
    datelast = table_dict.get('datelast')
    order = table_dict.get('order')

    crit = Q(team__scheme__order__customer__company=company)
    # if cat:
        # crit.add(Q(team__scheme__order__cat=cat), crit.connector)
    # if order:
        # crit.add(Q(order=order), crit.connector)
    # if datelast:
        # crit.add(Q(datefirst__lte=datelast) | Q(datefirst__isnull=True), crit.connector)
    # if datefirst:
        # crit.add(Q(datelast__gte=datefirst) | Q(datelast__isnull=True), crit.connector)
    # iterator: from https://medium.com/@hansonkd/performance-problems-in-the-django-orm-1f62b3d04785
    teammembers = Teammember.objects\
        .select_related('employee')\
        .select_related('team')\
        .select_related('team__scheme')\
        .select_related('team__scheme__order')\
        .select_related('team__scheme__order__customer')\
        .filter(crit).order_by('datefirst')\
        .values('id', 'cat', 'datefirst', 'datelast', 'workhoursperday', 'wagerate', 'wagefactor',
                'employee_id', 'employee__company__id', 'employee__code', 'employee__workhours', 'employee__workdays',
                'employee__datefirst', 'employee__datelast',
                'team__scheme__datefirst', 'team__scheme__datelast',
                'team__scheme__order__datefirst', 'team__scheme__order__datelast',
                'team_id', 'team__code',
                'team__scheme__id',
                'team__scheme__order__id',
                'team__scheme__order__code',
                'team__scheme__order__cat',
                'team__scheme__order__customer__id',
                'team__scheme__order__customer__code',
                'team__scheme__order__customer__company__id',
                )\
        .iterator()
    # logger.debug(teammembers.query)

    # c.FIELDS_TEAMMEMBER = ('id', 'team', 'cat', 'employee', 'datefirst', 'datelast',
    #                       'workhoursperday', 'wagerate', 'wagefactor', 'scheme', 'order', 'customer')
    field_list = c.FIELDS_TEAMMEMBER

    teammember_list = []
    for row_dict in teammembers:

        pk_int = row_dict.get('id', 0)
        ppk_int = row_dict.get('team_id', 0)
        item_dict = {'pk': pk_int, 'ppk': ppk_int}

        teammember_datefirst = row_dict.get('datefirst')
        teammember_datelast = row_dict.get('datelast')

        scheme_datefirst = row_dict.get('team__scheme__datefirst')
        if scheme_datefirst is None:
            scheme_datefirst = row_dict.get('team__scheme__order__datefirst')
        employee_datefirst = row_dict.get('employee__datefirst')
        mindate_scheme_employee = f.date_latest_of_two(scheme_datefirst, employee_datefirst)
        mindate = f.date_latest_of_two(mindate_scheme_employee, teammember_datefirst)

        scheme_datelast = row_dict.get('team__scheme__datelast')
        if scheme_datelast is None:
            scheme_datelast = row_dict.get('team__scheme__order__datelast')
        employee_datelast = row_dict.get('employee__datelast')
        maxdate_scheme_employee = f.date_earliest_of_two(scheme_datelast, employee_datelast)

        maxdate = f.date_earliest_of_two(maxdate_scheme_employee, teammember_datelast)

        for field in field_list:
            field_dict = {}

            if field == 'id':
                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int
                field_dict['table'] = 'teammember'
                field_dict['cat'] = row_dict.get('cat', 0)

            # team is parent of teammember
            elif field == 'team':
                field_dict['pk'] = ppk_int
                field_dict['ppk'] = row_dict.get('team__scheme__id', 0)
                team_code = row_dict.get('team__code')
                if team_code:
                    field_dict['value'] = team_code

            # also add date when empty, to add min max date
            elif field == 'datefirst':
                if teammember_datefirst or mindate_scheme_employee or maxdate:
                    f.set_fielddict_date(
                        field_dict=field_dict,
                        date_value=teammember_datefirst,
                        mindate=mindate_scheme_employee,
                        maxdate=maxdate)
            elif field == 'datelast':
                if teammember_datelast or mindate or maxdate_scheme_employee:
                    f.set_fielddict_date(
                        field_dict=field_dict,
                        date_value=teammember_datelast,
                        mindate=mindate,
                        maxdate=maxdate_scheme_employee)

            elif field == 'workhoursperday':
                workhoursperday = row_dict.get(field, 0)
                if workhoursperday == 0:
                    workhours = row_dict.get('employee__workhours', c.WORKHOURS_DEFAULT)
                    workdays = row_dict.get('employee__workdays', c.WORKHOURS_DEFAULT)
                    if workhours and workdays:
                        workhoursperday = workhours / workdays * 1440
                field_dict['value'] = workhoursperday

            elif field in ['wagerate', 'wagefactor']:
                value = row_dict.get(field)
                if value:
                    field_dict['value'] = value

            elif field == 'employee':
                field_dict['pk'] = row_dict.get('employee_id', 0)
                field_dict['ppk'] = row_dict.get('employee__company__id', 0)
                field_dict['value'] = row_dict.get('employee__code', '')
                field_dict['workhours'] =  row_dict.get('employee__workhours', c.WORKHOURS_DEFAULT)

            elif field == 'scheme':
                field_dict['pk'] = row_dict.get('team__scheme__id', 0)
                field_dict['ppk'] = row_dict.get('team__scheme__order__id', 0)
                field_dict['code'] = row_dict.get('team__scheme__code', '')

            elif field == 'order':
                field_dict['pk'] = row_dict.get('team__scheme__order__id', 0)
                field_dict['ppk'] = row_dict.get('team__scheme__order__customer__id', 0)
                field_dict['code'] = row_dict.get('team__scheme__order__code', '')
                field_dict['cat'] = row_dict.get('team__scheme__order__cat', 0)

            elif field == 'customer':
                field_dict['pk'] = row_dict.get('team__scheme__order__customer__id', 0)
                field_dict['ppk'] = row_dict.get('team__scheme__order__customer__company__id', 0)
                field_dict['code'] = row_dict.get('team__scheme__order__customer__code', '')

            item_dict[field] = field_dict

        f.remove_empty_attr_from_dict(item_dict)

        if item_dict:
            teammember_list.append(item_dict)

    return teammember_list

def create_teammember_dict(instance, item_dict):
    # --- create dict of this teammember PR2019-07-26
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('item_dict' + str(item_dict))

    # c.FIELDS_TEAMMEMBER = ('id', 'team', 'cat', 'employee', 'datefirst', 'datelast',
    #                       'workhoursperday', 'wagerate', 'wagefactor', 'scheme', 'order', 'customer')
    field_tuple = c.FIELDS_TEAMMEMBER

    if instance:
# get pk and ppk
        pk_int = instance.pk
        ppk_int = instance.team.pk

        for field in field_tuple:
# 1. get or create field_dict
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict = {}

# 3. create pk, ppk, table keys
            if field == 'id':
                item_dict['pk'] = pk_int
                item_dict['ppk'] = ppk_int

                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int
                field_dict['table'] = 'teammember'

            elif field == 'cat':
                field_dict['value'] = instance.cat  # required, default = 0

            # team is parent of teammember
            elif field == 'team':
                if instance.team:
                    team = instance.team
                    field_dict['pk'] = team.pk
                    field_dict['ppk'] = team.scheme.pk
                    if team.code:
                        field_dict['value'] = team.code
                    if team.scheme.order:
                        order_dict = {'pk': team.scheme.order.pk}
                        if team.scheme.order.code:
                            order_dict['value'] = team.scheme.order.code
                        item_dict['order'] = order_dict

            elif field == 'employee':
                employee = instance.employee
                if employee:
                    field_dict['pk'] = employee.pk
                    field_dict['ppk'] = employee.company_id
                    if employee.code:
                        field_dict['value'] = employee.code

            # also add date when empty, to add min max date
            elif field in ['datefirst', 'datelast']:
                mindate = getattr(instance, 'datefirst')
                maxdate = getattr(instance, 'datelast')
                if mindate or maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(field_dict=field_dict, date_value=mindate, maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(field_dict=field_dict, date_value=maxdate, mindate=mindate)

            elif field == 'workhoursperday':
                field_dict['value'] = getattr(instance, field)

            elif field in ['wagerate', 'wagefactor']:
                value = getattr(instance, field)
                if value:
                    field_dict['value'] = value

            item_dict[field] = field_dict

        # 7. remove empty attributes from item_update
        f.remove_empty_attr_from_dict(item_dict)

# >>>>>>>>>>>>>>>>>>>

def validate_employee_exists_in_teammembers(employee, team, this_pk):  # PR2019-06-11
    # - check if employee exists - employee is required field of teammember, is skipped in schemeitems (no field employee)
    msg_err = None
    exists = False
    if employee and team:
        crit = Q(team=team) & Q(employee=employee)
        if this_pk:
            crit.add(~Q(pk=this_pk), crit.connector)
        exists = Teammember.objects.filter(crit).exists()
    if exists:
        msg_err = _('This employee already exists.')
    return msg_err
