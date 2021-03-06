
// ++++++++++++  FORMAT +++++++++++++++++++++++++++++++++++++++
    "use strict";

// +++++++++++++++++ FORMAT DATE AND TIME WITH JS VANILLA ++++++++++++++++++++++++++ PR2020-04-10

//========= function format_date_elementMOMENT  ======== PR2019-07-02
    function format_date_elementMOMENT (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year) {
        // 'rosterdate': {'value': '1901-01-18', 'wdm': '1901-01-18', 'wdmy': '1901-01-18', 'offset': '-1:wo,0:do,1:vr'},
        //console.log(" --- format_date_elementMOMENT --- ");
        //console.log("field_dict: ", field_dict);

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
                ShowOkElement(el_input, "border_bg_valid");
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
    }  // format_date_elementMOMENT

//========= format_date with vanilla js  ======== PR2020-07-31
    function format_dateISO_vanilla (loc, date_iso, hide_weekday, hide_year, is_months_long, is_weekdays_long) {
        let date_formatted = null;
        if (date_iso){
            const date_JS = get_dateJS_from_dateISO(date_iso);
            date_formatted = format_dateJS_vanilla(loc, date_JS, hide_weekday, hide_year, is_months_long, is_weekdays_long)
        }
        return date_formatted;
    }

//========= format_date with vanilla js  ======== PR2019-10-12 PR2020-07-31
    function format_dateJS_vanilla (loc, date_JS, hide_weekday, hide_year, is_months_long, is_weekdays_long) {
        //console.log(" ----- format_dateJS_vanilla", date_JS);
        let display_value = "";
        if(date_JS) {
            const is_en = (loc.user_lang === "en");
            const comma_space = (is_en) ? ", " : " ";

            const month_list = (is_months_long) ? loc.months_long : loc.months_abbrev;
            const month_index =  date_JS.getMonth();
            const month_str = (!!month_list) ? month_list[month_index + 1] : "";
            const date_str = date_JS.getDate().toString();

            if(is_en){
                display_value = month_str + " " + date_str;
            } else {
                display_value = date_str + " " + month_str;
            }

            if (!hide_year) {
                const year_str = date_JS.getFullYear().toString();
                display_value += comma_space + year_str;
            };

            if (!hide_weekday) {
                // index 0 is index 7 in weekday_list
                const weekday_list = (is_weekdays_long) ? loc.weekdays_long : loc.weekdays_abbrev;
                const weekday_index = (date_JS.getDay()) ? date_JS.getDay() : 7;
                const weekday_str = (weekday_list) ? weekday_list[weekday_index] : "";
                display_value = weekday_str + comma_space  + display_value;
            };
        }  // if(!!date_JS)
        return display_value
    }  // function format_dateJS_vanilla


//=========  format_date_from_dateJS_vanilla ================ PR2019-12-04
    function format_date_from_dateJS_vanilla(date_JS, weekday_list, month_list, user_lang, skip_weekday, skip_year) {
        //console.log( "===== format_date_from_dateJS_vanilla  ========= ");
        let display_arr = ["", ""];

        if(date_JS){
            let weekday_index = date_JS.getDay();
            if (!weekday_index) {weekday_index = 7};
            const weekday_str = weekday_list[weekday_index];
            display_arr[0] = weekday_str

            let display_str = "";

            const isEN = (user_lang === "en")
            const comma_space = (isEN)  ? ", " :  " "
            const month_int = date_JS.getMonth() + 1
            const date_str = date_JS.getDate().toString();
            if(!skip_weekday){
                display_str = weekday_str + comma_space;
            }
            if(isEN) {
                display_str += month_list[month_int] + " " + date_str;
            } else {
                display_str += date_str + " " + month_list[month_int];
            }
            if(!skip_year){
                const year_str = date_JS.getFullYear().toString();
                display_str += comma_space + year_str;
            }

            display_arr[1] = display_str
        }  //  if(!!date_JS)

        return display_arr
    }  // format_date_from_dateJS_vanilla

// +++++++++++++++++ FORMAT ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  format_time_from_offset_JSvanilla ================ PR2020-04-10
    function format_time_from_offset_JSvanilla(loc, rosterdate_iso, offset,
                                                display24, only_show_weekday_when_prev_next_day, skip_hour_suffix) {
        //console.log( "===== format_time_from_offset_JSvanilla  ========= ");
        //console.log( "only_show_weekday_when_prev_next_day", only_show_weekday_when_prev_next_day);
        //  when display24 = true: zo 00.00 u is displayed as 'za 24.00 u'
        //  format: wo 16.30 u or Sat, 12:00 pm
        "use strict";
        // this is only for duration format:
        // let hide_value = (offset == null) || (blank_when_zero && offset === 0);

        let time_formatted = "";
        if (offset != null && !!rosterdate_iso){
            const isEN = (loc.user_lang === "en")
            const isAmPm = (loc.timeformat === "AmPm")
            const is_midnight_endofday = ( offset === 1440 )
            const is_prev_next_day = (offset < 0 || offset > 1440 || ( is_midnight_endofday && !display24 ))

            let rosterdate_JS = get_dateJS_from_dateISO (rosterdate_iso);
            //  when display24 = true: ma 00.00 u is displayed as 'zo 24.00 u'
            // on rosterdate 'zo':
            // timestart: offset = 0 > zo 0:00 u
            // timestart: offset = 1440 > ma 0:00 u
            // timeend:   offset = 1440 > zo 24:00 u
            if (display24 && offset === 1440) {
                // skip: show zo 24:00 u;  with AmPm: midnight, end of day = Sun, 12:00 pm
            } else if (offset >= 1440) {
                // change zo 24:00 u to ma 0:00 u;  with AmPm: midnight, begin of day = Mon, 00:00 am
                change_dayJS_with_daysadd_vanilla(rosterdate_JS, 1);
                offset -= 1440;
            } else if (offset < 0) {
                // when offset = -120: show za 22:00 u;  with AmPm: Sat, 10:00 pm
                change_dayJS_with_daysadd_vanilla(rosterdate_JS, -1);
                offset += 1440;
            }
            let weekday_index = rosterdate_JS.getDay()
            if (!weekday_index) {weekday_index = 7}  // JS sunday = 0, iso sunday = 7

            let weekday_str = null;
            if (only_show_weekday_when_prev_next_day ){
                if(is_prev_next_day) {weekday_str = loc.weekdays_abbrev[weekday_index];  }
            } else {
                weekday_str = loc.weekdays_abbrev[weekday_index];
            }
            let curDayOffset = Math.floor(offset/1440);  // - 90 (1.5 h)
            if ( is_midnight_endofday && display24 ) { curDayOffset = 0 };
            const curRemainder = offset - curDayOffset * 1440;
            let curHours = Math.floor(curRemainder/60);
            const curMinutes = curRemainder - curHours * 60;

            // midnight, begin of day = 00:00 am
            // noon = 12:00 am
            // midnight, end of day = 12:00 pmm
            let is_pm = false;
            if(isAmPm && curHours > 720) {
                curHours -= 720
                is_pm = true;
            }
            let hour_str = "00" + curHours.toString()
            hour_str = hour_str.slice(-2);
            let minute_str = "00" + curMinutes.toString()
            minute_str = minute_str.slice(-2);

            const ampm_str = (isAmPm) ? (is_pm ? " am" : " pm") : (isEN || skip_hour_suffix ? "" : " u" )
            const delim = (isAmPm) ? ":" : ".";

            let prefix = "", suffix = "";
            if (rosterdate_JS){
                // show weekday when rosterdate_JS has value
                if((weekday_str)) { prefix = weekday_str + " "}
            } else {
                // show < or > when rosterdate_JS has novalue
                if (curDayOffset < 0){prefix = "< "};
                if (curDayOffset > 1440 ){suffix = " >"};
            }
            time_formatted = prefix + hour_str + delim + minute_str + ampm_str + suffix
        }  // if (offset != null && !!rosterdate_iso)
        return time_formatted
    }  // format_time_from_offset_JSvanilla

//========= display_duration  ======== PR2019-09-08
    function display_duration (value_int, user_lang, hour_suffix, hour_suffix_plural) {
        //console.log("===== display_duration  =====")
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
            let hour_text;
            const hours = Math.trunc(value_int/60);
            if (hours < 100) {
                const hour_str = "00" + hours.toString()
                hour_text = hour_str.slice(-2);
            } else {
                hour_text =  hours.toString()
            }
            const minutes = value_int % 60  // % is remainder operator
            const minute_str = "00" + minutes.toString()
            const minute_text = minute_str.slice(-2);
            const separator = (user_lang === "en") ? ":" : ".";
            const suffix = (!!hour_suffix && !!hour_suffix_plural) ?
                            (hours > 1) ? " " + hour_suffix_plural : " " + hour_suffix :
                            (user_lang === "en") ? "" :" u";
            display_value = hour_text + separator + minute_text + suffix.toLowerCase();
            if(is_negative){display_value = "-" + display_value}
        }  // if(!!value_int)
        return display_value
    }  // display_duration

//========= display_planning_period  ======== PR2020-01-21
    function display_planning_period(selected_planning_period, loc, skip_prefix) {
        //console.log( "===== display_planning_period  ========= ");
        //console.log( "selected_planning_period: ", selected_planning_period);
        const datefirst_ISO = get_dict_value_by_key(selected_planning_period, "period_datefirst");
        const datelast_ISO = get_dict_value_by_key(selected_planning_period, "period_datelast");
        const period_tag = get_dict_value_by_key(selected_planning_period, "period_tag");

        let period_txt = "";
        if(!skip_prefix){
            period_txt = loc.Period + ": ";
            if (period_tag !== "other"){
                for (let i = 0, len = loc.period_select_list.length; i < len; i++) {
                    if(loc.period_select_list[i][0] === period_tag ){
                        period_txt = loc.period_select_list[i][1] + ": "
                        break;
                    }
                }
            }
        }
        period_txt += format_period(loc, datefirst_ISO, datelast_ISO)

        let display_text = "";
        if (!!period_txt) {
            display_text = period_txt;
        } else {
            display_text = loc.Select_period + "...";
        }
        return display_text;
    }  // display_planning_period


//========= format_datemedium_from_datetimelocal  ========== PR2019-07-09
    function format_datemediumXXX(dtl, weekday_list, month_list, skip_weekday, skip_year) {
    // PR2020-04-10 probably not in use
    // used in ModEmployeeFillOptionDates(replacement_dates), format_period_from_datetimelocalXXX
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
                const datefirst_iso = get_dict_value_by_key(period_dict, "rosterdatefirst");
                const datelast_iso = get_dict_value_by_key(period_dict, "rosterdatelast");
                if(datefirst_iso === datelast_iso) {
                    period_text = format_dateISO_vanilla (loc, datefirst_iso, false, false) + " - ";
                } else {
                    const datelast_formatted = format_dateISO_vanilla (loc, datelast_iso, true, false) + " - ";

                    if (datefirst_iso.slice(0,8) === datelast_iso.slice(0,8)) { //  slice(0,8) = 2019-11-17'
                        // same month: show '13 - 14 nov
                        const day_first = Number(datefirst_iso.slice(8)).toString()
                        period_text = day_first + " - " + datelast_formatted
                    } else {
                        const datefirst_formatted = format_dateISO_vanilla (loc, datefirst_iso, true, true) + " - ";
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


//=========  get_period_formatted ================ PR2019-11-03
    function get_period_formatted(period_dict, loc) {
        //console.log( "===== get_period_formatted  ========= ");
        // used in r_calc_customerplanning_agg_dict for report PR2020-11-05
        let period_formatted = "";
        if(!isEmpty(period_dict)){
            const datefirst_ISO = get_dict_value(period_dict, ["period_datefirst"]);
            const datelast_ISO = get_dict_value(period_dict, ["period_datelast"]);
            period_formatted = format_period(loc, datefirst_ISO, datelast_ISO)
        }
        return period_formatted;

    }

//========= f_get_periodtext_sidebar  ==================================== PR 2020-03-13 PR2020-07-11
    function f_get_periodtext_sidebar(loc, datefirst_iso, datelast_iso) {
        //console.log( " --- f_get_periodtext_sidebar --- ", datefirst_iso, datelast_iso);
        let period_text = "";
        let prefix = ""; //  loc.Period + ": ";
        if (datefirst_iso && !datelast_iso) {
            prefix += loc.As_of_abbrev.toLowerCase();
        } else if (!datefirst_iso && datelast_iso) {
            prefix += loc.Through.toLowerCase();
        } else if (!datefirst_iso && !datelast_iso) {
            prefix += loc.Select_period + "...";
        };

        if(datefirst_iso) {
            if(datelast_iso) {
            format_dateISO_vanilla
                const datelast_formatted = format_dateISO_vanilla(loc, datelast_iso, true, false)

                const is_same_date = (datefirst_iso === datelast_iso);
                const is_same_year = (datefirst_iso.slice(0,4) === datelast_iso.slice(0,4));
                const is_same_year_and_month = (datefirst_iso.slice(0,7) === datelast_iso.slice(0,7));
                let datefirst_formatted = "";
                if (is_same_date) {
                    // display: '20 feb 2020'
                } else if (is_same_year_and_month) {
                    // display: '20 - 28 feb 2020'
                    datefirst_formatted = Number(datefirst_iso.slice(8)).toString() + " - "
                } else if (is_same_year) {
                    // display: '20 jan - 28 feb 2020'
                    datefirst_formatted = format_dateISO_vanilla (loc, datefirst_iso, true, true) + " - ";
                } else {
                    // display: '20 jan 2019 - 28 feb 2020'
                    datefirst_formatted = format_dateISO_vanilla (loc, datefirst_iso, true, false) + " - ";
                }

                period_text = datefirst_formatted + datelast_formatted
            }  else {
                // display: '20 jan 2019
                period_text = format_dateISO_vanilla (loc, datefirst_iso, true, false);
            }
        } else if(datelast_iso) {
                period_text = format_dateISO_vanilla(loc, datelast_iso, true, false)
        }
        // display: 'm.i.v. 23 okt 2020'  or  't/m 30 okt 2020'
        period_text = prefix + " " + period_text;

        return period_text;
    }  // f_get_periodtext_sidebar

  //========= format_period_from_datetimelocal  ========== PR2019-07-09
  // NOT IN USE PR2020-04-10 (uses moment.js)
    function format_period_from_datetimelocalXXX(periodstart_local, periodend_local, month_list, weekday_list, timeformat) {
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

//========= format_period  ========== PR2019-07-09
    function format_period(loc, datefirst_ISO, datelast_ISO) {
        const hide_weekday = true, hide_year = false;
        const datefirst_JS = get_dateJS_from_dateISO (datefirst_ISO);
        const datefirst_formatted = format_dateJS_vanilla (loc, datefirst_JS, hide_weekday, hide_year);

        const datelast_JS = get_dateJS_from_dateISO (datelast_ISO);
        const datelast_formatted = format_dateJS_vanilla (loc, datelast_JS, hide_weekday, hide_year);

        let formatted_period = "";
        if (!!datefirst_formatted || !!datelast_formatted ) {
            if(datefirst_ISO === datelast_ISO) {
                formatted_period = datefirst_formatted;
            } else {
                if (datefirst_ISO.slice(0,8) === datelast_ISO.slice(0,8)) { //  slice(0,8) = 2019-11'
                    // same month: show '13 - 14 nov 2019
                    const day_first = Number(datefirst_ISO.slice(8)).toString()
                    formatted_period = day_first + " - " + datelast_formatted
                } else {
                    formatted_period = datefirst_formatted + " - " + datelast_formatted
                }
            }
        }
        return formatted_period
    }  // format_period

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
        //console.log("msg_offset: ", msg_offset)

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
            const is_locked = get_dict_value(field_dict, ["locked"], false);
            el_input.disabled = is_locked

            // add red border and background when has_overlap, add title_overlap
            const has_overlap = get_dict_value(field_dict, ["overlap"], false);
            if(has_overlap){
                el_input.classList.add("border_bg_invalid")
                el_input.setAttribute("title", title_overlap);
            } else {
                el_input.classList.remove("border_bg_invalid")
                el_input.removeAttribute("title");
            }
            if(!!msg_err){
                if(!value) { value = null} // otherwise 'undefined will show in tetbox
                ShowMsgError(el_input, el_msg, msg_err, msg_offset, true, value)
            } else if(updated){
                // dont make el green when addnew row is cleared
                if(!skip_ok){
                    ShowOkElement(el_input, "border_bg_valid");
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
            // field_dict does not contain pk or ppk. PR2020-05-01
            // was:
            //if(!!pk){el_input.setAttribute("data-pk", pk)
            //} else {el_input.removeAttribute("data-pk")};
            //if(!!ppk){el_input.setAttribute("data-ppk", ppk)
            //} else {el_input.removeAttribute("data-ppk")};
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

            if(is_updated){ShowOkElement(el_input, "border_bg_valid")}
        }
    }  // format_select_element

//========= format_amount  ======== PR2019-10-10
    function format_amount (value, user_lang) {
    // PR2019-09-20 returns '1.035,25' or '1,035.25'
        let display_value = null;
        if (!!value){
            // Math.trunc() returns the integer part of a floating-point number
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

//========= format_entries  ======== PR2020-04-15
    function format_entries (value, user_lang, blank_when_zero) {
    // PR2020-04-15 returns '1.035' or '1,035'
        let display_value = "";
        if (!!value){
            const dot_str = (user_lang === "nl") ? "," : "."
            const separator = (user_lang === "nl") ? "." : ","

            // Math.trunc() returns the integer part of a floating-point number
            // see https://gideonpyzer.dev/blog/2017/06/06/js-tip-use-parseint-for-strings-not-for-numbers/
            const value_int = Math.trunc(Number(value));
            let value_str = value_int.toString();
            if (value_int > 1000000){
                value_str = value_str.slice(0,-6) + separator + value_str.slice(-6)
            }
            if (value_int > 1000){
                value_str = value_str.slice(0,-3) + separator + value_str.slice(-3)
            }
            display_value = (!!value_int) ? value_str : (!!blank_when_zero) ? "" : "0";
        } else {
            display_value = (!!blank_when_zero) ? "" : "0";
        }
        return display_value;
    }  // format_entries

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
                ShowOkElement(el_input, "border_bg_valid");
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


//oooooooooooooooooooooooooooooooo

//========= format_time_from_rosterdate_offset  ======== PR2020-06-28
    function format_time_from_rosterdate_offset (loc, rosterdate_JS, offset, hide_weekday, hide_year, skip_prefix_suffix) {
        //console.log(" === format_time_from_rosterdate_offset === ");
        "use strict";
        let display_txt = "";
        if(!!rosterdate_JS) {
            const blank_when_zero = true;
            const hide_value = ( (offset == null) ||(blank_when_zero && offset == 0) )
            if (!hide_value){
                // floor division: Returns the integral part of the quotient.
                let days_offset = Math.floor(offset/1440)  // - 90 (1.5 h)
                const remainder = offset - days_offset * 1440
                let curHours = Math.floor(remainder/60)
                const curMinutes = remainder - curHours * 60

                const isAmPm = (loc.timeformat === "AmPm")
                const isEN = (loc.user_lang === "en")
                const ampm_list = [" am", " pm"]
                const curAmPm = (curHours >= 12) ? 1 : 0
                // check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
                if (isAmPm){
                    if (curHours >= 12) { curHours -= 12};
                } else if (days_offset === 1 && curHours === 0 && curMinutes === 0){
                        days_offset = 0;
                        curHours = 24;
                };
                const hour_text = ("00" + curHours).slice(-2);
                const minute_text = ("00" + curMinutes).slice(-2);

                let prefix = null, suffix = null;
                const delim = (isEN) ? ":" : "."
                if (rosterdate_JS){
                    skip_prefix_suffix = true
                    prefix = (!skip_prefix_suffix && days_offset < 0) ? "<- " : "";
                    suffix =(!isEN) ? " u" : "";
                }
                if (isAmPm){suffix += ampm_list[curAmPm];}
                if (!skip_prefix_suffix && days_offset > 0){suffix += " ->"}

        // get weekday
                if (!hide_weekday && rosterdate_JS){
                   let weekday_index = rosterdate_JS.getDay();
                    if (!weekday_index) {weekday_index = 7};
                    prefix = loc.weekdays_abbrev[weekday_index] + ' '
                }
                display_txt = [prefix, hour_text, delim, minute_text, suffix].join('');
            }  // if (!hide_value){
        }  // if(!!rosterdate_JS)
        return display_txt
    }  // format_time_from_rosterdate_offset

//oooooooooooooooooooooooooooooooo
//========= format_datetime_elementMOMENT  ======== PR2019-06-03
    function format_datetime_elementMOMENT (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap) {
        //console.log("------ format_datetime_elementMOMENT --------------")
        //console.log("field_dict: ", field_dict)

        // TODO use format_datetime_from_datetimeJS(loc, datetimeJS) instead
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

// show msg_err or border_bg_valid
                if(!!msg_err){
                    ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, value)
                } else if(updated){
                    ShowOkElement(el_input, "border_bg_valid");
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
    }  // function format_datetime_elementMOMENT

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

                    display_text = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, offset, blank_when_zero)
                }  //  if (!hide_value){

                if(!!msg_err){
                   ShowMsgError(el_input, el_msg, msg_err, offset, true, offset)
                } else if(updated){
                    ShowOkElement(el_input, "border_bg_valid");
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
    function display_timerange (timestart, timeend, skip_hour_suffix, timeformat, user_lang) {
        //console.log("------ display_timerange --------------", fieldname)
        let display_time = "";
        if(timestart != null || timeend != null){
            const offsetstart_formatted = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, user_lang, skip_hour_suffix);
            const offsetend_formatted = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, offset_end, skip_hour_suffix);
            display_time = offsetstart_formatted + " - " + offsetend_formatted
        }
        return display_time;
    }  // display_timerange

    //========= display_offset_timerange  ======== PR2019-12-04
    function display_offset_timerange (offset_start, offset_end, timeformat, user_lang, skip_hour_suffix) {
        //console.log("------ display_offset_timerange --------------")

        let display_time = "";
        const blank_when_zero = false;
        if(offset_start != null || offset_end != null){
            const offsetstart_formatted = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, offset_start, skip_hour_suffix, blank_when_zero);
            const offsetend_formatted = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, offset_end, skip_hour_suffix, blank_when_zero);
            display_time = offsetstart_formatted + " - " + offsetend_formatted
        }
        return display_time;
    }  // function display_offset_timerange

    //========= display_offset_time  ======== PR2019-10-22
    function display_offset_time (loc, offset, skip_hour_suffix, blank_when_zero) {
        //console.log("------ display_offset_time --------------")

        let do_display = false
        //PR2020-09-05 debug: !!Number(0) = false, this goed wrong when offset = 0: if (offset != null && !!Number(offset))
        if (offset != null) {

            if (offset === 0){
                do_display = !blank_when_zero;
            } else if ( !!Number(offset)) {
                do_display = true
            }
        }
        let display_time = "";
        if(do_display){
            let days_offset = Math.floor(offset/1440)  // - 90 (1.5 h)
            const remainder = offset - days_offset * 1440
            let curHours = Math.floor(remainder/60)
            const curMinutes = remainder - curHours * 60

            const isAmPm = (loc.timeformat === "AmPm");
            const isEN = (loc.user_lang === "en")
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
            const prefix = (days_offset < 0) ? "< " : "";
            let suffix = (!skip_hour_suffix && !isEN) ? " u" : "";
            if(!!isAmPm) {suffix += ampm_list[curAmPm]};
            if (days_offset > 0) { suffix += " >"};

            display_time =  prefix + hour_text + delim + minute_text + suffix;
        }
        //console.log("display_time: ", display_time, typeof display_time)
        return display_time;
    }  // display_offset_time

    //=========  get_month_year_text  === PR2020-03-14
    function get_month_year_text(first_year, last_year, first_month_index, last_month_index, loc){
        let month_year_text = "-"
        if (first_year === last_year){
        if (first_month_index === last_month_index){
            month_year_text = loc.months_long[first_month_index + 1] + " " + first_year.toString()
        } else {
            month_year_text = loc.months_abbrev[first_month_index + 1] + " - " +
            loc.months_abbrev[last_month_index + 1] + " " + first_year.toString();
        }
        } else {
            month_year_text = loc.months_abbrev[first_month_index + 1] + " " + first_year.toString() + " - " +
            loc.months_abbrev[last_month_index + 1] + " " + last_year.toString();
        }
        return month_year_text;
    }  // get_month_year_text

//=========  set_cell_innertext  === PR2020-03-15
    function set_cell_innertext(loc, inner_text, team_code, is_remove) {
       //console.log( "=========== set_cell_innertext ================");
       //console.log( "inner_text", inner_text);
       //console.log( "team_abbrev", team_abbrev);
       //console.log( "is_remove", is_remove);

        const team_abbrev = get_teamcode_abbrev(loc, team_code);

// ---  add team_abbrev to cell.innerText, sort if there are multiple teams in one cell
        let new_innerText = "";
        if (is_remove){
            if(!team_abbrev){
                new_innerText = inner_text;
            } else if(!!inner_text){
                if(inner_text.toLowerCase() === team_abbrev.toLowerCase()){
                    // new_innerText = "";
                } else {

        //console.log( "inner_text", inner_text);
                 // replace carriage return with space
                 const text_replaced = inner_text.replace(/[\n\r]+/g, ' ')
        //console.log( "text_replaced", text_replaced);

                    //const inner_text_arr= inner_text.split("\n")
                    const inner_text_arr= text_replaced.split(" ")
        //console.log( "inner_text_arr", inner_text_arr);
                    for (let i = 0, len = inner_text_arr.length; i < len; i++) {
                        const abbr = inner_text_arr[i];
        //console.log( "abbr", abbr);
                        if(!!abbr && abbr.toLowerCase() === team_abbrev.toLowerCase()){
                            removeA(inner_text_arr, abbr);
        //console.log( "removeA");
                        }
                    }
                    inner_text_arr.sort()
                    //new_innerText = inner_text_arr.join("\n")
                    new_innerText = inner_text_arr.join(" ")
                }
            }
        } else {
            if(!team_abbrev){
                new_innerText = inner_text;
            } else if(!inner_text){
                new_innerText = team_abbrev;
            } else {
                const inner_text_arr = inner_text.split("\n")
                inner_text_arr.push(team_abbrev);
                inner_text_arr.sort()
                //new_innerText = inner_text_arr.join("\n")
                new_innerText = inner_text_arr.join(" ")
            }
        }
        //console.log( "new_innerText", new_innerText);
        return new_innerText;
    }

//========= update_shiftcode_in_shiftdict  ============= PR2020-03-27
    function update_shiftcode_in_shiftdict(loc, shift_dict) {
        if(!isEmpty(shift_dict)) {
        const new_shift_code = f_create_shift_code(loc,
                                    get_dict_value(shift_dict, ["offsetstart", "value"]),
                                    get_dict_value(shift_dict, ["offsetend", "value"], 0),
                                    get_dict_value(shift_dict, ["timeduration", "value"], 0),
                                    get_dict_value(shift_dict, ["code", "value"], "")
                               );
        shift_dict.code = {value: new_shift_code};
        }
    }

//========= f_create_shift_code  ============= PR2020-02-02 PR2020-05-27
    function f_create_shift_code(loc, offset_start, offset_end, time_duration, cur_shift_code, is_restshift) {
        //console.log( "=== f_create_shift_code ");
        // shiftname will be replaced by calculated shiftname if:
         // 1) cur_shift_code is empty 2) starts with '-' 3) starts with '<'  4) first 2 characters are digits
        // const lastCharCode = shift_code.charCodeAt(shift_code.length - 1);
        // let shift_code_without_restchar = (lastCharCode === 9790) ? shift_code.slice(0, -1) : shift_code

        if(cur_shift_code == null) {cur_shift_code = ""};
        let code_trimmed = cur_shift_code.trim();

        let may_override = false;
        let new_shift_code = "-";
        if( (!code_trimmed || code_trimmed === "-" ) && (is_restshift) ){
            code_trimmed = loc.Rest_shift;
        } else if (!code_trimmed){
            may_override = true;
        } else if (code_trimmed[0] === "-"){
            may_override = true
        } else if (code_trimmed[0] === "<"){
            may_override = true
        } else {
            const code_sliced = code_trimmed.slice(0, 1);
            // Number("0") is falsey
            may_override = (!!Number(code_sliced) || code_sliced === "0");
        }
        //console.log( "-- new_shift_code", new_shift_code);
        //console.log( "may_override: ", may_override, typeof may_override);
        if (may_override){
            if (offset_start != null || offset_end != null) {
                new_shift_code = display_offset_timerange (offset_start, offset_end, loc.timeformat, loc.user_lang, true)  // true = skip_hour_suffix
            } else if (!!time_duration) {
                new_shift_code = display_duration (time_duration, loc.user_lang, loc.Hour, loc.Hours);
            }
        } else {
            new_shift_code = code_trimmed
        }
        return new_shift_code
    }  // f_create_shift_code

//========= format_duration_element  ======== PR2019-07-22
    function format_duration_element (el_input, el_msg, field_dict, user_lang) {
        // timeduration: {value: 540, hm: "9:00"}
        //console.log("+++++++++ format_duration_element")
        //console.log("field_dict", field_dict)

        if(!!el_input){
            const value_int = get_dict_value(field_dict, ["value"], 0);
            const is_locked = get_dict_value(field_dict, ["locked"], false);
            const dst_warning = get_dict_value(field_dict, ["dst_warning"], false);
            const title = get_dict_value(field_dict, ["title"]);

            if (!!title){el_input.title = title};

    //console.log("value_int: ", value_int)

            let updated = get_dict_value(field_dict, ["updated"], false);
            let msg_err = get_dict_value(field_dict, ["error"]);
            //console.log("field_dict: ", field_dict)
            //console.log("updated: ", updated, typeof updated)

            let display_value = display_duration (value_int, user_lang);
            if (dst_warning) {display_value += "*"};
    //console.log("display_value: ", display_value)
            el_input.value = display_value;
            el_input.innerText = display_value;

        // lock element when locked
            el_input.disabled = is_locked
            add_or_remove_class (el_input, "pointer_show", !is_locked)

            if(!!msg_err){
                //ShowMsgError(el_input, el_msg, msg_err, offset, set_value, display_value, data_value, display_title)
                //console.log("+++++++++ ShowMsgError")
               ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, display_value,  value_int)
            } else if(updated){
                ShowOkElement(el_input, "border_bg_valid");
            }

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
            const thousand_separator = (user_lang === "en") ? "," :  ".";
            const decimal_separator =  ":"; // cannot use '.' in dutch because of thousand_separator

            let hour_text;
            // PR2019-08-22 debug: dont use Math.floor, gives wrong hours when negative. Was: const hours = Math.floor(value_int/60);
              // The Math.floor() function returns the largest integer less than or equal to a given number.
            const hours = Math.trunc(value_int/60);
            hour_text =  hours.toString()
            if (hours >= 1000000) {
                const pos = hour_text.length - 6 ;
                hour_text = [hour_text.slice(0, pos), hour_text.slice(pos)].join(thousand_separator);
            }
            if (hours >= 1000) {
                const pos = hour_text.length - 3 ;
                hour_text = [hour_text.slice(0, pos), hour_text.slice(pos)].join(thousand_separator);
            }

            const minutes = value_int - hours * 60  // % is remainder operator
            const minute_str = "00" + minutes.toString()
            const minute_text = minute_str.slice(-2);

            //console.log("value_int: ", value_int)
            //console.log("value_int/60: ", value_int/60)
            //console.log("hours: ", hours, "minutes: ", minutes, "minute_text: ", minute_text)

            time_format = minus_sign + hour_text + decimal_separator + minute_text;


        }  // if (!!value_int)
        return time_format
    }  // format_total_duration

//========= format_wagefactor ======== PR2020-09-05
    function format_wagefactor (user_lang, value_int, hide_zero, hide_decimals) {
        //console.log(" --- format_wagefactor  -----")
        let display_text = "";
        // wagefactor 100% = 1.000.000, 1% = 10.000
        if (value_int > 0) {
            const decimal_separator = (user_lang === "en") ? "." : ",";
            let value_str = value_int.toString();
            // add zero's at beginning when percentage < 1%
            if (value_int < 10000) { value_str = ("0000" + value_str).slice(-5)};
            const pos = value_str.length - 4 ;
            if(hide_decimals){
                display_text = value_str.slice(0, pos);
            } else {
                let int_part = value_str.slice(0, pos);
                let frac_part = value_str.slice(pos);
                // remove trailing zero's;
                while (frac_part.length > 0 && frac_part.slice(-1) === "0" ) {
                    frac_part = frac_part.slice(0, frac_part.length - 1);
                }
                display_text = (frac_part) ? [int_part, frac_part].join(decimal_separator) : int_part;
            }
        } else if(!hide_zero) {
            display_text = "0"
        }  // if (!!value_int)
        if (display_text) { display_text += "%" }
        return display_text;
    }  // format_wagefactor

//========= f_format_pricerate ======== PR2019-08-22 PR2020-07-10 PR2021-01-29
    function f_format_pricerate (user_lang, value_int, is_percentage, show_zero, no_thousand_separators) {
        //console.log(" --- f_format_pricerate  -----")
        is_percentage = (is_percentage) ? is_percentage : false;
        show_zero = (show_zero) ? show_zero : false;

        //console.log("value_int", value_int)
        let display_text = "";

        if (!value_int) {
            if(show_zero) {display_text = "0"};
        } else {
// --- when negative: make positive, add minus sign at the end
            let minus_sign = "";
            if (value_int < 0 ){
                value_int = value_int * -1
                minus_sign = "-";
            }
            const decimal_separator = (user_lang === "en") ? "." : ",";
            const thousand_separator = (user_lang === "en") ? "," : ".";
            // PR2021-06-05 this is not correct: PR2021-03-29 debug. Divisor is also 100 when percentage
            // was: const divisor =  100;
            const divisor = is_percentage ? 10000 : 100;

// --- calculate whole number ('dollar' when currency)
    // --- divide by 100 when number, by 10,000 when percentage
            // PR2019-08-22 debug: dont use Math.floor, gives wrong value when negative. Was: const hours = Math.floor(value_int/60);
              // The Math.floor() function returns the largest integer less than or equal to a given number.
            const dollars_int = Math.trunc(value_int/divisor);
            const cents_int = value_int % divisor  // % is modulo 'remainder' operator

            let dollar_text = dollars_int.toString()
// --- add  thousand_separator when value >= 1,000,000
            if(!no_thousand_separators){
                if (dollars_int >= 1000000) {
                    const pos = dollar_text.length - 6 ;
                    dollar_text = [dollar_text.slice(0, pos), dollar_text.slice(pos)].join(thousand_separator);
                }
// --- add thousand_separator when value >= 1,000
                if (dollars_int >= 1000) {
                    const pos = dollar_text.length - 3 ;
                    dollar_text = [dollar_text.slice(0, pos), dollar_text.slice(pos)].join(thousand_separator);
                }
            }
// --- create cents text
            let cent_text = "";
            if(is_percentage && !cents_int){
                // don't show trailing zero'ds when is_percentage
            } else {
                cent_text = "0000" + cents_int.toString()
                const digits = (is_percentage) ? -4 : -2
                cent_text = cent_text.slice(digits);
    // --- remove trailing zero's when  is_percentage
                if(is_percentage){
                    if (cent_text.slice(-3) === "000"){
                        cent_text = cent_text.slice(0, -3);
                    } else if (cent_text.slice(-2) === "00"){
                        cent_text = cent_text.slice(0, -2);
                    } else if (cent_text.slice(-1) === "0"){
                        cent_text = cent_text.slice(0, -1);
                    };
                }
                cent_text = decimal_separator + cent_text;
            }

            display_text = minus_sign + dollar_text + cent_text;
        }  // if (!!value_int)
        if (display_text && is_percentage) {display_text += "%" }
        //console.log("display_text", display_text)
        return display_text
    }  // f_format_pricerate

//========= format_shift_count ======== PR2020-02-28
    function format_shift_count (shift_count, loc) {
        let formatted_text = "";
        if (!!shift_count){
            formatted_text = shift_count.toString() + " " + ((shift_count === 1) ? loc.Shift.toLowerCase() : loc.Shifts.toLowerCase());
        }
        return formatted_text
    } // format_shift_count

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
                ShowOkElement(el_input, "border_bg_valid");
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
                    ShowOkElement(el_input, "border_bg_valid");
                }
            }  // if(isEmpty(field_dict)){
        }  // if(!!el_input)
        return info_text;
    }  // format_billable_element

//========= format_inactive_element  ======== PR2019-06-09 PR2020-06-09
    function format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive, title_inactive, title_active) {
        // inactive: {value: true}
        //console.log("+++++++++ format_inactive_element")

        if(!!el_input){
            let is_inactive = get_dict_value(field_dict, ["value"], false)
            let is_updated = get_dict_value(field_dict, ["updated"], false)
            // TODO deprecate
           // el_input.setAttribute("data-value", is_inactive);
            // for row filtering
            const tblRow = get_tablerow_selected(el_input)
            if(tblRow){tblRow.setAttribute("data-inactive", is_inactive)};

            let el_img = el_input.children[0];
            if (!!el_img){
                const imgsrc = (is_inactive) ? imgsrc_inactive_black : imgsrc_inactive;
                const title = (is_inactive) ? title_inactive : title_active;
                el_img.setAttribute("src", imgsrc);
                if (title){
                    el_input.setAttribute("title", title);
                } else {
                    el_input.removeAttribute("title");
                }
            }
            // make el_input green for 2 seconds
            if(is_updated){ShowOkElement(el_input, "border_bg_valid")}
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
    function format_confirmation_element (loc, el_input, fieldname, field_dict,
        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_questionmark, imgsrc_warning,
        title_stat00, title_question_start, title_question_end, title_warning_start, title_warning_end ) {
        // el_img does not exist, update status column instead PR2020-07-26

         "use strict";
            //console.log("==== format_confirmation_element  ====")
        // TODO add check overdue again
        //  imgsrc_questionmark, imgsrc_warning,
        // "title_stat00", "please confirm start time", "please confirm end time", "start time confirmation past due", "end time confirmation past due"
        if(!!el_input){
            const is_confirmed = get_dict_value(field_dict, ["value"], false)
            const is_locked = get_dict_value(field_dict, ["locked"], false)
            add_or_remove_class (el_input, "pointer_show", !is_locked)
            let el_img = el_input.children[0];
            if (!!el_img){
                let imgsrc = imgsrc_stat00;
                if (fieldname === "confirmstart"){
                    imgsrc = is_confirmed ? imgsrc_stat02 : imgsrc_stat00
                } else if (fieldname === "confirmend"){
                    imgsrc = is_confirmed ? imgsrc_stat03 : imgsrc_stat00
                }
                el_img.setAttribute("src", imgsrc);
                //el_input.setAttribute("title", title);
            }
        }
    }  // function format_confirmation_element


//========= format_status_element  ======== PR2019-09-18 PR2020-07-21
    function format_status_element (loc, el_input, field_dict,
        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05) {

        //console.log("==== format_status_element  ====")
        //console.log("field_dict", field_dict)
        "use strict";

        const title_stat03 = loc.Endtime_confirmed;
        const title_stat04 = loc.Start_and_endtime_confirmed;
        const title_stat05 = loc.This_shift_is_locked;
        let modified_date_formatted = '-', modified_by = '-';
        if(el_input){
            const status_sum = Number(get_dict_value(field_dict, ["value"]));
            const has_changed = Number(get_dict_value(field_dict, ["haschanged"], false));
            const modified_date_iso = get_dict_value(field_dict, ["modified_date"]);
            const modified_dateJS =  parse_dateJS_from_dateISO(modified_date_iso);
            const modified_date_formatted = format_datetime_from_datetimeJS(loc, modified_dateJS)
            const modified_by = get_dict_value(field_dict, ["modified_by"],'-');

            const tblRow = get_tablerow_selected(el_input)
            tblRow.setAttribute("data-value", status_sum);
            tblRow.setAttribute("data-haschanged", has_changed);

            let imgsrc = imgsrc_stat00;
            let title = "";
            let icon_class = "stat_0_0"
            if (!status_sum ) { //STATUS_NONE_ADDED = 0
                icon_class = (has_changed) ? "stat_1_0" : "stat_0_0"
                title = loc.This_isan_added_shift;
            } else if (status_sum === 1) { //STATUS_00_PLANNED = 1
                icon_class = (has_changed) ? "stat_1_1" : "stat_0_1"
                title = loc.This_isa_planned_shift;
            } else if ([2,3].indexOf(status_sum) > -1) { //STATUS_02_START_CONFIRMED
                icon_class = (has_changed) ? "stat_1_2" : "stat_0_2"
                title = loc.Starttime_confirmed
            } else if ([4,5].indexOf(status_sum) > -1) { //STATUS_04_END_CONFIRMED
                icon_class = (has_changed) ? "stat_1_3" : "stat_0_3"
                title = loc.Endtime_confirmed
            } else if ([6,7].indexOf(status_sum) > -1) { //STATUS_02_START_CONFIRMED + STATUS_04_END_CONFIRMED
                icon_class = (has_changed) ? "stat_1_4" : "stat_0_4"
                title = loc.Start_and_endtime_confirmed;
            } else { //STATUS_05_LOCKED = 32
                icon_class = (has_changed) ? "stat_1_5" : "stat_0_5"
                title = loc.This_shift_is_locked;
            }
            if(has_changed){
                title += "\n" + loc.Modified_by + modified_by + "\n" + loc.on + modified_date_formatted
            }

            // first remove all classes from el_input, put pointer_show back later
            let classList = el_input.classList;
            const contains_pointer_show = classList.contains("pointer_show");
            while (classList.length > 0) {
                classList.remove(classList.item(0));
            }
            if(contains_pointer_show) {el_input.classList.add("pointer_show")};
            el_input.classList.add(icon_class)
            el_input.setAttribute("title", title);

        }
    }  // function format_status_element

//=========  format_datetime_from_datetimeJS ================ PR2020-07-22
    function format_datetime_from_datetimeJS(loc, datetimeJS, hide_weekday, hide_year, hide_suffix) {
        //console.log( "===== format_datetime_from_datetimeJS  ========= ");
        //  when display24 = true: zo 00.00 u is displayed as 'za 24.00 u'
        //  format: wo 16.30 u or Sat, 12:00 pm
        "use strict";
        // this is only for duration format:
        // let hide_value = (offset == null) || (blank_when_zero && offset === 0);
        let date_formatted = "" , time_formatted = "";
        if(datetimeJS){
            const isEN = (loc.user_lang === "en");
            const isAmPm = (loc.timeformat === "AmPm");
            const year_int = datetimeJS.getFullYear();
            const year_str = (!hide_year) ? " " + year_int.toString() : "";
            const date = datetimeJS.getDate();

            const weekday_index = (datetimeJS.getDay()) ? datetimeJS.getDay() : 7 // JS sunday = 0, iso sunday = 7
            const weekday_str = (!hide_weekday) ? loc.weekdays_abbrev[weekday_index] + " " : "";
            const month_str = " " + loc.months_abbrev[ (1 + datetimeJS.getMonth()) ];

            // midnight, begin of day = 00:00 am
            // noon = 12:00 am
            // midnight, end of day = 12:00 pmm
            let is_pm = false;
            const hours = datetimeJS.getHours();
            if(isAmPm && hours > 12) {
                hours -= 12
                is_pm = true;
            }
            const hour_str = " " + ("0" + hours).slice(-2);
            const minute_str = ("0" + datetimeJS.getMinutes()).slice(-2);
            const ampm_str = (isAmPm) ?  ( (is_pm) ? " pm" : " am" ) : "";
            const suffix = (!hide_suffix) ? " u" : "";
            if (isEN) {
                time_formatted = [weekday_str + ",", month_str + date + ",", year_str + ",", hour_str + ":" + minute_str].join(' ');
                if(ampm_str) { time_formatted += ampm_str};
            } else {
                time_formatted = weekday_str + date + " " + month_str + year_str + "," + hour_str + "." + minute_str + suffix;
            }
        }
        return time_formatted
    }  // format_datetime_from_datetimeJS

//=========  ShowOkRow  ================ PR2020-05-26 PR2020-08-26
    function ShowErrorRow(tblRow, cls_selected ) {
        // make row red, / --- remove class 'error' after 2 seconds
        if(tblRow){
            const has_cls_selected = (tblRow.classList.contains(cls_selected));
            if (has_cls_selected) { tblRow.classList.remove(cls_selected)};

            tblRow.classList.add("tsa_tr_error");
            setTimeout(function (){
                tblRow.classList.remove("tsa_tr_error");
                if (has_cls_selected) { tblRow.classList.add(cls_selected)};
            }, 2000);
        }
    }
//=========  ShowOkRow  ================ PR2019-05-31
    function ShowOkRow(tblRow ) {
        // make row green, / --- remove class 'ok' after 2 seconds
        if(tblRow){
            tblRow.classList.add("tsa_tr_ok");
            setTimeout(function (){
                tblRow.classList.remove("tsa_tr_ok");
            }, 2000);
        }
    }

//=========  ShowOkElement  ================ PR2019-11-27 PR2020-07-23 PR2021-01-04
    function ShowOkElement(el_input, ok_class, cur_class) {
        // make element green, green border / --- remove class 'ok' after 2 seconds
        //console.log("ShowOkElement");
        if(el_input){
            if(cur_class) {el_input.classList.remove(cur_class)};
            if(!ok_class) {ok_class = "border_bg_valid"};
            el_input.classList.add(ok_class);
            setTimeout(function (){
                el_input.classList.remove(ok_class);
                if(cur_class) {el_input.classList.add(cur_class)};
            }, 2000);
        }
    }

//=========  ShowClassWithTimeout  ================ PR2020-04-26 PR2020-07-15
    function ShowClassWithTimeout(el, className, timeout) {
        // show class, remove it after timeout milliseconds
        if(el && className){
            if(!timeout) { timeout = 2000};
            el.classList.add(className);
            setTimeout(function (){el.classList.remove(className)}, timeout);
        };
    }

//=========  ShowModMessages  ================ PR2021-06-09
    function ShowModMessages(messages) {
        // show class, remove it after timeout milliseconds

        //  [ { class: "alert-warning",
        //      msg_list: ["Deze loonperiode heeft 7 diensten.", "Alle diensten zijn al afgesloten.", "Er worden geen diensten afgesloten."] } ]

        if(messages && messages.length){
            let html_text = "", msg_header = null;
            //const el_header =  document.getElementById("id_mod_message_header");
            //if(el_header) {el_header.innerText = msg_header};
            const el_container = document.getElementById("id_mod_message_container");
            if(el_container){
                el_container.innerHTML = null;
                for (let i = 0, msg_dict; msg_dict = messages[i]; i++) {
                    const class_str = (msg_dict.class) ? msg_dict.class : "border_bg_transparent";

            // --- create div element with alert border for each message in messages
                    const el_border = document.createElement("div");
                    el_border.classList.add(class_str, "p-2");
                        const msg_list = (msg_dict.msg_list) ? msg_dict.msg_list : [];
                        for (let j = 0, msg_txt; msg_txt = msg_list[j]; j++) {
                            const el_div = document.createElement("div");
                            el_div.innerHTML = msg_txt;
                            el_border.appendChild(el_div);
                        }
                    el_container.appendChild(el_border);
                };
            }  // if(el_container)
            $("#id_mod_message").modal({backdrop: true});
        };
    }