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

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

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
        let selected_teammember_pk = 0;

        let selected_btn = "";

        let company_dict = {};
        let employee_map = new Map();

        let order_map = new Map();
        let abscat_map = new Map();

        let scheme_map = new Map();
        let shift_map = new Map();
        let team_map = new Map();
        let teammember_map = new Map();
        let schemeitem_map = new Map();

        let calendar_map = new Map();
        let planning_map = new Map();

// const for report
        let planning_display_duration_total = ""; // stores total hours, calculated when creating planning_map
        let label_list = [], pos_x_list = [], colhdr_list = [];

// locale_dict with translated text
        let loc = {};

        let mod_dict = {};
        //let spanned_columns = [];
        let is_quicksave = false

        let selected_planning_period = {};
        let selected_calendar_period = {};

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const field_settings = {
            employee: { tbl_col_count: 9,
                        //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                        field_caption: ["Employee", "ID_number",  "Payroll_code_abbrev", "First_date_in_service", "Last_date_in_service", "Hours_per_week", "Days_per_week", "Leavedays"],
                        field_names: ["code", "identifier",  "payrollcode", "datefirst", "datelast", "workhours", "workdays", "leavedays",  "delete"],
                        field_tags: ["input", "input", "input", "input", "input", "input", "input", "input", "a"],
                        field_width:  ["180", "120", "120","090", "090",  "090","090", "090", "032"],
                        field_align: ["left", "left", "left","right", "right",  "right", "right", "right", "center"]},
            absence: { tbl_col_count: 6,
                        field_caption: ["Employee", "Absence_category", "First_date", "Last_date", "Hours_per_day"],
                        field_names: ["employee", "order", "datefirst", "datelast", "timeduration", "delete"],
                        field_tags:  ["p", "p", "p", "p",  "p", "p"],
                        field_width:  ["180", "220", "120", "120","120", "032"],
                        field_align: ["left", "left", "right", "right", "right", "left"]},
            shifts: { tbl_col_count: 7,
                        field_caption: ["Employee", "Order", "Team", "First_date", "Last_date", "Replacement_employee"],
                        field_names: ["employee", "order", "team", "datefirst", "datelast", "replacement", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "a"],
                        field_width: ["180", "220", "120", "120", "120", "180", "032"],
                        field_align: ["left", "left", "left", "left", "left", "left", "left"]},
            //calendar: { tbl_col_count: 7}, don't use calendar in field_settings, gives error in CreateTblHeader
            planning: { tbl_col_count: 7,
                        field_caption: ["Employee", "Customer", "Order", "Date", "Shift", "Start_Endtime", "Working_hours"],
                        field_names:  ["employee", "customer", "order", "rosterdate", "shift", "offsetstart", "timeduration"],
                        field_tags: ["input", "input", "input", "input", "input", "input", "input"],
                        field_width: ["150", "150", "150", "120", "120", "150", "090"],
                        field_align: ["left", "left", "left", "left", "left", "right", "right"]}
            }

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");
        const tblFoot_datatable = document.getElementById("id_tblFoot_datatable");

        let SBR_tblBody_select = document.getElementById("id_SBR_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === EVENT HANDLERS ===

// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const data_mode = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_mode)}, false )
        }

// ---  employee form
        let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".form-control")
        for (let i = 0, el, len = form_elements.length; i < len; i++) {
            el = form_elements[i]
            if(el){el.addEventListener("change", function() {MFE_validate_and_disable(el)}, false)};
        }
        const el_MFE_btn_delete = document.getElementById("id_MFE_btn_delete")
            el_MFE_btn_delete.addEventListener("click", function() {MFE_save("delete")}, false );
        const el_MFE_btn_save = document.getElementById("id_MFE_btn_save")
            el_MFE_btn_save.addEventListener("click", function() {MFE_save("save")}, false );

// ---  create EventListener for buttons in calendar
        btns = document.getElementById("id_btns_calendar").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnCalendar(mode)}, false )
        }

// === event handlers for MODAL ===

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_ModSelEmp_select_employee_body");
        let el_mod_employee_input_employee = document.getElementById("id_ModSelEmp_input_employee");
            el_mod_employee_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {ModEmployeeFilterEmployee(el_mod_employee_input_employee, event.key)}, 50)});
        document.getElementById("id_ModSelEmp_btn_save").addEventListener("click", function() {ModEmployeeSave("save")}, false )
        document.getElementById("id_ModSelEmp_btn_remove_employee").addEventListener("click", function() {ModEmployeeSave("remove")}, false )

// ---  MODAL ABSENCE ------------------------------------
        let el_MAB_input_employee = document.getElementById("id_MAB_input_employee")
            el_MAB_input_employee.addEventListener("focus", function() {MAB_GotFocus("employee", el_MAB_input_employee)}, false )
            el_MAB_input_employee.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("employee", el_MAB_input_employee)}, 50)});
        let el_MAB_input_abscat = document.getElementById("id_MAB_input_abscat")
            el_MAB_input_abscat.addEventListener("focus", function() {MAB_GotFocus("order", el_MAB_input_abscat)}, false )
            el_MAB_input_abscat.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("order", el_MAB_input_abscat)}, 50)});
        let el_MAB_offsetstart = document.getElementById("id_MAB_input_offsetstart")
            el_MAB_offsetstart.addEventListener("click", function() {ModShiftTimepickerOpen(el_MAB_offsetstart)}, false );
        let el_MAB_offsetend = document.getElementById("id_MAB_input_offsetend")
            el_MAB_offsetend.addEventListener("click", function() {ModShiftTimepickerOpen(el_MAB_offsetend)}, false );
        let el_MAB_breakduration = document.getElementById("id_MAB_input_breakduration")
            el_MAB_breakduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_MAB_breakduration)}, false );
        let el_MAB_timeduration = document.getElementById("id_MAB_input_timeduration")
            el_MAB_timeduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_MAB_timeduration)}, false );
        let el_MAB_datefirst = document.getElementById("id_MAB_input_datefirst")
            el_MAB_datefirst.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_datefirst)}, false );
        let el_MAB_datelast = document.getElementById("id_MAB_input_datelast")
            el_MAB_datelast.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_datelast)}, false );
        let el_MAB_oneday = document.getElementById("id_MAB_oneday")
            el_MAB_oneday.addEventListener("change", function() {MAB_DateFirstLastChanged(el_MAB_oneday)}, false );
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

// ---  create EventListener for period header in planning
        let el_hdr_datatable = document.getElementById("id_hdr_datatable")
            el_hdr_datatable.addEventListener("click", function() {ModPeriodOpen()}, false )

// ---  MOD PERIOD ------------------------------------;
// ---  select customer
        let el_modperiod_selectcustomer = document.getElementById("id_modperiod_selectcustomer")
            el_modperiod_selectcustomer.addEventListener("change", function() {
                        ModPeriodSelectCustomer(el_modperiod_selectcustomer.value)}, false )
// ---  select order
        let el_modperiod_selectorder = document.getElementById("id_modperiod_selectorder")
            el_modperiod_selectorder.addEventListener("change", function() {
                        ModPeriodSelectOrder(el_modperiod_selectorder.value)}, false )
// buttons in  modal period
        document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
        document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

// ---  MOD CONFIRM ------------------------------------
// ---  save button in ModConfirm
        document.getElementById("id_confirm_btn_save").addEventListener("click", function() {ModConfirmSave()});

// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )

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
    // close el_popup_date_container
                // event.currentTarget is the element to which the event handler has been attached (which is #document)
            // event.target identifies the element on which the event occurred.
            let close_popup = true
            //console.log( "document clicked")
            // don't close popup_dhm when clicked on row cell with class input_popup_date
            if (event.target.classList.contains("input_popup_date")) {
                //console.log( "event.target.classList.contains input_popup_date", event.target)
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_date_container.contains(event.target)){
                //console.log( "el_popup_date_container contains event.target")
                if(!event.target.classList.contains("popup_close")){
                    // console.log( "event.target does not contain popup_close")
                    close_popup = false
                }
            }
            //console.log( "close_popup", close_popup)
            if (close_popup) {
                el_popup_date_container.classList.add(cls_hide)
            };
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

        const now_arr = get_now_arr_JS();
        let datalist_request = {
            setting: {page_employee: {mode: "get"}},
            quicksave: {mode: "get"},
            planning_period: {get: true, now: now_arr},
            calendar_period:  {get: true, now: now_arr},
            locale: {page: "employee"},
            company: {value: true},
            employee_list: {inactive: false},
            order_list: {isabsence: false, istemplate: false, inactive: false},
            abscat: {inactive: false},
            teammember_list: {employee_nonull: false, is_template: false},
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
                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
// --- create Submenu
                    CreateSubmenu()

// --- create table Headers
                    CreateTblModSelectPeriod();

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
                if ("planning_period" in response){
                    selected_planning_period = get_dict_value(response, ["planning_period"]);
                    el_hdr_datatable.innerText = display_planning_period (selected_planning_period, loc);
                }
                if ("calendar_period" in response){
                    selected_calendar_period = get_dict_value(response, ["calendar_period"]);
                    selected_calendar_period["calendar_type"] = "employee_calendar";
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
                    DatalistDownload(datalist_request, true );  // true = dont_show_loader
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
        if ("employee_list" in response) {
            get_datamap(response["employee_list"], employee_map)

            const tblName = "employee";
            const include_parent_code = null;
            let tblHead = document.getElementById("id_SBR_thead_select");
            const filter_ppk_int = null, filter_show_inactive = true, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false, addall_to_list_txt = null;

            const imgsrc_default = imgsrc_inactive_grey;
            const imgsrc_default_header = imgsrc_inactive_lightgrey;
            const imgsrc_default_black = imgsrc_inactive_black;
            const imgsrc_hover = imgsrc_inactive_black;
            const header_txt = null;

            t_Fill_SelectTable(SBR_tblBody_select, tblHead, employee_map, tblName, null, include_parent_code,
                HandleSelect_Filter, HandleSelectFilterButtonInactive, HandleSelect_Row, HandleSelectRowButton, false,
                filter_ppk_int, filter_show_inactive, filter_include_inactive,
                filter_include_absence, filter_istemplate, addall_to_list_txt,
                cls_bc_lightlightgrey, cls_bc_yellow,
                imgsrc_default, imgsrc_default_header, imgsrc_default_black, imgsrc_hover,
                header_txt, loc.Click_show_inactive_employees)

            FilterSelectRows(SBR_tblBody_select, filter_select);
            fill_datatable = true;
        }

        if ("abscat_list" in response) {
            get_datamap(response["abscat_list"], abscat_map)
        }
        if ("teammember_list" in response) {
            get_datamap(response["teammember_list"], teammember_map)
            fill_datatable = true;
        }
        if ("order_list" in response) {
            get_datamap(response["order_list"], order_map)
        }
        if ("scheme_list" in response) {
            get_datamap(response["scheme_list"], scheme_map)
        }
        if ("shift_list" in response) {
            get_datamap(response["shift_list"], shift_map)
        }
        if ("team_list" in response) {
            get_datamap(response["team_list"], team_map)
        }
        if ("teammember_list" in response) {
            get_datamap(response["teammember_list"], teammember_map)
        }
        if ("schemeitem_list" in response) {
            get_datamap(response["schemeitem_list"], schemeitem_map)
        }
        if ("employee_planning_list" in response) {
            console.log("...................employee_planning_list: ", response)
            console.log(response["employee_planning_list"])
            const duration_sum = get_datamap(response["employee_planning_list"], planning_map, null, true) // calc_duration_sum = true
            planning_display_duration_total = display_duration (duration_sum, user_lang)

            console.log("planning_map", planning_map)
            fill_datatable = true;

            //PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict,
            //    label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang);

        }
        if(fill_datatable) {
            HandleBtnSelect(selected_btn);
        }
        if ("employee_calendar_list" in response) {
            get_datamap(response["employee_calendar_list"], calendar_map)
            //console.log("calendar_map", calendar_map )
            //console.log("calendar_map", calendar_map )

            UpdateHeaderText();
            CreateCalendar("employee", selected_calendar_period, calendar_map, MSE_Open, loc, timeformat, user_lang);
        };

    }  // refresh_maps
//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(data_btn) {
        //console.log( "==== HandleBtnSelect ========= ");

        selected_btn = data_btn
        if(!selected_btn){selected_btn = "employee"}
        //console.log( "selected_btn", selected_btn );

// ---  upload new selected_btn
        const upload_dict = {"page_employee": {"btn": selected_btn}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const data_button = get_attr_from_el_str(btn, "data-btn");
            add_or_remove_class(btn, cls_btn_selected, data_button === selected_btn);
        }

// ---  show only the elements that are used in this tab
        let list = document.getElementsByClassName("tab_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains("tab_" + selected_btn)
            show_hide_element(el, is_show)
        }

// ---  show / hide selected table
        //const mode_list = ["employee", "absence", "shifts", "planning", "calendar"];
        //for(let i = 0, tbl_mode, len = mode_list.length; i < len; i++){
        //    tbl_mode = mode_list[i];
        //    let div_tbl = document.getElementById("id_div_tbl_" + tbl_mode);
        //    if(!!div_tbl){
        //        add_or_remove_class(div_tbl, cls_hide, tbl_mode !== selected_btn);
        //    }  // if(!!div_tbl){
        //}


// ---  fill datatable
        FillTableRows( "HandleBtnSelect")

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

//=========  HandleSelect_Row ================ PR2019-08-28
    function HandleSelect_Row(sel_tr_clicked) {
        console.log( "===== HandleSelect_Row  ========= ");
        //console.log( sel_tr_clicked);

        if(!!sel_tr_clicked) {
// ---  get map_dict
            const tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
            const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
            // function 'get_mapdict_from_.....' returns empty dict if tblName or pk_str are not defined or key not exists.
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, tblName, pk_str);
            const employee_pk = get_dict_value(map_dict, ["id", "pk"], 0);
            const employee_ppk = get_dict_value(map_dict, ["id", "ppk"]);
            const employee_code = get_dict_value(map_dict, ["code", "value"]);

// ---  update selected_employee_pk
            selected_employee_pk = employee_pk;
            selected_teammember_pk = 0;

 // ---  highlight clicked row in select table
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// --- save selected_employee_pk in Usersettings
        // selected_employee_pk is not stored in Usersettings

// ---  update header text
            UpdateHeaderText();

            if(selected_btn === "calendar"){
                let datalist_request = {employee_calendar: {
                                            employee_pk: selected_employee_pk},
                                            calendar_period: selected_calendar_period
                                        };
                DatalistDownload(datalist_request);

            } else {
    // ---  highlight row in tblBody
                let tblRow = t_HighlightSelectedTblRowByPk(tblBody_datatable, selected_employee_pk)
// ---  scrollIntoView, only in tblBody employee
                if (selected_btn === "employee" && !!tblRow){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                };
                FilterTableRows(tblBody_datatable);
// --- put name of employee in addneww row NOT in employee table
                if(selected_btn !== "employee"){
                    const lastRow = tblFoot_datatable.rows[0];
                    if(!!lastRow){
                        lastRow.setAttribute("data-employee_pk", employee_pk)
                        if(lastRow.cells[0]){
                            const el_input = lastRow.cells[0].children[0];
                            if(!!el_input){ el_input.innerText = employee_code}
                        }
                    }
                }  // if(!!row_count)
            }  // if(selected_btn === "calendar"){
        }  // if(!!sel_tr_clicked)

// ---  enable add button, also when no employee selected
        document.getElementById("id_form_btn_add").disabled = false;
    }  // HandleSelect_Row

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

        const tblName = get_attr_from_el_str(tr_clicked, "data-table")
// ---  deselect all highlighted rows - also tblFoot , highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        DeselectHighlightedTblbody(tblFoot_datatable, cls_selected)
        tr_clicked.classList.add(cls_selected)
// ---  update selected_employee_pk
        // only select employee from select table
        const data_key = (["teammember", "planning"].indexOf( tblName ) > -1) ? "data-employee_pk" : "data-pk";
        const employee_pk_str = get_attr_from_el_str(tr_clicked, data_key);
        if(!!employee_pk_str){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk_str)
            selected_employee_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0))
            //console.log( "selected_employee_pk: ", selected_employee_pk, typeof selected_employee_pk);
// ---  update selected_teammember_pk
            if(["teammember", "planning"].indexOf( tblName ) > -1){
                const teammember_pk_str = get_attr_from_el_str(tr_clicked, "data-pk");
                if(!!teammember_pk_str){
                    const map_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk_str)
                    selected_teammember_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0))
                };
            };
            //console.log( "selected_teammember_pk: ", selected_teammember_pk, typeof selected_teammember_pk);
// ---  update header text
            UpdateHeaderText();
// ---  highlight row in select table
            DeselectHighlightedTblbody(SBR_tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
            const row_id = id_sel_prefix + tblName + selected_employee_pk.toString();
            let sel_tablerow = document.getElementById(row_id);
            if(!!sel_tablerow){
                // yelllow doesn't show if you don't first remove background color
                sel_tablerow.classList.remove(cls_bc_lightlightgrey)
                sel_tablerow.classList.add(cls_bc_yellow)
            }
        }  // if(tblName === "employee"){
    }  // HandleTableRowClicked

//========= HandleButtonEmployeeAdd  ============= PR2019-10-06
    function HandleButtonEmployeeAdd() {

        // first switch button to form
        HandleBtnSelect("form")
        HandleEmployeeAdd()
    }

//========= HandleEmployeeAdd  ============= PR2019-10-06
    function HandleEmployeeAdd() {
        console.log( " ==== HandleEmployeeAdd ====");
        selected_employee_pk = 0
        selected_teammember_pk = 0;

        UpdateHeaderText();
        UpdateForm("HandleEmployeeAdd")
        let el = document.getElementById("id_form_code")
        el.readOnly = false;
        el.focus();
    } // HandleEmployeeAdd

    function HandleBtnInactiveClicked(el_input) {
        HandleBtnInactiveDeleteClicked("inactive", el_input);
    }
    function HandleBtnDeleteClicked(el_input) {
        HandleBtnInactiveDeleteClicked("delete", el_input);
    }

//========= HandleBtnInactiveDeleteClicked  ============= PR2019-09-23
    function HandleBtnInactiveDeleteClicked(mode, el_input) {
        console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el_str(tblRow, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
            let map_dict;
            if (tblName === "employee"){ map_dict = employee_map.get(map_id)} else
            if (tblName === "order") { map_dict = order_map.get(map_id)} else
            if (tblName === "roster"){ map_dict = roster_map.get(map_id)};

        console.log("tblName", tblName);
        console.log("pk_str", pk_str);
        console.log("map_id", map_id);
        console.log("map_dict", map_dict);
        console.log("employee_map", employee_map);
    // ---  create upload_dict with id_dict
            let upload_dict = {"id": map_dict["id"]};
            if (mode === "delete"){
                mod_dict = {"id": map_dict["id"]};
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
                    console.log("format_inactive_element")
        console.log(">>>>>>>> imgsrc_inactive_black:", imgsrc_inactive_black)
        console.log(">>>>>>>> imgsrc_inactive_lightgrey:", imgsrc_inactive_lightgrey)
                format_inactive_element (el_input, mod_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
        // ---  show modal, only when made inactive
                if(!!new_inactive){
                    mod_dict = {"id": map_dict["id"], "inactive": {"value": new_inactive, "update": true}};
                    ModConfirmOpen("inactive", tblRow);
                    return false;
                }
            }

            UploadChanges(upload_dict, url_employee_upload)

        }  // if(!!tblRow)
    }  // HandleBtnInactiveDeleteClicked

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
                calendar_datefirst_JS = get_monday_JS_from_DateJS_vanilla(calendar_datefirst_JS)
                // if nextweek: goto net monday
                if (mode === "nextweek"){ change_dayJS_with_daysadd_vanilla(calendar_datefirst_JS, 7)}
            }
        } else if (mode === "thisweek") {
            calendar_datefirst_JS = get_thisweek_monday_sunday_dateobj()[0];
        }

        let calendar_datelast_JS = addDaysJS(calendar_datefirst_JS, 6)
        const calendar_datefirst_iso = get_dateISO_from_dateJS_vanilla(calendar_datefirst_JS);
        const calendar_datelast_iso = get_dateISO_from_dateJS_vanilla(calendar_datelast_JS);

// ---  upload settings and download calendar
        const now_arr = get_now_arr_JS();
        selected_calendar_period = {now: now_arr, add_empty_shifts: false, skip_absence_and_restshifts: false}
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
//=========  CreateSubmenu  === PR2019-07-30
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, loc.Add_employee, function() {MFE_Open()}, ["mx-2"], "id_submenu_employee_add")

        AddSubmenuButton(el_div, loc.Delete_employee, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_employee_delete")
        AddSubmenuButton(el_div, loc.Upload_employees, null, ["mx-2"], "id_submenu_employee_import", url_employee_import);

        AddSubmenuButton(el_div, loc.Print_planning,
            function() { PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict, loc)},
            ["mx-2"],
            "id_submenu_employee_planning_preview"
        )


        AddSubmenuButton(el_div, loc.Export_to_Excel,
            function() { ExportToExcel()},
            ["mx-2"],
            "id_submenu_employee_export_excel"
        )

        el_submenu.classList.remove(cls_hide);

        show_menubtn_planning(selected_btn);

    };//function CreateSubmenu

//========= show_menubtn_planning  ==================================== PR20202-04-06
    function show_menubtn_planning(selected_btn) {
        //console.log( "===== show_menubtn_planning  ========= ");
        const hide_btn_print_planning = (selected_btn !== "planning")
        let el_submenu_employee_planning_preview =  document.getElementById("id_submenu_employee_planning_preview");
        if (!!el_submenu_employee_planning_preview){
            add_or_remove_class (el_submenu_employee_planning_preview, cls_hide, hide_btn_print_planning);
        }
        let el_submenu_employee_export_excel =  document.getElementById("id_submenu_employee_export_excel");
        if (!!el_submenu_employee_export_excel){
            add_or_remove_class (el_submenu_employee_export_excel, cls_hide, hide_btn_print_planning);
        }
    };//function show_menubtn_planning

//========= FillTableRows  ====================================
    function FillTableRows(called_by) {
        console.log( "===== FillTableRows  === ", called_by);
        //  tables: employee, absence, shifts, planning (calendar)
        // data_maps are: employee, teammember, planning
        // selected_btn are: employee, absence, shifts, calendar, planning, form

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null
// --- get tblName
        const tblName = (selected_btn === "employee") ? "employee" :
                         (["absence", "shifts"].indexOf( selected_btn ) > -1) ? "teammember" :
                         (selected_btn === "planning") ? "planning" :
                         null;
// --- create tblHead
        CreateTblHeader(selected_btn);
// --- get data_map
        const data_map = (selected_btn === "employee") ? employee_map :
                         (["absence", "shifts"].indexOf( selected_btn ) > -1) ? teammember_map :
                         (selected_btn === "planning") ? planning_map : null;
// get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
        const data_key = (selected_btn === "employee") ? "id" :
                         (["teammember", "planning"].indexOf( selected_btn ) > -1) ? "employee" : null;
        if(!!data_map){
// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const id_dict = get_dict_value(item_dict, ["id"]);
                    const row_tblName = get_dict_value(id_dict, ["table"]);
                    const pk_int = get_dict_value(id_dict, ["pk"], 0);
                    const ppk_int = get_dict_value(id_dict, ["ppk"], 0);
                    const is_absence =  get_dict_value(id_dict, ["isabsence"], false);
                const row_employee_pk = get_dict_value(item_dict, [data_key, "pk"])
// in mode absence and shift: show only rows with parent = selected_employee_pk
                let add_Row = false;
                if (["absence", "shifts"].indexOf( selected_btn ) > -1){
                    //if (!!selected_employee_pk && row_employee_pk === selected_employee_pk){
                        // show only absence rows in 'absence, skip them in 'shift'
                        add_Row = (selected_btn === "absence") ?  is_absence : !is_absence;
                    //}
                } else {
                    add_Row = true;
                }
                if (add_Row){
                    const row_index = -1;
                    let tblRow = CreateTblRow(tblBody_datatable, selected_btn, pk_int, ppk_int, row_employee_pk, row_index, "FillTableRows")
                    UpdateTblRow(tblRow, item_dict)
// --- highlight selected row
                    if (pk_int === selected_employee_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }  // if (add_Row)
            }  // for (const [map_id, item_dict] of data_map.entries())

// --- create tblFoot in employee list and absence
            if (["employee", "absence"].indexOf(selected_btn) > -1) {
                CreateTblFoot(tblName, selected_btn)
            };
        }  // if(!!data_map)
        //console.log("FillTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        FilterTableRows();
    }  // FillTableRows

//=========  CreateTblHeader  === PR2019-10-25 PR2020-05-14
    function CreateTblHeader(tblName) {
        console.log("===  CreateTblHeader == tblName: ", tblName);

        ///tblName = "employee", "absence", "shifts", "planning", "calendar", "form"
        tblHead_datatable.innerText = null
        // skip when tblName = 'form' or 'calendar'
        if(field_settings[tblName]){
            const column_count = field_settings[tblName].tbl_col_count;
            if(column_count){
    //--- insert tblRow
                let tblRow = tblHead_datatable.insertRow (-1);
        //--- insert th's to tblHead_datatable
                for (let j = 0; j < column_count; j++) {
        // --- add th to tblRow.
                    let th = document.createElement("th");
        // --- add vertical line between columns in planning
                    // if (tblName === "planning"){th.classList.add("border_right")};
        // --- add div to th, margin not working with th
                    let el_div = document.createElement("div");
        // --- add innerText to el_div
                    const data_text = field_settings[tblName].field_caption[j];
                    if(data_text) {el_div.innerText = loc[data_text]};
                    //el_div.setAttribute("overflow-wrap", "break-word");
        // --- add left margin to first column
                    if (j === 0 ){el_div.classList.add("ml-2")};
        // --- add width, text_align
                    el_div.classList.add("td_width_" + field_settings[tblName].field_width[j],
                                         "text_align_" + field_settings[tblName].field_align[j]);
                    th.appendChild(el_div)
                    tblRow.appendChild(th);
                }  // for (let j = 0; j < column_count; j++)
                CreateTblHeaderFilter(tblName, column_count);
            }   // if(field_settings[tblName])
        }  // iif(column_count)
    };  //  CreateTblHeader

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
                el_div.classList.add("td_width_" + field_settings[mode].field_width[j],
                                     "text_align_" + field_settings[mode].field_align[j])
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
                const field_tag = field_settings[tblName].field_tags[j];
                const filter_tag = (tblName === "planning") ? "div" : (field_tag === "select") ? "input" : field_tag
                //let el = document.createElement(filter_tag);
                let el = document.createElement(filter_tag);
// --- add data-field Attribute.
               el.setAttribute("data-field", field_settings[tblName].field_names[j]);
               el.setAttribute("data-mode", tblName);
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
            el.classList.add("td_width_" + field_settings[tblName].field_width[j],
                             "text_align_" + field_settings[tblName].field_align[j]);
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblHeaderFilter

//=========  CreateTblRow  ================ PR2019-08-29
    function CreateTblRow(tblBody, sel_btn, pk_str, ppk_str, employee_pk, row_index, called_by) {
        //console.log("=========  CreateTblRow =========", sel_btn);
        //console.log("called_by", called_by);

        const tblName = (sel_btn === "employee") ? "employee" :
                        (["absence", "shifts"].indexOf( sel_btn ) > -1) ? "teammember":
                        (sel_btn === "planning") ? "planning" : null;

        // btn calendar and form have no table
        let tblRow = null
        if(field_settings[sel_btn]){
    // --- insert tblRow into tblBody
            //console.log("row_index", row_index, typeof row_index);
            if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09\\
            const row_count = tblBody.rows.length;

            if(row_index >= row_count ) {row_index = -1}
            tblRow = tblBody.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.

            //console.log("tblRow", tblRow);
            const map_id = get_map_id(tblName, pk_str)
            tblRow.setAttribute("id", map_id);
            tblRow.setAttribute("data-pk", pk_str);
            tblRow.setAttribute("data-ppk", ppk_str);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-mode", sel_btn);

            if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

    // --- check if row is addnew row - when pk is NaN
            const is_new_row = !parseInt(pk_str); // don't use Number, "545-03" wil give NaN

    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

    //+++ insert td's into tblRow
            const column_count = field_settings[sel_btn].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);

    // --- create element with tag from field_tags
                const field_tag = field_settings[sel_btn].field_tags[j];
                let el = document.createElement(field_tag);

    // --- add data-field Attribute
                const field_name = field_settings[sel_btn].field_names[j];
                el.setAttribute("data-field", field_name);

    // --- add img delete to col_delete, not when is_new_row
                if ( (j === column_count - 1) && !is_new_row && (["employee", "absence"].indexOf(sel_btn) > -1) ) {
                    CreateBtnDeleteInactive("delete", tblRow, el);
    // --- add placeholder
                } else if (j === 1 && sel_btn === "absence") {
                    el.setAttribute("placeholder", loc.Select_abscat + "...")
                    el.setAttribute("type", "text")
                } else {
    // --- add type and input_text to el.
                    el.setAttribute("type", "text")
                }
    // --- add other classes to td - Necessary to skip closing popup
                el.classList.add("border_none", "pointer_show");
                //el.classList.add("tsa_bc_transparent");
                el.readOnly = true;
    // --- add EventListeners
                if (sel_btn === "employee"){
                    if ([0,1,2, 3,4,5,6,7].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MFE_Open(el)}, false)
                        el.classList.add("input_text");
                    }
                } else if (sel_btn === "absence"){
                    el.classList.add("input_text");
                    if ([0, 1,2,3,4].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MAB_Open(el)}, false)
                    }
                } else if (sel_btn === "shifts"){
                    if ([0, 5].indexOf( j ) > -1){
                        el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )
                        el.classList.add("input_text");
                    } else if ([1, 2].indexOf( j ) > -1){
                        el.classList.add("input_text");
                            // cannot change order and team in shifts.
                    } else if ([3,4].indexOf( j ) > -1){
                        el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                        el.classList.add("input_popup_date");
                    }
                }  //  if (sel_btn === "employee"){

    // --- add left margin to first column,
                if (j === 0 ){el.classList.add("ml-2");}

    // --- add field_width and text_align
                el.classList.add("td_width_" + field_settings[sel_btn].field_width[j],
                                 "text_align_" + field_settings[sel_btn].field_align[j]);

    // --- add placeholder, only when is_new_row.
                if ( is_new_row && j === 0 ){
                    const placeholder = (tblName === "employee") ? loc.Add_employee + "..." :
                                        (tblName === "teammember") ? loc.Select_employee + "..." : null
                    if (placeholder){ el.setAttribute("placeholder", placeholder) }
                }
    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

    // --- add element to td.
                td.appendChild(el);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[sel_btn])
        return tblRow
    };  // CreateTblRow

//=========  CreateTblFoot  ================ PR2019-10-27
    function CreateTblFoot(tblName, sel_btn) {
        //console.log("========= CreateTblFoot  ========= ", sel_btn);
        // sel_btn are: employee, absence, shifts, calendar, planning, form

// --- function adds row 'add new' in table
        if (field_settings[sel_btn]){
            let employee_pk = null, employee_ppk = null, employee_code = null;
            if (!!selected_employee_pk){
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk);
                employee_pk = get_dict_value(employee_dict, ["id", "pk"])
                employee_ppk = get_dict_value(employee_dict, ["id", "ppk"])
                employee_code = get_dict_value(employee_dict, ["code", "value"])
            }
            if(!employee_ppk) { employee_ppk = get_dict_value (company_dict, ["id", "pk"], 0)};

        // --- insert tblRow into tblBody
            let tblRow = tblFoot_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            id_new += 1;
            const pk_new = "new" + id_new.toString();
            const row_id = get_map_id(tblName, pk_new)
            tblRow.setAttribute("id", row_id);
            tblRow.setAttribute("data-pk", pk_new);
            if(sel_btn === "employee") { tblRow.setAttribute("data-ppk", employee_ppk)};
            tblRow.setAttribute("data-table", tblName);
            //if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

    //+++ insert td's into tblRow
            const column_count = field_settings[sel_btn].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);
    // --- create element with tag from field_tags
                const field_tag = field_settings[sel_btn].field_tags[j];
                let el = document.createElement(field_settings[sel_btn].field_tags[j]);

                let el_div = document.createElement("div");
    // --- add other classes to td - Necessary to skip closing popup
                el_div.classList.add("border_none");
                if (j < column_count -1 ){
                    el_div.classList.add("pointer_show");
                    add_hover(el_div)}

    // --- add EventListeners
                if (sel_btn === "employee" && j === 0 ){
                    el_div.addEventListener("click", function() {MFE_Open()}, false)
                } else if (sel_btn === "absence" && [0, 1].indexOf( j ) > -1 ){
                        el_div.addEventListener("change", function() {UploadEmployeeChanges(el_div)}, false)
                }
    // --- add left margin to first column,
                if (j === 0 ){el_div.classList.add("ml-2");}
    // --- add field_width and text_align
                //el_div.classList.add("td_width_" + field_settings[sel_btn].field_width[j],
                //                 "text_align_" + field_settings[sel_btn].field_align[j]);

    // --- add placeholder
                if (j === 0 || (j === 1 && sel_btn === "absence") ){
                    el_div.innerText = (j === 0 ) ? (tblName === "teammember") ? loc.Select_employee + "..." : loc.Add_employee + "..."  :
                                                    loc.Select_abscat + "..."
                    el_div.classList.add("tsa_color_darkgrey", "tsa_transparent")
                }

                td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  //  if (field_settings[sel_btn])
    }  // CreateTblFoot

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23
    function CreateBtnDeleteInactive(mode, tblRow, el_input){
        el_input.setAttribute("href", "#");
        // dont swow title 'delete'
        // const data_id = (tblName === "customer") ? "data-txt_customer_delete" : "data-txt_order_delete"
        // el.setAttribute("title", get_attr_from_el(el_data, data_id));
        el_input.addEventListener("click", function() {UploadDeleteInactive(mode, el_input)}, false )

        const title = (mode === "employee") ? get_attr_from_el(el_data, "data-txt_employee_delete") :
                      (mode === "absence")  ? get_attr_from_el(el_data, "data-txt_absence_delete") : "";
        el_input.setAttribute("title", title);

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

        //UpdateForm("UpdateFromResponse", update_dict)

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
            selected_teammember_pk = 0;
    //--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};

        } else {

// ++++ created ++++
// add new empty row if tblRow is_created

            if (is_created){
                const row_index = -1;
                tblRow = CreateTblRow(tblBody_datatable, selected_btn, pk_int, ppk_int, null, row_index, "UpdateFromResponse")
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
        //console.log("SBR_tblBody_select", SBR_tblBody_select);
        //console.log("update_dict", update_dict);
            const row_index = GetNewSelectRowIndex(SBR_tblBody_select, 0, update_dict, user_lang);
        //console.log("row_index", row_index);

            let row_count = {count: 0};  // NIU
            const filter_ppk_int = null, filter_include_inactive = true, filter_include_absence = true;

            const bc_color_notselected = cls_bc_lightlightgrey, bc_color_selected = cls_bc_yellow_light;
            const imgsrc_default = imgsrc_inactive_grey, imgsrc_default_header = imgsrc_inactive_lightgrey;
            const imgsrc_black = imgsrc_inactive_black, imgsrc_hover = imgsrc_inactive_lightgrey;
            const title_inactive_btn = loc.Click_show_inactive_employees;
            const has_delete_btn = false;
            selectRow = t_CreateSelectRow(SBR_tblBody_select, tblName, row_index, update_dict, selected_employee_pk,
                                HandleSelect_Row, HandleSelectRowButton, has_delete_btn,
                                filter_ppk_int, filter_include_inactive, filter_include_absence, row_count,
                                imgsrc_default, imgsrc_hover,
                                imgsrc_default, imgsrc_default_header, imgsrc_black, imgsrc_hover,
                                title_inactive_btn)

        //console.log("Created SelectRow", selectRow);
            HighlightSelectRow(SBR_tblBody_select, selectRow, cls_bc_yellow, cls_bc_lightlightgrey);
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


//=========  UpdateTeammemberFromResponse  ================ PR2020-05-17
    function UpdateTeammemberFromResponse(update_dict) {
        console.log("========= UpdateTeammemberFromResponse  =========");
        console.log("update_dict", update_dict);

//--- get id_dict of updated item
        const id_dict = get_dict_value (update_dict, ["id"]);
            const tblName = get_dict_value(id_dict, ["table"]);
            const pk_int = get_dict_value(id_dict, ["pk"]);
            const ppk_int = get_dict_value(id_dict, ["ppk"]);
            const temp_pk_str = get_dict_value(id_dict, ["temp_pk"]);
            const is_absence = get_dict_value(id_dict, ["isabsence"], false);
            const is_template = get_dict_value(id_dict, ["istemplate"], false);
            const is_created = get_dict_value(id_dict, ["created"], false);
            const is_deleted = get_dict_value(id_dict, ["deleted"], false);
        const map_id = get_map_id(tblName, pk_int);
        //const inactive_changed = get_dict_value(update_dict, ["inactive", "updated"])
        const search_code = get_dict_value(update_dict, ["employee", "code"]);
        const search_datefirst = get_dict_value(update_dict, ["employee", "datefirst"]);

        console.log("is_created", is_created);
        console.log("search_code", search_code);
        console.log("search_datefirst", search_datefirst);
        //console.log("inactive_changed", inactive_changed);
        if(is_created){
            const row_index = get_rowindex_by_code_datefirst(tblName, search_code, search_datefirst)
        console.log("search_ row_index", row_index);
            let tblRow = CreateTblRow(tblBody_datatable, selected_btn, pk_int, ppk_int, selected_employee_pk, row_index, "UpdateTeammemberFromResponse")
            UpdateTblRow(tblRow, update_dict)
// --- highlight selected row
            if (pk_int === selected_employee_pk) {
                tblRow.classList.add(cls_selected)
            }
        } else {

        }
    } // UpdateTeammemberFromResponse

//========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(called_by, update_dict){
        // if update_dict does not exist: get info from data_map
        //console.log("========= UpdateForm  =========");
        let item_dict = {}
        if(called_by === "UpdateFromResponse"){
            item_dict = update_dict
        } else {
            item_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk )
        };
        const pk_int = Number(get_dict_value(item_dict, ["id", "pk"], 0));
        const readonly = (!pk_int);

// ---  update fields in employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, len = form_elements.length; i < len; i++) {
            let el_input = form_elements[i];
            el_input.readOnly = readonly;
            UpdateField(el_input, item_dict);
        }
    };

//========= UpdateTblRow  =============
    function UpdateTblRow(tblRow, update_dict){
        //console.log("========= UpdateTblRow  =========");
        //console.log("update_dict", update_dict);
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
            const is_created = ("created" in id_dict);
            //const is_deleted = ("deleted" in id_dict); //delete row moved to outstside this function
            const msg_err = get_dict_value(id_dict, ["error"]);

// put employee_pk in tblRow.data, for filtering rows
            const employee_dict = get_dict_value (update_dict, ["employee"]);
            let employee_pk = null, employee_ppk = null;
            if(!isEmpty(employee_dict)){
                employee_pk = get_dict_value(employee_dict, ["pk"], 0)
                employee_ppk = get_dict_value(employee_dict, ["ppk"], 0)
            };
            add_or_remove_attr(tblRow, "data-employee_pk", (!!employee_pk), employee_pk)
            add_or_remove_attr(tblRow, "data-employee_ppk", (!!employee_ppk), employee_ppk)

// also put replacement_id in tblRow.data, for filtering rows
            // TODO

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
                    //row_index = get_rowindex_by_code_datefirst(tblName, search_code, search_datefirst)
                } else {
                    row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                    tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);
                }

// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function
            if (!!tblRow){
                const is_inactive = (tblName === "employee") ? get_dict_value (update_dict, ["inactive", "value"], false) :
                                    (tblName === "teammember") ? get_dict_value (update_dict, ["employee", "inactive"], false) :
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
                    el_input.value = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, time_duration, false, true)

                } else {
                    el_input.value = null
                    el_input.removeAttribute("data-value");
                    el_input.removeAttribute("data-pk");
                    el_input.removeAttribute("data-ppk");
                }

            } else {
            */
                const field_dict = get_dict_value (item_dict, [fldName]);
                const value = get_dict_value (field_dict, ["value"]);
                const updated = (!!get_dict_value (field_dict, ["updated"]));
                const msg_offset = (selected_btn === "form") ? [-260, 210] : [240, 210];

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
                    //  absence: ["employee", "order", "datefirst", "datelast", "workhoursperday", "delete"],
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
                        el_input.innerText = format_date_vanillaJS (date_JS, month_list, weekday_list, user_lang, true, false);
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
                        //format_date_elementMOMENT (el_input, el_msg, field_dict, month_list, weekday_list,
                        //            user_lang, comp_timezone, hide_weekday, hide_year)
                        const date_iso = get_dict_value(field_dict, ["value"]);
                        const date_JS = get_dateJS_from_dateISO(date_iso);
                        const display = format_date_vanillaJS (date_JS, month_list, weekday_list, user_lang, hide_weekday, hide_year);
                        el_input.value = display;

                    } else if (fldName === "rosterdate"){

                        const hide_weekday = (tblName === "planning") ? false : true;
                        const hide_year = (tblName === "planning") ?  true : false;
                        format_date_elementMOMENT (el_input, el_msg, field_dict, month_list, weekday_list,
                                            user_lang, comp_timezone, hide_weekday, hide_year)
                    } else if (["offsetstart", "offsetend", "timestart", "timeend"].indexOf( fldName ) > -1){
                        const title_overlap = null
                        format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)
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

                    } else if (["workhours", "workdays", "leavedays"].indexOf( fldName ) > -1){
                        let quotient = null;
                        if(!!Number(value)){
                            const divisor = (fldName === "workhours") ? 60 : 1440;
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

//=========  UpdateAddnewRow  ================ PR2019-10-27
    function UpdateAddnewRow(tblName) {
        console.log("========= UpdateAddnewRow  ========= ", mode);
        // modes are: employee, absence, team, planning, form

        if(tblName === "employee"){
            // get ppk_int from company_dict ( ppk_int = company_pk)
            const ppk_int = parseInt(get_dict_value (company_dict, ["id", "pk"], 0))

            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}};
            // in  "teammember" and "absence" selected_employee_pk has always value
            const row_index = -1;
            let newRow = CreateTblRow(tblBody_datatable, mode, pk_new, ppk_int, selected_employee_pk, row_index, "UpdateAddnewRow")
            UpdateTblRow(tblName, newRow, dict)

// --- create addnew row when mode is 'absence' or 'team'
        } else if (tblName === "teammember") {
            let tblBody = document.getElementById("id_tbody_" + tblName);

// get info from selected employee, store in dict
            let employee_ppk = 0;
            // Note: the parent of 'teammember' is 'team', not 'employee'!!
            let teammember_ppk = 0
            let dict = {}
            //dict["workhoursperday"] = {value: workhoursperday}
            // NOT TRUE: in  "teammember" and "absence" selected_employee_pk has always value
            //console.log("selected_employee_pk", selected_employee_pk)

            if (!!selected_employee_pk ){
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk )
                //console.log("employee_dict", employee_dict)
                employee_ppk = parseInt(get_dict_value(employee_dict, ["id", "ppk"], 0));
                const code_value = get_dict_value(employee_dict, ["code", "value"])
                dict["employee"] = {"pk": selected_employee_pk, "ppk": employee_ppk, "value": code_value, "field": "employee", "locked": true}
            } else {
                // needed to put 'Select employee' in field
                dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            }

// goto lastRow
            let lastRow_is_addnewRow = false;
            let lastRow, pk_str;
            const row_count = tblBody.rows.length;
            if(!!row_count){
                lastRow = tblBody.rows[row_count - 1];
                pk_str = get_attr_from_el(lastRow, "data-pk");
                // if pk is number it is not an 'addnew' row
                lastRow_is_addnewRow = (!Number(pk_str));
            }
            //console.log("lastRow_isnot_addnewRow", lastRow_isnot_addnewRow, "lastRow pk_str", pk_str);

            if (lastRow_is_addnewRow){
// if lastRow is an 'addnew' row: update with employee name
                dict["id"] = {"pk": pk_str, "ppk": teammember_ppk, "table": "teammember"};
            } else {
                dict["id"] = {"pk": pk_new, "ppk": teammember_ppk, "temp_pk": pk_new, "table": "teammember"};
            }
            //console.log("dict", dict)
            //console.log("lastRow", lastRow)
            UpdateTblRow(tblName, lastRow, dict)
        }
    }  // function UpdateAddnewRow

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_dict", setting_dict)

        const page_dict = get_dict_value(setting_dict, ["page_employee"])
        if (!isEmpty(page_dict)){
            const saved_btn = get_dict_value(page_dict, ["btn"])
            selected_btn = (!!saved_btn) ? saved_btn : "employee";
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
      //      CreateCalendar("employee", calendar_setting_dict, calendar_map, MSE_Open, loc, timeformat, user_lang);
     //   }

    }  // UpdateSettings


//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");
        //console.log( "selected_btn", selected_btn);
        //console.log( "selected_employee_pk", selected_employee_pk);

        let header_text = null;
        if (selected_btn === "employee") { //show 'Employee list' in header when List button selected
            header_text = loc.Employee_list //was:  get_attr_from_el_str(el_data, "data-txt_employee_list")
        } else if (!!selected_employee_pk) {
            const dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
            const employee_code = get_dict_value(dict, ["code", "value"])
        //console.log( "employee_code", employee_code);
            if(!!employee_code){header_text = employee_code}
        } else {
            // TODO is_addnew_mode is not defined yet
            if (is_addnew_mode){
                header_text = loc.Add_employee + "...";
            } else {
                header_text = loc.Select_employee + "...";
            }
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
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const data_map = (tblName === "teammember") ? teammember_map : employee_map
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);

            //console.log( "tblName", tblName, typeof tblName);
            //console.log( "pk_str", pk_str, typeof pk_str);
            //console.log( "map_dict", map_dict);

            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                let upload_dict = {"id": map_dict["id"]};
                mod_dict = {"id": map_dict["id"]};
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
        console.log(">>>>>>>> imgsrc_inactive_black:", imgsrc_inactive_black)
        console.log(">>>>>>>> imgsrc_inactive_lightgrey:", imgsrc_inactive_lightgrey)
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
                    const workhoursperday = get_dict_value(employee_dict, ["workhoursperday", "value"])
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
                        //set default value to workhours
                        if(fieldname === "team" && is_create){
                            // convert to hours, because input is in hours
                            // TODO add popup hours window
                            const hours = workhoursperday / 60
                            upload_dict["workhoursperday"] = {"value": hours, "update": true }
                        }
                    } else {
                        let new_value = el_input.value;
                        if (["workhoursperday", "workdays", "leavedays",].indexOf( fieldname ) > -1){
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
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type
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

                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const update_dict = response["update_list"][i];
                            UpdateFromResponse(update_dict);
                        }
                    };

                    if ("employee_list" in response) {
                        get_datamap(response["employee_list"], employee_map)

                        const tblName = "employee";
                        const include_parent_code = null;
                        let tblHead = document.getElementById("id_SBR_thead_select");
                        const filter_ppk_int = null, filter_show_inactive = true, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false, addall_to_list_txt = null;

                        const imgsrc_default = imgsrc_inactive_grey;
                        const imgsrc_default_header = imgsrc_inactive_lightgrey;
                        const imgsrc_default_black = imgsrc_inactive_black;
                        const imgsrc_hover = imgsrc_inactive_black;
                        const header_txt = null;
            console.log("...................t_Fill_SelectTable in UploadChanges")
                        t_Fill_SelectTable(SBR_tblBody_select, tblHead, employee_map, tblName, null, include_parent_code,
                            HandleSelect_Filter, HandleSelectFilterButtonInactive, HandleSelect_Row, HandleSelectRowButton, false,
                            filter_ppk_int, filter_show_inactive, filter_include_inactive, filter_include_absence, filter_istemplate, addall_to_list_txt,
                            cls_bc_lightlightgrey, cls_bc_yellow,
                            imgsrc_default, imgsrc_default_header, imgsrc_default_black, imgsrc_hover,
                            header_txt, loc.Click_show_inactive_employees)

                        FilterSelectRows(SBR_tblBody_select, filter_select);

                        FillTableRows("UploadChanges");
                    };
                    if ("teammember_list" in response) {
                        get_datamap(response["teammember_list"], teammember_map)
                    };
                    if ("teammember_update" in response) {
                        UpdateTeammemberFromResponse(response["teammember_update"]);
                    };
                    if ("employee_calendar_list" in response) {
                        get_datamap(response["employee_calendar_list"], calendar_map)
                        CreateCalendar("employee", selected_calendar_period, calendar_map, MSE_Open, loc, timeformat, user_lang);
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
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        console.log("===  HandlePopupDateOpen  =====") ;
        console.log("el_input", el_input) ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

//--- get pk etc from el_input, pk from selected_employee_pk when formmode
        let pk_str, tblName, map_id, data_mode;
        if (selected_btn === "form"){
            pk_str = selected_employee_pk.toString();
            tblName = "employee";
            map_id = tblName + pk_str;
        } else {
            const tblRow = get_tablerow_selected(el_input)
            pk_str = get_attr_from_el(tblRow, "data-pk");
            tblName = get_attr_from_el(tblRow, "data-table") ;
            data_mode = get_attr_from_el(tblRow, "data-mode") ;
            map_id = get_map_id(tblName, pk_str)

            console.log("pk_str", pk_str, "tblName", tblName, "map_id", map_id, "data_mode: ", data_mode) ;
        }

        if (!!map_id) {
//--- get item_dict from  employee_map
            const data_map = (tblName === "employee") ? employee_map : teammember_map
            const item_dict = get_mapdict_from_datamap_by_id(data_map, map_id)
            console.log( item_dict);

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
            el_popup_date.setAttribute("data-mode", data_mode);

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
        }  // if (!!tr_selected){
    }; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-04-14
    function HandlePopupDateSave() {
        console.log("===  function HandlePopupDateSave =========");
        console.log(el_popup_date);
// ---  get pk_str and fldName from el_popup
        const pk_str = el_popup_date.getAttribute("data-pk");
        const fldName = el_popup_date.getAttribute("data-field");
        const data_value = el_popup_date.getAttribute("data-value");
        const tblName = el_popup_date.getAttribute("data-table");
        const data_mode = el_popup_date.getAttribute("data-mode");

        console.log("tblName: ", tblName);
        console.log("fldName: ", fldName);
        console.log("data_value: ", data_value);
        console.log("data_mode: ", data_mode);

// ---  get item_dict from employee_map
        const data_map = (tblName === "employee") ? employee_map :
                         (tblName === "teammember") ? teammember_map : null
        const item_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);
        const pk_int = get_pk_from_dict(item_dict)
        const ppk_int = get_ppk_from_dict(item_dict)

        el_popup_date_container.classList.add(cls_hide);

        if(!!pk_int && !! ppk_int){
            let id_dict = {pk: pk_int, ppk: ppk_int, table: tblName} //  , mode: data_mode}
            if(data_mode === "absence") {id_dict["isabsence"] = true}

            const new_value = el_popup_date.value
            if (new_value !== data_value) {
                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {update: true}
                if(!!new_value){field_dict["value"] = new_value};
                let upload_dict = {id: id_dict}
                upload_dict[fldName] = field_dict;

// put new value in inputbox before new value is back from server
                const map_id = get_map_id(tblName, pk_str);
                console.log("map_id", map_id);
                let tr_changed = document.getElementById(map_id);
                // in form view there is no tr_changed
                let el_input = null;
                if(tr_changed) {
                    el_input = tr_changed.querySelector("[data-field=" + fldName + "]");
                } else if (fldName === "datefirst"){
                    el_input = document.getElementById("id_form_datefirst")
                } else if (fldName === "datelast"){
                    el_input = document.getElementById("id_form_datelast")
                }

                // --- lookup input field with name: fldName
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fldName) + "]");
                        // CSS.escape not supported by IE, Chrome and Safari,
                        // CSS.escape is not necessary, there are no special characters in fldName
                if (!!el_input){
                    console.log("el_input", el_input);
                    const hide_weekday = true, hide_year = false;
                    format_date_elementMOMENT (el_input, el_msg, field_dict, month_list, weekday_list,
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
                            UpdateTeammemberFromResponse(response["teammember_update"]);
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
                       isampm: (timeformat === 'AmPm'),
                       quicksave: is_quicksave}

// ---  create st_dict with static text
        const txt_dateheader = (fldName === "offsetstart") ? loc.Start_time :
                               (fldName === "offsetend") ? loc.End_time :
                               (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ?  (pgeName === "absence") ? loc.Hours : loc.Working_hours :
                               (fldName === "offsetsplit") ? loc.Split_time : null
        const show_btn_delete = true;
        let st_dict = { interval: interval, comp_timezone: comp_timezone, user_lang: user_lang,
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete,
                        weekday_list: loc.weekdays_abbrev, month_list: loc.months_abbrev,
                        url_settings_upload: url_settings_upload,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                       };

        console.log("tp_dict: ", tp_dict);
        console.log("st_dict: ", st_dict);
        ModTimepickerOpen(el_input, ModTimepickerChanged, tp_dict, st_dict)

    };  // ModShiftTimepickerOpen

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//=========  ModPeriodOpen  ================ PR2019-10-28
    function ModPeriodOpen() {
        console.log(" -----  ModPeriodOpen   ----")
        // when clicked on delete btn in form tehre is no tr_selected, use selected_employee_pk

        if(!isEmpty(selected_planning_period)){
            if("period_datefirst" in selected_planning_period){
                document.getElementById("id_mod_period_datefirst").value = selected_planning_period["period_datefirst"]
            }
            if("period_datelast" in selected_planning_period){
                document.getElementById("id_mod_period_datelast").value = selected_planning_period["period_datelast"]
            }
        }

        //TODO check if these fields are not in use
        document.getElementById("id_modperiod_div_selectcustomer").classList.add(cls_hide)
        document.getElementById("id_modperiod_div_selectorder").classList.add(cls_hide)

        // ---  show modal, set focus on save button
        $("#id_mod_period").modal({backdrop: true});

    };  // ModPeriodOpen

//=========  ModPeriodSelectCustomer  ================ PR2020-01-09
    function ModPeriodSelectCustomer(selected_pk_str) {
        console.log( "===== ModPeriodSelectCustomer ========= ");
        const new_customer_pk = Number(selected_pk_str)
        if (new_customer_pk !== selected_customer_pk ){
            selected_customer_pk = new_customer_pk;
            selected_order_pk = 0;
        }
        console.log( "selected_pk_str: ", selected_pk_str);
        console.log( "selected_customer_pk: ", selected_customer_pk);
        console.log( "selected_order_pk: ", selected_order_pk);

        let el_select = document.getElementById("id_modperiod_selectorder")
        el_select.innerText = null
        const selectall_text =  "&lt;" +  loc.All_orders + "&gt;"
        const select_text_none =  "&lt;" +  loc.No_orders + "&gt;"
        // when 'all customers is selected (selected_customer_pk): there are no orders in selectbox 'orders'
        // to display 'all orders' instead of 'no orders' we make have boolean 'hide_none' = true
        const is_template_mode = false, has_selectall = true, hide_none = (!selected_customer_pk);
        t_FillSelectOption2020(el_select, order_map, "order",is_template_mode, has_selectall, hide_none,
                    selected_customer_pk, selected_order_pk, selectall_text, select_text_none)
    }  // ModPeriodSelectCustomer

//=========  ModPeriodSelectOrder  ================ PR2020-01-09
    function ModPeriodSelectOrder(selected_pk_str) {
        console.log( "===== ModPeriodSelectOrder ========= ");
        console.log( "selected_pk_str: ", selected_pk_str);

        selected_order_pk = Number(selected_pk_str)
        console.log( "selected_order_pk: ", selected_order_pk);

    }  // ModPeriodSelectOrder

//=========  ModPeriodSelectPeriod  ================ PR2020-01-09
    function ModPeriodSelectPeriod(tr_clicked, selected_index) {
        console.log( "===== ModPeriodSelectPeriod ========= ", selected_index);
        if(!!tr_clicked) {
// ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)

// ---  add period_tag to mod_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_dict["period_tag"] = period_tag;

// ---  enable date input elements, give focus to start
            let el_datefirst = document.getElementById("id_mod_period_datefirst");
            let el_datelast = document.getElementById("id_mod_period_datelast");

            el_datefirst.disabled = (period_tag !== "other");
            el_datelast.disabled = (period_tag !== "other");

            if (period_tag === "other") {
                el_datefirst.focus();
            } else {
                let lst = []
                if (period_tag === "tweek") {
                    lst = get_thisweek_monday_sunday_iso();
                } else if (period_tag === "nweek") {
                    lst = get_nextweek_monday_sunday_iso();
                } else if (period_tag === "tmonth") {
                    lst = get_thismonth_first_last_iso();
                } else if (period_tag === "nmonth") {
                    lst = get_nextmonth_first_last_iso();
                }
                el_datefirst.value = lst[0];
                el_datelast.value = lst[1];

                ModPeriodSave();
            }
        }
    }  // ModPeriodSelectPeriod

//=========  ModPeriodDateChanged  ================ PR2019-07-14
    function ModPeriodDateChanged(fldName) {
        console.log( "===== ModPeriodDateChanged ========= ", fldName);
// ---  set min max of other input field
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        } else { el_other.removeAttribute(attr_key) };
    }  // ModPeriodDateChanged

//=========  ModPeriodSave  ================ PR2020-01-09
    function ModPeriodSave() {
        console.log("===  ModPeriodSave  =====") ;
        console.log("mod_dict: ", deepcopy_dict(mod_dict) ) ;
        // TODO check if in useselected_customer_pk selected_order_pk
        const selected_customer_pk = 0, selected_order_pk = 0;

// planning_period: {period_tag: "tweek", now: (5) [2020, 2, 8, 9, 55]}
// employee_planning: {customer_pk: 694, order_pk: 1420, add_empty_shifts: true, skip_restshifts: true, orderby_rosterdate_customer: true


// employee_planning: {page: "employee", period_employee: {page: "employee", period_tag: "tweek", now: Array(5)},
// customer_pk: null, order_pk: null, employee_pk: null

// ---  upload new setting
        // settings are saved in function customer_planning, function 'period_get_and_save'
        el_hdr_datatable.innerText = loc.Period + "..."

        const period_tag = get_dict_value(mod_dict, ["period_tag"], "tweek");
        console.log("period_tag: ", period_tag) ;

        selected_planning_period = {period_tag: period_tag}
        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {selected_planning_period["period_datefirst"] = datefirst};
            if (!!datelast) {selected_planning_period["period_datelast"] = datelast};
        }
        // send 'now' as array to server, so 'now' of local computer will be used
        selected_planning_period["now"] = get_now_arr_JS();

        let employee_planning_dict = {
            employee_pk: (!!selected_employee_pk) ? selected_employee_pk : null,
            add_empty_shifts: false,
            skip_restshifts: false,
            orderby_rosterdate_customer: false
        };

        console.log("selected_planning_period: ", selected_planning_period)

        let datalist_request = {planning_period: selected_planning_period,
                                employee_planning: employee_planning_dict,
        };

        DatalistDownload(datalist_request);

        $("#id_mod_period").modal("hide");
    }

//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        // console.log("===  CreateTblModSelectPeriod == ");
        // console.log(selected_planning_period);
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
//+++ insert td's ino tblRow
        const len = loc.period_select_list.length
        for (let j = 0, tblRow, td, tuple; j < len; j++) {
            tuple = loc.period_select_list[j];
//+++ insert tblRow ino tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModPeriodSelectPeriod(tblRow, j);}, false )
    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});
            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }

    } // CreateTblModSelectPeriod

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
            period_txt += format_period(datefirst_ISO, datelast_ISO, loc.months_abbrev, loc.weekdays_abbrev, user_lang)
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


// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++

//=========  ModConfirmOpen  ================ PR2019-06-23
    function ModConfirmOpen(mode, tblRow) {
        //console.log("tblRow", tblRow)
        console.log(" -----  ModConfirmOpen   ----", mode)
        // when clicked on delete btn in menu or form there is no tblRow, use selected_employee_pk instead
        mod_dict = {};
// ---  create id_dict
        let map_id, tblName;
        if(!!tblRow){
            tblName = get_attr_from_el (tblRow, "data-table");
        } else {
// lookup tablerow
            // when clicked on delete button in data form there is no tblRow, use selected_employee_pk instead
            tblName = "employee";
            const id_str = get_map_id(tblName, selected_employee_pk);
            tblRow = document.getElementById(id_str);
        }
        const is_tbl_teammember = (tblName === "teammember")
        console.log("selected_employee_pk", selected_employee_pk)
        console.log("is_tbl_teammember", is_tbl_teammember)
        const pk_str = get_attr_from_el(tblRow, "data-pk");
        const data_map = (is_tbl_teammember) ? teammember_map : employee_map;
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);

        let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
        let el_btn_save = document.getElementById("id_confirm_btn_save");

        if(isEmpty(map_dict)){
            const header_txt = (mode === "delete") ? loc.Delete_employee :
                               (mode === "inactive") ? loc.Make_inactive : loc.Select_employee + "...";
            document.getElementById("id_confirm_header").innerText = header_txt
            document.getElementById("id_confirm_msg01").innerText = loc.TXT_Pease_select_employee_first;
            document.getElementById("id_confirm_msg02").innerText = null;
            document.getElementById("id_confirm_msg03").innerText = null;

            // hide save button
            el_btn_save.classList.add(cls_hide);
            el_btn_cancel.classList.remove(cls_hide);
            el_btn_cancel.innerText =  loc.Close
            setTimeout(function() {el_btn_save.focus()}, 50);

// ---  show modal, set focus on save button
            $("#id_mod_confirm").modal({backdrop: true});
        } else {
            //console.log("map_dict", map_dict)
            mod_dict = {mode: mode, id: map_dict.id};

            let msg_01_txt, employee_code;
            const dict_key = (is_tbl_teammember) ? "employee" : "code";
            const dict_subkey = (is_tbl_teammember) ? "code" : "value";
            employee_code =  get_dict_value(map_dict, [dict_key, dict_subkey], "")
            console.log("employee_code", employee_code)

            if (mode === "inactive"){
                // only tbl employee has inactive button
                msg_01_txt = loc.This_employee + " " + loc.will_be_made_inactive;
            } else if (mode === "delete"){
                mod_dict.is_delete = true;
                if (is_tbl_teammember){
                     const absence_code = get_dict_value(map_dict, ["order", "code"], "-")
                     msg_01_txt = loc.Absence + " '" + absence_code  + "' " + loc.will_be_deleted;;
                } else {
                    msg_01_txt = loc.This_employee + " " + loc.will_be_deleted;;
                }
            }

            document.getElementById("id_confirm_header").innerText = employee_code;
            document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
            document.getElementById("id_confirm_msg02").innerText = loc.Do_you_want_to_continue;
            document.getElementById("id_confirm_msg03").innerText = null;

            // btn_cancel will be hidden in MSE_Open, therefore remove cls_hide
            el_btn_cancel.classList.remove(cls_hide);
            el_btn_save.classList.remove(cls_hide)

            // make save button red when delete
            el_btn_save.classList.remove((mode === "delete") ? "btn-primary" : "btn-outline-danger")
            el_btn_save.classList.add((mode === "delete") ? "btn-outline-danger" : "btn-primary")

            //const btn_text = (is_delete) ? loc.Delete : loc.Create
            el_btn_save.innerText =  (mode === "delete") ? loc.Yes_delete :
                                     (mode === "inactive") ? loc.Yes_make_inactive : loc.OK;
            el_btn_cancel.innerText =  loc.No_cancel

            setTimeout(function() {el_btn_save.focus()}, 50);

            if(mode === "delete"){
        // ---  create param
                mod_dict["id"]["delete"] = true;
        // ---  show modal
                $("#id_mod_confirm").modal({backdrop: true});

            } else if(mode === "inactive"){
        // only table employee has inactive field
        // get inactive from select table
                let inactive = (get_attr_from_el(tblRow, "data-inactive") === "true");
        // toggle inactive
                inactive = (!inactive);
                mod_dict["inactive"] = {"value": inactive, "update": true}
                if(!!inactive){
        // ---  show modal, set focus on save button
                    $("#id_mod_confirm").modal({backdrop: true});
                } else {
        // ---  dont show confirm box when make active:
                    const url_str = (is_tbl_teammember) ? url_teammember_upload : url_employee_upload;
                    UploadChanges(mod_dict, url_str);
                }
            }  // if(mode === "delete")
        }  // if(!isEmpty(map_dict))
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        //console.log("===  ModConfirmSave  =====") ;
        $("#id_mod_confirm").modal("hide");

        const tblName = get_dict_value(mod_dict, ["id", "table"])
        const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload

        const pk_int = get_dict_value(mod_dict,["id", "pk"]);
        const map_id = get_map_id(tblName, pk_int);
        console.log("===================================is_delete");
        console.log("map_id:", map_id);

        const is_delete = get_dict_value(mod_dict, ["is_delete"], false)
        console.log("mod_dict:", mod_dict);
        console.log("is_delete:", is_delete);
        if (is_delete) {
            let tr_changed = document.getElementById(map_id);
            if(!!tr_changed){
                tr_changed.classList.add(cls_error);
                setTimeout(function (){tr_changed.classList.remove(cls_error)}, 2000);
            }
        }
        UploadChanges(mod_dict, url_str);
    }

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
        let el_div_remove = document.getElementById("id_ModSelEmp_div_remove_employee")
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
        let el_mod_employee_input = document.getElementById("id_ModSelEmp_input_employee")
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

    };  // ModEmployeeOpen

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
                document.getElementById("id_ModSelEmp_input_employee").value = employee_code
// save selected employee
                ModEmployeeSave("save");
            }  // if(!isEmpty(employee_dict))
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-11-06
    function ModEmployeeFilterEmployee(option, event_key) {
        //console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let el_input = document.getElementById("id_ModSelEmp_input_employee")
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
        //console.log("code_value: ", code_value );

                    tblRow.setAttribute("data-employee_pk", pk_int)
                    tblRow.setAttribute("data-employee_ppk", ppk_int)

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

// get tblRow_id, pk and ppk from tr_clicked; put values in el_mod_employee_body
        let el_mod_employee_body = document.getElementById("id_mod_empl_del_body")
        el_mod_employee_body.setAttribute("data-tblrowid", tr_clicked.id);
        el_mod_employee_body.setAttribute("data-table", get_attr_from_el(tr_clicked, "data-table"));
        el_mod_employee_body.setAttribute("data-pk", get_attr_from_el(tr_clicked, "data-pk"));
        el_mod_employee_body.setAttribute("data-ppk", get_attr_from_el(tr_clicked, "data-ppk"));

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
        mod_dict = {page: "modemployee",
                    skip_focus_event: false,
                    employee: {}
                   };

// ---  get info from tblRow --------------------------------
        const tblRow = get_tablerow_selected(el_input)
        const tblRow_employee_pk = get_attr_from_el(tblRow, "data-pk" )
        const tblRow_employee_ppk = get_attr_from_el(tblRow, "data-ppk" )

        if (tblRow_employee_pk) {
// ---  put value of tblRow_employee_pk in mod_dict and update selected_employee_pk
            selected_employee_pk = ModDict_SetEmployeeDict(tblRow_employee_pk, tblRow.rowIndex);
        }
        console.log("tblRow_employee_pk: ", tblRow_employee_pk)
        console.log("mod_dict: ", mod_dict)
// ---  put employee_code in header
        const header_text = (mod_dict.employee.code) ? mod_dict.employee.code : loc.Employee;
        const el_MFE_hdr_employee = document.getElementById("id_MFE_hdr_employee");
        el_MFE_hdr_employee.innerText = header_text;

        document.getElementById("id_MFE_code").value = (mod_dict.employee.code ? mod_dict.employee.code: null);
        document.getElementById("id_MFE_namelast").value = (mod_dict.employee.namelast ? mod_dict.employee.namelast: null);
        document.getElementById("id_MFE_namefirst").value = (mod_dict.employee.namefirst ? mod_dict.employee.namefirst: null);

        document.getElementById("id_MFE_identifier").value = (mod_dict.employee.identifier ? mod_dict.employee.identifier: null);
        document.getElementById("id_MFE_payrollcode").value = (mod_dict.employee.payrollcode ? mod_dict.employee.payrollcode: null);
        document.getElementById("id_MFE_telephone").value = (mod_dict.employee.telephone ? mod_dict.employee.telephone: null);

        document.getElementById("id_MFE_email").value = (mod_dict.employee.email ? mod_dict.employee.email: null);

        const el_MFE_datefirst = document.getElementById("id_MFE_datefirst")
        const el_MFE_datelast = document.getElementById("id_MFE_datelast")
        el_MFE_datefirst.value = (mod_dict.employee.datefirst ? mod_dict.employee.datefirst: null);
        el_MFE_datelast.value = (mod_dict.employee.datelast ? mod_dict.employee.datelast: null);

        document.getElementById("id_MFE_workhours").value = (mod_dict.employee.workhours ? mod_dict.employee.workhours / 60 : null);
        document.getElementById("id_MFE_workdays").value = (mod_dict.employee.workdays ? mod_dict.employee.workdays / 1440 : null);
        document.getElementById("id_MFE_leavedays").value =(mod_dict.employee.leavedays ?  mod_dict.employee.leavedays / 1440 : null);

// set focus to clicked field
        const fldName = get_attr_from_el(el_input, "data-field")
        if(fldName){
            let selected_element = null;
            let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".form-control")
            for (let i = 0, el, len = form_elements.length; i < len; i++) {
                el = form_elements[i]
                const el_field = get_attr_from_el(el, "data-field")
                if(el_field === fldName) {
                    selected_element = el;
                    break;
                }
            }
            if(selected_element){set_focus_on_el_with_timeout(selected_element, 150)}
        }

        MFE_validate_and_disable();
// ---  show modal
        $("#id_mod_form_employee").modal({backdrop: true});
    }  // MFE_Open


//=========  MFE_save  ================  PR2020-06-06
    function MFE_save(crud_mode) {
        console.log(" -----  MFE_save  ----", crud_mode);
        console.log( "mod_dict: ", mod_dict);
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: 'employee' } }

        if(mod_dict.employee.pk) {
            upload_dict.id.pk = mod_dict.employee.pk;
            upload_dict.id.ppk = mod_dict.employee.ppk;
            upload_dict.id.rowindex = mod_dict.employee.rowindex;
            if(is_delete) {upload_dict.id.delete = true}
        } else {
            upload_dict.id.create = true;
        }
// ---  loop through input elements
        let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".form-control")
        for (let i = 0, el_input, len = form_elements.length; i < len; i++) {
            el_input = form_elements[i]
            if(el_input){
                const fldName = get_attr_from_el(el_input, "data-field");
                let new_value = null
                if(["workhours", "workdays", "leavedays"].indexOf(fldName) > -1){
                    const arr = get_workhours_days_leave_from_input(el_input, loc)
                    new_value = arr[0];
                } else {
                    new_value = (el_input.value) ? el_input.value : null;
                }
                const old_value = get_dict_value(mod_dict, ["employee", fldName])
                if (new_value !== old_value) { upload_dict[fldName] = {value: new_value, update: true}};
            };
        }
        console.log( "upload_dict: ", upload_dict);
        // modal is closed by data-dismiss="modal"
        UploadChanges(upload_dict, url_employee_upload);
    }  // MFE_save

//=========  MFE_validate_and_disable  ================  PR2020-06-06
    function MFE_validate_and_disable(el_input) {
        console.log(" -----  MFE_validate_and_disable   ----")
        const code_value = document.getElementById("id_MFE_code").value;
        const namelast_value = document.getElementById("id_MFE_namelast").value;
        console.log("code_value: <" + code_value + ">")
        console.log("namelast_value: <" + namelast_value + ">")
        const code_is_blank = (!document.getElementById("id_MFE_code").value)
        const namelast_is_blank = (!document.getElementById("id_MFE_namelast").value)

        let invalid_number = false;
        if(el_input){
            const fldName = get_attr_from_el(el_input, "data-field");
            if(["workhours", "workdays", "leavedays"].indexOf(fldName) > -1){
                const arr = get_workhours_days_leave_from_input(el_input, loc)
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

        console.log("code_is_blank: <" + code_is_blank + ">")
        console.log("namelast_is_blank: <" + namelast_is_blank + ">")

        el_MFE_btn_save.disabled = (code_is_blank || namelast_is_blank);
        add_or_remove_class(document.getElementById("id_MFE_err_code"), cls_hide, !code_is_blank)
        add_or_remove_class(document.getElementById("id_MFE_err_lastname"), cls_hide, !namelast_is_blank)

    }

// +++++++++++++++++ MODAL ABSENCE +++++++++++++++++++++++++++++++++++++++++++
//=========  ModAbsence_Open  ================  PR2020-05-14
    function MAB_Open(el_input) {
        console.log(" -----  MAB_Open   ----")

        mod_dict = {page: "modabsence",
                    skip_focus_event: false,
                    employee: {},
                    teammember: {},
                    order: {},
                    scheme: {},
                    shift: {}};

// ---  get info from tblRow --------------------------------
        const tblRow = get_tablerow_selected(el_input)
        const tblRow_employee_pk = get_attr_from_el(tblRow, "data-employee_pk" )
        const tblRow_teammember_pk = get_attr_from_el(tblRow, "data-pk" )

        if (tblRow_employee_pk) {
// ---  put value of tblRow_employee_pk in mod_dict and update selected_employee_pk
            selected_employee_pk = ModDict_SetEmployeeDict(tblRow_employee_pk);
        //} else {
// --- when no employee selected: fill select table employee
            // is called in MAB_GotFocus
            //MAB_FillSelectTable("employee");
        }
// --- get info from data_maps
        const selected_teammember_pk = ModDict_SetTeammemberDict(tblRow_teammember_pk, tblRow.rowIndex);
        MAB_SetSchemeDict(selected_teammember_pk);
        MAB_SetOrderDict(selected_teammember_pk);
        MAB_SetShiftDict(selected_teammember_pk);
// ---  put employee_code in header
        const header_text = (mod_dict.employee.code) ? loc.Absence + " " + loc.of + " " + mod_dict.employee.code : loc.Absence;
        const el_MAB_hdr_absence = document.getElementById("id_MAB_hdr_absence");
        el_MAB_hdr_absence.innerText = header_text;
// --- hide input element employee, when employee selected
        show_hide_element_by_id("id_MAB_div_input_employee", !mod_dict.employee.pk)
// --- hide delete button when no employee selected
        add_or_remove_class(document.getElementById("id_MAB_btn_delete"), cls_hide, !mod_dict.employee.pk)
// ---  update Inputboxes
        el_MAB_input_employee.value = null
        MAB_UpdateDatefirstlastInputboxes();
        MOD_UpdateOffsetInputboxes();
// --- make input_abscat readOnly
        el_MAB_input_abscat.readOnly = (!mod_dict.employee.pk);
        el_MAB_input_abscat.value =  (mod_dict.employee.pk) ? mod_dict.order.code : null;
        MAB_BtnSaveEnable()
// ---  set focus to input_employee or select_abscat
        const el_focus =  (mod_dict.employee.pk) ? el_MAB_input_abscat : el_MAB_input_employee;
        set_focus_on_el_with_timeout(el_focus, 150)
// ---  show modal
        $("#id_mod_absence").modal({backdrop: true});
    }  // MAB_Open

//=========  ModAbsence_Save  ================  PR2020-05-17
    function MAB_Save(crud_mode) {
        console.log(" -----  MAB_Save  ----", crud_mode);
        console.log( "mod_dict: ", mod_dict);
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {isabsence: true, table: 'teammember' } }

        if(mod_dict.teammember.pk) {
            upload_dict.id.pk = mod_dict.teammember.pk;
            upload_dict.id.ppk = mod_dict.teammember.ppk;
            upload_dict.id.rowindex = mod_dict.teammember.rowindex;
            if(is_delete) {upload_dict.id.delete = true}
        } else {
            upload_dict.id.temp_pk = mod_dict.teammember.temp_pk;
            upload_dict.id.create = true;
        }
        upload_dict.order = {pk: mod_dict.order.pk, ppk: mod_dict.order.ppk, code: mod_dict.order.code, update: true};
        if(mod_dict.scheme.datefirst) { upload_dict.datefirst = {value: mod_dict.scheme.datefirst, update: true} };
        if(mod_dict.scheme.datelast) { upload_dict.datelast = {value: mod_dict.scheme.datelast, update: true} };
        if(mod_dict.shift.offsetstart) { upload_dict.offsetstart = {value: mod_dict.shift.offsetstart, update: true} };
        if(mod_dict.shift.offsetend) { upload_dict.offsetend = {value: mod_dict.shift.offsetend, update: true} };
        if(mod_dict.shift.breakduration) { upload_dict.breakduration = {value: mod_dict.shift.breakduration, update: true} };
        if(mod_dict.shift.timeduration) { upload_dict.timeduration = {value: mod_dict.shift.timeduration, update: true} };

        const new_shift_code = create_shift_code(loc, mod_dict.shift.offsetstart, mod_dict.shift.offsetend, mod_dict.shift.timeduration);
        if(new_shift_code) { upload_dict.shift_code = new_shift_code }
        if(mod_dict.employee.pk) {
            upload_dict.employee = {pk: mod_dict.employee.pk, ppk: mod_dict.employee.ppk, code: mod_dict.employee.code, update: true};
        }
        console.log( "upload_dict: ", upload_dict);
// =========== UploadChanges =====================
        UploadChanges(upload_dict, url_employee_upload);

    }  // MAB_Save

//========= MAB_FillSelectTable  ============= PR2020-05-17
    function MAB_FillSelectTable(tblName) {
        console.log( "=== MAB_FillSelectTable ", tblName);

        let tblBody = document.getElementById("id_MAB_tblbody_select");
        tblBody.innerText = null;

        const is_tbl_employee = (tblName === "employee");

        const hdr_text = (is_tbl_employee) ? loc.Employees : loc.Absence_categories
        const el_MAB_hdr_select = document.getElementById("id_MAB_hdr_select");
        el_MAB_hdr_select.innerText = hdr_text;

        const data_map = (is_tbl_employee) ? employee_map : abscat_map;
        let row_count = 0
        if (data_map.size){
//--- loop through employee_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_dict_value(item_dict, ["code", "value"], "");
// --- validate if employee can be added to list
                const is_inactive = get_dict_value(item_dict, ["inactive", "value"])
                if (!is_inactive){
//- insert tblBody row
                    let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);
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
                } //  if (pk_int !== selected_employee_pk){
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
        console.log( "=== MAB_InputElementKeyup  ", tblName)

        const new_filter = el_input.value
        let tblBody_select = document.getElementById("id_MAB_tblbody_select");
        const len = tblBody_select.rows.length;
        if (!!new_filter && !!len){
// ---  filter select rows
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
// ---  get pk of selected item (when there is only one row in selection)
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (only_one_selected_pk) {
                let selected_order_pk = null;
                // dont skip skip_focus_event when tblName = employee, because abscat selecttable must be filled
                if(tblName !== "employee") {mod_dict.skip_focus_event = true};
                console.log("only_one_selected_pk:", only_one_selected_pk)
// ---  highlight clicked row
                t_HighlightSelectedTblRowByPk(tblBody_select, only_one_selected_pk)
// ---  put value in input box, put employee_pk in mod_dict, set focus to select_abscatselect_abscat
// ---  put value of only_one_selected_pk in mod_dict and update selected_employee_pk
                if(tblName === "employee"){
                    selected_employee_pk = ModDict_SetEmployeeDict(only_one_selected_pk);
    // ---  put code_value in el_input_employee
                    el_MAB_input_employee.value = mod_dict.employee.code;
    // ---  put employee_code in header
                    const header_text = (mod_dict.employee.code) ? loc.Absence + " " + loc.of + " " + mod_dict.employee.code : loc.Absence;
                    document.getElementById("id_MAB_hdr_absence").innerText = header_text
// ---  enable el_shift, set focus to el_shift
                    el_MAB_input_abscat.readOnly = false;
                    set_focus_on_el_with_timeout(el_MAB_input_abscat, 50)

                } else {
                    selected_order_pk = ModDict_SetAbscatDict(only_one_selected_pk);
                    el_MAB_input_abscat.value = mod_dict.order.code;
                    set_focus_on_el_with_timeout(el_MAB_btn_save, 50)
                }
                MAB_BtnSaveEnable(selected_employee_pk && selected_order_pk) // true = is_enable
            }  //  if (!!selected_pk) {
        }
    }  // MAB_InputElementKeyup

//=========  MAB_SelectRowClicked  ================ PR2020-05-15
    function MAB_SelectRowClicked(tblRow, tblName) {
        //console.log( "===== MAB_SelectRowClicked ========= ", tblName);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            const selected_pk = get_attr_from_el_str(tblRow, "data-pk");

            mod_dict.skip_focus_event = true;
// ---  put value in input box, put employee_pk in mod_dict, set focus to select_abscatselect_abscat
            if (tblName === "employee") {

    // ---  put value of data-pk in mod_dict and update selected_employee_pk
                selected_employee_pk = ModDict_SetEmployeeDict(selected_pk);
     // ---  put code_value in el_input_employee
                el_MAB_input_employee.value = mod_dict.employee.code
    // ---  put employee_code in header
                const header_text = (mod_dict.employee.code) ? loc.Absence + " " + loc.of + " " + mod_dict.employee.code : loc.Absence;
                document.getElementById("id_MAB_hdr_absence").innerText = header_text


// --- fill select table abscat
                MAB_FillSelectTable("order");

    // ---  enable el_shift, set focus to el_shift
                el_MAB_input_abscat.readOnly = false;
                MAB_BtnSaveEnable(true) // true = is_enable
                set_focus_on_el_with_timeout(el_MAB_input_abscat, 50)

            } else {

    // ---  put value of data-pk in mod_dict and update selected_employee_pk
                const selected_order_pk = ModDict_SetAbscatDict(selected_pk);

    // ---  put code_value in el_input_employee
                el_MAB_input_abscat.value = mod_dict.order.code
    // ---  enable el_shift, set focus to el_shift
                el_MAB_input_abscat.readOnly = false;
                MAB_BtnSaveEnable(true) // true = is_enable
                set_focus_on_el_with_timeout(el_MAB_btn_save, 50)

            }
        }  // if(!!tblRow) {
    }  // MAB_SelectRowClicked

//=========  MAB_GotFocus  ================ PR2020-05-17
    function MAB_GotFocus (tblName, el_input) {
        console.log(" =====  MAB_GotFocus  ===== ", tblName)
        console.log("skip focus: ", mod_dict.skip_focus_event)
        if(mod_dict.skip_focus_event){
            mod_dict.skip_focus_event = false;
        } else {
            if (tblName === "employee") {
                el_MAB_input_employee.value = null;
                el_MAB_input_abscat.value = null
                // reset select table when input order got focus
                MAB_FillSelectTable(tblName);
            } else if (tblName === "order") {
                el_MAB_input_abscat.value = null
                MAB_FillSelectTable(tblName);
            }
        }
    }  // MAB_GotFocus

//========= ModDict_SetEmployeeDict  ============= PR2020-05-17
    function ModDict_SetEmployeeDict(data_pk, row_index){
        //console.log( "=== ModDict_SetEmployeeDict ===");
        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", data_pk)
        const employee_pk = get_dict_value(employee_dict, ["id", "pk"])

        mod_dict.employee = {
            pk: employee_pk,
            ppk: get_dict_value(employee_dict, ["id", "ppk"]),
            code: get_dict_value(employee_dict, ["code", "value"]),
            namelast: get_dict_value(employee_dict, ["namelast", "value"]),
            namefirst: get_dict_value(employee_dict, ["namefirst", "value"]),
            identifier: get_dict_value(employee_dict, ["identifier", "value"]),
            payrollcode: get_dict_value(employee_dict, ["payrollcode", "value"]),
            email: get_dict_value(employee_dict, ["email", "value"]),
            telephone: get_dict_value(employee_dict, ["telephone", "value"]),

            datefirst: get_dict_value(employee_dict, ["datefirst", "value"]),
            datelast: get_dict_value(employee_dict, ["datelast", "value"]),

            workhoursperday:  get_dict_value(employee_dict, ["workhoursperday", "value"]),
            workhours: get_dict_value(employee_dict, ["workhours", "value"]),
            workdays: get_dict_value(employee_dict, ["workdays", "value"]),
            leavedays: get_dict_value(employee_dict, ["leavedays", "value"]),

            rowindex: row_index
        }
        return employee_pk
    }  // ModDict_SetEmployeeDict

//========= ModDict_SetAbscatDict  ============= PR2020-05-17
    function ModDict_SetAbscatDict(data_pk){
        //console.log( "=== ModDict_SetAbscatDict ===", data_pk);
        const abscat_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "order", data_pk)
        const order_pk = get_dict_value(abscat_dict, ["id", "pk"])
        mod_dict.order = { pk: order_pk,
            ppk: get_dict_value(abscat_dict, ["id", "ppk"]),
            code: get_dict_value(abscat_dict, ["code", "value"])
        }
        return order_pk
    }  // ModDict_SetAbscatDict

//========= ModDict_SetTeammemberDict  ============= PR2020-05-17
    function ModDict_SetTeammemberDict(data_pk, row_index){
        //console.log( "=== ModDict_SetTeammemberDict ===");
        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", data_pk)
        const teammember_pk = get_dict_value(teammember_dict, ["id", "pk"])
        const teammember_ppk = get_dict_value(teammember_dict, ["id", "ppk"])
        const teammember_datefirst = get_dict_value(teammember_dict, ["datefirst", "value"])
        const teammember_datelast = get_dict_value(teammember_dict, ["datelast", "value"])
        if(teammember_pk) {
            mod_dict.teammember = { pk: teammember_pk, ppk: teammember_ppk, rowindex: row_index }
        } else {
            mod_dict.teammember = {temp_pk: data_pk}
        }

        if(teammember_datefirst){mod_dict.teammember.datefirst = teammember_datefirst }
        if(teammember_datelast){mod_dict.teammember.datelast = teammember_datelast }

        return teammember_pk
    }  // ModDict_SetTeammemberDict

//========= MAB_SetSchemeDict  ============= PR2020-05-17
    function MAB_SetSchemeDict(teammember_pk){
        //( "=== MAB_SetSchemeDict ===");
        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk)
        const scheme_pk = get_dict_value(teammember_dict, ["scheme", "pk"])
        mod_dict.scheme = {
            pk: scheme_pk,
            code: get_dict_value(teammember_dict, ["scheme", "code"]),
            datefirst: get_dict_value(teammember_dict, ["scheme", "datefirst"]),
            datelast: get_dict_value(teammember_dict, ["scheme", "datelast"])
        }
        return scheme_pk
    }  // MAB_SetSchemeDict

//========= MAB_SetOrderDict  ============= PR2020-05-17
    function MAB_SetOrderDict(teammember_pk){
        //console.log( "=== MAB_SetOrderDict ===");
        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk)
        const order_pk = get_dict_value(teammember_dict, ["order", "pk"])
        mod_dict.order = {
            pk: order_pk,
            ppk: get_dict_value(teammember_dict, ["order", "ppk"]),
            code: get_dict_value(teammember_dict, ["order", "code"]),
            display: get_dict_value(teammember_dict, ["order", "display"]),
            datefirst: get_dict_value(teammember_dict, ["order", "datefirst"]),
            datelast: get_dict_value(teammember_dict, ["order", "datelast"])
        }
        return order_pk
    }  // MAB_SetOrderDict

//========= MAB_SetShiftDict  ============= PR2020-05-17
    function MAB_SetShiftDict(teammember_pk){
        //console.log( "=== MAB_SetShiftDict ===");
        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk)
        const shift_pk = get_dict_value(teammember_dict, ["shift", "pk"])
        mod_dict.shift = {
            pk: shift_pk,
            code: get_dict_value(teammember_dict, ["shift", "code"]),
            offsetstart: get_dict_value(teammember_dict, ["shift", "offsetstart"]),
            offsetend: get_dict_value(teammember_dict, ["shift", "offsetend"]),
            breakduration: get_dict_value(teammember_dict, ["shift", "breakduration"], 0),
            timeduration: get_dict_value(teammember_dict, ["shift", "timeduration"], 0)
        }
        return shift_pk
    }  // MAB_SetShiftDict

//========= MAB_DateFirstLastChanged  ============= PR2020-02-19
    function MAB_DateFirstLastChanged(el_input){
        console.log( "=== MAB_DateFirstLastChanged ===");

        const fldName = get_attr_from_el(el_input, "data-field")
        console.log( "fldName ", fldName);
        console.log( "el_input ", el_input);
        if(el_input.type === "date") {
            mod_dict.scheme[fldName] = el_input.value
        }

        // in absence mode and 'one day only; is selected: make datelast equal to datefirst, make readOnly
        mod_dict.scheme.oneday = el_MAB_oneday.checked
        console.log( "mod_dict.scheme ", mod_dict.scheme);
        if(mod_dict.scheme.oneday) {el_MAB_datelast.value = el_MAB_datefirst.value}
        el_MAB_datelast.readOnly = mod_dict.scheme.oneday
        const employee_datefirst = get_dict_value(mod_dict.employee, ["datefirst", "value"])
        const employee_datelast = get_dict_value(mod_dict.employee, ["datelast", "value"])
        cal_SetDatefirstlastMinMax(el_MAB_datefirst, el_MAB_datelast, mod_dict.scheme.oneday,
                    employee_datefirst, employee_datelast)
        //MAB_UpdateDatefirstlastInputboxes();

    }  // MAB_DateFirstLastChanged

//=========  MAB_BtnSaveEnable  ================ PR2020-05-15
    function MAB_BtnSaveEnable(){
        //console.log( " --- MAB_BtnSaveEnable --- ");
// --- enable save button
        const btn_save_enabled = (mod_dict.employee.pk && mod_dict.order.pk)
        el_MAB_btn_save.disabled = !btn_save_enabled;
    }  // MAB_BtnSaveEnable

//=========  MAB_UpdateDatefirstlastInputboxes  ================ PR2020-05-17
    function MAB_UpdateDatefirstlastInputboxes(){
        //console.log( " --- MAB_UpdateDatefirstlastInputboxes --- ");
        // absence datefirst / datelast are stored in scheme.datefirst / datelast
        const employee_datefirst = get_dict_value(mod_dict, ["employee", "datefirst"]);
        const employee_datelast = get_dict_value(mod_dict, ["employee", "datelast"]);

        el_MAB_datefirst.value = mod_dict.scheme.datefirst;
        el_MAB_datelast.value = mod_dict.scheme.datelast;
        const oneday_only = false;
        cal_SetDatefirstlastMinMax(el_MAB_datefirst, el_MAB_datelast, oneday_only, employee_datefirst, employee_datelast);

        el_MAB_datelast.readOnly = el_MAB_oneday.checked;
    }  // MAB_UpdateDatefirstlastInputboxes

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
                const team_code = (!!employee_code) ? employee_code : get_teamcode_with_sequence(team_map, scheme_pk, loc.Team)
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
                MSO_MSE_CalcMinMaxOffset(shift_dict, is_absence);
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
            FillOptionsAbscat(el_modshift_absence, abscat_map, loc.Select_abscat, loc.No_absence_categories)
            // put value of abscat (=order_pk) in select abscat element
            el_modshift_absence.value = (!!order_pk) ? order_pk : 0;

    // ---  put datefirst datelast in input boxes
            console.log("scheme_datefirst: ", scheme_datefirst, typeof scheme_datefirst)
            console.log("scheme_datelast: ", scheme_datelast, typeof scheme_datelast)
            el_modshift_datefirst.value = scheme_datefirst;
            el_modshift_datelast.value = scheme_datelast;
            const oneday_only = false;
            cal_SetDatefirstlastMinMax(el_modshift_datefirst, el_modshift_datelast, oneday_only, employee_datefirst, employee_datelast);
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
            ModConfirm_FirstSelectEmployee(hdr_text, msg01_txt);
        };  // if (!!employee_pk)
    };  // MSE_Open

// --- ModConfirm_FirstSelectEmployee----------------------------------
    function ModConfirm_FirstSelectEmployee(hdr_text, msg01_txt, msg02_txt, msg03_txt){
    // ---  show modal confirm with message 'First select employee'
            document.getElementById("id_confirm_header").innerText = (hdr_text) ? hdr_text : null
            document.getElementById("id_confirm_msg01").innerText =  (msg01_txt) ? msg01_txt : null
            document.getElementById("id_confirm_msg02").innerText = (msg02_txt) ? msg02_txt : null
            document.getElementById("id_confirm_msg03").innerText = (msg03_txt) ? msg03_txt : null

            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_btn_cancel.classList.add(cls_hide)
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            setTimeout(function() {el_btn_save.focus()}, 50);

             $("#id_mod_confirm").modal({backdrop: true});
    }


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
            const workhours =  get_dict_value(mod_dict, ["employee", "workhours", "value"], 0);
            time_duration = workhours / 5
        } else{
            offset_start =  60 * mod_dict.calendar.rowindex;
        }
        console.log("mod_dict.calendar.rowindex: ", mod_dict.calendar.rowindex)
        console.log("offset_start: ", offset_start)
        mod_dict.shift.offsetstart = offset_start
        mod_dict.shift.offsetend = null
        mod_dict.shift.timeduration = time_duration
        MSO_MSE_CalcMinMaxOffset(mod_dict.shift, is_absence);
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
        console.log( "mod_dict: ", mod_dict);

        mod_dict.shift[fldName] = new_offset;
        mod_dict.shift.update = true;

        //console.log( "---new ", offset_start , offset_end, break_duration, time_duration);
        if (fldName === "timeduration") {
            if(!!new_offset){
                mod_dict.shift.offsetstart = null;
                mod_dict.shift.offsetend = null;
                mod_dict.shift.breakduration = 0;
            };
        } else  {
            if (mod_dict.shift.offsetstart != null && mod_dict.shift.offsetend != null) {
                const break_duration = (!!mod_dict.shift.breakduration) ? mod_dict.shift.breakduration : 0;
                mod_dict.shift.timeduration = mod_dict.shift.offsetend - mod_dict.shift.offsetstart - break_duration;
            } else {
                mod_dict.shift.timeduration = 0
            }
        }

        console.log( "mod_dict.shift.timeduration: ", mod_dict.shift.timeduration);
// check if a shift with these times already exist in this scheme
        const lookup_shift = MSE_lookup_same_shift(mod_dict.shift.offsetstart,
                                                    mod_dict.shift.offsetend,
                                                    mod_dict.shift.breakduration,
                                                    mod_dict.shift.timeduration);
        const lookup_shift_pk = lookup_shift.pk
        const current_shift_pk = mod_dict.shift.pk
        const shift_has_changed = (lookup_shift_pk !== current_shift_pk)
        console.log( "current_shift_pk: ", current_shift_pk);
        console.log( "lookup_shift.pk: ", lookup_shift.pk);
        console.log( "shift_has_changed: ", shift_has_changed);

        // if same shift found: put info from lookup_shift in mod_dict
        if(!!lookup_shift_pk){
            // same shift found: put info in mod_dict
           //>>>  mod_dict.shift.pk = lookup_shift.pk;
            // mod_dict.shift.ppk stays the same
            mod_dict.shift.code = lookup_shift.code;
            mod_dict.shift.offsetstart = lookup_shift.offsetstart;
            mod_dict.shift.offsetend = lookup_shift.offsetend;
            mod_dict.shift.breakduration = lookup_shift.breakduration;
            mod_dict.shift.timeduration = lookup_shift.timeduration;
        } else{
            // no same shift found: put info as new shift in mod_dict
            id_new += 1;
            //>>> mod_dict.shift.pk = "new" + id_new.toString()
            // mod_dict.shift.ppk stays the same
            mod_dict.shift.code = create_shift_code(loc,
                                                    mod_dict.shift.offsetstart,
                                                    mod_dict.shift.offsetend,
                                                    mod_dict.shift.timeduration,
                                                    mod_dict.shift.code);
        }

        const is_absence = (get_dict_value(mod_dict, ["shiftoption"]) === "isabsence");
        MSO_MSE_CalcMinMaxOffset(mod_dict.shift, is_absence)
        // if is_absence: also change shift_pk in schemeitems (is only oneschemeitem: cycle = 1
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
        //display_offset_time (offset, timeformat, user_lang, skip_prefix_suffix, blank_when_zero)
        el_offsetstart.innerText = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, mod_dict.shift.offsetstart, false, false)
        el_offsetend.innerText = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, mod_dict.shift.offsetend, false, false)
        el_breakduration.innerText = display_duration (mod_dict.shift.breakduration, user_lang)
        el_timeduration.innerText =  display_duration (mod_dict.shift.timeduration, user_lang)
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
            el_modshift_datelast.value = null;
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
        //console.log( " --- MSE_BtnSaveDeleteEnable --- ");
        //console.log( "mod_dict", mod_dict);

// --- enable save button
        const teammember_pk = get_dict_value(mod_dict, ["teammember", "pk"]);
        const team_pk = el_modshift_absence.value;
        const employee_pk = get_dict_value(mod_dict, ["employee", "pk"]);
        const is_absence = (mod_dict.shiftoption  === "isabsence");

        let order_pk;
        if(is_absence) {
            order_pk = el_modshift_absence.value;
        } else {
            order_pk = get_dict_value(mod_dict, ["order", "pk"]);
        }
        const btn_save_enabled = (!!employee_pk && !!order_pk)
        const btn_delete_visible = (is_absence && btn_save_enabled)
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

        // was: let new_filter = el_filter_select.value;
        let new_filter = document.getElementById("id_SBR_thead_select").value;
        console.log( "new_filter ", new_filter);

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
            FilterSelectRows(SBR_tblBody_select, filter_select)

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

            FilterSelectRows(SBR_tblBody_select, filter_select);
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

        FilterSelectRows(SBR_tblBody_select, filter_select);
    }  // HandleSelectFilterButtonInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_employee_pk = 0;
        selected_teammember_pk = 0;

        FilterTableRows(tblBody_datatable);

        let filterRow = tblHead_datatable.rows[1];
        if(!!filterRow){
            for (let j = 0, el, len = filterRow.cells.length ; j < len; j++) {
                if(filterRow.cells[j]){
                    el = filterRow.cells[j].children[0];
                    if(!!el){el.value = null}
        }}};

        //--- reset filter of select table
        // was: el_filter_select.value = null
        document.getElementById("id_SBR_thead_select").value = null

        // reset icon of filter select table
        // debug: dont use el.firstChild, it also returns text and comment nodes, can give error
        let el_sel_inactive = document.getElementById("id_filter_select_btn")
        let el_sel_inactive_cell = el_sel_inactive.children[0];
        if(!!el_sel_inactive_cell){
            el_sel_inactive_cell.setAttribute("src", imgsrc_inactive_lightgrey);
        }
        FilterSelectRows(SBR_tblBody_select, filter_select)
        UpdateHeaderText();

        // remove employee name from addnew row in absence table

// --- put name of employee in addneww row NOT in employee table
        if(selected_btn !== "employee"){
            const lastRow = tblFoot_datatable.rows[0];
            if(!!lastRow){
                lastRow.removeAttribute("data-employee_pk")
                if(lastRow.cells[0]){
                    const el_input = lastRow.cells[0].children[0];
                    if(!!el_input){ el_input.innerText = loc.Select_employee + "..."}
        } } }

    }  // function ResetFilterRows

//========= FilterSelectRows  ==================================== PR2019-11-23
    function FilterSelectRows(tblBody, filter_str) {
        console.log( "===== FilterSelectRows  ========= ");
        console.log( "filter_str", filter_str);
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


//========= get_rowindex_by_code_datefirst  ================= PR2020-05-18
    function get_rowindex_by_code_datefirst(tblName, search_code, search_datefirst) {
        console.log(" ===== get_rowindex_by_code_datefirst =====", tblName);
        let search_rowindex = -1;
// --- loop through rows of tblBody_datatable
        if(search_code){
            const search_code_lc = search_code.toLowerCase()
            for (let i = 0, tblRow; i < tblBody_datatable.rows.length; i++) {
                tblRow = tblBody_datatable.rows[i];
                if(tblName === "teammember"){
        //console.log("tblRow.id", tblRow.id);
                    const tm_dict = get_mapdict_from_datamap_by_id(teammember_map, tblRow.id)
                    const employee_code = get_dict_value(tm_dict, ["employee", "code"])
                    const datefirst = get_dict_value(tm_dict, ["employee", "datefirst"])
        //console.log("employee_code", employee_code);
        //console.log("datefirst", datefirst);
                    if(employee_code) {
                        const employee_code_lc = employee_code.toLowerCase()
                        if(employee_code_lc < search_code_lc) {
                            // goto next row
                         } else if(employee_code_lc === search_code_lc) {
        // --- search_rowindex = row_index - 1, to put new row above row with higher exceldatetime
                            // TODO search on datfirst
                        } else  if( employee_code_lc > search_code_lc) {
        // --- search_rowindex = row_index - 1, to put new row above row with higher exceldatetime
                            search_rowindex = tblRow.rowIndex - 1;
        //console.log("search_rowindex FOUND ", search_rowindex);
                            break;
                        }
                    }
                }
        }}
        //console.log("search_rowindex", search_rowindex);
        return search_rowindex
    }  // get_rowindex_by_code_datefirst


//========= get_workhours_days_leave_from_input  ================= PR2020-06-06
    function get_workhours_days_leave_from_input(el_input, loc) {
        console.log(" ===== get_workhours_days_leave_from_input =====");
        let arr_newvalue_msgerr = [null, null];
        const fldName = get_attr_from_el(el_input, "data-field");
        if(["workhours", "workdays", "leavedays"].indexOf(fldName) > -1){
            const multiplier = (fldName === "workhours") ? 60 : 1440;


            arr_newvalue_msgerr = get_number_from_input(loc, fldName, el_input.value);
        }
        // arr = [new_value, msg_err]
        return arr_newvalue_msgerr;
    }  // get_workhours_days_leave_from_input

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

        //console.log("ws", ws)

            /* Add worksheet to workbook */
            XLSX.utils.book_append_sheet(wb, ws, ws_name);

            /* Write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ====================================
    function FillExcelRows() {
        console.log("=== FillExcelRows  =====")
        let ws = {}
        let tBody_planning = document.getElementById("id_tbody_planning");

// title row
        let title_value = display_planning_period (selected_planning_period, loc); // UpdateHeaderPeriod();
        ws["A1"] = {v: title_value, t: "s"};
// header row
        const header_rowindex = 3
        let headerrow = [loc.Employee, loc.Customer, loc.Order, loc.Date, loc.Shift,  loc.Start_Endtime, loc.Working_hours]
        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }
        //console.log("------------------ws:", ws)

// --- loop through items of planning_map
        if(!!planning_map){
            const cell_types = ["s", "s", "s", "n", "s", "s", "n"]
            const col_count = 7
            const row_count = planning_map.size;
            const first_row = 4
            const last_row = first_row  + row_count;

                console.log("cell_types: ", cell_types)
// --- loop through data_map
            let row_index = first_row
            for (const [map_id, map_dict] of planning_map.entries()) {
                console.log("map_dict: ", map_dict)
            // Medewerker, Klant, Locatie, Datum, Dienst, Begin - Eindtijd, Werkuren

                let cell_values = [
                    get_dict_value(map_dict, ["employee", "code"], ""),
                    get_dict_value(map_dict, ["customer", "code"], ""),
                    get_dict_value(map_dict, ["order", "code"], ""),
                    get_dict_value(map_dict, ["rosterdate", "exceldate"], ""),
                    get_dict_value(map_dict, ["shift", "code"], ""),
                    get_dict_value(map_dict, ["shift", "display"], ""),
                    get_dict_value(map_dict, ["shift", "timeduration"], 0) / 60,
                    ]
                console.log("cell_values: ", cell_values)
                for (let j = 0; j < col_count; j++) {
                    let cell_index = String.fromCharCode(65 + j) + (row_index).toString()

                    ws[cell_index] = {v: cell_values[j], t: cell_types[j]};
                    if (j === 3){
                        ws[cell_index]["z"] = "d mmmm yyyy"
                    } else if ( j === 6){
                        ws[cell_index]["z"] = "0.00"
                    }
                }
                row_index += 1;

            }  // for (const [map_id, map_dict] of planning_map.entries())
            // this works when col_count <= 26
            ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            ws['!cols'] = [
                    {wch:20},
                    {wch:20},
                    {wch:20},
                    {wch:20},
                    {wch:20},
                    {wch:20},
                    {wch:20}
                ];

        }  // if(!!planning_map){
        return ws;
    }  // FillExcelRows
// ##################################################################################

}); //$(document).ready(function()
