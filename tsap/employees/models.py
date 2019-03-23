# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT
from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, IntegerField, DateTimeField
from django.db.models.functions import Lower

from tsap.constants import USERNAME_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH
from tsap.functions import get_date_str_from_dateint, get_date_longstr_from_dte

from companies.models import TsaBaseModel, Company, Department
from customers.models import Order

import logging
logger = logging.getLogger(__name__)

# PR2018-04-22: backup: (venv) C:\dev\awpr\awpr>py -3 manage.py dumpdata schools --format json --indent 4 > schools/backup/schools.json
#               restore: (venv) C:\dev\awpr\awpr>py -3 manage.py loaddata schools/backup/schools.json

# PR2018-07-20 from https://stackoverflow.com/questions/3090302/how-do-i-get-the-object-if-it-exists-or-none-if-it-does-not-exist
# CustomManager adds function get_or_none. Used in  Subjectdefault to prevent DoesNotExist exception
class CustomManager(Manager):
    def get_or_none(self, **kwargs):
        try:
            return self.get(**kwargs)
        except:
            return None

class Employee(TsaBaseModel):
    objects = CustomManager()

    company = ForeignKey(Company, related_name='employees', on_delete=PROTECT)
    deplist = CharField(max_length=255, null=True, blank=True)

    name_first = CharField(db_index=True, max_length=NAME_MAX_LENGTH)
    name_last = CharField(db_index=True, max_length=NAME_MAX_LENGTH)
    prefix = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    email = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)

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

"""

    @classmethod
    def fieldlist(cls):
        return ["idnumber", 
            "lastname", "firstname", "prefix", "gender",
            "birthdate", "title", "function",
            "address", "zip",  "city", "state", "country",
            "tel01", "tel02",  "email01", "email02", "notes"]

    #[WageCodeID]               INT           CONSTRAINT [DF_Employees_WageCodeID] DEFAULT ((0)) NULL,
    #[WorkhoursPerMonth]        MONEY         NULL,
    #[LeavedaysPerYearFulltime] MONEY         NULL,

    class EmployeeData(Model):
        objects = CustomManager()
    
        employee = ForeignKey(Employee, related_name='empl_data', on_delete=PROTECT)
    
        fd = CharField(db_index=True, max_length=20)
        text = CharField(max_length=255, null=True, blank=True)
        number= IntegerField(default=0)
        amount= DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
        date= DateField(null=True, blank=True)
    
        modified_by = ForeignKey(AUTH_USER_MODEL, related_name='+', on_delete=PROTECT)
        modified_at = DateTimeField()

    """

class EmplHour(Model):
    objects = CustomManager()

    employee = ForeignKey(Employee, related_name='emplhours', on_delete=PROTECT)
    order = ForeignKey(Order, related_name='emplhours', on_delete=PROTECT)
    department = ForeignKey(Department, null=True, blank=True, related_name='emplhours', on_delete=PROTECT)

    rosterdate = IntegerField(db_index=True, null=True, blank=True)

    time_start = DateTimeField(db_index=True, null=True, blank=True)
    time_end = DateTimeField(db_index=True, null=True, blank=True)
    time_duration = IntegerField(default=0)

    break_start = DateTimeField(db_index=True, null=True, blank=True)
    break_duration = IntegerField(default=0)

    time_status = PositiveSmallIntegerField(default=0)

    locked = BooleanField(default=False)

    modified_by = CharField(max_length=USERNAME_MAX_LENGTH)
    modified_at = DateTimeField()

    class Meta:
        ordering = ['time_start']


"""
remaining fields of EmployeeHours
    [ShiftID]           INT           NULL,
    [OrderItemID]       INT           NULL,
    [OrderItemTeamID]   INT           NULL,
    [TimeCodeID]        INT           NULL,

    [TimeDurationText]  VARCHAR (5)   NULL,
    [BreakDurationText] VARCHAR (5)   NULL,
    
    [WageCodeID]        INT           NULL,
    [WageFactorID]      INT           NULL,
    [Confirmation]      BIT           NULL,
    [ConfirmationTime]  SMALLDATETIME NULL,
    [AbsenceCategoryID] INT           NULL,
    [IsRealized]        BIT           CONSTRAINT [DF_EmployeeHours_IsRealized] DEFAULT ((0)) NULL,

    [OrderItemHourCode] TINYINT       CONSTRAINT [DF_EmployeeHours_EmployeeHourCode1] DEFAULT ((0)) NULL,
    [EmployeeHourCode]  TINYINT       CONSTRAINT [DF_EmployeeHours_HourCode] DEFAULT ((0)) NULL,
    [ErrorCode]         TINYINT       CONSTRAINT [DF_EmployeeHours_ErrorCode] DEFAULT ((0)) NULL,
    [Notes]             VARCHAR (250) NULL,

"""

