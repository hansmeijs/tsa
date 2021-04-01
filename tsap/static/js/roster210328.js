// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        //<PERMIT> PR2020-10-15
        // - page can be viewed by supervisor, planner, hrman or perm_accman
        // - supervisor can: add / edit / delete (added) records, lock records, add notes
        // - planner can: add and delete rosterdates
        // - hr_manager can lock and unlock records and export data
        // - acc_manager can only read page, export data and add notes
        // - all of them can: export data and add notes

        // <PERMIT> PR2020-11-07
        // - when perm_customers and/or perm_orders have value:
        //   - only records of allowed customers / orders will be retrieved from server
        //   - also absence records of employees of allowed customers / orders
        //   - only new shift from allowed customers / orders can be added
        //   - can add any employee, but filter only on allowed employees
        // map_dict.allowed is false when user has allowed_customers / allowed_orders and employee is not in shift of these orders

        // permits get value when selected_period is downloaded
        let permit_add_delete_rows = false;
        let permit_edit_rows = false;
        let permit_lock_rows = false;
        let permit_unlock_rows = false;
        let permit_add_delete_rosterdates = false;
        let permit_add_notes = false;

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";
        const cls_visible_hide = "visibility_hide";

        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_lightgrey = "tsa_bc_lightgrey";

        const cls_cell_unchanged_even = "cell_unchanged_even";
        const cls_cell_unchanged_odd = "cell_unchanged_odd";

        const cls_selected =  "tsa_tr_selected";
        const cls_btn_selected = "tsa_btn_selected";
        const cls_error = "tsa_tr_error";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_emplhour_download = get_attr_from_el(el_data, "data-emplhour_download_url");
        const url_emplhour_upload = get_attr_from_el(el_data, "data-emplhour_upload_url");
        const url_emplhournote_upload = get_attr_from_el(el_data, "data-emplhournote_upload_url");
        const url_employeenote_upload = get_attr_from_el(el_data, "data-employeenote_upload_url");
        const url_ordernote_upload = get_attr_from_el(el_data, "data-ordernote_upload_url");
        const url_emplhourallowance_upload = get_attr_from_el(el_data, "data-emplhourallowance_upload_url");

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
        let mod_MAL_dict = {};
        let mod_MNO_dict = {};
        let mod_MRD_dict = {};

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
        let emplhournote_rows = {};
        let emplhourstatus_rows = {};
        let emplhourallowance_dict = {};

        let employeenote_rows = {};
        let ordernote_rows = {};

        let allowance_map = new Map();

        let filter_dict = {};
        let filter_mod_employee = "";
        let filter_hide_inactive = true;

        let rosterdate_fill;
        let rosterdate_remove;

// ---  id_new assigns fake id to new records
        let id_new = 0;

        //let payroll_header_row = [];

// --- field settings used in  CreateTblRow and CreateTblHeader
        const field_settings = {
            //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
            field_caption: ["", "Date", "-", "Order", "Shift", "-", "Employee", "-", "Start_time", "-", "End_time", "Break", "Hours", "-", "-", "-"],
            field_names: ["select", "rosterdate", "ordernote", "c_o_code", "shiftcode", "employeenote", "employeecode", "stat_start_conf", "offsetstart", "stat_end_conf", "offsetend", "breakduration", "timeduration", "hasallowance", "hasnote", "status"],
            field_tags: ["div", "input", "div", "input", "input", "div", "input", "div", "input", "div", "input", "input", "input", "div", "div", "div"],
            filter_tags: ["div", "text", "img", "text", "text", "img", "text", "img", "text", "img", "text", "duration", "duration", "status", "status", "status"],
            field_width:  ["016", "090", "020","200", "150", "020","180", "020", "090", "020", "090", "075", "075", "020", "020","020"],
            field_align: ["c", "l","c", "l", "l", "c","l", "r", "l", "r", "l", "l", "l", "l", "c"]
        }
        const fields_allowance = {
            field_caption: ["", "Wage_component", "Description", "Amount_per_unit", "Quantity", ""],
            field_names: ["select", "code", "description", "wagerate", "quantity", "delete"],
            field_tags: ["div", "div", "div", "div", "input", "div"],
            field_width: ["020", "120", "180", "120", "090", "032"],
            field_align: ["c", "l", "l", "r", "r", "c"]
        }
        const fields_select_allowance = {
            field_caption: ["Wage_component", "Description", "Amount_per_unit"],
            field_names: ["code", "description", "wagerate"],
            field_tags: ["div", "div",  "div"],
            field_width: ["150", "180", "120"],
            field_align: ["l", "l", "r"]
        }
// --- trailing spaces, used in data-orderby attr for sorting
        const spaces_48 = " ".repeat(48);

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
            el_MSO_input_customer.addEventListener("focus", function() {MSO_MRE_MRO_OnFocus("MSO", "customer")}, false )
            el_MSO_input_customer.addEventListener("keyup", function(){
                setTimeout(function() {MRE_MRO_MSO_InputKeyup("MSO", "customer", el_MSO_input_customer)}, 50)});
        const el_MSO_input_order = document.getElementById("id_MSO_input_order")
            el_MSO_input_order.addEventListener("focus", function() {MSO_MRE_MRO_OnFocus("MSO", "order")}, false )
            el_MSO_input_order.addEventListener("keyup", function(){
                setTimeout(function() {MRE_MRO_MSO_InputKeyup("MSO", "order", el_MSO_input_order)}, 50)});
        const el_MSO_btn_save = document.getElementById("id_MSO_btn_save")
            el_MSO_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MOD SELECT EMPLOYEE ------------------------------
        const el_MSE_input_employee = document.getElementById("id_MSE_input_employee")
            el_MSE_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSE_InputKeyup()}, 50)});
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

// ---  MOD ALLOWANCE ------------------------------------
        const el_MAL_header = document.getElementById("id_MAL_header")
        const el_MAL_modifiedby = document.getElementById("id_MAL_modifiedby")
        const el_MAL_btn_save = document.getElementById("id_MAL_btn_save")
            el_MAL_btn_save.addEventListener("click", function() {MAL_Save()}, false )

// ---  MOD SELECT ALLOWANCE ------------------------------------
        const el_MSA_input = document.getElementById("id_MSA_input");
        el_MSA_input.addEventListener("keyup", function(event){
            setTimeout(function() {MSA_Filter(el_MSA_input)}, 50)});
        const el_MSA_btn_save = document.getElementById("id_MSA_btn_save")

// ---  MOD NOTE ------------------------------------
        const el_MNO_header = document.getElementById("id_MNO_header")
        const el_MNO_note_container = document.getElementById("id_MNO_note_container")
        const el_MNO_btn_save = document.getElementById("id_MNO_btn_save")
            el_MNO_btn_save.addEventListener("click", function() {MNO_Save()}, false )

// ---  MOD ROSTERDATE ------------------------------------
        const el_MRD_header = document.getElementById("id_MRD_header");
        const el_MRD_label = document.getElementById("id_MRD_label");
        const el_MRD_loader = document.getElementById("id_MRD_loader");
        const el_MRD_rosterdate_input = document.getElementById("id_MRD_input")
            el_MRD_rosterdate_input.addEventListener("change", function() {MRD_InputChange()}, false)
        const el_MRD_msg_container = document.getElementById("id_MRD_msg_container");
        const el_MRD_btn_ok = document.getElementById("id_MRD_btn_ok")
            el_MRD_btn_ok.addEventListener("click", function() {MRD_Save()}, false)
        //const el_MRD_btn_logfile = document.getElementById("id_mod_rosterdate_btn_logfile")
        //    el_MRD_btn_logfile.addEventListener("click", function() {ModRosterdateLogfile()}, false)
        const el_MRD_btn_cancel = document.getElementById("id_MRD_btn_cancel")

// ---  MOD ROSTER EMPLOYEE ------------------------------------
        // --- buttons in btn_container
        let btns = document.getElementById("id_MRE_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {MRE_btn_SelectAndDisable(data_btn)}, false )
        }
// ---  add 'keyup' event handler to input new employee / replacement
        const el_MRE_label_employee = document.getElementById("id_MRE_label_replacement")
        const el_MRE_input_replacement = document.getElementById("id_MRE_input_replacement")
            el_MRE_input_replacement.addEventListener("focus", function() {MSO_MRE_MRO_OnFocus("MRE", "employee")}, false )
            el_MRE_input_replacement.addEventListener("keyup", function() {
                setTimeout(function() {MRE_MRO_MSO_InputKeyup("MRE", "employee", el_MRE_input_replacement)}, 50)});

        const el_MRE_input_abscat = document.getElementById("id_MRE_input_abscat")
            el_MRE_input_abscat.addEventListener("focus", function() {MSO_MRE_MRO_OnFocus("MRE", "abscat")}, false )
            el_MRE_input_abscat.addEventListener("keyup", function() {
                setTimeout(function() {MRE_MRO_MSO_InputKeyup("MRE", "abscat", el_MRE_input_abscat)}, 50)});

        document.getElementById("id_MRE_switch_date").addEventListener("change", function() {ModEmployeeFillOptionsShift()}, false )
        const el_MRE_btn_save = document.getElementById("id_MRE_btn_save")
            el_MRE_btn_save.addEventListener("click", function() {MRE_Save("save")}, false )
        const el_MRE_btn_delete = document.getElementById("id_MRE_btn_delete")
            el_MRE_btn_delete.addEventListener("click", function() {MRE_Save("delete")}, false )

// ---  checkboxes part absent
        const el_MRE_part_absent = document.getElementById("id_MRE_part_absent");
            el_MRE_part_absent.addEventListener("change", function() {MRE_CheckboxChanged(el_MRE_part_absent)}, false )
        const el_MRE_split_before = document.getElementById("id_MRE_split_before");
            el_MRE_split_before.addEventListener("change", function() {MRE_CheckboxChanged(el_MRE_split_before)}, false )
        const el_MRE_split_after = document.getElementById("id_MRE_split_after");
            el_MRE_split_after.addEventListener("change", function() {MRE_CheckboxChanged(el_MRE_split_after)}, false )

// ---  input split_time
        const el_MRE_label_split_time = document.getElementById("id_MRE_label_split_time");
        const el_MRE_split_time = document.getElementById("id_MRE_split_time");
        el_MRE_split_time.addEventListener("click", function() {MRE_MRO_TimepickerOpen(el_MRE_split_time, "MRE", "MRE_splittime")}, false );

// ---  MOD ROSTER ORDER ------------------------------------
        const el_MRO_input_date = document.getElementById("id_MRO_input_date")
            el_MRO_input_date.addEventListener("change", function() {MRO_InputDateChanged()}, false )
        const el_MRO_extraorder = document.getElementById("id_MRO_extraorder");
        const el_MRO_input_order = document.getElementById("id_MRO_input_order")
            el_MRO_input_order.addEventListener("focus", function() {MSO_MRE_MRO_OnFocus("MRO", "order")}, false )
            el_MRO_input_order.addEventListener("keyup", function(){
                setTimeout(function() {MRE_MRO_MSO_InputKeyup("MRO", "order", el_MRO_input_order)}, 50)});
        const el_MRO_input_shift = document.getElementById("id_MRO_input_shift")
            el_MRO_input_shift.addEventListener("focus", function() {MSO_MRE_MRO_OnFocus("MRO", "shift")}, false )
            el_MRO_input_shift.addEventListener("keyup", function(){
                setTimeout(function() {MRE_MRO_MSO_InputKeyup("MRO", "shift", el_MRO_input_shift)}, 50)});
        const el_MRO_input_employee = document.getElementById("id_MRO_input_employee")
            el_MRO_input_employee.addEventListener("focus", function() {MSO_MRE_MRO_OnFocus("MRO", "employee")}, false )
            el_MRO_input_employee.addEventListener("keyup", function(){
                setTimeout(function() {MRE_MRO_MSO_InputKeyup("MRO", "employee", el_MRO_input_employee)}, 50)});
        const el_MRO_offsetstart = document.getElementById("id_MRO_input_offsetstart")
            el_MRO_offsetstart.addEventListener("click", function() {MRE_MRO_TimepickerOpen(el_MRO_offsetstart, "MRO", "MRO_offsetstart")}, false );
        const el_MRO_offsetend = document.getElementById("id_MRO_input_offsetend");
            el_MRO_offsetend.addEventListener("click", function() {MRE_MRO_TimepickerOpen(el_MRO_offsetend, "MRO", "MRO_offsetend")}, false );
        const el_MRO_breakduration = document.getElementById("id_MRO_input_breakduration");
            el_MRO_breakduration.addEventListener("click", function() {MRE_MRO_TimepickerOpen(el_MRO_breakduration, "MRO", "MRO_breakduration")}, false );
        const el_MRO_timeduration = document.getElementById("id_MRO_input_timeduration");
            el_MRO_timeduration.addEventListener("click", function() {MRE_MRO_TimepickerOpen(el_MRO_timeduration, "MRO", "MRO_timeduration")}, false );

        const el_MRO_btn_save = document.getElementById("id_MRO_btn_save")
            el_MRO_btn_save.addEventListener("click", function() {MRO_Save()}, false )

// ---  MODAL STATUS ------------------------------------
        const el_mod_status_time_container= document.getElementById("id_mod_status_time_container")
        const el_mod_status_time_label = document.getElementById("id_mod_status_time_label")
        const el_mod_status_time =  document.getElementById("id_mod_status_time")
            el_mod_status_time.addEventListener("click", function() {MRE_MRO_TimepickerOpen(el_mod_status_time, "mod_status", "mod_status")}, false)
            add_hover(el_mod_status_time);
        const el_mod_status_note = document.getElementById("id_mod_status_note")
        const el_mod_status_lockall_container = document.getElementById("id_mod_status_lockall_container");
        const el_mod_status_lockall_label = document.getElementById("id_mod_status_lockall_label");
        const el_mod_status_lockall = document.getElementById("id_mod_status_lockall");
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

//>>>>>>>>>>>>>>> SET INTERVAL >>>>>>>>>>>>>>>>>>>
        let intervalID = window.setInterval(CheckForUpdates, 60000);  // every 60 seconds
//>>>>>>>>>>>>>>> SET INTERVAL >>>>>>>>>>>>>>>>>>>

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
            customer_rows: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_rows: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            scheme: {istemplate: false, inactive: null},
            //schemeitem: {customer_pk: selected_customer_pk}, // , },
            shift: {istemplate: false},
            //team: {istemplate: false},
            //teammember: {datefirst: null, datelast: null, employee_nonull: false},
            employee_rows: {get: true},
            abscat_rows: {inactive: false},
            allowance_rows: {inactive: false},
            wagecode_rows: {inactive: false}
        };
        DatalistDownload(datalist_request, false);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, no_loader) {
        console.log( "=== DatalistDownload ")
        console.log("request: ", datalist_request)

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
                console.log("response - elapsed time:", (new Date().getTime() - startime) / 1000 )
                console.log(response)

                // hide loader
                el_loader.classList.add(cls_visible_hide)
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                }
                if ("roster_period" in response) {
                    selected_period = response.roster_period;
                    //<PERMIT> PR2020-10-15
                    // - page can be viewed by supervisor, planner, hrman or perm_accman
                    // - supervisor can: edit records, add records, delete added records, lock records, add notes
                    // - planner can: add and delete rosterdates
                    // - hr_manager can lock and unlock records and export data
                    // - acc_manager can only read page, export data and add notes
                    // - all of them can: export data and add notes
                    permit_add_delete_rows = !!selected_period.requsr_perm_supervisor
                    permit_edit_rows = !!selected_period.requsr_perm_supervisor
                    permit_lock_rows = !!selected_period.requsr_perm_supervisor
                    permit_unlock_rows = !!selected_period.requsr_perm_hrman

                    permit_add_notes = (!!selected_period.requsr_perm_supervisor || !!selected_period.requsr_perm_planner ||
                                        !!selected_period.requsr_perm_hrman || !!selected_period.requsr_perm_accman)

                    const permit_has_allowed_customers = (!!selected_period.requsr_perm_customers && !!selected_period.requsr_perm_customers.length);
                    const permit_has_allowed_orders = (!!selected_period.requsr_perm_orders && !!selected_period.requsr_perm_orders.length);
                    permit_add_delete_rosterdates = (!!selected_period.requsr_perm_planner && !permit_has_allowed_customers && !permit_has_allowed_orders)

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
                if ("employee_rows" in response) {b_refresh_datamap(response.employee_rows, employee_map, "employee")};
                if ("customer_rows" in response) {b_refresh_datamap(response.customer_rows, customer_map, "customer")};
                if ("order_rows" in response) {b_refresh_datamap(response.order_rows, order_map, "order")};
                if ("shift_rows" in response) {b_refresh_datamap(response.shift_rows, shift_map, "shift")};
                if ("abscat_rows" in response) {b_refresh_datamap(response.abscat_rows, abscat_map, "abscat")}
                if ("allowance_rows" in response) {b_refresh_datamap(response.allowance_rows, allowance_map, "wagecode")}

                let fill_table = false, check_status = false;
                // emplhournote_rows must come before refresh_updated_emplhour_rows and fill_table
                if ("emplhourallowance_rows" in response) {
                    emplhourallowance_dict = response.emplhourallowance_rows;
                    UpdateAllowance(emplhourallowance_dict);

                    }
                if ("emplhournote_rows" in response) {
                    emplhournote_rows = response.emplhournote_rows;
                    UpdateEmplhourNotes(response.emplhournote_rows);
                    }
                if ("emplhourstatus_rows" in response) {
                    emplhourstatus_rows = response.emplhourstatus_rows;
                    UpdateEmplhourStatus(emplhourstatus_rows);
                    }
                if ("employeenote_rows" in response) {
                    employeenote_rows = response.employeenote_rows;
                    UpdateEmployeeOrderNotes("employeenote", employeenote_rows)}
                if ("ordernote_rows" in response) {
                    ordernote_rows = response.ordernote_rows;
                    UpdateEmployeeOrderNotes("ordernote", ordernote_rows)}
                if ("emplhour_rows" in response) {
                    FillEmplhourMap(response.emplhour_rows);
                    fill_table = true;
                    check_status = true;
                }
                if("emplhourallowance_updates" in response){
                    RefreshEmplhourAllowanceRows(response.emplhourallowance_updates)
                }
                if ("emplhournote_updates" in response) {
                    RefreshEmplhourNoteRows(response.emplhournote_updates)
                }

                if ("emplhour_updates" in response) {
                    refresh_updated_emplhour_rows(response.emplhour_updates, true)
                };
                if ("overlap_dict" in response) {
                    UpdateOverlap(response.overlap_dict, false); // / false  = don't skip_reset_all
                }
                if ("replacement_list" in response) {
                    b_refresh_datamap(response["replacement_list"], replacement_map)
                    ModEmployeeFillOptionDates(replacement_map);
                    fill_table = true;
                    check_status = true;
                }

                if ("quicksave" in response) {
                    is_quicksave = get_dict_value(response, ["quicksave", "value"], false);
                }

                if (fill_table) {
                    FillTblRows()
                }

                Sidebar_DisplaySelectText();

                if (check_status) {

// check for overlap, also get emplhourallowance and emplhournote (and emplhourstatus
                    // these are also called in MRD_Finished, after adding / deleting rosterdate
                    const datalist_request = {
                        overlap: {get: true},
                        emplhourallowance: {get: true},
                        emplhournote: {get: true},
                        emplhourstatus: {get: true},
                        employeenote: {get: true},
                        ordernote: {get: true},
                        roster_period: selected_period};
                    DatalistDownload(datalist_request, true); // true = no_loader
                    CheckStatus()
                }
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)
                console.log(msg + '\n' + xhr.responseText);
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

        if (permit_add_delete_rows){
            AddSubmenuButton(el_submenu, loc.Add_shift, function() {MRO_Open()}, []);
            AddSubmenuButton(el_submenu, loc.Delete_shift, function() {DeleteShift_ConfirmOpen()}, ["mx-2"]);
        }
        AddSubmenuButton(el_submenu, loc.Show_roster, function() {PrintReport("preview")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Download_roster, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);

        // for testing only AddSubmenuButton(el_submenu, "CheckForUpdates", function() {CheckForUpdates()}, ["mx-2"]);

        if (permit_add_delete_rosterdates){
            AddSubmenuButton(el_submenu, loc.Create_roster, function() {MRD_Open("create")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Delete_roster, function() {MRD_Open("delete")}, ["mx-2"]);
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

// ###############################################################
//========= FillTblRows === PR2020-08-12
    function FillTblRows() {
        //console.log(" ===== FillTblRows =====");
// --- reset tblBody
        tblBody_datatable.innerText = null;

// --- create table header and filter row
        CreateTblHeader();

// --- loop through emplhour_map
        if(emplhour_map) {
            let previous_oh_id = null, is_odd_row = false;
            for (const [map_id, map_dict] of emplhour_map.entries()) {
                if(previous_oh_id !== map_dict.oh_id) {is_odd_row = !is_odd_row};
                previous_oh_id = map_dict.oh_id;
        //console.log("employeecode", map_dict.employeecode);
        //console.log("map_dict.oh_id", map_dict.oh_id);
        //console.log("previous_oh_id", previous_oh_id);
        //console.log("is_odd_row", is_odd_row);
                const tblRow = CreateTblRow(map_id, map_dict, -1, false, is_odd_row)
                UpdateTblRow(tblRow, map_dict)
            }
        }
    }  // FillTblRows


//=========  CreateTblHeader  === PR2020-07-21 PR2020-08-13 PR2021-03-23
    function CreateTblHeader() {
        //console.log("===  CreateTblHeader ==");

        const tblName = "emplhour";

// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null

// +++  create header and filter row ++++++++++++++++++++++++++++++++
        let tblRow_header = tblHead_datatable.insertRow (-1);
        let tblRow_filter = tblHead_datatable.insertRow (-1);
            tblRow_filter.setAttribute("data-filterrow", "1")

// - insert th's into header row
        const column_count = field_settings.field_names.length;
        for (let j = 0; j < column_count; j++) {
            const key = field_settings.field_caption[j];
            const caption = (loc[key]) ? loc[key] : key;
            //payroll_header_row.push(caption);

            const field_name = field_settings.field_names[j];
            const field_tag = field_settings.field_tags[j];
            const filter_tag = field_settings.filter_tags[j];
            const class_width = "tw_" + field_settings.field_width[j];
            const class_align = "ta_" + field_settings.field_align[j];

// ++++++++++ create header row +++++++++++++++
    // --- add th to tblRow_header +++
            let th = document.createElement("th");
    // --- add div to th, margin not working with th
                let el = document.createElement("div");
                    if ( ["ordernote", "employeenote", "stat_start_conf", "stat_end_conf", "status", "hasallowance", "hasnote"].includes(field_name)) {
                        const class_name = (field_name === "stat_start_conf") ? "stat_0_2" :
                                           (field_name === "stat_end_conf") ? "stat_0_3" :
                                           (field_name === "hasallowance") ? "edit_0_7" :
                                           ( ["ordernote", "employeenote", "hasnote"].includes(field_name)) ? "edit_0_1" :
                                           (field_name === "status") ? "stat_0_4" : "";
                        el.classList.add(class_name)
                    } else {
                        el.innerText = caption;
                    }
    // --- add width, text_align
                    el.classList.add(class_width, class_align);
                th.appendChild(el);
            tblRow_header.appendChild(th);

// ++++++++++ create filter row +++++++++++++++
    // --- add th to tblRow_filter.
            th = document.createElement("th");
    // --- create element with tag from field_tags
                el = document.createElement(field_tag);
    // --- add data-field Attribute.
                    el.setAttribute("data-field", field_name);
                    el.setAttribute("data-filtertag", filter_tag);
    // --- add EventListener to el_filter
                    if ( ["status"].includes(field_name)) {
                        el.addEventListener("click", function(event){HandleFilterImage(el, j)});
                        el.classList.add("stat_0_0")
                        el.classList.add("pointer_show");
                    } else {
                        el.addEventListener("keyup", function(event){HandleFilterKeyup(el, j, event)});
    // --- add other attributes
                        el.setAttribute("autocomplete", "off");
                        el.setAttribute("ondragstart", "return false;");
                        el.setAttribute("ondrop", "return false;");
                    }
    // --- add width, text_align
                    el.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                th.appendChild(el);
            tblRow_filter.appendChild(th);
        }
    };  //  CreateTblHeader


//=========  CreateTblRow  ===== PR2020-08-12 PR2021-03-02
    function CreateTblRow(map_id, map_dict, row_index, is_new_item, is_odd_row) {
        //console.log("=========  CreateTblRow =========");
        //console.log("map_dict", map_dict);

        const tblName = "emplhour";

// +++  insert tblRow into tblBody at row_index
        let tblRow = tblBody_datatable.insertRow(row_index);
        tblRow.id = map_id;
        //tblRow.setAttribute("data-table", tblName);
        tblRow.setAttribute("data-pk", map_dict.id);
        tblRow.setAttribute("data-odd", is_odd_row);

// ---  add data-orderby attribute to tblRow, for ordering new rows
        // happens in UpdateTblRow

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow);}, false )

//+++ insert td's into tblRow
        const column_count = field_settings.field_names.length;
        for (let j = 0; j < column_count; j++) {
    // --- insert td element,
            let td = tblRow.insertCell(-1);
    // --- create div element
            let el = document.createElement("div");
    // --- add data-field Attribute
            const field_name = field_settings.field_names[j];
            el.setAttribute("data-field", field_name);
    // --- add img to confirm_start, confirm_end and status elements
            if (["stat_start_conf", "stat_end_conf", "status"].includes(field_name)){
                if(permit_lock_rows || permit_unlock_rows){
                    el.addEventListener("click", function() {ModalStatusOpen(el)}, false)
                    el.classList.add("stat_0_0")
                    add_hover(el)
                    // may open modconfirm depends if status = locked.
                    // therefore set add_hover and pointer_show in UpdateTblRow
                };

            } else if (field_name === "hasallowance"){
                    // everybody may see notes, permit_add_notes is used in MAL_Open
                    el.addEventListener("click", function() {MAL_Open(el)}, false)
                    el.classList.add("edit_0_0", "pointer_show")
                    add_hover(el)
            } else if ( ["ordernote", "employeenote", "hasnote"].includes(field_name)){
                    // everybody may see notes, permit_add_notes is used in MNO_open
                    el.addEventListener("click", function() {MNO_Open(el)}, false)
                    el.classList.add("edit_0_0", "pointer_show")
                    add_hover(el)
            } else {
    // --- add input element to td.
                //el.setAttribute("type", "text");
                //el.classList.add("input_text"); // makes background transparent
    // --- add EventListeners, only when has PERMITS supervisor
                if(permit_edit_rows){
                    if (["rosterdate", "shiftcode"].includes(field_name)){
                        el.disabled = true;
                        el.classList.add("tsa_color_darkgrey");
                    } else if (["c_o_code", "employeecode"].includes(field_name)){
                        el.addEventListener("click", function() {MRE_Open(el)}, false )
                        add_hover(el)
                    } else if (["offsetstart", "offsetend", "breakduration", "timeduration"].includes(field_name)){
                        el.addEventListener("click", function() {MRE_MRO_TimepickerOpen(el, "tblRow", "tblRow")}, false)
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

// ---  alternate row background color
        const class_background = (is_odd_row) ? cls_cell_unchanged_even : cls_cell_unchanged_odd;
        tblRow.classList.add(class_background);

        return tblRow
    };// CreateTblRow

//========= UpdateTblRow ====== PR2020-08-12 PR2021-02-04
    function UpdateTblRow(tblRow, map_dict){
        //console.log(" ------  UpdateTblRow  ------");
        //console.log("tblRow", tblRow);
        //console.log("map_dict", map_dict);

        if (tblRow && !isEmpty(map_dict)) {
            const confirmed_any = (map_dict.stat_start_conf || map_dict.stat_end_conf);
            const is_pay_or_inv_locked = (map_dict.stat_pay_locked || map_dict.stat_inv_locked);
            const is_locked = (is_pay_or_inv_locked || map_dict.stat_locked);
            const status_array = b_get_status_array(map_dict.status);

            const data_haschanged = (map_dict.haschanged) ? "1" : "0";
            tblRow.setAttribute("data-haschanged", data_haschanged);

            let order_by = t_get_orderby_exceldate_cocode_excelstart(map_dict, spaces_48);
            tblRow.setAttribute("data-orderby", order_by);


// --- loop through cells of tblRow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                // el is first child of td, td is cell of tblRow
                let el = tblRow.cells[i].children[0];
                UpdateField(tblRow, el, map_dict, is_pay_or_inv_locked, is_locked, status_array)
            }  //  for (let j = 0; j < 8; j++)

        };  // if (!!map_dict && !!tblRow)
    }  // UpdateTblRow

///////////////////////////////////////
//========= UpdateField ====== PR2020-08-23
    function UpdateField(tblRow, el, map_dict, is_pay_or_inv_locked, is_locked, status_array){
        //console.log(" ------  UpdateField  ------");
        //console.log("tblRow", tblRow);
        //console.log("map_dict", map_dict);

        if (el && !isEmpty(map_dict)) {
            const has_changed = map_dict.haschanged;

            const is_pay_or_inv_locked = (map_dict.stat_pay_locked || map_dict.stat_inv_locked);
            const is_locked = (is_pay_or_inv_locked || map_dict.stat_locked);

            const fldName = get_attr_from_el(el, "data-field");
            let inner_text = null, filter_value = null;
            if (fldName === "rosterdate") {
                // function format_dateISO_vanilla (loc, date_iso, hide_weekday, hide_year, is_months_long, is_weekdays_long)
                inner_text = format_dateISO_vanilla (loc, map_dict.rosterdate, false, true);
                filter_value = inner_text;

            } else if (fldName === "c_o_code") {
                const abscat_enabled = (!is_locked && map_dict.c_isabsence && permit_edit_rows);
                inner_text = (map_dict.c_o_code) ? map_dict.c_o_code : "\n";
                filter_value = (map_dict.c_o_code) ? map_dict.c_o_code.toLowerCase() : "";
                el.disabled = !abscat_enabled
                add_or_remove_class(el, "tsa_color_darkgrey", !abscat_enabled )
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", abscat_enabled)
                // add title when text longer dan 24 characters
                const title = (map_dict.c_o_code && map_dict.c_o_code.length > 24) ? map_dict.c_o_code : null;
                add_or_remove_attr (el, "title", (!!title), title);

            } else if (fldName === "shiftcode") {
                inner_text = (map_dict.oh_isrestshift) ? (map_dict.shiftcode) ? map_dict.shiftcode + " (R)" : loc.Rest_shift : map_dict.shiftcode;
                filter_value = (inner_text && inner_text !== "-") ? inner_text.toLowerCase() : "";
                if(!inner_text) {inner_text = "\n"}
                if (map_dict.oh_isrestshift) {
                    el.title = loc.This_isa_restshift;
                }
            } else if (fldName === "employeecode") {
                // disable field employee when is_locked, also when is_restshift or is_absence
                const employee_enabled = (!is_locked && !map_dict.oh_isrestshift && !map_dict.c_isabsence && permit_edit_rows);
                let value = map_dict.employeecode;
                // PR2021-03-22 do't add asterisk, is confusing
                // add * in front of name when is_replacement
                // if(map_dict.eh_isrpl) {value = "*" + value}
                filter_value = (value) ? value.toLowerCase() : "";
                // put any character in field, to show pointer
                inner_text = (value) ? value : "---";
                add_or_remove_class(el, "tsa_color_darkgrey", !employee_enabled)
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", employee_enabled)
                // add title when text longer dan 20 characters
                const title = (map_dict.employeecode && map_dict.employeecode.length > 20) ? map_dict.employeecode : null;
                add_or_remove_attr (el, "title", (!!title), title);

            } else if (["offsetstart", "offsetend"].includes( fldName )){
                const confirmed_any = (map_dict.stat_start_conf || map_dict.stat_end_conf);
                const offset_enabled = (!is_locked && !confirmed_any && permit_edit_rows);
                const offset = (fldName === "offsetstart") ? map_dict.offsetstart : map_dict.offsetend;
                inner_text = format_time_from_offset_JSvanilla( loc, map_dict.rosterdate, offset, true, false, false)
                filter_value = inner_text;
                 // true = display24, false = only_show_weekday_when_prev_next_day, false = skip_hour_suffix
                if(!inner_text) {inner_text = "\n"}
                add_or_remove_class(el, "tsa_color_darkgrey", !offset_enabled)
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", offset_enabled)

            } else if (["timeduration", "breakduration"].includes( fldName )){
                const confirmed_any = (map_dict.stat_start_conf || map_dict.stat_end_conf);
                const offset_enabled = (!is_locked && !confirmed_any && permit_edit_rows);
                const duration = (fldName === "timeduration") ? map_dict.timeduration : map_dict.breakduration;
                inner_text = display_duration (duration, loc.user_lang)
                filter_value = duration;
                // give warning when daylight saving time has changed. Just check if offsetend - offsetstart = duration
                if (fldName === "timeduration") {
                    if (map_dict.offsetstart != null && map_dict.offsetend != null && map_dict.timeduration) {
                        if(map_dict.offsetend - map_dict.offsetstart - map_dict.breakduration !== map_dict.timeduration ) {
                            inner_text += "*";
                            el.title = loc.dst_warning;
                        }
                    }
                }
                if(!inner_text) {inner_text = "\n"}
                add_or_remove_class(el, "tsa_color_darkgrey", !offset_enabled)
                // hover doesn't show when el is disabled PR2020-07-22
                add_or_remove_class (el, "pointer_show", offset_enabled)

            } else if (["stat_start_conf", "stat_end_conf"].includes( fldName )){
                // keep value of haschanged = false, don't show haschanged in these columns
                const arr = b_get_status_class(loc, fldName, map_dict.status, is_pay_or_inv_locked, false);
                const icon_class = arr[0];
                el.className = icon_class;
                filter_value = icon_class;

                // PERMITS supervisor can confirm and undo confirm. Must come after el.className = icon_class_confirmed;
                const is_enabled = (!is_pay_or_inv_locked && permit_lock_rows && !is_locked) ||
                                   (!is_pay_or_inv_locked && permit_unlock_rows)
                if (is_enabled ){
                    //add_hover(el);
                    //el.classList.add("pointer_show")
                };
                add_hover(el);

            } else if (["status"].includes(fldName )){
                const modified_dateJS = parse_dateJS_from_dateISO(map_dict.eh_modat);
                const modified_date_formatted = format_datetime_from_datetimeJS(loc, modified_dateJS)
                const modified_by = (map_dict.u_usr) ? map_dict.u_usr : "-";

                const arr = b_get_status_class(loc, fldName, map_dict.status, is_pay_or_inv_locked, map_dict.haschanged);

                let title = arr[1];
                if(has_changed){
                    title += "\n" + loc.Modified_by + modified_by + "\n" + loc._on_ + modified_date_formatted
                }
                el.title = (title) ? title : null;
                el.className = arr[0];  // icon_class = arr[0];
                filter_value = arr[0];  // icon_class = arr[0];

                // PERMITS hrman can unlock, supervisor can only lock PR20202-08-05
                const is_enabled = (!is_pay_or_inv_locked && permit_lock_rows && !is_locked) ||
                                   (!is_pay_or_inv_locked && permit_unlock_rows)
                if (is_enabled ){ add_hover(el); el.classList.add("pointer_show")};

            } else if (fldName === "hasallowance"){
                // icon hasallowance wil be added by UpdateAllowance
            } else if (fldName === "hasnote"){
                // icon and title of note will be added by UpdateEmplhourNote
            }  // if (fldName === "rosterdate")

// ---  put value in innerText and title
            el.innerText = inner_text;

// ---  add attribute filter_value
            if(filter_value){
                el.setAttribute("data-filter", filter_value)
            } else {
                el.removeAttribute("data-filter")
            }
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
        const item_dict = get_mapdict_from_datamap_by_el(el, emplhour_map);
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
        const emplhour_dict = get_mapdict_from_datamap_by_id (emplhour_map, tr_clicked.id)
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

        //PR2020-11-12 debug: shows empty select table when data not yet retrieved from server
        // solved by first checking if loc has values
        if(!isEmpty(loc)){
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
        }
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
            const customer_code = customer_dict.code;

            let order_code = null;
            if(!!selected_period.order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_period.order_pk)
                order_code = order_dict.code;
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

        //PR2020-11-12 debug: shows 'undefined' in header and table when data not yet retrieved from server
        // solved by first checking if loc has values
        if(!isEmpty(loc)){
            mod_dict = {customer_pk: 0, order_pk: 0};
            el_MSO_input_customer.value = null;
            el_MSO_input_order.value = null;

    // ---  fill select table 'customer'
            MSE_MSO_MRE_MRO_FillSelectTable("MSO", "customer", 0);

    // ---  set header text
            document.getElementById("id_MSO_header").innerText = loc.All_customers

            MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave("MSO");
    // ---  Set focus to el_MSO_input_customer
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){ el_MSO_input_customer.focus() }, 50);
    // ---  show modal
             $("#id_modselectcustomerorder").modal({backdrop: true});
         }
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
        $("#id_modselectcustomerorder").modal("hide");
    }  // MSO_Save

// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//========= MSE_Open ====================================  PR2020-02-27  PR2020-08-24
    function MSE_Open (mode) {
        //console.log(" ===  MSE_Open  =====") ;
        //PR2020-11-12 debug: shows 'undefined' in header and table when data not yet retrieved from server
         // solved by first checking if loc has values
        if(!isEmpty(loc)){
            mod_dict = {employee_pk: 0};
            el_MSE_input_employee.value = null;

    // ---  fill select table 'employee'
            MSE_MSO_MRE_MRO_FillSelectTable("MSE", "employee", 0);

    // ---  set header text
            document.getElementById("id_ModSelEmp_hdr_employee").innerText = loc.Select_employee

    // ---  hide button /remove employee'
            document.getElementById("id_MSE_div_btn_remove").classList.add(cls_hide)

    // ---  Set focus to el_MSE_input_employee
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){el_MSE_input_employee.focus()}, 50);

    // ---  show modal
             $("#id_mod_select_employee").modal({backdrop: true});
         }
}; // MSE_Open

//=========  MSE_Save  ================ PR2020-01-29
    function MSE_Save() {
        //console.log("===  MSE_Save =========");
        //console.log("mod_dict", mod_dict);

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

// ---  upload new setting
        // when emplhour exists in datalist_request, it downloads emplhour_list based on filters in roster_period_dict
        const datalist_request = {roster_period: { now: now_arr, employee_pk: mod_dict.selected_employee_pk},
                                  emplhour: {mode: "get"}};
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
                    mod_dict.selected_employee_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_period.employee_pk){
                    mod_dict.selected_employee_pk = pk_int;
                }
            }
// ---  put value in input box
            el_MSE_input_employee.value = get_attr_from_el(tblRow, "data-value", "")

            MSE_Save()
        }
    }  // MSE_SelectEmployee

//=========  MSE_InputKeyup  ================ PR2020-03-01
    function MSE_InputKeyup() {
        //console.log( "===== MSE_InputKeyup  ========= ");

// ---  get value of new_filter
        let new_filter = el_MSE_input_employee.value
        //console.log( "new_filter", new_filter);

        let tblBody = el_MSE_tblbody_select;
        //const len = tblBody.rows.length;
       // if (new_filter && len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one employee: put selected employee in el_MSE_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const selected_value = get_dict_value(filter_dict, ["selected_value"])
        //console.log( "selected_pk", selected_pk);
            if (selected_pk) {
                el_MSE_input_employee.value = selected_value;
// ---  put pk of selected employee in mod_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_dict.selected_employee_pk = 0;
                        mod_dict.selected_employee_code = null;
                    }
                } else {
                    mod_dict.selected_employee_pk =  Number(selected_pk);
                    mod_dict.selected_employee_code = selected_value;
                }

// ---  Set focus to btn_save
                el_MSE_btn_save.focus()
            }  //  if (!!selected_pk) {
      //  }
    }; // MSE_InputKeyup


// +++++++++++++++++ MODAL SELECT SHIFT +++++++++++++++++++++++++++++++++++++++++++
//========= MSS_Open ====================================  PR2020-05-07
    function MSS_Open () {
       //console.log(" ===  MSS_Open  =====") ;
       //console.log("mod_dict: ", mod_dict) ;
/*
breakduration: 30
btn_select: "tab_absence"
cur_employee_code: "Martis SAdd"
cur_employee_pk: 2612
cur_employee_ppk: 3
emplhour_pk: 11610
emplhour_ppk: 11069
is_add_employee: false
isabsence: false
isrestshift: false
mapid: "emplhour_11610"
offsetend: 1020
offsetsplit: 1020
offsetstart: 150
order_code: "ZRO"
order_pk: 1541
rosterdate: "2020-08-01"
rowcount: 11
*/
// ---  put rosterdate in input box
        document.getElementById("id_MSS_input_date").value = mod_dict.rosterdate;

// ---  reset other input box, disable
        mod_dict.is_switch = false;

        MSS_Reset_TableAndInputBoxes();
        MSS_DisableInputBoxes(isEmpty(mod_dict.emplh_shift_dict))
// ---  download shifts for Modal Select Shift (is put here to save time when opening MSS)
        // TODO has error
        if(mod_dict.rosterdate && mod_dict.emplhour_pk){
            add_or_remove_class( document.getElementById("id_MSS_loader"), cls_hide, false);
            const upload_dict =  {shiftdict: {rosterdate: mod_dict.rosterdate, emplhour_pk: mod_dict.emplhour_pk}}
            UploadChanges(upload_dict, url_emplhour_download);
            // response handled in MSS_UploadResponse
        }

// ---  show modal
        $("#id_modselectshift").modal({backdrop: true});

}; // MSS_Open

//=========  MSS_Save  ================ PR2020-05-09
    function MSS_Save() {
       //console.log("===  MSS_Save =========");
       //console.log("mod_dict", mod_dict);
       //console.log("======== mod_dict.is_switch", mod_dict.is_switch);

// ---  create id_dict of current emplhour record
        let other_employee_dict = {};
        const employee_pk = (mod_dict.is_switch && mod_dict.cur_employee_pk) ? mod_dict.cur_employee_pk : null;
        const employee_ppk = (mod_dict.is_switch && mod_dict.cur_employee_ppk) ? mod_dict.cur_employee_ppk : null;
        other_employee_dict = {pk: employee_pk, ppk: employee_ppk, table: "employee", update: true};

        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                            id: {pk: mod_dict.emplhour_pk,
                                ppk: mod_dict.emplhour_ppk,
                                table: "emplhour",
                                shiftoption: "moveto_shift",
                                rowindex: mod_dict.rowindex},
                            employee: other_employee_dict,
                            moveto_emplhour_pk: mod_dict.selected_emplhour_pk
                           }

// ---  remove employee from current emplhour
        //let tr_changed = document.getElementById(mod_dict.map_id);
        //console.log("mod_dict.map_id", mod_dict.map_id)
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
        mod_dict.emplh_shift_dict = deepcopy_dict(response_emplh_shift_dict)
        const row_count = MRO_MRE_MSS_FillSelectTable ("MSS", "order", null);
        el_MSS_input_order.readOnly = (!row_count);
        if(row_count){
            mod_dict.skip_focus_event = true;
            el_MSS_input_order.readOnly = false;
            set_focus_on_el_with_timeout(el_MSS_input_order, 50)
        }
    }  // MSS_UploadResponse

//=========  MSS_RosterdateEdit  ================ PR2020-05-08
    function MSS_RosterdateEdit (el_input) {
       //console.log(" =====  MSS_RosterdateEdit =====")

// ---  get new rosterdate
        mod_dict.rosterdate = el_input.value
// ---  disable input boxes
        MSS_DisableInputBoxes(true)
        MSS_Reset_TableAndInputBoxes();
// ---  show loader
        add_or_remove_class( document.getElementById("id_MSS_loader"), cls_hide, false);
// ---  reset table and input field
// ---  download shifts for Modal Select Shift (is put here to save time when opening MSS)
        if(mod_dict.rosterdate && mod_dict.emplhour_pk){
            const upload_dict =  {shiftdict: {rosterdate: mod_dict.rosterdate, emplhour_pk: mod_dict.emplhour_pk}};
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
              mod_dict.is_switch = !checkbox_replace.checked
              checkbox_switch.checked = mod_dict.is_switch
        } else if ( fldName === "switch") {
            mod_dict.is_switch = checkbox_switch.checked
            checkbox_replace.checked = !mod_dict.is_switch
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
// ---  put pk of selected row in mod_dict
                const pk_int = selected_pk;
                if (tblName === "order") {
                    mod_dict.selected_order_pk = selected_pk;
                    MRO_MRE_MSS_SelecttableUpdateAfterSelect("MSS", tblName, selected_pk, null, selected_value)
                } else if (tblName === "shift") {
                    mod_dict.selected_shift_pk = selected_pk;
                    MRO_MRE_MSS_SelecttableUpdateAfterSelect("MSS", tblName, selected_pk, null, selected_value)
                } else if (tblName === "employee") {
                    mod_dict.selected_emplhour_pk = selected_pk;
                   //console.log("mod_dict.selected_emplhour_pk: ", mod_dict.selected_emplhour_pk)
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
       //console.log( "mod_dict", mod_dict);

// set header text
        const el_header = document.getElementById("id_MSS_header");
        const employee_code = get_dict_value(mod_dict, ["employee", "code"])
        const header_text = (employee_code) ? loc.Select_shift +  loc.for_txt + employee_code : loc.Select_shift + ":"
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
       //console.log("mod_dict.skip_focus_event", mod_dict.skip_focus_event)
        if(mod_dict.skip_focus_event){
            mod_dict.skip_focus_event = false;
        } else {
            if (tblName === "order") {
                el_MSS_input_order.value = null
                el_MSS_input_shift.value = null;
                el_MSS_input_employee.value = null;
                // reset select table when input order got focus
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, mod_dict.selected_order_pk);
            } else if (tblName === "shift") {
                el_MSS_input_shift.value = null;
                el_MSS_input_employee.value = null;
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, mod_dict.selected_shift_pk);
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
//========= MOD ALLOWANCE Open====================================
    function MAL_Open (el_input) {
        //console.log("===  MAL_Open  =====") ;
        //  emplhourallowance_dict contains key = alw_pk for every allowance (also created and deleted ones)
        // plus key emplhour_pk and mapid
        mod_MAL_dict = {}

// get info from emplhour_map
        let emplhour_dict = get_mapdict_from_datamap_by_el(el_input, emplhour_map)
        if(!isEmpty(emplhour_dict)){
            // locked when stat_locked or stat_pay_locked, not when stat_inv_locked
            const is_not_locked = (!emplhour_dict.stat_locked && !emplhour_dict.stat_pay_locked)
            if (is_not_locked){
    // ---  set header text
                let header_txt = loc.Allowances + loc.for_txt + emplhour_dict.employeecode + "\n"
                header_txt += format_dateISO_vanilla (loc, emplhour_dict.rosterdate, false, true);
                if(emplhour_dict.c_o_code) { header_txt += " - " + emplhour_dict.c_o_code };
                if(emplhour_dict.shiftcode) { header_txt += "  " + emplhour_dict.shiftcode };
                el_MAL_header.innerText = header_txt;

    // ---  put emplhour_pk and mapid in mod_MAL_dict
                mod_MAL_dict = {emplhour_pk: emplhour_dict.id, mapid: emplhour_dict.mapid};

    // ---  put allowance rows in mod_MAL_dict
                const empl_alw_dict = get_dict_value(emplhourallowance_dict, [emplhour_dict.id])
                MAL_fill_MAL_dict(empl_alw_dict)

    // ---  display modified_by
                // loop through allowances and put last modifiedat and username in
                const modat = get_dict_value(mod_MAL_dict, ["max_modifiedat"])
                const modby = get_dict_value(mod_MAL_dict, ["max_modifiedby"])
                el_MAL_modifiedby.innerText = display_modifiedby(loc, modat, modby);

    // ---  fill table empl_alw
                MAL_FillTable("alw_listdict");

                //const el_input = document.getElementById("id_MNO_input_note")
                //if (el_input){ setTimeout(function (){ el_input.focus() }, 50)};

                $("#id_mod_emplhourallowance").modal({backdrop: true});
            }  //  if (is_not_locked)
        }
    }  // MAL_Open

//========= MNO_Save============== PR2021-01-30
    function MAL_Save () {
        //console.log("===  MAL_Save  =====");

        //console.log("mod_MAL_dict.alw_listdict", mod_MAL_dict.alw_listdict);

        if(permit_add_notes){
            let ehal_list = [];
            for (const [key, alw_dict] of Object.entries(mod_MAL_dict.alw_listdict)) {
                // add only items with mode 'create, 'delete' or 'update'. This skips unchanged items
                if(alw_dict.create || alw_dict.delete || alw_dict.update){
                    alw_dict.mode = (alw_dict.delete) ? "delete" : (alw_dict.create) ? "create" : (alw_dict.update) ? "update" : null;
                    ehal_list.push(alw_dict);
                }
            }
            if(ehal_list.length){
                const upload_dict = {emplhour_pk: mod_MAL_dict.emplhour_pk, ehal_list: ehal_list}
                UploadChanges(upload_dict, url_emplhourallowance_upload);
            }
       }
// hide modal
        $("#id_mod_emplhourallowance").modal("hide");
    }  // MAL_Save

//=========  MAL_CreateTblHeader  === PR2021-01-30
    function MAL_CreateTblHeader(table, fields) {
        //console.log("===  MAL_CreateTblHeader == ");

        const tblHead_id = (table === "alw_listdict")  ? "id_MAL_thead" :
                   (table === "allowance_map")  ? "id_MSA_thead" : "none";
        const tblHead = document.getElementById(tblHead_id);

        tblHead.innerText = null
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        const col_count = fields.field_names.length;
        for (let j = 0; j < col_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
    // --- add innerText to th
                const data_text = loc[fields.field_caption[j]];
                if(data_text) el_div.innerText = data_text;
    // --- add width to el
                el_div.classList.add("tw_" + fields.field_width[j])
    // --- add text_align
                el_div.classList.add("ta_" + fields.field_align[j])
            th.appendChild(el_div)
        }  // for (let j = 0; j < column_count; j++)
    };  // MAL_CreateTblHeader

//=========  MAL_CreateTblFooter  === PR2021-01-30
    function MAL_CreateTblFooter(fields){
        //console.log("===  MAL_CreateTblFooter == ");

        let tblFoot = document.getElementById("id_MAL_tfoot");
        tblFoot.innerText = null;

        let tblRow = tblFoot.insertRow(-1);
        // in field_settings col=0 contains team. Skip this column in MGT. Start at j=1
        const col_count = fields.field_names.length;
        for (let j = 0; j < col_count; j++) {
            let td = tblRow.insertCell(-1);
            if(j === 1){
// --- create element with tag from field_tags
                let el = document.createElement("div");
                el.setAttribute("tabindex", "0")
                el.setAttribute("colspan", "5")

                //el.classList.add("pointer_show")
                td.classList.add("tsa_color_darkgrey")
                el.classList.add("ml-2")
                el.innerText = loc.Add_allowance + "..."
                add_hover(td)
// --- add EventListener to td
                el.addEventListener("click", function() {MSA_Open()}, false);
                td.appendChild(el);
            }
        }
    };  // MAL_CreateTblFooter

//========= MSOD SELECT ALLOWANCE ============= PR2021-01-31
    function MSA_Open() {
        //console.log( " ==== MSA_Open ====");
        // function is called when clicked on footer 'New allowance

    // ---  fill selct table allowance
        MAL_FillTable("allowance_map");

        $("#id_mod_select_allowance").modal({backdrop: true});

        //MAL_BtnSaveDeleteEnable();

    }  // MSA_Open

//========= MAL_DeleteAlw  ============= PR2021-01-30
    function MAL_DeleteAlw(tblRow) {
        //console.log( " ==== MAL_DeleteAlw ====");
        //console.log( "tblRow", tblRow);

        const teammember_pk = get_attr_from_el(tblRow, "data-pk", 0);
        const team_pk = get_attr_from_el(tblRow, "data-ppk", 0);

        //console.log( "teammember_pk", teammember_pk);
        //console.log( "team_pk", team_pk);
        let teammember_dict = mod_MGT_dict[teammember_pk]
        if(teammember_dict) {
            teammember_dict.delete = true;
        }
        mod_MGT_dict.update = true;
        //console.log( "mod_MGT_dict", mod_MGT_dict);

        MAL_BtnSaveDeleteEnable();

        MGT_FillTableTeammember(team_pk)
    }  // MAL_DeleteAlw

//=========  MAL_BtnSaveDeleteEnable  ================ PR2021-01-30
    function MAL_BtnSaveDeleteEnable(){
        //console.log( "MAL_BtnSaveDeleteEnable");
/*
        el_MAL_btn_save.disabled = !mod_dict.update;

        const team_mode = get_dict_value(mod_dict, ["team", "mode"])
        const btn_delete_hidden = (!selected.scheme_pk || team_mode === "create");
        //console.log( "team_mode", team_mode);
        //console.log( "btn_delete_hidden", btn_delete_hidden);
        add_or_remove_class (el_MAL_btn_save, cls_hide, btn_delete_hidden) // args: el, classname, is_add
*/
    }  // MAL_BtnSaveDeleteEnable


//=========  MAL_fill_MAL_dict  ================  PR2021-01-31
    function MAL_fill_MAL_dict(empl_alw_dict){
        //console.log( "MAL_fill_MAL_dict");
        //console.log( "empl_alw_dict", empl_alw_dict);
        // only called by MAL_Open
        // function fills mod_MAL_dict.alw_list with allowances of this emplhour
        /*
        empl_alw_dict = {id: 47
                        ehal_id_agg: (2) [1, 2]
                        code_agg: (2) ["235", "A00"]
                        description_agg: (2) ["Maaltijd", null]
                        quantity_agg: (2) [2, 4]
                        amount_agg: (2) [12, 27]
                        modifiedat_agg: (2) ["2021-01-31T04:00:00Z", "2021-01-31T04:00:00Z"]
                        modifiedby_agg: (2) ["Hans", "Hans"]
        */
        const alw_listdict = {}
        const ehal_id_list = (empl_alw_dict && empl_alw_dict.ehal_id_agg) ? empl_alw_dict.ehal_id_agg : [];
        const len = ehal_id_list.length;
        let max_modifiedat_index = 0, max_modifiedat = null, max_modifiedby = null;
        if(len) {
            for (let i = 0; i < len; i++) {
                const map_id = "ehal_" + ehal_id_list[i];
                alw_listdict[map_id] = {
                    ehal_id: ehal_id_list[i],
                    alw_id: empl_alw_dict.alw_id_agg[i],
                    code: empl_alw_dict.code_agg[i],
                    wagerate: empl_alw_dict.wagerate_agg[i],
                    description: empl_alw_dict.description_agg[i],
                    quantity: empl_alw_dict.quantity_agg[i],
                    amount: empl_alw_dict.amount_agg[i],
                    modifiedat: empl_alw_dict.modifiedat_agg[i],
                    modifiedby: empl_alw_dict.modifiedby_agg[i]
                };
                if (max_modifiedat == null || empl_alw_dict.modifiedat_agg[i] > max_modifiedat){
                    max_modifiedat_index = i;
                    max_modifiedat = empl_alw_dict.modifiedat_agg[i];
                }
            }
            max_modifiedby = empl_alw_dict.modifiedby_agg[max_modifiedat_index];

        }
        mod_MAL_dict.alw_listdict = alw_listdict;

        mod_MAL_dict.max_modifiedat = max_modifiedat;
        mod_MAL_dict.max_modifiedby = max_modifiedby;

        //console.log( "mod_MAL_dict", mod_MAL_dict);

    }  // MAL_fill_MAL_dict

//========= MAL_FillTable  ==========  PR2021-01-30
    function MAL_FillTable(table){
        //console.log( "===== MAL_FillTable  ========= ");
        //console.log( "table", table);
        //console.log( "mod_MAL_dict", mod_MAL_dict);

        const emplhour_pk = get_dict_value(mod_MAL_dict, ["emplhour_pk"]);
        const fields = (table === "alw_listdict") ? fields_allowance :
                       (table === "allowance_map") ? fields_select_allowance : null;

        MAL_CreateTblHeader(table, fields);
        if (table === "alw_listdict") {
            MAL_CreateTblFooter(fields)
        }

        const tblBody_id = (table === "alw_listdict")  ? "id_MAL_tbody" :
                           (table === "allowance_map")  ? "id_MSA_tbody_select" : "none";
        const tblBody = document.getElementById(tblBody_id);
        if(tblBody){

// --- reset tblBody
            tblBody.innerText = null;
// --- loop through mod_MAL_dict.alw_listdict, skip when delete=true
            const obj_entries = (table === "alw_listdict")  ? Object.entries(mod_MAL_dict.alw_listdict) :
                               (table === "allowance_map")  ? allowance_map.entries() : null;

            if (fields && obj_entries) {
                for (const [map_id, dict] of obj_entries) {
                    const is_delete = get_dict_value(dict, ["delete"], false);
                    const is_inactive = get_dict_value(dict, ["inactive"], false);
                    if (!is_delete && !is_inactive){
                        const tblRow = MAL_CreateTblRow(tblBody, table, fields, emplhour_pk, map_id)
                        MAL_UpdateTblRow(tblRow, table, dict)
                    }
                }
            }
        }  // if(tblBody)
    }  // MAL_FillTable

//=========  MAL_CreateTblRow  ================ PR2021-01-31
    function MAL_CreateTblRow(tblBody, table, fields, emplhour_pk, map_id){
        //console.log("--- MAL_CreateTblRow  --------------");

// --- insert tblRow into tblBody or tfoot
        let tblRow = tblBody.insertRow(-1);
        tblRow.setAttribute("id", map_id);

// --- add EventListener to tblRow.
        if(table === "allowance_map"){
            tblRow.addEventListener("click", function() {MSA_TblRowClicked(tblRow)}, false )
            add_hover(tblRow);
        }
//+++ insert td's into tblRow
        const col_count = fields.field_names.length;
        for (let j = 0, field; j < col_count; j++) {
            field = fields.field_names[j];
            let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
            let el = document.createElement( fields.field_tags[j] );
// --- add data-field Attribute.
            el.setAttribute("data-field", field);
// --- add img delete to col_delete
            if (table === "alw_listdict" && field === "delete") {
                el.addEventListener("click", function() {MAL_DeleteClicked(tblRow)}, false )
        // --- add div with image delete
                let el_img = document.createElement("div");
                    el_img.className = "delete_0_1";
                    el.appendChild(el_img);
                el.addEventListener("mouseenter", function() {el_img.className = "delete_0_2"});
                el.addEventListener("mouseleave", function() {el_img.className = "delete_0_1"});
            } else if (table === "alw_listdict" && field === "quantity") {
                el.addEventListener("change", function() {MAL_QuantityChanged(tblRow, el)}, false )
            }
// --- add width to el - not necessary, tblhead has width
            el.classList.add("tw_" + fields.field_width[j])
// --- add text_align
            el.classList.add("ta_" + fields.field_align[j])
// --- add other classes to td
            el.classList.add("border_none");
            //el.setAttribute("autocomplete", "off");
            //el.setAttribute("ondragstart", "return false;");
            //el.setAttribute("ondrop", "return false;");
            td.appendChild(el);
        }
        return tblRow
    };// MAL_CreateTblRow

//========= MAL_UpdateTblRow  ============= PR2021-01-30
    function MAL_UpdateTblRow(tblRow, table, alw_dict){
       //console.log("--- MAL_UpdateTblRow  --------------");
       //console.log("tblRow", tblRow);
       //console.log("alw_dict", alw_dict);
       //console.log("table", table);

        if (!!tblRow && !isEmpty(alw_dict)) {
            // add data-pk and data-display for t_Filter_SelectRows
            if(table === "allowance_map"){
                tblRow.setAttribute("data-pk", alw_dict.id);
                const display = (alw_dict.code || "") + " " + (alw_dict.description || "");
                tblRow.setAttribute("data-display", display);
            }
// check if tblBody = tfoot, if so: is_addnew_row = true
            let tblBody = tblRow.parentNode;
            const tblBody_id_str = get_attr_from_el(tblBody, "id")
            const arr = tblBody_id_str.split("_");
            const is_addnew_row = (arr.length > 1 && arr[1] === "tfoot");

// move the new row in alfabetic order
            // TODO: also when name has changed
            // GetNewSelectRowIndex only uses update_dict.code.value
            //const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, loc.user_lang);
           // tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);

            for (let i = 0, cell, len = tblRow.cells.length; i < len; i++) {
                cell = tblRow.cells[i];
                if(!!cell){
                    let el_input = cell.children[0];
                    if(!!el_input){
                        const fldName = get_attr_from_el(el_input, "data-field")
                        const value = get_dict_value(alw_dict, [fldName]);
                        if (["code", "description"].includes( fldName )){
                            el_input.innerText = (value || "---");
                        } else if (fldName === "quantity"){
                            el_input.value = (value) ? value / 10000 : 0;

                        } else if (["amount", "wagerate"].includes( fldName )){
                            el_input.innerText = format_pricerate (loc.user_lang, value, false , true) // false = is_percentage , true = show_zero

                        }
       //console.log("alw_dict", alw_dict);
       //console.log("fldName", fldName);
       //console.log("value", value);
       //console.log("format_pricerate", value);

                    }
                }
            }
        };
    }  // function MAL_UpdateTblRow

//========= MSA_TblRowClicked  ============= PR2021-01-31
    function MSA_TblRowClicked(tblRow){
        //console.log("=== MSA_TblRowClicked ===") ;

        const map_dict = get_mapdict_from_datamap_by_id(allowance_map, tblRow.id)
        //console.log("map_dict", map_dict) ;

        id_new += 1;
        const pk_new = "new" + id_new.toString()
        const map_id = "ehal_" + pk_new;

        mod_MAL_dict.alw_listdict[map_id] = {ehal_id: pk_new,
                        alw_id: map_dict.id,
                        code: map_dict.code,
                        description: map_dict.description,
                        wagerate: map_dict.wagerate,
                        quantity: 10000,
                        create: true
        }
// ---  fill table empl_alw
            MAL_FillTable("alw_listdict");

// hide modal
        $("#id_mod_select_allowance").modal("hide");
    }  // MSA_TblRowClicked

//========= MAL_DeleteClicked  ============= PR2021-01-31
    function MAL_DeleteClicked(tblRow){
       //console.log("MAL_DeleteClicked") ;

        const map_id = tblRow.id;
        const ehal_dict = mod_MAL_dict.alw_listdict[map_id];
        if (ehal_dict){
            if (get_dict_value(ehal_dict, ["create"], false )){
                // delete item from dict when it is a new item
                delete mod_MAL_dict.alw_listdict[map_id];
            } else {
                // set delete=true when it is an existing item
                ehal_dict.delete = true;
            }
// ---  fill table empl_alw
            MAL_FillTable("alw_listdict");
        }
        //console.log("mod_MAL_dict", mod_MAL_dict) ;
    }  // MAL_DeleteClicked

//========= MAL_QuantityChanged  ============= PR2021-01-31
    function MAL_QuantityChanged(tblRow, el){
        //console.log("MAL_QuantityChanged")
        //console.log("el.value", el.value)
        const ehal_dict = get_dict_value(mod_MAL_dict, ["alw_listdict", tblRow.id ]);

        //console.log("mod_MAL_dict.alw_listdict", mod_MAL_dict.alw_listdict)
        //console.log("tblRow.id", tblRow.id)

        if (ehal_dict){

        const arr = get_number_from_input(loc, "quantity", el.value);

        const quantity = arr[0];
        const msg_err = arr[1];
        //console.log("quantity", quantity)
            ehal_dict.quantity = quantity;
            ehal_dict.update = true;
        }

        //console.log("ehal_dict", ehal_dict)
    }  // MAL_QuantityChanged


//=========  MSA_Filter  ================ PR2021-02-01
    function MSA_Filter (el_input) {
        //console.log("=====  MSA_Filter =====")
        //console.log("el_input.value", el_input.value)
// ---  get value of new_filter
        let new_filter = el_input.value

        let tblBody = document.getElementById("id_MSA_tbody_select");
        const len = tblBody.rows.length;
        if (len){
// ---  filter rows in table select_employee
            const col_index_list = [1, 2, 3]
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter, false, false, null, col_index_list);

        //console.log("filter_dict", filter_dict)
// ---  if filter results have only one row: put selected row in el_input
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const selected_value = get_dict_value(filter_dict, ["selected_value"])
            if (selected_pk) {
                el_input.value = selected_value
// ---  put pk of selected row in mod_dict
                mod_MAL_dict.selected_allowance_pk = selected_pk;
               //console.log("mod_dict.selected_emplhour_pk: ", mod_dict.selected_emplhour_pk)
                el_MSA_input.value = selected_value;
                el_MSA_btn_save.disabled = false;
                set_focus_on_el_with_timeout(el_MSA_btn_save , 50)
            }  //  if (!!selected_pk) {
        }
    }  // MSA_Filter

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//========= MOD NOTE Open====================================
    function MNO_Open (el_input) {
       //console.log("===  MNO_Open  =====") ;

// get tr_selected
        let emplhour_dict = null
        mod_MNO_dict = {};
        if(el_input){
            const fldName = get_attr_from_el(el_input, "data-field");
            const tr_selected = get_tablerow_selected(el_input)
            //console.log("fldName", fldName) ;
// get info from emplhour_map
            emplhour_dict = get_mapdict_from_datamap_by_el(el_input, emplhour_map)
            //console.log("emplhour_dict", emplhour_dict) ;
            if(!isEmpty(emplhour_dict)){

                let show_note = (fldName === "hasnote") || (fldName === "employeenote") || (fldName === "ordernote" && !emplhour_dict.c_isabsence && !emplhour_dict.oh_isrestshift);

            //console.log("show_note", show_note) ;
                if(show_note){
                    const pk_int = (fldName === "hasnote") ? emplhour_dict.id :
                                    (fldName === "ordernote") ? emplhour_dict.o_id :
                                    (fldName === "employeenote") ? emplhour_dict.employee_id : null;
                    const tblName = (fldName === "hasnote") ? "emplhour" :
                                    (fldName === "ordernote") ? "order" :
                                    (fldName === "employeenote") ? "employee" : null;
                    let map_dict = null;
                    if (fldName === "hasnote") {
                        map_dict = emplhour_dict;
                    } else if (fldName === "ordernote") {
                        map_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", pk_int)
                    } else if (fldName === "employeenote") {
                        map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", pk_int)
                    }
                    if(!isEmpty(map_dict)){
                        let header_txt = (fldName === "ordernote") ? map_dict.c_o_code : (fldName === "employeenote") ? map_dict.code : null;
            //console.log("header_txt", header_txt) ;
                        if (fldName === "hasnote") {
                            header_txt = format_dateISO_vanilla (loc, emplhour_dict.rosterdate, false, true);
                            if(emplhour_dict.c_o_code) { header_txt += " - " + emplhour_dict.c_o_code };
                            if(emplhour_dict.shiftcode) { header_txt += "  " + emplhour_dict.shiftcode };
                            if(emplhour_dict.employeecode) { header_txt += "\n" + emplhour_dict.employeecode };
                        } else if (fldName === "ordernote") {
                            header_txt = map_dict.c_o_code;
                        } else if (fldName === "employeenote") {
                            header_txt = map_dict.code;
                        }
                        el_MNO_header.innerText = header_txt;

                        mod_MNO_dict = {table: tblName, pk: map_dict.id}
                        MNO_FillNotes(tblName, map_dict.id);

                        const el_input = document.getElementById("id_MNO_input_note")
                        if (el_input){ setTimeout(function (){ el_input.focus() }, 50)};

                        $("#id_mod_note").modal({backdrop: true});
                    }
                }

            }
        }
    }  // MNO_Open

//========= MNO_Save============== PR2020-10-15
    function MNO_Save () {
       //console.log("===  MNO_Save  =====");

        if(permit_add_notes){
            const note = document.getElementById("id_MNO_input_note").value;
            if(note){
                const url_str = (mod_MNO_dict.table === "emplhour") ? url_emplhournote_upload :
                                (mod_MNO_dict.table === "employee") ? url_employeenote_upload :
                                (mod_MNO_dict.table === "order") ? url_ordernote_upload : null;
                const upload_dict = { ppk: mod_MNO_dict.pk,
                                      table: mod_MNO_dict.table,
                                      note: note,
                                      create: true};
                UploadChanges(upload_dict, url_str) ;
           }
       }
// hide modal
        $("#id_mod_note").modal("hide");
    }  // MNO_Save

//========= MNO_FillNotes============== PR2020-10-15
    function MNO_FillNotes (tblName, pk_int) {
        //console.log("===  MNO_FillNotes  =====") ;
        el_MNO_note_container.innerText = null;
        const note_rows = (tblName === "emplhour") ? emplhournote_rows :
                          (tblName === "employee") ? employeenote_rows :
                          (tblName === "order") ? ordernote_rows : null;

        //console.log("emplhournote_rows", emplhournote_rows) ;
        //console.log("tblName", tblName) ;
        //console.log("note_rows", note_rows) ;
        //console.log("pk_int", pk_int) ;
        const pk_str = (pk_int) ? pk_int.toString() : null;
        //console.log("pk_str", pk_str) ;
        const note = get_dict_value(note_rows, [pk_str]);
        //console.log("note", note) ;
        if(note){
            const len = note.id_agg.length;
            for (let i = 0; i < len; i++) {
                const note_text = (note.note_agg[i]) ? note.note_agg[i] : "";
                const note_len = (note_text) ? note_text.length : 0;
                const modified_dateJS = parse_dateJS_from_dateISO(note.modifiedat_agg[i]);
                const modified_date_formatted = format_datetime_from_datetimeJS(loc, modified_dateJS)
                const modified_by = (note.modifiedby_agg[i]) ? note.modifiedby_agg[i] : "-";
                const mod_text = modified_by + ", " + modified_date_formatted + ":"
        // --- create div element with note
                const el_div = document.createElement("div");
                el_div.classList.add("tsa_textarea_div");
                    const el_small = document.createElement("small");
                    el_small.classList.add("tsa_textarea_div");
                    el_small.innerText = mod_text;
                    el_div.appendChild(el_small);

                    const el_textarea = document.createElement("textarea");
                    const numberOfLineBreaks = (note_text.match(/\n/g)||[]).length;
                    let numberOfLines = 1 + numberOfLineBreaks;
                    if (note_len > 3 * 75 ){
                        if (numberOfLines <= 3 ) {numberOfLines = 3 + 1}
                    } else if (note_len > 2 * 75){
                        if (numberOfLines <= 2) {numberOfLines = 2 + 1}
                    } else if (note_len > 1 * 75){
                        if (numberOfLines <= 1) {numberOfLines = 1 + 1}
                    }

                    el_textarea.setAttribute("rows", numberOfLines);
                    el_textarea.setAttribute("readonly", "true");
                    el_textarea.classList.add("form-control", "tsa_textarea_resize", "tsa_tr_ok");
                    el_textarea.value = note_text
                    el_div.appendChild(el_textarea);
                el_MNO_note_container.appendChild(el_div);
            }
        }
        // --- create input element for note, only when permit_edit_rows
        if(permit_add_notes){
            const el_div = document.createElement("div");
            el_div.classList.add("tsa_textarea_div");
            el_div.classList.add("tsa_textarea_div", "mt-4", );

                const el_textarea = document.createElement("textarea");
                el_textarea.id = "id_MNO_input_note";
                el_textarea.setAttribute("rows", "4");
                el_textarea.classList.add("form-control", "tsa_textarea_resize", );
                el_textarea.placeholder = loc.Type_your_note_here + "..."
                el_div.appendChild(el_textarea);

            el_MNO_note_container.appendChild(el_div);
        }

    }  // MNO_FillNotes


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//========= ModalStatusOpen========================= PR2021-02-04
    function ModalStatusOpen (el_input) {
       //console.log("===  ModalStatusOpen  =====") ;
        // PERMISSIONS: only hrman can unlock shifts, supervisor can only lock shifts PR2020-08-05
        // supervisor can confirm / undo confirm / close shift
        // hrman can close shift / undo close shift / close all shifts of this day
        /*
            permit_lock_rows = !!selected_period.requsr_perm_supervisor
            permit_unlock_rows = !!selected_period.requsr_perm_hrman
        */

        mod_status_dict = {};

// get status from field status, not from confirm start/end
        let emplhour_dict = get_mapdict_from_datamap_by_el(el_input, emplhour_map)
        const row_is_locked = (emplhour_dict.stat_pay_locked || emplhour_dict.stat_inv_locked);

        if(!row_is_locked && (permit_lock_rows || permit_unlock_rows) ){

// get tblRow, fldName and emplhour_dict
            let tblRow = get_tablerow_selected(el_input)
            const fldName = get_attr_from_el(el_input, "data-field");
            const stat_index = (fldName === "stat_start_conf") ? 2 : (fldName === "stat_end_conf") ? 4 : (fldName === "status") ? 5 : -1;
            const is_field_start_conf = (fldName === "stat_start_conf");
            const is_field_end_conf = (fldName === "stat_end_conf");
            const is_field_status = (fldName === "status");

            const status_array = b_get_status_array(emplhour_dict.status)
            const stat_start_conf = (!!status_array[2]); // STATUS_02_START_CONFIRMED = 4
            const stat_end_conf = (!!status_array[4]);  // STATUS_04_END_CONFIRMED = 16
            const stat_locked = (!!status_array[5]); // STATUS_05_LOCKED = 32

            const field_is_confirmed = ( (is_field_start_conf && stat_start_conf) || (is_field_end_conf && stat_end_conf) );

            //console.log("emplhour_dict", emplhour_dict) ;

            //console.log("permit_lock_rows", permit_lock_rows) ;
            //console.log("stat_locked", stat_locked) ;

       //console.log("allow_open", allow_open)
            //if (allow_open) {

       // only HR-man can unlock, only when not stat_pay_locked and not stat_inv_locked
                const allow_unlock_status = (!emplhour_dict.stat_pay_locked && !emplhour_dict.stat_inv_locked && permit_unlock_rows);

                const is_absence = (emplhour_dict.c_isabsence) ? emplhour_dict.c_isabsence : false;
                const is_restshift = (emplhour_dict.oh_isrestshift) ? emplhour_dict.oh_isrestshift : false;
                const has_no_employee = (!emplhour_dict.employee_id)
                const has_no_order = (!emplhour_dict.o_id)
                // PR2021-02-20 debug: don't use !!emplhour_dict.offsetstart, it will skip midnight
                const has_no_time = ( (is_field_start_conf && emplhour_dict.offsetstart == null) ||
                                        (is_field_end_conf && emplhour_dict.offsetend == null) )

                const time_fldName = (is_field_start_conf) ? "offsetstart" : "offsetend";
                const time_el = tblRow.querySelector("[data-field=" + time_fldName + "]");
                //const has_overlap = (time_el.classList.contains("border_bg_invalid"));

                // overlap_abs etc is true when one of the other overlapping shifts is a nabesnecce etc shift
                const overlap_abs = (!!get_attr_from_el(time_el, "data-ovl_abs"));
                const overlap_rest = (!!get_attr_from_el(time_el, "data-ovl_rest"));
                const overlap_normal = (!!get_attr_from_el(time_el, "data-ovl_normal"));
                const has_overlap_normal_or_abs = (overlap_abs || overlap_normal);

       // put values in mod_status_dict
                mod_status_dict = {
                    mapid: emplhour_dict.mapid,

                    emplhour_pk: emplhour_dict.id,
                    orderhour_pk: emplhour_dict.oh_id,
                    rosterdate: emplhour_dict.rosterdate,

                    offsetstart: emplhour_dict.offsetstart,
                    offsetend: emplhour_dict.offsetend,
                    timeduration: emplhour_dict.timeduration,
                    breakduration: emplhour_dict.breakduration,

                    field: fldName,
                    is_field_start_conf: is_field_start_conf,
                    is_field_end_conf: is_field_end_conf,
                    is_field_status: is_field_status,

                    status_array: status_array,
                    field_is_confirmed: field_is_confirmed,
                    stat_locked: stat_locked,
                }
               //console.log("emplhour_dict", emplhour_dict) ;
               //console.log("mod_status_dict", mod_status_dict) ;

               //console.log("is_field_start_conf", is_field_start_conf) ;
               //console.log("stat_start_conf", stat_start_conf, typeof stat_start_conf) ;
               //console.log("stat_end_conf", stat_end_conf) ;

               //console.log("overlap_abs", overlap_abs) ;
               //console.log("overlap_rest", overlap_rest) ;
               //console.log("overlap_normal", overlap_normal) ;
               //console.log("has_overlap_normal_or_abs", has_overlap_normal_or_abs) ;

                let header_text = null, btn_save_text = loc.Confirm;
                if (is_field_start_conf) {
                    header_text = (stat_start_conf) ? loc.Undo_confirmation : loc.Confirm_start_of_shift;
                    btn_save_text = (stat_start_conf) ? loc.Undo : loc.Confirm;;
                } else if (is_field_end_conf) {
                    header_text = (stat_end_conf) ? loc.Undo_confirmation : loc.Confirm_end_of_shift;
                    btn_save_text = (stat_end_conf) ? loc.Undo : loc.Confirm;
                } else if (is_field_status) {
                    if (stat_locked) {
                        header_text = loc.Unlock + " " + loc.Shift.toLowerCase();
                        btn_save_text = loc.Unlock;
                    } else {
                        header_text = loc.Lock + " " + loc.Shift.toLowerCase();
                        btn_save_text = loc.Lock;
                    }
                }

                document.getElementById("id_mod_status_header").innerText = header_text
                let time_label = null, time_display = null;
                if(is_field_start_conf){
                    time_label = loc.Start_time + ":";
                    time_display = format_time_from_offset_JSvanilla( loc, emplhour_dict.rosterdate, emplhour_dict.offsetstart, true, false, false)
                } else if (is_field_end_conf) {
                    time_label = loc.End_time + ":";
                    time_display = format_time_from_offset_JSvanilla( loc, emplhour_dict.rosterdate, emplhour_dict.offsetend, true, false, false)
                }
                el_mod_status_time_label.innerText = time_label;
                el_mod_status_time.innerText = time_display;

                document.getElementById("id_mod_status_order").innerText = emplhour_dict.c_o_code;
                document.getElementById("id_mod_status_employee").innerText = emplhour_dict.employeecode;
                document.getElementById("id_mod_status_shift").innerText = (emplhour_dict.shiftcode);

                let msg01_text = null;
                if(has_no_order){
                    msg01_text = loc.Cannot_confirm_shift_without_order;
                } else if(is_restshift && !is_field_status){
                    msg01_text = loc.Cannot_confirm_rest_shift;
                } else if(has_no_employee && !is_field_status){
                    msg01_text = loc.Cannot_confirm_shift_without_employee;
                } else if(has_overlap_normal_or_abs && !is_field_status){
                    msg01_text = loc.You_cannot_confirm_overlapping_shift;
                } else if(has_no_time && !is_field_status){
                    msg01_text = loc.You_must_first_enter +
                                 ( (is_field_start_conf) ? loc.a_starttime : loc.an_endtime ) +
                                 loc.enter_before_confirm_shift;
                }

           // open msgbox when when locked and confirmstart / confirmend
                // don't open modal when locked and confirmstart / confirmend

                // mod_confirm is msgbox 'OK / Cancel'
                // mod_status is also for setting confirmation
                let show_mod_status = false;
                if (is_field_status) {
                    // PERMITS status field can only be unlocked by HRman
                    // - supervisor can only lock single row
                    // - HRman can lock and unlock_rows, also lock all rows of this rosterdate
                    show_mod_status = (permit_unlock_rows) ? true : !stat_locked;
               } else if (is_field_start_conf || is_field_end_conf){
                    // PERMITS confirm field can only be opened by supervisor
                    // can only confirm and undo confirm when not stat_locked
                    if (permit_lock_rows){
                        if (stat_locked){
                            msg01_text = loc.This_shift_is_locked;
                        } else {
                            // - when field is confirmed: can undo,
                            //      also when has_overlap or has_no_employee (in case not allowing confirmation has gone wrong)
                            // when field is not confirmed: can only confirm when has employee and has no overlap:
                            // allow_open =  (field_is_confirmed ) ? true : !has_overlap;
                            if(field_is_confirmed) {
                                // when field is confirmed: can undo
                                show_mod_status = true;
                            } else if (!msg01_text){
                                show_mod_status = true;
                            }
                        }
                    }

               }
               if(show_mod_status) {
                    // hide start / end time when is_field_status or when field_is_confirmed
                    add_or_remove_class(el_mod_status_time_container, cls_hide, is_field_status || field_is_confirmed );

                    el_mod_status_note.value = null;

                    // show el_lockall_container only when is_field_status and when HRman
                    add_or_remove_class(el_mod_status_lockall_container, cls_hide, !(is_field_status && permit_unlock_rows));
                    el_mod_status_lockall.checked = false;
                    let caption = (stat_locked) ? loc.Unlock_all_shifts_of : loc.Lock_all_shifts_of;
                    // function format_dateISO_vanilla (loc, date_iso, hide_weekday, hide_year, is_months_long, is_weekdays_long)
                    caption += format_dateISO_vanilla (loc, emplhour_dict.rosterdate, false, false, true , true);
                    el_mod_status_lockall_label.innerText = caption;
                    el_mod_status_btn_save.innerText = btn_save_text;
                    set_focus_on_el_with_timeout(el_mod_status_btn_save, 50);
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
                 }  // iif(!show_mod_status)
            //};  // if (allow_open) {
        }  // if(!row_is_locked && (permit_lock_rows || permit_unlock_rows) ){
    }; // function ModalStatusOpen

//=========  ModalStatusSave  ================ PR2019-07-11
    function ModalStatusSave() {
        //console.log("===  ModalStatusSave =========");

        const stat_locked = mod_status_dict.stat_locked;

        let tr_changed = document.getElementById(mod_status_dict.mapid)

// ---  toggle status
        const status_array  = mod_status_dict.status_array;
        let new_value_bool = null;
        if(mod_status_dict.is_field_start_conf){
            new_value_bool = (!status_array[2]);// STATUS_02_START_CONFIRMED = 2
            // PR2021-02-10 debug: also delete STATUS_01_START_PENDING whem deleting start_conf; happens on server

        } else if(mod_status_dict.is_field_end_conf){
            new_value_bool = (!status_array[4]); // STATUS_04_END_CONFIRMED = 4
            // PR2021-02-10 debug: also delete STATUS_03_END_PENDING whem deleting start_end; happens on server
        } else if(mod_status_dict.is_field_status){
            new_value_bool = (!status_array[5]);// STATUS_05_LOCKED = 32
        }

        // period_datefirst and period_datelast necessary for check_emplhour_overlap PR2020-07-22
        const upload_dict = {id: {pk: mod_status_dict.emplhour_pk,
                                ppk: mod_status_dict.orderhour_pk
                                },
                            //period_datefirst: selected_period.period_datefirst,
                            //period_datelast: selected_period.period_datelast,
                            status: {field: mod_status_dict.field,
                                     value: new_value_bool,
                                     update: true}
                            }
        if(mod_status_dict.new_offset) {
            const field = (mod_status_dict.is_field_start_conf) ? "offsetstart" :  (mod_status_dict.is_field_end_conf) ? "offsetend" : null;
            if (field){ upload_dict[field] = {value: mod_status_dict.new_offset, update: true}};
         }
         if(el_mod_status_note.value) {
            upload_dict.note =  {value: el_mod_status_note.value, update: true};
         }
         const el_lockall = document.getElementById("id_mod_status_lockall");

         if(mod_status_dict.is_field_status && el_lockall.checked) {
            if(new_value_bool) {
                upload_dict.lockall =  {value: true, update: true};
            } else {
                upload_dict.unlockall =  {value: true, update: true};
            }
         }

        $("#id_mod_status").modal("hide");

        UploadChanges(upload_dict, url_emplhour_upload) ;

    }  // ModalStatusSave


//  #############################################################################################################

//=========  CheckForUpdates  === PR2020-08-06
    function CheckForUpdates() {
        //console.log("===  CheckForUpdates == ");
        const datalist_request = {
            roster_period: {get: true, now: now_arr},
            emplhour: {mode: "emplhour_check"}
            }
        DatalistDownload(datalist_request, true); // no_loader = true
    }  // CheckForUpdates

//=========  UpdateOverlap  === PR2020-05-13
    function UpdateOverlap(overlap_dict, skip_reset_all) {
        //console.log("===  UpdateOverlap == ");
        //console.log("overlap_dict", overlap_dict);
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
            //console.log("elements", elements);
            for (let i = 0, el; el = elements[i]; i++) {
                add_or_remove_class(el, "border_bg_invalid", false)
                add_or_remove_attr(el, "title", false)
            };
        }
// loop through overlap_dict
        //     overlap_dict: {502: {'end': [505, 504], 'end_normal': True, 'start': [505, 504], 'start_normal': True},
        //           505: {'start': [502], 'start_rest': True, 'end': [502, 504], 'end_rest': True, 'end_normal': True},
        //           504: {'start': [502, 505], 'start_rest': True, 'end': [502], 'end_rest': True, 'start_normal': True}}
        for (const [key, item_dict] of Object.entries(overlap_dict)) {
            const map_id = "emplhour_" + key;
            const row = document.getElementById(map_id)
            if(row){
                const emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, map_id)
                const employee_code = emplhour_dict.employeecode;
                const fields = ["start", "end"];
                for (let i = 0, field; i<2; i++) {
                    field = fields[i];
                    const filter = "[data-field='offset" + field + "']";
                    let el = row.querySelector(filter);
                    if (field in item_dict){
                        let title_overlap = (employee_code) ? employee_code + " " + loc.has_overlapping_shift + ":" :
                                                              loc.Shift_has_overlap_with + ":"

                        // overlap_abs etc is true when one of the other overlapping shifts is a nabesnecce etc shift
                        const overlap_abs = (!!item_dict[field + "_abs"]);
                        const overlap_rest = (!!item_dict[field + "_rest"]);
                        const overlap_normal = (!!item_dict[field + "_normal"]);

                        const arr = item_dict[field];
                        for (let j = 0, emplh_pk; emplh_pk = arr[j]; j++) {
                            const emplh_dict = get_mapdict_from_datamap_by_tblName_pk(emplhour_map, "emplhour", emplh_pk.toString())
                            const cust_order_code = emplh_dict.c_o_code;
                            const timestart = format_time_from_offset_JSvanilla( loc, emplh_dict.rosterdate, emplh_dict.offsetstart, true, false, false)
                            const timeend = format_time_from_offset_JSvanilla( loc, emplh_dict.rosterdate, emplh_dict.offsetend, true, false, false)
                            const is_restshift = emplh_dict.oh_isrestshift;

                            if(cust_order_code) {
                                if(is_restshift){
                                    title_overlap += "\n" + cust_order_code + ", " + loc.Rest_shift.toLowerCase();
                                    if(timestart || timeend) {title_overlap += " " + timestart + " - " + timeend};
                                } else {
                                    title_overlap += "\n" + cust_order_code + ", " + timestart + " - " + timeend;
                                }
                            } else {
                                title_overlap += "\n" + "<" + loc.Shift_outside_display_period + ">";
                            }
                        }
                        add_or_remove_class(el, "border_bg_invalid", true)
                        add_or_remove_attr(el, "title", true, title_overlap)

                        add_or_remove_attr(el, "data-ovl_abs", overlap_abs, "1")
                        add_or_remove_attr(el, "data-ovl_rest", overlap_rest, "1")
                        add_or_remove_attr(el, "data-ovl_normal", overlap_normal, "1")

                    } else {
// remove red background when field not found in item_dict
                        add_or_remove_class(el, "border_bg_invalid", false)
                        add_or_remove_attr(el, "title", false)

                        add_or_remove_attr(el, "data-ovl_abs", false)
                        add_or_remove_attr(el, "data-ovl_rest", false)
                        add_or_remove_attr(el, "data-ovl_normal", false)
                    }
                }
            }

        }
    }

    function CheckStatus() {
        //console.log( "=== CheckStatus ")
        // function loops through emplhours, set questingsmark or warning when timestart / end reached

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

                const item_dict = get_mapdict_from_datamap_by_id (emplhour_map, tblRow.id)
                // TODO correct
                const status_sum = get_dict_value(item_dict, ["status", "value"])
                const start_confirmed = status_found_in_statussum(2, status_sum);//STATUS_02_START_CONFIRMED
                const end_confirmed = status_found_in_statussum(4, status_sum);//STATUS_04_END_CONFIRMED
                const status_locked = (status_sum >= 8) //STATUS_05_LOCKED = 8

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
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//=========  UpdateEmployeeOrderNotes  === PR2021-02-16
    function UpdateEmployeeOrderNotes(fldName, note_rows, pk_str) {
        //console.log("===  UpdateEmployeeOrderNotes == ");
        //console.log("fldName" , fldName);
        //console.log("note_rows" , note_rows);

        for (let i = 0, tblRow; tblRow = tblBody_datatable.rows[i]; i++) {
            const el_div = tblRow.querySelector("[data-field='" + fldName  + "']");
            if(el_div){
                const map_dict = get_mapdict_from_datamap_by_id(emplhour_map, tblRow.id);
                const id_int = (fldName === "employeenote") ? map_dict.employee_id :
                            (fldName === "ordernote") ? map_dict.o_id : null;
                if(!pk_str || Number(pk_str) === id_int){
                    let title = "";
                    if (id_int in note_rows){
                        const note_row = note_rows[id_int];
                        const len = note_row.note_agg.length;
                        for (let i = 0, value; i < len; i++) {
                            value = note_row.note_agg[i];
                            if(value){
                                if (title) {title += "\n"};
                                title += value;
                    }}};
                    if(title){
                        el_div.title = title ;
                    } else {
                        el_div.removeAttribute("title")
                    }
                    add_or_remove_class(el_div, "edit_0_1", !!title)

                    if(pk_str){ShowOkElement(el_div)};
                }}}
    }  // UpdateEmployeeOrderNotes

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//=========  UpdateEmplhourNotes  === PR2021-02-14  PR2021-02-22
    function UpdateEmplhourNotes(response_emplhournote_rows, skip_reset_all) {
        //console.log("===  UpdateEmplhourNotes == ");
        //console.log("emplhournote_rows", emplhournote_rows);
        //console.log("skip_reset_all", !!skip_reset_all);

        const icon_note = "edit_0_1", icon_usernote = "edit_1_1"
        // refresh emplhournote_rows outside this function, because updating 1 row will erase the rest
        // was: emplhournote_rows = response_emplhournote_rows;
// remove all note icons from emplhour rows
        if(!skip_reset_all){
            //  code is same as add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class)
            let elements = tblBody_datatable.querySelectorAll(".edit_0_1, .edit_1_1");
            for (let i = 0, el; el = elements[i]; i++) {
                add_or_remove_class (el, icon_note, false)
                add_or_remove_class (el, icon_usernote, false)
                el.removeAttribute("data-icon_class_has_usernote")
            };
        }

// loop through emplhournote_rows
        // emplhournote_rows: {9057: {end: [9059], start: [9058]}, 9058: {end: [9057, 9059]}, 9059: {start: [9057, 9058]}}
        for (const [emplhour_pk, item_dict] of Object.entries(emplhournote_rows)) {
            //console.log ("emplhour_pk", emplhour_pk, typeof emplhour_pk)
            //console.log ("item_dict", item_dict)

            let has_usernote = (!!item_dict.usernote_count)
            const len = item_dict.note_agg.length;
            let title = "";
            for (let i = 0, value; i < len; i++) {
                value = item_dict.note_agg[i];
                if(value){
                    if (title) {title += "\n"}
                    title += value
                }
            }
            UpdateEmplhourNotesIcon(emplhour_pk, has_usernote, title, true )
        }
    }  // UpdateEmplhourNotes

//=========  UpdateEmplhourNotesIcon  === PR2021-02-10
    function UpdateEmplhourNotesIcon(emplhour_pk, has_usernote, title, add_icon, show_ok) {
        //console.log("===  UpdateEmplhourNotesIcon == ");
        const map_id = "emplhour_" + emplhour_pk
        const icon_note = "edit_0_1", icon_usernote = "edit_1_1"
        const row = document.getElementById(map_id);
        if(row){
            const el = row.querySelector("[data-field='hasnote']");
            if(el){
                const icon_class = (has_usernote) ? icon_usernote : icon_note;
                add_or_remove_class(el, icon_class, add_icon)
                if (add_icon){
                    el.setAttribute("data-filter", "1")
                } else {
                    el.removeAttribute("data-filter")
                }

                el.title = title;

                if(show_ok){ShowOkElement(el);}
        }}
    }  // UpdateEmplhourNotesIcon

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//=========  UpdateEmplhourStatus  === PR2021-02-14
    function UpdateEmplhourStatus(emplhourstatus_rows, skip_reset_all) {
        //console.log("===  UpdateEmplhourStatus == ");
        //console.log("emplhourallowance_dict", emplhourallowance_dict);
        // --- lookup input field with name: fieldname
                //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                // CSS.escape not supported by IE, Chrome and Safari,
                // CSS.escape is not necessary, there are no special characters in fieldname
                // a space between two selecors makes it a descendant selector
                // from https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator
        const icon_class = "edit_0_7"
// remove all allowance icons from emplhour rows
/*
        if(!skip_reset_all){
            //  code is same as add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class)
            let elements = tblBody_datatable.querySelectorAll("." + icon_class);
            for (let i = 0, el; el = elements[i]; i++) {
                add_or_remove_class (el, icon_class, false)
                el.removeAttribute("data-filter")
            };
        }
*/

// loop through emplhourallowance_dict
        for (const [emplhour_pk, item_dict] of Object.entries(emplhourstatus_rows)) {
            //console.log("item_dict", item_dict);
            UpdateEmplhourStatusItem(emplhour_pk, item_dict, true)
        }
    }  // UpdateEmplhourStatus

//=========  UpdateEmplhourStatusItem  === PR2021-02-10
    function UpdateEmplhourStatusItem(emplhour_pk, item_dict, add_icon, show_ok) {
        //console.log("===  UpdateEmplhourStatusItem == ");
        //console.log("emplhour_pk", emplhour_pk);
        const map_id = "emplhour_" + emplhour_pk
        //console.log("map_id", map_id);
        const icon_class = "edit_0_7";
        const tblRow = document.getElementById(map_id);
        //console.log("item_dict", item_dict);
        //console.log("tblRow", tblRow);
        if(tblRow){
            let title_start = "", title_end = "";
            for (let i = 0, status, is_removed, ehal_id; ehal_id = item_dict.ehst_id_agg[i]; i++) {
                status = item_dict.ehst_status_agg[i];
                is_removed = item_dict.ehst_isremoved_agg[i];

                const modified_dateJS = parse_dateJS_from_dateISO(item_dict.ehst_modifiedat_agg[i]);
                const modified_date_formatted = format_datetime_from_datetimeJS(loc, modified_dateJS)

                if(status === 4){
                    if (title_start) {title_start += "\n"}
                    title_start += (is_removed) ? loc.Cancelled_by : loc.Confirmed_by;
                    title_start += (item_dict.ehst_modifiedby_agg[i]) ? item_dict.ehst_modifiedby_agg[i] : "-";
                    title_start += loc._on_ +  modified_date_formatted;
                } else if (status === 16){
                    if (title_end) {title_end += "\n"}
                    title_end += (is_removed) ? loc.Cancelled_by : loc.Confirmed_by;
                    title_end += (item_dict.ehst_modifiedby_agg[i]) ? item_dict.ehst_modifiedby_agg[i] : "-";
                    title_end += loc._on_ +  modified_date_formatted;
                }
            }

            /*
                        add_or_remove_class(el, icon_class, add_icon)
            if (add_icon){
                el.setAttribute("data-filter", "1")
            } else {
                el.removeAttribute("data-filter")
            }
            */

            const el_start = tblRow.querySelector("[data-field='stat_start_conf']");
            if (el_start) {
                el_start.title = title_start
                if(show_ok){ShowOkElement(el_start)};
            };
            const el_end = tblRow.querySelector("[data-field='stat_end_conf']");
            if (el_end) {
                el_end.title = title_end
                if(show_ok){ShowOkElement(el_end)};
            };


        }
    }  // UpdateEmplhourStatusItem


//=========  UpdateAllowance  === PR2021-02-10
    function UpdateAllowance(emplhourallowance_dict, skip_reset_all) {
        //console.log("===  UpdateAllowance == ");
        //console.log("emplhourallowance_dict", emplhourallowance_dict);
        // --- lookup input field with name: fieldname
                //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                // CSS.escape not supported by IE, Chrome and Safari,
                // CSS.escape is not necessary, there are no special characters in fieldname
                // a space between two selecors makes it a descendant selector
                // from https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator
        const icon_class = "edit_0_7"
// remove all allowance icons from emplhour rows
        if(!skip_reset_all){
            //  code is same as add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class)
            let elements = tblBody_datatable.querySelectorAll("." + icon_class);
            for (let i = 0, el; el = elements[i]; i++) {
                add_or_remove_class (el, icon_class, false)
                el.removeAttribute("data-filter")
            };
        }

// loop through emplhourallowance_dict
        // emplhourallowance_dict: {9057: {end: [9059], start: [9058]}, 9058: {end: [9057, 9059]}, 9059: {start: [9057, 9058]}}
        for (const [emplhour_pk, item_dict] of Object.entries(emplhourallowance_dict)) {
            UpdateAllowanceIcon(emplhour_pk, item_dict, true)
        }
    }  // UpdateAllowance

//=========  UpdateAllowanceIcon  === PR2021-02-10
    function UpdateAllowanceIcon(emplhour_pk, item_dict, add_icon, show_ok) {
        const map_id = "emplhour_" + emplhour_pk
        const icon_class = "edit_0_7";
        const row = document.getElementById(map_id);
        //console.log("row", row);
        if(row){

            const el = row.querySelector("[data-field='hasallowance']");
            if(el){
                add_or_remove_class(el, icon_class, add_icon)
                if (add_icon){
                    el.setAttribute("data-filter", "1")
                } else {
                    el.removeAttribute("data-filter")
                }

                let title = "";
                for (let i = 0, ehal_id; ehal_id = item_dict.ehal_id_agg[i]; i++) {
                    if (title) {title += "\n"}
                    title += (item_dict.description_agg[i]) ? item_dict.description_agg[i] : "";
                    const quantity = item_dict.quantity_agg[i];
                    if (!quantity){
                        title +=  " (-)"
                    } else {
                        title +=  " (" + quantity / 10000 + "x)"
                    }
                }
                el.title = title;

                if(show_ok){ShowOkElement(el);}
        }}
    }  // UpdateAllowanceIcon


//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++
/*
//========= MSO_MSE_Filter_SelectRowsXXX  ====================================
    function MSO_MSE_Filter_SelectRowsXXX() {
        //console.log( "===== MSO_MSE_Filter_SelectRowsXXX  ========= ");
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
    }; // MSO_MSE_Filter_SelectRowsXXX

*/


//========= HandleFilterKeyup  ====================================
    function HandleFilterKeyup(el, col_index, event) {
        //console.log( "===== HandleFilterKeyup  ========= ");
        //console.log( "col_index", col_index, "event.key", event.key);
        // skip filter if filter value has not changed, update variable filter_text

        const skip_filter = t_SetExtendedFilterDict(el, col_index, filter_dict, event.key);
        //console.log( "filter_dict", filter_dict);

        if (!skip_filter) {
            Filter_TableRows();
        } //  if (!skip_filter) {
    }; // function HandleFilterKeyup


//========= HandleFilterImage  =============== PR2020-07-21 PR2020-09-14
    function HandleFilterImage(el_input, col_index) {
        //console.log( "===== HandleFilterImage  ========= ");
        //console.log( "col_index", col_index);
        //console.log( "filter_dict", filter_dict);

         const filter_tag = field_settings.filter_tags[col_index];

        // filter_dict[col_index] =  ["status", "1"]
        const filter_array = (col_index in filter_dict) ? filter_dict[col_index] : [];
        const filter_value = (filter_array[1]) ? filter_array[1] : 0;

        const new_value = Math.abs(filter_value - 1);
        filter_dict[col_index] = [filter_tag, new_value]
        add_or_remove_class(el_input, "stat_1_0", (new_value === 1), "stat_0_0")
        Filter_TableRows();

    };  // HandleFilterImage

//========= Filter_TableRows  ====================================
    function Filter_TableRows() {  // PR2019-06-09 PR2020-08-31
        //console.log( "===== Filter_TableRows=== ");
        //console.log( "filter_dict", filter_dict);
                //console.log( "filter_array", filter_array);
        // function filters by inactive and substring of fields
        //  - iterates through cells of tblRow
        //  - skips filter of new row (new row is always visible)
        //  - if filter_name is not null:
        //       - checks tblRow.cells[i].children[0], gets value, in case of select element: data-value
        //       - returns show_row = true when filter_name found in value
        //  - if col_inactive has value >= 0 and hide_inactive = true:
        //       - checks data-value of column 'inactive'.
        //       - hides row if inactive = true

        for (let i = 0, tblRow, show_row; tblRow = tblBody_datatable.rows[i]; i++) {
            tblRow = tblBody_datatable.rows[i]
            const filter_row = t_create_filter_row(tblRow, filter_dict);
            show_row = t_ShowTableRowExtended(filter_row, filter_dict);
        //console.log( "show_row", show_row);
            add_or_remove_class(tblRow, cls_hide, !show_row)
        }
    }; // Filter_TableRows



//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
       //console.log( "===== ResetFilterRows  ========= ");

        filter_dict = {};
        filter_hide_inactive = true;

// ---   empty filter input boxes in filter header
        b_reset_tblHead_filterRow(tblHead_datatable)

// ---  deselect highlighted rows, reset selected_emplhour_pk
        selected_emplhour_pk = 0;
        DeselectHighlightedTblbody(tblBody_datatable, cls_selected)

// ---  reset filtered tablerows
        Filter_TableRows();

    }  // function ResetFilterRows

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
                const el_div = tblRow.querySelector("[data-field=" + fldName + "]");
                if(el_div) {
                    if (["offsetstart", "offsetend"].includes(fldName)) {
                        el_div.innerText = format_time_from_offset_JSvanilla( loc, tp_dict.rosterdate, tp_dict.offset,
                            true, false, false)  // true = display24, true = only_show_weekday_when_prev_next_day, false = skip_hour_suffix
                    } else if (["breakduration", "breakduration"].includes(fldName)) {
                        el_div.innerText = display_duration (tp_dict.offset, loc.user_lang)
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
                if ("emplhournote_updates" in response) {
                    //console.log(" --->> RefreshEmplhourNoteRows  ---");
                    RefreshEmplhourNoteRows(response.emplhournote_updates)
                }
                if ("emplhour_updates" in response) {
                    refresh_updated_emplhour_rows(response.emplhour_updates, true)
                }
                if ("overlap_dict" in response) {
                    UpdateOverlap(response["overlap_dict"], true); // true = skip_reset_all
                }
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
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
        console.log("=== UploadChanges");
        console.log("url_str: ", url_str);

        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)};
            //console.log("upload_dict", upload_dict);

// if delete: make tblRow red
            const is_delete = (!!get_dict_value(upload_dict, ["id","delete"]))
            if(is_delete){
                const map_id = get_mapid_from_dict (upload_dict);
                b_ShowTblrow_OK_Error_byID(map_id);
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

                    // update EmplhourNotes must come before refresh_updated_emplhour_rows
                    if ("emplhournote_updates" in response) {
                        RefreshEmplhourNoteRows(response.emplhournote_updates)
                    }
                    if ("emplhourstatus_updates" in response) {
                        RefreshEmplhourStatusRows(response.emplhourstatus_updates)
                    }
                    // refresh page on open page or when rosterdate is added or removes
                    if ("emplhour_rows" in response) {
                        FillEmplhourMap(response.emplhour_rows);
                        //this one gives wrong mapid: b_refresh_datamap(response.emplhour_rows, emplhour_map)
                        FillTblRows();
                    };
                    // update changed rows only
                    if ("emplhourallowance_updates" in response) {
                        RefreshEmplhourAllowanceRows(response.emplhourallowance_updates)
                    }

                    if ("employeenote_updates" in response) {
                        RefreshEmployeeNoteRows(response.employeenote_updates)
                    }
                    if ("ordernote_updates" in response) {
                        RefreshOrderNoteRows("ordernote", response.ordernote_updates)
                    }
                    if ("emplhour_updates" in response) {
                        refresh_updated_emplhour_rows (response.emplhour_updates, false)
                    }
                    if ("rosterdate_check" in response) {
                        MRD_Checked(response.rosterdate_check);
                    };
                    if ("rosterdate" in response) {
                        MRD_Finished(response.rosterdate);
                    };
                    if("emplh_shift_dict" in response){
                        MSS_UploadResponse(response.emplh_shift_dict)
                    }
                    if ("overlap_dict" in response) {
                        UpdateOverlap(response.overlap_dict, true); // / true  =  skip_reset_all
                    }
                    if ("logfile" in response) {
                        const new_rosterdate = get_dict_value(response, ["rosterdate", "rosterdate", "rosterdate"], "")
                        log_file_name = "logfile_create_roster_" + new_rosterdate;
                        log_list = response.logfile

                        // hide logfile button when when there is no logfile
                        // PR2020-11-09 always hide log btn . Was: add_or_remove_class (el_MRD_btn_logfile, cls_hide, (!log_list.length))

                    } else {
                        // hide logfile button when when there is no logfile
                        // PR2020-11-09 always hide log btn . Was: add_or_remove_class (el_MRD_btn_logfile, cls_hide, true)
                    };
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
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
        //console.log("emplhour_map.size", emplhour_map.size)
    };  // FillEmplhourMap


//=========  refresh_updated_emplhour_rows  ================ PR2020-08-14
    function refresh_updated_emplhour_rows(emplhour_updates, is_update_check) {
        //console.log(" --- refresh_updated_emplhour_rows  ---");
        if (emplhour_updates) {
            for (let i = 0, update_dict; update_dict = emplhour_updates[i]; i++) {
                refresh_updated_emplhour_row(update_dict, is_update_check)
            }
        }
    } // refresh_updated_emplhour_rows

//=========  refresh_updated_emplhour_row  ================ PR2020-08-14
    function refresh_updated_emplhour_row(update_dict, is_update_check) {
        //console.log(" --- refresh_updated_emplhour_row  ---");
        //console.log("is_update_check", is_update_check);
        //console.log("update_dict", deepcopy_dict(update_dict));

// ---  update or add emplhour_dict in emplhour_map
        const map_id = update_dict.mapid;
        const old_map_dict = emplhour_map.get(map_id);
        const is_deleted = update_dict.deleted;
        const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

        //console.log("map_id", map_id);
        //console.log("is_created", is_created);
        //console.log("is_deleted", is_deleted);
        //console.log("emplhour_map.size before: " + emplhour_map.size);

        let updated_columns = [];
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
            //check haschanges, update status field when changed
            if ("haschanged" in old_map_dict && "haschanged" in update_dict){
                if (old_map_dict.haschanged !== update_dict.haschanged ) {
                    updated_columns.push("status")
                }
            }
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
            let search_orderby = t_get_orderby_exceldate_cocode_excelstart(update_dict, spaces_48);
            let row_index = t_get_rowindex_by_orderby(tblBody_datatable, search_orderby);
// add new tablerow if it does not exist
            tblRow = CreateTblRow(map_id, update_dict, row_index, true)
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
                const is_pay_or_inv_locked = (update_dict.stat_pay_locked || update_dict.stat_inv_locked);
                const is_locked = (is_pay_or_inv_locked || update_dict.stat_locked);
                const status_array = b_get_status_array(update_dict.status);

// ---  make updated fields green for 2 seconds
                for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                    const el = cell.children[0];
                    if(el){
                        const el_field = get_attr_from_el(el, "data-field")
                        if(updated_columns.includes(el_field)){

                            UpdateField(tblRow, el, update_dict, is_pay_or_inv_locked, is_locked, status_array)
                            ShowOkElement(cell);
                        }
                    }
                }
            }
        }
    }  // refresh_updated_emplhour_row

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

//=========  RefreshEmplhourAllowanceRows  ================ PR2021-02-10
    function RefreshEmplhourAllowanceRows(emplhourallowance_updates) {
        //console.log(" ----- RefreshEmplhourAllowanceRows  -----");
        if (emplhourallowance_updates) {
            for (const [emplhour_pk, updated_row] of Object.entries(emplhourallowance_updates)) {
                //console.log("updated_row", updated_row);
                const add_icon = (!isEmpty(updated_row))
                if(add_icon){
                    emplhourallowance_dict[emplhour_pk] = updated_row;
                } else {
                    delete emplhourallowance_dict[emplhour_pk]
                }
                UpdateAllowanceIcon(emplhour_pk, updated_row, add_icon, true); // true = show_ok
        }}
         //console.log("emplhourallowance_dict", emplhourallowance_dict);
    } // RefreshEmplhourAllowanceRows



//=========  RefreshEmplhourStatusRows  ================ PR2021-02-21
    function RefreshEmplhourStatusRows(emplhourstatus_updates) {
        //console.log(" ===  RefreshEmplhourStatusRows ===");
        //console.log("emplhourstatus_updates: ", emplhourstatus_updates);

        if (emplhourstatus_rows && emplhourstatus_updates) {
            for (const [emplhour_pk, updated_row] of Object.entries(emplhourstatus_updates)) {
        //console.log("emplhour_pk: ", emplhour_pk);
        //console.log("updated_row: ", updated_row);
                emplhourstatus_rows[emplhour_pk] = updated_row;

                UpdateEmplhourStatusItem(emplhour_pk, updated_row, true);  // true = skip_reset_all
            }
        }
        //console.log("emplhourstatus_rows: ", emplhourstatus_rows);
    } // RefreshEmplhourStatusRows



//=========  RefreshEmplhourNoteRows  ================ PR2020-10-15
    function RefreshEmplhourNoteRows(emplhournote_updates) {
        //console.log("=== RefreshEmplhourNoteRows ===");
        //console.log("emplhournote_updates", emplhournote_updates);
        //console.log("emplhournote_rows", emplhournote_rows);
        if (emplhournote_rows && emplhournote_updates) {
            for (const [emplhour_pk_str, updated_row] of Object.entries(emplhournote_updates)) {
        //console.log("emplhour_pk_str: ", emplhour_pk_str, typeof emplhour_pk_str);
        //console.log("updated_row: ", updated_row);
                emplhournote_rows[emplhour_pk_str] = updated_row;

            }
        }
        UpdateEmplhourNotes(emplhournote_updates, true)  // true = skip_reset_all
    } // RefreshEmplhourNoteRows


//=========  RefreshEmployeeNoteRows  ================ PR2021-02-16
    function RefreshEmployeeNoteRows(employeenote_updates) {
        //console.log("RefreshEmployeeNoteRows: ");
        //console.log("employeenote_updates: ", employeenote_updates);
        if (employeenote_updates && employeenote_updates) {
            for (const [employee_pk, updated_row] of Object.entries(employeenote_updates)) {
                employeenote_rows[employee_pk] = updated_row;
                UpdateEmployeeOrderNotes("employeenote", employeenote_rows, employee_pk)
            }
        }
        //console.log("employeenote_rows: ", employeenote_rows);
    } // RefreshEmployeeNoteRows


//=========  RefreshOrderNoteRows  ================ PR2021-02-16
    function RefreshOrderNoteRows(tblName, note_updates) {
        //console.log("RefreshOrderNoteRows: ");
        //console.log("note_updates: ", note_updates);
        const note_rows = (tblName === "employeenote") ? employeenote_rows : (tblName === "ordernote") ? ordernote_rows : null;
        if (note_updates && note_rows) {
            for (const [pk_str, updated_row] of Object.entries(note_updates)) {
                note_rows[pk_str] = updated_row;
                UpdateEmployeeOrderNotes(tblName, note_rows, pk_str)
            }
        }
        //console.log("employeenote_rows: ", employeenote_rows);
    } // RefreshEmploye

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


//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++ MOD ROSTERDATE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  MRD_Open  ================ PR2020-01-21 PR2020-07-26
    function MRD_Open(crud_mode) {
        //console.log(" -----  MRD_Open   ----", crud_mode)

        const is_delete = (crud_mode === "delete")

// reset mod_MRD_dict
        mod_MRD_dict = {mode: crud_mode};

// show loader in modal
        el_MRD_loader.classList.remove(cls_hide)
        el_MRD_msg_container.innerHTML = null;

// --- check if rosterdate has emplhour records and confirmed records
        const upload_dict = {mode: ( (is_delete) ? "check_delete" : "check_create" )};
         UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
        // returns function MRD_Checked

// set header and input label
        el_MRD_header.innerText = (is_delete) ? loc.rosterdate_hdr_delete : loc.rosterdate_hdr_create;
        el_MRD_label.innerText = loc.Rosterdate + ": "

// update value of input label
        MRD_set_rosterdate_label();

// set value of el_MRD_rosterdate_input blank, set readOnly = true
        el_MRD_rosterdate_input.value = null
        el_MRD_rosterdate_input.readOnly = true;

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work
        setTimeout(function (){
            el_MRD_rosterdate_input.focus()
        }, 50);

// set msg textboxes
        const msg_txt =  loc.rosterdate_checking + "...";
        el_MRD_msg_container.innerHTML = "<div class=\"pb-2\">" + msg_txt + "</div>"

// reset buttons
        const btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_class_remove = (is_delete) ? "btn-primary" :  "btn-outline-danger";
        const btn_text = (is_delete) ? loc.Delete : loc.Create

        el_MRD_btn_ok.innerText = btn_text;
        el_MRD_btn_ok.classList.remove(btn_class_remove)
        el_MRD_btn_ok.classList.add(btn_class_add)
        el_MRD_btn_ok.classList.remove(cls_hide)
        el_MRD_btn_ok.disabled = true;

        el_MRD_btn_cancel.innerText = loc.Cancel;

// ---  show modal
        $("#id_mod_rosterdate").modal({backdrop: true});
    };  // MRD_Open

// +++++++++  MRD_InputChange  ++++++++++++++++++++++++++++++ PR2019-11-12
    function MRD_InputChange() {
        //console.log("=== MRD_InputChange =========");
        //console.log("mod_MRD_dict", mod_MRD_dict);
        // called when date input changed

// reset mod_MRD_dict, keep 'mode'
        const mode = get_dict_value(mod_MRD_dict, ["mode"])
        const is_delete = (mode === "check_delete")

// get value from input element
        const new_rosterdate_iso = el_MRD_rosterdate_input.value;
// ---  validate new date = input date can be Sep 31.
        const new_dateJS = get_dateJS_from_dateISO (new_rosterdate_iso)
        const is_valid_date = (!!new_dateJS);

// update value of input label
        MRD_set_rosterdate_label(new_rosterdate_iso, is_valid_date);

        if(is_valid_date){
// --- show loader in modal
            el_MRD_loader.classList.remove(cls_hide)
// --- check if new rosterdate has emplhour records and confirmed records
            const upload_dict = {mode: mode,
                                 rosterdate: new_rosterdate_iso
                                 };
            UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
        // returns function MRD_Checked
        }
// set msg textboxes
        const msg_txt = (is_valid_date) ? loc.rosterdate_checking + "..." : loc.rosterdate_checking_cannot
        el_MRD_msg_container.innerHTML = "<div class=\"pb-2\">" + msg_txt + "</div>"

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
        // PR2020-11-09 always hide log btn . Was: add_or_remove_class (el_MRD_btn_logfile, cls_hide, (!log_list.length))

    }  // MRD_InputChange

// +++++++++  MRD_Save  ++++++++++++++++++++++++++++++ PR2021-02-21
function MRD_set_rosterdate_label(rosterdate_iso, is_valid_date){
// update value of input label
        let label_txt = loc.Rosterdate + ": ";
        if(rosterdate_iso){
            if(is_valid_date){
                label_txt += format_dateISO_vanilla (loc, rosterdate_iso, false, false, true, true);
            } else {
                label_txt += loc.Not_a_valid_date;
            }
        }
        el_MRD_label.innerText = label_txt
}

// +++++++++  MRD_Save  ++++++++++++++++++++++++++++++ PR2019-11-14 PR2020-07-26
    function MRD_Save() {
        //console.log("=== MRD_Save =========");
        const mode = get_dict_value(mod_MRD_dict, ["mode"])
        //console.log("mod_MRD_dict", mod_MRD_dict);
        //console.log("mode", mode);

// delete logfile when clicked on save button
        log_list = [];
        log_file_name = "";

        const is_delete = (mode === "check_delete")
        const is_another =  get_dict_value(mod_MRD_dict, ["another"], false)
        let upload_dict = {};
// --- check another rosterdate when mod_MRD_dict.another=true
        if (is_another) {
            mod_MRD_dict.another = false;
            // --- check if rosterdate has emplhour records and confirmed records
            upload_dict = {mode: mode};
        } else {
    // set msg textbox
            const msg_txt = ( (is_delete) ? loc.rosterdate_deleting : loc.rosterdate_adding )+ "...";
            el_MRD_msg_container.innerHTML ="<div class=\"pt-0 pb-2\">" + msg_txt + "</div>";

            let emplhour_dict = {
                employee_pk: (!!selected_period.employee_pk) ? selected_period.employee_pk : null,
                customer_pk: (!!selected_period.customer_pk) ? selected_period.customer_pk : null,
                order_pk: (!!selected_period.order_pk) ? selected_period.order_pk : null,
                add_shifts_without_employee: true,
                orderby_rosterdate_customer: true
            };
            upload_dict = { mode: ( is_delete ? "delete" : "create" ),
                              rosterdate: mod_MRD_dict.rosterdate,
                             // emplhour: emplhour_dict
                            };
        }
// ---  make input field readonly, disable ok btn
        el_MRD_rosterdate_input.readOnly = true;
        el_MRD_btn_ok.disabled = true;
// ---  show loader
        el_MRD_loader.classList.remove(cls_hide);
// ---  Upload Changes:
        UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
    }  // function MRD_Save

// +++++++++  MRD_Checked  ++++++++++++++++++++++++++++++ PR2019-11-13 PR2020-07-26
    function MRD_Checked(response_dict) {
        //console.log("=== MRD_Checked =========" );
        //console.log("response_dict:", response_dict );
        // response_dict: {mode: "last", value: "2019-12-19", count: 10, confirmed: 0}
        //rosterdate_check: {confirmed: 0, count: 0, mode: "check_create", rosterdate: "2021-02-21"

// add 'checked' to mod_MRD_dict, so left button will know it must cancel
        mod_MRD_dict = response_dict

        const mode = get_dict_value(response_dict, ["mode"]);
        const is_delete = (mode === "check_delete");

// update value of input label
        const rosterdate_iso = get_dict_value(response_dict, ["rosterdate"]);
        const is_valid_date = (!!get_dateJS_from_dateISO (rosterdate_iso));
        MRD_set_rosterdate_label(rosterdate_iso, is_valid_date);


        const count = get_dict_value(response_dict, ["count"], 0);
        const confirmed = get_dict_value(response_dict, ["confirmed"], false);
        const confirmed_only = (count === confirmed);
        const msg_list = get_dict_value(response_dict, ["msg_list"], 0);
        let msg_continue = null;
        let hide_ok_btn = false, ok_txt = loc.OK, cancel_txt = loc.Cancel;

// ---  hide rosterdate input when is-delete and no emplhours
        //const hide_input_rosterdate = (is_delete && !count)
        //add_or_remove_class(document.getElementById("id_MRD_input_div"), cls_hide, hide_input_rosterdate )

        if(!count){
// ---  This rosterdate has no shifts
            if (is_delete) {
                hide_ok_btn = true;
                cancel_txt = loc.Close;
            } else {
                ok_txt = loc.Create;
            }
        } else {
// ---  This rosterdate has [count] shifts
            if(is_delete && confirmed_only){
                    hide_ok_btn = true;
                    cancel_txt = loc.Close;
            } else {
                ok_txt = (is_delete) ? loc.Yes_delete : loc.Yes_create;
                cancel_txt = loc.No_cancel;
            }
        }

// show msg_txt
        let msg_html = ""
        for (let i = 0, msg_txt, len = msg_list.length; i < len; i++) {
            let class_str = "";
            if (!i){class_str = " class=\"pb-2\""}
            if(msg_list[i]){msg_html += "<div" + class_str + ">" + msg_list[i] + "</div>"}
        }
        if(count && !confirmed_only){msg_html += "<div class=\"pt-2\">" + loc.Do_you_want_to_continue + "</div>"}
        el_MRD_msg_container.innerHTML = msg_html;

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

    }  // function MRD_Checked

// +++++++++  MRD_Finished  ++++++++++++++++++++++++++++++ PR2019-11-13
    function MRD_Finished(response_dict) {
        //console.log("=== MRD_Finished =========" );
        //console.log("response_dict", response_dict );
        // rosterdate: {rosterdate: {…}, logfile:
        // response_dict = {mode: "delete", msg_01: "16 diensten zijn gewist."}
        // response_dict = {mode: "create", msg_02: "14 diensten zijn aangemaakt.",
        //                  msg_03: "2 afwezigheid of rustdiensten zijn aangemaakt.",
        //                  logfile: (130) [" ======= Logfile creating roster of: 2020-03-30 ======= ", ...]
        //                  rosterdate: {row_count: 16, rosterdate: "2020-03-30"}
        const mode = get_dict_value(response_dict,["mode"])
        const is_delete = (mode === "delete")

// ---  reset mod_MRD_dict
        mod_MRD_dict = {another: true,
                           mode: ( (is_delete) ? "check_delete" : "check_create" )
                          }
// ---  hide loader
        el_MRD_loader.classList.add(cls_hide)

// check for overlap, also get emplhourallowance and emplhournote (and emplhourstatus
        const datalist_request = {
            overlap: {get: true},
            emplhourallowance: {get: true},
            emplhournote: {get: true},
            emplhourstatus: {get: true},
            employeenote: {get: true},
            ordernote: {get: true}
            // skip this one : roster_period: selected_period};
        }
        DatalistDownload(datalist_request, true); // true = no_loader

// ---  set info textboxes
        let msg_html = ""
        if("msg_list" in response_dict){
            const msg_list = response_dict.msg_list;
            if (msg_list){
                for (let i = 0, msg_txt, len = msg_list.length; i < len; i++) {
                    let class_str = "";
                    if (!i){class_str = " class=\"pb-2\""}
                    if(msg_list[i]){msg_html += "<div" + class_str + ">" + msg_list[i] + "</div>"}
                }
            }
        }
        el_MRD_msg_container.innerHTML = msg_html;


// ---  put 'another' on ok button, put 'Close' on cancel button
        if (is_delete) {
            el_MRD_btn_ok.innerText = loc.Delete_another_roster;
            el_MRD_btn_ok.classList.remove("btn-outline-danger");
        } else {
            el_MRD_btn_ok.innerText = loc.Create_another_roster;
            el_MRD_btn_ok.classList.remove("btn-primary");
        }
        el_MRD_btn_ok.disabled = false;
        el_MRD_btn_ok.classList.add("btn-secondary")
        el_MRD_btn_cancel.innerText = loc.Close;
    }  // function MRD_Finished

//=========  ModRosterdateLogfile  ================ PR2020-03-30
    //PR2020-11-09 not in use any more
    function ModRosterdateLogfileXXX () {
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
        document.getElementById("id_confirm_header").innerText = loc.Delete_shift;
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
        // don't set max date, because adding shifts in the future must be possible
        //el_MRO_input_date.setAttribute("max", selected_period.period_datelast);

        el_MRO_extraorder.checked=false;

        el_MRO_input_order.value = (mod_dict.order_pk && mod_dict.cust_order_code) ? mod_dict.cust_order_code : null;
        el_MRO_input_shift.value = null;
        el_MRO_input_employee.value = null;

        el_MRO_offsetstart.innerText = null;
        el_MRO_offsetend.innerText = null;
        el_MRO_breakduration.innerText = null;
        el_MRO_timeduration.innerText = null;

        MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave("MRO");

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
        //                      {shiftcode: {value: mod_dict.shift_code, update: true},

        // id_MRO_extraorder added. When this is checked plandur will get value of timedur, null otherwise PR2020-11-27
        const is_extra_order = el_MRO_extraorder.checked;

        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                           period_datelast: selected_period.period_datelast,
                           id: {table: "emplhour", extraorder: is_extra_order, create: true},
                           rosterdate: {value: mod_dict.rosterdate},
                           orderhour: {order_pk: mod_dict.order_pk}
                           };
        if(!!mod_dict.rowindex){upload_dict.id.rowindex = mod_dict.rowindex};
        if(mod_dict.order_pk){upload_dict.order = {pk: mod_dict.order_pk, field: "order", update: true}};
        if(mod_dict.selected_employee_pk){upload_dict.employee = {pk: mod_dict.selected_employee_pk, field: "employee", update: true}};

        // TODO check if correct this way PR2020-11-01
        /* was:
        if(mod_dict.shift_pk){
            // when shift is selected, the shiftcode of selected shift is used, not mod_dict.shift_code
            upload_dict.shift = {pk: mod_dict.shift_pk, field: "shift", update: true};
        } else if(mod_dict.shift_code){
            // when no shift is selected, the shiftcode of mod_dict.shift_code is used
            upload_dict.shiftcode = {value: mod_dict.shift_code, update: true};
        }
        */
        if(mod_dict.shift_pk){
            upload_dict.shift = {pk: mod_dict.shift_pk, code: mod_dict.shift_code, update: true};
        } else if(el_MRO_input_shift.value){
            upload_dict.shiftcode = {value: el_MRO_input_shift.value, update: true};
        }

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

//=========  MRE_MRO_MSO_InputKeyup  ================ PR2020-02-29
    function MRE_MRO_MSO_InputKeyup(pgeName, tblName, el_input) {
       //console.log( "=== MRE_MRO_MSO_InputKeyup  ", tblName)
       //console.log( "el_input.value:  ", el_input.value)

        let tblBody_select = (pgeName === "MSO") ? el_MSO_tblbody_select :
                             (pgeName === "MSE") ? el_MSE_tblbody_select :
                             (pgeName === "MRE") ? el_MRE_tblbody_select :
                             (pgeName === "MRO") ? el_MRO_tblbody_select : null;

        const new_filter = el_input.value
        let only_one_selected_pk = false;
        if (new_filter && tblBody_select.rows.length){

// ---  filter select rows
            // if filter results have only one order: put selected order in el_MRO_input_order
            // filter_dict: {row_count: 1, selected_pk: "730", selected_ppk: "3", selected_value: "Rabo", selected_display: null}
            // selected_pk only gets value when there is one row
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
            only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"], false)

       //console.log( "filter_dict:  ", filter_dict)
            if (only_one_selected_pk) {
// ---  get pk of selected item (when there is only one row in selection)
                const pk_int = (!!Number(only_one_selected_pk)) ? Number(only_one_selected_pk) : null;
                MSE_MSO_MRE_MRO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int)

                 //MSE_MSO_MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow) {
// ---  set header and btn save enabled
                MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave(pgeName);
            }  //  if (!!selected_pk) {
        }
// ---  if no 'only_one_selected_pk' found: put el_input.value in mod_upload_dict.shift (shift may have custom name)
        if(tblName === "shift" && !only_one_selected_pk) {
            mod_dict.shift_code = new_filter;
        }

    }  // MRE_MRO_MSO_InputKeyup

//=========  MSO_MRE_MRO_OnFocus  ================ PR2020-08-19
    function MSO_MRE_MRO_OnFocus(pgeName, tblName) {
        //console.log("===  MSO_MRE_MRO_OnFocus  =====") ;
        //console.log( "pgeName: ", pgeName, "tblName: ", tblName);

        MSE_MSO_MRE_MRO_FillSelectTable(pgeName, tblName, null)
    }  // MSO_MRE_MRO_OnFocus

//=========  MSE_MSO_MRE_MRO_FillSelectTable  ================ PR2020-08-21
    function MSE_MSO_MRE_MRO_FillSelectTable(pgeName, tblName, selected_pk) {
        //console.log( "===== MSE_MSO_MRE_MRO_FillSelectTable ========= ");
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
                                     (tblName === "employee") ? ( (["tab_absence", "tab_abs_split"].includes(mod_dict.btn_select)) ? loc.Select_replacement_employee  : loc.Select_employee )  : "" ) + ":";

        const el_header = document.getElementById("id_" + pgeName + "_select_header")
        if(el_header){ el_header.innerText = select_header_text };

        const caption_none = (tblName === "customer") ? loc.No_customers :
                             (tblName === "order") ? loc.No_orders :
                             (tblName === "shift") ?  loc.No_shifts :
                             (tblName === "employee") ? loc.No_employees : "";

        let filter_pk = (tblName === "shift") ? mod_dict.order_pk : null;

        let tblBody_select = (pgeName === "MSO") ? el_MSO_tblbody_select :
                        (pgeName === "MSE") ? el_MSE_tblbody_select :
                        (pgeName === "MSE") ? el_MSE_tblbody_select :
                        (pgeName === "MRE") ? el_MRE_tblbody_select :
                        (pgeName === "MRO") ? el_MRO_tblbody_select : null;
        tblBody_select.innerText = null;

        let row_count = 0, add_to_list = false;
//--- loop through data_map or data_dict
        for (const [map_id, map_dict] of data_map.entries()) {
            add_to_list = MSE_MSO_MRE_MRO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, -1, selected_pk, mod_dict.rosterdate);
            if(add_to_list){ row_count += 1};
        };

// ---  disable input_order when no orders or only 1 order in tblName 'order'
        // disable when 'All customers' is set in MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave
        if (pgeName === "MSO" && tblName === "order") {mod_dict.order_count = row_count};
        const input_order_disabled = (pgeName === "MSO" && tblName === "order") && (
                                     (!mod_dict.customer_pk) ||
                                     (mod_dict.customer_pk && !mod_dict.order_count)  ||
                                     (mod_dict.customer_pk && mod_dict.order_count === 1)
                                     );
        el_MSO_input_order.disabled = input_order_disabled

        //console.log( "row_count: ", row_count);

        if(!row_count){
            let tblRow = tblBody_select.insertRow(-1);
            const inner_text = (tblName === "order" && mod_dict.customer_pk === 0) ? loc.All_orders : caption_none

            let td = tblRow.insertCell(-1);
            td.innerText = inner_text;

        } else if(row_count === 1){
            let tblRow = tblBody_select.rows[0]
            if(tblRow) {
// ---  highlight first row
                tblRow.classList.add(cls_selected)
                if(tblName === "order") {
                    selected_period.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                    MSE_MSO_MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow)
                }
            }
        } else {
// ---  add 'all' at the beginning of the list, only when multiple items found
            if (["MSE", "MSO"].includes(pgeName)) {
                // row 'AddAllToList' does not count in rowcount_customer / order
                MSE_MSO_MRE_MRO_AddAllToList(tblBody_select, pgeName, tblName);
            }
        }
    }  // MSE_MSO_MRE_MRO_FillSelectTable

//=========  MSE_MSO_MRE_MRO_FillSelectRow  ================ PR2020-08-18
    function MSE_MSO_MRE_MRO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, row_index, selected_pk, rosterdate) {
        //console.log( "===== MSE_MSO_MRE_MRO_FillSelectRow ========= ");
        //console.log( "pgeName: ", pgeName, "tblName: ", tblName);
        //console.log( "map_dict: ", map_dict);

//--- loop through data_map
        let ppk_int = null, code_value = null, add_to_list = false, is_selected_pk = false;
        const pk_int = map_dict.id;
        if(tblName === "customer") {
            ppk_int =  map_dict.comp_id;
            code_value = map_dict.code;
            // is_absence is already filtered in sql;
            add_to_list = (!map_dict.inactive);

        } else if(tblName === "order") {
            ppk_int =  map_dict.c_id;

            // remove tilde from code not necessary, is in sql PR2020-8-14
            // was: if(order_code) {order_code.replace(/~/g,"")};
            code_value = (pgeName === "MSO") ? map_dict.code : map_dict.c_o_code;
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
       //console.log( "code_value: ", code_value);
            const within_range = period_within_range_iso(map_dict.datefirst, map_dict.datelast, rosterdate, rosterdate)
       //console.log( "within_range: ", within_range);
            // don't add current employee in list when list is list of replacement employees
            const skip_selected_pk = (!mod_dict.is_add_employee && mod_dict.cur_employee_pk && pk_int === mod_dict.cur_employee_pk);
            // <PERMIT> 2020-11-07
            // map_dict.allowed is false when user has allowed_customers / allowed_orders and employee is not in shift of these orders
            let allowed_employee = false;
            if (pgeName === "MSE"){
                // only allowed employees are shown in sidebar select employee
                allowed_employee = (map_dict.allowed) ? map_dict.code : false;
            } else {
                // show all employees in ModRosterEmployee, ModRosterOrder
                allowed_employee = true;
            }
            add_to_list = (!map_dict.inactive && within_range && !skip_selected_pk && allowed_employee);
       }

       if (add_to_list){
            // selected_pk = 0 means: all customers / orders/ employees
            is_selected_pk = (selected_pk != null && pk_int === selected_pk)
// ---  insert tblRow  //index -1 results in that the new row will be inserted at the last position.
            let tblRow = tblBody_select.insertRow(row_index);
            tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-ppk", ppk_int);
            tblRow.setAttribute("data-value", code_value);
// ---  add EventListener to tblRow
            tblRow.addEventListener("click", function() {MSE_MSO_MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow)}, false )
// ---  add hover to tblRow
            //tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            //tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
            add_hover(tblRow);
// ---  highlight clicked row
            //if (is_selected_pk){ tblRow.classList.add(cls_selected)}
// ---  add first td to tblRow.
            let td = tblRow.insertCell(-1);
// --- add a element to td., necessary to get same structure as item_table, used for filtering
            let el = document.createElement("div");
                el.innerText = code_value;
                el.classList.add("mx-1", "tw_180")
            td.appendChild(el);
        };
        return add_to_list;
    }  // MSE_MSO_MRE_MRO_FillSelectRow

//=========  MSE_MSO_MRE_MRO_AddAllToList  ================ PR2020-08-24
    function MSE_MSO_MRE_MRO_AddAllToList(tblBody_select, pgeName, tblName){
        //console.log( "===== MSE_MSO_MRE_MRO_AddAllToList ========= ");
        //console.log( "pgeName", pgeName);
        let map_dict = {};
        if (pgeName === "MSE") {
            const ppk_int = get_dict_value(company_dict, ["id", "pk"]);
            map_dict = {id: 0, comp_id: ppk_int, allowed: true, code: "<" + loc.All_employees + ">"};
        } else if (pgeName === "MSO") {
            if (tblName === "customer") {
                const ppk_int = get_dict_value(company_dict, ["id", "pk"]);
                map_dict = {id: 0, comp_id: ppk_int, code: "<" + loc.All_customers + ">"};
            } else {
                const ppk_int =  mod_dict.customer_pk;
                map_dict = {id: 0, c_id: ppk_int, code: "<" + loc.All_orders + ">"};
            }
        }
        //console.log( "map_dict: ", map_dict);
        MSE_MSO_MRE_MRO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, 0, 0)
    }  // MSE_MSO_MRE_MRO_AddAllToList

//=========  MSE_MSO_MRE_MRO_SelecttableClicked  ================ PR2020-08-19
    function MSE_MSO_MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow) {
        //console.log( "===== MSE_MSO_MRE_MRO_SelecttableClicked ========= ");
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            // when clicked on shift table, pk = shift_code, therefore dont use get_attr_from_el_int
            // NOT RIGHT???  PR2020-10-02: NOT RIGHT!!!  "data-pk in select shift contains pk of shifts
            let pk_int = get_attr_from_el_int(tblRow, "data-pk");
            MSE_MSO_MRE_MRO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int)
// ---  set header and enable btn save

            MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave(pgeName);
        }
    }  // MSE_MSO_MRE_MRO_SelecttableClicked

//=========  MSE_MSO_MRE_MRO_SelecttableUpdateAfterSelect  ================ P2020-08-20
    function MSE_MSO_MRE_MRO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int) {
        //console.log( "===== MSE_MSO_MRE_MRO_SelecttableUpdateAfterSelect ========= ");
        //console.log( "pgeName:", pgeName, "tblName:", tblName);
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

        let el_focus = null;

        if (tblName === "customer") {
            mod_dict.customer_pk = (!isEmpty(map_dict)) ? map_dict.id : 0;
            mod_dict.customer_code = (mod_dict.customer_pk) ? map_dict.code : loc.All_customers;
            mod_dict.order_pk = 0;
            mod_dict.order_code = loc.All_orders;
            mod_dict.cust_order_code = mod_dict.customer_code;
            el_MSO_input_customer.value = mod_dict.customer_code;
            el_MSO_input_order.value = (mod_dict.customer_pk) ? null : loc.All_orders;
            el_focus = (mod_dict.customer_pk) ? el_MSO_input_order : el_MSO_btn_save;

        } else if (tblName === "order") {
            mod_dict.order_pk = (!isEmpty(map_dict)) ? map_dict.id : 0;
            mod_dict.cust_order_code = (mod_dict.order_pk) ? map_dict.c_o_code : loc.All_orders;
            mod_dict.order_code = (mod_dict.order_pk) ? map_dict.code : loc.All_orders;
            mod_dict.customer_code = (mod_dict.customer_pk) ? map_dict.c_code : loc.All_customers;

            const el_input = (pgeName === "MSO") ? el_MSO_input_order :
                             (pgeName === "MRE") ? el_MRE_input_order :
                             (pgeName === "MRO") ? el_MRO_input_order : null;
            if(el_input) {
                el_input.value = (pgeName === "MSO") ? mod_dict.order_code : mod_dict.cust_order_code
            };
            el_focus =  (pgeName === "MSO") ? el_MSO_btn_save :
                        //(pgeName === "MRE") ? el_MRE_input_shift :
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
                //el_MRE_input_shift.value = mod_dict.shift_code
                //setTimeout(function (){el_MRE_input_replacement.focus()}, 50);
            } else  if (pgeName === "MRO"){
                el_MRO_input_shift.value = mod_dict.shift_code
                el_MRO_offsetstart.innerText = display_offset_time (loc, mod_dict.offsetstart, false, false);
                el_MRO_offsetend.innerText = display_offset_time (loc, mod_dict.offsetend, false, false);
                el_MRO_breakduration.innerText = display_duration (mod_dict.breakduration, loc.user_lang);
                el_MRO_timeduration.innerText = display_duration (mod_dict.timeduration, loc.user_lang);
            }

            el_focus = (pgeName === "MRE") ? el_MRE_input_replacement : el_MRO_input_employee;

        } else if (tblName === "abscat") {
            mod_dict.abscat_pk = map_dict.id;
            mod_dict.abscat_ppk = map_dict.c_id;
            mod_dict.abscat_code = map_dict.o_code;
            mod_dict.abscat_cust_code = map_dict.c_code;

            el_MRE_input_abscat.value = mod_dict.abscat_code;

            el_focus = el_MRE_input_replacement;

            MRE_btn_SelectAndDisable(null, true)

        } else if (tblName === "employee") {
            mod_dict.selected_employee_pk = (map_dict.id) ? map_dict.id : 0;
            mod_dict.selected_employee_ppk = (map_dict.comp_id) ? map_dict.comp_id : 0;
            mod_dict.selected_employee_code = (mod_dict.selected_employee_pk) ? map_dict.code : loc.All_employees;

            const el_input = (pgeName === "MRO") ? el_MRO_input_employee :
                             (pgeName === "MRE") ? el_MRE_input_replacement :
                             (pgeName === "MSE") ? el_MSE_input_employee : null;
            el_input.value = mod_dict.selected_employee_code;

            el_focus = (pgeName === "MRE") ? el_MRE_btn_save :
                       (pgeName === "MRO") ? el_MRO_btn_save :
                       (pgeName === "MSE") ? el_MSE_btn_save : null;
            if (pgeName === "MSE"){
                MSE_Save();
            } else if (pgeName === "MRE"){
                MRE_btn_SelectAndDisable()
            }

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

    }  // MSE_MSO_MRE_MRO_SelecttableUpdateAfterSelect

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

        MSE_MSO_MRE_MRO_FillSelectTable("MRO", "order", null);

        MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave("MRO");

        setTimeout(function (){el_MRO_input_order.focus()}, 50);

    }  // MRO_InputDateChanged

//=========  MRE_MRO_TimepickerOpen  ================ PR2019-10-12 PR2020-08-13
    function MRE_MRO_TimepickerOpen(el_input, pgeName, calledby) {
        //console.log("=== MRE_MRO_TimepickerOpen ===");
        //console.log("calledby", calledby);
       // called by 'tblRow', MRE (splittime), MRO (offsetstart, offsetend, breakduration, timeduration)
// ---  create tp_dict
        // minoffset = offsetstart + breakduration
        let rosterdate = null, offset = null;
        let fldName = null;
        let offset_value = null, offset_start = null, offset_end = null, break_duration = 0, time_duration = 0, no_hours = false;
        let show_btn_delete = true;  // offsetsplit is required
        let map_id = null, pk_int = null, ppk_int = null, tblName = "emplhour";
        let is_not_locked = false, is_not_start_conf = false, is_not_end_conf = false, is_not_restshift = false;
        if (calledby === "mod_status") {
            //console.log("mod_status_dict", mod_status_dict);
            fldName = (mod_status_dict.is_field_start_conf) ? "offsetstart" : (mod_status_dict.is_field_end_conf) ? "offsetend" : null;

            rosterdate = mod_status_dict.rosterdate;
            // offset can have null value, 0 = midnight

            offset_start = mod_status_dict.offsetstart;
            offset_end = mod_status_dict.offsetend;
            break_duration = mod_status_dict.breakduration;
            time_duration = mod_status_dict.timeduration;
            offset_value = (mod_status_dict.is_field_start_conf) ? offset_start : (mod_status_dict.is_field_end_conf) ? offset_end : null;

            fldName = mod_status_dict
        } else if (calledby === "tblRow") {
            let tblRow = get_tablerow_selected(el_input)
            map_id = tblRow.id;

            HandleTblRowClicked(tblRow);

            fldName = get_attr_from_el(el_input, "data-field")
            const map_dict = get_mapdict_from_datamap_by_id(emplhour_map, map_id);
            //console.log("map_dict", map_dict);

            pk_int = map_dict.id;
            ppk_int = map_dict.oh_id;
            rosterdate = map_dict.rosterdate;
            is_not_restshift = (!map_dict.oh_isrestshift);
            is_not_locked = (!map_dict.stat_locked && !map_dict.stat_pay_locked && !map_dict.stat_inv_locked)
            is_not_start_conf = (!map_dict.stat_start_conf)
            is_not_end_conf = (!map_dict.stat_end_conf)

            // offset can have null value, 0 = midnight
            offset_value = map_dict[fldName];

            offset_start = map_dict.offsetstart;
            offset_end = map_dict.offsetend;
            break_duration = map_dict.breakduration;
            time_duration = map_dict.timeduration;
            no_hours = map_dict.nohours;
        } else {
            rosterdate = mod_dict.rosterdate;
            offset_start = mod_dict.offsetstart;
            offset_end = mod_dict.offsetend;
            break_duration = mod_dict.breakduration;
            time_duration = mod_dict.timeduration;
            if (calledby === "MRE_splittime") {
                fldName = (el_MRE_split_before.checked) ? "offset_split_before" : "offset_split_after";
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

        // When split absence the break_duration is deducted from offsetend when firstpart is absence,
        //   from  offsetstart when lastpart is absence PR2020-10-03

        let minoffset = null, maxoffset = null;
        if (mod_dict.btn_select === "tab_abs_split"){
            // breeakduration is counted in origninal shift, not the split shift
            if (mod_dict.split === "split_before") {
                minoffset = offset_start;
                maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)
                if(offset_value > maxoffset) {offset_value = maxoffset};
            } else {
                minoffset = get_minoffset(fldName, offset_start, break_duration)
                maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)
                if(offset_value < minoffset) {offset_value = minoffset};
            }
        } else {
            minoffset = get_minoffset(fldName, offset_start, break_duration)
            maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)
        }

        let tp_dict = {table: tblName,  // used in TimepickerResponse
                       field: fldName,  // used in TimepickerResponse
                       page: pgeName,  // used in TimepickerResponse
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
                               (fldName === "timeduration") ? loc.Working_hours : null;
                               //(["offset_split_before", "offset_split_after"].includes(fldName)) ? loc.Split_time : "";
        let st_dict = { url_settings_upload: url_settings_upload,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete};

        //console.log("no_hours", no_hours)
        //console.log("fldName", fldName)
        //console.log("txt_dateheader", txt_dateheader)
        //console.log("st_dict", st_dict)

        //console.log("mod_dict", deepcopy_dict(mod_dict));
        //console.log("tp_dict", deepcopy_dict(tp_dict));

// ---  open ModTimepicker
        if (calledby === "tblRow") {
            let may_open_timepicker = false;
            const msg_list = [];
            if (is_not_locked){
                if (fldName === "offsetstart") {
                    if (!is_not_start_conf){
                        msg_list.push(loc.err_msg_starttime_is_confirmed);
                        msg_list.push(loc.err_msg_cannot_change_starttime);
                    } else {
                        may_open_timepicker = is_not_start_conf;
                    }
                } else  if (fldName === "offsetend") {
                    if (!is_not_end_conf){
                        msg_list.push(loc.err_msg_starttime_is_confirmed);
                        msg_list.push(loc.err_msg_cannot_change_starttime);
                    } else {
                        may_open_timepicker = is_not_end_conf;
                    }
                } else  if (fldName === "breakduration") {
                    if (no_hours){
                        msg_list.push(loc.err_msg_cannot_set_break);
                        msg_list.push(loc.err_msg_because_option_nohours);
                    } else if (!is_not_restshift){
                        msg_list.push(loc.err_msg_cannot_set_break_of_restshift);
                    } else {
                        may_open_timepicker = (is_not_restshift);
                    }
                } else  if (fldName === "timeduration") {
                    if (no_hours){
                        msg_list.push(loc.err_msg_cannot_set_time);
                        msg_list.push(loc.err_msg_because_option_nohours);
                    } else if (!is_not_restshift){
                        msg_list.push(loc.err_msg_cannot_set_hours_of_restshift);
                    } else {
                        may_open_timepicker = (is_not_end_conf && is_not_end_conf);
                    }
                }
            };
            if (may_open_timepicker) {
                mtp_TimepickerOpen(loc, el_input, UploadTblrowTimepickerResponse, tp_dict, st_dict);
            } else if (msg_list && msg_list.length) {
                let html_text = "";
                for (let i = 0, msg_text; msg_text = msg_list[i]; i++) {
                    html_text += "<div>" + msg_text + "</div>"
                }
                document.getElementById("id_mod_message_container").innerHTML = html_text
                $("#id_mod_message").modal({backdrop: true});
            };
        } else {
        //console.log("pgeName", pgeName)
            mtp_TimepickerOpen(loc, el_input, MRE_MRO_TimepickerResponse, tp_dict, st_dict)
        }
    };  // MRE_MRO_TimepickerOpen

//========= MRE_MRO_TimepickerResponse  ============= PR2019-10-12
    function MRE_MRO_TimepickerResponse(tp_dict) {
        //console.log(" === MRE_MRO_TimepickerResponse ===" );
        //console.log("tp_dict", tp_dict);
        //console.log("mod_dict", deepcopy_dict(mod_dict));

        // new value of quicksave is uploaded to server in ModTimepicker
        if("quicksave" in tp_dict) {is_quicksave = tp_dict.quicksave};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = tp_dict.field;

// ---  get new value from tp_dict
            let new_offset = get_dict_value(tp_dict, ["offset"])

// ---  put new_offset in mod_status_dict when called by page "mod_status"
            const called_by_page = tp_dict.page;
        //console.log("called_by_page", called_by_page);
            if(called_by_page === "mod_status"){
                mod_status_dict.new_offset = new_offset;
        //console.log("mod_status_dict.new_offset", mod_status_dict.new_offset);
                el_mod_status_time.innerText = display_offset_time (loc, new_offset, false, false);
            } else {

// ---  calculate timeduration and min max
                const shift_dict = mtp_calc_timeduration_minmax(loc, fldName, new_offset,
                                                mod_dict.shift_code,
                                                mod_dict.offsetstart,
                                                mod_dict.offsetend,
                                                mod_dict.breakduration,
                                                mod_dict.timeduration)

    // ---  put new value in variable
                if (["offset_split_before", "offset_split_after"].includes(fldName)) {
                    mod_dict.offsetsplit = new_offset;
                    const display_offset = display_offset_time (loc, new_offset, false, false);
                    el_MRE_split_time.innerText = display_offset;    // set focus to save button
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
                MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave (tp_dict.page)

    // set focus to btn save in modal MRE
                if(tp_dict.page === "MRE"){ el_MRE_btn_save.focus() }

            //console.log("end mod_dict", deepcopy_dict(mod_dict));
            }  //   if(called_by_page === "mod_status"){
        }  // if("save_changes" in tp_dict) {
     }  //MRE_MRO_TimepickerResponse

//=========  MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave  ================ PR2020-04-12 PR2020-08-18
    function MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave (pgeName) {
        //console.log(" -----  MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave   ----", pgeName)

        let header_text = null;
    // ---  create header text
        if(pgeName === "MRE") {
        // ---  give modconfirm message when restshift  -  skip MRE form, rest shift cannot open this form
            //happens in  MRE_open
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
        if(pgeName === "MSO") {
            // when 'all customers' is selected, save btn must be enabled. PR2020-09-26 debug. Mail from Guido
//--- enable save btn in MSO when:
            //  - 'All customers' is selected (customer_pk = 0)
            //  - customer is selected and 'All orders' is selected ( customer_pk > 0 and order_pk = 0 and order_count = undefined or 0)
            //  - customer is selected and order is selected ( customer_pk > 0 and order_pk > 0 and no_orders = false)
            const btn_save_enabled = (!mod_dict.customer_pk) || (mod_dict.order_count);
            el_MSO_btn_save.disabled = !btn_save_enabled;
            if (btn_save_enabled ) { el_MSO_btn_save.focus()};

//--- disable el_MSO_input_order in MSO when:
            //  - 'All customers' is selected (customer_pk = 0)
            //  -  when there is 0 or 1 order. This is set in  MSE_MSO_MRE_MRO_FillSelectTable
            if (!mod_dict.customer_pk) {el_MSO_input_order.disabled = true}

         } else if(pgeName === "MRE") {
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
    }  // MSE_MSO_MRE_MRO_SetHeaderAndEnableBtnSave

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
            const el_MSS_loader = document.getElementById("id_MSS_loader");
            el_MSS_loader.classList.add(cls_visible_hide);

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

        if (["MRO", "MSS"].includes(pgeName)){
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
        console.log(" =========  MRE_Open  ==========")

// reset mod_dict
        mod_dict = {};

// ---  skip when no tblRow or no emplh_dict
        // MRE_Open is only called by CreateTblRow - there should always be a tblRow and map_dict
        const tblRow = get_tablerow_selected(el_input);
        const map_dict = get_mapdict_from_datamap_by_id(emplhour_map, tblRow.id);
        const fldName = get_attr_from_el(el_input, "data-field")
        let row_is_locked = false;
        mod_dict = {};
        if(!isEmpty(map_dict)){
            row_is_locked = (map_dict.stat_pay_locked || map_dict.stat_inv_locked);
            if(!row_is_locked){
                // check if row status is 'locked'
                const status_array = b_get_status_array(map_dict.status)
                row_is_locked = (!!status_array[5]); // STATUS_05_LOCKED = 32
            }

            //console.log("map_dict", map_dict)
            mod_dict = {rosterdate: map_dict.rosterdate,
                        mapid: map_dict.mapid,
                        isabsence: map_dict.c_isabsence,
                        isrestshift: map_dict.oh_isrestshift,
                        emplhour_pk: map_dict.id,
                        emplhour_ppk: map_dict.oh_id,
                        order_pk: map_dict.o_id,
                        order_code: map_dict.ordercode,
// ---  get cur_employee from map_dict
                        cur_employee_pk: map_dict.employee_id,
                        cur_employee_ppk: map_dict.comp_id,
                        cur_employee_code: map_dict.employeecode,
// ---  get shift info from map_dict
                        offsetstart: map_dict.offsetstart,
                        offsetend: map_dict.offsetend,
                        breakduration: map_dict.breakduration,
                        offsetsplit: map_dict.offsetend // default value of offsetsplit is offsetend
                      };
        }

// ---  set dont_show_modal:
        let dont_show_modal = false;
        if (row_is_locked){
            dont_show_modal = true;
        } else if (mod_dict.isrestshift){
            dont_show_modal = true;
        } else if (mod_dict.isabsence){
            dont_show_modal = (fldName === "employeecode" || !mod_dict.cur_employee_pk)
        } else if (!mod_dict.isabsence){
            dont_show_modal = ( fldName === "c_o_code");
        }
        if(!dont_show_modal){

// ---  get btn_select and 'is_add_employee'
            // when emplhour has no employee:
            //  -  btn_select is 'add_employee' (ther is no btn 'add_employee', it is only used for tab_show)
            //  -  also when emplhour is absence without employee: to be able to delete absence emplhour without employee
            // when emplhour has employee:
            //  -   default btn_select is 'tab_absence'
            // PR2020-10-02 added: "tab_absence_split" to show checkboxes and split time when absence_split
            mod_dict.is_add_employee = (!mod_dict.cur_employee_pk && !mod_dict.isabsence);
            mod_dict.btn_select = (mod_dict.is_add_employee) ? "add_employee" : "tab_absence";

// ---  set header text
            let header_text = null;
            if(mod_dict.isabsence){
                header_text = loc.Absence + " " + loc.of + " " + mod_dict.cur_employee_code;
            } else {
                header_text = (mod_dict.cur_employee_pk) ? mod_dict.cur_employee_code : loc.Select_employee + ":";
            }
            document.getElementById("id_MRE_header").innerText = header_text

// ---  reset values of input elemnet employee /replacement
            el_MRE_input_replacement.value = null;
// ---  in abscat: set value of input_abscat
            el_MRE_input_abscat.value = (mod_dict.isabsence && mod_dict.order_code) ? mod_dict.order_code: null;

            document.getElementById("id_MRE_switch_date").innerText = null;
            document.getElementById("id_MRE_select_shift").innerText = null;

            const display_offset = display_offset_time (loc, mod_dict.offsetsplit, false, false);
            el_MRE_split_time.innerText = display_offset;

// ---  select table abscat when there is a current employee
            MSE_MSO_MRE_MRO_FillSelectTable("MRE", "abscat", mod_dict.cur_employee_pk);

// ---  set button when opening form: absence when cur_employee found, add_employee when no cur_employee
            MRE_btn_SelectAndDisable(mod_dict.btn_select)

// ---  if 'add_employee': hide select_btns, Set focus to el_mod_employee_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            if (mod_dict.is_add_employee){
                setTimeout(function (){el_MRE_input_replacement.focus()}, 50);
            } else if (["tab_absence", "tab_abs_split"].includes(mod_dict.btn_select)){
                setTimeout(function (){ el_MRE_input_abscat.focus()}, 50);
            }

    // ---  show modal
            $("#id_modroster_employee").modal({backdrop: true});

        //console.log("MRE_Open mod_dict", deepcopy_dict(mod_dict));
        }  // if(!dont_show_modal)
    };  // MRE_Open

//=========  MRE_Save  ================ PR2019-06-23 PR2020-08-22
    function MRE_Save(crud_mode) {
        console.log("===  MRE_Save ========= crud_mode: ", crud_mode);
        console.log("mod_dict", deepcopy_dict(mod_dict));
        // crud_mode = 'delete' when clicked on MRE delete btn. Deletes absence emplhour or removes employee from emplhour
        // crud_mode = 'save' otherwise
        // selected_btn are: tab_absence, tab_move, tab_split, tab_switch --- or values: tab_abs_split, add_employee
        // tab_show without btn: "add_employee", "tab_abs_split"
        // absence:
        // - mod_dict.isabsence = true when current record is absence record
        // - btn_select = "tab_absence" when current record is absence or will be made absent

        const is_absence_emplhour = mod_dict.isabsence;

        let tr_changed = document.getElementById(mod_dict.mapid);

// ---  create shift_option, used in EmplhourUploadView
        let shift_option = "none";
        if (!mod_dict.cur_employee_pk) {
           // when emplhour has no employee: selected employee will be added to emplhour in 'update_emplhour'
           shift_option = "enter_employee";
        } else if (is_absence_emplhour){
            shift_option = "change_absence"
        } else if (mod_dict.btn_select === "tab_absence" && crud_mode !== "delete" ){
                // shift_option = "make_absent" if emplhour has employee AND not is_absence_emplhour
                // AND btn_select = 'tab_absence' or 'tab_abs_split' AND not clicked on btn 'Delete employee'
            shift_option = "make_absent";

        } else if (mod_dict.btn_select === "tab_abs_split" && crud_mode !== "delete" ){
                // shift_option = "make_absent" if emplhour has employee AND not is_absence_emplhour
                // AND btn_select = 'tab_absence' or 'tab_abs_split' AND not clicked on btn 'Delete employee'
            shift_option = "make_absent_and_split";
        } else if (mod_dict.btn_select === "tab_split"){
            shift_option = "split_shift";
        } else if (mod_dict.btn_select === "tab_switch"){
            shift_option = "switch_shift";
        }
        console.log("shift_option", shift_option);

// ---  create id_dict of current emplhour record
        let upload_dict = { id: {pk: mod_dict.emplhour_pk,
                                ppk: mod_dict.emplhour_ppk,
                                table: "emplhour",
                                isabsence: is_absence_emplhour,
                                shiftoption: shift_option},
                                // period_datefirst / period_datelast are used in check_overlap
                            period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast
                           }

        if (crud_mode === "delete"){
            if (!is_absence_emplhour){
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
            // when make_absent or split_shift: selected_employee is replacement employee
            if(["enter_employee", "make_absent", "make_absent_and_split", "split_shift"].includes(shift_option)) {
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
            }

// ---  put new selected_employee_code in tblRow,
            // - only when  selected_employee_pk has value
            // - not when split_shift or switch_shift (in that case selected_employee is added in new row)
            if(["enter_employee", "make_absent"].includes(shift_option)){
                if(mod_dict.selected_employee_pk){
                    MRE_set_fieldvalue_in_tblrow(tr_changed, "employeecode", mod_dict.selected_employee_code)
                }
            }

// ---  create abscat_dict
            // PR2021-01-09 debug: mail Romy: puts default abscat when spli, forgot to add ""make_absent_and_split",
            // was: if(["make_absent", "change_absence"].indexOf(shift_option) > -1){
            if(["make_absent", "change_absence", "make_absent_and_split"].includes(shift_option)){
                // when abcat has no pk, the default abscat will be saved. abscat_dict = {} gives error.
                upload_dict.abscat = { pk: mod_dict.abscat_pk,
                                        ppk: mod_dict.abscat_ppk,
                                        code: mod_dict.abscat_code,
                                        table: "order",
                                        isabsence: true,
                                        update: true}
            }

// ---  set offset split
            if ( ["tab_abs_split", "tab_split"].includes(mod_dict.btn_select)){
                if(mod_dict.offsetsplit != null){  // offsetsplit = 0 is midnight
                    if(el_MRE_split_before.checked){
                        upload_dict.split = "split_before";
                        upload_dict.offsetstart = {value: mod_dict.offsetsplit, update: true}
                    } else {
                        upload_dict.split = "split_after";
                        upload_dict.offsetend = {value: mod_dict.offsetsplit, update: true}
                    }
                }
            }
        }

        console.log("url_emplhour_upload", url_emplhour_upload);
        console.log("upload_dict", upload_dict);
        UploadChanges(upload_dict, url_emplhour_upload);

        $('#id_modroster_employee').modal('hide');

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
                // put mod_dict.offsetsplit as timeend in upload_dict when split_after, in offsetstart when split_before
                // timeend is used to change the end time of the current shift in 'update_emplhour'
                // it will update timeend in current emplhour. Format: 'timeend': {'value': -560, 'update': True}}
                // and will be the timestart of the new  emplhour
                // not necessary:  upload_dict.rosterdate, it is retrieved from saved emplhour
                // not necessary:  upload_dict.splitoffsetstart when split_after, it is retrieved from saved emplhour

            // when shift_option = "switch_shift":
                // emplhour keeps employee. Seletec employee is put in new emplhour record
                // upload_dict.switchemployee: get current employee from emplhour at server

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

    }  // MRE_Save

//========= MRE_set_fieldvalue_in_tblrow  ============= PR2020-04-13 PR2020-08-30
    function MRE_set_fieldvalue_in_tblrow(tblRow, fldName, new_value) {
        //console.log( "=== MRE_set_fieldvalue_in_tblrow === ");
        if(tblRow){
            for (let i = 1, td, col_field; td = tblRow.cells[i]; i++) {
                col_field =  field_settings.field_names[i]
                if (fldName === field_settings.field_names[i]){
                    if(td.children[0]){
                        td.children[0].innerText = new_value;
                        break;
        }}}};
    }

//========= MRE_btn_SelectAndDisable  ============= PR2020-02-20 PR2020-10-09
    function MRE_btn_SelectAndDisable(new_selected_btn, skip_when_split_checked) {

        //console.log( "=== MRE_btn_SelectAndDisable === ");
        //console.log( "new_selected_btn ", new_selected_btn);
        // called by open_modal,  btn_clicked, row_selected,  checkbox_changed

        if(new_selected_btn === "tab_move" ) {
            $('#id_modroster_employee').modal('hide');
            MSS_Open ();

        } else {
            // selected_btn are: tab_absence, tab_move, tab_split, tab_switch --- or values: tab_abs_split, add_employee
            // selected_btn has only value when clicked on btn or on mod_open
            if(new_selected_btn) {
                mod_dict.btn_select = new_selected_btn
// ---  reset checkboxes part_absent
                if(!skip_when_split_checked){
                    el_MRE_part_absent.checked = false;
                    el_MRE_split_before.checked = false;
                    el_MRE_split_after.checked = true;
                }
            }
if(!skip_when_split_checked){
    // ---  highlight selected button,
            // (absence shift and restshift can't open this modal form) disable on isabsence not necessary, let it stay
            let btn_container = document.getElementById("id_MRE_btn_container");
            // tab_abs_split is not a btn, replace by tab_absence
            const sel_btn = (mod_dict.btn_select === "tab_abs_split") ? "tab_absence" : mod_dict.btn_select
            highlight_BtnSelect(btn_container, sel_btn, mod_dict.isabsence);

    // hide select buttons when is_absence or when is_add_employee  (absence shift can't open this form, let it stay )
            const hide_btns = (mod_dict.isabsence || mod_dict.is_add_employee)
            show_hide_element(btn_container, !hide_btns)

    // set text of delete button 'Delete employee', if absence: Delete absence  (absence shift can't open this form, let it stay )
            el_MRE_btn_delete.innerText = (mod_dict.isabsence) ? loc.Delete_absence : loc.Remove_employee;

    // ---  hide 'replacement employee' and 'input employee' only when shift is 'isabsence' (restshift can't open this modal form)
            //  (absence shift can't open this form, but let it stay )
            show_hide_element_by_id("id_MRE_div_input_replacement", !mod_dict.isabsence);
}
    // ---  show only the elements that are used in this mod_dict.btn_select
        //console.log( "............mod_dict.btn_select", mod_dict.btn_select);
            show_hide_selected_elements_byClass("tab_show", mod_dict.btn_select)

// ---  hide checkboxes split_before / split_after when no replacement employee
            // show checkboxes is done above in show_hide_selected_elements_byClass
            //const el_MRE_part_absent_container = document.getElementById("id_MRE_part_absent_container")
            //if (!mod_dict.selected_employee_pk) { el_MRE_part_absent_container.classList.add(cls_hide) }

            switch (mod_dict.btn_select) {
            case "add_employee":
                el_MRE_label_employee.innerText = loc.Select_employee + ":"
                break;
            case "tab_absence":
                el_MRE_label_employee.innerText = loc.Replacement_employee + ":"
                // reset firstpart_checked
                el_MRE_split_before.checked = false;
                el_MRE_input_abscat.focus()
                break;
            case "tab_abs_split":
                el_MRE_label_employee.innerText = loc.Replacement_employee + ":"
                el_MRE_label_split_time.innerText = ( (el_MRE_split_before.checked) ? loc.Absent_till : loc.Absent_from ) + ":";
                break;
            case "tab_switch":
                el_MRE_label_employee.innerText = loc.Employee_tobe_switched_with + ":"
                el_MRE_input_replacement.focus()
                break;
            case "tab_split":
                el_MRE_label_employee.innerText =  loc.Replacement_employee + ":"
                el_MRE_label_split_time.innerText = loc.Split_time + ":"
                el_MRE_input_replacement.focus()
            }
            const is_disabled = (["tab_absence", "tab_abs_split"].includes(mod_dict.btn_select)) && (!mod_dict.abscat_pk)
            el_MRE_btn_save.disabled = is_disabled;
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
                        show_row = (row_value.toLowerCase().includes(filter_mod_employee))
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

        // TODO get shifts if mode = switch  // "data-action" is not in use any more
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

//=========  MRE_CheckboxChanged  ================ PR2020-10-02
    function MRE_CheckboxChanged(el_input) {
        //console.log( "===== MRE_CheckboxChanged  ========= ");
        //console.log("mod_dict.btn_select", mod_dict.btn_select);
        // mod_dict.btn_select: tab_absence, tab_move, tab_split, tab_switch --- or values: tab_abs_split, add_employee

        if(el_input){
            const data_field = get_attr_from_el(el_input, "data-field");
            const is_checked = el_input.checked

            if(data_field === "part_absent"){
                mod_dict.split = (is_checked) ? "split_after" : "split_none";
                // toggle tab_absence - tab_abs_split
                const new_btn_select = (is_checked) ? "tab_abs_split" : "tab_absence";
                MRE_btn_SelectAndDisable(new_btn_select, true); // true = skip_when_split_checked

            } else if(data_field === "split_before"){
                mod_dict.split = (is_checked) ? "split_before" : "split_after";
                // set other checkbox
                el_MRE_split_after.checked = !is_checked
                // default value of offsetsplit when split_before is offsetstart
                mod_dict.offsetsplit = mod_dict.offsetstart;

                const display_offset = display_offset_time (loc, mod_dict.offsetsplit, false, false);
                el_MRE_split_time.innerText = display_offset;

            } else if(data_field === "split_after"){
                mod_dict.split = (is_checked) ? "split_after" : "split_before";
                // set other checkbox
                el_MRE_split_before.checked = !is_checked
                // default value of offsetsplit when split_after is offsetstart
                mod_dict.offsetsplit = mod_dict.offsetend;

                const display_offset = display_offset_time (loc, mod_dict.offsetsplit, false, false);
                el_MRE_split_time.innerText = display_offset;

            }
            el_MRE_label_split_time.innerText =  (mod_dict.btn_select === "tab_split") ? loc.Split_time + ":" :
                                                 ( (el_MRE_split_before.checked) ? loc.Absent_till : loc.Absent_from ) + ":";

        }
    }  // MRE_CheckboxChanged

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
                    //} else if ([5, 6].includes(j)){
                    //    ws[cell_index]["z"] = "dd mmm yyyy hh:mm"
                    } else if ([7, 8].includes(j)){
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