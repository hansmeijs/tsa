# PR2020-04-17
from companies import models as m
from tsap import constants as c

import json

import logging
logger = logging.getLogger(__name__)
# PR2019-01-04 from https://stackoverflow.com/questions/19734724/django-is-not-json-serializable-when-using-ugettext-lazy


# ===============================
def get_companysetting(table_dict, user_lang, request):  # PR2020-04-17
    logger.debug(' ---------------- get_companysetting ---------------- ')
    # companysetting: {coldefs: "order"}
    companysetting_dict = {}
    if 'coldefs' in table_dict:
        tblName = table_dict.get('coldefs')
        logger.debug('tblName: ' + str(tblName) + ' ' + str(type(tblName)))
        coldefs_dict = get_stored_coldefs_dict(tblName, user_lang, request)
        if coldefs_dict:
            companysetting_dict['coldefs'] = coldefs_dict

    return companysetting_dict


# ===============================
def get_stored_coldefs_dict(tblName, user_lang, request):
    #logger.debug(' ---------------- get_stored_coldefs_dict ---------------- ')
    # coldef_list = [ {'tsaKey': 'custcode', 'caption': 'Customer - Short name'}, ... ]
    # structure of stored_coldefs: {'tsaKey': 'excKey', ... }
    # stored_coldefs: {'custcode': 'Order', 'orderidentifier': 'Customer', ...}

    has_header = True
    worksheetname = ''
    stored_coldefs = {}
    settings_key = c.KEY_ORDER_COLDEFS if(tblName == 'order') else c.KEY_EMPLOYEE_COLDEFS
    stored_json = m.Companysetting.get_jsonsetting(settings_key, request.user.company)
    if stored_json:
        stored_setting = json.loads(stored_json)
        #logger.debug('stored_setting: ' + str(stored_setting))
        if stored_setting:
            has_header = stored_setting.get('has_header', True)
            worksheetname = stored_setting.get('worksheetname', '')
            if 'coldefs' in stored_setting:
                stored_coldefs = stored_setting['coldefs']
                #logger.debug('stored_coldefs: ' + str(stored_coldefs))

    coldef_list = []
    default_coldef_list = c.COLDEF_ORDER if (tblName == 'order') else c.COLDEF_EMPLOYEE[user_lang]
    for default_coldef_dict in default_coldef_list:
        # default_coldef_dict = {'tsaKey': 'custcode', 'caption': _('Customer - Short name')
        #logger.debug('default_coldef_dict: ' + str(default_coldef_dict))
        default_tsaKey = default_coldef_dict.get('tsaKey')
        default_caption = default_coldef_dict.get('caption')
        dict = {'tsaKey': default_tsaKey, 'caption': default_caption}

# - loop through stored_coldefs, add excKey to corresponding item in coldef_list
        # stored_coldefs: {'orderdatefirst': 'datestart', 'orderdatelast': 'dateend'}
        if stored_coldefs:
            stored_excKey = None
            for stored_tsaKey in stored_coldefs:
                if stored_tsaKey == default_tsaKey:
                    stored_excKey = stored_coldefs.get(stored_tsaKey)
                    break
            if stored_excKey:
                dict['excKey'] = stored_excKey

        coldef_list.append(dict)

        #logger.debug('coldef_list: ' + str(coldef_list))

    coldefs_dict = {
        'worksheetname': worksheetname,
        'has_header': has_header,
        'coldefs': coldef_list
        }
    #logger.debug('coldefs_dict: ' + str(coldefs_dict))
    #logger.debug(' ---------------- end of get_stored_coldefs_dict ---------------- ')
    return coldefs_dict