# PR2019-02-28
from datetime import date
from django.utils.translation import ugettext_lazy as _

USERNAME_MAX_LENGTH = 30
USERNAME_SLICED_MAX_LENGTH = 24
USER_LASTNAME_MAX_LENGTH = 50
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
PERMIT_04_SUPERVISOR = 4
PERMIT_08_PLANNER = 8
PERMIT_16_HRM = 16
PERMIT_32_ACCMAN = 32
PERMIT_64_SYSADMIN = 64


# PR2018-12-23 used in set_menu_items
PERMIT_TXT_00_NONE = _('None')
PERMIT_TXT_01_READ = _('Read only')
PERMIT_TXT_02_EMPLOYEE = _('Employee')
PERMIT_TXT_04_SUPERVISOR = _('Supervisor')
PERMIT_TXT_08_PLANNER = _('Planner')
PERMIT_TXT_16_HRM = _('HR manager')
PERMIT_TXT_32_ACCMAN = _('Account manager')
PERMIT_TXT_64_SYSADMIN = _('System administrator')

PERMIT_DICT = {
    PERMIT_00_NONE: PERMIT_TXT_00_NONE,
    PERMIT_01_READ: PERMIT_TXT_01_READ,
    PERMIT_02_EMPLOYEE: PERMIT_TXT_02_EMPLOYEE,
    PERMIT_04_SUPERVISOR: PERMIT_TXT_04_SUPERVISOR,
    PERMIT_08_PLANNER: PERMIT_TXT_08_PLANNER,
    PERMIT_16_HRM: PERMIT_TXT_16_HRM,
    PERMIT_32_ACCMAN: PERMIT_TXT_32_ACCMAN,
    PERMIT_64_SYSADMIN: PERMIT_TXT_64_SYSADMIN
}

PERMIT_CHOICES = [
    (PERMIT_01_READ, PERMIT_TXT_01_READ),
    (PERMIT_02_EMPLOYEE, PERMIT_TXT_02_EMPLOYEE),
    (PERMIT_04_SUPERVISOR, PERMIT_TXT_04_SUPERVISOR),
    (PERMIT_08_PLANNER, PERMIT_TXT_08_PLANNER),
    (PERMIT_16_HRM, PERMIT_TXT_16_HRM),
    (PERMIT_32_ACCMAN, PERMIT_TXT_32_ACCMAN),
    (PERMIT_64_SYSADMIN, PERMIT_TXT_64_SYSADMIN)
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

# SETTING KEYS PR2019-03-09
KEY_ORDER_COLDEFS = "order_coldefs"
KEY_EMPLOYEE_COLDEFS = "empl_coldefs"
KEY_PAYDATECODE_COLDEFS = "pdc_coldefs"

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
PUBLICHOLIDAY_CHOICES = {LANG_EN: ('also on holidays', 'only on holidays', 'not on holidays'),
                         LANG_NL: ('ook op feestdagen', 'alleen op feestdagen', 'niet op feestdagen')}

# PR2019-08-17
# order cat = # 00 = normal, 10 = internal, 20 = rest, 30 = absence, 90 = template

STATUS_000_NONE = 0
STATUS_001_CREATED = 1
STATUS_002_START_PENDING = 2
STATUS_004_START_CONFIRMED = 4
STATUS_008_END_PENDING = 8
STATUS_016_END_CONFIRMED = 16
STATUS_032_LOCKED = 32


SHIFT_CAT_0032_REPLACEMENT = 32  #  (cat_replacement not in use in table order)
SHIFT_CAT_0512_ABSENCE = 512 # used in table customer, order, scheme , orderhour,  emplhour)

DATEPART01_NIGHTSHIFT_END = 360  # end of night shift 6.00 u
DATEPART02_MORNINGSHIFT_END = 720  # end of morning shift 12.00 u
DATEPART03_AFTERNOONSHIFT_END = 1080  # end of afternoon shift 18.00 u

# 0 = normal, 10 = replacement
TEAMMEMBER_CAT_0512_ABSENCE = 512

# PR2020-04-07 bonus added upon registering
ENTRY_CAT_00_CHARGED = 0
ENTRY_CAT_01_SPARE = 1
ENTRY_CAT_02_PAID = 2
ENTRY_CAT_03_BONUS = 3

ENTRY_BONUS_SIGNUP = 15000  # PR2020-04-07 bonus added upon registering
ENTRY_NEGATIVE_ALLOWED = 10000  # PR2020-04-15 negative balance allowed before account is blocked
ENTRY_VALID_MONTHS_BONUS = 3 # PR2020-04-15 months that bonus entries are valid
ENTRY_VALID_MONTHS_PAID = 6 # PR2020-04-15 months that grace entries are valid
ENTRY_BLOCKED_AFTER_MONTHS = 12 # PR2020-04-15 account will be removed after 12 months


REPLACEMENT_PERIOD_DEFAULT = 14 # days

# PR2019-10-160
EMPLOYEE_TEXT = {LANG_EN: 'Employee', LANG_NL: 'Medewerker'}

# PR2019-07-20
TEMPLATE_TEXT = {LANG_EN: 'Template', LANG_NL: 'Sjabloon'}
REST_TEXT = {LANG_EN: 'Rest', LANG_NL: 'Rust'}
SCHEME_TEXT = {LANG_EN: 'Scheme', LANG_NL: 'Schema'}
TEAM_TEXT = {LANG_EN: 'Team', LANG_NL: 'Ploeg'}
SHIFT_TEXT = {LANG_EN: 'Shift', LANG_NL: 'Dienst'}

# PR2019-06-24
ABSENCE = {
    LANG_EN: ('Absence', 'Absence'),
    LANG_NL: ('Afwezig', 'Afwezigheid')
          }

# PR2019-06-24  PR2019-09-26  fields: sequence, code, name, default category (niu)
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
KEY_USER_PERIOD_CUSTOMER = 'period_customer'
KEY_USER_PERIOD_EMPLOYEE = 'period_employee'

# code, cycle, excludecompanyholiday, excludepublicholiday PR2019-08-24
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

COLDEF_EMPLOYEE = ( {'tsaKey': 'code', 'caption': _('Short name')},
                    {'tsaKey': 'namelast', 'caption': _('Last name')},
                    {'tsaKey': 'namefirst', 'caption': _('First name')},
                    {'tsaKey': 'identifier', 'caption': _('ID-number')},
                    {'tsaKey': 'email', 'caption': _('Email address')},
                    {'tsaKey': 'tel', 'caption': _('Telephone')},
                    {'tsaKey': 'datefirst', 'caption': _('First date in service')},
                    {'tsaKey': 'datelast', 'caption': _('Last date in service')},
                    {'tsaKey': 'workhoursperweek', 'caption': _('Working hours per week')},
                    {'tsaKey': 'workdays', 'caption': _('Working days per week')},
                    {'tsaKey': 'leavedays', 'caption': _('Vacation days per year')},
                    {'tsaKey': 'functioncode', 'caption': _('Function')},
                    {'tsaKey': 'payrollcode', 'caption': _('Payroll code')}
                    # {'tsaKey': 'wagecode', 'caption': 'Wage code'}
                   )



CAPTION_IMPORT =  {'no_file': _('No file is currently selected'),
                                 'link_columns': _('Link columns'),
                                 'click_items': _('Click items to link or unlink columns'),
                                 'excel_columns': _('Excel columns'),
                                 'tsa_columns': _('TSA columns'),
                                 'linked_columns': _('Linked columns')}

CAPTION_IMPORTXX = {LANG_EN: {'no_file': 'No file is currently selected',
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

COLDEF_ORDER = ( {'tsaKey': 'custcode', 'caption': _('Customer - Short name')},
                {'tsaKey': 'custname', 'caption': _('Customer - Name')},
                {'tsaKey': 'custidentifier', 'caption': _('Customer - Identifier')},
                # {'tsaKey': 'custcontactname', 'caption': _('Customer - Contact name')},
                # {'tsaKey': 'custaddress', 'caption': _('Customer - Address')},
                # {'tsaKey': 'custzipcode', 'caption': _('Customer - Zipcode')},
                # {'tsaKey': 'custcity', 'caption': _('Customer - City')},
                # {'tsaKey': 'custcountry', 'caption': _('Customer - Country')},
                # {'tsaKey': 'custemail', 'caption': _('Customer - Email address')},
                # {'tsaKey': 'custtelephone', 'caption': _('Customer - Telephone')},

                {'tsaKey': 'ordercode', 'caption': _('Order - Short name')},
                {'tsaKey': 'ordername', 'caption': _('Order - Name')},
                {'tsaKey': 'orderidentifier', 'caption': _('Order - Identifier')},
                # {'tsaKey': 'ordercontactname', 'caption': _('Order - Contact name')},
                # {'tsaKey': 'orderaddress', 'caption': _('Order - Address')},
#  {'tsaKey': 'orderzipcode', 'caption': _('Order - Zipcode')},
#  {'tsaKey': 'ordercity', 'caption': _('Order - City')},
                # {'tsaKey': 'ordercountry', 'caption': _('Order - Country')},
                # {'tsaKey': 'orderemail', 'caption': _('Order - Email address')},
                # {'tsaKey': 'ordertelephone', 'caption': 'Order - Telephone')},
                {'tsaKey': 'orderdatefirst', 'caption': _('Order - First date of order')},
                {'tsaKey': 'orderdatelast', 'caption': _('Order - Last date of order')}
                 )


COLDEF_PAYDATECODE = ( {'tsaKey': 'afascode', 'caption': _('Code period table')},
                {'tsaKey': 'code', 'caption': _('Name period table')},
                {'tsaKey': 'year', 'caption': _('Bookyear')},
                {'tsaKey': 'period', 'caption': _('Period index')},
                {'tsaKey': 'datefirst', 'caption': _('Startdate')},
                {'tsaKey': 'paydate', 'caption': _('Enddate')}
                )

FIELDS_COMPANY = ('id', 'code', 'name', 'issystem', 'timezone', 'interval', 'timeformat', 'cat', 'billable',
                  'pricecode_id', 'additioncode_id', 'taxcode_id', 'invoicecode_id',  'workminutesperday', 'entryrate' )
                # TODO add 'wagefactorcode_id',

FIELDS_COMPANYINVOICE = ('id', 'company', 'cat', 'entries', 'used', 'balance', 'entryrate',
                         'datepayment', 'dateexpired', 'expired', 'note', 'locked', 'modifiedat')

FIELDS_CUSTOMER = ('id', 'company', 'cat', 'isabsence', 'istemplate', 'code', 'name', 'identifier',
                    'contactname', 'address', 'zipcode', 'city', 'country',
                   'email', 'telephone', 'interval', 'invoicecode', 'inactive', 'locked')

FIELDS_ORDER = ('id', 'customer', 'cat', 'isabsence', 'istemplate', 'code', 'name', 'datefirst', 'datelast',
                'contactname', 'address', 'zipcode', 'city', 'country', 'identifier',
                'billable', 'sequence', 'pricecode', 'additioncode', 'taxcode', 'invoicecode',
                'nopay', 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday',
                'inactive', 'locked')

FIELDS_ORDERHOUR = ('id', 'order', 'schemeitem',
                    'customercode', 'ordercode', 'shiftcode',
                    'rosterdate', 'cat',
                    'isabsence', 'isrestshift', 'issplitshift', 'isbillable', 'nobill',
                    'invoicecode', 'invoicedate', 'lockedinvoice',
                    'pricecode', 'additioncode', 'taxcode',
                    'status', 'hasnote', 'locked')

FIELDS_EMPLHOUR = ('id', 'orderhour',
                    'rosterdate', 'exceldate',
                   'employee', 'employeecode',
                   'cat', 'isreplacement', 'datepart',
                   'paydate', 'paydatecode', 'lockedpaydate', 'nopay',
                   'timestart', 'timeend', 'timeduration', 'breakduration', 'plannedduration', 'billingduration',
                   'offsetstart', 'offsetend', 'excelstart', 'excelend',
                   'functioncode', 'wagecode', 'wagefactorcode', 'wagerate', 'wagefactor', 'wage',
                   'amount', 'addition', 'tax',
                   'status', 'haschanged','overlap',
                   'schemeitemid', 'teammemberid', 'locked',
                   'order', 'shift', 'confirmstart', 'confirmend')
                    # fields: order, shift, confirmstart and confirmend are not model fields,
                   # but necessary to update abssence_category, shift_code and status
                   # 'issplitshift'

FIELDS_SCHEME = ('id', 'order', 'cat', 'isabsence', 'issingleshift', 'isdefaultweekshift', 'istemplate',
                 'code', 'datefirst', 'datelast',
                 'cycle', 'billable', 'excludecompanyholiday', 'excludepublicholiday', 'divergentonpublicholiday',
                 'nohoursonsaturday', 'nohoursonsunday', 'nohoursonpublicholiday',
                 'pricecode', 'additioncode', 'taxcode', 'inactive')

FIELDS_SHIFT = ('id', 'scheme', 'code', 'cat', 'isrestshift', 'istemplate', 'billable',
                'offsetstart', 'offsetend', 'breakduration', 'timeduration',
                'wagefactorcode', 'pricecode', 'additioncode', 'taxcode')

FIELDS_TEAM = ('id', 'scheme', 'cat', 'code', 'isabsence', 'issingleshift', 'istemplate')

FIELDS_EMPLOYEE = ('id', 'company', 'code', 'namelast', 'namefirst', 'datefirst', 'datelast',
                    'email', 'telephone', 'identifier', 'payrollcode',
                   'address', 'zipcode', 'city', 'country',
                   'workhoursperweek', 'workminutesperday', 'leavedays',
                   'functioncode', 'wagecode', 'paydatecode',
                   'pricecode', 'additioncode', 'inactive', 'locked')

# PR2019-12-20 Note: 'scheme', 'order' and 'shift' are not fields of teammember, but necessary for absence update
FIELDS_TEAMMEMBER = ('id', 'team', 'employee', 'replacement', 'datefirst', 'datelast',
                     'scheme', 'order', 'shift',
                     'cat', 'isabsence', 'issingleshift', 'istemplate',
                     'wagefactorcode', 'pricecode', 'additioncode', 'override')


FIELDS_SCHEMEITEM = ('id', 'scheme', 'shift', 'team','rosterdate', 'onpublicholiday',
                     'cat', 'isabsence', 'issingleshift', 'istemplate', 'inactive')
# inactive schemeitem needed to skip certain shifts (when customer provides his own people)

# datefirst_agg and datelast_agg are not in model
FIELDS_PAYDATECODE = ('id', 'company', 'code', 'recurrence', 'dayofmonth', 'referencedate',
                      'datefirst', 'datelast', 'datefirst_agg', 'datelast_agg', 'afascode', 'isdefault', 'inactive')

FIELDS_PAYDATEITEM = ('id', 'paydatecode', 'datefirst', 'datelast', 'year', 'period')

# datefirst_agg and datelast_agg are not in model
FIELDS_WAGECODE = ('id', 'company', 'code', 'wagerate',
                   'iswagecode', 'iswagefactor', 'isfunctioncode', 'isdefault', 'inactive',
                   'datefirst_agg', 'wagerate_agg')

WORKHOURS_DEFAULT = 2400   # working hours per week * 60, unit is minute, default is 40 hours per week = 2.400 minutes
WORKDAYS_DEFAULT = 7200  # workdays per week * 1440, unit is minute (one day has 1440 minutes) , default is 5 days per week = 7200 minutes
LEAVEDAYS_DEFAULT = 21600  # leavedays per year, = 15 days * 1440 = 21.600 minutes

# workhours_per_day_minutes = workhours_minutes / workdays_minutes * 1440
