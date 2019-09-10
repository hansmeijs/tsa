
// ++++++++++++  TIMEPICKER +++++++++++++++++++++++++++++++++++++++
    "use strict";

//========= OpenTimepicker  ====================================
    function OpenTimepicker(el_input, el_timepicker, el_data, UpdateTableRow, url_str, comp_timezone, timeformat, interval, cls_hover, cls_highl) {
        console.log("===  OpenTimepicker  =====") ;

// get values from tr_selected and put them in el_timepicker
        let tr_selected = get_tablerow_selected(el_input)
        //console.log("tr_selected", tr_selected) ;
        // in mod_shift_add is no tblRow, get ifno from el instead
        if (!tr_selected){tr_selected= el_input}

        const data_table = get_attr_from_el_str(tr_selected, "data-table");
        if (!!data_table){ el_timepicker.setAttribute("data-table", data_table)
        } else { el_timepicker.removeAttribute("data-table")};

        const data_pk = get_attr_from_el_int(tr_selected, "data-pk");
        if (!!data_pk){ el_timepicker.setAttribute("data-pk", data_pk)
        } else { el_timepicker.removeAttribute("data-pk")};

        const data_ppk = get_attr_from_el_int(tr_selected, "data-ppk");
        if (!!data_ppk){ el_timepicker.setAttribute("data-ppk", data_ppk)
        } else { el_timepicker.removeAttribute("data-ppk")};

// get values from el_input and put them in el_timepicker
        const data_field = get_attr_from_el(el_input, "data-field");
        if (!!data_field){ el_timepicker.setAttribute("data-field", data_field)
        } else { el_timepicker.removeAttribute("data-field")};

        const cur_rosterdate_iso = get_attr_from_el(el_input, "data-rosterdate");
        if (!!cur_rosterdate_iso){ el_timepicker.setAttribute("data-rosterdate", cur_rosterdate_iso)
        } else { el_timepicker.removeAttribute("data-rosterdate")};

        const cur_datetime_iso = get_attr_from_el(el_input, "data-datetime");
        if (!!cur_datetime_iso){ el_timepicker.setAttribute("data-datetime", cur_datetime_iso)
        } else { el_timepicker.removeAttribute("data-datetime")};

        const min_datetime_iso = get_attr_from_el(el_input, "data-mindatetime");
        if (!!min_datetime_iso){ el_timepicker.setAttribute("data-mindatetime", min_datetime_iso)
        } else { el_timepicker.removeAttribute("data-mindatetime")};

        const max_datetime_iso = get_attr_from_el(el_input, "data-maxdatetime");
        if (!!max_datetime_iso){ el_timepicker.setAttribute("data-maxdatetime", max_datetime_iso)
        } else { el_timepicker.removeAttribute("data-maxdatetime")};

        if (!!comp_timezone){el_timepicker.setAttribute("data-timezone", comp_timezone)};
        if (!!timeformat){el_timepicker.setAttribute("data-timeformat", timeformat)};
        if (!!interval){el_timepicker.setAttribute("data-interval", interval)};

        if (!!url_str){el_timepicker.setAttribute("data-url_str", url_str)};
        if (!!cls_highl){el_timepicker.setAttribute("data-cls_highl", cls_highl)};
        if (!!cls_hover){el_timepicker.setAttribute("data-cls_hover", cls_hover)};

        let dict = {};

        const is_offset = (data_table === "shift")
        el_timepicker.setAttribute("data-is_offset", is_offset)

        let offset_int = 0;
        let curDayOffset = 0, curHours = 0, curMinutes = 0;
        let minHours = 0, maxHours = 24, minMinutes = 0, maxMinutes = 60;

        if (is_offset){
            offset_int = get_attr_from_el_int(el_input, "data-value");
            el_timepicker.setAttribute("data-offset", offset_int)

            const minOffset = get_attr_from_el_int(el_input, "data-minoffset");
            el_timepicker.setAttribute("data-minoffset", get_attr_from_el_int(el_input, "data-minoffset"))

            const maxOffset = get_attr_from_el_int(el_input, "data-maxoffset");
            el_timepicker.setAttribute("data-maxoffset", get_attr_from_el_int(el_input, "data-maxoffset"))

            dict = OffsetDict(offset_int, minOffset, maxOffset);

            curDayOffset = Math.floor(offset_int/1440)  // - 90 (1.5 h)
            const remainder = (offset_int - curDayOffset * 1440)
            curHours = Math.floor(remainder / 60)
            curMinutes = remainder - curHours * 60

        } else {
            dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso, cur_datetime_iso,
                                          min_datetime_iso, max_datetime_iso,
                                          comp_timezone, timeformat);
            curHours = dict["curHours"]
            curMinutes = dict["curMinutes"]
        }
        console.log("dict", dict) ;

// display cur_datetime_local in header of el_timepicker
        CreateTimepickerDate(el_data, UpdateTableRow, cur_datetime_iso, cur_rosterdate_iso, is_offset, offset_int, comp_timezone, cls_hover) ;
        CreateTimepickerHours(el_timepicker, el_data, UpdateTableRow, dict, url_str, is_offset, comp_timezone, timeformat, interval, cls_hover, cls_highl);
        CreateTimepickerMinutes(el_timepicker, el_data, UpdateTableRow, dict, url_str, is_offset, comp_timezone, timeformat, interval, cls_hover, cls_highl);

        DisableBtnPrevNextDay(dict["prevday_disabled"], dict["nextday_disabled"]);

        if (timeformat === "AmPm") {HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict)}

        HighlightAndDisableHours(el_timepicker, UpdateTableRow, curHours, minHours, maxHours, cls_hover, cls_highl);
        HighlightAndDisableMinutes(el_timepicker, curMinutes, minMinutes, maxMinutes,
                                    curHours, minHours, maxHours, cls_hover, cls_highl)

// ---  position popup under el_input
        let popRect = el_timepicker.getBoundingClientRect();
        //console.log("popRect", popRect)
        let inpRect = el_input.getBoundingClientRect();
        //console.log("inpRect", inpRect)

        const pop_width = 180; // to center popup under input box
        const correction_left = -240 - pop_width/2 ; // -240 because of sidebar
        const correction_top = -32; // -32 because of menubar
        //console.log("inpRect", inpRect)
        let topPos = inpRect.top + inpRect.height + correction_top;
        let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;

        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        //let msgAttr = "position:relative;top:" + topPos + "px;" + "left:" + leftPos + "px;"
        //console.log("msgAttr", msgAttr)
        el_timepicker.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        //elements = document.getElementsByClassName("el_input");
        popupbox_removebackground("input_timepicker");
        el_input.classList.add("pop_background");

// hide save button on quicksave
        HideSaveButtonOnQuicksave(el_data, cls_hide)

// ---  show el_popup
        el_timepicker.classList.remove(cls_hide);

    }; // function OpenTimepicker

//========= CreateTimepickerDate  ====================================
    function CreateTimepickerDate(el_data, UpdateTableRow, data_datetime, data_rosterdate,
                                    is_offset, offset_int, comp_timezone, cls_hover) {
         console.log( "--- CreateTimepickerDate  ", is_offset, offset_int );
        // display cur_datetime_local in header of el_timepicker
        // get cur_datetime_local from data_datetime. If no current value: get from rosterdate

// add EventListeners to buttons
        // eventhandlers are added in roster.js and scheme.js, to prevent multiple event handlers
        let date_str;
        if(is_offset){
            let days_offset = Math.floor(offset_int/1440)  // - 90 (= 1.5 h before midnight)

            console.log( "days_offset  ", days_offset );
            if (days_offset < 0){
                date_str = get_attr_from_el(el_data, "data-timepicker_prevday");
            } else if (days_offset > 0){
                date_str = get_attr_from_el(el_data, "data-timepicker_nextday");
            } else {
                date_str = get_attr_from_el(el_data, "data-timepicker_curday");
            }

        } else {
            let cur_datetime_local;
            if (!!data_datetime) {
                cur_datetime_local = GetDatetimeLocal(data_datetime, comp_timezone)
            } else if (!!data_rosterdate) {
                cur_datetime_local = GetRosterdateLocal(data_rosterdate, comp_timezone)
            };

            date_str = format_datelong_from_datetimelocal(cur_datetime_local)
        }

        document.getElementById("id_timepicker_date").innerText = date_str

    }  // CreateTimepickerDate

 //========= CreateTimepickerHours  ====================================
    function CreateTimepickerHours(el_timepicker, el_data, UpdateTableRow, dict, url_str,
            is_offset, comp_timezone, timeformat, interval, cls_hover, cls_highl) {
        console.log( "--- CreateTimepickerHours  ");
        console.log( "dict ", dict);

        let tbody = document.getElementById("id_timepicker_tbody_hour");
        tbody.innerText = null

       // const curDate_is_rosterdate = dict["curDate_is_rosterdate"];
        const prevday_disabled = dict["prevday_disabled"];
        const nextday_disabled = dict["nextday_disabled"];
        const curHours = dict["curHours"];
        const minHours = dict["minHours"];
        const maxHours = dict["maxHours"];
        const curMinutes = dict["curMinutes"];
        const minMinutes = dict["minMinutes"];
        const maxMinutes = dict["maxMinutes"];

        //timeformat = 'AmPm' or '24h'
        const is_ampm = (timeformat === 'AmPm')
        let maxAllowedHours = 24;
        let hourRows = 4;

        if (is_ampm) {
            hourRows = 2
            maxAllowedHours = 12;
        }

        let tblRow, td, el_a, hours, hour_text, disabled = false;

// --- add '00'/'12' on separate row ( '00'when 24h, '12' when ampm)
            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            for (let j = 0; j < 6; j++) {
                td = tblRow.insertCell(-1);
                if (j === 0 ) {
                    hours = 0;
                    if(is_ampm){hour_text = "12"} else { hour_text = "00"};
                    CreateTimepickerCell(el_timepicker, tbody, td, el_data, UpdateTableRow, url_str,
                                        is_offset, comp_timezone, timeformat, cls_hover, cls_highl,
                                        "hour", hours, hour_text)
                }
            }

// --- loop
        for (let i = 0; i < hourRows; i++) {
            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            for (let j = 0; j < 6; j++) {
                hours = (1+j) + (i*6)
                if (hours === maxAllowedHours) {hours = 0 }
                hour_text = "00" + hours.toString()
                hour_text = hour_text.slice(-2);
                disabled = false

                td = tblRow.insertCell(-1);

                // skip last 00, zero is added at the firat row
                if (hours !== 0) {
                    CreateTimepickerCell(el_timepicker, tbody, td, el_data, UpdateTableRow, url_str,
                                        is_offset, comp_timezone, timeformat, cls_hover, cls_highl,
                                        "hour", hours, hour_text)
                }

            }
        }  // for (let i = 0,
        if(is_ampm){

            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            td.setAttribute("colspan",6)

            for (let j = 0, td, el_a, ampm_text; j < 2; j++) {
                if(j === 0) {ampm_text = "AM"} else {ampm_text = "PM"}

                td = tblRow.insertCell(-1);
                td.setAttribute("colspan",3)
                CreateTimepickerCell(el_timepicker, tbody, td, el_data, UpdateTableRow, url_str,
                                    is_offset, comp_timezone, timeformat, cls_hover, cls_highl,
                                    "ampm", j, ampm_text)
            }
        }
    }  //function CreateTimepickerHours

//========= CreateTimepickerMinutes  ====================================
    function CreateTimepickerMinutes(el_timepicker, el_data, UpdateTableRow, dict, url_str,
                                    is_offset, comp_timezone, timeformat, interval, cls_hover, cls_highl) {
        //console.log( "=== CreateTimepickerMinutes  ");

// ---  set references to elements
        let tbody = document.getElementById("id_timepicker_tbody_minute");
        tbody.innerText = null

        //const curDate_is_rosterdate = dict["curDate_is_rosterdate"], prevday_disabled = dict["prevday_disabled"], nextday_disabled = dict["nextday_disabled"];
        //const curHours = dict["curHours"], minHours = dict["minHours"], maxHours = dict["maxHours"];
        const curMinutes = dict["curMinutes"], minMinutes = dict["minMinutes"], maxMinutes = dict["maxMinutes"];
        //console.log( "curMinutes  ", curMinutes);
        //console.log( "interval  ", interval);
        // hide minutes tables when interval = 60
        let el_cont_minute = document.getElementById("id_timepicker_cont_minute");
        if(interval === 60) {
            el_cont_minute.classList.add(cls_hide)
        } else {
            el_cont_minute.classList.remove(cls_hide)

            let minutes = 0, minutes_text;
            let rows = 0, columns = 0;
            if ([1, 2].indexOf( interval ) > -1){rows = 6} else
            if ([3, 5].indexOf( interval ) > -1){rows = 4} else
            if ([10, 15].indexOf( interval ) > -1){rows = 2} else
            if ([12, 20, 30].indexOf( interval ) > -1){rows = 1}
            columns = (60 / interval / rows)

            //console.log( "interval", interval, "rows", rows,  "columns", columns);
    // --- add '00' on separate row

            let tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            for (let j = 0, td; j < columns; j++) {
                td = tblRow.insertCell(-1);
                if (j === 0 ) {
                    minutes = 0; minutes_text = "00";
                    td.setAttribute("data-minute", minutes);
                    CreateTimepickerCell(el_timepicker, tbody, td, el_data, UpdateTableRow, url_str,
                                        is_offset, comp_timezone, timeformat, cls_hover, cls_highl,
                                        "minute", minutes, minutes_text)
                }
            }

    // --- loop through option list
            for (let i = 0; i < rows; i++) {
                tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

                for (let j = 0, td, el_a ; j < columns; j++) {
                    minutes = minutes + interval
                    if (minutes === 60) {minutes = 0}
                    minutes_text = "00" + minutes.toString()
                    minutes_text = minutes_text.slice(-2);

                    td = tblRow.insertCell(-1);

                    td.setAttribute("data-minute", minutes);

                    // skip last 00
                    if (minutes !== 0) {
                        CreateTimepickerCell(el_timepicker, tbody, td, el_data, UpdateTableRow, url_str,
                                            is_offset, comp_timezone, timeformat, cls_hover, cls_highl,
                                            "minute", minutes, minutes_text)}
                }
        }  // for (let i = 0,
        }  // if(interval === 60)
    }  //function CreateTimepickerMinutes

//========= CreateTimepickerCell  ====================================
    function CreateTimepickerCell(el_timepicker, tbody, td, el_data, UpdateTableRow, url_str,
                                  is_offset, comp_timezone, timeformat, cls_hover, cls_highl,
                                  data_name, value, value_text) {
        //console.log( "--- CreateTimepickerCell  ");
        //console.log("value", value, "value_text", value_text)

        if (value !== -1){td.setAttribute("data-" + data_name, value)}
        td.classList.add("timepicker_" + data_name);
        td.setAttribute("align", "center")
        if (data_name === "hour"){
            td.addEventListener("click", function() {
                SetHour(el_timepicker, tbody, td, el_data, UpdateTableRow, is_offset, cls_hover, cls_highl)
            }, false)
        } else if (data_name === "minute"){
            td.addEventListener("click", function() {
                SetMinute(el_timepicker, tbody, td, UpdateTableRow, url_str, is_offset, cls_hover, cls_highl)
            }, false)
        } else if (data_name === "ampm"){
            td.addEventListener("click", function() {
                SetAmPm(el_timepicker, tbody, td, UpdateTableRow, comp_timezone, timeformat, is_offset, cls_hover, cls_highl)
            }, false)
        }

        // add hover EventListener
        td.addEventListener("mouseenter", function(event) {ShowHover(td, event, cls_hover)}, false)
        td.addEventListener("mouseleave", function() {ShowHover(td, event, cls_hover)}, false)

        let el_a = document.createElement("a");
        el_a.innerText = value_text
        td.appendChild(el_a);

    }  // CreateTimepickerCell

//========= SetPrevNextDay  ====================================
    function SetPrevNextDay(type_str, el_timepicker, el_data, UpdateTableRow, comp_timezone, cls_hover, cls_highl) {
        console.log("==== SetPrevNextDay  ===== ", type_str);

        const data_field = get_attr_from_el(el_timepicker, "data-field");
        const interval = get_attr_from_el_int(el_timepicker, "data-interval");
        const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");
        let is_offset = (el_timepicker.getAttribute("data-is_offset") === "true")
        console.log("is_offset: ", is_offset, typeof is_offset);

    // set  day_add to 1 or -1
        let day_add = 1;
        if (type_str === "prevday") { day_add = -1};

        if (is_offset){
        // set new hour in new_datetime_local
            const offset_int = get_attr_from_el(el_timepicker, "data-offset");

            const old_day_offset = Math.floor(offset_int/1440)  // - 90 (1.5 h)
            const remainder = offset_int - old_day_offset * 1440
            let curHours = Math.floor(remainder/60)
            const curMinutes = remainder - curHours * 60

            let new_day_offset = old_day_offset + day_add;
            if (new_day_offset > 1){new_day_offset = 1}
            if (new_day_offset < -1){new_day_offset = -1}

            const new_offset = (new_day_offset * 1440) + remainder

    // put new offset back in el_timepicker data-offset
            // TODO
            let within_range = true;
            if (within_range){
                el_timepicker.setAttribute("data-offset", new_offset);

        // display new date in el_timepicker
                let date_str;
                if (new_day_offset === -1){
                    date_str = get_attr_from_el(el_data, "data-timepicker_prevday");
                } else if (new_day_offset === 1){
                    date_str = get_attr_from_el(el_data, "data-timepicker_nextday");
                } else {
                    date_str = get_attr_from_el(el_data, "data-timepicker_curday");
                }
                console.log("date_str: ", date_str, typeof date_str);
                document.getElementById("id_timepicker_date").innerText = date_str
            }  //  if (within_range)

        } else {

            let dict = CalcMinMaxHoursMinutes(
                get_attr_from_el(el_timepicker, "data-rosterdate"),
                get_attr_from_el(el_timepicker, "data-datetime"),
                get_attr_from_el(el_timepicker, "data-mindatetime"),
                get_attr_from_el(el_timepicker, "data-maxdatetime"),
                comp_timezone, timeformat);

            let datetime_local = dict["cur_datetime_local"];


        // add / subtract day from datetime_local
            let new_datetime_local = datetime_local.clone().add(day_add, 'day')

        // display new date in el_timepicker
            let date_str = format_datelong_from_datetimelocal(new_datetime_local)
            document.getElementById("id_timepicker_date").innerText = date_str

        // convert datetime_local to datetime_utc
            const new_datetime_utc = new_datetime_local.utc()
            const new_datetime_utc_iso = new_datetime_utc.toISOString()

        // put new datetime back in el_timepicker data-datetime
            el_timepicker.setAttribute("data-datetime", new_datetime_utc_iso);

            let new_dict = CalcMinMaxHoursMinutes(
                get_attr_from_el(el_timepicker, "data-rosterdate"),
                get_attr_from_el(el_timepicker, "data-datetime"),
                get_attr_from_el(el_timepicker, "data-mindatetime"),
                get_attr_from_el(el_timepicker, "data-maxdatetime"),
                comp_timezone, timeformat);

            DisableBtnPrevNextDay(new_dict["prevday_disabled"], new_dict["nextday_disabled"]);

            if (timeformat === "AmPm") { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, new_dict)};

            const curHours = new_dict["curHours"], minHours = new_dict["minHours"], maxHours = new_dict["maxHours"];
            const curMinutes = new_dict["curMinutes"], minMinutes = new_dict["minMinutes"], maxMinutes = new_dict["maxMinutes"];
            HighlightAndDisableHours(el_timepicker, UpdateTableRow, curHours, minHours, maxHours, cls_hover, cls_highl);
            HighlightAndDisableMinutes(el_timepicker, curMinutes, minMinutes, maxMinutes,
                                    curHours, minHours, maxHours, cls_hover, cls_highl)



        }  //  if (is_offset)


    }  // SetPrevNextDay

//========= SetAmPm  ====================================
    function SetAmPm(el_timepicker, tbody, td, UpdateTableRow,
                        is_offset, comp_timezone, timeformat, cls_hover, cls_highl) {
        console.log("==== SetAmPm  =====");

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){
            const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
            const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");
        // get new ampm from td data-ampm of td
            const new_ampm = get_attr_from_el_int(td, "data-ampm");
            if (is_offset){
            // set new hour in new_datetime_local
                const cur_offset = get_attr_from_el(el_timepicker, "data-offset");
                const arr = cur_offset.split(";")
                let new_offset = arr[0] + ";" + arr[1] + ";" + new_minutes.toString()

        // put new offset back in el_timepicker data-offset
                // TODO
                let within_range = true;
                if (within_range){
                    el_timepicker.setAttribute("data-offset", new_offset);

                }

                if ((timeformat === "AmPm")) { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict)};
                const curHours = dict["curHours"], minHours = dict["minHours"], maxHours = dict["maxHours"];
                const curMinutes = dict["curMinutes"], minMinutes = dict["minMinutes"], maxMinutes = dict["maxMinutes"];
                HighlightAndDisableHours(el_timepicker, UpdateTableRow, curHours, minHours, maxHours, cls_hover, cls_highl);
                HighlightAndDisableMinutes(el_timepicker, curMinutes, minMinutes, maxMinutes,
                                            curHours, minHours, maxHours, cls_hover, cls_highl)


            } else {

        //console.log("new_ampm", new_ampm, typeof new_ampm)
                const cur_rosterdate_iso = get_attr_from_el(el_timepicker, "data-rosterdate");
                const cur_datetime_iso = get_attr_from_el(el_timepicker, "data-datetime");
                const min_datetime_iso = get_attr_from_el(el_timepicker, "data-mindatetime");
                const max_datetime_iso = get_attr_from_el(el_timepicker, "data-maxdatetime");


                const is_offset = false, cur_offset = "";
                let dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso, cur_datetime_iso,
                                                  min_datetime_iso, max_datetime_iso,
                                                  comp_timezone, timeformat);
                const curHours = dict["curHours"];

            // set value of hour_add: add 12 hours when PM and curHours < 12; subtract 12 hours when AM and curHours >= 12;
                let hour_add = 0;
                if(new_ampm === 0) {
                    if (curHours >= 12) {hour_add =  -12}
                } else {
                    if (curHours < 12) {hour_add =  12}
                }

            // set new hour in new_datetime_local
                const cur_datetime_local = dict["cur_datetime_local"];
                let new_datetime_local = cur_datetime_local.clone();
                if (!!hour_add) {new_datetime_local.add(hour_add, 'hour')}
                const new_datetime_utc = new_datetime_local.utc()
                const new_datetime_iso = new_datetime_utc.toISOString()
                //console.log("new_datetime_iso", new_datetime_iso);

        // calculate new min max
                const new_dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso, new_datetime_iso,
                                                        min_datetime_iso, max_datetime_iso,
                                              comp_timezone, timeformat);

        // check if new datetime is within min max range
                const min_datetime_local = new_dict["min_datetime_local"];
                const max_datetime_local = new_dict["max_datetime_local"];
                const within_range = DatetimeWithinRange(new_datetime_local, min_datetime_local, max_datetime_local)

        // disable btn_save if new datetime is not within min max range
                let btn_save = document.getElementById("id_timepicker_save")
                btn_save.disabled = !within_range;

                if ((timeformat === "AmPm")) { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict)};

                HighlightAndDisableHours(el_timepicker, UpdateTableRow, curHours, minHours, maxHours, cls_hover, cls_highl);
                HighlightAndDisableMinutes(el_timepicker, curMinutes, minMinutes, maxMinutes,
                                            curHours, minHours, maxHours, cls_hover, cls_highl)

        // put new datetime back in el_timepicker data-datetime
                if (within_range){
                    el_timepicker.setAttribute("data-datetime", new_datetime_iso);
                } // if (within_range)

            }  // if (is_offset)
        }  // if (!disabled)
    }  // SetAmPm

//========= SetHour  ====================================
    function SetHour(el_timepicker, tbody, td, el_data, UpdateTableRow, is_offset, cls_hover, cls_highl) {
       console.log("==== SetHour  =====");

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_disabled") || td.classList.contains("tsa_color_notallowed"))
        console.log("disabled", disabled);

        if (!disabled){
            const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
            const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");

        // get new hour from data-hour of td
            const newHours = get_attr_from_el_int(td, "data-hour");
            console.log("newHours", newHours, typeof newHours)

            if (is_offset){

            // set new hour in offset
                const curOffset = get_attr_from_el_int(el_timepicker, "data-offset");
                const minOffset = get_attr_from_el_int(el_timepicker, "data-minoffset");
                const maxOffset = get_attr_from_el_int(el_timepicker, "data-maxoffset");

                const curDayOffset = Math.floor(curOffset/1440)  // - 90 (1.5 h)
                const remainder = curOffset - curDayOffset * 1440
                const curHours = Math.floor(remainder/60)
                const curMinutes = remainder - curHours * 60

                const newOffset = curDayOffset * 1440 + newHours * 60 + curMinutes

        // put new datetime back in el_timepicker data-datetime
                // TODO
                //let within_range = true;
                //if (within_range){
                    el_timepicker.setAttribute("data-offset", newOffset);

                    const new_dict = OffsetDict(newOffset, minOffset, maxOffset);

            // save when in quicksave mode
                    let quicksave = get_quicksave_from_eldata(el_data);
                    if (quicksave){
                        HandleTimepickerSave(el_timepicker, el_data, UpdateTableRow, "btn_hour")
                    } // if (quicksave)
                //} // if (within_range)


                if (timeformat === "AmPm") { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, new_dict)};
                const minHours = 0, maxHours = 24, minMinutes = 0, maxMinutes = 60;
                HighlightAndDisableHours(el_timepicker, UpdateTableRow, newHours, minHours, maxHours, cls_hover, cls_highl);
                HighlightAndDisableMinutes(el_timepicker, curMinutes, minMinutes, maxMinutes,
                                    newHours, minHours, maxHours, cls_hover, cls_highl)

            } else {
                const cur_rosterdate_iso = get_attr_from_el(el_timepicker, "data-rosterdate");
                const cur_datetime_iso = get_attr_from_el(el_timepicker, "data-datetime");
                const min_datetime_iso = get_attr_from_el(el_timepicker, "data-mindatetime");
                const max_datetime_iso = get_attr_from_el(el_timepicker, "data-maxdatetime");


                const is_offset = false, cur_offset = "";
                const dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso, cur_datetime_iso,
                                                    min_datetime_iso, max_datetime_iso,
                                                    comp_timezone, timeformat);

        // set new hour in new_datetime_local
                const cur_datetime_local = dict["cur_datetime_local"];
                let new_datetime_local = cur_datetime_local.clone();
                new_datetime_local.hour(newHours);
                const new_datetime_utc = new_datetime_local.utc()
                const new_datetime_iso = new_datetime_utc.toISOString()
                //console.log("new_datetime_iso", new_datetime_iso);


    // calculate new min max
                const new_dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso, new_datetime_iso,
                                                        min_datetime_iso, max_datetime_iso,
                                                        comp_timezone, timeformat);

        // check if new datetime is within min max range
                const min_datetime_local = new_dict["min_datetime_local"];
                const max_datetime_local = new_dict["max_datetime_local"];
                const within_range = DatetimeWithinRange(new_datetime_local, min_datetime_local, max_datetime_local)
                //console.log("min_datetime", min_datetime_local.format(), "max_datetime", max_datetime_local.format(), "within_range", within_range);

        // disable btn_save if new datetime is not within min max range
                let btn_save = document.getElementById("id_timepicker_save")
                btn_save.disabled = !within_range;

                if (timeformat === "AmPm") { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, new_dict)};

                const curHours = new_dict["curHours"], minHours = new_dict["minHours"], maxHours = new_dict["maxHours"];
                const curMinutes = new_dict["curMinutes"], minMinutes = new_dict["minMinutes"], maxMinutes = new_dict["maxMinutes"];
                HighlightAndDisableHours(el_timepicker, UpdateTableRow, curHours, minHours, maxHours, cls_hover, cls_highl);
                HighlightAndDisableMinutes(el_timepicker, curMinutes, minMinutes, maxMinutes,
                                            curHours, minHours, maxHours, cls_hover, cls_highl)

                //console.log("new_dict", new_dict);
        // put new datetime back in el_timepicker data-datetime
                if (within_range){
                    el_timepicker.setAttribute("data-datetime", new_datetime_iso);

            // save when in quicksave mode
                    let quicksave = get_quicksave_from_eldata(el_data);
                    if (quicksave){
                        HandleTimepickerSave(el_timepicker, el_data, UpdateTableRow, "btn_hour")
                    } // if (quicksave)
                } // if (within_range)

            } // if (!is_offset)



        }  // if (!disabled)
    }  // SetHour

//========= SetMinute  ====================================
    function SetMinute(el_timepicker, tbody, td, UpdateTableRow, url_str, is_offset, cls_hover, cls_highl) {
        console.log("==== SetMinute  =====");

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){

        // get new minutes from data-minute of td
            const newMinutes = get_attr_from_el_int(td, "data-minute");
            //console.log("newMinutes", newMinutes, typeof newMinutes)

            if (is_offset){
            // set new hour in offset
                const curOffset = get_attr_from_el_int(el_timepicker, "data-offset");
                const minOffset = get_attr_from_el_int(el_timepicker, "data-minoffset");
                const maxOffset = get_attr_from_el_int(el_timepicker, "data-maxoffset");

                const curDayOffset = Math.floor(curOffset/1440)  // - 90 (1.5 h)
                const remainder = curOffset - curDayOffset * 1440
                const curHours = Math.floor(remainder/60)
                //const curMinutes = remainder - curHours * 60

                const newOffset = curDayOffset * 1440 + curHours * 60 + newMinutes

                    // put new datetime back in el_timepicker data-datetime
                // TODO
                //let within_range = true;
                //if (within_range){
                el_timepicker.setAttribute("data-offset", newOffset);

                const minHours = 0, maxHours = 24, minMinutes = 0, maxMinutes = 60;
                HighlightAndDisableMinutes(el_timepicker, newMinutes, minMinutes, maxMinutes,
                                            curHours, minHours, maxHours, cls_hover, cls_highl)

            } else {

                const cur_rosterdate_iso = get_attr_from_el(el_timepicker, "data-rosterdate");
                const cur_datetime_iso = get_attr_from_el(el_timepicker, "data-datetime");
                const min_datetime_iso = get_attr_from_el(el_timepicker, "data-mindatetime");
                const max_datetime_iso = get_attr_from_el(el_timepicker, "data-maxdatetime");
                const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
                const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");

                const is_offset = false, cur_offset = "";
                let dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso, cur_datetime_iso,
                                                  min_datetime_iso, max_datetime_iso,
                                              comp_timezone, timeformat);

        // set new minutes in datetime_local
                let cur_datetime_local = dict["cur_datetime_local"];
                let new_datetime_local = cur_datetime_local.clone()
                new_datetime_local.minutes(new_minutes);
                const new_datetime_utc = new_datetime_local.utc()
                const new_datetime_iso = new_datetime_utc.toISOString()
                //console.log("new_datetime_iso", new_datetime_iso);

        // calculate new min max
                const new_dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso, new_datetime_iso,
                                                        min_datetime_iso, max_datetime_iso,
                                              comp_timezone, timeformat);

        // check if new datetime is within min max range
                const min_datetime_local = new_dict["min_datetime_local"];
                const max_datetime_local = new_dict["max_datetime_local"];
                const within_range = DatetimeWithinRange(new_datetime_local, min_datetime_local, max_datetime_local)

        // disable btn_save if new datetime is not within min max range
                let btn_save = document.getElementById("id_timepicker_save")
                btn_save.disabled = !within_range;

                HighlightAndDisableMinutes(el_timepicker, new_dict, cls_hover, cls_highl)

        // put new datetime back in el_timepicker data-datetime
                if (within_range){
                    el_timepicker.setAttribute("data-datetime", new_datetime_iso);
                }

            }  //  if (is_offset)
        }  // if (!disabled)
    }  // SetMinute

//=========  HandleTimepickerSave  ================ PR2019-06-27
    function HandleTimepickerSave(el_timepicker, el_data, UpdateTableRow, mode) {
        console.log("===  function HandleTimepickerSave =========", mode);

// ---  change quicksave when clicked on button 'Quicksave'

// ---  btn_save  >       send new_offset      > close timepicker
//      btn_quick > on  > send new_offset + qs > close timepicker (next time do.t show btn_save)
//                > off > send qs only         > don't close timepicker > show btn_save)

// get quicksave from el_data
        let quicksave = get_quicksave_from_eldata(el_data);
        //console.log("quicksave", quicksave, typeof quicksave);

// ---  change quicksave
        let save_datetime = true;
        if(mode === "btn_qs"){
            quicksave = !quicksave;
            save_quicksave_in_eldata(el_data, quicksave);
            HideSaveButtonOnQuicksave(el_data, cls_hide);
        }

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_timepicker.getAttribute("data-ppk"))
        const field = el_timepicker.getAttribute("data-field")
        const table = el_timepicker.getAttribute("data-table")
        const is_offset = ( el_timepicker.getAttribute("data-is_offset") === "true")
        const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
        const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");
        const cls_highl = get_attr_from_el(el_timepicker, "data-cls_highl");
        const cls_hover = get_attr_from_el(el_timepicker, "data-cls_hover");
        //console.log ("field = ", field, "table = ", table)

        console.log ("is_offset = ", is_offset, typeof is_offset)
        //console.log (el_timepicker)

    // get values from el_timepicker
        let cur_rosterdate_iso;

        let curOffset;
        if(is_offset){
            curOffset = get_attr_from_el_int(el_timepicker, "data-offset");
        } else {

            cur_rosterdate_iso = get_attr_from_el(el_timepicker, "data-rosterdate");
            const cur_datetime_iso = get_attr_from_el(el_timepicker, "data-datetime");
            const min_datetime_iso = get_attr_from_el(el_timepicker, "data-mindatetime");
            const max_datetime_iso = get_attr_from_el(el_timepicker, "data-maxdatetime");

            console.log ("cur_datetime_iso = ", cur_datetime_iso, typeof cur_datetime_iso)
            console.log ("min_datetime_iso = ", min_datetime_iso, typeof min_datetime_iso)
            console.log ("max_datetime_iso = ", max_datetime_iso, typeof max_datetime_iso)


            let dict = CalcMinMaxHoursMinutes(cur_rosterdate_iso ,cur_datetime_iso,
                                                min_datetime_iso, max_datetime_iso,
                                              comp_timezone, timeformat);

            curOffset = dict["curOffset"];
            console.log ("curOffset = ", curOffset)

        // check if datetime is within min max range
            const cur_datetime_local = dict["cur_datetime_local"];
            const min_datetime_local = dict["min_datetime_local"];
            const max_datetime_local = dict["max_datetime_local"];
            const within_range = DatetimeWithinRange(cur_datetime_local, min_datetime_local, max_datetime_local)

            //console.log ("cur_datetime_local = ", cur_datetime_local.format())
           // console.log ("min_datetime_local = ", min_datetime_local.format())
           // console.log ("max_datetime_local = ", max_datetime_local.format())
            //console.log ("within_range = ", within_range)

            if (!within_range) {
            //  TODO  console.log("not within_range: " + cur_datetime_local.format())
            }

        }  //   if(is_offset)

        console.log ("pk_str:", pk_str, "parent_pk:", parent_pk)
        if(!!pk_str && !! parent_pk){
            let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            const pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict["temp_pk"] = pk_str;
                id_dict["create"] = true;
            } else {
        // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };

            id_dict["ppk"] =  parent_pk
            id_dict["table"] =  table

            let row_upload = {};

            if (mode === "btn_qs"){
                row_upload["quicksave"] = quicksave
            };

            if(save_datetime){
                if (!!id_dict){
                    row_upload["id"] = id_dict;
                    row_upload[field] = {"value": curOffset, "update": true}
                    if (!!cur_rosterdate_iso){
                        row_upload[field]["rosterdate"] = cur_rosterdate_iso
                    }
                }
            }
            const row_id = table + pk_str;
            let tr_selected = document.getElementById(row_id)

            const url_str = get_attr_from_el(el_timepicker, "data-url_str");

            let parameters = {}
            if (table === "schemeitem") {
                parameters["upload"] = JSON.stringify (row_upload);
            } else {
                parameters[table] = JSON.stringify (row_upload);
            }
            console.log ("parameters", row_upload);
            let response;
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response", response);
                    if ("item_update" in response) {
                        console.log("...... UpdateTableRow ..... item_update", table);
                        UpdateTableRow(table, tr_selected, response["item_update"])
                    }
                    if ("shift_update" in response) {
                        console.log("==... UpdateTableRow .... shift_update", table);
                        UpdateTableRow(table, tr_selected, response["shift_update"])
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  // if(!!pk_str && !! parent_pk){
    // close timepicker, except when clicked on quicksave off

        if (mode === "btn_save") {
            popupbox_removebackground("input_timepicker");
            el_timepicker.classList.add(cls_hide);
        } else if (mode === "btn_qs") {
            if(quicksave){
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide);
            } else {
            }
        } else if (mode === "btn_hour") {
            if(quicksave){
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide);
            } else {
            }
        }


    }  // HandleTimepickerSave

//========= DisableBtnPrevNextDay  ====================================
    function DisableBtnPrevNextDay(prevday_disabled, nextday_disabled) {
        let btn_prevday = document.getElementById("id_timepicker_prevday")
        let btn_nextday = document.getElementById("id_timepicker_nextday")
        btn_prevday.disabled = prevday_disabled;
        btn_nextday.disabled = nextday_disabled;
    }  // DisableBtnPrevNextDay

//========= HighlightAndDisableAmpm  ====================================
    function HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        console.log( ">>>>=== HighlightAndDisableAmpm  ");

        const curDate_is_rosterdate = dict["curDate_is_rosterdate"];
        const prevday_disabled = dict["prevday_disabled"];
        const nextday_disabled = dict["nextday_disabled"];

        const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
        const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");
        const cls_highl = get_attr_from_el(el_timepicker, "data-cls_highl");
        const cls_hover = get_attr_from_el(el_timepicker, "data-cls_hover");

        const curDate = dict["curDate"]
        const curDateMidnight = curDate.clone()
        const curDateMidday = curDate.clone().hour(12);
        const curDateEndOfDay = curDate.clone().add(1, 'days');
        //console.log("curDateMidnight", curDateMidnight.format());
        //console.log("curDateMidday", curDateMidday.format());
        //console.log("curDateEndOfDay", curDateEndOfDay.format());

        const range_min = dict["min_datetime_local"];
        const range_max = dict["max_datetime_local"];

        let isAmpm = (timeformat === "AmPm");
        let curAmPm = dict["curAmpm"];
        let curHoursAmpm = dict["curHoursAmpm"];
        console.log("isAmpm", isAmpm, "curAmPm", curAmPm, "curHoursAmpm", curHoursAmpm);

        if (isAmpm) {
            const tbody = document.getElementById("id_timepicker_tbody_hour");
            let tds = tbody.getElementsByClassName("timepicker_ampm")
            for (let i=0, td, cell_value, highlighted, period_within_range, disabled; td = tds[i]; i++) {
                cell_value = get_attr_from_el_int(td, "data-ampm");
                highlighted = (curAmPm === cell_value);
                console.log("curAmPm", curAmPm, "cell_value", cell_value, "highlighted", highlighted)

                let period_min, period_max // am: period is from 00.00u till 12.00 u  pm: period is from 12.00u till 24.00 u
                if (cell_value === 0){
                    period_min =  curDateMidnight;
                    period_max =  curDateMidday;
                 } else {
                    period_min =  curDateMidday;
                    period_max =  curDateEndOfDay;
                }
                period_within_range = PeriodWithinRange(period_min, period_max, range_min, range_max)
                console.log("period_min", period_min.format(), "period_max", period_max.format())
                console.log("range_min", range_min.format(), "range_max", range_max.format())
                console.log("period_within_range", period_within_range)

                disabled = !period_within_range;

                console.log("highlighted", highlighted, "cls_hover", cls_hover, "cls_highl", cls_highl)
                HighlightAndDisableCell(td, disabled, highlighted, cls_hover, cls_highl);
            }
        }  //  if (timeformat === 'AmPm') {
    }  // HighlightAndDisableAmpm

//========= HighlightAndDisableHours  ====================================
    function HighlightAndDisableHours(el_timepicker, UpdateTableRow, curHours, minHours, maxHours, cls_hover, cls_highl) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript

        console.log( "--------->>>>=== HighlightAndDisableHours  ");
        console.log( "curHours", curHours,  "minHours", minHours,  "maxHours", maxHours);
        let curHourDisabled = false;
        let tbody = document.getElementById("id_timepicker_tbody_hour");
        let tds = tbody.getElementsByClassName("timepicker_hour")
        for (let i=0, td, cell_value, cell_value_ampm, highlighted, disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-hour");
            highlighted = (curHours === cell_value);
            disabled = (cell_value < minHours || cell_value > maxHours)
            if (highlighted){curHourDisabled = disabled}
            HighlightAndDisableCell(td, disabled, highlighted, cls_hover, cls_highl);
        }

    }  // HighlightAndDisableHours

//========= HighlightAndDisableMinutes  ====================================
    function HighlightAndDisableMinutes(el_timepicker, curMinutes, minMinutes, maxMinutes, curHours, minHours, maxHours, cls_hover, cls_highl) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( "--------->>>>=== HighlightAndDisableMinutes  ");

        const curHourDisabled = (curHours < minHours || curHours > maxHours);
       // console.log("curMinutes", curMinutes, "minMinutes", minMinutes, "maxMinutes", maxMinutes, "curHourDisabled", curHourDisabled)

        let tbody = document.getElementById("id_timepicker_tbody_minute");
        let tds = tbody.getElementsByClassName("timepicker_minute")
        for (let i=0, td, cell_value, highlighted, disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-minute");
            disabled = (curHourDisabled || cell_value < minMinutes || cell_value > maxMinutes)
            highlighted = (curMinutes === cell_value);
            HighlightAndDisableCell(td, disabled, highlighted, cls_hover, cls_highl);
        }
    }  // HighlightAndDisableMinutes


//========= HighlightAndDisableCell  ====================================
    function HighlightAndDisableCell(td, disabled, highlighted, cls_hover, cls_highl) {
        //console.log(td, "disabled: ", disabled, "highlighted: ", highlighted)
        td.classList.remove(cls_highl)
        if (!!disabled){
            td.classList.add("tr_disabled");
            td.classList.remove(cls_highl)
            if (!!highlighted){
                td.classList.add("tsa_color_notallowed")
            } else {
                td.classList.remove("tsa_color_notallowed")
            }
        } else {
            td.classList.remove("tr_disabled")
            td.classList.remove("tsa_color_notallowed")
            if (!!highlighted){
                td.classList.add(cls_highl)
            } else {
                td.classList.remove(cls_highl)
            }
        }

    }  // HighlightAndDisableCell

//========= ParseOffset  ==================================== PR2018-08-11
function ParseOffset(curOffset) {
        //console.log(" --- ParseOffset ---")
        //console.log("curOffset", curOffset, "minOffset", minOffset, "maxOffset", maxOffset)

        const curDayOffset = Math.floor(curOffset/1440)  // - 90 (1.5 h)
        const remainder = curOffset - curDayOffset * 1440
        const curHours = Math.floor(remainder/60)
        const curMinutes = remainder - curHours * 60

        // const prevday_disabled = (curDayOffset < 0);
        //const nextday_disabled = (curDayOffset > 0)

        return [curDayOffset, curHours, curMinutes]
    }

function ComposeOffset(curDayOffset, curHours, curMinutes) {
    return curDayOffset * 1440 + curHours * 60 + curMinutes
}

//========= OffsetDict  ==================================== PR2018-08-11
function OffsetDict(curOffset, minOffset, maxOffset) {
        //console.log(" --- OffsetDict ---")
        //console.log("curOffset", curOffset, "minOffset", minOffset, "maxOffset", maxOffset)

        const curDayOffset = Math.floor(curOffset/1440)  // - 90 (1.5 h)
        const remainder = curOffset - curDayOffset * 1440
        const curHours = Math.floor(remainder/60)
        const curMinutes = remainder - curHours * 60

        // const prevday_disabled = (curDayOffset < 0);
        //const nextday_disabled = (curDayOffset > 0)

        return {"curOffset": curOffset, "minOffset": minOffset, "maxOffset": maxOffset,
                "curDayOffset": curDayOffset, "curHours": curHours, "curMinutes": curMinutes}
    }
function offset01_gt_offset02(offset01, offset02) {
    // functions compares 2 offset values, returns true when 02 is later than 01
    // convert offset to minutes, add 10 days to prevent negative numbers ("-1;10;0" "-1,20;0" goes wrong, I think)
    let day01 = 0, hour01 = 0, minute01 = 0;
    if(!!offset01){
        const arr01 = offset01.split(";");
        if(!!arr01) {
            day01 = parseInt(arr01[0]);
            hour01 = parseInt(arr01[1]);
            minute01 = parseInt(arr01[2])
        }
    }
    // add 10 days to prevent negative numbers
    let offset01_minutes = (24 * 60 * 10)
    if (!!day01 && !!hour01 && !!minute01) {
        offset01_minutes = minute01 + (60 * hour01) + (24 * 60 * (10 + day01))
    }

    let day02 = 0 , hour02 = 0, minute02 = 0;
    if(!!offset02){
        arr02 = offset02.split(";");
        if(!!arr02) {
            day02 = parseInt(arr02[0]);
            hour02 = parseInt(arr02[1]);
            minute02 = parseInt(arr02[2]);
        }
    }
    // add 10 days to prevent negative numbers
    let offset02_minutes = (24 * 60 * 10)
    if (!!day02 && !!hour02 && !!minute02) {
        offset02_minutes = minute02 + (60 * hour02) + (24 * 60 * (10 + day02))
    }
    const offset_diff = (offset01_minutes - offset02_minutes)
    const offset01_gt_02 = (offset_diff > 0)

    return offset01_gt_02
}


//========= CalcMinMaxHoursMinutes  ==================================== PR2018-08-02
function CalcMinMaxHoursMinutes(cur_rosterdate_iso, cur_datetime_iso,
            min_datetime_iso, max_datetime_iso, comp_timezone, timeformat) {
        //console.log(" --- CalcMinMaxHoursMinutes ---")
        //console.log("cur_rosterdate_iso", cur_rosterdate_iso)

        //console.log("cur_datetime_iso", cur_datetime_iso)
        //console.log("comp_timezone", comp_timezone)
        //console.log("timeformat", timeformat)

        let curDate, minDate, maxDate
        let curHours = 0, curMinutes = 0;
        let curOffset = "0;0;0";

        let minHours = 0, minMinutes = 0;
        let maxHours = 24, maxMinutes = 60;
        let prevday_disabled = false, nextday_disabled = false;
        let isAmpm = false, curHoursAmpm = 0, curAmpm = 0;
        let curdate_rosterdate_diff = 0;
        let cur_datetime_local, min_datetime_local, max_datetime_local;

// get curRosterdate: local datetime moment, midnight,  from data_rosterdate
        const curRosterdate = GetRosterdateLocal(cur_rosterdate_iso, comp_timezone)
        //console.log("curRosterdate", curRosterdate.format())

// convert cur_datetime_iso to cur_datetime_local. If no current value: get from rosterdate

        if (!!cur_datetime_iso){
            cur_datetime_local = GetDatetimeLocal(cur_datetime_iso, comp_timezone)
        } else {
            cur_datetime_local = curRosterdate;
        };
        //console.log("cur_datetime_local", cur_datetime_local.format())
        //console.log("curRosterdate", curRosterdate.format())

        if (!!cur_datetime_local) {
            // from https://momentjs.com/guides/
            curDate = cur_datetime_local.clone().startOf("day");
            curHours = cur_datetime_local.hours();
            curMinutes = cur_datetime_local.minutes();
            //console.log("curDate", curDate.format(), "curHours", curHours, "curMinutes", curMinutes)

            curdate_rosterdate_diff = curDate.diff(curRosterdate, "days");
            curOffset = curdate_rosterdate_diff.toString() + ";" + curHours.toString() + ";" + curMinutes.toString()
            //console.log("curOffset", curOffset)

    // calc minHours and minMinutes
            // if mindate < curdate: minHours=0 and minMinutes=0
            // if mindate = curdate: minHours=min_datetime_local.hours and minMinutes=0 min_datetime_local.hours
            // if mindate > curdate: minHours=24 and minMinutes=60

            if(!!min_datetime_iso){
                min_datetime_local = GetDatetimeLocal(min_datetime_iso, comp_timezone);
                const minDate = min_datetime_local.clone().startOf("day");
                const minDate_diff = minDate.diff(curDate)

                //console.log("min_datetime_local", min_datetime_local.format())
                //console.log("minDate", minDate.format())
                //console.log("minDate_diff", minDate_diff)

                // default values when minDate_diff < 0  (minDate < curDate)
                    //minHours = 0
                    //minMinutes = 0
                    //prevday_disabled = false
                if(minDate_diff === 0){  // (minDate = curDate)
                    prevday_disabled = true
                    minHours = min_datetime_local.hours()
                    //console.log("}} curHours", curHours, "minHours", minHours)

                    if (curHours < minHours) {
                        minMinutes = 99// also 0 not allowed
                    } else  if (curHours === minHours) {
                        minMinutes = min_datetime_local.minutes()
                    } else  if (curHours > minHours) {
                        minMinutes = 0
                    }
                    //console.log("}} curMinutes", curMinutes, "minMinutes", minMinutes)

                } else if(minDate_diff > 0){  // (minDate > curDate)
                    prevday_disabled = true
                    minHours = 99
                    minMinutes = 99
                }
                //console.log("minHours", minHours, "minMinutes", minMinutes, "prevday_disabled", prevday_disabled)
            }

            // calc maxHours and maxMinutes
            if(!!max_datetime_iso){
                max_datetime_local = GetDatetimeLocal(max_datetime_iso, comp_timezone);

                // debug: max_datetime_local 2019-03-31T00:00:00+01:00
                //          gives maxDate 2019-03-31T00:00:00+01:00
                //          must be:  maxDate 2019-03-30
                if (max_datetime_local.hour() === 0 && max_datetime_local.minutes() === 0 ){
                    const datetime_corrected = max_datetime_local.clone().add(-1, 'day')
                    maxDate = datetime_corrected.clone().startOf("day");
                    maxHours = 24
                    maxMinutes = 60
                } else {
                    maxDate = max_datetime_local.clone().startOf("day");
                    maxHours = max_datetime_local.hour()
                    if (curHours < maxHours) {
                        maxMinutes = 60
                    } else  if (curHours === maxHours) {
                        maxMinutes = max_datetime_local.minute()
                    } else  if (curHours > maxHours) {
                        maxMinutes = -1 // also 0 not allowed
                    }
                }
                const maxDate_diff = curDate.diff(maxDate)

                //console.log("max_datetime_local", max_datetime_local.format())
                //console.log("maxDate", maxDate.format())
                //console.log("maxDate_diff", maxDate_diff)

                if(maxDate_diff < 0){  // (curDate < maxDate)
                    maxHours = 24
                    maxMinutes = 60
                    nextday_disabled = false
                } else if(maxDate_diff === 0){  // (curDate = maxDate)
                    // keep maxHours and maxHours
                    nextday_disabled = true
                } else if(maxDate_diff > 0){  // (curDate > maxDate)
                    maxHours = 0
                    maxMinutes = 0
                    nextday_disabled = true
                }
            }

            isAmpm = (timeformat === "AmPm")
            if (isAmpm) {
                if (curHours < 12){
                    curHoursAmpm = curHours;
                } else {
                    curHoursAmpm = curHours - 12;
                    curAmpm = 1;
                }
            }

        }  //  if (!!cur_datetime_local)

        const new_dict = {"cur_rosterdate_iso": cur_rosterdate_iso,
            "cur_datetime_iso": cur_datetime_iso, "cur_datetime_local": cur_datetime_local,
            "min_datetime_iso": min_datetime_iso, "min_datetime_local": min_datetime_local,
            "max_datetime_iso": max_datetime_iso, "max_datetime_local": max_datetime_local,
            "curDate": curDate, "curHours": curHours, "curMinutes": curMinutes, "curOffset": curOffset,
            "minHours": minHours, "maxHours": maxHours,
            "minMinutes": minMinutes, "maxMinutes": maxMinutes,
            "isAmpm": isAmpm, "curHoursAmpm": curHoursAmpm, "curAmpm": curAmpm,
            "prevday_disabled": prevday_disabled, "nextday_disabled": nextday_disabled,
            "comp_timezone": comp_timezone, "timeformat": timeformat
        }
        //console.log("new_dict")
        //console.log(new_dict)
        return new_dict
    }  // CalcMinMaxHoursMinutes
/*

// moved to table.js
//========= GetRosterdateLocal  ====================================
    function GetRosterdateLocal(data_rosterdate, comp_timezone) {
        // PR2019-07-07
        // function gets rosterdate from data_rosterdate: "2019-06-23 T 00:00:00Z"
        // converts it to moment object and set time to midnight
        let rosterdate_date_local;
        if (!!data_rosterdate  && !!comp_timezone){
            const rosterdate_datetime_local = moment.tz(data_rosterdate, comp_timezone)
            // cur_rosterdate_local:  2019-06-23 T 02:00:00 +02:00
            rosterdate_date_local = rosterdate_datetime_local.clone().startOf("day");
            // curRosterdate:  2019-06-23 T 00:00:00 +02:00
        };
        return rosterdate_date_local;
    }  // GetRosterdateLocal
*/

//========= GetDatetimeLocal  ====================================
    function GetDatetimeLocal(data_datetime, comp_timezone) {
        // PR2019-07-07
        let datetime_local;
        if (!!data_datetime && !!comp_timezone) {
            datetime_local = moment.tz(data_datetime, comp_timezone)
        };
        return datetime_local;
    }  // GetDatetimeLocal

//========= DatetimeWithinRange  ====================================
    function DatetimeWithinRange(cur_datetime, min_datetime, max_datetime) {
    // PR2019-07-07
        // within_range = false when cur_datetime is null
        let within_range = (!!cur_datetime);
        // within_range = false when min_datetime exists and cur_datetime < min_datetime
        if (within_range && !!min_datetime){
            if (cur_datetime.diff(min_datetime) < 0){
                within_range = false;
            }
        }
        // within_range = false when max_datetime exists and cur_datetime > min_datetime
        if (within_range && !!max_datetime){
            if (cur_datetime.diff(max_datetime) > 0){
                within_range = false;
            }
        }
        return within_range
    }  // DatetimeWithinRange



//========= HideSaveButtonOnQuicksave  ====================================
    function HideSaveButtonOnQuicksave(el_data, cls_hide) {
// hide save button on quicksave
        let btn_save = document.getElementById("id_timepicker_save")
        let btn_quicksave = document.getElementById("id_timepicker_quicksave")

// get quicksave from el_data
        let quicksave = get_quicksave_from_eldata(el_data);

        let txt_quicksave;
        if (quicksave){
            btn_save.classList.add(cls_hide);
            txt_quicksave = get_attr_from_el(el_data, "data-txt_quicksave_remove");
        } else {
            btn_save.classList.remove(cls_hide);
            txt_quicksave = get_attr_from_el(el_data, "data-txt_quicksave");
        }
        btn_quicksave.innerText = txt_quicksave
    }  //  HideSaveButtonOnQuicksave


//========= get_quicksave_from_eldata  ====================================
    function get_quicksave_from_eldata(el_data) {
        let quicksave = false;
        const qs = get_attr_from_el(el_data, "data-quicksave");
        if(qs.toLowerCase() === "true") {quicksave = true}
        return quicksave
    }
//========= save_quicksave_in_eldata  ====================================
    function save_quicksave_in_eldata(el_data, quicksave) {
        el_data.setAttribute("data-quicksave", quicksave)
    }

//========= RemoveHighlightFromCells  ====================================
    function RemoveHighlightFromCells(class_name, tbody, cls_highl) {
        let tds = tbody.getElementsByClassName(class_name);
        for (let x = 0, len = tds.length; x < len; x++) {
            tds[x].classList.remove(cls_highl);
        }
    }
//========= ShowHover  ====================================
    function ShowHover(td, event, cls_hover) {
        if(!!td){
            const disabled = (td.classList.contains("tr_disabled") || td.classList.contains("tsa_color_notallowed"))
            if (event.type === "mouseenter" && !disabled){
                td.classList.add(cls_hover)
            } else {
                td.classList.remove(cls_hover)}}
    }
//========= function pop_background_remove  ====================================
    function popupbox_removebackground(class_name){
        // remove selected color from all input popups
        let elements = document.getElementsByClassName(class_name);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }
// PR2019-07-01 before moment.tz it was:

    // date_as_ISOstring: "2019-06-25T07:00:00Z"  on screen: 9.00
    // datetime_utc = get_date_from_ISOstring(datetime_iso)
    // datetime_utc: Tue Jun 25 2019 03:00:00 GMT-0400 (Bolivia Time) datetime object
    // companyoffset stores offset from UTC to company_timezone in seconds
    // datetime_offset = datetime_utc.setSeconds(companyoffset + useroffset)
    // datetime_offset: 1561467600000 number
    // datetime_local = new Date(datetime_offset);
    // datetime_local: Tue Jun 25 2019 09:00:00 GMT-0400 (Bolivia Time) datetime object

    // datetime_iso     2019-06-25 T 20:15 :00Z string
    // datetime_utc     Tue Jun 25 2019 16:15:00 GMT-0400 (Bolivia Time) object
    // datetime_offset  1561515300000 number (timestamp)
    // datetime_local   Tue Jun 25 2019 22:15:00 GMT-0400 (Bolivia Time) object

    // date onscreen    is 22.15 u, timezone +2 u, stored als UTC time: 20.15 u
    // datetime_iso     is the ISO-string of the date stored in the database, UTC time: 20.15 u
    // datetime_utc     is the representation of the utc time in local timezone(-4 u):  16.15 u
    //                  function: new Date(Date.UTC(y,m,d,h,m)
    // datetime_offset  is the timestamp with correction for local timezone (-4 u) and company timezone (+2 u)
    //                  function: datetime.setSeconds(companyoffset + useroffset)
    //                  companyoffset: 7200 number (+2 u * 3600) useroffset: 14400 number (-4 u * -3600)
    // datetime_local   is the date format as shown on the screen: 22:15
    //                  function: new Date(datetime_offset)