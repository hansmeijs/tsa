
// NOT IN USE, I think PR2019-11-24
// ++++++++++++  OFFSET PICKER +++++++++++++++++++++++++++++++++++++++
    "use strict";

    const cls_visible_hide = "visibility_hide";
    const cls_visible_show = "visibility_show";
    const cls_highlighted = "tr_highlighted";
    const cls_notallowed = "tsa_color_notallowed";
    const cls_disabled = "tr_color_disabled";
    const cls_hover = "tr_hover";

//========= CreateTimepickerDate  ====================================
    function CreateTimepickerDate(el_data, curOffset, fieldname) {
        console.log( "--- CreateTimepickerDate  ", curOffset, fieldname );
        // display 'Previous day', 'Current day' and 'Next day' in header of el_timepicker, or 'Break'

    // add EventListeners to buttons
        // eventhandlers are added in scheme.js, to prevent multiple event handlers

        let date_str;
        if (fieldname === "breakduration"){
            date_str = get_attr_from_el(el_data, "data-txt_break");
        } else {

        // arr = [curDay, curRemainder, curHours, curMinutes, curDayHours]
            const arr = getCurDayHoursMinutes(curOffset)
            let curDay = arr[0];
            if(!curDay){curDay=0};

            if (curDay < 0){
                date_str = get_attr_from_el(el_data, "data-timepicker_prevday");
            } else if (curDay > 0){
                date_str = get_attr_from_el(el_data, "data-timepicker_nextday");
            } else {
                date_str = get_attr_from_el(el_data, "data-timepicker_curday");
            }
        }   //  if (fieldname === "breaduration")

        document.getElementById("id_timepicker_date").innerText = date_str

    }  // CreateTimepickerDate


 //========= CreateTimepickerHours  ====================================
    function CreateTimepickerHours(el_timepicker, el_data, timeformat, TimepickerSave) {
        console.log( "--- CreateTimepickerHours  ");

        let tbody = document.getElementById("id_timepicker_tbody_hour");
        tbody.innerText = null

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
                    CreateTimepickerCell(tbody, td, el_timepicker, el_data, "hour", hours, hour_text, timeformat, TimepickerSave)
                }
            }

// --- loop
        for (let i = 0; i < hourRows; i++) {
            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            for (let j = 0; j < 6; j++) {
                hours = (1+j) + (i*6)
                //if (hours === maxAllowedHours) {hours = 0 }
                hour_text = "00" + hours.toString()
                hour_text = hour_text.slice(-2);
                disabled = false

                td = tblRow.insertCell(-1);

                // skip last 00, zero is added at the first row
                if (hours !== 0) {
                    CreateTimepickerCell(tbody, td, el_timepicker, el_data, "hour", hours, hour_text, timeformat, TimepickerSave)
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
                CreateTimepickerCell(tbody, td, el_timepicker, el_data, "ampm", j, ampm_text, timeformat, TimepickerSave)
            }
        }
    }  //function CreateTimepickerHours

//========= CreateTimepickerMinutes  ====================================
    function CreateTimepickerMinutes(el_timepicker, el_data, interval) {
        //console.log( "=== CreateTimepickerMinutes  ");

// ---  set references to elements
        let tbody = document.getElementById("id_timepicker_tbody_minute");
        tbody.innerText = null

        const minHours = 0, maxHours = 24;
        const minMinutes = 0, maxMinutes = 60;

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
                    CreateTimepickerCell(tbody, td, el_timepicker, el_data, "minute", minutes, minutes_text)
                }
            }

    // --- loop through rows
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
                        CreateTimepickerCell(tbody, td, el_timepicker, el_data, "minute", minutes, minutes_text)}
                }
        }  // for (let i = 0,
        }  // if(interval === 60)
    }  //function CreateTimepickerMinutes

//========= CreateTimepickerCell  ====================================
    function CreateTimepickerCell(tbody, td, el_timepicker, el_data, data_name, value, value_text, timeformat, TimepickerSave) {
        //console.log( "--- CreateTimepickerCell  ");
        //console.log("data_name", data_name, "value", value, "value_text", value_text)

        if (value !== -1){td.setAttribute("data-" + data_name, value)}
        td.classList.add("timepicker_" + data_name);
        td.setAttribute("align", "center")
        if (data_name === "hour"){
            td.addEventListener("click", function() {
                SetHour(td, el_timepicker, el_data, value, timeformat, TimepickerSave)
            }, false)
        } else if (data_name === "minute"){
            td.addEventListener("click", function() {
                SetMinute(td, el_timepicker, el_data, value, timeformat)
            }, false)
        } else if (data_name === "ampm"){
            td.addEventListener("click", function() {
                SetAmPm(tbody, td)
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
    function SetPrevNextDay(el_timepicker, el_data, day_add, timeformat) {
        console.log("==== SetPrevNextDay  ===== ", day_add);
        console.log(el_timepicker);

// day_add is -1 (prev) or 1 (next)

// get curOffset from el_timepicker
        const fieldname = get_attr_from_el(el_timepicker, "data-field");
        let curOffset = get_attr_from_el_int(el_timepicker, "data-offset");
        const minOffset = get_attr_from_el_int(el_timepicker, "data-minoffset");
        const maxOffset = get_attr_from_el_int(el_timepicker, "data-maxoffset");
        console.log("curOffset ", curOffset, typeof curOffset);

// calculate newDay and newOffset
        if (!curOffset){curOffset = 0}
        // arr = [curDay, curRemainder, curHours, curMinutes, curDayHours]
        const arr = getCurDayHoursMinutes(curOffset)
        const curDay = arr[0];
        const curRemainder = arr[1];

        const minDay = Math.floor(minOffset/1440)  // - 90 (1.5 h)
        const maxDay = Math.floor(maxOffset/1440)  // - 90 (1.5 h)
        let newDay = curDay + day_add;
        if (newDay > 1){newDay = 1}
        if (newDay < -1){newDay = -1}
        const newOffset = (newDay * 1440) + curRemainder

        console.log( "curOffset", curOffset);
        console.log( "curDay", curDay);
        console.log( "curRemainder", curRemainder);
        console.log( "newDay", newDay);
        console.log( "newOffset", newOffset);

// put new offset back in el_timepicker data-offset
        el_timepicker.setAttribute("data-offset", newOffset);
        console.log("setAttribute newOffset ", newOffset, typeof newOffset);

// update header in Timepicker
        CreateTimepickerDate(el_data, newOffset)

        HighlightAndDisableHours(el_data, fieldname, newOffset, minOffset, maxOffset, timeformat);

    }  // SetPrevNextDay

//========= SetAmPm  ====================================
    function SetAmPm(tbody, td) {
        console.log("==== SetAmPm  =====");

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){
            const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
            const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");
        // get new ampm from td data-ampm of td
            const new_ampm = get_attr_from_el_int(td, "data-ampm");
            if (is_offset){
            // set new hour in new_datetime_local
                const cur_offset = get_attr_from_el(el_timepicker, "data-offset");

                // arr = [curDay, curRemainder, curHours, curMinutes, curDayHours]

                const arr = cur_offset.split(";")
                let newoffset = arr[0] + ";" + arr[1] + ";" + new_minutes.toString()

        // put new offset back in el_timepicker data-offset
                // TODO
                let within_range = true;
                if (within_range){
                    el_timepicker.setAttribute("data-offset", newoffset);
                    console.log("setAttribute newOffset ", newOffset, typeof newOffset);
                }

                const minHours = 0, maxHours = 24, minMinutes = 0, maxMinutes = 60;
                HighlightAndDisableHours(el_data, fieldname, curOffset, minOffset, maxOffset, timeformat);


            } else {

        //console.log("new_ampm", new_ampm, typeof new_ampm)
                const cur_rosterdate_iso = get_attr_from_el(el_timepicker, "data-rosterdate");
                const cur_datetime_iso = get_attr_from_el(el_timepicker, "data-datetime");
                const min_datetime_iso = get_attr_from_el(el_timepicker, "data-mindatetime");
                const max_datetime_iso = get_attr_from_el(el_timepicker, "data-maxdatetime");

                const is_offset = false, cur_offset = "";
                let dict = {} // TODO
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
                const new_dict = {}  // TODO

        // check if new datetime is within min max range
                const min_datetime_local = new_dict["min_datetime_local"];
                const max_datetime_local = new_dict["max_datetime_local"];
                const within_range = DatetimeWithinRange(new_datetime_local, min_datetime_local, max_datetime_local)

        // disable btn_save if new datetime is not within min max range
                let btn_save = document.getElementById("id_timepicker_save")
                btn_save.disabled = !within_range;

                const minHours = 0, maxHours = 24, minMinutes = 0, maxMinutes = 60;
                HighlightAndDisableHours(el_data, fieldname, curOffset, minOffset, maxOffset, timeformat);

        // put new datetime back in el_timepicker data-datetime
                if (within_range){
                    el_timepicker.setAttribute("data-datetime", new_datetime_iso);
                } // if (within_range)

            }  // if (is_offset)
        }  // if (!disabled)
    }  // SetAmPm

//========= SetHour  ====================================
    function SetHour(td, el_timepicker, el_data, newHours, timeformat, TimepickerSave) {
       console.log("==== SetHour  =====", newHours);
       console.log(el_timepicker);

        // only when cell is not disabled and not notallowed
        if (!td.classList.contains(cls_disabled) && !td.classList.contains(cls_notallowed)) {

    // get curOffset from el_timepicker
            const fieldname = el_timepicker.getAttribute("data-field")
            const curOffset = el_timepicker.getAttribute("data-offset")
            const minOffset = el_timepicker.getAttribute("data-minoffset")
            const maxOffset = el_timepicker.getAttribute("data-maxoffset")
            console.log("fieldname", fieldname)
            console.log("curOffset: " , curOffset, typeof curOffset)

            console.log("minOffset", minOffset)
            console.log( "maxOffset", maxOffset)

            // arr = [0: curDay, 1: curRemainder, 2: curHours, 3: curMinutes, 4: curDayHours]
            const arr = getCurDayHoursMinutes(curOffset)

    // create new offset and put back in el_timepicker
            let newOffset = arr[0] * 1440 + newHours * 60 + arr[3]


            if (newOffset > maxOffset) {newOffset = maxOffset}
            if (newOffset < minOffset) {newOffset = minOffset}

            el_timepicker.setAttribute("data-offset", newOffset);
            console.log("setAttribute newOffset ", newOffset, typeof newOffset);

        // save when in quicksave mode
            let quicksave = get_quicksave_from_eldata(el_data);
            if (quicksave){TimepickerSave("btn_hour")}

            HighlightAndDisableHours(el_data, fieldname, newOffset, minOffset, maxOffset, timeformat);


        }  // if (!disabled)
    }  // SetHour

//========= SetMinute  ====================================
    function SetMinute(td, el_timepicker, el_data, newMinutes, timeformat) {
        //console.log("==== SetMinute  =====", newMinutes);

    // only when cell is not disabled and not notallowed
        if (!td.classList.contains(cls_disabled) && !td.classList.contains(cls_notallowed)) {

    // get curOffset from el_timepicker
            const fieldname = el_timepicker.getAttribute("data-field")
            const curOffset = el_timepicker.getAttribute("data-offset")
            const minOffset = el_timepicker.getAttribute("data-minoffset")
            const maxOffset = el_timepicker.getAttribute("data-maxoffset")

            // arr = [0: curDay, 1: curRemainder, 2: curHours, 3: curMinutes, 4: curDayHours]
            const arr = getCurDayHoursMinutes(curOffset)

    // create new offset and put back in el_timepicker
            const newOffset = arr[0] * 1440 + arr[2] * 60 + newMinutes

            if (newOffset > maxOffset) {newOffset = maxOffset}
            if (newOffset < minOffset) {newOffset = minOffset}

            el_timepicker.setAttribute("data-offset", newOffset);
            console.log("setAttribute newOffset ", newOffset, typeof newOffset);
            //console.log("newMinutes", newMinutes, "newOffset", newOffset)
            HighlightAndDisableHours(el_data, fieldname, newOffset, minOffset, maxOffset, timeformat);

        }  // if (!disabled)
    }  // SetMinute


//========= HighlightAndDisableAmpm  ====================================
    function HighlightAndDisableAmpm(curOffset, minOffset, maxOffset, timeformat) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( ">>>>=== HighlightAndDisableAmpm  ");

        // arr = [curDay, curRemainder, curHours, curMinutes, curDayHours]
        const arr = getCurDayHoursMinutes(curOffset)
        const curDay = arr[0];
        const curRemainder = arr[1];
        const curHours = arr[2];
        const curMinutes = arr[3];
        const curDayHours = arr[4];

        const minDay = Math.floor(minOffset/1440);
        const minDayHours = Math.floor(minOffset/60)
        const minMinutes = minOffset - minDayHours * 60;

        const maxDay = Math.floor(maxOffset/1440);
        const maxDayHours = Math.floor(maxOffset/60)
        const maxMinutes = maxOffset - maxDayHours * 60;

        if (timeformat === "AmPm") {
            let curAmPm = 0;
            let curHoursAmpm = curHours;
            if (curHours >= 12){
                curHoursAmpm = curHours - 12;
                curAmPm = 1;
            }

            const tbody = document.getElementById("id_timepicker_tbody_hour");
            let tds = tbody.getElementsByClassName("timepicker_ampm")
            for (let i=0, td, cell_value, highlighted, within_range, disabled; td = tds[i]; i++) {
                cell_value = get_attr_from_el_int(td, "data-ampm");
                highlighted = (curAmPm === cell_value);
                //console.log("curAmPm", curAmPm, "cell_value", cell_value, "highlighted", highlighted)

                // am: period is from 00.00u till 12.00 u  pm: period is from 12.00u till 24.00 u
                // on current day AM is from offset 0-720, PM from 720-1440. Add/subtract 1440 for next/prev day
                const AM_or_PM_min = (curDay * 1440 + cell_value * 720);
                const AM_or_PM_max = (AM_or_PM_min + 720);
                const AM_or_PM_within_range = period_within_range(AM_or_PM_min, AM_or_PM_max, minOffset, maxOffset)
                //console.log("minOffset", minOffset, "maxOffset", maxOffset)
                //console.log("AM_or_PM_min", AM_or_PM_min, "AM_or_PM_max", AM_or_PM_max, "within_range", AM_or_PM_within_range)

                disabled = !AM_or_PM_within_range;

                //console.log("highlighted", highlighted, "cls_hover", cls_hover, "cls_highl", cls_highlighted)
                HighlightAndDisableCell(td, disabled, highlighted);
            }
        }  //  if (timeformat === 'AmPm') {
    }  // HighlightAndDisableAmpm


//========= period_within_range  ====================================
    function period_within_range(outer_min, outer_max, inner_min, inner_max) {
        // PR2019-08-04 Note: period is also out of range when diff === 0
        return (inner_min < outer_max && inner_max > outer_min)
    }

//========= HighlightAndDisableHours  ====================================
    function HighlightAndDisableHours(el_data, fieldname, curOffset, minOffset, maxOffset, timeformat) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( " --- HighlightAndDisableHours --- ");
        //console.log( "minOffset", minOffset, "curOffset", curOffset, "maxOffset", maxOffset);

        // arr = [curDay, curRemainder, curHours, curMinutes, curDayHours]
        const arr = getCurDayHoursMinutes(curOffset)
        const curDay = arr[0];
        const curRemainder = arr[1];
        const curHours = arr[2];
        const curMinutes = arr[3];
        const curDayHours = arr[4];

        //console.log("curOffset", curOffset)
        //console.log("curDay", curDay)
        //console.log("curRemainder", curRemainder)
        //console.log("curHours", curHours);
        //console.log("curMinutes", curMinutes);

        const minDay = Math.floor(minOffset/1440);
        const minDayHours = Math.floor(minOffset/60)
        const minMinutes = minOffset - minDayHours * 60;

        const maxDay = Math.floor(maxOffset/1440);
        const maxDayHours = Math.floor(maxOffset/60)
        const maxMinutes = maxOffset - maxDayHours * 60;

//========= DisableBtnPrevNextDay  ====================================
        const prevday_disabled = (curDay <= minDay) || (fieldname === "breakduration");
        const nextday_disabled = (curDay >= maxDay) || (fieldname === "breakduration");

        let el_btn_prevday = document.getElementById("id_timepicker_prevday");
        let el_btn_nextday = document.getElementById("id_timepicker_nextday");

        if(prevday_disabled) {
            el_btn_prevday.classList.add(cls_visible_hide)
            el_btn_prevday.classList.remove(cls_visible_show)
        } else {
            el_btn_prevday.classList.add(cls_visible_show)
            el_btn_prevday.classList.remove(cls_visible_hide)
        }
        if(nextday_disabled){
            el_btn_nextday.classList.add(cls_visible_hide)
            el_btn_nextday.classList.remove(cls_visible_show)
        } else {
            el_btn_nextday.classList.add(cls_visible_show)
            el_btn_nextday.classList.remove(cls_visible_hide)
        }

//========= CreateTimepickerDate  ====================================
        //console.log( "--- CreateTimepickerDate  ", curOffset, fieldname );
        // display 'Previous day', 'Current day' and 'Next day' in header of el_timepicker, or 'Break'
    // add EventListeners to buttons
        // eventhandlers are added in scheme.js, to prevent multiple event handlers

        let date_str;
        if (fieldname === "breakduration"){
            date_str = get_attr_from_el(el_data, "data-txt_break");
        } else {
            if (curDay < 0){
                date_str = get_attr_from_el(el_data, "data-timepicker_prevday");
            } else if (curDay > 0){
                date_str = get_attr_from_el(el_data, "data-timepicker_nextday");
            } else {
                date_str = get_attr_from_el(el_data, "data-timepicker_curday");
            }
        }
        document.getElementById("id_timepicker_date").innerText = date_str


//========= HighlightAndDisableAmpm  ====================================
        if (timeformat === "AmPm") {
            HighlightAndDisableAmpm(curOffset, minOffset, maxOffset, timeformat)
        };

//========= HighlightAndDisableHours  ====================================
        // 1. all hours are disabled if (curDay < minDay) or (curDay > maxDay), Value of minDay = -1 or 0, Value of maxDay = 0 or 1
        // 2. all hours are enabled if (curDay > minDay) and (curDay < maxDay)
        // 3. part of hours are disabled if (curDay = minDay) or (curDay = maxDay)
        // 4. if curHour is disabled: minutes are also disabled

        const tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        const tds_hour = tbody_hour.getElementsByClassName("timepicker_hour")

        for (let i=0, td, cell_value, cell_offset_hour, highlighted, disabled; td = tds_hour[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-hour");
            cell_offset_hour = curDay * 24 + cell_value

            highlighted = (curHours === cell_value);

            if (fieldname === "XXoffsetstart"){
                disabled = (cell_offset_hour < minDayHours || cell_offset_hour >= maxDayHours)
            } else if (fieldname === "XXoffsetend"){
                disabled = (cell_offset_hour <= minDayHours || cell_offset_hour > maxDayHours)
            }  else {
                disabled = (cell_offset_hour < minDayHours || cell_offset_hour > maxDayHours)
            }

            HighlightAndDisableCell(td, disabled, highlighted);
        }

    //========= HighlightAndDisableMinutes  ====================================
        //console.log( "--------- HighlightAndDisableMinutes  ");

        // all minutes are disabled if curDate outside min-max DayHours
        const all_disabled = (curDayHours < minDayHours || curDayHours > maxDayHours )
        // all minutes are enabled if curDayHours within min-max DayHours
        const none_disabled = (curDayHours > minDayHours && curDayHours < maxDayHours )
        // else: check with value of minutes

        const tbody_minute = document.getElementById("id_timepicker_tbody_minute");
        const tds_minute = tbody_minute.getElementsByClassName("timepicker_minute")
        for (let i=0, td; td = tds_minute[i]; i++) {
            const cell_value = get_attr_from_el_int(td, "data-minute");

        // create new offset and put back in el_timepicker
            const newOffset = curDayHours * 60 + cell_value
            //console.log( "newOffset", newOffset,  " minOffset",  minOffset,  "maxOffset", maxOffset);

            let disabled=false;
            if (!none_disabled){
                disabled = (all_disabled || newOffset < minOffset || newOffset > maxOffset)
            }

            const highlighted = (curMinutes === cell_value);
            //console.log( "disabled", disabled, "highlighted", highlighted);
            HighlightAndDisableCell(td, disabled, highlighted);
        }
    }  // HighlightAndDisableHours

//========= HighlightAndDisableCell  ====================================
    function HighlightAndDisableCell(td, disabled, highlighted) {
        //console.log(" ======== HighlightAndDisableCell  ==========")
        //console.log("disabled: ", disabled, "highlighted: ", highlighted)
        if (!!disabled){
            td.classList.add(cls_disabled);
            td.classList.remove(cls_highlighted)
            if (!!highlighted){
                td.classList.add(cls_notallowed)
            } else {
                td.classList.remove(cls_notallowed)
            }
        } else {
            td.classList.remove(cls_disabled)
            if (!!highlighted){
                td.classList.add(cls_highlighted)
            } else {
                td.classList.remove(cls_highlighted)
            }
            td.classList.remove(cls_notallowed)
        }
    }  // HighlightAndDisableCell


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
//========= ShowHover  ====================================
    function ShowHover(td, event, cls_hover) {
        if(!!td){
            const disabled = (td.classList.contains(cls_disabled) || td.classList.contains(cls_notallowed))
            if (event.type === "mouseenter" && !disabled){
                td.classList.add(cls_hover)
            } else {
                td.classList.remove(cls_hover)}}
    }
//========= getCurDayHoursMinutes  ====================================
    function getCurDayHoursMinutes(curOffset){
        let curDay = null, curRemainder = null, curHours = null, curMinutes = null, curDayHours = null;
        if (curOffset != null){
            // display 24:00 u instead of 0:00 next day,
            if (curOffset === 1440){
                curDay = 0;
            } else {
                // curOffset = - 90 means 1.5 h before midnight
                curDay = Math.floor(curOffset/1440);
            }
            curRemainder = (curOffset - curDay * 1440);
            curHours = Math.floor(curRemainder / 60);
            curMinutes = curRemainder - curHours * 60;
            curDayHours = Math.floor(curOffset/60);
        }
        return [curDay, curRemainder, curHours, curMinutes, curDayHours];
    }