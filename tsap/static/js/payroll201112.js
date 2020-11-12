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
        const url_emplhour_upload = get_attr_from_el(el_data, "data-emplhour_upload_url");

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

// ---  id of selected employee / functioncode // used in SBR select employee / function. Only one of them can have value
        let selected_MSEF_btn = null  // used to filter selected_employee_pk / selected_functioncode_pk
        let selected_MSEF_pk = -1;  // -1 = all, 0 = shift without emploee
        let selected_MSEF_code = null;

        let selected_detail_employee_pk = -1;  // used to filter in detail_mode. -1 = all, 0 = shifts without emploee
        let selected_detail_employee_code = "";  // PR2020-11-11 debugL: default value 'null' may give error in export to excel
        let selected_employee_pk = -1;  // -1 = all, 0 = shift without emploee
        let selected_employee_code = "";  // PR2020-11-11 debugL: default value 'null' may give error in export to excel
        let selected_functioncode_pk = -1;   // -1 = all, 0 = shift without functioncode
        let selected_functioncode_code = null;
        let selected_isabsence = null;

        let selected_period = {};
        let selected_paydatecode_pk = null;
        let selected_paydatecode_code = "";
        let selected_paydateitem_iso = null;
        let selected_paydateitem_code = "";

        let selected_wagefactor_pk = null;
        let selected_wagefactor_code = null;
        let selected_abscat_pk = null;
        let selected_abscat_code = null;

        let selected_btn = null;
        let selected_view = null;  //selected views are 'calendarperiod' and 'payrollperiod', gets value in DatalistDownload response

        let is_quicksave = false
        let is_payroll_detail_mode = false;
        let is_payroll_detail_modal_mode = false;
        let is_period_paydate = false;

        let selected_col_hidden = [];

        let payroll_needs_update = true;

        let company_dict = {};
        let employee_map = new Map();
        let customer_map = new Map();
        let order_map = new Map();
        let abscat_map = new Map(); // list of all absence categories

        let functioncode_map = new Map();
        let wagefactor_map = new Map();
        let wagecode_map = new Map();

        let paydatecode_map = new Map();
        let paydateitem_map = new Map();

        let payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'
        let paydatecodes_inuse_list = [];
        let paydateitems_inuse_list = [];
        let employees_inuse_list = [];

        let payroll_header_row = []
        let payroll_total_row = [];

        // these 4 lists contain all records and all columns. They are filtered out in FillPayrollRows
        let payroll_detail_list = []; // comes from server, sorted by date, employee_code
        let payroll_agg_list_sorted = [];  // list group and sorted by employee, created by create_agg_list from  payroll_detail_list
        let payroll_period_agg_rows = [];  // HTML, filter and excel , created by CreateHTML_list from payroll_agg_list_sorted
        let payroll_period_detail_rows = [];  // HTML, filter and excel , created by CreateHTML_list from payroll_detail_list

        let abscats_inuse_list_sorted = [];
        let orders_inuse_list_sorted = [];
        let employees_inuse_dictlist = [];
        let functions_inuse_dictlist = [];
        let orders_inuse_dict = {};
        let abscats_inuse_dict = {};

        let payroll_filter_tags = []; // to keep track which columns must be totalled

        let payroll_excel_header = [];
        let payroll_excel_colnames = [];
        let payroll_excel_celltype = [];
        let payroll_excel_cellformat = [];
        let payroll_excel_cellwidth = [];

// const for report
        //let planning_display_duration_total = ""; // stores total hours, calculated when creating payroll_map
        let label_list = [], pos_x_list = [], colhdr_list = [];

// locale_dict with translated text
        let loc = {};

        let mod_dict = {};
        let mod_MSO_dict = {};
        let mod_MSPP_dict = {};

        let filter_select = "";
        let filter_show_inactive = false;
        let filter_dict = {};
        let filter_mod_employee = "";
        let filter_checked = false; // not a filter, but sets employee selected

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const mapped_abscat_fields = {o_code: "code", o_identifier: "identifier", o_sequence: "sequence",
                               o_nopay: "nopay", o_nosat: "nohoursonsaturday",
                               o_nosun: "nohoursonsunday", o_noph: "nohoursonpublicholiday",
                               o_inactive: "inactive"}

        const field_settings = {
            //PR2020-06-02 dont use loc.Employee here, has no value yet.
            abscat: {field_caption: ["", "Absence_category", "Payment", "Saturday_hours", "Sunday_hours", "Public_holiday_hours",  "Identifier", "Priority", ""],
                        field_names: ["margin", "o_code", "o_nopay", "o_nosat", "o_nosun", "o_noph", "o_identifier", "o_sequence", "o_inactive"],
                        filter_tags: ["", "text","triple", "triple", "triple", "triple", "text", "number", "inactive"],
                        field_width:  ["020", "180", "120", "120", "120", "120", "120", "120", "020"],
                        field_align: ["c", "l", "c",  "c", "c", "c", "l", "r", "c"]},
            payroll_agg: { field_caption: ["", "Employee", "ID_number_2lines",  "Payroll_code_abbrev","Planned_hours_2lines", "Total_hours_2lines", "Total_worked_2lines", "", "Total_absence_2lines", "", "Wage_factor", "Function", "Payroll_period", ""],
                        field_names: ["back", "employee_code", "e_identifier",  "payrollcode", "plandur", "totaldur", "timedur", "orderdetail", "absdur", "absdetail", "wagefactorcode", "functioncode", "paydatecode", "margin_end"],
                        filter_tags: ["", "text", "text", "text", "duration", "duration", "duration", "duration", "duration", "duration", "text", "text", "text", "-"],
                        field_width: ["020", "180", "100", "100", "090", "090", "090", "090", "090", "090", "120", "120", "120", "032"],
                        field_align: ["c", "l", "l", "l", "r", "r", "r", "r", "r", "r", "l", "l", "l", "c"]},
            payroll_detail: { field_caption: ["", "Employee", "ID_number_2lines",  "Payroll_code_abbrev","Date", "Order", "Identifier_2lines", "Start_time", "End_time", "Planned_hours_2lines", "Total_hours_2lines", "Total_worked_2lines", "", "Total_absence_2lines", "", "Wage_factor", "Function", "Payroll_period", "margin_end"],
                        field_names: ["status", "employee_code", "e_identifier",  "payrollcode", "rosterdate", "c_o_code", "o_identifier", "offsetstart", "offsetend", "plandur", "totaldur", "timedur", "orderdetail", "absdur", "absdetail", "wagefactorcode", "functioncode", "paydatecode", "margin_end"],
                        filter_tags: ["status", "text", "text", "text", "text", "text", "text", "text", "text", "duration", "duration", "duration", "duration", "duration", "duration", "text", "text", "text", ""],
                        field_width: ["020", "180", "100",  "100",  "090",  "180", "100", "090", "090", "090", "090", "090", "090", "090", "090", "100", "100", "100", "032"],
                        field_align: ["c", "l", "l", "l", "l", "l", "l", "r", "r", "r", "r", "r", "r", "r", "r", "l", "l", "l", "c"]},
            employee: { field_caption: ["", "Employee", "Function", "Payroll_period"],
                        field_names: ["select", "code", "fnc_code", "pdc_code"],
                        filter_tags: ["triple", "text", "text", "text"],
                        field_width: ["020", "180", "120", "180"],
                        field_align: ["c", "l", "l", "l",]},
            paydatecode: {field_caption: ["", "Payroll_period"],
                        field_names:  ["select", "code", "edit", "inactive"],
                        filter_tags: ["", "text", "", "inactive"],
                        field_width: ["020", "200", "020", "020"],
                        field_align: ["c", "l", "c", "c"]},

            functioncode: { field_caption: ["", "Function"],
                        field_names:  ["select", "code", "edit", "inactive"],
                        filter_tags: ["", "text", "", "inactive"],
                        field_width: ["020", "200", "020", "020"],
                        field_align: ["c", "l", "c", "c"]},
            wagecode: { field_caption: ["", "Wage_code", "Hourly_wage"],
                        field_names:  ["select", "code", "wagerate", "" , "inactive", "delete"],
                        filter_tags: ["", "text", "number", "", "inactive"],
                        field_width: ["016",  "150", "120", "032","032"],
                        field_align: ["c", "l", "r", "c", "c"]},
            wagefactor: { field_caption: ["", "Wage_factor", "Percentage", "Default_wagefactor", ""],
                        field_names:  ["select", "code", "wagerate", "isdefault", "inactive"],
                        filter_tags: ["", "text", "number ", "", "inactive"],
                        field_width: ["016", "120", "090", "090", "032"],
                        field_align: ["c", "l", "r", "c", "c"]},
            closingdate: { field_caption: ["Closing_date"],
                        field_names:  ["datelast", "delete"],
                        filter_tags: ["", ""],
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

        const el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") { ResetFilterRows()}
        });

// ---  buttons in btn_container
        const btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(btn)}, false )
        }

// --- buttons add_selected and remove_selected
        const el_btn_add_selected = document.getElementById("id_btn_add_selected");
            el_btn_add_selected.addEventListener("click", function() {HandleBtnAddRemoveSelected("add")}, false );
        const el_btn_remove_selected = document.getElementById("id_btn_remove_selected");
            el_btn_remove_selected.addEventListener("click", function() {HandleBtnAddRemoveSelected("remove")}, false )

// ---  SIDE BAR
// ---  side bar - select period
        const el_sbr_select_period = document.getElementById("id_SBR_select_period");
            el_sbr_select_period.addEventListener("click", function() {MSPP_Open()}, false );
            add_hover(el_sbr_select_period)
// ---  side bar - select order
        const el_sidebar_select_order = document.getElementById("id_SBR_select_order");
            el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
            add_hover(el_sidebar_select_order);
// ---  side bar - select employee - function
        const el_SBR_select_employee_function = document.getElementById("id_SBR_select_employee");
            el_SBR_select_employee_function.addEventListener("click", function() {MSEF_Open()}, false );
            add_hover(el_SBR_select_employee_function);
// ---  side bar - select absence
        const el_sidebar_select_absence = document.getElementById("id_SBR_select_absence");
            el_sidebar_select_absence.addEventListener("change", function() {Sidebar_SelectAbsenceShowall("isabsence")}, false );
            add_hover(el_sidebar_select_absence);
// ---  side bar - showall
        const el_sbr_select_showall = document.getElementById("id_SBR_select_showall");
            el_sbr_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceShowall("showall")}, false );
            add_hover(el_sbr_select_showall);

// === EVENT HANDLERS FOR MODALS ===
// ---  MODAL SELECT PERIOD / PAYDATE ---------------------------
        let el_MSPP_tblbody = document.getElementById("id_MSPP_tblbody");
        // ---  buttons in btn_container
        const MSPP_btns = document.getElementById("id_MSPP_btn_container").children;
        for (let i = 0, btn; btn = MSPP_btns[i]; i++) {
            btn.addEventListener("click", function() {MSPP_BtnSelect(btn)}, false )
        }
        const el_MSPP_datefirst = document.getElementById("id_MSPP_datefirst");
            el_MSPP_datefirst.addEventListener("change", function() {MSPP_DateChanged("datefirst")}, false );
        const el_MSPP_datelast = document.getElementById("id_MSPP_datelast");
            el_MSPP_datelast.addEventListener("change", function() {MSPP_DateChanged("datelast")}, false );
        const el_MSPP_oneday = document.getElementById("id_MSPP__oneday");
            el_MSPP_oneday.addEventListener("change", function() {MSPP_DateChanged("oneday")}, false );

        const el_MSPP_input_paydatecode = document.getElementById("id_MSPP_input_paydatecode")
            el_MSPP_input_paydatecode.addEventListener("focus", function() {MSPP_InputOnfocus("paydatecode")}, false )
            el_MSPP_input_paydatecode.addEventListener("keyup", function(event){
                setTimeout(function() {MSPP_InputElementKeyup("paydatecode", el_MSPP_input_paydatecode)}, 50)});
        const el_MSPP_input_paydateitem = document.getElementById("id_MSPP_input_paydateitem")
            el_MSPP_input_paydateitem.addEventListener("focus", function() {MSPP_InputOnfocus("paydateitem")}, false )
            el_MSPP_input_paydateitem.addEventListener("keyup", function(event){
                setTimeout(function() {MSPP_InputElementKeyup("paydateitem", el_MSPP_input_paydateitem)}, 50)});
        const el_MSPP_input_year = document.getElementById("id_MSPP_input_year")
            el_MSPP_input_year.addEventListener("change", function() {MSPP_InputOnfocus("paydateitem")}, false )
        const el_MSPP_btn_save = document.getElementById("id_MSPP_btn_save")
            el_MSPP_btn_save.addEventListener("click", function() {MSPP_Save()}, false )

// ---  MOD SELECT EMPLOYEE / FUNCTIONOCDE ------------------------------
// ---  buttons in btn_container
        const MSEF_btns = document.getElementById("id_MSEF_btn_container").children;
        for (let i = 0, btn; btn = MSEF_btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {MSEF_BtnSelect(btn)}, false )
        }
        const el_MSEF_input_employee = document.getElementById("id_MSEF_input_employee")
            el_MSEF_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSEF_InputKeyup()}, 50)});
        const el_MSEF_btn_save = document.getElementById("id_MSEF_btn_save")
            el_MSEF_btn_save.addEventListener("click", function() {MSEF_Save()}, false )


// ---  MOD SELECT ORDER ------------------------------
        const el_MSO_tblbody_customer = document.getElementById("id_MSO_tblbody_customer");
        const el_modorder_tblbody_order = document.getElementById("id_MSO_tblbody_order");
        const el_MSO_input_customer = document.getElementById("id_MSO_input_customer")
            el_MSO_input_customer.addEventListener("keyup", function(event){
                setTimeout(function() {MSO_InputKeyup()}, 50)});
        const el_MSO_btn_save = document.getElementById("id_MSO_btn_save")
            el_MSO_btn_save.addEventListener("click", function() {MSO_Save()}, false )


// ---  MODAL ABSENCE CATEGORY
        const MAC_input_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = MAC_input_elements[i]; i++) {
            el.addEventListener("keyup", function(event){
                    setTimeout(function() {MAC_validate_and_disable(el)}, 150)});
        }
        const MAC_checkbox_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = MAC_checkbox_elements[i]; i++) {
            el.addEventListener("change", function() {MAC_validate_and_disable(el)}, false )
        }
        const el_MAC_btn_save = document.getElementById("id_MAC_btn_save");
            el_MAC_btn_save.addEventListener("click", function() {MAC_Save("save")}, false );
        const el_MAC_btn_delete = document.getElementById("id_MAC_btn_delete");
            el_MAC_btn_delete.addEventListener("click", function() {MAC_Save("delete")}, false )


// ---  MODAL PAYROLL PERIOD
        const MPP_input_elements = document.getElementById("id_MPP_input_container").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = MPP_input_elements[i]; i++) {
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
        const el_MWF_input_code = document.getElementById("id_MWF_input_code");
            el_MWF_input_code.addEventListener("keyup", function(event){
                setTimeout(function() {MWF_input_validate(el_MWF_input_code)}, 50)});
        const el_MWF_input_wagerate = document.getElementById("id_MWF_input_wagerate");
            el_MWF_input_wagerate.addEventListener("keyup", function(event){
                setTimeout(function() {MWF_input_validate(el_MWF_input_wagerate)}, 50)});
        const el_MWF_input_default = document.getElementById("id_MWF_input_default");
            el_MWF_input_default.addEventListener("click", function() {MWF_input_validate(el_MWF_input_default)}, false );
        const el_MWF_btn_save = document.getElementById("id_MWF_btn_save");
            el_MWF_btn_save.addEventListener("click", function() {MWF_Save("save")}, false );
        const el_MWF_btn_delete = document.getElementById("id_MWF_btn_delete");
            el_MWF_btn_delete.addEventListener("click", function() {MWF_Save("delete")}, false )

// ---  MOD CONFIRM ------------------------------------
// ---  buttons in ModConfirm
        const el_modconfirm_btn_cancel = document.getElementById("id_confirm_btn_cancel");
        const el_modconfirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_modconfirm_btn_save.addEventListener("click", function() {ModConfirmSave()});

// ---  MOD SELECT COLUMNS  ------------------------------------
        let el_modcolumns_tblbody = document.getElementById("id_modcolumns_tblbody");
        const el_modcolumns_btn_save = document.getElementById("id_modcolumns_btn_save");
            el_modcolumns_btn_save.addEventListener("click", function() {ModColumns_Save()}, false );

// ---  MODAL EMPLHOUR PAYROLL  ------------------------------------
        document.getElementById("id_MEP_btn_log").addEventListener("click", function() {MEP_ShowLog()}, false );
        document.getElementById("id_MEP_btn_save").addEventListener("click", function() {MEP_Save()}, false );

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
            let tr_selected = get_tablerow_selected(event.target)
            if(selected_btn === "payroll_agg" && is_payroll_detail_mode) {
            //console.log( "===== document.addEventListener  ========= ")
            //console.log( "event.target ", event.target)
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
            // payroll_list is also called in HandleBtnSelect when payroll_needs_update = true PR2020-09-24
            payroll_list: {get: true},
            employee_rows: {inactive: false},
            customer_rows: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_rows: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,

            functioncode_rows: {get: true},
            paydatecode_rows: {get: true},
            wagefactor_rows: {get: true},
            wagecode_rows: {get: true},

            abscat_rows: {get: true},
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
        //console.log("datalist_request: ", datalist_request)
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
                    document.getElementById("id_SBR_hdr_text").innerText = loc.Payroll_2lines
// --- create Submenu
                    CreateSubmenu()
                    Sidebar_FillOptionsAbsence();
// --- create table Headers
                    label_list = [loc.Company, loc.Employee, loc.Planning + " " + loc.of, loc.Print_date];
                    pos_x_list = [6, 65, 105, 130, 155, 185];
                    colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];
                }

                if ("payroll_period" in response) {
                    selected_period = response.payroll_period;
                    selected_btn = get_dict_value(selected_period, ["sel_btn"], "payrollperiod")
                    selected_view = get_dict_value(selected_period, ["sel_view"], "calendarperiod")

                    selected_col_hidden = get_dict_value(selected_period, ["col_hidden"], [])
                    selected_paydatecode_pk = get_dict_value(selected_period, ["sel_paydatecode_pk"]);
                    //selected_paydatecode_code = get_dict_value(selected_period, ["sel_paydatecode_pk"]);
                    selected_paydateitem_iso =  get_dict_value(selected_period, ["sel_paydate_iso"]);
                    //selected_paydateitem_code =  get_dict_value(selected_period, ["sel_paydatecode_pk"]);
                    is_period_paydate =(!!selected_paydatecode_pk)
                    console.log("selected_period", selected_period);

                    const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
                    const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
                    el_sidebar_select_absence.value = sel_value_absence;

                    Sidebar_DisplayCustomerOrder();
                    SBR_DisplayEmployeeFunction()
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
        if ("company_dict" in response) {company_dict = response["company_dict"]}
        if ("employee_rows" in response) {refresh_datamap(response.employee_rows, employee_map, "employee")};
        if ("customer_rows" in response) {refresh_datamap(response.customer_rows, customer_map)};
        if ("order_rows" in response) {refresh_datamap(response.order_rows, order_map)};

        if ("abscat_rows" in response) {fill_datamap(abscat_map, response.abscat_rows)};
        if ("functioncode_rows" in response) {fill_datamap(functioncode_map, response.functioncode_rows)};
        if ("wagecode_rows" in response)  {refresh_datamap(response.wagecode_rows, wagecode_map, "wagecode")};
        if ("wagefactor_rows" in response) {fill_datamap(wagefactor_map, response.wagefactor_rows)};

        if ("paydatecode_rows" in response) {fill_datamap(paydatecode_map, response.paydatecode_rows)};
        if ("paydateitem_rows" in response) {fill_datamap(paydateitem_map, response.paydateitem_rows)};

        //if ("paydateitem_list" in response) {refresh_datamap(response.paydateitem_list, paydateitem_map, "paydateitem")}; // tblName not in paydateitem_list

//---------------------
        //if("paydatecodes_inuse_list" in response){paydatecodes_inuse_list = response.paydatecodes_inuse_list};
        //if("paydateitems_inuse_list" in response){paydateitems_inuse_list = response.paydateitems_inuse_list};

//----------------------------
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        if ("payroll_abscat_list" in response){payroll_abscat_list = response.payroll_abscat_list};

        if ("payroll_period_detail_list" in response) {
            payroll_needs_update = false
            payroll_detail_list = response.payroll_period_detail_list;

            create_payroll_agg_list(payroll_detail_list);

        }
        HandleBtnSelect();

    }  // refresh_maps


//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25 PR2020-06-12 PR2020-09-04
    function HandleBtnSelect(btn) {
        //console.log( "===== HandleBtnSelect ========= ");

        // btn only exists when clicked on BtnSelect
        const skip_upload = (!btn);
        if (btn) {selected_btn = get_attr_from_el(btn, "data-btn")};
        if(!selected_btn){selected_btn = "payroll_agg"};

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
        if(el_submenu_addnew){
            el_submenu_addnew.innerText = (selected_btn === "paydatecode") ? loc.Add_payrollperiod :
                                          (selected_btn === "functioncode") ? loc.Add_function :
                                          (selected_btn === "wagecode") ? loc.Add_wagecode :
                                          (selected_btn === "wagefactor") ? loc.Add_wagefactor :
                                          (selected_btn === "abscat") ? loc.Add_abscat : null;
            }
        if(el_submenu_delete){
            el_submenu_delete.innerText = (selected_btn === "paydatecode") ? loc.Delete_payrollperiod :
                                          (selected_btn === "functioncode") ? loc.Delete_function :
                                          (selected_btn === "wagecode") ? loc.Delete_wagecode :
                                          (selected_btn === "wagefactor") ? loc.Delete_wagefactor :
                                          (selected_btn === "abscat") ? loc.Delete_abscat : null;
        }
        // only show submenu item 'upload' when sel_btn =  paydatecode
        add_or_remove_class(document.getElementById("id_submenu_upload"), cls_hide, (selected_btn !== "paydatecode"))

// ---  show only the elements that are used in this tab
        show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn);

// ---  reset selected variables
        selected_paydatecode_pk = null;
        selected_paydatecode_code = "";
        selected_paydateitem_iso = null;
        selected_paydateitem_code = "";
        selected_detail_employee_pk = -1;  // used to filter in detail_mode. -1 = all, 0 = shifts without emploee
        selected_employee_pk = -1;
        selected_employee_code = "";
        selected_functioncode_pk = -1;
        selected_functioncode_code = "";
        selected_isabsence = null;
        selected_wagefactor_pk = null;
        selected_wagefactor_code = "";
        selected_abscat_pk = null;
        selected_abscat_code = null;

        is_payroll_detail_mode = false;
        is_payroll_detail_modal_mode = false;

// ---  fill datatable
        if(["payroll_agg", "payroll_detail"].indexOf(selected_btn) > -1){
            if (payroll_needs_update){
                // note: payroll_period necessary to get period filter, will give error without it
                let datalist_request = {payroll_period: {get: true, sel_btn: selected_btn, now: now_arr}, payroll_list: {get: true}};
                DatalistDownload(datalist_request);
            } else {
                CreateAggHeader(selected_btn);
                CreateHTML_list(selected_btn)
                FillPayrollRows(selected_btn);
            }
        } else if(["paydatecode", "functioncode"].indexOf(selected_btn) > -1){
            FillFunctioncodeOrPaydatecodeRows(selected_btn);
        } else if(["wagefactor", "wagecode"].indexOf(selected_btn) > -1){
            FillWagefactorWagecodeRows(selected_btn);
        } else if(selected_btn === "abscat"){
            FillAbscatTableRows( "HandleBtnSelect")
        }

// --- update header text
        UpdateHeaderText();
    }  // HandleBtnSelect

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);
        // this function is not used in payroll and payroll_detail, those use HandleAggRowClicked instead
        const tblName = get_attr_from_el_str(tr_clicked, "data-table")
        const data_map = get_data_map(tblName)

// ---  deselect all highlighted rows - also tblFoot , highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        DeselectHighlightedTblbody(tblFoot_datatable, cls_selected)

        tr_clicked.classList.add(cls_selected)

        const map_dict = get_mapdict_from_datamap_by_id(data_map, tr_clicked.id);
        if(!isEmpty(map_dict)){
            selected_abscat_pk = map_dict.id;
            selected_abscat_code = map_dict.o_code;
            if (tblName === "abscat") { selected_abscat_pk = map_dict.id; selected_abscat_code = map_dict.o_code }
            else if (tblName === "functioncode") { selected_functioncode_pk = map_dict.id; selected_functioncode_code = map_dict.o_code }
            else if (tblName === "paydatecode")  { selected_paydatecode_pk = map_dict.id; selected_paydatecodet_code = map_dict.o_code }
            else if (tblName === "wagecode") { selected_wagecode_pk = map_dict.id; selected_wagecode_code = map_dict.o_code }
            else if (tblName === "wagefactor")  { selected_wagefactor_pk = map_dict.id; selected_wagefactor_code = map_dict.o_code }
        }
        //if (tblName === "abscat"){
        //    const map_dict = get_mapdict_from_datamap_by_id(abscat_map, tr_clicked.id);
        //    if(!isEmpty(map_dict)){
        //        selected_abscat_pk = map_dict.id;
       //         selected_abscat_code = map_dict.o_code;
       //     }
        //}
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
            MEP_Open(tr_clicked);
        } else {

            // used to filter _employee in detail_mode. -1 = all, 0 = shifts without emploee
            selected_detail_employee_pk = (Number(tr_clicked.id)) ? Number(tr_clicked.id) : 0;

            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_detail_employee_pk)
            selected_detail_employee_code = get_dict_value (map_dict, ["code"], "---");
            is_payroll_detail_mode = true;
            UpdateHeaderText();

            CreateAggHeader("payroll_detail");
            CreateHTML_list("payroll_detail")
            FillPayrollRows("payroll_detail");

        }
    }  // HandleAggRowClicked

//========= HandleAggrowReturn  =================== PR2020-09-03
    function HandleAggrowReturn() {
        //console.log( "===== HandleAggrowReturn  === ");
        const tblName = (selected_btn === "payroll_detail") ? "payroll_detail": "payroll_agg"
        is_payroll_detail_mode = false;
        is_payroll_detail_modal_mode = false;
        selected_employee_pk = -1
        selected_employee_code = "";
        CreateAggHeader(tblName);
        CreateHTML_list(tblName)
        FillPayrollRows(tblName);
        UpdateHeaderText();
   }

//###########################################################################

// +++++++++++++++++ WAGE FACTOR  WAGE CODE +++++++++++++++++++++++++++++++++++++++++++++++++
//========= FillWagefactorWagecodeRows  =================== PR2020-07-13 PR2020-09-05
    function FillWagefactorWagecodeRows(tblName) {
        //console.log( "===== FillWagefactorWagecodeRows  === ");

        tblHead_paydatecode.innerText = null;
        tblBody_paydatecode.innerText = null;
        tblFoot_paydatecode.innerText = null;

        el_btn_add_selected.innerText = "--->\n" + loc.Link_wagefactor_to_shifts;
        el_btn_remove_selected.innerText = "<---\n" + loc.Remove_wagefactor_from_shifts;

// --- create tblHead
        CreateTblHeader(tblName);
        CreateTblFoot(tblName);
// get data_key.
        const data_map = (tblName === "wagefactor") ? wagefactor_map :
                         (tblName === "wagecode") ? wagecode_map : null;

       //console.log( "data_map", data_map);
        if (data_map.size){
        //--- loop through data_map or data_dict
            for (const [map_id, map_dict] of data_map.entries()) {

// --- loop through rows
                const employee_pk = null, is_disabled = false;
                const order_by = (map_dict.code) ? map_dict.code.toLowerCase() : "";
    // CreateTblRow(tblBody, tblName, pk_str, ppk_str, order_by, employee_pk, row_index, is_disabled) {
                const tblRow = CreateTblRow(tblBody_paydatecode, tblName, map_dict.id, map_dict.comp_id, order_by, employee_pk, -1, is_disabled)

// --- loop through cells of tablerow
                for (let i = 0, cell; cell=tblRow.cells[i]; i++) {
                    let el_input = cell.children[0];
                    if(el_input){
                        const fldName = get_attr_from_el(el_input, "data-field")
                        let inner_text = null;
                // --- lookup field in map_dict, get data from field_dict
                        if (fldName === "inactive") {
                            // TODO add_or_remove_class(el_input, "inactive_1_3", map_dict.inactive, "inactive_0_2" )
                        } else if (fldName === "code"){
                            inner_text = map_dict.code;
                        } else if (fldName === "wagerate" && map_dict.wagerate != null){
                             // wagerate  /1.000.000 unitless, 0 = wagefactor 100%  = 1.000.000)
                            // format_pricerate (loc.user_lang, value_int, is_percentage, show_zero, no_decimals)
                            inner_text = format_wagefactor (loc.user_lang, map_dict.wagerate);
                        } else if (fldName === "isdefault"){
                            add_or_remove_class(el_input, "tickmark_0_2", map_dict.isdefault )
                        }
                        el_input.innerText = (inner_text) ? inner_text : "\n";
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            };
        }
        Filter_TableRows();
    }  // FillWagefactorWagecodeRows


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
            const data_map = get_data_map(tblName);

            if(data_map){
    // --- loop through data_map
                for (const [map_id, map_dict] of data_map.entries()) {
                    const pk_int = map_dict.id;
                    const ppk_int = map_dict.comp_id;
                    const order_by = (tblName === "abscat") ? ( (map_dict.o_code) ? map_dict.o_code.toLowerCase() : "" ) :
                                     (tblName === "functioncode") ? ( (map_dict.code) ? map_dict.code.toLowerCase() : "" ) : "";
                    //not necessary: let row_index = t_get_rowindex_by_orderby(tblBody, search_orderby)
                    const  employee_pk = null, row_index = -1, is_disabled = false;
                    const tblRow = CreateTblRow(tblBody, tblName, pk_int, ppk_int, order_by, employee_pk, row_index, is_disabled)

                    UpdateTblRow(tblRow, map_dict)
                }  // for (const [map_id, map_dict] of data_map.entries())
            }  // if(!!data_map)
            //console.log("FillAbscatTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        } ) //  array.forEach(function (tblName)

        Filter_TableRows();
    }  // FillFunctioncodeOrPaydatecodeRows

// +++++++++++++++++ PAYROLL  +++++++++++++++++++++++++++++++++++++++++++++++++

//========= create_payroll_agg_list  ============= PR2020-08-31
    function create_payroll_agg_list(detail_list) {
        //console.log("==== create_payroll_agg_list  ========= ");

        let agg_dict = {};
        let employees_inuse = {};
        let functions_inuse = {};
        let orders_inuse = {};
        let abscats_inuse = {};

        if (detail_list){
            for (let i = 0, row; row = detail_list[i]; i++) {

                //console.log("row", row);
                const employee_pk = (row.e_id) ? row.e_id : 0;
                const employee_code = (row.e_code) ? row.e_code : "---";

                const function_pk = (row.fnc_id) ? row.fnc_id : 0;
                const function_code = (row.fnc_code) ? row.fnc_code : "---";

        //console.log("function_pk ", function_pk, "row.fnc_code", row.fnc_code);
                const order_isabsence = row.isabsence;
                const order_pk = row.order_id;
                let order_code = (row.o_code) ? row.o_code : "-";
                let cust_code = (row.c_code) ? row.c_code : "-";

                // remove tilde from order_code and cust_code
                //if (order_code && order_code.includes("~")){order_code = order_code.replace(/~/g,"")}
                //if (cust_code && cust_code.includes("~")){cust_code = cust_code.replace(/~/g,"")}

// ---  check if employee_dict exists in agg_dict, create if not found
                if(!(employee_pk in agg_dict)) {
                    agg_dict[employee_pk] = {pk: employee_pk,
                                            e_code: employee_code,
                                            e_identifier: row.e_identifier,
                                            e_payrollcode: row.e_payrollcode,
                                            absdur: 0,
                                            plandur: 0,
                                            timedur: 0,
                                            totaldur: 0,
                                            order_dict: {},
                                            abscat_dict: {},
                                            wagefactorcode: {},
                                            functioncode: {},
                                            paydatecode: {}
                                            };
                }
// ---  get  employee_dict
                const employee_dict = agg_dict[employee_pk];

// ---  add employee_code to employees_inuse if not exists
                if(!(employee_pk in employees_inuse)) {
                    employees_inuse[employee_pk] = {pk: employee_pk, code: employee_code };
                }

// ---  add function_code to functions_inuse if not exists
                if(!(function_pk in functions_inuse)) {
                    functions_inuse[function_pk] = {pk: function_pk, code: function_code };
                }

        //console.log("functions_inuse ", functions_inuse);

// ---  add absence order to abscats_inuse if not exists / add normal order to orders_inuse if not exists
                if(row.isabsence) {
                    if(!(order_pk in abscats_inuse)) {
                        abscats_inuse[order_pk] = {pk: order_pk, o_code: order_code, c_code: cust_code };
                    }
                } else {
                    if(!(order_pk in orders_inuse)) {
                        orders_inuse[order_pk] = {pk: order_pk, o_code: order_code, c_code: cust_code };
                    }
                }

                if(row.isabsence) {
// ---  add abscat_dict[order_pk] if not found
                    const abscat_dict = employee_dict.abscat_dict;
                    if(!(order_pk in abscat_dict)) { abscat_dict[order_pk] = 0; }
// ---  add totaldur to abscat_dict[order_pk]
                    abscat_dict[order_pk] += row.totaldur
                } else {
// ---  add order_dict[order_pk] if not found
                    const order_dict = employee_dict.order_dict;
                    if(!(order_pk in order_dict)) { order_dict[order_pk] = 0; }
// ---  add totaldur to order_dict[order_pk]
                    order_dict[order_pk] += row.totaldur
                }
// ---  add dur to totals
                employee_dict.totaldur += row.totaldur
                employee_dict.absdur += row.absdur
                employee_dict.plandur += row.plandur
                employee_dict.timedur += row.timedur

// ---  add functioncode , paydatecode, wagefactorcode
                if(row.fnc_id && !(row.fnc_id in employee_dict.functioncode)) {
                    employee_dict.functioncode[row.fnc_id] = {pk: row.fnc_id, code: row.fnc_code }
                }

        //console.log("employee_dict ", employee_dict);
                if(row.pdc_id && !(row.pdc_id in employee_dict.paydatecode)) {
                    employee_dict.paydatecode[row.pdc_id] = {pk: row.pdc_id, code: row.pdc_code }
                }
                if( (row.wfc_id || row.nopay)  && !(row.wfc_id in employee_dict.wagefactorcode)) {
                    const key = (row.nopay) ? -1 : row.wfc_id;
                    const code = (row.nopay) ? loc.No_payment : (row.wfc_code) ? row.wfc_code : "---";
                    const rate = (row.nopay) ? 0 : ( row.wfc_rate) ?  row.wfc_rate : 0;
                    employee_dict.wagefactorcode[key] = {pk: key, code: code, rate: rate}
                }
        //console.log("employee_dict ", employee_dict);
        //console.log("............... ");

            }  //  for (let i = 0, item; item = detail_list[i]; i++)
        }  // if (detail_list){

// ---  convert dictionary to array
        const agg_list = Object.values(agg_dict);
        //console.log(">>>>>>>>>>>>agg_list", agg_list)
// ---  sort array with sort and b_comparator_code
        payroll_agg_list_sorted = agg_list.sort(b_comparator_e_code);
        //console.log(">>>>>>>>>>>>payroll_agg_list_sorted", payroll_agg_list_sorted)

// ---  convert dictionary 'employees_inuse' to array 'employees_inuse_list'
        const employees_inuse_list = Object.values(employees_inuse);
// ---  sort employees_inuse_list with sort and b_comparator_c_o_code
        employees_inuse_dictlist = employees_inuse_list.sort(b_comparator_c_o_code);

// ---  convert dictionary 'functions_inuse' to array 'functions_inuse_list'
        const functions_inuse_list = Object.values(functions_inuse);
// ---  sort functions_inuse_list with sort and b_comparator_c_o_code
        functions_inuse_dictlist = functions_inuse_list.sort(b_comparator_c_o_code);

// ---  convert dictionary 'orders_inuse' to array 'orders_inuse_list'
        const orders_inuse_list = Object.values(orders_inuse);
// ---  sort orders_inuse_list with sort and b_comparator_c_o_code
        orders_inuse_list_sorted = orders_inuse_list.sort(b_comparator_c_o_code);
        const orders_len = orders_inuse_list_sorted.length;
// ---  convert to orders_inuse_dict, add index and len
        orders_inuse_dict = {len: orders_len};
        for (let i = 0, dict; i < orders_len; i++) {
            dict = orders_inuse_list_sorted[i]
            dict.index = i;
            orders_inuse_dict[dict.pk] = dict
        }


// ---  convert dictionary 'abscats_inuse' to array 'abscats_inuse_list'
        const abscats_inuse_list = Object.values(abscats_inuse);
// ---  sort abscats_inuse_list with sort and b_comparator_c_o_code
        abscats_inuse_list_sorted = abscats_inuse_list.sort(b_comparator_c_o_code);
        const abscats_len = abscats_inuse_list_sorted.length;
// ---  convert to abscats_inuse_dict, add index and abscats_len
        abscats_inuse_dict = {len: abscats_len};
        for (let i = 0, dict; i < abscats_len; i++) {
            dict = abscats_inuse_list_sorted[i]
            dict.index = i;
            abscats_inuse_dict[dict.pk] = dict
        }

        //console.log("payroll_agg_list_sorted", payroll_agg_list_sorted);
    }  // create_payroll_agg_list

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//=========  CreateAggHeader  === PR2020-09-02
    function CreateAggHeader(tblName) {
        //console.log("===  CreateAggHeader ==");

// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

// +++  insert header row ++++++++++++++++++++++++++++++++
        let header_row = tblHead_datatable.insertRow (-1);
        let filter_row = tblHead_datatable.insertRow (-1);
        let total_row = tblHead_datatable.insertRow (-1);
        total_row.id = "id_payroll_totalrow";

        payroll_filter_tags = [];
        payroll_excel_header = [];
        payroll_excel_colnames = [];
        payroll_excel_celltype = [];
        payroll_excel_cellformat = [];
        payroll_excel_cellwidth = [];

//--- insert th's
        // tblName = "payroll_agg" or "payroll_detail"
        let col_index = -1;
        // must use len, otherwise loop will end when payroll_header_row[j] has no value PR2020-07-16
         for (let i = 0, len = field_settings[tblName].field_names.length; i < len; i++) {
            const field_name = field_settings[tblName].field_names[i];

// --- get field_caption etc from field_settings
            const capton_key = field_settings[tblName].field_caption[i];
            let field_caption = (loc[capton_key]) ? loc[capton_key] : null;
            const filter_tag = field_settings[tblName].filter_tags[i];
            const class_width =  "tw_" + field_settings[tblName].field_width[i];
            const class_align = "ta_" + field_settings[tblName].field_align[i];

// ---  skip if field is in list of selected_col_hidden
            if(!selected_col_hidden.includes(field_name)) {

// loop through fields of orderdetail / absdetail abscats, field_count = 1 for other fields
                const inuse_list = (field_name === "orderdetail") ? orders_inuse_list_sorted :
                                    (field_name === "absdetail") ? abscats_inuse_list_sorted : null;
                const field_count = (inuse_list) ? inuse_list.length : 1;

//----------------------------------------------------------
                for (let j = 0; j < field_count; j++) {
                    let caption = null, excel_caption = null, has_border_left = false, has_border_right = false;
                    col_index += 1;
                    if (field_name === "status") {
                        caption = (is_payroll_detail_mode) ? "<" : null;
                    } else if (field_name === "orderdetail") {
                        let o_code = (inuse_list[j].o_code) ? inuse_list[j].o_code : "";
                        let c_code = (inuse_list[j].c_code) ? inuse_list[j].c_code : "";
                        // remove tilde , replace \n by " "
                        excel_caption = c_code.replace(/~/g,"") + " - " + o_code.replace(/~/g,"");
                        excel_caption = excel_caption.replace(/\n/g," ")
                        // replace tilde with "-\n"
                        caption = c_code.replace(/~/g,"-\n") + "\n" + o_code.replace(/~/g,"-\n");
                    } else if (field_name === "absdetail") {
                        let o_code = (inuse_list[j].o_code) ? inuse_list[j].o_code : "";
                        // remove tilde , replace \n by " "
                        excel_caption = o_code.replace(/~/g,"");
                        excel_caption = excel_caption.replace(/\n/g," ");
                        // replace tilde with "-\n"
                        if (o_code && o_code.includes("~")){o_code = o_code.replace(/~/g,"-\n")}
                        caption = o_code;
                    } else {
                        caption = (field_caption) ? field_caption : "";
                        excel_caption = caption.replace(/\n/g," ");
                    }

                    payroll_filter_tags.push(filter_tag);
// +++ add caption to payroll_excel_header.
                    let excel_celltype = "s", excel_cellformat = null, excel_cellwidth = 15;
                    if (field_name === "rosterdate") {
                        excel_celltype = "n";
                        excel_cellformat = "dd mmm yyyy"
                    } else  if ( ["plandur", "totaldur", "timedur", "orderdetail", "absdur", "absdetail"].indexOf(field_name) > -1) {
                        excel_celltype = "n"
                        excel_cellformat = "#,##0.00";
                    } else  if (["employee_code", "c_o_code", "pdc_code"].indexOf(field_name) > -1) {
                        excel_cellwidth = 25;
                    }
                    payroll_excel_header.push(excel_caption);
                    payroll_excel_colnames.push(field_name);
                    payroll_excel_celltype.push(excel_celltype);
                    payroll_excel_cellformat.push(excel_cellformat);
                    payroll_excel_cellwidth.push(excel_cellwidth);

// +++ add th to header_row.
                    const th = document.createElement("th");
        // --- add div to th, margin not working with th
                    const el_div = document.createElement("div");
        // --- add innerText to el_div
                    el_div.innerText = caption;
                    if (field_name === "status" && is_payroll_detail_mode) {
                        el_div.addEventListener("click", function(event){HandleAggrowReturn()});
                        add_hover(el_div);
                    }
        // --- add width, text_align
                    el_div.classList.add(class_width, class_align);
        // --- add margin ml-2 to wagefactor, to separate from duration field
                     if(["wagefactor", "functioncode", "pdc_code"].indexOf(field_name) > -1) {
                        el_div.classList.add("ml-2");
                    }
        // --- add left and right border around total columns
                    if(["plandur", "totaldur", "timedur", "absdur"].indexOf(field_name) > -1) {
                        has_border_left = true;
                        has_border_right = true;
                    } else  if(["orderdetail", "absdetail"].indexOf(field_name) > -1) {
        // --- add left border before first detail column and right border at end
                        has_border_left = (j === 0);
                        has_border_right = (j === field_count - 1);
                    }
        // --- add border around columns
                    if(has_border_left) {th.classList.add("td_border_left")};
                    if(has_border_right) {th.classList.add("td_border_right")};
        // --- add el_div to th, add th to tblRow
                    th.appendChild(el_div);
                    header_row.appendChild(th);

// +++ add th to filter_row.
                    const filter_th = document.createElement("th");
        // --- add input element
                    const tag_str = (field_name === "status") ? "div" : "input";
                    const el_input = document.createElement(tag_str);
        // --- add EventListener
                    // PR2020-09-03 debug: col_index as parameter doesn't work, keeps giving highest col_index. Use data-colindex instead
                    if (field_name === "status") {
                        el_input.addEventListener("click", function(){HandleFilterToggle(el_input)});
                        el_input.classList.add("stat_0_0")
                    } else {
                        el_input.addEventListener("keyup", function(event){HandleFilterKeyup(el_input, event)});
                    }
        // --- add attribute data-field
                    el_input.setAttribute("data-field", field_name);
                    el_input.setAttribute("data-filtertag", filter_tag);
                    el_input.setAttribute("data-colindex", col_index);
        // --- add other attributes
                    el_input.setAttribute("autocomplete", "off");
                    el_input.setAttribute("ondragstart", "return false;");
                    el_input.setAttribute("ondrop", "return false;");
        // --- add text_align
                    el_input.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
        // --- add margin ml-2 to wagefactor, to separate from duration field
                     if(["wagefactor", "functioncode", "pdc_code"].indexOf(field_name) > -1) {
                        el_div.classList.add("ml-2");
                    }
        // --- add border around columns
                    if(has_border_left) {filter_th.classList.add("td_border_left")};
                    if(has_border_right) {filter_th.classList.add("td_border_right")};
        // --- add el_input to th, add th to tblRow
                    filter_th.appendChild(el_input);
                    filter_row.appendChild(filter_th);

// +++ add th to total_row.
                    const total_th = document.createElement("th");
        // --- add input element
                    const total_div = document.createElement("div");
        // --- add innerText to el_div
                    if(i === 1) {total_div.innerText = loc.Total_hours};
        // --- add attribute data-field
                    //total_div.setAttribute("data-field", field_name);
                    //total_div.setAttribute("data-filtertag", filter_tag);
        // --- add text_align
                    total_div.classList.add(class_align);
        // --- add border around columns
                    if(has_border_left) {total_th.classList.add("td_border_left")};
                    if(has_border_right) {total_th.classList.add("td_border_right")};
        // --- add el_input to th, add th to tblRow
                    total_th.appendChild(total_div);
                    total_row.appendChild(total_th);
                }  //  for (let j = 0; j < field_count; j++)
//----------------------------------------------------------
            }  // if(!selected_col_hidden.includes(field_name))
        }  // for (let i = 0, len = field_settings[tblName].field_names.length; i < len; i++)
    } //  CreateAggHeader

//========= CreateHTML_list  ==================================== PR2020-09-01
    function CreateHTML_list(tblName) {
        //console.log("==== CreateHTML_list  ========= ");

        let header_row = "";
        let filter_row = [];
        let detail_rows = [];
        const data_list = (tblName === "payroll_agg") ? payroll_agg_list_sorted :
                          (tblName === "payroll_detail") ? payroll_detail_list : null

        //console.log("data_list", data_list);
        if (data_list){

// ++++++++ loop through rows of data_list
            for (let x = 0, len = data_list.length; x < len; x++) {
                const item = data_list[x];
                let col_index = -1, td_html = [], filter_data = [], excel_data = [];
                let duration_formatted = null;

// +++++++  loop through field_names
                // must use len, otherwise loop will end when payroll_header_row[j] has no value PR2020-07-16
                for (let i = 0, len = field_settings[tblName].field_names.length; i < len; i++) {
                    const field_name = field_settings[tblName].field_names[i];
                    const class_align = "ta_" + field_settings[tblName].field_align[i];
        //console.log("==== field_name  ========= ", field_name);

// field_names: ["back", "employee_code", "plandur", "totaldur", "timedur", "orderdetail", "absdur", "absdetail", "wagefactor", "functioncode", "pdc_code", "end"],

            // ---  skip if field is in list of selected_col_hidden
                    if(!selected_col_hidden.includes(field_name)) {

        //console.log("selected_col_hidden.includes ", field_name);
// loop through fields of orderdetail / absdetail abscats, field_count = 1 for other fields
                        const inuse_list = (field_name === "orderdetail") ? orders_inuse_list_sorted :
                                            (field_name === "absdetail") ? abscats_inuse_list_sorted : null;
                        const field_count = (inuse_list) ? inuse_list.length : 1;
// +++++++loop through orders / abscats , loop 1 for other columns
                        for (let j = 0; j < field_count; j++) {
                            col_index += 1;
                            let inner_text = "", title = "";
                            let class_text = class_align;
                            let class_td = "";
                            let filter_value = null, excel_value = null;
                            let has_border_left = false, has_border_right = false;

                            if(field_name === "status") {
                                if (item.emplhour_id)  { class_text += " stat_0_4" };
                                if (item.emplhour_id) { title =loc.This_is_rostershift};

                            } else if(field_name === "employee_code") {
                                inner_text = (item.e_code) ? item.e_code : "---";
                                filter_value = (inner_text) ? inner_text.toLowerCase() : null
                                excel_value = (item.e_code) ? item.e_code : "---";

                            } else if(field_name === "e_identifier") {
                                inner_text = (item.e_identifier) ? item.e_identifier : "";
                                filter_value = (inner_text) ? inner_text.toLowerCase() : null
                                excel_value = (item.e_identifier) ? item.e_identifier : "";

                            } else if(field_name === "payrollcode") {
                                inner_text = (item.e_payrollcode) ? item.e_payrollcode : "";
                                filter_value = (inner_text) ? inner_text.toLowerCase() : null
                                excel_value = (item.e_payrollcode) ? item.e_payrollcode : "";

                            } else if (field_name === "rosterdate") {
                                const rosterdate_iso = item.rosterdate;
                                inner_text = format_dateISO_vanilla (loc, rosterdate_iso, false, true)
                                filter_value = (inner_text) ? inner_text.toLowerCase() : null
                                excel_value = item.exceldate;

                            } else if (field_name === "c_o_code") {
                                inner_text = (item.c_o_code) ? item.c_o_code : "";
                                // remove tilde
                                if (inner_text.includes("~")){inner_text = inner_text.replace(/~/g,"")}
                                filter_value = (inner_text) ? inner_text.toLowerCase() : null
                                excel_value = inner_text;

                            } else if(field_name === "o_identifier") {
                                inner_text = (item[field_name]) ? item[field_name] : "";
                                filter_value = (inner_text) ? inner_text.toLowerCase() : null
                                excel_value = inner_text;

                            } else if(["offsetstart", "offsetend"].indexOf(field_name) > -1) {
                                const offset = item[field_name];
                                inner_text = format_time_from_offset_JSvanilla( loc, item.rosterdate, offset, true)  // true = display24
                                filter_data[col_index] = (inner_text) ? inner_text.toLowerCase() : null
                                excel_value = inner_text;

                            } else if(["plandur", "totaldur", "timedur", "absdur"].indexOf(field_name) > -1) {
                                const field_value = item[field_name];
                                inner_text = format_total_duration (field_value, loc.user_lang);
                                filter_value = field_value;
                                excel_value = field_value;

                            } else if(["orderdetail", "absdetail"].indexOf(field_name) > -1) {
                                // inuse_list contains list with pk and code of used orders / abscats.
                                // inuse_pk contains order_pk that correspondence with this order-/ abscat-column
                                const inuse_pk = (inuse_list && inuse_list[j] && inuse_list[j].pk) ? inuse_list[j].pk : null;
                                // orderdetail = {1521: 900, 1541: 1680}
                                const order_abscat_dict = (field_name === "orderdetail") ? item.order_dict : item.abscat_dict;
                                let duration = null;
                                if(!isEmpty(order_abscat_dict)){
                                    duration = (inuse_pk && order_abscat_dict[inuse_pk]) ? order_abscat_dict[inuse_pk] : null;
                                } else if (inuse_pk ===  item.order_id) {
                                    // detail row has no order_dict / abscat_dict but order_id
                                    duration =  item.totaldur;
                                }
                                inner_text = format_total_duration (duration, loc.user_lang);
                                filter_value = duration;
                                excel_value = duration;
                                excel_value = duration;

                            } else if(["wagefactorcode", "functioncode", "paydatecode"].indexOf(field_name) > -1) {
                                // add margin ml-2 , to separate from duration field
                                class_text += " ml-2"

        //console.log("........................... ", field_name);
        //console.log("==== item  ========= ", item);
                                if (tblName === "payroll_agg") {
                                    const field_dict = item[field_name];
                                    // functioncode: { 23: {pk: 23, code: "nico"} }
                                    // paydatecode: { 41: { pk: 41, code: "Maandelijks t/m de 31e" } }
                                    // wagefactorcode: {13: {pk: 13, code: "O200", rate: 2000000}, 73: {pk: 73, code: "W55", rate: 7550000} }
                                    let first_item = "", title_list = "", excel_list = null;
                                    if(!isEmpty(field_dict)){
                                        for (let key in field_dict) {
                                            if (field_dict.hasOwnProperty(key)) {
                                                if (field_dict[key] && field_dict[key].code) {
                                                    if(!first_item){
                                                        first_item = field_dict[key].code;
                                                        excel_list = first_item;
                                                    } else {
                                                        if(!title_list){
                                                            title_list = first_item;
                                                            first_item += " +";
                                                        }
                                                        title_list += "\n" + field_dict[key].code;
                                                        excel_list += ", " + field_dict[key].code;
                                    }}}}};
                                    inner_text = first_item;
                                    filter_value = (excel_list) ? excel_list.toLowerCase() : null
                                    excel_value = excel_list;
                                    title = title_list;
        //console.log("...........................payroll_agg inner_text ", inner_text);
                                } else {
                                    if (field_name === "wagefactorcode") {
                                        inner_text = (item.nopay) ? loc.No_payment : (item.wfc_code) ? item.wfc_code : "---";
                                        filter_value = (inner_text) ? inner_text.toLowerCase() : null;
                                        excel_value = inner_text;
                                    } else if (field_name === "paydatecode") {
                                        inner_text = (item.pdc_code) ? item.pdc_code : "";
                                        filter_value = (inner_text) ? inner_text.toLowerCase() : null;
                                        excel_value = inner_text;
                                        title = loc.Closing_date + ": " + format_dateISO_vanilla (loc, item["paydate"], false, false);
                                    } else if (field_name === "functioncode") {
                                        inner_text = (item.fnc_code) ? item.fnc_code : "";
                                        filter_value = (inner_text) ? inner_text.toLowerCase() : null;
                                        excel_value = inner_text;
                                    }
        //console.log("...........................payroll_detail inner_text ", inner_text);
                                }
                            } else if(field_name === "margin_end") {
                            }

                // --- add left and right border around total columns
                            if(["plandur", "totaldur", "timedur", "absdur"].indexOf(field_name) > -1) {
                                has_border_left = true;
                                has_border_right = true;
                            } else  if(["orderdetail", "absdetail"].indexOf(field_name) > -1) {
                // --- add left border before first detail column and right border at end
                                has_border_left = (j === 0);
                                has_border_right = (j === field_count - 1);
                            }
                // --- add border around columns
                            if(has_border_left && has_border_right ){
                                class_td = " class=\"td_border_left td_border_right\""
                            } else if(has_border_left) {
                                class_td = " class=\"td_border_left\""
                            } else if (has_border_right) {
                                class_td = " class=\"td_border_right\""
                            };

                            const title_html = (title) ? " title=\"" + title + "\"" : "";
                            td_html[col_index] = "<td" + class_td + "><div class=\"" + class_text + "\"" + title_html + ">" + inner_text +  "</div></td>";
                            if(filter_value) { filter_data[col_index] = filter_value};
                            if(excel_value) { excel_data[col_index] = excel_value};
                        }  // for (let j = 0; j < field_count; j++)
                //...................................

                    }  // if(!selected_col_hidden.includes(field_name))
                }  // for (let i = 0, len = field_settings[tblName].field_names.length; i < len; i++)
        // ----------------------------------------------
//--- put td's together
                let row_html = "";
                for (let j = 0, row; row = td_html[j]; j++) {
                    if(row){row_html += row};
                }
                // detail_row = [ 0: show_row, 1: employee_pk, 2: filter_data, 3: excel_data, 4: row_html,
                //                5: emplhour_id, 6: fnc_id, 7: order_id, 8: isabsence];
                const employee_pk = (tblName === "payroll_agg") ? ((item.pk) ? item.pk : 0) :
                                    (tblName === "payroll_detail") ? ((item.e_id) ? item.e_id : 0) : 0
                const functioncode_id = (item.fnc_id) ? item.fnc_id : 0;
                const row = [
                    true, // show_row
                    employee_pk,
                    filter_data,
                    excel_data,
                    row_html,
                    item.emplhour_id,
                    functioncode_id,
                    item.order_id,
                    item.isabsence];

                detail_rows.push(row);

            }  //  for (let x = 0, len = payroll_agg_list_sorted.length; x < len; x++)
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
        }
        payroll_period_agg_rows = detail_rows;

        if (tblName === "payroll_agg") {
            payroll_period_agg_rows = detail_rows
        } else if (tblName === "payroll_detail") {
            payroll_period_detail_rows = detail_rows
        };

    }  // CreateHTML_list

//========= FillPayrollRows  ====================================
    function FillPayrollRows(tblName) {
        //console.log( "====== FillPayrollRows  === ", tblName);
        // called by HandleBtnSelect and HandleFilterKeyup

// --- reset table, except for header
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        ResetPayrollTotalrow();

// --- loop through payroll_period_detail_rows / payroll_period_agg_rows
        // detail_row = [ 0: show_row, 1: employee_pk, 2: filter_data, 3: excel_data, 4: row_html,
        //                5: emplhour_id, 6: fnc_id, 7: order_id, 8: isabsence];
        const detail_rows = (is_payroll_detail_mode) ? payroll_period_detail_rows : payroll_period_agg_rows;
        if (detail_rows) {
            for (let i = 0, item, tblRow, excel_data, filter_row, show_row; item = detail_rows[i]; i++) {
// ---  filter selected_detail_employee_pk when is_payroll_detail_mode
                show_row = (!is_payroll_detail_mode || item[1] === selected_detail_employee_pk)
// ---  filter selected_MSEF_pk (set in SBR)
                if(show_row && selected_MSEF_btn && selected_MSEF_pk > -1) {
                    if (selected_MSEF_btn === "employee"){
                       show_row = (selected_MSEF_pk === item[1])  // item[1] = employee_pk
                    } else  if (selected_MSEF_btn === "functioncode"){
                       show_row = (selected_MSEF_pk === item[6])  // item[6] = functioncode_pk
                    }
                }
                if(show_row && selected_isabsence != null){
                    show_row = (selected_isabsence === item[8])  // item[8] = isabsence
                }

// ---  filter emplhour_pk exists when filtered on status (column 0)
                if(show_row && (is_payroll_detail_mode || tblName === "payroll_detail") ){
                    const col_index = 0;
                    const value = (filter_dict[col_index] && filter_dict[col_index][1] ) ? filter_dict[col_index][1] : 0;
                    show_row = (!value || (!!value && !!item[5]) )
                }
                if(show_row){
                    filter_row = item[2];
                    excel_data = item[3];
                    show_row = t_ShowTableRowExtended(filter_row, filter_dict);
                }
                item[0] = show_row;
        //console.log( ">> show_row " +  show_row);
                if (show_row){
                    tblRow = tblBody_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        // --- add empoyee_pk as id to tblRow
                    tblRow.id = item[1];
        // --- put emplhour_pk in data-pk when is_payroll_detail_mode
                    // detail_row = [ 0: show_row, 1: employee_pk, 2: filter_data, 3: excel_data, 4: row_html,
                    //                5: emplhour_id, 6: fnc_id, 7: order_id, 8: isabsence];
                    if (is_payroll_detail_mode) {tblRow.setAttribute("data-pk", item[5])}
                    tblRow.setAttribute("data-employee_pk", item[1]);
                    tblRow.setAttribute("data-fnc_pk", item[6]);
                    tblRow.setAttribute("data-order_pk", item[7]);
                    tblRow.setAttribute("data-isabsence", (item[8]) ? 1 : 0) ;

        // --- add EventListener to tblRow.
                    tblRow.addEventListener("click", function() {HandleAggRowClicked(tblRow)}, false);
                    add_hover(tblRow)
                    tblRow.innerHTML += item[4];
        // --- add duration to total_row.
                    AddToPayrollTotalrow(excel_data, tblName);
                }
            }
        }
        UpdatePayrollTotalrow()
        //console.log("FillPayrollRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // FillPayrollRows

//========= AddToPayrollTotalrow  ================= PR2020-06-16
    function AddToPayrollTotalrow(excel_data, tblName) {
        //console.log( "===== AddToPayrollTotalrow  === ");
        //console.log( "excel_data", excel_data);
        /// excel_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(excel_data && excel_data.length > 1){
            for (let i = 2, len = excel_data.length; i < len; i++) {
                    //if (is_payroll_detail_mode && i === 2){
                    //    if(!payroll_total_row[i]){payroll_total_row[i] = selected_employee_code};
                    // TODO col index may vary. Was: } else if ( ([4,5].indexOf(i) > -1) && ( selected_btn === "payroll_detail" ) ) {
                        // skip total on time start -time end fields in payroll_detail
                    //}
                const filter_tag =  payroll_filter_tags[i];
                if (filter_tag === "duration" && excel_data[i]){
                // put employee_code in 3rd column when is_payroll_detail_mode
                    const value_number = Number(excel_data[i])
                    if(value_number){
                        if(!payroll_total_row[i]){
                            payroll_total_row[i] = value_number;
                        } else {
                            payroll_total_row[i] += value_number;
                        }
                    }
                }
            }
        };
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
                        const value = payroll_total_row[i];
                        const display = (value) ? format_total_duration(value) : null;
                        el_input.innerText = display;
                    }
                };
            }
        }
    }  // UpdatePayrollTotalrow

//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30 PR2020-06-13
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);
        let class_add_delete = ["mx-2", "tab_show", "tab_functioncode", "tab_paydatecodeXX", "tab_wagecodeXX", "tab_wagefactor", "tab_abscat", "display_hide"]
        let class_columns_excel = ["mx-2", "tab_show", "tab_payroll_agg", "tab_payroll_detail", "display_hide"]
        const url_paydatecode_import = get_attr_from_el(el_data, "data-paydatecode_import_url");
        AddSubmenuButton(el_div, loc.Add_abscat, function() {AddnewOpen()}, class_add_delete, "id_submenu_addnew")
        AddSubmenuButton(el_div, loc.Delete_abscat, function() {ModConfirmOpen("delete")}, class_add_delete, "id_submenu_delete")
        AddSubmenuButton(el_div, loc.Show_hide_columns, function() {ModColumnsOpen()}, class_columns_excel, "id_submenu_columns")
        //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
        //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, class_columns_excel, "id_submenu_delete");
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
        if(data_map){
// --- loop through data_map
//TODO check
            const tblName = "abscat";
            for (const [map_id, map_dict] of data_map.entries()) {
                const pk_int = map_dict.id;
                const ppk_int = map_dict.c_id;
                const row_index = -1;

                const order_by = null, employee_pk = null, is_disabled = false;
                const tblRow = CreateTblRow(tblBody_datatable, tblName, pk_int, ppk_int, order_by, employee_pk, row_index, is_disabled)

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
                        (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1) ? tblHead_paydatecode :
                        tblHead_datatable;

        tblHead.innerText = null
        const field_setting = field_settings[tblName];
        if(field_setting){
            const column_count = field_setting.field_names.length;
            if(column_count){
//--- insert tblRow_header and tblRow_filter
                let tblRow_header = tblHead.insertRow (-1);
                let tblRow_filter = tblHead.insertRow (-1);

//--- insert th's to tblHead
                for (let j = 0; j < column_count; j++) {
                    const field_caption = loc[field_setting.field_caption[j]]
                    const field_name = field_setting.field_names[j];
                    const filter_tag = field_setting.filter_tags[j];
                    const class_width = "tw_" + field_setting.field_width[j];
                    const class_align = "ta_" + field_setting.field_align[j];

// +++ add th to tblHeadRow +++
// --- add th to tblRow.
                    let th_header = document.createElement("th");
// --- add div to th, margin not working with th
                    let el_header = document.createElement("div");
                    if ( ["employee", "paydatecode", "functioncode"].indexOf(tblName) > -1){
                        if (j === 0 ){
        // --- add checked image to first column
                            el_header.classList.add("edit_0_2")
                        } else {
    // --- add innerText to el_header
                            if(field_caption){el_header.innerText = field_caption};
                        };
                    } else {
                        if(field_caption) {el_header.innerText = field_caption};
                        // add right margin to percentage
                        if (field_name === "wagerate") {el_header.classList.add("pr-2") }
                    }
// --- add width, text_align
                    el_header.classList.add(class_width, class_align);
        // --- append el_header and th to tblRow
                    th_header.appendChild(el_header)
                    tblRow_header.appendChild(th_header);

// +++ add th to tblFilterRow +++
                    const th_filter = document.createElement("th");
                        const field_tag = (["triple", "select", "status", "inactive"].indexOf(filter_tag) > -1) ? "div" : "input" ;
                        const el_filter = document.createElement(field_tag);
                            el_filter.setAttribute("data-field", field_name);
                            el_filter.setAttribute("data-filtertag", filter_tag);
                            if(field_tag === "input"){
                                el_filter.addEventListener("keyup", function(event){HandleFilterKeyup(el_filter, j, event)});
                                el_filter.setAttribute("autocomplete", "off");
                                el_filter.setAttribute("ondragstart", "return false;");
                                el_filter.setAttribute("ondrop", "return false;");
                            } else if (["inactive", "triple"].indexOf(filter_tag) > -1) {
                                el_filter.addEventListener("click", function(event){HandleFilter_Tickmark(el_filter)});
                                const el_icon = document.createElement("div");
                                    el_icon.classList.add("tickmark_0_0", "tw-20")
                                el_filter.appendChild(el_icon);
                                el_filter.classList.add("pointer_show");
                            }

                            el_filter.setAttribute("data-colindex", j);
                            el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
// --- add width, text_align
                        th_filter.appendChild(el_filter);
                    tblRow_filter.appendChild(th_filter);
                }  // for (let j = 0; j < column_count; j++)
            }  // if(column_count)
        }  // if(field_setting)
    };  //  CreateTblHeader

//=========  CreateTblHeaderFilter  ================ PR2019-09-15 PR2020-05-22
    function CreateTblHeaderFilter(tblHead, tblName, column_count) {
       //console.log("=========  function CreateTblHeaderFilter =========");
       //console.log("tblName:", tblName);
        const field_setting = field_settings[tblName];

//+++ insert tblRow into tblHead
        let tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("data-table", tblName)
        tblRow.classList.add("tsa_bc_lightlightgrey");
//+++ iterate through columns
        for (let j = 0, td, el; j < column_count; j++) {
// insert td into tblRow
            td = tblRow.insertCell(-1);
// create element with tag from field_tags
                //const field_tag = field_setting.field_tags[j];
                const filter_tag = (tblName === "employee" && j === 0) ? "div" : "input"
                let el = document.createElement(filter_tag);
// --- add data-field Attribute.
               el.setAttribute("data-field", field_setting.field_names[j]);
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
                el.addEventListener("click", function(event){HandleFilter_Tickmark(el)});
            } else {
                el.addEventListener("keyup", function(event){HandleFilterKeyup(el, j, event)});
            }
// --- add left margin to first column, not in employee (has check tick
            if (j === 0 && tblName !== "employee"){el.classList.add("ml-2")};
// --- add field_width and text_align
            el.classList.add("tw_" + field_setting.field_width[j],
                             "ta_" + field_setting.field_align[j]);
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  // CreateTblHeaderFilter

//=========  CreateTblRow  ================ PR2020-06-09
    function CreateTblRow(tblBody, tblName, pk_str, ppk_str, order_by, employee_pk, row_index, is_disabled) {
        //console.log("=========  CreateTblRow =========", tblName);

        let tblRow = null;
        const field_setting = field_settings[tblName];
        if(field_setting){
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
            if(order_by){tblRow.setAttribute("data-orderby", order_by)};

// --- add EventListener to tblRow, not in closingdate,  paydatecode, functioncode, employee
            if (["closingdate" , "paydatecode", "functioncode", "employee"].indexOf(tblName) === -1) {
                tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
            }
// +++  insert td's into tblRow
            const column_count = field_setting.field_names.length;
            for (let j = 0; j < column_count; j++) {
                const fldName = field_setting.field_names[j];
                //const field_tag = (field_setting.field_tags) ? field_setting.field_tags[j] : "div";
                const field_tag = (tblName === "closingdate" && j === 0) ? "input" : "div";
                let td = tblRow.insertCell(-1);
// --- create div element, or other tag when field_tags existst
                let el_div = document.createElement(field_tag);
// --- add data-field attribute
                el_div.setAttribute("data-field", fldName);
// --- add EventListener,  img delete, inactive and no_wage
                if (tblName === "abscat"){
                    if (["o_code", "o_identifier", "o_sequence"].indexOf( fldName ) > -1){
                        el_div.addEventListener("click", function() {MAC_Open(j, el_div)}, false)
                        add_hover(el_div)
                    } else if (["o_nopay", "o_nosat", "o_nosun", "o_noph"].indexOf( fldName ) > -1){
                        const img_class = (fldName === "delete") ? "delete_0_1" : "tickmark_0_0";
                // --- add EventListener
                        el_div.addEventListener("click", function() {UploadToggle(el_div)}, false )
                // --- add div with image inactive
                        let el_img = document.createElement("div");
                            el_img.classList.add(img_class);
                            el_div.appendChild(el_img);
                        add_hover(el_div)
                    } else if (fldName === "o_inactive") {
                        append_background_class(el_div, "inactive_0_2");
                        add_hover(el_div);
                        el_div.addEventListener("click", function() {UploadToggle(el_div)}, false);
                        el_div.classList.add("mx-1")
                    }
                } else if (["functioncode", "paydatecode"].indexOf(tblName) > -1) {
                // --- add EventListener,  img delete, inactive and no_wage
                        if (fldName === "select") {
                            append_background_class(el_div, "tickmark_0_0");
                            add_hover(el_div);
                            el_div.addEventListener("click", function() {MFU_SetTickmarkNEW(el_div)}, false);
                        } else if (fldName === "code") {
                            add_hover(el_div);
                            el_div.addEventListener("click", function() {MFU_SetTickmarkNEW(el_div)}, false);
                        } else if (fldName === "edit") {
                            append_background_class(el_div, "edit_0_3", "edit_1_3");
                            el_div.classList.add("mx-1")
                            if (tblName === "functioncode"){
                                el_div.addEventListener("click", function() {MFU_Open(el_div)}, false);
                                el_div.title = loc.Edit_ + loc.Function.toLowerCase();
                            } else if (tblName === "paydatecode") {
                                el_div.addEventListener("click", function() {MPP_Open(el_div)}, false);
                                el_div.title = loc.Edit_ + loc.Payroll_period.toLowerCase();
                            }
                        } else if (fldName === "inactive") {
                            append_background_class(el_div, "inactive_0_2");
                            add_hover(el_div);
                            el_div.addEventListener("click", function() {UploadToggle(el_div)}, false);
                            el_div.classList.add("mx-1")
                        }
                } else if (["wagefactor", "wagecode"].indexOf(tblName) > -1){
                        add_hover(el_div);
                        el_div.classList.add("pointer_show");
                        if ( fldName === "inactive") {
                            // TODO
                            //append_background_class(el_div,"inactive_0_2")
                            //el_div.addEventListener("click", function() {"inactive",ModConfirmOpen(el_div)}, false);
                        } else if ( j === 0) {
                            el_div.addEventListener("click", function() {MWF_Select(el_div)}, false);
                        } else if ([1, 2, 3].indexOf(j) > -1){
                            el_div.addEventListener("click", function() {MWF_Open(el_div)}, false);
                        }

                        // add right margin to percentage
                        if (fldName === "wagerate") {el_div.classList.add("pr-4") }

                } else if (["paydatecodeXX"].indexOf(tblName) > -1) {
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
                } else if (tblName === "closingdate"){
                        if ( j === 0) {
                            el_div.setAttribute("type", "date")
                            el_div.classList.add("border_none", "tw_150");
                        } else if ( j === 1) {
                            if(!is_disabled){
                               // el_div.addEventListener("click", function() {MPP_ClosingdateDelete(el_div)}, false )
                                //AppendChildIcon(el_div, imgsrc_delete)
                                //el_div.classList.add("border_none", "pointer_show", "tw_032");
                                //add_hover_image(el_div, imgsrc_deletered, imgsrc_delete)
                                append_background_class(el_div,"delete_0_1", "delete_0_2")
                                add_hover(el_div);
                                el_div.addEventListener("click", function() {MPP_ClosingdateDelete(el_div)}, false);
                                el_div.classList.add("mx-1")
                            }
                        }
                } else if (tblName === "employee"){
                    // fldNames =  ["select", "code", "fnc_code", "payrollcode"],
// --- add blank image to check boxes
                     if (fldName === "select") {
                        append_background_class(el_div, "tickmark_0_0");
                        el_div.addEventListener("click", function() {SetTickmark_Employee(el_div)}, false);
                    } else if (fldName === "code") {
                        add_hover(el_div);
                        el_div.addEventListener("click", function() {SetTickmark_Employee(el_div)}, false);
                    } else if (["fnc_code", "pdc_code"].indexOf(fldName) > -1){
                        add_hover(el_div);
                        el_div.addEventListener("click", function() {HandleEmployeeCodeClicked(fldName, el_div)}, false);
                    }

                    //if ([0, 2, 3].indexOf(j) !== -1){
                        //add_hover(el_div);
                        //el_div.classList.add("pointer_show")
                    //}
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
            const column_count = field_settings[tblName].field_names.length;
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
        const title = (mode ==="delete" && sel_btn === "abscat") ? loc.Delete_abscat : null;
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
// +++++++++++++++++ UPLOAD CHANGES +++++++++++++++++ PR2020-06-10
    function UploadChanges(upload_dict, url_str) {
        //console.log("=== UploadChanges");
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
                    }
                    if ("emplhour_dict" in response){
                        const emplhour_dict = response.emplhour_dict;
                        const emplhourlog_list = ("emplhourlog_list" in response) ? response.emplhourlog_list : null;
                        MEP_FillLogTable(emplhourlog_list);
                        MEP_SetInputElements(emplhour_dict);
                    }
                    if("updated_abscat_rows" in response){
                        refresh_data_mapNEW("abscat", abscat_map, response.updated_abscat_rows, false); // skip_show_ok = false
                    }
                    if("updated_functioncode_rows" in response){
                        refresh_data_mapNEW("functioncode", functioncode_map, response.updated_functioncode_rows, false); // skip_show_ok = false
                    }
                    if ("updated_wagefactor_rows" in response) {
                        UpdateWagefactorRowsFromResponseNEW(response.updated_wagefactor_rows)
                    };
                    if("updated_employee_rows" in response){
                        refresh_data_mapNEW("employee", employee_map, response.updated_employee_rows, false); // skip_show_ok = false
                        payroll_needs_update = true
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
        // called by fields "o_nopay", "o_nosat", "o_nosun", "o_noph", "o_inactive", "delete"
        // also by functioncode

        const tblRow = get_tablerow_selected(el_input)
        if(tblRow){
            const fldName = get_attr_from_el(el_input, "data-field")
            const is_delete = (fldName === "delete")
            const tblName = get_attr_from_el(tblRow, "data-table")
            const map_id =  tblRow.id;
            const data_map = get_data_map(tblName);
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);

            const is_make_inactive = (tblName === "abscat" && fldName === "o_inactive" && !map_dict.o_inactive) ||
                                     (tblName === "functioncode" && fldName === "inactive" && !map_dict.inactive);


            if(is_make_inactive){
                // when make inactive: show ModConfirm
                ModConfirmOpen("inactive", el_input) ;
            } else {
                if(!isEmpty(map_dict)){
                    const pk_int = map_dict.id;
                    const ppk_int = (tblName === "abscat") ? map_dict.c_id :
                                     (tblName === "functioncode") ? map_dict.comp_id : null;

                    let upload_dict = { id: {pk: pk_int,
                                         ppk: ppk_int,
                                         table: tblName,
                                         isabsence: true,
                                         mapid: map_id } };
                    let new_value = false;
                    if(is_delete) {
                        upload_dict.id.delete = true;
                    } else {
        // ---  get field value from map_dict
                        const db_fldName = (tblName === "abscat") ? mapped_abscat_fields[fldName] :
                                            (tblName === "functioncode") ? fldName : null;
                        const old_value = map_dict[fldName] ;

        // ---  toggle value
                        new_value = (!old_value);
                        upload_dict[db_fldName] = {value: new_value, update: true};

        // ---  change icon, before uploading (nopay has reverse tickmark
                        if (db_fldName === "inactive") {
                            add_or_remove_class(el_input, "inactive_1_3", new_value, "inactive_0_2" )
                        } else {
                            if (fldName === "o_nopay") {
                                // no_pay: field_value = true = no payment    --> on screen ' no payment' = true
                                add_or_remove_class(el_input.children[0], "tickmark_1_2", new_value, "tickmark_0_0" )
                                el_input.setAttribute("data-filter", (new_value) ? 1 : 0 );
                            } else {
                                // no_sun: field_value = true = no hours on sun --> on screen 'count hours on sun = false
                                add_or_remove_class(el_input.children[0], "tickmark_0_0", new_value, "tickmark_1_2")
                                el_input.setAttribute("data-filter", (new_value) ? 0 : 1 );
                            }
                        }
                    }  // if (crud_mode === "inactive")

                    UploadChanges(upload_dict, url_payroll_upload);
                }
            }  //  if(!isEmpty(map_dict)){
        }  //   if(!!tblRow)
    }  // UploadToggle

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
            const map_id = (update_dict.mapid) ? update_dict.mapid : get_dict_value(update_dict, ["mapid"]);
            const arr = (map_id) ? map_id.split("_") : null;
            const tblName = (arr) ? arr[0] : get_dict_value(update_dict, ["id","table"]);
            const pk_int = (update_dict.id) ? update_dict.id : get_dict_value(update_dict, ["id","pk"]);
            const ppk_int = (update_dict.comp_id) ? update_dict.comp_id : get_dict_value(update_dict, ["id","ppk"]);
            const is_created = (update_dict.created != null) ? update_dict.created : get_dict_value(update_dict, ["id","created"], false);
            const msg_err = (update_dict.error != null) ? update_dict.error : get_dict_value(update_dict, ["id","error"], false);
            const column_count = field_settings[tblName].field_names.length;
            const is_inactive = (update_dict.inactive != null) ? update_dict.inactive : get_dict_value (update_dict, ["inactive", "value"], false);
            let order_by = "";
            if (tblName === "abscat") {
                order_by = (update_dict.o_code) ? update_dict.o_code : ""
            } else if (tblName === "wagefactor") {
                order_by = (update_dict.code) ? update_dict.code : ""
            } else {
                order_by = get_dict_value (update_dict, ["code", "value"], "");
            }

// --- new created record
            if (is_created){
// update row info
    // update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-table", tblName);
                tblRow.setAttribute("data-orderby", order_by);

// move the new row in alfabetic order
                let row_index = -1
                if(tblName === "abscat") {
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
                        UpdateField(el_input, update_dict, false ) // false = skip_show_ok
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!update_dict && !!tblRow)
    }  // function UpdateTblRow

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict, show_ok){
        //console.log("========= UpdateField  =========");
        //console.log("item_dict", item_dict);
        const fldName = get_attr_from_el(el_input, "data-field");
        const field_value = (item_dict[fldName]) ? item_dict[fldName] : null

        const map_id = (item_dict.mapid) ? item_dict.mapid : get_dict_value(item_dict, ["mapid"]);
        const arr = (map_id) ? map_id.split("_") : null;
        const tblName = (arr) ? arr[0] : get_dict_value(item_dict, ["id","table"]);
        const is_absence = (item_dict.isabsence != null) ? item_dict.isabsence : get_dict_value(item_dict, ["id","isabsence"], false);

// --- lookup field in item_dict, get data from field_dict
        //const is_locked = (!!get_dict_value (field_dict, ["locked"]));
        //el_input.disabled = locked
        if (["code", "fnc_code", "payrollcode", "pdc_code", "o_code", "o_identifier"].indexOf( fldName ) > -1){
            // any value is needed to show hover and let eventlistener work
            el_input.innerText = (field_value) ? field_value : "\n";
            el_input.setAttribute("data-filter", (field_value) ? field_value.toLowerCase() : null )
        } else if (["o_sequence"].indexOf( fldName ) > -1){
            // any value is neede to show hover and let eventlistener work
            el_input.innerText = (field_value) ? field_value : "\n";
            el_input.setAttribute("data-filter", field_value);
        } else if (fldName === "wagerate") {
            const display = (value != null) ? format_wagefactor (loc.user_lang, value) : "\n"
            el_input.innerText = display;
            el_input.setAttribute("data-filter", field_value);
        } else if (["o_nopay", "o_nosat", "o_nosun", "o_noph"].indexOf( fldName ) > -1){
            // extra div necessary to have wide columns and show only 20 pixels for icon - might be solved with mx-4
            //if (fldName === "o_nopay") {
            //    // no_pay: field_value = true = no payment    --> on screen ' no payment' = true
           //     add_or_remove_class(el_input.children[0], "tickmark_1_2", field_value, "tickmark_0_0" )
           //     el_input.setAttribute("data-filter", (field_value) ? 1 : 0 );
           // } else {
                // no_sun: field_value = true = no hours on sun --> on screen 'count hours on sun = false
                add_or_remove_class(el_input.children[0], "tickmark_0_0", field_value, "tickmark_1_2")
                el_input.setAttribute("data-filter", (field_value) ? 0 : 1 );
           // }
        } else if (["inactive", "o_inactive"].indexOf( fldName ) > -1){
            //add_or_remove_class(el_input.children[0], "inactive_1_3", field_value, "inactive_0_2" )
            add_or_remove_class(el_input, "inactive_1_3", field_value, "inactive_0_2" )
            const caption = (tblName === "abscat") ? loc.Absence_category :
                          (tblName === "functioncode") ? loc.Function :
                          (tblName === "wagefactor") ? loc.Wage_factor :
                          (tblName === "paydatecode") ? loc.Payroll_period : loc.This_item;
            el_input.title = loc.Make_ + caption.toLowerCase() + ( (field_value) ? loc._active : loc._inactive );
            el_input.setAttribute("data-filter", (field_value) ? 1 : 0)

        }  else if (tblName === "paydateitem"){
            let value = get_dict_value(item_dict, [fldName, "value"])
            if (["datelast"].indexOf( fldName ) > -1){
                el_input.value = value
                el_input.setAttribute("data-filter", value)
            };
        }
// ---  make el_input green for 2 seconds
        if(show_ok){ ShowOkElement(el_input, "border_bg_valid") };
    }  // UpdateField

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
       //console.log(" --- UpdateSettings ---")
       //console.log("setting_dict", setting_dict)

        selected_btn = get_dict_value(setting_dict, ["sel_btn"], "payroll_agg");

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
        //console.log( "is_addnew_mode ", is_addnew_mode);
        //console.log( "selected_period ", selected_period);
        //console.log( "selected_btn ", selected_btn);
        //console.log( "selected_view ", selected_view);

        let header_text = null, sidebar_selectperiod_text = null;
        const is_payrollperiod_view = (selected_view === "payrollperiod");
        const sidebar_selectperiodlabel = ( (is_payrollperiod_view) ? loc.Payroll_period : loc.Period) + ": ";

        if (["payroll_agg", "payroll_detail"].indexOf(selected_btn) > -1) {
            //console.log( "selected_period", selected_period);
            // el_sbr_select_period is only visible in 'payroll_agg' or 'payroll_detail'
            const period_tag = (selected_period.period_tag) ? selected_period.period_tag : null
            const dates_display = get_dict_value(selected_period, ["dates_display_short"], "---");

            header_text = ( (is_payrollperiod_view) ? loc.Payroll_period : loc.Period) + ": ";
            if(is_payroll_detail_mode){
                header_text += selected_employee_code + " - " + dates_display;
            } else {
                header_text += dates_display;
            }

            if(is_payrollperiod_view){
    // ---  get first / last date caption of selected_paydateitem
                selected_paydateitem_code = "";
                if(period_tag === "other"){
                    sidebar_selectperiod_text = dates_display;
                } else if(loc.period_select_list){
                    for (let i = 0, item; item = loc.period_select_list[i]; i++) {
                        if(item[0] === period_tag) {
                            sidebar_selectperiod_text = (item[1]) ? item[1] : null;
                            break;
                        }
                    }
                }
                sidebar_selectperiod_text = (selected_period.paydatecode_code) ? selected_period.paydatecode_code : "---";

            } else {
                if(period_tag === "other"){
                    sidebar_selectperiod_text = dates_display;
                } else if(loc.period_select_list){
                    //console.log( "loc.period_select_list", loc.period_select_list);
                    for (let i = 0, item; item = loc.period_select_list[i]; i++) {
                        if(item[0] === period_tag) {
                            sidebar_selectperiod_text = (item[1]) ? item[1] : null;
                            break;
                        }
                    }
                }
            }

        } else if (selected_btn === "abscat") {
            header_text = (selected_abscat_pk && selected_abscat_code) ? loc.Absence_category + ": " + selected_abscat_code : loc.Absence_categories ;
        } else if (selected_btn === "paydatecode") {
            header_text = loc.Payroll_periods;
        } else if (selected_btn === "functioncode") {
            header_text = loc.Function + ( (selected_functioncode_pk && selected_functioncode_code) ? ": " + selected_functioncode_code : "");
        }  //  if (["payroll_agg", "payroll_detail"].indexOf(selected_btn) > -1) {

        document.getElementById("id_hdr_text").innerText = header_text

        document.getElementById("id_SBR_label_select_period").innerText = sidebar_selectperiodlabel;
        el_sbr_select_period.value = sidebar_selectperiod_text;

    }  // UpdateHeaderText

// +++++++++++++++++ UPDATE FROM RESPONSE ++++++++++++++++++++++++++++++++++++++++++++++++++
///=========  UpdateWagefactorRowsFromResponseNEW  ================ PR2020-09-15
    function UpdateWagefactorRowsFromResponseNEW(updated_rows) {
        //console.log(" --- UpdateAbsenceRowsFromResponseNEW  ---");
        for (let i = 0, dict, len = updated_rows.length; i < len; i++) {
            UpdateWagefactorRowFromResponseNEW(updated_rows[i])
        }
    } // UpdateWagefactorRowsFromResponseNEW

//=========  UpdateWagefactorRowFromResponseNEW  ================ PR2020-08-28 PR2020-09-10
    function UpdateWagefactorRowFromResponseNEW(update_dict) {
        //console.log(" =====  UpdateWagefactorRowFromResponseNEW  =====");
        //console.log("update_dict", update_dict);

        if(!isEmpty(update_dict)){
            const map_id = update_dict.mapid;
            const tblName = "wagefactor";
            const is_created = (update_dict.created) ? update_dict.created : false;
            const is_deleted = (update_dict.deleted) ? update_dict.deleted : false;

// +++  create list of updated fields, before updating data_map, to make them green later
            const updated_fields = b_get_updated_fields_list(field_settings.wagefactor.field_names, wagefactor_map, update_dict);
            //console.log("updated_fields", updated_fields);

// +++  update or add wagefactor_dict in wagefactor_map
            //console.log("data_map.size before: " + data_map.size);
            const data_map = wagefactor_map;
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
                const search_orderby = (update_dict.code) ? update_dict.code.toLowerCase() : "";
            //console.log("search_orderby", search_orderby);
                let row_index = t_get_rowindex_by_orderby(tblBody_paydatecode, search_orderby)
            //console.log("row_index", row_index);
                // headerrow has index 0, filerrow has index 1. Deduct 1 for filterrow.
                //row_index -= 1;

    //--- add new tablerow if it does not exist
                const employee_pk = null, is_disabled = false;
                const order_by = search_orderby
                tblRow = CreateTblRow(tblBody_paydatecode, tblName, update_dict.id, update_dict.comp_id, order_by, employee_pk, row_index, is_disabled)

    //--- set new selected.teammember_pk
                selected_wagefactor_pk = update_dict.id
                selected_wagefactor_code = update_dict.code
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
    }  // UpdateWagefactorRowFromResponseNEW

//========= RefreshTblRowNEW  ============= PR2020-09-15
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

//=========  RefreshFieldNEW  ================ PR2020-09-15
    function RefreshFieldNEW(tblRow, el_input, fldName, update_dict) {
        //console.log(" =====  RefreshFieldNEW  =====");
        //console.log("fldName", fldName);
        if(fldName && el_input && !isEmpty(update_dict)){
            const value = update_dict[fldName];
        //console.log("value", value);
        //  absence: ["employee", "order", "datefirst", "datelast", "workminutesperday", "delete"],
            if (["code"].indexOf( fldName ) > -1){
                el_input.innerText = (value) ? value : "---";
            } else if (fldName === "wagerate") {
                if(value == null){
                    el_input.innerText = null;
                } else {
                    // format_wagefactor (user_lang, value_int, hide_zero, hide_decimals)
                    el_input.innerText = format_wagefactor (loc.user_lang, value);
                }
            } else if (fldName === "inactive"){
                const img_class = (value) ? "inactive_1_3" : "inactive_0_2";
                refresh_background_class(el_input, img_class)
                el_input.title = (value) ? loc.Click_to_make_this_item_inactive : loc.Click_to_make_this_item_active;
                tblRow.setAttribute("data-inactive", value);
            }
        };  // if(!!el_input)
    }  // RefreshFieldNEW

// ##########################################

//=========  UpdateFromResponse  ================ PR2020-06-10
    function UpdateFromResponse(update_dict) {
       //console.log(" --- UpdateFromResponse  ---");
       //console.log("update_dict", deepcopy_dict(update_dict));

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
            selected_paydatecode_code = "";
            selected_paydateitem_iso = null;
            selected_paydateitem_code = "";
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
                        const data_map = get_data_map(tblName);
                        row_index = t_get_rowindex_by_code_datefirst(tblBody_paydatecode, tblName, data_map, row_code)
                    }
                }
                const tblBody = (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1) ? tblBody_paydatecode : tblBody_datatable

                const order_by = null, employee_pk = null, is_disabled = false;
                tblRow = CreateTblRow(tblBody, selected_btn, pk_int, ppk_int, order_by, employee_pk, is_disabled)
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
        const data_map = get_data_map(tblName)

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
                const tblName = "abscat"  // tblName_from_selectedbtn(selected_btn);
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

//=========  refresh_data_mapNEW ================ PR2020-09-08
    function refresh_data_mapNEW(tblName, data_map, updated_rows, skip_show_ok) {
        //console.log(" --- refresh_data_mapNEW  ---");
        if (updated_rows) {
            for (let i = 0, update_dict; update_dict = updated_rows[i]; i++) {
                refresh_datamap_itemNEW(tblName, data_map, update_dict, skip_show_ok)
            }
        }
    } // refresh_data_mapNEW

//=========  refresh_datamap_itemNEW  ================PR2020-09-08
    function refresh_datamap_itemNEW(tblName, data_map, update_dict, skip_show_ok) {
        //console.log(" --- refresh_datamap_itemNEW  ---");
        //console.log("update_dict", update_dict);
        // used by updated_abscat_rows, updated_functioncode_rows (so far)

// ---  update or add update_dict in data_map
        const map_id = update_dict.mapid;
        const old_map_dict = data_map.get(update_dict.mapid);
        const is_deleted = update_dict.deleted;
        const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

       // //console.log("old_map_dict", old_map_dict);
        //console.log("is_created", is_created);

// ---  refresh fields in tblRow
        refresh_tblRowNEW(update_dict, data_map, is_created, is_deleted, skip_show_ok);

        //console.log("data_map.size before: " + data_map.size);
        const tblBody = (tblName === "employee") ? tblBody_employee :
                        (["functioncode", "paydatecode"].indexOf(tblName) > -1) ? tblBody_paydatecode : tblBody_datatable;

        if(is_created){
// ---  insert new item in alphabetical order
            //if (data_map.size){
                // inserting at index not necessary, only when reloading page the rows are added in order of data_map
                // insertInMapAtIndex(data_map, map_id, update_dict, 0, user_lang)
            //} else {
            //    data_map.set(map_id, update_dict)
            //}
            data_map.set(map_id, update_dict)
// ---  delete deleted item
        } else if(is_deleted){
            data_map.delete(map_id);
        } else {

// ---  update item in data_map
            data_map.set(map_id, update_dict)
        }
        //console.log("data_map.size after: " + data_map.size);

// +++  create tblRow when is_created
        let tblRow = null;
        if(is_created){

        // get info from update_dict
            const pk_int = update_dict.id;
            const ppk_int = (tblName === "abscat") ? update_dict.c_id :
                            ( ["employee", "functioncode"].indexOf(tblName) > -1 ) ? update_dict.comp_id : null;
        //console.log("pk_int: " , pk_int);
        //console.log("ppk_int: " , ppk_int);
// get order_by. Will be put in tblRow and also used in t_get_rowindex_by_orderby
        const order_by = (tblName === "abscat") ? ( (update_dict.o_code) ? update_dict.o_code.toLowerCase() : "" ) :
                         ( ["employee", "functioncode"].indexOf(tblName) > -1 ) ? ( (update_dict.code) ? update_dict.code.toLowerCase() : "" ) : "";

// get row_index
        //console.log("order_by: " , order_by);
            let row_index = t_get_rowindex_by_orderby(tblBody, order_by)
        //console.log("row_index: " , row_index);
// add new tablerow if it does not exist
            const employee_pk = null, is_disabled = false;
            tblRow = CreateTblRow(tblBody, tblName, update_dict.id, update_dict.c_id, order_by, employee_pk, row_index, is_disabled)

        //console.log("tblRow: " , tblRow);
            UpdateTblRow(tblRow, update_dict)
// set new selected_emplhour_pk
            //selected_emplhour_pk = pk_int
// highlight new row, make green for 2 seconds
            DeselectHighlightedRows(tblRow, cls_selected);
            tblRow.classList.add(cls_selected)
            //ShowOkElement(tblRow);
            b_ShowTblrowErrorOK(tblRow, true);  // true = show_ok
// scrollIntoView
            //tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
        } else {
            tblRow = document.getElementById(map_id);
        }

    }  // refresh_datamap_itemNEW

//=========  refresh_tblRowNEW  ================ PR2020-09-08 PR2020-09-20
    function refresh_tblRowNEW(update_dict, data_map, is_created, is_deleted, skip_show_ok) {
        //console.log(" --- refresh_tblRowNEW  ---");
        // refresh must come before updating data_map, to check changed values with old_map_dict
        // ShowOk when created tblRow must be dome outsied this function

        const tblRow = document.getElementById(update_dict.mapid);
        if(tblRow){
            const arr = (update_dict.mapid) ? update_dict.mapid.split("_") : null;
            const tblName = (arr) ? arr[0] : null;
            const field_names = field_settings[tblName].field_names;
            const old_map_dict = data_map.get(update_dict.mapid);
            const is_deleted = update_dict.deleted;
            const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

        //console.log("field_names", field_names);
        //console.log("is_created", is_created);
            if(is_deleted && !skip_show_ok){
//--- remove deleted tblRow
                tblRow.parentNode.removeChild(tblRow);
//--- make tblRow green for 2 seconds
            } else if(is_created && !skip_show_ok){
                // ShowOk when created tblRow must be dome outsied this function
                //ShowOkElement(tblRow);
            } else {
        // ---  check which fields are updated, add to list 'updated_columns'
                let updated_columns = [];
                // new row has no old_map_dict PR2020-08-19
                for (let i = 0, col_field; col_field = field_names[i]; i++) {
                    if (col_field && col_field in old_map_dict && col_field in update_dict){
                        if (old_map_dict[col_field] !== update_dict[col_field] ) {
                            updated_columns.push(col_field)
                        }
                    }
                };
                if(updated_columns){
    // ---  make updated fields green for 2 seconds
                    for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                        const el = cell.children[0];
                        if(el){
                            const el_field = get_attr_from_el(el, "data-field")
                            if(updated_columns.includes(el_field)){
                                UpdateField(el, update_dict, !skip_show_ok)  // show_ok = !skip_show_ok
                            }
                        }
                    }
                }
            }
        }
    }  // refresh_tblRowNEW

//###########################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= HandleFilterToggle  =============== PR2020-09-29
    function HandleFilterToggle(el_input) {
        //console.log( "===== HandleFilterToggle  ========= ");
        const field_name = get_attr_from_el(el_input, "data-field")
        const filter_tag = get_attr_from_el(el_input, "data-filtertag")
        const col_index = get_attr_from_el_int(el_input, "data-colindex")
;
        if (field_name === "status") {
            //filter_dict = [ ["boolean", "1"] ];
            t_SetExtendedFilterDict(el_input, col_index, filter_dict);
            const new_value = (filter_dict[col_index] && filter_dict[col_index][1] ) ? filter_dict[col_index][1] : 0;
            add_or_remove_class(el_input, "stat_0_4", (new_value === 1), "stat_0_0")
            const tblName = (selected_btn === "payroll_detail" || is_payroll_detail_mode) ? "payroll_detail" : "payroll_agg";
            FillPayrollRows(tblName);
        }
    };  // HandleFilterToggle

//========= HandleFilterKeyup  ====================================
    function HandleFilterKeyup(el, event) {
        //console.log( "===== HandleFilterKeyup  ========= ");
        const col_index = get_attr_from_el_int(el, "data-colindex")
        //console.log("...... .col_index", col_index, ".event.key", event.key);

        const skip_filter = t_SetExtendedFilterDict(el, col_index, filter_dict, event.key);
        if ( !skip_filter) {
            const tblName = (selected_btn === "payroll_detail" || is_payroll_detail_mode) ? "payroll_detail" : "payroll_agg";
            FillPayrollRows(tblName);
        };
        //console.log("filter_dict",filter_dict)
    }  // HandleFilterKeyup

//========= HandleFilter_Tickmark  ==================================== PR2020-06-26 PR2020-09-20
    function HandleFilter_Tickmark(el_filter) {
        //console.log( "===== HandleFilter_Tickmark  ========= ");
        const col_index = get_attr_from_el_int(el_filter, "data-colindex")
        //console.log("...... .col_index", col_index);
        const skip_filter = t_SetExtendedFilterDict(el_filter, col_index, filter_dict, event.key);

        let arr = (filter_dict && filter_dict[col_index]) ? filter_dict[col_index] : "";
        const value = (arr && arr[1] ) ? arr[1] : 0;
        if(arr[0] === "inactive"){
            el_filter.children[0].className = (value) ? "inactive_1_3" : "inactive_0_0";
        } else if(arr[0] === "triple"){
            el_filter.children[0].className = "tickmark_0_" + value;;
        }
        //console.log("...... .filter_dict", filter_dict);
        const tblBody = (selected_btn === "employee") ? tblBody_employee :
                        (["functioncode", "wagecode", "paydatecode"].indexOf(selected_btn) > -1) ? tblBody_paydatecode : tblBody_datatable;


// ---  loop through tblBody.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody.rows[i]; i++) {
            show_row = t_ShowTableRowExtended([], filter_dict, tblRow );
// ---  show / hide row
            add_or_remove_class(tblRow, cls_hide, !show_row)
        }




/*
        for (let i = 0, item, tblRow; tblRow = tblBody_employee.rows[i]; i++) {
            // skip hidden rows
            if (!tblRow.classList.contains(cls_hide)){
                if(filter_checked){
                    tblRow.setAttribute("data-selected", true);
                } else {
                    tblRow.removeAttribute("data-selected")
                }
                add_or_remove_class(tblRow.cells[0].children[0], "tickmark_0_2", filter_checked, "tickmark_0_0")
            }
        }
*/
    }; // HandleFilter_Tickmark

//========= Filter_TableRows  ==================================== PR2020-06-13
    function Filter_TableRows(tblName) {
        // caleed by HandleFilterKeyup, FillFunctioncodeOrPaydatecodeRows, FillAbscatTableRows, ResetFilterRows
        // table payroll has its own filter
        //console.log( "===== Filter_TableRows  ========= ", tblName);
        //console.log( "filter_dict ", filter_dict);
        const tblBody = (tblName === "employee") ? tblBody_employee :
                        (tblName === "paydatecode") ? tblBody_paydatecode : tblBody_datatable;

// ---  loop through tblBody.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody.rows[i]; i++) {
            show_row = ShowTableRow(tblRow)
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
        // table payroll has its own ShowPayrollRow, called by FillPayrollRows
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
        //console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

// ---  reset selected variables
        selected_MSEF_btn = null;
        selected_MSEF_pk = -1;
        selected_MSEF_code = null;

// ---   empty filter input boxes in filter header

// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(tblBody_datatable, cls_selected)

        if (["payroll_agg", "payroll_detail"].indexOf(selected_btn) > -1){
            selected_detail_employee_pk = -1;
            selected_detail_employee_code = "";  // PR2020-11-11 debugL: default value 'null' may give error in export to excel
            is_payroll_detail_mode = false;
            is_payroll_detail_modal_mode = false;
            b_reset_tblHead_filterRow(tblHead_datatable)
               // Filter_TableRows(tblBody_datatable)
            const tblName = (selected_btn === "payroll_detail") ? "payroll_detail": "payroll_agg"
            CreateAggHeader(tblName);
            CreateHTML_list(tblName)
            FillPayrollRows(tblName);
        } else if (["abscat"].indexOf(selected_btn) > -1){
            selected_abscat_pk = null;
            selected_abscat_code = null;
            b_reset_tblHead_filterRow(tblHead_datatable)
                Filter_TableRows(tblBody_datatable)
        } else if (["functioncode", "paydatecode", "wagefactor"].indexOf(selected_btn) > -1){
            selected_employee_pk = -1;
            selected_employee_code = "";
            selected_functioncode_pk = -1;
            selected_functioncode_code = "";
            selected_wagefactor_pk = null;
            selected_wagefactor_code = "";
            selected_paydatecode_pk = null;
            selected_paydatecode_code = "";
            selected_paydateitem_iso = null;
            selected_paydateitem_code = "";
            b_reset_tblHead_filterRow(tblHead_paydatecode)
                Filter_TableRows(tblBody_paydatecode);
            b_reset_tblHead_filterRow(tblHead_employee)
                Filter_TableRows(tblBody_employee);
        }

        UpdateHeaderText();

        SBR_DisplayEmployeeFunction();
    }  // function ResetFilterRows

//=========  HandleBtnAddRemoveSelected  ================ PR2020-06-18
    function HandleBtnAddRemoveSelected(crud_mode) {
        //console.log("========= HandleBtnAddRemoveSelected  ========= ");
        const is_delete = (crud_mode === "remove");

        const selected_pk = (is_delete) ? null :
                           (selected_btn === "functioncode") ? selected_functioncode_pk :
                           (selected_btn === "paydatecode") ? selected_paydatecode_pk : null;
        const selected_code = (is_delete) ? null :
                           (selected_btn === "functioncode") ? selected_functioncode_code :
                           (selected_btn === "paydatecode") ? selected_paydatecode_code : "";
        const col_index = (selected_btn === "functioncode") ? 2 :
                           (selected_btn === "paydatecode") ? 3 : null;
        const show_mod_confirm = (!is_delete && !selected_pk)

        //console.log("selected_paydatecode_pk", selected_paydatecode_pk);
        //console.log("selected_paydatecode_code", selected_paydatecode_code);
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

// ---  create list of selected employees.
            // Use batch update instead of updating one by one:
            // - employee_list contains only the selected employee_pk's
            //  - upload_dict contains new functioncode
            let employee_list = [];

            const tblBody = document.getElementById("id_tblBody_employee")
            for (let i = 0, tblRow; tblRow=tblBody.rows[i]; i++) {
                if(tblRow){
                    const is_selected = (!!get_attr_from_el(tblRow, "data-selected"))
                    const employee_pk = get_attr_from_el_int(tblRow, "data-pk");
                    if(is_selected && employee_pk){
                        //dict[selected_btn] = {pk: selected_pk, code: code, update: true}
                        employee_list.push(employee_pk);

                        // --- put new value in el_clicked
                        const el = tblRow.cells[col_index].children[0];
                        if(el){ el.innerText = (selected_pk) ? selected_code : null };
                    }
                }
            }
            //console.log("employee_list", employee_list);

            const tblName = selected_btn;
            const data_map = get_data_map(tblName)
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, selected_pk)
            const code = map_dict.code;
            //console.log("map_dict", map_dict);
            //console.log("code", code);

            if(employee_list.length){
                let upload_dict = {
                    id: {table: "employee"},
                    employee_list: employee_list
                };
                upload_dict[tblName] = {pk: selected_pk, code: code, update: true}
                UploadChanges(upload_dict, url_payroll_upload);
            }
        }
    } //  HandleBtnAddRemoveSelected

//=========  HandleEmployeeCodeClicked  ================ PR2020-09-21
    function UploadEmployee_fnc_pdt(selected_pk, employee_list) {
        //console.log("========= UploadEmployee_fnc_pdt  ========= ");
        //console.log("selected_pk", selected_pk);
        //console.log("employee_list", employee_list);

        if(employee_list.length){
            const tblName = selected_btn;
            const data_map = get_data_map(tblName)
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, selected_pk)

            payroll_needs_update = true;

            let upload_dict = { id: {table: "employee"},
                                employee_list: employee_list};
            upload_dict[tblName] = {pk: selected_pk,
                                    code: map_dict.code,
                                    update: true};
            UploadChanges(upload_dict, url_payroll_upload);
        }
    }


//=========  HandleEmployeeCodeClicked  ================ PR2020-06-18
    function HandleEmployeeCodeClicked(fldName, el_clicked) {
        //console.log("========= HandleEmployeeCodeClicked  ========= ");
        //console.log("el_clicked", el_clicked);

        let selected_pk = (fldName === "fnc_code") ? selected_functioncode_pk :
                           (fldName === "pdc_code") ? selected_paydatecode_pk : null;
        const tblName = (fldName === "fnc_code") ? "functioncode" :
                             (fldName === "pdc_code") ? "paydatecode" : null;
        const data_map = get_data_map(tblName)
        const data_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, selected_pk)
        const sel_code_value = data_dict.code;

        let employee_list = [];
        let employee_pk_list = [];
        let is_remove = false;

        const tblRow = get_tablerow_selected(el_clicked)
        if(tblRow && selected_pk){
            const employee_dict = get_mapdict_from_datamap_by_id(employee_map, tblRow.id)
            if(!isEmpty(employee_dict)){
                const employee_pk = employee_dict.id;
                const employee_ppk = employee_dict.comp_id;
                employee_list.push(employee_pk);

                // remove code when it is the same as selected code
                let employee_fnc_pdc_pk = (fldName === "fnc_code") ? employee_dict.fnc_id :
                                          (fldName === "pdc_code") ? employee_dict.pdc_id : null;
                if(employee_fnc_pdc_pk && employee_fnc_pdc_pk === selected_pk ){
                    // remove code when it is the same as selected code
                    selected_pk = null;
                }

        //console.log("employee_list", employee_list);

// --- put new value in el_clicked
                el_clicked.innerText = (selected_pk) ? sel_code_value : null;
// --- UploadChanges
                UploadEmployee_fnc_pdt(selected_pk, employee_list);
            }
        }
    }  // HandleEmployeeCodeClicked

//=========  SetTickmark_Employee  ================ PR2020-06-18 PR2020-09-20
    function SetTickmark_Employee(el_clicked) {
        //console.log("========= SetTickmark_Employee  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
            let is_selected = (!!get_attr_from_el(tblRow, "data-selected"))
            is_selected = (!is_selected)

            add_or_remove_attr (tblRow, "data-selected", is_selected, true);

            add_or_remove_class(tblRow.cells[0].children[0], "tickmark_0_2", is_selected, "tickmark_0_0")
        }
    }  // SetTickmark_Employee

//###########################################################################
    function AddnewOpen(col_index, el_clicked) {
        if(selected_btn === "abscat") {
            MAC_Open()
        } else if(selected_btn === "functioncode") {
            MFU_Open()
        } else if(selected_btn === "paydatecode") {
            MPP_Open()
        } else if(selected_btn === "wagefactor") {
            MWF_Open()
        };
    }

//###########################################################################
// +++++++++++++++++ MODAL SELECT PERIOD or PAYDATECODE +++++++++++++++++++++

//========= MSPP_Open=================== PR2020-07-12 PR2020-09-23
    function MSPP_Open () {
        //console.log("===  MSPP_Open  =====") ;
        MSPP_BtnSelect()
// ---  show modal
        $("#id_mod_select_period_paydate").modal({backdrop: true});
}; // function MSPP_Open

//=========  MSPP_BtnSelect  ================ PR2020-09-27
    function MSPP_BtnSelect(btn) {
        //console.log( "===== MSPP_BtnSelect ========= ");
        //console.log( "selected_period", selected_period);
        //console.log( "btn", btn);
        let MSPP_selected_btn = null;
        if(btn){
            MSPP_selected_btn = get_attr_from_el(btn, "data-btn")
        } else if (selected_view){
                MSPP_selected_btn = selected_view;
        } else {
            MSPP_selected_btn = "calendarperiod";
        }

        const tblName = (MSPP_selected_btn === "payrollperiod") ? "paydatecode" : MSPP_selected_btn;
        mod_MSPP_dict = {sel_view: MSPP_selected_btn,
                        tblName: MSPP_selected_btn,
                        };
        if(MSPP_selected_btn === "calendarperiod") {
            mod_MSPP_dict.period_tag = selected_period.period_tag;
            mod_MSPP_dict.period_datefirst = selected_period.period_datefirst;
            mod_MSPP_dict.period_datelast = selected_period.period_datelast;
        } else {
            mod_MSPP_dict.paydatecode_pk = selected_period.paydatecode_pk;  // value '0' is used for blank payrollperiods
            mod_MSPP_dict.paydatecode_caption = selected_period.paydatecode_code;
            mod_MSPP_dict.paydate_iso = selected_period.paydateitem_iso;
            mod_MSPP_dict.paydate_caption = selected_period.paydateitem_code;
        }

        //console.log( "mod_MSPP_dict", mod_MSPP_dict);
// ---  highlight selected button
        let btns = document.getElementById("id_MSPP_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_button = get_attr_from_el_str(btn, "data-btn");
            add_or_remove_class(btn, cls_btn_selected, data_button === mod_MSPP_dict.sel_view);
        }
// --- fill select table
         // names of select_table:  calendarperiod, paydatecode, paydateitem
         if(mod_MSPP_dict.sel_view === "calendarperiod") {
            MSPP_FillSelectTable(mod_MSPP_dict.sel_view);

    // ---  highligh selected period in table, put period_tag in data-tag of tblRow
            let tBody = document.getElementById("id_MSPP_tblbody");
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
            el_MSPP_datefirst.value = get_dict_value(selected_period, ["period_datefirst"])
            el_MSPP_datelast.value = get_dict_value(selected_period, ["period_datelast"])
    // ---  set min max of input fields
            MSPP_DateChanged("setminmax");
            el_MSPP_datefirst.disabled = !is_custom_period
            el_MSPP_datelast.disabled = !is_custom_period
    // ---  reset checkbox oneday, hide  when not is_custom_period
            el_MSPP_oneday.checked = false;
            add_or_remove_class(document.getElementById("id_MSPP_oneday_container"), cls_hide, !is_custom_period)

        } else if (mod_MSPP_dict.sel_view === "payrollperiod"){
               //console.log("mod_MSPP_dict.paydatecode_pk", mod_MSPP_dict.paydatecode_pk)

    // ---  fill select table Year
            const now = new Date();
            const this_year = now.getFullYear();
            let option_text = "";
            for (let year = this_year -1; year < this_year +2; year++) {
                 option_text += "<option value=\"" + year + "\" ";
                 if (year === this_year){option_text += " selected=true"};
                 option_text +=  ">" + year + "</option>";
            }
            document.getElementById("id_MSPP_input_year").innerHTML = option_text

    // ---  fill select table
            // select table will be filled by OnFocus event
           // MSPP_FillSelectTable(tblName);

    // ---  disable save buttong
            MSPP_DisableBtnSave();
    // Set focus to el_mod_employee_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){ el_MSPP_input_paydatecode.focus() }, 50);
        }

// ---  show only the elements that are used in this tab
        show_hide_selected_elements_byClass("btn_show", mod_MSPP_dict.sel_view);
    }  // MSPP_BtnSelect

//=========  MSPP_Save  ================ PR2020-07-15 PR2020-09-27
    function MSPP_Save() {
        //console.log("===  MSPP_Save  =====") ;
        //console.log( "mod_MSPP_dict", mod_MSPP_dict);

        /* mod_MSPP_dict = {
            paydate_caption: undefined
            paydate_iso: undefined
            paydatecode_caption: undefined
            paydatecode_code: "HRM / Payroll (Quicena Bouw)"
            paydatecode_pk: 32
            paydateitem_code: "02  -  zo 26 jan 2020"
            paydateitem_datefirst: "2020-01-13"
            paydateitem_datelast: "2020-01-26"
            paydateitem_iso: "2020-01-26"
            paydateitem_ppk: 32
            paydateitem_year: "2020"
            sel_view: "payrollperiod"
            tblName: "payrollperiod"
        */

// --- reset table
        //tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        //tblFoot_datatable.innerText = null

        let payroll_period_dict = {};

        if(mod_MSPP_dict.sel_view === "calendarperiod") {
    // ---  get period_tag
            const period_tag = get_dict_value(mod_MSPP_dict, ["period_tag"], "tweek");
    // ---  create upload_dict
            payroll_period_dict = {
                sel_btn: selected_btn,
                sel_view: "calendarperiod",
                now: get_now_arr(),
                period_tag: period_tag,
                extend_index: 0,
                extend_offset: 0};
            // only save dates when tag = "other"
            if(period_tag == "other"){
                payroll_period_dict.period_datefirst = el_MSPP_datefirst.value;
                payroll_period_dict.period_datelast = el_MSPP_datelast.value;
            }
        } else if(mod_MSPP_dict.sel_view === "payrollperiod") {
            payroll_period_dict = {
                        sel_btn: selected_btn,
                        sel_view: "payrollperiod",
                        paydatecode_pk: mod_MSPP_dict.paydatecode_pk,
                        paydatecode_code: mod_MSPP_dict.paydatecode_code,
                        paydateitem_year: mod_MSPP_dict.paydateitem_year,
                        paydateitem_datefirst: mod_MSPP_dict.paydateitem_datefirst,
                        paydateitem_datelast: mod_MSPP_dict.paydateitem_datelast,
                        period_datefirst: mod_MSPP_dict.paydateitem_datefirst,
                        period_datelast: mod_MSPP_dict.paydateitem_datelast
                        }
        }
    // ---  upload new setting
        const datalist_request = {payroll_period: payroll_period_dict,
                                  payroll_list: {get: true}
                                 };
        DatalistDownload(datalist_request);

        payroll_detail_list = [];
        payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'

        payroll_header_row = []
        payroll_total_row = [];
        payroll_period_agg_rows = [];
        payroll_period_detail_rows = [];

        is_payroll_detail_mode = false;

        UpdateHeaderText();

// hide modal
        $("#id_mod_select_period_paydate").modal("hide");
    }  // MSPP_Save

//=========  MSPP_FillSelectTable  ================ PR2020-06-22
    function MSPP_FillSelectTable(tblName) {
        //console.log( "===== MSPP_FillSelectTable ========= ", tblName);
        const tblBody_select = el_MSPP_tblbody;
        tblBody_select.innerText = null;

        if (tblName === "calendarperiod") {
            document.getElementById("MSPP_select_header").innerText = loc.Calendar_period + ":";
    //+++ insert td's ino tblRow
            const len = loc.period_select_list.length
            for (let j = 0, tblRow, td, tuple; j < len; j++) {
                tuple = loc.period_select_list[j];
    //+++ insert tblRow ino tblBody_select
                tblRow = tblBody_select.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        // --- add EventListener to tblRow.
                tblRow.addEventListener("click", function() {MSPP_SelecttableClicked(tblName, tblRow, j)}, false );
        //- add hover to tableBody row
                add_hover(tblRow);
                td = tblRow.insertCell(-1);
                td.innerText = tuple[1];
        //- add data-tag to tblRow
                tblRow.setAttribute("data-table", tblName);
                tblRow.setAttribute("data-tag", tuple[0]);
            }

/////////////////////////////////////////
        } else if (tblName === "paydatecode") {
            document.getElementById("MSPP_select_header").innerText = loc.Payroll_period + ":";
            el_MSPP_input_paydatecode.value = null
        //console.log( "paydatecode_map", paydatecode_map);
            if(paydatecode_map){
    // --- loop through data_map
                for (const [map_id, map_dict] of paydatecode_map.entries()) {
        //console.log( "map_dict", map_dict);
    // --- insert tblBody_select row
                    const tblRow = tblBody_select.insertRow(-1);
                    tblRow.id = map_dict.mapid;
                    tblRow.setAttribute("data-pk", map_dict.id);
                    tblRow.setAttribute("data-ppk", map_dict.comp_id);
                    tblRow.setAttribute("data-value", map_dict.code);  // used in t_Filter_SelectRows
                    add_hover(tblRow);
        //console.log( "map_dict.code", map_dict.code);
    // --- add first td to tblRow.
                    let td = tblRow.insertCell(-1);
                    let el_div = document.createElement("div");
                    el_div.innerText = map_dict.code;
                    td.appendChild(el_div);
                    td.classList.add("mx-2", "tw_200", "tsa_bc_transparent")
    // --- add addEventListener
                    tblRow.addEventListener("click", function() {MSPP_SelecttableClicked(tblName, tblRow)}, false);
    // --- highlight selected row
                    if(map_dict.id === mod_MSPP_dict.paydatecode_pk ) { tblRow.classList.add(cls_selected)}
                };
            }

/////////////////////////////////////////
        } else if (tblName === "paydateitem") {
            document.getElementById("MSPP_select_header").innerText = loc.Period + " - " + loc.Closing_date + ":";
            el_MSPP_input_paydateitem.value = null;
        //console.log( "paydateitem_map", paydateitem_map);
            if(paydateitem_map){
                for (const [map_id, map_dict] of paydateitem_map.entries()) {
                    const ppk_int = map_dict.pdc_id;
                    const selected_year = Number(document.getElementById("id_MSPP_input_year").value);
                    const show_row = ( ppk_int === mod_MSPP_dict.paydatecode_pk && map_dict.year === selected_year  )  ;

                    if(show_row){
    // --- insert tblBody_select row
                        const tblRow = tblBody_select.insertRow(-1);
                        tblRow.id = map_dict.mapid;
                        const period_text = ("0" + map_dict.period).slice(-2)
                        const datelast_text = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(map_dict.datelast));
                        const display = period_text + "  -  " + datelast_text;
                        // use datelast as pk in paydateitem, only irregular items have pk
                        tblRow.setAttribute("data-pk", map_dict.datelast);
                        tblRow.setAttribute("data-ppk", map_dict.pdc_id);
                        tblRow.setAttribute("data-year", map_dict.year);
                        tblRow.setAttribute("data-datefirst", map_dict.datefirst);
                        tblRow.setAttribute("data-datelast", map_dict.datelast);
                        tblRow.setAttribute("data-value", display);  // used in t_Filter_SelectRows
                        add_hover(tblRow);
        // --- add first td to tblRow.
                        const td = tblRow.insertCell(-1);
                        const el_div = document.createElement("div");
                        el_div.innerText = display;
                        td.appendChild(el_div);
                        td.classList.add("mx-2", "tw_200", "tsa_bc_transparent")

        // --- add addEventListener
                        tblRow.addEventListener("click", function() {MSPP_SelecttableClicked(tblName, tblRow)}, false);
        // --- highlight selected row
                        if(map_dict.id === mod_MSPP_dict.paydatecode_pk ) { tblRow.classList.add(cls_selected)}
                    }
                }
            };

        }

///////////////////////////
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

            MSPP_SelectItem(tblName, first_row);
            MSPP_DisableBtnSave();
        }

    }  // MSPP_FillSelectTable

//=========  MSPP_DisableBtnSave  ================ PR2020-06-23
    function MSPP_DisableBtnSave() {
        //console.log( "===== MSPP_DisableBtnSave ========= ");
        el_MSPP_btn_save.disabled = (mod_MSPP_dict.paydatecode_pk == null || mod_MSPP_dict.paydateitem_iso  == null);
        el_MSPP_input_paydateitem.readOnly = (mod_MSPP_dict.paydatecode_pk == null);
    }  // MSPP_DisableBtnSave

//=========  MSPP_InputOnfocus  ================ PR2020-06-23 PR2020-09-07
    function MSPP_InputOnfocus(tblName) {
        //console.log( "===== MSPP_InputOnfocus ========= ", tblName);
        // tblNames are 'paydatecode', 'paydateitem'
        MSPP_FillSelectTable(tblName)
        MSPP_DisableBtnSave();
    }  // MSPP_InputOnfocus

//=========  MSPP_InputElementKeyup  ================ PR2020-06-22
    function MSPP_InputElementKeyup(tblName, el_input) {
        //console.log( "===== MSPP_InputElementKeyup ========= ");
        //console.log( "tblName", tblName);
        // tblName is ' paydatecode' or 'paydateitem'
        let new_filter = el_input.value;
// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSPP_tblbody, cls_selected)
// ---  reset selected paydatecode_pk, paydate_iso
        if (tblName === "paydatecode") {
            mod_MSPP_dict.paydatecode_pk = null;
            mod_MSPP_dict.paydatecode_code = null;
            el_MSPP_input_paydateitem.value = null;
        }
        mod_MSPP_dict.paydateitem_iso = null;
        mod_MSPP_dict.paydateitem_code = null;
// ---  filter payrollperiod rows
        if (el_MSPP_tblbody.rows.length){
            const filterdict = t_Filter_SelectRows(el_MSPP_tblbody, new_filter);
        //console.log( "filterdict", filterdict);

// +++  if filter results have only one payrollperiod: select this payrollperiod
            const selected_rowid = get_dict_value(filterdict, ["selected_rowid"])
            const selected_pk = get_dict_value(filterdict, ["selected_pk"])
            //console.log( "selected_pk", selected_pk);
            if (selected_rowid) {
                const tblRow = document.getElementById(selected_rowid);
                // ---  highlight clicked row
                tblRow.classList.add(cls_selected)

                MSPP_SelectItem(tblName, tblRow);
                MSPP_DisableBtnSave();
            }
        };
        //MSO_headertext();
    }; // MSPP_InputElementKeyup

//=========  MSPP_SelecttableClicked  ================ PR2020-06-23
    function MSPP_SelecttableClicked(tblName, tblRow, selected_index) {
        //console.log( "===== MSPP_SelecttableClicked ========= ");
        //console.log( "tblName", tblName);
        if(tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            if (tblName === "calendarperiod") {
// ---  add period_tag to mod_MSPP_dict
                const period_tag = get_attr_from_el(tblRow, "data-tag")
                mod_MSPP_dict.period_tag = period_tag;
    // ---  enable date input elements, give focus to start
                if (period_tag === "other") {
                    // el_MSPP_datefirst / el_datelast got value in MSPP_Open
    // ---  show checkbox oneday when not is_custom_period
                    document.getElementById("id_MSPP_oneday_container").classList.remove(cls_hide);
                    el_MSPP_datefirst.disabled = false;
                    el_MSPP_datelast.disabled = false;
                    el_MSPP_btn_save.disabled = false
                    set_focus_on_el_with_timeout(el_MSPP_datefirst, 50);
                } else {
                    //set_focus_on_el_with_timeout(el_MSPP_btn_save, 50);
                    MSPP_Save();
                }
            } else if (tblName === "paydatecode") {
// ---  select item
                MSPP_SelectItem(tblName, tblRow);
                MSPP_DisableBtnSave();
                set_focus_on_el_with_timeout(el_MSPP_input_paydateitem, 50);
            } else if (tblName === "paydateitem") {
                // ---  select item
                MSPP_SelectItem(tblName, tblRow);
                MSPP_DisableBtnSave();
                set_focus_on_el_with_timeout(el_MSPP_btn_save, 50);
            }
        }
    };  // MSPP_SelecttableClicked

//=========  MSPP_SelectItem  ================ PR2020-06-23
    function MSPP_SelectItem(tblName, tblRow ) {
        //console.log( "===== MSPP_SelectItem ========= ", tblName);

        const selected_pk = get_attr_from_el(tblRow, "data-pk");
        const selected_ppk = get_attr_from_el_int(tblRow, "data-ppk");
        const selected_caption = get_attr_from_el(tblRow, "data-value");
        const selected_year = get_attr_from_el(tblRow, "data-year");
        const selected_datefirst = get_attr_from_el(tblRow, "data-datefirst");
        const selected_datelast = get_attr_from_el(tblRow, "data-datelast");

        //console.log( "selected_pk", selected_pk);
        //console.log( "selected_ppk", selected_ppk);
        //console.log( "selected_caption", selected_caption);
        //console.log( "selected_year", selected_year);
        //console.log( "selected_datefirst", selected_datefirst);
        //console.log( "selected_datelast", selected_datelast);

        if (tblName === "paydatecode") {
            mod_MSPP_dict.paydatecode_pk = (selected_pk) ? Number(selected_pk) : null;
            mod_MSPP_dict.paydatecode_code = (selected_caption) ? selected_caption : null;
            if (mod_MSPP_dict.paydatecode_pk) {
                el_MSPP_input_paydatecode.value = mod_MSPP_dict.paydatecode_code
// ---  set focus on input_paydateitem
                set_focus_on_el_with_timeout(el_MSPP_input_paydateitem, 50);
            }
        } else if (tblName === "paydateitem") {
            mod_MSPP_dict.paydateitem_iso = selected_pk;
            mod_MSPP_dict.paydateitem_ppk = selected_ppk;
            mod_MSPP_dict.paydateitem_code = (selected_caption) ? selected_caption : null;
            mod_MSPP_dict.paydateitem_year = selected_year;
            mod_MSPP_dict.paydateitem_datefirst = selected_datefirst;
            mod_MSPP_dict.paydateitem_datelast = selected_datelast;

            if (mod_MSPP_dict.paydateitem_iso) {
                el_MSPP_input_paydateitem.value = mod_MSPP_dict.paydateitem_code;
// ---  set focus on save btn
                set_focus_on_el_with_timeout(el_MSPP_btn_save, 50);
            }
        }
// ---  enable save button
        MSPP_DisableBtnSave()

        //console.log( "------mod_MSPP_dict.paydatecode_pk", mod_MSPP_dict.paydatecode_pk);
// ---  fill table paydate when paydatecode
        if (tblName === "paydatecode") {
            MSPP_FillSelectTable("paydateitem")
        };
    }  // MSPP_SelectItem

//=========  MSPP_DateChanged  ================ PR2020-07-11
    function MSPP_DateChanged(fldName) {
        //console.log("MSPP_DateChanged");
        //console.log("fldName", fldName);
        if (fldName === "oneday") {
            // set period_datelast to datefirst
            if (el_MSPP_oneday.checked) { el_MSPP_datelast.value = el_MSPP_datefirst.value};
            el_MSPP_datelast.readOnly = el_MSPP_oneday.checked;
        } else if (fldName === "setminmax") {
            // set datelast min_value to datefirst.value, remove when blank
            add_or_remove_attr (el_MSPP_datelast, "min", (!!el_MSPP_datefirst.value), el_MSPP_datefirst.value);
            // dont set datefirst max_value, change datelast instead
        } else if (fldName === "datefirst") {
            if ( (el_MSPP_oneday.checked) ||
                 (!!el_MSPP_datefirst.value  && el_MSPP_datefirst.value > el_MSPP_datelast.value)  ) {
                el_MSPP_datelast.value = el_MSPP_datefirst.value
            }
            // set datelast min_value to datefirst.value, remove when blank
            add_or_remove_attr (el_MSPP_datelast, "min", (!!el_MSPP_datefirst.value), el_MSPP_datefirst.value);
        }
    }  // MSPP_DateChanged




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

            selected_MSEF_btn = null;
            selected_MSEF_pk = -1;
            selected_MSEF_code = null;
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
         $("#id_modselectcustomerorder").modal({backdrop: true});

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
        $("#id_modselectcustomerorder").modal("hide");
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

//=========  MSO_InputKeyup  ================ PR2020-01-28
    function MSO_InputKeyup() {
       //console.log( "===== MSO_InputKeyup  ========= ");
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
    }; // MSO_InputKeyup

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
       //console.log( "===== MSO_FillSelectTableCustomer ========= ");

        const tblHead = null, filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = false, filter_include_absence = false, filter_istemplate = false;
        const addall_to_list_txt = "<" + loc.All_customers + ">";

        t_Fill_SelectTable(el_MSO_tblbody_customer, null, customer_map, "customer", mod_MSO_dict.customer_pk, null,
            MSO_MSEF_Filter_SelectRows, null, MSO_SelectCustomer, null, false,
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
       //console.log( "===== MSO_FillSelectTableOrder ========= ");
       //console.log( "mod_MSO_dict.customer_pk: ", mod_MSO_dict.customer_pk);
       //console.log( "mod_MSO_dict.order_pk: ", mod_MSO_dict.order_pk);

// ---  hide div_tblbody_order when no customer selected, reset tblbody_order
        add_or_remove_class (document.getElementById("id_MSO_div_tblbody_order"), cls_hide, !mod_MSO_dict.customer_pk)
        el_modorder_tblbody_order.innerText = null;

        if (!!mod_MSO_dict.customer_pk){
            const filter_ppk_int = mod_MSO_dict.customer_pk, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false;
            const addall_to_list_txt = "<" + loc.All_orders + ">";

            t_Fill_SelectTable(el_modorder_tblbody_order, null, order_map, "abscat", mod_MSO_dict.customer_pk, null,
                MSO_MSEF_Filter_SelectRows, null, MSO_SelectOrder, null, false,
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
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "abscat", mod_MSO_dict.order_pk)
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
//========= MSEF_Open ====================================  PR2020-02-27
    function MSEF_Open (mode) {
        //console.log(" ===  MSEF_Open  =====") ;
        MSEF_BtnSelect()
// ---  show modal
         $("#id_mod_select_employee_function").modal({backdrop: true});
    }; // MSEF_Open

//=========  MSEF_Save  ================ PR2020-01-29
    function MSEF_Save() {
        //console.log("===  MSEF_Save =========");

        SBR_DisplayEmployeeFunction();

        const tblName = (selected_btn === "payroll_detail") ? "payroll_detail": "payroll_agg"
        FillPayrollRows(tblName);
// hide modal
        $("#id_mod_select_employee_function").modal("hide");
    }  // MSEF_Save


//=========  MSEF_BtnSelect  ================ PR2020-09-19
    function MSEF_BtnSelect(btn) {
        //console.log( "===== MSEF_BtnSelect ========= ");
        // on opening modal btn = undefined, use value stored in selected_btn (default = 'employee'
        if(!btn) {
            if(!selected_MSEF_btn) {selected_MSEF_btn = "employee"}
        } else {
            selected_MSEF_btn = get_attr_from_el(btn,"data-btn","employee")
        };

// ---  highlight selected button
        highlight_BtnSelect(document.getElementById("id_MSEF_btn_container"), selected_MSEF_btn);
// fill select table
        MSEF_Fill_SelectTable()
// set header text
        MSEF_headertext();
    }  // MSEF_BtnSelect

//========= MSEF_Fill_SelectTable  ============= PR2020--09-17
    function MSEF_Fill_SelectTable() {
        //console.log("===== MSEF_Fill_SelectTable ===== ");

        const tblName = selected_MSEF_btn;
        const dictlist = (tblName === "functioncode") ? functions_inuse_dictlist : employees_inuse_dictlist

        const tblBody_select = document.getElementById("id_MSEF_tbody_select");
        tblBody_select.innerText = null;

// ---  add All to list when multiple employees / functions exist
        const len = dictlist.length
        if(len){
            const employees_functions = (tblName === "functioncode") ? loc.Functions : loc.Employees;
            const add_all_text = "<" + loc.All + employees_functions.toLowerCase() + ">";
            const add_all_dict = {pk: -1, code: add_all_text};
            MSEF_Create_SelectRow(tblName, tblBody_select, add_all_dict, selected_MSEF_pk)
        }
// ---  loop through dictlist
        for(let i = 0, tblRow, dict; dict = dictlist[i]; i++){
            if (!isEmpty(dict)) {
                MSEF_Create_SelectRow(tblName, tblBody_select, dict, selected_MSEF_pk)
            }
        }
    } // MSEF_Fill_SelectTable

//========= MSEF_Create_SelectRow  ============= PR2020-09-19
    function MSEF_Create_SelectRow(tblName, tblBody_select, dict, selected_pk) {
        //console.log("===== MSEF_Fill_SelectRow ===== ", tblName);

//--- get info from item_dict
        //[ {pk: 2608, code: "Colpa de, William"} ]
        const pk_int = dict.pk;
        const code_value = dict.code
        const is_selected_row = (pk_int === selected_pk);

//--------- insert tblBody_select row at end
        const map_id = "sel_" + tblName + "_" + pk_int
        const tblRow = tblBody_select.insertRow(-1);

        tblRow.id = map_id;
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-value", code_value);
        //tblRow.setAttribute("data-table", tblName);
        const class_selected = (is_selected_row) ? cls_selected: cls_bc_transparent;
        tblRow.classList.add(class_selected);

//- add hover to select row
        add_hover(tblRow)

// --- add td to tblRow.
        let td = tblRow.insertCell(-1);
        let el_div = document.createElement("div");
            el_div.classList.add("pointer_show")
            el_div.innerText = code_value;
            td.appendChild(el_div);
        td.classList.add("tw_200", "px-2")
        td.classList.add("tsa_bc_transparent")

//--------- add addEventListener
        tblRow.addEventListener("click", function() {MSEF_SelectEmployee(tblRow, event.target)}, false);
    } // MSEF_Create_SelectRow

//========= MSEF_headertext  ============= PR2020-09-19
    function MSEF_headertext(tblName) {
        //console.log( "=== MSEF_headertext  ");
        const label_text = loc.Select + ( (selected_MSEF_btn === "functioncode") ?  loc.Function.toLowerCase() : loc.Employee.toLowerCase() );
        document.getElementById("id_MSEF_header").innerText = label_text
        document.getElementById("id_MSEF_input_label").innerText = label_text

        const placeholder_text = loc.Type_letters_and_select + ( (selected_MSEF_btn === "functioncode") ? loc.a_function : loc.an_employee ) + loc.in__the_list
        document.getElementById("id_MSEF_input_employee").placeholder = placeholder_text
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
            selected_MSEF_pk = get_attr_from_el_int(tblRow, "data-pk");
            selected_MSEF_code = get_attr_from_el(tblRow, "data-value");
        //console.log( "selected_MSEF_pk", selected_MSEF_pk);
        //console.log( "selected_MSEF_code", selected_MSEF_code);


// ---  filter rows wth selected pk
            MSEF_Save()
        }
// ---  put value in input box, reste when no tblRow
            el_MSEF_input_employee.value = get_attr_from_el(tblRow, "data-value")
            MSEF_headertext();

    }  // MSEF_SelectEmployee

//=========  MSEF_InputKeyup  ================ PR2020-09-19
    function MSEF_InputKeyup() {
        //console.log( "===== MSEF_InputKeyup  ========= ");

// ---  get value of new_filter
        let new_filter = el_MSEF_input_employee.value

        let tblBody = document.getElementById("id_MSEF_tbody_select");
        const len = tblBody.rows.length;
        if (new_filter && len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one employee: put selected employee in el_MSEF_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const selected_value = get_dict_value(filter_dict, ["selected_value"])
            if (selected_pk) {
                el_MSEF_input_employee.value = selected_value;
// ---  put pk of selected employee selected_MSEF_pk
                selected_MSEF_pk = selected_pk;
                selected_MSEF_code = selected_value;
// ---  Set focus to btn_save
                el_MSEF_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSEF_InputKeyup

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

//========= SBR_DisplayEmployeeFunction  ====================================
    function SBR_DisplayEmployeeFunction() {
        //console.log( "===== SBR_DisplayEmployeeFunction  ========= ");
        //console.log( "selected_MSEF_btn ",selected_MSEF_btn);
        //console.log( "selected_MSEF_pk ",selected_MSEF_pk);
        //console.log( "selected_MSEF_code ",selected_MSEF_code);

        const label_caption = (selected_MSEF_btn === "functioncode") ? (loc.Function + ":") :
                              (selected_MSEF_btn === "employee") ? (loc.Employee + ":") : (loc.Employee + " / " + loc.Function);
        document.getElementById("id_SBR_label_select_employee").innerText = label_caption;
        let header_text = null;
        if(!selected_MSEF_btn){
           header_text = loc.All + loc.Employees.toLowerCase();
        } else if (selected_MSEF_pk > -1) {
            header_text = selected_MSEF_code;
        } else if(selected_MSEF_btn === "functioncode"){
            header_text = loc.All + loc.Functions.toLowerCase();
        } else {
              header_text = loc.All + loc.Employees.toLowerCase();
        }
        el_SBR_select_employee_function.value = header_text
    }; // SBR_DisplayEmployeeFunction

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
        const map_id = (tblRow) ? tblRow.id : null;
        const map_dict = get_mapdict_from_datamap_by_id(functioncode_map, map_id )
        const fldName = get_attr_from_el(el_clicked, "data-field");
        //console.log("map_dict", map_dict);

// ---  get info from map_dict
        const pk_int = (!is_addnew) ? map_dict.id : null;
        const ppk_int = (!is_addnew) ? map_dict.comp_id : get_dict_value(company_dict, ["id", "pk"]);
        const saved_code = (!is_addnew) ? map_dict.code : null;

// ---  create mod_dict
        mod_dict = {
            pk: pk_int,
            ppk: ppk_int,
            saved_code: saved_code,
            create: is_addnew,
            mapid: map_id
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
            const tblRow = document.getElementById(mod_dict.mapid)
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
            selected_functioncode_pk = (row_pk !== selected_functioncode_pk) ? row_pk : -1
            selected_functioncode_code = null;
            if (selected_functioncode_pk){
                const data_dict = get_mapdict_from_datamap_by_tblName_pk(functioncode_map, "functioncode", selected_functioncode_pk)
                selected_functioncode_code = data_dict.code;
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


//=========  MFU_SetTickmarkNEW  ================ PR2020-07-15
    function MFU_SetTickmarkNEW(el_clicked) {
        //console.log("========= MFU_SetTickmarkNEW  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
// --- deselect row when clicked on selected row
            let selected_row_pk = get_attr_from_el_int(tblRow, "data-pk")

// ---  set selected null when this row is already selected
            if (tblName === "functioncode" ) {
                if (selected_functioncode_pk && selected_row_pk === selected_functioncode_pk) {selected_row_pk = null}
                selected_functioncode_pk = selected_row_pk;
                selected_functioncode_code = null;
                if (selected_functioncode_pk){
                    const data_dict = get_mapdict_from_datamap_by_tblName_pk(functioncode_map, "functioncode", selected_functioncode_pk)
                    selected_functioncode_code = data_dict.code;
                }
            } else if (tblName === "paydatecode") {
                if (selected_paydatecode_pk && selected_row_pk === selected_paydatecode_pk) {selected_row_pk = null}
                selected_paydatecode_pk = selected_row_pk;
                selected_paydatecode_code = "";
                if (selected_paydatecode_pk){
                    const data_dict = get_mapdict_from_datamap_by_tblName_pk(paydatecode_map, "paydatecode", selected_paydatecode_pk)
                    selected_paydatecode_code = data_dict.code;
                }
            }
        //console.log("new selected_paydatecode_pk: ", selected_paydatecode_pk, typeof selected_paydatecode_pk);
// --- show tickmark on selected row, hide on other rows,
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected_row_pk && row_pk_int === selected_row_pk)
        //console.log("row_pk_int: ", row_pk_int, typeof row_pk_int);
        //console.log("is_selected_row: ", is_selected_row);
                    add_or_remove_class (row, cls_selected, is_selected_row);
                    add_or_remove_class( row.cells[0].children[0], "tickmark_0_2", is_selected_row, "tickmark_0_0")
            }}

// --- det header text
            UpdateHeaderText()
        }
    }  // MFU_SetTickmarkNEW


// +++++++++++++++++ MODAL WAGEFACTOR ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MWF_Open  ================ PR2020-07-13
    function MWF_Open(el_clicked, col_index) {
        //console.log("========= MWF_Open  ========= ");
        //console.log("el_clicked", el_clicked);
        //console.log("col_index", col_index);

// ---  get info from tblRow, is addnew when no tblRow
        const tblRow = get_tablerow_selected(el_clicked);

        const is_addnew = (!tblRow);
        const map_id = (tblRow) ? tblRow.id : null;
        const map_dict = get_mapdict_from_datamap_by_id(wagefactor_map, map_id )
        const fldName = get_attr_from_el(el_clicked, "data-field");

// ---  get info from map_dict
        const pk_int = (!is_addnew) ? map_dict.id : null;
        const ppk_int = (!is_addnew) ? map_dict.comp_id :
                                       get_dict_value(company_dict, ["id", "pk"])
        const code = (!is_addnew) ? map_dict.code : null;
        const wagerate = (!is_addnew) ? map_dict.wagerate : null;
        const is_default = (!is_addnew) ? map_dict.isdefault : false;

// ---  create mod_dict
        mod_dict = {
            pk: pk_int,
            ppk: ppk_int,
            code: code,
            wagerate: wagerate,
            isdefault: is_default,
            table: "wagefactor",
            create: is_addnew,
            mapid: map_id,
            just_opened: true
        }

// ---  put info in input boxes, set focus on selected field
        let has_set_focus = false;

// ---  reset input boxes
        el_MWF_input_code.value = code;
        el_MWF_input_wagerate.value = (wagerate) ? wagerate / 10000 : null;
        el_MWF_input_default.checked = is_default;

// ---  set focus on input code, if not set on selected field
        const el_id = (fldName) ? "id_MWF_input_" + fldName : "id_MWF_input_code";
        const el_focus = document.getElementById(el_id);
        if(el_focus) {set_focus_on_el_with_timeout(el_focus, 50)};

// ---  hide delete button when  is_addnew
        add_or_remove_class(el_MWF_btn_delete, cls_hide, is_addnew);

// ---  disable save button
        MWF_input_validate();

// ---  show modal
        $("#id_mod_wagefactor").modal({backdrop: true});
    }  // MWF_Open

//=========  MWF_Save  ================ PR2020-07-13
    function MWF_Save(crud_mode) {
        //console.log("========= MWF_Save  ========= ");
        //console.log("mod_dict", mod_dict);

        const is_delete = (crud_mode === "delete")
// ---  create upload_dict
        let upload_dict = {};
        let msg_err = null;
        if(mod_dict.create) {
            upload_dict = {id: {ppk: mod_dict.ppk, table: "wagefactor", create: true} };
        } else {
            upload_dict = {id: {pk: mod_dict.pk, ppk: mod_dict.ppk, mapid: mod_dict.mapid, table: "wagefactor"} }
            if(is_delete) {upload_dict.id.delete = true}
        };

        //console.log("mod_dict", mod_dict);
        if(is_delete) {
// ---  make row red when delete, before uploading
            const tblRow = document.getElementById(mod_dict.mapid)
            if(tblRow) {
                add_or_remove_class(tblRow, cls_error, true )
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            }
        } else {
// ---  get new_code from input box
            const new_code = el_MWF_input_code.value;
            if (new_code !== mod_dict.code) {
                upload_dict.code = {value: new_code, update: true}
            };
// ---  get new_wagerate from input box
            const input_value = el_MWF_input_wagerate.value
        //console.log("input_value", input_value);
        //console.log("input_value", input_value, typeof input_value);
            // get_number_from_input, function also multiplies input_value by 10000
            const arr = get_number_from_input(loc, "wagefactor", input_value);
            // validation took place in MWF_input_keyup
            const new_wagerate = arr[0];
        //console.log("mod_dict.wagerate", mod_dict.wagerate);
            if (new_wagerate !== mod_dict.wagerate) {
                upload_dict.wagerate = {value: new_wagerate, update: true}
        //console.log("new_wagerate", new_wagerate);
// ---  put new value in el_input before uploading
                const tblRow = document.getElementById(mod_dict.mapid)
        //console.log("tblRow", tblRow);
                if(tblRow){
                    const el_div = tblRow.cells[2].children[0];
        //console.log("el_div", el_div);
                    if(el_div){el_div.innerText = format_wagefactor (loc.user_lang, new_wagerate)};
                }
            };
         };

// ---  get new_default
        const new_isdefault = el_MWF_input_default.checked;
        //console.log("new_isdefault", new_isdefault);
        if (new_isdefault !== mod_dict.isdefault) {
            upload_dict.isdefault = {value: new_isdefault, update: true}
        //console.log("upload_dict.isdefault", upload_dict.isdefault);
// ---  refresh isdefault of all rows
            // set isdefault = true in current row, set false in all other rows
            for (let i = 0, item, tblRow; tblRow = tblBody_paydatecode.rows[i]; i++) {
                const el_div = tblRow.cells[3].children[0];
                 if(el_div){
                    const show_tickmark = (tblRow.id === mod_dict.mapid) ? new_isdefault : false;
                    add_or_remove_class(el_div, "tickmark_0_2", show_tickmark, "tickmark_0_0" )
            }}};
// ---  hide modal
        // dont use data-dismiss="modal", becasue when error occurs form must stay open to show msg box
        $("#id_mod_wagefactor").modal("hide");
// ---  UploadChanges
        UploadChanges(upload_dict, url_payroll_upload);
    }  // MWF_Save

//=========  MWF_refresh_isdefault  ================  PR2020-09-16
    function MWF_refresh_isdefault(el_input) {
        //console.log(" -----  MWF_refresh_isdefault   ----")ault of all rows

        if (!new_isdefault){
        // only set isdefault = false in current row
            el_MWF_input_default.checked = new_isdefault;
        } else {
        // set isdefault = true in current row, set fals in all other rows
            for (let i = 0, item, tblRow; tblRow = tblBody_paydatecode.rows[i]; i++) {
                const el_div = tblRow.cells[3].children[0];

                if(el_div){
                add_or_remove_class(el_div, "tickmark_0_2", (tblRow.id === mod_dict.mapid), "tickmark_0_0" )
                }
            }



        }

    }  // MWF_refresh_isdefault

//=========  MWF_input_validate  ================  PR2020-09-16
    function MWF_input_validate(el_input) {
        //console.log(" -----  MWF_input_validate   ----")
        // el_input does not exist when called on open
        let msg_err = null;
        const fldName = get_attr_from_el(el_input, "data-field");

// --- save btn is disabled on opening of form
        let disable_save_btn = mod_dict.just_opened;

// --- validate if code is entered, not when just_opened
        if(!mod_dict.just_opened){
            const new_code = el_MWF_input_code.value;
            if(!new_code){
                msg_err = loc.Description + loc.cannot_be_blank;
            } else {
    // --- validate if code already exists
                const new_code_lc =  new_code.toLowerCase();
                for (const [map_id, map_dict] of wagefactor_map.entries()) {
                    // skip this wagefactor, skip blank map_dict.code
                    if(map_id !== mod_dict.mapid && map_dict.code){
                        if( map_dict.code.toLowerCase() === new_code_lc){
                           msg_err = loc.Description + loc.already_exists;
                           break;
                }}};
            }
        }
// --- show error message
        const el_MWF_err_code = document.getElementById("id_MWF_err_code");
        el_MWF_err_code.innerText = msg_err;
        if(msg_err){disable_save_btn=true}

// --- validate if wagefactor has value,  not when just_opened
        msg_err = null;
        if(!mod_dict.just_opened){
            const new_wagerate = el_MWF_input_wagerate.value
            // input.value is string, therefore '0' is true. '0' is valid entry
            if(!new_wagerate){
                msg_err = loc.Percentage + loc.cannot_be_blank;
            } else {
    // --- validate if wagefactor is valid number
                const arr = get_number_from_input(loc, "wagefactor", new_wagerate);
                if (arr[1]) { msg_err = (arr[1]) };
            }
        }
// --- show error message
        const el_MWF_err_wagerate = document.getElementById("id_MWF_err_wagerate");
        el_MWF_err_wagerate.innerText = msg_err;
        if(msg_err){disable_save_btn=true}
// --- disable save btn when error or on open
        el_MWF_btn_save.disabled = disable_save_btn;
// --- set just_opened = false
        mod_dict.just_opened = false;
    }  // MWF_input_validate

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
        let map_id = null;
        if(tblRow) {
            const data_pk = get_attr_from_el(tblRow, "data-pk")
            const tblName = get_attr_from_el(tblRow, "data-table")
            paydatecode_dict = get_mapdict_from_datamap_by_tblName_pk(paydatecode_map, tblName, data_pk)
            map_id = tblRow.id;
        }

       //console.log("paydatecode_dict ", paydatecode_dict);
       //console.log("is_addnew ", is_addnew);
// ---  get info from paydatecode_dict
        const pk_int = (!is_addnew) ? paydatecode_dict.id : null;
        const ppk_int = (!is_addnew) ? paydatecode_dict.comp_id :
                                      get_dict_value(company_dict, ["id", "pk"])
        const code = (!is_addnew) ? paydatecode_dict.code : loc.Monthly;
        const afascode = paydatecode_dict.afascode;
        // TODO : validate unique, add get_paydatecode_with_sequence, enable validate unique on server

// default is monthly
        const recurrence = (!is_addnew) ? paydatecode_dict.recurrence : "monthly";
// default is 31 when is_addnew
        const dayofmonth = (!is_addnew) ? paydatecode_dict.dayofmonth : 31;
        const referencedate_iso = paydatecode_dict.referencedate;
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
        const datelast_agg = paydatecode_dict.datelast_agg;
        const datefirst_agg = paydatecode_dict.datefirst_agg;
// ---  get this year as selected_year, only used in "irregular"
        // TODO get last year from paydateitems, this_year if empty
        const this_year = get_now_arr()[0];
// ---  create mod_dict
        mod_dict = { pk: pk_int, ppk: ppk_int, table: "paydatecode", create: is_addnew,
            code: code, recurrence: recurrence, dayofmonth: dayofmonth, afascode: afascode,
            weekdayindex: weekday_index, referencedate: referencedate_iso,
            datefirst_agg: datefirst_agg, datelast_agg: datelast_agg,
            mapid: map_id,
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
            const tblRow = document.getElementById(mod_dict.mapid)
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

            if(mod_dict.recurrence === "monthly"){
                // mod_dict.dayofmonth only gets value when dayofmonth has changed
                const new_dayofmonth = document.getElementById("id_MPP_input_dayofmonth").value;
                const new_dayofmonth_int =(Number(new_dayofmonth)) ? Number(new_dayofmonth) : null
                if(new_dayofmonth_int && new_dayofmonth_int !== mod_dict.dayofmonth){
                    upload_dict["dayofmonth"] = {value: new_dayofmonth_int, update: true}
                }
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
                    // weekdayindex is put in field dayofmonth, referencedate will be deprecated
                    upload_dict.dayofmonth = {value: mod_dict.weekdayindex, update: true}
                    upload_dict.referencedate = {value: mod_dict.referencedate, update: true}
                } else{
                    upload_dict.referencedate = {value: mod_dict.referencedate, update: true}
                }

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
        // put weekdayindex in 'dayofmonth' (referencedate to be deprecated
            mod_dict.dayofmonth = mod_dict.weekdayindex

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
                    const order_by = null, employee_pk = null;
                    const tblRow = CreateTblRow(tblBody, tblName, null, null, order_by, employee_pk, -1, is_disabled)

       //console.log( "datelast_iso", datelast_iso);
       //console.log( "tblRow.cells[0]", tblRow.cells[0]);
       //console.log( "tblRow.cells[0].children[0]", tblRow.cells[0].children[0]);
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
        const order_by = null, employee_pk = null, is_disabled = false;
        const tblRow = CreateTblRow(tblBody, "closingdate", pk_int, ppk_int, order_by, employee_pk, -1, is_disabled)

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

//=========  MEP_Open  ================ PR2020-09-04
    function MEP_Open(tr_clicked) {
        //console.log("========= MEP_Open  ========= ");
        const emplhour_pk = get_attr_from_el_int(tr_clicked, "data-pk");
        const is_absence = !!get_attr_from_el_int(tr_clicked, "data-isabsence");
        mod_dict = {}
        if(emplhour_pk){

            is_payroll_detail_modal_mode = true;

            let upload_dict = {id: {table: "emplhour"}, emplhour_pk: emplhour_pk};
            UploadChanges(upload_dict, url_payroll_upload);
    // --- UploadChanges continues with MEP_FillLogTable(emplhourlog_list) and MEP_SetInputElements(emplhour_dict);

            MEP_ResetInputElements(is_absence);

    // --- show loader
            document.getElementById("id_MEP_loader").classList.remove(cls_hide)

    // ---  show modal
            $("#id_mod_emplhour_payroll").modal({backdrop: true});
        }
    }  // MEP_Open


//=========  MEP_Save  ================ PR2020-09-06
    function MEP_Save(tr_clicked) {
        //console.log("========= MEP_Save  ========= ");

        let upload_dict = {  //period_datefirst: selected_period.period_datefirst,
                   //period_datelast: selected_period.period_datelast,
                   id: {pk: mod_dict.pk,
                        ppk: mod_dict.ppk,
                        table: "emplhour"},
                   //rosterdate: {value: mod_dict.rosterdate},
                  // orderhour: {order_pk: mod_dict.order_pk}
                   };
/*
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
*/
        //const wagefactor_pk = (emplhour_dict.nopay) ? -1 : (emplhour_dict.wfc_id) ? emplhour_dict.wfc_id : 0
        const new_value_str = document.getElementById("id_MEP_wagefactor").value;
        const new_value_int = (Number(new_value_str)) ? Number(new_value_str) : 0
        let new_wagefactor_pk = 0, new_no_pay = false;
        let old_wagefactor_pk = (mod_dict.wfc_id) ? mod_dict.wfc_id : 0
        if(new_value_int === -1){
            new_no_pay = true;
            new_wagefactor_pk = 0;  // reset wagefactor_pk
        } else if (new_value_int === 0){
            new_no_pay = false;  // reset no_pay
            new_wagefactor_pk = 0;  // reset wagefactor_pk
        } else if (new_value_int > 0){
            new_no_pay = false;  // reset no_pay
            new_wagefactor_pk = new_value_int
        }
        if (new_no_pay !== mod_dict.nopay){
            upload_dict.nopay = {value: new_no_pay, update: true};
        }
        if (new_wagefactor_pk !== old_wagefactor_pk){
            const pk = (new_wagefactor_pk) ? new_wagefactor_pk : null;
            upload_dict.wagefactorcode = {pk: pk, update: true};
        }

        UploadChanges(upload_dict, url_emplhour_upload);

        // dont use data-dismiss="modal", becasue when error occurs form must stay open to show msg box
        $("#id_mod_emplhour_payroll").modal("hide");
    }  // MEP_Save

//=========  MEP_ResetInputElements  ================ PR2020-06-28
    function MEP_ResetInputElements(is_absence) {
       //console.log("========= MEP_ResetInputElements  ========= ");

// ---  set header
        document.getElementById("id_MEP_header").innerText = (is_absence) ? loc.Absence : loc.Roster_shift;
// ---  reset innerText of input controls
        const el_MEP_input_container = document.getElementById("id_MEP_input_container");
        let form_elements = el_MEP_input_container.querySelectorAll(".form-control");
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.innerText = null;
            // set disabled input boxes backgroun tsa_bc_lightlightgrey: in HTML
            el.classList.add("tsa_bc_disabled")
        }
        document.getElementById("id_MEP_modifiedby").innerText = null;
// ---  show / hide shift or absence controls
        const contains_classname = (is_absence) ? "ctl_absence" : "ctl_shift";
        show_hide_selected_elements_byClass("ctl_show", contains_classname, el_MEP_input_container)
// ---  set label of timeduration field
        document.getElementById("id_MEP_label_timeduration").innerText = (is_absence) ? loc.Absence_hours : loc.Worked_hours;
// ---  hide log table and button, reset tblbody.innerText
        document.getElementById("id_MEP_tblbody_container").classList.add(cls_hide);
        document.getElementById("id_MEP_btn_log").classList.add(cls_hide);
        document.getElementById("id_MEP_tblbody").innerText = null;
    }  // MEP_ResetInputElements

//=========  MEP_SetInputElements  ================ PR2020-06-28 PR2020-09-04
    function MEP_SetInputElements(emplhour_dict, emplhourlog_list) {
        //console.log("========= MEP_SetInputElements  ========= ");
        //console.log("emplhour_dict", emplhour_dict);
        //console.log("emplhourlog_list", emplhourlog_list);

        mod_dict = {pk: emplhour_dict.id,
                    ppk: emplhour_dict.oh_id,
                    mapid: emplhour_dict.mapid,
                    isabsence: emplhour_dict.isabsence,
                    rosterdate: emplhour_dict.rosterdate,
                    order_pk: emplhour_dict.order_id,
                    offsetstart: emplhour_dict.offsetstart,
                    offsetend: emplhour_dict.offsetend,
                    breakduration: emplhour_dict.breakduration,
                    timeduration: emplhour_dict.timeduration,
                    fnc_id: emplhour_dict.fnc_id,
                    wfc_id: emplhour_dict.wfc_id,
                    nopay: emplhour_dict.nopay,
                    pdc_id: emplhour_dict.pdc_id}

        const rosterdate_JS = get_dateJS_from_dateISO(emplhour_dict.rosterdate);
        // hide loader
        document.getElementById("id_MEP_loader").classList.add(cls_hide)
        let header_text = ( (emplhour_dict.isabsence) ? loc.Absence : loc.Roster_shift ) + loc.of_withspaces;
        header_text += (emplhour_dict.employeecode) ? emplhour_dict.employeecode : loc.No_employee_entered;
        document.getElementById("id_MEP_header").innerText = header_text
        document.getElementById("id_MEP_customer").innerText = emplhour_dict.customercode
        document.getElementById("id_MEP_order").innerText = emplhour_dict.ordercode
        document.getElementById("id_MEP_shift").innerText = emplhour_dict.shiftcode
        document.getElementById("id_MEP_rosterdate").innerText = format_dateJS_vanilla (loc, rosterdate_JS, false, false);

        const time_start = format_time_from_offset_JSvanilla( loc, emplhour_dict.rosterdate, emplhour_dict.offsetstart, true);  // true = display24
        document.getElementById("id_MEP_timestart").innerText = time_start;
        const time_end = format_time_from_offset_JSvanilla( loc, emplhour_dict.rosterdate, emplhour_dict.offsetend, true);  // true = display24
        document.getElementById("id_MEP_timeend").innerText = time_end;
        document.getElementById("id_MEP_breakduration").innerText = display_duration (emplhour_dict.breakduration, loc.user_lang);
        document.getElementById("id_MEP_timeduration").innerText = display_duration (emplhour_dict.timeduration, loc.user_lang);

        add_or_remove_class(document.getElementById("id_MEP_abscat"), "tsa_bc_disabled", !emplhour_dict.isabsence);
        add_or_remove_class(document.getElementById("id_MEP_timeduration"), "tsa_bc_disabled", !emplhour_dict.isabsence);
        document.getElementById("id_MEP_wagefactor").classList.remove("tsa_bc_disabled");

        // NOT IN USE YET: MEP_FillSelectOptions("functioncode", emplhour_dict.fnc_id);
        document.getElementById("id_MEP_functioncode").innerText = emplhour_dict.fnc_code;
        const wagefactor_pk = (emplhour_dict.nopay) ? -1 : (emplhour_dict.wfc_id) ? emplhour_dict.wfc_id : 0
        MEP_FillSelectOptions("wagefactor", wagefactor_pk);
        // NOT IN USE YET: MEP_FillSelectOptions("paydatecode", emplhour_dict.pdc_id);
        document.getElementById("id_MEP_paydatecode").innerText = emplhour_dict.pdc_code;
        MEP_FillSelectOptions("abscat", emplhour_dict.order_id);

    // -- remove grey font color from enabled input boxes
        const username = (emplhour_dict.modifiedbyusername) ? emplhour_dict.modifiedbyusername : "---";
        const modified_text = loc.Last_modified_by + " " + username + loc._on_

        const modified_dateJS = parse_dateJS_from_dateISO(emplhour_dict.modifiedat);
        const modified_at = format_datetime_from_datetimeJS(loc, modified_dateJS )  // hide_weekday, hide_year, hide_suffix

        document.getElementById("id_MEP_modifiedby").innerText = modified_text + modified_at;
    }

//========= MEP_FillSelectOptions  =========== PR2020-09-05
    function MEP_FillSelectOptions(tblName, selected_pk) {
        //console.log( "=== MEP_FillSelectOptions  ");
        //console.log( "tblName", tblName);
        //console.log( "selected_pk", selected_pk);
        // wagefactor_row = { code: "O150", id: 47, inactive: false, mapid: "wagefactor_47", wagerate: 150,
// ---  when wagefactor: add option '100%' at the start
        let option_text =  "<option value=\"0\">---</option>";
        const data_map = get_data_map(tblName)

        if (data_map.size){
        //--- loop through data_map or data_dict
            for (const [map_id, map_dict] of data_map.entries()) {
                const code = (tblName === "abscat") ? map_dict.o_code : map_dict.code;
                if (!map_dict.inactive || map_dict.id === selected_pk) {
                    option_text += "<option value=\"" + map_dict.id + "\">" + code + "</option>";
        }}};
// ---  when wagefactor: add option 'No payment' at the end
        if (tblName === "wagefactor") { option_text += "<option value=\"-1\">" + loc.No_payment + "</option>" } ;
        const el_id = (tblName === "functioncode") ? "id_MEP_functioncode" :
                      (tblName === "wagefactor") ? "id_MEP_wagefactor" :
                      (tblName === "paydatecode") ? "id_MEP_paydatecode" :
                      (tblName === "abscat") ? "id_MEP_abscat" : ""
        const el_select = document.getElementById(el_id);
        if(el_select){
            el_select.innerHTML = option_text;
// ---  set selected option
            el_select.value = selected_pk;
        }
    }  // MEP_FillSelectOptions

//=========  MEP_FillLogTable  ================ PR2020-09-04
    function MEP_FillLogTable(emplhourlog_list) {
        //console.log( "===== MEP_FillLogTable ========= ");
        const tblBody_select = document.getElementById("id_MEP_tblbody");
        tblBody_select.innerText = null;

// --- create header row
        if(emplhourlog_list && emplhourlog_list.length){

            // show btn log when there are log records
            const el_MEP_btn_log = document.getElementById("id_MEP_btn_log")
            el_MEP_btn_log.innerText = loc.Show_logfile;
            el_MEP_btn_log.classList.remove(cls_hide);

            const is_absence = emplhourlog_list[0].isabsence
            const first_caption = (is_absence) ? "Absence_category_2lines" : "Employee";
            const first_fieldname = (is_absence) ? "ordercode" : "employeecode";

            const field_caption = [first_caption, "Start_time", "End_time", "Break", "Hours", "Modified_on", "Modified_by"];
            const field_names = [first_fieldname, "offsetstart", "offsetend", "breakduration", "timeduration", "modifiedat", "modifiedbyusername"];
            const field_tags = ["text",  "offset", "offset", "duration", "duration", "datetime", "text"];
            const field_width = ["180", "090", "090", "060", "060", "120", "090"];
            const field_align = ["l",  "r", "r", "r", "r", "r", "l", "l"];

            const tblHeadRow = tblBody_select.insertRow(-1);
            for (let j = 0, len = field_caption.length; j < len; j++) {
                const caption = (loc[field_caption[j]]) ? loc[field_caption[j]] : "-";
                const field_name = field_names[j];
                let th = document.createElement("th");
                    let el = document.createElement("div");
                        el.innerText = caption;
                        el.classList.add("tw_" + field_width[j], "ta_" + field_align[j]);
                        if(field_name === "modifiedbyusername"){el.classList.add("ml-2")}
                    th.appendChild(el);
                tblHeadRow.appendChild(th);
            }

// --- loop through data_map ,only table paydate is filtered by paydatecode_pk
            emplhourlog_list.forEach(function (item) {
                //console.log( "item", item);
// --- insert tblBody_select row
                const tblRow = tblBody_select.insertRow(-1);
// --- add td to tblRow.
                for(let i=0, inner_text, field_name; field_name=field_names[i]; i++) {
                    let td = tblRow.insertCell(-1);
                    let el_div = document.createElement("div");
                    if(field_tags[i] === "text") {
                        inner_text = item[field_name];
                    } else if(field_tags[i] === "offset") {
                        inner_text = format_time_from_offset_JSvanilla( loc, item.rosterdate, item[field_name], true, false, true)  // display24, only_show_weekday_when_prev_next_day, skip_hour_suffix
                    } else if(field_tags[i] === "duration") {
                        inner_text = format_total_duration (item[field_name], loc.user_lang);
                    } else if(field_tags[i] === "datetime") {
                        const modified_dateJS = parse_dateJS_from_dateISO(item[field_name]);
                        inner_text = format_datetime_from_datetimeJS(loc, modified_dateJS, true, true, true )  // hide_weekday, hide_year, hide_suffix
                    }
                    el_div.innerText = inner_text;
                    td.appendChild(el_div);
                    el_div.classList.add("tw_" + field_width[i], "ta_" + field_align[i]);

                    if(field_name === "modifiedbyusername"){el_div.classList.add("ml-2")}
                };

        })};
        const row_count = tblBody_select.rows.length;
    }

//=========  MEP_ShowLog  ================ PR2020-09-05
    function MEP_ShowLog() {
        const log_container = document.getElementById("id_MEP_tblbody_container")
        const is_not_hidden = (!log_container.classList.contains(cls_hide))
        document.getElementById("id_MEP_btn_log").innerText = (is_not_hidden) ? loc.Show_logfile : loc.Hide_logfile;

        add_or_remove_class(log_container, cls_hide, is_not_hidden )
    }  // MEP_ShowLog

// +++++++++++++++++ MODAL ABSENCE CATEGORY ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MAC_Open  ================ PR2020-06-09
    function MAC_Open(col_index, el_clicked) {
        //console.log("========= MAC_Open  ========= ");
        //console.log("el_clicked", el_clicked);

        const field_names = field_settings.abscat.field_names;

// ---  get info from tblRow  - does not exist when ckicked on menu add_new btn
        let fldName = get_attr_from_el(el_clicked, "data-field")
        const tblRow = get_tablerow_selected(el_clicked);
        const is_addnew = (!tblRow);
        let abscat_dict = {};

// ---  get abscat_dict from abscat_map
        mod_dict = {};
        if(is_addnew) {
            mod_dict = {
                table: "abscat",
                create: true
            }
        } else {
            const map_id = tblRow.id;
            abscat_dict = get_mapdict_from_datamap_by_id(abscat_map, map_id)
    // ---  create mod_dict
            mod_dict = {
                pk: abscat_dict.id,
                ppk: abscat_dict.c_id,
                table: "abscat",
                mapid: map_id,
                colindex: col_index,
                abscatdict: deepcopy_dict(abscat_dict)  // needed to refresh tblRow before upload
            }
            mod_dict = deepcopy_dict(abscat_dict)
        }
        //console.log("mod_dict ", mod_dict);

// ---  put abscat_code in header
        const header_text = (mod_dict.o_code) ? loc.Absence_category + ": " + mod_dict.o_code : loc.Absence_category;
        document.getElementById("id_MAC_hdr_abscat").innerText = header_text;

// ---  put values in input boxes / check boxes
        let el_focus = document.getElementById("id_MAC_input_code");
        // form-control is a bootstrap class, tsa_input_checkbox is a TSA class only used to select input checkboxes
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const field = get_attr_from_el(el, "data-field")
            if(el.type === "checkbox") {
                if (field === "o_nopay"){
                    el.checked = !!mod_dict.o_nopay;
                } else if (field === "o_pay"){
                    el.checked = !mod_dict.o_nopay;
                } else {
                    el.checked =  mod_dict[field];
                };
            } else {
                el.value = (mod_dict[field]) ? mod_dict[field] : null;
            }
// ---  set focus to selected field PR2020-06-09 debug: works only once on checkbox, dont know how to solve it
            if (fldName && field === fldName){ el_focus = el}
        }
// set focus on input element that was clicked in tblRow, on input_code when new
        set_focus_on_el_with_timeout(el_focus, 50);
// reset err msg
        document.getElementById("id_MAC_err_o_code").innerText = null
        document.getElementById("id_MAC_err_o_identifier").innerText = null
        document.getElementById("id_MAC_err_o_sequence").innerText = null
// ---  hide delete abscat button when is_addnew
        if(is_addnew){el_MAC_btn_delete.classList.add(cls_hide)};
// ---  disable btn_save
        el_MAC_btn_save.disabled = true;

// ---  show modal
        $("#id_mod_abscat").modal({backdrop: true});
    } // MAC_Open

//=========  MAC_Save  ================ PR2020-06-10
    function MAC_Save(crud_mode) {
        //console.log("========= MAC_Save  ========= ");

        const is_delete = (crud_mode === "delete")
// ---  create upload_dict
        let upload_dict = {id: {isabsence: true, table: 'abscat', rowindex: mod_dict.rowindex } }
        if(mod_dict.create) {
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = mod_dict.id;
            upload_dict.id.ppk = mod_dict.c_id;
            if(is_delete) {upload_dict.id.delete = true}
        };
// ---  put changed values in upload_dict and change them in mod_dict (to diplay in tblrow before upload)
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el,"data-field");
            const field = mapped_abscat_fields[fldName];
            if(["o_code", "o_identifier", "o_sequence"].indexOf(fldName) > -1){
                if (field === "sequence") {
                    // arr[1] = msg_err, don't update when error - msg_err already displayed at MAC_validate_and_disable
                    const arr = get_number_from_input(loc, field, el.value)
                    if (!arr[1]) {
                        // arr[0] contains number, converted from input_sequence_str
                        if (arr[0] !== mod_dict[fldName]){
                            upload_dict[field] = {value: arr[0], update: true}
                            // update mod_dict, to show changed value in tblRow
                            mod_dict[fldName] = arr[0];
                    }};
                } else {
                    if (el.value !== mod_dict[fldName]){
                        upload_dict[field] = {value: el.value, update: true}
                        // update mod_dict, to show changed value in tblRow
                        mod_dict[fldName] = el.value;
                }};
            // skip field 'o_pay', it is opposite of 'nopay'. Nopay will be saved
            } else if(fldName !== "o_pay"){
                // mod_dict[fldName] can be null, therefore use !!, otherwise you can get (false !== null) = true
                if (el.checked !== (!!mod_dict[fldName])){
                    upload_dict[field] = {value: el.checked, update: true}
                    // update mod_dict, to show changed value in tblRow
                    mod_dict[fldName] = el.checked;
            }}};

        if(is_delete){
// ---  make row red when delete, before uploading
            let tblRow = document.getElementById(mod_dict.mapid);
            if(tblRow){ShowClassWithTimeout(tblRow, cls_error)};
        } else {
// ---  update tblRow before UploadChanges
            refresh_tblRowNEW(mod_dict, abscat_map, false, false, true); //  is_created, is_deleted, skip_show_ok
        }
// ---  UploadChanges
        UploadChanges(upload_dict, url_payroll_upload);
    }  // MAC_Save

//=========  MAC_validate_and_disable  ================  PR2020-06-10
    function MAC_validate_and_disable(el_clicked) {
        //console.log(" -----  MAC_validate_and_disable   ----")
        const fldName = get_attr_from_el(el_clicked, "data-field")
        //console.log(" fldName   ----", fldName)
        let msg_err = null;
        if(fldName === "o_code"){
            msg_err = validate_blank_unique_text(loc, abscat_map, "abscat", fldName, el_clicked.value, mod_dict.pk, true);
        } else if(fldName === "o_sequence"){
            const arr = get_number_from_input(loc, fldName, el_clicked.value)
            msg_err = arr[1]
        } else if(["o_pay", "o_nopay"].indexOf(fldName) > -1){
            const other_fldName = (fldName === "o_pay") ? "nopay" : "pay";
            const other_field = document.getElementById("id_MAC_" + other_fldName)
            other_field.checked = !el_clicked.checked;
        }
        const el_err = document.getElementById("id_MAC_err_" + fldName)
        if(el_err){ el_err.innerText = msg_err}

        el_MAC_btn_save.disabled = (!!msg_err);
    }  // MAC_validate_and_disable



// +++++++++++++++++ MODAL SELECT COLUMNS ++++++++++++++++++++++++++++++++++++++++++
//=========  ModColumnsOpen  ================ PR2020-09-02
    function ModColumnsOpen() {
       //console.log(" -----  ModColumnsOpen   ----")

        ModColumns_FillSelectTable();

        el_modcolumns_btn_save.disabled = true
// ---  show modal, set focus on save button
       $("#id_mod_select_columns").modal({backdrop: true});
    }  // ModColumnsOpen

//=========  ModColumns_Save  ================ PR2020-09-02
    function ModColumns_Save() {
        //console.log(" -----  ModColumns_Save   ----")

// ---  get un-selected items from table
        let col_hidden = [];
        let tBody = el_modcolumns_tblbody;
        for (let i = 0, tblRow, row_selected, row_tag; tblRow = tBody.rows[i]; i++) {
            row_selected = get_attr_from_el_int(tblRow, "data-selected")
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (!row_selected){
                col_hidden.push(row_tag);
            }
        };
        const upload_dict = {payroll_period: {col_hidden: col_hidden}};
        UploadSettings (upload_dict, url_settings_upload);

        selected_col_hidden = col_hidden

        //console.log("selected_col_hidden", selected_col_hidden)

        HandleBtnSelect()

// hide modal
        // in HTML: data-dismiss="modal"
    }  // ModColumns_Save

//=========  ModColumns_FillSelectTable  ================ PR2020-09-02
    function ModColumns_FillSelectTable() {
        //console.log("===  ModColumns_FillSelectTable == ");
        let tBody = el_modcolumns_tblbody;
        tBody.innerText = null;

        const col_hidden = (selected_col_hidden) ? selected_col_hidden : [];

//+++ insert td's ino tblRow
        const len = loc.payroll_columns_list.length
        for (let j = 0, tblRow, td, tuple, data_tag, caption; j < len; j++) {
            tuple = loc.payroll_columns_list[j];
            const data_tag = (tuple[0]) ? tuple[0] : null
            const caption = (tuple[1]) ? tuple[1] : null
            const is_hidden = (data_tag && col_hidden.includes(data_tag));
            //console.log("data_tag", data_tag, "caption", caption, "is_hidden", is_hidden);
//+++ insert tblRow into tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            tblRow.setAttribute("data-selected", (is_hidden) ? 0 : 1 );
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModColumns_SelectColumn(tblRow);}, false )
    //- add hover to tableBody row
            add_hover(tblRow)

            td = tblRow.insertCell(-1);
            let el_div = document.createElement("div");
                const class_text = (is_hidden) ? "tickmark_0_0" : "tickmark_0_2";
                el_div.classList.add(class_text)
                td.appendChild(el_div);
            td.classList.add("ta_c")

            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag  to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }
    } // ModColumns_FillSelectTable

//=========  ModColumns_SelectColumn  ================ PR2020-09-02
    function ModColumns_SelectColumn(tr_clicked) {
        //console.log("===  ModColumns_SelectColumn == ");
        if(!!tr_clicked) {
// ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)
// ---  toggle selected
            const value = get_attr_from_el_int(tr_clicked, "data-selected");
            const new_value = Math.abs(value - 1);
// ---  put new   value in tr_clicked
            tr_clicked.setAttribute("data-selected", new_value )
// ---  change icon
            const td = tr_clicked.cells[0];
            if (td){
                const el = td.children[0];
                if(el){
                    add_or_remove_class(el, "tickmark_0_2", !!new_value, "tickmark_0_0")
                }
            }
            el_modcolumns_btn_save.disabled = false;
        }
    }  // ModColumns_SelectColumn


// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2020-06-10 PR2020-09-14
    function ModConfirmOpen(crud_mode, el_input) {
        //console.log(" -----  ModConfirmOpen   ----")
        //console.log("crud_mode", crud_mode)
        // used in submenu_delete (el_input = undefined) and abscat UploadToggle
        const is_delete = (crud_mode === "delete");
        const is_set_inactive = (crud_mode === "inactive");
        let show_modal = is_delete;
        mod_dict = {};

// ---  get map_id form tblRow.id or selected_pk
        const tblName = selected_btn;
        const selected_pk = get_selected_pk(tblName);
        let tblRow = get_tablerow_selected(el_input);
        const map_id = (tblRow) ? tblRow.id : get_map_id(tblName, selected_pk);

// ---  when clicked on delete button in submenu there is no tblRow, use selected_pk instead
        if(!tblRow){tblRow = document.getElementById(map_id)};

        let header_txt = null, msg01_txt = null, msg02_txt = null
        let hide_btn_save = false, btn_save_caption = null, btn_cancel_caption = loc.No_cancel;
        if(!tblRow){
            msg01_txt = get_msg_txt_please_select(tblName);
            hide_btn_save = true;
            btn_cancel_caption = loc.Close;
            show_modal = true;
        } else {
            const data_map = get_data_map(tblName)
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
            mod_dict = {pk: map_dict.id, mapid: map_id, table: tblName, mode: crud_mode};
            let code = null;
            if (tblName === "abscat")  {
                mod_dict.ppk = map_dict.c_id;
                mod_dict.isabsence = true;
                code = map_dict.o_code;
            } else {
                mod_dict.ppk = map_dict.comp_id;
                code = map_dict.code;
            }

// +++  set inactive
            if (is_set_inactive){
    // ---  toggle inactive
                const is_inactive = (!map_dict.inactive);
    // ---  show modal confirm only when employee is made inactive
                show_modal = is_inactive;
                mod_dict.inactive = is_inactive;
    // ---  when made active: UploadChanges without showing confirm box
                // this one is not in use in fuctioncode (?abscatcode), already filterde out in YpdateTogge
                if(!is_inactive){
                    const upload_dict = {id: {pk: map_dict.id, table: tblName, mode: crud_mode},
                                        inactive: {value: is_inactive, update: true}}
                    UploadChanges(mod_dict, url_employee_upload);
                }
            }

// +++  get msg_txt en btn_caption
            msg01_txt = get_msg_txt_willbe_madeinctive_or_deleted(tblName, code, is_delete);
            msg02_txt = loc.Do_you_want_to_continue;
            btn_save_caption =  (is_delete) ? loc.Yes_delete : loc.Yes_make_inactive;
        }
// +++  set header text
        header_txt = get_ModConfirm_header_txt(tblName, is_delete);
// +++  show modal confirm
        if (show_modal){
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
    }  // ModConfirmOpen

//=========  ModConfirmSave  ==========  PR2020-06-10  PR2020-09-14
    function ModConfirmSave() {
        //console.log("===  ModConfirmSave  =====") ;
        //console.log("mod_dict", mod_dict) ;
        $("#id_mod_confirm").modal("hide");

        const tblName = mod_dict.table;

        let upload_dict = { id: {pk: mod_dict.pk,
             ppk: mod_dict.ppk,
             table: mod_dict.table,
             mapid: mod_dict.mapid}
          };

        if(mod_dict.isabsence) {
            upload_dict.id.isabsence = true;
        }
        if(mod_dict.mode === "delete") {
            upload_dict.id.delete = true;
        } else if (mod_dict.mode === "inactive") {
            upload_dict.inactive = {value: true, update: true}
        }

// ---  get tblRow
        let tblRow = document.getElementById(mod_dict.mapid);

        //console.log("mod_dict.mapid", mod_dict.mapid) ;
        //console.log("tblRow", tblRow) ;
        if(tblRow){
// ---  make row red when delete, before uploading
            if (mod_dict.mode === "delete") {
                ShowClassWithTimeout(tblRow, cls_error)
            } else {
// ---  toggle inactive icon, before uploading
                const filter = (tblName === "abscat") ? "[data-field=o_inactive]" :
                                (tblName === "functioncode") ? "[data-field=inactive]" : "xx";
                let el_input = tblRow.querySelector(filter);
                if(el_input){add_or_remove_class(el_input, "inactive_1_3", mod_dict.inactive, "inactive_0_2" )};
            }
        }
// ---  upload changes
        const url_str = url_payroll_upload;
        UploadChanges(upload_dict, url_str);

    }  // ModConfirmSave

//========= get_data_map  ======== PR2020-09-14
    function get_data_map(tblName) {
        return (tblName === "functioncode") ? functioncode_map :
                 (tblName === "wagecode") ? wagecoder_map :
                 (tblName === "wagefactor") ? wagefactor_map :
                 (tblName === "paydatecode") ? paydatecode_map :
                 (tblName === "abscat") ? abscat_map :
                 (tblName === "employee") ? employee_map : null;
    };
//========= get_selected_pk  ======== PR2020-09-14
    function get_selected_pk(tblName) {
        return (tblName === "functioncode") ? selected_functioncode_pk :
                 (tblName === "wagecode") ? selected_wagecode_pk :
                 (tblName === "wagefactor") ? selected_wagefactor_pk :
                 (tblName === "paydatecode") ? selected_paydatecode_pk :
                 (tblName === "abscat") ? selected_abscat_pk : null;
    };

//========= get_msg_txt_please_select  ======== PR2020-09-14
    function get_msg_txt_please_select(tblName) {
        return (tblName === "functioncode") ? loc.Please_select_function_first :
                (tblName === "wagecode") ? loc.Please_select_wagecode_first :
                (tblName === "wagefactor") ? loc.Please_select_wagefactor_first :
                (tblName === "paydatecode") ? loc.Please_select_payrollperiod_first :
                (tblName === "abscat") ? loc.Please_select_abscat_first : null;
    };
//========= get_msg_txt_please_select  ======== PR2020-09-14
    function get_msg_txt_willbe_madeinctive_or_deleted(tblName, code, is_delete) {
        const msg01_txt =  (tblName === "functioncode") ? loc.Function :
                (tblName === "wagecode") ? loc.Wage_code :
                (tblName === "wagefactor") ? loc.Wage_factor :
                (tblName === "paydatecode") ? loc.Payroll_period :
                (tblName === "abscat") ? loc.Absence_category : loc.This_item;
        return msg01_txt + " '" +  code + "' " + ( (is_delete) ? loc.will_be_deleted : loc.will_be_made_inactive  );
    };
//========= get_ModConfirm_header_txt  ======== PR2020-09-14
    function get_ModConfirm_header_txt(tblName, is_delete) {
        //console.log("tblName", tblName);
        //console.log("is_delete", is_delete);
        //console.log("loc.Delete_wagefactor", loc.Delete_wagefactor);
        return (is_delete) ?
                    (tblName === "functioncode") ? loc.Delete_function :
                    (tblName === "wagecode") ? loc.Delete_wagecode :
                    (tblName === "wagefactor") ? loc.Delete_wagefactor :
                    (tblName === "paydatecode") ? loc.Delete_payrollperiod :
                    (tblName === "abscat") ? loc.Delete_abscat : ""
                : loc.Make_inactive;
    };


//###########################################################################
// +++++++++++++++++ REFRESH ++++++++++++++++++++++++++++++++++++++++++++++++++



//=========  refresh_datamapNEW  ================ PR2020-09-06
    function refresh_datamapNEW(updated_rows) {
        //console.log(" --- refresh_datamapNEW  ---");
        if (updated_rows) {
            for (let i = 0, update_dict; update_dict = updated_rows[i]; i++) {
                RefreshEmplhour_MapItem(update_dict, is_update_check)
            }
        }
    } // refresh_datamapNEW

//=========  refresh_datamap_item  ================ PR2020-09-06
    function refresh_datamap_item(data_map, update_dict, skip_show_ok) {
        //console.log(" --- refresh_datamap_item  ---");
        //console.log("update_dict", update_dict);

// ---  update or add update_dict in data_map
        const map_id = update_dict.mapid;
        const old_map_dict = data_map.get(map_id);

        const is_deleted = update_dict.deleted;
        const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

        let updated_columns = [];
        //console.log("data_map.size before: " + data_map.size);
// ---  insert new item
        if(is_created){
            data_map.set(map_id, update_dict)
            updated_columns.push("created")
// ---  delete deleted item
        } else if(is_deleted){
            data_map.delete(map_id);
        } else {
// ---  update item in data_map
            data_map.set(map_id, update_dict)
// ---  check which fields are updated, add to list 'updated_columns'
            // new item has no old_map_dict PR2020-08-19
            const arr = map_id.split("_")
            const tblName = (arr) ? arr[0] : null;
            const field_names = field_settings[tblName].field_names;
            for (let i = 0, col_field, old_value, new_value; col_field = field_names[i]; i++) {
                if (col_field in old_map_dict && col_field in update_dict){
                    if (old_map_dict[col_field] !== update_dict[col_field] ) {
                        updated_columns.push(col_field)
                    }
                }
            };
        }  // if(is_created){
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
            let row_index = -1;

// add new tablerow if it does not exist
            const tblBody = (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1) ?
                                tblBody_paydatecode : tblBody_datatable;

            const order_by = null, employee_pk = null, is_disabled = false;
            tblRow = CreateTblRow(tblBody, selected_btn, pk_int, ppk_int, order_by, employee_pk, row_index, is_disabled)

            UpdateTblRow(tblRow, update_dict)

// highlight new row
            DeselectHighlightedRows(tblRow, cls_selected);
            tblRow.classList.add(cls_selected)

        } else {
            tblRow = document.getElementById(map_id);
        }
        if(tblRow){
            if(is_deleted){
//--- remove deleted tblRow
                tblRow.parentNode.removeChild(tblRow);
//--- make tblRow green for 2 seconds
            } else if(is_created && !skip_show_ok){
                ShowOkElement(tblRow);
            } else if(updated_columns && !skip_show_ok){
// ---  make updated fields green for 2 seconds
                for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                    const el = cell.children[0];
                    if(el){
                        const el_field = get_attr_from_el(el, "data-field")
                        if(updated_columns.includes(el_field)){
                            UpdateField( el, update_dict, skip_show_ok)
                        }
                    }
                }
            }
        }
    }  // refresh_datamap_item

//###########################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= MSO_MSEF_Filter_SelectRows  ====================================
    function MSO_MSEF_Filter_SelectRows() {
        //console.log( "===== MSO_MSEF_Filter_SelectRows  ========= ");
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
    }; // MSO_MSEF_Filter_SelectRows


//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++
    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")
// ---  create file Name and worksheet Name
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            let filename = (selected_btn === "payroll_agg") ? loc.Overview_rosterhours_per_category : loc.Overview_rosterhours;
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
        if (selected_btn === "payroll_agg"){
            detail_rows = (is_payroll_detail_mode) ? payroll_period_detail_rows : payroll_period_agg_rows
        } else if(selected_btn === "payroll_detail"){
            detail_rows = payroll_period_detail_rows
        }
        //console.log("detail_rows", detail_rows)
        // sel_view is 'calendarperiod' or 'payrollperiod'
        const is_period_view = get_dict_value(selected_period, ["sel_view"]) === "calendarperiod"
        let ws = {};

// --- title row
        let title =  (selected_btn === "payroll_agg") ? loc.Overview_rosterhours_per_category : loc.Overview_rosterhours
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
                ws["B5"] = {v: selected_detail_employee_code , t: "s"};

                ws["A6"] = {v: loc.Period + ":", t: "s"};
                ws["B6"] = {v: display_period, t: "s"};
            } else {
                ws["A5"] = {v: loc.Period + ":", t: "s"};
                ws["B5"] = {v: display_period , t: "s"};
            }
        } else {
            if (is_payroll_detail_mode){
                ws["A5"] = {v: loc.Employee + ":", t: "s"};
                ws["B5"] = {v: selected_detail_employee_code , t: "s"};
                ws["A6"] = {v: loc.Payroll_period + ":", t: "s"};
                ws["B6"] = {v: selected_paydateitem_code, t: "s"};
            } else {
                ws["A5"] = {v: selected_paydatecode_code, t: "s"};
                ws["A6"] = {v: selected_paydateitem_code , t: "s"};
            }
        }

// +++  header row

        const header_rowindex =  9

        const col_count = payroll_excel_header.length;
        let ws_cols = []
        // column 0 is margin for select
        for (let i = 1; i < col_count; i++) {
            const excel_col = i - 1
            const cell_value = payroll_excel_header[i];
            // excell index is header_row_index -1 because of margin column in header_row
            const cell_index = b_get_excel_cell_index (i - 1, header_rowindex);
            ws[cell_index] = {v: cell_value, t: "s"};

            const col_width = (payroll_excel_cellwidth[i]) ? payroll_excel_cellwidth[i] : 15;
            ws_cols.push( {wch:col_width} );
        }

        const index_first_datarow = header_rowindex + 2;
        let row_index = index_first_datarow;

// --- loop through detail_rows
        //  detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        if(!!detail_rows){
            for (let j = 0, detail_row; detail_row = detail_rows[j]; j++) {
                if(detail_row[0]){  //  detail_row[0] = show_row
                    const row_data = detail_row[3] //  detail_row[3] = excel_data
                    // column 0 is margin for select
                    for (let x = 1, cell_index, cell_value, cell_type, cell_format, col_name, len = row_data.length; x < len; x++) {
                        // excell column is header_row_index -1 because of margin column in header_row
                        cell_index = b_get_excel_cell_index ( x - 1, row_index);

                        cell_type = payroll_excel_celltype[x];
                        ws[cell_index] = {t: cell_type}

                        cell_format = payroll_excel_cellformat[x];
                        if(cell_format){ws[cell_index]["z"] = cell_format};

                        col_name = payroll_excel_colnames[x];
                        cell_value = null;
                        if(["plandur", "totaldur", "timedur", "absdur", "orderdetail", "absdetail"].indexOf(col_name) > -1) {
                            if (row_data[x]) {cell_value = row_data[x] / 60};
                        } else  {
                            cell_value = row_data[x];
                        }
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
                for (let x = 1; x < col_count; x++) {
                    // excell column is header_row_index -1 because of margin column in header_row
                    const cell_index = b_get_excel_cell_index (x - 1, row_index);

                    const cell_type = payroll_excel_celltype[x];
                    ws[cell_index] = {t: cell_type}

                    const cell_format = payroll_excel_cellformat[x];
                    if(x === 1) {
                        ws[cell_index]["v"] = loc.Total;
                    } else {
                        const cell_formula = get_cell_formula(x, cell_type, cell_format, index_first_datarow, index_last_datarow);
                        if(cell_formula){ws[cell_index]["f"] = cell_formula};
                    }
                }
                row_index += 1;
            }

            const cell_index = b_get_excel_cell_index ( col_count - 1, row_index);
            ws["!ref"] = "A1:" + cell_index;
            // set column width
            ws['!cols'] = ws_cols;
        }  // if(!!emplhour_map){

        //console.log (ws)
        return ws;
    }  // FillExcelRows

    function get_cell_formula(x, cell_type, cell_format, index_first_datarow, index_last_datarow){
        let cell_formula = null;

        if (cell_type === "n" && cell_format !== "dd mmm yyyy" ) {
            const cell_first = b_get_excel_cell_index (x - 1, index_first_datarow);
            const cell_last = b_get_excel_cell_index (x - 1, index_last_datarow);
            cell_formula = "SUM(" + cell_first + ":" + cell_last + ")";
        };
        return cell_formula;
    }

}); //$(document).ready(function()
