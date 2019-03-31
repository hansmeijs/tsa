"""
# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT
from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, IntegerField, DecimalField, DateField, DateTimeField

from companies.models import TsaManager, TsaBaseModel, Company
from employees.models import Employee
from planning.models import Shift

from tsap.constants import USERNAME_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH
import logging
logger = logging.getLogger(__name__)



class Taxcode(TsaBaseModel):
    objects = CustomManager()

    company = ForeignKey(Company, related_name='taxcodes', on_delete=PROTECT)
    code = CharField(max_length=4)

    rate = DecimalField(max_digits=8, decimal_places=4)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None


class OrderItem(TsaBaseModel):
    objects = CustomManager()

    order = ForeignKey(Order, related_name='orderitems', on_delete=PROTECT)
    rosterdate = DateField(db_index=True, null=True, blank=True)

    datime_start = DateTimeField(db_index=True, null=True, blank=True)
    datime_end = DateTimeField(db_index=True, null=True, blank=True)

    quantity = IntegerField(default=0)
    rate = DecimalField(max_digits=10, decimal_places=2)

    taxcode = ForeignKey(Taxcode, related_name='orderitems', on_delete=PROTECT)
    realized = BooleanField(default=False)


class OrderEmplHour(TsaBaseModel):
    objects = CustomManager()

    order = ForeignKey(Order, related_name='orderemplhours', on_delete=PROTECT)
    employee = ForeignKey(Employee, related_name='orderemplhours', on_delete=PROTECT, null=True, blank=True)

    rosterdate = DateField(db_index=True, null=True, blank=True)

    # TODO
    # wagecode = ForeignKey(Wagecode, related_name='emplorderhours', on_delete=PROTECT)
    # wagefactor = ForeignKey(Wagefactor, related_name='emplorderhours', on_delete=PROTECT)
    # emplhour_cat = ForeignKey(Absencecategory, related_name='emplorderhours', on_delete=PROTECT)

    emplhour_shift = ForeignKey(Shift, related_name='orderemplhours', on_delete=PROTECT)
    emplhour_start = DateTimeField(db_index=True, null=True, blank=True)
    emplhour_end = DateTimeField(db_index=True, null=True, blank=True)
    emplhour_duration = IntegerField(default=0)
    emplbreak_start = DateTimeField(null=True, blank=True)
    emplbreak_duration = IntegerField(default=0)
    emplhour_rate = DecimalField(max_digits=10, decimal_places=2)
    emplhour_status = PositiveSmallIntegerField(db_index=True, default=0)

    orderhour_duration = IntegerField(default=0)
    orderhour_status = PositiveSmallIntegerField(db_index=True, default=0)

    orderhourrate = DecimalField(max_digits=10, decimal_places=2)
    taxcode = ForeignKey(Taxcode, related_name='orderemplhours', on_delete=PROTECT)
    amount = DecimalField(max_digits=10, decimal_places=2)
    invoice_status = PositiveSmallIntegerField(db_index=True, default=0)

    class Meta:
        ordering = ['emplhour_start']
"""