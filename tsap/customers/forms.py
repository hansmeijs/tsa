#PR2019-03-02
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.forms import ModelForm, IntegerField, ChoiceField, CharField, MultipleChoiceField, SelectMultiple
from django.utils.translation import ugettext_lazy as _

from customers.models import Customer

# === Customer ===================================== # PR1019-03-02
class CustomerAddForm(ModelForm):

    class Meta:
        model = Customer
        fields = ('code', 'name', 'date_first_int', 'date_last_int')
        labels = {'code': _('Code'),
                  'name': _('Name'),
                  'date_first': _('First date'),
                  'date_last': _('last date'),
                  }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(CustomerAddForm, self).__init__(*args, **kwargs)


class CustomerEditForm(ModelForm):

    class Meta:
        model = Customer
        fields = ('code', 'name', 'date_first_int', 'date_last_int' , 'locked', 'inactive')
        labels = {'code': _('Code'),
                  'name': _('Name'),
                  'date_first': _('First date'),
                  'date_last': _('Last date'),
                  'locked': _('Locked'),
                  'inactive': _('Inactive'),
                  }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(CustomerEditForm, self).__init__(*args, **kwargs)

