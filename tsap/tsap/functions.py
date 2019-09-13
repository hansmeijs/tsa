# PR2018-05-28
from datetime import date, time, datetime, timedelta
from django.utils import formats
from django.utils.translation import ugettext_lazy as _

from tsap.constants import BASE_DATE, MONTHS_ABBREV, WEEKDAYS_ABBREV, LANG_EN, LANG_NL, LANG_DEFAULT
import math
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

# Finally solved some headache:
# convert date object to datetime object
def get_datetime_naive_from_date(date_obj):
    # Finally found the way to convert a date object to a datetime object PR2019-07-28
    # https://stackoverflow.com/questions/1937622/convert-date-to-datetime-in-python/1937636#1937636
    # time.min retrieves the minimum value representable by datetime and then get its time component.

    datetime_naive = datetime.combine(date_obj, time.min)
    # logger.debug('datetime_naive: ' + str(datetime_naive) + ' type: ' + str(type(datetime_naive)))
    # datetime_naive: 2019-07-27 00:00:00 type: <class 'datetime.datetime'>

    return datetime_naive

# <<<<<<<<<< This is the right way, I think <<<<<<<<<<<


# NIU yet
def get_datetimeUTC_from_datetime(datetime_obj):
    # https://stackoverflow.com/questions/5802108/how-to-check-if-a-datetime-object-is-localized-with-pytz
    # datetime.replace makes datetime_obj aware. The good thing: it works both with naive and aware datetime_obj

    datetime_utc = datetime_obj.replace(tzinfo=pytz.utc)
    # logger.debug('datetime_utc: ' + str(datetime_utc) + ' type: ' + str(type(datetime_utc)))
    # datetime_utc: 2019-07-27 00:00:00+00:00 type: <class 'datetime.datetime'>

    return datetime_utc

def get_datetime_utc_from_offset(rosterdate, offset_int, comp_timezone):
    # logger.debug(' +++ get_datetimelocal_from_offset +++')
    # logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
    # logger.debug('offset_int: ' + str(offset_int))

    # !!! this is the correct way !!! PR2019-07-31

    dt_local = None
    if rosterdate and offset_int is not None:

        # a. add local timezone to naive datetime object with offset_int
        dt_local = get_datetimelocal_from_offset(
            rosterdate=rosterdate,
            offset_int=offset_int,
            comp_timezone=comp_timezone)

        # b. convert to utc
            # Note: to store datetime it is not necessary to convert to utc,
            #       datetime is stored in database without timezone, let it stay for readability
        dt__utc = dt_local.astimezone(pytz.UTC)
        # logger.debug('dt__utc: ' + str(dt__utc) + ' ' + str(type(dt__utc)))
        # logger.debug('dt__utc.tzinfo: ' + str(dt__utc.tzinfo) + ' ' + str(type(dt__utc.tzinfo)))

    return dt_local


def get_datetimelocal_from_offset( rosterdate, offset_int, comp_timezone):
    #logger.debug(' +++ get_datetimelocal_from_offset +++')
    # logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
    # logger.debug('offset: ' + str(offset))

    dt_local = None
    if rosterdate and offset_int is not None:

    # !!! this is the correct way !!! PR2019-07-31

    # a. create new naive datetime object with hour and minute offset
        dt = get_datetime_naive_from_offset(rosterdate, offset_int)
        # logger.debug('dt with offset: ' + str(dt) + ' ' + str(type(dt)))
        # logger.debug('dt.tzinfo: ' + str(dt.tzinfo) + ' ' + str(type(dt.tzinfo)))

    # b. add timezone to naive datetime object
        timezone = pytz.timezone(comp_timezone)
        dt_local = timezone.localize(dt)  # dt_local.tzinfo: Europe/Amsterdam <class 'pytz.tzfile.Europe/Amsterdam'>
        # logger.debug('dt_local: ' + str(dt_local) + ' ' + str(type(dt_local)))
        # logger.debug('dt_local.tzinfo: ' + str(dt_local.tzinfo) + ' ' + str(type(dt_local.tzinfo)))

    return dt_local


def get_datetime_naive_from_offset(rosterdate, offset_int):
    # logger.debug(' +++ get_datetime_naive_from_offset +++')
    # logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
    # logger.debug('offset: ' + str(offset))

    # !!! this is the correct way !!! PR2019-07-31

    dt_naive = None
    if rosterdate and offset_int is not None:

    # a. get offset day, hour, minute from offset_int
        day_offset = math.floor(offset_int/1440)  # - 90 (1.5 h)
        remainder = offset_int - day_offset * 1440
        new_hour = math.floor(remainder/60)
        new_minute = remainder - new_hour * 60

    # b. convert rosterdate (date object) to rosterdatetime (datetime object, naive)
        rosterdatetime = get_datetime_naive_from_date(rosterdate)
        # logger.debug('rosterdatetime: ' + str(rosterdatetime) + ' ' + str(type(rosterdatetime)))
        # logger.debug('offset: ' + str(offset_int))

    # c. add day_offset to the naive rosterdate (dont use local midnight, is not correct when DST changes)
        dt = rosterdatetime + timedelta(days=day_offset)
        # logger.debug('rosterdatetime_offset: ' + str(dt) + ' ' + str(type(dt)))

    # d. create new naive datetime object with hour and minute offset
        dt_naive = datetime(dt.year, dt.month, dt.day, new_hour, new_minute, 0)  # dt.tzinfo: None
        # logger.debug('dt_naive with offset: ' + str(dt_naive) + ' ' + str(type(dt_naive)))
        # logger.debug('dt_naive.tzinfo: ' + str(dt_naive.tzinfo) + ' ' + str(type(dt_naive.tzinfo)))

    return dt_naive


def offset_split(offset):
    # PR2019-07-27  offset =  '-1;3;45'
    day_offset = 0
    hours = 0
    minutes = 0
    if offset:
        if ';' in offset:
            try:
                arr = offset.split(';')
                day_offset = int(arr[0])
                hours = int(arr[1])
                minutes = int(arr[2])
            except:
                logger.debug('error offset_split: ' + str(offset))
    return day_offset, hours, minutes


def get_datetimenaive_from_ISOstring(datetime_ISOstring):  # PR2019-07-13
    #  datetime_aware_iso = "2019-03-30T04:00:00-04:00"
    #  split string into array  ["2019", "03", "30", "19", "05", "00"]
    #  regex \d+ - matches one or more numeric digits
    dte_time = None

    # get_datetimearray_from_ISOstring sets arr[i] to 0 if not present
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


def get_datetime_LOCAL_from_ISOstring(datetime_ISOstring, comp_timezone):  # PR2019-07-13
    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7

    # logger.debug('---- get_datetime_LOCAL_from_ISOstring  ------')
    #logger.debug('datetime_ISOstring: ' + str(datetime_ISOstring) + ' ' + str(type(datetime_ISOstring)))
    #  datetime_ISOstring: 2019-07-14 T 22:00:00 +00:00 <class 'str'>

    # convert iso string to dattime naive: datetime_naive: 2019-06-23 18:45:00 <class 'datetime.datetime'>
    datetime_naive = get_datetimenaive_from_ISOstring(datetime_ISOstring)
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
    datetime_naive = get_datetimenaive_from_ISOstring(datetime_ISOstring)
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

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


def get_minutes_from_offset(offset_str):  #PR2019-06-13
    # breakduration: {'value': '0;0;15', 'update': True}
    duration = 0
    if offset_str:
        if ';' in offset_str:
            arr = offset_str.split(';')
            days = int(arr[0])
            hours = int(arr[1])
            minutes = int(arr[2])
            duration = 1440 * days + 60 * hours + minutes
    return duration


# ################### DATE STRING  FUNCTIONS ###################
def get_dateISO_from_string(date_string, format=None):  # PR2019-08-06
    # logger.debug('... get_dateISO_from_string ...')
    # logger.debug('date_string: ' + str(date_string), ' format: ' + str(format))

    # function converts string into given format. Used in employee_import
    if format is None:
        format = 'yyyy-mm-dd'

    new_dat_str = ''
    if date_string:
        # replace / by -
        try:
            date_string = date_string.replace('/', '-')
            if '-' in date_string:
                arr = date_string.split('-')
                if len(arr) >= 2:
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
                    # logger.debug('year_int: ' + str(year_int) + ' month_int: ' + str(month_int) + ' day_int:' + str(day_int))

                    if year_int < 100:
                        currentYear = datetime.now().year
                        remainder = currentYear % 100  # 2019 -> 19
                        year100_int = currentYear // 100  # 2019 -> 20
                        # currentYear = 2019, remainder = 19. When year_int <=29 convert to 2009, else convert to 1997
                        if year_int <= remainder + 10:
                            year_int = year_int + year100_int * 100
                        else:
                            year_int = year_int + (year100_int - 1) * 100

                    year_str = '0000' + str(year_int)
                    year_str = year_str[-4:]
                    month_str = '00' + str(month_int)
                    month_str = month_str[-2:]

                    day_str = '00' + str(day_int)
                    day_str = day_str[-2:]
                    # logger.debug('year_str: ' + str(year_str) + ' month_str: ' + str(month_str) + ' day_str:' + str(day_str))

                    new_dat_str = '-'.join([year_str, month_str, day_str])
        except:
            logger.debug('get_dateISO_from_string error: ' + str(date_string))
            # logger.debug('new_dat_str: ' + str(new_dat_str))
    return new_dat_str

def detect_dateformat(dict, field):
    # logger.debug(' --- detect_dateformat ---')
    # PR2019-08-05  detect date format
    format_str = ''
    try:
        arr00_max = 0
        arr01_max = 0
        arr02_max = 0
        for item in dict:
            arr00 = 0
            arr01 = 0
            arr02 = 0

            date_string = item.get(field)
            if date_string:
                arr = get_datetimearray_from_ISOstring(date_string)

                isok = False
                if len(arr) > 2:

                    if arr[0].isnumeric():
                        arr00 = int(arr[0])
                        if arr[1].isnumeric():
                            arr01 = int(arr[1])
                            if arr[2].isnumeric():
                                arr02 = int(arr[2])
                                isok = True
                if isok:
                    if arr00 > arr00_max:
                        arr00_max = arr00
                    if arr01 > arr01_max:
                        arr01_max = arr01
                    if arr02 > arr02_max:
                        arr02_max = arr02

        year_pos = -1
        day_pos = -1

        if arr00_max > 31 and arr01_max <= 31 and arr02_max <= 31:
            year_pos = 0
            if arr01_max > 12 and arr02_max <= 12:
                day_pos = 1
            elif arr02_max > 12 and arr01_max <= 12:
                day_pos = 2
        elif arr01_max > 31 and arr00_max <= 31 and arr02_max <= 31:
            year_pos = 1
            if arr00_max > 12 and arr02_max <= 12:
                day_pos = 0
            elif arr02_max > 12 and arr00_max <= 12:
                day_pos = 2
        elif arr02_max > 31 and arr00_max <= 31 and arr01_max <= 31:
            year_pos = 2
            if arr00_max > 12 and arr01_max <= 12:
                day_pos = 0
            elif arr01_max > 12 and arr00_max <= 12:
                day_pos = 1

        if day_pos == -1:
            if year_pos == 0:
                day_pos = 2
            elif year_pos == 2:
                day_pos = 0

        if year_pos > -1 and day_pos > -1:
            if year_pos == 0 and day_pos == 2:
                    format_str = 'yyyy-mm-dd'
            if year_pos == 2:
                if day_pos == 0:
                    format_str = 'dd-mm-yyyy'
                if day_pos == 1:
                    format_str = 'mm-dd-yyyy'

        # logger.debug('format_str: ' + str(format_str) + ' max00: ' + str(arr00_max) + ' max01: ' + str(arr01_max) + ' max02: ' + str(arr02_max))

    except:
        logger.debug('detect_dateformat error: ' + str(date_string))

    return format_str

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



# ################### FORMAT FUNCTIONS ###################
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


def period_within_range(outer_datetime_first, outer_datetime_last, inner_datetime_first, inner_datetime_last):
    # check if inner range falls within outer range PR2019-06-05
    # when inner_datetime_last == outer_datetime_first: not within range
    within_range = True
    if inner_datetime_first is None:
        within_range = False
    else:

        if outer_datetime_first:
            if inner_datetime_last <= outer_datetime_first:
                within_range = False

        if outer_datetime_last:
            if inner_datetime_first >= outer_datetime_last:
                within_range = False
    return within_range


def date_within_range(outer_datefirst, outer_datelast, inner_datefirst, inner_datelast=None):
    # check if inner_date_first falls within outer range PR2019-06-05
    # when inner_datelast == outer_datefirst: within_range = True
    within_range = True
    if inner_datefirst is None:
        within_range = False
    else:
        if inner_datelast is None:
            inner_datelast = inner_datefirst

        if outer_datefirst and inner_datelast < outer_datefirst:
            within_range = False

        if outer_datelast and inner_datefirst > outer_datelast:
            within_range = False

    return within_range


def date_earliest_of_two(date_01, date_02):  # PR2019-09-12
    if date_02 is None:
        date_earliest = date_01
    elif date_01 is None:
        date_earliest = date_02
    elif date_02 < date_01:
        date_earliest = date_02
    else:
        date_earliest = date_01
    return date_earliest


def date_latest_of_two(date_01, date_02):  # PR2019-09-12
    if date_02 is None:
        date_latest = date_01
    elif date_01 is None:
        date_latest = date_02
    elif date_02 > date_01:
        date_latest = date_02
    else:
        date_latest = date_01
    return date_latest

# ################### NUMERIC FUNCTIONS ###################
def get_float_from_string(value_str):  # PR2019-09-01

    number = 0
    msg_err = None
    if value_str:
        try:
            # replace comma by dot, remove space and '
            value_str = value_str.replace(',', '.')
            value_str = value_str.replace(' ', '')
            value_str = value_str.replace("'", "")
            number = float(value_str) if value_str != '' else 0
        except:
            msg_err = _('This field must be a number.')

    return number, msg_err



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

    mode, table, temp_pk_str = '', '', ''
    pk_int, ppk_int, cat = 0, 0, 0
    is_create, is_delete = False,  False

    if id_dict:
        mode = id_dict.get('mode', '')
        table = id_dict.get('table', '')
        pk_int = int(id_dict.get('pk', 0))
        ppk_int = int(id_dict.get('ppk', 0))
        cat = int(id_dict.get('cat', 0))
        temp_pk_str = id_dict.get('temp_pk', '')
        is_create = ('create' in id_dict)
        is_delete = ('delete' in id_dict)

    return pk_int, ppk_int, temp_pk_str, is_create, is_delete, table, mode, cat


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


def set_fielddict_date(field_dict, date_value, rosterdate=None, mindate=None, maxdate=None):
    # PR2019-07-18
    if date_value:
        field_dict['value'] = date_value.isoformat()

    # return rosterdate and min max date also when date is empty
    if rosterdate:
        field_dict['rosterdate'] = rosterdate.isoformat()
    if mindate:
        field_dict['mindate'] = mindate.isoformat()
    if maxdate:
        field_dict['maxdate'] = maxdate.isoformat()


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
