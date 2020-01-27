
// ++++++++++++  FORMAT +++++++++++++++++++++++++++++++++++++++
    "use strict";

// +++++++++++++++++ FORMAT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= format_datelong_from_datetimelocal  ========== PR2019-06-27
    function XXXformat_datelong_from_datetimelocal(datetime_local) {
// NOT IN USE
        // PR2019-07-01 was:
            //const this_date = datetime_local.date();   //Sunday = 0
            //const this_month_index = 1 + datetime_local.month();   //January = 0
            //const this_month = month_list[this_month_index];
            //const this_year = datetime_local.year();   //January = 0
            //const weekday_index = datetime_local.day();   //Sunday = 0
            //const weekday = weekday_list[weekday_index];

        // debug: datetime_local must be Moment, not datetime
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
        //console.log(" -- format_datemedium  -- ")
        //console.log(dtl.format())
        //console.log(moment.locale())
        //console.log(dtl.year())
        //console.log(dtl.date())
        //console.log("dtl.day: ", dtl.day())
        //console.log(weekday_list[dtl.day()])
        //console.log( month_list[dtl.month() + 1])

        // According to ISO 8601, Sunday is the 7th day of the week
        let weekday_index = dtl.day()
        if(!weekday_index){weekday_index = 7};
        //console.log("weekday_index: ", weekday_index)
        //console.log(weekday_list[dtl.day()])

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

//========= get_period_text  ====================================
    function get_period_text(period_dict, period_select_list, period_extension, months_abbrev, weekdays_abbrev, user_lang) {
        //console.log( "===== get_period_text  ========= ");
        let period_text = null
        if (!isEmpty(period_dict)){
            const period_tag = get_dict_value_by_key(period_dict, "period_tag");
        //console.log( "period_tag: ", period_tag);
        //console.log( "period_select_list: ", period_select_list);

            let default_text = null
            for(let i = 0, item, len = period_select_list.length; i < len; i++){
                item = period_select_list[i];
                if (item[0] === period_tag){ period_text = item[1] }
                if (item[0] === 'today'){ default_text = item[1] }
            }
            if(!period_text){period_text = default_text}

            let extend_text = get_dict_value_by_key(period_extension, "extend_index");
        //console.log( "extend_text: ", extend_text);

            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value_by_key(period_dict, "rosterdatefirst");
                const rosterdatelast = get_dict_value_by_key(period_dict, "rosterdatelast");
                if(rosterdatefirst === rosterdatelast) {
                    period_text =  format_date_iso (rosterdatefirst, months_abbrev, weekdays_abbrev, false, false, user_lang);
                } else {
                    const datelast_formatted = format_date_iso (rosterdatelast, months_abbrev, weekdays_abbrev, true, false, user_lang)
                    if (rosterdatefirst.slice(0,8) === rosterdatelast.slice(0,8)) { //  slice(0,8) = 2019-11-17'
                        // same month: show '13 - 14 nov
                        const day_first = Number(rosterdatefirst.slice(8)).toString()
                        period_text = day_first + " - " + datelast_formatted
                    } else {
                        const datefirst_formatted = format_date_iso (rosterdatefirst, months_abbrev, weekdays_abbrev, true, true, user_lang)
                        period_text = datefirst_formatted + " - " + datelast_formatted
                    }
                }
            }

        //console.log( "period_text: ", period_text);
        // from https://www.fileformat.info/info/unicode/char/25cb/index.htm
        //el_a.innerText = " \u29BF "  /// circeled bullet: \u29BF,  bullet: \u2022 "  // "\uD83D\uDE00" "gear (settings) : \u2699" //
        //el_a.innerText = " \u25CB "  /// 'white circle' : \u25CB  /// black circle U+25CF

        //let bullet = ""
        //if(mode === "current"){bullet = " \u29BF "} else {bullet = " \u25CB "}
        //document.getElementById("id_period_current").innerText = bullet;

        }  // if (!isEmpty(period_dict))

        return period_text;


    }; // function get_period_text

  //========= format_period_from_datetimelocal  ========== PR2019-07-09
    function format_period_from_datetimelocal(periodstart_local, periodend_local, month_list, weekday_list, timeformat) {
        "use strict";
        //console.log(" -- format_period_from_datetimelocal  -- ")
        //console.log("periodstart_local", periodstart_local.format())
        //console.log("periodend_local", periodend_local.format())

        // from https://momentjs.com/guides/
        let startdate = periodstart_local.clone().startOf("day");
        let enddate = periodend_local.clone().startOf("day");

        const enddate_isMidnight = (enddate.diff(periodend_local) === 0);

        //console.log("startdate diff", startdate.diff(periodstart_local))
        // when periodend_local is midnight: make enddate one day earlier (period from 02:00 - 00:00 is still same day)
        // only in 24h setting
        if (enddate_isMidnight && timeformat !== "AmPm") {
            // add / subtract day from datetime_local
            enddate.add(-1, 'day')
            //console.log("enddate corrected", enddate.format())
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

//========= format_time  ========== PR2019-06-27
    function format_time(datetime_local, timeformat, display24) {
        //  when display24 = true: zo 00.00 u is displayed as 'za 24.00 u'

        "use strict";
        let time_formatted = "";
        if (!!datetime_local){
            let isAmPm = false
            if (timeformat.toLowerCase() === "ampm"){isAmPm = true};

            // TODO insted of moment.locale use user_lang and timeformat
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

        }  // if (!!datetime_local){
        return time_formatted
    }
// NOT IN USE
//========= format_offset_time  ========== PR2019-09-14
    function format_offset_time(datetime_local, timeformat, user_lang, display24) {
        //  when display24 = true: zo 00.00 u is dispalyed as 'za 24.00 u'

        "use strict";
        let time_formatted;

        const isAmPm = (timeformat === "AmPm")
        const isEN = (user_lang === "en")

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
    }  // format_offset_time

//========= format_text_element  ======== PR2019-06-09
    function format_text_element (el_input, key_str, el_msg, field_dict, skip_ok, msg_offset, title_overlap) {
       //console.log("--- format_text_element ---")
        //console.log("field_dict: ", field_dict)
        //console.log("key_str: ", key_str)

        if(!!el_input && !isEmpty(field_dict)){
            const pk = get_dict_value_by_key (field_dict, "pk");
            const ppk = get_dict_value_by_key (field_dict, "ppk");
            const updated = get_dict_value_by_key (field_dict, "updated");
            const msg_err = get_dict_value_by_key (field_dict, "error");
            // NIU  const placeholder_txt = get_dict_value_by_key (field_dict, "placeholder");

            let value = get_dict_value_by_key (field_dict, key_str);
            //console.log("value: ", value)
            // add * in front of name when is_replacement
            let is_replacement = get_dict_value_by_key (field_dict, "isreplacement", false);
            if(!!is_replacement) {value = "*" + value}

            // lock element when locked
            const locked = get_dict_value_by_key (field_dict, "locked");
            el_input.disabled = locked

            // add red border and background when has_overlap, add title_overlap
            const has_overlap = get_dict_value_by_key (field_dict, "overlap", false);
            if(has_overlap){
                el_input.classList.add("border_bg_invalid")
                el_input.setAttribute("title", title_overlap);
            } else {
                el_input.classList.remove("border_bg_invalid")
                el_input.removeAttribute("title");
            }
            if(!!msg_err){
                if(!value) { value = null} // otherwise 'undefined will show in tetbox
                //ShowMsgError(el_input, el_msg, msg_err, msg_offset, true, value)
                ShowMsgError(el_input, el_msg, msg_err, [0,0], true, value)
            } else if(updated){
                // dont make el green when addnew row is cleared
                if(!skip_ok){
                    ShowOkElement(el_input);
                }
            }
            if (!!value){
                el_input.value = value;
                el_input.setAttribute("data-value", value);
            } else {
                el_input.value = '';
                el_input.removeAttribute("data-value");
                // NIU if (!!placeholder_txt) { el_input.setAttribute("placeholder", placeholder_txt)}
            }

            if(!!pk){el_input.setAttribute("data-pk", pk)
            } else {el_input.removeAttribute("data-pk")};
            if(!!ppk){el_input.setAttribute("data-ppk", ppk)
            } else {el_input.removeAttribute("data-ppk")};
        }
    }  // format_text_element

//========= format_select_element  ======== PR2019-12-03
    function format_select_element (el_input, key_str, field_dict) {
        //console.log("--- format_select_element ---")
        //console.log("field_dict: ", field_dict)

        if(!!el_input && !isEmpty(field_dict)){
            let pk_int = parseInt(get_dict_value_by_key (field_dict, "pk"))
            if(!pk_int){pk_int = 0}
            const value = get_dict_value_by_key (field_dict, key_str);
            const is_updated = get_dict_value_by_key (field_dict, "updated");

            // lock element when locked
            const locked = get_dict_value_by_key (field_dict, "locked");
            el_input.disabled = locked

            el_input.value = pk_int
            // 'data-value' is used to filter on displayed text of select element
            el_input.setAttribute("data-value", value);
            el_input.setAttribute("data-pk", pk_int);

            if(is_updated){ShowOkElement(el_input)}
        }
    }  // format_select_element

//========= format_amount  ======== PR2019-10-10
    function format_amount (value, user_lang) {
    // PR2019-09-20 returns '1.035,25' or '1,035.25'
        let display_value = null;
        if (!!value){
            value = Math.trunc(value)
            const dot_str = (user_lang === "nl") ? "," : "."
            const separator = (user_lang === "nl") ? "." : ","
            let dollars = parseInt(value / 100);
            let cents = value - dollars * 100;
            let cents_str = '00' + cents.toString();
            cents_str = cents_str.slice(-2)
            let dollars_str ="0"
            if(!!dollars){
                dollars_str = dollars.toString();
                if (dollars > 1000000){
                    dollars_str = dollars_str.slice(0,-6) + separator + dollars_str.slice(-6)
                }
                if (dollars > 1000){
                    dollars_str = dollars_str.slice(0,-3) + separator + dollars_str.slice(-3)
                }
            }
            display_value = dollars_str + dot_str + cents_str
        }
        return display_value;
    }  // format_amount

//========= format_price_element  ======== PR2019-09-29
    function format_price_element (el_input, el_msg, field_dict, msg_offset, user_lang) {
        //console.log("--- format_price_element ---")
        //console.log("field_dict: ", field_dict)
        //console.log("el_input: ", el_input)

        if(!!el_input && !!field_dict){
            let value = get_dict_value_by_key (field_dict, "value");
            const display_value = get_dict_value_by_key (field_dict, "display");
            const inherited = get_dict_value_by_key (field_dict, "inherited");
            let updated = get_dict_value_by_key (field_dict, "updated");
            let msg_err = get_dict_value_by_key (field_dict, "error");

            // lock element when locked
            const locked = get_dict_value_by_key (field_dict, "locked");
            el_input.disabled = locked

            if(!!msg_err){
                if(!value) {value = null} // otherwise 'undefined will show in textbox
                ShowMsgError(el_input, el_msg, msg_err, msg_offset, true, display_value, value)
            } else if(updated){
                ShowOkElement(el_input);
            }

            el_input.value = (!!display_value) ? display_value : null

            if (!!value){
                el_input.setAttribute("data-value", value);
            } else {
                el_input.removeAttribute("data-value");
            }
            if (inherited){
                el_input.classList.add("tsa_color_mediumgrey")
            } else {
                el_input.classList.remove("tsa_color_mediumgrey")
            }
        }
    }  // format_price_element


//========= function format_date_element  ======== PR2019-07-02
    function format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year) {
        // 'rosterdate': {'value': '1901-01-18', 'wdm': '1901-01-18', 'wdmy': '1901-01-18', 'offset': '-1:wo,0:do,1:vr'},
        //console.log(" --- format_date_element --- ");
        //console.log("field_dict: ", field_dict);
        //console.log("month_list: ", month_list);
        //console.log("weekday_list: ", weekday_list);
        //console.log("user_lang: ", user_lang);
        //console.log("comp_timezone: ", comp_timezone);
        //console.log("hide_weekday: ", hide_weekday);
        //console.log("hide_year: ", hide_year);


        if(!!el_input && !!field_dict){
        // get datetime_utc_iso from el_timepicker data-value, convert to local (i.e. comp_timezone)
        // debug: shows 'invalid date' whem updated = true and value = null

            const data_value = get_dict_value_by_key (field_dict, "value");
            const updated = get_dict_value_by_key (field_dict, "updated", false);
            const msg_err = get_dict_value_by_key (field_dict, "error");

            const mindate = get_dict_value_by_key (field_dict, "mindate");
            const maxdate = get_dict_value_by_key (field_dict, "maxdate");
            const rosterdate = get_dict_value_by_key (field_dict, "rosterdate");

            const offset = get_dict_value_by_key (field_dict, "offset");
            const minoffset = get_dict_value_by_key (field_dict, "minoffset");
            const maxoffset = get_dict_value_by_key (field_dict, "maxoffset");

            //console.log("data_value: ", data_value);
            //console.log("updated: ", updated, typeof updated);

            let wdmy = "", wdm = "", dmy = "", dm = "";
            if(!!data_value) {
                const datetime_local = moment.tz(data_value, comp_timezone);
                const this_year = datetime_local.year();
                const this_month_iso = datetime_local.month() + 1;
                const this_date = datetime_local.date();
                const this_weekday_iso = datetime_local.isoWeekday();

                let  month_str = "",  weekday_str = "";
                if (!!weekday_list){weekday_str = weekday_list[this_weekday_iso]};
                if (!!month_list){month_str = month_list[this_month_iso]};

                let comma_space = " ";

                if(user_lang === "en") {
                    comma_space = ", "
                    dm =  month_str + " " + this_date;
                } else {
                    comma_space = " "
                    dm =  this_date + " " + month_str;
                }
                dmy = dm + comma_space + this_year;
                wdm = weekday_str + comma_space  + dm;
                wdmy = weekday_str + comma_space + dmy;
            }  //  if(!!data_value)

            let display_value = "", display_title = "";
            if (hide_year) {
                if (hide_weekday){display_value = dm} else {display_value = wdm}
                display_title = wdmy
            } else {
                if (hide_weekday){display_value = dmy} else {display_value = wdmy}
            }
            //console.log("display_value", display_value, typeof display_value)
            //console.log("display_title", display_title, typeof display_title)

            if(!!msg_err){
               ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, display_value, data_value, display_title)
            } else if(updated){
                ShowOkElement(el_input);
            }

            if(!!display_value){el_input.value = display_value} else {el_input.value = null}

            if(!!display_title){
                el_input.setAttribute("title", display_title)
            } else {
                el_input.removeAttribute("title")
            };
            if(!!data_value){
                el_input.setAttribute("data-value", data_value)
            } else {
                el_input.removeAttribute("data-value");
            };
            if(!!mindate){
                el_input.setAttribute("data-mindate", mindate)
            } else {
                el_input.removeAttribute("data-mindate")
            };
            if(!!maxdate){
                el_input.setAttribute("data-maxdate", maxdate)
            } else {
                el_input.removeAttribute("data-maxdate")
            };

            if(!!offset){
                el_input.setAttribute("data-offset", offset)
            } else {
                el_input.removeAttribute("data-offset")
            };
             if(!!minoffset){
                el_input.setAttribute("data-minoffset", minoffset)
            } else {
                el_input.removeAttribute("data-minoffset")
            };
            if(!!maxoffset){
                el_input.setAttribute("data-maxoffset", maxoffset)
            } else {
                el_input.removeAttribute("data-maxoffset")
            };
        };  // if(!!el_input)
    }  // function format_date_element

    function format_date_iso (date_iso, month_list, weekday_list, hide_weekday, hide_year, user_lang) {
        //console.log(" ----- format_date_iso", date_iso);

        let display_value = "";
        if(!!date_iso) {
            let arr = date_iso.split("-");
            //console.log("arr.length", arr.length);

            if (arr.length === 3) {
                let dte = moment(date_iso);
                //console.log ("dte: ", dte.format(), typeof dte)
                const this_weekday_iso = dte.isoWeekday();
                //console.log ("isoWeekday: ", this_weekday_iso)

                // use moment to get isoWeekday
                const this_year = parseInt(arr[0]);
                const this_month_iso =  parseInt(arr[1]);
                const this_date = parseInt(arr[2]);
                //console.log ("this_year: ", this_year)

                let month_str = "",  weekday_str = "";
                if (!!weekday_list){weekday_str = weekday_list[this_weekday_iso]};
                if (!!month_list){month_str = month_list[this_month_iso]};

                let comma_space = " ";
                if(user_lang === "en") {
                    comma_space = ", "
                    display_value =  month_str + " " + this_date;
                } else {
                    comma_space = " "
                    display_value =  this_date + " " + month_str;
                }
                if (!hide_year) {display_value += comma_space + this_year};
                if (!hide_weekday) {display_value = weekday_str + comma_space  + display_value;};

                //console.log ("display_value: ", display_value)
            }  // if (arr.length === 2) {
        }  // if(!!date_iso)
        return display_value
    }  // function format_date_iso



//========= format_date without moment.js  ======== PR2019-10-12
    function format_date_vanillaJS (date_JS, month_list, weekday_list, user_lang, hide_weekday, hide_year) {
        //console.log(" ----- format_date_vanillaJS", date_JS);
        let display_value = "";
        if(!!date_JS) {
            const year_str = date_JS.getFullYear().toString();
            const month_index =  date_JS.getMonth();
            const date_str = date_JS.getDate().toString();
            const weekday_index = (!!date_JS.getDay()) ? date_JS.getDay() : 7;  // index 0 is index 7 in weekday_list
            //console.log(" ----- weekday_index", weekday_index);

            const weekday_str = (!!weekday_list) ? weekday_list[weekday_index] : "";
            const month_str = (!!month_list) ? month_list[month_index + 1] : "";

            //console.log(" ----- weekday_str", weekday_str);
            const is_en = (user_lang === "en");
            const comma_space = (is_en) ? ", " : " ";
            display_value = (is_en) ? month_str + " " + date_str :  date_str + " " + month_str;

            if (!hide_year) {display_value += comma_space + year_str};
            if (!hide_weekday) {display_value = weekday_str + comma_space  + display_value;};
        }  // if(!!date_JS)
        return display_value
    }  // function format_date_iso

//oooooooooooooooooooooooooooooooo
//========= format_datetime_element  ======== PR2019-06-03
    function format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap) {
        //console.log("------ format_datetime_element --------------")
        //console.log("field_dict: ", field_dict)
// probably not in use PR2020-01-16
// used by employees.js UpdateField, fields "timestart", "timeend", not in table 'planning > maybe not in use
// used by schemes.js UpdateField, fields "timestart", "timeend" > not in use

        if(!!el_input && !!field_dict){
// timestart: {datetime: "2019-07-02T12:00:00Z", mindatetime: "2019-07-02T04:00:00Z",
//                      maxdatetime: "2019-07-03T10:00:00Z", rosterdate: "2019-07-02T00:00:00Z"}

// challenge: instead of 'zo 00.00 u' display 'za 24.00 u', only in time-end field
            const rosterdate_iso = get_dict_value_by_key (field_dict, "rosterdate");  // value = rosterdate_iso
            const datetime_iso = get_dict_value_by_key (field_dict, "datetime"); // value = datetime_utc_iso
            const mindatetime = get_dict_value_by_key (field_dict, "mindatetime");
            const maxdatetime = get_dict_value_by_key (field_dict, "maxdatetime");
            //console.log("datetime_iso: ", datetime_iso, typeof datetime_iso)

            const fieldname = get_dict_value_by_key (field_dict, "field");
            const offset = parseInt(get_dict_value_by_key (field_dict, "offset"));
            const minOffset = parseInt(get_dict_value_by_key (field_dict, "minoffset"));
            const maxOffset = parseInt(get_dict_value_by_key (field_dict, "maxoffset"));

            //console.log("offset: ", offset, typeof offset)
            //console.log("minOffset: ", minOffset, typeof minOffset)
            //console.log("maxOffset: ", maxOffset, typeof maxOffset)

            const updated = get_dict_value_by_key (field_dict, "updated");
            const msg_err = get_dict_value_by_key (field_dict, "error");

            // lock element when locked
            const locked = get_dict_value_by_key (field_dict, "locked");
            el_input.disabled = locked

            const has_overlap = get_dict_value_by_key (field_dict, "overlap", false);
            if(has_overlap){
                el_input.classList.add("border_bg_invalid")
                el_input.setAttribute("title", title_overlap);
            } else {
                el_input.classList.remove("border_bg_invalid")
                el_input.removeAttribute("title");
            }

// put values in element
            if(!!rosterdate_iso){el_input.setAttribute("data-rosterdate", rosterdate_iso)
                } else {el_input.removeAttribute("data-rosterdate")};
            if(!!datetime_iso){el_input.setAttribute("data-datetime", datetime_iso)
                } else {el_input.removeAttribute("data-datetime")};
            if(!!mindatetime){el_input.setAttribute("data-mindatetime", mindatetime)
                } else {el_input.removeAttribute("data-mindatetime")};
            if(!!maxdatetime){el_input.setAttribute("data-maxdatetime", maxdatetime)
                } else {el_input.removeAttribute("data-maxdatetime")};
            if(!!offset || offset === 0){el_input.setAttribute("data-offset", offset)
                } else {el_input.removeAttribute("data-offset")};
            if(!!minOffset || minOffset === 0){el_input.setAttribute("data-minoffset", minOffset)
                } else {el_input.removeAttribute("data-minoffset")};
            if(!!maxOffset || maxOffset === 0){el_input.setAttribute("data-maxoffset", maxOffset)
                } else {el_input.removeAttribute("data-maxoffset")};


// from https://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
// from  https://momentjs.com/timezone/
            let fulltime, fulldatetime, shortdatetime = null, weekday_str = "", month_str = "";

            const isAmPm = (timeformat === "AmPm")
            // TODO use user_lang / timeformat
            const isEN = (moment.locale() === "en")

            if (!!datetime_iso){
                const datetime_local = moment.tz(datetime_iso, comp_timezone );
                let rosterdate_local
                if (!!rosterdate_iso){rosterdate_local = moment.utc(rosterdate_iso);}

// format time
                // PR2019-08-04 was:
                    //if(isEN) {
                    //    if(isAmPm){fulltime = datetime_local.format("hh:mm a")} else {fulltime = datetime_local.format("HH:mm")}
                    //} else {
                    //    if(isAmPm){fulltime = datetime_local.format("hh.mm a")} else {fulltime = datetime_local.format("HH.mm") + " u"}};
// set datetime_local_24h

//check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
                let display24 = false;
                if(fieldname === "timeend"){
                    const midnight = datetime_local.clone().startOf("day");
                    const is_midnight = (datetime_local.diff(midnight) === 0)
                    display24 = (is_midnight)
                }

// get fulltime and fulltime_24h (is '24.00 u' when 00.00 u)
                const fulltime = format_time(datetime_local, timeformat, false);
                let fulltime_24h;
                if (display24){
                    fulltime_24h = format_time(datetime_local, timeformat, true)
                } else {
                    fulltime_24h = fulltime
                }

// get display_datetime_local (is yesterday when display24)
                // when display24 display shows: 'za 24.00 u' instead of 'zo 00.00 u'
                let display_datetime_local;
                if (display24){
                    display_datetime_local = datetime_local.clone().add(-1, 'day')
                } else {
                    display_datetime_local = datetime_local.clone()
                }

// format fulldatetime
                if (display24){
                    if(isEN) {
                        fulldatetime = display_datetime_local.format("dddd, MMMM D, YYYY") + " " + fulltime_24h
                    } else {
                        fulldatetime = display_datetime_local.format("dddd D MMMM YYYY") + " " + fulltime_24h
                    }
                } else {
                    if(isEN) {
                        fulldatetime = datetime_local.format("dddd, MMMM D, YYYY") + " " + fulltime
                    } else {
                        fulldatetime = datetime_local.format("dddd D MMMM YYYY") + " " + fulltime
                    }
                }

// format weekday_str and month_str
                // Not in use: don't show weekday when display_date and rosterdate are the same
                // const show_weekday = (display_datetime_local.date() !== rosterdate_local.date())
                const show_weekday = true;

                if (show_weekday && !!weekday_list){
                    const weekday_iso = display_datetime_local.isoWeekday();
                    weekday_str = weekday_list[weekday_iso]
                };

                if (!!month_list){
                    const month_iso = display_datetime_local.month() + 1;
                    month_str = month_list[month_iso]
                };

// format time with weekday if different from rosterdate

                if (display24){
                    shortdatetime = fulltime_24h
                } else {
                    shortdatetime = fulltime
                }
                if(!!weekday_str){shortdatetime = weekday_str + " " + shortdatetime}


// format za 23 mei NOT IN USE
                //let wdm;
                //if(moment.locale() === "en") {
                //    wdm = weekday_str + ", "  + month_str + " " + display_datetime_local.date();
                //} else {wdm = weekday_str + " " + display_datetime_local.date() + " " + month_str;}

// show msg_err or border_valid
                if(!!msg_err){
                    ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, value)
                } else if(updated){
                    ShowOkElement(el_input);
                }
            }  // if (!!datetime_iso)


            el_input.value = shortdatetime;

            let title = !has_overlap ? fulldatetime : title_overlap;

            el_input.title = title;



            // set border invalid when overlap
            let hasoverlap = false;
            if(!isEmpty(field_dict)) {
            hasoverlap = ("overlap" in field_dict)
        }


        }  // if(!!el_input && !!field_dict){
    }  // function format_datetime_element


//========= format_offset_element  ======== PR2019-09-08
    function format_offset_element (el_input, el_msg, fieldname, field_dict, offset, timeformat, user_lang, title_prev, title_next, blank_when_zero) {
        //console.log("------ format_offset_element --------------", fieldname)
        // offsetstart: {offset: 0, minoffset: -720, maxoffset: 1440}
        const tagName = el_input.tagName
        //console.log("field_dict", field_dict)
        //console.log("el_input", el_input)
        if(!!el_input){
            let offset = null, display_text = "", title = "";
            if(!!field_dict){
                // offset:  "270" = 04:30, value can be null
                const fld = (fieldname === "breakduration") ? "value" : "value";
                offset = get_dict_value_by_key(field_dict, fld);
                //console.log("offset", offset)

                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_err = get_dict_value_by_key (field_dict, "error");
                // (variable == null) will catch null and undefined simultaneously. Equal to (variable === undefined || variable === null)
                let hide_value = (offset == null) || (blank_when_zero && offset === 0);
                //console.log("blank_when_zero", blank_when_zero)
                //console.log("hide_value", hide_value)

                //console.log("hide_value", hide_value)
                if (!hide_value){
                    let days_offset = Math.floor(offset/1440)  // - 90 (1.5 h)
                    const remainder = offset - days_offset * 1440
                    let curHours = Math.floor(remainder/60)
                    const curMinutes = remainder - curHours * 60

                    //check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
                    if(timeformat !== "AmPm") {
                        if (days_offset === 1 && curHours === 0 && curMinutes === 0){
                            days_offset = 0
                            curHours = 24;
                        }
                    }
                    title =  (days_offset < 0) ? title_prev : (days_offset > 0) ? title_next : null

                    display_text = display_offset_time (offset, timeformat, user_lang, blank_when_zero)
                }  //  if (!hide_value){

                if(!!msg_err){
                   ShowMsgError(el_input, el_msg, msg_err, offset, true, offset)
                } else if(updated){
                    ShowOkElement(el_input);
                }
            }  //  if(!!field_dict)

       //console.log("display_text", display_text)
            if(!!display_text){
                if(el_input.tagName === "INPUT"){
                    el_input.value = display_text;
                } else {
                    el_input.innerText = display_text;
                }
            } else {
                if(el_input.tagName === "INPUT"){
                    el_input.value = null;
                } else {
                    el_input.innerText = null;
                }
            }
            if(!!title){
                el_input.title = title;
            } else {
                el_input.removeAttribute("title");
            }
            if(!!offset || offset === 0){
                el_input.setAttribute("data-value", offset);
            } else {
                el_input.removeAttribute("data-value");
            }

            // put values in element
            let minoffset = get_dict_value_by_key (field_dict, "minoffset");
            if (!minoffset){if(fieldname === "offsetstart"){minoffset = -720} else { minoffset = 0}}
            el_input.setAttribute("data-minoffset", minoffset)

            let maxoffset = get_dict_value_by_key (field_dict, "maxoffset");
            if (!maxoffset){ if(fieldname === "offsetstart"){maxoffset = 1440} else { maxoffset = 2160}}
            el_input.setAttribute("data-maxoffset", maxoffset)

        }  // if(!!el_input)
    }  // function format_offset_element

    //>>>>>>>>>>>>>>>>>>>>>>>>>>>

    //========= display_timerange  ======== PR2020-01-26
    function display_timerange (timestart, timeend, skip_prefix_suffix, timeformat, user_lang) {
        //console.log("------ display_timerange --------------", fieldname)
        let display_time = "";
        if(timestart != null || timeend != null){
            const offsetstart_formatted = display_offset_time (offset_start, timeformat, user_lang, skip_prefix_suffix); // true = skip_prefix_suffix
            const offsetend_formatted = display_offset_time (offset_end, timeformat, user_lang, skip_prefix_suffix); // true = skip_prefix_suffix
            display_time = offsetstart_formatted + " - " + offsetend_formatted
        }
        return display_time;
    }  // display_timerange

    //========= display_offset_timerange  ======== PR2019-12-04
    function display_offset_timerange (offset_start, offset_end, skip_prefix_suffix, timeformat, user_lang) {
        //console.log("------ display_offset_timerange --------------", fieldname)
        let display_time = "";
        if(offset_start != null || offset_end != null){
            const offsetstart_formatted = display_offset_time (offset_start, timeformat, user_lang, skip_prefix_suffix); // true = skip_prefix_suffix
            const offsetend_formatted = display_offset_time (offset_end, timeformat, user_lang, skip_prefix_suffix); // true = skip_prefix_suffix
            display_time = offsetstart_formatted + " - " + offsetend_formatted
        }
        return display_time;
    }  // function display_offset_timerange


    //========= display_offset_time  ======== PR2019-10-22
    function display_offset_time (offset, timeformat, user_lang, skip_prefix_suffix, blank_when_zero) {
        //console.log("------ display_offset_time --------------")

        //let do_display = false
        //if (offset != null) {
        //    if (offset === 0){
        //        if (!blank_when_zero){
        //            do_display = true
        //        }
        //    } else {
        //        do_display = true
        //    }
        //}
        // or short:
        if(!blank_when_zero){blank_when_zero = false};
        const do_display = (offset != null) && ((offset === 0 && !blank_when_zero) || (!!offset))

        let display_time = "";
        if(do_display){

            let days_offset = Math.floor(offset/1440)  // - 90 (1.5 h)
            const remainder = offset - days_offset * 1440
            let curHours = Math.floor(remainder/60)
            const curMinutes = remainder - curHours * 60

            const isAmPm = (timeformat === "AmPm");
            const isEN = (user_lang === "en")
            const ampm_list = [" am", " pm"]
            let curAmPm = (curHours >= 12) ? 1 : 0

            //check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
            if(!!isAmPm) {  // } && fieldname === "offsetend"){
                if (curHours >= 12){
                    curHours -= 12;
                }
            } else {
                if (days_offset === 1 && curHours === 0 && curMinutes === 0){
                    days_offset = 0
                    curHours = 24;
                }
            }

            const hour_str = "00" + curHours.toString()
            let hour_text = hour_str.slice(-2);
            const minute_str = "00" + curMinutes.toString()
            let minute_text = minute_str.slice(-2);

            const delim = (isEN) ? ":" : ".";
            const prefix = (!skip_prefix_suffix && days_offset < 0) ? "<- " : "";
            let suffix = (!skip_prefix_suffix && !isEN) ? " u" : "";
            if(!!isAmPm) {suffix += ampm_list[curAmPm]};
            if (days_offset > 0) { suffix += " ->"};

            display_time =  prefix + hour_text + delim + minute_text + suffix;
        }
        return display_time;
    }  // function display_offset_time

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>



//========= format_duration_element  ======== PR2019-07-22
    function format_duration_element (el_input, el_msg, field_dict, user_lang) {
        // timeduration: {value: 540, hm: "9:00"}
        //console.log("+++++++++ format_duration_element")
        //console.log(field_dict)

        if(!!el_input){
            let value_int = 0;
            if(!!field_dict){
                value_int = parseInt(get_dict_value_by_key (field_dict, "value"));
                const dst_warning = get_dict_value_by_key (field_dict, "dst_warning", false);
                const title = get_dict_value_by_key (field_dict, "title");
                if (!!title){el_input.title = title};
                if (!value_int) {value_int = 0}
        //console.log("value_int: ", value_int)

                let updated = get_dict_value_by_key (field_dict, "updated");
                let msg_err = get_dict_value_by_key (field_dict, "error");

                let display_value = display_duration (value_int, user_lang);
                if (dst_warning) {display_value += "*"};
        //console.log("display_value: ", display_value)
                el_input.value = display_value;

                if(!!msg_err){
                    //ShowMsgError(el_input, el_msg, msg_err, offset, set_value, display_value, data_value, display_title)
                    //console.log("+++++++++ ShowMsgError")
                   ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, display_value,  value_int)
                } else if(updated){
                    ShowOkElement(el_input);
                }

            }  // if(!!field_dict)

            el_input.setAttribute("data-value", value_int);
        } // if(!!el_input){
    }  // function format_duration_element

//========= format_total_duration ======== PR2019-08-22
    function format_total_duration (value_int, user_lang) {
        //console.log(" --- format_total_duration", value_int)
        let time_format = "";

        if (!!value_int) {
            let minus_sign = "";
            if (value_int < 0 ){
                value_int = value_int * -1
                minus_sign = "-";
            }
            let dotcomma = "."
            if(user_lang === "en") {dotcomma = ","}

            let hour_text;
            // PR2019-08-22 debug: dont use Math.floor, gives wrong hours when negative. Was: const hours = Math.floor(value_int/60);
              // The Math.floor() function returns the largest integer less than or equal to a given number.
            const hours = Math.trunc(value_int/60);
            hour_text =  hours.toString()
            if (hours >= 1000000) {
                const pos = hour_text.length - 6 ;
                hour_text = [hour_text.slice(0, pos), hour_text.slice(pos)].join(dotcomma);
            }
            if (hours >= 1000) {
                const pos = hour_text.length - 3 ;
                hour_text = [hour_text.slice(0, pos), hour_text.slice(pos)].join(dotcomma);
            }

            const minutes = value_int - hours * 60  // % is remainder operator
            const minute_str = "00" + minutes.toString()
            const minute_text = minute_str.slice(-2);

            //console.log("value_int: ", value_int)
            //console.log("value_int/60: ", value_int/60)
            //console.log("hours: ", hours, "minutes: ", minutes, "minute_text: ", minute_text)

            time_format = minus_sign + hour_text + ":" + minute_text;


        }  // if (!!value_int)
        return time_format
    }  // format_total_duration


//========= display_toFixed  ======== PR2020-01-08
    function display_toFixed (minutes, user_lang) {
        // display minutes as decimal hours
        let display_value = "";
        if(!!minutes){
            const decimal_delimiter = (user_lang === "en") ? "." : ",";
            const thousand_delimiter = (user_lang === "en") ? "," : ".";
            const hours = minutes / 60
            const value_toFixed = hours.toFixed(2);
            const len = value_toFixed.length
            if (len > 2) {display_value = replace_at_index (value_toFixed, len - 3, decimal_delimiter)
            } else { display_value = value_toFixed}
            if (len > 6) {display_value = insertAtIndex(display_value, len - 6, thousand_delimiter)}
            if (len > 9) {display_value = insertAtIndex(display_value, len - 9, thousand_delimiter)}
        }  // if(!!hours)
        return display_value
    }  // display_toFixed

//========= replaceAtIndex  ======== PR2020-01-08
    function replace_at_index (string, index, new_character) {
        return string.substr(0, index) + new_character + string.substr(index + new_character.length);
    }
//========= insertAtIndex  ======== PR2020-01-08
    function insertAtIndex (string, index, new_character) {
        return string.substr(0, index) + new_character + string.substr(index);
    }
//========= display_duration  ======== PR2019-09-08
    function display_duration (value_int, user_lang, hour_suffix, hour_suffix_plural) {
        //console.log("+++++++++ display_duration")
        // don't use Math.floor()
        // Math.floor() returns the largest integer less than or equal to a given number. (-2.56 becomes -3)
        // Math.trunc() cuts off the dot and the digits to the right of it. (-2.56 becomes -2)
        // remainder (%) returns the remainder left over when x is divided by y ( -23 % 4 = -3

        let display_value = "";
        if(!!value_int){
            const is_negative = (value_int < 0);
            if (is_negative){
                value_int = value_int * -1
            }

            //console.log("value_int", value_int)
            let hour_text;
            const hours = Math.trunc(value_int/60);
            if (hours < 100) {
                const hour_str = "00" + hours.toString()
                hour_text = hour_str.slice(-2);
            } else {
                hour_text =  hours.toString()
            }
            //console.log("hour_text", hour_text)

            const minutes = value_int % 60  // % is remainder operator
            const minute_str = "00" + minutes.toString()
            const minute_text = minute_str.slice(-2);

            const delimiter = (user_lang === "en") ? ":" : ".";
            const suffix = (!!hour_suffix && !!hour_suffix_plural) ?
                            (hours > 1) ? " " + hour_suffix_plural : " " + hour_suffix :
                            (user_lang === "en") ? "" :" u";

            display_value = hour_text + delimiter + minute_text + suffix.toLowerCase();

            if(is_negative){display_value = "-" + display_value}
        }  // if(!!value_int)

        //console.log("display_value", display_value)
        return display_value
    }  // display_duration


//========= display_planning_period  ======== PR2020-01-21
    function display_planning_period(selected_planning_period, loc, user_lang) {
        //console.log( "===== display_planning_period  ========= ");
        const datefirst_ISO = get_dict_value_by_key(selected_planning_period, "rosterdatefirst");
        const datelast_ISO = get_dict_value_by_key(selected_planning_period, "rosterdatelast");
        const period_tag = get_dict_value_by_key(selected_planning_period, "period_tag");

        let period_txt = loc.Period + ": "
        if (period_tag !== "other"){
            for (let i = 0, len = loc.period_select_list.length; i < len; i++) {
                if(loc.period_select_list[i][0] === period_tag ){
                    period_txt = loc.period_select_list[i][1] + ": "
                    break;
                }
            }
        }
        period_txt += format_period(datefirst_ISO, datelast_ISO, loc.months_abbrev, loc.weekdays_abbrev, user_lang)

        let display_text = "";
        if (!!period_txt) {
            display_text = period_txt;
        } else {
            display_text = loc.Select_period + "...";
        }
        return display_text;
    }  // display_planning_period

//========= format_restshift_element  ======== PR2019-10-03
    function format_restshift_element (el_input, field_dict, imgsrc_rest_black, imgsrc_stat00, title) {
        //console.log("+++++++++ format_restshift_element")
        //console.log("field_dict", field_dict)
        if(!!el_input){
            const is_restshift = get_dict_value_by_key(field_dict, "value", false)
            const imgsrc = (is_restshift) ? imgsrc_rest_black : imgsrc_stat00;

            let el_img = el_input.children[0];
            if(!!el_img){el_img.setAttribute("src", imgsrc);};

            if(is_restshift){
                el_input.setAttribute("title", title);
            } else {
                el_input.removeAttribute("title");
            }
            const is_updated = get_dict_value_by_key(field_dict, "updated", false);
            if(is_updated){
                ShowOkElement(el_input);
            }
        }  // if(!!el_input)
    }  // format_restshift_element

//========= format_billable_element  ======== PR2019-09-28
    function format_billable_element (el_input, field_dict,
            imgsrc_billable_black, imgsrc_billable_cross, imgsrc_billable_grey, imgsrc_stat00,
            title_billable, title_notbillable, has_infotext) {
        //console.log("+++++++++ format_billable_element")
        //console.log(field_dict)
        let info_text = null

        if(!!el_input){
            //console.log("el_input", el_input)
            let is_override = false, is_billable = false;
            if(isEmpty(field_dict)){
                el_input.removeAttribute("href");
                el_input.children[0].setAttribute("src", imgsrc_stat00);
                el_input.removeAttribute("title");
            } else {
                el_input.setAttribute("href", "#");
                is_override = get_dict_value_by_key(field_dict, "override")
                is_billable = get_dict_value_by_key(field_dict, "billable")
                //console.log("is_override", is_override, "is_billable", is_billable)
                let el_img = el_input.children[0]
                //console.log("el_img", el_img)
                if(!!el_img){
                    const imgsrc = (is_override) ?
                        ((is_billable) ? imgsrc_billable_black : imgsrc_billable_cross) :
                        ((is_billable) ? imgsrc_billable_grey : imgsrc_stat00);
                    //console.log("imgsrc", imgsrc)
                    el_img.setAttribute("src", imgsrc);
                }

                const title = (is_billable) ? title_billable : title_notbillable;
                //console.log("is_override", is_override, "is_billable", is_billable)
                if(has_infotext){
                    info_text = title;
                    el_input.removeAttribute("title");
                } else {
                    el_input.setAttribute("title", title);
                }

                if(get_dict_value_by_key (field_dict, "updated")){
                    ShowOkElement(el_input);
                }
            }  // if(isEmpty(field_dict)){
        }  // if(!!el_input)
        return info_text;
    }  // format_billable_element

//========= format_inactive_element  ======== PR2019-06-09
    function format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive, title_inactive, title_active) {
        // inactive: {value: true}
        //console.log("+++++++++ format_inactive_element")
        //console.log("imgsrc_inactive_black:", imgsrc_inactive_black)
        //console.log("imgsrc_inactive:", imgsrc_inactive)

        if(!!el_input){
            let is_inactive = get_dict_value_by_key (field_dict, "value", false)

            el_input.setAttribute("data-value", is_inactive);

            let el_img = el_input.children[0];
            if (!!el_img){
                const imgsrc = (is_inactive) ? imgsrc_inactive_black : imgsrc_inactive;
                const title = (is_inactive) ? title_inactive : title_active;

                el_img.setAttribute("src", imgsrc);

                if (!!title){
                    el_input.setAttribute("title", title);
                } else {
                    el_input.removeAttribute("title");
                }
            }
            // make el_input green for 2 seconds
            if("updated" in field_dict){ShowOkElement(el_input)}
        }
    }  // format_inactive_element

//========= format_overlap_element  ======== PR2019-09-19
    function format_overlap_element (el_input, field_dict, imgsrc_no_overlap, imgsrc_overlap, title_overlap) {
        if(!!el_input){
            let has_overlap = false;
            if(!isEmpty(field_dict)){has_overlap = get_dict_value_by_key (field_dict, "value")}

            const imgsrc = has_overlap ? imgsrc_overlap : imgsrc_no_overlap;

            let el_img = el_input.children[0];
            if (!!el_img){el_img.setAttribute("src", imgsrc)};

            if (!!has_overlap){
                el_input.setAttribute("title", title_overlap);
            } else {
                el_input.removeAttribute("title");
            }
        }
    }  // format_overlap_element

//========= format_confirmation_element  ======== PR2019-06-09
    function format_confirmation_element (el_input, field_dict, fieldname,
        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_questionmark, imgsrc_warning,
        title_stat00, title_question_start, title_question_end, title_warning_start, title_warning_end ) {
         "use strict";
        //console.log("+++++++++ format_confirmation_element", fieldname, field_dict)

        if(!!el_input){
            let el_img = el_input.children[0];
            //console.log ("el_img", el_img)
            if (!!el_img){
                const status_sum = (!isEmpty(field_dict)) ? parseInt(get_dict_value_by_key(field_dict, "value")) : 0;
                const start_confirmed = status_found_in_statussum(2, status_sum); //STATUS_02_START_CONFIRMED
                const end_confirmed = status_found_in_statussum(4, status_sum); //STATUS_04_END_CONFIRMED
                //console.log("status_sum", status_sum, "start_confirmed", start_confirmed, "end_confirmed", end_confirmed)

                let imgsrc = imgsrc_stat00;

                if (fieldname === "confirmstart"){
                    imgsrc = start_confirmed ? imgsrc_stat02 : imgsrc_stat00
                } else if (fieldname === "confirmend"){
                    imgsrc = end_confirmed ? imgsrc_stat03 : imgsrc_stat00
                }
                //console.log("imgsrc", imgsrc)
                el_img.setAttribute("src", imgsrc);
                //el_input.setAttribute("title", title);
            }
        }
    }  // function format_confirmation_element


//========= format_status_element  ======== PR2019-09-18
    function format_status_element (el_input, field_dict,
        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05,
        title_stat00, title_stat01, title_stat02, title_stat03, title_stat04, title_stat05) {

        "use strict";

        // inactive: {value: true}
        //console.log("+++++++++ format_status_element")
        //console.log(field_dict)
        //console.log(el_input)

        if(!!el_input){
            let status_sum = 0;
            if(!isEmpty(field_dict)){
                status_sum = parseInt(get_dict_value_by_key(field_dict, "value"));
            }
            //console.log("status_sum: ", status_sum)

            el_input.setAttribute("data-value", status_sum);

            // update icon if img existst
            let el_img = el_input.children[0];
            //console.log ("el_img", el_img)
            if (!!el_img){

                let imgsrc = imgsrc_stat00;
                let title = "";
                if (status_sum >= 8) { //STATUS_08_LOCKED = 8
                    imgsrc = imgsrc_stat05;
                    title = title_stat05
                } else {
                    //STATUS_02_START_CONFIRMED
                    //STATUS_04_END_CONFIRMED
                    const start_confirmed = status_found_in_statussum(2, status_sum);
                    const end_confirmed = status_found_in_statussum(4, status_sum);

                    //console.log("start_confirmed: ", start_confirmed)
                    //console.log("end_confirmed: ", end_confirmed)

                    if (start_confirmed) {
                        if (end_confirmed) {
                            imgsrc = imgsrc_stat04;
                            title = title_stat04
                        } else {
                            imgsrc = imgsrc_stat02
                            title = title_stat02;
                        }
                    } else {
                        if (end_confirmed) {
                            imgsrc = imgsrc_stat03;
                            title = title_stat03
                        } else if (status_sum%2 !== 0) {// % is remainder operator
                            imgsrc = imgsrc_stat01 //STATUS_01_CREATED
                            title = title_stat01;
                        }
                    }
                }
                el_img.setAttribute("src", imgsrc);
                el_input.setAttribute("title", title);
            }
        }
    }  // function format_status_element

//=========  ShowOkRow  ================ PR2019-05-31
    function ShowOkRow(tblRow ) {
        // make row green, / --- remove class 'ok' after 2 seconds
        tblRow.classList.add("tsa_tr_ok");
        setTimeout(function (){
            tblRow.classList.remove("tsa_tr_ok");
        }, 2000);
    }

//=========  ShowOkElement  ================ PR2019-11-27
    function ShowOkElement(el_input) {
        // make element green, green border / --- remove class 'ok' after 2 seconds
        el_input.classList.add("border_valid");
        setTimeout(function (){
            el_input.classList.remove("border_valid");
        }, 2000);
    }
