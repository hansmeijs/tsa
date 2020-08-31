// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

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
        let selected_employee_pk = 0;
        let selected_employee_code = null;
        let selected_teammember_pk = 0;
        let selected_planning_employee_pk = null;
        let selected_planning_employee_code = "";

        let selected_btn = "";

        let selected_planning_period = {};
        let selected_calendar_period = {};

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};


        let is_quicksave = false

        let company_dict = {};
        let employee_map = new Map();
        let absence_map = new Map();

        let order_map = new Map();
        let abscat_map = new Map();
        let functioncode_map = new Map();

        let scheme_map = new Map();
        let shift_map = new Map();
        let team_map = new Map();
        let teammember_map = new Map();
        let schemeitem_map = new Map();

        let calendar_map = new Map();
        let planning_map = new Map();

//----------------------------------------
        let planning_short_list = []
        let planning_agg_dict = {};
        let is_planning_detail_mode = false;
        let is_planning_detail_mod_mode = false;
        let planning_header_row = [];
        let planning_total_row = [];

        let planning_agg_list = [];
        let planning_detail_list = [];
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
            employee: { tbl_col_count: 10,
                        //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateEmployeeTblHeader
                        field_caption: ["", "Employee", "ID_number",  "Payroll_code_abbrev", "First_date_in_service", "Last_date_in_service", "Hours_per_week", "Days_per_week", "Leavedays", ""],
                        field_names: ["", "code", "identifier", "payrollcode", "datefirst", "datelast", "workhoursperweek", "workminutesperday", "leavedays",  "inactive"],
                        filter_tags: ["", "text", "text","text","text","text","amount", "amount", "amount"],
                        field_width:  ["016","180", "120", "120","100", "100", "090","090", "090", "032"],
                        field_align: ["c","l", "l", "l","r", "r",  "r", "r", "r", "c"]},
            absence: { tbl_col_count: 9,
                        field_caption: ["", "Employee", "Absence_category", "First_date", "Last_date", "Start_time", "End_time", "Hours_per_day"],
                        field_names: ["", "employee", "order", "datefirst", "datelast", "timestart", "timeend", "timeduration", "delete"],
                        filter_tags: ["", "text", "text", "text", "text", "text", "text", "text", "text","duration"],
                        field_width:  ["016", "180", "180", "120", "120", "090", "090", "120", "032"],
                        field_align: ["c", "l", "l", "r", "r", "r", "r", "r", "c"]},
            shifts: { tbl_col_count: 8,
                        field_caption: ["","Employee", "Order", "Team", "First_date", "Last_date", "Replacement_employee"],
                        field_names: ["","employee", "order", "team", "datefirst", "datelast", "replacement", "delete"],
                        field_tags: ["div","div", "div", "div", "div", "div", "div", "a"],
                        field_width: ["016","180", "220", "120", "120", "120", "180", "032"],
                        field_align: ["c", "l", "l", "l", "l", "l", "l", "l"]},
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
                        field_tags: ["div", "div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["016","180", "120", "120","120", "120", "120", "032"],
                        field_align: ["c", "l", "c", "r", "r", "r", "r", "c"]},
            payroll_detail: { tbl_col_count: 7,
                        field_caption: ["", "Date", "Order", "Shift", "Planned_hours", "Absence", ""],
                        field_names:  ["", "text", "text", "text", "duration", "duration",  ""],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["016", "090",  "180", "120", "120","120",  "032"],
                        field_align: ["c", "l", "l", "l", "r", "r", "c"]},
            }

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
// ---  side bar - select period
        let el_sbr_select_period = document.getElementById("id_SBR_select_period");
        el_sbr_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        add_hover(el_sbr_select_period);
// ---  side bar - select employee
        let el_sidebar_select_employee = document.getElementById("id_SBR_select_employee");
            el_sidebar_select_employee.addEventListener("click", function() {ModSelectEmployee_Open()}, false );
            add_hover(el_sidebar_select_employee);
// ---  side bar - showall
        let el_sidebar_select_showall = document.getElementById("id_SBR_select_showall");
            el_sidebar_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceRestshift("showall")}, false );
            add_hover(el_sidebar_select_showall);
// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }

// +++++++++++++++++++ event handlers for MODAL +++++++++++++++++++++++++++
// ---  MOD FORM EMPLOYEE ------------------------------------
        let form_elements = document.getElementById("id_MFE_div_form_controls").querySelectorAll(".form-control")
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

// ---  MODAL SELECT EMPLOYEE ------------------------------------
        //let el_mod_select_employee_body = document.getElementById("id_ModSelEmp_select_employee_body");
        let el_mod_select_employee_input_employee = document.getElementById("id_MSE_input_employee");
            el_mod_select_employee_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {ModSelectEmployee_FilterEmployee(el_mod_select_employee_input_employee, event.key)}, 50)});
        let el_mod_select_employe_btn_save = document.getElementById("id_ModSelEmp_btn_save")
            el_mod_select_employe_btn_save.addEventListener("click", function() {ModSelectEmployee_Save("save")}, false )
        document.getElementById("id_MSE_btn_remove").addEventListener("click", function() {ModSelectEmployee_Save("remove")}, false )

// ---  MODAL ABSENCE ------------------------------------
        let el_MAB_input_employee = document.getElementById("id_MAB_input_employee")
            el_MAB_input_employee.addEventListener("focus", function() {MAB_GotFocus("employee", el_MAB_input_employee)}, false )
            el_MAB_input_employee.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("employee", el_MAB_input_employee)}, 50)});
        let el_MAB_input_abscat = document.getElementById("id_MAB_input_order")
            el_MAB_input_abscat.addEventListener("focus", function() {MAB_GotFocus("order", el_MAB_input_abscat)}, false )
            el_MAB_input_abscat.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("order", el_MAB_input_abscat)}, 50)});

        let el_MAB_datefirst = document.getElementById("id_MAB_input_datefirst")
            el_MAB_datefirst.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_datefirst)}, false );
        let el_MAB_datelast = document.getElementById("id_MAB_input_datelast")
            el_MAB_datelast.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_datelast)}, false );
        let el_MAB_oneday = document.getElementById("id_MAB_oneday")
            el_MAB_oneday.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_oneday)}, false );

        let el_MAB_offsetstart = document.getElementById("id_MAB_input_offsetstart")
            el_MAB_offsetstart.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_offsetstart)}, false );
        let el_MAB_offsetend = document.getElementById("id_MAB_input_offsetend")
            el_MAB_offsetend.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_offsetend)}, false );
        let el_MAB_breakduration = document.getElementById("id_MAB_input_breakduration")
            el_MAB_breakduration.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_breakduration)}, false );
        let el_MAB_timeduration = document.getElementById("id_MAB_input_timeduration")
            el_MAB_timeduration.addEventListener("click", function() {MAB_TimepickerOpen(el_MAB_timeduration)}, false );
        let el_MAB_btn_save = document.getElementById("id_MAB_btn_save");
            el_MAB_btn_save.addEventListener("click", function() {MAB_Save("save")}, false );
        let el_MAB_btn_delete = document.getElementById("id_MAB_btn_delete");
            el_MAB_btn_delete.addEventListener("click", function() {MAB_Save("delete")}, false );

// ---  MODAL SHIFT EMPLOYEE ------------------------------------
        let el_modshift_filter_order = document.getElementById("id_ModSftEmp_filter_order")
            el_modshift_filter_order.addEventListener("keyup", function(event){
                    setTimeout(function() {MSE_FilterOrder("modshift", el_modshift_filter_order)}, 50)});
        let el_modshift_btn_save = document.getElementById("id_ModSftEmp_btn_save");
            el_modshift_btn_save.addEventListener("click", function() {MSE_Save("save")}, false );
        let el_modshift_btn_delete = document.getElementById("id_ModSftEmp_btn_delete");
            el_modshift_btn_delete.addEventListener("click", function() {MSE_Save("delete")}, false );
// ---  create EventListener for select buttons in modshift employee
        btns = document.getElementById("id_ModSftEmp_btns_container").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            btn.addEventListener("click", function() {MSE_BtnShiftoption_Clicked(btn)}, false )
        }
        let el_modshift_absence = document.getElementById("id_ModSftEmp_input_absence");
            el_modshift_absence.addEventListener("change", function() {MSE_AbsenceClicked(el_modshift_absence)}, false );
        let el_modshift_offsetstart = document.getElementById("id_ModSftEmp_input_offsetstart")
            el_modshift_offsetstart.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_offsetstart)}, false );
        let el_modshift_offsetend = document.getElementById("id_ModSftEmp_input_offsetend");
            el_modshift_offsetend.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_offsetend)}, false );
        let el_modshift_breakduration = document.getElementById("id_ModSftEmp_input_breakduration");
            el_modshift_breakduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_breakduration)}, false );
        let el_modshift_timeduration = document.getElementById("id_ModSftEmp_input_timeduration");
            el_modshift_timeduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_timeduration)}, false );
        let el_modshift_datefirst = document.getElementById("id_ModSftEmp_input_datefirst");
            el_modshift_datefirst.addEventListener("change", function() {MSE_DateFirstLastClicked(el_modshift_datefirst)}, false );
        let el_modshift_datelast = document.getElementById("id_ModSftEmp_input_datelast");
            el_modshift_datelast.addEventListener("change", function() {MSE_DateFirstLastClicked(el_modshift_datelast)}, false );
        let el_modshift_onceonly = document.getElementById("id_ModSftEmp_onceonly");
            el_modshift_onceonly.addEventListener("change", function() {MSE_OnceOnly()}, false );
        let el_modshift_oneday = document.getElementById("id_ModSftEmp_oneday");
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
            employee_list: {inactive: false},
            order_list: {isabsence: false, istemplate: false, inactive: false},
            abscat_list: {inactive: false},
            absence_list: {mode: "get"},
            teammember_list: {employee_nonull: false, is_template: false},
            functioncode_list: {mode: "get"},
            employee_planning: {mode: "get"}
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
                if ("planning_period" in response){
                    selected_planning_period = get_dict_value(response, ["planning_period"]);
                }
                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                    el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_planning_period);
                    CreateSubmenu()
                    t_CreateTblModSelectPeriod(loc, ModPeriodSelectPeriod);
                    label_list = [loc.Company, loc.Employee, loc.Planning + " " + loc.of, loc.Print_date];
                    pos_x_list = [6, 65, 105, 130, 155, 185];
                    colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];
                }
                if ("setting_dict" in response) {
                    // this must come after locale_dict, where weekday_list is loaded
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
                        scheme: {isabsence: false, istemplate: false, inactive: null, issingleshift: null},
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
        let fill_datatable = false;
        if ("company_dict" in response) {
            company_dict = response["company_dict"];
        }

        //if ("employee_list" in response) {
        //    refresh_datamap(response["employee_list"], employee_map)
        //    fill_datatable = true;
        //}
        if ("employee_rows" in response) {
            refresh_datamap(response["employee_rows"], employee_map, "employee")
            fill_datatable = true;
        }
        if ("abscat_rows" in response) {refresh_datamap(response["abscat_rows"], abscat_map, "order")};
        if ("absence_rows" in response) {refresh_datamap(response["absence_rows"], absence_map, "teammember")};
        if ("functioncode_list" in response) {refresh_datamap(response["functioncode_list"], functioncode_map)};

        if ("teammember_list" in response) {
            refresh_datamap(response["teammember_list"], teammember_map)
            fill_datatable = true;
        }
        if ("order_list" in response) {refresh_datamap(response["order_list"], order_map)}
        if ("scheme_list" in response) {refresh_datamap(response["scheme_list"], scheme_map)}
        if ("shift_list" in response) {refresh_datamap(response["shift_list"], shift_map)}
        if ("team_list" in response) {refresh_datamap(response["team_list"], team_map)}
        if ("teammember_list" in response) {refresh_datamap(response["teammember_list"], teammember_map)}
        if ("schemeitem_list" in response) {refresh_datamap(response["schemeitem_list"], schemeitem_map)}

        if ("employee_planning_list" in response) {
            // TODO duration_sum not in refresh datamap any more
            const duration_sum = 0;
            refresh_datamap(response["employee_planning_list"], planning_map)
            planning_display_duration_total = display_duration (duration_sum, loc.user_lang)
            fill_datatable = true;
            //PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict,
            //    label_list, pos_x_list, colhdr_list, loc.timeformat, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
        }
//----------------------------------------
        if ("employee_planning_short_list" in response) {
            planning_short_list = response["employee_planning_short_list"]
           calc_planning_agg_dict(planning_short_list);
           planning_agg_list = CreateHTML_planning_agg_list();
           planning_detail_list = CreateHTML_planning_detail_list();
        }
//----------------------------------------
        if(fill_datatable) {
            HandleBtnSelect(selected_btn, true)  // true = skip_upload
        }
        if ("employee_calendar_list" in response) {
            refresh_datamap(response["employee_calendar_list"], calendar_map)
            UpdateHeaderText();
            CreateCalendar("employee", selected_calendar_period, calendar_map, MSE_Open, loc, loc.timeformat, loc.user_lang);
        };

    }  // refresh_maps
//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(data_btn, skip_upload) {
        console.log( "==== HandleBtnSelect ========= ");

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
       } else if  (selected_btn === "shifts") {
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
        const header_period = UpdateHeaderPeriod();
        //console.log ("header_period: ", header_period)
        //document.getElementById("id_calendar_hdr_text").innerText = header_period;

// --- show/hide menubtn planning
        show_menubtn_planning(selected_btn);

    }  // HandleBtnSelect

//=========  HandleTblRowClicked  ================ PR2019-03-30
    function HandleTblRowClicked(tr_clicked) {
        console.log("=== HandleTblRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)
// ---  update selected_employee_pk / selected_teammember_pk
        const tblName = get_attr_from_el_str(tr_clicked, "data-table")
        const pk_str = get_attr_from_el(tr_clicked, "data-pk");
        console.log( "tblName: ", tblName, typeof tblName);
        console.log( "pk_str: ", pk_str, typeof pk_str);
        if (tblName === "employee"){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, tblName, pk_str)
            selected_employee_pk = get_dict_value (map_dict, ["id"])
            selected_employee_code = get_dict_value (map_dict, ["code"]);
        } else if (tblName === "teammember"){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(absence_map, tblName, pk_str)
        console.log( "map_dict: ", map_dict);
            selected_teammember_pk = get_dict_value (map_dict, ["id"])
        }

        console.log( "tblName: ", tblName)
        console.log( "selected_teammember_pk: ", selected_teammember_pk);
        console.log( "selected_teammember_pk: ", selected_teammember_pk);
// ---  update header text
        UpdateHeaderText();
    }  // HandleTblRowClicked

//========= HandleBtnCalendar  ============= PR2019-12-04
    function HandleBtnCalendar(mode) {
        console.log( " ==== HandleBtnCalendar ====", mode);

        const datefirst_iso = get_dict_value(selected_calendar_period, ["period_datefirst"])
        console.log( "datefirst_iso", datefirst_iso, typeof datefirst_iso);

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
                                    employee_pk: selected_employee_pk},
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

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");
        AddSubmenuButton(el_div, loc.Add_employee, function() {HandleAddNewBtn()}, ["mx-2"], "id_submenu_add")
        AddSubmenuButton(el_div, loc.Delete_employee, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_delete")

        if (selected_planning_period.requsr_perm_hrman){
            AddSubmenuButton(el_div, loc.Upload_employees, null, ["mx-2"], "id_submenu_employee_import", url_employee_import);
        }
        AddSubmenuButton(el_div, loc.Print_planning,
            function() { PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict, loc)},
            ["mx-2"],
            "id_submenu_planning_preview"
        )
        AddSubmenuButton(el_div, loc.Export_to_Excel, function() { ExportToExcel()}, ["mx-2"],"id_submenu_export_excel")

        el_submenu.classList.remove(cls_hide);

        show_menubtn_planning(selected_btn);

    };//function CreateSubmenu

//=========  HandleAddNewBtn  ================ PR2020-08-08
    function HandleAddNewBtn() {
        if(selected_btn === "absence"){
            MAB_Open();
        } else {
            MFE_Open();
        };
    }

//========= show_menubtn_planning  ==================================== PR20202-04-06
    function show_menubtn_planning(selected_btn) {
        //console.log( "===== show_menubtn_planning  ========= ");
        const hide_btn_print_planning = (selected_btn !== "planning")

        let submenu_caption = (selected_btn === "absence") ? loc.Add_absence : loc.Add_employee;
        document.getElementById("id_submenu_add").innerText = submenu_caption
        submenu_caption = (selected_btn === "absence") ? loc.Delete_absence : loc.Delete_employee;
        document.getElementById("id_submenu_delete").innerText = submenu_caption

        let el_submenu_planning_preview =  document.getElementById("id_submenu_planning_preview");
        if (el_submenu_planning_preview){
            add_or_remove_class (el_submenu_planning_preview, cls_hide, hide_btn_print_planning);
        }
        let el_submenu_export_excel =  document.getElementById("id_submenu_export_excel");
        if (el_submenu_export_excel){
            add_or_remove_class (el_submenu_export_excel, cls_hide, hide_btn_print_planning);
        }
    };//function show_menubtn_planning

//=========  CreateEmployeeTblHeader  === PR2019-10-25 PR2020-05-14 PR2020-08-10
    function CreateEmployeeTblHeader() {
        console.log("===  CreateEmployeeTblHeader ===");
        const tblName = "employee"
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null

// +++  insert header rows ++++++++++++++++++++++++++++++++
        let tblHeadRow = tblHead_datatable.insertRow (-1);
        let tblFilterRow = tblHead_datatable.insertRow (-1);

//--- insert th's to tblHeadRow
        const col_count = field_settings[tblName].tbl_col_count
        for (let j = 0; j < col_count; j++) {
            const key = field_settings[tblName].field_caption[j];
            const caption = (loc[key]) ? loc[key] : key;
            const field_name = field_settings[tblName].field_names[j];
            const filter_tag = field_settings[tblName].filter_tags[j];
            const class_width = "tw_" + field_settings[tblName].field_width[j] ;
            const class_align = "ta_" + field_settings[tblName].field_align[j];

// +++ add th to tblHeadRow +++
            let th = document.createElement("th");
// --- add div to th, margin not working with th
                let el = document.createElement("div");
                    if (j === col_count - 1){
                        AppendChildIcon(el, imgsrc_inactive_grey)
                    } else {
                        el.innerText = caption;
                    }
                    el.classList.add(class_width, class_align);
                    // add right padding to number fields
                    if( [6,7,8].indexOf(j) > -1) {el.classList.add("pr-2")};
                th.appendChild(el)
            tblHeadRow.appendChild(th);
// +++ add th to tblFilterRow +++
            th = document.createElement("th");
                const el_input = document.createElement("input");
                    el_input.addEventListener("keyup", function(event){HandlePayrollFilter(el_input, j, event.which)});
                    el_input.setAttribute("data-field", field_name);
                    el_input.setAttribute("data-filtertag", filter_tag);
// --- add other attributes
                    el_input.setAttribute("autocomplete", "off");
                    el_input.setAttribute("ondragstart", "return false;");
                    el_input.setAttribute("ondrop", "return false;");
                    el_input.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                    if( [6,7,8].indexOf(j) > -1) {el.classList.add("pr-2")};
                th.appendChild(el_input);
            tblFilterRow.appendChild(th);
        }  // for (let j = 0; j < column_count; j++)
    };  //  CreateEmployeeTblHeader

//========= FillEmployeeTblRows  ====================================
    function FillEmployeeTblRows() {
        console.log( "===== FillEmployeeTblRows  === ");
// --- reset table
        // is in CreateEmployeeTblHeader
        if(employee_map){
// --- loop through employee_map
            for (const [map_id, map_dict] of employee_map.entries()) {
// TODO addfilter
                let add_Row = true;
                if (add_Row){
                    //  CreateEmployeeTblRow(map_id, pk_str, ppk_str, employee_pk, row_index)
                    let tblRow = CreateEmployeeTblRow(map_id, map_dict.id, map_dict.comp_id, map_dict.id, -1)
                    UpdateEmployeeTblRow(tblRow, map_id, map_dict)
// --- highlight selected row
                    if (map_dict.id === selected_employee_pk) {tblRow.classList.add(cls_selected)}
                }  // if (add_Row)
            }  // for (const [map_id, map_dict] of employee_map.entries())
        }  // if(!!employee_map)
        FilterTableRows();
    }  // FillEmployeeTblRows

//=========  CreateEmployeeTblRow  ================ PR2019-08-29 PR2020-08-10
    function CreateEmployeeTblRow(map_id, pk_str, ppk_str, employee_pk, row_index) {
        console.log("=========  CreateEmployeeTblRow =========");
        console.log("map_id", map_id);
        const tblName = "employee";
        let tblRow = null;
        if(field_settings[tblName]){
// --- insert tblRow into tblBody_datatable
            tblRow = tblBody_datatable.insertRow(row_index);
            tblRow.id = map_id;
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-pk", pk_str);
            if(employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow)}, false);
//+++ insert td's into tblRow
            const column_count = field_settings[tblName].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create element
                let el = document.createElement("div");
    // --- add field_name in data-field Attribute
                el.setAttribute("data-field", field_settings[tblName].field_names[j]);
    // --- add img inactive to col_inactive
                if (j === column_count - 1) {
                    AppendChildIcon(el, imgsrc_inactive_lightgrey)
                    // in updaterow, to include inactive value AppendChildIcon(el, imgsrc_inactive_grey)
                    el.setAttribute("title", loc.Click_to_make_this_employee_inactive);
    // --- add EventListeners
                    el.addEventListener("click", function() {UploadDeleteInactive("inactive", el)}, false )
                } else if (j){
                    el.addEventListener("click", function() {MFE_Open(el)}, false)
                }
                if(j){add_hover(el)};
    // --- add field_width and text_align
                el.classList.add("tw_" + field_settings[selected_btn].field_width[j],
                                 "ta_" + field_settings[selected_btn].field_align[j]);
    // add right padding to number fields
                if( [6,7,8].indexOf(j) > -1) {el.classList.add("pr-2")};
    // --- add element to td.
                td.appendChild(el);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[selected_btn])
        return tblRow
    };  // CreateEmployeeTblRow


//========= UpdateEmployeeTblRow  ============= PR2020-08-11
    function UpdateEmployeeTblRow(tblRow, map_id, map_dict){
        console.log("========= UpdateEmployeeTblRow  =========");
        console.log("map_dict", map_dict);
        if (tblRow && !isEmpty(map_dict)) {
            tblRow.setAttribute("data-inactive", map_dict.inactive)
// --- loop through cells of tablerow
            for (let i = 0, td, el, fldName, value; td = tblRow.cells[i]; i++) {
                el = td.children[0];
                fldName = get_attr_from_el(el, "data-field");
                value = get_dict_value(map_dict, [fldName]);
                // Disable element when locked
                if (["code", "name", "identifier", "payrollcode"].indexOf( fldName ) > -1){
                   el.innerText = (value) ? value : "\n";
                } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                    // function format_dateISO_vanilla (loc, date_iso, hide_weekday, hide_year, is_months_long, is_weekdays_long)
                    const display = format_dateISO_vanilla (loc, value, true, false)
                    el.innerText = (display) ? display : "\n";
                } else if (["workhoursperweek", "workdays", "leavedays"].indexOf( fldName ) > -1){
                    let quotient = null;
                    if(Number(value)){
                        const divisor = (fldName === "workhoursperweek") ? 60 : 1440;
                        quotient = value / divisor;
                    }
                    el.innerText = (quotient) ? quotient : "\n";
                } else if (fldName === "inactive") {
                   const img = el.children[0];
                   if(img) { img.setAttribute("src", (value) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey)};
                }
            }
        };
    }  // UpdateEmployeeTblRow


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
                el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});
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

//=========  CreateTblRow  ================ PR2019-08-29
    function CreateTblRow(tblBody, pk_str, ppk_str, employee_pk, row_index) {
        //console.log("=========  CreateTblRow =========", selected_btn);

        const tblName = (selected_btn === "employee") ? "employee" :
                        (["absence", "shifts"].indexOf( selected_btn ) > -1) ? "teammember":
                        (selected_btn === "planning") ? "planning" : null;

        // btn calendar and form have no table
        let tblRow = null
        if(field_settings[selected_btn]){
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
            tblRow.setAttribute("data-btn", selected_btn);

            if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

    // --- check if row is addnew row - when pk is NaN
            const is_new_row = !parseInt(pk_str); // don't use Number, "545-03" wil give NaN

    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow)}, false);

//+++ insert td's into tblRow
            const column_count = field_settings[selected_btn].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
    // --- create div element
                let el = document.createElement("div");
    // --- add data-field Attribute
                const field_name = field_settings[selected_btn].field_names[j];
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
                if (selected_btn === "employee"){
                    if ([0,1,2, 3,4,5,6,7].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MFE_Open(el)}, false)
                        el.classList.add("input_text");
                    }
                } else if (selected_btn === "absence"){
                    el.classList.add("input_text");
                    if ([1,2,3,4,5].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MAB_Open(el)}, false)
                    }
                } else if (selected_btn === "shifts"){
                    if ([0, 5].indexOf( j ) > -1){
                        el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )
                        el.classList.add("input_text");
                    } else if ([1, 2].indexOf( j ) > -1){
                        el.classList.add("input_text");
                            // cannot change order and team in shifts.
                    } else if ([3,4].indexOf( j ) > -1){
                       // TODO eventhandler el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                       // el.classList.add("input_popup_date");
                    }
                }  //  if (selected_btn === "employee"){

    // --- add left margin to first column,
                if (j === 0 ){el.classList.add("ml-2");}

    // --- add field_width and text_align
                el.classList.add("tw_" + field_settings[selected_btn].field_width[j],
                                 "ta_" + field_settings[selected_btn].field_align[j]);
    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");
    // --- add element to td.
                td.appendChild(el);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[selected_btn])
        return tblRow
    };  // CreateTblRow

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23
    function CreateBtnDeleteInactive(mode, tblRow, el_input){
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
               (["absence", "shifts"].indexOf(sel_btn ) > -1) ? "teammember" :
               (["calendar", "planning"].indexOf(sel_btn ) > -1) ? "planning" : null;
    } //tblName_from_selectedbtn

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2019-10-06
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        console.log("update_dict", update_dict);

//--- get id_dict of updated item
        const id_dict = get_dict_value (update_dict, ["id"]);
            const tblName = get_dict_value(id_dict, ["table"]);
            const pk_int = get_dict_value(id_dict, ["pk"]);
            const ppk_int = get_dict_value(id_dict, ["ppk"]);
            const temp_pk_str = get_dict_value(id_dict, ["temp_pk"]);
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
        const map_id = get_map_id(tblName, pk_int);
        const inactive_changed = get_dict_value(update_dict, ["inactive", "updated"])

        console.log("is_created", is_created);
        //console.log("inactive_changed", inactive_changed);

//--- lookup table row of updated item
        // created row has id 'teammemnber_new1', existing has id 'teammemnber_379'
        // 'is_created' is false when creating failed, use instead: (!is_created && !map_id)
        const row_id_str = ((is_created) || (!is_created && !map_id)) ? temp_pk_str : map_id;
        console.log("row_id_str", row_id_str);
        let tblRow = document.getElementById(row_id_str);
        console.log("tblRow", tblRow);

// ++++ deleted ++++
    //--- reset selected_employee when deleted
        if(is_deleted){
            selected_employee_pk = 0;
            // TODO check if it needs value
            selected_employee_code = null;
            selected_teammember_pk = 0;
    //--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};

        } else {

// ++++ created ++++
// add new empty row if tblRow is_created

            if (is_created){
                const row_index = -1;
                tblRow = CreateTblRow(tblBody_datatable, pk_int, ppk_int, null, row_index)
            }
//--- update Table Row
            UpdateTblRow(tblRow, update_dict)
// ---  scrollIntoView, only in tblBody employee
            if (selected_btn === "employee"){
                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
            };
        }  // if(is_deleted)


//--- update or delete Select Row, before remove_err_del_cre_updated__from_itemdict
        // TODO not when updating teammember pricerate ??
        let selectRow;
        if(is_created){

        } else {
    //--- get existing  selectRow
            const rowid_str = id_sel_prefix + map_id
            selectRow = document.getElementById(rowid_str);
        };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
        const imgsrc_default = imgsrc_inactive_grey, imgsrc_black = imgsrc_inactive_black
        t_UpdateSelectRow(selectRow, update_dict, false, filter_show_inactive, imgsrc_default, imgsrc_black)

//--- remove 'updated, deleted created and msg_err from update_dict
        // after updating fields and selectRow
        remove_err_del_cre_updated__from_itemdict(update_dict)

//--- replace updated item in map - after remove_err_del_cre_updated__from_itemdict
        let data_map = (tblName === "employee") ? employee_map :
                       (tblName === "teammember") ? teammember_map : null
        if(is_deleted){
            data_map.delete(map_id);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(map_id, update_dict)
        } else {
            data_map.set(map_id, update_dict)
        }

//--- refresh select table
        if(is_created && tblName === "employee"){
            selected_employee_pk = pk_int
            selected_employee_code = null;
            selected_teammember_pk = 0;
            HandleSelect_Filter() ;
        }
// ++++ update table filter when inactive changed ++++
        if (inactive_changed && !filter_show_inactive){
            // let row disappear when inactive and not filter_show_inactive
            setTimeout(function (){
                const tblName = tblName_from_selectedbtn(selected_btn);
                const has_ppk_filter = (tblName !== "employee");
                t_Filter_TableRows(tblBody_datatable,
                                    tblName,
                                    filter_dict,
                                    filter_show_inactive,
                                    has_ppk_filter,
                                    selected_employee_pk);
            }, 2000);
          }
//--- refresh header text
        //if(pk_int === selected_employee_pk){
            UpdateHeaderText();
        //}
    }  // UpdateFromResponse(update_list)
/////////////////////////

//=========  UpdateEmployeeFromResponse  ================ PR2020-08-11
    function UpdateEmployeeFromResponse(update_dict) {
        console.log("========= UpdateEmployeeFromResponse  =========");
        console.log("update_dict", update_dict);
        if(!isEmpty(update_dict)){

            const tblName = 'employee';


// +++ give error message when error in deleting or creating, and return false
            let is_created = false, is_deleted = false, map_id = null;
            const status = get_dict_value (update_dict, ["status"]);
            if(status){
                // get mapid from status, not form update_dict.mapid. When row is deleted, update_dict.mapid does not exist.
                map_id = status.mapid;
                if("deleted" in status) {
                    is_deleted = status.deleted
                    if(!is_deleted){
                        ModConfirm_Message(loc, loc.Delete_employee, status.msg_err);
                        return false;}}
                if("created" in status) {
                    is_created = status.created
                    if(!is_created){
                        ModConfirm_Message(loc, loc.Add_employee, status.msg_err);
                        return false;}}
            }
// +++ put updated row in employee_map map
    // ---  remove deleted item from map
            if(is_deleted){
                employee_map.delete(map_id);

            } else if(is_created){
    // --- insert new item in map in alphabetical order, or just add when map is empty
                if (!!employee_map.size){
                    insertInMapAtIndex(employee_map, map_id, update_dict, update_dict.code, "code", loc.user_lang)
                } else {
                    employee_map.set(map_id, update_dict)
                }
            } else {
    // ---  replace existing map_item
                employee_map.set(map_id, update_dict)
            }
// +++ update table rows
            if(is_deleted){
    // ---  remove deleted tblRow from table
                const tblRow = document.getElementById(map_id)
                if (tblRow){tblRow.parentNode.removeChild(tblRow)};
            } else if(is_created){
    // ---  add new tblRow to table
                const pk_int = get_dict_value (update_dict, ["id"]);
                const ppk_int = get_dict_value (update_dict, ["company_id"]);
                const search_code = get_dict_value (update_dict, ["code"]);
                let row_index = t_get_rowindex_by_code_datefirst(tblBody_datatable, "employee", employee_map, search_code)
                // headerrow has index 0, filerrow has index 1. Deduct 1 for filterrow.
                row_index -= 1;
                if (row_index < -1) { row_index = -1}
                let tblRow = CreateEmployeeTblRow(map_id, pk_int, ppk_int, selected_employee_pk, row_index)
                UpdateEmployeeTblRow(tblRow, map_id, update_dict)
    // ---  deselect all highlighted rows, highlight new row, make green for 2 seconds
                DeselectHighlightedRows(tblRow, cls_selected);
                tblRow.classList.add(cls_selected)
                ShowClassWithTimeout(tblRow, "tsa_tr_ok")
            } else {
    // ---  update existing table row
                let tblRow = document.getElementById(map_id);
                UpdateEmployeeTblRow(tblRow, map_id, update_dict)
            }
        }  // if(!isEmpty(update_dict))
    } // UpdateEmployeeFromResponse


//=========  UpdateTeammemberFromResponse  ================ PR2020-05-17
    function UpdateTeammemberFromResponse(update_dict) {
        console.log("========= UpdateTeammemberFromResponse  =========");
        console.log("update_dict", update_dict);
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
        console.log("data_map", data_map);
        console.log("data_map.size before: " + data_map.size);
        console.log("is_deleted", is_deleted);

        console.log("map_id", map_id);
        console.log("data_map.get", data_map.get(map_id));
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
        console.log("data_map.size after: " + data_map.size);
/////////////////////
            //const inactive_changed = get_dict_value(update_dict, ["inactive", "updated"])
            const search_code = update_dict.e_code;
            // absence datfirst / last is stored in table scheme
            const search_datefirst = update_dict.s_df

            console.log("is_created", is_created);
            console.log("search_code", search_code);
            console.log("search_datefirst", search_datefirst);
            //console.log("inactive_changed", inactive_changed);
            if(is_created){
                let row_index = t_get_rowindex_by_code_datefirst(tblBody_datatable, "absence", absence_map, search_code, search_datefirst)
            console.log("search_ row_index", row_index);
                // headerrow has index 0, filerrow has index 1. Deduct 1 for filterrow.
                row_index -= 1;
                if (row_index < -1) { row_index = -1}
                let tblRow = CreateAbsenceTblRow(tblBody_datatable, pk_int, ppk_int, selected_employee_pk, row_index)
                UpdateAbsenceTblRow(tblRow, map_id, update_dict)
    // --- highlight selected row, make green for 2 seconds
                tblRow.classList.add(cls_selected)
                ShowClassWithTimeout(tblRow, "tsa_tr_ok")
            } else {
                console.log("map_id", map_id);
                let tblRow = document.getElementById(map_id);
                console.log("tblRow", tblRow);
                UpdateTeammemberTblRow(tblRow, map_id, update_dict)
            }
        }  // if(!isEmpty(update_dict))
    } // UpdateTeammemberFromResponse


//========= UpdateTblRow  =============
    function UpdateTblRow(tblRow, update_dict){
        console.log("========= UpdateTblRow  =========");
        console.log("update_dict", update_dict);
        //console.log("tblRow", tblRow);

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

//--- get info from update_dict["id"]
            const id_dict = get_dict_value (update_dict, ["id"]);
                const tblName = get_dict_value(id_dict, ["table"]);
                const pk_int = get_dict_value(id_dict, ["pk"]);
                const ppk_int = get_dict_value(id_dict, ["ppk"]);
                const temp_pk_str = get_dict_value(id_dict, ["temp_pk"]);
            const map_id = get_map_id( tblName, pk_int);
            // TODO checked if is_created is necessary
            const is_created = false; //("created" in id_dict);
            //const is_deleted = ("deleted" in id_dict); //delete row moved to outstside this function
            const msg_err = get_dict_value(id_dict, ["error"]);

// --- show error message of row
            if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    el_input.classList.add("border_bg_invalid");
                    //const msg_offset = [-160, 80];
                    const msg_offset = [0, -4];
                    ShowMsgError(el_input, el_msg, msg_err, msg_offset);
                }
// --- new created record
            } else if (is_created){

// update row info
    // update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);
                // TODO also add employee_pk??
    // remove temp_pk from tblRow
                tblRow.removeAttribute("temp_pk");
    // remove placeholder from element 'code
                let el_code = tblRow.cells[0].children[0];
                if (!!el_code){el_code.removeAttribute("placeholder")}

    // add delete button, only if it does not exist
                const j = (tblName === "customer") ? 2 : (tblName === "order") ? 5 : null;
                if (!!j){
                    let el_delete = tblRow.cells[j].children[0];
                    if(!!el_delete){
                        // only if not exists, to prevent double images
                        if(el_delete.children.length === 0) {
                            CreateBtnInactiveDelete("delete", tblRow, el_delete)
                        }
                    }
                }

// move the new row in alfabetic order
                let row_index = -1
                if(tblName === "teammember") {
                    //row_index = t_get_rowindex_by_code_datefirst(tblBody_datatable, tblName, teammember_map, search_code, search_datefirst)
                } else {
                    row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, loc.user_lang);
                    tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);
                }

// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function
            if (!!tblRow){
                const is_inactive = (tblName === "employee") ? get_dict_value (update_dict, ["inactive", "value"], false) :
                                    (tblName === "teammember") ? get_dict_value (update_dict, ["e_inactive"], false) :
                                    false;
                tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        UpdateField(el_input, update_dict)
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                // add delete button in new row
                        if (is_created && fieldname === "delete") {
                 //console.log("--- IN USE ??? : add delete button in new row  --------------");
                            let el = document.createElement("a");
                            el.setAttribute("href", "#");
                            el.addEventListener("click", function() { ModConfirmOpen("delete", tblRow)}, false )
                            AppendChildIcon(el, imgsrc_delete)
                            td.appendChild(el);
                        }
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!update_dict && !!tblRow)
    }  // function UpdateTblRow

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict){
        //console.log("========= UpdateField  =========");
        //console.log("item_dict: ", item_dict);

        const tblName = get_dict_value (item_dict, ["id", "table"]);
        const is_absence = (!!get_dict_value (item_dict, ["id", "isabsence"]));
        const fldName = get_attr_from_el(el_input, "data-field");
        //console.log("fldName: ", fldName);

    // --- reset fields when item_dict is empty
        if (isEmpty(item_dict)){
            if (fldName === "inactive") {
                const field_dict = {value: false}
                // format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive, title_inactive, title_active)
                format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            } else {
                el_input.value = null
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-pk");
                el_input.removeAttribute("data-ppk");
             }
        } else {
    // --- lookup field in item_dict, get data from field_dict
            /*
            if (!(fldName in item_dict)){
                if (tblName === "planning" && fldName === "offsetstart"){
                    // the odd way: put shift.display in field 'offsetstart'
                    el_input.value = get_dict_value(item_dict, ["shift", "display"])

                } else if (tblName === "planning" && fldName === "timeduration"){
                    const time_duration = get_dict_value(item_dict, ["shift", "timeduration"], 0)
                    el_input.value = display_offset_time ({timeformat: loc.timeformat, user_lang: loc.user_lang}, time_duration, false, true)

                } else {
                    el_input.value = null
                    el_input.removeAttribute("data-value");
                    el_input.removeAttribute("data-pk");
                    el_input.removeAttribute("data-ppk");
                }

            } else {
            */
                let field_dict = get_dict_value (item_dict, [fldName]);
                const value = get_dict_value (field_dict, ["value"]);
                const updated = (!!get_dict_value (field_dict, ["updated"]));
                const msg_offset = (selected_btn === "form") ? [-260, 210] : [240, 210];

        console.log("field_dict: ", field_dict);
                // Disable element when locked
                const locked = (!!get_dict_value (field_dict, ["locked"]));
                el_input.disabled = locked

                if(updated){
                    el_input.classList.add("border_bg_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_bg_valid");
                        }, 2000);
                }

                if (tblName === "planning"){
                    if (fldName === "employee"){
                        el_input.value = get_dict_value(field_dict, ["code"])
                    } else if (fldName === "customer"){
                        el_input.value = get_dict_value(field_dict, ["code"])
                    } else if (fldName === "order"){
                        el_input.value = get_dict_value(field_dict, ["code"])
                    } else if (fldName === "rosterdate"){
                        el_input.value = get_dict_value(field_dict, ["display"])
                    } else if (fldName === "shift"){
                        el_input.value = field_dict["code"]
                    }
                    // 'offsetstart' not in itemdict, therefore put code above at 'if (!(fldName in item_dict))'
                    // 'timeduration' not in itemdict, therefore put code above at 'if (!(fldName in item_dict))'
                } else if (tblName === "teammember"){
                    //  absence: ["employee", "order", "datefirst", "datelast", "workminutesperday", "delete"],
                    if (["employee", "order"].indexOf( fldName ) > -1){

                        //el_input.innerText = get_dict_value(field_dict, ["code"])
                        el_input.innerText = get_dict_value(field_dict, ["code"])
                    } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
        //console.log("tblName: ", tblName);
        //console.log("fldName: ", fldName);
        //console.log("field_dict: ", field_dict);
        //console.log("date_iso: ", get_dict_value(item_dict, ["scheme", fldName]));
                        const date_iso = get_dict_value(item_dict, ["scheme", fldName]);
                        const date_JS = get_dateJS_from_dateISO(date_iso);
                        el_input.innerText = format_dateJS_vanilla (loc, date_JS, true, false);
                    } else if (fldName === "timeduration"){
                        const time_duration = get_dict_value(item_dict, ["shift", fldName]);
                        el_input.innerText = display_duration (time_duration, loc.user_lang);
                    }
                } else {

                    if (["code", "name", "namelast", "namefirst", "identifier"].indexOf( fldName ) > -1){
                       const key_str = "value";
                       format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (["customer", "shift"].indexOf( fldName ) > -1){
                       const key_str = "code";
                       format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (fldName === "order"){
                        const key_str = (is_absence) ? "code" : "cust_order_code";
                        format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset);
                    } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                        const hide_weekday = true, hide_year = false;
                        //format_date_elementMOMENT (el_input, el_msg, field_dict, loc.months_abbrev, loc.weekdays_abbrev,
                        //            loc.user_lang, loc.comp_timezone, hide_weekday, hide_year)
                        const date_iso = get_dict_value(field_dict, ["value"]);
                        const date_JS = get_dateJS_from_dateISO(date_iso);
                        const display = format_dateJS_vanilla (loc, date_JS, hide_weekday, hide_year);
                        el_input.value = display;

                    } else if (fldName === "rosterdate"){

                        const hide_weekday = (tblName === "planning") ? false : true;
                        const hide_year = (tblName === "planning") ?  true : false;
                        format_date_elementMOMENT (el_input, el_msg, field_dict, loc.months_abbrev, loc.weekdays_abbrev,
                                            loc.user_lang, loc.comp_timezone, hide_weekday, hide_year)
                    } else if (["offsetstart", "offsetend", "timestart", "timeend"].indexOf( fldName ) > -1){
                        const title_overlap = null
                        format_datetime_elementMOMENT (el_input, el_msg, field_dict, loc.comp_timezone, loc.timeformat, loc.months_abbrev, loc.weekdays_abbrev, title_overlap)
                    } else if (fldName ===  "team"){
                        const key_str = "code";
                        format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)
                    } else if (["employee", "replacement"].indexOf( fldName ) > -1){
                        // fldName "employee") is used in mode absence and shift, teammember table

                        // abscat: use team_pk, but display order_code, is stored in 'value, team_code stored in 'code'
                        const employee_pk = get_dict_value (field_dict, ["pk"])
                        const employee_ppk = get_dict_value (field_dict, ["ppk"])
                        const employee_code = get_dict_value (field_dict, ["code"])

                        if (!!employee_code) {
                            el_input.value = employee_code;
                            el_input.setAttribute("data-value", employee_code);
                        } else {
                            el_input.value = null;
                            el_input.removeAttribute("data-value");
                        }
                        el_input.setAttribute("data-pk", employee_pk);
                        el_input.setAttribute("data-ppk", employee_ppk);
                        //el_input.setAttribute("data-field", fldName);

                    } else if (tblName === "teammember" && fldName === "breakduration"){
                        const key_str = "value";
                        format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (fldName === "timeduration"){
                        const key_str = "value";
                        format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (["workhoursperweek", "workdays", "leavedays"].indexOf( fldName ) > -1){
                        let quotient = null;
                        if(!!Number(value)){
                            const divisor = (fldName === "workhoursperweek") ? 60 : 1440;
                            quotient = value / divisor
                        }
                        el_input.value = quotient
                        el_input.setAttribute("data-value", quotient);

                    } else if (fldName === "inactive") {
                       if(isEmpty(field_dict)){field_dict = {value: false}}
        console.log(">>>>>>>> imgsrc_inactive_black:", imgsrc_inactive_black)
        console.log(">>>>>>>> imgsrc_inactive_lightgrey:", imgsrc_inactive_lightgrey)
                    // format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive, title_inactive, title_active)
                       format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)

                    } else if (fldName === "timeduration"){

                    } else {
                        el_input.value = value
                        if(!!value){
                            el_input.setAttribute("data-value", value);
                        } else {
                            el_input.removeAttribute("data-value");
                        }
                    };
                }  //  if (tblName === "planning"
            //}  // if (fldName in item_dict)
        } // if (isEmpty(item_dict))
    }  // UpdateField

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
        //console.log( "selected_employee_pk", selected_employee_pk);

        let header_text = null;
        if (selected_btn === "employee") {
            header_text = loc.Employee_list
        } else if (selected_btn === "absence") {
            header_text = loc.Absence;
        } else if (selected_btn === "shifts") {
            header_text = loc.Shifts;
        } else if (selected_btn === "calendar") {
            if (selected_employee_pk) {
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
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

    function HandleSelectRowButton(el_input) {
        UploadDeleteInactive("inactive", el_input)
    }

//========= UploadDeleteInactive  ============= PR2019-09-23
    function UploadDeleteInactive(mode, el_input) {
        console.log( " ==== UploadDeleteInactive ====", mode);

        let tblRow = get_tablerow_selected(el_input)
        if(tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table");
            const data_map =  (selected_btn === "absence") ? absence_map :
                              (tblName === "teammember") ? teammember_map : employee_map
            const map_dict = get_mapdict_from_datamap_by_id(data_map, tblRow.id);
            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                let upload_dict = {id: map_dict.id};
                mod_dict = {id: map_dict.id};
                if (tblName === "teammember" && !isEmpty(map_dict["employee"])){
                    mod_dict["employee"] = map_dict["employee"]
                };

                if (mode === "delete"){
                    mod_dict["id"]["delete"] = true;
                    ModConfirmOpen("delete", tblRow);
                    return false;
                } else if (mode === "inactive"){
            // get inactive from map_dict
                    const inactive = get_dict_value(map_dict, ["inactive", "value"], false)
            // toggle inactive
                    const new_inactive = (!inactive);
                    upload_dict["inactive"] = {"value": new_inactive, "update": true};
            // change inactive icon, before uploading
                    // format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive, title_inactive, title_active)
                    //console.log("format_inactive_element")

                    format_inactive_element (el_input, mod_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            // ---  show modal, only when made inactive
                    if(!!new_inactive){
                        mod_dict["inactive"] = {"value": new_inactive, "update": true};
                        ModConfirmOpen("inactive", tblRow);
                        return false;
                    }
                }
                const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload
                UploadChanges(upload_dict, url_str);
            }  // if (!isEmpty(map_dict))
        }  //   if(!!tblRow)
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
                        if (["workminutesperday", "workdays", "leavedays",].indexOf( fieldname ) > -1){
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
        console.log(" === ModTimepickerChanged ===" );
        // ModTimepickerChanged is returned by ModTimepickerSave in modtimepicker.js
        console.log("tp_dict", tp_dict);

        const pgeName = tp_dict.page;
        console.log("pgeName", pgeName);

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
                        console.log(msg + '\n' + xhr.responseText);
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
        console.log("url_str: ", url_str);
        console.log("upload_dict: ", upload_dict);

        if(!isEmpty(upload_dict)) {
            const parameters = {"upload": JSON.stringify (upload_dict)}

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("absence_row" in response) {
                        UpdateTeammemberFromResponse(response["absence_row"])
                    };

                    if ("update_employee_row" in response) {
                        UpdateEmployeeFromResponse(response["update_employee_row"]);
                    };

                    if ("employee_list" in response) {
                        refresh_datamap(response["employee_list"], employee_map)

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
                        refresh_datamap(response["teammember_list"], teammember_map)
                    };
                    if ("teammember_update" in response) {
                        UpdateTeammemberFromResponse(response["teammember_update"]);
                    };
                    if ("employee_calendar_list" in response) {
                        refresh_datamap(response["employee_calendar_list"], calendar_map)
                        CreateCalendar("employee", selected_calendar_period, calendar_map, MSE_Open, loc, loc.timeformat, user_lang);
                    }
                },  // success: function (response) {
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModShiftTimepickerOpen  ================ PR2019-10-12
    function ModShiftTimepickerOpen(el_input) {
        console.log("=== ModShiftTimepickerOpen ===");
        // calledby = 'absence' or 'modshift'

        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", selected_teammember_pk );
        console.log("mod_dict", mod_dict);

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
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete, imgsrc_deletered: imgsrc_deletered
                       };

        console.log("tp_dict: ", tp_dict);
        console.log("st_dict: ", st_dict);
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
        console.log("===  ModPeriodSave  =====") ;
        console.log("mod_dict: ", deepcopy_dict(mod_dict) ) ;
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
            employee_pk: (!!selected_employee_pk) ? selected_employee_pk : null,
            add_shifts_without_employee: false,
            skip_restshifts: false,
            orderby_rosterdate_customer: false
        };
        let datalist_request = {planning_period: selected_planning_period,
                                employee_planning: employee_planning_dict};
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
    function ModConfirmOpen(mode, tblRow) {
        console.log(" -----  ModConfirmOpen   ----", mode)

        const is_delete = (mode === "delete");
        const tblName = (tblRow) ? get_attr_from_el (tblRow, "data-table") :
                      (selected_btn === "employee") ? "employee" : "teammember"
        const is_tbl_teammember = (tblName === "teammember")
        let show_modal = is_delete;
        if(!tblRow){
// when clicked on delete button in submenu there is no tblRow, use selected_pk instead
            const selected_pk = (selected_btn === "employee") ? selected_employee_pk : selected_teammember_pk;
            tblRow = document.getElementById(get_map_id(tblName, selected_pk));
        }
        let msg01_txt = null, msg02_txt = null, hide_btn_save = false, btn_save_caption = null, btn_cancel_caption = loc.No_cancel;
        if(!tblRow){
            msg01_txt = (selected_btn === "employee") ? loc.Pease_select_employee_first :
                        (selected_btn === "absence") ? loc.Pease_select_absence_first : null;
            hide_btn_save = true;
            btn_cancel_caption = loc.Close;
            show_modal = true;
        } else {
            const data_map = (selected_btn === "employee") ? employee_map : absence_map;
            const map_dict = get_mapdict_from_datamap_by_id(data_map, tblRow.id);

            mod_dict = {id: map_dict.id, map_id: tblRow.id, table: tblName, mode: mode};

// +++  set inactive // only table employee has inactive field
            if (!is_delete){
    // ---  toggle inactive
                const is_inactive = (!map_dict.inactive);
    // ---  show modal confirm only when employee is made inactive
                show_modal = is_inactive;
                mod_dict.inactive = is_inactive;
    // ---  when made active: UploadChanges withoutt showing confirm box
                if(!is_inactive){
                    const upload_dict = {id: {pk: map_dict.id, table: tblName, mode: mod_dict.mode},
                                        inactive: {value: is_inactive, update: true}}
                    UploadChanges(mod_dict, url_employee_upload);
                }
            }
// +++  get msg_txt en btn_caption
            if (!is_delete){
                // inactive, only tbl employee has inactive button
                msg01_txt = loc.Employee + " '" +  map_dict.code + "' " + loc.will_be_made_inactive;
            } else if (!is_tbl_teammember){
                msg01_txt = loc.Employee + " '" +  map_dict.code + "' " +  loc.will_be_deleted;
            } else {
                 msg01_txt = loc.Absence + " '" + map_dict.o_code  + "' " + loc.of + " " + map_dict.e_code + " " +  loc.will_be_deleted;;
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
        $("#id_mod_confirm").modal("hide");

        const tblName = mod_dict.table;
        const pk_int = mod_dict.id;
        const is_delete = (mod_dict.mode === "delete")
        console.log("mod_dict:", mod_dict);
        console.log("is_delete:", is_delete);
// - make tblRow red when delete
        // upload_dict when delete absence:
        // upload_dict: {'id': {'pk': 1882, 'table': 'teammember', 'shiftoption': 'isabsence', 'delete': True}}
        if (is_delete) {
            let tr_changed = document.getElementById(mod_dict.map_id);
            ShowClassWithTimeout(tr_changed, cls_error)
        }
        const shift_option = (selected_btn === "absence") ? "isabsence" :
                             (selected_btn === "shifts") ? "teammember" : null;
        const upload_dict = {id: {pk: pk_int, table: tblName, shiftoption: shift_option}};
        if(is_delete) { upload_dict["id"]["delete"] = true };
        const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload
        UploadChanges(upload_dict, url_str);
    }

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// +++++++++++++++++ MODAL SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//========= ModSelectEmployee_Open ====================================  PR2020-02-27
    function ModSelectEmployee_Open (mode) {
        console.log(" ===  ModSelectEmployee_Open  =====") ;
        // opens modal select open from sidebar
        let employee_pk = (selected_employee_pk > 0) ? selected_employee_pk : null;
        mod_dict = {employee_pk: employee_pk};

        let tblBody = document.getElementById("id_ModSelEmp_tbody_employee");
        const tblHead = null, filter_ppk_int = null, filter_include_inactive = true,
                filter_show_inactive = false, filter_include_absence = false, filter_istemplate = false,
                        addall_to_list_txt = "<" + loc.All_employees + ">";

        t_Fill_SelectTable(tblBody, tblHead, employee_map, "employee", selected_employee_pk, null,
            ModSelectEmployee_FilterEmployee, null, ModSelectEmployee_SelectEmployee, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected, cls_hover );
        ModSelectEmployee_headertext();
// hide button /remove employee'
        document.getElementById("id_MSE_div_btn_remove").classList.add(cls_hide)
// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_select_employee_input_employee.focus()
        }, 500);
    // ---  show modal
         $("#id_mod_select_employee").modal({backdrop: true});
}; // ModSelectEmployee_Open

//=========  ModSelectEmployee_Save  ================ PR2020-01-29
    function ModSelectEmployee_Save() {
        console.log("===  ModSelectEmployee_Save =========");

// ---  get map_dict, put employee_code in sidebar select employee
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", mod_dict.employee_pk);
        const employee_code = get_dict_value(map_dict, ["code", "value"]);
        const display_text = (employee_code) ? employee_code : loc.Select_employee + "...";
        el_sidebar_select_employee.value = display_text;

// ---  update header text
        UpdateHeaderText();

// ---  upload new setting
        const upload_dict = {selected_pk: {sel_employee_pk: mod_dict.employee_pk}};
        UploadSettings (upload_dict, url_settings_upload);

// hide modal
        $("#id_mod_select_employee").modal("hide");
    }  // ModSelectEmployee_Save

//=========  ModSelectEmployee_SelectEmployee  ================ PR2020-01-09
    function ModSelectEmployee_SelectEmployee(tblRow) {
        //console.log( "===== ModSelectEmployee_SelectEmployee ========= ");
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
                    mod_dict.employee_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_employee_pk){
                    mod_dict.employee_pk = pk_int;
                }
            }
// ---  put value in input box
            // not necessary, form closes after selecting employee
            //el_mod_select_employee_input_employee.value = get_attr_from_el(tblRow, "data-value", "")
            //ModSelectEmployee_headertext();

            ModSelectEmployee_Save()
        }
    }  // ModSelectEmployee_SelectEmployee

//=========  ModSelectEmployee_FilterEmployee  ================ PR2020-03-01
    function ModSelectEmployee_FilterEmployee() {
        console.log( "===== ModSelectEmployee_FilterEmployee  ========= ");

// ---  get value of new_filter
        let new_filter = el_mod_select_employee_input_employee.value

        let tblBody = document.getElementById("id_ModSelEmp_tbody_employee");
        const len = tblBody.rows.length;
        if (!!new_filter && !!len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one employee: put selected employee in el_mod_select_employee_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (selected_pk) {
                el_mod_select_employee_input_employee.value = get_dict_value(filter_dict, ["selected_value"])
// ---  put pk of selected employee in mod_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_dict.employee_pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    console.log( "pk_int", pk_int);
                    if (pk_int !== selected_employee_pk){
                        mod_dict.employee_pk = pk_int;
                    }
                }
                ModSelectEmployee_headertext();
// ---  Set focus to btn_save
                el_mod_select_employe_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // ModSelectEmployee_FilterEmployee

    function ModSelectEmployee_headertext() {
        //console.log( "=== ModSelectEmployee_headertext  ");
        let header_text = null;
        if(mod_dict.employee_pk){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", mod_dict.employee_pk)
            const employee_code = get_dict_value(map_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.Select_employee
        }
        document.getElementById("id_ModSelEmp_hdr_employee").innerText = header_text

    }  // ModSelectEmployeeE_headertext


//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModEmployeeOpen  ================ PR2019-11-06
    function ModEmployeeOpen(el_input) {
        console.log(" -----  ModEmployeeOpen   ----")
        console.log("el_input: ", el_input)
        // ModEmployeeOpen is called bij tblRow_teammember, either employee or replacement
        // tblRow attribute "data-employee_pk" always contains pk of employee, not replacement

        // mod_dict contains info of selected row and employee.
        let tblRow = get_tablerow_selected(el_input);
        const id_dict = get_iddict_from_element(tblRow);
        const row_id_str = get_attr_from_el_str(tblRow, "id")
        console.log("row_id_str: ", row_id_str)

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
        const employee_pk = get_attr_from_el(tblRow, "data-employee_pk");
        console.log("tblRow: ", tblRow)
        console.log("employee_pk: ", employee_pk)

        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
        const employee_code = get_dict_value(employee_dict, ["code", "value"]);
        if(!isEmpty(employee_dict)){
            mod_dict["employee_or_replacement"] = {
                pk: employee_pk,
                ppk: get_dict_value(employee_dict, ["id", "ppk"]),
                code: employee_code
        }};

// ---  also get absence category
        if(is_absence){
            let el_abscat = tblRow.cells[1].children[0]
            if(!!el_abscat.value){
                const team_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "team", el_abscat.value)
                if(!isEmpty(team_dict)){
                    mod_dict["abscat"] = {
                        pk: get_dict_value(team_dict, ["pk"]),
                        ppk: get_dict_value(team_dict, ["ppk"]),
                        code: get_dict_value(team_dict, ["code", "value"]),
                        table: "team"}
        }}};
        console.log("mod_dict", mod_dict)

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
        let el_mod_employee_input = document.getElementById("id_MSE_input_employee")
        el_mod_employee_input.value = null

        console.log("---------- employee_pk: ", employee_pk)
        ModEmployeeFillSelectTableEmployee(Number(employee_pk))

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

// ---  show modal
        $("#id_mod_select_employee").modal({backdrop: true});

    };  // ModSelectEmployeeOpen

//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        console.log( "===== ModEmployeeSelect ========= ");

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
                document.getElementById("id_MSE_input_employee").value = employee_code
// save selected employee
                ModEmployeeSave("save");
            }  // if(!isEmpty(employee_dict))
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-11-06
    function ModEmployeeFilterEmployee(option, event_key) {
        //console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let el_input = document.getElementById("id_MSE_input_employee")
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
        let tblbody = document.getElementById("id_ModSelEmp_tbody_employee");
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
        console.log("========= ModEmployeeSave ===" );
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
    $("#id_mod_select_employee").modal("hide");
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
    function ModEmployeeFillSelectTableEmployee(selected_employee_pk) {
        console.log( "=== ModEmployeeFillSelectTableEmployee ");
        console.log( "selected_employee_pk: ", selected_employee_pk, typeof selected_employee_pk);

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = loc.No_employees + ":";

        let tblBody = document.getElementById("id_ModSelEmp_tbody_employee");
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
                const add_to_list = (!is_inactive && within_range && pk_int !== selected_employee_pk);
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
                } //  if (pk_int !== selected_employee_pk){
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // ModEmployeeFillSelectTableEmployee


// +++++++++++++++++ MODAL FORM EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//=========  MFE_Open  ================  PR2020-06-06
    function MFE_Open(el_input) {
        console.log(" -----  MFE_Open   ----")

// ---  get info from tblRow
        const tblRow = get_tablerow_selected(el_input)
        const tblRow_employee_pk = get_attr_from_el(tblRow, "data-pk" )
        const tblRow_employee_ppk = get_attr_from_el(tblRow, "data-ppk" )
        const map_id = (tblRow) ? tblRow.id : null
        console.log("map_id", map_id)
        console.log("map_id", map_id)
// ---  create  mod_MFE_dict
        mod_MFE_dict = deepcopy_dict(get_mapdict_from_datamap_by_id(employee_map, map_id))
        console.log("mod_MFE_dict", mod_MFE_dict)

// ---  update selected_employee_pk
        selected_employee_pk = mod_MFE_dict.id;

// ---  put employee_code in header
        const header_text = (mod_MFE_dict.code) ? mod_MFE_dict.code : loc.Employee;
        document.getElementById("id_MFE_hdr_employee").innerText = header_text;

// ---  fill functioncode select options. t_FillOptionsAbscat is also used for functioncodes
        const el_MFE_functioncode = document.getElementById("id_MFE_fc_id");
        t_FillOptionsAbscat(loc, el_MFE_functioncode, functioncode_map, mod_MFE_dict.fc_id);
// ---  employee form
        let form_elements = document.getElementById("id_MFE_div_form_controls").querySelectorAll(".form-control")
        for (let i = 0, el, fldName, value; el = form_elements[i]; i++) {
            el = form_elements[i];
            if(el){
                fldName = get_attr_from_el(el, "data-field");
                if(["workhoursperweek", "workminutesperday"].indexOf(fldName) > -1){
                    value = mod_MFE_dict[fldName] / 60;
                } else if (fldName === "leavedays"){
                    value = mod_MFE_dict[fldName] / 1440;
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
            let form_elements = document.getElementById("id_MFE_div_form_controls").querySelectorAll(".form-control")
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
    }  // MFE_Open

//=========  MFE_save  ================  PR2020-06-06
    function MFE_save(crud_mode) {
        console.log(" -----  MFE_save  ----", crud_mode);
        console.log( "mod_MFE_dict: ", mod_MFE_dict);
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: 'employee' } }

        if(mod_MFE_dict.id) {
            upload_dict.id.pk = mod_MFE_dict.id;
            upload_dict.id.ppk = mod_MFE_dict.comp_id;
            upload_dict.id.mapid = mod_MFE_dict.mapid;
            if(is_delete) {upload_dict.id.delete = true}
        } else {
            upload_dict.id.create = true;
        }
// ---  loop through input elements
        let form_elements = document.getElementById("id_MFE_div_form_controls").querySelectorAll(".form-control")
        for (let i = 0, el_input, len = form_elements.length; i < len; i++) {
            el_input = form_elements[i]
            if(el_input){
                const fldName = get_attr_from_el(el_input, "data-field");
                let new_value = null
                if(["workhoursperweek", "workminutesperday", "workdays", "leavedays"].indexOf(fldName) > -1){
                    const arr = get_number_from_input(loc, fldName, el_input.value);
                    new_value = arr[0];
                } else if(["functioncode"].indexOf(fldName) > -1){
                    new_value = (el_input.value) ? Number(el_input.value) : null;
                } else {
                    new_value = (el_input.value) ? el_input.value : null;
                }
                const old_value = get_dict_value(mod_MFE_dict, [fldName])
                if (new_value !== old_value) { upload_dict[fldName] = {value: new_value, update: true}};
            };
        }
// ---  make tblRow red
        if(is_delete){
            let tr_changed = document.getElementById(mod_MFE_dict.map_id);
            ShowClassWithTimeout(tr_changed, cls_error);
        }

       console.log("upload_dict", upload_dict)
// ---  modal is closed by data-dismiss="modal"
        UploadChanges(upload_dict, url_employee_upload);
    }  // MFE_save

//=========  MFE_validate_and_disable  ================  PR2020-06-06
    function MFE_validate_and_disable(el_input) {
        console.log(" -----  MFE_validate_and_disable   ----")
        const code_value = document.getElementById("id_MFE_code").value;
        const namelast_value = document.getElementById("id_MFE_namelast").value;
        const code_is_blank = (!document.getElementById("id_MFE_code").value)
        const namelast_is_blank = (!document.getElementById("id_MFE_namelast").value)

        let invalid_number = false;
        if(el_input){
            const fldName = get_attr_from_el(el_input, "data-field");
            if(["workhoursperweek", "workdays", "leavedays"].indexOf(fldName) > -1){
                const arr = get_number_from_input(loc, fldName, el_input.value);
                const msg_err = arr[1];
                invalid_number = (msg_err);
                const el_msg_err = document.getElementById("id_MFE_err_" + fldName)
                if(el_msg_err){
                    add_or_remove_class(el_msg_err, "text-danger", (msg_err))
                    el_msg_err.innerText = (msg_err) ? msg_err : (fldName === "leavedays") ? loc.Leavedays_are_on_fulltime_basis : null;
                    if(fldName !== "leavedays"){add_or_remove_class(el_msg_err, cls_hide, (!msg_err))};
                }
            }
        }

        const el_MFE_datefirst = document.getElementById("id_MFE_datefirst")
        const el_MFE_datelast = document.getElementById("id_MFE_datelast")
        el_MFE_datefirst.max = (el_MFE_datelast.value) ? el_MFE_datelast.value : null;
        el_MFE_datelast.min = (el_MFE_datefirst.value) ? el_MFE_datefirst.value : null;

        el_MFE_btn_save.disabled = (code_is_blank || namelast_is_blank);
        add_or_remove_class(document.getElementById("id_MFE_err_code"), cls_hide, !code_is_blank)
        add_or_remove_class(document.getElementById("id_MFE_err_lastname"), cls_hide, !namelast_is_blank)

    }

// +++++++++++++++++ MODAL ABSENCE +++++++++++++++++++++++++++++++++++++++++++

//=========  ModAbsence_Open  ================  PR2020-05-14
    function MAB_Open(el_input) {
        console.log(" =====  MAB_Open =====")
        // when el_input doesn't exist it is a new absence, called by submenu_btn
        // MAB_Save adds 'create' to 'id' when  mod_MAB_dict.teammember.pk = null
        mod_MAB_dict = {};

// ---  get info from el_input and tblRow --------------------------------
        const is_addnew = (!el_input);
        const tblRow = get_tablerow_selected(el_input)
        const data_pk = get_attr_from_el(tblRow, "data-pk");
        const tblRow_rowIndex = (tblRow) ? tblRow.rowIndex : null;
        const map_id = (tblRow) ? tblRow.id : null;
        const fldName = get_attr_from_el(el_input, "data-field");

// --- get info from data_maps
        // get info from absence_map, not teammember_map
        const map_dict = get_mapdict_from_datamap_by_id(absence_map, map_id);
        console.log("map_dict", map_dict)

        selected_teammember_pk = (map_dict.id) ? map_dict.id : null;

        mod_MAB_dict.row_dict = deepcopy_dict(map_dict);
        mod_MAB_dict.page = "modabsence";
        // mod_MAB_dict.skip_focus_event = false;
        mod_MAB_dict.map_id = map_id;
        mod_MAB_dict.teammember_pk = map_dict.id;
        mod_MAB_dict.teammember_ppk = map_dict.t_id;
        mod_MAB_dict.order_pk = map_dict.o_id;
        mod_MAB_dict.order_ppk = map_dict.c_id;
        // remove tilde from abscat PR2020-8-14
        mod_MAB_dict.order_code = (map_dict.o_code) ? map_dict.o_code.replace(/~/g,"") : null;
        mod_MAB_dict.employee_pk = map_dict.e_id;
        mod_MAB_dict.employee_code = map_dict.e_code;
        mod_MAB_dict.employee_datefirst = map_dict.e_df;
        mod_MAB_dict.employee_datelast = map_dict.e_dl;
        mod_MAB_dict.datefirst = map_dict.s_df;
        mod_MAB_dict.datelast = map_dict.s_dl;

        mod_MAB_dict.offsetstart = (map_dict.sh_os_arr) ? map_dict.sh_os_arr[0] : null;
        mod_MAB_dict.offsetend = (map_dict.sh_oe_arr) ? map_dict.sh_oe_arr[0] : null;
        mod_MAB_dict.breakduration = (map_dict.sh_bd_arr) ? map_dict.sh_bd_arr[0] : null;
        mod_MAB_dict.timeduration = (map_dict.sh_td_arr) ? map_dict.sh_td_arr[0] : null;

        mod_MAB_dict.oneday_only = (mod_MAB_dict.datefirst && mod_MAB_dict.datelast && mod_MAB_dict.datefirst === mod_MAB_dict.datelast)

        mod_MAB_dict.old_order_pk = mod_MAB_dict.order_pk;
        mod_MAB_dict.old_datefirst = mod_MAB_dict.datefirst;
        mod_MAB_dict.old_datelast = mod_MAB_dict.datelast;
        mod_MAB_dict.old_offsetstart = mod_MAB_dict.offsetstart;
        mod_MAB_dict.old_offsetend = mod_MAB_dict.offsetend;
        mod_MAB_dict.old_breakduration = mod_MAB_dict.breakduration;
        mod_MAB_dict.old_timeduration = mod_MAB_dict.timeduration;

        if(is_addnew) { mod_MAB_dict.create = true} ;

// --- when no employee selected: fill select table employee
        // MAB_FillSelectTable("employee") is called by MAB_GotFocus
// ---  put employee_code in header
        const header_text = (selected_teammember_pk) ? loc.Absence + " " + loc.of + " " + mod_MAB_dict.employee_code : loc.Absence;
        document.getElementById("id_MAB_hdr_absence").innerText = header_text;
// --- hide input element employee, when employee selected
        show_hide_element_by_id("id_MAB_div_input_employee", !selected_teammember_pk)
// --- hide delete button when no employee selected
        add_or_remove_class(document.getElementById("id_MAB_btn_delete"), cls_hide, !selected_teammember_pk)
// ---  update Inputboxes
        el_MAB_input_employee.value = mod_MAB_dict.employee_code
        el_MAB_input_abscat.value = mod_MAB_dict.order_code
        MAB_UpdateDatefirstlastInputboxes();

        MAB_UpdateOffsetInputboxes();
// ---  enable btn_save and input elements
        MAB_BtnSaveEnable();
// ---  set focus to input_element, to abscat if not defined
        const el_focus_id = (is_addnew) ? "id_MAB_input_employee" :
                            (fldName === "employee") ? "id_MAB_input_order" :
                            (fldName ) ? "id_MAB_input_" + fldName : "id_MAB_input_order";
        set_focus_on_el_with_timeout(document.getElementById(el_focus_id), 50)

// ---  select table is filled in MAB_GotFocus, but is not called when clicked on other fields then employee or
        if (["datefirst", "datelast", "offsetstart", "offsetend", "breakduration", "timeduration"].indexOf(fldName) > -1) {
            MAB_FillSelectTable("MAB_Open", "order", mod_MAB_dict.order_pk);
        }
// ---  show modal
        $("#id_mod_absence").modal({backdrop: true});
    }  // MAB_Open

//=========  ModAbsence_Save  ================  PR2020-05-17
    function MAB_Save(crud_mode) {
        console.log(" -----  MAB_Save  ----", crud_mode);
        console.log( "mod_MAB_dict: ", mod_MAB_dict);
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: "teammember", shiftoption: "isabsence"}};
        if(is_delete){
// - make tblRow red when delete
            let tr_changed = document.getElementById(mod_MAB_dict.map_id);
            ShowClassWithTimeout(tr_changed, cls_error)

            const pk_int = mod_MAB_dict.teammember_pk;
            upload_dict = {id: {pk: pk_int, table: "teammember", shiftoption: "isabsence", delete: true}};
        } else {
            upload_dict = {id: {isabsence: true, table: 'teammember', shiftoption: "isabsence"} }
            // update_dict is to update row before response is back from server
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

            if(mod_MAB_dict.teammember_pk) {
                upload_dict.id.pk = mod_MAB_dict.teammember_pk;
                upload_dict.id.ppk = mod_MAB_dict.teammember_ppk;
                upload_dict.id.map_id = mod_MAB_dict.map_id;
                if(is_delete) {upload_dict.id.delete = true}
            } else {
                upload_dict.id.create = true;
            }
            if (mod_MAB_dict.order_pk !== mod_MAB_dict.old_order_pk) {
                upload_dict.order = {pk: mod_MAB_dict.order_pk,
                                        ppk: mod_MAB_dict.order_ppk,
                                        code: mod_MAB_dict.order_code,
                                        update: true};
                update_dict.o_code = mod_MAB_dict.order_code;
            }
            if (el_MAB_datefirst.value !== mod_MAB_dict.row_dict.s_df) {
                upload_dict.datefirst = {value: el_MAB_datefirst.value, update: true};
                update_dict.s_df = el_MAB_datefirst.value;
            }
            if (el_MAB_datelast.value !== mod_MAB_dict.row_dict.s_dl) {
                upload_dict.datelast = {value: el_MAB_datelast.value, update: true}
                update_dict.s_dl = el_MAB_datelast.value;
            }
            if (mod_MAB_dict.offsetstart !== mod_MAB_dict.old_offsetstart) {
                upload_dict.offsetstart = {value: mod_MAB_dict.offsetstart, update: true};
                update_dict.sh_os_arr = [mod_MAB_dict.offsetstart];
            }
            if (mod_MAB_dict.offsetend !== mod_MAB_dict.old_offsetend) {
                upload_dict.offsetend = {value: mod_MAB_dict.offsetend, update: true};
                update_dict.sh_oe_arr = [mod_MAB_dict.offsetend];
            }
            if (mod_MAB_dict.breakduration !== mod_MAB_dict.old_breakduration) {
                upload_dict.breakduration = {value: mod_MAB_dict.breakduration, update: true};
                update_dict.sh_bd_arr = [mod_MAB_dict.breakduration];
            }
            if (mod_MAB_dict.timeduration !== mod_MAB_dict.old_timeduration) {
                upload_dict.timeduration = {value: mod_MAB_dict.timeduration, update: true};
                update_dict.sh_td_arr = [mod_MAB_dict.timeduration];
            }
            if(mod_MAB_dict.employee_pk) {
                upload_dict.employee = {pk: mod_MAB_dict.employee_pk,
                                        ppk: mod_MAB_dict.employee_ppk,
                                        code: mod_MAB_dict.employee_code,
                                        update: true};
            }
            const tblRow = document.getElementById(mod_MAB_dict.map_id)
            console.log( "upload_dict ", upload_dict);
            console.log( "update_dict ", update_dict);
            if(tblRow){
                 UpdateTeammemberTblRow(tblRow, mod_MAB_dict.map_id, update_dict)
            }
        }
// ---  UploadChanges
        const url_str = url_teammember_upload
        UploadChanges(upload_dict, url_str, "MAB_Save");

    }  // MAB_Save

//========= MAB_FillSelectTable  ============= PR2020-05-17 PR2020-08-08
    function MAB_FillSelectTable(calledby, tblName, selected_pk) {
        console.log( "=== MAB_FillSelectTable === ", tblName);
        console.log( "calledby ", calledby);

        let tblBody = document.getElementById("id_MAB_tblbody_select");
        tblBody.innerText = null;

        const is_tbl_employee = (tblName === "employee");
        console.log( "is_tbl_employee ", is_tbl_employee);

        const hdr_text = (is_tbl_employee) ? loc.Employees : loc.Absence_categories
        const el_MAB_hdr_select = document.getElementById("id_MAB_hdr_select");
        el_MAB_hdr_select.innerText = hdr_text;

        const data_map = (is_tbl_employee) ? employee_map : abscat_map;
        console.log( "employee_map ", employee_map);
        console.log( "abscat_map ", abscat_map);
        let row_count = 0
        if (data_map.size){
//--- loop through employee_map
            for (const [map_id, map_dict] of data_map.entries()) {
                const pk_int = map_dict.id;
                const ppk_int = (is_tbl_employee) ? map_dict.comp_id : map_dict.c_id;
                let code_value = (is_tbl_employee) ? map_dict.code : map_dict.o_code;
                // remove tilde from abscat PR2020-08-14
                if (!is_tbl_employee && code_value.includes("~")){code_value = code_value.replace(/~/g,"")}
                const is_inactive = (is_tbl_employee) ? map_dict.inactive : map_dict.o_inactive;
// --- validate if employee can be added to list
                if (!is_inactive){
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
                    tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});
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
                } //  if (pk_int !== selected_teammember_pk){
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
//--- when no items found: show 'select_employee_none'
        if(!row_count){
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = (is_tbl_employee) ? loc.No_employees : loc.No_absence_categories;
        }
    } // MAB_FillSelectTable

//=========  MAB_InputElementKeyup  ================ PR2020-05-15
    function MAB_InputElementKeyup(tblName, el_input) {
        //console.log( "=== MAB_InputElementKeyup  ", tblName)
        //console.log( "mod_MAB_dict", mod_MAB_dict)
        const new_filter = el_input.value
        let tblBody_select = document.getElementById("id_MAB_tblbody_select");
        const len = tblBody_select.rows.length;
        if (!!new_filter && !!len){
// ---  filter select rows
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
            //console.log( "filter_dict", filter_dict)
// ---  get pk of selected item (when there is only one row in selection)
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (only_one_selected_pk) {
                let selected_order_pk = null;
                // dont skip skip_focus_event when tblName = employee, because abscat selecttable must be filled
                if(tblName !== "employee") {
                    // ???? mod_MAB_dict.skip_focus_event = true

        //.log("tblName !== employee  skip_focus_event: ", mod_MAB_dict.skip_focus_event)
                };
                console.log("only_one_selected_pk:", only_one_selected_pk)
// ---  highlight clicked row
                t_HighlightSelectedTblRowByPk(tblBody_select, only_one_selected_pk)
// ---  put value in input box, put employee_pk in mod_MAB_dict, set focus to select_abscatselect_abscat
// ---  put value of only_one_selected_pk in mod_MAB_dict and update selected_teammember_pk
                if(tblName === "employee"){
                    MAB_SetEmployeeDict(only_one_selected_pk);
// ---  put code_value in el_input_employee
                    el_MAB_input_employee.value = mod_MAB_dict.employee_code;
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
// ---  enable el_shift, set focus to el_shift
                    set_focus_on_el_with_timeout(el_MAB_input_abscat, 50)
                } else {
                    MAB_SetOrderDict(only_one_selected_pk);
                    el_MAB_input_abscat.value = mod_MAB_dict.order_code;
                    set_focus_on_el_with_timeout(el_MAB_datefirst, 50)
                }
    // ---  enable btn_save and input elements
                MAB_BtnSaveEnable();
            }  //  if (!!selected_pk) {
        }
    }  // MAB_InputElementKeyup

//=========  MAB_SelectRowClicked  ================ PR2020-05-15
    function MAB_SelectRowClicked(tblRow, tblName) {
        console.log( "===== MAB_SelectRowClicked ========= ", tblName);
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
            } else {
// ---  put value of data-pk in mod_MAB_dict and update selected_teammember_pk
                MAB_SetOrderDict(selected_pk);
// ---  put code_value in el_input_employee
                el_MAB_input_abscat.value = mod_MAB_dict.order_code;
            }
// ---  enable btn_save and input elements
            MAB_BtnSaveEnable();
        }  // if(!!tblRow) {
    }  // MAB_SelectRowClicked

//=========  MAB_GotFocus  ================ PR2020-05-17
    function MAB_GotFocus (tblName, el_input) {
        console.log(" =====  MAB_GotFocus  ===== ", tblName)
        console.log("skip_focus_event: ", mod_MAB_dict.skip_focus_event)
        if(mod_MAB_dict.skip_focus_event){
            mod_MAB_dict.skip_focus_event = false;
        } else {
            if (tblName === "employee") {
                el_MAB_input_employee.value = null;
                el_MAB_input_abscat.value = null
                document.getElementById("id_MAB_msg_input_datefirstlast").innerText = null;
                // reset select table when input order got focus
                MAB_FillSelectTable("MAB_GotFocus", tblName);
            } else if (tblName === "order") {
                el_MAB_input_abscat.value =  (mod_MAB_dict.order_code) ? mod_MAB_dict.order_code : null;
                MAB_FillSelectTable("MAB_GotFocus", tblName, mod_MAB_dict.order_pk);
            }
        }
        console.log("skip_focus_event: ", mod_MAB_dict.skip_focus_event)
    }  // MAB_GotFocus

//=========  MAB_UpdateDatefirstlastInputboxes  ================ PR2020-05-17
    function MAB_UpdateDatefirstlastInputboxes(){
        console.log( " --- MAB_UpdateDatefirstlastInputboxes --- ");
        // absence datefirst / datelast are stored in scheme.datefirst / datelast
        console.log( "mod_MAB_dict", mod_MAB_dict);

// set msg when employee has last day in service
        const el_msg = document.getElementById("id_MAB_msg_input_datefirstlast")
        add_or_remove_class(el_msg, cls_hide, !mod_MAB_dict.employee_datelast)
        // PR2020-08-02 was: format_date_iso (mod_MAB_dict.employee_datelast, loc.months_long, loc.weekdays_long, false, false, loc.user_lang)
        const date_formatted = format_dateISO_vanilla (loc, mod_MAB_dict.employee_datelast, true, false, true);
        el_msg.innerText = (mod_MAB_dict.employee_datelast) ? mod_MAB_dict.employee_code + loc.is_in_service_thru + date_formatted + "." : null;

        console.log( "mod_MAB_dict.datefirst", mod_MAB_dict.datefirst);
        console.log( "mod_MAB_dict.datelast", mod_MAB_dict.datelast);
        el_MAB_datefirst.value = mod_MAB_dict.datefirst;
        el_MAB_datelast.value = mod_MAB_dict.datelast;
        console.log( "mod_MAB_dict.employee_datefirst", mod_MAB_dict.employee_datefirst);
        console.log( "mod_MAB_dict.employee_datelast", mod_MAB_dict.employee_datelast);

        mod_MAB_dict.oneday_only = (mod_MAB_dict.datefirst && mod_MAB_dict.datelast && mod_MAB_dict.datefirst === mod_MAB_dict.datelast)
        el_MAB_oneday.checked = mod_MAB_dict.oneday_only;
        el_MAB_datelast.readOnly = mod_MAB_dict.oneday_only;
        if(el_MAB_datefirst.value && el_MAB_datelast.value && el_MAB_datelast.value < el_MAB_datefirst.value)  {
            el_MAB_datelast.value = el_MAB_datefirst.value;
        }
        cal_SetDatefirstlastMinMax(el_MAB_datefirst, el_MAB_datelast, mod_MAB_dict.employee_datefirst, mod_MAB_dict.employee_datelast, mod_MAB_dict.oneday_only);
    }  // MAB_UpdateDatefirstlastInputboxes

//=========  MAB_DateFirstLastChanged  ================ PR2020-07-14
    function MAB_DateFirstLastChanged(el_input) {
        console.log(" =====  MAB_DateFirstLastChanged   ======= ");
        //console.log("el_input", el_input);
        //console.log("mod_MAB_dict", mod_MAB_dict);

        if(el_input){
            const fldName = get_attr_from_el(el_input, "data-field")
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
        } else {
            el_MAB_datefirst.value = mod_MAB_dict.datefirst;
            el_MAB_datelast.value = mod_MAB_dict.datelast;
            if(mod_MAB_dict.datefirst && mod_MAB_dict.datefirst === mod_MAB_dict.datelast ) {
                el_MAB_oneday.checked = true;
            }
            add_or_remove_attr (el_MAB_datelast, "min", (!!mod_MAB_dict.datefirst), mod_MAB_dict.datefirst);
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
                                   (fldName === "timeduration") ? loc.Working_hours : null;
            let st_dict = { url_settings_upload: url_settings_upload,
                            text_curday: loc.Current_day, text_prevday: loc.Previous_day, text_nextday: loc.Next_day,
                            txt_dateheader: txt_dateheader,
                            txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                            show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete, imgsrc_deletered: imgsrc_deletered
                            };
            console.log("tp_dict", tp_dict);
            console.log("st_dict", st_dict);
            mtp_TimepickerOpen(loc, el_input, MAB_TimepickerResponse, tp_dict, st_dict)
        }
    };  // MAB_TimepickerOpen

//=========  MAB_TimepickerResponse  ================
    function MAB_TimepickerResponse(tp_dict){
        console.log( " === MAB_TimepickerResponse ");
        // put new value from modTimepicker in ModShift PR2019-11-24
        console.log( "tp_dict: ", tp_dict);
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

//=========  MAB_BtnSaveEnable  ================ PR2020-08-08
    function MAB_BtnSaveEnable(){
        console.log( " --- MAB_BtnSaveEnable --- ");

// --- make input abscat readOnly, only when no employee selected
        const no_employee = (!mod_MAB_dict.employee_pk);
        const no_abscat = (!mod_MAB_dict.order_pk);

        el_MAB_input_abscat.readOnly = no_employee;
// --- enable save button
        const is_disabled = (no_employee || no_abscat);
        el_MAB_btn_save.disabled = is_disabled;
        el_MAB_datefirst.readOnly = is_disabled;
        el_MAB_datelast.readOnly = (is_disabled || mod_MAB_dict.oneday_only);
        el_MAB_oneday.disabled = is_disabled;

        // disable time fields in
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

//========= MAB_SetEmployeeDict  ============= PR2020-08-10
    function MAB_SetEmployeeDict(data_pk){
        console.log( "=== MAB_SetEmployeeDict ===");
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", data_pk)
        mod_MAB_dict.employee_pk = map_dict.id;
        mod_MAB_dict.employee_ppk = map_dict.compp_id;
        mod_MAB_dict.employee_code = map_dict.code;
        mod_MAB_dict.employee_datefirst = map_dict.datefirst;
        mod_MAB_dict.employee_datelast = map_dict.datelast;
        mod_MAB_dict.employee_workminutesperday = map_dict.workminutesperday;
    }  // MAB_SetEmployeeDict

//========= MAB_SetOrderDict  ============= PR2020-08-08
    function MAB_SetOrderDict(data_pk){
        console.log( "=== MAB_SetOrderDict ===", data_pk);
        const abscat_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "order", data_pk)

        mod_MAB_dict.order_pk = (abscat_dict) ? abscat_dict.id : null;
        mod_MAB_dict.order_ppk = (abscat_dict) ? abscat_dict.c_id : null;
        // remove tilde from abscat PR2020-8-14
        mod_MAB_dict.order_code = (abscat_dict) ? (abscat_dict.o_code) ? abscat_dict.o_code.replace(/~/g,"") : null : null;

        console.log( "mod_MAB_dict", mod_MAB_dict);
    }  // MAB_SetOrderDict

// +++++++++++++++++ MODAL SHIFT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//=========  MSE_Open  ================ PR2019-10-28 PR2020-04-06
    function MSE_Open(el_input) {
        console.log(" -----  MSE_Open   ----")
        console.log("el_input", el_input)
        // when tblName = "teammember" function is called by absence table (or shifttable?)
        let tr_selected = get_tablerow_selected(el_input)
        const tblName = get_attr_from_el(tr_selected, "data-table")

        console.log("tblName", tblName)
        mod_dict = {};
        let add_new_mode = true; // becomes false when data_map is found
        let is_absence = false, is_singleshift = false;
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
                    console.log("ooooooooooooooooooooo dict")
            console.log(dict)
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
                    console.log("shifts_list")
            console.log(shifts_list)

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
            console.log ("map_dict: ", map_dict);

// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++
// ++++++++++++++++ clicked on cell with item in calendar_map ++++++++++++++++
            // dont use !map_dict, because map_dict = {}, therefore !!map_dict will give true
            add_new_mode = (isEmpty(map_dict));

            if(!add_new_mode){
                // calendar_map: { id: {pk: "1103-2045-0", ppk: 695, table: "planning"}, pk: "1103-2045-0",
                //                isabsence: false, issingleshift: false, isrestshift: false, ... }

                is_absence = get_dict_value(map_dict, ["isabsence"], false);
                is_singleshift = get_dict_value(map_dict, ["issingleshift"], false);

// --- GET WEEKDAY LIST --------------------------------
                // calendar_map:  weekday_list: { 2: { 2045: {scheme_pk: 1659, team_pk: 2137, shift_pk: 669} } }
                // get selected_weekday_list from map_dict, select weekday buttons
                //(dont mix up with loc.weekdays_abbrev that contains names of weekdays)
                selected_weekday_list = get_dict_value(map_dict, ["weekday_list"]);

// --- GET EMPLOYEE --------------------------------
                // get employee from shift if clicked on shift, otherwise: get selected_employee_pk
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
                console.log(",,,,,,,,,,,,,,,,,,field_dict", field_dict)
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
                // get employee from get selected_employee_pk if clicked on on empty row
                // calendar_map: employee: {pk: 2612, ppk: 3, code: "Martis SA", namelast: "Martis", namefirst: "Sapphire Alexandrine"}
                employee_pk= selected_employee_pk;
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

        console.log ("employee_pk: ", employee_pk);
        if (!!employee_pk) {
            // 'issingleshift' is default in add_new_mode
            const btnshift_option = (is_absence) ?  "isabsence" :  (!!order_pk) ?  "schemeshift" : "issingleshift";
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
                const team_code = (!!employee_code) ? employee_code : get_teamcode_with_sequence_from_map(team_map, scheme_pk, loc.Team)
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
                const shift_code = create_shift_code(loc, offset_start, null, 0, "");

                // shiftoption not necessary in shift_dict (table has no field 'issingleshift')
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
            // values of btnshift_option: issingleshift, isabsence, schemeshift
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
            t_FillOptionsAbscat(loc, el_modshift_absence, abscat_map)
            // put value of abscat (=order_pk) in select abscat element
            el_modshift_absence.value = (!!order_pk) ? order_pk : 0;

    // ---  put datefirst datelast in input boxes
            console.log("scheme_datefirst: ", scheme_datefirst, typeof scheme_datefirst)
            console.log("scheme_datelast: ", scheme_datelast, typeof scheme_datelast)
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

            console.log( "mod_dict: ", mod_dict);

    // ---  show modal
            $("#id_modshift_employee").modal({backdrop: true});

        } else {
// ---  show modal confirm with message 'First select employee'
            const hdr_text = loc.Select_employee + "...";
            const msg01_txt = loc.err_open_calendar_01 + loc.an_employee + loc.err_open_calendar_02;
            ModConfirm_Message(loc, hdr_text, msg01_txt);
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

        if (btnshift_option === "issingleshift" || btnshift_option === "isabsence"){

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
            const new_shift_code = create_shift_code(loc, shift_offset_start, shift_offset_end, shift_time_duration, shift_code);
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
            // 'id': {'pk': 'new4', 'ppk': 'new8', 'table': 'teammember', 'mode': 'create', 'shiftoption': 'issingleshift'},
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
            if (btnshift_option === "issingleshift"){
                schemeitems_list = MSE_MSO_get_schemeitemslist_from_btnweekdays(btnshift_option, mod_dict, scheme_pk, team_pk, shift_pk);
                upload_dict["schemeitems_list"] = schemeitems_list
            } else if (btnshift_option === "isabsence"){
                schemeitems_list = MSE_get_schemeitemslist_absence(btnshift_option, mod_dict, scheme_pk, team_pk, shift_pk);
                upload_dict["schemeitems_list"] = schemeitems_list
            }
            // id_new is increased in get_schemeitemsdict. Update id_new
            id_new = mod_dict.id_new

        }  // } else if (btnshift_option === "isabsence")

// =========== UploadChanges =====================
        UploadChanges(upload_dict, url_teammember_upload);

    }  // MSE_Save

// ##############################################  END MSE_Save  ############################################## PR2019-11-23

//=========  MSE_BtnShiftoption_Clicked  ================ PR2019-12-06
    function MSE_BtnShiftoption_Clicked(btn) {
        //console.log( "===== MSE_BtnShiftoption_Clicked  ========= ");

        // data-mode= 'singleshift', 'schemeshift', absenceshift'
        const data_mode = get_attr_from_el(btn, "data-mode")
        const shift_option = (data_mode === 'absenceshift') ? "isabsence" :
                             (data_mode === 'schemeshift') ? "schemeshift" : "issingleshift";
        const is_absence = (shift_option === "isabsence");

// ---  select btn_singleshift / btn_schemeshift
        // shiftoptions are: issingleshift, schemeshift, isabsence
        mod_dict.shiftoption = shift_option

        // when switched to absence: put full workday in timeduration, remove offsetstart and offsetend
        // when switched to issingleshift: put clicked time as offsetstart, remove timeduration and offsetend
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
        console.log("mod_dict.calendar.rowindex: ", mod_dict.calendar.rowindex)
        console.log("offset_start: ", offset_start)
        mod_dict.shift.offsetstart = offset_start
        mod_dict.shift.offsetend = null
        mod_dict.shift.timeduration = time_duration
        cal_CalcMinMaxOffset(mod_dict.shift, is_absence);
        const cur_shift_code = get_dict_value(mod_dict.shift, ["code"], "")
        mod_dict.shift.code = create_shift_code(loc, offset_start, null, 0, cur_shift_code)

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
        const is_singleshift = (btnshift_option === "issingleshift");
        const is_schemeshift = (btnshift_option === "schemeshift");

        let btn_highlighted = {singleshift: false, schemeshift: false, absenceshift: false};

// ---  select btn_singleshift / btn_schemeshift / btn_absenceshift
        // ---  highlight selected button
        if (is_absence){ btn_highlighted.absenceshift = true } else
        if (is_singleshift){ btn_highlighted.singleshift = true} else
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
        const btnshift_classname = (is_singleshift) ? "singleshift" :
                                   (is_absence)  ? "absenceshift" :
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
        console.log( "=== MSE_AbsenceClicked ===");
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
        console.log( "=== MSE_DateFirstLastClicked ===");
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
        console.log( " === MSE_TimepickerResponse ");
        // put new value from modTimepicker in ModShift PR2019-11-24
        console.log( "tp_dict: ", tp_dict);
        const fldName = tp_dict.field;
        const new_offset = tp_dict.offset;
        console.log( "fldName: ", fldName);
        console.log( "new_offset: ", new_offset);
        console.log( "mod_MAB_dict: ", mod_MAB_dict);

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

        console.log( "mod_MAB_dict.timeduration: ", mod_MAB_dict.timeduration);
// check if a shift with these times already exist in this scheme
        const lookup_shift = MSE_lookup_same_shift(mod_MAB_dict.offsetstart,
                                                    mod_MAB_dict.offsetend,
                                                    mod_MAB_dict.breakduration,
                                                    mod_MAB_dict.timeduration);
        const lookup_shift_pk = lookup_shift.pk
        const current_shift_pk = mod_MAB_dict.pk
        const shift_has_changed = (lookup_shift_pk !== current_shift_pk)
        console.log( "current_shift_pk: ", current_shift_pk);
        console.log( "lookup_shift.pk: ", lookup_shift.pk);
        console.log( "shift_has_changed: ", shift_has_changed);

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
            mod_MAB_dict.shift_code = create_shift_code(loc,
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
        console.log( "=== MSE_BtnWeekdayClicked ");

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
        console.log( " --- MSE_BtnSaveDeleteEnable --- ");
        console.log( "mod_dict", mod_dict);

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

        console.log( "employee_pk", employee_pk);
        console.log( "order_pk", order_pk);

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
    function HandleSelect_Filter() {
        console.log( "===== HandleSelect_Filter  ========= ");

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

        console.log( "skip_filter ", skip_filter);
        if (!skip_filter) {
           // FilterSelectRows(SBR_tblBody_select, filter_select)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        console.log( "===== HandleFilterName  ========= ");
        console.log( "el", el, typeof el);
        console.log( "index", index, typeof index);
        console.log( "el_key", el_key, typeof el_key);

        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        let tblRow = get_tablerow_selected(el);
        const mode = get_attr_from_el_str(el,"data-mode");

// --- reset filter when clicked on 'Escape'
        let skip_filter = false
        if (el_key === 27) {
            filter_dict = {}

            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    el.value = null
                }
            }
            UpdateHeaderText();
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
            const tblName = tblName_from_selectedbtn(selected_btn);
            const has_ppk_filter = (tblName !== "employee");

            t_Filter_TableRows(tblBody_datatable,
                                tblName,
                                filter_dict,
                                filter_show_inactive,
                                has_ppk_filter,
                                selected_employee_pk);

           // FilterSelectRows(SBR_tblBody_select, filter_select);
        } //  if (!skip_filter) {

    }; // HandleFilterName

//=========  HandleSelectFilterButtonInactive  ================ PR2019-07-18
    function HandleSelectFilterButtonInactive(el) {
        console.log(" --- HandleSelectFilterButtonInactive --- ", selected_btn);
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        const tblName = tblName_from_selectedbtn(selected_btn);
        const has_ppk_filter = (tblName !== "employee");

        t_Filter_TableRows(tblBody_datatable, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected_employee_pk);

        //FilterSelectRows(SBR_tblBody_select, filter_select);
    }  // HandleSelectFilterButtonInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        if(is_planning_detail_mod_mode){
            is_planning_detail_mod_mode = false;
        } else {
            if (selected_btn === "planning"){
                selected_employee_pk = null;
                selected_employee_code = null;
                if (is_planning_detail_mode){
                    is_planning_detail_mode = false;
                }
// --- hide sbr button 'back to payroll overview'
               //el_sbr_select_showall.classList.add(cls_hide)
                CreatePlanningHeader();
                FillPlanningRows();
                UpdateHeaderText();
            } else {
                selected_employee_pk = 0;
                selected_employee_code = null;
                selected_teammember_pk = 0;

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
        if (!!tblRow){
            const pk_str = get_attr_from_el(tblRow, "data-pk");
            const pk_int = parseInt(pk_str) // use Number instead of parseInt : Number("576-03") = NaN,  parseInt("576-03") = 576

            //console.log( "pk_str", pk_str, typeof pk_str);
            //console.log( "pk_int", pk_int, typeof pk_int);
            //console.log( "parseInt(pk_str)", parseInt(pk_str), typeof parseInt(pk_str));
// 1. skip new row
    // check if row is_new_row. This is the case when pk is a string ('new_3').
            // Not all search tables have "id" (select employee has no id in tblrow)
            // Number returns NaN if the value cannot be converted to a legal number. If no argument is provided, it returns 0.
            const is_new_row = (!!pk_str) ? (!pk_int) : false;
            //console.log( "is_new_row", is_new_row, typeof is_new_row);
            if(!is_new_row){

// 2. hide other employees when selected_employee_pk has value, but not when employee is replacement
                // only in table absence, shift, planning
                const tblName = get_attr_from_el(tblRow, "data-table");
                //console.log( "tblName", tblName, typeof tblName);
                if (!!selected_employee_pk) {
                    if (["teammember", "planning"].indexOf(tblName) > -1) {
                        const row_employee_pk_str = get_attr_from_el(tblRow, "data-employee_pk");
                        //console.log( "row_employee_pk_str", row_employee_pk_str, typeof row_employee_pk_str);
                        //console.log( "selected_employee_pk", selected_employee_pk, typeof selected_employee_pk);
                        hide_row = (row_employee_pk_str !== selected_employee_pk.toString())
                        //console.log( "-------- hide_row", hide_row);
                    }
                }
// 3. hide inactive rows if filter_show_inactive is false
                if (!hide_row && !filter_show_inactive){
                    const is_inactive = (get_attr_from_el(tblRow, "data-inactive") === "true")
                    hide_row = is_inactive;
                }

// 4. show all rows if filter_name = ""
                //console.log(  "hide_row", hide_row);
                if (!hide_row && !isEmpty(filter_dict)){

// 5. loop through keys of filter_dict
                    // break doesnt work with this one: Object.keys(filter_dict).forEach(function(key) {
                    for (let col_index in filter_dict) {
                        const filter_text = filter_dict[col_index];
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
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict


//##################################################################################
// +++++++++++++++++ ABSENCE TABLE ROWS +++++++++++++++++++++++++++++++++++++++

//=========  CreateAbsenceTblHeader  === PR2020-08-10
    function CreateAbsenceTblHeader() {
        console.log("===  CreateAbsenceTblHeader ==");
        const sel_btn = "absence";
// ---  reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
// +++  insert header row and filter row ++++++++++++++++++++++++++++++++
        const header_row = tblHead_datatable.insertRow (-1);
        const filter_row = tblHead_datatable.insertRow (-1);
//--- insert th's
        const col_count = field_settings[sel_btn].tbl_col_count
        const field_captions =  field_settings[sel_btn].field_caption
        const field_names =  field_settings[sel_btn].field_names
        for (let i = 0; i < col_count; i++) {
            const caption = (field_captions[i]) ? loc[field_captions[i]] : null;
            const fldName = (field_names[i]) ? field_names[i] : null;
// --- add th and div to header_row.
            let th = document.createElement("th");
                const el_div = document.createElement("div");
// --- add innerText to el_div
                el_div.innerText = caption;
// --- add width, text_align and left margin to first column
                const class_width = "tw_" + field_settings[sel_btn].field_width[i] ;
                const class_align = "ta_" + field_settings[sel_btn].field_align[i] ;
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
                    el_input.addEventListener("keyup", function(event){HandleFilterName(el_input, i, event.which)});
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
    };  //  CreateAbsenceTblHeader

//========= FillAbsenceTblRows === PR2020-08-08
    function FillAbsenceTblRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
        console.log( "====== FillAbsenceTblRows  === ");
// --- reset tblBody
        tblBody_datatable.innerText = null
// --- loop through absence_map
        if(absence_map){
            for (const [map_id, map_dict] of absence_map.entries()) {
// TODO: add filter
                let add_Row = map_dict.c_isabsence;
                if (add_Row){
                    const tblRow = CreateAbsenceTblRow(map_id, map_dict.id, map_dict.t_id, map_dict.e_id, -1);
                    UpdateAbsenceTblRow(tblRow, map_id, map_dict);
                    if (map_dict.id === selected_teammember_pk) { tblRow.classList.add(cls_selected)}
                }  // if (add_Row)
            }  // for (const [map_id, map_dict] of absence_map.entries())
        }  // if(!!absence_map)
    }  // FillAbsenceTblRows

//=========  CreateAbsenceTblRow  ================ PR2019-08-29 PR2020-08-10
    function CreateAbsenceTblRow(map_id, pk_str, ppk_str, employee_pk, row_index) {
        //console.log("=========  CreateAbsenceTblRow =========");
        const tblName = "teammember";
        const sel_btn = "absence";
        let tblRow = null;
        if(field_settings[sel_btn]){
// +++  insert tblRow into tblBody
            tblRow = tblBody_datatable.insertRow(row_index)
            tblRow.id = map_id;
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-pk", pk_str);
            if(employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTblRowClicked(tblRow)}, false);
//+++ insert td's into tblRow
            const column_count = field_settings[sel_btn].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create element
                let el = document.createElement("div");
    // --- add field_name in data-field Attribute
                el.setAttribute("data-field", field_settings[sel_btn].field_names[j]);
    // --- add img delete to col_delete
                if (j === column_count - 1) {
                    AppendChildIcon(el, imgsrc_delete)
    //- add hover
                    el.addEventListener("mouseenter", function() {el.children[0].setAttribute("src", imgsrc_deletered)});
                    el.addEventListener("mouseleave", function() {el.children[0].setAttribute("src", imgsrc_delete)});
    // --- add EventListeners
                    el.addEventListener("click", function() {ModConfirmOpen("delete", tblRow)}, false )
                } else if (j){
                    el.addEventListener("click", function() {MAB_Open(el)}, false)
                }
                if(j){add_hover(el)};
    // --- add field_width and text_align
                el.classList.add("tw_" + field_settings[sel_btn].field_width[j],
                                 "ta_" + field_settings[sel_btn].field_align[j]);
    // add right padding to date and number fields
                if([3,4,5,6,7].indexOf(j) > -1) {el.classList.add("pr-2")};
    // --- add element to td.
                td.appendChild(el);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[sel_btn])
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
                        let inner_text = ( (selected_btn === "shifts") ?  map_dict.c_code + " - " : "" ) + map_dict.o_code
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
        console.log("===  CreateTeammemberHeader ==");
        const tblName = "teammember";
// ---  reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
// +++  insert header row and filter row ++++++++++++++++++++++++++++++++
        const header_row = tblHead_datatable.insertRow (-1);
        const filter_row = tblHead_datatable.insertRow (-1);
//--- insert th's
        const col_count = field_settings[selected_btn].tbl_col_count
        const field_captions =  field_settings[selected_btn].field_caption
        const field_names =  field_settings[selected_btn].field_names
        for (let i = 0; i < col_count; i++) {
            const caption = (field_captions[i]) ? loc[field_captions[i]] : null;
            const fldName = (field_names[i]) ? field_names[i] : null;
// --- add th and div to header_row.
            let th = document.createElement("th");
                const el_div = document.createElement("div");
// --- add innerText to el_div
                el_div.innerText = caption;
// --- add width, text_align and left margin to first column
                const class_width = "tw_" + field_settings[selected_btn].field_width[i] ;
                const class_align = "ta_" + field_settings[selected_btn].field_align[i] ;
                el_div.classList.add(class_width, class_align);
// --- add width, text_align and left margin to first column
                th.appendChild(el_div);
            header_row.appendChild(th);
// +++  insert filter row ++++++++++++++++++++++++++++++++
            th = document.createElement("th");
// --- add input element
                const el_tag = (i === 0 ) ? "div" : "input"
                const el_input = document.createElement(el_tag);
                if(i > 0 ) {
// --- add EventListener
                    el_input.addEventListener("keyup", function(event){HandleFilterName(el_input, i, event.which)});
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
    };  //  CreateTeammemberHeader

//========= FillTeammemberRows === PR2020-08-08
    function FillTeammemberRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
        console.log( "====== FillTeammemberRows  === ");

// --- reset table,
        tblBody_datatable.innerText = null

        const data_map = absence_map;
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
                let add_Row = (selected_btn === "absence") ? map_dict.c_isabsence :
                              (selected_btn === "shifts") ? !map_dict.c_isabsence : false;
                if (add_Row){
                    const row_index = -1;
                    let tblRow = CreateTblRow(tblBody_datatable, pk_int, ppk_int, row_employee_pk, row_index)
                    UpdateTeammemberTblRow(tblRow, map_id, map_dict)
// --- highlight selected row
                    if (pk_int === selected_employee_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }  // if (add_Row)
            }  // for (const [map_id, map_dict] of data_map.entries())
        }  // if(!!data_map)

        //console.log("FillPlanningRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // FillTeammemberRows

//========= UpdateTeammemberTblRow  ============= PR2020-08-08
    function UpdateTeammemberTblRow(tblRow, map_id, map_dict){
        //console.log("========= UpdateTeammemberTblRow  =========");
        //console.log("map_dict", map_dict);

        if (tblRow && !isEmpty(map_dict)) {
            let tblBody = tblRow.parentNode;

            // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function
            if (tblRow){
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
                            el_input.innerText = map_dict.e_code
                        } else if (fldName === "replacement"){
                            el_input.innerText = map_dict.rpl_code;
                        } else if (fldName === "order"){
                            const inner_text = ( (selected_btn === "shifts") ?  map_dict.c_code + " - " : "" ) + map_dict.o_code
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
                        } else if (fldName === "timeduration"){
                            let time_duration = (map_dict.sh_td_arr) ? map_dict.sh_td_arr[0] : 0;
                            el_input.innerText = display_duration (time_duration, loc.user_lang);
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
            } // if (!!tblRow)
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
    function calc_planning_agg_dict(short_list) {
        //console.log( "===== calc_planning_agg_dict  ========= ");

        //dict = { fid: "1790_3719_2020-07-08", employee_code: "*Regales RDT", customer_code: "Centrum", order_code: "Mahaai"
        // rosterdate: "2020-07-08", shift_code: "20.00 - 01.00 >", offsetstart: 1200, offsetend: 1500,
        // breakduration: 0, timeduration: 300, isabsence: false, isrestshift: false }

        const period_workingdays = get_dict_value(selected_planning_period, ["period_workingdays"], 0)
        const period_datefirst_iso = get_dict_value(selected_planning_period, ["period_datefirst"])
        const period_datelast_iso = get_dict_value(selected_planning_period, ["period_datelast"])

        let agg_dict = {}
        planning_agg_list = [];
        short_list.forEach(function (dict, index) {
            if (dict.employee_pk ) {
                if ( !(dict.employee_pk in agg_dict) ) {
                    const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", dict.employee_pk)
                    const workhoursperday = get_dict_value(map_dict, ["workhoursperweek", "value"], 0 ) / 5
                    const contracthours_sum =  period_workingdays * workhoursperday;
                   // const workhoursperday = get_dict_value(map_dict, ["workhoursperday", "value"] )
                    agg_dict[dict.employee_pk] = [
                        dict.employee_pk,
                        dict.employee_code,
                        contracthours_sum,
                        0, // workinghours_sum
                        0  // absence_sum
                    ];
                }
                const index = (dict.isabsence) ? 4 : 3;
                agg_dict[dict.employee_pk][index] += dict.timeduration;
            }
        });

        let row_count = 0
        if (employee_map.size){
//--- loop through employee_map
            for (const [map_id, map_dict] of employee_map.entries()) {
                const employee_pk = map_dict.id;
                const employee_code = (map_dict.code) ? map_dict.code :  "---";

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
                // skip if employee is not in service during period, unless is has shifts during that perios
                if ( (fdis_not || ldis_not ) && !(employee_pk in agg_dict) ) {
                    // skip employee that is not in service and not in agg_dict
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
                        plannedhours = agg_row[3];
                        absencehours = agg_row[4];
                    }
                    difference = plannedhours + absencehours - contracthours;

                    row = [employee_pk, employee_code, workingdays, contracthours, plannedhours, absencehours, difference]

                    planning_agg_list.push(row)
                } // if (fdis_not || ldis_not ) && !(employee_pk in agg_dict) {
                row_count += 1;
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    }  // calc_planning_agg_dict

//========= CreateHTML_planning_agg_list  ==================================== PR2020-07-10
    function CreateHTML_planning_agg_list() {
        //console.log("==== CreateHTML_planning_agg_list  ========= ");

        // planning_agg_list = [ 0:employee_pk, 1: employee_code 2: contract_hours, 3:worked_hours,
        //                             4:absence_hours, 5:difference ]
        // table columns: [ 0: employee_code 1: contract_hours, 2: worked_hours,
        //                             3: absence_hours, 4: difference ]
        //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]

        let detail_rows = [];
        for (let i = 0, item; item = planning_agg_list[i]; i++) {
            let td_html = [];
            const employee_pk = item[0];
            const employee_code = (item[1]) ? item[1] : "";
        //console.log(item);

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
            //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
            const row = [true, employee_pk, filter_data, row_data, row_html];
            detail_rows.push(row);
        }  //  for (let i = 0, item; item = planning_detail_list[i]; i++) {
        return detail_rows;
    }  // CreateHTML_planning_agg_list

//========= CreateHTML_planning_detail_list  ==================================== PR2020-07-10
    function CreateHTML_planning_detail_list() {
        console.log("==== CreateHTML_planning_detail_list  ========= ");
        //console.log("planning_short_list", planning_short_list);

        // planning_agg_list = [ 0:employee_pk, 1: employee_code 2: contract_hours, 3:worked_hours,
        //                             4:absence_hours, 5:difference ]
        // table columns: [ 0: employee_code 1: contract_hours, 2: worked_hours,
        //                             3: absence_hours, 4: difference ]
        //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]

        let detail_rows = [];
        for (let i = 0, item; item = planning_short_list[i]; i++) {
            const employee_code = (item.employee_code) ? item.employee_code : "";
            const cust_ord_code = item.customer_code + " - " + item.order_code
            const rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(item.rosterdate), false, true);
            const planned_hours = (!item.isabsence && !item.isrestshift) ? item.timeduration : 0
            const absence_hours = (item.isabsence) ? item.timeduration : 0
            const planned_hours_formatted = format_total_duration (planned_hours, loc.user_lang);
            const absence_hours_formatted = format_total_duration (absence_hours, loc.user_lang);

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
            row_data[3] = item.shift_code;
            filter_data[3] = (item.shift_code) ? item.shift_code.toLowerCase() : null;
            td_html[3] = "<td><div class=\"ta_l\">" + item.shift_code + "</div></td>";
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
            //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html, 5: fid ]
            const row = [true, item.employee_pk, filter_data, row_data, row_html, item.fid];
            detail_rows.push(row);
        }  //  for (let i = 0, item; item = planning_detail_list[i]; i++) {
        return detail_rows;
    }  // CreateHTML_planning_detail_list

//========= FillPlanningRows  ====================================
    function FillPlanningRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
        console.log( "====== FillPlanningRows  === ");
        console.log( "selected_planning_employee_pk", selected_planning_employee_pk);

// --- reset table
        tblBody_datatable.innerText = null

        ResetPlanningTotalrow();

// --- loop through planning_detail_list / planning_agg_list
        //  planning_detail_list = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        const detail_rows = (is_planning_detail_mode) ? planning_detail_list : planning_agg_list;
        detail_rows.forEach(function (item, index) {

        //console.log( "item", item);
            // filter selected employee when is_planning_detail_mode
            let show_row =(!is_planning_detail_mode || item[1] === selected_planning_employee_pk)
       // console.log( "item[1]", item[1]);
        //console.log( "show_row", show_row);
            let filter_row = null, row_data = null, tblRow = null;
            if(show_row){
                filter_row = item[2];
                row_data = item[3];
                const col_count = filter_row.length;
                show_row = t_ShowPayrollRow(filter_row, filter_dict, col_count);
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
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            for (let i = 2, len = row_data.length; i < len; i++) {
                if (is_planning_detail_mode && i === 2){
                    if(!planning_total_row[i]){planning_total_row[i] = selected_employee_code};
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
                            display = format_pricerate (loc.user_lang, 100 * planning_total_row[i], false, false, true); // is_percentage = false, show_zero = false, hide_decimals = true
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
        console.log("===  CreatePlanningHeader ==");
        const tblName = (is_planning_detail_mode) ? "payroll_detail" : "payroll_agg";
// ---  reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
// +++  insert header row and filter row ++++++++++++++++++++++++++++++++
        const header_row = tblHead_datatable.insertRow (-1);
        const filter_row = tblHead_datatable.insertRow (-1);
        const total_row = tblHead_datatable.insertRow (-1);
//--- insert th's
        const col_count = field_settings[tblName].tbl_col_count
        const field_captions =  field_settings[tblName].field_caption
        const field_names =  field_settings[tblName].field_names
        for (let i = 0; i < col_count; i++) {
            const caption = (field_captions[i]) ? loc[field_captions[i]] : null;
            const fldName = (field_names[i]) ? field_names[i] : null;
// --- add th and div to header_row.
            let th = document.createElement("th");
                const el_div = document.createElement("div");
// --- add EventListener to 'back' cell
                if (i === 0 && is_planning_detail_mode) {
                    el_div.innerText = "<";
                    el_div.addEventListener("click", function(event){ResetFilterRows()});
                    el_div.title = loc.Back_to_previous_level
                    add_hover(el_div)
                } else if(caption) {
// --- add innerText to el_div
                    el_div.innerText = caption;
                }
// --- add width, text_align and left margin to first column
                const class_width = "tw_" + field_settings[tblName].field_width[i] ;
                const class_align = "ta_" + field_settings[tblName].field_align[i] ;
                el_div.classList.add(class_width, class_align);
// --- add width, text_align and left margin to first column
                th.appendChild(el_div);
            header_row.appendChild(th);
// +++  insert filter row ++++++++++++++++++++++++++++++++
            th = document.createElement("th");
// --- add input element
                const el_tag = (i === 0 ) ? "div" : "input"
                const el_input = document.createElement(el_tag);
                if(i > 0 ) {
// --- add EventListener
                    el_input.addEventListener("keyup", function(event){HandlePayrollFilter(el_input, i, event.which)});
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
// +++  insert total row ++++++++++++++++++++++++++++++++
            total_row.id = "id_payroll_totalrow";
            th = document.createElement("th");
// --- add input element
                const el_total = document.createElement("div");
                if  (i === 1 ) {el_total.innerText = loc.Total  }
                el_total.classList.add(class_width, class_align) //, "tsa_color_darkgrey", "tsa_transparent");
// --- append th
            th.appendChild(el_total);
            total_row.appendChild(th);
        };
    };  //  CreatePlanningHeader

//=========  HandleAggRowClicked  ================ PR2019-07-10
    function HandleAggRowClicked(tr_clicked) {
        console.log("=== HandleAggRowClicked");
        if(is_planning_detail_mode){

            const emplhour_pk = get_attr_from_el_int(tr_clicked, "data-pk");
            let upload_dict = {
                id: {table: "emplhour"},
                emplhour_pk: emplhour_pk
            };
            //UploadChanges(upload_dict, url_payroll_upload);
            MEP_ResetInputElements();
            // show loader
            document.getElementById("id_MEP_loader").classList.remove(cls_hide)

            is_planning_detail_mod_mode = true;
            // ---  show modal
            //$("#id_mod_emplhour_payroll").modal({backdrop: true});

        } else {

            selected_planning_employee_pk = (Number(tr_clicked.id)) ? Number(tr_clicked.id) : null;
            if(selected_planning_employee_pk){
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_planning_employee_pk);
                selected_planning_employee_code = get_dict_value (map_dict, ["code"], "");
                // put also in selected_planning_period, to be used in print planning (and export to excel?)
                selected_planning_period.selected_employee_pk = selected_planning_employee_pk

                is_planning_detail_mode = true;
                UpdateHeaderText();
        // --- fill payroll_mapped_columns and create tblHead with filter ansd total row
               CreatePlanningHeader();
               FillPlanningRows();
        // --- show sbr button 'back to payroll overview'
               //el_sbr_select_showall.classList.remove(cls_hide)
            } else {
                selected_planning_period.planning_employee_pk = null;
                selected_planning_period.planning_employee_code = null;
            }
        }
    }  // HandleAggRowClicked

//========= HandlePayrollFilter  ====================================
    function HandlePayrollFilter(el, col_index, el_key) {
        console.log( "===== HandlePayrollFilter  ========= ");
        console.log( "col_index ", col_index, "el_key ", el_key);

        const skip_filter = t_SetExtendedFilterDict(el, col_index, el_key, filter_dict);
        if ( !skip_filter) {FillPlanningRows()};
    }  // HandlePayrollFilter

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++ PR2020-07-13
    function ExportToExcel(){
        console.log(" === ExportToExcel ===")
// ---  create file Name and worksheet Name
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            let filename = (selected_btn === "planning") ? loc.Planning : loc.Planning;
            if (is_planning_detail_mode) { filename += " " + selected_planning_employee_code }
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
        console.log("=== FillExcelRows  =====")

        const detail_rows = (is_planning_detail_mode) ? planning_detail_list : planning_agg_list;
        let ws = {}
// title row
        let title_value = (selected_btn === "planning") ? loc.Planning : loc.Planning;
        if (is_planning_detail_mode) { title_value += " " + loc.of + " "  + selected_planning_employee_code }
        ws["A1"] = {v: title_value, t: "s"};
// company row
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws["A2"] = {v: company, t: "s"};
// period row
        //const period_value = display_planning_period (selected_period, loc);
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
            ws["B6"] = {v: selected_planning_employee_code , t: "s"};
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
