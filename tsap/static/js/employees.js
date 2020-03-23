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

        let mod_upload_dict = {};
        //let spanned_columns = [];
        let quicksave = false

        let selected_planning_period = {};
        let selected_calendar_period = {};

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const tbl_col_count = { "employee": 8, "absence": 6, "shifts": 7, "planning": 7};

        //const thead_text = {
        //    "employee": ["Employee", "First_date", "Last_date", "Hours_per_day", "Days_per_week", "Vacation_days", "Hourly_rate"],
        //    "absence": ["Employee", "Absence_category", "First_date", "Last_date", "Start_time", "End_time", "Hours_per_day"],
        //    "shifts": ["Employee", "Order", "Team", "First_date", "Last_date", "Replacement_employee"],
        //    "planning": ["txt_hour", "txt_day01", "txt_day02", "txt_day03", "txt_day04", "txt_day05", "txt_day06", "txt_day07"],
        //    "pricerate": ["Employee", "Order", "Hourly_rate", ""]}

        const thead_text = {
            employee: ["Employee", "First_date", "Last_date", "Hours_per_week", "Days_per_week", "Vacation_days", "Hourly_rate"],
            absence: ["Employee", "Absence_category", "First_date", "Last_date", "Hours_per_day"],
            shifts: ["Employee", "Order", "Team", "First_date", "Last_date", "Replacement_employee"],
            planning: ["Employee", "Customer", "Order", "Date", "Shift", "Start_Endtime", "Working_hours"]}

        const field_names = {
            employee: ["code", "datefirst", "datelast", "workhours", "workdays", "leavedays",
                        "pricerate", "delete"],
            absence: ["employee", "order", "datefirst", "datelast", "workhoursperday", "delete"],
            shifts: ["employee", "order", "team", "datefirst", "datelast", "replacement", "delete"],
            planning: ["employee", "customer", "order", "rosterdate", "shift", "offsetstart", "timeduration"]}

        const field_tags = {
            employee: ["input", "input", "input", "input", "input", "input", "input", "a"],
            absence: ["input", "select", "input", "input",  "input", "a"],
            shifts: ["input", "input", "input", "input", "input", "input", "a"],
            planning: ["input", "input", "input", "input", "input", "input", "input"]}

        const field_width = {
            employee: ["180", "090", "090", "120", "120", "120", "090", "032"],
            absence: ["180", "220", "120", "120","120", "032"],
            shifts: ["180", "220", "120", "120", "120", "180", "032"],
            planning: ["150", "150", "150", "120", "120", "150", "090"]}

        const field_align = {
            employee: ["left", "right", "right", "right", "right", "right", "right", "left"],
            absence: ["left", "left", "right", "right", "right", "left"],
            shifts: ["left", "left", "left", "left", "left", "left", "left"],
            planning: ["left", "left", "left", "left", "left", "right", "right"]}

        let tblBody_select = document.getElementById("id_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === EVENT HANDLERS ===

// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

// ---  add 'keyup' event handler to filter input
        // element and EventListener added in CreateSelectHeader
        //let el_filter_select = document.getElementById("id_filter_select_input");
        //    el_filter_select.addEventListener("keyup", function() {
        //        HandleSelect_Filter()
        //    });

        //let el_sel_inactive = document.getElementById("id_sel_inactive")
        //    el_sel_inactive.addEventListener("click", function(){HandleSelectButton(el_sel_inactive)});

// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const data_mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSelect(data_mode)}, false )
        }

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, el, len = form_elements.length; i < len; i++) {
            el = form_elements[i]
            const fieldname = get_attr_from_el(el, "data-field")
            if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
            } else {
                el.addEventListener("change", function() {UploadFormChanges(el)}, false);
            }
        }
        document.getElementById("id_form_btn_delete").addEventListener("click", function() {ModConfirmOpen("delete")});
        document.getElementById("id_form_btn_add").addEventListener("click", function() {HandleEmployeeAdd()});

// ---  create EventListener for buttons in calendar
        btns = document.getElementById("id_btns_calendar").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnCalendar(mode)}, false )
        }

// === event handlers for MODAL ===

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_mod_select_employee_body");
        let el_mod_employee_input_employee = document.getElementById("id_MSE_input_employee");
            el_mod_employee_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {ModEmployeeFilterEmployee(el_mod_employee_input_employee, event.key)}, 50)});
        document.getElementById("id_MSE_btn_save").addEventListener("click", function() {ModEmployeeSave("save")}, false )
        document.getElementById("id_MSE_btn_remove_employee").addEventListener("click", function() {ModEmployeeSave("remove")}, false )

// ---  MODAL SHIFT EMPLOYEE ------------------------------------
        let el_modshift_filter_order = document.getElementById("id_modshift_filter_order")
            el_modshift_filter_order.addEventListener("keyup", function(event){
                    setTimeout(function() {MSE_FilterOrder("modshift", el_modshift_filter_order)}, 50)});
        let el_modshift_btn_save = document.getElementById("id_modshift_btn_save");
            el_modshift_btn_save.addEventListener("click", function() {MSE_Save("save")}, false );
        let el_modshift_btn_delete = document.getElementById("id_modshift_btn_delete");
            el_modshift_btn_delete.addEventListener("click", function() {MSE_Save("delete")}, false );
// ---  create EventListener for select buttons in modshift employee
        btns = document.getElementById("id_modshift_selectbtns_container").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            btn.addEventListener("click", function() {MSE_BtnShiftoption_Clicked(btn)}, false )
        }
        let el_modshift_absence = document.getElementById("id_modshift_input_absence");
            el_modshift_absence.addEventListener("change", function() {MSE_AbsenceClicked(el_modshift_absence)}, false );
        let el_modshift_offsetstart = document.getElementById("id_modshift_input_offsetstart")
            el_modshift_offsetstart.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_offsetstart, "modshift")}, false );
        let el_modshift_offsetend = document.getElementById("id_modshift_input_offsetend");
            el_modshift_offsetend.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_offsetend, "modshift")}, false );
        let el_modshift_breakduration = document.getElementById("id_modshift_input_breakduration");
            el_modshift_breakduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_breakduration, "modshift")}, false );
        let el_modshift_timeduration = document.getElementById("id_modshift_input_timeduration");
            el_modshift_timeduration.addEventListener("click", function() {ModShiftTimepickerOpen(el_modshift_timeduration, "modshift")}, false );
        let el_modshift_datefirst = document.getElementById("id_modshift_input_datefirst");
            el_modshift_datefirst.addEventListener("change", function() {MSE_OffsetClicked(el_modshift_datefirst)}, false );
        let el_modshift_datelast = document.getElementById("id_modshift_input_datelast");
            el_modshift_datelast.addEventListener("change", function() {MSE_OffsetClicked(el_modshift_datelast)}, false );
        let el_modshift_onceonly = document.getElementById("id_modshift_onceonly");
            el_modshift_onceonly.addEventListener("change", function() {MSE_OnceOnly()}, false );
        let el_modshift_oneday = document.getElementById("id_modshift_oneday");
            el_modshift_oneday.addEventListener("change", function() {MSE_OneDay()}, false );
// ---  create EventListener for buttons weekdays in modShft
        btns = document.getElementById("id_modshift_weekdays").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            btn.addEventListener("click", function() {MSE_BtnWeekdayClicked(btn)}, false )
        }

// ---  create EventListener for period header in planning
        document.getElementById("id_hdr_period").addEventListener("click", function() {ModPeriodOpen()}, false )

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
        }, false);

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
            employee: {inactive: false},
            order: {isabsence: false, istemplate: false, inactive: false},
            abscat: {inactive: false},
                                //"employee_planning": {value: true},
                                //employee_pricerate: {value: true}

            scheme: {isabsence: false, istemplate: false, inactive: null, issingleshift: null},
            shift: {customer_pk: null},
            team: {customer_pk: null, isabsence: false},
            teammember: {employee_nonull: false, is_template: false},
            schemeitem: {customer_pk: null, isabsence: false}
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
                console.log("response")
                console.log(response)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
// --- create Submenu
                    CreateSubmenu()

// --- create table Headers
                    CreateTblHeaders();
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
                    quicksave = get_dict_value(response, ["quicksave", "value"], false)
                }
                if ("planning_period" in response){
                    selected_planning_period = get_dict_value(response, ["planning_period"]);
                    document.getElementById("id_hdr_period").innerText = display_planning_period (selected_planning_period, loc);
                }
                if ("calendar_period" in response){
                    selected_calendar_period = get_dict_value(response, ["calendar_period"]);
                    selected_calendar_period["calendar_type"] = "employee_calendar";
                }

                HandleBtnSelect(selected_btn);

// --- refresh maps and fill tables
                refresh_maps(response);


// --- after first response: get scheme_map etc (employee_list is only called ahen opening page)
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

        if ("company_dict" in response) {
            company_dict = response["company_dict"];
        }
        if ("employee_list" in response) {
            get_datamap(response["employee_list"], employee_map)

            const tblName = "employee";
            const imgsrc_default = imgsrc_inactive_grey;
            const imgsrc_hover = imgsrc_inactive_black;
            const include_parent_code = null;
            let tblHead = document.getElementById("id_thead_select");
            const filter_ppk_int = null, filter_include_inactive = true, filter_include_absence = false, addall_to_list_txt = null;
            t_Fill_SelectTable(tblBody_select, tblHead, employee_map, tblName, null, include_parent_code,
                HandleSelect_Filter, HandleFilterInactive,
                HandleSelect_Row,  HandleSelectRowButton,
                filter_ppk_int, filter_include_inactive, filter_include_absence, addall_to_list_txt,
                cls_bc_lightlightgrey, cls_bc_yellow,
                imgsrc_default, imgsrc_hover,
                imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey, filter_show_inactive,
                loc.Click_show_inactive_employees)

            FilterSelectRows(tblBody_select, filter_select);

            FillTableRows("employee");
            FilterTableRows(document.getElementById("id_tbody_employee"));
        }

        if ("abscat_list" in response) {
            get_datamap(response["abscat_list"], abscat_map)
        }
        if ("teammember_list" in response) {
            get_datamap(response["teammember_list"], teammember_map)

            FillTableRows("absence");
            FillTableRows("shifts");

            FilterTableRows(document.getElementById("id_tbody_absence"));
            FilterTableRows(document.getElementById("id_tbody_team"));

            CreateAddnewRow("absence")
            CreateAddnewRow("shifts")
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
            const duration_sum = get_datamap(response["employee_planning_list"], planning_map, true) // calc_duration_sum = true
            planning_display_duration_total = display_duration (duration_sum, user_lang)

            console.log("planning_map", planning_map)
            FillTableRows("planning");

            //PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict,
            //    label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang);

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
    function HandleBtnSelect(data_mode) {
        console.log( "==== HandleBtnSelect ========= ");

        selected_btn = data_mode
        if(!selected_btn){selected_btn = "employee"}
        console.log( "selected_btn", selected_btn );

// ---  upload new selected_btn
        const upload_dict = {"page_employee": {"btn": selected_btn}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const data_mode = get_attr_from_el_str(btn, "data-mode");
            if (data_mode === selected_btn){
                btn.classList.add(cls_btn_selected)
            } else {
                btn.classList.remove(cls_btn_selected)
            }
        }

// ---  show only the elements that are used in this tab
        let list = document.getElementsByClassName("tab_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains("tab_" + selected_btn)
            show_hide_element(el, is_show)
        }

// ---  show / hide selected table
        const mode_list = ["employee", "absence", "shifts", "planning", "calendar"];
        for(let i = 0, tbl_mode, len = mode_list.length; i < len; i++){
            tbl_mode = mode_list[i];
            let div_tbl = document.getElementById("id_div_tbl_" + tbl_mode);
            if(!!div_tbl){
                if (tbl_mode === selected_btn){
                    div_tbl.classList.remove(cls_hide);
                } else {
                    div_tbl.classList.add(cls_hide);
                }  // if (tbl_mode === selected_btn)
            }  // if(!!div_tbl){
        }

        if (selected_btn === "form"){
            document.getElementById("id_div_data_form").classList.remove(cls_hide);
        } else {
           //  document.getElementById("id_div_data_form").classList.add(cls_hide);
        };


// ---  highlight row in list table
            let tblBody = tblBody_from_selectedbtn(selected_btn);
            if(!!tblBody){
                FilterTableRows(tblBody)
            }

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

// ---  update selected_employee_pk
            selected_employee_pk = get_dict_value(map_dict, ["id", "pk"], 0);
            selected_teammember_pk = 0;

 // ---  highlight clicked row in select table
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// --- save selected_employeer_pk in Usersettings
        // selected_employeer_pk is not stored in Usersettings

// ---  update header text
            UpdateHeaderText();

// ---  update employee form
            // always update employee form when selected changed
            //if(selected_btn === "form"){
                UpdateForm("HandleSelect_Row");
// ---  enable delete button
                document.getElementById("id_form_btn_delete").disabled = (!selected_employee_pk)

            //} else
            if(selected_btn === "calendar"){
                let datalist_request = {employee_calendar: {
                                            employee_pk: selected_employee_pk},
                                            calendar_period: selected_calendar_period
                                        };
                DatalistDownload(datalist_request);


            } else {
                let tblBody = tblBody_from_selectedbtn(selected_btn);
                if(!!tblBody){
    // ---  highlight row in tblBody
                    let tblRow = HighlightSelectedTblRowByPk(tblBody, selected_employee_pk)
    // ---  scrollIntoView, only in tblBody employee
                    if (selected_btn === "employee" && !!tblRow){
                        tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                    };

                    //const mode_list = ["employee", "absence", "shifts", "planning"]
                    //mode_list.forEach(function (mode, index) {
                    //    FilterTableRows(document.getElementById("id_tbody_" + mode));
                    //});

                    FilterTableRows(tblBody);

// create addnew_row if lastRow is not an addnewRow

// --- put name of employee in addneww row of table team and absence, NOT in employee table
                    const row_count = tblBody.rows.length;
                    if(selected_btn !== "employee" && !!row_count){
                        let lastRow = tblBody.rows[row_count - 1];
                        if(!!lastRow){
                            //console.log("lastRow", lastRow)
                            const pk_str = get_attr_from_el(lastRow, "id");
                            // if pk is not a number it is an 'addnew' row
                            if(!parseInt(pk_str)){
                                let el_input = lastRow.cells[0].children[0];
                                if(!!el_input){
                                    el_input.setAttribute("data-pk", selected_employee_pk)
                                    el_input.setAttribute("data-ppk", get_dict_value(map_dict, ["ppk"]))
                                    const employee_code = get_dict_value(map_dict, ["code", "value"]);
                                    el_input.setAttribute("data-value", employee_code)
                                    el_input.value = employee_code
                                }
                            }
                        }
                    }  // if(!!row_count)
                } //  if(!!tblBody){
            }  // if(selected_btn === "form"){
        }  // if(!!sel_tr_clicked)

// ---  enable add button, also when no employee selected
        document.getElementById("id_form_btn_add").disabled = false;
    }  // HandleSelect_Row

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

        const tblName = get_attr_from_el_str(tr_clicked, "data-table")

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)

// ---  update selected_employee_pk
        // only select employee from select table
        const data_key = (["teammember", "planning"].indexOf( tblName ) > -1) ? "data-employee_pk" : "data-pk";
        const employee_pk_str = get_attr_from_el_str(tr_clicked, data_key);
        //console.log( "employee_pk_str: ", employee_pk_str, typeof employee_pk_str);

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
            // TODO check if this can be replaced by: (like in  customer.js)
            // HighlightSelectRow(tblBodySelect, selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

            DeselectHighlightedTblbody(tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
            const row_id = id_sel_prefix + tblName + selected_employee_pk.toString();
            let sel_tablerow = document.getElementById(row_id);

            if(!!sel_tablerow){
                // yelllow won/t show if you dont first remove background color
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
                mod_upload_dict = {"id": map_dict["id"]};
                mod_upload_dict["id"]["delete"] = true;
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
                format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
        // ---  show modal, only when made inactive
                if(!!new_inactive){
                    mod_upload_dict = {"id": map_dict["id"], "inactive": {"value": new_inactive, "update": true}};
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
        console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, loc.Upload_employees, null, ["mx-2"], "id_submenu_employee_import", url_employee_import);
        AddSubmenuButton(el_div, loc.Add_employee, function() {HandleButtonEmployeeAdd()}, ["mx-2"], "id_submenu_employee_add")
        AddSubmenuButton(el_div, loc.Delete_employee, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_employee_delete")

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

//========= show_menubtn_planning  ====================================
    function show_menubtn_planning(selected_btn) {
        //console.log( "===== show_menubtn_planning  ========= ");
        const show_btn_print_planning = (selected_btn === "planning")
        let el_submenu_employee_planning_preview =  document.getElementById("id_submenu_employee_planning_preview")
        let el_submenu_employee_export_excel =  document.getElementById("id_submenu_employee_export_excel")

        if (show_btn_print_planning){
            el_submenu_employee_planning_preview.classList.remove(cls_hide)
            el_submenu_employee_export_excel.classList.remove(cls_hide)
        } else {
            el_submenu_employee_planning_preview.classList.add(cls_hide)
            el_submenu_employee_export_excel.classList.add(cls_hide)
        }
    };//function show_menubtn_planning

//========= FillTableRows  ====================================
    function FillTableRows(sel_btn, workhoursperday) {
        //console.log( "===== FillTableRows  ========= ");
        //  tblBodies are: employee, absence, shifts, planning (calendar)
        // data_maps are: employee, teammember, planning
        // modes (buttons) are: employee, absence, shifts, calendar, planning, form

// --- reset tblBody
        let tblBody = tblBody_from_selectedbtn(sel_btn);
        tblBody.innerText = null

// --- get  data_map
        const data_map = (sel_btn === "employee") ? employee_map :
                         (["absence", "shifts"].indexOf( sel_btn ) > -1) ? teammember_map :
                         (sel_btn === "planning") ? planning_map :
                         null;
        //console.log( "sel_btn", sel_btn);
        //console.log( "data_map", data_map);

// get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
        const data_key = (sel_btn === "employee") ? "id" :
                         (["teammember", "planning"].indexOf( sel_btn ) > -1) ? "employee" :
                         null;

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
                if (["absence", "shifts"].indexOf( sel_btn ) > -1){
                    //if (!!selected_employee_pk && row_employee_pk === selected_employee_pk){
                        // show only absence rows in 'absence, skip them in 'shift'
                        add_Row = (sel_btn === "absence") ?  is_absence : !is_absence;
                    //}
                } else {
                    add_Row = true;
                }
                if (add_Row){
                    let tblRow = CreateTblRow(tblBody, sel_btn, pk_int, ppk_int, row_employee_pk, workhoursperday)
                    UpdateTblRow(tblRow, item_dict)

// --- highlight selected row
                    if (pk_int === selected_employee_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }  // if (add_Row)

            }  // for (const [map_id, item_dict] of data_map.entries())

// +++ add row 'add new' in employee list and when absence and an employee is selected
            let show_new_row = false;
            if (sel_btn === "employee") {
                show_new_row = true;
            } else if (sel_btn === "shifts" && sel_btn === "absence" && !!selected_employee_pk) {
                show_new_row = true;
            }
            if (show_new_row) {
                CreateAddnewRow(sel_btn)
            };
        }  // if(!!data_map)

    }  // FillTableRows

//=========  CreateTblHeaders  === PR2019-10-25
    function CreateTblHeaders() {
        //console.log("===  CreateTblHeaders == ");

        const mode_list = ["employee", "absence", "shifts", "planning", "calendar"]
        mode_list.forEach(function (mode, index) {
            const tblHead_id = "id_thead_" + mode;
            let tblHead = document.getElementById(tblHead_id);
            tblHead.innerText = null

//--- insert tblRow
            let tblRow = tblHead.insertRow (-1);

//--- insert th's to tblHead
            const column_count = tbl_col_count[mode];
            for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
                let th = document.createElement("th");
// --- add vertical line between columns in planning
                // if (mode === "planning"){th.classList.add("border_right")};

    // --- add div to th, margin not workign with th
                let el_div = document.createElement("div");

    // --- add innerText to el_div
                const data_text = loc[thead_text[mode][j]];
                if(!!data_text) el_div.innerText = data_text;

    // --- add innerText to el_div
                //let data_key = null, hdr_txt = "";
                //if (mode === "planning"){
                //    //hdr_txt = (j === 0) ? "" : loc.weekdays_long[j];
                //} else {
                //    data_key = "data-" + thead_text[mode][j];
                //    hdr_txt = get_attr_from_el(el_data, data_key);
                //}
                //el_div.innerText = hdr_txt

                el_div.setAttribute("overflow-wrap", "break-word");

// --- add left margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")};
    // --- add width to el
                el_div.classList.add("td_width_" + field_width[mode][j])
    // --- add text_align
                el_div.classList.add("text_align_" + field_align[mode][j])

                th.appendChild(el_div)

                tblRow.appendChild(th);

            }  // for (let j = 0; j < column_count; j++)

            CreateTblFilter(tblHead, mode);
        });  //  mode_list.forEach

    };  //function CreateTblHeaders

//=========  CreateTblFilter  ================ PR2019-09-15
    function CreateTblFilter(tblHead, mode) {
        //console.log("=========  function CreateTblFilter =========");

//+++ insert tblRow ino tblHead
        let tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        const column_count = tbl_col_count[mode];
        for (let j = 0, td, el; j < column_count; j++) {

// insert td into tblRow
            // index -1 results in that the new cell will be inserted at the last position.
            td = tblRow.insertCell(-1);

// --- add vertical line between columns in planning
             if (mode === "planning"){td.classList.add("border_right")};

// create element with tag from field_tags
                // replace select tag with input tag
                const field_tag = field_tags[mode][j];
                const filter_tag = (mode === "planning") ? "div" : (field_tag === "select") ? "input" : field_tag
                let el = document.createElement(filter_tag);

// --- add data-field Attribute.
               el.setAttribute("data-field", field_names[mode][j]);
               el.setAttribute("data-mode", mode);

// --- add img delete
                if (mode === "employee" && j === 7) {
                    // skip delete column
                } else {
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");

// --- make text grey, not i ncalendar
                    if (mode !== "planning") {el.classList.add("tsa_color_darkgrey")}

                    el.classList.add("tsa_transparent")
    // --- add other attributes to td
                    el.setAttribute("autocomplete", "off");
                    el.setAttribute("ondragstart", "return false;");
                    el.setAttribute("ondrop", "return false;");
                }  //if (j === 0)

// --- add EventListener to td
            if (mode === "planning"){
                el.setAttribute("overflow-wrap", "break-word");
            } else {
                el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});
            }
// --- add left margin to first column
            if (j === 0 ){el.classList.add("ml-2")};
// --- add width to el
            el.classList.add("td_width_" + field_width[mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[mode][j])

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblFilter

//=========  CreateTblRow  ================ PR2019-08-29
    function CreateTblRow(tblBody, sel_btn, pk_str, ppk_str, employee_pk, workhoursperday) {
        //console.log("=========  CreateTblRow =========", sel_btn);

        const tblName = (sel_btn === "employee") ? "employee" :
                        (["absence", "shifts"].indexOf( sel_btn ) > -1) ? "teammember":
                        (sel_btn === "planning") ? "planning" : null;
        // btn calendar and form have no table
// --- insert tblRow into tblBody
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

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
        const column_count = tbl_col_count[sel_btn];
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// --- create element with tag from field_tags
            let el = document.createElement(field_tags[sel_btn][j]);

// --- add data-field Attribute
            el.setAttribute("data-field", field_names[sel_btn][j]);

// --- add img delete to col_delete
            if ((sel_btn === "employee" && j === (column_count - 1)) || (sel_btn === "absence" && j === (column_count - 1))) {
                if (!is_new_row){
                    CreateBtnDeleteInactive("delete", tblRow, el);
                }
// --- add option to select element
            } else if  (sel_btn === "absence" && tblName === "teammember" && j === 1) {
                if(is_new_row){el.classList.add("tsa_color_darkgrey")}
                else {el.classList.remove("tsa_color_darkgrey")}

                const select_txt = get_attr_from_el(el_data, "data-txt_select_abscat");
                const select_none_txt = get_attr_from_el(el_data, "data-txt_select_abscat_none");

                FillOptionsAbscat(el, abscat_map, select_txt, select_none_txt)

            } else {
// --- add type and input_text to el.
                el.setAttribute("type", "text")
            }
// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
            //el.classList.add("tsa_bc_transparent");
            el.readOnly = true;
// --- add EventListeners
            if (sel_btn === "employee"){
                if ([0,3,4,5,6,7].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadEmployeeChanges(el)}, false)
                    el.classList.add("input_text");
                } else if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                    el.classList.add("input_popup_date");
                }
            } else if (sel_btn === "absence"){
                // 0: employee", 1: order, 2: datefirst, 3: datelast, 4: offsetstart, 5: offsetend, 6: workhoursperday, 7: delete
                // select employee only in addnew row
                if (j === 0){
                    if (is_new_row){
                        el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )
                        el.classList.add("input_text");
                    }
                } else if ( j === 1){
                    el.addEventListener("change", function() {UploadAbscatChanges(el)}, false)
                    el.classList.add("input_text");
                } else if (([2, 3].indexOf( j ) > -1) && (!is_new_row)) {
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                    el.classList.add("input_popup_date");
                } else if (([4].indexOf( j ) > -1) && (!is_new_row)) {
                   // el.addEventListener("click", function() {HandleTimepickerOpen(el, "absence")}, false)
                   // el.classList.add("input_timepicker");
                }
            } else if (sel_btn === "shifts"){
            // 0: employee, 1: order, 2: team, 3: datefirst, 4: datelast, 5: replacement, 6: delete
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

// --- add width to el
            el.classList.add("td_width_" + field_width[sel_btn][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[sel_btn][j])

// --- add placeholder, // only when is_new_row.
            if (j === 0 && is_new_row ){ // only when is_new_row
                if (tblName === "employee"){
                    el.setAttribute("placeholder", loc.Add_employee + "...")
                 }
            }

// --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };  // CreateTblRow

//=========  CreateAddnewRow  ================ PR2019-10-27
    function CreateAddnewRow(sel_btn) {
        //console.log("========= CreateAddnewRow  ========= ", sel_btn);
        // sel_btn are: employee, absence, shifts, calendar, planning, form

// --- function adds row 'add new' in table
        id_new += 1;
        const pk_new = "new" + id_new.toString()

        let tblBody = tblBody_from_selectedbtn(sel_btn);

// --- create addnew row when sel_btn is 'employee'
        if(sel_btn === "employee"){
            // get ppk_int from company_dict ( ppk_int = company_pk)
            const ppk_int = parseInt(get_dict_value (company_dict, ["id", "pk"], 0))

                // needed to put 'Select employee' in field
            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}};
            //dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            // in employee table: don't put name selected employee but pu placeholder
            let newRow = CreateTblRow(tblBody, sel_btn, pk_new, ppk_int, null)
            UpdateTblRow(newRow, dict)

// --- create addnew row when sel_btn is 'absence'
        } else if (["absence"].indexOf(sel_btn) > -1) {
// get info from selected employee, store in dict
            let employee_ppk = 0;
            // Note: the parent of 'teammember' is 'team', not 'employee'!!
            let teammember_ppk = 0
            let dict = {}
            //dict["workhoursperday"] = {value: workhoursperday}
            // NOT TRUE: in  "teammember" and "absence" selected_employee_pk has always value
            //console.log("selected_employee_pk", selected_employee_pk)

            if (!!selected_employee_pk ){
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk);
                employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
                const code_value = get_dict_value(employee_dict, ["code", "value"])
                dict["employee"] = {"pk": selected_employee_pk, "ppk": employee_ppk, "value": code_value, "field": "employee", "locked": true}
            } else {
                // needed to put 'Select employee' in field
                dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            }

// create addnew_row if lastRow is not an addnewRow
            let lastRow_isnot_addnewRow = true;
            let lastRow, pk_str;
            const row_count = tblBody.rows.length;
            if(!!row_count){
                lastRow = tblBody.rows[row_count - 1];
                pk_str = get_attr_from_el(lastRow, "data-pk");
                // if pk is number it is not an 'addnew' row
                lastRow_isnot_addnewRow = (!!parseInt(pk_str));
            }
            //console.log("lastRow_isnot_addnewRow", lastRow_isnot_addnewRow, "lastRow pk_str", pk_str);

// if lastRow is not an addnewRow: create an 'addnew' row
            if (lastRow_isnot_addnewRow){
                dict["id"] = {"pk": pk_new, "ppk": teammember_ppk, "temp_pk": pk_new, "table": "teammember"};
                lastRow = CreateTblRow(tblBody, sel_btn, pk_new, teammember_ppk, selected_employee_pk)
                //dict["id"]["created"] = true;

// if lastRow is an 'addnew' row: update with employee name
            } else {
                dict["id"] = {"pk": pk_str, "ppk": teammember_ppk, "table": "teammember"};
            }
            //console.log(">>>>>>>>>>>>>>>>>>>dict", dict)
            //console.log("lastRow", lastRow)
            UpdateTblRow(lastRow, dict)
        }  // else if (["absence", "shifts"]
    }  // function CreateAddnewRow

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

    function tblBody_from_selectedbtn(sel_btn) {
        // selected_btns are:   employee, absence, shifts, calendar, planning, form
        // tblBodies are:       id_tbody_employee, id_tbody_absence,  id_tbody_shifts, id_tbody_planning,
        // default = id_tbody_employee
        const id_tblBody = (sel_btn === "employee") ? "id_tbody_employee" :
                            (sel_btn === "absence") ? "id_tbody_absence" :
                            (sel_btn === "shifts") ? "id_tbody_shifts" :
                            (sel_btn === "planning") ? "id_tbody_planning" : "id_tbody_employee"
        let tblBody = document.getElementById(id_tblBody);
        //console.log("tblBody", tblBody);
        return tblBody;
    } //tblBody_from_selectedbtn


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2019-10-06
    function UpdateFromResponse(update_dict) {
        //console.log(" --- UpdateFromResponse  ---");
        //console.log("update_dict", update_dict);

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

        //console.log("is_created", is_created);
        ///console.log("inactive_changed", inactive_changed);

        UpdateForm("UpdateFromResponse", update_dict)

//--- lookup table row of updated item
        // created row has id 'teammemnber_new1', existing has id 'teammemnber_379'
        // 'is_created' is false when creating failed, use instead: (!is_created && !map_id)
        const row_id_str = ((is_created) || (!is_created && !map_id)) ? temp_pk_str : map_id;
        //console.log("row_id_str", row_id_str);
        let tblRow = document.getElementById(row_id_str);
        //console.log("tblRow", tblRow);

// ++++ deleted ++++
    //--- reset selected_employee when deleted
        if(is_deleted){
            selected_employee_pk = 0;
            selected_teammember_pk = 0;
    //--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};
// ++++ created ++++

        } else {
//--- update Table Row
            UpdateTblRow(tblRow, update_dict)
// add new empty row if tblRow is_created
            if (is_created){
// ---  scrollIntoView, only in tblBody employee
                if (selected_btn === "employee"){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                };
                if (["absence", "shifts"].indexOf( selected_btn ) > -1){
                    CreateAddnewRow(selected_btn)
                }
            }  // if (is_created)
        }  // if(is_deleted)


//--- update or delete Select Row, before remove_err_del_cre_updated__from_itemdict
        // TODO not when updating teammember pricerate ??
        let selectRow;
        if(is_created){
        //console.log("tblBody_select", tblBody_select);
        //console.log("update_dict", update_dict);
            const row_index = GetNewSelectRowIndex(tblBody_select, 0, update_dict, user_lang);
        //console.log("row_index", row_index);

            const title_inactive_btn = loc.TXT_Cick_show_inactive_customers;
            const imgsrc_default = imgsrc_inactive_grey, imgsrc_hover = imgsrc_inactive_black;
            const has_sel_btn_delete = false;
            let row_count = {count: 0};  // NIU
            const filter_ppk_int = null, filter_include_inactive = true, filter_include_absence = true;
            selectRow = t_CreateSelectRow(has_sel_btn_delete, tblBody_select, tblName, row_index, update_dict, selected_employee_pk,
                                HandleSelect_Row, HandleSelectRowButton,
                                filter_ppk_int, filter_include_inactive, filter_include_absence, row_count,
                                cls_bc_lightlightgrey, cls_bc_yellow_light,
                                imgsrc_default, imgsrc_hover,
                                imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey,
                                loc.Click_show_inactive_employees)

        //console.log("Created SelectRow", selectRow);
            HighlightSelectRow(tblBody_select, selectRow, cls_bc_yellow, cls_bc_lightlightgrey);
        } else {
    //--- get existing  selectRow
            const rowid_str = id_sel_prefix + map_id
            selectRow = document.getElementById(rowid_str);
        };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
        UpdateSelectRow(selectRow, update_dict, false, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)

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
                t_Filter_TableRows(tblBody_from_selectedbtn(selected_btn),
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
                employee_ppk = get_dict_value(employee_dict, ["ppk"], 0)};
            if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)
                } else {tblRow.removeAttribute("data-employee_pk")};
            if(!!employee_ppk){tblRow.setAttribute("data-employee_ppk", employee_ppk)
                } else {tblRow.removeAttribute("data-employee_ppk")};

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
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);

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
        const fieldname = get_attr_from_el(el_input, "data-field");

    // --- reset fields when item_dict is empty
        if (isEmpty(item_dict)){
            if (fieldname === "inactive") {
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
            if (!(fieldname in item_dict)){
                if (tblName === "planning" && fieldname === "offsetstart"){
                    // the odd way: put shift.display in field 'offsetstart'
                    el_input.value = get_dict_value(item_dict, ["shift", "display"])

                } else if (tblName === "planning" && fieldname === "timeduration"){
                    const time_duration = get_dict_value(item_dict, ["shift", "timeduration"], 0)
                    el_input.value = display_offset_time (time_duration, timeformat, user_lang, false, true)

                } else {
                    el_input.value = null
                    el_input.removeAttribute("data-value");
                    el_input.removeAttribute("data-pk");
                    el_input.removeAttribute("data-ppk");
                }

            } else {
                const field_dict = get_dict_value (item_dict, [fieldname]);
                const value = get_dict_value (field_dict, ["value"]);
                const updated = (!!get_dict_value (field_dict, ["updated"]));
                const msg_offset = (selected_btn === "form") ? [-260, 210] : [240, 210];

                // Disable element when locked
                const locked = (!!get_dict_value (field_dict, ["locked"]));
                el_input.disabled = locked

                if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

                if (tblName === "planning"){
                    if (fieldname === "employee"){
                        el_input.value = get_dict_value(field_dict, ["code"])
                    } else if (fieldname === "customer"){
                        el_input.value = get_dict_value(field_dict, ["code"])
                    } else if (fieldname === "order"){
                        el_input.value = get_dict_value(field_dict, ["code"])
                    } else if (fieldname === "rosterdate"){
                        el_input.value = get_dict_value(field_dict, ["display"])
                    } else if (fieldname === "shift"){
                        el_input.value = field_dict["code"]
                    }
                    // 'offsetstart' not in itemdict, therefore put code above at 'if (!(fieldname in item_dict))'
                    // 'timeduration' not in itemdict, therefore put code above at 'if (!(fieldname in item_dict))'
                } else {

                    if (["code", "name", "namelast", "namefirst", "identifier"].indexOf( fieldname ) > -1){
                       const key_str = "value";
                       format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (["customer", "shift"].indexOf( fieldname ) > -1){
                       const key_str = "code";
                       format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (fieldname === "order"){
                        const key_str = "code";
                        if(is_absence){
                            format_select_element (el_input, key_str, field_dict)
                        } else {
                            format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)
                        }

                    } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                        const hide_weekday = true, hide_year = false;
                        format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year)

                    } else if (fieldname === "rosterdate"){

                        const hide_weekday = (tblName === "planning") ? false : true;
                        const hide_year = (tblName === "planning") ?  true : false;
                        format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                            user_lang, comp_timezone, hide_weekday, hide_year)
                    } else if (["offsetstart", "offsetend", "timestart", "timeend"].indexOf( fieldname ) > -1){
                        const title_overlap = null
                        format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)
                    } else if (fieldname ===  "team"){
                        const key_str = "code";
                        format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)
                    } else if (["employee", "replacement"].indexOf( fieldname ) > -1){
                        // fieldname "employee") is used in mode absence and shift, teammember table

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
                        //el_input.setAttribute("data-field", fieldname);
            // --- add placeholder if no employee selected , not in table teammember
                        if (!employee_pk && fieldname === "employee" && tblName !== "teammember"){
                            el_input.setAttribute("placeholder", loc.Select_employee + "...")
                        } else {
                            el_input.removeAttribute("placeholder")
                        }

                    } else if (tblName === "teammember" && fieldname === "breakduration"){
                        const key_str = "value";
                        format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (fieldname === "timeduration"){
                        const key_str = "value";
                        format_text_element (el_input, key_str, el_msg, field_dict, false, msg_offset)

                    } else if (["workhours", "workdays", "leavedays"].indexOf( fieldname ) > -1){
                        let quotient = null;
                        if(!!Number(value)){
                            const divisor = (fieldname === "workhours") ? 60 : 1440;
                            quotient = value / divisor
                        }
                        el_input.value = quotient
                        el_input.setAttribute("data-value", quotient);

                    } else if (fieldname === "inactive") {
                       if(isEmpty(field_dict)){field_dict = {value: false}}
                    // format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive, title_inactive, title_active)
                       format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)


                    } else if (fieldname === "timeduration"){

                    } else {
                        el_input.value = value
                        if(!!value){
                            el_input.setAttribute("data-value", value);
                        } else {
                            el_input.removeAttribute("data-value");
                        }
                    };


                }  //  if (tblName === "planning"

            }  // if (fieldname in item_dict)
        } // if (isEmpty(item_dict))
    }  // function UpdateField

//=========  UpdateAddnewRow  ================ PR2019-10-27
    function UpdateAddnewRow(tblName) {
        //console.log("========= UpdateAddnewRow  ========= ", mode);
        // modes are: employee, absence, team, planning, form

        if(tblName === "employee"){
            // get ppk_int from company_dict ( ppk_int = company_pk)
            const ppk_int = parseInt(get_dict_value (company_dict, ["id", "pk"], 0))

            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}};
            // in  "teammember" and "absence" selected_employee_pk has always value
            let tblBody = tblBody_from_selectedbtn("employee");
            let newRow = CreateTblRow(tblBody, mode, pk_new, ppk_int, selected_employee_pk)
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
                // needed to put 'Selecte employee' in field
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
                mod_upload_dict = {"id": map_dict["id"]};
                if (tblName === "teammember" && !isEmpty(map_dict["employee"])){
                    mod_upload_dict["employee"] = map_dict["employee"]
                };

                if (mode === "delete"){
                    mod_upload_dict["id"]["delete"] = true;
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
                    format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            // ---  show modal, only when made inactive
                    if(!!new_inactive){
                        mod_upload_dict["inactive"] = {"value": new_inactive, "update": true};
                        ModConfirmOpen("inactive", tblRow);
                        return false;
                    }
                }
                const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload
                UploadChanges(upload_dict, url_str);
            }  // if (!isEmpty(map_dict))
        }  //   if(!!tblRow)
    }  // UploadDeleteInactive

//========= UploadFormChanges  ============= PR2019-10-05
    function UploadFormChanges(el_input) {
        console.log( " ==== UploadFormChanges ====");
        let id_dict = {}, upload_dict = {}, is_not_valid = false;
        if(!!el_input){
            if(!selected_employee_pk){
                // get new temp_pk
                id_new = id_new + 1
                const pk_new = "new" + id_new.toString()
                id_dict = {temp_pk: pk_new, "create": true, "table": "employee"}
            } else {
                // get id from existing record
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk);
                id_dict = get_dict_value(map_dict, ["id"])
            }  // if(!selected_employee_pk)

            //console.log( "id_dict", id_dict);
    // create upload_dict
            let upload_dict = {"id": id_dict};
    // create field_dict
            const fieldname = get_attr_from_el(el_input,"data-field")
            const old_value = get_attr_from_el(el_input, "data-value");
            let value = null, err_msg = null;
            if (["workhours", "workdays", "leavedays"].indexOf( fieldname ) > -1){
                const multiplier = (fieldname === "workhours") ? 60 : 1440;
                const min_value = 0;
                const max_value = (fieldname === "workhours") ? 168 * 60 :
                      (fieldname === "workdays") ? 7 * 1440 :
                      (fieldname === "leavedays") ? 365 * 1440 : 0;
                const arr = get_number_from_input(el_input.value, multiplier, min_value, max_value, loc);
                value = arr[0];
                err_msg = arr[1];
            } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                // uses HandlePopupDateOpen ;
            } else {
                value = el_input.value;
            }

    // UploadChanges
            if(!!err_msg) {
                let field_dict = {value: old_value, error: err_msg};
                format_text_element (el_input, "value", el_msg, field_dict, false, [-240, 200])
            } else {
                upload_dict[fieldname] = {value: value, update: true};
                UploadChanges(upload_dict, url_employee_upload);
            }
        } // if(!!el_input){
    }  // UploadFormChanges

//========= UploadAbscatChanges  ============= PR2020-01-11
    function UploadAbscatChanges(el_input) {
        console.log(" --- UploadAbscatChanges  --------------");
        // abscat pk = order_pk, abdscat ppk = customer_pk

        // format of  upload_dict: {
        //   'id': {'create': True, 'temp_pk': 'teammember_new2', 'table': 'teammember', 'isabsence': True},
        //   'employee': {'pk': 2556, 'code': 'Levinson, Daniela', 'workhoursperday': 480},
        //    'order': {'pk': 1265, 'value': 'Vakantie', 'ppk': 610, 'is_absence': True, 'update': True}}

        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){
// ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            id_dict["isabsence"] = true;
// ---  create upload_dict
            let upload_dict = {id: id_dict};
// ---  get is_create from id_dict
            const is_create = get_dict_value(id_dict, ["create"], false)
            if(is_create){el_input.classList.remove("tsa_color_darkgrey")}
// add employee - only when it is a new record
            if(is_create) {
                let el_employee = tr_changed.cells[0].children[0];
                const employee_pk = get_attr_from_el_int(el_employee, "data-pk")
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
                const employee_code = get_dict_value(employee_dict, ["code", "value"])
                upload_dict["employee"] = {"pk": employee_pk, "code": employee_code};
            }
// --- add absence
            // Field abscat contains pk of abscat order
            upload_dict["order"] = {pk: Number(el_input.value), table: "order", isabsence: true, update: true};

            //set default value to workhours
            //if(fldName === "team" && is_create){
           //     // convert to hours, because input is in hours
            //    // TODO add popup hours window
            //    const hours = workhoursperday / 60
            //    upload_dict["workhoursperday"] = {"value": hours, "update": true }
           // }

    console.log("----------------- upload_dict: ", upload_dict);

            UploadChanges(upload_dict, url_teammember_upload);

        }  //  if (!! tr_changed)

    }  // UploadAbscatChanges

//========= UploadTeammemberChanges  ============= PR2019-03-03
    function UploadTeammemberChanges(el_input) {
        console.log("--- UploadTeammemberChanges  --------------");
            console.log("el_input: ", el_input);

        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){
    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            console.log("id_dict: ", id_dict);

    // ---  when absence: is_absence = true
            const is_absence = (selected_btn === "absence");
            if(is_absence){id_dict["isabsence"] = true};

            if (!isEmpty(id_dict)){
                let upload_dict = {}, field_dict = {};
                const tblName = get_dict_value(id_dict, ["table"])
                const is_create = get_dict_value(id_dict, ["create"])
                if(is_create){el_input.classList.remove("tsa_color_darkgrey")}

    // ---  get fieldname from 'el_input.data-field'
                const fldName = get_attr_from_el(el_input, "data-field");
                const is_delete = (fldName === "delete");
                console.log("is_create: ", is_create, "fldName: ", fldName,  "is_delete: ", is_delete);

    // if delete: add 'delete' to id_dict and make tblRow red
                if(is_delete){
                    id_dict["delete"] = true
                    tr_changed.classList.add(cls_error);
                }

    // add id_dict to upload_dict
                upload_dict["id"] = id_dict;

    // add employee
                let el_employee = tr_changed.cells[0].children[0];
                const employee_pk = get_attr_from_el_int(el_employee, "data-pk")
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
                const employee_code = get_dict_value(employee_dict, ["code", "value"])
                let workhoursperday = get_dict_value(employee_dict, ["workhoursperday", "value"])
                if(!workhoursperday){workhoursperday = 0}
                upload_dict["employee"] = {"pk": employee_pk, "code": employee_code, "workhoursperday": workhoursperday};

    // --- add absence, skip when is_delete
                // moved to update UploadAbscatChanges

                if(!is_delete){
                    if (fldName === "replacement"){
                        let value = el_input.value;
                        field_dict = {update: true}
                        if(!value){field_dict["value"] = value};
                        upload_dict[fldName] = field_dict;

                    } else if (["workhoursperday", "workdays", "leavedays",].indexOf( fldName ) > -1){
                        let value = el_input.value;
                        if(!value){value = 0}
                        field_dict["value"] = value;
                        field_dict["update"] = true;
                        upload_dict[fldName] = field_dict;
                    }
                } // if(!is_delete)

                console.log("upload_dict: ", upload_dict);
                UploadChanges(upload_dict, url_teammember_upload);
        console.log("----------------- upload_dict: ", upload_dict);

            }  // if (!isEmpty(id_dict))
        }  //  if (!! tr_changed)
    } // UploadTeammemberChanges(el_input)

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
        //console.log("tp_dict", tp_dict);

        const mode = get_dict_value_by_key(tp_dict, "mod")
        //console.log("mode", mode);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};
        //console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            // if mode = 'shifts', dont upload changes but put them in modal shifts
            if (mode ==="modshift") {
        // return value from ModTimepicker. Don't upload but put new value in ModShift
                MSE_TimepickerResponse(tp_dict);
            } else {

                upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};
                //console.log("upload_dict", upload_dict);

                const tblName = "emplhour";
                const map_id = get_map_id(tblName, get_subdict_value_by_key(tp_dict, "id", "pk").toString());
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

             }  //    if (mode ==="shifts")
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
                        const imgsrc_default = imgsrc_inactive_grey;
                        const imgsrc_hover = imgsrc_inactive_black;
                        const include_parent_code = null;
                        let tblHead = document.getElementById("id_thead_select");
                        const filter_ppk_int = null, filter_include_inactive = true, filter_include_absence = false, addall_to_list_txt = null;
                        t_Fill_SelectTable(tblBody_select, tblHead, employee_map, tblName, null, include_parent_code,
                            HandleSelect_Filter, HandleFilterInactive,
                            HandleSelect_Row,  HandleSelectRowButton,
                            filter_ppk_int, filter_include_inactive, filter_include_absence, addall_to_list_txt,
                            cls_bc_lightlightgrey, cls_bc_yellow,
                            imgsrc_default, imgsrc_hover,
                            imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey, filter_show_inactive,
                            loc.Click_show_inactive_employees)

                        FilterSelectRows(tblBody_select, filter_select);

                        FillTableRows("employee");
                        FilterTableRows(document.getElementById("id_tbody_employee"));
                    };
                    if ("teammember_list" in response) {
                        get_datamap(response["teammember_list"], teammember_map)
                    };
                    if ("teammember_update" in response) {
                        UpdateFromResponse(response["teammember_update"]);
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
// ---  get pk_str and fieldname from el_popup
        const pk_str = el_popup_date.getAttribute("data-pk");
        const fieldname = el_popup_date.getAttribute("data-field");
        const data_value = el_popup_date.getAttribute("data-value");
        const tblName = el_popup_date.getAttribute("data-table");
        const data_mode = el_popup_date.getAttribute("data-mode");

        console.log("tblName: ", tblName);
        console.log("fieldname: ", fieldname);
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

//=========  ModShiftTimepickerOpen  ================ PR2019-10-12
    function ModShiftTimepickerOpen(el_input, calledby) {
        console.log("=== ModShiftTimepickerOpen ===", calledby);
        // calledby = 'absence' or 'modshift'

        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", selected_teammember_pk );
        console.log("mod_upload_dict", mod_upload_dict);

// ---  create st_dict
        const show_btn_delete = true;
        let st_dict = { "interval": interval, "comp_timezone": comp_timezone, "user_lang": user_lang,
                        "show_btn_delete": show_btn_delete, "weekday_list": weekday_list, "month_list": month_list        ,
                    "url_settings_upload": url_settings_upload};
        // only needed in scheme
        st_dict["text_curday"] = loc.Current_day;
        st_dict["text_prevday"] = loc.Previous_day;
        st_dict["text_nextday"] = loc.Next_day;
        st_dict["txt_break"] = loc.Break;
        st_dict["txt_workhours"] = loc.Working_hours;

        st_dict["txt_save"] = loc.Save;
        st_dict["txt_quicksave"] = loc.Quick_save;
        st_dict["txt_quicksave_remove"] = loc.Exit_Quicksave;

        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        if(!!imgsrc_delete){st_dict["imgsrc_delete"] = imgsrc_delete};

// ---  create tp_dict
        let tp_dict = {}
        if (calledby === "modshift"){
            const fldName = get_attr_from_el(el_input, "data-field");
            const id_dict = get_dict_value(teammember_dict, ["id"]);
            const rosterdate = null; // keep rosterdate = null, to show 'current day' insteaa of Dec 1

            let offset = get_dict_value(mod_upload_dict.shift, [fldName])
            const default_min = (fldName === "offsetstart") ? -720 : 0
            const minoffset = get_dict_value(mod_upload_dict.shift, ["min_" + fldName], default_min)
            const default_max = (fldName === "offsetend") ? 2160 : 1440
            const maxoffset = get_dict_value(mod_upload_dict.shift, ["max_" + fldName], default_max)

            // in offsetstart and offsetend value null (no value) is different from 0 (midnight)
            if (fldName === "breakduration" || fldName === "timeduration") {
                if (offset == null) {offset = 0}
            }

            tp_dict = {"id": id_dict, "field": fldName, "mod": calledby, "rosterdate": rosterdate,
                "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
                "isampm": (timeformat === 'AmPm'), "quicksave": quicksave}
            //if(!!weekday){tp_dict['weekday'] = weekday}

        } else {
            if(!isEmpty(teammember_dict)){
                const fldName = get_attr_from_el(el_input, "data-field");

                const offset = get_attr_from_el(el_input, "data-value");
                const minoffset = get_attr_from_el(el_input, "data-minoffset");
                const maxoffset = get_attr_from_el(el_input, "data-maxoffset");

                const id_dict = get_dict_value_by_key(teammember_dict, "id");
                const rosterdate = null;
                // TODO mode must be filled in?
                const mode = null;
                let tp_dict = {"id": id_dict, "mode": mode, "field": fldName, "rosterdate": rosterdate,
                    "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
                    "isampm": (timeformat === 'AmPm'), "quicksave": quicksave}
                if(!!weekday){tp_dict['weekday'] = weekday}

            }  //  if(!isEmpty(teammember_dict))
        }  // if (calledby === "modshift"){

        console.log("tp_dict: ", tp_dict);
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
    let el = document.getElementById("id_modperiod_div_selectcustomer")

        console.log("el", el)
        el.classList.add(cls_hide)
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
        FillSelectOption2020(el_select, order_map, "order",is_template_mode, has_selectall, hide_none,
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
        //console.log( "===== ModPeriodSelectPeriod ========= ", selected_index);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)

    // add period_tag to mod_upload_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_upload_dict["period_tag"] = period_tag;

    // enable date input elements, give focus to start
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
    // set min max of other input field
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
        // TODO selected_customer_pk selected_order_pk
        const selected_customer_pk = 0, selected_order_pk = 0;

// planning_period: {period_tag: "tweek", now: (5) [2020, 2, 8, 9, 55]}
// employee_planning: {customer_pk: 694, order_pk: 1420, add_empty_shifts: true, skip_restshifts: true, orderby_rosterdate_customer: true


// employee_planning: {page: "employee", period_employee: {page: "employee", period_tag: "tweek", now: Array(5)},
// customer_pk: null, order_pk: null, employee_pk: null

// ---  upload new setting
        // settings are saved in function customer_planning, function 'period_get_and_save'
        document.getElementById("id_hdr_period").innerText = loc.Period + "..."

        const period_tag = get_dict_value(mod_upload_dict, ["period_tag"], "tweek");

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

        const period_tag = get_dict_value_by_key(selected_planning_period, "period_tag");
        const datefirst_ISO = get_dict_value_by_key(selected_planning_period, "period_datefirst");
        const datelast_ISO = get_dict_value_by_key(selected_planning_period, "period_datelast");
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
        mod_upload_dict = {};
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
            mod_upload_dict = {mode: mode, id: map_dict.id};

            let msg_01_txt, employee_code;
            const dict_key = (is_tbl_teammember) ? "employee" : "code";
            const dict_subkey = (is_tbl_teammember) ? "code" : "value";
            employee_code =  get_subdict_value_by_key(map_dict, dict_key, dict_subkey, "")
            console.log("employee_code", employee_code)

            if (mode === "inactive"){
                // only tbl employee has inactive button
                msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_inactive");
            } else if (mode === "delete"){
                mod_upload_dict.is_delete = true;
                if (is_tbl_teammember){
                     const absence_code =  get_subdict_value_by_key(map_dict, "order", "code")
                     msg_01_txt = get_attr_from_el(el_data, "data-txt_absence") +
                                  " '" + absence_code  + "' " +
                                  get_attr_from_el(el_data, "data-txt_confirm_msg01_delete");
                } else {
                    msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_employee_delete");
                }
            }
            document.getElementById("id_confirm_header").innerText = employee_code;
            document.getElementById("id_confirm_msg01").innerText = msg_01_txt;

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
                mod_upload_dict["id"]["delete"] = true;
        // ---  show modal
                $("#id_mod_confirm").modal({backdrop: true});

            } else if(mode === "inactive"){
        // only table employee has inactive field
        // get inactive from select table
                let inactive = (get_attr_from_el(tblRow, "data-inactive") === "true");
        // toggle inactive
                inactive = (!inactive);
                mod_upload_dict["inactive"] = {"value": inactive, "update": true}
                if(!!inactive){
        // ---  show modal, set focus on save button
                    $("#id_mod_confirm").modal({backdrop: true});
                } else {
        // ---  dont show confirm box when make active:
                    const url_str = (is_tbl_teammember) ? url_teammember_upload : url_employee_upload;
                    UploadChanges(mod_upload_dict, url_str);
                }
            }  // if(mode === "delete")
        }  // if(!isEmpty(map_dict))
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        //console.log("===  ModConfirmSave  =====") ;
        $("#id_mod_confirm").modal("hide");

        const tblName = get_subdict_value_by_key(mod_upload_dict, "id", "table")
        const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload

        const pk_int = get_subdict_value_by_key(mod_upload_dict, "id", "pk");
        const map_id = get_map_id(tblName, pk_int);
        console.log("===================================is_delete");
        console.log("map_id:", map_id);

        const is_delete = get_dict_value(mod_upload_dict, ["is_delete"], false)
        console.log("mod_upload_dict:", mod_upload_dict);
        console.log("is_delete:", is_delete);
        if (is_delete) {
            let tr_changed = document.getElementById(map_id);
            if(!!tr_changed){
                tr_changed.classList.add(cls_error);
                setTimeout(function (){tr_changed.classList.remove(cls_error)}, 2000);
            }
        }
        UploadChanges(mod_upload_dict, url_str);
    }

// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModEmployeeOpen  ================ PR2019-11-06
    function ModEmployeeOpen(el_input) {
        console.log(" -----  ModEmployeeOpen   ----")

        // mod_upload_dict contains info of selected row and employee.
        let tblRow = get_tablerow_selected(el_input);
        const id_dict = get_iddict_from_element(tblRow);
        const row_id_str = get_attr_from_el_str(tblRow, "id")
        const mode = get_attr_from_el_str(tblRow, "data-mode");
        const is_absence = (mode ==="absence");
        if(is_absence){id_dict["isabsence"] = true};

        const tblName = get_attr_from_el(tblRow, "data-table");
        const fieldname = get_attr_from_el(el_input, "data-field");

        mod_upload_dict = {
            id: id_dict,
            row_id: row_id_str,
            mode: mode,
            field: fieldname,
            table: tblName};

// get current employee_pk from el_input (does not exist in addnew row), get employee and replacement info from employee_map
        const employee_pk = get_attr_from_el_str(el_input, "data-pk");
        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
        const employee_code = get_dict_value(employee_dict, ["code", "value"]);
        if(!isEmpty(employee_dict)){
            mod_upload_dict["employee_or_replacement"] = {
                pk: employee_pk,
                ppk: get_dict_value(employee_dict, ["id", "ppk"]),
                code: employee_code
        }};

// alse get absence category
        if(is_absence){
            let el_abscat = tblRow.cells[1].children[0]
            if(!!el_abscat.value){
                const team_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "team", el_abscat.value)
                if(!isEmpty(team_dict)){
                    mod_upload_dict["abscat"] = {
                        pk: get_dict_value_by_key(team_dict, "pk"),
                        ppk: get_dict_value_by_key(team_dict, "ppk"),
                        code: get_subdict_value_by_key(team_dict, "code", "value"),
                        table: "team"}
        }}};
        console.log("mod_upload_dict", mod_upload_dict)

// ---  put employee name in header
        let el_header = document.getElementById("id_MSE_header_employee")
        let el_div_remove = document.getElementById("id_MSE_div_remove_employee")
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
            const employee_code =get_subdict_value_by_key(employee_dict, "code", "value");
            if(!isEmpty(employee_dict)){
                mod_upload_dict["employee_or_replacement"] = {
                    pk: employee_pk,
                    ppk: get_subdict_value_by_key(employee_dict, "id", "ppk"),
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
// remove selected employee from mod_upload_dict
                mod_upload_dict = {};
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
        let tblbody = document.getElementById("id_MSE_tbody_employee");
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

// if only one employee in filtered list: put value in el_input /  mod_upload_dict
        if (has_selection && !has_multiple ) {

// get employee info from employee_map
            const fieldname = get_dict_value_by_key(mod_upload_dict, "field");
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk)
            const employee_code =get_subdict_value_by_key(employee_dict, "code", "value");
            if(!isEmpty(employee_dict)){
                mod_upload_dict["employee_or_replacement"] = {
                    pk: select_pk,
                    ppk: get_subdict_value_by_key(employee_dict, "id", "ppk"),
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
        console.log("mode: ", mode );
        console.log("mod_upload_dict: ", mod_upload_dict );

        const tblName = get_dict_value_by_key(mod_upload_dict, "table");
        const fieldname = get_dict_value_by_key(mod_upload_dict, "field");
        const row_id_str = get_dict_value_by_key(mod_upload_dict, "row_id");
        const id_dict = get_dict_value_by_key(mod_upload_dict, "id");

        // replacement employee is also stored in  mod_upload_dict.employee
        const dict = get_dict_value_by_key(mod_upload_dict, "employee_or_replacement")

        if (mode === "remove"){
            dict["pk"] = null;
            dict["ppk"] = null;
            dict["code"] = null;
            dict["update"] = true;
        }

        console.log("fieldname: ", fieldname );
        console.log("dict: ", dict );

        let tblRow = document.getElementById(row_id_str)
        if(!!tblRow){
            // --- lookup input field with name: fieldname
                    // PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                    // CSS.escape not supported by IE, Chrome and Safari,
                    // CSS.escape is not necessary, there are no special characters in fieldname
            let el_input = tblRow.querySelector("[data-field=" + fieldname + "]");
            if(!!el_input){
                if(tblName === "teammember"){
                    const pk_int = get_dict_value_by_key(dict, "pk")
                    const ppk_int = get_dict_value_by_key(dict, "ppk")
                    const code_value = get_subdict_value_by_key(dict, "code", "value")

                    el_input.setAttribute("data-pk", pk_int)
                    el_input.setAttribute("data-ppk", ppk_int)
                    el_input.setAttribute("data-value", code_value)

                    el_input.value = code_value

                    let upload_dict = {id: id_dict};
                    upload_dict[fieldname] = dict;
                    UploadChanges(upload_dict, url_teammember_upload);

                } else {

                    // store employee_pk in addnewRow, upload when absence cat is also entered
                    let upload_dict = {"id": mod_upload_dict["id"]};
                    if (mode ==="remove"){
                        // remove current employee from teammemember, is removed when {employee: {update: true} without pk
                        // fieldname ==="employee" or "replacement"
                        upload_dict[fieldname] = {"update": true}
                    } else {
                        const employee_dict = mod_upload_dict["employee"]
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
         //console.log( "=== ModEmployeeFillSelectTableEmployee ");

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = loc.No_employees + ":";

        let tblBody = document.getElementById("id_MSE_tbody_employee");
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
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")

//- skip selected employee
                if (pk_int !== selected_employee_pk){

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

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected_employee_pk){
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // ModEmployeeFillSelectTableEmployee

// +++++++++++++++++ MODAL SHIFT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//=========  MSE_Open  ================ PR2019-10-28
    function MSE_Open(el_input) {
        console.log(" -----  MSE_Open   ----")

        let tr_selected = get_tablerow_selected(el_input)

        mod_upload_dict = {};
        let is_absence = false, is_singleshift = false;
        let employee_pk = null; //, employee_ppk = null, employee_code;
        let order_pk = null, order_ppk = null, order_code = null, customer_code = null;
        let scheme_dict = {}, scheme_pk = null, scheme_datefirst = null, scheme_datelast = null;
        let shift_dict = {}, shift_pk = null;
        let team_dict = {}, team_pk = null;
        let teammember_dict = {};
        let schemeitem_dict = {};

// ---  calendar_datefirst/last is used to create a new employee_calendar_list
        // calendar_period + {datefirst: "2019-12-09", datelast: "2019-12-15", employee_id: 1456}
        const calendar_datefirst = get_dict_value_by_key(selected_calendar_period, "period_datefirst");
        const calendar_datelast = get_dict_value_by_key(selected_calendar_period, "period_datelast");

// ---  get rosterdate and weekday from date_cell
        let tblCell = el_input.parentNode;
        const cell_index = tblCell.cellIndex
        let tblHead = document.getElementById("id_thead_calendar")
        const date_cell = tblHead.rows[1].cells[cell_index].children[0]
        const clicked_rosterdate_iso = get_attr_from_el_str(date_cell, "data-rosterdate")
        let cell_weekday_index = get_attr_from_el_int(date_cell, "data-weekday")
        //console.log("cell_weekday_index: ", cell_weekday_index)
        //console.log("clicked_rosterdate_iso: ", clicked_rosterdate_iso)

// ---  get row_index from tr_selected
        // getting weekday index from  data-weekday goes wrong, because of row span
        // must be corrected with the number of spanned row of this tablerow
        // number of spanned rows are stored in list spanned_rows, index is row-index

        // rowindex is stored in tblRow, rowindex, used to get the hour that is clicked on
        const row_index = get_attr_from_el_int(tr_selected, "data-rowindex")

// ---  count number of spanned columns till this column   [4, 1, 1, 0, 0, 1, 1, 0] (first column contains sum)
        const column_count = 7  // tbl_col_count["planning"];
        const spanned_column_sum = count_spanned_columns (tr_selected, column_count, cell_weekday_index)
        const weekday_index = cell_weekday_index + spanned_column_sum;

// ---  get info from calendar_map
        const map_id = get_attr_from_el(el_input, "data-pk");
        let selected_weekday_list = [];
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(calendar_map, "planning", map_id);
        console.log ("map_dict: ", map_dict);

// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++
// ++++++++++++++++ clicked on cell with item in calendar_map ++++++++++++++++
        // dont use !map_dict, because map_dict = {}, therefore !!map_dict will give true
        const add_new_mode = (isEmpty(map_dict));

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

            MSO_MSE_CalcMinMaxOffset(shift_dict, is_absence);

// --- GET TEAMMEMBER ----------------------------------
            // calendar_map: teammember: {pk: 1103, ppk: 2137, datefirst: null, datelast: null,
            //                              employee_pk: 2612, replacement_pk: null}
            // get teammember info from calendar_map
            let field_dict = get_dict_value(map_dict, ["teammember"]);
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


// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++

        if (!!employee_pk) {
            const crud_mode = (add_new_mode) ? "create" : "update";
            // 'issingleshift' is default in add_new_mode
            let btnshift_option ="issingleshift";
            if(!add_new_mode){
                if (!!is_absence) { btnshift_option = "isabsence"} else
                if (!!is_singleshift) { btnshift_option = "issingleshift"} else
                if (!!order_pk) { btnshift_option = "schemeshift"};
            }

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
                const offset_start = 60 * row_index
                const shift_code = Create_Shift_code(loc, offset_start, null, 0, "");

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

// --- reset mod_upload_dict
            // values of crud_mode: create, update, delete
            // values of btnshift_option: issingleshift, isabsence, schemeshift
            mod_upload_dict = { map_id: map_id,
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
            let el_header_employee = document.getElementById("id_modshift_header")
            let el_header_order = document.getElementById("id_modshift_order")
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
            FillOptionsAbscat(el_modshift_absence, abscat_map, loc.Select_abscat, loc.No_abscat)
            // put value of abscat (=order_pk) in select abscat element
            el_modshift_absence.value = (!!order_pk) ? order_pk : 0;

    // ---  put datefirst datelast in input boxes
            console.log("scheme_datefirst: ", scheme_datefirst, typeof scheme_datefirst)
            console.log("scheme_datelast: ", scheme_datelast, typeof scheme_datelast)
            el_modshift_datefirst.value = scheme_datefirst;
            el_modshift_datelast.value = scheme_datelast;
            MSO_MSE_DateSetMinMax(el_modshift_datefirst, el_modshift_datelast, employee_datefirst, employee_datelast);
            el_modshift_datefirst.readOnly = false;
            el_modshift_datelast.readOnly = false;

    // ---  display offset
            MSE_UpdateOffsetInputboxes()

    // ---  show onceonly only in new shifts, reset checkbox, enable datefirst datelast
            el_modshift_onceonly.checked = false
            let el_onceonly_container = document.getElementById("id_modshift_onceonly_container")
            if(isEmpty(map_dict)){
                el_onceonly_container.classList.remove(cls_hide)
            } else {
                el_onceonly_container.classList.add(cls_hide)
            }

    // ---  reset checkbox, el_modshift_oneday ( is only used in absence)
            el_modshift_oneday.checked = false

    // ---  format weekday buttons
            MSE_MSO_BtnWeekdaysFormat(mod_upload_dict, false);

    // --- set excluded checkboxen upload_dict
            const scheme_excludepublicholiday = get_dict_value(scheme_dict, ["excludepublicholiday"], false);
            const scheme_excludecompanyholiday = get_dict_value(scheme_dict, ["excludecompanyholiday"], false);
            document.getElementById("id_modshift_publicholiday").checked = scheme_excludepublicholiday;
            document.getElementById("id_modshift_companyholiday").checked = scheme_excludecompanyholiday;

    // ---  enable save and delete button
            MSE_BtnSaveDeleteEnable()

    // ---  show modal
            $("#id_modshift").modal({backdrop: true});

            console.log( "mod_upload_dict: ", mod_upload_dict);

        } else {
// ---  show modal confirm with message 'First select employee'
            document.getElementById("id_confirm_header").innerText = loc.Select_employee + "...";
            document.getElementById("id_confirm_msg01").innerText = loc.err_open_calendar_01 + loc.an_employee + loc.err_open_calendar_02;
            document.getElementById("id_confirm_msg02").innerText = null;
            document.getElementById("id_confirm_msg03").innerText = null;

            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_btn_cancel.classList.add(cls_hide)
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            setTimeout(function() {el_btn_save.focus()}, 50);

             $("#id_mod_confirm").modal({backdrop: true});
        };  // if (!!employee_pk)
    };  // MSE_Open

// ##############################################  MSE_Save  ############################################## PR2019-11-23
    function MSE_Save(crud_mode){
        console.log( "===== MSE_Save  ========= ", crud_mode);
        console.log( "mod_upload_dict: ", mod_upload_dict);

        const btnshift_option = mod_upload_dict.shiftoption;
        console.log( "btnshift_option: ", btnshift_option);

        // delete entire scheme whene clicked on delete btn, only in absence
        if (crud_mode === "delete") {
            mod_upload_dict.mode = crud_mode;
        }

// =========== CREATE UPLOAD DICT =====================
        let upload_dict = {id: {mode: mod_upload_dict.mode,
                                shiftoption: btnshift_option},
                            rosterdate: mod_upload_dict["calendar"]["rosterdate"],
                            calendar_datefirst: mod_upload_dict["calendar"]["calendar_datefirst"],
                            calendar_datelast: mod_upload_dict["calendar"]["calendar_datelast"],
                            weekday_index: mod_upload_dict["calendar"]["weekday_index"]
                            };


 // ++++ SAVE ORDER order info in upload_dict  ++++++++++++++++
        // 'id: {update: true}' is added in MSE_AbsenceClicked
        let order_dict = get_dict_value_by_key(mod_upload_dict, "order");
        if(!!order_dict){upload_dict["order"] = order_dict};

        if (btnshift_option === "issingleshift" || btnshift_option === "isabsence"){

// =========== SAVE SCHEME =====================
            // - only in singleshift
            // in add_new_mode scheme_pk has value 'new4', scheme_ppk has value of order_pk. Done in MSE_Open

            // keep structure of scheme in calendar_map:
            // scheme: {pk: 1659, ppk: 1422, code: "Schema 2", cycle: 1, excludepublicholiday: true}
            const scheme_pk = get_dict_value(mod_upload_dict.scheme, ["pk"]);
            const scheme_ppk = get_dict_value(mod_upload_dict.scheme, ["ppk"]);
            const scheme_code = get_dict_value(mod_upload_dict.scheme, ["code"]);
            const scheme_mode =  (crud_mode === "delete") ? "delete" : (!scheme_pk || !Number(scheme_pk)) ? "create" : "none";

            // empty input date value = "", convert to null
            const datefirst = (!!el_modshift_datefirst.value) ? el_modshift_datefirst.value : null;
            const datelast =(!!el_modshift_datelast.value) ? el_modshift_datelast.value : null;

            const excl_ph = document.getElementById("id_modshift_publicholiday").checked;
            const excl_ch = document.getElementById("id_modshift_companyholiday").checked;

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
            const team_pk = get_dict_value(mod_upload_dict.team, ["pk"]);;
            const team_code = get_dict_value(mod_upload_dict.team, ["code"]);
            const team_mode = (!team_pk || !Number(team_pk)) ? "create" : "unchanged";

            upload_dict["team"] = { id: {pk: team_pk,
                                         ppk: scheme_ppk,
                                         table: "team",
                                         mode: team_mode,
                                         shiftoption: btnshift_option},
                                     code: {value: team_code}
                                   };

// =========== SAVE SHIFT =====================
 // put offset info in upload_dict - in schemeitem when singleshift, in teammember when absenceshif
        // prepared for multiple shifts, add one for now
            const shift_pk = get_dict_value(mod_upload_dict.shift, ["pk"]);
            const shift_mode = (!shift_pk || !Number(shift_pk)) ? "create" : "update";
            const shift_offset_start = get_dict_value(mod_upload_dict.shift, ["offsetstart"]);
            const shift_offset_end = get_dict_value(mod_upload_dict.shift, ["offsetend"]);
            const shift_break_duration = get_dict_value(mod_upload_dict.shift, ["breakduration"], 0);
            const shift_time_duration = get_dict_value(mod_upload_dict.shift, ["timeduration"], 0);

            // TODO temporary, code must be updated inmmediately after changing offset
            let shift_code = get_dict_value(mod_upload_dict.shift, ["code"]);
            const new_shift_code = Create_Shift_code(loc, shift_offset_start, shift_offset_end, shift_time_duration, shift_code);
            if(!!new_shift_code && new_shift_code !== shift_code) { shift_code = new_shift_code}

            upload_dict["shift"] = { id: {pk: shift_pk,
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

// ++++ SAVE EMPLOYEE info in upload_dict  ++++++++++++++++
             // put employee info in upload_dict
            const employee_dict = get_dict_value(mod_upload_dict, ["employee"]);
            if(!!employee_dict) {upload_dict["employee"] = employee_dict};

// ++++ SAVE TEAMMEMBER info in upload_dict  ++++++++++++++++
            //  item_dict: {
            // 'id': {'pk': 'new4', 'ppk': 'new8', 'table': 'teammember', 'mode': 'create', 'shiftoption': 'issingleshift'},
            //  'employee': {'pk': 2623, 'ppk': 3, 'table': 'employee', 'code': 'Wu XX Y'}}
            // put teammember info in upload_dict
            const teammember_pk = get_dict_value(mod_upload_dict.teammember, ["pk"]);
            const teammember_ppk = get_dict_value(mod_upload_dict.teammember, ["ppk"]);
            const teammember_mode = (!teammember_pk || !Number(teammember_pk)) ? "create" : "none";
            // prepared for multiple teammembers
            let teammembers_dict = {};
            let teammember_dict = { id: { pk: teammember_pk,
                                            ppk: teammember_ppk,
                                            table: "teammember",
                                            mode: teammember_mode,
                                            shiftoption: btnshift_option
                                         }
                                        };
            if(!!employee_dict) {teammember_dict["employee"] = employee_dict};
            // also put teammember in teammembers_dict
            teammembers_dict[teammember_pk] = teammember_dict
            if (!isEmpty(teammembers_dict)){upload_dict["teammembers_dict"] = teammembers_dict}


// ++++ SAVE SCHEMEITEM info in upload_dict  ++++++++++++++++
// ---  get schemeitems from weekdays - only in singleshift
            mod_upload_dict.id_new = id_new
            let schemeitems_dict = {};
            if (btnshift_option === "issingleshift"){
                schemeitems_dict = MSE_MSO_get_schemeitemsdict_from_btnweekdays(btnshift_option, mod_upload_dict, scheme_pk, team_pk, shift_pk);
            } else if (btnshift_option === "isabsence"){
                schemeitems_dict = MSE_get_schemeitemsdict_absence(btnshift_option, mod_upload_dict, scheme_pk, team_pk, shift_pk);
            }
            id_new = mod_upload_dict.id_new
            if (!isEmpty(schemeitems_dict)){upload_dict["schemeitems_dict"] = schemeitems_dict}
// ========== end of get schemeitems from weekdays =============================================================

        }  // } else if (btnshift_option === "isabsence")

// =========== UploadChanges =====================
        UploadChanges(upload_dict, url_teammember_upload);

    }  // MSE_Save

// ##############################################  END MSE_Save  ############################################## PR2019-11-23

//=========  MSE_BtnShiftoption_Clicked  ================ PR2019-12-06
    function MSE_BtnShiftoption_Clicked(btn) {
        console.log( "===== MSE_BtnShiftoption_Clicked  ========= ");

        // data-mode= 'singleshift', 'schemeshift', absenceshift'
        const data_mode = get_attr_from_el(btn, "data-mode")
        const shift_option = (data_mode === 'absenceshift') ? "isabsence" :
                             (data_mode === 'schemeshift') ? "schemeshift" : "issingleshift";
        const is_absence = (shift_option === "isabsence");

// ---  select btn_singleshift / btn_schemeshift
        // shiftoptions are: issingleshift, schemeshift, isabsence
        mod_upload_dict.shiftoption = shift_option

        // when switched to absence: put full workday in timeduration, remove offsetstart and offsetend
        // when switched to issingleshift: put clicked time as offsetstart, remove timeduration and offsetend
        // also rename shift_code
        let offset_start = null, time_duration = 0
        if (shift_option === "isabsence") {
            // when absence: time_duration = workhoursperweek / 5. and not workhoursperday,
            // because absence days are always enterd 5 days per week.
            const workhours =  get_dict_value(mod_upload_dict, ["employee", "workhours", "value"], 0);
            time_duration = workhours / 5
        } else{
            offset_start =  60 * mod_upload_dict.calendar.rowindex;
        }
        console.log("mod_upload_dict.calendar.rowindex: ", mod_upload_dict.calendar.rowindex)
        console.log("offset_start: ", offset_start)
        mod_upload_dict.shift.offsetstart = offset_start
        mod_upload_dict.shift.offsetend = null
        mod_upload_dict.shift.timeduration = time_duration
        MSO_MSE_CalcMinMaxOffset(mod_upload_dict.shift, is_absence);
        const cur_shift_code = get_dict_value(mod_upload_dict.shift, ["code"], "")
        mod_upload_dict.shift.code = Create_Shift_code(loc, offset_start, null, 0, cur_shift_code)

        MSE_UpdateOffsetInputboxes()

// set clicked date as datefirst, only when switched to absence,
        const date_first_value = (shift_option === "isabsence") ? mod_upload_dict.calendar.rosterdate : null;
        el_modshift_datefirst.value =  date_first_value
        el_modshift_datelast.value = null;
        MSO_MSE_DateSetMinMax(el_modshift_datefirst, el_modshift_datelast);

        MSE_BtnShiftoption_SelectAndDisable();

    }; // MSE_BtnShiftoption_Clicked

//========= MSE_BtnShiftoption_SelectAndDisable  ============= PR2020-01-31
    function MSE_BtnShiftoption_SelectAndDisable() {
        console.log( "=== MSE_BtnShiftoption_SelectAndDisable === ");
        console.log( "mod_upload_dict: ", mod_upload_dict);

        const btnshift_option = mod_upload_dict.shiftoption;
        const add_new_mode = (mod_upload_dict.mode === "create");
        const is_absence = (btnshift_option === "isabsence");
        const is_singleshift = (btnshift_option === "issingleshift");
        const is_schemeshift = (btnshift_option === "schemeshift");
        console.log( "btnshift_option: ", btnshift_option);
        console.log( "is_singleshift: ", is_singleshift);

        let btn_highlighted = {singleshift: false, schemeshift: false, absenceshift: false};

// ---  select btn_singleshift / btn_schemeshift / btn_absenceshift
        // ---  highlight selected button
        if (is_absence){ btn_highlighted.absenceshift = true } else
        if (is_singleshift){ btn_highlighted.singleshift = true} else
        { btn_highlighted.schemeshift = true};

        console.log( "btn_highlighted: ", btn_highlighted);
// ---  loop through select buttons
        let sel_buttons = document.getElementById("id_modshift_selectbtns_container").children;
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

// ---  show / hide select table order, not when absence. Show select table order only in new shift
        if (add_new_mode && !is_absence) {MSE_FillSelectTableOrder()};
        let el_select_order = document.getElementById("id_modshift_select_order");
        show_hide_element(el_select_order, (add_new_mode && !is_absence)) ;// show = add_new_mode

// ---  change label 'Working hours' to 'Hours when absence
        let label_timeduration_txt = (is_absence) ? loc.Hours : loc.Working_hours
        document.getElementById("id_modshift_label_timeduration").innerText = label_timeduration_txt

    }  // MSE_BtnShiftoption_SelectAndDisable

//========= MSE_SelectOrderRowClicked  ============= PR2019-12-06
    function MSE_SelectOrderRowClicked(mode, sel_tr_clicked){
        console.log( "=== MSE_SelectOrderRowClicked ", mode);

        if(!!sel_tr_clicked) {
            const tblName = "order";
            const order_pk = get_attr_from_el_int(sel_tr_clicked, "data-pk");
            const order_ppk = get_attr_from_el_int(sel_tr_clicked, "data-ppk");
            const order_code = get_attr_from_el_str(sel_tr_clicked, "data-code");
            const display_code = get_attr_from_el_str(sel_tr_clicked, "data-display");

            if ( mode ==="modshift"){
                mod_upload_dict.order = {pk: order_pk, table: "order", code: order_code, mode: "update"};
                // also update parent pk of scheme
                mod_upload_dict.scheme.ppk = order_pk;

    // ---  highlight clicked row in select table
                // DeselectHighlightedRows(tr_selected, cls_selected, cls_background)
                DeselectHighlightedRows(sel_tr_clicked, cls_selected, cls_bc_transparent);
                // yelllow won/t show if you dont first remove background color
                sel_tr_clicked.classList.remove(cls_bc_transparent)
                sel_tr_clicked.classList.add(cls_selected)

    // ---  update header text
                if(!display_code){display_code = loc.Select_order}
                //console.log( "display_code", display_code);
                //console.log( "loc.Select_order", loc.Select_order);
                document.getElementById("id_modshift_order").innerText = display_code

    // ---  enable save button
                MSE_BtnSaveDeleteEnable()
            } else if ( mode ==="modperiod"){

            }
            console.log("mod_upload_dict: ", mod_upload_dict)
        }  // if(!!sel_tr_clicked)
       //-------------------------------------------
    }  // MSE_SelectOrderRowClicked

//========= MSE_AbsenceClicked  ============= PR2019-12-06
    function MSE_AbsenceClicked(el_input){
        console.log( "=== MSE_AbsenceClicked ===");
    // ---  get map_dict
        const pk_str = el_input.value
        const order_code = el_input.options[el_input.selectedIndex].text;
    // --- add absence
        // Field abscat contains pk of abscat order
        // TODO decide where to put 'update'
        mod_upload_dict["order"] = {pk: pk_str, table: "order", isabsence: true,
                                code: order_code, mode: "update"};
        // also update parent pk of scheme
        mod_upload_dict.scheme.ppk = pk_str;
    // ---  enable save and delete button
        MSE_BtnSaveDeleteEnable()
    }  // MSE_AbsenceClicked

//========= MSE_OffsetClicked  ============= PR2020-02-19
    function MSE_OffsetClicked(el_input){
        console.log( "=== MSE_OffsetClicked ===");
        // in absence mode and 'one day only; is selected: make datelast equal to datefirst
        if(mod_upload_dict.shiftoption === "isabsence" && el_modshift_oneday.checked){
            el_modshift_datelast.value = el_modshift_datefirst.value
        }
        MSO_MSE_DateSetMinMax(el_modshift_datefirst, el_modshift_datelast)
    }  // MSE_OffsetClicked

//=========  MSE_TimepickerResponse  ================
    function MSE_TimepickerResponse(tp_dict){
        console.log( " === MSE_TimepickerResponse ");
        // put new value from modTimepicker in ModShift PR2019-11-24
        console.log( "tp_dict: ", tp_dict);
        const fldName = get_dict_value_by_key(tp_dict, "field")
        const new_offset = get_dict_value_by_key(tp_dict, "offset")
        console.log( "fldName: ", fldName);
        console.log( "new_offset: ", new_offset);
        console.log( "mod_upload_dict: ", mod_upload_dict);

        mod_upload_dict.shift[fldName] = new_offset;
        mod_upload_dict.shift["update"] = true;

        //console.log( "---new ", offset_start , offset_end, break_duration, time_duration);
        if (fldName === "timeduration") {
            if(!!new_offset){
                mod_upload_dict.shift.offsetstart = null;
                mod_upload_dict.shift.offsetend = null;
                mod_upload_dict.shift.breakduration = 0;
            };
        } else  {
            if (mod_upload_dict.shift.offsetstart != null && mod_upload_dict.shift.offsetend != null) {
                const break_duration = (!!mod_upload_dict.shift.breakduration) ? mod_upload_dict.shift.breakduration : 0;
                mod_upload_dict.shift.timeduration = mod_upload_dict.shift.offsetend - mod_upload_dict.shift.offsetstart - break_duration;
            } else {
                mod_upload_dict.shift.timeduration = 0
            }
        }

        console.log( "mod_upload_dict.shift.timeduration: ", mod_upload_dict.shift.timeduration);
// check if a shift with these times already exist in this scheme
        const lookup_shift = MSE_lookup_same_shift(mod_upload_dict.shift.offsetstart,
                                                    mod_upload_dict.shift.offsetend,
                                                    mod_upload_dict.shift.breakduration,
                                                    mod_upload_dict.shift.timeduration);
        const lookup_shift_pk = lookup_shift.pk
        const current_shift_pk = mod_upload_dict.shift.pk
        const shift_has_changed = (lookup_shift_pk !== current_shift_pk)
        console.log( "current_shift_pk: ", current_shift_pk);
        console.log( "lookup_shift.pk: ", lookup_shift.pk);
        console.log( "shift_has_changed: ", shift_has_changed);

        // if same shift found: put info from lookup_shift in mod_upload_dict
        if(!!lookup_shift_pk){
            // same shift found: put info in mod_upload_dict
           //>>>  mod_upload_dict.shift.pk = lookup_shift.pk;
            // mod_upload_dict.shift.ppk stays the same
            mod_upload_dict.shift.code = lookup_shift.code;
            mod_upload_dict.shift.offsetstart = lookup_shift.offsetstart;
            mod_upload_dict.shift.offsetend = lookup_shift.offsetend;
            mod_upload_dict.shift.breakduration = lookup_shift.breakduration;
            mod_upload_dict.shift.timeduration = lookup_shift.timeduration;
        } else{
            // no same shift found: put info as new shift in mod_upload_dict
            id_new += 1;
            //>>> mod_upload_dict.shift.pk = "new" + id_new.toString()
            // mod_upload_dict.shift.ppk stays the same
            mod_upload_dict.shift.code = Create_Shift_code(loc,
                                                    mod_upload_dict.shift.offsetstart,
                                                    mod_upload_dict.shift.offsetend,
                                                    mod_upload_dict.shift.timeduration,
                                                    mod_upload_dict.shift.code);

        }

        const is_absence = (get_dict_value(mod_upload_dict, ["shiftoption"]) === "isabsence");
        MSO_MSE_CalcMinMaxOffset(mod_upload_dict.shift, is_absence)
        // if is_absence: also change shift_pk in schemeitems (is only oneschemeitem: cycle = 1
        if (is_absence && shift_has_changed ){
        }
        MSE_UpdateOffsetInputboxes()

    } // MSE_TimepickerResponse

//========= MSE_lookup_same_shift  ============= PR2020-02-09
    function MSE_lookup_same_shift(new_offset_start, new_offset_end, new_break_duration, new_time_duration) {
        //console.log( " === MSE_lookup_same_shift ");
        // function checks if a shift with these times already exist in this scheme
        let lookup_shift = {};
        if(!!shift_map.size){
            const current_scheme_pk = get_dict_value(mod_upload_dict, ["scheme", "pk"])
            const current_shift_pk = get_dict_value(mod_upload_dict, ["shift", "pk"])

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

//========= MSE_UpdateOffsetInputboxes  ============= PR2019-12-07
    function MSE_UpdateOffsetInputboxes() {
        //console.log( " >=== MSE_UpdateOffsetInputboxes ");
        //console.log( "mod_upload_dict.shift: ", mod_upload_dict.shift);
        const offset_start = get_dict_value(mod_upload_dict.shift, ["offsetstart"])
        const offset_end =  get_dict_value(mod_upload_dict.shift, ["offsetend"])
        const break_duration = get_dict_value(mod_upload_dict.shift, ["breakduration"], 0)
        const time_duration = get_dict_value(mod_upload_dict.shift, ["timeduration"], 0)
        //console.log(offset_start, offset_end,break_duration, time_duration );

        //display_offset_time (offset, timeformat, user_lang, skip_prefix_suffix, blank_when_zero)
        el_modshift_offsetstart.innerText = display_offset_time (offset_start, timeformat, user_lang, false, false)
        el_modshift_offsetend.innerText = display_offset_time (offset_end, timeformat, user_lang, false, false)
        el_modshift_breakduration.innerText = display_offset_time (break_duration, timeformat, user_lang, false, true)
        el_modshift_timeduration.innerText = display_offset_time (time_duration, timeformat, user_lang, false, true)
    }  // MSE_UpdateOffsetInputboxes

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
            const id_selecttable = (mode === "modshift") ? "id_modshift_tblbody_order" : "id_modperiod_tblbody_order";
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
        const id_selecttable = (mode === "modshift") ? "id_modshift_tblbody_order" : "id_modperiod_tblbody_order";
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
            datefirst_iso = get_dict_value(mod_upload_dict, ["calendar", "calendar_datefirst"]);
            datelast_iso = get_dict_value(mod_upload_dict, ["calendar", "calendar_datelast"]);
        } else {
            datefirst_iso = get_dict_value(mod_upload_dict, ["calendar", "rosterdate"]);
        }

        el_modshift_datefirst.value = datefirst_iso
        el_modshift_datelast.value = datelast_iso
        MSO_MSE_DateSetMinMax(el_modshift_datefirst, el_modshift_datelast);
        el_modshift_datefirst.readOnly = once_only;
        el_modshift_datelast.readOnly = once_only;
        // dont disable weekdays: when once-only, you can still add a shift on every day of the week
        //MSE_MSO_BtnWeekdaysFormat(mod_upload_dict, false);
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
            MSO_MSE_DateSetMinMax(el_modshift_datefirst, el_modshift_datelast);
            el_modshift_datelast.readOnly = false;
        }
        // weekdays not in use in absence
    }; // function MSE_OneDay

//========= MSE_BtnWeekdayClicked  ============= PR2019-11-23
    function MSE_BtnWeekdayClicked(btn) {
        console.log( "=== MSE_BtnWeekdayClicked ");

        const selected_weekdays_list = get_dict_value(mod_upload_dict, ["calendar", "weekday_list"])
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
        //console.log( "mod_upload_dict", mod_upload_dict);

// --- enable save button
        const teammember_pk = get_dict_value(mod_upload_dict, ["teammember", "pk"]);
        const team_pk = el_modshift_absence.value;
        const employee_pk = get_dict_value(mod_upload_dict, ["employee", "pk"]);
        const is_absence = (mod_upload_dict.shiftoption  === "isabsence");

        let order_pk;
        if(is_absence) {
            order_pk = el_modshift_absence.value;
        } else {
            order_pk = get_dict_value(mod_upload_dict, ["order", "pk"]);
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
        //console.log( "===== HandleSelect_Filter  ========= ");

        // skip filter if filter value has not changed, else: update variable filter_select

        // was: let new_filter = el_filter_select.value;
        let new_filter = document.getElementById("id_filter_select_input").value;
        //console.log( "new_filter ", new_filter);

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
            FilterSelectRows(tblBody_select, filter_select)

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
            t_Filter_TableRows(tblBody_from_selectedbtn(selected_btn),
                                tblName,
                                filter_dict,
                                filter_show_inactive,
                                has_ppk_filter,
                                selected_employee_pk);

            FilterSelectRows(tblBody_select, filter_select);
        } //  if (!skip_filter) {

    }; // function HandleFilterName

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        console.log(" --- HandleFilterInactive --- ", selected_btn);
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        const tblName = tblName_from_selectedbtn(selected_btn);
        const has_ppk_filter = (tblName !== "employee");
        let tblBody = tblBody_from_selectedbtn(selected_btn);
        console.log("selected_btn", selected_btn )
        console.log("tblName", tblName )
        console.log("tblBody", tblBody )
        t_Filter_TableRows(tblBody, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected_employee_pk);

        FilterSelectRows(tblBody_select, filter_select);
    }  // function HandleFilterInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
       // console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_employee_pk = 0;
        selected_teammember_pk = 0;

        let tblBody = tblBody_from_selectedbtn(selected_btn);
        if(!!tblBody){
            FilterTableRows(tblBody);
            CreateAddnewRow(selected_btn);
        }

        let tblHead = document.getElementById("id_thead_" + selected_btn)
        if(!!tblHead){
            let filterRow = tblHead.rows[1];
            if(!!filterRow){
                const column_count = tbl_col_count[selected_btn];
                for (let j = 0, el; j < column_count; j++) {
                    el = filterRow.cells[j].children[0]
                    if(!!el){el.value = null}
                }
            }
        }

        //--- reset filter of select table
        // was: el_filter_select.value = null
        document.getElementById("id_filter_select_input").value = null

        // reset icon of filter select table
        // debug: dont use el.firstChild, it also returns text and comment nodes, can give error
        let el_sel_inactive = document.getElementById("id_filter_select_btn")
        let el_sel_inactive_cell = el_sel_inactive.children[0];
        if(!!el_sel_inactive_cell){
            el_sel_inactive_cell.setAttribute("src", imgsrc_inactive_lightgrey);
        }
        FilterSelectRows(tblBody_select, filter_select)
        UpdateHeaderText();
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
        }  // for (let i = 0, len = tblBody_select.rows.length; i < len; i++)
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
