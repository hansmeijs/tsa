from django.contrib.auth import login, get_user_model
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.decorators import login_required  # PR2018-04-01
from django.contrib.auth import (get_user_model, login as auth_login, logout as auth_logout, update_session_auth_hash)
from django.contrib.auth.mixins import UserPassesTestMixin  # PR2018-11-03
from django.contrib.sites.shortcuts import get_current_site
from django.contrib import messages
from django.core.mail import send_mail
from  django.core.validators import URLValidator, ValidationError

from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.translation import activate, ugettext_lazy as _
from django.views.generic import ListView, View, CreateView, UpdateView, DeleteView
from django.contrib.auth.views import PasswordResetConfirmView # PR2018-10-14
from django.contrib.auth.forms import SetPasswordForm # PR2018-10-14
from django.views.decorators.debug import sensitive_post_parameters # PR2018-10-14
from django.views.decorators.csrf import csrf_protect # PR2018-10-14
from django.contrib.auth import update_session_auth_hash # PR2018-10-14
from django.views.decorators.cache import never_cache # PR2018-10-14
from django.contrib.auth import login, authenticate  # PR2020-03-27
from django.contrib.auth.forms import UserCreationForm  # PR2020-03-27

from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import make_password





from datetime import datetime
import pytz
import tsap.validators as v
import json

from tsap.headerbar import get_headerbar_param
from companies.views import LazyEncoder

from .forms import UserAddForm, UserEditForm, UserActivateForm, SignUpForm, TESTSignUpSetPasswordForm
from .tokens import account_activation_token
from .models import User, Usersetting

from accounts import models as am
from companies import models as m
from tsap import constants as c
from tsap import functions as f
from tsap import settings as s

import logging
logger = logging.getLogger(__name__)

@method_decorator([login_required], name='dispatch')
class UserListView(ListView):
    # PR 2018-04-22 template_name = 'user_list.html' is not necessary, Django looks for <appname>/<model>_list.html

    def get(self, request, *args, **kwargs):
        User = get_user_model()

        # PR2018-04-24 get all user of the country of the current user (for inspection users)
        # users = User.objects.filter(id__schoolcode_id__country=request_country)

        # PR2018-05-27 list of users in UserListView:
        # - when role is system: show all users
        # - when role is company: all users of this company
        # - else (role is employee): not allowed to view users

        users = None  # User.objects.filter(False) gives error: 'bool' object is not iterable
        if request.user.role is not None:  # PR2018-05-31 debug: self.role = False when value = 0!!! Use is not None instead
            if request.user.is_role_system:
                users = User.objects.all() # order_by('username') is in model class Meta
            elif request.user.is_role_company:
                if request.user.company is not None:
                    # filter only users from this company, no system role
                    users = User.objects.filter(company=request.user.company, role__lte=c.ROLE_01_COMPANY)

        else:
            messages.error(request, _("User has no role."))

        headerbar_param = get_headerbar_param(request, {'users': users})
        # logger.debug('home headerbar_param: ' + str(headerbar_param))
        """
        headerbar_param:
        {
            'context':
                {'schoolyear': '2018-2019', 
                    'select_schoolyear': True, 
                    'display_schoolyear': True,
                    'school': 'CUR02  Skol Avansa Amador Nita - Saan', 
                    'display_school': False,
                    'class_examyear_warning': 'navbar-item-warning'},

            'schoolyear_list':
                [{'pk': '2', 'schoolyear': '2018-2019', 'selected': True},
                 {'pk': '1', 'schoolyear': '2017-2018', 'selected': False}],

            'school_list':
                [{'pk': '5', 'school': 'CUR01 -  Ancilla Domini Vsbo', 'selected': False},
                 {'pk': '6', 'school': 'CUR02 -  Skol Avansa Amador Nita - Saan', 'selected': True},
                 {'pk': '7', 'school': 'CUR03 -  Juan Pablo Duarte Vsbo', 'selected': False}],
        }
        """

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'users.html', headerbar_param)

# How To Create Users Without Setting Their Password PR2018-10-09
# from https://django-authtools.readthedocs.io/en/latest/how-to/invitation-email.html


@method_decorator([login_required], name='dispatch')
class UserAddView(CreateView):
    # model = User
    # form_class = UserAddForm
    # template_name = 'user_add.html' # without template_name Django searches for user_form.html
    # pk_url_kwarg = 'pk'
    # context_object_name = 'UserAddForm' # "context_object_name" changes the original parameter name "object_list"

    def get(self, request, *args, **kwargs):
        # required: user.is_authenticated and user.may_add_or_edit_users

        form = UserAddForm(request=request)

        param = get_headerbar_param(request, {
            'form': form
        })
        # render(request, template_name, context=None (A dictionary of values to add to the template context), content_type=None, status=None, using=None)
        return render(request, 'user_add.html', param)

        # Every field in the form will have a field_name_clean() method created automatically by Django.\
        # This method is called when you do form.is_valid().
        # def clean_password1(self):
        #    password_default = 'default'
        #    self.cleaned_data['password1'] = password_default
        #    return password_default

    def post(self, request, *args, **kwargs):
        # data = request.POST.copy()
        # logger.debug('UserAddView def post(self, request:data = ' + str(data))
        form = UserAddForm(request.POST, request=request)  # form = UserAddForm(request.POST)
        # logger.debug('UserAddView post form.data: ' + str(form.data))
        print('UserAddView post form.data: ' + str(form.data))

        if form.is_valid():
            # logger.debug('UserAddView post is_valid form.data: ')
            if request.user.company is not None:
        # create random password
                randompassword = User.objects.make_random_password() + User.objects.make_random_password()
                form.cleaned_data['password1'] = randompassword
                form.cleaned_data['password2'] = randompassword

        # save user without commit
                new_user = form.save(commit=False)
                # logger.debug('UserAddView post form.save after commit=False')

        # ======  save field 'company'  ============
            # user.company cannot be changed, except for users with role.system. They can switch company in headerbar.
                new_user.company = request.user.company

        # ======  save field 'Username'  ============
                new_username = form.cleaned_data.get('username')
                # Add compayprefix to username
                prefixed_username = new_user.company.companyprefix + new_username
                # logger.debug('prefixed_username: ' + str(prefixed_username))
                new_user.username = prefixed_username
                # store username without prefix in field 'first name', to be shown in user edit form
                new_user.first_name = new_username

        # ======  save field 'Role'  ============
                # only request.user with role=System  kan set different role, Company can only set its own role
                if request.user.is_role_system:
                    role_int = form.cleaned_data.get('role_list')
                else:
                    role_int = request.user.role
                new_user.role = role_int
                # logger.debug('UserAddView post form.is_valid user.username: '+ str(user.username))
                # logger.debug('UserAddView post form.is_valid user.role: '+ str(user.role))

        # ======  save field 'Permit'
                permit_sum = 0
                permit_list = form.cleaned_data.get('permit_list')
                if permit_list:
                    for item in permit_list:
                        try:
                            permit_sum = permit_sum + int(item)
                        except:
                            pass
                new_user.permits = permit_sum

        # ======  save field 'Lang'
                user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                new_user.lang = user_lang

                new_user.is_active = False
                new_user.activated = False

        # ======  save new_user
                new_user.save(self.request)  # PR 2018-08-04 debug: was: user.save()
                # logger.debug('UserAddView post password: ' +  str(user.password))

                current_site = get_current_site(request)
                # logger.debug('UserAddView post current_site: ' +  str(current_site))
                # logger.debug('current_site.domain: ' +  str(current_site.domain))

                # domain = current_site.domain
                # logger.debug('UserAddView post domain: ' +  str(domain) + '\n')

                # uid_code = urlsafe_base64_encode(force_bytes(user.pk))
                # logger.debug('UserAddView post uid_code: ' + str(uid_code))

                # token = account_activation_token.make_token(user)
                # logger.debug('UserAddView post token: ' + str(token))

                subject = 'Activate your TSA-secure account'
                from_email = 'TSA-secure <noreply@tsasecure.com>'
                message = render_to_string('account_activation_email.html', {
                    'user': new_user,
                    'domain': current_site.domain,
                    # PR2018-04-24 debug: In Django 2.0 you should call decode() after base64 encoding the uid, to convert it to a string:
                    # 'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                    'uid': urlsafe_base64_encode(force_bytes(new_user.pk)).decode(),
                    'token': account_activation_token.make_token(new_user),
                })
                # logger.debug('UserAddView post subject: ' + str(subject))
                # PR2018-12-31 moved from accounts_user to here
                # PR2018-04-25 arguments: send_mail(subject, message, from_email, recipient_list, fail_silently=False, auth_user=None, auth_password=None, connection=None, html_message=None)
                send_mail(subject, message, from_email, [new_user.email], fail_silently=False)

                # logger.debug('UserAddView post message sent. ')
                return redirect('account_activation_sent_url')
            else:
                # TODO: message that company is not correct
                 return render(request, 'user_add.html', {'form': form})

        else:
            # logger.debug('UserAddView post NOT is_valid form.data: ' + str(form.data))
            return render(request, 'user_add.html', {'form': form})


@method_decorator([login_required], name='dispatch')
class UserEditView(UserPassesTestMixin, UpdateView):
    User = get_user_model()
    model = User
    form_class = UserEditForm
    template_name = 'user_edit.html' # without template_name Django searches for user_form.html
    # PR2018-08-02 debug: omitting context_object_name = 'UserEditView' has a weird effect:
    # the selected_user becomes the request_user
    context_object_name = 'UserEditView' # "context_object_name" changes the original parameter name "object_list"

    # +++ VULNERABILITY !!! +++++++++++++++++++++++++++++++++++++++
    # PR2018-08-19
    # VULNERABILITY: User Insp / School can access other users by entering: http://127.0.0.1:8000/users/6/edit
    # must check if country is same as country of insp OR selected_school is same as school of role_school

    # PR2018-11-03 from: https://python-programming.com/django/permission-checking-django-views/
    # UserPassesTestMixin uses test_func to check permissions
    def test_func(self):
        is_ok = False
        if self.request.user is not None:
            request_user = self.request.user
        # request_user must be active
            if request_user.is_active:
        # is_role_system is_ok
                if self.request.user.is_role_system:
                    is_ok = True
        # other request_users must have company
                elif request_user.company is not None:
                    selected_user_id = self.kwargs['pk']
                    if selected_user_id is not None:
                        selected_user = User.objects.filter(id=selected_user_id).first()
                        if selected_user is not None:
        # selected_user must have company
                            if selected_user.company is not None:
        # request_user.company and selected_user.company must be the same
                                if selected_user.company.id == request_user.company.id:
        # is_role_company is_ok
                                    if self.request.user.is_role_company:
                                        is_ok = True
        # is_role_employee cannot change users: is_ok = False PR2019-04-05
        return is_ok

    # from https://stackoverflow.com/questions/7299973/django-how-to-access-current-request-user-in-modelform?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
    # PR 2018-05-25 add request to kwargs, so it passes request to the form
    def get_form_kwargs(self):
        """
        FormMixin
            kwargs = {
                'initial': self.get_initial(),
                'prefix': self.get_prefix(),}
            if self.request.method in ('POST', 'PUT'):
                kwargs.update({
                    'data': self.request.POST,
                    'files': self.request.FILES,})
        ModelFormMixin
            if hasattr(self, 'object'):
                kwargs.update({
                    'instance': self.object})
        """
        kwargs = super(UserEditView, self).get_form_kwargs()
        #  add request to kwargs, so it can be passed to form
        kwargs.update({'request': self.request})

        # eg: kwargs: {'initial': {}, 'prefix': None, 'instance': <User: Ad>, 'request': <WSGIRequest: GET '/users/18/edit'>}
        # logger.debug('UserEditView get_form_kwargs kwargs: ' + str(kwargs))
        return kwargs


    def form_valid(self, form):
        user = form.save(commit=False)

# ======  save field 'Permit_list'  ============
    # ATTENTION user with permission admin cannot cancel this, otherwise he could lock himself out
    # get selected permits from permit_list, convert it to permit_sum, save it in user.permits
        # check if regusat user is changing himself
        user_equals_requestuser = user == self.request.user
        cleaned_permit_has_admin = False

        permit_list = form.cleaned_data.get('permit_list')
        permit_sum = 0
        if permit_list:
            for item in permit_list:
                try:
                    if int(item) == c.PERMIT_32_ADMIN:
                        cleaned_permit_has_admin = True
                    permit_sum = permit_sum + int(item)
                except:
                    pass

        # add admin to permit if admin user has removed admin from his own permit list PR2018-08-25
        if user_equals_requestuser:
            if not cleaned_permit_has_admin:
                permit_sum = permit_sum + c.PERMIT_32_ADMIN

        user.permits = permit_sum

# ======  save field 'field_is_active'  ============
        # PR2018-08-09 get value from field 'field_is_active', save it in user.is_active
        # value in field_is_active is stored as str: '0'=False, '1'=True
        field_is_active = form.cleaned_data.get('field_is_active')
        # logger.debug('UserEditView form_valid field_is_active: ' +  str(field_is_active) + ' Type: ' + str(type(field_is_active)))
        _is_active = bool(int(field_is_active))
        user.is_active = _is_active

        user.modifiedby = self.request.user
        # user.modifiedat will be updated in model.save

        user.save(self.request)  # was: user.save()
        return redirect('user_list_url')


@method_decorator([login_required], name='dispatch')
class UserLanguageView(View):

    def get(self, request, lang, pk):
        # logger.debug('UserLanguageView get self: ' + str(self) + 'request: ' + str(request) + ' lang: ' + str(lang) + ' pk: ' + str(pk))
        if request.user is not None :
            # logger.debug('UserLanguageView get request.user: ' + str(request.user))
            request.user.lang = lang
            # logger.debug('UserLanguageView get request.user.language: ' + str(request.user.lang))
            request.user.save(self.request)
            # logger.debug('UserLanguageView get saved.language: ' + str(request.user.lang))
        return redirect('home')


# PR2018-04-24
def account_activation_sent(request):
    # logger.debug('account_activation_sent request: ' + str(request))
    # PR2018-05-27
    # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
    return render(request, 'account_activation_sent.html')

# PR2018-04-24
@method_decorator([login_required], name='dispatch')
class UserActivateView(UpdateView):
    model = User
    form_class = UserActivateForm
    template_name = 'user_edit.html'  # without template_name Django searches for user_form.html
    pk_url_kwarg = 'pk'
    context_object_name = 'UserActivateForm'  # "context_object_name" changes the original parameter name "object_list"
    # this one doesnt word: goes to login form, user not activated
    def activate(request, uidb64, token):
        # logger.debug('UserActivateView def activate request: ' +  str(request))

        #try:
        uid = force_text(urlsafe_base64_decode(uidb64))

        user = User.objects.get(pk=uid)
        logger.debug('UserActivateView def activate user: ' + str(user))

        #except:  #except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        #    logger.debug('def activate except TypeError: ' + str(TypeError))
        #    logger.debug('def activate except ValueError: ' + str(ValueError))
        #    logger.debug('def activate except OverflowError: ' + str(OverflowError))
        #    logger.debug('def activate except User.DoesNotExist: ' + str(User.DoesNotExist))
        #    user = None

        logger.debug('UserActivateView def activate token: ' + str(token))

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.activated = True
            user.save()
            # logger.debug('UserActivateView def activate user.saved: ' + str(user))
            # login(request, user)
            # logger.debug('UserActivateView def activate user.loggedin: ' + str(user))

            # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
            #return render(request, 'account_activation_success.html', {'user': user,})
            return render(request, 'user_set_password.html', {'user': user,})

            # select_school = False
            display_school = True
            if request.user is not None:
                if request.user.is_authenticated:
                    if request.user.is_role_school_perm_admin:
                        display_school = True

            param = {'display_user': True }
            headerbar_param = f.get_headerbar_param(request, param)
            headerbar_param['form'] = form
            # logger.debug('def home(request) headerbar_param: ' + str(headerbar_param))

            return render(request, 'user_add.html', headerbar_param)

        else:
            # logger.debug('def activate account_activation_token.check_token False')
            return render(request, 'account_activation_invalid.html')


# PR2018-04-24
def UserActivate(request, uidb64, token):
    # this view is opened when the user has clicked on the link in the form account_activation_success:
    #  'You have successfully activated your TSA-secure account.
    #  Before you can login you have to create a password.
    #  Click "Create password" and follow the instructions.
    logger.debug('UserActivate request: ' + str(request) + str(uidb64))

    try:
        uid = force_text(urlsafe_base64_decode(uidb64))
        logger.debug('def activate try uid: ' + str(uid))
        user = User.objects.get(pk=uid)
        logger.debug('UserActivate def activate try user: ' + str(user))

    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        # logger.debug('UserActivate def activate except TypeError: ' + str(TypeError))
        # logger.debug('UserActivate def activate except ValueError: ' + str(ValueError))
        # logger.debug('UserActivate def activate except OverflowError: ' + str(OverflowError))
        # logger.debug('UserActivate def activate except User.DoesNotExist: ' + str(User.DoesNotExist))
        user = None

    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.activated = True
        # timezone.now() is timezone aware, based on the USE_TZ setting; datetime.now() is timezone naive. PR2018-06-07
        user.activatedat = timezone.now()
        user.save()
        logger.debug('UserActivate def activate user.saved: ' + str(user))

        # open setpassword form

        # login(request, user)
        # logger.debug('UserActivate def activate user.loggedin: ' + str(user))



        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'account_activation_success.html')
        # return render(request, 'password_change.html', {'user': user,})
        # return render(request, 'user_set_password.html', {'user': user,})
        # return render(request, 'password_reset_confirm.html', {'user': user,})

    else:
        logger.debug('def activate account_activation_token.check_token False')
        return render(request, 'account_activation_invalid.html')

"""
#>>>>>>>>>>>>>>>>>
class PasswordChangeView(PasswordContextMixin, FormView):
    form_class = PasswordChangeForm
    success_url = reverse_lazy('password_change_done')
    template_name = 'registration/password_change_form.html'
    title = _('Password change')

    @method_decorator(sensitive_post_parameters())
    @method_decorator(csrf_protect)
    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        form.save()
        # Updating the password logs out all other sessions for the user
        # except the current one.
        update_session_auth_hash(self.request, form.user)
        return super().form_valid(form)
#>>>>>>>>>>>>>>>>>>>>>

"""






# PR2018-05-05
@method_decorator([login_required], name='dispatch')
class UserActivatedSuccess(View):

    def get(self, request):
        def get(self, request):
            logger.debug('UserActivatedSuccess get request: ' + str(request))
            return self.render(request)

        def render(self, request):
            usr = request.user
            # TODO I don't think schoolbase is correct PR2018-10-19
            schoolbase = usr.schoolbase

            logger.debug('UserActivatedSuccess render usr: ' + str(usr))

            return render(request, 'country_list.html', {'user': usr, 'schoolbase': schoolbase})


@method_decorator([login_required], name='dispatch')
class UserDeleteView(DeleteView):
    model = User
    success_url = reverse_lazy('user_list_url')



@method_decorator([login_required], name='dispatch')
class UserSettingsUploadView(UpdateView):  # PR2019-10-09

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= UserSettingsUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None:
            # logger.debug('request.POST ' + str(request.POST))

# 1. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'selected_pk': {'selected_customer_pk': 392, 'selected_order_pk': 0}}
                # upload_dict: {'quicksave': {'value': False}}
                for key in upload_dict:
                    new_setting = upload_dict[key]
                    # logger.debug('new_setting: ' + str(new_setting))
                    # key: quicksave --> new_setting: {'value': False}
                    if key == 'selected_pk':
                        settings_dict = Usersetting.get_jsonsetting(key, request.user)
                        # logger.debug('settings_dict: ' + str(settings_dict))
                # new_setting = {'selected_customer_pk': 392, 'selected_order_pk': 0}}
                        for sel_pk in new_setting:
                            sel_value = new_setting[sel_pk]
                            # logger.debug('sel_value: ' + str(sel_value))
                            settings_dict[sel_pk] = sel_value
                    else:
                        # "planning_period":{"datefirst":"2019-10-10","datelast":"2019-12-13"}}
                        settings_dict = upload_dict[key]
                    #logger.debug('key: ' + str(key))
                    #logger.debug('settings_dict: ' + str(settings_dict))
                    # key: quicksave --> settings_dict: {'value': False}

                    # new_setting is in json format, no need for json.loads and json.dumps
                    # new_setting = json.loads(request.POST['setting'])
                    # new_setting_json = json.dumps(new_setting)
                    if settings_dict:
                        logger.debug('key settings_dict: ' + str(key) + str(settings_dict))
                        Usersetting.set_jsonsetting(key, settings_dict, request.user)

# 2. get iddict variables
                # if field in upload_dict:
                    # new_dict = upload_dict.get(field)
                    # saved_dict = Usersetting.get_jsonsetting(key, settings_dict, request.user)
                    # logger.debug('settings_dict ' + str(settings_dict))
                    # settings_dict {'page_employee': {'selected_btn': 'absence'}}
                    # if settings_dict:
                        # key = c.KEY_USER_PAGE_SETTINGS
                        # page = 'pagexx'
                        # new_setting_dict = {}
                        # selected_btn = settings_dict.get('selected_btn')
                        # logger.debug('selected_btn ' + str(selected_btn))

                        # TODO: multiple settings, get saves settingsfirst, then update new setting
                        # new_page_dict = {}
                        #  new_page_dict[page] = {'selected_btn': selected_btn}
                        # logger.debug('new_page_dict ' + str(new_page_dict))

        # c. add update_dict to update_wrap
                        update_wrap['setting'] = {"result": "ok"}
# F. return update_wrap
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))




"""

@method_decorator([login_required], name='dispatch')
class DownloadSubmenusView(View):  # PR2018-12-19
    # function updates Usersettings
    def post(self, request, *args, **kwargs):
        # logger.debug(' ============= DownloadSubmenusView ============= ')
        if request.user is not None:
            for key in request.POST.keys():
                # logger.debug('request.POST[' + str(key) + ']: ' + request.POST[key] + ' type: ' + str(type(request.POST[key])))
                if key == c.KEY_USER_MENU_SELECTED:
                    selected_index = request.POST[key]
                    if Usersetting.objects.filter(
                            user=request.user, code=c.KEY_USER_MENU_SELECTED).exists():
                        setting = Usersetting.objects.filter(
                            user=request.user, code=c.KEY_USER_MENU_SELECTED).first()
                    else:
                        setting = Usersetting(
                            user=request.user, code=c.KEY_USER_MENU_SELECTED)
                    setting.char01 = selected_index
                    setting.save()
                    href = reverse_lazy('import_student_url')
                    caption = _('Import students')
                    item = '<li class="nav-item active"><a class="nav-link" href="/">' + selected_index + ' <span class="sr-only"></span></a></li>'
        submenus = [{'class': 'nav-item active', 'caption': caption, 'href': href},
                    {'class': 'nav-item active', 'caption': _('Subjects'), 'href': href},
                    {'class': 'nav-item active', 'caption': _('Student subjects'), 'href': href},
                    ]
        return render(request, 'includes/menubar_submenu.html', {'submenus': submenus})




class AwpPasswordChangeDoneView(PasswordChangeDoneView):
    template_name = 'registration/password_change_done.html'
    title = _('Password change successful')

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)


class TransactionImportConfirmView(FormView):
    template_name = "import.html"
    form_class = TransactionFormSet
    success_url = reverse_lazy("accounts.transaction.list")

    def get_form_kwargs(self):
        kwargs = super(TransactionImportConfirmView, self).get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs
"""

# ++++ SIGN UP +++++++++++++++++++++++++++++++++++++++ PR2020-04-01

# === SignupView ===================================== PR2020-03-30
class SignupView(View):
    #  SignupView is called when clicked on the 'signup' button in the menu.
    # it returns the signup page
    # if user.is_authenticated: reurn to home page with error message
    def get(self, request):
        logger.debug(' ========== SignupView ===============')
        logger.debug('request: ' + str(request))
        if request.user and request.user.is_authenticated:
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)
            msg_01 = _('You cannot sign up when you are logged in.')
            messages.error(request, msg_01)
            return render(request, 'home.html')
        else:
            return render(request, 'signup.html')


# === SignupUploadView ===================================== PR2020-03-31
class SignupUploadView(View):
    #  SignupUploadView is called when the user has filled in companyname, username and email and clicked on 'Submit'
    #  it returns a HttpResponse, with ok_msg or err-msg
    #  when ok: it also sends an email to the user

    def post(self, request, *args, **kwargs):
        logger.debug('  ')
        logger.debug(' ========== SignupUploadView ===============')

        update_wrap = {}
        err_dict = {}
# - get upload_dict from request.POST
        upload_json = request.POST.get("upload")
        if upload_json:
            upload_dict = json.loads(upload_json)
            logger.debug('upload_dict: ' + str(upload_dict))

# - set language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = f.get_dict_value(upload_dict, ('lang', 'value'), c.LANG_DEFAULT)
            activate(user_lang)

# - check if this company already exists
            has_error = False
            companycode = f.get_dict_value(upload_dict, ('companycode', 'value'))
            msg_err = v.validate_unique_company_code(value=companycode, cur_company_id=None)
            if msg_err:
                err_dict['companycode'] = msg_err
                has_error = True
            # TODO maybe this company is created but not activated, check for it

# - check if this email address already exists
            email = f.get_dict_value(upload_dict, ('email', 'value'))
            msg_err = v.validate_unique_useremail(value=email, cur_user_id=None)
            if msg_err:
                err_dict['email'] = msg_err
                has_error = True

# - get now without timezone
            now_utc_naive = datetime.utcnow()
            now_utc = now_utc_naive.replace(tzinfo=pytz.utc)

# - create new company when no error
            new_company = None
            new_user = None
            if not has_error:
                # check if there is already a not-activated compny with this name. If so: use
                # create new company.
                new_company = m.Company(code=companycode,
                                    name=companycode,
                                    issystem=False,
                                    locked=False,
                                    inactive=False,
                                    activated=False,
                                    timezone=s.TIME_ZONE,
                                    interval=c.TIMEINTERVAL_DEFAULT,
                                    timeformat=c.TIMEFORMAT_24h,
                                    cat=0,
                                    billable=0,
                                    modifiedby=None,
                                    modifiedat=now_utc)
                # Save company. Cannot use company.save(request=request), because there is no user yet: modifiedby=None
                new_company.save()

            if new_company:
                update_wrap['company'] = {'pk': new_company.pk, 'code': new_company.code}
                # no need to check if this username already exists - usernames are unique per company

# -  create new user
                new_username = f.get_dict_value(upload_dict, ('username', 'value'))
                prefixed_username = new_company.companyprefix + new_username
                new_user = am.User(
                    company=new_company,
                    username=prefixed_username,
                    first_name=new_username,
                    email=email,
                    role=c.ROLE_01_COMPANY,
                    permits=c.PERMIT_32_ADMIN,
                    is_active=False,
                    activated=False,
                    lang=user_lang,
                    modifiedby=None,
                    modifiedat=now_utc)
                new_user.save()

            if new_user:
                update_wrap['user'] = {'pk': new_user.pk, 'username': new_user.username}
                current_site = get_current_site(request)

# -  send email 'Activate your account'
                subject = 'Activate your TSA-secure account'
                from_email = 'TSA-secure <noreply@tsasecure.com>'
                message = render_to_string('signup_activation_email.html', {
                    'user': new_user,
                    'domain': current_site.domain,
                    # PR2018-04-24 debug: In Django 2.0 you should call decode() after base64 encoding the uid, to convert it to a string:
                    # 'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                    'uid': urlsafe_base64_encode(force_bytes(new_user.pk)).decode(),
                    'token': account_activation_token.make_token(new_user),
                })
                # PR2018-04-25 arguments: send_mail(subject, message, from_email, recipient_list, fail_silently=False, auth_user=None, auth_password=None, connection=None, html_message=None)
                send_mail(subject, message, from_email, [new_user.email], fail_silently=False)

# - return message 'We have sent an email to user'
                msg_ok_01 = _('Your company and user name are registered successfully.')
                msg_ok_02 = _("We have sent an email to user '%(fld)s' with email address '%(email)s'.") % {'fld': new_user.username_sliced, 'email': new_user.email}
                msg_ok_03 = _('Click the link in that email to verify the email address and create a password.')

                update_wrap['msg_ok'] = {'msg_ok_01': msg_ok_01, 'msg_ok_02': msg_ok_02, 'msg_ok_03': msg_ok_03}

            if err_dict:
                update_wrap['msg_err'] = err_dict

# - return update_wrap
        update_wrap_json = json.dumps(update_wrap, cls=LazyEncoder)
        return HttpResponse(update_wrap_json)
# === end of SignupUploadView =====================================

# Create Advanced User Sign Up View in Django | Step-by-Step  PR2020-03-29
# from https://dev.to/coderasha/create-advanced-user-sign-up-view-in-django-step-by-step-k9m
# from https://simpleisbetterthancomplex.com/tutorial/2017/02/18/how-to-create-user-sign-up-view.html

# === SignupActivateView ===================================== PR2020-04-01
def SignupActivateView(request, uidb64, token):
    logger.debug('  === SignupActivateView =====')
    # logger.debug('request: ' + str(request))

    # SignupActivateView is called when user clicks on link 'Activate your TSA-secure account'
    # it returns the page 'signup_setpassword'
    # when error: it sends err_msg to this page

    activation_token_ok = False
    update_wrap = {'activation_token_ok': activation_token_ok}

# - get user
    try:
        uid = force_text(urlsafe_base64_decode(uidb64))
        user = User.objects.get_or_none(pk=uid)
    except (TypeError, ValueError, OverflowError):
        user = None

    if user is None:
        update_wrap['msg_01'] = _('Sorry, we could not find your account.')
        update_wrap['msg_02'] = _('Your account cannot be activated.')
    else:
        update_wrap['username'] = user.username_sliced
        update_wrap['companyname'] = user.company.code

# - get language from user
        # PR2019-03-15 Debug: language gets lost, get request.user.lang again
        user_lang = user.lang if user.lang else c.LANG_DEFAULT
        activate(user_lang)

# - check activation_token
        activation_token_ok = account_activation_token.check_token(user, token)
        if activation_token_ok:
            update_wrap['activation_token_ok'] = activation_token_ok
            # don't activate user and company until user has submitted valid password
            #update_wrap['uidb64'] = uidb64
        else:
            update_wrap['msg_01'] = _('The link to activate your account is not valid.')
            update_wrap['msg_02'] = _('You cannot activate your account.')

    logger.debug('update_wrap: ' + str(update_wrap))

    if request.method == 'POST':
        logger.debug('request.POST' + str(request.POST))
        form = SetPasswordForm(user, request.POST)

        form_is_valid = form.is_valid()

        non_field_errors = f.get_dict_value(form, ('non_field_errors',))
        field_errors = [(field.label, field.errors) for field in form]
        logger.debug('non_field_errors' + str(non_field_errors))
        logger.debug('field_errors' + str(field_errors))

        if form_is_valid:
            user = form.save()
            update_session_auth_hash(request, user)  # Important!

# - activate company
            company = user.company
            if company:
                # request has no user, add user to request
                request.user = user
                # timezone.now() is timezone aware, based on the USE_TZ setting; datetime.now() is timezone naive. PR2018-06-07
                datetime_activated = timezone.now()
                company.activated = True
                company.activatedat = datetime_activated
                company.save(request=request)  # don't use request=request, request has no user

# - activate user, after he has submitted valid password
                user.is_active = True
                user.activated = True
                user.activatedat = datetime_activated
                user.save()

                #login_user = authenticate(username=user.username, password=password1)
                #login(request, login_user)
                login(request, user)
                logger.debug('user.login' + str(user))
                if request.user:
                    update_wrap['msg_01'] = _("Congratulations.")
                    update_wrap['msg_02'] = _("Your account is succesfully activated.")
                    update_wrap['msg_03'] = _('You are now logged in to TSA-secure.')

# - add bonus to Companyinvoice
         # a. get today in comp_timezone
                # bonus is half year valid. Create date half year from today
                today = f.get_today_dateobj()
                today_plus_halfyear = f.add_months_to_date(today, 6)

                msg = _('Registration bonus')
                bonus = m.Companyinvoice(
                    company=company,
                    cat=c.ENTRY_CAT_02_PAID,
                    entries=c.ENTRY_BONUS_SIGNUP,
                    used=0,
                    balance=c.ENTRY_BONUS_SIGNUP,
                    entryrate=150,
                    datepayment=today,
                    dateexpired=today_plus_halfyear,
                    expired=False,
                    note=msg
                )
                bonus.save(request=request)

    else:
        form = SetPasswordForm(user)

    update_wrap['form'] = form

    # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
    return render(request, 'signup_setpassword.html', update_wrap)
# === end of SignupActivateView =====================================