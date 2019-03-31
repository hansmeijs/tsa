"""

# PR2019-03-24
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect #, get_object_or_404
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, DeleteView, View, ListView, CreateView, FormView
from tsap.constants import CODE_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_SLICED_MAX_LENGTH, KEY_EMPLOYEE_MAPPED_COLDEFS

from tsap.headerbar import get_headerbar_param
from tsap.validators import validate_employee_code, validate_employee_name,employee_email_exists, check_date_overlap

#from customers.models import OrderEmplHour

import logging
logger = logging.getLogger(__name__)

# === Verify ===================================== PR2019-03-24
@method_decorator([login_required], name='dispatch')
class VerifyListView(View):

    def get(self, request):
        param = {}

        if request.user.company is not None:
            # add emplorderhours to headerbar parameters PR2019-03-02
            # orderemplhours = OrderEmplHour.objects.filter(order__customer__company=request.user.company)

            # set headerbar parameters PR 2018-08-06
           #  param = get_headerbar_param(request, {'orderemplhours': orderemplhours})
            logger.debug('VerifyListView param: ' + str(param))

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'verify.html', param)

"""