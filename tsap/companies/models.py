# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, IntegerField, \
    DateField, DateTimeField, Q, Count
from django.db.models.functions import Upper, Lower

from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from tsap.settings import AUTH_USER_MODEL, TIME_ZONE
from tsap.constants import USERNAME_SLICED_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH
from tsap.functions import get_date_yyyymmdd, get_time_HHmm, get_datetimelocal_from_datetime, \
    get_date_longstr_from_dte, get_timelocal_formatDHM, formatDMYHM_from_datetime, format_WDMY_from_dte, get_date_WDM_from_dte, format_DMY_from_dte, \
    get_weekdaylist_for_DHM, get_timeDHM_from_dhm, get_date_HM_from_minutes, remove_empty_attr_from_dict, \
    fielddict_date, fielddict_datetime, fielddict_duration, formatWHM_from_datetime, format_HM_from_dtetime


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
        # skip modifiedby when subtracting balance PR2019-04-09
        if 'request' in kwargs:
            self.request = kwargs.pop('request', None)

            self.modifiedby = self.request.user
            # timezone.now() is timezone aware, based on the USE_TZ setting; datetime.now() is timezone naive. PR2018-06-07
            self.modifiedat = timezone.now()

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
    interval = PositiveSmallIntegerField(default=1)
    timeformat = CharField(max_length=4, null=True, blank=True)

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
    type = IntegerField(default=0)  # 0 = normal, 1 = internal, 2 = absence, 3 = template

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
    type = IntegerField(default=0)  # 0 = normal, 1 = internal, 2 = absence, 3 = template

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
    type = IntegerField(default=0)  # 0 = normal, 1 = internal, 2 = absence, 3 = template

    cycle = PositiveSmallIntegerField(default=0)
    issystem = BooleanField(default=False)
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
    leavedays =  IntegerField(default=0) # /leave ays per year, full time

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

    @classmethod
    def create_employee_list(cls, exclude_inactive, company, user_lang):
    # --- create list of all active employees of this company PR2019-06-17
        crit = Q(company=company)
        if exclude_inactive:
            crit.add(~Q(inactive=False), crit.connector)
        employees = cls.objects.filter(crit).order_by(Lower('code'))

        employee_list = []
        if employees:
            for employee in employees:
                dict = {'pk': employee.pk}
                dict['id'] = {'pk': employee.pk, 'ppk': employee.company.pk}

                for field in ['code', 'namefirst', 'namelast', 'inactive']:
                    value = getattr(employee, field)
                    if value:
                        dict[field] = {'value': value}

                for field in ['datefirst', 'datelast']:
                    date = getattr(employee, field)
                    if date:
                        dict[field] = fielddict_date(date, user_lang)

                employee_list.append(dict)
        return employee_list


class Teammember(TsaBaseModel):
    objects = TsaManager()

    team = ForeignKey(Team, related_name='teammembers', on_delete=CASCADE)
    employee = ForeignKey(Employee, related_name='teammembers', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None


    @classmethod
    def create_teammember_list(cls, order, user_lang):
        # create list of teams of this order PR2019-05-27
        teammember_list = []
        if order:
            teammembers = Teammember.objects.filter(team__scheme__order=order).order_by('employee__code')

            for teammember in teammembers:
                dict = {'pk': teammember.pk,
                        'id': {'pk': teammember.pk,
                               'ppk': teammember.team.pk}}
                if teammember.team:
                    dict['team'] = {'pk': teammember.team.pk, 'value': teammember.team.code}
                if teammember.employee:
                    dict['employee'] = {'pk': teammember.employee.pk, 'value': teammember.employee.code}
                for field in ['datefirst', 'datelast']:
                    value = getattr(teammember, field)
                    if value:
                        dict[field] = {'value': value,
                                      'wdm': get_date_WDM_from_dte(value, user_lang),
                                      'wdmy': format_WDMY_from_dte(value, user_lang),
                                      'dmy': format_DMY_from_dte(value, user_lang)}
                teammember_list.append(dict)
        return teammember_list

    @classmethod
    def validate_employee_exists_in_teammembers(cls, employee, team, this_pk):  # PR2019-06-11
        # - check if employee exists - employee is required field of teammember, is skipped in schemeitems (no field employee)
        msg_err = None
        exists = False
        if employee and team:
            crit = Q(team=team) & Q(employee=employee)
            if this_pk:
                crit.add(~Q(pk=this_pk), crit.connector)
            exists = cls.objects.filter(crit).exists()
        if exists:
            msg_err = _('This employee already exists.')
        return msg_err


# =================
class Schemeitembase(Model):# PR2019-06-03
    objects = TsaManager()


class Schemeitem(TsaBaseModel):
    objects = TsaManager()

    base = ForeignKey(Schemeitembase, related_name='+', on_delete=PROTECT)

    scheme = ForeignKey(Scheme, related_name='schemeitems', on_delete=CASCADE)
    team = ForeignKey(Team, related_name='schemeitems', on_delete=SET_NULL, null=True, blank=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    code = None
    name = None
    datefirst = None
    datelast = None

    rosterdate = DateField(db_index=True)

    shift = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    timestart = DateTimeField(db_index=True, null=True, blank=True)
    timestartdhm = CharField(max_length=CODE_MAX_LENGTH, null=True, blank=True)  # dhm" "-1;17;45"
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    timeenddhm = CharField(max_length=CODE_MAX_LENGTH, null=True, blank=True)
    timeduration = IntegerField(default=0)  # unit is minute
    breakduration = IntegerField(default=0) # unit is minute

    class Meta:
        ordering = ['rosterdate', 'timestart']

    def __str__(self):
        return 'schemeitem_pk_' + str(self.pk)

    @classmethod
    def create_schemeitem_list(cls, order, comp_timezone, user_lang):
        # create list of schemeitems of this scheme PR2019-05-12
        schemeitem_list = []
        if order:
            schemeitems = cls.objects.filter(scheme__order=order)
            for schemeitem in schemeitems:
                schemeitem_dict = cls.create_schemeitem_dict(schemeitem, comp_timezone, user_lang)
                schemeitem_list.append(schemeitem_dict)
        return schemeitem_list

    @staticmethod
    def create_schemeitem_dict(schemeitem, comp_timezone, user_lang, temp_pk=None, is_created=False, is_deleted=False, updated_list=None):
        # create list of schemeitems of this scheme PR2019-05-12
        schemeitem_dict = {}
        field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                      'timestart', 'timeend', 'timeduration', 'breakduration')

        for field in field_list:
            schemeitem_dict[field] = {}
            if updated_list:
                if field in updated_list:
                    schemeitem_dict[field]['updated'] = True

        if schemeitem:
            for field in ['id']:
                schemeitem_dict[field] = {'pk': schemeitem.id, 'ppk': schemeitem.scheme.id}
                if temp_pk:
                    schemeitem_dict[field]['temp_pk'] = temp_pk
                if is_created:
                    schemeitem_dict[field]['created'] = True
                if is_deleted:
                    schemeitem_dict[field]['deleted'] = True

            if not is_deleted:
                for field in ['rosterdate']:
                    value = getattr(schemeitem, field)
                    if value:
                        schemeitem_dict[field] = fielddict_date(value, user_lang)

                for field in ['shift']:
                    value = getattr(schemeitem, field)
                    if value:
                        field_dict = {'value': value}
                        schemeitem_dict[field] = field_dict

                for field in ['team']:
                    if schemeitem.team:
                        value = schemeitem.team.code
                        team_pk = schemeitem.team.id
                        field_dict = {'value': value, 'team_pk':team_pk}
                        if field_dict:
                            schemeitem_dict[field] = field_dict

                for field in ['timestart', 'timeend']:
                    value = getattr(schemeitem, field + 'dhm')
                    rosterdate = getattr(schemeitem, 'rosterdate')
                    datetime = getattr(schemeitem, field)
                    if value:
                        field_dict = {'value': value,
                                      'dhm': get_timeDHM_from_dhm(rosterdate, value, comp_timezone, user_lang),
                                      'dmyhm': formatDMYHM_from_datetime(datetime, comp_timezone, user_lang)
                                      }
                        schemeitem_dict[field] = field_dict

                for field in ['timeduration', 'breakduration']:
                    value = getattr(schemeitem, field)
                    if value:
                        field_dict = {'value': value, 'hm': get_date_HM_from_minutes( value, user_lang)}
                        schemeitem_dict[field] = field_dict


    # --- remove empty attributes from update_dict
        remove_empty_attr_from_dict(schemeitem_dict)

        return schemeitem_dict

    @classmethod
    def create_shift_list(cls, order):
        # create list of shifts of this scheme PR2019-05-01
        shift_list = []
        if order:
            # return all shifts that have value from the scheemitems of this scheme
            shifts = cls.objects.filter(scheme__order=order).\
                exclude(shift__exact='').\
                exclude(shift__isnull=True).\
                values('scheme_id', 'shift', 'timestartdhm', 'timeenddhm', 'breakduration')\
                .annotate(count=Count('shift'))\
                .order_by(Lower('shift'))

            for shift in shifts:
                # schemeitem: {'shift': 'Shift 2', 'timestart': None, 'timeend': None, 'breakduration': 0, 'total': 1}

                # add scheme.pk and total to dict 'id'
                dict = {'id': {'ppk': shift.get('scheme_id'), 'count': shift.get('count')}}

                for field in ['shift', 'timestartdhm', 'timeenddhm', 'breakduration']:
                    value = shift.get(field)
                    if value:
                        fieldname = field
                        if field == 'shift':
                            fieldname = 'code'
                        dict[fieldname] = {'value': value}

                if dict:
                    shift_list.append(dict)
        return shift_list


class Orderhour(TsaBaseModel):
    objects = TsaManager()

    order = ForeignKey(Order, related_name='orderhours', on_delete=PROTECT)
    schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True, blank=True)

    rosterdate = DateField(db_index=True, null=True, blank=True)
    shift = CharField(db_index=True, max_length=CODE_MAX_LENGTH, null=True, blank=True)
    duration = IntegerField(default=0)  # unit is hour * 100
    status = PositiveSmallIntegerField(db_index=True, default=0)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    taxrate = IntegerField(default=0) # /10000 unit
    orderhourstatus = PositiveSmallIntegerField(db_index=True, default=0)

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
    timestart = DateTimeField(db_index=True, null=True, blank=True)
    timeend = DateTimeField(db_index=True, null=True, blank=True)
    timeduration = IntegerField(default=0)  # unit is hour * 100
    breakduration = IntegerField(default=0) # unit is hour * 100
    timestatus = PositiveSmallIntegerField(db_index=True, default=0)

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
    breakduration = IntegerField(default=0) # unit is hour * 100
    timestatus = PositiveSmallIntegerField(db_index=True, default=0)
    note = CharField(db_index=True, max_length=NAME_MAX_LENGTH)

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
        # logger.debug('---  set_setting  ------- ')
        # logger.debug('setting: ' + str(setting))
        # get
        if company and key_str:
            row = cls.objects.filter(company=company, key=key_str).first()
            if row:
                row.setting = setting
            else:
                if setting:
                    row = cls(company=company, key=key_str, setting=setting)
            row.save()

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def validate_code_or_name(table, field, new_value, parent_pk, this_pk=None):
    # validate if order code already_exists in this table PR2019-06-10
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    logger.debug('validate_code_or_name: ' + str(table) + ' ' + str(field) + ' ' + str(new_value) + ' ' + str(parent_pk) + ' ' + str(this_pk))
    msg_err = None
    if not parent_pk:
        msg_err = _("Error.")
    else:
        max_len = CODE_MAX_LENGTH  if field == 'code' else NAME_MAX_LENGTH

        length = 0
        if new_value:
            length = len(new_value)
        logger.debug('length: ' + str(length))

        fld = _('Code') if field == 'code' else _('Name')
        if length == 0:
            if field == 'name':
                msg_err = _('Name cannot be blank.')
            else:
                msg_err = _('%(fld)s cannot be blank.') % {'fld': fld}
        elif length > max_len:
            # msg_err = _('%(fld)s is too long. %(max)s characters or fewer.') % {'fld': fld, 'max': max_len}
            msg_err = _("%(fld)s '%(val)s' is too long, %(max)s characters or fewer.") % {'fld': fld, 'val': new_value, 'max': max_len}
            # msg_err = _('%(fld)s cannot be blank.') % {'fld': fld}
        if not msg_err:
    # check if code already exists
            crit = None
            if field == 'code':
                crit = Q(code__iexact=new_value)
            elif field == 'name':
                crit = Q(name__iexact=new_value)
            if this_pk:
                crit.add(~Q(pk=this_pk), crit.connector)

            #logger.debug('validate_code_or_name')
            #logger.debug('table: ' + str(table) + 'field: ' + str(field) + ' new_value: ' + str(new_value))

            exists = False
            if table == 'customer':
                crit.add(Q(company=parent_pk), crit.connector)
                exists = Customer.objects.filter(crit).exists()
            elif table == 'order':
                crit.add(Q(customer=parent_pk), crit.connector)
                exists = Order.objects.filter(crit).exists()
            elif table == 'scheme':
                crit.add(Q(order=parent_pk), crit.connector)
                exists = Scheme.objects.filter(crit).exists()
            elif table == 'employee':
                crit.add(Q(company=parent_pk), crit.connector)
                exists = Employee.objects.filter(crit).exists()
            else:
                msg_err = _("Model '%(mdl)s' not found.") % {'mdl': table}
            if exists:
                msg_err = _("%(fld)s '%(val)s' already exists.") % {'fld': fld, 'val': new_value}

    return msg_err



def validate_employee_name(namelast, namefirst,  company, this_pk = None):
    # validate if employee already_exists in this company PR2019-03-16
    # from https://stackoverflow.com/questions/1285911/how-do-i-check-that-multiple-keys-are-in-a-dict-in-a-single-pass
                    # if all(k in student for k in ('idnumber','lastname', 'firstname')):
    #logger.debug('employee_exists: ' + str(code) + ' ' + str(namelast) + ' ' + str(namefirst) + ' ' + str(company) + ' ' + str(this_pk))
    msg_dont_add = None

    msg_dont_add = None
    if not company:
        msg_dont_add = _("No company.")
    else:
        if not namelast:
            if not namefirst:
                msg_dont_add = _("First and last name cannot be blank.")
            else:
                msg_dont_add = _("Last name cannot be blank.")
        elif not namefirst:
            msg_dont_add = _("First name cannot be blank.")
    if msg_dont_add is None:
        if len(namelast) > NAME_MAX_LENGTH:
            if len(namefirst) > NAME_MAX_LENGTH:
                msg_dont_add = _("First and last name are too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')
            else:
                msg_dont_add = _("Last name is too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')
        elif len(namefirst) > NAME_MAX_LENGTH:
            msg_dont_add = _("First name is too long.") + str(NAME_MAX_LENGTH) + _(' characters or fewer.')

        # check if first + lastname already exists
        if msg_dont_add is None:
            if this_pk:
                name_exists = Employee.objects.filter(namelast__iexact=namelast,
                                                   namefirst__iexact=namefirst,
                                                   company=company
                                                   ).exclude(pk=this_pk).exists()
            else:
                name_exists = Employee.objects.filter(namelast__iexact=namelast,
                                                   namefirst__iexact=namefirst,
                                                   company=company
                                                   ).exists()
            if name_exists:
                msg_dont_add = _("This employee name already exists.")

    return msg_dont_add

def employee_email_exists(email, company, this_pk = None):
    # validate if email address already_exists in this company PR2019-03-16

    msg_dont_add = None
    if not company:
        msg_dont_add = _("No company.")
    elif not email:
        msg_dont_add = _("Email address cannot be blank.")
    elif len(email) > NAME_MAX_LENGTH:
        msg_dont_add = _('Email address is too long. ') + str(CODE_MAX_LENGTH) + _(' characters or fewer.')
    else:
        if this_pk:
            email_exists = Employee.objects.filter(email__iexact=email,
                                                  company=company
                                                  ).exclude(pk=this_pk).exists()
        else:
            email_exists = Employee.objects.filter(email__iexact=email,
                                                  company=company).exists()
        if email_exists:
            msg_dont_add = _("This email address already exists.")

    return msg_dont_add


