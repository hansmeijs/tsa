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

    activated = BooleanField(default=False)
    activatedat = DateTimeField(null=True)

    entryrate = IntegerField(default=0) # /10000 unit is currency (US$, EUR, ANG)

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

    def __str__(self):
        return self.code

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
    isaddition = BooleanField(default=False)  # additionrate = /10.000 unitless additionrate 10.000 = 100%
    istaxcode = BooleanField(default=False)  # taxrate = /10.000 unitless taxrate 600 = 6%

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

    interval = PositiveSmallIntegerField(default=0)

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
    sequence = IntegerField(null=True) #
    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    invoicecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

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
    ispaydate = BooleanField(default=False)
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
    excludepublicholiday = BooleanField(default=False)
    alsoonpublicholiday = BooleanField(default=False)

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

    address = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    zipcode = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    city = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    country = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    workhours = IntegerField(default=0)  # working hours per week * 60, unit is minute
    workdays = IntegerField(default=0)  # workdays per week * 1440, unit is minute (one day has 1440 minutes)
    leavedays = IntegerField(default=0)  # leave days per year, full time, * 1440, unit is minute (one day has 1440 minutes)

    functioncode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagecode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True, blank=True)
    paydatecode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None

    class Meta:
        ordering = [Lower('namelast'), Lower('namefirst')]

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
        # logger.debug("------ get_first_teammember_on_rosterdate---" + str(rosterdate_dte))

        teammember = None
        if team and rosterdate_dte:
            # filter teammmembers that have new_rosterdate within range datefirst/datelast
            crit = (Q(team=team)) & \
                   (Q(employee__isnull=False)) & \
                   (Q(employee__datefirst__lte=rosterdate_dte) | Q(employee__datefirst__isnull=True)) & \
                   (Q(employee__datelast__gte=rosterdate_dte) | Q(employee__datelast__isnull=True)) & \
                   (Q(datefirst__lte=rosterdate_dte) | Q(datefirst__isnull=True)) & \
                   (Q(datelast__gte=rosterdate_dte) | Q(datelast__isnull=True))
            # logger.debug(teammembers.query)
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

    rosterdate = DateField(db_index=True)
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
        # logger.debug(' --- get_rosterdate_within_cycle --- ' + str(new_rosterdate_dte) + str(type(new_rosterdate_dte)))

        new_si_rosterdate_naive = None

        if new_rosterdate_dte:
            si_rosterdate_naive = f.get_datetime_naive_from_dateobject(self.rosterdate)
            new_rosterdate_naive = f.get_datetime_naive_from_dateobject(new_rosterdate_dte)
            # logger.debug('si_rosterdate_naive: ' + str(si_rosterdate_naive) + ' ' + str(type(si_rosterdate_naive)))
            # logger.debug('new_rosterdate_naive: ' + str(new_rosterdate_naive) + ' ' + str(type(new_rosterdate_naive)))

            datediff = si_rosterdate_naive - new_rosterdate_naive  # datediff is class 'datetime.timedelta'
            datediff_days = datediff.days  # <class 'int'>
            # logger.debug('datediff_days: ' + str(datediff_days))

            if datediff_days == 0:
                new_si_rosterdate_naive = si_rosterdate_naive
            else:
                scheme = Scheme.objects.get_or_none(pk=self.scheme.id)
                if scheme:
                    # logger.debug('scheme: ' + str(scheme.code))
                    # skip if cycle = 0 (once-only)
                    if scheme.cycle:
                        cycle_int = scheme.cycle
                        # logger.debug('cycle_int: ' + str(cycle_int))

                        # cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
                        # // operator: Floor division - division that results into whole number adjusted to the left in the number line
                        index = datediff_days // cycle_int
                        # logger.debug('index: ' + str(index) + ' ' + str(type(index)))
                        # adjust si_rosterdate when index <> 0
                        if index == 0:
                            new_si_rosterdate_naive = si_rosterdate_naive
                        else:
                            # negative index adds positive day and vice versa
                            days_add = cycle_int * index * -1
                            # logger.debug('days_add: ' + str(days_add) + ' ' + str(type(days_add)))
                            new_si_rosterdate_naive = si_rosterdate_naive + timedelta(days=days_add)
        # logger.debug('new_si_rosterdate_naive: ' + str(new_si_rosterdate_naive) + ' ' + str(type(new_si_rosterdate_naive)))
        # new_si_rosterdate_naive: 2019-08-29 00:00:00 <class 'datetime.datetime'>
        return new_si_rosterdate_naive


class Orderhour(TsaBaseModel):
    objects = TsaManager()

    order = ForeignKey(Order, related_name='orderhours', on_delete=PROTECT)

    customerlog = ForeignKey(Customerlog, related_name='+', on_delete=SET_NULL, null=True)
    orderlog = ForeignKey(Orderlog, related_name='+', on_delete=SET_NULL, null=True)

    # TODO check if schemeitem is necessary, I dont think so PR2020-02-15
    schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True)

    rosterdate = DateField(db_index=True)
    cat = PositiveSmallIntegerField(default=0)

    isabsence = BooleanField(default=False)
    isrestshift = BooleanField(default=False)
    issplitshift = BooleanField(default=False)
    isbillable = BooleanField(default=False)

    shift = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    status = PositiveSmallIntegerField(db_index=True, default=0)

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
    isabsence = BooleanField(default=False)
    isrestshift = BooleanField(default=False)
    isreplacement = BooleanField(default=False)
    datepart = PositiveSmallIntegerField(default=0) # 1=night, 2 = morning, 3 = afternoon, 4 = evening, 0 = undefined

    paydate = DateField(db_index=True, null=True)
    lockedpaydate = BooleanField(default=False)

    shift = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    timestart = DateTimeField(db_index=True, null=True, blank=True)
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    timeduration = IntegerField(default=0)
    breakduration = IntegerField(default=0)
    plannedduration = IntegerField(default=0)
    billingduration = IntegerField(default=0)

    offsetstart = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    offsetend = SmallIntegerField(null=True)  # unit is minute, offset from midnight

    wagerate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    wagefactor = IntegerField(default=0) # /1.000.000 unitless, 0 = factor 100%  = 1.000.000)
    wage = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    pricerate = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG)
    additionrate = IntegerField(default=0)  # additionrate = /10.000 unitless additionrate 10.000 = 100%
    taxrate = IntegerField(default=0)  # taxrate = /10.000 unitless taxrate 600 = 6%
    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    addition = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    tax = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)

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
        # logger.debug('---  get jsonsetting  ------- ')
        setting = None
        if company and key_str:
            row = cls.objects.get_or_none(company=company, key=key_str)
            if row:
                if row.jsonsetting:
                    setting = row.jsonsetting
        if setting is None:
            if default_setting:
                setting = default_setting
        return setting

    @classmethod
    def set_jsonsetting(cls, key_str, jsonsetting, company): #PR2019-03-09
        # logger.debug('---  set_jsonsettingg  ------- ')
        # logger.debug('key_str: ' + str(key_str) + ' jsonsetting: ' + str(jsonsetting))
        # get
        if company and key_str:
            # don't use get_or_none, gives none when multiple settings exists and will create extra setting.
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                row.jsonsetting = jsonsetting
            else:
                if jsonsetting:
                    row = cls(company=company, key=key_str, jsonsetting=jsonsetting)
            row.save()
        # logger.debug('row.jsonsetting: ' + str(row.jsonsetting))

    @classmethod
    def get_setting(cls, key_str, company, default_setting=None): # PR2019-03-09 PR2019-08-17
        # function returns value of setting row that match the filter
        # logger.debug('---  get_setting  ------- ')
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
        # logger.debug('---  set_setting  ------- ')
        # logger.debug('key_str: ' + str(key_str) + ' setting: ' + str(setting))
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

        # logger.debug('row.setting: ' + str(row.setting))

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
# company entries

# - add duration_sum to Companyinvoice
def add_duration_to_companyinvoice(rosterdate_dte, duration_sum, is_subtract, request, comp_timezone):  # PR2020-04-07
    logger.debug('===========  add_duration_to_companyinvoice  ==================== ')
    logger.debug('duration_sum: ' + str(duration_sum))
    logger.debug('is_subtract: ' + str(is_subtract))
    if duration_sum:
        msg = None
        if is_subtract:
            duration_sum = duration_sum * -1
            msg = _('Roster of %(fld)s removed.') % {'fld': rosterdate_dte.isoformat()}
        else:
            msg = _('Roster of %(fld)s added.') % {'fld': rosterdate_dte.isoformat()}
        company = request.user.company
        entry_rate = company.entryrate
        entry = Companyinvoice(
            company=request.user.company,
            cat=c.ENTRY_CAT_00_CHARGED,
            entries=duration_sum,
            used=duration_sum,
            balance=0,
            entryrate=entry_rate,
            datepayment=rosterdate_dte,
            dateexpired=None,
            expired=False,
            note=msg
        )
        entry.save(request=request)

# subtract entries from balance
        entry_balance_subtract(duration_sum, request, comp_timezone)

# ===========  get_entry_balance
def get_entry_balance(request, comp_timezone):  # PR2019-08-01 PR2020-04-08
    # function returns avalable balance: sum of balance of paid and refund records
    # balance will be set to 0 when expired, no need to filter for expiration date
    logger.debug('---  get_entry_balance  ------- ')

    balance = 0
    if request.user.company:
 # a. get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        today = datetime.now(timezone).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>

        crit = Q(company=request.user.company) & \
               Q(expired=False) & \
               (Q(cat=c.ENTRY_CAT_01_REFUND) | Q(cat=c.ENTRY_CAT_02_PAID))
        balance = Companyinvoice.objects.filter(crit).aggregate(Sum('balance'))
        # from https://simpleisbetterthancomplex.com/tutorial/2016/12/06/how-to-create-group-by-queries.html
    return balance


def entry_balance_subtract(entries_tobe_subtracted, request, comp_timezone):  # PR2019-08-04  PR2020-04-08
    # function subtracts entries from balance: refund first, then paid: oldest expiration date first
    logger.debug('-------------  entry_balance_subtract  ----------------- ')
    logger.debug('entries_tobe_subtracted ' + str(entries_tobe_subtracted))

    if request.user.company:
 # a. get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        today = datetime.now(timezone).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>
        logger.debug('today: ' + str(today) + ' ' + str(type(today)))

        subtotal = entries_tobe_subtracted
        if subtotal > 0:
            crit = Q(company=request.user.company) & \
                   (Q(cat=c.ENTRY_CAT_01_REFUND) | Q(cat=c.ENTRY_CAT_02_PAID))
            invoices = Companyinvoice.objects.filter(crit).order_by('cat', 'dateexpired')

            save_changes = False
            for invoice in invoices:
# - check if invoice is expired. If so: et expired=True and balance=0
                logger.debug('invoice: ' + str(invoice) + ' ' + str(type(invoice)))
                if invoice.dateexpired and invoice.dateexpired < today:
                    invoice.expired = True
                    invoice.balance = 0
                    save_changes = True
                else:
                    if subtotal:
                        saved_used = invoice.used
                        saved_balance = invoice.balance
# - if balance sufficient: subtract all from balance, else subtract balance
                        # field entries: amount of paid entries, bonus entries or refund entries
                        # field used: amount of used entries or refund entries
                        # field balance: entries - used
                        if saved_balance:
                            # subtract subtotal from balance, but never more than balance
                            subtract = subtotal if saved_balance >= subtotal else saved_balance
                            logger.debug('subtract: ' + str(subtract) + ' ' + str(type(subtract)))
                            invoice.balance = saved_balance - subtract
                            invoice.used = saved_used + subtract
                            subtotal = subtotal - subtract
                            save_changes = True
                            logger.debug('invoice.balance ' + str(invoice.balance))
                if save_changes:
                    invoice.save(request=request)

# - if any entries left: subtract from refund (will be negative). Create refund record if not exists
# - if subtotal is negative it is a refund. Entries will be added to ENTRY_CAT_REFUND
        if subtotal:
            logger.debug('subtotal: ' + str(subtotal) + ' ' + str(type(subtotal)))
            refund_row = Companyinvoice.objects.filter(
                company=request.user.company,
                cat=c.ENTRY_CAT_01_REFUND).first()
            logger.debug('refund_row: ' + str(refund_row) + ' ' + str(type(refund_row)))
            if refund_row:
                saved_entries = getattr(refund_row, 'entries', 0)
                refund_row.entries = saved_entries - subtotal
                refund_row.used = saved_entries - subtotal
                refund_row.datepayment = today
                refund_row.save(request=request)
                logger.debug('saved_entries: ' + str(saved_entries) + ' ' + str(type(saved_entries)))
            else:
                subtotal_negative = subtotal * -1
                logger.debug('subtotal_negative: ' + str(subtotal_negative) + ' ' + str(type(subtotal_negative)))
                refund_row = Companyinvoice(
                            company=request.user.company,
                            cat=c.ENTRY_CAT_01_REFUND,
                            entries=subtotal_negative,
                            used=subtotal_negative,
                            balance=0,
                            entryrate=0,
                            datepayment=today,
                            dateexpired=None,
                            expired=False,
                            note=None
                        )
                refund_row.save(request=request)
                logger.debug('refund_row.save: ' + str(refund_row) + ' ' + str(type(refund_row)))

            logger.debug('refund_row.entries: ' + str(refund_row.entries) + ' ' + str(type(refund_row.entries)))

def create_invoice(request, cat, entries=0, entryrate=0, datepayment=None, dateexpired=None, note=None):  # PR2019-08-05
    invoice = None
    if request.user.company:
        invoice = Companyinvoice(company=request.user.company, cat=cat)
        if entries:
            invoice.entries=entries
            invoice.balance=entries
        if entryrate:
            invoice.entryrate=entryrate
        if datepayment is not None:
            invoice.datepayment=datepayment
        if dateexpired is not None:
            invoice.dateexpired=dateexpired
        if note is not None:
            invoice.note=note
        invoice.save(request=request)
    return invoice


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_parent(table, ppk_int, update_dict, request):
    # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-07-30
    parent = None
    # logger.debug(' --- get_parent --- ')

    # logger.debug('table: ' + str(table))
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
    # logger.debug('====== get_instance: ' + str(table) + ' pk_int: ' + str(pk_int) + ' parent: ' + str(parent))

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