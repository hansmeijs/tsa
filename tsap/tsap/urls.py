# PR2019-03-01
from django.urls import include, path, re_path
from django.conf.urls import url
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView

from accounts import views as account_views
from companies import views as company_views
from customers import views as customer_views
from employees import views as employee_views

from accounts.forms import CompanyAuthenticationForm

urlpatterns = [

    path('', company_views.home,  name='home'),
    path('admin/', admin.site.urls),

    #path('login', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    #path('login', auth_views.LoginView.as_view(), name='login'),
    path('login', auth_views.LoginView.as_view(authentication_form=CompanyAuthenticationForm), name='login'),



    # url(r'^favicon\.ico$',RedirectView.as_view(url='/static/img/favicon.ico')),
    # path('favicon\.ico',RedirectView.as_view(url='/static/img/favicon.ico')),
    path('favicon\.ico', RedirectView.as_view(url='/static/img/favicon.ico')),


    path('logout', auth_views.LogoutView.as_view(), name='logout'),
# PR2018-03-27
    path('reset',
        auth_views.PasswordResetView.as_view(
            template_name='password_reset.html',
            email_template_name='password_reset_email.html',
            subject_template_name='password_reset_subject.txt'
        ),
        name='password_reset'),
    path('reset/done',
        auth_views.PasswordResetDoneView.as_view(template_name='password_reset_done.html'),
        name='password_reset_done'),
    # PR2019-03-02 from https://github.com/django/django/blob/2.0/django/contrib/auth/urls.py
    path('reset/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(template_name='password_reset_confirm.html'),
         name='password_reset_confirm'),
    path('reset/complete',
         auth_views.PasswordResetCompleteView.as_view(template_name='password_reset_complete.html'),
         name='password_reset_complete'),
    path('settings/password',
         auth_views.PasswordChangeView.as_view(template_name='password_change.html'),
         name='password_change'),
    path('settings/password/done',
         auth_views.PasswordChangeDoneView.as_view(template_name='password_change_done.html'),
         name='password_change_done'),
    # PR201903092 from: https://consideratecode.com/2018/05/02/django-2-0-url-to-path-cheatsheet/
    path('users/<int:pk>/language/<slug:lang>', account_views.UserLanguageView.as_view(),name='language_set_url'),

# PR2018-04-24
    # PR2018-04-24
    url(r'^account_activation_sent/$', account_views.account_activation_sent, name='account_activation_sent_url'),
    # PR2018-10-14
    url(r'^activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        account_views.UserActivate, name='activate_url'),
    url(r'^activate/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        account_views.UserActivateView.as_view(), name='activate_url'),
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
        path('add', account_views.UserAddView.as_view(), name='user_add_url'),
        path('<int:pk>/edit', account_views.UserEditView.as_view(), name='user_edit_url'),
        path('<int:pk>/delete', account_views.UserDeleteView.as_view(), name='user_delete_url'),
    ])),

    path('session_security', include('session_security.urls')),

    path('company/', include([
        path('', company_views.CompanyListView.as_view(), name='company_list_url'),
        path('add/', company_views.CompanyAddView.as_view(), name='company_add_url'),
        path('<int:pk>/selected/', company_views.CompanySelectView.as_view(), name='company_selected_url'),
        path('<int:pk>/edit/', company_views.CompanyEditView.as_view(), name='company_edit_url'),
        path('<int:pk>/delete/', company_views.CompanyDeleteView.as_view(), name='company_delete_url'),
    ])),

    path('customer/', include([
        path('', customer_views.CustomerListView.as_view(), name='customer_list_url'),
        path('add/', customer_views.CustomerAddView.as_view(), name='customer_add_url'),
        path('<int:pk>/', include([
            path('edit/', customer_views.CustomerEditView.as_view(), name='customer_edit_url'),
            path('delete/', customer_views.CustomerDeleteView.as_view(), name='customer_delete_url'),
        ])),
        path('ajax/', include([
            path('upload/', customer_views.CustomerUploadView.as_view(), name='customer_upload_url'),
        ])),
    ])),

    path('employee/', include([
        path('', employee_views.EmployeeListView.as_view(), name='employee_list_url'),
        path('add/', employee_views.EmployeeAddView.as_view(), name='employee_add_url'),
        path('<int:pk>/', include([
            path('edit/', employee_views.EmployeeEditView.as_view(), name='employee_edit_url'),
            path('delete/', employee_views.EmployeeDeleteView.as_view(), name='employee_delete_url'),
        ])),
        path('import', employee_views.EmployeeImportView.as_view(), name='employee_import_url'),
        path('ajax/', include([
            path('upload/', employee_views.EmployeeUploadView.as_view(), name='employee_upload_url'),
            path('uploadsetting', employee_views.EmployeeImportUploadSetting.as_view(),
                 name='employee_uploadsetting_url'),
            path('uploaddata', employee_views.EmployeeImportUploadData.as_view(), name='employee_uploaddata_url'),
        ])),
    ])),

    path('order/', include([
        path('ajax/', include([
            path('uploadsetting', customer_views.OrderImportUploadSetting.as_view(), name='orderimport_uploadsetting_url'),
            path('uploaddata', customer_views.OrderImportUploadData.as_view(), name='orderimport_uploaddata_url'),
        ])),
        path('import', customer_views.OrderImportView.as_view(), name='order_import_url'),



    ])),
]

