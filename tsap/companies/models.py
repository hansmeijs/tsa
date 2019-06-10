# PR2019-02-28
from django.db.models import Model, Manager, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, BooleanField, PositiveSmallIntegerField, IntegerField, \
    DateField, DateTimeField, Q, Count
from django.db.models.functions import Lower

from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from tsap.settings import AUTH_USER_MODEL, TIME_ZONE
from tsap.constants import USERNAME_SLICED_MAX_LENGTH, CODE_MAX_LENGTH, NAME_MAX_LENGTH
from tsap.functions import get_date_yyyymmdd, get_time_HHmm, get_datetimelocal_from_datetime, \
    get_date_longstr_from_dte, get_timelocal_formatDHM, get_date_WDMY_from_dte, get_date_WDM_from_dte, get_date_DMY_from_dte, \
    get_weekdaylist_for_DHM, get_timeDHM_from_dhm, get_date_HM_from_minutes, remove_empty_attr_from_dict

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
    issystem = BooleanField(default=False)
    email = CharField(db_index=True, max_length=NAME_MAX_LENGTH, null=True, blank=True)
    telephone = CharField(db_index=True, max_length=USERNAME_SLICED_MAX_LENGTH, null=True, blank=True)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    datefirst = None
    datelast = None

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @classmethod
    def create_customer_list(cls, company, include_inactive):
    # --- create list of all active customers of this company PR2019-06-09

        crit = Q(company=company)
        if not include_inactive:
            crit.add(Q(inactive=False), crit.connector)
        customers = cls.objects.filter(crit).order_by(Lower('code'))

        customer_list = []
        for customer in customers:
            dict = {'pk': customer.pk, 'id': {'pk': customer.pk, 'parent_pk': customer.company.pk},
                    'code': {'value': customer.code}}
            customer_list.append(dict)
        return customer_list


class Order(TsaBaseModel):
    objects = TsaManager()

    customer = ForeignKey(Customer, related_name='orders', on_delete=PROTECT)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    taxrate = IntegerField(default=0) # /10000 unit
    issystem = BooleanField(default=False)

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
        # - parent and code are required
        if customer and code:
# - create instance
            instance = cls(customer=customer, code=code, name=name)
# - save instance
            instance.save(request=request)
# - create error when instance not created
            if instance is None:
                msg_err = _('This order could not be created.')
                update_dict['id']['error'] = msg_err
            else:
# - put info in id_dict
                update_dict['id']['created'] = True
                update_dict['id']['pk'] = instance.pk
                update_dict['id']['parent_pk'] = customer.pk
                update_dict['code']['value'] = instance.code
                update_dict['code']['updated'] = True
                update_dict['name']['value'] = instance.name
                update_dict['name']['updated'] = True

            # this attribute 'temp_pk': 'new_1' is necessary to lookup request row on page
            if temp_pk_str:
                update_dict['id']['temp_pk'] = temp_pk_str

        return instance

    @classmethod
    def get_instance(cls, pk_int, update_dict, company):
        # function returns instance of table, puts int in  PR2019-06-06
        logger.debug('---get_instance')
        logger.debug('pk_int: ' + str(pk_int))
        logger.debug('company: ' + str(company))

        instance = None
        if pk_int:
            try:
                instance = cls.objects.get(id=pk_int, customer__company=company)
            except:
                pass
        if instance:
            update_dict['id']['pk_int'] = pk_int
            update_dict['id']['table'] = 'order'
        return instance

    @classmethod
    def get_parent_instance(cls, parent_pk_int, update_dict, company):
        # function checks if parent exists, writes 'parent_pk' and 'table' in update_dict['id'] PR2019-06-06
        parent_instance = None
        if parent_pk_int:
            try:
                parent_instance = Customer.objects.get(id=parent_pk_int, company=company)
            except:
                pass
            if parent_instance:
                update_dict['id']['parent_pk'] = parent_pk_int
        return parent_instance

    @classmethod
    def delete_instance(cls, pk_int, parent_pk_int, update_dict, request):
        # function deletes instance of table,  PR2019-06-06
        instance = None
        if pk_int and parent_pk_int:
            instance = cls.objects.filter(id=pk_int, customer__id=parent_pk_int).first()

        if instance:
            pk_int = instance.id
            try:
                instance.delete(request=request)
                update_dict['id']['deleted'] = True
            except:
                msg_err = _('This order could not be deleted.')
                update_dict['id']['error'] = msg_err

        return update_dict

    @classmethod
    def create_order_list(cls, company, user_lang, include_inactive):
    # --- create list of all active orders of this company PR2019-06-09

        crit = Q(customer__company=company)
        if not include_inactive:
            crit.add(Q(inactive=False), crit.connector)
        orders = cls.objects.filter(crit).order_by(Lower('customer__code'), Lower('code'))

        order_list = []
        if orders:
            for order in orders:
                dict = {'pk': order.pk}
                dict['id'] = {'pk': order.pk, 'parent_pk': order.customer.pk}
                if order.code:
                    dict['code'] = {'value': order.code}
                if order.name:
                    dict['name'] = {'value': order.name}

                for field in ['code', 'name', 'inactive']:
                    value = getattr(order, field)
                    if value:
                        dict[field] = {'value': value}

                for field in ['datefirst', 'datelast']:
                    value = getattr(order, field)
                    if value:
                        dict[field] = {'value': value,
                                      'wdm': get_date_WDM_from_dte(value, user_lang),
                                      'wdmy': get_date_WDMY_from_dte(value, user_lang),
                                      'dmy': get_date_DMY_from_dte(value, user_lang),
                                      'offset': get_weekdaylist_for_DHM(value, user_lang)}

                order_list.append(dict)
        return order_list


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

    @property
    def id_str(self):
        return 'id_obj_' + self.pk


class Scheme(TsaBaseModel):
    objects = TsaManager()
    order = ForeignKey(Order, related_name='+', on_delete=CASCADE)

    # PR2019-03-12 from https://docs.djangoproject.com/en/2.2/topics/db/models/#field-name-hiding-is-not-permitted
    name = None

    cycle = PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = [Lower('code')]

    def __str__(self):
        return self.code

    @classmethod
    def create_scheme_list(cls, order, user_lang):
    # --- create list of all active schemes of this order PR2019-05-23
        scheme_list = []
        if order:
            schemes = cls.objects.filter(order=order, inactive=False).order_by( Lower('code'))
            if schemes:
                for scheme in schemes:
                    dict = {'pk': scheme.pk,
                            'id': {'pk': scheme.pk,
                            'parent_pk': scheme.order.pk},
                            'code': {'value': scheme.code},
                            'cycle': {'value': getattr(scheme, 'cycle', 0)}}
                    for field in ['datefirst', 'datelast']:
                        value = getattr(scheme, field)
                        if value:
                            dict[field] = {'value': value,
                                          'wdm': get_date_WDM_from_dte(value, user_lang),
                                          'wdmy': get_date_WDMY_from_dte(value, user_lang),
                                          'dmy': get_date_DMY_from_dte(value, user_lang)}
                    scheme_list.append(dict)
        return scheme_list


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
                                   'parent_pk': team.scheme.pk},
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

    @classmethod
    def create_employee_list(cls, company):
    # --- create list of all active employees of this company PR2019-05-30
        employees = cls.objects.filter(
            company=company,
            inactive=False
        ).order_by(Lower('code'))
        employee_list = []
        for employee in employees:
            dict = {'pk': employee.pk, 'id': {'pk': employee.pk, 'parent_pk': employee.company.pk},
                    'code': {'value': employee.code}}
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
                               'parent_pk': teammember.team.pk}}
                if teammember.team:
                    dict['team'] = {'pk': teammember.team.pk, 'value': teammember.team.code}
                if teammember.employee:
                    dict['employee'] = {'pk': teammember.employee.pk, 'value': teammember.employee.code}
                for field in ['datefirst', 'datelast']:
                    value = getattr(teammember, field)
                    if value:
                        dict[field] = {'value': value,
                                      'wdm': get_date_WDM_from_dte(value, user_lang),
                                      'wdmy': get_date_WDMY_from_dte(value, user_lang),
                                      'dmy': get_date_DMY_from_dte(value, user_lang)}
                teammember_list.append(dict)
        return teammember_list


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
        return  'schemeitem_pk_' + str(self.pk)

    @classmethod
    def create_schemeitem_list(cls, order, user_lang):
        # create list of schemeitems of this scheme PR2019-05-12
        schemeitem_list = []
        if order:
            schemeitems = cls.objects.filter(scheme__order=order)
            for schemeitem in schemeitems:
                schemeitem_dict = cls.create_schemeitem_dict(schemeitem, user_lang)
                schemeitem_list.append(schemeitem_dict)
        return schemeitem_list

    @staticmethod
    def create_schemeitem_dict(schemeitem, user_lang, temp_pk=None,
                               is_created=False, is_deleted=False, updated_list=None):
        # create list of schemeitems of this scheme PR2019-05-12
        schemeitem_dict = {}
        field_list = ('id', 'scheme', 'rosterdate', 'shift', 'team',
                      'time_start', 'time_end', 'time_duration', 'break_duration')

        for field in field_list:
            schemeitem_dict[field] = {}
            if updated_list:
                if field in updated_list:
                    schemeitem_dict[field]['updated'] = True

        if schemeitem:
            for field in ['id']:
                schemeitem_dict[field] = {'pk': schemeitem.id, 'parent_pk': schemeitem.scheme.id}
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
                        field_dict = {'value': value,
                                      'wdm': get_date_WDM_from_dte(value, user_lang),
                                      'wdmy': get_date_WDMY_from_dte(value, user_lang),
                                      'dmy': get_date_DMY_from_dte(value, user_lang),
                                      'offset': get_weekdaylist_for_DHM(value, user_lang)}
                        schemeitem_dict[field] = field_dict

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

                for field in ['time_start', 'time_end']:
                    value = getattr(schemeitem, field + '_dhm')
                    rosterdate = getattr(schemeitem, 'rosterdate')
                    if value:
                        field_dict = {'value': value, 'dhm': get_timeDHM_from_dhm(rosterdate, value, user_lang)}
                        schemeitem_dict[field] = field_dict

                for field in ['time_duration', 'break_duration']:
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
                values('scheme_id', 'shift', 'time_start_dhm', 'time_end_dhm', 'break_duration')\
                .annotate(count=Count('shift'))\
                .order_by(Lower('shift'))

            for shift in shifts:
                # schemeitem: {'shift': 'Shift 2', 'time_start': None, 'time_end': None, 'break_duration': 0, 'total': 1}

                # add scheme.pk and total to dict 'id'
                dict = {'id': {'parent_pk': shift.get('scheme_id'), 'count': shift.get('count')}}

                for field in ['shift', 'time_start_dhm', 'time_end_dhm', 'break_duration']:
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

    order = ForeignKey(Order, related_name='orderhours', on_delete=PROTECT, null=True, blank=True)

    schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True, blank=True)

    rosterdate = DateField(db_index=True, null=True, blank=True)

    duration = IntegerField(default=0)  # unit is hour * 100
    status = PositiveSmallIntegerField(db_index=True, default=0)
    rate = IntegerField(default=0) # /100 unit is currency (US$, EUR, ANG)
    amount = IntegerField(default=0)  # /100 unit is currency (US$, EUR, ANG)
    taxrate = IntegerField(default=0) # /10000 unit
    invoicestatus = PositiveSmallIntegerField(db_index=True, default=0)

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

    employee = ForeignKey(Employee, related_name='emplhours', on_delete=PROTECT, null=True, blank=True)
    orderhour = ForeignKey(Orderhour, related_name='emplhours', on_delete=SET_NULL, null=True, blank=True)
    wagecode = ForeignKey(Wagecode, related_name='emplhours', on_delete=PROTECT, null=True, blank=True)

    schemeitem = ForeignKey(Schemeitem, related_name='+', on_delete=SET_NULL, null=True, blank=True)

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

    @property
    def rosterdate_yyyymmdd(self): # PR2019-04-01
        return get_date_yyyymmdd(self.rosterdate)

    @property
    def time_start_datetimelocal(self): # PR2019-04-08
        return get_datetimelocal_from_datetime(self.timestart)

    @property
    def time_start_DHM(self): # PR2019-04-08
        # TODO: lang
        return get_timelocal_formatDHM(self.rosterdate, self.timestart, 'nl')

    @property
    def time_end_datetimelocal(self): # PR2019-04-08
        return get_datetimelocal_from_datetime(self.timeend)

    @property
    def time_end_DHM(self): # PR2019-04-08
        # TODO: lang
        return get_timelocal_formatDHM(self.rosterdate, self.timeend, 'nl')

    @property
    def time_end_HHmm(self): # PR2019-04-07
        return get_time_HHmm(self.timeend)

    @property
    def time_hours(self):
        # duration unit is minutes
        value = self.timeduration / 60
        if not value:  # i.e. if value == 0
            value = ''
        return value

    @property
    def break_hours(self):
        # duration unit is minutes
        value = self.breakduration / 60
        if not value:  # i.e. if value == 0
            value = ''
        return value


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
                key=key_str).first()
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

            row = cls.objects.filter(
                company=request_user.company,
                key=key_str).first()
            if row:
                row.setting = setting
            else:
                row = cls(
                    company=request_user.company,
                    key=key_str,
                    setting=setting
                )
            row.save()




