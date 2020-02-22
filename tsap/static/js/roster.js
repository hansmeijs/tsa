// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";
    const cls_visible_hide = "visibility_hide";

    const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
    const cls_bc_lightgrey = "tsa_bc_lightgrey";

    const cls_selected =  "tsa_tr_selected";
    const cls_btn_selected = "tsa_btn_selected";
    const cls_error = "tsa_tr_error";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_emplhour_upload = get_attr_from_el(el_data, "data-emplhour_upload_url");
        const url_emplhour_fill_rosterdate = get_attr_from_el(el_data, "data-emplhour_fill_rosterdate_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
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
        let selected_customer_pk = 0; // used in modperiodselect
        let selected_order_pk = 0;  // used in modperiodselect
        let selected_employee_pk = 0;  // used in modselectorderselect
        let selected_isabsence = null;  // used in modselectorderselect, can have value null, false or true

        let loc = {};  // locale_dict with translated text
        let selected_roster_period = {};
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
        let filter_mod_customer = "";

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
        let tBody_roster = document.getElementById("id_tbody_roster");
        let tBody_select = document.getElementById("id_tbody_select");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

        let el_mod_employee_tblbody =  document.getElementById("id_modroster_employee_tblbody");
        let el_mod_employee_body = document.getElementById("id_modroster_employee_body")
        let el_mod_employee_body_right = document.getElementById("id_modroster_employee_body_right")

        let el_timepicker = document.getElementById("id_timepicker")
        let el_timepicker_tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        let el_timepicker_tbody_minute = document.getElementById("id_timepicker_tbody_minute");

        let el_popup_wdy = document.getElementById("id_popup_wdy");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// === EVENT HANDLERS ===

// ---  side bar - select period
        let el_flt_period = document.getElementById("id_sidebar_select_period");
        el_flt_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        el_flt_period.addEventListener("mouseenter", function() {el_flt_period.classList.add(cls_hover)});
        el_flt_period.addEventListener("mouseleave", function() {el_flt_period.classList.remove(cls_hover)});
// ---  side bar - select customer
        let el_sidebar_select_customer = document.getElementById("id_sidebar_select_customer");
            el_sidebar_select_customer.addEventListener("click", function() {ModSelectOrder_Open("customer")}, false );
            el_sidebar_select_customer.addEventListener("mouseenter", function() {el_sidebar_select_customer.classList.add(cls_hover)});
            el_sidebar_select_customer.addEventListener("mouseleave", function() {el_sidebar_select_customer.classList.remove(cls_hover)});
// ---  side bar - select absence
        let el_sidebar_select_absence = document.getElementById("id_sidebar_select_absence");
            el_sidebar_select_absence.addEventListener("click", function() {ModSelectOrder_Open("mod_absence")}, false );
            el_sidebar_select_absence.addEventListener("mouseenter", function() {el_sidebar_select_absence.classList.add(cls_hover)});
            el_sidebar_select_absence.addEventListener("mouseleave", function() {el_sidebar_select_absence.classList.remove(cls_hover)});

// ---  MOD SELECT ORDER ------------------------------
        let el_modorder_input_customer = document.getElementById("id_modorder_input_customer")
            el_modorder_input_customer.addEventListener("keyup", function(event){
                setTimeout(function() {ModSelectOrder_FilterCustomer()}, 50)});
        let el_modorder_select_absence = document.getElementById("id_modorder_select_absence")
            el_modorder_select_absence.addEventListener("change", function() {ModSelectOrder_SelectAbsence(el_modorder_select_absence)}, false )
        let el_modorder_btn_save = document.getElementById("id_modorder_btn_save")
            el_modorder_btn_save.addEventListener("click", function() {ModSelectOrder_Save()}, false )

// ---  MOD PERIOD ------------------------------------
        // header
        document.getElementById("id_hdr_period").addEventListener("click", function() {ModPeriodOpen()});
        // buttons
        document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
        document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

// ---  MOD CONFIRM ------------------------------------
// ---  save button in ModConfirm

// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
            el_popup_date.addEventListener("change", function() {HandlePopupDateSave()}, false )

// buttons in modal order
        //document.getElementById("id_mod_order_btn_save").addEventListener("click", function() {ModOrderSave()}, false )

// ---  MOD ROSTER EMPLOYEE ------------------------------------
        // --- buttons in btn_container
        let btns = document.getElementById("id_modroster_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const data_mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {MRE_btn_SelectAndDisable(data_mode)}, false )
        }
        let el_MRE_select_abscat = document.getElementById("id_modroster_employee_abscat")
            el_MRE_select_abscat.addEventListener("change", function() {MRE_abscat_changed()}, false )

        document.getElementById("id_modroster_employee_switch_date").addEventListener("change", function() {ModEmployeeFillOptionsShift()}, false )
        let el_MRE_btn_save = document.getElementById("id_modroster_employee_btn_save")
            el_MRE_btn_save.addEventListener("click", function() {MRE_Save("save")}, false )
        let el_MRE_btn_delete = document.getElementById("id_modroster_employee_btn_delete")
            el_MRE_btn_delete.addEventListener("click", function() {MRE_Save("delete")}, false )

// ---  edit and save button in MOD ROSTERDATE
        document.getElementById("id_mod_rosterdate_input").addEventListener("change", function() {ModRosterdateEdit()}, false)
        document.getElementById("id_mod_rosterdate_btn_ok").addEventListener("click", function() {ModRosterdateSave()}, false)

// ---  add 'keyup' event handler to input employee
        let el_MRE_input_employee = document.getElementById("id_modroster_employee_input_employee")
            el_MRE_input_employee.addEventListener("keyup", function() {
                setTimeout(function() {MRE_InputEmployeeKeyup()}, 50)});

// ---  input id_modroster_employee_split_time
        let el_MRE_split_time = document.getElementById("id_modroster_employee_split_time");
        el_MRE_split_time.addEventListener("click", function() {MRE_TimepickerOpen(el_MRE_split_time, "modroster")}, false );

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

// ---  DOCUMENT CLICK - to close popup windows ------------------------------
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
            if (event.target.classList.contains("input_popup_date")) {close_popup = false} else
            if (el_popup_date.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) { el_popup_date.classList.add(cls_hide) };
// close el_popup_wdy
            // event.target identifies the element on which the event occurred, i.e: on which is clicked
            close_popup = true
            if (event.target.classList.contains("input_popup_wdy")) {close_popup = false} else
            if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_popup_wdy");
                el_popup_wdy.classList.add(cls_hide)};
        }, false);

// === reset filter when clicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });


        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        // console.log(moment.locales())
        moment.locale(user_lang)


        // TODO        let intervalID = window.setInterval(CheckStatus, 5000);  // every 5 seconds

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// --- create header filter
        CreateTblHeaderFilter()

// --- first get locale, to make it faster
        // send 'now' as array to server, so 'now' of local computer will be used
// ---  download settings and datalists
        const now_arr = get_now_arr_JS();
        const datalist_request = {
            setting: {page_roster: {mode: "get"},
                        selected_pk: {mode: "get"}},
            locale: {page: "roster"},
            quicksave: {mode: "get"},
            roster_period:  {get: true, now: now_arr},
            emplhour: {mode: "get"},
            company: {value: true},
            customer: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            //scheme: {istemplate: false, inactive: null, issingleshift: null},
            //schemeitem: {customer_pk: selected_customer_pk}, // , issingleshift: false},
            //shift: {istemplate: false},
            //team: {istemplate: false},
            //teammember: {datefirst: null, datelast: null, employee_nonull: false},
            employee: {inactive: null},
            abscat: {inactive: false}
            };
        DatalistDownload(datalist_request);

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
            document.getElementById("id_modroster_employee_loader").classList.remove(cls_hide)
        }
        el_loader.classList.remove(cls_visible_hide)

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
                el_loader.classList.add(cls_visible_hide)
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                    CreateSubmenu()
                    CreateTblModSelectPeriod();
                }
                if ("roster_period" in response) {
                    selected_roster_period = response["roster_period"];
                    DisplayPeriod(selected_roster_period);
                }
                let fill_table = false, check_status = false;
                if ("abscat_list" in response) {
                    get_datamap(response["abscat_list"], abscat_map)
                    const select_txt = get_attr_from_el(el_data, "data-txt_select_abscat");
                    const select_none_txt = get_attr_from_el(el_data, "data-txt_select_abscat_none");
                    FillOptionsAbscat(el_MRE_select_abscat, abscat_map, select_txt, select_none_txt)
                }
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                }
                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                }

                if ("emplhour_list" in response) {
                    get_datamap(response["emplhour_list"], emplhour_map)
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
                    quicksave = get_dict_value(response, ["quicksave", "value"], false);
                    //console.log("quicksave", quicksave)
                }

                if ("rosterdate_check" in response) {
                    ModRosterdateChecked(response["rosterdate_check"]);
                };

                if (fill_table) {FillTableRows()}
                if (check_status) {CheckStatus()}

            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload

//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2020-01-21
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const label_list = [loc.Total_hours, loc.Customer + " - " + loc.Order, loc.Planning + " " + loc.of, loc.Print_date];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];

        let headerrow = [loc.Date, loc.Customer, loc.Order, loc.Employee, loc.Shift,
                         loc.Start_time, loc.End_time, loc.Break, loc.Working_hours, loc.Status]

        AddSubmenuButton(el_div, loc.menubtn_roster_create, function() {ModRosterdateOpen("create")}, ["mx-2"]);
        AddSubmenuButton(el_div, loc.menubtn_roster_delete, function() {ModRosterdateOpen("delete")}, ["mx-2"]);
        AddSubmenuButton( el_div, loc.menubtn_print_roster, function() { PrintReport()}, ["mx-2"]);
        AddSubmenuButton( el_div, loc.Export_to_Excel, function() { ExportToExcel()}, ["mx-2"]);

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        // console.log("===  CreateTblModSelectPeriod == ");
        // console.log(selected_roster_period);
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
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

    } // CreateTblModSelectPeriod

//=========  CreateSelectTableCustomers  ================ PR2019-11-16
    function CreateSelectTableCustomers() {
        // console.log("===  CreateSelectTableCustomers == ");
        // console.log(selected_roster_period);

        const tblName = "customer";
        let tBody_select = document.getElementById("id_mod_order_tblbody_cust");
        // TODO correct
        FillSelectTable(tBody_select, el_data, customer_map, tblName, HandleSelectTable);

    }  // CreateSelectTableCustomers

 //=========  CreateSelectTableOrders  ================ PR2019-11-16
    function CreateSelectTableOrders() {
        // console.log("===  CreateSelectTableOrders == ");
        // console.log(selected_roster_period);

        const tblName = "order";
        let tBody_select = document.getElementById("id_mod_order_tblbody_order");
        // TODO correct
        FillSelectTable(tBody_select, el_data, order_map, tblName, HandleSelectTable, HandleBtnClicked);

    }

//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable(tBody_select, el_data, data_map, tblName, HandleSelectTable, HandleBtnClicked) {
        console.log("FillSelectTable");

        //tBody_select.innerText = null;
//--- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const row_index = null // add at end when no rowindex
            //let selectRow = t_CreateSelectRow(tBody_select, tblName, row_index, item_dict,
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
        //console.log(" ===== FillTableRows =====");

// --- reset tBody_roster
        tBody_roster.innerText = null;

// --- loop through emplhour_map
        let previous_rosterdate_dict = {};
        let tblRow;

        if(!!emplhour_map.size) {
            for (const [map_id, item_dict] of emplhour_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict)

// get rosterdate to be used in addnew row
                previous_rosterdate_dict = get_dict_value(item_dict, ['rosterdate'])
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
        //console.log("=========  function CreateTblHeaderFilter =========");

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

//+++ insert tblRow ino tBody_roster
        let tblRow = tBody_roster.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.

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
            //
            // const tbl_col_images = [5, 7, 10];
            // const tagName = (tbl_col_images.indexOf(j) > -1) ? "a" : "input"
            let tagName = null;
            if (tbl_col_images.indexOf(j) > -1) {
                tagName = "a";
            } else  if([4, 6, 8, 9].indexOf(j) > -1) {
                tagName = "input";
            } else {
                tagName = "input";
            }

            let el = document.createElement(tagName);
            el.setAttribute("data-field", data_fields[j]);

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if (tbl_col_images.indexOf( j ) > -1){
                if (!is_new_item){

                // --- first add <a> element with EventListener to td
                    el.addEventListener("click", function() {ModalStatusOpen(el)}, false)

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
                    if (is_new_item){
                        el.classList.add("input_popup_date");
                        el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false )
                    }
                } else if ([1, 2].indexOf( j ) > -1){
                    if (is_new_item){
                        el.addEventListener("change", function() {UploadElChanges(el)}, false )
                    }
                } else if (j === 3){
                    el.addEventListener("click", function() {MRE_Open(el)}, false )
                } else if ([4, 6, 8, 9].indexOf( j ) > -1){
                    //el.classList.add("input_timepicker")
                    el.setAttribute("data-toggle", "modal");
                    el.setAttribute("data-target", "#id_mod_timepicker");
                    el.setAttribute("tabindex", "0");
                    //el.classList.add("form-control");
                    el.classList.add("pointer_show");
                    el.classList.add("mb-0");

                    el.addEventListener("click", function() {HandleTimepickerOpen(el)}, false)
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
                } else if (j === 2){
                    el.classList.add("td_width_120");
                } else if (j === 3){
                    el.classList.add("td_width_150");
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
                el.classList.add("input_text"); // makes background transparent


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
            const id_dict = get_dict_value (item_dict, ["id"]);
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
                const pk_int = get_dict_value(id_dict, ["pk"])
                const ppk_int = get_dict_value(id_dict, ["ppk"])
                const map_id = get_map_id("emplhour", pk_int);

               //console.log("id_str", id_str, typeof id_str);
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
                    let field_dict = {}, fieldname, err;
                    let value = "", o_value, n_value, data_value, data_o_value;
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_el(el_input, "data-field");
                        if (fieldname in item_dict){
                            field_dict = get_dict_value (item_dict, [fieldname]);
                            //console.log("fieldname: ", fieldname)
                            //console.log("field_dict: ", field_dict)
                            const is_updated = ("updated" in field_dict);
                            const is_locked = get_dict_value(field_dict, ["locked"], false)

                            //console.log("is_updated: ", is_updated)
                            if(is_updated){
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
                                let value = get_dict_value (field_dict, ["code"])
                                if(!!value){el_input.value = value} else {el_input.value = null}

                            } else if (["orderhour", "employee"].indexOf( fieldname ) > -1){
                                 // disable field orderhour
                                if (fieldname === "orderhour") {
                                    field_dict["locked"] = true
                                } else  if (fieldname === "employee") {
                                    // disable field employee when this is restshift
                                    const is_restshift = get_dict_value(item_dict, ["id", "isrestshift"], false)
                                    if (is_restshift) { field_dict["locked"] = true }
                                }

                                const key_str = "code";
                                format_text_element (el_input, key_str, el_msg, field_dict, false, [-220, 60], title_overlap);

                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                // format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)
                                const display_text = get_dict_value(field_dict, ["display"])
                                el_input.value = display_text

                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                format_duration_element (el_input, el_msg, field_dict, user_lang)

                            } else if (["status"].indexOf(fieldname ) > -1){
                                format_status_element (el_input, field_dict,
                                        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05,
                                        "", "", "start time confirmed", "end time confirmed", "start- and endtime confirmed", "locked")

                                // put status also in tblRow
                                const status_int = parseInt(get_dict_value(item_dict, ["status", "value"]))
                                tblRow.setAttribute("data-status", status_int)

                            } else if (fieldname === "overlap"){
                                //console.log("----------fieldname", fieldname);
                                //console.log("field_dict", field_dict);
                                format_overlap_element (el_input, field_dict, imgsrc_stat00, imgsrc_real03, title_overlap);

                            }  // if (fieldname === "rosterdate") {


                        } else {
                            // "confirmstart", "confirmend" are not as fieldname in item_dict
                            if (["confirmstart", "confirmend"].indexOf( fieldname ) > -1){
                                const status_dict = get_dict_value (item_dict, ["status"]);
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
        const field_dict = get_dict_value(item_dict, [fieldname])

        const field_is_locked = ("locked" in field_dict)
        const has_overlap = ("overlap" in field_dict)
        const has_no_employee = (!get_dict_value(item_dict, ["employee", "pk"]))
        const locked = (field_is_locked || has_overlap || has_no_employee);

        if(!locked){
            el.children[0].setAttribute("src", img_src)
            el.setAttribute("href", "#");
        };
    }

// +++++++++ MOD ROSTERDATE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModRosterdateOpen  ================ PR2020-01-21
    function ModRosterdateOpen(mode) {
        console.log(" -----  ModRosterdateOpen   ----", mode)
        //console.log("rosterdate_dict", rosterdate_dict)

        const is_delete = (mode === "delete")

// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

// reset mod_upload_dict
        mod_upload_dict = {};

// --- check if rosterdate has emplhour records and confirmed records
        const datalist_request = {"rosterdate_check": {"mode": mode}};
        DatalistDownload(datalist_request);
        // returns function ModRosterdateChecked

// set header
        console.log("loc", loc)
        const hdr_text = (is_delete) ? loc.rosterdate_hdr_delete : loc.rosterdate_hdr_create
        document.getElementById("id_mod_rosterdate_header").innerText = hdr_text;

// set value of input label
        document.getElementById("id_mod_rosterdate_label").innerText = loc.Rosterdate + ": "

// set value of input element blank, set readOnly = true
        let el_input = document.getElementById("id_mod_rosterdate_input")
        el_input.value = null
        el_input.readOnly = true;

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_input.focus()
        }, 500);

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_class_remove = (is_delete) ? "btn-primary" :  "btn-outline-danger";
        console.log("loc", loc)
        const btn_text = (is_delete) ? loc.Delete : loc.Create
        console.log("loc.Delete", loc.Delete)
        console.log("loc.Create", loc.Create)
        console.log("loc.Cancel", loc.Cancel)
        let el_btn_ok = document.getElementById("id_mod_rosterdate_btn_ok")
            el_btn_ok.innerText = btn_text;
            el_btn_ok.classList.remove(btn_class_remove)
            el_btn_ok.classList.add(btn_class_add)
            el_btn_ok.classList.remove(cls_hide)
            el_btn_ok.disabled = true;
        let el_btn_cancel = document.getElementById("id_mod_rosterdate_btn_cancel")
            el_btn_cancel.innerText = loc.Cancel;

// ---  show modal
        $("#id_mod_rosterdate").modal({backdrop: true});
    };  // ModRosterdateOpen

// +++++++++  ModRosterdateEdit  ++++++++++++++++++++++++++++++ PR2019-11-12
    function ModRosterdateEdit() {
        console.log("=== ModRosterdateEdit =========");
        //console.log("mod_upload_dict: ", mod_upload_dict);
        // called when date input changed

// reset mod_upload_dict, keep 'mode'
        const mode = get_dict_value(mod_upload_dict, ["mode"])
        const is_delete = (mode === "delete")
        mod_upload_dict = {"mode": mode}
        //console.log("vv mod_upload_dict: ", mod_upload_dict);

// get value from input element
        const new_value = document.getElementById("id_mod_rosterdate_input").value;

// update value of input label
        const label_txt = loc.Rosterdate + ": " +
            format_date_iso (new_value, loc.months_long, loc.weekdays_long, false, false, user_lang);
        document.getElementById("id_mod_rosterdate_label").innerText = label_txt

// --- check if new rosterdate has emplhour records and confirmed records
        const datalist_request = {"rosterdate_check": {"mode": mode, "rosterdate": new_value}}
        DatalistDownload(datalist_request);
        // returns function ModRosterdateChecked

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_add_class = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_remove_class = (is_delete) ? "btn-primary" :  "btn-outline-danger";
        const btn_text = (is_delete) ? loc.Delete : loc.Create
        let el_btn_ok = document.getElementById("id_mod_rosterdate_btn_ok")
            el_btn_ok.innerText = btn_text;
            el_btn_ok.classList.remove(btn_remove_class)
            el_btn_ok.classList.add(btn_add_class)
            el_btn_ok.disabled = true;
        let el_btn_cancel = document.getElementById("id_mod_rosterdate_btn_cancel")
            el_btn_cancel.innerText = loc.Cancel;

    }  // ModRosterdateEdit

// +++++++++  ModRosterdateSave  ++++++++++++++++++++++++++++++ PR2019-11-14
    function ModRosterdateSave() {
        console.log("=== ModRosterdateSave =========");
        //console.log("mod_upload_dict", mod_upload_dict);
        const mode = get_dict_value(mod_upload_dict, ["mode"])
        const is_delete = (mode === "delete")
        // mod_upload_dict: {mode: "create", rosterdate: "2019-12-20", confirmed: 0, count: 0}

    // make input field readonly
            document.getElementById("id_mod_rosterdate_input").readOnly = true;

    // show loader
            document.getElementById("id_mod_rosterdate_loader").classList.remove(cls_hide);

    // set info textboxes
            const info_txt = (is_delete) ? loc.rosterdate_deleting : loc.rosterdate_adding;
            document.getElementById("id_mod_rosterdate_info_01").innerText = info_txt + "...";
            document.getElementById("id_mod_rosterdate_info_02").innerText = null;
            document.getElementById("id_mod_rosterdate_info_03").innerText = null;

    // set buttons
            document.getElementById("id_mod_rosterdate_btn_ok").disabled = true;


        let emplhour_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_empty_shifts: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };
        mod_upload_dict["emplhour"] = emplhour_dict;

    // Upload Changes:
           UploadChanges(mod_upload_dict, url_emplhour_fill_rosterdate);

    }  // function ModRosterdateSave

// +++++++++  ModRosterdateChecked  ++++++++++++++++++++++++++++++ PR2019-11-13
    function ModRosterdateChecked(response_dict) {
        console.log("=== ModRosterdateChecked =========" );
        //console.log("response_dict:", response_dict );
        // response_dict: {mode: "last", value: "2019-12-19", count: 10, confirmed: 0}

        // when create: count is always > 0, otherwise this function is not called
        // hide loader in modal form

// add 'checked' to mod_upload_dict, so left button will know it must cancel
        mod_upload_dict = response_dict

// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

// remove input field readonly
        let el_input = document.getElementById("id_mod_rosterdate_input");
        el_input.value = get_dict_value(response_dict, ["rosterdate"]);
        el_input.readOnly = false;

// set info textboxes
        ModRosterdate_SetLabelAndInfoboxes(response_dict)

    }  // function ModRosterdateChecked

// +++++++++  ModRosterdateFinished  ++++++++++++++++++++++++++++++ PR2019-11-13
    function ModRosterdateFinished(response_dict) {
        console.log("=== ModRosterdateFinished =========" );
        console.log("response_dict", response_dict );
        // rosterdate: {rosterdate: {…}, logfile:
        const mode = get_dict_value(response_dict,["mode"])
        const is_delete = (mode === "delete")
        console.log("mode", mode );
        console.log("is_delete", is_delete );
        const msg_01_txt = get_dict_value(response_dict,["msg_01"])
        const msg_02_txt = get_dict_value(response_dict, ["msg_02"])
        const msg_03_txt = get_dict_value(response_dict, ["msg_03"])
// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

    // set info textboxes
        const info01_txt = loc.rosterdate_finished + ((is_delete) ? loc.deleted : loc.created) + ".";

        document.getElementById("id_mod_rosterdate_info_01").innerText = msg_01_txt;
        document.getElementById("id_mod_rosterdate_info_02").innerText = msg_02_txt;
        document.getElementById("id_mod_rosterdate_info_03").innerText = msg_03_txt;

    // hide ok button, put 'Close' on cancel button
        document.getElementById("id_mod_rosterdate_btn_ok").classList.add(cls_hide);
        document.getElementById("id_mod_rosterdate_btn_cancel").innerText = loc.Close;

    }  // function ModRosterdateFinished

//=========  ModRosterdate_SetLabelAndInfoboxes  ================ PR2019-11-13
    function ModRosterdate_SetLabelAndInfoboxes(response_dict) {
        console.log(" -----  ModRosterdate_SetLabelAndInfoboxes   ----")

// set info textboxes
        const mode = get_dict_value(response_dict, ["mode"]);
        const is_delete = (mode === "delete");

        const rosterdate_iso = get_dict_value(response_dict, ["rosterdate"]);
        const count = get_dict_value(response_dict, ["count"]);
        const confirmed = get_dict_value(response_dict, ["confirmed"]);

        let text_list = ["", "", "", ""];
        // set value of input label
        text_list[0] = loc.Rosterdate + ": " +
            format_date_iso (rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, user_lang);

        if(!count){
    // This rosterdate has no shifts
             text_list[1] = loc.rosterdate_count_none;
        } else {
    // This rosterdate has [count] shifts
            text_list[1] = loc.rosterdate_count
            text_list[1] += ((count === 1) ? loc.one : count.toString()) + " ";
            text_list[1] += ((count === 1) ? loc.Shift.toLowerCase() : loc.Shifts.toLowerCase());

            if(!confirmed){
                text_list[1] += ".";
            } else {
    // [confirmed] of them are confirmed shifts.
                text_list[1] += ((confirmed === 1) ?
                                    (", " + loc.rosterdate_confirmed_one) :
                                    (", " + confirmed.toString()) + " " + loc.rosterdate_confirmed_multiple);
            }

            if(!confirmed){
    // 'These shifts will be replaced.' / deleted
                 text_list[2] = ((count === 1) ? loc.rosterdate_shift_willbe : loc.rosterdate_shifts_willbe) +
                                ((is_delete) ? loc.deleted : loc.replaced) + ".";
            } else {
    // 'Shifts that are not confirmed will be replaced/deleted, confirmed shifts will be skipped.')
                text_list[2] = loc.rosterdate_skip01 +
                               ((is_delete) ? loc.deleted : loc.replaced) +
                               loc.rosterdate_skip02;
            }
            text_list[3] =  loc.want_to_continue
        }  // if(!count)

        console.log("text_list: ", text_list)
        document.getElementById("id_mod_rosterdate_label").innerText = text_list[0];
        document.getElementById("id_mod_rosterdate_info_01").innerText = text_list[1];
        document.getElementById("id_mod_rosterdate_info_02").innerText = text_list[2];
        document.getElementById("id_mod_rosterdate_info_03").innerText = text_list[3];

// set buttons
        // no record te be deleted, disable ok button
        // all records are confirmed, disable ok button
        // also disable when no rosterdate
        const is_disabled = ((!rosterdate_iso) || ((is_delete) && (!count || count === confirmed)))

        const ok_txt = (is_delete) ? ((!!count) ? loc.Yes_delete : loc.Delete) :
                                     ((!!count) ? loc.Yes_create : loc.Create);
        const cancel_txt = (!!count) ? loc.No_cancel : loc.Cancel

        let el_ok = document.getElementById("id_mod_rosterdate_btn_ok");
            el_ok.innerText = ok_txt;
            el_ok.disabled = is_disabled;

        let el_cancel = document.getElementById("id_mod_rosterdate_btn_cancel");
            el_cancel.innerText = cancel_txt;

    } // ModRosterdate_SetLabelAndInfoboxes

// ++++ MOD SELECT ORDER ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// ++++ MOD ROSTER EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  MRE_Open  ================ PR2019-06-23
    function MRE_Open(el_input) {
        console.log(" -----  MRE_Open   ----")
        //console.log("el_input: ", el_input)

        const tblRow = get_tablerow_selected(el_input);
        const map_id = get_attr_from_el(tblRow, "data-map_id")

// reset mod_upload_dict
        mod_upload_dict = {};

// lookup emplh_dict in emplhour_map
        const emplh_dict = get_itemdict_from_datamap_by_el(el_input, emplhour_map);
        let is_absence = false, is_restshift = false;

        //console.log("emplhour_map: ", emplhour_map)
        if(!isEmpty(emplh_dict)){
            console.log("emplh_dict: ", emplh_dict)

            mod_upload_dict.map_id = map_id
            mod_upload_dict.rosterdate = get_dict_value(emplh_dict, ["rosterdate", "value"])

    // check if shift is absence or restshift
            mod_upload_dict.isabsence = get_dict_value(emplh_dict, ["id", "isabsence"], false)
            mod_upload_dict.isrestshift = get_dict_value(emplh_dict, ["id", "isrestshift"], false)

            mod_upload_dict.emplhour_pk =  get_dict_value(emplh_dict, ["id", "pk"], 0)
            mod_upload_dict.order_pk =  get_dict_value(emplh_dict, ["order", "pk"], 0)

            // get cur_employee from field employee in emplhour_map
            mod_upload_dict.cur_employee_pk =  get_dict_value(emplh_dict,["employee", "pk"]);
            mod_upload_dict.cur_employee_ppk =  get_dict_value(emplh_dict,["employee", "ppk"]);
            mod_upload_dict.cur_employee_code =  get_dict_value(emplh_dict,["employee", "code"]);

            mod_upload_dict.rosterdate = get_dict_value(emplh_dict, ["rosterdate", "value"]);
            mod_upload_dict.timestart_offset = get_dict_value(emplh_dict, ["timestart", "offset"]);
            mod_upload_dict.timeend_offset = get_dict_value(emplh_dict, ["timeend", "offset"]);
            mod_upload_dict.breakduration = get_dict_value(emplh_dict, ["breakduration", "value"]);
            mod_upload_dict.timesplit_offset = mod_upload_dict.timeend_offset;

            // default btn is 'absence' when there is a curemployee,
            // also when emplhour is_absence without employee: to be able to delete absence emplhour without employee
            // otherwise 'add_employee' otherwise
            mod_upload_dict.btn_select = (!!mod_upload_dict.cur_employee_pk || mod_upload_dict.isabsence) ? "mod_absence" : "add_employee"
            mod_upload_dict.is_add_employee = (mod_upload_dict.btn_select === "add_employee");

    // rest shift cannot open this form - skip when restshift
            if (!mod_upload_dict.isrestshift){
        // reset values in mod_employee
                el_MRE_input_employee.value = null

                el_MRE_select_abscat.value = mod_upload_dict.order_pk; // reset value must be empty string

                document.getElementById("id_modroster_employee_switch_date").innerText = null;
                document.getElementById("id_modroster_employee_select_shift").innerText = null;

                const display_offset = display_offset_time (mod_upload_dict.timesplit_offset,
                            loc.timeformat, loc.user_lang, false, false);
                document.getElementById("id_modroster_employee_split_time").innerText = display_offset;

        // put values in el_mod_employee_body
                const pk_int = get_dict_value(emplh_dict, ["id", "pk"])
                const table = "emplhour";
                const map_id = get_map_id(table, pk_int);
                //console.log("map_id:", map_id, typeof map_id);
                el_mod_employee_body.setAttribute("data-pk", pk_int);
                el_mod_employee_body.setAttribute("data-map_id", map_id);

                const header_text = (!!el_input.value) ?  el_input.value : loc.Select_employee + ":";
                document.getElementById("id_modroster_employee_header").innerText = header_text

        // fill select table employees, skip selected employee
                MRE_FillSelectTableEmployee(mod_upload_dict.cur_employee_pk)

        // change label 'replacement' to 'select_employee' if no employee, hide right panel
                let data_text = null;
                let el_body_right = document.getElementById("id_modroster_employee_body_right")
                if(!!mod_upload_dict.cur_employee_pk){
                    //el_body_right.classList.remove(cls_hide)
                    data_text = loc.Replacement_employee
                } else {
                    //el_body_right.classList.add(cls_hide)
                    data_text =  loc.Select_employee
                }
                let el_label_employee = document.getElementById("id_modroster_employee_label_employee")
                el_label_employee.innerText = data_text + ":"

        // set button when openong form: absence when cur_employee found, add_employee when no cur_employee
                MRE_btn_SelectAndDisable(mod_upload_dict.btn_select)

        // if 'add_employee': hide select_btns, Set focus to el_mod_employee_input

        console.log("mod_upload_dict.is_add_employee", mod_upload_dict.is_add_employee);
        console.log("mod_upload_dict.is_absence", mod_upload_dict.isabsence);
                //Timeout function necessary, otherwise focus wont work because of fade(300)
                if (mod_upload_dict.is_add_employee){
                    setTimeout(function (){el_MRE_input_employee.focus()}, 500);
                } else if (mod_upload_dict.btn_select === "mod_absence"){
                    setTimeout(function (){ el_MRE_select_abscat.focus()}, 500);
                }

        // ---  show modal
                $("#id_modroster_employee").modal({backdrop: true});

        console.log("end of MRE_Open mod_upload_dict", mod_upload_dict);
            }  // if (!mod_upload_dict.isrestshift)
        }  //   if(!isEmpty(emplh_dict))
    };  // MRE_Open

//=========  MRE_Save  ================ PR2019-06-23
    function MRE_Save(crud_mode) {
        // crud_mode = 'delete' when clicked on MRE delete btn. Delete absence emplhour or removes employee from emplhour
        // crud_mode = 'save' otherwise
        let btn_name = el_mod_employee_body.getAttribute("data-action");
        console.log("===  MRE_Save ========= crud_mode: ", crud_mode);
        console.log("mod_upload_dict", mod_upload_dict);

        const map_id = get_attr_from_el(el_mod_employee_body, "data-map_id");
        let emplhour_tblRow = document.getElementById(map_id);

        let emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, map_id);
        let id_dict = get_dict_value(emplhour_dict, ["id"])
        id_dict.mode = mod_upload_dict.btn_select
        id_dict.rowindex = emplhour_tblRow.rowIndex;
        console.log("crud_mode", crud_mode);
        console.log("mod_upload_dict.isabsence", mod_upload_dict.isabsence);

        let employee_dict = {};
        let abscat_dict = {};
        let split_dict = {};
        let switch_dict = {};
        let rosterdate_dict = {};
        let timeend_dict = {};
        if (crud_mode === "delete" && mod_upload_dict.isabsence){
            // delete emplhour row when mod=delete and is_absence
            // - add 'delete' to id_dict, dont add employee dict or abscat dict
            // - make tblRow red
            id_dict["delete"] = true
            let tr_changed = document.getElementById(mod_upload_dict.map_id);
            if(!!tr_changed){
                tr_changed.classList.add(cls_error);
                setTimeout(function (){
                    tr_changed.classList.remove(cls_error);
                    }, 2000);
            }
        } else {
            // when mod=delete: remove employee from emplhour
            if (crud_mode === "delete"){
                 employee_dict = {field: "employee", update: true};

                let tblRow = document.getElementById(mod_upload_dict.map_id);
                if(!!tblRow){
                    // field employee has cell_index = 3
                        let el_input = tblRow.cells[3].children[0];
                        if(!!el_input){
                    el_input.classList.add(cls_error);
                    setTimeout(function (){
                        el_input.classList.remove(cls_error);
                        }, 2000);
                        };  // if(!!el_input)
                }

            } else {
// get employee from select list
                // updates are only made when 'update' exists in field_dict:
                employee_dict = {field: "employee",
                                pk: mod_upload_dict.selected_employee_pk,
                                ppk: mod_upload_dict.selected_employee_ppk,
                                code: mod_upload_dict.selected_employee_code,
                                update: true};

                if (mod_upload_dict.btn_select === "mod_absence"){
                    console.log("mod_upload_dict.btn_select", mod_upload_dict.btn_select);
                   // when abcat kas no pk, the default abscat will be saved. abscat_dict = {} gives error.
                    abscat_dict = {table: "order", isabsence: true}
                // get absence category
                    let el_select_abscat = document.getElementById("id_modroster_employee_abscat")
                    if(el_select_abscat.selectedIndex > -1){
                        const selected_option = el_select_abscat.options[el_select_abscat.selectedIndex];
                        abscat_dict.pk = parseInt(el_select_abscat.value)
                        abscat_dict.ppk = get_attr_from_el_int(selected_option, "data-ppk");
                        abscat_dict.code = selected_option.text;
                    }

                } else if (mod_upload_dict.btn_select === "mod_split"){
                        split_dict = {timestart_offset: mod_upload_dict.timesplit_offset,
                                      timeend_offset: mod_upload_dict.timeend_offset,
                                      update: true}
                        rosterdate_dict = {value: mod_upload_dict.rosterdate};
                        // timeend_dict sets end time of current emplhour to timesplit_offset
                        timeend_dict = {value: mod_upload_dict.timesplit_offset,
                                      update: true}
                } else if (mod_upload_dict.btn_select === "mod_switchXX"){
                    let el_select_replacement = document.getElementById("id_modroster_employee_select_shift")
                    if(el_select_replacement.selectedIndex > -1){
                            switch_dict["rosterdate"] = get_attr_from_el(selected_option, "data-rosterdate");
                            switch_dict["employee_pk"] = get_attr_from_el_int(selected_option, "data-employee_pk");
                            switch_dict["reployee_pk"] = get_attr_from_el_int(selected_option, "data-reployee_pk");
                            switch_dict["si_pk"] = get_attr_from_el_int(selected_option, "data-si_pk");
                            switch_dict["team_pk"] = get_attr_from_el_int(selected_option, "data-team_pk");
                            switch_dict["tmmbr_pk"] = get_attr_from_el_int(selected_option, "data-tmmbr_pk");
                            switch_dict["eplh_pk"] = get_attr_from_el_int(selected_option, "data-eplh_pk");
                    }        let selected_option = el_select_replacement.options[el_select_replacement.selectedIndex];
                }
            }
        }

        $('#id_modroster_employee').modal('hide');

// field_dict gets info of selected employee
        let upload_dict = {"id": id_dict};
        if(!isEmpty(employee_dict)){upload_dict["employee"] = employee_dict};
        if(!isEmpty(abscat_dict)){upload_dict["abscat"] = abscat_dict};
        if(!isEmpty(switch_dict)){upload_dict["switch"] = switch_dict};
        if(!isEmpty(split_dict)){upload_dict["timesplit"] = split_dict};
        if(!isEmpty(rosterdate_dict)){upload_dict["rosterdate"] = rosterdate_dict};
        if(!isEmpty(timeend_dict)){upload_dict["timeend"] = timeend_dict};

        console.log ("url_emplhour_upload: ", url_emplhour_upload);
        console.log ("upload_dict: ", upload_dict);

        let parameters = {"upload": JSON.stringify (upload_dict)};
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
                if ("rosterdate" in response) {
                    ModRosterdateFinished(response["rosterdate"]);
                }
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });

    }  // MRE_Save

//========= MRE_btn_SelectAndDisable  ============= PR2020-02-20
    function MRE_btn_SelectAndDisable(selected_btn) {
        console.log( "=== MRE_btn_SelectAndDisable === ");

        // selected_btn:  mod_absence, mod_split, mod_switch
        mod_upload_dict.btn_select = selected_btn;

// ---  highlight selected button, disable when absence (restshift can't open this modal form)
        let btn_container = document.getElementById("id_modroster_btn_container");
        t_HighlightBtnSelect(btn_container, selected_btn, mod_upload_dict.isabsence);

// hide select buttons when is_absence and when is_add_employee
        let btn_container_label = document.getElementById("id_modroster_btn_container_label");
        const show_btns = (!mod_upload_dict.isabsence && !mod_upload_dict.is_add_employee)
        show_hide_element(btn_container_label, show_btns)
        show_hide_element(btn_container, show_btns)

// set text of delete button 'Delete employee', if absence: Delete absence
        el_MRE_btn_delete.innerText = (mod_upload_dict.isabsence) ? loc.Delete_absence : loc.Delete_employee;

// ---  show only the elements that are used in this selected_btn
        show_hide_selected_btn_elements("mod_show", selected_btn)

// ---  hide 'select employee' and 'input employee' only when isabsence (restshift can't open this modal form)
        show_hide_element_by_id("id_div_modroster_employee", !mod_upload_dict.isabsence);
        show_hide_element_by_id("id_modroster_div_select_employee", !mod_upload_dict.isabsence);

        let el_MRE_input_employee = document.getElementById("id_modroster_employee_input_employee")
        let el_MRE_label_employee = document.getElementById("id_modroster_employee_label_employee")

        switch (selected_btn) {
        case "mod_absence":
            el_MRE_label_employee.innerText = loc.Replacement_employee + ":"
            break;
        case "mod_switch":
            el_MRE_label_employee.innerText = loc.Employee_tobe_switched_with + ":"
            el_MRE_input_employee.focus()
            break;
        case "mod_split":
            el_MRE_label_employee.innerText =  loc.Replacement_employee + ":"
            el_MRE_input_employee.focus()
		}
    }  // MRE_btn_SelectAndDisable

//=========  MRE_TableEmployeeSelect  ================ PR2019-05-24
    function MRE_TableEmployeeSelect(tblRow) {
        console.log( "===== MRE_TableEmployeeSelect ========= ");
        console.log( "mod_upload_dict.btn_select: ", mod_upload_dict.btn_select);
    // ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)
    // ---  get clicked tablerow
        if(!!tblRow) {
    // ---  highlight clicked row
            tblRow.classList.add(cls_selected)
    // ---  get pk from id of select_tblRow
            mod_upload_dict.selected_employee_pk = get_datapk_from_element (tblRow)
            mod_upload_dict.selected_employee_ppk = get_datappk_from_element (tblRow)
            mod_upload_dict.selected_employee_code = get_attr_from_el(tblRow, "data-value");
            //  put selected employee in employee  input box
            el_MRE_input_employee.value = mod_upload_dict.selected_employee_code


            if (mod_upload_dict.btn_select === "add_employee" ) {
            // save immediately whenmode = 'add_employee'
                MRE_Save("save")
            } else if (mod_upload_dict.btn_select === "mod_absence" ) {
                 el_MRE_btn_save.focus()
            }


            // TODO put in MRE_Save with differenet parameter, put vartiables in mod_upload_dict
    // get shifts of switch employee
                //const datalist_request = {"replacement": { "action": mod_upload_dict.btn_select, "rosterdate": cur_rosterdate,
                //        "employee": cur_employee, "employee_pk": cur_employee_pk_int, "employee_ppk": cur_employee_ppk_int,
                //        "reployee": value, "reployee_pk": reployee_pk, "reployee_ppk": reployee_ppk}};
                //DatalistDownload(datalist_request);

        }
    }  // MRE_TableEmployeeSelect

//=========  MRE_InputEmployeeKeyup  ================ PR2019-05-26
    function MRE_InputEmployeeKeyup() {
        // function is called_by 'employee filter' and 'employee input'
        console.log( "===== MRE_InputEmployeeKeyup  ========= ");

        let new_filter = "";
        let skip_filter = false
        if (!!el_MRE_input_employee.value) {
            new_filter = el_MRE_input_employee.value
        }


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
            for (let row_index = 0, tblRow, row_value, show_row; row_index < len; row_index++) {
                tblRow = el_mod_employee_tblbody.rows[row_index];
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else {
                    row_value = get_attr_from_el(tblRow, "data-value");
                    if (!!row_value){
                        show_row = (row_value.toLowerCase().indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                    // put values from first selected row in select_value
                    if(!has_selection ) {
                        select_value = row_value;
                        select_pk = get_attr_from_el(tblRow, "data-pk");
                        select_parentpk = get_attr_from_el(tblRow, "data-ppk");
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {
        if (has_selection && !has_multiple ) {
            // if only one employee found: put in employee input box, and store in mod_upload_dict
            el_MRE_input_employee.value = select_value

            mod_upload_dict.selected_employee_pk = select_pk
            mod_upload_dict.selected_employee_ppk = select_parentpk
            mod_upload_dict.selected_employee_code = select_value

        // TODO get shifts if mode = switch
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
// Set focus to next input field or save button
            const id_str = (mod_upload_dict.btn_select === "mod_switch") ? "id_modroster_employee_switch_date" :
                           "id_modroster_employee_btn_save";
            document.getElementById(id_str).focus();
        }
    }; // function MRE_InputEmployeeKeyup

//========= MRE_FillSelectTableEmployee  ============= PR2019-08-18
    function MRE_FillSelectTableEmployee(selected_employee_pk) {
        // console.log( "=== MRE_FillSelectTableEmployee ");

        const caption_one = loc.Select_employee + ":";
        const caption_none = loc.No_employees + ":";

        let tableBody = el_mod_employee_tblbody
        tableBody.innerText = null;

//--- when no items found: show 'select_customer_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {
//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_dict_value(item_dict, ["id", "pk"], 0)
                const ppk_int = get_dict_value(item_dict, ["id", "ppk"], 0)
                const code_value = get_dict_value(item_dict, ["code", "value"], "")

//- skip selected employee
                if (pk_int !== selected_employee_pk){

//- insert tableBody row  //index -1 results in that the new row will be inserted at the last position.
                    let tblRow = tableBody.insertRow(-1);
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);
//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {MRE_TableEmployeeSelect(tblRow)}, false )
// - add first td to tblRow.
                    let td = tblRow.insertCell(-1);
// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected_employee_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  // if (employee_map.size === 0)
    } // MRE_FillSelectTableEmployee

//========= MRE_abscat_changed  ====================================
    function MRE_abscat_changed() {
        el_MRE_input_employee.focus()
    }  // MRE_abscat_changed


//=========  MRE_TimepickerOpen  ================ PR2019-10-12
    function MRE_TimepickerOpen(el_input, calledby) {
        console.log("=== MRE_TimepickerOpen ===", calledby);
        // only called by el_MRE_split_time

// ---  create st_dict
        const show_btn_delete = true;
        let st_dict = { interval: interval, comp_timezone: comp_timezone, user_lang: user_lang,
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete,
                        weekday_list: loc.weekdays_abbrev, month_list: loc.months_abbrev,
                        url_settings_upload: url_settings_upload};

        if(!!loc.btn_save){st_dict["txt_save"] = loc.btn_save};
        if(!!loc.Quick_save){st_dict["txt_quicksave"] = loc.Quick_save};
        if(!!loc.Exit_Quicksave){st_dict["txt_quicksave_remove"] = loc.Exit_Quicksave};

// ---  create tp_dict
        // minoffset = timestart_offset + breakduration
        let tp_dict = {field: "timesplit",
                        mod: calledby,
                        rosterdate: mod_upload_dict.rosterdate,
                        offset: mod_upload_dict.timesplit_offset,
                        minoffset: mod_upload_dict.timestart_offset + mod_upload_dict.breakduration,
                        maxoffset: mod_upload_dict.timeend_offset,
                        isampm: (timeformat === 'AmPm'),
                        quicksave: quicksave}
        console.log("tp_dict", tp_dict);

        ModTimepickerOpen(el_input, MRE_TimepickerResponse, tp_dict, st_dict)

    };  // MRE_TimepickerOpen

//========= MRE_TimepickerResponse  ============= PR2019-10-12
    function MRE_TimepickerResponse(tp_dict) {
        console.log(" === MRE_TimepickerResponse ===" );
        console.log("tp_dict", tp_dict);
        console.log("mod_upload_dict", mod_upload_dict);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};
        //console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = get_dict_value_by_key(tp_dict, "field")

     // ---  get new value from tp_dict
            const new_offset = get_dict_value(tp_dict, ["offset"])
            console.log( "new_offset: ", new_offset);

    // ---  put new value in variable
            let value_has_changed = (new_offset !== mod_upload_dict.timesplit_offset)

            if (value_has_changed){
                mod_upload_dict.timesplit_offset = new_offset;
                const display_offset = display_offset_time (mod_upload_dict.timesplit_offset,
                            loc.timeformat, loc.user_lang, false, false);
                document.getElementById("id_modroster_employee_split_time").innerText = display_offset;

    // set focus to save button
                setTimeout(function() { el_MRE_btn_save.focus()}, 50);
            }  // if (value_has_changed)
        }  // if("save_changes" in tp_dict) {
     }  //MRE_TimepickerResponse

//========= ModEmployeeFillOptionDates  ====================================
    function ModEmployeeFillOptionDates(replacement_dates) {
       // console.log( "=== ModEmployeeFillOptionDates  ");
        //console.log(replacement_dates);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }

// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0

        let el_select_date = document.getElementById("id_modroster_employee_switch_date")
        el_select_date.innerText = null

        document.getElementById("id_modroster_employee_select_shift").innerText = null

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
        const select_text_switch_date = loc.Select_date;
        const select_text_switch_dates_none = loc.Nodates_thatcanbe_switched;

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

        let el_select_shift = document.getElementById("id_modroster_employee_select_shift")
        el_select_shift.innerText = null

        // selected_rosterdate only has value when there is only one rosterdate (called by ModEmployeeFillOptionDates)
        // setfocus on select shift only after clicking date, ie when !selected_rosterdate
        let set_focus = false;
        if (!selected_rosterdate){
            selected_rosterdate = document.getElementById("id_modroster_employee_switch_date").value
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
                const rosterdate = get_dict_value(item_dict, ["rosterdate"])
                if (rosterdate === selected_rosterdate){
                    const cust_order_shift = get_dict_value(item_dict, ["cust_order_shift"])
                    const eplh_pk_str = get_dict_value(item_dict, ["eplh_pk"])
                    const reployee_pk_str = get_dict_value(item_dict, ["reployee_pk"])
                    const employee_pk_str = get_dict_value(item_dict, ["employee_pk"])
                    const team_pk_str = get_dict_value(item_dict, ["team_pk"])

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
        const select_text = loc.Select_shift;
        const select_text_none = loc.Noshifts_thatcanbe_switched;

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

// ##############################################  END MODROSTER EMPLOYEE  ############################################## PR2019-11-23

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
        console.log( "===== HandleFilterName  ========= ");

        //console.log( "el.value", el.value, index, typeof index);
        //console.log( "el.filter_dict", filter_dict, typeof filter_dict);
        // skip filter if filter value has not changed, update variable filter_text

        console.log( "el_key", el_key);


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
    function FillDatalistOrderXXXX() {
        //console.log( "===== FillDatalistOrder  ========= ");

        let el_datalist = document.getElementById("id_datalist_orders");
        el_datalist.innerText = null;


//--- loop through employee_map
        for (const [cust_map_id, cust_dict] of customer_map.entries()) {
            const cust_pk_int = get_pk_from_dict(cust_dict)
            const cust_cat = get_cat_from_dict(cust_dict);

            if (cust_cat < 512){  // SHIFT_CAT_0512_ABSENCE
                const cust_code = get_dict_value(cust_dict, ["code", "value"], "")
                for (const [ord_map_id, ord_dict] of order_map.entries()) {
                    const ord_pk_int = get_pk_from_dict(ord_dict)
                    const ord_ppk_int = get_ppk_from_dict(ord_dict)
                    if(ord_ppk_int === cust_pk_int){
                        const ord_code = get_dict_value (ord_dict, ["code", "value"], "")
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
        console.log("selected_roster_period", selected_roster_period) ;

        let el_modal = document.getElementById("id_mod_setting")
        let tBody = document.getElementById("id_mod_tbody_interval");

        tBody.removeAttribute("data-value");
        let interval = 0, overlap_prev = 0, overlap_next = 0;
        if (!isEmpty(selected_roster_period)){
            interval = get_dict_value(selected_roster_period, ["interval"], 0)
            overlap_prev = get_dict_value(selected_roster_period, ["overlap_prev"], 0)
            overlap_next = get_dict_value(selected_roster_period, ["overlap_next"], 0)
        }  //  if (!isEmpty(selected_roster_period))

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

//###########################################################################
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        console.log("===  HandlePopupDateOpen  =====") ;
        console.log("el_input", el_input) ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

//--- get pk etc from el_input, date can olny be entered in add_new_mode, teherfeore there is no map_item

        const tblRow = get_tablerow_selected(el_input)
        let pk_str = get_attr_from_el(tblRow, "data-pk");
        let tblName = get_attr_from_el(tblRow, "data-table") ;

        console.log("pk_str", pk_str, "tblName", tblName) ;

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");
        const data_value = get_attr_from_el(el_input, "data-value");
        const data_mindate = get_attr_from_el(el_input, "data-mindate");
        const data_maxdate = get_attr_from_el(el_input, "data-maxdate");

// put values in id_popup_date
        el_popup_date.setAttribute("data-pk", pk_str);
        el_popup_date.setAttribute("data-field", data_field);
        el_popup_date.setAttribute("data-value", data_value);
        el_popup_date.setAttribute("data-table", tblName);

        if (!!data_mindate) {el_popup_date.setAttribute("min", data_mindate);
        } else {el_popup_date.removeAttribute("min")}
        if (!!data_maxdate) {el_popup_date.setAttribute("max", data_maxdate);
        } else {el_popup_date.removeAttribute("max")}

        if (!!data_value){el_popup_date.value = data_value};

// ---  position popup under el_input
        let popRect = el_popup_date_container.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();
        const offset = [-240,-32 ]  // x = -240 because of sidebar, y = -32 because of menubar
        const pop_width = 0; // to center popup under input box
        const correction_left = offset[0] - pop_width/2 ;
        const correction_top =  offset[1];
        let topPos = inpRect.top + inpRect.height + correction_top;
        let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup_date_container.setAttribute("style", msgAttr)

// ---  show el_popup
        el_popup_date_container.classList.remove(cls_hide);

    }; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-04-14
    function HandlePopupDateSave() {
        console.log("===  function HandlePopupDateSave =========");
        console.log(el_popup_date);
// ---  get pk_str and fieldname from el_popup
        const pk_str = el_popup_date.getAttribute("data-pk");
        const fieldname = el_popup_date.getAttribute("data-field");
        const data_value = el_popup_date.getAttribute("data-value");
        const tblName = el_popup_date.getAttribute("data-table");
        const value = el_popup_date.value;

        console.log("tblName: ", tblName);
        console.log("fieldname: ", fieldname);
        console.log("data_value: ", data_value);
        console.log("value: ", value);


// ---  get item_dict from employee_map
        const data_map = (tblName === "employee") ? employee_map :
                         (tblName === "teammember") ? teammember_map : null
        const item_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);
        const pk_int = get_pk_from_dict(item_dict)
        const ppk_int = get_ppk_from_dict(item_dict)

        el_popup_date_container.classList.add(cls_hide);

        if(!!pk_int && !! ppk_int){
            let id_dict = {pk: pk_int, ppk: ppk_int, table: tblName} //  , mode: data_mode}

            const new_value = el_popup_date.value
            if (new_value !== data_value) {
                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {update: true}
                if(!!new_value){field_dict["value"] = new_value};
                let upload_dict = {id: id_dict}
                upload_dict[fieldname] = field_dict;

// put new value in inputbox before new value is back from server
                const map_id = get_map_id(tblName, pk_str);
                console.log("map_id", map_id);
                let tr_changed = document.getElementById(map_id);

                // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safari,
                        // CSS.escape is not necessary, there are no special characters in fieldname
                let el_input = tr_changed.querySelector("[data-field=" + fieldname + "]");
                if (!!el_input){
                    console.log("el_input", el_input);
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, hide_weekday, hide_year)
                }

                const url_str = (["employee", "form"].indexOf(selected_btn) > -1) ?
                                url_employee_upload : url_teammember_upload;
                const parameters = {"upload": JSON.stringify (upload_dict)}
                console.log("url_str: ", url_str);
                console.log ("upload_dict", upload_dict);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response", response);
                        if ("update_list" in response) {
                            for (let i = 0, len = response["update_list"].length; i < len; i++) {
                                const update_dict = response["update_list"][i];
                                UpdateFromResponse(update_dict);
                            }
                        }
                        if ("teammember_update" in response) {
                            UpdateFromResponse(response["teammember_update"]);
                        }

                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)

            setTimeout(function() {
                el_popup_date_container.classList.add(cls_hide);
            }, 2000);


        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave


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
        let elements = document.getElementsByClassName("el_input");
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
    function HandlePopupDateSaveXXX() {
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

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen====================================
    function ModPeriodOpen () {
        console.log("===  ModPeriodOpen  =====") ;
        console.log("selected_roster_period", selected_roster_period) ;

        // selected_roster_period = {page: "period_roster", period_tag: "tweek", extend_offset: 0,
        // now: (5) [2019, 11, 20, 7, 29],
        // periodend: "2019-11-25T00:00:00+01:00", periodstart: "2019-11-18T00:00:00+01:00",
        // rosterdatefirst: "2019-11-18", rosterdatefirst_minus1: "2019-11-17",
        // rosterdatelast: "2019-11-24", rosterdatelast_plus1: "2019-11-25"}

        mod_upload_dict = selected_roster_period;

    // highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value(selected_roster_period, ["period_tag"])
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };

    // set value of date imput elements
        const is_custom_period = (period_tag === "other")
        let el_datefirst = document.getElementById("id_mod_period_datefirst")
        let el_datelast = document.getElementById("id_mod_period_datelast")
        el_datefirst.value = get_dict_value(selected_roster_period, ["period_datefirst"])
        el_datelast.value = get_dict_value(selected_roster_period, ["period_datelast"])

    // set min max of input fields
        ModPeriodDateChanged("datefirst");
        ModPeriodDateChanged("datelast");

        el_datefirst.disabled = !is_custom_period
        el_datelast.disabled = !is_custom_period

    // set value of extend period input box
        const extend_offset = get_dict_value(selected_roster_period, ["extend_offset"], 0)
        let el_extend = document.getElementById("id_mod_period_extend")
        for (let i = 0, option, value; i < el_extend.options.length; i++) {
            value = Number(el_extend.options[i].value);
            if (value === extend_offset) {
                el_extend.options[i].selected = true;
                break;
            }
        }
    // show extend period input box
        document.getElementById("id_mod_period_div_extend").classList.remove(cls_hide)

    // ---  show modal
        $("#id_mod_period").modal({backdrop: true});

}; // function ModPeriodOpen

//=========  ModPeriodSelectOrder  ================ PR2020-01-09
    function ModPeriodSelectOrder(selected_pk_str) {
        //console.log( "===== ModPeriodSelectOrder ========= ");
        //console.log( "selected_pk_str: ", selected_pk_str);

        selected_order_pk = Number(selected_pk_str)
        //console.log( "selected_order_pk: ", selected_order_pk);

    }  // ModPeriodSelectOrder


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
                //el_datefirst.value = mod_upload_dict.period_datefirst;
                //el_datelast.value = mod_upload_dict.period_datelast;
                el_datefirst.disabled = false;
                el_datelast.disabled = false;
                el_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelect

//=========  ModPeriodDateChanged  ================ PR2019-07-14
    function ModPeriodDateChanged(fldName) {
        console.log("ModPeriodDateChanged");
    // set min max of other input field
    // TODO not working
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        } else { el_other.removeAttribute(attr_key) };
    }  // ModPeriodDateChanged

//=========  ModPeriodSave  ================ PR2019-07-11
    function ModPeriodSave() {
        console.log("===  ModPeriodSave =========");

        const period_tag = get_dict_value(mod_upload_dict, ["period_tag"], "today")
        const extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        if(extend_index < 0 ){extend_index = 0}
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;

        mod_upload_dict = {
            page: "roster",
            period_tag: period_tag,
            extend_index: extend_index,
            extend_offset: extend_offset};
        //console.log("new mod_upload_dict:", mod_upload_dict);

        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {mod_upload_dict.period_datefirst = datefirst};
            if (!!datelast) {mod_upload_dict.period_datelast = datelast};
        }

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]
        mod_upload_dict.now = now_arr;

// ---  upload new setting
        let emplhour_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_empty_shifts: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };
        document.getElementById("id_hdr_period").innerText = loc.Period + "..."

        let datalist_request = {roster_period: mod_upload_dict,
                                emplhour: emplhour_dict
        };
        DatalistDownload(datalist_request);

// hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

//========= DisplayPeriod  ====================================
    function DisplayPeriod(selected_roster_period) {
        console.log( "===== DisplayPeriod  ========= ");

        if (!isEmpty(selected_roster_period)){
            const period_tag = get_dict_value(selected_roster_period, ["period_tag"]);
            const extend_offset = get_dict_value(selected_roster_period, ["extend_offset"], 0);

            let period_text = null, default_text = null
            for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                item = loc.period_select_list[i];
                if (item[0] === period_tag){ period_text = item[1] }
                if (item[0] === 'today'){ default_text = item[1] }
            }
            if(!period_text){period_text = default_text}

            let extend_text = null, extend_default_text = null
            for(let i = 0, item, len = loc.period_extension.length; i < len; i++){
                item = loc.period_extension[i];
                if (item[0] === extend_offset){ extend_text = item[1] }
                if (item[0] === 0){ extend_default_text = item[1] }
            }
            if(!extend_text){extend_text = extend_default_text}

            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value(selected_roster_period, ["period_datefirst"]);
                const rosterdatelast = get_dict_value(selected_roster_period, ["period_datelast"]);
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
            // put period_textx in sidebar id_sidebar_select_period
            document.getElementById("id_sidebar_select_period").value = period_text

            selected_customer_pk = get_dict_value(selected_roster_period, ["customer_pk"], 0)
            selected_order_pk = get_dict_value(selected_roster_period, ["order_pk"], 0)
            selected_employee_pk = get_dict_value(selected_roster_period, ["employee_pk"], 0)
            selected_isabsence = get_dict_value(selected_roster_period, ["isabsence"]) //  can have value null, false or true

            // put text in header of this page
            const display_period = get_dict_value(selected_roster_period, ["period_display"], "")
            document.getElementById("id_hdr_period").innerText = display_period

            //console.log( "mod_upload_dict");
            //console.log(  mod_upload_dict);
            //el_sidebar_select_absence.value = absence_txt

            let header_text = null, absence_text = null;
            if(!!selected_customer_pk){
                const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
                const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
                let order_code = null;
                if(!!selected_order_pk){
                    const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk)
                    order_code = get_dict_value(order_dict, ["code", "value"]);
                } else {
                    order_code = loc.All_orders.toLowerCase()
                }
                header_text = customer_code + " - " + order_code
            // if customer is selected: always show 'Without_absence'
                absence_text = loc.Without_absence;
            } else {
                if (selected_isabsence === true){
                    // in this case customer box must show 'No customer
                    header_text = loc.No_customers
                    // absence only
                    absence_text = loc.Show_absence_only;
                } else if (selected_isabsence === false){
                    header_text = loc.All_customers
                    absence_text = loc.Without_absence;
                } else {
                   header_text = loc.All_customers
                    // Absence_included only when 'All_customers'
                    absence_text = loc.Absence_included;
                }
            }
            el_sidebar_select_customer.value = header_text
            el_sidebar_select_absence.value = absence_text

        }  // if (!isEmpty(selected_roster_period))

    }; // function DisplayPeriod


// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= ModSelectOrder_Open ====================================  PR2019-11-16
    function ModSelectOrder_Open (mode) {
        //console.log(" ===  ModSelectOrder_Open  =====") ;
        //console.log("selected_roster_period", selected_roster_period) ;
        // selected_roster_period = {extend_index: 2, extend_offset: 120, period_index: null, periodend: null,
        //                periodstart: null, rosterdatefirst: "2019-11-15", rosterdatelast: "2019-11-17"

        let customer_pk = (selected_customer_pk > 0) ? selected_customer_pk : null;
        let order_pk = (selected_order_pk > 0) ? selected_order_pk : null;
        let employee_pk = (selected_employee_pk > 0) ? selected_employee_pk : null;
        let is_absence =  selected_isabsence;

        if (mode === "mod_absence") {
            // reset customer_pk to "all customers", to show select box absence
            customer_pk = 0;
            order_pk = 0;
        }

        mod_upload_dict = {page: "roster",
                           customer_pk: customer_pk,
                           order_pk: order_pk,
                           employee_pk: employee_pk,
                           is_absence: is_absence};

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");
        let tblHead = document.getElementById("id_modorder_thead_customer");

        // reset el_modorder_input_customer and filter_customer
        filter_mod_customer = ""
        el_modorder_input_customer.innerText = null;

        const filter_ppk_int = null, filter_include_inactive = true, addall_to_list_txt = "<" + loc.All_customers + ">";
        fFill_SelectTable(tblBody_select_customer, tblHead, customer_map, "customer", selected_customer_pk, null,
            HandleSelect_Filter, null,
            ModSelectOrder_SelectCustomer,  null,
            filter_ppk_int, filter_include_inactive, addall_to_list_txt,
            null, cls_selected
            );

        ModSelectOrder_FillOptionsAbsence()

        if (mode === "mod_absence") {
            let tblRow = tblBody_select_customer.rows[0];
            ModSelectOrder_SelectCustomer(tblRow);
        }
        ModSelectOrder_headertext(mod_upload_dict);

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_modorder_input_customer.focus()
        }, 500);


    // ---  show modal
         $("#id_modselectorder").modal({backdrop: true});

}; // ModSelectOrder_Open

//=========  ModSelectOrder_Save  ================ PR2020-01-29
    function ModSelectOrder_Save() {
        //console.log("===  ModSelectOrder_Save =========");

        // mod_upload_dict is reset in ModSelectOrder_Open

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

// ---  upload new setting
        const emplhour_dict = {
            add_empty_shifts: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };
        const roster_period_dict = {
            get: true,
            now: now_arr,
            customer_pk: mod_upload_dict.customer_pk,
            order_pk: mod_upload_dict.order_pk,
            employee_pk: mod_upload_dict.employee_pk,
            isabsence: mod_upload_dict.isabsence,
            isrestshift: mod_upload_dict.isabsence // also shoiw/hide restshifts with absence
        }

        document.getElementById("id_hdr_period").innerText = loc.Period + "..."

        let datalist_request = {roster_period: roster_period_dict,
                                emplhour: emplhour_dict};
        DatalistDownload(datalist_request);

// hide modal
        $("#id_modselectorder").modal("hide");

    }  // ModSelectOrder_Save

//=========  ModSelectOrder_SelectCustomer  ================ PR2020-01-09
    function ModSelectOrder_SelectCustomer(tblRow) {
        //console.log( "===== ModSelectOrder_SelectCustomer ========= ");
        //console.log( tblRow);
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(!!tblRow) {

// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)

// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// ---  get pk from id of select_tblRow
            let data__pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data__pk)){
                if(data__pk === "addall" ) {
                    mod_upload_dict.customer_pk = 0;
                    mod_upload_dict.order_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_customer_pk){
                    mod_upload_dict.customer_pk = pk_int;
                    mod_upload_dict.order_pk = 0;
                }
            }

// ---  put value in input box
            el_modorder_input_customer.value = get_attr_from_el(tblRow, "data-value", "")

            ModSelectOrder_FillSelectOrder();
            ModSelectOrder_headertext(mod_upload_dict);
        }
    }  // ModSelectOrder_SelectCustomer

//=========  ModSelectOrder_FillSelectOrder  ================ PR2020-02-07
    function ModSelectOrder_FillSelectOrder() {
        //console.log( "===== ModSelectOrder_FillSelectOrder ========= ");

        let el_div_order = document.getElementById("id_modorder_div_tblbody_order")
        let el_div_absence = document.getElementById("id_modorder_div_select_absence")
        let tblBody_select_order = document.getElementById("id_modorder_tblbody_order");

        if (!mod_upload_dict.customer_pk){
            el_div_order.classList.add(cls_hide)
            tblBody_select_order.innerText = null;
            el_div_absence.classList.remove(cls_hide)
        } else {
            el_div_order.classList.remove(cls_hide)
            el_div_absence.classList.add(cls_hide)
            let tblHead = null;
            const filter_ppk_int = mod_upload_dict.customer_pk, filter_include_inactive = true;
            const addall_to_list_txt = "<" + loc.All_orders + ">";
            fFill_SelectTable(tblBody_select_order, null, order_map, "order", mod_upload_dict.customer_pk, null,
                HandleSelect_Filter, null,
                ModSelectOrder_SelectOrder, null,
                filter_ppk_int, filter_include_inactive, addall_to_list_txt,
                null, cls_selected
            );
    // select first tblRow
            if(!!tblBody_select_order.rows.length) {
                let firstRow = tblBody_select_order.rows[0];
                ModSelectOrder_SelectOrder(firstRow);
            }
        }
    }  // ModSelectOrder_FillSelectOrder

//=========  ModSelectOrder_SelectOrder  ================ PR2020-01-09
    function ModSelectOrder_SelectOrder(tblRow) {
        //console.log( "===== ModSelectOrder_SelectOrder ========= ");

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");

// ---  get pk from id of select_tblRow
            let order_pk = get_attr_from_el(tblRow, "data-pk")

            if(order_pk === "addall"){
                mod_upload_dict.order_pk = 0;
            } else {
                mod_upload_dict.order_pk = order_pk;
            }

// ---  get pk from id of select_tblRow
            let data__pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data__pk)){
                if(data__pk === "addall" ) {
                    mod_upload_dict.order_pk = 0;
                }
            } else {
                mod_upload_dict.order_pk = Number(data__pk)
            }

            ModSelectOrder_headertext(mod_upload_dict);
        }
    }  // ModSelectOrder_SelectOrder

//=========  ModSelectOrder_SelectAbsence  ================ PR2020-01-09
    function ModSelectOrder_SelectAbsence(el_select) {
        //console.log( "===== ModSelectOrder_SelectAbsence ========= ");

// ---  get clicked tablerow
        if(!!el_select) {
            let selected_option_str = Number(el_select.options[el_select.selectedIndex].value);
            //console.log(  "selected_option_str: ", selected_option_str, typeof selected_option_str);

            if (selected_option_str === 2) {
                 mod_upload_dict.isabsence = true
            } else if (selected_option_str === 1) {
                mod_upload_dict.isabsence = false
            } else {
                mod_upload_dict.isabsence = null
            }

            //console.log(  "mod_upload_dict: ", mod_upload_dict);
            ModSelectOrder_headertext(mod_upload_dict);
        }
    }  // ModSelectOrder_SelectAbsence

//=========  ModSelectOrder_FilterCustomer  ================ PR2020-01-28
    function ModSelectOrder_FilterCustomer() {
        //console.log( "===== ModSelectOrder_FilterCustomer  ========= ");

        let new_filter = "";
        let skip_filter = false

        if (!!el_modorder_input_customer.value) {
            new_filter = el_modorder_input_customer.value
        }

 // skip filter if filter value has not changed, update variable filter_mod_customer
        if (!new_filter){
            if (!filter_mod_customer){
                skip_filter = true
            } else {
                filter_mod_customer = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_customer) {
                skip_filter = true
            } else {
                filter_mod_customer = new_filter.toLowerCase();
            }
        }

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");
        const len = tblBody_select_customer.rows.length;
        if (!skip_filter && !!len){
// ---  filter select_customer rows
            const filter_dict = fFilter_SelectRows(tblBody_select_customer, filter_mod_customer);

// ---  if filter results have only one customer: put selected customer in el_modorder_input_customer
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modorder_input_customer.value = get_dict_value(filter_dict, ["selected_value"])

// ---  put pk of selected customer in mod_upload_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_upload_dict.customer_pk = 0;
                        mod_upload_dict.order_pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_customer_pk){
                        mod_upload_dict.customer_pk = pk_int;
                        mod_upload_dict.order_pk = 0;
                    }
                }

                ModSelectOrder_FillSelectOrder();
                ModSelectOrder_headertext(mod_upload_dict);

// ---  Set focus to btn_save
                el_modorder_btn_save.focus()
            }
        }
    }; // ModSelectOrder_FilterCustomer

    function ModSelectOrder_headertext(mod_upload_dict) {
        //console.log( "=== ModSelectOrder_headertext  ");
        //console.log(  mod_upload_dict);
        let header_text = null;

        if(!!mod_upload_dict.customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", mod_upload_dict.customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!mod_upload_dict.order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_upload_dict.order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
            if (mod_upload_dict.isabsence === true){
                header_text = loc.Show_absence_only
            } else if (mod_upload_dict.isabsence === false){
                header_text = loc.All_customers + " (" + loc.Dont_show_absence.toLowerCase() + ")";
            } else {
                header_text = loc.All_customers + ", " + loc.Absence_included.toLowerCase();
            }
        }

        document.getElementById("id_modorder_header").innerText = header_text

    }  // ModSelectOrder_headertext

//========= ModSelectOrder_FillOptionsAbsence  ==================================== PR2020-01-29
    function ModSelectOrder_FillOptionsAbsence() {
        //console.log( "=== ModSelectOrder_FillOptionsAbsence  ");

// ---  fill options of select box
        let curOption = 0
        if (selected_isabsence === true){
            curOption = 2
        } else if (selected_isabsence === false){
            curOption = 1
        }

// --- loop through option list
        const option_list = [loc.Also_show_absence,
                             loc.Dont_show_absence,
                             loc.Show_absence_only]
        let option_text = "";
        for (let i = 0, len = option_list.length; i < len; i++) {
            option_text += "<option value=\"" + i.toString() + "\"";
            if (i === curOption) {option_text += " selected=true" };
            option_text +=  ">" + option_list[i] + "</option>";
        }  // for (let i = 0, len = option_list.length;
        el_modorder_select_absence.innerHTML = option_text;

    }  // ModSelectOrder_FillOptionsAbsence
// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

//=========  ModOrderSelectCustomer  ================  PR2019-11-16
    function ModOrderSelectCustomerXXX(tr_clicked, selected_index) {
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
    function ModOrderSaveXXX() {
        //console.log("===  ModOrderSave =========");

        selected_roster_period = {}

        const tblBody = document.getElementById("id_modperiod_selectperiod_tblbody")
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
                selected_roster_period["periodstart"] = datefirst;
                selected_roster_period["periodend"] = datelast;

                selected_roster_period["period_index"] = 0;
            }
        } else {
            selected_roster_period["period_index"] = period_index;
        }

        selected_roster_period["extend_index"] = extend_index;
        selected_roster_period["extend_offset"] = extend_offset;
// hide modal
        $("#id_modselectorder").modal("hide");

        DatalistDownload({"roster_period": selected_roster_period});

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

// get status from field status, not from confirm start/end
        const status_sum = get_dict_value(item_dict, ["status", "value"])
        //console.log("status_sum", status_sum, typeof status_sum)

        let btn_save_text = "Confirm";
        let time_label = "Time:"
        let time_col_index = 0
        let is_field_status = false;

        // STATUS_01_CREATED = 1
        // STATUS_02_START_CONFIRMED = 2
        // STATUS_04_END_CONFIRMED = 4
        // STATUS_08_LOCKED = 8
        // STATUS_16_QUESTION = 16

        const allow_lock_status = (status_sum < 16)  // STATUS_16_QUESTION = 16
        const status_locked = status_found_in_statussum(8, status_sum)
        const fieldname = (data_field === "confirmstart") ? "timestart" : "timeend"
        const field_dict = get_dict_value(item_dict, [fieldname])
            const field_is_locked = ("locked" in field_dict)
            const field_is_confirmed = ("confirmed" in field_dict)
            const has_overlap = ("overlap" in field_dict)
        const has_no_employee = (!get_dict_value(item_dict, ["employee", "pk"]))
        const has_no_order = (!get_dict_value(item_dict, ["orderhour", "ppk"]))

        //console.log("allow_lock_status", allow_lock_status)
        //console.log("status_locked", status_locked)

        mod_upload_dict = {id: id_dict,
                            fieldname: fieldname,
                            locked: field_is_locked,
                            confirmed: field_is_confirmed}
        //console.log("mod_upload_dict", mod_upload_dict)

        let header_text = null;
        if (data_field === "confirmstart") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_start_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;
            time_label = "Start time:"
            time_col_index = 4
        } else if (data_field === "confirmend") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_end_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;
            time_label = "End time:"
            time_col_index = 6
        } else if (data_field === "status") {
            is_field_status = true;

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
        //console.log("is_field_status", is_field_status)
        //console.log("field_is_locked", field_is_locked)
        //console.log("has_overlap", has_overlap)
        //console.log("has_no_employee", has_no_employee)
        //console.log("field_is_confirmed", field_is_confirmed)

// don't open modal when locked and confirmstart / confirmend
        let allow_open = false;
        if (is_field_status){
            // status field cabn always be opened TODO add user permission
            allow_open = true;
        } else {
            // cannot open when field is locked
            if (!field_is_locked){
                // when field is not confirmed: can only confirm when has employee and has no overlap:
                //TODO add user permission
                if (!field_is_confirmed && !has_overlap) {
                    allow_open = true;
                } else {
                // when field is not confirmed: can undo, also when has_overlap or has_no_employee (in case not allowing confirmation has gone wrong)
                    allow_open = true;
                }
            }
        }

        if (allow_open) {
// put values in el_body
            let el_body = document.getElementById("id_mod_status_body")
            el_body.setAttribute("data-table", get_dict_value(id_dict, ["table"]));
            el_body.setAttribute("data-pk", get_dict_value(id_dict, ["pk"]));
            el_body.setAttribute("data-ppk", get_dict_value(id_dict, ["ppk"]));
            el_body.setAttribute("data-field", data_field);
            el_body.setAttribute("data-value", status_sum);
            el_body.setAttribute("data-confirmed", field_is_confirmed);

            document.getElementById("id_mod_status_header").innerText = header_text
            document.getElementById("id_mod_status_time_label").innerText = time_label

            const customer_order_code = get_dict_value(item_dict, ["orderhour", "code"])
            document.getElementById("id_mod_status_order").innerText = customer_order_code;

            const employee_code = get_dict_value(item_dict, ["employee", "code"])
            document.getElementById("id_mod_status_employee").innerText = employee_code;

            const shift = tr_selected.cells[2].firstChild.value
            let el_shift = document.getElementById("id_mod_status_shift");
            if(!!shift){el_shift.innerText = shift} else {el_shift.innerText = null};

            const el_time_col = tr_selected.cells[time_col_index].firstChild
            const time_display =el_time_col.value;

            let el_mod_status_time = document.getElementById("id_mod_status_time");
            el_mod_status_time.innerText = (!!time_display) ? time_display : null;

            let field_text = null;
            if(has_no_order){
                field_text = loc.an_order;
            } else if(has_no_employee && !is_field_status){
                field_text = loc.an_employee;
            } else if(!time_display && !is_field_status){
                field_text = (fieldname === "timestart") ? loc.a_starttime : loc.an_endtime;
            }

            if (allow_lock_status && !field_text) {
    // ---  show modal
                $("#id_mod_status").modal({backdrop: true});
            } else {
// ---  show modal confirm with message 'First select employee'
                document.getElementById("id_confirm_header").innerText = loc.Confirm + " " + loc.Shift.toLowerCase();
                document.getElementById("id_confirm_msg01").innerText = loc.err_confirm_01 + field_text + loc.err_confirm_02;
                document.getElementById("id_confirm_msg02").innerText = null;
                document.getElementById("id_confirm_msg03").innerText = null;

                let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
                el_btn_cancel.classList.add(cls_hide)
                let el_btn_save = document.getElementById("id_confirm_btn_save");
                el_btn_save.innerText = loc.Close;
                setTimeout(function() {el_btn_save.focus()}, 50);

                 $("#id_mod_confirm").modal({backdrop: true});
             }  // if (allow_lock_status) || (!field_text) {
        };  // if (allow_open) {
    }; // function ModalStatusOpen

//=========  ModalStatusSave  ================ PR2019-07-11
    function ModalStatusSave() {
        //console.log("===  ModalStatusSave =========");

        // put values in el_body
        let el_body = document.getElementById("id_mod_status_body")
        const tblName = get_attr_from_el(el_body, "data-table")
        const data_ppk = get_attr_from_el(el_body, "data-ppk")
        const data_field = get_attr_from_el(el_body, "data-field")
        const field_is_confirmed = (get_attr_from_el(el_body, "data-confirmed", false) === "true")
        const status_value = get_attr_from_el_int(el_body, "data-value")

        //console.log("el_body: ", el_body);
        //console.log("field_is_confirmed: ", field_is_confirmed);
        //console.log("data_field: ", data_field);

        const data_pk = get_attr_from_el(el_body, "data-pk")
        let tr_changed = document.getElementById(data_pk)

        const id_dict = get_iddict_from_element(el_body);;
        let upload_dict = {"id": id_dict}

        //console.log("---------------status_value: ", status_value);
        //console.log("---------------data_field: ", data_field);
        //console.log("---------------field_is_confirmed: ", field_is_confirmed, typeof field_is_confirmed);
        let status_dict = {};
        if(data_field === "confirmstart"){
            if (field_is_confirmed) {
                status_dict = {"value": 2, "remove": true, "update": true}  // STATUS_02_START_CONFIRMED = 2
                //console.log("confirmstart field_is_confirmed ", status_dict);
            } else {
                status_dict = {"value": 2, "update": true}  // STATUS_02_START_CONFIRMED = 2
                //console.log("confirmstart field_is_NOT confirmed ", status_dict);
            }
        } else if(data_field === "confirmend"){
            if (field_is_confirmed) {
                 status_dict = {"value": 4, "remove": true, "update": true}  // STATUS_04_END_CONFIRMED = 4
                //console.log("confirmend field_is_confirmed ", status_dict);
            } else {
                 status_dict = {"value": 4, "update": true}  // STATUS_04_END_CONFIRMED = 4
                //console.log("confirmend field_is_NOT_confirmed ", status_dict);
            }
        } else if(data_field === "status"){
            if(status_value >= 8){
                status_dict = {"value": 8, "remove": true, "update": true}  // STATUS_08_LOCKED = 8
                //console.log("status status_value >= 8 ", status_dict);
            } else {
                status_dict = {"value": 8, "update": true}   // STATUS_08_LOCKED = 8
                //console.log("status status_value < 8 ", status_dict);
            }
        }
        //console.log("---------------status_dict: ", status_dict);
        upload_dict["status"] = status_dict

        $("#id_mod_status").modal("hide");

        if(!!upload_dict) {
            //console.log( "upload_dict", upload_dict);
            let parameters = {"upload": JSON.stringify(upload_dict)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);

                    if ("update_list" in response) {
                        let update_list = response["update_list"];
                        UpdateFromResponseNEW(tblName, update_list)
                    }


                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_dict_value (item_dict, ["id", "table"], "")

                        UpdateTableRow("emplhour", tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_dict_value (item_dict, ["id", "created"], false)
                        if (is_created){
// add new empty row
                    //console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new" + id_new.toString()
                            const parent_pk = get_ppk_from_dict (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "temp_pk": pk_new}

                            if (tblName === "teammembers"){
                                const team_code = get_dict_value (item_dict, ["team", "value"])
                                new_dict["team"] = {"pk": parent_pk, "value": team_code}
                            }
                            // row_index = -1 (add to end), is_new_item = true
                            let tblRow = CreateTblRow(pk_new, parent_pk, -1, true)

                        //console.log("<<< UpdateTableRow <<<");
                            UpdateTableRow("emplhour", tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    }  // ModalStatusSave



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
        if(!!selected_roster_period){

            let mode = get_dict_value(selected_roster_period, ["mode"])

            if(mode === "current"){
                let update = false;
                let iso, diff, period_timestart_utc, period_timeend_utc
                iso = get_dict_value(selected_roster_period, ["periodstart"])
                if (!!iso){period_timestart_utc = moment.utc(iso)}
                diff = now_utc.diff(period_timestart_utc);
                // console.log("now: ", now_utc.format(), "start ", period_timestart_utc.format(), "diff ", diff);
                update = (diff < 0)
                if(!update){
                    iso = get_dict_value(selected_roster_period, ["periodend"])
                    if (!!iso){period_timeend_utc = moment.utc(iso)};
                    diff = now_utc.diff(period_timeend_utc);
                    // console.log("now: ", now_utc.format(), "end ", period_timeend_utc.format(), "diff ", diff);
                    update = (diff > 0)
                }
                //if (update) {ModPeriodSave("current")}
             }
               //  if(mode === 'current')
        }  // if(!!selected_roster_period){

// --- loop through tBody_roster.rows
        let len =  tBody_roster.rows.length;
        if (!!len){
            for (let row_index = 0, tblRow; row_index < len; row_index++) {
                tblRow = tBody_roster.rows[row_index];

                let item_dict = get_itemdict_from_datamap_by_tblRow(tblRow, emplhour_map);

                const status_sum = get_dict_value(item_dict, ["status", "value"])
                const start_confirmed = status_found_in_statussum(2, status_sum);//STATUS_02_START_CONFIRMED
                const end_confirmed = status_found_in_statussum(4, status_sum);//STATUS_04_END_CONFIRMED
                const status_locked = (status_sum >= 8) //STATUS_08_LOCKED = 8

                let img_src = imgsrc_stat00
                const timestart_iso = get_dict_value(item_dict, ["timestart", "datetime"])
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
                const timeend_iso = get_dict_value(item_dict, ["timeend", "datetime"])
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

//========= HandleSelect_Filter  ====================================
    function HandleSelect_Filter() {
        //console.log( "===== HandleSelect_Filter  ========= ");
        // skip filter if filter value has not changed, update variable filter_select

        let new_filter = document.getElementById("id_filter_select_input").value;

        let skip_filter = false
        if (!new_filter){
            if (!filter_select){
                skip_filter = true
            } else {
                filter_select = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_select) {
                skip_filter = true
            } else {
                filter_select = new_filter.toLowerCase();
            }
        }
        if (!skip_filter) {
// filter table customer and order
    // reset filter tBody_customer
            f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);

// filter selecttable customer and order
            fFilter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive, false)
            fFilter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter


//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict() {  // PR2019-06-09
        console.log( "===== FilterTableRows_dict  ========= ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tBody_roster.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tBody_roster.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow_dict(tblRow)
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        };
    }; // FilterTableRows_dict

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

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        //console.log( "===== ResetFilterRows  ========= ");

        filter_text = "";
        filter_hide_inactive = true;
        filter_mod_employee = "";
        filter_mod_customer = "";
        filter_dict = {};

        // empty filter input boxes in filter header

        let thead_roster = document.getElementById("id_thead_roster");
        if(!!tblHead){f_reset_tblHead_filter(thead_roster)}

    }  // function ResetFilterRows

// +++++++++++++++++ END FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

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
            // when timeduration has changed: set timestart an timeend to null,
            // otherwise recalc timeduration will override new value of timnedurationn
            if (tp_dict.field === "timeduration") {
                upload_dict.timestart = {value: null, update: true};
                upload_dict.timeend = {value: null, update: true};
                upload_dict.breakduration = {value: 0, update: true};
            }
            const url_str = url_emplhour_upload;
            upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};

            const tblName = "emplhour";
            const map_id = get_map_id(tblName, get_dict_value(tp_dict, ["id", "pk"]).toString());
            let tr_changed = document.getElementById(map_id)

            console.log ("url_str", url_str);
            console.log ("upload_dict", upload_dict);

            let parameters = {"upload": JSON.stringify (upload_dict)}
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
        console.log("url_str: ", url_str);

        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)};
            console.log("upload_dict");
            console.log(upload_dict);

// if delete: make tblRow red
            const is_delete = (!!get_dict_value(upload_dict, ["id","delete"]))
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
                    if ("update_list" in response) {
                        UpdateFromResponse(response["update_list"]);
                    };
                    if ("emplhour_list" in response) {
                        get_datamap(response["emplhour_list"], emplhour_map)
                        FillTableRows();
                    };
                    if ("rosterdate" in response) {
                        ModRosterdateFinished(response["rosterdate"]);
                    };
                    if ("logfile" in response) {
                    const new_rosterdate = get_dict_value(response, ["rosterdate", "rosterdate", "rosterdate"], "")
                    const file_name = "logfile_create_roster_" + new_rosterdate;
                    console.log("new_rosterdate: ", new_rosterdate)
                     //--------- print log file
                    const log_list = response.logfile
                    console.log("log_list.length: ", log_list.length)
                    if (!!log_list && log_list.length > 0) {
                        printPDFlogfile(log_list, file_name)
                    }
                };

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
                    let id_dict = get_dict_value(update_dict, ["id"])
                    const pk_int = get_dict_value(id_dict, ["pk"])
                    const ppk_int = get_dict_value(id_dict, ["ppk"])
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
                            let row_index = get_dict_value(id_dict, ["rowindex"])
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
            const is_created = get_dict_value (item_dict, ["id", "created"], false)
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
            const map_id = get_map_id(tblName, get_dict_value(item_dict, ["pk"]));
            console.log(">>>>>>>>>>> map_id", map_id);
            emplhour_map.set(map_id, item_dict)
        }

        if ("rosterdate" in response) {
            ModRosterdateFinished(response["rosterdate"]);
        }



    }  // UpdateFromResponse

//###########################################################################
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  HandleTimepickerOpen  ================ PR2019-10-12
    function HandleTimepickerOpen(el_input) {
        console.log("=== HandleTimepickerOpen");
        // opens modtimepicker from tblRow

        let tr_selected = get_tablerow_selected(el_input)
        const emplh_dict = get_itemdict_from_datamap_by_tblRow(tr_selected, emplhour_map);
        console.log("emplh_dict");
        console.log(emplh_dict);

        HandleTableRowClicked(tr_selected);

        if(!isEmpty(emplh_dict)){
            const id_dict = get_dict_value(emplh_dict, ["id"])

            const fieldname = get_attr_from_el(el_input, "data-field")
            const field_key = (["timestart", "timeend"].indexOf(fieldname) > -1) ? "offset" : "value";

            const default_minoffset = (fieldname === "timestart") ? -720 : 0;
            const default_maxoffset = (fieldname === "timeend") ? 2160 : 1440;

            const rosterdate = get_dict_value(emplh_dict, [fieldname, "rosterdate"]);

            const is_locked = get_dict_value(emplh_dict, [fieldname, "locked"], false)
            if(!is_locked){
                // offset can have null value, 0 = midnight
                const offset = get_dict_value(emplh_dict, [fieldname, field_key]) ;
                const offset_start = get_dict_value(emplh_dict, ["timestart", "offset"]);
                const offset_end = get_dict_value(emplh_dict, ["timeend", "offset"]);
                const break_duration = get_dict_value(emplh_dict, ["breakduration", "value"], 0);
                const time_duration = get_dict_value(emplh_dict, ["timeduration", "value"], 0);
                let minoffset = 0, maxoffset = 1440;
                if (fieldname === "timestart") {
                    minoffset = -720;
                    maxoffset = (offset_end != null ) ? offset_end - break_duration : 1440;
                } else if (fieldname === "timeend") {
                    minoffset = (offset_start != null ) ? offset_start + break_duration : 0;
                    maxoffset = 2160
                } else if (fieldname === "breakduration") {
                    maxoffset = (offset_start != null && offset_end != null ) ? offset_end - offset_start : 1440;
                };

                let tp_dict = {
                    id: id_dict,
                    field: fieldname,
                    rosterdate: rosterdate,
                    offset: offset,
                    minoffset: minoffset,
                    maxoffset: maxoffset,
                    isampm: (timeformat === 'AmPm'),
                    quicksave: {"value": quicksave}}

    // create st_dict with standard values
                const show_btn_delete = true;
                const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
                let st_dict = { interval: interval, comp_timezone: comp_timezone, user_lang: user_lang,
                                show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete,
                                weekday_list: loc.weekdays_abbrev, month_list: loc.months_abbrev,
                                url_settings_upload: url_settings_upload};
                if(!!loc.Break){st_dict["txt_break"] = loc.Break};
                if(!!loc.Working_hours){st_dict["txt_workhours"] = loc.Working_hours};

                if(!!loc.btn_save){st_dict["txt_save"] = loc.btn_save};
                if(!!loc.Quick_save){st_dict["txt_quicksave"] = loc.Quick_save};
                if(!!loc.Exit_Quicksave){st_dict["txt_quicksave_remove"] = loc.Exit_Quicksave};

                console.log("st_dict: ", st_dict)
                console.log("tp_dict: ", tp_dict)
                ModTimepickerOpen(el_input, UploadTimepickerChanged, tp_dict, st_dict)

            }  // if(!is_locked){
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

//############################################################################
// +++++++++++++++++ PRINT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= PrintReport  ====================================
    function PrintReport() { // PR2020-01-25
        PrintRoster("preview", selected_roster_period, emplhour_map, loc, imgsrc_warning)
        }  // PrintReport

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++
    function ExportToExcel(){
        console.log(" === ExportToExcel ===")

            /* File Name */
            let filename = "Planning.xlsx";

            /* Sheet Name */
            let ws_name = "Planning";

            let wb = XLSX.utils.book_new()
            let ws = FillExcelRows();

        console.log("ws", ws)

            /* Add worksheet to workbook */
            XLSX.utils.book_append_sheet(wb, ws, ws_name);

            /* Write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ====================================
    function FillExcelRows() {
        //console.log("=== FillExcelRows  =====")
        let ws = {}

// title row
        let title_value = display_planning_period (selected_roster_period, loc, user_lang); // UpdateHeaderPeriod();
        ws["A1"] = {v: title_value, t: "s"};
// header row
        const header_rowindex = 3
        let headerrow = [loc.Date, loc.Customer, loc.Order, loc.Employee, loc.Shift,
                         loc.Start_time, loc.End_time, loc.Break, loc.Working_hours, loc.Status]
        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }
        //console.log("------------------ws:", ws)

// --- loop through items of emplhour_map
        // Date, Customer, Order, Shift, Employee, Start, End, Break, Hours, Status
        if(!!emplhour_map

        ){
            const cell_types = ["n", "s", "s", "s", "s", "n", "n", "n", "n", "s"]
            const col_count = 10
            const row_count = emplhour_map.size;
            const first_row = 4
            const last_row = first_row  + row_count;

// --- loop through data_map
            let row_index = first_row
            for (const [map_id, map_dict] of emplhour_map.entries()) {
                let cell_values = [
                    get_dict_value(map_dict, ["rosterdate", "exceldate"], ""),
                    get_dict_value(map_dict, ["customer", "code"], ""),
                    get_dict_value(map_dict, ["order", "code"], ""),
                    get_dict_value(map_dict, ["employee", "code"], ""),
                    get_dict_value(map_dict, ["shift", "code"], ""),

                    get_dict_value(map_dict, ["timestart", "exceldatetime"], ""),
                    get_dict_value(map_dict, ["timeend", "exceldatetime"], ""),
                    get_dict_value(map_dict, ["breakduration", "value"], 0) / 60,
                    get_dict_value(map_dict, ["timeduration", "value"], 0) / 60,
                    get_dict_value(map_dict, ["status", "value"], "")
                    ]
                //console.log(cell_values)
                for (let j = 0; j < col_count; j++) {
                    let cell_index = String.fromCharCode(65 + j) + (row_index).toString()
                    ws[cell_index] = {v: cell_values[j], t: cell_types[j]};
                    if ( j === 0){
                        ws[cell_index]["z"] = "dd mmm yyyy"
                    } else if ([5, 6].indexOf(j) > -1){
                        ws[cell_index]["z"] = "dd mmm yyyy hh:mm"
                    } else if ([7, 8].indexOf(j) > -1){
                        ws[cell_index]["z"] = "0.00"
                    }
                }
                row_index += 1;
            }  //  for (const [pk_int, item_dict] of emplhour_map.entries())
            // this works when col_count <= 26
            ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            ws['!cols'] = [
                    {wch:15},
                    {wch:15},
                    {wch:15},
                    {wch:15},
                    {wch:15},
                    {wch:25},
                    {wch:25},
                    {wch:15},
                    {wch:15},
                    {wch:10}
                ];

        }  // if(!!emplhour_map){
        return ws;
    }  // FillExcelRows

// ###################################################################################

}); //$(document).ready(function()