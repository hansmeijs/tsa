from django.forms import ModelForm, CharField, ChoiceField, MultipleChoiceField, TextInput, SelectMultiple, Select

from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import password_validation # PR2018-10-10
from django.core.validators import RegexValidator
from django.shortcuts import render
from django.utils.translation import ugettext_lazy as _


from companies.models import Company

from django.forms.widgets import PasswordInput
from django.core.exceptions import ValidationError

from tsap.constants import NAME_MAX_LENGTH, ROLE_01_COMPANY, ROLE_02_SYSTEM, PERMIT_01_READ, IS_ACTIVE_CHOICES

from collections import OrderedDict

from django.contrib.auth.forms import (
    AuthenticationForm, PasswordChangeForm, PasswordResetForm, SetPasswordForm,
)

import unicodedata

# PR2018-05-04
import logging
logger = logging.getLogger(__name__)

class CompanyAuthenticationForm(AuthenticationForm):
    companycode = CharField(
        required=True,
        label=_("Company"),
        widget=TextInput(attrs={'autofocus': True})
    )

    def __init__(self, request, *args, **kwargs):
        super(CompanyAuthenticationForm, self).__init__(request=request, *args, **kwargs)
        fields_keyOrder = ['companycode', 'username', 'password']
        if 'keyOrder' in self.fields:
            self.fields.keyOrder = fields_keyOrder
        else:
            self.fields = OrderedDict((k, self.fields[k]) for k in fields_keyOrder)

    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        # put companyprefix in front of username PR2019-03-13
        companycode = self.cleaned_data.get('companycode')
        company = Company.objects.filter(code__iexact=companycode).first()
        if company:
            username = company.companyprefix + username
        else:
            username = "xxxxxx" + username

        if username is not None and password:
            self.user_cache = authenticate(self.request, username=username, password=password)
            if self.user_cache is None:
                raise self.get_invalid_login_error()
            else:
                self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data

# PR2018-04-23
class UserAddForm(UserCreationForm):
    # only request.users with permit=Admin can add user
    class Meta:
        User = get_user_model()
        model = User
        fields = ('username', 'last_name', 'email')
        # PR2018-04-23 exclude doesn't work, use pop instead in __int__. Was: exclude = ('first_name','last_name')
        labels = {
            'username': _('Username'),
            'last_name': _('Full name'),
        }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)  # pop() removes and returns an element from a dictionary, second argument is default when not found
        super(UserAddForm, self).__init__(*args, **kwargs)

        self.request_user = self.request.user
        # logger.debug('UserAddForm: __init__ request_user: ' + str(request_user))
        self.request_user_company = None
        if self.request_user.company:
            self.request_user_company = self.request_user.company
        # logger.debug('UserAddForm self.request_user_company: ' + str(self.request_user_company))

            # ======= field 'last_name' ============
            # field 'first_name' is not in use
            self.fields['last_name'] = CharField(
                max_length=NAME_MAX_LENGTH,
                required=True,
                label=_('Full name'),
                help_text=_('Required, %(len)s characters or fewer.') % {'len': NAME_MAX_LENGTH},
            )

        # ======= field 'Role_list' ============
        # request.user with role=School: role = request.user.role, field is disabled
        # request.user with role=Insp can set role=Insp and role=School
        # request.user with role=System can set all roles
        # PR2018-08-04
        self.choices = [(ROLE_01_COMPANY, _('Company')), ]
        if self.request_user.is_role_system:
            self.choices.append((ROLE_02_SYSTEM, _('System')))

        self.fields['role_list'] = ChoiceField(
            required=True,
            # choises must be tuple or list, dictionary gives error: 'int' object is not iterable
            choices=self.choices,
            label=_('Organization'),
            initial=self.request_user.role
        )
        self.fields['role_list'].disabled = not self.request_user.is_role_system



    # ======= field 'Permits' ============
        # permits_choices_tuple: ((1, 'Read'), (2, 'Write'), (4, 'Authorize'), (8, 'Admin'))
        self.fields['permit_list'] = MultipleChoiceField(
            required=False,
            widget=SelectMultiple,
            choices=self.request_user.permits_choices,  # choises must be tuple or list, dictionary gives error: 'int' object is not iterable
            label='Permissions',
            help_text=_('Select one or more permissions from the list. Press the Ctrl button to select multiple permissions.'),
            initial= PERMIT_01_READ
        )


    # remove fields 'password1'
        self.fields.pop('password1')
        self.fields.pop('password2')

    # set field order
        #self.fields_keyOrder = ['username', 'last_name', 'email', 'role_list', 'permit_list']
        #if 'keyOrder' in self.fields:
        #    self.fields.keyOrder = self.fields_keyOrder
        #else:
        #    self.fields = OrderedDict((k, self.fields[k]) for k in self.fields_keyOrder)




# PR2018-04-23
class UserActivateForm(ModelForm):

    class Meta:
        User = get_user_model()
        model = User
        fields = ('last_name', 'email') # , 'password1', 'password2',)

    def __init__(self, *args, **kwargs):
        logger.debug('UserActivateForm __init__  kwargs: ' + str(kwargs))
        self.request = kwargs.pop('request', None)  # pop() removes and returns an element from a dictionary, second argument is default when not found
        logger.debug('UserActivateForm __init__ request: ' + str(self.request))
        super(UserActivateForm, self).__init__(*args, **kwargs)

        self.fields['password1'] = CharField(max_length=32, label='Password') # label -='' works, but appears again after formerror
        self.fields['password2'] = CharField(max_length=32, label='Repeat password')

        self.fields['password1'].widget = PasswordInput # this is not working
        self.fields['password2'].widget = PasswordInput # this is not working
        # self.fields['password1'].widget = HiddenInput() # this works, but label stays
        # self.fields['password2'].widget = HiddenInput() # this works, but label stays


class UserEditForm(ModelForm):
    class Meta:
        User = get_user_model()
        model = User
        fields = ('company', 'username', 'last_name', 'email', 'role')
        # PR2018-04-23 exclude doen't work, use pop instead in __int__
        # was: exclude = ('first_name','last_name')
        labels = {
            'last_name': _('Full name'),
            'role': _('Organization'),
        }

    # PR2018-08-19 VULNERABILITY: User Insp / School can access other users by entering: http://127.0.0.1:8000/users/6/edit
    # must check if country is same as countr of insp OR selected_school is same as school of role_school
    # PR2018-11-03 solved with test_func in UserEditView

    # PR2018-05-20 from https://stackoverflow.com/questions/16205908/django-modelform-not-required-field/30403969?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
    def __init__(self, *args, **kwargs):
        # kwargs: {'initial': {}, 'prefix': None, 'instance': <User: Truus>, 'request': <WSGIRequest: GET '/users/7/'>}
        self.request = kwargs.pop('request')  # To get request.user. Do not use kwargs.pop('user', None) due to potential security hole
        super(UserEditForm, self).__init__(*args, **kwargs)

        self.request_user = self.request.user
        # logger.debug('UserEditForm __init__ request_user ' + str(self.request_user))

        self.requestuser_company_id = 0
        if self.request_user.company:
            self.requestuser_company_id = self.request_user.company.id
        # logger.debug('UserEditForm __init__ self.requestuser_countryid ' + str(self.requestuser_countryid))

        self.this_instance = kwargs.get('instance')
        logger.debug('UserEditForm __init__ instance ' + str(self.this_instance))

        kwargs.update({'selected_username': self.this_instance.username})
        # logger.debug('UserEditForm __init__ self.kwargs ' + str(kwargs))

        self.selecteduser_company_id = 0
        if self.this_instance.company:
            self.selecteduser_company_id = self.this_instance.company.id
        # logger.debug('UserEditForm __init__ self.selecteduser_countryid ' + str(self.selecteduser_countryid))

    # ======= field 'Role' ============
        # PR2018-10-14 lock filed Role. Was: Field 'Role' can only be modified by system + admin users.
        #   _enabled = self.request_user.is_role_system
        #   self.fields['role'].disabled = not self.request_user.is_role_system_perm_admin
        self.fields['role'].disabled = True

    # ======= field 'Company' ============
        # PR2018-11-03 lock filed Company.
        self.fields['company'].disabled = True


        # ======= field 'dep_list' ============
        # TODO: Show only departments of selected school / examyear
        #dep_choices = Department.dep_list_choices(country=self.request.user.country)
        #self.fields['dep_list_field'] = MultipleChoiceField(
        #    required=False,
        #    widget=SelectMultiple,
        #    choices=dep_choices,
        #    label=_('Departments'),
        #    help_text=_('Select the departments where this user has access to. '
        #                'Press the Ctrl button to select multiple departments.')
        #)


    # ======= field 'department_field' ============
        # get value of selected_user_department_id
        # TODO correct into departmentbase
        #self.selected_user_department_id = 0
        #if self.this_instance.department:
        #    self.selected_user_department_id = self.this_instance.department.id
        # give value to _choices
        # TODO: Show only departments of selected school / examyear
        #dep_choices = Department.dep_list_choices(
        #    country=self.request.user.country,
        ##    # init_list_str=self.this_instance.dep_list
        #    )
        #self.fields['department_field'] = ChoiceField(
        #    required=False,
            # choises must be tuple or list, dictionary gives error: 'int' object is not iterable
        #    choices=dep_choices,
        #    label=_('Department'),
            # PR2018-07-31 debug: use schooldefault.id instead of schooldefault.
            # This showed always first item in choices: initial=self.this_instance.schooldefault
        # TODO correct into departmentbase
        #    initial=self.selected_user_department_id
        #)


    # ======= field 'Permits' ============
        self.permits_tuple = self.this_instance.permits_tuple
        self.fields['permit_list'] = MultipleChoiceField(
            required=False,
            widget=SelectMultiple,
            # choises must be tuple or list, dictionary gives error: 'int' object is not iterable
            choices= self.request.user.permits_choices,
            label='Permissions',
            help_text=_('Select one or more permissions from the list. Press the Ctrl button to select multiple permissions.'),
            initial=self.permits_tuple
        )

    # ======= field 'is_active' ============
        # PR2018-06-22, value in is_active is stored as str: '0'=False, '1'=True
        __initial_is_active = 0
        if self.this_instance.is_active is not None:
            __initial_is_active = int(self.this_instance.is_active)
        # logger.debug('UserEditForm __init__ instance ' + str(self.this_instance) + ' __initial_is_active: ' + str(__initial_is_active) + ' type : ' + str(type(__initial_is_active)))
        self.fields['field_is_active'] = ChoiceField(
            choices=IS_ACTIVE_CHOICES,
            label=_('Active'),
            initial=__initial_is_active
        )
"""
USED TO FIND PROBLEM THAT PASSWORDS ARE NOT SAVED - problem: forgot 'password_mod' in datahaschanged in model User
# PR2018-10-13
class UserResetPasswordForm(Form):


    A form that lets a user change set their password without entering the old
    password

    error_messages = {
        'password_mismatch': _("The two password fields didn't match."),
    }
    new_password1 = CharField(
        label=_("New password"),
        widget=PasswordInput,
        strip=False,
        help_text=password_validation.password_validators_help_text_html(),
    )
    new_password2 = CharField(
        label=_("New password confirmation"),
        strip=False,
        widget=PasswordInput,
    )

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        logger.debug('UserResetPasswordForm __init__ kwargs ' + str(kwargs))
        logger.debug('UserResetPasswordForm __init__ self.user ' + str(self.user))

    def clean_new_password2(self):
        password1 = self.cleaned_data.get('new_password1')
        password2 = self.cleaned_data.get('new_password2')
        logger.debug('UserResetPasswordForm password1 ' + str(password1))
        logger.debug('UserResetPasswordForm password2 ' + str(password2))

        if password1 and password2:
            if password1 != password2:
                raise ValidationError(
                    self.error_messages['password_mismatch'],
                    code='password_mismatch',
                )
        password_validation.validate_password(password2, self.user)

        logger.debug('UserResetPasswordForm password_validation ' + str(password2))
        return password2

    def save(self, commit=True):
        password = self.cleaned_data["new_password1"]
        logger.debug('UserResetPasswordForm save password ' + str(password))
        logger.debug('UserResetPasswordForm self.user ' + str(self.user))
        self.user.set_password(password)
        if commit:
            logger.debug('UserResetPasswordForm before save password: ' + self.user.password)
            logger.debug('UserResetPasswordForm before save has_usable_password: ' + str(self.user.has_usable_password()))
            logger.debug('UserResetPasswordForm before save modifiedat: ' + str(self.user.modifiedat))
            self.user.modifiedat = timezone.now
            self.user.save()
            logger.debug('UserResetPasswordForm password saved')
            logger.debug('UserResetPasswordForm after save password: ' + self.user.password)
            logger.debug('UserResetPasswordForm after save has_usable_password: ' + str(self.user.has_usable_password()))
            logger.debug('UserResetPasswordForm after save modifiedat: ' + str(self.user.modifiedat))

            checked = self.user.check_password('jumper77')
            logger.debug('UserResetPasswordForm password checked: ' + str(checked))

        from accounts.models import User
        thisusr = User.objects.filter(username='InspCur').first()
        logger.debug('UserSetPasswordForm password thisusr: ' + str(thisusr.username))
        checked = self.user.check_password('jumper77')
        logger.debug('UserSetPasswordForm password InspCur jumper77: ' + str(checked))
        logger.debug('UserSetPasswordForm password jumper77: ' + str(checked))
        checked = self.user.check_password('jumper55')
        logger.debug('UserSetPasswordForm password jumper55: ' + str(checked))

        return self.user
"""