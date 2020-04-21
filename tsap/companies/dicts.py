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
    logger.debug(' ---------------- get_stored_coldefs_dict ---------------- ')
    # coldef_list = [ {'tsaKey': 'custcode', 'caption': 'Customer - Short name'}, ... ]
    # structure of stored_coldefs: {'tsaKey': 'excKey', ... }
    # stored_coldefs: {'custcode': 'Order', 'orderidentifier': 'Customer', ...}
    coldef_list = c.COLDEF_ORDER[user_lang] if(tblName == 'order') else c.COLDEF_EMPLOYEE[user_lang]
    logger.debug('coldef_list: ' + str(coldef_list))
    has_header = True
    worksheetname = ''
    settings_key = c.KEY_ORDER_COLDEFS if(tblName == 'order') else c.KEY_EMPLOYEE_COLDEFS
    stored_json = m.Companysetting.get_jsonsetting(settings_key, request.user.company)
    if stored_json:
        stored_setting = json.loads(stored_json)
        logger.debug('stored_setting: ' + str(stored_setting))
        if stored_setting:
            has_header = stored_setting.get('has_header', True)
            worksheetname = stored_setting.get('worksheetname', '')
            if 'coldefs' in stored_setting:
                stored_coldefs = stored_setting['coldefs']
                logger.debug('stored_coldefs: ' + str(stored_coldefs))
                # skip if stored_coldefs does not exist
                if stored_coldefs:
                    # stored_coldefs: {'orderdatefirst': 'datestart', 'orderdatelast': 'dateend'}
                    # item in coldef_list:  {'tsaKey': 'custcode', 'caption': 'Customer - Short name'}
                    # loop through stored_coldefs, add excKey to corresponding item in coldef_list
                    # use : for key, value in a_dict.items():
                    for stored_tsaKey, stored_excKey in stored_coldefs.items():
                        if stored_tsaKey and stored_excKey:
                            logger.debug('stored_tsaKey: ' + str(stored_tsaKey) + ' stored_excKey: ' + str(stored_excKey))
                            # lookup tsaKey in coldef_list
                            for dict in coldef_list:
                                if 'tsaKey' in dict:
                                    tsaKey = dict.get('tsaKey')
                                    if tsaKey == stored_tsaKey:
                                        # add Excel name with key 'excKey' to coldef
                                        dict['excKey'] = stored_excKey
                                        break

    logger.debug('coldef_list]: ' + str(coldef_list ))
    coldefs_dict = {
        'worksheetname': worksheetname,
        'has_header': has_header,
        'coldefs': coldef_list
        }
    return coldefs_dict