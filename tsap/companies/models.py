# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, BooleanField, \
    PositiveSmallIntegerField, PositiveIntegerField, IntegerField, DecimalField, \
    DateField, DateTimeField
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from tsap.settings import AUTH_USER_MODEL, TIME_ZONE, LANGUAGE_CODE
from tsap.constants import USERNAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH
from tsap.functions import get_date_yyyymmdd, get_time_HHmm, get_datetimelocal_from_datetime, get_date_longstr_from_dte, get_datetimelocal_DHM

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
    code = CharField(db_index=True, max_length=CODE_MAX_LENGTH)
    name = CharField(db_index=True, max_length=NAME_MAX_LENGTH)

    datefirst = DateField(db_index=True, null=True, blank=True)
    datelast = DateField(db_index=True, null=True, blank=True)

    locked = BooleanField(default=False)
    inactive = BooleanField(default=False)

    modified_by = ForeignKey(AUTH_USER_MODEL, null=True, related_name='+', on_delete=SET_NULL)
    modified_at = DateTimeField()

    class Meta:
        abstract = True
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


    def save(self, *args, **kwargs):
        # skip modified_by when subtracting balance PR20019-04-09
        if 'request' in kwargs:
            self.request = kwargs.pop('request', None)

            self.modified_by = self.request.user
            # timezone.now() is timezone aware, based on the USE_TZ setting; datetime.now() is timezone naive. PR2018-06-07
            self.modified_at = timezone.now()

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
        return CODE_MAX_LENGTH

    @property
    def maxlen_name(self):  # PR2019-03-04
        return NAME_MAX_LENGTH

    @property
    def datefirst_str(self):  # PR2019-03-29
        return get_date_yyyymmdd(self.datefirst)

    @property
    def datelast_str(self):  # PR2019-03-29
        return get_date_yyyymmdd(self.datelast)

    def modified_by_str(self, lang):  # PR2019-04-01
        modby_str = ''
        if self.modified_by:
            modby_str = self.modified_by.username_sliced
        return modby_str

    def modified_at_str(self,  lang):  # PR2019-03-23
        # This doesn't work in template tags
        dte_str = ''
        if self.modified_at:
            dte_str = get_date_longstr_from_dte(self.modified_at, lang)
        return  dte_str


class Company(TsaBaseModel):
    objects = TsaManager()

    issystem = BooleanField(default=False)
    timezone = CharField(max_length=NAME_MAX_LENGTH, default=TIME_ZONE)
    interval = PositiveSmallIntegerField(default=1)
    timeformat = CharField(max_length=4, null=True, blank=True)
    balance = IntegerField(default=0)

    class Meta:
        ordering = [Lower('code')]

    @property
    def companyprefix(self):
        #PR2019-03-13 CompanyPrefix is added at front of username, to make usernames unique per company
        id_str = '000000' + str(self.pk)
        return id_str[-6:]


class Customer(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='customers', on_delete=PROTECT)
    issystem = BooleanField(default=False)
    email = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)

    class Meta:
        ordering = [Lower('code')]

    @property
    def id_str(self):
        return 'id_cust_' + self.pk


class Order(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='orders', on_delete=PROTECT)
    issystem = BooleanField(default=False)

    class Meta:
        ordering = [Lower('code')]

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

    @property
    def id_str(self):
        return 'id_obj_' + self.pk


class Scheme(TsaBaseModel):
    objects = TsaManager()
    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    datelast = None

    cycle = PositiveSmallIntegerField(default=1)
    weekend = PositiveSmallIntegerField(default=0)
    publicholiday = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = [Lower('code')]


class Team(TsaBaseModel):
    objects = TsaManager()
    scheme = ForeignKey(Scheme, related_name='teams', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]


class SchemeItem(TsaBaseModel):
    objects = TsaManager()
    scheme = ForeignKey(Scheme, related_name='+', on_delete=CASCADE)
    team = ForeignKey(Team, related_name='+', on_delete=PROTECT, null=True, blank=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None

    rosterdate = DateField(db_index=True, null=True, blank=True)
    shift = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    time_start = DateTimeField(db_index=True, null=True, blank=True)
    time_start_dhm = CharField(max_length=CODE_MAX_LENGTH, null=True, blank=True)
    time_end = DateTimeField(db_index=True, null=True, blank=True)
    time_end_dhm = CharField(max_length=CODE_MAX_LENGTH, null=True, blank=True)
    time_duration = IntegerField(default=0)  # unit is minute
    break_start = DateTimeField(null=True, blank=True)
    break_start_dhm = CharField(max_length=CODE_MAX_LENGTH, null=True, blank=True)
    break_duration = IntegerField(default=0) # unit is minute

    class Meta:
        ordering = ['rosterdate', 'time_start']

    def __str__(self):
        return  'schemeitem_pk_' + str(self.pk)


class Wagecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='wagecodes', on_delete=PROTECT)

    rate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]


class Wagefactor(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='wagefactors', on_delete=PROTECT)

    rate = IntegerField(default=0)  # /10.000

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]


class Taxcode(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='taxcodes', on_delete=PROTECT)
    code = CharField(max_length=4)

    rate = IntegerField(default=0) # /10.000

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]


class Timecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='timecodes', on_delete=PROTECT)

    rate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]


class Employee(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='+', on_delete=PROTECT)

    name_last = CharField(db_index=True, max_length=NAME_MAX_LENGTH)
    name_first = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    prefix = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    email = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)

    wagecode = ForeignKey(Wagecode, related_name='eployees', on_delete=PROTECT, null=True, blank=True)
    workhours_permonth = IntegerField(default=0) # /10.000 unit is hour
    leavedays_peryear_fulltime =  IntegerField(default=0) # /10.000 unit is day

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None

    class Meta:
        ordering = [Lower('name_last'), Lower('name_first')]

    def __str__(self):
        self.n_last = str(self.name_last)
        self.n_first = str(self.name_first) if self.name_first else ''
        self.n_prefix = str(self.prefix) if self.prefix else ''
        return ' '.join((self.n_first, self.n_prefix, self.n_last))

    @property
    def id_str(self):
        return 'id_empl_' + self.pk

    @property
    def datefirst_str(self):  # PR2019-03-27
        dte_str = ''
        if self.datefirst:
            dte_str = get_date_yyyymmdd(self.datefirst)
        return dte_str

    @property
    def datelast_str(self):   # PR2019-03-27
        dte_str = ''
        if self.datelast:
            dte_str = get_date_yyyymmdd(self.datelast)
        return dte_str


class TeamMember(TsaBaseModel):
    objects = TsaManager()

    team = ForeignKey(Team, related_name='teammembers', on_delete=CASCADE)
    employee = ForeignKey(Employee, related_name='teammembers', on_delete=CASCADE)
    replacement = ForeignKey(Employee, related_name='+', on_delete=SET_NULL, null=True, blank=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None


class Orderhour(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='orderhours', on_delete=PROTECT)
    order = ForeignKey(Order, related_name='orderhours', on_delete=PROTECT, null=True, blank=True)
    taxcode = ForeignKey(Taxcode, related_name='orderhours', on_delete=PROTECT, null=True, blank=True)

    rosterdate = DateField(db_index=True, null=True, blank=True)

    duration = IntegerField(default=0)  # unit is hour * 100
    status = PositiveSmallIntegerField(db_index=True, default=0)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    invoice_status = PositiveSmallIntegerField(db_index=True, default=0)

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
        return get_date_yyyymmdd(self.rosterdate)

    @property
    def id_ordemplhour_order(self):
        return 'id_oeh_order_' + str(self.pk)

    @property
    def id_ordemplhour_empl(self):
        return 'id_oeh_empl_' + str(self.pk)

    @property
    def id_ordemplhour_shift(self):
        return 'id_oeh_shift_' + str(self.pk)


class Emplhour(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='emplhours', on_delete=PROTECT)
    employee = ForeignKey(Employee, related_name='emplhours', on_delete=PROTECT, null=True, blank=True)
    order = ForeignKey(Order, related_name='emplhours', on_delete=SET_NULL, null=True, blank=True)
    orderhour = ForeignKey(Orderhour, related_name='emplhours', on_delete=SET_NULL, null=True, blank=True)
    schemeitem = ForeignKey(SchemeItem, related_name='emplhours', on_delete=SET_NULL, null=True, blank=True)
    wagecode = ForeignKey(Wagecode, related_name='emplhours', on_delete=PROTECT, null=True, blank=True)

    rosterdate = DateField(db_index=True, null=True, blank=True)
    time_start = DateTimeField(db_index=True, null=True, blank=True)
    time_end = DateTimeField(db_index=True, null=True, blank=True)
    time_duration = IntegerField(default=0)  # unit is hour * 100
    break_start = DateTimeField(null=True, blank=True)
    break_duration = IntegerField(default=0) # unit is hour * 100
    time_status = PositiveSmallIntegerField(db_index=True, default=0)

    class Meta:
        ordering = ['rosterdate', 'time_start']

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None

    @property
    def rosterdate_yyyymmdd(self): # PR2019-04-01
        return get_date_yyyymmdd(self.rosterdate)

    @property
    def time_start_datetimelocal(self): # PR2019-04-08
        return get_datetimelocal_from_datetime(self.time_start)

    @property
    def time_start_DHM(self): # PR2019-04-08
        return get_datetimelocal_DHM(self.time_start, 'nl')

    @property
    def time_end_datetimelocal(self): # PR2019-04-08
        return get_datetimelocal_from_datetime(self.time_end)

    @property
    def time_end_DHM(self): # PR2019-04-08
        return get_datetimelocal_DHM(self.time_end, 'nl')

    @property
    def time_end_HHmm(self): # PR2019-04-07
        return get_time_HHmm(self.time_end)

    @property
    def time_hours(self):
        # duration unit is minutes
        value = self.time_duration / 60
        if not value:  # i.e. if value == 0
            value = ''
        return value

    @property
    def break_hours(self):
        # duration unit is minutes
        value = self.break_duration / 60
        if not value:  # i.e. if value == 0
            value = ''
        return value

    @property
    def id_ordemplhour_order(self):
        return 'id_oeh_order_' + str(self.pk)

    @property
    def id_ordemplhour_empl(self):
        return 'id_oeh_empl_' + str(self.pk)

    @property
    def id_ordemplhour_shift(self):
        return 'id_oeh_shift_' + str(self.pk)


class Companyinvoice(Model):  # PR2019-04-06
    objects = TsaManager()

    company = ForeignKey(Company, related_name='companycredits', on_delete=CASCADE)
    entries = IntegerField(default=0)
    balance= IntegerField(default=0)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    dateinvoice = DateField(db_index=True, null=True, blank=True)
    bonusexpired = DateField(db_index=True, null=True, blank=True)
    note = CharField(db_index=True, max_length=NAME_MAX_LENGTH)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    locked = None
    inactive = None


class Companysetting(Model):  # PR2019-03-09
    # PR2018-07-20 from https://stackoverflow.com/questions/3090302/how-do-i-get-the-object-if-it-exists-or-none-if-it-does-not-exist
    objects = TsaManager()

    company = ForeignKey(Company, related_name='companysettings', on_delete=CASCADE)
    key_str = CharField(db_index=True, max_length=30)

    setting = CharField(max_length=2048, null=True, blank=True)

#===========  Classmethod
    @classmethod
    def get_setting(cls, key_str, request_user): #PR2019-03-09
        # function returns value of setting row that match the filter
        logger.debug('---  get_setting  ------- ')
        setting = ''
        if request_user.company and key_str:
            #if request_user.department:
            #    row = cls.objects.filter(
            #        company=request_user.company,
            #        department=request_user.department,
             #       key_str=key_str).first()
            #else:
            row = cls.objects.filter(
                company=request_user.company,
                #department__isnull=True,
                key_str=key_str).first()
            if row:
                if row.setting:
                    setting = row.setting
        return setting

    @classmethod
    def set_setting(cls, key_str, setting, request_user): #PR2019-03-09
        # function returns list of setting rows that match the filter
        logger.debug('---  set_setting  ------- ')
        logger.debug('setting: ' + str(setting))
        # get
        if request_user.company and key_str:
            if request_user.department:
                row = cls.objects.filter(
                    company=request_user.company,
                    department=request_user.department,
                    key_str=key_str).first()
            else:
                row = cls.objects.filter(
                    company=request_user.company,
                    department__isnull=True,
                    key_str=key_str).first()
            if row:
                row.setting = setting
            else:
                row = cls(
                    company=request_user.company,
                    key_str=key_str,
                    setting=setting
                )
                if request_user.department:
                    row.department = request_user.department
            row.save()


