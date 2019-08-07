# PR2018-05-28
from datetime import date, time, datetime, timedelta
from django.utils import formats
from django.utils.translation import ugettext_lazy as _

from tsap.constants import BASE_DATE, MONTHS_ABBREV, WEEKDAYS_ABBREV, LANG_EN, LANG_NL, LANG_DEFAULT

import re
import json
import pytz
import logging
logger = logging.getLogger(__name__)

# find better way to convert time in ISO format to datetime object.
# This is not the right way:
    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
    #format = '%Y-%m-%dT%H:%M:%S%z'
    #datestring = '2016-09-20T16:43:45-07:00'
    #d = dateutil.parser.parse(datestring) # python 2.7
    #d = d.replace(tzinfo=utc) - d.utcoffset()
    # >>> datetime.datetime(2016, 9, 20, 23, 43, 45, tzinfo=<UTC>)


# >>>>>> This is the right way, I think >>>>>>>>>>>>>


def get_datetimeUTC_from_datetime(datetime_obj):
    # https://stackoverflow.com/questions/5802108/how-to-check-if-a-datetime-object-is-localized-with-pytz
    # datetime.replace makes datetime_obj aware. The good thing: it works both with naive and aware datetime_obj

    datetime_utc = datetime_obj.replace(tzinfo=pytz.utc)
    # logger.debug('datetime_utc: ' + str(datetime_utc) + ' type: ' + str(type(datetime_utc)))
    # datetime_utc: 2019-07-27 00:00:00+00:00 type: <class 'datetime.datetime'>

    return datetime_utc



def get_datetimeUTC_from_offset(rosterdate, offset, comp_timezone):
    # logger.debug(' +++ get_datetimeUTC_from_offset +++')
    new_datetime_utc = None
    if rosterdate and offset:
        # logger.debug(' +++ get_datetimeUTC_from_offset +++')
        # logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))

        # convert to dattime object
        rosterdatetime = get_datetime_from_date(rosterdate)

        new_datetime_local = get_datetimelocal_from_offset(rosterdate, offset, comp_timezone)

        new_datetime_utc = new_datetime_local.astimezone(pytz.UTC)
        # logger.debug('new_datetime_utc: ' + str(new_datetime_utc) + ' ' + str(type(new_datetime_utc)))

    return new_datetime_utc


def get_datetimelocal_from_offset(rosterdate, offset, comp_timezone):
    logger.debug(' +++ get_datetimelocal_from_offset +++')

    dt_local = None
    if rosterdate and offset:
        # logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
        # logger.debug('offset: ' + str(offset))

    # !!! this is the correct way !!! PR2019-07-31

    # a. get offset day, hour, minute from offset
        day_offset, new_hour, new_minute = offset_split(offset)

    # b. convert rosterdate (date object) to rosterdatetime (datetime object, naive)
        rosterdatetime = get_datetime_from_date(rosterdate)
        logger.debug('rosterdatetime: ' + str(rosterdatetime) + ' ' + str(type(rosterdatetime)))
        logger.debug('offset: ' + str(offset))

    # c. add day_offset to the naive rosterdate (dont use local midnight, is not correct when DST changes)
        dt = rosterdatetime + timedelta(days=day_offset)
        logger.debug('rosterdatetime_offset: ' + str(dt) + ' ' + str(type(dt)))

    # d. create new naive datetime object with hour and minute offset
        dt = datetime(dt.year, dt.month, dt.day, new_hour, new_minute, 0)  # dt.tzinfo: None
        logger.debug('dt with offset: ' + str(dt) + ' ' + str(type(dt)))
        logger.debug('dt.tzinfo: ' + str(dt.tzinfo) + ' ' + str(type(dt.tzinfo)))

    # e. add timezone to naive datetime object
        timezone = pytz.timezone(comp_timezone)
        dt_local = timezone.localize(dt)  # dt_local.tzinfo: Europe/Amsterdam <class 'pytz.tzfile.Europe/Amsterdam'>
        logger.debug('dt_local: ' + str(dt_local) + ' ' + str(type(dt_local)))
        logger.debug('dt_local.tzinfo: ' + str(dt_local.tzinfo) + ' ' + str(type(dt_local.tzinfo)))

    # f. not necessary to convert to utc, datetime is stored in database without timezone, let it stay for readability
        dt__utc = dt_local.astimezone(pytz.UTC)
        logger.debug('dt__utc: ' + str(dt__utc) + ' ' + str(type(dt__utc)))
        logger.debug('dt__utc.tzinfo: ' + str(dt__utc.tzinfo) + ' ' + str(type(dt__utc.tzinfo)))

    return dt_local


def offset_split(offset):
    # PR2019-07-27  offset =  '-1;3;45'
    day_offset = 0
    hours = 0
    minutes = 0
    if offset:
        if ';' in offset:
            arr = offset.split(';')
            day_offset = int(arr[0])
            hours = int(arr[1])
            minutes = int(arr[2])

    return day_offset, hours, minutes


def get_datetime_from_ISOstring(datetime_ISOstring):  # PR2019-07-13
    #  datetime_aware_iso = "2019-03-30T04:00:00-04:00"
    #  split string into array  ["2019", "03", "30", "19", "05", "00"]
    #  regex \d+ - matches one or more numeric digits
    dte_time = None

    arr = get_datetimearray_from_ISOstring(datetime_ISOstring)

    try:
        dte_time = datetime(int(arr[0]), int(arr[1]), int(arr[2]), int(arr[3]), int(arr[4]))
    except:
        pass
    return dte_time


def get_datetimearray_from_ISOstring(datetime_ISOstring):  # PR2019-07-10
    #  datetime_aware_iso = "2019-03-30T04:00:00-04:00"
    #  split string into array  ["2019", "03", "30", "19", "05", "00"]
    #  regex \d+ - matches one or more numeric digits
    # logger.debug('............. get_datetimearray_from_ISOstring: ' + str(datetime_ISOstring))
    # logger.debug('datetime_ISOstring: ' + str(datetime_ISOstring) + ' ' + str(type(datetime_ISOstring)))

    regex = re.compile('\D+')

    # logger.debug(' regex: ' + str(regex))
    arr = regex.split(datetime_ISOstring)
    # logger.debug(' arr: ' + str(arr))
    length = len(arr)

    while length < 5:
        arr.append('0')
        length += 1

    return arr

# Finally solved some headache:
# convert date object to datetime object
def get_datetime_from_date(date_obj):
    # Finally found the way to convert a date object to a datetime object PR2019-07-28
    # https://stackoverflow.com/questions/1937622/convert-date-to-datetime-in-python/1937636#1937636
    # time.min retrieves the minimum value representable by datetime and then get its time component.

    datetime_naive = datetime.combine(date_obj, time.min)
    # logger.debug('datetime_naive: ' + str(datetime_naive) + ' type: ' + str(type(datetime_naive)))
    # datetime_naive: 2019-07-27 00:00:00 type: <class 'datetime.datetime'>

    return datetime_naive

# <<<<<<<<<< This is the right way, I think <<<<<<<<<<<


def get_datetime_LOCAL_from_ISOstring(datetime_ISOstring, comp_timezone):  # PR2019-07-13
    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7

    # logger.debug('---- get_datetime_LOCAL_from_ISOstring  ------')
    #logger.debug('datetime_ISOstring: ' + str(datetime_ISOstring) + ' ' + str(type(datetime_ISOstring)))
    #  datetime_ISOstring: 2019-07-14 T 22:00:00 +00:00 <class 'str'>

    # convert iso string to dattime naive: datetime_naive: 2019-06-23 18:45:00 <class 'datetime.datetime'>
    datetime_naive = get_datetime_from_ISOstring(datetime_ISOstring)
    #logger.debug('datetime_naive: ' + str(datetime_naive) + ' ' + str(type(datetime_naive)))
    #  datetime_naive: 2019-07-14 22:00:00 <class 'datetime.datetime'>
    #  tzinfo: None  <class 'NoneType'>

    # convert datetime_naive to datetime with timezone utc
    timezone = pytz.utc
    datetime_utc = timezone.localize(datetime_naive)
    # logger.debug('datetime_utc: ' + str(datetime_utc) + ' type: ' + str(type(datetime_utc)))
    #  datetime_utc: 2019-07-14 22:00:00 +00:00 <class 'datetime.datetime'>
    #  tzinfo: UTC  <class 'pytz.UTC'>

    # this one is WRONG: does not change timezone, but gives utctime in different timezone
    # timezone = pytz.timezone(comp_timezone)
    # datetime_localWRONG = timezone.localize(datetime_naive)
    # logger.debug('datetime_localWRONG: ' + str(datetime_localWRONG) + ' ' + str(type(datetime_localWRONG)))
    #  datetime_localWRONG: 2019-07-14 22:00:00+02:00 <class 'datetime.datetime'>
    #  tzinfo: UTC  <class 'pytz.UTC'>

    # this one is correct: it converts now_utc to now_local ( = company timezone)
    timezone = pytz.timezone(comp_timezone)
    datetime_local = datetime_utc.astimezone(timezone)
    # logger.debug('datetime_local: ' + str(datetime_local) + ' ' + str(type(datetime_local)))
    # datetime_local: 2019-07-15 00:00:00 +02:00 <class 'datetime.datetime'>

    return datetime_local


def get_datetime_UTC_from_ISOstring(datetime_ISOstring):  # PR2019-07-13
    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7

    # logger.debug('---- get_datetime_UTC_from_ISOstring  ------')
    # logger.debug('datetime_ISOstring: ' + str(datetime_ISOstring) + ' type: ' + str(type(datetime_ISOstring)))
    #  datetime_ISOstring: 2019-06-26 T 07:20:00.000Z  <class 'str'>

    # convert iso string to dattime naive: datetime_naive: 2019-06-23 18:45:00 <class 'datetime.datetime'>
    datetime_naive = get_datetime_from_ISOstring(datetime_ISOstring)
    # logger.debug('datetime_naive: ' + str(datetime_naive) + ' type: ' + str(type(datetime_naive)))
    #  datetime_naive: 2019-06-26 07:20:00  <class 'datetime.datetime'>
    #  tzinfo: None  <class 'NoneType'>

    # convert datetime_naive to datetime with timezone utc
    timezone = pytz.utc
    datetime_utc = timezone.localize(datetime_naive)
    # logger.debug('datetime_utc: ' + str(datetime_utc) + ' type: ' + str(type(datetime_utc)))
    #  datetime_utc: 2019-06-26 07:20:00+00:00  <class 'datetime.datetime'>
    #  tzinfo: UTC  <class 'pytz.UTC'>


    return datetime_utc



# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_date_from_ISOstring(datetime_ISOstring, blank_not_allowed=False, format=None):  # PR2019-04-28
    # logger.debug('............. get_date_from_ISOstring: ' + str(datetime_ISOstring))
    # function retrieves date from string format " yyyy-mm-dd" or  " yyyy/mm/dd"
    if not format:
        format = 'yyyy-mm-dd'
    dte = None
    msg_err = None
    if not datetime_ISOstring:
        if blank_not_allowed:
            msg_err = _("Date cannot be blank.")
    else:
        arr = get_datetimearray_from_ISOstring(datetime_ISOstring)
        try:
            day_int = 0
            month_int = 0
            year_int = 0
            if format == 'dd-mm-yyyy':
                day_int = int(arr[0])
                month_int = int(arr[1])
                year_int = int(arr[2])
            elif format == 'mm-dd-yyyy':
                month_int = int(arr[0])
                day_int = int(arr[1])
                year_int = int(arr[2])
            elif format == 'yyyy-mm-dd':
                year_int = int(arr[0])
                month_int = int(arr[1])
                day_int = int(arr[2])

            dte = date(year_int, month_int, day_int)
        except:
            #msg_err = "'" + datetime_ISOstring + "'" + _("is not a valid date.")
            #msg_err = _("This is not a valid date.")
            msg_err = _("'%(fld)s' is not a valid date.") % {'fld': datetime_ISOstring}
            # logger.debug('msg_err: ' + str(msg_err) + str(type(msg_err)))
            pass
    return dte, msg_err


def get_datetimelocal_from_datetimeUTC(date_timeUTC, comp_timezone):  # PR2019-04-17
    # logger.debug('............. get_datetimelocal_from_datetimeUTC: ' + str(date_timeUTC))
    # Function returns date: "2018-02-25T19:24:23"

    # date_time     :   2019-04-11 11:12:12+00:00
    # strftime("%z"):   +0000
    # TIME_ZONE     :   America/Curacao (gets value in settings)
    # datetime_local:   2019-04-11 07:12:12-04:00
    # date_time_str :   2019-04-11T07:12:12

    datetime_local = None
    if date_timeUTC:
        # logger.debug("date_timeUTC    :" + str(date_timeUTC))
        # logger.debug("comp_timezone    :" + str(comp_timezone))
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is datetime-naive, make it datetime aware with  pytz.timezone

        # Convert time zone
        timezone = pytz.timezone(comp_timezone)
        datetime_local = date_timeUTC.astimezone(timezone)
        # logger.debug('datetime_local: ' + str(datetime_local))

    return datetime_local

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

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>



def get_weekdaylist_for_DHM(rosterdate, lang):
    # create dict with {-1: 'wo'. 0: 'do', 1: 'vr'} PR2019-05-03

    weekdaylist = ''

    # weekday_dict = {}
    if rosterdate:

        # get weekdays translated
        if not lang in WEEKDAYS_ABBREV:
            lang = LANG_DEFAULT

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


def get_minutes_from_DHM(dhm_str):  #PR2019-06-13
    # breakduration: {'value': '0;0;15', 'update': True}
    duration = 0
    if dhm_str:
        if ';' in dhm_str:
            arr = dhm_str.split(';')
            hours = int(arr[1])
            minutes = int(arr[2])
            duration = 60 * hours + minutes
    return duration



def get_datetimeUTC_from_DHM(rosterdate, dhm_str, comp_timezone):
    # logger.debug(' +++ get_datetimeUTC_from_DHM +++')

    # convert to dattime object
    rosterdatetime = get_datetime_from_date(rosterdate)

    # dt_localized: 2019-03-31 04:48:00+02:00
    dt_localized = get_datetimelocal_from_offset(rosterdatetime, dhm_str, comp_timezone)

    utc = pytz.UTC
    dt_as_utc = dt_localized.astimezone(utc)

    # dt_as_utc: 2019-03-31 02:48:00+00:00
    # logger.debug('dt_as_utc: ' + str(dt_as_utc))

    return dt_as_utc



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

# NOT IN USE
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
            lang = LANG_DEFAULT
        if lang == LANG_NL:
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
                lang = LANG_DEFAULT
            weekday_int = int(dte.strftime("%w"))
            weekday_str = WEEKDAYS_ABBREV[lang][weekday_int]

            date_WDM = ' '.join([weekday_str, day_str, month_str])
        except:
            pass

    return date_WDM


def get_date_DM_from_dte(dte, lang):  # PR2019-06-17
    date_DM = ''
    if dte:
        try:
            day_str = str(dte.day)
            month_lang = ''
            if lang in MONTHS_ABBREV:
                month_lang = MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]
            date_DM = ' '.join([ day_str, month_str])
        except:
            pass
    return date_DM



def formatWHM_from_datetime(dte, timezone, lang):
    # returns 'zo 16.30 u' PR2019-06-16

    date_HM = format_HM_from_dtetime(dte, timezone, lang)

    # get weekdays translated
    if not lang in WEEKDAYS_ABBREV:
        lang = LANG_DEFAULT
    weekday_int = int(dte.strftime("%w"))
    weekday_str = WEEKDAYS_ABBREV[lang][weekday_int]

    date_WHM = ' '.join([weekday_str, date_HM])

    return date_WHM


def formatDMYHM_from_datetime(dte, timezone, lang):
    # returns 'zo 16 juni 2019 16.30 u' PR2019-06-14
    date_DMYHM = ''
    date_WDMY =  format_WDMY_from_dte(dte, lang)
    date_HM = format_HM_from_dtetime(dte, timezone, lang)

    date_DMYHM = ' '.join([date_WDMY, date_HM])
    return date_DMYHM


def format_WDMY_from_dte(dte, lang):
    # returns 'zo 16 juni 2019'
    date_WDMY = ''
    if dte:
        try:
            date_DMY = format_DMY_from_dte(dte, lang)

            # get weekdays translated
            if not lang in WEEKDAYS_ABBREV:
                lang = LANG_DEFAULT
            weekday_int = int(dte.strftime("%w"))
            weekday_str = WEEKDAYS_ABBREV[lang][weekday_int]

            date_WDMY = ' '.join([weekday_str, date_DMY])
        except:
            pass
    # logger.debug('... format_WDMY_from_dte: ' + str(date_WDMY) + ' type:: ' + str(type(date_WDMY)) + ' lang: ' + str(lang))
    return date_WDMY


def format_HM_from_dtetime(date_time, comp_timezone, lang):
    # Function returns time : "18.15 u." or "6:15 p.m."
    # 12.00 a.m is midnight, 12.00 p.m. is noon

    time_str = ''
    if date_time:
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is dattime-naive, make it datetime aware with  pytz.timezone

        # Convert time zone
        timezone = pytz.timezone(comp_timezone)
        datetime_aware = date_time.astimezone(timezone)
        # logger.debug('datetime_aware: ' + str(datetime_aware))


        # .strftime("%H") returns zero-padded 24 hour based string '03' or '22'
        hour_str = datetime_aware.strftime("%H")
        hour_int = int(hour_str)
        minutes_str = datetime_aware.strftime("%M") # %m is zero-padded

        if lang == 'nl':
            separator = '.'
            suffix = 'u'
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

        time_str = ' '.join([hourstr, suffix])
    return time_str


def format_DMY_from_dte(dte, lang):  # PR2019-06-09
    # logger.debug('... format_DMY_from_dte: ' + str(dte) + ' type:: ' + str(type(dte)) + ' lang: ' + str(lang))
    # returns '16 juni 2019'
    date_DMY = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''

            if lang in MONTHS_ABBREV:
                month_lang = MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            date_DMY = ' '.join([day_str, month_str, year_str])
        except:
            pass
    # logger.debug('... date_DMY: ' + str(date_DMY) + ' type:: ' + str(type(dte)) + ' lang: ' + str(lang))
    return date_DMY


def get_date_longstr_from_dte(dte, lang):  # PR2019-03-09
    # logger.debug('............. get_date_longstr_from_dte: ' + str(dte) + ' lang: ' + str(lang))
    date_longstr = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''
            if lang in MONTHS_ABBREV:
                month_lang = MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            if lang == LANG_EN:
                time_longstr = dte.strftime("%H:%M %p")
                day_str = day_str + ','
                date_longstr = ' '.join([month_str, day_str, year_str, time_longstr])
            elif lang == LANG_NL:
                time_longstr = dte.strftime("%H.%M") + 'u'
                date_longstr = ' '.join([day_str, month_str, year_str, time_longstr])
        except:
            pass
    # logger.debug('............. date_longstr: ' + str(date_longstr) + ' lang: ' + str(lang))
    return date_longstr


def get_time_longstr_from_dte(dte, lang):  # PR2019-04-13
    # logger.debug('............. get_date_longstr_from_dte: ' + str(dte) + ' lang: ' + str(lang))
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

            if lang == LANG_EN:
                time_longstr = dte.strftime("%H:%M %p")
                day_str  = day_str + ','
                date_longstr = ' '.join([month_str, day_str, year_str, time_longstr])
            elif lang == LANG_NL:
                time_longstr = dte.strftime("%H.%M") + 'u'
                date_longstr = ' '.join([day_str, month_str, year_str, time_longstr])
        except:
            pass
    # logger.debug('............. date_longstr: ' + str(date_longstr) + ' lang: ' + str(lang))
    return date_longstr


def get_dhm_from_datetime_iso(datetime_iso, rosterdate_iso, comp_timezone): # PR2019-07-19
    # fuction convert utc_iso date and rosterdate to local dates, calulates diiference in days, hours and minutes
    dhm = ""
    if datetime_iso and rosterdate_iso:
        datetime_local = get_datetime_LOCAL_from_ISOstring(datetime_iso, comp_timezone)
        rosterdate_local = get_datetime_LOCAL_from_ISOstring(rosterdate_iso, comp_timezone)

        # % is the modulo operator: 26 % 7 return the remainder
        # // is the floor operator:  5 // 2 will return 2
        total_diff = (datetime_local - rosterdate_local).total_seconds() / 60.0
        days_diff = str(total_diff // 1440)
        remaining_diff = total_diff % 1440
        hours_diff = str(remaining_diff // 60)
        minutes_diff = str(remaining_diff % 60)

        dhm = ';'.join([days_diff, hours_diff, minutes_diff])
    return dhm

def get_date_diff_plusone(firstdate, lastdate): # PR2019-06-05
    date_add = 0
    if firstdate and lastdate:
        date_add_timedelta = lastdate - firstdate + timedelta(days=1)
        date_add = date_add_timedelta.days
    return date_add


def get_time_minutes(timestart, timeend, break_minutes):  # PR2019-06-05
    # --- calculate working hours
    new_time_minutes = 0
    if timestart and timeend:
        # duration unit in database is minutes
        datediff = timeend - timestart
        # logger.debug('datediff: ' + str(datediff) + str(type(datediff)))

        datediff_minutes = int((datediff.total_seconds() / 60))
        # logger.debug('datediff_minutes: ' + str(datediff_minutes) + str(type(datediff_minutes)))

        new_time_minutes = int(datediff_minutes - break_minutes)
        # logger.debug('new_time_minutes: ' + str(new_time_minutes) + str(type(new_time_minutes)))

    return new_time_minutes

# ################### DICT FUNCTIONS ###################

def get_depbase_list_field_sorted_zerostripped(depbase_list):  # PR2018-08-23
    # sort depbase_list. List ['16', '15', '0', '18'] becomes ['0', '15', '16', '18'].
    # Sorted list is necessary, otherwise data_has_changed will not work properly (same values in different order gives modified=True)
    # PR2018-08-27 debug. Also remove value '0'
    # function will store depbase_list as: [;15;16;18;] with delimiters at the beginning and end,
    # so it can filter depbase_list__contains =";15;"
    if depbase_list:
        depbase_list_sorted = sorted(depbase_list)
        # logger.debug('get_depbase_list_field_sorted_zerostripped depbase_list_sorted: <' + str(depbase_list_sorted) + '> Type: ' + str(type(depbase_list_sorted)))

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

            # logger.debug('get_depbase_list_field_sorted_zerostripped sorted_depbase_list: <' + str(sorted_depbase_list) + '> Type: ' + str(type(sorted_depbase_list)))
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
        if not field in update_dict:
            update_dict[field] = {}
    return update_dict

def get_iddict_variables(id_dict):
# - get id_dict from upload_dict
    # 'id': {'temp_pk': 'new_26', 'create': True, 'parent_pk': 1, 'table': 'teammembers'}

    table = ''
    temp_pk_str = ''
    pk_int = 0
    ppk_int = 0
    is_create = False
    is_delete = False

    if id_dict:
        table = id_dict.get('table', '')
        pk_int = int(id_dict.get('pk', 0))
        ppk_int = int(id_dict.get('ppk', 0))
        temp_pk_str = id_dict.get('temp_pk', '')
        is_create = ('create' in id_dict)
        is_delete = ('delete' in id_dict)

    return pk_int, ppk_int, temp_pk_str, is_create, is_delete, table


def get_fielddict_variables(upload_dict, field):
# - get dict from upload_dict PR2019-06-12
    # 'rosterdate': {'update': True, 'value': '2019-06-12'}
    value = None
    is_update = False
    # logger.debug('get_fielddict_variables upload_dict: ' + str(upload_dict) + ' field' + str(field))

    # {'id': {'temp_pk': 'new_3', 'create': True, 'parent_pk': 2, 'table': 'schemeitems'},
    # 'shift': {'update': True, 'value': 'nacht'},
    # 'team': {'update': True, 'value': 'A'}}
    # field: rosterdate

    if field:
        if field in upload_dict:
            if upload_dict[field]:
                dict = upload_dict[field]
                if 'value' in dict:
                    value = dict.get('value', '')
                if 'update' in dict:
                    is_update = dict.get('update', False)
    return is_update, value


def fielddict_str(value):
    dict = {}
    if value:
        dict = {'value': value}
    return dict


def fielddict_date(dte, user_lang):
    dict = {}
    if dte:
        dict['value'] = dte
        dict['dm'] = get_date_DM_from_dte(dte, user_lang)
        dict['wdm'] = get_date_WDM_from_dte(dte, user_lang)
        dict['wdmy'] = format_WDMY_from_dte(dte, user_lang)
        dict['dmy'] = format_DMY_from_dte(dte, user_lang)
        dict['offset'] = get_weekdaylist_for_DHM(dte, user_lang)
    return dict


def set_fielddict_date(dict, dte, rosterdate=None, mindate=None, maxdate=None):
    # PR2019-07-18
    if dte:
        dict['value'] = dte.isoformat()

    # return rosterdate and min max date also when date is empty
    if rosterdate:
        dict['rosterdate'] = rosterdate.isoformat()
    if mindate:
        dict['mindate'] = mindate.isoformat()
    if maxdate:
        dict['maxdate'] = maxdate.isoformat()


def fielddict_duration(duration, user_lang):
    dict = {}
    if duration:
        dict = {'value': duration,
                'hm': get_date_HM_from_minutes(duration, user_lang)}
    return dict


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
    # logger.debug('dict: ' + str(dict))
