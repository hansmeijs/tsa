#PR2019-03-02
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.forms import ModelForm, IntegerField, ChoiceField, CharField, MultipleChoiceField, SelectMultiple
from django.utils.translation import ugettext_lazy as _

from companies.models import Employee

# === Customer ===================================== # PR1019-03-02
class EmployeeAddForm(ModelForm):

    class Meta:
        model = Employee
        fields = ('code', 'namelast', 'datefirst', 'datelast')
        labels = {'code': _('Code'),
                  'namelast': _('Last name'),
                  'datefirst': _('First date'),
                  'datelast': _('last date'),
                  }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(EmployeeAddForm, self).__init__(*args, **kwargs)


class EmployeeEditForm(ModelForm):

    class Meta:
        model = Employee
        fields = ('code', 'namelast', 'datefirst', 'datelast' , 'locked', 'inactive')
        labels = {'code': _('Code'),
                  'name': _('Name'),
                  'datefirst': _('First date'),
                  'datelast': _('Last date'),
                  'locked': _('Locked'),
                  'inactive': _('Inactive'),
                  }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(EmployeeEditForm, self).__init__(*args, **kwargs)

