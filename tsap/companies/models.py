# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, BooleanField, PositiveIntegerField, IntegerField, DateField, DateTimeField
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from tsap.constants import USERNAME_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH
from tsap.functions import get_date_from_dateint, get_date_str_from_dateint, id_found_in_list, get_date_longstr_from_dte

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
class TsaBaseModel(Model):

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
        super(TsaBaseModel, self).save()

    @property
    def maxlen_code(self):  # PR2019-03-04
        return CODE_MAX_LENGTH

    @property
    def maxlen_name(self):  # PR2019-03-04
        return NAME_MAX_LENGTH

    @property
    def date_first_dte(self):  # PR2019-03-14
        self.dte = None
        if self.date_first_int:
            self.dte = get_date_from_dateint(self.date_first_int)  # PR2019-03-08
        return self.dte
        # return get_date_formatted(self.date_first)

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
    def id_pk(self):  # PR2019-03-04
        return 'id_' + str(self.pk)


    def modified_at_str(self, lang):  # PR2019-03-23
        dte_str = ''
        logger.debug('lang: ' + lang)
        if self.modified_at:
            dte_str = get_date_longstr_from_dte(self.modified_at, lang)  # PR2019-03-23

        logger.debug('modified_at_str: ' + dte_str)
        return dte_str


class Company(TsaBaseModel):
    objects = CustomManager()

    lic_max_empl = PositiveIntegerField(db_index=True, null=True, blank=True)
    licdate_plusone_int = IntegerField(db_index=True, null=True, blank=True)

    @property
    def companyprefix(self):
        #PR2019-03-13 CompanyPrefix is added at front of username, to make usernames unique per company
        id_str = '000000' + str(self.pk)
        return id_str[-6:]

    @classmethod
    def company_choices(cls, request_user):
        #PR2019-03-11 company_choices is used in User_add Form.
        # company_choices creates list of tuples with (company_id, company_name)
        choices = [(0, '---')]
        if request_user:
            # PR2018-12-17
            # request_user.is_role_system: show all companies
            # else: show only company of request_user, field is disabled
            if request_user.is_role_system:
                companies = cls.objects.all()
                for company in companies:
                    company_name = company.name
                    item = (company.id, company_name)
                    choices.append(item)
            else:
                if request_user.company:
                    company_name = request_user.company.name
                    choices = [(request_user.company.id, company_name)]
        return choices

    @classmethod
    def get_company_list(cls, request_user):
        # PR2019-03-02   company_list: [{'pk': '1', 'company': 'Curaçao', 'selected': False},
        #                               {'pk': '2', 'company': 'Sint Maarten', 'selected': True}]
        company_list = []
        rowcount = 0
        if request_user is not None:
            for company in cls.objects.all():
                # selected company will be disabled in dropdown list
                selected = False

                rowcount += 1
                if request_user.company is not None:
                    if company == request_user.company:
                        selected = True
                row_dict = {'pk': str(company.id), 'company':company.name, 'selected': selected}
                company_list.append(row_dict)
        return company_list, rowcount


class Department(TsaBaseModel):
    objects = CustomManager()

    company = ForeignKey(Company, related_name='departments', on_delete=PROTECT)

    @classmethod
    def get_dep_list(cls, request):  # PR2019-03-02
        dep_list = []
        has_cur_dep = False
        allowed_dep_count = 0
        request_user_dep_is_modified = False

        if request.user is not None:
            if request.user.company is not None:
                for dep in Department.objects.filter(company=request.user.company):
                    dep_id_str = str(dep.pk)
                    if id_found_in_list(dep_id_str, dep.deplist, False):
                        is_cur_dep = False
                        if request.user.department is not None:
                            if dep.pk == request.user.department.pk:
                                is_cur_dep = True
                                has_cur_dep = True
                                # logger.debug('is_cur_dep = True dep.base.pk: ' + str(dep.base.pk))
# get dep.shortname
                        dep_name = ''
                        if dep.name:
                            dep_name = dep.name
                        # logger.debug('dep_name: ' + str(dep_name))
# add row to depbase_list
                        row_dict = {'pk': dep_id_str, 'dep_name': dep_name, 'is_cur_dep': is_cur_dep}
                        # logger.debug('row_dict: ' + str(row_dict))
                        dep_list.append(row_dict)

                        allowed_dep_count += 1
                        # logger.debug('allowed_dep_count: ' + str(allowed_dep_count))

            # if request_user.department is not found and company has only 1 dep: set user_dep = this dep

            # if there are allowed deps and current_dep is an allowed dep: do nothing
                if not has_cur_dep:
                    # there are no allowed deps or current_dep is not an allowed dep:
                    if allowed_dep_count == 1:
                        # if there is only 1 allowed dep: make this dep the current dep
                        row_dict_pk_int = int(dep_list[0]['pk'])

                        department = Department.objects.filter(id=row_dict_pk_int).first()
                        # logger.debug('department: ' + str(department) + ' Type: ' + str(type(department)))
                        if department:
                            request.user.department = department
                            # logger.debug('request.user.depbase: ' + str(request.user.depbase) + ' Type: ' + str(type(request.user.depbase)))

                            request_user_dep_is_modified = True
                            # set is_cur_dep true
                            dep_list[0]['is_cur_dep'] = True
                    else:
                        # if there are multiple allowed deps: remove current dep, because it is not in the allowed deps
                        if request.user.department is not None:
                            request.user.department = None
                            request_user_dep_is_modified = True
                    if request_user_dep_is_modified:
                        request.user.save(request=request)

        # logger.debug('depbase_list: ' + str(depbase_list) + ' allowed_dep_count: '  + str(allowed_dep_count))
        # logger.debug('request.user.depbase: ' + str(request.user.depbase))
        # logger.debug('---------get_depbase_list END -------------')
        # logger.debug('   ')

        return dep_list, allowed_dep_count

class Companysetting(Model):  # PR2019-03-09
    # PR2018-07-20 from https://stackoverflow.com/questions/3090302/how-do-i-get-the-object-if-it-exists-or-none-if-it-does-not-exist
    objects = CustomManager()

    company = ForeignKey(Company, related_name='companysettings', on_delete=CASCADE)
    department = ForeignKey(Department, null=True, related_name='companysettings', on_delete=SET_NULL)
    key_str = CharField(db_index=True, max_length=30)

    setting = CharField(max_length=2048, null=True, blank=True)

#===========  Classmethod
    @classmethod
    def get_setting(cls, key_str, request_user): #PR2019-03-09
        # function returns value of setting row that match the filter
        logger.debug('---  get_setting  ------- ')
        setting = ''
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

