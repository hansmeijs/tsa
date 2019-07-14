
    // add csrftoken to ajax header to prevent error 403 Forbidden PR2018-12-03
    // from https://docs.djangoproject.com/en/dev/ref/csrf/#ajax
    const csrftoken = Cookies.get('csrftoken');
    const cls_active = "active";

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    // PR2018-12-02 from: https://github.com/js-cookie/js-cookie/tree/latest#readme
    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }


//========= SetMenubuttonActive  ====================================
    function SetMenubuttonActive(btn_clicked) {
        "use strict";
        // PR2019-03-03 function highlights clicked menubutton

// ---  get clicked button
        if(!!btn_clicked) {
            let menubar = btn_clicked.parentNode

// ---  remove class 'active' from all buttons in this menubar
            let menubuttons = menubar.children;
            for (let i = 0, len = menubuttons.length; i < len; i++) {
              menubuttons[i].classList.remove (cls_active);
            }

// ---  add class 'active' to clicked buttons
           btn_clicked.classList.add (cls_active);
        }; //if(!!e.target)
    }; //function SetMenubuttonActive()

//========= isEmpty  ============= PR2019-05-11
    //PR2019-05-05 from https://coderwall.com/p/_g3x9q/how-to-check-if-javascript-object-is-empty'
    function isEmpty(obj) {
        "use strict";
        for(var key in obj) {
            if(obj.hasOwnProperty(key))
                {return false}
        }
    return true;
}

//========= get_attr_from_element  =============PR2019-06-07
    function get_attr_from_element(element, key, default_value){
        "use strict";
    // ---  get attr value from key: i.e. element["name"] = "breakduration"
        let value;
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value = element.getAttribute(key);
            };
        }
        if (!value && !!default_value){
            value = default_value
        }
        return value;
    };

//========= get_attr_from_element_str  ============= PR2019-06-07
    function get_attr_from_element_str(element, key){
        "use strict";
        let value_str = "";
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value_str = element.getAttribute(key);
            };
        }
        return value_str;
    };

//========= get_attr_from_element_int  ============= PR2019-06-07
    function get_attr_from_element_int(element, key){
        "use strict";
        let value_int = 0;
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value_int = parseInt(element.getAttribute(key))
            };
        }
        return value_int;
    };

//========= get_attr_from_element_dict  ============= PR2019-06-13
    function get_attr_from_element_dict(element, key){
        "use strict";
        let value_dict = {};
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                const atr = element.getAttribute(key)
                if(!!atr) {
                    value_dict = JSON.parse(atr)
                }
            };
        }
        return value_dict;
    };

//========= get_arrayRow_by_keyValue  ====================================
    function get_arrayRow_by_keyValue (objArray, arrKey, keyValue) {
        "use strict";
        // Function returns row of array that contains Value in objKey PR2019-01-05
        // stored_columns[3]: {awpCol: "lastname", caption: "Last name", excCol: "ANAAM" }
        // excel_columns[0]:    {excCol: "ANAAM", awpCol: "lastname", awpCaption: "Achternaam"}

        // used by select scheme PR2019-05-24
        let row;
        if (!!arrKey && !!keyValue){
            for (let i = 0 ; i < objArray.length; i++) {
                let obj = objArray[i];
                if (!!obj && !!obj[arrKey] ){
                    let isEqual = false;
                    let obj_value = obj[arrKey]
                    if (typeof(keyValue) === "string" && typeof(obj_value) === "string"){
                        isEqual = (keyValue.toLowerCase() === obj_value.toLowerCase())
                    } else {
                        isEqual = (keyValue === obj_value)
                    }
                    if (isEqual){
                        row = obj;
                        break;
        }}}}
        return row;
    }

//========= get_listitem_by_subkeyValue  ===== PR2018-06-01
    function get_listitem_by_subkeyValue (objArray, arrKey, arrSubKey, keyValue) {
        "use strict";
        // gets item with value 'abdul' from 0: {code: {value: "Abdul"}, id: {pk: 248, parent_pk: 2}, pk: 248 }
        let item;
        if (!!arrKey && !!arrSubKey && !!keyValue){
            for (let i = 0 ; i < objArray.length; i++) {
                let dict = objArray[i];
                if (!!dict && !!dict[arrKey] ){
                    let subdict = dict[arrKey]
                    if (arrSubKey in subdict){
                        let isEqual = false;
                        let value = subdict[arrSubKey]
                        if (typeof(keyValue) === "string" && typeof(obj_value) === "string"){
                            isEqual = (keyValue.toLowerCase() === value.toLowerCase())
                        } else {
                            isEqual = (keyValue === value)
                        }
                        if (isEqual){
                            item = dict;
                            break;
                        }
                    }
                }
            }
        }
        return item;
    }
//========= get_today_local  ======== PR2019-07-09
    function get_today_local(comp_timezone) {
        // from: https://stackoverflow.com/questions/18448347/how-to-create-time-in-a-specific-time-zone-with-moment-js

        //  moment() gives 'now' in user timezone : 2019-07-09 T 20:25:16-04:00
        // this creates today in comp_timezone
        // new moment.tz(ISOstring, timezone)
        return new moment.tz([moment().year(), moment().month(), moment().date(), 0, 0, 0], comp_timezone);
    }

//=========  get_newdate_from_date  ================ PR2019-05-06
    function get_newdate_from_date(o_date, add_day, add_month, add_year) {
        "use strict";
        // console.log("===  function get_newdate_from_date =========");
        // console.log("o_date", o_date , typeof o_date)
        // console.log("add_day", add_day , "add_month", add_month, "add_year", add_year, )

        let o_date_iso = o_date.toISOString();
        // console.log("o_date_iso", o_date_iso , typeof o_date_iso)

        if (!add_day){add_day = 0}
        if (!add_month){add_month = 0}
        if (!add_year){add_year = 0}

        let arr = get_array_from_ISOstring(o_date_iso)

        // in array: month is index
        arr[1] =  arr[1] -1;

        if(!!o_date && !!add_day){
            arr[2] = arr[2] + add_day
         } else if (!!o_date && !!add_month){
            arr[1] =arr[1] + add_month
        } else if (!!o_date && !!add_year){
            arr[0] = arr[0] + add_year
        } else {
            let today  = new Date();
            arr[0] = today.getFullYear();
            arr[1] = today.getMonth();
            arr[2] = today.getDate();
        }

        // add midday
        let n_date = new Date(Date.UTC(arr[0], arr[1], arr[2], 12, 0, 0));

        // console.log("n_date", n_date , typeof n_date)

        return n_date
    }

//========= function get_weekday_from_ISOstring  ==================================== PR2019-04-15
    function get_weekday_from_ISOstring(date_as_ISOstring) {
        "use strict";
        // date_as_ISOstring = "2019-03-30T19:05:00"
        let date = get_date_from_ISOstring(date_as_ISOstring);
        let weekday_index = date.getUTCDay();
        return weekday_index
    }


//========= function get_date_from_ISOstring  ==================================== PR2019-04-15
    function get_date_from_ISOstring(date_as_ISOstring) {
        "use strict";
        // date_as_ISOstring: 2019-06-25T07:00:00Z

        let arr_int = get_array_from_ISOstring(date_as_ISOstring);

        // Month 4 april has index 3
        arr_int[1] = arr_int[1] -1;

        // datetime_utc: Tue Jun 25 2019 03:00:00 GMT-0400 (Bolivia Time)
        let datetime_utc =  new Date(Date.UTC(arr_int[0], arr_int[1], arr_int[2], arr_int[3], arr_int[4], arr_int[5]));
        return datetime_utc

    } // function get_date_from_ISOstring


//========= function get_array_from_ISOstring  ==================================== PR2019-04-15
    function get_array_from_ISOstring(datetime_iso) {
        "use strict";
        // datetime_aware_iso = "2019-03-30T04:00:00-04:00"
        // split string into array  ["2019", "03", "30", "19", "05", "00"]
        // regez \d+ - matches one or more numeric digits
        let arr = datetime_iso.split(/\D+/);
        let arr_int = [];

        // convert strings to integer
        for (let i = 0; i < 6; i++) {
            arr_int[i] = parseInt(arr[i]);
            if (!arr_int[i]){ arr_int[i] = 0};
        }

        return arr_int;

    } // function get_array_from_ISOstring


//========= function get_yyyymmdd_from_ISOstring  ========== PR2019-06-21
    function get_yyyymmdd_from_ISOstring(datetime_iso) {
        "use strict";
        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let date_str = "";
        if (!!datetime_iso){
            if (datetime_iso.indexOf("T") > -1){
                let arr = datetime_iso.split("T");
                if(!!arr[0]){date_str = arr[0]}
        }}
        return date_str;
    }


//========= function get_datetimearrLOCAL_from_UTCiso  ========== PR2019-06-29
    function get_datetimearrLOCAL_from_UTCiso(datetimeUTCiso, companyoffset, useroffset) {
        "use strict";
        // console.log("--------- get_datetimearrLOCAL_from_UTCiso -------------")
        // this function converts array from local time displayed on screen to utc time in iso-format stored in database
        const offset = companyoffset

        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let datetimearr = [];
        if (!!datetimeUTCiso){

            // console.log("datetimeUTCiso: ", datetimeUTCiso)
            let datUTC = get_date_from_ISOstring(datetimeUTCiso)
            // console.log("datUTC: ", datUTC, typeof datUTC)

            let arr = get_array_from_ISOstring(datetimeUTCiso)
            // Month 4 april has index 3
            arr[1] = arr[1] -1;

            // datetime_local is date as shown on screen: Tue Jun 25 2019  11:39
            const datetime_local = new Date(arr[0], arr[1], arr[2], arr[3], arr[4]);
            // datetime_local:  Tue Jun 25 2019 11:39:00 GMT-0400 (Bolivia Time) object
            // console.log("datetime_local: ", datetime_local, typeof datetime_local)

            // console.log("companyoffset: ", companyoffset)
            // console.log("useroffset: ", useroffset)

            // datetime_offset  is the timestamp with correction for local timezone (-4 u) and company timezone (+2 u)
            //companyoffset stores offset from UTC to company_timezone in seconds
            const datetime_offset = datetime_local.setSeconds(offset)
            // datetime_offset:  1561455540000 number
            // console.log("datetime_offset: ", datetime_offset, typeof datetime_offset)

            const datetime_new = new Date(datetime_offset);
            //  datetime_new:  Tue Jun 25 2019 05:39:00 GMT-0400 (Bolivia Time) object
            // console.log("datetime_new: ", datetime_new, typeof datetime_new)
            datetimearr[0] = datetime_new.getFullYear()
            datetimearr[1]  = datetime_new.getMonth()
            datetimearr[2] = datetime_new.getDate()
            datetimearr[3]  = datetime_new.getHours()
            datetimearr[4]  = datetime_new.getMinutes()

            // console.log(datetimearr[0], datetimearr[1], datetimearr[2], datetimearr[3], datetimearr[4])

        }
        return datetimearr ;
    }




//========= function get_datetime_iso_from_ints  ========== PR2019-06-28
    function get_datetime_iso_from_ints(year, month_index, day_int, hours, minutes, companyoffset, useroffset) {
        "use strict";
        console.log("--------- get_datetime_iso_from_ints -------------")
        // this function converts array from local time displayed on screen to utc time in iso-format stored in database
        const offset = -companyoffset - useroffset

        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let new_datetime_iso = "";
        if (!!year){
            // datetime_local is date as shown on screen: Tue Jun 25 2019  11:39
            const datetime_local = new Date(year, month_index, day_int, hours, minutes);
            // datetime_local:  Tue Jun 25 2019 11:39:00 GMT-0400 (Bolivia Time) object
            console.log("datetime_local: ", datetime_local, typeof datetime_local)

            // datetime_offset  is the timestamp with correction for local timezone (-4 u) and company timezone (+2 u)
            //companyoffset stores offset from UTC to company_timezone in seconds
            const datetime_offset = datetime_local.setSeconds(offset)
            // datetime_offset:  1561455540000 number
            console.log("datetime_offset: ", datetime_offset, typeof datetime_offset)

            const datetime_new = new Date(datetime_offset);
            //  datetime_new:  Tue Jun 25 2019 05:39:00 GMT-0400 (Bolivia Time) object
            console.log("datetime_new: ", datetime_new, typeof datetime_new)

            new_datetime_iso = datetime_new.toISOString()
            // new_datetime_iso:  2019-06-25T09:39:00.000Z string
            console.log(">--> new_datetime_iso", new_datetime_iso, typeof new_datetime_iso)

        }
        return new_datetime_iso;
    }

//========= format_datelong_from_datetimelocal  ========== PR2019-06-27
    function format_datelong_from_datetimelocal(datetime_local) {
        // PR2019-07-01 was:
            //const this_date = datetime_local.date();   //Sunday = 0
            //const this_month_index = 1 + datetime_local.month();   //January = 0
            //const this_month = month_list[this_month_index];
            //const this_year = datetime_local.year();   //January = 0
            //const weekday_index = datetime_local.day();   //Sunday = 0
            //const weekday = weekday_list[weekday_index];
        "use strict";
        let date_str = "";
        //  moment.locale(user_lang) is set at beginning of script, applies to all moment objjects in this page
        if (!!datetime_local){
            if(moment.locale() === "en") {
                //date_str = weekday + " " + this_month + " " + this_date + ", " + this_year
                date_str = datetime_local.format("dddd, MMMM D, YYYY")
            } else {
                //date_str = weekday + " " + this_date + " " + this_month + " " + this_year
                date_str = datetime_local.format("dddd D MMMM YYYY")
            }
        }
        return date_str;
    }
//========= format_datemedium_from_datetimelocal  ========== PR2019-07-09
    function format_datemedium(dtl, weekday_list, month_list, skip_weekday, skip_year) {
        "use strict";
        console.log(" -- format_datemedium  -- ")
        //console.log(dtl.format())
        //console.log(moment.locale())
        //console.log(dtl.year())
        //console.log(dtl.date())
        console.log("dtl.day: ", dtl.day())
        console.log(weekday_list[dtl.day()])
        //console.log( month_list[dtl.month() + 1])

        // According to ISO 8601, Sunday is the 7th day of the week
        let weekday_index = dtl.day()
        if(!weekday_index){weekday_index = 7};
        console.log("weekday_index: ", weekday_index)
        console.log(weekday_list[dtl.day()])

        let date_str = "";
        //  moment.locale(user_lang) is set at beginning of script, applies to all moment objjects in this page
        let comma_space = " "
        if(moment.locale() === "en") { comma_space = ", "}
        if (!!dtl){
            if(!skip_weekday){date_str = weekday_list[weekday_index] + comma_space }
            if(moment.locale() === "en") {
                date_str = date_str + month_list[dtl.month() + 1] + " " + dtl.date()
            } else {
                date_str = date_str + dtl.date() + " " + month_list[dtl.month() + 1]
            }
            if(!skip_year){date_str = date_str + comma_space + dtl.year() }
        }

        return date_str;
    }

  //========= format_period_from_datetimelocal  ========== PR2019-07-09
    function format_period_from_datetimelocal(periodstart_local, periodend_local, weekday_list, month_list, timeformat) {
        "use strict";
        console.log(" -- format_period_from_datetimelocal  -- ")
        console.log("periodstart_local", periodstart_local.format())
        console.log("periodend_local", periodend_local.format())
        periodstart_local, periodend_local

        // from https://momentjs.com/guides/
        let startdate = periodstart_local.clone().startOf("day");
        let enddate = periodend_local.clone().startOf("day");

        const enddate_isMidnight = (enddate.diff(periodend_local) === 0);

        //console.log("startdate diff", startdate.diff(periodstart_local))
        // when periodend_local is midnight: make enddate one day earlier (period from 02:00 - 00:00 is still same day)
        if (enddate_isMidnight) {
            // add / subtract day from datetime_local
            enddate.add(-1, 'day')
            console.log("enddate corrected", enddate.format())
        }

        const datestart_formatted = format_datemedium(startdate, weekday_list, month_list, false, true)
        const dateend_formatted = format_datemedium(enddate, weekday_list, month_list, false, true)
        const timestart_formatted = format_time(periodstart_local, timeformat, false )
        const timeend_formatted = format_time(periodend_local, timeformat, enddate_isMidnight ) // enddate_isMidnight: display 00.00 as prev day 24.00 u

        let period_str = format_datemedium(periodstart_local, weekday_list, month_list, false, false);
        const same_day = (startdate.diff(enddate) === 0)
        if(same_day){
            period_str = datestart_formatted + ", " + timestart_formatted + " - " + timeend_formatted
        } else {
            period_str = datestart_formatted + " " + timestart_formatted +  " - " + dateend_formatted + " " + timeend_formatted
        }

        //console.log("period_str: ", period_str)
        return period_str;
    }

// format time
//========= function new  ========== PR2019-06-27
    function format_time(datetime_local, timeformat, display24) {
        "use strict";
        let time_formatted;

        let isAmPm = false
        if (timeformat === "AmPm"){isAmPm = true};

        let isEN = false
        if (moment.locale() === "en"){isEN = true};

        let hour_str = "", ampm_str = "", delim = "";
        const minute_str = datetime_local.format("mm")

        if(isAmPm){
            hour_str =  datetime_local.format("hh")
            ampm_str = " " + datetime_local.format("a")
            delim = ":"
        } else {
            if (datetime_local.hour() === 0 && display24) {
                hour_str = "24"
            } else {
                hour_str =  datetime_local.format("HH")
            }
            delim = "."
            if(!isEN){ ampm_str = " u"}
        }

        time_formatted = hour_str + delim + minute_str + ampm_str

        return time_formatted
    }

//========= function new  ========== PR2019-06-27
    function get_userOffset() {
    // get_userOffset calculates offset from local computer timezone to UTC in seconds

        // new Date gives now in local time:  Thu Jun 20 2019 07:42:39 GMT-0400 (Bolivia Time) type: object
        const now_datetime_local = new Date;
        // date.getTimezoneOffset() returns the time difference UTC and local time, in minutes.
        // If your time zone is GMT+5, -300 (60*5) minutes will be returned. Daylight savings prevent this value from being a constant.
        const userOffset = now_datetime_local.getTimezoneOffset()

        return userOffset * 60

}





//========= function value_has_changed  ==== PR2019-06-08
    function value_has_changed(value,o_value ) {
        let has_changed = false;
        if (!!value){
            if (!!o_value) {
                has_changed = (value !== o_value);
            } else {
                has_changed = true}
        } else {
            has_changed = (!!o_value)};
        return has_changed
    }