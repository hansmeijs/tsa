# PR2019-02-28

# PR2021-03-09 Deprecation warning: django.contrib.postgres.fields import JSONField  will be removed from Django 4
# instead use: django.db.models import JSONField (is added in Django 3)
# was: from django.contrib.postgres.fields import JSONField

from django.db import connection

from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, SmallIntegerField, IntegerField, \
    DateField, DateTimeField, FileField, JSONField, Q, Value

from django.db.models.functions import Lower, Coalesce
from django.utils.translation import ugettext_lazy as _

from datetime import datetime, timedelta

from tsap.settings import AUTH_USER_MODEL, TIME_ZONE
from tsap import constants as c
from tsap import functions as f
from tsap import settings as s

from tsap.storage_backends import PrivateMediaStorage

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
    modifiedat = DateTimeField(db_index=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # skip modifiedby and modifiedat when subtracting balance PR2019-04-09

        # get now without timezone
        # timezone.now() is timezone aware
        # datetime.now() is timezone naive. PR2018-06-07
        now_utc_naive = datetime.utcnow()
        # convert now to timezone utc
        now_utc = now_utc_naive.replace(tzinfo=pytz.utc)

        # skip updating modifiedby and modifiedat when no request (issytem update of schemeitem, maybe other models as well)
        if 'request' in kwargs:
            self.request = kwargs.pop('request', None)
            if self.request.user:
                self.modifiedby = self.request.user
                self.company = self.request.user.company

                # save username in self.modifiedbyusername when this field exists PR2020-09-18
                try:
                    if hasattr(self, 'modifiedbyusername'):
                        self.modifiedbyusername = self.request.user.username_sliced
                except:
                    pass

        # put now_utc in Companysettings (only when table is emplhour) PR2020-08-12
                key = 'last_emplhour_updated'
                if key in kwargs:
                    self.set_datetimesetting = kwargs.pop('last_emplhour_updated', False)
                    if self.set_datetimesetting:
                        Companysetting.set_datetimesetting(key, now_utc, self.company)

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
        # save to logfile before deleting record happens outside this function
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

    # NIU PR2021-05-09
    def modifiedat_str(self,  lang):  # PR2019-03-23
        # This doesn't work in template tags
        dte_str = ''
        if self.modifiedat:
            dte_str = f.get_date_longstr_from_dte(self.modifiedat, lang)
        return dte_str


class Company(TsaBaseModel):
    objects = TsaManager()

    identifier = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    issystem = BooleanField(default=False)
    timezone = CharField(max_length=c.NAME_MAX_LENGTH, default=TIME_ZONE)
    interval = PositiveSmallIntegerField(default=c.TIMEINTERVAL_DEFAULT)
    timeformat = CharField(max_length=4, choices=c.TIMEFORMAT_CHOICES, default=c.TIMEFORMAT_24h)

    cat = PositiveSmallIntegerField(default=0)
    billable = SmallIntegerField(default=0)  # billable can be 0, 1 or 2: 0 = get value of parent, 1 = not billable, 2 = billable

    # when override=False: use employee_pricecode if not None PR2020-11-23
    # when override=True:  use use shift_pricecode (or order_pricecod , company_pricecod) instead of employee_pricecode
    pricecodeoverride = BooleanField(default=False)

    # cannot use Foreignkey, because Pricecode has field company_id
    pricecode_id = IntegerField(null=True)
    additioncode_id = IntegerField(null=True)
    taxcode_id = IntegerField(null=True)

    invoicecode_id = IntegerField(null=True)
    wagefactorcode_id = IntegerField(null=True)

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

    def get_companysetting(cls, key_str, default_setting=None): # PR2019-03-09 PR2019-08-17   PR2021-01-27
        # function returns value of jsonsetting row that match the filter

        setting_dict = {}
        row_jsonsetting = None
        try:
            if cls and key_str:
                row = Companysetting.objects.filter(company=cls, key=key_str).order_by('-id').first()
                if row:
                    row_jsonsetting = row.jsonsetting
                    if row_jsonsetting:
                        setting_dict = row_jsonsetting
            if row_jsonsetting is None:
                if default_setting:
                    setting_dict = default_setting
        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            logger.error('key_str: ', str(key_str))
            logger.error('row_jsonsetting: ', str(row_jsonsetting))
        return setting_dict

    def set_companysetting(cls, key_str, jsonsetting): # PR2019-03-09 PR2021-01-27
        #logger.debug('---  set_jsonsettingg  ------- ')
        #logger.debug('key_str: ' + str(key_str) + ' jsonsetting: ' + str(jsonsetting))
        try:
            if cls and key_str:
                # don't use get_or_none, gives none when multiple settings exists and will create extra setting.
                row = Companysetting.objects.filter(company=cls, key=key_str).order_by('-id').first()
                if row:
                    row.jsonsetting = jsonsetting
                else:
                    if jsonsetting:
                        row = Companysetting(company=cls, key=key_str, jsonsetting=jsonsetting)
                row.save()

        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            logger.error('key_str: ', str(key_str))
            logger.error('jsonsetting: ', str(jsonsetting))


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

    def has_locked_paydatecode_emplhours(self):  # PR2020-06-26 PR2021-06-09
        # function checks if this paydatecode has emplhours with payrollpublished is not None
        has_locked_emplhours = False
        if self.pk:
            has_locked_emplhours = Emplhour.objects.filter(
                paydatecode_id=self.pk,
                payrollpublished_id__isnull=False
            ).exists()
        return has_locked_emplhours


class Paydateitem(TsaBaseModel):
    objects = TsaManager()
    paydatecode = ForeignKey(Paydatecode, related_name='+', on_delete=CASCADE)

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

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None
    name = None

    description = CharField(max_length=c.USER_LASTNAME_MAX_LENGTH, null=True, blank=True)

    # PR20202-07-18 removed:  sequence, rate. Rename iswage to iswagecode. leave 'name' for notes??
    # wagerate    /100 unit currency   wagerate 10.000 = 100 US$
    # wagefactor  /1.000.000 unitless, wagefactor 100%  = 1.000.000
    wagerate = IntegerField(default=0)
    #sequence = PositiveSmallIntegerField(default=0)
    #rate = JSONField(null=True)  # stores price plus startdate

    # TODO key will replace iswagecode etc.
    key = CharField(db_index=True, max_length=4)

    iswagecode = BooleanField(default=False)
    iswagefactor = BooleanField(default=False)
    isfunctioncode = BooleanField(default=False)
    isallowance = BooleanField(default=False)
    isdefault = BooleanField(default=False)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.code

    def has_lockedwagecode_emplhours(self):  # PR2020-07-14 PR2021-06-09
        # function checks if this wagecode has emplhours with payrollpublished is not None
        has_locked_emplhours = False
        if self.pk:
            has_locked_emplhours = Emplhour.objects.filter(
                wagecode_id=self.pk,
                payrollpublished_id__isnull=False
        ).exists()
        return has_locked_emplhours

    def has_lockedfunctioncode_emplhours(self):  # PR2020-07-18 PR2021-06-09
        # function checks if this functioncode has emplhours with payrollpublished is not None
        has_locked_emplhours = False
        if self.pk:
            has_locked_emplhours = Emplhour.objects.filter(
                functioncode_id=self.pk,
                payrollpublished_id__isnull=False
            ).exists()
        return has_locked_emplhours

    def has_lockedwagefactorcode_emplhours(self):  # PR2021-06-07 PR2021-06-09
        # function checks if this functioncode has emplhours with payrollpublished is not None
        has_locked_emplhours = False
        if self.pk:
            has_locked_emplhours = Emplhour.objects.filter(
                wagefactorcode_id=self.pk,
                payrollpublished_id__isnull=False
            ).exists()
        return has_locked_emplhours

class Wagecodeitem(TsaBaseModel):
    objects = TsaManager()
    wagecode = ForeignKey(Wagecode, related_name='+', on_delete=CASCADE)
    # wagefactor has no wagecode items PR2021-02-15
    # order on datefirst, descending: ORDER BY last_updated DESC NULLS LAST
    code = None
    name = None
    locked = None

    wagerate = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG)

    class Meta:
        ordering = ['-datefirst']


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
    inactive = None
    locked = None

    isprice = BooleanField(default=False)
    isaddition = BooleanField(default=False)  # additionrate = /10.000 unitless additionrate 10.000 = 100%, or amount 10.000 = $100.00
    istaxcode = BooleanField(default=False)  # taxrate = /10.000 unitless taxrate 600 = 6%

    pricerate = IntegerField(null=True) # /100 unit is currency (US$, EUR, ANG) EUR 100 = 10.000

    class Meta:
        ordering = ['-datefirst']


# NOT IN USE PR2021-01-27
"""
class Timecode(TsaBaseModel): # Workingday, Saturday, SUnday, Public Holiday, general holiday, + wagefactor
    objects = TsaManager()
    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)
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
"""

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


# NOT IN USE PR2021-01-27
"""
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
"""

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

    billable = SmallIntegerField(default=0)   # billable can be 0, 1 or 2: 0 = get value of parent, 1 = not billable, 2 = billable
    sequence = IntegerField(null=True) # only used in abscat PR2020-06-11 contains value of 'Priority'

    # when override=False: use employee_pricecode if not None PR2020-11-23
    # when override=True:  use use shift_pricecode (or order_pricecod , company_pricecod) instead of employee_pricecode
    pricecodeoverride = BooleanField(default=False)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    invoicecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    # wagefactor: only used in absence, to set absence wagefactor in emplhour PR2021-01-27
    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactoronsat = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactoronsun = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactoronph = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)

    # nohoursonweekday etc in table order is only used in absence, to skip hours in emplhour PR2020-06-09
    nohoursonweekday = BooleanField(default=False)
    nohoursonsaturday = BooleanField(default=False)
    nohoursonsunday = BooleanField(default=False)
    nohoursonpublicholiday = BooleanField(default=False)

    hasnote = BooleanField(default=False)  # hasnotes will show a note icon on the roster page

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


class Ordernote(TsaBaseModel):
    objects = TsaManager()

    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)
    note = CharField(max_length=2048, null=True, blank=True)

    class Meta:
        ordering = ['-modifiedat']

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Published(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)

    filename = CharField(max_length=255, null=True)

    file = FileField(storage=PrivateMediaStorage(), null=True)

    datepublished = DateField()
    status = PositiveSmallIntegerField(default=0)
    recordcount = IntegerField(default=0)

    ispayroll = BooleanField(default=False)
    isinvoice = BooleanField(default=False)

    code = None

    locked = None
    inactive = None


class Scheme(TsaBaseModel):
    objects = TsaManager()
    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)
    cat = PositiveSmallIntegerField(default=0)  # order cat = # 00 = normal, 10 = internal, 20 = rest, 30 = absence, 90 = template
    isabsence = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    cycle = PositiveSmallIntegerField(default=7)  # default cycle is one week, min="1" max="28"

    excludecompanyholiday = BooleanField(default=False)
    divergentonpublicholiday = BooleanField(default=False)
    excludepublicholiday = BooleanField(default=False)

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
    billable = SmallIntegerField(default=0)  # billable can be 0, 1 or 2: 0 = get value of parent, 1 = not billable, 2 = billable

    offsetstart = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    offsetend = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    breakduration = IntegerField(default=0) # unit is minute
    timeduration = IntegerField(default=0)  # unit is minute

    # TODO nohoursonweekday etc in table shift is not in use yet, nohour... in table order is only used in absence
    nohoursonweekday = BooleanField(default=False)
    nohoursonsaturday = BooleanField(default=False)
    nohoursonsunday = BooleanField(default=False)
    nohoursonpublicholiday = BooleanField(default=False)

    # when override=False: use employee_pricecode if not None PR2020-11-23
    # when override=True:  use use shift_pricecode (or order_pricecod , company_pricecod) instead of employee_pricecode
    pricecodeoverride = BooleanField(default=False)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactoronsat = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactoronsun = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactoronph = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)

    def __str__(self):
        return self.code


class Shiftallowance(TsaBaseModel):
    objects = TsaManager()

    shift = ForeignKey(Shift, related_name='+', on_delete=CASCADE)
    allowancecode = ForeignKey(Wagecode, related_name='+', on_delete=PROTECT)

    key = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH)
    quantity = IntegerField(default=0)  # quantity = /10.000 unitless (10.000 = 100%)

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


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

    workhoursperweek = IntegerField(default=0)  # renamed. Was workhours. Working hours per week * 60, unit is minute. 40 hours = 2400 'workhours'
    workminutesperday = IntegerField(default=0)  # working minutes per day * 60, unit is minute. 8 hours = 480 workminutes
    # workdays = IntegerField(default=0)  # deprecated: removed: workdays per week * 1440, unit is minute. 5 days = 7200 workdays
    leavedays = IntegerField(default=0)  # leave days per year, full time, * 1440, unit is minute (one day has 1440 minutes)

    functioncode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagecode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True, blank=True)
    paydatecode = ForeignKey(Paydatecode, related_name='+', on_delete=SET_NULL, null=True)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    # PR2020-11-23 removed: additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    hasnote = BooleanField(default=False)  # hasnotes will show a note icon on the roster page

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


class Employeenote(TsaBaseModel):
    objects = TsaManager()

    employee = ForeignKey(Employee, related_name='+', on_delete=CASCADE)
    note = CharField(max_length=2048, null=True, blank=True)

    class Meta:
        ordering = ['-modifiedat']

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Teammember(TsaBaseModel):
    objects = TsaManager()

    team = ForeignKey(Team, related_name='teammembers', on_delete=CASCADE)
    employee = ForeignKey(Employee, related_name='teammembers', on_delete=SET_NULL, null=True, blank=True)
    replacement = ForeignKey(Employee, related_name='replacements', on_delete=SET_NULL, null=True, blank=True)
    switch = ForeignKey(Employee, related_name='+', on_delete=SET_NULL, null=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    inactive = None
    locked = None

    cat = PositiveSmallIntegerField(default=0)  # teammember cat: 0 = normal, 1 = replacement, 512 = absent
    isabsence = BooleanField(default=False)
    isswitchedshift = BooleanField(default=False)
    istemplate = BooleanField(default=False)

    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)

    # Removed: pricecode, additioncode, override. Use the fields in shift PR2020-11-23
    #pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    #additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    #override = BooleanField(default=True)

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
                scheme = self.scheme
                if scheme:
                    #logger.debug('scheme: ' + str(scheme.code))
                    # skip if cycle = 0 (once-only). Value fore once-only is cycle = 32767
                    if scheme.cycle:
                        cycle_int = scheme.cycle
                        # if cycle_int < 32767:
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

    # check if schemeitem is necessary, I dont think so PR2020-02-15
    # yes it is, to retrieve shift.isbillable when adding orderhour from roster page
    # and to get prc-rate from shift
    # DONE replace schemeitem by shift, because added roster shift dont have a schemeitem
    #schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True)
    # DONE: replace by shift, but first on server the field shift Charfield must be renamed to shiftcode
    shift = ForeignKey(Shift, related_name='+', on_delete=SET_NULL, null=True)
    customercode = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    ordercode = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    shiftcode = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    rosterdate = DateField(db_index=True)
    cat = PositiveSmallIntegerField(default=0)
    sortby = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    isabsence = BooleanField(default=False)
    isrestshift = BooleanField(default=False)
    issplitshift = BooleanField(default=False)
    isbillable = BooleanField(default=False)  # isbillable: worked hours will be billed when true, planned hours otherwise
    nobill = BooleanField(default=False)  # nobill: billed hours will be zero
    # TODO add nobill to pricepage

    invoicecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    # invoicedate = DateField(db_index=True, null=True)

    # TODO deprecate, replaced by eh.invoicepublished IS NOT NULL
    lockedinvoice = BooleanField(default=False)

    additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    # pricerate is in emplhour
    additionrate = IntegerField(null=True)  # additionrate = /10.000 unitless (10.000 = 100%)
    taxrate = IntegerField(null=True)  # taxrate = /10.000 unitless taxrate 600 = 6%

    status = PositiveSmallIntegerField(db_index=True, default=0)
    hasnote = BooleanField(default=False)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None

    class Meta:
        ordering = ['rosterdate']

    def __str__(self):
        return str(self.rosterdate) + ' ' + str(self.ordercode) + ' ' + str(self.shiftcode)

    @property
    def rosterdate_yyyymmdd(self): # PR2019-04-01
        return f.get_date_yyyymmdd(self.rosterdate)


class Emplhour(TsaBaseModel):
    objects = TsaManager()

    orderhour = ForeignKey(Orderhour, related_name='emplhours', on_delete=PROTECT)

    rosterdate = DateField(db_index=True)
    exceldate = IntegerField(null=True)

    employee = ForeignKey(Employee, related_name='emplhours', on_delete=SET_NULL, null=True)
    employeecode = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    cat = PositiveSmallIntegerField(default=0)
    isreplacement = BooleanField(default=False)
    datepart = PositiveSmallIntegerField(default=0) # 1=night, 2 = morning, 3 = afternoon, 4 = evening, 0 = undefined

    #paydate = DateField(db_index=True, null=True)
    paydatecode = ForeignKey(Paydatecode, related_name='+', on_delete=SET_NULL, null=True)

    payrollpublished = ForeignKey(Published, related_name='+', on_delete=SET_NULL, null=True)
    invoicepublished = ForeignKey(Published, related_name='+', on_delete=SET_NULL, null=True)

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

    nohours = BooleanField(default=False)

    functioncode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)

    wagefactorcode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagefactor = IntegerField(default=0)  # /1.000.000 unitless, 0 = factor 100%  = 1.000.000)
    wagefactorcaption = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    wagecode = ForeignKey(Wagecode, related_name='+', on_delete=SET_NULL, null=True)
    wagerate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    wage = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    pricecode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    #additioncode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)
    #taxcode = ForeignKey(Pricecode, related_name='+', on_delete=SET_NULL, null=True)

    pricerate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    #additionrate = IntegerField(null=True)  # additionrate = /10.000 unitless (10.000 = 100%)
    #taxrate = IntegerField(null=True)  # taxrate = /10.000 unitless taxrate 600 = 6%

    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    addition = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    tax = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    # note must be removed
    #note = CharField(max_length=c.NAME_MAX_LENGTH, null=True, blank=True)

    status = PositiveSmallIntegerField(db_index=True, default=0)

    haschanged  = BooleanField(default=False)  # haschanged will show an orange diamond on the roster page
    overlap = SmallIntegerField(default=0)  # stores if record has overlapping emplhour records: 1 overlap start, 2 overlap end, 3 full overlap

    hasnote = BooleanField(default=False)  # hasnotes will show a note icon on the roster page

    # combination rosterdate + schemeitemid + teammemberid is used to identify schemeitem / teammember that is used to create this emplhour
    # used in FilRosterdate to skip existing shifts (happens when same rosterdate is created for the second time)
    schemeitemid = IntegerField(null=True)
    teammemberid = IntegerField(null=True)

    # corremplhourid contains id of emplhour that is corrected. This emplhour contains the correction PR2021-05-18
    corremplhourid = IntegerField(db_index=True, null=True)

    modifiedbyusername = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    class Meta:
        ordering = ['rosterdate', 'timestart']

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None

    def __str__(self):
        return str(self.rosterdate) + ' ' + str(self.employeecode)

    @property
    def has_status01_created(self):  # PR2019-10-18
        has_status_created = False
        field_value = getattr(self, 'status', 0)
        status_int = int(field_value)
        # PR2021-01-014 from https://stackoverflow.com/questions/509211/understanding-slice-notation
        # list[start:stop:step] # start through not past stop, by step
        status_str = bin(status_int)[-1:1:-1]  # status 31 becomes '11111', first char is STATUS_00_PLANNED
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

    emplhour_id = IntegerField(db_index=True)

    rosterdate = DateField()

    order = ForeignKey(Order, related_name='+', on_delete=SET_NULL, null=True)
    employee = ForeignKey(Employee, related_name='+', on_delete=SET_NULL, null=True)

    shift = ForeignKey(Shift, related_name='+', on_delete=SET_NULL, null=True)

    schemeitemid = IntegerField(null=True)
    teammemberid = IntegerField(null=True)

    corremplhourid = IntegerField(null=True)

    customercode = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    ordercode = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    shiftcode = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)
    employeecode = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    timestart = DateTimeField(null=True)
    timeend = DateTimeField(null=True)
    timeduration = IntegerField(default=0)
    breakduration = IntegerField(default=0)
    plannedduration = IntegerField(default=0)
    billingduration = IntegerField(default=0)

    offsetstart = SmallIntegerField(null=True)  # unit is minute, offset from midnight
    offsetend = SmallIntegerField(null=True)  # unit is minute, offset from midnight

    isabsence = BooleanField(default=False)
    isrestshift = BooleanField(default=False)
    issplitshift = BooleanField(default=False)
    isreplacement = BooleanField(default=False)

    status = PositiveSmallIntegerField(default=0)

    hasnote = BooleanField(default=False)

    isdeleted = BooleanField(default=False)  # for updatng roster page

    modifiedbyusername = CharField(max_length=c.CODE_MAX_LENGTH, null=True, blank=True)

    class Meta:
        ordering = ['-modifiedat']

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Emplhournote(TsaBaseModel):
    objects = TsaManager()

    emplhour = ForeignKey(Emplhour, related_name='+', on_delete=CASCADE)
    note = CharField(max_length=2048, null=True, blank=True)
    isusernote = BooleanField(default=False)

    class Meta:
        ordering = ['-modifiedat']

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Emplhourallowance(TsaBaseModel):
    objects = TsaManager()

    emplhour = ForeignKey(Emplhour, related_name='+', on_delete=CASCADE)
    allowancecode = ForeignKey(Wagecode, related_name='+', on_delete=PROTECT)

    rate = IntegerField(default=0)      # rate  =  /100 unit currency   wagerate 10.000 = 100 US$
    quantity = IntegerField(default=0)  # quantity = /10.000 unitless (10.000 = 100%)
    amount = IntegerField(default=0)    # amount = /100 unit is currency (US$, EUR, ANG)

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Emplhourallowancelog(TsaBaseModel):
    objects = TsaManager()

    emplhourallowance_id = IntegerField(db_index=True)

    emplhourid = IntegerField(null=True)
    allowancecodeid = IntegerField(null=True)

    rate = IntegerField(default=0)      # rate  =  /100 unit currency   wagerate 10.000 = 100 US$
    quantity = IntegerField(null=True)  # quantity = /10.000 unitless (10.000 = 100%)
    amount = IntegerField(null=True)    #   amount = /100 unit is currency (US$, EUR, ANG)

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Emplhourstatus(TsaBaseModel):
    objects = TsaManager()

    emplhour = ForeignKey(Emplhour, related_name='+', on_delete=CASCADE)

    status = PositiveSmallIntegerField(default=0)
    isremoved = BooleanField(default=False)

    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


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
    datetimesetting = DateTimeField(null=True)  #  for last_emplhour_updated PR2020-08-10
    datetimesetting2 = DateTimeField(null=True)  #  for last_emplhour_deleted PR2020-08-23

    jsonsetting = JSONField(null=True)  # stores invoice dates for this customer

    @classmethod
    def get_datetimesetting(cls, key_str, company):  # PR2020-08-23
        datetime_setting = None
        datetime_setting2 = None
        if company and key_str:
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                if row.datetimesetting:
                    datetime_setting = row.datetimesetting
                if row.datetimesetting2:
                    datetime_setting2 = row.datetimesetting2

        return datetime_setting, datetime_setting2

    @classmethod
    def set_datetimesetting(cls, key_str, new_datetime, company):   # PR2020-08-12
        if company and key_str:
            # don't use get_or_none, gives none when multiple settings exist and will create extra setting.
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                row.datetimesetting = new_datetime
            elif new_datetime:
                row = cls(company=company, key=key_str, datetimesetting=new_datetime)
            row.save()

    @classmethod
    def set_datetimesetting2(cls, key_str, new_datetime, company):  # PR2020-08-23
        if company and key_str:
            # don't use get_or_none, gives none when multiple settings exist and will create extra setting.
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                row.datetimesetting2 = new_datetime
            elif new_datetime:
                row = cls(company=company, key=key_str, datetimesetting2=new_datetime)
            row.save()
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def delete_emplhour_instance(emplhour, request):  #  PR2020-08-23
    #logger.debug('-----  delete_emplhour  -----')
    # function first saves record in log  with isdeleted=True
    # adds datetime seleted in Companysettings
    # then deletes emplhour record
    # also deletes orderhour record, when it has no other emplhour records
    deleted_row = None
    if emplhour:
        #logger.debug('emplhour: ' + str(emplhour))
        orderhour = emplhour.orderhour
        other_emplhours_exist = Emplhour.objects.filter(orderhour=orderhour).exclude(pk=emplhour.pk).exists()
        #logger.debug('other_emplhours_exist: ' + str(other_emplhours_exist))

# - first delete history of this emplhour
        Emplhourlog.objects.filter(emplhour_id=emplhour.pk).delete()
        #logger.debug('Emplhourlog count: ' + str(Emplhourlog.objects.filter(emplhour_id=emplhour.pk).count()))
# -  save emplhour to log before deleting - to be able to upate other logged in computers
        # get now without timezone
        now_utc_naive = datetime.utcnow()
        # convert now to timezone utc
        modified_at = now_utc_naive.replace(tzinfo=pytz.utc)
        #logger.debug('emplhour modified_at: ' + str(modified_at))

        save_to_emplhourlog(emplhour.pk, request, True, modified_at)  # is_deleted = True
        #logger.debug('saved_to_emplhourlog count: ')

# -  put date_deleted (=now_utc) in Companysetting.datetimesetting2
        key = 'last_emplhour_updated'
        Companysetting.set_datetimesetting2(key, modified_at, request.user.company)

# - create deleted_row
        deleted_row = {'pk': emplhour.pk,
                       'mapid': 'emplhour_' + str(emplhour.pk),
                       'deleted': True}
# - delete emplhour record
        try:
            emplhour.delete()
        except:
            deleted_row = None

# - also delete orderhour when it has no other emplhour records
        if not other_emplhours_exist:
            orderhour.delete()

    return deleted_row


def save_to_emplhourlog(emplhour_pk, request, is_deleted=False, modified_at=None):
    # PR2020-07-26 PR2020-08-22 PR2021-02-21
    logger.debug('  ----- save_to_emplhourlog -----')
    logger.debug('is_deleted: ' + str(is_deleted))
    logger.debug('request.user: ' + str(request.user))

    # when is_delete: set modified_date to now, use emplhour modified_date
    sql = ''
    try:
        sql_list = [
            "INSERT INTO companies_emplhourlog (id,",
                "emplhour_id, rosterdate, order_id, employee_id, shift_id, schemeitemid, teammemberid,",
                "customercode, ordercode, shiftcode, employeecode,",
                "timestart, timeend, breakduration, timeduration,",
                "plannedduration, billingduration, offsetstart, offsetend,",
                "isabsence,  isrestshift,  issplitshift, isreplacement, status, hasnote,",
                "isdeleted, modifiedby_id, modifiedat, modifiedbyusername)",
            "SELECT nextval('companies_emplhourlog_id_seq'),",
                "eh.id, eh.rosterdate, oh.order_id, eh.employee_id, oh.shift_id, eh.schemeitemid, eh.teammemberid,",
                "oh.customercode, oh.ordercode, oh.shiftcode, eh.employeecode,",
                "eh.timestart, eh.timeend, eh.breakduration, eh.timeduration,",
                "eh.plannedduration, eh.billingduration, eh.offsetstart, eh.offsetend,",
                "oh.isabsence, oh.isrestshift, oh.issplitshift, eh.isreplacement, eh.status, eh.hasnote,"]

        if is_deleted:
            # - set request user in modified_by of deleted emplhour record
            sql_list.append("""TRUE,  
                CAST(%(modifiedby_id)s AS INTEGER), CAST(%(modifiedat)s AS DATE), %(username)s""")
            modifiedby_id = request.user.pk
            username = request.user.username_sliced
            sql_keys = {'ehid': emplhour_pk,
                        'modifiedby_id': modifiedby_id,
                        'modifiedat': modified_at,
                        'username': username}
        else:
            sql_list.append("""FALSE, eh.modifiedby_id, eh.modifiedat, eh.modifiedbyusername""")
            sql_keys = {'ehid': emplhour_pk}

        sql_list.append("""
            FROM companies_emplhour AS eh 
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id) 
            WHERE ( eh.id = %(ehid)s) 
            """)

        sql = ' '.join(sql_list)
        #logger.debug('sql: ' + str(sql))
        #logger.debug('sql_keys: ' + str(sql_keys))

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        logger.debug('  ----- save_to_emplhourlog done ')

    except Exception as e:
        logger.error(e)
        logger.error('sql: ' + str(sql))


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_parent_NIU(table, ppk_int, update_dict, request):
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


def delete_instance(instance, request, this_text=None):
    # function deletes instance of table,  PR2019-08-25 PR2021-03-22
    msg_dict = None
    msg_list = []
    if instance:
        try:
            instance.delete(request=request)
        except Exception as e:
            msg_list.append(str(_('An error occurred')) + ":")
            msg_list.append(  '<i>' + str(e) + '</i>')
            if this_text is None:
                this_text = str(_('This item'))
            msg_list.append(str(_('%(tbl)s could not be deleted.') % {'tbl': this_text}))
    if msg_list:
        msg_dict = {'class': 'border_bg_invalid', 'msg_list': msg_list}
    return msg_dict


def delete_with_err_list_instance(instance, error_list, request, this_text=None):
    logging_on = False  # s.LOGGING_ON
    if logging_on:
        logger.debug(' ----- delete_instance  -----')
        logger.debug('instance: ' + str(instance))

    # function deletes instance of table, and retruns errorlist PR2021-05-17
    # to be imlemented, for now only used in PublishUpload
    deleted_ok = False

    if instance:

        try:
            instance.delete(request=request)

            if logging_on:
                logger.debug('instance.delete: ' + str(instance))

        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))

            tbl = this_text if this_text else _('This item')
            msg_list = [str(_('An error occurred: ')) , str(e),
                        str(_('%(tbl)s could not be deleted.') % {'tbl': tbl})]

            # error_list = [ { 'field': 'code', msg_list: [text1, text2] }, (for use in imput modals)
            #                {'class': 'alert-danger', msg_list: [text1, text2]} ] (for use in modal message)
            error_list.append({'class': 'alert-danger', 'msg_list': msg_list})

            if logging_on:
                logger.debug('except instance: ' + str(instance))
        else:
            instance = None
            deleted_ok = True
            if logging_on:
                logger.debug('else instance: ' + str(instance))

    if logging_on:
        logger.debug('error_list: ' + str(error_list))
        logger.debug('instance: ' + str(instance))
        logger.debug('deleted_ok: ' + str(deleted_ok))

    return deleted_ok

