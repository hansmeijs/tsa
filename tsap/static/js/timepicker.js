
// ++++++++++++  TIMEPICKER +++++++++++++++++++++++++++++++++++++++
    "use strict";


// close el_timepicker
// add EventListener to document to close popup windows
        document.addEventListener('click', function (event) {
            let close_popup = true
            let el_timepicker = document.getElementById("id_timepicker")
            // event.target identifies the element on which the event occurred, i.e: on which is clicked
            if (event.target.classList.contains("input_timepicker")) {close_popup = false} else
            if (el_timepicker.contains(event.target) && !event.target.classList.contains("timepicker_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide)
                };
        }, false);


//========= OpenTimepicker  ====================================
    function OpenTimepicker(el_input, UploadTimepickerChanged, tp_dict, st_dict) {
        console.log("===  OpenTimepicker  =====");
        console.log( "tp_dict: ", tp_dict);
        console.log( "st_dict: ", st_dict);

        CalcMinMax(tp_dict)

// display cur_datetime_local in header of el_timepicker
        CreateHeader(tp_dict, st_dict);

        document.getElementById("id_timepicker_date").innerText = get_header_date(tp_dict, st_dict)

        CreateFooter(tp_dict, st_dict, UploadTimepickerChanged);
        CreateTimepickerHours(UploadTimepickerChanged, tp_dict, st_dict);
        CreateTimepickerMinutes(UploadTimepickerChanged, tp_dict, st_dict);

        if (tp_dict["isampm"]) {HighlightAndDisableAmpm(UploadTimepickerChanged, tp_dict, st_dict)}
        HighlightAndDisableHours(tp_dict);
        HighlightAndDisableMinutes(tp_dict)

// ---  position popup under el_input
        let el_timepicker = document.getElementById("id_timepicker")
        let popRect = el_timepicker.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();

        const pop_width = 180; // to center popup under input box
        const correction_left = -240 - pop_width/2 ; // -240 because of sidebar
        const correction_top = -32; // -32 because of menubar

        let topPos = inpRect.top + inpRect.height + correction_top;
        let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;

        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_timepicker.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        popupbox_removebackground("input_timepicker");
        el_input.classList.add("pop_background");

// hide save button on quicksave
        HideSaveButtonOnQuicksave(tp_dict, st_dict);

// ---  show el_popup
        el_timepicker.classList.remove("display_hide");

    }; // function OpenTimepicker

//========= CreateHeader  ====================================
    function CreateHeader(tp_dict, st_dict) {
        //console.log( "--- CreateHeader  ");

        let el_header = document.getElementById("id_timepicker_header")
        el_header.innerText = null
        let btn_prevday = document.createElement("button");
            btn_prevday.setAttribute("id", "id_btn_prev")
            btn_prevday.innerText = "<-"
            btn_prevday.setAttribute("type", "button")
            btn_prevday.addEventListener("click", function () {
                SetPrevNextDay("prevday", tp_dict, st_dict)}, false)
        el_header.appendChild(btn_prevday);

        let lbl_header = document.createElement("a");
            lbl_header.setAttribute("id", "id_timepicker_date")
            lbl_header.classList.add("mt-1")
        el_header.appendChild(lbl_header);

        let btn_nextday = document.createElement("button");
            btn_nextday.setAttribute("id", "id_btn_next");
            btn_nextday.innerText = "->"
            btn_nextday.setAttribute("type", "button")
            btn_nextday.addEventListener("click", function () {
                SetPrevNextDay("nextday", tp_dict, st_dict)}, false)
        el_header.appendChild(btn_nextday);
    }  // CreateHeader

//========= CreateFooter  ====================================
    function CreateFooter(tp_dict, st_dict, UploadTimepickerChanged) {
        //console.log( "--- CreateFooter  ");
        //console.log("tp_dict", tp_dict);

        // btn_quicksave.innerText is set in HideSaveButtonOnQuicksave

        let el_footer = document.getElementById("id_timepicker_footer")
        el_footer.innerText = null
        let div_left = document.createElement("div");
            div_left.classList.add("content_subheader_left")
            div_left.classList.add("p-1")
            let btn_quicksave = document.createElement("a");
                btn_quicksave.setAttribute("id", "id_timepicker_quicksave")
                btn_quicksave.classList.add("p-1")
                btn_quicksave.classList.add("pointer_show")
                btn_quicksave.addEventListener("click", function() {
                        HandleTimepickerSave(tp_dict, st_dict, UploadTimepickerChanged, "btn_qs")}, false )
                btn_quicksave.addEventListener("mouseenter", function(){btn_quicksave.classList.add("tr_hover")});
                btn_quicksave.addEventListener("mouseleave", function(){btn_quicksave.classList.remove("tr_hover")});

            div_left.appendChild(btn_quicksave);
        el_footer.appendChild(div_left);

        if(st_dict["show_btn_delete"] && tp_dict["offset"] != null){
            let btn_delete = document.createElement("button");
                btn_delete.setAttribute("type", "button")
                btn_delete.classList.add("timepicker_close")
                btn_delete.addEventListener("click", function() {
                    HandleTimepickerSave(tp_dict, st_dict, UploadTimepickerChanged, "btn_delete")}, false )
                AppendChildIcon(btn_delete, st_dict["imgsrc_delete"], "18")
            el_footer.appendChild(btn_delete);
        }

        let btn_save = document.createElement("button");
            btn_save.setAttribute("id", "id_timepicker_save")
            btn_save.setAttribute("type", "button")
            btn_save.innerText = st_dict["txt_save"];
            btn_save.classList.add("timepicker_close")
            btn_save.addEventListener("click", function() {
                HandleTimepickerSave( tp_dict, st_dict, UploadTimepickerChanged, "btn_save")}, false )
        el_footer.appendChild(btn_save);
    }  // CreateFooter

 //========= CreateTimepickerHours  ====================================
    function CreateTimepickerHours(UploadTimepickerChanged, tp_dict, st_dict) {
        //console.log( "--- CreateTimepickerHours  ");

        let tbody = document.getElementById("id_timepicker_tbody_hour");
        tbody.innerText = null

        const isampm = tp_dict["isampm"]; // timeformat = 'AmPm' or '24h'

        let maxAllowedHours = 24;
        let hourRows = 4;

        if (isampm) {
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
                if(isampm){hour_text = "12"} else { hour_text = "00"};
                CreateTimepickerCell(tbody, td, UploadTimepickerChanged, tp_dict, st_dict,
                                    "hour", hours, hour_text)
            }
        }

// --- loop
        for (let i = 0; i < hourRows; i++) {
            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            for (let j = 0; j < 6; j++) {
                hours = (1+j) + (i*6)
                // TODO show 24 on last row, make day next day with hour 0
                if (hours === maxAllowedHours) {hours = 0 }
                hour_text = "00" + hours.toString()
                hour_text = hour_text.slice(-2);
                disabled = false

                td = tblRow.insertCell(-1);

                // skip last 00, zero is added at the first row
                if (hours !== 0) {
                    CreateTimepickerCell(tbody, td, UploadTimepickerChanged, tp_dict, st_dict,
                                        "hour", hours, hour_text)
                }
            }
        }  // for (let i = 0,
        if(isampm){

            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            td.setAttribute("colspan",6)

            for (let j = 0, td, el_a, ampm_text; j < 2; j++) {
                if(j === 0) {ampm_text = "AM"} else {ampm_text = "PM"}

                td = tblRow.insertCell(-1);
                td.setAttribute("colspan",3)
                CreateTimepickerCell(tbody, td, UploadTimepickerChanged, tp_dict, st_dict,
                                    "ampm", j, ampm_text)
            }
        }
    }  //function CreateTimepickerHours

//========= CreateTimepickerMinutes  ====================================
    function CreateTimepickerMinutes(UploadTimepickerChanged, tp_dict, st_dict) {
        //console.log( "=== CreateTimepickerMinutes  ");

// ---  set references to elements
        let tbody = document.getElementById("id_timepicker_tbody_minute");
        tbody.innerText = null

        // hide minutes tables when interval = 60
        let el_cont_minute = document.getElementById("id_timepicker_cont_minute");
        const interval = st_dict["interval"];
        if(interval === 60) {
            el_cont_minute.classList.add("display_hide")
        } else {
            el_cont_minute.classList.remove("display_hide")

            let minutes = 0, minutes_text;
            let rows = 0, columns = 0;
            if ([1, 2].indexOf( interval ) > -1){rows = 6} else
            if ([3, 5].indexOf( interval ) > -1){rows = 4} else
            if ([10, 15].indexOf( interval ) > -1){rows = 2} else
            if ([12, 20, 30].indexOf( interval ) > -1){rows = 1}
            columns = (60 / interval / rows)

    // --- add '00' on separate row
            let tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            for (let j = 0, td; j < columns; j++) {
                td = tblRow.insertCell(-1);
                if (j === 0 ) {
                    minutes = 0; minutes_text = "00";
                    td.setAttribute("data-minute", minutes);
                    CreateTimepickerCell(tbody, td, UploadTimepickerChanged, tp_dict, st_dict,
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
                        CreateTimepickerCell(tbody, td, UploadTimepickerChanged, tp_dict, st_dict,
                                            "minute", minutes, minutes_text)}
                }
        }  // for (let i = 0,
        }  // if(interval === 60)
    }  //function CreateTimepickerMinutes

//========= CreateTimepickerCell  ====================================
    function CreateTimepickerCell(tbody, td, UploadTimepickerChanged, tp_dict, st_dict,
                                  data_name, value, value_text) {

        if (value !== -1){td.setAttribute("data-" + data_name, value)}
        td.classList.add("timepicker_" + data_name);
        td.setAttribute("align", "center")
        if (data_name === "hour"){
            td.addEventListener("click", function() {
                SetHour(tbody, td, UploadTimepickerChanged, tp_dict, st_dict)
            }, false)
        } else if (data_name === "minute"){
            td.addEventListener("click", function() {
                SetMinute(tbody, td, UploadTimepickerChanged, tp_dict, st_dict)
            }, false)
        } else if (data_name === "ampm"){
            td.addEventListener("click", function() {
                SetAmPm(tbody, td, UploadTimepickerChanged, tp_dict, st_dict)
            }, false)
        }

        // add hover EventListener
        td.addEventListener("mouseenter", function(event) {ShowHover(td, event, "tr_hover")}, false)
        td.addEventListener("mouseleave", function() {ShowHover(td, event, "tr_hover")}, false)

        let el_a = document.createElement("a");
        el_a.innerText = value_text
        td.appendChild(el_a);

    }  // CreateTimepickerCell

//========= SetPrevNextDay  ====================================
    function SetPrevNextDay(type_str, tp_dict, st_dict) {
        //console.log("==== SetPrevNextDay  ===== ", type_str);

    // make offset 0 when null
        if(tp_dict["offset"] == null ){
            tp_dict["offset"] = 0
            CalcMinMax(tp_dict)
        };
        const offset =  tp_dict["offset"]
        const curDayOffset =  tp_dict["curDayOffset"]
        const minDayOffset =  tp_dict["minDayOffset"]
        const maxDayOffset =  tp_dict["maxDayOffset"]

    // set  day_add to 1 or -1
        let day_add = (type_str === "prevday") ? -1 : 1;

        const curRemainder = tp_dict["offset"] - curDayOffset * 1440;

        let new_day_offset = curDayOffset + day_add;
        if (new_day_offset < minDayOffset){new_day_offset = minDayOffset}
        if (new_day_offset > maxDayOffset){new_day_offset = maxDayOffset}
        //console.log("new_day_offset", new_day_offset);

        CalcMinMax_with_newValues(tp_dict, new_day_offset, null, null)

    // show new date, also when not in range
        document.getElementById("id_timepicker_date").innerText = get_header_date(tp_dict, st_dict)

        HighlightAndDisableHours(tp_dict);
        HighlightAndDisableMinutes(tp_dict)
    }  // SetPrevNextDay

//========= SetAmPm  ====================================
    function SetAmPm(tbody, td, UploadTimepickerChanged, tp_dict, st_dict) {
        //console.log("==== SetAmPm  =====");

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){
            const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
        // get new ampm from td data-ampm of td
            const new_ampm = get_attr_from_el_int(td, "data-ampm");

        // set new hour in new_datetime_local
            // TODO correct
            const cur_offset = get_attr_from_el(el_timepicker, "data-offset");
            const arr = cur_offset.split(";")
            let new_offset = arr[0] + ";" + arr[1] + ";" + new_minutes.toString()

    // put new offset back in el_timepicker data-offset
            // TODO correct
            let within_range = true;
            if (within_range){
                el_timepicker.setAttribute("data-offset", new_offset);
            //console.log("setAttribute new_offset ", new_offset, typeof new_offset);

            }

            if (tp_dict["isampm"]) { HighlightAndDisableAmpm(UploadTimepickerChanged, tp_dict)};
            const curHours = tp_dict["curHours"], minHours = tp_dict["minHours"], maxHours = tp_dict["maxHours"];
            const curMinutes = tp_dict["curMinutes"], minMinutes = tp_dict["minMinutes"], maxMinutes = tp_dict["maxMinutes"];
            HighlightAndDisableHours(tp_dict);
            HighlightAndDisableMinutes(tp_dict)


        }  // if (!disabled)
    }  // SetAmPm

//========= SetHour  ====================================
    function SetHour(tbody, td, UploadTimepickerChanged, tp_dict, st_dict) {
       //console.log("==== SetHour  =====");
        //console.log("tp_dict", tp_dict);

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        //console.log("disabled", disabled);

        if (!disabled){
        // get new hour from data-hour of td
            const newHours = get_attr_from_el_int(td, "data-hour");
    // recalculate values of tp_dict
            CalcMinMax_with_newValues(tp_dict, null, newHours, null);

    // save when in quicksave mode
            if (tp_dict["quicksave"]){
                HandleTimepickerSave(tp_dict, st_dict, UploadTimepickerChanged, "btn_hour")
            }

            if (tp_dict["isampm"]) { HighlightAndDisableAmpm(UploadTimepickerChanged, new_dict, st_dict)};

            HighlightAndDisableHours(tp_dict);
            HighlightAndDisableMinutes(tp_dict);

        }  // if (!disabled)
    }  // SetHour

//========= SetMinute  ====================================
    function SetMinute(tbody, td, UploadTimepickerChanged, tp_dict, st_dict) {
        //console.log("==== SetMinute  =====");

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){

    // get new minutes from data-minute of td
            const newMinutes = get_attr_from_el_int(td, "data-minute");
    // recalculate values of tp_dict
            CalcMinMax_with_newValues(tp_dict, null, null, newMinutes);

            HighlightAndDisableMinutes(tp_dict);

        }  // if (!disabled)
    }  // SetMinute

//=========  HandleTimepickerSave  ================ PR2019-06-27
    function HandleTimepickerSave(tp_dict, st_dict, UploadTimepickerChanged, mode) {
        console.log("===  function HandleTimepickerSave =========", mode);
        //console.log(tp_dict);

// ---  change quicksave when clicked on button 'Quicksave'

// ---  btn_save  >       send new_offset      > close timepicker
//      btn_quick > on  > send new_offset + qs > close timepicker (next time do.t show btn_save)
//                > off > send qs only         > don't close timepicker > show btn_save)

        let quicksave = tp_dict["quicksave"]

        let save_changes = false;
    // close timepicker, except when clicked on quicksave off
        if (mode === "btn_save") {
            save_changes = true;
        } else if (mode === "btn_qs") {
// ---  toggle quicksave
            quicksave = !quicksave
            tp_dict["quicksave"] = quicksave
            if(quicksave){
                save_changes = true;
            } else {
                HideSaveButtonOnQuicksave(tp_dict, st_dict);
            }
// --- upload quicksave in Usersettings
            const url_settings_upload = get_dict_value_by_key(st_dict, "url_settings_upload")
            const setting_dict = {"quicksave": {"value": quicksave}};
            UploadSettings (setting_dict, url_settings_upload);

            // without 'save_changes'

            UploadTimepickerChanged(tp_dict);

        } else if (mode === "btn_hour") {
            if(quicksave){
                save_changes = true
            };
        } else if (mode === "btn_delete") {
            tp_dict["offset"] = null;

            CalcMinMax(tp_dict)
            save_changes = true;
        }

        if(save_changes){
            //console.log( ">>>>=== save_changes  ");
            popupbox_removebackground("input_timepicker");

            let el_timepicker = document.getElementById("id_timepicker")
            el_timepicker.classList.add("display_hide");
            // save only when offset is within range or null (when changing date hour/minumtes can go outside min/max range)
            //console.log( ">>>> tp_dict: ", tp_dict);
            //console.log("JSON.stringify: ", JSON.stringify(tp_dict));

            const within_range = tp_dict["within_range"];
            //console.log( ">>>>=== within_range", within_range, typeof within_range);
            if(tp_dict["within_range"]){
                tp_dict["save_changes"] = true;
                UploadTimepickerChanged(tp_dict);
            }
        }
    }  // HandleTimepickerSave


//========= HighlightAndDisableAmpm  ====================================
    function HighlightAndDisableAmpm(UploadTimepickerChanged, tp_dict, st_dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( ">>>>=== HighlightAndDisableAmpm  ");
        //TODO check and fix
        //const curDate_is_rosterdate = dict["curDate_is_rosterdate"];
        //const prevday_disabled = dict["prevday_disabled"];
        // const nextday_disabled = dict["nextday_disabled"];

        const curDate = tp_dict["curDate"]
        //const curDateMidnight  = curDate.clone()
        //const curDateMidday = curDate.clone().hour(12);
        //const curDateEndOfDay = curDate.clone().add(1, 'days');

        //const range_min = tp_dict["min_datetime_local"];
        //const range_max = tp_dict["max_datetime_local"];

        let curAmPm = tp_dict["curAmpm"];
        let curHoursAmpm = tp_dict["curHoursAmpm"];
        //console.log("curAmPm", curAmPm, "curHoursAmpm", curHoursAmpm);

        if (tp_dict["isampm"]) {
            const tbody = document.getElementById("id_timepicker_tbody_hour");
            let tds = tbody.getElementsByClassName("timepicker_ampm")
            for (let i=0, td, cell_value, highlighted, period_within_range, disabled; td = tds[i]; i++) {
                cell_value = get_attr_from_el_int(td, "data-ampm");
                highlighted = (curAmPm === cell_value);
                //console.log("curAmPm", curAmPm, "cell_value", cell_value, "highlighted", highlighted)

                let period_min, period_max // am: period is from 00.00u till 12.00 u  pm: period is from 12.00u till 24.00 u
                if (cell_value === 0){
                    //period_min =  curDateMidnight;
                    //period_max =  curDateMidday;
                 } else {
                    //period_min =  curDateMidday;
                    //period_max =  curDateEndOfDay;
                }
                //period_within_range = PeriodWithinRange(period_min, period_max, range_min, range_max)
                //console.log("period_min", period_min.format(), "period_max", period_max.format())
                //console.log("range_min", range_min.format(), "range_max", range_max.format())
                //console.log("period_within_range", period_within_range)

                disabled = !period_within_range;

                HighlightAndDisableCell(td, disabled, highlighted);
            }
        }  //  if (timeformat === 'AmPm') {
    }  // HighlightAndDisableAmpm

//========= HighlightAndDisableHours  ====================================
    function HighlightAndDisableHours(tp_dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( "--------- HighlightAndDisableHours  ");
        CalcMinMax(tp_dict)

        const curHours = tp_dict["curHours"]
        const minHours = tp_dict["minHours"]
        const maxHours = tp_dict["maxHours"]
        //console.log( "curHours", curHours,  "minHours", minHours,  "maxHours", maxHours);

        let curHourDisabled = false;
        let tbody = document.getElementById("id_timepicker_tbody_hour");
        let tds = tbody.getElementsByClassName("timepicker_hour")
        for (let i=0, td, cell_value, cell_value_ampm, highlighted, disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-hour");
            highlighted = (curHours === cell_value);
            disabled = (cell_value < minHours || cell_value > maxHours)
            if (highlighted){curHourDisabled = disabled}
            HighlightAndDisableCell(td, disabled, highlighted);
        }
    }  // HighlightAndDisableHours

//========= HighlightAndDisableMinutes  ====================================
    function HighlightAndDisableMinutes(tp_dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( "--------->>>>=== HighlightAndDisableMinutes  ");
        //console.log( "tp_dict[curMinutes]", tp_dict["curMinutes"]);
        //console.log( tp_dict);

        const curHourDisabled = (tp_dict["curHours"] < tp_dict["minHours"] || tp_dict["curHours"] > tp_dict["maxHours"]);
       //console.log("curHourDisabled", curHourDisabled);
       //console.log("curMinutes", tp_dict["curMinutes"], "minMinutes", tp_dict["minMinutes"], "maxMinutes", tp_dict["maxMinutes"]);

        let tbody = document.getElementById("id_timepicker_tbody_minute");
        let tds = tbody.getElementsByClassName("timepicker_minute")
        for (let i=0, td, cell_value, highlighted, disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-minute");
            disabled = (curHourDisabled || cell_value < tp_dict["minMinutes"] || cell_value > tp_dict["maxMinutes"])
            highlighted = (tp_dict["curMinutes"] === cell_value);
            HighlightAndDisableCell(td, disabled, highlighted);
        }
    }  // HighlightAndDisableMinutes

//========= HighlightAndDisableCell  ====================================
    function HighlightAndDisableCell(td, disabled, highlighted) {
        //console.log(td, "disabled: ", disabled, "highlighted: ", highlighted)
        td.classList.remove("tr_highlighted")
        if (!!disabled){
            td.classList.add("tr_color_disabled");
            td.classList.remove("tr_highlighted")
            if (!!highlighted){
                td.classList.add("tsa_color_notallowed")
            } else {
                td.classList.remove("tsa_color_notallowed")
            }
        } else {
            td.classList.remove("tr_color_disabled")
            td.classList.remove("tsa_color_notallowed")
            if (!!highlighted){
                td.classList.add("tr_highlighted")
            } else {
                td.classList.remove("tr_highlighted")
            }
        }

    }  // HighlightAndDisableCell

//========= CalcMinMax_with_newValues  ==================================== PR2018-11-08
function CalcMinMax_with_newValues(tp_dict, newDayOffset, newHours, newMinutes) {

// get curHours and curMinutes from curOffset in tp_dict
        const curOffset = tp_dict["offset"];
        const minOffset = tp_dict["minoffset"];
        const maxOffset = tp_dict["maxoffset"];

        const curDayOffset = Math.floor(curOffset/1440)  // - 90 (1.5 h)
        const remainder = curOffset - curDayOffset * 1440
        const curHours = Math.floor(remainder/60)
        const curMinutes = remainder - curHours * 60

        if(newDayOffset == null){newDayOffset = curDayOffset};
        if(newHours == null){newHours = curHours};
        if(newMinutes == null){newMinutes = curMinutes};

        const newOffset = newDayOffset * 1440 + newHours * 60 + newMinutes
        //console.log("newOffset ", newOffset, typeof newOffset);

// put new offset back in dict
        tp_dict["offset"] = newOffset

// re calculate values of tp_dict
        CalcMinMax(tp_dict)
}

//========= CalcMinMax  ==================================== PR2018-08-02
function CalcMinMax(dict) {
        //console.log(" --- CalcMinMax ---")

        const curOffset = dict["offset"];
        const minOffset = dict["minoffset"];
        const maxOffset = dict["maxoffset"];

        if(minOffset == null){minOffset = 0};
        if(maxOffset == null){maxOffset = 1440};

        let curDayOffset = null, curRemainder = null, curHours = null, curMinutes = null, curHoursAmpm = null;
        let prevday_disabled = false, nextday_disabled = false;
        if (curOffset != null){
            curDayOffset = Math.floor(curOffset/1440);  // - 90 (1.5 h)
            curRemainder = curOffset - curDayOffset * 1440;
            curHours = Math.floor(curRemainder/60);
            curMinutes = curRemainder - curHours * 60;
        };
        if(curDayOffset == null){curDayOffset = 0}

        let minDayOffset = Math.floor(minOffset/1440);  // - 90 (1.5 h)
        let minRemainder = minOffset - minDayOffset * 1440;
        let minHours = Math.floor(minRemainder/60);
        let minMinutes = minRemainder - minHours * 60;

        let maxDayOffset = Math.floor(maxOffset/1440);  // - 90 (1.5 h)
        let maxRemainder = maxOffset - maxDayOffset * 1440;
        let maxHours = Math.floor(maxRemainder/60);
        let maxMinutes = maxRemainder - maxHours * 60;

        if(minDayOffset < curDayOffset){  //  (minDate < curDate)
            minHours = 0
            minMinutes = 0
        } else if(minDayOffset === curDayOffset){  // (minDate = curDate)
            // minHours =  Math.floor(minRemainder/60);
            if (curHours < minHours) {
                minMinutes = 99  // also 0 not allowed
            } else  if (curHours > minHours) {
                minMinutes = 0
            }
            // else if (curHours === minHours) : minMinutes = minRemainder - minHours * 60;
        } else {  // if(minDayOffset > curDayOffset){  // (minDate > curDate)
            minHours = 99
            minMinutes = 99
        }

    // calc maxHours and maxMinutes
        // debug: max_datetime_local 2019-03-31T00:00:00+01:00
        //          gives maxDate 2019-03-31T00:00:00+01:00
        //          must be:  maxDate 2019-03-30
        if (curDayOffset == null || (maxHours === 0 && maxMinutes === 0 )){
            maxDayOffset -= 1;
            maxHours = 24
            maxMinutes = 60
        } else {
            if (curHours < maxHours) {
                maxMinutes = 60
            } else  if (curHours === maxHours) {
                // maxMinutes = max_datetime_local.minute()
            } else  if (curHours > maxHours) {
                maxMinutes = -1 // also 0 not allowed
            }
        }
        if(curDayOffset == null || curDayOffset < maxDayOffset){  // (curDate < maxDate)
            maxHours = 24
            maxMinutes = 60
        } else if(curDayOffset === maxDayOffset){  // (curDate = maxDate)
            // keep maxHours and maxHours
        } else if(curDayOffset > maxDayOffset){  // (curDate > maxDate)
            maxHours = 0
            maxMinutes = 0
        }

        dict["curHours"] = curHours
        dict["curMinutes"] = curMinutes
        dict["curDayOffset"] = curDayOffset

        dict["minHours"] = minHours
        dict["minMinutes"] = minMinutes
        dict["minDayOffset"] = minDayOffset

        dict["maxHours"] = maxHours
        dict["maxMinutes"] = maxMinutes
        dict["maxDayOffset"] = maxDayOffset

        dict["curHoursAmpm"] = (dict["isampm"]) ? (curHours < 12) ? curHours : curHours - 12 : 0
        dict["prevday_disabled"] = (curOffset != null && curDayOffset <= minDayOffset);
        dict["nextday_disabled"] = (curOffset != null && curDayOffset >= maxDayOffset);
        dict["within_range"] = ((curOffset == null) || (curOffset >= minOffset && curOffset <= maxOffset));
    }  // CalcMinMax

//========= HideSaveButtonOnQuicksave  ====================================
    function HideSaveButtonOnQuicksave(tp_dict, st_dict) {
        //console.log( "--- HideSaveButtonOnQuicksave  ");

        const quicksave = tp_dict["quicksave"]

        let qs_txt = (quicksave) ? st_dict["txt_quicksave_remove"] : st_dict["txt_quicksave"];
        document.getElementById("id_timepicker_quicksave").innerText = qs_txt

        let btn_save = document.getElementById("id_timepicker_save")
        if (quicksave){
            btn_save.classList.add("display_hide");
        } else {
            btn_save.classList.remove("display_hide");
        }
    }  //  HideSaveButtonOnQuicksave

//========= set_header_date  ========================= PR2019-10-13
    function get_header_date(tp_dict, st_dict) {
        //console.log( "--- get_header_date  ");
        // Using vanlla JS instead of moment.js.

        const fieldname = tp_dict["field"];
        const rosterdate = tp_dict["rosterdate"];
        let curDayOffset = tp_dict["curDayOffset"];
        //console.log( "curDayOffset ", curDayOffset);

        let date_str = null;
        if (fieldname === "breakduration"){
            date_str = st_dict["txt_break"]
        } else if (fieldname === "timeduration"){
            date_str = st_dict["txt_workhours"]
        } else {
            if(!!rosterdate){
                let arr = rosterdate.split("-");
                if (arr.length > 2) {
                    let date_JS = new Date(parseInt(arr[0]), parseInt(arr[1]) - 1, parseInt(arr[2]))
                    // add / subtract curDayOffset from date_JS
                    date_JS.setDate(date_JS.getDate() + curDayOffset);
                    date_str = format_date_vanillaJS (date_JS,
                                st_dict["month_list"], st_dict["weekday_list"], st_dict["user_lang"],
                                false, false);  // hide_weekday = false, hide_year = false
                }
            } else {
                if (curDayOffset < 0) {
                    date_str = st_dict["text_prevday"];
                } else if (curDayOffset > 0){
                    date_str = st_dict["text_nextday"];
                } else {
                    date_str = st_dict["text_curday"];
                }
            };
        }  // if (tp_dict["field"] === "breakduration"){

        return date_str;
    }  // CreateHeader

//========= ShowHover  ====================================
    function ShowHover(td, event) {
        if(!!td){
            const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
            if (event.type === "mouseenter" && !disabled){
                td.classList.add("tr_hover")
            } else {
                td.classList.remove("tr_hover")}}
    }
//========= function pop_background_remove  ====================================
    function popupbox_removebackground(filterby_classname, remove_classname){
        // remove selected color from all input popups
        let elements = document.getElementsByClassName(filterby_classname);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }



// PR2019-07-01 before moment.tz it was:

    // date_as_ISOstring: "2019-06-25T07:00:00Z"  on screen: 9.00
    // datetime_utc = get_dateJS_from_dateISO_vanilla(datetime_iso)
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