# PR2019-02-28
from datetime import date
from django.utils.translation import ugettext_lazy as _

USERNAME_MAX_LENGTH = 30
USERNAME_SLICED_MAX_LENGTH = 24
CODE_MAX_LENGTH = 24  # number is also hardcoded in _()
NAME_MAX_LENGTH = 80  # number is also hardcoded in _()

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

# PR2019-07-30
PERMIT_00_NONE = 0
PERMIT_01_READ = 1
PERMIT_02_EMPLOYEE = 2
PERMIT_04_CONTROL = 4
PERMIT_08_PLAN = 8
PERMIT_16_AUDIT = 16
PERMIT_32_ADMIN = 32


# PR2018-12-23 used in set_menu_items
PERMIT_TXT_00_NONE = _('None')
PERMIT_TXT_01_READ = _('Read only')
PERMIT_TXT_02_EMPLOYEE = _('Employee')
PERMIT_TXT_04_CONTROL = _('Controller')
PERMIT_TXT_08_PLAN = _('Planner')
PERMIT_TXT_16_AUDIT = _('Auditor')
PERMIT_TXT_32_ADMIN = _('Administrator')

PERMIT_DICT = {
    PERMIT_00_NONE: PERMIT_TXT_00_NONE,
    PERMIT_01_READ: PERMIT_TXT_01_READ,
    PERMIT_02_EMPLOYEE: PERMIT_TXT_02_EMPLOYEE,
    PERMIT_04_CONTROL: PERMIT_TXT_04_CONTROL,
    PERMIT_08_PLAN: PERMIT_TXT_08_PLAN,
    PERMIT_16_AUDIT: PERMIT_TXT_16_AUDIT,
    PERMIT_32_ADMIN: PERMIT_TXT_32_ADMIN
}

PERMIT_CHOICES = [
    (PERMIT_01_READ, PERMIT_TXT_01_READ),
    (PERMIT_02_EMPLOYEE, PERMIT_TXT_02_EMPLOYEE),
    (PERMIT_04_CONTROL, PERMIT_TXT_04_CONTROL),
    (PERMIT_08_PLAN, PERMIT_TXT_08_PLAN),
    (PERMIT_16_AUDIT, PERMIT_TXT_16_AUDIT),
    (PERMIT_32_ADMIN, PERMIT_TXT_32_ADMIN)
]


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
KEY_CUSTOMER_COLDEFS = "cust_coldefs"
KEY_EMPLOYEE_COLDEFS = "empl_coldefs"


LANG_NL = 'nl'
LANG_EN = 'en'

LANG_DEFAULT = LANG_NL

#PR2019-03-23
MONTHS_ABBREV = {LANG_EN: ('', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'),
             LANG_NL: ('', 'jan', 'feb', 'mrt', 'apr', 'mei', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec')
             }
MONTHS_LONG = {LANG_EN: ('', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'),
             LANG_NL: ('', 'januari', 'februari', 'maart', 'april', 'mei', 'juni',
                       'juli', 'augustus', 'september', 'oktober', 'november', 'december')
             }
#PR2019-04-13
WEEKDAYS_ABBREV = {LANG_EN: ('', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'),
             LANG_NL: ('', 'ma', 'di', 'wo', 'do', 'vr', 'za', 'zo')
             }
WEEKDAYS_LONG = {LANG_EN: ('', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
             LANG_NL: ('', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag')
             }

#PR2019-07-23
TIMEFORMAT_24h = '24h'
TIMEFORMAT_AmPm = 'AmPm'

TIMEFORMATS = (TIMEFORMAT_24h, TIMEFORMAT_AmPm)

TIMEFORMAT_CHOICES = (
    (TIMEFORMAT_24h, _('24 h')),
    (TIMEFORMAT_AmPm, _('AM - PM')),
)

#PR2019-04-14
TIMEINTERVALS = (1, 5, 10, 15, 20, 30, 60)
TIMEINTERVAL_DEFAULT = 5

# PR2019-04-21
WEEKEND_CHOICES = {LANG_EN: ('also on weekends', 'only on weekends', 'not on weekends'),
                   LANG_NL: ('ook in het weekeinde', 'alleen in het weekeinde', 'niet in het weekeinde')}

# PR2019-04-21
PUBLICHOLIDAY_CHOICES = {LANG_EN: ('also on public holidays', 'only on public holidays', 'not on public holidays'),
                         LANG_NL: ('ook op feestdagen', 'alleen op feestdagen', 'niet op feestdagen')}

# PR2019-08-17
# order cat = # 00 = normal, 10 = internal, 20 = rest, 30 = absence, 90 = template

STATUS_00_NONE = 0
STATUS_01_CREATED = 1
STATUS_02_START_CONFIRMED = 2
STATUS_04_END_CONFIRMED = 4
STATUS_08_LOCKED = 8
STATUS_16_QUESTION = 16
STATUS_32_REJECTED = 32
STATUS_64_APPROVED = 64

# shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacemenet, 512=absence, 1024=rest, 4096=template
SHIFT_CAT_0000_NORMAL = 0
SHIFT_CAT_0001_INTERNAL = 1
SHIFT_CAT_0002_BILLABLE_OVERRIDE = 2
SHIFT_CAT_0004_BILLABLE = 4
# SHIFT_CAT_0008_AVAILABLE = 8
SHIFT_CAT_0016_UNASSIGNED = 16
SHIFT_CAT_0032_REPLACEMENT = 32  #  (cat_replacement not in use in table order)
# SHIFT_CAT_0064_AVAILABLE = 64
# SHIFT_CAT_0128_AVAILABLE = 128
# SHIFT_CAT_0256_AVAILABLE = 256
SHIFT_CAT_0512_ABSENCE = 512 # used in table customer, order, scheme , orderhour,  emplhour)
# SHIFT_CAT_1024_RESTSHIFT = 1024
# SHIFT_CAT_2048_AVAILABLE = 2048
# SHIFT_CAT_4096_TEMPLATE = 4096
# SHIFT_CAT_8192_AVAILABLE = 8192
# SHIFT_CAT_16384_AVAILABLE = 16384


# 0 = normal, 10 = replacement
TEAMMEMBER_CAT_00_NORMAL = 0
TEAMMEMBER_CAT_10_REPLACEMENT = 10
TEAMMEMBER_CAT_0512_ABSENCE = 512

#PR2019-08-05 # 0 = grace-entry, 1 = bonus-entries, 2 = paid-entries
ENTRY_CAT_00_GRACE = 0
ENTRY_CAT_01_BONUS = 1
ENTRY_CAT_02_PAID = 2

# PR2018-09-05
ENTRY_CAT_CHOICES = (
    (ENTRY_CAT_00_GRACE, 'Grace'),
    (ENTRY_CAT_01_BONUS, _('Bonus')),
    (ENTRY_CAT_02_PAID, _('Paid')),
)

REPLACEMENT_PERIOD_DEFAULT = 14 # days

# PR2019-10-160
EMPLOYEE_TEXT = {LANG_EN: 'Employee', LANG_NL: 'Medewerker'}

# PR2019-07-20
TEMPLATE_TEXT = {LANG_EN: 'Template', LANG_NL: 'Sjabloon'}
REST_TEXT = {LANG_EN: 'Rest', LANG_NL: 'Rust'}

# PR2019-06-24
ABSENCE = {
    LANG_EN: ('Absence', 'Absence'),
    LANG_NL: ('Afwezig', 'Absentie')
          }

# PR2019-06-24  PR2019-09-26  fields: sequence, code, name, pricerate. pricerate=1 means default category
ABSENCE_CATEGORY = {LANG_EN: (
                        ('0', 'Unknown', 'Unknown', '1'),
                        ('1', 'Sick', 'Sick leave', '0'),
                        ('2', 'Special leave', 'Special leave', '0'),
                        ('3', 'Vacation', 'Vacation leave', '0'),
                        ('4', 'Unpaid leave', 'Unpaid leave', '0'),
                        ('5', 'Unauthorized', 'Unauthorized absence', '0')),
                    LANG_NL: (
                        ('0', 'Onbekend', 'Onbekend', '1'),
                        ('1', 'Ziek', 'Ziekte', '0'),
                        ('2', 'Buitengewoon', 'Buitengewoon verlof', '0'),
                        ('3', 'Vakantie', 'Vakantie', '0'),
                        ('4', 'Onbetaald', 'Onbetaald verlof', '0'),
                        ('5', 'Ongeoorloofd', 'Ongeoorloofd verzuim', '0'))
                    }


KEY_COMP_REPLACEMENT_PERIOD = 'repl_period' # # this period is rosterdate_min till rosterdate_min + REPLACEMENT_PERIOD_DEFAULT (days)
KEY_COMP_ALIAS = 'alias'

KEY_USER_QUICKSAVE = 'quicksave'
# used to saved period setting of each page sepeartely PR2019-11-15
KEY_USER_PERIOD_EMPLHOUR = 'period_emplhour'
KEY_USER_PERIOD_ROSTER = 'period_roster'
KEY_USER_PERIOD_REVIEW = 'period_review'
KEY_USER_SETTINGS = ('selected_pk', 'page_employee', 'page_customer', 'planning_period', 'quicksave')
# code, cycle, excludeweekend, excludepublicholiday PR2019-08-24
SCHEME_24H_DEFAULT = {LANG_EN: ('24 hours 16 days', 16, False, False),
                      LANG_NL: ('24 uur 16 daags', 16, False, False)}

# code, offsetstart, offsetend, breakduration, successor_index PR2019-08-24
SHIFT_24H_DEFAULT = {LANG_EN: (
                        ('night shift', '-1;22;0', '', 0, 1),
                        ('day shift', '0;7;0', '', 0, 2),
                        ('evening shift', '0;15;0', '', 0, 0)),
                    LANG_NL: (
                        ('nachtdienst', '-1;22;0', '', 0, 1),
                        ('dagdienst', '0;7;0', '', 0, 2),
                        ('avonddienst', '0;15;0', '', 0, 0))
                    }
TEAM_24H_DEFAULT = {LANG_EN: ('Employee 1', 'Employee 2', 'Employee 3', 'Employee 4'),
                    LANG_NL: ('Medewerker 1', 'Medewerker 2', 'Medewerker 3', 'Medewerker 4')
                    }
SCHEMEITEM_24H_DEFAULT = ((1, 0, 0), (1, 1, 1), (1, 2, 2),  # 0 = cycleday, 1 = shift, 2 = team
                      (2, 0, 0), (2, 1, 1), (2, 2, 3),
                      (3, 0, 0), (3, 1, 2), (3, 2, 3),
                      (4, 0, 0), (4, 1, 2), (4, 2, 3),
                      (5, 0, 1), (5, 1, 2), (5, 2, 3),
                      (6, 0, 1), (6, 1, 2), (6, 2, 0),
                      (7, 0, 1), (7, 1, 3), (7, 2, 0),
                      (8, 0, 1), (8, 1, 3), (8, 2, 0),
                      (9, 0, 2), (9, 1, 3), (9, 2, 0),
                      (10, 0, 2), (10, 1, 3), (10, 2, 1),
                      (11, 0, 2), (11, 1, 0), (11, 2, 1),
                      (12, 0, 2), (12, 1, 0), (12, 2, 1),
                      (13, 0, 3), (13, 1, 0), (13, 2, 1),
                      (14, 0, 3), (14, 1, 0), (14, 2, 2),
                      (15, 0, 3), (15, 1, 1), (15, 2, 2),
                      (16, 0, 3), (16, 1, 1), (16, 2, 2))

# LOCALE #

COLDEF_EMPLOYEE = {LANG_EN: [
                                {'tsaKey': 'code', 'caption': 'Short name'},
                                {'tsaKey': 'namelast', 'caption': 'Last name'},
                                {'tsaKey': 'namefirst', 'caption': 'First name'},
                                {'tsaKey': 'identifier', 'caption': 'Identity number'},
                                {'tsaKey': 'email', 'caption': 'Email address'},
                                {'tsaKey': 'tel', 'caption': 'Telephone'},
                                {'tsaKey': 'datefirst', 'caption': 'First date in service'},
                                {'tsaKey': 'datelast', 'caption': 'Last date in service'},
                                {'tsaKey': 'workhours', 'caption': 'Working hours per week'},
                                {'tsaKey': 'workdays', 'caption': 'Working days per week'},
                                {'tsaKey': 'leavedays', 'caption': 'Vacation days per year'},
                                {'tsaKey': 'payrollcode', 'caption': 'Payroll code'}
                                # {'tsaKey': 'wagecode', 'caption': 'Wage code'}
                            ],
                    LANG_NL: [
                                {'tsaKey': 'code', 'caption': 'Korte naam'},
                                {'tsaKey': 'namelast', 'caption': 'Achternaam'},
                                {'tsaKey': 'namefirst', 'caption': 'Voornaam'},
                                {'tsaKey': 'identifier', 'caption': 'Identiteitsnummer'},
                                {'tsaKey': 'email', 'caption': 'E-mail adres'},
                                {'tsaKey': 'tel', 'caption': 'Telefoon'},
                                {'tsaKey': 'datefirst', 'caption': 'Begindatum in dienst'},
                                {'tsaKey': 'datelast', 'caption': 'Einddatum in dienst'},
                                {'tsaKey': 'workhours', 'caption': 'Uren in dienst per week'},
                                {'tsaKey': 'workdays', 'caption': 'Dagen in dienst per week'},
                                {'tsaKey': 'leavedays', 'caption': 'Vakantiedagen per jaar'},
                                {'tsaKey': 'payrollcode', 'caption': 'Code loonadministratie'}
                               #  {'tsaKey': 'wagecode', 'caption': 'Looncode'}
                            ]
                    }

CAPTION_EMPLOYEE = {LANG_EN: {'no_file': 'No file is currently selected',
                                 'link_columns': 'Link columns',
                                 'click_items': 'Click items to link or unlink columns',
                                 'excel_columns': 'Excel columns',
                                 'tsa_columns': 'TSA columns',
                                 'linked_columns': 'Linked columns'},
                    LANG_NL: {'no_file': 'Er is geen bestand geselecteerd',
                                 'link_columns': 'Koppel kolommen',
                                 'click_items': 'Klik op namen om kolommen te koppelen of ontkoppelen',
                                 'excel_columns': 'Excel kolommen',
                                 'tsa_columns': 'TSA kolommen',
                                 'linked_columns': 'Gekoppelde kolommen'}
                    }

FIELDS_COMPANY = ('id', 'code', 'name')

FIELDS_CUSTOMER = ('id', 'company', 'cat', 'isabsence', 'code', 'name', 'identifier',
                    'contactname', 'address', 'zipcode', 'city', 'country',
                   'email', 'telephone', 'interval', 'inactive')

FIELDS_ORDER = ('id', 'customer', 'cat', 'isabsence', 'billable', 'code', 'name', 'datefirst', 'datelast',
                'contactname', 'address', 'zipcode', 'city', 'country',
                'sequence', 'identifier', 'billable', 'priceratejson', 'invoicedates', 'taxcode', 'locked', 'inactive')

FIELDS_ORDERHOUR = ('id', 'order', 'schemeitem', 'rosterdate', 'cat',
                    'yearindex', 'monthindex', 'weekindex', 'payperiodindex',
                    'isbillable', 'isrestshift', 'shift', 'duration', 'status',
                    'pricerate', 'additionrate', 'taxrate', 'amount', 'tax', 'locked')

FIELDS_EMPLHOUR = ('id', 'orderhour', 'employee', 'rosterdate', 'cat', 'isabsence',
                   'yearindex', 'monthindex', 'weekindex', 'payperiodindex',
                   'isrestshift', 'shift',
                   'timestart', 'timeend', 'timeduration', 'breakduration', 'plannedduration',
                   'wagerate', 'wagefactor', 'wage', 'pricerate', 'pricerate',
                   'status', 'overlap', 'locked')

FIELDS_SCHEME = ('id', 'order', 'cat', 'code', 'datefirst', 'datelast',
                 'cycle', 'billable', 'excludeweekend', 'excludepublicholiday',
                 'priceratejson', 'additionjson', 'inactive')

FIELDS_TEAM = ('id', 'scheme', 'cat', 'code')

FIELDS_SHIFT = ('id', 'scheme', 'code', 'cat', 'isrestshift', 'billable',
                'offsetstart', 'offsetend', 'breakduration', 'wagefactor', 'priceratejson', 'additionjson')

FIELDS_SCHEMEITEM = ('id', 'scheme', 'shift', 'team', 'cat', 'billable',
                     'rosterdate', 'iscyclestart', 'timestart', 'timeend', 'timeduration',
                     'priceratejson', 'additionjson', 'inactive')
# inactive schemeitem needed to skip certain shifts (when customer provides his own people)

FIELDS_EMPLOYEE = ('id', 'company', 'code', 'datefirst', 'datelast',
                   'namelast', 'namefirst', 'email', 'telephone', 'identifier',
                   'address', 'zipcode', 'city', 'country',
                   'payrollcode', 'wagerate', 'wagecode', 'workhours', 'workdays', 'leavedays',
                   'priceratejson', 'additionjson', 'inactive', 'locked')


WORKHOURS_DEFAULT = 2400   # working hours per week * 60, unit is minute, default is 40 hours per week = 2.400 minutes
WORKDAYS_DEFAULT = 7200  # workdays per week * 1440, unit is minute (one day has 1440 minutes) , default is 5 days per week = 7200 minutes
LEAVEDAYS_DEFAULT = 21600  # leavedays per year, = 15 days * 1440 = 21.600 minutes

# workhours_per_day_minutes = workhours_minutes / workdays_minutes * 1440

FIELDS_TEAMMEMBER = ('id', 'team', 'cat', 'isabsence', 'employee', 'datefirst', 'datelast',
                     'workhoursperday', 'wagerate', 'wagefactor',
                     'offsetstart', 'offsetend',
                     'priceratejson', 'additionjson', 'override', 'jsonsetting')
# teammember wagerate not in use
# teammember pricerate not in use
