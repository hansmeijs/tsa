# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, BooleanField, PositiveIntegerField, IntegerField, DecimalField, DateField, DateTimeField
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from tsap.constants import USERNAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH
from tsap.functions import get_date_str, get_date_str_from_dateint, id_found_in_list, get_date_longstr_from_dte

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

    modified_by = CharField(max_length=USERNAME_MAX_LENGTH)
    modified_at = DateTimeField()

    class Meta:
        abstract = True
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    def save(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)

        self.modified_by = self.request.user.username_sliced
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
        return get_date_str(self.datefirst)

    @property
    def datelast_str(self):  # PR2019-03-29
        return get_date_str(self.datelast)

    def modified_at_str(self, lang):  # PR2019-03-23
        dte_str = ''
        logger.debug('lang: ' + lang)
        if self.modified_at:
            dte_str = get_date_longstr_from_dte(self.modified_at, lang)  # PR2019-03-23

        logger.debug('modified_at_str: ' + dte_str)
        return dte_str


class Company(TsaBaseModel):
    objects = TsaManager()

    issystem = BooleanField(default=False)
    lic_max_empl = PositiveIntegerField(db_index=True, null=True, blank=True)
    licdate_plusone_int = IntegerField(db_index=True, null=True, blank=True)

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

class Order(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='orders', on_delete=PROTECT)
    issystem = BooleanField(default=False)


class Object(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='+', on_delete=PROTECT)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None


class Companysetting(Model):  # PR2019-03-09
    # PR2018-07-20 from https://stackoverflow.com/questions/3090302/how-do-i-get-the-object-if-it-exists-or-none-if-it-does-not-exist
    objects = TsaManager()

    company = ForeignKey(Company, related_name='companysettings', on_delete=CASCADE)
    # department = ForeignKey(Department, null=True, related_name='companysettings', on_delete=SET_NULL)
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

class Wagecode(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='wagecodes', on_delete=PROTECT)
    # department = ForeignKey(Department, null=True, blank=True, related_name='wagecodes', on_delete=PROTECT)

    rate = DecimalField(max_digits=8, decimal_places=2)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None


class Employee(TsaBaseModel):
    objects = TsaManager()

    company = ForeignKey(Company, related_name='+', on_delete=PROTECT)
    #deplist = CharField(max_length=255, null=True, blank=True)

    name_first = CharField(db_index=True, max_length=NAME_MAX_LENGTH)
    name_last = CharField(db_index=True, max_length=NAME_MAX_LENGTH)
    prefix = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    email = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)

    wagecode = ForeignKey(Wagecode, related_name='eployees', on_delete=PROTECT, null=True, blank=True)
    workhours_permonth = DecimalField(max_digits=10, decimal_places=2, default=0)
    leavedays_peryear_fulltime = DecimalField(max_digits=10, decimal_places=2, default=0)


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
    def datefirst_str(self):  # PR2019-03-27
        dte_str = ''
        if self.datefirst:
            dte_str = get_date_str(self.datefirst)
        return dte_str

    @property
    def datelast_str(self):   # PR2019-03-27
        dte_str = ''
        if self.datelast:
            dte_str = get_date_str(self.datelast)
        return dte_str
