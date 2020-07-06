# PR2019-02-28
from django.contrib.postgres.fields import JSONField

from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL, Sum, Max, Min

from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, SmallIntegerField, IntegerField, \
    DateField, DateTimeField, Q, Value
from django.db.models.functions import Lower, Coalesce
from django.utils.translation import ugettext_lazy as _

from datetime import date, datetime, timedelta

from tsap.settings import AUTH_USER_MODEL, TIME_ZONE
from tsap import constants as c
from tsap import functions as f

import pytz

import logging
logger = logging.getLogger(__name__)


class TsaManager(Manager):
    def get_or_none(self, **kwargs):
        try:
            return self.get(**kwargs)
        except:
            return None


# PR2019-03-12 from https://godjango.com/blog/django-abstract-base-class-model-inheritance/
# tables  inherit fields from this class
class TsaBaseModel(Model):
    objects = TsaManager()

    # set maxlength also in  maxlen_code, maxlen_name
    code = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH)
    name = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH)

    datefirst = DateField(db_index=True, null=True, blank=True)
    datelast = DateField(db_index=True, null=True, blank=True)

    locked = BooleanField(default=False)
    inactive = BooleanField(default=False)

    modifiedby = ForeignKey(AUTH_USER_MODEL, null=True, related_name='+', on_delete=SET_NULL)
    modifiedat = DateTimeField()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # skip modifiedby and modifiedatwhen subtracting balance PR2019-04-09

        # get now without timezone
        now_utc_naive = datetime.utcnow()
        # now_utc_naive: 2019-07-16 14:29:55.819695
        # convert now to timezone utc
        now_utc = now_utc_naive.replace(tzinfo=pytz.utc)

        # skip updating modifiedby and modifiedat when no request (issytem update of schemeitem, maybe other models as well)
        if 'request' in kwargs:
            self.request = kwargs.pop('request', None)
            if self.request.user:
                self.modifiedby = self.request.user
            # timezone.now() is timezone aware, based on the
            # datetime.now() is timezone naive. PR2018-06-07

            # now_utc: 2019-07-16 14:29:55.819695+00:00
            self.modifiedat = now_utc

        # modifiedat is required. Fill in when empty
        if self.modifiedat is None:
            self.modifiedat = now_utc

        # when adding record: self.id=None, set force_insert=True; otherwise: set force_update=True PR2018-06-09
        super(TsaBaseModel, self).save()

    def delete(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        # to be used for log purpose
        # self.data_has_changed('d')
        # save to logfile before deleting record
        # self.save_to_log()
        super(TsaBaseModel, self).delete(*args, **kwargs)

    @property
    def maxlen_code(self):  # PR2019-03-04
        return c.CODE_MAX_LENGTH

    @property
    def maxlen_name(self):  # PR2019-03-04
        return c.NAME_MAX_LENGTH

    @property
    def datefirst_str(self):  # PR2019-03-29
        return f.get_date_yyyymmdd(self.datefirst)

    @property
    def datelast_str(self):  # PR2019-03-29
        return f.get_date_yyyymmdd(self.datelast)

    @property
    def modifiedby_str(self):  # PR2019-04-01
        modby_str = ''
        if self.modifiedby:
            modby_str = self.modifiedby.username_sliced
        return modby_str

    def modifiedat_str(self,  lang):  # PR2019-03-23
        # This doesn't work in template tags
        dte_str = ''
        if self.modifiedat:
            dte_str = f.get_date_longstr_from_dte(self.modifiedat, lang)
        return dte_str


class Company(TsaBaseModel):
    objects = TsaManager()

    issystem = BooleanField(default=False)
    timezone = CharField(max_length=c.NAME_MAX_LENGTH, default=TIME_ZONE)
    interval = PositiveSmallIntegerField(default=c.TIMEINTERVAL_DEFAULT)
    timeformat = CharField(max_length=4, choices=c.TIMEFORMAT_CHOICES, default=c.TIMEFORMAT_24h)

    cat = PositiveSmallIntegerField(default=0)
    billable = SmallIntegerField(default=0)  # 0 = no override, 1= override NotBillable, 2= override Billable

    # cannot use Foreignkey, because Pricecode has field company_id
    pricecode_id = IntegerField(null=True)
    additioncode_id = IntegerField(null=True)
    taxcode_id = IntegerField(null=True)
    invoicecode_id = IntegerField(null=True)

    workminutesperday = IntegerField(default=480)  # default working minutes per day * 60, unit is minute. 8 hours = 480 workminutes
    entryrate = IntegerField(default=0) # /10000 unit is currency (US$, EUR, ANG)

    activated = BooleanField(default=False)
    activatedat = DateTimeField(null=True)

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @property
    def companyprefix(self):
        #PR2019-03-13 CompanyPrefix is added at front of username, to make usernames unique per company
        id_str = '000000' + str(self.pk)
        return id_str[-6:]


class Pricecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None
    locked = None

    note = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    sequence = PositiveSmallIntegerField(default=0)

    isdefault = BooleanField(default=False)
    isprice = BooleanField(default=False)
    isaddition = BooleanField(default=False)  # additionrate = /10.000 unitless additionrate 10.000 = 100%
    istaxcode = BooleanField(default=False)  # taxrate = /10.000 unitless taxrate 600 = 6%
    isinvoicedate = BooleanField(default=False)

    class Meta:
        ordering = ['sequence']


class Pricecodeitem(TsaBaseModel):
    objects = TsaManager()
    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=CASCADE)

    # order on datefirst, descending: ORDER BY last_updated DESC NULLS LAST
    code = None
    name = None
    datelast = None
    inactive = None
    locked = None

    isprice = BooleanField(default=False)
    isaddition = BooleanField(default=False)  # additionrate = /10.000 unitless additionrate 10.000 = 100%, or amount 10.000 = $100.00
    istaxcode = BooleanField(default=False)  # taxrate = /10.000 unitless taxrate 600 = 6%
    additionisamount = BooleanField(default=False)

    pricerate = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG) EUR 100 = 10.000

    class Meta:
        ordering = ['-datefirst']


class Customer(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='customers', on_delete=CASCADE)

    cat = PositiveSmallIntegerField(default=0)
    isabsence = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    identifier = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    contactname = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    address = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    zipcode = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    city = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    country = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    email = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=c.USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)

    interval = PositiveSmallIntegerField(default=0) # not in use yet

    billable = SmallIntegerField(default=0)  # 0 = no override, 1= override NotBillable, 2= override Billable

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    invoicecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Customerlog(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='+', on_delete=CASCADE)

    datefirst = None
    datelast = None
    inactive = None
    locked = None

    class Meta:
        ordering = ['-modifiedat']


class Order(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='orders', on_delete=CASCADE)
    cat = PositiveSmallIntegerField(default=0)
    isabsence = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    contactname = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    address = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    zipcode = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    city = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    country = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    identifier = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    billable = SmallIntegerField(default=0)  # 0 = no override, 1= override NotBillable, 2= override Billable
    sequence = IntegerField(null=True) # only used in abscat PR2020-06-11 contains value of 'Priority'
    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    invoicecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    nopay = BooleanField(default=False)  # nopay: only used in absence, to set nopay in emplhour PR2020-06-07
    nohoursonsaturday = BooleanField(default=False)  # used in absence, to skip hours in emplhour PR2020-06-09
    nohoursonsunday = BooleanField(default=False)  # used in absence, to skip hours in emplhour PR2020-06-09
    nohoursonpublicholiday = BooleanField(default=False)

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @property
    def id_str(self):
        return 'id_ord_' + self.pk


class Orderlog(TsaBaseModel):
    objects = TsaManager()

    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)

    datefirst = None
    datelast = None
    inactive = None
    locked = None

    class Meta:
        ordering = ['-modifiedat']


class Object(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='+', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class OrderObject(TsaBaseModel): # PR2019-06-23 added
    objects = TsaManager()

    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)
    object = ForeignKey(Object, related_name='+', on_delete=CASCADE)

    code = None
    name = None
    datefirst = None
    datelast = None

    locked = None
    inactive = None

class Paydatecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    locked = None

    code = CharField(db_index=True, max_length=c.USERNAME_MAX_LENGTH)
    recurrence = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    dayofmonth = SmallIntegerField(null=True)
    referencedate = DateField(null=True) # this field contains the closingdate for weekly and biweekly periods
    isdefault = BooleanField(default=False)

    afascode = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['code']

    def has_lockedpaydate_emplhours(self):  # PR2020-06-26
        # function checks if this paydatcode has emplhours with lockedpaydate=True
        has_locked_emplhours = False
        if self.pk:
            has_locked_emplhours = Emplhour.objects.filter(paydatecode_id=self.pk, lockedpaydate=True).exists()
        return has_locked_emplhours

class Paydateitem(TsaBaseModel):
    objects = TsaManager()
    paydatecode = ForeignKey(Paydatecode, related_name='+', on_delete=CASCADE)

    # order on datefirst, descending: ORDER BY last_updated DESC NULLS LAST
    code = None
    name = None
    inactive = None
    locked = None

    year = PositiveSmallIntegerField(default=0)
    period = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['datelast']


class Wagecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='wagecodes', on_delete=CASCADE)

    wagerate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None
    locked = None

    sequence = PositiveSmallIntegerField(default=0)
    rate = JSONField(null=True)  # stores price plus startdate
    iswage = BooleanField(default=False)
    iswagefactor = BooleanField(default=False)  # /1.000.000 unitless, 0 = factor 100%  = 1.000.000)
    isfunctioncode = BooleanField(default=False)
    isdefault = BooleanField(default=False)

    class Meta:
        ordering = ['sequence']


    def __str__(self):
        return self.code


class Wagecodeitem(TsaBaseModel):
    objects = TsaManager()
    wagecode = ForeignKey(Wagecode, related_name='+', on_delete=CASCADE)

    # order on datefirst, descending: ORDER BY last_updated DESC NULLS LAST
    code = None
    name = None
    datelast = None
    inactive = None
    locked = None

    iswage = BooleanField(default=False)
    iswagefactor = BooleanField(default=False)  # /1.000.000 unitless, 0 = factor 100%  = 1.000.000)

    wagerate = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG)

    class Meta:
        ordering = ['-datefirst']


class Timecode(TsaBaseModel): # Workingday, Saturday, SUnday, Public Holiday, general holiday, + wagefactor
    objects = TsaManager()
    company = ForeignKey(Company, related_name='timecodes', on_delete=CASCADE)
    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    datelast = None
    locked = None

    sequence = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sequence']

    def __str__(self):
        return self.code


class Calendar(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='calendars', on_delete=CASCADE)

    rosterdate = DateField(db_index=True)
    year = PositiveSmallIntegerField(default=0)

    iscompanyholiday = BooleanField(default=False)
    ispublicholiday = BooleanField(default=False)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    datelast = None
    inactive = None
    locked = None

    class Meta:
        ordering = ['rosterdate']


class CalendarTimecode(TsaBaseModel): # List of dates with timecodes, to be generated each year
    objects = TsaManager()
    company = ForeignKey(Company, related_name='CalendarTimecodes', on_delete=CASCADE)
    timecode = ForeignKey(Timecode, related_name='CalendarTimecodes', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    locked = None

    class Meta:
        ordering = ['datefirst']

    def __str__(self):
        return self.code


class Scheme(TsaBaseModel):
    objects = TsaManager()
    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)
    cat = PositiveSmallIntegerField(default=0)  # order cat = # 00 = normal, 10 = internal, 20 = rest, 30 = absence, 90 = template
    isabsence = BooleanField(default=False)
    issingleshift = BooleanField(default=False)
    isdefaultweekshift = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    cycle = PositiveSmallIntegerField(default=7)  # default cycle is one week, min="1" max="28"
    billable = SmallIntegerField(default=0)  # 0 = no override, 1= override NotBillable, , 2= override Billable

    excludecompanyholiday = BooleanField(default=False)
    divergentonpublicholiday = BooleanField(default=False)
    excludepublicholiday = BooleanField(default=False)

    nopay = BooleanField(default=False)  # nopay: only used in absence, to set nopay in emplhour PR2020-06-07
    nohoursonsaturday = BooleanField(default=False)
    nohoursonsunday = BooleanField(default=False)
    # nohoursonweekend = BooleanField(default=False)  # deprecated
    nohoursonpublicholiday = BooleanField(default=False)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    locked = None
    name = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Shift(TsaBaseModel):
    objects = TsaManager()
    scheme = ForeignKey(Scheme, related_name='shifts', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    datelast = None
    inactive = None
    locked = None

    cat = PositiveSmallIntegerField(default=0)
    isrestshift = BooleanField(default=False)
    istemplate = BooleanField(default=False)
    billable = SmallIntegerField(default=0)  # 0 = no override, 1= override NotBillable, , 2= override Billable

    offsetstart = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    offsetend = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    breakduration = IntegerField(default=0) # unit is minute
    timeduration = IntegerField(default=0)  # unit is minute

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)

    def __str__(self):
        return self.code


class Team(TsaBaseModel):
    objects = TsaManager()
    scheme = ForeignKey(Scheme, related_name='teams', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    datelast = None
    inactive = None
    locked = None

    cat = PositiveSmallIntegerField(default=0)
    isabsence = BooleanField(default=False)
    issingleshift = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Employee(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)

    namelast = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH)
    namefirst = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    email = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    identifier = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    payrollcode = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    address = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    zipcode = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    city = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    country = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    workhoursperweek = IntegerField(default=0)  # renamed. Was workhours. Working hours per week * 60, unit is minute. 40 hours = 2400 workhours
    workminutesperday = IntegerField(default=0)  # working minutes per day * 60, unit is minute. 8 hours = 480 workminutes
    workdays = IntegerField(default=0)  # TODO deprecated: remove workdays per week * 1440, unit is minute. 5 days = 7200 workdays
    leavedays = IntegerField(default=0)  # leave days per year, full time, * 1440, unit is minute (one day has 1440 minutes)

    functioncode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagecode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True, blank=True)
    paydatecode = ForeignKey(Paydatecode, related_name='+', on_delete=SET_NULL, null=True)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None

    class Meta:
        ordering = (Lower('code'),)

    def __str__(self):
        return self.code


class Employeelog(TsaBaseModel):
    objects = TsaManager()

    employee = ForeignKey(Employee, related_name='+', on_delete=CASCADE)

    namelast = CharField(max_length=c.NAME_MAX_LENGTH)
    namefirst = CharField(max_length=c.NAME_MAX_LENGTH, null=True)

    name = None
    datefirst = None
    datelast = None
    inactive = None
    locked = None

    class Meta:
        ordering = ['-modifiedat']


class Teammember(TsaBaseModel):
    objects = TsaManager()

    team = ForeignKey(Team, related_name='teammembers', on_delete=CASCADE)
    employee = ForeignKey(Employee, related_name='teammembers', on_delete=SET_NULL, null=True, blank=True)
    replacement = ForeignKey(Employee, related_name='replacements', on_delete=SET_NULL, null=True, blank=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    inactive = None
    locked = None

    cat = PositiveSmallIntegerField(default=0)  # teammember cat: 0 = normal, 1 = replacement, 512 = absent
    isabsence = BooleanField(default=False)
    issingleshift = BooleanField(default=False)
    isswitchedshift = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    # when teammember_pricecode = None and override=True: use employee_pricecode, False: use shift_pricecode
    # applies also to additioncode
    override = BooleanField(default=True)

    @classmethod
    def get_first_teammember_on_rosterdate(cls, team, rosterdate_dte):
        #logger.debug("------ get_first_teammember_on_rosterdate---" + str(rosterdate_dte))

        teammember = None
        if team and rosterdate_dte:
            # filter teammmembers that have new_rosterdate within range datefirst/datelast
            crit = (Q(team=team)) & \
                   (Q(employee__isnull=False)) & \
                   (Q(employee__datefirst__lte=rosterdate_dte) | Q(employee__datefirst__isnull=True)) & \
                   (Q(employee__datelast__gte=rosterdate_dte) | Q(employee__datelast__isnull=True)) & \
                   (Q(datefirst__lte=rosterdate_dte) | Q(datefirst__isnull=True)) & \
                   (Q(datelast__gte=rosterdate_dte) | Q(datelast__isnull=True))
            #logger.debug(teammembers.query)
                # WHERE ("companies_teammember"."team_id" = 13
                # AND "companies_teammember"."employee_id" IS NOT NULL
                # AND ("companies_employee"."datefirst" <= 2019-08-14 OR "companies_employee"."datefirst" IS NULL)
                # AND ("companies_employee"."datelast" >= 2019-08-14 OR "companies_employee"."datelast" IS NULL)
                # AND ("companies_teammember"."datefirst" <= 2019-08-14 OR "companies_teammember"."datefirst" IS NULL)
                # AND ("companies_teammember"."datelast" >= 2019-08-14 OR "companies_teammember"."datelast" IS NULL))

            # convert datelast null into '2500-01-01'.  (function Coalesce changes Null into '2500-01-01')
            # from: https://stackoverflow.com/questions/5235209/django-order-by-position-ignoring-null
            # Coalesce works by taking the first non-null value.  So we give it
            # a date far after any non-null values of last_active.  Then it will
            # naturally sort behind instances of Box with a non-null last_active value.

            teammember = cls.objects.annotate(
                new_datelast=Coalesce('datelast', Value(datetime(2500, 1, 1))
                                      )).filter(crit).order_by('new_datelast').first()
        return teammember


class Schemeitem(TsaBaseModel):
    objects = TsaManager()

    scheme = ForeignKey(Scheme, related_name='schemeitems', on_delete=CASCADE)
    shift = ForeignKey(Shift, related_name='schemeitems', on_delete=SET_NULL, null=True, blank=True)
    team = ForeignKey(Team, related_name='schemeitems', on_delete=SET_NULL, null=True, blank=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None

    locked = None
    # rosterdate is None on public holidays PR20202-05-04
    rosterdate = DateField(db_index=True, null=True)
    onpublicholiday = BooleanField(default=False)
    cat = PositiveSmallIntegerField(default=0)
    isabsence = BooleanField(default=False)
    issingleshift = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    class Meta:
        ordering = ['rosterdate']

    def __str__(self):
        return 'schemeitem_pk_' + str(self.pk)

    def get_rosterdate_within_cycle(self, new_rosterdate_dte):
        # function returns a new_si_rosterdate of this schemeitem, that falls within the cycle of new_rosterdate PR2019-08-17
        #logger.debug(' --- get_rosterdate_within_cycle --- ' + str(new_rosterdate_dte) + str(type(new_rosterdate_dte)))

        new_si_rosterdate_naive = None

        if new_rosterdate_dte and self.rosterdate:
            si_rosterdate_naive = f.get_datetime_naive_from_dateobject(self.rosterdate)
            new_rosterdate_naive = f.get_datetime_naive_from_dateobject(new_rosterdate_dte)
            #logger.debug('si_rosterdate_naive: ' + str(si_rosterdate_naive) + ' ' + str(type(si_rosterdate_naive)))
            #logger.debug('new_rosterdate_naive: ' + str(new_rosterdate_naive) + ' ' + str(type(new_rosterdate_naive)))

            datediff = si_rosterdate_naive - new_rosterdate_naive  # datediff is class 'datetime.timedelta'
            datediff_days = datediff.days  # <class 'int'>
            #logger.debug('datediff_days: ' + str(datediff_days))

            if datediff_days == 0:
                new_si_rosterdate_naive = si_rosterdate_naive
            else:
                scheme = Scheme.objects.get_or_none(pk=self.scheme.pk)
                if scheme:
                    #logger.debug('scheme: ' + str(scheme.code))
                    # skip if cycle = 0 (once-only)
                    if scheme.cycle:
                        cycle_int = scheme.cycle
                        #logger.debug('cycle_int: ' + str(cycle_int))

                        # cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
                        # // operator: Floor division - division that results into whole number adjusted to the left in the number line
                        index = datediff_days // cycle_int
                        #logger.debug('index: ' + str(index) + ' ' + str(type(index)))
                        # adjust si_rosterdate when index <> 0
                        if index == 0:
                            new_si_rosterdate_naive = si_rosterdate_naive
                        else:
                            # negative index adds positive day and vice versa
                            days_add = cycle_int * index * -1
                            #logger.debug('days_add: ' + str(days_add) + ' ' + str(type(days_add)))
                            new_si_rosterdate_naive = si_rosterdate_naive + timedelta(days=days_add)
        #logger.debug('new_si_rosterdate_naive: ' + str(new_si_rosterdate_naive) + ' ' + str(type(new_si_rosterdate_naive)))
        # new_si_rosterdate_naive: 2019-08-29 00:00:00 <class 'datetime.datetime'>
        return new_si_rosterdate_naive


class Orderhour(TsaBaseModel):
    objects = TsaManager()

    order = ForeignKey(Order, related_name='orderhours', on_delete=PROTECT)

    customerlog = ForeignKey(Customerlog, related_name='+', on_delete=SET_NULL, null=True)
    orderlog = ForeignKey(Orderlog, related_name='+', on_delete=SET_NULL, null=True)

    # check if schemeitem is necessary, I dont think so PR2020-02-15
    # yes it is, to retrieve shift.isbillable when adding orderhour from roster page
    schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True)

    rosterdate = DateField(db_index=True)
    cat = PositiveSmallIntegerField(default=0)

    isabsence = BooleanField(default=False)
    isrestshift = BooleanField(default=False)
    issplitshift = BooleanField(default=False)
    isbillable = BooleanField(default=False)  # isbillable: worked hours will be billed when true, planned hours otherwise
    nobill = BooleanField(default=False)    # nobill: billed hours will be zero
    # TODO add nobill to pricepage
    shift = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    status = PositiveSmallIntegerField(db_index=True, default=0)

    invoicecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    invoicedate = DateField(db_index=True, null=True)
    lockedinvoice = BooleanField(default=False)

    hasnote = BooleanField(default=False)

    class Meta:
        ordering = ['rosterdate']

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None

    @property
    def rosterdate_yyyymmdd(self): # PR2019-04-01
        return f.get_date_yyyymmdd(self.rosterdate)


class Emplhour(TsaBaseModel):
    objects = TsaManager()

    orderhour = ForeignKey(Orderhour, related_name='emplhours', on_delete=CASCADE)
    employee = ForeignKey(Employee, related_name='emplhours', on_delete=SET_NULL, null=True)
    employeelog = ForeignKey(Employeelog, related_name='+', on_delete=SET_NULL, null=True)

    rosterdate = DateField(db_index=True)
    cat = PositiveSmallIntegerField(default=0)
    isreplacement = BooleanField(default=False)
    datepart = PositiveSmallIntegerField(default=0) # 1=night, 2 = morning, 3 = afternoon, 4 = evening, 0 = undefined

    paydate = DateField(db_index=True, null=True)
    paydatecode = ForeignKey(Paydatecode, related_name='+', on_delete=SET_NULL, null=True)
    lockedpaydate = BooleanField(default=False)
    nopay = BooleanField(default=False)    # nopay: wage will be zero

    timestart = DateTimeField(db_index=True, null=True, blank=True)
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    timeduration = IntegerField(default=0)
    breakduration = IntegerField(default=0)
    plannedduration = IntegerField(default=0)
    billingduration = IntegerField(default=0)

    offsetstart = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    offsetend = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    excelstart = IntegerField(null=True)  # Excel 'zero' date = 31-12-1899  * 1440 + offset
    excelend = IntegerField(null=True)  # Excel 'zero' date = 31-12-1899  * 1440 + offset

    wagecode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagerate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    wagefactor = IntegerField(default=0)  # /1.000.000 unitless, 0 = factor 100%  = 1.000.000)
    wage = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    pricerate = IntegerField(null=True)  # /100 unit is currency (US$, EUR, ANG)
    additionrate = IntegerField(default=0)  # additionrate = /10.000 unitless (10.000 = 100%) or fixed amount: 10.000 = $100
    additionisamount = BooleanField(default=False)
    taxrate = IntegerField(default=0)  # taxrate = /10.000 unitless taxrate 600 = 6%
    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    addition = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    tax = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    status = PositiveSmallIntegerField(db_index=True, default=0)
    overlap = SmallIntegerField(default=0)  # stores if record has overlapping emplhour records: 1 overlap start, 2 overlap end, 3 full overlap

    # combination rosterdate + schemeitemid + teammemberid is used to identify schemeitem / teammember that is used to create this emplhour
    # used in FilRosterdate to skip existing shifts (happens when same rosterdate is created for the second time)
    schemeitemid = IntegerField(null=True)
    teammemberid = IntegerField(null=True)

    class Meta:
        ordering = ['rosterdate', 'timestart']

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None

    @property
    def has_status01_created(self):  # PR2019-10-18
        has_status_created = False
        field_value = getattr(self, 'status', 0)
        status_int = int(field_value)
        status_str = bin(status_int)[-1:1:-1]  # status 31 becomes '11111', first char is STATUS_01_CREATED
        if status_str[:1] == '1':
            has_status_created = True
        return has_status_created


    @property
    def has_status_confirmed_or_higher(self):  # PR2019-10-18
        field_value = getattr(self, 'status', 0)
        status_int = int(field_value)
        return True if status_int > 1 else False


class Emplhourlog(TsaBaseModel):
    objects = TsaManager()

    emplhour = ForeignKey(Emplhour, related_name='+', on_delete=CASCADE)

    rosterdate = DateField()
    order = ForeignKey(Order, related_name='+', on_delete=SET_NULL, null=True)
    employee = ForeignKey(Employee, related_name='+', on_delete=SET_NULL, null=True)
    shift = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    timestart = DateTimeField(null=True)
    timeend = DateTimeField(null=True)
    breakduration = IntegerField(default=0)
    timeduration = IntegerField(default=0)
    status = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['-modifiedat']

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Orderhournotes(TsaBaseModel):
    objects = TsaManager()

    orderhour = ForeignKey(Orderhour, related_name='+', on_delete=CASCADE)
    note = CharField(max_length=2048, null=True, blank=True)
    isadminnote = BooleanField(default=False)

    class Meta:
        ordering = ['-modifiedat']

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Companylist(TsaBaseModel):  # PR2020-02-28
    objects = TsaManager()
    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)

    key = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH)
    list = JSONField(null=True)  # stores invoice dates, payroll dates

    name = None
    datefirst = None
    datelast = None
    locked = None


class Companyinvoice(TsaBaseModel):  # PR2019-04-06
    objects = TsaManager()
    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)

    cat = PositiveSmallIntegerField(default=0)  # 0 = charged, 1 = paid, 2 = refunds

    entries = IntegerField(default=0)
    used = IntegerField(default=0)
    balance = IntegerField(default=0)
    entryrate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    datepayment = DateField(db_index=True, null=True)
    dateexpired = DateField(db_index=True, null=True)
    expired = BooleanField(default=False)
    note = CharField(null=True, blank=True, max_length=c.NAME_MAX_LENGTH)

    class Meta:
        # ordering when subtracting: refund first, then paid from oldest expiration date
        ordering = ['cat', 'dateexpired']
    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None


class Companysetting(Model):  # PR2019-03-09
    # PR2018-07-20 from https://stackoverflow.com/questions/3090302/how-do-i-get-the-object-if-it-exists-or-none-if-it-does-not-exist
    objects = TsaManager()

    company = ForeignKey(Company, related_name='companysettings', on_delete=CASCADE)
    key = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH)
    setting = CharField(max_length=2048, null=True, blank=True)

    jsonsetting = JSONField(null=True)  # stores invoice dates for this customer

#===========  Classmethod
    @classmethod
    def get_jsonsetting(cls, key_str, company, default_setting=None): # PR2019-03-09 PR2019-08-17
        # function returns value of jsonsetting row that match the filter
        #logger.debug(' ')
        #logger.debug('---  get jsonsetting  ------- ')
        #logger.debug('company: ' + company.code)
        #logger.debug('key_str: ' + key_str)
        setting = None
        if company and key_str:
            row = cls.objects.get_or_none(company=company, key=key_str)
            if row:
                if row.jsonsetting:
                    setting = row.jsonsetting
        if setting is None:
            if default_setting:
                setting = default_setting
        #logger.debug('setting: ' + str(setting))
        return setting

    @classmethod
    def set_jsonsetting(cls, key_str, jsonsetting, company): #PR2019-03-09
        #logger.debug('---  set_jsonsettingg  ------- ')
        #logger.debug('key_str: ' + str(key_str) + ' jsonsetting: ' + str(jsonsetting))

        if company and key_str:
            # don't use get_or_none, gives none when multiple settings exists and will create extra setting.
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                row.jsonsetting = jsonsetting
            else:
                if jsonsetting:
                    row = cls(company=company, key=key_str, jsonsetting=jsonsetting)
            row.save()
            # test
            row = None
            saved_row = cls.objects.filter(company=company, key=key_str).first()
            #logger.debug('saved_row.jsonsetting: ' + str(saved_row.jsonsetting))

    @classmethod
    def get_setting(cls, key_str, company, default_setting=None): # PR2019-03-09 PR2019-08-17
        # function returns value of setting row that match the filter
        #logger.debug('---  get_setting  ------- ')
        setting = None
        if company and key_str:
            row = cls.objects.get_or_none(company=company, key=key_str)
            if row:
                if row.setting:
                    setting = row.setting
        if setting is None:
            if default_setting:
                setting = default_setting
        return setting

    @classmethod
    def set_setting(cls, key_str, setting, company): #PR2019-03-09
        #logger.debug('---  set_setting  ------- ')
        #logger.debug('key_str: ' + str(key_str) + ' setting: ' + str(setting))
        # get
        if company and key_str:
            # don't use get_or_none, gives none when multiple settings exists and will create extra setting.
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                row.setting = setting
            else:
                if setting:
                    row = cls(company=company, key=key_str, setting=setting)
            row.save()

        #logger.debug('row.setting: ' + str(row.setting))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# company entries


# =====  add_duration_to_companyinvoice  =====
def add_duration_to_companyinvoice(rosterdate_dte, duration_sum, is_delete_rosterdate, request, comp_timezone, user_lang):  # PR2020-04-07
    #logger.debug('===========  add_duration_to_companyinvoice  ==================== ')
    #logger.debug('duration_sum: ' + str(duration_sum))
    #logger.debug('is_delete_rosterdate: ' + str(is_delete_rosterdate))
    # called by FillRosterdate and RemoveRosterdate

    # no negative values allowed, skip when zero
    if duration_sum > 0:
        date_formatted = f.format_date_element(rosterdate_dte, user_lang, False, False, True, True, False, True)
        if is_delete_rosterdate:
            msg = _("Roster removed of %(fld)s") % {'fld': date_formatted}
        else:
            msg = _("Roster created of %(fld)s") % {'fld': date_formatted}

# - convert minutes to hours, rounded
        duration_hours_rounded = int(0.5 + duration_sum / 60)

# - when is_delete_rosterdate: only subtract when roster is remove before the actual rosterdate
        # - to prevent smart guys to delete roster after the actual date and so deduct entries
        if is_delete_rosterdate:
    # - get today in comp_timezone
            timezone = pytz.timezone(comp_timezone)
            today_dte = datetime.now(timezone).date()
            time_delta = today_dte - rosterdate_dte
            # rosterdate_dte: 2020-04-21 <class 'datetime.date'>
            # today_dte: 2020-04-16 <class 'datetime.date'>
            # datediff: -5 days, 0:00:00 <class 'datetime.timedelta'>
            days_diff = time_delta.days
    # - make entries zero when rosterdate is today or after today
            if days_diff < 0:
                duration_hours_rounded = duration_hours_rounded * -1
            else:
                duration_hours_rounded = 0

# - create entry_charged only when duration_hours_rounded has value
        if duration_hours_rounded:
            company = request.user.company
            entry_rate = company.entryrate
            entry = Companyinvoice(
                company=request.user.company,
                cat=c.ENTRY_CAT_00_CHARGED,
                entries=0,
                used=duration_hours_rounded,
                balance=0,
                entryrate=entry_rate,
                datepayment=rosterdate_dte,
                dateexpired=None,
                expired=False,
                note=msg
            )
            entry.save(request=request)

# add entries to refund from balance
            if is_delete_rosterdate:
                entry_refund_to_spare(duration_hours_rounded, request, comp_timezone)
# subtract entries from refund or paid/bonus
            else:
                entry_balance_subtract(duration_sum, request, comp_timezone)
# =====  end of add_duration_to_companyinvoice

def entry_balance_subtract(duration_sum, request, comp_timezone):  # PR2019-08-04  PR2020-04-08
    # function subtracts entries from balance: from refund first, then from paid / bonus: oldest expiration date first
    #logger.debug('-------------  entry_balance_subtract  ----------------- ')
    #logger.debug('duration_sum ' + str(duration_sum))

    if request.user.company:
# - get today in comp_timezone
        today_dte = datetime.now(pytz.timezone(comp_timezone)).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>

# - convert minutes to hours, rounded. Subtotal is the entries to be subtracted
        subtotal = int(0.5 + duration_sum / 60)
        if subtotal > 0:
            # - first deduct from category ENTRY_CAT_02_PAID (paid or bonus), then from ENTRY_CAT_01_SPARE
            # order by expiration date, null comes last, use annotate and coalesce to achieve this
            crit = Q(company=request.user.company) & \
                   Q(expired=False) & \
                   (Q(cat=c.ENTRY_CAT_01_SPARE) | Q(cat=c.ENTRY_CAT_02_PAID) | Q(cat=c.ENTRY_CAT_03_BONUS))
            invoices = Companyinvoice.objects\
                .annotate(dateexpired_nonull=Coalesce('dateexpired', Value(datetime(2500, 1, 1))))\
                .filter(crit).order_by('-cat', 'dateexpired_nonull')

# - loop through invoice_rows
            save_changes = False
            for invoice in invoices:
                #logger.debug('invoice: ' + str(invoice.dateexpired) + ' cat: ' + str(invoice.cat))
# - skip if row is expired. (expired=False is also part of crit, but let it stay here)
                if not invoice.expired:
# - check if row is expired. If so: set expired=True and balance=0
                    if invoice.dateexpired and invoice.dateexpired < today_dte:
                        invoice.expired = True
                        invoice.balance = 0
                        save_changes = True
                    else:
                        if subtotal > 0:
                            saved_used = invoice.used
                            saved_balance = invoice.balance
# - if balance is sufficient: subtract all from balance, else subtract balance
                            # field 'entries' contains amount of paid entries or bonus entries
                            # field 'used' contains amount of used entries or refund entries
                            # field 'balance' contains available ( = entries - used)
                            if saved_balance > 0:
                                # subtract subtotal from balance, but never more than balance
                                subtract = subtotal if saved_balance >= subtotal else saved_balance
                                #logger.debug('subtract: ' + str(subtract) + ' ' + str(type(subtract)))
                                invoice.used = saved_used + subtract
                                invoice.balance = saved_balance - subtract
                                subtotal = subtotal - subtract
                                save_changes = True
                                #logger.debug('invoice.balance ' + str(invoice.balance))
                    if save_changes:
                        invoice.save(request=request)

# - if any entries left: subtract from spare record (spare balance can be negative). Create spare record if not exists
# - if subtotal is negative it is a refund. Entries will be added to ENTRY_CAT_REFUND
        if subtotal > 0:
            #logger.debug('subtotal: ' + str(subtotal) + ' ' + str(type(subtotal)))
            spare_row = Companyinvoice.objects.filter(
                company=request.user.company,
                cat=c.ENTRY_CAT_01_SPARE).first()
            #logger.debug('refund_row: ' + str(refund_row) + ' ' + str(type(refund_row)))
            if spare_row is None:
                entry_create_spare_row(request)

            if spare_row:
                saved_entries = getattr(spare_row, 'entries', 0)
                saved_balance = getattr(spare_row, 'balance', 0)
                spare_row.entries = 0
                spare_row.used = saved_entries + subtotal
                spare_row.balance = saved_balance - subtotal
                spare_row.save(request=request)
                #logger.debug('saved_entries: ' + str(saved_entries) + ' ' + str(type(saved_entries)))


def entry_refund_to_spare(duration_hours_rounded, request, comp_timezone):  # PR2020-04-25
    # - it is a refund. Entries will be added to ENTRY_CAT_01_SPARE
    #  = refund happens when deleting shifts of a rosterdate
    #logger.debug('-------------  entry_refund_to_spare  ----------------- ')
    #logger.debug('duration_hours_rounded ' + str(duration_hours_rounded))

    if request.user.company and duration_hours_rounded:
        # - it is a refund. Entries will be added to ENTRY_CAT_REFUND

# - open refund_row
        spare_row = Companyinvoice.objects.filter(
            company=request.user.company,
            cat=c.ENTRY_CAT_01_SPARE).first()

 # - if not found: create refund_row if not found
        if spare_row is None:
            entry_create_spare_row(request)

# - subtract duration_hours_rounded from field 'used' of refund_row
        if spare_row:
            saved_used = getattr(spare_row, 'used', 0)
            spare_row.used = saved_used - duration_hours_rounded
            spare_row.balance = saved_used - duration_hours_rounded + c.ENTRY_NEGATIVE_ALLOWED
            spare_row.save(request=request)
            #logger.debug('saved_entries: ' + str(saved_entries) + ' ' + str(type(saved_entries)))


def entry_create_bonus(request, entries, valid_months, note, comp_timezone, entryrate=0, entrydate=None):  # PR2020-04-15
    # function adds a row with a balance. Called by SignupActivateView for bonus. TODO: add row when payment is made
    #logger.debug('-------------  entry_create_bonus  ----------------- ')

# -. get entrydate = today when blank
    if entrydate is None:
        # get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        entrydate = datetime.now(timezone).date()

# - add valid_months to entrydate > dateexpired
    entrydate_plus_valid_months = f.add_months_to_date(entrydate, valid_months)

    companyinvoice = Companyinvoice(
        company=request.user.company,
        cat=c.ENTRY_CAT_03_BONUS,
        entries=entries,
        used=0,
        balance=entries,
        entryrate=entryrate,
        datepayment=entrydate,
        dateexpired=entrydate_plus_valid_months,
        expired=False,
        note=note
    )
    companyinvoice.save(request=request)


def entry_create_spare_row(request):  # PR2020-04-15
    # function adds a spare row. A spare row contains the 'max negative allowed' and add refund as negative used,
    #logger.debug('-------------  entry_create_spare_row  ----------------- ')

# - check if there is already a spare row (do't use get_or_no
    # don't use get_or_none, it wil return None when multiple rows exist, therefore adding another record
    spare_row = Companyinvoice.objects.filter(
        company=request.user.company,
        cat=c.ENTRY_CAT_01_SPARE).first()

# - if no spare row is found: add row with default spare
    if spare_row is None:
        companyinvoice = Companyinvoice(
            company=request.user.company,
            cat=c.ENTRY_CAT_01_SPARE,
            entries=0,
            used=0,
            balance=0,
            entryrate=0,
            datepayment=None,
            dateexpired=None,
            expired=False,
            note=_('Spare')
        )
        companyinvoice.save(request=request)


# ===========  get_entry_balance
def get_entry_balance(request, comp_timezone):  # PR2019-08-01 PR2020-04-08
    # function returns avalable balance: sum of balance of paid and refund records
    # balance will be set to 0 when expired, no need to filter for expiration date
    #logger.debug('---  get_entry_balance  ------- ')

    balance = 0
    if request.user.company:
 # a. get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        today = datetime.now(timezone).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>

        crit = Q(company=request.user.company) & \
               Q(expired=False) & \
               (Q(cat=c.ENTRY_CAT_01_SPARE) | Q(cat=c.ENTRY_CAT_02_PAID) | Q(cat=c.ENTRY_CAT_03_BONUS))
        balance = Companyinvoice.objects.filter(crit).aggregate(Sum('balance'))
        # from https://simpleisbetterthancomplex.com/tutorial/2016/12/06/how-to-create-group-by-queries.html
    return balance


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_parent(table, ppk_int, update_dict, request):
    # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-07-30
    parent = None
    #logger.debug(' --- get_parent --- ')

    #logger.debug('table: ' + str(table))
    if table:
        if request.user.company:
            company = request.user.company
            if table in ('employee', 'customer'):
                parent = company
            elif ppk_int:
                if table == 'order':
                    parent = Customer.objects.get_or_none(id=ppk_int, company=company)
                elif table  in ('orderhour', 'scheme'):
                    parent = Order.objects.get_or_none(id=ppk_int, customer__company=company)
                elif table == 'emplhour':
                    parent = Orderhour.objects.get_or_none(id=ppk_int, order__customer__company=company)
                elif table in ('shift', 'team', 'schemeitem'):
                    parent = Scheme.objects.get_or_none(id=ppk_int, order__customer__company=company)
                elif table == 'teammember':
                    parent = Team.objects.get_or_none(id=ppk_int, scheme__order__customer__company=company)

            if parent:
                if 'id' not in update_dict:
                    update_dict['id'] = {}
                update_dict['id']['ppk'] = parent.pk
                update_dict['id']['table'] = table

    return parent


def get_instance(table, pk_int, parent, update_dict=None):
    # function returns instance of table PR2019-07-30
    #logger.debug('====== get_instance: ' + str(table) + ' pk_int: ' + str(pk_int) + ' parent: ' + str(parent))

    instance = None

    if table and pk_int and parent:
        if table == 'employee':
            instance = Employee.objects.get_or_none(id=pk_int, company=parent)
        elif table == 'customer':
            instance = Customer.objects.get_or_none(id=pk_int, company=parent)
        elif table == 'order':
            instance = Order.objects.get_or_none(id=pk_int, customer=parent)
        elif table == 'orderhour':
            instance = Orderhour.objects.get_or_none(id=pk_int, order=parent)
        elif table == 'scheme':
            instance = Scheme.objects.get_or_none(id=pk_int, order=parent)
        elif table == 'shift':
            instance = Shift.objects.get_or_none(id=pk_int, scheme=parent)
        elif table == 'team':
            instance = Team.objects.get_or_none(id=pk_int, scheme=parent)
        elif table == 'teammember':
            instance = Teammember.objects.get_or_none(id=pk_int, team=parent)
        elif table == 'schemeitem':
            instance = Schemeitem.objects.get_or_none(id=pk_int, scheme=parent)
        elif table == 'orderhour':
            instance = Orderhour.objects.get_or_none(id=pk_int, order=parent)
        elif table == 'emplhour':
            instance = Emplhour.objects.get_or_none(id=pk_int, orderhour=parent)

        if instance:
            if update_dict:
                if 'id' not in update_dict:
                    update_dict['id'] = {}
                update_dict['id']['pk'] = instance.pk
                update_dict['pk'] = instance.pk
                # update_dict['id']['table'] = table. This is added in get_parent
    return instance


def delete_instance(instance, update_dict, request, this_text=None):
    # function deletes instance of table,  PR2019-08-25
    delete_ok = False
    if instance:
        try:
            instance.delete(request=request)
        except:
            if this_text:
                msg_err = _('%(tbl)s could not be deleted.') % {'tbl': this_text}
            else:
                msg_err = _('This item could not be deleted.')
            update_dict['id']['error'] = msg_err
        else:
            update_dict['id']['deleted'] = True
            delete_ok = True
    # instance = None does not work here, it works outside this function
    # if delete_ok:
    #    instance = None

    return delete_ok