
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.db.models.functions import Upper, Lower

from django.utils.translation import ugettext_lazy as _

from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_COLDEFS

from companies.models import Company, Customer, Order, Employee, Scheme, Shift, Team, Emplhour

import logging
logger = logging.getLogger(__name__)


def check_date_overlap(datefirst, datelast, datefirst_is_updated):
    # PR2019-03-29 check if first date is after last date
    msg_dont_add = None
    if datefirst and datelast:
        if datefirst > datelast:
            if datefirst_is_updated:
                msg_dont_add = _("First date cannot be after last date.")
            else:
                msg_dont_add = _("Last date cannot be before first date.")
    return msg_dont_add


def validate_customer(field, value, company, this_pk = None):
    # validate if customer code_already_exists already exists in this company PR2019-03-04
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    # logger.debug('cust_code_exists: ' + str(value) + ' ' + str(company) + ' ' + str(this_pk))

    msg_dont_add = None
    if not value:
        msg_dont_add = _("This field cannot be blank.")
    else:
        if field == 'name':
            if this_pk:
                customer = Customer.objects.filter(name__iexact=value, company=company).exclude(pk=this_pk).first()
            else:
                customer = Customer.objects.filter(name__iexact=value, company=company).first()
            if customer:
                msg_dont_add = _("This name already exists.")
        elif field == 'code':
            if this_pk:
                customer = Customer.objects.filter(code__iexact=value, company=company).exclude(pk=this_pk).first()
            else:
                customer = Customer.objects.filter(code__iexact=value, company=company).first()
            if customer:
                msg_dont_add = _("This code already exists.")
    return msg_dont_add


class validate_unique_company_code(object):  # PR2019-03-15
    def __init__(self, instance=None):
        if instance:
            self.instance_id = instance.id
        else:
            self.instance_id = None

    def __call__(self, value):
        logger.debug ('validate_unique_company_code', value)
        # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
        if value is None:
            _value_exists = False
        elif self.instance_id is None:
            _value_exists = Company.objects.filter(code__iexact=value).exists()
        else:
            _value_exists = Company.objects.filter(code__iexact=value).exclude(
                pk=self.instance_id).exists()
        if _value_exists:
            raise ValidationError(_('Company code already exists.'))
        return value


class validate_unique_company_name(object):  # PR2019-03-15
    def __init__(self, instance=None):
        if instance:
            self.instance_id = instance.id
        else:
            self.instance_id = None

    def __call__(self, value):

        # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
        if value is None:
            _value_exists = False
        elif self.instance_id is None:
            _value_exists = Company.objects.filter(name__iexact=value).exists()
        else:
            _value_exists = Company.objects.filter(name__iexact=value).exclude(
                pk=self.instance_id).exists()
        if _value_exists:
            raise ValidationError(_('Company name already exists.'))
        return value


class validate_unique_code(object):  # PR2019-03-16, PR2019-04-25
    def __init__(self, model=None, company=None, field=None, instance=None):
        self.model=model
        self.company=company
        self.field=field
        if instance:
            self.instance_id = instance.id
        else:
            self.instance_id = None

    def __call__(self, value):
        logger.debug ('validate_unique_code', value)
        # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
        if self.model is None:
            raise ValidationError(_('Error: Model is None.'))
        if self.company is None:
            raise ValidationError(_('Error: Company not found.'))
        else:
            cls = None
            if self.model == 'company':
                cls = Company
            elif self.model == 'customer':
                cls = Customer
            elif self.model == 'employee':
                cls = Employee

            if cls is not None:
                if value is None:
                    self.value_exists = False
                elif self.instance_id is None:
                    if self.field == 'code':
                        if self.model == 'company':
                            self.value_exists = cls.objects.filter(code__iexact=value).exists()
                        else:
                            self.value_exists = cls.objects.filter(company=self.company, code__iexact=value).exists()
                    elif self.field == 'name':
                        if self.model == 'company':
                            self.value_exists = cls.objects.filter(name__iexact=value).exists()
                        else:
                            self.value_exists = cls.objects.filter(company=self.company, name__iexact=value).exists()
                    else:
                        raise ValidationError(_('Error: Field error.'))
                else:
                    if self.field == 'code':
                        if self.model == 'company':
                            self.value_exists = cls.objects.filter(code__iexact=value).exclude(
                                pk=self.instance_id).exists()
                        else:
                            self.value_exists = cls.objects.filter(company=self.company, code__iexact=value).exclude(
                                pk=self.instance_id).exists()
                    elif self.field == 'name':
                        if self.model == 'company':
                            self.value_exists = cls.objects.filter(name__iexact=value).exclude(
                                pk=self.instance_id).exists()
                        else:
                            self.value_exists = cls.objects.filter(company=self.company, name__iexact=value).exclude(
                                pk=self.instance_id).exists()
                if self.value_exists:
                    if self.field == 'code':
                        raise ValidationError(_('Code already exists.'))
                    if self.field == 'name':
                        raise ValidationError(_('Name already exists.'))
        return value

class validate_unique_employee_name(object):  # PR2019-03-15
    def __init__(self, instance=None):
        if instance:
            self.instance_id = instance.id
        else:
            self.instance_id = None

    def __call__(self, value):

        # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
        if value is None:
            _value_exists = False
        elif self.instance_id is None:
            _value_exists = Company.objects.filter(name__iexact=value).exists()
        else:
            _value_exists = Company.objects.filter(name__iexact=value).exclude(
                pk=self.instance_id).exists()
        if _value_exists:
            raise ValidationError(_('Employee name already exists.'))
        return value

def validate_code_name_identifier(table, field, new_value, parent, update_dict, this_pk=None):
    # validate if code already_exists in this table PR2019-07-30
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    # logger.debug('validate_code_name_identifier: ' + str(table) + ' ' + str(field) + ' ' + str(new_value) + ' ' + str(parent) + ' ' + str(this_pk))
    msg_err = None
    if not parent:
        msg_err = _("No parent record.")
    else:
        max_len = NAME_MAX_LENGTH if field == 'name' else CODE_MAX_LENGTH

        length = 0
        if new_value:
            length = len(new_value)
        # logger.debug('length: ' + str(length))

        blank_not_allowed = False
        fld = ''
        if field == 'code':
            fld = _('Code')
            blank_not_allowed = True
        elif field == 'name':
            fld = _('Name')
            blank_not_allowed = True
        elif field == 'identifier':
            fld = _('Id')

        if blank_not_allowed and length == 0:
            msg_err = _('%(fld)s cannot be blank.') % {'fld': fld}
        elif length > max_len:
            # msg_err = _('%(fld)s is too long. %(max)s characters or fewer.') % {'fld': fld, 'max': max_len}
            msg_err = _("%(fld)s '%(val)s' is too long, %(max)s characters or fewer.") % {'fld': fld, 'val': new_value, 'max': max_len}
            # msg_err = _('%(fld)s cannot be blank.') % {'fld': fld}
        if not msg_err:
    # check if code already exists
            crit = None
            if field == 'code':
                crit = Q(code__iexact=new_value)
            elif field == 'name':
                crit = Q(name__iexact=new_value)
            elif field == 'identifier':
                crit = Q(identifier__iexact=new_value)
            if this_pk:
                crit.add(~Q(pk=this_pk), crit.connector)

            #logger.debug('validate_code_name_identifier')
            #logger.debug('table: ' + str(table) + 'field: ' + str(field) + ' new_value: ' + str(new_value))

            exists = False
            if table == 'employee':
                crit.add(Q(company=parent), crit.connector)
                exists = Employee.objects.filter(crit).exists()
            elif table == 'customer':
                crit.add(Q(company=parent), crit.connector)
                exists = Customer.objects.filter(crit).exists()
            elif table == 'order':
                crit.add(Q(customer=parent), crit.connector)
                exists = Order.objects.filter(crit).exists()
            elif table == 'scheme':
                crit.add(Q(order=parent), crit.connector)
                exists = Scheme.objects.filter(crit).exists()
            elif table == 'shift':
                crit.add(Q(scheme=parent), crit.connector)
                exists = Shift.objects.filter(crit).exists()
            elif table == 'team':
                crit.add(Q(scheme=parent), crit.connector)
                exists = Team.objects.filter(crit).exists()
            else:
                msg_err = _("Model '%(mdl)s' not found.") % {'mdl': table}

            if exists:
                msg_err = _("'%(val)s' already exists.") % {'fld': fld, 'val': new_value}
    if msg_err:
        if table not in update_dict:
            update_dict[field] = {}
        update_dict[field]['error'] = msg_err

    has_error = True if msg_err else False
    return has_error


def validate_namelast_namefirst(namelast, namefirst, company, update_dict, this_pk=None):
    # validate if employee already_exists in this company PR2019-03-16
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    # logger.debug('employee_exists: ' + str(code) + ' ' + str(namelast) + ' ' + str(namefirst) + ' ' + str(company) + ' ' + str(this_pk))

    field = 'namelast'
    msg_err_namelast = None
    msg_err_namefirst = None
    has_error = False
    if not company:
        msg_err_namelast = _("No company.")
    else:
        # first name can be blank, last name not
        if not namelast:
            msg_err_namelast = _("Last name cannot be blank.")
    if msg_err_namelast is None:
        if len(namelast) > NAME_MAX_LENGTH:
            msg_err_namelast = _("Last name is too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')
        elif len(namefirst) > NAME_MAX_LENGTH:
            msg_err_namefirst = _("First name is too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')

        # check if first + lastname already exists
        if msg_err_namelast is None and msg_err_namefirst is None:
            if this_pk:
                name_exists = Employee.objects.filter(namelast__iexact=namelast,
                                                      namefirst__iexact=namefirst,
                                                      company=company
                                                      ).exclude(pk=this_pk).exists()
            else:
                name_exists = Employee.objects.filter(namelast__iexact=namelast,
                                                      namefirst__iexact=namefirst,
                                                      company=company
                                                      ).exists()
            if name_exists:
                msg_err_namelast = _("This employee name already exists.")
    if msg_err_namelast or msg_err_namefirst:
        if msg_err_namelast:
            has_error = True
            if field not in update_dict:
                update_dict[field] = {}
            update_dict[field]['error'] = msg_err_namelast
        if msg_err_namefirst:
            has_error = True
            if field not in update_dict:
                update_dict[field] = {}
            update_dict[field]['error'] = msg_err_namefirst

    return has_error


def employee_email_exists(email, company, this_pk = None):
    # validate if email address already_exists in this company PR2019-03-16

    msg_dont_add = None
    if not company:
        msg_dont_add = _("No company.")
    elif not email:
        msg_dont_add = _("Email address cannot be blank.")
    elif len(email) > NAME_MAX_LENGTH:
        msg_dont_add = _('Email address is too long. ') + str(CODE_MAX_LENGTH) + _(' characters or fewer.')
    else:
        if this_pk:
            email_exists = Employee.objects.filter(email__iexact=email,
                                                  company=company
                                                  ).exclude(pk=this_pk).exists()
        else:
            email_exists = Employee.objects.filter(email__iexact=email,
                                                  company=company).exists()
        if email_exists:
            msg_dont_add = _("This email address already exists.")

    return msg_dont_add


def validate_employee_has_emplhours(instance, update_dict):
    # validate if employee has emplhour records PR2019-07-30

    has_emplhours = False
    if instance:
        has_emplhours = Emplhour.objects.filter(employee=instance).exists()
        if has_emplhours:
            msg_err = _("Employee '%(tbl)s' has shifts and cannot be deleted.") % {'tbl': instance.code}
            update_dict['id']['error'] = msg_err
    return has_emplhours

