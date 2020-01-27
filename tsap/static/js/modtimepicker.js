
// ++++++++++++  MOD TIMEPICKER +++++++++++++++++++++++++++++++++++++++
    "use strict";

//========= ModTimepickerOpen  ====================================
    function ModTimepickerOpen(el_input, ModTimepickerChanged, tp_dict, st_dict) {
       // console.log("=== MODAL  ModTimepickerOpen  =====");
        //console.log( "tp_dict: ", tp_dict);
        //console.log( "st_dict: ", st_dict);

        CalcMinMax(tp_dict)

        //console.log( "offset: ", tp_dict["offset"]);
        //console.log( "minoffset: ", tp_dict["minoffset"]);
        //console.log( "maxoffset: ", tp_dict["maxoffset"]);
        //console.log( "quicksave: ", tp_dict["quicksave"]["value"]);

// display cur_datetime_local in header
        CreateHeader(tp_dict, st_dict);

        document.getElementById("id_timepicker_date").innerText = get_header_date(tp_dict, st_dict)

        CreateFooter(tp_dict, st_dict, ModTimepickerChanged);
        CreateTimepickerHours(ModTimepickerChanged, tp_dict, st_dict);
        CreateTimepickerMinutes(ModTimepickerChanged, tp_dict, st_dict);

        if (tp_dict["isampm"]) {HighlightAndDisableAmpm(ModTimepickerChanged, tp_dict, st_dict)}
        HighlightAndDisableHours(tp_dict, "ModTimepickerOpen");
        HighlightAndDisableMinutes(tp_dict)

// hide save button on quicksave
        HideSaveButtonOnQuicksave(tp_dict, st_dict);

    }; // function ModTimepickerOpen

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
    function CreateFooter(tp_dict, st_dict, ModTimepickerChanged) {
        //console.log( "--- CreateFooter  ");

        // btn_quicksave.innerText is set in HideSaveButtonOnQuicksave
        const is_quicksave = tp_dict.quicksave;

        let el_footer = document.getElementById("id_timepicker_footer")
        el_footer.innerText = null
        let div_left = document.createElement("div");
            div_left.classList.add("content_subheader_left")
            //div_left.classList.add("m-2")
            div_left.classList.add("p-1")
            let btn_quicksave = document.createElement("a");
                btn_quicksave.setAttribute("id", "id_timepicker_quicksave")
                btn_quicksave.classList.add("p-1")
                btn_quicksave.classList.add("pointer_show")
                btn_quicksave.addEventListener("click", function() {
                        ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, "btn_qs")}, false )
                btn_quicksave.addEventListener("mouseenter", function() {btn_quicksave.classList.add("tr_hover")});
                btn_quicksave.addEventListener("mouseleave", function() {btn_quicksave.classList.remove("tr_hover")});

                if(!is_quicksave) {
                   btn_quicksave.setAttribute("data-toggle", "modal");
                   btn_quicksave.setAttribute("href", "#id_mod_timepicker");
                }

            div_left.appendChild(btn_quicksave);
        el_footer.appendChild(div_left);

        if(st_dict["show_btn_delete"] && tp_dict["offset"] != null){
            let btn_delete = document.createElement("button");
                btn_delete.setAttribute("type", "button")
                // timepicker_close to close normal popup: btn_delete.classList.add("timepicker_close")

                // both data-toggle and href needed for toggle popup and modal form
                btn_delete.setAttribute("data-toggle", "modal");
                btn_delete.setAttribute("href", "#id_mod_timepicker");

                btn_delete.addEventListener("click", function() {
                    ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, "btn_delete")}, false )
                AppendChildIcon(btn_delete, st_dict["imgsrc_delete"], "18")
            el_footer.appendChild(btn_delete);
        }

        let btn_save = document.createElement("button");
            btn_save.setAttribute("id", "id_timepicker_save")
            btn_save.setAttribute("type", "button")
            btn_save.innerText = st_dict["txt_save"];

            btn_save.setAttribute("data-toggle", "modal");
            btn_save.setAttribute("href", "#id_mod_timepicker");

            btn_save.addEventListener("click", function() {
                ModTimepickerSave( tp_dict, st_dict, ModTimepickerChanged, "btn_save")}, false )
        el_footer.appendChild(btn_save);
    }  // CreateFooter

 //========= CreateTimepickerHours  ====================================
    function CreateTimepickerHours(ModTimepickerChanged, tp_dict, st_dict) {
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
                CreateTimepickerCell(tbody, td, ModTimepickerChanged, tp_dict, st_dict,
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
                    CreateTimepickerCell(tbody, td, ModTimepickerChanged, tp_dict, st_dict,
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
                CreateTimepickerCell(tbody, td, ModTimepickerChanged, tp_dict, st_dict,
                                    "ampm", j, ampm_text)
            }
        }
    }  //function CreateTimepickerHours

//========= CreateTimepickerMinutes  ====================================
    function CreateTimepickerMinutes(ModTimepickerChanged, tp_dict, st_dict) {
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
                    CreateTimepickerCell(tbody, td, ModTimepickerChanged, tp_dict, st_dict,
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
                        CreateTimepickerCell(tbody, td, ModTimepickerChanged, tp_dict, st_dict,
                                            "minute", minutes, minutes_text)}
                }
        }  // for (let i = 0,
        }  // if(interval === 60)
    }  //function CreateTimepickerMinutes

//========= CreateTimepickerCell  ====================================
    function CreateTimepickerCell(tbody, td, ModTimepickerChanged, tp_dict, st_dict,
                                  data_name, value, value_text) {
        const is_quicksave = tp_dict.quicksave;

        if (value !== -1){td.setAttribute("data-" + data_name, value)}
        td.classList.add("timepicker_" + data_name);
        td.setAttribute("align", "center")
        if (data_name === "hour"){
            td.addEventListener("click", function() {
                SetHour(tbody, td, ModTimepickerChanged, tp_dict, st_dict)
            }, false)

            if(is_quicksave) {
               td.setAttribute("data-toggle", "modal");
               td.setAttribute("href", "#id_mod_timepicker");
            }

        } else if (data_name === "minute"){
            td.addEventListener("click", function() {
                SetMinute(tbody, td, ModTimepickerChanged, tp_dict, st_dict)
            }, false)
        } else if (data_name === "ampm"){
            td.addEventListener("click", function() {
                SetAmPm(tbody, td, ModTimepickerChanged, tp_dict, st_dict)
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

        HighlightAndDisableHours(tp_dict, "SetPrevNextDay");
        HighlightAndDisableMinutes(tp_dict)
    }  // SetPrevNextDay

//========= SetAmPm  ====================================
    function SetAmPm(tbody, td, ModTimepickerChanged, tp_dict, st_dict) {
        //console.log("==== SetAmPm  =====");

    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){

        // get new ampm from td data-ampm of td
            const new_ampm = get_attr_from_el_int(td, "data-ampm");

        // set new hour in new_datetime_local
            // TODO correct
            const cur_offset = 0; //get_attr_from_el(el_timepicker, "data-offset");
            const arr = cur_offset.split(";")
            let new_offset = arr[0] + ";" + arr[1] + ";" + new_minutes.toString()

    // put new offset back in el_timepicker data-offset
            // TODO correct
            let within_range = true;
            if (within_range){
                //el_timepicker.setAttribute("data-offset", new_offset);
            //console.log("setAttribute new_offset ", new_offset, typeof new_offset);

            }

            if (tp_dict["isampm"]) { HighlightAndDisableAmpm(ModTimepickerChanged, tp_dict)};
            const curHours = tp_dict["curHours"], minHours = tp_dict["minHours"], maxHours = tp_dict["maxHours"];
            const curMinutes = tp_dict["curMinutes"], minMinutes = tp_dict["minMinutes"], maxMinutes = tp_dict["maxMinutes"];
            HighlightAndDisableHours(tp_dict, "SetAmPm");
            HighlightAndDisableMinutes(tp_dict)


        }  // if (!disabled)
    }  // SetAmPm

//========= SetHour  ====================================
    function SetHour(tbody, td, ModTimepickerChanged, tp_dict, st_dict) {
        //console.log("==== SetHour  =====");
        //console.log("tp_dict", tp_dict);
        const is_quicksave = tp_dict.quicksave;
    // check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        //console.log("disabled", disabled);

        if (!disabled){
        // get new hour from data-hour of td
            const newHours = get_attr_from_el_int(td, "data-hour");
        //console.log("newHours", newHours);
    // recalculate values of tp_dict
            CalcMinMax_with_newValues(tp_dict, null, newHours, null);

    // save when in quicksave mode
            if (is_quicksave){
                ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, "btn_hour")
            }

            if (tp_dict["isampm"]) { HighlightAndDisableAmpm(ModTimepickerChanged, new_dict, st_dict)};

            HighlightAndDisableHours(tp_dict, "SetHour");
            HighlightAndDisableMinutes(tp_dict);

        }  // if (!disabled)
    }  // SetHour

//========= SetMinute  ====================================
    function SetMinute(tbody, td, ModTimepickerChanged, tp_dict, st_dict) {
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

//=========  ModTimepickerSave  ================ PR2019-11-24
    function ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, mode) {
        //console.log("===  ModTimepickerSave =========", mode);
        // close timepicker, except when clicked on quicksave off

// ---  change quicksave when clicked on button 'Quicksave'
        let is_quicksave = tp_dict.quicksave;
        //console.log("is_quicksave", is_quicksave);

        let save_changes = false, dont_return = false;
// close timepicker, except when clicked on quicksave off
        if (mode === "btn_save") {
            save_changes = true;
        } else if (mode === "btn_qs") {
// ---  toggle quicksave
            // if old quicksave = true: set quicksave = false, show btn_save, don't exit
            // if old quicksave = false: set quicksave = true, save changes
            is_quicksave = !is_quicksave
            tp_dict["quicksave"] = is_quicksave;

            if(is_quicksave){
                save_changes = true;
            } else {
                HideSaveButtonOnQuicksave(tp_dict, st_dict);
                dont_return = true;
            }

// ---  upload quicksave in Usersettings
            const url_settings_upload = get_dict_value_by_key(st_dict, "url_settings_upload")
            const setting_dict = {"quicksave": {"value": is_quicksave}};
            UploadSettings (setting_dict, url_settings_upload);

            // go back without 'save_changes'

        } else if (mode === "btn_hour") {
            if(is_quicksave){
                save_changes = true
            };
        } else if (mode === "btn_delete") {
            tp_dict["offset"] = null;

            CalcMinMax(tp_dict)
            save_changes = true;
        }

        if(save_changes){
           // console.log( " --- save_changes ---");

            // save only when offset is within range or null (when changing date hour/minumtes can go outside min/max range)
            //console.log( "tp_dict: ", tp_dict);

            const within_range = tp_dict["within_range"];
            //console.log( "within_range = ", within_range);
            // console.log( "within_range: ", within_range, typeof within_range);
            if(tp_dict["within_range"]){
                tp_dict["save_changes"] = true;
            }
        }
        if(!dont_return) {
            //console.log( " --- goto  ModTimepickerChanged ---");
            ModTimepickerChanged(tp_dict)
        }
    }  // ModTimepickerSave


//========= HighlightAndDisableAmpm  ====================================
    function HighlightAndDisableAmpm(ModTimepickerChanged, tp_dict, st_dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( ">>>>=== HighlightAndDisableAmpm  ");

        const curDate_is_rosterdate = dict["curDate_is_rosterdate"];
        const prevday_disabled = dict["prevday_disabled"];
        const nextday_disabled = dict["nextday_disabled"];

        const comp_timezone = ''; // get_attr_from_el(el_timepicker, "data-timezone");

        const curDate = dict["curDate"]
        const curDateMidnight = curDate.clone()
        const curDateMidday = curDate.clone().hour(12);
        const curDateEndOfDay = curDate.clone().add(1, 'days');

        const range_min = dict["min_datetime_local"];
        const range_max = dict["max_datetime_local"];

        let curAmPm = dict["curAmpm"];
        let curHoursAmpm = dict["curHoursAmpm"];
        //console.log("curAmPm", curAmPm, "curHoursAmpm", curHoursAmpm);

        if (dict["isampm"]) {
            const tbody = document.getElementById("id_timepicker_tbody_hour");
            let tds = tbody.getElementsByClassName("timepicker_ampm")
            for (let i=0, td, cell_value, highlighted, period_within_range, disabled; td = tds[i]; i++) {
                cell_value = get_attr_from_el_int(td, "data-ampm");
                highlighted = (curAmPm === cell_value);
                //console.log("curAmPm", curAmPm, "cell_value", cell_value, "highlighted", highlighted)

                let period_min, period_max // am: period is from 00.00u till 12.00 u  pm: period is from 12.00u till 24.00 u
                if (cell_value === 0){
                    period_min =  curDateMidnight;
                    period_max =  curDateMidday;
                 } else {
                    period_min =  curDateMidday;
                    period_max =  curDateEndOfDay;
                }
                period_within_range = PeriodWithinRange(period_min, period_max, range_min, range_max)
                //console.log("period_min", period_min.format(), "period_max", period_max.format())
                //console.log("range_min", range_min.format(), "range_max", range_max.format())
                //console.log("period_within_range", period_within_range)

                disabled = !period_within_range;

                HighlightAndDisableCell(td, disabled, highlighted);
            }
        }  //  if (timeformat === 'AmPm') {
    }  // HighlightAndDisableAmpm

//========= HighlightAndDisableHours  ====================================
    function HighlightAndDisableHours(tp_dict, called_by) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( "--- HighlightAndDisableHours --- ");
        //console.log( "called_by: ", called_by);
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

//========= CalcMinMax  ==================================== PR2018-11-08
function CalcMinMax_with_newValues(tp_dict, newDayOffset, newHours, newMinutes) {
        //console.log(" --- CalcMinMax_with_newValues ---")
// get curHours and curMinutes from curOffset in tp_dict
        const curOffset = tp_dict["offset"];

        let curDayOffset = null, curHours = null, curMinutes = null;
        if(curOffset != null){
            curDayOffset = Math.floor(curOffset/1440)  // - 90 (1.5 h)
            const remainder = curOffset - curDayOffset * 1440
            curHours = Math.floor(remainder/60)
            curMinutes = remainder - curHours * 60
        }

        if(newDayOffset == null){newDayOffset = (curDayOffset != null) ? curDayOffset : 0};
        if(newHours == null){newHours = (curHours != null) ? curHours : 0};
        if(newMinutes == null){newMinutes = (curMinutes != null) ? curMinutes : 0};

        let newOffset = null
        if(newDayOffset != null && newDayOffset != null && newDayOffset != null){
            newOffset = newDayOffset * 1440 + newHours * 60 + newMinutes
        }

// put new offset back in dict
        tp_dict["offset"] = newOffset

// re calculate values of tp_dict
        CalcMinMax(tp_dict)
}

//========= CalcMinMax  ==================================== PR2018-08-02
function CalcMinMax(dict) {
        //console.log(" --- CalcMinMax ---")
        //console.log("dict: ", dict)

        const curOffset = dict["offset"];
        let minOffset = dict["minoffset"];
        let maxOffset = dict["maxoffset"];

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

        const is_quicksave = tp_dict["quicksave"]

        let qs_txt = (is_quicksave) ? st_dict["txt_quicksave_remove"] : st_dict["txt_quicksave"];
        document.getElementById("id_timepicker_quicksave").innerText = qs_txt

        let btn_save = document.getElementById("id_timepicker_save")
        if (is_quicksave){
            btn_save.classList.add("display_hide");
        } else {
            btn_save.classList.remove("display_hide");
        }
    }  //  HideSaveButtonOnQuicksave

//========= get_header_date  ========================= PR2019-10-13
    function get_header_date(tp_dict, st_dict) {
        //console.log( "--- get_header_date  ");
        // Using vanlla JS instead of moment.js.

        //console.log( "tp_dict ", tp_dict);
        //console.log( "st_dict ", st_dict);

        const fieldname = tp_dict["field"];
        const rosterdate = tp_dict["rosterdate"];
        let curDayOffset = tp_dict["curDayOffset"];

        //console.log( "fieldname ", fieldname);
        //console.log( "rosterdate ", rosterdate);
        //console.log( "curDayOffset ", curDayOffset);

        let date_text = "";
        if (fieldname === "breakduration"){
            date_text = st_dict["txt_break"]
        } else if (fieldname === "timeduration"){
            date_text = st_dict["txt_workhours"]
        } else {
            if(!!rosterdate){
                let arr = rosterdate.split("-");
                if (arr.length > 2) {
                    let date_JS = new Date(parseInt(arr[0]), parseInt(arr[1]) - 1, parseInt(arr[2]))
                    // add / subtract curDayOffset from date_JS
                    date_JS.setDate(date_JS.getDate() + curDayOffset);
                    date_text = format_date_vanillaJS (date_JS,
                                st_dict["month_list"], st_dict["weekday_list"], st_dict["user_lang"],
                                false, false);  // hide_weekday = false, hide_year = false
                }
            } else {
                if (curDayOffset < 0) {
                    date_text = st_dict["text_prevday"];
                } else if (curDayOffset > 0){
                    date_text = st_dict["text_nextday"];
                } else {
                    date_text = st_dict["text_curday"];
                }
            };
        }  // if (tp_dict["field"] === "breakduration"){

        //console.log( "date_text ", date_text);
        return date_text;
    }  // get_header_date

//========= ShowHover  ====================================
    function ShowHover(td, event) {
        if(!!td){
            const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
            if (event.type === "mouseenter" && !disabled){
                td.classList.add("tr_hover")
            } else {
                td.classList.remove("tr_hover")}}
    }


