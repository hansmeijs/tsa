# PR2018-05-28
# import datetime

from django.db import connection
from datetime import date, time, datetime, timedelta
from django.utils.translation import ugettext_lazy as _

from tsap.settings import TIME_ZONE
from companies import models as m
from tsap import constants as c

import decimal

import math
import re
import json
import pytz
import logging
logger = logging.getLogger(__name__)

# PR2019-11-18 from https://timonweb.com/tutorials/make-djangos-collectstatic-command-forgiving/
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage


class SubManifestStaticFilesStorage(ManifestStaticFilesStorage):
    manifest_strict=False


class ForgivingManifestStaticFilesStorage(ManifestStaticFilesStorage):

    def hashed_name(self, name, content=None, filename=None):
        #logger.debug('hashed_name: ' + str(name))
        try:
            result = super().hashed_name(name, content, filename)
        except ValueError:
            # When the file is missing, let's forgive and ignore that.
            result = name
        #logger.debug('result: ' + str(result))
        return result


# find better way to convert time in ISO format to datetime object.
# This is not the right way:
    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
    #format = '%Y-%m-%dT%H:%M:%S%z'
    #datestring = '2016-09-20T16:43:45-07:00'
    #d = dateutil.parser.parse(datestring) # python 2.7
    #d = d.replace(tzinfo=utc) - d.utcoffset()
    # >>> datetime.datetime(2016, 9, 20, 23, 43, 45, tzinfo=<UTC>)


# >>>>>> This is the right way, I think >>>>>>>>>>>>>
def get_date_from_ISO(date_iso):  # PR2019-09-18 PR2020-03-20
    # this is the simple way, it works though
    #logger.debug('... get_date_from_ISO ...')
    #logger.debug('date_iso: ' + str(date_iso))
    # PR2020-05-04 try is necessary, When creating public holiday schemeitem date_iso = "onph', must return: dte = None
    dte = None
    if date_iso:
        try:
            arr = date_iso.split('-')
            dte = date(int(arr[0]), int(arr[1]), int(arr[2]))
        except:
            pass
    return dte


def get_dateobj_from_dateISOstring(date_ISOstring):  # PR2019-10-25
    dte = None
    if date_ISOstring:
        try:
            arr = get_datetimearray_from_dateISO(date_ISOstring)
            dte = date(int(arr[0]), int(arr[1]), int(arr[2]))
        except:
            logger.error('ERROR: get_dateobj_from_dateISOstring: date_ISOstring: ' +
                         str(date_ISOstring) + ' type: ' + str(type(date_ISOstring)))
    return dte


def get_dateISO_from_dateOBJ(date_obj):  # PR2019-12-22
    # use row.rosterdate.isoformat() instead PR2020-06-25
    date_iso = None
    if date_obj:
        try:
            year_str = str(date_obj.year)
            month_str = ('0' + str(date_obj.month))[-2:]
            date_str = ('0' + str(date_obj.day))[-2:]
            date_iso = '-'.join([year_str, month_str, date_str])
            # today_iso: 2019-11-17 <class 'str'>
        except:
            logger.error('ERROR: get_dateISO_from_dateOBJ: date_obj' +
                         str(date_obj) + ' ' + str(type(date_obj)))
    return date_iso


def get_datetime_naive_from_ISOstring(date_ISOstring):  # PR2019-10-25
    datetime_naive = None
    if date_ISOstring:
        try:
            date_obj = get_dateobj_from_dateISOstring(date_ISOstring)
            if date_obj:
                datetime_naive = get_datetime_naive_from_dateobject(date_obj)
        except:
            logger.error('ERROR: get_datetime_naive_from_ISOstring: date_ISOstring' +
                         str(date_ISOstring) + ' ' + str(type(date_ISOstring)))
    return datetime_naive


# Finally solved some headache:
# convert date object to datetime object
def get_datetime_naive_from_dateobject(date_obj):
    # Finally found the way to convert a date object to a datetime object PR2019-07-28
    # https://stackoverflow.com/questions/1937622/convert-date-to-datetime-in-python/1937636#1937636
    # time.min retrieves the minimum value representable by datetime and then get its time component.
    datetime_naive = None
    if date_obj:
        try:
            datetime_naive = datetime.combine(date_obj, time.min)
            #logger.debug('datetime_naive: ' + str(datetime_naive) + ' type: ' + str(type(datetime_naive)))
            # datetime_naive: 2019-07-27 00:00:00 type: <class 'datetime.datetime'>
        except:
            logger.error('ERROR: get_datetime_naive_from_dateobject: date_ISOstring' +
                         str(date_obj) + ' ' + str(type(date_obj)))
    return datetime_naive


def get_datetime_naive_from_offset(rosterdate, offset_int):
    #logger.debug(' +++ get_datetime_naive_from_offset +++')
    #logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
    # rosterdate: 2019-03-31 <class 'datetime.date'>
    #logger.debug('offset: ' + str(offset_int))
    # offset: -720

    # !!! this is the correct way !!! tested and ok PR2019-09-17

    # Note: offset must be calculated from 'stripped' datetime_local, ie: local datetime without timezone,
    # otherwise timedelta wil still be calculated based on utc time instead of local time
    # and will give wrong timedelta when DST changes

    datetime_naive = None
    if rosterdate and offset_int is not None:
        try:
            # a. convert rosterdate (date object) to rosterdatetime (datetime object, naive)
                rosterdatetime_naive = get_datetime_naive_from_dateobject(rosterdate)
                # .debug('rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))
                # rosterdatetime_naive: 2019-03-31 00:00:00 <class 'datetime.datetime'>

            # b. split offset in days and minutes ( timedelta with minutes > 60 not working: split in days and seconds)
                offset_days = math.floor(offset_int/1440)  # - 90 (1.5 h before midnight: offset_days = -1)
                remainder_seconds = (offset_int - offset_days * 1440) * 60 # remainder_seconds: (-90 - (-1)*1440 = 1350 * 60 = 8100)
                # new_hour = math.floor(remainder/60)
                # new_minute = remainder - new_hour * 60
                #logger.debug('offset_days: ' + str(offset_days) + ' ' + str(type(offset_days)))
                # offset_days: -1 <class 'int'>
                #logger.debug('remainder_seconds: ' + str(remainder_seconds) + ' ' + str(type(remainder_seconds)))
                # remainder_seconds: 43200 <class 'int'>

            # c. add offset_days and  remainder_seconds to the naive rosterdate (dont use local midnight, is not correct when DST changes)
                datetime_naive = rosterdatetime_naive + timedelta(days=offset_days, seconds=remainder_seconds)
                #logger.debug('datetime_naive: ' + str(datetime_naive) + ' ' + str(type(datetime_naive)))
                # datetime_naive: 2019-03-30 12:00:00 <class 'datetime.datetime'>
        except:
            logger.error('ERROR: get_datetime_naive_from_offset:' +
                            ' rosterdate' + str(rosterdate) + ' ' + str(type(rosterdate)) +
                            ' offset_int' + str(offset_int) + ' ' + str(type(offset_int)))

    return datetime_naive

############################

def get_datediff_days_from_dateOBJ(date01_dte, date02_dte):  # PR2020-06-19
    datediff_days = 0
    if date01_dte and date02_dte:
        date01_naive = get_datetime_naive_from_dateobject(date01_dte)
        date02_naive = get_datetime_naive_from_dateobject(date02_dte)
        datediff = date02_naive - date01_naive  # datediff is class 'datetime.timedelta'
        datediff_days = datediff.days  # <class 'int'>
    return datediff_days
############################

def get_date_from_arr(arr_int):  # PR2019-11-17
    date_obj = None
    if arr_int:
        date_obj = date(arr_int[0], arr_int[1], arr_int[2])
    return date_obj


def get_datetime_from_arr(arr_int):  # PR2019-11-17
    datetime_obj = None
    if arr_int:
        datetime_obj = datetime(arr_int[0], arr_int[1], arr_int[2], arr_int[3], arr_int[4], 0)
    return datetime_obj


def get_datetimelocal_from_offset(rosterdate, offset_int, comp_timezone):
    #logger.debug(' +++ get_datetimelocal_from_offset +++')
    #logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
        # rosterdate: 2019-11-21 <class 'datetime.date'>
    #logger.debug('offset_int: ' + str(offset_int))
        # offset_int: 2160

    dt_local = None
    if rosterdate and offset_int is not None:

    # !!! this is the correct way !!! tested and ok PR2019-09-17

# a. create new naive datetime object with hour and minute offset
        dt = get_datetime_naive_from_offset(rosterdate, offset_int)
        #logger.debug('dt with offset: ' + str(dt) + ' ' + str(type(dt)))
            # dt with offset: 2019-11-22 12:00:00 <class 'datetime.datetime'>
        #logger.debug('dt.tzinfo: ' + str(dt.tzinfo) + ' ' + str(type(dt.tzinfo)))
            # datetime_naive has no tzinfo
            # dt.tzinfo: None <class 'NoneType'>

# b. add timezone to naive datetime object
        timezone = pytz.timezone(comp_timezone)
        dt_local = timezone.localize(dt)  # dt_local.tzinfo: Europe/Amsterdam <class 'pytz.tzfile.Europe/Amsterdam'>
        #logger.debug('dt_local: ' + str(dt_local) + ' ' + str(type(dt_local)))
            # dt_local: 2019-11-22 12:00:00+01:00 <class 'datetime.datetime'>
        #logger.debug('dt_local.tzinfo: ' + str(dt_local.tzinfo) + ' ' + str(type(dt_local.tzinfo)))
            # dt_local.tzinfo: Europe/Amsterdam <class
    return dt_local


def get_offset_from_datetimelocal(rosterdate, dt_local):  # PR2019-09-17
    #logger.debug(' +++ get_offset_from_datetimelocal +++')

    # !!! this is the correct way !!! tested and ok PR2019-09-17

    # NOTE: offset must be calculated from 'stripped' datetime_local, ie: local datetime without timezone,
    # otherwise timedelta wil still be calculated based on utc time instead of local time
    # and will give wrong timedelta when DST changes

    #logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
    # rosterdate: 2019-03-31 <class 'datetime.date'>
    #logger.debug('dt_local: ' + str(dt_local) + ' ' + str(type(dt_local)))
    # dt_local: 2019-04-02 16:30:00+02:00 <class 'datetime.datetime'>

    offset_int = None
    if rosterdate and dt_local:

    # a. convert rosterdate (date object) to rosterdatetime (datetime object, naive)
        rosterdatetime_naive = get_datetime_naive_from_dateobject(rosterdate)
        #logger.debug('rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))
        # rosterdatetime_naive: 2019-04-02 00:00:00 <class 'datetime.datetime'>

    # b. convert dt_local (datetime object) to dt_naive (datetime object, naive)
        dt_naive = dt_local.replace(tzinfo=None)
        #logger.debug('dt_naive: ' + str(dt_naive) + ' ' + str(type(dt_naive)))
        # dt_naive: 2019-04-02 16:30:00 <class 'datetime.datetime'>

    # c. get time difference between dt_naive and add rosterdatetime_naive
        # from https://stackoverflow.com/questions/2119472/convert-a-timedelta-to-days-hours-and-minutes
        timedelta_diff = dt_naive - rosterdatetime_naive
        offset_int = timedelta_diff.days * 1440 + timedelta_diff.seconds // 60

        #logger.debug('timedelta_diff: ' + str(timedelta_diff) + ' ' + str(type(timedelta_diff)))
        # timedelta_diff: 1 day, 12:00:00 <class 'datetime.timedelta'>
        #logger.debug('offset_int: ' + str(offset_int) + ' ' + str(type(offset_int)))
        # offset_int: 990 <class 'int'>

    return offset_int


def get_today_usertimezone(period_dict):
    # get 'now' and 'today
    # get now from period_dict
    # used in calc_periodstart_datetimelocal_periodend_datetimelocal PR2020-09-23
    now_arr = period_dict.get('now')
    # if 'now' is not in period_dict: create 'now' (should not be possible)
    if now_arr is None:
        now = datetime.now()
        now_arr = [now.year, now.month, now.day, now.hour, now.minute]
    # get now_usercomp_dtm from now_arr
    # now is the time of the computer of the current user. May be different from company local

    #logger.debug(' now_arr: ' + str(now_arr))
    today_dte = get_date_from_arr(now_arr)
    #logger.debug(' today_dte: ' + str(today_dte) + ' type: ' + str(type(today_dte)))
    now_usercomp_dtm = get_datetime_from_arr(now_arr)
    # now: 2019-11-17 07:41:00 <class 'datetime.datetime'>
    return today_dte, now_usercomp_dtm


def get_today_iso():
    # function gets today in '2019-12-05' format
    now = datetime.now()
    now_arr = [now.year, now.month, now.day, now.hour, now.minute]

    # now is the time of the computer of the current user. May be different from company local
    year_str = str(now_arr[0])
    month_str = str(now_arr[1])
    date_str = str(now_arr[2])
    today_iso = '-'.join([year_str, month_str, date_str])
    # today_iso: 2019-11-17 <class 'str'>
    return today_iso


def get_today_dateobj():
    # function gets today in '2019-12-05' format
    now = datetime.now()
    now_arr = [now.year, now.month, now.day, now.hour, now.minute]
    # today_iso: 2019-11-17 <class 'str'>
    today_dte = get_date_from_arr(now_arr)

    # today_dte: 2019-11-17 <class 'datetime.date'>
    # NIU now_usercomp_dtm = get_datetime_from_arr(now_arr)
    # now: 2019-11-17 07:41:00 <class 'datetime.datetime'>

    return today_dte


# <<<<<<<<<< SO FAR checked and approved PR2019-09-17 <<<<<<<<<<<<<<<<<<<
# ########################################################################<

def get_Exceldate_from_datetime(date_obj):
    #logger.debug(' --- get_Exceldate_from_datetime --- ')
    #logger.debug('date_obj: ' + str(date_obj) + ' type: ' + str(type(date_obj)))
    # date_obj: 2020-05-06 type: <class 'datetime.date'>
    # PR2020-01-23 function convert date_object to number, representing Excel date.
    datetime_naive = get_datetime_naive_from_dateobject(date_obj)
    excel_date = None
    if datetime_naive:
        # from: https://www.myonlinetraininghub.com/excel-date-and-time
        # Caution! Excel dates after 28th February 1900 are actually one day out.
        #          Excel behaves as though the date 29th February 1900 existed, which it didn't.
        # Therefore 'zero' date = 31-12-1899, minus 1 day correction
        excel_zero_date_naive = get_datetime_naive_from_ISOstring('1899-12-30')
        timedelta_diff = datetime_naive - excel_zero_date_naive
        excel_date = timedelta_diff.days
    return excel_date


def get_Exceldatetime_from_datetime(dt_local):
    #logger.debug(' -=========================-- get_Exceldatetime_from_datetime --- ')
    # PR2020-01-23 function convert local dattime to number, representing Excel datetime
    #logger.debug('dt_local: ' + str(dt_local) + ' type: ' + str(type(dt_local)))

    excel_datetime = None
    if dt_local:
        # from: https://www.myonlinetraininghub.com/excel-date-and-time
        # Caution! Excel dates after 28th February 1900 are actually one day out.
        #          Excel behaves as though the date 29th February 1900 existed, which it didn't.
        # Therefore 'zero' date = 31-12-1899, minus 1 day correction
        # '1999-12-31' has excel date 36525
        excelzero = 36525
        excelzero_date_naive = get_datetime_naive_from_ISOstring('1999-12-31')
        excel_zerodate_utc = get_datetimeUTC_from_datetime(excelzero_date_naive)
        dt_local_utc_offset = dt_local.utcoffset()

        timedelta_diff = dt_local - excel_zerodate_utc + dt_local_utc_offset
        days_diff = timedelta_diff.days
        minutes_diff = timedelta_diff.seconds // 60

        excel_datetime = excelzero + days_diff + minutes_diff / 1440

    return excel_datetime


def get_datetimeUTC_from_datetime(datetime_obj):
    # https://stackoverflow.com/questions/5802108/how-to-check-if-a-datetime-object-is-localized-with-pytz
    # datetime.replace makes datetime_obj aware. The good thing: it works both with naive and aware datetime_obj

    datetime_utc = datetime_obj.replace(tzinfo=pytz.utc)
    #logger.debug('datetime_utc: ' + str(datetime_utc) + ' type: ' + str(type(datetime_utc)))
    # datetime_utc: 2019-07-27 00:00:00+00:00 type: <class 'datetime.datetime'>

    return datetime_utc


def get_datetime_utc_from_offset(rosterdate, offset_int, comp_timezone):
    #logger.debug(' +++ get_datetimelocal_from_offset +++')
    #logger.debug('rosterdate: ' + str(rosterdate) + ' ' + str(type(rosterdate)))
    #logger.debug('offset_int: ' + str(offset_int))

    # !!! this is the correct way !!! PR2019-07-31

    dt_local = None
    if rosterdate and offset_int is not None:

        # a. add local timezone to naive datetime object with offset_int

        #logger.debug('# a. add local timezone to naive datetime object with offset_int ')
        dt_local = get_datetimelocal_from_offset(
            rosterdate=rosterdate,
            offset_int=offset_int,
            comp_timezone=comp_timezone)

        # b. convert to utc
            # Note: to store datetime it is not necessary to convert to utc,
            #       datetime is stored in database without timezone, let it stay for readability
        dt__utc = dt_local.astimezone(pytz.UTC)
        #logger.debug('dt__utc: ' + str(dt__utc) + ' ' + str(type(dt__utc)))
        #logger.debug('dt__utc.tzinfo: ' + str(dt__utc.tzinfo) + ' ' + str(type(dt__utc.tzinfo)))

    return dt_local


def get_datetimenaive_from_ISOstring(datetime_ISOstring):  # PR2019-07-13
    #  datetime_aware_iso = "2019-03-30T04:00:00-04:00"
    #  split string into array  ["2019", "03", "30", "19", "05", "00"]
    #  regex \d+ - matches one or more numeric digits
    dte_time = None

    # get_datetimearray_from_dateISO sets arr[i] to 0 if not present
    arr = get_datetimearray_from_dateISO(datetime_ISOstring)

    try:
        dte_time = datetime(int(arr[0]), int(arr[1]), int(arr[2]), int(arr[3]), int(arr[4]))
    except:
        pass
    return dte_time


def get_datetimearray_from_dateISO(datetime_ISOstring):  # PR2019-07-10
    #  datetime_aware_iso = "2019-03-30T04:00:00-04:00"
    #  split string into array  ["2019", "03", "30", "19", "05", "00"]
    #  regex \d+ - matches one or more numeric digits
    #logger.debug('............. get_datetimearray_from_dateISO: ' + str(datetime_ISOstring))
    #logger.debug('datetime_ISOstring: ' + str(datetime_ISOstring) + ' ' + str(type(datetime_ISOstring)))

    regex = re.compile('\D+')

    #logger.debug(' regex: ' + str(regex) + ' ' + str(type(regex)))
    arr = regex.split(datetime_ISOstring)
    length = len(arr)

    while length < 5:
        arr.append('0')
        length += 1

    #logger.debug(' arr: ' + str(arr))
    return arr


def get_datetime_LOCAL_from_ISOstring(datetime_ISOstring, comp_timezone):  # PR2019-07-13
    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7

    #logger.debug('---- get_datetime_LOCAL_from_ISOstring  ------')
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
    #logger.debug('datetime_utc: ' + str(datetime_utc) + ' type: ' + str(type(datetime_utc)))
    #  datetime_utc: 2019-07-14 22:00:00 +00:00 <class 'datetime.datetime'>
    #  tzinfo: UTC  <class 'pytz.UTC'>

    # this one is WRONG: does not change timezone, but gives utctime in different timezone
    # timezone = pytz.timezone(comp_timezone)
    # datetime_localWRONG = timezone.localize(datetime_naive)
    #logger.debug('datetime_localWRONG: ' + str(datetime_localWRONG) + ' ' + str(type(datetime_localWRONG)))
    #  datetime_localWRONG: 2019-07-14 22:00:00+02:00 <class 'datetime.datetime'>
    #  tzinfo: UTC  <class 'pytz.UTC'>

    # this one is correct: it converts now_utc to now_local ( = company timezone)
    timezone = pytz.timezone(comp_timezone)
    datetime_local = datetime_utc.astimezone(timezone)
    #logger.debug('datetime_local: ' + str(datetime_local) + ' ' + str(type(datetime_local)))
    # datetime_local: 2019-07-15 00:00:00 +02:00 <class 'datetime.datetime'>

    return datetime_local


def get_datetime_UTC_from_ISOstring(datetime_ISOstring):  # PR2019-07-13
    # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7

    #logger.debug('---- get_datetime_UTC_from_ISOstring  ------')
    #logger.debug('datetime_ISOstring: ' + str(datetime_ISOstring) + ' type: ' + str(type(datetime_ISOstring)))
    #  datetime_ISOstring: 2019-06-26 T 07:20:00.000Z  <class 'str'>

    # convert iso string to dattime naive: datetime_naive: 2019-06-23 18:45:00 <class 'datetime.datetime'>
    datetime_naive = get_datetimenaive_from_ISOstring(datetime_ISOstring)
    #logger.debug('datetime_naive: ' + str(datetime_naive) + ' type: ' + str(type(datetime_naive)))
    #  datetime_naive: 2019-06-26 07:20:00  <class 'datetime.datetime'>
    #  tzinfo: None  <class 'NoneType'>

    # convert datetime_naive to datetime with timezone utc
    timezone = pytz.utc
    datetime_utc = timezone.localize(datetime_naive)
    #logger.debug('datetime_utc: ' + str(datetime_utc) + ' type: ' + str(type(datetime_utc)))
    #  datetime_utc: 2019-06-26 07:20:00+00:00  <class 'datetime.datetime'>
    #  tzinfo: UTC  <class 'pytz.UTC'>

    return datetime_utc


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def get_date_from_ISOstring(datetime_ISOstring, blank_not_allowed=False, format=None):  # PR2019-04-28
    #logger.debug('............. get_date_from_ISOstring: ' + str(datetime_ISOstring))
    # function retrieves date from string format " yyyy-mm-dd" or  " yyyy/mm/dd"
    if not format:
        format = 'yyyy-mm-dd'
    dte = None
    msg_err = None
    if not datetime_ISOstring:
        if blank_not_allowed:
            msg_err = _("Date cannot be blank.")
    else:
        arr = get_datetimearray_from_dateISO(datetime_ISOstring)
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
            #logger.debug('msg_err: ' + str(msg_err) + str(type(msg_err)))
            pass
    return dte, msg_err

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

def get_datetimelocal_from_datetimeUTC(date_timeUTC, comp_timezone):  # PR2019-04-17
    #logger.debug('............. get_datetimelocal_from_datetimeUTC: ' + str(date_timeUTC))
    # Function returns date: "2018-02-25T19:24:23"

    # date_time     :   2019-04-11 11:12:12+00:00
    # strftime("%z"):   +0000
    # TIME_ZONE     :   America/Curacao (gets value in settings)
    # datetime_local:   2019-04-11 07:12:12-04:00
    # date_time_str :   2019-04-11T07:12:12

    datetime_local = None
    if date_timeUTC:
        #logger.debug("date_timeUTC    :" + str(date_timeUTC))
        #logger.debug("comp_timezone    :" + str(comp_timezone))
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is datetime-naive, make it datetime aware with  pytz.timezone

        # Convert time zone
        timezone = pytz.timezone(comp_timezone)
        datetime_local = date_timeUTC.astimezone(timezone)
        #logger.debug('datetime_local: ' + str(datetime_local))

    return datetime_local


def get_today_local_iso(request):  # PR2019-07-14
    #logger.debug(' ============= get_today_local_iso ============= ')
     # period: {datetimestart: "2019-07-09T00:00:00+02:00", range: "0;0;1;0", interval: 6, offset: 0, auto: true}
    #PR2019-11-15 used in roster form selectperiod,
    today_local_iso = None
    period_dict = {}
    if request.user is not None and request.user.company is not None:

# get comp_timezone
        comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE

# get now without timezone
        now_utc_naive = datetime.utcnow()
        # now_utc_naive: 2019-07-10 14:48:15.742546 <class 'datetime.datetime'>

# convert now to timezone utc
        now_utc = now_utc_naive.replace(tzinfo=pytz.utc)
        # now_utc: 2019-07-10 14:48:15.742546+00:00 <class 'datetime.datetime'>

# convert now_utc to now_local ( = company timezone)
        # from https://medium.com/@eleroy/10-things-you-need-to-know-about-date-and-time-in-python-with-datetime-pytz-dateutil-timedelta-309bfbafb3f7
        timezone = pytz.timezone(comp_timezone)
        now_local = now_utc.astimezone(timezone)
        # now_local: 2019-07-10 16:48:15.742546 +02:00 <class 'datetime.datetime'>

        today_local = date.today()
        tomorrow_local = today_local + timedelta(days=1)
        yesterday_local = today_local + timedelta(days=-1)
        thisweek_monday = today_local + timedelta(days= (1 - today_local.isoweekday()))
        thisweek_sunday = today_local + timedelta(days= (7 - today_local.isoweekday()))
        firstof_month = today_local + timedelta(days= (1 - today_local.day))

    # get first of next month, then subtract one day
        year = firstof_month.year
        nextmonth = firstof_month.month + 1
        if nextmonth > 12:
            nextmonth -= 12
            year += 1
        firstof_nextmonth = date(year, nextmonth, 1)
        lastof_thismonth = firstof_nextmonth + timedelta(days=-1)

        period_dict = {
            'now_local': now_local,
            'today': today_local.isoformat(),
            'tomorrow': tomorrow_local.isoformat(),
            'yesterday': yesterday_local.isoformat(),
            'thisweek_monday': thisweek_monday.isoformat(),
            'thisweek_sunday': thisweek_sunday.isoformat(),
            'firstof_month': firstof_month.isoformat(),
            'lastof_month': lastof_thismonth.isoformat()}

        #logger.debug('period_dict: ' + str(period_dict))
    return period_dict


def get_firstof_week(date_obj, week_add_int):
    new_date = None
    if(date_obj):
        new_date = date_obj + timedelta(days=(1 + 7 * week_add_int - date_obj.isoweekday()))
    return new_date


def get_lastof_week(date_obj, week_add_int):
    new_date = None
    if(date_obj):
        new_date = date_obj + timedelta(days=(7 + 7 * week_add_int - date_obj.isoweekday()))
    return new_date


def get_firstof_thismonth(date_obj):
    firstof_thismonth_dte = None
    if(date_obj):
        firstof_thismonth_dte = date_obj + timedelta(days=(1 - date_obj.day))
    return firstof_thismonth_dte


def get_firstof_nextmonth(date_obj):
    firstof_nextmonth_dte = None
    if(date_obj):
        firstof_thismonth_dte = get_firstof_thismonth(date_obj)
        firstof_nextmonth_dte = add_month_to_firstof_month(firstof_thismonth_dte, 1)
    return firstof_nextmonth_dte


def get_firstof_previousmonth(date_obj):
    firstof_previousmonth_dte = None
    if(date_obj):
        firstof_thismonth_dte = get_firstof_thismonth(date_obj)
        firstof_previousmonth_dte = add_month_to_firstof_month(firstof_thismonth_dte, -1)
    return firstof_previousmonth_dte


def get_lastof_month(date_obj):
    # 2020-06-27 debug: goes wrong with
    lastof_thismonth_dte = None
    if(date_obj):
        firstof_thismonth_dte = get_firstof_thismonth(date_obj)
        firstof_nextmonth_dte = add_month_to_firstof_month(firstof_thismonth_dte, 1)
        lastof_thismonth_dte = firstof_nextmonth_dte - timedelta(days=1)
    return lastof_thismonth_dte


def get_firstof_thisyear(year_int): # PR2021-02-12
    firstof_thisyear_dte = None
    if(year_int):
        firstof_thisyear_dte = date(year_int, 1, 1)
    return firstof_thisyear_dte


def add_days_to_date(date_obj, days_add_int):
    new_date = None
    if(date_obj):
        new_date = date_obj + timedelta(days=days_add_int)
    return new_date


def add_month_to_firstof_month(date_obj, month_add_int):
    # NOTE: this doesn't work with dates over 28 of the month, only use with first of the month PR2019-11-19
    # also not working when month_add_int > 12
    new_date = None
    if(date_obj):
        if month_add_int:
            year = date_obj.year
            new_month = date_obj.month + month_add_int
            if new_month < 1:
                new_month += 12
                year -= 1
            elif new_month > 12:
                new_month -= 12
                year += 1
            new_date = date(year, new_month, 1)
        else:
            new_date = date_obj
    return new_date


def add_months_to_date(date_obj, months_add_int):  # PR2020-04-07
    # function adds / subtracts months from date. Converts Feb 31 to Feb 28 or feb 29
    # input is datetime.date object, convert to a datetime.datetime object
    #logger.debug('date_obj: ' + str(date_obj.isoformat()) + ' ' + str(type(date_obj)))

    datetime_obj = get_datetime_naive_from_dateobject(date_obj)
    #logger.debug('datetime_obj: ' + str(datetime_obj.isoformat()) + ' ' + str(type(datetime_obj)))

    # Exception Value: descriptor 'date' requires a 'datetime.datetime' object but received a 'datetime.date'
    # date_obj = datetime.date(datetime_obj)
    new_dateobj = None
    if datetime_obj:
        year_int = datetime_obj.year
        month_int = datetime_obj.month
        day_int = datetime_obj.day
        new_month_int = month_int + months_add_int
        if new_month_int > 12:
            year_int += 1
            new_month_int -= 12
        elif new_month_int < 1:
            year_int -= 1
            new_month_int += 12

        new_dateobj = get_dayofmonth_orlesswheninvalid(year_int, new_month_int, day_int)


    return new_dateobj


def get_dayofmonth_orlesswheninvalid(year_int, month_int, day_int): #PR2020-09-24
    new_dateobj = None
    is_ok = False
    # when new date is not valid, subtract one day till it gets a valid day.
    # Add condition day_int < 28 to prevent infinite loop
    while not is_ok:
        try:
            new_dateobj = date(year_int, month_int, day_int)
            is_ok = True
        except:
            day_int -= 1
        if day_int < 28:
            is_ok = True
    return new_dateobj
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def get_weekdaylist_for_DHM(rosterdate, lang):
    # create dict with {-1: 'wo'. 0: 'do', 1: 'vr'} PR2019-05-03

    weekdaylist = ''

    # weekday_dict = {}
    if rosterdate:

        # get weekdays translated
        if not lang in c.WEEKDAYS_ABBREV:
            lang = c.LANG_DEFAULT

        datetime = rosterdate + timedelta(days=-1)
        weekday_int = int(datetime.strftime("%w"))
        weekday = c.WEEKDAYS_ABBREV[lang][weekday_int]
        weekdaylist = '-1:' + weekday + ','
        # weekday_dict[-1] = weekday

        weekday_int = int(rosterdate.strftime("%w"))
        weekday = c.WEEKDAYS_ABBREV[lang][weekday_int]
        weekdaylist = weekdaylist + '0:' + weekday + ','
        # weekday_dict[0] = weekday

        datetime = rosterdate + timedelta(days=1)
        weekday_int = int(datetime.strftime("%w"))
        weekday = c.WEEKDAYS_ABBREV[lang][weekday_int]
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
    #logger.debug('... get_dateISO_from_string ...')
    #logger.debug('date_string: ' + str(date_string), ' format: ' + str(format))

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
                    #logger.debug('year_int: ' + str(year_int) + ' month_int: ' + str(month_int) + ' day_int:' + str(day_int))

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
                    #logger.debug('year_str: ' + str(year_str) + ' month_str: ' + str(month_str) + ' day_str:' + str(day_str))

                    new_dat_str = '-'.join([year_str, month_str, day_str])
        except:
            logger.error('ERROR: get_dateISO_from_string: ' + str(date_string) + ' new_dat_str: ' + str(new_dat_str))
    return new_dat_str


def detect_dateformat(dict_list, field_list):
    #logger.debug(' --- detect_dateformat ---')
    #logger.debug('field_list: ' + str(field_list) )
    #logger.debug('dict_list: ' + str(dict_list))
    # detect date format PR2019-08-05  PR2020-06-04

    # TODO move to js. In import_employee already done, not yet in customer_import PR2020-06-05

    arr00_max = 0
    arr01_max = 0
    arr02_max = 0
    for dict in dict_list:
        for field in field_list:
            arr00 = 0
            arr01 = 0
            arr02 = 0

            date_string = dict.get(field)
            if date_string:
                arr = get_datetimearray_from_dateISO(date_string)
# - skip when date has an unrecognizable format
                isok = False
                if len(arr) > 2:
                    if arr[0].isnumeric():
                        arr00 = int(arr[0])
                        if arr[1].isnumeric():
                            arr01 = int(arr[1])
                            if arr[2].isnumeric():
                                arr02 = int(arr[2])
                                isok = True
# - get max values
                if isok:
                    if arr00 > arr00_max:
                        arr00_max = arr00
                    if arr01 > arr01_max:
                        arr01_max = arr01
                    if arr02 > arr02_max:
                        arr02_max = arr02
# - get position of year and day
    year_pos = -1
    day_pos = -1

    if arr00_max > 31 and arr01_max <= 31 and arr02_max <= 31:
        year_pos = 0
        if arr01_max > 12 and arr02_max <= 12:
            day_pos = 1
        elif arr02_max > 12 and arr01_max <= 12:
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

# - format
    format_str = ''
    if year_pos > -1 and day_pos > -1:
        if year_pos == 0 and day_pos == 2:
            format_str = 'yyyy-mm-dd'
        elif year_pos == 2:
            if day_pos == 0:
                format_str = 'dd-mm-yyyy'
            if day_pos == 1:
                format_str = 'mm-dd-yyyy'

        #logger.debug('format_str: ' + str(format_str) + ' max00: ' + str(arr00_max) + ' max01: ' + str(arr01_max) + ' max02: ' + str(arr02_max))

    #except:
    #    pass
        #logger.debug('detect_dateformat error: ' + str(date_string))

    return format_str


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
    #logger.debug('.... get_date_WDM_from_dte: ' + str(dte) + ' type:: ' + str(type(dte)) +' lang: ' + str(lang))
    date_HM = ''
    if minutes:
        hour = int(minutes / 60)
        minute = minutes - hour * 60

        hour_str = str(hour)
        minute_str = '00' + str(minute)
        minute_str = minute_str[-2:]

        # get weekdays translated
        if not lang:
            lang = c.LANG_DEFAULT
        if lang == c.LANG_NL:
            date_HM = hour_str + '.' + minute_str
        else:
            date_HM = hour_str + ':' + minute_str

    return date_HM


def get_date_WDM_from_dte(dte, lang):  # PR2019-05-01
    #logger.debug('.... get_date_WDM_from_dte: ' + str(dte) + ' type:: ' + str(type(dte)) +' lang: ' + str(lang))
    date_WDM = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''

            if lang in c.MONTHS_ABBREV:
                month_lang = c.MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            # get weekdays translated
            if not lang in c.WEEKDAYS_ABBREV:
                lang = c.LANG_DEFAULT
            weekday_int = int(dte.strftime("%w"))
            weekday_str = c.WEEKDAYS_ABBREV[lang][weekday_int]

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
            if lang in c.MONTHS_ABBREV:
                month_lang = c.MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]
            date_DM = ' '.join([ day_str, month_str])
        except:
            pass
    return date_DM


def calc_workingdays_in_period(period_datefirst_dte, period_datelast_dte, request):
    # - calculate working days in period  PR2020-07-09
    period_workingdays = 0
    period_workingdays_incl_ph = 0
    if period_datefirst_dte and period_datelast_dte:
        rosterdate_dte = period_datefirst_dte
        while rosterdate_dte <= period_datelast_dte:
            # 4. get is_publicholiday, is_companyholiday of this date from Calendar
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = get_issat_issun_isph_isch_from_calendar(
                rosterdate_dte, request)
            if not is_saturday and not is_sunday:
                period_workingdays_incl_ph += 1
                if not is_publicholiday:
                    period_workingdays += 1
            rosterdate_dte = rosterdate_dte + timedelta(days=1)
    return period_workingdays, period_workingdays_incl_ph

# ################### FORMAT FUNCTIONS ###################

def format_date_short_from_date(datelast_dte, short_names, show_weekdays, user_lang):
    #logger.debug(' --- format_date_short_from_date --- ') # PR2021-02-21

    display_text = ''
    try:
        if short_names:
            months_arr = c.MONTHS_ABBREV[user_lang]
            weekday_arr = c.WEEKDAYS_ABBREV[user_lang]
        else:
            months_arr = c.MONTHS_LONG[user_lang]
            weekday_arr = c.WEEKDAYS_LONG[user_lang]

        year_str = str(datelast_dte.year)
        month_str = months_arr[datelast_dte.month]
        isoweekday = datelast_dte.isoweekday()
        day_str = str(datelast_dte.day)

        weekday_str = ''
        if show_weekdays:
            weekday_str = weekday_arr[isoweekday]
            if user_lang != 'nl':
                weekday_str += ','
            weekday_str += ' '
        if user_lang == 'nl':
            display_text = ''.join([weekday_str, day_str, ' ', month_str, ' ', year_str])
        else:
            display_text = ''.join([weekday_str, month_str, ' ', day_str, ', ', year_str])

    except Exception as e:
        logger.error(getattr(e, 'message', str(e)))
        logger.error('datelast_dte: '+ str(datelast_dte) + ' ' + str(type(datelast_dte)))


    return display_text
# - end of format_date_short_from_date


# +++++++++++++++++++++++++++++++++
def format_period_from_date(datefirst_dte, datelast_dte, short_names, user_lang):
    #logger.debug(' --- format_period_from_date --- ')
    #logger.debug('periodstart_datetimelocal: ' + str(periodstart_dtmlocal))
    #logger.debug('periodend_datetimelocal: ' + str(periodend_dtmlocal))

    display_text = ''
    try:
        if short_names:
            months_arr = c.MONTHS_ABBREV[user_lang]
            weekday_arr = c.WEEKDAYS_ABBREV[user_lang]
        else:
            months_arr = c.MONTHS_LONG[user_lang]
            weekday_arr = c.WEEKDAYS_LONG[user_lang]

        same_year = (datefirst_dte.year == datelast_dte.year)
        same_month = (datefirst_dte.month == datelast_dte.month)
        same_day = (datefirst_dte.day == datelast_dte.day)

        end_year_str = str(datelast_dte.year)
        end_month_str = months_arr[datelast_dte.month]
        end_isoweekday = datelast_dte.isoweekday()
        end_day_str = str(datelast_dte.day)

        start_year_str = str(datefirst_dte.year)
        start_month_str = months_arr[datefirst_dte.month]
        start_isoweekday = datefirst_dte.isoweekday()
        start_day_str = str(datefirst_dte.day)

        end_weekday_str = ''
        if not short_names:
            end_weekday_str = weekday_arr[end_isoweekday]
            if user_lang != 'nl':
                end_weekday_str += ','
            end_weekday_str += ' '
        if user_lang == 'nl':
            end_fulldate_str = ''.join([end_weekday_str, end_day_str, ' ', end_month_str, ' ', end_year_str])
        else:
            end_fulldate_str = ''.join([end_weekday_str, end_month_str, ' ', end_day_str, ', ', end_year_str])

        if same_year and same_month and same_day:
            # start- and end time are on same date
            display_text = end_fulldate_str
        else:
            start_weekday_str = ''
            if not short_names:
                start_weekday_str = weekday_arr[start_isoweekday]
                if user_lang != 'nl':
                    start_weekday_str += ','
                start_weekday_str += ' '

            if user_lang == 'nl':
                start_fulldate_str = ''.join( [start_weekday_str, start_day_str, ' ', start_month_str])
            else:
                start_fulldate_str = ''.join( [start_weekday_str, start_month_str, ' ', start_day_str, ','])

            if not same_year:
                if user_lang == 'nl':
                    start_fulldate_str += ' ' + start_year_str
                else:
                    start_fulldate_str += ', ' + start_year_str

            display_text = ' - '.join([start_fulldate_str, end_fulldate_str])

    except:
        logger.error('ERROR: datefirst_dte' + str(datefirst_dte) + ' ' + str(type(datefirst_dte)) +
                        ' datelast_dte' + str(datelast_dte) + ' ' + str(type(datelast_dte)))

    return display_text

def format_period_from_datetimelocal(periodstart_dtmlocal, periodend_dtmlocal, timeformat, user_lang):
    #logger.debug(' --- format_period_from_datetimelocal --- ')
    #logger.debug('periodstart_datetimelocal: ' + str(periodstart_dtmlocal) + ' ' + str(type(periodstart_dtmlocal)))
    #logger.debug('periodend_datetimelocal: ' + str(periodend_dtmlocal)+ ' ' + str(type(periodend_dtmlocal)))

    display_text = ''
    # challenge: when end time is 0:00, display it as 24:00 previous day
    use24insteadof00 = False
    use_suffix = True
    start_time, niu = format_HM_from_dt_local(periodstart_dtmlocal, use24insteadof00, use_suffix, timeformat, user_lang)
    use24insteadof00 = True
    end_time, is24insteadof00 = format_HM_from_dt_local(periodend_dtmlocal, use24insteadof00, use_suffix, timeformat, user_lang)

    same_time = (periodstart_dtmlocal == periodend_dtmlocal)
    # if time is 24.00 u, set end datime one day back. Debug: must be after 'same_time = ...'
    if is24insteadof00:
        periodend_dtmlocal = periodend_dtmlocal + timedelta(days=-1)

    same_year = (periodstart_dtmlocal.year == periodend_dtmlocal.year)
    same_month = (periodstart_dtmlocal.month == periodend_dtmlocal.month)
    same_day = (periodstart_dtmlocal.day == periodend_dtmlocal.day)

    end_year_str = str(periodend_dtmlocal.year)
    end_month_str = c.MONTHS_ABBREV[user_lang][periodend_dtmlocal.month]
    end_isoweekday = periodend_dtmlocal.isoweekday()
    end_day_str = str(periodend_dtmlocal.day)
    end_weekday_str = c.WEEKDAYS_ABBREV[user_lang][end_isoweekday]

    start_year_str = str(periodstart_dtmlocal.year)
    start_month_str = c.MONTHS_ABBREV[user_lang][periodstart_dtmlocal.month]
    start_isoweekday = periodstart_dtmlocal.isoweekday()
    start_day_str = str(periodstart_dtmlocal.day)
    start_weekday_str = c.WEEKDAYS_ABBREV[user_lang][start_isoweekday]

    if user_lang == 'nl':
        end_fulldate_str = ''.join([end_weekday_str, ' ', end_day_str, ' ', end_month_str, ' ', end_year_str])
        start_fulldate_str = ''.join([start_weekday_str, ' ', start_day_str, ' ', start_month_str, ' ', start_year_str])
        if same_time:
            # now, no extension
            display_text = ''.join([end_fulldate_str, ', ' , end_time])
        elif same_year and same_month and same_day:
            # start- and end time are on same date
            display_text = ''.join([end_fulldate_str, ', ' , start_time , ' - ', end_time])
        elif not same_year:
            display_text = ''.join([start_fulldate_str, ', ', start_time , ' - ', end_fulldate_str, ', ', end_time])
        else:
            display_text = ''.join([start_weekday_str, ' ', start_day_str, ' ', start_month_str, ' ', start_time , ' - ',
                                    end_fulldate_str, ', ', end_time])

    elif user_lang == 'en':
        end_fulldate_str = ''.join([end_weekday_str, ', ', end_month_str, ' ', end_day_str, ', ', end_year_str])
        start_fulldate_str = ''.join([start_weekday_str, ', ', start_month_str, ' ', start_day_str, ', ', start_year_str])
        if same_time:
            # now, no extension
            display_text = ''.join([end_fulldate_str, ', ', end_time])
        elif same_year and same_month and same_day:
            # start- and end time are on same date
            display_text = ''.join([end_fulldate_str, ', ', start_time , ' - ', end_time])
        elif not same_year:
            display_text = ''.join([start_fulldate_str, ', ', start_time , ' - ', end_fulldate_str, ', ', end_time])
        else:
            display_text = ''.join([start_weekday_str, ', ', start_month_str, ' ', start_day_str, ', ', start_time , ' - ',
                                    end_fulldate_str, ', ', end_time])

    return display_text

def format_WDMY_from_dte(dte, user_lang):
    # returns 'zo 16 juni 2019'
    date_WDMY = ''
    if dte:
        try:
            date_DMY = format_DMY_from_dte(dte, user_lang)
            # get weekdays translated
            if not user_lang in c.WEEKDAYS_ABBREV:
                user_lang = c.LANG_DEFAULT
            weekday_int = int(dte.strftime("%w"))
            if not weekday_int:
                weekday_int = 7
            weekday_str = c.WEEKDAYS_ABBREV[user_lang][weekday_int]
            date_WDMY = ' '.join([weekday_str, date_DMY])
        except:
            pass
    #logger.debug('... format_WDMY_from_dte: ' + str(date_WDMY) + ' type:: ' + str(type(date_WDMY)) + ' user_lang: ' + str(user_lang))
    return date_WDMY


def format_HM_from_dt_local(datetime_local, use24insteadof00, use_suffix, timeformat, user_lang):
    # PR2020-01-26
    # Function returns time : "18.15 u." or "6:15 p.m."
    # 12.00 a.m is midnight, 12.00 p.m. is noon

    display_txt = ''
    is24insteadof00 = False
    if datetime_local:
        # from https://howchoo.com/g/ywi5m2vkodk/working-with-datetime-objects-and-timezones-in-python
        # entered date is dattime-naive, make it datetime aware with  pytz.timezone

        # .strftime("%H") returns zero-padded 24 hour based string '03' or '22'
        hours_int = datetime_local.hour
        minutes_int = datetime_local.minute

        suffix = None
        if use_suffix and user_lang == 'nl':
            suffix = 'u'

        if timeformat.lower() == 'ampm':
            suffix = 'p.m.' if hours_int >= 12 else 'a.m.'
            if hours_int > 12:
                hours_int -= 12
        elif use24insteadof00 and hours_int == 0 and minutes_int == 0:
            hours_int = 24
            is24insteadof00 = True

        hour_str = ''.join(['00', str(hours_int)])[-2:]
        minutes_str = ''.join(['00', str(minutes_int)])[-2:]

        separator = '.' if user_lang == 'nl' else ':'
        display_txt = separator.join([hour_str, minutes_str])

        if suffix:
            display_txt = ' '.join([display_txt, suffix])

    return display_txt, is24insteadof00


def format_DMY_from_dte(dte, lang):  # PR2019-06-09
    #logger.debug('... format_DMY_from_dte: ' + str(dte) + ' type:: ' + str(type(dte)) + ' lang: ' + str(lang))
    # returns '16 juni 2019'
    date_DMY = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''

            if lang in c.MONTHS_ABBREV:
                month_lang = c.MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            date_DMY = ' '.join([day_str, month_str, year_str])
        except:
            pass
    #logger.debug('... date_DMY: ' + str(date_DMY) + ' type:: ' + str(type(dte)) + ' lang: ' + str(lang))
    return date_DMY


def get_date_longstr_from_dte(dte, lang):  # PR2019-03-09
    #logger.debug('............. get_date_longstr_from_dte: ' + str(dte) + ' lang: ' + str(lang))
    date_longstr = ''
    if dte:
        try:
            year_str = str(dte.year)
            day_str = str(dte.day)
            month_lang = ''
            if lang in c.MONTHS_ABBREV:
                month_lang = c.MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            if lang == c.LANG_EN:
                time_longstr = dte.strftime("%H:%M %p")
                day_str = day_str + ','
                date_longstr = ' '.join([month_str, day_str, year_str, time_longstr])
            elif lang == c.LANG_NL:
                time_longstr = dte.strftime("%H.%M") + 'u'
                date_longstr = ' '.join([day_str, month_str, year_str, time_longstr])
        except:
            pass
    #logger.debug('............. date_longstr: ' + str(date_longstr) + ' lang: ' + str(lang))
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
            if lang in c.MONTHS_ABBREV:
                month_lang = c.MONTHS_ABBREV[lang]
            month_str = month_lang[dte.month]

            if lang == c.LANG_EN:
                time_longstr = dte.strftime("%H:%M %p")
                day_str  = day_str + ','
                date_longstr = ' '.join([month_str, day_str, year_str, time_longstr])
            elif lang == c.LANG_NL:
                time_longstr = dte.strftime("%H.%M") + 'u'
                date_longstr = ' '.join([day_str, month_str, year_str, time_longstr])
        except:
            pass
    #logger.debug('............. date_longstr: ' + str(date_longstr) + ' lang: ' + str(lang))
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


def get_timeduration(timestart, timeend, breakduration):  # PR2020-02-22
    # --- calculate working minutes - duration unit in database is minutes
    new_timeduration = 0
    if timestart and timeend:
        datediff = timeend - timestart
        datediff_minutes = int((datediff.total_seconds() / 60))
        new_timeduration = int(datediff_minutes - breakduration)
    return new_timeduration


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


def date_earliest_of_two(date_01, date_02):  # PR2019-10-19
    date_earliest = None
    if date_01 is None:
        if date_02 is not None:
            date_earliest = date_02
    else:
        if date_02 is None:
            date_earliest = date_01
        else:
            if date_02 < date_01:
                date_earliest = date_02
            else:
                date_earliest = date_01
    return date_earliest

def date_earliest_of_three(date_01, date_02, date_03):  # PR2019-10-19
    earliest_01_02 = date_earliest_of_two(date_01, date_02)

    return date_earliest_of_two(earliest_01_02, date_03)


def date_latest_of_two(date_01, date_02):  # PR2019-10-19
    date_latest = None
    if date_01 is None:
        if date_02 is not None:
            date_latest = date_02
    else:
        if date_02 is None:
            date_latest = date_01
        else:
            if date_02 > date_01:
                date_latest = date_02
            else:
                date_latest = date_01
    return date_latest

def date_latest_of_three(date_01, date_02, date_03):  # PR2019-10-19
    latest_01_02 = date_latest_of_two(date_01, date_02)

    return date_latest_of_two(latest_01_02, date_03)


# ################### NUMERIC FUNCTIONS ###################
def get_float_from_string(value_str):  # PR2019-09-01
    # PR20202-09-10 debug: when value_str is integer replace function gives error.
    # solved by isinstance(value_str, float) and isinstance(value_str, int)
    number = 0
    msg_err = None
    try:
        if value_str:
            if isinstance(value_str, float) or isinstance(value_str, int):
                number = value_str
            elif isinstance(value_str, str):
                # replace comma by dot, remove space and '
                value_str = value_str.replace(',', '.')
                value_str = value_str.replace(' ', '')
                value_str = value_str.replace("'", "")
                number = float(value_str) if value_str != '' else 0
            else:
                msg_err = str(_("'%(value)s' is not a valid number.") % { 'value': value_str})
    except:
        msg_err = str(_("'%(value)s' is not a valid number.") % { 'value': value_str})
    return number, msg_err


def set_status_bool_at_index(status_array, index, value_bool):
    # PR2021-02-10 functions cahnges value at index of status_array
    array_length = len(status_array)
    # extend list if length <= index
    if index >= array_length:
        for i in range(array_length, index + 1):
            status_array.append(0)
    # change value at index
    status_array[index] = 1 if  value_bool else 0


def set_status_sum_from_array(status_array):
    #logger.debug(' ----- set_status_sum_from_array -----')
    # PR2021-02-10 functions calculates status_sum from status_array
    status_sum = 0

    array_length = len(status_array)
    if array_length:
        reversed_string_array = []
        for i in range(array_length -1, -1, -1):
            value = '1' if status_array[i] else '0'
            reversed_string_array.append(value)

        reversed_string = ''.join(reversed_string_array)
        status_sum = int(reversed_string, 2)
    return status_sum


def get_status_bool_at_index(status_sum, index):
    # PR2019-11-14 functions checks if index is in binary status_sum
    # PR2021-02-09 functions return value at index as boolean
    status_bool_at_index = False
    if status_sum:
        status_array = get_status_array(status_sum)
        if index < len(status_array):
            # value of status_array[index] is integer: 1 or 0
            if status_array[index]:
                status_bool_at_index = True

    return status_bool_at_index


def get_status_array(status_sum):
    # PR2021-02-09 functions converts status_sum in array with integers
    # from https://stackoverflow.com/questions/1386811/convert-binary-string-to-list-of-integers-using-python
    status_array = []
    binary_str = None
    if status_sum:
        # bin(512) = 0b1000000000
        # str(bin(512))[2:] = '1000000000'
        # ''.join(reversed(str(bin(512))[2:])) = '0000000001'
        try:
            binary_str = ''.join(reversed(str(bin(status_sum))[2:]))
            status_array = [int(binary_str[i:i + 1], 2) for i in range(0, len(binary_str))]
        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            logger.error('binary_str: ', str(binary_str))

    return status_array


def get_cat_value(cat_sum, cat_index):
    has_cat_value = False
    if cat_sum:
        # bin(512) = 0b1000000000
        # str(bin(512))[2:] = '1000000000'
        # ''.join(reversed(str(bin(512))[2:])) = '0000000001'
        binary_str = ''.join(reversed(str(bin(cat_sum))[2:]))
        value_str = binary_str[cat_index]
        has_cat_value = value_str == '1'
    return has_cat_value


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def check_offset_overlap(a, b, x, y):  # PR2019-11-11
    #logger.debug(' --- check_offset_overlap --- ')

    has_overlap = False
    if a and b and x and y:
# 1. validate if timeend before timestart
        if b < a or y < x:
            has_overlap = True
            logger.error('ERROR: timeend before timestart ')
        else:
    # 2. check overlap
            # has overlap                x|______________|y
            #                       a|_______|b    a|________|b
            #                          b > x   and    a < y
            if b > x and a < y:
                has_overlap = True
    return has_overlap


def check_shift_overlap(cur_row, ext_row):  # PR2019-11-07
    #logger.debug(' --- check_shift_overlap --- ')
    # has_overlap = True when overlap and lower priority. With same priority: lower fid gets 'has_overlap = True'

    # # ext_row: [['568-0', 'a', 0, 1440, 4], ['568-1', 'a', 1440, 2880, 4]],

    has_overlap = False

    is_equal = False
    is_full_outer = False
    is_full_inner = False
    is_partly_end = False
    is_partly_start = False

    delete_this_row = False
    if cur_row and ext_row:
        #logger.debug('----')
        #logger.debug('cur_row:  ' + str(cur_row))
        #logger.debug('ext_row:  ' + str(ext_row))

        x = ext_row[2] # osdif
        y = ext_row[3] # oedif

        a = cur_row[2] # osdif
        b = cur_row[3] # oedif

        # no overlap                x|_________|y
        #               a|_____|b                  a|_____|b
        #                       b <= x     or      a >= y

# validate if timeend before timestart
        if b < a or y < x:
            logger.error('ERROR: timeend before timestart ')
        else:
# check if has_overlap

            if b > x and a < y:
                has_overlap = True

                if a == x and b == y:
                    is_equal = True
                elif a <= x and b >= y:
                    is_full_outer = True # cur_row is bigger then ext_row
                elif a >= x and b <= y:
                    is_full_inner = True # cur_row is smaller then ext_row
                elif x <= a < y < b:  # a >= x and a < y and b > y:
                    is_partly_end = True # end of cur_row is later then ext_row
                elif a < x < b <= y:  # a < x and b > x and b <= y:
                    is_partly_start = True # start of cur_row is earlier then ext_row

                cur_cat = cur_row[1]
                cur_seq = cur_row[4]
                ext_cat = ext_row[1]
                ext_seq = ext_row[4]
    # delete this row when:
            # - cur_row is a shift row
            # - ext_row is restrow or absence row
            # - cur_row is swallowed by ext_row (is_full_inner = True)
                if cur_cat == 's':
                    if ext_cat in ['a', 'r']:
                        if is_full_inner:
                            delete_this_row = True
            # - cur_row is a restrow
            # - ext_row absence row
            # - cur_row is swallowed by ext_row (is_full_inner = True)
                elif cur_cat == 'r':
                    if ext_cat == 'a':
                        if is_full_inner:
                            delete_this_row = True
                elif cur_cat == 'a':
                    pass
    return has_overlap, delete_this_row



def check_shift_overlap_with_startend(a, b, x, y):  # PR2020-05-12
    #logger.debug(' --- check_shift_overlap_with_startend --- ')
    # parameterss are excelstart and excelend. Value of excelstart = exceldate * 1440 + offsetstart
    # function returns:
    # - None if no overlap, or if not all parameters have value
    # - 'error' if offsetend before offsetstart
    #logger.debug('     a: ' + str(a) + ' b: ' + str(b) + ' x: ' + str(x) +' y: ' + str(y))
    # # ext_row: [['568-0', 'a', 0, 1440, 4], ['568-1', 'a', 1440, 2880, 4]],

    overlap_start = False
    overlap_end = False

    if a and b and x and y:
        #   overlap           x|____________|y
        #               a|________|b   a|________|b
        #                         a|___|b

# validate if timeend before timestart
        if b < a or y < x:
            #logger.debug('     b < a or y < x pass')
            pass
            # error if timeend before timestart: skip, no overlap. validation happens outside this function
        elif a == b or x == y:
            #logger.debug('     a == b or x == y')
            pass
            # no overlap when start and end time are the same
# shifts have overlap
        elif a < y and b > x:
            has_overlap = True
            #logger.debug('     a < y and b > x has_overlap = True')
            if a < x:
                overlap_end = True
                #logger.debug('    a < x overlap_end = True')
            if b > y:
                overlap_start = True
                #logger.debug('     b > y overlap_start = True')
            if a >= x and b <= y:
                # a-b is fully within x-y : set overlap_start and overlap_end True
                overlap_start = True
                overlap_end = True
                #logger.debug('     a >= x and b <= y overlap_start = True overlap_end = True')
    else:
        #logger.debug('     has blanks overlap_start = False overlap_end = False')
        pass
    return overlap_start, overlap_end

def check_absence_overlap(cur_fid, cur_row, ext_fid, ext_row):  # PR2019-10-29
    #logger.debug(' --- check_overlap --- ')
    # has_overlap = True when overlap and lower priority. With same priority: lower fid gets 'has_overlap = True'
    # row: '503-7': {'rosterdate': '2019-10-05', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan',
    # 'ddif': 7, 'o_cat': 512, 'o_seq': 2, 'osdif': 10080, 'oedif': 11520}}

    has_overlap = False
    if cur_row and ext_row:
        x = cur_row['osdif']
        y = cur_row['oedif']

        a = ext_row['osdif']
        b = ext_row['oedif']

        # no overlap                x|_________|y
        #               a|_____|b                  a|_____|b
        #                       b <= x     or      a >= y

    # check if timeend before timestart
        if b < a or y < x:
            logger.error('ERROR: timeend before timestart ')
        else:
    # check if has overlap
            if b > x and a < y:
                has_overlap = True

                if a == x and b == y:
                    is_equal = True
                elif a <= x and b >= y:
                    is_full_outer = True
                elif a >= x and b <= y:
                    is_full_inner = True
                elif x <= a < y < b:  # a >= x and a < y and b > y:
                    is_partly_end = True
                elif a < x < b <= y:  # a < x and b > x and b <= y:
                    is_partly_start = True

        #logger.debug('has_overlap --- ' + str(has_overlap))
        if has_overlap:
# if overlap: lowest sequence stays, except for 0
            #logger.debug('cur_row --- ' + str(cur_row))
            #logger.debug('ext_row --- ' + str(ext_row))

            cur_row_seq = cur_row['o_seq'] if cur_row['o_seq'] is not None else 0
            ext_row_seq = ext_row['o_seq'] if ext_row['o_seq'] is not None else 0

            #logger.debug('cur_row_seq --- ' + str(cur_row_seq) + ' ext_row_seq --- ' + str(ext_row_seq))
            if cur_row_seq:
                if ext_row_seq:
                    if cur_row_seq > ext_row_seq:
                        # cur_row_seq > ext_row_seq means cur_row has lower priority. overlap = True will delete cur_row
                        #logger.debug('has_overlap = True --- ' + str(cur_row_seq) + ' > ' + str(ext_row_seq))
                        has_overlap = True
                    elif cur_row_seq == ext_row_seq:
                        # priority the same: just choose one, so that other will stay when it is cheked for overlap
                        if cur_fid < ext_fid:
                            has_overlap = True
                            #logger.debug('priority the same cur_fid > ext_fid --- ' + str(cur_fid) + ' > ' + str(ext_fid))
            else:
                if ext_row_seq:
                    has_overlap = True
                else:
                    # priority the same: just choose one, so that other will stay when it is cheked for overlap
                    if cur_fid < ext_fid:
                        has_overlap = True
                        #logger.debug('priority both 0 --- ' + str(cur_fid) + ' > ' + str(ext_fid))

    #logger.debug('return has_overlap --- ' + str(has_overlap))
    return has_overlap

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


def check_XXXoverlap(row, all_rows, rosterdate):
    #logger.debug(' --- check_overlap --- ')
    #logger.debug('rosterdate: ' + str(rosterdate))

    is_equal, is_full_outer, is_full_inner, is_partly_end, is_partly_start = False, False, False, False, False
    has_overlap = False
    other_has_higher_seq = False
    if row:
        offsetstart_when_none = -99999
        offsetend_when_none = 99999
        x = row['offsetstart'] if row['offsetstart'] is not None else offsetstart_when_none
        y = row['offsetend'] if row['offsetend'] is not None else offsetend_when_none
        row_seq = row['o_seq'] if row['o_seq'] is not None else 0
        #logger.debug('tm_id: ' + str(row['tm_id']) + ': x = ' + str(x) + ' y = ' + str(y))
        for sub_row in all_rows:
            #logger.debug('sub_row tm_id: ' + str(sub_row['tm_id']))
            # skip sub_row that equals row
            if sub_row['tm_id'] != row['tm_id']:
        # compare sequence (only used in absence)
                subrow_seq = sub_row['o_seq'] if sub_row['o_seq'] is not None else 0
                if subrow_seq > row_seq:
                    other_has_higher_seq = True
        # correct offset when rosterdate is previous or next day
                offset_diff = 0
                if sub_row['rosterdate'] != rosterdate:
                    datediff = sub_row['rosterdate'] - rosterdate  # datediff is class 'datetime.timedelta'
                    offset_diff = datediff.days * 1440

                a = sub_row['offsetstart'] + offset_diff if sub_row['offsetstart'] is not None else offsetstart_when_none
                b = sub_row['offsetend'] + offset_diff if sub_row['offsetend'] is not None else offsetend_when_none
                #logger.debug('sub_row tm_id: ' + str(sub_row['tm_id']) + ': a = ' + str(a) + ' b = ' + str(b))

                #logger.debug(str(emplhour.id) + ': x = ' + str(x.isoformat()) + ' y = ' + str(y.isoformat()))
                #logger.debug(str(sub_eplh['id']) + ': a = ' + str(a.isoformat()) + ' b = ' + str(b.isoformat()))

                # no overlap                x|_________|y
                #               a|_____|b                  a|_____|b
                #                       b <= x     or      a >= y

                # full outer overlap        x|______|y
                #                     a|__________________|b
                #                     a <= x    and    b >= y  (except a = x and b = y)

                # full inner overlap  x|__________________|y
                #                             a|__|b
                #                     a >= x   and   b <= y     (except a = x and b = y)

                # part overlap start         x|_________|y
                #                        a|_____|b
                #                     a < x and b > x and b <= y

                # part overlap end           x|_________|y
                #                                   a|_____|b
                #                     a < y and a >= x and b > y

                # equal                x|_________|y
                #                      a|_________|b
                #                   a == x     and b == y


                if a == x and b == y:
                    has_overlap = True
                    is_equal = True
                elif a <= x and b >= y:
                    has_overlap = True
                    is_full_outer = True
                elif a >= x and b <= y:
                    has_overlap = True
                    is_full_inner = True
                elif x <= a < y < b:  # a >= x and a < y and b > y:
                    has_overlap = True
                    is_partly_end = True
                elif a < x < b <= y:  # a < x and b > x and b <= y:
                    has_overlap = True
                    is_partly_start = True
    has_overlap_without_higher_sequence = has_overlap and not other_has_higher_seq
    return has_overlap_without_higher_sequence

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# ################### DICT FUNCTIONS ###################
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
                #logger.debug('get_depbase_list_field_sorted_zerostripped dep: <' + str(dep) + '> Type: ' + str(type(dep)))
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
    #logger.debug('get_tuple_from_list_str tuple list_tuple <' + str(list_tuple) + '> Type: " + str(list_tuple))
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


def create_update_dict(field_list, table, pk, ppk, map_id=None, row_index=None):
# - Create empty update_dict with keys for all fields. Unused ones will be removed at the end
    update_dict = {}  # this one is not working: update_dict = dict.fromkeys(field_list, {})
    for field in field_list:
        update_dict[field] = {}
        if field == 'id':
#  add id_dict to update_dict
            update_dict['id']['table'] = table
            if pk:
                update_dict['id']['pk'] = pk
            if ppk:
                update_dict['id']['ppk'] = ppk
            if map_id:
                update_dict['id']['mapid'] = map_id
            if row_index:
                update_dict['id']['rowindex'] = row_index
    return update_dict


def get_iddict_variables(id_dict):
# - get id_dict from upload_dict
    # 'id': {'temp_pk': 'new_26', 'create': True, 'parent_pk': 1, 'table': 'teammembers'}

    mode, table, temp_pk_str = '', '', ''
    pk_int, ppk_int = 0, 0
    row_index = None
    is_create, is_delete, is_absence, is_template = False, False,  False, False

    if id_dict:
        table = id_dict.get('table', '')
        pk_int = id_dict.get('pk')
        ppk_int = id_dict.get('ppk')
        temp_pk_str = id_dict.get('temp_pk', '')
        row_index = id_dict.get('rowindex', '')
        is_create = ('create' in id_dict)
        is_delete = ('delete' in id_dict)
        mode = id_dict.get('mode', '')
        is_absence = ('isabsence' in id_dict)
        # is_template = ('istemplate' in id_dict)

    return pk_int, ppk_int, temp_pk_str, is_create, is_delete, is_absence, table, mode, row_index


def get_dict_value(dictionry, key_tuple, default_value=None):
    # PR2020-02-04 like in base.js Iterate through key_tuple till value found
    #logger.debug('  -----  get_dict_value  -----')
    #logger.debug('     dictionry: ' + str(dictionry))
    if key_tuple and dictionry:  # don't use 'dictionary' - is PyCharm reserved word
        for key in key_tuple:
            #logger.debug('     key: ' + str(key) + ' key_tuple: ' + str(key_tuple))
            if isinstance(dictionry, dict) and key in dictionry:
                dictionry = dictionry[key]
                #logger.debug('     new dictionry: ' + str(dictionry))
            else:
                dictionry = None
                break
    if dictionry is None and default_value is not None:
        dictionry = default_value
    #logger.debug('     return dictionry: ' + str(dictionry))
    return dictionry


def set_fielddict_date(field_dict, date_obj, rosterdate=None, mindate=None, maxdate=None):
    # PR2019-07-18
    if date_obj:
        date_iso = date_obj.isoformat()
        field_dict['value'] = date_iso

    # return rosterdate and min max date also when date is empty
    if rosterdate:
        field_dict['rosterdate'] = rosterdate.isoformat()
    if mindate:
        field_dict['mindate'] = mindate.isoformat()
    if maxdate:
        field_dict['maxdate'] = maxdate.isoformat()


def get_fielddict_pricerate(table, instance, field_dict, user_lang):
    # PR2019-09-20 rate is in cents.
    # Value 'None' removes current value, gives inherited value
    # value '0' gives rate zero (if you dont want to charge for these hours

    # pricerate employee is different function below, to be corrected

    #logger.debug('  ')
    #logger.debug(' --- get_fielddict_pricerate --- table: ' + str(table) + ' instance: ' + str(instance))

    field = 'priceratejson'

    # TODO select rosterdate,  wagefactor
    cur_rosterdate = None
    cur_wagefactor = None
    pricerate = None
    saved_pricerate = None

# lookup pricerate in tbale ( table can be order, scheme, shift, schemeitem)
    saved_value_json = getattr(instance, field)  # {"0": {"0": 4400}}
    #logger.debug('saved_value_json: ' + str(saved_value_json))
    if saved_value_json is not None:
        saved_value_dict = json.loads(saved_value_json)  # {'0': {'0': 4400}}
        #logger.debug('saved_value_dict: ' + str(saved_value_dict))
        saved_pricerate = get_pricerate_from_dict(saved_value_dict, cur_rosterdate, cur_wagefactor)
        if saved_pricerate is not None: # 0 is a value, so don't use 'if pricerate:'
            pricerate = saved_pricerate

# lookup pricerate in order if value == null, not whe ntable = order
    if pricerate is None:
        if table == 'scheme':
            if pricerate is None and instance.order is not None:
                pricerate = get_pricerate_from_instance(instance.order, field, cur_rosterdate, cur_wagefactor)

        elif table == 'shift':
            if pricerate is None and instance.scheme is not None:
                pricerate = get_pricerate_from_instance(instance.scheme, field, cur_rosterdate, cur_wagefactor)

                if pricerate is None and instance.scheme.order is not None:
                    pricerate = get_pricerate_from_instance(instance.scheme.order, field, cur_rosterdate, cur_wagefactor)

        elif table == 'schemeitem':
            if pricerate is None and instance.shift is not None:
                pricerate = get_pricerate_from_instance(instance.shift, field, cur_rosterdate, cur_wagefactor)

            if pricerate is None and instance.scheme is not None:
                pricerate = get_pricerate_from_instance(instance.scheme, field, cur_rosterdate, cur_wagefactor)
                if pricerate is None and instance.scheme.order is not None:
                    pricerate = get_pricerate_from_instance(instance.scheme.order, field, cur_rosterdate, cur_wagefactor)

    display_text = display_pricerate(pricerate, False, user_lang)
    #logger.debug('display_text: ' + str(display_text))

    if pricerate is not None:  # 0 is a value, so don't use 'if pricerate:'
        field_dict['value'] = pricerate
    if display_text:
        field_dict['display'] = display_text
    if saved_pricerate is None and pricerate is not None:
        field_dict['inherited'] = True


def get_pricerate_from_instance(instance, field, cur_rosterdate, cur_wagefactor):
    #logger.debug(' --- get_pricerate_from_instance: ' + str(instance))
    pricerate = None
    if instance is not None:
        saved_value_json = getattr(instance, field)
        #logger.debug('saved_value_json: ' + str(saved_value_json))
        if saved_value_json is not None:
            saved_value_dict = json.loads(saved_value_json)  # {'0': {'0': 4400}}
            #logger.debug('saved_value_dict: ' + str(saved_value_dict))
            saved_pricerate = get_pricerate_from_dict(saved_value_dict, cur_rosterdate, cur_wagefactor)
            #logger.debug('saved_pricerate: ' + str(saved_pricerate))
            if saved_pricerate is not None:  # 0 is a value, so don't use 'if pricerate:'
                pricerate = saved_pricerate
                #logger.debug('pricerate: ' + str(pricerate))
    return pricerate


 # TODO to correct
def get_fielddict_pricerate_employee(table, instance, field_dict, user_lang):
    # First lookup pricerate in teammember, only if table == 'schemeitem':
    # teammember pricerate only overrules schemeiten when value > 0 (schemeitem  pricerate = 0 overrules, = None not)
    pricerate = None
    cur_rosterdate = None
    cur_wagefactor = None
    if pricerate is None:
        if table == 'schemeitem':
            if instance.team:
                teammember = m.Teammember.get_first_teammember_on_rosterdate(instance.team, instance.rosterdate)
                if teammember:
                    priceratejson = getattr(teammember, 'priceratejson')
                    if priceratejson:
                        teammember_pricerate = get_pricerate_from_dict(json.loads(priceratejson), cur_rosterdate,
                                                                       cur_wagefactor)
                        #logger.debug(' teammember_pricerate: ' + str(teammember_pricerate))
                        if teammember_pricerate:
                            pricerate = teammember_pricerate
                        elif teammember_pricerate is None:
                            if teammember.employee:
                                priceratejson = getattr(teammember.employee, 'priceratejson')
                                if priceratejson:
                                    employee_pricerate = get_pricerate_from_dict(json.loads(priceratejson),
                                                                                 cur_rosterdate,
                                                                                 cur_wagefactor)
                                    if employee_pricerate:
                                        pricerate = employee_pricerate
                                        #logger.debug(' teammember.employee pricerate: ' + str(saved_value))

#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

def get_billable_from_order_shift(order, shift):
    # used in EmplhourUploadView.create_orderhour_emplhour  when shift is added in rosterpage   # PR2020-04-24
    #  billable = 0 = no override, 1= override NotBillable, 2 = override Billable
    # first checkshift and scheme (if there is any), skip restshift
    # if billable = 0 (no override) check order, customer, company (skip absence)

    billable = 0
    if order and not order.customer.isabsence:
        if shift and not shift.isrestshift:
            if shift.billable:
                billable = shift.billable
        if not billable:
            if order.billable:
                billable = order.billable
            elif order.customer.company.billable:
                billable = order.customer.company.billable
    is_billable = (billable == 2)

    return is_billable

def get_billable_order(order):
    # PR2019-10-10
    # value 0 = no override, 1= override NotBillable, 2= override Billable

    field = 'billable'
    is_billable = False
    is_override = False

    if order:
        value = getattr(order, field, 0)
        is_override = (value > 0)
        if is_override:
            is_billable = (value == 2)
        else:
            # get default company_billable, has no value 'is_override'
            value = getattr(order.customer.company, field, 0)
            is_billable = (value == 2)
    return is_override, is_billable


def get_billable_shift(shift):
    # PR2019-10-10
    # value 0 = no override, 1= override NotBillable, 2= override Billable

    field = 'billable'
    is_billable = False
    is_override = False

    if shift:
        value = getattr(shift, field, 0)
        is_override = (value > 0)
        if is_override:
            is_billable = (value == 2)
        else:
            value = getattr(shift.scheme, field, 0)
            if value > 0: # is_override when value > 0
                is_billable = (value == 2)
            else:
                value = getattr(shift.scheme.order, field, 0)
                if value > 0: # is_override when value > 0
                    is_billable = (value == 2)
                else:
                    # get default company_billable, has no value 'is_override'
                    value = getattr(shift.scheme.order.customer.company, field, 0)
                    is_billable = (value == 2)
    return is_override, is_billable

#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

def fielddict_duration(duration, user_lang):
    dict = {}
    if duration:
        dict = {'value': duration,
                'hm': get_date_HM_from_minutes(duration, user_lang)}
    return dict


def remove_empty_attr_from_dict(dict):
# --- function removes empty attributes from dict  PR2019-06-02
    #logger.debug('--- remove_empty_attr_from_dict')
    #logger.debug('dict: ' + str(dict))
# create list of fields in dict
    list = []
    for field in dict:
        list.append(field)
    #logger.debug('list: ' + str(list))
# iterate through list of fields in dict
    # cannot iterate through dict because it changes during iteration
    for field in list:
        if field in dict:
# remove empty attributes from dict
            if not dict[field]:
                del dict[field]
                #logger.debug('deleted: ' + str(field))
# remove 'create' from id_dict
            elif field == 'id':
                if 'create' in dict['id']:
                    del dict['id']['create']
    #logger.debug('dict: ' + str(dict))


def display_pricerate(value, add_percent_sign, user_lang):
    # returns '35,25' or '35.25' PR2019-09-20 PR2022-03-06
    display_value = ''
    if value is not None:
        decimal_separator = ',' if user_lang == 'nl' else '.'
        thousand_separator = '.' if user_lang == 'nl' else ','
        dollars = int (value / 100)

        dollar_text = str(dollars)
        if dollars >= 1000000:
            pos = len(dollar_text) - 6
            dollar_text = thousand_separator.join((dollar_text[0:pos], dollar_text[pos]))
        if dollars >= 1000:
            pos = len(dollar_text) - 3
            dollar_text = thousand_separator.join((dollar_text[0:pos], dollar_text[pos]))

        cents = value - dollars * 100
        skip_cents = add_percent_sign and not cents
        if not skip_cents:
            cents_str = '00' + str(cents)
            display_value = decimal_separator.join((str(dollars), cents_str[-2:]))

        if add_percent_sign:
            display_value += '%'

    return display_value


def get_rate_from_value(value):
    # PR2019-09-20 rate is in cents.
    # Value 'None' removes current value, gives inherited value
    # value '0' gives rate zero (if you dont want to charge for these hours
    #logger.debug(' --- get_rate_from_value ---')

    #logger.debug('pricerate: ' + str(value) + ' ' + str(type(value)))

    msg_err = None
    rate = None
    if value is not None:
        value_str = str(value)
        #logger.debug('value_str <' + str(value_str) + '> ' +  str(type(value_str)))
        value_str = value_str.replace(' ', '')

        if value_str:
            error = False
            dollars = 0
            cents = 0
        # replace comma by dot
            value_str = value_str.replace(',', '.')
            if value_str.count('.') == 0:
                if value_str.isnumeric():
                    dollars = int(value_str)
                else:
                    error = True
            elif value_str.count('.') == 1:
                arr = value_str.split('.')  # If separator is not provided then any white space is a separator.
                if arr[0]:
                    if arr[0].isnumeric():
                        dollars = int(arr[0])
                    else:
                        error = True
                if arr[1]:
                    if arr[1].isnumeric():
                        centts_str = arr[1] + '00'
                        cents_str = centts_str[:2]
                        cents = int(cents_str)
                    else:
                        error = True
                else:
                    error = True
            else:
                error = True
            rate = dollars * 100 + cents

            if error:
                msg_err = _("'%(value)s' is not a valid number.") % {'value': value_str}

    #logger.debug('rate <' + str(rate) + '> ' + str(type(rate)))
    return rate, msg_err

def get_shiftpricecode_from_orderhour(orderhour):  # PR2020-11-28
   #logger.debug(' --------- get_shiftpricecode_from_orderhour -------------')
    sh_prc_id = None
    prc_override = False
    if orderhour:
        order = orderhour.order
        shift = orderhour.shift

        if shift:
            prc_override = shift.pricecodeoverride
        if not prc_override:
            prc_override = order.pricecodeoverride
        if not prc_override:
            prc_override = order.customer.company.pricecodeoverride

        if shift and shift.pricecode:
            sh_prc_id = shift.pricecode.pk
        if sh_prc_id is None and order.pricecode:
            sh_prc_id = order.pricecode.pk
        if sh_prc_id is None and order.customer.company.pricecode_id:
            # company.pricecode_id has no foreign key
            sh_prc_id = order.customer.company.pricecode_id

    return sh_prc_id, prc_override
# - end of calc_shiftpricerate_from_orderhour


def calc_pricerate_from_emplhour(emplhour):  # PR2020-11-24  PR2020-11-27
   #logger.debug(' --------- calc_pricerate_from_emplhour -------------')
    price_rate = 0
    if emplhour:
        orderhour = emplhour.orderhour
        if orderhour:
            order = orderhour.order
            shift = orderhour.shift

            prc_override = False
            if shift:
                prc_override = shift.pricecodeoverride
            if not prc_override:
                prc_override = order.pricecodeoverride
                if not prc_override:
                    prc_override = order.customer.company.pricecodeoverride
           #logger.debug('prc_override: ' + str(prc_override))

            sh_prc_id = None
            if shift and shift.pricecode:
                sh_prc_id = shift.pricecode.pk
           #logger.debug('shift prc_id: ' + str(sh_prc_id))
            if sh_prc_id is None:
                if order.pricecode:
                    sh_prc_id = order.pricecode.pk
           #logger.debug('order shift prc_id: ' + str(sh_prc_id))
            if sh_prc_id is None:
                # company.pricecode_id has no foreign key
                sh_prc_id = order.customer.company.pricecode_id
           #logger.debug('sh_prc_id: ' + str(sh_prc_id))

            e_prc_id = None
            if emplhour.employee and emplhour.employee.pricecode:
                e_prc_id = emplhour.employee.pricecode.pk
           #logger.debug('e_prc_id: ' + str(e_prc_id))

            rosterdate_dte = orderhour.rosterdate

           #logger.debug('price_rate: ' + str(price_rate))

            price_rate = calc_pricerate_from_values(sh_prc_id, prc_override, e_prc_id, rosterdate_dte)

   #logger.debug('price_rate: ' + str(price_rate))
    return price_rate




def calc_pricerate_from_values(sh_prc_id, sh_prc_override, e_prc_id, rosterdate_dte ):  # PR2020-11-24
   #logger.debug(' --------- calc_pricerate_from_values -------------')
   #logger.debug('sh_prc_id: ' + str(sh_prc_id) + ' sh_prc_override: ' + str(sh_prc_override))
   #logger.debug('e_prc_id: ' + str(e_prc_id) + ' rosterdate_dte: ' + str(rosterdate_dte))

    price_rate = 0
    if rosterdate_dte:
        pricecode_pk = None
        if e_prc_id is not None and not sh_prc_override:
            pricecode_pk = e_prc_id
        elif sh_prc_id:
            pricecode_pk = sh_prc_id

       #logger.debug('pricecode_pk: ' + str(pricecode_pk) + ' rosterdate_dte: ' + str(rosterdate_dte))
        price_rate = get_pricerate_from_pricecodeitem('pricecode', pricecode_pk, rosterdate_dte)
       #logger.debug(' price_rate: ' + str(price_rate))

    return price_rate


def get_pricerate_from_pricecodeitem(field, pricecode_pk, rosterdate):  # PR2020-03-9 PR20202-07-26
    #logger.debug(' ============= get_pricerate_from_pricecodeitem ============= ')
    #logger.debug('field: ' + field + ' pricecode_pk: ' + str(pricecode_pk))
    #logger.debug(' rosterdate: ' + str(rosterdate ) + ' ' + str(type(rosterdate)))

    price_rate = 0
    if pricecode_pk:
        sql_list = ['SELECT pci.pricerate FROM companies_pricecodeitem AS pci WHERE (pci.pricecode_id = %(pcid)s)',
                    'AND (pci.datefirst <= CAST(%(rd)s AS DATE) OR pci.datefirst IS NULL)',
                    'AND (pci.datelast >= CAST(%(rd)s AS DATE) OR pci.datelast IS NULL)']
        sqlfilter = 'AND (FALSE)'
        if field == 'pricecode':
            sqlfilter = 'AND (pci.isprice)'
        elif field == 'additioncode':
            sqlfilter = 'AND (pci.isaddition)'
        elif field == 'taxcode':
            sqlfilter = 'AND (pci.istaxcode)'
        sql_list.append(sqlfilter)
        sql_list.append('ORDER BY pci.datefirst DESC NULLS LAST LIMIT 1')

        sql = ' '.join(sql_list)
        #logger.debug('sql: ' + str(sql))

        cursor = connection.cursor()
        cursor.execute(sql, {
            'pcid': pricecode_pk,
            'rd': rosterdate
        })
        row = cursor.fetchone()
        #logger.debug('row: ' + str(row))
        if row:
            if row[0]:
                price_rate = row[0]
    #logger.debug('price_rate: ' + str(price_rate))
    return price_rate


def get_pricerate_from_dict(pricerate_dict, cur_rosterdate, cur_wagefactor):
    # function gets rate from pricerate_dict PR2019-10-15
    # each price_startdate can have multiple rates: one for each wagefactor
    # pricerate_dict = {'2019-10-15': {100: 2500, 150: 3000, 200: 3500}, '2020-01-01': {100: 2600, 150: 3200, 200: 3800}
    # key_startdate is the startdate of the new pricerate
    # from https://realpython.com/iterate-through-dictionary-python/

    #logger.debug(' --- get_pricerate_from_dict --- ')

    if cur_rosterdate is None:
        cur_rosterdate = '0'
    key_str = '00000000'
    if cur_wagefactor:
        key_str += str(cur_wagefactor)
    cur_wagefactor_key = key_str[-8:]

    pricerate = None
    # lookup rosterdate_dict with key_startdate that is closest to cur_rosterdate and <= cur_rosterdate
    if pricerate_dict:
        lookup_startdate = '0'
        # iterate over key_startdate of pricerate_dict, get the greatest key_startdate that is <= cur_rosterdate
        for key_startdate in pricerate_dict.keys():
            # check if key_startdate <= cur_rosterdate
            if lookup_startdate < key_startdate <= cur_rosterdate:
                # store key in lookup_startdate if it is greater than the stored key
               lookup_startdate = key_startdate
        if lookup_startdate in pricerate_dict:
    # lookup wagefactor that is closest to cur_wagefactor and <= cur_wagefactor
    # get pricerate of this wagefactor
            # iterate over key_wagefactor of rosterdate_dict, get the greatest key_wagefactor that is <= cur_wagefactor
            lookup_wagefactor = ''
            rosterdate_dict = pricerate_dict[lookup_startdate]
            for key_wagefactor in rosterdate_dict.keys():
                # check if key_wagefactor <= cur_wagefactor
                if lookup_wagefactor < key_wagefactor <= cur_wagefactor_key:
                    # store key in lookup_wagefactor if it is greater than the stored key
                    lookup_wagefactor = key_wagefactor
            if lookup_wagefactor in rosterdate_dict:
                pricerate = rosterdate_dict[lookup_wagefactor]
    return pricerate


def get_pat_code_cascade(field, orderhour, request):
    #logger.debug(' --- get_pricerate_cascade --- ')  # PR2020-07-05 PR2020-11-28
    # - seach for addition-/tax_code in shift first, then in order, then in company
    # - only called by update_emplhour
    # - fields are 'additioncode' or 'taxcode'
    # - pricecode is not stored in ordrehour but in emplhour. It is retrieved in calc_pricerate_from_emplhour
    pat_code_cascade = None
    if orderhour:
        shift = orderhour.shift
        if shift:
            pat_code_cascade = getattr(shift, field)
        
        if pat_code_cascade is None:
            order = orderhour.order
            if order:
                pat_code_cascade = getattr(order, field)
                if pat_code_cascade is None:
                    if request.user.company:
                        # company has no linked field, use pricecode_id etc instead
                        pat_code_id = getattr(request.user.company, field + '_id')
                        if pat_code_id:
                            pat_code_cascade = m.Pricecode.objects.get_or_none(id=pat_code_id)
    return pat_code_cascade


def save_pricerate_to_instanceXXX(instance, rosterdate, wagefactor, new_value, update_dict, field):
    #logger.debug('   ')
    #logger.debug(' --- save_pricerate_to_instance --- ' + str(instance) + ' value: ' + str(new_value))
    #logger.debug('field ' + str(field))

    is_updated = False
    new_rate, msg_err = get_rate_from_value(new_value)
    if msg_err:
        if update_dict:
            update_dict[field]['error'] = msg_err
    else:
        # a. get saved pricerate_dict
        saved_pricerate_dict = {}
        priceratejson = getattr(instance, 'priceratejson')
        if priceratejson:
            saved_pricerate_dict = json.loads(priceratejson)

        # b. add or replace new_rate in pricerate_dict
        # TODO save pricerate with date and wagefactor
        new_pricerate_dict, is_update = set_pricerate_to_dict(saved_pricerate_dict, rosterdate, wagefactor, new_rate)
        #logger.debug('new_pricerate_dict ' + str(new_pricerate_dict))

        if is_update:
            # c. save new pricerate_dict
            new_pricerate_json = None
            if new_pricerate_dict:
                new_pricerate_json = json.dumps(new_pricerate_dict)  # dumps takes an object and produces a string:
                #logger.debug('new_pricerate_json ' + str(new_pricerate_json))
            setattr(instance, 'priceratejson', new_pricerate_json)
            is_updated = True

    return is_updated


def set_pricerate_to_dict(pricerate_dict, rosterdate, wagefactor, new_pricerate):
    # function gets rate from pricerate_dict PR2019-10-15
    # pricerate_dict = {'2019-10-15': {100: 2500, 150: 3000, 200: 3500}, '2020-01-01': {100: 2600, 150: 3200, 200: 3800}
    # key_startdate is the startdate of the new pricerate
    # from https://realpython.com/iterate-through-dictionary-python/

    #logger.debug('  ')
    #logger.debug(' -->>>- set_pricerate_to_dict --- ')
    #logger.debug('rosterdate: ' + str(rosterdate))
    #logger.debug('wagefactor: ' + str(wagefactor))
    #logger.debug('new_pricerate: ' + str(new_pricerate))

    is_update = False
    if rosterdate is None:
        rosterdate_key = '0'  # rosterdate is string '2019-10-16'
    else:
        rosterdate_key = rosterdate
    if wagefactor is None:
        wagefactor_key = '0'  # wagefactor as key is string, wagefactor as value  is integer
    else:
        wagefactor_key = str(wagefactor)
    # --- get rosterdate_dict from  pricerate_dict if it exists, if not: create new dict
    rosterdate_dict = {}
    if pricerate_dict:
        if rosterdate_key in pricerate_dict.keys():
            rosterdate_dict = pricerate_dict[rosterdate_key]
    else:
        pricerate_dict = {}

    #logger.debug('rosterdate_dict: ' + str(rosterdate_dict))
    #logger.debug('wagefactor_key: ' + str(wagefactor_key))

# --- add or replace key 'wagefactor_key' with value 'new_pricerate' to rosterdate_dict
    if wagefactor_key in rosterdate_dict.keys():
        old_pricerate = rosterdate_dict[wagefactor_key]
        #logger.debug('wagefactor_key: ' + str(wagefactor_key) + ' old_pricerate: ' + str(old_pricerate))
        #logger.debug('wagefactor_key: ' + str(wagefactor_key) + ' new_pricerate: ' + str(new_pricerate))

        if new_pricerate != old_pricerate:
            rosterdate_dict[wagefactor_key] = new_pricerate
            is_update = True
            #logger.debug('is_update: rosterdate_dict ' + str(rosterdate_dict))
    else:
        rosterdate_dict[wagefactor_key] = new_pricerate
        is_update = True
        #logger.debug('new rosterdate_dict: ' + str(rosterdate_dict))

# --- add or replace rosterdate_dict in pricerate_dict
    if rosterdate_dict:
        pricerate_dict[rosterdate_key] = rosterdate_dict
    #logger.debug('new pricerate_dict: ' + str(pricerate_dict))
    #logger.debug('new is_update: ' + str(is_update))

    return pricerate_dict, is_update

# -- end of save_pricerate_to_dict


def calc_amount_addition_tax_rounded(billing_duration, is_absence, is_restshift,
                             price_rate, addition_rate, tax_rate):  # PR2020-04-28 PR2020-07-04  PR2020-07-26
    #logger.debug(' ============= calc_amount_addition_tax_rounded ============= ')
    # when billable has changed billing_duration is changed outside this function
    # you must run this function after changing billing_duration PR2020-07-23
    amount, addition, tax = 0, 0, 0
    #logger.debug('price_rate: ' + str(price_rate))
    #logger.debug('is_absence: ' + str(is_absence))
    #logger.debug('is_restshift: ' + str(is_restshift))
    if price_rate and not is_absence and not is_restshift:
        #logger.debug('billing_duration: ' + str(billing_duration))
        #logger.debug('price_rate: ' + str(price_rate))
        #logger.debug('addition_rate: ' + str(addition_rate))
        #logger.debug('tax_rate: ' + str(tax_rate))
        if billing_duration:
            if addition_rate is None:
                addition_rate = 0
            if tax_rate is None:
                tax_rate = 0
            amount_not_rounded = (billing_duration / 60) * (price_rate)  # amount 10.000 = 100 US$
            # use math.floor instead of int(), to get correct results when amount is negative
            # math.floor() returns the largest integer less than or equal to a given number.
            # math.floor to convert negative numbers correct: -2 + .5 > -1.5 > 2
            # math.floor(2.5) = 2
            # math.floor(.5 + 2.49) = 2
            # math.floor(.5 + 2.5) = 3
            # math.floor(.5 - 2.5) = -2
            # math.floor(.5 - 2.49) = -2

            # TODO solve rounding headaches with decimal datatype
            #  PR2021-02-28 from https://realpython.com/python-rounding/
            # To change the precision, you call decimal.getcontext() and set the .prec attribute. I
            decimal.getcontext().prec = 2
            # Notice that decimal.ROUND_HALF_UP works just like our round_half_away_from_zero()
            decimal.getcontext().rounding = decimal.ROUND_HALF_UP

            """
            decimal.getcontext().rounding = decimal.ROUND_CEILING
            >>> Decimal("1.32").quantize(Decimal("1.0"))
            Decimal('1.4')
            
            >>> Decimal("-1.32").quantize(Decimal("1.0"))
            Decimal('-1.3')
            """
            amount = math.floor(0.5 + amount_not_rounded)  # This rounds to an integer

            addition_not_rounded = amount * (addition_rate / 10000)  # additionrate 10.000 = 1006%
            addition = math.floor(0.5 + addition_not_rounded)  # This rounds to an integer

            tax_not_rounded = (amount + addition) * (tax_rate / 10000)  # taxrate 600 = 6%
            tax = math.floor(0.5 + tax_not_rounded) # This rounds to an integer

    #logger.debug('amount: ' + str(amount))
    #logger.debug('addition: ' + str(addition))
    #logger.debug('tax: ' + str(tax))
    return amount, addition, tax


####################################
# NOT IN USE YET
def calc_wage_rounded(time_duration, is_restshift, nopay, wagerate, wagefactor):  #   PR2020-09-15
    #logger.debug(' ============= calc_amount_addition_tax_rounded ============= ')
    # when billable has changed billing_duration is changed outside this function
    # you must run this function after changing billing_duration PR2020-07-23
    # TODO make wagecode with items , like prcecode. Wage not in use yet
    wage = 0

    if not nopay and not is_restshift:
        if time_duration:
            if wagerate is None:
                wagerate = 0
            if wagefactor is None:
                wagefactor = 1000000
            # wagerate 10.000 = 100 US$
            # wagefactor 1.000.000 = 100 %
            wage_not_rounded = (time_duration / 60) * (wagerate / 100) * (wagefactor / 1000000)
            # use math.floor instead of int(), to get correct results when amount is negative
            # math.floor() returns the largest integer less than or equal to a given number.
            # math.floor to convert negative numbers correct: -2 + .5 > -1.5 > 2
            wage = math.floor(0.5 + wage_not_rounded)  # This rounds to an integer

    return wage


#######################################

def dictfetchall(cursor):
    # PR2019-10-25 from https://docs.djangoproject.com/en/2.1/topics/db/sql/#executing-custom-sql-directly
    # creates list of dicts from output cursor.execute instead of list of lists
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def dictfetchone(cursor):
    # Return one row from a cursor as a dict  PR2020-06-28
    return_dict = {}
    try:
        columns = [col[0] for col in cursor.description]
        return_dict = dict(zip(columns, cursor.fetchone()))
    except:
        pass
    return return_dict


def dictfetchrows(cursor):
    # PR2019-10-25 from https://docs.djangoproject.com/en/2.1/topics/db/sql/#executing-custom-sql-directly
    # creates dict from output cusror.execute instead of list
    # key is first column of row
    #starttime = timer()
    columns = [col[0] for col in cursor.description]
    return_dict = {}
    for row in cursor.fetchall():
        return_dict[row[0]] = dict(zip(columns, row))
    #elapsed_seconds = int(1000 * (timer() - starttime) ) /1000
    #elapsed_seconds = (timer() - starttime)
    #return_dict['elapsed_milliseconds'] = elapsed_seconds * 1000
    return return_dict


def system_updates():
    # these are once-only updates in tables. Data will be changed / moved after changing fields in tables
    # after uploading the new version the function can be removed

    # update_isabsence_istemplate()
    # update_workminutesperday()  # PR20202-06-21
    # update_company_workminutesperday() # PR20202-06-29
    # update_paydateitems PR2020-06-26
    # update_shiftcode_in_orderhours() PR2020-07-25
    # update_customercode_ordercode_in_orderhours() PR2020-07-25
    # update_employeecode_in_orderhours() PR2020-07-25
    # update_sysadmin_in_user()  # PR2020-07-30
    update_key_in_wagecode()  # PR2021-01-29
    update_sortby_in_orderhours()  # PR2021-03-02

def update_sortby_in_orderhours():
    # Once-only function to put emplhour.excelstart of all companies in orderhour.excelstart PR2021-03-02
    # this one takes too long - gives error 502 bad gateway
    # nginx error.log says: upstream prematurely closed connection while reading response header from upstream
    #empty_sortby_exist = m.Emplhour.objects.filter(orderhour__sortby__isnull=True).exists()
    #if empty_sortby_exist:
    #    emplhours = m.Emplhour.objects.filter(orderhour__sortby__isnull=True)
    #    for emplhour in emplhours:
    #        orderhour = emplhour.orderhour
    #        if(not orderhour.sortby):
    #            sort_by = calculate_sortby(emplhour.offsetstart, orderhour.isrestshift, orderhour.pk)
    #            orderhour.sortby = sort_by
    #            orderhour.save()

    sql_eh_sub = """
        SELECT eh.id AS eh_id, eh.orderhour_id, eh.offsetstart
            FROM companies_emplhour AS eh
        """
    sql_orderhour = """
        UPDATE companies_orderhour AS oh
        SET sortby = CONCAT( CASE WHEN oh.isrestshift THEN '0' ELSE '1' END, '_',
                CASE WHEN eh_sub.offsetstart IS NULL THEN '1440' 
                ELSE  RIGHT(CONCAT('0000', eh_sub.offsetstart::TEXT), 4) END, '_',
                RIGHT(CONCAT('000000', oh.id::TEXT), 6)                        
            )
        FROM (""" + sql_eh_sub + """) AS eh_sub
        WHERE oh.id = eh_sub.orderhour_id
        AND oh.sortby IS NULL
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_orderhour)


def calculate_sortby(offset_start, is_restshift, orderhour_pk):  # PR2021-03-02
    logger.debug(' ----- calculate_sortby -----')
# - calulate order_by.
    # orderby is istring with the following format:
    # exceldate : '0063730980' excel_start with leading zero
    offset_start_str = ('0000' + str(offset_start))[-4:] if offset_start is not None else '1440'
    is_restshift_str = '0' if is_restshift else '1'
    oh_id_str = ('000000' + str(orderhour_pk))[-6:]
    order_by = '_'.join((is_restshift_str, offset_start_str, oh_id_str))
    return order_by


def update_key_in_wagecode():
    # Once-only function to put value in 'key' in wagecode table, to replace 'iswagefactor etc PR2021-01-29
    #logger.debug('........update_sysadmin_in_user..........')

    with connection.cursor() as cursor:
        sql = "UPDATE companies_wagecode AS w SET key = 'wfc' WHERE w.iswagefactor AND key IS NULL"
        cursor.execute(sql)
        sql = "UPDATE companies_wagecode AS w SET key = 'fnc' WHERE w.isfunctioncode AND key IS NULL"
        cursor.execute(sql)
        sql = "UPDATE companies_wagecode AS w SET key = 'slc' WHERE w.iswagecode AND key IS NULL"
        cursor.execute(sql)
        sql = "UPDATE companies_wagecode AS w SET key = 'alw' WHERE w.isallowance AND key IS NULL"
        cursor.execute(sql)

def update_sysadmin_in_user():
    # Once-only function to add sysadmin permit to admin users PR2020-07-30
    #logger.debug('........update_sysadmin_in_user..........')

    sql_accounts_user = """
        UPDATE accounts_user AS au
        SET permits = au.permits + 64
        WHERE au.permits >= 32 AND au.permits < 64
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_accounts_user)
# NOT IN USE any more

#def update_employeecode_in_orderhours():
#    # Once-only function to put employee.code of all companies in orderhour PR2020-07-25
#    sql_employee_sub = """
#        SELECT e.id AS e_id, e.code AS e_code
#            FROM companies_employee AS e
#        """
#    sql_emplhour = """
#        UPDATE companies_emplhour AS eh
#        SET employeecode = e_sub.e_code
#        FROM (""" + sql_employee_sub + """) AS e_sub
#        WHERE eh.employee_id = e_sub.e_id
#    """
#    with connection.cursor() as cursor:
#        cursor.execute(sql_emplhour)#

#def update_customercode_ordercode_in_orderhours():
#    # Once-only function to put customer.code and order.code of all companies in orderhour PR2020-07-25
#    sql_order_sub = """
#        SELECT o.id AS o_id, o.code AS o_code, c.code AS c_code
#            FROM companies_order AS o
#            INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
#        """
#    sql_orderhour = """
#        UPDATE companies_orderhour AS oh
#        SET customercode = o_sub.c_code, ordercode = o_sub.o_code
#        FROM (""" + sql_order_sub + """) AS o_sub
#        WHERE oh.order_id = o_sub.o_id
#    """
#    with connection.cursor() as cursor:
#        cursor.execute(sql_orderhour)

#def update_shiftcode_in_orderhours():
#    # Once-only function to put shift.code of all companies in orderhour.shiftcode PR2020-07-25
#    sql_si_sub = """
#        SELECT si.id AS si_id, sh.code AS sh_code
##            FROM companies_schemeitem AS si
#            INNER JOIN companies_shift AS sh ON (sh.id = si.shift_id)
#        """
#    sql_orderhour = """
#        UPDATE companies_orderhour AS oh
#        SET shiftcode = si_sub.sh_code
#        FROM (""" + sql_si_sub + """) AS si_sub
#        WHERE oh.schemeitem_id = si_sub.si_id
#    """
#    with connection.cursor() as cursor:
#        cursor.execute(sql_orderhour)

# PR2020-06-26 not in use any more
#def update_paydateitems():
#    # function puts value of paydate in field datelast
#    with connection.cursor() as cursor:
#        cursor.execute("""UPDATE companies_paydateitem AS pdi SET datelast = pdi.paydate
#                            WHERE (pdi.datelast IS NULL) AND (pdi.paydate IS NOT NULL)
#                            """)

#def update_isabsence_istemplateXX():
    #    from django.db import connection
    #with connection.cursor() as cursor:
    #    cursor.execute('UPDATE companies_customer SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
    #    cursor.execute('UPDATE companies_order SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
    #    cursor.execute('UPDATE companies_scheme SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
    #    cursor.execute('UPDATE companies_team SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
    #    cursor.execute('UPDATE companies_teammember SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
    #    cursor.execute('UPDATE companies_emplhour SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')

    #    cursor.execute('UPDATE companies_customer SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
    #    cursor.execute('UPDATE companies_order SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
    #    cursor.execute('UPDATE companies_scheme SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
    #    cursor.execute('UPDATE companies_shift SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
    #    cursor.execute('UPDATE companies_team SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
    #    cursor.execute('UPDATE companies_teammember SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
#    cursor.execute('UPDATE companies_schemeitem SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')


#def update_company_workminutesperday(): # PR20202-06-29
    #    with connection.cursor() as cursor:
    #        cursor.execute("""UPDATE companies_company SET workminutesperday = 480
    #                            WHERE workminutesperday = 0 OR workminutesperday IS NULL
#                            """)


#def update_workminutesperday(): # PR20202-06-21
#    with connection.cursor() as cursor:
##        cursor.execute("""UPDATE companies_employee AS e SET
 #                           workminutesperday = CASE WHEN e.workhoursperweek = 0 OR e.workdays = 0
 #                                               THEN 0
 #                                               ELSE 1440 * e.workhoursperweek / e.workdays
    #                                               END
#
#                           """)

###############################################################
# FORMAT ELEMENTS
def format_date_element(rosterdate_dte, user_lang,
                        show_weekday=True, show_wd_long=False, show_day=True,
                        show_month=True, show_month_long=False, show_year=True):

    # PR2019-11-30
    display_txt, weekday_txt, day_txt, month_txt, year_txt = '', '', '', '', ''
    # get weekday text
    if rosterdate_dte:
        if show_weekday:
            if show_wd_long:
                weekday_txt = c.WEEKDAYS_LONG[user_lang][rosterdate_dte.isoweekday()]
            else:
                weekday_txt = c.WEEKDAYS_ABBREV[user_lang][rosterdate_dte.isoweekday()]
            if user_lang == 'en':
                weekday_txt += ','

        if show_day:
            day_txt = str(rosterdate_dte.day)
            if user_lang == 'en':
                if show_year:
                    day_txt += ','

        if show_month:
            if show_month_long:
                month_txt = c.MONTHS_LONG[user_lang][rosterdate_dte.month]
            else:
                month_txt = c.MONTHS_ABBREV[user_lang][rosterdate_dte.month]
        if show_year:
            year_txt = str(rosterdate_dte.year)
        if user_lang == 'en':
            display_txt = ' '.join([weekday_txt, month_txt, day_txt, year_txt])
        else:
            display_txt = ' '.join([weekday_txt, day_txt, month_txt, year_txt])

    return display_txt


def format_time_element(rosterdate_dte, offset, timeformat, user_lang,
                          show_weekday=True, blank_when_zero=True, skip_prefix_suffix=False):

    display_txt, title, weekday_txt, hour_txt, minutes_txt = '', '', '', '', ''

    hide_value = (offset is None) or (blank_when_zero and offset == 0)
    if not hide_value:
        # // floor division: Returns the integral part of the quotient.
        days_offset = offset // 1440 # - 90 (1.5 h)
        remainder = offset - days_offset * 1440
        curHours = remainder // 60
        curMinutes = remainder - curHours * 60

        isAmPm = (timeformat == 'AmPm')
        isEN = (user_lang == 'en')
        ampm_list = [' am', ' pm']
        curAmPm = 1 if (curHours >= 12) else 0

        # check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
        if isAmPm:
            if curHours >= 12:
                curHours -= 12
        else:
            if days_offset == 1 and curHours == 0 and curMinutes == 0:
                days_offset = 0
                curHours = 24

        hour_str = '00' + str(curHours)
        hour_text = hour_str[-2:]
        minute_str = '00' + str(curMinutes)
        minute_text = minute_str[-2:]

        if rosterdate_dte is not None:
            skip_prefix_suffix = True
        delim = ':' if isEN else '.'
        prefix = '<- ' if (not skip_prefix_suffix and days_offset < 0) else ''
        suffix = ' u' if (not isEN) else ''
        if isAmPm:
            suffix += ampm_list[curAmPm]
        if (not skip_prefix_suffix and days_offset > 0):
            suffix += ' ->'

# 3 get weekday
        if show_weekday and rosterdate_dte:
            offset_dte = rosterdate_dte + timedelta(days=days_offset)
            offset_weekday = offset_dte.isoweekday()
            if show_weekday:
                prefix = c.WEEKDAYS_ABBREV[user_lang][offset_weekday] + ' '

        display_txt = ''.join([prefix, hour_text, delim, minute_text, suffix])

    return display_txt

def format_time_range(timestart_local, timeend_local, timeformat, user_lang):
    # PR2020-01-26
    use24insteadof00 = True
    use_suffix = False
    timestart_txt, is24insteadof00 = format_HM_from_dt_local(timestart_local, use24insteadof00, use_suffix, timeformat, user_lang)
    timeend_txt, is24insteadof00 = format_HM_from_dt_local(timeend_local, use24insteadof00, use_suffix, timeformat, user_lang)
    display_txt = ' - '.join([timestart_txt, timeend_txt])

    return display_txt

def display_duration(value_int, user_lang, skip_prefix_suffix):
    #logger.debug(' ========= display_duration  ======== ')  # PR2020-01-24

    time_format = ''
    if value_int:
        minus_sign = ''
        if value_int < 0:
            value_int = value_int * -1
            minus_sign = '-'
        decimal_separator = ',' if user_lang == 'en' else '.'

        isEN = (user_lang == 'en')
        suffix = ' u' if (not skip_prefix_suffix and not isEN) else ''

        hours = value_int // 60  # // floor division: returns the integral part of the quotient.
        hour_text = str(hours)
        #if hours >= 1000000:
        #    pos = len(hour_text) - 6
        #    hour_text = dotcomma.join([hour_text[0 : pos], hour_text[pos:]])
        #if hours >= 1000:
        #    pos = len(hour_text) - 3
        #    hour_text = dotcomma.join([hour_text[0 : pos], hour_text[pos:]])

        minutes = value_int % 60  # % returns the decimal part (remainder) of the quotient.
        minute_str = "00" + str(minutes)
        minute_text = minute_str[-2:]

        return minus_sign + hour_text + decimal_separator + minute_text + suffix

    return time_format


def display_offset_time(offset, timeformat, user_lang, skip_prefix_suffix=False, is_offsetend=False, blank_when_zero=True):

    # PR2020-02-07
    display_txt = ''
    if not blank_when_zero or offset:
        # // 'floor division' rounds down to the nearest integer. -7 // 3 = -3
        days_offset = offset // 1440  # 22.30 u prev day: offset -90 -> days_offset -1
        remainder = offset - days_offset * 1440  # remainder = -90 - -1440 = 1350
        curHours = remainder // 60  # curHours = 1350 // 60 = 22
        curMinutes = remainder - curHours * 60  # curMinutes = 1350 - 1320 = 30

        isAmPm = (timeformat == 'AmPm')
        isEN = (user_lang == 'en')
        ampm_list = [' am', ' pm']
        curAmPm = 1 if (curHours >= 12) else 0

        # check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
        if isAmPm and is_offsetend:
            if curHours >= 12:
                curHours -= 12
        else:
            if days_offset == 1 and curHours == 0 and curMinutes == 0:
                days_offset = 0
                curHours = 24

        hour_str = '00' + str(curHours)
        hour_text = hour_str[-2:]
        minute_str = '00' + str(curMinutes)
        minute_text = minute_str[-2:]

        delim = ':' if isEN else '.'
        prefix = '<- ' if (not skip_prefix_suffix and days_offset < 0) else ''
        suffix = ' u' if (not skip_prefix_suffix and not isEN) else ''
        if isAmPm:
            suffix += ampm_list[curAmPm]
        if (days_offset > 0):
            suffix += ' ->'

        display_txt = prefix + hour_text + delim + minute_text + suffix
    return display_txt


def display_offset_range(offset_start, offset_end, timeformat, user_lang, skip_prefix_suffix=False):
    display_text = ''
    if offset_start is not None or offset_end is not None:
        # display_offset_time(offset, timeformat, user_lang, skip_prefix_suffix=False, is_offsetend=False, blank_when_zero=True)
        offsetstart_formatted = display_offset_time(offset_start, timeformat, user_lang, skip_prefix_suffix)
        offsetend_formatted = display_offset_time(offset_end, timeformat, user_lang, False, True,)

        display_text = ' - '.join((offsetstart_formatted, offsetend_formatted)).strip()

    return display_text

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# <<<<<<<<<< calc_timeduration_from_values >>>>>>>>>>>>>>>>>>> PR2020-01-04 PR2020-05-23
def calc_timeduration_from_values(is_restshift, offsetstart, offsetend, breakduration, saved_timeduration):

    timeduration = 0
    if not is_restshift:
        if not breakduration:
            breakduration = 0
        if not saved_timeduration:
            saved_timeduration = 0

        if offsetstart is not None and offsetend is not None:
            timeduration = offsetend - offsetstart - breakduration
        else:
            timeduration = saved_timeduration - breakduration

    return timeduration


# <<<<<<<<<< calc_timeduration_from_shift >>>>>>>>>>>>>>>>>>> PR2020-01-04
def calc_timeduration_from_shift(shift):
    #logger.debug(' ----- calc_timeduration_from_shift ----- ')
    # function calculates timeduration from values in shift
    # if both offsetstart and offsetend have value: timeduration is calculated
    # else: use stored value of timeduration
    # timeduration = 0 in restshift
    # timeduration = 0 in absence when weekend and not on weekends or ph and not on ph
    # timeduration_minus_break is used in field 'timeduration' in shift_dict
    # timeduration is used for minoffset and maxoffset

    is_restshift = False
    offsetstart = None
    offsetend = None
    breakduration = 0
    timeduration = 0
    timeduration_minus_break = 0

    if shift:
        offsetstart = getattr(shift, 'offsetstart')  # offsetstart can have value 'None'
        offsetend = getattr(shift, 'offsetend')  # offsetend can have value 'None'
        breakduration = getattr(shift, 'breakduration', 0)
        saved_timeduration = getattr(shift, 'timeduration', 0)
        is_restshift = getattr(shift, 'isrestshift', False)

        if not is_restshift:
            if offsetstart is not None and offsetend is not None:
                timeduration = offsetend - offsetstart
            else:
                timeduration = saved_timeduration
            timeduration_minus_break = timeduration - breakduration

    return is_restshift, offsetstart, offsetend, breakduration, timeduration_minus_break, timeduration

# <<<<<<<<<< calc_timedur_plandur_from_offset >>>>>>>>>>>>>>>>>>> PR2020-08-29
def calc_timedur_plandur_from_offset(rosterdate_dte, is_absence, is_restshift, is_billable, is_sat, is_sun, is_ph, is_ch,
        row_offsetstart, row_offsetend, row_breakduration, row_timeduration, row_plannedduration, update_plandur,
        row_nohours_onwd, row_nohours_onsat, row_nohours_onsun, row_nohours_onph,
        row_employee_pk, row_employee_wmpd, default_wmpd, comp_timezone):
    # called by:
    # note: billing_duration can get value of planned_duration,
    #       therefore it is possible that update_plandur = True, while returnvalue planned_duration is not used
    # - add_row_to_planning,        returnvalue planned_duration will be used, update_plandur = True
    # - add_orderhour_emplhour,     returnvalue planned_duration will be used, update_plandur = True
    # - make_absence_shift,         returnvalue planned_duration will NOT be used, update_plandur = True
    # - make_split_shift,           returnvalue planned_duration will NOT be used, update_plandur = True
    # - update_emplhour             returnvalue planned_duration will only be used, when added emplhour and is_extra_order=True, update_plandur = is_extra_order

    # this function:
    # - calculates timestart, timeend from shift offset and shift rosterdate
    # - calculates timeduration, only when both start- and endtime have value.
    # - and takes in account daylight saving time
    # - value of row_timeduration is used when offset_start or offset_end is null (shift '6:00 hours')
    logging_on = False
    if logging_on:
        logger.debug(' ----- calc_timedur_plandur_from_offset ----- ')
        logger.debug('is_absence: ' + str(is_absence))
        logger.debug('is_sat: ' + str(is_sat) + ' is_sun: ' + str(is_sun) + ' is_ph: ' + str(is_ph) + ' is_ch: ' + str(is_ch))
        logger.debug('row_nohours_onwd: ' + str(row_nohours_onwd) + 'row_nohours_onsat: ' + str(row_nohours_onsat) + ' row_nohours_onsun: ' + str(row_nohours_onsun) + ' row_nohours_onph: ' + str(row_nohours_onph) )
        logger.debug('row_offsetstart: ' + str(row_offsetstart) + ' row_offsetend: ' + str(row_offsetend))
        logger.debug(' row_breakduration: ' + str(row_breakduration) + ' row_timeduration: ' + str(row_timeduration))
        logger.debug(' row_plannedduration: ' + str(row_plannedduration) + ' update_plandur: ' + str(update_plandur))

        logger.debug('row_employee_pk: ' + str(row_employee_pk))
        logger.debug('row_employee_wmpd: ' + str(row_employee_wmpd))

    # function 'calc_timestart_time_end_from_offset' calculates fields 'timestart' 'timeend' and 'new_timeduration', based on rosterdate and offset
    # set duration 0 when restshift or no_hours_on saturday etc is done outside this function
    # takes daylight saving time in account
    timestart, timeend, new_timeduration = calc_timestart_time_end_from_offset(
        rosterdate_dte=rosterdate_dte,
        offsetstart=row_offsetstart,
        offsetend=row_offsetend,
        breakduration=row_breakduration,
        timeduration=row_timeduration,
        comp_timezone=comp_timezone
    )
    if logging_on:
        logger.debug('new_timeduration: ' + str(new_timeduration))
    # Note: when is_publicholiday or is_companyholiday rows with 'excl_ph' or 'excl_ch' are filtered out.
    #    Maybe these rows are still necessary TODO PR2020-08-14

    # PR2020-08-14 planned_duration are hours that are requested by clients
    # therefore:
    #  - planned_duration = 0 when absence or rest shift
    #  - planned_duration = 0 when is_saturday and nohoursonsaturday etc. (for now: nohours only apply on absence)
    # PR2020-08-06 debug:
    #  - planned_duration is NOT set to 0 when employee = None
    # PR2020-11-23 debug:
    #  - planned_duration only gets value when creating planning record or filling emphour.
    #  - row_plannedduration contains the value of emplhour.planned_duration
    #  - planned_duration is not changed when changing offsetstart / offsetend / breakduration / timedutaion.
    #  -   in these cases the returnvalue 'planned_duration' is not used
    is_weekday = not is_sat and not is_sun and not is_ph and not is_ch
    no_hours = (is_weekday and row_nohours_onwd) or \
               (is_sat and row_nohours_onsat) or \
               (is_sun and row_nohours_onsun) or \
               (is_ph and row_nohours_onph)

    if is_absence or is_restshift or no_hours:
        planned_duration = 0
    else:
        if update_plandur:
            planned_duration = new_timeduration
        else:
            planned_duration = row_plannedduration
    if logging_on:
        logger.debug('planned_duration: ' + str(planned_duration))

    # timeduration are the real hours made by employee, including absence hours, but no rest hours
    # therefore:
    #  -  time_duration gets also value when absence
    #       - when no time_duration given in absence shift, use workminutes per day from employee
    #       - when employee has no workminutes_per_day: sql takes company workminutes_per_day or default 480
    #       - workminutes_per_day (e_wmpd) is calculated in the employee_dict sql
    #  -  time_duration gets no value when rest shift
    # PR2020-07-24 request Guido:
    #  -  time_duration = 0 when employee is None. time_duration must be filled in when employee is filled in later
    #  -  nohoursonsaturday etc not (yet) in use for non-absence rows,
    #       but probably it will be necessary for employees that have paid shifts without worked time
    #       (i.e when they dont have to work on public holiday but still get paid)


# ony use employee_wmpd when absence, no time duration value
    time_duration = 0
    if is_restshift or no_hours or row_employee_pk is None :
        pass
    elif is_absence:
        if new_timeduration:
            time_duration = new_timeduration
        elif row_employee_wmpd:
            time_duration = row_employee_wmpd
        elif default_wmpd:
            time_duration = default_wmpd
    else:
        time_duration = new_timeduration

    if logging_on:
        logger.debug('is_absence: ' + str(is_absence))
        logger.debug('row_employee_wmpd: ' + str(row_employee_wmpd))
        logger.debug('time_duration: ' + str(time_duration))
        logger.debug('new_timeduration: ' + str(new_timeduration))

    # billingduration
    # - when 'is_billable': billingduration = timeduration (actual worked hours):
    #   - the billingduration must be set to 0 when employee is removed
    #   - the billingduration must be set to timeduration when employee is added
    #   - the billingduration must be updated timeduration changes
    # - when not billable:  billingduration = plannedduration (requested hours).
    #    - then billingduration does not change
    # - is_billable is always False when absence or restshift:
    billing_duration = 0
    if row_employee_pk:
        if is_billable:
            billing_duration = time_duration
        else:
            billing_duration = planned_duration

# - calculate excel_date, excel_start, excel_end
    row_offsetstart_nonull = row_offsetstart if row_offsetstart else 0
    # PR2021-02-21 debug. When offset_end is None: Gave excel_end same as excel_start, overlap didn't work,
    # value when None must be 1440 instead of 0
    # was: row_offsetend_nonull = row_offsetend if row_offsetend else 0
    row_offsetend_nonull = row_offsetend if row_offsetend else 1440
    excel_date = get_Exceldate_from_datetime(rosterdate_dte)
    excel_start = excel_date * 1440 + row_offsetstart_nonull
    excel_end = excel_date * 1440 + row_offsetend_nonull

    if logging_on:
        logger.debug('update_plandur: ' + str(update_plandur))
        logger.debug('is_billable: ' + str(is_billable))
        logger.debug('planned_duration: ' + str(planned_duration))
        logger.debug('time_duration: ' + str(time_duration))
        logger.debug('billing_duration: ' + str(billing_duration))
        logger.debug('excel_start: ' + str(excel_start))
        logger.debug('excel_end: ' + str(excel_end))

    return timestart, timeend, planned_duration, time_duration, billing_duration, no_hours, excel_date, excel_start, excel_end


# <<<<<<<<<< calc_timestart_time_end_from_offset >>>>>>>>>>>>>>>>>>> PR2019-12-10 PR2020-06-01
def calc_timestart_time_end_from_offset(rosterdate_dte, offsetstart, offsetend, breakduration, timeduration,
                                        comp_timezone):
    #logger.debug('------------------ calc_timestart_time_end_from_offset --------------------------')
    # function calculates fields 'timestart' 'timeend' and 'new_timeduration', based on rosterdate and offset
    # called by add_orderhour_emplhour, (also when rosterdate_has_changed, but this should not be possible)
    # takes daylight saving time in account
    # set duration 0 when restshift or no_hours_on saturday etc is done outside this function
    starttime_local = None
    endtime_local = None
    new_timeduration = 0

    # calculate field 'timestart' 'timeend', based on field rosterdate and offset, also when rosterdate_has_changed
    if rosterdate_dte:
# a. convert stored date_obj 'rosterdate' '2019-08-09' to datetime object 'rosterdatetime_naive'
        rosterdatetime_naive = get_datetime_naive_from_dateobject(rosterdate_dte)
        #logger.debug(' rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
        # rosterdate_dte: 2019-11-21 <class 'datetime.date'>
        #logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))
        # rosterdatetime_naive: 2019-11-21 00:00:00 <class 'datetime.datetime'>

# b. get starttime from rosterdate and offsetstart
        starttime_local = get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetstart,
            comp_timezone=comp_timezone)

# c. get endtime from rosterdate and offsetstart
        endtime_local = get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetend,
            comp_timezone=comp_timezone)

# d. recalculate timeduration, only when both starttime and endtime have value
        if starttime_local and endtime_local:
            datediff = endtime_local - starttime_local
            datediff_minutes = int((datediff.total_seconds() / 60))
            new_timeduration = int(datediff_minutes - breakduration)
        else:
            new_timeduration = timeduration

    return starttime_local, endtime_local, new_timeduration

def calc_datepart(offsetstart, offsetend):  # PR2020-03-23
    # e. calculate datepart, only when start- and enddate are filled in
    # avg is halfway offsetstart and offsetend
    #  when avg < 360: night,
    # when offsetstart or offsetend is blank: give it date_part = 0
    date_part = 0
    if offsetstart is not None and offsetend is not None:
        offset_avg = (offsetstart + offsetend) / 2
        if offset_avg < c.DATEPART01_NIGHTSHIFT_END:  # 360 end of night shift 6.00 u
            date_part = 1
        elif offset_avg < c.DATEPART02_MORNINGSHIFT_END:  # 720 end of morning shift 12.00 u
            date_part = 2
        elif offset_avg < c.DATEPART03_AFTERNOONSHIFT_END:  # 1080 end of afternoon shift 18.00 u
            date_part = 3
        else:  # evening shift'
            date_part = 4
    return date_part


def calc_datepart_from_datetimelocal(rosterdate, datetimestart_local, datetimeend_local):  # PR2020-04-09
    date_part = 0
    if rosterdate and datetimestart_local and datetimeend_local:
        offsetstart = get_offset_from_datetimelocal(rosterdate, datetimestart_local)
        offsetend = get_offset_from_datetimelocal(rosterdate, datetimeend_local)
        date_part = calc_datepart(offsetstart, offsetend)
    return date_part

# ++++++ calendar functions ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

def get_holiday_dict(datefirst_dte, datelast_dte, user_lang, request):  # PR20202-07-07
    #logger.debug(' --- get_holiday_dict ---')

    # PR2020-01-22 function creates dict with 'ispublicholiday', 'iscompanyholiday', 'display'
    # and is is added with key 'rosterdate' to holiday_dict
    # calendar_header only has value when exists in table Calendar
    # calendar_header: {'2019-12-26': {'ispublicholiday': True, 'display': 'Tweede Kerstdag'}}
    holiday_dict = {}

# first check if holdiays are filled in in the years of the date-range
    check_and_fill_calendar(datefirst_dte, datelast_dte, request)

    calendar_dates = m.Calendar.objects.filter(
            company=request.user.company,
            rosterdate__gte=datefirst_dte,
            rosterdate__lte=datelast_dte
            )
    for row in calendar_dates:
        header_dict = {}

        if row.ispublicholiday:
            header_dict['ispublicholiday'] = row.ispublicholiday
        if row.iscompanyholiday:
            header_dict['iscompanyholiday'] = row.iscompanyholiday

        if row.ispublicholiday and row.code:
            display_txt = _(row.code)
        else:
            display_txt = format_date_element(rosterdate_dte=row.rosterdate, user_lang=user_lang, show_year=False)
        header_dict['display'] = display_txt

        # was: rosterdate_iso = f.get_dateISO_from_dateOBJ(row.rosterdate)
        rosterdate_iso = row.rosterdate.isoformat()

        holiday_dict[rosterdate_iso] = header_dict

    return holiday_dict


def get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request):
    #logger.debug(' --- create_calendar_header ---')
    # PR2020-01-26 function returns 'ispublicholiday', 'iscompanyholiday' from Calendar
    # PR2020-06-22 is_saturday is_sunday added
    is_saturday = False
    is_sunday = False
    is_publicholiday = False
    is_companyholiday = False

    if rosterdate_dte:
        is_saturday = (rosterdate_dte.isoweekday() == 6)
        is_sunday = (rosterdate_dte.isoweekday() == 7)

        calendar_date = m.Calendar.objects.get_or_none(
                company=request.user.company,
                rosterdate=rosterdate_dte
                )
        if calendar_date:
            is_publicholiday = calendar_date.ispublicholiday
            is_companyholiday = calendar_date.iscompanyholiday

    return is_saturday, is_sunday, is_publicholiday, is_companyholiday


def check_and_fill_calendar(datefirst, datelast, request):  # PR2019-12-21
    # function checks if calendar dates of the years of this range exist, if not: add calendar dates
    #logger.debug('---  check_and_fill_calendar  ------- ')
    if request and datefirst and datelast:
        datefirst_year = datefirst.year
        datelast_year = datelast.year

# loop through years of period
        # TODO choose country
        country = 'cw'
        year = datefirst_year
        while year <= datelast_year:
            if not m.Calendar.objects.filter(year=year, company=request.user.company).exists():
                save_publicholidays(year, country, request)
            year += 1


def save_publicholidays(year, country, request):
    # function saves code with public hodiday name in calendar
    #logger.debug('save_publicholiday year: ' + str(year) + ' ' + str(type(year)))

    is_nl = (country == 'nl')
    is_cw = (country == 'cw')

    code = "New Year's Day"
    code_loc = _("New Year's Day")
    set_calendar_publicholidays(year, 1, 1, code, request)

    if is_cw:
        code = "Labour Day"
        code_loc = _("Labour Day")
        set_calendar_publicholidays(year, 5, 1, code, request)

    if is_nl:
        code = "Liberation Day"
        code_loc = _("Liberation Day")
        set_calendar_publicholidays(year, 5, 5, code, request)

    if is_cw:
        code = "Flag Day"
        code_loc = _("Flag Day")
        set_calendar_publicholidays(year, 7, 2, code, request)

    if is_cw:
        code = "Curaçao Day"
        code_loc = _("Curaçao Day")
        set_calendar_publicholidays(year, 10, 10, code, request)

    code = "Christmas Day"
    code_loc = _("Christmas Day")
    set_calendar_publicholidays(year, 12, 25, code, request)

    code = "2nd Christmas Day"
    code_loc = _("2nd Christmas Day")
    set_calendar_publicholidays(year, 12, 26, code, request)

    date_dict = {2020: (4, 27),
                 2021: (4, 27),
                 2022: (4, 27),
                 2023: (4, 27),
                 2024: (4, 27),
                 2025: (4, 26)}
    tpl = date_dict.get(year)
    if tpl:
        code = "Kings Day"
        code_loc = _("Kings Day")
        set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)

    if is_cw:
        date_dict = {2020: (2, 23),
                     2021: (2, 14),
                     2022: (2, 27),
                     2023: (2, 19),
                     2024: (2, 11),
                     2025: (3, 2)}
        tpl = date_dict.get(year)
        if tpl:
            code = "Carnaval"
            code_loc = _("Carnaval")
            set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)

        date_dict = {2020: (2, 24),
                     2021: (2, 15),
                     2022: (2, 28),
                     2023: (2, 20),
                     2024: (2, 12),
                     2025: (3, 3)}
        tpl = date_dict.get(year)
        if tpl:
            code = "2nd Carnaval Day"
            code_loc = _("2nd Carnaval Day")
            set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)

        date_dict = {2020: (4, 10),
                     2021: (4, 2),
                     2022: (4, 15),
                     2023: (4, 7),
                     2024: (3, 29),
                     2025: (4, 18)}
        tpl = date_dict.get(year)
        if tpl:
            code = "Good Friday"
            code_loc = _("Good Friday")
            set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)

    date_dict = {2020: (4, 12),
                 2021: (4, 4),
                 2022: (4, 17),
                 2023: (4, 9),
                 2024: (3, 31),
                 2025: (4, 20)}
    tpl = date_dict.get(year)
    if tpl:
        code = "Easter"
        code_loc = _("Easter")
        set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)

    date_dict = {2020: (4, 13),
                 2021: (4, 5),
                 2022: (4, 18),
                 2023: (4, 10),
                 2024: (4, 1),
                 2025: (4, 21)}
    tpl = date_dict.get(year)
    if tpl:
        if is_cw:
            code = "Harvest Festival"
            code_loc = _("Harvest Festival")
        else:
            code = "Easter Monday"
            code_loc = _("Easter Monday")
        set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)


    date_dict = {2020: (5, 21),
                 2021: (5, 13),
                 2022: (5, 26),
                 2023: (5, 18),
                 2024: (5, 9),
                 2025: (5, 29)}
    tpl = date_dict.get(year)
    if tpl:
        code = "Ascension Day"
        code_loc = _("Ascension Day")
        set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)

    date_dict = {2020: (5, 31),
                 2021: (5, 23),
                 2022: (6, 5),
                 2023: (5, 28),
                 2024: (5, 19),
                 2025: (6, 8)}
    tpl = date_dict.get(year)
    if tpl:
        code = "Pentecost"
        code_loc = _("Pentecost")
        set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)

    if is_nl:
        date_dict = {2020: (6, 1),
                     2021: (5, 24),
                     2022: (6, 6),
                     2023: (5, 29),
                     2024: (5, 20),
                     2025: (6, 9)}
        tpl = date_dict.get(year)
        if tpl:
            code = "2nd Pentecost Day"
            code_loc = _("2nd Pentecost Day")
            set_calendar_publicholidays(year, tpl[0], tpl[1], code, request)


def set_calendar_publicholidays(year, month, day, code, request):
    # PR2019-12-23 Function creates calendar_date and saves name of public Holiday (in English)
    if year and month and day:
        rosterdate = date(year, month, day)
        calendar_date = m.Calendar.objects.filter(
            rosterdate=rosterdate,
            company=request.user.company
        ).first()
        if calendar_date is None:
            calendar_date = m.Calendar(
                company=request.user.company,
                year=year,
                rosterdate=rosterdate
            )

        if calendar_date:
            calendar_date.code = code
            calendar_date.ispublicholiday = True
            calendar_date.save(request)


def get_code_with_sequence(table, parent, user_lang):
    #logger.debug(' --- get_code_with_sequence --- ')

    # create new code with sequence 1 higher than existing code PR2019-12-28
    # get scheme names of this order
    default_code = ''
    instances = None
    if table == 'scheme':
        default_code = c.SCHEME_TEXT[user_lang]
        instances = m.Scheme.objects.filter(order=parent, code__istartswith=default_code, istemplate=False)
    elif table == 'team':
        default_code = c.TEAM_TEXT[user_lang]
        instances = m.Team.objects.filter(scheme=parent, code__istartswith=default_code, istemplate=False)
    elif table == 'shift':
        default_code = c.SHIFT_TEXT[user_lang]
        instances = m.Shift.objects.filter(scheme=parent, code__istartswith=default_code, istemplate=False)

    new_code = default_code
    default_code_len = len(default_code)

    count = 0
    if table == 'team':
        max_index = 64
        for item in instances:
            count += 1
            index_str = item.code[default_code_len:].strip()
            if index_str:
                if len(index_str) == 1:
                    index = ord(index_str)
                    if 65 <= index < 90 or 97 <= index < 122:
                        if index > max_index:
                            max_index = index
        if count + 64 > max_index:
            max_index = count + 64
        new_code = default_code + ' ' + chr(max_index + 1)
    else:
        max_index = 0
        for item in instances:
            count += 1
            index_str = item.code[default_code_len:].strip()
            if index_str:
                is_number = False
                index = 0
                try:
                    index = int(index_str)
                    is_number = True
                except:
                    pass
                if is_number:
                    if index > max_index:
                        max_index = index
            else:
                max_index = 1

        new_code = default_code + ' ' + str(max_index + 1)
    return new_code


def create_emplhourdict_of_employee(datefirst_iso, datelast_iso, employee_pk, request):
    #logger.debug(' =============== create_emplhourdict_of_employee ============= ') # PR2020-05-13
    emplhour_dict = {}
    if datefirst_iso and datelast_iso and employee_pk:
        sql_emplhour = """ 
            SELECT eh.id
            FROM companies_emplhour AS eh 
            INNER JOIN companies_employee AS e ON (eh.employee_id = e.id)
            INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id) 
            INNER JOIN companies_order AS o ON (o.id = oh.order_id) 
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id)   
            WHERE c.company_id = %(compid)s
            AND (eh.employee_id = %(eid)s)
            AND (eh.rosterdate >= CAST(%(rdf)s AS DATE) AND eh.rosterdate <= CAST(%(rdl)s AS DATE))
            AND (eh.rosterdate IS NOT NULL)  
        """
        newcursor = connection.cursor()
        newcursor.execute(sql_emplhour, {
            'compid': request.user.company_id,
            'eid': employee_pk,
            'rdf': datefirst_iso,
            'rdl': datelast_iso
        })
        rows = newcursor.fetchall()
        for row in rows:
            emplhour_dict[row[0]] = {}
        return emplhour_dict


def check_emplhour_overlap(datefirst_iso, datelast_iso, employee_pk_list, request):
    logging_on = False
    if logging_on:
        logger.debug(' =============== check_emplhour_overlap ============= ')

    overlap_dict = {}
    if datefirst_iso and datelast_iso:
# - create 'extende range' -  add 1 day at beginning and end for overlapping shifts of previous and next day
        datefirst_dte = get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datefirst_minus_one_dtm = datefirst_dte + timedelta(days=-1)  # datefirst_dtm: 1899-12-31 <class 'datetime.date'>
        datefirst_minus_one_iso = datefirst_minus_one_dtm.isoformat()  # datefirst_iso: 1899-12-31 <class 'str'>
        # this is not necessary: rosterdate_minus_one = rosterdate_minus_one_iso.split('T')[0]  # datefirst_extended: 1899-12-31 <class 'str'>
        #logger.debug('datefirst_minusone: ' + str(datefirst_minus_one_iso) + ' ' + str(type(datefirst_minus_one_iso)))

        datelast_dte = get_date_from_ISO(datelast_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_plus_one_dtm = datelast_dte + timedelta(days=1)
        datelast_plus_one_iso = datelast_plus_one_dtm.isoformat()
        #logger.debug('datelast_plus_one_iso: ' + str(datelast_plus_one_iso) + ' ' + str(type(datelast_plus_one_iso)))
        #logger.debug('employee_pk: ' + str(employee_pk) + ' ' + str(type(employee_pk)))

        sql_keys = {
            'compid': request.user.company_id,
            'rdf': datefirst_minus_one_iso,
            'rdl': datelast_plus_one_iso
        }

        sql_list = ["SELECT eh.id AS eh_id, e.id AS e_id, eh.excelstart, eh.excelend, c.isabsence, oh.isrestshift",
            "FROM companies_emplhour AS eh",
            "INNER JOIN companies_employee AS e ON (eh.employee_id = e.id)",
            "INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id)",
            "INNER JOIN companies_order AS o ON (o.id = oh.order_id)",
            "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
            "WHERE c.company_id = %(compid)s::INT",
            "AND eh.rosterdate IS NOT NULL",
            "AND eh.rosterdate >= %(rdf)s::DATE AND eh.rosterdate <= %(rdl)s::DATE"]

        if employee_pk_list:
            sql_list.append('AND eh.employee_id IN ( SELECT UNNEST( %(eid_arr)s::INT[] ) )')
            sql_keys['eid_arr'] = employee_pk_list
        sql_list.append('ORDER BY eh.employee_id, eh.excelstart')

        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        rows = dictfetchall(newcursor)
# - group emplhour rows per employee
        list_dict = {}
        for row in rows:
            e_id = row.get('e_id')
            if e_id and e_id not in list_dict:
                list_dict[e_id] = []
            list_dict[e_id].append(row)
            """
            list_dict: {1: [{'eh_id': 503, 'e_id': 1, 'excelstart': 63719100, 'excelend': 63719220, 'isabsence': False, 'isrestshift': False}], 
                        8: [{'eh_id': 502, 'e_id': 8, 'excelstart': 63718560, 'excelend': 63720000, 'isabsence': False, 'isrestshift': True}, 
                            {'eh_id': 504, 'e_id': 8, 'excelstart': 63719400, 'excelend': 63719520, 'isabsence': False, 'isrestshift': False}]}
            """

        if logging_on:
            logger.debug('===================================== ')
            logger.debug('list_dict: ' + str(list_dict))
        if list_dict:

# - loop through employees
            for e_id, eh_list in list_dict.items():
                # only check employee overlap when employee has 2 or more emplhour rows
                list_len = len(eh_list)

                if logging_on:
                    logger.debug('--------------------------------------- ')
                    logger.debug('e_id: ' + str(e_id))
                    logger.debug('eh_list: ' + str(eh_list))

# - loop through emplhours of this employee
                # add each emplhour to dict, also the ones without overlap, to reset overlap if necessary
                for row_idx in range(0, list_len):
                    row = eh_list[row_idx]

            # - get row info
                    row_eh_id = row.get('eh_id')
            # check if row_eh_id already in overlap_dict, create if not found
                    if row_eh_id not in overlap_dict:
                        overlap_dict[row_eh_id] = {}
                    row_dict = overlap_dict[row_eh_id]

            # skip when employee has only 1 emplhour (has never overlap)
            # loop through emplhours, skip last emplhour of list
                    if list_len > 1 and row_idx < list_len - 1:
                        row_excstart = row.get('excelstart')
                        row_excend =  row.get('excelend')
                        row_isabsence =  row.get('isabsence')
                        row_isrestshift =  row.get('isrestshift')
                        if logging_on:
                            logger.debug( 'row_idx: ' + str(row_idx) + ' ...................................')
                            logger.debug('row: ' + str(row))

            # loop through next rows ,including the last one
                        for lookup_idx in range(row_idx + 1, list_len):
                            lookup = eh_list[lookup_idx]
                            lookup_eh_id = lookup.get('eh_id')

                    # check if lookup emplhour id already in overlap_dict, create if not found
                            if lookup_eh_id not in overlap_dict:
                                overlap_dict[lookup_eh_id] = {}
                            lookup_dict = overlap_dict[lookup_eh_id]

                            lookup_excstart = lookup.get('excelstart')
                            lookup_excend = lookup.get('excelend')
                            lookup_isabsence = lookup.get('isabsence')
                            lookup_isrestshift = lookup.get('isrestshift')

                    # check for overlap
                            # overlap_start means that the start of the lookup emplhour overlaps the end of the row emplhour
                            # overlap_end means that the end of the lookup emplhour overlaps the start of the row emplhour
                            overlap_start, overlap_end = check_shift_overlap_with_startend(
                                lookup_excstart, lookup_excend,
                                row_excstart, row_excend)

                            if logging_on:
                                logger.debug( 'lookup_idx: ' + str(lookup_idx) + ' ...................................')
                                logger.debug('     lookup: ' + str(lookup))
                                logger.debug('overlap_start: ' + str(overlap_start) + ' overlap_end: ' + str(overlap_end))

                            if overlap_start:
                                if 'start' not in lookup_dict:
                                    lookup_dict['start'] = []
                                lookup_dict['start'].append(row_eh_id)

                                if row_isabsence:
                                    lookup_dict['start_abs'] = True
                                elif row_isrestshift:
                                    lookup_dict['start_rest'] = True
                                else:
                                    lookup_dict['start_normal'] = True

                                if 'end' not in row_dict:
                                    row_dict['end'] = []
                                row_dict['end'].append(lookup_eh_id)

                                if lookup_isabsence:
                                    row_dict['end_abs'] = True
                                elif lookup_isrestshift:
                                    row_dict['end_rest'] = True
                                else:
                                    row_dict['end_normal'] = True

        # put lookup_eh_id in 'overlap_end' list of lookup_dict
                            if overlap_end :
                                if 'end' not in lookup_dict:
                                    lookup_dict['end'] = []
                                lookup_dict['end'].append(row_eh_id)

                                if row_isabsence:
                                    lookup_dict['sh_end_abs'] = True
                                elif row_isrestshift:
                                    lookup_dict['end_rest'] = True
                                else:
                                    lookup_dict['end_normal'] = True

                                if 'start' not in row_dict:
                                    row_dict['start'] = []
                                row_dict['start'].append(lookup_eh_id)

                                if lookup_isabsence:
                                    row_dict['start_abs'] = True
                                elif lookup_isrestshift:
                                    row_dict['start_rest'] = True
                                else:
                                    row_dict['start_normal'] = True

                            if logging_on:
                                logger.debug('row_dict: ' + str(row_dict))
                                logger.debug('lookup_dict: ' + str(lookup_dict))

    """
    overlap_dict: {502: {'end': [505, 504], 'end_normal': True, 'start': [505, 504], 'start_normal': True}, 
                   505: {'start': [502], 'start_rest': True, 'end': [502, 504], 'end_rest': True, 'end_normal': True}, 
                   504: {'start': [502, 505], 'start_rest': True, 'end': [502], 'end_rest': True, 'start_normal': True}}
    """

    if logging_on:
        logger.debug('overlap_dict' + str(overlap_dict))
    return overlap_dict


def get_allowed_employees_and_replacements(request):
    #logger.debug(' --- get_allowed_employees_and_replacements --- ')
    # - get list of employees and replacements of allowed customers / orders  PR2020-11-07
    # returns empty list when all employees are allowed

    sql_keys = {'compid': request.user.company.pk}
    sql_list = ["SELECT tm.employee_id, tm.replacement_id",
                "FROM companies_teammember AS tm",
                "INNER JOIN companies_team AS t ON (t.id = tm.team_id)",
                "INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id)",
                "INNER JOIN companies_order AS o ON (o.id = s.order_id)",
                "INNER JOIN companies_customer AS c ON (c.id = o.customer_id)",
                "WHERE c.company_id = %(compid)s"]

    permitcustomers_list = []
    if request.user.permitcustomers:
        for c_id in request.user.permitcustomers:
            permitcustomers_list.append(c_id)

    permitorders_list = []
    if request.user.permitorders:
        for o_id in request.user.permitorders:
            permitorders_list.append(o_id)

    allowed_employees_list = []
    if permitcustomers_list or permitorders_list:
        if permitcustomers_list and permitorders_list:
            sql_list.append('AND ( c.id IN ( SELECT UNNEST( %(cid_arr)s::INT[])) OR o.id IN ( SELECT UNNEST( %(oid_arr)s::INT[])) )')
            sql_keys['cid_arr'] = permitcustomers_list
            sql_keys['oid_arr'] = permitorders_list
        elif permitcustomers_list:
            sql_list.append('AND ( c.id IN ( SELECT UNNEST( %(cid_arr)s::INT[])) )')
            sql_keys['cid_arr'] = permitcustomers_list
        elif permitorders_list:
            sql_list.append('AND ( o.id IN ( SELECT UNNEST( %(oid_arr)s::INT[])) )')
            sql_keys['oid_arr'] = permitorders_list

        sql = ' '.join(sql_list)

        allowed_employees_list = []

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        for row in newcursor.fetchall():
            if row[0] and row[0] not in allowed_employees_list:
                allowed_employees_list.append(row[0])
            if row[1] and row[1] not in allowed_employees_list:
                allowed_employees_list.append(row[1])

    #logger.debug('permitcustomers_list: ' + str(permitcustomers_list))
    #logger.debug('permitorders_list: ' + str(permitorders_list))
    #logger.debug('allowed_employees_list: ' + str(allowed_employees_list))
    return allowed_employees_list
# --- end of get_allowed_employees_and_replacements ---
