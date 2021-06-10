# PR2019-03-01 PR2021-05-15
from django.urls import include, path, re_path
from django.conf.urls import url
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView

from accounts import views as account_views
from companies import views as company_views
from customers import views as customer_views
from employees import views as employee_views
from planning import views as planning_views
from planning import prices as prices_views
from planning import rosterfill as rosterfill_views

from accounts.forms import CompanyAuthenticationForm

from tsap import settings
from tsap import downloads as dl

param = {'headerbar_class': settings.HEADER_CLASS}

urlpatterns = [

    path('', company_views.home,  name='home'),
    #path('admin/', admin.site.urls),

    #path('login', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    #path('login', auth_views.LoginView.as_view(), name='login'),
    path('login', auth_views.LoginView.as_view(authentication_form=CompanyAuthenticationForm, extra_context=param), name='login'),
    # TODO create custom message when user that is not is_active wants to login - PR2020-08-18
    #      now a 'username password not correct' message appears, that is confusing
    # url(r'^favicon\.ico$',RedirectView.as_view(url='/static/img/favicon.ico')),
    # path('favicon\.ico',RedirectView.as_view(url='/static/img/favicon.ico')),
    path('favicon\.ico', RedirectView.as_view(url='/static/img/favicon.ico')),

    path('logout', auth_views.LogoutView.as_view(), name='logout'),
# PR2018-03-27 PR2019-05-22
    path('reset',
         auth_views.PasswordResetView.as_view(
             template_name='password_reset.html',
             # 'Reset your password. Enter your email address and we will send you a link'
             email_template_name='password_reset_email.html',  # 'Hi there, Someone asked for a password reset'
             subject_template_name='password_reset_subject.txt',  # 'Please reset your password
             extra_context=param
         ),
         name='password_reset'),

    path('passwordcreate',
         auth_views.PasswordResetView.as_view(
             template_name='password_create.html',
             # 'Create your password. Enter your email address and we will send you a link'
             email_template_name='password_create_email.html',  # 'Hi there, Someone asked for a password reset'
             subject_template_name='password_create_subject.txt',  # 'Please reset your password
            extra_context = param
         ),
         name='password_create'),

    path('passwordcreate/complete',
         auth_views.PasswordResetCompleteView.as_view(
             template_name='password_create_complete.html', extra_context=param),
         name='password_create_complete'),

    path('passwordcreate/done',
         auth_views.PasswordResetDoneView.as_view(
             template_name='password_create_done.html', extra_context=param),
         name='passwordcreate_done'),

    # PR2019-03-02 from https://github.com/django/django/blob/2.0/django/contrib/auth/urls.py
    path('reset/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(
             template_name='password_reset_confirm.html', extra_context=param),
         name='password_reset_confirm'),
    path('reset/complete',
         auth_views.PasswordResetCompleteView.as_view(
             template_name='password_reset_complete.html', extra_context=param),
         name='password_reset_complete'),
    path('reset/done',
         auth_views.PasswordResetDoneView.as_view(
             template_name='password_reset_done.html', extra_context=param),
         name='password_reset_done'),

    #step 3: user clicked on 'create password' button. Login form opens
    path('settings/password',
         auth_views.PasswordChangeView.as_view(
             template_name='password_change.html', extra_context=param),
         name='password_change'),
    path('settings/password/done',
         auth_views.PasswordChangeDoneView.as_view(template_name='password_change_done.html', extra_context=param),
         name='password_change_done'),
    # PR201903092 from: https://consideratecode.com/2018/05/02/django-2-0-url-to-path-cheatsheet/
    path('users/<int:pk>/language/<slug:lang>', account_views.UserLanguageView.as_view(),name='language_set_url'),

# PR2018-04-24
    # PR2018-04-24
    url(r'^account_activation_sent/$', account_views.account_activation_sent, name='account_activation_sent_url'),
    # PR2018-10-14

    # step 2 in adding user: user has clicked on link in email, form account_activation_success.html opens
    # - user clicks on button 'Create password:
    #

# ++++ SIGN UP +++++++++++++++++++++++++++++++++++++++ PR2020-04-01
    path('signup/', account_views.SignupView.as_view(), name='signup'),
    path('signup_upload/', account_views.SignupUploadView.as_view(), name='signup_upload_url'),
    # dont know yet how to do signup_activate with path PR2020-04-01
    # url(r'^signup_activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
    #     account_views.SignupActivate, name='signup_activate_url'),

    # PR2021-03-24 debug. After upgrading to django 3 this error came up:
    # Reverse for 'signup_activate_url' not found.
    #  from https://www.reddit.com/r/django/comments/jgmbz7/trying_to_resolve_noreversematcherror_for/
    # solved with https://learndjango.com/tutorials/django-password-reset-tutorial
    # solved by changing 'url' with 'path'
    # was:
    # url(r'^signup_activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
    #    account_views.SignupActivateView, name='signup_activate_url'),

    path('signup_activate/<uidb64>/<token>/', account_views.SignupActivateView, name='signup_activate_url'),


    url(r'^activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        account_views.UserActivate, name='activate_url'),

    # UserActivateView doesnt work: goes to login form, user not activated
    #url(r'^activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
    #    account_views.UserActivateView.as_view(), name='activate_url'),

    url(r'^users/(?P<pk>\d+)/activated$', account_views.UserActivatedSuccess.as_view(),
        name='account_activation_success_url'),

    url(r'^users/set-password$',
        auth_views.PasswordResetView.as_view(
            template_name='password_setpassword.html',
            email_template_name='password_reset_email.html',
            subject_template_name='password_reset_subject.txt'
        ),
        name='password_setpassword'),

    # PR2018-04-21 debug: don't forget the .as_view() with brackets in the urlpattern!!!
    path('user/', include([
        path('', account_views.UserListView.as_view(), name='user_list_url'),
        #step 1 in adding user: create user in add form,
        # click on 'create user' submit button:
        # - user is added to table accounts_user, activated=false
        # - mail 'account_activation_email.html' is sent to user with link with account_activation_token
        path('add', account_views.UserAddView.as_view(), name='user_add_url'),
        path('<int:pk>/edit', account_views.UserEditView.as_view(), name='user_edit_url'),
        path('<int:pk>/delete', account_views.UserDeleteView.as_view(), name='user_delete_url'),

        path('user_upload', account_views.UserUploadView.as_view(), name='user_upload_url'),
        path('settings_upload', account_views.UserSettingsUploadView.as_view(), name='settings_upload_url'),

    ])),

    path('session_security', include('session_security.urls')),

# ++++ datalist_download +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    path('datalist_download', dl.DatalistDownloadView.as_view(), name='datalist_download_url'),
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    path('company/', include([
        path('', company_views.CompanyView.as_view(), name='company_url'),
        # path('', company_views.CompanyListView.as_view(), name='company_list_url'),
        path('add/', company_views.CompanyAddView.as_view(), name='company_add_url'),
        path('<int:pk>/selected/', company_views.CompanySelectView.as_view(), name='company_selected_url'),
        path('<int:pk>/edit/', company_views.CompanyEditView.as_view(), name='company_edit_url'),
        path('<int:pk>/delete/', company_views.CompanyDeleteView.as_view(), name='company_delete_url'),

        path('invoiceadd/', company_views.InvoiceAddView.as_view(), name='invoice_add_url'),
    ])),

    path('customer/', include([
        path('customers/', customer_views.CustomerListView.as_view(), name='customer_list_url'),
        path('customer_upload/', customer_views.CustomerUploadView.as_view(), name='customer_upload_url'),
        path('pricerate_upload/', customer_views.PricerateUploadView.as_view(), name='pricerate_upload_url'),
        path('ordernote_upload', customer_views.OrdernoteUploadView.as_view(), name='ordernote_upload_url'),

        path('import', customer_views.OrderImportView.as_view(), name='order_import_url'),
        path('uploadsetting', customer_views.OrderImportUploadSetting.as_view(), name='orderimport_uploadsetting_url'),
        path('uploaddata', customer_views.OrderImportUploadData.as_view(), name='orderimport_uploaddata_url'),
    ])),

    path('employee/', include([
        path('employee', employee_views.EmployeeView.as_view(), name='employee_url'),
        path('employees', employee_views.EmployeeListView.as_view(), name='employee_list_url'),
        path('employee_upload', employee_views.EmployeeUploadView.as_view(), name='employee_upload_url'),
        path('employeenote_upload', employee_views.EmployeenoteUploadView.as_view(), name='employeenote_upload_url'),

        path('teammember_upload', employee_views.TeammemberUploadView.as_view(), name='teammember_upload_url'),

        path('import', employee_views.EmployeeImportView.as_view(), name='employee_import_url'),
        path('uploadsetting', employee_views.EmployeeImportUploadSetting.as_view(), name='employee_uploadsetting_url'),
        path('uploaddata', employee_views.EmployeeImportUploadData.as_view(), name='employee_uploaddata_url'),
    ])),

    path('payroll/', include([
        path('payroll', employee_views.PayrollView.as_view(), name='payroll_url'),
        path('upload', employee_views.PayrollUploadView.as_view(), name='payroll_upload_url'),

        path('correction', employee_views.PayrollCorrectionUploadView.as_view(), name='payroll_correction_url'),
        
        path('publish', employee_views.PublishUploadView.as_view(), name='publish_upload_url'),
        path('import_pdc', employee_views.PayrollImportView.as_view(), name='paydatecode_import_url'),
        path('afas_hours_xlsx', employee_views.PayrollAfasHoursXlsxView.as_view(), name='afas_hours_xlsx_url'),
        path('afas_ehal_xlsx', employee_views.PayrollAfasEhalXlsxView.as_view(), name='afas_ehal_xlsx_url'),

        path('published_xlsx/<list>/', employee_views.PayrollDownloadPublishedHoursXlsxView.as_view(), name='payrollpublished_xlsx_url'),
    ])),

    path('planning/', include([
        path('schemes', planning_views.SchemesView.as_view(), name='schemes_url'),
        # path('scheme_upload', planning_views.SchemeUploadView.as_view(), name='scheme_upload_url'),
        # PR2021-05-26 NIU: path('schemeitem_download', planning_views.SchemeitemDownloadView.as_view(), name='schemeitems_download_url'),
        path('schemeitem_upload', planning_views.SchemeItemUploadView.as_view(), name='schemeitem_upload_url'),
        path('schemeitem_fill', planning_views.SchemeitemFillView.as_view(), name='schemeitem_fill_url'),
        path('schemeorshiftorteam_upload', planning_views.SchemeOrShiftOrTeamUploadView.as_view(), name='schemeorshiftorteam_upload_url'),

        path('scheme_template_upload', planning_views.SchemeTemplateUploadView.as_view(), name='scheme_template_upload_url'),
        path('grid_upload', planning_views.GridUploadView.as_view(), name='grid_upload_url'),

        path('prices_upload', prices_views.PricesUploadView.as_view(), name='prices_upload_url'),

    ])),
    path('roster/', include([
        path('view', planning_views.RosterView.as_view(), name='roster_url'),
        path('emplhour_download', planning_views.EmplhourDownloadView.as_view(), name='emplhour_download_url'),
        path('emplhour_upload', planning_views.EmplhourUploadView.as_view(), name='emplhour_upload_url'),
        path('emplhournote_upload', planning_views.EmplhournoteUploadView.as_view(), name='emplhournote_upload_url'),
        path('emplhourallowance_upload', planning_views.EmplhourallowanceUploadView.as_view(), name='emplhourallowance_upload_url'),
    ])),

    path('review/', include([
        path('view', planning_views.ReviewView.as_view(), name='review_url'),
        path('fill', rosterfill_views.FillRosterdateView.as_view(), name='emplhour_fill_rosterdate_url'),

        path('afas_invoice_xlsx/<list>/', employee_views.ReviewlAfasInvoiceXlsxView.as_view(), name='afas_invoice_xlsx_url'),
    ])),
]
