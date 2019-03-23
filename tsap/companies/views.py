# PR2019-03-02
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from django.utils.translation import activate

from django.core.mail import send_mail
from django.db import connection
from django.db.models.functions import Lower
from django.http import HttpResponse, HttpResponseRedirect, Http404

from django.shortcuts import render, redirect #, get_object_or_404
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, DeleteView, View, ListView, CreateView, FormView

from tsap.functions import get_date_int_from_dte
from tsap.headerbar import get_headerbar_param
from companies.models import Company
from companies.forms import CompanyAddForm, CompanyEditForm

import logging
logger = logging.getLogger(__name__)

def home(request):
    # function get_headerbar_param sets:
    # - activates request.user.language
    # - display/select schoolyear, schoolyear list, color red when not this schoolyear
    # - display/select school, school list
    # - display user dropdown menu
    # note: schoolyear, school and user are only displayed when user.is_authenticated

    # set headerbar parameters PR2018-08-06
    _display_school = False
    _display_dep = False
    if request.user:
        _display_school = True
        _display_dep = True
    _param = get_headerbar_param(request, {
        'display_school': _display_school,
        'display_dep': _display_dep
    })
    # PR2019-02-15 go to login form if user is not authenticated
    if request.user.is_authenticated:    # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'home.html', _param)
    else:
        return redirect('login')

# === Company ===================================== PR2019-03-02
@method_decorator([login_required], name='dispatch')
class CompanyListView(View):

    def get(self, request):
        params = get_headerbar_param(request, {'display_user': True})
        companies = Company.objects.all()
        # add companies to headerbar parameters PR2018-08-12
        params.update({'companies': companies})

        # render(request object, template name, [dictionary optional]) returns an HttpResponse of the template rendered with the given context.
        return render(request, 'company_list.html', params)

@method_decorator([login_required], name='dispatch')
class CompanySelectView(View):

    def get(self, request, pk):
        # logger.debug('ExamyearSelectView get: ' + str(request) + ' pk: ' + str(pk))
        if pk is not None:
            # PR2018-05-18 getting examyear from object not necessary, but let it stay for safety
            try:
                company = Company.objects.get(id=pk)
                request.user.company = company
                request.user.save(self.request)
            finally:
                return redirect('home')
        return redirect('home')


@method_decorator([login_required], name='dispatch')
class CompanyAddView(CreateView):

    def get(self, request, *args, **kwargs):
        # logger.debug('ExamyearAddView get request: ' + str(request))
        # permission:   user.is_authenticated AND user.is_role_insp_or_system
        form = CompanyAddForm(request=request)

        # set headerbar parameters PR 2018-08-06
        param = get_headerbar_param(request, {'form': form})
        # logger.debug('ExamyearAddView def get headerbar_param: ' + str(headerbar_param))

        # render(request, template_name, context=None (A dictionary of values to add to the template context), content_type=None, status=None, using=None)
        return render(request, 'company_add.html', param)

    def post(self, request, *args, **kwargs):
        self.request = request
        # logger.debug('ExamyearAddView post self.request: ' + str(self.request))

        form = CompanyAddForm(self.request.POST, request=self.request)  # this one doesn't work: form = ExamyearAddForm(request=request)

        if form.is_valid():
            # logger.debug('ExamyearAddView post is_valid form.data: ' + str(form.data))

            # save without commit
            self.new_company = form.save(commit=False)


            # ======  save field 'depbase_list_field'  ============
            self.clean_date_first_field = form.cleaned_data.get('date_first_field')  # Type: <class 'list'>
            logger.debug('form.clean_date_first_field: ' + str(self.clean_date_first_field) + ' type: ' +  str(type(self.clean_date_first_field)))
            if self.clean_date_first_field is not None:
                self.date_first_int = get_date_int_from_dte(self.clean_date_first_field)  # PR2019-03-15
                logger.debug('self.date_first_int: ' + str(self.date_first_int))
                if self.date_first_int:
                    self.new_company.date_first_int = self.date_first_int
            # save examyear with commit
            # PR2018-08-04 debug: don't forget argument (request), otherwise gives error 'tuple index out of range' at request = args[0]
            self.new_company.save(request=self.request)

            return redirect('company_list_url')
        else:
            # PR2019-03-15 Debug: langauge gets lost after form.is_valid, get request.user.lang again
            activate(request.user.lang if request.user.lang else 'nl')

            return render(self.request, 'company_add.html', {'form': form})

@method_decorator([login_required], name='dispatch')
class CompanyEditView(UpdateView):
    # PR2018-04-17 debug: Specifying both 'fields' and 'form_class' is not permitted.
    model = Company
    form_class = CompanyEditForm
    template_name = 'company_edit.html'
    pk_url_kwarg = 'pk'
    context_object_name = 'company'

    def form_valid(self, form):
        company = form.save(commit=False)
        # PR2018-08-04 debug: don't forget argument (self.request), otherwise gives error 'tuple index out of range' at request = args[0]
        company.save(request=self.request)
        return redirect('company_list_url')

@method_decorator([login_required], name='dispatch')
class CompanyDeleteView(DeleteView):
    model = Company
    template_name = 'company_delete.html'  # without template_name Django searches for examyear_confirm_delete.html
    success_url = reverse_lazy('company_list_url')

    def delete(self, request, *args, **kwargs):
        self.object = self.get_object()
        if self.request.user:
            self.object.delete(request=self.request)
            return HttpResponseRedirect(self.get_success_url())
        else:
            raise Http404  # or return HttpResponse('404_url')



