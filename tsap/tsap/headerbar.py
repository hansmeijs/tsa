# PR2018-05-28
from django.contrib import messages
from django.utils.translation import activate, ugettext_lazy as _
from datetime import date, timedelta, datetime
from django.utils import formats
from tsap.constants import LANG_NL, LANG_DEFAULT
from companies.models import Company

from companies.functions import get_company_list

#from awpr.menus import lookup_button_key_with_viewpermit, save_setting, set_menu_items

import logging
logger = logging.getLogger(__name__)


# PR2019-01-04 from https://stackoverflow.com/questions/19734724/django-is-not-json-serializable-when-using-ugettext-lazy
from django.utils.functional import Promise
from django.utils.encoding import force_text
from django.core.serializers.json import DjangoJSONEncoder

class LazyEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, Promise):
            return force_text(obj)
        return super(LazyEncoder, self).default(obj)

def get_headerbar_param(request, params):
    # PR2018-05-28 set values for headerbar
    # params.get() returns an element from a dictionary, second argument is default when not found
    # this is used for arguments that are passed to headerbar
    # logger.debug('===== get_headerbar_param ===== ')

    # select_company overrides display_company
    display_company = False
    select_company = False

    # PR2019-03-02: select_company is True when user has role system
    select_company = False
    if request.user.is_authenticated:
        select_company = request.user.is_role_system

    # params.pop() removes and returns an element from a dictionary, second argument is default when not found
    # this is used for arguments that are not passed to headerbar

    display_dep = params.get('display_dep', False)

    select_dep = False
    # These are arguments that are added to headerbar in this function
    company = ''
    company_list = ''
    depname = '-'
    dep_list = ''

    menu_items = {}
    sub_items = {}

    if request.user.is_authenticated:
        # PR2018-05-11 set language
        user_lang = request.user.lang if request.user.lang else LANG_DEFAULT
        activate(user_lang)

# ------- display_company --------
        # PR2018-12-17 every logged-in user can select examyear
        #   system and insp can choose from all examyear
        #   school can only choose from examyear from that school

        company_list, rowcount = get_company_list(request.user)

        if rowcount == 0:
            company = _('<No company found>')
        else:
            if request.user.company is None:
                company = _('<Select company>')
            else:
                company = request.user.company




# ------- set menu_items -------- PR2018-12-21

        # get selected menu_key and selected_button_key from request.GET, settings or default, check viewpermit
        # return_dict = lookup_button_key_with_viewpermit(request)
        # setting = return_dict['setting']
        # menu_key = return_dict['menu_key']
        # button_key = return_dict['button_key']


        # menu_items, sub_items = set_menu_items(request, setting, menu_key, button_key)


    else:
        activate(LANG_NL)

    headerbar = {
        'request': request,
        'display_company': display_company, 'select_company': select_company, 'company': company, 'company_list': company_list,
        'display_dep': display_dep, 'select_dep': select_dep, 'departmentname': depname, 'depbase_list': dep_list,
        'menu_items': menu_items, 'sub_items': sub_items,
    }

    # append the rest of the dict 'params' to the dict 'headerbar'.
    # the rest can be for instance: {'form': form},  {'countries': countries}
    headerbar.update(params)
    # logger.debug('get_headerbar_param headerbar: ' + str(headerbar))

    return headerbar


