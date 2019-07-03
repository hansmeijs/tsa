// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// ---  id of selected customer and selected order
        let selected_item_pk = 0;

        let rosterdate_fill;
        let rosterdate_remove;

        let companyoffset = 0 // # in seconds
        const useroffset = get_userOffset();

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let filter_text = "";
        let filter_hide_inactive = true;
        let filter_mod_employee = "";

        let customer_list = [];
        let order_list = [];
        let shift_list = [];
        let abscat_list = [];
        let employee_list = [];
        let emplhour_list = [];

        let tblBody_select = document.getElementById("id_tbody_select");
        let tblBody_items = document.getElementById("id_tbody_items");
        let tblHead_items = document.getElementById("id_thead_items");

        let el_mod_tbody_select =  document.getElementById("id_mod_tbody_select");

        let el_modal_body = document.getElementById("id_modal_body")
        let el_modal_body_right = document.getElementById("id_modal_body_right")
        let el_modal_header = document.getElementById("id_modal_header")

        let el_timepicker = document.getElementById("id_timepicker")
        let el_timepicker_tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        let el_timepicker_tbody_minute = document.getElementById("id_timepicker_tbody_minute");

        let el_popup_wdy = document.getElementById("id_popup_wdy");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

        let el_loader = document.getElementById("id_loading_img");
        let el_msg = document.getElementById("id_msgbox");

        document.addEventListener('click', function (event) {
// hide msgbox
            el_msg.classList.remove("show");
 // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tblBody_items)};

// close el_popup_wdy
            let close_popup = true
            if (event.target.classList.contains("input_popup_wdy")) {close_popup = false} else
            if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_popup_wdy");
                el_popup_wdy.classList.add(cls_hide)};
// close el_timepicker
            close_popup = true
            if (event.target.classList.contains("input_timepicker")) {close_popup = false} else
            if (el_timepicker.contains(event.target) && !event.target.classList.contains("timepicker_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide)};

        }, false);

// ---  create EventListener for class input_text
        // PR2019-03-03 from https://stackoverflow.com/questions/14377590/queryselector-and-queryselectorall-vs-getelementsbyclassname-and-getelementbyid
        let elements = document.getElementsByClassName("input_text");
        for (let i = 0, len = elements.length; i < len; i++) {
            let el = elements[i];
            el.addEventListener("change", function() {
                setTimeout(function() {
                    UploadChanges(el);
                }, 250);
            }, false )
        }

// ---  create EventListener for popups
        document.getElementById("id_timepicker_prevday").addEventListener("click", function() {HandleTimepickerEvent("prevday");}, false )
        document.getElementById("id_timepicker_nextday").addEventListener("click", function() {HandleTimepickerEvent("nextday");}, false )
        let el_timepicker_save = document.getElementById("id_timepicker_save")
            el_timepicker_save.addEventListener("click", function() {HandleTimepickerSave()}, false )
        let el_timepicker_quicksave = document.getElementById("id_timepicker_quicksave")
            el_timepicker_quicksave.addEventListener("click", function() {HandleTimepickerSave("quicksave")}, false )
            el_timepicker_quicksave.addEventListener("mouseenter", function(){el_timepicker_quicksave.classList.add(cls_hover);});
            el_timepicker_quicksave.addEventListener("mouseleave", function(){el_timepicker_quicksave.classList.remove(cls_hover);});

// ---  create EventListener for buttons
        let el_btn_rosterdate_fill = document.getElementById("id_btn_rosterdate_fill")
            el_btn_rosterdate_fill.addEventListener("click", function(){HandleFillRosterdate("fill")}, false)
        let el_btn_rosterdate_remove = document.getElementById("id_btn_rosterdate_remove")
            el_btn_rosterdate_remove.addEventListener("click", function(){HandleFillRosterdate("remove")}, false)

// ---  add 'keyup' event handler to filter input
        let el_filter_name = document.getElementById("id_filter_name")
        el_filter_name.addEventListener("keyup", function(){setTimeout(function() {HandleSearchFilterEvent()}, 50)});
        let el_mod_filter_employee = document.getElementById("id_mod_filter_employee")
        el_mod_filter_employee.addEventListener("keyup", function(){setTimeout(function() {HandleModalFilterEmployee("filter")}, 50)});

        let el_mod_employee = document.getElementById("id_mod_employee")
        el_mod_employee.addEventListener("keyup", function(){setTimeout(function() {HandleModalFilterEmployee("input")}, 50)});

// buttons in  modal
        id_mod_btn_absent
        document.getElementById("id_mod_btn_absent").addEventListener("click", function() {HandleModalSelect("absent");}, false )
        document.getElementById("id_mod_btn_switch").addEventListener("click", function() {HandleModalSelect("switch");}, false )
        document.getElementById("id_mod_btn_split").addEventListener("click", function() {HandleModalSelect("split");}, false )
        document.getElementById("id_mod_btn_save").addEventListener("click", function() {HandleModalSave();}, false )

// buttons in  popup_wdy
        document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_save").addEventListener("click", function() {HandlePopupWdySave();}, false )

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_element(el_data, "data-datalist_download_url");
        const url_emplhour_upload = get_attr_from_element(el_data, "data-emplhour_upload_url");
        const url_emplhour_fill_rosterdate = get_attr_from_element(el_data, "data-emplhour_fill_rosterdate_url");

        const imgsrc_inactive = get_attr_from_element(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_element(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_element(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_element(el_data, "data-imgsrc_warning");
        const imgsrc_questionmark = get_attr_from_element(el_data, "data-imgsrc_questionmark");
        const imgsrc_stat04 = get_attr_from_element(el_data, "data-imgsrc_stat04");

        const weekday_list = get_attr_from_element_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_element_dict(el_data, "data-months");
        const today_dict = get_attr_from_element_dict(el_data, "data-today");
        const interval = get_attr_from_element_int(el_data, "data-interval");

        let timeformat = get_attr_from_element(el_data, "data-timeformat");
        let quicksave = false
        if (get_attr_from_element_int(el_data, "data-quicksave") === 1 ) { quicksave = true};
        let comp_timezone = get_attr_from_element(el_data, "data-timezone");
        let user_lang = get_attr_from_element(el_data, "data-lang");

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        // console.log(moment.locales())
        moment.locale(user_lang)

        const select_text_abscat = get_attr_from_element(el_data, "data-txt_select_abscat");
        const select_text_abscat_none = get_attr_from_element(el_data, "data-txt_select_abscat_none");

        // let intervalID = window.setInterval(CheckStatus, 5000);

// --- create header row
        CreateTableHeader();

        CreateTimepickerHours();
        CreateTimepickerMinutes()

        const datalist_request = {"customer": {inactive: false},
                                  "order": {inactive: false},
                                  "employee": {inactive: false},
                                  "emplhour": {"dateXXXfirst": false, "dateXXXlast": false},
                                  "rosterdatefill": {next: true},
                                  "abscat": {inactive: false}};
        DatalistDownload(datalist_request);

//  #############################################################################################################

function CheckStatus() {
        console.log( "=== CheckStatus ")
    // function loops through emplhours, set questingsmark or warning when toimestrat / enb reached

    // this code converts ISO to date
    // var s = '2014-11-03T19:38:34.203Z';
    //   var b = s.split(/\D+/);
    //  let testdate =  new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
    //         console.log( "testdate: ", testdate)

    // new Date gives now in local time:  Thu Jun 20 2019 07:42:39 GMT-0400 (Bolivia Time) type: object
    const now_datetime_local = new Date;

    // The Date.now() method returns the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
    const now_timestamp_local = Date.now();  // timestamp_now_local : 1561030959379 type: number
    // console.log( "now_timestamp_local: ", new Date(now_timestamp_local) )



    // get now in UTC time
    const now_timestamp_UTC = now_timestamp_local - useroffset * 1000 // # useroffset is in seconds
    // console.log( "now_timestamp_UTC: ", new Date(now_timestamp_UTC) )

    // get now in dbase time
    const now_timestamp_dbase = now_timestamp_UTC - companyoffset * 1000 // # companyoffset is in seconds
    // console.log( "now_timestamp_dbase: ", new Date(now_timestamp_dbase) )

// --- loop through item_list
        let len = emplhour_list.length;
        if (len > 0){
            for (let i = 0, dict, timestart, timeend; i < len; i++) {
                dict = emplhour_list[i];
                // console.log( "emplhour_dict ", dict);

                // calculate time difference with 'now' in minutes
                timestart = get_subdict_value_by_key ( dict, "timestart", "value")
                const timestart_datetime_dbase = new Date(timestart);
                const timestart_timestamp_dbase = timestart_datetime_dbase.getTime();
                const diff_timestamp_dbase = (timestart_timestamp_dbase - now_timestamp_dbase) / 60000
// console.log();

                // console.log( "timestart ", timestart);
                // console.log( "timestart_timestamp_dbase: ", new Date(timestart_timestamp_dbase) )
                // console.log( "diff_timestamp_dbase ", diff_timestamp_dbase);
                // console.log( "hours ", diff_timestamp_dbase/60 );

                timeend = get_subdict_value_by_key ( dict, "timeend", "value")
                const timeend_datetime_dbase = new Date(timeend);
                const timeend_timestamp_dbase = timeend_datetime_dbase.getTime();
                const timeend_diff_dbase = (timeend_timestamp_dbase - now_timestamp_dbase) / 60000
// console.log();
                // console.log( "timeend ", timeend);
                // console.log( "timeend_timestamp_dbase date: ", new Date(timeend_timestamp_dbase) )
                // console.log( "timeend_diff_dbase ", timeend_diff_dbase);
                // console.log( "hours ", diff_timestamp_dbase/60 );
            }
        }
    }  // function CheckStatus

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        // console.log("datalist_request")
        // console.log( datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customer") {customer_list = []};
            if (key === "order") {order_list = []};
            if (key === "scheme") {scheme_list = []};
            if (key === "schemeitem") {schemeitem_list = []};
            if (key === "shift") {shift_list = []};
            if (key === "employee") {employee_list = []};
            if (key === "emplhour") {emplhour_list = []};
            // "rosterdatefill" for fill rosterdate
        }

        // show loader
        el_loader.classList.remove(cls_hide)
        let param = {"datalist_download": JSON.stringify (datalist_request)};
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response")
                console.log(response)
                // hide loader
                el_loader.classList.add(cls_hide)
                let fill_table = false;
                if ("abscat" in response) {
                    abscat_list= response["abscat"];
                    FillSelectAbscat(abscat_list)
                }
                if ("employee" in response) {
                    employee_list= response["employee"];
                }
                if ("rosterdatefill" in response) {
                    SetNewRosterdate(response["rosterdatefill"])
                    if ("emplhour" in response) {
                        emplhour_list= response["emplhour"];
                        console.log( " rosterdatefill FillTableRows");
                        fill_table = true;}
                }
                if ("emplhour" in response) {
                    emplhour_list= response["emplhour"];
                    console.log( " emplhour FillTableRows");
                    fill_table = true;
                    CheckStatus()
                }
                if (fill_table) {FillTableRows()}
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                // hide loader
                el_loader.classList.add(cls_hide)
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload

//========= FillDatalist  ====================================
    function FillDatalist(id_datalist, data_list, scheme_pk) {
        console.log( "===== FillDatalist  ========= ", id_datalist);

        let el_datalist = document.getElementById(id_datalist);
        el_datalist.innerText = null
        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {
            let dict = data_list[row_index];

            let pk = get_pk_from_id (dict)
            let parent_pk = get_parent_pk (dict)
            let code = get_subdict_value_by_key (dict, "code", "value", "")

            let skip = (!!scheme_pk && scheme_pk !== parent_pk)
            if (!skip){
                // console.log( "listitem", listitem)
                // listitem = {id: {pk: 12, parent_pk: 29}, code: {value: "ab"}}
                let el = document.createElement('option');
                el.setAttribute("value", code);
                // name can be looked up by datalist.options.namedItem PR2019-06-01
                el.setAttribute("name", code);
                if (!!pk){el.setAttribute("pk", pk)};

                el_datalist.appendChild(el);
            }
        }
    }; // function FillDatalist

//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader() {
        // console.log("===  CreateTableHeader == ");
        // console.log("pk", pk, "ppk", parent_pk);

        const column_count = 10;
        tblHead_items.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.

//--- insert td's to tblHead_items
        let tblRow = tblHead_items.insertRow (-1);
        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add img to first th and last th, first img not in teammembers
            // if (j === 0){AppendChildIcon(th, imgsrc_warning)} else
            if (j === column_count - 1){AppendChildIcon(th, imgsrc_delete)}
            th.classList.add("td_width_032")
// --- add text_align
            if ( ([0, 1, 2, 3].indexOf( j ) > -1) ){
                th.classList.add("text_align_left")}
// --- add text to th
            if (j === 0){th.innerText = get_attr_from_element(el_data, "data-txt_date")} else
            if (j === 1){th.innerText = get_attr_from_element(el_data, "data-txt_order")} else
            if (j === 2){th.innerText = get_attr_from_element(el_data, "data-txt_shift")} else
            if (j === 3){th.innerText = get_attr_from_element(el_data, "data-txt_employee")} else
            if (j === 4){th.innerText = get_attr_from_element(el_data, "data-txt_timestart")} else
            if (j === 5){th.innerText = "XX"} else
            if (j === 6){th.innerText = get_attr_from_element(el_data, "data-txt_timeend")} else
            if (j === 7){th.innerText = "XX"} else
            if (j === 8){th.innerText = get_attr_from_element(el_data, "data-txt_breakhours")} else
            if (j === 9){th.innerText = "XX"}
// --- add width to th

// --- add width to time fields and date fileds
            if (j === 1){
                th.classList.add("td_width_180")} else
            if (([2, 3].indexOf( j ) > -1) ){
                th.classList.add("td_width_120")
            } else {
                th.classList.add("td_width_090")};
        }
    };//function CreateTableHeader

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow( pk, parent_pk) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "ppk", parent_pk);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", parent_pk);
        tblRow.setAttribute("data-table", "emplhour");

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count;
        column_count = 10;

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([5, 7, 9].indexOf( j ) > -1){
                if (!is_new_item){
                    let img_src;
                    if (j === 5){img_src = imgsrc_questionmark} else
                    if (j === 7){img_src = imgsrc_warning} else {}
                    if (j === 9){img_src = imgsrc_stat04}

                // --- first add <a> element with EventListener to td
                    el = document.createElement("a");
                    el.setAttribute("href", "#");
                    el.addEventListener("click", function() {HandleDeleteTblrow(tblRow);}, false )

                    AppendChildIcon(el, img_src, "20")
                    td.appendChild(el);

                    td.classList.add("td_width_032")
                }
            } else {

// --- add input element to td.
                let el = document.createElement("input");
                el.setAttribute("type", "text");

// --- add data-name Attribute.
                let fieldname;
                if (j === 0){fieldname = "rosterdate"} else
                if (j === 1){fieldname = "order"} else
                if (j === 2){fieldname = "shift"} else
                if (j === 3){fieldname = "employee"} else
                if (j === 4){fieldname = "timestart"} else
                if (j === 5){fieldname = "confirmstart"} else
                if (j === 6){fieldname = "timeend"} else
                if (j === 7){fieldname = "confirmend"} else
                if (j === 8){fieldname = "breakduration"} else
                if (j === 9){fieldname = "status"};

                el.setAttribute("data-field", fieldname);

// --- add EventListener to td
                if (j === 0) {
                    if (is_new_item){el.addEventListener("click", function() {OpenPopupWDY(el);}, false )} } else
                if ([1, 2].indexOf( j ) > -1){
                    if (is_new_item){el.addEventListener("change", function() {UploadChanges(el);}, false )} } else
                if (j === 3){
                    el.addEventListener("click", function() {OpenModal(el);}, false ) } else
                if ([4, 6].indexOf( j ) > -1){
                    el.addEventListener("click", function() {OpenTimepicker(el)}, false )} else
                if (j === 8){
                    // el.addEventListener("click", function() {OpenPopupHM(el)}, false )
                };

// --- add datalist_ to td shift, team, employee
                if ([1, 2, 3].indexOf( j ) > -1){
                    if (is_new_item){el.setAttribute("list", "id_datalist_" + fieldname + "s")}  } else
                if (j === 4){
                    el.setAttribute("list", "id_datalist_" + fieldname + "s") }
// --- disable 'rosterdate', 'order' and 'shift', except in new_item
                if ([0, 1, 2].indexOf( j ) > -1){
                    if (!is_new_item){el.disabled = true}
                }
// --- add text_align
                if ( [0, 1, 2, 3].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")} else
                if ( [4, 5, 6].indexOf( j ) > -1 ){
                    el.classList.add("text_align_right")}

// --- add width to time fields and date fields
                if (j === 1){
                    el.classList.add("td_width_240")
                } else if (j === 1){
                    el.classList.add("td_width_180");
                } else {
                    el.classList.add("td_width_090")};

// --- add other classes to td
                el.classList.add("border_none");

                if (j === 0) {
                    el.classList.add("input_text"); // makes background transparent
                    el.classList.add("input_popup_wdy");
                } else if ([1, 2, 3].indexOf( j ) > -1){
                    el.classList.add("input_text"); // makes background transparent
                } else if ([4, 6].indexOf( j ) > -1){
                    el.classList.add("input_text"); // makes background transparent
                    el.classList.add("input_timepicker")
                } else if (j === 8){
                    el.classList.add("input_text"); // makes background transparent
                    //el.classList.add("input_popup_hm")
                };

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  //if (j === 0)
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log( "         FillTableRows");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let item_list = emplhour_list;

        let previous_rosterdate_dict = {};
        let tblRow;

// --- loop through item_list
        let len = item_list.length;
        if (len > 0){
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                let pk = get_pk_from_id (item_dict)
                let parent_pk = get_parent_pk (item_dict)

// get rosterdate to be used in addnew row
                previous_rosterdate_dict = get_dict_value_by_key(item_dict, 'rosterdate')

                tblRow =  CreateTableRow(pk, parent_pk)
                UpdateTableRow(tblRow, item_dict)

// --- highlight selected row
                if (pk === selected_item_pk) {
                    tblRow.classList.add("tsa_tr_selected")
                }
            }
        }  // if (!!len)

// === add row 'add new'
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "temp_pk": pk_new}

        if(isEmpty(previous_rosterdate_dict)){ previous_rosterdate_dict = today_dict};
        dict["rosterdate"] = previous_rosterdate_dict;

// console.log("FillTableRows 'add new' --> dict:", dict)
        tblRow = CreateTableRow(pk_new)
        UpdateTableRow(tblRow, dict)
    }  // FillTableRows

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, item_dict){
        console.log(" ---------  UpdateTableRow");
        console.log(item_dict);

        if (!!item_dict && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let temp_pk_str, msg_err, is_created = false, is_deleted = false;
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            // console.log("is_created", is_created, "temp_pk_str", temp_pk_str);

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                // was: let el_input = tblRow.querySelector("[name=code]");
                //console.log("tblRow", tblRow)
                let td = tblRow.cells[2];
                //console.log("td", td)
                //console.log("td.child[0]",td.child[0])
                let el_input = tblRow.cells[2].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_invalid");

                ShowMsgError(el_input, el_msg, msg_err, -60)

// --- new created record
            } else if (is_created){
                let id_str = get_attr_from_element_str(tblRow,"id")
            // check if item_dict.id 'new_1' is same as tablerow.id

                // console.log("id_str", id_str, typeof id_str);
                if(temp_pk_str === id_str){
                // console.log("temp_pk_str === id_str");
                    // if 'created' exists then 'pk' also exists in id_dict
                    const id_pk = get_dict_value_by_key (id_dict, "pk");
                // console.log("id_pk === id_pk");

            // update tablerow.id from temp_pk_str to id_pk
                    tblRow.setAttribute("id", id_pk);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", id_pk)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow )
                }
 /*           } else {
                if (!!msg_err){
                   console.log("show msg_err", msg_err);
                    tblRow.classList.add("border_invalid");
                    ShowMsgError(el_input, el_msg, msg_err, -60)
                }
*/
            };  // if (is_deleted){

            // tblRow can be deleted in  if (is_deleted){
            if (!!tblRow){

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    let field_dict = {}, fieldname, updated, err;
                    let value = "", o_value, n_value, data_value, data_o_value;
                    let wdm = "", wdmy = "", offset = "", team_pk = "", hm = "";
                    let employee_pk;
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_element(el_input, "data-field");
                        console.log("fieldname", fieldname);
                        if (fieldname in item_dict){
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            console.log("field_dict", field_dict);

                            updated = get_dict_value_by_key (field_dict, "updated");
                            err = get_dict_value_by_key (field_dict, "error");

                            if(!!err){
                                el_input.classList.add("border_none");
                                el_input.classList.add("border_invalid");

                                let el_msg = document.getElementById("id_msgbox");
                                el_msg.innerHTML = err;
                                el_msg.classList.toggle("show");

                                let msgRect = el_msg.getBoundingClientRect();
                                const elemRect = el_input.getBoundingClientRect();
                                let topPos = elemRect.top - msgRect.height -100;
                                let leftPos = elemRect.left - 160;
                                let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                                el_msg.setAttribute("style", msgAttr)

                                setTimeout(function (){
                                    el_input.value = value;
                                    el_input.setAttribute("data-value", value);
                                    el_input.classList.remove("border_invalid");
                                    el_msg.classList.toggle("show");
                                    },2000);

                            } else if(updated){
                                el_input.classList.add("border_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_valid");
                                    }, 2000);
                            }

                            if (fieldname === "rosterdate") {
                                format_date_element (el_input, el_msg, field_dict, comp_timezone, false,month_list,  weekday_list) // show_weekday=true, show_year=false

                      // when row is new row: remove data-o_value from dict,
                      // otherwise will not recognize rosterdate as a new value and will not be saved
                                if (!!temp_pk_str) {el_input.removeAttribute("data-o_value")}

/*
                                value = get_dict_value_by_key (field_dict, "value");
                                wdm = get_dict_value_by_key (field_dict, "wdm");
                                wdmy = get_dict_value_by_key (field_dict, "wdmy");
                                offset = get_dict_value_by_key (field_dict, "offset");
                                el_input.value = wdm
                                el_input.title = wdmy
                                el_input.setAttribute("data-wdmy", wdmy)
                                el_input.setAttribute("data-offset", offset)
*/

                            } else if (fieldname === "shift") {
                                let value = get_dict_value_by_key (field_dict, "value")
                                // console.log("field_dict", field_dict);
                                el_input.value = value
                            } else if (["shift", "customer", "order", "employee"].indexOf( fieldname ) > -1){
                                let value = get_dict_value_by_key (field_dict, "value")
                                // console.log("field_dict", field_dict);
                                el_input.value = value

                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                format_time_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list)

                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                format_duration_element (el_input, el_msg, field_dict)
                            };
                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)

//---  update filter
                FilterRows(tblRow);

            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  HandleModalFilterEmployee  ================ PR2019-05-26
    function HandleModalFilterEmployee(option) {
        console.log( "===== HandleModalFilterEmployee  ========= ");

        let new_filter = "";
        let skip_filter = false
        if (option === "input") {
             if (!!el_mod_employee.value) {new_filter = el_mod_employee.value}
        } else {
            new_filter = el_mod_filter_employee.value;
        }  //  if (option === "input") {

 // skip filter if filter value has not changed, update variable filter_mod_employee

        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_employee) {
                skip_filter = true
            } else {
                filter_mod_employee = new_filter.toLowerCase();
            }
        }

        let has_selection = false, has_multiple = false;
        let select_value, select_pk, select_parentpk;
        let len = el_mod_tbody_select.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, show_row, el, el_value; row_index < len; row_index++) {
                tblRow = el_mod_tbody_select.rows[row_index];
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else {

                    if (!!el){
                        el_value = get_attr_from_element(el, "data-value");
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            show_row = (el_value.indexOf(filter_mod_employee) !== -1)
                        }
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                    // put values from first selected row in select_value
                    if(!has_selection ) {
                        select_value = get_attr_from_element(el, "data-value");
                        select_pk = get_attr_from_element(el, "data-pk");
                        select_parentpk = get_attr_from_element(el, "data-ppk");
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {
        if (has_selection && !has_multiple ) {
                el_mod_employee.value = select_value
                el_mod_employee.setAttribute("data-pk",select_pk)
                el_mod_employee.setAttribute("data-ppk",select_parentpk)
        }

    }; // function HandleModalFilterEmployee

//=========  HandleModalSelect  ================ PR2019-05-25
    function HandleModalSelect(btn_name) {
        console.log( "===== HandleModalSelect ========= ");

        el_modal_body.setAttribute("data-select", btn_name);

        let el_div_mod_absent = document.getElementById("id_div_mod_absent")
        let el_div_mod_switch = document.getElementById("id_div_mod_switch")
        let el_div_mod_split = document.getElementById("id_div_mod_split")
        let el_labl_mod_employee =  document.getElementById("id_labl_mod_employee")

// ---  deselect all highlighted row
        switch (btn_name) {
        case "absent":
            el_div_mod_absent.classList.remove("display_hide")
            el_div_mod_switch.classList.add("display_hide")
            el_div_mod_split.classList.add("display_hide")
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_replaces")
            break;
        case "switch":
            el_div_mod_absent.classList.add("display_hide")
            el_div_mod_switch.classList.remove("display_hide")
            el_div_mod_split.classList.add("display_hide")
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_empl_switch")
            break;
        case "split":
            el_div_mod_absent.classList.add("display_hide")
            el_div_mod_switch.classList.add("display_hide")
            el_div_mod_split.classList.remove("display_hide")
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_replaces")
		}

    }

//=========  HandleModalSelectEmployee  ================ PR2019-05-24
    function HandleModalSelectEmployee(tblRow) {
        console.log( "===== HandleModalSelectEmployee ========= ");
        console.log( tblRow);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblBody_select)

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  highlight clicked row
            tblRow.classList.add("tsa_tr_selected")
            console.log( "tblRow: "), tblRow;

            // el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_element(el_select, "data-value");
            console.log("value: ", value)

    // ---  get pk from id of select_tblRow
            let employee_pk = get_datapk_from_element (tblRow)
            let employee_parent_pk = get_datappk_from_element (tblRow)

            console.log("employee_pk: ", employee_pk)
            console.log("employee_parent_pk: ", employee_parent_pk)

            let el_input_replacement = document.getElementById("id_mod_employee")
            console.log("el_input_replacement: ", el_input_replacement)
            el_input_replacement.value = value

            el_input_replacement.setAttribute("data-pk", employee_pk);
            el_input_replacement.setAttribute("data-ppk", employee_parent_pk);
        }
    }  // HandleModalSelectEmployee


//=========  HandleModalSave  ================ PR2019-06-23
    function HandleModalSave() {
        console.log("===  HandleModalSave =========");



// get emplhour pk and parent_pk , create id_dict Emplhour
        let emplhour_dict = get_iddict_from_element(el_modal_body);
            console.log("--- emplhour_dict", emplhour_dict)
            // emplhour_dict: {pk: 137, parent_pk: 141, table: "emplhour"}
        let emplhour_pk = get_datapk_from_element(el_modal_body);
            console.log("emplhour_pk", emplhour_pk)
        let emplhour_tblRow = document.getElementById(emplhour_pk)
            console.log("emplhour_tblRow")
            console.log(emplhour_tblRow)

        let abscat_dict = {};
        let employee_dict = {};

// get employee pk and employee parent_pk , create id_dict Employee
        let el_select_employee = document.getElementById("id_mod_employee")
        let employee_pk =  get_datapk_from_element(el_select_employee);
        let employee_parent_pk = get_datappk_from_element(el_select_employee);
        let employee_code = el_select_employee.value
        employee_dict["field"] = "employee";
        employee_dict["pk"] = employee_pk;
        employee_dict["ppk"] = employee_parent_pk;
        employee_dict["code"] = employee_code;

// get selected button
        const btn_name = el_modal_body.getAttribute("data-select");
        console.log("btn_name: ", btn_name);
        switch (btn_name) {
        case "absent":
        // get absence category
            let el_select_abscat = document.getElementById("id_mod_select_abscat")
            let abscat_pk = parseInt(el_select_abscat.value)
            let abscat_parent_pk = get_datappk_from_element(el_select_abscat)

            abscat_dict["field"] = "abscat";
            abscat_dict["pk"] = abscat_pk;
            abscat_dict["ppk"] = abscat_parent_pk;

            break;
        case "switch":

            break;
        case "split":
		}

        ModalClose()

// field_dict gets info of selected employee

        if(!isEmpty(emplhour_dict)){
            // {pk: 605, parent_pk: 1, table: "employee"}
            let row_upload= {};



            row_upload["id"] = emplhour_dict;

            //let field_dict = get_iddict_from_element(select_tblRow);

            row_upload["select"] = btn_name;
            row_upload["employee"] = employee_dict;
            row_upload["abscat"] = abscat_dict;
            console.log ("emplhour_upload: ", row_upload);

            let parameters = {"emplhour_upload": JSON.stringify (row_upload)};

            let response;
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                console.log ("response", response);
                    if ("item_update" in response) {
                        UpdateTableRow(emplhour_tblRow, response["item_update"])
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  // if(!isEmpty(id_dict)
    }  // HandleModalSave

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        // console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked.parentNode)

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_item_pk = get_datapk_from_element(tr_clicked)
            tr_clicked.classList.add("tsa_tr_selected")
        }
    }

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        //console.log("--- UploadChanges  --------------");
        let tr_changed = get_tablerow_clicked(el_changed)
        UploadTblrowChanged(tr_changed);
    }

//========= UploadTblrowChanged  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadTblrowChanged(tr_changed) {
        console.log("=== UploadTblrowChanged");
        let new_item = GetItemDictFromTablerow(tr_changed);
        console.log("emplhour_upload: " );
        console.log(new_item );

        if(!!new_item) {
            let parameters = {"emplhour_upload": JSON.stringify (new_item)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"]}

                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")

                        console.log("ooo UpdateTableRow ooo");
                        UpdateTableRow(tblName, tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        if (is_created){
// add new empty row
                    console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_parent_pk (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "temp_pk": pk_new}

                            if (tblName === "schemeitems"){
                                let rosterdate_dict = get_dict_value_by_key (item_dict, "rosterdate")
                    // remove 'updated' from dict, otherwise rosterdate in new row will become green also
                                delete rosterdate_dict["updated"];
                                // rosterdate_dict["update"] = true;

                                if(isEmpty(rosterdate_dict)){rosterdate_dict = today_dict}
                                new_dict["rosterdate"] = rosterdate_dict
                            } else  if (tblName === "teammembers"){
                                const team_code = get_subdict_value_by_key (item_dict, "team", "value")
                                new_dict["team"] = {"pk": parent_pk, "value": team_code}
                            }
                            let tblRow = CreateTableRow(pk_new, parent_pk)

                        console.log("<<< UpdateTableRow <<<");
                            UpdateTableRow(tblName, tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadTblrowChanged

//=========  HandleDeleteTblrow  ================ PR2019-03-16
    function HandleDeleteTblrow(tblName, tblRow) {
        // console.log("=== HandleDeleteTblrow");

// ---  get pk from id of tblRow
        const pk_int = get_datapk_from_element (tblRow)
        const parent_pk_int = parseInt(get_attr_from_element(tblRow, "data-ppk"))

        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        if (!pk_int) {
        // when pk_int = 'new_2' row is new row and is not yet saved, can be deleted without ajax
            tblRow.parentNode.removeChild(tblRow);
        } else {

// ---  create id_dict
            const id_dict = get_iddict_from_element(tblRow);
            // add id_dict to new_item
            if (!!id_dict){
// ---  create param
                id_dict["delete"] = true;
                let param = {"id": id_dict}
                console.log( "param: ");
                console.log(param);
// delete  record
                // make row red
                tblRow.classList.add("tsa_tr_error");
                let parameters = {"emplhour_upload": JSON.stringify (param)};
                let response = "";

                $.ajax({
                    type: "POST",
                    url: url_emplhour_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response:");
                        console.log (response);
                        if ("item_update" in response){
                            let update_dict = response["item_update"]
                            //UpdateSchemeitemOrTeammmember(tblRow, update_dict)
                        };
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (!!id_dict)
        }; // if (!pk_int)
        FilterRows(tblRow);
    }  // function HandleFilterInactive

//========= HandleSearchFilterEvent  ====================================
    function HandleSearchFilterEvent() {
        console.log( "===== HandleSearchFilterEvent  ========= ");
        // skip filter if filter value has not changed, update variable filter_text
        let new_filter = document.getElementById("filter_text").value;
        let skip_filter = false
        if (!new_filter){
            if (!filter_text){
                skip_filter = true
            } else {
                filter_text = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_text) {
                skip_filter = true
            } else {
                filter_text = new_filter.toLowerCase();
            }
        }
        if (!skip_filter) {
            FilterRows(tblRow)
        } //  if (!skip_filter) {
    }; // function HandleSearchFilterEvent

//========= SetNewRosterdate  ================ PR2019-06-07
    function SetNewRosterdate(rosterdate_dict) {
        // console.log( "===== SetNewRosterdate  ========= ");
        // console.log(rosterdate_dict);

        let text_fill = get_attr_from_element(el_data, "data-txt_rosterdate_fill");
        let text_remove = get_attr_from_element(el_data, "data-txt_rosterdate_remove");

        rosterdate_fill = null;
        rosterdate_remove = null;
        if (!!rosterdate_dict){
            rosterdate_remove  = get_subdict_value_by_key (rosterdate_dict, "current", "value")
            text_remove = text_remove + " " + get_subdict_value_by_key (rosterdate_dict, "current", "dm")

            rosterdate_fill = get_subdict_value_by_key (rosterdate_dict, "next", "value")
            text_fill = text_fill + " " + get_subdict_value_by_key (rosterdate_dict, "next", "dm")
            //companyoffset stores offset from UTC to company_timezone in seconds
            companyoffset = get_subdict_value_by_key (rosterdate_dict, "companyoffset", "value", 0)

        }
        el_btn_rosterdate_fill.innerText = text_fill
        el_btn_rosterdate_remove.innerText = text_remove

    }; // function SetNewRosterdate

//========= FillSelectAbscat  ====================================
    function FillSelectAbscat(option_list) {
        // console.log( "=== FillSelectAbscat  ", option_list);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }


// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0

        let el_select_abscat = document.getElementById("id_mod_select_abscat")
        el_select_abscat.innerText = null


// --- loop through option list
        let len = option_list.length;
        if (!!len) {

            for (let i = 0; i < len; i++) {
                let dict = option_list[i];
                // dict = { pk: 72,  id: {pk: 72, parent_pk: 61, table: "order"}, code: {value: "Vakantie"} }
                // console.log("dict", dict);

                let pk = get_pk_from_id(dict);
                let parent_pk = get_parent_pk(dict)

                // --- put abscat_parent_pk  in data-oparent_pk of el_select_abscat
                if (i === 0) {
                    el_select_abscat.setAttribute("data-ppk", parent_pk);
                }

                const field = "code";
                let value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + value + "</option>";
                row_count += 1

            }  // for (let i = 0, len = option_list.length;

        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box

        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_abscat_none + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_abscat + "...</option>" + option_text
        }
        el_select_abscat.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select_abscat.selectedIndex = 0
        }

    }  //function FillSelectAbscat

//========= FillSelectTableEmployee  ============= PR2019-06-26
    function FillSelectTableEmployee(caption_one, caption_none) {
        // console.log( "=== FillSelectTableEmployee ");

        let tableBody = el_mod_tbody_select
        let item_list = employee_list
        tableBody.innerText = null;

        let len = item_list.length;
        let row_count = 0

//--- when no items found: show 'select_customer_none'
        if (len === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through item_list
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
                // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
                const pk = get_pk_from_id (item_dict)
                const parent_pk = get_parent_pk (item_dict)
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                // console.log( "pk: ", pk, " parent_pk: ", parent_pk, " code_value: ", code_value);

//- only show items of selected_parent_pk
                // NIU:  if (parent_pk === selected_parent_pk){
                if(true) {   // if (ShowSearchRow(code_value, filter_customers)) {

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE tblRow.setAttribute("id", tablename + "_" + pk.toString());
                    tblRow.setAttribute("data-pk", pk);
                    tblRow.setAttribute("data-ppk", parent_pk);
                    // NOT IN USE, put in tableBody. Was:  tblRow.setAttribute("data-table", tablename);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {HandleModalSelectEmployee(tblRow)}, false )

// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code;
                        el.classList.add("mx-1")
                        el.setAttribute("data-value", code_value);
                        el.setAttribute("data-field", "code");
                    td.appendChild(el);

    // --- count tblRow
                    row_count += 1
                } //  if (ShowSearchRow(code_value, filter_customers)) {
            } // for (let i = 0; i < len; i++)
        }  // if (len === 0)
    } // FillSelectTableEmployee

//========= OpenTimepicker  ====================================
    function OpenTimepicker(el_input) {
        console.log("===  OpenTimepicker  =====") ;

        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected
        const data_table = get_attr_from_element(tr_selected, "data-table")
        const id_str = get_attr_from_element(tr_selected, "data-pk")
        const ppk_str = get_attr_from_element(tr_selected, "data-ppk");
        // console.log("data_table", data_table, "id_str", id_str, "ppk_str", ppk_str)

// get values from el_input
        const data_field = get_attr_from_element(el_input, "data-field");
        let data_value = get_attr_from_element(el_input, "data-value");
        console.log("data_value:", data_value)


        let datetime_local;

// if no current value: get rosterdate
        if (!data_value) {
            if (!!tr_selected){
                let el_rosterdate = tr_selected.querySelector("[data-field='rosterdate']");
                if (!!el_rosterdate) {
                    data_value = get_attr_from_element(el_rosterdate, "data-value") + "T00:00:00"
                    datetime_local = moment.tz(data_value, comp_timezone );
                }
            }
        } else {
            datetime_local = moment.tz(data_value, comp_timezone );

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
        }

        if (!!datetime_local) {
            console.log("datetime_local:  ", datetime_local.format());

// put values in el_timepicker
            el_timepicker.setAttribute("data-table", data_table);
            el_timepicker.setAttribute("data-pk", id_str);
            el_timepicker.setAttribute("data-ppk", ppk_str);

            el_timepicker.setAttribute("data-field", data_field);
            el_timepicker.setAttribute("data-value", data_value);

            let date_str = format_datelong_from_datetimelocal(datetime_local)
            document.getElementById("id_timepicker_date").innerText = date_str

            let curHours = datetime_local.hour();
            let curMinutes = datetime_local.minutes();

            HighlightTimepickerHour(curHours, curMinutes)
            HighlightTimepickerMinute(curMinutes)

    // ---  position popup under el_input
            let popRect = el_timepicker.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();
            let topPos = inpRect.top + inpRect.height;
            let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_timepicker.setAttribute("style", msgAttr)

    // ---  change background of el_input
            // first remove selected color from all imput popups
            elements = document.getElementsByClassName("el_input");
            popupbox_removebackground("input_timepicker");
            el_input.classList.add("pop_background");

    // hide save button on quicksave

            let txt_quicksave = get_attr_from_element(el_data, "data-txt_quicksave");
            if (quicksave){
                el_timepicker_save.classList.add(cls_hide);
                txt_quicksave = get_attr_from_element(el_data, "data-txt_quicksave_remove");
            } else {
                el_timepicker_save.classList.remove(cls_hide);
            }
            el_timepicker_quicksave.innerText = txt_quicksave

    // ---  show el_popup
            el_timepicker.classList.remove(cls_hide);
        }
    }; // function OpenTimepicker

//========= CreateTimepickerHours  ====================================
    function CreateTimepickerHours() {
        //console.log( "--- CreateTimepickerHours  ");

        let tbody = el_timepicker_tbody_hour;
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

                td = tblRow.insertCell(-1);

                td.setAttribute("data-hour", hours);
                td.addEventListener("mouseenter", function(){td.classList.add(cls_hover);});
                td.addEventListener("mouseleave", function(){td.classList.remove(cls_hover);});
                td.addEventListener("click", function() {HandleTimepickerEvent("timepicker_hour", tbody, td)}, false)

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
                td.addEventListener("click", function() {HandleTimepickerEvent("timepicker_ampm", tbody, td)}, false )

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
    function CreateTimepickerMinutes() {
        //console.log( "=== CreateTimepickerMinutes  ", option_list);

// ---  set references to elements
        let tbody = el_timepicker_tbody_minute;
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

                td.addEventListener("click", function() {HandleTimepickerEvent("timepicker_minute", tbody, td);}, false )

                td.classList.add("timepicker_minute");

                el_a = document.createElement("a");
                el_a.innerText = minutes_text
                td.appendChild(el_a);
            }
        }  // for (let i = 0,
    }  //function CreateTimepickerMinutes



//========= HighlightTimepickerHour  ====================================
    function HighlightTimepickerHour(curHours, curMinutes) {
        //console.log( "=== HighlightTimepickerHour  ");
        //console.log( "curHours:", curHours, "curMinutes:", curMinutes);

        let tbody = el_timepicker_tbody_hour;

        let curAmPm = 0;
        if (timeformat === 'AmPm') {
            if (curHours >= 12) {
                curHours -= 12;
                curAmPm = 1;
            }
            HighlightTimepickerCell(tbody, "ampm", curAmPm)
        }
        HighlightTimepickerCell(tbody, "hour", curHours)
    }  //function HighlightTimepickerHour


//========= HighlightTimepickerMinute  ====================================
    function HighlightTimepickerMinute(curMinutes) {
        HighlightTimepickerCell(el_timepicker_tbody_minute, "minute", curMinutes)
    }

//========= HighlightTimepickerCell  ====================================
    function HighlightTimepickerCell(tbody, name, curValue) {
// from https://stackoverflow.com/questions/157260/whats-the-best-way-to-loop-through-a-set-of-elements-in-javascript
        let tds = tbody.getElementsByClassName("timepicker_" + name)
        for (let i=0, td, value; td = tds[i]; i++) {
            value = get_attr_from_element_int(td, "data-" + name)
            if (curValue === value){td.classList.add(cls_highl)} else {td.classList.remove(cls_highl)}
        }
    }


//========= HandleTimepickerEvent  ====================================
    function HandleTimepickerEvent(type_str, tbody, td) {
        console.log("==== HandleTimepickerEvent  =====", type_str);

    // get datetime_utc_iso from el_timepicker data-value, convert to local (i.e. comp_timezone)
        const data_value = get_attr_from_element(el_timepicker, "data-value");
        let datetime_local = moment.tz(data_value, comp_timezone );
        // console.log("datetime_local: ", datetime_local.format());

        if (["prevday", "nextday"].indexOf( type_str ) > -1){
        // set  day_add to 1 or -1
            let day_add = 1;
            if (type_str === "prevday") { day_add = -1};
        // add / subtract day from datetime_local
            datetime_local.add(day_add, 'day')
        // display new date in el_timepicker
            let date_str = format_datelong_from_datetimelocal(datetime_local)
            document.getElementById("id_timepicker_date").innerText = date_str

        } else if (type_str === "timepicker_hour" ) {
        // get new hour from data-hour of td
            const new_hour = get_attr_from_element_int(td, "data-hour");
        // set new hour in datetime_local
            datetime_local.hour(new_hour);
        // select new hour  td
            SelectTimepickerCell(tbody, td, type_str)

        } else if (type_str === "timepicker_minute" ) {
        // get new minutes from data-minute of td
            const new_minute = get_attr_from_element_int(td, "data-minute");
        // set new minutes in datetime_local
            datetime_local.minute(new_minute);
        // select new minutes td
            SelectTimepickerCell(tbody, td, type_str)

        } else if (type_str === "timepicker_ampm" ) {
        // get new ampm from td
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
            SelectTimepickerCell(tbody, td, type_str)
        }

    // convert datetime_local to datetime_utc
        const datetime_utc = datetime_local.utc()
        // console.log("new datetime_utc hour: ", datetime_utc.format());
        const datetime_utc_iso = datetime_utc.toISOString()
        // console.log("datetime_utc_iso: ", datetime_utc_iso);
    // put new value back in el_timepicker data-value
        el_timepicker.setAttribute("data-value", datetime_utc_iso);


    // save in quicksave mode
        if (quicksave && type_str === "timepicker_hour" ){HandleTimepickerSave()}

    }

//========= SelectTimepickerCell  ====================================
    function SelectTimepickerCell(tbody, td, type_str) {
        let tds = tbody.getElementsByClassName(type_str);
        for (let x = 0, len = tds.length; x < len; x++) {
            tds[x].classList.remove(cls_highl);
        }
        td.classList.add(cls_highl)
    }

// +++++++++  HandleFillRosterdate  ++++++++++++++++++++++++++++++ PR2019-06-07
    function HandleFillRosterdate(action) {
        console.log("=== HandleFillRosterdate =========");
        let rosterdate_dict = {};
        if (action === "fill"){
            rosterdate_dict = {"fill": rosterdate_fill};
        } else if (action === "remove"){
            rosterdate_dict = {"remove": rosterdate_remove};
        }
        console.log("rosterdate_dict", rosterdate_dict);

        if (!!rosterdate_dict){
            // show loader
            el_loader.classList.remove(cls_hide)

            let parameters = {"rosterdate_fill": JSON.stringify (rosterdate_dict)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_fill_rosterdate,
                data: parameters,
                dataType:'json',
                success: function (response) {
                console.log( "response");
                console.log( response);
                    if ("emplhour" in response) {
                        emplhour_list= response["emplhour"];
                        FillTableRows()
                    };
                    if ("rosterdate" in response) {
                        SetNewRosterdate(response["rosterdate"])
                    };

                    // hide loader
                    el_loader.classList.add(cls_hide)

                },
                error: function (xhr, msg) {
                    // hide loader
                    el_loader.classList.add(cls_hide)
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
    }  // function HandleFillRosterdate

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FilterRows  ====================================
    function FilterRows() {
        //console.log( "===== FilterRows  ========= ");

        // TODO >> value of show_teams. Was: const show_teams = get_attr_from_element(el_btn_show_team, "data-show_teams")
        let show_teams;
        let colLength = 0;
        if (show_teams === "shifts") {
            colLength = 7;
        } else {
            colLength = 4;
        }

        // filter by inactive and substring of fields
        let len = tblBody_items.rows.length;
        if(!!len){
            for (let row_index = 0; row_index < len; row_index++) {
                let tblRow = tblBody_items.rows[row_index];

                let hide_row = SetHideRow(tblRow);

                if (hide_row) {
                    tblRow.classList.add(cls_hide)
                } else {
                    tblRow.classList.remove(cls_hide)
                };
            }
        }
    }; // function FilterRows

//========= SetHideRow  ========= PR2019-05-25
    function SetHideRow(tblRow, colLength) {
        // function filters by inactive and substring of fields

        let hide_row = false
        if (!!tblRow && !!colLength){
// --- hide inactive rows if filter_hide_inactive
            if (filter_hide_inactive) {
                if (!!tblRow.cells[0].children[0]) {
                    let el_inactive = tblRow.cells[0].children[0];
                    if (!!el_inactive){
                        if(el_inactive.hasAttribute("value")){
                            hide_row = (el_inactive.getAttribute("value").toLowerCase() === "true")
            }}}};
// --- show all rows if filter_text = ""
            if (!hide_row && !!filter_text){
                let found = false
                for (let col_index = 1, el_code; col_index < colLength; col_index++) {
                    if (!!tblRow.cells[col_index].children[0]) {
                        let el_value = tblRow.cells[col_index].children[0].value;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            if (el_value.indexOf(filter_text) !== -1) {
                                found = true
                                break;
                    }}}
                };
                if (!found){hide_row = true}
            }
        }
        return hide_row
    }; // function SetHideRow

//=========  DeselectHighlightedRows  ================ PR2019-04-30
    function DeselectHighlightedRows(tableBody) {
        //console.log("=========  DeselectHighlightedRows =========");
        if(!!tableBody){
            let tblrows = tableBody.getElementsByClassName("tsa_tr_selected");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_tr_selected")
            }
// don't remove tsa_tr_error
            //tblrows = tableBody.getElementsByClassName("tsa_tr_error");
            //for (let i = 0, len = tblrows.length; i < len; i++) {
            //   tblrows[i].classList.remove("tsa_tr_error")
            //}
            tblrows = tableBody.getElementsByClassName("tsa_bc_yellow_lightlight");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_bc_yellow_lightlight")
            }
        }
    }


//###################################

//========= OpenPopupWDY  ====================================
    function OpenPopupWDY(el_input) {
        console.log("===  OpenPopupWDY  =====") ;

        let el_popup_wdy = document.getElementById("id_popup_wdy")

// ---  reset textbox 'rosterdate'
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")
        el_popup_wdy_rosterdate.innerText = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected, in scheme it is stored in el_scheme_code
        let el_info;
        if (!!tr_selected){el_info = tr_selected} else {el_info = el_scheme_code}
        const data_table = get_attr_from_element(el_info, "data-table")
        const id_str = get_attr_from_element(el_info, "data-pk")
        const parent_pk_str = get_attr_from_element(el_info, "data-ppk");
        console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_element(el_input, "data-field");
        const data_value = get_attr_from_element(el_input, "data-value");
        const wdmy =  get_attr_from_element(el_input, "data-wdmy");
        console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

// put values in el_popup_wdy
        el_popup_wdy.setAttribute("data-table", data_table);
        el_popup_wdy.setAttribute("data-pk", id_str);
        el_popup_wdy.setAttribute("data-ppk", parent_pk_str);

        el_popup_wdy.setAttribute("data-field", data_field);
        el_popup_wdy.setAttribute("data-value", data_value);
        el_popup_wdy.setAttribute("data-o_value", data_value);

        if (!!wdmy){el_popup_wdy_rosterdate.value = wdmy};

        let header;
        if (data_field === "rosterdate"){ header = get_attr_from_element(el_data, "data-txt_rosterdate")} else
        if (data_field === "datefirst"){header = get_attr_from_element(el_data, "data-txt_datefirst")} else
        if (data_field === "datelast"){header = get_attr_from_element(el_data, "data-txt_datelast")};
        document.getElementById("id_popup_wdy_header").innerText = header

// ---  position popup under el_input
        let popRect = el_popup_wdy.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();
        let topPos = inpRect.top + inpRect.height;
        let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup_wdy.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        elements = document.getElementsByClassName("el_input");
         popupbox_removebackground("input_popup_wdy");
        el_input.classList.add("pop_background");

// ---  show el_popup
        el_popup_wdy.classList.remove(cls_hide);

}; // function OpenPopupWDY


//=========  HandlePopupBtnWdy  ================ PR2019-04-14
    function HandlePopupBtnWdy() {
        // console.log("===  function HandlePopupBtnWdy ");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_date_from_ISOstring(o_value)
        // console.log("o_date: ", o_date, "o_value: ", o_value)

        const id = event.target.id
        if (id === "id_popup_wdy_today"){
            GetNewRosterdate(o_date)
        } else if (id === "id_popup_wdy_nextday"){
            GetNewRosterdate(o_date, 1)
        } else if (id === "id_popup_wdy_prev_day"){
            GetNewRosterdate(o_date, -1)
        } else if (id === "id_popup_wdy_nextmonth"){
            GetNewRosterdate(o_date, 0,1)
        } else if (id === "id_popup_wdy_prev_month"){
            GetNewRosterdate(o_date, 0,-1)
        }
    }


//=========  GetNewRosterdate  ================ PR2019-04-14
    function GetNewRosterdate(o_date, add_day, add_month, add_year) {
        // console.log("---  function GetNewRosterdate ---");

// change o_date to next/previous day, month (year), or get Today if add_day=0, add_month=0 and add_year=0.
        let n_date = get_newdate_from_date(o_date, add_day, add_month, add_year)
        // console.log("n_date: ", n_date, typeof n_date)

        // console.log("weekday_list: ", weekday_list, typeof weekday_list)
// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        const n_weekday = n_date.getDay();
        // console.log("n_weekday: ", n_weekday, typeof n_weekday)
        // console.log("weekday_list[n_weekday]: ", weekday_list[n_weekday])
        // console.log("n_month_index: ", n_month_index, typeof n_month_index)
        // console.log(" month_list[n_month_index + 1]: ",  month_list[n_month_index + 1])
        const new_wdy = weekday_list[n_weekday] + ' ' + n_day + ' ' + month_list[n_month_index + 1] + ' ' + n_year
        // console.log("new_wdy: ", new_wdy, typeof new_wdy)


// put new_wdy in el_popup_wdy_rosterdate
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")
        el_popup_wdy_rosterdate.value = new_wdy

// change n_date to format "2019-05-06"
        const n_date_iso = n_date.toISOString();
        const n_date_arr = n_date_iso.split("T");
        const n_date_yyymmdd = n_date_arr[0]
        //console.log("n_date_yyymmdd: ", n_date_yyymmdd, typeof n_date_yyymmdd)

// put n_date_yyymmdd in attr. data-value
        el_popup_wdy.setAttribute("data-value", n_date_yyymmdd)

}


//=========  HandlePopupWdmySave  ================ PR2019-04-14
    function HandlePopupWdySave() {
console.log("===  function HandlePopupWdySave =========");

// ---  get pk_str from id of el_popup
        const tablename =  el_popup_wdy.getAttribute("data-table")

        let url_str, upload_str;
        if (tablename === "scheme"){
            url_str = url_emplhour_upload;
        } else {
            url_str = url_emplhour_upload;
        }

// ---  create id_dict
        let id_dict = get_iddict_from_element(el_popup_wdy);
        // console.log("--- id_dict", id_dict);

        if(!isEmpty(id_dict)){
            let row_upload = {"id": id_dict};

            const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
            const o_value = el_popup_wdy.getAttribute("data-o_value") // value of element clicked "-1;17;45"
                console.log ("n_value: ",n_value );
                console.log ("o_value: ",o_value );

// create new rosterdate

            if (n_value !== o_value) {
                const pk_str = el_popup_wdy.getAttribute("data-pk")// pk of record  of element clicked
                let tr_selected = document.getElementById(pk_str)

                const field_name = el_popup_wdy.getAttribute("data-field") // nanme of element clicked
                const field_dict = {"value": n_value, "update": true}
                row_upload[field_name] = field_dict;
                console.log ("row_upload: ", row_upload);

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
                            if (tablename === "scheme"){
                                FillScheme( response["item_update"])
                            } else {

                        console.log(">>> UpdateTableRow >>>");
                                UpdateTableRow("schemeitems", tr_selected, response["item_update"])
                            }
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }

            //popupbox_removebackground();
            //el_popup_wdy.classList.add(cls_hide);

            setTimeout(function() {
                popupbox_removebackground();
                el_popup_wdy.classList.add(cls_hide);
            }, 2000);

        }  // if(!isEmpty(id_dict)
    }  // HandlePopupWdySave


//=========  HandleTimepickerSave  ================ PR2019-06-27
    function HandleTimepickerSave(mode) {
        console.log("===  function HandleTimepickerSave =========");

        let quicksave_haschanged = false;
        if(mode === "quicksave") {
            quicksave = !quicksave
            if(quicksave){
                el_timepicker_save.classList.add(cls_hide);
            } else {
                el_timepicker_save.classList.remove(cls_hide);
            }
            quicksave_haschanged = true
        }

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_timepicker.getAttribute("data-ppk"))
        const field =  el_timepicker.getAttribute("data-field")
        const table =  el_timepicker.getAttribute("data-table")

    // get moment_dte from el_timepicker data-value
        const data_value = get_attr_from_element(el_timepicker, "data-value");
        console.log ("data_value = ", data_value)
        const datetime_utc = moment.utc(data_value);
        // console.log ("datetime_utc = ", datetime_utc.format())
        const datetime_utc_iso =  datetime_utc.toISOString();
        // console.log ("datetime_utc_iso = ", datetime_utc_iso)

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

                row_upload[field] = {"value": datetime_utc_iso, "update": true};

                console.log ("row_upload: ");
                console.log (row_upload);

                let parameters = {"emplhour_upload": JSON.stringify (row_upload)};
                let response;
                $.ajax({
                    type: "POST",
                    url: url_emplhour_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                console.log ("response", response);
                        if ("item_update" in response) {
                        console.log("...... UpdateTableRow .....");
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


//========= function pop_background_remove  ====================================
    function popupbox_removebackground(type_str){
        // remove selected color from all input popups
        let elements = document.getElementsByClassName(type_str);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // OPEN MODAL ON TRIGGER CLICK
    function OpenModal(el_input) {
        console.log(" -----  OpenModal   ----")
        // console.log(el_input)
            el_modal_header.innerText = null
            el_mod_employee.value = null

    // get tr_selected
            let tr_selected = get_tablerow_selected(el_input)

    // get info pk etc from tr_selected
            const data_table = get_attr_from_element(tr_selected, "data-table")
            const eplh_id_str = get_attr_from_element(tr_selected, "data-pk")
            const eplh_parent_pk_str = get_attr_from_element(tr_selected, "data-ppk");
            // console.log("data_table", data_table, "eplh_id_str", eplh_id_str, "eplh_parent_pk_str", eplh_parent_pk_str)

    // get values from el_input
            const field_pk = get_attr_from_element(el_input, "data-pk");
            const field_parent_pk = get_attr_from_element(el_input, "data-ppk");
            const data_field = get_attr_from_element(el_input, "data-field");
            const field_value = get_attr_from_element(el_input, "data-value");
            // console.log("data_field", data_field, "field_value", field_value)

    // put values in el_modal_body
            el_modal_body.setAttribute("data-table", data_table);
            el_modal_body.setAttribute("data-pk", eplh_id_str);
            el_modal_body.setAttribute("data-ppk", eplh_parent_pk_str);

            el_modal_body.setAttribute("data-field", data_field);
            el_modal_body.setAttribute("data-value", field_value);
            el_modal_body.setAttribute("data-o_value", field_value);


        let header_text;
        if (!!el_input.value) {
            header_text = el_input.value
        } else {
            header_text = get_attr_from_element(el_data, "data-txt_select_employee") + ":";
            // el_modal_body_right.classList.add(cls_hide)
        }
        el_modal_header.innerText = header_text
        // fill select table employees
            const caption_one = get_attr_from_element(el_data, "data-txt_select_employee") + ":";
            const caption_none = get_attr_from_element(el_data, "data-txt_select_employee_none") + ":";
            FillSelectTableEmployee("employee", tblBody_select, employee_list, caption_one, caption_none)

    // ---  show modal
        $("#id_modal_cont").modal({backdrop: true});

    };
    //========= function ModalClose  =============
    function ModalClose() {
        $('#id_modal_cont').modal('hide');
    }

}); //$(document).ready(function()