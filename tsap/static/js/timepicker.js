
// ++++++++++++  TIMEPICKER +++++++++++++++++++++++++++++++++++++++
    "use strict";

//========= OpenTimepicker  ====================================
    function OpenTimepicker(el_input, el_timepicker, el_data, comp_timezone, timeformat, UpdateTableRow, url_str, quicksave, cls_hover, cls_highl) {
        console.log("===  OpenTimepicker  =====") ;

// ---  create EventListeners
        let btn_prevday = document.getElementById("id_timepicker_prevday")
            btn_prevday.addEventListener("click", function() {SetPrevNextDay("prevday", el_timepicker, comp_timezone)}, false )
        let btn_nextday = document.getElementById("id_timepicker_nextday")
            btn_nextday.addEventListener("click", function() {SetPrevNextDay("nextday", el_timepicker, comp_timezone)}, false )
        let btn_save = document.getElementById("id_timepicker_save")
            btn_save.addEventListener("click", function() {HandleTimepickerSave(el_timepicker, UpdateTableRow, url_str, quicksave, false)}, false )
        let btn_quicksave = document.getElementById("id_timepicker_quicksave")
            btn_quicksave.addEventListener("click", function() {HandleTimepickerSave(el_timepicker, UpdateTableRow, url_str, quicksave, true)}, false )
            btn_quicksave.addEventListener("mouseenter", function(){btn_quicksave.classList.add(cls_hover);});
            btn_quicksave.addEventListener("mouseleave", function(){btn_quicksave.classList.remove(cls_hover);});

// get values from tr_selected
        let tr_selected = get_tablerow_selected(el_input)
        const data_table = get_attr_from_element(tr_selected, "data-table")
        const id_str = get_attr_from_element(tr_selected, "data-pk")
        const ppk_str = get_attr_from_element(tr_selected, "data-ppk");

// get values from el_input
        const data_field = get_attr_from_element(el_input, "data-field");
        let data_rosterdate = get_attr_from_element(el_input, "data-rosterdate");
        let data_datetime = get_attr_from_element(el_input, "data-datetime");
        let data_offset = get_attr_from_element(el_input, "data-offset");
        console.log("data_rosterdate:", data_rosterdate, "data_datetime:", data_datetime, "data_offset:", data_offset)

// put values in el_timepicker
        if (!!data_table){el_timepicker.setAttribute("data-table", data_table)};
        if (!!id_str){el_timepicker.setAttribute("data-pk", id_str)};
        if (!!ppk_str){el_timepicker.setAttribute("data-ppk", ppk_str)};
        if (!!data_field){el_timepicker.setAttribute("data-field", data_field)};
        if (!!data_rosterdate){el_timepicker.setAttribute("data-rosterdate", data_rosterdate)};
        if (!!data_datetime){el_timepicker.setAttribute("data-datetime", data_datetime)};
        if (!!data_offset){el_timepicker.setAttribute("data-offset", data_offset)};

        let datetime_local;

// if no current value: get rosterdate
        if (!data_datetime) {
            if (!!data_rosterdate) {
                // data_datetime = get_attr_from_element(el_rosterdate, "data-value") + "T00:00:00"
                // datetime_local = moment.tz(data_datetime, comp_timezone );
                datetime_local = moment.tz(data_rosterdate, comp_timezone );
            }
        } else {
            datetime_local = moment.tz(data_datetime, comp_timezone );
        }
        if (!!datetime_local) {
            console.log("datetime_local:  ", datetime_local.format());

// display values in el_timepicker
            let date_str = format_datelong_from_datetimelocal(datetime_local)
            document.getElementById("id_timepicker_date").innerText = date_str

            let curHours = datetime_local.hour();
            let curMinutes = datetime_local.minutes();

            HighlightTimepickerHour(el_timepicker, curHours, curMinutes, timeformat, cls_highl)
            HighlightTimepickerMinute(el_timepicker, curMinutes, cls_highl)

    // ---  position popup under el_input
            let popRect = el_timepicker.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();
            let topPos = inpRect.top + inpRect.height;
            let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_timepicker.setAttribute("style", msgAttr)

    // ---  change background of el_input
            // first remove selected color from all imput popups
            //elements = document.getElementsByClassName("el_input");
            popupbox_removebackground("input_timepicker");
            el_input.classList.add("pop_background");

// hide save button on quicksave
            let txt_quicksave;
            if (quicksave){
                btn_save.classList.add(cls_hide);
                txt_quicksave = get_attr_from_element(el_data, "data-txt_quicksave_remove");
            } else {
                btn_save.classList.remove(cls_hide);
                txt_quicksave = get_attr_from_element(el_data, "data-txt_quicksave");
            }
            btn_quicksave.innerText = txt_quicksave

    // ---  show el_popup
            el_timepicker.classList.remove(cls_hide);
        }
    }; // function OpenTimepicker

//========= CreateTimepickerHours  ====================================
    function CreateTimepickerHours(el_timepicker, tbody, timeformat, comp_timezone, UpdateTableRow, url_str, quicksave, cls_highl, cls_hover) {
        //console.log( "--- CreateTimepickerHours  ");

        tbody.innerText = null

        //timeformat = 'AmPm' or '24h'
        const is_ampm = (timeformat === 'AmPm')
        let maxHours = 24;
        let hourRows = 4;

        if (is_ampm) {
            hourRows = 2
            maxHours = 12;
        }

        let tblRow;

// --- loop through option list
        for (let i = 0; i < hourRows; i++) {
            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            for (let j = 0, td, el_a, hours, hour_text; j < 6; j++) {
                hours = (1+j) + (i*6)
                if (hours === maxHours) {hours = 0 }
                hour_text = "00" + hours.toString()
                hour_text = hour_text.slice(-2);

                // show 12 instead of 00 when is_ampm
                if (is_ampm && hours === 0) {hour_text = "12"}

                td = tblRow.insertCell(-1);

                td.setAttribute("data-hour", hours);
                td.addEventListener("mouseenter", function(){td.classList.add(cls_hover);});
                td.addEventListener("mouseleave", function(){td.classList.remove(cls_hover);});
                td.addEventListener("click", function() {
                    SetHour(el_timepicker, UpdateTableRow, url_str, tbody, td, comp_timezone, quicksave, cls_highl)}, false)

                td.classList.add("timepicker_hour");
                td.setAttribute("align","center")

                el_a = document.createElement("a");
                el_a.innerText = hour_text
                td.appendChild(el_a);
            }
        }  // for (let i = 0,
        if(is_ampm){
            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);

            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            td.setAttribute("colspan",6)

            for (let j = 0, td, el_a, ampm_text; j < 2; j++) {
                if(j === 0) {ampm_text = "AM"} else {ampm_text = "PM"}

                td = tblRow.insertCell(-1);

                td.setAttribute("data-ampm", j);
                td.addEventListener("mouseenter", function(){td.classList.add(cls_hover);});
                td.addEventListener("mouseleave", function(){td.classList.remove(cls_hover);});
                td.addEventListener("click", function() {
                    SetAmPm(el_timepicker, tbody, td, comp_timezone, cls_highl)}, false )

                td.setAttribute("colspan",3)
                td.setAttribute("align","center")

                td.classList.add("timepicker_ampm");

                el_a = document.createElement("a");
                el_a.innerText = ampm_text
                td.appendChild(el_a);
            }
        }
    }  //function CreateTimepickerHours

//========= CreateTimepickerMinutes  ====================================
    function CreateTimepickerMinutes(el_timepicker, tbody, interval, comp_timezone, cls_highl, cls_hover) {
        //console.log( "=== CreateTimepickerMinutes  ");
        //console.log( tbody);

// ---  set references to elements
        tbody.innerText = null

        let minutes = 0, minutes_text;
        let rows = 0
        let columns = 0;

        switch (interval) {
        case 1:
            rows = 6; columns = 10
            break;
        case 2:
            rows = 6; columns = 5
            break;
        case 3:
            rows = 4; columns = 5
            break;
        case 5:
            rows = 4; columns = 3
            break;
        case 10:
            rows = 2; columns = 3
            break;
        case 12:
            rows = 1; columns = 5
            break;
        case 15:
            rows = 2; columns = 2
            break;
        case 20:
            rows = 1; columns = 3
            break;
        case 30:
            rows = 1; columns = 2
            break;
		}

// --- loop through option list
        for (let i = 0, tblRow; i < rows; i++) {
            tblRow = tbody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            for (let j = 0, td, el_a ; j < columns; j++) {
                minutes = minutes + interval
                if (minutes === 60) {minutes = 0 }
                minutes_text = "00" + minutes.toString()
                minutes_text = minutes_text.slice(-2);

                td = tblRow.insertCell(-1);

                td.setAttribute("data-minute", minutes);
                td.addEventListener("mouseenter", function(){td.classList.add(cls_hover);});
                td.addEventListener("mouseleave", function(){td.classList.remove(cls_hover);});

                td.addEventListener("click", function() {
                    SetMinute(el_timepicker, tbody, td, comp_timezone, cls_highl)}, false )

                td.classList.add("timepicker_minute");

                el_a = document.createElement("a");
                el_a.innerText = minutes_text
                td.appendChild(el_a);
            }
        }  // for (let i = 0,
    }  //function CreateTimepickerMinutes

//========= SetPrevNextDay  ====================================
    function SetPrevNextDay(type_str, el_timepicker, comp_timezone) {
        //console.log("==== SetPrevNextDay  =====", type_str);

    // get datetime_utc_iso from el_timepicker data-datetime, convert to local (i.e. comp_timezone)
        const data_datetime = get_attr_from_element(el_timepicker, "data-datetime");
        let datetime_local = moment.tz(data_datetime, comp_timezone );
        // console.log("datetime_local: ", datetime_local.format());

    // set  day_add to 1 or -1
        let day_add = 1;
        if (type_str === "prevday") { day_add = -1};
    // add / subtract day from datetime_local
        datetime_local.add(day_add, 'day')

    // display new date in el_timepicker
        let date_str = format_datelong_from_datetimelocal(datetime_local)
        document.getElementById("id_timepicker_date").innerText = date_str

    // convert datetime_local to datetime_utc
        const datetime_utc = datetime_local.utc()
        // console.log("new datetime_utc hour: ", datetime_utc.format());
        const datetime_utc_iso = datetime_utc.toISOString()
        // console.log("datetime_utc_iso: ", datetime_utc_iso);

    // put new datetime back in el_timepicker data-datetime
        el_timepicker.setAttribute("data-datetime", datetime_utc_iso);
        console.log(el_timepicker);

    }  // SetPrevNextDay

//========= SetHour  ====================================
    function SetHour(el_timepicker, UpdateTableRow, url_str, tbody, td, comp_timezone, quicksave, cls_highl) {
        //console.log("==== SetHour  =====");

    // get datetime_utc_iso from el_timepicker data-datetime, convert to local (i.e. comp_timezone)
        const data_datetime = get_attr_from_element(el_timepicker, "data-datetime");
        let datetime_local = moment.tz(data_datetime, comp_timezone );
        //console.log("datetime_local: ", datetime_local.format());
    // get new hour from data-hour of td
        const new_hour = get_attr_from_element_int(td, "data-hour");
    // set new hour in datetime_local
        datetime_local.hour(new_hour);
    // select new hour  td
        RemoveHighlightFromCells("timepicker_hour", tbody, cls_highl)
        td.classList.add(cls_highl)
    // convert datetime_local to datetime_utc
        const datetime_utc = datetime_local.utc()
        //console.log("new datetime_utc hour: ", datetime_utc.format());
        const datetime_utc_iso = datetime_utc.toISOString()
        //console.log("data-value: ", datetime_utc_iso);
    // put new datetime back in el_timepicker data-datetime
        el_timepicker.setAttribute("data-datetime", datetime_utc_iso);
        //console.log(el_timepicker);
    // save in quicksave mode
        if (quicksave){HandleTimepickerSave(el_timepicker, UpdateTableRow, url_str, quicksave, true)}
    }  // SetHour

//========= SetMinute  ====================================
    function SetMinute(el_timepicker, tbody, td, comp_timezone, cls_highl) {
        //console.log("==== SetMinute  =====");

    // get datetime_utc_iso from el_timepicker data-datetime, convert to local (i.e. comp_timezone)
        const data_datetime = get_attr_from_element(el_timepicker, "data-datetime");
        let datetime_local = moment.tz(data_datetime, comp_timezone );
        // console.log("datetime_local: ", datetime_local.format());
    // get new minutes from data-minute of td
        const new_minute = get_attr_from_element_int(td, "data-minute");
    // set new minutes in datetime_local
        datetime_local.minute(new_minute);
    // select new minutes td
        RemoveHighlightFromCells("timepicker_minute", tbody, cls_highl)
        td.classList.add(cls_highl)
    // convert datetime_local to datetime_utc
        const datetime_utc = datetime_local.utc()
        // console.log("new datetime_utc hour: ", datetime_utc.format());
        const datetime_utc_iso = datetime_utc.toISOString()
        // console.log("datetime_utc_iso: ", datetime_utc_iso);
    // put new datetime back in el_timepicker data-datetime
        el_timepicker.setAttribute("data-datetime", datetime_utc_iso);
    }  // SetMinute

//========= SetAmPm  ====================================
    function SetAmPm(el_timepicker, tbody, td, comp_timezone, cls_highl) {
        //console.log("==== SetAmPm  =====");

    // get datetime_utc_iso from el_timepicker data-datetime, convert to local (i.e. comp_timezone)
        const data_datetime = get_attr_from_element(el_timepicker, "data-datetime");
        let datetime_local = moment.tz(data_datetime, comp_timezone );
        // console.log("datetime_local: ", datetime_local.format());

    // get new ampm from td data-ampm
        const new_ampm = get_attr_from_element_int(td, "data-ampm");
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
    }  // SetAmPm

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
        console.log("is_quicksave_mode: ", is_quicksave_mode, " is_quicksave_mode: ", typeof is_quicksave_mode );

        const quicksave_dict = ChangeQuicksave(quicksave, is_quicksave_mode, cls_hide);
        const quicksave_haschanged = quicksave_dict["quicksave_haschanged"]
        quicksave = quicksave_dict["quicksave"]

        console.log("quicksave: ", quicksave, " type: ", typeof quicksave );
        console.log("quicksave_haschanged: ", quicksave_haschanged, "quicksave: ", quicksave );

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_timepicker.getAttribute("data-ppk"))
        const field =  el_timepicker.getAttribute("data-field")
        const table =  el_timepicker.getAttribute("data-table")
        console.log ("field = ", field, "table = ", table)
        console.log (el_timepicker)


// get values from el_timepicker
        const data_table = get_attr_from_element(el_timepicker, "data-table")
        const id_str = get_attr_from_element(el_timepicker, "data-pk")
        const ppk_str = get_attr_from_element(el_timepicker, "data-ppk");
        const data_field = get_attr_from_element(el_timepicker, "data-field");
        let data_rosterdate = get_attr_from_element(el_timepicker, "data-rosterdate");
        let data_datetime = get_attr_from_element(el_timepicker, "data-datetime");
        let data_offset = get_attr_from_element(el_timepicker, "data-offset");
        console.log("table:", data_table, "field:", data_field, "pk:", id_str, "ppk:", ppk_str)
        console.log("rosterdate:", data_rosterdate, "datetime:", data_datetime, "offset:", data_offset)

    // get moment_dte from el_timepicker data-data_datetime
        const datetime_utc = moment.utc(data_datetime);
        console.log ("datetime_utc = ", datetime_utc.format())

        const datetime_utc_iso =  datetime_utc.toISOString();
        console.log ("datetime_utc_iso = ", datetime_utc_iso)

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

                row_upload[field] = {"datetime": datetime_utc_iso, "update": true};

                console.log ("url_str: ", url_str);
                console.log ("row_upload: ");
                console.log (row_upload);

                let parameters = {"emplhour_upload": JSON.stringify (row_upload)};
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
                            UpdateTableRow(tr_selected, response["item_update"])
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


//========= HighlightTimepickerHour  ====================================
    function HighlightTimepickerHour(el_timepicker, curHours, curMinutes, timeformat, cls_highl) {
        console.log( "=== HighlightTimepickerHour  ");
        console.log( "curHours:", curHours, "curMinutes:", curMinutes, "timeformat:", timeformat);

        let tbody = document.getElementById("id_timepicker_tbody_hour");

        let curAmPm = 0;
        if (timeformat === 'AmPm') {
            if (curHours >= 12) {
                curHours -= 12;
                curAmPm = 1;
            }
            HighlightTimepickerCell(tbody, "ampm", curAmPm, cls_highl)
        }
        HighlightTimepickerCell(tbody, "hour", curHours, cls_highl)
    }  //function HighlightTimepickerHour

//========= HighlightTimepickerMinute  ====================================
    function HighlightTimepickerMinute(el_timepicker, curMinutes, cls_highl) {
        //console.log( " --- HighlightTimepickerMinute --- ");
        //console.log( "curMinutes:", curMinutes);
        // let tbody = el_timepicker.getElementsByClassName("timepicker_tbody_minute")
        let tbody = document.getElementById("id_timepicker_tbody_minute");

        HighlightTimepickerCell(tbody, "minute", curMinutes, cls_highl)
    }

//========= HighlightTimepickerCell  ====================================
    function HighlightTimepickerCell(tbody, data_name, curValue, cls_highl) {
// from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        let tds = tbody.getElementsByClassName("timepicker_" + data_name)
        for (let i=0, td, value; td = tds[i]; i++) {
            value = get_attr_from_element_int(td, "data-" + data_name)
            if (curValue === value){
                td.classList.add(cls_highl)
            } else {
                td.classList.remove(cls_highl)
            }
        }
    }

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