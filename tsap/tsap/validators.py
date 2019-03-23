
from django.core.exceptions import ValidationError
from django.utils.translation import ugettext_lazy as _
from companies.models import Company
from customers.models import Customer
from employees.models import Employee

from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_MAPPED_COLDEFS

import logging
logger = logging.getLogger(__name__)


def validate_employee_code(code, company, this_pk=None):
    # validate if employee code already_exists in this company PR2019-03-16
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    #logger.debug('employee_exists: ' + str(code) + ' ' + str(name_last) + ' ' + str(name_first) + ' ' + str(company) + ' ' + str(this_pk))
    msg_dont_add = None
    if not company:
        msg_dont_add = _("No company.")
    elif not code:
        msg_dont_add = _("Code cannot be blank.")
    elif len(code) > CODE_MAX_LENGTH:
        msg_dont_add = _('Code is too long. ') + str(CODE_MAX_LENGTH) + _(' characters or fewer.')
    else:
# check if code already exists
        if this_pk:
            code_exists = Employee.objects.filter(code__iexact=code,
                                                  company=company
                                                  ).exclude(pk=this_pk).exists()
        else:
            code_exists = Employee.objects.filter(code__iexact=code,
                                                  company=company).exists()
        if code_exists:
            msg_dont_add = _("This employee code already exists.")

    return msg_dont_add

def validate_employee_name(name_last, name_first,  company, this_pk = None):
    # validate if employee already_exists in this company PR2019-03-16
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    #logger.debug('employee_exists: ' + str(code) + ' ' + str(name_last) + ' ' + str(name_first) + ' ' + str(company) + ' ' + str(this_pk))
    msg_dont_add = None

    msg_dont_add = None
    if not company:
        msg_dont_add = _("No company.")
    else:
        if not name_last:
            if not name_first:
                msg_dont_add = _("First and last name cannot be blank.")
            else:
                msg_dont_add = _("Last name cannot be blank.")
        elif not name_first:
            msg_dont_add = _("First name cannot be blank.")
    if msg_dont_add is None:
        if len(name_last) > NAME_MAX_LENGTH:
            if len(name_first) > NAME_MAX_LENGTH:
                msg_dont_add = _("First and last name are too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')
            else:
                msg_dont_add = _("Last name is too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')
        elif len(name_first) > NAME_MAX_LENGTH:
            msg_dont_add = _("First name is too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')

        # check if first + lastname already exists
        if msg_dont_add is None:
            if this_pk:
                name_exists = Employee.objects.filter(name_last__iexact=name_last,
                                                   name_first__iexact=name_first,
                                                   company=company
                                                   ).exclude(pk=this_pk).exists()
            else:
                name_exists = Employee.objects.filter(name_last__iexact=name_last,
                                                   name_first__iexact=name_first,
                                                   company=company
                                                   ).exists()
            if name_exists:
                msg_dont_add = _("This employee name already exists.")

    return msg_dont_add

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


def customer_exists(field, value, company, this_pk = None):
    # validate if customer code_already_exists already exists in this company PR2019-03-04
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):

    #logger.debug('cust_code_exists: ' + str(code) + ' ' + str(company) + ' ' + str(this_pk))
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


def check_date_overlap(datefirst_int, datelast_int, datefirst_is_updated):
    # PR2019-03-10 check if first date is after last date
    msg_dont_add = None
    if datefirst_int and datelast_int:
        if datefirst_int > datelast_int:
            if datefirst_is_updated:
                msg_dont_add = _("First date cannot be after last date.")
            else:
                msg_dont_add = _("Last date cannot be before first date.")
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


class validate_unique_code(object):  # PR2019-03-16
    def __init__(self, model=None, field=None, instance=None):
        self.model=model
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
                        self.value_exists = cls.objects.filter(code__iexact=value).exists()
                    elif self.field == 'name':
                        self.value_exists = cls.objects.filter(name__iexact=value).exists()
                    else:
                        raise ValidationError(_('Error: Field error.'))
                else:
                    if self.field == 'code':
                        self.value_exists = cls.objects.filter(code__iexact=value).exclude(
                            pk=self.instance_id).exists()
                    elif self.field == 'name':
                        self.value_exists = cls.objects.filter(name__iexact=value).exclude(
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
            raise ValidationError(_('Company name already exists.'))
        return value

