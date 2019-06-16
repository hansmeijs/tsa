# PR2019-02-28
from datetime import date
from django.utils.translation import ugettext_lazy as _

USERNAME_MAX_LENGTH = 30
USERNAME_SLICED_MAX_LENGTH = 24
CODE_MAX_LENGTH = 15
NAME_MAX_LENGTH = 80

BASE_DATE = date(1899, 12, 31)

# PR2019-02-28
ROLE_00_EMPLOYEE = 0
ROLE_01_COMPANY = 1
ROLE_02_SYSTEM = 2

CHOICES_ROLE = (
    (ROLE_00_EMPLOYEE, _('Employee')),
    (ROLE_01_COMPANY, _('Company')),
    (ROLE_02_SYSTEM, _('System'))
)

CHOICES_ROLE_DICT = {
    ROLE_00_EMPLOYEE: _('Employee'),
    ROLE_01_COMPANY: _('Company'),
    ROLE_02_SYSTEM: _('System')
}

# PR2019-02-28
PERMIT_00_NONE = 0
PERMIT_01_READ = 1
PERMIT_02_WRITE = 2
PERMIT_04_AUTH = 4
PERMIT_08_ADMIN = 8

# PR2018-12-23 used in set_menu_items
PERMIT_STR_00_NONE = 'none'
PERMIT_STR_01_READ = 'read'
PERMIT_STR_02_WRITE = 'write'
PERMIT_STR_04_AUTH = 'auth'
PERMIT_STR_08_ADMIN = 'admin'
PERMIT_STR_15_ALL = 'all'

PERMIT_DICT = {
    PERMIT_00_NONE: PERMIT_STR_00_NONE,
    PERMIT_01_READ: PERMIT_STR_01_READ,
    PERMIT_02_WRITE: PERMIT_STR_02_WRITE,
    PERMIT_04_AUTH: PERMIT_STR_04_AUTH,
    PERMIT_08_ADMIN: PERMIT_STR_08_ADMIN
}

IS_ACTIVE_DICT = {  # PR2019-02-28
    0: _('Inactive'),
    1: _('Active')
}

# choises must be tuple or list, dictionary gives error: 'int' object is not iterable
IS_ACTIVE_CHOICES = (
    (0, _('Inactive')),
    (1, _('Active'))
)

# PR2019-02-28
FIELDTYPE_00_TEXT = 0


GENDER_NONE = '-'  # PR2018-09-05
GENDER_MALE = 'M'
GENDER_FEMALE = 'V'

# PR2018-09-05
GENDER_CHOICES = (
    (GENDER_NONE, '-'),
    (GENDER_MALE, _('M')),
    (GENDER_FEMALE, _('V')),
)


# SCHOOL SETTING KEYS PR2019-03-09
KEY_CUSTOMER_MAPPED_COLDEFS = "cust_mapped_coldefs"
KEY_EMPLOYEE_MAPPED_COLDEFS = "empl_mapped_coldefs"

#PR2019-03-23
MONTHS_ABBREV = {'en': ('', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'),
             'nl': ('', 'jan', 'feb', 'mrt', 'apr', 'mei', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec')
             }

#PR2019-04-13
WEEKDAYS_ABBREV = {'en': ('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'),
             'nl': ('zo', 'ma', 'di', 'wo', 'do', 'vr', 'za')
             }

#PR2019-04-14
TIMEFORMATS = ('24h', 'AmPm')

#PR2019-04-14
TIMEINTERVALS = (1, 5, 10, 15, 20, 30, 60)


# PR2019-04-21
WEEKEND_CHOICES = {'en': ('also on weekends', 'only on weekends', 'not on weekends'),
             'nl': ('ook in het weekeinde', 'alleen in het weekeinde', 'niet in het weekeinde')}

# PR2019-04-21
PUBLICHOLIDAY_CHOICES = {'en': ('also on public holidays', 'only on public holidays', 'not on public holidays'),
             'nl': ('ook op feestdagen', 'alleen op feestdagen', 'niet op feestdagen')}

STATUS_EMPLHOUR_00_NONE = 0
STATUS_EMPLHOUR_01_CREATED = 1
STATUS_EMPLHOUR_02_START_CHECKED = 2
STATUS_EMPLHOUR_03_END_CHECKED = 3
STATUS_EMPLHOUR_04_ALL_CHECKED = 4
STATUS_EMPLHOUR_05_APPROVED = 5

KEY_COMP_NEXT_ROSTERDATE_FILL = 'rstdte_fillnext'