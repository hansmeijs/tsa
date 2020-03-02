# PR2018-05-28
from datetime import date, time, datetime, timedelta
from django.db.models.functions import  Lower
from django.utils.translation import ugettext_lazy as _

from tsap.settings import TIME_ZONE
from tsap import constants as c
from companies import models as m

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

def get_dateobj_from_dateISOstring(date_ISOstring):  # PR2019-10-25
    dte = None
    if date_ISOstring:
        try:
            arr = get_datetimearray_from_dateISO(date_ISOstring)
            dte = date(int(arr[0]), int(arr[1]), int(arr[2]))
        except:
            logger.debug('ERROR: get_dateobj_from_dateISOstring: date_ISOstring' +
                         str(date_ISOstring) + ' ' + str(type(date_ISOstring)))
    return dte


def get_dateISO_from_dateOBJ(date_obj):  # PR2019-12-22
    date_iso = None
    if date_obj:
        try:
            year_str = str(date_obj.year)
            month_str = ('0' + str(date_obj.month))[-2:]
            date_str = ('0' + str(date_obj.day))[-2:]
            date_iso = '-'.join([year_str, month_str, date_str])
            # today_iso: 2019-11-17 <class 'str'>
        except:
            logger.debug('ERROR: get_dateISO_from_dateOBJ: date_obj' +
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
            logger.debug('ERROR: get_datetime_naive_from_ISOstring: date_ISOstring' +
                         str(date_ISOstring) + ' ' + str(type(date_ISOstring)))
    return datetime_naive


# Finally solved some headache:
# convert date object to datetime object
def get_datetime_naive_from_dateobject(date_obj):
    # Finally found the way to convert a date object to a datetime object PR2019-07-28
    # https://stackoverflow.com/questions/1937622/convert-date-to-datetime-in-python/1937636#1937636
    # time.min retrieves the minimum value representable by datetime and then get its time component.
    datetime_naive = None
    try:
        datetime_naive = datetime.combine(date_obj, time.min)
        #logger.debug('datetime_naive: ' + str(datetime_naive) + ' type: ' + str(type(datetime_naive)))
        # datetime_naive: 2019-07-27 00:00:00 type: <class 'datetime.datetime'>
    except:
        logger.debug('ERROR: get_datetime_naive_from_dateobject: date_ISOstring' +
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
            logger.debug('ERROR: get_datetime_naive_from_offset:' +
                            ' rosterdate' + str(rosterdate) + ' ' + str(type(rosterdate)) +
                            ' offset_int' + str(offset_int) + ' ' + str(type(offset_int)))

    return datetime_naive


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

    # c. get time differenece between dt_naive and add rosterdatetime_naive
        # from https://stackoverflow.com/questions/2119472/convert-a-timedelta-to-days-hours-and-minutes
        timedelta_diff = dt_naive - rosterdatetime_naive
        offset_int = timedelta_diff.days * 1440 + timedelta_diff.seconds // 60

        #logger.debug('timedelta_diff: ' + str(timedelta_diff) + ' ' + str(type(timedelta_diff)))
        # timedelta_diff: 1 day, 12:00:00 <class 'datetime.timedelta'>
        #logger.debug('offset_int: ' + str(offset_int) + ' ' + str(type(offset_int)))
        # offset_int: 990 <class 'int'>

    return offset_int


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
    # PR2020-01-23 function convert date_object to number, representing Excel date
    #logger.debug('date_obj: ' + str(date_obj) + ' type: ' + str(type(date_obj)))
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

    #logger.debug(' regex: ' + str(regex))
    arr = regex.split(datetime_ISOstring)
    #logger.debug(' arr: ' + str(arr))
    length = len(arr)

    while length < 5:
        arr.append('0')
        length += 1

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


def XXXXget_today_local_iso(request):  # PR2019-07-14
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


def get_firstof_month(date_obj):
    firstof_thismonth_dte = None
    if(date_obj):
        firstof_thismonth_dte = date_obj + timedelta(days=(1 - date_obj.day))
    return firstof_thismonth_dte


def get_lastof_month(date_obj):
    lastof_thismonth_dte = None
    if(date_obj):
        firstof_thismonth_dte = get_firstof_month(date_obj)
        firstof_nextmonth_dte = add_month_to_firstof_month(firstof_thismonth_dte, 1)
        lastof_thismonth_dte = firstof_nextmonth_dte - timedelta(days=1)
    return lastof_thismonth_dte


def add_days_to_date(date_obj, days_add_int):
    new_date = None
    if(date_obj):
        new_date = date_obj + timedelta(days=days_add_int)
    return new_date


def add_month_to_firstof_month(date_obj, month_add_int):
    # Note: this doesn't work with dates over 28 of the month, only use with first of the month PR2019-11-19
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

def get_date_from_ISO(date_string):  # PR2019-09-18
    #logger.debug('... get_date_from_ISO ...')
    #logger.debug('date_string: ' + str(date_string))
    dte = None
    if date_string:
        arr = date_string.split('-')
        dte = date(int(arr[0]), int(arr[1]), int(arr[2]))
    return dte


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
            logger.debug('ERROR: get_dateISO_from_string: ' + str(date_string) + ' new_dat_str: ' + str(new_dat_str))
    return new_dat_str


def detect_dateformat(dict_list, field):
    #logger.debug(' --- detect_dateformat ---')
    #logger.debug('field: ' + str(field) + ' ' + ' dict_list: ' + str(dict_list))
    # PR2019-08-05  detect date format
    format_str = ''
    date_string = ''
    try:
        arr00_max = 0
        arr01_max = 0
        arr02_max = 0
        for dict in dict_list:
            arr00 = 0
            arr01 = 0
            arr02 = 0

            date_string = dict.get(field)
            if date_string:
                arr = get_datetimearray_from_dateISO(date_string)

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

        #logger.debug('format_str: ' + str(format_str) + ' max00: ' + str(arr00_max) + ' max01: ' + str(arr01_max) + ' max02: ' + str(arr02_max))

    except:
        pass
        #logger.debug('detect_dateformat error: ' + str(date_string))

    return format_str

# NOT IN USE
def get_date_str_from_dateint(date_int):  # PR2019-03-08
    # Function calculates date from dat_int. Base_date is Dec 31, 1899 (Excel dates use this basedate)
    dte_str = ''
    if date_int:
        return_date = c.BASE_DATE + timedelta(days=date_int)
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



# ################### FORMAT FUNCTIONS ###################
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
        logger.debug('ERROR: datefirst_dte' + str(datefirst_dte) + ' ' + str(type(datefirst_dte)) +
                        ' datelast_dte' + str(datelast_dte) + ' ' + str(type(datelast_dte)))

    return display_text

def format_period_from_datetimelocal(periodstart_dtmlocal, periodend_dtmlocal, timeformat, user_lang):
    logger.debug(' --- format_period_from_datetimelocal --- ')
    logger.debug('periodstart_datetimelocal: ' + str(periodstart_dtmlocal) + ' ' + str(type(periodstart_dtmlocal)))
    logger.debug('periodend_datetimelocal: ' + str(periodend_dtmlocal)+ ' ' + str(type(periodend_dtmlocal)))

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

def get_status_value(status_sum, index):
    # PR2019-11-14 functions checks if index is in binary status_sum
    has_status_value = False
    if status_sum:
        # bin(512) = 0b1000000000
        # str(bin(512))[2:] = '1000000000'
        # ''.join(reversed(str(bin(512))[2:])) = '0000000001'
        try:
            binary_str = ''.join(reversed(str(bin(status_sum))[2:]))
            value_str = binary_str[index]
            has_status_value = (value_str == '1')
        except:
            pass
    return has_status_value


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
            #logger.debug('ERROR: timeend before timestart ')
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
            logger.debug('ERROR: timeend before timestart ')
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
            logger.debug('ERROR: timeend before timestart ')
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


def create_update_dict(field_list, table, pk, ppk, temp_pk, row_index):
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
            if temp_pk:
                update_dict['id']['temp_pk'] = temp_pk
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


def get_dict_value(dictionay, key_tuple, default_value=None):
    # PR2020-02-04 like in base.js Iterate through keylist till value found
    if key_tuple and dictionay:
        for key in key_tuple:
            if isinstance(dictionay, dict) and key in dictionay:
                dictionay = dictionay.get(key)
            else:
                dictionay = None
                break
    if dictionay is None and default_value is not None:
        dictionay = default_value
    return dictionay


def get_dict_valueOLD(dictionay, key_tuple, default_value=None):
    # PR2020-02-04 like in base.js Iterate through keylist till value found
    if key_tuple and dictionay:
        if isinstance(dictionay, dict):
            for key in key_tuple:
                if key in dictionay:
                    if isinstance(dictionay, dict):
                        dictionay = dictionay[key]
                    else:
                        dictionay = None
                        break
                else:
                    dictionay = None
                    break
        else:
            dictionay = None
    if dictionay is None and default_value is not None:
        dictionay = default_value
    return dictionay


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

    display_text = get_rate_display(pricerate, user_lang)
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


def get_billable_scheme(scheme):
    # PR2019-10-10
    # value 0 = no override, 1= override NotBillable, 2= override Billable

    field = 'billable'
    is_billable = False
    is_override = False

    if scheme:
        value = getattr(scheme, field, 0)
        is_override = (value > 0)
        if is_override:
            is_billable = (value == 2)
        else:
            value = getattr(scheme.order, field, 0)
            if value > 0: # is_override when value > 0
                is_billable = (value == 2)
            else:
                # get default company_billable, has no value 'is_override'
                value = getattr(scheme.order.customer.company, field, 0)
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


def get_billable_schemeitem(schemeitem):
    # PR2019-10-10
    # value 0 = no override, 1= override NotBillable, 2= override Billable
    field = 'billable'
    is_billable = False
    is_override = False
    if schemeitem:
        value = getattr(schemeitem, field, 0)
        is_override = (value > 0)
        if is_override:
            is_billable = (value == 2)  # means when (value == 1) then is_billable = False
        else:
            shift_override = False
            if schemeitem.shift:
                # restshift has always is_billable = False. Make sure that when restshift is_billable cannot be set to True
                value = getattr(schemeitem.shift, field, 0)
                shift_override = (value > 0)
                if shift_override:
                    is_billable = (value == 2)
            if not shift_override:
                if schemeitem.scheme:
                    value = getattr(schemeitem.scheme, field, 0)
                    if value > 0:  # is_override when value > 0
                        is_billable = (value == 2)
                    else:
                        if schemeitem.scheme.order:
                            value = getattr(schemeitem.scheme.order, field, 0)
                            if value > 0: # is_override when value > 0
                                is_billable = (value == 2)
                            else:
                                # get default company_billable, has no value 'is_override'
                                value = getattr(schemeitem.scheme.order.customer.company, field, 0)
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


def get_rate_display(value, user_lang):
    # PR2019-09-20 returns '35,25' or '35.25'
    display_value = ''
    if value is not None:
        dot_str = ',' if user_lang == 'nl' else '.'
        dollars =  int (value / 100)
        cents_str = '00' + str(value - dollars * 100)
        display_value = str(dollars) + dot_str + cents_str[-2:]
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


def save_pricerate_to_instance(instance, rosterdate, wagefactor, new_value, update_dict, field):
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

def dictfetchall(cursor):
    # PR2019-10-25 from https://docs.djangoproject.com/en/2.1/topics/db/sql/#executing-custom-sql-directly
    # creates dict from output cusror.execute instead of list
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def update_isabsence_istemplate():
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute('UPDATE companies_customer SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
        cursor.execute('UPDATE companies_order SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
        cursor.execute('UPDATE companies_scheme SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
        cursor.execute('UPDATE companies_team SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
        cursor.execute('UPDATE companies_teammember SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')
        cursor.execute('UPDATE companies_emplhour SET isabsence = TRUE WHERE isabsence = FALSE AND cat = 512')

        cursor.execute('UPDATE companies_customer SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
        cursor.execute('UPDATE companies_order SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
        cursor.execute('UPDATE companies_scheme SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
        cursor.execute('UPDATE companies_shift SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
        cursor.execute('UPDATE companies_team SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
        cursor.execute('UPDATE companies_teammember SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')
        cursor.execute('UPDATE companies_schemeitem SET istemplate = TRUE WHERE istemplate = FALSE AND cat = 4096')


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
            weekday_txt += ', ' if user_lang == 'en' else ' '

        if show_day:
            day_txt = str(rosterdate_dte.day)
            if user_lang == 'en':
                if show_year:
                    day_txt += ', '
            else:
                if show_month:
                    day_txt += ' '

        if show_month:
            if show_month_long:
                month_txt = c.MONTHS_LONG[user_lang][rosterdate_dte.month]
            else:
                month_txt = c.MONTHS_ABBREV[user_lang][rosterdate_dte.month]
            if user_lang == 'en' or year_txt:
                month_txt += ' '
        if show_year:
            year_txt = str(rosterdate_dte.year)
        if user_lang == 'en':
            display_txt = ''.join([weekday_txt, month_txt, day_txt, year_txt])
        else:
            display_txt = ''.join([weekday_txt, day_txt, month_txt, year_txt])

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


def display_offset_time(offset, timeformat, user_lang,
                        skip_prefix_suffix=False, is_offsetend=False, blank_when_zero=True):
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
        offsetstart_formatted = display_offset_time(offset_start, timeformat, user_lang, skip_prefix_suffix)
        offsetend_formatted = display_offset_time(offset_end, timeformat, user_lang, False, True,)

        display_text = ' - '.join((offsetstart_formatted, offsetend_formatted)).strip()

    return display_text

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

# <<<<<<<<<< calc_timeduration_from_shift >>>>>>>>>>>>>>>>>>> PR2020-01-04
def calc_timeduration_from_values(is_restshift, offsetstart, offsetend, breakduration, saved_timeduration):

    timeduration_minus_break = 0
    if not is_restshift:
        if not breakduration:
            breakduration = 0
        if not saved_timeduration:
            saved_timeduration = 0

        if offsetstart is not None and offsetend is not None:
            timeduration = offsetend - offsetstart
        else:
            timeduration = saved_timeduration
        timeduration_minus_break = timeduration - breakduration

    return timeduration_minus_break

# <<<<<<<<<< calc_timeduration_from_shift >>>>>>>>>>>>>>>>>>> PR2020-01-04
def calc_timeduration_from_schemitem(schemeitem):
    # function calculates timeduration from values in shift, if no shift: get from schemeitem
    # if both offsetstart and offsetend have value: timeduration is calculated
    # else: use stored value of timeduration
    # timeduration = 0 in restshift
    # timeduration_minus_break is used in field 'timeduration' in shift_dict
    # timeduration is used for minoffset and maxoffset

    is_restshift = False
    offsetstart = None
    offsetend = None
    breakduration = 0
    timeduration = 0
    timeduration_minus_break = 0

    if schemeitem:
        shift = schemeitem.shift
        if shift:
            is_restshift, offsetstart, offsetend, breakduration, \
            timeduration_minus_break, timeduration = calc_timeduration_from_shift(shift)
        else:
            is_restshift, offsetstart, offsetend, breakduration, \
            timeduration_minus_break, timeduration = calc_timeduration_from_shift(schemeitem)

    return is_restshift, offsetstart, offsetend, breakduration, timeduration_minus_break, timeduration


# <<<<<<<<<< calc_timeduration_from_shift >>>>>>>>>>>>>>>>>>> PR2020-01-04
def calc_timeduration_from_shift(shift):
    # function calculates timeduration from values in shift
    # if both offsetstart and offsetend have value: timeduration is calculated
    # else: use stored value of timeduration
    # timeduration = 0 in restshift
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


# <<<<<<<<<< calc_timestart_time_end_from_offset >>>>>>>>>>>>>>>>>>> PR2019-12-10
def calc_timestart_time_end_from_offset(rosterdate_dte,
                                        offsetstart, offsetend, breakduration, timeduration,
                                        is_restshift, comp_timezone):
    #logger.debug('------------------ calc_timestart_time_end_from_offset --------------------------')
    # called by add_orderhour_emplhour

    starttime_local = None
    endtime_local = None

    # calculate field 'timestart' 'timeend', based on field rosterdate and offset, also when rosterdate_has_changed
    if rosterdate_dte:
    # a. convert stored date_obj 'rosterdate' '2019-08-09' to datetime object 'rosterdatetime_naive'
        rosterdatetime_naive = get_datetime_naive_from_dateobject(rosterdate_dte)
        #logger.debug(' schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))
        # schemeitem.rosterdate: 2019-11-21 <class 'datetime.date'>
        #logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))
        # rosterdatetime_naive: 2019-11-21 00:00:00 <class 'datetime.datetime'>

    # b. get starttime from rosterdate and offsetstart
        starttime_local = get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetstart,
            comp_timezone=comp_timezone)
        #logger.debug(' starttime_local: ' + str(starttime_local) + ' ' + str(type(starttime_local)))

    # c. get endtime from rosterdate and offsetstart
        #logger.debug('c. get endtime from rosterdate and offsetstart ')
        endtime_local = get_datetimelocal_from_offset(
            rosterdate=rosterdatetime_naive,
            offset_int=offsetend,
            comp_timezone=comp_timezone)
        #logger.debug(' endtime_local: ' + str(endtime_local) + ' ' + str(type(endtime_local)))

    # d. recalculate timeduration, only when both starttime and endtime have value
        if starttime_local and endtime_local:
            datediff = endtime_local - starttime_local
            datediff_minutes = int((datediff.total_seconds() / 60))
            timeduration = int(datediff_minutes - breakduration)
            logger.debug('new  timeduration:  ' + str(timeduration))
            # when rest shift : timeduration = 0
            if is_restshift:
                timeduration = 0
            #logger.debug('is_restshift  timeduration:  ' + str(timeduration))
    return starttime_local, endtime_local, timeduration


# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

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
