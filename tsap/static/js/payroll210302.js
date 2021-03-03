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
        const url_paydatecode_import = get_attr_from_el(el_data, "data-paydatecode_import_url");
        const url_afas_ehal_xlsx = get_attr_from_el(el_data, "data-afas_ehal_xlsx_url");
        const url_afas_hours_xlsx = get_attr_from_el(el_data, "data-afas_hours_xlsx_url");

        // TODO change imgsrc to backgroundimage
        const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_chck01 = get_attr_from_el(el_data, "data-imgsrc_chck01");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");

        const selected = {
            detail_employee_pk: -1,  // used to filter in detail_mode. -1 = all, 0 = shifts without emploee
            detail_employee_code: "",  // PR2020-11-11 debugL: default value 'null' may give error in export to excel
            employee_pk: -1,  // -1 = all, 0 = shift without emploee
            employee_code: "",  // PR2020-11-11 debugL: default value 'null' may give error in export to excel
            isabsence: null,

            wagecode_pk: null,
            wagecode_key: "",
            wagecode_code: "",
            wagecode_description: "",

            wagefactor_pk: null,
            wagefactor_code: "",

            functioncode_pk: -1,   // -1 = all, 0 = shift without functioncode
            functioncode_code: "",

            abscat_pk: null,
            abscat_code: null,

            paydatecode_pk: null,
            paydatecode_code: "",
            paydateitem_iso: null,  // used in MSPP_SelectItem
            paydateitem_code: ""
        }

        let selected_period = {};


        let selected_btn = null;
        let selected_key = null;  // selected_key = btn "functioncode" > "fnc"  btn "wagefactor" > "wfc" : btn "wagecode" > "wgc" : btn "allowance" > "alw", btn "paydatecode" > "",  btn "abscat" > ""
        let selected_view = null; //selected views are 'calendar_period' and 'payroll_period', gets value in DatalistDownload response

        let is_quicksave = false
        let is_payroll_detail_mode = false;
        let is_payroll_detail_modal_mode = false;
        //let is_period_paydate = false;

        let is_period_allowance = false;

        let selected_col_hidden = [];

        let payroll_needs_update = true;

        let company_dict = {};
        let employee_map = new Map();
        let customer_map = new Map();
        let order_map = new Map();
        let abscat_map = new Map(); // list of all absence categories

        let wagecode_map = new Map();
        //let functioncode_map = new Map();
        //let allowance_map = new Map();

        let paydatecode_map = new Map();
        let paydateitem_map = new Map();

        let payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'
        let paydatecodes_inuse_list = [];
        let paydateitems_inuse_list = [];
        let employees_inuse_list = [];

        let payroll_header_row = []
        let payroll_total_row = [];

        // these 4 lists contain all records and all columns. They are filtered out in FillPayrollRows
        let payroll_hours_from_server = []; // comes from server, sorted by date, employee_code
        let payroll_hours_agg_list = [];  // list group and sorted by employee, created by create_agg_list from  payroll_hours_from_server
        let payroll_hours_agg_rows = [];  // HTML, filter and excel , created by CreateHTML_list from payroll_hours_agg_list
        let payroll_hours_detail_rows = [];  // HTML, filter and excel , created by CreateHTML_list from payroll_hours_from_server

        let payroll_alw_from_server = []; // emplhour records with allowance aggergated PR2021-02-02
        let payroll_alw_agg_list = [];  // list group and sorted by employee, created by create_agg_list from  payroll_alw_from_server
        let payroll_alw_agg_rows = [];  // HTML, filter and excel , created by CreateHTML_list from payroll_alw_agg_list
        let payroll_alw_detail_rows = [];  // HTML, filter and excel , created by CreateHTML_list from payroll_alw_from_server

        let abscats_inuse_list_sorted = [];
        let orders_inuse_list_sorted = [];
        let employees_inuse_dictlist = [];
        let functions_inuse_dictlist = [];
        let allowances_inuse_dictlist = [];
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
        let mod_MWF_dict = {};
        let mod_MAC_dict = {};
        let mod_MSO_dict = {};
        let mod_MSPP_dict = {};
        let mod_MSEF_dict = {};  // - used in SBR select employee / function, contains id of selected employee / functioncode. Only one of them can have value

        let filter_select = "";
        let filter_show_inactive = false;
        let filter_dict = {};
        let filter_mod_employee = "";
        let filter_checked = false; // not a filter, but sets employee selected

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const mapped_abscat_fields = {o_code: "code", o_identifier: "identifier", o_sequence: "sequence", o_nopay: "nopay",
                               o_nowd: "nohoursonweekday", o_nosat: "nohoursonsaturday",
                               o_nosun: "nohoursonsunday", o_noph: "nohoursonpublicholiday",
                               wfc_onwd: "wagefactorcode", wfc_onsat: "wagefactoronsat",
                               wfc_onsun: "wagefactoronsun", wfc_onph: "wagefactoronph",
                               o_inactive: "inactive"}

        const field_settings = {
            //PR2020-06-02 dont use loc.Employee here, has no value yet.
            abscat: {field_caption: ["", "Absence_category", "AFAS_code_1line", "Weekdays", "Saturdays", "Sundays", "Public_holidays", "Weekdays", "Saturdays", "Sundays", "Public_holidays", "Priority", ""],
                        field_names: ["margin", "o_code", "o_identifier", "wfc_onwd", "wfc_onsat", "wfc_onsun", "wfc_onph", "o_nowd", "o_nosat", "o_nosun", "o_noph", "o_sequence", "o_inactive"],
                        filter_tags: ["", "text","text", "text", "text", "text", "text", "triple", "triple", "triple", "triple", "number", "inactive"],
                        field_width:  ["020", "180", "090", "090", "090", "090", "090", "090", "090", "090", "090", "090", "020"],
                        field_align: ["c", "l", "l", "l","l","l","l","c",  "c", "c", "c", "c", "c"]},
            payroll_hours_agg: { field_caption: ["", "Employee", "ID_number_2lines",  "Payroll_code_2lines","Planned_hours_2lines", "Total_hours_2lines", "Total_worked_2lines", "", "Total_absence_2lines", "", "Wage_component_2lines", "Function", "Payroll_period", ""],
                        field_names: ["back", "employee_code", "e_identifier",  "payrollcode", "plandur", "totaldur", "timedur", "orderdetail", "absdur", "absdetail", "wagefactorcode", "functioncode", "paydatecode", "margin_end"],
                        filter_tags: ["", "text", "text", "text", "duration", "duration", "duration", "duration", "duration", "duration", "text", "text", "text", "-"],
                        field_width: ["020", "180", "100", "100", "090", "090", "090", "090", "090", "090", "120", "120", "120", "032"],
                        field_align: ["c", "l", "l", "l", "r", "r", "r", "r", "r", "r", "l", "l", "l", "c"]},
            payroll_hours_detail: { field_caption: ["", "Employee", "ID_number_2lines",  "Payroll_code_2lines","Date", "Order", "Projectcode_2lines", "Start_time", "End_time", "Planned_hours_2lines", "Total_hours_2lines", "Total_worked_2lines", "", "Total_absence_2lines", "", "Wage_component_2lines", "Function", "Payroll_period", "margin_end"],
                        field_names: ["status", "employee_code", "e_identifier",  "payrollcode", "rosterdate", "c_o_code", "o_identifier", "offsetstart", "offsetend", "plandur", "totaldur", "timedur", "orderdetail", "absdur", "absdetail", "wagefactorcode", "functioncode", "paydatecode", "margin_end"],
                        filter_tags: ["status", "text", "text", "text", "text", "text", "text", "text", "text", "duration", "duration", "duration", "duration", "duration", "duration", "text", "text", "text", ""],
                        field_width: ["020", "180", "100",  "100",  "090",  "180", "100", "090", "090", "090", "090", "090", "090", "090", "090", "100", "100", "100", "032"],
                        field_align: ["c", "l", "l", "l", "l", "l", "l", "r", "r", "r", "r", "r", "r", "r", "r", "l", "l", "l", "c"]},

            payroll_alw_agg: { field_caption: ["", "Employee", "ID_number_2lines",  "Payroll_code_2lines", "Total_allowance_2lines", "",                "",                   "Wage_component_2lines", "Function", "Payroll_period", ""],
                        field_names: ["back", "employee_code", "e_identifier",      "payrollcode",         "totalamount",            "allowanceamount", "allowancequantity",   "wagefactorcode", "functioncode", "paydatecode", "margin_end"],
                        filter_tags: ["", "text", "text", "text",        "duration", "duration", "duration",    "text", "text", "text", "-"],
                        field_width: ["020", "180", "100", "100",          "090", "090",   "090",      "120", "120", "120", "032"],
                        field_align: ["c", "l", "l", "l",            "r", "r",     "r",       "l", "l", "l", "c"]},
            payroll_alw_detail: { field_caption: ["", "Employee", "ID_number_2lines",  "Payroll_code_2lines","Date", "Order", "Projectcode_2lines",          "Total_allowance_2lines", "",    "",            "Wage_component_2lines", "Function", "Payroll_period", "margin_end"],
                        field_names: ["status", "employee_code", "e_identifier",  "payrollcode", "rosterdate", "c_o_code", "o_identifier",           "totalamount",  "allowanceamount", "allowancequantity",   "wagefactorcode", "functioncode", "paydatecode", "margin_end"],
                        filter_tags: ["status", "text", "text", "text", "text", "text", "text",            "duration", "duration",    "duration",                  "text", "text", "text", ""],
                        field_width: ["020", "180", "100",  "100",  "090",  "180", "100", "090", "090",  "090",          "100", "100", "100", "032"],
                        field_align: ["c", "l", "l", "l", "l", "l", "l", "r", "r",   "r", "r",   "r",          "l", "l", "l", "c"]},

            afas_alw_detail: { field_caption: ["Payroll_period", "Year", "Period", "Date", "Employee_code", "Employee", "Company", "Order_identifier", "Order", "Alw_code", "Alw_description", "Rate", "Quantity", "Amount"],
                        field_names: ["pdc_code", "pdi_year", "pdi_period", "rosterdate", "e_payrollcode", "e_name", "comp_id", "o_identifier", "c_o_code", "alw_code", "alw_description", "rate", "quantity", "amount"],
                        cell_width: [ 25, 10, 10, 10,   10, 25,   10, 15, 25, 10, 15, 10, 10, 10 ]},

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
            wagecode: { field_caption: ["", "Salary_scale", "Hourly_wage"],
                        field_names:  ["select", "code", "wagerate", "" , "inactive", "delete"],
                        filter_tags: ["", "text", "number", "", "inactive"],
                        field_width: ["016",  "150", "120", "032","032"],
                        field_align: ["c", "l", "r", "c", "c"]},
            wagefactor: { field_caption: ["", "Wage_component_2lines", "Description", "Percentage", "Default_wage_component_2lines", ""],
                        field_names:  ["select", "code", "description", "wagerate", "isdefault", "inactive"],
                        filter_tags: ["", "text", "text", "number ", "", "inactive"],
                        field_width: ["016", "120", "180", "120", "120", "032"],
                        field_align: ["c", "l", "l", "r", "c", "c"]},
            allowance: { field_caption: ["", "Wage_component_2lines", "Description", "Amount", ""],
                        field_names:  ["select", "code", "description", "wagerate", "inactive"],
                        filter_tags: ["", "text", "text","number ", "inactive"],
                        field_width: ["016", "120", "180", "120", "032"],
                        field_align: ["c", "l", "l", "r", "c"]},
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
// ---  side bar - select hours / allowances
        const el_sbr_select_allowance = document.getElementById("id_SBR_select_allowance");
            el_sbr_select_allowance.addEventListener("change", function() {Sidebar_SelectAllowance(el_sbr_select_allowance)}, false );
            add_hover(el_sbr_select_allowance)
// ---  side bar - select employee - function
        const el_SBR_select_employee_function = document.getElementById("id_SBR_select_employee");
            el_SBR_select_employee_function.addEventListener("click", function() {MSEF_Open()}, false );
            add_hover(el_SBR_select_employee_function);
// ---  side bar - select order
        const el_sidebar_select_order = document.getElementById("id_SBR_select_order");
            el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
            add_hover(el_sidebar_select_order);
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

// ---  MOD SELECT EMPLOYEE / FUNCTIONCODE ------------------------------
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
        const el_MSO_tblbody_customer = document.getElementById("id_MSO_tblbody_customer");
        const el_modorder_tblbody_order = document.getElementById("id_MSO_tblbody_order");
        const el_MSO_input_customer = document.getElementById("id_MSO_input_customer")
            el_MSO_input_customer.addEventListener("keyup", function(event){
                setTimeout(function() {MSO_InputKeyup()}, 50)});
        const el_MSO_btn_save = document.getElementById("id_MSO_btn_save")
            el_MSO_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MODAL ABSENCE CATEGORY
        const el_MAC_input_container = document.getElementById("id_MAC_input_container");
        const el_MAC_input_els = el_MAC_input_container.querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = el_MAC_input_els[i]; i++) {
            el.addEventListener("keyup", function(event){ setTimeout(function() {MAC_InputKeyup(el)}, 50)});
            el.addEventListener("keyup", function(event){ setTimeout(function() {MAC_validate_and_disable(el)}, 150)});
        };
        const el_MAC_nohours_container = document.getElementById("id_MAC_nohours_container");
        const el_MAC_nohours_checked_els = el_MAC_nohours_container.querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = el_MAC_nohours_checked_els[i]; i++) {
            el.addEventListener("change", function() {MAC_NohoursChange(el)}, false )
            el.addEventListener("change", function(event){ setTimeout(function() {MAC_validate_and_disable(el)}, 150)});
        };
        const el_wfc_header = document.getElementById("id_wfc_header");
                el_wfc_header.addEventListener("click", function() {MAC_WfcShow(el_wfc_header)}, false );
                add_hover(el_wfc_header);
        const el_wfc_container = document.getElementById("id_wfc_container");
        const wfc_input_select_els = el_wfc_container.querySelectorAll(".tsa_input_select")
        for (let i = 0, el; el = wfc_input_select_els[i]; i++) {
            el.addEventListener("change", function() {MAC_WfcInputChange(el)}, false )
            el.addEventListener("change", function(event){ setTimeout(function() {MAC_validate_and_disable(el)}, 150)});
        };
        const el_wfc_checkbox_container = document.getElementById("id_wfc_checkbox_container");
        const el_wfc_onwd_label = document.getElementById("id_wfc_onwd_label");
        const el_wfc_checkbox_diff = document.getElementById("id_wfc_checkbox_diff");
                el_wfc_checkbox_diff.addEventListener("change", function() {MAC_WfcDiffChange(el_wfc_checkbox_diff)}, false );
        const el_MAC_btn_save = document.getElementById("id_MAC_btn_save");
            el_MAC_btn_save.addEventListener("click", function() {MAC_Save("save")}, false );
        const el_MAC_btn_delete = document.getElementById("id_MAC_btn_delete");
            el_MAC_btn_delete.addEventListener("click", function() {MAC_Save("delete")}, false )

// ---  MODAL PAYROLL PERIOD
        const MPP_input_elements = document.getElementById("id_MPP_input_container").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = MPP_input_elements[i]; i++) {
            el.addEventListener("change", function() {MPP_InputChanged(el)}, false )
        }
        const el_MPP_input_code = document.getElementById("id_MPP_input_code");
        const el_MPP_input_dayofmonth = document.getElementById("id_MPP_input_dayofmonth");
        const el_MPP_input_weekday = document.getElementById("id_MPP_input_weekday");
        const el_MPP_input_year = document.getElementById("id_MPP_input_year");

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
        const el_MWF_header = document.getElementById("id_MWF_header");
        const el_MWF_input_code = document.getElementById("id_MWF_input_code");
            el_MWF_input_code.addEventListener("keyup", function(event){
                setTimeout(function() {MWF_input_validate(el_MWF_input_code)}, 50)});
        const el_MWF_input_description = document.getElementById("id_MWF_input_description");
            el_MWF_input_description.addEventListener("keyup", function(event){
                setTimeout(function() {MWF_input_validate(el_MWF_input_description)}, 50)});
        const el_MWF_input_wagerate = document.getElementById("id_MWF_input_wagerate");
            el_MWF_input_wagerate.addEventListener("keyup", function(event){
                setTimeout(function() {MWF_input_validate(el_MWF_input_wagerate)}, 50)});
        const el_MWF_label_rate = document.getElementById("id_MWF_label_rate");
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
        const el_MEP_loader = document.getElementById("id_MEP_loader");
        const el_MEP_btn_log = document.getElementById("id_MEP_btn_log");
            el_MEP_btn_log.addEventListener("click", function() {MEP_ShowLog()}, false );

        const el_MEP_timeduration = document.getElementById("id_MEP_timeduration")
            //TODO el_MEP_timeduration.addEventListener("click", function() {MEP_TimepickerOpen(el_MEP_timeduration)}, false );

        const el_MEP_btn_save = document.getElementById("id_MEP_btn_save")
            el_MEP_btn_save.addEventListener("click", function() {MEP_Save()}, false );

        id_MEP_timeduration

//>>>>>>>>>>>>>>> MOD TIMEPICKER >>>>>>>>>>>>>>>>>>> PR2020-04-13
/* TODO to change absence duration
        let el_mtp_container = document.getElementById("id_mtp_container");
        let el_mtp_modal = document.getElementById("id_mtp_modal")
        el_mtp_modal.addEventListener("click", function (e) {
          if (e.target !== el_mtp_modal && e.target !== el_mtp_container) return;
          el_mtp_modal.classList.add("hidden");
        });
*/

// TODO debug: oops. filter on the select column in table employees filters the items in the paydatcode table PR2020-12-04

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
            let tr_selected = get_tablerow_selected(event.target)
            if(selected_btn === "btn_payroll_agg" && is_payroll_detail_mode) {
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

            wagecode_rows: {get: true},
            //functioncode_rows: {get: true},
            paydatecode_rows: {get: true},
            wagefactor_rows: {get: true},
            //allowance_rows: {get: true},
            wagecode_rows: {get: true},

            abscat_rows: {get: true},
            emplhourallowance_rows: {get: true}
            };
        DatalistDownload(datalist_request);

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
                    selected_btn = get_dict_value(selected_period, ["sel_btn"], "payroll_period")
                    selected_view = get_dict_value(selected_period, ["sel_view"], "calendar_period")

                    selected_col_hidden = get_dict_value(selected_period, ["col_hidden"], [])
                    selected.paydatecode_pk = get_dict_value(selected_period, ["sel_paydatecode_pk"]);
                    //selected.paydatecode_code = get_dict_value(selected_period, ["sel_paydatecode_pk"]);

                    const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
                    const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
                    el_sidebar_select_absence.value = sel_value_absence;

                    is_period_allowance = get_dict_value(selected_period, ["isallowance"], false) //  can have value false or true
                    el_sbr_select_allowance.value = (is_period_allowance) ? "allowances" : "hours";

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
        if ("employee_rows" in response) {b_refresh_datamap(response.employee_rows, employee_map, "employee")};
        if ("customer_rows" in response) {b_refresh_datamap(response.customer_rows, customer_map)};
        if ("order_rows" in response) {b_refresh_datamap(response.order_rows, order_map)};

        if ("abscat_rows" in response) {fill_datamap(abscat_map, response.abscat_rows)};
        //if ("functioncode_rows" in response) {fill_datamap(functioncode_map, response.functioncode_rows)};
        //if ("wagecode_rows" in response)  {b_refresh_datamap(response.wagecode_rows, wagecode_map, "wagecode")};

        if ("wagecode_rows" in response) {fill_datamap(wagecode_map, response.wagecode_rows)};

        if ("allowance_rows" in response) {fill_datamap(allowance_map, response.allowance_rows)};

        if ("paydatecode_rows" in response) {fill_datamap(paydatecode_map, response.paydatecode_rows)};
        if ("paydateitem_rows" in response) {fill_datamap(paydateitem_map, response.paydateitem_rows)};

        //if ("paydateitem_list" in response) {b_refresh_datamap(response.paydateitem_list, paydateitem_map, "paydateitem")}; // tblName not in paydateitem_list

//---------------------
        //if("paydatecodes_inuse_list" in response){paydatecodes_inuse_list = response.paydatecodes_inuse_list};
        //if("paydateitems_inuse_list" in response){paydateitems_inuse_list = response.paydateitems_inuse_list};

//----------------------------
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        if ("payroll_abscat_list" in response){payroll_abscat_list = response.payroll_abscat_list};

        if ("payroll_hours_detail_list" in response) {
            payroll_needs_update = false
            payroll_hours_from_server = response.payroll_hours_detail_list;
            create_payroll_hours_agg_list();
        }
        if ("payroll_alw_detail_list" in response) {
            payroll_needs_update = false
            payroll_alw_from_server = response.payroll_alw_detail_list;
            create_payroll_allowance_agg_list();
        }

        HandleBtnSelect();

    }  // refresh_maps


//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25 PR2020-06-12 PR2020-09-04
    function HandleBtnSelect(btn) {
        console.log( "===== HandleBtnSelect ========= ");

        // btn only exists when clicked on BtnSelect
        const skip_upload = (!btn);
        if (btn) {selected_btn = get_attr_from_el(btn, "data-btn")};
        if(!selected_btn){selected_btn = "btn_payroll_agg"};
        console.log( "selected_btn", selected_btn);

        selected_key = (selected_btn === "functioncode") ? "fnc" :
                        (selected_btn === "wagefactor") ? "wfc" :
                        (selected_btn === "wagecode") ? "wgc" :
                        (selected_btn === "allowance") ? "alw" : null;
                        //(selected_btn === "paydatecode") ? null :
                        // (selected_btn === "abscat") ? null : null

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
                                          (selected_btn === "wagecode") ? loc.Add_salaryscale :
                                          (selected_btn === "wagefactor") ? loc.Add_wage_component :
                                          (selected_btn === "allowance") ? loc.Add_allowance :
                                          (selected_btn === "abscat") ? loc.Add_abscat : null;
            }
        if(el_submenu_delete){
            el_submenu_delete.innerText = (selected_btn === "paydatecode") ? loc.Delete_payrollperiod :
                                          (selected_btn === "functioncode") ? loc.Delete_function :
                                          (selected_btn === "wagecode") ? loc.Delete_salaryscale :
                                          (selected_btn === "wagefactor") ? loc.Delete_wage_component :
                                          (selected_btn === "allowance") ? loc.Delete_allowance :
                                          (selected_btn === "abscat") ? loc.Delete_abscat : null;
        }
        // only show submenu item 'upload' when sel_btn = paydatecode
        add_or_remove_class(document.getElementById("id_submenu_upload"), cls_hide, (selected_btn !== "paydatecode"))

// ---  show only the elements that are used in this tab
        show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn);

// ---  show submenu button 'Export allowance to Afas only when is_period_allowance and tab payroll_agg or payroll_detail
        ShowSubmenubuttonAfas()

// ---  reset selected variables
        selected.paydatecode_pk = null;
        selected.paydatecode_code = "";
        selected.paydateitem_iso = null;  // used in MSPP_SelectItem
        selected.paydateitem_code = "";

        selected.detail_employee_pk = -1;  // used to filter in detail_mode. -1 = all, 0 = shifts without emploee
        selected.employee_pk = -1;
        selected.employee_code = "";
        selected.functioncode_pk = -1;
        selected.functioncode_code = "";
        selected.isabsence = null;

        selected.wagecode_pk = null;
        selected.wagecode_key = "";
        selected.wagecode_code = "";
        selected.wagecode_description = "";
        selected.wagefactor_pk = null;
        selected.wagefactor_code = "";

        selected.abscat_pk = null;
        selected.abscat_code = null;

        is_payroll_detail_mode = (selected_btn === "btn_payroll_detail");
        is_payroll_detail_modal_mode = false;

// ---  fill datatable
        if(["btn_payroll_agg", "btn_payroll_detail"].indexOf(selected_btn) > -1){
            if (payroll_needs_update){
                // note: payroll_period necessary to get period filter, will give error without it
                let datalist_request = {payroll_period: {get: true, sel_btn: selected_btn, now: now_arr}, payroll_list: {get: true}};
                DatalistDownload(datalist_request);
            } else {
                CreatePayrollTblHeader();
                CreateHTML_list()
                FillPayrollRows();
            }
        } else if(["paydatecode", "functioncode"].indexOf(selected_btn) > -1){
            FillFunctioncodeOrPaydatecodeRows();
        } else if(["wagefactor", "wagecode", "allowance"].indexOf(selected_btn) > -1){
            FillWagecodeRows();
        } else if(selected_btn === "abscat"){
            FillAbscatTableRows(selected_btn)
        }

// --- update header text
        UpdateHeaderText();
    }  // HandleBtnSelect

//=========  ShowSubmenubuttonAfas  ================ PR2021-02-17
    function ShowSubmenubuttonAfas() {
        //console.log("=== ShowSubmenubuttonAfas");

    // ---  show submenu button 'Export allowance to Afas only when is_period_allowance and tab payroll_agg or payroll_detail
        const el_afas_hours = document.getElementById("id_submenu_afas_hours");
        const el_afas_ehal = document.getElementById("id_submenu_afas_ehal");

        const show_afas_hours = ( !is_period_allowance &&  ["btn_payroll_agg", "btn_payroll_detail"].indexOf(selected_btn) > -1)
        const show_afas_ehal = ( is_period_allowance && ["btn_payroll_agg", "btn_payroll_detail"].indexOf(selected_btn) > -1)

        add_or_remove_class(el_afas_hours, cls_hide, !show_afas_hours)
        add_or_remove_class(el_afas_ehal, cls_hide, !show_afas_ehal)
    }

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);
        // this function is not used in payroll and payroll_detail, those use HandleAggRowClicked instead
        const tblName = get_attr_from_el_str(tr_clicked, "data-table")
        const data_map = get_data_map(tblName)

// ---  deselect all highlighted rows - also tblFoot , highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        DeselectHighlightedTblbody(tblFoot_datatable, cls_selected)

        tr_clicked.classList.add(cls_selected)

        const map_dict = get_mapdict_from_datamap_by_id(data_map, tr_clicked.id);
        if(!isEmpty(map_dict)){
            selected.abscat_pk = map_dict.id;
            selected.abscat_code = map_dict.o_code;
            if (tblName === "abscat") { selected.abscat_pk = map_dict.id; selected.abscat_code = map_dict.o_code }
            else if (tblName === "paydatecode")  { selected.paydatecode_pk = map_dict.id; selected.paydatecode_code = map_dict.code }
            else if (tblName === "wagecode")  {
                selected.wagecode_pk = map_dict.id; selected.wagecode_code = map_dict.code;
                selected.wagecode_key = map_dict.key;
                selected.wagecode_code = map_dict.code;
                selected.wagecode_description = map_dict.description;
                }
            // TODO deprecate
            else if (selected_key === "fnc") { selected.functioncode_pk = map_dict.id; selected.functioncode_code = map_dict.code }
            else if (selected_key === "wfc") { selected.wagefactor_pk = map_dict.id; selected.wagefactor_code = map_dict.code }

        }

        console.log("tblName", tblName);
        console.log("map_dict", map_dict);
        console.log("selected", selected);

        //if (tblName === "abscat"){
        //    const map_dict = get_mapdict_from_datamap_by_id(abscat_map, tr_clicked.id);
        //    if(!isEmpty(map_dict)){
        //        selected.abscat_pk = map_dict.id;
       //         selected.abscat_code = map_dict.o_code;
       //     }
        //}
// ---  update selected.employee_pk
        // only select employee from select table
        const data_key = (["teammember", "planning"].indexOf( tblName ) > -1) ? "data-employee_pk" : "data-pk";
        const employee_pk_str = get_attr_from_el_str(tr_clicked, data_key);
        if(!!employee_pk_str){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk_str)
            selected.employee_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0));
            selected.employee_code = get_dict_value (map_dict, ["code", "value"], "");

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
            selected.detail_employee_pk = (Number(tr_clicked.id)) ? Number(tr_clicked.id) : 0;

            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected.detail_employee_pk)
            selected.detail_employee_code = get_dict_value (map_dict, ["code"], "---");

            is_payroll_detail_mode = true;

            UpdateHeaderText();
            CreatePayrollTblHeader();
            CreateHTML_list()
            FillPayrollRows();

        }
    }  // HandleAggRowClicked

//========= HandleAggrowReturn  =================== PR2020-09-03
    function HandleAggrowReturn() {
        //console.log( "===== HandleAggrowReturn  === ");
        const tblName = (selected_btn === "btn_payroll_detail") ?
                        (is_period_allowance) ? "payroll_alw_detail" : "payroll_hours_detail" :
                        (is_period_allowance) ? "payroll_alw_agg" : "payroll_hours_agg";
        is_payroll_detail_mode = false;
        is_payroll_detail_modal_mode = false;
        selected.employee_pk = -1
        selected.employee_code = "";

        CreatePayrollTblHeader();
        CreateHTML_list()
        FillPayrollRows();
        UpdateHeaderText();
   }  // HandleAggrowReturn

//###########################################################################

// +++++++++++++++++ WAGE FACTOR  WAGE CODE +++++++++++++++++++++++++++++++++++++++++++++++++
//========= FillWagecodeRows  =================== PR2020-07-13 PR2020-09-05 PR2021-01-30
    function FillWagecodeRows() {
        console.log( "===== FillWagecodeRows  === ");
        // this function is only called when selected_btn = "wagefactor", "wagecode", "allowance"

// --- get tblName and data_key.
        const tblName = "wagecode";
        const key_str = selected_key; // selected_key gets value in HandleBtnSelect from selected_btn

// ---  reset table
        tblHead_paydatecode.innerText = null;
        tblBody_paydatecode.innerText = null;
        tblFoot_paydatecode.innerText = null;

// ---  set select / deselect buttons
        el_btn_add_selected.innerText = "--->\n" + loc.Link_wagefactor_to_shifts;
        el_btn_remove_selected.innerText = "<---\n" + loc.Remove_wagefactor_from_shifts;

// --- create tblHead and tblFoot
        CreateTblHeader(tblName, key_str);
        CreateTblFoot(tblName, key_str);
        console.log( "wagecode_map", wagecode_map);
        console.log( "key_str", key_str);
        if (wagecode_map.size){
//--- loop through wagecode_map
            for (const [map_id, map_dict] of wagecode_map.entries()) {
                if ( map_dict.key === key_str){
// --- create tablerow
                    const employee_pk = null, is_disabled = false;
                    const order_by = (map_dict.code) ? map_dict.code.toLowerCase() : "";
                    const tblRow = CreateTblRow(tblBody_paydatecode, tblName, key_str, map_id, map_dict.id, map_dict.comp_id, order_by, employee_pk, -1, is_disabled)

// --- loop through cells of tablerow and update fields
                    for (let i = 0, cell; cell=tblRow.cells[i]; i++) {
                        UpdateWagecodeField(cell.children[0], map_dict)
                    }
                }
            };
        }
        Filter_TableRows();
    }  // FillWagecodeRows


// +++++++++++++++++ PAYDATECODE  +++++++++++++++++++++++++++++++++++++++++++++++++
//========= FillFunctioncodeOrPaydatecodeRows  ====================================
    function FillFunctioncodeOrPaydatecodeRows() {
        //console.log( "===== FillFunctioncodeOrPaydatecodeRows  === ");
        // only called by HandleBtnSelect when selected_btn = "paydatecode" or "functioncode"
        // tblName = "paydatecode", "functioncode"
        const text_add = (selected_btn === "paydatecode") ? loc.Link_payrollperiod_to_employees :
                         (selected_btn === "functioncode") ? loc.Add_function_to_employees : null;
        const text_delete = (selected_btn === "paydatecode") ? loc.Remove_payrollperiod_from_employees :
                            (selected_btn === "functioncode") ? loc.Remove_function_from_employees : null;
        el_btn_add_selected.innerText = "--->\n" + text_add;
        el_btn_remove_selected.innerText = "<---\n" + text_delete;

        // selected_btn = "paydatecode" or "functioncode"
        const array = [selected_btn, "employee"];

        array.forEach(function (arr_key) {
            const is_tbl_employee = (arr_key === "employee");
            const tblBody_id = (is_tbl_employee) ? "id_tblBody_employee" : "id_tblBody_paydatecode";
            const tblBody = document.getElementById(tblBody_id);

            tblBody.innerText = null;
            if(!is_tbl_employee){
                const tblFoot = document.getElementById("id_tblFoot_paydatecode");
                tblFoot.innerText = null;
            }

// --- create tblHead and CreateTblFoot
            const tblName = (arr_key === "functioncode") ? "wagecode" : arr_key;
            const key_str = (arr_key === "functioncode") ? 'fnc' : null;

        //console.log( "arr_key", arr_key);
        //console.log( "tblName", tblName);
        //console.log( "key_str", key_str);

            CreateTblHeader(tblName, key_str);
            if(["paydatecode", "functioncode"].indexOf(arr_key) > -1){
                CreateTblFoot(tblName, key_str);
            }

    // get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
            const data_map = (arr_key === "paydatecode") ? paydatecode_map :
                             (arr_key === "functioncode") ? wagecode_map :
                             (arr_key === "employee") ? employee_map : null;
            if(data_map){
// --- loop through data_map
                for (const [map_id, map_dict] of data_map.entries()) {
                    const pk_int = map_dict.id;
                    const ppk_int = map_dict.comp_id;
                    const order_by = (arr_key === "functioncode") ? ( (map_dict.code) ? map_dict.code.toLowerCase() : "" ) : "";
                    //not necessary: let row_index = t_get_rowindex_by_orderby(tblBody, search_orderby)
                    const  employee_pk = null, row_index = -1, is_disabled = false;
                    // filter wagecode rows on key = 'fnc'
                    const show_row = (arr_key !== "functioncode" || map_dict.key === "fnc");
                    if (show_row){
                        const tblRow = CreateTblRow(tblBody, tblName, key_str, map_id, pk_int, ppk_int, order_by, employee_pk, row_index, is_disabled)
                        UpdateTblRow(tblName, tblRow, map_dict)
                    }
                }  // for (const [map_id, map_dict] of data_map.entries())
            }  // if(!!data_map)
            //console.log("FillAbscatTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        } ) //  array.forEach(function (tblName)

        Filter_TableRows();
    }  // FillFunctioncodeOrPaydatecodeRows

// +++++++++++++++++ PAYROLL  +++++++++++++++++++++++++++++++++++++++++++++++++

//========= create_payroll_allowance_agg_list  ============= PR2021-02-02
    function create_payroll_allowance_agg_list() {
        //console.log("==== create_payroll_allowance_agg_list  ========= ");
        //console.log("payroll_alw_from_server", payroll_alw_from_server);

        let employees_inuse = {};
        let functions_inuse = {};
        let orders_inuse = {};
        let abscats_inuse = {};
        let allowances_inuse = {};

        let agg_dict = {};
// loop through list of emplhours with aggregate allowance
        if (payroll_alw_from_server){
            for (let i = 0, row; row = payroll_alw_from_server[i]; i++) {

// ---  get employee, function, order
                const employee_pk = (row.e_id) ? row.e_id : 0;
                const employee_code = (row.e_code) ? row.e_code : "---";

                const function_pk = (row.fnc_id) ? row.fnc_id : 0;
                const function_code = (row.fnc_code) ? row.fnc_code : "---";

                const order_pk = (row.o_id) ? row.o_id : null;
                let order_code = (row.o_code) ? row.o_code : "-";
                let cust_code = (row.c_code) ? row.c_code : "-";

                // remove tilde from order_code and cust_code
                if (order_code && order_code.includes("~")){order_code = order_code.replace(/~/g,"")}
                if (cust_code && cust_code.includes("~")){cust_code = cust_code.replace(/~/g,"")}

// ---  check if employee_dict exists in agg_dict, create if not found
                if(!(employee_pk in agg_dict)) {
                    agg_dict[employee_pk] = {pk: employee_pk,
                                            e_code: employee_code,
                                            e_identifier: row.e_identifier,
                                            e_payrollcode: row.e_payrollcode,
                                            alw_amount_dict: {},
                                            alw_quantity_dict: {},
                                            totalamount: 0,
                                            wagefactorcode: {},
                                            functioncode: {},
                                            paydatecode: {}
                                            };
                }
// ---  get employee_dict
                const employee_dict = agg_dict[employee_pk];

// ---  add employee_code to employees_inuse if not exists
                if(!(employee_pk in employees_inuse)) {
                    employees_inuse[employee_pk] = {pk: employee_pk, code: employee_code };
                }

// ---  add function_code to functions_inuse if not exists
                if(!(function_pk in functions_inuse)) {
                    functions_inuse[function_pk] = {pk: function_pk, code: function_code };
                }

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

                if(row.alw_id_agg){
                    for (let j = 0, len = row.alw_id_agg.length; j < len ; j++) {
                        const alw_id = row.alw_id_agg[j];
                        const code = row.code_agg[j];
                        const description = row.description_agg[j];
                        const wagerate = row.wagerate_agg[j];
                        const quantity = row.quantity_agg[j];
                        const amount = row.amount_agg[j];

    // ---  add allowance to allowances_inuse if not exists
                        if(!(alw_id in allowances_inuse)) {
                            allowances_inuse[alw_id] = {pk: alw_id, code: code, description: description, wagerate: wagerate};
                        }

                        if(!(alw_id in employee_dict.alw_quantity_dict)) {employee_dict.alw_quantity_dict[alw_id] = 0; }
                        employee_dict.alw_quantity_dict[alw_id] += quantity

                        if(!(alw_id in employee_dict.alw_amount_dict)) {employee_dict.alw_amount_dict[alw_id] = 0; }
                        employee_dict.alw_amount_dict[alw_id] += amount

// ---  add amount to total column
                        employee_dict.totalamount += amount;
                    }
                }

// ---  add functioncode, paydatecode, wagefactorcode
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
            }  //  for (let i = 0, item; item = detail_list[i]; i++)
        }  // if (detail_list){

// ---  convert dictionary to array
        const agg_list = Object.values(agg_dict);
// ---  sort array by e_code with b_comparator_e_code
        payroll_alw_agg_list = agg_list.sort(b_comparator_e_code);
// ---  convert dictionary 'allowances_inuse' to array 'allowances_inuse_list'
        const allowances_inuse_list = Object.values(allowances_inuse);
// ---  sort array by b_comparator_code
        allowances_inuse_dictlist = allowances_inuse_list.sort(b_comparator_code);

// ---  convert dictionary 'employees_inuse' to array 'employees_inuse_list'
        const employees_inuse_list = Object.values(employees_inuse);
// ---  sort array by c_o_code
        employees_inuse_dictlist = employees_inuse_list.sort(b_comparator_c_o_code);

// ---  convert dictionary 'functions_inuse' to array 'functions_inuse_list'
        const functions_inuse_list = Object.values(functions_inuse);
// ---  sort array by c_o_code
        functions_inuse_dictlist = functions_inuse_list.sort(b_comparator_c_o_code);
    }  // create_payroll_allowance_agg_list

//========= create_payroll_hours_agg_list  ============= PR2020-08-31
    function create_payroll_hours_agg_list(detail_list) {
        //console.log("==== create_payroll_hours_agg_list  ========= ");
        //console.log("payroll_hours_from_server", payroll_hours_from_server);

        let employees_inuse = {};
        let functions_inuse = {};
        let orders_inuse = {};
        let abscats_inuse = {};

        let agg_dict = {};
        if (payroll_hours_from_server){
            for (let i = 0, row; row = payroll_hours_from_server[i]; i++) {

        //console.log("row", row);
                const employee_pk = (row.e_id) ? row.e_id : 0;
                const employee_code = (row.e_code) ? row.e_code : "---";

                const function_pk = (row.fnc_id) ? row.fnc_id : 0;
                const function_code = (row.fnc_code) ? row.fnc_code : "---";

        //console.log("function_pk ", function_pk, "row.fnc_code", row.fnc_code);
                const order_isabsence = row.isabsence;
               // const order_pk = (row.order_id) ? row.order_id : (row.o_id) ? row.o_id : null;
                const order_pk = (row.o_id) ? row.o_id : null;
                let order_code = (row.o_code) ? row.o_code : "-";
                let cust_code = (row.c_code) ? row.c_code : "-";

                // remove tilde from order_code and cust_code
                if (order_code && order_code.includes("~")){order_code = order_code.replace(/~/g,"")}
                if (cust_code && cust_code.includes("~")){cust_code = cust_code.replace(/~/g,"")}

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
// ---  get employee_dict
                const employee_dict = agg_dict[employee_pk];

// ---  add employee_code to employees_inuse if not exists
                if(!(employee_pk in employees_inuse)) {
                    employees_inuse[employee_pk] = {pk: employee_pk, code: employee_code };
                }

// ---  add function_code to functions_inuse if not exists
                if(!(function_pk in functions_inuse)) {
                    functions_inuse[function_pk] = {pk: function_pk, code: function_code };
                }

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

// add totaldur to employee_dict.abscat_dict[order_pk] / employee_dict.order_dict[order_pk]
                if(row.isabsence) {
    // ---  add abscat_dict[order_pk] if not found
                    const abscat_dict = employee_dict.abscat_dict;
                    if(!(order_pk in abscat_dict)) { abscat_dict[order_pk] = 0; }
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
                if(row.pdc_id && !(row.pdc_id in employee_dict.paydatecode)) {
                    employee_dict.paydatecode[row.pdc_id] = {pk: row.pdc_id, code: row.pdc_code }
                }
                if( (row.wfc_id || row.nopay)  && !(row.wfc_id in employee_dict.wagefactorcode)) {
                    const key = (row.nopay) ? -1 : row.wfc_id;
                    const code = (row.nopay) ? loc.No_payment : (row.wfc_code) ? row.wfc_code : "---";
                    const rate = (row.nopay) ? 0 : ( row.wfc_rate) ?  row.wfc_rate : 0;
                    employee_dict.wagefactorcode[key] = {pk: key, code: code, rate: rate}
                }
            }
        }

// ---  convert dictionary to array
        const agg_list = Object.values(agg_dict);

// ---  sort array by e_code with b_comparator_e_code
        payroll_hours_agg_list = agg_list.sort(b_comparator_e_code);

// ---  convert dictionary 'employees_inuse' to array 'employees_inuse_list'
        const employees_inuse_list = Object.values(employees_inuse);
// ---  sort array by code
        employees_inuse_dictlist = employees_inuse_list.sort(b_comparator_code);

// ---  convert dictionary 'functions_inuse' to array 'functions_inuse_list'
        const functions_inuse_list = Object.values(functions_inuse);
// ---  sort array by c_o_code
        functions_inuse_dictlist = functions_inuse_list.sort(b_comparator_c_o_code);
// ---  convert dictionary 'orders_inuse' to array 'orders_inuse_list'
        const orders_inuse_list = Object.values(orders_inuse);
// ---  sort array by c_o_code
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
// ---  sort array by c_o_code
        abscats_inuse_list_sorted = abscats_inuse_list.sort(b_comparator_c_o_code);
        const abscats_len = abscats_inuse_list_sorted.length;
// ---  convert to abscats_inuse_dict, add index and abscats_len
        abscats_inuse_dict = {len: abscats_len};
        for (let i = 0, dict; i < abscats_len; i++) {
            dict = abscats_inuse_list_sorted[i]
            dict.index = i;
            abscats_inuse_dict[dict.pk] = dict
        }
    }  // create_payroll_hours_agg_list

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//=========  CreatePayrollTblHeader  === PR2020-09-02 PR2021-02-02
    function CreatePayrollTblHeader() {
        //console.log("===  CreatePayrollTblHeader ==");
        // called by HandleBtnSelect, HandleAggRowClicked, HandleAggrowReturn ,ResetFilterRows
        // tblNames are: "payroll_hours_agg", "payroll_hours_detail", "payroll_alw_agg", "payroll_alw_detail"

       const tblName = "payroll_" + ((is_period_allowance) ? "alw_" : "hours_" ) + ((is_payroll_detail_mode) ? "detail" : "agg");

// --- reset datatable
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

// +++  insert header row ++++++++++++++++++++++++++++++++
        // add extra header line when allowance with "Amount" and "Quantity"
        let allowance_header_row = null;
        if(is_period_allowance){allowance_header_row = tblHead_datatable.insertRow (-1)};
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
        // tblName = "payroll_hours_agg", "payroll_hours_detail", "payroll_alw_agg", "payroll_alw_detail"
        const settings = field_settings[tblName];

        let col_index = -1;
        // must use len, otherwise loop will end when payroll_header_row[j] has no value PR2020-07-16
         for (let i = 0, len = settings.field_names.length; i < len; i++) {
            const field_name = settings.field_names[i];

// --- get field_caption etc from field_settings
            const capton_key = settings.field_caption[i];
            let field_caption = (loc[capton_key]) ? loc[capton_key] : null;
            const filter_tag = settings.filter_tags[i];
            const class_width =  "tw_" + settings.field_width[i];
            const class_align = "ta_" + settings.field_align[i];

// ---  skip if field is in list of selected_col_hidden
            if(!selected_col_hidden.includes(field_name)) {

// loop through fields of orderdetail / absdetail abscats, field_count = 1 for other fields
                const inuse_list = (field_name === "orderdetail") ? orders_inuse_list_sorted :
                                    (field_name === "absdetail") ? abscats_inuse_list_sorted :
                                    (field_name === "allowanceamount") ? allowances_inuse_dictlist :
                                    (field_name === "allowancequantity") ? allowances_inuse_dictlist : null;

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
                    } else if (field_name === "allowanceamount") {
                        excel_caption = (inuse_list[j].code) ? inuse_list[j].code : "";
                        caption = excel_caption
                        if(inuse_list[j].description){
                            caption += "-\n" + inuse_list[j].description
                            excel_caption += " " + inuse_list[j].description
                        }
                    } else if (field_name === "allowancequantity") {
                        excel_caption = loc.Quantity + loc.of_withspaces + (inuse_list[j].code) ? inuse_list[j].code : "";
                        caption = excel_caption
                        if(inuse_list[j].description){
                            caption += "-\n" + inuse_list[j].description
                            excel_caption += " " + inuse_list[j].description
                        }
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

// +++ add th to allowance_header_row.
                    if(allowance_header_row){
                        if (!j){
                            const alw_th = document.createElement("th");
                            const alw_el_div = document.createElement("div");
                            if (["allowanceamount", "allowancequantity"].indexOf(field_name) > -1) {
                                alw_el_div.innerText = (field_name === "allowanceamount") ? loc.Allowance :
                                                        (field_name === "allowancequantity") ? loc.Quantity : null;

                                alw_th.setAttribute("colspan", field_count)
                                alw_el_div.classList.add("tsa_bc_lightgrey","ta_c")
                            }
                            alw_th.appendChild(alw_el_div);
            // --- add border around columns
                            if (["totalamount", "allowanceamount", "allowancequantity"].indexOf(field_name) > -1) {
                                alw_th.classList.add("td_border_left");
                                alw_th.classList.add("td_border_right");
                            }
                            allowance_header_row.appendChild(alw_th);
                        }
                    }

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
                    if(["plandur", "totaldur", "timedur", "absdur", "totalamount"].indexOf(field_name) > -1) {
                        has_border_left = true;
                        has_border_right = true;
                    } else  if(["orderdetail", "absdetail", "allowanceamount", "allowancequantity"].indexOf(field_name) > -1) {
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
                    const el_filter = document.createElement(tag_str);
        // --- add EventListener
                    // PR2020-09-03 debug: col_index as parameter doesn't work, keeps giving highest col_index. Use data-colindex instead
                    if (field_name === "status") {
                        el_filter.addEventListener("click", function(){HandleFilterToggle(el_filter)});
                        el_filter.classList.add("stat_0_0")
                    } else {
                        el_filter.addEventListener("keyup", function(event){HandleFilterKeyup(el_filter, event)});
                    }
        // --- add attribute data-field
                    el_filter.setAttribute("data-table", tblName);
                    el_filter.setAttribute("data-field", field_name);
                    el_filter.setAttribute("data-filtertag", filter_tag);
                    el_filter.setAttribute("data-colindex", col_index);
        // --- add other attributes
                    el_filter.setAttribute("autocomplete", "off");
                    el_filter.setAttribute("ondragstart", "return false;");
                    el_filter.setAttribute("ondrop", "return false;");
        // --- add text_align
                    el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
        // --- add margin ml-2 to wagefactor, to separate from duration field
                     if(["wagefactor", "functioncode", "pdc_code"].indexOf(field_name) > -1) {
                        el_div.classList.add("ml-2");
                    }
        // --- add border around columns
                    if(has_border_left) {filter_th.classList.add("td_border_left")};
                    if(has_border_right) {filter_th.classList.add("td_border_right")};
        // --- add el_filter to th, add th to tblRow
                    filter_th.appendChild(el_filter);
                    filter_row.appendChild(filter_th);

// +++ add th to total_row.
                    const total_th = document.createElement("th");
        // --- add input element
                    const total_div = document.createElement("div");
        // --- add innerText to el_div
                    if(i === 1) {total_div.innerText = loc.Total_hours};
        // --- add attribute data-field
                    // data-field is necessary to format amount
                    total_div.setAttribute("data-field", field_name);
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
    } //  CreatePayrollTblHeader

//========= CreateHTML_list  ==================================== PR2020-09-01
    function CreateHTML_list() {
        //console.log("==== CreateHTML_list  ========= ");

        const tblName = "payroll_" + ((is_period_allowance) ? "alw_" : "hours_" ) + ((is_payroll_detail_mode) ? "detail" : "agg");

        let header_row = "";
        let filter_row = [];
        let detail_rows = [];
        const data_list = (tblName === "payroll_hours_agg") ? payroll_hours_agg_list :
                          (tblName === "payroll_hours_detail") ? payroll_hours_from_server :
                          (tblName === "payroll_alw_agg") ? payroll_alw_agg_list :
                          (tblName === "payroll_alw_detail") ? payroll_alw_from_server : null

        if (data_list){
// ++++++++ loop through rows of data_list
            for (let x = 0, len = data_list.length; x < len; x++) {
                const item = data_list[x];
                let col_index = -1, td_html = [], filter_data = [], excel_data = [];
                let duration_formatted = null;
                const fnc_id_list= [];

// +++++++  loop through field_names
                // must use len, otherwise loop will end when payroll_header_row[j] has no value PR2020-07-16
                for (let i = 0, len = field_settings[tblName].field_names.length; i < len; i++) {
                    const field_name = field_settings[tblName].field_names[i];
                    const class_align = "ta_" + field_settings[tblName].field_align[i];

            // ---  skip if field is in list of selected_col_hidden
                    if(!selected_col_hidden.includes(field_name)) {

// loop through fields of orderdetail / absdetail abscats, field_count = 1 for other fields
                        const inuse_list = (field_name === "orderdetail") ? orders_inuse_list_sorted :
                                            (field_name === "absdetail") ? abscats_inuse_list_sorted :
                                            (field_name === "allowanceamount") ? allowances_inuse_dictlist :
                                            (field_name === "allowancequantity") ? allowances_inuse_dictlist : null;
                        const field_count = (inuse_list) ? inuse_list.length : 1;

// +++++++loop through inuse_list of orders / abscats / allowances , j = 1 for other columns
                        for (let j = 0; j < field_count; j++) {
                            col_index += 1;
                            let inner_text = "", title = "";
                            let class_text = class_align;
                            let class_td = "";
                            let filter_value = null, excel_value = null;
                            let has_border_left = false, has_border_right = false;

                            if(field_name === "status") {
                                if (item.emplhour_id) { class_text += " stat_0_4" };
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

                            } else if(["totalamount"].indexOf(field_name) > -1) {
                                const field_value = item[field_name];
                                inner_text = format_pricerate (loc.user_lang, field_value, false, false) // is_percentage = false, true = show_zero
                                filter_value = field_value;
                                excel_value = field_value;

                            } else if(["orderdetail", "absdetail"].indexOf(field_name) > -1) {
                                // inuse_list contains list with pk and code of used orders / abscats.
                                // inuse_pk contains order_pk that correspondence with this order-/ abscat-column
                                const inuse_pk = (inuse_list && inuse_list[j] && inuse_list[j].pk) ? inuse_list[j].pk : null;
                                // orderdetail = {1521: 900, 1541: 1680}
                                const order_abscat_dict = (field_name === "orderdetail") ? item.order_dict :
                                                              (field_name === "absdetail") ? item.abscat_dict : null;
                                let duration = null;
                                if(!isEmpty(order_abscat_dict)){
                                    duration = (inuse_pk && order_abscat_dict[inuse_pk]) ? order_abscat_dict[inuse_pk] : null;
                                } else if (inuse_pk === item.o_id) {
                                    // detail row has no order_dict / abscat_dict but order_id
                                    duration = item.totaldur;
                                }
                                inner_text = format_total_duration (duration, loc.user_lang);
                                filter_value = duration;
                                excel_value = duration;
                            } else if(["allowanceamount", "allowancequantity"].indexOf(field_name) > -1) {
                                // inuse_list contains list with pk and code of used orders / abscats.
                                // inuse_pk contains order_pk that correspondence with this order-/ abscat-column
                                const inuse_pk = (inuse_list && inuse_list[j] && inuse_list[j].pk) ? inuse_list[j].pk : null;
                                let amount_or_quantity = null;
                                if(is_payroll_detail_mode){
                                    // lookup inuse_pk in item field 'alw_id_agg' (is a list) =  [6, 16]
                                    for ( let y = 0, pk_int; pk_int = item.alw_id_agg[y] ; y++) {
                                        if(pk_int === inuse_pk){
                                            amount_or_quantity = (field_name === "allowanceamount") ? item.amount_agg[y] : item.quantity_agg[y];
                                            break;
                                        }
                                    }
                                } else {
                                    // alw_amount_dict is only in agg view, contains total amount of this employee
                                    const alw_dict = (field_name === "allowanceamount") ? item.alw_amount_dict : item.alw_quantity_dict;
                                    if(!isEmpty(alw_dict)){
                                        amount_or_quantity = (inuse_pk && alw_dict[inuse_pk]) ? alw_dict[inuse_pk] : null;
                                    }
                                }
                                if (field_name === "allowanceamount"){
                                    inner_text = format_pricerate (loc.user_lang, amount_or_quantity, false, false) // is_percentage = false, true = show_zero
                                    const value = (amount_or_quantity) ? amount_or_quantity / 100 : null;
                                    filter_value = value;
                                    excel_value = value;
                                } else {
                                    const value = (amount_or_quantity) ? amount_or_quantity / 10000 : null;
                                    inner_text = value;
                                    filter_value = value;
                                    excel_value = value;
                                }

                            } else if(["wagefactorcode", "functioncode", "paydatecode"].indexOf(field_name) > -1) {
                                // add margin ml-2 , to separate from duration field
                                class_text += " ml-2"
                                if (tblName === "payroll_hours_agg") {
                                    const field_dict = item[field_name];
                                    // functioncode: { 23: {pk: 23, code: "nico"} }
                                    // paydatecode: { 41: { pk: 41, code: "Maandelijks t/m de 31e" } }
                                    // wagefactorcode: {13: {pk: 13, code: "O200", rate: 2000000}, 73: {pk: 73, code: "W55", rate: 7550000} }
                                    let first_item = "", title_list = "", excel_list = null;

                                    // fnc_id_list is used to put fnc_id_list in row - add '0' when functioncode = {}
                                    if(isEmpty(field_dict)){
                                        if (field_name === "functioncode" && !fnc_id_list.includes(0) ) { fnc_id_list.push(0) };
                                    } else {
                                        for (let key in field_dict) {
                                            if (field_dict.hasOwnProperty(key)) {
                                                const pk_int = (Number(key)) ? Number(key) : 0;
                                                // fnc_id_list is used to put fnc_id_list in row
                                                if (field_name === "functioncode" && !fnc_id_list.includes(pk_int) ) { fnc_id_list.push(pk_int) };

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
                                        const functioncode_id = (item.fnc_id) ? item.fnc_id : 0;
                                        if ( !fnc_id_list.includes(functioncode_id) ) {
                                            fnc_id_list.push(functioncode_id)
                                        }
                                    }
                                }
                            } else if(field_name === "margin_end") {
                            }
                            if (inner_text == null) { inner_text = ""};
                // --- add left and right border around total columns
                            if(["plandur", "totaldur", "timedur", "absdur", "totalamount"].indexOf(field_name) > -1) {
                                has_border_left = true;
                                has_border_right = true;
                            } else  if(["orderdetail", "absdetail", "allowanceamount", "allowancequantity"].indexOf(field_name) > -1) {
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
                //                5: emplhour_id, 6: fnc_id, 7: o_id, 8: isabsence];
                const employee_pk = (["payroll_alw_agg", "payroll_hours_agg"].indexOf(tblName) > -1) ? ((item.pk) ? item.pk : 0) :
                                    (["payroll_alw_detail", "payroll_hours_detail"].indexOf(tblName) > -1) ? ((item.e_id) ? item.e_id : 0) : 0

                const row = [
                    true, // show_row
                    employee_pk,
                    filter_data,
                    excel_data,
                    row_html,
                    item.emplhour_id,
                    fnc_id_list, //functioncode_id,
                    item.o_id, // was: item.order_id
                    item.isabsence];

        //console.log("row", row);
                detail_rows.push(row);

            }  //  for (let x = 0, len = payroll_hours_agg_list.length; x < len; x++)
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++
        }
        payroll_hours_agg_rows = detail_rows;

        // tblNames are: "payroll_hours_agg", "payroll_hours_detail", "payroll_alw_agg", "payroll_alw_detail"
        console.log("tblName", tblName);
        console.log("detail_rows", detail_rows);
        if (tblName === "payroll_hours_agg") {
            payroll_hours_agg_rows = detail_rows
        } else if (tblName === "payroll_hours_detail") {
            payroll_hours_detail_rows = detail_rows
        } else if (tblName === "payroll_alw_agg") {
            payroll_alw_agg_rows = detail_rows
        } else if (tblName === "payroll_alw_detail") {
            payroll_alw_detail_rows = detail_rows
        };

    }  // CreateHTML_list

//========= FillPayrollRows  ====================================
    function FillPayrollRows() {
        console.log( "====== FillPayrollRows  === ");
        //console.log( "mod_MSEF_dict.sel_btn", mod_MSEF_dict.sel_btn);
        //console.log( "mod_MSEF_dict.sel_pk", mod_MSEF_dict.sel_pk);
        // called by: HandleBtnSelect, HandleAggRowClicked, HandleAggrowReturn
        //HandleFilterToggle and HandleFilterKeyup, ResetFilterRows, MSEF_Save

        const tblName = "payroll_" + ((is_period_allowance) ? "alw_" : "hours_" ) + ((is_payroll_detail_mode) ? "detail" : "agg");

        console.log( "is_payroll_detail_mode", is_payroll_detail_mode);
        console.log( "tblName", tblName);
// --- reset table, except for header
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        ResetPayrollTotalrow();

// --- loop through payroll_hours_detail_rows / payroll_hours_agg_rows
        // detail_row = [ 0: show_row, 1: employee_pk, 2: filter_data, 3: excel_data, 4: row_html,
        //                5: emplhour_id, 6: fnc_id, 7: o_id, 8: isabsence];
        const detail_rows = (is_period_allowance) ?
                                (is_payroll_detail_mode) ? payroll_alw_detail_rows : payroll_alw_agg_rows :
                                (is_payroll_detail_mode) ? payroll_hours_detail_rows : payroll_hours_agg_rows;
        console.log( "detail_rows", detail_rows);
        if (detail_rows) {
            for (let i = 0, item, tblRow, excel_data, filter_row, show_row; item = detail_rows[i]; i++) {
        //console.log( "...............item", item);
// ---  filter selected.detail_employee_pk when is_payroll_detail_mode   // item[1] = employee_pk
                show_row = (selected_btn === "btn_payroll_detail" || !is_payroll_detail_mode || item[1] === selected.detail_employee_pk)

// ---  filter mod_MSEF_dict.sel_pk (set in SBR)
                if(show_row && mod_MSEF_dict.sel_btn && mod_MSEF_dict.sel_pk > -1) {
                    if (mod_MSEF_dict.sel_btn === "employee"){
                       show_row = (mod_MSEF_dict.sel_pk === item[1])  // item[1] = employee_pk
                    } else if (mod_MSEF_dict.sel_btn === "functioncode"){
                       show_row = (item[6].includes(mod_MSEF_dict.sel_pk))  // item[6] = functioncode_pk
                    }

        //console.log( "mod_MSEF_dict.sel_pk", mod_MSEF_dict.sel_pk);
        //console.log( "item[6][6]", item[6]);
        //console.log( "...................show_row", show_row);

                }
                if(show_row && selected.isabsence != null){
                    show_row = (selected.isabsence === item[8])  // item[8] = isabsence
                }

// ---  filter emplhour_pk exists when filtered on status (column 0)
                if(show_row && (is_payroll_detail_mode || tblName === "payroll_hours_detail" || tblName === "payroll_alw_detail") ){
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
                    //                5: emplhour_id, 6: fnc_id, 7: o_id, 8: isabsence];
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
                }  //  if (show_row){
            }  // for (let i = 0,
        }  // if (detail_rows) {
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
                    //    if(!payroll_total_row[i]){payroll_total_row[i] = selected.employee_code};
                    // TODO col index may vary. Was: } else if ( ([4,5].indexOf(i) > -1) && ( selected_btn === "btn_payroll_detail" ) ) {
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
        console.log("======== UpdatePayrollTotalrow  ========= ");
        console.log("is_payroll_detail_mode", is_payroll_detail_mode);
        console.log("payroll_total_row", payroll_total_row);
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
                        el_input.innerText = (is_period_allowance) ? loc.Total_allowance : loc.Total_hours;
                    } else {
                        let display = null;
                        const value = payroll_total_row[i];
                        if(is_period_allowance){
                            if (fldName === "allowancequantity"){
                                display = value;
                            } else {
                                display = format_pricerate (loc.user_lang, value, false, false);
                            }
                        } else {
                            display = format_total_duration(value);
                        }
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
        let class_add_delete = ["mx-2", "tab_show", "tab_functioncode", "tab_wagefactor", "tab_allowance", "tab_abscat", "display_hide"]
        let class_columns_excel = ["mx-2", "tab_show", "tab_btn_payroll_agg", "tab_btn_payroll_detail", "display_hide"]


        AddSubmenuButton(el_div, loc.Add_abscat, function() {AddnewOpen()}, class_add_delete, "id_submenu_addnew")
        AddSubmenuButton(el_div, loc.Delete_abscat, function() {ModConfirmOpen("delete")}, class_add_delete, "id_submenu_delete")
        AddSubmenuButton(el_div, loc.Show_hide_columns, function() {ModColumnsOpen()}, class_columns_excel, "id_submenu_columns")
        //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
        //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, class_columns_excel, "id_submenu_excel");

        AddSubmenuButton(el_submenu, loc.Export_allowances_toAFAS, null, class_columns_excel, "id_submenu_afas_ehal", url_afas_ehal_xlsx );
        AddSubmenuButton(el_submenu, loc.Export_hours_toAFAS, null, class_columns_excel, "id_submenu_afas_hours", url_afas_hours_xlsx );

        AddSubmenuButton(el_div, loc.Upload_payroll_periods, null, ["mx-2"], "id_submenu_upload", url_paydatecode_import);

        el_submenu.classList.remove(cls_hide);

        ShowSubmenubuttonAfas();

    };// CreateSubmenu

//========= FillAbscatTableRows  ====================================
    function FillAbscatTableRows(tblName) {
        // called by HandleBtnSelect
        console.log( "===== FillAbscatTableRows  ===" );
        console.log( "tblName", tblName)

// --- reset filter
        // PR2021-02-28 debug: gave empty table after returning fron payroll_detail, because filter was set
        filter_dict = {};

// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

// --- create tblHead
        // tblName = "abscat",
        CreateTblHeader(tblName, null);

// --- get data_map
        const data_map = abscat_map;
        if(data_map){

// --- loop through data_map
            const key_str = null // abscat (= table 'order') has no field 'key'
            for (const [map_id, map_dict] of data_map.entries()) {
                const pk_int = map_dict.id;
                const ppk_int = map_dict.c_id;
                const row_index = -1;

        console.log( "map_dict", map_dict)
                // tblName = "abscat",
                const order_by = null, employee_pk = null, is_disabled = false;
                const tblRow = CreateTblRow(tblBody_datatable, tblName, key_str, map_id, pk_int, ppk_int, order_by, employee_pk, row_index, is_disabled)

                UpdateTblRow(tblName, tblRow, map_dict)
            }  // for (const [map_id, map_dict] of data_map.entries())
        }  // if(!!data_map)
        Filter_TableRows();
    }  // FillAbscatTableRows

//=========  CreateTblHeader  === PR2019-10-25 PR2020-06-18 PR2021-02-12
    function CreateTblHeader(tblName, key_str) {
        //console.log("===  CreateTblHeader == tblName: ", tblName, key_str);
        // tblName = 'abscat', "paydatecode", "wagecode" , "employee"
        // key_str has only value when tblName =  "wagecode" :  "wfc", "wgc", "fnc", "alw"
                // selected_btns =       payroll_agg, payroll_detail, abscat,
        //                       paydatecode, functioncode, wagecode, wagefactor, allowance
        // field_setting_keys =  payroll_hours_agg, payroll_hours_detail, payroll_alw_agg, payroll_alw_detail, abscat
        //                       employee, paydatecode, functioncode, wagecode, wagefactor, allowance, closingdate

        const field_setting_key = (tblName === "wagecode") ?
                                        (key_str === "wgc") ? tblName :
                                        (key_str === "wfc") ? "wagefactor" :
                                        (key_str === "fnc") ? "functioncode" :
                                        (key_str === "alw") ? "allowance" :  null
                                  : tblName;
        const field_setting = field_settings[field_setting_key];

        //console.log("field_setting: ", field_setting);
        const tblHead = (tblName === "employee") ? tblHead_employee :
                        (tblName === "paydatecode") ? tblHead_paydatecode :
                        (tblName === "wagecode") ? tblHead_paydatecode :
                        tblHead_datatable;
        tblHead.innerText = null

        if(field_setting){
            const column_count = field_setting.field_names.length;
            if(column_count){

// +++  insert header row ++++++++++++++++++++++++++++++++
                // add extra header line when abscat with "Wage components" and "Count no hours on"
                let abscat_header_row = null;
                if(tblName === "abscat") {abscat_header_row = tblHead_datatable.insertRow (-1)};

                let tblRow_header = tblHead.insertRow (-1);
                let tblRow_filter = tblHead.insertRow (-1);

//--- insert th's to tblHead
                for (let j = 0; j < column_count; j++) {
                    const field_caption = loc[field_setting.field_caption[j]]
                    const field_name = field_setting.field_names[j];
                    const filter_tag = field_setting.filter_tags[j];
                    const class_width = "tw_" + field_setting.field_width[j];
                    const class_align = "ta_" + field_setting.field_align[j];

// +++ add th to abscat_header_row.
                    if(abscat_header_row){
                        // correction for spanned columns
                        if(j < 7 ) {
                            const abscat_th = document.createElement("th");
                            const abscat_el_div = document.createElement("div");
                            if([3, 4].indexOf(j) > -1){
                                abscat_el_div.innerText = (j ===3) ? loc.Wage_component : loc.Dont_count_hours_on;
                                abscat_th.setAttribute("colspan", "4")
                                //abscat_el_div.classList.add("tsa_bc_lightgrey","ta_c")
                               abscat_el_div.classList.add("ta_c")
                            }
                            abscat_th.appendChild(abscat_el_div);
            // --- add border around columns
                            if([3, 4].indexOf(j) > -1){
                                abscat_th.classList.add("td_border_left");
                                abscat_th.classList.add("td_border_right");
                            }
                            //abscat_th.setAttribute("data-j", j)
                            abscat_th.setAttribute("data-field_caption", field_caption)
                            abscat_header_row.appendChild(abscat_th);
                    }};
// +++ add th to header_row.
                    let th_header = document.createElement("th");
        // --- add div to th, margin not working with th
                    let el_header = document.createElement("div");
                    if ( tblName === "employee" || tblName === "paydatecode" || (tblName === "wagecode" && key_str === "fnc") ){
                        if (j === 0 ){
        // --- add checked image to first column
                            el_header.classList.add("edit_0_6")
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

// --- add td_border_left, td_border_right
                    // TODO in which tables??
                    if (tblName === "abscat"){
                        if([3, 7].indexOf(j) > -1){
                            th_header.classList.add("td_border_left");
                        } else if(j === 10){
                            th_header.classList.add("td_border_right");
                        }
                    }
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
                                el_filter.addEventListener("keyup", function(event){HandleFilterKeyup(el_filter, event)});
                                el_filter.setAttribute("autocomplete", "off");
                                el_filter.setAttribute("ondragstart", "return false;");
                                el_filter.setAttribute("ondrop", "return false;");
                            } else if (["inactive", "triple"].indexOf(filter_tag) > -1) {
                                el_filter.addEventListener("click", function(event){HandleFilter_Tickmark(el_filter)});
                                const el_icon = document.createElement("div");
                                    el_icon.classList.add("tick_0_0", "tw-20")
                                el_filter.appendChild(el_icon);
                                el_filter.classList.add("pointer_show");
                            }

                            el_filter.setAttribute("data-table", tblName);
                            el_filter.setAttribute("data-key", key_str);
                            el_filter.setAttribute("data-colindex", j);
                           // el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                            el_filter.classList.add(class_width, class_align, "tsa_transparent");

// --- add td_border_left, td_border_right

                    // TODO in which tables??
                    if (tblName === "abscat"){
                        if([3, 7].indexOf(j) > -1){
                            th_filter.classList.add("td_border_left");
                        } else if(j === 10){
                            th_filter.classList.add("td_border_right");
                        }
                    }

// --- add width, text_align
                        th_filter.appendChild(el_filter);
                    tblRow_filter.appendChild(th_filter);
                }  // for (let j = 0; j < column_count; j++)
            }  // if(column_count)
        }  // if(field_setting)
    };  //  CreateTblHeader

//=========  CreateTblRow  ================ PR2020-06-09 PR2021-01-30
    function CreateTblRow(tblBody, tblName, key_str, map_id, pk_str, ppk_str, order_by, employee_pk, row_index, is_disabled) {
        //console.log("=========  CreateTblRow =========", );
        //console.log("tblName", tblName);
        //console.log("key_str", key_str);
        //console.log("map_id", map_id);

        /* called by:
            FillWagecodeRows                  >> tblName = "wagecode";
            FillFunctioncodeOrPaydatecodeRows >> tblName = "paydatecode","functioncode" or "employee"
            FillAbscatTableRows               >> tblName = "abscat"
            UpdateFromResponse                  NIU ??
            UpdateWagecodeRow                   >> tblName = "wagecode"
            refresh_datamap_item                NIU
            refresh_updated_row           >> tblName = "abscat" "functioncode" "employee"
            MPP_FillClosingdateRows             >> tblName = "closingdate"
            MPP_AddClosingdate                   >> tblName = "closingdate"
        */
        //selected_btns are: "btn_payroll_agg", "btn_payroll_detail", "paydatecode", "abscat",
        //                      "wagecode", "wagefactor", "allowance", "functioncode"
        // tblNames are: "abscat", "paydatecode", "wagecode", "closingdate" "employee"
        // key_str has only value when tblName = "wagecode" :  "wfc", "wgc", "fnc", "alw"

        let tblRow = null;

        const field_setting_key = (tblName === "wagecode") ?
                                (key_str === "wgc") ? tblName :
                                (key_str === "wfc") ? "wagefactor" :
                                (key_str === "fnc") ? "functioncode" :
                                (key_str === "alw") ? "allowance" :  null
                          : tblName;
        const field_setting = field_settings[field_setting_key];

        if(field_setting){
// --- insert tblRow into tblBody at row_index
            // TODO debug insert at index not working, gives correct index but still inserts at end PR2020-06-21
            //console.log("row_index", row_index, typeof row_index);
            if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09\\
            const row_count = tblBody.rows.length;
            if(row_index >= row_count ) {row_index = -1}
            tblRow = tblBody.insertRow(row_index);

            const key_str = selected_key; // selected_key gets value in HandleBtnSelect from selected_btn

// --- add data attributes to tblRow
            if(map_id){tblRow.setAttribute("id", map_id)};
            if(pk_str){tblRow.setAttribute("data-pk", pk_str)};
            if(ppk_str){tblRow.setAttribute("data-ppk", ppk_str)};
            if(tblName){tblRow.setAttribute("data-table", tblName)};
            if(order_by){tblRow.setAttribute("data-orderby", order_by)};

// --- add EventListener to tblRow, not in functioncode, paydatecode,  employee, closingdate,
            if (tblName === "wagecode"){
                if(key_str !== "fnc"){
                    tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
                }
            } else if (["closingdate" , "paydatecode", "employee"].indexOf(tblName) > -1) {
                // pass
            } else  {
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
                    if (["o_code", "o_identifier", "o_sequence", "wfc_onwd", "wfc_onsat", "wfc_onsun", "wfc_onph",].indexOf( fldName ) > -1){
                        el_div.addEventListener("click", function() {MAC_Open(j, el_div)}, false)
                        add_hover(el_div)
                    } else if (["o_nowd", "o_nosat", "o_nosun", "o_noph"].indexOf( fldName ) > -1){
                        const img_class = "tick_0_0";
                // --- add EventListener
                        el_div.addEventListener("click", function() {MAC_Open(j, el_div)}, false)
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
                } else if ( (tblName === "paydatecode") || (tblName === "wagecode" && key_str === "fnc" ) ) {
                // --- add EventListener,  img delete, inactive and no_wage
                        if (fldName === "select") {
                            append_background_class(el_div, "tick_0_0");
                            add_hover(el_div);
                            el_div.addEventListener("click", function() {MFU_SetTickmarkNEW(el_div)}, false);
                        } else if (fldName === "code") {
                            add_hover(el_div);
                            el_div.addEventListener("click", function() {MFU_SetTickmarkNEW(el_div)}, false);
                        } else if (fldName === "edit") {
                            append_background_class(el_div, "edit_0_5", "edit_1_5");
                            el_div.classList.add("mx-1")
                            if (tblName === "wagecode"){
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
                } else if ( tblName === "wagecode" && key_str !== "fnc" ){
                        //add_hover(el_div);
                        //el_div.classList.add("pointer_show");
                        if ( fldName === "inactive") {
                            append_background_class(el_div, "inactive_0_2");
                            add_hover(el_div);
                            el_div.addEventListener("click", function() {UploadToggle(el_div)}, false);
                            el_div.classList.add("mx-1")
                        } else if ( j === 0) {
                            //el_div.addEventListener("click", function() {MWF_Select(el_div)}, false);
                        } else if ([1, 2, 3, 4].indexOf(j) > -1){
                            el_div.addEventListener("click", function() {MWF_Open(false, tblName, el_div)}, false);
                            add_hover(el_div);
                        }

                        // add right margin to wagerate
                        if (fldName === "wagerate") {el_div.classList.add("pr-2") }

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
                    // field_names: ["select", "code", "fnc_code", "pdc_code"],
// --- add blank image to check boxes
                     if (fldName === "select") {
                        append_background_class(el_div, "tick_0_0");
                        el_div.addEventListener("click", function() {SetTickEmployee(el_div)}, false);
                    } else if (fldName === "code") {
                        add_hover(el_div);
                        el_div.addEventListener("click", function() {SetTickEmployee(el_div)}, false);
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
               el_div.classList.add("ta_" + field_setting.field_align[j]);

// --- add td_border_left, td_border_right

               // TODO in which tables??
               if (tblName === "abscat"){
                   if([3, 7].indexOf(j) > -1){
                        td.classList.add("td_border_left");
                   } else if(j === 10){
                        td.classList.add("td_border_right");
                   }
               }


// --- add element to td.
               td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[tblName])
        return tblRow
    };  // CreateTblRow

//=========  CreateTblFoot  ================ PR2020-06-18
    function CreateTblFoot(tblName, key_str) {
        //console.log("========= CreateTblFoot  ========= ");
        //console.log("tblName", tblName);
        //console.log("key_str", key_str);

// --- function adds row 'add new' in tablefoot
        const field_setting = field_settings[selected_btn];
        if (field_setting){
            const column_count = field_setting.field_names.length;
// --- insert tblRow into tblBody
            const el_id = (["paydatecode", "wagecode", "wagefactor", "allowance"].indexOf(tblName) > -1) ? "id_tblFoot_paydatecode" : "id_tblFoot_datatable";
            const tblFoot = document.getElementById(el_id);

            tblFoot.innerText = null;
            let tblRow = tblFoot.insertRow(-1);
//+++ insert td's into tblRow
            let td = tblRow.insertCell(-1);
            td = tblRow.insertCell(-1);
            td.setAttribute("colspan",column_count -1)
// --- create div element with tag from field_tags
            let el_div = document.createElement("div");
// --- add EventListener and placeholder
                if(tblName === "paydatecode"){
                    el_div.addEventListener("click", function() {MPP_Open()}, false);
                    el_div.innerText = "< " + loc.Add_payrollperiod + " >";
                } else if(tblName === "wagecode"){
                    if (key_str === "fnc"){
                        el_div.addEventListener("click", function() {MFU_Open()}, false)
                        el_div.innerText = "< " + loc.Add_function + " >";

                    } else if (key_str === "wfc"){
                        el_div.addEventListener("click", function() {MWF_Open(true, tblName, el_div)}, false)
                        el_div.innerText = "< " + loc.Add_wage_component + " >";

                    } else if (key_str === "alw"){
                        el_div.addEventListener("click", function() {MWF_Open(true, tblName, el_div)}, false)
                        el_div.innerText = "< " + loc.Add_allowance + " >";
                    }
                }
                add_hover(el_div);

// --- add class,
                el_div.classList.add("pointer_show", "tsa_color_darkgrey", "tsa_transparent")
            td.appendChild(el_div);
        }  //  if (field_settings[tblName])
    }  // CreateTblFoot

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
                    // ---  hide loaders
                    el_loader.classList.add(cls_visible_hide)
                    el_MEP_loader.classList.add(cls_hide)

                    console.log( "response");
                    console.log( response);
                    // TODO NIU, I think PR2021-01-30
                    if ("update_list" in response) {
                        alert("update_list")
                       // for (let i = 0, len = response["update_list"].length; i < len; i++) {
                       //     const update_dict = response["update_list"][i];
                       //     UpdateFromResponse(update_dict);
                      //  }
                    };
                    if ("employee_list" in response){
                        b_refresh_datamap(response["employee_list"], employee_map)
                    }
                    // used in MODAL EMPLHOUR PAYROLL
                    if ("emplhourlog_list" in response){ MEP_FillLogTable(response.emplhourlog_list)};
                    if ("emplhour_dict" in response){ MEP_SetInputElements(response.emplhour_dict)};

                    if("updated_abscat_rows" in response){
                        refresh_updated_rows("abscat", abscat_map, response.updated_abscat_rows, false); // skip_show_ok = false
                    }
                    if("updated_functioncode_rows" in response){
                        alert("updated_functioncode_rows")
                       // refresh_updated_rows("functioncode", functioncode_map, response.updated_functioncode_rows, false); // skip_show_ok = false
                    }
                    if ("updated_wagecode_rows" in response) {
                        UpdateWagecodeRowsFromResponse(response.updated_wagecode_rows)
                    };
                    if("updated_employee_rows" in response){
                        refresh_updated_rows("employee", employee_map, response.updated_employee_rows, false); // skip_show_ok = false
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
        console.log( " ==== UploadToggle ====");
        // called by fields "o_inactive", "delete"
        // also by functioncode

        const tblRow = get_tablerow_selected(el_input)
        if(tblRow){
            const fldName = get_attr_from_el(el_input, "data-field")
            const is_delete = (fldName === "delete")
            const tblName = get_attr_from_el(tblRow, "data-table")
            const map_id =  tblRow.id;
            const data_map = get_data_map(tblName);
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);

        console.log( "map_dict", map_dict);
            const is_make_inactive = (tblName === "abscat" && fldName === "o_inactive" && !map_dict.o_inactive) ||
                                     (tblName === "functioncode" && fldName === "inactive" && !map_dict.inactive) ||
                                     (tblName === "wagecode" && fldName === "inactive" && !map_dict.inactive);
            const is_absence = (tblName === "abscat");
        console.log( "tblName", tblName);
        console.log( "fldName", fldName);
            if(is_make_inactive){
                // when make inactive: show ModConfirm
                ModConfirmOpen("inactive", el_input) ;
            } else {
                if(!isEmpty(map_dict)){
                    const pk_int = map_dict.id;
                    const ppk_int = (tblName === "abscat") ? map_dict.c_id : map_dict.comp_id;
                    const key_str = map_dict.key;
                    let upload_dict = { pk: pk_int,
                                         ppk: ppk_int,
                                         table: tblName,
                                         key: key_str,
                                         isabsence: is_absence,
                                         mapid: map_id};
                    let new_value = false;
                    if(is_delete) {
                        upload_dict.id.delete = true;
                    } else {
        // ---  get field value from map_dict
                        const db_fldName = (tblName === "abscat") ? mapped_abscat_fields[fldName] : fldName;
                        const old_value = map_dict[fldName] ;

        // ---  toggle value
                        new_value = (!old_value);
                        upload_dict[db_fldName] = new_value;

        // ---  change icon, before uploading (nopay has reverse tickmark
                        if (db_fldName === "inactive") {
                            add_or_remove_class(el_input, "inactive_1_3", new_value, "inactive_0_2" )
                        } else {
                            if (fldName === "o_nopay") {
                                // no_pay: field_value = true = no payment    --> on screen ' no payment' = true
                                add_or_remove_class(el_input.children[0], "tick_2_2", new_value, "tick_0_0" )
                                el_input.setAttribute("data-filter", (new_value) ? 1 : 0 );
                            } else {
                                // no_sun: field_value = true = no hours on sun --> on screen 'count hours on sun = false
                                add_or_remove_class(el_input.children[0], "tick_0_0", new_value, "tick_2_2")
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
    function UpdateTblRow(tblName, tblRow, update_dict){
        //console.log("========= UpdateTblRow  =========");
        //console.log("update_dict", update_dict);
        // called by UpdateFromResponse, refresh_updated_row, FillAbscatTableRows, FillFunctioncodeOrPaydatecodeRows
        const field_setting = field_settings[selected_btn];

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

//--- get info from update_dict
            const map_id = (update_dict.mapid) ? update_dict.mapid : get_dict_value(update_dict, ["mapid"]);
            //const arr = (map_id) ? map_id.split("_") : null;
            //const tblName = (arr) ? arr[0] : get_dict_value(update_dict, ["id","table"]);
            const pk_int = (update_dict.id) ? update_dict.id : get_dict_value(update_dict, ["id","pk"]);
            const ppk_int = (update_dict.comp_id) ? update_dict.comp_id : get_dict_value(update_dict, ["id","ppk"]);
            const is_created = (update_dict.created != null) ? update_dict.created : get_dict_value(update_dict, ["id","created"], false);
            const msg_err = (update_dict.error != null) ? update_dict.error : get_dict_value(update_dict, ["id","error"], false);
            const column_count = field_setting.field_names.length;
            const is_inactive = (update_dict.inactive != null) ? update_dict.inactive : get_dict_value (update_dict, ["inactive", "value"], false);
            let order_by = "";
            if (tblName === "abscat") {
                order_by = (update_dict.o_code) ? update_dict.o_code : ""
            } else if (tblName === "wagecode") {
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
                    row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, loc.user_lang);
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
                        UpdateField(tblName, el_input, update_dict, false ) // false = skip_show_ok
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!update_dict && !!tblRow)
    }  // function UpdateTblRow

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(tblName, el_input, item_dict, show_ok){
        //console.log("========= UpdateField  =========");
        //console.log("item_dict", item_dict);
        // called by UpdateTblRow, refresh_tblRowNEW, refresh_datamap_item
        const fldName = get_attr_from_el(el_input, "data-field");
        const field_value = item_dict[fldName];
        //console.log("fldName", fldName);
        //console.log("field_value", field_value);

        const map_id = (item_dict.mapid) ? item_dict.mapid : get_dict_value(item_dict, ["mapid"]);
        //const arr = (map_id) ? map_id.split("_") : null;
        //const tblName = (arr) ? arr[0] : get_dict_value(item_dict, ["id","table"]);
        const is_absence = (item_dict.isabsence != null) ? item_dict.isabsence : get_dict_value(item_dict, ["id","isabsence"], false);

        //console.log("tblName", tblName);
// --- lookup field in item_dict, get data from field_dict
        //const is_locked = (!!get_dict_value (field_dict, ["locked"]));
        //el_input.disabled = locked
        if (["code", "description", "fnc_code", "payrollcode", "pdc_code", "o_code", "o_identifier"].indexOf( fldName ) > -1){
            // any value is needed to show hover and let eventlistener work
            el_input.innerText = (field_value) ? field_value : "\n";
            el_input.setAttribute("data-filter", (field_value) ? field_value.toLowerCase() : null )
        } else if (["o_sequence"].indexOf( fldName ) > -1){
            // any value is neede to show hover and let eventlistener work
            el_input.innerText = (field_value) ? field_value : "\n";
            el_input.setAttribute("data-filter", field_value);
        } else if (fldName === "wagerate") {
            //let display = null;
            //if(tblName === "allowance"){
            //    display = format_pricerate (loc.user_lang, value, false, true)   // is_percentage, show_zero
           // } else {
           //     display = (value != null) ? format_wagefactor (loc.user_lang, value) : "\n"
           // }
            const is_percentage = (map_dict.key === "wfc");
            const display = format_pricerate (loc.user_lang, map_dict.wagerate, is_percentage, true) // true = show_zero
            el_input.innerText = display;
            el_input.setAttribute("data-filter", field_value);

        } else if (["wfc_onwd", "wfc_onsat", "wfc_onsun", "wfc_onph"].indexOf( fldName ) > -1){
            const code = item_dict[fldName + "_code"]
            const wagerate = item_dict[fldName + "_rate"]

            el_input.innerText = (code) ? code : "\n";
            el_input.setAttribute("data-filter", (code) ? code.toLowerCase() : null )

            const display = format_pricerate (loc.user_lang, wagerate, true, true) // true = is_percentage  true = show_zero
            el_input.title = (display) ? display : "";

        } else if (["o_nowd", "o_nosat", "o_nosun", "o_noph"].indexOf( fldName ) > -1){
            // extra div necessary to have wide columns and show only 20 pixels for icon - might be solved with mx-4
            // no_sun: field_value = true = no hours on sun --> on screen 'count hours on sun = false
            add_or_remove_class(el_input.children[0], "tick_1_1", field_value, "tick_0_0")
            el_input.setAttribute("data-filter", (field_value) ? 1 :0 );

//console.log("field_value", field_value);

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

        selected_btn = get_dict_value(setting_dict, ["sel_btn"], "btn_payroll_agg");

        let key = "payroll_period";
        if (key in setting_dict){
            selected_period = setting_dict[key];
            const header_period = UpdateHeaderPeriod();
            // >>> ??? document.getElementById("id_calendar_hdr_text").innerText = header_period;
        }
        // TODO also set tblrow selected when getting saved pk. disable for now
        //selected.paydatecode_pk = get_dict_value(setting_dict, ["sel_paydatecode_pk"])

    }  // UpdateSettings

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");

        let header_text = null, sidebar_selectperiod_text = null;
        const is_payrollperiod_view = (selected_view === "payroll_period");
        const sidebar_selectperiodlabel = ( (is_payrollperiod_view) ? loc.Payroll_period : loc.Period) + ": ";

        if (["btn_payroll_agg", "btn_payroll_detail"].indexOf(selected_btn) > -1) {
            //console.log( "selected_period", selected_period);
            // el_sbr_select_period is only visible in 'payroll_agg' or 'payroll_detail'
            const period_tag = (selected_period.period_tag) ? selected_period.period_tag : null
            const dates_display = get_dict_value(selected_period, ["dates_display_short"], "---");

            if(is_payrollperiod_view){
                header_text = loc.Payroll_period;
                if(selected_period.paydateitem_period) { header_text += " " + selected_period.paydateitem_period}
            } else {
                header_text = loc.Period;
            }
            header_text += ": ";
            if(is_payroll_detail_mode){
                header_text += selected.employee_code + " - " + dates_display;
            } else {
                header_text += dates_display;
            }

            if(is_payrollperiod_view){
    // ---  get first / last date caption of selected.paydateitem
                selected.paydateitem_code = "";

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
            header_text = loc.Absence_categories;
        } else if (selected_btn === "paydatecode") {
            header_text = loc.Payroll_periods;
        } else if (selected_btn === "functioncode") {
            header_text = loc.Function + ( (selected.functioncode_pk && selected.functioncode_code) ? ": " + selected.functioncode_code : "");
        } else if (selected_btn === "wagefactor") {
            header_text = loc.Wage_components;
        } else if (selected_btn === "allowance") {
            header_text = loc.Allowances;
        }  //  if (["btn_payroll_agg", "btn_payroll_detail"].indexOf(selected_btn) > -1) {
        document.getElementById("id_hdr_text").innerText = header_text
        document.getElementById("id_SBR_label_select_period").innerText = sidebar_selectperiodlabel;
        el_sbr_select_period.value = sidebar_selectperiod_text;
    }  // UpdateHeaderText

// +++++++++++++++++ UPDATE FROM RESPONSE ++++++++++++++++++++++++++++++++++++++++++++++++++
///=========  UpdateWagecodeRowsFromResponse  ================ PR2020-09-15
    function UpdateWagecodeRowsFromResponse(updated_rows) {
        //console.log(" --- UpdateAbsenceRowsFromResponseNEW  ---");
        for (let i = 0, dict, len = updated_rows.length; i < len; i++) {
            UpdateWagecodeRow(updated_rows[i])
        }
    } // UpdateWagecodeRowsFromResponse

//=========  UpdateWagecodeRow  ================ PR2020-08-28 PR2020-09-10
    function UpdateWagecodeRow(update_dict) {
        console.log(" =====  UpdateWagecodeRow  =====");
        console.log("update_dict", update_dict);

        if(!isEmpty(update_dict)){
            const map_id = update_dict.mapid;
            const tblName = "wagecode";
            const key_str = update_dict.key;
            const is_created = (update_dict.created) ? update_dict.created : false;
            const is_deleted = (update_dict.deleted) ? update_dict.deleted : false;

// +++  create list of updated fields, before updating data_map, to make them green later
            const field_names = field_settings[selected_btn].field_names;
            const updated_fields = b_get_updated_fields_list(field_names, wagecode_map, update_dict);
        //console.log("updated_fields", updated_fields);

// +++  update or add wagecode_dict in wagecode_map
            const data_map = wagecode_map;
        //console.log("data_map.size before: " + data_map.size);
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
                tblRow = CreateTblRow(tblBody_paydatecode, tblName, key_str, map_id, update_dict.id, update_dict.comp_id, order_by, employee_pk, row_index, is_disabled)

    //--- set new selected.teammember_pk
                selected.wagecode_pk = update_dict.id
                selected.wagecode_code = update_dict.code

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
    }  // UpdateWagecodeRow

//========= RefreshTblRowNEW  ============= PR2020-09-15 PR2021-02-11
    function RefreshTblRowNEW(tblRow, update_dict){
        //console.log("========= RefreshTblRowNEW  =========");
        //console.log("update_dict", update_dict);

        if (tblRow && !isEmpty(update_dict)) {
// --- loop through cells of tablerow
            for (let i = 0, cell; cell = tblRow.cells[i]; i++) {
                UpdateWagecodeField(cell.children[0], update_dict, true)  // true = is_refresh
            }
        };
    }  // RefreshTblRowNEW

//=========  UpdateWagecodeField  ================ PR2020-09-15 PR2021-02-11
    function UpdateWagecodeField(el_input, update_dict, is_refresh) {
        //console.log(" =====  UpdateWagecodeField  =====");
        //console.log("el_input", el_input);
        // when refresh: only update fields that are in update_dict
        if(el_input){
            const fldName = get_attr_from_el(el_input, "data-field");
            if(update_dict && fldName ){
                if(!is_refresh || fldName in update_dict) {
                    const value = update_dict[fldName];
                    if (fldName === "code") {
                        el_input.innerText = (value) ? value : "---";
                    } else if (fldName === "description") {
                        el_input.innerText = (value) ? value : "\n";
                    } else if (fldName === "wagerate") {
                        const is_percentage = (update_dict.key === "wfc");
                        const display = format_pricerate (loc.user_lang, value, is_percentage, true) // true = show_zero
                        el_input.innerText = display;
                    } else if (fldName === "isdefault"){
                        add_or_remove_class(el_input, "tick_2_2", update_dict.isdefault )
                    } else if (fldName === "inactive"){
                        add_or_remove_class(el_input, "inactive_1_3", value, "inactive_0_2" )
                        el_input.title = (value) ? loc.Click_to_make_this_item_inactive : loc.Click_to_make_this_item_active;
        }}}};
    }  // UpdateWagecodeField

// ##########################################
//=========  UpdateFromResponse  ================ PR2020-06-10
//  NIU, I think PR2021-01-30
    function UpdateFromResponse(update_dict) {
       console.log(" ################### --- UpdateFromResponse  ---");
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
            selected.paydatecode_pk = null;
            selected.paydatecode_code = "";
            selected.paydateitem_iso = null;   // used in MSPP_SelectItem
            selected.paydateitem_code = "";
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
                tblRow = CreateTblRow(tblBody, tblName, key_str, map_id, pk_int, ppk_int, order_by, employee_pk, is_disabled)
            }
    //--- update Table Row
            if(tblRow){
                UpdateTblRow(tblName, tblRow, update_dict)
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
                                    selected.employee_pk);
            }, 2000);
          }
      */
//--- refresh header text
        UpdateHeaderText();
    }  // UpdateFromResponse(update_list)

//=========  refresh_updated_rows ================ PR2020-09-08
    function refresh_updated_rows(tblName, data_map, updated_rows, skip_show_ok) {
        //console.log(" --- refresh_updated_rows  ---");
        if (updated_rows) {
            for (let i = 0, update_dict; update_dict = updated_rows[i]; i++) {
                refresh_updated_row(tblName, data_map, update_dict, skip_show_ok)
            }
        }
    } // refresh_updated_rows

//=========  refresh_updated_row  ================ PR2020-09-08 PR2021-02-28
    function refresh_updated_row(tblName, data_map, update_dict, skip_show_ok) {
        console.log(" --- refresh_updated_row  ---");
        //console.log("tblName", tblName);
        //console.log("update_dict", update_dict);
        // used by  (so far) :
        // updated_abscat_rows (tbl 'abscat'), updated_functioncode_rows (tbl "functioncode"), updated_employee_rows (tbl "employee")

        const tblBody = (tblName === "employee") ? tblBody_employee :
                        (["functioncode", "paydatecode"].indexOf(tblName) > -1) ? tblBody_paydatecode :
                        (tblName === "abscat") ? tblBody_datatable :
                        tblBody_datatable;

// ---  update or add update_dict in data_map
        const map_id = update_dict.mapid;
        const old_map_dict = data_map.get(update_dict.mapid);
        const is_deleted = update_dict.deleted;
        const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

        //console.log("map_id", map_id);
        //console.log("is_created", is_created);
        //console.log("is_deleted", is_deleted);
        console.log("data_map.size before: " + data_map.size);

// ---  refresh fields in tblRow
        // ??? refresh_tblRowNEW(tblName, update_dict, data_map, is_created, is_deleted, skip_show_ok);

        let updated_columns = [];
        if(is_created){
// ---  insert new item in alphabetical order
            //if (data_map.size){
                // inserting at index not necessary, only when reloading page the rows are added in order of data_map
                // insertInMapAtIndex(data_map, map_id, update_dict, 0, loc.user_lang)
            //} else {
            //    data_map.set(map_id, update_dict)
            //}
            data_map.set(map_id, update_dict)
            updated_columns.push("created")

// ---  delete deleted item
        } else if(is_deleted){
            data_map.delete(map_id);
        } else {

// ---  check which fields are updated, add to list 'updated_columns'
            // new emplhour has no old_map_dict PR2020-08-19
            // skip first column (is margin)
            const field_names = field_settings[tblName].field_names;
            for (let i = 1, col_field, old_value, new_value; col_field = field_names[i]; i++) {
                if (col_field in old_map_dict && col_field in update_dict){
                    if (old_map_dict[col_field] !== update_dict[col_field] ) {
                        updated_columns.push(col_field)
                    }
                }
            };
// ---  update item in data_map
            data_map.set(map_id, update_dict)
        }
        //console.log("data_map.size after: " + data_map.size);
        //console.log("updated_columns", updated_columns);

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
            //console.log("order_by: " , order_by);
// get row_index
            let row_index = t_get_rowindex_by_orderby(tblBody, order_by)
            //console.log("row_index: " , row_index);
// add new tablerow if it does not exist
            const key_str = null, employee_pk = null, is_disabled = false;
            // key_str has only value when tblName = "wagecode" :  "wfc", "wgc", "fnc", "alw"
            tblRow = CreateTblRow(tblBody, tblName, key_str, map_id, update_dict.id, update_dict.c_id, order_by, employee_pk, row_index, is_disabled)
            UpdateTblRow(tblName, tblRow, update_dict)

// set new selected_emplhour_pk
            //selected_emplhour_pk = pk_int
// highlight new row, make green for 2 seconds
            DeselectHighlightedRows(tblRow, cls_selected);
            tblRow.classList.add(cls_selected)
            //ShowOkElement(tblRow);
            b_ShowTblrow_OK_Error(tblRow, true);  // true = show_ok
// scrollIntoView
            //tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
        } else {
            tblRow = document.getElementById(map_id);
        //console.log("tblRow: " , tblRow);
            // ???? UpdateTblRow(tblName, tblRow, update_dict)
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
                for (let i = 0, fldName; fldName = updated_columns[i]; i++) {
                    const el_div = tblRow.querySelector("[data-field='" + fldName  + "']");
                    if(el_div){
                        UpdateField(tblName, el_div, update_dict, false)  // true = show_ok
                        ShowOkElement(el_div);
                    }
                }
                /*
                for (let i = 0, td, el; td = tblRow.cells[i]; i++) {
                    const el = td.children[0];
                    if(el){
                        const el_field = get_attr_from_el(el, "data-field")
                        if(updated_columns.includes(el_field)){
                            UpdateField(tblName, el, update_dict, false)  // true = show_ok
                            ShowOkElement(el);
                        }
                    }
                }
                */
            }
        }
    }  // refresh_updated_row

//=========  refresh_tblRowNEW  ================ PR2020-09-08 PR2020-09-20 PR2021-02-28
// TODO to be deprecated??
    function refresh_tblRowNEW(tblName, update_dict, data_map, is_created, is_deleted, skip_show_ok) {
        console.log(" --- refresh_tblRowNEW  ---");
        // used in MAC_Save, refresh_updated_row
        // refresh must come before updating data_map, to check changed values with old_map_dict
        // ShowOk when created tblRow must be dome outsied this function

        //console.log("selected_btn", selected_btn);
        //console.log("tblName", tblName);
        //const fieldnames_key =

        const tblRow = document.getElementById(update_dict.mapid);
        //console.log("tblRow", tblRow);
        //console.log("update_dict.mapid", update_dict.mapid);
        if(tblRow){
            const field_names = field_settings[selected_btn].field_names;
            const old_map_dict = data_map.get(update_dict.mapid);
            const is_deleted = update_dict.deleted;
            const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

            console.log("field_names", field_names);
        //console.log("is_created", is_created);
            if(is_deleted && !skip_show_ok){
//--- remove deleted tblRow
                tblRow.parentNode.removeChild(tblRow);
//--- make tblRow green for 2 seconds
            } else if(is_created && !skip_show_ok){
                // ShowOk when created tblRow must be dome outside this function
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

                console.log("updated_columns", updated_columns);
                console.log("skip_show_ok", skip_show_ok);
                if(updated_columns){
    // ---  make updated fields green for 2 seconds
                    for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                        const el = cell.children[0];
                        if(el){
                            const el_field = get_attr_from_el(el, "data-field")
                            if(updated_columns.includes(el_field)){
                                UpdateField(tblName, el, update_dict, !skip_show_ok)  // show_ok = !skip_show_ok
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
        console.log( "===== HandleFilterToggle  ========= ");
        const field_name = get_attr_from_el(el_input, "data-field")
        const filter_tag = get_attr_from_el(el_input, "data-filtertag")
        // PR2020-09-03 debug: col_index as parameter doesn't work, keeps giving highest col_index. Use data-colindex instead
        const col_index = get_attr_from_el_int(el_input, "data-colindex")
;
        if (field_name === "status") {
            //filter_dict = [ ["boolean", "1"] ];
            t_SetExtendedFilterDict(el_input, col_index, filter_dict);
            const new_value = (filter_dict[col_index] && filter_dict[col_index][1] ) ? filter_dict[col_index][1] : 0;
            add_or_remove_class(el_input, "stat_0_4", (new_value === 1), "stat_0_0")

            FillPayrollRows();
        }
    };  // HandleFilterToggle

//========= HandleFilterKeyup  ====================================
    function HandleFilterKeyup(el_filter, event) {
        console.log( "===== HandleFilterKeyup  ========= ");
        // PR2020-09-03 debug: col_index as parameter doesn't work, keeps giving highest col_index. Use data-colindex instead
        const tblName = get_attr_from_el(el_filter, "data-table");
        const key_str = get_attr_from_el(el_filter, "data-key");
        const col_index = get_attr_from_el_int(el_filter, "data-colindex");

        const skip_filter = t_SetExtendedFilterDict(el_filter, col_index, filter_dict, event.key);

        console.log( "skip_filter", skip_filter);
        if (!skip_filter) {
            // FillPayrollRows();
            const tblBody = get_tblBody(tblName, key_str);
    // ---  loop through tblBody.rows
            for (let i = 0, tblRow, show_row; tblRow = tblBody.rows[i]; i++) {
                show_row = ShowTableRow(tblRow)
    // ---  show / hide row
                add_or_remove_class(tblRow, cls_hide, !show_row)
            }
        };
    }  // HandleFilterKeyup

//========= HandleFilter_Tickmark  ==================================== PR2020-06-26 PR2020-09-20
    function HandleFilter_Tickmark(el_filter) {
        console.log( "===== HandleFilter_Tickmark  ========= ");
        // PR2020-09-03 debug: col_index as parameter doesn't work, keeps giving highest col_index. Use data-colindex instead
        const col_index = get_attr_from_el_int(el_filter, "data-colindex")
        // only called by CreateTblHeader
        //console.log("...... .col_index", col_index);
        const skip_filter = t_SetExtendedFilterDict(el_filter, col_index, filter_dict, event.key);

        let arr = (filter_dict && filter_dict[col_index]) ? filter_dict[col_index] : "";
        const value = (arr && arr[1] ) ? arr[1] : 0;
        if(arr[0] === "inactive"){
            el_filter.children[0].className = (value) ? "inactive_1_3" : "inactive_0_0";
        } else if(arr[0] === "triple"){
            el_filter.children[0].className = "tick_0_" + value;;
        }
        console.log("...... .filter_dict", filter_dict);
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
                add_or_remove_class(tblRow.cells[0].children[0], "tick_2_2", filter_checked, "tick_0_0")
            }
        }
*/
    }; // HandleFilter_Tickmark


//========= Filter_TableRows  ==================================== PR2020-06-13
    function Filter_TableRows(tblName, key_str) {
        // called by HandleFilterKeyup, FillFunctioncodeOrPaydatecodeRows, FillAbscatTableRows, ResetFilterRows
        // table payroll has its own filter
        console.log( "===== Filter_TableRows  ========= ");
        console.log( "tblName ", tblName , "key_str ", key_str);
        console.log( "filter_dict ", filter_dict);
        let tblBody = get_tblBody(tblName, key_str);

        console.log( "tblBody ", tblBody);
// ---  loop through tblBody.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody.rows[i]; i++) {
            show_row = ShowTableRow(tblRow)
// --- add hours to payroll_totalrow, only when show_row
            //const detail_row = get_dict_value(payroll_hours_detail_rows, [tblRow.id])
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
        // called by HandleFilterKeyup  Filter_TableRows (tobe deprecataed
        // table payroll has its own ShowPayrollRow, called by FillPayrollRows
        //console.log( "===== ShowTableRow  ========= ");
        //console.log( "filter_dict", filter_dict);
        let hide_row = false;
        if (tblRow){
// show all rows if filter_name = ""
            // TODO create separate filter_dict for paydatecode, goes wrong when two tables om one page
            if (!isEmpty(filter_dict)){
                for (const [index_str, filter_arr] of Object.entries(filter_dict)) {
                    const col_index = Number(index_str);
                    const filter_tag = filter_arr[0];
                    const filter_value = filter_arr[1]; // filter_value is already trimmed and lowercase
                    const filter_mode = filter_arr[2];  // modes are: 'blanks_only', 'no_blanks', 'lte', 'gte', 'lt', 'gt'

                    let tbl_cell = tblRow.cells[col_index];
                    if (tbl_cell){
                        let el = tbl_cell.children[0];
                        if (el) {

                            // TODO add other filter_tags
                            if(filter_tag === "text"){
                    // get value from el.value, innerText or data-value
                                // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                                let el_value = el.innerText;
                                if (filter_mode === "blanks_only"){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(el_value && el_value !== "\n" ){
                                        hide_row = true
                                    };
                                } else if(filter_mode === "no_blanks"){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true
                                    }
                                } else {
                                    el_value = el_value.toLowerCase();
                                    // hide row if filter_value not found or el_value is empty
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true;
                                    } else if(el_value.indexOf(filter_value) === -1){
                                        hide_row = true;
                                    }
                                }
                            }  //  if(!!filter_value)c
                        }  // if (!!el) {
                    }  //  if (!!tbl_cell){
                };  // Object.keys(filter_dict).forEach(function(key) {
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
        mod_MSEF_dict.sel_btn = null;
        mod_MSEF_dict.sel_pk = -1;
        mod_MSEF_dict.sel_code = null;

// ---   empty filter input boxes in filter header

// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(tblBody_datatable, cls_selected)

        if (["btn_payroll_agg", "btn_payroll_detail"].indexOf(selected_btn) > -1){
            selected.detail_employee_pk = -1;
            selected.detail_employee_code = "";  // PR2020-11-11 debugL: default value 'null' may give error in export to excel
            is_payroll_detail_mode = false;
            is_payroll_detail_modal_mode = false;
            b_reset_tblHead_filterRow(tblHead_datatable)
               // Filter_TableRows(tblBody_datatable)

            CreatePayrollTblHeader();
            CreateHTML_list()
            FillPayrollRows();

        } else if (["abscat"].indexOf(selected_btn) > -1){
            selected.abscat_pk = null;
            selected.abscat_code = null;
            b_reset_tblHead_filterRow(tblHead_datatable)
                Filter_TableRows(tblBody_datatable)
        } else if (["functioncode", "paydatecode", "wagefactor"].indexOf(selected_btn) > -1){
            selected.employee_pk = -1;
            selected.employee_code = "";
            selected.functioncode_pk = -1;
            selected.functioncode_code = "";
            selected.wagecode_pk = null;
            selected.wagecode_code = "";

            selected.paydatecode_pk = null;
            selected.paydatecode_code = "";

            selected.paydateitem_iso = null;
            selected.paydateitem_code = "";

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
                           (selected_btn === "functioncode") ? selected.functioncode_pk :
                           (selected_btn === "paydatecode") ? selected.paydatecode_pk : null;
        const selected_code = (is_delete) ? null :
                           (selected_btn === "functioncode") ? selected.functioncode_code :
                           (selected_btn === "paydatecode") ? selected.paydatecode_code : "";
        const col_index = (selected_btn === "functioncode") ? 2 :
                           (selected_btn === "paydatecode") ? 3 : null;
        const show_mod_confirm = (!is_delete && !selected_pk)

        //console.log("selected.paydatecode_pk", selected.paydatecode_pk);
        //console.log("selected.paydatecode_code", selected.paydatecode_code);
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


            const tblName = selected_btn;
            const data_map = get_data_map(tblName)
            console.log("tblName", tblName);
            console.log("selected_pk", selected_pk);
            console.log("data_map", data_map);
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

//=========  HandleEmployeeCodeClicked  ================ PR2020-06-18
    function HandleEmployeeCodeClicked(fldName, el_clicked) {
        console.log("========= HandleEmployeeCodeClicked  ========= ");
        console.log("el_clicked", el_clicked);
        console.log("fldName", fldName);

        let selected_pk = (fldName === "fnc_code") ? selected.functioncode_pk :
                          (fldName === "pdc_code") ? selected.paydatecode_pk : null;
        const tblName = (fldName === "fnc_code") ? "wagecode" :
                        (fldName === "pdc_code") ? "paydatecode" : null;
        const key_str = (fldName === "fnc_code") ? "fnc" : null;
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
                console.log("tblName", tblName);
                console.log("selected_pk", selected_pk);
                console.log("employee_list", employee_list);

                if(employee_list.length){
                    const data_map = get_data_map(tblName)
                    const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, selected_pk)

                    console.log("map_dict", map_dict);
                    payroll_needs_update = true;

                    let upload_dict = {table: "employee",
                                       employee_list: employee_list};
                    upload_dict[tblName] = {pk: selected_pk,
                                            key: key_str,
                                            code: map_dict.code,
                                            update: true};
                    UploadChanges(upload_dict, url_payroll_upload);
                }
















            }
        }
    }  // HandleEmployeeCodeClicked

//=========  SetTickEmployee  ================ PR2020-06-18 PR2020-09-20
    function SetTickEmployee(el_clicked) {
        //console.log("========= SetTickEmployee  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
            let is_selected = (!!get_attr_from_el(tblRow, "data-selected"))
            is_selected = (!is_selected)

            add_or_remove_attr (tblRow, "data-selected", is_selected, true);

            add_or_remove_class(tblRow.cells[0].children[0], "tick_2_2", is_selected, "tick_0_0")
        }
    }  // SetTickEmployee

//###########################################################################
    function AddnewOpen(col_index, el_clicked) {
        if(selected_btn === "abscat") {
            MAC_Open()
        } else if(selected_btn === "functioncode") {
            MFU_Open()
        } else if(selected_btn === "paydatecode") {
            MPP_Open()
        } else if(["wagefactor", "allowance"].indexOf(selected_btn) > -1){
            MWF_Open(true, selected_btn)
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
        console.log( "===== MSPP_BtnSelect ========= ");
        console.log( "selected_period", selected_period);
        console.log( "btn", btn);
        let MSPP_selected_btn = null;
        if(btn){
            MSPP_selected_btn = get_attr_from_el(btn, "data-btn")
        } else if (selected_view){
                MSPP_selected_btn = selected_view;
        } else {
            MSPP_selected_btn = "calendar_period";
        }

        const tblName = (MSPP_selected_btn === "payroll_period") ? "paydatecode" : MSPP_selected_btn;
        mod_MSPP_dict = {sel_view: MSPP_selected_btn,
                        tblName: MSPP_selected_btn,
                        };
        if(MSPP_selected_btn === "calendar_period") {
            mod_MSPP_dict.period_tag = selected_period.period_tag;
            mod_MSPP_dict.period_datefirst = selected_period.period_datefirst;
            mod_MSPP_dict.period_datelast = selected_period.period_datelast;
        } else {
            mod_MSPP_dict.paydatecode_pk = selected_period.paydatecode_pk;  // value '0' is used for blank payrollperiods
            mod_MSPP_dict.paydatecode_caption = selected_period.paydatecode_code;
            mod_MSPP_dict.paydate_iso = selected_period.paydateitem_iso;
            mod_MSPP_dict.paydate_caption = selected_period.paydateitem_code;
        }

        console.log( "mod_MSPP_dict", mod_MSPP_dict);
// ---  highlight selected button
        let btns = document.getElementById("id_MSPP_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_button = get_attr_from_el_str(btn, "data-btn");
            add_or_remove_class(btn, cls_btn_selected, data_button === mod_MSPP_dict.sel_view);
        }
// --- fill select table
         // names of select_table:  calendar_period, paydatecode, paydateitem
         if(mod_MSPP_dict.sel_view === "calendar_period") {
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

        } else if (mod_MSPP_dict.sel_view === "payroll_period"){
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

// --- reset table
        //tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        //tblFoot_datatable.innerText = null

        let payroll_period_dict = {};

        if(mod_MSPP_dict.sel_view === "calendar_period") {
    // ---  get period_tag
            const period_tag = get_dict_value(mod_MSPP_dict, ["period_tag"], "tweek");
    // ---  create upload_dict
            payroll_period_dict = {
                sel_btn: selected_btn,
                sel_view: "calendar_period",
                now: get_now_arr(),
                period_tag: period_tag,
                extend_index: 0,
                extend_offset: 0};
            // only save dates when tag = "other"
            if(period_tag == "other"){
                payroll_period_dict.period_datefirst = el_MSPP_datefirst.value;
                payroll_period_dict.period_datelast = el_MSPP_datelast.value;
            }
        } else if(mod_MSPP_dict.sel_view === "payroll_period") {
            payroll_period_dict = {
                        sel_btn: selected_btn,
                        sel_view: "payroll_period",
                        paydatecode_pk: mod_MSPP_dict.paydatecode_pk,
                        paydatecode_code: mod_MSPP_dict.paydatecode_code,
                        paydateitem_year: mod_MSPP_dict.paydateitem_year,
                        paydateitem_period: mod_MSPP_dict.paydateitem_period,
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

        payroll_hours_from_server = [];
        payroll_alw_from_server = [];
        payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'

        payroll_header_row = []
        payroll_total_row = [];
        payroll_hours_agg_rows = [];
        payroll_hours_detail_rows = [];
        payroll_alw_agg_rows = [];
        payroll_alw_detail_rows = [];

        is_payroll_detail_mode = false;

        UpdateHeaderText();

// hide modal
        $("#id_mod_select_period_paydate").modal("hide");
    }  // MSPP_Save

//=========  MSPP_FillSelectTable  ================ PR2020-06-22
    function MSPP_FillSelectTable(tblName) {
        console.log( "===== MSPP_FillSelectTable ========= ", tblName);
        const tblBody_select = el_MSPP_tblbody;
        tblBody_select.innerText = null;

        if (tblName === "calendar_period") {
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
        console.log( "paydatecode_map", paydatecode_map);
            if(paydatecode_map){
    // --- loop through data_map
                for (const [map_id, map_dict] of paydatecode_map.entries()) {
        console.log( "map_dict", map_dict);
    // --- insert tblBody_select row
                    const tblRow = tblBody_select.insertRow(-1);
                    tblRow.id = map_dict.mapid;
                    tblRow.setAttribute("data-pk", map_dict.id);
                    tblRow.setAttribute("data-ppk", map_dict.comp_id);
                    tblRow.setAttribute("data-value", map_dict.code);  // used in t_Filter_SelectRows
                    add_hover(tblRow);
        console.log( "map_dict.code", map_dict.code);
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
        console.log( "?????????????????? paydateitem_map", paydateitem_map);
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
                        tblRow.setAttribute("data-period", map_dict.period);
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
        console.log( "===== MSPP_SelecttableClicked ========= ");
        //console.log( "tblName", tblName);
        if(tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            if (tblName === "calendar_period") {
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
        console.log( "===== MSPP_SelectItem ========= ", tblName);
        console.log( "tblRow", tblRow);

        const selected_pk = get_attr_from_el(tblRow, "data-pk");
        const selected_ppk = get_attr_from_el_int(tblRow, "data-ppk");
        const selected_caption = get_attr_from_el(tblRow, "data-value");
        const selected_year = get_attr_from_el(tblRow, "data-year");
        const selected_period = get_attr_from_el(tblRow, "data-period");
        const selected_datefirst = get_attr_from_el(tblRow, "data-datefirst");
        const selected_datelast = get_attr_from_el(tblRow, "data-datelast");

        console.log( "selected_pk", selected_pk);
        console.log( "selected_ppk", selected_ppk);
        console.log( "selected_caption", selected_caption);
        console.log( "selected_year", selected_year);
        console.log( "selected_period", selected_period);
        console.log( "selected_datefirst", selected_datefirst);
        console.log( "selected_datelast", selected_datelast);

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
            mod_MSPP_dict.paydateitem_year = (Number(selected_year)) ? Number(selected_year) : null;
            mod_MSPP_dict.paydateitem_period = (Number(selected_period)) ? Number(selected_period) : null;
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

            mod_MSEF_dict.sel_btn = null;
            mod_MSEF_dict.sel_pk = -1;
            mod_MSEF_dict.sel_code = null;
        } else if(key === "allowance") {
        }
// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in period_dict
        let datalist_request = {payroll_period: period_dict, payroll_list: {mode: "get"}};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectAbsenceShowall


//=========  Sidebar_SelectAllowance  ================ PR2021-02-02
    function Sidebar_SelectAllowance(el) {
        console.log( "===== Sidebar_SelectAbsenceShowall ========= ");

        is_period_allowance = (el.value === "allowances")

        const upload_dict = {payroll_period: {isallowance: is_period_allowance}};
        UploadSettings (upload_dict, url_settings_upload);

        ShowSubmenubuttonAfas()

        CreatePayrollTblHeader();
        CreateHTML_list()
        FillPayrollRows();

    }  // Sidebar_SelectAllowance


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
        // dont reset mod_MSEF_dict
        //mod_MSEF_dict = {sel_btn: "employee",
       //                  sel_pk:  -1,  // -1 = all, 0 = shift without emploee
        //                 sel_code: null};
        MSEF_BtnSelect()
// ---  show modal
         $("#id_mod_select_employee_function").modal({backdrop: true});
    }; // MSEF_Open

//=========  MSEF_Save  ================ PR2020-01-29
    function MSEF_Save() {
        //console.log("===  MSEF_Save =========");

        SBR_DisplayEmployeeFunction();

        FillPayrollRows();

// hide modal
        $("#id_mod_select_employee_function").modal("hide");

    }  // MSEF_Save


//=========  MSEF_BtnSelect  ================ PR2020-09-19
    function MSEF_BtnSelect(btn) {
        //console.log( "===== MSEF_BtnSelect ========= ");
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
        const dictlist = (tblName === "functioncode") ? functions_inuse_dictlist : employees_inuse_dictlist

        const tblBody_select = document.getElementById("id_MSEF_tbody_select");
        tblBody_select.innerText = null;

// ---  add All to list when multiple employees / functions exist
        const len = dictlist.length
        if(len){
            const employees_functions = (tblName === "functioncode") ? loc.Functions : loc.Employees;
            const add_all_text = "<" + loc.All + employees_functions.toLowerCase() + ">";
            const add_all_dict = {pk: -1, code: add_all_text};
            MSEF_Create_SelectRow(tblName, tblBody_select, add_all_dict, mod_MSEF_dict.sel_pk)
        }
// ---  loop through dictlist
        for(let i = 0, tblRow, dict; dict = dictlist[i]; i++){
            if (!isEmpty(dict)) {
                MSEF_Create_SelectRow(tblName, tblBody_select, dict, mod_MSEF_dict.sel_pk)
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
        tblRow.addEventListener("click", function() {MSEF_SelectEmployeeFunction(tblRow, event.target)}, false);
    } // MSEF_Create_SelectRow

//========= MSEF_headertext  ============= PR2020-09-19
    function MSEF_headertext(tblName) {
        //console.log( "=== MSEF_headertext  ");
        const label_text = loc.Select + ( (mod_MSEF_dict.sel_btn === "functioncode") ?  loc.Function.toLowerCase() : loc.Employee.toLowerCase() );
        document.getElementById("id_MSEF_header").innerText = label_text
        document.getElementById("id_MSEF_input_label").innerText = label_text

        const placeholder_text = loc.Type_letters_and_select + ( (mod_MSEF_dict.sel_btn === "functioncode") ? loc.a_function : loc.an_employee ) + loc.in__the_list
        document.getElementById("id_MSEF_input").placeholder = placeholder_text
    }  // MSEF_headertext

//=========  MSEF_SelectEmployeeFunction  ================ PR2020-01-09
    function MSEF_SelectEmployeeFunction(tblRow) {
        //console.log( "===== MSEF_SelectEmployeeFunction ========= ");
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

    }  // MSEF_SelectEmployeeFunction

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
        //console.log( "mod_MSEF_dict.sel_btn ",mod_MSEF_dict.sel_btn);
        //console.log( "mod_MSEF_dict.sel_pk ",mod_MSEF_dict.sel_pk);
        //console.log( "mod_MSEF_dict.sel_code ",mod_MSEF_dict.sel_code);

        const label_caption = (mod_MSEF_dict.sel_btn === "functioncode") ? (loc.Function + ":") :
                              (mod_MSEF_dict.sel_btn === "employee") ? (loc.Employee + ":") : (loc.Employee + " / " + loc.Function);
        document.getElementById("id_SBR_label_select_employee").innerText = label_caption;
        let header_text = null;
        if(!mod_MSEF_dict.sel_btn){
           header_text = loc.All + loc.Employees.toLowerCase();
        } else if (mod_MSEF_dict.sel_pk > -1) {
            header_text = mod_MSEF_dict.sel_code;
        } else if(mod_MSEF_dict.sel_btn === "functioncode"){
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
        //const map_dict = get_mapdict_from_datamap_by_id(functioncode_map, map_id )
        const map_dict = get_mapdict_from_datamap_by_id(wagecode_map, map_id )
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
        let upload_dict = {table: "wagecode", key: "fnc", ppk: mod_dict.ppk}
        if (mod_dict.rowindex != null) {upload_dict.rowindex = mod_dict.rowindex}

        let msg_err = null;
        if(mod_dict.create) {
            upload_dict.create = true;
        } else {
            upload_dict.pk = mod_dict.pk;
            if(is_delete) {upload_dict.delete = true}
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
                upload_dict.code = new_value;
                upload_dict.update = true;
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
                console.log("wagecode_map", wagecode_map);
                const new_value_lower = new_value.toLowerCase();
                //for (const [map_id, item_dict] of functioncode_map.entries()) {
                for (const [map_id, item_dict] of wagecode_map.entries()) {
                    const pk_int = item_dict.id;
                    const key_str = item_dict.key;

                    // skip current item, filter wagecodes with key = 'fnc'
                    let show_row = ( (key_str === 'fnc') && (!mod_dict.pk || pk_int !== mod_dict.pk) );
                    if (show_row){
                        const item_code = item_dict.code;

                        if(item_code && item_code.toLowerCase() === new_value_lower){
                            const is_inactive = (item_dict.inactive) ? item_dict.inactive : false
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
            selected.functioncode_pk = (row_pk !== selected.functioncode_pk) ? row_pk : -1
            selected.functioncode_code = null;
            if (selected.functioncode_pk){
                //const data_dict = get_mapdict_from_datamap_by_tblName_pk(functioncode_map, "functioncode", selected.functioncode_pk)
                const data_dict = get_mapdict_from_datamap_by_tblName_pk(wagecode_map, "wagecode", selected.functioncode_pk)
                selected.functioncode_code = data_dict.code;
            }

// --- show tickmark on selected row, hide on other rows
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected.functioncode_pk && row_pk_int === selected.functioncode_pk)
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
        console.log("========= MFU_SetTickmarkNEW  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
            // tblName = wagecode or paydatecode
            const tblName = get_attr_from_el(tblRow, "data-table")
        console.log("tblName", tblName);
// --- deselect row when clicked on selected row
            let selected_row_pk = get_attr_from_el_int(tblRow, "data-pk")

// ---  set selected null when this row is already selected
            if (tblName === "wagecode" ) {
                if (selected.functioncode_pk && selected_row_pk === selected.functioncode_pk) {selected_row_pk = null}
                selected.functioncode_pk = selected_row_pk;
                selected.functioncode_code = null;
                if (selected.functioncode_pk){
                    //const data_dict = get_mapdict_from_datamap_by_tblName_pk(functioncode_map, "functioncode", selected.functioncode_pk)
                const data_dict = get_mapdict_from_datamap_by_tblName_pk(wagecode_map, "wagecode", selected.functioncode_pk)
                    selected.functioncode_code = data_dict.code;
                }
            } else if (tblName === "paydatecode") {
                if (selected.paydatecode_pk && selected_row_pk === selected.paydatecode_pk) {selected_row_pk = null}
                selected.paydatecode_pk = selected_row_pk;
                selected.paydatecode_code = "";
                if (selected.paydatecode_pk){
                    const data_dict = get_mapdict_from_datamap_by_tblName_pk(paydatecode_map, "paydatecode", selected.paydatecode_pk)
                    selected.paydatecode_code = data_dict.code;
                }
            }
        //console.log("new selected.paydatecode_pk: ", selected.paydatecode_pk, typeof selected.paydatecode_pk);
// --- show tickmark on selected row, hide on other rows,
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected_row_pk && row_pk_int === selected_row_pk)
        //console.log("row_pk_int: ", row_pk_int, typeof row_pk_int);
        //console.log("is_selected_row: ", is_selected_row);
                    add_or_remove_class (row, cls_selected, is_selected_row);
                    add_or_remove_class( row.cells[0].children[0], "tick_2_2", is_selected_row, "tick_0_0")
            }}

// --- det header text
            UpdateHeaderText()
        }
    }  // MFU_SetTickmarkNEW


// +++++++++++++++++ MODAL WAGEFACTOR ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MWF_Open  ================ PR2020-07-13 PR2021-01-29
    function MWF_Open(is_addnew, tblName, el_clicked) {
        console.log("========= MWF_Open  ========= ");
        console.log("el_clicked", el_clicked);

// --- get tblName and data_key.
        const key_str = (selected_btn === "wagefactor") ? "wfc" :
                         (selected_btn === "wagecode") ? "wgc" :
                         (selected_btn === "functioncode") ? "fnc" :
                         (selected_btn === "allowance") ? "alw" : null;

// ---  get info from tblRow, is addnew when no tblRow
        const tblRow = get_tablerow_selected(el_clicked);
        console.log("tblRow", tblRow);
        //const is_addnew = (!tblRow);

        const map_id = (tblRow) ? tblRow.id : null;
        const data_map = wagecode_map;
        const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id )
        const fldName = get_attr_from_el(el_clicked, "data-field");

// ---  get info from map_dict
        const pk_int = (!is_addnew) ? map_dict.id : null;
        const ppk_int = (!is_addnew) ? map_dict.comp_id :
                                       get_dict_value(company_dict, ["id", "pk"])
        const code = (!is_addnew) ? map_dict.code : null;
        const description = (!is_addnew) ? map_dict.description : null;
        const wagerate = (!is_addnew) ? map_dict.wagerate : null;
        const is_default = (!is_addnew) ? map_dict.isdefault : false;

        console.log("description", description);
        console.log("wagerate", wagerate);

// ---  create mod_MWF_dict
        mod_MWF_dict = {
            pk: pk_int,
            ppk: ppk_int,
            code: code,
            description: description,
            wagerate: wagerate,
            isdefault: is_default,
            table: tblName,
            key: key_str,
            create: is_addnew,
            mapid: map_id,
            just_opened: true
        }

// ---  put info in input boxes, set focus on selected field
        let has_set_focus = false;

// ---  reset input boxes
        el_MWF_input_code.value = code;
        el_MWF_input_description.value = description;

        const is_percentage = (key_str === "wfc");
        const show_zero = (is_percentage);
        // format_pricerate (user_lang, value_int, is_percentage, show_zero, no_thousand_separators)
        const display = (is_percentage) ? (wagerate) ? wagerate / 10000 : 0 : format_pricerate (loc.user_lang, wagerate, is_percentage, show_zero, true);
        el_MWF_input_wagerate.value = display;
        el_MWF_input_default.checked = is_default;

// ---  set header
        el_MWF_header.innerText = (selected_btn === "wagefactor") ? loc.Wage_component :
                                  (selected_btn === "allowance") ? loc.Allowance : null;
// ---  set label for rate
        el_MWF_label_rate.innerText = (selected_btn === "wagefactor") ? loc.Percentage + ":":
                                      (selected_btn === "allowance") ? loc.Amount + ":" : null;
// ---  show / hide default input and info
        let els = document.getElementById("id_MWF_input_container").querySelectorAll(".tsa_mfw_default")
        const hide = (selected_btn !== "wagefactor");
        for (let i = 0, el; el = els[i]; i++) {
            add_or_remove_class(el, cls_hide, hide)
        }

// ---  set focus on input code, if not set on selected field
        const el_id = (fldName) ? "id_MWF_input_" + fldName : "id_MWF_input_code";
        const el_focus = document.getElementById(el_id);
        if(el_focus) {set_focus_on_el_with_timeout(el_focus, 50)};

// ---  hide delete button when  is_addnew, set caption
        add_or_remove_class(el_MWF_btn_delete, cls_hide, is_addnew);
        el_MWF_btn_delete.innerText = (selected_btn === "wagefactor") ? loc.Delete_wage_component :
                          (selected_btn === "allowance") ? loc.Delete_allowance : null;

// ---  disable save button
        MWF_input_validate();

// ---  show modal
        $("#id_mod_wagefactor").modal({backdrop: true});
    }  // MWF_Open

//=========  MWF_Save  ================ PR2020-07-13 PR2021-01-29
    function MWF_Save(crud_mode) {
        console.log("========= MWF_Save  ========= ");
        console.log("mod_MWF_dict", mod_MWF_dict);

        const is_delete = (crud_mode === "delete")

        const tblRow = document.getElementById(mod_MWF_dict.mapid);

// ---  create upload_dict
        let msg_err = null;
        let upload_dict = {ppk: mod_MWF_dict.ppk, table: "wagecode", key: mod_MWF_dict.key};
        if(mod_MWF_dict.create) {
            upload_dict.create = true;
        } else {
            upload_dict.pk = mod_MWF_dict.pk;
            upload_dict.mapid = mod_MWF_dict.mapid;
        };

        //console.log("mod_MWF_dict", mod_MWF_dict);
        if(is_delete) {
            upload_dict.delete = true;
// ---  make row red when delete, before uploading
            if(tblRow) {
                add_or_remove_class(tblRow, cls_error, true )
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            }
        } else {
// ---  get new_code from input box
            const new_code = el_MWF_input_code.value;
            if (new_code !== mod_MWF_dict.code) {
                upload_dict.code = new_code;
                if(tblRow){
                    const el_div = tblRow.querySelector("[data-field='code']");
                    if(el_div){ el_div.innerText = new_code};
                }
            };
// ---  get new_description from input box
            const new_description = el_MWF_input_description.value;

        console.log("new_description", new_description);
        console.log("mod_MWF_dict.description", mod_MWF_dict.description);

            if (new_description !== mod_MWF_dict.description) {
                upload_dict.description = new_description;
                if(tblRow){
                    const el_div = tblRow.querySelector("[data-field='description']");
                    if(el_div){ el_div.innerText = new_description};
                }
            };
// ---  get new_wagerate from input box
            const input_value = el_MWF_input_wagerate.value
        //console.log("input_value", input_value);
        //console.log("input_value", input_value, typeof input_value);
            // get_number_from_input, function also multiplies input_value by 10000
            const arr = get_number_from_input(loc, mod_MWF_dict.key, input_value);
            // validation took place in MWF_input_keyup
            const new_wagerate = arr[0];
        //console.log("mod_MWF_dict.wagerate", mod_MWF_dict.wagerate);
            if (new_wagerate !== mod_MWF_dict.wagerate) {
                upload_dict.wagerate = new_wagerate;
        //console.log("new_wagerate", new_wagerate);
// ---  put new new_wagerate in el_input before uploading

                if(tblRow){
                    const el_div = tblRow.querySelector("[data-field='wagerate']");
                    if(el_div){
                        const is_percentage = (mod_MWF_dict.key === "wfc");
                        el_div.innerText = format_pricerate (loc.user_lang, new_wagerate, is_percentage, true) // true = show_zero
                    };
                }
            };
         };

// ---  get new_default
        const new_isdefault = el_MWF_input_default.checked;
        //console.log("new_isdefault", new_isdefault);
        if (new_isdefault !== mod_MWF_dict.isdefault) {
            upload_dict.isdefault = new_isdefault;

// ---  refresh isdefault of all rows
            // set isdefault = true in current row, set false in all other rows
            for (let i = 0, item, tblRow; tblRow = tblBody_paydatecode.rows[i]; i++) {
                const el_div = tblRow.cells[4].children[0];
                 if(el_div){
                    const show_tickmark = (tblRow.id === mod_MWF_dict.mapid) ? new_isdefault : false;
                    add_or_remove_class(el_div, "tick_2_2", show_tickmark, "tick_0_0" )
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
                add_or_remove_class(el_div, "tick_2_2", (tblRow.id === mod_MWF_dict.mapid), "tick_0_0" )
                }
            }
        }
    }  // MWF_refresh_isdefault

//=========  MWF_input_validate  ================  PR2020-09-16
    function MWF_input_validate(el_input) {
        console.log(" -----  MWF_input_validate   ----")
        // el_input does not exist when called on open
        let msg_err = null;
        const fldName = get_attr_from_el(el_input, "data-field");
        const tblRow = get_tablerow_selected(el_input)

// --- save btn is disabled on opening of form
        let disable_save_btn = mod_MWF_dict.just_opened;

// --- validate if code is entered, not when just_opened
        if(!mod_MWF_dict.just_opened){
            const new_code = el_MWF_input_code.value;
            if(!new_code){
                msg_err = loc.Wage_component + loc.cannot_be_blank;
            } else {
    // --- validate if code already exists
                const new_code_lc =  new_code.toLowerCase();
                for (const [map_id, map_dict] of wagecode_map.entries()) {
                    // filter key='wfc', skip this wagefactor, skip blank map_dict.code
                    if(map_dict.key === "wfc"){
                        if(map_id !== mod_MWF_dict.mapid && map_dict.code){
                            if( map_dict.code.toLowerCase() === new_code_lc){
                               msg_err = loc.Wage_component + loc.already_exists;
                               break;
                }}}};
            }
        }
// --- show error message
        const el_MWF_err_code = document.getElementById("id_MWF_err_code");
        el_MWF_err_code.innerText = msg_err;
        if(msg_err){disable_save_btn=true}

// --- validate if wagefactor has value,  not when just_opened
        msg_err = null;
        if(!mod_MWF_dict.just_opened){
            const new_wagerate = el_MWF_input_wagerate.value
            // input.value is string, therefore '0' is true. '0' is valid entry
            //if(!new_wagerate){
            //    // amount in allowance can be blank
            //    if (mod_MWF_dict.table === "wagefactor") {
           //         msg_err = loc.Percentage + loc.cannot_be_blank;
           //     }
            //} else {
    // --- validate if wagefactor is valid number
        console.log("new_wagerate: <" + new_wagerate + ">")
                const arr = get_number_from_input(loc, mod_MWF_dict.table, new_wagerate);
                if (arr[1]) { msg_err = (arr[1]) };
            //}
        }
// --- show error message
        const el_MWF_err_wagerate = document.getElementById("id_MWF_err_wagerate");
        el_MWF_err_wagerate.innerText = msg_err;
        if(msg_err){disable_save_btn=true}

// --- disable save btn when error or on open
        el_MWF_btn_save.disabled = disable_save_btn;
// --- set just_opened = false
        mod_MWF_dict.just_opened = false;
    }  // MWF_input_validate

//=========  MWF_Select  ================ PR2020-07-15
    function MWF_Select(el_clicked) {
        //console.log("========= MWF_Select  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
// --- deselect row when clicked on selected row
            const row_pk = get_attr_from_el_int(tblRow, "data-pk")
            selected.wagecode_pk = (row_pk !== selected.wagecode_pk) ? row_pk : null

// --- show tickmark on selected row, hide on other rows
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected.wagecode_pk && row_pk_int === selected.wagecode_pk)
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
        const year_agg = paydatecode_dict.year_agg;

// ---  create mod_dict
        mod_dict = { pk: pk_int, ppk: ppk_int, table: "paydatecode", create: is_addnew,
            code: code, recurrence: recurrence, dayofmonth: dayofmonth, afascode: afascode,
            weekdayindex: weekday_index, referencedate: referencedate_iso,
            datelast_agg: datelast_agg,
            year_agg: year_agg,
            mapid: map_id,
            is_onopen: true };
// ---  get last year from paydateitems, this_year if empty, only used in "irregular"
        let selected_year = (year_agg && year_agg.length) ? year_agg[year_agg.length - 1] : null;
// ---  get mindate and maxdate of selected_year and put them in mod_dict
        MPP_get_min_max_date(selected_year);

                   console.log("is_addnew", is_addnew);
// ---  if is_addnew: calculate code based on default setting
        if (is_addnew) {
            const new_code = MPP_CalculateCode();
            mod_dict.code = new_code;
            el_MPP_input_code.value = new_code;
                   console.log("new_code", new_code);
        }

// ---  set recurrence checkboxes and show/hide input elements
        MPP_SetRecurrence();

// ---  fill select box with weekdays
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
        let upload_dict = {table: "paydatecode"}
        if (mod_dict.rowindex != null) {upload_dict.rowindex = mod_dict.rowindex}
        let has_err_code = false, has_err_referencedate = false, has_err_closingdates = false;
        if(mod_dict.create) {
            upload_dict.ppk = get_dict_value(company_dict, ["id", "pk"])
            upload_dict.create = true;
        } else {
            upload_dict.pk = mod_dict.pk;
            upload_dict.ppk = mod_dict.ppk;
            if(is_delete) {upload_dict.delete = true}
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
                const new_dayofmonth = el_MPP_input_dayofmonth.value;
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
                let year = mod_dict.selected_year;
                let has_closingdates = false;
                const tblBody = document.getElementById("id_MPP_closingdate_tbody")
                for (let i = 0, tblRow; tblRow=tblBody.rows[i]; i++) {
                    const el_input = tblRow.cells[0].children[0];
                    if(el_input && el_input.value){
                        arr_closingdates.push(el_input.value)
                    }
                }
                upload_dict["closingdates"] = {value: arr_closingdates, year: year, update: true}
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

//=========  MPP_Validate  ================  PR2020-07-14 PR2021-02-12
    function MPP_Validate() {
        //console.log(" -----  MPP_Validate   ----")

        let has_err_nocode = false, has_err_referencedate = false, has_err_closingdates = false;
        let has_err_dayofmonth = false;
        const has_afascode = (!!mod_dict.afascode);

// ---  hide delete button when is_addnew
        add_or_remove_class(el_MPP_btn_delete, cls_hide, mod_dict.create)

        const code = mod_dict.code;
        has_err_nocode = (!code);

        let paydate_iso = mod_dict.referencedate;
        let weekday_index = null, date = null;

        if(["biweekly","weekly"].indexOf(mod_dict.recurrence) > -1 ){
            has_err_referencedate = (!mod_dict.referencedate);

        } else if (mod_dict.recurrence === "monthly"){
            has_err_dayofmonth = ( !mod_dict.dayofmonth || !Number(mod_dict.dayofmonth) || (mod_dict.dayofmonth > 31) || mod_dict.dayofmonth < 1);

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

        const has_error = (has_afascode || has_err_nocode || has_err_dayofmonth || has_err_referencedate || has_err_closingdates);

        const el_MPP_msg_code = document.getElementById("id_MPP_msg_code")
        const msg_text = (has_afascode) ? loc.payrollperiod_is_imported : (has_err_nocode) ? loc.No_description_entered : loc.can_leave_description_blank;
        el_MPP_msg_code.innerText = msg_text;
        add_or_remove_class (el_MPP_msg_code, "text-danger", (has_afascode || has_err_nocode), "text-muted");

        const el_MPP_dayofmonth_01 = document.getElementById("id_MPP_dayofmonth_01");
        const el_MPP_dayofmonth_02 = document.getElementById("id_MPP_dayofmonth_02");
        el_MPP_dayofmonth_01.innerText = (has_err_dayofmonth) ? loc.Closingdate_isnot_valid : loc.Closingdate_willbe_onthisday_everymonth;
        add_or_remove_class (el_MPP_dayofmonth_01, "text-danger", has_err_dayofmonth, "text-muted");
        add_or_remove_class (el_MPP_dayofmonth_02, cls_hide, has_err_dayofmonth);

        const el_MPP_msg_biweekly = document.getElementById("id_MPP_msg_biweekly")
        el_MPP_msg_biweekly.innerText = (has_err_referencedate) ? loc.No_closing_date_entered : loc.Closingdate_willbe_every_other_week
        add_or_remove_class (el_MPP_msg_biweekly, "text-danger", has_err_referencedate, "text-muted");

        const el_MPP_year_msg = document.getElementById("id_MPP_msg_year")
        el_MPP_year_msg.innerText = (has_err_closingdates) ? loc.No_closing_dates_entered : loc.Select_year_and_enter_closingdates;
        add_or_remove_class (el_MPP_year_msg, "text-danger", has_err_closingdates, "text-muted");

// disable input elements when has_afascode
        el_MPP_input_code.readOnly = has_afascode;
        el_MPP_input_dayofmonth.readOnly = has_afascode;
        el_MPP_input_weekday.readOnly = has_afascode;
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
        console.log(" -----  MPP_InputChanged   ----")
        const fldName = get_attr_from_el(el_clicked, "data-field")
        //console.log("fldName", fldName)

        if (["monthly", "biweekly", "weekly", "irregular"].indexOf(fldName) > -1){
            const recurrence_has_changed = MPP_SetRecurrence(el_clicked);
            if (recurrence_has_changed){
                const new_code = MPP_CalculateCode(fldName, mod_dict.referencedate);
                el_MPP_input_code.value = new_code;
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
        // ---  get mindate and maxdate of selected_year
                const selected_year = (Number(el_clicked.value)) ? Number(el_clicked.value) : null
        // ---  get mindate and maxdate of selected_year and put them in mod_dict
                MPP_get_min_max_date(selected_year);
        // ---  fill table with closin dates
                MPP_FillClosingdateRows();
        }
        // MPP_CalculateCode creates codes based on mod_dict values
// don't calculate code when input_code has changed, it will undo manually changed code
        // TODO : validate unique, add get_paydatecode_with_sequence, enable validate unique on server
        if (fldName === "code"){
            mod_dict.code = el_clicked.value;
        } else {
            mod_dict.code = MPP_CalculateCode();
            el_MPP_input_code.value = mod_dict.code;
        }
        MPP_Validate();
    }  // MPP_InputChanged

//=========  MPP_get_min_max_date  ================  PR2021-02-12
    function MPP_get_min_max_date(selected_year) {
        //console.log(" -----  MPP_get_min_max_date   ----")
// get mindate and maxdate of selected_year
        if(!selected_year) { selected_year = get_now_arr()[0] };

        mod_dict.selected_year = selected_year;
        mod_dict.selected_year_firstday = selected_year.toString() + "-01-01";
        //PR2021-02-12 set last allowed day on January 31st next year, so last period can end in next year
        const next_year = mod_dict.selected_year + 1;
        mod_dict.selected_year_nextyearJan31 = next_year.toString() + "-01-31";
    }  // MPP_get_min_max_date

//=========  MPP_SetInputElements  ================ PR2020-06-20
    function MPP_SetInputElements() {
        //console.log("========= MPP_SetInputElements  ========= ");
        //console.log("mod_dict", mod_dict);

        el_MPP_input_code.value = mod_dict.code;
        el_MPP_input_dayofmonth.value = mod_dict.dayofmonth;

        el_MPP_input_weekday.value = mod_dict.weekdayindex;
        el_MPP_input_year.value = mod_dict.selected_year;

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

//========= MPP_FillClosingdateRows  ====================================
    function MPP_FillClosingdateRows() {
        console.log( "===== MPP_FillClosingdateRows  === ");

// ---  reset tblBody closingdate
        const is_disabled = (!!mod_dict.afascode)
        const tblName = "closingdate"
        const tblBody = document.getElementById("id_MPP_closingdate_tbody")
        tblBody.innerText = null

       console.log( "mod_dict.selected_year", mod_dict.selected_year);

// loop through year_agg of paydatecode
        const datelast_list = mod_dict.datelast_agg
        const year_list = mod_dict.year_agg
        if(mod_dict.year_agg){
            for (let i = 0, year; year = mod_dict.year_agg[i]; i++) {
                if (year === mod_dict.selected_year) {
                    const datelast_iso = mod_dict.datelast_agg[i]
                    const order_by = null, employee_pk = null, key_str = null;
                    const tblRow = CreateTblRow(tblBody, tblName, key_str, null, null, null, order_by, employee_pk, -1, is_disabled)

                    const el_input = tblRow.cells[0].children[0]
                    el_input.value = datelast_iso;
                    el_input.min = mod_dict.selected_year_firstday;
                    el_input.max =  mod_dict.selected_year_nextyearJan31;
                    el_input.readOnly = is_disabled;
                    // dont use UpdateTblRow(tblRow, item_dict)

                }  // if (year === mod_dict.selected_year) {
            };  // for (let i = 0,
       }  // if(mod_dict.year_agg){

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
        console.log("MPP_AddClosingdate");
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

// set date of the new item
        console.log("datelast_max", datelast_max);
        if (datelast_max){
            const paydate_max_JS = get_dateJS_from_dateISO (datelast_max)
            //get next_date = same day on next month, but Aug 31 returns Oct 1.
            // correct if the next month is more than 1 month later
            next_dateJS = new Date(paydate_max_JS.getFullYear(), paydate_max_JS.getMonth() + 1, paydate_max_JS.getDate());
            if(next_dateJS.getMonth() > 1 + paydate_max_JS.getMonth() ){
                next_dateJS = get_nextmonth_lastJS_from_dateJS(paydate_max_JS)
            }
           next_date_ISOString = get_dateISO_from_dateJS(next_dateJS);
            console.log("next_date_ISOString", next_date_ISOString);
        } else {
        // if no dates yet: fill in January 31
            next_dateJS = new Date(mod_dict.selected_year, 0, 31);
            next_date_ISOString = get_dateISO_from_dateJS(next_dateJS)
            console.log("if no dates yet next_date_ISOString", next_date_ISOString);
        }
        console.log("mod_dict.selected_year_firstday", mod_dict.selected_year_firstday);
        console.log("mod_dict.selected_year_nextyearJan31", mod_dict.selected_year_nextyearJan31);
        console.log("next_date_ISOString", mod_dict.next_date_ISOString);
        // make next day = null when not within this year
        if (next_date_ISOString < mod_dict.selected_year_firstday ||
            next_date_ISOString > mod_dict.selected_year_nextyearJan31 ) {
            next_date_ISOString = null
            console.log("next_date_ISOString = null", next_date_ISOString);
        }

        console.log("next_date_ISOString", next_date_ISOString);

// add new row
        const pk_int = null, ppk_int = null;
        const order_by = null, employee_pk = null, is_disabled = false, key_str = null;
        const tblName = "closingdate"
        const tblRow = CreateTblRow(tblBody, tblName, key_str, null, pk_int, ppk_int, order_by, employee_pk, -1, is_disabled)

        const el_input = tblRow.cells[0].children[0]
//el_input.value = get_dict_value(item_dict, ["datelast", "value"]);
        el_input.value = next_date_ISOString;
        el_input.min = mod_dict.selected_year_firstday;
        el_input.max = mod_dict.selected_year_nextyearJan31;
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

        el_MPP_input_code.readOnly = has_afascode;
        el_MPP_input_dayofmonth.readOnly = has_afascode;
        el_MPP_input_weekday.readOnly = has_afascode;

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
        console.log("========= MEP_Open  ========= ");
        const emplhour_pk = get_attr_from_el_int(tr_clicked, "data-pk");
        const is_absence = !!get_attr_from_el_int(tr_clicked, "data-isabsence");
        mod_dict = {}
        if(emplhour_pk){

            is_payroll_detail_modal_mode = true;

            let upload_dict = {table: "emplhour", emplhour_pk: emplhour_pk};
            UploadChanges(upload_dict, url_payroll_upload);
    // --- UploadChanges continues with MEP_FillLogTable(emplhourlog_list) and MEP_SetInputElements(emplhour_dict);

            MEP_ResetInputElements(is_absence);

    // --- show loader
            el_MEP_loader.classList.remove(cls_hide)

    // ---  show modal
            $("#id_mod_emplhour_payroll").modal({backdrop: true});
        }
    }  // MEP_Open


//=========  MEP_Save  ================ PR2020-09-06
    function MEP_Save(tr_clicked) {
        console.log("========= MEP_Save  ========= ");
        // TODO enable updating abscat and wagecode
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
        if(mod_dict.selected.employee_pk){upload_dict.employee = {pk: mod_dict.selected.employee_pk, field: "employee", update: true}};
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


        console.log("new_value_str", new_value_str);
        console.log("new_value_int", new_value_int);
        console.log("old_wagefactor_pk", old_wagefactor_pk);
        console.log("new_value_int", new_value_int);

        if(new_value_int === -1){
            new_wagefactor_pk = 0;  // reset wagefactor_pk
        } else if (new_value_int === 0){
            new_wagefactor_pk = 0;  // reset wagefactor_pk
        } else if (new_value_int > 0){
            new_wagefactor_pk = new_value_int
        }

        console.log("new_value_int", new_value_int);

        if (new_wagefactor_pk !== old_wagefactor_pk){
            const pk = (new_wagefactor_pk) ? new_wagefactor_pk : null;
            upload_dict.wagefactorcode = {pk: pk, update: true};
        }

        console.log("upload_dict", upload_dict);
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
        el_MEP_btn_log.classList.add(cls_hide);
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
        el_MEP_loader.classList.add(cls_hide)

    // ---  set header text
        let header_text = ( (emplhour_dict.isabsence) ? loc.Absence : loc.Roster_shift ) + loc.of_withspaces;
        header_text += (emplhour_dict.employeecode) ? emplhour_dict.employeecode : loc.No_employee_entered;
        header_text += "\n" + format_dateISO_vanilla (loc, emplhour_dict.rosterdate, false, true);
        if(emplhour_dict.c_o_code) { header_text += " - " + emplhour_dict.c_o_code };
        if(emplhour_dict.shiftcode) { header_text += "  " + emplhour_dict.shiftcode };

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
        const modified_text = loc.Last_modified_by + username + loc._on_

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

        const filter_key = (tblName === "functioncode") ? "fnc" :
                      (tblName === "wagefactor") ? "wfc" : null;
        if (data_map.size){
        //--- loop through data_map or data_dict
            for (const [map_id, map_dict] of data_map.entries()) {
                const map_key = (map_dict.key) ? map_dict.key : null;
                const show_row = (!filter_key || filter_key === map_key)
                if (show_row){
                    const code = (tblName === "abscat") ? map_dict.o_code : map_dict.code;
                    if (!map_dict.inactive || map_dict.id === selected_pk) {
                        option_text += "<option value=\"" + map_dict.id + "\">" + code + "</option>";
                }
        }}};
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
        console.log( "===== MEP_FillLogTable ========= ");
        const tblBody_select = document.getElementById("id_MEP_tblbody");
        tblBody_select.innerText = null;

        console.log( "emplhourlog_list", emplhourlog_list);
// --- create header row
        if(emplhourlog_list && emplhourlog_list.length){

            // show btn log when there are log records
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
        el_MEP_btn_log.innerText = (is_not_hidden) ? loc.Show_logfile : loc.Hide_logfile;

        add_or_remove_class(log_container, cls_hide, is_not_hidden )
    }  // MEP_ShowLog



//=========  MEP_TimepickerOpen  ================ PR2020-11-29
    function MEP_TimepickerOpen(el_input) {
        console.log("=== MEP_TimepickerOpen ===");
       // called by 'tblRow', MRE (splittime), MRO (offsetstart, offsetend, breakduration, timeduration)
// ---  create tp_dict
        // minoffset = offsetstart + breakduration
        let is_locked = false, is_confirmed = false, rosterdate = null, offset = null;
        let is_restshift = false, fldName = null;
        let offset_value = null, offset_start = null, offset_end = null, break_duration = 0, time_duration = 0;
        let show_btn_delete = true;  // offsetsplit is required
        let map_id = null, pk_int = null, ppk_int = null, tblName = "emplhour";
            rosterdate = mod_dict.rosterdate;
            offset_start = mod_dict.offsetstart;
            offset_end = mod_dict.offsetend;
            break_duration = mod_dict.breakduration;
            time_duration = mod_dict.timeduration;
            fldName = "timeduration";
            offset_value = time_duration;



        // When split absence the break_duration is deducted from offsetend when firstpart is absence,
        //   from  offsetstart when lastpart is absence PR2020-10-03

        const minoffset = get_minoffset(fldName, offset_start, break_duration)
        const maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)

        let tp_dict = {table: tblName,  // used in TimepickerResponse
                       field: fldName,  // used in TimepickerResponse
                       mapid: map_id,
                       pk: pk_int,
                       ppk: ppk_int,
                       rosterdate: rosterdate,
                       offset: offset_value,
                       minoffset: minoffset,
                       maxoffset: maxoffset,
                       isampm: (loc.timeformat === 'AmPm'),
                       quicksave: is_quicksave}

// ---  create st_dict
        const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ? loc.Working_hours : null;
                               //(["offset_split_before", "offset_split_after"].indexOf(fldName) > -1) ? loc.Split_time : "";
        let st_dict = { url_settings_upload: url_settings_upload,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete};

        //console.log("fldName", fldName)
        //console.log("txt_dateheader", txt_dateheader)
        //console.log("st_dict", st_dict)

        //console.log("mod_dict", deepcopy_dict(mod_dict));
        //console.log("tp_dict", deepcopy_dict(tp_dict));

// ---  open ModTimepicker
            mtp_TimepickerOpen(loc, el_input, MEP_TimepickerResponse, tp_dict, st_dict)

    };  // MEP_TimepickerOpen

//========= MEP_TimepickerResponse  ============= PR2019-10-12
    function MEP_TimepickerResponse(tp_dict) {
        //console.log(" === MEP_TimepickerResponse ===" );
        //console.log("tp_dict", tp_dict);
        //console.log("mod_dict", deepcopy_dict(mod_dict));

        // new value of quicksave is uploaded to server in ModTimepicker
        if("quicksave" in tp_dict) {is_quicksave = tp_dict.quicksave};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = tp_dict.field;
console.log( "fldName: ", fldName);

// ---  get new value from tp_dict
            let new_offset = get_dict_value(tp_dict, ["offset"])
console.log( "new_offset: ", new_offset);

// ---  calculate timeduration and min max
            const shift_dict = mtp_calc_timeduration_minmax(loc, fldName, new_offset,
                                            mod_dict.shift_code,
                                            mod_dict.offsetstart,
                                            mod_dict.offsetend,
                                            mod_dict.breakduration,
                                            mod_dict.timeduration)

// ---  put new value in variable
            if (["offset_split_before", "offset_split_after"].indexOf(fldName) > -1) {
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

// set forcus to btn save in modal MRE
            if(tp_dict.page === "MRE"){ el_MRE_btn_save.focus() }

        //console.log("end mod_dict", deepcopy_dict(mod_dict));
        }  // if("save_changes" in tp_dict) {
     }  //MEP_TimepickerResponse


// +++++++++++++++++ MODAL ABSENCE CATEGORY ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MAC_Open  ================ PR2020-06-09
    function MAC_Open(col_index, el_clicked) {
        console.log("========= MAC_Open  ========= ");
        //console.log("el_clicked", el_clicked);

        const field_names = field_settings.abscat.field_names;
        console.log("field_names", field_names);

// ---  get name of selected field - to set focus to input_el
        let sel_fldName = get_attr_from_el(el_clicked, "data-field")
        console.log("sel_fldName", sel_fldName);

        const tblRow = get_tablerow_selected(el_clicked);
        const is_addnew = (!tblRow);
        let abscat_dict = {};

// ---  get abscat_dict from abscat_map
        mod_MAC_dict = {};
        if(is_addnew) {
            mod_MAC_dict = {
                table: "abscat",
                create: true
            }
        } else {
            const map_id = tblRow.id;
            abscat_dict = get_mapdict_from_datamap_by_id(abscat_map, map_id)
            console.log("abscat_dict", abscat_dict);

    // ---  create mod_MAC_dict
            // abscatdict contains saved values
            mod_MAC_dict = {
                table: "abscat",
                pk: abscat_dict.id,
                ppk: abscat_dict.c_id,
                mapid: map_id,
                colindex: col_index,
                abscatdict: abscat_dict // abscatdict contains saved values
            }
        }
        console.log("mod_MAC_dict ", mod_MAC_dict);

// ---  put abscat_code in header
        const header_text = (mod_MAC_dict.o_code) ? loc.Absence_category + ": " + mod_MAC_dict.o_code : loc.Absence_category;
        document.getElementById("id_MAC_hdr_abscat").innerText = header_text;

// ---  fill input textboxes
        let el_focus = null;
        for (let i = 0, el; el = el_MAC_input_els[i]; i++) {
            const field = get_attr_from_el(el, "data-field");
            el.value = (mod_MAC_dict.abscatdict && mod_MAC_dict.abscatdict[field]) ? mod_MAC_dict.abscatdict[field] : null;
            if (sel_fldName && field === sel_fldName){ el_focus = el};
        };

// ---  fill no hours checkboxes.
        console.log("...........mod_MAC_dict.abscatdict ", mod_MAC_dict.abscatdict);
        for (let i = 0, el; el = el_MAC_nohours_checked_els[i]; i++) {
            const field = get_attr_from_el(el, "data-field");
            // function FillOptions filters wagecode_map rows by key='wfc'
            el.checked = (mod_MAC_dict.abscatdict && mod_MAC_dict.abscatdict[field]) ? mod_MAC_dict.abscatdict[field] : false;
            // dont set focus
        }

// ---  fill wagefactor select options. t_FillOptionsAbscatFunction is also used for functioncodes
        let has_wfc_value = false, has_wfc_satsunph = false;
        for (let i = 0, el; el = wfc_input_select_els[i]; i++) {
            const field = get_attr_from_el(el, "data-field");
            const wfc_value = (mod_MAC_dict.abscatdict && mod_MAC_dict.abscatdict[field]) ? mod_MAC_dict.abscatdict[field] : null;
            if(wfc_value) {
                has_wfc_value = true;
                if(["wfc_onsat","wfc_onsun", "wfc_onph"].indexOf(field) > -1) { has_wfc_satsunph = true};
            };
            // function FillOptions filters wagecode_map rows by key='wfc'
            t_FillOptionsAbscatFunction(loc, "wagefactor", el, wagecode_map, wfc_value);
            if (sel_fldName && field === sel_fldName){ el_focus = el};
        }
// set focus on input element that was clicked in tblRow, on input_code when new
        set_focus_on_el_with_timeout(el_focus, 50);

// ---  show wagefactor box
        MAC_WfcShow(null, has_wfc_value)
        MAC_WfcDiffChange(null, has_wfc_satsunph);

// ---  hide delete abscat button when is_addnew
        if(is_addnew){el_MAC_btn_delete.classList.add(cls_hide)};
// ---  disable btn_save
        el_MAC_btn_save.disabled = true;

// ---  show modal
        $("#id_mod_abscat").modal({backdrop: true});
    } // MAC_Open

//=========  MAC_Save  ================ PR2020-06-10
    function MAC_Save(crud_mode) {
        console.log("========= MAC_Save  ========= ");
        console.log(" mod_MAC_dict", mod_MAC_dict)

        const is_delete = (crud_mode === "delete")
        const tblName = 'abscat';
// ---  create upload_dict
        let upload_dict = {isabsence: true, table: tblName, rowindex: mod_MAC_dict.rowindex};
        if(mod_MAC_dict.create) {
            upload_dict.create = true;
        } else {
            upload_dict.pk = mod_MAC_dict.pk;
            upload_dict.ppk = mod_MAC_dict.ppk;
            if(is_delete) {upload_dict.delete = true}
        };

/*
const mapped_abscat_fields = {o_code: "code", o_identifier: "identifier", o_sequence: "sequence", o_nopay: "nopay",
               o_nowd: "nohoursonweekday", o_nosat: "nohoursonsaturday",
               o_nosun: "nohoursonsunday", o_noph: "nohoursonpublicholiday",
               wfc_onwd: "wagefactorcode", wfc_onsat: "wagefactoronsat",
               wfc_onsun: "wagefactoronsun", wfc_onph: "wagefactoronph",
               o_inactive: "inactive"}
*/


// ---  put changed values in upload_dict and change them in mod_MAC_dict (to diplay in tblrow before upload)
        // mod_MAC_dict.value is the changed value, mod_MAC_dict.abscatdict.value is the original value
        for (const [fldName, dbField] of Object.entries(mapped_abscat_fields)) {
            if (fldName in mod_MAC_dict){
                // save when no old value or new value different from old value
                if (!mod_MAC_dict.abscatdict || mod_MAC_dict[fldName] !== mod_MAC_dict.abscatdict[fldName]){
                    upload_dict[dbField] = {value: mod_MAC_dict[fldName], update: true}
                }
            }
        };
        if(is_delete){
// ---  make row red when delete, before uploading
            let tblRow = document.getElementById(mod_MAC_dict.mapid);
            if(tblRow){ShowClassWithTimeout(tblRow, cls_error)};
        } else {
// ---  update tblRow before UploadChanges
            refresh_tblRowNEW(tblName, mod_MAC_dict, abscat_map, false, false, true); //  is_created, is_deleted, skip_show_ok
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
            msg_err = validate_blank_unique_text(loc, abscat_map, "abscat", fldName, el_clicked.value, mod_MAC_dict.pk, true);
        } else if(fldName === "o_sequence"){
            // no validation needed. Input is number with min=0, max=999 and step = 1
            const arr = get_number_from_input(loc, fldName, el_clicked.value)
            msg_err = arr[1];
        }
        const el_err = document.getElementById("id_MAC_err_" + fldName)
        if(el_err){ el_err.innerText = msg_err}

        el_MAC_btn_save.disabled = (!!msg_err);
    }  // MAC_validate_and_disable


//========= MAC_WfcShow  ============= PR2021-01-28 PR2021-02-15
    function MAC_WfcShow(el_header, has_wfc_value) {
        //console.log( "=== MAC_WfcShow ");

        let show_wfc = false;
        if(el_header){
// ---  when clicked on header: toggle display_hide
            show_wfc = el_wfc_container.classList.contains("display_hide");
        } else {
// ---  when opening MAC form, el_header is undefined: show wagefactors when there are non-null wagefactor fields
            show_wfc = !!has_wfc_value;
        }
// ---  if not show_wfc: hide container with wfc input boxes and container with checkbox
        add_or_remove_class(el_wfc_container, "display_hide", !show_wfc)
        add_or_remove_class(el_wfc_checkbox_container, "display_hide", !show_wfc)
// ---  change caption of wfc_header
        const caption =  (show_wfc) ? loc.Wage_component : loc.Wage_component;
        el_wfc_header.innerHTML = caption.bold()
    };  //  MAC_WfcShow

//========= MAC_WfcDiffChange  ============= PR2021-01-28
    function MAC_WfcDiffChange(el_clicked, has_wfc_satsunph) {
        console.log(" -----  MAC_WfcDiffChange   ----")
        console.log( "el_clicked", el_clicked);
        console.log( "has_wfc_satsunph", has_wfc_satsunph);
        // if called by MAC_Open: el_clicked = undefined > set checked=true when any of dthe diff fields contain value
        // else: called by checkbox el_wfc_checkbox_diff: get value from checkbox

        let checked = false;
        if (el_clicked){
            checked = el_clicked.checked;
            if (!checked){
                // set value of onsat, unsun, onph to null when el_wfc_checkbox_diff is set to 'false'
                for (let i = 0, el; el = wfc_input_select_els[i]; i++) {
                    // skip wfc 'Weekdays'
                    if ( get_attr_from_el(el, "data-field") !== "wfc_onwd") {
                        el.value = null
                    };
                    // also remove values in mod_MAC_dict
                    delete mod_MAC_dict.wfc_onsat;
                    delete mod_MAC_dict.wfc_onsun;
                    delete mod_MAC_dict.wfc_onph;
                }
            }
        } else {
            // called by MAC_Open: el_clicked = undefined
            checked = !!has_wfc_satsunph;
            // set checkbox checked
            el_wfc_checkbox_diff.checked = checked
        }
        console.log( "checked", checked);
        // hide label 'Weekdays' when checked = false;
        add_or_remove_class(el_wfc_onwd_label, "display_hide", !checked)

        // hide checkboxes onsat, unsun, onph  when checked = false;, skip wfc 'Weekdays'
        let wfc_satsunph_els = el_wfc_container.querySelectorAll(".wfc_satsunph");
        for (let i = 0, el; el = wfc_satsunph_els[i]; i++) {
            add_or_remove_class(el, "display_hide", !checked)
        };
    } //  MAC_WfcDiffChange

//========= MAC_InputKeyup  ============= PR2021-02-15
    function MAC_InputKeyup(el) {
        console.log( "=== MAC_InputKeyup ");
        const fldName = get_attr_from_el(el, "data-field");
        if(fldName === "o_sequence"){
            mod_MAC_dict[fldName] = (Number(el.value)) ? Number(el.value) : 0;
        } else {
            mod_MAC_dict[fldName] = (el.value) ? el.value : null;
        }
        mod_MAC_dict.values_changed = true;
    }  // MAC_InputKeyup

//========= MAC_NohoursChange  ============= PR2021-02-15
    function MAC_NohoursChange(el) {
        //console.log( "=== MAC_NohoursChange ");
        const fldName = get_attr_from_el(el, "data-field");
        mod_MAC_dict[fldName] = (!!el.checked);
        mod_MAC_dict.values_changed = true;
    }  // MAC_NohoursChange

//========= MAC_WfcInputChange  ============= PR2021-02-15
    function MAC_WfcInputChange(el) {
        //console.log( "=== MAC_WfcInputChange ");
        const fldName = get_attr_from_el(el, "data-field");
        mod_MAC_dict[fldName] = (Number(el.value)) ? Number(el.value) : null;
        mod_MAC_dict.values_changed = true;
    }  // MAC_WfcInputChange


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
        const len = (loc.payroll_columns_list) ? loc.payroll_columns_list.length : 0
        for (let j = 0, tblRow, td, tuple, data_tag, caption; j < len; j++) {
            tuple = loc.payroll_columns_list[j];
            const data_tag = (tuple[0]) ? tuple[0] : null
            const caption = (tuple[1]) ? tuple[1] : null
            const is_hidden = (data_tag && col_hidden.includes(data_tag));
//+++ insert tblRow into tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            tblRow.setAttribute("data-selected", (is_hidden) ? 0 : 1 );
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModColumns_SelectColumn(tblRow);}, false )
    //- add hover to tableBody row
            add_hover(tblRow)

            td = tblRow.insertCell(-1);
            let el_div = document.createElement("div");
                const class_text = (is_hidden) ? "tick_0_0" : "tick_2_2";
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
                    add_or_remove_class(el, "tick_2_2", !!new_value, "tick_0_0")
                }
            }
            el_modcolumns_btn_save.disabled = false;
        }
    }  // ModColumns_SelectColumn


// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2020-06-10 PR2020-09-14
    function ModConfirmOpen(crud_mode, el_input) {
        console.log(" -----  ModConfirmOpen   ----")
        console.log("crud_mode", crud_mode)
        console.log("el_input", el_input)
        console.log("selected_btn", selected_btn)
        // called by menubutton 'delete or tblRow btn inactive
        // used in submenu_delete (el_input = undefined) and abscat UploadToggle
        const is_delete = (crud_mode === "delete");
        const is_set_inactive = (crud_mode === "inactive");
        let show_modal = is_delete;
        mod_dict = {};

// ---  get map_id form tblRow.id or selected_pk
       // const tblName = selected_btn;
        let tblRow = get_tablerow_selected(el_input);
        const tblName = get_attr_from_el(tblRow, "data-table")
        const key_str = selected_key; // selected_key gets value in HandleBtnSelect from selected_btn
        const selected_pk = get_selected_pk();
        const map_id = (tblRow) ? tblRow.id : get_map_id(tblName, selected_pk);

        console.log("tblRow", tblRow)
        console.log("tblName", tblName)
        console.log("selected_pk", selected_pk)
        console.log("map_id", map_id)
        console.log("map_id", map_id)

// ---  when clicked on delete button in submenu there is no tblRow, use selected_pk instead
        if(!tblRow){tblRow = document.getElementById(map_id)};

        let header_txt = null, msg01_txt = null, msg02_txt = null
        let hide_btn_save = false, btn_save_caption = null, btn_cancel_caption = loc.No_cancel;
        if(!tblRow){
            msg01_txt = get_msg_txt_please_select();

            hide_btn_save = true;
            btn_cancel_caption = loc.Close;
            show_modal = true;
        } else {
            const data_map = get_data_map(tblName)
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
            mod_dict = {
                pk: map_dict.id,
                mapid: map_id,
                table: tblName,
                key: key_str,
                mode: crud_mode};
            let code = null, description = "";
            if (tblName === "abscat")  {
                mod_dict.ppk = map_dict.c_id;
                mod_dict.isabsence = true;
                code = map_dict.o_code;
            } else {
                mod_dict.ppk = map_dict.comp_id;
                code = map_dict.code;
                description = map_dict.description;
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
            msg01_txt = get_msg_txt_willbe_madeinctive_or_deleted(tblName, key_str, code, description, is_delete);
            msg02_txt = loc.Do_you_want_to_continue;
            btn_save_caption =  (is_delete) ? loc.Yes_delete : loc.Yes_make_inactive;
        }
// +++  set header text
        header_txt = get_ModConfirm_header_txt(tblName, key_str, is_delete);
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
        console.log("===  ModConfirmSave  =====") ;
        console.log("mod_dict", mod_dict) ;
        $("#id_mod_confirm").modal("hide");

        const tblName = mod_dict.table;

        let upload_dict = {
            pk: mod_dict.pk,
             ppk: mod_dict.ppk,
             table: mod_dict.table,
             key: mod_dict.key,
             mapid: mod_dict.mapid
          };

        if(mod_dict.isabsence) {
            upload_dict.id.isabsence = true;
        }
        if(mod_dict.mode === "delete") {
            upload_dict.id.delete = true;
        } else if (mod_dict.mode === "inactive") {
            upload_dict.inactive = true;
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


//========= get_tblBody  ========  PR2021-03-01
    function get_tblBody(tblName, key_str){
        let tblBody = null;
        if (tblName === "employee") {
            tblBody = tblBody_employee
        } else if (tblName === "paydatecode") {
            tblBody = tblBody_paydatecode
        } else if (tblName === "wagecode") {
            tblBody = tblBody_paydatecode;
        } else {
            tblBody = tblBody_datatable;
        }
        return tblBody;
    }  // get_tblBody


//========= get_data_map  ======== PR2020-09-14 PR2021-02-12
    function get_data_map(tblName) {

        const data_map = (tblName === "wagecode") ? wagecode_map :
                         (tblName === "wagefactor") ? wagecode_map :
                         (tblName === "functioncode") ? wagecode_map :
                         (tblName === "paydatecode") ? paydatecode_map :
                         (tblName === "abscat") ? abscat_map :
                         (tblName === "employee") ? employee_map : null;
        return data_map;
    };
//========= get_selected_pk  ======== PR2020-09-14 PR2021-02-03
    function get_selected_pk() {
        let selected_pk = null;
        if(["wagecode", "wagefactor", "allowance", "functioncode"].indexOf(selected_btn) > -1){
            selected_pk = selected.wagecode_pk;
        } else if (selected_btn === "paydatecode"){
            selected_pk = selected.paydatecode_pk;
        } else if (selected_btn === "abscat"){
            selected_pk = selected.abscat_pk;
        }
        return  selected_pk;
    };

//========= get_msg_txt_please_select  ======== PR2020-09-14  PR2021-02-03
    function get_msg_txt_please_select() {
        const msg_txt = (selected_btn === "wagecode") ? loc.Please_select_salaryscale_first :
                 (selected_btn === "wagefactor") ? loc.Please_select_wagecomponent_first :
                 (selected_btn === "allowance") ? loc.Please_select_allowance_first :
                 (selected_btn === "functioncode") ? loc.Please_select_function_first :
                 (selected_btn === "paydatecode") ? loc.Please_select_payrollperiod_first :
                 (selected_btn === "abscat") ? loc.Please_select_abscat_first : null;
        return  msg_txt;
    };
//========= get_msg_txt_willbe_madeinctive_or_deleted  ======== PR2020-09-14  PR2021-02-03
    function get_msg_txt_willbe_madeinctive_or_deleted(tblName, key_str, code, description, is_delete) {

        let code_text = (code) ? code : "---"
        if (description) { code_text += " " + description };
        let msg_txt = (selected_btn === "paydatecode") ? loc.Payroll_period :
                        (selected_btn === "abscat") ? loc.Absence_category :
                        (selected_btn === "wagecode") ? loc.Salary_scale :
                        (selected_btn === "wagefactor") ? loc.Wage_component :
                        (selected_btn === "allowance") ? loc.allowance :
                        (selected_btn === "functioncode") ? loc.Function : loc.This_item;

        return msg_txt + " '" +  code_text + "' " + ( (is_delete) ? loc.will_be_deleted : loc.will_be_made_inactive  );
    };
//========= get_ModConfirm_header_txt  ======== PR2020-09-14  PR2021-02-11
    function get_ModConfirm_header_txt(tblName, key_str, is_delete) {
        console.log("--- get_ModConfirm_header_txt ---");
        console.log("tblName", tblName);
        console.log("key_str", key_str);
        console.log("is_delete", is_delete);

        const header_text = (selected_btn === "paydatecode") ? (is_delete) ? loc.Delete_payrollperiod : loc.Make_payrollperiod_inactive :
        (selected_btn === "abscat") ? (is_delete) ? loc.Delete_abscat : loc.Make_abscat_inactive :
        (selected_btn === "wagecode") ? (is_delete) ? loc.Delete_salaryscale : loc.Make_salaryscale_inactive :
        (selected_btn === "wagefactor") ? (is_delete) ? loc.Delete_wage_component : loc.Make_wage_component_inactive :
        (selected_btn === "allowance") ? (is_delete) ? loc.Delete_allowance : loc.Make_allowance_inactive :
        (selected_btn === "functioncode") ? (is_delete) ? loc.Delete_function : loc.Make_function_inactive : null;

        return  header_text;
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
// NIU PR2021-01-30
/*
    function refresh_datamap_itemXXX(data_map, update_dict, skip_show_ok) {
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
            const field_names = field_settings[selected_btn].field_names;
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
            tblRow = CreateTblRow(tblBody, tblName, key_str, null, pk_int, ppk_int, order_by, employee_pk, row_index, is_disabled)

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
                            UpdateField(tblName, el, update_dict, skip_show_ok)
                        }
                    }
                }
            }
        }
    }  // refresh_datamap_item
*/
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
            let filename = (selected_btn === "btn_payroll_agg") ? loc.Overview_rosterhours_per_category : loc.Overview_rosterhours;
            if (is_payroll_detail_mode) { filename += " " + selected.employee_code }
            if (selected.paydateitem_iso) { filename += " " + selected.paydateitem_iso }
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
        if (selected_btn === "btn_payroll_agg"){
            detail_rows = (is_payroll_detail_mode) ? payroll_hours_detail_rows : payroll_hours_agg_rows
        } else if(selected_btn === "btn_payroll_detail"){
            detail_rows = payroll_hours_detail_rows
        }
        //console.log("detail_rows", detail_rows)
        // sel_view is 'calendar_period' or 'payroll_period'
        const is_period_view = get_dict_value(selected_period, ["sel_view"]) === "calendar_period"
        let ws = {};

// --- title row
        let title =  (selected_btn === "btn_payroll_agg") ? loc.Overview_rosterhours_per_category : loc.Overview_rosterhours
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
                ws["B5"] = {v: selected.detail_employee_code , t: "s"};

                ws["A6"] = {v: loc.Period + ":", t: "s"};
                ws["B6"] = {v: display_period, t: "s"};
            } else {
                ws["A5"] = {v: loc.Period + ":", t: "s"};
                ws["B5"] = {v: display_period , t: "s"};
            }
        } else {
            if (is_payroll_detail_mode){
                ws["A5"] = {v: loc.Employee + ":", t: "s"};
                ws["B5"] = {v: selected.detail_employee_code , t: "s"};
                ws["A6"] = {v: loc.Payroll_period + ":", t: "s"};
                ws["B6"] = {v: selected_period.paydateitem_peiod, t: "s"};
            } else {
                ws["A5"] = {v: selected.paydatecode_code, t: "s"};
                ws["A6"] = {v: selected.paydateitem_code , t: "s"};
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
