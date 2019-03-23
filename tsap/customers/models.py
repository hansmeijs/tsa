# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT
from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, IntegerField, DecimalField, DateField, DateTimeField
from django.db.models.functions import Lower
from django.utils import timezone, formats

from tsap.constants import USERNAME_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH
from tsap.functions import get_date_str_from_dateint, get_date_longstr_from_dte
from companies.models import Company, Department

import logging
logger = logging.getLogger(__name__)


class CustomManager(Manager):
    def get_or_none(self, **kwargs):
        try:
            return self.get(**kwargs)
        except:
            return None

# PR2019-03-12 from https://godjango.com/blog/django-abstract-base-class-model-inheritance/
# tables  inherit fields from this class
class CustomerBaseModel(Model):

    # set maxlength also in  maxlen_code, maxlen_name
    code = CharField(db_index=True, max_length=CODE_MAX_LENGTH)
    name = CharField(db_index=True, max_length=NAME_MAX_LENGTH)

    date_first_int = IntegerField(db_index=True, null=True, blank=True)
    date_last_int = IntegerField(db_index=True, null=True, blank=True)

    locked = BooleanField(default=False)
    inactive = BooleanField(default=False)

    modified_by = CharField(max_length=USERNAME_MAX_LENGTH)
    modified_at = DateTimeField()

    class Meta:
        abstract = True
        ordering = [Lower('name')]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)

        self.modified_by = self.request.user.username_sliced
        # timezone.now() is timezone aware, based on the USE_TZ setting; datetime.now() is timezone naive. PR2018-06-07
        self.modified_at = timezone.now()

        # when adding record: self.id=None, set force_insert=True; otherwise: set force_update=True PR2018-06-09
        super(CustomerBaseModel, self).save()

    @property
    def maxlen_code(self):  # PR2019-03-04
        return CODE_MAX_LENGTH

    @property
    def maxlen_name(self):  # PR2019-03-04
        return NAME_MAX_LENGTH

    @property
    def date_first_str(self):  # PR2019-03-06
        dte_str = ''
        if self.date_first_int:
            dte_str = get_date_str_from_dateint(self.date_first_int)  # PR2019-03-08
        return dte_str
        # return get_date_formatted(self.date_first)

    @property
    def date_last_str(self):  # PR2019-03-06
        dte_str = ''
        if self.date_last_int:
            dte_str = get_date_str_from_dateint(self.date_last_int)  # PR2019-03-08
        return dte_str

    @property
    def id_code(self):  # PR2019-03-04
        return 'id_code_' + str(self.pk)

    @property
    def id_name(self):  # PR2019-03-04
        return 'id_name_' + str(self.pk)

    @property
    def id_datefirst(self):  # PR2019-03-04
        return 'id_datefirst_' + str(self.pk)

    @property
    def id_datelast(self):  # PR2019-03-04
        return 'id_datelast_' + str(self.pk)

    @property
    def id_locked(self):  # PR2019-03-04
        return 'id_locked_' + str(self.pk)

    @property
    def id_inactive(self):  # PR2019-03-04
        return 'id_inactive_' + str(self.pk)

    @property
    def id_modby(self):  # PR2019-03-04
        return 'id_modby_' + str(self.pk)

    @property
    def id_modat(self):  # PR2019-03-04
        return 'id_modat_' + str(self.pk)

    def modified_at_str(self, lang):  # PR2019-03-23
        dte_str = ''
        if self.modified_at:
            dte_str = get_date_longstr_from_dte(self.modified_at, lang)  # PR2019-03-23
        return dte_str


class Taxcode(CustomerBaseModel):
    objects = CustomManager()

    company = ForeignKey(Company, related_name='taxcodes', on_delete=PROTECT)
    code = CharField(max_length=4)
    taxrate = DecimalField(max_digits=8, decimal_places=4)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    date_first_int = None
    date_last_int = None


class Customer(CustomerBaseModel):
    objects = CustomManager()

    company = ForeignKey(Company, related_name='customers', on_delete=PROTECT)
    deplist = CharField(max_length=255, null=True, blank=True)

    @property
    def id_deplist(self):  # PR2019-03-04
        return 'id_deplist_' + str(self.pk)


class Order(CustomerBaseModel):
    objects = CustomManager()

    customer = ForeignKey(Customer, related_name='orders', on_delete=PROTECT)
    department = ForeignKey(Department, null=True, blank=True, related_name='orders', on_delete=PROTECT)


class OrderItem(Model):
    objects = CustomManager()

    order = ForeignKey(Order, related_name='orderitems', on_delete=PROTECT)
    rosterdate = DateField(db_index=True, null=True, blank=True)

    datime_start = DateTimeField(db_index=True, null=True, blank=True)
    datime_end = DateTimeField(db_index=True, null=True, blank=True)

    quantity = IntegerField(default=0)
    rate = DecimalField(max_digits=10, decimal_places=2)

    taxcode = ForeignKey(Taxcode, related_name='orderhours', on_delete=PROTECT)
    realized = BooleanField(default=False)

    modified_by = CharField(max_length=USERNAME_MAX_LENGTH)
    modified_at = DateTimeField()
