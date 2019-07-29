
// ++++++++++++  TIMEPICKER +++++++++++++++++++++++++++++++++++++++
    "use strict";

//========= OpenTimepicker  ====================================
    function OpenTimepicker(el_input, el_timepicker, el_data, UpdateTableRow, url_str, comp_timezone, timeformat, interval, quicksave, cls_hover, cls_highl) {
        console.log("===  OpenTimepicker  =====") ;

// add EventListeners to buttons
        // an eventhandlers is added each time the timepicker opens. Therefore this code is moved to roster.js and schemeitem.js PR2019-07-07

// get values from tr_selected and put them in el_timepicker
        let tr_selected = get_tablerow_selected(el_input)

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

        const data_rosterdate = get_attr_from_el(el_input, "data-rosterdate");
        if (!!data_rosterdate){ el_timepicker.setAttribute("data-rosterdate", data_rosterdate)
        } else { el_timepicker.removeAttribute("data-rosterdate")};

        const data_datetime = get_attr_from_el(el_input, "data-datetime");
        if (!!data_datetime){ el_timepicker.setAttribute("data-datetime", data_datetime)
        } else { el_timepicker.removeAttribute("data-datetime")};

        const data_mindatetime = get_attr_from_el(el_input, "data-mindatetime");
        if (!!data_mindatetime){ el_timepicker.setAttribute("data-mindatetime", data_mindatetime)
        } else { el_timepicker.removeAttribute("data-mindatetime")};

        const data_maxdatetime = get_attr_from_el(el_input, "data-maxdatetime");
        if (!!data_maxdatetime){ el_timepicker.setAttribute("data-maxdatetime", data_maxdatetime)
        } else { el_timepicker.removeAttribute("data-maxdatetime")};

        if (!!comp_timezone){el_timepicker.setAttribute("data-timezone", comp_timezone)};
        if (!!timeformat){el_timepicker.setAttribute("data-timeformat", timeformat)};
        if (!!interval){el_timepicker.setAttribute("data-interval", interval)};
        if (!!quicksave){el_timepicker.setAttribute("data-quicksave", quicksave)};
        if (!!url_str){el_timepicker.setAttribute("data-url_str", url_str)};
        if (!!cls_highl){el_timepicker.setAttribute("data-cls_highl", cls_highl)};
        if (!!cls_hover){el_timepicker.setAttribute("data-cls_hover", cls_hover)};

        let dict = GetCurMinMaxDict(el_timepicker)
        console.log(dict)

// display cur_datetime_local in header of el_timepicker
        CreateTimepickerDate(data_datetime, data_rosterdate, comp_timezone) ;
        CreateTimepickerHours(el_timepicker, UpdateTableRow, dict);
        CreateTimepickerMinutes(el_timepicker, dict, UpdateTableRow, comp_timezone, cls_highl);

        HighlightAndDisableBtnPrevNextDay(dict["prevday_disabled"], dict["nextday_disabled"]);

        if (dict["isAmpm"]) { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict)}
        HighlightAndDisableHours(el_timepicker, UpdateTableRow, dict)
        HighlightAndDisableMinutes(el_timepicker, UpdateTableRow, dict)

// ---  position popup under el_input
        let popRect = el_timepicker.getBoundingClientRect();
        //console.log("popRect", popRect)
        let inpRect = el_input.getBoundingClientRect();
        //console.log("inpRect", inpRect)
        let topPos = inpRect.top + inpRect.height;
        let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
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
        let btn_save = document.getElementById("id_timepicker_save")
        let btn_quicksave = document.getElementById("id_timepicker_quicksave")
        let txt_quicksave;
        if (quicksave){
            btn_save.classList.add(cls_hide);
            txt_quicksave = get_attr_from_el(el_data, "data-txt_quicksave_remove");
        } else {
            btn_save.classList.remove(cls_hide);
            txt_quicksave = get_attr_from_el(el_data, "data-txt_quicksave");
        }
        btn_quicksave.innerText = txt_quicksave

// ---  show el_popup
        el_timepicker.classList.remove(cls_hide);

    }; // function OpenTimepicker

//========= CreateTimepickerDate  ====================================
    function CreateTimepickerDate(data_datetime, data_rosterdate, comp_timezone) {
        //console.log( "--- CreateTimepickerDate  ");
        // display cur_datetime_local in header of el_timepicker
        // get cur_datetime_local from data_datetime. If no current value: get from rosterdate

        let cur_datetime_local;
        if (!!data_datetime) {
            cur_datetime_local = moment.tz(data_datetime, comp_timezone)
        } else if (!!data_rosterdate) {
            cur_datetime_local = GetRosterdateLocal(data_rosterdate, comp_timezone)
        };

        let date_str = format_datelong_from_datetimelocal(cur_datetime_local)
        document.getElementById("id_timepicker_date").innerText = date_str

    }  // CreateTimepickerDate

 //========= CreateTimepickerHours  ====================================
    function CreateTimepickerHours(el_timepicker, UpdateTableRow, dict) {
        //console.log( "--- CreateTimepickerHours  ");

        let tbody = document.getElementById("id_timepicker_tbody_hour");
        tbody.innerText = null

        const curDate_is_rosterdate = dict["curDate_is_rosterdate"], prevday_disabled = dict["prevday_disabled"], nextday_disabled = dict["nextday_disabled"];
        const curHours = dict["curHours"], minHours = dict["minHours"], maxHours = dict["maxHours"];
        const curMinutes = dict["curMinutes"], minMinutes = dict["minMinutes"], maxMinutes = dict["maxMinutes"];
        const comp_timezone = dict["comp_timezone"], timeformat = dict["timeformat"], interval = dict["interval"], quicksave = dict["quicksave"];
        const url_str = dict["url_str"];
        const cls_highl = dict["cls_highl"], cls_hover = dict["cls_hover"];

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
                    CreateTimepickerCell(td, "hour", hours, hour_text)
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
                if (hours !== 0) {CreateTimepickerCell(td, "hour", hours, hour_text)}
            }
        }  // for (let i = 0,
        if(is_ampm){

            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            td.setAttribute("colspan",6)

            for (let j = 0, td, el_a, ampm_text; j < 2; j++) {
                if(j === 0) {ampm_text = "AM"} else {ampm_text = "PM"}

                td = tblRow.insertCell(-1);

                //td.addEventListener("click", function() {
                //    SetAmPm(el_timepicker, tbody, td, comp_timezone, cls_highl)}, false )

                td.setAttribute("colspan",3)
                CreateTimepickerCell(td, "ampm", j, ampm_text)
            }
        }
    }  //function CreateTimepickerHours

//========= CreateTimepickerMinutes  ====================================
    function CreateTimepickerMinutes(el_timepicker, dict, UpdateTableRow) {
        //console.log( "=== CreateTimepickerMinutes  ");
        //console.log( tbody);

// ---  set references to elements
        let tbody = document.getElementById("id_timepicker_tbody_minute");
        let el_cont_minute = document.getElementById("id_timepicker_cont_minute");

        tbody.innerText = null

        let curMinutes = dict["curMinutes"], minMinutes = dict["minMinutes"], maxMinutes = dict["maxMinutes"];
        let comp_timezone = dict["comp_timezone"], timeformat = dict["timeformat"], interval = dict["interval"], quicksave = dict["quicksave"];
        let url_str = dict["url_str"];
        let cls_highl = dict["cls_highl"], cls_hover = dict["cls_hover"];

        // hide minutes tables when interval = 60
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

    // --- add '00' on separate row

            let tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            for (let j = 0, td; j < columns; j++) {
                td = tblRow.insertCell(-1);
                if (j === 0 ) {
                    minutes = 0; minutes_text = "00";
                    td.setAttribute("data-minute", minutes);

                     td.addEventListener("click", function() {
                        SetMinute(el_timepicker, tbody, td, UpdateTableRow, comp_timezone, cls_highl)}, false)

                    CreateTimepickerCell(td, "minute", minutes, minutes_text)
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

                    td.addEventListener("click", function() {
                        SetMinute(el_timepicker, tbody, td, UpdateTableRow, comp_timezone, cls_highl)}, false)

                    // skip last 00
                    if (minutes !== 0) { CreateTimepickerCell(td, "minute", minutes, minutes_text)}
                }
        }  // for (let i = 0,
        }  // if(interval === 60)
    }  //function CreateTimepickerMinutes

//========= CreateTimepickerCell  ====================================
    function CreateTimepickerCell(td, data_name, value, value_text) {
        //console.log( "--- CreateTimepickerCell  ");

        if (value !== -1){td.setAttribute("data-" + data_name, value)}
        td.classList.add("timepicker_" + data_name);
        td.setAttribute("align","center")

        let el_a = document.createElement("a");
        el_a.innerText = value_text
        td.appendChild(el_a);

    }  // CreateTimepickerCell

//========= SetPrevNextDay  ====================================
    function SetPrevNextDay(type_str, el_timepicker, UpdateTableRow, comp_timezone) {
        console.log("==== SetPrevNextDay  =====", type_str);
        console.log(el_timepicker);

        const dict = GetCurMinMaxDict(el_timepicker)
        console.log(dict);
        let datetime_local = dict["cur_datetime_local"];
        console.log("datetime_local: ", datetime_local.format());

    // set  day_add to 1 or -1
        let day_add = 1;
        if (type_str === "prevday") { day_add = -1};

        console.log("day_add: ", day_add);

    // add / subtract day from datetime_local
        let new_datetime_local = datetime_local.clone().add(day_add, 'day')
        console.log("new datetime_local: ", new_datetime_local.format());

    // display new date in el_timepicker
        let date_str = format_datelong_from_datetimelocal(new_datetime_local)
        document.getElementById("id_timepicker_date").innerText = date_str

    // convert datetime_local to datetime_utc
        const new_datetime_utc = new_datetime_local.utc()
        console.log("new datetime_utc: ", new_datetime_utc.format());
        const new_datetime_utc_iso = new_datetime_utc.toISOString()
        console.log("new_datetime_utc_iso: ", new_datetime_utc_iso);

    // put new datetime back in el_timepicker data-datetime
        el_timepicker.setAttribute("data-datetime", new_datetime_utc_iso);

        let new_dict = GetCurMinMaxDict(el_timepicker)
        const prevday_disabled = new_dict["prevday_disabled"], nextday_disabled = new_dict["nextday_disabled"];

        console.log("prevday_disabled", prevday_disabled);

        let btn_prevday = document.getElementById("id_timepicker_prevday")
        let btn_nextday = document.getElementById("id_timepicker_nextday")
        btn_prevday.disabled = prevday_disabled;
        btn_nextday.disabled = nextday_disabled;

        //if (new_dict["isAmpm"]) { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, new_dict)}
        //HighlightAndDisableHours(el_timepicker, UpdateTableRow, new_dict)
        //HighlightAndDisableMinutes(el_timepicker, UpdateTableRow, new_dict)

    }  // SetPrevNextDay

//========= SetAmPm  ====================================
    function SetAmPm(el_timepicker, tbody, td, comp_timezone, cls_highl) {
        //console.log("==== SetAmPm  =====");

    // get datetime_utc_iso from el_timepicker data-datetime, convert to local (i.e. comp_timezone)
        const data_datetime = get_attr_from_el(el_timepicker, "data-datetime");
        let datetime_local = moment.tz(data_datetime, comp_timezone );
        // console.log("datetime_local: ", datetime_local.format());

    // get new ampm from td data-ampm
        const new_ampm = get_attr_from_el_int(td, "data-ampm");
    // get hour form local datetime
        const hour_local = datetime_local.hour();
    // set value of hour_add
        let hour_add = 0;
        if(new_ampm === 0) {
            if (hour_local >= 12) {hour_add =  -12}
        } else {
            if (hour_local < 12) {hour_add =  12}
        }
    // update moment_datetime
        if (!!hour_add) {datetime_local.add(hour_add, 'hour')}
        //console.log(moment_datetime.format())

    // select new ampm td
        RemoveHighlightFromCells("timepicker_ampm", tbody, cls_highl)
        td.classList.add(cls_highl)

    // convert datetime_local to datetime_utc
        const datetime_utc = datetime_local.utc()
        // console.log("new datetime_utc hour: ", datetime_utc.format());
        const datetime_utc_iso = datetime_utc.toISOString()
        // console.log("datetime_utc_iso: ", datetime_utc_iso);
    // put new datetime back in el_timepicker data-datetime
        el_timepicker.setAttribute("data-datetime", datetime_utc_iso);

        //if (dict["isAmpm"]) { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict)}
        //HighlightAndDisableHours(el_timepicker, UpdateTableRow, dict)
        //HighlightAndDisableMinutes(el_timepicker, UpdateTableRow, dict)


    }  // SetAmPm

//========= SetHour  ====================================
    function SetHour(el_timepicker, UpdateTableRow, url_str, tbody, td, comp_timezone, quicksave, cls_highl) {
       //console.log("==== SetHour  =====");

    // get datetime_utc_iso from el_timepicker data-datetime, convert to local (i.e. comp_timezone)
        const dict = GetCurMinMaxDict(el_timepicker);
        let datetime_local = dict["cur_datetime_local"];
        //console.log("datetime_local: ", datetime_local.format());

    // get new hour from data-hour of td
        const new_hour = get_attr_from_el_int(td, "data-hour");

    // set new hour in datetime_local
        datetime_local.hour(new_hour);

    // select new hour  td
        RemoveHighlightFromCells("timepicker_hour", tbody, cls_highl)
        td.classList.add(cls_highl);

    // convert datetime_local to datetime_utc
        const datetime_utc = datetime_local.utc()
        //console.log("new datetime_utc hour: ", datetime_utc.format());
        const datetime_utc_iso = datetime_utc.toISOString()

    // put new datetime back in el_timepicker data-datetime
        el_timepicker.setAttribute("data-datetime", datetime_utc_iso);
        //console.log(el_timepicker);


        //if (dict["isAmpm"]) { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict)}
        //HighlightAndDisableHours(el_timepicker, UpdateTableRow, dict)
        //HighlightAndDisableMinutes(el_timepicker, UpdateTableRow, dict)


    // save in quicksave mode
        if (quicksave){HandleTimepickerSave(el_timepicker, UpdateTableRow, url_str, quicksave, true)}
    }  // SetHour

//========= SetMinute  ====================================
    function SetMinute(el_timepicker, tbody, td, UpdateTableRow, comp_timezone, cls_highl) {
        //console.log("==== SetMinute  =====");

    // get datetime_utc_iso from el_timepicker data-datetime, convert to local (i.e. comp_timezone)
        const dict = GetCurMinMaxDict(el_timepicker);
        let datetime_local = dict["cur_datetime_local"];
        //console.log("datetime_local: ", datetime_local.format());

    // get new minutes from data-minute of td
        //console.log(td);
        const new_minute = get_attr_from_el_int(td, "data-minute");
        //console.log("new_minute: ", new_minute);

    // set new minutes in datetime_local
        datetime_local.minute(new_minute);

    // select new minutes td
        //RemoveHighlightFromCells("timepicker_minute", tbody, cls_highl)
        td.classList.add(cls_highl)

    // convert datetime_local to datetime_utc
        const datetime_utc = datetime_local.utc()
        // console.log("new datetime_utc hour: ", datetime_utc.format());
        const datetime_utc_iso = datetime_utc.toISOString()
        // console.log("datetime_utc_iso: ", datetime_utc_iso);
    // put new datetime back in el_timepicker data-datetime
        el_timepicker.setAttribute("data-datetime", datetime_utc_iso);

        //if (dict["isAmpm"]) { HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict)}
        //HighlightAndDisableHours(el_timepicker, UpdateTableRow, dict)
        //HighlightAndDisableMinutes(el_timepicker, UpdateTableRow, dict)


    }  // SetMinute

//========= ChangeQuicksave  ====================================
    function ChangeQuicksave(quick_save, is_quicksave_mode, cls_hide) {
        //console.log(" --- ChangeQuicksave --- ");
        //console.log("quick_save ", quick_save, "is_quicksave_mode ", is_quicksave_mode, );
        let quicksave_haschanged = false;
        if(is_quicksave_mode) {
            //if (quick_save) {quick_save = false} else {quick_save = true}
            quick_save = !quick_save
            let el_timepicker_save = document.getElementById("id_timepicker_save");
            if(quick_save){
                el_timepicker_save.classList.add(cls_hide);
            } else {
                el_timepicker_save.classList.remove(cls_hide);
            }
            quicksave_haschanged = true
        //console.log("new quick_save ", quick_save);
        }
        return {"quicksave_haschanged": quicksave_haschanged, "quicksave": quick_save}
    }

//=========  HandleTimepickerSave  ================ PR2019-06-27
    function HandleTimepickerSave(el_timepicker, UpdateTableRow, url_str, quicksave, is_quicksave_mode=false) {
        console.log("===  function HandleTimepickerSave =========");

// ---  change quicksave when mode === "quicksave"
        //console.log("is_quicksave_mode: ", is_quicksave_mode, " is_quicksave_mode: ", typeof is_quicksave_mode );
        const quicksave_dict = ChangeQuicksave(quicksave, is_quicksave_mode, cls_hide);
        const quicksave_haschanged = quicksave_dict["quicksave_haschanged"]
        quicksave = quicksave_dict["quicksave"]
        //console.log("quicksave: ", quicksave, " type: ", typeof quicksave );
        //console.log("quicksave_haschanged: ", quicksave_haschanged, "quicksave: ", quicksave );

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_timepicker.getAttribute("data-ppk"))
        const field = el_timepicker.getAttribute("data-field")
        const table = el_timepicker.getAttribute("data-table")
        //console.log ("field = ", field, "table = ", table)
        //console.log (el_timepicker)

// get values from el_timepicker

        const id_str = get_attr_from_el(el_timepicker, "data-pk")
        const ppk_str = get_attr_from_el(el_timepicker, "data-ppk");

        let dict = GetCurMinMaxDict(el_timepicker)

        let data_rosterdate = dict["data_rosterdate"];

        //const comp_timezone = dict["comp_timezone"];

    // get moment_dte from el_timepicker data-data_datetime
        const data_datetime = dict["data_datetime"];
        const datetime_utc = moment.utc(data_datetime);
        const datetime_utc_iso =  datetime_utc.toISOString();
        console.log ("datetime_utc_iso = ", datetime_utc_iso)

        const offset = dict["offset"];

    // check if datetime is within min max range
        const cur_datetime_local = dict["cur_datetime_local"];
        const min_datetime_local = dict["min_datetime_local"];
        const max_datetime_local = dict["max_datetime_local"];
        const within_range = DatetimeWithinRange(cur_datetime_local, min_datetime_local, max_datetime_local)

        if (!within_range) {
        //    console.log("not within_range: " + cur_datetime_local.format())
        }
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
            if (!!id_dict){row_upload["id"] = id_dict};

            if (quicksave_haschanged){row_upload["quicksave"] = quicksave};

            if (!!datetime_utc_iso){
                let tr_selected = document.getElementById(pk_str)

                row_upload[field] = {"offset": offset, "rosterdate": data_rosterdate, "update": true}
                //row_upload[field] = {"datetime": datetime_utc_iso, "rosterdate": data_rosterdate, "offset": offset, "update": true}

                console.log ("url_str: ", url_str);
                console.log ("row_upload: ");
                console.log (row_upload);

                let parameters = {}
                if (table === "schemeitem") {
                    parameters["upload"] = JSON.stringify (row_upload);
                } else {
                    parameters[table] = JSON.stringify (row_upload);
                }

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                console.log ("response", response);
                        if ("item_update" in response) {
                            //console.log("...... UpdateTableRow .....");
                            UpdateTableRow(table, tr_selected, response["item_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }
             popupbox_removebackground("input_timepicker");
            el_timepicker.classList.add(cls_hide);
        }  // if(!!pk_str && !! parent_pk){
    }  // HandleTimepickerSave

//========= HighlightAndDisableBtnPrevNextDay  ====================================
    function HighlightAndDisableBtnPrevNextDay(prevday_disabled, nextday_disabled) {
        let btn_prevday = document.getElementById("id_timepicker_prevday")
        let btn_nextday = document.getElementById("id_timepicker_nextday")
        btn_prevday.disabled = prevday_disabled;
    }  // HighlightAndDisableBtnPrevNextDay

//========= HighlightAndDisableAmpm  ====================================
    function HighlightAndDisableAmpm(el_timepicker, UpdateTableRow, dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( ">>>>=== HighlightAndDisableAmpm  ");
        //console.log( dict);
        let curDate_is_rosterdate = dict["curDate_is_rosterdate"], prevday_disabled = dict["prevday_disabled"], nextday_disabled = dict["nextday_disabled"];
        let comp_timezone = dict["comp_timezone"], timeformat = dict["timeformat"], interval = dict["interval"], quicksave = dict["quicksave"];
        let url_str = dict["url_str"];
        let cls_highl = dict["cls_highl"], cls_hover = dict["cls_hover"];

        const curDate = dict["curDate"]
        const curDateMidnight = curDate.clone()
        const curDateMidday = curDate.clone().hour(12);
        const curDateEndOfDay = curDate.clone().add(1, 'days');
        //console.log("curDateMidnight", curDateMidnight.format());
        //console.log("curDateMidday", curDateMidday.format());
        //console.log("curDateEndOfDay", curDateEndOfDay.format());

        const range_min = dict["min_datetime_local"];
        const range_max = dict["max_datetime_local"];

        let isAmpm = dict["isAmpm"];
        let curAmPm = dict["curAmpm"];
        let curHoursAmpm = dict["curHoursAmpm"];
        //console.log("isAmpm", isAmpm, "curAmPm", curAmPm, "curHoursAmpm", curHoursAmpm);

        if (isAmpm) {
            const tbody = document.getElementById("id_timepicker_tbody_hour");
            let tds = tbody.getElementsByClassName("timepicker_ampm")
            for (let i=0, td, cell_value, highlighted, period_within_range, disabled; td = tds[i]; i++) {
                cell_value = get_attr_from_el_int(td, "data-ampm");
                //console.log("cell_value", cell_value)
                highlighted = (curAmPm === cell_value);
                //console.log("console", console)

                let period_min, period_max // am: period is from 00.00u till 12.00 u  pm: period is from 12.00u till 24.00 u
                if (cell_value === 0){
                    period_min =  curDateMidnight;
                    period_max =  curDateMidday;
                 } else {
                    period_min =  curDateMidday;
                    period_max =  curDateEndOfDay;
                }
                period_within_range = PeriodWithinRange(period_min, period_max, range_min, range_max)

                disabled = false // TODO  !period_within_range;

                HighlightAndDisableCell(td, disabled, highlighted, cls_highl, cls_hover);

                CellEventhandler(el_timepicker, tbody, td, UpdateTableRow, url_str, "ampm", comp_timezone, quicksave, cls_highl, disabled)
            }
        }  //  if (timeformat === 'AmPm') {
    }  // HighlightAndDisableAmpm

//========= HighlightAndDisableHours  ====================================
    function HighlightAndDisableHours(el_timepicker, UpdateTableRow, dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( ">>>>=== HighlightAndDisableHours  ");
        //console.log( dict);
        const curDate = dict["curDate"]
        const cur_datetime_local = dict["cur_datetime_local"]
        const min_datetime_local = dict["min_datetime_local"]
        const max_datetime_local = dict["max_datetime_local"]
        const curHours = dict["curHours"];

        //console.log("min_datetime_local", min_datetime_local.format());
        //console.log("cur_datetime_local", cur_datetime_local.format());
        //console.log("max_datetime_local", max_datetime_local.format());

        const comp_timezone = dict["comp_timezone"], quicksave = dict["quicksave"];
        const url_str = dict["url_str"];
        const cls_highl = dict["cls_highl"], cls_hover = dict["cls_hover"];

        const tbody = document.getElementById("id_timepicker_tbody_hour");
        let tds = tbody.getElementsByClassName("timepicker_hour")
        for (let i=0, td, cell_value, cell_value_ampm, cell_datetime, curDatetime, highlighted, disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-hour");

            cell_datetime = curDate.clone().add(cell_value, "hour")
            //console.log("cell_datetime: ", cell_datetime.format());

            highlighted = (curHours === cell_value);

            disabled = false // TODO  disabled = !DatetimeWithinRange(cell_datetime, min_datetime_local, max_datetime_local)
            HighlightAndDisableCell(td, disabled, highlighted, cls_highl, cls_hover);

            CellEventhandler(el_timepicker, tbody, td, UpdateTableRow, url_str, "hour", comp_timezone, quicksave, cls_highl, disabled)

        }
    }  // HighlightAndDisableHours


//========= HighlightAndDisableMinutes  ====================================
    function HighlightAndDisableMinutes(el_timepicker, UpdateTableRow, dict) {
        // from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        //console.log( ">>>>=== HighlightAndDisableMinutes  ");
        //console.log( dict);

        const curDate = dict["curDate"]
        const cur_datetime_local = dict["cur_datetime_local"]
        const min_datetime_local = dict["min_datetime_local"]
        const max_datetime_local = dict["max_datetime_local"]
        const curHours = dict["curHours"];
        const curMinutes = dict["curMinutes"];

        //console.log("curHours", curHours, "curMinutes", curMinutes);
        let comp_timezone = dict["comp_timezone"], timeformat = dict["timeformat"], interval = dict["interval"], quicksave = dict["quicksave"];
        let url_str = dict["url_str"];
        let cls_highl = dict["cls_highl"], cls_hover = dict["cls_hover"];

        //console.log("min_datetime_local", min_datetime_local.format());
        //console.log("cur_datetime_local", cur_datetime_local.format());
        //console.log("max_datetime_local", max_datetime_local.format());

        let tbody = document.getElementById("id_timepicker_tbody_minute");
        let tds = tbody.getElementsByClassName("timepicker_minute")
        for (let i=0, td, cell_value, cell_datetime, highlighted, disabled; td = tds[i]; i++) {
            cell_value = get_attr_from_el_int(td, "data-minute");
            highlighted = (curMinutes === cell_value);

            cell_datetime = curDate.clone().add(curHours, "hours").add(cell_value, "minutes")
            disabled = false // TODO  disabled = !DatetimeWithinRange(cell_datetime, min_datetime_local, max_datetime_local)
            //console.log("cell_datetime: ", cell_datetime.format(), "disabled: ", disabled);

            //HighlightAndDisableCell(td, disabled, highlighted, cls_highl, cls_hover);

            // CellEventhandler(el_timepicker, tbody, td, UpdateTableRow, url_str, "minute", comp_timezone, quicksave, cls_highl, disabled)

        }
    }  // HighlightAndDisableMinutes


//========= HighlightAndDisableCell  ====================================
    function HighlightAndDisableCell(td, disabled, highlighted, cls_highl, cls_hover) {

        td.classList.remove("tr_notallowed")
        td.classList.remove("tr_disabled")
        td.classList.remove(cls_highl)

        let btn_save = document.getElementById("id_timepicker_save") ;
        btn_save.disabled = false;
        // TODO get it working
        disabled = false
        if (disabled){
            td.removeEventListener("mouseenter", function(){td.classList.add(cls_hover);});
            td.removeEventListener("mouseleave", function(){td.classList.remove(cls_hover);});
            if (highlighted){
                td.classList.add("tr_notallowed")
                btn_save.disabled = true;
            } else {
                td.classList.add("tr_disabled")
            }
        } else {
            if (highlighted){
                td.classList.add(cls_highl)
            }
            td.addEventListener("mouseenter", function(){td.classList.add(cls_hover);});
            td.addEventListener("mouseleave", function(){td.classList.remove(cls_hover);});
        }
    }  // HighlightAndDisableCell

//========= CellEventhandler  ====================================
    function CellEventhandler(el_timepicker, tbody, td, UpdateTableRow, url_str, data_name, comp_timezone, quicksave, cls_highl, disabled) {
        //console.log( ">>>>=== CellEventhandler  ");
        //console.log( td);
        disabled = false // TODO
        if (data_name === "hour"){
            if (!disabled){
                td.addEventListener("click", function() {
                    SetHour(el_timepicker, UpdateTableRow, url_str, tbody, td, comp_timezone, quicksave, cls_highl)}, false)
            } else {
                td.removeEventListener("click", function() {
                    SetHour(el_timepicker, UpdateTableRow, url_str, tbody, td, comp_timezone, quicksave, cls_highl)}, false)
            }
        } else if (data_name === "minuteXXX"){
            if (!disabled){
                td.addEventListener("click", function() {
                    SetMinute(el_timepicker, tbody, td, UpdateTableRow, comp_timezone, cls_highl)}, false)
            } else {
                td.removeEventListener("click", function() {
                    SetMinute(el_timepicker, tbody, td, UpdateTableRow, comp_timezone, cls_highl)}, false)
            }
        } else if (data_name === "ampm"){
            if (!disabled){
                td.addEventListener("click", function() {
                    SetAmPm(el_timepicker, tbody, td, comp_timezone, cls_highl)}, false)
            } else {
                td.removeEventListener("click", function() {
                    SetAmPm(el_timepicker, tbody, td, comp_timezone, cls_highl)}, false)
            }
        }


    }  // CellEventhandler

//========= RemoveHighlightFromCells  ====================================
    function RemoveHighlightFromCells(class_name, tbody, cls_highl) {
        let tds = tbody.getElementsByClassName(class_name);
        for (let x = 0, len = tds.length; x < len; x++) {
            tds[x].classList.remove(cls_highl);
        }
    }

//========= function pop_background_remove  ====================================
    function popupbox_removebackground(class_name){
        // remove selected color from all input popups
        let elements = document.getElementsByClassName(class_name);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }


//========= GetCurMinMaxDict  ====================================
    function GetCurMinMaxDict(el_timepicker) {
    // PR2019-07-07
        //console.log(" ---+++ GetCurMinMaxDict +++--- ")


    // get values from el_timepicker
        const data_field = get_attr_from_el(el_timepicker, "data-field");
        const data_rosterdate = get_attr_from_el(el_timepicker, "data-rosterdate");
        const data_datetime = get_attr_from_el(el_timepicker, "data-datetime");
        const data_mindatetime = get_attr_from_el(el_timepicker, "data-mindatetime");
        const data_maxdatetime = get_attr_from_el(el_timepicker, "data-maxdatetime");
        const comp_timezone = get_attr_from_el(el_timepicker, "data-timezone");
        const timeformat = get_attr_from_el(el_timepicker, "data-timeformat");
        const interval = get_attr_from_el_int(el_timepicker, "data-interval");
        const quicksave = get_attr_from_el(el_timepicker, "data-quicksave", false);
        const url_str = get_attr_from_el(el_timepicker, "data-url_str");
        const cls_highl = get_attr_from_el(el_timepicker, "data-cls_highl");
        const cls_hover = get_attr_from_el(el_timepicker, "data-cls_hover");

        // get curRosterdate: local datetime moment, midnight,  from data_rosterdate
        const curRosterdate = GetRosterdateLocal(data_rosterdate, comp_timezone)

    // convert data_datetime to  cur_datetime_local. If no current value: get from rosterdate
        let cur_datetime_local;
        if (!!data_datetime){
            cur_datetime_local = GetDatetimeLocal(data_datetime, comp_timezone)
        } else {
            cur_datetime_local = curRosterdate;
        };

        let curDate_is_rosterdate = false, prevday_disabled = false, nextday_disabled = false;
        let curDate, minDate, maxDate;
        let curHours = 0, minHours = 0, maxHours = 24;
        let curMinutes = 0, minMinutes = 0, maxMinutes = 60;

        let isAmpm = false, curHoursAmpm = 0, curAmpm = 0;

        let min_datetime_local, max_datetime_local, curdate_rosterdate_diff = 0, offset = "";
        if (!!cur_datetime_local) {
            //console.log("cur_datetime_local", cur_datetime_local.format())
            //console.log("curRosterdate", curRosterdate.format())
            // from https://momentjs.com/guides/
            curHours = cur_datetime_local.hour();
            curMinutes = cur_datetime_local.minutes();
            curDate = cur_datetime_local.clone().startOf("day");

            curdate_rosterdate_diff = curDate.diff(curRosterdate, "days");
            //console.log("curdate_rosterdate_diff", curdate_rosterdate_diff)

            curDate_is_rosterdate = (curDate.diff(curRosterdate) === 0) // (curDate = curRosterdate)
            //console.log("curDate_is_rosterdate", curDate_is_rosterdate)
            //console.log("curHours", curHours)
            //console.log("curMinutes", curMinutes)
            //console.log("curDate", curDate.format())

            offset = curdate_rosterdate_diff.toString() + ";" + curHours.toString() + ";" + curMinutes.toString()
            //console.log("offset", offset)

            if(!!data_mindatetime){
                min_datetime_local = GetDatetimeLocal(data_mindatetime, comp_timezone);
                minDate = min_datetime_local.clone().startOf("day");
                prevday_disabled = (minDate.diff(curDate) >= 0) // (minDate >= curDate)
                if(prevday_disabled){
                    minHours = min_datetime_local.hour()
                    minMinutes = min_datetime_local.minute()
                };

            }
            if(!!data_maxdatetime){
                max_datetime_local = GetDatetimeLocal(data_maxdatetime, comp_timezone);
                maxDate = max_datetime_local.clone().startOf("day");
                nextday_disabled = (curDate.diff(maxDate) >= 0) // (maxDate >= curDate)
                if(nextday_disabled){
                    maxHours = max_datetime_local.hour()
                    maxMinutes = max_datetime_local.minute()
                };
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
        };

        // calculate offset "-1;22;15" (22:15 u  previous day
        let dict = {};
        if (!!data_field) {dict["data_field"] = data_field};
        if (!!data_rosterdate) {dict["data_rosterdate"] = data_rosterdate};
        if (!!data_datetime) {dict["data_datetime"] = data_datetime};

        if (!!cur_datetime_local) {dict["cur_datetime_local"] = cur_datetime_local};
        if (!!min_datetime_local) {dict["min_datetime_local"] = min_datetime_local};
        if (!!max_datetime_local) {dict["max_datetime_local"] = max_datetime_local};

        if (!!curDate) {dict["curDate"] = curDate};
        if (!!curDate_is_rosterdate) {dict["curDate_is_rosterdate"] = curDate_is_rosterdate};
        if (!!prevday_disabled) {dict["prevday_disabled"] = prevday_disabled};
        if (!!nextday_disabled) {dict["nextday_disabled"] = nextday_disabled};

        dict["isAmpm"] = isAmpm;
        if (!!curHoursAmpm) {dict["curHoursAmpm"] = curHoursAmpm};
        if (!!curAmpm) {dict["curAmpm"] = curAmpm};

        if (!!isAmpm) {dict["isAmpm"] = isAmpm};
        if (!!curHoursAmpm) {dict["curHoursAmpm"] = curHoursAmpm};
        if (!!curAmpm) {dict["curAmpm"] = curAmpm};
        if (!!offset) {dict["offset"] = offset};

        if (!!curHours) {dict["curHours"] = curHours};
        if (!!minHours) {dict["minHours"] = minHours};
        if (!!maxHours) {dict["maxHours"] = maxHours};

        if (!!curMinutes) {dict["curMinutes"] = curMinutes};
        if (!!minMinutes) {dict["minMinutes"] = minMinutes};
        if (!!maxMinutes) {dict["maxMinutes"] = maxMinutes};

        if (!!comp_timezone) {dict["comp_timezone"] = comp_timezone};
        if (!!timeformat) {dict["timeformat"] = timeformat};
        if (!!interval) {dict["interval"] = interval};
        if (!!quicksave) {dict["quicksave"] = quicksave};

        if (!!url_str) {dict["url_str"] = url_str};
        if (!!cls_highl) {dict["cls_highl"] = cls_highl};
        if (!!cls_hover) {dict["cls_hover"] = cls_hover};

        return dict;
    }  // GetCurMinMaxDict


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


//========= GetDatetimeLocal  ====================================
    function GetDatetimeLocal(data_datetime, comp_timezone) {
        //console.log(" --- GetDatetimeLocal ---")
        //console.log("data_datetime", data_datetime, typeof data_datetime)
        // PR2019-07-07
        // get cur_datetime_local from data_datetime. If no current value: get from rosterdate
        let datetime_local;
        if (!!data_datetime && !!comp_timezone) {
            datetime_local = moment.tz(data_datetime, comp_timezone)
        };
        //console.log("datetime_local", datetime_local.format(), typeof datetime_local)
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

//========= PeriodWithinRange  ====================================
    function PeriodWithinRange(period_min, period_max, range_min, range_max) {
    // PR2019-07-07
        let out_of_range = false;
        if (!!range_min && !!period_max){
            out_of_range = (period_max.diff(range_min) < 0)  // out_of_range when period_max < range_min
        }
        if (!out_of_range) {
            if (!!range_max && !!period_min){
                out_of_range = (period_min.diff(range_max) > 0) // period_min > range_max
            }
        }
        const within_range = !out_of_range;
        return within_range
    }  // PeriodWithinRange

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