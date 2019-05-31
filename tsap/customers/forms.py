
#PR2019-03-02
from django.forms import ModelForm
from django.utils.translation import ugettext_lazy as _

from companies.models import Customer

# === Customer ===================================== # PR1019-03-02
class CustomerAddForm(ModelForm):

    class Meta:
        model = Customer
        fields = ('code', 'name')
        labels = {'code': _('Code'),
                  'name': _('Name')
                  }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(CustomerAddForm, self).__init__(*args, **kwargs)

"""
class CustomerEditForm(ModelForm):

    class Meta:
        model = Customer
        fields = ('code', 'name', 'datefirst', 'datelast' , 'locked', 'inactive')
        labels = {'code': _('Code'),
                  'name': _('Name'),
                  'datefirst': _('First date'),
                  'datelast': _('Last date'),
                  'locked': _('Locked'),
                  'inactive': _('Inactive'),
                  }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(CustomerEditForm, self).__init__(*args, **kwargs)
"""