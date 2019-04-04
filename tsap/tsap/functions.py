# PR2018-05-28
from datetime import date, timedelta
from django.utils import formats
from django.utils.translation import ugettext_lazy as _

from tsap.constants import BASE_DATE, MONTHS_ABBREV

import logging
logger = logging.getLogger(__name__)


def get_date_from_str(date_str):  # PR2019-03-08
    #logger.debug('............. get_date_from_str: ' + str(date_str))
    dte = None
    msg_txt = None
    if date_str:
        try:
            date_list = []
            list_ok = False
            if '-' in date_str:
                date_list = date_str.split('-')
                list_ok = True
            elif '/' in date_str:
                date_list = date_str.split('/')
                list_ok = True
            if list_ok and date_list:
                    #date format is yyyy-mm-dd
                    if date_list[0].isnumeric():
                        year_int = int(date_list[0])
                        #logger.debug('year_int: ' + str(year_int) + str(type(year_int)))
                        if date_list[1].isnumeric():
                            month_int = int(date_list[1])
                            #logger.debug('month_int: ' + str(month_int) + str(type(month_int)))
                            if date_list[2].isnumeric():
                                day_int = int(date_list[2])
                                #logger.debug('day_int: ' + str(day_int) + str(type(day_int)))
                                dte = date(year_int, month_int, day_int)

                    #logger.debug('dte: ' + str(dte) + str(type(dte)))
        except:
            msg_txt = "'" + date_str + "'" + _("is not a valid date.")
            #logger.debug('msg_txt: ' + str(msg_txt) + str(type(msg_txt)))
            pass
    return dte, msg_txt

def get_date_from_dateint(date_int):  # PR2019-03-06
    # Function calculates date from dat_int. Base_date is Dec 31, 1899 (Excel dates use dithis basedate)

    return_date = None
    if date_int:
        # logger.debug('----------- get_date_from_dateint: ')
        # logger.debug('base_date: ' + str(BASE_DATE) + str(type(BASE_DATE)))
        # logger.debug('date_int: ' + str(date_int) + str(type(date_int)))

        return_date = BASE_DATE + timedelta(days=date_int)
        # logger.debug('return_date: ' + str(return_date) + str(type(return_date)))
    return return_date


def get_date_str_from_dateint(date_int):  # PR2019-03-08
    # Function calculates date from dat_int. Base_date is Dec 31, 1899 (Excel dates use this basedate)
    dte_str = ''
    if date_int:
        return_date = BASE_DATE + timedelta(days=date_int)
        year_str = str(return_date.strftime("%Y"))
        month_str = str(return_date.strftime("%m")) # %m is zero-padded
        day_str = str(return_date.strftime("%d"))  # %d is zero-padded
        dte_str = year_str + '-' + month_str[-2:] + '-' + day_str[-2:]
    return dte_str

def get_date_yyyymmdd(dte):
    # Function return date 'yyyy-mm-dd' PR2019-03-27
    dte_str = ''
    if dte:
        year_str = str(dte.strftime("%Y"))
        month_str = str(dte.strftime("%m")) # %m is zero-padded
        day_str = str(dte.strftime("%d"))  # %d is zero-padded
        dte_str = '-'.join([year_str, month_str, day_str])
    return dte_str

def get_date_formatted(date_int):  # PR2019-03-07
    # Function gives formatted date from dat_int.
    logger.debug('............. get_date_formatted: date_int: ' + str(date_int) + str(type(date_int)))
    dte_str = ''
    if date_int:
        dte = get_date_from_dateint(date_int)
        dte_str = formats.date_format(dte, "DATE_FORMAT")
    return dte_str


def get_date_longstr_from_dte(dte, lang):  # PR2019-03-09
    #logger.debug('............. get_date_longstr_from_dte: ' + str(dte) + ' lang: ' + str(lang))
    date_longstr = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''
            if lang in MONTHS_ABBREV:
                month_lang = MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            if lang == 'en':
                time_longstr = dte.strftime("%H:%M %p")
                day_str  = day_str + ','
                date_longstr = ' '.join([month_str, day_str, year_str, time_longstr])
            elif lang == 'nl':
                time_longstr = dte.strftime("%H.%M") + 'u.'
                date_longstr = ' '.join([day_str, month_str, year_str, time_longstr])
        except:
            pass
    # logger.debug('............. date_longstr: ' + str(date_longstr) + ' lang: ' + str(lang))
    return date_longstr


def get_depbase_list_field_sorted_zerostripped(depbase_list):  # PR2018-08-23
    # sort depbase_list. List ['16', '15', '0', '18'] becomes ['0', '15', '16', '18'].
    # Sorted list is necessary, otherwise data_has_changed will not work properly (same values in different order gives modified=True)
    # PR2018-08-27 debug. Also remove value '0'
    # function will store depbase_list as: [;15;16;18;] with delimiters at the beginning and end,
    # so it can filter depbase_list__contains =";15;"
    if depbase_list:
        depbase_list_sorted = sorted(depbase_list)
        #logger.debug('get_depbase_list_field_sorted_zerostripped depbase_list_sorted: <' + str(depbase_list_sorted) + '> Type: ' + str(type(depbase_list_sorted)))

        sorted_depbase_list = ''
        if depbase_list_sorted:
            for dep in depbase_list_sorted:
                # logger.debug('get_depbase_list_field_sorted_zerostripped dep: <' + str(dep) + '> Type: ' + str(type(dep)))
                # skip zero
                if dep != '0':
                    sorted_depbase_list = sorted_depbase_list + ';' + str(dep)
        if sorted_depbase_list:
            # PR2018-08-30 Was: slice off the first character ';'
            # sorted_depbase_list = sorted_depbase_list[1:]
            # PR2018-08-30 add delimiter ';' at the end
            sorted_depbase_list += ';'

            #logger.debug('get_depbase_list_field_sorted_zerostripped sorted_depbase_list: <' + str(sorted_depbase_list) + '> Type: ' + str(type(sorted_depbase_list)))
            return sorted_depbase_list
        else:
            return None
    else:
        return None


def get_tuple_from_list_str(list_str):  # PR2018-08-28
    # get_tuple_from_list_str converts list_str string into tuple,
    # e.g.: list_str='1;2' will be converted to list_tuple=(1,2)
    # empty list = (0,), e.g: 'None'
    depbase_list_str = str(list_str)
    list_tuple = tuple()
    if depbase_list_str:
        try:
            depbase_list_split = depbase_list_str.split(';')
            list_tuple = tuple(depbase_list_split)
        except:
            pass
    # logger.debug('get_tuple_from_list_str tuple list_tuple <' + str(list_tuple) + '> Type: " + str(list_tuple))
    return list_tuple


def id_found_in_list(id_str='', list_str='', value_at_empty_list=False):  # PR2018-11-22
    # Function searches for id in string,
    # e.g.: id '2' will serach ';2;' in ';1;2;3;'
    found = value_at_empty_list
    if list_str:
        found = False
        if id_str:
    # PR2018-11-23 debug: error 'must be str, not int', argument changes form str to int, don't now why. Usse str()
            id_delim = ';' + str(id_str) + ';'
            if id_delim in list_str:
                found = True
    return found


def slice_firstlast_delim(list_str):  # PR2018-11-22
    # slice off first and last delimiter from list_str
    # e.g.: ';1;2;3;' becomes '1;2;3'
    if list_str:
        if list_str[0] == ';':
            list_str = list_str[1:]
        if list_str:
            if list_str[-1] == ';':
                list_str = list_str[:-1]
    return list_str

