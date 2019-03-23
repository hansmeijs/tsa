#PR2019-03-02
from django.forms import ModelForm, DateField, TextInput, CharField
from django.utils.translation import ugettext_lazy as _

from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH
from companies.models import Company
from tsap.validators import validate_unique_code

import logging
logger = logging.getLogger(__name__)

# === Company ===================================== # PR1019-03-02
class CompanyAddForm(ModelForm):

    class Meta:
        model = Company
        fields = ('code', 'name', 'locked', 'inactive')
        labels = {'name': _('Name'), 'locked': _('Locked'), 'inactive': _('Inactive')}

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(CompanyAddForm, self).__init__(*args, **kwargs)
        self.this_instance = kwargs.get('instance')
        logger.debug('CompanyAddForm')

        # ======= field 'code' ============
        self.fields['code'] = CharField(
            max_length=CODE_MAX_LENGTH,
            required = True,
            validators=[validate_unique_code('company', self.this_instance)],
            label=_('Code'),
            help_text=_('Code is a short name or code, that is used for display on the screen. Required, 12 characters or fewer.'),
        )
        self.fields['code'].widget.attrs.update({'autofocus': 'autofocus'})

        # ======= field 'name' ============
        # PR2019-03-15 debug: This doesn't work with translations:
        #    help_text=_('Company name is used in reports. Required, %(len)s characters or fewer.') % {'len': NAME_MAX_LENGTH},
        self.fields['name'] = CharField(
            max_length=NAME_MAX_LENGTH,
            required = True,
            validators=[validate_unique_code('company', self.this_instance)],
            label=_('Company name'),
            help_text=_('Company name is used in reports. Required, 50 characters or fewer.'),

            )
        self.fields['code'].widget.attrs.update({'autofocus': 'autofocus'})

        # ======= field 'date_first' ============
        # in EditMode: get country from current record
        # no initial value in AddNew form
        #self.initial_value = get_date_from_dateint(self.this_instance.date_first_int)
        self.fields['date_first_field'] = DateField(
            required=False,
            widget=TextInput(attrs={'type': 'date'}),
            label=_('Start date'),
            help_text=_('Select the departments where this level is available. Press the Ctrl button to select multiple departments.'),
           # initial=self.initial_value
        )


class CompanyEditForm(ModelForm):
    class Meta:
        model = Company
        fields = ('code', 'name', 'date_first_int', 'date_last_int' , 'locked', 'inactive', 'modified_by', 'modified_at')
        labels = {'code': _('Code'),
                  'name': _('Name'),
                  'date_first': _('First date'),
                  'date_last': _('Last date'),
                  'locked': _('Locked'),
                  'inactive': _('Inactive'),
                  }

    def __init__(self, *args, **kwargs):
         super(CompanyEditForm, self).__init__(*args, **kwargs)

