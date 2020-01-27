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

    invoicedates = JSONField(null=True)  # stores default invoice dates

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @property
    def companyprefix(self):
        #PR2019-03-13 CompanyPrefix is added at front of username, to make usernames unique per company
        id_str = '000000' + str(self.pk)
        return id_str[-6:]


class Taxcode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='taxcodes', on_delete=PROTECT)

    taxrate = IntegerField(default=0)  # /10000 unitless   taxrate 600 = 6%

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None
    locked = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Customer(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='customers', on_delete=PROTECT)
    # shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacemenet, 512=absence, 1024=rest, 4096=template
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

    invoicedates = JSONField(null=True)  # stores invoice dates for this customer

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Order(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='orders', on_delete=PROTECT)
    # shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacemenet, 512=absence, 1024=rest, 4096=template
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

    sequence = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG) per hour
    priceratejson = JSONField(null=True) # /100 unit is currency (US$, EUR, ANG) per hour
    additionjson = JSONField(null=True)  # /10000 unitless   additionrate 2500 = 25%

    invoicedates = JSONField(null=True)  # stores invoice dates for this order

    taxcode = ForeignKey(Taxcode, related_name='orders', on_delete=PROTECT, null=True, blank=True)

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @property
    def id_str(self):
        return 'id_ord_' + self.pk


class Object(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='+', on_delete=PROTECT)

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
    company = ForeignKey(Company, related_name='wagecodes', on_delete=PROTECT)

    wagerate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None
    locked = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Wagefactor(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='wagefactors', on_delete=PROTECT)

    wagefactorrate = IntegerField(default=0)  # /10.000

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None
    locked = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Timecode(TsaBaseModel): # Workingday, Saturday, SUnday, Public Holiday, general holiday, + wagefactor
    objects = TsaManager()
    company = ForeignKey(Company, related_name='timecodes', on_delete=PROTECT)
    wagefactor = ForeignKey(Wagefactor, related_name='timecodes', on_delete=SET_NULL, null=True, blank=True)


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

    cycle = PositiveSmallIntegerField(default=7)
    billable = SmallIntegerField(default=0)  # 0 = no override, 1= override NotBillable, , 2= override Billable

    excludecompanyholiday = BooleanField(default=False)
    excludepublicholiday = BooleanField(default=False)

    priceratejson = JSONField(null=True) # /100 unit is currency (US$, EUR, ANG) per hour
    additionjson = JSONField(null=True)  # /10000 unitless   additionrate 2500 = 25%

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

    wagefactor = ForeignKey(Wagefactor, related_name='shifts', on_delete=SET_NULL, null=True, blank=True)
    priceratejson = JSONField(null=True) # /100 unit is currency (US$, EUR, ANG) per hour
    additionjson = JSONField(null=True)  # /10000 unitless   additionrate 2500 = 25%

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

    company = ForeignKey(Company, related_name='+', on_delete=PROTECT)

    namelast = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH)
    namefirst = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    # deprecated
    prefix = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    email = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    identifier = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    address = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    zipcode = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    city = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)
    country = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    payrollcode = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    wagerate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    wagecode = ForeignKey(Wagecode, related_name='eployees', on_delete=PROTECT, null=True, blank=True)
    workhours = IntegerField(default=0)  # working hours per week * 60, unit is minute
    workdays = IntegerField(default=0)  # workdays per week * 1440, unit is minute (one day has 1440 minutes)
    leavedays = IntegerField(default=0)  # leave days per year, full time, * 1440, unit is minute (one day has 1440 minutes)

    priceratejson = JSONField(null=True) # /100 unit is currency (US$, EUR, ANG) per hour
    additionjson = JSONField(null=True)  # /10000 unitless   additionrate 2500 = 25%

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None

    class Meta:
        ordering = [Lower('namelast'), Lower('namefirst')]

    def __str__(self):
        self.n_last = str(self.namelast)
        self.n_first = str(self.namefirst) if self.namefirst else ''
        self.n_prefix = str(self.prefix) if self.prefix else ''
        return ' '.join((self.n_first, self.n_prefix, self.n_last))


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
    istemplate = BooleanField(default=False)

    wagefactor = IntegerField(default=0) # /10000 unitless, 0 = factor 100%  = 10.000)

    priceratejson = JSONField(null=True) # /100 unit is currency (US$, EUR, ANG) per hour
    additionjson = JSONField(null=True)  # /10000 unitless additionrate 2500 = 25%
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

            # order_by datelast, null comes last (with Coalesce changes to '2500-01-01'
            # - get employee with earliest endatlookup employee in teammembers

            # for testing:
            # teammembers = cls.objects.annotate(
            #     new_datelast=Coalesce('datelast', Value(datetime(2500, 1, 1))
            #                           )).filter(crit).order_by('new_datelast')
            # for member in teammembers:
            #     employee = getattr(member, 'employee')
            #     if employee:
            #        logger.debug('test employee: ' + str(employee) + ' datefirst: ' + str(member.datefirst) + ' datelast: ' + str(member.datelast))

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

    cat = PositiveSmallIntegerField(default=0)
    isabsence = BooleanField(default=False)
    issingleshift = BooleanField(default=False)
    istemplate = BooleanField(default=False)
    billable = SmallIntegerField(default=0)  # 0 = no override, 1= override NotBillable, , 2= override Billable
    rosterdate = DateField(db_index=True)
    iscyclestart = BooleanField(default=False)

    offsetstart = SmallIntegerField(null=True)  # only for absence
    offsetend = SmallIntegerField(null=True)  # only for absence
    breakduration = IntegerField(default=0) # unit is minut
    timeduration = IntegerField(default=0)  # unit is minute

    priceratejson = JSONField(null=True) # /100 unit is currency (US$, EUR, ANG) per hour
    additionjson = JSONField(null=True)  # /10000 unitless   additionrate 2500 = 25%

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
    schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True, blank=True)

    rosterdate = DateField(db_index=True)
    cat = PositiveSmallIntegerField(default=0)
    isabsence = BooleanField(default=False)

    yearindex = PositiveSmallIntegerField(default=0)
    monthindex = PositiveSmallIntegerField(default=0)
    weekindex = PositiveSmallIntegerField(default=0)
    payperiodindex = PositiveSmallIntegerField(default=0)

    isbillable = BooleanField(default=False)
    isrestshift = BooleanField(default=False)
    shift = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    duration = IntegerField(default=0)  # unit is hour * 100
    status = PositiveSmallIntegerField(db_index=True, default=0)

    pricerate = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG)
    additionrate = IntegerField(default=0)  # /10000 unitless   additionrate 2500 = 25%
    taxrate = IntegerField(default=0)  # /10000 unitless   taxrate 600 = 6%
    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    tax = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)

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

    orderhour = ForeignKey(Orderhour, related_name='emplhours', on_delete=PROTECT)
    employee = ForeignKey(Employee, related_name='emplhours', on_delete=PROTECT, null=True, blank=True)

    rosterdate = DateField(db_index=True)
    cat = PositiveSmallIntegerField(default=0)
    isabsence = BooleanField(default=False)
    isreplacement = BooleanField(default=False)

    yearindex = PositiveSmallIntegerField(default=0)
    monthindex = PositiveSmallIntegerField(default=0)
    weekindex = PositiveSmallIntegerField(default=0)
    payperiodindex = PositiveSmallIntegerField(default=0)

    # emplhour isrestshift not in use
    isrestshift = BooleanField(default=False)
    shift = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    timestart = DateTimeField(db_index=True, null=True, blank=True)
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    timeduration = IntegerField(default=0)
    breakduration = IntegerField(default=0)
    plannedduration = IntegerField(default=0)

    wagerate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    wagefactor = IntegerField(default=0) # /10000 unitless, 0 = factor 100%  = 10.000)
    wage = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    pricerate = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG)
    additionrate = IntegerField(default=0)  # /10000 unitless   additionrate 2500 = 25%

    status = PositiveSmallIntegerField(db_index=True, default=0)
    overlap = SmallIntegerField(default=0)  # stores if record has overlapping emplhour records: 1 overlap start, 2 overlap end, 3 full overlap

    # combination rosterdate + schemeitemid + teammemberid is used to identify schemeitem / teammember that is used to create this emplhour
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

    emplhour = ForeignKey(Emplhour, related_name='emplhours', on_delete=CASCADE)

    timestart = DateTimeField(db_index=True, null=True, blank=True)
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    breakduration = IntegerField(default=0)
    status = PositiveSmallIntegerField(db_index=True, default=0)
    note = CharField(max_length=2048, null=True, blank=True)

    class Meta:
        ordering = ['modifiedat']

    name = None
    datefirst = None
    datelast = None
    inactive = None


class Companyinvoice(TsaBaseModel):  # PR2019-04-06
    objects = TsaManager()
    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)

    cat = PositiveSmallIntegerField(default=0)  # 0 = grace-entries, 1 = bonus-entries, 2 = paid-entries

    entries = IntegerField(default=0)
    used = IntegerField(default=0)
    balance= IntegerField(default=0)
    entryrate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    datepayment = DateField(null=True, blank=True)
    dateexpired = DateField(db_index=True, null=True, blank=True)
    expired = BooleanField(default=False)
    note = CharField(db_index=True, max_length=c.NAME_MAX_LENGTH)

    class Meta:
        ordering = ['datepayment']

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
# ===========  get_entry_balance
def get_entry_balance(request, comp_timezone):  # PR2019-08-01
    # function returns avalable balance
    # logger.debug('---  get_entry_balance  ------- ')

    balance = 0
    if request.user.company:
 # a. get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        today = datetime.now(timezone).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>

        crit = Q(company=request.user.company) & \
               (Q(dateexpired__gte=today) | Q(dateexpired__isnull=True))
        balance = Companyinvoice.objects.filter(crit).aggregate(Sum('balance'))
        # from https://simpleisbetterthancomplex.com/tutorial/2016/12/06/how-to-create-group-by-queries.html
    return balance


def entry_balance_subtract(entries_tobe_subtracted, request, comp_timezone):  # PR2019-08-04
    # function returns avalable balance
    # logger.debug('---  entry_balance_subtract  ------- ')
    # logger.debug('entries_tobe_subtracted ' + str(entries_tobe_subtracted))

    balance = 0
    if request.user.company:


 # a. get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        today = datetime.now(timezone).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>

        if entries_tobe_subtracted:
            subtotal = entries_tobe_subtracted
            crit = Q(company=request.user.company) & \
                   Q(expired=False) & \
                   Q(cat__gt=c.ENTRY_CAT_00_GRACE) # 0 = grace-entry, 1 = bonus-entries, 2 = paid-entries
            invoices = Companyinvoice.objects.filter(crit)
            # TODO check order and filter
            save_changes = False
            for invoice in invoices:
                # check if invoice is expired. If so: et expired=True and balance=0
                if invoice.dateexpired and invoice.dateexpired < today:
                    invoice.expired = True
                    invoice.balance = 0
                    save_changes = True
                else:
                    if subtotal:
                        saved_used = invoice.used
                        saved_balance = invoice.balance
                        # if balance sufficient: subtract all from balance, else subtract balance
                        if saved_balance:
                            # subtract subtotal from balance, but never more than balance
                            subtract = subtotal if saved_balance >= subtotal else saved_balance
                            invoice.balance = saved_balance - subtract
                            invoice.used = saved_used + subtract
                            subtotal = subtotal - subtract
                            save_changes = True
                            # logger.debug('invoice.balance ' + str(invoice.balance))
                if save_changes:
                    invoice.save(request=request)
            # if any entries_tobe_subtracted left: subtract from garce entries
            if subtotal:
                grace_invoice = get_or_create_grace_invoice(request)

                saved_used = grace_invoice.used
                saved_balance = grace_invoice.balance
                grace_invoice.balance = saved_balance - subtotal
                grace_invoice.used = saved_used + subtotal
                grace_invoice.save(request=request)

                # logger.debug('grace.balance ' + str(grace_invoice.balance))


def get_or_create_grace_invoice(request):  # PR2019-08-13
    # 0 = grace-entry, 1 = bonus-entries, 2 = paid-entries
    invoice = None
    if request.user.company:
        invoice = Companyinvoice.objects.get_or_none(cat=c.ENTRY_CAT_00_GRACE, company=request.user.company)
        if invoice is None:
            invoice = Companyinvoice(cat=c.ENTRY_CAT_00_GRACE, company=request.user.company)
            invoice.save(request=request)
    return invoice


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
    #if delete_ok:
    #    instance = None

    return delete_ok