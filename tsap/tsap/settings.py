# PR2019-02-28
import os
from decouple import config, Csv  # PR2019-02-28
from django.utils.translation import ugettext_lazy as _  # PR2019-02-28
import dj_database_url  # PR2018-04-29

# PR2018-05-06 from https://simpleisbetterthancomplex.com/tips/2016/09/06/django-tip-14-messages-framework.html
from django.contrib.messages import constants as messages

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
#SECRET_KEY = '$vso04^%s-s6#t-r8mj&a^sc!f08kga4wx!0vt-e7_z&r06=cb'
SECRET_KEY = config('SECRET_KEY')  # PR2019-02-28

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool) # PR2019-02-28

LOGGING_HIDE = config('LOGGING_HIDE', default='WARNING') # PR2021-01-09 sets level of loggers that must be showed
# PR 2021-03-21 logger only saves when LOGGING_ON = True
LOGGING_ON = config('LOGGING_ON', default=False, cast=bool)
# PR 2021-07-06 roster page only checks for updates when SKIP_CHECK_UPDATES = False
SKIP_CHECK_UPDATES = config('SKIP_CHECK_UPDATES', default=False, cast=bool)

# ALLOWED_HOSTS =
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())  # PR2019-02-28

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'widget_tweaks',  # PR2019-03-13 removed PR2019-04-07 added again in signup_setpassword
    'crispy_forms', # PR2019-03-13 added

# PR2019-02-28
    'accounts',
    'companies',
    'customers',
    'employees',
    'planning',
    'tsap',

    'session_security',  # PR2019-02-28
    'anymail',  # PR2019-02-28
]
CRISPY_TEMPLATE_PACK = 'bootstrap4'  # PR2019-03-13 added

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',  # PR2019-02-28
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'session_security.middleware.SessionSecurityMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',  # PR2019-02-28
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'tsap.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'templates'),
            os.path.join(BASE_DIR, 'templates/accounts'),
            os.path.join(BASE_DIR, 'templates/companies'),
            os.path.join(BASE_DIR, 'templates/customers'),
            os.path.join(BASE_DIR, 'templates/employees'),
            os.path.join(BASE_DIR, 'templates/planning'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# PR2018-05-08 for django-simple-menu from http://django-simple-menu.readthedocs.io/en/latest/installation.html
TEMPLATE_CONTEXT_PROCESSORS = (
    "django.contrib.auth.context_processors.auth",
    "django.core.context_processors.debug",
    "django.core.context_processors.request",
    "django.core.context_processors.i18n",
    "django.core.context_processors.media",
    "django.core.context_processors.static",
    "django.core.context_processors.tz",
)

WSGI_APPLICATION = 'tsap.wsgi.application'

# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases

# PR2019-02-28 PostgresQL
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL')
    )
}


# Password validation
# https://docs.djangoproject.com/en/2.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

AUTH_USER_MODEL = 'accounts.User'  # PR2019-02-28

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/

STATIC_URL = '/static/'

# PR2018-03-03 Error: the STATICFILES_DIRS setting should not contain the STATIC_ROOT setting.
# PR2018-03-06 The STATICFILES_DIRS tells Django where to look for static files that are not tied to a particular app.
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
# PR 2018-03-06 STATIC_ROOT is the folder where all static files will be stored after a manage.py collectstatic.
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# cache busting PR2019-11-17
# PR2020-10-30 cache busting not working. put date at end of fileneame instead.
# PR2019-11-17 from https://docs.djangoproject.com/en/2.2/ref/contrib/staticfiles/#manifeststaticfilesstorage
# and https://blog.xoxzo.com/en/2018/08/22/cache-busting-in-django/
# STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

STATICFILES_STORAGE = config('STATICFILES_STORAGE', default='django.contrib.staticfiles.storage.StaticFilesStorage')

#
# PR2021-01-11 NOT IN USE, gave errors, use SimpleBackup instead
# added for djang-dbbackup, also add in .env
#DBBACKUP_STORAGE = 'django.core.files.storage.FileSystemStorage'
#DBBACKUP_STORAGE_OPTIONS = {'location': os.path.join(BASE_DIR, 'backups')} # path backups: C:\dev\tsa\tsap\backups

# PR2021-05-15 aws storage added from awpr
# PR2021-03-07 https://www.ordinarycoders.com/blog/article/serve-django-static-and-media-files-in-production
# Note: must comment out the original STATIC_URL and STATICFILES_DIRS.

# PR2021-03-06 from https://www.digitalocean.com/community/tutorials/how-to-set-up-object-storage-with-django
# SECURITY WARNING: keep the access key used in production secret!
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
AWS_S3_ENDPOINT_URL = config('AWS_S3_ENDPOINT_URL')
AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400',}
# AWS_LOCATION = config('AWS_LOCATION')

# from Vitor de Freitas, used in storage_backends.py
# AWS_STATIC_LOCATION = config('AWS_STATIC_LOCATION')
# AWS_PUBLIC_MEDIA_LOCATION = config('AWS_PUBLIC_MEDIA_LOCATION')
AWS_PRIVATE_MEDIA_LOCATION = config('AWS_PRIVATE_MEDIA_LOCATION')

#STATIC_URL = 'https://%s/%s/' % (AWS_S3_ENDPOINT_URL, AWS_LOCATION)
# PR2021-03-08 from https://simpleisbetterthancomplex.com/tutorial/2017/08/01/how-to-setup-amazon-s3-in-a-django-project.html
# from Vitor de Freitas: STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# DEFAULT_FILE_STORAGE = 'awpr.storage_backends.MediaStorage'  # <-- here is where we reference it

# PR2021-03-08 from the docs https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html
#STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
AWS_S3_REGION_NAME = 'nyc3'



# PR 2018-03-27
LOGIN_URL = 'login'
# PR 2018-03-20
# LOGIN_REDIRECT_URL = 'home'
LOGIN_REDIRECT_URL = 'home' # PR 2019-03-02

# PR 2018-03-19
LOGOUT_REDIRECT_URL = 'home'

# In global.settings.py: PR2018-07-30
# The number of days a password reset link is valid for
# changed to 7 days PR2020-08-15
PASSWORD_RESET_TIMEOUT_DAYS = 7

# was: PR 2018-03-27  EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# PR 2018-12-28
EMAIL_BACKEND = config('EMAIL_BACKEND', default='')
ANYMAIL = {
    'MAILGUN_API_KEY': config('MAILGUN_API_KEY', default=''),
    'MAILGUN_SENDER_DOMAIN': config('MAILGUN_SENDER_DOMAIN', default=''),
}
DEFAULT_FROM_EMAIL = 'TSA secure <noreply@tsasecure.com>'

TIME_ZONE = 'America/Curacao'
# TIME_ZONE = 'Europe/Amsterdam'

USE_I18N = True
USE_L10N = True
USE_TZ = True

from django.conf.locale.en import formats as en_formats
from django.conf.locale.nl import formats as nl_formats
en_formats.DATE_FORMAT = "M j, Y"
nl_formats.DATE_FORMAT = "j b Y"

en_formats.DATETIME_FORMAT = "M j, Y, h:i A"
nl_formats.DATETIME_FORMAT = "j b Y, H.i"


# PR 2018-04-28 from https://medium.com/@nolanphillips/a-short-intro-to-translating-your-site-with-django-1-8-343ea839c89b
# Add LocaleMiddleware to MIDDLEWARE, it checks the incoming request for the user's preferred language settings.
# Add the LocaleMiddleware after SessionMiddleware and CacheMiddleware, and before the CommonMiddleware.
# Provide a lists of languages which your site supports.
LANGUAGES = (
    ('en', _('English')),
    ('nl', _('Dutch')),
)

# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

# Set the default language for your site.
LANGUAGE_CODE = 'nl'

HEADER_CLASS = config('HEADER_CLASS', default='headerbar') # PR2021-02-17 sets color of header for production or test environment

# Tell Django where the project's translation files should be.
LOCALE_PATHS = (
    os.path.join(BASE_DIR, 'locale'),
)


LOGGING = {
    'version': 1,
    #'disable_existing_loggers': False,
    'disable_existing_loggers': True,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'formatters': {
        'simple': {
            'format': '[%(asctime)s] %(levelname)s %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
        'verbose': {
            #'format': '[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s',
            'format': '[%(asctime)s %(name)s:%(lineno)d] %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
    },
    'handlers': {
        'accounts_log': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': config('LOGGER_BASEDIR') + 'accounts.log',
            'formatter': 'verbose'
        },
        'companies_log': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': config('LOGGER_BASEDIR') + 'companies.log',
            'formatter': 'verbose'
        },
        'customers_log': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': config('LOGGER_BASEDIR') + 'customers.log',
            'formatter': 'verbose'
        },
        'employee_log': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': config('LOGGER_BASEDIR') + 'employees.log',
            'formatter': 'verbose'
        },
        'planning_log': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': config('LOGGER_BASEDIR') + 'planning.log',
            'formatter': 'verbose'
        },
        'tsap_log': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': config('LOGGER_BASEDIR') + 'tsap.log',
            'formatter': 'verbose'
        },
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
        },
        'null': {
            'class': 'logging.NullHandler',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.db.backends': {'level': 'DEBUG',},
        'django': {'handlers': ['console'],},
        'django.request': {'handlers': ['mail_admins'], 'level': 'ERROR', 'propagate': False},
        'django.security': {'handlers': ['mail_admins'], 'level': 'ERROR', 'propagate': False},
        'py.warnings': {'handlers': ['console'],},
        'accounts': {'handlers': ['accounts_log'], 'level': 'DEBUG', 'propagate': True},
        'companies': {'handlers': ['companies_log'], 'level': 'DEBUG', 'propagate': True},
        'customers': {'handlers': ['customers_log'], 'level': 'DEBUG', 'propagate': True},
        'employees': {'handlers': ['employee_log'], 'level': 'DEBUG', 'propagate': True},
        'planning': {'handlers': ['planning_log'], 'level': 'DEBUG', 'propagate': True},
        'tsap': {'handlers': ['tsap_log'], 'level': 'DEBUG', 'propagate': True},
    }
}

# PR2018-05-06 from https://simpleisbetterthancomplex.com/tips/2016/09/06/django-tip-14-messages-framework.html
MESSAGE_TAGS = {
    messages.DEBUG: 'alert-info',
    messages.INFO: 'alert-info',
    messages.SUCCESS: 'alert-success',
    messages.WARNING: 'alert-warning',
    messages.ERROR: 'alert-danger',
}

# PR2018-05-10
SESSION_EXPIRE_AT_BROWSER_CLOSE=True
SESSION_SECURITY_WARN_AFTER = 3200 # Time (in seconds) before the user should be warned. Default 540.
SESSION_SECURITY_EXPIRE_AFTER = 3600 # Time (in seconds) before the user should be logged out. Default is 600.