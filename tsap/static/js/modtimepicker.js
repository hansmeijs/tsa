
// ++++++++++++  MOD TIMEPICKER +++++++++++++++++++++++++++++++++++++++ PR2020-04-13
// from https://stackoverflow.com/questions/53594423/how-to-open-a-bootstrap-modal-without-jquery-or-bootstrap-js-javascript%20*/
    "use strict";

    let mod_quicksave = false;
    let mod_quicksave_initialized = false;

//========= mtp_TimepickerOpen  ====================================
    function mtp_TimepickerOpen(loc, el_input, ModTimepickerChanged, tp_dict, st_dict) {
        //console.log("===  mtp_TimepickerOpen  =====");
        //console.log( "tp_dict: ", tp_dict);
        //console.log( "st_dict: ", st_dict);
        // tp_dict.page is not used in Timepicker. It is used when returned to page

        // only retrieve is_quicksave from roster page when starting up page.
        // changed value is saved in mod_quicksave, and from here sent to server
        if(!mod_quicksave_initialized){
            mod_quicksave = tp_dict.quicksave;
            mod_quicksave_initialized = true;
        }
        const el_mtp_modal = document.getElementById("id_mtp_modal");
        el_mtp_modal.classList.remove("hidden");

        CalcMinMax(tp_dict)

// ---  display cur_datetime_local in header
        CreateHeader(loc, tp_dict, st_dict);

        document.getElementById("id_timepicker_date").innerText = get_header_date(loc, tp_dict, st_dict)

        CreateFooter(tp_dict, st_dict, ModTimepickerChanged);

        CreateTimepickerHours(ModTimepickerChanged, tp_dict, st_dict);

        CreateTimepickerMinutes(loc, ModTimepickerChanged, tp_dict, st_dict);

        if (tp_dict["isampm"]) {HighlightAndDisableAmpm(ModTimepickerChanged, tp_dict, st_dict)}
        HighlightAndDisableHours(tp_dict, "mtp_TimepickerOpen");
        HighlightAndDisableMinutes(tp_dict)

// ---  hide save button on quicksave
        HideSaveButtonOnQuicksave(tp_dict, st_dict);
    }; // mtp_TimepickerOpen

//========= CreateHeader  ====================================
    function CreateHeader(loc, tp_dict, st_dict) {
        //console.log( "--- CreateHeader  ");

        let el_header = document.getElementById("id_timepicker_header")
        el_header.innerText = null
        let btn_prevday = document.createElement("button");
            btn_prevday.setAttribute("id", "id_btn_prev")
            btn_prevday.innerText = "<-"
            btn_prevday.setAttribute("type", "button")
            btn_prevday.addEventListener("click", function () {
                SetPrevNextDay(loc, "prevday", tp_dict, st_dict)}, false)
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
                SetPrevNextDay(loc, "nextday", tp_dict, st_dict)}, false)
        el_header.appendChild(btn_nextday);
    }  // CreateHeader

//========= CreateFooter  ====================================
    function CreateFooter(tp_dict, st_dict, ModTimepickerChanged) {
        //console.log( "--- CreateFooter  ");

        // btn_quicksave.innerText is set in HideSaveButtonOnQuicksave
        // const is_quicksave = tp_dict.quicksave;

        let el_footer = document.getElementById("id_timepicker_footer")
        el_footer.innerText = null
        let div_left = document.createElement("div");
            div_left.classList.add("content_subheader_left")
            //div_left.classList.add("m-2")
            div_left.classList.add("p-1")
            let btn_quicksave = document.createElement("div");
                btn_quicksave.setAttribute("id", "id_timepicker_quicksave")
                btn_quicksave.classList.add("p-1")
                btn_quicksave.classList.add("pointer_show")
                btn_quicksave.addEventListener("click", function() {
                        ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, "btn_qs")}, false )
                btn_quicksave.addEventListener("mouseenter", function() {btn_quicksave.classList.add("tr_hover")});
                btn_quicksave.addEventListener("mouseleave", function() {btn_quicksave.classList.remove("tr_hover")});

                if(!mod_quicksave) {
                   //btn_quicksave.setAttribute("data-toggle", "modal");
                   //btn_quicksave.setAttribute("href", "#id_mod_timepicker");
                }

            div_left.appendChild(btn_quicksave);
        el_footer.appendChild(div_left);

        if(st_dict["show_btn_delete"] && tp_dict["offset"] != null){
            let btn_delete = document.createElement("div");
                // PR2020-08-21 instead of button with el_img, create div el with border and background img

                // timepicker_close to close normal popup: btn_delete.classList.add("timepicker_close")
                // both data-toggle and href needed for toggle popup and modal form
                //btn_delete.setAttribute("data-toggle", "modal");
                //btn_delete.setAttribute("href", "#id_mod_timepicker");

                btn_delete.classList.add("btn_del_0_1")

                btn_delete.addEventListener("click", function() {
                    ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, "btn_delete")}, false )
//- add hover delete img
                btn_delete.addEventListener("mouseenter", function() {add_or_remove_class (btn_delete, "btn_del_0_2", true, "btn_del_0_1")});
                btn_delete.addEventListener("mouseleave", function() {add_or_remove_class (btn_delete, "btn_del_0_1", true, "btn_del_0_2")});
            el_footer.appendChild(btn_delete);
        }

        let btn_save = document.createElement("button");
            btn_save.setAttribute("id", "id_timepicker_save")
            btn_save.setAttribute("type", "button")
            btn_save.innerText = st_dict["txt_save"];

            //btn_save.setAttribute("data-toggle", "modal");
            //btn_save.setAttribute("href", "#id_mod_timepicker");

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
    function CreateTimepickerMinutes(loc, ModTimepickerChanged, tp_dict, st_dict) {
        //console.log( "=== CreateTimepickerMinutes  ");

// ---  set references to elements
        let tbody = document.getElementById("id_timepicker_tbody_minute");
        tbody.innerText = null

// ---  hide minutes tables when interval = 60
        let el_cont_minute = document.getElementById("id_timepicker_cont_minute");

        const interval = (loc.interval) ? loc.interval : 5;
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

// ---  add '00' on separate row
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

// ---  loop through option list
            for (let i = 0; i < rows; i++) {
                tblRow = tbody.insertRow(-1);
                for (let j = 0, td, el_a ; j < columns; j++) {
                    minutes = minutes + interval
                    if (minutes === 60) {minutes = 0}
                    minutes_text = "00" + minutes.toString()
                    minutes_text = minutes_text.slice(-2);

                    td = tblRow.insertCell(-1);
                    td.setAttribute("data-minute", minutes);

// ---  skip last 00
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

        if (value !== -1){td.setAttribute("data-" + data_name, value)}
        td.classList.add("timepicker_" + data_name);
        td.setAttribute("align", "center")
        if (data_name === "hour"){
            td.addEventListener("click", function() {
                SetHour(tbody, td, ModTimepickerChanged, tp_dict, st_dict)
            }, false)

            if(mod_quicksave) {
               //td.setAttribute("data-toggle", "modal");
               //td.setAttribute("href", "#id_mod_timepicker");
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

// ---  add hover EventListener
        td.addEventListener("mouseenter", function(event) {ShowHover(td, event, "tr_hover")}, false)
        td.addEventListener("mouseleave", function() {ShowHover(td, event, "tr_hover")}, false)

        let el_a = document.createElement("a");
        el_a.innerText = value_text
        td.appendChild(el_a);
    }  // CreateTimepickerCell

//========= SetPrevNextDay  ====================================
    function SetPrevNextDay(loc, type_str, tp_dict, st_dict) {
        //console.log("==== SetPrevNextDay  ===== ", type_str);

// ---  make offset 0 when null
        if(tp_dict["offset"] == null ){
            tp_dict["offset"] = 0
            CalcMinMax(tp_dict)
        };
        const offset =  tp_dict["offset"]
        const curDayOffset =  tp_dict["curDayOffset"]
        const minDayOffset =  tp_dict["minDayOffset"]
        const maxDayOffset =  tp_dict["maxDayOffset"]

// ---  set  day_add to 1 or -1
        let day_add = (type_str === "prevday") ? -1 : 1;

        const curRemainder = tp_dict["offset"] - curDayOffset * 1440;

        let new_day_offset = curDayOffset + day_add;
        if (new_day_offset < minDayOffset){new_day_offset = minDayOffset}
        if (new_day_offset > maxDayOffset){new_day_offset = maxDayOffset}
        //console.log("new_day_offset", new_day_offset);

        CalcMinMax_with_newValues(tp_dict, new_day_offset, null, null)

// ---  show new date, also when not in range
        document.getElementById("id_timepicker_date").innerText = get_header_date(loc, tp_dict, st_dict)

        HighlightAndDisableHours(tp_dict, "SetPrevNextDay");
        HighlightAndDisableMinutes(tp_dict)
    }  // SetPrevNextDay

//========= SetAmPm  ====================================
    function SetAmPm(tbody, td, ModTimepickerChanged, tp_dict, st_dict) {
        //console.log("==== SetAmPm  =====");

// ---  check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){

        // get new ampm from td data-ampm of td
            const new_ampm = get_attr_from_el_int(td, "data-ampm");

        // set new hour in new_datetime_local
            // TODO correct
            const cur_offset = 0; //get_attr_from_el(el_timepicker, "data-offset");
            const arr = cur_offset.split(";")
            let new_offset = arr[0] + ";" + arr[1] + ";" + new_minutes.toString()

// ---  put new offset back in el_timepicker data-offset
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

// ---  check if cell is disabeld
        const disabled = (td.classList.contains("tr_color_disabled") || td.classList.contains("tsa_color_notallowed"))
        if (!disabled){
        // get new hour from data-hour of td
            const newHours = get_attr_from_el_int(td, "data-hour");
        //console.log("newHours", newHours);
    // recalculate values of tp_dict
            CalcMinMax_with_newValues(tp_dict, null, newHours, null);

        //console.log("SetHour mod_quicksave", mod_quicksave);
    // save when in quicksave mode
            if (mod_quicksave){
                ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, "btn_hour")
            }

            if (tp_dict["isampm"]) { HighlightAndDisableAmpm(ModTimepickerChanged, tp_dict, st_dict)};

            HighlightAndDisableHours(tp_dict, "SetHour");
            HighlightAndDisableMinutes(tp_dict);

        //console.log("end of SetHour mod_quicksave", mod_quicksave);
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

//=========  ModTimepickerSave  ================ PR2019-11-24 PR2020-04-10
    function ModTimepickerSave(tp_dict, st_dict, ModTimepickerChanged, btn) {
        //console.log("===  ModTimepickerSave =========", mode);
        // close timepicker, except when clicked on quicksave off

        let save_changes = false, dont_return = false;

// close timepicker, except when clicked on quicksave off
        if (btn === "btn_save") {
            save_changes = true;
        } else if (btn === "btn_qs") {

// ---  toggle quicksave
            // if old quicksave = true: set quicksave = false, show btn_save, don't exit
            // if old quicksave = false: set quicksave = true, save changes
            mod_quicksave = !mod_quicksave
            tp_dict.quicksave = mod_quicksave;  // not necessary, but let it stay

//////////////////////
// ---  add or remove data-toggle from hour cells - so closing form will work properly PR2020-04-12
            let tbody = document.getElementById("id_timepicker_tbody_hour");
            let tds = tbody.getElementsByClassName("timepicker_hour")
            for (let i=0, td; td = tds[i]; i++) {
                if(mod_quicksave) {
                   //td.setAttribute("data-toggle", "modal");
                   //td.setAttribute("href", "#id_mod_timepicker");
                } else {
                   //td.removeAttribute("data-toggle", "modal");
                   //td.removeAttribute("href", "#id_mod_timepicker");
                }
            };
//////////////////

            if(mod_quicksave){
                save_changes = true;
            } else {
                HideSaveButtonOnQuicksave(tp_dict, st_dict);
                dont_return = true;
            }

// ---  upload quicksave in Usersettings
            const url_settings_upload = get_dict_value_by_key(st_dict, "url_settings_upload")
            const setting_dict = {quicksave: {value: mod_quicksave}};
            UploadSettings (setting_dict, url_settings_upload);


        } else if (btn === "btn_hour") {
            if(mod_quicksave){
                save_changes = true
            };
        } else if (btn === "btn_delete") {
            tp_dict.offset = null;

            CalcMinMax(tp_dict)
            save_changes = true;
        }

        if(save_changes){
// ---  save only when offset is within range or null (when changing date hour/minumtes can go outside min/max range)
            if(tp_dict.within_range){
                tp_dict.save_changes = true;
            } else {
                dont_return = true
            }
        }
        if(!dont_return) {
            // hide modal PR2020-04-12 debug: struggle to let quicksave work.
            // added set/remove attribute toggle helped, but now quicksave button doesnt close form. This solved it
            if (btn === "btn_qs") {
            //console.log("FORCE SLOSE id_mod_timepicker");
                //let el_mod_timepicker = document.getElementById("id_mod_timepicker")
                // use vanilla JS, this didnt work:  $("#id_mod_timepicker").modal("hide");
                //el_mod_timepicker.classList.remove("show")
                //el_mod_timepicker.setAttribute("style", "display: none;")
            };

            ModTimepickerChanged(tp_dict)
            document.getElementById("id_mtp_modal").classList.add("hidden")
        }
    }  // ModTimepickerSave

//========= HighlightAndDisableAmpm  ====================================
    function HighlightAndDisableAmpm(ModTimepickerChanged, tp_dict, st_dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( "=== HighlightAndDisableAmpm === ");
        //console.log( "tp_dict: ", tp_dict);
        const curDate_is_rosterdate = tp_dict["curDate_is_rosterdate"];
        const prevday_disabled = tp_dict.prevday_disabled;
        const nextday_disabled = tp_dict.nextday_disabled;

        //const curDate = tp_dict["curDate"]
        const curDateMidnight = 0; // was  curDate.clone()
        const curDateMidday = 720; // was  curDate.clone().hour(12);
        const curDateEndOfDay = 1440; // curDate.clone().add(1, 'days');

        const range_min = tp_dict.minoffset;
        const range_max = tp_dict.maxoffset;

        let curAmPm = tp_dict.curAmpm;
        let curHoursAmpm = tp_dict.curHoursAmpm;
        //console.log("curAmPm", curAmPm, "curHoursAmpm", curHoursAmpm);

        if (tp_dict.isampm) {
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
                period_within_range = mtp_period_within_range(period_min, period_max, range_min, range_max)
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

        let tbody = document.getElementById("id_timepicker_tbody_hour");
        let tds = tbody.getElementsByClassName("timepicker_hour")
        for (let i=0, td, cell_value, cell_value_ampm, is_highlighted, is_disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-hour");

            is_highlighted = (tp_dict.curHours === cell_value);
            is_disabled = (cell_value < tp_dict.minHours || cell_value > tp_dict.maxHours)

            HighlightAndDisableCell(td, is_disabled, is_highlighted);
        };
    }  // HighlightAndDisableHours

//========= HighlightAndDisableMinutes  ====================================
    function HighlightAndDisableMinutes(tp_dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( "--------->>>>=== HighlightAndDisableMinutes  ");
        //console.log( tp_dict);

        // enable minutes when tp_dict.curHours == null PR2020-03-22
        const curHour_is_disabled = ((tp_dict.curHours != null) && ( tp_dict.curHours < tp_dict.minHours ||tp_dict.curHours > tp_dict.maxHours));

        let tbody = document.getElementById("id_timepicker_tbody_minute");
        let tds = tbody.getElementsByClassName("timepicker_minute")
        for (let i=0, td, cell_value, is_highlighted, is_disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-minute");
            is_disabled =  ((curHour_is_disabled) || ((tp_dict.curMinutes != null) && ( cell_value < tp_dict.minMinutes || cell_value > tp_dict.maxMinutes)))
            is_highlighted = (tp_dict.curMinutes === cell_value);
            HighlightAndDisableCell(td, is_disabled, is_highlighted);
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

        dict["curAmPm"] = (curHours >= 12) ? 1 : 0
        dict["curHoursAmpm"] = (dict["isampm"]) ? (curHours < 12) ? curHours : curHours - 12 : 0
        dict["prevday_disabled"] = (curOffset != null && curDayOffset <= minDayOffset);
        dict["nextday_disabled"] = (curOffset != null && curDayOffset >= maxDayOffset);
        dict["within_range"] = ((curOffset == null) || (curOffset >= minOffset && curOffset <= maxOffset));
    }  // CalcMinMax


//=========  mtp_calc_minmax_offset  ================ PR2020-03-22
    function mtp_calc_minmax_offset(shift_dict, is_absence){
        //console.log( "=== mtp_calc_minmax_offset ");
        // function calculates min and max offeset before opening timepicker
        if (!!shift_dict){
            if (!("offsetstart" in shift_dict)){ shift_dict.offsetstart = {} };
            if (!("offsetend" in shift_dict)){ shift_dict.offsetend = {} };
            if (!("breakduration" in shift_dict)){ shift_dict.breakduration = {} };
            if (!("timeduration" in shift_dict)){ shift_dict.timeduration = {} };

            // calculate min max of timefields, store in upload_dict,
            // (offset_start != null) is added to change undefined into null, 0 stays 0 (0.00 u is dfferent from null)
            const offset_start = get_dict_value(shift_dict, ["offsetstart", "value"]);
            const offset_end = get_dict_value(shift_dict, ["offsetend", "value"]);
            const break_duration = get_dict_value(shift_dict, ["breakduration", "value"], 0);

            shift_dict.offsetstart.minoffset = (is_absence) ? 0 : -720;
            shift_dict.offsetstart.maxoffset = (!!offset_end && offset_end - break_duration <= 1440) ?
                                            offset_end - break_duration : 1440;

            shift_dict.offsetend.minoffset = (!!offset_start && offset_start + break_duration >= 0) ?
                                            offset_start + break_duration : 0;
            shift_dict.offsetend.maxoffset = (is_absence) ? 1440 : 2160;

            shift_dict.breakduration.minoffset = 0;
            shift_dict.breakduration.maxoffset = (is_absence) ? 0 :
                                              (!!offset_start && !!offset_end && offset_end - offset_start <= 1440) ?
                                              offset_end - offset_start : 1440;
            shift_dict.timeduration.minoffset = 0;
            shift_dict.timeduration.maxoffset = 1440;
        }  //  if (!!shift_dict)
    }  // mtp_calc_minmax_offset


//=========  mtp_calc_minmax_offset_values  ================ PR2020-06-30
    function mtp_calc_minmax_offset_values(fldName, offset_start, offset_end, break_duration, time_duration, is_absence){
        //console.log( "=== mtp_calc_minmax_offset ");
        // function calculates min and max offeset before opening timepicker

        if(break_duration == null) {break_duration = 0}
        if(time_duration == null) {time_duration = 0}
        let minoffset = 0, maxoffset = 1440;
        if (!is_absence && ["offsetstart", "offsetend"].indexOf(fldName) > -1) {
            minoffset = -720;
            maxoffset = 2160};
        if (offset_start == null) {offset_start = minoffset};
        if(fldName === "offsetstart") {
            if (offset_end != null && offset_end - break_duration < maxoffset) {
                maxoffset = offset_end - break_duration};
        } else if(fldName === "offsetend") {
            if(offset_start != null && offset_start + break_duration > minoffset) {
                minoffset = offset_start + break_duration};
        } else if(fldName === "breakduration"){
            // if offset_start and offset_end both have values :
            // break_duration + time_duration is fixed value (offset_end - offset_start)
             if (offset_start != null && offset_end != null) {
                if (offset_end - offset_start < maxoffset) {
                    maxoffset = offset_end - offset_start};
             } else {
            // if offset_start or offset_end is blank:
            // break_duration + time_duration is max 1 day (1440)
                maxoffset = maxoffset - time_duration;
            }
        }
        return [minoffset, maxoffset]
    }  // mtp_calc_minmax_offset_values

//========= HideSaveButtonOnQuicksave  ====================================
    function HideSaveButtonOnQuicksave(tp_dict, st_dict) {
        //console.log( "--- HideSaveButtonOnQuicksave  ");

        //const is_quicksave = tp_dict["quicksave"]

        let qs_txt = (mod_quicksave) ? st_dict["txt_quicksave_remove"] : st_dict["txt_quicksave"];
        document.getElementById("id_timepicker_quicksave").innerText = qs_txt

        let btn_save = document.getElementById("id_timepicker_save")
        if (mod_quicksave){
            btn_save.classList.add("display_hide");
        } else {
            btn_save.classList.remove("display_hide");
        }
    }  //  HideSaveButtonOnQuicksave

//========= mtp_calc_timeduration_minmax  ============= PR2019-10-12
    function mtp_calc_timeduration_minmax(loc, fldName, new_value, shift_code, offset_start, offset_end, break_duration, time_duration) {
        //console.log(" === mtp_calc_timeduration_minmax ===" );
        //console.log("shift_code: ", shift_code );

        if(!break_duration) {break_duration = 0};
        if(!time_duration) {time_duration = 0};

// ---  put new value in variable
        if (fldName === "offsetstart") {
            offset_start = new_value;
        } else if (fldName === "offsetend") {
            offset_end = new_value;
        } else if (fldName === "breakduration") {
            break_duration = (!!new_value) ? new_value : 0;
        }
        if(fldName === "timeduration"){
            time_duration = (!!new_value) ? new_value : 0
            if(!!time_duration){
                offset_start = null;
                offset_end = null;
                break_duration = 0
            }
        } else {
            time_duration = (offset_start != null && offset_end != null) ? offset_end - offset_start - break_duration : 0;
        }

        const new_shift_code = create_shift_code(loc, offset_start, offset_end, time_duration, shift_code);

        //console.log("new_shift_code: ", new_shift_code );
        let shift_dict = {code: {value: new_shift_code},
                  offsetstart: {value: offset_start},
                  offsetend: {value: offset_end},
                  breakduration: {value: break_duration},
                  timeduration: {value: time_duration}
                  }

        // calculate min max of timefields, store in upload_dict,
        // (offset_start != null) is added to change undefined into null, 0 stays 0 (0.00 u is dfferent from null)

        shift_dict.offsetstart.minoffset = get_minoffset("offsetstart", offset_start, break_duration)
        shift_dict.offsetstart.maxoffset = get_maxoffset("offsetstart", offset_start, offset_end, break_duration)

        shift_dict.offsetend.minoffset = get_minoffset("offsetend", offset_start, break_duration)
        shift_dict.offsetend.maxoffset = get_maxoffset("offsetend", offset_start, offset_end, break_duration)

        shift_dict.breakduration.minoffset = get_minoffset("breakduration", offset_start, break_duration)
        shift_dict.breakduration.maxoffset =get_maxoffset("breakduration", offset_start, offset_end, break_duration)

        shift_dict.timeduration.minoffset = get_minoffset("timeduration", offset_start, break_duration)
        shift_dict.timeduration.maxoffset = get_maxoffset("timeduration", offset_start, offset_end, break_duration)

        return shift_dict
     }  // mtp_calc_timeduration_minmax

//========= get_minoffset  ========================= PR2020-04-12
    function get_minoffset(fldName, offset_start, break_duration) {
        //console.log( "--- get_minoffset  ");
        //console.log( "fldName: ", fldName);
        //console.log( "offset_start: ", offset_start);
        //console.log( "break_duration: ", break_duration);
        let minoffset = 0;
        if(!break_duration) {break_duration = 0};
        if (["offsetstart", "timestart"].indexOf(fldName) > -1) {
            minoffset = -720;
        } else if (["offsetend", "timeend", "offsetsplit"].indexOf(fldName) > -1) {
            if (!!offset_start && offset_start + break_duration >= 0) { minoffset = offset_start + break_duration };
        }
        //console.log( "minoffset: ", minoffset);
        return minoffset
    }  // get_minoffset

//========= get_maxoffset  ========================= PR2020-04-12
    function get_maxoffset(fldName, offset_start, offset_end, break_duration) {
        //console.log( "--- get_minmax_offset  ");
        let maxoffset = 1440;
        if(!break_duration) {break_duration = 0};
        if (["offsetstart", "timestart", "offsetsplit"].indexOf(fldName) > -1) {
            if (!!offset_end && offset_end - break_duration <= 1440) {
                maxoffset = offset_end - break_duration
            };
        } else if (["offsetend", "timeend"].indexOf(fldName) > -1) {
            maxoffset = 2160;
        } else if (fldName === "breakduration") {
            if (!!offset_start && !!offset_end && offset_end - offset_start <= 1440) {
                maxoffset = offset_end - offset_start
            }
        }
        return maxoffset
    }

//========= get_header_date  ========================= PR2019-10-13
    function get_header_date(loc, tp_dict, st_dict) {
        //console.log( "--- get_header_date  ");
        // Using vanlla JS instead of moment.js.

        const fieldname = tp_dict.field;
        const rosterdate = tp_dict.rosterdate;
        let curDayOffset = tp_dict.curDayOffset;

        let date_text = "";
        if (st_dict.txt_dateheader){
            date_text = st_dict.txt_dateheader;
        } else if (st_dict["txt_break"] === "breakduration"){
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
                    date_text = format_dateJS_vanilla (loc, date_JS) // hide_weekday = false, hide_year = false
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

//========= mtp_period_within_range  ====================================
    function mtp_period_within_range(period_min, period_max, range_min, range_max) {
    // PR2019-08-04 Note: period is also out of range when diff === 0

        let out_of_range = false;
        if (!!range_min && !!period_max){
            out_of_range = period_max <= range_min; // was:  (period_max.diff(range_min) <= 0)  // out_of_range when period_max <= range_min
        }
        if (!out_of_range) {
            if (!!range_max && !!period_min){
                out_of_range = period_min >= range_max // was:  (period_min.diff(range_max) >= 0) // period_min >= range_max
            }
        }
        const within_range = !out_of_range;
        return within_range
    }  // mtp_period_within_range
