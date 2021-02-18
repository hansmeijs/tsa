# PR2019-02-28
from django.db.models import Model, ForeignKey, PROTECT, CASCADE, SET_NULL
from django.db.models import CharField, IntegerField, PositiveSmallIntegerField, BooleanField, DateTimeField, EmailField
from django.contrib.auth.models import AbstractUser, UserManager
from django.core.validators import RegexValidator
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _

from django.contrib.postgres.fields import ArrayField, JSONField

from tsap import authentication as auth
from tsap import constants as c
from tsap.settings import AUTH_USER_MODEL
from companies.models import Company
from companies.models import Employee

import json
import logging
logger = logging.getLogger(__name__)

# === USER =====================================
# PR2018-05-22 added to create a case-insensitive username
# from https://simpleisbetterthancomplex.com/tutorial/2017/02/06/how-to-implement-case-insensitive-username.html
class CustomUserManager(UserManager):
    def get_by_natural_key(self, username):
        case_insensitive_username_field = '{}__iexact'.format(self.model.USERNAME_FIELD)
        return self.get(**{case_insensitive_username_field: username})

    def get_or_none(self, **kwargs):
        try:
            return self.get(**kwargs)
        except:
            return None

class User(AbstractUser):
    # PR2018-05-22 added to create a case-insensitive username
    objects = CustomUserManager()

    username = CharField(
        max_length=c.USERNAME_MAX_LENGTH,
        unique=True,
        # help_text=_('Required. {} characters or fewer. Letters, digits and @/./+/-/_ only.'.format(c.USERNAME_MAX_LENGTH)),
        help_text=_('Required, %(len)s characters or fewer. Letters, digits and @/./+/-/_ only.') % {'len': c.USERNAME_SLICED_MAX_LENGTH},
        validators=[
            RegexValidator(r'^[\w.@+-]+$',
            _('Enter a valid username. '
            'This value may contain only letters, numbers '
            'and @/./+/-/_ characters.'), 'invalid'),
        ],
        error_messages={
            'unique': _("A user with that username already exists."),
        })

    last_name = CharField(
        max_length=50,
        help_text=_('Required. {} characters or fewer.'.format(50)),
        validators=[
            RegexValidator(r'^[\w .\'-]+$',
            _('Enter a valid name. '
            'This value may contain only letters, numbers '
            'and \'/./-/_ characters.'), 'invalid'),
        ],)

    email = EmailField( _('email address'),)
    # PR2018-08-01 role choices cannot be set in Model, because allowed values depend on request_user. Use role_list in Form instead
    role = PositiveSmallIntegerField(
        default=0,
        # choises must be tuple or list, dictionary gives error: 'int' object is not iterable
        choices=c.CHOICES_ROLE
    )
    permits = PositiveSmallIntegerField(default=0)
    permitcustomers = ArrayField(IntegerField(), null=True)
    permitorders = ArrayField(IntegerField(), null=True)

    activated = BooleanField(default=False)
    activatedat = DateTimeField(null=True)
    company = ForeignKey(Company, related_name='users', on_delete=PROTECT, null=True, blank=True)
    employee = ForeignKey(Employee, related_name='users', on_delete=PROTECT, null=True, blank=True)

    lang = CharField(max_length=8, null=True, blank=True)

    modifiedby = ForeignKey(AUTH_USER_MODEL, null=True, related_name='+', on_delete=SET_NULL)
    modifiedat = DateTimeField(null=True)

    class Meta:
        ordering = ['username',]


    def __str__(self):
        return self.username[6:]

    def __init__(self, *args, **kwargs):
        super(User, self).__init__(*args, **kwargs)

    def save(self, *args, **kwargs):
        # when request_user changes his own settings: self = request_user
        # when request_user changes other user: self = selected_user
        # logger.debug('class User(AbstractUser) save self (selected_user): ' + str(self))
        self.request = kwargs.pop('request', None)

    # save object
        if self.request:
            if self.request.user:
                self.modified_by = self.request.user.username_sliced
        # timezone.now() is timezone aware, based on the USE_TZ setting; datetime.now() is timezone naive. PR2018-06-07
        self.modifiedat = timezone.now()

        # when adding record: self.id=None, set force_insert=True; otherwise: set force_update=True PR2018-06-09
        # super(User, self).save(force_insert=not is_update, force_update=is_update, **kwargs)
        # self.id gets its value in super(Country, self).save

        self.is_update = self.pk is not None  # self.id is None before new record is saved

        # when adding record: self.id=None, set force_insert=True; otherwise: set force_update=True PR2018-06-09
        super(User, self).save(force_insert=not self.is_update, force_update=self.is_update, **kwargs)
        # self.id gets its value in super(Country, self).save

    @property
    def username_sliced(self):
        # PR2019-03-13 Show username 'Hans' instead of '000001Hans'
        return self.username[6:]

    @property
    def role_str(self):
        # PR2018-05-31 NB: self.role = False when None or value = 0
        #if self.role == c.ROLE_00_SCHOOL:
        #    _role_str = _('School')
        #elif self.role == c.ROLE_01_INSP:
        #    _role_str = _('Inspection')
        #elif self.role == c.ROLE_02_SYSTEM:
        #    _role_str = _('System')
        _role_str = c.CHOICES_ROLE_DICT.get(self.role,'')
        return _role_str

    @property
    def permits_str(self):
        # PR2018-05-26 permits_str displays list of permits un UserListForm, e.g.: 'Schooladmin, Authorize, Write'
        permits_all_dict = c.PERMIT_DICT
        permits_str = ''
        if self.permits_tuple is not None:
            #logger.debug('class User(AbstractUser): permits_tuple: ' + str(self.permits_tuple))
            for permit_int in self.permits_tuple:
                #logger.debug('class User(AbstractUser): permit_int: ' + str(permit_int))
                list_item = permits_all_dict.get(permit_int)
                #logger.debug('class User(AbstractUser): permits_str list_item: ' + str(list_item))

                if list_item is not None:
                    # PR2018-06-01 debug: ... + (list_item) gives error: must be str, not __proxy__
                    # solved bij wrapping with str(): + str(list_item)
                    permits_str = permits_str + ', ' + str(list_item)
                    # stop when write permission is found . 'Read' will then not be displayed
                    # PR2018-07-26 debug: doesn't work, because tuple is not in reverse order
                    # if permit_int == c.PERMIT_02_WRITE:
                    #    break
        if not permits_str: # means: if permits_str == '':
            permits_str = ', None'
        # slice off first 2 characters: ', '
        permits_str = permits_str[2:]
        #logger.debug('class User(AbstractUser): permits_str: ' + str(permits_str))
        return permits_str


    @property
    def permits_list(self):
        # PR2020-08-01 permits_list converts self.permits into list,
        # e.g.: permits=15 will be converted to permits_list= [1,2,4,8]
        permits_int = self.permits
        permits_list = []
        if permits_int is not None:
            if permits_int != 0:
                # max value of permits is 127 when start_value = 6
                for i in range(6, -1, -1): # range(start_value, end_value, step), end_value is not included!
                    power = 2 ** i
                    if permits_int >= power:
                        permits_int = permits_int - power
                        permits_list.insert(0, power) # list.insert(0,value) adds at the beginning of the list
        if not permits_list:
            permits_list = [0]
        return permits_list

    @property
    def permits_tuple(self):
        # PR2018-05-27 permits_tuple converts self.permits into tuple,
        # e.g.: permits=15 will be converted to permits_tuple=(1,2,4,8)
        permits_int = self.permits
        permits_list = []
        if permits_int is not None:
            if permits_int != 0:
                for i in range(6, -1, -1): # range(start_value, end_value, step), end_value is not included!
                    power = 2 ** i
                    if permits_int >= power:
                        permits_int = permits_int - power
                        permits_list.insert(0, power) # list.insert(0,value) adds at the beginning of the list
        if not permits_list:
            permits_list = [0]
        return tuple(permits_list)

    @property
    def permits_str_tuple(self): # 2018-12-23
        permits_list = []
        for permit_int in self.permits_tuple:
            permit_str = c.PERMIT_DICT.get(permit_int, '')
            if permit_str:
                permits_list.append(permit_str)
        return tuple(permits_list)

    # PR2018-05-30 list of permits that user can be assigned to:
    # - System users can only have permits: 'Admin' and 'Read'
    # - System users can add all roles: 'System', Insp', School', but other roles olny with 'Admin' and 'Read' permit

    # - Inspection and School users can only add their own role
    # - Inspection and School users can have all permits: 'Admin', 'Auth',  'Write' and 'Read'

    """
    PR2020-08-05
    Gebruikersgroepen en permissies
    Er zijn de volgende gebruikersgroepen: 
    	Systeembeheerder.   Alleen een systeembeheerder kan gebruikers accounts aanmaken en wijzigen. Hij heeft alleen toegang tot de pagina ‘Gebruikers’
    	Accountmanager.     De accountmanager heeft volledige toegang tot de pagina’s ‘Klanten’ en ‘Facturering’. 
    	                    De accountmanager kan de pagina ‘Rooster’ inzien, maar geen wijzigingen aanbrengen.
    	HR-manager.         De HR-manager heeft volledige toegang tot de pagina’s ‘Medewerkers’ en ‘Loonadministratie’. 
    	                    De HR-manager kan de pagina ‘Rooster’ inzien, maar geen wijzigingen aanbrengen behalve ontgrendelen (PR2020-09-27 added: + vergrendelen)
    	Controleur.         De controleur heeft volledige toegang tot de pagina ‘Rooster’. 
    	                    Kan shifts vergrendelen, niet ontgrendelen
    	Planner.            De planner heeft volledige toegang tot de pagina ‘Planning’, ‘Medewerker’ en 'Klanten en Locaties'  
    	                    De planner kan de pagina ‘Rooster’ inzien en roosters toevoegen of verwijderen, maar geen wijzigingen aanbrengen.
    	                    De planner kan de pagina ‘Mederwker’ en'Klanten en Loccaies 
    	Medewerker.         Een medewerker heeft toegang tot de (nog te maken) pagina ‘Medewerker’. 
            Een medewerker kan zijn eigen rooster inzien en wijzigingen in te tijden aanbrengen, eventueel ook afwezigheid toevoegen of diensten ruilen.

    """

    @property
    def permits_choices(self):
        # PR201806-01 function creates tuple of permits, used in UserAddForm, UserEditForm
        # permit_choices: ((1, 'Read'), (2, 'Write'), (4, 'Authorize'), (8, 'Admin'))

        if self.role is not None:  # PR2018-05-31 debug: self.role = False when value = 0!!! Use is not None instead
            choices = c.PERMIT_CHOICES
        else:
            # get permit 'None'
            choices = [(c.PERMIT_00_NONE, _('None'),),]
        return tuple(choices)


    @property
    def is_active_str(self): # PR108-08-09
        return str(c.IS_ACTIVE_DICT.get(int(self.is_active)))

    #@property
    #def is_active_choices(self): # PR108-06-22
    #    return c.IS_ACTIVE_CHOICES.get(int(self.is_active))

    # PR2018-05-27 property returns True when user has ROLE_02_SYSTEM
    @property
    def is_role_system(self):
        has_role = False
        if self.is_authenticated:
            if self.role is not None: # PR2018-05-31 debug: self.role = False when value = 0!!! Use is not None instead
                if self.role == c.ROLE_02_SYSTEM:
                    has_role = True
        return has_role

    @property
    def is_role_company(self):
        has_role = False
        if self.is_authenticated:
            if self.role is not None: # PR2018-05-31 debug: self.role = False when value = 0!!! Use is not None instead
                if self.role == c.ROLE_01_COMPANY:
                    has_role = True
        return has_role

    @property
    def is_role_employee(self):
        has_role = False
        if self.is_authenticated:
            if self.role is not None: # PR2018-05-31 debug: self.role = False when value = 0!!! Use is not None instead
                if self.role == c.ROLE_00_EMPLOYEE:
                    has_role = True
        return has_role

    @property
    def is_role_company_and_perm_sysadmin(self):
        has_permit = False
        if self.is_authenticated:
            if self.role is not None: # PR2018-05-31 debug: self.role = False when value = 0!!! Use is not None instead
                if self.role == c.ROLE_01_COMPANY:
                    if self.is_perm_sysadmin:
                        has_permit = True
        return has_permit

    @property
    def is_role_system_and_perm_sysadmin(self):
        has_permit = False
        if self.is_authenticated:
            if self.role is not None: # PR2018-05-31 debug: self.role = False when value = 0!!! Use is not None instead
                if self.role == c.ROLE_02_SYSTEM:
                    if self.is_perm_sysadmin:
                        has_permit = True
        return has_permit

    @property
    def is_perm_employee(self):
        has_permit = False
        if self.is_authenticated:
            has_permit = c.PERMIT_02_EMPLOYEE in self.permits_tuple
        return has_permit

    @property
    def is_perm_supervisor(self):
        has_permit = False
        if self.is_authenticated:
            has_permit = c.PERMIT_04_SUPERVISOR in self.permits_tuple
        return has_permit

    @property
    def is_perm_planner(self):
        has_permit = False
        if self.is_authenticated:
            has_permit = c.PERMIT_08_PLANNER in self.permits_tuple
        return has_permit

    @property
    def is_perm_hrman(self):
        has_permit = False
        if self.is_authenticated:
            has_permit = c.PERMIT_16_HRM in self.permits_tuple
        return has_permit

    @property
    def is_perm_accman(self):
        has_permit = False
        if self.is_authenticated:
            has_permit = c.PERMIT_32_ACCMAN in self.permits_tuple
        return has_permit

    @property
    def is_perm_sysadmin(self):
        has_permit = False
        if self.is_authenticated:
            has_permit = c.PERMIT_64_SYSADMIN in self.permits_tuple
        return has_permit

    """
    @property
    def may_add_or_edit_users(self):
        # PR2018-05-30  user may add user if:
        # role system: if perm admin
        # role insp:   if perm_sysadmin and country not None
        # role school: if perm_sysadmin and country not None and schooldefault not None
        _has_permit = False
        if self.is_perm_sysadmin:
            if self.is_role_system:
                _has_permit = True
            elif self.is_role_insp:
                if self.country is not None:
                    _has_permit = True
            elif self.is_role_school:
                if self.country is not None:
                    if self.schoolbase is not None:
                        _has_permit = True
        return _has_permit
    """

# +++++++++++++++++++  FORM PERMITS  +++++++++++++++++++++++

    @property
    def message_user_authenticated(self):
        return _("You must be logged in to view this page.")

    @property
    def permit_user_modify(self):  # PR2019-03-26
        return not bool(auth.get_message(self, 'permit_user_modify'))

    @property
    def message_user_modify(self):  # PR2019-03-26
        return auth.get_message(self, 'permit_user_modify')

# +++++++++++++++++++  END OF FORM PERMITS  +++++++++++++++++++++++

    def get_usersetting(cls, key_str):  # PR2019-07-02 PR2021-01-27
        setting_dict = {}
        row_jsonsetting = None
        try:
            if cls and key_str:
                row = Usersetting.objects.filter(user=cls, key=key_str).order_by('-id').first()
                if row:
                    row_jsonsetting = row.jsonsetting
                    if row_jsonsetting:
                         # no need to use json.loads: Was: setting_dict = json.loads(row.jsonsetting)
                        setting_dict = row_jsonsetting
        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            logger.error('key_str: ', str(key_str))
            logger.error('row_jsonsetting: ', str(row_jsonsetting))
        #logger.debug('setting_dict: ' + str(setting_dict) + ' ' + str(type(setting_dict)))
        return setting_dict

    def set_usersetting(cls, key_str, setting_dict):  # PR2019-07-02 PR2020-07-12 PR2021-01-27
        #logger.debug('---  set_usersetting  ------- ')
        #logger.debug('key_str: ' + str(key_str))
        #logger.debug('setting_dict: ' + str(setting_dict))
        # No need to use json.dumps. Was: new_setting_json = json.dumps(setting_dict)
        try:
            if cls and key_str:
                # don't use get_or_none, gives none when multiple settings exist and will create extra setting.
                row = Usersetting.objects.filter(user=cls, key=key_str).order_by('-id').first()
                if row:
                    #logger.debug('row exists')
                    row.jsonsetting = setting_dict
                elif setting_dict:
                    #logger.debug('row does not exist')
                    row = Usersetting(user=cls, key=key_str, jsonsetting=setting_dict)
                row.save()

        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            logger.error('key_str: ', str(key_str))
            logger.error('setting_dict: ', str(setting_dict))


# PR2018-05-06
class Usersetting(Model):
    objects = CustomUserManager()

    user = ForeignKey(User, related_name='usr_settings', on_delete=CASCADE)
    key = CharField(db_index=True, max_length=c.CODE_MAX_LENGTH)
    # setting = CharField(max_length=2048, null=True, blank=True) PR2020-08-06 removed

    jsonsetting = JSONField(null=True)  # stores invoice dates for this customer
    datetimesetting = DateTimeField(null=True)  #  for last_emplhour_check PR2020-08-06

    @classmethod
    def get_datetimesetting(cls, key_str, user):  # PR2020-08-06 PR2021-01-27
        saved_datetime_setting = None
        try:
            if user and key_str:
                row = cls.objects.filter(user=user, key=key_str).order_by('-id').first()
                if row:
                    if row.datetimesetting:
                        saved_datetime_setting = row.datetimesetting
        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            logger.error('key_str: ', str(key_str))
            logger.error('saved_datetime_setting: ', str(saved_datetime_setting))
        return saved_datetime_setting

    @classmethod
    def set_datetimesetting(cls, key_str, new_datetime, user):   # PR2020-08-06 PR2021-01-27
        try:
            if user and key_str:
                # don't use get_or_none, gives none when multiple settings exist and will create extra setting.
                row = cls.objects.filter(user=user, key=key_str).first()
                if row:
                    row.datetimesetting = new_datetime
                elif new_datetime:
                    #logger.debug('row does not exist')
                    row = cls(user=user, key=key_str, datetimesetting=new_datetime)
                row.save()
        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            logger.error('key_str: ', str(key_str))
            logger.error('new_datetime: ', str(new_datetime))
