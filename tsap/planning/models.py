"""
# PR2019-03-24
from django.db.models import ForeignKey, PROTECT
from companies.models import TsaManager, TsaBaseModel, Company
# PR2018-07-20 from https://stackoverflow.com/questions/3090302/how-do-i-get-the-object-if-it-exists-or-none-if-it-does-not-exist
# CustomManager adds function get_or_none. Used in  Subjectdefault to prevent DoesNotExist exception


class Shift(TsaBaseModel):
    objects = TsaManager()
    company = ForeignKey(Company, related_name='shifts', on_delete=PROTECT)
   #  department = ForeignKey(Department, null=True, blank=True, related_name='shifts', on_delete=PROTECT)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None
"""