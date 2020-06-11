from django.core.exceptions import ValidationError
from django.db.models import Q
from django.db.models.functions import Upper, Lower

from django.utils.translation import ugettext_lazy as _

from accounts import models as am
from companies import models as m
from tsap import constants as c

import logging
logger = logging.getLogger(__name__)  # __name__ tsap.validators


# === validate_unique_username ===================================== PR2020-03-31
def validate_unique_username(value, cur_user_id=None):
    logger.debug ('validate_unique_username', value)
    # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
    msg_err = None
    if not value:
        msg_err = _('Username cannot be blank.')
    elif len(value) > c.CODE_MAX_LENGTH:
        msg_err = _('Username must have %(fld)s characters or less.') % {'fld': c.CODE_MAX_LENGTH}
    else:
        if cur_user_id:
            value_exists = am.User.objects.filter(username__iexact=value).exclude(pk=cur_user_id).exists()
        else:
            value_exists = am.User.objects.filter(username__iexact=value).exists()
            logger.debug ('validate_unique_username', value_exists)

            users = am.User.objects.all()
            for user in users:
                logger.debug ('user', user.username)


        if value_exists:
            msg_err = _("Username '%(fld)s' already exists.") % {'fld': value}
    return msg_err


# === validate_unique_useremail ===================================== PR2020-03-31
def validate_unique_useremail(value, cur_user_id=None):
    logger.debug ('validate_unique_useremail', value)
    # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
    msg_err = None
    if not value:
        msg_err = _('Email address cannot be blank.')
    else:
        if cur_user_id:
            value_exists = am.User.objects.filter(email__iexact=value).exclude(pk=cur_user_id).exists()
        else:
            value_exists = am.User.objects.filter(email__iexact=value).exists()
        if value_exists:
            msg_err = _("There is already a user with email address '%(fld)s'.") % {'fld': value}
    return msg_err

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
                customer = m.Customer.objects.filter(name__iexact=value, company=company).exclude(pk=this_pk).first()
            else:
                customer = m.Customer.objects.filter(name__iexact=value, company=company).first()
            if customer:
                msg_dont_add = _("This name already exists.")
        elif field == 'code':
            if this_pk:
                customer = m.Customer.objects.filter(code__iexact=value, company=company).exclude(pk=this_pk).first()
            else:
                customer = m.Customer.objects.filter(code__iexact=value, company=company).first()
            if customer:
                msg_dont_add = _("This code already exists.")
    return msg_dont_add

def validate_unique_company_code(value, cur_company_id=None):  # PR2019-03-15  # PR2020-03-29
    logger.debug ('validate_unique_company_code', value)
    # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
    # skip companies that are not activated PR2020-04-02
    msg_err = None
    if not value:
        msg_err = _('Company cannot be blank.')
    else:
        if cur_company_id:
            value_exists = m.Company.objects.filter(code__iexact=value, activated=True).exclude(pk=cur_company_id).exists()
        else:
            value_exists = m.Company.objects.filter(code__iexact=value, activated=True).exists()
        if value_exists:
            msg_err = _("Company '%(fld)s' already exists.") % {'fld': value}
    return msg_err


def validate_unique_company_name(value, cur_company_id=None):  # PR2019-03-15  # PR2020-03-29
    logger.debug ('validate_unique_company_name', value)
    # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
    msg_err = None
    if not value:
        msg_err = _('Company name cannot be blank.')
    else:
        value_exists = False
        if cur_company_id:
            value_exists = m.Company.objects.filter(name__iexact=value).exclude(pk=cur_company_id).exists()
        else:
            value_exists = m.Company.objects.filter(name__iexact=value).exists()
        if value_exists:
            msg_err = _('Company name already exists.')
    return msg_err


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
                cls = m.Company
            elif self.model == 'customer':
                cls = m.Customer
            elif self.model == 'employee':
                cls = m.Employee

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
            _value_exists = m.Company.objects.filter(name__iexact=value).exists()
        else:
            _value_exists = m.Company.objects.filter(name__iexact=value).exclude(
                pk=self.instance_id).exists()
        if _value_exists:
            raise ValidationError(_('Employee name already exists.'))
        return value

def validate_code_name_identifier(table, field, new_value, parent, update_dict, request, this_pk=None):
    # validate if code already_exists in this table PR2019-07-30
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    # logger.debug('validate_code_name_identifier: ' + str(table) + ' ' + str(field) + ' ' + str(new_value) + ' ' + str(parent) + ' ' + str(this_pk))
    msg_err = None
    if not parent:
        msg_err = _("No parent record.")
    else:
        max_len = c.NAME_MAX_LENGTH if field == 'name' else c.CODE_MAX_LENGTH

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
            crit = None
            if table == 'employee' or table == 'customer':
                crit = Q(company=request.user.company)
            elif table == 'order':
                crit = Q(customer__company=request.user.company)
                 # identifier is unique in company
                if field != 'identifier':
                    crit.add(Q(customer=parent), crit.connector)
            elif table == 'scheme':
                crit = Q(order__customer__company=request.user.company)
                crit.add(Q(order=parent), crit.connector)
            elif table == 'shift' or table == 'team':
                crit = Q(scheme__order__customer__company=request.user.company)
                crit.add(Q(scheme=parent), crit.connector)
            else:
                msg_err = _("Model '%(mdl)s' not found.") % {'mdl': table}

    # filter code, name, identifier, not case sensitive
            if field == 'code':
                crit.add(Q(code__iexact=new_value), crit.connector)
            elif field == 'name':
                crit.add(Q(name__iexact=new_value), crit.connector)
            elif field == 'identifier':
                crit.add(Q(identifier__iexact=new_value), crit.connector)
    # exclude this record
            if this_pk:
                crit.add(~Q(pk=this_pk), crit.connector)

            #logger.debug('validate_code_name_identifier')
            #logger.debug('table: ' + str(table) + 'field: ' + str(field) + ' new_value: ' + str(new_value))

            exists = False
            is_inactive = False
            instance = None
            if table == 'employee':
                instance = m.Employee.objects.filter(crit).first()
            elif table == 'customer':
                instance = m.Customer.objects.filter(crit).first()
            elif table == 'order':
                instance = m.Order.objects.filter(crit).first()
            elif table == 'scheme':
                instance = m.Scheme.objects.filter(crit).first()
            elif table == 'shift':
                instance = m.Shift.objects.filter(crit).first()
            elif table == 'team':
                instance = m.Team.objects.filter(crit).first()
            else:
                msg_err = _("Model '%(mdl)s' not found.") % {'mdl': table}
            # TODO msg not working yet
            if instance:
                exists = True
                is_inactive = getattr(instance, 'inactive', False)
            if exists:
                if is_inactive:
                    msg_err = _("'%(val)s' exists, but is inactive.") % {'fld': fld, 'val': new_value}
                else:
                    msg_err = _("'%(val)s' already exists.") % {'fld': fld, 'val': new_value}

    if msg_err:
        if update_dict:
            if field not in update_dict:
                update_dict[field] = {}
            update_dict[field]['error'] = msg_err

    has_error = True if msg_err else False
    return has_error


def validate_namelast_namefirst(namelast, namefirst, company, update_field, update_dict, this_pk=None):
    # validate if employee already_exists in this company PR2019-03-16
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    logger.debug(' --- validate_namelast_namefirst --- ' + str(namelast) + ' ' + str(namefirst) + ' ' + str(this_pk))

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
        if len(namelast) > c.NAME_MAX_LENGTH:
            msg_err_namelast = _("Last name is too long.") + str(c.NAME_MAX_LENGTH) + _(' characters or fewer.')
        elif namefirst:
            if len(namefirst) > c.NAME_MAX_LENGTH:
                msg_err_namefirst = _("First name is too long.") + str(c.NAME_MAX_LENGTH) + _(' characters or fewer.')

        # check if first + lastname already exists
        if msg_err_namelast is None and msg_err_namefirst is None:
            if this_pk:
                name_exists = m.Employee.objects.filter(namelast__iexact=namelast,
                                                      namefirst__iexact=namefirst,
                                                      company=company
                                                      ).exclude(pk=this_pk).exists()
            else:
                name_exists = m.Employee.objects.filter(namelast__iexact=namelast,
                                                      namefirst__iexact=namefirst,
                                                      company=company
                                                      ).exists()
            if name_exists:
                new_name = ' '.join([namefirst, namelast])
                msg_err = _("'%(val)s' already exists.") % {'val': new_name}
                if update_field == 'namelast':
                    msg_err_namelast = msg_err
                elif update_field == 'namefirst':
                    msg_err_namefirst = msg_err
    if msg_err_namelast or msg_err_namefirst:
        if msg_err_namelast:
            has_error = True
            field = 'namelast'
            if field not in update_dict:
                update_dict[field] = {}
            update_dict[field]['error'] = msg_err_namelast
        if msg_err_namefirst:
            field = 'namefirst'
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
    elif len(email) > c.NAME_MAX_LENGTH:
        msg_dont_add = _('Email address is too long. ') + str(c.CODE_MAX_LENGTH) + _(' characters or fewer.')
    else:
        if this_pk:
            email_exists = m.Employee.objects.filter(email__iexact=email,
                                                  company=company
                                                  ).exclude(pk=this_pk).exists()
        else:
            email_exists = m.Employee.objects.filter(email__iexact=email,
                                                  company=company).exists()
        if email_exists:
            msg_dont_add = _("This email address already exists.")

    return msg_dont_add


def validate_employee_has_emplhours(instance, update_dict):
    # validate if employee has emplhour records PR2019-07-30
    has_emplhours = False
    if instance:
        has_emplhours = m.Emplhour.objects.filter(employee=instance).exists()
        if has_emplhours:
            msg_err = _("Employee '%(tbl)s' has shifts and cannot be deleted.") % {'tbl': instance.code}
            update_dict['id']['error'] = msg_err
    return has_emplhours

def validate_order_has_emplhours(order, update_dict, is_abscat):
    # validate if order has emplhour records PR2020-06-10
    has_emplhours = False
    if order:
        has_emplhours = m.Emplhour.objects.filter(orderhour__order=order).exists()
        if has_emplhours:
            field = _('Absence category') if is_abscat else _('Order')
            msg_err = _("%(fld)s '%(tbl)s' has shifts and cannot be deleted.") % {'fld': field, 'tbl': order.code}
            update_dict['id']['error'] = msg_err
    return has_emplhours

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

