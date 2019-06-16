
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.db.models.functions import Upper, Lower

from django.utils.translation import ugettext_lazy as _

from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_MAPPED_COLDEFS


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
            raise ValidationError(_('Company name already exists.'))
        return value


def daterange_overlap(outer_datefirst, outer_datelast, inner_datefirst, inner_datelast=None ):
    # check if inner range falls within outer range PR2019-06-05
    within_range = True
    if inner_datefirst is None:
        within_range = False
    else:
        if inner_datelast is None:
            inner_datelast = inner_datefirst
        if outer_datefirst:
            if inner_datelast < outer_datefirst:
                within_range = False
        if outer_datelast:
            if inner_datefirst > outer_datelast:
                within_range = False
    return within_range


def date_within_range(outer_datefirst, outer_datelast, inner_date):
    # check if inner_date falls within outer range PR2019-06-05
    within_range = True
    if inner_date is None:
        within_range = False
    else:
        if outer_datefirst and inner_date < outer_datefirst:
            within_range = False
        if outer_datelast and inner_date > outer_datelast:
            within_range = False
    return within_range
