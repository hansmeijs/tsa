# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, IntegerField, \
    DateField, DateTimeField, Q
from django.db.models.functions import Upper, Lower

from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from datetime import datetime

from tsap.settings import AUTH_USER_MODEL, TIME_ZONE
from tsap.constants import USERNAME_SLICED_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH, \
    TIMEFORMAT_CHOICES, TIMEFORMAT_24h
from tsap.functions import get_date_yyyymmdd, get_date_longstr_from_dte, get_date_WDM_from_dte, \
    format_WDMY_from_dte, format_DMY_from_dte, fielddict_date

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
    code = CharField(db_index=True, max_length=CODE_MAX_LENGTH)
    name = CharField(db_index=True, max_length=NAME_MAX_LENGTH)

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
            dte_str = get_date_longstr_from_dte(self.modifiedat, lang)
        return dte_str

class Company(TsaBaseModel):
    objects = TsaManager()

    issystem = BooleanField(default=False)
    timezone = CharField(max_length=NAME_MAX_LENGTH, default=TIME_ZONE)
    interval = PositiveSmallIntegerField(default=5)
    timeformat = CharField(max_length=4, choices=TIMEFORMAT_CHOICES,
        default=TIMEFORMAT_24h)


    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @property
    def companyprefix(self):
        #PR2019-03-13 CompanyPrefix is added at front of username, to make usernames unique per company
        id_str = '000000' + str(self.pk)
        return id_str[-6:]


class Customer(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='customers', on_delete=PROTECT)
    cat = PositiveSmallIntegerField(default=0)  # 0 = normal, 1 = internal, 2 = absence, 3 = template

    identifier = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    email = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)

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
    cat = PositiveSmallIntegerField(default=0)  # 0 = normal, 1 = internal, 2 = absence, 3 = template

    identifier = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    taxrate = IntegerField(default=0) # /10000 unit
    ishourlybasis = BooleanField(default=False)

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @property
    def id_str(self):
        return 'id_ord_' + self.pk

    @classmethod
    def create_instance(cls, customer, code, name, temp_pk_str, update_dict, request):
        instance = None
        pk_int = None
        parent_pk_int = None
        # - parent, code and name are required
        if customer:
            # TODO
            code_ok = True  # TODO validate_code_or_name('order', 'code', code, update_dict, request.user.company)
            name_ok = True  # TODO  validate_code_or_name('order', 'name', name, update_dict, request.user.company)

# - create instance
            if code_ok and name_ok:
                instance = cls(customer=customer, code=code, name=name)
# - save instance
                instance.save(request=request)
# - create error when instance not created
            if instance is None:
                msg_err = _('This order could not be created.')
                update_dict['id']['error'] = msg_err
            else:
# - put info in id_dict
                update_dict['pk'] = instance.pk
                update_dict['id']['pk'] = instance.pk
                update_dict['id']['ppk'] = customer.pk
                update_dict['id']['created'] = True
                update_dict['code']['value'] = instance.code
                update_dict['code']['updated'] = True
                update_dict['name']['value'] = instance.name
                update_dict['name']['updated'] = True

            # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            if temp_pk_str:
                update_dict['id']['temp_pk'] = temp_pk_str

        return instance


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


class Scheme(TsaBaseModel):
    objects = TsaManager()
    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)
    cat = PositiveSmallIntegerField(default=0)  # 0 = normal, 1 = internal, 2 = absence, 3 = template

    cycle = PositiveSmallIntegerField(default=7)
    excludeweekend  = BooleanField(default=False)
    excludepublicholiday  = BooleanField(default=False)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Team(TsaBaseModel):
    objects = TsaManager()
    scheme = ForeignKey(Scheme, related_name='teams', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @classmethod
    def create_team_list(cls, order):
        # create list of teams of this order PR2019-04-28
        team_list = []
        if order:
            teams = cls.objects.filter(scheme__order=order)
            if teams:
                for team in teams:
                    dict = {'pk': team.pk,
                            'id': {'pk': team.pk,
                                   'ppk': team.scheme.pk},
                            'code': {'value': team.code}}
                    team_list.append(dict)
        return team_list


class Wagecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='wagecodes', on_delete=PROTECT)

    rate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Wagefactor(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='wagefactors', on_delete=PROTECT)

    rate = IntegerField(default=0)  # /10.000

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Timecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='timecodes', on_delete=PROTECT)

    rate = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code


class Employee(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='+', on_delete=PROTECT)

    namelast = CharField(db_index=True, max_length=NAME_MAX_LENGTH)
    namefirst = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    prefix = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    email = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)
    identifier  = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)

    wagecode = ForeignKey(Wagecode, related_name='eployees', on_delete=PROTECT, null=True, blank=True)
    workhours = IntegerField(default=0) # /hours per month
    leavedays = IntegerField(default=0) # /leave ays per year, full time

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None

    class Meta:
        ordering = [Lower('namelast'), Lower('namefirst')]

    def __str__(self):
        self.n_last = str(self.namelast)
        self.n_first = str(self.namefirst) if self.namefirst else ''
        self.n_prefix = str(self.prefix) if self.prefix else ''
        return ' '.join((self.n_first, self.n_prefix, self.n_last))

    @classmethod
    def create_instance(cls, company, code, namelast, temp_pk_str, update_dict, request):

        instance = None
# - parent, code and namelast are required
        if company:
            # TODO
            code_ok = True  # TODO validate_code_or_name('employee', 'code', code, update_dict, request.user.company)
            namelast_ok = True  # TODO  validate_code_or_name('employee', 'name', name, update_dict, request.user.company)

# - create instance
            if code_ok and namelast_ok:
                instance = cls(company=company, code=code, namelast=namelast)
# - save instance
                instance.save(request=request)
# - create error when instance not created
            if instance is None:
                msg_err = _('This employee could not be created.')
                update_dict['id']['error'] = msg_err
            else:
# - put info in id_dict
                update_dict['id']['created'] = True
                update_dict['id']['pk'] = instance.pk
                update_dict['id']['ppk'] = company.pk
                update_dict['code']['value'] = instance.code
                update_dict['code']['updated'] = True
                update_dict['namelast']['value'] = instance.namelast
                update_dict['namelast']['updated'] = True

            # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            if temp_pk_str:
                update_dict['id']['temp_pk'] = temp_pk_str

        return instance

    @classmethod
    def get_instance(cls, pk_int, update_dict, company):
        # function returns instance of employee, adds to  update_dict  PR2019-06-06
        logger.debug('----- get_instance -----')
        employee = None
        parent_pk_int = None
        if pk_int:
            try:
                employee = cls.objects.get(id=pk_int, company=company)
                parent_pk_int = employee.company.pk
            except:
                pass
        # logger.debug('pk_int: ' + str(pk_int), 'parent_pk_int: ' + str(parent_pk_int))
        # logger.debug('employee: ' + str(employee))

        if employee:
            update_dict['id']['pk'] = pk_int
            if parent_pk_int:
                update_dict['id']['ppk'] = parent_pk_int
            update_dict['id']['table'] = 'employee'
        return employee

    @classmethod
    def delete_instance(cls, pk_int, parent_pk_int, update_dict, request):
        # function deletes instance of table,  PR2019-06-06
        instance = None
        if pk_int and parent_pk_int:
            instance = cls.objects.filter(id=pk_int, customer__id=parent_pk_int).first()

        if instance:
            try:
                instance.delete(request=request)
                update_dict['id']['deleted'] = True
            except:
                msg_err = _('This order could not be deleted.')
                update_dict['id']['error'] = msg_err

        return update_dict


class Teammember(TsaBaseModel):
    objects = TsaManager()

    team = ForeignKey(Team, related_name='teammembers', on_delete=CASCADE)
    employee = ForeignKey(Employee, related_name='teammembers', on_delete=SET_NULL, null=True, blank=True)

    member = PositiveSmallIntegerField(default=0)  # /leave ays per year, full time

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None


# =================

class Schemeitem(TsaBaseModel):
    objects = TsaManager()


    scheme = ForeignKey(Scheme, related_name='schemeitems', on_delete=CASCADE)
    team = ForeignKey(Team, related_name='schemeitems', on_delete=SET_NULL, null=True, blank=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None

    rosterdate = DateField(db_index=True)

    cyclestart = BooleanField(default=False)

    shift = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    timestart = DateTimeField(db_index=True, null=True, blank=True)
    offsetstart = CharField(max_length=CODE_MAX_LENGTH, null=True, blank=True)  # dhm" "-1;17;45"
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    offsetend = CharField(max_length=CODE_MAX_LENGTH, null=True, blank=True)
    timeduration = IntegerField(default=0)  # unit is minute
    breakduration = IntegerField(default=0) # unit is minute

    class Meta:
        ordering = ['rosterdate', 'timestart']

    def __str__(self):
        return 'schemeitem_pk_' + str(self.pk)


class Orderhour(TsaBaseModel):
    objects = TsaManager()

    order = ForeignKey(Order, related_name='orderhours', on_delete=PROTECT)
    schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True, blank=True)

    rosterdate = DateField(db_index=True, null=True, blank=True)

    yearindex = PositiveSmallIntegerField(default=0)
    monthindex = PositiveSmallIntegerField(default=0)
    weekindex = PositiveSmallIntegerField(default=0)

    shift = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    duration = IntegerField(default=0)  # unit is hour * 100
    status = PositiveSmallIntegerField(db_index=True, default=0)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    taxrate = IntegerField(default=0) # /10000 unit

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


class Emplhour(TsaBaseModel):
    objects = TsaManager()

    orderhour = ForeignKey(Orderhour, related_name='emplhours', on_delete=SET_NULL, null=True, blank=True)
    employee = ForeignKey(Employee, related_name='emplhours', on_delete=PROTECT, null=True, blank=True)
    wagecode = ForeignKey(Wagecode, related_name='emplhours', on_delete=PROTECT, null=True, blank=True)

    rosterdate = DateField(db_index=True, null=True, blank=True)
    yearindex = PositiveSmallIntegerField(default=0)
    monthindex = PositiveSmallIntegerField(default=0)
    weekindex = PositiveSmallIntegerField(default=0)

    shift = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    timestart = DateTimeField(db_index=True, null=True, blank=True)
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    timeduration = IntegerField(default=0)
    breakduration = IntegerField(default=0)
    status = PositiveSmallIntegerField(db_index=True, default=0)

    class Meta:
        ordering = ['rosterdate', 'timestart']

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None
    inactive = None


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


class Companyinvoice(Model):  # PR2019-04-06
    objects = TsaManager()

    company = ForeignKey(Company, related_name='+', on_delete=CASCADE)
    entries = IntegerField(default=0)
    used = IntegerField(default=0)
    balance= IntegerField(default=0)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    datepayment = DateField(db_index=True, null=True, blank=True)
    dateexpired = DateField(db_index=True, null=True, blank=True)
    note = CharField(db_index=True, max_length=NAME_MAX_LENGTH)

    class Meta:
        ordering = ['datepayment']

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None
    datefirst = None
    inactive = None


class Companysetting(Model):  # PR2019-03-09
    # PR2018-07-20 from https://stackoverflow.com/questions/3090302/how-do-i-get-the-object-if-it-exists-or-none-if-it-does-not-exist
    objects = TsaManager()

    company = ForeignKey(Company, related_name='companysettings', on_delete=CASCADE)
    key = CharField(db_index=True, max_length=CODE_MAX_LENGTH)
    setting = CharField(max_length=2048, null=True, blank=True)

#===========  Classmethod
    @classmethod
    def get_setting(cls, key_str, company): #PR2019-03-09
        # function returns value of setting row that match the filter
        # logger.debug('---  get_setting  ------- ')
        setting = None
        if company and key_str:
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                if row.setting:
                    setting = row.setting
        return setting

    @classmethod
    def set_setting(cls, key_str, setting, company): #PR2019-03-09
        # function returns list of setting rows that match the filter
        logger.debug('---  set_setting  ------- ')
        logger.debug('key_str: ' + str(key_str))
        logger.debug('setting: ' + str(setting))
        # get
        if company and key_str:
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                row.setting = setting
            else:
                if setting:
                    row = cls(company=company, key=key_str, setting=setting)
            row.save()

        logger.debug('row.setting: ' + str(row.setting))
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def delete_instance(instance, update_dict, request, this_text=None):
    # function deletes instance of table,  PR2019-07-21

    if instance:
        try:
            instance.delete(request=request)
            update_dict['id']['deleted'] = True
        except:
            msg_err = ''
            if this_text:
                msg_err = _('%(tbl)s could not be deleted.') % {'tbl': this_text}
            else:
                msg_err = _('This item could not be deleted.')
            update_dict['id']['error'] = msg_err