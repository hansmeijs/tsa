
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

$(function() {
    "use strict";

    $("#id_sidebar").mCustomScrollbar({
         theme: "minimal"
    });

    $('#sidebarCollapse').on('click', function () {
        // open or close navbar
        $('#id_sidebar').toggleClass('active');
        // close dropdowns
        $('.collapse.in').toggleClass('in');
        // and also adjust aria-expanded attributes we use for the open/closed arrows
        // in our CSS
        $('a[aria-expanded=true]').attr('aria-expanded', 'false');
    });

        document.getElementById("id_hdr_comp").addEventListener("click", function() {HandleWindowOpen("comp")}, false )
        document.getElementById("id_hdr_empl").addEventListener("click", function() {HandleWindowOpen("empl")}, false )
        document.getElementById("id_hdr_cust").addEventListener("click", function() {HandleWindowOpen("cust")}, false )
        document.getElementById("id_hdr_ordr").addEventListener("click", function() {HandleWindowOpen("ordr")}, false )
        document.getElementById("id_hdr_schm").addEventListener("click", function() {HandleWindowOpen("schm")}, false )
        document.getElementById("id_hdr_rost").addEventListener("click", function() {HandleWindowOpen("rost")}, false )
        document.getElementById("id_hdr_revi").addEventListener("click", function() {HandleWindowOpen("revi")}, false )

//=========  HandleWindowOpen  === PR2019-09-07
    function HandleWindowOpen(mod) {

        // --- get data stored in page
        let el_url = document.getElementById("id_header_url");
        let url_txt
        if (mod === "comp"){url_txt = get_attr_from_el(el_url, "data-company_list_url") } else
        if (mod === "empl"){url_txt = get_attr_from_el(el_url, "data-employee_list_url") } else
        if (mod === "cust"){url_txt = get_attr_from_el(el_url, "data-customer_list_url") } else
        if (mod === "ordr"){url_txt = get_attr_from_el(el_url, "data-order_list_url") } else
        if (mod === "schm"){url_txt = get_attr_from_el(el_url, "data-schemes_url") } else
        if (mod === "rost"){url_txt = get_attr_from_el(el_url, "data-roster_url") } else
        if (mod === "revi"){url_txt = get_attr_from_el(el_url, "data-review_url") } else
        {url_txt = get_attr_from_el(el_url, "data-home_url")}
        window.open(url_txt, mod);
    }

})


//=========  AddSubmenuButton  === PR2019-08-27
    function AddSubmenuButton(el_div, el_data, a_id, a_function, a_data_txt, a_mx, a_href) {
        // console.log(" ---  AddSubmenuButton --- ");
        if (!a_href){a_href = "#"}
        let el_a = document.createElement("a");
            if(!!a_id){el_a.setAttribute("id", a_id)};
            el_a.setAttribute("href", a_href);
            el_a.innerText =  get_attr_from_el_str(el_data, a_data_txt);
            if(!!a_function){el_a.addEventListener("click", a_function, false)};
            if(!!a_mx){el_a.classList.add(a_mx)};
        el_div.appendChild(el_a);
    };//function AddSubmenuButton


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

//========= get_power_array  ============= PR2019-08-30
    function get_power_array(value) {
        //PR2019-08-30 function converts value '31' into array [1,2,4,8,16]  (31 = 2^0 + 2^1 + 2^2 + 2^3 + 2^4)
        let power_list = []
        if (!!value){
            let i = 15;
            if (value < 256) {i=8};
            // In Do While loop, condition is tested at the end of the loop so, Do While executes the statements in the code block at least once
            do  {
                i--;
                // get power of 'i'
                power = 2 ** i  // ** is much faster then power = Math.pow(2, i); from http://bytewrangler.blogspot.com/2011/10/mathpowx2-vs-x-x.html
                // if value >= power : add power to list
                if (value >= power) {
                    // unshift adds a new item to the beginning of an array:
                    power_list.unshift(power);
                    // deduct power from value, loop with remainder of value
                    value -= power;
                }
            } while (value > 0 );
        } else {
             power_list.unshift(0);
        }
        return power_list
    }
//========= get_attr_from_el  =============PR2019-06-07
    function get_attr_from_el(element, key, default_value){
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

//========= get_attr_from_el_str  ============= PR2019-06-07
    function get_attr_from_el_str(element, key){
        "use strict";
        let value_str = "";
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value_str = element.getAttribute(key);
            };
        }
        return value_str;
    };

//========= get_attr_from_el_int  ============= PR2019-06-07
    function get_attr_from_el_int(element, key){
        "use strict";
        let value_int = 0;
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value_int = parseInt(element.getAttribute(key))
            };
        }
        return value_int;
    };

//========= get_attr_from_el_dict  ============= PR2019-06-13
    function get_attr_from_el_dict(element, key){
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

//========= get_attr_from_el_dict  ============= PR2019-08-22
    function get_attr_from_el_arr(element, key){
        "use strict";
        let value_arr = [];
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                const atr = element.getAttribute(key)
                if(!!atr) {
                    value_arr = JSON.parse(atr)
                }
            };
        }
        return value_arr;
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

//========= get_listitem_by_pk  ===== PR2019-07-30
    function get_listitem_by_pk (list, pk_int) {
        "use strict";
        // function searched in list for listitem with pk = pk_int, returns listitem when found
        let listitem;
        if (!!list && !!pk_int){
            for (let i = 0, dict, len = list.length; i < len; i++) {
                let dict = list[i];
                if ("pk" in dict){
                    if (dict["pk"]  === pk_int){
                        listitem = dict;
                        break;
        }}}};
        return listitem;
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

//========= PeriodWithinRange  ====================================
    function PeriodWithinRange(period_min, period_max, range_min, range_max) {
    // PR2019-08-04 Note: period is also out of range when diff === 0

        let out_of_range = false;
        if (!!range_min && !!period_max){
            out_of_range = (period_max.diff(range_min) <= 0)  // out_of_range when period_max <= range_min
        }
        if (!out_of_range) {
            if (!!range_max && !!period_min){
                out_of_range = (period_min.diff(range_max) >= 0) // period_min >= range_max
            }
        }
        const within_range = !out_of_range;
        return within_range
    }  // PeriodWithinRange

//========= get_now_utc new  ========== PR2019-07-28
    function get_now_utc(comp_timezone) {
        // lacal time is now 18.42 u Curacao time

        //console.log(" --- get_now_utc --- ", comp_timezone)
        // this now_utc gives the local 'now' with a utc timezone: now_utc = 2019-07-28T22:47:14Z
        const now_utc = moment.utc();
        //console.log("now_utc", now_utc.format())
        // now_utc 2019-07-28T22:47:14Z

        // get the zone offsets for this time, in minutes
        const company_offset = moment.tz.zone(comp_timezone).utcOffset(now_utc);
        //console.log("company_offset ", company_offset)
        // company_offset  -120

        // userOffset gives the difference in minutes between user timezone and utc: userOffset = 240 min
        const  userOffset = get_userOffset();
        //console.log("userOffset", userOffset)
        // userOffset 240

        const diff =  company_offset - userOffset
        //console.log("diff", diff)
        //diff -360

        // this now_utc gives the local 'now' converted to utc timezone: now_utc 2019-07-28T17:35:48Z
        now_utc.add(diff, 'minute')
        //console.log("now_utc_added", now_utc.format())
        //now_utc_added 2019-07-28T16:47:14Z

        return now_utc;
    }

//========= get_userOffset new  ========== PR2019-06-27
    function get_userOffset() {
    // get_userOffset calculates offset from local computer timezone to UTC in minutes

        // new Date gives now in local time:  Thu Jun 20 2019 07:42:39 GMT-0400 (Bolivia Time) type: object
        const now_datetime_local = new Date;
        // date.getTimezoneOffset() returns the time difference UTC and local time, in minutes.
        // If your time zone is GMT+5, -300 (60*5) minutes will be returned. Daylight savings prevent this value from being a constant.
        const userOffset = now_datetime_local.getTimezoneOffset()

        return userOffset;

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

//========= function formcontrol_err_msg  ====  PR2019-07-25
    function formcontrol_err_msg(el_input, el_err, msg_err ) {
        if(!!el_input){
            if (!!msg_err){
                el_input.classList.add("border_invalid")
            } else {
                el_input.classList.remove("border_invalid")
            };
        }
        if(!!el_err){
            if (!!msg_err){
                el_err.innerText = msg_err;
                el_err.classList.remove("display_hide")
            } else {
                el_err.innerText = null;
                el_err.classList.add("display_hide")
            }
        }
    }
