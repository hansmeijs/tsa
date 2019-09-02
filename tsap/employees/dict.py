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
    for row_dict in employees:
        item_dict = {}

        pk_int = row_dict.get('id', 0)
        ppk_int = row_dict.get('team_id', 0)
        item_dict['pk'] = pk_int
        item_dict['ppk'] = ppk_int
        item_dict['table'] = 'employee'

        workhours = 0
        workdays = 0
        for field in field_list:
            field_dict = {}
            if field in row_dict:
                if field == 'id':
                    field_dict = {'pk': pk_int}
                    field_dict['ppk'] = ppk_int
                    item_dict[field] = field_dict

                # also add date when empty, to add min max date
                elif field in ['datefirst', 'datelast']:
                    mindate = row_dict.get('datefirst')
                    maxdate = row_dict.get('datelast')
                    if mindate or maxdate:
                        if field == 'datefirst':
                            f.set_fielddict_date(dict=field_dict, dte=mindate, maxdate=maxdate)
                        elif field == 'datelast':
                            f.set_fielddict_date(dict=field_dict, dte=maxdate, mindate=mindate)
                    item_dict[field] = field_dict

                elif field == 'workhours':
                    workhours = row_dict.get('workhours', c.WORKHOURS_DEFAULT)
                    item_dict[field] = {'value': workhours}

                elif field == 'workdays':
                    workdays = row_dict.get('workdays', c.WORKDAYS_DEFAULT)
                    item_dict[field] = {'value': workdays}

                elif field == 'leavedays':
                    leavedays = row_dict.get('leavedays', c.LEAVEDAYS_DEFAULT)
                    item_dict[field] = {'value': leavedays}

                elif field in ('workhours', 'workdays', 'leavedays'):
                    value = row_dict.get(field, 0)
                    if value == 0:
                        if field == 'workhours':
                            value = c.WORKHOURS_DEFAULT
                        elif field == 'workdays':
                            value = c.WORKDAYS_DEFAULT
                        elif field == 'leavedays':
                            value = c.LEAVEDAYS_DEFAULT
                    item_dict[field] = {'value': value}

                elif field == 'wagecode':
                    field_dict = {}
                    pk_int = row_dict.get('wagecode_id',0)
                    if pk_int:
                        field_dict['pk'] = pk_int
                        field_dict['ppk'] = row_dict.get('wagecode__company__id',0)
                        field_dict['value'] = row_dict.get('wagecode__code', '')
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

    if instance:
        parent_pk = instance.company.pk


        for field in ('pk', 'id', 'code', 'namelast', 'namefirst', 'identifier', 'datefirst', 'datelast', 'inactive'):
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict ={}

            if field == 'pk':
                field_dict = instance.pk

            elif field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.company.pk
                field_dict['table'] = 'employee'

            elif field in ['code', 'namelast', 'namefirst','identifier', 'inactive']:
                value = getattr(instance, field, None)
                if value:
                    field_dict['value'] = value

            # also add date when empty, to add min max date
            elif field in ['datefirst', 'datelast']:
                mindate = getattr(instance, 'datefirst')
                maxdate = getattr(instance, 'datelast')
                if mindate or maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(dict=field_dict, dte=mindate, maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(dict=field_dict, dte=maxdate, mindate=mindate)

            item_dict[field] = field_dict
# >>>   create_employee_dict


def create_teammember_list(table_dict, company):
    # --- create list of all teammembers of this order PR2019-08-29
    logger.debug(' ----- create_teammember_list  -----  ')
    logger.debug('table_dict' + str(table_dict) )
    # teammember: {order_pk: null datefirst: null datelast: null}

    cat = table_dict.get('cat')
    datefirst = table_dict.get('datefirst')
    datelast = table_dict.get('datelast')
    order = table_dict.get('order')

    crit = Q(team__scheme__order__customer__company=company)
    if cat:
        crit.add(Q(cat=cat), crit.connector)
    if order:
        crit.add(Q(order=order), crit.connector)
    if datelast:
        crit.add(Q(datefirst__lte=datelast) | Q(datefirst__isnull=True), crit.connector)
    if datefirst:
        crit.add(Q(datelast__gte=datefirst) | Q(datelast__isnull=True), crit.connector)
    # iterator: from https://medium.com/@hansonkd/performance-problems-in-the-django-orm-1f62b3d04785
    teammembers = Teammember.objects\
        .select_related('employee')\
        .select_related('team')\
        .select_related('team__scheme')\
        .select_related('team__scheme__order')\
        .select_related('team__scheme__order__customer')\
        .filter(crit).order_by('datefirst')\
        .values('id', 'cat', 'datefirst', 'datelast', 'workhoursperday',
                'employee_id', 'employee__company__id', 'employee__code', 'employee__workhours', 'employee__workdays',
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


    field_list = c.FIELDS_TEAMMEMBER  # ('id', 'team', 'cat', 'employee', 'datefirst', 'datelast', 'workhours', 'scheme', 'order', 'customer')
    teammember_list = []
    for row_dict in teammembers:
       # create_teammember_dict(teammember, item_dict)
        #teammember_list.append(item_dict)

        workhours = 0
        workdays = 0

        pk_int = row_dict.get('id', 0)
        ppk_int = row_dict.get('team_id', 0)
        item_dict = {'pk': pk_int, 'ppk': ppk_int}

        for field in field_list:
            field_dict = {}

            if field == 'id':
                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int
                field_dict['table'] = 'teammember'

            # team is parent of teammember
            elif field == 'team':
                field_dict['pk'] = ppk_int
                field_dict['ppk'] = row_dict.get('team__scheme__id', 0)
                team_code =  row_dict.get('team__code')
                if team_code:
                    field_dict['value'] = team_code

            elif field == 'cat':
                field_dict['value'] = row_dict.get('cat', 0)

            # also add date when empty, to add min max date
            elif field in ['datefirst', 'datelast']:
                mindate = row_dict.get('datefirst')
                maxdate = row_dict.get ('datelast')
                if mindate or maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(dict=field_dict, dte=mindate, maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(dict=field_dict, dte=maxdate, mindate=mindate)

            elif field == 'workhoursperday':
                workhoursperday = row_dict.get(field, 0)
                if workhoursperday == 0:
                    workhours = row_dict.get('employee__workhours', c.WORKHOURS_DEFAULT)
                    workdays = row_dict.get('employee__workdays', c.WORKHOURS_DEFAULT)
                    if workhours and workdays:
                        workhoursperday = workhours / workdays * 1440
                field_dict['value'] = workhoursperday

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

        if item_dict:
            teammember_list.append(item_dict)

    return teammember_list

def create_teammember_dict(instance, item_dict):
    # --- create dict of this teammember PR2019-07-26
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('item_dict' + str(item_dict))

    field_tuple = c.FIELDS_TEAMMEMBER # ('id', 'team', 'cat', 'employee', 'datefirst', 'datelast', 'workhoursperday', 'scheme', 'order', 'customer')

    if instance:
        for field in field_tuple:
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict ={}

            if field == 'id':
                pk_int = instance.pk
                ppk_int = instance.team.pk

                item_dict['pk'] = pk_int
                item_dict['ppk'] = ppk_int
                field_dict['table'] = 'teammember'

                field_dict['pk'] = pk_int
                field_dict['ppk'] = ppk_int

            elif field == 'cat':
                field_dict['value'] = getattr(instance, field, 0)

            elif field == 'team':
                if instance.team:
                    team = instance.team
                    field_dict['pk'] = team.pk
                    if team.code:
                        field_dict['value'] = team.code
                    if team.scheme.order:
                        order_dict = {'pk': team.scheme.order.pk}
                        if team.scheme.order.code:
                            order_dict['value'] = team.scheme.order.code
                        item_dict['order'] = order_dict

            elif field == 'employee':
                employee = getattr(instance, field)
                if employee:
                    field_dict['pk'] = employee.pk
                    if employee.code:
                        field_dict['value'] = employee.code

            # also add date when empty, to add min max date
            elif field in ['datefirst', 'datelast']:
                mindate = getattr(instance, 'datefirst')
                maxdate = getattr(instance, 'datelast')
                if mindate or maxdate:
                    if field == 'datefirst':
                        f.set_fielddict_date(dict=field_dict, dte=mindate, maxdate=maxdate)
                    elif field == 'datelast':
                        f.set_fielddict_date(dict=field_dict, dte=maxdate, mindate=mindate)

            elif field == 'workhoursperday':
                field_dict['value'] = getattr(instance, field)

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
