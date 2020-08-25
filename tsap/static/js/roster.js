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
        const url_emplhour_download = get_attr_from_el(el_data, "data-emplhour_download_url");
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
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
        const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");

        const imgsrc_status = get_attr_from_el(el_data, "data-imgsrc_status");

        const title_overlap = get_attr_from_el(el_data, "data-msg_overlap");

        let is_quicksave = false

// ---  id of selected emplhour
        let selected_emplhour_pk = 0;

        let loc = {};  // locale_dict with translated text
        let selected_period = {};
        let mod_upload_dict = {};
        let mod_dict = {};
        let mod_confirm_dict = {};
        let mod_status_dict = {};

        let emplhour_map = new Map();
        let emplhour_totals = {};
        let company_dict = {};
        let log_list = [];
        let log_file_name = "";

        let abscat_map = new Map();
        let employee_map = new Map();
        let customer_map = new Map();
        let order_map = new Map();
        let shift_map = new Map();
        let replacement_map = new Map();

        let filter_dict = {};
        let filter_mod_employee = "";
        let filter_hide_inactive = true;

        let rosterdate_fill;
        let rosterdate_remove;

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let payroll_header_row = [];

// --- field settings used in CreateTblRow and CreateTblHeader
        const field_settings = { tbl_col_count: 12,
            //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
            field_caption: ["", "Date", "Order", "Shift", "Employee", "-", "Start_time", "-", "End_time", "Break", "Hours", "-"],
            field_names: ["select", "rosterdate", "c_o_code", "shiftcode", "employeecode", "stat_start_conf", "offsetstart", "stat_end_conf", "offsetend", "breakduration", "timeduration", "status"],
            field_tags: ["div", "input", "input", "input", "input", "div", "input", "div", "input", "input", "input", "div"],
            filter_tags: ["div", "text", "text", "text", "text", "img", "text", "img", "text", "duration", "duration", "img"],
            field_width:  ["016", "090", "200", "150", "180", "020", "090", "020", "090", "090", "090", "020"],
            field_align: ["c", "l", "l", "l", "l", "r", "l", "r", "l", "l", "l", "c"]
        }

// get elements
        let tblHead_datatable = document.getElementById("id_tblHead_datatable");
        let tblBody_datatable = document.getElementById("id_tblBody_datatable");
        let tBody_select = document.getElementById("id_tbody_select");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

        let el_MRE_tblbody_select = document.getElementById("id_MRE_tblbody_select");
        let el_MRO_tblbody_select = document.getElementById("id_MRO_tblbody_select");
        let el_MSO_tblbody_select = document.getElementById("id_MSO_tblbody_select");
        let el_MSE_tblbody_select = document.getElementById("id_ModSelEmp_tbody_employee");

        let el_modemployee_body = document.getElementById("id_MRE_body")
        let el_modemployee_body_right = document.getElementById("id_MRE_body_right")

        let el_timepicker = document.getElementById("id_timepicker")
        let el_timepicker_tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        let el_timepicker_tbody_minute = document.getElementById("id_timepicker_tbody_minute");

        let el_popup_wdy = document.getElementById("id_popup_wdy");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// === EVENT HANDLERS ===
// ---  side bar - select period
        const el_sbr_select_period = document.getElementById("id_SBR_select_period");
            el_sbr_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
            add_hover(el_sbr_select_period);
// ---  side bar - select order
        const el_sidebar_select_order = document.getElementById("id_SBR_select_order");
            el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
            add_hover(el_sidebar_select_order);
// ---  side bar - select shift
        const el_sidebar_select_daynightshift = document.getElementById("id_SBR_select_shift");
            el_sidebar_select_daynightshift.addEventListener("change", function() {Sidebar_SelectOptionChanged("daynightshift")}, false );
            add_hover(el_sidebar_select_daynightshift);
// ---  side bar - select employee
        const el_sidebar_select_employee = document.getElementById("id_SBR_select_employee");
            el_sidebar_select_employee.addEventListener("click", function() {MSE_Open()}, false );
            add_hover(el_sidebar_select_employee);
// ---  side bar - select absence
        const el_sidebar_select_absence = document.getElementById("id_SBR_select_absence");
            el_sidebar_select_absence.addEventListener("change", function() {Sidebar_SelectOptionChanged("isabsence")}, false );
            add_hover(el_sidebar_select_absence);
// ---  side bar - select restshift
        const el_sidebar_select_restshift = document.getElementById("id_SBR_select_restshift");
            el_sidebar_select_restshift.addEventListener("change", function() {Sidebar_SelectOptionChanged("isrestshift")}, false );
            add_hover(el_sidebar_select_restshift);
// ---  side bar - showall
        const el_sbr_select_showall = document.getElementById("id_SBR_select_showall");
            el_sbr_select_showall.addEventListener("click", function() {Sidebar_SelectOptionChanged("showall")}, false );
            add_hover(el_sbr_select_showall);

// ---  MOD PERIOD ------------------------------------
        const el_mod_period_datefirst = document.getElementById("id_mod_period_datefirst");
        //console.log("el_mod_period_datefirst", el_mod_period_datefirst)
            el_mod_period_datefirst.addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false );
        const el_mod_period_datelast = document.getElementById("id_mod_period_datelast");
            el_mod_period_datelast.addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false );
        const el_mod_period_oneday = document.getElementById("id_mod_period_oneday");
            el_mod_period_oneday.addEventListener("change", function() {ModPeriodDateChanged("oneday")}, false );
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false );

// ---  MOD SELECT ORDER ------------------------------
        const el_MSO_tblbody_customer = document.getElementById("id_MSO_tblbody_customer");
        const el_modorder_tblbody_order = document.getElementById("id_MSO_tblbody_order");
        const el_MSO_input_customer = document.getElementById("id_MSO_input_customer")
            el_MSO_input_customer.addEventListener("focus", function() {MRO_MRE_Onfocus("MSO", "customer")}, false )
            el_MSO_input_customer.addEventListener("keyup", function(){
                setTimeout(function() {MRO_MRE_InputKeyup("MSO", "customer", el_MSO_input_customer)}, 50)});
        const el_MSO_input_order = document.getElementById("id_MSO_input_order")
            el_MSO_input_order.addEventListener("focus", function() {MRO_MRE_Onfocus("MSO", "order")}, false )
            el_MSO_input_order.addEventListener("keyup", function(){
                setTimeout(function() {MRO_MRE_InputKeyup("MSO", "order", el_MSO_input_order)}, 50)});
        const el_MSO_btn_save = document.getElementById("id_MSO_btn_save")
            el_MSO_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MOD SELECT EMPLOYEE ------------------------------
        const el_MSE_input_employee = document.getElementById("id_MSE_input_employee")
            el_MSE_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSE_FilterEmployee()}, 50)});
        const el_MSE_btn_save = document.getElementById("id_ModSelEmp_btn_save")
            el_MSE_btn_save.addEventListener("click", function() {MSE_Save()}, false )

// ---  MOD SELECT SHIFT ------------------------------
        const el_MSS_input_date = document.getElementById("id_MSS_input_date");
            el_MSS_input_date.addEventListener("focus", function() {MSS_GotFocus("date", el_MSS_input_date)}, false )
            el_MSS_input_date.addEventListener("change", function() {MSS_RosterdateEdit(el_MSS_input_date)}, false)
        const el_MSS_input_order = document.getElementById("id_MSS_input_order")
            el_MSS_input_order.addEventListener("focus", function() {MSS_GotFocus("order", el_MSS_input_order)}, false )
            el_MSS_input_order.addEventListener("keyup", function(event){
                setTimeout(function() {MSS_Filter("order", el_MSS_input_order)}, 50)});
        const el_MSS_input_shift = document.getElementById("id_MSS_input_shift")
            el_MSS_input_shift.addEventListener("focus", function() {MSS_GotFocus("shift", el_MSS_input_shift)}, false )
            el_MSS_input_shift.addEventListener("keyup", function(event){
                setTimeout(function() {MSS_Filter("shift", el_MSS_input_shift)}, 50)});
        const el_MSS_input_employee = document.getElementById("id_MSS_input_employee")
            el_MSS_input_employee.addEventListener("focus", function() {MSS_GotFocus("employee",el_MSS_input_employee )}, false )
            el_MSS_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSS_Filter("employee", el_MSS_input_employee)}, 50)});

        document.getElementById("id_MSS_replace").addEventListener("change", function() {MSS_CheckboxEdit("replace")}, false)
        document.getElementById("id_MSS_switch").addEventListener("change", function() {MSS_CheckboxEdit("switch")}, false)

        const el_MSS_btn_save = document.getElementById("id_MSS_btn_save")
            el_MSS_btn_save.addEventListener("click", function() {MSS_Save()}, false )

// ---  MOD CONFIRM ------------------------------------
        const el_confirm_btn_save = document.getElementById("id_confirm_btn_save")
            el_confirm_btn_save.addEventListener("click", function() {DeleteShift_ConfirmSave()}, false )
        const el_confirm_btn_cancel = document.getElementById("id_confirm_btn_cancel")

// ---  MOD ROSTERDATE ------------------------------------
        const el_MRD_loader = document.getElementById("id_mod_rosterdate_loader");
        const el_MRD_rosterdate_input = document.getElementById("id_mod_rosterdate_input")
            el_MRD_rosterdate_input.addEventListener("change", function() {ModRosterdateEdit()}, false)
        const el_MRD_btn_ok = document.getElementById("id_mod_rosterdate_btn_ok")
            el_MRD_btn_ok.addEventListener("click", function() {ModRosterdateSave()}, false)
        const el_MRD_btn_logfile = document.getElementById("id_mod_rosterdate_btn_logfile")
            el_MRD_btn_logfile.addEventListener("click", function() {ModRosterdateLogfile()}, false)
        const el_MRD_btn_cancel = document.getElementById("id_mod_rosterdate_btn_cancel")

// ---  MOD ROSTER EMPLOYEE ------------------------------------
        // --- buttons in btn_container
        let btns = document.getElementById("id_MRE_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {MRE_btn_SelectAndDisable(data_btn)}, false )
        }
// ---  add 'keyup' event handler to input employee
        const el_MRE_input_employee = document.getElementById("id_MRE_input_employee")
            el_MRE_input_employee.addEventListener("focus", function() {MRO_MRE_Onfocus("MRE", "employee")}, false )
            el_MRE_input_employee.addEventListener("keyup", function() {
                setTimeout(function() {MRO_MRE_InputKeyup("MRE", "employee", el_MRE_input_employee)}, 50)});

        const el_MRE_input_abscat = document.getElementById("id_MRE_input_abscat")
            el_MRE_input_abscat.addEventListener("focus", function() {MRO_MRE_Onfocus("MRE", "abscat")}, false )
            el_MRE_input_abscat.addEventListener("keyup", function() {
                setTimeout(function() {MRO_MRE_InputKeyup("MRE", "abscat", el_MRE_input_abscat)}, 50)});

        document.getElementById("id_MRE_switch_date").addEventListener("change", function() {ModEmployeeFillOptionsShift()}, false )
        const el_MRE_btn_save = document.getElementById("id_MRE_btn_save")
            el_MRE_btn_save.addEventListener("click", function() {MRE_Save("save")}, false )
        const el_MRE_btn_delete = document.getElementById("id_MRE_btn_delete")
            el_MRE_btn_delete.addEventListener("click", function() {MRE_Save("delete")}, false )

// ---  input id_MRE_split_time
        const el_MRE_split_time = document.getElementById("id_MRE_split_time");
        el_MRE_split_time.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRE_split_time, "MRE", "MRE_splittime")}, false );


// ---  MOD ROSTER ORDER ------------------------------------
        const el_MRO_input_date = document.getElementById("id_MRO_input_date")
            el_MRO_input_date.addEventListener("change", function() {MRO_InputDateChanged()}, false )
        const el_MRO_input_order = document.getElementById("id_MRO_input_order")
            el_MRO_input_order.addEventListener("focus", function() {MRO_MRE_Onfocus("MRO", "order")}, false )
            el_MRO_input_order.addEventListener("keyup", function(){
                setTimeout(function() {MRO_MRE_InputKeyup("MRO", "order", el_MRO_input_order)}, 50)});
        const el_MRO_input_shift = document.getElementById("id_MRO_input_shift")
            el_MRO_input_shift.addEventListener("focus", function() {MRO_MRE_Onfocus("MRO", "shift")}, false )
            el_MRO_input_shift.addEventListener("keyup", function(){
                setTimeout(function() {MRO_MRE_InputKeyup("MRO", "shift", el_MRO_input_shift)}, 50)});
        const el_MRO_input_employee = document.getElementById("id_MRO_input_employee")
            el_MRO_input_employee.addEventListener("focus", function() {MRO_MRE_Onfocus("MRO", "employee")}, false )
            el_MRO_input_employee.addEventListener("keyup", function(){
                setTimeout(function() {MRO_MRE_InputKeyup("MRO", "employee", el_MRO_input_employee)}, 50)});
        const el_MRO_offsetstart = document.getElementById("id_MRO_input_offsetstart")
            el_MRO_offsetstart.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_offsetstart, "MRO", "MRO_offsetstart")}, false );
        const el_MRO_offsetend = document.getElementById("id_MRO_input_offsetend");
            el_MRO_offsetend.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_offsetend, "MRO", "MRO_offsetend")}, false );
        const el_MRO_breakduration = document.getElementById("id_MRO_input_breakduration");
            el_MRO_breakduration.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_breakduration, "MRO", "MRO_breakduration")}, false );
        const el_MRO_timeduration = document.getElementById("id_MRO_input_timeduration");
            el_MRO_timeduration.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_timeduration, "MRO", "MRO_timeduration")}, false );

        const el_MRO_btn_save = document.getElementById("id_MRO_btn_save")
            el_MRO_btn_save.addEventListener("click", function() {MRO_Save()}, false )

// ---  MODAL STATUS ------------------------------------
        const el_mod_status_time =  document.getElementById("id_mod_status_time")
            el_mod_status_time.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_mod_status_time, "mod_status", "mod_status")}, false)
        const el_mod_status_btn_save =  document.getElementById("id_mod_status_btn_save")
            el_mod_status_btn_save.addEventListener("click", function() {ModalStatusSave()}, false )

// ---  DOCUMENT CLICK - to close popup windows ------------------------------
// add EventListener to document to close msgbox
        document.addEventListener('click', function (event) {
            el_msg.classList.remove("show");
            // PR2020-04-12 dont deselect when clicked outside table - use ESC instead
            // remove highlighted row when clicked outside tabelrows
            //let tr_selected = get_tablerow_selected(event.target)
            //if(!tr_selected) {
            //    selected_emplhour_pk = 0;
            //    DeselectHighlightedTblbody(tblBody_datatable, cls_selected);
            //};
        }, false);

// === reset filter when clicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

//>>>>>>>>>>>>>>> MOD TIMEPICKER >>>>>>>>>>>>>>>>>>> PR2020-04-13
        let el_mtp_container = document.getElementById("id_mtp_container");
        let el_mtp_modal = document.getElementById("id_mtp_modal")
        el_mtp_modal.addEventListener("click", function (e) {
          if (e.target !== el_mtp_modal && e.target !== el_mtp_container) return;
          el_mtp_modal.classList.add("hidden");
        });
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

        let intervalID = window.setInterval(CheckForUpdates, 15000);  // every 15 seconds

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// --- first get locale, to make it faster
        // send 'now' as array to server, so 'now' of local computer will be used
// ---  download settings and datalists
        const now_arr = get_now_arr();
        const datalist_request = {
            setting: {page_roster: {mode: "get"},
                        selected_pk: {mode: "get"}},
            locale: {page: "roster"},
            company: {value: true},
            quicksave: {mode: "get"},
            roster_period:  {get: true, now: now_arr},
            emplhour: {mode: "get"},

            // inactive=null: both active and inactive customers and orders
            // In this way it shows items that are made inactive after creating roster PR2020-04-10
            // filter inactive and datefirst/datelast in select table
            customer_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            scheme: {istemplate: false, inactive: null, issingleshift: null},
            //schemeitem: {customer_pk: selected_customer_pk}, // , issingleshift: false},
            shift: {istemplate: false},
            //team: {istemplate: false},
            //teammember: {datefirst: null, datelast: null, employee_nonull: false},
            employee_list: {inactive: null},
            abscat_list: {inactive: false}
        };
        DatalistDownload(datalist_request, false);

        // TODO employee list can be big. Get separate after downloading emplhour

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, no_loader) {
       //console.log( "=== DatalistDownload ")
       //console.log("request: ", datalist_request)

// ---  Get today's date and time - for elapsed time
        let startime = new Date().getTime();

// reset requested lists
        let is_replacement = false

        // show loader, except when no_loader
        add_or_remove_class(el_loader, cls_visible_hide, no_loader)

        // show loader in MRE
        if (is_replacement) {
            document.getElementById("id_modroster_employee_loader").classList.remove(cls_hide)
        }
        let param = {"download": JSON.stringify (datalist_request)};
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                //console.log("response - elapsed time:", (new Date().getTime() - startime) / 1000 )
                //console.log(response)

                // hide loader
                el_loader.classList.add(cls_visible_hide)
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                }
                if ("roster_period" in response) {
                    selected_period = response.roster_period;
                    el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_period);
                    const header_period_text = get_dict_value(selected_period, ["period_display"], "")
                    document.getElementById("id_hdr_period").innerText = header_period_text

                    const sel_daynightshift = get_dict_value(selected_period, ["daynightshift"], 0) //  can have value null / 0. 1,2,3
                    el_sidebar_select_daynightshift.value = sel_daynightshift.toString();

                    const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
                    const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
                    el_sidebar_select_absence.value = sel_value_absence;

                    const sel_isrestshift = get_dict_value(selected_period, ["isrestshift"]) //  can have value null, false or true
                    const sel_value_restshift = (!!sel_isrestshift) ? "2" : (sel_isrestshift === false) ? "1" : "0";
                    el_sidebar_select_restshift.value = sel_value_restshift;

                }
                if ("locale_dict" in response) {
                    // CreateSubmenu needs loc and selected_period, but may only be called once
                    CreateSubmenu()
                    t_CreateTblModSelectPeriod(loc, ModPeriodSelect, true);  // true = add_period_extend
                    Sidebar_FillSelectOptions();
                }

                if ("company_dict" in response) {company_dict = response.company_dict};
                if ("employee_rows" in response) {refresh_datamap(response.employee_rows, employee_map, "employee")};
                if ("customer_rows" in response) {refresh_datamap(response.customer_rows, customer_map, "customer")};
                if ("order_rows" in response) {refresh_datamap(response.order_rows, order_map, "order")};
                if ("shift_rows" in response) {refresh_datamap(response.shift_rows, shift_map, "shift")};
                if ("abscat_rows" in response) {refresh_datamap(response.abscat_rows, abscat_map, "abscat")}

                let fill_table = false, check_status = false;
                if ("emplhour_rows" in response) {
                    FillEmplhourMap(response.emplhour_rows);
                    fill_table = true;
                    check_status = true;
                }
                if ("emplhour_updates" in response) {RefreshEmplhourMap(response.emplhour_updates, true)};
                if ("overlap_dict" in response) {
                    UpdateOverlap(response["overlap_dict"], false); // / false  = don't skip_reset_all
                }
                if ("replacement_list" in response) {
                    refresh_datamap(response["replacement_list"], replacement_map)
                    ModEmployeeFillOptionDates(replacement_map);
                    fill_table = true;
                    check_status = true;
                }

                if ("quicksave" in response) {
                    is_quicksave = get_dict_value(response, ["quicksave", "value"], false);
                }

                if (fill_table) {
                    CreateTblHeader();
                    FillTblRows()
                }

                Sidebar_DisplaySelectText();

                if (check_status) {
// check for overlap
                // TODO enable
                    // const datalist_request = {overlap: {get: true}, roster_period: selected_period};
                    // DatalistDownload(datalist_request, true); // true = no_loader
                    // CheckStatus()
                }
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)
                //console.log(msg + '\n' + xhr.responseText);
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

        const label_list = [loc.Total_hours, loc.Customer + " - " + loc.Order, loc.Planning + " " + loc.of, loc.Print_date];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];

        let headerrow = [loc.Date, loc.Customer, loc.Order, loc.Employee, loc.Shift,
                         loc.Start_time, loc.End_time, loc.Break, loc.Working_hours, loc.Status]

        if (selected_period.requsr_perm_supervisor){
            AddSubmenuButton(el_submenu, loc.Add_shift, function() {MRO_Open()}, []);
            AddSubmenuButton(el_submenu, loc.Delete_shift, function() {DeleteShift_ConfirmOpen()}, ["mx-2"]);
        }
        AddSubmenuButton(el_submenu, loc.Show_roster, function() {PrintReport("preview")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Download_roster, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);

        // for testing only AddSubmenuButton(el_submenu, "CheckForUpdates", function() {CheckForUpdates()}, ["mx-2"]);

        if (selected_period.requsr_perm_planner){
            AddSubmenuButton(el_submenu, loc.Create_roster, function() {ModRosterdateOpen("create")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Delete_roster, function() {ModRosterdateOpen("delete")}, ["mx-2"]);
        }

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//=========  CreateSelectTableCustomers  ================ PR2019-11-16
    function CreateSelectTableCustomers() {
        //console.log("===  CreateSelectTableCustomers == ");
        //console.log(selected_period);

        const tblName = "customer";
        let tBody_select = document.getElementById("id_mod_order_tblbody_cust");
        // TODO correct
        FillSelectTable(tBody_select, el_data, customer_map, tblName, HandleSelectTable);

    }  // CreateSelectTableCustomers

 //=========  CreateSelectTableOrders  ================ PR2019-11-16
    function CreateSelectTableOrders() {
        //console.log("===  CreateSelectTableOrders == ");
        //console.log(selected_period);

        const tblName = "order";
        let tBody_select = document.getElementById("id_mod_order_tblbody_order");
        // TODO correct
        FillSelectTable(tBody_select, el_data, order_map, tblName, HandleSelectTable, HandleBtnClicked);

    }

//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable(tBody_select, el_data, data_map, tblName, HandleSelectTable, HandleBtnClicked) {
       //console.log("FillSelectTable");

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
///////////////////////////////

//=========  CreateTblHeader  === PR2020-07-21 PR2020-08-13
    function CreateTblHeader() {
        //console.log("===  CreateTblHeader ==");

        const tblName = "emplhour";

// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null

// +++  insert header and filter row ++++++++++++++++++++++++++++++++
        let tblHeadRow = tblHead_datatable.insertRow (-1);
        let tblFilterRow = tblHead_datatable.insertRow (-1);

// ---  create header_row, put caption in columns
        for (let j = 0, len = field_settings.field_caption.length; j < len; j++) {
            const key = field_settings.field_caption[j];
            const caption = (loc[key]) ? loc[key] : key;
            payroll_header_row.push(caption)
            const class_width = "tw_" + field_settings.field_width[j];
            const class_align = "ta_" + field_settings.field_align[j];

// +++ add th to tblHeadRow +++
            let th = document.createElement("th");
                let el = document.createElement("div");
                    if ([5, 7, 11].indexOf(j) > -1) {
                        const class_name = (j === 5) ? "stat_0_2" : (j === 7) ? "stat_0_3" : "stat_0_4";
                        el.classList.add(class_name)
                    } else {

                        el.innerText = caption;
                    }
                    el.classList.add(class_width, class_align);
                th.appendChild(el);
            tblHeadRow.appendChild(th);

// +++ add th to tblFilterRow +++
            th = document.createElement("th");
                el = document.createElement(field_settings.field_tags[j]);
                    el.setAttribute("data-field", field_settings.field_names[j]);
                    el.setAttribute("data-filtertag", field_settings.filter_tags[j]);
                    //if ([5, 7, 11].indexOf(j) > -1) {
                    if ([11].indexOf(j) > -1) {
                        el.addEventListener("click", function(event){HandleFilterImage(el, j)});
                        el.classList.add("stat_0_0")
                        el.classList.add("pointer_show");
                    } else {
                        el.addEventListener("keyup", function(event){HandleFilterKeyup(el, j, event.which)});
                        el.setAttribute("autocomplete", "off");
                        el.setAttribute("ondragstart", "return false;");
                        el.setAttribute("ondrop", "return false;");
                    }
                    el.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                th.appendChild(el);
            tblFilterRow.appendChild(th);
        }
    };  //  CreateTblHeader


//========= FillTblRows === PR2020-08-12
    function FillTblRows() {
        //console.log(" ===== FillTblRows =====");

// --- reset tblBody
        tblBody_datatable.innerText = null;
// --- loop through emplhour_map
        if(emplhour_map) {
            for (const [map_id, map_dict] of emplhour_map.entries()) {
// TODO: add filter ??
                let add_Row = true;
                if (add_Row){
                    const tblRow = CreateTblRow(map_id, map_dict, -1, false)
                    UpdateTblRow(tblRow, map_dict)
                }
            }  // for (const [map_id, map_dict] of emplhour_map.entries())
        }  // if(emplhour_map)
    }  // FillTblRows

//=========  CreateTblRow  ===== PR2020-08-12
    function CreateTblRow(map_id, map_dict, row_index, is_new_item, new_exceldatetime) {
        //console.log("=========  CreateTblRow =========");
       //console.log("map_id", map_id);

        const tblName = "emplhour";

         // if no row_index given, lookup index by exceldatetime
        //if(row_index < 0 && !!new_exceldatetime ) { row_index = get_rowindex_by_exceldatetime(new_exceldatetime) }
        //if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09

// +++  insert tblRow into tblBody
        let tblRow = tblBody_datatable.insertRow(row_index);
        tblRow.id = map_id;
        tblRow.setAttribute("data-table", tblName);
        tblRow.setAttribute("data-pk", map_dict.id);
// ---  add exceldatetime to tblRow, for ordering new rows
        tblRow.setAttribute("data-excelstart", map_dict.excelstart);
// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow);}, false )

//+++ insert td's into tblRow
        const column_count = field_settings.tbl_col_count;
        for (let j = 0; j < column_count; j++) {
            let td = tblRow.insertCell(-1);
    // --- create div element
            let el = document.createElement("div");
    // --- add data-field Attribute
            const field_name = field_settings.field_names[j];
            el.setAttribute("data-field", field_name);
// --- add img to confirm_start, confirm_end and status elements
            if ([5, 7, 11].indexOf( j ) > -1){
                let has_perm = false;
                if(j === 11) {
                    // PERMITS hrman can unlock, supervisor can only lock PR20202-08-05
                    has_perm = (selected_period.requsr_perm_supervisor || selected_period.requsr_perm_hrman)
                } else {
                    has_perm = (selected_period.requsr_perm_supervisor)
                }
                if(has_perm){
                    el.addEventListener("click", function() {ModalStatusOpen(el)}, false)
                    el.classList.add("stat_0_0")
                    // may open modconfirm depends if status = locked.
                    // Therefore set add_hover and pointer_show in UpdateTblRow
                };
            } else {
    // --- add input element to td.
                //el.setAttribute("type", "text");
                //el.classList.add("input_text"); // makes background transparent
    // --- add EventListeners, only when has PERMITS supervisor
                if(selected_period.requsr_perm_supervisor){
                    if ([1, 3].indexOf( j ) > -1){
                        el.disabled = true;
                    } else if ([2, 4].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MRE_Open(el)}, false )
                        add_hover(el)
                    } else if ([6, 8, 9, 10].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el, "tblRow", "tblRow")}, false)
                        add_hover(el)
                    };
                } else {
                    el.disabled = true;
                }
    // --- add field_width and text_align
                el.classList.add("tw_" + field_settings.field_width[j],
                                 "ta_" + field_settings.field_align[j]);
    // --- add other attributes to td
                //el.setAttribute("autocomplete", "off");
                //el.setAttribute("ondragstart", "return false;");
                //el.setAttribute("ondrop", "return false;");
            }  //if (j === 0)
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };// CreateTblRow

//========= UpdateTblRow ====== PR2020-08-12
    function UpdateTblRow(tblRow, map_dict){
        //console.log(" ------  UpdateTblRow  ------");
        //console.log("tblRow", tblRow);
        //console.log("map_dict", map_dict);

        if (tblRow && !isEmpty(map_dict)) {
            const has_changed = map_dict.haschanged;
            const data_haschanged = (has_changed) ? "1" : "0";
            tblRow.setAttribute("data-haschanged", data_haschanged)

            const confirmed_any = (map_dict.stat_start_conf || map_dict.stat_end_conf);
            const is_locked =  (map_dict.stat_locked || map_dict.stat_pay_locked || map_dict.stat_inv_locked);
            const is_restshift = map_dict.oh_isrestshift;
            const is_absence = map_dict.c_isabsence;

// --- loop through cells of tblRow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                // el is first child of td, td is cell of tblRow
                let el = tblRow.cells[i].children[0];
                UpdateField(tblRow, el, map_dict)
            }  //  for (let j = 0; j < 8; j++)

        };  // if (!!map_dict && !!tblRow)
    }  // UpdateTblRow

///////////////////////////////////////
//========= UpdateField ====== PR2020-08-23
    function UpdateField(tblRow, el, map_dict){
        //console.log(" ------  UpdateField  ------");
        //console.log("tblRow", tblRow);
        //console.log("map_dict", map_dict);

        if (el && !isEmpty(map_dict)) {
            const has_changed = map_dict.haschanged;
            const data_haschanged = (has_changed) ? "1" : "0";
            tblRow.setAttribute("data-haschanged", data_haschanged)

            const confirmed_any = (map_dict.stat_start_conf || map_dict.stat_end_conf);
            const is_locked =  (map_dict.stat_locked || map_dict.stat_pay_locked || map_dict.stat_inv_locked);
            const is_restshift = map_dict.oh_isrestshift;
            const is_absence = map_dict.c_isabsence;

            const fldName = get_attr_from_el(el, "data-field");

            if (fldName === "rosterdate") {
                // function format_dateISO_vanilla (loc, date_iso, hide_weekday, hide_year, is_months_long, is_weekdays_long)
                el.innerText = format_dateISO_vanilla (loc, map_dict.rosterdate, false, true);
            } else if (fldName === "c_o_code") {
                el.innerText = map_dict.c_o_code
                // PERMITS enable field when it is absence
                const is_disabled = (!selected_period.requsr_perm_supervisor || is_locked || !is_absence);
                add_or_remove_class(el, "tsa_color_darkgrey",is_disabled )
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", selected_period.requsr_perm_supervisor && !is_locked && is_absence)
            } else if (fldName === "shiftcode") {
                const inner_text = (is_restshift) ? (map_dict.shiftcode) ? map_dict.shiftcode + " (R)" : loc.Rest_shift : map_dict.shiftcode;
                el.innerText = (inner_text) ? inner_text : "\n"
                if (is_restshift) {el.title = loc.This_isa_restshift}
            } else if (fldName === "employeecode") {
                let value = map_dict.employeecode;
                // add * in front of name when is_replacement
                if(map_dict.eh_isrpl) {value = "*" + value}
                // put any character in field, to show pointer
                el.innerText = (value) ? value : "---";
                // PERMITS disable field employee when is_locked, also when is_restshift or is_absence
                const is_disabled = (!selected_period.requsr_perm_supervisor || is_locked || is_restshift || is_absence);
                add_or_remove_class(el, "tsa_color_darkgrey",is_disabled)
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", selected_period.requsr_perm_supervisor && !is_locked && !is_restshift && !is_absence)

            } else if (["offsetstart", "offsetend"].indexOf( fldName ) > -1){
                const offset = (fldName === "offsetstart") ? map_dict.offsetstart : map_dict.offsetend;
                const inner_text = format_time_from_offset_JSvanilla( loc, map_dict.rosterdate, offset, true, false, false)
                 // true = display24, false = only_show_weekday_when_prev_next_day, false = skip_hour_suffix
                el.innerText = (inner_text) ? inner_text : "\n"
                 // PERMITS
                const is_disabled = (!selected_period.requsr_perm_supervisor || is_locked || confirmed_any);
                add_or_remove_class(el, "tsa_color_darkgrey", is_disabled)
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", !is_disabled)

            } else if (["timeduration", "breakduration"].indexOf( fldName ) > -1){
                const duration = (fldName === "timeduration") ? map_dict.timeduration : map_dict.breakduration;
                const inner_text = display_duration (duration, loc.user_lang)
                el.innerText = (inner_text) ? inner_text : "\n"
                // PERMITS
                const is_disabled = (!selected_period.requsr_perm_supervisor || is_locked || confirmed_any);
                add_or_remove_class(el, "tsa_color_darkgrey", is_disabled)
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", !is_disabled)

            } else if (["stat_start_conf", "stat_end_conf"].indexOf( fldName ) > -1){
                // el_img does not exist, update status column instead PR2020-07-26
                //format_confirmation_element (loc, el, fldName, field_dict,
                //    imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_questionmark, imgsrc_warning,
                //    "title_stat00", "please confirm start time", "please confirm end time", "start time confirmation past due", "end time confirmation past due" )

            } else if (["status"].indexOf(fldName ) > -1){
                // PERMITS hrman can unlock, supervisor can only lock PR20202-08-05
                const is_enabled = (!is_locked && selected_period.requsr_perm_hrman) ||
                                   (!is_locked && !status_locked && selected_period.requsr_perm_supervisor)
                if ( is_enabled ){
                    add_hover(el)
                    el.classList.add("pointer_show");
                }
                const modified_dateJS = parse_dateJS_from_dateISO(map_dict.eh_modat);
                const modified_date_formatted = format_datetime_from_datetimeJS(loc, modified_dateJS)
                const modified_by = (map_dict.u_usr) ? map_dict.u_usr : "-";

                let title = "";
                let icon_class = "stat_0_0"

                if(map_dict.stat_pay_locked || map_dict.stat_inv_locked){
                    icon_class = "stat_0_6"
                    title = loc.This_shift_is_locked;
                } else if (map_dict.stat_locked){
                    icon_class = (has_changed) ? "stat_1_5" : "stat_0_5"
                    title = loc.This_shift_is_closed;
                } else if (confirmed_any){
                    if (map_dict.stat_start_conf && map_dict.stat_end_conf) {
                        icon_class = (has_changed) ? "stat_1_4" : "stat_0_4"
                        title = loc.Start_and_endtime_confirmed;
                    } else if (map_dict.stat_end_conf) {
                        icon_class = (has_changed) ? "stat_1_3" : "stat_0_3"
                        title = loc.Endtime_confirmed
                    } else if (map_dict.stat_start_conf) {
                        icon_class = (has_changed) ? "stat_1_2" : "stat_0_2"
                        title = loc.Starttime_confirmed
                    }
                } else if (map_dict.stat_planned){
                    icon_class = (has_changed) ? "stat_1_1" : "stat_0_1"
                    title = loc.This_isa_planned_shift;
                } else {
                    icon_class = (has_changed) ? "stat_1_0" : "stat_0_0"
                    title = loc.This_isan_added_shift;
                }
                if(has_changed){
                    title += "\n" + loc.Modified_by + modified_by + "\n" + loc.on + modified_date_formatted
                }

                // first remove all classes from el, put pointer_show back later
                let classList = el.classList;
                const contains_pointer_show = classList.contains("pointer_show");
                while (classList.length > 0) {
                    classList.remove(classList.item(0));
                }
                if(contains_pointer_show) {el.classList.add("pointer_show")};
                el.classList.add(icon_class)
                el.setAttribute("title", title);
            }  // if (fldName === "rosterdate")
        };  // if (el && !isEmpty(map_dict))
    }  // UpdateField

//========= get_excelstart_from_emplhour_dict  ============ PR2020-04-20 PR2020-08-13
    function get_excelstart_from_emplhour_dict(map_dict) {
// ---  add exceldatetime to tblRow, for ordering new rows
        return (map_dict.excelstart) ? map_dict.excelstart :
               (map_dict.exceldate) ? 1440 * (map_dict.exceldate + 1) : null;
    }  // get_excelstart_from_emplhour_dict

//========= HandleConfirmMouseenter  ====================================
    function HandleConfirmMouseenter(el) {
        //console.log(" --- HandleConfirmMouseenter --- ")
        const item_dict = get_itemdict_from_datamap_by_el(el, emplhour_map);
        let data_field = get_attr_from_el_str(el, "data-field")
        const fieldname = (data_field === "confirmstart") ? "timestart" : "timeend"
        const img_src = (data_field === "confirmstart") ? imgsrc_stat02 : imgsrc_stat03;
        const field_dict = get_dict_value(item_dict, [fieldname])
        if(!isEmpty(field_dict)){
            const field_is_locked = ("locked" in field_dict)
            const has_overlap = ("overlap" in field_dict)
            const has_no_employee = (!get_dict_value(item_dict, ["employee", "pk"]))
            const locked = (field_is_locked || has_overlap || has_no_employee);

            if(!locked){
                el.children[0].setAttribute("src", img_src)
                // this one causes the table to scroll to top PR2020-04-07
                //el.setAttribute("href", "#");
            };
        }
    }

// ++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  HandleTblRowClicked  ================ PR2019-10-12 PR2020-08-18
    function HandleTblRowClicked(tr_clicked) {
        //console.log("=== HandleTblRowClicked");
        //console.log( "tr_clicked: ", tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)

// ---  update selected_emplhour_pk
        const emplhour_dict = get_itemdict_from_datamap_by_tblRow(tr_clicked, emplhour_map)
        selected_emplhour_pk = emplhour_dict.id;
    }  // HandleTblRowClicked

//========= UploadElChanges  ============= PR2019-10-12
    function UploadElChanges(el_changed) {
        //console.log("--- UploadElChanges  --------------");

        let tr_changed = get_tablerow_selected(el_changed)
        if (!!tr_changed){
            const fieldname = get_attr_from_el(el_changed, "data-field");

// ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!isEmpty(id_dict) && !!fieldname){
                let upload_dict = {period_datefirst: selected_period.period_datefirst,
                                    period_datelast: selected_period.period_datelast,
                                id: id_dict};
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

                UploadChanges(upload_dict, url_emplhour_upload) ;

            };  // if (!isEmpty(id_dict))
        }  // if (!! tr_changed){
    };  // UploadElChanges

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

//###################################
//========= ModalSettingOpen====================================
    function ModalSettingOpen () {
        //console.log("===  ModalSettingOpen  =====") ;
        //console.log("selected_period", selected_period) ;

        let el_modal = document.getElementById("id_mod_setting")
        let tBody = document.getElementById("id_mod_tbody_interval");

        tBody.removeAttribute("data-value");
        let interval = 0, overlap_prev = 0, overlap_next = 0;
        if (!isEmpty(selected_period)){
            interval = get_dict_value(selected_period, ["interval"], 0)
            overlap_prev = get_dict_value(selected_period, ["overlap_prev"], 0)
            overlap_next = get_dict_value(selected_period, ["overlap_next"], 0)
        }  //  if (!isEmpty(selected_period))

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

//=========  GetNewRosterdate  ================ PR2019-04-14
    function GetNewRosterdate(o_date, add_day, add_month, add_year) {
        //console.log("---  function GetNewRosterdate ---");

// change o_date to next/previous day, month (year), or get Today if add_day=0, add_month=0 and add_year=0.
        let n_date = get_newdate_from_date(o_date, add_day, add_month, add_year)
        //console.log("n_date: ", n_date, typeof n_date)

        //console.log("weekday_list: ", weekday_list, typeof weekday_list)
// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        const n_weekday = n_date.getDay();
        //console.log("n_weekday: ", n_weekday, typeof n_weekday)
        //console.log("weekday_list[n_weekday]: ", weekday_list[n_weekday])
        //console.log("n_month_index: ", n_month_index, typeof n_month_index)
        //console.log(" month_list[n_month_index + 1]: ",  month_list[n_month_index + 1])
        const new_wdy = weekday_list[n_weekday] + ' ' + n_day + ' ' + month_list[n_month_index + 1] + ' ' + n_year
        //console.log("new_wdy: ", new_wdy, typeof new_wdy)


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


//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen=================== PR2020-07-12
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_period", selected_period) ;

        mod_upload_dict = selected_period;

// ---  highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value(selected_period, ["period_tag"])
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };
// ---  set value of date imput elements
        const is_custom_period = (period_tag === "other")
        el_mod_period_datefirst.value = get_dict_value(selected_period, ["period_datefirst"])
        el_mod_period_datelast.value = get_dict_value(selected_period, ["period_datelast"])
// ---  set min max of input fields
        ModPeriodDateChanged("setminmax");
        el_mod_period_datefirst.disabled = !is_custom_period
        el_mod_period_datelast.disabled = !is_custom_period
// ---  reset checkbox oneday, hide  when not is_custom_period
        el_mod_period_oneday.checked = false;
        add_or_remove_class(document.getElementById("id_mod_period_oneday_container"), cls_hide, !is_custom_period)
// ---  set value of extend period input box
        const extend_offset = get_dict_value(selected_period, ["extend_offset"], 0)
        let el_extend = document.getElementById("id_mod_period_extend")
        for (let i = 0, option, value; i < el_extend.options.length; i++) {
            value = Number(el_extend.options[i].value);
            if (value === extend_offset) {
                el_extend.options[i].selected = true;
                break;
            }
        }
// ---  show extend period input box
        document.getElementById("id_mod_period_div_extend").classList.remove(cls_hide)
// ---  show modal
        $("#id_mod_period").modal({backdrop: true});
}; // function ModPeriodOpen

//=========  ModPeriodSelect  ================ PR2020-07-12
    function ModPeriodSelect(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelect ========= ", selected_index);
        if(!!tr_clicked) {
// ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)
// ---  add period_tag to mod_upload_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_upload_dict["period_tag"] = period_tag;
// ---  enable date input elements, give focus to start
            if (period_tag === "other") {
                // el_datefirst / el_datelast got value in ModPeriodOpen
// ---  show checkbox oneday when not is_custom_period
                document.getElementById("id_mod_period_oneday_container").classList.remove(cls_hide);
                el_mod_period_datefirst.disabled = false;
                el_mod_period_datelast.disabled = false;
                el_mod_period_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelect

//=========  ModPeriodDateChanged  ================ PR2020-07-11
    function ModPeriodDateChanged(fldName) {
        //console.log("ModPeriodDateChanged");
        //console.log("fldName", fldName);
        if (fldName === "oneday") {
            // set period_datelast to datefirst
            if (el_mod_period_oneday.checked) { el_mod_period_datelast.value = el_mod_period_datefirst.value};
            el_mod_period_datelast.readOnly = el_mod_period_oneday.checked;
        } else if (fldName === "setminmax") {
            // set datelast min_value to datefirst.value, remove when blank
            add_or_remove_attr (el_mod_period_datelast, "min", (!!el_mod_period_datefirst.value), el_mod_period_datefirst.value);
            // dont set datefirst max_value, change datelast instead
        } else if (fldName === "datefirst") {
            if ( (el_mod_period_oneday.checked) ||
                 (!!el_mod_period_datefirst.value  && el_mod_period_datefirst.value > el_mod_period_datelast.value)  ) {
                el_mod_period_datelast.value = el_mod_period_datefirst.value
            }
            // set datelast min_value to datefirst.value, remove when blank
            add_or_remove_attr (el_mod_period_datelast, "min", (!!el_mod_period_datefirst.value), el_mod_period_datefirst.value);
        }
    }  // ModPeriodDateChanged

//=========  ModPeriodSave  ================ PR2019-07-11
    function ModPeriodSave() {
        //console.log("===  ModPeriodSave =========");
// ---  get period_tag
        const period_tag = get_dict_value(mod_upload_dict, ["period_tag"], "today")
// ---  get extend_offset
        const extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        if(extend_index < 0 ){extend_index = 0}
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;
// ---  create upload_dict
        // send 'now' as array to server, so 'now' of local computer will be used
        let upload_dict = {
            now: get_now_arr(),
            period_tag: period_tag,
            extend_index: extend_index,
            extend_offset: extend_offset};
        // only save dates when tag = "other"
        if(period_tag === "other"){
            if (el_mod_period_datefirst.value) {upload_dict.period_datefirst = el_mod_period_datefirst.value};
            if (el_mod_period_datelast.value) {upload_dict.period_datelast = el_mod_period_datelast.value};
        }
// ---  upload new setting
        let datalist_request = {roster_period: upload_dict, emplhour: {mode: "get"}};
        DatalistDownload(datalist_request);
// ---  update header period text
        document.getElementById("id_hdr_period").innerText = loc.Period + "..."
// ---  hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

//========= Sidebar_DisplaySelectText  ====================================
    function Sidebar_DisplaySelectText() {
        //console.log( "===== Sidebar_DisplaySelectText  ========= ");
        let header_text = null;
        if(selected_period.customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_period.customer_pk)
            const customer_code = customer_dict.c_code;
            let order_code = null;
            if(!!selected_period.order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_period.order_pk)
                order_code = order_dict.o_code;
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }
        el_sidebar_select_order.value = header_text

        header_text = null;
        if(selected_period.employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_period.employee_pk)

            //console.log( "employee_dict", employee_dict);

            header_text = (employee_dict.code) ? employee_dict.code : null;
        } else {
            header_text = loc.All_employees
            //console.log( "header_text", header_text);
        }
        el_sidebar_select_employee.value = header_text
    }; // Sidebar_DisplaySelectText


// +++++++++++++++++ SIDEBAR SELECT ABSENCE OR RESTSHIFT OR SHOW ALL +++++++++++++++++++++++++++++++++++++++++++
//=========  Sidebar_SelectOptionChanged  ================ PR2020-01-09
    function Sidebar_SelectOptionChanged(key) {
        //console.log( "===== Sidebar_SelectOptionChanged ========= ");
// ---  get selected_option from clicked select element
        // option 2: isabsence = true (absence only) option 1: isabsence = false (no absence) option 1: isabsence = null (absence + no absence)

        let roster_period_dict = {}
        if(key === "isabsence") {
            // when order is selected, absence cannot be shown. Remove order_pk when isabsence = null
            const selected_option = Number(el_sidebar_select_absence.options[el_sidebar_select_absence.selectedIndex].value);
            let selected_value = null;
            switch (selected_option) {
                case 2:  // absence only
                    selected_value = true
                    // set restshift to 'no restshift'
                    roster_period_dict["isrestshift"] = false
                    el_sidebar_select_restshift.value = "1";
                    // when absence only: no order filter can apply. set customer_pk and order_pk to null
                    selected_period.customer_pk = null;
                    selected_period.order_pk = null;
                    roster_period_dict["customer_pk"] = null
                    roster_period_dict["order_pk"] = null
                    break;
                case 1:  // no absence
                    selected_value = false
                    break;
                default:  // absence + no absence
                    // when absence + no absence: no order filter can apply. set customer_pk and order_pk to null
                    selected_period.customer_pk = null;
                    selected_period.order_pk = null;
                    roster_period_dict["customer_pk"] = null
                    roster_period_dict["order_pk"] = null
                    selected_value = null
            }

            roster_period_dict[key] = selected_value
        } else if(key === "isrestshift") {
            const selected_option = Number(el_sidebar_select_restshift.options[el_sidebar_select_restshift.selectedIndex].value);
            const selected_value = (selected_option === 2) ? true : (selected_option === 1) ? false : null
            if (!!selected_value) {
                // if absence/restshift only, set other to 'no restshift'
                roster_period_dict["isabsence"] = false
                el_sidebar_select_absence.value = "1";
            }
            roster_period_dict[key] = selected_value

        } else if(key === "daynightshift") {
            const selected_index = el_sidebar_select_daynightshift.selectedIndex;
            const selected_option = Number(el_sidebar_select_daynightshift.options[selected_index].value);
            roster_period_dict["daynightshift"] = selected_option
        } else if(key === "showall") {
            roster_period_dict = {employee_pk: null,
                                customer_pk: null,
                                order_pk: null,
                                isabsence: null,
                                isrestshift: null,
                                daynightshift: null
                                }
        }

// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in roster_period_dict
        let datalist_request = {roster_period: roster_period_dict, emplhour: {mode: "get"}};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectOptionChanged

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16 PR2020-08-24
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;
        // do not update selected_period.customer_pk until MSO_Save
        mod_dict = {customer_pk: 0, order_pk: 0};
        el_MSO_input_customer.value = null;
        el_MSO_input_order.value = null;
// ---  fill select table 'customer'
        MRE_MRO_FillSelectTable("MSO", "customer", 0);
// ---  set header text
        document.getElementById("id_MSO_header").innerText = loc.All_customers
// ---  Set focus to el_MSO_input_customer
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){ el_MSO_input_customer.focus() }, 50);
// ---  show modal
         $("#id_modselectorder").modal({backdrop: true});
}; // MSO_Open

//=========  MSO_Save  ================ PR2020-01-29
    function MSO_Save() {
        //console.log("===  MSO_Save =========");
        //console.log( "mod_dict: ", mod_dict);

// ---  upload new setting
        let roster_period_dict = {
                customer_pk: mod_dict.customer_pk,
                order_pk: mod_dict.order_pk
            };

        // if customer_pk or order_pk has value: set absence to 'without absence
        if(mod_dict.customer_pk || mod_dict.order_pk) {
            roster_period_dict.isabsence = false;
        }
        const datalist_request = { roster_period: roster_period_dict, emplhour: {mode: "get"}};
        DatalistDownload(datalist_request);
// hide modal
        $("#id_modselectorder").modal("hide");
    }  // MSO_Save

// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//========= MSE_Open ====================================  PR2020-02-27  PR2020-08-24
    function MSE_Open (mode) {
        //console.log(" ===  MSE_Open  =====") ;
        mod_dict = {employee_pk: 0};
// ---  fill select table 'employee'
        MRE_MRO_FillSelectTable("MSE", "employee", 0);
// ---  set header text
        document.getElementById("id_ModSelEmp_hdr_employee").innerText = loc.Select_employee
// ---  hide button /remove employee'
        document.getElementById("id_MSE_div_btn_remove").classList.add(cls_hide)
// ---  Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){el_MSE_input_employee.focus()}, 50);
// ---  show modal
         $("#id_mod_select_employee").modal({backdrop: true});
}; // MSE_Open

//=========  MSE_Save  ================ PR2020-01-29
    function MSE_Save() {
        //console.log("===  MSE_Save =========");

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

// ---  upload new setting
        // when emplhour exists in datalist_request, it downloads emplhour_list based on filters in roster_period_dict
        const roster_period_dict = {
            now: now_arr,
            employee_pk: mod_upload_dict.employee_pk
        }
        let datalist_request = {roster_period: roster_period_dict, emplhour: {mode: "get"}};
        DatalistDownload(datalist_request);

// hide modal
        $("#id_mod_select_employee").modal("hide");

    }  // MSE_Save

//=========  MSE_SelectEmployee  ================ PR2020-01-09
    function MSE_SelectEmployee(tblRow) {
        //console.log( "===== MSE_SelectEmployee ========= ");
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
                    mod_upload_dict.employee_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_period.employee_pk){
                    mod_upload_dict.employee_pk = pk_int;
                }
            }
// ---  put value in input box
            el_MSE_input_employee.value = get_attr_from_el(tblRow, "data-value", "")
            MSE_headertext();

            MSE_Save()
        }
    }  // MSE_SelectEmployee

//=========  MSE_FilterEmployee  ================ PR2020-03-01
    function MSE_FilterEmployee() {
        //console.log( "===== MSE_FilterEmployee  ========= ");

// ---  get value of new_filter
        let new_filter = el_MSE_input_employee.value

        let tblBody = el_MSE_tblbody_select;
        const len = tblBody.rows.length;
        if (!!new_filter && !!len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one employee: put selected employee in el_MSE_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_MSE_input_employee.value = get_dict_value(filter_dict, ["selected_value"])
// ---  put pk of selected employee in mod_upload_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_upload_dict.employee_pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_period.employee_pk){
                        mod_upload_dict.employee_pk = pk_int;
                    }
                }
                MSE_headertext();
// ---  Set focus to btn_save
                el_MSE_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSE_FilterEmployee

    function MSE_headertext() {
        //console.log( "=== MSE_headertext  ");
        let header_text = null;
        //console.log( "mod_upload_dict: ", mod_upload_dict);

        if(!!mod_upload_dict.employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", mod_upload_dict.employee_pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.Select_employee
        }

        document.getElementById("id_ModSelEmp_hdr_employee").innerText = header_text

    }  // MSE_headertext

// +++++++++++++++++ MODAL SELECT SHIFT +++++++++++++++++++++++++++++++++++++++++++
//========= MSS_Open ====================================  PR2020-05-07
    function MSS_Open () {
       //console.log(" ===  MSS_Open  =====") ;
       //console.log("mod_upload_dict: ", mod_upload_dict) ;

// ---  put rosterdate in input box
        document.getElementById("id_MSS_input_date").value = mod_upload_dict.rosterdate;

// ---  reset other input box, disable
        mod_upload_dict.is_switch = false;

        MSS_Reset_TableAndInputBoxes();
        MSS_DisableInputBoxes(isEmpty(mod_upload_dict.emplh_shift_dict))
// ---  download shifts for Modal Select Shift (is put here to save time when opening MSS)
        // TODO hass error
        if(mod_upload_dict.rosterdate && mod_upload_dict.emplhour.pk){
            add_or_remove_class( document.getElementById("id_MSS_loader"), cls_hide, false);
            const upload_dict =  {shiftdict: {rosterdate: mod_upload_dict.rosterdate, emplhour_pk: mod_upload_dict.emplhour.pk}}
            UploadChanges(upload_dict, url_emplhour_download);
            // response handled in MSS_UploadResponse
        }

// ---  show modal
        $("#id_modselectshift").modal({backdrop: true});

}; // MSS_Open

//=========  MSS_Save  ================ PR2020-05-09
    function MSS_Save() {
       //console.log("===  MSS_Save =========");
       //console.log("mod_upload_dict", mod_upload_dict);
       //console.log("========mod_upload_dict.is_switch", mod_upload_dict.is_switch);

// ---  create id_dict of current emplhour record
        let other_employee_dict = {};
        const employee_pk = (mod_upload_dict.is_switch && mod_upload_dict.employee_pk) ? mod_upload_dict.employee_pk : null;
        const employee_ppk = (mod_upload_dict.is_switch && mod_upload_dict.employee_ppk) ? mod_upload_dict.employeep_pk : null;
        other_employee_dict = {pk: employee_pk, ppk: employee_ppk, table: "employee", update: true};

        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                            id: {pk: mod_upload_dict.emplhour.pk,
                                ppk: mod_upload_dict.emplhour.ppk,
                                table: "emplhour",
                                shiftoption: "moveto_shift",
                                rowindex: mod_upload_dict.rowindex},
                            employee: other_employee_dict,
                            moveto_emplhour_pk: mod_upload_dict.selected_emplhour_pk
                           }

// ---  remove employee from current emplhour
        //let tr_changed = document.getElementById(mod_upload_dict.map_id);
        //console.log("mod_upload_dict.map_id", mod_upload_dict.map_id)
        //console.log("tr_changed", tr_changed)
        //set_fieldvalue_in_tblRow(tr_changed, "employee", "bingo!!");

// ---  Upload Changes
        UploadChanges(upload_dict, url_emplhour_upload);

        $('#id_modselectshift').modal('hide');
    }  // MSS_Save

//=========  MSS_UploadResponse  ================ PR2020-05-10
    function MSS_UploadResponse (response_emplh_shift_dict) {
        //console.log(" =====  MSS_UploadResponse  ===== ", tblName)
        //console.log(el_input)
        mod_upload_dict.emplh_shift_dict = deepcopy_dict(response_emplh_shift_dict)
        const row_count = MRO_MRE_MSS_FillSelectTable ("MSS", "order", null);
        el_MSS_input_order.readOnly = (!row_count);
        if(row_count){
            mod_upload_dict.skip_focus_event = true;
            el_MSS_input_order.readOnly = false;
            set_focus_on_el_with_timeout(el_MSS_input_order, 50)
        }
    }  // MSS_UploadResponse

//=========  MSS_RosterdateEdit  ================ PR2020-05-08
    function MSS_RosterdateEdit (el_input) {
       //console.log(" =====  MSS_RosterdateEdit =====")

// ---  get new rosterdate
        mod_upload_dict.rosterdate = el_input.value
// ---  disable input boxes
        MSS_DisableInputBoxes(true)
        MSS_Reset_TableAndInputBoxes();
// ---  show loader
        add_or_remove_class( document.getElementById("id_MSS_loader"), cls_hide, false);
// ---  reset table and input field
// ---  download shifts for Modal Select Shift (is put here to save time when opening MSS)
        if(mod_upload_dict.rosterdate && mod_upload_dict.emplhour.pk){
            const upload_dict =  {shiftdict: {rosterdate: mod_upload_dict.rosterdate, emplhour_pk: mod_upload_dict.emplhour.pk}};
            UploadChanges(upload_dict, url_emplhour_download);
            // response handled in  MSS_UploadResponse
        }
    }  // MSS_RosterdateEdit

//=========  MSS_CheckboxEdit  ================ PR2020-05-10
    function MSS_CheckboxEdit (fldName) {
        //console.log(" =====  MSS_CheckboxEdit =====")
        const checkbox_replace = document.getElementById("id_MSS_replace")
        const checkbox_switch = document.getElementById("id_MSS_switch")
        if ( fldName === "replace") {
              mod_upload_dict.is_switch = !checkbox_replace.checked
              checkbox_switch.checked = mod_upload_dict.is_switch
        } else if ( fldName === "switch") {
            mod_upload_dict.is_switch = checkbox_switch.checked
            checkbox_replace.checked = !mod_upload_dict.is_switch
        }
// ---  Set focus to btn_save
        el_MSS_btn_save.focus()
    }  // MSS_CheckboxEdit

//=========  MSS_Filter  ================ PR2020-05-09
    function MSS_Filter (tblName, el_input) {
        //console.log("=====  MSS_Filter ===== tblName", tblName)
        //console.log("el_input", el_input)
// ---  get value of new_filter
        let new_filter = el_input.value

        let tblBody = document.getElementById("id_MSS_tblbody_select");
        const len = tblBody.rows.length;
        if (len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one row: put selected row in el_input
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const selected_value = get_dict_value(filter_dict, ["selected_value"])
            if (selected_pk) {
                el_input.value = selected_value
// ---  put pk of selected row in mod_upload_dict
                const pk_int = selected_pk;
                if (tblName === "order") {
                    mod_upload_dict.selected_order_pk = selected_pk;
                    MRO_MRE_MSS_SelecttableUpdateAfterSelect("MSS", tblName, selected_pk, null, selected_value)
                } else if (tblName === "shift") {
                    mod_upload_dict.selected_shift_pk = selected_pk;
                    MRO_MRE_MSS_SelecttableUpdateAfterSelect("MSS", tblName, selected_pk, null, selected_value)
                } else if (tblName === "employee") {
                    mod_upload_dict.selected_emplhour_pk = selected_pk;
                   //console.log("mod_upload_dict.selected_emplhour_pk: ", mod_upload_dict.selected_emplhour_pk)
                    el_MSS_input_employee.value = selected_value;
                    el_MSS_btn_save.disabled = false;
                    set_focus_on_el_with_timeout(el_MSS_btn_save , 50)
                }
// ---  Set focus to btn_save
                el_MSS_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }  // MSS_Filter

//=========  MSS_DisableInputBoxes  ================ PR2020-05-09
    function MSS_DisableInputBoxes(disable) {
        //console.log( "===== MSS_DisableInputBoxes ========= ");

// ---  set focus to el_date, disable other input elements
        setTimeout(function (){ el_MSS_input_date .focus() }, 50);

// ---  add_or_remove_attr_with_qsAll(el_container, filter_class, atr_name, is_add, atr_value)
        add_or_remove_attr_with_qsAll(document.getElementById("id_MSS_input_container"), "input", "readOnly", disable, true)
        //el_MSS_input_order.readOnly = true
        //el_MSS_input_shift.readOnly = true
        //el_MSS_input_employee.readOnly = true
        el_MSS_btn_save.disabled = disable
    }  // MSS_DisableInputBoxes

//=========  MSS_Reset_TableAndInputBoxes  ================ PR2020-05-09
    function MSS_Reset_TableAndInputBoxes() {
       //console.log( "===== MSS_Reset_TableAndInputBoxes ========= ");
       //console.log( "mod_upload_dict", mod_upload_dict);

// set header text
        const el_header = document.getElementById("id_MSS_header");
        const employee_code = get_dict_value(mod_upload_dict, ["employee", "code"])
        const header_text = (employee_code) ? loc.Select_shift + " " + loc.for_txt + " " + employee_code : loc.Select_shift + ":"
        el_header.innerText = header_text;
// ---  reset input boxes
        const el_MSS_input_container = document.getElementById("id_MSS_input_container");
        // add_or_remove_attr_with_qsAll(el_container, filter, atr_name, is_add, atr_value){
        //add_or_remove_attr_with_qsAll(el_MSS_input_container, "input", "value", false)
        document.getElementById("id_MSS_input_order").value = null;
        document.getElementById("id_MSS_input_shift").value = null;
        document.getElementById("id_MSS_input_employee").value = null;

        document.getElementById("id_MSS_tblbody_select").innerText = null;

        document.getElementById("id_MSS_replace").checked = true;
        document.getElementById("id_MSS_switch").checked = false;

    }  // MSS_Reset_TableAndInputBoxes

//=========  MSS_GotFocus  ================ PR2020-05-09
    function MSS_GotFocus (tblName, el_input) {
       //console.log(" =====  MSS_GotFocus  ===== ", tblName)
       //console.log("mod_upload_dict.skip_focus_event", mod_upload_dict.skip_focus_event)
        if(mod_upload_dict.skip_focus_event){
            mod_upload_dict.skip_focus_event = false;
        } else {
            if (tblName === "order") {
                el_MSS_input_order.value = null
                el_MSS_input_shift.value = null;
                el_MSS_input_employee.value = null;
                // reset select table when input order got focus
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, mod_upload_dict.selected_order_pk);
            } else if (tblName === "shift") {
                el_MSS_input_shift.value = null;
                el_MSS_input_employee.value = null;
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, mod_upload_dict.selected_shift_pk);
            } else if (tblName === "employee") {
                el_MSS_input_employee.value = null;
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, null);
            }
        }
    }  // MSS_GotFocus

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= Sidebar_FillSelectOptions  ==================================== PR2020-02-27
    function Sidebar_FillSelectOptions() {
        //console.log( "=== Sidebar_FillSelectOptions  ");
        // isabsence can have value: false: without absence, true: absence only, null: show all

        for (let j = 0, len = 3; j < len; j++) {
            let el_select = (j === 0) ? el_sidebar_select_absence :
                            (j === 1) ? el_sidebar_select_restshift :
                                        el_sidebar_select_daynightshift;
            // selected_value not yet initialized
            //const curOption = (selected_value === true) ? 2 : (selected_value === false) ? 1 : 0
            const option_list = (j === 0) ? [loc.With_absence, loc.Without_absence, loc.Absence_only] :
                                (j === 1) ? [loc.With_restshifts, loc.Without_restshifts, loc.Restshifts_only] :
                                            [loc.AllShifts, loc.NightshiftsOnly, loc.DayshiftsOnly, loc.EveningshiftsOnly];
            let option_text = "";
            for (let i = 0, len = option_list.length; i < len; i++) {
                option_text += "<option value=\"" + i.toString() + "\"";
                //if (i === curOption) {option_text += " selected=true" };
                option_text +=  ">" + option_list[i] + "</option>";
            }
            el_select.innerHTML = option_text;
        }
    }  // Sidebar_FillSelectOptions

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

            const today = get_today_ISO()

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
            el_mod_period_datefirst.value = datefirst;
            el_mod_period_datelast.value = datelast;


        }
    }  // ModOrderSelectCustomer

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//========= ModalStatusOpen====================================
    function ModalStatusOpen (el_input) {
       //console.log("===  ModalStatusOpen  =====") ;
        // PERMISSIONS: only hrman can unlock shifts, supervisor can only block shifts PR2020-08-05

        mod_status_dict = {};
// get tr_selected, fldName and emplhour_dict
        let tr_selected = get_tablerow_selected(el_input)
        const fldName = get_attr_from_el(el_input, "data-field");
// get status from field status, not from confirm start/end
        let emplhour_dict = get_itemdict_from_datamap_by_el(el_input, emplhour_map)
       //console.log("emplhour_dict", emplhour_dict) ;

        const status_sum = emplhour_dict.status;

        let btn_save_text = loc.Confirm;

        let time_col_index = 0
        let is_fldName_status = false;

        let field_is_locked = (emplhour_dict.stat_locked || emplhour_dict.stat_pay_locked || emplhour_dict.stat_inv_locked )

        const allow_lock_status = (!field_is_locked);
// only HR-man can unlock, only when not stat_pay_locked and not stat_inv_locked
        const allow_unlock_status = (!emplhour_dict.stat_pay_locked && !emplhour_dict.stat_inv_locked && selected_period.requsr_perm_hrman);

        let field_is_confirmed = false;
        if (fldName === "stat_start_conf" && emplhour_dict.stat_start_conf) {
            field_is_locked = true;
            field_is_confirmed = true;
        } else if (fldName === "stat_start_end" && emplhour_dict.stat_start_end) {
            field_is_locked = true;
            field_is_confirmed = true;
        }

        const child_el = el_input.children[0];

        const col_index = (fldName === "stat_start_conf") ? 5 : 7;
        const time_el = tr_selected.cells[col_index].children[0]
        const has_overlap = (time_el.classList.contains("border_bg_invalid"));

        //const has_overlap = ("overlap" in time_fielddict)
        const has_no_employee = (!emplhour_dict.employee_id)
        const has_no_order = (!emplhour_dict.o_id)
        const has_no_time = ( (fldName === "stat_start_conf" && !emplhour_dict.offsetstart) || (fldName === "stat_end_conf" && !emplhour_dict.offsetend) )

       //console.log("has_no_order", has_no_order) ;
// put values in mod_status_dict
        mod_status_dict = {
            emplhour_pk: emplhour_dict.id,
            emplhour_ppk: emplhour_dict.comp_id,
            field: emplhour_dict.fldName,
            status_sum: emplhour_dict.status,
            locked: field_is_locked,
            confirmed: field_is_confirmed
        }



        let header_text = null;
        if (fldName === "stat_start_conf") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_start_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;

            time_col_index = 5
        } else if (fldName === "stat_start_end") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_end_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;
            time_col_index = 7
        } else if (fldName === "status") {
            is_fldName_status = true;

            if (emplhour_dict.stat_locked) {
                header_text = loc.Unlock + " " + loc.Shift.toLowerCase();
                btn_save_text = loc.Unlock;
            } else {
                header_text = loc.Lock + " " + loc.Shift.toLowerCase();
                btn_save_text = loc.Lock;
            }
            time_col_index = 9
        }

        //console.log("requsr_perm_hrman", selected_period.requsr_perm_hrman)
        //console.log("requsr_perm_supervisor", selected_period.requsr_perm_supervisor)
        //console.log("is_fldName_status", is_fldName_status)
        //console.log("is_fldName_status", is_fldName_status)

// don't open modal when locked and confirmstart / confirmend
        let allow_open = false;
        if (is_fldName_status){
            // PERMITS status field can be opened by supervisor to lock, by hrman to unlock PR20202-08-05
            allow_open = (emplhour_dict.stat_locked) ? selected_period.requsr_perm_hrman : selected_period.requsr_perm_supervisor;
        } else {
            // PERMITS confirm field can only be opened by supervisor
            if (selected_period.requsr_perm_supervisor){
                // cannot open confirm field when time field is locked
                if (!field_is_locked){
                // when field is not confirmed: can only confirm when has employee and has no overlap:
                    if (!field_is_confirmed && !has_overlap) {
                        allow_open = true;
                    } else {
                    // when field is not confirmed: can undo,
                    // also when has_overlap or has_no_employee (in case not allowing confirmation has gone wrong)
                        allow_open = true;
                    }
                }
            }
        }
        //console.log("allow_open", allow_open)

        if (allow_open) {

            document.getElementById("id_mod_status_header").innerText = header_text
            let time_label = null, time_display = null;
            if(fldName === "stat_start_conf"){
                time_label = loc.Start_time + ":";
                time_display = format_time_from_offset_JSvanilla( loc, emplhour_dict.rosterdate, emplhour_dict.offsetstart, true, false, false)
            } else if (fldName === "stat_start_end") {
                time_label = loc.End_time + ":";
                time_display = format_time_from_offset_JSvanilla( loc, emplhour_dict.rosterdate, emplhour_dict.offsetend, true, false, false)
            }
            document.getElementById("id_mod_status_time_label").innerText = time_label;
            document.getElementById("id_mod_status_time").value = time_display;

            document.getElementById("id_mod_status_order").innerText = emplhour_dict.c_o_code;
            document.getElementById("id_mod_status_employee").innerText = emplhour_dict.employeecode;
            document.getElementById("id_mod_status_shift").innerText = (emplhour_dict.shiftcode);

            let msg01_text = null;
            if(has_no_order){
                msg01_text = loc.You_must_first_select + loc.an_order + loc.select_before_confirm_shift;
            } else if(has_no_employee && !is_fldName_status){
                msg01_text = loc.You_must_first_select + loc.an_employee + loc.select_before_confirm_shift;
            } else if(has_overlap && !is_fldName_status){
                msg01_text = loc.You_cannot_confirm_overlapping_shift;
            } else if(has_no_time && !is_fldName_status){
                msg01_text = loc.You_must_first_enter +
                             ( (fldName === "stat_start_conf") ? loc.a_starttime : loc.an_endtime ) +
                             loc.enter_before_confirm_shift;
            }

           //console.log("is_fldName_status", is_fldName_status) ;
           //console.log("allow_lock_status", allow_lock_status) ;

            let show_confirm_box = false;
            if (fldName === "status" && allow_lock_status) {
                show_confirm_box = true;
            } else {
                if(field_is_confirmed) {
                    // when field is confirmed: can undo
                    show_confirm_box = true;
                } else if (!msg01_text){
                    show_confirm_box = true;
                }
            }
            if(show_confirm_box) {
                el_mod_status_btn_save.innerText = btn_save_text;
    // ---  show modal
                $("#id_mod_status").modal({backdrop: true});
            } else {

// ---  show modal confirm with message 'First select employee'
                document.getElementById("id_confirm_header").innerText = loc.Confirm + " " + loc.Shift.toLowerCase();
                document.getElementById("id_confirm_msg01").innerText = msg01_text;
                document.getElementById("id_confirm_msg02").innerText = null;
                document.getElementById("id_confirm_msg03").innerText = null;

                add_or_remove_class (el_confirm_btn_save, cls_hide, true) // args: el, classname, is_add
                el_confirm_btn_cancel.innerText = loc.Close;
                setTimeout(function() {el_confirm_btn_cancel.focus()}, 50);

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

        const id_dict = get_iddict_from_element(el_body);
        // period_datefirst and period_datelast necessary for check_emplhour_overlap PR2020-07-22
        let upload_dict = {id: id_dict,
                            period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast
                            }

        //console.log("---------------status_value: ", status_value);
        //console.log("---------------data_field: ", data_field);
        //console.log("---------------field_is_confirmed: ", field_is_confirmed, typeof field_is_confirmed);
        let status_dict = {}, confirmstart_dict = null, confirmend_dict = null;
        if(data_field === "confirmstart"){
            confirmstart_dict  = {"value": field_is_confirmed, "update": true};
            if (field_is_confirmed) {
                status_dict = {"value": 2, "remove": true, "update": true}  // STATUS_004_START_CONFIRMED = 2
                //console.log("confirmstart field_is_confirmed ", status_dict);
            } else {
                status_dict = {"value": 2, "update": true}  // STATUS_004_START_CONFIRMED = 2
                //console.log("confirmstart field_is_NOT confirmed ", status_dict);
            }
        } else if(data_field === "confirmend"){
            confirmend_dict  = {"value": field_is_confirmed, "update": true};
            if (field_is_confirmed) {
                 status_dict = {"value": 4, "remove": true, "update": true}  // STATUS_016_END_CONFIRMED = 4
                //console.log("confirmend field_is_confirmed ", status_dict);
            } else {
                 status_dict = {"value": 4, "update": true}  // STATUS_016_END_CONFIRMED = 4
                //console.log("confirmend field_is_NOT_confirmed ", status_dict);
            }
        } else if(data_field === "status"){
            if(status_value >= 8){
                status_dict = {"value": 8, "remove": true, "update": true}  // STATUS_032_LOCKED = 8
                //console.log("status status_value >= 8 ", status_dict);
            } else {
                status_dict = {"value": 8, "update": true}   // STATUS_032_LOCKED = 8
                //console.log("status status_value < 8 ", status_dict);
            }
        }
        //console.log("---------------status_dict: ", status_dict);
        upload_dict["status"] = status_dict
        if(!!confirmstart_dict){
            upload_dict["confirmstart"] = confirmstart_dict
        }
        if(!!confirmend_dict){
            upload_dict["confirmend"] = confirmend_dict
        }

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

                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_dict_value (item_dict, ["id", "table"], "")

                        UpdateTblRow(tr_changed, item_dict)
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

                            UpdateTblRow(tblRow, new_dict)
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

//=========  UpdateOverlap  === PR2020-08-06
    function CheckForUpdates() {
        //console.log("===  CheckForUpdates == ");
        const datalist_request = { roster_period: {get: true, now: now_arr}, emplhour: {mode: "emplhour_check"}}
        DatalistDownload(datalist_request, true); // no_loader = true
    }

//=========  UpdateOverlap  === PR2020-05-13
    function UpdateOverlap(overlap_dict, skip_reset_all) {
        //console.log("===  UpdateOverlap == ");
        //console.log(overlap_dict);
        // --- lookup input field with name: fieldname
        // --- lookup input field with name: fieldname
                //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                // CSS.escape not supported by IE, Chrome and Safari,
                // CSS.escape is not necessary, there are no special characters in fieldname
                // a space between two selecors makes it a descendant selector
                // from https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator
        const filter = "[data-field='offsetstart'], [data-field='offsetend']";

// remove all red background from timestart/timeend elements. Not when refreshing one employee
        if(!skip_reset_all){
            let elements = tblBody_datatable.querySelectorAll(filter);
            for (let i = 0, el; el = elements[i]; i++) {
                add_or_remove_class(el, "border_bg_invalid", false)
                add_or_remove_attr(el, "title", false, title_overlap)
            };
        } else {

        }
// loop through overlap_dict
        // overlap_dict: {9057: {end: [9059], start: [9058]}, 9058: {end: [9057, 9059]}, 9059: {start: [9057, 9058]}}
        for(var key in overlap_dict) {
            if(overlap_dict.hasOwnProperty(key)) {
                const item_dict = overlap_dict[key];
                const map_id = "emplhour_" + key.toString();
                const emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, map_id)
                const employee_code = get_dict_value(emplhour_dict, ["employee", "code"], "")
                const row = document.getElementById(map_id)
                if(row){
                    const fields = ["start", "end"];
                    for (let i = 0, field; i<2; i++) {
                        field = fields[i];
                        const filter = "[data-field='time" + field + "']";
                        let el = row.querySelector(filter);
                        if (field in item_dict){
                            let title_overlap = (employee_code) ? employee_code + " " + loc.has_overlapping_shift + ":" :
                                                                  loc.Shift_has_overlap_with + ":"
                            const arr = item_dict[field];
                            for (let j = 0, emplh_pk; emplh_pk = arr[j]; j++) {
                                const emplh_dict = get_mapdict_from_datamap_by_tblName_pk(emplhour_map, "emplhour", emplh_pk.toString())
                                const order = get_dict_value(emplh_dict, ["order", "display"], "")
                                const timestart = get_dict_value(emplh_dict, ["timestart", "display"], "")
                                const timeend = get_dict_value(emplh_dict, ["timeend", "display"], "")
                                const is_restshift = get_dict_value(emplh_dict, ["id", "isrestshift"], "")

                                if(order) {
                                    if(is_restshift){
                                        title_overlap += "\n" + order + ", " + loc.Rest_shift.toLowerCase()
                                        if(timestart || timeend) {title_overlap += " " + timestart + " - " + timeend}
                                    } else {
                                        title_overlap += "\n" + order + ", " + timestart + " - " + timeend
                                    }
                                } else {
                                    title_overlap += "\n" + "<" + loc.Shift_outside_display_period + ">"
                                }
                            }
                            add_or_remove_class(el, "border_bg_invalid", true)
                            add_or_remove_attr(el, "title", true, title_overlap)
                        } else {
// remove red background when field not found in emplhour record
                            add_or_remove_class(el, "border_bg_invalid", false)
                            add_or_remove_attr(el, "title", false, title_overlap)
                        }
                    }
                }
            }
        }
    }

    function CheckStatus() {
        //console.log( "=== CheckStatus ")
        // function loops through emplhours, set questingsmark or warning when toimestrat / enb reached

        // this code converts ISO to date
        // var s = '2014-11-03T19:38:34.203Z';
        //   var b = s.split(/\D+/);
        //  let testdate =  new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
        //console.log( "testdate: ", testdate)
        // TODO
        return false;
        // get now in UTC time
        let now_utc = get_now_utc(comp_timezone);

// --- update current period if necessary
        if(!!selected_period){

            let mode = get_dict_value(selected_period, ["mode"])

            if(mode === "current"){
                let update = false;
                let iso, diff, period_timestart_utc, period_timeend_utc
                // TODO check if 'periodstart' is correct
                iso = get_dict_value(selected_period, ["periodstart"])
                if (!!iso){period_timestart_utc = moment.utc(iso)}
                diff = now_utc.diff(period_timestart_utc);
                //console.log("now: ", now_utc.format(), "start ", period_timestart_utc.format(), "diff ", diff);
                update = (diff < 0)
                if(!update){
                    iso = get_dict_value(selected_period, ["periodend"])
                    if (!!iso){period_timeend_utc = moment.utc(iso)};
                    diff = now_utc.diff(period_timeend_utc);
                    //console.log("now: ", now_utc.format(), "end ", period_timeend_utc.format(), "diff ", diff);
                    update = (diff > 0)
                }
                //if (update) {ModPeriodSave("current")}
             }
               //  if(mode === 'current')
        }  // if(!!selected_period){

// --- loop through tblBody_datatable.rows
        let len =  tblBody_datatable.rows.length;
        if (!!len){
            for (let row_index = 0, tblRow; row_index < len; row_index++) {
                tblRow = tblBody_datatable.rows[row_index];

                let item_dict = get_itemdict_from_datamap_by_tblRow(tblRow, emplhour_map);

                const status_sum = get_dict_value(item_dict, ["status", "value"])
                const start_confirmed = status_found_in_statussum(2, status_sum);//STATUS_004_START_CONFIRMED
                const end_confirmed = status_found_in_statussum(4, status_sum);//STATUS_016_END_CONFIRMED
                const status_locked = (status_sum >= 8) //STATUS_032_LOCKED = 8

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

// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= MSO_MSE_Filter_SelectRows  ====================================
    function MSO_MSE_Filter_SelectRows() {
        //console.log( "===== MSO_MSE_Filter_SelectRows  ========= ");
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
            t_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            t_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_period.customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            t_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_period.customer_pk);

// filter selecttable customer and order
            t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)
            t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_period.customer_pk)
        } //  if (!skip_filter) {
    }; // MSO_MSE_Filter_SelectRows

//========= Filter_TableRows  ====================================
    function Filter_TableRows() {  // PR2019-06-09
       //console.log( "===== Filter_TableRows=== ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tblBody_datatable.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody_datatable.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow_dict(tblRow)
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        };
    }; // Filter_TableRows

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15 PR2020-07-21
        //console.log( "===== ShowTableRow_dict  ========= ");
        //console.log( "filter_dict", filter_dict);
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
        if (tblRow){
            Object.keys(filter_dict).forEach(function(index_str) {
                if(!hide_row){
                    const index = (Number(index_str)) ? Number(index_str) : 0;
                    //console.log("index", index, typeof index )
                    if(index === 10){
                        const filter_value = filter_dict[index];
                        if(filter_value) {
                            const has_changed = Number(get_attr_from_el(tblRow, "data-haschanged", "0"));
                            hide_row = (filter_value !== has_changed);

                        }
                    } else {
                        const filter_value = filter_dict[index];
                        const filter_blank = (filter_value ==="#")
                        const is_img_filter = ([4,6,10].indexOf(index) > -1)
                        let tbl_cell = tblRow.cells[index];
                        if (tbl_cell){
                            let el = tbl_cell.children[0];
                            if (el) {
                        // skip if no filter om this column
                                if(filter_value){
                        // get value from el.value, innerText or data-value
                                    if(index === 10){
                                        const has_changed = get_attr_from_el(tblRow, "data-haschanged", false)
                                        const filter_val = (filter_value) ? true : false;
                                        hide_row = (filter_val !== has_changed);
                                    } else {
                                        let el_value = null;
                                        if (el.tagName === "INPUT"){
                                            el_value = el.value;
                                        } else {
                                            el_value = el.innerText;
                                        }
                                        if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                        if (el_value){
                                            if (filter_blank){
                                                hide_row = true
                                            } else {
                                                el_value = el_value.toLowerCase();
                                                // hide row if filter_value not found
                                                if (el_value.indexOf(filter_value) === -1) {
                                                    hide_row = true
                                                }
                                            }
                                        } else {
                                            if (!filter_blank){
                                                hide_row = true
                                            } // iif (filter_blank){
                                        }   // if (!!el_value)
                                    }
                                }  //  if(!!filter_text)
                            }  // if (!!el) {
                        }  //  if (!!tbl_cell){
                    }  // if(index === 10){
                }  // if(!hide_row){
            });  // Object.keys(filter_dict).forEach(function(key) {
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
       //console.log( "===== ResetFilterRows  ========= ");

        filter_dict = {};
        filter_hide_inactive = true;

// ---   empty filter input boxes in filter header
        t_reset_tblHead_filter(tblHead_datatable)

// ---  deselect highlighted rows, reset selected_emplhour_pk
        selected_emplhour_pk = 0;
        DeselectHighlightedTblbody(tblBody_datatable, cls_selected)

// ---  reset filtered tablerows
        Filter_TableRows();

    }  // function ResetFilterRows


//========= HandleFilterImage  =============== PR2020-07-21
    function HandleFilterImage(el_input, index) {
        //console.log( "===== HandleFilterImage  ========= ");
        //console.log( "index", index);
        //console.log( "filter_dict", filter_dict);
        //filter_dict = [ [], ["", "2", "text"], ["", "z", "text"] ];
        const value = (filter_dict[index]) ? filter_dict[index] : 0;
        const new_value = Math.abs(value - 1);
        filter_dict[index] = new_value
        add_or_remove_class(el_input, "stat_1_0", (new_value === 1), "stat_0_0")
        Filter_TableRows();

    };

//========= HandleFilterKeyup  ====================================
    function HandleFilterKeyup(el, index, el_key) {
        //console.log( "===== HandleFilterKeyup  ========= ");
        //console.log( "el_key", el_key);

        //console.log( "el.value", el.value, index, typeof index);
        //console.log( "el.filter_dict", filter_dict, typeof filter_dict);
        // skip filter if filter value has not changed, update variable filter_text

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
        if (!skip_filter) {
            Filter_TableRows();
        } //  if (!skip_filter) {
    }; // function HandleFilterKeyup


// +++++++++++++++++ END FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= function test printPDF  ====  PR2019-09-02
    function printPDF(log_list) {
            //console.log("printPDF")
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

            //console.log("printPDF before save")
                //To Save
                doc.save('samplePdf');
            //console.log("printPDF after save")
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

//========= UploadTblrowTimepickerResponse  ============= PR2019-10-12 PR2020-08-13
    function UploadTblrowTimepickerResponse(tp_dict) {
        //console.log("=== UploadTblrowTimepickerResponse");
        //console.log("tp_dict", tp_dict);
        // this function uploads TimepickerResponse from tblRow
        let upload_dict = { id: {pk: tp_dict.pk, ppk: tp_dict.ppk, table: tp_dict.table},
                            period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast};
        const fldName = tp_dict.field;
        // new value of quicksave is uploaded to server in ModTimepicker
        if("quicksave" in tp_dict) {is_quicksave = tp_dict.quicksave};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
        // update field in tblRow
            let tblRow = document.getElementById(tp_dict.mapid);
            if(tblRow){
                const col_index = (fldName === "offsetstart") ? 6 :
                                  (fldName === "offsetend") ? 8 :
                                  (fldName === "breakduration") ? 9 :
                                  (fldName === "timeduration") ? 10 : 0;
                let tblCell = tblRow.cells[col_index].children[0];
                if(tblCell) {
                    if ([6, 8].indexOf(col_index) > -1) {
                        tblCell.innerText = format_time_from_offset_JSvanilla( loc, tp_dict.rosterdate, tp_dict.offset,
                            true, false, false)  // true = display24, true = only_show_weekday_when_prev_next_day, false = skip_hour_suffix
                    } else if ([9, 10].indexOf(col_index) > -1) {
                        tblCell.innerText = display_duration (tp_dict.offset, loc.user_lang)
                    }
                }
            }

        // when timeduration has changed: set offsetstart an offsetend to null,
        // otherwise recalc timeduration will override new value of timnedurationn
        if (fldName === "timeduration") {
            upload_dict.offsetstart = {value: null, update: true};
            upload_dict.offsetend = {value: null, update: true};
            upload_dict.breakduration = {value: 0, update: true};
        }
        const url_str = url_emplhour_upload;
        upload_dict[fldName] = {value: tp_dict.offset, update: true};

        const tblName = tp_dict.table;
        const map_id = tp_dict.mapid;
        let tr_changed = document.getElementById(map_id)

        //console.log ("url_str", url_str);
        //console.log ("upload_dict", upload_dict);

        let parameters = {"upload": JSON.stringify (upload_dict)}
        let response;
        $.ajax({
            type: "POST",
            url: url_str,
            data: parameters,
            dataType:'json',
            success: function (response) {
                //console.log ("response", response);
                if ("updated_rows" in response) {
                    RefreshEmplhourMap(response.updated_rows, true)
                }
                if ("overlap_dict" in response) {
                    UpdateOverlap(response["overlap_dict"], true); // true = skip_reset_all
                }
            },
            error: function (xhr, msg) {
                //console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // if("save_changes" in tp_dict) {
 }  //UploadTblrowTimepickerResponse

//========= UploadChanges  ============= PR2019-10-12
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a HTML attribute 'value' with the initial value of the input. - get it with elem.getAttribute('value')
// It also has a DOM property 'value' that holds the current value of the input  - get it with elem.value
// see https://javascript.info/dom-attributes-and-properties
    function UploadChanges(upload_dict, url_str) {
        //console.log("=== UploadChanges");
        //console.log("url_str: ", url_str);

        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)};
            //console.log("upload_dict");
            //console.log(upload_dict);

// if delete: make tblRow red
            const is_delete = (!!get_dict_value(upload_dict, ["id","delete"]))
            if(is_delete){
                const map_id = get_mapid_from_dict (upload_dict);
                b_ShowTblrowError_byID(map_id);
            }  // if(is_delete){

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log("response");
                    //console.log(response);
                    // refresh page on open page or when rosetrdate is added or removes
                    if ("emplhour_rows" in response) {
                        refresh_datamap(response.emplhour_rows, emplhour_map)
                        FillTblRows();
                    };
                    // update changes rows only
                    if ("updated_rows" in response) {
                        RefreshEmplhourMap (response.updated_rows, false)
                    }
                    if ("rosterdate_check" in response) {
                        ModRosterdateChecked(response["rosterdate_check"]);
                    };
                    if ("rosterdate" in response) {
                        ModRosterdateFinished(response["rosterdate"]);
                    };
                    if("emplh_shift_dict" in response){
                        MSS_UploadResponse(response.emplh_shift_dict)
                    }
                    if ("overlap_dict" in response) {
                        UpdateOverlap(response["overlap_dict"], true); // / true  =  skip_reset_all
                    }
                    if ("logfile" in response) {
                        const new_rosterdate = get_dict_value(response, ["rosterdate", "rosterdate", "rosterdate"], "")
                        log_file_name = "logfile_create_roster_" + new_rosterdate;
                        log_list = response.logfile

                        // hide logfile button when when there is no logfile
                        add_or_remove_class (el_MRD_btn_logfile, cls_hide, (!log_list.length))
                    } else {
                        // hide logfile button when when there is no logfile
                        add_or_remove_class (el_MRD_btn_logfile, cls_hide, true)
                    };


                },
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadChanges


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  FillEmplhourMap  ================ PR2020-08-14
    function FillEmplhourMap(emplhour_rows) {
        //console.log(" --- FillEmplhourMap  ---");
        //console.log("emplhour_rows", emplhour_rows);

        emplhour_map.clear();

        if (emplhour_rows && emplhour_rows.length) {
            for (let i = 0, emplhour_dict; emplhour_dict = emplhour_rows[i]; i++) {
                const map_id = emplhour_dict.mapid;
                emplhour_map.set(map_id, emplhour_dict);
            }
        }
        //console.log("emplhour_map", emplhour_map);
    };  // FillEmplhourMap

//=========  RefreshEmplhourMap  ================ PR2020-08-14
    function RefreshEmplhourMap(updated_rows, is_update_check) {
        //console.log(" --- RefreshEmplhourMap  ---");
        if (updated_rows) {
            for (let i = 0, update_dict; update_dict = updated_rows[i]; i++) {
                RefreshEmplhourMapItem(update_dict, is_update_check)
            }
        }
    } // RefreshEmplhourMap

//=========  RefreshEmplhourMapItem  ================ PR2020-08-14
    function RefreshEmplhourMapItem(update_dict, is_update_check) {
        //console.log(" --- RefreshEmplhourMapItem  ---");
        //console.log("is_update_check", is_update_check);
        //console.log("update_dict", update_dict);

// ---  update or add emplhour_dict in emplhour_map
        const map_id = update_dict.mapid;
        const old_map_dict = emplhour_map.get(map_id);
        //console.log("old_map_dict", old_map_dict);

        const is_deleted = update_dict.isdeleted;
        const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

        //console.log("map_id", map_id);
        //console.log("is_created", is_created);
        //console.log("is_deleted", is_deleted);

        let updated_columns = [];
        //console.log("emplhour_map.size before: " + emplhour_map.size);
        if(is_created){
// ---  insert new item in alphabetical order
            //if (emplhour_map.size){
                // inserting at index not necessary, only when reloading page the rows are added in order of emplhour_map
                // insertInMapAtIndex(emplhour_map, map_id, update_dict, 0, user_lang)
            //} else {
            //    emplhour_map.set(map_id, update_dict)
            //}
            emplhour_map.set(map_id, update_dict)
            updated_columns.push("created")
// ---  delete deleted item
        } else if(is_deleted){
            emplhour_map.delete(map_id);
        } else {
// ---  check which fields are updated, add to list 'updated_columns'
            // new emplhour has no old_map_dict PR2020-08-19
            // skip first column (is margin)
            for (let i = 1, col_field, old_value, new_value; col_field = field_settings.field_names[i]; i++) {
                if (col_field in old_map_dict && col_field in update_dict){
                    if (old_map_dict[col_field] !== update_dict[col_field] ) {
                        updated_columns.push(col_field)
                    }
                }
            };

// ---  update item in emplhour_map
            emplhour_map.set(map_id, update_dict)
        }
        //console.log("emplhour_map.size after: " + emplhour_map.size);
        //console.log("updated_columns", updated_columns);

// +++  create tblRow when is_created
        let tblRow = null;
        if(is_created){

        // get info from update_dict
            const pk_int = update_dict.id;
            const ppk_int = update_dict.oh_id;
// get row_index
            // get_excelstart_from_emplhour_dict is needed to give value to excelstart when excelstart is null
            const search_code = update_dict.c_o_code;
            const search_excelstart = get_excelstart_from_emplhour_dict(update_dict);
            let row_index = get_rowindex_by_code_excelstart(search_code, search_excelstart);

// add new tablerow if it does not exist
            //  CreateTblRow(map_id, map_dict, row_index, is_new_item, new_exceldatetime)
            const new_exceldatetime = get_excelstart_from_emplhour_dict(update_dict);
            tblRow = CreateTblRow(map_id, update_dict, row_index, true, new_exceldatetime)
            UpdateTblRow(tblRow, update_dict)
// skip select, highlight and scrollIntoView when is_update_check
            if (!is_update_check){
// set new selected_emplhour_pk
                selected_emplhour_pk = pk_int
// highlight new row
                DeselectHighlightedRows(tblRow, cls_selected);
                tblRow.classList.add(cls_selected)
// scrollIntoView
                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
            }
//////////////////////
        } else {
            tblRow = document.getElementById(map_id);
        }
        if(tblRow){
            if(is_deleted){
//--- remove deleted tblRow
                tblRow.parentNode.removeChild(tblRow);
//--- make tblRow green for 2 seconds
            } else if(is_created){
                ShowOkElement(tblRow);
            } else if(updated_columns){
// ---  make updated fields green for 2 seconds
                for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                    const el = cell.children[0];
                    if(el){
                        const el_field = get_attr_from_el(el, "data-field")
                        if(updated_columns.includes(el_field)){
                            UpdateField(tblRow, el, update_dict)
                            ShowOkElement(cell);
                        }
                    }
                }
            }
        }
    }  // RefreshEmplhourMapItem

//=========  refresh_abscat_map  ======= PR2020-08-14
    function refresh_abscat_map(data_list) {
        //console.log(" --- refresh_abscat_map ---")
        abscat_map.clear();
        if (data_list) {
            const table = "order"
            for (let i = 0, map_dict; map_dict = data_list[i]; i++) {
                // remove tilde (~) from abscat o_code  is done in create_abscat_order_list PR2020-08-18
                //if (map_dict.o_code && map_dict.o_code.includes("~")){map_dict.o_code = map_dict.o_code.replace(/~/g,"")}
                let map_id = "order_" + map_dict.id;
                abscat_map.set(map_id, map_dict);
            }
        }
    };  // refresh_abscat_map


//=========  UpdateFromResponse  ================ PR2019-10-13
    function UpdateFromResponse(tblName, tr_changed, item_dict) {
        //console.log(" --- UpdateFromResponse  ---");
        //console.log(item_dict);

        if (!!item_dict) {
            UpdateTblRow(tr_changed, item_dict)
            const is_created = get_dict_value (item_dict, ["id", "created"], false)
            if (is_created){
// add new empty row
                id_new = id_new + 1
                const pk_new = tblName +  "_new" + id_new.toString()
                const ppk = get_ppk_from_dict (item_dict)

                let new_dict = {"id": {"pk": pk_new, "ppk": ppk}}
                // row_index = -1 (add to end),  is_new_item = true
                let new_row = CreateTblRow(pk_new, ppk, -1, true)

                UpdateTblRow(new_row, new_dict)
            }
        }

//--- remove 'updated, deleted created and msg_err from item_dict
        remove_err_del_cre_updated__from_itemdict(item_dict)

//--- replace updated item in map
        if (tblName === "emplhour"){
            const map_id = get_map_id(tblName, get_dict_value(item_dict, ["pk"]));
           //console.log(">>>>>>>>>>> map_id", map_id);
            emplhour_map.set(map_id, item_dict)
        }

        if ("rosterdate" in response) {
            ModRosterdateFinished(response["rosterdate"]);
        }
    }  // UpdateFromResponse

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++ MOD ROSTERDATE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModRosterdateOpen  ================ PR2020-01-21 PR2020-07-26
    function ModRosterdateOpen(crud_mode) {
        //console.log(" -----  ModRosterdateOpen   ----", crud_mode)

        const is_delete = (crud_mode === "delete")

// show loader in modal
        el_MRD_loader.classList.remove(cls_hide)

// reset mod_upload_dict
        mod_upload_dict = {};

// --- check if rosterdate has emplhour records and confirmed records
        const upload_dict = {"mode":  ( (is_delete) ? "check_delete" : "check_create" )};
        //console.log("upload_dict", upload_dict);
        UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
        // returns function ModRosterdateChecked

// set header and input label
        const hdr_text = (is_delete) ? loc.rosterdate_hdr_delete : loc.rosterdate_hdr_create
        document.getElementById("id_mod_rosterdate_header").innerText = hdr_text;
        document.getElementById("id_mod_rosterdate_label").innerText = loc.Rosterdate + ": "

// set value of el_MRD_rosterdate_input blank, set readOnly = true
        el_MRD_rosterdate_input.value = null
        el_MRD_rosterdate_input.readOnly = true;

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work
        setTimeout(function (){
            el_MRD_rosterdate_input.focus()
        }, 50);

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_class_remove = (is_delete) ? "btn-primary" :  "btn-outline-danger";
       //console.log("loc", loc)
        const btn_text = (is_delete) ? loc.Delete : loc.Create

        el_MRD_btn_ok.innerText = btn_text;
        el_MRD_btn_ok.classList.remove(btn_class_remove)
        el_MRD_btn_ok.classList.add(btn_class_add)
        el_MRD_btn_ok.classList.remove(cls_hide)
        el_MRD_btn_ok.disabled = true;

        el_MRD_btn_cancel.innerText = loc.Cancel;

// ---  show modal
        $("#id_mod_rosterdate").modal({backdrop: true});
    };  // ModRosterdateOpen

// +++++++++  ModRosterdateEdit  ++++++++++++++++++++++++++++++ PR2019-11-12
    function ModRosterdateEdit() {
        //console.log("=== ModRosterdateEdit =========");
        //console.log("mod_upload_dict", mod_upload_dict);
        // called when date input changed

// reset mod_upload_dict, keep 'mode'
        const mode = get_dict_value(mod_upload_dict, ["mode"])
        const is_delete = (mode === "check_delete")
        mod_upload_dict = {"mode": mode}
        //console.log("mode", mode);

// get value from input element
        const new_value = el_MRD_rosterdate_input.value;

// update value of input label
        const label_txt = loc.Rosterdate + ": " + format_dateISO_vanilla (loc, new_value, false, false, true, true);
        // PR2020-08-04 was:  format_date_iso (new_value, loc.months_long, loc.weekdays_long, false, false, user_lang);
        document.getElementById("id_mod_rosterdate_label").innerText = label_txt

// --- check if new rosterdate has emplhour records and confirmed records
        const upload_dict = {mode: mode,
                             rosterdate: new_value
                             };
        UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
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

        el_MRD_btn_ok.innerText = btn_text;
        el_MRD_btn_ok.classList.remove(btn_remove_class)
        el_MRD_btn_ok.classList.add(btn_add_class)
        el_MRD_btn_ok.disabled = true;

        el_MRD_btn_cancel.innerText = loc.Cancel;

// hide logfile button when when there is no logfile
        add_or_remove_class (el_MRD_btn_logfile, cls_hide, (!log_list.length))

    }  // ModRosterdateEdit

// +++++++++  ModRosterdateSave  ++++++++++++++++++++++++++++++ PR2019-11-14 PR2020-07-26
    function ModRosterdateSave() {
        //console.log("=== ModRosterdateSave =========");
        const mode = get_dict_value(mod_upload_dict, ["mode"])
        //console.log("mod_upload_dict", mod_upload_dict);
        //console.log("mode", mode);

// delete logfile when clicked on save button
        log_list = [];
        log_file_name = "";

        const is_delete = (mode === "check_delete")
        const is_another =  get_dict_value(mod_upload_dict, ["another"], false)
        let upload_dict = {};
// --- check another rosterdate when mod_upload_dict.another=true
        if (is_another) {
            mod_upload_dict.another = false;
            // --- check if rosterdate has emplhour records and confirmed records
            upload_dict = {mode: mode};
        } else {
    // set info textboxes
            const info_txt = (is_delete) ? loc.rosterdate_deleting : loc.rosterdate_adding;
            document.getElementById("id_mod_rosterdate_info_01").innerText = info_txt + "...";
            document.getElementById("id_mod_rosterdate_info_02").innerText = null;
            document.getElementById("id_mod_rosterdate_info_03").innerText = null;

            let emplhour_dict = {
                employee_pk: (!!selected_period.employee_pk) ? selected_period.employee_pk : null,
                customer_pk: (!!selected_period.customer_pk) ? selected_period.customer_pk : null,
                order_pk: (!!selected_period.order_pk) ? selected_period.order_pk : null,
                add_empty_shifts: true,
                orderby_rosterdate_customer: true
            };
            upload_dict = { mode: ( is_delete ? "delete" : "create" ),
                              rosterdate: mod_upload_dict.rosterdate,
                              emplhour: emplhour_dict
                            };
        }
// ---  make input field readonly, disable ok btn
        el_MRD_rosterdate_input.readOnly = true;
        el_MRD_btn_ok.disabled = true;
// ---  show loader
        el_MRD_loader.classList.remove(cls_hide);
// ---  Upload Changes:
        UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
    }  // function ModRosterdateSave

// +++++++++  ModRosterdateChecked  ++++++++++++++++++++++++++++++ PR2019-11-13 PR2020-07-26
    function ModRosterdateChecked(response_dict) {
        //console.log("=== ModRosterdateChecked =========" );
        //console.log("response_dict:", response_dict );
        // response_dict: {mode: "last", value: "2019-12-19", count: 10, confirmed: 0}

// add 'checked' to mod_upload_dict, so left button will know it must cancel
        mod_upload_dict = response_dict

        const mode = get_dict_value(response_dict, ["mode"]);
        const is_delete = (mode === "check_delete");

        const rosterdate_iso = get_dict_value(response_dict, ["rosterdate"]);
        const count = get_dict_value(response_dict, ["count"], 0);
        const confirmed = get_dict_value(response_dict, ["confirmed"], false);
        const no_emplhours =  get_dict_value(response_dict, ["no_emplhours"], false);
        const confirmed_only = (count === confirmed);

        let text_list = ["", "", "", ""];
        let hide_ok_btn = false, ok_txt = loc.OK, cancel_txt = loc.Cancel;
// ---  set value of input label
        text_list[0] = loc.Rosterdate + ": " + format_dateISO_vanilla (loc, rosterdate_iso, false, false);
        // PR2020-08-04 was: format_date_iso (rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, user_lang);

// ---  hide rosterdate input when is-delete and no emplhours
        const hide_input_rosterdate = (is_delete && no_emplhours)
        add_or_remove_class(document.getElementById("id_mod_rosterdate_input_div"), cls_hide, hide_input_rosterdate )

        if (no_emplhours){
            text_list[1] = loc.No_rosters;
            if (is_delete) {
                hide_ok_btn = true;
                cancel_txt = loc.Close;
            } else {
                ok_txt = loc.Create;
            }
        } else if(!count){
// ---  This rosterdate has no shifts
            text_list[1] = loc.rosterdate_count_none;
            if (is_delete) {
                hide_ok_btn = true;
                cancel_txt = loc.Close;
            } else {
                ok_txt = loc.Create;
            }
        } else {
// ---  This rosterdate has [count] shifts
            text_list[1] = loc.rosterdate_count
            text_list[1] += ((count === 1) ? loc.one : count.toString()) + " ";
            text_list[1] += ((count === 1) ? loc.Shift.toLowerCase() : loc.Shifts.toLowerCase());

            if(!confirmed){
                text_list[1] += ".";
                // 'These shifts will be replaced.' / deleted
                text_list[2] = ((count === 1) ? loc.rosterdate_shift_willbe : loc.rosterdate_shifts_willbe) +
                                ((is_delete) ? loc.deleted : loc.replaced) + ".";
                text_list[3] =  loc.Do_you_want_to_continue;
                ok_txt = (is_delete) ? loc.Yes_delete :loc.Yes_create;
                cancel_txt = loc.No_cancel;
            } else if(confirmed_only){
                text_list[1] += (confirmed === 1) ? loc.it_is_confirmed_shift : loc.rosterdate_confirmed_all;
                if (is_delete) {
                    text_list[2] = (confirmed === 1) ? loc.It_cannot_be_deleted : loc.They_cannot_be_deleted;
                    hide_ok_btn = true;
                    cancel_txt = loc.Close;
                } else {
                    text_list[2] = (confirmed === 1) ? loc.This_confirmed_shift_willbe_skipped : loc.These_confirmed_shifts_willbe_skipped;
                    text_list[3] =  loc.Do_you_want_to_continue;
                    ok_txt = (is_delete) ? loc.Yes_delete : loc.Yes_create;
                    cancel_txt = loc.No_cancel;
                }
            } else {
                if(confirmed === 1){
                    text_list[1] += ", " + loc.rosterdate_confirmed_one;
                } else {
                    // [confirmed] of them are confirmed shifts.
                    text_list[1] += ", " + confirmed.toString() + " " + loc.rosterdate_confirmed_multiple;
                }
// ---  'Shifts that are not confirmed will be replaced/deleted, confirmed shifts will be skipped.')
                text_list[2] = loc.rosterdate_skip01 +
                               ((is_delete) ? loc.deleted : loc.replaced) +
                               loc.rosterdate_skip02;
                text_list[3] =  loc.Do_you_want_to_continue
                ok_txt = (is_delete) ? loc.Yes_delete : loc.Yes_create;
                cancel_txt = loc.No_cancel;
            }
        }  // if(!count)
        document.getElementById("id_mod_rosterdate_label").innerText = text_list[0];
        document.getElementById("id_mod_rosterdate_info_01").innerText = text_list[1];
        document.getElementById("id_mod_rosterdate_info_02").innerText = text_list[2];
        document.getElementById("id_mod_rosterdate_info_03").innerText = text_list[3];

// hide loader in modal form
        el_MRD_loader.classList.add(cls_hide)

// remove input field readonly
        el_MRD_rosterdate_input.value = get_dict_value(response_dict, ["rosterdate"]);
        el_MRD_rosterdate_input.readOnly = false;

// ---  set button text, hide / disable OK btn, change button color
        el_MRD_btn_ok.classList.remove("btn-secondary")
        if (mode === "check_delete") {
            el_MRD_btn_ok.classList.add("btn-outline-danger");
        } else {
            el_MRD_btn_ok.classList.add("btn-primary");
        }
        el_MRD_btn_ok.innerText = ok_txt;
        el_MRD_btn_ok.disabled = false;
        add_or_remove_class (el_MRD_btn_ok, cls_hide, hide_ok_btn) // args: el, classname, is_add
        el_MRD_btn_cancel.innerText = cancel_txt;

    }  // function ModRosterdateChecked

// +++++++++  ModRosterdateFinished  ++++++++++++++++++++++++++++++ PR2019-11-13
    function ModRosterdateFinished(response_dict) {
        //console.log("=== ModRosterdateFinished =========" );
        //console.log("response_dict", response_dict );
        // rosterdate: {rosterdate: {…}, logfile:
        // response_dict = {mode: "delete", msg_01: "16 diensten zijn gewist."}
        // response_dict = {mode: "create", msg_02: "14 diensten zijn aangemaakt.",
        //                  msg_03: "2 afwezigheid of rustdiensten zijn aangemaakt.",
        //                  logfile: (130) [" ======= Logfile creating roster of: 2020-03-30 ======= ", ...]
        //                  rosterdate: {row_count: 16, rosterdate: "2020-03-30"}
        const mode = get_dict_value(response_dict,["mode"])
        const is_delete = (mode === "delete")

// ---  reset mod_upload_dict
        mod_upload_dict = {another: true,
                           mode: ( (is_delete) ? "check_delete" : "check_create" )
                          }
// ---  hide loader
        el_MRD_loader.classList.add(cls_hide)
// ---  check for overlap
        const datalist_request = {overlap: {get: true}, roster_period: selected_period};
        DatalistDownload(datalist_request, true); // true = no_loader

// ---  set info textboxes
        //const info01_txt = loc.rosterdate_finished + ((is_delete) ? loc.deleted : loc.created) + ".";
        document.getElementById("id_mod_rosterdate_info_01").innerText = get_dict_value(response_dict,["msg_01"]);
        document.getElementById("id_mod_rosterdate_info_02").innerText = get_dict_value(response_dict, ["msg_02"]);
        document.getElementById("id_mod_rosterdate_info_03").innerText = get_dict_value(response_dict, ["msg_03"]);

// ---  put 'another' on ok button, put 'Close' on cancel button
        if (is_delete) {
            el_MRD_btn_ok.innerText = loc.TXT_Delete_another_roster;
            el_MRD_btn_ok.classList.remove("btn-outline-danger");
        } else {
            el_MRD_btn_ok.innerText = loc.TXT_Create_another_roster;
            el_MRD_btn_ok.classList.remove("btn-primary");
        }
        el_MRD_btn_ok.disabled = false;
        el_MRD_btn_ok.classList.add("btn-secondary")
        el_MRD_btn_cancel.innerText = loc.Close;
    }  // function ModRosterdateFinished

//=========  ModRosterdateLogfile  ================ PR2020-03-30
    function ModRosterdateLogfile () {
       //console.log(" ===  ModRosterdateLogfile  =====");
        if (!!log_list && log_list.length > 0 && !!log_file_name) {
            printPDFlogfile(log_list, log_file_name)
        }
    }  // ModRosterdateLogfile

// +++++++++ DeleteShift_Confirm ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  DeleteShift_ConfirmOpen  ================
    function DeleteShift_ConfirmOpen () {
        //console.log(" ===  DeleteShift_ConfirmOpen  =====") ;
        let msg01_txt = null, msg02_txt = null, cancel_delete = false, is_absence = false;
        mod_confirm_dict = {};

// --- get map_dict from emplhour_map
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(emplhour_map, "emplhour", selected_emplhour_pk);
// --- give msg when no emplhour selected
        if(isEmpty(map_dict)) {
            cancel_delete = true;
            msg01_txt = loc.err_msg_select_shift;
        } else {
            mod_confirm_dict.mapid = map_dict.mapid;
            mod_confirm_dict.emplhour_pk = map_dict.id;
            mod_confirm_dict.emplhour_ppk = map_dict.oh_id;

            is_absence = map_dict.c_isabsence;
            const status_sum = map_dict.status;
            let shift_status_txt = null
            if (status_sum > 7) {
                shift_status_txt = loc.err_msg_cannot_delete_shift_locked;
            } else if (status_sum > 1) {
                shift_status_txt = loc.err_msg_cannot_delete_shift_confirmed;
            } else if (status_sum > 0 && !is_absence) {
                shift_status_txt = loc.err_msg_cannot_delete_shift_planned;
                msg02_txt = loc.err_msg_set_hours_to_0_instead
            }
            if (shift_status_txt){
                cancel_delete = true;
                msg01_txt = loc.err_msg_cannot_delete_shift_01 + shift_status_txt + loc.err_msg_cannot_delete_shift_02
            } else {
                const order_code = map_dict.ordercode;
                if(is_absence){
                    const employee_code = map_dict.employeecode;
                    const this_absence_code = (!order_code) ? loc.This_absence + " " : loc.Absence + " '" + order_code + "' "
                    const this_employee_code = (!employee_code) ? loc.This_employee.toLowerCase() :
                                                                loc.Employee.toLowerCase() + " " + employee_code
                    msg01_txt = this_absence_code + loc.of + " " + this_employee_code +  " " + loc.will_be_deleted
                } else {
                    const shift_code = map_dict.shiftcode;
                    const customer_code = map_dict.customercode;
                    const this_shift_code =  (!shift_code) ? loc.This_shift + " "  :  loc.Shift + " '" + shift_code + "' "
                    msg01_txt = this_shift_code + loc.of + " order '" + customer_code + " - " + order_code + "' " + loc.will_be_deleted
                }
                msg02_txt = loc.Do_you_want_to_continue
            }
        }
// ---  put message text in header and msg_elements
        document.getElementById("id_confirm_header").innerText = loc.Delete_shift + "...";
        document.getElementById("id_confirm_msg01").innerText = msg01_txt;
        document.getElementById("id_confirm_msg02").innerText = msg02_txt;
        document.getElementById("id_confirm_msg03").innerText = null;

// ---  set btn text and visibles
        if (cancel_delete){
            el_confirm_btn_cancel.innerText = loc.Close;
            setTimeout(function() {el_confirm_btn_cancel.focus()}, 50);
        } else {
            el_confirm_btn_save.innerText = loc.Yes_delete;
            setTimeout(function() {el_confirm_btn_save.focus()}, 50);
        }
        add_or_remove_class(el_confirm_btn_save, cls_hide, cancel_delete)
        add_or_remove_class(el_confirm_btn_save, "btn-outline-danger", !cancel_delete, "btn-primary")

// ---  show modal
        $("#id_mod_confirm").modal({backdrop: true});

    }  // DeleteShift_ConfirmOpen

//=========  DeleteShift_ConfirmSave  ================ PR2019-06-23
    function DeleteShift_ConfirmSave() {
        //console.log(" --- DeleteShift_ConfirmSave --- ");
        //console.log("mod_confirm_dict: ", mod_confirm_dict);

// - make tblRow red
        const tblRow = document.getElementById(mod_confirm_dict.mapid);
        ShowClassWithTimeout(tblRow, cls_error)

// ---  Upload Changes
        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                            id: {pk: mod_confirm_dict.emplhour_pk,
                                 ppk: mod_confirm_dict.emplhour_ppk,
                                 table: "emplhour",
                                 mapid: mod_confirm_dict.mapid,
                                 delete: true}
                            };
        UploadChanges(upload_dict, url_emplhour_upload) ;

// ---  hide modal
        $("#id_mod_confirm").modal("hide");
    }  // DeleteShift_ConfirmSave

//========= get_rowindex_by_exceldatetime  ================= PR2020-04-10
    function get_rowindex_by_exceldatetime(search_exceldatetime) {
        //console.log(" ===== get_rowindex_by_exceldatetime =====");
        let search_rowindex = -1;
// --- loop through rows of tblBody_datatable
        if(!!search_exceldatetime){
            for (let i = 0, tblRow; i < tblBody_datatable.rows.length; i++) {
                tblRow = tblBody_datatable.rows[i];
                const exceldatetime = Number(get_attr_from_el(tblRow, "data-excelstart"));
                if(!!exceldatetime && exceldatetime > search_exceldatetime) {
// --- search_rowindex = row_index - 1, to put new row above row with higher exceldatetime
                    search_rowindex = tblRow.rowIndex - 1;
                    break;
        }}}
        return search_rowindex
    }  // get_rowindex_by_exceldatetime

//========= get_rowindex_by_code_excelstart  ================= PR2020-08-20
    function get_rowindex_by_code_excelstart(search_code, search_excelstart) {
        //console.log(" ===== get_rowindex_by_code_excelstart =====");
        let search_rowindex = -1;
        if(!search_code){search_code = ""}
        const search_code_lc = search_code.toLowerCase()

// --- loop through rows of tblBody_datatable
        for (let i = 0, tblRow; tblRow = tblBody_datatable.rows[i]; i++) {
            const map_dict = get_mapdict_from_datamap_by_id(emplhour_map, tblRow.id)
            const code_lc = (map_dict.c_o_code) ? map_dict.c_o_code.toLowerCase() : "";
            if(code_lc < search_code_lc) {
                // goto next row
             } else if(code_lc === search_code_lc) {
// --- search_rowindex = row_index - 1, because of header row. Header row has index 0.
                // search on excelstart when code_lc and search_code are the same
                let excelstart = get_excelstart_from_emplhour_dict(map_dict);
                if(excelstart <= search_excelstart) {
                    // goto next row
                } else  if( excelstart > search_excelstart) {
                    search_rowindex = tblRow.rowIndex - 1;
                    break;
                }
            } else if(code_lc > search_code_lc) {
// --- search_rowindex = row_index - 1, to put new row above row with higher excelstart
                search_rowindex = tblRow.rowIndex - 1;
                break;
            }
        }
        if(!search_rowindex || search_rowindex < -1) {search_rowindex = -1};
        if(search_rowindex >= 0){ search_rowindex -= 1 }// subtract 1 because of filter row (I think) // gave error when row_index = -2
        return search_rowindex
    }  // get_rowindex_by_code_excelstart






//??????????????????????????????????????????????????????
// ++++++++++++  MOD ROSTER +++++++++++++++++++++++++++++++++++++++
    "use strict";

// +++++++++++++++++ MODAL ROSTER ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MRO_Open ====================================  PR2019-11-16 PR2020-08-18
    function MRO_Open () {
        //console.log(" =====  MRO_Open  =====") ;
        //console.log("selected_emplhour_pk", selected_emplhour_pk) ;

        const emplhour_mapid = "emplhour_" + selected_emplhour_pk;
        const emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, emplhour_mapid)

        //console.log("emplhour_dict", emplhour_dict) ;
// ---  get tblRow - tblRow is null when no tblRow is selected
        const tblRow = document.getElementById(emplhour_mapid);

// ---  get rosterdate
        let rosterdate = emplhour_dict.rosterdate;
        if(!rosterdate) {
            rosterdate = get_today_ISO()
            if(selected_period.period_datefirst && rosterdate < selected_period.period_datefirst) {rosterdate = selected_period.period_datefirst};
            if(selected_period.period_datelast && rosterdate > selected_period.period_datelast) {rosterdate = selected_period.period_datelast};
        };
        mod_dict = {rosterdate: rosterdate};

// ---  get info from emplhour_dict, not when is_absence
        if(tblRow && !emplhour_dict.c_isabsence){
            mod_dict.rowindex = tblRow.rowIndex;
            mod_dict.order_pk = emplhour_dict.o_id;
            mod_dict.cust_order_code = emplhour_dict.c_o_code;
        }
// ---  reset el_MRO_input fields
        el_MRO_input_date.value = rosterdate;
        el_MRO_input_date.setAttribute("min", selected_period.period_datefirst);
        el_MRO_input_date.setAttribute("max", selected_period.period_datelast);

        el_MRO_input_order.value = null;
        el_MRO_input_shift.value = null;
        el_MRO_input_employee.value = null;

        el_MRO_offsetstart.innerText = null;
        el_MRO_offsetend.innerText = null;
        el_MRO_breakduration.innerText = null;
        el_MRO_timeduration.innerText = null;

        MRE_MRO_SetHeaderAndEnableBtnSave("MRO");

// ---  set focus to el_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        let el_focus = (!mod_dict.order_pk) ? el_MRO_input_order : el_MRO_input_shift;
        setTimeout(function (){ el_focus.focus() }, 50);

        //console.log("mod_dict", mod_dict) ;
// ---  show modal
         $("#id_modrosterorder").modal({backdrop: true});
}; // MRO_Open

//=========  MRO_Save  ================ PR2020-01-29
    function MRO_Save() {
       //console.log("===  MRO_Save =========");
       //console.log( "mod_dict: ", mod_dict);

        // new orderhour and emplhour records are created in  function: create_orderhour_emplhour
        // minimum necessary parameters to create new record:
            // upload_dict is : {id: {create: true},
            //                  rosterdate: {value: mod_dict.rosterdate},
            //                  orderhour: {order_pk: mod_dict.order}}

        // optional parameters for function 'update_emplhour' are:
        // 'update' in every field
        //                      {employee: {pk: mod_dict.selected_employee_pk, update: true},
        //                      {offsetstart: {value: mod_dict.shift.offsetstart, update: true},
        //                      {timeend: {value: mod_dict.shift.offsetend, update: true},


        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                           period_datelast: selected_period.period_datelast,
                           id: {table: "emplhour", create: true},
                           rosterdate: {value: mod_dict.rosterdate},
                           orderhour: {order_pk: mod_dict.order_pk}
                           };
        if(!!mod_dict.rowindex){upload_dict.id.rowindex = mod_dict.rowindex};
        if(mod_dict.order_pk){upload_dict.order = {pk: mod_dict.order_pk, field: "order", update: true}};
        if(mod_dict.selected_employee_pk){upload_dict.employee = {pk: mod_dict.selected_employee_pk, field: "employee", update: true}};
        if(mod_dict.shift_code){upload_dict.shift = {pk: mod_dict.shift_pk, field: "shift", code: mod_dict.shift_code, update: true}};
        if(mod_dict.offsetstart != null){upload_dict.offsetstart = {value: mod_dict.offsetstart, update: true}};
        if(mod_dict.offsetend != null){upload_dict.offsetend = {value: mod_dict.offsetend, update: true}};
        if(mod_dict.breakduration){upload_dict.breakduration = {value: mod_dict.breakduration, update: true}};
        if(mod_dict.offsetstart == null || mod_dict.timeend == null){
            if(mod_dict.timeduration != null){
                upload_dict.timeduration = {value: mod_dict.timeduration, update: true};
            }
        }

        UploadChanges(upload_dict, url_emplhour_upload) ;
// hide modal
        $("#id_modrosterorder").modal("hide");

    }  // MRO_Save

//=========  MRO_MRE_InputKeyup  ================ PR2020-02-29
    function MRO_MRE_InputKeyup(pgeName, tblName, el_input) {
       //console.log( "=== MRO_MRE_InputKeyup  ", tblName)
       //console.log( "el_input.value:  ", el_input.value)

        let tblBody_select = (pgeName === "MSO") ? el_MSO_tblbody_select :
                             (pgeName === "MSE") ? el_MSE_tblbody_select :
                             (pgeName === "MRE") ? el_MRE_tblbody_select :
                             (pgeName === "MRO") ? el_MRO_tblbody_select : null;

        const new_filter = el_input.value

        if (new_filter && tblBody_select.rows.length){

// ---  filter select rows
            // if filter results have only one order: put selected order in el_MRO_input_order
            // filter_dict: {row_count: 1, selected_pk: "730", selected_ppk: "3", selected_value: "Rabo", selected_display: null}
            // selected_pk only gets value when there is one row
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])

       //console.log( "filter_dict:  ", filter_dict)
            if (only_one_selected_pk) {
// ---  get pk of selected item (when there is only one row in selection)
                const pk_int = (!!Number(only_one_selected_pk)) ? Number(only_one_selected_pk) : null;
                MRE_MRO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int)

                 //MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow) {
// ---  set header and btn save enabled
                MRE_MRO_SetHeaderAndEnableBtnSave(pgeName);
            } else {
// ---  if no 'only_one_selected_pk' found: put el_input.value in mod_upload_dict.shift (shift may have custom name)
                if(tblName === "shift") {
                    mod_upload_dict.shift_code = new_filter;
                }
            }  //  if (!!selected_pk) {
        }
    }  // MRO_MRE_InputKeyup

//=========  MRO_MRE_Onfocus  ================ PR2020-08-19
    function MRO_MRE_Onfocus(pgeName, tblName) {
        //console.log("===  MRO_MRE_Onfocus  =====") ;
        MRE_MRO_FillSelectTable(pgeName, tblName, null)
    }  // MRO_MRE_Onfocus

//=========  MRE_MRO_FillSelectTable  ================ PR2020-08-21
    function MRE_MRO_FillSelectTable(pgeName, tblName, selected_pk) {
        //console.log( "===== MRE_MRO_FillSelectTable ========= ");
        //console.log( "pgeName: ", pgeName, "tblName: ", tblName);

        const data_map = (tblName === "customer") ? customer_map : // only used in MSO
                         (tblName === "order") ? order_map :
                         (tblName === "shift") ? shift_map :
                         (tblName === "abscat") ? abscat_map :
                         (tblName === "employee") ? employee_map : null;

        const select_header_text = ( (tblName === "customer") ? loc.Select_customer :
                                     (tblName === "order") ? loc.Select_order :
                                     (tblName === "shift") ?  loc.Select_shift :
                                     (tblName === "abscat") ?  loc.Select_abscat :
                                     (tblName === "employee") ? ( (mod_dict.btn_select === "tab_absence") ? loc.Select_replacement_employee  : loc.Select_employee )  : "" ) + ":";

        const el_header = document.getElementById("id_" + pgeName + "_select_header")
        if(el_header){ el_header.innerText = select_header_text };

        const caption_none = (tblName === "customer") ? loc.No_customers :
                             (tblName === "order") ? loc.No_orders :
                             (tblName === "shift") ?  loc.No_shifts :
                             (tblName === "employee") ? loc.No_employees : "";
        //console.log( "caption_none: ", caption_none);

        let filter_pk = (tblName === "shift") ? mod_dict.order_pk : null;

        let tblBody_select = (pgeName === "MSO") ? el_MSO_tblbody_select :
                        (pgeName === "MSE") ? el_MSE_tblbody_select :
                        (pgeName === "MSE") ? el_MSE_tblbody_select :
                        (pgeName === "MRE") ? el_MRE_tblbody_select :
                        (pgeName === "MRO") ? el_MRO_tblbody_select : null;
        tblBody_select.innerText = null;

        mod_dict.rowcount = 0;
//--- loop through data_map or data_dict
        for (const [map_id, map_dict] of data_map.entries()) {
            MRE_MRO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, -1, selected_pk, mod_dict.rosterdate);
        };
//--- disable sabve btn in MSO when no orders
        const disabled = (pgeName === "MSO" && tblName === "order" &&!mod_dict.rowcount)
            el_MSO_input_order.disabled = disabled;
            el_MSO_btn_save.disabled = disabled;

        if(!mod_dict.rowcount){
            let tblRow = tblBody_select.insertRow(-1);
            const inner_text = (tblName === "order" && mod_dict.customer_pk === 0) ? loc.All_orders : caption_none
            let td = tblRow.insertCell(-1);
            td.innerText = inner_text;

        } else if(mod_dict.rowcount === 1){
            let tblRow = tblBody_select.rows[0]
            if(!!tblRow)
// ---  highlight first row
                tblRow.classList.add(cls_selected)
                if(tblName === "order") {
                    selected_period.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                    // TODO check if correct
                    MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow)
                }
        } else {
// ---  add 'all' at the beginning of the list, only when multiple items found
            if (["MSE", "MSO"].indexOf(pgeName) > -1) {
                MRE_MRO_AddAllToList(tblBody_select, pgeName, tblName);
            }
        }
    }  // MRE_MRO_FillSelectTable

//=========  MRE_MRO_FillSelectRow  ================ PR2020-08-24
    function MRE_MRO_AddAllToList(tblBody_select, pgeName, tblName){
        let map_dict = {};
        if (pgeName === "MSE") {
            const ppk_int = get_dict_value(company_dict, ["id", "pk"]);
            map_dict = {id: 0, comp_id: ppk_int, code: "<" + loc.All_employees + ">"};
        } else if (pgeName === "MSO") {
            if (tblName === "customer") {
                const ppk_int = get_dict_value(company_dict, ["id", "pk"]);
                map_dict = {id: 0, comp_id: ppk_int, c_code: "<" + loc.All_customers + ">"};
            } else {
                const ppk_int =  mod_dict.customer_pk;
                map_dict = {id: 0, c_id: ppk_int, o_code: "<" + loc.All_orders + ">"};
            }
        }
        MRE_MRO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, 0, 0)
    }

//=========  MRE_MRO_FillSelectRow  ================ PR2020-08-18
    function MRE_MRO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, row_index, selected_pk, rosterdate) {
        //console.log( "===== MRE_MRO_FillSelectRow ========= ");
        //console.log( "pgeName: ", pgeName, "tblName: ", tblName);
        //console.log( "map_dict: ", map_dict);

//--- loop through data_map
        let ppk_int = null, code_value = null, add_to_list = false, is_selected_pk = false;
        const pk_int = map_dict.id;

        if(tblName === "customer") {
            ppk_int =  map_dict.comp_id;
            code_value = map_dict.c_code;
            // is_absence is already filtered in sql;
            add_to_list = (!map_dict.inactive);

        } else if(tblName === "order") {
            ppk_int =  map_dict.c_id;
            // remove tilde from code not necessary, is in sql PR2020-8-14
            // was: if(order_code) {order_code.replace(/~/g,"")};
            code_value = (pgeName === "MSO") ? map_dict.o_code : map_dict.c_o_code;
            const within_range = period_within_range_iso(map_dict.datefirst, map_dict.datelast, rosterdate, rosterdate)
            // is_absence is already filtered in sql;
            add_to_list = (!map_dict.inactive && !map_dict.c_inactive && within_range);
            // filter on custiomer_pk when pgeName = MSO
            if (add_to_list && pgeName === "MSO") {
                 add_to_list = (ppk_int === mod_dict.customer_pk)
            }

       } else if(tblName === "shift") {
            ppk_int = map_dict.s_id;
            code_value = map_dict.code;
            const shiftmap_order_pk = map_dict.o_id;
            // PR2020-06-11 debug: no matches because mod_dict.order_pk was str, not number.
            const MROdict_order_pk = (Number(mod_dict.order_pk)) ? Number(mod_dict.order_pk) : null
            add_to_list = (MROdict_order_pk && shiftmap_order_pk === MROdict_order_pk);

       } else if(tblName === "abscat") {
            ppk_int =  map_dict.c_id;
            code_value = map_dict.o_code;
            add_to_list = true;

       } else if(tblName === "employee") {
            ppk_int =  map_dict.comp_id;
            code_value = map_dict.code;
            const within_range = period_within_range_iso(map_dict.datefirst, map_dict.datelast, rosterdate, rosterdate)
            // don't add current employee in list when list is list of replacement employees
            const skip_selected_pk = (!mod_dict.is_add_employee && mod_dict.cur_employee_pk && pk_int === mod_dict.cur_employee_pk)
            add_to_list = (!map_dict.inactive && within_range && !skip_selected_pk);
       }
       if (add_to_list){
            mod_dict.rowcount += 1;
            // selected_pk = 0 means: all customers / orders/ employees
            is_selected_pk = (selected_pk != null && pk_int === selected_pk)
// ---  insert tblRow  //index -1 results in that the new row will be inserted at the last position.
            let tblRow = tblBody_select.insertRow(row_index);
            tblRow.setAttribute("data-pk", pk_int);
// ---  add EventListener to tblRow
            tblRow.addEventListener("click", function() {MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow)}, false )
// ---  add hover to tblRow
            //tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            //tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
            add_hover(tblRow);
// ---  highlight clicked row
            if (is_selected_pk){ tblRow.classList.add(cls_selected)}
// ---  add first td to tblRow.
            let td = tblRow.insertCell(-1);
// --- add a element to td., necessary to get same structure as item_table, used for filtering
            let el = document.createElement("div");
                el.innerText = code_value;
                el.classList.add("mx-1", "tw_180")
            td.appendChild(el);
        };
    }  // MRE_MRO_FillSelectRow

//=========  MRE_MRO_SelecttableClicked  ================ PR2020-08-19
    function MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow) {
        //console.log( "===== MRE_MRO_SelecttableClicked ========= ");
        //console.log( "pgeName:", pgeName, "tblName:", tblName);
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            // when clicked on shift table, pk = shift_code, therefore dont use get_attr_from_el_int NOT RIGHT???
            let pk_int = get_attr_from_el_int(tblRow, "data-pk");
            MRE_MRO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int)
// ---  set header and enable btn save
            MRE_MRO_SetHeaderAndEnableBtnSave(pgeName);
        }
    }  // MRE_MRO_SelecttableClicked

//=========  MRE_MRO_SelecttableUpdateAfterSelect  ================ P2020-08-20
    function MRE_MRO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int) {
        //console.log( "===== MRE_MRO_SelecttableUpdateAfterSelect ========= ");
        //console.log( "tblName:", tblName);
        //console.log( "pk_int:", pk_int, typeof pk_int);
        // pk_int is 0 when clicked on '<all customers>' or '<all orders>'
        const map_id = tblName + "_" + pk_int;
        const data_map = (tblName === "customer") ? customer_map :
                         (tblName === "order") ? order_map :
                         (tblName === "shift") ? shift_map :
                         (tblName === "abscat") ? abscat_map :
                         (tblName === "employee") ? employee_map : null;
        const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
        //console.log( "map_dict:", map_dict);

        let el_focus = null;

        if (tblName === "customer") {
            mod_dict.customer_pk = (!isEmpty(map_dict)) ? map_dict.id : 0;
            mod_dict.customer_code = (mod_dict.customer_pk) ? map_dict.c_code : loc.All_customers;
            mod_dict.order_pk = 0;
            mod_dict.order_code = loc.All_orders;
            mod_dict.cust_order_code = mod_dict.customer_code;
            el_MSO_input_customer.value = mod_dict.customer_code;
            el_MSO_input_order.value = null;
            el_focus = el_MSO_input_order;

        } else if (tblName === "order") {
            mod_dict.order_pk = (!isEmpty(map_dict)) ? map_dict.id : 0;
            mod_dict.cust_order_code = (mod_dict.order_pk) ? map_dict.c_o_code : loc.All_orders;
            mod_dict.order_code = (mod_dict.order_pk) ? map_dict.o_code : loc.All_orders;
            const el_input = (pgeName === "MSO") ? el_MSO_input_order :
                             (pgeName === "MRE") ? el_MRE_input_order :
                             (pgeName === "MRO") ? el_MRO_input_order : null;
            if(el_input) {
                el_input.value = (pgeName === "MSO") ? mod_dict.order_code : mod_dict.cust_order_code
            };
            el_focus =  (pgeName === "MSO") ? el_MSO_btn_save :
                        (pgeName === "MRE") ? el_MRE_input_shift :
                        (pgeName === "MRO") ? el_MRO_input_shift : null;

        } else if (tblName === "shift") {
            mod_dict.shift_pk = map_dict.id;
            mod_dict.shift_code = map_dict.code;
            mod_dict.offsetstart = map_dict.offsetstart;
            mod_dict.offsetend = map_dict.offsetend;
            mod_dict.breakduration = map_dict.breakduration;
            mod_dict.timeduration = map_dict.timeduration;
            mod_dict.isrestshift = map_dict.isrestshift;

            if (pgeName === "MRE"){
                // TODO check, els not on this page
                el_MRE_input_shift.value = mod_dict.shift_code
                setTimeout(function (){el_MRE_input_employee.focus()}, 50);
            } else  if (pgeName === "MRO"){
                el_MRO_input_shift.value = mod_dict.shift_code
                el_MRO_offsetstart.innerText = display_offset_time (loc, mod_dict.offsetstart, false, false);
                el_MRO_offsetend.innerText = display_offset_time (loc, mod_dict.offsetend, false, false);
                el_MRO_breakduration.innerText = display_duration (mod_dict.breakduration, loc.user_lang);
                el_MRO_timeduration.innerText = display_duration (mod_dict.timeduration, loc.user_lang);
            }

            el_focus = (pgeName === "MRE") ? el_MRE_input_employee : el_MRO_input_employee;

        } else if (tblName === "abscat") {
            mod_dict.abscat_pk = map_dict.id;
            mod_dict.abscat_ppk = map_dict.c_id;
            mod_dict.abscat_code = map_dict.o_code;
            mod_dict.abscat_cust_code = map_dict.c_code;

            el_MRE_input_abscat.value = mod_dict.abscat_code;

            el_focus = el_MRE_input_employee;

        } else if (tblName === "employee") {
            mod_dict.selected_employee_pk = map_dict.id;
            mod_dict.selected_employee_ppk = map_dict.comp_id;
            mod_dict.selected_employee_code = (mod_dict.selected_employee_pk) ? map_dict.code : loc.All_employees;

            const el_input = (pgeName === "MRO") ? el_MRO_input_employee :
                             (pgeName === "MRE") ? el_MRE_input_employee :
                             (pgeName === "MSE") ? el_MSE_input_employee : null;
            el_input.value = mod_dict.selected_employee_code;

            el_focus = (pgeName === "MRE") ? el_MRE_btn_save :
                       (pgeName === "MRO") ? el_MRO_btn_save :
                       (pgeName === "MSE") ? el_MSE_btn_save : null;
        }

        let header_text = null;
        if(pgeName === "MSO") {
            if(!mod_dict.customer_pk){
                header_text = loc.All_customers
            } else if (!mod_dict.order_pk){
                header_text = mod_dict.customer_code + " - " + loc.All_orders.toLowerCase();
            } else {
                header_text = mod_dict.customer_code + " - " + mod_dict.order_code;
            }
            document.getElementById("id_MSO_header").innerText = header_text;
        } else if(pgeName === "MSE") {
            //header_text = (mod_dict.selected_employee_pk) ? mod_dict.selected_employee_code : loc.All_employees;
            //document.getElementById("id_MSE_label_employee").innerText = header_text;
        }
    //console.log( "mod_dict:", mod_dict);
// ---   set focus to next input element
        setTimeout(function (){el_focus.focus()}, 50);

    }  // MRE_MRO_SelecttableUpdateAfterSelect

//=========  MRO_InputDateChanged  ================ PR2020-04-14
    function MRO_InputDateChanged () {
       //console.log(" -----  MRO_InputDateChanged   ----")

// ---  reset mod_upload_dict
        mod_dict = {rosterdate: el_MRO_input_date.value};

// ---  reset el_MRO_input fields
        el_MRO_input_order.value = null;
        el_MRO_input_shift.value = null;
        el_MRO_input_employee.value = null;
        el_MRO_offsetstart.innerText = null;
        el_MRO_offsetend.innerText = null;
        el_MRO_breakduration.innerText = null;
        el_MRO_timeduration.innerText = null;

        MRE_MRO_FillSelectTable("MRO", "order", null);

        MRE_MRO_SetHeaderAndEnableBtnSave("MRO");

        setTimeout(function (){el_MRO_input_order.focus()}, 50);

    }  // MRO_InputDateChanged

//=========  MRO_MRE_TimepickerOpen  ================ PR2019-10-12 PR2020-08-13
    function MRO_MRE_TimepickerOpen(el_input, pgeName, calledby) {
        //console.log("=== MRO_MRE_TimepickerOpen ===");
       // called by 'tblRow', MRE (splittime), MRO (offsetstart, offsetend, breakduration, timeduration)

// ---  create tp_dict
        // minoffset = offsetstart + breakduration
        let is_locked = false, is_confirmed = false, rosterdate = null, offset = null;
        let is_restshift = false, fldName = null;
        let offset_value = null, offset_start = null, offset_end = null, break_duration = 0, time_duration = 0;
        let show_btn_delete = true;  // offsetsplit is required
        let map_id = null, pk_int = null, ppk_int = null, tblName = "emplhour";
        if (calledby === "tblRow") {
            let tblRow = get_tablerow_selected(el_input)
            map_id = tblRow.id;

            HandleTblRowClicked(tblRow);

            fldName = get_attr_from_el(el_input, "data-field")
            const map_dict = get_mapdict_from_datamap_by_id(emplhour_map, map_id);
            //console.log("map_dict", map_dict);
                pk_int = map_dict.id;
                ppk_int = map_dict.oh_id;
                is_restshift = map_dict.oh_isrestshift;
                rosterdate = map_dict.rosterdate;
                is_locked = (map_dict.stat_locked || map_dict.stat_pay_locked || map_dict.stat_inv_locked)
                is_confirmed = (fldName === "offsetstart") ? map_dict.stat_start_conf :
                               (fldName === "offsetend") ? map_dict.stat_end_conf : false;

                // offset can have null value, 0 = midnight
                offset_value = map_dict[fldName];

                offset_start = map_dict.offsetstart;
                offset_end = map_dict.offsetend;
                break_duration = map_dict.breakduration;
                time_duration = map_dict.timeduration;
        } else {
            rosterdate = mod_dict.rosterdate;
            offset_start = mod_dict.offsetstart;
            offset_end = mod_dict.offsetend;
            break_duration = mod_dict.breakduration;
            time_duration = mod_dict.timeduration;
            if (calledby === "MRE_splittime") {
                fldName = "offsetsplit";
                show_btn_delete = false;  // offsetsplit is required
                offset_value = mod_dict.offsetsplit;
            } else if (calledby === "MRO_offsetstart") {
                fldName = "offsetstart";
                offset_value = offset_start;
            } else if (calledby === "MRO_offsetend") {
                fldName = "offsetend";
                offset_value = offset_end;
            } else if (calledby === "MRO_breakduration") {
                fldName = "breakduration";
                offset_value = break_duration;
            } else if (calledby === "MRO_timeduration") {
                fldName = "timeduration";
                offset_value = time_duration;
            }
        }
        const minoffset = get_minoffset(fldName, offset_start, break_duration)
        const maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)

        let tp_dict = {table: tblName,  // used in UploadTimepickerResponse
                       field: fldName,  // used in UploadTimepickerResponse
                       page: pgeName,  // used in UploadTimepickerResponse
                       mapid: map_id,
                       pk: pk_int,
                       ppk: ppk_int,
                       rosterdate: rosterdate,
                       offset: offset_value,
                       minoffset: minoffset,
                       maxoffset: maxoffset,
                       isampm: (timeformat === 'AmPm'),
                       quicksave: is_quicksave}

// ---  create st_dict
        const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ? loc.Working_hours :
                               (fldName === "offsetsplit") ? loc.Split_time : "";
        let st_dict = { url_settings_upload: url_settings_upload,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete, imgsrc_deletered: imgsrc_deletered,
                       };

        //console.log("fldName", fldName)
        //console.log("txt_dateheader", txt_dateheader)
        //console.log("st_dict", st_dict)
// ---  open ModTimepicker
        if (calledby === "tblRow") {
            let may_open_timepicker = false;
            if(!is_locked && !is_confirmed){
                // dont open break- or timeduration when restshift
                may_open_timepicker = (["breakduration", "timeduration"].indexOf(fldName) > -1) ? !is_restshift : true;
            }
        //console.log("st_dict", st_dict)

            if (may_open_timepicker) { mtp_TimepickerOpen(loc, el_input, UploadTblrowTimepickerResponse, tp_dict, st_dict) };
        } else {

        //console.log("pgeName", pgeName)
            mtp_TimepickerOpen(loc, el_input, MRE_MRO_UploadTimepickerResponse, tp_dict, st_dict)
        }
    };  // MRO_MRE_TimepickerOpen

//========= MRE_MRO_UploadTimepickerResponse  ============= PR2019-10-12
    function MRE_MRO_UploadTimepickerResponse(tp_dict) {
        //console.log(" === MRE_MRO_UploadTimepickerResponse ===" );
        //console.log("tp_dict", tp_dict);
        //console.log("mod_dict", mod_dict);

        //let upload_dict = {"id": tp_dict["id"]};
        // TODO change to
                let upload_dict = { id: {pk: tp_dict.pk, ppk: tp_dict.ppk, table: tp_dict.table},
                            period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                          };

        // new value of quicksave is uploaded to server in ModTimepicker
        if("quicksave" in tp_dict) {is_quicksave = tp_dict.quicksave};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = get_dict_value_by_key(tp_dict, "field")

// ---  get new value from tp_dict
            let new_offset = get_dict_value(tp_dict, ["offset"])
            //console.log( "new_offset: ", new_offset);

            const shift_dict = mtp_calc_timeduration_minmax(loc, fldName, new_offset,
                                            mod_dict.shift_code,
                                            mod_dict.offsetstart,
                                            mod_dict.offsetend,
                                            mod_dict.breakduration,
                                            mod_dict.timeduration)

// ---  put new value in variable
            mod_dict[tp_dict.field] = new_offset;
            if (fldName === "offsetsplit") {
                const display_offset = display_offset_time (loc, new_offset, false, false);
                document.getElementById("id_MRE_split_time").innerText = display_offset;    // set focus to save button
                // store offsetsplit as offsetend, used to set new endtime in update_emplhour
                //mod_dict.offsetend = new_offset
                setTimeout(function() { el_MRE_btn_save.focus()}, 50);
            } else {
                mod_dict.code = shift_dict.code.value
                mod_dict.offsetstart = shift_dict.offsetstart.value
                mod_dict.offsetend = shift_dict.offsetend.value
                mod_dict.breakduration = shift_dict.breakduration.value
                mod_dict.timeduration = shift_dict.timeduration.value

                el_MRO_offsetstart.innerText = display_offset_time (loc, mod_dict.offsetstart, false, false);
                el_MRO_offsetend.innerText = display_offset_time (loc, mod_dict.offsetend, false, false);
                el_MRO_breakduration.innerText =  display_duration (mod_dict.breakduration, loc.user_lang);
                el_MRO_timeduration.innerText = display_duration (mod_dict.timeduration, loc.user_lang);
                setTimeout(function() { el_MRO_input_employee.focus()}, 50);
            }
        //console.log("tp_dict.page", tp_dict.page)

            MRE_MRO_SetHeaderAndEnableBtnSave (tp_dict.page)
        }  // if("save_changes" in tp_dict) {
     }  //MRE_MRO_UploadTimepickerResponse

//=========  MRE_MRO_SetHeaderAndEnableBtnSave  ================ PR2020-04-12 PR2020-08-18
    function MRE_MRO_SetHeaderAndEnableBtnSave (pgeName) {
        //console.log(" -----  MRE_MRO_SetHeaderAndEnableBtnSave   ----")
        //console.log("pgeName", pgeName)
        //console.log("mod_dict", mod_dict)
        //console.log("mod_dict.order_pk", mod_dict.order_pk)
        //console.log("mod_dict.btn_select", mod_dict.btn_select)
        let header_text = null;

    // ---  create header text
        if(pgeName === "MRE") {
        // ---  give modconfirm message when restshift  -  skip MRE form, rest shift cannot open this form
            //happens in MRE_open
        } else if(pgeName === "MRO") {
            header_text = loc.Add_shift;
            if(mod_dict.order_pk){
                header_text += " " + loc.to + ": " + mod_dict.cust_order_code;
            } else {
                header_text += "...";
            }
            document.getElementById("id_MRO_header").innerText = header_text
        }
// ---  enable save button
         if(pgeName === "MRE") {
         } else if(pgeName === "MRO") {
            let enabled = false;
            if (mod_dict.order_pk){
                 //if shift : if isrestshift: empoyee must be filled in
                 if (mod_dict.shift_pk){
                    enabled = ( (mod_dict.isrestshift && mod_dict.selected_employee_pk)  || (!mod_dict.isrestshift))
                 } else {
                    //if no shift : time start / end or duration must be filled in
                    enabled = (mod_dict.offsetstart != null || mod_dict.offsetend != null || mod_dict.timeduration)
                 }
            }
            el_MRO_btn_save.disabled = (!enabled);
         }
    }  // MRE_MRO_SetHeaderAndEnableBtnSave

// +++++++++++++++++ END OF MODAL ROSTER ORDER +++++++++++++++++++++++++++++++++++++++++++

//=========  MRO_MRE_MSS_FillSelectTable  ================ PR2020-02-29
    function MRO_MRE_MSS_FillSelectTable(pgeName, tblName, selected_pk) {
        //console.log( "===== MRO_MRE_MSS_FillSelectTable ========= ");
        //console.log( "pgeName: ", pgeName);
        //console.log( "tblName: ", tblName);
        //console.log( "selected_pk: ", selected_pk, typeof selected_pk);

        let data_map = new Map();
        let data_dict = {};
        let select_header_text = null;
        let caption_none = null;
        let filter_pk = null;

        if(pgeName === "MSS"){
// ---  hide loader
            const el_loader = document.getElementById("id_MSS_loader");
            el_loader.classList.add(cls_visible_hide);

            const order_dict = mod_upload_dict.emplh_shift_dict;
            const shift_dict = get_dict_value(order_dict, [mod_upload_dict.order_pk]);
            const employee_dict = get_dict_value(shift_dict, [mod_upload_dict.shift_code]);
            if(tblName === "order") {
                data_dict = order_dict;
            } else if(tblName === "shift") {
                data_dict = shift_dict;
            } else if(tblName === "employee") {
                data_dict = employee_dict;
            }
        } else {
            if(tblName === "order") {
                data_map = order_map;
            } else if(tblName === "shift") {
                data_map = shift_map;
                filter_pk = mod_upload_dict.order_pk;
            } else if(tblName === "employee") {
                data_map = employee_map;
            };
        }
        //console.log("data_map", data_map)

        if(tblName === "order") {
            select_header_text = loc.Select_order + ":";
            caption_none = loc.No_orders;
        } else if(tblName === "shift") {
            select_header_text = loc.Select_shift + ":";
            caption_none = loc.No_shifts;
            filter_pk = mod_upload_dict.order_pk;
        } else if(tblName === "employee") {
            if (pgeName === "MSS"){
                select_header_text = loc.Current_teammembers + ":";
            } else {
                select_header_text = loc.Select_employee + ":";
            }
            caption_none = loc.No_employees;
        };
        //console.log("filter_pk", filter_pk)

        let tblBody_select = document.getElementById("id_" + pgeName + "_tblbody_select");
        tblBody_select.innerText = null;

        if (["MRO", "MSS"].indexOf(pgeName) > -1 ){
            document.getElementById("id_" + pgeName + "_select_header").innerText = select_header_text;
        }
        let row_count = 0, has_selected_pk = false;
//--- loop through data_map or data_dict
        if(pgeName === "MSS") {
            for(var key in data_dict) {
                if(data_dict.hasOwnProperty(key)) {
                    const item_dict = data_dict[key];
                    const add_item =  (tblName === "order") ||
                                      (tblName === "shift" && key !== "pk" && key !== "cust_ordr_code") ||
                                      (tblName === "employee" && key !== "shft_code")
                    if (add_item){
                        const code = (tblName === "order") ? get_dict_value(item_dict, ["cust_ordr_code"], "") :
                                     (tblName === "shift") ? key :
                                     (tblName === "employee") ?  get_dict_value(item_dict, ["code"], "") : null
                        const row_dict = {id: {pk: key }, code: {value: code }}
                        if(tblName === "employee"){
                            const employee_pk = get_dict_value(item_dict, ["pk"]);
                            const employee_ppk = get_dict_value(item_dict, ["ppk"]);
                            if(employee_pk){ row_dict.employee_pk = employee_pk};
                            if(employee_ppk){ row_dict.employee_ppk = employee_ppk};
                        }
                        const arr = MRO_MRE_MSS_FillSelectRow(row_dict, tblBody_select, tblName, pgeName, selected_pk, mod_upload_dict.rosterdate)
                        if (arr[0]) { row_count += 1 };  //add_to_list = arr[0];
                        if (arr[1]) { has_selected_pk = true }  //  is_selected_pk = arr[1];
                    }
                }
            };
        } else {
            for (const [map_id, item_dict] of data_map.entries()) {
                //console.log("map_id", map_id)
                //console.log("item_dict", item_dict)

                const arr = MRO_MRE_MSS_FillSelectRow(item_dict, tblBody_select, tblName, pgeName, selected_pk, mod_upload_dict.rosterdate)
                if (arr[0]) { row_count += 1 };  //add_to_list = arr[0];
                if (arr[1]) { has_selected_pk = true }  //  is_selected_pk = arr[1];
            };
        }
        if(row_count === 0){
            let tblRow = tblBody_select.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else if(row_count === 1){
            let tblRow = tblBody_select.rows[0]
            if(!!tblRow)
            // ---  highlight first row
                tblRow.classList.add(cls_selected)
                if (pgeName === "MSS"){
                    if(tblName === "order") {
                        mod_upload_dict.selected_order_pk = get_attr_from_el(tblRow, "data-pk");
                    } else  if(tblName === "shift") {
                         mod_upload_dict.selected_shift_pk = get_attr_from_el(tblRow, "data-pk");
                    }
                } else {
                    if(tblName === "customer") {
                        selected_period.customer_pk = get_attr_from_el_int(tblRow, "data-pk");
                        selected_period.order_pk = 0;
                        MRO_MRE_MSS_SelecttableClicked("MRO", tblName, tblRow);
                    } else if(tblName === "order") {
                        selected_period.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                        MRO_MRE_MSS_SelecttableClicked("MRO", tblName, tblRow)
                    }
                }
        }
        return row_count;
    }  // MRO_MRE_MSS_FillSelectTable

//=========  MRO_MRE_MSS_FillSelectRow  ================ PR2020-05-08
    function MRO_MRE_MSS_FillSelectRow(item_dict, tblBody_select, tblName, pgeName, selected_pk, rosterdate) {
        //console.log( "===== MRO_MRE_MSS_FillSelectRow ========= ", tblName);
        //console.log( "item_dict: ", item_dict);
        //console.log( "tblName: ", tblName);
        //console.log( "selected_pk: ", selected_pk, typeof selected_pk);

//--- loop through data_map
        let pk_int = get_dict_value(item_dict, ["id", "pk"]);
        let ppk_int = get_dict_value(item_dict, ["id", "ppk"]);
        let code_value = get_dict_value(item_dict, ["code", "value"], "");
        const is_inactive = get_dict_value(item_dict, ["inactive", "value"]);
        const date_first = get_dict_value(item_dict, ["datefirst", "value"]);
        const date_last = get_dict_value(item_dict, ["datelast", "value"]) ;
        const within_range = period_within_range_iso(date_first, date_last, rosterdate, rosterdate)

//--- check if item must be added to list
        let add_to_list = false, is_selected_pk = false;
        if(pgeName === "MSS" && tblName === "order") {
            add_to_list = true
        } else if (pgeName === "MSS" && tblName === "shift") {
            add_to_list = true
        } else if (pgeName === "MSS" && tblName === "employee") {
            // 9050: {pk: 2623, ppk: 3, code: "Wu XX Y"}
            // 9050 is emplhour_pk, pk = employee_pk
            add_to_list = true
        } else if(tblName === "order") {
            const is_absence = get_dict_value(item_dict, ["id", "isabsence"])
            const customer_code = get_dict_value(item_dict, ["customer", "code"], "");
            let order_code = get_dict_value(item_dict, ["code", "value"], "");
            // remove tilde from abscat PR2020-8-14
            if(order_code) {order_code.replace(/~/g,"")};
            code_value = customer_code + " - " + order_code;
            const customer_inactive = get_dict_value(item_dict, ["customer", "inactive"])
            add_to_list = (!is_absence && !customer_inactive &&!is_inactive && within_range);

        } else if(tblName === "shift") {
            const order_pk_int = get_dict_value(item_dict, ["id", "order_pk"])
            // PR2020-06-11 debug: no matches because mod_upload_dict.order_pk was str, not number.
            const dict_order_pk_int = (Number(mod_upload_dict.order_pk)) ? Number(mod_upload_dict.order_pk) : null
            add_to_list = (!!dict_order_pk_int && order_pk_int === dict_order_pk_int);
            //console.log("add_to_list", add_to_list, typeof add_to_list)
        } else if(tblName === "employee") {
            const skip_selected_pk = (!!selected_pk &&  pk_int === selected_pk)
            add_to_list = (!is_inactive && within_range && !skip_selected_pk);
        };

        if (add_to_list){

            is_selected_pk = (!!selected_pk &&  pk_int === selected_pk)
//- insert tblRow  //index -1 results in that the new row will be inserted at the last position.
            let tblRow = tblBody_select.insertRow(-1);
            if (pk_int) {tblRow.setAttribute("data-pk", pk_int)};
            if (ppk_int) {tblRow.setAttribute("data-ppk", ppk_int)};
            if (code_value) {tblRow.setAttribute("data-value", code_value)};
            if (item_dict.employee_pk) {tblRow.setAttribute("data-employee_pk", item_dict.employee_pk)};
            if (item_dict.employee_ppk) {tblRow.setAttribute("data-employee_ppk", item_dict.employee_ppk)};
            if (tblName) {tblRow.setAttribute("data-table", tblName)};
//- add hover to tblRow
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
//- add EventListener to tblRow
            tblRow.addEventListener("click", function() {MRO_MRE_MSS_SelecttableClicked(pgeName, tblName, tblRow)}, false )
// ---  highlight clicked row
            if (is_selected_pk){ tblRow.classList.add(cls_selected)}
// - add first td to tblRow.
            let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
            let el = document.createElement("div");
                el.innerText = code_value;
                el.classList.add("mx-1", "tw_180")
            td.appendChild(el);
        } //  if (pk_int !== selected_customer_pk)
        return [add_to_list, is_selected_pk];
    }  // MRO_MRE_MSS_FillSelectRow

// ++++ MOD ROSTER EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// =========  MRE_Open  ================ PR2019-06-23 PR2020-08-22
    function MRE_Open(el_input) {
        //console.log(" =========  MRE_Open  ==========")

// reset mod_dict
        mod_dict = {};

// ---  skip when no tblRow or no emplh_dict
        // MRE_Open is only called by CreateTblRow - there should always be a tblRow and map_dict
        const tblRow = get_tablerow_selected(el_input);
        const map_dict = get_mapdict_from_datamap_by_id(emplhour_map, tblRow.id);
        //console.log("tblRow.id", tblRow.id)
        //console.log("map_dict", map_dict)
        if(tblRow && !isEmpty(map_dict)){
            mod_dict = {rosterdate: map_dict.rosterdate,
                        mapid: map_dict.mapid,
                        isabsence: map_dict.c_isabsence,
                        isrestshift: map_dict.oh_isrestshift,
                        emplhour_pk: map_dict.id,
                        emplhour_ppk: map_dict.oh_id,
                        order_pk: map_dict.o_id,
// ---  get cur_employee from map_dict
                        cur_employee_pk: map_dict.employee_id,
                        cur_employee_ppk: map_dict.comp_id,
                        cur_employee_code: map_dict.employeecode,
// ---  get shift info from map_dict
                        offsetstart: map_dict.offsetstart,
                        offsetend: map_dict.offsetend,
                        breakduration: map_dict.breakduration,
                        offsetsplit: map_dict.offsetend
                      };
        //console.log("mod_dict", mod_dict)

// ---  get btn_select and 'is_add_employee'
            // default btn_select is 'absence' when there is a cur_employee,
            // also when emplhour is absence without employee: to be able to delete absence emplhour without employee
            // otherwise btn_select is 'add_employee'

            mod_dict.is_add_employee = (!mod_dict.cur_employee_pk && !mod_dict.isabsence);
            mod_dict.btn_select = (mod_dict.is_add_employee) ? "add_employee" : "tab_absence";

// ---  give modconfirm message when restshift - skip MRE form, rest shift cannot open this form
            if (!mod_dict.isrestshift){
        // set header text
                const header_text = (mod_dict.cur_employee_code) ? mod_dict.cur_employee_code : loc.Select_employee + ":";
                document.getElementById("id_MRE_header").innerText = header_text

        // reset values in mod_employee
                el_MRE_input_employee.value = null;
                el_MRE_input_abscat.value = null;

                document.getElementById("id_MRE_switch_date").innerText = null;
                document.getElementById("id_MRE_select_shift").innerText = null;

                const display_offset = display_offset_time (loc, mod_dict.offsetsplit, false, false);
                document.getElementById("id_MRE_split_time").innerText = display_offset;

        // put values in el_modemployee_body
                //el_modemployee_body.setAttribute("data-pk", mod_dict.emplhour_pk);
                //el_modemployee_body.setAttribute("data-mapid", mod_dict.mapid);

        // fill select table abscat
                MRE_MRO_FillSelectTable("MRE", "abscat", mod_dict.cur_employee_pk);

        // change label 'replacement' to 'select_employee' if no employee, hide right panel
                let el_body_right = document.getElementById("id_MRE_body_right")
                const data_text = (mod_dict.cur_employee_pk) ? loc.Replacement_employee : loc.Select_employee;
                let el_MRE_label_employee = document.getElementById("id_MRE_label_employee")
                el_MRE_label_employee.innerText = data_text + ":"

        // set button when opening form: absence when cur_employee found, add_employee when no cur_employee
                MRE_btn_SelectAndDisable(mod_dict.btn_select)

        // if 'add_employee': hide select_btns, Set focus to el_mod_employee_input
                //Timeout function necessary, otherwise focus wont work because of fade(300)
                if (mod_dict.is_add_employee){
                    setTimeout(function (){el_MRE_input_employee.focus()}, 50);
                } else if (mod_dict.btn_select === "tab_absence"){
                    setTimeout(function (){ el_MRE_input_abscat.focus()}, 50);
                }

        // ---  show modal
                $("#id_modroster_employee").modal({backdrop: true});
            }  // if (!mod_dict.isrestshift)
        }
    };  // MRE_Open

//=========  MRE_Save  ================ PR2019-06-23 PR2020-08-22
    function MRE_Save(crud_mode) {
        // crud_mode = 'delete' when clicked on MRE delete btn. Deletes absence emplhour or removes employee from emplhour
        // crud_mode = 'save' otherwise
        //console.log("===  MRE_Save ========= crud_mode: ", crud_mode);
        // btn_select are: tab_absence, tab_move, tab_split, tab_switch
        let btn_name = el_modemployee_body.getAttribute("data-action");

        const is_absence = mod_dict.isabsence;
        //console.log("mod_dict", mod_dict);
        //console.log("is_absence", is_absence);
        let tr_changed = document.getElementById(mod_dict.mapid);

        // absence:
        // - mod_dict.isabsence = true when current record is absence record
        // - btn_select = "tab_absence" when current record is absence or will be made absent

// ---  create shift_option, used in EmplhourUploadView
        let shift_option = "none";
        if (!mod_dict.cur_employee_pk) {
           // when emplhour has no employee: selected employee will be added to emplhour in 'update_emplhour'
           shift_option = "enter_employee";
        } else if (is_absence){
            shift_option = "change_absence"
        } else if (mod_dict.btn_select === "tab_absence" && crud_mode !== "delete"){
                // shift_option = "make_absent" if emplhour has employee AND not is_absence
                // AND btn_select = 'tab_absence' AND not clicked on btn 'Delete employee'
            shift_option = "make_absent";
        } else if (mod_dict.btn_select === "tab_split"){
            shift_option = "split_shift";
        } else if (mod_dict.btn_select === "tab_switch"){
            shift_option = "switch_shift";
        }
        //console.log("shift_option", shift_option);

// ---  create id_dict of current emplhour record
        let upload_dict = { id: {pk: mod_dict.emplhour_pk,
                                ppk: mod_dict.emplhour_ppk,
                                table: "emplhour",
                                isabsence: is_absence,
                                shiftoption: shift_option}
                           }

        if (crud_mode === "delete"){
            if (!is_absence){
// ---  when not an absence shift: remove employee from emplhour
                upload_dict.employee  = {field: "employee", pk: null, ppk: null, update: true};
                // remove employee from current row
                MRE_set_fieldvalue_in_tblrow(tr_changed, "employeecode", "---")
            } else {
// ---  when absence shift: delete emplhour row
                // add 'delete' to id_dict, dont add employee dict or abscat dict
                upload_dict.id["delete"] = true;
        // ---  make tblRow red
                // happens in UploadChanges
            }
        } else {
// ---  create employee_dict
            // when absence or split_shift: selected_employee is replacement employee
            if(mod_dict.selected_employee_pk){
                 upload_dict.employee = {field: "employee",
                                            pk: mod_dict.selected_employee_pk,
                                            ppk: mod_dict.selected_employee_ppk,
                                            code: mod_dict.selected_employee_code,
                                            update: true}
            } else {
                 upload_dict.employee = {field: "employee",
                                            pk: null,
                                            code: null, // necessary to make tblRow field blank
                                            update: true}
            }
// ---  put new selected_employee_code in tblRow,
            // - only when  selected_employee_pk has value
            // - not when split_shift or switch_shift (in that case selected_employee is added in new row)
            if(["enter_employee", "make_absent"].indexOf(shift_option) > -1){
                if(mod_dict.selected_employee_pk){
                    MRE_set_fieldvalue_in_tblrow(tr_changed, "employeecode", mod_dict.selected_employee_code)
                }
            }

// ---  create abscat_dict
            if(["make_absent", "change_absence"].indexOf(shift_option) > -1){
                // when abcat has no pk, the default abscat will be saved. abscat_dict = {} gives error.
                upload_dict.abscat = { pk: mod_dict.abscat_pk,
                                        ppk: mod_dict.abscat_ppk,
                                        code: mod_dict.abscat_code,
                                        table: "order",
                                        isabsence: true,
                                        update: true}
            }
            if (shift_option === "split_shift"){
                if(mod_dict.offsetsplit != null){  // offsetsplit = 0 is midnight
                    upload_dict.offsetend = {value: mod_dict.offsetsplit, update: true}
                }
            }

            // when shift_option = "enter_employee":
                // when no employee in emplhour: selected_employee is put in field 'employee' in 'update_emplhour'

            // when shift_option = "make_absent":
            // - create a new absent record with the current employee
            //      if replacement has value: the employee in the current emplhour will be replaced by replacement
            //      If replacement has no value: the employee in the current emplhour will be removed
            // - store replacement as 'employee' in _upload_dict, with 'update'. It will be updated in 'update_emplhour'
            //      when no replacemenet employee given: create employee_dict with 'null,
            //      to remove employee from current emplhour
            //      is taken care of in selected_employee_dict = {pk: null, update: true}

            // when shift_option = "split_shift":
                // emplhour keeps employee. Selected employee is put in new emplhour record
                // put mod_dict.offsetsplit as timeend in upload_dict.
                // timeend is used to change the end time of the current shift in 'update_emplhour'
                // it will update timeend in current emplhour. Format: 'timeend': {'value': -560, 'update': True}}
                // and will be the timestart of the new  emplhour
                // not necessary:  upload_dict.rosterdate, it is retrieved from saved emplhour
                // not necessary:  upload_dict.splitoffsetstart, it is retrieved from saved emplhour

            // when shift_option = "switch_shift":
                // emplhour keeps employee. Seletec employee is put in new emplhour record
                // upload_dict.switchemployee: get current employee from emplhour at server

        }
        /*
                } else if (mod_dict.btn_select === "tab_switchXX"){
                    let el_select_replacement = document.getElementById("id_MRE_select_shift")
                    if(el_select_replacement.selectedIndex > -1){
                            let switch_dict = {};
                            switch_dict["rosterdate"] = get_attr_from_el(selected_option, "data-rosterdate");
                            switch_dict["employee_pk"] = get_attr_from_el_int(selected_option, "data-employee_pk");
                            switch_dict["reployee_pk"] = get_attr_from_el_int(selected_option, "data-reployee_pk");
                            switch_dict["si_pk"] = get_attr_from_el_int(selected_option, "data-si_pk");
                            switch_dict["team_pk"] = get_attr_from_el_int(selected_option, "data-team_pk");
                            switch_dict["tmmbr_pk"] = get_attr_from_el_int(selected_option, "data-tmmbr_pk");
                            switch_dict["eplh_pk"] = get_attr_from_el_int(selected_option, "data-eplh_pk");
                    }        let selected_option = el_select_replacement.options[el_select_replacement.selectedIndex];

        // ---  create replacement_dict - if cur_employee exists and selected_employee exists
               } else if(false){
                    let el_select_replacement = document.getElementById("id_MRE_select_shift")
                    if(el_select_replacement.selectedIndex > -1){
                            switch_dict["rosterdate"] = get_attr_from_el(selected_option, "data-rosterdate");
                            switch_dict["employee_pk"] = get_attr_from_el_int(selected_option, "data-employee_pk");
                            switch_dict["reployee_pk"] = get_attr_from_el_int(selected_option, "data-reployee_pk");
                            switch_dict["si_pk"] = get_attr_from_el_int(selected_option, "data-si_pk");
                            switch_dict["team_pk"] = get_attr_from_el_int(selected_option, "data-team_pk");
                            switch_dict["tmmbr_pk"] = get_attr_from_el_int(selected_option, "data-tmmbr_pk");
                            switch_dict["eplh_pk"] = get_attr_from_el_int(selected_option, "data-eplh_pk");
                    }
                    let selected_option = el_select_replacement.options[el_select_replacement.selectedIndex];
                }
        */

        UploadChanges(upload_dict, url_emplhour_upload);

        $('#id_modroster_employee').modal('hide');
    }  // MRE_Save

//========= MRE_set_fieldvalue_in_tblrow  ============= PR2020-04-13 pr2020-08-14
    function MRE_set_fieldvalue_in_tblrow(tblRow, fldName, new_value) {
        //console.log( "=== MRE_set_fieldvalue_in_tblrow === ");
        if(tblRow){
            for (let i = 1, cell, col_field; cell = tblRow.cells[i]; i++) {
                col_field =  field_settings.field_names[i]
                //console.log( "col_field", col_field);
                if (fldName === field_settings.field_names[i]){
                    if(cell.children[0]){
                        cell.children[0].innerText = new_value;
                        break;
        }}}};
    }

//========= MRE_btn_SelectAndDisable  ============= PR2020-02-20
    function MRE_btn_SelectAndDisable(selected_btn) {
        //console.log( "=== MRE_btn_SelectAndDisable === ", selected_btn);
        if(selected_btn === "tab_move" ) {
            $('#id_modroster_employee').modal('hide');
            MSS_Open ();

        } else{
            // selected_btn:  tab_absence, tab_split, tab_switch
            mod_dict.btn_select = selected_btn;

    // ---  highlight selected button, disable when absence (restshift can't open this modal form)
            let btn_container = document.getElementById("id_MRE_btn_container");
            t_HighlightBtnSelect(btn_container, selected_btn, mod_dict.isabsence);

    // hide select buttons when is_absence and when is_add_employee
            const show_btns = (!mod_dict.isabsence && !mod_dict.is_add_employee)
            show_hide_element(btn_container, show_btns)

    // set text of delete button 'Delete employee', if absence: Delete absence
            el_MRE_btn_delete.innerText = (mod_dict.isabsence) ? loc.Delete_absence : loc.Remove_employee;

    // ---  show only the elements that are used in this selected_btn
            show_hide_selected_elements_byClass("mod_show", selected_btn)

    // ---  hide 'select employee' and 'input employee' only when isabsence (restshift can't open this modal form)
            show_hide_element_by_id("id_MRE_div_input_employee", !mod_dict.isabsence);
            show_hide_element_by_id("id_MRE_div_select_employee", !mod_dict.isabsence);

            let el_MRE_label_employee = document.getElementById("id_MRE_label_employee")

            switch (selected_btn) {
            case "tab_absence":
                el_MRE_label_employee.innerText = loc.Replacement_employee + ":"
                break;
            case "tab_switch":
                el_MRE_label_employee.innerText = loc.Employee_tobe_switched_with + ":"
                el_MRE_input_employee.focus()
                break;
            case "tab_split":
                el_MRE_label_employee.innerText =  loc.Replacement_employee + ":"
                el_MRE_input_employee.focus()
            }
        }
    }  // MRE_btn_SelectAndDisable

//=========  MRE_InputKeyup  ================ PR2019-05-26 PR2020-08-21
    function MRE_InputKeyupXXX(tblName, el_input) {
        // function is called_by 'employee input' and 'abscat input'
        //console.log( "===== MRE_InputKeyup  ========= ");

        const new_filter = el_input.value;
        let skip_filter = false;

        //console.log( "new_filter", new_filter);

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
        let len = el_MRE_tblbody_select.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, row_value, show_row; row_index < len; row_index++) {
                tblRow = el_MRE_tblbody_select.rows[row_index];
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
            // if only one employee found: put in employee input box, and store in mod_dict
            el_input.value = select_value

            // put info of employee in mod_dict.selected_employee, not in mod_dict.selected_employee PR2020-04-19
            // mod_dict.selected_employee_pk must stay empty here, will be added in
            mod_dict.selected_employee_pk = select_pk;
            mod_dict.selected_employee_ppk = select_parentpk;
            mod_dict.selected_employee_code = select_value;

        // TODO get shifts if mode = switch
            if(el_modemployee_body.getAttribute("data-action") === "switch"){
                const cur_employee_pk_int = get_attr_from_el_int(el_modemployee_body, "data-field_pk");
                const cur_employee = get_attr_from_el(el_modemployee_body, "data-field_value");
                const cur_employee_ppk_int = get_attr_from_el_int(el_modemployee_body, "data-field_ppk");
                const cur_rosterdate = get_attr_from_el(el_modemployee_body, "data-rosterdate");

                const datalist_request = {replacement: { action: "switch", rosterdate: cur_rosterdate,
                        employee: cur_employee, employee_pk: cur_employee_pk_int, employee_ppk: cur_employee_ppk_int,
                        reployee: select_value, reployee_pk: select_pk, reployee_ppk: select_parentpk}};
                DatalistDownload(datalist_request);
            }
// Set focus to next input field or save button
            const id_str = (mod_dict.btn_select === "tab_switch") ? "id_MRE_switch_date" : "id_MRE_btn_save";
            document.getElementById(id_str).focus();
        }
    }; // function MRE_InputKeyup

// ++++ END OF MOD ROSTER EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= ModEmployeeFillOptionDates  ====================================
    function ModEmployeeFillOptionDates(replacement_dates) {
       //console.log( "=== ModEmployeeFillOptionDates  ");
        //console.log(replacement_dates);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }

// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0

        let el_select_date = document.getElementById("id_MRE_switch_date")
        el_select_date.innerText = null

        document.getElementById("id_MRE_select_shift").innerText = null

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
                //console.log("dict", dict);
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
        //console.log( "=== ModEmployeeFillOptionsShift  ");
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }

// ---  fill options of select box
        let option_text = "";

        let el_select_shift = document.getElementById("id_MRE_select_shift")
        el_select_shift.innerText = null

        // selected_rosterdate only has value when there is only one rosterdate (called by ModEmployeeFillOptionDates)
        // setfocus on select shift only after clicking date, ie when !selected_rosterdate
        let set_focus = false;
        if (!selected_rosterdate){
            selected_rosterdate = document.getElementById("id_MRE_switch_date").value
            set_focus = (!!selected_rosterdate)
        }
        //console.log("selected_rosterdate", selected_rosterdate);
        //console.log("replacement_list", replacement_list);

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
//###########################################################################
// +++++++++++++++++ VALIDATE +++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ PRINT ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= sort_map  ============= PR2020-04-22
    function sort_map () {
        //console.log(" ======  sort_map  ==========")



    }

//========= PrintReport  ====================================
    function PrintReport(option) { // PR2020-01-25 PR2020-04-22

//--- renew emplhour_list
        let emplhour_list = []
        for (const [map_id, item_dict] of emplhour_map.entries()) {
            emplhour_list.push(item_dict)
        }

        PrintRoster(option, selected_period, emplhour_list, company_dict, loc, imgsrc_warning)
        }  // PrintReport

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++
    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")

// ---  create file Name and worksheet Name
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            const period_text = (selected_period.dates_display_short) ? selected_period.dates_display_short : "";
            let filename = loc.Roster + " " + period_text + ".xlsx";
            let ws_name = loc.Roster;

            let wb = XLSX.utils.book_new()
            let ws = FillExcelRows();

            /* Add worksheet to workbook */
            XLSX.utils.book_append_sheet(wb, ws, ws_name);

            /* Write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ====================================
    function FillExcelRows() {
        //console.log("=== FillExcelRows  =====")
        let ws = {}

        let row_index = 0
// --- company row
        row_index += 1;
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws[("A" + row_index)] = {v: loc.Company + ":", t: "s"};
        ws[("B"+ row_index)] = {v: company , t: "s"};
// --- date row
        //const period_value = display_planning_period (selected_period, loc);
        //ws["A3"] = {v: period_value, t: "s"};
        row_index += 1;
        const today_JS = new Date();
        const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
        ws[("A" + row_index)] = {v: loc.Date + ":", t: "s"};
        ws[("B"+ row_index)] = {v: today_str , t: "s"};

// title row
        row_index += 2;
        let period_text = selected_period.dates_display_long;
        if(selected_period.daynightshift === 1){
            period_text = loc.Night_shifts + " " + loc.of + " " + period_text;
        } else if(selected_period.daynightshift === 2){
            period_text = loc.Day_shifts + " " + loc.of + " " + period_text;
        } else if(selected_period.daynightshift === 3){
            period_text = loc.Evening_shifts + " " + loc.of + " " +period_text;
        }
        ws[("A" + row_index)]  = {v: loc.Period + ":", t: "s"};
        ws[("B" + row_index)] = {v: period_text , t: "s"};

// ---  customer / order row
        if(selected_period.order_pk){
            const cust_order_code = selected_period.customer_code + " - " + selected_period.order_code
            row_index += 1;
            ws[("A" + row_index)] = {v: loc.Order + ":", t: "s"};
            ws[("B" + row_index)] = {v: cust_order_code , t: "s"};
        } else if(selected_period.customer_pk){
            row_index += 1;
            ws[("A" + row_index)] = {v: loc.Customer + ":", t: "s"};
            ws[("B" + row_index)] = {v: selected_period.customer_code , t: "s"};
        }
// ---  employee row
        if(selected_period.employee_pk){
            row_index += 1;
            ws[("A" + row_index)] = {v: loc.Employee + ":", t: "s"};
            ws[("B" + row_index)] = {v: selected_period.employee_code , t: "s"};
        }
// ---  absence row
        if(selected_period.isabsence != null){
            row_index += 1;
            const absence_text = (selected_period.isabsence) ? loc.Absence_only : loc.Without_absence;
            ws[("A" + row_index)] = {v: loc.Absence + ":", t: "s"};
            ws[("B" + row_index)] = {v: absence_text , t: "s"};
        }
// ---  restshift row
        if(selected_period.isrestshift != null){
            row_index += 1;
            const restshift_text = (selected_period.isrestshift) ? loc.Restshifts_only : loc.Without_restshifts;
            ws[("A" + row_index)] = {v: loc.Rest_shifts + ":", t: "s"};
            ws[("B" + row_index)] = {v: restshift_text , t: "s"};
        }
// header row
        const header_rowindex = row_index + 3
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
        if(!!emplhour_map){
            const cell_types = ["n", "s", "s", "s", "s", "s", "s", "n", "n", "s"]
            const col_count =  9 // TODO must be 10 : last col is status= 1 must change in text
            const row_count = emplhour_map.size;
            const first_row = header_rowindex + 2
            const last_row = first_row  + row_count;

// --- loop through data_map
            let row_index = first_row
            for (const [map_id, map_dict] of emplhour_map.entries()) {

        //console.log("map_dict", map_dict)
        //console.log("map_dict", map_dict)
                const offset_start = format_time_from_offset_JSvanilla( loc, map_dict.rosterdate, map_dict.offsetstart, true, false, false)
                const offset_end = format_time_from_offset_JSvanilla( loc, map_dict.rosterdate, map_dict.offsetend, true, false, false)

                let cell_values = [
                    (map_dict.exceldate) ? map_dict.exceldate : "",
                    (map_dict.customercode) ? map_dict.customercode : "",
                    (map_dict.ordercode) ? map_dict.ordercode : "",
                    (map_dict.employeecode) ? map_dict.employeecode : "",
                    (map_dict.shiftcode) ? map_dict.shiftcode : "",

                    (offset_start) ? offset_start : "",
                    (offset_end) ? offset_end : "",
                    (map_dict.breakduration) ? map_dict.breakduration / 60 : 0,
                    (map_dict.timeduration) ? map_dict.timeduration / 60 : 0,
                    (map_dict.status) ? map_dict.status : "",

                    ]
                //console.log(cell_values)
                for (let j = 0; j < col_count; j++) {
                    let cell_index = String.fromCharCode(65 + j) + (row_index).toString()
                    ws[cell_index] = {v: cell_values[j], t: cell_types[j]};
                    if ( j === 0){
                        ws[cell_index]["z"] = "dd mmm yyyy"
                    //} else if ([5, 6].indexOf(j) > -1){
                    //    ws[cell_index]["z"] = "dd mmm yyyy hh:mm"
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
                    {wch:20},
                    {wch:20},
                    {wch:25},
                    {wch:20},
                    {wch:15},
                    {wch:15},
                    {wch:10},
                    {wch:10},
                    {wch:10}
                ];

        }  // if(!!emplhour_map){
        return ws;
    }  // FillExcelRows

// ###################################################################################

}); //$(document).ready(function()