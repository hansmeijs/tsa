
# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT
from django.db.models import CharField, PositiveSmallIntegerField, IntegerField, DateField, DateTimeField,  DecimalField
from django.db.models.functions import Lower

from tsap.constants import USERNAME_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH
from tsap.functions import get_date_str_from_dateint, get_date_str

from companies.models import TsaManager, TsaBaseModel, Company

import logging
logger = logging.getLogger(__name__)

# PR2018-04-22: backup: (venv) C:\dev\awpr\awpr>py -3 manage.py dumpdata schools --format json --indent 4 > schools/backup/schools.json
#               restore: (venv) C:\dev\awpr\awpr>py -3 manage.py loaddata schools/backup/schools.json


"""

    @classmethod
    def fieldlist(cls):
        return ["idnumber", 
            "lastname", "firstname", "prefix", "gender",
            "birthdate", "title", "function",
            "address", "zip",  "city", "state", "country",
            "tel01", "tel02",  "email01", "email02", "notes"]

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
