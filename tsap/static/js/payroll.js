// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_hide = "display_hide";
        const cls_visible_hide = "visibility_hide";

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
        const url_payroll_upload = get_attr_from_el(el_data, "data-payroll_upload_url");
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
        const imgsrc_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red");
        const imgsrc_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey");
        const imgsrc_chck01 = get_attr_from_el(el_data, "data-imgsrc_chck01");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");

// ---  id of selected employee
        const id_sel_prefix = "sel_"
        let selected_employee_pk = null;
        let selected_employee_code = null;

        let selected_period = {};
        let selected_paydatecode_pk = null;
        let selected_paydatecode_caption = null;
        let selected_paydateitem_iso = null;
        let selected_paydateitem_caption = null;
        let selected_functioncode_pk = null;
        let selected_functioncode_caption = null;
        let selected_wagefactor_pk = null;
        let selected_wagefactor_caption = null;

        let selected_btn = null;
        let is_quicksave = false
        let is_payroll_detail_mode = false;
        let is_payroll_detail_mod_mode = false;
        let is_period_paydate = false;

        let company_dict = {};
        let employee_map = new Map();
        let customer_map = new Map();
        let order_map = new Map();
        let abscat_map = new Map(); // list of all absence categories

        let functioncode_map = new Map();
        let wagecode_map = new Map();
        let wagefactor_map = new Map();
        let paydatecode_map = new Map();
        let paydateitem_map = new Map();

        let payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'
        let payroll_mapped_columns = {};  // dict of mapped pk > col_index of absence categories in crosstab 'payroll_map'
        let paydatecodes_inuse_list = [];
        let paydateitems_inuse_list = [];
        let employees_inuse_list = [];
        let payroll_period_detail_list = [];

        let payroll_period_detail_rows = [];  // put all values in payroll_period_detail_rows, so it can be exported or sent to pdf
        let payroll_period_agg_rows = [];
        let payroll_period_tabular_rows = [];
        let payroll_header_row = []
        let payroll_total_row = [];

// const for report
        //let planning_display_duration_total = ""; // stores total hours, calculated when creating payroll_map
        let label_list = [], pos_x_list = [], colhdr_list = [];

// locale_dict with translated text
        let loc = {};

        let mod_dict = {};
        let mod_MSO_dict = {};
        let mod_MSE_dict = {};

        let filter_select = "";
        let filter_show_inactive = false;
        let filter_dict = {};
        let filter_mod_employee = "";
        let filter_checked = false; // not a filter, but sets employee selected

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const field_settings = {
            order: { tbl_col_count: 9,
                        //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                        field_caption: ["Absence_category", "Payment", "Saturday_hours", "Sunday_hours", "Public_holiday_hours",  "Identifier", "Priority"],
                        field_names: ["code", "nopay", "nohoursonsaturday", "nohoursonsunday", "nohoursonpublicholiday", "identifier", "sequence", "inactive", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div", "div", "div"],
                        field_width:  ["180", "120", "120", "120", "120", "120", "120", "032", "032"],
                        field_align: ["l", "c",  "c", "c", "c", "l", "r", "c", "c"]},
            payroll_agg: { tbl_col_count: 5,
                        field_caption: ["", "Employee", "Total_hours", "Planned_hours", "Worked_hours"],
                        field_names: ["back", "e_code", "eh_total_sum", "eh_plandur_sum", "duration", "-"],
                        filter_tags: ["back", "text", "duration", "duration", "duration", "-"],
                        field_tags: ["div","div", "div", "div", "div", "div"],
                        field_width: ["016", "150", "090", "090", "090","032"],
                        field_align: ["c", "l", "r", "r","r", "c"]},
            payroll_detail: { tbl_col_count: 7,
                        field_caption: ["<", "Date", "Order", "Total_hours", "Planned_hours", "Worked_hours"],
                        field_names:  ["", "text", "text", "duration", "duration", "duration"],
                        filter_tags: ["back", "text", "text", "duration", "duration", "duration", "-"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["016", "090",  "180", "100", "100", "100", "032"],
                        field_align: ["c", "l", "l","r", "r", "r", "c"]},
            payroll_tabular: { tbl_col_count: 14,
                        field_caption: ["", "Employee", "Date", "Order", "Start_time", "End_time", "Total_hours_2lines", "Planned_hours_2lines", "Worked_hours_2lines", "Absence_2lines", "Wage_factor", "Function", "Payroll_period", ""],
                        field_names: ["roster", "employee_code", "rosterdate", "c_o_code", "offsetstart", "offsetend", "totaldur", "plandur", "timedur", "absdur", "totaldur", "wagefactor", "functioncode", "paydatecode", ""],
                        field_tags: ["div", "input", "input", "input", "input", "input", "input", "input", "input", "input", "input", "input", "input", "div"],
                        filter_tags: ["boolean", "text", "text", "text", "text", "text", "duration", "duration", "duration", "duration", "text", "text", "text", ""],
                        field_width: ["016", "150", "090",  "180", "090", "090", "090", "090", "090", "090", "100", "100", "100", "032"],
                        field_align: ["c", "l", "l", "l", "r", "r", "r", "r", "r", "r", "l", "l", "l", "c"]},
            employee: { tbl_col_count: 4,
                        field_caption: ["", "Employee", "Function", "Payroll_period"],
                        field_names: ["select", "code", "functioncode", "paydatecode"],
                        field_tags: ["div", "div", "div", "div"],
                        field_width: ["032", "180", "120", "180"],
                        field_align: ["c", "l", "l", "l",]},
            paydatecode: { tbl_col_count: 3,
                        field_caption: ["", "Payroll_period"],
                        field_names:  ["select","code", "inactive"],
                        field_tags: ["div", "div", "div"],
                        field_width: ["032", "200", "032"],
                        field_align: ["c", "l", "c"]},

            functioncode: { tbl_col_count: 3,
                        field_caption: ["", "Function"],
                        field_names:  ["select", "code", "inactive"],
                        field_tags: ["div", "div", "div"],
                        field_width: ["032", "200", "032"],
                        field_align: ["c", "l", "c"]},
            wagecode: { tbl_col_count: 5,
                        field_caption: ["", "Wage_code", "Hourly_wage"],
                        field_names:  ["select","code", "wagerate", , "inactive", "delete"],
                        field_width: ["016",  "150", "120", "032","032"],
                        field_align: ["c", "l", "r", "c", "c"]},
            wagefactor: { tbl_col_count: 4,
                        field_caption: ["", "Wage_factor", "Percentage"],
                        field_names:  ["select", "code", "wagerate", "inactive"],
                        field_width: ["016", "120", "090","032"],
                        field_align: ["c", "l", "r", "c"]},
            closingdate: { tbl_col_count: 2,
                        field_caption: ["Closing_date"],
                        field_names:  ["datelast", "delete"],
                        field_tags: ["input", "div" ],
                        field_width: ["200", "032"],
                        field_align: ["l", "c"]}
            }

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");
        const tblFoot_datatable = document.getElementById("id_tblFoot_datatable");

        const tblHead_paydatecode = document.getElementById("id_tblHead_paydatecode");
        const tblBody_paydatecode = document.getElementById("id_tblBody_paydatecode");
        const tblFoot_paydatecode = document.getElementById("id_tblFoot_paydatecode");

        const tblHead_employee = document.getElementById("id_tblHead_employee");
        const tblBody_employee = document.getElementById("id_tblBody_employee");

        let el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") { ResetFilterRows()}
        });

// ---  buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }
// --- buttons add_selected and remove_selected
        const el_btn_add_selected = document.getElementById("id_btn_add_selected");
            el_btn_add_selected.addEventListener("click", function() {HandleBtnAddRemoveSelected("add")}, false );
        const el_btn_remove_selected = document.getElementById("id_btn_remove_selected");
            el_btn_remove_selected.addEventListener("click", function() {HandleBtnAddRemoveSelected("remove")}, false )

// ---  SIDE BAR
// ---  side bar - select period
        let el_sbr_select_period = document.getElementById("id_SBR_select_period");
            el_sbr_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
            add_hover(el_sbr_select_period)
        let el_sbr_select_payrollperiod = document.getElementById("id_sbr_select_payrollperiod");
            el_sbr_select_payrollperiod.addEventListener("click", function() {MSP_Open()}, false );
            add_hover(el_sbr_select_payrollperiod)
        let el_sbr_select_paydate = document.getElementById("id_sbr_select_paydate");
            el_sbr_select_paydate.addEventListener("click", function() {MSP_Open()}, false );
            add_hover(el_sbr_select_paydate)
// ---  side bar - select order
        let el_sidebar_select_order = document.getElementById("id_SBR_select_order");
            el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
            add_hover(el_sidebar_select_order);
// ---  side bar - select employee
        let el_sidebar_select_employee = document.getElementById("id_SBR_select_employee");
            el_sidebar_select_employee.addEventListener("click", function() {MSE_Open()}, false );
            add_hover(el_sidebar_select_employee);
// ---  side bar - select absence
        let el_sidebar_select_absence = document.getElementById("id_SBR_select_absence");
            el_sidebar_select_absence.addEventListener("change", function() {Sidebar_SelectAbsenceShowall("isabsence")}, false );
            add_hover(el_sidebar_select_absence);
// ---  side bar - showall
        let el_sbr_select_showall = document.getElementById("id_SBR_select_showall");
            el_sbr_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceShowall("showall")}, false );
            add_hover(el_sbr_select_showall);

// === EVENT HANDLERS FOR MODALS ===
// ---  MOD PERIOD ------------------------------------
        const el_mod_period_datefirst = document.getElementById("id_mod_period_datefirst");
            el_mod_period_datefirst.addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false );
        const el_mod_period_datelast = document.getElementById("id_mod_period_datelast");
            el_mod_period_datelast.addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false );
        const el_mod_period_oneday = document.getElementById("id_mod_period_oneday");
            el_mod_period_oneday.addEventListener("change", function() {ModPeriodDateChanged("oneday")}, false );
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false );

// ---  MODAL SELECT PERIOD
        let el_MSP_tblbody = document.getElementById("id_MSP_tblbody");
        let el_MSP_input_payrollperiod = document.getElementById("id_MSP_input_payrollperiod")
            el_MSP_input_payrollperiod.addEventListener("focus", function() {MSP_InputOnfocus("payrollperiod")}, false )
            el_MSP_input_payrollperiod.addEventListener("keyup", function(event){
                setTimeout(function() {MSP_InputElementKeyup("payrollperiod", el_MSP_input_payrollperiod)}, 50)});
        let el_MSP_input_paydate = document.getElementById("id_MSP_input_paydate")
            el_MSP_input_paydate.addEventListener("focus", function() {MSP_InputOnfocus("datelast")}, false )
            el_MSP_input_paydate.addEventListener("keyup", function(event){
                setTimeout(function() {MSP_InputElementKeyup("datelast", el_MSP_input_paydate)}, 50)});
        let el_MSP_btn_save = document.getElementById("id_MSP_btn_save")
            el_MSP_btn_save.addEventListener("click", function() {MSP_Save()}, false )

// ---  MOD SELECT ORDER ------------------------------
        let el_MSO_tblbody_customer = document.getElementById("id_MSO_tblbody_customer");
        let el_modorder_tblbody_order = document.getElementById("id_MSO_tblbody_order");
        let el_MSO_input_customer = document.getElementById("id_MSO_input_customer")
            el_MSO_input_customer.addEventListener("keyup", function(event){
                setTimeout(function() {MSO_FilterCustomer()}, 50)});
        let el_MSO_btn_save = document.getElementById("id_MSO_btn_save")
            el_MSO_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MOD SELECT EMPLOYEE ------------------------------
        let el_modemployee_input_employee = document.getElementById("id_MSE_input_employee")
            el_modemployee_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSE_FilterEmployee()}, 50)});
        let el_modemployee_btn_save = document.getElementById("id_ModSelEmp_btn_save")
            el_modemployee_btn_save.addEventListener("click", function() {MSE_Save()}, false )

// ---  MODAL ABSENCE CATEGORY
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("keyup", function(event){
                    setTimeout(function() {MAC_validate_and_disable(el)}, 150)});
        }
        form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("change", function() {MAC_validate_and_disable(el)}, false )
        }
        const el_MAC_btn_save = document.getElementById("id_MAC_btn_save");
            el_MAC_btn_save.addEventListener("click", function() {MAC_Save("save")}, false );
        const el_MAC_btn_delete = document.getElementById("id_MAC_btn_delete");
            el_MAC_btn_delete.addEventListener("click", function() {MAC_Save("delete")}, false )

// ---  MODAL PAYROLL PERIOD
        const input_container = document.getElementById("id_MPP_input_container")
        form_elements = input_container.querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("change", function() {MPP_InputChanged(el)}, false )
        }
        const el_MPP_btn_save = document.getElementById("id_MPP_btn_save");
            el_MPP_btn_save.addEventListener("click", function() {MPP_Save("save")}, false );
        const el_MPP_btn_delete = document.getElementById("id_MPP_btn_delete");
            el_MPP_btn_delete.addEventListener("click", function() {MPP_Save("delete")}, false )

// ---  MODAL FUNCTION CODE
        const el_MFU_input_code = document.getElementById("id_MFU_input_code")
        el_MFU_input_code.addEventListener("keyup", function(event){
                setTimeout(function() {MFU_input_keyup(el_MFU_input_code, event.key)}, 50)});
        const el_MFU_btn_save = document.getElementById("id_MFU_btn_save");
            el_MFU_btn_save.addEventListener("click", function() {MFU_Save("save")}, false );
        const el_MFU_btn_delete = document.getElementById("id_MFU_btn_delete");
            el_MFU_btn_delete.addEventListener("click", function() {MFU_Save("delete")}, false )

// ---  MODAL WAGEFACTOR
        form_elements =  document.getElementById("id_MWF_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("keyup", function(event){
                setTimeout(function() {MWF_input_keyup(el, event.key)}, 50)});
        }
        const el_MWF_btn_save = document.getElementById("id_MWF_btn_save");
            el_MWF_btn_save.addEventListener("click", function() {MWF_Save("save")}, false );
        const el_MWF_btn_delete = document.getElementById("id_MWF_btn_delete");
            el_MWF_btn_delete.addEventListener("click", function() {MWF_Save("delete")}, false )

// ---  MOD CONFIRM ------------------------------------
// ---  save button in ModConfirm
        document.getElementById("id_confirm_btn_save").addEventListener("click", function() {ModConfirmSave()});

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
            let tr_selected = get_tablerow_selected(event.target)
            if(selected_btn === "payrollcrosstab" && is_payroll_detail_mode) {
            console.log( "===== document.addEventListener  ========= ")
            console.log( "event.target ", event.target)
                // PR2020-0807 ddebug. This one lets table go back to agg_list, when clicked outside table,
                 // but also when clicked on submenu.
                 // Removed. Going back still works by clicking '<' btn in header or ESC
                // if(!tr_selected) { ResetFilterRows()};
            } else {
                // remove highlighted row when clicked outside tablerows
                if(!tr_selected) {
                    DeselectHighlightedRows(tr_selected)
                };
                if(event.target.getAttribute("id") !== "id_btn_delete_schemeitem" && !get_tablerow_selected(event.target)) {
                    DeselectHighlightedRows(tr_selected);
                }
            }
        }, false);  // document.addEventListener('click',

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_payroll"));

        const now_arr = get_now_arr();
        let datalist_request = {
            //setting: {page_payroll: {mode: "get"}},
            //quicksave: {mode: "get"},
            company: {value: true},
            locale: {page: "payroll"},
            payroll_period: {get: true, now: now_arr},
            payroll_list: {get: true},
            paydatecode_list: {get: true},
            //order_list: {isabsence: false, istemplate: false, inactive: false},
            customer_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            functioncode_list: {mode: "get"},
            wagecode_list: {get: true},
            wagefactor_list: {get: true},
            functioncode_list: {get: true},
            abscat_list: {inactive: null},
            employee_list: {inactive: false},
            };
        DatalistDownload(datalist_request);

//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, dont_show_loader) {
       //console.log( "=== DatalistDownload ")

// ---  Get today's date and time - for elapsed time
        let startime = new Date().getTime();

// ---  show loader
        if(!dont_show_loader){
            el_loader.classList.remove(cls_visible_hide)
        }

        let param = {download: JSON.stringify (datalist_request)};
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
                    Sidebar_FillOptionsAbsence();
// --- create table Headers
                    label_list = [loc.Company, loc.Employee, loc.Planning + " " + loc.of, loc.Print_date];
                    pos_x_list = [6, 65, 105, 130, 155, 185];
                    colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];
                }
                //if ("setting_dict" in response) {
                    // this must come after locale_dict, where weekday_list is loaded
                //    UpdateSettings(response["setting_dict"])
                //}
                //if ("quicksave" in response) {
                //    is_quicksave = get_dict_value(response, ["quicksave", "value"], false)
                //}

                if ("payroll_period" in response) {
                    selected_period = response["payroll_period"];
                    selected_btn = get_dict_value(selected_period, ["sel_btn"], "payrollperiod")

                    selected_paydatecode_pk = get_dict_value(selected_period, ["sel_paydatecode_pk"]);
                    //selected_paydatecode_caption = get_dict_value(selected_period, ["sel_paydatecode_pk"]);
                    selected_paydateitem_iso =  get_dict_value(selected_period, ["sel_paydate_iso"]);
                    //selected_paydateitem_caption =  get_dict_value(selected_period, ["sel_paydatecode_pk"]);
                    is_period_paydate =(!!selected_paydatecode_pk)
                    //console.log("selected_period", selected_period);

                    //selected_employee_pk = get_dict_value(selected_period, ["employee_pk"], 0)
                    //selected_customer_pk = get_dict_value(selected_period, ["customer_pk"], 0)
                    //selected_order_pk = get_dict_value(selected_period, ["order_pk"], 0)

                    el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_period)

                    //call_DisplayCustomerOrderEmployee = true;

                    const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
                    const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
                    el_sidebar_select_absence.value = sel_value_absence;
                    Sidebar_DisplayCustomerOrder();
                    Sidebar_DisplayEmployee()
                }
// --- refresh maps and fill tables
                refresh_maps(response);

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
       //console.log( "=== refresh_maps ")
        let fill_datatable = false;
        if ("company_dict" in response) {
            company_dict = response["company_dict"];
        }
        if ("employee_list" in response) {
            refresh_datamap(response["employee_list"], employee_map)
        }
        if ("abscat_list" in response) {
            refresh_datamap(response["abscat_list"], abscat_map);
            fill_datatable = true;
        }
        if ("customer_list" in response) {refresh_datamap(response["customer_list"], customer_map)}
        if ("order_list" in response) {refresh_datamap(response["order_list"], order_map)}

        if ("functioncode_list" in response) {
            refresh_datamap(response["functioncode_list"], functioncode_map)
            fill_datatable = true;
        };

        if ("wagecode_list" in response) {
            refresh_datamap(response["wagecode_list"], wagecode_map);
            fill_datatable = true;
        }
        if ("wagefactor_list" in response) {
            refresh_datamap(response["wagefactor_list"], wagefactor_map);
            fill_datatable = true;
        }
        if ("paydatecode_list" in response) {
            refresh_datamap(response["paydatecode_list"], paydatecode_map)
        }
        if ("paydateitem_list" in response) {
            refresh_datamap(response["paydateitem_list"], paydateitem_map, "paydateitem") // tblName not in paydateitem_list
        }

//---------------------

        t_CreateTblModSelectPeriod(loc, ModPeriodSelectPeriod);

        if("paydatecodes_inuse_list" in response){
            paydatecodes_inuse_list = response.paydatecodes_inuse_list};
        if("paydateitems_inuse_list" in response){
            paydateitems_inuse_list = response.paydateitems_inuse_list};
        if("employees_inuse_list" in response){
            employees_inuse_list = response.employees_inuse_list};

//----------------------------
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        if ("payroll_abscat_list" in response){
            payroll_abscat_list = response["payroll_abscat_list"]
            create_payroll_mapped_columns();
        };
        if ("payroll_period_agg_list" in response){
            payroll_period_agg_rows = CreateHTML_period_agg_list(response["payroll_period_agg_list"]);
            fill_datatable = true;
        }
        if ("payroll_period_detail_list" in response) {
            payroll_period_detail_list = response.payroll_period_detail_list;

            create_payroll_agg_list(payroll_period_detail_list);

            payroll_period_detail_rows = CreateHTML_period_detail_list(payroll_period_detail_list);
            payroll_period_tabular_rows = CreateHTML_period_tabular_list(payroll_period_detail_list);

            fill_datatable = true;
        }
        if(fill_datatable) {
            HandleBtnSelect(selected_btn, true)  // true = skip_upload
        }
    }  // refresh_maps


//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25 PR2020-06-12
    function HandleBtnSelect(data_btn, skip_upload) {
        console.log( "===== HandleBtnSelect ========= ");
        selected_btn = data_btn
        if(!selected_btn){selected_btn = "payrollcrosstab"}
        //console.log( "selected_btn", selected_btn);

// ---  upload new selected_btn, not after loading page (then skip_upload = true)
        if(!skip_upload){
            //const upload_dict = {page_payroll: {sel_btn: selected_btn}};
            const upload_dict = {payroll_period: {sel_btn: selected_btn}};
            UploadSettings (upload_dict, url_settings_upload);
        };
// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_button = get_attr_from_el_str(btn, "data-btn");
            add_or_remove_class(btn, cls_btn_selected, data_button === selected_btn);
        }

// ---  in submenu: change caption and disable submenu items
        const el_submenu_addnew = document.getElementById("id_submenu_addnew");
        const el_submenu_delete = document.getElementById("id_submenu_delete");
        el_submenu_addnew.innerText = (data_btn === "paydatecode") ? loc.Add_payrollperiod :
                                      (data_btn === "functioncode") ? loc.Add_function :
                                      (data_btn === "wagecode") ? loc.Add_wagecode :
                                      (data_btn === "wagefactor") ? loc.Add_wagefactor :
                                      (data_btn === "order") ? loc.Add_abscat : null;
        el_submenu_delete.innerText = (data_btn === "paydatecode") ? loc.Delete_payrollperiod :
                                      (data_btn === "functioncode") ? loc.Delete_function :
                                      (data_btn === "wagecode") ? loc.Delete_wagecode :
                                      (data_btn === "wagefactor") ? loc.Delete_wagefactor :
                                      (data_btn === "order") ? loc.Delete_abscat : null;
        // only show submenu item 'upload' when sel_btn =  paydatecode
        add_or_remove_class(document.getElementById("id_submenu_upload"), cls_hide, (data_btn !== "paydatecode"))
// ---  show only the elements that are used in this tab
        show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn);

// ---  reset selected variables
        selected_paydatecode_pk = null;
        selected_paydatecode_caption = null;
        selected_paydateitem_iso = null;
        selected_paydateitem_caption = null;
        selected_functioncode_pk = null;
        selected_functioncode_caption = null;
        selected_wagefactor_pk = null;
        selected_wagefactor_caption = null;

// ---  fill datatable
         if(selected_btn === "payrollcrosstab"){
            CreateCrosstabHeader();
            FillCrosstabRows();
        } else if(selected_btn === "payrolltabular"){
            CreateTabularHeader();
            FillTabularRows();
        } else if(["paydatecode","functioncode"].indexOf(selected_btn) > -1){
            FillFunctioncodeOrPaydatecodeRows(selected_btn);
        } else if(selected_btn === "wagefactor"){
            FillWagefactorRows(selected_btn);
        } else if(selected_btn === "wagecode"){
            FillWagefactorRows(selected_btn);
        } else if(selected_btn === "order"){
            FillAbscatTableRows( "HandleBtnSelect")
        }

// --- update header text
        UpdateHeaderText();
    }  // HandleBtnSelect

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
            selected_employee_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0));
            selected_employee_code = get_dict_value (map_dict, ["code", "value"], "");
// ---  update header text
            UpdateHeaderText();
        }  // if(tblName === "employee"){
    }  // HandleTableRowClicked

//=========  HandleAggRowClicked  ================ PR2019-06-24
    function HandleAggRowClicked(tr_clicked) {
       //console.log("=== HandleAggRowClicked");
        if(is_payroll_detail_mode){

            const emplhour_pk = get_attr_from_el_int(tr_clicked, "data-pk");
            let upload_dict = {
                id: {table: "emplhour"},
                emplhour_pk: emplhour_pk
            };
            UploadChanges(upload_dict, url_payroll_upload);
            MEP_ResetInputElements();
            // show loader
            document.getElementById("id_MEP_loader").classList.remove(cls_hide)

            is_payroll_detail_mod_mode = true;
            // ---  show modal
            $("#id_mod_emplhour_payroll").modal({backdrop: true});

        } else {
            const employee_pk = (Number(tr_clicked.id)) ? Number(tr_clicked.id) : null;
           //console.log( "employee_pk: ", employee_pk, typeof employee_pk);
            if(employee_pk){
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
                selected_employee_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0));
                selected_employee_code = get_dict_value (map_dict, ["code", "value"]);
                is_payroll_detail_mode = true;
                UpdateHeaderText();
        // --- fill payroll_mapped_columns and create tblHead with filter ansd total row
               CreateCrosstabHeader();
               FillCrosstabRows();
            }
        }
    }  // HandleAggRowClicked

//###########################################################################

// +++++++++++++++++ WAGE FACTOR  +++++++++++++++++++++++++++++++++++++++++++++++++
//========= FillWagefactorRows  =================== PR2020-07-13
    function FillWagefactorRows(tblName) {
       console.log( "===== FillWagefactorRows  === ");

        tblHead_paydatecode.innerText = null;
        tblBody_paydatecode.innerText = null;
        tblFoot_paydatecode.innerText = null;

        el_btn_add_selected.innerText = "--->\n" + loc.Link_wagefactor_to_shifts;
        el_btn_remove_selected.innerText = "<---\n" + loc.Remove_wagefactor_from_shifts;

// --- create tblHead
        CreateTblHeader(tblName);
        CreateTblFoot(tblName);
// get data_key.
        const data_map = (tblName === "wagecode") ?  wagecode_map :  wagefactor_map;
        if(!!data_map){
// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_dict_value(item_dict, ["id", "pk"], 0);
                const ppk_int = get_dict_value(item_dict, ["id", "ppk"], 0);
                const row_index = -1;
                const tblRow = CreateTblRow(tblBody_paydatecode, tblName, pk_int, ppk_int, null, row_index)
                UpdateTblRow(tblRow, item_dict)
            }  // for (const [map_id, item_dict] of data_map.entries())
        }  // if(!!data_map)
        //console.log("FillAbscatTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )

        Filter_TableRows();
    }  // FillWagefactorRows


// +++++++++++++++++ PAYDATECODE  +++++++++++++++++++++++++++++++++++++++++++++++++
//========= FillFunctioncodeOrPaydatecodeRows  ====================================
    function FillFunctioncodeOrPaydatecodeRows(sel_btn) {
        //console.log( "===== FillFunctioncodeOrPaydatecodeRows  === ");

        const text_add = (sel_btn === "paydatecode") ? loc.Link_payrollperiod_to_employees :
                         (sel_btn === "functioncode") ? loc.Add_function_to_employees : null;
        const text_delete = (sel_btn === "paydatecode") ? loc.Remove_payrollperiod_from_employees :
                            (sel_btn === "functioncode") ? loc.Remove_function_from_employees : null;
        el_btn_add_selected.innerText = "--->\n" + text_add;
        el_btn_remove_selected.innerText = "<---\n" + text_delete;


// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();
        // sel_btn = "paydatecode", "functioncode"
        const array = [sel_btn, "employee"];
        array.forEach(function (tblName) {
            const tblBody_id = (tblName === "employee") ? "id_tblBody_employee" : "id_tblBody_paydatecode";
            const tblBody = document.getElementById(tblBody_id);
            tblBody.innerText = null;
            if(["paydatecode","functioncode"].indexOf(tblName) > -1){
                const tblFoot = document.getElementById("id_tblFoot_paydatecode");
                tblFoot.innerText = null;
            }

// --- create tblHead
            CreateTblHeader(tblName);
            if(["paydatecode","functioncode"].indexOf(tblName) > -1) {CreateTblFoot(tblName)}
    // get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
            const data_map = (tblName === "employee") ?  employee_map :
                             (tblName === "paydatecode") ?  paydatecode_map :
                             (tblName === "functioncode") ?  functioncode_map : null
            if(!!data_map){
    // --- loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const pk_int = get_dict_value(item_dict, ["id", "pk"], 0);
                    const ppk_int = get_dict_value(item_dict, ["id", "ppk"], 0);
                    const row_index = -1;
                    const tblRow = CreateTblRow(tblBody, tblName, pk_int, ppk_int, null, row_index)

                    UpdateTblRow(tblRow, item_dict)
                }  // for (const [map_id, item_dict] of data_map.entries())
            }  // if(!!data_map)
            //console.log("FillAbscatTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        } ) //  array.forEach(function (tblName)

        Filter_TableRows();
    }  // FillFunctioncodeOrPaydatecodeRows

// +++++++++++++++++ PAYROLL  +++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillCrosstabRows  ====================================
    function FillCrosstabRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
       console.log( "====== FillCrosstabRows  === ");

// --- reset table, except for header
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        ResetPayrollTotalrow();

// --- loop through payroll_period_detail_rows / payroll_period_agg_rows
        //  payroll_period_detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        const detail_rows = (is_payroll_detail_mode) ? payroll_period_detail_rows : payroll_period_agg_rows;
        if (detail_rows) {
            for (let i = 0, item, tblRow, row_data, filter_row, show_row; item = detail_rows[i]; i++) {
                // filter selected employee when is_payroll_detail_mode
                show_row = (!is_payroll_detail_mode || item[1] === selected_employee_pk)
                if(show_row){
                    filter_row = item[2];
                    row_data = item[3];
                    const col_count = filter_row.length;
                    show_row = t_ShowPayrollRow(filter_row, filter_dict, col_count);
                }
                item[0] = show_row;
                if (show_row){
                    tblRow = tblBody_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        // --- add empoyee_pk as id to tblRow
                    if(item[1]){tblRow.id = item[1] };
        // --- put emplhour_pk in data-pk when is_payroll_detail_mode
                    if (is_payroll_detail_mode) {tblRow.setAttribute("data-pk", item[5]) }
        // --- add EventListener to tblRow.
                    tblRow.addEventListener("click", function() {HandleAggRowClicked(tblRow)}, false);
                    add_hover(tblRow)
                    tblRow.innerHTML += item[4];
        // --- add duration to total_row.
                    AddToPayrollTotalrow(row_data);
                }
            }
        }
        UpdatePayrollTotalrow()
        //console.log("FillCrosstabRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // FillCrosstabRows

//========= AddToPayrollTotalrow  ================= PR2020-06-16
    function AddToPayrollTotalrow(row_data) {
        //console.log( "===== AddToPayrollTotalrow  === ");
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            for (let i = 2, len = row_data.length; i < len; i++) {
                // put employee_code in 3rd column when is_payroll_detail_mode
                if (is_payroll_detail_mode && i === 2){
                    if(!payroll_total_row[i]){payroll_total_row[i] = selected_employee_code};
                } else if ( ([4,5].indexOf(i) > -1) && ( selected_btn === "payrolltabular" ) ) {
                    // skip total on time start -time end fields in payrolltabular
                } else if (row_data[i]) {
                    const value_number = Number(row_data[i])
                    if(value_number){
                        if(!payroll_total_row[i]){
                            payroll_total_row[i] = value_number;
                        } else {
                            payroll_total_row[i] += value_number;
        }}}}};
        //console.log("payroll_total_row",  payroll_total_row);
    }  // AddToPayrollTotalrow

//========= ResetPayrollTotalrow  ================= PR2020-06-16
    function ResetPayrollTotalrow() {
        //console.log("======= ResetPayrollTotalrow  ========= ");
        // copy number of columns from header row
        payroll_total_row = []
        if(payroll_header_row && payroll_header_row.length > 1){

            for (let i = 2, len = payroll_total_row.length; i < len; i++) {
                payroll_total_row[i] = 0;
        }}
    }  // ResetPayrollTotalrow

//========= UpdatePayrollTotalrow  ================= PR2020-06-16
    function UpdatePayrollTotalrow() {
        //console.log("======== UpdatePayrollTotalrow  ========= ");
        //console.log("is_payroll_detail_mode", is_payroll_detail_mode);
        //console.log("payroll_total_row", payroll_total_row);
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        const tblRow = document.getElementById("id_payroll_totalrow");
        if (tblRow){
// --- loop through cells of tablerow, skip first two columns "Total hours", blank (rosterdate)

            for (let i = 1, cell; cell=tblRow.cells[i]; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = cell.children[0];
                const fldName = get_attr_from_el(el_input, "data-field")
                if(el_input){
                    if(i === 1){
                        el_input.innerText = loc.Total_hours;
                    } else {
                        let show_total = (selected_btn === "payrolltabular") ? (i > 5) :
                                         (is_payroll_detail_mode) ? (i > 2) : (i > 1);
                        const display = (show_total) ? format_total_duration(payroll_total_row[i]) : null;
                        el_input.innerText = display;
                    }
                };
            }
        }
    }  // UpdatePayrollTotalrow
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//========= CreateHTML_period_tabular_list  ============= PR2020-08-31
    function create_payroll_agg_list(payroll_period_detail_list) {
        console.log("==== create_payroll_agg_list  ========= ");

        let agg_dict = {};
        let employees_inuse = {};
        let abscat_inuse = {};
        if (payroll_period_detail_list){
            for (let i = 0, row; row = payroll_period_detail_list[i]; i++) {
                console.log("row", row)
                const employee_pk = (row.employee_id) ? row.employee_id : 0;
                const employee_code = (row.employee_code) ? row.employee_code : "---";
// ---  lookup employee in employees_inuse, create if not found
                if(!(employee_pk in employees_inuse)) {
                    employees_inuse[employee_pk] = {code: employee_code,
                                                    absdur: row.absdur,
                                                    totaldur: row.totaldur};
                } else {
                    employees_inuse[employee_pk].totaldur += row.totaldur
                    employees_inuse[employee_pk].absdur += row.absdur
                }


// ---  lookup employee_dict in agg_dict, create if not found
                const empl_key = (employee_pk) ? "empl_" + employee_pk : "empl_0000";
                if(!(empl_key in agg_dict)) {
                    agg_dict[empl_key] = {total: [row.employee_code,
                                0, 0, 0, 0, 0, 0, 0, 0, 0]}
                }
                let employee_dict = agg_dict[empl_key] ;


            }  //  for (let i = 0, item; item = payroll_period_detail_list[i]; i++)
        }
        console.log("employees_inuse", employees_inuse)
    }
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

//========= CreateHTML_period_tabular_list  ==================================== PR2020-06-15 PR2020-08-29
    function CreateHTML_period_tabular_list(payroll_period_detail_list) {
        console.log("==== CreateHTML_period_tabular_list  ========= ");

        // payroll_period_detail_list = [ 0: emplhour_id, 1:rosterdate, 2:employee_id, 3: employee_code,
        //                                4: order_id, 5: custorder_code, 6: plannedduration, 7: timeduration
        //                                8: functioncode, 9: wagefactor, 10: paydatecode

        // employees.dicts:1199] [{'id': 10723, 'rosterdate': datetime.date(2020, 7, 27), 'employee_id': 2617, 'employee_code': 'Bakhuis RDJ',
        //'order_id': 1452, 'c_o_code': 'Afwezig - Ongeoorloofd',
        // 'offsetstart': None, 'offsetend': None, 'excelstart': 63416160, 'excelend': 63417600,
        // 'plandur': 0, 'timedur': 480, 'functioncode': 'nico', 'wagefactor': None, 'paydatecode': 'Tweewekelijks t/m donderdag'},

        // order_id = 0 when shift is not an absence shift
        //  table columns are: 0:rosterdate, 1:Order, 2:Shift, 3:Planned_hours, 4:Worked_hours 5 etc abscat last: total
        const workedhours_col_index = 4;
        const absencehours_col_index = 4;
        const totalhours_col_index = 4;

        let detail_rows = [];
        if (payroll_period_detail_list){
            for (let i = 0, item; item = payroll_period_detail_list[i]; i++) {
                let col_index = 0, td_html = [], filter_data = [], excel_data = [];
    // add margin first column
                const class_bg_img = (item.emplhour_id) ? " class=\"stat_0_4\"" : "";
                td_html[col_index] = "<td><div" + class_bg_img + "></div></td>"
    // ---  add employee_code
                col_index += 1;
                const employee_code = (item.employee_code) ? item.employee_code : "";
                td_html[col_index] = "<td><div class=\"ta_l\">" + employee_code + "</div></td>";
                filter_data[col_index] = (employee_code) ? employee_code.toLowerCase() : null
                excel_data[col_index] = employee_code;
    // ---  add rosterdate
                col_index += 1;
                const rosterdate_iso = item.rosterdate;
                const rosterdate_formatted = format_dateISO_vanilla (loc, rosterdate_iso, false, true)
                td_html[col_index] = "<td><div class=\"ta_l\">" + rosterdate_formatted + "</div></td>";
                filter_data[col_index] = (rosterdate_formatted) ? rosterdate_formatted : null
                excel_data[col_index] = item.exceldate;
    // ---  add customer and order
                col_index += 1;
                const cust_order_code = (item.c_o_code) ? item.c_o_code : "";
                td_html[col_index] = "<td><div class=\"ta_l\">" + cust_order_code + "</div></td>"
                filter_data[col_index] = (cust_order_code) ? cust_order_code.toLowerCase() : null
                excel_data[col_index] = item.c_o_code;
    // ---  add start time / end time
                for (let j = 0; j < 2; j++) {
                    col_index += 1;
                    const offset = (!j) ? item.offsetstart : item.offsetend;
                    const time_formatted = format_time_from_offset_JSvanilla( loc, rosterdate_iso, offset, true)  // true = display24
                    td_html[col_index] = "<td><div class=\"ta_r\">" + time_formatted + "</div></td>"
                    filter_data[col_index] = (time_formatted) ? time_formatted.toLowerCase() : null
                    excel_data[col_index] = (!j) ? item.excelstart : item.excelend;
                }

    // ---  add planned hours, worked hours, absence hours, total hours
                for (let j = 0; j < 4; j++) {
                    col_index += 1;
                    let duration = (j === 0) ? item.totaldur : (j === 1) ? item.plandur : (j === 2) ? item.timedur : item.absdur;
                    duration = (duration) ? duration : null;
                    const duration_formatted = format_total_duration (duration, loc.user_lang);
                    td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                    filter_data[col_index] = duration;
                    excel_data[col_index] = duration;
                }
    // ---  add wagefactor, functioncode, paydatecode
                for (let j = 0; j < 3; j++) {
                    col_index += 1;
                    // also add margin ml-2 to wagefactor
                    const class_ml2 = (j === 0) ? "<td><div class=\"ta_l ml-2\">" : "<td><div class=\"ta_l\">";
                    let value = (!j) ? item.wagefactor : (j === 1) ? item.functioncode : item.paydatecode;
                    if (!value) { value = "" };
                    td_html[col_index] = class_ml2 + value + "</div></td>"
                    filter_data[col_index] = (value) ? value.toLowerCase() : null
                    excel_data[col_index] = value;
                }

    //--- put td's together
                let row_html = "";
                for (let j = 0, item; item = td_html[j]; j++) {
                    if(item){row_html += item};
                }
                //  detail_row = [ 0: show, 1: employee_id, 2: filter_data, 3: excel_data, 4: row_html 5: emplhour_id]
                const row = [true, item.employee_id, filter_data, excel_data, row_html, item.emplhour_id];
                detail_rows.push(row);
                //console.log("filter_data:", filter_data )

            }  //  for (let i = 0, item; item = payroll_period_detail_list[i]; i++) {
        }
       //console.log("detail_rows:", detail_rows )
        return detail_rows;
    }  // CreateHTML_period_tabular_list

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

//========= CreateHTML_period_agg_list  ==================================== PR2020-06-24
    function CreateHTML_period_agg_list(payroll_period_agg_list) {
        console.log("==== CreateHTML_period_agg_list  ========= ");

        // payroll_period_agg_list = [ e_id: 2615, e_code: "Sambo SMJ", eh_plandur_sum: 240, eh_timedur_agg: {0: 1235}

        //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        // table columns: 0: margin, 1: employee_code, 2: planned_hours, 3: worked_hours 3 etc: Absence hours last column: total hours

        const workedhours_col_index = 3;
        const col_count =  5 + workedhours_col_index + payroll_abscat_list.length;

        let detail_rows = [];
        if (payroll_period_agg_list){
            for (let i = 0, item; item = payroll_period_agg_list[i]; i++) {
                let col_index = 0, td_html = [], filter_data = [], excel_data = [];
// add margin as first column
                td_html[col_index] =  "<td><div></div></td>"
// add employee_code
                col_index += 1;
                const employee_pk = item.e_id;
                const employee_code = (item.e_code) ? item.e_code : "";
                td_html[col_index] = "<td><div class=\"ta_l\">" + employee_code + "</div></td>";
                filter_data[col_index] = (employee_code) ? employee_code.toLowerCase() : null
                excel_data[col_index] = employee_code;
//--- add total duration
                col_index += 1;
                const col_tot_dur = col_index;
                // row_sum is not calulated yet, add total column after adding agg_dict
// --- add planned duration
                col_index += 1;
                const duration = (item.eh_plandur_sum) ? item.eh_plandur_sum : null;
                let duration_formatted = format_total_duration (duration, loc.user_lang);
                td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                filter_data[col_index] = duration;
                excel_data[col_index] = duration;
// --- add agg_dict
                const agg_dict = item.eh_timedur_agg;  // agg_dict = {0: 375, 1452: 360}
                let row_sum = 0;
                for (let key in agg_dict) {
                    if (agg_dict.hasOwnProperty(key)) {
                        if(key){
                            const key_int = (Number(key)) ? Number(key) : null;
                            const duration = (agg_dict[key]) ? agg_dict[key] : null;
                            if(duration) {row_sum += duration};
                            // lookup index in payroll_mapped_columns, use index 3 'Worked' if not found or 0
                            //  payroll_mapped_columns = {1447: 5, 1448: 7, 1450: 4, 1452: 6}
                            let col_index = workedhours_col_index;
                            // if key = "0" it is worked hours. In that case put hours in workedhours_col_index
                            if (Number(key) && key in payroll_mapped_columns ) {
                                col_index += payroll_mapped_columns[key]
                            };
// add time_dur in abscat column
                            const duration_formatted = format_total_duration (duration, loc.user_lang);
                            td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                            filter_data[col_index] = (duration) ? duration : null
                            excel_data[col_index] = duration;
                }}};

//--- put total in last column of this row
                // use column col_tot_dur instead of col_index += 1;
                duration_formatted = format_total_duration (row_sum, loc.user_lang);
                td_html[col_tot_dur] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                excel_data[col_tot_dur] = row_sum;
                filter_data[col_tot_dur] = (row_sum) ? row_sum : null
///////////////////////////
    // ---  add wagefactor, functioncode, paydatecode
                for (let j = 0; j < 3; j++) {
                    col_index += 1;
                    // also add margin ml-2 to wagefactor
                    const class_ml2 = (j === 0) ? "<td><div class=\"ta_l ml-2\">" : "<td><div class=\"ta_l\">";
                    let value = (!j) ? item.wagefactor : (j === 1) ? item.functioncode : item.paydatecode;
                    if (!value) { value = "" };
                    td_html[col_index] = class_ml2 + value + "</div></td>"
                    filter_data[col_index] = (value) ? value.toLowerCase() : null
                    excel_data[col_index] = value;
                }
/////////////////////////////
//--- add empty td's
                for (let j = 0; j < col_count; j++) {
                    if(!td_html[j] ){ td_html[j] = "<td><div></div></td>" }
                }
//--- put td's together
                let row_html = "";
                for (let j = 0, item; item = td_html[j]; j++) {
                    if(item){row_html += item};
                }
                //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: excel_data, 4: row_html ]
                const row = [true, employee_pk, filter_data, excel_data, row_html];
                detail_rows.push(row);
            }  //  for (let i = 0, item; item = payroll_period_detail_list[i]; i++) {
        }
        return detail_rows;
    }  // CreateHTML_period_agg_list



//========= CreateHTML_period_detail_list  ==================================== PR2020-06-15
    function CreateHTML_period_detail_list(payroll_period_detail_list) {
        //console.log("==== CreateHTML_period_detail_list  ========= ");

        // payroll_period_detail_list = [ emplhour_id: 10735, rosterdate: "2020-07-27"
        // employee_id: 2605, employee_code: "El Chami OT", order_id: 0,  c_o_code: "Zero Securitas - ZRO"
        // offsetstart: 840. offsetend: 1260, excelstart: 63417000, excelend: 63417420,
        // plandur: 0, timedur: 420, absdur: 0, totaldur: 420,
        // wagefactor: null, paydatecode: null, functioncode: "nico",

        //  table columns are: 0:rosterdate, 1:Order, 2:Shift, 3:Planned_hours, 4:Worked_hours 5 etc abscat last: total
        const workedhours_col_index = 4;
        const col_count =  2 + workedhours_col_index + payroll_abscat_list.length;

        let detail_rows = [];
        if (payroll_period_detail_list){
            for (let i = 0, item; item = payroll_period_detail_list[i]; i++) {
                let col_index = 0, td_html = [], filter_data = [], excel_data = [];
    // add margin first column
                td_html[col_index] =  "<td><div></div></td>"
    // ---  add rosterdate
                col_index += 1;
                const rosterdate_iso = item.rosterdate;
                const rosterdate_formatted = format_dateISO_vanilla (loc, rosterdate_iso, false, true)
                td_html[col_index] = "<td><div class=\"ta_l\">" + rosterdate_formatted + "</div></td>";
                filter_data[col_index] = (rosterdate_formatted) ? rosterdate_formatted : null
                excel_data[col_index] = item.exceldate;
    // ---  add customer and order
                col_index += 1;
                const cust_order_code = (item.c_o_code) ? item.c_o_code : "";
                td_html[col_index] = "<td><div class=\"ta_l\">" + cust_order_code + "</div></td>"
                filter_data[col_index] = (cust_order_code) ? cust_order_code.toLowerCase() : null
                excel_data[col_index] = item.c_o_code;
    // ---  add planned hours
                col_index += 1;
                let duration = (item.plandur) ? item.plandur : null;
                let duration_formatted = format_total_duration (duration, loc.user_lang);
                td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                filter_data[col_index] = duration;
                excel_data[col_index] = duration;

    // get proper column index from payroll_mapped_columns
                col_index = workedhours_col_index;
                if (item.order_id in payroll_mapped_columns ) {
                    col_index += payroll_mapped_columns[item.order_id]
                };

    // add absdur in abscat column or time_dur in workedhours column (then order_id=0)
                duration = (item.order_id) ? item.absdur : item.timedur;
                if(!duration) {duration = null}
                duration_formatted = format_total_duration (duration, loc.user_lang);
                td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                filter_data[col_index] = duration;
                excel_data[col_index] = duration;

    //--- put total in last column of this row - in detail row totssl and timeduration are the same
                col_index = col_count -1;
                td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                filter_data[col_index] = duration;
                excel_data[col_index] = duration;

    //--- add empty td's
                for (let j = 0; j < col_count; j++) {
                    if(!td_html[j] ){ td_html[j] = "<td><div></div></td>" }
                }
    //--- put td's together
                let row_html = "";
                for (let j = 0, item; item = td_html[j]; j++) {
                    if(item){row_html += item};
                }
                //  detail_row = [ 0: show, 1: employee_id, 2: filter_data, 3: excel_data, 4: row_html 5: emplhour_id]
                const row = [true, item.employee_id, filter_data, excel_data, row_html, item.emplhour_id];
                detail_rows.push(row);
            }  //  for (let i = 0, item; item = payroll_period_detail_list[i]; i++) {
        }
        return detail_rows;
    }  // CreatePayrollHtmlList


//=========  create_payroll_mapped_columns  === PR2020-06-25
    function create_payroll_mapped_columns() {
        //console.log("===  create_payroll_mapped_columns ==");
        // payroll_abscat_list has item for each abscat that is in use in current selection.
        // format: [order_pk, order_code, order_sequence]   [ [1450, "Vakantie", 322], [1447, "Onbekend", 7] ]

        // payroll_mapped_columns has key/value for each column. Key = order_pk, Value = col_index
        // payroll_mapped_columns =  { 1448: 3, 1449: 0, 1450: 2, 1539: 1 }
// +++  create dict  payroll_mapped_columns
        // order_pk = 0 is worked hours
        payroll_mapped_columns = {0: 0};
        if (payroll_abscat_list) {
            let mapped_index = 0;
            for (let i = 0, item; item=payroll_abscat_list[i]; i++) {
                mapped_index += 1;
// --- add mapped column to payroll_mapped_columns
                payroll_mapped_columns[item[0]] = mapped_index;
            }
        };
        //console.log("payroll_mapped_columns", payroll_mapped_columns);
    }  // create_payroll_mapped_columns

///////////////////////////////

//=========  CreateTabularHeader  === PR2020-07-19
    function CreateTabularHeader() {
        //console.log("===  CreateTabularHeader ==");
        const tblName = "payroll_tabular";
        //console.log("field_settings[tblName]", field_settings[tblName]);
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

// +++  insert header rows ++++++++++++++++++++++++++++++++
        let tblHeadRow = tblHead_datatable.insertRow (-1);
        let tblFilterRow = tblHead_datatable.insertRow (-1);
        let tblTotalRow = tblHead_datatable.insertRow (-1);
        tblTotalRow.id = "id_payroll_totalrow";

// ---  create payroll_header_row, put caption in static columns
        for (let j = 0, len = field_settings[tblName].field_caption.length; j < len; j++) {
            const key = field_settings[tblName].field_caption[j];
            const caption = (loc[key]) ? loc[key] : key;
            payroll_header_row.push(caption)

            const field_name = field_settings[tblName].field_names[j];
            const field_tag = field_settings[tblName].field_tags[j];
            const filter_tag = field_settings[tblName].filter_tags[j];
            const class_width = "tw_" + field_settings[tblName].field_width[j] ;
            const class_align = "ta_" + field_settings[tblName].field_align[j];

// +++ add th to tblHeadRow +++
            let th = document.createElement("th");
                let el_div = document.createElement("div");
                    el_div.innerText = caption;
                    el_div.classList.add(class_width, class_align);
            // also add margin ml-2 to column wagefactor
                    if (field_name === "wagefactor") {el_div.classList.add("ml-2")};
                th.appendChild(el_div);
            tblHeadRow.appendChild(th);

// +++ add th to tblFilterRow +++
            th = document.createElement("th");
                const el = document.createElement(field_tag);
                    el.setAttribute("data-field", field_name);
                    el.setAttribute("data-filtertag", filter_tag);
// --- add Event Listener
                    if (j === 0) {
                        el.addEventListener("click", function(event){HandleFilterToggleRoster(el, j)});
                        el.classList.add("stat_0_0")
                        el.classList.add("pointer_show");
                    } else {
                        el.addEventListener("keyup", function(event){HandlePayrollFilter(el, j, event.which)});
                        el.setAttribute("autocomplete", "off");
                        el.setAttribute("ondragstart", "return false;");
                        el.setAttribute("ondrop", "return false;");
                        el.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                    }
// --- add other attributes
            // also add margin ml-2 to column wagefactor
                    if (j === 8) {el_div.classList.add("ml-2")};
                th.appendChild(el);
            tblFilterRow.appendChild(th);

// +++ add th to tblTotalRow +++
            th = document.createElement("th");
                el_div = document.createElement("div");
                if (j === 1) {
                    el_div.innerText = loc.Total_hours;
                }
                el_div.classList.add(class_width, class_align);
            // also add margin ml-2 to column wagefactor
                    if (j === 8) {el_div.classList.add("ml-2")};
                th.appendChild(el_div)
            tblTotalRow.appendChild(th);
        }
    };  //  CreateTabularHeader


//========= FillTabularRows  ====================================
    function FillTabularRows() {
       console.log( "====== FillTabularRows  === ");

// --- reset table, except for header
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        ResetPayrollTotalrow();

// --- loop through payroll_period_detail_rows / payroll_period_agg_rows
        //  payroll_period_detail_rows = [ 0: show, 1: employee_id, 2: filter_data, 3: row_data, 4: row_html, 5: emplhour_id ]

        // row_data: 1: employee_code, 2: rosterdate, 3: customer_order,
        //           4: planned_hours, 5: workedhours, 6: absencehours, 7: totalhours,
        //           8: wagefactor, 9:functioncode, 10: paydatecode

        const detail_rows = payroll_period_tabular_rows
        if (detail_rows) {
            for (let i = 0, item, tblRow, row_data, filter_row, show_row; item = detail_rows[i]; i++) {
                filter_row = item[2];
                row_data = item[3];
                const col_count = item[4].length;
                show_row = t_ShowPayrollRow(filter_row, filter_dict, col_count);
                item[0] = show_row;
                if (show_row){
                    tblRow = tblBody_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        // --- add emplhour_pk as id to tblRow
                    if(item[5]){tblRow.id = item[5] };
        // --- put employee_pk in data-pk
                    tblRow.setAttribute("data-employee_pk", item[1]);
        // --- add EventListener to tblRow.
                    //tblRow.addEventListener("click", function() {HandleAggRowClicked(tblRow)}, false);
                    add_hover(tblRow)
                    tblRow.innerHTML = item[4];
        // --- add duration to total_row.
                    AddToPayrollTotalrow(row_data);
                }
            }
        }
        UpdatePayrollTotalrow()
        //console.log("FillCrosstabRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // FillTabularRows


///////////////////////////////

//=========  CreateCrosstabHeader  === PR2020-05-24
    function CreateCrosstabHeader() {
        console.log("===  CreateCrosstabHeader ==");
        const tblName = (is_payroll_detail_mode) ? "payroll_detail" : "payroll_agg";

        //console.log("selected_btn", selected_btn);
        //console.log("is_payroll_detail_mode", is_payroll_detail_mode);
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        payroll_header_row = [];
        let col_index = -1;
// ---  create payroll_header_row, put caption in static columns
        for (let i = 0, len = field_settings[tblName].field_caption.length; i < len; i++) {
            const key = field_settings[tblName].field_caption[i];
            const caption = (loc[key]) ? loc[key] : key;
            col_index +=1
            payroll_header_row.push(caption)
        }
        const last_static_col_index = col_index;

        //console.log("payroll_header_row", payroll_header_row);
// +++  add caption to payroll_header_row
        if (payroll_abscat_list) {
            // payroll_abscat_list has item for each abscat that is in use in current selection.
            // format: [order_pk, order_code, order_sequence]   [ [1450, "Vakantie", 322], [1447, "Onbekend", 7] ]
            for (let i = 0, caption, item; item=payroll_abscat_list[i]; i++) {
                col_index += 1;
                caption = item[1];
                // replace tilde with "-\n"
                if (caption.includes("~")){caption = caption.replace(/~/g,"-\n")}
                payroll_header_row[col_index] = caption;
            }
        };
// +++  add column 'Wage_factor' and add caption to payroll_header_row
        col_index +=1
        payroll_header_row[col_index] = loc.Wage_factor;
// +++  add column 'Function' and add caption to payroll_header_row
        col_index +=1
        payroll_header_row[col_index] = loc.Function;
// +++  add column 'Payroll period' and add caption to payroll_header_row
        col_index +=1
        payroll_header_row[col_index] = loc.Payroll_period;
//  --- calc col_count
        const col_count = col_index +=1 ;

// +++  insert header row ++++++++++++++++++++++++++++++++
        let tblRow = tblHead_datatable.insertRow (-1);
//--- insert th's
        // must use len, otherwise loop will end when payroll_header_row[j] has no value PR2020-07-16
        for (let j = 0, len = payroll_header_row.length; j < len; j++) {
// --- add th to tblRow.
            const th = document.createElement("th");
// --- add div to th, margin not working with th
            const el_div = document.createElement("div");
// --- add innerText to el_div
            if(payroll_header_row[j]) {el_div.innerText = payroll_header_row[j]};
// --- add width, text_align and left margin to first column
            //if (j === 0 ){ el_div.classList.add("ml-2")};
            const class_width = (j < last_static_col_index) ? "tw_" + field_settings[tblName].field_width[j] :
                                (j === col_count - 1) ? "tw_" + field_settings[tblName].field_width[j] :
                                "tw_" + field_settings[tblName].field_width[last_static_col_index]
            const class_align = (j < last_static_col_index) ?
                                "ta_" + field_settings[tblName].field_align[j] :
                                "ta_" + field_settings[tblName].field_align[last_static_col_index]
            el_div.classList.add(class_width, class_align);
// --- add EventListener
            if ( j === 0 && is_payroll_detail_mode) {
                el_div.addEventListener("click", function(event){ResetFilterRows()});
                el_div.title = loc.Back_to_previous_level
                add_hover(el_div)
            }
// --- add width, text_align and left margin to first column
            th.appendChild(el_div);
            tblRow.appendChild(th);
        };

// +++  insert filter row ++++++++++++++++++++++++++++++++
        tblRow = tblHead_datatable.insertRow(-1);
//--- insert td's
        // must use len, otherwise loop will end when payroll_header_row[j] has no value PR2020-07-16
        for (let j = 0, len = payroll_header_row.length; j < len; j++) {
            const th = document.createElement("th");
// --- add input element
            const el_input = document.createElement("input");
// --- add EventListener
            el_input.addEventListener("keyup", function(event){HandlePayrollFilter(el_input, j, event.which)});
// --- add attribute data-field
            const field_name = (j < last_static_col_index) ? field_settings[tblName].field_names[j] :
                                field_settings[tblName].field_names[last_static_col_index]
            const filter_tag = (j < last_static_col_index) ?
                                field_settings[tblName].filter_tags[j] :
                                field_settings[tblName].filter_tags[last_static_col_index]
            el_input.setAttribute("data-field", field_name);
            el_input.setAttribute("data-filtertag", filter_tag);
// --- add other attributes
            el_input.setAttribute("autocomplete", "off");
            el_input.setAttribute("ondragstart", "return false;");
            el_input.setAttribute("ondrop", "return false;");
// --- add width, text_align and left margin to first column
            if (j === 0 ){ el_input.classList.add("ml-2")};
            const class_width = (j < last_static_col_index) ?
                                "tw_" + field_settings[tblName].field_width[j] :
                                "tw_" + field_settings[tblName].field_width[last_static_col_index]
            const class_align = (j < last_static_col_index) ?
                                "ta_" + field_settings[tblName].field_align[j] :
                                "ta_" + field_settings[tblName].field_align[last_static_col_index]
            el_input.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
// --- append th
            th.appendChild(el_input);
            tblRow.appendChild(th);
        }

// +++  insert total row ++++++++++++++++++++++++++++++++
        tblRow = tblHead_datatable.insertRow(-1);
        tblRow.id = "id_payroll_totalrow";
//--- insert th's
        // must use len, otherwise loop will end when payroll_header_row[j] has no value PR2020-07-16
        for (let j = 0, len = payroll_header_row.length; j < len; j++) {
// --- add th to tblRow.
            const th = document.createElement("th");
// --- add div to th, margin not working with th
            const el_div = document.createElement("div");
// --- add innerText to el_div
            if (j === 1) {
                el_div.innerText = loc.Total_hours;
            } else if (j === 2 && is_payroll_detail_mode && selected_employee_pk) {
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee",selected_employee_pk )
                el_div.innerText = get_dict_value(map_dict, ["code", "value"])
            }
// --- add width, text_align and left margin to first column
            const class_width = (j < last_static_col_index) ?
                                "tw_" + field_settings[tblName].field_width[j] :
                                "tw_" + field_settings[tblName].field_width[last_static_col_index]
            const class_align = (j < last_static_col_index) ?
                                "ta_" + field_settings[tblName].field_align[j] :
                                "ta_" + field_settings[tblName].field_align[last_static_col_index]
            el_div.classList.add(class_width, class_align);

            th.appendChild(el_div)
            tblRow.appendChild(th);
        };
    };  //  CreateCrosstabHeader

//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30 PR2020-06-13
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_paydatecode_import = get_attr_from_el(el_data, "data-paydatecode_import_url");
        AddSubmenuButton(el_div, loc.Add_abscat, function() {AddnewOpen()}, ["mx-2"], "id_submenu_addnew")
        AddSubmenuButton(el_div, loc.Delete_abscat, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_delete")
        //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
        //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"], "id_submenu_delete");
        AddSubmenuButton(el_div, loc.Upload_payroll_periods, null, ["mx-2"], "id_submenu_upload", url_paydatecode_import);

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//========= FillAbscatTableRows  ====================================
    function FillAbscatTableRows(called_by) {
        // called by HandleBtnSelect
        //console.log( "===== FillAbscatTableRows  === ", called_by);

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null
// --- create tblHead
        CreateTblHeader(selected_btn);
// --- get data_map
        const data_map = abscat_map;
        if(!!data_map){
// --- loop through data_map
            const tblName = "order";
            for (const [map_id, map_dict] of data_map.entries()) {
                const pk_int = get_dict_value(map_dict, ["id", "pk"], 0);
                const ppk_int = get_dict_value(map_dict, ["id", "ppk"], 0);
                const row_index = -1
                let tblRow = CreateTblRow(tblBody_datatable, tblName, pk_int, ppk_int, null, row_index)
                UpdateTblRow(tblRow, map_dict)
            }  // for (const [map_id, map_dict] of data_map.entries())
        }  // if(!!data_map)
        //console.log("FillAbscatTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        Filter_TableRows();
    }  // FillAbscatTableRows

//=========  CreateTblHeader  === PR2019-10-25 PR2020-06-18
    function CreateTblHeader(tblName) {
        //console.log("===  CreateTblHeader == tblName: ", tblName);
        const tblHead = (tblName === "employee") ? tblHead_employee :
                        (["paydatecode", "functioncode"].indexOf(tblName) > -1) ? tblHead_paydatecode :
                        (tblName === "wagefactor") ? tblHead_paydatecode : tblHead_datatable;

        tblHead.innerText = null
        if(field_settings[tblName]){
            const column_count = field_settings[tblName].tbl_col_count;
            if(column_count){
//--- insert tblRow
                let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
                for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
                    let th = document.createElement("th");
// --- add div to th, margin not working with th
                    let el_div = document.createElement("div");
                    if ( ["employee", "paydatecode", "functioncode"].indexOf(tblName) > -1){
                        if (j === 0 ){
        // --- add checked image to first column
                            AppendChildIcon(el_div, imgsrc_chck01);
                        } else {
    // --- add innerText to el_div
                            const data_text = field_settings[tblName].field_caption[j];
                            const caption = (tblName === "payroll") ? data_text : loc[data_text]
                            if(caption) {el_div.innerText = caption};
                        };
                    } else {
                        const data_text = field_settings[tblName].field_caption[j];
                        const caption = (tblName === "payroll") ? data_text : loc[data_text]
                        if(caption) {el_div.innerText = caption};
                    }
// --- add width, text_align
                    el_div.classList.add("tw_" + field_settings[tblName].field_width[j],
                                         "ta_" + field_settings[tblName].field_align[j]);
        // --- append el_div and th to tblRow
                    th.appendChild(el_div)
                    tblRow.appendChild(th);
                }  // for (let j = 0; j < column_count; j++)
                //if ( ["employee", "paydatecode"].indexOf(tblName) > -1){
                    CreateTblHeaderFilter(tblHead, tblName, column_count);
                //}
            }  // if(column_count)
        }  // if(field_settings[tblName])
    };  //  CreateTblHeader

//=========  CreateTblHeaderFilter  ================ PR2019-09-15 PR2020-05-22
    function CreateTblHeaderFilter(tblHead, tblName, column_count) {
       //console.log("=========  function CreateTblHeaderFilter =========");
       //console.log("tblName:", tblName);

//+++ insert tblRow into tblHead
        let tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("data-table", tblName)
        tblRow.classList.add("tsa_bc_lightlightgrey");
//+++ iterate through columns
        for (let j = 0, td, el; j < column_count; j++) {
// insert td into tblRow
            td = tblRow.insertCell(-1);
// create element with tag from field_tags
                //const field_tag = field_settings[tblName].field_tags[j];
                const filter_tag = (tblName === "employee" && j === 0) ? "div" : "input"
                let el = document.createElement(filter_tag);
// --- add data-field Attribute.
               el.setAttribute("data-field", field_settings[tblName].field_names[j]);
               el.setAttribute("data-mode", tblName);
// --- add checked image to first column in employee table
                if (tblName === "employee" && j === 0) {
                    // --- add checked image to first column in employee table
                    AppendChildIcon(el, imgsrc_stat00);
                } else {
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");
// --- make text grey
                    if (tblName !== "planning") {el.classList.add("tsa_color_darkgrey")}
                    el.classList.add("tsa_transparent")
// --- add other attributes to td
                    el.setAttribute("autocomplete", "off");
                    el.setAttribute("ondragstart", "return false;");
                    el.setAttribute("ondrop", "return false;");
                }  //if (j === 0)
// --- add EventListener to td
            if (j === 0 && tblName === "employee"){
                el.addEventListener("click", function(event){HandleFilterChecked(el)});
            } else {
                el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});
            }
// --- add left margin to first column, not in employee (has check tick
            if (j === 0 && tblName !== "employee"){el.classList.add("ml-2")};
// --- add field_width and text_align
            el.classList.add("tw_" + field_settings[tblName].field_width[j],
                             "ta_" + field_settings[tblName].field_align[j]);
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  // CreateTblHeaderFilter

//=========  CreateTblRow  ================ PR2020-06-09
    function CreateTblRow(tblBody, tblName, pk_str, ppk_str, employee_pk, row_index, is_disabled) {
        //console.log("=========  CreateTblRow =========", tblName);
        //console.log( "row_index", row_index);
        let tblRow = null;
        if(field_settings[tblName]){
// --- insert tblRow into tblBody at row_index
            // TODO debug insert at index not working, gives correct index but still inserts at end PR2020-06-21
            //console.log("row_index", row_index, typeof row_index);
            if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09\\
            const row_count = tblBody.rows.length;
            if(row_index >= row_count ) {row_index = -1}
            tblRow = tblBody.insertRow(row_index);

            const map_id = get_map_id(tblName, pk_str)
// --- add data attributes to tblRow
            if(map_id){tblRow.setAttribute("id", map_id)};
            if(pk_str){tblRow.setAttribute("data-pk", pk_str)};
            if(ppk_str){tblRow.setAttribute("data-ppk", ppk_str)};
            if(tblName){tblRow.setAttribute("data-table", tblName)};
// --- add EventListener to tblRow, not in closingdate,  paydatecode, functioncode, employee
            if (["closingdate" , "paydatecode", "functioncode", "employee"].indexOf(tblName) === -1) {
                tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
            }
// +++  insert td's into tblRow
            const column_count = field_settings[tblName].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create div element, or other tag when field_tags existst
                let el_tag = "div";
                if(field_settings[tblName].field_tags) {
                    el_tag = field_settings[tblName].field_tags[j];
                }
                let el_div = document.createElement(el_tag);
// --- add data-field attribute
                el_div.setAttribute("data-field", field_settings[tblName].field_names[j]);
// --- add EventListener,  img delete, inactive and no_wage
                if (tblName === "order"){
                    if ( j === column_count - 1) {
                        CreateBtnDeleteInactive("delete", tblName, el_div);
                    } else if ( j === column_count - 2) {
                        CreateBtnDeleteInactive("inactive", tblName, el_div);
                    } else {
// --- add blank image to check boxes
                        if([1, 2, 3 , 4].indexOf(j) > -1){
                            AppendChildIcon(el_div, imgsrc_stat00)
                        }
// --- add EventListener pointer, hover
                        if ([0, 5, 6].indexOf(j) > -1){
                            el_div.addEventListener("click", function() {MAC_Open(j, el_div)}, false)
                        } else {
                            el_div.addEventListener("click", function() {UploadToggle(el_div)}, false)
                        }
                        el_div.classList.add("pointer_show");
                        add_hover(el_div);
                    }
// --- add left margin to first column,
                    if (j === 0){el_div.classList.add("ml-2");}
                } else if (["paydatecode"].indexOf(tblName) > -1) {
                // --- add EventListener,  img delete, inactive and no_wage
                        add_hover(el_div);
                        el_div.classList.add("pointer_show");
                        if ( j === column_count - 1) {
                            CreateBtnDeleteInactive("inactive", tblName, el_div);
                        } else if ( j === 0) {
                            AppendChildIcon(el_div, imgsrc_stat00)
                            el_div.addEventListener("click", function() {MPP_SetTickmark(el_div)}, false);
                        } else if (j === 1 ){
                            el_div.addEventListener("click", function() {MPP_Open(el_div)}, false);
                        }
                 } else if (tblName === "functioncode"){
                // --- add EventListener,  img delete, inactive and no_wage
                        add_hover(el_div);
                        el_div.classList.add("pointer_show");
                        if ( j === column_count - 1) {
                            CreateBtnDeleteInactive("inactive", tblName, el_div);
                        } else if ( j === 0) {
                            AppendChildIcon(el_div, imgsrc_stat00)
                            el_div.addEventListener("click", function() {MFU_SetTickmark(el_div)}, false);
                        } else if (j === 1 ){
                            el_div.addEventListener("click", function() {MFU_Open(el_div)}, false);
                        }
                } else if (tblName === "closingdate"){
                        if ( j === 0) {
                            el_div.setAttribute("type", "date")
                            el_div.classList.add("border_none", "tw_150");
                        } else if ( j === 1) {
                            if(!is_disabled){
                                el_div.addEventListener("click", function() {MPP_ClosingdateDelete(el_div)}, false )
                                AppendChildIcon(el_div, imgsrc_delete)
                                el_div.classList.add("border_none", "pointer_show", "tw_032");
                                add_hover_image(el_div, imgsrc_deletered, imgsrc_delete)
                            }
                        }
                } else if (tblName === "employee"){
// --- add blank image to check boxes
                        if ( j === 0) {
                            AppendChildIcon(el_div, imgsrc_stat00)
                            el_div.addEventListener("click", function() {Select_Employee(el_div)}, false);
                        } else if (j === 2 ){
                            el_div.addEventListener("click", function() {HandleEmployeeCodeClicked("functioncode", el_div)}, false);
                        } else if (j === 3 ){
                            el_div.addEventListener("click", function() {HandleEmployeeCodeClicked("paydatecode",el_div)}, false);
                        }
                        if ([0, 2, 3].indexOf(j) !== -1){
                            add_hover(el_div);
                            el_div.classList.add("pointer_show")
                        }
                           // add_hover(el_div);
                            //el_div.classList.add("pointer_show");

               } else if (tblName === "wagefactor"){// --- add EventListener,  img inactive
                        add_hover(el_div);
                        el_div.classList.add("pointer_show");
                        if ( j === column_count - 1) {
                            CreateBtnDeleteInactive("inactive", tblName, el_div);
                        } else if ( j === 0) {
                            AppendChildIcon(el_div, imgsrc_stat00)
                            el_div.addEventListener("click", function() {MWF_Select(el_div)}, false);
                        } else if ([1, 2].indexOf(j) >= -1){
                            el_div.addEventListener("click", function() {MWF_Open(el_div)}, false);
                        }
                }
// --- add  text_align
               el_div.classList.add("ta_" + field_settings[tblName].field_align[j]);
// --- add element to td.
                td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[tblName])
        return tblRow
    };  // CreateTblRow

//=========  CreateTblFoot  ================ PR2020-06-18
    function CreateTblFoot(tblName) {
        //console.log("========= CreateTblFoot  ========= ");
        //console.log("tblName", tblName);
// --- function adds row 'add new' in tablefoot
        if (field_settings[tblName]){
            const column_count = field_settings[tblName].tbl_col_count;
// --- insert tblRow into tblBody
            const el_id = (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1) ? "id_tblFoot_paydatecode" : "id_tblFoot_datatable";
            const tblFoot = document.getElementById(el_id);
            tblFoot.innerText = null;
            let tblRow = tblFoot.insertRow(-1);
//+++ insert td's into tblRow
            let td = tblRow.insertCell(-1);
            td = tblRow.insertCell(-1);
            td.setAttribute("colspan",column_count -1)
// --- create div element with tag from field_tags
            let el_div = document.createElement("div");
// --- add EventListener
                if(tblName === "paydatecode"){
                    el_div.addEventListener("click", function() {MPP_Open()}, false)
                } else if(tblName === "functioncode"){
                    el_div.addEventListener("click", function() {MFU_Open()}, false)
                } else if(tblName === "wagecode"){
                    el_div.addEventListener("click", function() {MWC_Open()}, false)
                } else if(tblName === "wagefactor"){
                    el_div.addEventListener("click", function() {MWF_Open()}, false)
                }
                add_hover(el_div);
// --- add placeholder
                const caption = (tblName === "paydatecode") ? loc.Add_payrollperiod :
                                (tblName === "functioncode") ? loc.Add_function :
                                (tblName === "wagecode") ? loc.Add_wagecode :
                                (tblName === "wagefactor") ? loc.Add_wagefactor : ""
                el_div.innerText = "< " + caption + " >"
// --- add class,
                el_div.classList.add("pointer_show", "tsa_color_darkgrey", "tsa_transparent")
            td.appendChild(el_div);
        }  //  if (field_settings[tblName])
    }  // CreateTblFoot

//=========  CreateBtnDeleteInactive  ================ PR2020-06-09
    function CreateBtnDeleteInactive(mode, sel_btn, el_input){
        //console.log("========= CreateBtnDeleteInactive  ========= ", mode);
// --- add EventListener
        el_input.addEventListener("click", function() {UploadToggle(el_input)}, false )
// --- add title
        const title = (mode ==="delete" && sel_btn === "order") ? loc.Delete_abscat : null;
        if(title){el_input.setAttribute("title", title)};
// --- add image
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_lightgrey;
        AppendChildIcon(el_input, img_src)
// --- add class
        el_input.classList.add("ml-4", "border_none", "pointer_show");
// --- add hover
        if(mode ==="delete"){ add_hover_image(el_input, imgsrc_deletered, imgsrc_delete)
        } else if(mode ==="inactive"){ add_hover(el_input)}
    }  // CreateBtnDeleteInactive

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= UpdatePayrollTblRow  =============
    function UpdatePayrollTblRow(tblRow, detail_row){
        //console.log("========= UpdatePayrollTblRow  =========");
        //console.log("detail_row", detail_row);
        //console.log("tblRow", tblRow);
        // detail_row = [0: "Henk", 1: "2020-05-16", 2: 480, 3: 480, 4: 0, 5: 0, 6: 0, 7: 0, 8: 480]

        if (tblRow && detail_row) {
// --- loop through cells of tablerow
            for (let i = 0, cell; cell=tblRow.cells[i]; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = cell.children[0];
                if(el_input){
                    let display_value = null;
                    if(i === 0){
                        display_value = (detail_row[0]) ? detail_row[0] : "---";
                    } else  if(i === 1){
                        display_value = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(detail_row[i]), loc.user_lang, true, false);
                    } else {
                        display_value = format_total_duration (detail_row[i], loc.user_lang);
                    }
                    el_input.innerText = display_value;
                }
            }
        };  // if (!!update_dict && !!tblRow)
    }  // UpdatePayrollTblRow

//========= UpdateTblRow  =============
    function UpdateTblRow(tblRow, update_dict){
        //console.log("========= UpdateTblRow  =========");
        //console.log("update_dict", update_dict);

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

//--- get info from update_dict
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id","pk"]);
            const ppk_int = get_dict_value(update_dict, ["id","ppk"]);
            const map_id = get_map_id( tblName, pk_int);
            const is_created = get_dict_value(update_dict, ["id","created"], false);
            //const is_deleted = ("deleted" in id_dict); //delete row moved to outstside this function
            const msg_err = get_dict_value(update_dict, ["id","error"]);
            const column_count = field_settings[selected_btn].tbl_col_count;

// --- new created record
            if (is_created){
// update row info
    // update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-table", tblName);

// move the new row in alfabetic order
                let row_index = -1
                if(tblName === "order") {
                    //row_index = t_get_rowindex_by_code_datefirst(tblBody_datatable, tblName, teammember_map, search_code, search_datefirst)
                } else {
                    row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                    tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);
                }

// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function
            if (tblRow){
                const is_inactive = get_dict_value (update_dict, ["inactive", "value"], false);
                // tblRow.data-inactive is set in format_inactive in UpdateField
                //tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, cell; cell=tblRow.cells[i]; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = cell.children[0];
                    if(!!el_input){
                        UpdateField(el_input, update_dict)
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!update_dict && !!tblRow)
    }  // function UpdateTblRow

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict){
        //console.log("========= UpdateField  =========");
        //console.log("item_dict", item_dict);
        const tblName = get_dict_value (item_dict, ["id", "table"]);
        const is_absence = (!!get_dict_value (item_dict, ["id", "isabsence"]));
        const fldName = get_attr_from_el(el_input, "data-field");
        const field_dict = get_dict_value(item_dict, [fldName])
        const value = get_dict_value(field_dict, ["value"])

// --- lookup field in item_dict, get data from field_dict
        //const is_locked = (!!get_dict_value (field_dict, ["locked"]));
        //el_input.disabled = locked
        if (tblName === "order"){
            if (["code", "identifier", "sequence"].indexOf( fldName ) > -1){
                // any value is neede to show hover and let eventlistener work
                el_input.innerText = (value) ? value : "\n";
            } else if (["nopay", "nohoursonsaturday", "nohoursonsunday", "nohoursonpublicholiday"].indexOf( fldName ) > -1){
                let el_img = el_input.children[0];
                if (!!el_img){
                    const imgsrc = (value) ? imgsrc_cross_red : imgsrc_chck01;
                    el_img.setAttribute("src", imgsrc);
                }
            } else if (fldName === "inactive") {
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            };
        }  else if (tblName === "employee"){
            if (["code", "functioncode", "paydatecode"].indexOf( fldName ) > -1){
                // any value is neede to show hover ans let eventlistener work
                el_input.innerText = (value) ? value : "\n";
            } else if (fldName === "inactive") {
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            };
        } else if (["paydatecode", "functioncode"].indexOf( tblName ) > -1){
            if (["code"].indexOf( fldName ) > -1){
                // any value is neede to show hover ans let eventlistener work
                el_input.innerText = (value) ? value : "\n";
            } else if (fldName === "inactive") {
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            };
        }  else if (tblName === "paydateitem"){
            if (["datelast"].indexOf( fldName ) > -1){
                el_input.value = value
            };
        }  else if (tblName === "wagefactor"){
            if (["code"].indexOf( fldName ) > -1){
                // any value is needed to show hover and let eventlistener work
                el_input.innerText = (value) ? value : "\n";
            } else if (fldName === "wagerate") {
                el_input.innerText = (value) ? value : "\n";
                // format_pricerate (loc.user_lang, value_int, is_percentage, show_zero, no_decimals) {
                if(value == null){
                    el_input.innerText = null;
                } else {
                    const wagefactor = 100 * value;
                    // format_pricerate (loc.user_lang, value_int, is_percentage, show_zero, no_decimals)
                    el_input.innerText = format_pricerate (loc.user_lang, wagefactor, true, true, false);
                }
            } else if (fldName === "inactive") {
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            };
        }
// ---  make el_input green for 2 seconds
        const is_updated = get_dict_value (field_dict, ["updated"], false);
        if(is_updated){
            ShowOkElement(el_input, "border_bg_valid")
        }
    }  // UpdateField

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
       //console.log(" --- UpdateSettings ---")
       //console.log("setting_dict", setting_dict)

        selected_btn = get_dict_value(setting_dict, ["sel_btn"], "payrollcrosstab");

        let key = "payroll_period";
        if (key in setting_dict){
            selected_period = setting_dict[key];
            const header_period = UpdateHeaderPeriod();
            // >>> ??? document.getElementById("id_calendar_hdr_text").innerText = header_period;
        }
        // TODO also set tblrow selected when getting saved pk. disable for now
        //selected_paydatecode_pk = get_dict_value(setting_dict, ["sel_paydatecode_pk"])
        //selected_paydateitem_iso = get_dict_value(setting_dict, ["sel_paydate_iso"])
    }  // UpdateSettings

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
       //console.log( "===== UpdateHeaderText  ========= ");
       //console.log( "paydatecodes_inuse_list", paydatecodes_inuse_list);
       //console.log( "selected_paydatecode_pk", selected_paydatecode_pk);
// ---  get caption of paydatecode
        selected_paydatecode_caption = "";
        let item_found = false;
        for (let i = 0, item; item=paydatecodes_inuse_list[i]; i++) {
            if(!!item && item[0] === selected_paydatecode_pk){
                selected_paydatecode_caption = item[1];
                item_found = true;
                break;
        }};
// set selected_paydatecode_pk = null when not in paydatecodes_inuse_list, only in payrollcrosstab tab
        if(!item_found && selected_btn === "payrollcrosstab" ) {selected_paydatecode_pk = null}
       //console.log( "UpdateHeaderText selected_paydatecode_pk", selected_paydatecode_pk);

// ---  get first / last date caption of selected_paydateitem
        selected_paydateitem_caption = "";
        let paydate_caption = "";
        item_found = false;
        for (let i = 0, item; item=paydateitems_inuse_list[i]; i++) {
            // index 0 contains  paydatecode_pk
            if(!!item && item[0] === selected_paydatecode_pk){
                // index 1 contains closingdate, index 2 contains first date of period
                if(item[1] === selected_paydateitem_iso){
                    item_found = true;
                    paydate_caption = format_dateJS_vanilla (get_dateJS_from_dateISO(item[1]),
                                        false, false, true, true); // months_long = true, weekdays_long = true
                    const fistdate_caption = format_dateJS_vanilla (get_dateJS_from_dateISO(item[2]),
                                        false, false, true, true); // months_long = true, weekdays_long = true
                    selected_paydateitem_caption = ((fistdate_caption) ? fistdate_caption : "") + " - " +
                                                   ((paydate_caption) ? paydate_caption : "")
                break;
        }}};
// set selected_paydateitem_iso = null when not in paydateitems_inuse_list
        const is_period_view = get_dict_value(selected_period, ["sel_view"]) === "period"
        if(!item_found) {selected_paydateitem_iso = null}

        let header_text = "";
        if (selected_btn === "order") {
            header_text = loc.Absence_categories;
        } else if (selected_btn === "paydatecode") {
            header_text = loc.Payroll_periods;
        } else if (selected_btn === "functioncode") {
            header_text = (selected_functioncode_pk && selected_functioncode_caption) ?
                            loc.Function + ": " + selected_functioncode_caption : header_text = loc.Functions;

       } else if (["payrollcrosstab", "payrolltabular"].indexOf(selected_btn) > -1) {
            if(is_period_view){
                if (is_payroll_detail_mode){
                    header_text = selected_employee_code + " - " + get_dict_value(selected_period, ["dates_display_short"], "---");
                } else {
                    header_text = loc.Period+ ": " + get_dict_value(selected_period, ["dates_display_short"], "---");
                }
            } else {
                if (is_payroll_detail_mode){
                    header_text = selected_employee_code + " - " + selected_paydateitem_caption;
                } else if(selected_paydateitem_iso){
                    header_text = loc.Payroll_period + ": " + selected_paydateitem_caption
                } else if (selected_paydatecode_pk != null) {
                    header_text += selected_paydatecode_caption;
                } else {
                    header_text = loc.Payroll_period + ":";
                }
            }
        }
        //el_sbr_select_period.value = (selected_period_caption != null) ? selected_period_caption : loc.Choose_period + "...";
        el_sbr_select_payrollperiod.value = (selected_paydatecode_pk != null) ? selected_paydatecode_caption : loc.Choose_payroll_period + "...";
        el_sbr_select_paydate.value = (selected_paydateitem_iso) ? paydate_caption : loc.Choose_closingdate + "...";

        add_or_remove_class(el_sbr_select_payrollperiod, "tsa_color_darkgrey", (!selected_paydatecode_caption) )
        add_or_remove_class(el_sbr_select_paydate, "tsa_color_darkgrey", (!selected_paydateitem_caption) )

       //console.log( "header_text", header_text);
        document.getElementById("id_hdr_text").innerText = header_text
        document.getElementById("id_SBR_hdr_text").innerText = loc.Payroll_2lines

    }  // UpdateHeaderText

//###########################################################################
// +++++++++++++++++ UPLOAD CHANGES +++++++++++++++++ PR2020-06-10
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
                    // ---  hide loader
                    el_loader.classList.add(cls_visible_hide)
                    console.log( "response");
                    console.log( response);
                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const update_dict = response["update_list"][i];
                            UpdateFromResponse(update_dict);
                        }
                    };
                    if ("employee_list" in response){
                        refresh_datamap(response["employee_list"], employee_map)
                        HandleBtnSelect(selected_btn, true)  // true = skip_upload
                    }
                    if ("emplhour_dict" in response){
                        MEP_SetInputElements(response["emplhour_dict"])
                    }
                },  // success: function (response) {
                error: function (xhr, msg) {
                    // ---  hide loader
                    el_loader.classList.add(cls_visible_hide)
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

//========= UploadToggle  ============= PR2020-06-10
    function UploadToggle(el_input) {
        //console.log( " ==== UploadToggle ====");

        const fldName = get_attr_from_el(el_input, "data-field")
        const is_delete = (fldName === "delete")
        const tblRow = get_tablerow_selected(el_input)
       //console.log( "tblRow", tblRow);
        mod_dict = {};
        if(tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const data_pk = get_attr_from_el_int(tblRow, "data-pk")
            const map_id =  tblRow.id // get_map_id(tblName, data_pk)
            const data_map = abscat_map
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
           //console.log( "abscat_map", abscat_map);
           //console.log( "map_id", map_id);
           //console.log( "map_dict", map_dict);
            if(!isEmpty(map_dict)){
                mod_dict = {
                    field: fldName,
                    id: {pk: get_dict_value(map_dict, ["id", "pk"]),
                         ppk: get_dict_value(map_dict, ["id", "ppk"]),
                         table: "order",
                         isabsence: true,
                         rowid: map_id,
                         rowindex: tblRow.rowIndex},
                    code: {value: get_dict_value(map_dict, ["code", "value"], "-")},
                    nopay: {value: get_dict_value(map_dict, ["nopay", "value"], false)},
                    nohoursonsaturday: {value: get_dict_value(map_dict, ["nohoursonsaturday", "value"], false)},
                    nohoursonsunday: {value: get_dict_value(map_dict, ["nohoursonsunday", "value"], false)},
                    nohoursonpublicholiday: {value: get_dict_value(map_dict, ["nohoursonpublicholiday", "value"], false)},
                    inactive: {value: get_dict_value(map_dict, ["inactive", "value"], false)}
                 }
                let new_value = null;
                if(is_delete) {
                    mod_dict.id.delete = true;
                } else {
    // ---  get field value from map_dict
                    const value = get_dict_value(map_dict, [fldName, "value"], false)
    // ---  toggle value
                    new_value = (!value);
                    mod_dict[fldName] = {value: new_value, update: true};
                }  // if (crud_mode === "inactive")
                if(is_delete || (fldName === "inactive" && new_value ) ){
                    const crud_mode = (is_delete) ? "delete" : (fldName === "inactive") ? fldName : null;
                    ModConfirmOpen(crud_mode, mod_dict);
                } else {
    // ---  change icon, before uploading
                    let el_img = el_input.children[0];

           //console.log( "el_img", el_img);
                    if (!!el_img){
                        const imgsrc = (fldName === "inactive") ? ( (new_value) ? imgsrc_inactive_black : imgsrc_inactive_grey ):
                                                                  ( (new_value) ? imgsrc_cross_red : imgsrc_chck01 );
                        el_img.setAttribute("src", imgsrc);
                    }
           //console.log( "mod_dict", mod_dict);
                    UploadChanges(mod_dict, url_payroll_upload);
                }
            }  //  if(!isEmpty(map_dict)){
        }  //   if(!!tblRow)
    }  // UploadToggle

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2020-06-10
    function UpdateFromResponse(update_dict) {
       console.log(" --- UpdateFromResponse  ---");
       console.log("update_dict", deepcopy_dict(update_dict));

//--- get info from updated item
        const tblName = get_dict_value(update_dict, ["id", "table"]);
        const pk_int = get_dict_value(update_dict, ["id", "pk"]);
        const ppk_int = get_dict_value(update_dict, ["id", "ppk"]);
        const is_created = get_dict_value(update_dict, ["id", "created"], false);
        const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);
        const map_id = get_map_id(tblName, pk_int);
        const inactive_changed = get_dict_value(update_dict, ["inactive", "updated"], false)
        //console.log("is_created: ", is_created);
//--- lookup table row of updated item
        let tblRow = document.getElementById(map_id);
// ++++ deleted ++++
        if(is_deleted){
            selected_paydatecode_pk = null;
            selected_paydatecode_caption = null;
            selected_paydateitem_iso = null;
            selected_paydateitem_caption = null;
       //console.log( "UpdateFromResponse selected_paydatecode_pk", selected_paydatecode_pk);
    //--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};
        } else {
// ++++ created ++++
    // add new row if tblRow is_created
            if (is_created){
                const row_code = get_dict_value(update_dict, ["code", "value"])
                let row_index = -1;
                if(row_code){
                    if (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1){
                        const data_map = (tblName === "paydatecode") ? paydatecode_map :
                                         (tblName === "functioncode") ? functioncode_map :
                                         (tblName === "wagefactor") ? wagefactor_map : null
                        row_index = t_get_rowindex_by_code_datefirst(tblBody_paydatecode, tblName, data_map, row_code)
                    }
                }
                const tblBody = (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1) ? tblBody_paydatecode : tblBody_datatable
                tblRow = CreateTblRow(tblBody, selected_btn, pk_int, ppk_int, null, row_index)
            }
    //--- update Table Row
            if(tblRow){
                UpdateTblRow(tblRow, update_dict)
    // ---  scrollIntoView, not in employee table
                if(tblName !== "employee"){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                }
            }
        }  // if(is_deleted)
//--- remove 'updated, deleted created and msg_err from update_dict
        // after updating fields and selectRow
        remove_err_del_cre_updated__from_itemdict(update_dict)
//--- replace updated item in map - after remove_err_del_cre_updated__from_itemdict
        let data_map = (tblName === "order") ? abscat_map :
                        (tblName === "employee") ? employee_map :
                        (tblName === "functioncode") ? functioncode_map :
                        (tblName === "paydatecode") ? paydatecode_map :
                        (tblName === "wagefactor") ? wagefactor_map : null;
        if(is_deleted){
            data_map.delete(map_id);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(map_id, update_dict)
        } else {
            data_map.set(map_id, update_dict)
        }

// ++++ update table filter when inactive changed ++++
        // TODO filter not in use yet
        /*
        if (inactive_changed && !filter_show_inactive){
            // let row disappear when inactive and not filter_show_inactive
            setTimeout(function (){
                const tblName = "order"  // tblName_from_selectedbtn(selected_btn);
                const has_ppk_filter = false  // (tblName !== "employee");
                Filter_TableRows(tblBody_datatable,
                                    tblName,
                                    filter_dict,
                                    filter_show_inactive,
                                    has_ppk_filter,
                                    selected_employee_pk);
            }, 2000);
          }
      */
//--- refresh header text
        UpdateHeaderText();

    }  // UpdateFromResponse(update_list)

//###########################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= HandleFilterToggleRoster  =============== PR2020-09-29
    function HandleFilterToggleRoster(el_input, index) {
        console.log( "===== HandleFilterToggleRoster  ========= ");
        console.log( "index", index);
        //filter_dict = [ [], ["", "2", "text"], ["", "z", "text"] ];
        const value = (filter_dict[index]) ? filter_dict[index] : 0;
        const new_value = Math.abs(value - 1);
        console.log( "new_value", new_value);
        filter_dict[index] = new_value
        console.log( "filter_dict", filter_dict);
        add_or_remove_class(el_input, "stat_0_4", (new_value === 1), "stat_0_0")
        Filter_TableRows();
    };  // HandleFilterToggleRoster
//========= HandlePayrollFilter  ====================================
    function HandlePayrollFilter(el, col_index, el_key) {
       console.log( "===== HandlePayrollFilter  ========= ");
        const skip_filter = t_SetExtendedFilterDict(el, col_index, el_key, filter_dict);
        if ( !skip_filter) {
            if(selected_btn === "payrolltabular"){
                FillTabularRows();
            } else {
                FillCrosstabRows();
            }
        };
        console.log("filter_dict",filter_dict)
    }  // HandlePayrollFilter

//========= HandleFilterChecked  ==================================== PR2020-06-26
    function HandleFilterChecked(el_filter) {
       //console.log( "===== HandleFilterChecked  ========= ");
        // toggle filter_checked
        filter_checked = (!filter_checked)
        // change icon
        const img_src = (filter_checked) ? imgsrc_chck01 : imgsrc_stat00;
        el_filter.children[0].setAttribute("src", img_src);

        for (let i = 0, item, tblRow; tblRow = tblBody_employee.rows[i]; i++) {
            // skip hidden rows
            if (!tblRow.classList.contains(cls_hide)){
                if(filter_checked){
                    tblRow.setAttribute("data-selected", true);
                } else {
                    tblRow.removeAttribute("data-selected")
                }
                const el_div = tblRow.cells[0].children[0];
                el_div.children[0].setAttribute("src", img_src);
            }
        }

    }; // HandleFilterChecked

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
       //console.log( "===== HandleFilterName  ========= ");
        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        const tblRow = get_tablerow_selected(el);
        const tblName = get_attr_from_el(tblRow, "data-table")

// --- reset filter row when clicked on 'Escape'
        let skip_filter = false
        if (el_key === 27) {
            filter_dict = {}
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(el){ el.value = null};
            }
            UpdateHeaderText();
        } else {
            let filter_dict_text = ""
            if (index in filter_dict) {filter_dict_text = filter_dict[index]}
            let el_value_str = (el.value) ? el.value.toString() : "";
            let new_filter = el_value_str.trim().toLowerCase();
            if (!new_filter){
                if (!filter_dict_text){
                    skip_filter = true
                } else {;
                    delete filter_dict[index];
                }
            } else {
                if (new_filter === filter_dict_text) {
                    skip_filter = true
                } else {
                    filter_dict[index] = new_filter;
                }
            }
        }
        Filter_TableRows(tblName);
    }; // HandleFilterName

//========= Filter_TableRows  ==================================== PR2020-06-13
    function Filter_TableRows(tblName) {
        // caleed by HandleFilterName, FillFunctioncodeOrPaydatecodeRows, FillAbscatTableRows, ResetFilterRows
        // table payroll has its own filter
        //console.log( "===== Filter_TableRows  ========= ", tblName);
        //console.log( "filter_dict ", filter_dict);
        const tblBody = (tblName === "employee") ? tblBody_employee :
                        (tblName === "paydatecode") ? tblBody_paydatecode : tblBody_datatable;

// ---  loop through tblBody.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody.rows[i]; i++) {
            show_row = ShowTableRow(tblRow)
            //console.log( "show_row", show_row);
            //console.log( "tblRow", tblRow);
// --- add hours to payroll_totalrow, only when show_row
            //const detail_row = get_dict_value(payroll_period_detail_rows, [tblRow.id])
            //console.log( "detail_row", detail_row);
            //PR2020-06-14 debug: no detail_row when sel_btn = abscat
            //if(detail_row){
            //    if (show_row) { add_to_payroll_totalrow(detail_row)};
    //--- put show/hide in extra column of detail_row // show / hide remembers filter, used in Export_to_Excel
            //    const index_showhide_column = detail_row.length -1;
            //    detail_row[index_showhide_column] = (show_row) ? "show" : "hide";
           // } ;
// ---  show / hide row
            add_or_remove_class(tblRow, cls_hide, !show_row)
        }
// ---  update totalRow
        //const totalRow = document.getElementById("id_PayrollTotalRow")
       // UpdatePayrollTblRow(totalRow, payroll_total_row);
    }; // Filter_TableRows

//========= add_to_payroll_totalrow  ================= PR2020-06-13
    function add_to_payroll_totalrow(row_data) {
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            for (let i = 2, len = row_data.length; i < len; i++) {
                if (row_data[i]) {
                    payroll_total_row[i] += row_data[i];
        }}}
    }  // add_to_payroll_totalrow

//========= ShowTableRow  ==================================== PR2020-01-17
    function ShowTableRow(tblRow) {
        // only called by Filter_TableRows
        // table payroll has its own ShowPayrollRow, called by FillCrosstabRows
        //console.log( "===== ShowTableRow  ========= ");
        let hide_row = false;
        if (!!tblRow){
// show all rows if filter_name = ""
            // TODO create separate filter_dict for paydatecode, goes wrong when two tables om one page
            if (!isEmpty(filter_dict)){
                Object.keys(filter_dict).forEach(function(key) {
                    const filter_text = filter_dict[key];
                    const blank_only = (filter_text === "#")
                    const non_blank_only = (filter_text === "@" || filter_text === "!")
                    let tbl_cell = tblRow.cells[key];
                    if (tbl_cell){
                        let el = tbl_cell.children[0];
                        if (el) {
                    // skip if no filter on this colums
                            if(filter_text){
                    // get value from el.value, innerText or data-value
                                // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                                let el_value = el.innerText;
                                if (blank_only){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(el_value && el_value !== "\n" ){
                                        hide_row = true
                                    };
                                } else if (non_blank_only){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true
                                    }
                                } else {
                                    el_value = el_value.toLowerCase();
                                    // hide row if filter_text not found or el_value is empty
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true;
                                    } else if(el_value.indexOf(filter_text) === -1){
                                        hide_row = true;
                                    }
                                }
                            }  //  if(!!filter_text)c
                        }  // if (!!el) {
                    }  //  if (!!tbl_cell){
                });  // Object.keys(filter_dict).forEach(function(key) {
            }  // if (!hide_row)
        }  // if (!!tblRow)
        return !hide_row
    }; // ShowTableRow

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26 PR2020-06-20
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        if(is_payroll_detail_mod_mode){
            is_payroll_detail_mod_mode = false;
        } else {
            if (selected_btn === "paydatecode"){
                b_EmptyFilterRow(tblHead_employee);
                Filter_TableRows(tblBody_employee);
                b_EmptyFilterRow(tblHead_paydatecode);
                Filter_TableRows(tblBody_paydatecode);
            } else {
                b_EmptyFilterRow(tblHead_datatable)
                Filter_TableRows(tblBody_datatable)
            }
            if (selected_btn === "payrollcrosstab"){
                selected_employee_pk = null;
                selected_employee_code = null;
                if (is_payroll_detail_mode){
                    is_payroll_detail_mode = false;
                }
// --- hide sbr button 'back to payroll overview'
                CreateCrosstabHeader();
                FillCrosstabRows();
                UpdateHeaderText();
            }
        }
    }  // function ResetFilterRows



//=========  HandleBtnAddRemoveSelected  ================ PR2020-06-18
    function HandleBtnAddRemoveSelected(crud_mode) {
        //console.log("========= HandleBtnAddRemoveSelected  ========= ");
        const is_delete = (crud_mode === "remove");

        const sel_code_pk = (is_delete) ? null :
                           (selected_btn === "functioncode") ? selected_functioncode_pk :
                           (selected_btn === "paydatecode") ? selected_paydatecode_pk : null;
        const show_mod_confirm = (!is_delete && !sel_code_pk)


        if (show_mod_confirm){
    // ---  show msgbox when no payrollperiod is selected
            const msg_header_text =  (selected_btn === "functioncode") ? loc.Add_function :
                                     (selected_btn === "paydatecode") ? loc.Link_payrollperiod : null;
            const msg_01_text =  loc.There_is_no +
                                   ( (selected_btn === "functioncode") ? loc.Function.toLowerCase() :
                                    (selected_btn === "paydatecode") ? loc.a_payrollperiod.toLowerCase() : "" ) +
                                    loc.selected + "."
            const msg_02_text =  loc.Select +
                                 ( (selected_btn === "functioncode") ? loc.a_function :
                                 (selected_btn === "paydatecode") ? loc.a_payrollperiod : "" ) +
                                 loc.in_the_list + ", " + loc.by_clicking_the_tickmarkcolumn_infrontof +
                                 ( (selected_btn === "functioncode") ? loc.the_function :
                                 (selected_btn === "paydatecode") ? loc.the_payroll_period : "" ) + ".";

            document.getElementById("id_confirm_header").innerText = msg_header_text;
            document.getElementById("id_confirm_msg01").innerText = msg_01_text;
            document.getElementById("id_confirm_msg02").innerText = msg_02_text;
            document.getElementById("id_confirm_msg03").innerText = null;
            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_cancel.classList.remove(cls_hide);
            el_btn_save.classList.add(cls_hide)
            el_btn_cancel.innerText =  loc.OK
            add_or_remove_class (el_btn_save, "btn-primary", true, "btn-outline-danger")
           $("#id_mod_confirm").modal({backdrop: true});
            setTimeout(function() {el_btn_save.focus()}, 50);

        } else {
            const data_map = (selected_btn === "functioncode") ? functioncode_map :
                                 (selected_btn === "paydatecode") ? paydatecode_map : null;
            const data_dict = get_mapdict_from_datamap_by_tblName_pk(paydatecode_map, "paydatecode", sel_code_pk)
            const code = get_dict_value(data_dict, ["code", "value"])
            const tblBody = document.getElementById("id_tblBody_employee")
            let employee_list = [];
            let employee_pk_list = [];

            for (let i = 0, tblRow; tblRow=tblBody.rows[i]; i++) {
                if(tblRow){
                    const is_selected = (!!get_attr_from_el(tblRow, "data-selected"))
                    if(is_selected){
                        const employee_dict = get_mapdict_from_datamap_by_id(employee_map, tblRow.id)
                        if(!isEmpty(employee_dict)){
                            const employee_pk = get_dict_value(employee_dict, ["id", "pk"]);
                            const employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
                            let dict = {
                                // # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}
                                id: {pk: employee_pk,
                                     ppk: employee_ppk,
                                     table: "employee",
                                     rowid: tblRow.id}
                            }
                            dict[selected_btn] = {pk: sel_code_pk, code: code, update: true}
                            employee_list.push(dict);
                            employee_pk_list.push(employee_pk);

                    //console.log("selected_btn", selected_btn);
                    //console.log("dict", dict);
                        }
                    }
                }
            }
            if(employee_list.length){
                let upload_dict = {
                    id: {table: "employee"},
                    employee_list: employee_list,
                    employee_pk_list: employee_pk_list
                };
                if (selected_btn === "functioncode"){
                    upload_dict.functioncode_pk = sel_code_pk;
                    upload_dict.functioncode_code = code;
                } else if (selected_btn === "paydatecode") {
                    upload_dict.paydatecode_pk = sel_code_pk;
                    upload_dict.paydatecode_code = code;
                }

// ---  show loader when more than 10 employees selected
                if(employee_list.length > 10){
                    el_loader.classList.remove(cls_visible_hide)
                }
                UploadChanges(upload_dict, url_payroll_upload);
            }
        }
    } //  HandleBtnAddRemoveSelected


//=========  HandleEmployeeCodeClicked  ================ PR2020-06-18
    function HandleEmployeeCodeClicked(fldName, el_clicked) {
        //console.log("========= HandleEmployeeCodeClicked  ========= ");
        //console.log("el_clicked", el_clicked);

        const sel_code_pk = (fldName === "functioncode") ? selected_functioncode_pk :
                           (fldName === "paydatecode") ? selected_paydatecode_pk : null;
        const data_map = (fldName === "functioncode") ? functioncode_map :
                             (fldName === "paydatecode") ? paydatecode_map : null;
        const data_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, fldName, sel_code_pk)
        const sel_code_value = get_dict_value(data_dict, ["code", "value"])

        let employee_list = [];
        let employee_pk_list = [];
        let is_remove = false;

        const tblRow = get_tablerow_selected(el_clicked)
        if(tblRow && sel_code_pk){
            const employee_dict = get_mapdict_from_datamap_by_id(employee_map, tblRow.id)
            if(!isEmpty(employee_dict)){
                const employee_pk = get_dict_value(employee_dict, ["id", "pk"]);
                const employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
                const employee_code_pk = get_dict_value(employee_dict, [fldName, "pk"]);
                const employee_code_value = get_dict_value(employee_dict, [fldName, "value"]);

                let dict = {
                    // # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}
                    id: {pk: employee_pk,
                         ppk: employee_ppk,
                         table: "employee",
                         rowid: tblRow.id}
                }
                if(employee_code_pk && employee_code_pk === sel_code_pk ){
                    // remove code when it is the same as seected code
                    dict[fldName] = {pk: null, code: null, update: true}
                    is_remove = true;
                } else {
                    // add sel_code_pk
                    dict[fldName] = {pk: sel_code_pk, code: employee_code_value, update: true}
                }
                employee_list.push(dict);
                employee_pk_list.push(employee_pk);
            let upload_dict = {
                id: {table: "employee"},
                employee_list: employee_list,
                employee_pk_list: employee_pk_list
            };
            upload_dict[fldName + "_pk"] = sel_code_pk;
            upload_dict[fldName + "_code"] = sel_code_value;
// --- put new value in el_clicked
            el_clicked.innerText = (!is_remove) ? sel_code_value : null;
// --- UploadChanges
            UploadChanges(upload_dict, url_payroll_upload);
            }
        }
    }  // HandleEmployeeCodeClicked

//=========  Select_Employee  ================ PR2020-06-18
    function Select_Employee(el_clicked) {
        //console.log("========= Select_Employee  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
            let is_selected = (!!get_attr_from_el(tblRow, "data-selected"))
            is_selected = (!is_selected)
            if(is_selected){
                tblRow.setAttribute("data-selected", true);
            } else {
                tblRow.removeAttribute("data-selected");
            }
            const img_src = (is_selected) ? imgsrc_chck01 : imgsrc_stat00;
            const el_div = tblRow.cells[0].children[0];
            el_div.children[0].setAttribute("src", img_src);
        }
    }  // Select_Employee


//###########################################################################
    function AddnewOpen(col_index, el_clicked) {
        if(selected_btn === "order") { MAC_Open() } else
        if(selected_btn === "paydatecode") { MPP_Open() };
    }

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++

//========= ModPeriodOpen=================== PR2020-07-12
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_period", selected_period) ;
        mod_dict = selected_period;
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
// ---  hide extend period input box
        document.getElementById("id_mod_period_div_extend").classList.add(cls_hide)
// ---  show modal
        $("#id_mod_period").modal({backdrop: true});
}; // function ModPeriodOpen

//=========  ModPeriodSave  ================ PR2020-07-15
    function ModPeriodSave() {
        //console.log("===  ModPeriodSave  =====") ;
// ---  get period_tag
        const period_tag = get_dict_value(mod_dict, ["period_tag"], "tweek");
// ---  create upload_dict
        let payroll_period_dict = {
            sel_btn: selected_btn,
            sel_view: "period",
            now: get_now_arr(),
            period_tag: period_tag,
            extend_index: 0,
            extend_offset: 0};
        // only save dates when tag = "other"
        if(period_tag == "other"){
            if (el_mod_period_datefirst.value) {payroll_period_dict.period_datefirst = el_mod_period_datefirst.value};
            if (el_mod_period_datelast.value) {payroll_period_dict.period_datelast = el_mod_period_datelast.value};
        }
// ---  upload new setting
        let datalist_request = {payroll_period: payroll_period_dict,
                                payroll_list: {get: true}};
        DatalistDownload(datalist_request, "ModPeriodSave");

// hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

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

// +++++++++++++++++ MODAL SIDEBAR SELECT PAYROLL PERIOD +++++++++++++++++++++++++++++++++++

//=========  MSP_Open  ================ PR2020-06-22
    function MSP_Open(col_index, el_clicked) {
       //console.log("========= MSP_Open ========= ");
       //console.log("selected_paydatecode_pk", selected_paydatecode_pk)
       //console.log("selected_paydateitem_iso", selected_paydateitem_iso)

        mod_dict = {paydatecode_pk: selected_paydatecode_pk,  // value '0' is used for blank payrollperiods
                    paydatecode_caption: selected_paydatecode_caption,
                    paydate_iso: selected_paydateitem_iso,
                    paydate_caption: selected_paydateitem_caption};

       //console.log("mod_dict", deepcopy_dict(mod_dict))
// ---  fill select table payrollperiod
        // table will also be filled when input_payrollperiod got focus, but let this one stay
        // otherwise table stays blank until after input_payrollperiod got focus
        const tblName = "payrollperiod";
        MSP_FillSelectTable(tblName);
        MSP_headertext();
        MSP_DisableBtnSave();
// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){ el_MSP_input_payrollperiod.focus() }, 500);
// ---  show modal
        $("#id_mod_select_paydate").modal({backdrop: true});
    }  // MSP_Open

//=========  MSP_Save  ================ PR2020-06-23
    function MSP_Save() {
       //console.log("========= MSP_Save ========= ");
       //console.log("mod_dict", mod_dict);

        const datalist_request = {
            payroll_period: {paydatecode_pk: mod_dict.paydatecode_pk, paydate_iso: mod_dict.paydate_iso},
            payroll_list: {get: true}
            };
        DatalistDownload(datalist_request);

        selected_paydatecode_pk = null;
        selected_paydatecode_caption = null;
        selected_paydateitem_iso = null;
        selected_paydateitem_caption = null;
       //console.log( "MSP_Save selected_paydatecode_pk", selected_paydatecode_pk);

        payroll_period_detail_list = [];

        payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'
        payroll_mapped_columns = {};  // dict of mapped pk > col_index of absence categories in crosstab 'payroll_map'
        //paydatecodes_inuse_list = [];
        //paydateitems_inuse_list = [];

        payroll_header_row = []
        payroll_total_row = [];
        payroll_period_agg_rows = [];
        payroll_period_detail_rows = [];

        is_payroll_detail_mode = false;

        UpdateHeaderText();
        FillCrosstabRows()

// ---  hide modal
        $("#id_mod_select_paydate").modal("hide");

    }  // MSP_Save

//=========  MSP_FillSelectTable  ================ PR2020-06-22
    function MSP_FillSelectTable(tblName) {
       //console.log( "===== MSP_FillSelectTable ========= ", tblName);
        const tblBody_select = el_MSP_tblbody;
        tblBody_select.innerText = null;
        if (tblName === "payrollperiod") {
           // mod_dict.paydatecode_pk = null
            //mod_dict.paydatecode_caption = null;
            el_MSP_input_payrollperiod.value = null
        }
        //mod_dict.paydate_iso = null;
        //mod_dict.paydate_caption = null;
        el_MSP_input_paydate.value = null;

        const data_list = (tblName === "payrollperiod") ? paydatecodes_inuse_list : paydateitems_inuse_list;
       //console.log( "paydateitems_inuse_list", paydateitems_inuse_list);
       //console.log( "paydatecodes_inuse_list", paydatecodes_inuse_list);
        if(data_list){
// --- loop through data_map ,only table paydate is filtered by paydatecode_pk
            data_list.forEach(function (item) {
                const paydatecode_pk = item[0];
                const show_row = (tblName !== "datelast" || paydatecode_pk === mod_dict.paydatecode_pk) ;
                if(show_row){
                    const pk_int = (tblName === "payrollperiod") ? item[0] : item[1];
                    const ppk_int = (tblName === "datelast") ? item[0] : null;
                    const caption = (tblName === "payrollperiod") ? item[1] :
                                    format_dateJS_vanilla (loc, get_dateJS_from_dateISO(item[1]), false, false);
                    const row_id = get_map_id(tblName, pk_int)
// --- insert tblBody_select row
                    const tblRow = tblBody_select.insertRow(-1);
                    tblRow.id = row_id;
                    const data_pk = (tblName === "payrollperiod") ? paydatecode_pk : item[1] ;
                    tblRow.setAttribute("data-pk", pk_int);
                    if(tblName === "datelast"){tblRow.setAttribute("data-ppk", ppk_int)};
                    tblRow.setAttribute("data-value", caption);  // used in t_Filter_SelectRows
                    add_hover(tblRow);
// --- add first td to tblRow.
                    let td = tblRow.insertCell(-1);
                    let el_div = document.createElement("div");
                    el_div.innerText = caption;
                    td.appendChild(el_div);
                    td.classList.add("mx-2", "tw_200", "tsa_bc_transparent")
// --- add addEventListener
                    tblRow.addEventListener("click", function() {MSP_SelecttableClicked(tblName, tblRow)}, false);
// --- highlight selected row
                    const selected_pk = (tblName === "payrollperiod") ? selected_paydatecode_pk : selected_paydateitem_iso ;
                    if(data_pk === selected_pk ) { tblRow.classList.add(cls_selected)}
                   //console.log("data_pk", data_pk, typeof data_pk)
                   //console.log("selected_pk", selected_pk, typeof selected_pk)

        }})};
        const row_count = tblBody_select.rows.length;
        if(row_count === 0){
// --- add first td to tblRow.
            const tblRow = tblBody_select.insertRow(-1);
            const td = tblRow.insertCell(-1);
            const el_div = document.createElement("div");
            el_div.innerText = loc.No_payroll_periods;
            td.appendChild(el_div);
            td.classList.add("mx-2", "tw_200", "tsa_bc_transparent")
        } else if(row_count === 1){
            const first_row = tblBody_select.rows[0]
// --- select first row if table contains only one row td from selectRow.
            first_row.classList.add(cls_selected)
            MSP_SelectItem(tblName, first_row);
            MSP_headertext();
            MSP_DisableBtnSave();
        }
    }  // MSP_FillSelectTable

//=========  MSP_DisableBtnSave  ================ PR2020-06-23
    function MSP_DisableBtnSave() {
        //console.log( "===== MSP_DisableBtnSave ========= ");
        el_MSP_btn_save.disabled = (mod_dict.paydatecode_pk == null || mod_dict.paydate_iso == null);
        el_MSP_input_paydate.readOnly = (mod_dict.paydatecode_pk == null);
    }  // MSP_DisableBtnSave

//=========  MSP_InputOnfocus  ================ PR2020-06-23
    function MSP_InputOnfocus(tblName) {
        //console.log( "MSP_InputOnfocus", tblName);
        MSP_FillSelectTable(tblName)
        MSP_headertext();
        MSP_DisableBtnSave();
    }  // MSP_InputOnfocus

//=========  MSP_InputElementKeyup  ================ PR2020-06-22
    function MSP_InputElementKeyup(tblName, el_input) {
        //console.log( "===== MSP_InputElementKeyup ========= ");
        let new_filter = el_input.value;
// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSP_tblbody, cls_selected)
// ---  reset selected paydatecode_pk, paydate_iso
        if (tblName === "payrollperiod") {
            mod_dict.paydatecode_pk = null;
            mod_dict.paydatecode_caption = null;
            el_MSP_input_paydate.value = null;
        }
        mod_dict.paydate_iso = null;
        mod_dict.paydate_caption = null;
// ---  filter payrollperiod rows
        if (el_MSP_tblbody.rows.length){
            const filterdict = t_Filter_SelectRows(el_MSP_tblbody, new_filter);
// +++  if filter results have only one payrollperiod: select this payrollperiod
            const selected_rowid = get_dict_value(filterdict, ["selected_rowid"])
            if (selected_rowid) {
                const tblRow = document.getElementById(selected_rowid);
                // ---  highlight clicked row
                tblRow.classList.add(cls_selected)

                MSP_SelectItem(tblName, tblRow);
                MSP_headertext();
                MSP_DisableBtnSave();
            }
        };
        //MSO_headertext();
    }; // MSP_InputElementKeyup

//=========  MSP_SelecttableClicked  ================ PR2020-06-23
    function MSP_SelecttableClicked(tblName, tblRow) {
        //console.log( "===== MSP_SelecttableClicked ========= ");
        if(tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  select item
            MSP_SelectItem(tblName, tblRow);
            MSP_headertext();
            MSP_DisableBtnSave();
            if (tblName === "datelast") {
                MSP_Save();

            }
        }
    }  // MSP_SelecttableClicked

//=========  MSP_SelectItem  ================ PR2020-06-23
    function MSP_SelectItem(tblName, tblRow ) {
        //console.log( "===== MSP_SelectItem ========= ");
        let selected_pk = null, selected_ppk = null, selected_caption = null;
        if(tblRow){
            selected_pk = get_attr_from_el(tblRow, "data-pk");
            selected_ppk = get_attr_from_el(tblRow, "data-ppk");
            selected_caption = get_attr_from_el(tblRow, "data-value");
        }

        //console.log( "??filter_dict", filter_dict);
        //console.log( "??selected_pk", selected_pk, typeof selected_pk);
        //console.log( "selected_ppk", selected_ppk, typeof selected_ppk);
        //console.log( "selected_caption", selected_caption);

        if (tblName === "payrollperiod") {
            mod_dict.paydate_iso = null;
            mod_dict.paydate_caption = null;
            if (selected_pk == null) {
                mod_dict.paydatecode_pk = null;
                mod_dict.paydatecode_caption = null;
            } else {
                const selected_pk_int = Number(selected_pk)
    // ---  put pk of selected payrollperiod in mod_dict
                mod_dict.paydatecode_pk = selected_pk_int;
                mod_dict.paydatecode_caption = selected_caption;
// ---  set focus on input_paydate
                set_focus_on_el_with_timeout(el_MSP_input_paydate, 150);
            }
        } else {
            mod_dict.paydate_iso = null;
            mod_dict.paydatecode_pk = null;
            if (selected_pk) {
                const selected_ppk_int = Number(selected_ppk)
                mod_dict.paydate_iso = selected_pk;
                mod_dict.paydatecode_pk = selected_ppk_int;
                mod_dict.paydate_caption = selected_caption;
// ---  set focus on save btn
                set_focus_on_el_with_timeout(el_MSP_btn_save, 150);
            }
        }
        el_MSP_input_payrollperiod.value = mod_dict.paydatecode_caption;
        el_MSP_input_paydate.value = mod_dict.paydate_caption;
// ---  set header text, enable save button
        MSP_headertext();
        MSP_DisableBtnSave()

// ---  fill table paydate when payrollperiod
        if (tblName === "payrollperiod") { MSP_FillSelectTable("datelast")};
    }  // MSP_SelectItem

 //=========  MSP_headertext  ================ PR2020-06-23
    function MSP_headertext() {
        //console.log( "=== MSP_headertext  ");
        //console.log(mod_dict);
        let header_text = null;
        if(mod_dict.paydatecode_pk != null){
            header_text = mod_dict.paydatecode_caption;
            if(mod_dict.paydate_iso != null){header_text += " - " + mod_dict.paydate_caption}
        } else {
            header_text = loc.Payroll_period
        }
        document.getElementById("id_MSP_header").innerText = header_text
    }  // MSO_headertext


// +++++++++++++++++ MODAL SIDEBAR SELECT ORDER +++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SIDEBAR SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SIDEBAR SELECT ABSCAT +++++++++++++++++++++++++++++++++++

// +++++++++++++++++ SIDEBAR SELECT ABSENCE OR SHOW ALL  +++++++++++++++++++++++++++++++++++++++++++


//========= Sidebar_FillOptionsAbsence  ==================================== PR2020-08-15
    function Sidebar_FillOptionsAbsence() {
        //console.log( "=== Sidebar_FillOptionsAbsence  ");
        // isabsence can have value: false: without absence, true: absence only, null: show all
        // selected_value not yet initialized
        //const curOption = (selected_value === true) ? 2 : (selected_value === false) ? 1 : 0
        const option_list = [loc.With_absence, loc.Without_absence, loc.Absence_only]
        let option_text = "";
        for (let i = 0, len = option_list.length; i < len; i++) {
            option_text += "<option value=\"" + i.toString() + "\"";
            //if (i === curOption) {option_text += " selected=true" };
            option_text +=  ">" + option_list[i] + "</option>";
        }
        el_sidebar_select_absence.innerHTML = option_text;

    }  // Sidebar_FillOptionsAbsence


//=========  Sidebar_SelectAbsenceShowall  ================ PR2020-08-15
    function Sidebar_SelectAbsenceShowall(key) {
        //console.log( "===== Sidebar_SelectAbsenceShowall ========= ");
// ---  get selected_option from clicked select element
        // option 2: isabsence = true (absence only) option 1: isabsence = false (no absence) option 1: isabsence = null (absence + no absence)

        let period_dict = {}
        if(key === "isabsence") {
            // when order is selected, absence cannot be shown. Remove order_pk when isabsence = null
            const selected_option = Number(el_sidebar_select_absence.options[el_sidebar_select_absence.selectedIndex].value);
            let selected_value = null;
            switch (selected_option) {
                case 2:  // absence only
                    selected_value = true
                    // when absence only: no order filter can apply. set customer_pk and order_pk to null
                    selected_period.customer_pk = null;
                    selected_period.order_pk = null;
                    period_dict["customer_pk"] = null
                    period_dict["order_pk"] = null
                    break;
                case 1:  // no absence
                    selected_value = false
                    break;
                default:  // absence + no absence
                    // when absence + no absence: no order filter can apply. set customer_pk and order_pk to null
                    selected_period.customer_pk = null;
                    selected_period.order_pk = null;
                    period_dict["customer_pk"] = null
                    period_dict["order_pk"] = null
                    selected_value = null
            }

            period_dict[key] = selected_value
        } else if(key === "showall") {
            period_dict = {employee_pk: null, customer_pk: null, order_pk: null, isabsence: null}
        }
// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in period_dict
        let datalist_request = {payroll_period: period_dict, payroll_list: {mode: "get"}};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectAbsenceShowall

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;
        //console.log("selected_period.customer_pk:", selected_period.customer_pk) ;
        //console.log("selected_period.order_pk:", selected_period.order_pk) ;

        // do not update selected_period.customer_pk until MSO_Save
        mod_MSO_dict = {
            customer_pk: selected_period.customer_pk,
            order_pk: selected_period.order_pk
        };

        el_MSO_input_customer.value = null;
        MSO_FillSelectTableCustomer();
        // MSO_SelectCustomer is called by MSO_FillSelectTableCustomer
        //MSO_FillSelectTableOrder is called by MSO_SelectCustomer
        MSO_headertext();

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){ el_MSO_input_customer.focus() }, 500);

// ---  show modal
         $("#id_modselectorder").modal({backdrop: true});

}; // MSO_Open

//=========  MSO_Save  ================ PR2020-01-29
    function MSO_Save() {
        //console.log("===  MSO_Save =========");
        //console.log( "mod_MSO_dict: ", mod_MSO_dict);

// ---  upload new setting
        let period_dict = {
                customer_pk: mod_MSO_dict.customer_pk,
                order_pk: mod_MSO_dict.order_pk
            };

        // if customer_pk or order_pk has value: set absence to 'without absence'
        if(!!mod_MSO_dict.customer_pk || !!mod_MSO_dict.order_pk) {
            period_dict.isabsence = false;
        }
        const datalist_request = {
            payroll_period: period_dict,
            payroll_list: {get: true}
            };
        DatalistDownload(datalist_request);

// hide modal
        $("#id_modselectorder").modal("hide");
    }  // MSO_Save

//=========  MSO_SelectCustomer  ================ PR2020-01-09
    function MSO_SelectCustomer(tblRow) {
       //console.log( "===== MSO_SelectCustomer ========= ");
       //console.log( "tblRow: ", tblRow);
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];

// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSO_tblbody_customer, cls_selected)
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            let data_pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data_pk)){
                if(data_pk === "addall" ) {
                    mod_MSO_dict.customer_pk = 0;
                    mod_MSO_dict.order_pk = 0;
                    MSO_Save();
                }
            } else {
                const pk_int = Number(data_pk)
                if (pk_int !== mod_MSO_dict.customer_pk){
                    mod_MSO_dict.customer_pk = pk_int;
                    mod_MSO_dict.order_pk = 0;
                }
            }
// ---  put value in input box
            el_MSO_input_customer.value =  get_attr_from_el(tblRow, "data-value");
        } else {

        }
        MSO_FillSelectTableOrder();
        MSO_headertext();
    }  // MSO_SelectCustomer

//=========  MSO_SelectOrder  ================ PR2020-01-09
    function MSO_SelectOrder(tblRow, event_target_NIU, skip_save) {
       //console.log( "===== MSO_SelectOrder ========= ");
       //console.log( "skip_save", skip_save);
// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_modorder_tblbody_order, cls_selected)
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            // el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");
// ---  get pk from id of select_tblRow
            const data_pk_int = Number(get_attr_from_el(tblRow, "data-pk"));
            mod_MSO_dict.order_pk = (!!data_pk_int) ? data_pk_int : 0;
        }
        MSO_headertext();
// ---  save when clicked on tblRow, not when called by script
        if(!skip_save) { MSO_Save() };
    }  // MSO_SelectOrder

//=========  MSO_FilterCustomer  ================ PR2020-01-28
    function MSO_FilterCustomer() {
       //console.log( "===== MSO_FilterCustomer  ========= ");
        let new_filter = el_MSO_input_customer.value;
        //console.log( "new_filter: <" + new_filter + ">");
// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSO_tblbody_customer, cls_selected)
// reset selected customer_pk, order.pk
        mod_MSO_dict.customer_pk = 0;
        mod_MSO_dict.order_pk = 0;
// ---  filter select_customer rows
        if (!!el_MSO_tblbody_customer.rows.length){
            const filter_dict = t_Filter_SelectRows(el_MSO_tblbody_customer, new_filter);
// ---  if filter results have only one customer: put selected customer in el_MSO_input_customer
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_MSO_input_customer.value = get_dict_value(filter_dict, ["selected_value"])
// ---  put pk of selected customer in mod_MSO_dict
                const pk_int = Number(selected_pk)
                if(!!pk_int && pk_int !== mod_MSO_dict.customer_pk){
                    mod_MSO_dict.customer_pk = pk_int;
                }
// ---  Set focus to btn_save
                el_MSO_btn_save.focus()
        }};
        MSO_FillSelectTableOrder();
        MSO_headertext();
    }; // MSO_FilterCustomer

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
       console.log( "===== MSO_FillSelectTableCustomer ========= ");

        const tblHead = null, filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = false, filter_include_absence = false, filter_istemplate = false;
        const addall_to_list_txt = "<" + loc.All_customers + ">";

        t_Fill_SelectTable(el_MSO_tblbody_customer, null, customer_map, "customer", mod_MSO_dict.customer_pk, null,
            MSO_MSE_Filter_SelectRows, null, MSO_SelectCustomer, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected, cls_hover)
// ---  lookup selected tblRow
        let tr_selected = null;
        if(!!mod_MSO_dict.customer_pk) {
            for(let i = 0, tblRow; tblRow = el_MSO_tblbody_customer.rows[i]; i++){
                const customer_pk = get_attr_from_el_int(tblRow, "data-pk");
                if (customer_pk === mod_MSO_dict.customer_pk) {
                    tr_selected = tblRow;
                    break;
                }
            }
        }
       //console.log( "tr_selected: ", tr_selected);
        if(!tr_selected){
// ---  if not found, make 'addall' row selected
           //let tr_addall =  el_MSO_tblbody_customer.rows[0]
           let tr_addall = el_MSO_tblbody_customer.querySelector("[data-pk='addall']");

       //console.log( "tr_addall: ", tr_addall);
           if(!!tr_addall){ tr_selected = tr_addall }
        }
        MSO_SelectCustomer(tr_selected);

    }  // MSO_FillSelectTableCustomer

//=========  MSO_FillSelectTableOrder  ================ PR2020-02-07
    function MSO_FillSelectTableOrder() {
       console.log( "===== MSO_FillSelectTableOrder ========= ");
       //console.log( "mod_MSO_dict.customer_pk: ", mod_MSO_dict.customer_pk);
       //console.log( "mod_MSO_dict.order_pk: ", mod_MSO_dict.order_pk);

// ---  hide div_tblbody_order when no customer selected, reset tblbody_order
        add_or_remove_class (document.getElementById("id_MSO_div_tblbody_order"), cls_hide, !mod_MSO_dict.customer_pk)
        el_modorder_tblbody_order.innerText = null;

        if (!!mod_MSO_dict.customer_pk){
            const filter_ppk_int = mod_MSO_dict.customer_pk, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false;
            const addall_to_list_txt = "<" + loc.All_orders + ">";

            t_Fill_SelectTable(el_modorder_tblbody_order, null, order_map, "order", mod_MSO_dict.customer_pk, null,
                MSO_MSE_Filter_SelectRows, null, MSO_SelectOrder, null, false,
                filter_ppk_int, filter_show_inactive, filter_include_inactive,
                filter_include_absence, filter_istemplate, addall_to_list_txt,
                null, cls_selected, cls_hover);
    // select first tblRow
            const rows_length = el_modorder_tblbody_order.rows.length;
            if(!!rows_length) {
                let firstRow = el_modorder_tblbody_order.rows[0];
                MSO_SelectOrder(firstRow, null, true);  // skip_save = true
                if (rows_length === 1) { el_MSO_btn_save.focus();}
            }
            const head_txt = (!!rows_length) ? loc.Select_order + ":" : loc.No_orders;
            document.getElementById("id_MSO_div_tblbody_header").innerText = head_txt

            el_MSO_btn_save.disabled = (!rows_length);
        }
    }  // MSO_FillSelectTableOrder

//=========  MSO_headertext  ================ PR2020-02-07
    function MSO_headertext() {
        //console.log( "=== MSO_headertext  ");
        let header_text = null;
        if(!!mod_MSO_dict.customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", mod_MSO_dict.customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!mod_MSO_dict.order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_MSO_dict.order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }
        document.getElementById("id_MSO_header").innerText = header_text
    }  // MSO_headertext

// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//========= MSE_Open ====================================  PR2020-02-27
    function MSE_Open (mode) {
        //console.log(" ===  MSE_Open  =====") ;
        // opens modal select open from sidebar
        let employee_pk = (selected_period.employee_pk > 0) ? selected_period.employee_pk : null;
        mod_MSE_dict = {employee: {pk: employee_pk}};

        let tblBody_select = document.getElementById("id_ModSelEmp_tbody_employee");

        // reset el_MRO_input_order
        //el_MRO_input_order.innerText = null;

        const tblHead = null, filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false,
                        addall_to_list_txt = "<" + loc.All_employees + ">";
        // only put employees in list that are in agg_rows

        const employee_agg_map = new Map();
        if(employees_inuse_list) {
            for(let i = 0, row_dict; row_dict = employees_inuse_list[i]; i++){
                console.log("row_dict", row_dict)
                const map_dict = {id: {pk: row_dict.id, table: "employee"}, code: {value: row_dict.code }}
                employee_agg_map.set("emplyee_" + row_dict.id, map_dict)
                console.log("map_dict", map_dict)
            }
        }
        console.log("employee_agg_map", employee_agg_map)

        t_Fill_SelectTable(tblBody_select, tblHead, employee_agg_map, "employee", selected_period.employee_pk, null,
            MSO_MSE_Filter_SelectRows, null, MSE_SelectEmployee, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected, cls_hover );

        MSE_headertext();

// hide button /remove employee'
        document.getElementById("id_MSE_div_btn_remove").classList.add(cls_hide)
// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_modemployee_input_employee.focus()
        }, 500);
    // ---  show modal
         $("#id_mod_select_employee").modal({backdrop: true});
}; // MSE_Open

//=========  MSE_Save  ================ PR2020-01-29
    function MSE_Save() {
        console.log("===  MSE_Save =========");
        const datalist_request = {
            payroll_period: {employee_pk: mod_MSE_dict.employee_pk},
            payroll_list: {get: true}
            };
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
                    mod_MSE_dict.employee_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_period.employee_pk){
                    mod_MSE_dict.employee_pk = pk_int;
                }
            }
// ---  put value in input box
            el_modemployee_input_employee.value = get_attr_from_el(tblRow, "data-value", "")
            MSE_headertext();

            MSE_Save()
        }
    }  // MSE_SelectEmployee

//=========  MSE_FilterEmployee  ================ PR2020-03-01
    function MSE_FilterEmployee() {
        //console.log( "===== MSE_FilterEmployee  ========= ");

// ---  get value of new_filter
        let new_filter = el_modemployee_input_employee.value

        let tblBody = document.getElementById("id_ModSelEmp_tbody_employee");
        const len = tblBody.rows.length;
        if (!!new_filter && !!len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one employee: put selected employee in el_modemployee_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modemployee_input_employee.value = get_dict_value(filter_dict, ["selected_value"])
// ---  put pk of selected employee in mod_MSE_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_MSE_dict.employee_pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_period.employee_pk){
                        mod_MSE_dict.employee_pk = pk_int;
                    }
                }
                MSE_headertext();
// ---  Set focus to btn_save
                el_modemployee_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSE_FilterEmployee

    function MSE_headertext() {
        //console.log( "=== MSE_headertext  ");
        let header_text = null;
        //console.log( "mod_MSE_dict: ", mod_MSE_dict);

        if(!!mod_MSE_dict.employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", mod_MSE_dict.employee_pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.Select_employee
        }

        document.getElementById("id_ModSelEmp_hdr_employee").innerText = header_text

    }  // MSE_headertext

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= Sidebar_DisplayCustomerOrder  ====================================
    function Sidebar_DisplayCustomerOrder() {
        //console.log( "===== Sidebar_DisplayCustomerOrder  ========= ");

        let header_text = null;
        if(!!selected_period.customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_period.customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!selected_period.order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_period.order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }
        el_sidebar_select_order.value = header_text
    }; // Sidebar_DisplayCustomerOrder

//========= Sidebar_DisplayEmployee  ====================================
    function Sidebar_DisplayEmployee() {
        //console.log( "===== Sidebar_DisplayEmployee  ========= ");

        let header_text = null;
        if(!!selected_period.employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_period.employee_pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.All_employees
        }
        el_sidebar_select_employee.value = header_text
    }; // Sidebar_DisplayEmployee



// +++++++++++++++++ MODAL WAGECODE WAGEFACTOR ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MWC_Open  ================ PR2020-07-13
    function MWC_Open(el_clicked) {
       //console.log("========= MWC_Open  ========= ");

// ---  show modal
        $("#id_mod_wagecode").modal({backdrop: true});
    }



// +++++++++++++++++ MODAL FUNCTION CODE ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MFU_Open  ================ PR2020-07-18
    function MFU_Open(el_clicked) {
       //console.log("========= MFU_Open  ========= ");

// ---  reset input box
        el_MFU_input_code.value = null;

// ---  get info from tblRow, is addnew when no tblRow
        const tblRow = get_tablerow_selected(el_clicked);

        const is_addnew = (!tblRow);
        const row_id = (tblRow) ? tblRow.id : null;
        const functioncode_dict = get_mapdict_from_datamap_by_id(functioncode_map, row_id )
        const fldName = get_attr_from_el(el_clicked, "data-field");

// ---  get info from functioncode_dict
        const pk_int = (!is_addnew) ? get_dict_value(functioncode_dict, ["id", "pk"]) : null;
        const ppk_int = (!is_addnew) ? get_dict_value(functioncode_dict, ["id", "ppk"]) :
                                      get_dict_value(company_dict, ["id", "pk"])
        const saved_code = (!is_addnew) ? get_dict_value(functioncode_dict, ["code", "value"]) : null;

// ---  create mod_dict
        mod_dict = {
            pk: pk_int,
            ppk: ppk_int,
            saved_code: saved_code,
            create: is_addnew,
            rowid: row_id
        }
// ---  put info in input code box
        el_MFU_input_code.value = saved_code;
// ---  set focus on input code box
        set_focus_on_el_with_timeout(el_MFU_input_code, 50)
// ---  hide delete btn when is_addnew
        add_or_remove_class(el_MFU_btn_delete, cls_hide, is_addnew )
// ---  disable save button
        MFU_input_keyup(null, null);
// ---  show modal
        $("#id_mod_functioncode").modal({backdrop: true});
    }  // MFU_Open

//=========  MFU_Save  ================ PR2020-07-18
    function MFU_Save(crud_mode) {
        //console.log("========= MFU_Save  ========= ");

        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: "functioncode"} }
        if (mod_dict.rowindex != null) {upload_dict.id.rowindex = mod_dict.rowindex}
        upload_dict.id.ppk = mod_dict.ppk;

        let msg_err = null;
        if(mod_dict.create) {
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = mod_dict.pk;
            if(is_delete) {upload_dict.id.delete = true}
        };

        if(is_delete) {
// ---  make row red when delete, before uploading
            const tblRow = document.getElementById(mod_dict.rowid)
            if(tblRow) {
                add_or_remove_class(tblRow, cls_error, true )
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            }
        } else {
// ---  get info from input box
            const new_value = (el_MFU_input_code.value) ? el_MFU_input_code.value : null;
            if(new_value !== mod_dict.saved_code){
                upload_dict["code"] = {value: new_value, update: true}
            };
         };
// ---  UploadChanges
        if(!msg_err){
// ---  hide modal
            // dont use data-dismiss="modal", becasue when error occurs form must stay open to show msg box
            $("#id_mod_functioncode").modal("hide");
            UploadChanges(upload_dict, url_payroll_upload);
        } else {
            // TODO msg_err err
            alert(msg_err)
        }
    }  // MFU_Save

//=========  MFU_input_keyup  ================  PR2020-07-18
    function MFU_input_keyup(el_input, event_key) {
        //console.log(" -----  MFU_input_keyup   ----")
        //console.log("event_key", event_key)
        let msg_err = null;
        let has_value = false ;
        // el_input does not exist when called on open
        if(el_input){
// ---  check if function code is not blank
            const new_value = el_input.value;
            if (!new_value){
                msg_err = loc.No_description_entered
            } else {
                has_value = true;
// ---  check if function code already exist
                const new_value_lower = new_value.toLowerCase();
                for (const [map_id, item_dict] of functioncode_map.entries()) {
                    const pk_int = get_dict_value(item_dict, ["id", "pk"])
                    // skip current item
                    if (!mod_dict.pk || pk_int !== mod_dict.pk){
                        const item_code = get_dict_value(item_dict, ["code", "value"])
                        if(item_code && item_code.toLowerCase() === new_value_lower){
                            const is_inactive = get_dict_value(item_dict, ["inactive", "value"], false);
                            const exists_text = (is_inactive) ? loc.already_exists_but_inactive : loc.already_exists
                            msg_err = loc.Function + " '" + item_code + "'" +  exists_text;
                            break;
                }}};
            }
        }
        const el_MFU_err_code = document.getElementById("id_MFU_err_code");
        el_MFU_err_code.innerText = msg_err
        add_or_remove_class(el_MFU_err_code, cls_visible_hide, !msg_err)
// ---  Save when clicked on enter and no error
        if(!msg_err && event_key === "Enter"){
            MFU_Save("save");
        } else {
            el_MFU_btn_save.disabled = (!has_value || msg_err);
        }
    }  // MFU_input_keyup

//=========  MFU_SetTickmark  ================ PR2020-07-15
    function MFU_SetTickmark(el_clicked) {
        //console.log("========= MFU_SetTickmark  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
// --- deselect row when clicked on selected row
            const row_pk = get_attr_from_el_int(tblRow, "data-pk")

// ---  set selected null when this row is already selected
            selected_functioncode_pk = (row_pk !== selected_functioncode_pk) ? row_pk : null
            selected_functioncode_caption = null;
            if (selected_functioncode_pk){
                const data_dict = get_mapdict_from_datamap_by_tblName_pk(functioncode_map, "functioncode", selected_functioncode_pk)
                selected_functioncode_caption = get_dict_value(data_dict, ["code", "value"]);
            }

// --- show tickmark on selected row, hide on other rows
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected_functioncode_pk && row_pk_int === selected_functioncode_pk)
                    const img_src = (is_selected_row) ? imgsrc_chck01 : imgsrc_stat00;
                    const el_div = row.cells[0].children[0];
                    el_div.children[0].setAttribute("src", img_src);
                    add_or_remove_class (row, cls_selected, is_selected_row);
            }}

// --- det header text
            UpdateHeaderText()
        }
    }  // MFU_SetTickmark




// +++++++++++++++++ MODAL WAGEFACTOR ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MWF_Open  ================ PR2020-07-13
    function MWF_Open(el_clicked) {
       //console.log("========= MWF_Open  ========= ");

// ---  reset input boxes
        const input_container = document.getElementById("id_MWF_input_container");
        let form_elements = input_container.querySelectorAll(".tsa_input_text");
        for (let i = 0, el; el = form_elements[i]; i++) { el.value = null};

// ---  get info from tblRow, is addnew when no tblRow
        const tblRow = get_tablerow_selected(el_clicked);

        const is_addnew = (!tblRow);
        const row_id = (tblRow) ? tblRow.id : null;
        const wagefactor_dict = get_mapdict_from_datamap_by_id(wagefactor_map, row_id )
        const fldName = get_attr_from_el(el_clicked, "data-field");

// ---  get info from wagefactor_dict
        const pk_int = (!is_addnew) ? get_dict_value(wagefactor_dict, ["id", "pk"]) : null;
        const ppk_int = (!is_addnew) ? get_dict_value(wagefactor_dict, ["id", "ppk"]) :
                                      get_dict_value(company_dict, ["id", "pk"])
        const code = (!is_addnew) ? get_dict_value(wagefactor_dict, ["code", "value"]) : "NEW";
        const wagerate = get_dict_value(wagefactor_dict, ["wagerate", "value"]);

// ---  create mod_dict
        mod_dict = {
            wagefactor_dict: wagefactor_dict,
            create: is_addnew,
            rowid: row_id
        }

// ---  put info in input boxes, set focus on selected field
        let has_set_focus = false;

        form_elements = input_container.querySelectorAll(".tsa_input_text");
        for (let i = 0, el; el = form_elements[i]; i++) {
            const data_field = get_attr_from_el(el, "data-field")
            const value = get_dict_value(mod_dict.wagefactor_dict, [data_field, "value"])
            if(value) {el.value = value };
            if (data_field === fldName) {
                set_focus_on_el_with_timeout(el, 50);
                has_set_focus = true;
            }
        };
// ---  set focus on input code, if not set on selected field
        if(!has_set_focus){set_focus_on_el_with_timeout(document.getElementById("id_MWF_input_code"), 50) }
// ---  disable save button
        MWF_input_keyup(null, null);
// ---  show modal
        $("#id_mod_wagefactor").modal({backdrop: true});
    }

//=========  MWF_Save  ================ PR2020-07-13
    function MWF_Save(crud_mode) {
        //console.log("========= MWF_Save  ========= ");

        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: "wagefactor"} }
        if (mod_dict.rowindex != null) {upload_dict.id.rowindex = mod_dict.rowindex}
        let msg_err = null;
        if(mod_dict.create) {
            upload_dict.id.ppk = get_dict_value(company_dict, ["id", "pk"])
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = get_dict_value(mod_dict.wagefactor_dict, ["id", "pk"]);
            upload_dict.id.ppk = get_dict_value(mod_dict.wagefactor_dict, ["id", "ppk"]);
            if(is_delete) {upload_dict.id.delete = true}
        };

        //console.log("mod_dict", mod_dict);
        if(is_delete) {
// ---  make row red when delete, before uploading
            const tblRow = document.getElementById(mod_dict.rowid)
            if(tblRow) {
                add_or_remove_class(tblRow, cls_error, true )
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            }
        } else {
// ---  put info in input boxes
            const input_container = document.getElementById("id_MWF_input_container");
            const form_elements = input_container.querySelectorAll(".tsa_input_text");
            for (let i = 0, el; el = form_elements[i]; i++) {
                const fldName = get_attr_from_el(el, "data-field")
                const new_value = (el.value) ? el.value : null;
                let old_value = null;
                if(fldName === "wagerate") {
                    const arr = get_number_from_input(loc, "wagerate", el.value);
                    msg_err = arr[1];
                    old_value = arr[0];
                } else {
                    old_value = get_dict_value(mod_dict.wagefactor_dict, [fldName, "value"])
                }
                if(new_value !== old_value){
                    upload_dict[fldName] = {value: new_value, update: true}
                };
            };
         };

// ---  UploadChanges
        if(!msg_err){
// ---  hide modal
            // dont use data-dismiss="modal", becasue when error occurs form must stay open to show msg box
            $("#id_mod_wagefactor").modal("hide");
            UploadChanges(upload_dict, url_payroll_upload);
        } else {
            // TODO msg_err err
            alert(msg_err)
        }
    }  // MWF_Save

//=========  MWF_input_keyup  ================  PR2020-07-13
    function MWF_input_keyup(el_input, event_key) {
        //console.log(" -----  MWF_input_keyup   ----")
        //console.log("event_key", event_key)
        // el_input does not exist when called on open
        let msg_err = null;
        const code_is_blank = (!document.getElementById("id_MWF_input_code").value)
        const show_code_is_blank_msg = (code_is_blank && el_input)
        add_or_remove_class(document.getElementById("id_MWF_err_code"), cls_visible_hide, !show_code_is_blank_msg)

        const rate_value = document.getElementById("id_MWF_input_rate").value
        const rate_is_blank = (!rate_value);
        if (rate_is_blank && el_input ){msg_err = loc.Percentage + loc.cannot_be_blank}

        // el_input does not exist when opneing form
        if (!code_is_blank && !rate_is_blank && el_input){
            const fldName = get_attr_from_el(el_input, "data-field");
            if(fldName === 'rate'){
                const arr = get_number_from_input(loc, "wagefactor", el_input.value);
                if (arr[1]) { msg_err = (arr[1]) };
            }
        }
        document.getElementById("id_MWF_err_rate").innerText = msg_err;

        const disable_save_btn = (code_is_blank || rate_is_blank || msg_err)
        el_MWF_btn_save.disabled = disable_save_btn;

    }  // MWF_input_keyup

//=========  MWF_Select  ================ PR2020-07-15
    function MWF_Select(el_clicked) {
        //console.log("========= MWF_Select  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
// --- deselect row when clicked on selected row
            const row_pk = get_attr_from_el_int(tblRow, "data-pk")

            selected_wagefactor_pk = (row_pk !== selected_wagefactor_pk) ? row_pk : null

// --- show tickmark on selected row, hide on other rows
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected_wagefactor_pk && row_pk_int === selected_wagefactor_pk)
                    const img_src = (is_selected_row) ? imgsrc_chck01 : imgsrc_stat00;
                    const el_div = row.cells[0].children[0];
                    el_div.children[0].setAttribute("src", img_src);
                    add_or_remove_class (row, cls_selected, is_selected_row);
        }}}

        MPP_Validate();
    }  // MWF_Select


// +++++++++++++++++ MODAL PAYROLL PERIOD ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MPP_Open  ================ PR2020-06-09
    function MPP_Open(el_clicked) {
       //console.log("========= MPP_Open  ========= ");
// ---  reset input boxes, checkboxes and table 'closingdate'
        const input_container = document.getElementById("id_MPP_input_container");
        let form_elements = input_container.querySelectorAll(".tsa_input_text");
        for (let i = 0, el; el = form_elements[i]; i++) { el.value = null};
        form_elements = input_container.querySelectorAll(".tsa_input_checkbox");
        for (let i = 0, el; el = form_elements[i]; i++) { el.checked = false};
        document.getElementById("id_MPP_closingdate_tbody").innerText = null;
        document.getElementById("id_MPP_closingdate_tfoot").innerText = null;

// ---  get info from tblRow, is addnew when no tblRow
        const tblRow = get_tablerow_selected(el_clicked);
        const is_addnew = (!tblRow);
        let paydatecode_dict = {};
        let row_id = null;
        if(tblRow) {
            const data_pk = get_attr_from_el(tblRow, "data-pk")
            const tblName = get_attr_from_el(tblRow, "data-table")
            paydatecode_dict = get_mapdict_from_datamap_by_tblName_pk(paydatecode_map, tblName, data_pk)
            row_id = tblRow.id;
        }

// ---  get info from paydatecode_dict
        const pk_int = (!is_addnew) ? get_dict_value(paydatecode_dict, ["id", "pk"]) : null;
        const ppk_int = (!is_addnew) ? get_dict_value(paydatecode_dict, ["id", "ppk"]) :
                                      get_dict_value(company_dict, ["id", "pk"])
        const code = (!is_addnew) ? get_dict_value(paydatecode_dict, ["code", "value"]) : loc.Monthly;
        const afascode = get_dict_value(paydatecode_dict, ["afascode", "value"]);
        // TODO : validate unique, add get_paydatecode_with_sequence, enable validate unique on server

// default is monthly
        const recurrence = (!is_addnew) ? get_dict_value(paydatecode_dict, ["recurrence", "value"]) : "monthly";
// default is 31 when is_addnew
        const dayofmonth = (!is_addnew) ? get_dict_value(paydatecode_dict, ["dayofmonth", "value"]) : 31;
        const referencedate_iso = get_dict_value(paydatecode_dict, ["referencedate", "value"]);
// ---  get weekday_index from referencedate_iso
        let weekday_index = 0;
        if (!is_addnew){
            if (referencedate_iso){
                const date_JS = get_dateJS_from_dateISO(referencedate_iso);
                if (date_JS){
                    weekday_index = (!!date_JS.getDay()) ? date_JS.getDay() : 7;  // index 0 is index 7 in weekday_list
                }
            }
        } else {
            weekday_index = 5; // Friday
        }
        const datelast_agg = get_dict_value(paydatecode_dict, ["datelast_agg", "value"]);
        const datefirst_agg = get_dict_value(paydatecode_dict, ["datefirst_agg", "value"]);
// ---  get this year as selected_year, only used in "irregular"
        // TODO get last year from paydateitems, this_year if empty
        const this_year = get_now_arr()[0];
// ---  create mod_dict
        mod_dict = { pk: pk_int, ppk: ppk_int, table: "paydatecode", create: is_addnew,
            code: code, recurrence: recurrence, dayofmonth: dayofmonth, afascode: afascode,
            weekdayindex: weekday_index, referencedate: referencedate_iso,
            datefirst_agg: datefirst_agg, datelast_agg: datelast_agg,
            rowid: row_id,
            selected_year: this_year,
            selected_year_firstday: this_year.toString() + "-01-01",
            selected_year_lastday: this_year.toString() + "-12-31",
            is_onopen: true
        }
       //console.log("mod_dict", mod_dict);
// ---  if is_addnew: calculate code based on default setting
        if (is_addnew) {
            const new_code = MPP_CalculateCode();
            mod_dict.code = new_code;
             document.getElementById("id_MPP_input_code").value = new_code;
        }

// ---  set recurrence checkboxes and show/hide input elements
        MPP_SetRecurrence();

// ---  fill select box with weekdays
        const el_MPP_input_weekday = document.getElementById("id_MPP_input_weekday")
        t_FillOptionsWeekdays(el_MPP_input_weekday, loc)

// ---  set input boxes, comes after FillOptionsWeekdays
        MPP_SetInputElements();
        // TODO give err msg

// ---  fill table with closing dates
        if (recurrence === "irregular" && mod_dict.selected_year){
            MPP_FillClosingdateRows();
        }
// ---  enable / disable save buuton, delete button and input elements
        //MPP_DisableSavebuttons()
        MPP_Validate();

// ---  show modal
        $("#id_mod_payrolperiod").modal({backdrop: true});
    } // MPP_Open

//=========  MPP_Save  ================ PR2020-06-10
    function MPP_Save(crud_mode) {
        //console.log("========= MPP_Save  ========= ");

        const is_delete = (crud_mode === "delete")
        const has_error = MPP_Validate();

// ---  create upload_dict
        let upload_dict = {id: {table: "paydatecode"} }
        if (mod_dict.rowindex != null) {upload_dict.id.rowindex = mod_dict.rowindex}
        let has_err_code = false, has_err_referencedate = false, has_err_closingdates = false;
        if(mod_dict.create) {
            upload_dict.id.ppk = get_dict_value(company_dict, ["id", "pk"])
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = mod_dict.pk;
            upload_dict.id.ppk = mod_dict.ppk;
            if(is_delete) {upload_dict.id.delete = true}
        };

        //console.log("mod_dict", mod_dict);
        if(is_delete) {
// ---  make row red when delete, before uploading
            const tblRow = document.getElementById(mod_dict.rowid)
            if(tblRow) {
                add_or_remove_class(tblRow, cls_error, true )
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            }
        } else if (!has_error) {
            if(mod_dict.code){ upload_dict["code"] = {value: mod_dict.code, update: true} };
            // TODO compare with paydate_dict to check if value has changed
            upload_dict["recurrence"] = {value: mod_dict.recurrence, update: true}
            if(mod_dict.code){ upload_dict["code"] = {value: mod_dict.code, update: true} };

            let paydate_iso = mod_dict.referencedate;
            let weekday_index = null, date = null;

            if(mod_dict.recurrence === "moncthly"){
                upload_dict["dayofmonth"] = {value: mod_dict.dayofmonth, update: true}
            } else if(["biweekly","weekly"].indexOf(mod_dict.recurrence) > -1 ){
                if(mod_dict.recurrence === "weekly"){
                    mod_dict.referencedate = null;
                    if(mod_dict.weekdayindex != null){
                        const now_arr = get_now_arr();
                        const date_JS = new Date(now_arr[0], now_arr[1] - 1, now_arr[2])
                        let today_index = date_JS.getDay()
                        let day_diff = mod_dict.weekdayindex - today_index
                        if (day_diff < 0 ) { day_diff += 7}
                        const referencedate = add_daysJS(date_JS, + day_diff)
                        const referencedate_iso = get_dateISO_from_dateJS(referencedate);
                        mod_dict.referencedate = referencedate_iso
                    }
                }
                upload_dict["referencedate"] = {value: mod_dict.referencedate, update: true}

            } else if (mod_dict.recurrence === "irregular"){
                // ---  get closingdates from table if 'irregular'
                let arr_closingdates = [];
                let multipleyears_found = false;
                let year = null;
                let has_closingdates = false;
                const tblBody = document.getElementById("id_MPP_closingdate_tbody")
                for (let i = 0, tblRow; tblRow=tblBody.rows[i]; i++) {
                    const el_input = tblRow.cells[0].children[0];
                    if(el_input && el_input.value){
                        arr_closingdates.push(el_input.value)
                    }
                }
                upload_dict["closingdates"] = {value: arr_closingdates, update: true}
            }
        }  //  else if (!has_error)

// ---  UploadChanges
        if(!has_error){
// ---  hide modal
            // dont use data-dismiss="modal", becasue when error occurs form must stay open to show msg box
            $("#id_mod_payrolperiod").modal("hide");
            UploadChanges(upload_dict, url_payroll_upload);
        }
    }  // MPP_Save


//=========  MPP_Validate  ================  PR2020-07-14
    function MPP_Validate() {
        //console.log(" -----  MPP_Validate   ----")

        let has_err_nocode = false, has_err_referencedate = false, has_err_closingdates = false;
        const has_afascode = (!!mod_dict.afascode);

// ---  hide delete button when is_addnew
        add_or_remove_class(el_MPP_btn_delete, cls_hide, mod_dict.create)

// ---  get code
        const code = mod_dict.code;
        has_err_nocode = (!code);

// ---  create upload_dict
        let paydate_iso = mod_dict.referencedate;
        let weekday_index = null, date = null;

        if(["biweekly","weekly"].indexOf(mod_dict.recurrence) > -1 ){
            has_err_referencedate = (!mod_dict.referencedate);

        } else if (mod_dict.recurrence === "irregular"){
            // ---  get closingdates from table if 'irregular'
            let has_closingdates = false;
            const tblBody = document.getElementById("id_MPP_closingdate_tbody")
            for (let i = 0, tblRow; tblRow=tblBody.rows[i]; i++) {
                const el_input = tblRow.cells[0].children[0];
                if(el_input && el_input.value){
                    has_closingdates = true;
                    break;
                }
            }
            has_err_closingdates = (!has_closingdates);
        }

        const has_error = (has_afascode || has_err_nocode || has_err_referencedate || has_err_closingdates);

        const el_MPP_msg_code = document.getElementById("id_MPP_msg_code")
        const msg_text = (has_afascode) ? loc.payrollperiod_is_imported : (has_err_nocode) ? loc.No_description_entered : loc.can_leave_description_blank;
        el_MPP_msg_code.innerText = msg_text;
        add_or_remove_class (el_MPP_msg_code, "text-danger", (has_afascode || has_err_nocode), "text-muted");

        const el_MPP_msg_biweekly = document.getElementById("id_MPP_msg_biweekly")
        el_MPP_msg_biweekly.innerText = (has_err_referencedate) ? loc.No_closing_date_entered : loc.Closingdate_willbe_every_other_week
        add_or_remove_class (el_MPP_msg_biweekly, "text-danger", has_err_referencedate, "text-muted");

        const el_MPP_year_msg = document.getElementById("id_MPP_msg_year")
        el_MPP_year_msg.innerText = (has_err_closingdates) ? loc.No_closing_dates_entered : loc.Select_year_and_enter_closingdates;
        add_or_remove_class (el_MPP_year_msg, "text-danger", has_err_closingdates, "text-muted");

// disable input elements when has_afascode
        document.getElementById("id_MPP_input_code").readOnly = has_afascode;
        document.getElementById("id_MPP_input_dayofmonth").readOnly = has_afascode;
        document.getElementById("id_MPP_input_weekday").readOnly = has_afascode;
        const input_container = document.getElementById("id_MPP_input_container")
        let form_elements = input_container.querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.disabled = has_afascode;
        }

// disable save btn when has_afascode or when has_error
        el_MPP_btn_delete.disabled = (has_afascode);
        el_MPP_btn_save.disabled = (has_afascode || has_error);

        return has_error;
    }  // MPP_Validate

//=========  MPP_InputChanged  ================  PR2020-06-20
    function MPP_InputChanged(el_clicked) {
        //console.log(" -----  MPP_InputChanged   ----")
        const fldName = get_attr_from_el(el_clicked, "data-field")
        //console.log("fldName", fldName)

        if (["monthly", "biweekly", "weekly", "irregular"].indexOf(fldName) > -1){
            const recurrence_has_changed = MPP_SetRecurrence(el_clicked);
            if (recurrence_has_changed){
                const new_code = MPP_CalculateCode(fldName, mod_dict.referencedate);
                document.getElementById("id_MPP_input_code").value = new_code;
                if (fldName === "irregular"){
                    MPP_FillClosingdateRows();
                }
            }
        } else if (fldName === "dayofmonth"){
            mod_dict.dayofmonth = el_clicked.value;
            const el_msg = document.getElementById("id_MPP_dayofmonth_02");
            add_or_remove_class(el_msg, cls_hide, (!mod_dict.dayofmonth || mod_dict.dayofmonth <= 28) )
        } else if (fldName === "referencedate"){
            mod_dict.referencedate = el_clicked.value;
        } else if (fldName === "weekday"){
            mod_dict.weekdayindex = el_clicked.value
        // calculate referencedate_iso and put it in in mod_dict
            mod_dict.referencedate = MPP_CalculateReferencedate()
        } else if (fldName === "year"){
                mod_dict.selected_year = (Number(el_clicked.value)) ? Number(el_clicked.value) : null
// get firstday and lastday of selected_year
                mod_dict.selected_year_firstday = (mod_dict.selected_year) ? mod_dict.selected_year.toString() + "-01-01" : null;
                mod_dict.selected_year_lastday = (mod_dict.selected_year) ? mod_dict.selected_year.toString() + "-12-31": null;
                MPP_FillClosingdateRows();
        }
        // MPP_CalculateCode creates codes based on mod_dict values
// don't calculate code when input_code has changed, it will undo manually changed code
        // TODO : validate unique, add get_paydatecode_with_sequence, enable validate unique on server
        if (fldName === "code"){
            mod_dict.code = el_clicked.value;
        } else {
            mod_dict.code = MPP_CalculateCode();
            document.getElementById("id_MPP_input_code").value = mod_dict.code;
        }
        MPP_Validate();
    }  // MPP_InputChanged

//=========  MPP_SetInputElements  ================ PR2020-06-20
    function MPP_SetInputElements() {
       //console.log("========= MPP_SetInputElements  ========= ");
       //console.log("mod_dict", mod_dict);

        document.getElementById("id_MPP_input_code").value = mod_dict.code;
        document.getElementById("id_MPP_input_dayofmonth").value = mod_dict.dayofmonth;

        document.getElementById("id_MPP_input_weekday").value = mod_dict.weekdayindex;
        document.getElementById("id_MPP_input_year").value = mod_dict.selected_year;

    }  // MPP_SetInputElements

//=========  MPP_SetRecurrence  ================ PR2020-06-20
    function MPP_SetRecurrence(el_clicked) {
       //console.log("========= MPP_SetRecurrence  ========= ");
        const fldName = get_attr_from_el(el_clicked, "data-field")
        let recurrence_has_changed = false, skip_update = false;

// ---  if fldName is blank this function is called by MPP_Open, use mod_dict value
        if(fldName){
            // cannot uncheck field
            if(!el_clicked.checked) {
                el_clicked.checked = true
                skip_update = true
            } else {
// ---  put new value in mod_dict
                recurrence_has_changed = (mod_dict.recurrence !== fldName)
                mod_dict.recurrence = fldName
            }
        }
// ---  put value in checkboxes, not when skip_update
        if (!skip_update){
            const input_container = document.getElementById("id_MPP_input_container");
            let form_elements = input_container.querySelectorAll(".tsa_input_checkbox")
            for (let i = 0, el; el = form_elements[i]; i++) {
                const field = get_attr_from_el(el, "data-field")
                el.checked = (field === mod_dict.recurrence)
            }
        }
// ---  show only the elements that are used in this recurrence
        const container_element = document.getElementById("id_mod_payrolperiod")
        show_hide_selected_elements_byClass("rec_show", "rec_" + mod_dict.recurrence, container_element)

        MPP_Validate();

        return recurrence_has_changed
    }  // MPP_SetRecurrence

//=========  MPP_CalculateCode  ================ PR2020-06-20
    function MPP_CalculateCode() {
       //console.log("========= MPP_CalculateCode  ========= ");
// don't calculate code when input_code has changed, it will undo manually changed code
        let code =  (mod_dict.recurrence === "monthly") ? loc.Monthly :
                    (mod_dict.recurrence === "biweekly") ? loc.Biweekly :
                    (mod_dict.recurrence === "weekly") ? loc.Weekly :
                    (mod_dict.recurrence === "irregular") ? loc.Payroll_period : "";
        let msg_last_day_of_month = null;
        if (mod_dict.recurrence === "monthly") {
            if (mod_dict.dayofmonth) {
                const suffix = ( [1, 21, 31].indexOf(mod_dict.dayofmonth) > -1) ? loc.date_suffix_st :
                                ( [2, 22].indexOf(mod_dict.dayofmonth) > -1) ? loc.date_suffix_nd :
                                ( [3, 23].indexOf(mod_dict.dayofmonth) > -1) ? loc.date_suffix_rd : loc.date_suffix_th;
                code += loc.date_prefix_thru_the + mod_dict.dayofmonth.toString() + suffix;
                msg_last_day_of_month = (mod_dict.dayofmonth > 28) ? loc.Last_day_of_month_if_not_exists : null;
            }
        } else if (mod_dict.recurrence === "biweekly") {
            if (mod_dict.referencedate) {
                const date_JS = get_dateJS_from_dateISO(mod_dict.referencedate)
                const weekday_index = (date_JS.getDay()) ? date_JS.getDay() : 7;  // index 0 is index 7 in weekday_list
                const weekday_str = loc.weekdays_long[weekday_index];
                if (weekday_str) {code += loc.date_prefix_thru + weekday_str }
            }
        } else if (mod_dict.recurrence === "weekly") {
            if (mod_dict.weekdayindex != null) {
                const weekday_str = loc.weekdays_long[mod_dict.weekdayindex];
                if (weekday_str) {code += loc.date_prefix_thru + weekday_str }
            }
        }
        // TODO error trapping, but not in this function
        return code;
    }  // MPP_CalculateCode

//=========  MPP_CalculateReferencedate  ================ PR2020-06-20
    function MPP_CalculateReferencedate() {
       //console.log("========= MPP_CalculateReferencedate  ========= ");
        let referencedate_iso = null;
        if(mod_dict.weekdayindex != null){
            // calculate first closingdate after today
            const now_arr = get_now_arr();
            const today_JS = new Date(now_arr[0], now_arr[1] - 1, now_arr[2])
            let today_index = today_JS.getDay()
            let day_diff = mod_dict.weekdayindex - today_index;
            if (day_diff < 0 ) { day_diff += 7}
            const referencedate = add_daysJS(today_JS, day_diff)
            referencedate_iso = get_dateISO_from_dateJS(referencedate);
        }
        return referencedate_iso;
    }  // MPP_CalculateReferencedate

//=========  MPP_SetTickmark  ================ PR2020-06-18
    function MPP_SetTickmark(el_clicked) {
        //console.log("========= MPP_SetTickmark  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
// --- deselect row when clicked on selected row
            const row_pk = get_attr_from_el_int(tblRow, "data-pk")
       //console.log("row_pk: " + row_pk);
       //console.log("selected_paydatecode_pk: " + selected_paydatecode_pk);
            // set selected null when this row is already selected
            selected_paydatecode_pk = (row_pk !== selected_paydatecode_pk) ? row_pk : null

       //console.log("new selected_paydatecode_pk: " + selected_paydatecode_pk);
// --- show tickmark on selected row, hide on other rows
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected_paydatecode_pk && row_pk_int === selected_paydatecode_pk)
                    const img_src = (is_selected_row) ? imgsrc_chck01 : imgsrc_stat00;
                    const el_div = row.cells[0].children[0];
                    el_div.children[0].setAttribute("src", img_src);
                    add_or_remove_class (row, cls_selected, is_selected_row);
        }}}

        MPP_Validate();
    }  // MPP_SetTickmark

//========= MPP_FillClosingdateRows  ====================================
    function MPP_FillClosingdateRows() {
        //console.log( "===== MPP_FillClosingdateRows  === ");

// ---  reset tblBody closingdate
        const is_disabled = (!!mod_dict.afascode)
        const tblName = "closingdate"
        const tblBody = document.getElementById("id_MPP_closingdate_tbody")
        tblBody.innerText = null

       //console.log( "mod_dict.selected_year", mod_dict.selected_year);
// get firstday and lastday of selected_year

// get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning

// loop through datelast_agg of paydatecode
        const datelast_list = mod_dict.datelast_agg
        const datefirst_list = mod_dict.datelast_agg
        let datelast_max = null;
        if(datelast_list){
            datelast_list.forEach(function (datelast_iso) {
                let datelast_year = null;
                if(datelast_iso){
                    const datelast_year_str = datelast_iso.slice(0, 4);
                    if(Number(datelast_year_str)){datelast_year = Number(datelast_year_str)};
                }
                if(datelast_year && mod_dict.selected_year && mod_dict.selected_year === datelast_year){
                    let tblRow = CreateTblRow(tblBody, tblName, null, null, null, -1, is_disabled)
                    const el_input = tblRow.cells[0].children[0]
                    el_input.value = datelast_iso;
                    el_input.min = mod_dict.selected_year_firstday;
                    el_input.max =  mod_dict.selected_year_lastday;
                    if (datelast_iso){
                        if ( (!datelast_max) || (datelast_max && datelast_iso > datelast_max) ){
                            datelast_max = datelast_iso;
                        }
                    }
                    el_input.readOnly = is_disabled;
                    // dont use UpdateTblRow(tblRow, item_dict)
                }
            });
        };

// --- loop through paydateitem_map
        for (const [map_id, item_dict] of paydateitem_map.entries()) {
            // filter items from thids paydatecode
            const pk_int = get_dict_value(item_dict, ["id", "pk"], 0);
            const ppk_int = get_dict_value(item_dict, ["id", "ppk"], 0);
            const paydate_iso = get_dict_value(item_dict, ["datelast", "value"]);
            let paydate_year = null;
            if(paydate_iso){
               const year_str = paydate_iso.slice(0, 4);
               if(Number(year_str)){
                paydate_year = Number(year_str)
                };
            }

        }
        mod_dict.datelast_max = datelast_max;

// +++  insert addnew row into tblFoot
        if(!is_disabled){
            const tblFoot = document.getElementById("id_MPP_closingdate_tfoot")
            tblFoot.innerText = null;
            let tblRow = tblFoot.insertRow(-1);
            let td = tblRow.insertCell(-1);
            td.setAttribute("colspan",2)
            let el_div = document.createElement("div");
                el_div.addEventListener("click", function() {MPP_AddClosingdate()}, false)
                add_hover(el_div);
                el_div.innerText = "< " + loc.Add_closingdate + " >"
                el_div.classList.add("pointer_show", "tsa_color_darkgrey", "tsa_transparent")
            td.appendChild(el_div);

            td = tblRow.insertCell(-1);
        }
    }  // MPP_FillClosingdateRows

//=========  MPP_AddClosingdate  ================ PR2020-06-18
    function MPP_AddClosingdate() {
        //console.log("MPP_AddClosingdate");
        let next_dateJS = null, next_date_ISOString = null

        const tblBody = document.getElementById("id_MPP_closingdate_tbody")
// ---  get max closingdate from tblBody.rows
        let datelast_max = null;
        for (let i = 0, row; row = tblBody.rows[i]; i++) {
            let datelast_year = null;
            const datelast_iso = row.cells[0].children[0].value;
            if (datelast_iso){
                if ( (!datelast_max) || (datelast_max && datelast_iso > datelast_max) ){
                    datelast_max = datelast_iso;
            }}
        }
        //console.log("datelast_max", datelast_max);
        if (datelast_max){
            const paydate_max_JS = get_dateJS_from_dateISO (datelast_max)
            //get next_date = same day on next month, but Aug 31 returns Oct 1.
            // correct if the next month is more than 1 month later
            next_dateJS = new Date(paydate_max_JS.getFullYear(), paydate_max_JS.getMonth() + 1, paydate_max_JS.getDate());
            if(next_dateJS.getMonth() > 1 + paydate_max_JS.getMonth() ){
                next_dateJS = get_nextmonth_lastJS_from_dateJS(paydate_max_JS)
            }
           next_date_ISOString = get_dateISO_from_dateJS(next_dateJS);
        } else {
        // if no dates yet: fill in January 31
            next_dateJS = new Date(mod_dict.selected_year, 0, 31);
            next_date_ISOString = get_dateISO_from_dateJS(next_dateJS)
        }
        // make next day = null when not within this year
        if (next_date_ISOString < mod_dict.selected_year_firstday ||
            next_date_ISOString > mod_dict.selected_year_lastday ) {
            next_date_ISOString = null
        }
        //console.log("next_date_ISOString", next_date_ISOString);
// add new row
        const pk_int = null, ppk_int = null;
        //console.log( "--- from MPP_AddClosingdate ");
        let tblRow = CreateTblRow(tblBody, "closingdate", pk_int, ppk_int, null, -1)
        const el_input = tblRow.cells[0].children[0]
//el_input.value = get_dict_value(item_dict, ["datelast", "value"]);
        el_input.value = next_date_ISOString;
        el_input.min = mod_dict.selected_year_firstday;
        el_input.max = mod_dict.selected_year_lastday;
// enable save btmn
         MPP_Validate();
    }  // MPP_AddClosingdate

//=========  MPP_ClosingdateDelete  ================ PR2020-06-18
    function MPP_ClosingdateDelete(el_input) {
        //console.log("MPP_ClosingdateDelete");
    //--- remove deleted tblRow
        const tblRow = get_tablerow_selected(el_input)
        tblRow.parentNode.removeChild(tblRow);
// enable save btmn
        el_MPP_btn_save.disabled = false;
    }  // MPP_ClosingdateDelete

//=========  MPP_DisableSavebuttons  ================ PR2020-06-26
    function MPP_DisableSavebuttons() {
        //console.log("MPP_DisableSavebutton");
        const has_afascode = (!!mod_dict.afascode);

        document.getElementById("id_MPP_input_code").readOnly = has_afascode;
        document.getElementById("id_MPP_input_dayofmonth").readOnly = has_afascode;
        document.getElementById("id_MPP_input_weekday").readOnly = has_afascode;

        const input_container = document.getElementById("id_MPP_input_container")
        let form_elements = input_container.querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.disabled = has_afascode;
        }

// ---  hide delete button when is_addnew
        add_or_remove_class(el_MPP_btn_delete, cls_hide, mod_dict.create)
// disable save btn when has_afascode
        const is_dsabled = has_afascode;
        el_MPP_btn_delete.disabled = is_dsabled;
        el_MPP_btn_save.disabled = is_dsabled;

    }  // MPP_DisableSavebuttons


// +++++++++++++++++ MODAL EMPLHOUR PAYROLL +++++++++++++++++++++++++++++++++++

//=========  MEP_ResetInputElements  ================ PR2020-06-28
    function MEP_ResetInputElements() {
       //console.log("========= MEP_ResetInputElements  ========= ");

        document.getElementById("id_MEP_header").innerText = loc.Roster_shift;

        let form_elements = document.getElementById("id_MEP_input_container").querySelectorAll(".form-control")
        for (let i = 0, el; el = form_elements[i]; i++) {el.innerText = null;}

    }

//=========  MEP_Open  ================ PR2020-06-28
    function MEP_SetInputElements(emplhour_dict) {
       //console.log("========= MEP_SetInputElements  ========= ");
        mod_dict = deepcopy_dict(emplhour_dict);
       //console.log("mod_dict", mod_dict);

        const rosterdate_JS = get_dateJS_from_dateISO(emplhour_dict.rosterdate);
        // hide loader
        document.getElementById("id_MEP_loader").classList.add(cls_hide)

        document.getElementById("id_MEP_header").innerText = emplhour_dict.e_code
        document.getElementById("id_MEP_customer").innerText = emplhour_dict.c_code
        document.getElementById("id_MEP_order").innerText = emplhour_dict.o_code
        document.getElementById("id_MEP_shift").innerText = emplhour_dict.shiftcode
        document.getElementById("id_MEP_rosterdate").innerText = format_dateJS_vanilla (loc, rosterdate_JS, false, false);

        const timestart = format_time_from_rosterdate_offset (loc, rosterdate_JS, emplhour_dict.offsetstart, false, true)
        document.getElementById("id_MEP_timestart").innerText = timestart
        const timeend = format_time_from_rosterdate_offset (loc, rosterdate_JS, emplhour_dict.offsetend, false, true)
        document.getElementById("id_MEP_timeend").innerText = timeend
        document.getElementById("id_MEP_breakduration").innerText = display_duration (emplhour_dict.breakduration, loc.user_lang);
        document.getElementById("id_MEP_timeduration").innerText = display_duration (emplhour_dict.timeduration, loc.user_lang);

        document.getElementById("id_MEP_function").innerText = emplhour_dict.fc_code;
        document.getElementById("id_MEP_wagecode").innerText = emplhour_dict.wc_code;
        document.getElementById("id_MEP_paydatecode").innerText = emplhour_dict.pdc_code;
    }

// +++++++++++++++++ MODAL ABSENCE CATEGORY ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MAC_Open  ================ PR2020-06-09
    function MAC_Open(col_index, el_clicked) {
        //console.log("========= MAC_Open  ========= ");

        mod_dict = {};
// ---  get info from tblRow --------------------------------
        const tblRow = get_tablerow_selected(el_clicked);
        const is_addnew = (!tblRow);
        let abscat_dict = {};
        let row_id = null;
        if(tblRow) {
            const data_pk = get_attr_from_el(tblRow, "data-pk")
            const tblName = get_attr_from_el(tblRow, "data-table")
            abscat_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, tblName, data_pk)
            row_id = tblRow.id;
        }
// ---  create mod_dict
        mod_dict = {
            pk: get_dict_value(abscat_dict, ["id", "pk"]),
            ppk: get_dict_value(abscat_dict, ["id", "ppk"]),
            table: "order",
            create: is_addnew,
            rowid: row_id,
            colindex: col_index
        }
        const array =  ["code", "identifier", "sequence", "nopay", "nohoursonsaturday","nohoursonsunday", "nohoursonpublicholiday"];
        array.forEach(function (key) {mod_dict[key] = get_dict_value(abscat_dict, [key, "value"])});
       //console.log("mod_dict ", mod_dict);

// ---  put abscat_code in header
        const header_text = (mod_dict.code) ? loc.Absence_category + ": " + mod_dict.code : loc.Absence_category;
        document.getElementById("id_MAC_hdr_abscat").innerText = header_text;
// ---  set input boxes
        let el_field = get_attr_from_el(el_clicked, "data-field")
        // these field names in scheme box have multiple fiels in mod scheme. Set focus to first of them
        if(el_field === "datefirstlast"){
            el_field = "datefirst"
        } else if(el_field === "dvg_excl_ph"){
            el_field = (scheme_dict.divergentonpublicholiday) ? "divergentonpublicholiday" : "excludepublicholiday";
        } else if(!el_field){
            el_field = "code"
        }

        // form-control is a bootstrap class, tsa_input_checkbox is a TSA class only used to select input checkboxes
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el, "data-field")
            const value = get_dict_value(mod_dict, [fldName]);
            if(el.type === "checkbox") {
                el.checked = (!!value);
                // checkbox 'pay' has no class tsa_input_checkbox. value is opposite of value 'nopay'
                if (fldName === "nopay"){document.getElementById("id_MAC_pay").checked = (!value) }
            } else {
                el.value = value;
            }
// reset err msg
        document.getElementById("id_MAC_err_code").innerText = null
        document.getElementById("id_MAC_err_sequence").innerText = null
// ---  hide delete abscat button when is_addnew
        if(is_addnew){el_MAC_btn_delete.classList.add(cls_hide)};
// ---  disable btn_save
        el_MAC_btn_save.disabled = true;
// ---  set focus to selected field PR2020-06-09 debug: works only once on checkbox, dont know how to solve it
            if (el_field && fldName === el_field){
                set_focus_on_el_with_timeout(el, 150);
            }
        }
// ---  show modal
        $("#id_mod_abscat").modal({backdrop: true});
    } // MAC_Open

//=========  MAC_Save  ================ PR2020-06-10
    function MAC_Save(crud_mode) {
       //console.log("========= MAC_Save  ========= ");

        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {isabsence: true, table: 'order', rowindex: mod_dict.rowindex } }

        if(mod_dict.create) {
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = mod_dict.pk;
            upload_dict.id.ppk = mod_dict.ppk;
            if(is_delete) {upload_dict.id.delete = true}
        };
// ---  upload textbox values
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el,"data-field")
            if(fldName === "sequence") {
                const arr = get_number_from_input(loc, fldName, el.value)
                // arr[1] containsmsg_err, don't update when error
                if (!arr[1]) {
                    // arr[0] contains number, converted from input_sequence_str
                    if (arr[0] !== mod_dict[fldName]){
                        upload_dict[fldName] = {value: arr[0], update: true}
                }}
            } else {
                if (el.value !== mod_dict[fldName]){
                    upload_dict[fldName] = {value: el.value, update: true}
            // put value in tblRow
            if (mod_dict.rowid){
                const tblRow = document.getElementById(mod_dict.rowid)
                if(tblRow && (mod_dict.colindex || mod_dict.colindex === 0) ){
                    const cell = tblRow.cells[mod_dict.colindex];
                    if(cell && cell.children[0] ){cell.children[0].innerText = el.value}
                }
            }
        }}}
// ---  upload checkbox values
        form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el,"data-field")
            // field 'pay' is opposite of 'nopay'. Nopay will be saved
            if(fldName !== "pay"){
                const input_value = el.checked
                // mod_dict[fldName] can be null, therefore use !!, otherwise you can get (false !== null) = true
                if (el.checked !== (!!mod_dict[fldName])){
                    upload_dict[fldName] = {value: el.checked, update: true}
        }}};

// ---  UploadChanges
        UploadChanges(upload_dict, url_payroll_upload);
    }  // MAC_Save

//=========  MAC_validate_and_disable  ================  PR2020-06-10
    function MAC_validate_and_disable(el_clicked) {
       //console.log(" -----  MAC_validate_and_disable   ----")
        const fldName = get_attr_from_el(el_clicked, "data-field")
        let msg_err = null;
        if(fldName === "code"){
            msg_err = validate_blank_unique_text(loc, abscat_map, "order", fldName, el_clicked.value, mod_dict.pk, true);
        } else if(fldName === "sequence"){
            const arr = get_number_from_input(loc, fldName, el_clicked.value)
            msg_err = arr[1]
        } else if(["pay", "nopay"].indexOf(fldName) > -1){
            const other_fldName = (fldName === "pay") ? "nopay" : "pay";
            const other_field = document.getElementById("id_MAC_" + other_fldName)
            other_field.checked = !el_clicked.checked;
        }
        const el_err = document.getElementById("id_MAC_err_" + fldName)
        if(el_err){ el_err.innerText = msg_err}

        el_MAC_btn_save.disabled = (!!msg_err);
    }  // MAC_validate_and_disable

// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2020-06-10
    function ModConfirmOpen(crud_mode, mod_dict) {
       //console.log(" -----  ModConfirmOpen   ----")
        // mod_dict = {id: {pk: pk_int, ppk: ppk_int, table: "order", isabsence: true, rowindex: row_index} }

        const is_delete = (crud_mode === "delete");
// ---  set header text
        let code_value = null;
        if (mod_dict) {
            code_value = mod_dict.code.value
        } else {
            // called bij submenu delete button

            code_value = (selected_btn === "order") ? loc.Absence_category :
                        (selected_btn === "paydatecode") ? selected_paydatecode_caption :
                        (selected_btn === "functioncode") ? selected_functioncode_caption : "";
        }
        document.getElementById("id_confirm_header").innerText = code_value;

// ---  set msg text
        const caption = (selected_btn === "order") ? loc.This_absence_category :
                        (selected_btn === "paydatecode") ? loc.This_payrollperiod :
                        (selected_btn === "functioncode") ? loc.This_functioncode : "";
        let msg_01_txt = caption + " " + ( (is_delete) ? loc.will_be_deleted : loc.will_be_made_inactive );

        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        document.getElementById("id_confirm_msg02").innerText = loc.Do_you_want_to_continue;
        document.getElementById("id_confirm_msg03").innerText = null;
// ---  show button save and delete
        let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
        let el_btn_save = document.getElementById("id_confirm_btn_save");
        el_btn_cancel.classList.remove(cls_hide);
        el_btn_save.classList.remove(cls_hide)
// ---  set text on button save and delete
        el_btn_save.innerText = (is_delete) ? loc.Yes_delete : loc.Yes_make_inactive;
        el_btn_cancel.innerText =  loc.No_cancel
// ---  make save button red when delete
        el_btn_save.classList.remove( (is_delete) ? "btn-primary" : "btn-outline-danger")
        el_btn_save.classList.add( (is_delete) ? "btn-outline-danger" : "btn-primary")
// ---  show modal, set focus on save button
       $("#id_mod_confirm").modal({backdrop: true});
        setTimeout(function() {el_btn_save.focus()}, 50);
    }  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2020-06-10
    function ModConfirmSave() {
        //console.log("===  ModConfirmSave  =====") ;
        $("#id_mod_confirm").modal("hide");

// ---  upload changes
        const url_str = url_payroll_upload;
        UploadChanges(mod_dict, url_str);
// ---  get tr_changed
        const pk_int = get_dict_value(mod_dict,["id", "pk"]);
        const row_id = mod_dict.id.rowid
        let tblRow = document.getElementById(row_id);
        if(tblRow){
// ---  make row red when delete, before uploading
            if (!!mod_dict.id.delete) {
                tblRow.classList.add(cls_error);
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            } else {
// ---  toggle inactive icon, before uploading
                let el_input = tblRow.querySelector("[data-field=inactive]");
                let el_img = el_input.children[0];
                if (!!el_img){
                    const imgsrc = (mod_dict.inactive.value) ? imgsrc_inactive_black : imgsrc_inactive_grey;
                    el_img.setAttribute("src", imgsrc);
                }
            }
        }
    }



//###########################################################################
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


//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++
    function ExportToExcel(){
        console.log(" === ExportToExcel ===")
// ---  create file Name and worksheet Name
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            let filename = (selected_btn === "payrollcrosstab") ? loc.Overview_rosterhours_per_abscat : loc.Overview_rosterhours;
            if (is_payroll_detail_mode) { filename += " " + selected_employee_code }
            if (selected_paydateitem_iso) { filename += " " + selected_paydateitem_iso }
            filename += ".xlsx";
            let ws_name = loc.Review;
// ---  create new workbook
            let wb = XLSX.utils.book_new()
// ---  create worksheet
            let ws = FillExcelRows(selected_btn);
// --- add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, ws_name);
// ---  write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ====================================
    function FillExcelRows() {
       //console.log("=== FillExcelRows  =====")
        let detail_rows = null;
        if (selected_btn === "payrollcrosstab"){
            detail_rows = (is_payroll_detail_mode) ? payroll_period_detail_rows : payroll_period_agg_rows
        } else if(selected_btn === "payrolltabular"){
            detail_rows = payroll_period_tabular_rows
        }
        const is_period_view = get_dict_value(selected_period, ["sel_view"]) === "period"
        let ws = {};
// --- title row
        let title =  (selected_btn === "payrollcrosstab") ? loc.Overview_rosterhours_per_abscat : loc.Overview_rosterhours
        ws["A1"] = {v: title, t: "s"};
// --- company row
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws["A2"] = {v: company, t: "s"};
// --- date row
        //const period_value = display_planning_period (selected_period, loc);
        //ws["A3"] = {v: period_value, t: "s"};
        const today_JS = new Date();
        const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
        ws["A3"] = {v: today_str, t: "s"};

// ---  employee row
        if(is_period_view){
            const display_period = get_dict_value(selected_period, ["dates_display_short"], "---");
            if (is_payroll_detail_mode){
                ws["A5"] = {v: loc.Employee + ":", t: "s"};
                ws["B5"] = {v: selected_employee_code , t: "s"};

                ws["A6"] = {v: loc.Period + ":", t: "s"};
                ws["B6"] = {v: display_period, t: "s"};
            } else {
                ws["A5"] = {v: loc.Period + ":", t: "s"};
                ws["B5"] = {v: display_period , t: "s"};
            }
        } else {
            if (is_payroll_detail_mode){
                ws["A5"] = {v: loc.Employee + ":", t: "s"};
                ws["B5"] = {v: selected_employee_code , t: "s"};
                ws["A6"] = {v: loc.Payroll_period + ":", t: "s"};
                ws["B6"] = {v: selected_paydateitem_caption, t: "s"};
            } else {
                ws["A5"] = {v: selected_paydatecode_caption, t: "s"};
                ws["A6"] = {v: selected_paydateitem_caption , t: "s"};
            }
        }

// +++  header row
        const header_rowindex =  9
        let excel_header_row = [];
        if (selected_btn === "payrolltabular"){
            excel_header_row = ["", loc.Employee, loc.Date, loc.Order, loc.Start_time, loc.End_time, loc.Planned_hours, loc.Worked_hours,
                                loc.Absence, loc.Total_hours, loc.Wage_factor, loc.Function, loc.Payroll_period]
        } else {
            excel_header_row = payroll_header_row;
        }

        const col_count = excel_header_row.length;
        for (let i = 1; i < col_count; i++) {
            const cell_value = excel_header_row[i];
            // excell index is header_row_index -1 because of margin column in header_row
            const cell_index = b_get_excel_cell_index (i - 1, header_rowindex);
            ws[cell_index] = {v: cell_value, t: "s"};
        }

        const index_first_datarow = header_rowindex + 2;
        let row_index = index_first_datarow;

// --- loop through detail_rows
        //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        if(!!detail_rows){
            for (let j = 0, detail_row;  detail_row = detail_rows[j]; j++) {
                if(detail_row[0]){  //  detail_row[0] = show_row
                    const row_data = detail_row[3]
                    for (let x = 1, len = row_data.length; x < len; x++) {
                        // excell column is header_row_index -1 because of margin column in header_row
                        const excel_col = x - 1

                        const cell_index = b_get_excel_cell_index (excel_col, row_index);

                        const cell_type = get_cell_type(excel_col)
                        ws[cell_index] = {t: cell_type}

                        const cell_format = get_cell_format(excel_col);
                        if(cell_format){ws[cell_index]["z"] = cell_format};

                        const cell_value = get_cell_value(excel_col, row_data[x]);
                        if(cell_value){ws[cell_index]["v"] = cell_value};
                    }
                    row_index += 1;
                }
            }

// +++  add total row
            row_index += 1;
            if (payroll_total_row) {
                let cell_values = [];
                let index_last_datarow = row_index - 2
                if (index_last_datarow < index_first_datarow) {index_last_datarow = index_first_datarow}
                for (let x = 1, len = col_count; x < len; x++) {
                    // excell column is header_row_index -1 because of margin column in header_row
                    const excel_col = x - 1
                    const cell_index = b_get_excel_cell_index (excel_col, row_index);

                    const cell_type = get_cell_type(excel_col, true);
                    ws[cell_index] = {t: cell_type}

                    const cell_format = get_cell_format(excel_col);
                    if(cell_format){ws[cell_index]["z"] = cell_format};

                    if(excel_col === 0) {
                        ws[cell_index]["v"] = loc.Total;
                    } else {
                        const cell_formula = get_cell_formula(excel_col, index_first_datarow, index_last_datarow);
                        if(cell_formula){ws[cell_index]["f"] = cell_formula};
                    }
                }
                row_index += 1;
            }

            const cell_index = b_get_excel_cell_index ( col_count - 1, row_index);
            ws["!ref"] = "A1:" + cell_index;
            // set column width
            const ws_cols = get_col_width(col_count)
            ws['!cols'] = ws_cols;
        }  // if(!!emplhour_map){
        return ws;
    }  // FillExcelRows

    function get_cell_type(excel_col){
        let cell_type = "s";
        if (selected_btn === "payrolltabular"){
           // payrolltabular:: "employee_code", "rosterdate", "c_o_code", "offsetstart", "offsetend",
           //                   "plandur", "timedur", "absdur", "totaldur", "wagefactor", "functioncode", "paydatecode"
            cell_type = ["s", "n", "s", "n", "n", "n", "n", "n", "n", "s", "s", "s"][excel_col];
        } else if (is_payroll_detail_mode){
            // field_caption: [Date", "Order", "Planned_hours", "Worked_hours". ....],
            cell_type = (excel_col === 1) ? "s" : "n";
       } else {
            // field_caption: [" "Employee", "Planned_hours", "Worked_hours"],
            cell_type = (excel_col === 0) ? "s" : "n";
        }
        return cell_type;
    }

    function get_cell_format(excel_col){
        let cell_format = null;
        if (selected_btn === "payrolltabular"){
           // payrolltabular:: "employee_code", "rosterdate", "c_o_code", "offsetstart", "offsetend",
           //                   "plandur", "timedur", "absdur", "totaldur", "wagefactor", "functioncode", "paydatecode"
            if (excel_col === 1) {
                cell_format = "dd mmm yyyy"
            } else if ( [3, 4].indexOf(excel_col) > -1) {
                cell_format = "dd mmm yyyy hh:mm";
            } if ( [5, 6, 7, 8].indexOf(excel_col) > -1) {
                cell_format = "#,##0.00";
            };
        } else if (is_payroll_detail_mode){
            // field_caption: [Date", "Order", "Planned_hours", "Worked_hours". ....],
            if (excel_col === 0) {
                cell_format = "dd mmm yyyy";
            } else if (excel_col > 1) {
                cell_format = "#,##0.00";
            } ;
       } else {
            // field_caption: ["Employee", "Planned_hours", "Worked_hours"],
             if(excel_col > 0 ) {
                cell_format = "#,##0.00";
            };
        }
        return cell_format;
    }

    function get_cell_value(excel_col, fld_value){
        let cell_value = null;
        if (selected_btn === "payrolltabular"){
            // payrolltabular:: "employee_code", "rosterdate", "c_o_code", "offsetstart", "offsetend",
            //                   "plandur", "timedur", "absdur", "totaldur", "wagefactor", "functioncode", "paydatecode"
            if (excel_col === 1) {
                cell_value = fld_value;
            } else if ( [3, 4].indexOf(excel_col) > -1) {
                if( fld_value) { cell_value = fld_value / 1440 };
            } else if ( [5, 6, 7, 8].indexOf(excel_col) > -1) {
                cell_value = fld_value/ 60
            } else {
                cell_value = fld_value
            };
        } else if (is_payroll_detail_mode){
            // field_caption: [Date", "Order", "Planned_hours", "Worked_hours". ....],
            if (excel_col === 0) { cell_value = fld_value} else
            if (excel_col === 1) { cell_value = fld_value} else
            if (fld_value) {cell_value = fld_value / 60};
       } else {
            // field_caption: [" "Employee", "Planned_hours", "Worked_hours"],
            if (excel_col === 0) { cell_value = fld_value } else
            if(fld_value) {cell_value = fld_value / 60};
        }
        return cell_value;
    }

    function get_cell_formula(excel_col, index_first_datarow, index_last_datarow){
        let cell_formula = null, has_formula = false;
        if(selected_btn === "payrolltabular"){
            has_formula = (excel_col > 4);
        }  else if (is_payroll_detail_mode){
            has_formula = (excel_col > 1);
        } else {
            has_formula = (excel_col > 0);
        };
        if ( has_formula ) {
            const cell_first = b_get_excel_cell_index (excel_col, index_first_datarow);
            const cell_last = b_get_excel_cell_index (excel_col, index_last_datarow);
            cell_formula = "SUM(" + cell_first + ":" + cell_last + ")";
        };
        return cell_formula;
    }

    function get_col_width(col_count){
        let ws_cols = []
        for (let i = 0, col_width; i < col_count; i++) {
            if (selected_btn === "payrolltabular"){
                // payrolltabular:: "employee_code", "rosterdate", "c_o_code", "offsetstart", "offsetend",
                //                   "plandur", "timedur", "absdur", "totaldur", "wagefactor", "functioncode", "paydatecode"
                col_width = ([2,11].indexOf(i) > -1) ? 25 : (i === 0) ? 20 : 15;
            } else if (is_payroll_detail_mode){
            // field_caption: [Date", "Order", "Planned_hours", "Worked_hours". ....],
                col_width = (i === 1) ? 25 : 15;
            } else {
            // field_caption: [" "Employee", "Planned_hours", "Worked_hours"],
                col_width = (i === 0) ? 25 : 15;
            }
            ws_cols.push( {wch:col_width} );
        }
        return ws_cols;
    }
}); //$(document).ready(function()
