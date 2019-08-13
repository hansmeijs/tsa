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

#PR2019-04-13
WEEKDAYS_ABBREV = {LANG_EN: ('', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'),
             LANG_NL: ('', 'ma', 'di', 'wo', 'do', 'vr', 'za', 'zo')
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

# PR2019-06-25
CAT_00_NORMAL = 0
CAT_01_INTERNAL = 1
CAT_02_REST = 2
CAT_03_ABSENCE = 3
CAT_04_TEMPLATE = 4

#PR2019-08-05 # 0 = grace-entry, 1 = bonus-entries, 2 = paid-entries
CAT_ENTRY_00_GRACE = 0
CAT_ENTRY_01_BONUS = 1
CAT_ENTRY_02_PAID = 2

# PR2018-09-05
CAT_ENTRY_CHOICES = (
    (CAT_ENTRY_00_GRACE, 'Grace'),
    (CAT_ENTRY_01_BONUS, _('Bonus')),
    (CAT_ENTRY_02_PAID, _('Paid')),
)

# PR2019-06-24
ABSENCE = {LANG_EN: 'Absence', LANG_NL: 'Afwezigheid'}

# PR2019-06-24
ABSENCE_CATEGORY = {LANG_EN: (
                        ('0', 'Unknown', 'Unknown absence'),
                        ('1', 'Vacation', 'Vacation leave'),
                        ('2', 'Sick leave', 'Sick leave'),
                        ('3', 'Special leave', 'Special leave'),
                        ('4', 'Unpaid leave', 'Unpaid leave'),
                        ('5', 'Unauthorized', 'Unauthorized absence')),
                    LANG_NL: (
                        ('0', 'Onbekend', 'Onbekend verzuim'),
                        ('1', 'Vakantie', 'Vakantie'),
                        ('2', 'Ziekte', 'Ziekteverzuim'),
                        ('3', 'Buitengewoon', 'Buitengewoon verlof'),
                        ('4', 'Onbetaald', 'Onbetaald verlof'),
                        ('5', 'Ongeoorloofd', 'Ongeoorloofd verzuim'))
                    }


# PR2019-07-20
TEMPLATE_TEXT = {LANG_EN: 'Template', LANG_NL: 'Sjabloon'}
REST_TEXT = {LANG_EN: 'Rest', LANG_NL: 'Rust'}

STATUS_00_NONE = 0
STATUS_01_CREATED = 1
STATUS_02_START_CONFIRMED = 2
STATUS_04_END_CONFIRMED = 4
STATUS_08_LOCKED = 8
STATUS_16_QUESTION = 16
STATUS_32_REJECTED = 32
STATUS_64_APPROVED = 64

KEY_COMP_ROSTERDATE_CURRENT = 'rstdte_current'
KEY_USER_QUICKSAVE = 'quicksave'
KEY_USER_EMPLHOUR_PERIOD = 'emplhour_period'

SHIFT_DEFAULT = {LANG_EN: (
                        (0, 'Night', 'Night shift', '-1;22;0', '0;7;0'),
                        (1, 'Day', 'Day shift', '0;7;0', '0;15;0'),
                        (2, 'Evening', 'Evening shift', '0;15;0', '0;22;0')),
                LANG_NL: (
                    (0, 'Nacht', 'Nachtdienst', '-1;22;0', '0;7;0'),
                    (1, 'Dag', 'Dagdienst', '0;7;0', '0;15;0'),
                    (2, 'Avond', 'Avonddienst', '0;15;0', '0;22;0'))
                }
TEAM_DEFAULT = {LANG_EN: (
                        (0, 'Team A'),
                        (1, 'Team B'),
                        (2, 'Team C'),
                        (3, 'Team D')),
                LANG_NL: (
                        (0, 'Ploeg A'),
                        (1, 'Ploeg B'),
                        (2, 'Ploeg C'),
                        (3, 'Ploeg D'))
                }
SCHEME_24H_DEFAULT  =  ((1, 0, 0), (1, 1, 1), (1, 2, 2),  # cycleday, shift, team
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
                                {'tsaKey': 'code', 'caption': 'Code'},
                                {'tsaKey': 'namelast', 'caption': 'Last name'},
                                {'tsaKey': 'namefirst', 'caption': 'First name'},
                                {'tsaKey': 'identifier', 'caption': 'Identity number'},
                                {'tsaKey': 'email', 'caption': 'Email address'},
                                {'tsaKey': 'tel', 'caption': 'Telephone'},
                                {'tsaKey': 'datefirst', 'caption': 'First date in service'},
                                {'tsaKey': 'datelast', 'caption': 'Last date in service'}
                            ],
                    LANG_NL: [
                                {'tsaKey': 'code', 'caption': 'Code'},
                                {'tsaKey': 'namelast', 'caption': 'Achternaam'},
                                {'tsaKey': 'namefirst', 'caption': 'Voornaam'},
                                {'tsaKey': 'identifier', 'caption': 'Identiteitsnummer'},
                                {'tsaKey': 'email', 'caption': 'E-mail adres'},
                                {'tsaKey': 'tel', 'caption': 'Telefoon'},
                                {'tsaKey': 'datefirst', 'caption': 'Begindatum in dienst'},
                                {'tsaKey': 'datelast', 'caption': 'Einddatum in dienst'},
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

# this one is not working: update_dict = dict.fromkeys(field_list, {})
FIELDS_EMPLHOUR = ('pk', 'id', 'orderhour', 'employee', 'wagecode', 'rosterdate',
                        'timestart', 'timeend', 'timeduration', 'breakduration', 'status')

FIELDS_SCHEMEITEM = ('pk', 'id', 'rosterdate', 'shift', 'team', 'timestart', 'timeend',
                     'timeduration', 'iscyclestart', 'inactive')
FIELDS_SHIFT = ('pk', 'id', 'code', 'cat', 'offsetstart', 'offsetend', 'breakduration', 'successor')

FIELDS_TEAM = ('pk', 'id', 'code')

FIELDS_TEAMMEMBER = ('pk', 'id', 'employee', 'datefirst', 'datelast')
