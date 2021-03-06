#PR2019-03-02
from django.forms import ModelForm, DateField, TextInput, ChoiceField, Select
from django.utils.translation import ugettext_lazy as _

from tsap import constants as c
from companies import models as m
#from tsap.validators import validate_unique_code

import logging
logger = logging.getLogger(__name__)

# === Company ===================================== # PR1019-03-02
class CompanyAddForm(ModelForm):

    class Meta:
        model = m.Company
        fields = ('code', 'name', 'datefirst', 'locked', 'inactive')
        # labels = {'name': _('Name'), 'datefirst': _('First date'), 'locked': _('Locked'), 'inactive': _('Inactive')}

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(CompanyAddForm, self).__init__(*args, **kwargs)
        self.this_instance = kwargs.get('instance')
        logger.debug('CompanyAddForm')

        # ======= field 'code' ============
        #self.fields['code'] = CharField(
        #    max_length=c.CODE_MAX_LENGTH,
        #    required = True,
        #    validators=[validate_unique_code('company', self.this_instance)],
        #    label=_('Code'),
        #    help_text=_('Code is a short name or code, that is used for display on the screen. Required, 15 characters or fewer.'),
        #)
        #self.fields['code'].widget.attrs.update({'autofocus': 'autofocus'})

        # ======= field 'name' ============
        # PR2019-03-15 debug: This doesn't work with translations:
        #    help_text=_('Company name is used in reports. Required, %(len)s characters or fewer.') % {'len': c.NAME_MAX_LENGTH},
        #self.fields['name'] = CharField(
        #    max_length=c.NAME_MAX_LENGTH,
        #    required=True,
        #    validators=[validate_unique_code('company', self.this_instance)],
        #    label=_('Company name'),
        #    help_text=_('Company name is used in reports. Required.'),

        #    )
        #self.fields['code'].widget.attrs.update({'autofocus': 'autofocus'})

        # ======= field 'date_first' ============
        # in EditMode: get country from current record
        # no initial value in AddNew form
        self.fields['datefirst'] = DateField(
            required=False,
            widget=TextInput(attrs={'type': 'date'}),
            label=_('Start date'),

        )


class CompanyEditForm(ModelForm):
    class Meta:
        model = m.Company
        fields = ('code', 'name', 'datefirst', 'datelast', 'locked', 'inactive', 'timeformat', 'timezone', 'interval')
        labels = {'code': _('Code'),
                  'name': _('Name'),
                  'datefirst': _('First date'),
                  'datelast': _('Last date'),
                  'locked': _('Locked'),
                  'inactive': _('Inactive'),
                  'timeformat': _('Time format'),
                  'timezone': _('Timezone'),
                  'interval': _('Interval'),
                  }

    def __init__(self, *args, **kwargs):
         super(CompanyEditForm, self).__init__(*args, **kwargs)


# === InvoiceAddForm ===================================== # PR1019-08-05
class InvoiceAddForm(ModelForm):

    class Meta:
        model = m.Companyinvoice
        fields = ('company', 'cat', 'entries', 'entryrate', 'datepayment', 'dateexpired', 'note')
        labels = {'company': _('Company'),
                  'cat': _('Category'),
                  'datepayment': _('Payment date'),
                  'dateexpired': _('Expiration date'),
                  'expired': _('Expired'),
                  'note': _('Note')}


    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(InvoiceAddForm, self).__init__(*args, **kwargs)
        self.this_instance = kwargs.get('instance')

        # ======= field 'company' ============
        self.fields['company'].widget.attrs.update({'autofocus': 'autofocus'})
        self.fields['company'].queryset = m.Company.objects.filter(inactive=False)

        # ======= field 'Cat' ============
        # PR2019-08-05
        self.choices = c.ENTRY_CAT_CHOICES

        self.fields['cat'] = ChoiceField(
            required=True,
            choices=self.choices,
            label=_('Category'),
            initial=c.ENTRIES_CAT_00_CHARGED
        )


        # ======= field 'date_first' ============
        self.fields['datepayment'] = DateField(
            required=False,
            widget=TextInput(attrs={'type': 'date'}),
            label=_('Payment date'),
           # initial=self.initial_value
        )
        self.fields['dateexpired'] = DateField(
            required=False,
            widget=TextInput(attrs={'type': 'date'}),
            label=_('Expiration date'),
           # initial=self.initial_value
        )

