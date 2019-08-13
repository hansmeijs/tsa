from django.db.models import Q
from django.utils.translation import activate, ugettext_lazy as _

from companies.models import Employee, Teammember
from tsap import functions as f

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

    employees = Employee.objects.filter(crit).order_by('code')
    # logger.debug(employees.query)

    employee_list = []
    for employee in employees:
        item_dict = {}
        create_employee_dict(employee, item_dict)
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


def create_teammember_list(order, inactive=None, rangemin=None, rangemax=None):
    # --- create list of all teammembers of this order PR2019-06-16
    #logger.debug(' ======--- create_teammember_list   ')
    #logger.debug('order' + str(order.pk) + ' ' + str(order.code))

    crit = Q(team__scheme__order=order)
    if inactive is not None:
        crit.add(Q(inactive=inactive), crit.connector)
    if rangemax is not None:
        crit.add(Q(datefirst__lte=rangemax) | Q(datefirst__isnull=True), crit.connector)
    if rangemin is not None:
        crit.add(Q(datelast__gte=rangemin) | Q(datelast__isnull=True), crit.connector)

    teammembers = Teammember.objects.filter(crit).order_by('datefirst')

    teammember_list = []
    for teammember in teammembers:
        logger.debug(' teammember:  ' + str(teammember))
        item_dict = {}
        create_teammember_dict(teammember, item_dict)
        teammember_list.append(item_dict)
    return teammember_list

def create_teammember_dict(instance, item_dict):
    # --- create dict of this teammember PR2019-07-26
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug ('--- create_schemeitem_dict ---')
    # logger.debug ('item_dict' + str(item_dict))

    field_tuple = ('pk', 'id', 'team', 'employee', 'datefirst', 'datelast')

    if instance:

        for field in field_tuple:
            if field in item_dict:
                field_dict = item_dict[field]
            else:
                field_dict ={}

            if field == 'pk':
                field_dict = instance.pk
            elif field == 'id':
                field_dict['pk'] = instance.pk
                field_dict['ppk'] = instance.team.pk
                field_dict['table'] = 'teammember'

            elif field == 'team':
                field_dict['pk'] = instance.team.pk
                if instance.team.code:
                    field_dict['value'] = instance.team.code

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
