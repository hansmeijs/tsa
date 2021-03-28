// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";


        // <PERMIT> PR2020-11-10
        // - supervisor, planner and hr_man have access to page 'employees' (is set in html)
        // - supervisor, planner and hr_man can add / edit / delete absence
        // - only hr_man can add / edit / delete employees
        // - when has_allowed_customers and / or has_allowed_orders:
        //    - show only employees of these customers / orders, in tables, planning and mod absence

        let has_perm_add_edit_delete_employees = false;
        let has_perm_add_edit_delete_absence = false;
        let allowed_customers = [];  // list of allowed customers of request_user PR2020-11-03
        let allowed_orders = [];  // list of allowed orders of request_user PR2020-11-03
        let has_allowed_customers = false;
        let has_allowed_orders = false;

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";

        const cls_visible_hide = "visibility_hide";
        const cls_visible_show = "visibility_show";

        const cls_bc_transparent = "tsa_bc_transparent";
        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_bc_yellow_light = "tsa_bc_yellow_light";
        const cls_bc_yellow = "tsa_bc_yellow";

        const cls_selected = "tsa_tr_selected";
        const cls_btn_selected = "tsa_btn_selected";
        const cls_error = "tsa_tr_error";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
        const url_employee_upload = get_attr_from_el(el_data, "data-employee_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive_grey = get_attr_from_el(el_data, "data-imgsrc_inactive_grey");
        const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_billable_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_billable_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")

// ---  id of selected employee
        const id_sel_prefix = "sel_"

// ---  id of selected employee / functioncode // used in SBR select employee / function. Only one of them can have value
        let mod_MSEF_dict = {};   // - used in SBR select employee / function, contains id of selected employee / functioncode. Only one of them can have value

        let selected = {teammember_pk: null,
                        employee_pk: null,
                        employee_code: null};

        let selected_btn = "";

        let selected_planning_period = {};
        let selected_calendar_period = {};

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

        let employee_planning_customer_dictlist = {}
        let employee_planning_order_dictlist = {}
        let employee_planning_selected_customer = null;  // null = all, -1 = no employee
        let employee_planning_selected_order = null;  // null = all, -1 = no employee
        let employee_planning_selected_employee_pk = null;
        let employee_planning_selected_employee_code = "";

        let is_quicksave = false

        let company_dict = {};
        let employee_map = new Map();
        let absence_map = new Map();

        let customer_map = new Map();
        let order_map = new Map();
        let abscat_map = new Map();
        let functioncode_map = new Map();
        let paydatecode_map = new Map();
        let wagecode_map = new Map();

        let scheme_map = new Map();
        let shift_map = new Map();
        let team_map = new Map();
        let teammember_map = new Map();
        let schemeitem_map = new Map();

        let calendar_map = new Map();
        let planning_map = new Map();

//----------------------------------------
        let planning_short_list_sorted = []
        let is_planning_detail_mode = false;
        let is_planning_detail_mod_mode = false;
        let planning_header_row = [];
        let planning_total_row = [];

        let html_planning_agg_list = [];
        let html_planning_detail_list = [];
//----------------------------------------
// const for report
        let planning_display_duration_total = ""; // stores total hours, calculated when creating planning_map
        let label_list = [], pos_x_list = [], colhdr_list = [];

// locale_dict with translated text
        let loc = {};

        let mod_dict = {};
        let mod_MAB_dict = {};
        let mod_MFE_dict = {};
        //let spanned_columns = [];

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const field_settings = {
            employee: { //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateEmployeeTblHeader
                        field_caption: ["", "Employee", "ID_number_2lines",  "Payroll_code_2lines", "First_date_in_service", "Last_date_in_service", "Hours_per_week", "Hours_per_day", "Leavedays", ""],
                        field_names: ["", "code", "identifier", "payrollcode", "datefirst", "datelast", "workhoursperweek", "workminutesperday", "leavedays", "inactive"],
                        filter_tags: ["", "text", "text", "text", "text", "text", "amount", "amount", "amount", "inactive"],
                        field_width:  ["016","180", "120", "120","100", "100", "090","090", "090", "020"],
                        field_align: ["c","l", "l", "l","r", "r",  "r", "r", "r", "c"]},
            absence: { field_caption: ["", "Employee", "Absence_category", "First_date", "Last_date", "Start_time", "End_time", "Hours_per_day", "Replacement_employee", ""],
                        field_names: ["", "e_code", "o_code", "s_df", "s_dl", "sh_os_arr", "sh_oe_arr", "sh_td_arr", "rpl_code", "delete"],
                        filter_tags: ["", "text", "text", "text", "text", "text", "text", "text", "text", "text","duration"],
                        field_width:  ["016", "180", "180", "120", "120", "090", "090", "120", "120", "020"],
                        field_align: ["c", "l", "l", "r", "r", "r", "r", "r", "l","c"]},
            teammember: {field_caption: ["","Employee", "Order", "Scheme", "Team", "First_date", "Last_date", "Replacement_employee", ""],
                        field_names: ["","employee", "order", "scheme", "team", "datefirst", "datelast", "replacement", "delete"],
                        //field_tags: ["div","div", "div", "div", "div", "div","div", "div", "a"],
                        filter_tags: ["", "text", "text", "text", "text", "text", "text", "text", ""],
                        field_width: ["016","180", "220", "120", "120", "120", "120", "180", "020"],
                        field_align: ["c", "l", "l", "l", "l", "l", "l", "l", "l"]},
            //calendar: { tbl_col_count: 7}, don't use calendar in field_settings, gives error in CreateHeader
            planningXXX: { tbl_col_count: 7,
                        field_caption: ["Employee", "Customer", "Order", "Date", "Shift", "Start_Endtime", "Working_hours"],
                        field_names:  ["employee", "customer", "order", "rosterdate", "shift", "offsetstart", "timeduration"],
                        field_tags: ["input", "input", "input", "input", "input", "input", "input"],
                        field_width: ["150", "150", "150", "120", "120", "150", "090"],
                        field_align: ["l", "l", "l", "l", "l", "r", "r"]},
            payroll_agg: { tbl_col_count: 8,
                        field_caption: ["", "Employee", "Working_days", "Contract_hours", "Planned_hours", "Absence", "Difference", ""],
                        field_names: ["", "text", "amount", "duration", "duration", "duration", "duration", ""],
                        filter_tags: ["", "text", "amount", "duration", "duration", "duration", "duration", ""],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["016","180", "120", "120","120", "120", "120", "020"],
                        field_align: ["c", "l", "c", "r", "r", "r", "r", "c"]},
            payroll_detail: { tbl_col_count: 7,
                        field_caption: ["", "Date", "Order", "Shift", "Planned_hours", "Absence", ""],
                        field_names:  ["", "text", "text", "text", "duration", "duration",  ""],
                        filter_tags:  ["", "text", "text", "text", "duration", "duration",  ""],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["016", "090",  "180", "120", "120","120",  "020"],
                        field_align: ["c", "l", "l", "l", "r", "r", "c"]},
            }
        const mapped_absence_fields = {e_code: "employee", o_code: "abscat", s_df: "datefirst", s_dl: "datelast",
            sh_os_arr: "offsetstart" , sh_oe_arr: "offsetend", sh_bd_arr: "breakduration", sh_td_arr: "timeduration", rpl_code: "replacement"}

        const mapped_employee_fields = {functioncode: "fnc_id", wagecode: "wgc_id", paydatecode: "pdc_id"}

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");

        //let SBR_tblBody_select = document.getElementById("id_SBR_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === EVENT HANDLERS ===

// === reset filter when clicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });
// ---  SIDE BAR
// ---  side bar - select period
        let el_sbr_select_period = document.getElementById("id_SBR_select_period");
        el_sbr_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        add_hover(el_sbr_select_period);
// ---  side bar - select employee - function
        const el_SBR_select_employee_function = document.getElementById("id_SBR_select_employee");
            el_SBR_select_employee_function.addEventListener("click", function() {MSEF_Open()}, false );
            add_hover(el_SBR_select_employee_function);
// ---  side bar - select order
        const el_SBR_select_order = document.getElementById("id_SBR_select_order");
            el_SBR_select_order.addEventListener("click", function() {MSO_Open()}, false );
            add_hover(el_SBR_select_order);
// ---  side bar - showall
        let el_sidebar_select_showall = document.getElementById("id_SBR_select_showall");
            el_sidebar_select_showall.addEventListener("click", function() {ResetFilterRows()}, false );
            add_hover(el_sidebar_select_showall);
// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }

// +++++++++++++++++++ event handlers for MODAL +++++++++++++++++++++++++++
// ---  MOD FORM EMPLOYEE ------------------------------------
        const el_MFE_div_form_controls = document.getElementById("id_MFE_div_form_controls")
        let form_elements = el_MFE_div_form_controls.querySelectorAll(".form-control")
        for (let i = 0, el, len = form_elements.length; i < len; i++) {
            el = form_elements[i]
            if(el){el.addEventListener("change", function() {MFE_validate_and_disable(el)}, false)};
        }
        const el_MFE_btn_delete = document.getElementById("id_MFE_btn_delete")
            el_MFE_btn_delete.addEventListener("click", function() {ModConfirmOpen("delete")}, false );
        const el_MFE_btn_save = document.getElementById("id_MFE_btn_save")
            el_MFE_btn_save.addEventListener("click", function() {MFE_save("save")}, false );
// ---  create EventListener for buttons in calendar
        btns = document.getElementById("id_btns_calendar").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnCalendar(data_btn)}, false )
        }

// ---  MOD PERIOD ------------------------------------
        const el_mod_period_datefirst = document.getElementById("id_mod_period_datefirst");
            el_mod_period_datefirst.addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false );
        const el_mod_period_datelast = document.getElementById("id_mod_period_datelast");
            el_mod_period_datelast.addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false );
        const el_mod_period_oneday = document.getElementById("id_mod_period_oneday");
            el_mod_period_oneday.addEventListener("change", function() {ModPeriodDateChanged("oneday")}, false );
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false );

// ---  MOD SELECT EMPLOYEE / FUNCTIONOCDE ------------------------------
// ---  buttons in btn_container
        const MSEF_btns = document.getElementById("id_MSEF_btn_container").children;
        for (let i = 0, btn; btn = MSEF_btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {MSEF_BtnSelect(btn)}, false )
        }
        const el_MSEF_input = document.getElementById("id_MSEF_input")
            el_MSEF_input.addEventListener("keyup", function(event){
                setTimeout(function() {MSEF_InputKeyup()}, 50)});
        const el_MSEF_btn_save = document.getElementById("id_MSEF_btn_save")
            el_MSEF_btn_save.addEventListener("click", function() {MSEF_Save()}, false )

// ---  MOD SELECT ORDER ------------------------------
        const el_MSO_tblbody_select = document.getElementById("id_MSO_tblbody_select");
        const el_MSO_input_customer = document.getElementById("id_MSO_input_customer")
            el_MSO_input_customer.addEventListener("focus", function() {MSO_OnFocus("customer")}, false )
            el_MSO_input_customer.addEventListener("keyup", function(){
                setTimeout(function() {MSO_InputKeyup("customer", el_MSO_input_customer)}, 50)});
        const el_MSO_input_order = document.getElementById("id_MSO_input_order")
            el_MSO_input_order.addEventListener("focus", function() {MSO_OnFocus( "order")}, false )
            el_MSO_input_order.addEventListener("keyup", function(){
                setTimeout(function() {MSO_InputKeyup("order", el_MSO_input_order)}, 50)});
        const el_MSO_btn_save = document.getElementById("id_MSO_btn_save")
            el_MSO_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MODAL ABSENCE ------------------------------------
        const el_MAB_input_employee = document.getElementById("id_MAB_input_employee")
            el_MAB_input_employee.addEventListener("focus", function() {MAB_GotFocus("employee", el_MAB_input_employee)}, false )
            el_MAB_input_employee.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("employee", el_MAB_input_employee)}, 50)});
        const el_MAB_input_abscat = document.getElementById("id_MAB_input_abscat")
            el_MAB_input_abscat.addEventListener("focus", function() {MAB_GotFocus("abscat", el_MAB_input_abscat)}, false )
            el_MAB_input_abscat.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("abscat", el_MAB_input_abscat)}, 50)});
        const el_MAB_input_replacement = document.getElementById("id_MAB_input_replacement")
            el_MAB_input_replacement.addEventListener("focus", function() {MAB_GotFocus("replacement", el_MAB_input_replacement)}, false )
            el_MAB_input_replacement.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("replacement", el_MAB_input_replacement)}, 50)});

        const el_MAB_datefirst = document.getElementById("id_MAB_input_datefirst")
            el_MAB_datefirst.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_datefirst)}, false );
        const el_MAB_datelast = document.getElementById("id_MAB_input_datelast")
            el_MAB_datelast.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_datelast)}, false );
        const el_MAB_oneday = document.getElementById("id_MAB_oneday")
            el_MAB_oneday.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_oneday)}, false );

        const el_MAB_offsetstart = document.getElementById("id_MAB_input_offsetstart")
            el_MAB_offsetstart.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_offsetstart)}, false );
        const el_MAB_offsetend = document.getElementById("id_MAB_input_offsetend")
            el_MAB_offsetend.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_offsetend)}, false );
        const el_MAB_breakduration = document.getElementById("id_MAB_input_breakduration")
            el_MAB_breakduration.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_breakduration)}, false );
        const el_MAB_timeduration = document.getElementById("id_MAB_input_timeduration")
            el_MAB_timeduration.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_timeduration)}, false );
        const el_MAB_modifiedby = document.getElementById("id_MAB_modifiedby");
        const el_MAB_btn_save = document.getElementById("id_MAB_btn_save");
            el_MAB_btn_save.addEventListener("click", function() {MAB_Save("save")}, false );
        const el_MAB_btn_delete = document.getElementById("id_MAB_btn_delete");
            el_MAB_btn_delete.addEventListener("click", function() {MAB_Save("delete")}, false );

// ---  MODAL SHIFT EMPLOYEE ------------------------------------
        const el_modshift_filter_order = document.getElementById("id_ModSftEmp_filter_order")
            el_modshift_filter_order.addEventListener("keyup", function(event){
                    setTimeout(function() {MSE_FilterOrder("modshift", el_modshift_filter_order)}, 50)});
        const el_modshift_btn_save = document.getElementById("id_ModSftEmp_btn_save");
            el_modshift_btn_save.addEventListener("click", function() {MSE_Save("save")}, false );
        const el_modshift_btn_delete = document.getElementById("id_ModSftEmp_btn_delete");
            el_modshift_btn_delete.addEventListener("click", function() {MSE_Save("delete")}, false );
// ---  create EventListener for select buttons in modshift employee
        btns = document.getElementById("id_ModSftEmp_btns_container").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            btn.addEventListener("click", function() {MSE_BtnShiftoption_Clicked(btn)}, false )
        }
        const el_modshift_absence = document.getElementById("id_ModSftEmp_input_absence");
            el_modshift_absence.addEventListener("change", function() {MSE_AbsenceClicked(el_modshift_absence)}, false );
        const el_modshift_offsetstart = document.getElementById("id_ModSftEmp_input_offsetstart")
            el_modshift_offsetstart.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_offsetstart)}, false );
        const el_modshift_offsetend = document.getElementById("id_ModSftEmp_input_offsetend");
            el_modshift_offsetend.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_offsetend)}, false );
        const el_modshift_breakduration = document.getElementById("id_ModSftEmp_input_breakduration");
            el_modshift_breakduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_breakduration)}, false );
        const el_modshift_timeduration = document.getElementById("id_ModSftEmp_input_timeduration");
            el_modshift_timeduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_timeduration)}, false );
        const el_modshift_datefirst = document.getElementById("id_ModSftEmp_input_datefirst");
            el_modshift_datefirst.addEventListener("change", function() {MSE_DateFirstLastClicked(el_modshift_datefirst)}, false );
        const el_modshift_datelast = document.getElementById("id_ModSftEmp_input_datelast");
            el_modshift_datelast.addEventListener("change", function() {MSE_DateFirstLastClicked(el_modshift_datelast)}, false );
        const el_modshift_onceonly = document.getElementById("id_ModSftEmp_onceonly");
            el_modshift_onceonly.addEventListener("change", function() {MSE_OnceOnly()}, false );
        const el_modshift_oneday = document.getElementById("id_ModSftEmp_oneday");
            el_modshift_oneday.addEventListener("change", function() {MSE_OneDay()}, false );
// ---  create EventListener for buttons weekdays in modShft
        btns = document.getElementById("id_ModSftEmp_weekdays").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            btn.addEventListener("click", function() {MSE_BtnWeekdayClicked(btn)}, false )
        }

// ---  MOD CONFIRM ------------------------------------
// ---  buttons in ModConfirm
        const el_modconfirm_btn_cancel = document.getElementById("id_confirm_btn_cancel");
        const el_modconfirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_modconfirm_btn_save.addEventListener("click", function() {ModConfirmSave()});

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
    // hide msgbox
            el_msg.classList.remove("show");
    // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tr_selected)};
            if(event.target.getAttribute("id") !== "id_btn_delete_schemeitem" && !get_tablerow_selected(event.target)) {
                DeselectHighlightedRows(tr_selected);
            }
        }, false);  // document.addEventListener('click',

//>>>>>>>>>>>>>>> MOD TIMEPICKER >>>>>>>>>>>>>>>>>>> PR2020-04-13
    let el_mtp_container = document.getElementById("id_mtp_container");
    let el_mtp_modal = document.getElementById("id_mtp_modal")
    el_mtp_modal.addEventListener("click", function (e) {
      if (e.target !== el_mtp_modal && e.target !== el_mtp_container) return;
      el_mtp_modal.classList.add("hidden");
    });
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_empl"));

        const now_arr = get_now_arr();
        let datalist_request = {
            setting: {page_employee: {mode: "get"}},
            quicksave: {mode: "get"},
            planning_period: {get: true, now: now_arr},
            calendar_period:  {get: true, now: now_arr},
            locale: {page: "employee"},
            company: {value: true},
            employee_rows: {get: true},

            customer_rows: {isabsence: false, istemplate: false, inactive: false},
            order_rows: {isabsence: false, istemplate: false, inactive: false},
            abscat_rows: {get: true},
            absence_rows: {get: true},
            teammember_list: {employee_nonull: false, is_template: false},
            functioncode_rows: {mode: "get"},
            paydatecode_rows: {mode: "get"},
            wagecode_rows: {mode: "get"},
            //employee_planning: {mode: "get"}
            employee_planningNEW: {mode: "get"}
            };
        DatalistDownload(datalist_request);
        // TODO
        //datalist_request = {
            //"employee_planning": {value: true}}};
        //DatalistDownload(datalist_request);
//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, dont_show_loader) {
       console.log( "=== DatalistDownload ")

// ---  Get today's date and time - for elapsed time
        let startime = new Date().getTime();

// ---  show loader
        if(!dont_show_loader){
            el_loader.classList.remove(cls_visible_hide)
        }
        let param = {"download": JSON.stringify (datalist_request)};
       console.log("datalist_request: ", datalist_request)
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
               console.log("response - elapsed time:", (new Date().getTime() - startime) / 1000 )
               console.log(response)
                if ("calendar_period" in response){
                    selected_calendar_period = get_dict_value(response, ["calendar_period"]);
                    selected_calendar_period["calendar_type"] = "employee_calendar";
                }
                //if ("planning_period" in response){
                //    selected_planning_period = get_dict_value(response, ["planning_period"]);
                //}
                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                    //el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_planning_period);
                    CreateSubmenu()
                    t_CreateTblModSelectPeriod(loc, ModPeriodSelectPeriod);
                    label_list = [loc.Company, loc.Employee, loc.Planning + " " + loc.of, loc.Print_date];
                    pos_x_list = [6, 65, 105, 130, 155, 185];
                    colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];
                }
                if ("planning_period" in response){
                    // this must come after locale_dict PR2020-10-23 debug
                    selected_planning_period = get_dict_value(response, ["planning_period"]);
                    el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_planning_period);
                }
                if ("setting_dict" in response) {
                    // this must come after locale_dict, where weekday_list is loaded
                    // also after CreateSubmenu, where submenu buttons are created
                    UpdateSettings(response["setting_dict"])
                }
                if ("quicksave" in response) {
                    is_quicksave = get_dict_value(response, ["quicksave", "value"], false)
                }

// --- refresh maps and fill tables
                refresh_maps(response);

// --- after first response: get scheme_map etc (employee_list is only called when opening page)
                if ("employee_list" in response) {
                    const datalist_request = {
                        scheme: {isabsence: false, istemplate: false, inactive: null},
                        shift: {customer_pk: null},
                        team: {customer_pk: null, isabsence: false},
                        schemeitem: {customer_pk: null, isabsence: false}
                    };
                    //DatalistDownload(datalist_request, true );  // true = dont_show_loader
                }

        // --- hide loader
               el_loader.classList.add(cls_visible_hide)
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//=========  refresh_maps  ================ PR2020-01-03
    function refresh_maps(response) {
        //console.log("refresh_maps: ", response)

        if ("company_dict" in response) {company_dict = response.company_dict}

        if ("employee_rows" in response) { b_refresh_datamap(response["employee_rows"], employee_map, "employee")}
        if ("abscat_rows" in response) {b_refresh_datamap(response["abscat_rows"], abscat_map, "abscat")};
        if ("absence_rows" in response) {b_refresh_datamap(response["absence_rows"], absence_map, "absence")};
        if ("functioncode_rows" in response) {b_refresh_datamap(response.functioncode_rows, functioncode_map)};
        if ("paydatecode_rows" in response) {b_refresh_datamap(response.paydatecode_rows, paydatecode_map)};
        if ("wagecode_rows" in response) {b_refresh_datamap(response.wagecode_rows, wagecode_map)};

        if ("teammember_list" in response) { b_refresh_datamap(response["teammember_list"], teammember_map) }

        if ("customer_rows" in response) {b_refresh_datamap(response.customer_rows, customer_map, "customer")};
        if ("order_rows" in response) {b_refresh_datamap(response.order_rows, order_map, "order")};

        if ("scheme_list" in response) {b_refresh_datamap(response["scheme_list"], scheme_map)}
        if ("shift_list" in response) {b_refresh_datamap(response["shift_list"], shift_map)}
        if ("team_list" in response) {b_refresh_datamap(response["team_list"], team_map)}
        if ("teammember_list" in response) {b_refresh_datamap(response["teammember_list"], teammember_map)}
        if ("schemeitem_list" in response) {b_refresh_datamap(response["schemeitem_list"], schemeitem_map)}

       // if ("employee_planning_list" in response) {
            // TODO duration_sum not in refresh datamap any more
       //     const duration_sum = 0;
      //      b_refresh_datamap(response["employee_planning_list"], planning_map)
      //      planning_display_duration_total = display_duration (duration_sum, loc.user_lang)
            //PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict,
            //    label_list, pos_x_list, colhdr_list, loc.timeformat, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
      //  }

//------------- employee_planning_list  -----------------------
        if ("employee_planning_listNEW" in response) {
           const employee_planning_listNEW = response["employee_planning_listNEW"]

// ---  convert dictionary to array  PR2020-10-26
            // not necessary, is already array
            //const planning_short_arr = Object.values(employee_planning_listNEW);

// ---  sort array with sort and b_comparator_code PR2020-10-26
            planning_short_list_sorted = employee_planning_listNEW.sort(b_comparator_e_code);

            const planning_agg_list = calc_planning_agg_dict(planning_short_list_sorted);
            CreateHTML_planning_agg_list(planning_agg_list);
            CreateHTML_planning_detail_list(planning_short_list_sorted);
        }

        if ("employee_planning_customer_dictlist" in response) {
            employee_planning_customer_dictlist = response.employee_planning_customer_dictlist
        }
        if ("employee_planning_order_dictlist" in response) {
            employee_planning_order_dictlist = response.employee_planning_order_dictlist
        }
//-------------  end of employee_planning_list  ---------------------------

        HandleBtnSelect(selected_btn, true)  // true = skip_upload

        if ("employee_calendar_list" in response) {
            b_refresh_datamap(response["employee_calendar_list"], calendar_map)
            UpdateHeaderText();
            CreateCalendar("employee", selected_calendar_period, calendar_map, MSE_Open, loc, loc.timeformat, loc.user_lang);
        };

    }  // refresh_maps
//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(data_btn, skip_upload) {
        console.log( "==== HandleBtnSelect ========= ", data_btn);

        selected_btn = (data_btn) ? data_btn : "employee";

// ---  upload new selected_btn, not after loading page (then skip_upload = true)
        if(!skip_upload){
            const upload_dict = {page_employee: {sel_btn: selected_btn}};
            UploadSettings(upload_dict, url_settings_upload);
        }

// ---  highlight selected button
        highlight_BtnSelect(document.getElementById("id_btn_container"), selected_btn);

// ---  show only the elements that are used in this tab
        show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn)

// ---  fill datatable
        if (selected_btn === "employee"){
            CreateEmployeeTblHeader();
            FillEmployeeTblRows()
       } else if (selected_btn === "absence") {
            CreateAbsenceTblHeader();
            FillAbsenceTblRows();
       } else if (selected_btn === "teammember") {
            CreateTeammemberHeader();
            FillTeammemberRows();
        } else if (selected_btn === "planning"){
            CreatePlanningHeader();
            FillPlanningRows();
        };
// ---  highlight row in list table
        FilterTableRows(tblBody_datatable)
// --- update header text
        UpdateHeaderText();
        //const header_period = UpdateHeaderPeriod();
        //console.log ("header_period: ", header_period)
        //document.getElementById("id_calendar_hdr_text").innerText = header_period;
        SBR_DisplaySelectEmployeeOrder();

// --- show/hide menubtn planning
        show_hide_menubuttons(selected_btn);

    }  // HandleBtnSelect

//=========  HandleTblRowClicked  ================ PR2019-03-30
    function HandleTblRowClicked(tblRow) {
        //console.log("=== HandleTblRowClicked");
        //console.log( "tblRow: ", tblRow, typeof tblRow);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tblRow, cls_selected);
        tblRow.classList.add(cls_selected)
// ---  update selected.employee_pk / selected.teammember_pk
        const map_id = tblRow.id;
        const arr = tblRow.id.split("_");
        const tblName = (arr.length) ? arr[0] : null;
        const data_map = (tblName === "absence") ? absence_map : employee_map;
        const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id)
        if (tblName === "employee"){
            selected.employee_pk = map_dict.id;
            selected.employee_code = map_dict.code;
        } else if (tblName === "absence"){
            selected.teammember_pk = map_dict.id;
        }
        //console.log( "selected.employee_pk: ", selected.employee_pk, typeof selected.employee_pk);
// ---  update header text
        UpdateHeaderText();
    }  // HandleTblRowClicked

//========= HandleBtnCalendar  ============= PR2019-12-04
    function HandleBtnCalendar(mode) {
        //console.log( " ==== HandleBtnCalendar ====", mode);

        const datefirst_iso = get_dict_value(selected_calendar_period, ["period_datefirst"])
        //console.log( "datefirst_iso", datefirst_iso, typeof datefirst_iso);

        let calendar_datefirst_JS = get_dateJS_from_dateISO_vanilla(datefirst_iso);
        if(!calendar_datefirst_JS) {calendar_datefirst_JS = new Date()};

        let days_add = 0;
        if (["prevday", "nextday"].indexOf( mode ) > -1){
            days_add = (mode === "prevday") ? -1 : 1;
            change_dayJS_with_daysadd_vanilla(calendar_datefirst_JS, days_add)

        } else if (["prevweek", "nextweek"].indexOf( mode ) > -1){
            let datefirst_weekday = calendar_datefirst_JS.getDay();
            if (!datefirst_weekday) {datefirst_weekday = 7}  // JS sunday = 0, iso sunday = 7

            if(datefirst_weekday === 1){
                // calendar_datefirst_JS is Monday : add / aubtract one week
                days_add = (mode === "prevweek") ? -7 : 7;
                change_dayJS_with_daysadd_vanilla(calendar_datefirst_JS, days_add)
            } else {
                // calendar_datefirst_JS is not a Monday : goto this Monday
                calendar_datefirst_JS = get_thisweek_monday_JS_from_DateJS(calendar_datefirst_JS)
                // if nextweek: goto net monday
                if (mode === "nextweek"){ change_dayJS_with_daysadd_vanilla(calendar_datefirst_JS, 7)}
            }
        } else if (mode === "thisweek") {
            calendar_datefirst_JS = get_thisweek_monday_sunday_dateobj()[0];
        }

        let calendar_datelast_JS = add_daysJS(calendar_datefirst_JS, 6)
        const calendar_datefirst_iso = get_dateISO_from_dateJS(calendar_datefirst_JS);
        const calendar_datelast_iso = get_dateISO_from_dateJS(calendar_datelast_JS);

// ---  upload settings and download calendar
        const now_arr = get_now_arr();
        selected_calendar_period = {now: now_arr, add_shifts_without_employee: false, skip_absence_and_restshifts: false}
        if(mode === "thisweek") {
            selected_calendar_period["period_tag"] = "tweek"
        } else{
            selected_calendar_period["period_tag"] = "other"
            selected_calendar_period["period_datefirst"] = calendar_datefirst_iso
            selected_calendar_period["period_datelast"] = calendar_datelast_iso
        }
        let datalist_request = {employee_calendar: {
                                    employee_pk: selected.employee_pk},
                                    calendar_period: selected_calendar_period
                                };
        DatalistDownload(datalist_request);

    }  // HandleBtnCalendar


//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//========= CreateSubmenu === PR2019-07-30
    function CreateSubmenu () {
        //console.log("===  CreateSubmenu == ");
        //console.log("selected_planning_period", selected_planning_period);

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        AddSubmenuButton(el_div, loc.Add_employee, function() {HandleAddNewBtn()}, ["mx-2"], "id_submenu_add")
        AddSubmenuButton(el_div, loc.Delete_employee, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_delete")

        // PR2020-12-04 debug. Don't use "if (has_perm_add_edit_delete_employees){",
        // because the settings are not back from server when creating submenu
        // was: if (has_perm_add_edit_delete_employees){
            const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");
            AddSubmenuButton(el_div, loc.Upload_employees, null, ["mx-2"], "id_submenu_employee_import", url_employee_import);

        AddSubmenuButton(el_div, loc.Preview_planning, function() { HandlePrintPlanning("preview")}, ["mx-2"], "id_submenu_planning_preview");
        AddSubmenuButton(el_div, loc.Download_planning, function() { HandlePrintPlanning("print")}, ["mx-2"], "id_submenu_planning_print");

        AddSubmenuButton(el_div, loc.Export_to_Excel, function() { ExportToExcel()}, ["mx-2"],"id_submenu_export_excel")

        el_submenu.classList.remove(cls_hide);

        show_hide_menubuttons(selected_btn);

    };// CreateSubmenu

//=========  HandleAddNewBtn  ================ PR2020-08-08
    function HandleAddNewBtn() {
        if(selected_btn === "absence"){
            MAB_Open();
        } else {
            MFE_Open();
        };
    }

//========= show_hide_menubuttons  =========== PR2020-04-06 PR2020-09-13
    function show_hide_menubuttons(selected_btn) {
        //console.log( "===== show_hide_menubuttons  ========= ");
        //<PERMIT> PR2020-11-10
        let hide_btn_add_delete = true, hide_btn_import = true, hide_btn_print_excel = true;
        if(selected_btn === "employee"){
            hide_btn_add_delete = (!has_perm_add_edit_delete_employees || has_allowed_customers || has_allowed_orders);
            hide_btn_import = hide_btn_add_delete
        } else if(selected_btn === "absence"){
            hide_btn_add_delete = (!has_perm_add_edit_delete_absence);
        } else if(selected_btn === "planning"){
            hide_btn_print_excel = false;
        }

        let el_btn_add = document.getElementById("id_submenu_add");
        let el_btn_delete = document.getElementById("id_submenu_delete")
        if (el_btn_add) {
            el_btn_add.innerText = (selected_btn === "absence") ? loc.Add_absence : loc.Add_employee;
            add_or_remove_class (el_btn_add, cls_hide, hide_btn_add_delete);
        }
        if (el_btn_delete) {
            el_btn_delete.innerText = (selected_btn === "absence") ? loc.Delete_absence : loc.Delete_employee;
            add_or_remove_class (el_btn_delete, cls_hide, hide_btn_add_delete);
        }

        let el_btn_import = document.getElementById("id_submenu_employee_import");
        if (el_btn_import) {add_or_remove_class (el_btn_import, cls_hide, hide_btn_import)};

        let el_btn_preview = document.getElementById("id_submenu_planning_preview");
        let el_btn_print = document.getElementById("id_submenu_planning_print");
        let el_btn_excel =  document.getElementById("id_submenu_export_excel");
        if (el_btn_preview) {add_or_remove_class (el_btn_preview, cls_hide, hide_btn_print_excel)};
        if (el_btn_print) {add_or_remove_class (el_btn_print, cls_hide, hide_btn_print_excel)};
        if (el_btn_excel) {add_or_remove_class (el_btn_excel, cls_hide, hide_btn_print_excel)};
    };// show_hide_menubuttons

//=========  CreateEmployeeTblHeader  === PR2019-10-25 PR2020-05-14 PR2020-08-10 PR2020-10-18
    function CreateEmployeeTblHeader() {
        //console.log("===  CreateEmployeeTblHeader ===");
        const tblName = "employee"

        const field_setting = field_settings[tblName];

// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null

        if(field_setting){
            const field_names = field_settings[tblName].field_names;
            const field_captions = field_settings[tblName].field_caption;
            const field_filter_tags = field_settings[tblName].filter_tags;
            const field_widths = field_settings[tblName].field_width;
            const field_aligns = field_settings[tblName].field_align;
            const column_count = field_names.length;

            if(column_count){

// +++  insert header rows ++++++++++++++++++++++++++++++++
                let tblRow_header = tblHead_datatable.insertRow (-1);
                let tblRow_filter = tblHead_datatable.insertRow (-1);
                    tblRow_filter.setAttribute("data-filterrow", "1")

//--- insert th's to tblRow_header
                for (let i = 0; i < column_count; i++) {
                    const fldName = (field_names[i]) ? field_names[i] : null;
                    const caption = (field_captions[i]) ? loc[field_captions[i]] : null;

                    const filter_tag = field_filter_tags[i];
                    const class_width = "tw_" + field_widths[i] ;
                    const class_align = "ta_" + field_aligns[i];

// ++++++++++ create header row +++++++++++++++
// --- add th to tblRow_header
                    const th_header = document.createElement("th");
                        const el_header = document.createElement("div");
                            el_header.innerText = caption;
                            el_header.classList.add(class_width, class_align);
                            // add right padding to number fields
                            if (["workhoursperweek", "workminutesperday", "leavedays", ].indexOf(fldName) > -1) {
                                el_header.classList.add("pr-2")
                            };
                        th_header.appendChild(el_header)
                    tblRow_header.appendChild(th_header);

// ++++++++++ create filter row +++++++++++++++
        // --- add th to tblRow_filter.
                    const th_filter = document.createElement("th");
        // --- add element with tag 'div' or 'input'
                        const el_tag = (["inactive", "delete", "select"].indexOf(fldName) > -1) ? "div" : "input";
                        const el_filter = document.createElement(el_tag);
        // --- add EventListener
                            const event_str = (["text", "amount"].indexOf(filter_tag) > -1) ? "keyup" : "click";
                            el_filter.addEventListener(event_str, function(event){HandleFilterField(el_filter, i, event.key)});
        // --- add Attributes
                            el_filter.setAttribute("data-field", fldName);
                            el_filter.setAttribute("data-filtertag", filter_tag);
                            if (fldName === "inactive") {
// --- add title to field inactive
                                el_filter.title = loc.Click_show_inactive_employees;
// --- add div for image inactive
                                let el_div = document.createElement("div");
                                    el_div.classList.add("inactive_0_2")
                                    el_filter.appendChild(el_div);
                                el_filter.classList.add("pointer_show");
                                //append_background_class(el_filter, "inactive_0_2");
                            }
// --- add other attributes
                            if (["text", "amount"].indexOf(filter_tag) > -1) {
                                el_filter.setAttribute("type", "text")
                                el_filter.classList.add("input_text");

                                el_filter.setAttribute("autocomplete", "off");
                                el_filter.setAttribute("ondragstart", "return false;");
                                el_filter.setAttribute("ondrop", "return false;");
                            }
                            if (["workhoursperweek", "workminutesperday", "leavedays", ].indexOf(fldName) > -1) {
                                el_filter.classList.add("pr-2")
                            };
// --- add width, text_align
                            el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                        th_filter.appendChild(el_filter);
                    tblRow_filter.appendChild(th_filter);
                }  // for (let i = 0; i < column_count; i++)
            }
        }
    };  //  CreateEmployeeTblHeader

//========= FillEmployeeTblRows  ====================================
    function FillEmployeeTblRows() {
        //console.log( "===== FillEmployeeTblRows  === ");
// --- reset table
        // is in CreateEmployeeTblHeader
        if(employee_map){
// --- loop through employee_map
            for (const [map_id, map_dict] of employee_map.entries()) {

            // --- validate if absence can be added to list
                // <PERMIT> 2020-11-10
                // has_allowed_customers_or_orders means that only employees of allowed customers_ orders are shown

                let skip_row = false;
                if (has_allowed_customers || has_allowed_orders) {
                    skip_row = (!map_dict.allowed) ;
                }
                if (!skip_row){
                    let tblRow = CreateEmployeeTblRow(map_dict, -1)
                    RefreshTblRowNEW(tblRow, map_dict)
    // --- highlight selected row
                    if (map_dict.id === selected.employee_pk) {tblRow.classList.add(cls_selected)}
                }
            }
        }
// --- filter rows
        FilterTableRows();
    }  // FillEmployeeTblRows

//=========  CreateEmployeeTblRow  ================ PR2019-08-29 PR2020-08-10
    function CreateEmployeeTblRow(map_dict, row_index) {
        //console.log("=========  CreateEmployeeTblRow =========");
        //console.log("map_id", map_id);
        const tblName = "employee";
        let tblRow = null;
        if(map_dict && field_settings[tblName]){

            const field_names = field_settings[tblName].field_names;
            const order_by = (map_dict.code) ? map_dict.code.toLowerCase() : "";
// --- insert tblRow into tblBody_datatable
            tblRow = tblBody_datatable.insertRow(row_index);
            tblRow.id = map_dict.mapid;
            tblRow.setAttribute("data-table", tblName);
            //tblRow.setAttribute("data-pk", pk_str);
            tblRow.setAttribute("data-orderby", order_by);
            //if(employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow)}, false);
//+++ insert td's into tblRow
            const column_count = field_names.length;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create element
                let el = document.createElement("div");
    // --- add field_name in data-field Attribute
                el.setAttribute("data-field", field_settings[tblName].field_names[j]);
    // --- add img inactive to col_inactive
                if (field_names[j] === "inactive") {
                    append_background_class(el,"inactive_0_2")
                    if (has_perm_add_edit_delete_employees){
                        el.setAttribute("title", loc.Click_to_make_this_employee_inactive)
    // --- add EventListeners
                        el.addEventListener("click", function() {UploadDeleteInactive("inactive", el)}, false )
                    };  // if (has_perm_add_edit_delete_employees){
                } else if (j){
                    if (has_perm_add_edit_delete_employees){
                        el.addEventListener("click", function() {MFE_Open(el)}, false)
                    }
                }
                if(j !== 0 && has_perm_add_edit_delete_employees){
                    add_hover(el)
                };
    // --- add field_width and text_align
                el.classList.add("tw_" + field_settings[tblName].field_width[j],
                                 "ta_" + field_settings[tblName].field_align[j]);
    // add right padding to number fields
                if( [6,7,8].indexOf(j) > -1) {el.classList.add("pr-2")};
    // --- add element to td.
                td.appendChild(el);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[selected_btn])
        return tblRow
    };  // CreateEmployeeTblRow

// ##################################################
//=========  CreateTblHeadCalendar  === PR2019-10-25 PR2020-05-14
    function CreateTblHeadCalendar(tblName) {
        //console.log("===  CreateTblHeadCalendar == ");

            let tblHead = document.getElementById("id_thead_calendar");
            tblHead.innerText = null

//--- insert tblRow
            let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
            //calendar: { tbl_col_count: 7},
            const column_count = 7 // was: field_settings[mode].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
                let th = document.createElement("th");
// --- add vertical line between columns in planning
                // if (mode === "planning"){th.classList.add("border_right")};
// --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
// --- add innerText to el_div
                const data_text = field_settings[mode].field_caption[j];
                if(!!data_text) el_div.innerText = data_text;
// --- add innerText to el_div
                //let data_key = null, hdr_txt = "";
                //if (mode === "planning"){
                //    //hdr_txt = (j === 0) ? "" : loc.weekdays_long[j];
                //} else {
                //    data_key = "data-" + field_caption[mode][j];
                //    hdr_txt = get_attr_from_el(el_data, data_key);
                //}
                //el_div.innerText = hdr_txt
                el_div.setAttribute("overflow-wrap", "break-word");
// --- add left margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")};
// --- add field_width and text_align
                el_div.classList.add("tw_" + field_settings[mode].field_width[j],
                                     "ta_" + field_settings[mode].field_align[j])
                th.appendChild(el_div)
                tblRow.appendChild(th);
            }  // for (let j = 0; j < column_count; j++)
            CreateTblHeaderFilter(tblName, column_count);
    };  // CreateTblHeadCalendar

//=========  CreateTblHeaderFilter  ================ PR2019-09-15 PR2020-05-22
    function CreateTblHeaderFilter(tblName, column_count) {
    // only used in CreateTblHeadCalendar
        //console.log("=========  function CreateTblHeaderFilter =========");
//+++ insert tblRow into tblHead_datatable
        let tblRow = tblHead_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");
//+++ iterate through columns
        for (let j = 0, td, el; j < column_count; j++) {
// insert td into tblRow
            td = tblRow.insertCell(-1);
// --- add vertical line between columns in planning
             if (tblName === "planning"){td.classList.add("border_right")};
// create element with tag from field_tags
                // replace select tag with input tag
                let el = document.createElement("div");
// --- add data-field Attribute.
               el.setAttribute("data-field", field_settings[tblName].field_names[j]);
               el_input.setAttribute("data-filtertag", field_settings[tblName].filter_tags[j]);
               el.setAttribute("data-table", tblName);
// --- add img delete
                if (tblName === "employee" && j === column_count -1) {
                    // skip delete column
                } else {
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");
// --- make text grey, not in calendar
                    if (tblName !== "planning") {el.classList.add("tsa_color_darkgrey")}
                    el.classList.add("tsa_transparent")
// --- add other attributes to td
                    el.setAttribute("autocomplete", "off");
                    el.setAttribute("ondragstart", "return false;");
                    el.setAttribute("ondrop", "return false;");
                }  //if (j === 0)
// --- add EventListener to td
            if (tblName === "planning"){
                el.setAttribute("overflow-wrap", "break-word");
            } else {
                el.addEventListener("keyup", function(event){HandleFilterName(el, j, event)});
            }
// --- add left margin to first column
            if (j === 0 ){el.classList.add("ml-2")};
// --- add field_width and text_align
            el.classList.add("tw_" + field_settings[tblName].field_width[j],
                             "ta_" + field_settings[tblName].field_align[j]);
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblHeaderFilter

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23
    function CreateBtnDeleteInactive(mode, tblRow, el_input){

        // only called by PR2020-10-17
        // CreateTblRowTeammember CreateBtnDeleteInactive("delete", tblRow, el);
        el_input.setAttribute("href", "#");


        // dont swow title 'delete'
        // const data_id = (tblName === "customer") ? "data-txt_customer_delete" : "data-txt_order_delete"
        // el.setAttribute("title", get_attr_from_el(el_data, data_id));
        el_input.addEventListener("click", function() {UploadDeleteInactive("inactive", el_input)}, false )
        //el_input.setAttribute("title", title);

//- add hover delete img
        if (mode ==="delete") {
            el_input.addEventListener("mouseenter", function() {
                el_input.children[0].setAttribute("src", imgsrc_deletered);
            });
            el_input.addEventListener("mouseleave", function() {
                el_input.children[0].setAttribute("src", imgsrc_delete);
            });
        }
        el_input.classList.add("ml-4")
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_lightgrey;
        AppendChildIcon(el_input, img_src)
    }  // CreateBtnDeleteInactive

//------------------------------

    function tblName_from_selectedbtn(sel_btn) {
        return (["employee", "form"].indexOf(sel_btn ) > -1) ? "employee" :
               (["absence"].indexOf(sel_btn ) > -1) ? "absence" :
               (["shifts"].indexOf(sel_btn ) > -1) ? "teammember" :
               (["calendar", "planning"].indexOf(sel_btn ) > -1) ? "planning" : null;
    } //tblName_from_selectedbtn

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

///=========  refresh_updated_employee_rows  ================ PR2020-09-12
    function refresh_updated_employee_rows(updated_rows) {
        //console.log(" --- refresh_updated_employee_rows  ---");
        for (let i = 0, dict; dict = updated_rows[i]; i++) {
            refresh_updated_employee_item(dict)
        }
    } // refresh_updated_employee_rows

//=========  refresh_updated_employee_item  ================ PR2020-09-12
    function refresh_updated_employee_item(update_dict) {
        //console.log(" =====  refresh_updated_employee_item  =====");
        //console.log("update_dict", update_dict);

        if(!isEmpty(update_dict)){
            const map_id = update_dict.mapid;
            const is_deleted = update_dict.deleted;
            const is_created = update_dict.created;
            if ("msg" in update_dict) {
                const msg_dict = update_dict.msg;
                let html_text = "", msg_header = null;
                // TODO add table absence / teammember
                const tblName = "employee";
                for (const [key, value] of Object.entries(msg_dict)) {
                    if( key === "err_delete"){
                       msg_header = (tblName === "employee") ? loc.Employee_cannot_be_deleted : loc.Item_cannot_be_deleted;
                    }
                    html_text += "<div>" + value + "</div>";
                };
                if(html_text) {
                    document.getElementById("id_mod_message_header").innerText = msg_header;
                    document.getElementById("id_mod_message_container").innerHTML = html_text;
                    $("#id_mod_message").modal({backdrop: true});
                }
            }
// +++  create list of updated fields, before updating data_map, to make them green later
            const updated_fields = b_get_updated_fields_list(field_settings.employee.field_names, employee_map, update_dict);
            //console.log("updated_fields", updated_fields);

// +++  update or add employee_dict in employee_map
            //console.log("data_map.size before: " + data_map.size);
            const data_map = employee_map;
    // ---  remove deleted item from map
            if(is_deleted){
                data_map.delete(map_id);
            } else {
    //--- insert new item or replace existing item
                data_map.set(map_id, update_dict)
            }
            //console.log("data_map.size after: " + data_map.size);

// +++  create tblRow when is_created
            let tblRow = null;
            if(is_created){
    //--- get new row_index
                const search_orderby = update_dict.code;
        //console.log("search_orderby", search_orderby);
        //console.log("update_dict", update_dict);
                let row_index = t_get_rowindex_by_orderby(tblBody_datatable, search_orderby);
                // headerrow has index 0, filerrow has index 1. Deduct 1 for filterrow, I think.
                row_index -= 1;
                if (row_index < -1) { row_index = -1}
        //console.log("row_index", row_index);

    //--- add new tablerow if it does not exist
                // tblRow attribute'data-order_by' contains the number / string that must be used in ordering rows
                tblRow = CreateEmployeeTblRow(update_dict, row_index);
    //--- set new selected.teammember_pk
                selected.employee_pk = update_dict.id
    //--- highlight new row
                DeselectHighlightedRows(tblRow, cls_selected);
                tblRow.classList.add(cls_selected)
    //--- scrollIntoView
                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })

// +++  or get existing tblRow
            } else {
                tblRow = document.getElementById(map_id);
            }

            if(tblRow){
                if(is_deleted){
    //--- remove deleted tblRow
                    tblRow.parentNode.removeChild(tblRow);
                } else {
                    RefreshTblRowNEW(tblRow, update_dict);
                    if (is_created) {
    //--- make new tblRow green for 2 seconds
                        ShowOkElement(tblRow);
    // ---  make updated fields green for 2 seconds
                    } else if(updated_fields){
                        for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                            const el = cell.children[0];
                            if(el){
                                const el_field = get_attr_from_el(el, "data-field")
                                if(updated_fields.includes(el_field)){
                                    ShowOkElement(cell);
            }}}}}};
        }  // if(!isEmpty(update_dict))
    }  // refresh_updated_employee_item


///=========  refresh_updated_absence_rows  ================ PR2020-09-10
    function refresh_updated_absence_rows(updated_rows) {
        //console.log(" --- refresh_updated_absence_rows  ---");
        for (let i = 0, dict; dict = updated_rows[i]; i++) {
            refresh_updated_absence_item(dict)
        }
    } // refresh_updated_absence_rows

//=========  refresh_updated_absence_item  ================ PR2020-08-28 PR2020-09-10
    function refresh_updated_absence_item(update_dict) {
        //console.log(" =====  refresh_updated_absence_item  =====");
        //console.log("update_dict", update_dict);

        if(!isEmpty(update_dict)){
            const map_id = update_dict.mapid;
            const is_deleted = update_dict.deleted;
            const is_created = update_dict.created;

// +++  create list of updated fields, before updating data_map, to make them green later
            const updated_fields = b_get_updated_fields_list(field_settings.absence.field_names, absence_map, update_dict);

// +++  update or add absence_dict in absence_map
            //console.log("data_map.size before: " + data_map.size);
            const data_map = absence_map;
    // ---  remove deleted item from map
            if(is_deleted){
                data_map.delete(map_id);
            } else {
    //--- insert new item or replace existing item
                data_map.set(map_id, update_dict)
            }
            //console.log("data_map.size after: " + data_map.size);

// +++  create tblRow when is_created
            let tblRow = null;
            if(is_created){
    //--- get new row_index
                const search_code = update_dict.e_code;
                const search_datefirst = update_dict.s_df;
                let row_index = t_get_rowindex_by_code_datefirst(tblBody_datatable, "absence", absence_map, search_code, search_datefirst)
                // headerrow has index 0, filerrow has index 1. Deduct 1 for filterrow.
                row_index -= 1;
                if (row_index < -1) { row_index = -1}
    //--- add new tablerow if it does not exist
                // tblRow attribute'data-order_by' contains the number / string that must be used in ordering rows
                tblRow = CreateAbsenceTblRow(map_id, update_dict.id, update_dict.t_id, update_dict.e_id, row_index);
    //--- set new selected.teammember_pk
                selected.teammember_pk = update_dict.id
    //--- highlight new row
                DeselectHighlightedRows(tblRow, cls_selected);
                tblRow.classList.add(cls_selected)
    //--- scrollIntoView
                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })

// +++  or get existing tblRow
            } else {
                tblRow = document.getElementById(map_id);
            }

            if(tblRow){
                if(is_deleted){
    //--- remove deleted tblRow
                    tblRow.parentNode.removeChild(tblRow);
                } else {
                    RefreshTblRowNEW(tblRow, update_dict);
                    if (is_created) {
    //--- make new tblRow green for 2 seconds
                        ShowOkElement(tblRow);
    // ---  make updated fields green for 2 seconds
                    } else if(updated_fields){
                        for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                            const el = cell.children[0];
                            if(el){
                                const el_field = get_attr_from_el(el, "data-field")
                                if(updated_fields.includes(el_field)){
                                    ShowOkElement(cell);
            }}}}}};
        }  // if(!isEmpty(update_dict))
    }  // refresh_updated_absence_item


//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//=========  UpdateTeammemberFromResponse  ================ PR2020-05-17
    function UpdateTeammemberFromResponse(update_dict) {
        //console.log("========= UpdateTeammemberFromResponse  =========");
        //console.log("update_dict", update_dict);
        if(!isEmpty(update_dict)){

            const tblName = 'teammember';
            const pk_int = update_dict.id;
            const ppk_int = update_dict.t_id;
            const is_absence = update_dict.c_isabsence;
            const is_created = get_dict_value (update_dict, ["status", "created"], false);
            const is_deleted = get_dict_value (update_dict, ["status", "deleted"], false);
            // get mapid from status, not form update_dict.mapid. When row is deleted, update_dict.mapid does not exist.
            const map_id = get_dict_value (update_dict, ["status", "mapid"]);

///////////////////
// put updated row in absence map
            const data_map = absence_map;
        //console.log("data_map", data_map);
        //console.log("data_map.size before: " + data_map.size);
        //console.log("is_deleted", is_deleted);

        //console.log("map_id", map_id);
        //console.log("data_map.get", data_map.get(map_id));
            if(data_map){
//+++  replace updated item in map or remove deleted item from map
                if(is_deleted){
                    data_map.delete(map_id);
    //--- remove deleted tblRow from table
                    const tblRow = document.getElementById(map_id)
                    if (tblRow){tblRow.parentNode.removeChild(tblRow)};
                } else if(is_created){
//--- insert new item in alphabetical order
                    if (!!data_map.size){
                        insertInMapAtIndex(data_map, map_id, update_dict, 0, loc.user_lang)
                    } else {
                        data_map.set(map_id, update_dict)
                    }
                } else {
                    data_map.set(map_id, update_dict)
                }
            }
        //console.log("data_map.size after: " + data_map.size);
/////////////////////
            //const inactive_changed = get_dict_value(update_dict, ["inactive", "updated"])
            const search_code = update_dict.e_code;
            // absence datfirst / last is stored in table scheme
            const search_datefirst = update_dict.s_df

            //console.log("is_created", is_created);
            //console.log("search_code", search_code);
            //console.log("search_datefirst", search_datefirst);
            //console.log("inactive_changed", inactive_changed);
            if(is_created){
                let row_index = t_get_rowindex_by_code_datefirst(tblBody_datatable, "absence", absence_map, search_code, search_datefirst)
            //console.log("search_ row_index", row_index);
                // headerrow has index 0, filerrow has index 1. Deduct 1 for filterrow.
                row_index -= 1;
                if (row_index < -1) { row_index = -1}
                let tblRow = CreateAbsenceTblRow(tblBody_datatable, pk_int, ppk_int, selected.employee_pk, row_index)
                //const tblRow = CreateAbsenceTblRow(map_id, map_dict.id, map_dict.t_id, map_dict.e_id, -1);
                UpdateAbsenceTblRow(tblRow, map_id, update_dict)
    // --- highlight selected row, make green for 2 seconds
                tblRow.classList.add(cls_selected)
                ShowClassWithTimeout(tblRow, "tsa_tr_ok")
            } else {
                //console.log("map_id", map_id);
                let tblRow = document.getElementById(map_id);
                //console.log("tblRow", tblRow);
                UpdateTeammemberTblRow(tblRow, map_id, update_dict)
            }
        }  // if(!isEmpty(update_dict))
    } // UpdateTeammemberFromResponse

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_dict", setting_dict)
        // only called at opening of page
        selected_btn = get_dict_value(setting_dict, ["sel_btn"], "employee");
        const page_dict = get_dict_value(setting_dict, ["page_employee"])
        if (!isEmpty(page_dict)){
            const saved_btn = get_dict_value(page_dict, ["sel_btn"])
            //selected_btn = (!!saved_btn) ? saved_btn : "employee";
        }
        let key = "planning_period";
        if (key in setting_dict){
            selected_planning_period = setting_dict[key];
            const header_period = UpdateHeaderPeriod();
            document.getElementById("id_calendar_hdr_text").innerText = header_period;
        }

        // <PERMIT> PR2020-11-10
        // - supervisor, planner and hr_man have access to page 'employees' (is set in html)
        // - supervisor, planner and hr_man can add / edit / delete absence
        // - only hr_man can add / edit / delete employees
        // - when has_allowed_customers and / or has_allowed_orders: filter only emlpoyees of these customers / orders

        // permits get value when setting_dict is downloaded
        has_perm_add_edit_delete_employees = (!!setting_dict.requsr_perm_hrman);
        has_perm_add_edit_delete_absence =  (!!setting_dict.requsr_perm_supervisor || !!setting_dict.requsr_planner || !!setting_dict.requsr_perm_hrman);

        allowed_customers = setting_dict.requsr_perm_customers
        allowed_orders = setting_dict.requsr_perm_orders
        // empty array [] is truely, therefore check also array.length
        has_allowed_customers = (!!allowed_customers && !!allowed_customers.length);
        has_allowed_orders = (!!allowed_orders && !!allowed_orders.length);

        //  key = "calendar_setting_dict";
        //   if (key in setting_dict){
        //       calendar_setting_dict = setting_dict[key];
        // this CreateCalendar creates an empyy calendar
        //      CreateCalendar("employee", calendar_setting_dict, calendar_map, MSE_Open, loc, loc.timeformat, user_lang);
        //   }

    }  // UpdateSettings


//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText() {
        //console.log( "===== UpdateHeaderText  ========= ");
        //console.log( "selected_btn", selected_btn);
        //console.log( "selected.employee_pk", selected.employee_pk);

        let header_text = null;
        if (selected_btn === "employee") {
            header_text = loc.Employee_list
        } else if (selected_btn === "absence") {
            header_text = loc.Absence;
        } else if (selected_btn === "teammember") {
            header_text = loc.Shifts;
        } else if (selected_btn === "calendar") {
            if (selected.employee_pk) {
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected.employee_pk)
                header_text = get_dict_value(map_dict, ["code", "value"], "")
            } else {
                header_text = loc.Select_employee + "..."
            }
        } else if (selected_btn === "planning") {
            header_text = loc.Period + ": " + get_dict_value(selected_planning_period, ["dates_display_short"], "")
        }
        //console.log( "header_text", header_text);
        document.getElementById("id_hdr_text").innerText = header_text
    }  // UpdateHeaderText


//###########################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++
    // NOT IN USE PR2020-10-17
    //function HandleSelectRowButton(el_input) {
    //    UploadDeleteInactive("inactive", el_input)
    //}

//========= UploadDeleteInactive  ============= PR2019-09-23
    function UploadDeleteInactive(mode, el_input) {
        //console.log( " ==== UploadDeleteInactive ====", mode);
        // called by : PR2020-10-17
        //  CreateEmployeeTblRow addEventListener UploadDeleteInactive("inactive", el)
        //  CreateTblRowTeammember CreateBtnDeleteInactive("delete", tblRow, el);
        //                         CreateBtnDeleteInactive addEventListener {UploadDeleteInactive("inactive", el_input)}
        if(has_perm_add_edit_delete_employees){
            // TODO fix this function PR2020-09-21
            let tblRow = get_tablerow_selected(el_input)
            if(tblRow){
                const tblName = get_attr_from_el(tblRow, "data-table");
                const data_map = (selected_btn === "absence") ? absence_map :
                                  (tblName === "teammember") ? teammember_map : employee_map
                const map_dict = get_mapdict_from_datamap_by_id(data_map, tblRow.id);
            //console.log( "map_dict", map_dict);
                if (!isEmpty(map_dict)){
                    let upload_dict = {id: {pk: map_dict.id, ppk: map_dict.comp_id, table: tblName}};
        // ---  create upload_dict with id_dict
                    mod_dict = {id: map_dict.id};
                    if (["absence", "teammember"].indexOf(tblName) > -1) {
                        if (!isEmpty(map_dict.employee)){
                            mod_dict.employee = map_dict.employee;
                        };
                    };
                    if (mode === "delete"){
                        mod_dict["id"]["delete"] = true;
                        ModConfirmOpen("delete", tblRow);
                        return false;
                    } else if (mode === "inactive"){

                // toggle inactive
                        const new_inactive = (!map_dict.inactive);
                        upload_dict.inactive = {value: new_inactive, update: true};
                // change inactive icon, before uploading
                        // format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive, title_inactive, title_active)
                        //console.log("format_inactive_element")

                        //format_inactive_element (el_input, mod_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)

                        add_or_remove_class(el_input, "inactive_1_3", new_inactive, "inactive_0_2" )

                // ---  show modal, only when made inactive
                        if(!!new_inactive){
                            mod_dict["inactive"] = {"value": new_inactive, "update": true};
                            ModConfirmOpen("inactive", tblRow);
                            return false;
                        }
                    }

                    const url_str = (["absence", "teammember"].indexOf() > -1) ? url_teammember_upload : url_employee_upload;
                    UploadChanges(upload_dict, url_str);
                }  // if (!isEmpty(map_dict))
            }  //   if(!!tblRow)
        }  //  if(has_perm_add_edit_delete_employees){
    }  // UploadDeleteInactive

//========= UploadEmployeeChanges  ============= PR2019-10-08
    function UploadEmployeeChanges(el_input) {
        //console.log("--- UploadEmployeeChanges  --------------");
        // function only called when btn (and table) = 'employee', by elements of table, not by date fields

        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){
            const tblName = "employee";
    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!isEmpty(id_dict)){

    // add id_dict to upload_dict
                let upload_dict = {"id": id_dict};

                const is_create = ("create" in id_dict);

                // get employee info
                const pk_int = get_dict_value(id_dict, ["pk"])
                const tblName = get_dict_value(id_dict, ["table"])
                const map_id = get_map_id(tblName, pk_int);
                const employee_dict = get_mapdict_from_datamap_by_id(employee_map, map_id)

                if (!isEmpty(employee_dict)){
                    const employee_code = get_dict_value(employee_dict, ["code", "value"])
                    const workminutesperday = get_dict_value(employee_dict, ["workminutesperday", "value"])
                }

    // ---  get fieldname from 'el_input.data-field'
                const fieldname = get_attr_from_el(el_input, "data-field");
                const is_delete = (fieldname === "delete");
                //console.log("fieldname: ", fieldname,  "is_delete: ", is_delete,  "is_create: ", is_create);

    // ---  remove back color selected, otherwise green or red won't show;
                if(is_create ||is_delete ){tr_changed.classList.remove(cls_selected)}

    // if delete: add 'delete' to id_dict and make tblRow red
                if(is_delete){
                    id_dict["delete"] = true

    // if delete: make tblRow red for 3 seconds
                    tr_changed.classList.add(cls_error);
                    setTimeout(function (){
                        tr_changed.classList.remove(cls_error);
                    }, 3000);

                } else {
    // --- skip  fielddict when is_delete
                    let field_dict = {};
                    // fields of employee are: "code", "datefirst", "datelast",
                    // "hoursperday", "daysperweek", "leavedays", "pricerate", "delete"],

                    // TODO not in use
                    if (["order", "team"].indexOf( fieldname ) > -1){
                        const pk_int = parseInt(el_input.value);
                        if(!!pk_int){
                            field_dict["pk"] = pk_int
                            if (el_input.selectedIndex > -1) {
                                const option = el_input.options[el_input.selectedIndex]
                                const code = option.text;
                                const ppk_int = get_attr_from_el_int(option, "data-ppk")
                                if(!!code){field_dict["value"] = code};
                                if(!!ppk_int){field_dict["ppk"] = ppk_int};
                            }
                        }
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;
                        //set default value to workhoursperweek
                        if(fieldname === "team" && is_create){
                            // convert to hours, because input is in hours
                            // TODO add popup hours window
                            const hours = workminutesperday / 60
                            upload_dict["workminutesperday"] = {"value": hours, "update": true }
                        }
                    } else {
                        let new_value = el_input.value;
                        if (["workhoursperweek", "workminutesperday", "leavedays",].indexOf( fieldname ) > -1){
                            if(!value){value = 0}
                        }
                        field_dict["value"] = new_value;
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;
                    }
                } // if(!is_delete)

                UploadChanges(upload_dict, url_employee_upload);

            }  // if (!isEmpty(id_dict))
        }  //  if (!! tr_changed)
    } // UploadEmployeeChanges(el_input)

//========= ModTimepickerChanged  ============= PR2019-10-12
    function ModTimepickerChanged(tp_dict) {
        //console.log(" === ModTimepickerChanged ===" );
        // ModTimepickerChanged is returned by ModTimepickerSave in modtimepicker.js
        //console.log("tp_dict", tp_dict);

        const pgeName = tp_dict.page;
        //console.log("pgeName", pgeName);

        let upload_dict = {"id": tp_dict["id"]};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            // if mode = 'shifts', dont upload changes but put them in modal shifts
            if (pgeName === "modshift") {
        // return value from ModTimepicker. Don't upload but put new value in ModShift
                MSE_TimepickerResponse(tp_dict);
            } else if (pgeName === "modabsence") {
                MSE_TimepickerResponse(tp_dict);

            } else {
                // TODO add time to teammember absence
                upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};
                //console.log("upload_dict", upload_dict);

                const tblName = "emplhour";
                const map_id = get_map_id(tblName, get_dict_value(tp_dict, ["id", "pk"]));
                let tr_changed = document.getElementById(map_id)

                let parameters = {"upload": JSON.stringify (upload_dict)}
                const url_str = url_teammember_upload;
                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        //console.log ("response", response);
                        if ("update_list" in response) {
                            let update_list = response["update_list"];
                            UpdateFromResponseNEW(tblName, update_list)
                        }

                    },
                    error: function (xhr, msg) {
                        //console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

             }  //    if (pgeName ==="shifts")
    }  // if("save_changes" in tp_dict) {
 }  //ModTimepickerChanged

//###########################################################################
// +++++++++++++++++ UPLOAD +++++++++++++++++++++++++++++++++++++++++++++++++


//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed.
// An attribute is only ever a string, no other type
    function UploadChanges(upload_dict, url_str) {
        console.log("=== UploadChanges");
        if(!isEmpty(upload_dict)) {
            const parameters = {"upload": JSON.stringify (upload_dict)}

            console.log("url_str: ", url_str);
            console.log("upload_dict: ", upload_dict);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("updated_absence_rows" in response) {
                        refresh_updated_absence_rows(response.updated_absence_rows)
                    };

                    if ("updated_employee_rows" in response) {
                        refresh_updated_employee_rows(response.updated_employee_rows);
                    };

                    if ("employee_list" in response) {
                        b_refresh_datamap(response["employee_list"], employee_map)

                        const tblName = "employee";
                        const include_parent_code = null;
                        let tblHead = document.getElementById("id_SBR_thead_select");
                        const filter_ppk_int = null, filter_show_inactive = true, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false, addall_to_list_txt = null;

                        const imgsrc_default = imgsrc_inactive_grey;
                        const imgsrc_default_header = imgsrc_inactive_lightgrey;
                        const imgsrc_default_black = imgsrc_inactive_black;
                        const imgsrc_hover = imgsrc_inactive_black;
                        const header_txt = null;

                        FillEmployeeTblRows();
                    };
                    if ("teammember_list" in response) {
                        b_refresh_datamap(response["teammember_list"], teammember_map)
                    };
                    if ("teammember_update" in response) {
                        UpdateTeammemberFromResponse(response["teammember_update"]);
                    };
                    if ("employee_calendar_list" in response) {
                        b_refresh_datamap(response["employee_calendar_list"], calendar_map)
                        CreateCalendar("employee", selected_calendar_period, calendar_map, MSE_Open, loc, loc.timeformat, user_lang);
                    }
                },  // success: function (response) {
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModShiftTimepickerOpen  ================ PR2019-10-12
    function ModShiftTimepickerOpen(el_input) {
        //console.log("=== ModShiftTimepickerOpen ===");
        // calledby = 'absence' or 'modshift'

        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", selected.teammember_pk );
        //console.log("mod_dict", mod_dict);

        const fldName = get_attr_from_el(el_input, "data-field");
        const pgeName = mod_dict.page ? mod_dict.page : "modshift"; //TODO
        const rosterdate = null; // keep rosterdate = null, to show 'current day' instead of Dec 1

console.log("fldName:", fldName);
        let offset_value = null, offset_start = null, offset_end = null, break_duration = null, time_duration = null,
            minoffset = null, maxoffset = null;
if(pgeName === "absence"){
    // TODO
    offset_value = get_dict_value(mod_dict.shift, [fldName])
    offset_start = get_dict_value(mod_dict, ["shift", "offsetstart"]);
    offset_end = get_dict_value(mod_dict, ["shift", "offsetend"]);
    break_duration = get_dict_value(mod_dict, ["shift", "breakduration"]);
    time_duration = get_dict_value(mod_dict, ["shift", "timeduration"]);
    minoffset = get_minoffset(fldName, offset_start, break_duration)
    maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)
} else {
    offset_value = get_dict_value(mod_dict.shift, [fldName])
    offset_start = get_dict_value(mod_dict, ["shift", "offsetstart"]);
    offset_end = get_dict_value(mod_dict, ["shift", "offsetend"]);
    break_duration = get_dict_value(mod_dict, ["shift", "breakduration"]);
    time_duration = get_dict_value(mod_dict, ["shift", "timeduration"]);
    minoffset = get_minoffset(fldName, offset_start, break_duration)
    maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)
}
        // in offsetstart and offsetend value null (no value) is different from 0 (midnight)
        if (fldName === "breakduration" || fldName === "timeduration") {
            if (offset_value == null) {offset_value = 0}
        }

// ---  create tp_dict with variables
        const id_dict = {};
        const tp_dict = {id: id_dict,  // used in UploadTimepickerResponse
                       field: fldName,  // used in UploadTimepickerResponse
                       page: pgeName,
                       rosterdate: rosterdate,
                       offset: offset_value,
                       minoffset: minoffset,
                       maxoffset: maxoffset,
                       isampm: (loc.timeformat === 'AmPm'),
                       quicksave: is_quicksave}

// ---  create st_dict with static text
        const txt_dateheader = (fldName === "offsetstart") ? loc.Start_time :
                               (fldName === "offsetend") ? loc.End_time :
                               (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ?  (pgeName === "absence") ? loc.Hours : loc.Working_hours :
                               (fldName === "offsetsplit") ? loc.Split_time : null
        const show_btn_delete = true;
        let st_dict = { url_settings_upload: url_settings_upload,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete};

        //console.log("tp_dict: ", tp_dict);
        //console.log("st_dict: ", st_dict);
        mtp_TimepickerOpen(loc, el_input, ModTimepickerChanged, tp_dict, st_dict)

    };  // ModShiftTimepickerOpen

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++


// +++++++++++++++++ SIDEBAR MOD SELECT PERIOD  +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen=================== PR2020-07-12
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_planning_period", selected_planning_period) ;
        mod_dict = selected_planning_period;
// ---  highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value(selected_planning_period, ["period_tag"])
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
        el_mod_period_datefirst.value = get_dict_value(selected_planning_period, ["period_datefirst"])
        el_mod_period_datelast.value = get_dict_value(selected_planning_period, ["period_datelast"])
// ---  set min max of input fields
        ModPeriodDateChanged("setminmax");
        el_mod_period_datefirst.disabled = !is_custom_period
        el_mod_period_datelast.disabled = !is_custom_period
// ---  reset checkbox oneday, hide  when not is_custom_period
        el_mod_period_oneday.checked = false;
        add_or_remove_class(document.getElementById("id_mod_period_oneday_container"), cls_hide, !is_custom_period)
// ---  hide extend period input box
        document.getElementById("id_mod_period_div_extend").classList.add(cls_hide)
// ---  show modal
        $("#id_mod_period").modal({backdrop: true});
}; // function ModPeriodOpen

//=========  ModPeriodSelectPeriod  ================ PR2020-07-12
    function ModPeriodSelectPeriod(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelectPeriod ========= ", selected_index);
        if(!!tr_clicked) {
// ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)
// ---  add period_tag to mod_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_dict["period_tag"] = period_tag;
// ---  enable date input elements, give focus to start
            if (period_tag === "other") {
                // el_mod_period_datefirst / el_datelast got value in ModPeriodOpen
// ---  show checkbox oneday when not is_custom_period
                document.getElementById("id_mod_period_oneday_container").classList.remove(cls_hide);
                el_mod_period_datefirst.disabled = false;
                el_mod_period_datelast.disabled = false;
                el_mod_period_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelectPeriod

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

//=========  ModPeriodSave  ================ PR2020-01-09
    function ModPeriodSave() {
        //console.log("===  ModPeriodSave  =====") ;
        //console.log("mod_dict: ", deepcopy_dict(mod_dict) ) ;
// ---  get period_tag
        const period_tag = get_dict_value(mod_dict, ["period_tag"], "tweek");
// ---  create upload_dict
        let upload_dict = {
            now: get_now_arr(),
            period_tag: period_tag,
            extend_index: 0,
            extend_offset: 0};
        // only save dates when tag = "other"
        if(period_tag == "other"){
            if (el_mod_period_datefirst.value) {mod_dict.period_datefirst = el_mod_period_datefirst.value};
            if (el_mod_period_datelast.value) {mod_dict.period_datelast = el_mod_period_datelast.value};
        }
// ---  upload new setting
        selected_planning_period = {period_tag: period_tag}
        // only save dates when tag = "other"
        if(period_tag == "other"){
            if (el_mod_period_datefirst.value) {selected_planning_period["period_datefirst"] = el_mod_period_datefirst.value};
            if (el_mod_period_datelast.value) {selected_planning_period["period_datelast"] = el_mod_period_datelast.value};
        }
        // send 'now' as array to server, so 'now' of local computer will be used
        selected_planning_period["now"] = get_now_arr();

        let employee_planning_dict = {
            employee_pk: (!!selected.employee_pk) ? selected.employee_pk : null,
            add_shifts_without_employee: false,
            skip_restshifts: false,
            orderby_rosterdate_customer: false
        };
        let datalist_request = {planning_period: selected_planning_period,
                                //employee_planning: employee_planning_dict,
                                employee_planningNEW: {mode: "get"}
                                };
        DatalistDownload(datalist_request);

        $("#id_mod_period").modal("hide");
    }


//=========  UpdateHeaderPeriod ================ PR2019-11-09
    function UpdateHeaderPeriod() {
        //console.log( "===== UpdateHeaderPeriod  ========= ");
        //console.log( "selected_planning_period: ", selected_planning_period);

        const period_tag = get_dict_value(selected_planning_period, ["period_tag"]);
        const datefirst_ISO = get_dict_value(selected_planning_period, ["period_datefirst"]);
        const datelast_ISO = get_dict_value(selected_planning_period, ["period_datelast"]);
        //console.log( "period_tag: ", period_tag);
        //console.log( "datefirst_ISO: ", datefirst_ISO);
        //console.log( "datelast_ISO: ", datelast_ISO);
        let header_text = "";
        if(!!loc){
            let period_txt = "";
            if (period_tag === "other"){
                period_txt = loc.Period + ": "
            } else {
                if(!!loc.period_select_list){
                    const len = loc.period_select_list.length;
                    for (let i = 0; i < len; i++) {
                        if(loc.period_select_list[i][0] === period_tag ){
                            period_txt = loc.period_select_list[i][1] + ": "
                            break;
                        }
                    }
                }  // if(!!loc.period_select_list){
            }
            //console.log( "========== period_txt: ", period_txt);
            period_txt += format_period(loc, datefirst_ISO, datelast_ISO)
            //console.log( "+++++++++++++++ period_txt: ", period_txt);

            if (!!period_txt) {
                header_text = period_txt;
            } else {
                header_text = loc.Select_period + "...";
            }
        }  //  if(!!loc){
        //console.log( "+++++++++++++++ header_text: ", header_text);
        return header_text;
    }  // UpdateHeaderPeriod

//=========  Sidebar_ShowAll  ================ PR2020-01-09
    function Sidebar_ShowAll(key) {
        //console.log( "===== Sidebar_ShowAll ========= ");
// ---  get selected_option from clicked select element
        // option 2: isabsence = true (absence only) option 1: isabsence = false (no absence) option 1: isabsence = null (absence + no absence)

        const roster_period_dict = {employee_pk: null, customer_pk: null, order_pk: null, isabsence: null, isrestshift: null,}


// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in roster_period_dict
        let datalist_request = {planning_period: {employee_pk: null, customer_pk: null, order_pk: null,
                                                    isabsence: null, isrestshift: null},
                                emplhour: true};
        DatalistDownload(datalist_request);
    }  // Sidebar_ShowAll

// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-06-23 PR2020-08-11
    function ModConfirmOpen(crud_mode, tblRow) {
        //console.log(" -----  ModConfirmOpen   ----", crud_mode)

        const is_delete = (crud_mode === "delete");
        mod_dict = {};
        let show_modal = is_delete;
        if(!tblRow){
// when clicked on delete button in submenu there is no tblRow, use selected_pk instead
            const tblName = (selected_btn === "employee") ? "employee" : "absence"
            const selected_pk = (selected_btn === "employee") ? selected.employee_pk : selected.teammember_pk;
            const map_id = get_map_id(tblName, selected_pk);
            tblRow = document.getElementById(get_map_id(tblName, selected_pk));
        }

        let header_txt = null, msg01_txt = null, msg02_txt = null
        let hide_btn_save = false, btn_save_caption = null, btn_cancel_caption = loc.No_cancel;
        if(!tblRow){
            msg01_txt = (selected_btn === "employee") ? loc.Please_select_employee_first :
                        (selected_btn === "absence") ? loc.Please_select_absence_first : null;
            hide_btn_save = true;
            btn_cancel_caption = loc.Close;
            show_modal = true;
        } else {
            const data_map = (selected_btn === "employee") ? employee_map : absence_map;
            const map_dict = get_mapdict_from_datamap_by_id(data_map, tblRow.id);
            const arr = tblRow.id.split("_");
            const tblName = (arr.length) ? arr[0] : null;
            mod_dict = {id: map_dict.id, map_id: tblRow.id, table: tblName, mode: crud_mode};

// +++  set inactive // only table employee has inactive field
            if (!is_delete){
    // ---  toggle inactive
                const is_inactive = (!map_dict.inactive);
    // ---  show modal confirm only when employee is made inactive
                show_modal = is_inactive;
                mod_dict.inactive = is_inactive;
    // ---  when made active: UploadChanges withoutt showing confirm box
                if(!is_inactive){
                    const upload_dict = {id: {pk: map_dict.id, table: tblName, mode: crud_mode},
                                        inactive: {value: is_inactive, update: true}}
                    UploadChanges(mod_dict, url_employee_upload);
                }
            }
// +++  set header text
            header_txt = (!is_delete) ? loc.Make_inactive :
                               (selected_btn === "employee") ? loc.Delete_employee : loc.Delete_absence;
// +++  get msg_txt en btn_caption
            if (!is_delete){
                // inactive, only tbl employee has inactive button
                msg01_txt = loc.Employee + " '" +  map_dict.code + "' " + loc.will_be_made_inactive;
            } else if (tblName === "absence"){
                 msg01_txt = loc.Absence + " '" + map_dict.o_code  + "' " + loc.of + " " + map_dict.e_code + " " +  loc.will_be_deleted;;
            } else {
                msg01_txt = loc.Employee + " '" +  map_dict.code + "' " +  loc.will_be_deleted;
            }
            msg02_txt = loc.Do_you_want_to_continue;
            btn_save_caption =  (is_delete) ? loc.Yes_delete : loc.Yes_make_inactive;
        }
// +++  show modal confirm
        if (show_modal){
            const header_txt = (!is_delete) ? loc.Make_inactive :
                               (selected_btn === "employee") ? loc.Delete_employee : loc.Delete_absence;
            document.getElementById("id_confirm_header").innerText = header_txt
            document.getElementById("id_confirm_msg01").innerText = msg01_txt;
            document.getElementById("id_confirm_msg02").innerText = msg02_txt;
            document.getElementById("id_confirm_msg03").innerText = null;

            el_modconfirm_btn_cancel.innerText = btn_cancel_caption;
            add_or_remove_class(el_modconfirm_btn_save, cls_hide, hide_btn_save)
            if(!hide_btn_save) {
                el_modconfirm_btn_save.innerText = btn_save_caption
                // make save button red when delete
                el_modconfirm_btn_save.classList.remove((is_delete) ? "btn-primary" : "btn-outline-danger")
                el_modconfirm_btn_save.classList.add((is_delete) ? "btn-outline-danger" : "btn-primary")

                setTimeout(function() {el_modconfirm_btn_save.focus()}, 50);
            } else {
                setTimeout(function() {el_modconfirm_btn_cancel.focus()}, 50);
            }
            $("#id_mod_confirm").modal({backdrop: true});
        }
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23 PR2020-08-11
    function ModConfirmSave() {
        console.log("===  ModConfirmSave  =====") ;
        //console.log("mod_dict:", mod_dict)
        $("#id_mod_confirm").modal("hide");

        const tblName = mod_dict.table;
        const pk_int = mod_dict.id;

// - make tblRow red when delete
        // upload_dict when delete absence:
        // upload_dict: {'id': {'pk': 1882, 'table': 'teammember', 'shiftoption': 'isabsence', 'delete': True}}
        if (mod_dict.mode === "delete") {
            let tr_changed = document.getElementById(mod_dict.map_id);
            ShowClassWithTimeout(tr_changed, cls_error)
        }
        const shift_option = (selected_btn === "absence") ? "isabsence" :
                             (selected_btn === "teammember") ? "teammember" : null;
        const upload_dict = {id: {pk: pk_int, table: tblName, shiftoption: shift_option}};
        if (mod_dict.mode === "delete") {
            upload_dict.id.delete = true;
        } else if (mod_dict.mode === "inactive"){
            upload_dict.inactive = {value: mod_dict.inactive, update: true};
        }

        const url_str = (["absence", "teammember"].indexOf(tblName) > -1) ? url_teammember_upload : url_employee_upload;
        UploadChanges(upload_dict, url_str);
    }

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// +++++++++++++++++ MODAL SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//========= MSEF_Open ====================================  PR2020-02-27
    function MSEF_Open (mode) {
        //console.log(" ===  MSEF_Open  =====") ;
        // opens modal select open from sidebar

/*
        let employee_pk = (selected.employee_pk > 0) ? selected.employee_pk : null;
        mod_dict = {employee_pk: employee_pk};

        let tblBody = document.getElementById("id_MSEF_tbody_select");
        const tblHead = null, filter_ppk_int = null, filter_include_inactive = true,
                filter_show_inactive = false, filter_include_absence = false, filter_istemplate = false,
                        addall_to_list_txt = "<" + loc.All_employees + ">";

        //console.log("employee_map", employee_map) ;
        t_Fill_SelectTable(tblBody, tblHead, employee_map, "employee", selected.employee_pk, null,
            MSEF_FilterEmployee, null, MSEF_SelectEmployee, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected, cls_hover );
        MSEF_headertext();
// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_MSEF_input.focus()
        }, 500);
*/
        // dont reset mod_MSEF_dict
        //mod_MSEF_dict = {sel_btn: "employee",
       //                  sel_pk:  -1,  // -1 = all, 0 = shift without emploee
        //                 sel_code: null};
        // mod_MSEF_dict.sel_pk = -1;  // -1 = all, 0 = shift without emploee
        MSEF_BtnSelect() ;
    // ---  show modal
         $("#id_mod_select_employee_function").modal({backdrop: true});
}; // MSEF_Open

//=========  MSEF_Save  ================ PR2020-01-29
    function MSEF_Save() {
        //console.log("===  MSEF_Save =========");

        SBR_DisplaySelectEmployeeOrder();

        //console.log("===  ModPeriodSave  =====") ;
        //console.log("mod_dict: ", deepcopy_dict(mod_dict) ) ;
// ---  get period_tag
        //let mod_MSEF_dict.sel_btn = null  // used to filter selected_employee_pk / selected_functioncode_pk
        //let selected_MSEF_pk = -1;  // -1 = all, 0 = shift without employee
        //let selected_MSEF_code = null

        // send 'now' as array to server, so 'now' of local computer will be used
        selected_planning_period["now"] = get_now_arr();

        let employee_planning_dict = {
            employee_pk: (mod_MSEF_dict.sel_pk > 0) ? mod_MSEF_dict.sel_pk : null,
            add_shifts_without_employee: false,
            skip_restshifts: false,
            orderby_rosterdate_customer: false
        };
        //if (mod_MSEF_dict.sel_pk > 0 ){upload_dict["employee_pk"] = mod_MSEF_dict.sel_pk }

        let datalist_request = {planning_period: selected_planning_period,
                                // employee_planning: employee_planning_dict,
                                employee_planningNEW: {mode: "get"}
                                };
        DatalistDownload(datalist_request);

        $("#id_mod_period").modal("hide");
// hide modal
        $("#id_mod_select_employee_function").modal("hide");
    }  // MSEF_Save

//=========  MSEF_BtnSelect  ================ PR2020-09-19
    function MSEF_BtnSelect(btn) {
        //console.log( "===== MSEF_BtnSelect ========= ");
        // on opening modal btn = undefined, use value stored in selected_btn (default = 'employee'
        // on opening modal btn = undefined, use value stored in mod_MSEF_dict.sel_btn (default = 'employee')
        if(btn) {mod_MSEF_dict.sel_btn = get_attr_from_el(btn,"data-btn")};
        if(!mod_MSEF_dict.sel_btn) {mod_MSEF_dict.sel_btn = "employee"}

// ---  highlight selected button
        highlight_BtnSelect(document.getElementById("id_MSEF_btn_container"), mod_MSEF_dict.sel_btn);
// fill select table
        MSEF_Fill_SelectTable()
// set header text
        MSEF_headertext();
    }  // MSEF_BtnSelect


//========= MSEF_Fill_SelectTable  ============= PR2020--09-17
    function MSEF_Fill_SelectTable() {
        //console.log("===== MSEF_Fill_SelectTable ===== ");

        const tblName = mod_MSEF_dict.sel_btn;
        const data_map = (tblName === "functioncode") ? functioncode_map : employee_map

        //console.log("tblName", tblName);
        //console.log("data_map", data_map);

        const tblBody_select = document.getElementById("id_MSEF_tbody_select");
        tblBody_select.innerText = null;

// ---  add All to list when multiple employees / functions exist
        const len = employee_map.size;
        if(len){
            const employees_functions = (tblName === "functioncode") ? loc.Functions : loc.Employees;
            const add_all_text = "<" + loc.All + employees_functions.toLowerCase() + ">";
            const add_all_dict = {pk: -1, code: add_all_text};
            MSEF_Create_SelectRow(tblName, tblBody_select, add_all_dict, mod_MSEF_dict.sel_pk)
        }
// ---  loop through dictlist
        for (const [map_id, map_dict] of data_map.entries()) {
            if (!isEmpty(map_dict)) {
                MSEF_Create_SelectRow(tblName, tblBody_select, map_dict, mod_MSEF_dict.sel_pk)
            }
        }

    } // MSEF_Fill_SelectTable

//========= MSEF_Create_SelectRow  ============= PR2020-09-19
    function MSEF_Create_SelectRow(tblName, tblBody_select, dict, selected_pk) {
        //console.log("===== MSEF_Fill_SelectRow ===== ", tblName);
       //console.log("dict", dict);

//--- get info from item_dict

// functioncode = {id: 92, code: "Helden", comp_id: 3, inactive: false, mapid: "functioncode_92" }
// employee = {id: 2618, code: "Pieternella NMX", comp_id: 3, inactive: true,fnc_code: "Stefan", fnc_id: 90,  mapid: "employee_2618"}

        const pk_int = dict.id;
        const code_value = (dict.code) ? dict.code : "---"
        const is_selected_row = (pk_int === selected_pk);
//--- skip inactive items
        const is_inactive = (dict.inactive) ? dict.inactive : false;
        if(!is_inactive){
// --- insert tblBody_select row at end
            const map_id = "sel_" + tblName + "_" + pk_int
            const tblRow = tblBody_select.insertRow(-1);

            tblRow.id = map_id;
            tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-value", code_value);
            //tblRow.setAttribute("data-table", tblName);
            const class_selected = (is_selected_row) ? cls_selected: cls_bc_transparent;
            tblRow.classList.add(class_selected);

// --- add hover to select row
            add_hover(tblRow)

// --- add td to tblRow.
            let td = tblRow.insertCell(-1);
            let el_div = document.createElement("div");
                el_div.classList.add("pointer_show")
                el_div.innerText = code_value;
                td.appendChild(el_div);
            td.classList.add("tw_200", "px-2")
            td.classList.add("tsa_bc_transparent")

// --- add addEventListener
            tblRow.addEventListener("click", function() {MSEF_SelectEmployee(tblRow, event.target)}, false);
        }
    } // MSEF_Create_SelectRow

//========= MSEF_headertext  ============= PR2020-09-19
    function MSEF_headertext(tblName) {
        //console.log( "=== MSEF_headertext  ");
        const label_text = loc.Select + ( (mod_MSEF_dict.sel_btn === "functioncode") ?  loc.Function.toLowerCase() : loc.Employee.toLowerCase() );
        document.getElementById("id_MSEF_header").innerText = label_text
        el_MSEF_input.innerText = label_text

        const placeholder_text = loc.Type_letters_and_select + ( (mod_MSEF_dict.sel_btn === "functioncode") ? loc.a_function : loc.an_employee ) + loc.in__the_list
        el_MSEF_input.placeholder = placeholder_text
    }  // MSEF_headertext

//=========  MSEF_SelectEmployee  ================ PR2020-01-09
    function MSEF_SelectEmployee(tblRow) {
        //console.log( "===== MSEF_SelectEmployee ========= ");
        //console.log( tblRow);
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk en code from id of select_tblRow
            mod_MSEF_dict.sel_pk = get_attr_from_el_int(tblRow, "data-pk");
            mod_MSEF_dict.sel_code = get_attr_from_el(tblRow, "data-value");
        //console.log( "mod_MSEF_dict.sel_pk", mod_MSEF_dict.sel_pk);
        //console.log( "mod_MSEF_dict.sel_code", mod_MSEF_dict.sel_code);

// ---  filter rows wth selected pk
            MSEF_Save()
        }
// ---  put value in input box, reste when no tblRow
            el_MSEF_input.value = get_attr_from_el(tblRow, "data-value")
            MSEF_headertext();

    }  // MSEF_SelectEmployee

//=========  MSEF_InputKeyup  ================ PR2020-09-19
    function MSEF_InputKeyup() {
        //console.log( "===== MSEF_InputKeyup  ========= ");

// ---  get value of new_filter
        let new_filter = el_MSEF_input.value

        let tblBody = document.getElementById("id_MSEF_tbody_select");
        const len = tblBody.rows.length;
        if (new_filter && len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one employee: put selected employee in el_MSEF_input
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const selected_value = get_dict_value(filter_dict, ["selected_value"])
            if (selected_pk) {
                el_MSEF_input.value = selected_value;
// ---  put pk of selected employee mod_MSEF_dict.sel_pk
                mod_MSEF_dict.sel_pk = selected_pk;
                mod_MSEF_dict.sel_code = selected_value;
// ---  Set focus to btn_save
                el_MSEF_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSEF_InputKeyup


//========= SBR_DisplaySelectEmployeeOrder  ====================================
    function SBR_DisplaySelectEmployeeOrder() {
        //console.log( "===== SBR_DisplaySelectEmployeeOrder  ========= ");
        //console.log( "mod_MSEF_dict.sel_btn ",mod_MSEF_dict.sel_btn);
        //console.log( "mod_MSEF_dict.sel_pk ",mod_MSEF_dict.sel_pk);
        //console.log( "mod_MSEF_dict.sel_code ",mod_MSEF_dict.sel_code);

// display selected employee / function
        const label_caption = (mod_MSEF_dict.sel_btn === "functioncode") ? (loc.Function + ":") :
                              (mod_MSEF_dict.sel_btn === "employee") ? (loc.Employee + ":") : (loc.Employee + " / " + loc.Function);
        const el_label = document.getElementById("id_SBR_label_select_employee")
        el_label.innerText = label_caption;
        let header_text = null;
        // PR2020-11-01 debug loc may not have value yet (don't know why)
        if(loc){
            if(!mod_MSEF_dict.sel_btn){
               header_text = loc.All + loc.Employees.toLowerCase();
            } else if (mod_MSEF_dict.sel_pk > -1) {
                header_text = mod_MSEF_dict.sel_code;
            } else if(mod_MSEF_dict.sel_btn === "functioncode"){
                header_text = loc.All + loc.Functions.toLowerCase();
            } else {
                header_text = loc.All + loc.Employees.toLowerCase();
            }
        }
        el_SBR_select_employee_function.value = header_text;

// display selected customer / odrder
        header_text = null;
        if(employee_planning_selected_customer || employee_planning_selected_order ){
            const key = (employee_planning_selected_order) ? "c_o_code" : "code";
            const dict = (employee_planning_selected_customer ) ?
                get_mapdict_from_datamap_by_id(customer_map, "customer_" + employee_planning_selected_customer) :
                get_mapdict_from_datamap_by_id(order_map, "order_" + employee_planning_selected_order);
            header_text = get_dict_value(dict, [key], "---")
        } else {
            header_text = loc.All_customers;
        }
        el_SBR_select_order.value = header_text

        const el_container = document.getElementById("id_SBR_select_container")
        if (el_container){
            add_or_remove_class(el_container, cls_hide, (selected_btn !== "planning") )
        }
    }; // SBR_DisplaySelectEmployeeOrder

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2020-11-01
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;

        mod_dict = {customer_pk: 0, order_pk: 0};
        el_MSO_input_customer.value = null;
        el_MSO_input_order.value = null;

// ---  fill select table 'customer'
        MSO_FillSelectTable("customer", 0);

// ---  set header text
        document.getElementById("id_MSO_header").innerText = loc.All_customers

        MSO_SetHeaderAndEnableBtnSave();
// ---  Set focus to el_MSO_input_customer
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){ el_MSO_input_customer.focus() }, 50);
// ---  show modal
         $("#id_modselectcustomerorder").modal({backdrop: true});
}; // MSO_Open

//=========  MSO_Save  ================ PR2020-01-29
    function MSO_Save() {
        //console.log("===  MSO_Save =========");
        //console.log( "mod_dict: ", mod_dict);

        employee_planning_selected_customer = null;  // null = all, -1 = no employee
        employee_planning_selected_order = null;  // null = all, -1 = no employee

        if(mod_dict.order_pk ){
            if(employee_planning_order_dictlist){
                employee_planning_selected_order = mod_dict.order_pk;
            }
        } else if (mod_dict.customer_pk){
        // 1541: (2) [2617, 2608]
            if(employee_planning_customer_dictlist){
                employee_planning_selected_customer = mod_dict.customer_pk;
            }
        }
        SBR_DisplaySelectEmployeeOrder();
        FillPlanningRows();
// hide modal
        $("#id_modselectcustomerorder").modal("hide");
    }  // MSO_Save

//=========  MSO_InputKeyup  ================ PR2020-11-01
    function MSO_InputKeyup(tblName, el_input) {
        //console.log( "=== MSO_InputKeyup  ", tblName)
        //console.log( "el_input.value:  ", el_input.value)

        let tblBody_select = el_MSO_tblbody_select;

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
                MSO_SelecttableUpdateAfterSelect(tblName, pk_int)

// ---  set header and btn save enabled
                MSO_SetHeaderAndEnableBtnSave();
            }  //  if (!!selected_pk) {
        }
    }  // MSO_InputKeyup

//=========  MSO_OnFocus  ================ PR2020-08-19
    function MSO_OnFocus(tblName) {
        MSO_FillSelectTable(tblName, null)
    }  // MSO_OnFocus

//=========  MSO_FillSelectTable  ================ PR2020-08-21
    function MSO_FillSelectTable(tblName, selected_pk) {
        //console.log( "===== MSO_FillSelectTable ========= ");
        //console.log( "tblName: ", tblName);

        const data_map = (tblName === "customer") ? customer_map : // only used in MSO
                         (tblName === "order") ? order_map : null;

        //console.log( "data_map: ", data_map);
        const select_header_text = ( (tblName === "customer") ? loc.Select_customer :
                                     (tblName === "order") ? loc.Select_order : "" ) + ":";

        const el_header = document.getElementById("id_MSO_select_header")
        if(el_header){ el_header.innerText = select_header_text };

        const caption_none = (tblName === "customer") ? loc.No_customers :
                             (tblName === "order") ? loc.No_orders : "";

        let tblBody_select = el_MSO_tblbody_select;
        tblBody_select.innerText = null;

        let row_count = 0, add_to_list = false;
//--- loop through data_map or data_dict
        for (const [map_id, map_dict] of data_map.entries()) {
            add_to_list = MSO_FillSelectRow(map_dict, tblBody_select, tblName, -1, selected_pk, mod_dict.rosterdate);
            if(add_to_list){ row_count += 1};
        };
        //console.log( "row_count: ", row_count);
// ---  disable input_order when no orders or only 1 order in tblName 'order'
        // disable when 'All customers' is set in MSO_SetHeaderAndEnableBtnSave
        if (tblName === "order") {mod_dict.order_count = row_count};
        const input_order_disabled = (tblName === "order") && (
                                     (!mod_dict.customer_pk) ||
                                     (mod_dict.customer_pk && !mod_dict.order_count)  ||
                                     (mod_dict.customer_pk && mod_dict.order_count === 1)
                                     );
        el_MSO_input_order.disabled = input_order_disabled

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
                    mod_dict.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                    MSO_SelecttableClicked(tblName, tblRow, true)  // true = skip_save
                }
            }
        } else {
// ---  add 'all' at the beginning of the list, only when multiple items found
            // row 'AddAllToList' does not count in rowcount_customer / order
            MSO_AddAllToList(tblBody_select, tblName);
        }
    }  // MSO_FillSelectTable

//=========  MSO_FillSelectRow  ================ PR2020-08-18
    function MSO_FillSelectRow(map_dict, tblBody_select, tblName, row_index, selected_pk, rosterdate) {
        //console.log( "===== MSO_FillSelectRow ========= ");
        //console.log("tblName: ", tblName);
        //console.log( "map_dict: ", map_dict);

//--- loop through data_map
        let ppk_int = null, code_value = null, add_to_list = false, is_selected_pk = false;
        const pk_int = map_dict.id;
        //console.log( "map_dict: ", map_dict);
        if(tblName === "customer") {
            ppk_int =  map_dict.comp_id;
            code_value = map_dict.code;
            // only add to list when customer is in employee_planning_customer_list
            // or when row is 'All customers' (then pk_int = 0)
            add_to_list = (pk_int === 0 || pk_int in employee_planning_customer_dictlist);

        } else if(tblName === "order") {
            ppk_int =  map_dict.c_id;
            code_value =  map_dict.code;
            // only add to list when parent = customer and order is in employee_planning_customer_list
            // or when row is 'All orders' (then pk_int = 0)
            add_to_list = ((pk_int === 0) || (ppk_int === mod_dict.customer_pk && pk_int in employee_planning_order_dictlist))
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
            tblRow.addEventListener("click", function() {MSO_SelecttableClicked(tblName, tblRow)}, false )
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
    }  // MSO_FillSelectRow

//=========  MSO_AddAllToList  ================ PR2020-08-24
    function MSO_AddAllToList(tblBody_select, tblName){
        //console.log( "===== MSO_AddAllToList ========= ");
        let map_dict = {};
        if (tblName === "customer") {
            const ppk_int = get_dict_value(company_dict, ["id", "pk"]);
            map_dict = {id: 0, comp_id: ppk_int, code: "<" + loc.All_customers + ">"};
        } else {
            const ppk_int =  mod_dict.customer_pk;
            map_dict = {id: 0, c_id: ppk_int, code: "<" + loc.All_orders + ">"};
        }
        //console.log( "map_dict: ", map_dict);
        MSO_FillSelectRow(map_dict, tblBody_select, tblName, 0, 0)
    }  // MSO_AddAllToList

//=========  MSO_SelecttableClicked  ================ PR2020-08-19
    function MSO_SelecttableClicked(tblName, tblRow, skip_save) {
        //console.log( "===== MSO_SelecttableClicked ========= ");
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
            MSO_SelecttableUpdateAfterSelect(tblName, pk_int)
// ---  set header and enable btn save
            MSO_SetHeaderAndEnableBtnSave();

            if (tblName === "order" && !skip_save){
                setTimeout(function (){ MSO_Save()}, 150);
            }
        }
    }  // MSO_SelecttableClicked

//=========  MSO_SelecttableUpdateAfterSelect  ================ P2020-08-20
    function MSO_SelecttableUpdateAfterSelect(tblName, pk_int) {
        //console.log( "===== MSO_SelecttableUpdateAfterSelect ========= ");
        //console.log( "tblName:", tblName);
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

            const el_input = el_MSO_input_order;
            if(el_input) {
                el_input.value = mod_dict.order_code;
            };
            el_focus =  el_MSO_btn_save ;
        }

        let header_text = null;
        if(!mod_dict.customer_pk){
            header_text = loc.All_customers
        } else if (!mod_dict.order_pk){
            header_text = mod_dict.customer_code + " - " + loc.All_orders.toLowerCase();
        } else {
            header_text = mod_dict.customer_code + " - " + mod_dict.order_code;
        }
        document.getElementById("id_MSO_header").innerText = header_text;

    //console.log( "mod_dict:", mod_dict);
// ---   set focus to next input element
        setTimeout(function (){el_focus.focus()}, 50);

    }  // MSO_SelecttableUpdateAfterSelect

//=========  MSO_SelecttableUpdateAfterSelect  ================ P2020-08-20
    function MSO_SelecttableUpdateAfterSelect(tblName, pk_int) {
        //console.log( "===== MSO_SelecttableUpdateAfterSelect ========= ");
        //console.log( "tblName:", tblName);
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

            const el_input = el_MSO_input_order;
            if(el_input) {
                el_input.value = mod_dict.order_code;
            };
            el_focus = el_MSO_btn_save;
        }

        let header_text = null;
        if(!mod_dict.customer_pk){
            header_text = loc.All_customers
        } else if (!mod_dict.order_pk){
            header_text = mod_dict.customer_code + " - " + loc.All_orders.toLowerCase();
        } else {
            header_text = mod_dict.customer_code + " - " + mod_dict.order_code;
        }
        document.getElementById("id_MSO_header").innerText = header_text;

    //console.log( "mod_dict:", mod_dict);
// ---   set focus to next input element
        setTimeout(function (){el_focus.focus()}, 50);

    }  // MSO_SelecttableUpdateAfterSelect

//=========  MSO_SetHeaderAndEnableBtnSave  ================ PR2020-04-12 PR2020-08-18
    function MSO_SetHeaderAndEnableBtnSave () {
        //console.log(" -----  MSO_SetHeaderAndEnableBtnSave   ----")
        let header_text = null;

// ---  enable save button
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
        //  -  when there is 0 or 1 order. This is set in  MRE_MRO_MSE_MSO_FillSelectTable
        if (!mod_dict.customer_pk) {el_MSO_input_order.disabled = true}
    }  // MSO_SetHeaderAndEnableBtnSave


// +++++++++++++++++ END OF MODAL SELECT ORDER +++++++++++++++++++++++++++++++

// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModEmployeeOpen  ================ PR2019-11-06
    function ModEmployeeOpen(el_input) {
        //console.log(" -----  ModEmployeeOpen   ----")
        //console.log("el_input: ", el_input)
        // ModEmployeeOpen is called bij tblRow_teammember, either employee or replacement
        // tblRow attribute "data-employee_pk" always contains pk of employee, not replacement

        // mod_dict contains info of selected row and employee.
        let tblRow = get_tablerow_selected(el_input);
        const id_dict = get_iddict_from_element(tblRow);
        const row_id_str = get_attr_from_el_str(tblRow, "id")
        //console.log("row_id_str: ", row_id_str)

        const mode = get_attr_from_el_str(tblRow, "data-mode");
        const is_absence = (mode ==="absence");
        if(is_absence){id_dict["isabsence"] = true};

        const tblName = get_attr_from_el(tblRow, "data-table");
        const fieldname = get_attr_from_el(el_input, "data-field");

        mod_dict = {
            id: id_dict,
            row_id: row_id_str,
            mode: mode,
            field: fieldname,
            table: tblName};

// get current employee_pk from el_input (does not exist in addnew row), get employee and replacement info from employee_map
        const employee_pk = get_attr_from_el_int(tblRow, "data-employee_pk");
        //console.log("tblRow: ", tblRow)
        //console.log("employee_pk: ", employee_pk)

        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
        const employee_code = get_dict_value(employee_dict, ["code", "value"]);
        if(!isEmpty(employee_dict)){
            mod_dict["employee_or_replacement"] = {
                pk: employee_pk,
                ppk: get_dict_value(employee_dict, ["id", "ppk"]),
                code: employee_code
        }};
        selected.employee_pk = employee_pk
        selected.employee_code = employee_code
// ---  also get absence category
        if(is_absence){
            let el_abscat = tblRow.cells[1].children[0]
            if(!!el_abscat.value){
                const abscat_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "abscat", el_abscat.value)
                if(!isEmpty(abscat_dict)){
                    mod_dict["abscat"] = {
                        pk: abscat_dict.id,
                        ppk: abscat_dict.c_id,
                        code: abscat_dict.o_code,
                        table: "abscat"}
        }}};
        //console.log("mod_dict", mod_dict)

// ---  get datefirst and datelast from teammember, used in outofrange filter employee
        const teammember_dict = get_mapdict_from_datamap_by_id(teammember_map, row_id_str);
        mod_dict.tm_datefirst = get_dict_value(teammember_dict, ["datefirst", "value"]);
        mod_dict.tm_datelast = get_dict_value(teammember_dict, ["datelast", "value"]);

// ---  put employee name in header
        let el_header = document.getElementById("id_ModSelEmp_hdr_employee")
        let el_div_remove = document.getElementById("id_MSE_div_btn_remove")
        if (!!employee_code){
            el_header.innerText = employee_code
            el_div_remove.classList.remove(cls_hide)
        } else {

// ---  or header "select employee'
            const header_text = (fieldname === "replacement") ? loc.Select_replacement_employee : loc.Select_employee;

            el_header.innerText = header_text + ":";
            el_div_remove.classList.add(cls_hide)
        }

// remove values from el_mod_employee_input
        el_MSEF_input.value = null

        ModEmployeeFillSelectTableEmployee()

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

// ---  show modal
        $("#id_mod_select_employee_function").modal({backdrop: true});

    };  // ModSelectEmployeeOpen

//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        //console.log( "===== ModEmployeeSelect ========= ");

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// get employee info from employee_map
            const employee_pk = get_attr_from_el_str(tblRow, "data-pk");
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
            const employee_code =get_dict_value(employee_dict, ["code", "value"]);
            if(!isEmpty(employee_dict)){
                mod_dict["employee_or_replacement"] = {
                    pk: employee_pk,
                    ppk: get_dict_value(employee_dict, ["id", "ppk"]),
                    code: employee_code,
                    update: true};
// put code_value in el_input_employee
                el_MSEF_input.value = employee_code
// save selected employee
                ModEmployeeSave("save");
            }  // if(!isEmpty(employee_dict))
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-11-06
    function ModEmployeeFilterEmployee(option, event_key) {
        //console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let el_input = el_MSEF_input;
// save when clicked 'Enter', TODO only if quicksave === true
        if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
            ModEmployeeSave("save");
        } else {
            el_input.removeAttribute("data-quicksave")
        }

        let new_filter = el_input.value;
        let skip_filter = false
 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
// remove selected employee from mod_dict
                mod_dict = {};
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
        let tblbody = document.getElementById("id_MSEF_tbody_select");
        let len = tblbody.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, show_row, el, pk_str, code_value; row_index < len; row_index++) {
                tblRow = tblbody.rows[row_index];
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else if (!!el){
// hide current employee -> is already filtered out in ModEmployeeFillSelectTableEmployee
                    code_value = get_attr_from_el_str(tblRow, "data-value")
                    if (!!code_value){
// check if code_value contains filter_mod_employee
                        const code_value_lower = code_value.toLowerCase();
                        show_row = (code_value_lower.indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
// put values from first selected row in select_value
                    if(!has_selection ) {
                        select_pk = get_attr_from_el_int(tblRow, "data-pk")
                        //console.log("select_pk", select_pk, typeof select_pk);
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {

// if only one employee in filtered list: put value in el_input /  mod_dict
        if (has_selection && !has_multiple ) {

// get employee info from employee_map
            const fieldname = get_dict_value(mod_dict, ["field"]);
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"]);
            if(!isEmpty(employee_dict)){
                mod_dict["employee_or_replacement"] = {
                    pk: select_pk,
                    ppk: get_dict_value(employee_dict, ["id", "ppk"]),
                    code: employee_code,
                    update: true};
// put code_value of selected employee in el_input
                el_input.value = employee_code
// data-quicksave = true enables saving by clicking 'Enter'
                el_input.setAttribute("data-quicksave", "true")
            }
        }
    }; // ModEmployeeFilterEmployee

//=========  ModEmployeeSave  ================ PR2019-11-06
    function ModEmployeeSave(mode) {
        //console.log("========= ModEmployeeSave ===" );
        //console.log("mode: ", mode );
        //console.log("mod_dict: ", mod_dict );

        const tblName = get_dict_value(mod_dict, ["table"]);
        const fieldname = get_dict_value(mod_dict, ["field"]);
        const row_id_str = get_dict_value(mod_dict, ["row_id"]);
        const id_dict = get_dict_value(mod_dict, ["id"]);

        // replacement employee is also stored in  mod_dict.employee
        const dict = get_dict_value(mod_dict, ["employee_or_replacement"])

        if (mode === "remove"){
            dict["pk"] = null;
            dict["ppk"] = null;
            dict["code"] = null;
            dict["update"] = true;
        }

        //console.log("tblName: ", tblName );
        //console.log("fieldname: ", fieldname );
        //console.log("dict: ", dict );

        let tblRow = document.getElementById(row_id_str)
        //console.log("tblRow: ", tblRow );
        if(!!tblRow){
            // --- lookup input field with name: fieldname
                    // PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                    // CSS.escape not supported by IE, Chrome and Safari,
                    // CSS.escape is not necessary, there are no special characters in fieldname
            let el_input = tblRow.querySelector("[data-field=" + fieldname + "]");
            if(!!el_input){
                if(tblName === "teammember"){
                    const pk_int = get_dict_value(dict, ["pk"])
                    const ppk_int = get_dict_value(dict, ["ppk"])
                    const code_value = get_dict_value(dict, ["code"])

                    el_input.setAttribute("data-pk", pk_int)
                    el_input.setAttribute("data-ppk", ppk_int)
                    el_input.setAttribute("data-value", code_value)

                    el_input.value = code_value

                    // don't upload employee when table is teammemeber - must select abscat first
                   // let upload_dict = {id: id_dict};
                    //upload_dict[fieldname] = dict;
                    //UploadChanges(upload_dict, url_teammember_upload);

                } else {

                    // store employee_pk in addnewRow, upload when absence cat is also entered
                    let upload_dict = {"id": mod_dict["id"]};
                    if (mode ==="remove"){
                        // remove current employee from teammemember, is removed when {employee: {update: true} without pk
                        // fieldname ==="employee" or "replacement"
                        upload_dict[fieldname] = {"update": true}
                    } else {
                        const employee_dict = mod_dict["employee"]
                        //console.log("employee_dict: ", employee_dict );
                        upload_dict["employee"] = {"pk": employee_dict["id"]["pk"], "ppk": employee_dict["id"]["ppk"], "update": true}
                    }

                    UploadChanges(upload_dict, url_teammember_upload);
                }
            }  // if(!!el_input)
        }  // if(!!tblRow)
// ---  hide modal
        $("#id_mod_select_employee_function").modal("hide");
    } // ModEmployeeSave

//=========  ModEmployeeDeleteOpen  ================ PR2019-09-15
    function ModEmployeeDeleteOpen(tr_clicked, mode) {
        //console.log(" -----  ModEmployeeDeleteOpen   ----")

// get tblRow_id, pk and ppk from tr_clicked; put values in el_modemployee_body
        let el_modemployee_body = document.getElementById("id_mod_empl_del_body")
        el_modemployee_body.setAttribute("data-tblrowid", tr_clicked.id);
        el_modemployee_body.setAttribute("data-table", get_attr_from_el(tr_clicked, "data-table"));
        el_modemployee_body.setAttribute("data-pk", get_attr_from_el(tr_clicked, "data-pk"));
        el_modemployee_body.setAttribute("data-ppk", get_attr_from_el(tr_clicked, "data-ppk"));

// get employee name from el_empl_code
        const el_empl_code = tr_clicked.cells[0].children[0];
        const header_txt = get_attr_from_el_str(el_empl_code, "data-value");
        document.getElementById("id_mod_empl_del_header").innerText = header_txt;

// ---  show modal
        $("#id_mod_empl_del").modal({backdrop: true});

    };  // ModEmployeeDeleteOpen

//=========  ModEmployeeDeleteSave  ================ PR2019-08-08
    function ModEmployeeDeleteSave() {
        //console.log("========= ModEmployeeDeleteSave ===" );

    // ---  create id_dict
        const tblRow_id = document.getElementById("id_mod_empl_del_body").getAttribute("data-tblrowid")
        let tr_clicked = document.getElementById(tblRow_id)
        let id_dict = get_iddict_from_element(tr_clicked);

        if (!isEmpty(id_dict)){
            id_dict["delete"] = true

//  make tblRow red
            tr_clicked.classList.add(cls_error);

// ---  hide modal
            $('#id_mod_empl_del').modal('hide');

            const upload_dict = {"id": id_dict};
            UploadChanges(upload_dict, url_employee_upload);

        }  // if (!isEmpty(id_dict))
    } // ModEmployeeDeleteSave

//========= ModEmployeeFillSelectTableEmployee  ============= PR2019-08-18
    function ModEmployeeFillSelectTableEmployee() {
        //console.log( "=== ModEmployeeFillSelectTableEmployee ");
        //console.log( "selected.employee_pk: ", selected.employee_pk, typeof selected.employee_pk);

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = loc.No_employees + ":";

        let tblBody = document.getElementById("id_MSEF_tbody_select");
        tblBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_dict_value(item_dict, ["code", "value"], "");

// --- validate if employee can be added to list
                const is_inactive = get_dict_value(item_dict, ["inactive", "value"])
                const empl_datefirst = get_dict_value(item_dict, ["datefirst", "value"])
                const empl_datelast =  get_dict_value(item_dict, ["datelast", "value"])
                const within_range = period_within_range_iso(empl_datefirst, empl_datelast, mod_dict.tm_datefirst, mod_dict.tm_datelast)
                const add_to_list = (!is_inactive && within_range && pk_int !== selected.employee_pk);
                if (add_to_list){
//- insert tblBody row
                    let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE:  tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);
//- add hover to tblBody row
                    tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});
//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {ModEmployeeSelect(tblRow)}, false )
// - add first td to tblRow.
                    let td = tblRow.insertCell(-1);
// --- add a element to td, necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected.employee_pk){
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // ModEmployeeFillSelectTableEmployee


// +++++++++++++++++ MODAL FORM EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//=========  MFE_Open  ================  PR2020-06-06
    function MFE_Open(el_input) {
        //console.log(" -----  MFE_Open   ----")
        if(has_perm_add_edit_delete_employees){
    // ---  get info from tblRow
            const tblRow = get_tablerow_selected(el_input)
            const tblRow_employee_pk = get_attr_from_el(tblRow, "data-pk" )
            const tblRow_employee_ppk = get_attr_from_el(tblRow, "data-ppk" )
            const map_id = (tblRow) ? tblRow.id : null
            //console.log("map_id", map_id)
    // ---  create mod_MFE_dict
            mod_MFE_dict = deepcopy_dict(get_mapdict_from_datamap_by_id(employee_map, map_id))
            //console.log("mod_MFE_dict", mod_MFE_dict)
    // ---  update selected.employee_pk
            selected.employee_pk = mod_MFE_dict.id;
    // ---  put employee_code in header
            const header_text = (mod_MFE_dict.code) ? mod_MFE_dict.code : loc.Employee;
            document.getElementById("id_MFE_hdr_employee").innerText = header_text;
    // ---  fill functioncode select options. t_FillOptionsAbscatFunction is also used for functioncodes
            // TODO add fill wagecodes
            const el_MFE_functioncode = document.getElementById("id_MFE_functioncode");
            //  function t_FillOptionsAbscatFunction(loc, tblName, el_select, data_map, selected_pk) {
            t_FillOptionsAbscatFunction(loc, "functioncode", el_MFE_functioncode, functioncode_map, mod_MFE_dict.functioncode);
            const el_MFE_paydatecode = document.getElementById("id_MFE_paydatecode");
            t_FillOptionsAbscatFunction(loc, "paydatecode", el_MFE_paydatecode, paydatecode_map, mod_MFE_dict.paydatecode);
    // ---  employee form
            let form_elements = el_MFE_div_form_controls.querySelectorAll(".form-control")
            for (let i = 0, el, fldName, value; el = form_elements[i]; i++) {
                el = form_elements[i];
                if(el){
                    fldName = get_attr_from_el(el, "data-field");
                    if(["workhoursperweek", "workminutesperday"].indexOf(fldName) > -1){
                        value = mod_MFE_dict[fldName] / 60;
                    } else if (fldName === "leavedays"){
                        value = mod_MFE_dict[fldName] / 1440;
                    } else  if(["functioncode", "wagecode", "paydatecode"].indexOf(fldName) > -1){
                        value = mod_MFE_dict[mapped_employee_fields[fldName]];
                    } else {
                        value = mod_MFE_dict[fldName];
                    }
                    el.value = (value) ? value : null;
                };
            }

    // set focus to clicked field
            const fldName = get_attr_from_el(el_input, "data-field")
            let selected_element = null;
            if(fldName){
                let form_elements = el_MFE_div_form_controls.querySelectorAll(".form-control")
                for (let i = 0, el, len = form_elements.length; i < len; i++) {
                    el = form_elements[i]
                    const el_field = get_attr_from_el(el, "data-field")
                    if(el_field === fldName) {
                        selected_element = el;
                        break;
                    }
                }
            }
            if(!selected_element) { selected_element = document.getElementById("id_MFE_code")}
            set_focus_on_el_with_timeout(selected_element, 50)
    // hide delete btn when add-new
            add_or_remove_class(el_MFE_btn_delete, cls_hide, !map_id)

            MFE_validate_and_disable();
    // ---  show modal
            $("#id_mod_form_employee").modal({backdrop: true});
        }
    }  // MFE_Open

//=========  MFE_save  ================  PR2020-06-06
    function MFE_save(crud_mode) {
        //console.log(" -----  MFE_save  ----", crud_mode);
        //console.log( "mod_MFE_dict: ", mod_MFE_dict);

        const is_delete = (crud_mode === "delete")

        let upload_dict = {id: {table: 'employee'}}
        if(mod_MFE_dict.id) {
            upload_dict.id.pk = mod_MFE_dict.id;
            upload_dict.id.ppk = mod_MFE_dict.comp_id;
            upload_dict.id.mapid = mod_MFE_dict.mapid;
            if(is_delete) {
                upload_dict.id.delete = true;
            }
        } else {
            upload_dict.id.create = true;
        }
// ---  update_dict is to update row before response is back from server
        let update_dict = {}
// ---  loop through input elements
        let form_elements = el_MFE_div_form_controls.querySelectorAll(".form-control")
        for (let i = 0, el_input, len = form_elements.length; i < len; i++) {
            el_input = form_elements[i]
            if(el_input){
                const fldName = get_attr_from_el(el_input, "data-field");
                let new_value = null, old_value = null;
                if(["workhoursperweek", "workminutesperday", "leavedays"].indexOf(fldName) > -1){
                    const arr = get_number_from_input(loc, fldName, el_input.value);
                    new_value = arr[0];
                    old_value = mod_MFE_dict[fldName]
                } else if(["functioncode", "wagecode", "paydatecode"].indexOf(fldName) > -1){
                    new_value = (el_input.value) ? Number(el_input.value) : null;
                    old_value = mod_MFE_dict[ mapped_employee_fields[fldName]]
                } else {
                    new_value = (el_input.value) ? el_input.value : null;
                    old_value = mod_MFE_dict[fldName]
                }
                if (new_value !== old_value) {
                    upload_dict[fldName] = {value: new_value, update: true}
                    update_dict[fldName] = new_value;
                };
            };
        }

// - make tblRow red when delete or update existing tblRow
        const tblRow = document.getElementById(mod_MFE_dict.mapid)

        if(tblRow){
            if(is_delete){
                ShowClassWithTimeout(tblRow, cls_error)
            } else {
                RefreshTblRowNEW(tblRow, update_dict)
            }
        }
// ---  modal is closed by data-dismiss="modal"
        UploadChanges(upload_dict, url_employee_upload);
    }  // MFE_save

//=========  MFE_validate_and_disable  ================  PR2020-06-06 PR2020-09-11
    function MFE_validate_and_disable() {
        //console.log(" -----  MFE_validate_and_disable   ----")
        let disable_save_btn = false;
// ---  loop through input fields
        let form_elements = el_MFE_div_form_controls.querySelectorAll(".form-control")
        for (let i = 0, el_input; el_input = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el_input, "data-field")
            const el_msg = document.getElementById("id_MFE_err_" + fldName);
            if (el_input && el_msg){
                const value = el_input.value;
                if(["datefirst", "datelast"].indexOf(fldName) > -1){
// ---  set min max date of date fieds PR2020-10-18
                    const other_fldName = (fldName === "datefirst") ? "datelast" : "datefirst"
                    const min_max_attr = (fldName === "datefirst") ? "max" : "min"
                    const el_other = document.getElementById("id_MFE_" + other_fldName);
                    const el_other_value = (el_other) ? el_other.value : null;
                    el_input.setAttribute(min_max_attr, el_other_value);
                } else {
                    let msg_err = null;
                    if(["workhoursperweek", "workminutesperday", "leavedays"].indexOf(fldName) > -1){
                        const arr = get_number_from_input(loc, fldName, el_input.value);
                        msg_err = arr[1];
                    } else {
                         const caption = (fldName === "code") ? loc.Short_name :
                                        (fldName === "namelast") ? loc.Last_name :
                                        (fldName === "namefirst") ? loc.First_name :
                                        (fldName === "identifier") ? loc.ID_number :
                                        (fldName === "email") ? loc.Email_address :
                                        (fldName === "telephone") ? loc.Telephone :
                                        (fldName === "payrollcode") ? loc.Payroll_code : loc.This_field;
                        // field of code", "namelast" cannot be blank
                        if (["code", "namelast"].indexOf(fldName) > -1 &&
                            !value) {
                                msg_err = caption + loc.cannot_be_blank;
                        } else if (["code", "identifier", "payrollcode", "telephone", "payrollcode"].indexOf(fldName) > -1 &&
                            value.length > 24) {
                                msg_err = caption + loc.is_too_long_MAX24;
                        } else if (["namefirst", "namelast", "email"].indexOf(fldName) > -1 &&
                            value.length > 80) {
                                msg_err = caption + loc.is_too_long_MAX80;
                        } else if (["code", "identifier", "payrollcode", "email"].indexOf(fldName) > -1) {
                                msg_err = validate_duplicates(loc, "employee", fldName, caption, mod_MFE_dict.mapid, value)
                        }
                    }
    // ---  show / hide error message
                    el_msg.innerText = msg_err;
                    add_or_remove_class(el_msg, cls_hide, !msg_err)
                    if (msg_err){ disable_save_btn = true};
    // ---  make msg color black when no err on leavedays, show 'Leavedays_are_on_fulltime_basis'
                    if(fldName === "leavedays") {
                        add_or_remove_class(el_msg, "text-danger", (msg_err))
                        if (!msg_err) {msg_err = loc.Leavedays_are_on_fulltime_basis};
        }}}};
// ---  disable save button on error
        el_MFE_btn_save.disabled = disable_save_btn;
    }

//=========  validate_duplicates  ================ PR2020-09-11
    function validate_duplicates(loc, tblName, fldName, caption, selected_mapid, selected_code) {
        //console.log(" =====  validate_duplicates =====")
        //console.log("fldName", fldName)
        let msg_err = null;
        if (tblName && fldName && selected_code){
            const data_map = (tblName === "employee") ? employee_map : abscat_map;
            if (data_map.size){
                const selected_code_lc = selected_code.trim().toLowerCase()
    //--- loop through employee_map
                for (const [map_id, map_dict] of data_map.entries()) {
                    // skip current item
                    if(map_id !== selected_mapid) {
                        const value = (map_dict[fldName]) ? map_dict[fldName].trim().toLowerCase() : null
                        if(value && value === selected_code_lc){
                            msg_err = caption + " '" + selected_code + "'"
                            const is_inactive = (tblName === "employee") ? map_dict.inactive : map_dict.o_inactive;
                            if(is_inactive){
                                msg_err += loc.already_exists_but_inactive;
                            } else {
                                msg_err += loc.already_exists;
                            }
                            break;
        }}}}};
        return msg_err;
    }

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++  MODAL ABSENCE  +++++++++++++++++++++++++++++++++++++++++

//=========  ModAbsence_Open  ================  PR2020-05-14 PR2020-09-10
    function MAB_Open(el_input) {
        //console.log(" =====  MAB_Open =====")
        // when el_input doesn't exist it is a new absence, called by submenu_btn
        // MAB_Save adds 'create' to 'id' when  mod_MAB_dict.teammember.pk = null

        mod_MAB_dict = {};

// ---  get info from el_input and tblRow --------------------------------
        const tblRow = get_tablerow_selected(el_input)
        const data_pk = get_attr_from_el(tblRow, "data-pk");
        const map_id = (tblRow) ? tblRow.id : null;
        const fldName = get_attr_from_el(el_input, "data-field");

// --- get info from data_maps
        // get info from absence_map, not teammember_map
        const map_dict = get_mapdict_from_datamap_by_id(absence_map, map_id);
        selected.teammember_pk = (map_dict.id) ? map_dict.id : null;
        const is_addnew = isEmpty(map_dict);

        //console.log("map_dict", map_dict)
        if (is_addnew){
            mod_MAB_dict = {create: true};
            // ---  reset Inputboxes
            el_MAB_input_employee.value = null;
            el_MAB_input_abscat.value = null
            el_MAB_input_replacement.value = null;
        } else {
            mod_MAB_dict.map_id = map_dict.mapid;
            mod_MAB_dict.teammember_pk = map_dict.id;
            mod_MAB_dict.teammember_ppk = map_dict.t_id;

            mod_MAB_dict.order_pk = map_dict.o_id;
            mod_MAB_dict.order_ppk = map_dict.c_id;
            mod_MAB_dict.order_code = (map_dict.o_code) ? map_dict.o_code.replace(/~/g,"") : null;

            mod_MAB_dict.datefirst = (map_dict.s_df) ? map_dict.s_df : ""; // el_input = "" when empty
            mod_MAB_dict.datelast = (map_dict.s_dl) ? map_dict.s_dl : ""; // el_input = "" when empty
            mod_MAB_dict.oneday_only = !!(map_dict.s_df && map_dict.s_dl && map_dict.s_df === map_dict.s_dl)

            mod_MAB_dict.offsetstart = (map_dict.sh_os_arr) ? map_dict.sh_os_arr[0] : null;
            mod_MAB_dict.offsetend = (map_dict.sh_oe_arr) ? map_dict.sh_oe_arr[0] : null;
            mod_MAB_dict.breakduration = (map_dict.sh_bd_arr) ? map_dict.sh_bd_arr[0] : null;
            mod_MAB_dict.timeduration = (map_dict.sh_td_arr) ? map_dict.sh_td_arr[0] : null;

            mod_MAB_dict.employee_pk = map_dict.e_id;
            mod_MAB_dict.employee_ppk = map_dict.comp_id;
            mod_MAB_dict.employee_code =  (map_dict.e_code) ? map_dict.e_code : null;
            mod_MAB_dict.employee_datefirst = map_dict.e_df;
            mod_MAB_dict.employee_datelast = map_dict.e_dl;
            mod_MAB_dict.employee_workminutesperday = map_dict.e_workminutesperday;

            mod_MAB_dict.replacement_pk = map_dict.rpl_id;
            mod_MAB_dict.replacement_ppk = map_dict.comp_id;
            mod_MAB_dict.replacement_code = (map_dict.rpl_code) ? map_dict.rpl_code : null;
            mod_MAB_dict.replacement_datefirst = map_dict.rpl_df;
            mod_MAB_dict.replacement_datelast = map_dict.rpl_dl;

            mod_MAB_dict.modat = map_dict.modat;
            mod_MAB_dict.modby_usr = map_dict.modby_usr;

            // changes of the fields below cannot be stored in element,
            // original values are stored as 'old_order_pk' etc, changed values are stored in 'order_pk' etc
            mod_MAB_dict.old_order_pk = mod_MAB_dict.order_pk;
            mod_MAB_dict.old_datefirst = mod_MAB_dict.datefirst;
            mod_MAB_dict.old_datelast = mod_MAB_dict.datelast;
            mod_MAB_dict.old_offsetstart = mod_MAB_dict.offsetstart;
            mod_MAB_dict.old_offsetend = mod_MAB_dict.offsetend;
            mod_MAB_dict.old_breakduration = mod_MAB_dict.breakduration;
            mod_MAB_dict.old_timeduration = mod_MAB_dict.timeduration;
            mod_MAB_dict.old_employee_pk = mod_MAB_dict.employee_pk;
            mod_MAB_dict.old_replacement_pk = mod_MAB_dict.replacement_pk;
// ---  update Inputboxes
            el_MAB_input_employee.value = mod_MAB_dict.employee_code;
            el_MAB_input_abscat.value = mod_MAB_dict.order_code
            el_MAB_input_replacement.value =  mod_MAB_dict.replacement_code;
            el_MAB_modifiedby.innerText = display_modifiedby(loc, mod_MAB_dict.modat, mod_MAB_dict.modby_usr);
        }
        //console.log("mod_MAB_dict", deepcopy_dict(mod_MAB_dict))
// --- when no employee selected: fill select table employee
        // MAB_FillSelectTable("employee") is called by MAB_GotFocus
// ---  put employee_code in header
        const header_text = (selected.teammember_pk) ? loc.Absence + " " + loc.of + " " + mod_MAB_dict.employee_code : loc.Absence;
        document.getElementById("id_MAB_hdr_absence").innerText = header_text;
// --- hide input element employee, when employee selected
        show_hide_element_by_id("id_MAB_div_input_employee", !selected.teammember_pk)
// --- hide delete button when no employee selected
        add_or_remove_class(document.getElementById("id_MAB_btn_delete"), cls_hide, !selected.teammember_pk)

        MAB_UpdateDatefirstlastInputboxes();
        MAB_UpdateOffsetInputboxes();
// ---  enable btn_save and input elements
        MAB_BtnSaveEnable();
// ---  set focus to input_element, to abscat if not defined
        const el_fldName = mapped_absence_fields[fldName]
        const el_focus_id = (is_addnew) ? "id_MAB_input_employee" :
                            (el_fldName === "employee") ? "id_MAB_input_abscat" :
                            (el_fldName) ? "id_MAB_input_" + el_fldName : "id_MAB_input_abscat";
        set_focus_on_el_with_timeout(document.getElementById(el_focus_id), 50)
// ---  select table is filled in MAB_GotFocus, but is not called when clicked on other fields then input_employee or input_abscat
        if (["datefirst", "datelast", "offsetstart", "offsetend", "breakduration", "timeduration"].indexOf(fldName) > -1) {
            MAB_FillSelectTable("abscat", mod_MAB_dict.order_pk);
        }
// ---  show modal
        $("#id_mod_absence").modal({backdrop: true});
    }  // MAB_Open

//=========  ModAbsence_Save  ================  PR2020-05-17 PR2020-09-09 PR2021-01-06
    function MAB_Save(crud_mode) {
        //console.log(" -----  MAB_Save  ----", crud_mode);
        //console.log( "mod_MAB_dict: ", mod_MAB_dict);

// ---  get mode and teammember_pk
        const is_delete = (crud_mode === "delete");
        const mode = (!mod_MAB_dict.teammember_pk) ? "create" : (is_delete) ? "delete" : "update";
        const upload_dict = {shiftoption: "isabsence", mode: mode};
        upload_dict.teammember_pk = (mod_MAB_dict.teammember_pk) ? mod_MAB_dict.teammember_pk : null;

// ---  update_dict is to update row before response is back from server
        let update_dict = {
            e_code: mod_MAB_dict.employee_code,
            //rpl_code: mod_MAB_dict.rpl_code,  // only in shifts table
            //c_code: mod_MAB_dict.c_code, // only in shifts table
            o_code: mod_MAB_dict.order_code,
            //t_code: mod_MAB_dict.t_code, // only in shifts table
            s_df: mod_MAB_dict.datefirst, // only in absence table
            s_dl: mod_MAB_dict.datelast,// only in absence table
            //tm_df: mod_MAB_dict.tm_df, // only in shifts table
            //tm_dl: mod_MAB_dict.tm_dl, // only in shifts table
            //tm_dl: mod_MAB_dict.tm_dl, // only in shifts table
            sh_td_arr: mod_MAB_dict.sh_td_arr  // only in absence table
            }

        if (mod_MAB_dict.order_pk !== mod_MAB_dict.old_order_pk) {
            // PR2021-01-06 was:
            //upload_dict.order = {pk: mod_MAB_dict.order_pk,
            //                        ppk: mod_MAB_dict.order_ppk,
            //                        code: mod_MAB_dict.order_code,
            //                        update: true};
            upload_dict.order_pk = mod_MAB_dict.order_pk;
            update_dict.o_code = mod_MAB_dict.order_code;
        }
        if (el_MAB_datefirst.value !== mod_MAB_dict.old_datefirst) {
            // PR2021-01-06 was: upload_dict.datefirst = {value: el_MAB_datefirst.value, update: true};
            upload_dict.datefirst = el_MAB_datefirst.value;
            update_dict.s_df = el_MAB_datefirst.value;
        }
        if (el_MAB_datelast.value !== mod_MAB_dict.old_datelast) {
            // PR2021-01-06 was: upload_dict.datelast = {value: el_MAB_datelast.value, update: true}
            upload_dict.datelast = el_MAB_datelast.value;
            update_dict.s_dl = el_MAB_datelast.value;
        }
        if (mod_MAB_dict.offsetstart !== mod_MAB_dict.old_offsetstart) {
            // PR2021-01-06 was: upload_dict.offsetstart = {value: mod_MAB_dict.offsetstart, update: true};
            upload_dict.offsetstart = mod_MAB_dict.offsetstart;
            update_dict.sh_os_arr = [mod_MAB_dict.offsetstart];
        }
        if (mod_MAB_dict.offsetend !== mod_MAB_dict.old_offsetend) {
            // PR2021-01-06 was: upload_dict.offsetend = {value: mod_MAB_dict.offsetend, update: true};
            upload_dict.offsetend = mod_MAB_dict.offsetend;
            update_dict.sh_oe_arr = [mod_MAB_dict.offsetend];
        }
        if (mod_MAB_dict.breakduration !== mod_MAB_dict.old_breakduration) {
            // PR2021-01-06 was: upload_dict.breakduration = {value: mod_MAB_dict.breakduration, update: true};
            upload_dict.breakduration = mod_MAB_dict.breakduration;
            update_dict.sh_bd_arr = [mod_MAB_dict.breakduration];
        }
        if (mod_MAB_dict.timeduration !== mod_MAB_dict.old_timeduration) {
            // PR2021-01-06 was: upload_dict.timeduration = {value: mod_MAB_dict.timeduration, update: true};
            upload_dict.timeduration = mod_MAB_dict.timeduration;
            update_dict.sh_td_arr = [mod_MAB_dict.timeduration];
        }
        if (mod_MAB_dict.employee_pk && mod_MAB_dict.employee_pk !== mod_MAB_dict.old_employee_pk) {
            // PR2021-01-06 was: upload_dict.employee = {pk: mod_MAB_dict.employee_pk,
            //                        ppk: mod_MAB_dict.employee_ppk,
            //                        update: true};
            upload_dict.employee_pk = mod_MAB_dict.employee_pk;
        }
        if (mod_MAB_dict.replacement_pk && mod_MAB_dict.replacement_pk !== mod_MAB_dict.old_replacement_pk) {
            // PR2021-01-06 was: upload_dict.replacement = {pk: mod_MAB_dict.replacement_pk,
            //                        ppk: mod_MAB_dict.replacement_ppk,
            //                        update: true};
            upload_dict.replacement_pk = mod_MAB_dict.replacement_pk;
        }
// - make tblRow red when delete or update existing tblRow
        const tblRow = document.getElementById(mod_MAB_dict.map_id)
        if(tblRow){
            if(is_delete){
                ShowClassWithTimeout(tblRow, cls_error)
            } else {
                RefreshTblRowNEW(tblRow, update_dict)
            }
        }

// ---  UploadChanges
        UploadChanges(upload_dict, url_teammember_upload);
    }  // MAB_Save

//========= MAB_FillSelectTable  ============= PR2020-05-17 PR2020-08-08 PR2020-10-19
    function MAB_FillSelectTable(tblName, selected_pk) {
        //console.log( "=== MAB_FillSelectTable === ", tblName);
        //console.log( "selected_pk", selected_pk);

        let tblBody = document.getElementById("id_MAB_tblbody_select");
        tblBody.innerText = null;

        const is_tbl_replacement = (tblName === "replacement");
        const is_tbl_abscat = (tblName === "abscat");

        const hdr_text = (is_tbl_abscat) ? loc.Absence_categories : (is_tbl_replacement) ? loc.Replacement_employee : loc.Employees;
        document.getElementById("id_MAB_hdr_selecttable").innerText = hdr_text;

        const data_map = (is_tbl_abscat) ? abscat_map : employee_map;
        console.log( "data_map", data_map);
        let row_count = 0
        if (data_map.size){
//--- loop through employee_map / abscat_map
            for (const [map_id, map_dict] of data_map.entries()) {
                const pk_int = map_dict.id;
                const ppk_int = (is_tbl_abscat) ? map_dict.c_id : map_dict.comp_id;
                let code_value = (is_tbl_abscat) ? map_dict.o_code : map_dict.code;
                // remove tilde from abscat PR2020-08-14
                if (is_tbl_abscat && code_value.includes("~")){code_value = code_value.replace(/~/g,"")}
                const is_inactive = (is_tbl_abscat) ? map_dict.o_inactive : map_dict.inactive;
// --- validate if employee can be added to list
                // skip current employee when filling replacement list
                let skip_row = (is_inactive) || (is_tbl_replacement && pk_int === mod_MAB_dict.employee_pk);

                // <PERMIT> PR2020-11-12
                // when has_allowed_customers_or_orders:
                // - only employees of allowed customers and allowed orders can be made absent
                // - all employees can be selected as replacemenet
                // - skip when abscat_map
                if (!skip_row && !is_tbl_abscat && !is_tbl_replacement ){
                    if (has_allowed_customers || has_allowed_orders) {
                        skip_row = (!map_dict.allowed) ;
                    }
                }
                if (!skip_row){
//- insert tblBody row
                    let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);
// -  highlight selected row
                    if (selected_pk && pk_int === selected_pk){
                        tblRow.classList.add(cls_selected)
                    }
//- add hover to tblBody row
                    add_hover(tblRow);
//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {MAB_SelectRowClicked(tblRow, tblName)}, false )
// - add first td to tblRow.
                    let td = tblRow.insertCell(-1);
// --- add a element to td, necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                    row_count += 1;
                } // if (!is_inactive)
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
//--- when no items found: show 'select_employee_none'
        if(!row_count){
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            const inner_text = (is_tbl_abscat) ? loc.No_absence_categories : (is_tbl_replacement) ? loc.No_replacement_employees : loc.No_employees;
            td.innerText = inner_text;
        }
    } // MAB_FillSelectTable

//=========  MAB_InputElementKeyup  ================ PR2020-05-15 PR2020-10-26
    function MAB_InputElementKeyup(tblName, el_input) {
        //console.log( "=== MAB_InputElementKeyup  ", tblName)
        //console.log( "mod_MAB_dict", deepcopy_dict(mod_MAB_dict));
        const new_filter = el_input.value;

        let tblBody_select = document.getElementById("id_MAB_tblbody_select");
        const len = tblBody_select.rows.length;
        if (!new_filter) {
 // remove replacement / employee when input box is made empty PR2020-10-26
            if(tblName === "employee"){
                MAB_SetEmployeeDict(null);
            } else if(tblName === "replacement"){
                MAB_SetReplacementDict(null);
            }
             MAB_FillSelectTable(tblName, null);

        } else if (new_filter && len){
// ---  filter select rows
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
// ---  get pk of selected item (when there is only one row in selection)
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (only_one_selected_pk) {
// ---  highlight clicked row
                t_HighlightSelectedTblRowByPk(tblBody_select, only_one_selected_pk)
// ---  put value in input box, put employee_pk in mod_MAB_dict, set focus to select_abscatselect_abscat
// ---  put value of only_one_selected_pk in mod_MAB_dict and update selected.teammember_pk
                if(tblName === "employee"){
                    MAB_SetEmployeeDict(only_one_selected_pk);
// ---  put code_value in el_input_employee
                    el_MAB_input_employee.value = mod_MAB_dict.employee_code;
// ---  remove replacement employee when it is the same as the new employee
                    if(mod_MAB_dict.employee_pk === mod_MAB_dict.replacement_pk){
                         MAB_SetReplacementDict(null);
                        el_MAB_input_replacement.value = null;
                    }
// ---  update date input elements
                    MAB_UpdateDatefirstlastInputboxes();
// ---  put hours in mod_MAB_dict.timeduration and el_MAB_timeduration
                    if (mod_MAB_dict.employee_workminutesperday){
                        mod_MAB_dict.timeduration = mod_MAB_dict.employee_workminutesperday;
                        const display_text = display_duration (mod_MAB_dict.timeduration, loc.user_lang);
                        el_MAB_timeduration.innerText = display_text;
                    }
// ---  put employee_code in header
                    const header_text = (mod_MAB_dict.employee_code) ? loc.Absence + " " + loc.of + " " + mod_MAB_dict.employee_code : loc.Absence;
                    document.getElementById("id_MAB_hdr_absence").innerText = header_text
// ---  enable el_shift, set focus to el_MAB_input_abscat
                    set_focus_on_el_with_timeout(el_MAB_input_abscat, 50)

                } else if(tblName === "abscat"){
                    MAB_SetAbscatDict(only_one_selected_pk);
                    el_MAB_input_abscat.value = mod_MAB_dict.order_code;
                    set_focus_on_el_with_timeout(el_MAB_input_replacement, 50)

                } else if(tblName === "replacement"){
                    MAB_SetReplacementDict(only_one_selected_pk);
                    el_MAB_input_replacement.value = mod_MAB_dict.replacement_code;
                    set_focus_on_el_with_timeout(el_MAB_datefirst, 50)
                }
            }  //  if (!!selected_pk) {
        }
    // ---  enable btn_save and input elements
        MAB_BtnSaveEnable();
    }  // MAB_InputElementKeyup

//=========  MAB_SelectRowClicked  ================ PR2020-05-15
    function MAB_SelectRowClicked(tblRow, tblName) {
        //console.log( "===== MAB_SelectRowClicked ========= ", tblName);
// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)
        if(tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            const selected_pk = get_attr_from_el_str(tblRow, "data-pk");
// ---  put value in input box, put employee_pk in mod_MAB_dict, set focus to select_abscatselect_abscat
            if (tblName === "employee") {
// ---  put value of data-pk in mod_MAB_dict
                MAB_SetEmployeeDict(selected_pk);
// ---  put code_value in el_input_employee
                el_MAB_input_employee.value = mod_MAB_dict.employee_code
// ---  remove replacement employee when it is the same as the new employee
                if(mod_MAB_dict.employee_pk === mod_MAB_dict.replacement_pk){
                     MAB_SetReplacementDict(null);
                    el_MAB_input_replacement.value = null;
                }

// ---  update min max in date fields (
                MAB_UpdateDatefirstlastInputboxes();
// ---  put hours in mod_MAB_dict.timeduration and el_MAB_timeduration
                if (mod_MAB_dict.employee_workminutesperday){
                    mod_MAB_dict.timeduration = mod_MAB_dict.employee_workminutesperday;
                    const display_text = display_duration (mod_MAB_dict.timeduration, loc.user_lang);
                    el_MAB_timeduration.innerText = display_duration (mod_MAB_dict.timeduration, loc.user_lang);
                }
// ---  put employee_code in header
                const header_text = (mod_MAB_dict.employee_code) ? loc.Absence + " " + loc.of + " " + mod_MAB_dict.employee_code : loc.Absence;
                document.getElementById("id_MAB_hdr_absence").innerText = header_text
// --- fill select table abscat
                // MAB_FillSelectTable is called by MAB_GotFocus
// ---  et focus to el_shift
                set_focus_on_el_with_timeout(el_MAB_input_abscat, 50)

            } else if (tblName === "abscat") {
// ---  put value of data-pk in mod_MAB_dict
                MAB_SetAbscatDict(selected_pk);
// ---  put code_value in el_input_employee
                el_MAB_input_abscat.value = mod_MAB_dict.order_code;
// --- fill select table replacement
                // MAB_FillSelectTable is called by MAB_GotFocus
// ---  et focus to el_MAB_input_replacement
                set_focus_on_el_with_timeout(el_MAB_input_replacement, 50)
            } else if (tblName === "replacement") {
// ---  put value of data-pk in mod_MAB_dict
                MAB_SetReplacementDict(selected_pk)
// ---  put code_value in el_input_replacement
                el_MAB_input_replacement.value = mod_MAB_dict.replacement_code
// ---  et focus to el_MAB_datefirst
                set_focus_on_el_with_timeout(el_MAB_datefirst, 50)
            }
// ---  enable btn_save and input elements
            MAB_BtnSaveEnable();
        }  // if(!!tblRow) {
    }  // MAB_SelectRowClicked

//=========  MAB_GotFocus  ================ PR2020-05-17 PR2020-09-09 PR2020-10-26
    function MAB_GotFocus (tblName, el_input) {
        //console.log(" =====  MAB_GotFocus  ===== ", tblName)
        if (tblName === "employee") {
            //el_MAB_input_employee.value = null;
            //el_MAB_input_abscat.value = null
            //document.getElementById("id_MAB_msg_input_datefirstlast").innerText = null;

            el_MAB_input_employee.value = (mod_MAB_dict.employee_code) ? mod_MAB_dict.employee_code : null;
            MAB_FillSelectTable(tblName, mod_MAB_dict.employee_pk);
        } else if (tblName === "replacement") {
            el_MAB_input_replacement.value = (mod_MAB_dict.replacement_code) ? mod_MAB_dict.replacement_code : null;
            MAB_FillSelectTable(tblName, mod_MAB_dict.replacement_pk);
        } else if (tblName === "abscat") {
            el_MAB_input_abscat.value = (mod_MAB_dict.order_code) ? mod_MAB_dict.order_code : null;
            MAB_FillSelectTable(tblName, mod_MAB_dict.order_pk);
        }

    }  // MAB_GotFocus

//=========  MAB_UpdateDatefirstlastInputboxes  ================ PR2020-05-17 PR2020-09-09
    function MAB_UpdateDatefirstlastInputboxes(){
        //console.log( " --- MAB_UpdateDatefirstlastInputboxes --- ");
        //console.log( "mod_MAB_dict", mod_MAB_dict);
        // absence datefirst / datelast are stored in scheme.datefirst / datelast

// set msg when employee has last day in service
        const el_msg = document.getElementById("id_MAB_msg_input_datefirstlast")
        add_or_remove_class(el_msg, cls_hide, !mod_MAB_dict.employee_datelast)
        // PR2020-08-02 was: format_date_iso (mod_MAB_dict.employee_datelast, loc.months_long, loc.weekdays_long, false, false, loc.user_lang)
        const date_formatted = format_dateISO_vanilla (loc, mod_MAB_dict.employee_datelast, true, false, true);
        el_msg.innerText = (mod_MAB_dict.employee_datelast) ? mod_MAB_dict.employee_code + loc.is_in_service_thru + date_formatted + "." : null;

        el_MAB_datefirst.value = (mod_MAB_dict.datefirst) ? mod_MAB_dict.datefirst : null;
        el_MAB_datelast.value = (mod_MAB_dict.datelast) ? mod_MAB_dict.datelast : null;

        // in MAB_Open:  mod_MAB_dict.oneday_only = (mod_MAB_dict.datefirst && mod_MAB_dict.datelast && mod_MAB_dict.datefirst === mod_MAB_dict.datelast)
        el_MAB_oneday.checked = mod_MAB_dict.oneday_only;
        el_MAB_datelast.readOnly = mod_MAB_dict.oneday_only;
        if(el_MAB_datefirst.value && el_MAB_datelast.value && el_MAB_datelast.value < el_MAB_datefirst.value)  {
            el_MAB_datelast.value = el_MAB_datefirst.value;
        }
        cal_SetDatefirstlastMinMax(el_MAB_datefirst, el_MAB_datelast, mod_MAB_dict.employee_datefirst, mod_MAB_dict.employee_datelast, mod_MAB_dict.oneday_only);
    }  // MAB_UpdateDatefirstlastInputboxes

//=========  MAB_DateFirstLastChanged  ================ PR2020-07-14
    function MAB_DateFirstLastChanged(el_input) {
        //console.log(" =====  MAB_DateFirstLastChanged   ======= ");
        if(el_input){
            const fldName = get_attr_from_el(el_input, "data-field")
        //console.log("fldName", fldName);
            if (fldName === "oneday") {
                // set period_datelast to datefirst
                if (el_MAB_oneday.checked) {
                    mod_MAB_dict.datelast = el_MAB_datefirst.value
                    el_MAB_datelast.value = el_MAB_datefirst.value
                };
                el_MAB_datelast.readOnly = el_MAB_oneday.checked;
            } else if (fldName === "datelast") {
                mod_MAB_dict.datelast = el_MAB_datelast.value
                // set datelast min_value to datefirst.value, remove when blank
                add_or_remove_attr (el_MAB_datelast, "min", (!!el_MAB_datefirst.value), el_MAB_datefirst.value);
                // dont set datefirst max_value, change datelast instead
            } else if (fldName === "datefirst") {
                mod_MAB_dict.datefirst = el_MAB_datefirst.value
                if ( (el_MAB_oneday.checked) ||
                     (el_MAB_datefirst.value && el_MAB_datelast.value && el_MAB_datefirst.value > el_MAB_datelast.value) ) {
                    mod_MAB_dict.datelast = el_MAB_datefirst.value
                    el_MAB_datelast.value = el_MAB_datefirst.value
                }
                // set datelast min_value to datefirst.value, remove when blank
                add_or_remove_attr (el_MAB_datelast, "min", (!!el_MAB_datefirst.value), el_MAB_datefirst.value);
            }
        }
    }  // MAB_DateFirstLastChanged

//=========  MAB_TimepickerOpen  ================ PR2020-03-21
    function MAB_TimepickerOpen(el_input) {
        //console.log("=== MAB_TimepickerOpen ===");
        //console.log("mod_MAB_dict", mod_MAB_dict);
        // disabled when no employee or no abscat selected
        const is_disabled = (!mod_MAB_dict.employee_pk || !mod_MAB_dict.order_pk);
        if(!is_disabled){
// ---  create tp_dict
            const fldName = get_attr_from_el(el_input, "data-field");
            //console.log("fldName", fldName);
            const rosterdate = null; // keep rosterdate = null, to show 'current day' instead of Dec 1

            const cur_offset = mod_MAB_dict[fldName]
            const minmax_offset = mtp_calc_minmax_offset_values(
                fldName, mod_MAB_dict.offsetstart, mod_MAB_dict.offsetend, mod_MAB_dict.breakduration, mod_MAB_dict.timeduration, true);
            const is_ampm = (loc.timeformat === "AmPm")

            let tp_dict = { field: fldName,
                            page: "TODO",
                            // id: id_dict,
                            //mod: calledby,
                            rosterdate: rosterdate,
                            offset: cur_offset,
                            minoffset: minmax_offset[0],
                            maxoffset: minmax_offset[1],
                            isampm: is_ampm,
                            quicksave: is_quicksave
                           };
    // ---  create st_dict
            const show_btn_delete = true;
            const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
                    const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                                   (fldName === "timeduration") ? loc.Absence_hours : null;
            let st_dict = { url_settings_upload: url_settings_upload,
                            text_curday: loc.Current_day, text_prevday: loc.Previous_day, text_nextday: loc.Next_day,
                            txt_dateheader: txt_dateheader,
                            txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                            show_btn_delete: show_btn_delete
                            };
            //console.log("tp_dict", tp_dict);
            //console.log("st_dict", st_dict);
            mtp_TimepickerOpen(loc, el_input, MAB_TimepickerResponse, tp_dict, st_dict)
        }
    };  // MAB_TimepickerOpen

//=========  MAB_TimepickerResponse  ================
    function MAB_TimepickerResponse(tp_dict){
        //console.log( " === MAB_TimepickerResponse ");
        // put new value from modTimepicker in ModShift PR2019-11-24
        //console.log( "tp_dict: ", tp_dict);
        const fldName = tp_dict.field;
        const new_offset = tp_dict.offset;

        mod_MAB_dict[fldName] = new_offset;

        //console.log( "---new ", offset_start , offset_end, break_duration, time_duration);
        if (fldName === "timeduration") {
            if(!!new_offset){
                mod_MAB_dict.offsetstart = null;
                mod_MAB_dict.offsetend = null;
                mod_MAB_dict.breakduration = 0;
            };
        } else  {
            if (mod_MAB_dict.offsetstart != null && mod_MAB_dict.offsetend != null) {
                const break_duration = (!!mod_MAB_dict.breakduration) ? mod_MAB_dict.breakduration : 0;
                mod_MAB_dict.timeduration = mod_MAB_dict.offsetend - mod_MAB_dict.offsetstart - break_duration;
            } else {
                mod_MAB_dict.timeduration = 0
            }
        }

        MAB_UpdateOffsetInputboxes();
    } // MAB_TimepickerResponse

//=========  MAB_BtnSaveEnable  ================ PR2020-08-08 PR2020-10-19
    function MAB_BtnSaveEnable(){
        //console.log( " --- MAB_BtnSaveEnable --- ");

// --- make input abscat readOnly, only when no employee selected
        const no_employee = (!mod_MAB_dict.employee_pk);
        const no_abscat = (!mod_MAB_dict.order_pk);
        const is_disabled = (no_employee || no_abscat);

        el_MAB_input_abscat.readOnly = no_employee;
        el_MAB_input_replacement.readOnly = is_disabled;

// --- enable save button
        el_MAB_btn_save.disabled = is_disabled;
        el_MAB_datefirst.readOnly = is_disabled;
        el_MAB_datelast.readOnly = (is_disabled || mod_MAB_dict.oneday_only);
        el_MAB_oneday.disabled = is_disabled;

// --- make time fields background grey when is_disabled
        add_or_remove_class(el_MAB_offsetstart, cls_selected, is_disabled)
        add_or_remove_class(el_MAB_offsetend, cls_selected, is_disabled)
        add_or_remove_class(el_MAB_breakduration, cls_selected, is_disabled)
        add_or_remove_class(el_MAB_timeduration, cls_selected, is_disabled)
    }  // MAB_BtnSaveEnable

//========= MAB_UpdateOffsetInputboxes  ============= PR2020-08-08
    function MAB_UpdateOffsetInputboxes() {
        //console.log( " ----- MAB_UpdateOffsetInputboxes ----- ");
        el_MAB_offsetstart.innerText = display_offset_time ({timeformat: loc.timeformat, user_lang: loc.user_lang}, mod_MAB_dict.offsetstart, false, false)
        el_MAB_offsetend.innerText = display_offset_time ({timeformat: loc.timeformat, user_lang: loc.user_lang}, mod_MAB_dict.offsetend, false, false)
        el_MAB_breakduration.innerText = display_duration (mod_MAB_dict.breakduration, loc.user_lang)
        el_MAB_timeduration.innerText =  display_duration (mod_MAB_dict.timeduration, loc.user_lang)
    }  // MAB_UpdateOffsetInputboxes

//========= MAB_SetEmployeeDict  ============= PR2020-09-09
    function MAB_SetEmployeeDict(data_pk){
        //console.log( "=== MAB_SetEmployeeDict ===");
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", data_pk)
        mod_MAB_dict.employee_pk = map_dict.id;
        mod_MAB_dict.employee_ppk = map_dict.comp_id;
        mod_MAB_dict.employee_code = map_dict.code;
        mod_MAB_dict.employee_datefirst = map_dict.datefirst;
        mod_MAB_dict.employee_datelast = map_dict.datelast;
        mod_MAB_dict.employee_workminutesperday = map_dict.workminutesperday;
    }  // MAB_SetEmployeeDict

//========= MAB_SetReplacementDict  ============= PR2020-09-09
    function MAB_SetReplacementDict(data_pk){
        //console.log( "=== MAB_SetReplacementDict ===");
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", data_pk)
        mod_MAB_dict.replacement_pk = get_dict_value(map_dict, ["id"])
        mod_MAB_dict.replacement_ppk = get_dict_value(map_dict, ["comp_id"])
        mod_MAB_dict.replacement_code = get_dict_value(map_dict, ["code"])
        mod_MAB_dict.replacement_datefirst = get_dict_value(map_dict, ["datefirst"])
        mod_MAB_dict.replacement_datelast = get_dict_value(map_dict, ["datelast"])
    }  // MAB_SetReplacementDict

//========= MAB_SetAbscatDict  ============= PR2020-09-09
    function MAB_SetAbscatDict(data_pk){
        //console.log( "=== MAB_SetAbscatDict ===", data_pk);
        const abscat_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "abscat", data_pk)
        mod_MAB_dict.order_pk = get_dict_value(abscat_dict, ["id"])
        mod_MAB_dict.order_ppk = get_dict_value(abscat_dict, ["c_id"])
        // remove tilde from abscat PR2020-8-14
        mod_MAB_dict.order_code = (abscat_dict) ? (abscat_dict.o_code) ? abscat_dict.o_code.replace(/~/g,"") : null : null;
    }  // MAB_SetAbscatDict

// +++++++++++++++++  END OF MODAL ABSENCE  ++++++++++++++++++++++++++++++++++

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL SHIFT EMPLOYEE ++++++++++++++++++++++++++++++++++++
//=========  MSE_Open  ================ PR2019-10-28 PR2020-04-06
    function MSE_Open(el_input) {
        //console.log(" -----  MSE_Open   ----")
        //console.log("el_input", el_input)
        // when tblName = "teammember" function is called by absence table (or shifttable?)
        let tr_selected = get_tablerow_selected(el_input)
        const tblName = get_attr_from_el(tr_selected, "data-table")

        //console.log("tblName", tblName)
        mod_dict = {};
        let add_new_mode = true; // becomes false when data_map is found
        let is_absence = false;
        let clicked_rosterdate_iso = null, row_index = -1, weekday_index = null, selected_weekday_list = [];
        let calendar_datefirst = null, calendar_datelast = null;
        let employee_pk = null; //, employee_ppk = null, employee_code;
        let order_pk = null, order_ppk = null, order_code = null, customer_code = null;
        let scheme_dict = {}, scheme_pk = null, scheme_datefirst = null, scheme_datelast = null;
        let shift_dict = {}, shift_pk = null;
        let team_dict = {}, team_pk = null;
        let teammember_dict = {};
        let schemeitem_dict = {};

        if(tblName === "teammember"){

            order_pk = get_attr_from_el(el_input, "data-pk");
            order_ppk = get_attr_from_el(el_input, "data-ppk");
            order_code = get_attr_from_el(el_input, "data-value");

            employee_pk = get_attr_from_el(tr_selected, "data-employee_pk");
            const teammember_pk = get_attr_from_el(tr_selected, "data-pk");
            team_pk = get_attr_from_el(tr_selected, "data-ppk");

            is_absence = true;
            const field_dict = {pk: teammember_pk, ppk: team_pk, employee_pk: employee_pk}
            teammember_dict = MSE_get_teammember_dict(field_dict);

    // ---  GET TEAM ----------------------------------
            // team_map_dict = id: {pk: 2485, ppk: 1969, table: "team", isabsence: true}
            //                  scheme: {pk: 1969, ppk: 1448, code: "El Chami OT"}
            //                  code: {value: "El Chami OT", abbrev: "El ", title: "El Chami OT"}
            const team_map_dict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk)
            scheme_pk = get_dict_value(team_map_dict, ["id", "ppk"])
            const team_code = get_dict_value(team_map_dict, ["code", "value"])
            team_dict =  {pk: team_pk, ppk: scheme_pk, code: team_code}
    // ---  GET SCHEME ----------------------------------
            // scheme_map_dict = {pk: 1966
            //                  id: {pk: 1966, ppk: 1450, table: "scheme", isabsence: true}
            //                  billable: {override: false, billable: false, value: -1}
            //                  cat: {value: 0}
            //                  code: {value: "Giterson LSE"}
            //                  datefirst: {value: "2020-04-08", maxdate: "2020-04-10"}
            //                  datelast: {value: "2020-04-10", mindate: "2020-04-08"}
            //                  cycle: {value: 1}
            const scheme_map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", scheme_pk)

            order_pk = get_dict_value(scheme_map_dict, ["id", "ppk"])
            const scheme_code = get_dict_value(scheme_map_dict, ["code", "value"])
            scheme_datefirst = get_dict_value(scheme_map_dict, ["datefirst", "value"])
            scheme_datelast = get_dict_value(scheme_map_dict, ["datelast", "value"])
            const scheme_cycle = get_dict_value(scheme_map_dict, ["cycle", "value"])

            scheme_dict = { pk: scheme_pk,
                    ppk: order_pk,
                    table: "scheme",
                    shiftoption: "isabsence",
                    code: scheme_code,
                    datefirst: scheme_datefirst,
                    datelast: scheme_datelast,
                    cycle: scheme_cycle
                    }
    // ---  GET SHIFT ----------------------------------
            //  shift: {pk: "new19", ppk: 1970, table: "shift", mode: "create"}, code: "-", offsetstart: null}
    // --- fill shifts_list with map_dicts of shifts of this scheme
            let shifts_list = [];
            if(!!shift_map.size){
                for (const [map_id, dict] of shift_map.entries()) {
                    const row_scheme_pk = get_dict_value(dict, ["id", "ppk"]);
                    if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                    //console.log("ooooooooooooooooooooo dict")
            //console.log(dict)
                        shifts_list.push(Deepcopy_Calendar_Dict("shift", dict));
                        // put first shift in shift_dict
                        if(isEmpty(shift_dict)){
                            shift_pk = get_dict_value(dict, ["id", "pk"]);
                            const shift_code = get_dict_value(dict, ["code", "value"]);
                            const shift_offsetstart = get_dict_value(dict, ["offsetstart", "value"]);
                            const shift_offsetend = get_dict_value(dict, ["offsetend", "value"]);
                            const shift_breakduration = get_dict_value(dict, ["breakduration", "value"]);
                            const shift_timeduration = get_dict_value(dict, ["timeduration", "value"]);
                            shift_dict = {pk: shift_pk, ppk: row_scheme_pk, table: "shift",
                                    code: shift_code,
                                    offsetstart: shift_offsetstart,
                                    offsetend: shift_offsetend,
                                    breakduration: shift_breakduration,
                                    timeduration: shift_timeduration
                                    };
                        }
            }}};
                    //console.log("shifts_list")
            //console.log(shifts_list)

        } else {
// ---  calendar_datefirst/last is used to create a new employee_calendar_list
            // calendar_period + {datefirst: "2019-12-09", datelast: "2019-12-15", employee_id: 1456}
            calendar_datefirst = get_dict_value(selected_calendar_period, ["period_datefirst"]);
            calendar_datelast = get_dict_value(selected_calendar_period, ["]period_datelast"]);

// ---  get rosterdate and weekday from date_cell
            let tblCell = el_input.parentNode;
            const cell_index = tblCell.cellIndex
            let tblHead = document.getElementById("id_thead_calendar")

            const date_cell = tblHead.rows[1].cells[cell_index].children[0]
            clicked_rosterdate_iso = get_attr_from_el_str(date_cell, "data-rosterdate")
            let cell_weekday_index = get_attr_from_el_int(date_cell, "data-weekday")

// ---  get row_index from tr_selected
            // getting weekday index from  data-weekday goes wrong, because of row span
            // must be corrected with the number of spanned row of this tablerow
            // number of spanned rows are stored in list spanned_rows, index is row-index

            // rowindex is stored in tblRow, rowindex, used to get the hour that is clicked on
            row_index = get_attr_from_el_int(tr_selected, "data-rowindex", -1)

// ---  count number of spanned columns till this column   [4, 1, 1, 0, 0, 1, 1, 0] (first column contains sum)
            const column_count = 7  // tbl_col_count["planning"];
            const spanned_column_sum = count_spanned_columns (tr_selected, column_count, cell_weekday_index)
            weekday_index = cell_weekday_index + spanned_column_sum;

// ---  get info from calendar_map
            const data_pk = get_attr_from_el(el_input, "data-pk");
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(calendar_map, "planning", data_pk);
            //console.log ("map_dict: ", map_dict);

// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++
// ++++++++++++++++ clicked on cell with item in calendar_map ++++++++++++++++
            // dont use !map_dict, because map_dict = {}, therefore !!map_dict will give true
            add_new_mode = (isEmpty(map_dict));

            if(!add_new_mode){
                // calendar_map: { id: {pk: "1103-2045-0", ppk: 695, table: "planning"}, pk: "1103-2045-0",
                //                isabsence: false, isrestshift: false, ... }

                is_absence = get_dict_value(map_dict, ["isabsence"], false);

// --- GET WEEKDAY LIST --------------------------------
                // calendar_map:  weekday_list: { 2: { 2045: {scheme_pk: 1659, team_pk: 2137, shift_pk: 669} } }
                // get selected_weekday_list from map_dict, select weekday buttons
                //(dont mix up with loc.weekdays_abbrev that contains names of weekdays)
                selected_weekday_list = get_dict_value(map_dict, ["weekday_list"]);

// --- GET EMPLOYEE --------------------------------
                // get employee from shift if clicked on shift, otherwise: get selected.employee_pk
                // calendar_map: employee: {pk: 2612, ppk: 3, code: "Martis SA", namelast: "Martis", namefirst: "Sapphire Alexandrine"}
                employee_pk = get_dict_value(map_dict, ["employee", "pk"]);
                //employee_ppk = get_dict_value(map_dict, ["employee", "ppk"]);
                //employee_code = get_dict_value(map_dict, ["employee", "code"]);

// --- GET CUSTOMER AND ORDER --------------------------------
                //  get order from shift if clicked on shift, otherwise: get selected_order_pk
                order_pk = get_dict_value(map_dict, ["order", "pk"]);
                order_ppk = get_dict_value(map_dict, ["order", "ppk"]);
                order_code = get_dict_value (map_dict, ["order", "code"]);
                customer_code = get_dict_value(map_dict, ["customer", "code"]);

// --- GET SCHEME ----------------------------------
                // calendar_map: scheme: {pk: 1659, ppk: 1422, code: "Schema 2", cycle: 1, excludepublicholiday: true}
                // ---  get scheme from info from calendar_map
                scheme_dict = get_dict_value(map_dict, ["scheme"]);
                scheme_pk = get_dict_value(scheme_dict, ["pk"]);
                scheme_datefirst = get_dict_value(scheme_dict, ["datefirst"]);
                scheme_datelast = get_dict_value(scheme_dict, ["datelast"]);

// --- GET TEAM ----------------------------------
                // ---  get team info from calendar_map
                // calendar_map: team: {pk: 2137, ppk: 1659, code: "Ploeg B"}
                team_dict = get_dict_value(map_dict, ["team"]);
                team_pk = get_dict_value(team_dict, ["pk"]);

// --- GET SHIFT ----------------------------------
                // ---  get shift info from calendar_map
                // calendar_map: shift: {pk: 669, ppk: 1659, code: "01.25 - 08.00",
                // offsetstart: 85, offsetend: 480, breakduration: 120, timeduration: 275, display: "01.25 u - 08.00 u" }
                shift_dict = get_dict_value(map_dict, ["shift"]);
                shift_pk = get_dict_value(shift_dict, ["pk"]);
                const shift_code = get_dict_value(shift_dict, ["code"]);
                const shift_offsetstart = get_dict_value(shift_dict, ["offsetstart"]);
                const shift_offsetend = get_dict_value(shift_dict, ["offsetend"]);
                const shift_breakduration = get_dict_value(shift_dict, ["breakduration"]);
                const shift_timeduration = get_dict_value(shift_dict, ["timeduration"]);

    // --- GET TEAMMEMBER ----------------------------------
                // calendar_map: teammember: {pk: 1103, ppk: 2137, datefirst: null, datelast: null,
                //                              employee_pk: 2612, replacement_pk: null}
                // get teammember info from calendar_map
                let field_dict = get_dict_value(map_dict, ["teammember"]);
                //console.log(",,,,,,,,,,,,,,,,,,field_dict", field_dict)
                teammember_dict = MSE_get_teammember_dict(field_dict)
                /*
                if(!isEmpty(field_dict)){
                    teammember_dict = { pk: get_dict_value(field_dict, ["pk"]),
                                        ppk:  get_dict_value(field_dict, ["ppk"])};
                    const tm_datefirst = get_dict_value(field_dict, ["datefirst"]);
                        if(!!tm_datefirst){teammember_dict["datefirst"] = {value: tm_datefirst}};
                    const tm_datelast = get_dict_value(field_dict, ["datelast"]);
                        if(!!tm_datelast){teammember_dict["datelast"] = {value: tm_datelast}};
                    const empl_pk = get_dict_value(field_dict, ["employee_pk"]);
                        if (!!empl_pk){teammember_dict["employee_pk"] = empl_pk};
                    const rempl_pk = get_dict_value(field_dict, ["replacement_pk"]);
                        if (!!rempl_pk){teammember_dict["replacement_pk"] = rempl_pk};
                };
                */

    // --- GET SCHEMEITEM ----------------------------------
    // ---  get schemeitem info from calendar_map
                // calendar_map: schemeitem: {pk: 2045, ppk: 1659, team_pk: 2137, shift_pk: 669}
                field_dict = get_dict_value(map_dict, ["schemeitem"]);
                if(!isEmpty(field_dict)){
                    schemeitem_dict = {pk: get_dict_value(field_dict, ["pk"]),
                                       ppk: get_dict_value(field_dict, ["ppk"])
                                      };
                    const team_pk = get_dict_value(field_dict, ["team_pk"]);
                        if (!!team_pk){schemeitem_dict["team_pk"] = team_pk};
                    const shift_pk = get_dict_value(field_dict, ["shift_pk"]);
                        if (!!shift_pk){schemeitem_dict["shift_pk"] = shift_pk};
                };
            } else {

    // ++++++++++++++++ clicked on empty cell ++++++++++++++++++++++++++++++++++++
    // --- GET EMPLOYEE --------------------------------
                // get employee from get selected.employee_pk if clicked on on empty row
                // calendar_map: employee: {pk: 2612, ppk: 3, code: "Martis SA", namelast: "Martis", namefirst: "Sapphire Alexandrine"}
                employee_pk= selected.employee_pk;
                //const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk);
                //if(!isEmpty(map_dict)){
                //    employee_pk = get_dict_value(map_dict, ["id", "pk"]);
                    //employee_ppk = get_dict_value(map_dict, ["id", "ppk"]);
                    //employee_code = get_dict_value(map_dict, ["code", "value"]);
                //}

            }  // if(!isEmpty(map_dict)){
    // ++++++++++++++++ end clicked on empty cell ++++++++++++++++++++++++++++++++++++

        }  // if(tblName === "teammember")


// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++

        //console.log ("employee_pk: ", employee_pk);
        if (!!employee_pk) {
            const btnshift_option = (is_absence) ?  "isabsence" :  (!!order_pk) ?  "schemeshift" : null;
// ---- GET EMPLOYEE_DICT ------------------------------------------
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk);
            const employee_code = get_dict_value(employee_dict, ["code", "value"]);
            const employee_datefirst = get_dict_value(employee_dict, ["datefirst", "value"]);
            const employee_datelast = get_dict_value(employee_dict, ["datelast", "value"]);

// ---- CREATE SCHEME ------------------------------------------
            // create new scheme_dict if scheme_dict is empty
            // keep structure of scheme in calendar_map: scheme: {pk: 1659, ppk: 1422, code: "Schema 2", cycle: 1, excludepublicholiday: true}
            if(isEmpty(scheme_dict)){
                id_new = id_new + 1
                scheme_pk = "new" + id_new.toString();
                // put clicked_rosterdate_iso in datefirst, but only when add_new_mode
                scheme_dict = { pk: scheme_pk,
                                ppk: order_pk,
                                table: "scheme",
                                shiftoption: btnshift_option
                                }
                if(!!employee_code){ scheme_dict["code"] = employee_code };
                if(is_absence && !!clicked_rosterdate_iso){
                    scheme_datefirst = clicked_rosterdate_iso;
                    scheme_dict["datefirst"] = scheme_datefirst
                };
            }

// ---- CREATE TEAM ------------------------------------------
            if(isEmpty(team_dict)){
                id_new = id_new + 1
                team_pk = "new" + id_new.toString();
                const team_code = (!!employee_code) ? employee_code : get_teamcode_with_sequence_from_map(loc, team_map, scheme_pk)
                team_dict = {pk: team_pk,
                              ppk: scheme_pk,
                              table: "team",
                              mode: "create",
                              shiftoption: btnshift_option,
                              code: team_code
                              };
            }

// ---- CREATE SHIFT --------------------------------------------
            // create new shift_dict if shift_dict is empty
            if(isEmpty(shift_dict)){
                id_new = id_new + 1
                shift_pk = "new" + id_new.toString();
                const offset_start = (row_index > -1) ? 60 * row_index : null;
                const shift_code = f_create_shift_code(loc, offset_start, null, 0, "");

                // shiftoption not necessary in shift_dict
                shift_dict = {pk: shift_pk,
                                ppk: scheme_pk,
                                table: "shift",
                                mode: "create",
                              code: shift_code,
                              offsetstart: offset_start
                              };
                cal_CalcMinMaxOffset(shift_dict, is_absence);
            }

// ---- CREATE TEAMMEMBER --------------------------------------------
            // calendar_map: teammember: {pk: 1103, ppk: 2137, datefirst: null, datelast: null}
            // create new teammember_dict if teammember_dict is empty
            if(isEmpty(teammember_dict)){
                id_new = id_new + 1
                teammember_dict = {pk: "new" + id_new.toString(),
                                  ppk: team_pk,
                                  table: "teammember",
                                  mode: "create",
                                  employee_pk: employee_pk
                              };
            }

// ---- CREATE SCHEMEITEM with rosterdate = clicked_rosterdate_isoe --------------------------------------------
            if(isEmpty(schemeitem_dict)){
                id_new = id_new + 1
                schemeitem_dict = {pk: "new" + id_new.toString(),
                                  ppk: scheme_pk,
                                  table: "schemeitem",
                                  mode: "create",
                                  rosterdate: clicked_rosterdate_iso,
                                  team_pk: team_pk,
                                  shift_pk: shift_pk
                              };
            }

// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++

console.log( "reset mod_dict: ");
// --- reset mod_dict
            // values of btnshift_option: isabsence, schemeshift
            // values of crud_mode: create, update, delete
            const crud_mode = (add_new_mode) ? "create" : "update";
            mod_dict = { // map_id: map_id,
                                mode: crud_mode,
                                shiftoption: btnshift_option,
                                calendar: {shiftoption: btnshift_option,
                                       rosterdate: clicked_rosterdate_iso,
                                       weekday_index: weekday_index,
                                       rowindex: row_index,
                                       weekday_list: selected_weekday_list,
                                       calendar_datefirst: calendar_datefirst,
                                       calendar_datelast: calendar_datelast},
                                employee: employee_dict,
                                // was: employee: {pk: employee_pk, ppk: employee_ppk, table: "employee",
                                //                code: employee_code},
                                order:  {pk: order_pk, ppk: order_ppk, isabsence: is_absence, table: "order",
                                         code: order_code},
                                scheme: scheme_dict,
                                shift: shift_dict,
                                team:  team_dict,
                                teammember: teammember_dict,
                                schemeitem: schemeitem_dict,
                                shift_list: [],
                                team_list: [],
                                teammember_list: [],
                                schemeitem_list: []
                                };

    // ---  put employee name in header
            let el_header_employee = document.getElementById("id_MSE_hdr_employee")
            let el_header_order = document.getElementById("id_MSE_hdr_order")
            let employee_text = loc.Select_employee + "...";

            if(!!employee_code) {employee_text = employee_code}
            el_header_employee.innerText = employee_text;

    // ---  put order name in header
            const order_text = (!!order_code) ? customer_code + " - " + order_code : loc.Select_order + "...";
            el_header_order.innerText = order_text;

    // ---  fill select table order, not when absence. Show select table order only in new shift
            MSE_FillSelectTableOrder();
            // show / hide select table order happens in MSE_BtnShiftoption_SelectAndDisable

    // ---  select btn_singleshift / btn_schemeshift / btn_absenceshift
            // show only the elements that are used in this btnshift_option
            // change label 'Working hours' to 'Hours when absence
            MSE_BtnShiftoption_SelectAndDisable()

    // ---  fill absence select options, put value in select box
            //console.log("loc.Select_abscat", loc.Select_abscat)
            t_FillOptionsAbscatFunction(loc, "abscat", el_modshift_absence, abscat_map)
            // put value of abscat (=order_pk) in select abscat element
            el_modshift_absence.value = (!!order_pk) ? order_pk : 0;

    // ---  put datefirst datelast in input boxes
            //console.log("scheme_datefirst: ", scheme_datefirst, typeof scheme_datefirst)
            //console.log("scheme_datelast: ", scheme_datelast, typeof scheme_datelast)
            el_modshift_datefirst.value = scheme_datefirst;
            el_modshift_datelast.value = scheme_datelast;
            const oneday_only = false;
            if(el_modshift_datefirst.value && el_modshift_datelast.value && el_modshift_datelast.value < el_modshift_datefirst.value)  {
                el_modshift_datelast.value = el_modshift_datefirst.value;
            }
            cal_SetDatefirstlastMinMax(el_modshift_datefirst, el_modshift_datelast, employee_datefirst, employee_datelast, oneday_only);
            el_modshift_datefirst.readOnly = false;
            el_modshift_datelast.readOnly = false;

    // ---  display offset
            MOD_UpdateOffsetInputboxes()

    // ---  reset checkbox, show onceonly only in new shifts, enable datefirst datelast
            // checkbox oneday is used in absence, onceonly in shifts
            el_modshift_onceonly.checked = false
            show_hide_element_by_id("id_ModSftEmp_onceonly_container", (add_new_mode && !is_absence))
    // ---  reset checkbox, el_modshift_oneday ( is only used in absence)
            el_modshift_oneday.checked = false

    // ---  format weekday buttons
            MSE_MSO_BtnWeekdaysFormat(mod_dict, false);

    // --- set excluded checkboxen upload_dict
            const scheme_excludepublicholiday = get_dict_value(scheme_dict, ["excludepublicholiday"], false);
            const scheme_excludecompanyholiday = get_dict_value(scheme_dict, ["excludecompanyholiday"], false);
            document.getElementById("id_ModSftEmp_publicholiday").checked = scheme_excludepublicholiday;
            document.getElementById("id_ModSftEmp_companyholiday").checked = scheme_excludecompanyholiday;

    // ---  enable save and delete button
            MSE_BtnSaveDeleteEnable()

            //console.log( "mod_dict: ", mod_dict);

    // ---  show modal
            $("#id_modshift_employee").modal({backdrop: true});

        } else {
// ---  show modal confirm with message 'First select employee'
            const msg_header = loc.Select_employee + "...";
            const html_text = loc.err_open_calendar_01 + loc.an_employee + loc.err_open_calendar_02;

            document.getElementById("id_mod_message_header").innerText = msg_header;
            document.getElementById("id_mod_message_container").innerHTML = html_text;

            $("#id_mod_message").modal({backdrop: true});
        };  // if (!!employee_pk)
    };  // MSE_Open



// --- GET TEAMMEMBER DICT----------------------------------
    function MSE_get_teammember_dict(field_dict){
        // get teammember info from field_dict
        let teammember_dict = {};
        if(!isEmpty(field_dict)){
            teammember_dict = { pk: get_dict_value(field_dict, ["pk"]),
                                ppk: get_dict_value(field_dict, ["ppk"])};
            const tm_datefirst = get_dict_value(field_dict, ["datefirst"]);
                if(!!tm_datefirst){teammember_dict["datefirst"] = {value: tm_datefirst}};
            const tm_datelast = get_dict_value(field_dict, ["datelast"]);
                if(!!tm_datelast){teammember_dict["datelast"] = {value: tm_datelast}};
            const empl_pk = get_dict_value(field_dict, ["employee_pk"]);
                if (!!empl_pk){teammember_dict["employee_pk"] = empl_pk};
            const rempl_pk = get_dict_value(field_dict, ["replacement_pk"]);
                if (!!rempl_pk){teammember_dict["replacement_pk"] = rempl_pk};
        };
        return teammember_dict;
    }  // MSE_get_teammember_dict


// ##############################################  MSE_Save  ############################################## PR2019-11-23
    function MSE_Save(crud_mode){
        //console.log( "===== MSE_Save  ========= ", crud_mode);
        //console.log( "mod_dict: ", mod_dict);

        const btnshift_option = mod_dict.shiftoption;
        //console.log( "btnshift_option: ", btnshift_option);

        // delete entire scheme whene clicked on delete btn, only in absence
        if (crud_mode === "delete") {
            mod_dict.mode = crud_mode;
        }

// =========== CREATE UPLOAD DICT =====================
        let upload_dict = {id: {mode: mod_dict.mode,
                                shiftoption: btnshift_option},
                            rosterdate: mod_dict["calendar"]["rosterdate"],
                            calendar_datefirst: mod_dict["calendar"]["calendar_datefirst"],
                            calendar_datelast: mod_dict["calendar"]["calendar_datelast"],
                            weekday_index: mod_dict["calendar"]["weekday_index"]
                            };

 // ++++ SAVE ORDER order info in upload_dict  ++++++++++++++++
        // 'id: {update: true}' is added in MSE_AbsenceClicked
        let order_dict = get_dict_value(mod_dict, ["order"]);
        if(!!order_dict){upload_dict["order"] = order_dict};

        if (btnshift_option === "isabsence"){

// =========== SAVE SCHEME =====================
            // - only in singleshift
            // in add_new_mode scheme_pk has value 'new4', scheme_ppk has value of order_pk. Done in MSE_Open

            // keep structure of scheme in calendar_map:
            // scheme: {pk: 1659, ppk: 1422, code: "Schema 2", cycle: 1, excludepublicholiday: true}
            const scheme_pk = get_dict_value(mod_dict.scheme, ["pk"]);
            const scheme_ppk = get_dict_value(mod_dict.scheme, ["ppk"]);
            const scheme_code = get_dict_value(mod_dict.scheme, ["code"]);
            const scheme_mode =  (crud_mode === "delete") ? "delete" : (!scheme_pk || !Number(scheme_pk)) ? "create" : "none";

            // empty input date value = "", convert to null
            const datefirst = (!!el_modshift_datefirst.value) ? el_modshift_datefirst.value : null;
            const datelast =(!!el_modshift_datelast.value) ? el_modshift_datelast.value : null;

            const excl_ph = document.getElementById("id_ModSftEmp_publicholiday").checked;
            const excl_ch = document.getElementById("id_ModSftEmp_companyholiday").checked;

            const scheme_cycle = (btnshift_option === "isabsence") ? 1 : 7

            upload_dict["scheme"] =  {id: {pk: scheme_pk,
                                        ppk: scheme_ppk,
                                        table: "scheme",
                                        mode: scheme_mode,
                                        shiftoption: btnshift_option},
                                    cycle: {value: scheme_cycle},
                                    code: {value: scheme_code},
                                    datefirst: {value: datefirst},
                                    datelast: {value: datelast},
                                    excludepublicholiday: {value: excl_ph},
                                    excludecompanyholiday: {value: excl_ch}
                                    }

// =========== SAVE TEAM =====================
            const team_pk = get_dict_value(mod_dict.team, ["pk"]);;
            const team_code = get_dict_value(mod_dict.team, ["code"]);
            const team_mode = (!team_pk || !Number(team_pk)) ? "create" : "unchanged";

            const team_dict = { id: {pk: team_pk,
                                         ppk: scheme_ppk,
                                         table: "team",
                                         mode: team_mode,
                                         shiftoption: btnshift_option},
                                     code: {value: team_code}
                                   };
            const teams_list = [];
            teams_list.push(team_dict);
            upload_dict["teams_list"] = teams_list;


// =========== SAVE SHIFT =====================
 // put offset info in upload_dict - in schemeitem when singleshift, in teammember when absenceshif
        // prepared for multiple shifts, add one for now
            const shift_pk = get_dict_value(mod_dict.shift, ["pk"]);
            const shift_mode = (!shift_pk || !Number(shift_pk)) ? "create" : "update";
            const shift_offset_start = get_dict_value(mod_dict.shift, ["offsetstart"]);
            const shift_offset_end = get_dict_value(mod_dict.shift, ["offsetend"]);
            const shift_break_duration = get_dict_value(mod_dict.shift, ["breakduration"], 0);
            const shift_time_duration = get_dict_value(mod_dict.shift, ["timeduration"], 0);

            // TODO temporary, code must be updated inmmediately after changing offset
            let shift_code = get_dict_value(mod_dict.shift, ["code"]);
            const new_shift_code = f_create_shift_code(loc, shift_offset_start, shift_offset_end, shift_time_duration, shift_code);
            if(!!new_shift_code && new_shift_code !== shift_code) { shift_code = new_shift_code}

            const shift_dict = { id: {pk: shift_pk,
                                            ppk: scheme_ppk,
                                            table: "shift",
                                            mode: shift_mode,
                                            shiftoption: btnshift_option},
                                         code: {value: shift_code},
                                         offsetstart: {value: shift_offset_start},
                                         offsetend: {value: shift_offset_end},
                                         breakduration: {value: shift_break_duration},
                                         timeduration: {value: shift_time_duration}
                                     };
            const shifts_list = [];
            shifts_list.push(shift_dict);
            upload_dict["shifts_list"] = shifts_list;

// ++++ SAVE EMPLOYEE info in upload_dict  ++++++++++++++++
             // put employee info in upload_dict
            let employee_dict = null;
            const employee_pk = get_dict_value(mod_dict, ["employee", "id", "pk"]);
            if(!!employee_pk){
                const employee_ppk = get_dict_value(mod_dict, ["employee", "id", "ppk"]);
                const employee_code = get_dict_value(mod_dict, ["employee", "code", "value"]);
                employee_dict = {pk: employee_pk, ppk: employee_ppk, table: "employee", code: employee_code}
            };
            upload_dict["employee"] = employee_dict;

// ++++ SAVE TEAMMEMBER info in teammembers_list  ++++++++++++++++
            //  item_dict: {
            // 'id': {'pk': 'new4', 'ppk': 'new8', 'table': 'teammember', 'mode': 'create', 'shiftoption': 'issinglXXeshift'},
            //  'employee': {'pk': 2623, 'ppk': 3, 'table': 'employee', 'code': 'Wu XX Y'}}
            // put teammember info in upload_dict
            const teammember_pk = get_dict_value(mod_dict.teammember, ["pk"]);
            const teammember_ppk = get_dict_value(mod_dict.teammember, ["ppk"]);
            const teammember_mode = (!teammember_pk || !Number(teammember_pk)) ? "create" : "none";
            const teammember_dict = { id: { pk: teammember_pk,
                                            ppk: teammember_ppk,
                                            table: "teammember",
                                            mode: teammember_mode,
                                            shiftoption: btnshift_option
                                         }
                                        };
            if(!!employee_dict) {teammember_dict["employee"] = employee_dict};
            // put teammember in teammembers_list
            let teammembers_list = [];
            teammembers_list.push(teammember_dict)
            upload_dict["teammembers_list"] = teammembers_list

// ++++ SAVE SCHEMEITEM info in upload_dict  ++++++++++++++++
// ---  get schemeitems from weekdays - only in singleshift
            mod_dict.id_new = id_new
            let schemeitems_list = [];
            if (btnshift_option === "issinglXXXeshift"){
                schemeitems_list = MSE_MSO_get_schemeitemslist_from_btnweekdays(btnshift_option, mod_dict, scheme_pk, team_pk, shift_pk);
                upload_dict["schemeitems_list"] = schemeitems_list
            } else if (btnshift_option === "isabsence"){
                schemeitems_list = MSE_get_schemeitemslist_absence(btnshift_option, mod_dict, scheme_pk, team_pk, shift_pk);
                upload_dict["schemeitems_list"] = schemeitems_list
            }
            // id_new is increased in get_schemeitemsdict. Update id_new
            id_new = mod_dict.id_new

        }  // } else if (btnshift_option === "isabsence")

        UploadChanges(upload_dict, url_teammember_upload);

    }  // MSE_Save

// ##############################################  END MSE_Save  ############################################## PR2019-11-23

//=========  MSE_BtnShiftoption_Clicked  ================ PR2019-12-06
    function MSE_BtnShiftoption_Clicked(btn) {
        //console.log( "===== MSE_BtnShiftoption_Clicked  ========= ");

        // data-mode= 'singleshift', 'schemeshift', absenceshift'
        const data_mode = get_attr_from_el(btn, "data-mode")
        const shift_option = (data_mode === 'absenceshift') ? "isabsence" :
                             (data_mode === 'schemeshift') ? "schemeshift" : null;
        const is_absence = (shift_option === "isabsence");

// ---  select btn_singleshift / btn_schemeshift
        // shiftoptions are: schemeshift, isabsence
        mod_dict.shiftoption = shift_option

        // when switched to absence: put full workday in timeduration, remove offsetstart and offsetend
        // also rename shift_code
        let offset_start = null, time_duration = 0
        if (shift_option === "isabsence") {
            // when absence: time_duration = workhoursperweek / 5. and not workhoursperday,
            // because absence days are always enterd 5 days per week.
            // TODO correct
            const workhoursperweek =  get_dict_value(mod_dict, ["employee", "workhoursperweek", "value"], 0);
            time_duration = workhoursperweek / 5
        } else{
            offset_start =  60 * mod_dict.calendar.rowindex;
        }
        //console.log("mod_dict.calendar.rowindex: ", mod_dict.calendar.rowindex)
        //console.log("offset_start: ", offset_start)
        mod_dict.shift.offsetstart = offset_start
        mod_dict.shift.offsetend = null
        mod_dict.shift.timeduration = time_duration
        cal_CalcMinMaxOffset(mod_dict.shift, is_absence);
        const cur_shift_code = get_dict_value(mod_dict.shift, ["code"], "")
        mod_dict.shift.code = f_create_shift_code(loc, offset_start, null, 0, cur_shift_code)

        MOD_UpdateOffsetInputboxes()

// set clicked date as datefirst, only when switched to absence,
        const date_first_value = (shift_option === "isabsence") ? mod_dict.calendar.rosterdate : null;
        el_modshift_datefirst.value =  date_first_value
        el_modshift_datelast.value = null;
        cal_SetDatefirstlastMinMax(el_modshift_datefirst, el_modshift_datelast);

        MSE_BtnShiftoption_SelectAndDisable();

    }; // MSE_BtnShiftoption_Clicked

//========= MSE_BtnShiftoption_SelectAndDisable  ============= PR2020-01-31
    function MSE_BtnShiftoption_SelectAndDisable() {
        //console.log( "=== MSE_BtnShiftoption_SelectAndDisable === ");
        //console.log( "mod_dict: ", mod_dict);

        const btnshift_option = mod_dict.shiftoption;
        const add_new_mode = (mod_dict.mode === "create");
        const is_absence = (btnshift_option === "isabsence");
        const is_schemeshift = (btnshift_option === "schemeshift");

        let btn_highlighted = {singleshift: false, schemeshift: false, absenceshift: false};

// ---  select btn_singleshift / btn_schemeshift / btn_absenceshift
        // ---  highlight selected button
        if (is_absence){ btn_highlighted.absenceshift = true } else
        { btn_highlighted.schemeshift = true};

// ---  loop through select buttons
        let el_btns_container = document.getElementById("id_ModSftEmp_btns_container");
        const show_sel_buttons = (add_new_mode && !is_absence);
        show_hide_element(el_btns_container, show_sel_buttons)
        if(show_sel_buttons){
            let sel_buttons = el_btns_container.children;
            for (let i = 0, len = sel_buttons.length; i < len; i++) {
                let btn = sel_buttons[i];
                const btn_option = get_attr_from_el(btn, "data-mode")
                const is_highlighted = btn_highlighted[btn_option]
                btn.disabled = !add_new_mode;
                if (is_highlighted ){
                    btn.disabled = false;
                    btn.classList.add(cls_btn_selected);
                } else{
                    btn.classList.remove(cls_btn_selected);
                }
            }
        }
        const btnshift_classname = (is_absence)  ? "absenceshift" :
                                   (is_schemeshift) ? "schemeshift" : null;

// ---  show only the elements that are used in this btnshift_option
        let list = document.getElementsByClassName("mod_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains(btnshift_classname)
            show_hide_element(el, is_show)
        }

// ---  show hide select table order, only in add_new_mode, not when absence.
        const show_select_order = (add_new_mode && !is_absence);
        if (show_select_order) {MSE_FillSelectTableOrder()};
        show_hide_element_by_id("id_ModSftEmp_select_order", show_select_order);

// ---  change label 'Working hours' to 'Hours when absence
        let label_timeduration_txt = (is_absence) ? loc.Hours : loc.Working_hours
        document.getElementById("id_ModSftEmp_label_timeduration").innerText = label_timeduration_txt

    }  // MSE_BtnShiftoption_SelectAndDisable

//========= MSE_SelectOrderRowClicked  ============= PR2019-12-06
    function MSE_SelectOrderRowClicked(mode, sel_tr_clicked){
        //console.log( "=== MSE_SelectOrderRowClicked ", mode);

        if(!!sel_tr_clicked) {
            const tblName = "order";
            const order_pk = get_attr_from_el_int(sel_tr_clicked, "data-pk");
            const order_ppk = get_attr_from_el_int(sel_tr_clicked, "data-ppk");
            const order_code = get_attr_from_el_str(sel_tr_clicked, "data-code");
            const display_code = get_attr_from_el_str(sel_tr_clicked, "data-display");

            if ( mode ==="modshift"){
                mod_dict.order = {pk: order_pk, ppk: order_ppk, table: "order", code: order_code, mode: "update"};
                // also update parent pk of scheme
                mod_dict.scheme.ppk = order_pk;

    // ---  highlight clicked row in select table
                // DeselectHighlightedRows(tr_selected, cls_selected, cls_background)
                DeselectHighlightedRows(sel_tr_clicked, cls_selected, cls_bc_transparent);
                // yelllow won/t show if you dont first remove background color
                sel_tr_clicked.classList.remove(cls_bc_transparent)
                sel_tr_clicked.classList.add(cls_selected)

    // ---  update header text
                if(!display_code){display_code = loc.Select_order}
                document.getElementById("id_MSE_hdr_order").innerText = display_code

    // ---  enable save button
                MSE_BtnSaveDeleteEnable()
            } else if ( mode ==="modperiod"){

            }
            //console.log("mod_dict: ", mod_dict)
        }  // if(!!sel_tr_clicked)
       //-------------------------------------------
    }  // MSE_SelectOrderRowClicked

//========= MSE_AbsenceClicked  ============= PR2019-12-06
    function MSE_AbsenceClicked(el_input){
        //console.log( "=== MSE_AbsenceClicked ===");
    // ---  get map_dict
        const pk_str = el_input.value;
        const selected_option = el_input.options[el_input.selectedIndex];
        const order_ppk = get_attr_from_el(selected_option, "data-ppk");
        const order_code = selected_option.text;
    // --- add absence
        // Field abscat contains pk of abscat order
        // TODO decide where to put 'update'
        mod_dict["order"] = {pk: pk_str, ppk: order_ppk, table: "order", isabsence: true,
                                code: order_code, mode: "update"};
        // also update parent pk of scheme
        mod_dict.scheme.ppk = pk_str;
    // ---  enable save and delete button
        MSE_BtnSaveDeleteEnable()
    }  // MSE_AbsenceClicked

//========= MSE_DateFirstLastClicked  ============= PR2020-02-19
    function MSE_DateFirstLastClicked(el_input){
        //console.log( "=== MSE_DateFirstLastClicked ===");
        // in absence mode and 'one day only; is selected: make datelast equal to datefirst
        if(mod_dict.shiftoption === "isabsence" && el_modshift_oneday.checked){
            el_modshift_datelast.value = el_modshift_datefirst.value
        }
        if(el_modshift_datefirst.value && el_modshift_datelast.value && el_modshift_datelast.value < el_modshift_datefirst.value)  {
            el_modshift_datelast.value = el_modshift_datefirst.value;
        }
        cal_SetDatefirstlastMinMax(el_modshift_datefirst, el_modshift_datelast)
    }  // MSE_DateFirstLastClicked

//=========  MSE_TimepickerResponse  ================
    function MSE_TimepickerResponse(tp_dict){
        //console.log( " === MSE_TimepickerResponse ");
        // put new value from modTimepicker in ModShift PR2019-11-24
        //console.log( "tp_dict: ", tp_dict);
        const fldName = tp_dict.field;
        const new_offset = tp_dict.offset;
        //console.log( "fldName: ", fldName);
        //console.log( "new_offset: ", new_offset);
        //console.log( "mod_MAB_dict: ", mod_MAB_dict);

        mod_MAB_dict[fldName] = new_offset;
        mod_MAB_dict.shift_update = true;

        //console.log( "---new ", offset_start , offset_end, break_duration, time_duration);
        if (fldName === "timeduration") {
            if(!!new_offset){
                mod_MAB_dict.offsetstart = null;
                mod_MAB_dict.offsetend = null;
                mod_MAB_dict.breakduration = 0;
            };
        } else  {
            if (mod_MAB_dict.offsetstart != null && mod_MAB_dict.offsetend != null) {
                const break_duration = (mod_MAB_dict.breakduration) ? mod_MAB_dict.breakduration : 0;
                mod_MAB_dict.timeduration = mod_MAB_dict.offsetend - mod_MAB_dict.offsetstart - break_duration;
            } else {
                mod_MAB_dict.timeduration = 0
            }
        }

        //console.log( "mod_MAB_dict.timeduration: ", mod_MAB_dict.timeduration);
// check if a shift with these times already exist in this scheme
        const lookup_shift = MSE_lookup_same_shift(mod_MAB_dict.offsetstart,
                                                    mod_MAB_dict.offsetend,
                                                    mod_MAB_dict.breakduration,
                                                    mod_MAB_dict.timeduration);
        const lookup_shift_pk = lookup_shift.pk
        const current_shift_pk = mod_MAB_dict.pk
        const shift_has_changed = (lookup_shift_pk !== current_shift_pk)
        //console.log( "current_shift_pk: ", current_shift_pk);
        //console.log( "lookup_shift.pk: ", lookup_shift.pk);
        //console.log( "shift_has_changed: ", shift_has_changed);

        // if same shift found: put info from lookup_shift in mod_MAB_dict
        if(!!lookup_shift_pk){
            // same shift found: put info in mod_MAB_dict
           //>>>  mod_MAB_dict.pk = lookup_shift.pk;
            // mod_MAB_dict.ppk stays the same
            mod_MAB_dict.shift_code = lookup_shift.code;
            mod_MAB_dict.offsetstart = lookup_shift.offsetstart;
            mod_MAB_dict.offsetend = lookup_shift.offsetend;
            mod_MAB_dict.breakduration = lookup_shift.breakduration;
            mod_MAB_dict.timeduration = lookup_shift.timeduration;
        } else{
            // no same shift found: put info as new shift in mod_MAB_dict
            id_new += 1;
            //>>> mod_MAB_dict.shift.pk = "new" + id_new.toString()
            // mod_MAB_dict.shift.ppk stays the same
            mod_MAB_dict.shift_code = f_create_shift_code(loc,
                                                    mod_MAB_dict.offsetstart,
                                                    mod_MAB_dict.offsetend,
                                                    mod_MAB_dict.timeduration,
                                                    mod_MAB_dict.shift_code);
        }

        const is_absence = (get_dict_value(mod_MAB_dict, ["shiftoption"]) === "isabsence");
        const shift_dict = {offsetstart: mod_MAB_dict.offsetstart,
                            offsetend: mod_MAB_dict.offsetend,
                            breakduration: mod_MAB_dict.breakduration,
                            min_offsetstart: -720, max_offsetstart: 1440,
                            min_offsetend: 0, max_offsetend: 2160,
                            min_breakduration: 0, max_breakduration: 1440,
                            min_timeduration: 0, max_timeduration: 1440
                            }
        cal_CalcMinMaxOffset(shift_dict, is_absence)
        // if is_absence: also change shift_pk in schemeitems (is only one schemeitem: cycle = 1
        if (is_absence && shift_has_changed ){
        }
        MOD_UpdateOffsetInputboxes();

    } // MSE_TimepickerResponse

//========= MSE_lookup_same_shift  ============= PR2020-02-09
    function MSE_lookup_same_shift(new_offset_start, new_offset_end, new_break_duration, new_time_duration) {
        //console.log( " === MSE_lookup_same_shift ");
        // function checks if a shift with these times already exist in this scheme
        let lookup_shift = {};
        if(!!shift_map.size){
            const current_scheme_pk = get_dict_value(mod_dict, ["scheme", "pk"])
            const current_shift_pk = get_dict_value(mod_dict, ["shift", "pk"])

            for (let [key, dict] of shift_map) {
                const lookup_ppk = get_dict_value(dict, ["id", "ppk"])
                // only check shifts of current_scheme_pk
                if(lookup_ppk === current_scheme_pk){
                    // dont skip current_shift_pk, later current shift_pk and lookup_shift_pk will be compared
                    const lookup_pk = get_dict_value(dict, ["id", "pk"])
                    // check if values are the same
                    const lookup_offsetstart = get_dict_value(dict, ["offsetstart", "value"]);
                    const lookup_offsetend = get_dict_value(dict, ["offsetend", "value"]);
                    const lookup_breakduration = get_dict_value(dict, ["breakduration", "value"], 0);
                    const lookup_timeduration = get_dict_value(dict, ["timeduration", "value"], 0);
                    let same_values = false;
                    if(lookup_offsetstart != null && lookup_offsetend != null){
                        // when both offset_start and offset_end have value: time is calculated, skip compare time
                        same_values = (new_offset_start === lookup_offsetstart
                            && new_offset_end === lookup_offsetend
                            && new_break_duration === lookup_breakduration)
                    } else {
                        // when offset_start or offset_end is empty: it is an '4-hours' shift, skip compare start, end, break
                        same_values = (new_time_duration === lookup_timeduration)
                    }
                    if(same_values) {
                       lookup_shift = {pk: lookup_pk,
                            ppk: lookup_ppk,
                            code: get_dict_value(dict, ["code", "value"]),
                            offsetstart: lookup_offsetstart,
                            offsetend: lookup_offsetend,
                            breakduration: lookup_breakduration,
                            timeduration: lookup_timeduration
                        }
                        if (lookup_pk === current_shift_pk){
                            // there may be multiple shifts with same values.
                            // Iterate through all shift to see if current shift is amon them.
                            // if so: break when current shift is found
                            break;
                        }
                    }
                }   // if(ppk === this_scheme_pk){
            }  //  for (let [key, dict] of shift_map) {
        }  // if(!!shift_map.size){
        return lookup_shift
    }  // MSE_lookup_same_shift

//========= MOD_UpdateOffsetInputboxes  ============= PR2020-05-17
    function MOD_UpdateOffsetInputboxes(pgeName) {
        //console.log( " ----- MOD_UpdateOffsetInputboxes ----- ");
        //console.log( "mod_dict.page: ", mod_dict.page);
        //console.log( "mod_dict.shift: ", mod_dict.shift);
        const el_offsetstart = (mod_dict.page === "modabsence") ? el_MAB_offsetstart : el_modshift_offsetstart;
        const el_offsetend = (mod_dict.page === "modabsence") ? el_MAB_offsetend : el_modshift_offsetend;
        const el_breakduration = (mod_dict.page === "modabsence") ? el_MAB_breakduration : el_modshift_breakduration;
        const el_timeduration = (mod_dict.page === "modabsence") ? el_MAB_timeduration : el_modshift_timeduration;
        //display_offset_time (offset, loc.timeformat, loc.user_lang, skip_prefix_suffix, blank_when_zero)
        el_offsetstart.innerText = display_offset_time ({timeformat: loc.timeformat, user_lang: loc.user_lang}, mod_dict.shift.offsetstart, false, false)
        el_offsetend.innerText = display_offset_time ({timeformat: loc.timeformat, user_lang: loc.user_lang}, mod_dict.shift.offsetend, false, false)
        el_breakduration.innerText = display_duration (mod_dict.shift.breakduration, loc.user_lang)
        el_timeduration.innerText =  display_duration (mod_dict.shift.timeduration, loc.user_lang)
    }  // MOD_UpdateOffsetInputboxes

//========= MSE_FillSelectTableOrder  ============= PR2019-11-23
    function MSE_FillSelectTableOrder() {
        //console.log( "=== MSE_FillSelectTableOrder ");
        const caption_one = loc.Select_order + ":";

        const current_item = null;
        const tblName = "order";
        let data_map = order_map;

        // fill table in MosShift and ModSelectPeriod
        //const mod_list = ["modshift", "modperiod"]
        const mod_list = ["modshift"]
        mod_list.forEach(function (mode, index) {
            const id_selecttable = (mode === "modshift") ? "id_MSE_tblbody_order" : "id_modperiod_tblbody_order";
            let tblBody = document.getElementById(id_selecttable)
            tblBody.innerText = null;

    // ---  when no items found: show 'No orders'
            if (order_map.size === 0){
                let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                let td = tblRow.insertCell(-1);
                td.innerText = loc.No_orders;
            } else {

    // ---  loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const pk_int = get_pk_from_dict(item_dict)
                    const ppk_int = get_ppk_from_dict(item_dict)
                    const order_code = get_dict_value(item_dict, ["code", "value"], "")
                    const customer_code = get_dict_value(item_dict, ["customer", "code"], "")
                    const display_code = customer_code + " - " + order_code;

    // ---  insert tblBody row
                    let tblRow = tblBody.insertRow(-1);
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-table", tblName);
                    tblRow.setAttribute("data-code", order_code);
                    tblRow.setAttribute("data-display", display_code);

    // ---  add hover to tblBody row
                    tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});

    // ---  add EventListener to row
                    tblRow.addEventListener("click", function() {MSE_SelectOrderRowClicked(mode, tblRow)}, false )

    // ---  add first td to tblRow.
                    let td = tblRow.insertCell(-1);

    // ---  add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = display_code;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } // for (const [pk_int, item_dict] of data_map.entries())
            }  // if (data_map.size === 0)

        });  // mode_list.forEach(function (mode, index)

    } // MSE_FillSelectTableOrder

//=========  MSE_FilterOrder  ================ PR2019-11-23
    function MSE_FilterOrder(mode, el_filter) {
        //console.log( "===== MSE_FilterOrder  ========= ");
        const id_selecttable = (mode === "modshift") ? "id_MSE_tblbody_order" : "id_modperiod_tblbody_order";
        let tblBody = document.getElementById(id_selecttable)

        const filter_str = el_filter.value;
        FilterSelectRows(tblBody, filter_str);
    }; // function MSE_FilterOrder

//=========  MSE_OnceOnly  ================ PR2019-12-06
    function MSE_OnceOnly() {
        //console.log( "===== MSE_OnceOnly  ========= ");
        const once_only = el_modshift_onceonly.checked

        let datefirst_iso = null, datelast_iso = null;
        if(once_only){
            datefirst_iso = get_dict_value(mod_dict, ["calendar", "calendar_datefirst"]);
            datelast_iso = get_dict_value(mod_dict, ["calendar", "calendar_datelast"]);
        } else {
            datefirst_iso = get_dict_value(mod_dict, ["calendar", "rosterdate"]);
        }

        el_modshift_datefirst.value = datefirst_iso
        el_modshift_datelast.value = datelast_iso
        if(datefirst_iso && datelast_iso && datelast_iso < datefirst_iso)  {
            el_modshift_datelast.value = datefirst_isovalue;
        }
        cal_SetDatefirstlastMinMax(el_modshift_datefirst, el_modshift_datelast);
        el_modshift_datefirst.readOnly = once_only;
        el_modshift_datelast.readOnly = once_only;
        // dont disable weekdays: when once-only, you can still add a shift on every day of the week
        //MSE_MSO_BtnWeekdaysFormat(mod_dict, false);
    }; // function MSE_OnceOnly

//=========  MSE_OneDay  ================ PR2020-02-18
    function MSE_OneDay() {
        //console.log( "===== MSE_OneDay  ========= ");
        // only used in absence
        const one_day =el_modshift_oneday.checked

        let datefirst_iso = null, datelast_iso = null;
        if(el_modshift_oneday.checked){
            el_modshift_datelast.value = el_modshift_datefirst.value
            el_modshift_datefirst.removeAttribute("max")
            el_modshift_datelast.readOnly = true;
        } else {
            //el_modshift_datelast.value = null;
            cal_SetDatefirstlastMinMax(el_modshift_datefirst, el_modshift_datelast);
            el_modshift_datelast.readOnly = false;
        }
        // weekdays not in use in absence
    }; // function MSE_OneDay

//========= MSE_BtnWeekdayClicked  ============= PR2019-11-23
    function MSE_BtnWeekdayClicked(btn) {
        //console.log( "=== MSE_BtnWeekdayClicked ");

        const selected_weekdays_list = get_dict_value(mod_dict, ["calendar", "weekday_list"])
        const btn_weekday_index = get_attr_from_el_int(btn, "data-weekday");
        const selected_weekday_dict = get_dict_value(selected_weekdays_list, [btn_weekday_index])
        const weekday_dict_has_schemeitem_dicts = !isEmpty(selected_weekday_dict)

        const current_data_value = get_attr_from_el(btn, "data-selected");
        let new_data_value;
        if (weekday_dict_has_schemeitem_dicts) {
            if (current_data_value === "selected"){ // btn is darkgrey
                new_data_value = "not_selected_2"
            } else if (current_data_value === "not_selected_2"){
                new_data_value = "delete"
            } else if (current_data_value === "delete"){
                new_data_value =  "not_selected_1"
            } else { // if (current_data_value === "not_selected_1"){
                new_data_value = "selected"
            }
        } else {
            if (current_data_value === "create"){
                new_data_value =  "none"
            } else {
                new_data_value = "create"
            }
        }
        btn.setAttribute("data-selected", new_data_value);

        MSE_MSO_BtnWeekdaySetClass(btn, new_data_value)
    } // MSE_BtnWeekdayClicked

//=========  MSE_BtnSaveDeleteEnable  ================ PR2019-11-23
    function MSE_BtnSaveDeleteEnable(){
        //console.log( " --- MSE_BtnSaveDeleteEnable --- ");
        //console.log( "mod_dict", mod_dict);

// --- enable save button
        const teammember_pk = get_dict_value(mod_dict, ["teammember", "pk"]);
        const team_pk = el_modshift_absence.value;
        const employee_pk = get_dict_value(mod_dict, ["employee", "id", "pk"]);
        const is_absence = (mod_dict.shiftoption  === "isabsence");

        let order_pk;
        if(is_absence) {
            order_pk = el_modshift_absence.value;
        } else {
            order_pk = get_dict_value(mod_dict, ["order", "pk"]);
        }
        const btn_save_enabled = (!!employee_pk && !!order_pk)
        const btn_delete_visible = (is_absence && btn_save_enabled)

        //console.log( "employee_pk", employee_pk);
        //console.log( "order_pk", order_pk);

        if(btn_delete_visible) {
            el_modshift_btn_delete.classList.remove(cls_hide);
        } else {
            el_modshift_btn_delete.classList.add(cls_hide);
        }
        el_modshift_btn_save.disabled = !btn_save_enabled;

    }  // MSE_BtnSaveDeleteEnable


//###########################################################################
// +++++++++++++++++ VALIDATE +++++++++++++++++++++++++++++++++++++++++++++++
    function validate_input_blank(el_input, el_err, msg_blank){
        let msg_err = null;
        if(!el_input.value){
            msg_err = msg_blank
        }
        formcontrol_err_msg(el_input, el_err, msg_err)
        return (!!msg_err)
    }  // validate_select_blank

//========= validate_select_blank====================================
    function validate_select_blank(el_select, el_err, msg_blank){
        // functions checks if select element has no selected value. is blank
        let msg_err = null, sel_code = null, sel_pk = 0, sel_ppk = 0;
        const sel_index = el_select.selectedIndex;
        const sel_option = el_select.options[sel_index];

        if(!!sel_option){
            sel_pk = parseInt(sel_option.value)
            if (!sel_pk){sel_pk = 0}
            sel_ppk = get_attr_from_el_int(sel_option, "data-ppk")
            if(!!sel_pk){
                if(!!sel_option.text){
                    sel_code = sel_option.text
                }
            }
        }
        // index 0 contains ' No templates...' or 'Selecteer sjabloon...'
        if(!sel_pk){ msg_err = msg_blank }
        formcontrol_err_msg(el_select, el_err, msg_err)
        const dict = {"pk": sel_pk, "ppk": sel_ppk, "code": sel_code, "error": (!!msg_err)}
        //console.log(dict)
        return dict;
    }  // validate_select_blank

//========= validate_input_code====================================
    function validate_input_code(el_input, el_err, list, msg_blank, msg_exists){
        //console.log("=========  validate_input_code ========= ");
        //console.log(list);
        // functions checks if input.value is blank or already exists in list
        let msg_err = null, new_code = null;

        if(!el_input.value){
            msg_err = msg_blank;
        } else {
            new_code = el_input.value
            //console.log("new_code:", new_code);
            // check if new_code already exists in scheme_list
            if (!!list){
                for (let i = 0, dict, code, len = list.length; i < len; i++) {
                    dict = list[i]

                    code = get_dict_value(dict, ["code", "value"])
            //console.log("code:", code);
                    if (new_code.toLowerCase() === code.toLowerCase()) {
            //console.log("exists:");
                        msg_err = msg_exists;
                        break;
                    }}}}
        formcontrol_err_msg(el_input, el_err, msg_err)
        return {"code": new_code, "error": (!!msg_err)}
    }  // validate_input_code


//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleSelect_Filter  ====================================
    function HandleSelect_FilterXXX() {
        //console.log( "===== HandleSelect_Filter  ========= ");

        // skip filter if filter value has not changed, else: update variable filter_select
        // TODO add employee filter
        // was: let new_filter = el_filter_select.value;
        let new_filter = ""  // document.getElementById("id_SBR_thead_select").value;

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

        //console.log( "skip_filter ", skip_filter);
        if (!skip_filter) {
           // FilterSelectRows(SBR_tblBody_select, filter_select)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter

//========= HandleFilterField  ============ PR2020-09-12
    function HandleFilterField(el, col_index, event_key) {
        console.log( "===== HandleFilterField  ========= ");
        console.log( "col_index", col_index);
        console.log( "event_key", event_key);
        // called by CreateEmployeeTblHeader and CreateTeammemberHeader

// --- get filter tblRow and tblBody
        let filter_row = get_tablerow_selected(el);
        //const mode = get_attr_from_el_str(el,"data-mode");

        // skip filter if filter value has not changed, update variable filter_text
        // filter_dict[col_index] = [filter_tag, filter_value, mode] modes are: 'blanks_only', 'no_blanks', 'lte', 'gte', 'lt', 'gt'
        const skip_filter = t_SetExtendedFilterDict(el, col_index, filter_dict, event_key);
        console.log( "filter_dict", filter_dict);
        console.log( "..................skip_filter", skip_filter);
        if (!skip_filter) {
            const tblName = tblName_from_selectedbtn(selected_btn);
            const has_ppk_filter = (tblName !== "employee");
            for (let i = 0, tblRow, show_row; tblRow = tblBody_datatable.rows[i]; i++) {
                //const selected_ppk = null;
                //show_row = t_ShowTableRow(tblRow, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected_ppk);
                // convert lokkup values to filter_row, only for columns with filter in filter_dict
                const filter_row = []
console.log( "++++++++++++++");
                for (const [index_str, filter_arr] of Object.entries(filter_dict)) {
                    if(Number(index_str)){
                        const col_index = Number(index_str);
                        const filter_tag = filter_arr[0];
console.log( "filter_tag", filter_tag);
                        const td = tblRow.cells[col_index];
                        if(td){
                            const el = td.children[0];
console.log( "el", el);
                            if (el){
                                if (filter_tag === "text") {
                                    if(el.innerText){ filter_row[col_index] = el.innerText.toLowerCase();}
                }}}}};
console.log( "filter_row", filter_row);
console.log( "filter_dict", filter_dict);

                show_row = t_ShowTableRowExtended(filter_row, filter_dict)
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            console.log( "show_row", show_row);
            }

           // FilterSelectRows(SBR_tblBody_select, filter_select);
        } //  if (!skip_filter) {

    }; // HandleFilterField

//=========  HandleSelectFilterButtonInactive  ================ PR2019-07-18
    function HandleSelectFilterButtonInactive(el) {
        //console.log(" --- HandleSelectFilterButtonInactive --- ", selected_btn);
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        const tblName = tblName_from_selectedbtn(selected_btn);
        const has_ppk_filter = (tblName !== "employee");

        t_Filter_TableRows(tblBody_datatable, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected.employee_pk);

        //FilterSelectRows(SBR_tblBody_select, filter_select);
    }  // HandleSelectFilterButtonInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        //console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        if (selected_btn === "planning"){
            selected.employee_pk = null;
            selected.employee_code = null;

            // reset filter employee_planning_selected_employee_pk. don't reset filter customer / order in detail_mode
            employee_planning_selected_employee_pk = null;
            employee_planning_selected_employee_code = "";
            if (is_planning_detail_mode){
                is_planning_detail_mode = false;
            } else {
                // reset filter customer / order, not when detail mode
                employee_planning_selected_customer = null;  // null = all, -1 = no employee
                employee_planning_selected_order = null;  // null = all, -1 = no employee
            }
// --- hide sbr button 'back to payroll overview'
           //el_sbr_select_showall.classList.add(cls_hide)
            CreatePlanningHeader();
            FillPlanningRows();
            UpdateHeaderText();
        } else {
            selected.employee_pk = null;
            selected.employee_code = null;
            selected.teammember_pk = null;

            FilterTableRows(tblBody_datatable);

            let filterRow = tblHead_datatable.rows[1];
            if(!!filterRow){
                for (let j = 0, el, len = filterRow.cells.length ; j < len; j++) {
                    if(filterRow.cells[j]){
                        el = filterRow.cells[j].children[0];
                        if(!!el){el.value = null}
            }}};

            //FilterSelectRows(SBR_tblBody_select, filter_select)
            UpdateHeaderText();
        }

    }  // function ResetFilterRows

//========= FilterSelectRows  ==================================== PR2019-11-23
    function FilterSelectRows(tblBody, filter_str) {
        //console.log( "===== FilterSelectRows  ========= ");
        //console.log( "filter_str", filter_str);
        // FilterSelectRows filters on innertext of first cell, and data-inactive not true
        for (let i = 0, len = tblBody.rows.length; i < len; i++) {
            let tblRow = tblBody.rows[i];
            if (!!tblRow){
                let hide_row = false
        // hide inactive rows when  filter_show_inactive = false
                if(!filter_show_inactive){
                    const inactive_str = get_attr_from_el(tblRow, "data-inactive")
                    if (!!inactive_str) {
                        hide_row = (inactive_str.toLowerCase() === "true")
                    }
                }
        // show all rows if filter_str = ""
                if (!hide_row && !!filter_str){
                    let found = false
                    if (!!tblRow.cells[0]) {
                        let el_value = tblRow.cells[0].innerText;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            found = (el_value.indexOf(filter_str) !== -1)
                        }
                    }
                    hide_row = (!found)
                }  // if (!!filter_str)
                if (hide_row) {
                    tblRow.classList.add(cls_hide)
                } else {
                    tblRow.classList.remove(cls_hide)
                };
            }  // if (!!tblRow){
        }  // for (let i = 0, len = SBR_tblBody_select.rows.length; i < len; i++)
    }; // FilterSelectRows

//========= FilterTableRows  ====================================
    function FilterTableRows(tblBody) {  // PR2019-06-09
        //console.log( "===== FilterTableRows  ========= ");
        //console.log( "tblBody", tblBody);
        if (!!tblBody){
            const len = tblBody.rows.length;
            if (!!len){
                for (let i = 0, tblRow, show_row; i < len; i++) {
                    tblRow = tblBody.rows[i]
                    show_row = ShowTableRow_dict(tblRow)
                    if (show_row) {
                        tblRow.classList.remove(cls_hide)
                    } else {
                        tblRow.classList.add(cls_hide)
                    };
                }
            };
        }
    }; // FilterTableRows

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15
        //console.log( "===== ShowTableRow_dict  ========= ");

        // function filters by inactive and substring of fields,
        // also filters selected pk in table absence, shift, planning
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
            const pk_int = get_attr_from_el_int(tblRow, "data-pk");

// 2. hide other employees when selected.employee_pk has value, but not when employee is replacement
            // only in table absence, shift, planning
            const tblName = get_attr_from_el(tblRow, "data-table");
            //console.log( "tblName", tblName, typeof tblName);
            if (!!selected.employee_pk) {
                if (["teammember", "planning"].indexOf(tblName) > -1) {
                    const row_employee_pk_str = get_attr_from_el(tblRow, "data-employee_pk");
                    //console.log( "row_employee_pk_str", row_employee_pk_str, typeof row_employee_pk_str);
                    //console.log( "selected.employee_pk", selected.employee_pk, typeof selected.employee_pk);
                    hide_row = (row_employee_pk_str !== selected.employee_pk.toString())
                    //console.log( "-------- hide_row", hide_row);
                }
            }
// 3. hide inactive rows if filter_show_inactive is false

        /*
    //console.log( "................filter_show_inactive", filter_show_inactive);
            if (!hide_row && !filter_show_inactive){
                const is_inactive = (get_attr_from_el(tblRow, "data-inactive") === "true")
        //console.log( "is_inactive", is_inactive);
                hide_row = is_inactive;
            }
*/
// 4. show all rows if filter_name = ""
            //console.log(  "hide_row", hide_row);
            if (!hide_row && !isEmpty(filter_dict)){

// 5. loop through keys of filter_dict
                // break doesnt work with this one: Object.keys(filter_dict).forEach(function(key) {
                for (let col_index in filter_dict) {
                    const filter_text = filter_dict[col_index];
        //console.log( "filter_text", filter_text);
                    const filter_blank = (filter_text ==="#")
                    let tbl_cell = tblRow.cells[col_index];
                    if(!hide_row && !!tbl_cell){
                        let el = tbl_cell.children[0];
                        if (!!el) {
       // skip if no filter om this colums
                            if(!!filter_text){
       // get value from el.value, innerText or data-value
                                const el_tagName = el.tagName.toLowerCase()
                                let el_value;
                                if (el_tagName === "select"){
                                    //or: el_value = el.options[el.selectedIndex].text;
                                    el_value = get_attr_from_el(el, "data-value")
                                } else if (el_tagName === "input"){
                                    el_value = el.value;
                                } else {
                                    el_value = el.innerText;
                                }
                                if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                if (!!el_value){
                                    if (filter_blank){
                                        hide_row = true;
                                        break;
                                    } else {
                                        el_value = el_value.toLowerCase();
                                        // hide row if filter_text not found
                                        if (el_value.indexOf(filter_text) === -1) {
                                            hide_row = true
                                            break;
                                        }
                                    }
                                } else {
                                    if (!filter_blank){
                                        hide_row = true
                                        break;
                                    }
                                }   // if (!!el_value)
                            }  //  if(!!filter_text)
                        }  // if (!!el) {
                    }  // if(!hide_row && !!tbl_cell)
                }
                //);  // Object.keys(filter_dict).forEach(function(key) {
            }  // if (!hide_row)
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict


//##################################################################################
// +++++++++++++++++ ABSENCE TABLE ROWS +++++++++++++++++++++++++++++++++++++++

//=========  CreateAbsenceTblHeader  === PR2020-08-10
    function CreateAbsenceTblHeader() {
        //console.log("===  CreateAbsenceTblHeader ==");
        const sel_btn = "absence";
// ---  reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
// +++  insert header row and filter row ++++++++++++++++++++++++++++++++
        const header_row = tblHead_datatable.insertRow (-1);
        const filter_row = tblHead_datatable.insertRow (-1);
//--- insert th's
        const field_setting = field_settings[sel_btn];

        if(field_setting){
            const column_count = field_setting.field_names.length;
            const field_captions =  field_setting.field_caption
            const field_names =  field_setting.field_names
            for (let i = 0; i < column_count; i++) {
                const caption = (field_captions[i]) ? loc[field_captions[i]] : null;
                const fldName = (field_names[i]) ? field_names[i] : null;
    // --- add th and div to header_row.
                let th = document.createElement("th");
                    const el_div = document.createElement("div");
    // --- add innerText to el_div
                    el_div.innerText = caption;
    // --- add width, text_align and left margin to first column
                    const class_width = "tw_" + field_setting.field_width[i] ;
                    const class_align = "ta_" + field_setting.field_align[i] ;
                    el_div.classList.add(class_width, class_align);
    // add right padding to date and number fields
                    if([3,4,5,6,7].indexOf(i) > -1) {el_div.classList.add("pr-2")};
                    th.appendChild(el_div);
                header_row.appendChild(th);
    // +++  insert filter row ++++++++++++++++++++++++++++++++
                th = document.createElement("th");
    // --- add input element
                    const el_tag = (i === 0 ) ? "div" : "input"
                    const el_input = document.createElement(el_tag);
                    if(i > 0 ) {
    // --- add EventListener
                        el_input.addEventListener("keyup", function(event){HandleFilterName(el_input, i, event)});
        // --- add attributes
                        if(fldName) {el_input.setAttribute("data-field", fldName)};
                        el_input.setAttribute("autocomplete", "off");
                        el_input.setAttribute("ondragstart", "return false;");
                        el_input.setAttribute("ondrop", "return false;");
    // --- add width, text_align and left margin to first column
                    }
                    el_input.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
    // --- append th
                th.appendChild(el_input);
                filter_row.appendChild(th);
            };
        };
    };  //  CreateAbsenceTblHeader

//========= FillAbsenceTblRows === PR2020-09-10
    function FillAbsenceTblRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
       //console.log( "====== FillAbsenceTblRows  === ");
// --- reset tblBody
        tblBody_datatable.innerText = null
// --- loop through absence_map
        // with empty data_map: !!data_map = true, data_map.size = 0
        if(absence_map.size){
            for (const [map_id, map_dict] of absence_map.entries()) {

// --- validate if absence can be added to list
                // <PERMIT> 2020-11-10
                // has_allowed_customers_or_orders means that only employees of allowed customers_ orders are shown

                let skip_row = false;
                if (has_allowed_customers || has_allowed_orders) {
                    skip_row = (!map_dict.allowed) ;
                }

                if (!skip_row){
                    const tblRow = CreateAbsenceTblRow(map_id, map_dict.id, map_dict.t_id, map_dict.e_id, -1);
                    RefreshTblRowNEW(tblRow, map_dict);
                    //if (map_dict.id === selected.teammember_pk) { tblRow.classList.add(cls_selected)}
                };
    }}  ;
    }  // FillAbsenceTblRows

//========= RefreshTblRowNEW  ============= PR2020-09-10
    function RefreshTblRowNEW(tblRow, update_dict){
        //console.log("========= RefreshTblRowNEW  =========");
        //console.log("update_dict", update_dict);

        if (tblRow && !isEmpty(update_dict)) {
// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = tblRow.cells[i].children[0];
                const fldName = get_attr_from_el(el_input, "data-field");
                if(fldName in update_dict) {
                    RefreshFieldNEW(tblRow, el_input, fldName, update_dict)
        }}};
    }  // RefreshTblRowNEW

//=========  RefreshFieldNEW  ================ PR2020-09-10
    function RefreshFieldNEW(tblRow, el_input, fldName, update_dict) {
        //console.log(" =====  RefreshFieldNEW  =====");
        //console.log("fldName", fldName);
        if(fldName && el_input && !isEmpty(update_dict)){
            const value = update_dict[fldName];
        //console.log("value", value);
        //  absence: ["employee", "order", "datefirst", "datelast", "workminutesperday", "delete"],
            if (["code", "o_code", "c_code", "t_code", "e_code", "rpl_code"].indexOf( fldName ) > -1){
                el_input.innerText = (value) ? value : "---";
            } else if (["identifier", "payrollcode"].indexOf( fldName ) > -1){
                el_input.innerText = (value) ? value : null;
            } else if (["datefirst", "datelast", "s_df", "s_dl", "tm_df", "tm_dl"].indexOf( fldName ) > -1){
                const date_formatted = format_dateISO_vanilla (loc, value, true, false);
                 // add linebreak on empty cell, otherwise eventlistener doesn't work
                el_input.innerText = (date_formatted) ? date_formatted : "\n";
            } else if (["workhoursperweek", "workminutesperday", "leavedays"].indexOf( fldName ) > -1){
                let quotient = null;
                if(Number(value)){
                    const divisor = (fldName === "leavedays") ? 1440 : 60;
                    quotient = value / divisor;
                }
                el_input.innerText = (quotient) ? quotient : "\n";

            } else if (["sh_os_arr", "sh_oe_arr"].indexOf( fldName ) > -1){
                const offset = (value) ? value[0] : null;
                let display_text = display_offset_time (loc, offset);
                 // hard return necessary to display hover or green OK field when it is empty
                if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;
            } else if (["sh_bd_arr", "sh_td_arr"].indexOf( fldName ) > -1){
                const duration = (value) ? value[0] : 0;
                el_input.innerText = display_duration (duration, loc.user_lang);
            } else if (fldName === "inactive"){
                //const img_class = (value) ? "inactive_1_3" : "inactive_0_2
                //refresh_background_class(el_input, img_class)";
                add_or_remove_class(el_input,"inactive_1_3", value, "inactive_0_2"  )
                el_input.title = (value) ? loc.Click_to_make_this_employee_active : loc.Click_to_make_this_employee_inactive;
                tblRow.setAttribute("data-inactive", value);
            }
        };  // if(!!el_input)
    }  // RefreshFieldNEW

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@


//=========  CreateAbsenceTblRow  ================ PR2019-08-29 PR2020-08-10
    function CreateAbsenceTblRow(map_id, pk_str, ppk_str, employee_pk, row_index) {
        //console.log("=========  CreateAbsenceTblRow =========");
        const tblName = "absence";
        const sel_btn = "absence";
        let tblRow = null;
        const field_setting = field_settings[sel_btn];

        if(field_setting){
            const column_count = field_setting.field_names.length;
            //console.log("column_count", column_count);
// +++  insert tblRow into tblBody
            tblRow = tblBody_datatable.insertRow(row_index)
            tblRow.id = map_id;
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-pk", pk_str);
            if(employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow)}, false);
//+++ insert td's into tblRow
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create element
                let el = document.createElement("div");
    // --- add field_name in data-field Attribute
                el.setAttribute("data-field", field_setting.field_names[j]);
    // --- add img delete to col_delete
                if (j === column_count - 1) {
                    append_background_class(el,"delete_0_1", "delete_0_2")
    // --- add EventListener
                    el.addEventListener("click", function() {ModConfirmOpen("delete", tblRow)}, false )
                } else if (j){
                    el.addEventListener("click", function() {MAB_Open(el)}, false)
                    add_hover(el);
                }
    // --- add field_width and text_align
                el.classList.add("tw_" + field_setting.field_width[j],
                                 "ta_" + field_setting.field_align[j]);
    // add right padding to date and number fields
                if([3,4,5,6,7].indexOf(j) > -1) {el.classList.add("pr-2")};
    // --- add element to td.
                td.appendChild(el);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_setting)
        return tblRow
    };  // CreateAbsenceTblRow

//========= UpdateAbsenceTblRow  ====== PR2020-08-08
    function UpdateAbsenceTblRow(tblRow, map_id, map_dict){
        //console.log("========= UpdateAbsenceTblRow  =========");
        //console.log("map_dict", map_dict);
        if (tblRow && !isEmpty(map_dict)) {
            const update_status = get_dict_value(map_dict, ["status", "updated"])
            //console.log("update_status", update_status);
// --- loop through cells of tblRow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = tblRow.cells[i].children[0];
                if(el_input){
                    const fldName = get_attr_from_el(el_input, "data-field");
                //  absence: ["employee", "order", "datefirst", "datelast", "workminutesperday", "delete"],
                    if (fldName === "employee"){
                        el_input.innerText = map_dict.e_code
                    } else if (fldName === "replacement"){
                        el_input.innerText = map_dict.rpl_code;
                    } else if (fldName === "order"){
                        let inner_text = ( (selected_btn === "teammember") ?  map_dict.c_code + " - " : "" ) + map_dict.o_code
                        // remove tilde from abscat PR2020-08-14
                        if (selected_btn === "absence" && inner_text.includes("~")){inner_text = inner_text.replace(/~/g,"")}
                        el_input.innerText = inner_text;
                    } else if (fldName === "team"){
                        el_input.innerText = map_dict.t_code
                    } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                        let date_iso = null;
                        if (selected_btn === "absence") {
                            // absence gets datefirst / datelast from scheme table
                            date_iso = (fldName === "datefirst") ? map_dict.s_df : map_dict.s_dl;
                        } else {
                            date_iso = (fldName === "datefirst") ? map_dict.tm_df : map_dict.tm_dl;
                        }
                        const date_formatted = format_dateISO_vanilla (loc, date_iso, true, false);
                        // add linebreak on empty cell, otherwise eventlistener does not work
                        el_input.innerText = (date_formatted) ? date_formatted : "\n";

                    } else if (["timestart", "timeend"].indexOf( fldName ) > -1){
                        let display_text = null;
                        if (fldName === "timestart" && map_dict.sh_os_arr) {
                            display_text = display_offset_time (loc, map_dict.sh_os_arr[0]);
                        } else if (fldName === "timeend" && map_dict.sh_os_arr) {
                            display_text = display_offset_time (loc, map_dict.sh_oe_arr[0]);
                        };
                        // hard return necessary to display hover or green OK field when it is empty
                        if (!display_text){display_text = "\n"}
                        el_input.innerText = display_text

                    } else if (fldName === "timeduration"){
                        let time_duration = (map_dict.sh_td_arr) ? map_dict.sh_td_arr[0] : 0;
                        let display_text = display_duration (time_duration, loc.user_lang);
                        // hard return necessary to display hover or green OK field when it is empty
                        if (!display_text){display_text = "\n"}
                        el_input.innerText = display_text
                    }
// ---  make _updated el_input green for 2 seconds
// make changed fields green
                    if(update_status) {
                        const is_updated = update_status.includes(fldName);
                        if(is_updated){
                           ShowOkElement(el_input, "border_bg_valid")
                        }
                    }
                };  // if(!!el_input)
            }  //  for (let j = 0; j < 8; j++)
        };  // if (!!map_dict && !!tblRow)
    }  // UpdateAbsenceTblRow

//##################################################################################
// +++++++++++++++++ TEAMMEMBER ROWS +++++++++++++++++++++++++++++++++++++++


//=========  CreateTeammemberHeader  === PR2020-08-08
    function CreateTeammemberHeader() {
        //console.log("===  CreateTeammemberHeader ==");
        const tblName = "teammember";
// ---  reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
// +++  insert header row and filter row ++++++++++++++++++++++++++++++++
        const header_row = tblHead_datatable.insertRow (-1);
        const filter_row = tblHead_datatable.insertRow (-1);

//--- insert th's
        const field_setting = field_settings[tblName];
        if(field_setting){
            const field_names = field_setting.field_names;
            const column_count = field_names.length;
            const filter_tags = field_setting.filter_tags;
            const field_width = field_setting.field_width;
            const field_align = field_setting.field_align;

            const field_captions =  field_setting.field_caption
            for (let i = 0; i < column_count; i++) {
                const caption = (field_captions[i]) ? loc[field_captions[i]] : null;
                const fldName = (field_names[i]) ? field_names[i] : null;
                const filter_tag = (filter_tags[i]) ? filter_tags[i] : null;
                const class_width = (field_width[i]) ? field_width[i] : null;
                const class_align = (field_align[i]) ? field_align[i] : null;

    // --- add th and div to header_row.
                let th = document.createElement("th");
                    const el_div = document.createElement("div");
    // --- add innerText to el_div
                    el_div.innerText = caption;
    // --- add width, text_align and left margin to first column
                    el_div.classList.add(class_width, class_align);
    // --- add width, text_align and left margin to first column
                    th.appendChild(el_div);
                header_row.appendChild(th);
// +++  insert filter row ++++++++++++++++++++++++++++++++
                th = document.createElement("th");
    // --- add input element
                    const el_tag = (i === 0 ) ? "div" : "input"
                    const el_filter = document.createElement(el_tag);
                    if(i > 0 ) {
    // --- add EventListener
                        const event_str = (["text", "amount"].indexOf(filter_tag) > -1) ? "keyup" : "click";
                        el_filter.addEventListener(event_str, function(event){HandleFilterField(el_filter, i, event.key)});
        // --- add attributes
                        el_filter.setAttribute("data-field", fldName);
                        el_filter.setAttribute("data-filtertag", filter_tag);

                        el_filter.setAttribute("autocomplete", "off");
                        el_filter.setAttribute("ondragstart", "return false;");
                        el_filter.setAttribute("ondrop", "return false;");
    // --- add width, text_align and left margin to first column
                        el_filter.classList.add(class_width, class_align);
                    }
                    el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
    // --- append th
                th.appendChild(el_filter);
                filter_row.appendChild(th);
            };
        };
    };  //  CreateTeammemberHeader

//========= FillTeammemberRows === PR2020-08-08
    function FillTeammemberRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
        //console.log( "====== FillTeammemberRows  === ");

// --- reset table,
        tblBody_datatable.innerText = null

        const data_map = teammember_map;
        if(data_map){
// --- loop through data_map
            for (const [map_id, map_dict] of data_map.entries()) {
                let row_tblName = null, pk_int = null,  ppk_int = null, is_absence = false, row_employee_pk = null;

                row_tblName = map_dict.table;
                pk_int = map_dict.id;
                ppk_int = map_dict.t_id;
                is_absence =  map_dict.isabsence;
                row_employee_pk = map_dict.e_id;

// TODO: add filter
                let add_Row = (!is_absence);
                if (add_Row){
                    const row_index = -1;
                    let tblRow = CreateTblRowTeammember(tblBody_datatable, pk_int, ppk_int, row_employee_pk, row_index)
                    UpdateTeammemberTblRow(tblRow, map_id, map_dict)
// --- highlight selected row
                    if (pk_int === selected.employee_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }  // if (add_Row)
            }  // for (const [map_id, map_dict] of data_map.entries())
        }  // if(!!data_map)

        //console.log("FillPlanningRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // FillTeammemberRows

//=========  CreateTblRowTeammember  ================ PR2019-08-29
    function CreateTblRowTeammember(tblBody, pk_str, ppk_str, employee_pk, row_index) {
        //console.log("=========  CreateTblRowTeammember =========", selected_btn);
        // only called by FillTeammemberRows PR2020-11-20
        const tblName =  "teammember";

        // btn calendar and form have no table
        let tblRow = null
        const field_setting = field_settings[selected_btn];
        if(field_setting){
            const field_names = field_setting.field_names;
            const column_count = field_names.length;
            const field_width = field_setting.field_width;
            const field_align = field_setting.field_align;

    // --- insert tblRow into tblBody
            //console.log("row_index", row_index, typeof row_index);
            if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09\\
            const row_count = tblBody.rows.length;
            if(row_index >= row_count ) {row_index = -1}
            tblRow = tblBody.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.

            //console.log("tblRow", tblRow);
            const map_id = get_map_id(tblName, pk_str)
            tblRow.setAttribute("id", map_id);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-pk", pk_str);
            tblRow.setAttribute("data-ppk", ppk_str);

            if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

    // --- check if row is addnew row - when pk is NaN
            const is_new_row = !parseInt(pk_str); // don't use Number, "545-03" wil give NaN

    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow)}, false);

//+++ insert td's into tblRow
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
    // --- create div element
                let el = document.createElement("div");
    // --- add data-field Attribute
                const field_name = field_names[j];
                el.setAttribute("data-field", field_name);
    // --- add img delete to col_delete, not when is_new_row
                if ( (j === column_count - 1) && !is_new_row && (["employee", "absence"].indexOf(selected_btn) > -1) ) {
                    CreateBtnDeleteInactive("delete", tblRow, el);
                } else {
    // --- add type and input_text to el.
                    el.setAttribute("type", "text")
                }
    // --- add other classes to td - Necessary to skip closing popup
                el.classList.add("border_none", "pointer_show");
                //el.classList.add("tsa_bc_transparent");
                el.readOnly = true;
    // --- add EventListeners
                if ([0, 5].indexOf( j ) > -1){
                    //el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )
                    //el.classList.add("input_text");
                } else if ([1, 2].indexOf( j ) > -1){
                    //el.classList.add("input_text");
                        // cannot change order and team in shifts.
                } else if ([3,4].indexOf( j ) > -1){
                   // TODO eventhandler el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                   // el.classList.add("input_popup_date");
                }

    // --- add left margin to first column,
                if (j === 0 ){el.classList.add("ml-2");}

    // --- add field_width and text_align
                el.classList.add("tw_" + field_width[j], "ta_" + field_align[j]);
    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");
    // --- add element to td.
                td.appendChild(el);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[selected_btn])
        return tblRow
    };  // CreateTblRowTeammember

//========= UpdateTeammemberTblRow  ============= PR2020-08-08
    function UpdateTeammemberTblRow(tblRow, map_id, map_dict){
        //console.log("========= UpdateTeammemberTblRow  =========");
        //console.log("map_dict", map_dict);
          // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function

        if (tblRow && !isEmpty(map_dict)) {
            tblRow.setAttribute("data-inactive", map_dict.e_inactive)
            const update_status = get_dict_value(map_dict, ["status", "updated"])
            //console.log("update_status", update_status);
// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = tblRow.cells[i].children[0];
                if(el_input){
                    const fldName = get_attr_from_el(el_input, "data-field");
                //  absence: ["employee", "order", "datefirst", "datelast", "workminutesperday", "delete"],
                    if (fldName === "employee"){
                        // el_input.innerText = map_dict.e_code
                        el_input.innerText = get_dict_value(map_dict, ["employee", "code"], "---")
                    } else if (fldName === "replacement"){
                        //el_input.innerText = map_dict.rpl_code;
                        el_input.innerText = get_dict_value(map_dict, ["replacement","code"])
                    } else if (fldName === "order"){
                        //const inner_text = ( (selected_btn === "teammember") ?  map_dict.c_code + " - " : "" ) + map_dict.o_code
                        //el_input.innerText = inner_text;
                        el_input.innerText = get_dict_value(map_dict, ["order","display"])
                    } else if (fldName === "scheme"){
                        //el_input.innerText = map_dict.s_code
                        el_input.innerText = get_dict_value(map_dict, ["scheme","code"])
                    } else if (fldName === "team"){
                        //el_input.innerText = map_dict.t_code
                        el_input.innerText = get_dict_value(map_dict, ["team","code"])
                    } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                        let date_iso = null;
                        if (selected_btn === "absence") {
                            // absence gets datefirst / datelast from scheme table
                            date_iso = (fldName === "datefirst") ? map_dict.s_df : map_dict.s_dl;
                        } else {
                            date_iso = (fldName === "datefirst") ? map_dict.tm_df : map_dict.tm_dl;
                        }
                        const date_formatted = format_dateISO_vanilla (loc, date_iso, true, false);
                        // add linebreak on empty cell, otherwise eventlistener does not work
                        el_input.innerText = (date_formatted) ? date_formatted : "\n";
                    } else if (fldName === "timeduration"){
                        let time_duration = (map_dict.sh_td_arr) ? map_dict.sh_td_arr[0] : 0;
                        el_input.innerText = display_duration (time_duration, loc.user_lang);
                    }
// ---  make _updated el_input green for 2 seconds
                    if(update_status) {
                        const is_updated = update_status.includes(fldName);
                        if(is_updated){
                           ShowOkElement(el_input, "border_bg_valid")
                        }
                    }
                };  // if(!!el_input)
            }  //  for (let j = 0; j < 8; j++)

        };  // if (!!map_dict && !!tblRow)
    }  // UpdateTeammemberTblRow

//##################################################################################
// +++++++++++++++++ CALCULATE PLANNING DICT +++++++++++++++++++++++++++++++++++++++

//========= calculate_workingdays  ====================================
    function calculate_workingdays(period_datefirst_iso, period_datelast_iso, employee_datefirst_iso, employee_datelast_iso) {
         //console.log( "calculate_workingdays");
        let workingdays = 0;

        if (period_datefirst_iso && period_datelast_iso) {
            const datefirst_iso = (employee_datefirst_iso && employee_datefirst_iso > period_datefirst_iso ) ? employee_datefirst_iso : period_datefirst_iso
            const datelast_iso = (employee_datelast_iso && employee_datelast_iso < period_datelast_iso ) ? employee_datelast_iso : period_datelast_iso

            let date_iso = datefirst_iso
            let date_JS = get_dateJS_from_dateISO_vanilla(date_iso);
            // In Do While loop, condition is tested at the end of the loop so, Do While executes the statements in the code block at least once
            while (date_iso <= datelast_iso ) {
                // check weekday of date_JS
                let weekday_index = (date_JS.getDay()) ? date_JS.getDay() : 7
                // skip saturday and sunday
                if([6,7].indexOf(weekday_index) === -1 ) {
                // skip public holday
                    const is_ph = get_dict_value(selected_planning_period, [date_iso, "ispublicholiday"], false);
                    if (!is_ph) {
                        workingdays += 1
                    }
                }
                change_dayJS_with_daysadd_vanilla(date_JS, 1)
                date_iso = get_dateISO_from_dateJS(date_JS)
            };
        };
        return workingdays;
    }  // calculate_workingdays

//========= calc_planning_agg_dict  ==================================== PR2020-07-09
    function calc_planning_agg_dict(short_list_sorted) {
       //console.log( "===== calc_planning_agg_dict  ========= ");
/*
- map_dict gets values from employee_rows
- dict gets values from employee_planning_listNEW:
        absdur: 0, breakduration: 0, c_code: "Centrum", c_id: 749, c_o_code: "Centrum - Piscadera"
        e_code: "Agata MM", e_id: 2625, e_identifier: "199110", e_payrollcode: "xxx"
        emplhour_id: null, employee_id: 2625
        exceldate: 44146, excelend: 63570240, excelstart: 63570240
        fid: "1980_4189_2020-11-11", fnc_code: "Hello234", fnc_id: 81,
        isabsence: false, isreplacement: false, isrestshift: true,
        note: null, note_absent_eid: null, o_code: "Piscadera", o_id: 1521, o_identifier: "O-008", o_nopay: false,
        offsetend: null, offsetstart: null,
        pdc_code: "Wekelijks t/m zaterdag", pdc_id: 21
        plandur: 0, rosterdate: "2020-11-11", sh_code: "Rust dienst", sh_id: 1662, timedur: 0, totaldur: 0,
        wfc_code: "W100", wfc_id: 11, wfc_rate: 1000000, wgc_code: null, wgc_id: null
*/
        const period_workingdays = get_dict_value(selected_planning_period, ["period_workingdays"], 0)
        const period_datefirst_iso = get_dict_value(selected_planning_period, ["period_datefirst"])
        const period_datelast_iso = get_dict_value(selected_planning_period, ["period_datelast"])

        let planning_agg_list = [];

// convert short_list_sorted row into agg_dict
        // agg_dict = { employee_pk: [employee_pk, employee_code, employee_allowed, contracthours_sum, workinghours_sum, absence_sum] }
        let agg_dict = {}
        short_list_sorted.forEach(function (dict, index) {
            //console.log( "index ", index,  "short_list_sorted dict ", dict);
            const employee_pk = (dict.e_id) ? dict.e_id : -1;
    // ---  add agg_dict[employee_pk] if it doesn't exist
            if (!(employee_pk in agg_dict) ) {
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
                const employee_code = (map_dict.code) ? map_dict.code : "---";
                const employee_allowed = (map_dict.allowed) ? map_dict.allowed : false;
                const workhoursperday = get_dict_value(map_dict, ["workhoursperweek", "value"], 0 ) / 5
                const contracthours_sum =  period_workingdays * workhoursperday;
               // const workhoursperday = get_dict_value(map_dict, ["workhoursperday", "value"] )
               //console.log( "dict ", dict)
               //console.log( "map_dict ", map_dict)
               //console.log( "employee_pk ", employee_pk,  "employee_code ", employee_code,  "employee_allowed ", employee_allowed);
                agg_dict[employee_pk] = [
                    employee_pk,
                    employee_code,
                    employee_allowed,
                    contracthours_sum,
                    0, //  agg_row[4] = plannedhours
                    0  // agg_row[5] = absencehours
                ];
            }
            if(dict.plandur) { agg_dict[employee_pk][4] += dict.plandur};
            if(dict.absdur) { agg_dict[employee_pk][5] += dict.absdur};
        });

        let row_count = 0
//--- add row with empty employee, if any
        // employee_pk = -1 means no employee
        if(-1 in agg_dict) {
            const agg_row = get_dict_value(agg_dict, [-1])
            let plannedhours = 0;
            if (agg_row){ plannedhours = agg_row[4]};
            const row = [-1, "---", false, period_workingdays, 0, plannedhours, 0, 0];
            planning_agg_list.push(row)
            row_count += 1;
        }

        if (employee_map.size){
//--- loop through employee_map
            for (const [map_id, map_dict] of employee_map.entries()) {
                const employee_pk = map_dict.id;
                const employee_code = (map_dict.code) ? map_dict.code :  "---";
                const employee_allowed = (map_dict.allowed) ? map_dict.allowed : false;
                const is_inactive = (map_dict.inactive) ? map_dict.inactive : false;
                let row = []
                // check first date in service / last date in service
                let fdis_full = false, fdis_not = false, ldis_full = false, ldis_not = false
                if(!map_dict.datefirst || map_dict.datefirst <= period_datefirst_iso ) {
                    // in service ( first date in service on or before start of period )
                    fdis_full = true;
                } else if(map_dict.datefirst > period_datelast_iso) {
                    // not in service ( first date in service after end of period )
                    fdis_not = true;
                }
                if(!map_dict.datelast || map_dict.datelast >= period_datelast_iso ) {
                    // in service ( last date in service on or after end of period )
                    ldis_full = true;
                } else if(map_dict.datelast < period_datefirst_iso) {
                    // not in service ( last date in service before start of period )
                    ldis_not = true;
                }

//--- add employee to planning_agg_list
                if ( !employee_allowed ) {
                    // skip if employee is not in service during period, unless is has shifts during that period
                } else if ( (fdis_not || ldis_not || is_inactive ) && !(employee_pk in agg_dict) ) {
                    // skip employee that is not in service or is_inactive, except when in agg_dict
                } else {
                    let contracthours = 0, plannedhours = 0, absencehours = 0, difference = 0, workingdays = 0
                    if (fdis_full && ldis_full) {
                        workingdays = period_workingdays;
                    } else {
                        workingdays = calculate_workingdays(period_datefirst_iso, period_datelast_iso, map_dict.datefirst, map_dict.datelast);
                    }
                    contracthours = workingdays * map_dict.workhoursperweek / 5;

                    const agg_row = get_dict_value(agg_dict, [employee_pk])
                    if (agg_row){
                        plannedhours = agg_row[4];
                        absencehours = agg_row[5];
                    }
                    difference = plannedhours + absencehours - contracthours;

                    row = [employee_pk, employee_code, workingdays, contracthours, plannedhours, absencehours, difference]

                    planning_agg_list.push(row)
                } // if (fdis_not || ldis_not ) && !(employee_pk in agg_dict) {
                row_count += 1;
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)

       //console.log( "planning_agg_list ", planning_agg_list);
        return planning_agg_list
    }  // calc_planning_agg_dict

//========= CreateHTML_planning_agg_list  ==================================== PR2020-07-10
    function CreateHTML_planning_agg_list(planning_agg_list) {
       //console.log("==== CreateHTML_planning_agg_list  ========= ");
       //console.log(" planning_agg_list", planning_agg_list);

        // html_planning_agg_list = [ 0:employee_pk, 1: employee_code 2: contract_hours, 3:worked_hours,
        //                             4:absence_hours, 5:difference ]
        // table columns: [ 0: employee_code 1: contract_hours, 2: worked_hours,
        //                             3: absence_hours, 4: difference ]
        //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]

        html_planning_agg_list = [];
        for (let i = 0, item; item = planning_agg_list[i]; i++) {
            let td_html = [];
            const employee_pk = item[0];
            const employee_code = (item[1]) ? item[1] : "";
            const employee_allowed = (item[2]) ? item[2] : false;

       //console.log("item", item);
       //console.log("employee_allowed", employee_allowed);

            if (employee_allowed) {
// --- put values of agg_dict in proper column
                let row_data = item;
    // add margin column
                td_html[0] =  "<td><div class=\"ta_c\"></div></td>"
    // add employee_code
                const display_text = (employee_code) ? employee_code : "---";
                td_html[1] = "<td><div>" + display_text + "</div></td>"
    // add working days
                td_html[2] = "<td><div class=\"ta_c\">" + item[2], + "</div></td>"
    // --- add contract_hours worked_hours, absence_hours, difference
                for (let i = 3; i < 7; i++) {
                    let duration_formatted = format_total_duration (item[i], loc.user_lang);

                    td_html[i] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                }
    // add margin at the end
                td_html[7] = "<td><div class=\"ta_c\"></div></td>"
    // --- add filter_data
                let filter_data = [];
                filter_data[1] = (employee_code) ? employee_code.toLowerCase() : null
                filter_data[2] = (item[2]) ? item[2] : null
                for (let i = 3; i < 7; i++) {
                    filter_data[i] = (item[i]) ? item[i] : null
                }
    //--- put td's together
                let row_html = "";
                for (let j = 0, item; item = td_html[j]; j++) {
                    if(item){row_html += item};
                }
                //  html_planning_agg_list = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
                const row = [true, employee_pk, filter_data, row_data, row_html];
                html_planning_agg_list.push(row);
            } // if (employee_allowed)
        }  //  for (let i = 0, item;

        //console.log(" html_planning_agg_list", html_planning_agg_list);
        return html_planning_agg_list;
    }  // CreateHTML_planning_agg_list

//========= CreateHTML_planning_detail_list  ==================================== PR2020-07-10
    function CreateHTML_planning_detail_list(planning_short_list_sorted) {
        //console.log("==== CreateHTML_planning_detail_list  ========= ");

        // html_planning_agg_list = [ 0:employee_pk, 1: employee_code 2: contract_hours, 3:worked_hours,
        //                             4:absence_hours, 5:difference ]
        // table columns: [ 0: employee_code 1: contract_hours, 2: worked_hours,
        //                             3: absence_hours, 4: difference ]
        //  html_planning_detail_list = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]

        html_planning_detail_list = [];
        for (let i = 0, item; item = planning_short_list_sorted[i]; i++) {
            const employee_pk = (item.e_id) ? item.e_id : -1;  // employee_pk = -1 means no emplyee
            const employee_code = (item.e_code) ? item.e_code : "---";
            const cust_ord_code = (item.c_o_code) ? item.c_o_code : "";
            const shift_code = (item.sh_code) ? item.sh_code : "";
            const rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(item.rosterdate), false, true);
            const planned_hours = (item.plandur) ? item.plandur : 0
            const absence_hours = (item.absdur) ? item.absdur : 0
            const planned_hours_formatted = format_total_duration (planned_hours, loc.user_lang);
            const absence_hours_formatted = format_total_duration (absence_hours, loc.user_lang);

        //console.log("item", item);
        //console.log("employee_code", employee_code);
        //console.log("cust_ord_code", cust_ord_code);
        //console.log("planned_hours_formatted", planned_hours_formatted);

// --- put values of agg_dict in proper column
            let td_html = [], row_data = [],  filter_data = [];
// add margin column
            td_html[0] = "<td><div class=\"ta_c\"></div></td>";
// ---  add rosterdate in second column
            row_data[1] = item.rosterdate;
            filter_data[1] = (rosterdate_formatted) ? rosterdate_formatted : null;
            td_html[1] = "<td><div class=\"ta_l\">" + rosterdate_formatted + "</div></td>";
// ---  add customer and order
            row_data[2] = cust_ord_code;
            filter_data[2] = (cust_ord_code) ? cust_ord_code.toLowerCase() : null;
            td_html[2] = "<td><div class=\"ta_l\">" + cust_ord_code + "</div></td>"
// ---  add shift
            row_data[3] = shift_code;
            filter_data[3] = (shift_code) ? shift_code.toLowerCase() : null;
            td_html[3] = "<td><div class=\"ta_l\">" + shift_code + "</div></td>";
// ---  add planned hours
            row_data[4] = planned_hours;
            filter_data[4] = (planned_hours) ? planned_hours : null;
            td_html[4] = "<td><div class=\"ta_r\">" + planned_hours_formatted + "</div></td>";
// ---  add absence_hours hours
            row_data[5] = absence_hours;
            filter_data[5] = (absence_hours) ? absence_hours : null;
            td_html[5] = "<td><div class=\"ta_r\">" + absence_hours_formatted + "</div></td>";
// add margin at the end
            td_html[6] = "<td><div class=\"ta_c\"></div></td>"

//--- put td's together
            let row_html = "";
            for (let j = 0, item; item = td_html[j]; j++) {
                if(item){row_html += item};
            }
            //  html_planning_detail_list = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html, 5: fid, 6: c_id, 7: o_id ]
            const row = [true, employee_pk, filter_data, row_data, row_html, item.fid, item.c_id, item.o_id];
            html_planning_detail_list.push(row);
        }  //  for (let i = 0, item; item = html_planning_detail_list[i]; i++) {
    }  // CreateHTML_planning_detail_list

//========= FillPlanningRows  ====================================
    function FillPlanningRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
       //console.log( "====== FillPlanningRows  === ");
        const employee_planning_customer_list = get_dict_value(employee_planning_customer_dictlist, [employee_planning_selected_customer]);
        const employee_planning_order_list = get_dict_value(employee_planning_order_dictlist, [employee_planning_selected_order]);
        const has_selected_customer = (employee_planning_customer_list && !!employee_planning_customer_list.length);
        const has_selected_order = (employee_planning_order_list && !!employee_planning_order_list.length);

        tblBody_datatable.innerText = null

        ResetPlanningTotalrow();

// +++++ loop through html_planning_detail_list / html_planning_agg_list
        //  html_planning_detail_list = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        const detail_rows = (is_planning_detail_mode) ? html_planning_detail_list : html_planning_agg_list;
        detail_rows.forEach(function (item, index) {

// filter selected employee when is_planning_detail_mode
        const employee_pk = item[1];
        let show_row =(!is_planning_detail_mode || employee_pk === employee_planning_selected_employee_pk)

// filter employees of selected order / customer
        if(show_row){
        // in detail_mode: when 'no employee' selected: show only shifts of selected customer / order
            if (has_selected_order) {
                show_row = employee_planning_order_list.includes(employee_pk);
            } else  if (has_selected_customer) {
                show_row = employee_planning_customer_list.includes(employee_pk);
            }


            if(show_row && is_planning_detail_mode && employee_planning_selected_employee_pk === -1){
                show_row = (employee_pk === -1);
                if (has_selected_order) {
                    show_row = (employee_planning_selected_order === item[7]);
                } else  if (has_selected_customer) {
                    show_row = (employee_planning_selected_customer === item[6]);
                }
            }
        }

    //console.log( "show_row1 ", show_row);
            let filter_row = null, row_data = null, tblRow = null;
            if(show_row){
                filter_row = item[2];
                row_data = item[3];
                show_row = t_ShowTableRowExtended(filter_row, filter_dict);
            }
            item[0] = show_row;
        //console.log( "show_row", show_row);
            if (show_row){
                tblRow = tblBody_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add empoyee_pk as id to tblRow
                if(item[1]){tblRow.id = item[1] };
    // --- put fid in data-pk when is_planning_detail_mode
                if (is_planning_detail_mode) {tblRow.setAttribute("data-pk", item[5]) }
    // --- add EventListener to tblRow.
                tblRow.addEventListener("click", function() {HandleAggRowClicked(tblRow)}, false);
                add_hover(tblRow)
                tblRow.innerHTML += item[4];
    // --- add duration to total_row.
                AddToPlanningTotalrow(row_data);
            }
    // --- hide sbr button 'back to payroll overview'
           //el_sbr_select_showall.classList.add(cls_hide)

        })
        UpdatePayrollTotalrow()
        //console.log("FillPlanningRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // FillPlanningRows

//========= AddToPlanningTotalrow  ================= PR2020-08-11
    function AddToPlanningTotalrow(row_data) {
        //console.log( "===== AddToPlanningTotalrow  === ");
        //console.log("row_data",  row_data);
        //console.log("selected.employee_code",  employee_planning_selected_employee_code);
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            for (let i = 2, len = row_data.length; i < len; i++) {
                if (is_planning_detail_mode && i === 2){
                    if(!planning_total_row[i]){planning_total_row[i] = employee_planning_selected_employee_code};
                } else if (row_data[i]) {
                    const value_number = Number(row_data[i])
                    if(!!value_number){
                        if(!planning_total_row[i]){
                            planning_total_row[i] = value_number;
                        } else {
                            planning_total_row[i] += value_number;
        }}}}};
        //console.log("planning_total_row",  planning_total_row);
    }  // AddToPlanningTotalrow

//========= ResetPlanningTotalrow  ================= PR2020-08-11
    function ResetPlanningTotalrow() {
        //console.log("======= ResetPlanningTotalrow  ========= ");
        // copy number of columns from header row
        planning_total_row = []
        if(planning_header_row && planning_header_row.length > 1){
            planning_total_row[1] = loc.Total_hours;
            for (let i = 2, len = planning_total_row.length; i < len; i++) {
                planning_total_row[i] = 0;
        }}
    }  // ResetPlanningTotalrow

//========= UpdatePayrollTotalrow  ================= PR2020-06-16
    function UpdatePayrollTotalrow() {
        //console.log("======== UpdatePayrollTotalrow  ========= ");
        //console.log(planning_total_row);
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        const tblRow = document.getElementById("id_payroll_totalrow");

        if (tblRow){
// --- loop through cells of tablerow, skip first two columns "Total hours", blank (rosterdate)
            for (let i = 2, cell; cell=tblRow.cells[i]; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = cell.children[0];
                if(!!el_input){
                    let display = null;
                    if (is_planning_detail_mode && i === 2) {
                        if(planning_total_row[2]){ display = planning_total_row[2]}
                    } else {
                        if(i === 2){
                            // format_pricerate (loc.user_lang, value_int, is_percentage, show_zero, no_decimals) {
                            display = format_pricerate (loc.user_lang, 100 * planning_total_row[i], false, false); // is_percentage = false, show_zero = false
                        } else {
                            display = format_total_duration(planning_total_row[i]);
                        }
                    }
                    el_input.innerText = display;
                };
            }
        }
    }  // UpdatePayrollTotalrow

//=========  CreatePlanningHeader  === PR2020-05-24 PR2020-08-11
    function CreatePlanningHeader() {
        //console.log("===  CreatePlanningHeader ==");

        const tblName = (is_planning_detail_mode) ? "payroll_detail" : "payroll_agg";
        const field_setting = field_settings[tblName];
        //console.log("field_setting", field_setting);

// ---  reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null

        if(field_setting){
            const field_names = field_settings[tblName].field_names;
            const field_captions = field_settings[tblName].field_caption;
            const field_filter_tags = field_settings[tblName].filter_tags;
            const field_widths = field_settings[tblName].field_width;
            const field_aligns = field_settings[tblName].field_align;
            const column_count = field_names.length;

            if(column_count){

// +++  insert header rows ++++++++++++++++++++++++++++++++
                const tblRow_header = tblHead_datatable.insertRow (-1);
                const tblRow_filter = tblHead_datatable.insertRow (-1);
                const total_row = tblHead_datatable.insertRow (-1);

//--- insert th's to tblRow_header
                for (let i = 0; i < column_count; i++) {
                    const fldName = (field_names[i]) ? field_names[i] : null;
                    const caption = (field_captions[i]) ? loc[field_captions[i]] : null;
                    const filter_tag = field_filter_tags[i];
                    const class_width = "tw_" + field_widths[i] ;
                    const class_align = "ta_" + field_aligns[i];

// ++++++++++ create header row +++++++++++++++
// --- add th to tblRow_header
                    const th_header = document.createElement("th");
                        const el_header = document.createElement("div");
        // --- add EventListener to 'back' cell
                        if (i === 0 && is_planning_detail_mode) {
                            el_header.innerText = "<";
                            el_header.addEventListener("click", function(event){ResetFilterRows()});
                            el_header.title = loc.Back_to_previous_level
                            add_hover(el_header)
                        } else if(caption) {
        // --- add innerText to el_div
                            el_header.innerText = caption;
                        }
        // --- add width, text_align and left margin to first column
                        el_header.classList.add(class_width, class_align);
        // add right padding to number fields
                        if (["amount", "duration", "duration", "duration", "duration" ].indexOf(fldName) > -1) {
                            el_header.classList.add("pr-2")
                        };
        // --- add width, text_align and left margin to first column
                        th_header.appendChild(el_header);
                    tblRow_header.appendChild(th_header);

// ++++++++++ create filter row +++++++++++++++
        // --- add th to tblRow_filter.
                   const th_filter = document.createElement("th");
        // --- add element with tag 'div' or 'input'
                        const el_tag = (i === 0 ) ? "div" : "input"
                        const el_filter = document.createElement(el_tag);
                            if(i > 0 ) {
        // --- add EventListener
                                el_filter.addEventListener("keyup", function(event){HandlePayrollFilter(el_filter, i, event)});
        // --- add attributes field, filtertag
                                el_filter.setAttribute("data-field", fldName);
                                el_filter.setAttribute("data-filtertag", filter_tag);
                            }
        // --- add other attributes
                            if (["text", "amount"].indexOf(filter_tag) > -1) {
                                el_filter.setAttribute("type", "text")
                                el_filter.classList.add("input_text");

                                el_filter.setAttribute("autocomplete", "off");
                                el_filter.setAttribute("ondragstart", "return false;");
                                el_filter.setAttribute("ondrop", "return false;");
                            }
                            if (["workhoursperweek", "workminutesperday", "leavedays", ].indexOf(fldName) > -1) {
                                el_filter.classList.add("pr-2")
                            };
// --- add width, text_align
                            el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                        th_filter.appendChild(el_filter);
                    tblRow_filter.appendChild(th_filter);

// +++  insert total row ++++++++++++++++++++++++++++++++
                    total_row.id = "id_payroll_totalrow";
                    const th_total = document.createElement("th");
        // --- add input element
                        const el_total = document.createElement("div");
                        if  (i === 1 ) {el_total.innerText = loc.Total  }
                        el_total.classList.add(class_width, class_align) //, "tsa_color_darkgrey", "tsa_transparent");
        // --- append th_total
                    th_total.appendChild(el_total);
                    total_row.appendChild(th_total);
                };

            }  // if(column_count)
        } // if(field_setting)
    };  //  CreatePlanningHeader

//=========  HandleAggRowClicked  ================ PR2019-07-10
    function HandleAggRowClicked(tr_clicked) {
        //console.log("=== HandleAggRowClicked");
        if(is_planning_detail_mode){

            const emplhour_pk = get_attr_from_el_int(tr_clicked, "data-pk");
            let upload_dict = {
                id: {table: "emplhour"},
                emplhour_pk: emplhour_pk
            };
            //UploadChanges(upload_dict, url_payroll_upload);
            //MEP_ResetInputElements();
            // show loader
            //document.getElementById("id_MEP_loader").classList.remove(cls_hide)

            is_planning_detail_mod_mode = true;
            // ---  show modal
            //$("#id_mod_emplhour_payroll").modal({backdrop: true});

        } else {

            employee_planning_selected_employee_pk = (Number(tr_clicked.id)) ? Number(tr_clicked.id) : null;

            if(employee_planning_selected_employee_pk){
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_planning_selected_employee_pk);
                employee_planning_selected_employee_code = get_dict_value (map_dict, ["code"], "---");
                // put also in selected_planning_period, to be used in print planning (and export to excel?)
                // PR2020-11-01 print planning doesn't use selected_planning_period
                selected_planning_period.selected_employee_pk = employee_planning_selected_employee_pk

                is_planning_detail_mode = true;
                UpdateHeaderText();
        // --- fill payroll_mapped_columns and create tblHead with filter ansd total row
               CreatePlanningHeader();
               FillPlanningRows();
        // --- show sbr button 'back to payroll overview'
               //el_sbr_select_showall.classList.remove(cls_hide)
            } else {
                //  employee_pk = -1 means no employee

                selected_planning_period.planning_employee_pk = null;
                selected_planning_period.planning_employee_code = null;
            }
        }
    }  // HandleAggRowClicked

//========= HandlePayrollFilter  ====================================
    function HandlePayrollFilter(el, col_index, event) {

        //console.log( "===== HandlePayrollFilter  ========= ");
        //console.log( "col_index ", col_index, "event.key ", event.key);

        const skip_filter = t_SetExtendedFilterDict(el, col_index, filter_dict, event.key);
        if ( !skip_filter) {FillPlanningRows()};
    }  // HandlePayrollFilter

//##################################################################################
// +++++++++++++++++ PRINT PLANNING ++++++++++++++++++++++++++++ PR2020-10-12
    function HandlePrintPlanning(option){
        // function creates list in format needed for print planning  PR2020-10-12
        //console.log(" === HandlePrintPlanning ===")
        //console.log("planning_short_list_sorted", planning_short_list_sorted)

        if (planning_short_list_sorted){

            const employee_planning_customer_list = get_dict_value(employee_planning_customer_dictlist, [employee_planning_selected_customer]);
            const employee_planning_order_list = get_dict_value(employee_planning_order_dictlist, [employee_planning_selected_order]);
            const has_selected_customer = (!!employee_planning_customer_list && !!employee_planning_customer_list.length);
            const has_selected_order = (!!employee_planning_order_list && !!employee_planning_order_list.length);

            const print_list = [];
            // only print selected rows
            for (let i = 0; i < planning_short_list_sorted.length; i++) {
                const item = planning_short_list_sorted[i]

                // shift with empty employee has e_id = -1
                if(!item.e_id) { item.e_id = -1}
                const employee_pk = item.e_id;
                let add_to_list = false;

                if (employee_planning_selected_employee_pk) {
                    add_to_list = (employee_pk === employee_planning_selected_employee_pk)
                } else if (has_selected_order) {
                    add_to_list = employee_planning_order_list.includes(employee_pk);
                } else if (has_selected_customer) {
                    add_to_list = employee_planning_customer_list.includes(employee_pk);
                } else {
                    add_to_list = true;
                }
        // in detail_mode: when 'no employee' selected: show only shifts of selected customer / order
                if (add_to_list && employee_pk === -1) {
                    if (has_selected_order) {
                        add_to_list = (item.o_id === employee_planning_selected_order);
                    } else  if (has_selected_customer) {
                         add_to_list = (item.c_id === employee_planning_selected_customer);
                    }
                }
                if(add_to_list){
                    print_list.push(item)
               }
            }

        //console.log("print_list", print_list)
            if(!!print_list.length){
                PrintEmployeePlanning(option, selected_planning_period, print_list, company_dict, loc)
            }
        }
     }

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++ PR2020-07-13
    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")
// ---  create file Name and worksheet Name
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            let filename = (selected_btn === "planning") ? loc.Planning : loc.Planning;
            if (is_planning_detail_mode) { filename += " " + employee_planning_selected_employee_code }
            filename += " " + today_str +  ".xlsx";
            let ws_name = loc.Planning;
// ---  create new workbook
            let wb = XLSX.utils.book_new()
// ---  create worksheet
            let ws = FillExcelRows();
// --- add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, ws_name);
// ---  write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ============== PR2020-07-13
    function FillExcelRows() {
        //console.log("=== FillExcelRows  =====")

        const detail_rows = (is_planning_detail_mode) ? html_planning_detail_list : html_planning_agg_list;
        let ws = {}
// title row
        let title_value = (selected_btn === "planning") ? loc.Planning : loc.Planning;
        if (is_planning_detail_mode) { title_value += " " + loc.of + " "  + employee_planning_selected_employee_code }
        ws["A1"] = {v: title_value, t: "s"};
// company row
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws["A2"] = {v: company, t: "s"};
// period row
        //ws["A3"] = {v: period_value, t: "s"};
        const today_JS = new Date();
        const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
        ws["A3"] = {v: today_str, t: "s"};
// period row
        const planning_period = get_dict_value(selected_planning_period, ["dates_display_short"]);
        ws["A5"] = {v: loc.Period, t: "s"};
        ws["B5"] = {v: planning_period, t: "s"};
// employee row
        if (is_planning_detail_mode){
            ws["A6"] = {v: loc.Employee + ":", t: "s"};
            ws["B6"] = {v: employee_planning_selected_employee_code , t: "s"};
        }

// header row
        const header_rowindex = 8
        let headerrow = [];
        if (is_planning_detail_mode){
            headerrow = [loc.Date, loc.Order, loc.Shift, loc.Planned_hours, loc.Absence];
        } else {
            headerrow = [loc.Employee, loc.Working_days, loc.Contract_hours, loc.Planned_hours, loc.Absence, loc.Difference];
        }
        const col_count = headerrow.length;
        for (let j = 0; j < col_count; j++) {
            const cell_value = headerrow[j];
            const cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }

        const index_first_datarow = header_rowindex + 2;
        let row_index = index_first_datarow

// --- loop through detail_rows
        //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        if(!!detail_rows){
            for (let j = 0, detail_row; detail_row = detail_rows[j]; j++) {
                if(detail_row[0]){  //  detail_row[0] = show_row
                    const row_data = detail_row[3]
       //console.log("row_data", row_data)
                    for (let x = 0, len = row_data.length; x < len; x++) {
                        const cell_index = b_get_excel_cell_index (x, row_index);
                        const cell_type = get_cell_type(x);
                        ws[cell_index] = {t: cell_type}
                        const cell_format = get_cell_format(x);
                        if(cell_format){ws[cell_index]["z"] = cell_format};

       //console.log("cell_format", cell_format)
                        let cell_value = get_cell_value (row_data, x);
                        if(cell_value){ws[cell_index]["v"] = cell_value};
       //console.log("cell_value", cell_value)
                    }
                    row_index += 1;
                }
            }

// +++  add total row
            row_index += 1;
            if (planning_total_row) {
                let cell_values = [];
                let index_last_datarow = row_index - 2
                if (index_last_datarow < index_first_datarow) {index_last_datarow = index_first_datarow}
                for (let x = 0, len = planning_total_row.length; x < len; x++) {
                    // excell column is header_row_index -1 because of margin column in header_row
                    const excel_col = x - 1
                    const cell_index = b_get_excel_cell_index (excel_col, row_index);

                    const cell_type = get_cell_type(excel_col, true);
                    ws[cell_index] = {t: cell_type}

                    const cell_format = get_cell_format(excel_col);
                    if(cell_format){ws[cell_index]["z"] = cell_format};
                    if (is_planning_detail_mode) {
                        if(excel_col === 1) {
                            ws[cell_index]["v"] = loc.Total;
                        } else if (excel_col > 1) {
                            const cell_formula = get_cell_formula(excel_col, index_first_datarow, index_last_datarow);
                            if(cell_formula){ws[cell_index]["f"] = cell_formula};
                        }
                    } else {
                        if(excel_col === 0) {
                            ws[cell_index]["v"] = loc.Total;
                        } else {
                            const cell_formula = get_cell_formula(excel_col, index_first_datarow, index_last_datarow);
                            if(cell_formula){ws[cell_index]["f"] = cell_formula};
                        }
                    }
                }
                row_index += 1;
            }

            // this works when col_count <= 26
            ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            // set column width
            let ws_cols = []
            for (let i = 0, tblRow; i < col_count; i++) {
                let col_width = 15;
                if (is_planning_detail_mode){
                    if (i === 1) {col_width = 20}
                } else {
                    if (i === 0) {col_width = 20}
                }

                ws_cols.push( {wch:col_width} );
            }
            ws['!cols'] = ws_cols;

        }

        return ws;
    }  // FillExcelRows

    function get_cell_type (x) {
        let cell_type  = "n";
        if(is_planning_detail_mode){
            if ([1, 2].indexOf(x) > -1)  { cell_type = "s"};
        } else {
            if (x === 0) { cell_type = "s"};
        }
        return cell_type
    }

    function get_cell_format (x) {
        let cell_format = null;
        if (is_planning_detail_mode){
            if (x === 0) {cell_format = "dd mmm yyyy"} else
            if (x > 2) {cell_format = "#,##0.00" } ;
        } else {
            if(x === 1) { cell_format = "#0"} else
            if (x > 1) {cell_format = "#,##0.00" } ;
        }
        return cell_format
    }

    function get_cell_value (row_data, x) {
        let cell_value = null;
        if (is_planning_detail_mode){
            if (x === 0) { cell_value = get_Exceldate_from_date(row_data[x + 1])} else
            if ([1, 2].indexOf(x) > -1) { cell_value = row_data[x + 1]} else
            if (row_data[x + 1]) {cell_value = row_data[x + 1] / 60};
        } else {
            if (x === 0) { cell_value = row_data[x+1]} else
            if (x === 1) {   if(row_data[x + 1]) {cell_value = row_data[x + 1] }    } else
            if(row_data[x + 1]) {cell_value = row_data[x + 1] / 60};
        }
        return cell_value;
    }

    function get_cell_formula(excel_col, index_first_datarow, index_last_datarow){
        let cell_formula = null, has_formula = false;
        if (is_planning_detail_mode){
            has_formula = (excel_col > 2);
        }  else {
            has_formula = (excel_col > 0);
        };
        if ( has_formula ) {
            const cell_first = b_get_excel_cell_index (excel_col, index_first_datarow);
            const cell_last = b_get_excel_cell_index (excel_col, index_last_datarow);
            cell_formula = "SUM(" + cell_first + ":" + cell_last + ")";
        };
        return cell_formula;
    }

// ##################################################################################

}); //$(document).ready(function()
