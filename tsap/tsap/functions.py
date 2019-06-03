# PR2018-05-28
from datetime import date, datetime, timedelta
from django.utils import formats
from django.utils.translation import ugettext_lazy as _

from tsap.constants import BASE_DATE, MONTHS_ABBREV, WEEKDAYS_ABBREV
from tsap.settings import TIME_ZONE, LANGUAGE_CODE
import json
import pytz
import logging
logger = logging.getLogger(__name__)


def get_date_from_str(date_str, blank_not_allowed):  # PR2019-04-28
    #logger.debug('............. get_date_from_str: ' + str(date_str))
    # function retrieves date from string format " yyyy-mm-dd" or  " yyyy/mm/dd"
    dte = None
    msg_txt = None
    if not date_str:
        if blank_not_allowed:
            msg_txt = _("Date cannot be blank.")
    else:
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


def get_date_from_timestr(rosterdate, time_str):  # PR2019-04-07
    logger.debug('............. get_date_from_str: ' + str(rosterdate) + 'time:' + str(time_str))
    date_time = None
    msg_txt = None
    # time_str = "01:00"
    if time_str:
        try:
            time_list = []
            list_ok = False
            if ':' in time_str:
                time_list = time_str.split(':')
                list_ok = True
            elif '.' in time_str:
                time_list = time_str.split('.')
                list_ok = True
            if list_ok and time_list:
                logger.debug('time_list hours: ' + str(time_list[0]) + 'minutes: ' + str(time_list[1]))
                #time format is hh:mm:ss
                if time_list[0].isnumeric():
                    hour_int = int(time_list[0])
                    logger.debug('hour_int: ' + str(hour_int) + str(type(hour_int)))
                    if time_list[1].isnumeric():
                        minute_int = int(time_list[1])
                        logger.debug('minute_int: ' + str(minute_int) + str(type(minute_int)))
                        # datetime(year, month, day, hour, minute, second, microsecond)
                        date_time = datetime(rosterdate.year, rosterdate.month, rosterdate.day,hour_int, minute_int )

                        logger.debug('date_time: ' + str(date_time) + str(type(date_time)))
        except:
            msg_txt = "'" + time_str + "'" + _("is not a valid time.")
            #logger.debug('msg_txt: ' + str(msg_txt) + str(type(msg_txt)))
            pass
    return date_time, msg_txt


def get_date_from_datetimelocal(datetime_str):  # PR2019-04-08
    logger.debug('............. get_date_from_datetimelocal: ')
    logger.debug('datetime_local: ' + str(datetime_str))
    #  date: "2018-02-25T19:24:23"
    datetime_aware = None
    msg_txt = None
    if datetime_str:
        try:
            # split datetime_str in date_list and time_list
            if 'T' in datetime_str:
                datetime_list = datetime_str.split('T')
                # split date
                if '-' in datetime_list[0]:
                    date_list = datetime_list[0].split('-')
                    year = int(date_list[0]) if date_list[0] else 0
                    month = int(date_list[1]) if date_list[1] else 0
                    day = int(date_list[2]) if date_list[2] else 0

                    # split time
                    if ':' in datetime_list[1]:
                        #time format is hh:mm:ss
                        time_list = datetime_list[1].split(':')
                        hour = int(time_list[0]) if time_list[0] else 0
                        minute = int(time_list[1]) if time_list[1] else 0

                        # datetime(year, month, day, hour, minute, second, microsecond)
                        datetime_naive = datetime(year, month, day, hour, minute)
                        #logger.debug('date_time: ' + str(date_time) + str(type(date_time)))

                        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
                        # entered date is dattime-naive, make it datetime aware with  pytz.timezone
                        timezone = pytz.timezone(TIME_ZONE)
                        datetime_aware = timezone.localize(datetime_naive)
                        logger.debug('datetime_aware: ' + str(datetime_aware) + 'timezone: ' + str(timezone))
        except:
            msg_txt = "'" + datetime_str + "'" + _("is not a valid time.")
            #logger.debug('msg_txt: ' + str(msg_txt) + str(type(msg_txt)))
            pass
    return datetime_aware, msg_txt


def get_datetimeaware_from_datetimeUTC(date_timeUTC, time_zone):  # PR2019-04-17
    # logger.debug('............. get_datetimeaware_from_datetimeUTC: ' + str(date_timeUTC))
    # Function returns date: "2018-02-25T19:24:23"

    # date_time     :   2019-04-11 11:12:12+00:00
    # strftime("%z"):   +0000
    # TIME_ZONE     :   America/Curacao
    # datetime_aware:   2019-04-11 07:12:12-04:00
    # date_time_str :   2019-04-11T07:12:12

    datetime_aware = None
    if date_timeUTC:
        # logger.debug("date_timeUTC    :" + str(date_timeUTC))
        # logger.debug("timezone    :" + str(time_zone))
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is datetime-naive, make it datetime aware with  pytz.timezone

        # Convert time zone
        timezone = None
        try:
            timezone = pytz.timezone(time_zone)
        except:
            timezone = pytz.timezone(TIME_ZONE)
        # logger.debug("TIME_ZONE    :" + str(timezone))
        if timezone:
            datetime_aware = date_timeUTC.astimezone(timezone)
        # logger.debug('datetime_aware: ' + str(datetime_aware))

    return datetime_aware


def get_datetimeUTC_from_datetimeaware(datetime_aware):  # PR2019-04-17
    # from https://www.saltycrane.com/blog/2009/05/converting-time-zones-datetime-objects-python/
    # entered date is datetime aware, make it datetime-naive with pytz.timezone

    datetime_obj_utc = None
    if datetime_aware:
        timezone = pytz.timezone('UTC')
        if timezone:
            datetime_obj_utc = datetime_aware.replace(tzinfo=timezone)
    return datetime_obj_utc

def get_datetimelocal_from_datetime(date_time):  # PR2019-04-08
    # logger.debug('............. get_datetimelocal_from_datetime: ' + str(date_time))
    # Function returns date: "2018-02-25T19:24:23"
    # used in model property time_start_datetimelocal snfd time_end_datetimelocal

    # date_time     :   2019-04-11 11:12:12+00:00
    # strftime("%z"):   +0000
    # TIME_ZONE     :   America/Curacao
    # datetime_aware:   2019-04-11 07:12:12-04:00
    # date_time_str :   2019-04-11T07:12:12

    datetime_aware_iso = ''
    if date_time:
        # logger.debug("date_time    :" + str(date_time))
        # logger.debug("timezone    :" + str(date_time.strftime("%z")))
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is datetime-naive, make it datetime aware with  pytz.timezone

        # Convert time zone
        timezone = pytz.timezone(TIME_ZONE)
        # logger.debug("TIME_ZONE    :" + str(timezone))

        datetime_aware = date_time.astimezone(timezone)
        # logger.debug('datetime_aware: ' + str(datetime_aware))

        datetime_aware_iso = datetime_aware.isoformat()

    return datetime_aware_iso

"""
        # get date
        year_str = str(datetime_aware.strftime("%Y"))
        month_str = str(datetime_aware.strftime("%m"))
        day_str = str(datetime_aware.strftime("%d"))
        date_str =  '-'.join([year_str, month_str, day_str])

        hour_str = str(datetime_aware.strftime("%H"))
        minute_str = str(datetime_aware.strftime("%M")) # %m is zero-padded
        second_str = str(datetime_aware.strftime("%S"))
        time_str = ':'.join([hour_str, minute_str, second_str])

        date_time_str = 'T'.join([date_str, time_str])
        logger.debug("date_time_str:" + str(date_time_str))
"""


def get_timeDHM_from_dhm(rosterdate, dhm_str, lang):
    # logger.debug('=== get_timeDHM_from_dhm ')
    # logger.debug('rosterdate: ' + str(rosterdate) + str(type(rosterdate)))
    # logger.debug('dhm_str: ' + str(dhm_str) + str(type(dhm_str)))
    # convert rosterdate and dhm_str into loacl date
    # dt_localized: 2019-03-31 04:48:00+02:00
    dt_localized = get_datetimelocal_from_DHM(rosterdate, dhm_str)
    # logger.debug('dt_localized: ' + str(dt_localized) + str(type(dt_localized)))
    # format to 'zo 31 mrt'
    return get_datetimelocal_DHM(rosterdate, dt_localized, lang)


def get_datetimeUTC_from_DHM(rosterdate, dhm_str):

    # dt_localized: 2019-03-31 04:48:00+02:00
    dt_localized = get_datetimelocal_from_DHM(rosterdate, dhm_str)

    utc = pytz.UTC
    dt_as_utc = dt_localized.astimezone(utc)

    # dt_as_utc: 2019-03-31 02:48:00+00:00
    # logger.debug('dt_as_utc: ' + str(dt_as_utc))

    return dt_as_utc


def get_weekdaylist_for_DHM(rosterdate, lang):
    # create dict with {-1: 'wo'. 0: 'do', 1: 'vr'} PR2019-05-03

    weekdaylist = ''

    # weekday_dict = {}
    if rosterdate:

        # get weekdays translated
        if not lang in WEEKDAYS_ABBREV:
            lang = LANGUAGE_CODE

        datetime = rosterdate + timedelta(days=-1)
        weekday_int = int(datetime.strftime("%w"))
        weekday = WEEKDAYS_ABBREV[lang][weekday_int]
        weekdaylist = '-1:' + weekday + ','
        # weekday_dict[-1] = weekday

        weekday_int = int(rosterdate.strftime("%w"))
        weekday = WEEKDAYS_ABBREV[lang][weekday_int]
        weekdaylist = weekdaylist + '0:' + weekday + ','
        # weekday_dict[0] = weekday

        datetime = rosterdate + timedelta(days=1)
        weekday_int = int(datetime.strftime("%w"))
        weekday = WEEKDAYS_ABBREV[lang][weekday_int]
        weekdaylist = weekdaylist +  '1:' + weekday
        # weekday_dict[1] = weekday

        # weekday_json = json.dumps(weekday_dict)

    return weekdaylist

def get_datetimelocal_from_DHM(rosterdate, dhm_str):
    # logger.debug('=== get_datetimelocal_from_DHM ' + dhm_str + '  ' + str(rosterdate))
    dt_localized = None
    if rosterdate and dhm_str:
        # time_start': {'value': '0;3;45', 'o_value': '2019-04-27T02:36:00+02:00'}}
        if ';' in dhm_str:
            arr = dhm_str.split(';')
            day_offset = int(arr[0])
            new_hour = int(arr[1])
            new_minute = int(arr[2])

            date_no_offset = datetime(rosterdate.year,
                                rosterdate.month,
                                rosterdate.day,
                                new_hour,
                                new_minute)

            # offset date
            dt_naive = date_no_offset + timedelta(days=day_offset)
            # dt_naive: 2019-03-31 04:48:00
            # logger.debug('dt_naive: ' + str(dt_naive))

            # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
            timezone = pytz.timezone(TIME_ZONE)
            # timezone: Europe/Amsterdam<class 'pytz.tzfile.Europe/Amsterdam'>
            # logger.debug('timezone: ' + str(timezone) + str(type(timezone)))

            dt_localized = timezone.localize(dt_naive)
            # dt_localized: 2019-03-31 04:48:00+02:00
            # logger.debug('dt_localized: ' + str(dt_localized))

            # Not in use
            utc = pytz.UTC
            dt_as_utc = dt_localized.astimezone(utc)
            # dt_as_utc: 2019-03-31 02:48:00+00:00
            # logger.debug('dt_as_utc: ' + str(dt_as_utc))

    return dt_localized


def get_datetimelocal_DHM(rosterdate, date_time, lang):
    # Function returns date: "ma 18.15 u." or "Mon 6:15 p.m."
    # skip weekday when date equals rosterdate PR201`9-05-25
    # 12.00 a.m is midnight, 12.00 p.m. is noon

    time_str = ''
    if date_time:
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is dattime-naive, make it datetime aware with  pytz.timezone

        # Convert time zone
        timezone = pytz.timezone(TIME_ZONE)
        datetime_aware = date_time.astimezone(timezone)
        # logger.debug('datetime_aware: ' + str(datetime_aware))
        # check if date equals rosterdate
        dates_are_equal = datetime_aware.date() == rosterdate

        # get weekdays translated
        if not lang in WEEKDAYS_ABBREV:
            lang = LANGUAGE_CODE
        weekday_int = int(datetime_aware.strftime("%w"))
        weekday = WEEKDAYS_ABBREV[lang][weekday_int]
        # .strftime("%H") returns zero-padded 24 hour based string '03' or '22'
        hour_str = datetime_aware.strftime("%H")
        hour_int = int(hour_str)
        minutes_str = datetime_aware.strftime("%M") # %m is zero-padded

        if lang == 'nl':
            separator = '.'
            suffix = 'u.'
        else:  #if lang == 'en':
            separator = ':'
            if hour_int >= 12:
                suffix = 'p.m.'
                if hour_int > 12:
                    hour_int -= 12
                    hour_zero_padded = '00' + str(hour_int)
                    hour_str = hour_zero_padded[-2:]
            else:
                suffix = 'a.m.'
        hourstr = separator.join([hour_str, minutes_str])

        if dates_are_equal:
            time_str = ' '.join([hourstr, suffix])
        else:
            time_str = ' '.join([weekday, hourstr, suffix])
    return time_str

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

def get_time_HHmm(date_time):
    # Function return date 'HH:mm' PR2019-04-07
    date_time_str = ''
    # datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Out: '2016-07-18 18:26:18'

    if date_time:
        # logger.debug("date_time:" + str(date_time))
        # logger.debug("date_time.strftime(%Z)):" + str(date_time.strftime("%Z")))
        # logger.debug("date_time.strftime(%x)):" + str(date_time.strftime("%x")))
        # logger.debug("date_time.strftime(%X)):" + str(date_time.strftime("%X")))

        hour_str = str(date_time.strftime("%H"))
        minute_str = str(date_time.strftime("%M")) # %m is zero-padded
        date_time_str = ':'.join([hour_str, minute_str])
    return date_time_str



def get_date_HM_from_minutes(minutes, lang):  # PR2019-05-07
    # logger.debug('.... get_date_WDM_from_dte: ' + str(dte) + ' type:: ' + str(type(dte)) +' lang: ' + str(lang))
    date_HM = ''
    if minutes:
        hour = int(minutes / 60)
        minute = minutes - hour * 60

        hour_str = str(hour)
        minute_str = '00' + str(minute)
        minute_str = minute_str[-2:]

        # get weekdays translated
        if not lang:
            lang = LANGUAGE_CODE
        if lang == 'nl':
            date_HM = hour_str + '.' + minute_str
        else:
            date_HM = hour_str + ':' + minute_str

    return date_HM


def get_date_WDM_from_dte(dte, lang):  # PR2019-05-01
    # logger.debug('.... get_date_WDM_from_dte: ' + str(dte) + ' type:: ' + str(type(dte)) +' lang: ' + str(lang))
    date_WDM = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''

            if lang in MONTHS_ABBREV:
                month_lang = MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            # get weekdays translated
            if not lang in WEEKDAYS_ABBREV:
                lang = LANGUAGE_CODE
            weekday_int = int(dte.strftime("%w"))
            weekday_str = WEEKDAYS_ABBREV[lang][weekday_int]

            date_WDM = ' '.join([weekday_str, day_str, month_str])
        except:
            pass

    return date_WDM


def get_date_WDMY_from_dte(dte, lang):  # PR2019-05-01
    # logger.debug('... get_date_WDM_from_dte: ' + str(dte) + ' type:: ' + str(type(dte)) + ' lang: ' + str(lang))
    date_WDMY = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''

            if lang in MONTHS_ABBREV:
                month_lang = MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            # get weekdays translated
            if not lang in WEEKDAYS_ABBREV:
                lang = LANGUAGE_CODE
            weekday_int = int(dte.strftime("%w"))
            weekday_str = WEEKDAYS_ABBREV[lang][weekday_int]

            date_WDMY = ' '.join([weekday_str, day_str, month_str, year_str])
        except:
            pass
    return date_WDMY





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
                day_str = day_str + ','
                date_longstr = ' '.join([month_str, day_str, year_str, time_longstr])
            elif lang == 'nl':
                time_longstr = dte.strftime("%H.%M") + 'u.'
                date_longstr = ' '.join([day_str, month_str, year_str, time_longstr])
        except:
            pass
    # logger.debug('............. date_longstr: ' + str(date_longstr) + ' lang: ' + str(lang))
    return date_longstr


def get_time_longstr_from_dte(dte, lang):  # PR2019-04-13
    #logger.debug('............. get_date_longstr_from_dte: ' + str(dte) + ' lang: ' + str(lang))
    date_longstr = ''
    if dte:
        try:

            #weekday_str = str(datetime_aware.strftime("%a"))
            #weekday_int = str(datetime_aware.strftime("%w"))
            #year_str = str(datetime_aware.strftime("%Y"))
            #month_str = str(datetime_aware.strftime("%m"))
            #day_str = str(datetime_aware.strftime("%d"))
            #date_str = '-'.join([year_str, month_str, day_str])

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

def create_dict_with_empty_attr(field_list):
# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    update_dict = {}  # this one is not working: update_dict = dict.fromkeys(field_list, {})
    for field in field_list:
        update_dict[field] = {}
    return update_dict

def remove_empty_attr_from_dict(dict):
# --- function removes empty attributes from dict  PR2019-06-02
    # logger.debug('--- remove_empty_attr_from_dict')
    # logger.debug('dict: ' + str(dict))
# create list of fields in dict
    list = []
    for field in dict:
        list.append(field)
    # logger.debug('list: ' + str(list))
# iterate through list of fields in dict
    # cannot iterate through dict because it changes during iteration
    for field in list:
        if field in dict:
# remove empty attributes from dict
            if not dict[field]:
                del dict[field]
                # logger.debug('deleted: ' + str(field))
    #logger.debug('dict: ' + str(dict))