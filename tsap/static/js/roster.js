// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";

    const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";

    const cls_selected = "tsa_tr_selected";
    const cls_error = "tsa_tr_error";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_emplhour_upload = get_attr_from_el(el_data, "data-emplhour_upload_url");
        const url_emplhour_fill_rosterdate = get_attr_from_el(el_data, "data-emplhour_fill_rosterdate_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
        const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
        const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
        const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
        const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
        const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");
        const imgsrc_real03 = get_attr_from_el(el_data, "data-imgsrc_real03");

        const title_overlap = get_attr_from_el(el_data, "data-msg_overlap");

        let quicksave = false
        if (get_attr_from_el_int(el_data, "data-quicksave") === 1 ) { quicksave = true};

// ---  id of selected emplhour
        let selected_emplhour_pk = 0;

        let loc = {};  // locale_dict with translated text
        let period_dict = {};
        let mod_upload_dict = {};

        let emplhour_map = new Map();
        let abscat_map = new Map();
        let employee_map = new Map();
        let customer_map = new Map();
        let order_map = new Map();
        let replacement_map = new Map();

        let filter_text = "";
        let filter_hide_inactive = true;
        let filter_mod_employee = "";

        let filter_dict = {};
        let rosterdate_fill;
        let rosterdate_remove;

        let companyoffset = 0 // # in seconds
        const useroffset = get_userOffset();

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const tbl_col_count = 11;
        const tbl_col_images = [5, 7, 10];
        const field_tags = ["input", "input", "input", "input", "input",
                             "a", "input", "a", "input", "input", "a"];

// --- data_fields used in CreateTblRow and CreateTblHeaderFilter
        const data_fields = ["rosterdate", "orderhour", "shift", "employee", "timestart", "confirmstart",
                             "timeend", "confirmend", "breakduration", "timeduration", "status"];

// get elements
        let tblHead_roster = document.getElementById("id_thead_roster");
        let tblBody_roster = document.getElementById("id_tbody_roster");
        let tblBody_select = document.getElementById("id_tbody_select");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

        let el_mod_employee_tblbody =  document.getElementById("id_mod_employee_tblbody");
        let el_mod_employee_body = document.getElementById("id_mod_employee_body")
        let el_mod_employee_body_right = document.getElementById("id_mod_employee_body_right")

        let el_timepicker = document.getElementById("id_timepicker")
        let el_timepicker_tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        let el_timepicker_tbody_minute = document.getElementById("id_timepicker_tbody_minute");

        let el_popup_date = document.getElementById("id_popup_date_container")
        let el_popup_wdy = document.getElementById("id_popup_wdy");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// === EVENT HANDLERS ===

// ---  side bar - select period
        let el_flt_period = document.getElementById("id_flt_period");
        el_flt_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        el_flt_period.addEventListener("mouseenter", function(){el_flt_period.classList.add(cls_hover)});
        el_flt_period.addEventListener("mouseleave", function(){el_flt_period.classList.remove(cls_hover)});

// ---  side bar - select order
        // under construction
        //let el_flt_order = document.getElementById("id_flt_order");
        //el_flt_order.addEventListener("click", function() {ModOrderOpen()}, false );
        //el_flt_order.addEventListener("mouseenter", function(){el_flt_order.classList.add(cls_hover)});
        //el_flt_order.addEventListener("mouseleave", function(){el_flt_order.classList.remove(cls_hover)});

// ---  add 'keyup' event handler to filter
        let el_mod_filter_employee = document.getElementById("id_mod_employee_filter_employee");
            el_mod_filter_employee.addEventListener("keyup", function(){
                setTimeout(function() {ModEmployeeFilterEmployee("filter")}, 50)});
        let el_mod_employee_input_employee = document.getElementById("id_mod_employee_input_employee")
            el_mod_employee_input_employee.addEventListener("keyup", function(){
                setTimeout(function() {ModEmployeeFilterEmployee("input")}, 50)});

// add EventListener to document to close popup windows
        document.addEventListener('click', function (event) {

// hide msgbox
            el_msg.classList.remove("show");

 // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tr_selected, cls_selected)};

// close el_popup_date
            let close_popup = true
            if (event.target.classList.contains("input_text")) {close_popup = false} else
            if (event.target.classList.contains("input_text")) {close_popup = false} else
            if (el_popup_date.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                el_popup_date.classList.add(cls_hide)
            };

// close el_popup_wdy
            // event.target identifies the element on which the event occurred, i.e: on which is clicked
            close_popup = true
            if (event.target.classList.contains("input_popup_wdy")) {close_popup = false} else
            if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_popup_wdy");
                el_popup_wdy.classList.add(cls_hide)};

// close el_timepicker
/*
            close_popup = true
            // event.target identifies the element on which the event occurred, i.e: on which is clicked
            if (event.target.classList.contains("input_timepicker")) {close_popup = false} else
            if (el_timepicker.contains(event.target) && !event.target.classList.contains("timepicker_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide)
                };
*/
        }, false);

// buttons in  modal period
        document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodEdit("datefirst")}, false )
        document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodEdit("datelast")}, false )
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

// buttons in modal order
        //document.getElementById("id_mod_order_btn_save").addEventListener("click", function() {ModOrderSave()}, false )

// buttons in  modal
        document.getElementById("id_mod_employee_btn_absent").addEventListener("click", function() {ModEmployeeBtnSelect("absence")}, false )
        document.getElementById("id_mod_employee_btn_switch").addEventListener("click", function() {ModEmployeeBtnSelect("switch")}, false )
        document.getElementById("id_mod_employee_btn_split").addEventListener("click", function() {ModEmployeeBtnSelect("split")}, false )
        document.getElementById("id_mod_employee_btn_save").addEventListener("click", function() {ModEmployeeSave()}, false )
        document.getElementById("id_mod_employee_switch_date").addEventListener("change", function() {ModEmployeeFillOptionsShift()}, false )

        // TODO change time from modal confirmation
        //let el_mod_status_time = document.getElementById("id_mod_status_time").addEventListener("click", function() {
        //    OpenTimepicker(el_mod_status_time, UploadTimepickerChanged, tp_dict, st_dict)
        //    }, false)

        document.getElementById("id_mod_status_btn_save").addEventListener("click", function() {ModalStatusSave()}, false )

// buttons in  popup_wdy
        document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_save").addEventListener("click", function() {HandlePopupWdySave();}, false )

// popup_date
        el_popup_date.addEventListener("change", function() {HandlePopupDateSave();}, false )

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        // console.log(moment.locales())
        moment.locale(user_lang)


        // TODO let intervalID = window.setInterval(CheckStatus, 5000);

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// --- create header filter
        CreateTblHeaderFilter()

// --- first get locale, to make it faster
        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

        DatalistDownload({"setting": {"page_roster": {"mode": "get"}},
                          "locale": {page: "roster"},
                          "period": {get: true, page: "roster", "now": now_arr }});

        DatalistDownload({
            "setting": {"page_roster": {"mode": "get"}},
            "customer": {inactive: false, isabsence: false},
            "order": {inactive: false, cat_lte: 1, isabsence: false},
            "abscat": {inactive: false},
            "employee": {inactive: false},
            "quicksave": {get: true}});

        // TODO employee list can be big. Get separate after downloading emplhour

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log("request: ", datalist_request)

// reset requested lists
        let is_replacement = false


        // show loader
        if (is_replacement) {
            document.getElementById("id_mod_employee_loader").classList.remove(cls_hide)
        }
        el_loader.classList.remove(cls_hide)

        let param = {"download": JSON.stringify (datalist_request)};
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
                document.getElementById("id_mod_employee_loader").classList.add(cls_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                    // --- create Submenu after downloading locale
                    // CreateSubmenu()
                    CreateTblPeriod();
                }
                if ("period" in response) {
                    period_dict= response["period"];
                    DisplayPeriod(period_dict);
                }

                let fill_table = false, check_status = false;
                if ("abscat_list" in response) {
                    get_datamap(response["abscat_list"], abscat_map)
                    let el_select = document.getElementById("id_mod_employee_abscat")

                    const select_txt = get_attr_from_el(el_data, "data-txt_select_abscat");
                    const select_none_txt = get_attr_from_el(el_data, "data-txt_select_abscat_none");

                    FillOptionsAbscat(el_select, abscat_map, select_txt, select_none_txt)
                }
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                }
                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                    CreateSelectTableCustomers();
                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                    FillDatalistOrder()
                    //CreateSelectTableOrders();
                }

                if ("emplhour_list" in response) {
                    get_datamap(response["emplhour_list"], emplhour_map)
                    console.log(">>>>>>>>>>>>>>>emplhour_map")
                    console.log(emplhour_map)
                    fill_table = true;
                    check_status = true;
                }
                if ("replacement_list" in response) {
                    get_datamap(response["replacement_list"], replacement_map)
                    ModEmployeeFillOptionDates(replacement_map);
                    fill_table = true;
                    check_status = true;
                }


                if ("quicksave" in response) {
                    quicksave = get_subdict_value_by_key(response, "quicksave", "value", false);
                    console.log("quicksave", quicksave)
                }
                if (fill_table) {FillTableRows()}
                if (check_status) {CheckStatus()}

            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_hide)
                document.getElementById("id_mod_employee_loader").classList.add(cls_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload

//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        // console.log("===  CreateSubmenu == ");
        // console.log("pk", pk, "ppk", parent_pk);

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

    // --- first add <a> element with EventListener to td
        let el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.innerText = " < ";
        el_a.title =  get_attr_from_el_str(el_data, "data-txt_period_gotoprev");
        el_a.addEventListener("click", function() {ModPeriodSave("prev")}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_current");
        el_a.setAttribute("href", "#");
        // from https://www.fileformat.info/info/unicode/char/25cb/index.htm
        //el_a.innerText = " \u29BF "  /// circeled bullet: \u29BF,  bullet: \u2022 "  // "\uD83D\uDE00" "gear (settings) : \u2699" //
        el_a.innerText = " \u25CB "  /// 'white circle' : \u25CB  /// black circle U+25CF
        el_a.addEventListener("click", function() {ModPeriodSave("current")}, false )
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_gotocurr");
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.innerText = " > ";
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_gotonext");
        el_a.addEventListener("click", function() {ModPeriodSave("next")}, false )
        el_div.appendChild(el_a);


    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.setAttribute("id", "id_period_display");
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_period") + ": ";
        el_a.addEventListener("click", function() {ModPeriodOpen()}, false )
        el_div.appendChild(el_a);

        el_div = document.createElement("div");
        el_div.classList.add("text_align_right");
        el_submenu.appendChild(el_div);

        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_settings");
        el_a.setAttribute("href", "#");
        el_a.innerText =   " \u2699 "  // "\uD83D\uDE00" "gear (seetings) : \u2699" //
        el_a.addEventListener("click", function() {ModalSettingOpen()}, false )
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_setting");
        el_div.appendChild(el_a);

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//=========  CreateTblPeriod  ================ PR2019-11-16
    function CreateTblPeriod() {
        // console.log("===  CreateTblPeriod == ");
        // console.log(period_dict);
        let tBody = document.getElementById("id_mod_period_tblbody");
//+++ insert td's ino tblRow
        const len = loc.period_select_list.length
        for (let j = 0, tblRow, td, tuple; j < len; j++) {
            tuple = loc.period_select_list[j];
//+++ insert tblRow ino tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModPeriodSelect(tblRow, j);}, false )
    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }

        let el_select = document.getElementById("id_mod_period_extend");
        FillOptionsPeriodExtension(el_select, loc.period_extension)

    } // CreateTblPeriod

//=========  CreateSelectTableCustomers  ================ PR2019-11-16
    function CreateSelectTableCustomers() {
        // console.log("===  CreateSelectTableCustomers == ");
        // console.log(period_dict);

        const tblName = "customer";
        let tblBody_select = document.getElementById("id_mod_order_tblbody_cust");
        FillSelectTable(tblBody_select, el_data, customer_map, tblName, HandleSelectTable);

    }  // CreateSelectTableCustomers

 //=========  CreateSelectTableOrders  ================ PR2019-11-16
    function CreateSelectTableOrders() {
        // console.log("===  CreateSelectTableOrders == ");
        // console.log(period_dict);

        const tblName = "order";
        let tblBody_select = document.getElementById("id_mod_order_tblbody_order");
        FillSelectTable(tblBody_select, el_data, order_map, tblName, HandleSelectTable, HandleBtnClicked);

    }
//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable(tblBody_select, el_data, data_map, tblName, HandleSelectTable, HandleBtnClicked) {
        console.log("FillSelectTable");

        //tblBody_select.innerText = null;
//--- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const row_index = null // add at end when no rowindex
            //let selectRow = CreateSelectRow(tblBody_select, el_data, tblName, row_index, item_dict,
            //                            HandleSelectTable );

// update values in SelectRow
            const filter_show_inactive = false; // TODO
           //  UpdateSelectRow(selectRow, item_dict, el_data, filter_show_inactive);
        }  // for (let cust_key in data_map) {
    } // FillSelectTable

    function HandleSelectTable() {

    }
    function HandleBtnClicked() {

    }
//????????????????????????????????????????????????????????

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log(" ===== FillTableRows =====");

// --- reset tblBody_roster
        tblBody_roster.innerText = null;

// --- loop through emplhour_map
        let previous_rosterdate_dict = {};
        let tblRow;

        if(!!emplhour_map.size) {
            for (const [map_id, item_dict] of emplhour_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict)

// get rosterdate to be used in addnew row
                previous_rosterdate_dict = get_dict_value_by_key(item_dict, 'rosterdate')
                // row_index = -1 (add to end),  is_new_item = false
                tblRow = CreateTblRow(pk_int, ppk_int, -1, false)
                UpdateTableRow("emplhour", tblRow, item_dict)

// --- highlight selected row
                if (pk_int === selected_emplhour_pk) {
                    tblRow.classList.add(cls_selected)
                }
            }
        }

// === add row 'add new'
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new" + id_new.toString()

        dict["id"] = {"pk": pk_new, "temp_pk": pk_new}

        if(isEmpty(previous_rosterdate_dict)){
            previous_rosterdate_dict = today_dict};
        dict["rosterdate"] = previous_rosterdate_dict;

// console.log("FillTableRows 'add new' --> dict:", dict), row_index = -1 (add to end),  is_new_item = true
        tblRow = CreateTblRow(pk_new, 0, -1, true)
        UpdateTableRow("emplhour", tblRow, dict)
    }  // FillTableRows


//=========  CreateTblHeaderFilter  ================ PR2019-09-15
    function CreateTblHeaderFilter() {
        console.log("=========  function CreateTblHeaderFilter =========");

        let thead_roster = document.getElementById("id_thead_roster");

//+++ insert tblRow ino thead_roster
        let tblRow = thead_roster.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "id_thead_filter");
        tblRow.classList.add(cls_bc_lightlightgrey);

        const column_count = tbl_col_count;

//+++ iterate through columns
        for (let j = 0, td, el; j < column_count; j++) {

// insert td ino tblRow
            // index -1 results in that the new cell will be inserted at the last position.
            td = tblRow.insertCell(-1);

    // --- create element with tag from field_tags
           let el = document.createElement(field_tags[j]);

// add fieldname
            el.setAttribute("data-field", data_fields[j]);

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if (tbl_col_images.indexOf( j ) > -1){
            // --- first add <a> element with EventListener to td
                el = document.createElement("a");
                el.setAttribute("href", "#");
// --- add img
                const img_list = [imgsrc_stat00,,,,,,imgsrc_questionmark,,imgsrc_warning,,,imgsrc_stat00]
                const img_src = img_list[j]
                if(!!img_src){AppendChildIcon(el, img_src, "18")}
            } else {
// --- add input element to td.
                el.setAttribute("type", "text");

                el.classList.add("tsa_color_darkgrey")
                el.classList.add("tsa_transparent")

// --- add width
                if (j === 1){
                    el.classList.add("td_width_180")
                } else if (j === 3){
                    el.classList.add("td_width_180");
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("td_width_060");
                } else {
                    el.classList.add("td_width_090")};

// --- add text_align
                if ( [0, 1, 2, 3].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("text_align_right");
                }
// --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");
            }  //if (j === 0)

// --- add EventListener to td
            el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});

            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblHeaderFilter

//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(pk_int, ppk_int, row_index, is_new_item) {
        //console.log("=========  CreateTblRow =========");
        //console.log("pk_int", pk_int, "ppk_int", ppk_int, "is_new_item", is_new_item);

        const tblName =  "emplhour"

// check if row is addnew row - when pk is NaN, or when absence / split record is made
        if(!parseInt(pk_int)){is_new_item = true};

//+++ insert tblRow ino tblBody_roster
        let tblRow = tblBody_roster.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.

        const map_id = get_map_id(tblName, pk_int);
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-map_id", map_id );
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow
        for (let j = 0; j < tbl_col_count; j++) {

            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

    // --- create element with tag from field_tags
            const tagName = (tbl_col_images.indexOf(j) > -1) ? "a" : "input"
            let el = document.createElement(tagName);
            el.setAttribute("data-field", data_fields[j]);

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if (tbl_col_images.indexOf( j ) > -1){
                if (!is_new_item){

                // --- first add <a> element with EventListener to td
                    el.addEventListener("click", function() {ModalStatusOpen(el);}, false)

//- add hover to confirm elements
                    if ([5, 7].indexOf( j ) > -1){
                        el.addEventListener("mouseenter", function(){HandleConfirmMouseenter(el)});
                        el.addEventListener("mouseleave", function(){el.children[0].setAttribute("src", imgsrc_stat00)});
                    } else {
                        el.setAttribute("href", "#");
                    }
                    AppendChildIcon(el, imgsrc_stat00, "18")

                    td.appendChild(el);

                    td.classList.add("td_width_032")
                    td.classList.add("pt-0")
                }
            } else {

// --- add input element to td.
                el.setAttribute("type", "text");

// --- add EventListener to td
                if (j === 0) {
                    if (is_new_item){el.addEventListener("click", function() {OpenPopupWDY(el)}, false )} } else
                if ([1, 2].indexOf( j ) > -1){
                    if (is_new_item){el.addEventListener("change", function() {UploadElChanges(el)}, false )} } else
                if (j === 3){
                    el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )} else
                if ([4, 6].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandleTimepickerOpen(el)}, false)} else
                if ([8, 9].indexOf( j ) > -1){
                    // el.addEventListener("click", function() {OpenPopupHM(el)}, false )
                };

// --- add datalist_ to td orders, shifts todo: SHIFTS NOT WORKING YET
                if (j === 1){
                    if (is_new_item){el.setAttribute("list", "id_datalist_orders")}
                } else if (j === 2){
                    if (is_new_item){el.setAttribute("list", "id_datalist_shifts")}
                }

// --- disable 'rosterdate', 'order' and 'shift', except in new_item
                if ([0, 1, 2].indexOf( j ) > -1){
                    if (!is_new_item){el.disabled = true}
                }

// --- add width
                if (j === 1){
                    el.classList.add("td_width_180")
                } else if (j === 3){
                    el.classList.add("td_width_180");
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("td_width_060");
                } else {
                    el.classList.add("td_width_090")};

// --- add text_align
                if ( [0, 1, 2, 3].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("text_align_right");
                }

// --- add other classes to td
                // el.classList.add("border_none");
                // el.classList.add("input_text"); // makes background transparent
                if (j === 0) {
                    el.classList.add("input_popup_wdy");
                } else if ([4, 6].indexOf( j ) > -1){
                    el.classList.add("input_timepicker")
                } else if ([8, 9].indexOf( j ) > -1){
                    //el.classList.add("input_popup_hm")
                    // TODO change class
                    el.classList.add("input_text"); // makes background transparent
                    el.classList.add("text_align_right")
                } else {
                    el.classList.add("input_text"); // makes background transparent
                };

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  //if (j === 0)
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };// CreateTblRow


//========= UpdateTableRow  =============
    function UpdateTableRow(tblName, tblRow, item_dict){
        //console.log(" ------>>  UpdateTableRow", tblName);

        if (!!item_dict && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            //console.log("id_dict", id_dict);

            let temp_pk_str, msg_err, is_created = false, is_deleted = false;
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            //console.log("is_created", is_created, "temp_pk_str", temp_pk_str);

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                // was: let el_input = tblRow.querySelector("[name=code]");
                let td = tblRow.cells[2];
                let el_input = tblRow.cells[2].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                let id_str = get_attr_from_el_str(tblRow,"id")
        // if 'created' exists then 'pk' also exists in id_dict
                const pk_int = get_dict_value_by_key(id_dict, "pk")
                const ppk_int = get_dict_value_by_key(id_dict, "ppk")
                const map_id = get_map_id("emplhour", pk_int);

               // console.log("id_str", id_str, typeof id_str);
                //console.log("pk_int", pk_int, typeof pk_int);
                //console.log("map_id", map_id, typeof map_id);
            // check if item_dict.id 'new_1' is same as tablerow.id
                if(id_str  === temp_pk_str || id_str === map_id){

            // update tablerow.id from temp_pk_str to pk_int
                    tblRow.setAttribute("id", map_id);  // or tblRow.id = pk_int
                    tblRow.setAttribute("data-pk", pk_int)
                    tblRow.setAttribute("data-ppk", ppk_int)
                    tblRow.setAttribute("data-map_id", map_id)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkRow(tblRow )
                }
            } else if (!!msg_err){
            // make row red, / --- show error message
                tblRow.classList.add("border_bg_invalid");
                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

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
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_el(el_input, "data-field");
                        if (fieldname in item_dict){
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            updated = get_dict_value_by_key (field_dict, "updated");
                            if(updated){
                                el_input.classList.add("border_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_valid");
                                    }, 2000);
                            }
                            if (fieldname === "rosterdate") {
                                const hide_weekday = false, hide_year = true;
                                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                    user_lang, comp_timezone, hide_weekday, hide_year)
                        // when row is new row: remove data-o_value from dict,
                        // otherwise will not recognize rosterdate as a new value and will not be saved
                                if (!!temp_pk_str) {
                                    el_input.removeAttribute("data-o_value")
                                } else {
                                // disable field rosterdate
                                    el_input.disabled = true
                                }
                            } else if (fieldname === "shift") {
                                let value = get_dict_value_by_key (field_dict, "value")
                                if(!!value){el_input.value = value} else {el_input.value = null}

                            } else if (["orderhour", "employee"].indexOf( fieldname ) > -1){
                                 // disable field orderhour
                                if (fieldname === "orderhour") {
                                    field_dict["locked"] = true
                                }
                                format_text_element (el_input, el_msg, field_dict, false, [-220, 60], title_overlap);

                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)

                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                format_duration_element (el_input, el_msg, field_dict, user_lang)

                            } else if (["status"].indexOf(fieldname ) > -1){
                                format_status_element (el_input, field_dict,
                                        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05,
                                        "", "", "start time confirmed", "end time confirmed", "start- and endtime confirmed", "locked")

                                // put status also in tblRow
                                const status_int = parseInt(get_subdict_value_by_key(item_dict, "status", "value"))
                                tblRow.setAttribute("data-status", status_int)

                            } else if (fieldname === "overlap"){
                                //console.log("----------fieldname", fieldname);
                                //console.log("field_dict", field_dict);
                                format_overlap_element (el_input, field_dict, imgsrc_stat00, imgsrc_real03, title_overlap);

                            }  // if (fieldname === "rosterdate") {


                        } else {
                            // "confirmstart", "confirmend" are not as fieldname in item_dict
                            if (["confirmstart", "confirmend"].indexOf( fieldname ) > -1){
                                const status_dict = get_dict_value_by_key (item_dict, "status");
                                format_confirmation_element (el_input, status_dict, fieldname,
                                    imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_questionmark, imgsrc_warning,
                                    "title_stat00", "please confirm start time", "please confirm end time", "start time confirmation past due", "end time confirmation past due" )
                            }
                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)

            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

//========= HandleConfirmMouseenter  ====================================
    function HandleConfirmMouseenter(el) {
        //console.log(" --- HandleConfirmMouseenter --- ")
        const item_dict = get_itemdict_from_datamap_by_el(el, emplhour_map);
        let data_field = get_attr_from_el_str(el, "data-field")
        const fieldname = (data_field === "confirmstart") ? "timestart" : "timeend"
        const img_src = (data_field === "confirmstart") ? imgsrc_stat02 : imgsrc_stat03;
        const field_dict = get_dict_value_by_key(item_dict, fieldname)
        const locked = (overlap_or_locked(field_dict) || has_no_employee(item_dict));

        if(!locked){
            el.children[0].setAttribute("src", img_src)
            el.setAttribute("href", "#");
        };
    }

// ++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModEmployeeOpen  ================ PR2019-06-23
    function ModEmployeeOpen(el_input) {
        //console.log(" -----  ModEmployeeOpen   ----")
        //console.log("el_input: ", el_input)

        const tblRow = get_tablerow_selected(el_input);
        //console.log("tblRow: ", tblRow)
        const map_id = get_attr_from_el(tblRow, "data-map_id")
        //console.log("map_id: ", map_id)

// lookup emplh_dict in emplhour_map
        const emplh_dict = get_itemdict_from_datamap_by_el(el_input, emplhour_map);

        //console.log("emplh_dict: ", emplh_dict)
        //console.log("emplhour_map: ", emplhour_map)
        if(!isEmpty(emplh_dict)){
    // reset values in mod_employee
            el_mod_employee_input_employee.value = null
            let el_mod_employee_filter_employee = document.getElementById("id_mod_employee_filter_employee")
            document.getElementById("id_mod_employee_filter_employee").value = null;
            document.getElementById("id_mod_employee_abscat").value = ""; // reset value must be empty string

            document.getElementById("id_mod_employee_switch_date").innerText = null;
            document.getElementById("id_mod_employee_select_shift").innerText = null;
            document.getElementById("id_mod_employee_split_time").innerText = null;

            document.getElementById("id_mod_employee_btn_switch").classList.remove("tsa_btn_selected");
            document.getElementById("id_mod_employee_btn_split").classList.remove("tsa_btn_selected");
            document.getElementById("id_mod_employee_btn_absent").classList.remove("tsa_btn_selected");

            document.getElementById("id_mod_employee_filter_employee").removeAttribute("tsa_btn_selected")

    // get cur_employee_pk from field employee in emplhour_map
            const cur_employee_pk =  get_subdict_value_by_key(emplh_dict,"employee", "pk")

    // put values in el_mod_employee_body
            const pk_int = get_subdict_value_by_key(emplh_dict, "id", "pk")
            const table = "emplhour";
            const map_id = get_map_id(table, pk_int);
            //console.log("map_id:", map_id, typeof map_id);
            el_mod_employee_body.setAttribute("data-pk", pk_int);
            el_mod_employee_body.setAttribute("data-map_id", map_id);

            const header_text = (!!el_input.value) ?  el_input.value : get_attr_from_el(el_data, "data-txt_employee_select") + ":";
            document.getElementById("id_mod_employee_header").innerText = header_text

    // fill select table employees, skip selected employee
            ModEmployeeFillSelectTableEmployee(cur_employee_pk)

    // change label 'txt_employee_replacement' to 'select_employee' if no employee, hide right panel
            let data_text, mode;
            let el_body_right = document.getElementById("id_mod_employee_body_right")
            if(!!cur_employee_pk){
                el_body_right.classList.remove(cls_hide)
                data_text = "data-txt_employee_replacement"
                mode = "absence"
            } else {
                el_body_right.classList.add(cls_hide)
                data_text = "data-txt_employee_select"
                mode = "enter"
            }
            let el_label_employee = document.getElementById("id_label_mod_employee")
            el_label_employee.innerText =  el_data.getAttribute(data_text)

    // set default button absence
            ModEmployeeBtnSelect(mode)

    // hide save button in mode = 'enter'
            let el_btn_save = document.getElementById("id_mod_employee_btn_save")
            if(mode === "enter"){
                el_btn_save.classList.add(cls_hide)
            } else {
                el_btn_save.classList.remove(cls_hide)
            }

    // ---  show modal
            $("#id_mod_employee").modal({backdrop: true});

        }  //   if(!isEmpty(emplh_dict))
    };  // ModEmployeeOpen

//=========  ModEmployeeSave  ================ PR2019-06-23
    function ModEmployeeSave() {
        let btn_name = el_mod_employee_body.getAttribute("data-action");
        //console.log("===  ModEmployeeSave ========= btn_name: ", btn_name);

        const map_id = get_attr_from_el(el_mod_employee_body, "data-map_id");
        //console.log("map_id", map_id);
        let emplhour_tblRow = document.getElementById(map_id)
        //console.log("emplhour_tblRow", emplhour_tblRow);
        const row_index = emplhour_tblRow.rowIndex
        //console.log("row_index", row_index);

        let emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, map_id);
        let id_dict = get_dict_value_by_key(emplhour_dict, "id")
        id_dict["mode"] = btn_name
        id_dict["rowindex"] = row_index
        //console.log("emplhour_dict", emplhour_dict);

// get employee from select list
        let employee_dict = {"field": "employee", "update": true};
        let pk_int, ppk_int, code;

// when mode = enter: get new employee from select list, new employee = employee (was blank)
        if (btn_name === "enter"){
            let el_tblbody = document.getElementById("id_mod_employee_tblbody")
                pk_int = get_attr_from_el_int(el_tblbody, "data-pk");
                ppk_int = get_attr_from_el_int(el_tblbody, "data-ppk");
                code = get_attr_from_el(el_tblbody, "data-code");

// when mode = absence, switch, split: get new employee from input field
        } else {
            pk_int = get_datapk_from_element(el_mod_employee_input_employee);
            ppk_int = get_datappk_from_element(el_mod_employee_input_employee);
            code = el_mod_employee_input_employee.value
        }
        if(!!pk_int){
            employee_dict["pk"] = pk_int;
            employee_dict["ppk"] = ppk_int;
            if(!!code){employee_dict["code"] = code};
        }

// get selected button
        let abscat_dict = {};
        if (btn_name === "absence"){
        // get absence category
            let el_select_abscat = document.getElementById("id_mod_employee_abscat")
            if(el_select_abscat.selectedIndex > -1){
                const selected_option = el_select_abscat.options[el_select_abscat.selectedIndex];
                const abscat_team_pk = parseInt(el_select_abscat.value)
                const abscat_team_ppk = get_attr_from_el_int(selected_option, "data-ppk");
                const abscat_team_code = selected_option.text;

                abscat_dict = {"table": "team", "isabsence": true};
                if(!!abscat_team_pk){abscat_dict["pk"] = abscat_team_pk};
                if(!!abscat_team_ppk){abscat_dict["ppk"] = abscat_team_ppk};
                if(!!abscat_team_code){abscat_dict["code"] = abscat_team_code};
            }
        }

        let switch_dict = {};
        if (btn_name === "switch"){
            let el_select_replacement = document.getElementById("id_mod_employee_select_shift")
            if(el_select_replacement.selectedIndex > -1){
                let selected_option = el_select_replacement.options[el_select_replacement.selectedIndex];
                    switch_dict["rosterdate"] = get_attr_from_el(selected_option, "data-rosterdate");
                    switch_dict["employee_pk"] = get_attr_from_el_int(selected_option, "data-employee_pk");
                    switch_dict["reployee_pk"] = get_attr_from_el_int(selected_option, "data-reployee_pk");
                    switch_dict["si_pk"] = get_attr_from_el_int(selected_option, "data-si_pk");
                    switch_dict["team_pk"] = get_attr_from_el_int(selected_option, "data-team_pk");
                    switch_dict["tmmbr_pk"] = get_attr_from_el_int(selected_option, "data-tmmbr_pk");
                    switch_dict["eplh_pk"] = get_attr_from_el_int(selected_option, "data-eplh_pk");
            }
        }

        $('#id_mod_employee').modal('hide');

// field_dict gets info of selected employee
        let row_upload = {"id": id_dict};
        if(!isEmpty(employee_dict)){row_upload["employee"] = employee_dict};
        if(!isEmpty(abscat_dict)){row_upload["abscat"] = abscat_dict};
        console.log ("row_upload: ", row_upload);

        let parameters = {"upload": JSON.stringify (row_upload)};

        let response;
        $.ajax({
            type: "POST",
            url: url_emplhour_upload,
            data: parameters,
            dataType:'json',
            success: function (response) {
                console.log ("response", response);
                if ("update_list" in response) {
                    const tblName = "emplhour";
                    const update_list = response["update_list"]
                    UpdateFromResponseNEW(tblName, update_list) ;
                }
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });

    }  // ModEmployeeSave

//=========  ModEmployeeBtnSelect  ================ PR2019-05-25
    function ModEmployeeBtnSelect(btn_name) {
        //console.log( "===== ModEmployeeBtnSelect ========= ");

        el_mod_employee_body.setAttribute("data-action", btn_name);

        let el_div_mod_absent = document.getElementById("id_div_mod_absent")
        let el_div_mod_switch = document.getElementById("id_div_mod_switch")
        let el_div_mod_split = document.getElementById("id_div_mod_split")
        let el_labl_mod_employee = document.getElementById("id_label_mod_employee")

// ---  deselect all highlighted row
        let btn_absent = document.getElementById("id_mod_employee_btn_absent")
            btn_absent.classList.remove("tsa_btn_selected")
        let btn_switch = document.getElementById("id_mod_employee_btn_switch")
            btn_switch.classList.remove("tsa_btn_selected")
        let btn_split = document.getElementById("id_mod_employee_btn_split")
            btn_split.classList.remove("tsa_btn_selected")

        switch (btn_name) {
        case "absence":
            el_div_mod_absent.classList.remove(cls_hide)
            el_div_mod_switch.classList.add(cls_hide)
            el_div_mod_split.classList.add(cls_hide)
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_employee_replacement") + ":"
            btn_absent.classList.add("tsa_btn_selected")
            break;
        case "switch":
            el_div_mod_absent.classList.add(cls_hide)
            el_div_mod_switch.classList.remove(cls_hide)
            el_div_mod_split.classList.add(cls_hide)
            el_labl_mod_employee.innerText = el_data.getAttribute("data-txt_empl_switch_employee") + ":"
            btn_switch.classList.add("tsa_btn_selected")
            el_mod_employee_input_employee.focus()
            break;
        case "split":
            el_div_mod_absent.classList.add(cls_hide)
            el_div_mod_switch.classList.add(cls_hide)
            el_div_mod_split.classList.remove(cls_hide)
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_employee_replacement") + ":"
            btn_split.classList.add("tsa_btn_selected")
            el_mod_employee_input_employee.focus()
		}

    }

//=========  ModEmployeeTableEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeTableEmployeeSelect(tblRow) {
        //console.log( "===== ModEmployeeTableEmployeeSelect ========= ");
        //console.log( tblRow);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

// get current employee from el_mod_employee_body data-field
        const cur_employee_pk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_pk");
        const cur_employee = get_attr_from_el(el_mod_employee_body, "data-field_value");
        const cur_employee_ppk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_ppk");
        const cur_rosterdate = get_attr_from_el(el_mod_employee_body, "data-rosterdate");

// ---  get clicked tablerow
        if(!!tblRow) {
            let tblBody_select = tblRow.parentNode

// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

            // el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");

    // ---  get pk from id of select_tblRow
            let reployee_pk = get_datapk_from_element (tblRow)
            let reployee_ppk = get_datappk_from_element (tblRow)

    // ---  store selected pk and ppk in input_employee, also in selecettablebody
            el_mod_employee_input_employee.value = value
            if (!!reployee_pk){
                tblBody_select.setAttribute("data-pk", reployee_pk);
                el_mod_employee_input_employee.setAttribute("data-pk", reployee_pk);
            } else {
                tblBody_select.removeAttribute("data-pk");
                el_mod_employee_input_employee.removeAttribute("data-pk");
            }
            if (!!reployee_ppk){
                tblBody_select.setAttribute("data-ppk", reployee_ppk);
                el_mod_employee_input_employee.setAttribute("data-ppk", reployee_ppk);
            } else {
                tblBody_select.removeAttribute("data-ppk");
                el_mod_employee_input_employee.removeAttribute("data-ppk");
            }
            if (!!value){
                tblBody_select.setAttribute("data-code", value);
                el_mod_employee_input_employee.setAttribute("data-code", value);
            } else {
                tblBody_select.removeAttribute("data-code");
                el_mod_employee_input_employee.removeAttribute("data-code");
            }
            let data_action = el_mod_employee_body.getAttribute("data-action");

            if (data_action === "enter" ) {
            // save immediately whenmode = 'enter'
                ModEmployeeSave()

            } else if (data_action === "switch" ) {
    // get shifts of switch employee
                const datalist_request = {"replacement": { "action": data_action, "rosterdate": cur_rosterdate,
                        "employee": cur_employee, "employee_pk": cur_employee_pk_int, "employee_ppk": cur_employee_ppk_int,
                        "reployee": value, "reployee_pk": reployee_pk, "reployee_ppk": reployee_ppk}};
                DatalistDownload(datalist_request);
            }
        }
    }  // ModEmployeeTableEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-05-26
    function ModEmployeeFilterEmployee(option) {
        console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let new_filter = "";
        let skip_filter = false
        if (option === "input") {
            if (!!el_mod_employee_input_employee.value) {
                new_filter = el_mod_employee_input_employee.value
            }
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
        let len = el_mod_employee_tblbody.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, show_row, el, el_value; row_index < len; row_index++) {
                tblRow = el_mod_employee_tblbody.rows[row_index];
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else if (!!el){
                    el_value = get_attr_from_el(el, "data-value");
                    if (!!el_value){
                        el_value = el_value.toLowerCase();
                        show_row = (el_value.indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                    // put values from first selected row in select_value
                    if(!has_selection ) {
                        select_value = get_attr_from_el(el, "data-value");
                        select_pk = get_attr_from_el(el, "data-pk");
                        select_parentpk = get_attr_from_el(el, "data-ppk");
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {
        if (has_selection && !has_multiple ) {
            el_mod_employee_input_employee.value = select_value
            el_mod_employee_input_employee.setAttribute("data-pk",select_pk)
            el_mod_employee_input_employee.setAttribute("data-ppk",select_parentpk)
         // get shifts if mode = switch
            if(el_mod_employee_body.getAttribute("data-action") === "switch"){
                const cur_employee_pk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_pk");
                const cur_employee = get_attr_from_el(el_mod_employee_body, "data-field_value");
                const cur_employee_ppk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_ppk");
                const cur_rosterdate = get_attr_from_el(el_mod_employee_body, "data-rosterdate");

                const datalist_request = {"replacement": { "action": "switch", "rosterdate": cur_rosterdate,
                        "employee": cur_employee, "employee_pk": cur_employee_pk_int, "employee_ppk": cur_employee_ppk_int,
                        "reployee": select_value, "reployee_pk": select_pk, "reployee_ppk": select_parentpk}};
                DatalistDownload(datalist_request);
            }

        }

    }; // function ModEmployeeFilterEmployee

//========= ModEmployeeFillSelectTableEmployee  ============= PR2019-08-18
    function ModEmployeeFillSelectTableEmployee(selected_employee_pk) {
        // console.log( "=== ModEmployeeFillSelectTableEmployee ");

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = get_attr_from_el(el_data, "data-txt_employee_select_none") + ":";

        let tableBody = el_mod_employee_tblbody
        tableBody.innerText = null;

        let row_count = 0

//--- when no items found: show 'select_customer_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict)
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")

//- skip selected employee
                if (pk_int !== selected_employee_pk){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE tblRow.setAttribute("id", tblName + "_" + pk.toString());
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    // NOT IN USE, put in tableBody. Was:  tblRow.setAttribute("data-table", tblName);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {ModEmployeeTableEmployeeSelect(tblRow)}, false )

// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code;
                        el.classList.add("mx-1")
                        el.setAttribute("data-value", code_value);
                        el.setAttribute("data-pk", pk_int);
                        el.setAttribute("data-ppk", ppk_int);
                        el.setAttribute("data-field", "code");
                    td.appendChild(el);

    // --- count tblRow
                    row_count += 1
                } //  if (pk_int !== selected_employee_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  // if (employee_map.size === 0)
    } // ModEmployeeFillSelectTableEmployee


//========= ModEmployeeFillOptionDates  ====================================
    function ModEmployeeFillOptionDates(replacement_dates) {
       // console.log( "=== ModEmployeeFillOptionDates  ");
        //console.log(replacement_dates);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }

// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0

        let el_select_date = document.getElementById("id_mod_employee_switch_date")
        el_select_date.innerText = null

        document.getElementById("id_mod_employee_select_shift").innerText = null

        let option_list = [], len = 0;
        if (!!replacement_dates){
            option_list = replacement_dates
            //console.log("option_list", option_list);
            if(!!option_list){len = option_list.length;}
        }

// --- loop through option list

        if (!!len) {
            for (let i = 0; i < len; i++) {
                const rosterdate = option_list[i];
                //console.log( "rosterdate: ", rosterdate);

                const rosterdate_moment = moment(rosterdate, "YYYY-MM-DD")
                //console.log( "rosterdate_moment: ", rosterdate_moment.format());

                const rosterdate_format = format_datemedium(rosterdate_moment, weekday_list, month_list, false, false)


                // dict = { pk: 72,  id: {pk: 72, parent_pk: 61, table: "order"}, code: {value: "Vakantie"} }
                // console.log("dict", dict);
                if (!!rosterdate){
                    option_text += "<option value=\"" + rosterdate + "\"";
                    option_text +=  ">" + rosterdate_format + "</option>";

                    row_count += 1
                }  // if (!!rosterdate){

            }  // for (let i = 0, len = option_list.length;

        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        const select_text_switch_date = get_attr_from_el(el_data, "data-txt_empl_switch_date");
        const select_text_switch_dates_none = get_attr_from_el(el_data, "data-txt_empl_switch_nodates");

        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_switch_dates_none + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_switch_date + "...</option>" + option_text
        }
        el_select_date.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select_date.selectedIndex = 0
        } else {
            el_select_date.focus()
        }

        ModEmployeeFillOptionsShift(el_select_date.value)
    }  //function ModEmployeeFillOptionDates

//========= ModEmployeeFillOptionsShift  ====================================
    function ModEmployeeFillOptionsShift(selected_rosterdate) {
        console.log( "=== ModEmployeeFillOptionsShift  ");
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }

// ---  fill options of select box
        let option_text = "";

        let el_select_shift = document.getElementById("id_mod_employee_select_shift")
        el_select_shift.innerText = null

        // selected_rosterdate only has value when there is only one rosterdate (called by ModEmployeeFillOptionDates)
        // setfocus on select shift only after clicking date, ie when !selected_rosterdate
        let set_focus = false;
        if (!selected_rosterdate){
            selected_rosterdate = document.getElementById("id_mod_employee_switch_date").value
            set_focus = (!!selected_rosterdate)
        }
        console.log("selected_rosterdate", selected_rosterdate);
        console.log("replacement_list", replacement_list);

// --- loop through option list
        let row_count = 0
        if (!!selected_rosterdate && !!replacement_map.size) {

// --- loop through replacement_map
            for (const [map_id, item_dict] of replacement_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const rosterdate = get_dict_value_by_key(item_dict, "rosterdate")
                if (rosterdate === selected_rosterdate){
                    const cust_order_shift = get_dict_value_by_key(item_dict, "cust_order_shift")
                    const eplh_pk_str = get_dict_value_by_key(item_dict, "eplh_pk")
                    const reployee_pk_str = get_dict_value_by_key(item_dict, "reployee_pk")
                    const employee_pk_str = get_dict_value_by_key(item_dict, "employee_pk")
                    const team_pk_str = get_dict_value_by_key(item_dict, "team_pk")

                    option_text += "<option "; //
                    if (!!rosterdate) {option_text += " data-rosterdate=\"" + rosterdate + "\""};
                    if (!!eplh_pk_str) {option_text += " data-eplh_pk=\"" + eplh_pk_str + "\""};
                    if (!!team_pk_str) {option_text += " data-team_pk=\"" + team_pk_str + "\""};
                    if (!!reployee_pk_str) {option_text += " data-reployee_pk=\"" + reployee_pk_str + "\""};
                    if (!!employee_pk_str) {option_text += " data-employee_pk=\"" + employee_pk_str + "\""};
                    option_text +=  ">" + cust_order_shift + "</option>";

                    row_count += 1
                }  // if (rosterdate === selected_rosterdate){
            }  // for (const [map_id, item_dict] of replacement_map.entries())
        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        const select_text = get_attr_from_el(el_data, "data-txt_empl_switch_shift");
        const select_text_none = get_attr_from_el(el_data, "data-txt_empl_switch_noshifts");

        let select_first_option = false
        if (!row_count){
            if(!!selected_rosterdate){
                option_text = "<option value=\"\" disabled selected hidden>" + select_text_none + "...</option>"
            }
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select_shift.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select_shift.selectedIndex = 0
            set_focus = false;
        }
         if (set_focus){el_select_shift.focus()}


    }  //function ModEmployeeFillOptionsShift

// ++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  HandleTableRowClicked  ================ PR2019-10-12
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)

// ---  update selected_emplhour_pk
        const emplh_dict = get_itemdict_from_datamap_by_tblRow(tr_clicked, emplhour_map)
        selected_emplhour_pk = get_pk_from_dict(emplh_dict);
    }

//========= UploadElChanges  ============= PR2019-10-12
    function UploadElChanges(el_changed) {
        console.log("--- UploadElChanges  --------------");

        let tr_changed = get_tablerow_selected(el_changed)
        if (!!tr_changed){
            const fieldname = get_attr_from_el(el_changed, "data-field");

// ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!isEmpty(id_dict) && !!fieldname){
                let upload_dict = {"id": id_dict};
                let field_dict = {};

// if is_create and field = orderhour: add orderhour.pk as ook
                if ("create" in id_dict) {
                    // get rosterdate
                    const el_rosterdate = tr_changed.cells[0].children[0]
                    const rosterdate = get_attr_from_el(el_rosterdate, "data-value")
                    if(!!rosterdate){
                        upload_dict["rosterdate"] = {"field": "rosterdate", "update": true, "value": rosterdate};
                    }
                    if (fieldname === "orderhour") {
                        // # orderhour': {'value': 'UTS - UTS', 'order_pk': 59, 'update': True}}
                        field_dict = {"field": "order", "update": true};
                        // get pk from datalist when field is a look_up field
                        const value = el_changed.value;
                        if(!!value){
                            const pk_int = parseInt(get_pk_from_datalist("id_datalist_orders", value, "pk"));
                            if(!!pk_int){
                                field_dict["order_pk"] = pk_int
                                if(!!value){field_dict["value"] = value};
                            }
                        }  // if(!!value)
                        if (!isEmpty(field_dict)) {
                            upload_dict[fieldname] = field_dict
                        }
                    }
                } else {
                    // ---  get value from 'el_changed.value' or from 'el_input.data-value'
                    const new_value = (!!el_changed.value) ? el_changed.value : null;
                    let data_value = get_attr_from_el(el_changed, "data-value"); // data-value="2019-05-11"
                    if (!data_value) {data_value = null};
                    // put new_value in field_dict
                    if(!!new_value){field_dict["value"] = new_value};
                    // ---  check if value has changed
                    if (new_value !== data_value){field_dict["update"] = true};
                    // ---  add field_dict to upload_dict
                    if (!isEmpty(field_dict)){
                        upload_dict[fieldname] = field_dict;
                    }
                }  // if ("create" in id_dict) {
                const url_str = url_emplhour_upload;
                UploadChanges(upload_dict, url_str) ;

            };  // if (!isEmpty(id_dict))
        }  // if (!! tr_changed){
    };  // UploadElChanges

//=========  HandleDeleteTblrow  ================ PR2019-03-16
    function HandleDeleteTblrow(tblName, tblRow) {
        // console.log("=== HandleDeleteTblrow");
        if(!!tblRow){
    // ---  get pk from id of tblRow
            const pk_int = get_datapk_from_element (tblRow)
            const parent_pk_int = parseInt(get_attr_from_el(tblRow, "data-ppk"))

            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int) {
            // when pk_int = 'new_2' row is new row and is not yet saved, can be deleted without ajax
                tblRow.parentNode.removeChild(tblRow);
            } else {

    // ---  create id_dict
                const id_dict = get_iddict_from_element(tblRow);
                // add id_dict to new_item
                if (!isEmpty(id_dict)){
    // ---  create param
                    id_dict["delete"] = true;
                    let param = {"id": id_dict}
                    console.log( "param: ");
                    console.log(param);
    // delete  record
                    // make row red
                    tblRow.classList.add(cls_error);
                    let parameters = {"upload": JSON.stringify (param)};
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
                            };
                        },
                        error: function (xhr, msg) {
                            console.log(msg + '\n' + xhr.responseText);
                            alert(msg + '\n' + xhr.responseText);
                        }
                    });
                }  // if (!isEmpty(id_dict))
            }; // if (!pk_int)
        } // if(!!tblRow)
    }  // function HandleDeleteTblrow


//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        //console.log( "===== HandleFilterName  ========= ");

        //console.log( "el.value", el.value, index, typeof index);
        //console.log( "el.filter_dict", filter_dict, typeof filter_dict);
        // skip filter if filter value has not changed, update variable filter_text

        //console.log( "el_key", el_key);


        let skip_filter = false
        if (el_key === 27) {
            filter_dict = {}

            let tblRow = get_tablerow_selected(el);
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    el.value = null
                }
            }
        } else {
            let filter_dict_text = ""
            if (index in filter_dict) {filter_dict_text = filter_dict[index];}
            //if(!filter_dict_text){filter_dict_text = ""}
            //console.log( "filter_dict_text: <" + filter_dict_text + ">");

            let new_filter = el.value.toString();
            //console.log( "new_filter: <" + new_filter + ">");
            if (!new_filter){
                if (!filter_dict_text){
                    //console.log( "skip_filter = true");
                    skip_filter = true
                } else {
                    //console.log( "delete filter_dict");
                    delete filter_dict[index];
                    //console.log( "deleted filter : ", filter_dict);
                }
            } else {
                if (new_filter.toLowerCase() === filter_dict_text) {
                    skip_filter = true
                    //console.log( "skip_filter = true");
                } else {
                    filter_dict[index] = new_filter.toLowerCase();
                    //console.log( "filter_dict[index]: ", filter_dict[index]);
                }
            }

        }
        //console.log( " filter_dict ", filter_dict);

        if (!skip_filter) {
            FilterTableRows_dict();
        } //  if (!skip_filter) {

    }; // function HandleFilterName

//========= FillDatalistShift  ====================================
    function FillDatalistShift(data_list) {
        //console.log( "===== FillDatalistShift  ========= ");
        //console.log( data_list)

        let el_datalist = document.getElementById("id_datalist_shifts");
        el_datalist.innerText = null;
        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {
            listitem = data_list[row_index];
            let el = document.createElement('option');
            el.setAttribute("value", listitem["code"]);
            el.setAttribute("pk",listitem["pk"]);
            if (!!listitem["datefirst"]){
                el.setAttribute("datefirst", listitem["datefirst"]);
            }
            if (!!listitem["datelast"]){
               el.setAttribute("datelast", listitem["datelast"]);
            }
            el_datalist.appendChild(el);
        }


    }; // function FillDatalistShift

//========= FillDatalistOrder  ====================================
    function FillDatalistOrder() {
        //console.log( "===== FillDatalistOrder  ========= ");

        let el_datalist = document.getElementById("id_datalist_orders");
        el_datalist.innerText = null;


//--- loop through employee_map
        for (const [cust_map_id, cust_dict] of customer_map.entries()) {
            const cust_pk_int = get_pk_from_dict(cust_dict)
            const cust_cat = get_cat_from_dict(cust_dict);

            if (cust_cat < 512){  // SHIFT_CAT_0512_ABSENCE
                const cust_code = get_subdict_value_by_key(cust_dict, "code", "value", "")
                for (const [ord_map_id, ord_dict] of order_map.entries()) {
                    const ord_pk_int = get_pk_from_dict(ord_dict)
                    const ord_ppk_int = get_ppk_from_dict(ord_dict)
                    if(ord_ppk_int === cust_pk_int){
                        const ord_code = get_subdict_value_by_key (ord_dict, "code", "value", "")
                        const order = cust_code + " - " + ord_code;

                        let el = document.createElement('option');
                        el.setAttribute("value", order);
                        // name can be looked up by datalist.options.namedItem PR2019-06-01
                        el.setAttribute("name", order);
                        if (!!ord_pk_int){el.setAttribute("pk", ord_pk_int)};
                        if (!!ord_ppk_int){el.setAttribute("ppk", ord_ppk_int)};
                        el_datalist.appendChild(el);
                    }
                }
            }
        }
    }; // function FillDatalist

//###################################
//========= ModalSettingOpen====================================
    function ModalSettingOpen () {
        console.log("===  ModalSettingOpen  =====") ;
        console.log("period_dict", period_dict) ;

        let el_modal = document.getElementById("id_mod_setting")
        let tBody = document.getElementById("id_mod_tbody_interval");

        tBody.removeAttribute("data-value");
        let interval = 0, overlap_prev = 0, overlap_next = 0;
        if (!isEmpty(period_dict)){
            interval = get_dict_value_by_key(period_dict, "interval", 0)
            overlap_prev = get_dict_value_by_key(period_dict, "overlap_prev", 0)
            overlap_next = get_dict_value_by_key(period_dict, "overlap_next", 0)
        }  //  if (!isEmpty(period_dict))

    // highligh selected period in table, put value in  data-value of tBody
        if (!!interval){
            for (let i = 0, tblRow, value; tblRow = tBody.rows[i]; i++) {
                value = get_attr_from_el_int(tblRow, "data-value")
                if (!!value && value === interval){
                    tblRow.classList.add(cls_selected)
                } else {
                    tblRow.classList.remove(cls_selected)
                }
            }  // for (let i = 0,
        }  // if (!!period)
        tBody.setAttribute("data-value", interval);

        if (!interval){interval = 0}
        if (!overlap_prev){overlap_prev = 0}
        if (!overlap_next){overlap_next = 0}

        let el_overlap_prev = document.getElementById("id_mod_setting_overlap_prev")
        el_overlap_prev.value = overlap_prev

        let el_overlap_next = document.getElementById("id_mod_setting_overlap_next")
        el_overlap_next.value = overlap_next

    // ---  show modal
         $("#id_mod_setting").modal({backdrop: true});

}; // function ModalSettingOpen

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
        const data_table = get_attr_from_el(el_info, "data-table")
        const id_str = get_attr_from_el(el_info, "data-pk")
        const parent_pk_str = get_attr_from_el(el_info, "data-ppk");
        console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");
        const data_value = get_attr_from_el(el_input, "data-value");
        const wdmy =  get_attr_from_el(el_input, "data-wdmy");
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
        if (data_field === "rosterdate"){ header = get_attr_from_el(el_data, "data-txt_rosterdate")} else
        if (data_field === "datefirst"){header = get_attr_from_el(el_data, "data-txt_datefirst")} else
        if (data_field === "datelast"){header = get_attr_from_el(el_data, "data-txt_datelast")};
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
        const tblName =  el_popup_wdy.getAttribute("data-table")
// TODO check
        let url_str, upload_str;
        if (tblName === "scheme"){
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

                let parameters = {"upload": JSON.stringify (row_upload)};

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                    console.log ("response", response);
                        if ("item_update" in response) {
                            if (tblName === "scheme"){
                                FillScheme( response["item_update"])
                            } else {

                                //console.log(">>> UpdateTableRow >>>");
                                UpdateTableRow("emplhour", tr_selected, response["item_update"])
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


//=========  HandlePopupDateSave  ================ PR2019-07-08
    function HandlePopupDateSave() {
        console.log("===  function HandlePopupDateSave =========");

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked


// get values from el_timepicker
        const data_table = get_attr_from_el(el_timepicker, "data-table")
        const id_str = get_attr_from_el(el_timepicker, "data-pk")
        const ppk_str = get_attr_from_el(el_timepicker, "data-ppk");
        const data_field = get_attr_from_el(el_timepicker, "data-field");
        let data_rosterdate = get_attr_from_el(el_timepicker, "data-rosterdate");
        let data_datetime = get_attr_from_el(el_timepicker, "data-datetime");
        let data_offset = get_attr_from_el(el_timepicker, "data-offset");
        console.log("table:", data_table, "field:", data_field, "pk:", id_str, "ppk:", ppk_str)
        console.log("rosterdate:", data_rosterdate, "datetime:", data_datetime, "offset:", data_offset)

    // get moment_dte from el_timepicker data-value
        const data_value = get_attr_from_el(el_timepicker, "data-value");
        console.log ("data_value = ", data_value)
        const datetime_utc = moment.utc(data_value);
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
            if (!isEmpty(id_dict)){row_upload["id"] = id_dict};

            if (quicksave_haschanged){row_upload["quicksave"] = quicksave};

            if (!!datetime_utc_iso){
                let tr_selected = document.getElementById(pk_str)

                row_upload[field] = {"value": datetime_utc_iso, "update": true};

                console.log ("row_upload: ");
                console.log (row_upload);

                let parameters = {"upload": JSON.stringify (row_upload)};
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
                            UpdateTableRow("emplhour", tr_selected, response["item_update"])
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
    }  // HandlePopupDateSave


//=========  ModalStatusSave  ================ PR2019-07-11
    function ModalStatusSave() {
        console.log("===  ModalStatusSave =========");

        // put values in el_body
        let el_body = document.getElementById("id_mod_status_body")
        const tblName = get_attr_from_el(el_body, "data-table")
        const data_ppk = get_attr_from_el(el_body, "data-ppk")
        const data_field = get_attr_from_el(el_body, "data-field")

        const data_pk = get_attr_from_el(el_body, "data-pk")
        let tr_changed = document.getElementById(data_pk)

        const id_dict = get_iddict_from_element(el_body);;
        let upload_dict = {"id": id_dict}

        const status_value = get_attr_from_el_int(el_body, "data-value")
        let status_dict = {};
        if(data_field === "confirmstart"){
            status_dict = {"value": 2, "update": true}  // STATUS_02_START_CONFIRMED = 2
        } else if(data_field === "confirmend"){
            status_dict = {"value": 4, "update": true}  // STATUS_04_END_CONFIRMED = 4
        } else if(data_field === "status"){
            if(status_value >= 8){
                status_dict = {"value": 8, "remove": true, "update": true}  // STATUS_08_LOCKED = 8
            } else {
                status_dict = {"value": 8, "update": true}   // STATUS_08_LOCKED = 8
            }
        }
        upload_dict["status"] = status_dict

        $("#id_mod_status").modal("hide");

        if(!!upload_dict) {
            console.log( "upload_dict", upload_dict);
            let parameters = {"upload": JSON.stringify(upload_dict)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("update_list" in response) {
                        let update_list = response["update_list"];
                        UpdateFromResponseNEW(tblName, update_list)
                    }


                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")

                        console.log("ooo UpdateTableRow ooo");
                        UpdateTableRow("emplhour", tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        if (is_created){
// add new empty row
                    console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new" + id_new.toString()
                            const parent_pk = get_ppk_from_dict (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "temp_pk": pk_new}

                            if (tblName === "teammembers"){
                                const team_code = get_subdict_value_by_key (item_dict, "team", "value")
                                new_dict["team"] = {"pk": parent_pk, "value": team_code}
                            }
                            // row_index = -1 (add to end), is_new_item = true
                            let tblRow = CreateTblRow(pk_new, parent_pk, -1, true)

                        console.log("<<< UpdateTableRow <<<");
                            UpdateTableRow("emplhour", tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    }  // ModalStatusSave


//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen====================================
    function ModPeriodOpen () {
        console.log("===  ModPeriodOpen  =====") ;
        console.log("period_dict", period_dict) ;

        // period_dict = {page: "period_roster", period_tag: "tweek", extend_offset: 0,
        // now: (5) [2019, 11, 20, 7, 29],
        // periodend: "2019-11-25T00:00:00+01:00", periodstart: "2019-11-18T00:00:00+01:00",
        // rosterdatefirst: "2019-11-18", rosterdatefirst_minus1: "2019-11-17",
        // rosterdatelast: "2019-11-24", rosterdatelast_plus1: "2019-11-25"}

        mod_upload_dict = period_dict;

    // highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_mod_period_tblbody");
        const period_tag = get_dict_value_by_key(period_dict, "period_tag")
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };

    // set value of extend select box
        const extend_offset = get_dict_value_by_key(period_dict, "extend_offset", 0)
        let el_extend = document.getElementById("id_mod_period_extend")
        for (let i = 0, option, value; i < el_extend.options.length; i++) {
            value = Number(el_extend.options[i].value);
            if (value === extend_offset) {
                el_extend.options[i].selected = true;
                break;
            }
        }

    // set value of date imput elements
        const is_custom_period = (period_tag === "other")
        let el_datefirst = document.getElementById("id_mod_period_datefirst")
        let el_datelast = document.getElementById("id_mod_period_datelast")
        el_datefirst.value = get_dict_value_by_key(period_dict, "rosterdatefirst")
        el_datelast.value = get_dict_value_by_key(period_dict, "rosterdatelast")

    // set min max of input fields
        ModPeriodEdit("datefirst");
        ModPeriodEdit("datelast");

        el_datefirst.disabled = !is_custom_period
        el_datelast.disabled = !is_custom_period

    // show extend period input box
        document.getElementById("id_mod_period_div_extend").classList.remove(cls_hide)

    // ---  show modal
        $("#id_mod_period").modal({backdrop: true});

}; // function ModPeriodOpen

//=========  ModPeriodSelect  ================ PR2019-07-14
    function ModPeriodSelect(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelect ========= ", selected_index);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)

    // add period_tag to mod_upload_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_upload_dict["period_tag"] = period_tag;

    // enable date input elements, give focus to start
            if (period_tag === "other") {
                let el_datefirst = document.getElementById("id_mod_period_datefirst");
                let el_datelast = document.getElementById("id_mod_period_datelast");
                el_datefirst.disabled = false;
                el_datelast.disabled = false;
                el_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelect

//=========  ModPeriodEdit  ================ PR2019-07-14
    function ModPeriodEdit(fldName) {
    // set min max of other input field
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        } else { el_other.removeAttribute(attr_key) };
    }  // ModPeriodEdit

//=========  ModPeriodSave  ================ PR2019-07-11
    function ModPeriodSave() {
        console.log("===  ModPeriodSave =========");

        const period_tag = get_dict_value_by_key(mod_upload_dict, "period_tag", "today")
        const extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        if(extend_index < 0 ){extend_index = 0}
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;

        mod_upload_dict = {"page": "roster", "period_tag": period_tag, "extend_index": extend_index, "extend_offset": extend_offset};
        //console.log("new mod_upload_dict:", mod_upload_dict);

        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {mod_upload_dict["periodstart"] = datefirst};
            if (!!datelast) {mod_upload_dict["periodend"] = datelast};
        }

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]
        mod_upload_dict["now"] = now_arr;

// hide modal
        $("#id_mod_period").modal("hide");

        DatalistDownload({"period": mod_upload_dict});

    }  // ModPeriodSave

//========= DisplayPeriod  ====================================
    function DisplayPeriod(period_dict) {
        console.log( "===== DisplayPeriod  ========= ");

        if (!isEmpty(period_dict)){
            const period_tag = get_dict_value_by_key(period_dict, "period_tag");
            const extend_offset = get_dict_value_by_key(period_dict, "extend_offset", 0);

            let period_text = null, default_text = null
            for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                item = loc.period_select_list[i];
                if (item[0] === period_tag){ period_text = item[1] }
                if (item[0] === 'today'){ default_text = item[1] }
            }
            if(!period_text){period_text = default_text}

            console.log( "loc.period_extension", loc.period_extension);
            let extend_text = null, extend_default_text = null
            for(let i = 0, item, len = loc.period_extension.length; i < len; i++){
                item = loc.period_extension[i];
                if (item[0] === extend_offset){ extend_text = item[1] }
                if (item[0] === 0){ extend_default_text = item[1] }
            }
            if(!extend_text){extend_text = extend_default_text}


            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value_by_key(period_dict, "rosterdatefirst");
                const rosterdatelast = get_dict_value_by_key(period_dict, "rosterdatelast");
                if(rosterdatefirst === rosterdatelast) {
                    period_text =  format_date_iso (rosterdatefirst, month_list, weekday_list, false, false, user_lang);
                } else {
                    const datelast_formatted = format_date_iso (rosterdatelast, month_list, weekday_list, true, false, user_lang)
                    if (rosterdatefirst.slice(0,8) === rosterdatelast.slice(0,8)) { //  slice(0,8) = 2019-11-17'
                        // same month: show '13 - 14 nov
                        const day_first = Number(rosterdatefirst.slice(8)).toString()
                        period_text = day_first + " - " + datelast_formatted
                    } else {
                        const datefirst_formatted = format_date_iso (rosterdatefirst, month_list, weekday_list, true, true, user_lang)
                        period_text = datefirst_formatted + " - " + datelast_formatted
                    }
                }
            }
            if(!!extend_offset){
                period_text += " +- " + extend_text;
            }
            document.getElementById("id_flt_period").value = period_text

        }  // if (!isEmpty(period_dict))

    }; // function DisplayPeriod

// +++++++++++++++++ MODAL ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= ModOrderOpen====================================  PR2019-11-16
    function ModOrderOpen () {
        //console.log("===  ModOrderOpen  =====") ;
        //console.log("period_dict", period_dict) ;
        // period_dict = {extend_index: 2, extend_offset: 120, period_index: null, periodend: null,
        //                periodstart: null, rosterdatefirst: "2019-11-15", rosterdatelast: "2019-11-17"

        let tBody = document.getElementById("id_mod_period_tblbody");
        tBody.removeAttribute("data-value");
        let period_index, extend_index;
        if (!isEmpty(period_dict)){
            period_index = get_dict_value_by_key(period_dict, "period_index")
            extend_index = get_dict_value_by_key(period_dict, "extend_index")
        }

    // highligh selected period in table, put value in data-value of tBody
        for (let i = 0, tblRow; tblRow = tBody.rows[i]; i++) {
            if (period_index === i){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };
        if(period_index != null){
            tBody.setAttribute("data-value", period_index);
        } else {
            tBody.removeAttribute("data-value");
        }
    // ---  show modal
         $("#id_mod_order").modal({backdrop: true});

}; // function ModOrderOpen

//=========  ModOrderSelectCustomer  ================  PR2019-11-16
    function ModOrderSelectCustomer(tr_clicked, selected_index) {
        //console.log( "===== ModOrderSelectCustomer ========= ", selected_index);
        if(!!tr_clicked) {
            // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)
    // add selected_index to tBody
            tr_clicked.parentNode.setAttribute("data-value", selected_index);

            // period_index: 0: 'Now', 1: 'This night', 2: 'This morning', 3: 'This afternoon', 4: 'This evening'),
           // 5: 'Today', 6: 'Tomorrow', 7: 'Yesterday', 8: 'This week', 9: 'This month'

            const today = get_today_iso()

            let datefirst = null, datelast = null;
            if(selected_index < 6 ){
                datefirst = today;
                datelast = today;
            } else if(selected_index === 6 ){
                datefirst = get_tomorrow_iso();
                    datelast =  get_tomorrow_iso();
            } else if(selected_index === 7 ){
                datefirst =  get_yesterday_iso();
                datelast =  get_yesterday_iso();
            } else if(selected_index === 8 ){
                const thisweek_monday_sunday_arr = get_thisweek_monday_sunday_iso()
                datefirst = get_thisweek_monday_sunday_iso()[0];
                datelast = get_thisweek_monday_sunday_iso()[1];
            } else if(selected_index === 9 ){
                datefirst = get_thismonth_first_last_iso()[0];
                datelast = get_thismonth_first_last_iso()[1];
            }
            document.getElementById("id_mod_period_datefirst").value = datefirst;
            document.getElementById("id_mod_period_datelast").value = datelast;


        }
    }  // ModOrderSelectCustomer

//=========  ModOrderSave  ================ PR2019-11-16
    function ModOrderSave() {
        //console.log("===  ModOrderSave =========");

        period_dict = {}

        const tblBody = document.getElementById("id_mod_period_tblbody")
        let period_index = get_attr_from_el_int(tblBody, "data-value");
        //console.log("period_index: ", period_index, typeof period_index);
        const extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;
        if(period_index == null){
 // only save dates when no index is selected
 // both dates must be entered, if not: make period_index=0 (now)
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if ( !!datefirst && !!datelast) {
                period_dict["periodstart"] = datefirst;
                period_dict["periodend"] = datelast;
            } else {
                period_dict["period_index"] = 0;
            }
        } else {
            period_dict["period_index"] = period_index;
        }

        period_dict["extend_index"] = extend_index;
        period_dict["extend_offset"] = extend_offset;
// hide modal
        $("#id_mod_order").modal("hide");

        DatalistDownload({"period": period_dict});

    }  // ModOrderSave

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//========= ModalStatusOpen====================================
    function ModalStatusOpen (el_input) {
        //console.log("===  ModalStatusOpen  =====") ;

        let item_dict = get_itemdict_from_datamap_by_el(el_input, emplhour_map)
        let id_dict = item_dict["id"];
        //console.log("item_dict", item_dict) ;

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");
        //console.log("data_field", data_field)

// get status from field status, not from confirm satrt/end
        const status_sum = get_subdict_value_by_key(item_dict,"status", "value")
        //console.log("status_sum", status_sum, typeof status_sum)

        let header_text = "Confirm shift";
        let btn_save_text = "Confirm";
        let time_label = "Time:"
        let time_col_index = 0
        let is_field_status = false;
        const allow_lock_status = (status_sum < 16)  // STATUS_16_QUESTION = 16
        //console.log("allow_lock_status", allow_lock_status)
        const status_locked = status_found_in_statussum(8, status_sum)
        //console.log("status_locked", status_locked)

        if (data_field === "confirmstart") {
            header_text = "Confirm start of shift"
            time_label = "Start time:"
            time_col_index = 4
        } else if (data_field === "confirmend") {
            header_text = "Confirm end of shift"
            time_label = "End time:"
            time_col_index = 6
        } else if (data_field === "status") {
            is_field_status = true;

            // STATUS_01_CREATED = 1
            // STATUS_02_START_CONFIRMED = 2
            // STATUS_04_END_CONFIRMED = 4
            // STATUS_08_LOCKED = 8
            // STATUS_16_QUESTION = 16

            if (status_locked) {  // STATUS_08_LOCKED
                header_text = "Unlock confirmation"
                btn_save_text = "Unlock";
            } else { // STATUS_08_LOCKED
                header_text = "Lock confirmation"
                btn_save_text = "Lock";
            }
            time_label = ""
            time_col_index = 9
        }
// don't open modal when locked and confirmstart / confirmend
        const fieldname = (data_field === "confirmstart") ? "timestart" : "timeend"
        const field_dict = get_dict_value_by_key(item_dict, fieldname)

        const dont_open = (!is_field_status) && (status_locked || overlap_or_locked(field_dict) || has_no_employee(item_dict))
        if(!dont_open) {

// put values in el_body
            let el_body = document.getElementById("id_mod_status_body")
            el_body.setAttribute("data-table", get_dict_value_by_key(id_dict, "table"));
            el_body.setAttribute("data-pk", get_dict_value_by_key(id_dict, "pk"));
            el_body.setAttribute("data-ppk", get_dict_value_by_key(id_dict, "ppk"));

            el_body.setAttribute("data-field", data_field);
            el_body.setAttribute("data-value", status_sum);

            document.getElementById("id_mod_status_header").innerText = header_text
            document.getElementById("id_mod_status_time_label").innerText = time_label

            let el_order = document.getElementById("id_mod_status_order");
            const order = get_subdict_value_by_key(item_dict,"orderhour", "value")
            if(!!order){el_order.innerText = order} else {el_order.innerText = null};

            let el_shift = document.getElementById("id_mod_status_shift");

            let el_employee = document.getElementById("id_mod_status_employee");
            el_employee.innerText = get_subdict_value_by_key(item_dict, "employee", "value")

            let el_time = document.getElementById("id_mod_status_time");

            const shift = tr_selected.cells[2].firstChild.value
            if(!!shift){el_shift.innerText = shift} else {el_shift.innerText = null};
            const employee = tr_selected.cells[3].firstChild.value
            const time = tr_selected.cells[time_col_index].firstChild.title
            if(!!time){el_time.innerText = time} else {el_time.innerText = null};

            let el_msg = document.getElementById("id_mod_status_ftr_msg")
            if(!order){
                el_msg.innerText = "Please enter an order"
            } else if(!employee && !is_field_status){
                el_msg.innerText = "Please enter an employee"
            } else if(!time && !is_field_status){
                el_msg.innerText = "Please enter a time"
            } else  {
                el_msg.innerText = null
            }
            let btn_save = document.getElementById("id_mod_status_btn_save")
            const enabled = (allow_lock_status) || (!!order && !!employee && !!time)

            btn_save.disabled = !enabled
            btn_save.innerText = btn_save_text

            let el_mod_status_note = document.getElementById("id_mod_status_note")

    // ---  show modal
            $("#id_mod_status").modal({backdrop: true});
        }
}; // function ModalStatusOpen

//  #############################################################################################################

    function CheckStatus() {
        //console.log( "=== CheckStatus ")
        // function loops through emplhours, set questingsmark or warning when toimestrat / enb reached

        // this code converts ISO to date
        // var s = '2014-11-03T19:38:34.203Z';
        //   var b = s.split(/\D+/);
        //  let testdate =  new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
        //         console.log( "testdate: ", testdate)

        // get now in UTC time
        let now_utc = get_now_utc(comp_timezone);

// --- update current period if necessary
        if(!!period_dict){

            let mode = get_dict_value_by_key(period_dict, "mode")

            if(mode === "current"){
                let update = false;
                let iso, diff, period_timestart_utc, period_timeend_utc
                iso = get_dict_value_by_key(period_dict, "periodstart")
                if (!!iso){period_timestart_utc = moment.utc(iso)}
                diff = now_utc.diff(period_timestart_utc);
                // console.log("now: ", now_utc.format(), "start ", period_timestart_utc.format(), "diff ", diff);
                update = (diff < 0)
                if(!update){
                    iso = get_dict_value_by_key(period_dict, "periodend")
                    if (!!iso){period_timeend_utc = moment.utc(iso)};
                    diff = now_utc.diff(period_timeend_utc);
                    // console.log("now: ", now_utc.format(), "end ", period_timeend_utc.format(), "diff ", diff);
                    update = (diff > 0)
                }
                //if (update) {ModPeriodSave("current")}
             }
               //  if(mode === 'current')
        }  // if(!!period_dict){

// --- loop through tblBody_roster.rows
        let len =  tblBody_roster.rows.length;
        if (!!len){
            for (let row_index = 0, tblRow; row_index < len; row_index++) {
                tblRow = tblBody_roster.rows[row_index];

                let item_dict = get_itemdict_from_datamap_by_tblRow(tblRow, emplhour_map);

                const status_sum = get_subdict_value_by_key(item_dict, "status", "value")
                const start_confirmed = status_found_in_statussum(2, status_sum);//STATUS_02_START_CONFIRMED
                const end_confirmed = status_found_in_statussum(4, status_sum);//STATUS_04_END_CONFIRMED
                const status_locked = (status_sum >= 8) //STATUS_08_LOCKED = 8

                let img_src = imgsrc_stat00
                const timestart_iso = get_subdict_value_by_key(item_dict, "timestart", "datetime")
                if (!!timestart_iso){
                    // diff in minutes, rounded down to whole minutes
                    // diff is negative when time not reached yet
                    // give question mark sign when diff startime > -15 minutes
                    // give warning sign when diff startime > 0 minutes
                    const diff =  Math.floor(now_utc.diff(moment.utc(timestart_iso))/ 60000);
                    if (!status_locked && !start_confirmed) {
                        if (diff >= -15 && diff < 0){
                            img_src = imgsrc_questionmark
                        } else if (diff >= 0 && diff < 1440){
                            img_src = imgsrc_warning
                        }
                    }
                    //console.log("diff: ", diff, "img_src ", img_src);
                }

                let el_confirm_start = tblRow.cells[5].children[0];
                if(!!el_confirm_start){ el_confirm_start.children[0].setAttribute("src", img_src)};

                //get timeend
                img_src = imgsrc_stat00
                const timeend_iso = get_subdict_value_by_key(item_dict, "timeend", "datetime")
                if (!!timeend_iso){
                    // diff in minutes, round down to minutes
                    // give question mark sign when diff endtime > 0 minutes
                    // give warning sign when diff endtime > 30 minutes
                    const diff =  Math.floor(now_utc.diff(moment.utc(timeend_iso))/ 60000);
                    if (!status_locked && !end_confirmed) {
                        if (diff > 0 && diff <= 30){
                            img_src = imgsrc_questionmark
                        } else if (diff > 30 ){
                            img_src = imgsrc_warning
                        }
                    }
                }
                let el_confirm_end = tblRow.cells[7].children[0]
                if(!!el_confirm_end){el_confirm_end.children[0].setAttribute("src", img_src)};

            }  // for (let row_index = 0)
        }  // if ( !!len){
    }  // function CheckStatus

//0000000000000000000000000000000000000000000000000000000000000000000000000000000
    //========= function pop_background_remove  ====================================
    function popupbox_removebackground(class_name){
        // remove selected color from all input popups
        if(!class_name){class_name = ".pop_background"}
        let elements = document.getElementsByClassName(class_name);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }
// ++++++++++++  OFFSETPICKER +++++++++++++++++++++++++++++++++++++++
    "use strict";

//========= OffsetPickerOpen  ====================================
    function OffsetPickerOpen(el_input) {
        //console.log("===  OffsetPickerOpen  =====") ;
        //console.log(el_input) ;

// get values from tr_selected and put them in el_timepicker
        let tr_selected = get_tablerow_selected(el_input);
        if (!tr_selected){tr_selected = el_input};

        const pk_int = get_attr_from_el_int(tr_selected, "data-pk");
        // dont open when new row is not saved yet, then pk_int = NaN
        if(!!pk_int){
            el_timepicker.setAttribute("data-table", get_attr_from_el_str(tr_selected, "data-table"));
            el_timepicker.setAttribute("data-pk", pk_int);
            el_timepicker.setAttribute("data-ppk", get_attr_from_el_int(tr_selected, "data-ppk"));

    // get values from el_input and put them in el_timepicker
            el_timepicker.setAttribute("data-field", get_attr_from_el_str(el_input, "data-field"))

            const fieldname = get_attr_from_el(el_input, "data-field");
            const curOffset = get_attr_from_el_int(el_input, "data-offset");
            const minOffset = get_attr_from_el_int(el_input, "data-minoffset");
            const maxOffset = get_attr_from_el_int(el_input, "data-maxoffset");

            if(!!curOffset || curOffset === 0 ) {
                el_timepicker.setAttribute("data-offset", curOffset)
            } else {
                el_timepicker.removeAttribute("data-offset")
            }
            el_timepicker.setAttribute("data-minoffset", minOffset)
            el_timepicker.setAttribute("data-maxoffset", maxOffset)

            CreateTimepickerDate(el_data, curOffset, fieldname) ;
            CreateTimepickerHours(el_timepicker, el_data, timeformat, OffsetPickerSave);
            CreateTimepickerMinutes(el_timepicker, el_data, interval);

            HighlightAndDisableHours(el_data, fieldname, curOffset, minOffset, maxOffset, timeformat);

    // ---  position popup under el_input
            let popRect = el_timepicker.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();
            const pop_width = 180; // to center popup under input box
            const correction_left = -240 - pop_width/2 ; // -240 because of sidebar
            const correction_top = -32; // -32 because of menubar
            const topPos = inpRect.top + inpRect.height + correction_top;
            const leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;
            const msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
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
        }  //  if(!!pk_int)

    }; // function OffsetPickerOpen

//=========  OffsetPickerSave  ================ PR2019-06-27
    function OffsetPickerSave(mode) {
        //console.log("===  function OffsetPickerSave =========", mode);

// ---  change quicksave when clicked on button 'Quicksave'

// ---  btn_save  >       send new_offset      > close timepicker
//      btn_quick > on  > send new_offset + qs > close timepicker (next time do.t show btn_save)
//                > off > send qs only         > don't close timepicker > show btn_save)

// get quicksave from el_data
        let quicksave = get_quicksave_from_eldata(el_data);
        //console.log("quicksave", quicksave, typeof quicksave);

// ---  change quicksave
        if(mode === "btn_qs"){
            quicksave = !quicksave;
            save_quicksave_in_eldata(el_data, quicksave);
            HideSaveButtonOnQuicksave(el_data, cls_hide);
        }

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked
        const ppk_int =  parseInt(el_timepicker.getAttribute("data-ppk"))
        const field = el_timepicker.getAttribute("data-field")
        const table = el_timepicker.getAttribute("data-table")

    // get values from el_timepicker
        let curOffset = get_attr_from_el_int(el_timepicker, "data-offset");
        const minOffset = get_attr_from_el_int(el_timepicker, "data-minoffset");
        const maxOffset = get_attr_from_el_int(el_timepicker, "data-maxoffset");
        //console.log("curOffset", curOffset, "minoffset", minoffset, "maxoffset", maxoffset);

        let save_offset = (curOffset >= minOffset && curOffset <= maxOffset)
        if (mode ==="btn_delete") {
            curOffset = null;
            save_offset = true;
        }
        if(save_offset){
            if(!!pk_str && !! ppk_int){
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

                id_dict["ppk"] =  ppk_int
                id_dict["table"] =  table

                let row_upload = {};

                if (mode === "btn_qs"){
                    row_upload["quicksave"] = quicksave
                };

                if (!isEmpty(id_dict)){
                    row_upload["id"] = id_dict;
                    row_upload[field] = {"value": curOffset, "update": true}
                }

                const row_id = table + pk_str;
                let tr_selected = document.getElementById(row_id)

                const url_str = url_scheme_shift_team_upload  // get_attr_from_el(el_timepicker, "data-url_str");
                const parameters = {"upload": JSON.stringify (row_upload)};
                console.log ("upload url", url_str, row_upload);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response", response);
                        if ("item_update" in response) {
                            UpdateTableRow(table, tr_selected, response["item_update"])
                        }
                        },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

            }  // if(!!pk_str && !! parent_pk){

        // close timepicker, except when clicked on quicksave off

            if (["btn_save", "btn_delete"].indexOf( mode ) > -1){
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
        }  // if(curOffset >= minOffset && curOffset <= maxOffset)
    }  // OffsetPickerSave


// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict() {  // PR2019-06-09
        console.log( "===== FilterTableRows_dict  ========= ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tblBody_roster.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody_roster.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow_dict(tblRow)
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        };
    }; // function FilterTableRows_dict

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15
        // console.log( "===== ShowTableRow_dict  ========= ");
        //console.log( tblRow);
        // function filters by inactive and substring of fields
        //  - iterates through cells of tblRow
        //  - skips filter of new row (new row is always visible)
        //  - if filter_name is not null:
        //       - checks tblRow.cells[i].children[0], gets value, in case of select element: data-value
        //       - returns show_row = true when filter_name found in value
        //  - if col_inactive has value >= 0 and hide_inactive = true:
        //       - checks data-value of column 'inactive'.
        //       - hides row if inactive = true
        let hide_row = false;
        if (!!tblRow){
            const pk_str = get_attr_from_el(tblRow, "data-pk");

    // check if row is_new_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select customer has no id in tblrow)
            let is_new_row = false;
            if(!!pk_str){
    // skip new row (parseInt returns NaN if value is None or "", in that case !!parseInt returns false
                is_new_row = (!parseInt(pk_str))
            }
            // console.log( "pk_str", pk_str, "is_new_row", is_new_row);
            if(!is_new_row){
            // hide inactive rows if filter_hide_inactive
            /* TODO filter status
                if(col_inactive !== -1 && !show_inactive) {
                    // field 'inactive' has index col_inactive
                    let cell_inactive = tblRow.cells[col_inactive];
                    if (!!cell_inactive){
                        let el_inactive = cell_inactive.children[0];
                        if (!!el_inactive){
                            let value = get_attr_from_el(el_inactive,"data-value")
                            if (!!value) {
                                if (value.toLowerCase() === "true") {
                                    show_row = false;
                                }
                            }
                        }
                    }
                }; // if(col_inactive !== -1){
            */

// show all rows if filter_name = ""
            // console.log(  "show_row", show_row, "filter_name",  filter_name,  "col_length",  col_length);
                if (!hide_row){
                    Object.keys(filter_dict).forEach(function(key) {
                        const filter_text = filter_dict[key];
                        const filter_blank = (filter_text ==="#")

                        let tbl_cell = tblRow.cells[key];
                        // console.log( "tbl_cell", tbl_cell);
                        if(!hide_row){
                            if (!!tbl_cell){
                                let el = tbl_cell.children[0];
                                if (!!el) {
                            // skip if no filter om this colums
                                    if(!!filter_text){
                            // get value from el.value, innerText or data-value
                                        const el_tagName = el.tagName.toLowerCase()
                                        let el_value;
                                        if (el_tagName === "select"){
                                            //el_value = el.options[el.selectedIndex].text;
                                            el_value = get_attr_from_el(el, "data-value")
                                        } else if (el_tagName === "input"){
                                            el_value = el.value;
                                        } else {
                                            el_value = el.innerText;
                                        }
                                        if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                        if (!!el_value){
                                            if (filter_blank){
                                                hide_row = true
                                            } else {
                                                el_value = el_value.toLowerCase();
                                                // hide row if filter_text not found
                                                if (el_value.indexOf(filter_text) === -1) {
                                                    hide_row = true
                                                }
                                            }
                                        } else {
                                            if (!filter_blank){
                                                hide_row = true
                                            } // iif (filter_blank){
                                        }   // if (!!el_value)

                                       //  console.log( "filter_text", filter_text, "el_value", el_value, "hide_row", hide_row);

                                    }  //  if(!!filter_text)
                                }  // if (!!el) {
                            }  //  if (!!tbl_cell){
                        }  // if(!hide_row){
                    });  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

//========= function test printPDF  ====  PR2019-09-02
    function printPDF(log_list) {
            // console.log("printPDF")
			let doc = new jsPDF();

			doc.setFontSize(10);

			let startHeight = 25;
			let noOnFirstPage = 40;
			let noOfRows = 40;
			let z = 1;

            const pos_x = 15
            const line_height = 6
            const len = log_list.length;
            if (len > 0){

                // for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                for (let i = 0, item; i < len; i++) {
                    item = log_list[i];
                    if (!!item) {
                        if(i <= noOnFirstPage){
                            startHeight = startHeight + line_height;
                            addData(item, pos_x, startHeight, doc);
                        }else{
                            if(z ==1 ){
                                startHeight = 0;
                                doc.addPage();
                            }
                            if(z <= noOfRows){
                                startHeight = startHeight + line_height;
                                addData(item, pos_x, startHeight, doc);
                                z++;
                            }else{
                                z = 1;
                            }
                        }

                    }  //  if (!item.classList.contains("display_none")) {
                }
                //To View
                //doc.output('datauri');

            // console.log("printPDF before save")
                //To Save
                doc.save('samplePdf');
            // console.log("printPDF after save")
			}  // if (len > 0){
    }
    function addData(item, pos_x, height, doc){
        if(!!item){
            doc.text(pos_x, height, item);
        }  // if(!!tblRow){
    }  // function addData

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

//========= overlap_or_locked  ==================================== PR2019-09-20
    function overlap_or_locked(field_dict) {
        let locked = (!!isEmpty(field_dict));
        if(!locked) {
            if ("overlap" in field_dict){
                locked = true
            } else if ("locked" in field_dict){
                locked = true
            }
            // locked = ("overlap" in field_dict || "locked" in field_dict)
        }
        return locked
    }


//###########################################################################
// +++++++++++++++++ DOWNLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++


//###########################################################################
// +++++++++++++++++ TABLE ++++++++++++++++++++++++++++++++++++++++++++++++++

//###########################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= UploadTimepickerChanged  ============= PR2019-10-12
    function UploadTimepickerChanged(tp_dict) {
        console.log("=== UploadTimepickerChanged");
        console.log("tp_dict", tp_dict);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};

            const tblName = "emplhour";
            const map_id = get_map_id(tblName, get_subdict_value_by_key(tp_dict, "id", "pk").toString());
            let tr_changed = document.getElementById(map_id)

            let parameters = {"upload": JSON.stringify (upload_dict)}
            const url_str = url_emplhour_upload;
            let response;
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response", response);
                    if ("update_list" in response) {
                        let update_list = response["update_list"];
                        UpdateFromResponseNEW(tblName, update_list)
                    }

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
    }  // if("save_changes" in tp_dict) {
 }  //UploadTimepickerChanged

//========= UploadChanges  ============= PR2019-10-12
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadChanges(upload_dict, url_str) {
        console.log("=== UploadChanges");

        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)};
            console.log("upload_dict");
            console.log(upload_dict);

// if delete: make tblRow red
            const is_delete = (!!get_subdict_value_by_key(upload_dict, "id","delete"))
            if(is_delete){
                const map_id = get_mapid_from_dict (upload_dict);
                let tr_changed = document.getElementById(map_id);

                if(!!tr_changed){
                    tr_changed.classList.add(cls_error);
                    setTimeout(function (){
                        tr_changed.classList.remove(cls_error);
                    }, 2000);
                }
            }  // if(is_delete){

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log("response");
                    console.log(response);
                    UpdateFromResponse(response)
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadChanges


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++


//=========  UpdateFromResponseNEW  ================ PR2019-10-14
    function UpdateFromResponseNEW(tblName, update_list) {
        console.log(" --- UpdateFromResponseNEW  ---");
        console.log(update_list);

        const len = update_list.length;
        if (len > 0) {
            for (let i = 0, len = update_list.length; i < len; i++) {
                let update_dict = update_list[i];
                if(!isEmpty(update_dict)){

            // get info from update_dict
                    let id_dict = get_dict_value_by_key(update_dict, "id")
                    const pk_int = get_dict_value_by_key(id_dict, "pk")
                    const ppk_int = get_dict_value_by_key(id_dict, "ppk")
                    if(!!pk_int){
                        const map_id = get_map_id(tblName, pk_int);
                        console.log ("map_id", map_id);

            // update or add emplhour_dict in emplhour_map
                        emplhour_map.set(map_id, update_dict);

            // lookup tablerow
                        let emplhour_tblRow = document.getElementById(map_id);

             // add new emplhour_tblRow row if it does not exist
                        if(!emplhour_tblRow){
             // get row_index
                            let row_index = get_dict_value_by_key(id_dict, "rowindex")
                            if(!row_index){row_index = 0}
                            row_index -= 1 // subtract 1 because of filter row (I think)

             // add new tablerow if it does not exist
                            // row_index = -1 (add after existing row), is_new_item = true
                            emplhour_tblRow = CreateTblRow(pk_int, ppk_int, row_index, true)
                        }
            // update tablerow
                        UpdateTableRow(tblName, emplhour_tblRow, update_dict)

                    }  // if(!!pk_int)
                }  // if(!isEmpty(update_dict))
            }  // for (let i = 0, len = update_list.length; i < len; i++)
        }  // if (len > 0)
    }  // UpdateFromResponseNEW


//=========  UpdateFromResponse  ================ PR2019-10-13
    function UpdateFromResponse(tblName, tr_changed, item_dict) {
        console.log(" --- UpdateFromResponse  ---");
        console.log(item_dict);

        if (!!item_dict) {
            UpdateTableRow(tblName, tr_changed, item_dict)
            const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
            if (is_created){
// add new empty row
                id_new = id_new + 1
                const pk_new = tblName +  "_new" + id_new.toString()
                const ppk = get_ppk_from_dict (item_dict)

                let new_dict = {"id": {"pk": pk_new, "ppk": ppk}}
                // row_index = -1 (add to end),  is_new_item = true
                let new_row = CreateTblRow(pk_new, ppk, -1, true)

                UpdateTableRow(tblName, new_row, new_dict)
            }
        }

//--- remove 'updated, deleted created and msg_err from item_dict
        remove_err_del_cre_updated__from_itemdict(item_dict)

//--- replace updated item in map
        if (tblName === "emplhour"){
            const map_id = get_map_id(tblName, get_dict_value_by_key(item_dict, "pk"));
            console.log(">>>>>>>>>>> map_id", map_id);
            emplhour_map.set(map_id, item_dict)
        }

            console.log("emplhour_map");
            console.log( emplhour_map);

    }  // UpdateFromResponse

//###########################################################################
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  HandleTimepickerOpen  ================ PR2019-10-12
    function HandleTimepickerOpen(el_input) {
        console.log("=== HandleTimepickerOpen");

        let tr_selected = get_tablerow_selected(el_input)
        const emplh_dict = get_itemdict_from_datamap_by_tblRow(tr_selected, emplhour_map);

        console.log("emplh_dict");
        console.log(emplh_dict);

        HandleTableRowClicked(tr_selected);

        if(!isEmpty(emplh_dict)){
            const fieldname = get_attr_from_el(el_input, "data-field")

            const id_dict = get_dict_value_by_key(emplh_dict, "id")
            const field_dict = get_dict_value_by_key(emplh_dict, fieldname)
            const offset = ("offset" in field_dict) ? field_dict["offset"] : null
            const minoffset = ("minoffset" in field_dict) ? field_dict["minoffset"] : -720
            const maxoffset = ("maxoffset" in field_dict) ? field_dict["maxoffset"] : 2160

            let tp_dict = {"id": id_dict, "field": fieldname, "rosterdate": field_dict["rosterdate"],
                "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
                "isampm": (timeformat === 'AmPm'), "quicksave": {"value": quicksave}}

            const show_btn_delete = true;
            let st_dict = { "interval": interval, "comp_timezone": comp_timezone, "user_lang": user_lang,
                            "show_btn_delete": show_btn_delete, "weekday_list": weekday_list, "month_list": month_list};

            // only needed in scheme
            const text_curday = get_attr_from_el(el_data, "data-timepicker_curday");
            const text_prevday = get_attr_from_el(el_data, "data-timepicker_prevday");
            const text_nextday = get_attr_from_el(el_data, "data-timepicker_nextday");
            if(!!text_curday){st_dict["text_curday"] = text_curday};
            if(!!text_prevday){st_dict["text_prevday"] = text_prevday};
            if(!!text_nextday){st_dict["text_nextday"] = text_nextday};

            const txt_save = get_attr_from_el(el_data, "data-txt_save");
            if(!!txt_save){st_dict["txt_save"] = txt_save};
            const txt_quicksave = get_attr_from_el(el_data, "data-txt_quicksave");
            if(!!txt_quicksave){st_dict["txt_quicksave"] = txt_quicksave};
            const txt_quicksave_remove = get_attr_from_el(el_data, "data-txt_quicksave_remove");
            if(!!txt_quicksave_remove){st_dict["txt_quicksave_remove"] = txt_quicksave_remove};

            const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
            if(!!imgsrc_delete){st_dict["imgsrc_delete"] = imgsrc_delete};

            OpenTimepicker(el_input, UploadTimepickerChanged, tp_dict, st_dict)

        }  //  if(!isEmpty(emplh_dict))
    };

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++

//###########################################################################
// +++++++++++++++++ VALIDATE +++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= has_overlap  ==================================== PR2019-09-20
    function has_overlap(field_dict) {
        let hasoverlap = false;
        if(!isEmpty(field_dict)) {
            hasoverlap = ("overlap" in field_dict)
        }
        return hasoverlap
    }
 //========= has_employee  ==================================== PR2019-09-20
    function has_no_employee(item_dict) {
        let has_employee = false;
        if(!isEmpty(item_dict)) {
            if ("employee" in item_dict){
                const field_dict = item_dict["employee"];
                // if overlap = false there is no 'value' key, if locked = false there is no 'locked' key,
                if ("pk" in field_dict){
                    has_employee = (!!parseInt(field_dict["pk"]))
                }
            }
        }
        return !has_employee
    }
// ###################################################################################

}); //$(document).ready(function()