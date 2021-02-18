// PR2019-6-16 PR2020-08-25
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        // <PERMIT> PR2020-11-03
        // - page can be viewed and edited by planner or accman or sysadmin
        // - when perm_customers and/or perm_orders have value (regardless of permissions):
        //   - import customers not allowed
        //   - add / delete customers not allowed
        //   - add / delete orders only allowed
        //     - customer of the new order is in the list of perm_customers
        //     - and this customer has no orders in  list of perm_orders
        //     - note: when req_user has both perm_customers and a perm_orders,
        //     - only orders can be added when perm_customer has no perm_orders.

        // permits get value when setting_dict is downloaded
        let permit_add_edit_delete_import_customers = false;
        let permit_add_edit_delete_orders = false;
        let perm_customers = [];  // list of allowed customers of request_user PR2020-11-03
        let perm_orders = [];  // list of allowed orders of request_user PR2020-11-03

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
        const url_customer_upload = get_attr_from_el(el_data, "data-customer_upload_url");
        const url_pricerate_upload = get_attr_from_el(el_data, "data-pricerate_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

// ---  id of selected customer
        const id_sel_prefix = "sel_";
        let selected_customer_pk = 0;
        let selected_order_pk = 0;

        let selected_period = {};
        let selected_calendar_period = {};

        let selected_btn = "customer";

        let company_dict = {};
        let customer_map = new Map();
        let order_map = new Map();

        let scheme_map = new Map();
        let schemeitem_map = new Map();

        let shift_map = new Map();
        let team_map = new Map();

        let teammember_map = new Map();
        let employee_map = new Map();
let planning_list = [] // for export and printing - can replace map?
        let calendar_map = new Map();
        let planning_customer_map = new Map();
        let planning_employee_map = new Map();

        let MSO_grid_teams_dict = {}

// for report
        let planning_display_duration_total = ""; // stores total hours, calculated when creating planning_customer_map
        let print_planning_after_download = false;
// ---  variables for print planning PR2020-11-04
        let employee_planning_sorted_list = []
        let employee_planning_customer_dictlist = {}
        let employee_planning_order_dictlist = {}
        let employee_planning_selected_customer = null;  // null = all, -1 = no employee
        let employee_planning_selected_order = null;  // null = all, -1 = no employee
        let employee_planning_selected_employee_pk = null;
        let employee_planning_selected_employee_code = "";

        let planning_agg_dict = {};
        let planning_orders_sorted = [];

// locale_dict with translated text
        let loc = {};

        let mod_dict = {};

        let mod_employee_dict = {}; // only used for mod employee form
        let quicksave = false

        let filter_select = "";
        let filter_dict = {};
        let filter_inactive = true;
        let filter_mod_employee = "";

        const field_settings = {
            customer: { tbl_col_count: 5,
                field_caption: ["", "Short_name", "Customer_name", "Identifier", ""],
                field_names:  ["select", "code", "name", "identifier", "inactive"],
                filter_tags: ["select", "text", "text", "text", "inactive"],
                field_width: ["016", "180", "220", "120", "032"],
                field_align:  ["c", "l", "l", "l", "r"]
                },
            order: { tbl_col_count: 8,
                field_caption: ["", "Customer", "Order_code", "Order_name", "Start_date", "End_date", "Identifier", ""],
                field_names: ["select", "c_code", "code", "name", "datefirst", "datelast", "identifier", "inactive"],
                filter_tags: ["select","input", "input", "input", "input", "input", "input", "inactive"],
                field_width: ["016", "180", "180", "180", "120", "120", "120", "032"],
                field_align: ["c", "l", "l","l", "l", "l", "l", "r", "r"]
                },
            teammember: { tbl_col_count: 6,
                field_caption: ["", "Employee", "Start_date", "End_date", "Replacement_employee"],
                field_names: ["select", "employee", "datefirst", "datelast", "replacement", "delete"],
                filter_tags: ["select","div", "input", "input", "div", "a"],
                field_width: ["016", "150", "150", "150", "150", "032"],
                field_align:  ["c", "l", "l", "l", "l", "r"]
                },
            planning: { tbl_col_count: 8,
                field_caption: ["", "Customer", "Order", "Employee", "Date", "Shift", "Start_Endtime", "Working_hours"],
                field_names: ["select", "customer", "order", "employee", "rosterdate", "shift", "offsetstart", "timeduration"],
                filter_tags: ["select","input", "input", "input", "input", "input", "input", "input"],
                field_width: ["016", "120", "120", "180", "120", "120", "120", "090"],
                field_align: ["c", "l", "l", "l", "l", "l", "l", "r"]
                }
            }

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");

        let tblBody_select_customer = document.getElementById("id_tbody_select_customer");
        let tblBody_select_order = document.getElementById("id_tbody_select_order");

        let el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// === reset filter when clicked on Escape button === or  on sidebar_showall
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });
        document.getElementById("id_sidebar_showall").addEventListener("click", function() {HandleSidebarShowall()}, false)

// ---  buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn, false)}, false )
        }

// ---  create EventListener for buttons in calendar (goto prev week, this week, nextweek)
        btns = document.getElementById("id_btns_calendar").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnCalendar(data_btn)}, false )
        }

// ===================== EVENT HANDLERS FOR MODAL ===================================
// ---  MODAL FORM CUSTOMER
        let form_elements = document.getElementById("id_MFC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("keyup", function(event){
                    setTimeout(function() {MFC_validate_and_disable(el)}, 150)});
        }
        const el_MFC_btn_save = document.getElementById("id_MFC_btn_save");
            el_MFC_btn_save.addEventListener("click", function() {MFC_Save("save")}, false );
        const el_MFC_btn_delete = document.getElementById("id_MFC_btn_delete");
            el_MFC_btn_delete.addEventListener("click", function() {MFC_Save("delete")}, false )

// ---  MODAL FORM ORDER ------------------------------------
        const el_MFO_tblbody_select = document.getElementById("id_MFO_tblbody_select");
        const el_MFO_input_customer = document.getElementById("id_MFO_input_customer")
            el_MFO_input_customer.addEventListener("focus", function() {MFO_OnFocus("MFO", "customer")}, false )
            el_MFO_input_customer.addEventListener("keyup", function(){
                setTimeout(function() {MFO_InputKeyup("MFO", "customer", el_MFO_input_customer)}, 50)});
        const el_MFO_input_code = document.getElementById("id_MFO_code")
             el_MFO_input_code.addEventListener("change", function() {MFO_validate_and_disable(el_MFO_input_code)}, false )
        const el_MFO_input_name = document.getElementById("id_MFO_name")
             el_MFO_input_name.addEventListener("change", function() {MFO_validate_and_disable(el_MFO_input_name)}, false )
        const el_MFO_input_identifier = document.getElementById("id_MFO_identifier")
             el_MFO_input_identifier.addEventListener("change", function() {MFO_validate_and_disable(el_MFO_input_identifier)}, false )
        const el_MFO_input_datefirst = document.getElementById("id_MFO_datefirst")
             el_MFO_input_datefirst.addEventListener("change", function() {MFO_validate_and_disable(el_MFO_input_datefirst)}, false )
        const el_MFO_input_datelast = document.getElementById("id_MFO_datelast")
             el_MFO_input_datelast.addEventListener("change", function() {MFO_validate_and_disable(el_MFO_input_datelast)}, false )
        const el_MFO_btn_delete = document.getElementById("id_MFO_btn_delete")
            el_MFO_btn_delete.addEventListener("click", function() {ModConfirmOpen("delete", "order")}, false )
        const el_MFO_btn_save = document.getElementById("id_MFO_btn_save")
            el_MFO_btn_save.addEventListener("click", function() {MFO_Save("save")}, false )


// ---  MOD SHIFT ------------------------------------
        let el_modshift_btn_save = document.getElementById("id_MOS_btn_save");
            el_modshift_btn_save.addEventListener("click", function() {MSO_Save("save")}, false );
        let el_modshift_btn_delete = document.getElementById("id_MOS_btn_delete");
            el_modshift_btn_delete.addEventListener("click", function() {MSO_Save("delete")}, false );
        let el_MSO_btn_shiftadd = document.getElementById("id_MOS_btn_shiftadd");
            el_MSO_btn_shiftadd.addEventListener("click", function() {MSO_ShiftAdd()}, false );
        let el_MSO_btn_shiftdelete = document.getElementById("id_MOS_btn_shiftdelete");
            el_MSO_btn_shiftdelete.addEventListener("click", function() {MSO_ShiftDelete()}, false );
        let el_MSO_btn_teamadd = document.getElementById("id_MOS_btn_teamadd");
            el_MSO_btn_teamadd.addEventListener("click", function() {MSO_TeamAdd()}, false );
        let el_MSO_btn_teamdelete = document.getElementById("id_MOS_btn_teamdelete");
            el_MSO_btn_teamdelete.addEventListener("click", function() {MSO_TeamDelete()}, false );


        let el_MSO_cycle = document.getElementById("id_MOS_scheme_cycle")
            el_MSO_cycle.addEventListener("change", function() {MSO_SchemeCycleChanged()}, false );
        let el_MSO_scheme_datefirst = document.getElementById("id_MOS_scheme_datefirst")
            el_MSO_scheme_datefirst.addEventListener("change", function() {MSO_SchemeDateChanged("datefirst")}, false );
        let el_MSO_scheme_datelast = document.getElementById("id_MOS_scheme_datelast")
            el_MSO_scheme_datelast.addEventListener("change", function() {MSO_SchemeDateChanged("datelast")}, false );
        // select buttons
        document.getElementById("id_MOS_btn_shift").addEventListener("click", function() {MSO_BtnSelectClicked("mod_shift")}, false );
        document.getElementById("id_MOS_btn_team").addEventListener("click", function() {MSO_BtnSelectClicked("mod_team")}, false );
        document.getElementById("id_MOS_btn_scheme").addEventListener("click", function() {MSO_BtnSelectClicked("mod_scheme")}, false );
        // input elements
        let el_MSO_teamcode = document.getElementById("id_MOS_teamcode");
            el_MSO_teamcode.addEventListener("change", function() {MSO_ShiftcodeOrTeamcodeChanged(el_MSO_teamcode)}, false)
        let el_MSO_selectteam = document.getElementById("id_MOS_selectteam")
            el_MSO_selectteam.addEventListener("change", function() {MSO_SelectTeamChanged(el_MSO_selectteam)}, false)

        let el_MSO_shiftcode = document.getElementById("id_MOS_shiftcode");
            el_MSO_shiftcode.addEventListener("change", function() {MSO_ShiftcodeOrTeamcodeChanged(el_MSO_shiftcode)}, false)
        let el_MSO_selectshift = document.getElementById("id_MOS_selectshift")
            el_MSO_selectshift.addEventListener("change", function() {MSO_SelectShiftChanged(el_MSO_selectshift)}, false)

        let el_MSO_offsetstart = document.getElementById("id_MOS_input_offsetstart")
            el_MSO_offsetstart.addEventListener("click", function() {MSO_TimepickerOpen(el_MSO_offsetstart, "modshift")}, false );
        let el_MSO_offsetend = document.getElementById("id_MOS_input_offsetend");
            el_MSO_offsetend.addEventListener("click", function() {MSO_TimepickerOpen(el_MSO_offsetend, "modshift")}, false );
        let el_MSO_breakduration = document.getElementById("id_MOS_input_breakduration");
            el_MSO_breakduration.addEventListener("click", function() {MSO_TimepickerOpen(el_MSO_breakduration, "modshift")}, false );
        let el_MSO_timeduration = document.getElementById("id_MOS_input_timeduration");
            el_MSO_timeduration.addEventListener("click", function() {MSO_TimepickerOpen(el_MSO_timeduration, "modshift")}, false );
        let el_MSO_isrestshift = document.getElementById("id_MOS_restshift");
            el_MSO_isrestshift.addEventListener("change", function() {MSO_RestshiftClicked()}, false );

        let el_MSO_excl_ph = document.getElementById("id_MOS_publicholiday");
            el_MSO_excl_ph.addEventListener("change", function() {MSO_PublicholidayChanged("excl_ph")}, false );
        let el_MSO_also_ph = document.getElementById("id_MOS_also_ph");
            el_MSO_also_ph.addEventListener("change", function() {MSO_PublicholidayChanged("also_ph")}, false );
        let el_MSO_excl_ch = document.getElementById("id_MOS_companyholiday");
            el_MSO_excl_ch.addEventListener("change", function() {MSO_PublicholidayChanged("excl_ch")}, false );

// ---  MOD EMPLOYEE ------------------------------------
        let el_modemployee_body = document.getElementById("id_ModSelEmp_select_employee_body");
        document.getElementById("id_MSE_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() { MSE_FilterEmployee("filter", event.key)}, 50)});

        document.getElementById("id_ModSelEmp_btn_save").addEventListener("click", function() {MSE_Save("update")}, false);
        document.getElementById("id_MSE_btn_remove").addEventListener("click", function() {MSE_Save("delete")}, false);

// ---  MOD PERIOD ------------------------------------
// buttons in  modal period
        document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
        document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

// ---  MOD CONFIRM ------------------------------------
// ---  save button in ModConfirm
        let el_confirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_confirm_btn_save.addEventListener("click", function() {ModConfirmSave()});

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {

    // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                // don't reset selected_customer_pk or  selected_order_pk
                DeselectHighlightedRows(tr_selected)
            }
        }, false);

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_cust"));

        // TODO to be changed
        const customer_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_shifts_without_employee: true
        };

// ---  download settings and datalists
        const now_arr = get_now_arr();
        const datalist_request = {
            setting: {page_customer: {mode: "get"},
                      selected_pk: {mode: "get"}},
            locale: {page: "customer"},
            quicksave: {mode: "get"},
            planning_period: {now: now_arr},
            calendar_period: {now: now_arr},
            company: {value: true},
            customer_rows: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_rows: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            scheme: {istemplate: false, inactive: null},
            schemeitem: {customer_pk: selected_customer_pk},
            shift: {istemplate: false},
            team: {istemplate: false},
            teammember_list: {datefirst: null, datelast: null, employee_nonull: false},
            employee_list: {inactive: null},

            customer_planning: customer_planning_dict,
            //employee_planningNEW: {mode: "get"}
        };
        DatalistDownload(datalist_request, "DOMContentLoaded");

//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++
//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        console.log("datalist_request: ", datalist_request)

// ---  show loader
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
                console.log(response);
                if ("locale_dict" in response) {
                    loc = response.locale_dict;
                    CreateTblModSelectPeriod();
                }
                // setting_dict must come after locale_dict, where weekday_list is loaded
                if ("setting_dict" in response) {
                    UpdateSettings(response.setting_dict)
                    CreateSubmenu();
                };
                if ("quicksave" in response) {quicksave = get_dict_value(response, ["quicksave", "value"], false)};
                if ("planning_period" in response){selected_period = response.planning_period};
                if ("calendar_period" in response){
                    selected_calendar_period = get_dict_value_by_key(response, "calendar_period");
                    selected_calendar_period["calendar_type"] = "customer_calendar";
                    // dont show period in calendar header
                    // was: document.getElementById("id_calendar_hdr_text").innerText = display_planning_period (selected_calendar_period, loc);
                }
// --- refresh maps and fill tables
                refresh_maps(response);
// --- hide loader
                el_loader.classList.add(cls_visible_hide)
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
            }
        });  // $.ajax({
}

//=========  refresh_maps  ================ PR2020-01-03
    function refresh_maps(response) {
        //console.log ("===== refresh_maps ==== ")

        if ("company_dict" in response) {company_dict = response.company_dict};
        if ("customer_rows" in response) {refresh_datamap(response.customer_rows, customer_map, "customer")};
        if ("order_rows" in response) {refresh_datamap(response.order_rows, order_map, "order")};
        if ("employee_rows" in response) {refresh_datamap(response.employee_rows, employee_map, "employee")};
        if ("abscat_rows" in response) {refresh_datamap(response.abscat_rows, abscat_map, "abscat")}
        if ("shift_rows" in response) {refresh_datamap(response.shift_rows, shift_map, "shift")};

        if ("customer_listXX" in response) {
            refresh_datamap(response["customer_list"], customer_map)

            let tblHead = document.getElementById("id_thead_select");
            const filter_ppk_int = null, filter_include_inactive = true, addall_to_list_txt = null, row_count = {};
            const filter_show_inactive = true, filter_include_absence = false, filter_istemplate = false;

            const imgsrc_default = imgsrc_inactive_grey;
            const imgsrc_default_header = imgsrc_inactive_lightgrey;
            const imgsrc_default_black = imgsrc_inactive_black;
            const imgsrc_hover = imgsrc_inactive_black;
            const header_txt = null;
            t_Fill_SelectTable(tblBody_select_customer, tblHead, customer_map, "customer", selected_customer_pk, null,
                HandleSelect_Filter, HandleFilterInactive, HandleSelect_Row, HandleSelectRowButton, false,
                filter_ppk_int, filter_show_inactive, filter_include_inactive,
                filter_include_absence, filter_istemplate, addall_to_list_txt,
                cls_bc_lightlightgrey, cls_bc_yellow, cls_hover,
                imgsrc_default, imgsrc_default_header, imgsrc_default_black, imgsrc_hover,
                header_txt, loc.Click_show_inactive_customers);
            t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive);

            //t_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);  // false = no ppk_filter


            document.getElementById("id_sidebar_showall").classList.remove(cls_hide)

        }
        if ("order_listXX" in response) {
            refresh_datamap(response["order_list"], order_map);
            let tblHead = document.getElementById("id_thead_select");
            const filter_ppk_int = null, filter_include_inactive = true, addall_to_list_txt = null;
            const filter_show_inactive = true, filter_include_absence = false, filter_istemplate = false;

            const imgsrc_default = imgsrc_inactive_grey;
            const imgsrc_default_header = imgsrc_inactive_lightgrey;
            const imgsrc_default_black = imgsrc_inactive_black;
            const imgsrc_hover = imgsrc_inactive_black;
            const header_txt = null;
            t_Fill_SelectTable(tblBody_select_order, tblHead, order_map, "order", selected_order_pk, false,
                HandleSelect_Filter, HandleFilterInactive, HandleSelect_Row,  HandleSelectRowButton, false,
                filter_ppk_int, filter_show_inactive, filter_include_inactive,
                filter_include_absence, filter_istemplate, addall_to_list_txt,
                cls_bc_lightlightgrey, cls_bc_yellow, cls_hover,
                imgsrc_default, imgsrc_default_header, imgsrc_default_black, imgsrc_hover,
                header_txt, loc.Click_show_inactive_orders);
            const has_rows_arr = t_Filter_SelectRows(tblBody_select_order, null, filter_show_inactive, true, selected_customer_pk);

            if ( !!has_rows_arr[0] && ["calendar", "planning"].indexOf(selected_btn) > -1){
                document.getElementById("id_div_tbody_select_order").classList.remove(cls_hide)
            } else {
                document.getElementById("id_div_tbody_select_order").classList.add(cls_hide)
            };

            FillTblRows();

            UpdateHeaderText();
        }

        if ("scheme_list" in response) {refresh_datamap(response["scheme_list"], scheme_map)}

        if ("team_list" in response) {refresh_datamap(response["team_list"], team_map)}
        if ("teammember_list" in response) {refresh_datamap(response["teammember_list"], teammember_map)}
        if ("schemeitem_list" in response) {refresh_datamap(response["schemeitem_list"], schemeitem_map)}

        if ("customer_planning_list" in response) {
            // customer_planning_list is used for PDF planning (teammembers are grouped by team)

            const duration_sum = refresh_datamap(response["customer_planning_list"], planning_customer_map)
            planning_display_duration_total = display_duration (duration_sum, loc.user_lang)
            if(print_planning_after_download){
                print_planning_after_download = false;
                PrintPlanning(true)  // true: dont_download to prevent loop
            }
        }

        if ("employee_planning_list" in response) {
            //console.log ("...................===== employee_planning_list in response ==== ")
            // employee_planning_list is used in table and Excel (each teammember on a separate row)
            refresh_datamap(response["employee_planning_list"], planning_employee_map)
            //FillTblRows();

            //t_Filter_TableRows(tblBody_datatable, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);
        }

        //------------- employee_planning_list  -----------------------
        if ("employee_planning_listNEW" in response) {
           const employee_planning_listNEW = response["employee_planning_listNEW"]
        //console.log ("employee_planning_listNEW", employee_planning_listNEW)

// ---  convert dictionary to array  PR2020-10-26
            // not necessary, is already array
            //const planning_short_arr = Object.values(employee_planning_listNEW);

            planning_agg_dict = r_calc_customerplanning_agg_dict(loc, employee_planning_listNEW, company_dict, selected_period)

// ---  sort array with sort and b_comparator_code PR2020-10-26
            employee_planning_sorted_list = employee_planning_listNEW.sort(b_comparator_c_o_code);

        //console.log ("employee_planning_sorted_list", employee_planning_sorted_list)
        //console.log ("===== refresh_maps ==== ")
            //const planning_agg_list = calc_planning_agg_dict(employee_planning_sorted_list);
            //CreateHTML_planning_agg_list(planning_agg_list);
            //CreateHTML_planning_detail_list(employee_planning_sorted_list);
        }


        if ("customer_calendar_list" in response) {
            //console.log ("===== refresh_datamap(response[customer_calendar_list] ==== ")
            refresh_datamap(response["customer_calendar_list"], calendar_map)
            //console.log("calendar_map", calendar_map )
            UpdateHeaderText();
            CreateCalendar("order", selected_calendar_period, calendar_map, MSO_Open, loc, timeformat, user_lang);
        };

        // ---  always call HandleBtnSelect here, to unhide selected table
        HandleBtnSelect();  // true = skip_upload

        //console.log( " UpdateSettings HandleBtnCalendar ====");
        //HandleBtnCalendar("thisweek")
    }  // refresh_maps

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25 PR2020-08-25
    function HandleBtnSelect(data_btn) {
        console.log( "===== HandleBtnSelect ========= ");

        // btns are: 'customer', 'oder', 'calendar, 'planning'
        const skip_upload = !data_btn;

        // data_btn has value when called by button, in that case: upload settings
        if(data_btn){
            selected_btn = data_btn;
// ---  upload new selected_btn, not after loading page (then skip_upload = true)
            const upload_dict = {planning_period: {sel_btn: selected_btn}};
            UploadSettings (upload_dict, url_settings_upload);
        } else {
// ---  get sel_btn from selected_period, if not found: default is 'customer'
            selected_btn = (selected_period.sel_btn)  ? selected_period.sel_btn : "customer" ;
        }

// ---  highlight selected button
        let btn_container = document.getElementById("id_btn_container");
        highlight_BtnSelect(btn_container, selected_btn)

// ---  show / hide submenu btns add/delet customer / order
        const el_submenu_customer_add = document.getElementById("id_submenu_customer_add");
        const el_submenu_customer_delete = document.getElementById("id_submenu_customer_delete");
        const el_submenu_order_add = document.getElementById("id_submenu_order_add");
        const el_submenu_order_delete = document.getElementById("id_submenu_order_delete");

        // button does not exist when no permit_add_edit_delete_import_customers or permit_add_edit_delete_orders
        const hide_btn_customer = (selected_btn !== "customer" || !permit_add_edit_delete_import_customers)
        const hide_btn_order = (selected_btn !== "order" || !permit_add_edit_delete_orders)
        add_or_remove_class(el_submenu_customer_add, cls_hide, hide_btn_customer)
        add_or_remove_class(el_submenu_customer_delete, cls_hide, hide_btn_customer)
        add_or_remove_class(el_submenu_order_add, cls_hide, hide_btn_order)
        add_or_remove_class(el_submenu_order_delete, cls_hide, hide_btn_order)

// ---  show / hide elements of selected button
        show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn)

// ---  update header text -- >  cant update header text until customer- and order_map are filled
        UpdateHeaderText();

        // PR2020-04-12 debug. gives error when clicked on button while loc not downloaded yet. !isEmpty(loc) added.
    // ---  show orderlist in selecttable when clicked on planning, otherwise: customer_list


        if (["customer", "order"].indexOf(selected_btn) > -1 ) {
// ---  fill datatable
            CreateTblHeader(selected_btn);
            FillTblRows();

           // if (selected_btn === "order")
            // ---  update addnew row: put pk and ppk of selected customer in addnew row of tBody_order
                //dont: selected_customer has no value yet
                //UpdateAddnewRow_Order();
        } else if (selected_btn === "calendar" && !skip_upload) {
            if(skip_upload){
                // create emptyy calendar when skip_upload
                UpdateHeaderText();
                CreateCalendar("order", selected_calendar_period, calendar_map, MSO_Open, loc, timeformat, user_lang);
            } else {
            // ---  upload new selected_btn
            document.getElementById("id_tbody_calendar").innerText = null;

            let datalist_request = {customer_calendar: {
                                        order_pk: selected_order_pk},
                                        calendar_period: selected_calendar_period
                                    };

            //DatalistDownload(datalist_request, "Handle_Btn_Select calendar");
            }

        } else if (selected_btn === "planning" && !skip_upload) {
        console.log( ">>>>>>>>>>>>>>> DatalistDownload_Planning: ", skip_upload);

            DatalistDownload_Planning("Handle_Btn_Select planning");
        }

// ---  show / hide submenu print planning and Excel
        const hide_submenu_print_planning = (["calendar", "planning"].indexOf(selected_btn) === -1);
        let el_submenu_print_planning = document.getElementById("id_submenu_customer_planning_print")
        let el_submenu_exportExcel = document.getElementById("id_submenu_customer_exportExcel")
        if (el_submenu_print_planning) { add_or_remove_class(el_submenu_print_planning, cls_hide, hide_submenu_print_planning ) };
        if (el_submenu_exportExcel) { add_or_remove_class(el_submenu_exportExcel, cls_hide, hide_submenu_print_planning ) };

    }  // HandleBtnSelect

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)

// ---  get map_dict and tblName
        const map_dict = get_mapdict_from_tblRow(tr_clicked)
        const tblName = (map_dict.mapid) ? map_dict.mapid.split("_")[0] : null;
        const pk_int = map_dict.id;
        console.log( "map_dict: ", map_dict);
        console.log( "tblName: ", tblName);
        console.log( "pk_int: ", pk_int);

        if (tblName === "customer"){
// ---  update selected_customer_pk
            selected_customer_pk = map_dict.id
            selected_order_pk = null;
// ---  highlight row in select table
            const row_id = id_sel_prefix + tblName + "_" + selected_customer_pk.toString();
            let selectRow = document.getElementById(row_id);

            HighlightSelectRow(tblBody_select_customer, selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

        } else if (tblName === "order"){
            const pk_str = get_attr_from_el(tr_clicked, "data-customer_pk");
            selected_order_pk = pk_int;
            selected_customer_pk = map_dict.c_id
        };

// ---  update header text
        UpdateHeaderText();

// --- save selected_customer_pk in Usersettings ( UploadSettings at the end of this function)
        const upload_dict = {selected_pk: {sel_customer_pk: selected_customer_pk, sel_order_pk: selected_order_pk}};
        UploadSettings (upload_dict, url_settings_upload);

    };  // HandleTableRowClicked

//=========  DatalistDownload_Planning ================ PR2020-01-20
    function DatalistDownload_Planning(called_by) {
        console.log( "===== DatalistDownload_Planning  ========= ", called_by);

        const now_arr = get_now_arr();
        const planning_period = {mode: "get", now: now_arr};
        const customer_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_shifts_without_employee: true
        };
        const employee_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_shifts_without_employee: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };

        document.getElementById("id_hdr_text").innerText = loc.Period + "..."
        tblBody_datatable.innerText = null;

        let datalist_request = {planning_period: planning_period,
                                customer_planning: customer_planning_dict,
                                employee_planning: employee_planning_dict,
        };
        DatalistDownload(datalist_request, "DatalistDownload_Planning > " + called_by);
    }  // DatalistDownload_Planning

//=========  HandleSelect_Row ================ PR2019-08-28
    function HandleSelect_Row(sel_tr_clicked, event_target) {
        //console.log( "===== HandleSelect_Row  ========= ");
        //console.log( "sel_tr_clicked: ", sel_tr_clicked);
        // event_target is the element that triggered this event:
        // selectRow contains customers, in calendar mod it contains orders

        if(!!sel_tr_clicked) {
//check if clicked on inactive/ delete button
            if (!!event_target && ["IMG", "A"].indexOf(event_target.nodeName) > -1){
                HandleSelectRowButton(event_target)
            } else {
                let update_needed = false;
// ---  get map_dict
                const tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
                const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
                const map_id = get_map_id(tblName, pk_str);
                // function 'get_mapdict_from_tblRow.....' returns empty dict if map or key not exist.
                const map_dict = get_mapdict_from_tblRow(sel_tr_clicked)
// ---  update selected_customer_pk
                let sel_cust_pk = 0, sel_cust_ppk = 0, sel_cust_code = "", sel_order_pk = 0, sel_order_code = "";
                if (tblName === "customer"){
                    sel_cust_pk = get_dict_value(map_dict, ["id", "pk"], 0);
                    sel_cust_ppk = get_dict_value(map_dict, ["id", "ppk"]);
                    sel_cust_code = get_dict_value(map_dict, ["code", "value"]);
// --- deselect selected_order_pk when selected customer changes
                    if(sel_cust_pk !== selected_customer_pk){
                        selected_customer_pk = sel_cust_pk
                        selected_order_pk = 0;
                        update_needed = true;
                    }
                } else{
                    sel_cust_pk = get_dict_value(map_dict, ["id", "ppk"], 0);
                    sel_order_pk = get_dict_value(map_dict, ["id", "pk"], 0);
                    sel_cust_code = get_dict_value(map_dict, ["customer", "code"]);
                    sel_order_code = get_dict_value(map_dict, ["code", "value"]);

                    if(sel_cust_pk !== selected_customer_pk || sel_order_pk !== selected_order_pk){
                        selected_customer_pk = sel_cust_pk
                        selected_order_pk = sel_order_pk;
                        update_needed = true;
                        if(sel_cust_pk !== selected_customer_pk) {
                            // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
                            ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey, false, sel_tr_clicked, cls_bc_yellow);
                        }
                        if(sel_order_pk !== selected_order_pk) {
                            // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
                            ChangeBackgroundRows(tblBody_select_order, cls_bc_lightlightgrey, false, sel_tr_clicked, cls_bc_yellow);
                        }
                    }
                }
                let tblBody_select = sel_tr_clicked.parentNode;
                // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
                ChangeBackgroundRows(tblBody_select, cls_bc_lightlightgrey, false, sel_tr_clicked, cls_bc_yellow);
                ChangeBackgroundRows(tblBody_select, cls_bc_lightlightgrey, false, sel_tr_clicked, cls_bc_yellow);

                if(update_needed){

    // ---  update customer_calendar
            // ---  highlight row in tblBody
                    if(selected_btn === "customer"){
                    // reset filter tBody_customer
                        //t_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);

                        let tblRow = t_HighlightSelectedTblRowByPk(tBody_customer, selected_customer_pk)
                        // ---  scrollIntoView, only in tblBody customer
                        if (!!tblRow){
                            tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                        };
                    } else if(selected_btn === "order"){
            // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
                        //t_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );

            // ---  update addnew row: put pk and ppk of selected customer in addnew row of tBody_order
                        //UpdateAddnewRow_Order();

                    } else  if(selected_btn === "calendar"){
                        let datalist_request = {calendar_period: selected_calendar_period,
                                                customer_calendar: {order_pk: selected_order_pk}};
                        DatalistDownload(datalist_request, "HandleSelect_Row calendar");

                    } else if(selected_btn === "planning"){
                        DatalistDownload_Planning("HandleSelect_Row planning");
            // reset filter tblBody_datatable not necessary, table will be refreshed

                    }

    // ---  update header text
                    UpdateHeaderText()

    // --- save selected_customer_pk and selected_order_pk in Usersettings
                    const upload_dict = {selected_pk: {sel_customer_pk: selected_customer_pk, sel_order_pk: selected_order_pk}};
                    UploadSettings (upload_dict, url_settings_upload);
    // ---  filter selectrows of tbody_select_order
                    // has_rows_dict: {row_count: 2, selected_pk: null, selected_ppk: null, selected_value: null}
                    const has_rows_dict = t_Filter_SelectRows(tblBody_select_order, null, filter_show_inactive, true, selected_customer_pk)
                    if ( !!has_rows_dict.row_count && ["calendar", "planning"].indexOf(selected_btn) > -1){
                        document.getElementById("id_div_tbody_select_order").classList.remove(cls_hide)
                    } else {
                        document.getElementById("id_div_tbody_select_order").classList.add(cls_hide)
                    };

                } // if(update_needed){
            }  //  if (["IMG", "A"].indexOf(event_target.nodeName) > -1)
        }  // if(!!sel_tr_clicked)
    }  // HandleSelect_Row

//========= HandleSidebarShowall  ============= PR2020-04-05
    function HandleSidebarShowall() {
        //console.log("======== HandleSidebarShowall  ========");
        ResetFilterRows()
    }

//========= HandleBillableClicked  ============= PR2019-09-27
    function HandleBillableClicked(el_changed) {
        //console.log("======== HandleBillableClicked  ========");
        if(!!el_changed){
            const tblRow = get_tablerow_selected(el_changed);
            if(!!tblRow){
                const tblName = get_attr_from_el_str(tblRow, "data-table");
                const pk_str = get_attr_from_el_str(tblRow, "data-pk");
                const map_id = get_map_id(tblName, pk_str);

                const itemdict = get_mapdict_from_tblRow(tblRow)
                //console.log("itemdict", itemdict);
                // billable: {override: false, billable: false}

                let is_override = get_dict_value(itemdict, ["billable", "override"]);
                let is_billable = get_dict_value(itemdict, ["billable", "billable"]);
                //console.log("is_override", is_override, "is_billable", is_billable);
                if (is_override){
                    if (is_billable){
                        // is override billable: make override not billable
                        is_billable = false;
                    } else {
                        // is override not billable: remove override
                        is_override = false;
                    }
                } else {
                    if (is_billable){
                        // is inherited billable: make override + not billable
                        is_override = true
                        is_billable = false
                    } else {
                        // is inherited not billable: make override + billable
                        is_override = true
                        is_billable = true
                    }
                }

                //el_changed.setAttribute("data-value", cat_sum);
                //console.log("cat_sum", cat_sum, "is_billable", is_billable);

                // update icon
                const imgsrc = (is_override) ?
                    ((is_billable) ? imgsrc_billable_black : imgsrc_billable_cross_red) :
                    ((is_billable) ? imgsrc_billable_grey : imgsrc_billable_cross_grey);

                el_changed.children[0].setAttribute("src", imgsrc);

                let id_dict = get_dict_value_by_key(itemdict, "id")
                //console.log("---> id_dict", id_dict);

                let upload_dict = {"id": id_dict};
                upload_dict["billable"] = {override: is_override, billable: is_billable, update: true}

                const url_str = url_pricerate_upload
                UploadChanges(upload_dict, url_str)

            }  // if(!!tblRow){
        }  // if(!!el_changed){
    };  // HandleBillableClicked

//========= HandleSelectRowButton  ============= PR2019-09-23
    function HandleSelectRowButton(el_input) {
        HandleBtnInactiveDeleteClicked("inactive", el_input);
    }
//========= HandleBtnDeleteClicked  ============= PR2019-09-23
    function HandleBtnDeleteClicked(el_input) {
        HandleBtnInactiveDeleteClicked("delete", el_input);
    }
//========= HandleBtnInactiveDeleteClicked  ============= PR2019-09-23
    function HandleBtnInactiveDeleteClicked(mode, el_input) {
        //console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        //console.log( "el_input", el_input);
        // values of mode are: "delete", "inactive"

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el_str(tblRow, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
            let map_dict;
            if (tblName === "customer"){ map_dict = customer_map.get(map_id)} else
            if (tblName === "order") { map_dict = order_map.get(map_id)} else
            if (tblName === "roster"){ map_dict = roster_map.get(map_id)};

        //console.log(map_dict);
    // ---  create upload_dict with id_dict
            let upload_dict = {id: map_dict.id};
            if (mode === "delete"){
                ModConfirmOpen("delete", tblName, el_input);
                return false;

            } else if (mode === "inactive"){
        // get inactive from map_dict
                const inactive = get_dict_value(map_dict, ["inactive", "value"], false)
        // toggle inactive
                const new_inactive = (!inactive);
                upload_dict.inactive = {value: new_inactive, update: true};
        // ---  show modal, only when made inactive
                if(!!new_inactive){
                    // create mod_dict, to store new_inactive
                    // store el_input.id, so el can be changed after modconfirm.save
                    // Note: event can be called by img element. In that case there is no id. Get id of parent instead
                    let el_id = (!!el_input.id) ? el_input.id : el_input.parentNode.id
                    mod_dict = {inactive: upload_dict.inactive, el_id: el_id};
                    ModConfirmOpen("inactive", tblName, el_input);
                    return false;
                } else {
                    // change inactive icon, before uploading, not when new_inactive = true
                    format_inactive_element (el_input, {value: new_inactive}, imgsrc_inactive_black, imgsrc_inactive_grey)
                }
            }
            UploadDeleteChanges(upload_dict, url_customer_upload);
        }  // if(!!tblRow)
    }  // HandleBtnInactiveDeleteClicked

//========= HandleBtnCalendar  ============= PR2019-12-04
    function HandleBtnCalendar(mode) {
        //console.log( " ==== HandleBtnCalendar ====", mode);

        const datefirst_iso = get_dict_value_by_key(selected_calendar_period, "period_datefirst")
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
        if(mode === "thisweek") {
            selected_calendar_period =  {period_tag: "tweek", now: now_arr}
        } else{
            selected_calendar_period =  {period_tag: "other",
                                    period_datefirst: calendar_datefirst_iso,
                                    period_datelast: calendar_datelast_iso,
                                    now: now_arr}
        }
        let datalist_request = {customer_calendar: {
                                    order_pk: selected_order_pk},
                                    calendar_period: selected_calendar_period
                                };

        DatalistDownload(datalist_request, "HandleBtnCalendar");

    }  // HandleBtnCalendar
``
//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_order_import = get_attr_from_el(el_data, "data-order_import_url");

        if(permit_add_edit_delete_import_customers){
            AddSubmenuButton(el_div, loc.Add_customer, function() {Mod_Open()}, ["mx-2"], "id_submenu_customer_add")
            AddSubmenuButton(el_div, loc.Delete_customer, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_customer_delete")
        }
        if(permit_add_edit_delete_orders){
            AddSubmenuButton(el_div, loc.Add_order, function() {Mod_Open()}, ["mx-2"], "id_submenu_order_add")
            AddSubmenuButton(el_div, loc.Delete_order, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_order_delete")
        }
        // TODO enable PrintPlanning and ExportToExcel
        AddSubmenuButton(el_div, loc.Print_planning, function() { PrintPlanning(false)},["mx-2"],"id_submenu_customer_planning_print")

        AddSubmenuButton(el_div, loc.Export_to_Excel, ExportToExcel, ["mx-2"],"id_submenu_customer_exportExcel");
        if(permit_add_edit_delete_import_customers){
            AddSubmenuButton(el_div, loc.Upload_customers_and_orders, null, ["mx-2"], "id_submenu_import", url_order_import)
        }
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu


//=========  CreateTblHeader  === PR2019-11-09 PR2020-08-25
    function CreateTblHeader(tblName) {
        //console.log("===  CreateTblHeader == tblName: ", tblName);
        //console.log("tblName: ", tblName);

// --- reset table
        tblHead_datatable.innerText = null

// +++  insert header and filter row ++++++++++++++++++++++++++++++++
        let tblRow_header = tblHead_datatable.insertRow (-1);
        let tblRow_filter = tblHead_datatable.insertRow (-1);

// ---  create header_row, put caption in columns
        for (let j = 0, len = field_settings[tblName].field_names.length; j < len; j++) {
            const field_name = field_settings[tblName].field_names[j];
            const key = field_settings[tblName].field_caption[j];
            const caption = (loc[key]) ? loc[key] : "";
            const filter_tag = field_settings[tblName].filter_tags[j];
            const class_width = "tw_" + field_settings[tblName].field_width[j];
            const class_align = "ta_" + field_settings[tblName].field_align[j];

// ++++++++++ create header row +++++++++++++++
// +++ add th to tblRow_header +++
            let th = document.createElement("th");
                let el_header = document.createElement("div");
                    el_header.innerText = caption;
                    el_header.classList.add(class_width, class_align);
                th.appendChild(el_header);
            tblRow_header.appendChild(th);

// ++++++++++ create filter row +++++++++++++++
// +++ add th to tblRow_filter +++
            const th_filter = document.createElement("th");
                const el_tag = (["inactive", "delete", "select"].indexOf(field_name) > -1) ? "div" : "input";
                const el_filter = document.createElement(el_tag);
                    el_filter.setAttribute("data-field", field_name);
                    el_filter.setAttribute("data-filtertag", filter_tag);
                    //if ([5, 7, 11].indexOf(j) > -1) {
// --- add EventListener to el_filter
                    if (field_name === "inactive") {
                        el_filter.addEventListener("click", function(event){HandleFilterInactive(el_filter, j)});
        // --- add title
                        el_filter.title = (tblName === "customer") ? loc.Cick_show_inactive_customers : loc.Cick_show_inactive_orders;
        // --- add div for image inactive
                        let el_div = document.createElement("div");
                            el_div.classList.add("inactive_0_2")
                            el_filter.appendChild(el_div);
                        el_filter.classList.add("pointer_show");
                    } else {
                        el_filter.addEventListener("keyup", function(event){HandleFilterKeyup(el_filter, j, event.key)});
                        el_filter.setAttribute("autocomplete", "off");
                        el_filter.setAttribute("ondragstart", "return false;");
                        el_filter.setAttribute("ondrop", "return false;");
                    }
                    el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                th_filter.appendChild(el_filter);
            tblRow_filter.appendChild(th_filter);
        }  // for (let j = 0,
    };  // CreateTblHeader


//========= FillTblRows  ==================================== PR2020-06-14
    function FillTblRows() {
        //console.log( "===== FillTblRows  ========= ");
        //console.log( "selected_btn", selected_btn);

// --- reset table
        tblBody_datatable.innerText = null

// --- get tblName
        const tblName = (selected_btn === "customer") ? "customer" :
                        (selected_btn === "order") ? "order" :
                        (selected_btn === "planning") ? "planning" :
                        null;
// --- create tblHead
        CreateTblHeader(tblName);
// --- get selected_pk
        const selected_pk = (selected_btn === "customer") ? selected_customer_pk :
                            (selected_btn === "order") ? selected_order_pk : 0;

// --- get  data_map
        const data_map = (selected_btn === "customer") ? customer_map :
                         (selected_btn === "order") ? order_map :
                         (selected_btn === "planning") ? planning_employee_map :
                         null;
        if(data_map){
// --- loop through data_map
            for (const [map_id, map_dict] of data_map.entries()) {
                    const row_tblName = get_dict_value(map_dict, ["id", "table"]);
                    const pk_int = map_dict.id;
                    const ppk_int = get_dict_value(map_dict, ["id", "ppk"], 0);
                    const data_customer_pk = get_dict_value(map_dict, ["customer", "pk"])
// --- insert tblRow into tblBody
                // in table order: show only rows of selected_customer_pk, show all if null
                let add_Row = true;
                // was: const add_Row = (selected_btn !== "order" || !selected_customer_pk || (selected_customer_pk && ppk_int === selected_customer_pk) );

                if (add_Row){
                // CreateTblRow(tblBody, tblName, pk_str, ppk_str, is_addnew_row, data_customer_pk)
                    let tblRow = CreateTblRow(tblName, map_id, map_dict, -1);
                    UpdateTableRow(tblRow, map_dict)
// --- highlight selected row
                    if (pk_int === selected_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }
            }  //  for (const [pk_int, map_dict] of data_map.entries())
        }  // if(!!data_map){

    }  // FillTblRows

//=========  CreateTblRow  ================ PR2019-09-04 PR2020-08-25
    function CreateTblRow(tblName, map_id, map_dict, row_index) {
       //console.log("=========  CreateTblRow =========");
       //console.log("tblName: ", tblName);

        let tblRow = null;
        if(field_settings[tblName]){
// +++ insert tblRow into tblBody_datatable
            // TODO insert at index
            tblRow = tblBody_datatable.insertRow(row_index);
    // --- add data attributes to tblRow
            tblRow.setAttribute("id", map_id);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-pk", map_dict.id);
            if(map_dict.c_id){tblRow.setAttribute("data-customer_pk", map_dict.c_id)};
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow, tblName, "list");}, false )

//+++ insert td's into tblRow
            const column_count = field_settings[tblName].tbl_col_count;
            // skip first column, is select column
            for (let j = 0; j < column_count; j++) {
                const field_name = field_settings[tblName].field_names[j];
// --- insert td element with div element,
                const el_td = tblRow.insertCell(-1);
                const el_div = document.createElement("div");
// --- add data-field attribute
                el_td.setAttribute("data-field", field_name);
// --- add text_align
                el_td.classList.add("ta_" + field_settings[tblName].field_align[j])
// --- add background image 'inactive_0_2' to element 'inactive'
                if(field_name === "inactive"){
                    el_div.classList.add("inactive_0_2")
                }
// --- add event listeners
                if (field_name === "select") {
                    // TODO add select multiple users option PR2020-08-18
                } else if(field_name === "inactive"){
                    if( (tblName === "customer" && permit_add_edit_delete_import_customers) ||
                        (tblName === "order" && permit_add_edit_delete_orders) ) {
                            el_td.addEventListener("click", function() {ModConfirmOpen(field_name, tblName, el_td)}, false );
                    }
                } else if(tblName === "customer" && permit_add_edit_delete_import_customers){
                    el_td.addEventListener("click", function() {MFC_Open(el_td)}, false )
                        //add_hover(el_td)
                } else if(tblName === "order" && permit_add_edit_delete_orders){
                    el_td.addEventListener("click", function() {MFO_Open(el_td)}, false )
                    //add_hover(el_td)
                } else if(tblName === "teammember"){
                } else if(tblName === "planning"){
                }

// --- add el_div to el_td
                el_td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[tblName])
        return tblRow;
    };// CreateTblRow

//========= UpdateTableRow  =============  PR2020-08-25
    function UpdateTableRow(tblRow, map_dict){
        //console.log(" =====  UpdateTableRow  =====");
        //console.log("map_dict", map_dict);
        //console.log("tblRow", tblRow);

        if (tblRow && !isEmpty(map_dict)) {
        // ---  set tblRow attr data-inactive, hide tblRow when inactive and filter_inactive
            const inactive_int = (map_dict.inactive) ? 1 : 0;
            tblRow.setAttribute("data-inactive", inactive_int)
            add_or_remove_class(tblRow, cls_hide, filter_inactive && map_dict.inactive)
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = tblRow.cells[i]; //.children[0];
                if(el_input){
                    UpdateField(el_input, map_dict);
                };  // if(!!el_input)
            }  //  for (let j = 0; j < 8; j++)

        };  // if (!isEmpty(map_dict) && !!tblRow)
    }  // function UpdateTableRow

//========= UpdateField  ============= PR2019-10-09 PR2020-08-25
    function UpdateField(el_div, map_dict) {
        //console.log("========= UpdateField  ========= ");
        //console.log("el_div ", el_div);
        //console.log("map_dict ", map_dict);

        if(el_div){
            const fldName = get_attr_from_el(el_div, "data-field");
            const fld_value = (map_dict[fldName]) ? map_dict[fldName] : null;
        //console.log("fldName ", fldName);
        //console.log("fld_value ", fld_value);
            if(fldName){
                if (fldName === "select") {
                    // TODO add select multiple users option PR2020-08-18
                    // TODO filter_value not in use yet PR2020-10-18
                } else if (fldName === "inactive") {
                    const el_img = el_div.children[0]
                    add_or_remove_class (el_img, "inactive_1_3", map_dict.inactive, "inactive_0_2");
                    const filter_value = (fld_value) ? "1" : "0"
                    el_div.setAttribute("data-filtervalue", fld_value)
                } else if (["datefirst", "datelast"].indexOf(fldName) > -1){
                    // format_dateISO_vanilla (loc, date_iso, hide_weekday, hide_year, is_months_long, is_weekdays_long)
                    el_div.innerText = format_dateISO_vanilla (loc, map_dict[fldName], true, false);
                    el_div.setAttribute("data-filtervalue", fld_value)
                } else {
                    el_div.innerText = fld_value;
                    const filter_value = (fld_value) ? fld_value.toLowerCase() : ""
                    el_div.setAttribute("data-filtervalue",filter_value)
               }
            };  // if(fldName){
        } //  if(el_div)
   }; // UpdateField


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2019-10-20 PR2020-08-26
    function UpdateFromResponse(update_dict) {
        console.log("==== UpdateFromResponse ====");
        console.log("update_dict", update_dict);
        //console.log("selected_btn", selected_btn);

//--- get info from update_dict["id"]
        const id_dict = get_dict_value(update_dict, ["id"]);
            const tblName = get_dict_value(id_dict, ["table"]);
            const pk_int = get_dict_value(id_dict, ["pk"]);
            const ppk_int = get_dict_value(id_dict, ["ppk"]);
            const temp_pk_str = get_dict_value(id_dict, ["temp_pk"]);
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
        const map_id = get_map_id(tblName, pk_int);
        const inactive_changed = get_dict_value(update_dict, ["inactive", "updated"])

        //console.log("is_created", is_created);
        //console.log("inactive_changed", inactive_changed);

        let tblRow;
        if (!!map_id){
            tblRow = document.getElementById(map_id);
        }

// ++++ deleted ++++
    //--- reset selected_customer and selected_order when deleted
        if(is_deleted){
            selected_order_pk = 0;
            if (tblName === "customer") {selected_customer_pk = 0};
    //--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};

// ++++ created ++++
        } else if (is_created){
    // item is created: add new row on correct index of table, reset addnew row
            // parameters: tblName, pk_str, ppk_str, is_addnew, customer_pk
            //console.log("------------------ tblName", tblName);

// --- insert tblRow in tblBody
            let tblBody = document.getElementById("id_tbody_" + tblName);
            tblRow = CreateTblRow(tblBody, tblName, pk_int, ppk_int)
            UpdateTableRow(tblRow, update_dict)

// set focus to code input of added row
            const index = (tblName === "customer") ? 0 : 1;
            let el_input = tblRow.cells[index].children[0];
            if(!!el_input){ set_focus_on_el_with_timeout(el_input, 150) }

            HandleTableRowClicked(tblRow);

// ---  scrollIntoView, only in tblBody customer
            if (selected_btn === "customer"){
                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
            };

//--- save pk in settings when changed
            let sel_cust_pk = 0, sel_order_pk = 0
            if (tblName === "customer"){
                sel_cust_pk = pk_int;
                sel_order_pk = 0;
            } else if (tblName === "order"){
                sel_cust_pk = ppk_int;
                sel_order_pk = pk_int;
            };
            if(sel_cust_pk !== selected_customer_pk || sel_order_pk !== selected_order_pk){
                selected_customer_pk = sel_cust_pk;
                selected_order_pk = sel_order_pk;
                const upload_dict = {selected_pk: {sel_customer_pk: selected_customer_pk, sel_order_pk: selected_order_pk}};
                UploadSettings (upload_dict, url_settings_upload);
            }
    // reset addnew row
            if(tblName === 'order'){
                //UpdateAddnewRow_Order();
            }

        } // else if (is_created)

        //  when creating failed, 'is_created' is false and there is no map_id
        // in that case go to addnew row with id temp_pk_str;

        const row_id_str = (!!map_id) ? map_id : temp_pk_str;
        tblRow = document.getElementById(row_id_str);

// ++++ update Table Row ++++
        if (!!tblRow){
            UpdateTableRow(tblRow, update_dict)
        }

// ++++ update selectRow ++++
    // only when tblName = 'customer'
    //--- insert new selectRow if is_created, highlight selected row
        if( tblName === "customer"){
            let selectRow;
            if(is_created){
                const row_index = GetNewSelectRowIndex(tblBody_select_customer, 0, update_dict, user_lang);
                const imgsrc_default = imgsrc_inactive_grey, imgsrc_hover = imgsrc_inactive_black;

                let row_count = {count: 0};  // NIU
                const filter_ppk_int = null, filter_include_inactive = true, filter_include_absence = true, has_delete_btn = false;
                selectRow = t_CreateSelectRow(false, tblBody_select_customer, tblName, row_index, update_dict, selected_customer_pk,
                                            HandleSelect_Row, HandleBtnInactiveDeleteClicked, has_delete_btn,
                                            filter_ppk_int, filter_include_inactive, filter_include_absence, row_count,
                                            cls_bc_lightlightgrey, cls_bc_yellow_light,
                                            imgsrc_default, imgsrc_hover,
                                            imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey,
                                            loc.Click_show_inactive_customers)

                HandleSelect_Row(selectRow);
        // imgsrc_inactive_lightgrey
                //HighlightSelectRow(tblBody_select_customer, selectRow, cls_bc_yellow, cls_bc_lightlightgrey);
            } else{
        //--- get existing  selectRow
                const rowid_str = id_sel_prefix + map_id
                selectRow = document.getElementById(rowid_str);
            };
        //--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
            const imgsrc_default = imgsrc_inactive_grey, imgsrc_black = imgsrc_inactive_black
            t_UpdateSelectRow(selectRow, update_dict, false, filter_show_inactive, imgsrc_default, imgsrc_black)
        }  // if( tblName === "customer")

// ++++ update table filter when inactive changed ++++
        if (inactive_changed && !filter_show_inactive){
            // let row disappear when inactive and not filter_show_inactive
            //console.log (" ++++ update table filter when inactive changed ++++")
            setTimeout(function (){
                //t_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk)  // true = has_ppk_filter
            }, 2000);
          }

//--- refresh header text - always, not only when if(pk_int === selected_customer_pk)
        UpdateHeaderText();

//--- remove 'updated, deleted created and msg_err from update_dict
        remove_err_del_cre_updated__from_itemdict(update_dict)

// ++++ replace updated item in map or remove deleted item from map
        // must come after remove_err_del_cre_updated__from_itemdict, otherwise row will be made green all the time
                //--- replace updated item in map or remove deleted item from map
        let data_map = (tblName === "customer") ? customer_map :
                       (tblName === "order") ? order_map :
                       (tblName === "teammember") ? teammember_map : null
         update_map_item(data_map, map_id, update_dict, loc.user_lang);

    }  // UpdateFromResponse

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");

        let header_text = "";
        if (selected_btn === "customer") { //show 'Customer list' in header when List button selected
            //header_text = loc.Customer_list;
        } else {
            let customer_code = "", order_code = ""
            if (!!selected_customer_pk) {
                const dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
                customer_code = get_dict_value(dict, ["code", "value"], "");
            }
            if (!!selected_order_pk) {
                const dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk)
                order_code = get_dict_value(dict, ["code", "value"], "");
            }
            if (["calendar", "planning"].indexOf(selected_btn) > -1) {
                header_text = customer_code + " - " + order_code;
            } else {
                header_text = customer_code;
            }
        }
        document.getElementById("id_hdr_text").innerText = header_text
    }  // UpdateHeaderText

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
        //console.log("===== UpdateSettings ===== ")
        //console.log("setting_dict", setting_dict)

// --- reset permits
        permit_add_edit_delete_import_customers = false;
        permit_add_edit_delete_orders = false;
        perm_customers = [];
        perm_orders = [];
        if(!isEmpty(setting_dict)){
            //user_lang = get_dict_value_by_key(setting_dict, "user_lang");
            //comp_timezone = get_dict_value_by_key(setting_dict, "comp_timezone");
            //interval = get_dict_value_by_key(setting_dict, "interval");
            //timeformat = get_dict_value_by_key(setting_dict, "timeformat");

            // <PERMIT> PR2020-11-03
            // - page can be viewed and edited by planner or accman or sysadmin, except:
            // - when perm_customers and/or perm_orders have value (regardless of permissions):
            //   - import customers not allowed
            //   - add / delete customers not allowed
            //   - add / delete orders only allowed
            //     - customer of the new order is in the list of perm_customers
            //     - and this customer has no orders in  list of perm_orders
            //     - note: when req_user has both perm_customers and a perm_orders,
            //     - only orders can be added when perm_customer has no perm_orders.

            // permits get value when setting_dict is downloaded
            // when perm_customers = [] it is truely, therefore check also perm_customers.length
            perm_customers = setting_dict.requsr_perm_customers
            perm_orders = setting_dict.requsr_perm_orders
            const has_perm_customers = (!!perm_customers && !!perm_customers.length);
            const has_perm_orders = (!!perm_orders && !!perm_orders);
            const is_planner_accman_sysadmin = (!!setting_dict.requsr_perm_planner || !!setting_dict.requsr_perm_accman || !!setting_dict.requsr_perm_sysadmin )
            permit_add_edit_delete_import_customers = (is_planner_accman_sysadmin && !has_perm_customers && !has_perm_orders )
            permit_add_edit_delete_orders = ( (is_planner_accman_sysadmin) && (permit_add_edit_delete_import_customers || has_perm_customers) )

            //console.log("has_perm_customers", has_perm_customers)
            //console.log("has_perm_orders", has_perm_orders)
            //console.log("is_planner_accman_sysadmin", is_planner_accman_sysadmin)
            //console.log("permit_add_edit_delete_import_customers", permit_add_edit_delete_import_customers)
            //console.log("permit_add_edit_delete_orders", permit_add_edit_delete_orders)

            const selected_pk_dict = get_dict_value_by_key(setting_dict, "selected_pk")
            if(!isEmpty(selected_pk_dict)){
            // selected_pk: {sel_cust_pk: 657, sel_order_pk: 1399, sel_scheme_pk: 1642}
                selected_customer_pk = get_dict_value_by_key(selected_pk_dict, "sel_customer_pk", 0)
                selected_order_pk = get_dict_value_by_key(selected_pk_dict, "sel_order_pk", )

            }  // if(!isEmpty(selected_pk_dict)){

            const page_dict = get_dict_value_by_key(setting_dict, "page_customer")
            if(!!page_dict){
                const saved_btn = get_dict_value_by_key(page_dict, "btn")
                selected_btn = (!!saved_btn) ? saved_btn : "customer";

    // ---  always call HandleBtnSelect here, to unhide selected table
            // moved to refresh_maps, must be called after creating maps
                //HandleBtnSelect(selected_btn, true);  // true = skip_upload

                //console.log( " UpdateSettings HandleBtnCalendar ====");
                //HandleBtnCalendar("thisweek")


            }  //  if(!!page_dict)
        }  // if(!isEmpty(setting_dict)){
    }  // UpdateSettings

//========= get_mapdict_from_tblRow  ================== PR2019-11-26
    function get_mapdict_from_tblRow(tblRow){
        // function returns map_dict of this tblRow and map_id
        let map_dict;
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id = get_map_id(tblName, pk_str);

            const data_map = (tblName === "customer") ? customer_map :
                           (tblName === "order") ? order_map :
                           (tblName === "teammember") ? teammember_map : null
            if(!!data_map){
                if(!!data_map.size){
                    map_dict = data_map.get(map_id);
                }
            }
        }
        return map_dict
    }  // get_mapdict_from_tblRow

//###########################################################################
// +++++++++++++++++ UPLOAD +++++++++++++++++++++++++++++++++++++++++++++++++

//========= UploadDeleteChanges  ============= PR2019-10-23 PR2020-08-26
    function UploadDeleteChanges(upload_dict, url_str) {
        console.log( " =====  UploadDeleteChanges  =====");
        console.log("upload_dict");
        // called by HandleBtnInactiveDeleteClicked and ModConfirmSave

// if delete: add 'delete' to id_dict and make tblRow red
        const is_delete = (!!get_dict_value(upload_dict, ["id","delete"]), false)
        //console.log("is_delete:", is_delete, typeof is_delete);

    if(is_delete){
        const pk_int = get_dict_value(upload_dict, ["id", "pk"]);
        const tblName = get_dict_value(upload_dict, ["id", "table"]);
        const map_id = get_map_id(tblName, pk_int);
        //console.log("is_delete:", is_delete, typeof is_delete);

        let tr_changed = document.getElementById(map_id);
        if(!!tr_changed){
            tr_changed.classList.add(cls_error);
            setTimeout(function (){
                tr_changed.classList.remove(cls_error);
                }, 2000);
        }
    }
    UploadChanges(upload_dict, url_str);
}  // UploadDeleteChanges

//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type

    function UploadChanges(upload_dict, url_str) {
        console.log( " ==== UploadChanges ====");
        if(!!upload_dict) {
            console.log("url_str: ", url_str );
            console.log("upload_dict: ", upload_dict);
            const parameters = {"upload": JSON.stringify (upload_dict)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("updated_customer_rows" in response) {
                        RefreshMap("customer", response.updated_customer_rows)
                    };
                    if ("updated_order_rows" in response) {
                        RefreshMap("order", response.updated_order_rows)
                    };
// --- refresh maps and fill tables
                    //refresh_maps(response);

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadChanges


//###########################################################################
// +++++++++++++++++ UPDATE +++++++++++++++++++++++++++++++++++++++++++++++++

//=========  RefreshMap  ================ PR2020-08-26
    function RefreshMap(tblName, updated_rows) {
        //console.log(" =====  RefreshMap  =====");
        //console.log("updated_rows", updated_rows);
        if (updated_rows) {
            for (let i = 0, updated_dict; updated_dict = updated_rows[i]; i++) {
                RefreshMapItem(tblName, updated_dict)
            }
        }
    } // RefreshMap

// =====  RefreshMapItem  =====  PR2020-08-26
    function RefreshMapItem(tblName, updated_dict) {
        //console.log(" =====  RefreshMapItem  =====");
       // console.log("updated_dict", updated_dict);

// ---  update or add order_dict in customer_map / order_map
        const map_id = updated_dict.mapid;
        const data_map = (tblName === "customer") ? customer_map : order_map;
        const old_map_dict = data_map.get(map_id);
        //console.log("old_map_dict", old_map_dict);

        const is_deleted = updated_dict.deleted;
        const is_created = ( (!is_deleted) && (isEmpty(old_map_dict)) );

        let updated_columns = [];
        //console.log("data_map.size before: " + data_map.size);
        if(is_created){
// ---  add new item to map
            data_map.set(map_id, updated_dict)
            updated_columns.push("created")
// ---  delete deleted item
        } else if(is_deleted){
            data_map.delete(map_id);
// --- reset selected_order_pk
            selected_order_pk = null;
            selected_customer_pk = null;
        } else {
// ---  check which fields are updated, add to list 'updated_columns'
            // new order has no old_map_dict PR2020-08-19
            // skip first column (is margin)
            for (let i = 1, col_field, old_value, new_value; col_field = field_settings["order"].field_names[i]; i++) {
                if (col_field in old_map_dict && col_field in updated_dict){
                    if (old_map_dict[col_field] !== updated_dict[col_field] ) {
                        updated_columns.push(col_field)
                    }
                }
            };

// ---  update item in data_map
            data_map.set(map_id, updated_dict)
        }
        //console.log("data_map.size after: " + data_map.size);
        //console.log("updated_columns", updated_columns);

/////////////////////////////////////////
// +++  create tblRow when is_created, only when selected btn equals tblName;
        if (tblName ===  selected_btn) {
            let tblRow = null;
            if(is_created){

        // get row_index
                // get_excelstart_from_order_dict is needed to give value to excelstart when excelstart is null
                const search_code = updated_dict.c_o_code;
                //const search_excelstart = get_excelstart_from_order_dict(updated_dict);
                let row_index = 0 //get_rowindex_by_code_excelstart(search_code, search_excelstart);

        // add new tablerow if it does not exist
                //  CreateTblRow(map_id, map_dict, row_index, is_new_item, new_exceldatetime)
                tblRow = CreateTblRow(tblName, map_id, updated_dict, row_index);
                UpdateTableRow(tblRow, updated_dict)

        // set new selected_customer_pk / selected_order_pk
                if (tblName === "customer") {
                    selected_customer_pk = updated_dict.id;
                    selected_order_pk = null;
                } else if (tblName === "order") {
                    selected_customer_pk = updated_dict.c_id;
                    selected_order_pk = updated_dict.id;
                }
        // highlight new row
                DeselectHighlightedRows(tblRow, cls_selected);
                tblRow.classList.add(cls_selected)
        // scrollIntoView
                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })

            } else {
                tblRow = document.getElementById(map_id);
                UpdateTableRow(tblRow, updated_dict)
            }

// --- save selected_order_pk in Usersettings, only when item is created or deleted
            if(is_created || is_deleted){
                const upload_dict = {selected_pk: {sel_customer_pk: selected_customer_pk, sel_order_pk: selected_order_pk}};
                UploadSettings (upload_dict, url_settings_upload);
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
                        const el = cell; //.children[0];
                        if(el){
                            const el_field = get_attr_from_el(el, "data-field")
                            if(updated_columns.includes(el_field)){
                                UpdateField(tblRow, el, updated_dict)
                                ShowOkElement(cell);
                            }
                        }
                    }
                }
            }
        }  // if (tblName ===  selected_btn)
    }  // RefreshMapItem


//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  Mod_Open  ================  PR2020-08-27
    function Mod_Open(col_index, el_clicked) {
        if(selected_btn === "customer"){
            MFC_Open(el_clicked);
        } else if(selected_btn === "order"){
            MFO_Open(el_clicked)
        }
    }

// +++++++++++++++++ MODAL FORM CUSTOMER +++++++++++++++++++++++++++++++++++++++++++
//=========  MFC_Open  ================  PR2020-06-06
    function MFC_Open(el_clicked) {
        //console.log(" =====  MFC_Open  =====")

        // TODO remove col_index
        let col_index = null;

// reset mod_dict
        mod_dict = {};

// ---  get info from tblRow
        let is_addnew = true;
        const tblRow = (el_clicked) ? get_tablerow_selected(el_clicked) : null;
        if(tblRow){
            const map_dict = get_mapdict_from_datamap_by_id(customer_map, tblRow.id);
            //console.log("map_dict", map_dict)
// ---  create mod_dicty
            if(!isEmpty(map_dict)){
                is_addnew = false;
                mod_dict = {id: map_dict.id,
                        mapid: map_dict.mapid,
                        comp_id: map_dict.comp_id,
                        code: map_dict.code,
                        identifier: map_dict.identifier,
                        name: map_dict.name,
                        inactive: map_dict.inactive
                      };
            }
        }
        if(is_addnew){
            const company_pk = get_dict_value(company_dict, ["id", "pk"])
            mod_dict.create = is_addnew;
            mod_dict.comp_id = company_pk;
        }
        //console.log( "mod_dict: ", mod_dict);
        //console.log( "company_dict: ", company_dict);

// ---  dont_show_err_msg when opened in addnew mode
        mod_dict.dont_show_err_msg = is_addnew

// ---  put customer_code in header
        const header_text = (is_addnew) ? loc.Add_customer : loc.Customer + ":  " + mod_dict.code;
        document.getElementById("id_MFC_hdr_customer").innerText = header_text;

// ---  hide delete button when new customer
        add_or_remove_class(el_MFC_btn_delete, cls_hide, is_addnew );

// ---  put values of mod_dict in input element
        const clicked_field = get_attr_from_el(el_clicked, "data-field")
        //console.log("clicked_field", clicked_field)
        let selected_element = null;
        let form_elements = document.getElementById("id_MFC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const el_field = get_attr_from_el(el, "data-field")
            el.value = (mod_dict[el_field]) ?  mod_dict[el_field] : null;
            if(clicked_field && el_field === clicked_field) {
                selected_element = el;
        }};

// ---  focus on clicked element, if none: on order if has selected_customer_pk, on customer if none
        if(!selected_element){
            selected_element = document.getElementById("id_MFC_code");
        }
        if(selected_element){set_focus_on_el_with_timeout(selected_element, 50)}

// ---  validate input and disable save button
        MFC_validate_and_disable();
// ---  show modal
        $("#id_mod_form_customer").modal({backdrop: true});
    }  // MFC_Open

//=========  MFC_Save  ================  PR2020-06-14
    function MFC_Save(crud_mode) {
        //console.log(" -----  MFC_save  ----", crud_mode);
        //console.log( "mod_dict: ", mod_dict);
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: 'customer' } }

        upload_dict.id.ppk = mod_dict.ppk;
        if(mod_dict.create) {
            upload_dict.id.create = true;
            upload_dict.id.ppk = mod_dict.comp_id;
        } else {
            upload_dict.id.pk = mod_dict.id;
            upload_dict.id.ppk = mod_dict.comp_id;
            upload_dict.id.mapid = mod_dict.mapid;
            if(is_delete) {upload_dict.id.delete = true}
        }
// ---  put changed values of input elements in upload_dict
        let form_elements = document.getElementById("id_MFC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el_input; el_input = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el_input, "data-field");
            let new_value = (el_input.value) ? el_input.value : null;
            const old_value = get_dict_value(mod_dict, [fldName]);
            if (new_value !== old_value) {
                upload_dict[fldName] = {value: new_value, update: true}

// put changed new value in tblRow before uploading
                const tblRow = document.getElementById(mod_dict.mapid);
                if(tblRow){
                    const el_tblRow = tblRow.querySelector("[data-field=" + fldName + "]");
                    if(el_tblRow){el_tblRow.innerText = new_value };
                }
            };
        };
        //console.log( "upload_dict: ", upload_dict);
        // modal is closed by data-dismiss="modal"
        UploadChanges(upload_dict, url_customer_upload);
    }  // MFC_Save

//=========  MFC_validate_and_disable  ================  PR2020-06-14
    function MFC_validate_and_disable(el_input) {
        //console.log(" -----  MFC_validate_and_disable   ----")
        const is_addnew = (!el_input)

// ---  dont_show_err_msg when opened in addnew mode
        const dont_show_err_msg = mod_dict.dont_show_err_msg
        mod_dict.dont_show_err_msg = false;

// ---  check if field is blank (not when identifier)
        const fields =  ["code", "name", "identifier"];
        let msg_err = {};
        let input_values = {};
        fields.forEach(function (field) {
            const el = document.getElementById("id_MFC_" + field);
            input_values[field] = (el) ? el.value : null;
            if (!input_values[field] && (field === "code" || field === "name") ){
                msg_err[field] = ( (field === "code") ? loc.Short_name : loc.Name ) + loc.must_be_completed;
            }
        });
// ---  check if value already exists
        if(!!customer_map.size){
            for (const [map_id, dict] of customer_map.entries()) {
                const map_pk = get_dict_value(dict, ["id", "pk"]);
                // skip current customer
                if(!mod_dict.pk || mod_dict.pk !== map_pk){
                    fields.forEach(function (field) {
                        const map_value = get_dict_value(dict, [field, "value"]);
                        if(map_value && input_values[field]){
                            if(map_value.toLowerCase() === input_values[field].toLowerCase()){
                                msg_err[field] = (field === "code") ? loc.Short_name : (field === "name") ? loc.Name :  (field === "identifier") ? loc.Identifier : "";
                                msg_err[field] += " '" + input_values[field] + "'"
                                msg_err[field] += ( (!!get_dict_value(dict, ["inactive", "value"])) ? loc.already_exists_but_inactive : loc.already_exists);
                            }
                        }
                    });
                }
            }
        };

// ---  enable save button
        //el_MFC_btn_save.disabled = has_error;
// ---  show/hide delete button
        //add_or_remove_class( el_MFC_btn_delete, cls_hide, mod_dict.create );


    }  // MFC_validate_and_disable

//========= MFC_SetCustomerDict  ============= PR2020-06-14
    function MFC_SetCustomerDict(data_pk, row_index){
        //console.log( "=== MFC_SetCustomerDict ===");
        const dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", data_pk)
        const pk_int = get_dict_value(dict, ["id", "pk"])

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

            workminutesperday:  get_dict_value(employee_dict, ["workminutesperday", "value"]),
            workhoursperweek: get_dict_value(employee_dict, ["workhoursperweek", "value"]),
            workdays: get_dict_value(employee_dict, ["workdays", "value"]),
            leavedays: get_dict_value(employee_dict, ["leavedays", "value"]),

            rowindex: row_index
        }
        return employee_pk
    }  // MFC_SetCustomerDict

// +++++++++++++++++ MODAL FORM ORDER +++++++++++++++++++++++++++++++++++++++++++
//=========  MFO_Open  ================  PR2020-06-14 PR2020-08-26
    function MFO_Open(el_clicked) {
        console.log(" =====  MFO_Open  =====")
        console.log("selected_customer_pk", selected_customer_pk)

// reset mod_dict
        mod_dict = {};

// ---  get info from tblRow
        let is_addnew = true;
        const tblRow = (el_clicked) ? get_tablerow_selected(el_clicked) : null;
        if(tblRow){
            const map_dict = get_mapdict_from_datamap_by_id(order_map, tblRow.id);
            console.log("map_dict", map_dict)
// ---  create mod_dicty
            if(!isEmpty(map_dict)){
                is_addnew = false;
                mod_dict = {id: map_dict.id,
                        mapid: map_dict.mapid,
                        c_id: map_dict.c_id,
                        c_code: map_dict.c_code,
                        code: map_dict.code,
                        c_o_code: map_dict.c_o_code,
                        identifier: map_dict.identifier,
                        name: map_dict.name,
                        datefirst: map_dict.datefirst,
                        datelast: map_dict.datelast,
                        inactive: map_dict.inactive
                      };
            }
        }
        mod_dict.create = is_addnew;

// ---  when addnew mode and a row is selected: fill in customer of selected row
        if(is_addnew && selected_customer_pk) {
        console.log("is_addnew && selected_customer_pk", selected_customer_pk)
             const map_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk);
        console.log("customer map_dict", map_dict)
             if(!isEmpty(map_dict)){
                mod_dict.c_id = map_dict.id;
                mod_dict.c_code = map_dict.code;
                mod_dict.c_o_code = map_dict.code;
             }
        }

// ---  dont_show_err_msg when opened in addnew mode
        mod_dict.dont_show_err_msg = is_addnew

// ---  put order_code in header
        const header_text = (is_addnew) ? loc.Add_order : loc.Order + ":  " + mod_dict.c_o_code;
        document.getElementById("id_MFO_header").innerText = header_text;

// ---  hide select table when existing order
        add_or_remove_class(document.getElementById("id_MFO_div_tblbody_select"), cls_hide, !is_addnew );
// ---  disable customer field when existing order
        el_MFO_input_customer.readOnly = !is_addnew;
// ---  hide delete button when new order
        add_or_remove_class(el_MFO_btn_delete, cls_hide, is_addnew );
// ---  put values of mod_dict in input element
        const clicked_field = get_attr_from_el(el_clicked, "data-field")
        console.log("clicked_field", clicked_field)
        let selected_element = null;
        let form_elements = document.getElementById("id_MFO_input_container").querySelectorAll(".form-control")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const el_field = get_attr_from_el(el, "data-field")
            el.value = (mod_dict[el_field]) ?  mod_dict[el_field] : null;
            if(clicked_field && el_field === clicked_field) {
                selected_element = el;
        }};

        MFO_FillSelectTable("MFO", "customer", selected_customer_pk);

// ---  focus on clicked element, if none: on order if has selected_customer_pk, on customer if none
        if(!selected_element){
            selected_element = (selected_customer_pk) ?  el_MFO_input_code : el_MFO_input_customer;
        }
        if(selected_element){set_focus_on_el_with_timeout(selected_element, 50)}
// ---  validate input and disable save button
        MFC_validate_and_disable();
// ---  show modal
        $("#id_mod_form_order").modal({backdrop: true});
    }  // MFO_Open

//=========  MFO_Save  ================  PR2020-06-14 PR2020-08-25
    function MFO_Save(crud_mode) {
        console.log( "===== MFO_save ========= ");
        console.log( "mod_dict: ", mod_dict);
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {ppk: mod_dict.c_id,
                                table: 'order'} }
        if(mod_dict.create) {
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = mod_dict.id;
            if(is_delete) {upload_dict.id.delete = true}
        }
// ---  put changed values of input elements in upload_dict
        let form_elements = document.getElementById("id_MFO_input_container").querySelectorAll(".form-control")
        for (let i = 0, el_input; el_input = form_elements[i]; i++) {
            let fldName = get_attr_from_el(el_input, "data-field");
            // skip field customer code, value customer_pk is in mod_dict
            if(fldName !== "c_code"){
                let new_value = (el_input.value) ? el_input.value : null;
                const old_value = get_dict_value(mod_dict, [fldName]);
                if (new_value !== old_value) {
                    upload_dict[fldName] = {value: new_value, update: true}
                };
            }
        };
        // modal is closed by data-dismiss="modal"
        UploadChanges(upload_dict, url_customer_upload);
    }  // MFO_Save

//=========  MFO_validate_and_disable  ================  PR2020-08-25
    function MFO_validate_and_disable(el_input) {
        //console.log(" -----  MFC_validate_and_disable   ----")

// ---  dont_show_err_msg when opened in addnew mode
        const dont_show_err_msg = mod_dict.dont_show_err_msg
        mod_dict.dont_show_err_msg = false;

// ---  check if field is blank (not when identifier)
        const fields =  ["code", "name", "identifier"];
        let msg_err = {};
        let input_values = {};
        fields.forEach(function (field) {
            const el = document.getElementById("id_MFC_" + field);
            input_values[field] = (el) ? el.value : null;
            if (!input_values[field] && (field === "code" || field === "name") ){
                msg_err[field] = ( (field === "code") ? loc.Short_name : loc.Name ) + loc.must_be_completed;
            }
        });
// ---  check if value already exists
        if(!!customer_map.size){
            for (const [map_id, dict] of customer_map.entries()) {
                const map_pk = get_dict_value(dict, ["id", "pk"]);
                // skip current customer
                if(!mod_dict.pk || mod_dict.pk !== map_pk){
                    fields.forEach(function (field) {
                        const map_value = get_dict_value(dict, [field, "value"]);
                        if(map_value && input_values[field]){
                            if(map_value.toLowerCase() === input_values[field].toLowerCase()){
                                msg_err[field] = (field === "code") ? loc.Short_name : (field === "name") ? loc.Name :  (field === "identifier") ? loc.Identifier : "";
                                msg_err[field] += " '" + input_values[field] + "'"
                                msg_err[field] += ( (!!get_dict_value(dict, ["inactive", "value"])) ? loc.already_exists_but_inactive : loc.already_exists);
                            }
                        }
                    });
                }
            }
        };

// set header text
        let header_text = null;
        if(!mod_dict.c_id){
            header_text = loc.Add_order;
        } else {
            const customer_code = (mod_dict.c_code) ? mod_dict.c_code : "";
            const order_code = (el_MFO_input_code.value) ? el_MFO_input_code.value : "";
            header_text = loc.Order + ": " + customer_code + " - " + order_code;
        }
        document.getElementById("id_MFO_header").innerText = header_text;

// ---  enable save button
        //el_MFO_btn_save.disabled = has_error;


    }  // MFO_validate_and_disable

//=========  MFO_InputKeyup  ================ PR2020-08-25
    function MFO_InputKeyup(pgeName, tblName, el_input) {
       //console.log( "=== MRO_MRE_InputKeyupMFO_InputKeyup  //console.log( "el_input.value:  ", el_input.value)

        let tblBody_select = (pgeName === "MFO") ? el_MFO_tblbody_select : null;
                             //(pgeName === "MSE") ? el_MSE_tblbody_select :
                            // (pgeName === "MRE") ? el_MRE_tblbody_select :
                            // (pgeName === "MRO") ? el_MRO_tblbody_select : null;

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
                MFO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int)
// ---  set header and btn save enabled
                MFO_validate_and_disable(pgeName);
            } else {
// ---  if no 'only_one_selected_pk' found: put el_input.value in mod_upload_dict.shift (shift may have custom name)
                if(tblName === "shift") {
                    mod_upload_dict.shift_code = new_filter;
                }
            }  //  if (!!selected_pk) {
        }
    }  // MFO_InputKeyup

//=========  MFO_OnFocus  ================ PR2020-08-19
    function MFO_OnFocus(pgeName, tblName) {
        //console.log("===  MFO_OnFocus  =====") ;
        MFO_FillSelectTable(pgeName, tblName, null)
    }  // MFO_OnFocus

//=========  MFO_FillSelectTable  ================ PR2020-08-25 PR2020-11-03
    function MFO_FillSelectTable(pgeName, tblName, selected_pk) {
       // console.log( "===== MFO_FillSelectTable ========= ");
        //console.log( "pgeName: ", pgeName, "tblName: ", tblName);

        const data_map = customer_map;
        const select_header_text = loc.Select_customer;
        const el_header = document.getElementById("id_MFO_select_header");
        if(el_header){ el_header.innerText = select_header_text };

        const caption_none = loc.No_customers;
        let filter_pk = mod_dict.sel_customer_pk;

        let tblBody_select = el_MFO_tblbody_select;
        tblBody_select.innerText = null;

        // when only permit_add_edit_delete_orders: show only the allowed customers of the allowed orders
        let skip_these_customers = [];
        if(permit_add_edit_delete_orders && !permit_add_edit_delete_import_customers ) {
            if (perm_orders && perm_orders.length){
                perm_orders.forEach(function (order_pk) {
                    const dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", order_pk)
                    if(dict.c_id && !skip_these_customers.includes(dict.c_id)) {
                        skip_these_customers.push(dict.c_id)
                    }
                });
            };
        };

        mod_dict.rowcount = 0;
//--- loop through data_map or data_dict
        for (const [map_id, map_dict] of data_map.entries()) {
            MFO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, -1, selected_pk, skip_these_customers);
        };
//--- disable sabve btn in MSO when no customers
        const disabled = (!mod_dict.rowcount)
            el_MFO_btn_save.disabled = disabled;

        if(!mod_dict.rowcount){
            let tblRow = tblBody_select.insertRow(-1);
            const inner_text = (tblName === "order" && mod_dict.customer_pk === 0) ? loc.All_orders : caption_none
            let td = tblRow.insertCell(-1);
            td.innerText = inner_text;

        } else if(mod_dict.rowcount === 1){
            let tblRow = tblBody_select.rows[0]
            if(!!tblRow) {
// ---  highlight first row
                tblRow.classList.add(cls_selected)
                if(tblName === "order") {
                    selected_period.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                    // TODO check if correct
                    MRE_MRO_SelecttableClicked(pgeName, tblName, tblRow)
                }
            }
        }
    }  // MFO_FillSelectTable

//=========  MFO_FillSelectRow  ================ PR2020-08-25
    function MFO_FillSelectRow(map_dict, tblBody_select, pgeName, tblName, row_index, selected_pk, skip_these_customers) {
        //console.log( "===== MFO_FillSelectRow ========= ");
        //console.log( "pgeName: ", pgeName, "tblName: ", tblName);
        //console.log( "map_dict: ", map_dict);

//--- loop through data_map
        let ppk_int = null, code_value = null, add_to_list = false, is_selected_pk = false;
        const pk_int = map_dict.id;

        ppk_int =  map_dict.comp_id;
        code_value = map_dict.code;
        // is_absence is already filtered in sql;
        const skip_this_customer = skip_these_customers.includes(pk_int);
        add_to_list = (!map_dict.inactive && !skip_this_customer);
        if (add_to_list){
            mod_dict.rowcount += 1;
            // selected_pk = 0 means: all customers / orders/ employees
            is_selected_pk = (selected_pk != null && pk_int === selected_pk)
// ---  insert tblRow  //index -1 results in that the new row will be inserted at the last position.
            let tblRow = tblBody_select.insertRow(row_index);
            tblRow.setAttribute("data-pk", pk_int);
// ---  add EventListener to tblRow
            tblRow.addEventListener("click", function() {MFO_SelecttableClicked(pgeName, tblName, tblRow)}, false )
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
    }  // MFO_FillSelectRow

//=========  MFO_SelecttableClicked  ================ PR2020-08-25
    function MFO_SelecttableClicked(pgeName, tblName, tblRow) {
        console.log( "===== MFO_SelecttableClicked ========= ");
        console.log( "pgeName:", pgeName, "tblName:", tblName);
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
            MFO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int)
// ---  set header and enable btn save
            MFO_validate_and_disable(pgeName);
        }
    }  // MFO_SelecttableClicked

//=========  MFO_SelecttableUpdateAfterSelect  ================ P2020-08-25
    function MFO_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int) {
        //console.log( "===== MFO_SelecttableUpdateAfterSelect ========= ");
        //console.log( "tblName:", tblName);
        console.log( "pk_int:", pk_int, typeof pk_int);

        const map_id = tblName + "_" + pk_int;
        const data_map = (tblName === "customer") ? customer_map : null;
                         //(tblName === "order") ? order_map :
                        // (tblName === "shift") ? shift_map :
                        // (tblName === "abscat") ? abscat_map :
                        // (tblName === "employee") ? employee_map : null;
        const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
        console.log( "map_dict:", map_dict);

        let el_focus = null;
        // in MFO select table has tblName 'customer'
        if(tblName === "customer") {
            mod_dict.c_id = (!isEmpty(map_dict)) ? map_dict.id : null;
            mod_dict.c_code = (map_dict.code) ? map_dict.code : null;
            mod_dict.id = null;
            mod_dict.order_code = null;

            el_MFO_input_customer.value = mod_dict.c_code;
            el_focus = el_MFO_input_code;
        }
// set header text
        let header_text = null;
        if(pgeName === "MFO") {
            if(!mod_dict.c_id){
                header_text = loc.Add_order;
            } else {
                const customer_code = (mod_dict.c_code) ? mod_dict.c_code : "";
                const order_code = (el_MFO_input_code.value) ? el_MFO_input_code.value : "";
                header_text = loc.Order + ": " + customer_code + " - " + order_code;
            }
            document.getElementById("id_MFO_header").innerText = header_text;
        } else if(pgeName === "MSE") {
            //header_text = (mod_dict.selected_employee_pk) ? mod_dict.selected_employee_code : loc.All_employees;
            //document.getElementById("id_MSE_label_employee").innerText = header_text;
        }
    //console.log( "mod_dict:", mod_dict);
// ---   set focus to next input element
        setTimeout(function (){el_focus.focus()}, 50);

    }  // MFO_SelecttableUpdateAfterSelect


// +++++++++ MODAL SHIFT ORDER ++++++++++++++++++++++++++++++++++++++++++++++++++++ PR2019-12-30

//=========  MSO_Open  ================ PR2019-10-28
    function MSO_Open(el_input) {
        console.log(" ======  MSO_Open  =======")

// ---  calendar_datefirst/last is used to create a new employee_calendar_list
        // calendar_period + {datefirst: "2019-12-09", datelast: "2019-12-15", employee_id: 1456}
        const calendar_datefirst = get_dict_value(selected_calendar_period, ["period_datefirst"]);
        const calendar_datelast = get_dict_value(selected_calendar_period, ["period_datelast"]);

// ---  get row_index from tr_selected
        // getting weekday index from  data-weekday goes wrong, because of row span
        // must be corrected with the number of spanned row of this tablerow
        // number of spanned rows are stored in list spanned_rows, index is row-index

        // rowindex is stored in tblRow, rowindex, used to get the hour that is clicked on
        const tr_selected = get_tablerow_selected(el_input)
        const row_index = get_attr_from_el_int(tr_selected, "data-rowindex")

        let tblCell = el_input.parentNode;
        const cell_index = tblCell.cellIndex

// ---  count number of spanned columns till this column   [4, 1, 1, 0, 0, 1, 1, 0] (first column contains sum)
        const column_count = 7 // tbl_col_count["planning"];
        const spanned_column_sum = count_spanned_columns (tr_selected, column_count, cell_index)
        const col_index = cell_index + spanned_column_sum;

// ---  get rosterdate and weekday from date_cell
        // spanned_column_sum must be added to get correct col_index, because of col_span
        let tblHead = document.getElementById("id_thead_calendar")
        const date_cell = tblHead.rows[1].cells[col_index].children[0]

        const clicked_rosterdate_iso = get_attr_from_el_str(date_cell, "data-rosterdate")
        let clicked_weekday_index = get_attr_from_el_int(date_cell, "data-weekday")

// ---  get info from calendar_map
        const map_id = get_attr_from_el(el_input, "data-pk");
        const calendar_map_dict = get_mapdict_from_datamap_by_tblName_pk(calendar_map, "planning", map_id);
        //console.log("calendar_map_dict: ", calendar_map_dict)

// ---  get selected_weekday_list from calendar_map_dict, select weekday buttons
        //(dont mix up with loc.weekdays_abbrev that contains names of weekdays)
        const selected_weekday_list = get_dict_value(calendar_map_dict, ["weekday_list"], []);

// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++
// ++++++++++++++++ clicked on cell with item in calendar_map ++++++++++++++++
        // dont use !map_dict, because map_dict = {}, therefore !!map_dict will give true
        const is_addnew_mode = (isEmpty(calendar_map_dict));

        const crud_mode = (is_addnew_mode) ? "create" : "unchanged";
        // values of shift_option are: isabsence, schemeshift
        let shift_option ="schemeshift";

// --- RESET MOD_DICT --------------------------------
        // values of crud_mode: create, update, delete
        mod_dict = { map_id: map_id,
                            mode: crud_mode,
                            id_new: 0, // used in MSE_MSO_get_schemeitemslist_from_btnweekdays
                            shiftoption: shift_option,
                            calendar: {shiftoption: shift_option,
                                   rosterdate: clicked_rosterdate_iso,
                                   weekday_index: clicked_weekday_index,
                                   rowindex: row_index,
                                   colindex: col_index,
                                   weekday_list: selected_weekday_list,
                                   calendar_datefirst: calendar_datefirst,
                                   calendar_datelast: calendar_datelast},
                            order: {},
                            scheme: {},
                            selected_team_pk_str: "",
                            teams_list: [],
                            selected_shift_pk_str: "",
                            shifts_list: [],
                            teammembers_list: [],
                            schemeitems_list: []
                            };

// --- GET CUSTOMER AND ORDER --------------------------------
        let order_pk = null, order_ppk = null, order_code = null, customer_code = null;
        if(!is_addnew_mode){
            // get order from shift if clicked on shift, otherwise: get selected_order_pk
            order_pk = get_dict_value(calendar_map_dict, ["order", "pk"]);
            order_ppk = get_dict_value(calendar_map_dict, ["order", "ppk"]);
            order_code = get_dict_value(calendar_map_dict, ["order", "code"]);
            customer_code = get_dict_value(calendar_map_dict, ["customer", "code"]);
        } else {
        // ---  get selected order_pk when clicked on empty row
            order_pk = selected_order_pk;
            const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", order_pk);
            if(!isEmpty(order_dict)){
                order_pk = get_dict_value(order_dict, ["id", "pk"]);
                order_ppk = get_dict_value(order_dict, ["id", "ppk"]);
                order_code = get_dict_value(order_dict, ["code", "value"]);
                customer_code = get_dict_value(order_dict, ["customer", "code"]);
            };
        };
        mod_dict.order = {id: {pk: order_pk}};

        if (!!order_pk){

// --- GET SCHEME ----------------------------------
            let scheme_pk = null, scheme_ppk = null, scheme_code = null, scheme_cycle = null;
            let calendar_scheme_dict = get_dict_value(calendar_map_dict, ["scheme"]);
            if(isEmpty(calendar_scheme_dict)){
                // create new scheme_dict if scheme_dict is empty, with default cycle = 7
                id_new = id_new + 1;
                scheme_pk = "new" + id_new.toString();
                scheme_ppk = order_pk;
                scheme_cycle = 7
                scheme_code = get_schemecode_with_sequence(scheme_map, order_pk, loc.Scheme);
                const scheme_dict = { id: {pk: scheme_pk,
                                    ppk: scheme_ppk,
                                    table: "scheme",
                                    mode: "create"},
                                cycle: {value: scheme_cycle},
                                code: {value: scheme_code},
                                datefirst: {value: null},
                                datelast: {value: null},
                                excludepublicholiday: {value: false},
                                divergentonpublicholiday: {value: false},
                                excludecompanyholiday: {value: false},
                                };
                mod_dict.scheme = scheme_dict;
            } else {
                scheme_pk = get_dict_value(calendar_scheme_dict, ["pk"])
                scheme_ppk = get_dict_value(calendar_scheme_dict, ["ppk"])
                scheme_code = get_dict_value(calendar_scheme_dict, ["code"])
                scheme_cycle = get_dict_value(calendar_scheme_dict, ["cycle"])
                const scheme_dict = { id: {pk: scheme_pk,
                            ppk: scheme_ppk,
                            table: "scheme"},
                        cycle: {value: scheme_cycle},
                        code: {value: scheme_code},
                        datefirst: {value: get_dict_value(calendar_scheme_dict, ["datefirst"])},
                        datelast: {value: get_dict_value(calendar_scheme_dict, ["datelast"])},
                        excludepublicholiday: {value: get_dict_value(calendar_scheme_dict, ["excludepublicholiday"], false)},
                        divergentonpublicholiday: {value: get_dict_value(calendar_scheme_dict, ["divergentonpublicholiday"], false)},
                        excludecompanyholiday: {value: get_dict_value(calendar_scheme_dict, ["excludecompanyholiday"], false)}
                        };
                mod_dict.scheme = scheme_dict;
            }

// --- GET TEAM ----------------------------------
            let team_pk_str = "";
            let calendar_team_dict = get_dict_value(calendar_map_dict, ["team"]);
            if(isEmpty(calendar_team_dict)){
// --- create new team_dict if calendar_team_dict is empty
                id_new = id_new + 1;
                team_pk_str = "new" + id_new.toString();
                const team_code = get_teamcode_with_sequence_from_map(loc, team_map, scheme_pk);
                const new_team_dict = {id: {pk: team_pk_str,
                                            ppk: scheme_pk,
                                            table: "team",
                                            mode: "create"
                                            },
                                       code: {value: team_code}
                                       };
// --- add new team_dict to teams_list
                mod_dict.teams_list.push(new_team_dict);
            } else {
    // ---  get team info from calendar_map (was: from team_map)
                team_pk_str = get_dict_value(calendar_team_dict, ["pk"], 0).toString();
    // fill teams_list with map_dicts of teams of this scheme
                if(!!team_map.size){
                    for (const [map_id, team_dict] of team_map.entries()) {
                        const row_scheme_pk = get_dict_value(team_dict, ["id", "ppk"]);
                        if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                            team_dict.id.mode = "unchanged";
                            mod_dict.teams_list.push(Deepcopy_Calendar_Dict("team", team_dict));
                }}};
            }
// --- make team selected_team_pk_str
            mod_dict.selected_team_pk_str = team_pk_str;

// --- GET SHIFT ----------------------------------
            let shift_pk_str = null, shift_code = null;
            const calendar_shift_dict = get_dict_value(calendar_map_dict, ["shift"]);
            if(isEmpty(calendar_shift_dict)){
// --- create new shift_dict if shift_dict is empty,
                // offsetstart = hour from clicked row (60 * row_index}
                const offset_start = 60 * row_index
                id_new = id_new + 1
                shift_pk_str = "new" + id_new.toString();
                shift_code = f_create_shift_code(loc, offset_start, null, 0, "");
                const new_shift_dict = {id: {pk: shift_pk_str,
                                             ppk: scheme_pk,
                                             table: "shift",
                                             mode: "create"},
                                        code: {value: shift_code},
                                        offsetstart: {value: offset_start},
                                        offsetend: {value: null},
                                        breakduration: {value: 0},
                                        timeduration: {value: 0},
                                        isrestshift: {value: false}
                                        };
// --- add new shift_dict to shifts_list
                mod_dict.shifts_list.push(new_shift_dict);
            } else {
                // ---  get shift info from calendar_map
                shift_pk_str = get_dict_value(calendar_shift_dict, ["pk"], "").toString();
                shift_code = get_dict_value(calendar_shift_dict, ["code"]);

// --- fill shifts_list with map_dicts of shifts of this scheme
                if(!!shift_map.size){
                    for (const [map_id, shift_dict] of shift_map.entries()) {
                        const row_scheme_pk = get_dict_value(shift_dict, ["id", "ppk"]);
                        if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                            shift_dict.id.mode = "unchanged";
                            mod_dict.shifts_list.push(Deepcopy_Calendar_Dict("shift", shift_dict));
                }}};
            }
// --- make shift selected_shift_pk_str
            mod_dict.selected_shift_pk_str = shift_pk_str;

// --- GET TEAMMEMBER ----------------------------------
            let tm_dict = get_dict_value(calendar_map_dict, ["teammember"]);
// --- create new teammember_dict if calendar_teammember_dict is empty
            if(isEmpty(tm_dict)){
                id_new = id_new + 1
                const teammember_pk = "new" + id_new.toString();
                const new_tm_dict = {id: {pk: teammember_pk,
                                ppk: team_pk_str,
                                table: "teammember",
                                mode: "create"}
                          };
                mod_dict.teammembers_list.push(Deepcopy_Calendar_Dict("teammember", new_tm_dict));
            }
    // fill teammembers_list with map_dicts of teammember_map of this scheme
            if(!!teammember_map.size){
                for (const [map_id, tm_dict] of teammember_map.entries()) {
                    const row_scheme_pk = get_dict_value(tm_dict, ["team", "ppk"]);
                    if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                         mod_dict.teammembers_list.push(Deepcopy_Calendar_Dict("teammember", tm_dict));
            }}};

// --- GET SCHEMEITEM ----------------------------------
    // fill schemeitems_list with map_dicts of schemeitems of this scheme
            if(!!schemeitem_map.size){
                for (const [map_id, si_dict] of schemeitem_map.entries()) {
                    const row_scheme_pk = get_dict_value(si_dict, ["id", "ppk"]);
                    if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                        const row_si_pk = get_dict_value(si_dict, ["id", "pk"]);
                         mod_dict.schemeitems_list.push(Deepcopy_Calendar_Dict("schemeitem", si_dict));
            }}};
            //console.log("mod_dict: ", mod_dict)

// ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++ ++++++++++++++++

    // ---  put order name in left header
            const order_text = (!!order_code) ? customer_code + " - " + order_code : loc.Select_order;
            document.getElementById("id_MOS_header").innerText = order_text;

    // ---  put scheme code in left subheader
            document.getElementById("id_MOS_header_scheme").innerText = scheme_code;

    // ---  put scheme cycle in input element and in right subheader
            el_MSO_cycle.value = scheme_cycle;
            MSO_SetSchemeCycleText(scheme_cycle);

    // ---  fill team options, set select team in selectbox
            el_MSO_selectteam.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.teams_list, scheme_pk,
                                            mod_dict.selected_team_pk_str, false); // false = withhout rest_abbrev

    // ---  put team name of selected_team in el_MSO_teamcode
            const team_dict = lookup_dict_in_list(mod_dict.teams_list, mod_dict.selected_team_pk_str);
            el_MSO_teamcode.value = get_dict_value(team_dict, ["code", "value"]);

    // ---  fill tabe teammembers
            MSO_CreateTblTeammemberHeader();
            MSO_CreateTblTeammemberFooter()
            MSO_FillTableTeammember("MSO_Open");

    // ---  fill shift options, set select shift in selectbox
            el_MSO_selectshift.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.shifts_list,scheme_pk,
                                            mod_dict.selected_shift_pk_str, true); // true = with rest_abbrev

    // ---  display shift_code and offset value, retrieved from selected_shift_pk_str in mod_dict.shifts_list
            MSO_UpdateShiftInputboxes();

    // ---  put datefirst datelast in input boxes
            el_MSO_scheme_datefirst.value = get_dict_value(mod_dict, ["scheme", "datefirst", "value"]);
            el_MSO_scheme_datelast.value = get_dict_value(mod_dict, ["scheme", "datelast", "value"]);
            if(el_MSO_scheme_datefirst.value && el_MSO_scheme_datelast.value && el_MSO_scheme_datelast.value < el_MSO_scheme_datefirst.value)  {
                el_MSO_scheme_datelast.value = el_MSO_scheme_datefirst.value;
            }
            cal_SetDatefirstlastMinMax(el_MSO_scheme_datefirst, el_MSO_scheme_datelast);
            el_MSO_scheme_datefirst.readOnly = false;
            el_MSO_scheme_datelast.readOnly = false;

    // ---  show onceonly only in new shifts, reset checkbox, enable datefirst datelast
            //document.getElementById("id_MOS_onceonly").checked = false
            //const is_add = (!isEmpty(calendar_map_dict))
            //add_or_remove_class (document.getElementById("id_MOS_onceonly_container"), cls_hide, is_add);
            el_MSO_scheme_datefirst.readOnly = false;
            el_MSO_scheme_datelast.readOnly = false;

// ---  fill shifts table
            MSO_Grid_FillTblShifts(scheme_pk);
            MSO_Grid_FillTblShifts(scheme_pk);

// --- set excluded checkboxen upload_dict
            el_MSO_excl_ph.checked = get_dict_value(mod_dict, ["scheme", "excludepublicholiday", "value"], false);
            el_MSO_also_ph.checked = get_dict_value(mod_dict, ["scheme", "divergentonpublicholiday", "value"], false);
            el_MSO_excl_ch.checked = get_dict_value(mod_dict, ["scheme", "excludecompanyholiday", "value"], false);
            el_MSO_excl_ph.disabled = false;
            el_MSO_also_ph.disabled = false;
            el_MSO_excl_ch.disabled = false;

// ---  highlight selected button. on empty shift: show shift, else: show team
// ---  show only the elements that are used in this selected_btn
            const selected_btn = (is_addnew_mode) ? "mod_shift" : "mod_team";
            MSO_BtnSelectClicked(selected_btn);
// ---  highlight selected shift_row and team_cells
            MSO_Grid_HighlightTblShifts();
// ---  enable save button
            MSO_BtnSaveDeleteEnable()

// ---  set focus to offsetstart, only in addnew_mode, 500 ms delay because of modal fade
            if(is_addnew_mode){ setTimeout(function() {el_MSO_offsetstart.focus()}, 500)};

// ---  show modal
            $("#id_modordershift").modal({backdrop: true});

        } else {
// ---  show modal confirm with message 'First select employee'
            document.getElementById("id_confirm_header").innerText = loc.Select_order;
            document.getElementById("id_confirm_msg01").innerText = loc.err_open_calendar_01 + loc.an_order + loc.err_open_calendar_02;
            document.getElementById("id_confirm_msg02").innerText = null;
            document.getElementById("id_confirm_msg03").innerText = null;

            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_btn_cancel.classList.add(cls_hide)
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            setTimeout(function() {el_btn_save.focus()}, 50);

             $("#id_mod_confirm").modal({backdrop: true});
        };  // if (!!order_pk)
        console.log("mod_dict: ", mod_dict)
    };  // MSO_Open

// ##############################################  MSO_Save  ############################################## PR2019-11-23
    function MSO_Save(crud_mode){
        console.log( "===== MSO_Save  ========= ");
        console.log("mod_dict: ", mod_dict)

        const shift_option = mod_dict.shiftoption;

        // delete entire scheme whene clicked on delete btn
        if (crud_mode === "delete") {
            mod_dict.mode = crud_mode;
        }

// =========== CREATE UPLOAD DICT =====================
        let upload_dict = {id: {mode: mod_dict.mode,
                                shiftoption: shift_option},
                            rosterdate: mod_dict["calendar"]["rosterdate"],
                            calendar_datefirst: mod_dict["calendar"]["calendar_datefirst"],
                            calendar_datelast: mod_dict["calendar"]["calendar_datelast"],
                            weekday_index: mod_dict["calendar"]["weekday_index"]
                            };

// =========== SAVE ORDER =====================
        // get order from mod_dict and save in upload_dict
        const order_pk = get_dict_value(mod_dict, ["order", "id", "pk"]);
        upload_dict.order = { pk: order_pk};

// =========== SAVE SCHEME =====================
        // in add_new_mode scheme_pk has value 'new4', scheme_ppk has value of order_pk. Done in MSE_Open
        const scheme_pk = get_dict_value(mod_dict, ["scheme", "id", "pk"]);
        const scheme_ppk = get_dict_value(mod_dict, ["scheme", "id", "ppk"]);
        const scheme_mode =  (crud_mode === "delete") ? "delete" : (!scheme_pk || !Number(scheme_pk)) ? "create" : "none";
        const scheme_code =  get_dict_value(mod_dict, ["scheme", "code", "value"]);
        const scheme_cycle = get_dict_value(mod_dict, ["scheme", "cycle", "value"]);

        // empty input date value = "", convert to null
        const datefirst = (!!el_MSO_scheme_datefirst.value) ? el_MSO_scheme_datefirst.value : null;
        const datelast =(!!el_MSO_scheme_datelast.value) ? el_MSO_scheme_datelast.value : null;

        const excl_ph = el_MSO_excl_ph.checked;
        const also_ph = el_MSO_also_ph.checked;
        const excl_ch = document.getElementById("id_MOS_companyholiday").checked;

        upload_dict.scheme =  {id: {pk: scheme_pk,
                                    ppk: scheme_ppk,
                                    table: "scheme",
                                    mode: scheme_mode},
                                cycle: {value: scheme_cycle},
                                code: {value: scheme_code},
                                datefirst: {value: datefirst},
                                datelast: {value: datelast},
                                excludepublicholiday: {value: excl_ph},
                                divergentonpublicholiday: {value: also_ph},
                                excludecompanyholiday: {value: excl_ch}
                                };

// =========== SAVE TEAMS =====================
        // get teams that must be uploaded from mod_dict.shifts_list
        upload_dict.teams_list = [];
        for (let i=0, len = mod_dict.teams_list.length; i<len; i++) {
            const team_dict = mod_dict.teams_list[i];
            const mode = get_dict_value(team_dict, ["id", "mode"]);
            if(["create", "update", "delete"].indexOf(mode) > -1 ){
                upload_dict.teams_list.push(team_dict)
            }
        }
        //console.log(">>>>>>>>>>>> upload_dict.teams_list: ", upload_dict.teams_list)

// =========== SAVE SHIFT =====================
        // get shifts that must be uploaded from mod_dict.shifts_list
        upload_dict.shifts_list = [];
        //console.log(">>>>>>>>>>>> mod_dict.shifts_list: ", mod_dict.shifts_list)
        for (let i=0, len = mod_dict.shifts_list.length; i<len; i++) {
            const shift_dict = mod_dict.shifts_list[i];
        //console.log("shift_dict", shift_dict)
            const mode = get_dict_value(shift_dict, ["id", "mode"]);
            if(["create", "update", "delete"].indexOf(mode) > -1 ){
                upload_dict.shifts_list.push(shift_dict)
            }
        }

// =========== SAVE TEAMMEMBERS =====================
        // get teammembers that must be uploaded from mod_dict.teammembers_list
        upload_dict.teammembers_list = [];
        for (let i=0, len = mod_dict.teammembers_list.length; i<len; i++) {
            const tm_dict = mod_dict.teammembers_list[i];
            const mode = get_dict_value(tm_dict, ["id", "mode"]);
            if(["create", "update", "delete"].indexOf(mode) > -1 ){
                upload_dict.teammembers_list.push(tm_dict)
            }
        }

// =========== SAVE SCHEMEITEMS =====================
        // get teammembers that must be uploaded from mod_dict.teammembers_list
        upload_dict.schemeitems_list = [];
        for (let i=0, len = mod_dict.schemeitems_list.length; i<len; i++) {
            const si_dict = mod_dict.schemeitems_list[i];
            const mode = get_dict_value(si_dict, ["id", "mode"]);
            if(["create", "update", "delete"].indexOf(mode) > -1 ){
                upload_dict.schemeitems_list.push(si_dict)
            }
        }
// =========== UploadChanges =====================
        console.log(">>>>>>>>>>>> upload_dict: ", upload_dict)
        UploadChanges(upload_dict, url_teammember_upload);
    }  // MSO_Save


//=========  MSO_ShiftAdd  ================ PR2020-03-29
    function MSO_ShiftAdd() {
        //console.log("=== MSO_ShiftAdd ===");

// ---  create new shift
        // ---  get selected scheme_pk from mod_dict
        const scheme_pk = get_dict_value(mod_dict, ["scheme", "id", "pk"])
// ---  get new pk_str
        id_new = id_new + 1
        const pk_str = "new" + id_new.toString()
        const new_map_id = get_map_id("shift", pk_str);
// ---  create new_shift_dict
        const new_shift_code = "<" +  loc.New_shift.toLowerCase() + ">";
        let new_shift_dict = {
                id: {pk: pk_str, ppk: scheme_pk, table: "shift", mode: "create"},
                code: {value: new_shift_code},
                offsetstart: {value: null},
                offsetend: {value: null},
                breakduration: {value: 0},
                timeduration: {value: 0}};
        // put values in mod_dict.shift and add to mod_dict.shifts_list
        mod_dict.selected_shift_pk_str = pk_str
        mod_dict.shifts_list.push(new_shift_dict)

// ---  fill shift options, set select shift in selectbox
        let el_select_shift = document.getElementById("id_MOS_selectshift");
        const selected_shift_pk_str = (!!pk_str) ? pk_str : "0";
        el_select_shift.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.shifts_list, scheme_pk,
                                            selected_shift_pk_str, true); // true = with_rest_abbrev

// ---  fill shifts table
        MSO_Grid_FillTblShifts(scheme_pk);
        MSO_Grid_FillTblShifts(scheme_pk);

// ---  display offset
        MSO_UpdateShiftInputboxes();
        MSO_Grid_HighlightTblShifts();

// ---  set focus to offsetstart
        el_MSO_offsetstart.focus()

    }  // MSO_ShiftAdd

//=========  MSO_ShiftDelete  ================ PR2020-03-27
    function MSO_ShiftDelete() {
        //console.log("=== MSO_ShiftDelete ===");
// ---  get shift_dict from mod_dict.shifts_list
        const shift_dict = lookup_dict_in_list(mod_dict.shifts_list, mod_dict.selected_shift_pk_str);
        if(!!shift_dict){
            const shift_pk = shift_dict.id.pk
            const scheme_pk = shift_dict.id.ppk

    // ---  set mode = 'delete' in shift_dict.id
            shift_dict.id.mode = "delete";
    // ---  reset selected_shift_pk_str in mod_dict
            mod_dict.selected_shift_pk_str = "";
    // ---  set mode = 'delete' in schemeitems of this shift
            t_set_mode_delete_in_si_tm(mod_dict.schemeitems_list, "shift", shift_pk);
            //console.log( "mod_dict", mod_dict);

    // ---  fill shift options, set select shift in selectbox
            el_MSO_selectshift.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.shifts_list, scheme_pk,
                                            mod_dict.selected_shift_pk_str, true); // true = with rest_abbrev

        // ---  display shift_code and offset value, retrieved from selected_shift_pk_str in mod_dict.shifts_list
                MSO_UpdateShiftInputboxes();

    // ---  fill shifts table
               MSO_Grid_FillTblShifts(scheme_pk);
               MSO_Grid_FillTblShifts(scheme_pk);

        }  //   if(!!shift_dict)
    }  // MSO_ShiftDelete

//=========  MSO_TeamAdd  ================ PR2020-04-21
    function MSO_TeamAdd() {
        //console.log("=== MSO_TeamAdd ===");
// ---  create new team
        // get selected scheme_pk from mod_dict
        const scheme_pk = get_dict_value(mod_dict, ["scheme", "id", "pk"])
// ---  get new team_pk_str
        id_new = id_new + 1
        const team_pk_str = "new" + id_new.toString()
        const new_map_id = get_map_id("shift", team_pk_str);
// ---  create new_team_dict
        const new_team_code = get_teamcode_with_sequence_from_list(mod_dict.teams_list, scheme_pk, loc.Team);
        const new_team_dict = {id: {pk: team_pk_str,
                                    ppk: scheme_pk,
                                    table: "team",
                                    mode: "create"
                                    },
                               code: {value: new_team_code}
                               };

// ---  put values in mod_dict.team and add to mod_dict.teams_list
        mod_dict.selected_team_pk_str = team_pk_str
        mod_dict.teams_list.push(new_team_dict)

// ---  fill team options, set selected team in selectbox
        const selected_team_pk_str = (!!team_pk_str) ? team_pk_str : "0";
        el_MSO_selectteam.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.teams_list, scheme_pk,
                                            selected_team_pk_str, false); // false = without restabbrev ( is N.A.)
// ---  put team name of selected_team in el_MSO_teamcode
        el_MSO_teamcode.value = new_team_code;

// --- create new teammember_dict
        id_new = id_new + 1
        const teammember_pk = "new" + id_new.toString();
        const new_tm_dict = {id: {pk: teammember_pk,
                        ppk: team_pk_str,
                        table: "teammember",
                        mode: "create"}
                  };
        //console.log("new_tm_dict: ", new_tm_dict);
        mod_dict.teammembers_list.push(new_tm_dict);
        //console.log("mod_dict.teammembers_list: ", mod_dict.teammembers_list);

// ---  fill tabe teammembers
       // MSO_CreateTblTeammemberHeader();
        //MSO_CreateTblTeammemberFooter()
        MSO_FillTableTeammember("MSO_TeamAdd");

// ---  set focus to offsetstart
        //el_MSO_offsetstart.focus()

    }  // MSO_TeamAdd

//=========  MSO_TeamDelete  ================ PR2020-03-29
    function MSO_TeamDelete() {
        //console.log("=== MSO_TeamDelete ===");
// ---  get team_dict from mod_dict.teams_list
        const team_dict = lookup_dict_in_list(mod_dict.teams_list, mod_dict.selected_team_pk_str);
        if(!!team_dict){
            const team_pk_str = (team_dict.id.pk != null) ? team_dict.id.pk.toString() : "";
            const scheme_pk = team_dict.id.ppk

    // ---  set mode = 'delete' in team_dict.id
            team_dict.id.mode = "delete";

    // ---  reset selected_team_pk_str in mod_dict
            mod_dict.selected_team_pk_str = "";

    // ---  remmove team from schemeitems, set mode = 'update' in those schemeitems
            t_remove_team_from_si(mod_dict.schemeitems_list, team_pk_str);
            //console.log( "mod_dict", mod_dict);

    // ---  set mode = 'delete' in teammembers
            t_set_mode_delete_in_si_tm(mod_dict.teammembers_list, "team", team_pk_str)

    // ---  fill team options, set select team in selectbox
            el_MSO_selectteam.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.teams_list, scheme_pk,
                                            mod_dict.selected_team_pk_str, true); // true = with rest_abbrev

    // ---  display teamcode and offset value, retrieved from selected_team_pk_str in mod_dict.teams_list
            MSO_UpdateTeamInputboxes();

    // ---  fill tabe teammembers
            MSO_CreateTblTeammemberHeader();
            MSO_CreateTblTeammemberFooter()
            MSO_FillTableTeammember("MSO_TeamDelete");

    // ---  fill shifts table
               MSO_Grid_FillTblShifts(scheme_pk);
               MSO_Grid_FillTblShifts(scheme_pk)
        }  //   if(!!team_dict)
    }  // MSO_TeamDelete

//=========  MSO_TimepickerOpen  ================ PR2020-03-26
    function MSO_TimepickerOpen(el_input, calledby) {
        //console.log("=== MSO_TimepickerOpen ===", calledby);
        //console.log("mod_dict", mod_dict);

// ---  create tp_dict
        let tp_dict = {}
        const fldName = get_attr_from_el(el_input, "data-field");
        const pk_int = mod_dict.selected_shift_pk_str
        const shift_dict = lookup_dict_in_list(mod_dict.shifts_list, pk_int);
        const ppk_int = get_dict_value(shift_dict, ["id", "ppk"])
        const rosterdate = null; // keep rosterdate = null, to show 'current day' instead of Dec 1
        const offset = get_dict_value(shift_dict, [fldName, "value"])
        const offset_start = get_dict_value(shift_dict, ["offset_start", "value"])
        const offset_end = get_dict_value(shift_dict, ["offset_start", "value"])
        const break_duration = get_dict_value(shift_dict, ["break_duration", "value"])
        const is_absence = false;

// ---  calc min max offset instead of getting it from dict
        const minmax_arr = CalcMinMaxOffset(fldName, offset_start, offset_end, break_duration, is_absence)
        const min_offset = minmax_arr[0];
        const max_offset = minmax_arr[1];

        tp_dict = {id: {pk: pk_int, ppk: ppk_int, table: "shift"},
                    field: fldName,
                    page: calledby,
                    rosterdate: rosterdate,
                    offset: offset, minoffset: min_offset, maxoffset: max_offset,
                    isampm: (timeformat === 'AmPm'), quicksave: quicksave}
// ---  create st_dict
        const show_btn_delete = true;
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                                (fldName === "timeduration") ? loc.Working_hours : null;
        let st_dict = { url_settings_upload: url_settings_upload,
                        text_curday: loc.Current_day, text_prevday: loc.Previous_day, text_nextday: loc.Next_day,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete};

        mtp_TimepickerOpen(loc, el_input, MSO_TimepickerResponse, tp_dict, st_dict)

    };  // MSO_TimepickerOpen

//========= MSO_TimepickerResponse  ============= PR2019-10-12
    function MSO_TimepickerResponse(tp_dict) {
        //console.log(" === MSO_TimepickerResponse ===" );
        //console.log("tp_dict", tp_dict);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};
        //console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = get_dict_value(tp_dict, ["field"])
            const shift_pk = get_dict_value(tp_dict, ["id", "pk"])
            const scheme_pk = get_dict_value(tp_dict, ["id", "ppk"])

// ---  get new value from tp_dict
            const new_offset = get_dict_value_by_key(tp_dict, "offset")
            //console.log( "new_offset: ", new_offset);

// ---  get current values from mod_dict.shifts_list
            let shift_dict = lookup_dict_in_list(mod_dict.shifts_list, shift_pk);
            //console.log("shift_dict", shift_dict);
            let shift_code = get_dict_value(shift_dict, ["code", "value"], "");
            let offset_start = get_dict_value(shift_dict, ["offsetstart", "value"]);
            let offset_end = get_dict_value(shift_dict, ["offsetend", "value"]);
            let break_duration = get_dict_value(shift_dict, ["breakduration", "value"], 0);
            let time_duration = get_dict_value(shift_dict, ["timeduration", "value"], 0);
            let is_restshift = get_dict_value(shift_dict, ["isrestshift", "value"], false);

// ---  put new value in variable
            if (fldName === "offsetstart") {
                offset_start = new_offset;
                shift_dict.offsetstart = {value: offset_start};
            } else if (fldName === "offsetend") {
                offset_end = new_offset;
                shift_dict.offsetend = {value: offset_end};
            } else if (fldName === "breakduration") {
                break_duration = new_offset;
                shift_dict.breakduration = {value: break_duration};
            }
            if(fldName === "timeduration"){
                time_duration = new_offset
                shift_dict.timeduration = {value: time_duration}
                if(!!time_duration){
                    offset_start = null;
                    offset_end = null;
                    shift_dict.offsetstart = {value: null};
                    shift_dict.offsetend = {value: null};
                    shift_dict.breakduration = {value: 0};
                }
            } else {
                time_duration = (offset_start != null && offset_end != null) ? offset_end - offset_start - break_duration : 0;
                shift_dict.timeduration = {value: time_duration};
            }
            const new_shift_code = f_create_shift_code(loc, offset_start, offset_end, time_duration, shift_code);
            if (new_shift_code !== shift_code){
                shift_code = new_shift_code;
                shift_dict.code = {value: shift_code};
            }
    // ---  add mode='upate' to shift.id, except when mode = 'create or 'delete'
            const skip_mode_update = (!!shift_dict.id.mode && ["create", "delete"].indexOf(shift_dict.id.mode) > -1 )
            if(!skip_mode_update) {shift_dict.id.mode = "update"};

    // ---  fill shift options, set select shift in selectbox
            const selected_shift_pk_str = (!!shift_pk) ? shift_pk : "";
            el_MSO_selectshift.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.shifts_list,
                                            scheme_pk, selected_shift_pk_str, true); // true = with rest_abbrev

// ---  display offset, selected values are shown because they are added to mod_dict
            MSO_UpdateShiftInputboxes();
            // put new shift_code in shifttable
            let tblShift_cell = document.getElementById("cell_shift_" + shift_pk.toString());
            if (!!tblShift_cell){ tblShift_cell.innerText = shift_code}

// set focus from offsetstart to offsetend element
            if (fldName === "offsetstart") {
                setTimeout(function() { document.getElementById("id_MOS_input_offsetend").focus()}, 50);
            }
        }  // if("save_changes" in tp_dict) {
     }  //MSO_TimepickerResponse

//=========  TEMP_MSO_CalcMinMaxOffset  ================ PR2019-12-09
    function TEMP_MSO_CalcMinMaxOffset(shift_dict, is_absence){
        //console.log( "=== TEMP_MSO_CalcMinMaxOffset ");
        //console.log( "shift_dict ");
        //console.log( shift_dict);
        // back to {id: {pk etc. TODO: change in employee calenda
        if (!!shift_dict){
            if (!("offsetstart" in shift_dict)){ shift_dict.offsetstart = {} };
            if (!("offsetend" in shift_dict)){ shift_dict.offsetend = {} };
            if (!("breakduration" in shift_dict)){ shift_dict.breakduration = {} };
            if (!("timeduration" in shift_dict)){ shift_dict.timeduration = {} };

            // calculate min max of timefields, store in upload_dict,
            // (offset_start != null) is added to change undefined into null, 0 stays 0 (0.00 u is dfferent from null)
            const offset_start = get_dict_value(shift_dict, ["offsetstart", "value"]);
            const offset_end = get_dict_value(shift_dict, ["offsetend", "value"]);
            const break_duration = get_dict_value(shift_dict, ["breakduration", "value"], 0);

            shift_dict.offsetstart.minoffset = (is_absence) ? 0 : -720;
            shift_dict.offsetstart.maxoffset = (!!offset_end && offset_end - break_duration <= 1440) ?
                                            offset_end - break_duration : 1440;

            shift_dict.offsetend.minoffset = (!!offset_start && offset_start + break_duration >= 0) ?
                                            offset_start + break_duration : 0;
            shift_dict.offsetend.maxoffset = (is_absence) ? 1440 : 2160;

            shift_dict.breakduration.minoffset = 0;
            shift_dict.breakduration.maxoffset = (is_absence) ? 0 :
                                              (!!offset_start && !!offset_end && offset_end - offset_start <= 1440) ?
                                              offset_end - offset_start : 1440;
            shift_dict.timeduration.minoffset = 0;
            shift_dict.timeduration.maxoffset = 1440;
        }  //  if (!!shift_dict)
    }  // TEMP_MSO_CalcMinMaxOffset

//========= CalcMinMaxOffset  ============= PR2020-03-26
    function CalcMinMaxOffset(fldName, offset_start, offset_end, break_duration, is_absence){
        //console.log( "=== CalcMinMaxOffset ");

        // back to {id: {pk etc. TODO: change in employee calenda

        // calculate min max of timefields, store in upload_dict,
        // (offset_start != null) is added to change undefined into null, 0 stays 0 (0.00 u is dfferent from null)

        let min_offset = 0, max_offset = 1440;
        if (fldName === "offsetstart") {
            min_offset = (is_absence) ? 0 : -720;
            max_offset = (!!offset_end && offset_end - break_duration <= 1440) ?
                                            offset_end - break_duration : 1440;
        } else if (fldName === "offsetend") {
            min_offset = (!!offset_start && offset_start + break_duration >= 0) ?
                                        offset_start + break_duration : 0;
            max_offset = (is_absence) ? 1440 : 2160;
        } else if (fldName === "breakduration") {
            min_offset = 0;
            max_offset = (is_absence) ? 0 :
                         (!!offset_start && !!offset_end && offset_end - offset_start <= 1440) ?
                         offset_end - offset_start : 1440;
        }
        return [min_offset, max_offset]
    }  // CalcMinMaxOffset

//=========  MSO_FilterEmployee  ================ PR2019-11-23
    function MSO_FilterEmployee(el_filter) {
        //console.log( "===== MSO_FilterEmployee  ========= ");
        let tblBody =  document.getElementById("id_MOS_select_order_tblBody")
        const filter_str = el_filter.value;
        t_Filter_SelectRows(tblBody, filter_str, filter_show_inactive);
    }; // function MSO_FilterEmployee

//=========  MSO_SetSchemeCycleText  ================ PR2020-04-12
    function MSO_SetSchemeCycleText(scheme_cycle) {
        //console.log( "===== MSO_SchemeCycleChanged  ========= ");
        //console.log( "scheme_cycle", scheme_cycle, typeof scheme_cycle);
        const cycle_text = (!scheme_cycle ) ? "-" :
                            (scheme_cycle === 1) ? loc.Daily_cycle :
                            (scheme_cycle === 7) ? loc.Weekly_cycle :
                            scheme_cycle.toString() + "-" + loc.days_cycle;
        document.getElementById("id_MOS_header_cycle").innerText = cycle_text;
    }

//=========  MSO_SchemeCycleChanged  ================ PR2020-01-03
    function MSO_SchemeCycleChanged(fldName) {
        //console.log( "===== MSO_SchemeCycleChanged  ========= ");
        const cycle_int = Number(el_MSO_cycle.value);
        const cycle_value = (!!cycle_int) ? cycle_int : null
        mod_dict.scheme.cycle = {value: cycle_value, update: true}

        MSO_SetSchemeCycleText(cycle_value);
    }; // MSO_SchemeCycleChanged

//=========  MSO_SchemeDateChanged  ================ PR2020-01-03
    function MSO_SchemeDateChanged(fldName) {
        //console.log( "===== MSO_SchemeDateChanged  ========= ");
        //console.log( "===== MSO_SchemeDateChanged  ========= ");
        if (fldName === "datefirst") {
            mod_dict.scheme.datefirst = {value: el_MSO_scheme_datefirst.value, update: true}
        } else if (fldName === "datelast") {
            mod_dict.scheme.datelast = {value: el_MSO_scheme_datelast.value, update: true}
        }

    }; // MSO_SchemeDateChanged

//=========  MSO_PublicholidayChanged  ================ PR2020-01-03
    function MSO_PublicholidayChanged(fldName) {
        //console.log( "===== MSO_PublicholidayChanged  ========= ");
        if (fldName === "excludepublicholiday") {
            mod_dict.scheme.excludepublicholiday = {value: el_MSO_excl_ph.checked, update: true}
        } else if (fldName === "divergentonpublicholiday") {
            mod_dict.scheme.divergentonpublicholiday = {value: el_MSO_also_ph.checked, update: true}
        } else if (fldName === "excludecompanyholiday") {
            mod_dict.scheme.excludecompanyholiday = {value: el_MSO_excl_ch.checked, update: true}
        }
    }; // function MSO_PublicholidayChanged

//=========  MSO_BtnSelectClicked  ================ PR2019-12-06
    function MSO_BtnSelectClicked(selected_btn) {
        //console.log( "===== MSO_BtnSelectClicked  ========= ");

// ---  select btn_singleshift / btn_schemeshift
        // mod = 'mod_shift' or 'mod_team', 'mod_scheme'
        mod_dict.mode = selected_btn

// ---  highlight selected button
        const btns_container = document.getElementById("id_MOS_btns_container")
        highlight_BtnSelect(btns_container, selected_btn)

// ---  highlight selected shift_row and team_cells
        MSO_Grid_HighlightTblShifts()

// ---  show only the elements that are used in this mod
        show_hide_selected_elements_byClass("mod_show", selected_btn)

    }; // function MSO_BtnSelectClicked

//=========  MSO_SelectShiftChanged  ================ PR2019-12-24
    function MSO_SelectShiftChanged(el_input) {
        MSO_SelectShiftPkChanged(el_input.value);
    }
//=========  MSO_SelectShiftPkChanged  ================ PR2019-12-24
    function MSO_SelectShiftPkChanged(pk_str) {
        //console.log( "===== MSO_SelectShiftPkChanged  ========= ");
        //console.log( "===== selected pk_str: ", pk_str);
        // also new shifts can be selected , with pk 'new3', only when pk = 0 a new shift must be created
        if(pk_str !== "0"){
            // when existing shift is selected: update mod_dict.selected_shift_pk_str and input boxes
            // get selected shift from shifts_list in mod_dict, NOT from shift_map (list contains changed values)
            mod_dict.selected_shift_pk_str = pk_str
// ---  update selectshift element
            el_MSO_selectshift.value = pk_str


        } else {
        // also new shifts can be selected , with pk 'new3', only whe
/*
// ---  create new shift
            // ---  get selected scheme_pk from mod_dict
            const scheme_pk = get_dict_value(mod_dict, ["scheme", "id", "pk"])
// ---  get new pk_str
            id_new = id_new + 1
            const pk_str = "new" + id_new.toString()
            const new_map_id = get_map_id("shift", pk_str);
// ---  create new_shift_dict
            const new_shift_code = "<" +  loc.New_shift.toLowerCase() + ">";
            let new_shift_dict = {
                    id: {pk: pk_str, ppk: scheme_pk, table: "shift", mode: "create"},
                    code: {value: new_shift_code},
                    offsetstart: {value: null},
                    offsetend: {value: null},
                    breakduration: {value: 0},
                    timeduration: {value: 0}};
            // put values in mod_dict.shift and add to mod_dict.shifts_list
            mod_dict.selected_shift_pk_str = pk_str
            mod_dict.shifts_list.push(new_shift_dict)

    // ---  fill shift options, set select shift in selectbox
            let el_select_shift = document.getElementById("id_MOS_selectshift");
            const selected_shift_pk_str = (!!pk_str) ? pk_str : "0";
            el_select_shift.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.shifts_list, scheme_pk,
                                                selected_shift_pk_str, true); // true = with_rest_abbrev

// ---  fill shifts table
            MSO_Grid_FillTblShifts(scheme_pk);
            MSO_Grid_FillTblShifts(scheme_pk);
*/
        }
// ---  display offset
        MSO_UpdateShiftInputboxes();
        MSO_Grid_HighlightTblShifts();
// ---  set focus to offsetstart
        el_MSO_offsetstart.focus()

        //console.log( "mod_dict.value: ", mod_dict);
    }; // function MSO_SelectShiftPkChanged

//=========  MSO_SelectTeamChanged  ================ PR2019-12-24
    function MSO_SelectTeamChanged(el_input) {
        //console.log( "===== MSO_SelectTeamChanged  ========= ");
        const pk_str = (!!el_input) ? el_input.value.toString() : "0";
        //console.log( "pk_str: ", pk_str, typeof pk_str);

        // also new teams can be selected , with pk 'new3', only when pk = 0 a new team must be created
        let team_code = null
        if(pk_str !== "0"){
            // when existing team is selected:
            // - get selected team from teams_list in mod_dict, NOT from team_map (list contains changed values)
            // - update mod_dict.team (is selected team) and input boxes
            // - store values in mod_dict.team
            mod_dict.selected_team_pk_str = pk_str
        } else {
        /*
// ---  create new team
    // ---  get selected scheme_pk from mod_dict
            const scheme_pk = get_dict_value(mod_dict, ["scheme", "id", "pk"]);
    // ---  create new pk_str
            id_new = id_new + 1
            const pk_str = "new" + id_new.toString()
    // ---  create new_team_dict, put values in mod_dict.team
            team_code = get_teamcode_with_sequence_from_list(mod_dict.teams_list, scheme_pk, loc.Team)
        //console.log( "team_code: ", team_code, typeof team_code);

// ---  update  selected_team_pk_str
            mod_dict.selected_team_pk_str = pk_str;
// ---  add new team to teams_list
            const team_dict = {id: {pk: pk_str,
                                          ppk: scheme_pk,
                                          table: "team",
                                    mode: "create"},
                                    code: {value: team_code}
            };
            mod_dict.teams_list.push(team_dict)

    // add new teammember to team
            MSO_AddTeammember();

// ---  fill team options, set select team in selectbox
            el_MSO_selectteam.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.teams_list, scheme_pk,
                                            mod_dict.selected_team_pk_str, false); // false = withhout rest_abbrev
      */

        }
// ---  put team_code in inout box
        MSO_UpdateTeamInputboxes();
// ---  refresh table with teammembers
        MSO_FillTableTeammember("MSO_SelectTeamChanged");
// ---  highlight selected shift_row and team_cells
        MSO_Grid_HighlightTblShifts();

    }; //  MSO_SelectTeamChanged

//=========  MSO_RestshiftClicked  ================ PR2020-03-27
    function MSO_RestshiftClicked() {
        //console.log( "===== MSO_RestshiftClicked  ========= ");

        const new_value = el_MSO_isrestshift.checked;

// ---  lookup shift in list in mod_dict
        const shift_dict = lookup_dict_in_list(mod_dict.shifts_list, mod_dict.selected_shift_pk_str);
        const pk_str = get_dict_value(shift_dict, ["id", "pk"], "")
        const scheme_pk = get_dict_value(shift_dict, ["id", "ppk"], "")

// ---  update isrestshift in mod_dict shift
        if(!isEmpty(shift_dict)){
             shift_dict.isrestshift = {value: new_value};

// ---  update shiftcode in shift_dict
            update_shiftcode_in_shiftdict(loc, shift_dict);

// ---  add mode='upate' to shift.id, except when mode = 'create or 'delete'
            const skip_mode_update = (!!lookup_dict.id.mode && ["create", "delete"].indexOf(lookup_dict.id.mode) > -1 )
            if(!skip_mode_update) {lookup_dict.id.mode = "update"};
        }

// ---  fill shift options, set select shift in selectbox
        el_select.innerHTML = t_FillOptionShiftOrTeamFromList( mod_dict.shifts_list, scheme_pk, pk_str, true);  // true = with_rest_abbrev

// ---  display new_shift_code
        MSO_UpdateShiftInputboxes();

// ---  fill shifts table
        MSO_Grid_FillTblShifts(scheme_pk);
        MSO_Grid_FillTblShifts(scheme_pk);

    }; // MSO_RestshiftClicked

//========= MSO_UpdateShiftInputboxes  ============= PR2020-03-26
    function MSO_UpdateShiftInputboxes() {
        console.log( "=== MSO_UpdateShiftInputboxes ");
        //console.log( "mod_dict", mod_dict);

        let shift_pk = null, shift_code = "", offset_start = null, offset_end = null;
        let break_duration = 0, time_duration = 0, is_restshift = false;
        const shift_dict = lookup_dict_in_list(mod_dict.shifts_list, mod_dict.selected_shift_pk_str)
        //console.log( "shift_dict", shift_dict);

        if(!isEmpty(shift_dict)){
            shift_pk = get_dict_value(shift_dict, ["id", "pk"])
            shift_code = get_dict_value(shift_dict, ["code", "value"], "")
            offset_start = get_dict_value(shift_dict, ["offsetstart", "value"])
            offset_end = get_dict_value(shift_dict, ["offsetend", "value"])
            break_duration = get_dict_value(shift_dict, ["breakduration", "value"], 0)
            time_duration = get_dict_value(shift_dict, ["timeduration", "value"], 0)
            is_restshift = get_dict_value(shift_dict, ["isrestshift", "value"], false)
        }
        if(is_restshift){shift_code += " (R)"}

        //console.log( "offset_start", offset_start);
        //console.log( "offset_end", offset_end);
        el_MSO_shiftcode.value = shift_code
        el_MSO_offsetstart.innerText = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, offset_start, false, false)
        el_MSO_offsetend.innerText = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, offset_end, false, false)
        el_MSO_breakduration.innerText = display_duration (break_duration, user_lang)
        el_MSO_timeduration.innerText = display_duration (time_duration, user_lang)
        el_MSO_isrestshift.checked = is_restshift

        // also update shift_code in shifts_table
        if(!!shift_pk){
            const cell_id = "cell_shift_" + shift_pk.toString()
        //console.log( "cell_id", cell_id);
            let shift_cell = document.getElementById(cell_id);
        //console.log( "shift_cell", shift_cell);
            if(!!shift_cell) { shift_cell.innerText = shift_code};
        }
    }  // MSO_UpdateShiftInputboxes

//========= MSO_UpdateTeamInputboxes  ============= PR2020-03-26
    function MSO_UpdateTeamInputboxes() {
        //console.log( "=== MSO_UpdateTeamInputboxes ");
        let team_code = null;
        const team_dict = lookup_dict_in_list(mod_dict.teams_list, mod_dict.selected_team_pk_str)
        if(!isEmpty(team_dict)){ team_code = get_dict_value(team_dict, ["code", "value"])}
        el_MSO_teamcode.value = team_code
    }  // MSO_UpdateTeamInputboxes

//=========  MSO_ShiftcodeOrTeamcodeChanged  ================ PR2020-01-03
    function MSO_ShiftcodeOrTeamcodeChanged(el_input) {
        //console.log( "===== MSO_ShiftcodeOrTeamcodeChanged  ========= ");

        const field = get_attr_from_el_str(el_input, "data-field")
        const new_code = el_input.value;
        //console.log( "new_code: ", new_code);

// ---  lookup shift or team in list in mod_dict
        const selected_pk = (field === "shift") ? mod_dict.selected_shift_pk_str : mod_dict.selected_team_pk_str;
        let lookup_list = (field === "shift") ? mod_dict.shifts_list : mod_dict.teams_list;
        let lookup_dict = lookup_dict_in_list(lookup_list, selected_pk)

// ---  get pk of current item from mod_dict.selected_pk
        const pk_str = get_dict_value(lookup_dict, ["id", "pk"], "")
        const scheme_pk = get_dict_value(lookup_dict, ["id", "ppk"], "")

// ---  update shift/team in mod_dict shift / team
        if(!isEmpty(lookup_dict)){
            lookup_dict.code = {value: new_code}

// ---  add mode='upate' to shift.id, except when mode = 'create or 'delete'
            const skip_mode_update = (!!lookup_dict.id.mode && ["create", "delete"].indexOf(lookup_dict.id.mode) > -1 )
            if(!skip_mode_update) {lookup_dict.id.mode = "update"};
        }

// ---  fill shift options, set select shift in selectbox
        let el_select;
        if (field === "shift"){
            el_select = el_MSO_selectshift
        } else if (field == "team") {
            el_select = el_MSO_selectteam
        }
        el_select.innerHTML = t_FillOptionShiftOrTeamFromList( lookup_list, scheme_pk, pk_str, true);  // true = with_rest_abbrev

// ---  fill shifts table
        MSO_Grid_FillTblShifts(scheme_pk);
        MSO_Grid_FillTblShifts(scheme_pk);

// ---  highlight selected shift_row and team_cells
        MSO_Grid_HighlightTblShifts();

        //console.log( "mod_dict: ",  mod_dict);
    }; // MSO_ShiftcodeOrTeamcodeChanged

//=========  MSO_BtnSaveDeleteEnable  ================ PR2019-11-23
    function MSO_BtnSaveDeleteEnable(){
        //console.log( "MSO_BtnSaveDeleteEnable");
        //console.log( "mod_dict: ", mod_dict);
// --- enable save button. Order and Teammember must have value
        const order_pk = get_dict_value(mod_dict.order, ["id", "pk"])
        const scheme_pk = get_dict_value(mod_dict.scheme, ["id", "pk"])
        const teammember_pk = get_dict_value(mod_dict.teammember, ["id", "pk"])

        const is_enabled = (!!order_pk)
        const del_enabled = (is_enabled && !!teammember_pk);

        el_modshift_btn_save.disabled = !is_enabled;
        el_modshift_btn_delete.disabled = (!scheme_pk);

// --- hide select_order when order_pk has value
    }  // MSO_BtnSaveDeleteEnable

//========= MSO_FillTableTeammember  ====================================
    function MSO_FillTableTeammember(calledby){
        //console.log( "===== MSO_FillTableTeammember  ========= ", calledby);

// --- reset tblBody
        // id_tbody_teammember is on modeordershift.html
        let tblBody = document.getElementById("id_tbody_teammember");
        tblBody.innerText = null;

// --- loop through mod_dict.teammembers_list
        const len = mod_dict.teammembers_list.length;
        if(!!len){
            for (let i = 0; i < len; i++) {
                let teammember_dict = mod_dict.teammembers_list[i];
                if(!isEmpty(teammember_dict)){
                    // show only rows of mod_dict.selected_team_pk_str, show none if null
                    // also skip rows when 'delete' in id
                    const row_team_pk_str = get_dict_value(teammember_dict, ["id", "ppk"], "").toString()
                    const row_is_delete = (get_dict_value(teammember_dict, ["id", "mode"]) === "delete");
                    if((!!row_team_pk_str && row_team_pk_str === mod_dict.selected_team_pk_str) && !row_is_delete) {
                        let tblRow = MSO_TblTeammember_CreateRow(tblBody, teammember_dict);
                        MSO_TeammemberUpdateTableRow(tblRow, teammember_dict);
                    }
                }
            }  //   for (let i = 0; i < len; i++)
        } //  if(!!len)
    }  // MSO_FillTableTeammember

//=========  MSO_CreateTblTeammemberHeader  === PR2019-11-09
    function MSO_CreateTblTeammemberHeader() {
        //console.log("===  MSO_CreateTblHeader == ");
        let tblHead = document.getElementById("id_thead_teammember");
        tblHead.innerText = null
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        for (let j = 0; j < fieldsettings_teammember.colcount; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
    // --- add innerText to th
                const data_text =  loc[fieldsettings_teammember.caption[j]];
                if(!!data_text) el_div.innerText = data_text;
    // --- add margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")}
    // --- add width to el
                el_div.classList.add("tw_" + fieldsettings_teammember.width[j])
    // --- add text_align
                el_div.classList.add("ta_" + fieldsettings_teammember.align[j])
            th.appendChild(el_div)
        }  // for (let j = 0; j < column_count; j++)
    };  //MSO_CreateTblTeammemberHeader

//=========  MSO_CreateTblTeammemberFooter  === PR2019-11-26
    function MSO_CreateTblTeammemberFooter(){
        //console.log("===  MSO_CreateTblTeammemberFooter == ");

        let tblFoot = document.getElementById("id_tfoot_teammember");
        tblFoot.innerText = null;

        let tblRow = tblFoot.insertRow(-1);
        const column_count = 5
        for (let j = 0; j < column_count; j++) {
            let td = tblRow.insertCell(-1);
            if(j === 0){
// --- create element with tag from field_tags
                let el = document.createElement("p");
                el.setAttribute("tabindex", "0")
                el.classList.add("pointer_show")
                el.classList.add("tsa_color_darkgrey")
                el.classList.add("ml-2")

                el.innerText = loc.Add_employee + "..."
// --- add EventListener to td
                el.addEventListener("click", function() {MSO_AddTeammember()}, false);
                td.appendChild(el);
            }
        }
    };  //MSO_CreateTblTeammemberFooter

//=========  MSO_TblTeammember_CreateRow  ================ PR2019-09-04
    function MSO_TblTeammember_CreateRow(tblBody, teammember_dict){
        //console.log("--- MSO_TblTeammember_CreateRow  --------------");

        const tblName = "teammember";
        const id_dict = get_dict_value_by_key(teammember_dict, "id");
        const pk_int = get_dict_value(teammember_dict, ["id", "pk"]);
        const ppk_int = get_dict_value(teammember_dict, ["id", "ppk"]);
        const map_id = get_map_id(tblName, pk_int)

// --- insert tblRow ino tblBody or tFoot
        let tblRow = tblBody.insertRow(-1);

        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", tblName);
        //console.log("--- data-pk: ", pk_int);

//+++ insert td's into tblRow
        const column_count = 5
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
            let el = document.createElement(fieldsettings_teammember.tag[j]);
// --- add data-field Attribute.
            el.setAttribute("data-field", fieldsettings_teammember.name[j]);
// --- add img delete to col_delete
            if (j === column_count - 1) {
                CreateBtnDelete(el, MSO_BtnDeleteClicked, imgsrc_delete, imgsrc_deletered, loc.Delete_teammember);
            } else {

// --- add type and input_text to el.
                el.classList.add("input_text");

// --- add EventListeners to td
                if ([0, 3].indexOf( j ) > -1){
                    el.setAttribute("type", "text")
                    el.addEventListener("click", function() {
                        MSE_Open(el)
                    }, false);
                    el.setAttribute("tabindex", "0")
                    el.classList.add("pointer_show")

                } else if ([1, 2].indexOf( j ) > -1){
                    el.setAttribute("type", "date")
                    el.addEventListener("change", function() {MSO_TeammemberDateChanged(el)}, false);
                    // class input_popup_date is necessary to skip closing popup
                    el.classList.add("input_popup_date")
                };
// --- add margin to first column
                if (j === 0 ){el.classList.add("ml-2")}
            }
// --- add width to el
            el.classList.add("tw_" + fieldsettings_teammember.width[j])
// --- add text_align
            el.classList.add("ta_" + fieldsettings_teammember.align[j])
// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
// --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);
        }
        return tblRow


    };  // MSO_TblTeammember_CreateRow

//=========  CreateBtnDelete  ================ PR2019-10-23
    function CreateBtnDelete(el, BtnDeleteClicked, imgsrc_delete, imgsrc_deletered, title){
        //console.log("--- CreateBtnDelete  --------------");
        el.setAttribute("href", "#");
        if(!!title){
            el.setAttribute("title", title);
        } else {
            el.removeAttribute("title");
        }
        el.addEventListener("click", function() {BtnDeleteClicked(el)}, false )

//- add hover delete img
        el.addEventListener("mouseenter", function() {el.children[0].setAttribute("src", imgsrc_deletered)});
        el.addEventListener("mouseleave", function() {el.children[0].setAttribute("src", imgsrc_delete)});

        el.classList.add("ml-4")

        AppendChildIcon(el, imgsrc_delete)
    }  // CreateBtnDelete

//=========  MSO_CreateBtnInactive  ================ PR2020-03-29
    function MSO_CreateBtnInactive(el_input){
        //console.log("--- MSO_CreateBtnInactive  --------------");

        el_input.setAttribute("title", loc.Make_planned_shifts_inactive);
        el_input.addEventListener("click", function() {MSO_BtnInactiveClicked()}, false )

//- add hover delete img
        el_input.addEventListener("mouseenter", function() {
            el_input.children[0].setAttribute("src", imgsrc_inactive_black);
        });
        el_input.addEventListener("mouseleave", function() {
            el_input.children[0].setAttribute("src", imgsrc_inactive_grey);
        });

        el_input.classList.add("ml-4")
        AppendChildIcon(el_input, imgsrc_inactive_grey)
    }  // MSO_CreateBtnInactive


//========= MSO_TeammemberUpdateTableRow  =============
    function MSO_TeammemberUpdateTableRow(tblRow, update_dict){
        //console.log("--- MSO_TeammemberUpdateTableRow  --------------");
        //console.log("update_dict", update_dict);

// format of update_dict is : { id: {table: "customer", pk: 504, ppk: 2, temp_pk: "customer_504"}
//                              pk: 504,  code: {updated: true, value: "mmm2"},  name: {value: "mmm"},
//                              cat: {value: 0}, interval: {value: 0}}

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

// check if tblBody = tFoot, if so: is_addnew_row = true
            const tblBody_id_str = get_attr_from_el(tblBody, "id")
            const arr = tblBody_id_str.split("_");
            const is_addnew_row = (arr.length > 1 && arr[1] === "tfoot");

// put or remove customer_pk in tblRow.data, for filtering rows
            const customer_dict = get_dict_value_by_key (update_dict, "customer");
            let customer_pk = null, customer_ppk = null;
            if(!isEmpty(customer_dict)){
                customer_pk = get_dict_value_by_key(customer_dict, "pk", 0)
                customer_ppk = get_dict_value_by_key(customer_dict, "ppk", 0)
            };
            if(!!customer_pk){tblRow.setAttribute("data-customer_pk", customer_pk)
                } else {tblRow.removeAttribute("data-customer_pk")};
            if(!!customer_ppk){tblRow.setAttribute("data-customer_ppk", customer_ppk)
                } else {tblRow.removeAttribute("data-customer_ppk")};

//--- get info from update_dict["id"]
            const id_dict = get_dict_value_by_key (update_dict, "id");
                const is_created = ("created" in id_dict);
                const msg_err = get_dict_value_by_key(id_dict, "error");

// --- deleted record
            // in UpdateFromResponse

// --- new created record
             if (is_created){

// update row info
                const tblName = get_dict_value_by_key(id_dict, "table");
                const pk_int = get_dict_value_by_key(id_dict, "pk");
                const ppk_int = get_dict_value_by_key(id_dict, "ppk");
                const map_id = get_map_id(tblName, pk_int)
    // update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);

// move the new row in alfabetic order
                // TODO: also when name has changed
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, loc.user_lang);
                tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);

// make row green, / --- remove class 'ok' after 2 seconds, not in addnew row
                if(!is_addnew_row){
                    ShowOkRow(tblRow)
                }

            };  // if (is_created){

            // tblRow may not exist any more when (is_deleted). Not any more (delete is moded from this function), but let it stay
            if (!!tblRow){
                const is_inactive = get_dict_value(update_dict, ["inactive", "value"], false);
                tblRow.setAttribute("data-inactive", is_inactive)

                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        MSO_TeammemberUpdateField(el_input, update_dict);
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)
        };  // if (!isEmpty(update_dict) && !!tblRow)
    }  // function MSO_TeammemberUpdateTableRow

//========= MSO_TeammemberUpdateField  ============= PR2019-10-09
    function MSO_TeammemberUpdateField(el_input, update_dict) {
        const fldName = get_attr_from_el(el_input, "data-field");
        //console.log(" --- MSO_TeammemberUpdateField ---");
        //console.log("update_dict ", update_dict);
        //console.log("fldName ", fldName);

// --- reset fields when update_dict is empty
        if (isEmpty(update_dict)){
            el_input.value = null
            el_input.removeAttribute("data-value");
            el_input.removeAttribute("data-pk");
            el_input.removeAttribute("data-ppk");

        } else {
    // --- lookup field in update_dict, get data from field_dict
            const field_dict = get_dict_value_by_key (update_dict, fldName);

            if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                //const hide_weekday = true, hide_year = false;
                //const el_msg = null;
                //format_date_elementMOMENT (el_input, el_msg, field_dict, loc.months_abbrev, loc.weekdays_abbrev,
                //            loc.user_lang, loc.comp_timezone, hide_weekday, hide_year)
                const value = get_dict_value_by_key(field_dict, "value")            ;
                el_input.value = value;
            } else if (["employee", "replacement"].indexOf( fldName ) > -1){
                const value = get_dict_value_by_key (field_dict, "code", "---");
                const pk_int = get_dict_value_by_key (field_dict, "pk")
                const ppk_int = get_dict_value_by_key (field_dict, "ppk")
                el_input.setAttribute("data-pk", pk_int);
                el_input.setAttribute("data-ppk", ppk_int);

                el_input.innerText = value;
            };
        } // if (isEmpty(update_dict))
   }; // MSO_TeammemberUpdateField

//========= MSO_AddTeammember  ============= PR2019-12-31
    function MSO_AddTeammember() {
        //console.log( " ==== MSO_AddTeammember ====");
        //console.log( "mod_dict: ", mod_dict);

// ---  get selected team_dict from mod_dict.teams_list
        const team_dict = lookup_dict_in_list(mod_dict.teams_list, mod_dict.selected_team_pk_str)
        //console.log( "mod_dict: ", mod_dict);
        if(!isEmpty(team_dict)) {
        // TODO correct 2020-03-28
            //console.log( "team_dict: ", team_dict);
            const team_pk = get_dict_value(team_dict, ["id", "pk"]);
            const team_ppk = get_dict_value(team_dict, ["id", "ppk"]);
            const team_code = get_dict_value(team_dict, ["code", "value"]);

    // ---  create new pk_str
            id_new = id_new + 1
            const pk_str = "new" + id_new.toString()

            //console.log("mod_dict.")
            //console.log(mod_dict)
    // ---  create new_teammember_dict
            let new_teammember_dict = { id: {pk: pk_str,
                                             ppk: team_pk,
                                             table: "teammember",
                                             mode: "create"},
                                        team: {pk: team_pk,
                                               ppk: team_ppk,
                                               code: team_code}
                                        };
            mod_dict.teammembers_list.push(new_teammember_dict);

            //console.log( "mod_dict: ", mod_dict);
            MSO_FillTableTeammember("MSO_AddTeammember")
        }  //   if(!isEmpty(team_dict)) {
    }  // MSO_AddTeammember

//========= MSO_BtnDeleteClicked  ============= PR2019-09-23
    function MSO_BtnDeleteClicked(el_input) {
        //console.log( " ==== MSO_BtnDeleteClicked ====");
        // when clicked on delete button in table teammembers of MSO
        //console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const selected_teammember_pk_str = get_attr_from_el(tblRow, "data-pk");

    // --- lookup teammember_dict in mod_dict.teammembers_list
            let index = -1, teammember_dict = {};
            const len = mod_dict.teammembers_list.length;
            if(!!len){
                for (let i = 0; i < len; i++) {
                    teammember_dict = mod_dict.teammembers_list[i];
                    if(!!teammember_dict){
                        const pk_int = get_dict_value(teammember_dict, ["id", "pk"]);
                        if (!!pk_int && pk_int.toString() === selected_teammember_pk_str) {
                            index = i;
                            break;
                        }
                    }
                };
            }
            //console.log("index: ", index);
            if (index >= 0) {
            // if sel_teammember_pk = NaN, the row is an added row. Just remove it from the .teammembers_list
                if(!Number(selected_teammember_pk_str)){
                    // Array.splice( index, remove_count, item_list ) modifies an array by removing existing elements and/or adding new elements.
                    mod_dict.teammembers_list.splice(index, 1);
                } else {
            // if sel_teammember_pk is numeric, the row is a saved row. Put 'delete in id_dict for deletion
                    teammember_dict.id.mode = "delete";
                }
            }
            //console.log("mod_dict: ");
            //console.log(mod_dict);

            MSO_FillTableTeammember("MSO_BtnDeleteClicked");

        }  // if(!!tblRow)
    }  // MSO_BtnDeleteClicked

//=========  MSO_TeammemberDateChanged  ================ PR2020-01-04
    function MSO_TeammemberDateChanged(el_input) {
        //console.log( "===== MSO_TeammemberDateChanged  ========= ");
        //console.log( "el_input: ", el_input);

        const tblRow = get_tablerow_selected(el_input);
        const sel_teammember_pk_str = get_attr_from_el(tblRow, "data-pk");
        const sel_date_field = get_attr_from_el_str(el_input, "data-field")
        const new_date = el_input.value;

// --- lookup teammember_dict in mod_dict.teammembers_list
        let sel_teammember_dict = {};
        for (let i = 0; i < mod_dict.teammembers_list.length; i++) {
            let sel_teammember_dict = mod_dict.teammembers_list[i];
            if(!isEmpty(sel_teammember_dict)){
                const pk_int = get_dict_value(sel_teammember_dict, ["id", "pk"])
                if(!!pk_int && pk_int.toString() === sel_teammember_pk_str) {
                    //console.log("==============---sel_teammember_dict", sel_teammember_dict );
                    if (!(sel_date_field in sel_teammember_dict)){ sel_teammember_dict[sel_date_field] = {} }
                    sel_teammember_dict[sel_date_field]["value"] = new_date;
                    sel_teammember_dict[sel_date_field]["update"] = true;
                    sel_teammember_dict["update"] = true;
                    break;
                }  // if((!!pk_int && pk_int === selected_teammember_pk_str)
            }  // if(!isEmpty(dict))
        }; //   for (let i = 0; i < mod_dict.teammembers_list.length; i++) {

        //console.log( "mod_dict: ", mod_dict);
    }; // function MSO_TeammemberDateChanged

//############################################################################

//=========  MSO_Grid_FillTblShifts  === PR2020-03-13
    function MSO_Grid_FillTblShifts(scheme_pk) {
        //console.log("===  MSO_Grid_FillTblShifts == ", scheme_pk)
        //console.log("mod_dict == ", mod_dict)

        let tblBody = document.getElementById("id_MOS_grid_tbody_shift");
        tblBody.innerText = null

// ---  get scheme info from mod_dict, not from scheme_map (the latter does not contain new schemes)
        //const scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", scheme_pk)
        const scheme_dict = get_dict_value(mod_dict, ["scheme"])
        const cycle = get_dict_value(scheme_dict, ["cycle", "value"])

// ---  get the first date of table shift-schemeitem
        // first date equals calendar_datefirst, if clicked on a date later than calendar_datelast: use clicked_rosterdate
        const calendar_datefirst = mod_dict.calendar.calendar_datefirst
        const clicked_rosterdate_iso = mod_dict.calendar.rosterdate
        const clicked_colindex = mod_dict.calendar.colindex
        const first_rosterdate_iso = (clicked_colindex <= cycle ) ? calendar_datefirst : clicked_rosterdate_iso
        mod_dict.calendar.first_rosterdate_iso = first_rosterdate_iso;
        const rosterdate_dateJS = get_dateJS_from_dateISO_vanilla(first_rosterdate_iso)
        //console.log("rosterdate_dateJS", rosterdate_dateJS)
        //console.log("first_rosterdate_iso", first_rosterdate_iso)
        //console.log("cycle", cycle)

        if(!!rosterdate_dateJS){
            // col_rosterdate_dict stores rosterdate of each column, used to create id for each cell "2020-03-14_1784" (rosterdate + "_" + shift_pk)
            let col_rosterdate_dict = {};
            let col_rosterdate_selected = null

// +++  create two header rows, one for the weekdays and the other for dates
            let tblRow_weekday = tblBody.insertRow (-1);  // index -1: insert new cell at last position.// ---  create Team header row
            let tblRow_date = tblBody.insertRow (-1);  // index -1: insert new cell at last position.

// --- create header with dates, number of columns = cycle + 1
            let first_month_index = -1, last_month_index = -1, first_year = 0, last_year = 0;
            for (let col_index = 0, td; col_index < cycle + 1 ; col_index++) {
                let cls_background = (col_index === 0) ? "grd_shift_th_first" : "grd_shift_th";

// ---  add th to tblRow_weekday and tblRow_date
                let th_weekday = document.createElement("th");
                let th_date = document.createElement("th");
                if (!!col_index){

// ---  add rosterdate to col_rosterdate_dict, rosterdate_dateJS gets value of next date at end of this loop
                    const col_rosterdate = get_dateISO_from_dateJS(rosterdate_dateJS);
                    col_rosterdate_dict[col_index] = col_rosterdate;
                    const is_clicked_rosterdate = (!!mod_dict.calendar.rosterdate && mod_dict.calendar.rosterdate === col_rosterdate)
                    if(is_clicked_rosterdate) {
                        col_rosterdate_selected = col_index;
                        cls_background = "grd_shift_th_selected"
                    }
                    const weekday_index = (rosterdate_dateJS.getDay()) ? rosterdate_dateJS.getDay() : 7;  // index 0 is index 7 in weekday_list
                    th_weekday.innerText = loc.weekdays_abbrev[weekday_index];
                    th_date.innerText = rosterdate_dateJS.getDate().toString();

// ---  these are used in get_month_year_text
                    const year_int = rosterdate_dateJS.getFullYear();
                    const month_index = rosterdate_dateJS.getMonth();
                    if (col_index === 1){
                        first_year = year_int; // used in get_month_year_text
                        first_month_index = month_index;// used in get_month_year_text
                    }
                    last_year = year_int;  // used in get_month_year_text
                    last_month_index = month_index; // used in get_month_year_text
// ---  goto next date
                    change_dayJS_with_daysadd_vanilla(rosterdate_dateJS, 1);
                }  // if (!!col_index)

                th_weekday.classList.add(cls_background);
                th_date.classList.add(cls_background);

                tblRow_weekday.appendChild(th_weekday);
                tblRow_date.appendChild(th_date);

// ---  put month / year in first column
                tblRow_date.cells[0].innerText = get_month_year_text(first_year, last_year, first_month_index, last_month_index, loc)
            }  //  for (let col_index = 0, td; col_index < cycle + 1 ; col_index++)

// +++++++++++++++++++++++++++++++++++  add shift rows  ++++++++++++++++++++++++++++++++
            let row_index = 2;
            let shifts_dict = {}

            const selected_shift_pk_str = mod_dict.selected_shift_pk_str

// ---  loop through mod_dict.shifts_list
            const arr = mod_dict.shifts_list
            const len = arr.length
            for (let i = 0; i < len; i++) {
                const shift_dict = mod_dict.shifts_list[i];
                const shift_pk = get_dict_value(shift_dict, ["id", "pk"], 0);
                const shift_ppk = get_dict_value(shift_dict, ["id", "ppk"], 0);
                const is_delete = (get_dict_value(shift_dict, ["id", "mode"]) === "delete");
                const is_restshift = get_dict_value(shift_dict, ["isrestshift", "value"], false);
                let shift_code = get_dict_value(shift_dict, ["code", "value"], "---");
                if( is_restshift) {shift_code += " (R)"}
                if(!!shift_pk && !is_delete){
                    const row_id ="grid_shift_" + shift_pk.toString();
                    shifts_dict[shift_pk] = {row: row_index};
                    row_index += 1
// ---  add tblRow.
                    let tblRow_shift = tblBody.insertRow (-1);  // index -1: insert new cell at last position.
                    tblRow_shift.setAttribute("id", row_id);
                    tblRow_shift.setAttribute("data-table", "grid_si");
                    tblRow_shift.setAttribute("data-shift_pk", shift_pk);
                    tblRow_shift.setAttribute("data-shift_ppk", shift_ppk);
                    tblRow_shift.setAttribute("data-shift_code", shift_code);
// ---  add td's to tblRow.
                    for (let col_index = 0, cell_id; col_index < cycle + 1 ; col_index++) {
                        let rosterdate = col_rosterdate_dict[col_index];
                        const is_shift_cell = (col_index === 0);
// ---  add id to cells
                        let td_si = document.createElement("td");
                        if (is_shift_cell) {
                            cell_id = "cell_shift_" + shift_pk.toString();
                            td_si.innerText =  shift_code;
                        } else {
                            cell_id = "si_" + rosterdate + "_" + shift_pk.toString();
                            td_si.setAttribute("data-rosterdate", rosterdate);
                        }
                        td_si.setAttribute("id", cell_id);
                        const class_backcolor = (shift_pk === selected_shift_pk_str) ?
                                                    (is_shift_cell) ? "grd_shift_td_first_selected" : "grd_shift_td_selected_shift" :
                                                    (is_shift_cell) ? "grd_shift_td_first" : "grd_shift_td";
                        td_si.classList.add(class_backcolor);
                        td_si.addEventListener("click", function() {MSO_Grid_SchemitemClicked(td_si, is_shift_cell)}, false )
// ---  add hover to cells
                        td_si.addEventListener("mouseenter", function() {td_si.classList.add(cls_hover)});
                        td_si.addEventListener("mouseleave", function() {td_si.classList.remove(cls_hover)});

                        tblRow_shift.appendChild(td_si);
                    }  // for (let col_index = 0, cell_id; col_index < cycle + 1 ; col_index++)
                }
            }  // for (let i = 0; i < mod_dict.shifts_list.length; i++)

// +++++++++++++++++++++++++++++++++++  add footer row  ++++++++++++++++++++++++++++++++
// +++  create footer row
            let tblRow_footer = tblBody.insertRow (-1);

            id_new = id_new + 1
            const pk_new = "new" + id_new.toString()
            tblRow_footer.setAttribute("data-shift_pk", pk_new);
            tblRow_footer.setAttribute("data-shift_ppk", scheme_pk);

// ---  add td's to tblRow_footer.
            for (let col_index = 0, cell_id; col_index < cycle + 1 ; col_index++) {
// ---  add id to cells
                let th_footer = document.createElement("th");

                if (col_index === 0) {
// ---  add cell 'addnew' th to tblRow.
                    const cell_id = "shift_" + pk_new;
                    th_footer.setAttribute("id", cell_id);
                    th_footer.classList.add("tsa_color_mediumgrey");
                    th_footer.classList.add("ta_c");
                    th_footer.addEventListener("click", function() {MSO_Grid_SchemitemClicked(th_footer, true)}, false )  // is_shift_cell = true
    // ---  add hover to cells
                    th_footer.addEventListener("mouseenter", function() {th_footer.classList.add(cls_hover)});
                    th_footer.addEventListener("mouseleave", function() {th_footer.classList.remove(cls_hover)});

                    MSO_CreateBtnInactive(th_footer)

                }

                let cls_background = (col_index === 0) ? "grd_shift_th_first" :
                                    (col_index === col_rosterdate_selected) ? "grd_shift_th_selected" : "grd_shift_th";
                th_footer.classList.add(cls_background);

                tblRow_footer.appendChild(th_footer);
            }  // for (let i = 0; i < cycle + 1 ; i++)
        } //  if(!!first_rosterdate_dateJS)
    }  // MSO_Grid_FillTblShifts

//=========  MSO_Grid_FillTblShifts  === PR2020-03-23
    function MSO_Grid_FillTblShifts(scheme_pk) {
        //console.log("===  MSO_Grid_FillTblShifts == ")
        let tblBody = document.getElementById("id_MOS_grid_tbody_shift");

        const first_rosterdate_iso = mod_dict.calendar.first_rosterdate_iso;
        const cycle = get_dict_value(mod_dict, ["scheme", "cycle", "value"], 0);

        //console.log("first_rosterdate_iso: ", first_rosterdate_iso)
        //console.log("cycle: ", cycle)
        //console.log("scheme_pk: ", scheme_pk)
        //console.log("mod_dict.scheme: ", mod_dict.scheme)
// ---  loop through mod_dict.schemeitems_list. This contains the dicts of the schemeitems of selected scheme
        for (let i = 0, len = mod_dict.schemeitems_list.length; i < len ; i++) {
            const si_dict = mod_dict.schemeitems_list[i];
            if (!isEmpty(si_dict)) {
                const si_pk_int = get_dict_value(si_dict, ["id", "pk"], 0);
                const ppk_int = get_dict_value(si_dict, ["id", "ppk"], 0);
                const rosterdate_iso = get_dict_value(si_dict, ["rosterdate", "value"]);
                const rosterdate_dateJS = get_dateJS_from_dateISO_vanilla(rosterdate_iso)

// ---  change rosterdate with N x cycle, to let it fall within range of TblShifts
                let new_rosterdate_dateJS = rosterdate_dateJS
                if(!!cycle){
                    const date_diff = get_days_diff(rosterdate_iso, first_rosterdate_iso)
                    const floor_value = Math.floor(date_diff/cycle)
                    const add_days = (- floor_value * cycle)
                    new_rosterdate_dateJS = add_daysJS(rosterdate_dateJS, add_days)
                }
                const new_rosterdate_iso = get_dateISO_from_dateJS(new_rosterdate_dateJS)

                const team_pk = get_dict_value(si_dict, ["team", "pk"], 0);
                let team_row_id, team_abbrev = "";
                if (!!team_pk){
                    const team_dict = lookup_dict_in_list(mod_dict.teams_list, team_pk)
                    if(!isEmpty(team_dict)){
                        const team_code = get_dict_value(team_dict, ["code", "value"]);
                        team_abbrev = get_teamcode_abbrev(loc, team_code);
                    }
                    //team_row_id = get_dict_value(team_dict, [team_pk, "id", "row_id"])
                }
                const shift_pk = get_dict_value(si_dict, ["shift", "pk"], 0);
// ---  lookup cell of this rosterdate and shift_pk
                // const cell_id = "si_" + rosterdate + "_" + shift_pk.toString();
                const cell_id = "si_" + new_rosterdate_iso + "_" + shift_pk.toString();
                let cell = document.getElementById(cell_id);
                if(!!cell){
                    cell.classList.add("has_si")

// ---  add list of schemiten_id's (cell can have multiple si's)
                    const old_data_si_pk = get_attr_from_el(cell, "data-si_pk")
                    let new_data_si_pk = si_pk_int.toString();
                    if (!!old_data_si_pk) {new_data_si_pk += ";" + old_data_si_pk }
                    if (!!new_data_si_pk) { cell.setAttribute("data-si_pk", new_data_si_pk)}

                    // add list of team_id's (cell can have multiple team_id's)
                    const old_data_team_pk = get_attr_from_el(cell, "data-team_pk")
                    let new_data_team_pk = team_pk.toString();
                    if (!!old_data_team_pk) {new_data_team_pk += ";" + old_data_team_pk }
                    if (!!new_data_team_pk) {cell.setAttribute("data-team_pk", new_data_team_pk)}

// ---  add team_abbrev to cell.innerText
                    cell.innerText = set_cell_innertext(loc, cell.innerText, team_code)
                }
            }
        }
    }  //  MSO_Grid_FillTblShifts

//=========  MSO_Grid_HighlightTblShifts  ================ PR2020-03-26
    function MSO_Grid_HighlightTblShifts() {
        //console.log(" -----  MSO_Grid_HighlightTblShifts   ----")

        // mod = 'mod_shift' or 'mod_team', 'mod_scheme'
        const selected_btn = mod_dict.mode;
        //console.log("selected_btn", selected_btn)

        let tblBody = document.getElementById("id_MOS_grid_tbody_shift");
        for (let i = 0, row, len = tblBody.rows.length; i < len ; i++) {
            row = tblBody.rows[i];
            const shift_pk_str = get_attr_from_el(row, "data-shift_pk")
            const is_selected_row = (shift_pk_str === mod_dict.selected_shift_pk_str)
            for (let j = 0, cell, len = row.cells.length; j < len ; j++) {
                cell = row.cells[j];
                // lookup if selected_team_pk is in 'data=team_pk' = '2634;2713;1967'
                const team_pk_str = get_attr_from_el(cell, "data-team_pk")
                let cell_has_selected_team = false
                if(!!team_pk_str){
                    const team_pk_str_with_delim = ";" + team_pk_str + ";";
                    const lookup_pk = ";" + mod_dict.selected_team_pk_str + ";"
                    cell_has_selected_team =  (team_pk_str_with_delim.indexOf(lookup_pk) > -1);
                }
// ---  add backcolor to cells
                cell.classList.remove("grd_shift_td");
                cell.classList.remove("grd_shift_td_first");
                cell.classList.remove("grd_shift_td_first_selected");
                cell.classList.remove("grd_shift_td_selected_shift");
                cell.classList.remove("grd_shift_td_selected_team");
                let backcolor = (j === 0) ? "grd_shift_td_first" : "grd_shift_td";
                if( selected_btn === "mod_shift") {
                    backcolor = (is_selected_row) ? (j === 0) ? "grd_shift_td_first_selected" : "grd_shift_td_selected_shift"
                                            :  (j === 0) ? "grd_shift_td_first" : "grd_shift_td";
                } else if( selected_btn === "mod_team" && j > 0 && cell_has_selected_team){
                    backcolor = "grd_shift_td_selected_team";
                }
                cell.classList.add(backcolor);
            }  // for (let col_index = 0, cell_id; col_index < cycle + 1 ; col_index++)
        }  // for (let row_index = 0, len = tblBody.rows.length; row_index < len ; row_index++)
    }  // MSO_Grid_HighlightTblShifts

//=========  MSO_Grid_SchemitemClicked  ================ PR2020-03-26
    function MSO_Grid_SchemitemClicked(td_clicked, is_shift_cell) {
        //console.log("===  MSO_Grid_SchemitemClicked == ");
        //console.log("td_clicked ", td_clicked);
        //console.log("is_shift_cell ", is_shift_cell);
        //console.log("mod_dict.mode ", mod_dict.mode);

// ---  if clicked on shift column: change selected shift (only when mod_dict.mode = selected_btn = 'mod_shift'
        if(!!is_shift_cell) {
// ---  go to button shift
            if( mod_dict.mode === "mod_team") {
                mod_dict.mode = "mod_shift";
                MSO_BtnSelectClicked("mod_shift")
            }
            let tblRow = get_tablerow_selected(td_clicked)
            if(!!tblRow){
                const shift_pk = get_attr_from_el(tblRow,"data-shift_pk")
                // MSO_SelectShiftPkChanged updates selected_shift_pk_str and refreshes page
                MSO_SelectShiftPkChanged(shift_pk)
            }
        } else {
// ---  go to button team
            if( mod_dict.mode === "mod_shift") {
                mod_dict.mode = "mod_team";
                MSO_BtnSelectClicked("mod_team")
                // don't add team yet, just change to button team
            } else {
// ---  if there is a selected team:
                if(!!mod_dict.selected_team_pk_str) {
// ---  get team_abbrev from mod_dict.teams_list
                    const team_dict = lookup_dict_in_list(mod_dict.teams_list, mod_dict.selected_team_pk_str);
                    const team_code = get_dict_value(team_dict, ["code", "value"]);
                    const team_abbrev = get_teamcode_abbrev(team_code, loc);
// ---  get info from tr_clicked
                    const tr_clicked = td_clicked.parentNode
                    const shift_pk_str = get_attr_from_el(tr_clicked, "data-shift_pk");
                    const scheme_pk_str = get_attr_from_el(tr_clicked, "data-shift_ppk");
// ---  get cell_id_str and rosterdate from cell td_clicked
                    const cell_id_str = get_attr_from_el(td_clicked, "id", "");
                    const rosterdate = get_attr_from_el(td_clicked, "data-rosterdate")
                //console.log("shift_pk_str ", shift_pk_str);
                //console.log("scheme_pk_str ", scheme_pk_str);
                //console.log("cell_id_str ", cell_id_str);
                //console.log("rosterdate ", rosterdate);
                    // only if there is a rosterdate and shift_pk selected (must be always the case)
                    if(!!rosterdate && !!shift_pk_str && !!scheme_pk_str) {
                       let upload_list = [];
// ---  get si_pk_arr from td_clicked. It can be array string: '2132;2128;2128', may contain si's without team
                        const data_si_pk = get_attr_from_el(td_clicked, "data-si_pk", "");
                        //console.log("data_si_pk ", data_si_pk, typeof data_si_pk);
                        const si_pk_arr = data_si_pk.split(";");
                        //console.log("si_pk_arr ", si_pk_arr, typeof si_pk_arr);
// ---  loop through si_pk_arr, get info from mod_dict.schemeitems_list and check if team_pk = selected_team_pk_str
                        // schemeitem can have team = null. Remember first si_pk with team = null
                        let si_pk_without_team = null;  // when team is added: store team_pk in si_without_team, if any
                        let has_si_with_sel_team = false; // checks is selected team is in any of the schemeitems
                        const si_pk_arr_len = si_pk_arr.length;
                        if(!!si_pk_arr_len) {
                            for (let i = 0, team_pk_str, si_pk_str; i < si_pk_arr_len; i++) {
                                si_pk_str = si_pk_arr[i];
                            //console.log("si_pk_str ", si_pk_str, typeof si_pk_str);
                                if(!!si_pk_str){
// ---  get info from schemitem_map and check if team_pk_str = selected_team_pk_str
                                    const lookup_si_dict = lookup_dict_in_list(mod_dict.schemeitems_list, si_pk_str);
                            //console.log("lookup_si_dict ", lookup_si_dict, typeof lookup_si_dict);
                                    if(!isEmpty(lookup_si_dict)){
                                        team_pk_str = get_dict_value(lookup_si_dict, ["team", "pk"], "").toString();
                                        const team_code = get_dict_value(lookup_si_dict, ["team", "code"], "-")
                            //console.log("selected_team_pk_str ", mod_dict.selected_team_pk_str);
                            //console.log("team_pk_str ", team_pk_str, typeof team_pk_str);
                            //console.log("team_code ", team_code, typeof team_code);
                                        // if no team_pk: put si_pk in si_pk_without_team, only if si_pk_without_team has no value yet
                                        if (!team_pk_str && !si_pk_without_team) {si_pk_without_team = si_pk_str};
                            //console.log("si_pk_without_team ", si_pk_without_team, typeof si_pk_without_team);
// ---  check if team_pk_str = selected_team_pk_str
                                        if(!!team_pk_str && team_pk_str === mod_dict.selected_team_pk_str){
                            //console.log("team_pk_str === selected_team_pk_str ");
                                            if (!has_si_with_sel_team){
                                                has_si_with_sel_team = true
// ---  remove team_pk from first schemeitem, make inactive false
                                                lookup_si_dict.id.mode = "update";
                                                lookup_si_dict.team = {pk: null};
                                                lookup_si_dict.inactive = {value: false}
                                            } else {
//if there are multiple schemeitems with this team: delete other schemeitems with this team
                                                lookup_si_dict.id.mode = "delete";
                                                lookup_si_dict.team = {pk: null};
                                                lookup_si_dict.inactive = {value: false}
                                            };
                                        }
                                    }
                                }
                            }
                        }  //    if(!!si_pk_arr_len)

                //console.log("has_si_with_sel_team: ", has_si_with_sel_team);
// ---  when there are no schemeitems with this team in his cell: add schemeitem with selected_team_pk_str
                        if(!has_si_with_sel_team) {
                //console.log("si_pk_without_team: ", si_pk_without_team);
                            // if there is a schemeitem without team: add team to that schemeitem
                            if(!!si_pk_without_team){
// ---  get info from schemeitem_map and add selected_team_pk_str
                                const lookup_si_dict = lookup_dict_in_list(mod_dict.schemeitems_list, si_pk_without_team);
                                lookup_si_dict.id.mode = "update";
                                lookup_si_dict.team = {pk: mod_dict.selected_team_pk_str,
                                                       ppk: scheme_pk_str,
                                                       code: team_code}
                                lookup_si_dict.inactive = {value: false}
                //console.log("lookup_si_dict: ", lookup_si_dict);
                            } else {
// otherwise: create new schemeitm
                                id_new = id_new + 1
                                const pk_new = "new" + id_new.toString()
                                const shift_option ="schemeshift";
                                let schemeitem_dict = {id: {pk: pk_new,
                                                            ppk: scheme_pk_str,
                                                            table: "schemeitem",
                                                            mode: "create",
                                                            shiftoption: shift_option},
                                                        rosterdate: {value: rosterdate},
                                                        team:  {pk: mod_dict.selected_team_pk_str,
                                                                ppk: scheme_pk_str,
                                                                code: team_code},
                                                        shift: {pk: shift_pk_str,
                                                                ppk: scheme_pk_str},
                                                        inactive: {value: false}
                                                        };
                //console.log("schemeitem_dict: ", schemeitem_dict);
                                mod_dict.schemeitems_list.push( schemeitem_dict);
                            }
                        }
// ---  fill shifts table
                        MSO_Grid_FillTblShifts(scheme_pk_str);
                        MSO_Grid_FillTblShifts(scheme_pk_str);
                        MSO_Grid_HighlightTblShifts();

                    }  // if(!!rosterdate && !!shift_pk)
                }  // if(!!selected_team_pk_str)
            }  // if( mod_dict.mode === "mod_shift") {
        }  // if(!!is_shift_cell) {
    }  // MSO_Grid_SchemitemClicked
//############################################################################


// +++++++++ MOD SELECT EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++ PR2019-12-29
//=========  MSE_Open  ================ PR2019-11-06
    function MSE_Open(el_input) {
        //console.log(" -----  MSE_Open   ----")

        mod_employee_dict = {};

// get teammember pk etc from tr_selected, store in mod_employee_dict
        let tblRow = get_tablerow_selected(el_input);
        const row_id_str = get_attr_from_el_str(tblRow, "id")
        const data_table = get_attr_from_el(tblRow, "data-table")
        const teammember_pk = get_attr_from_el(tblRow, "data-pk");
        const teammember_ppk = get_attr_from_el(tblRow, "data-ppk");

// get field info from el_input (employee or replacemenet)
        const data_field = get_attr_from_el(el_input, "data-field")
        const employee_pk = get_attr_from_el(el_input, "data-pk");
        const employee_ppk = get_attr_from_el(el_input, "data-ppk");

        //console.log("employee_map: ", employee_map)
        //console.log("employee_pk: ", employee_pk)
        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
        const employee_code = get_dict_value(employee_dict, ["code", "value"]);

        mod_employee_dict = {row_id: row_id_str, data_table: data_table,
                            sel_teammember: {pk: teammember_pk, ppk: teammember_ppk},
                            sel_employee: {field: data_field, pk: employee_pk, ppk: employee_ppk, code: employee_code}};
// ---  put employee name in header
        let el_header = document.getElementById("id_ModSelEmp_hdr_employee")
        let el_div_remove = document.getElementById("id_MSE_div_btn_remove")
        if (!!employee_code){
            el_header.innerText = employee_code
            el_div_remove.classList.remove(cls_hide)
        } else {
// ---  or header "select employee'
            el_header.innerText = loc.Select_employee + ":";
            el_div_remove.classList.add(cls_hide)
        }

// remove values from el_mod_employee_input
        let el_mod_employee_input = document.getElementById("id_MSE_input_employee")
        el_mod_employee_input.value = null
        const employee_pk_int = Number(employee_pk);
        MSE_FillSelectTableEmployee(employee_pk_int);

       //.log("employee_pk_int: ", employee_pk_int)
// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

// ---  show modal
        $("#id_mod_select_employee").modal({backdrop: true});

    };  // MSE_Open

//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        //console.log( "===== ModEmployeeSelect ========= ");
        // called by MSE_FillSelectTableEmployee in this js

        if(!!tblRow) {
// get employee_dict from employee_map
            const selected_employee_pk = get_attr_from_el_int(tblRow, "data-pk")
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk);
            if (!isEmpty(map_dict)){
// get code_value from employee_dict, put it in mod_employee_dict and el_input_employee
                const selected_employee_ppk = get_dict_value(map_dict, ["id", "ppk"])
                const selected_employee_code = get_dict_value(map_dict, ["code", "value"])

                //mod_employee_dict["sel_employee"]["update"] = true;
                mod_employee_dict["sel_employee"]["pk"] = selected_employee_pk;
                mod_employee_dict["sel_employee"]["ppk"] = selected_employee_ppk;
                mod_employee_dict["sel_employee"]["code"] = selected_employee_code;

// put code_value in el_input_employee
                document.getElementById("id_MSE_input_employee").value = selected_employee_code
// save selected employee
                MSE_Save("update")
            }
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//========= ModEmployeeChanged  ============= PR2019-12-29
    function ModEmployeeChanged(tp_dict) {
        //console.log("XXXXXXXXXXXXXXXXX === ModEmployeeChanged ===" );
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
                MSO_TimepickerResponse(tp_dict);
            } else {

                upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};
                //console.log("upload_dict", upload_dict);

                const tblName = "order";
                const map_id = get_map_id(tblName, get_dict_value(tp_dict, ["id", "pk"], "").toString());
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
                            //UpdateFromResponse????(tblName, update_list)
                        }

                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

             }  //    if (mode ==="shifts")
    }  // if("save_changes" in tp_dict) {
 }  // ModEmployeeChanged

//=========  MSE_FilterEmployee  ================ PR2019-11-06
    function MSE_FilterEmployee(option, event_key) {
        //console.log( "===== MSE_FilterEmployee  ========= ", option);

        let el_input = document.getElementById("id_MSE_input_employee")
        //console.log( el_input );
        // saving when only 1 employee found goes in 2 steps:
        // first step is adding "data-quicksave") === "true" to el_input
        // second step: if then ENTER is clicked the employee will be saved

        if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
            MSE_Save("update")
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
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_employee) {
                skip_filter = true
            } else {
                filter_mod_employee = new_filter.toLowerCase();
            }
        }

        let has_selection = false, has_multiple = false;
        let select_value, selected_employee_pk, select_parentpk;
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
// hide current employee -> is already filtered out in MSE_FillSelectTableEmployee
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
                        selected_employee_pk = get_attr_from_el_int(tblRow, "data-pk")
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {

// if only one employee in filtered list: put value in el_input /  mod_employee_dict
        if (has_selection && !has_multiple ) {

// get employee_dict from employee_map
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk);
            if (!isEmpty(map_dict)){
// get code_value from employee_dict, put it in mod_employee_dict and el_input_employee
                const selected_employee_ppk = get_dict_value(map_dict, ["id", "ppk"])
                const selected_employee_code = get_dict_value(map_dict, ["code", "value"])
                mod_employee_dict["sel_employee"]["update"] = true;
                mod_employee_dict["sel_employee"]["pk"] = selected_employee_pk;
                mod_employee_dict["sel_employee"]["ppk"] = selected_employee_ppk;
                mod_employee_dict["sel_employee"]["code"] = selected_employee_code;
// put code_value in el_input_employee
                el_input.value = selected_employee_code
// data-quicksave = true enables saving by clicking 'Enter'
                el_input.setAttribute("data-quicksave", "true")
// save selected employee .. not here, but at beginning of this function when data-quicksave = true
                //MSE_Save("update")
            }
        }
    }; // MSE_FilterEmployee

//=========  MSE_Save  ================ PR2019-12-30
    function MSE_Save(mode) {
        //console.log("========= MSE_Save ===", mode );
        //console.log("mod_employee_dict: ", mod_employee_dict);
        // mode = 'delete' when clicked on 'remove' in ModEmployee, otherwise mode = 'update'

    // --- lookup teammember_dict in mod_dict.teammembers_list
        const sel_teammember_pk_str = get_dict_value(mod_employee_dict, ["sel_teammember", "pk"])
        const tm_dict = lookup_dict_in_list(mod_dict.teammembers_list, sel_teammember_pk_str);
        if(!isEmpty(tm_dict)) {
// --- put new pk in tm_dict, or put null when mode = 'delete'
            let employee_pk = null, employee_ppk = null, employee_code = null;
            const sel_employee_dict = get_dict_value(mod_employee_dict, ["sel_employee"])
            const field = get_dict_value(sel_employee_dict, ["field"])  // 'employee' or 'replacement
            if(mode !== "delete"){
                employee_pk = get_dict_value(sel_employee_dict, ["pk"]);
                employee_ppk = get_dict_value(sel_employee_dict, ["ppk"]);
                employee_code = get_dict_value(sel_employee_dict, ["code"]);
            }
            tm_dict[field] = { pk: employee_pk, ppk: employee_ppk, code: employee_code}

// ---  add mode='upate' to teammember.id, except when mode = 'create or 'delete'
            const skip_mode_update = (!!tm_dict.id.mode && ["create", "delete"].indexOf(tm_dict.id.mode) > -1 )
            if(!skip_mode_update) {tm_dict.id.mode = "update"};
        }  // if(!isEmpty(tm_dict))

        //console.log( "mod_dict: ", mod_dict);
// --- refresh teammember table
        MSO_FillTableTeammember("MSE_Save");

// ---  hide modal
        $("#id_mod_select_employee").modal("hide");
    } // MSE_Save

//=========  ModEmployeeDeleteOpen  ================ PR2019-09-15
    function ModXXXEmployeeDeleteOpen(tr_clicked, mode) {
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
    function ModXXXEmployeeDeleteSave() {
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

//========= MSE_FillSelectTableEmployee  ============= PR2019-08-18
    function MSE_FillSelectTableEmployee(selected_employee_pk) {
        //console.log( "=== MSE_FillSelectTableEmployee ");
        // called by MSE_Open in this modemployee.js

        const caption_one = loc.Select_employee + ":";
        const caption_none = loc.No_employees;

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
                const code_value = get_dict_value(item_dict, ["code", "value"], "")
                const is_inactive = get_dict_value(item_dict, ["inactive", "value"], false)

//- skip selected employee, also skip inactive employees
                if (pk_int !== selected_employee_pk && !is_inactive){

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
                    tblRow.addEventListener("click", function() {
                        ModEmployeeSelect(tblRow)
                    }, false )

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
    } // MSE_FillSelectTableEmployee

//>>>>>>>>>>> MOD PERIOD >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//=========  ModPeriodOpen  ================ PR2019-10-28
    function ModPeriodOpen() {
        //console.log(" -----  ModPeriodOpen   ----")
        // when clicked on delete btn in form tehre is no tr_selected, use selected_customer_pk
        // https://stackoverflow.com/questions/7972446/is-there-a-not-in-operator-in-javascript-for-checking-object-properties/12573605#12573605

        //console.log("selected_period:", selected_period)
        const period_tag = get_dict_value_by_key(selected_period, "period_tag")
        if(!period_tag) { period_tag = "tweek" }
        const period_datefirst_iso = get_dict_value_by_key(selected_period, "period_datefirst")
        const period_datelast_iso = get_dict_value_by_key(selected_period, "period_datelast")

        mod_dict = selected_period;

    // highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };

    // set value of date imput elements
        const is_custom_period = (period_tag === "other");
        document.getElementById("id_mod_period_datefirst").value = period_datefirst_iso;
        document.getElementById("id_mod_period_datelast").value = period_datelast_iso;
        let el_mod_period_tblbody = document.getElementById("id_modperiod_selectperiod_tblbody");

    // set min max of input fields
        ModPeriodDateChanged("datefirst");
        ModPeriodDateChanged("datelast");

        document.getElementById("id_mod_period_datefirst").disabled = !is_custom_period
        document.getElementById("id_mod_period_datelast").disabled = !is_custom_period

        // ---  show modal, set focus on save button
        $("#id_mod_period").modal({backdrop: true});
    };  // ModPeriodOpen

//=========  ModPeriodSelectPeriod  ================ PR2020-01-09
    function ModPeriodSelectPeriod(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelectPeriod ========= ", selected_index);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)

    // add period_tag to mod_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_dict["period_tag"] = period_tag;

    // enable date input elements, give focus to start
            let el_datefirst = document.getElementById("id_mod_period_datefirst");
            let el_datelast = document.getElementById("id_mod_period_datelast");

            el_datefirst.disabled = (period_tag !== "other");
            el_datelast.disabled = (period_tag !== "other");

            if (period_tag === "other") {
                el_datefirst.focus();
            } else {
                //let lst = []
                //if (period_tag === "tweek") {
                //    lst = get_thisweek_monday_sunday_iso();
                //} else if (period_tag === "nweek") {
                //    lst = get_nextweek_monday_sunday_iso();
                //} else if (period_tag === "tmonth") {
                //    lst = get_thismonth_first_last_iso();
                //} else if (period_tag === "nmonth") {
                //    lst = get_nextmonth_first_last_iso();
                //}
                //el_datefirst.value = lst[0];
                //el_datelast.value = lst[1];
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

        const period_tag = get_dict_value_by_key(mod_dict, "period_tag", "tweek");

        selected_period = {period_tag: period_tag}
        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {selected_period["period_datefirst"] = datefirst};
            if (!!datelast) {selected_period["period_datelast"] = datelast};
        }
        // send 'now' as array to server, so 'now' of local computer will be used
        selected_period["now"] = get_now_arr();

// ---  upload new setting
        // settings are saved in function customer_planning, function 'period_get_and_save'
        let customer_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_shifts_without_employee: true
        };
        let employee_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_shifts_without_employee: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };
        document.getElementById("id_hdr_text").innerText = loc.Period + "..."

        let datalist_request = {planning_period: selected_period,
                                //customer_planning: customer_planning_dict,
                                //employee_planning: employee_planning_dict,

                                employee_planningNEW: {mode: "get"}
        };

        DatalistDownload(datalist_request, "ModPeriodSave");

        $("#id_mod_period").modal("hide");
    }

//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        //console.log("===  CreateTblModSelectPeriod == ");
        //console.log(period_dict);
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
//>>>>>>>>>>> END MOD PERIOD >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// +++++++++++++++++ MODAL CONFIRM +++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-06-23 PR2020-08-26
    function ModConfirmOpen(mode, tblName, el_input) {
        //console.log(" -----  ModConfirmOpen   ----")
        //console.log("mode", mode, "tblName", tblName)
        // values of mode are : "delete", "inactive"
        if(!tblName) { tblName = selected_btn };

// ---  get selected_pk from tblRow or selected_customer_pk / selected_order_pk
        let selected_pk = null;
        mod_dict = {};

        const tblRow = get_tablerow_selected(el_input);
        if(tblRow){
            // tblRow only exists when clicked on inactive/delete btn in customer/order tblrow or selectrow
            selected_pk = get_attr_from_el(tblRow, "data-pk")
        } else {
            // // tblRow is undefined when clicked on delete btn in submenu btn or form (no inactive btn)
            selected_pk = (tblName === "customer") ? selected_customer_pk :
                          (tblName === "order") ? selected_order_pk : null;
        }

// ---  get info from data_map
        const data_map = (tblName === "customer") ? customer_map :
                         (tblName === "order") ? order_map : null;
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, selected_pk)
        const ppk_int = (tblName === "customer") ? map_dict.comp_id : (tblName === "order") ? map_dict.c_id : null;
        const code_value = (tblName === "order") ? map_dict.c_o_code : map_dict.code;

        const has_selected_item = (!isEmpty(map_dict));
        if(has_selected_item){
// ---  create mod_dict
            mod_dict = {pk: map_dict.id,
                        ppk: ppk_int,
                        mapid: map_dict.mapid,
                        table: tblName,
                        mode: mode,
                        inactive: map_dict.inactive};
        }

// ---  put header text in modal form
        const header_text = (mode === "delete") ?
                                (tblName === "customer") ? loc.Delete_customer :
                                (tblName === "order") ? loc.Delete_order : null :
                            (mode === "inactive") ?
                                (tblName === "customer") ?
                                    (map_dict.inactive) ? loc.Make_customer_active : loc.Make_customer_inactive :
                                (tblName === "order") ?
                                    (map_dict.inactive) ? loc.Make_order_active : loc.Make_order_inactive : null : null;

        document.getElementById("id_confirm_header").innerText = header_text;

// ---  put msg text in modal form
        let msg_01_txt = "", msg_02_txt = "";
        if(has_selected_item){
            const txt_01 = (tblName === "customer") ? loc.Customer + " '" + map_dict.code + "' " :
                           (tblName === "order") ? loc.Order + " '" + map_dict.c_o_code + "' " : "";
            const txt_02 = (mode === "delete") ?  loc.will_be_deleted :
                           (mode === "inactive") ?
                                (map_dict.inactive) ? loc.will_be_made_active : loc.will_be_made_inactive : "";


            msg_01_txt = txt_01 + " " + txt_02;
            msg_02_txt = loc.Do_you_want_to_continue
        } else {
            msg_01_txt = (tblName === "customer") ? loc.No_customer_selected :
                           (tblName === "order") ? loc.No_order_selected: "";
        }
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        document.getElementById("id_confirm_msg02").innerText = msg_02_txt;
        document.getElementById("id_confirm_msg03").innerText = null;

// ---  set btn text, color and hide
        let el_btn_save = document.getElementById("id_confirm_btn_save");
        el_btn_save.innerText = (mode === "delete") ? loc.Yes_delete :
                                    (map_dict.inactive) ? loc.Yes_make_active : loc.Yes_make_inactive;

        add_or_remove_class (el_btn_save, cls_hide, !has_selected_item);

        add_or_remove_class (el_btn_save, "btn-primary", (mode !== "delete"));
        add_or_remove_class (el_btn_save, "btn-outline-danger", (mode === "delete"));

        document.getElementById("id_confirm_btn_cancel").innerText = (has_selected_item) ? loc.Cancel : loc.Close;

// ---  set focus to cancel button
        setTimeout(function (){
            document.getElementById("id_confirm_btn_cancel").focus();
        }, 50);

// ---  show modal
        $("#id_mod_confirm").modal({backdrop: true});

    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23 PR2020-08-26
    function ModConfirmSave() {
        console.log(" --- ModConfirmSave --- ");
        console.log("mod_dict: ", mod_dict);

        let tblRow = document.getElementById(mod_dict.mapid);

        let upload_dict = {id: {pk: mod_dict.pk,
                                ppk: mod_dict.ppk,
                                mapid: mod_dict.mapid,
                                table: mod_dict.table}
                           };

// ---  when delete: make tblRow red, before uploading
        if (mod_dict.mode === "delete"){
            upload_dict.id.delete = true
            ShowErrorRow(tblRow, cls_selected )
        } else if (mod_dict.mode === "inactive"){
// toggle inactive
            mod_dict.inactive = !mod_dict.inactive;
            upload_dict.inactive = {value: mod_dict.inactive, update: true};
            // change inactive icon, before uploading
// ---  toggle inactive icon, before uploading
            let el_input = tblRow.querySelector("[data-field=inactive]");
            let el_img = el_input.children[0];
            if (el_img){
                add_or_remove_class (el_img, "inactive_1_3", mod_dict.inactive, "inactive_0_2");
            }
      }

// ---  hide modal
        $("#id_mod_confirm").modal("hide");

// ---  Upload Changes
        UploadChanges(upload_dict, url_customer_upload);
    }

//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= ResetFilterRows  ============  PR2019-10-26 PR2020-08-26
    function ResetFilterRows() {
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_dict = {};

// ---  reset selected_customer_pk, selected_order_pk, remove highlighted fro msleected row
        selected_customer_pk = null;
        selected_order_pk = null;
        DeselectHighlightedTblbody(tblBody_datatable, cls_selected);

        const tblName = (selected_btn === "customer") ? "customer" :
                        (selected_btn === "order") ? "order" : null;

        if (tblName){

// reset filter of tblHead
            let tblHead = document.getElementById("id_thead_" + tblName)
            if(!!tblHead){b_reset_tblHead_filterRow(tblHead)}

//--- reset filter of select table
            //t_reset_tblSelect_filter ("id_filter_select_input", "id_filter_select_btn", imgsrc_inactive_lightgrey)

            //t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)

// --- save selected_customer_pk in Usersettings
            const upload_dict = {selected_pk: {sel_customer_pk: selected_customer_pk, sel_order_pk: selected_order_pk}};
            UploadSettings (upload_dict, url_settings_upload)

//--- reset highlighted
            // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
            if(tblName === "customer"){
          //      ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
            } else if(tblName === "order"){
          //      ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
            }

            UpdateHeaderText();
        }  //  if (!!tblName){
    }  // function ResetFilterRows

//========= HandleFilterInactive  =====  PR2020-08-30
    function HandleFilterInactive(el_input, index) {
        console.log( "===== HandleFilterInactive  ========= ");

        filter_inactive = !filter_inactive;
        const el_img = el_input.children[0];
        add_or_remove_class(el_img, "inactive_0_2", filter_inactive, "inactive_1_3")

        Filter_TableRows();
    };

//========= HandleFilterKeyup  =====  PR2020-08-27
    function HandleFilterKeyup(el, index, event_key) {
        //console.log( "===== HandleFilterKeyup  ========= ");
        //console.log( "el_key", el_key);

        //console.log( "el.value", el.value, index, typeof index);
        //console.log( "el.filter_dict", filter_dict, typeof filter_dict);
        // skip filter if filter value has not changed, update filter_dict[index]

        let skip_filter = false
        if (event_key === "Escape") {
            filter_dict = {}

            let tblRow = get_tablerow_selected(el);
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(el){
                    el.value = null;
                }
            }
        } else {
            let filter_value = (filter_dict[index]) ? filter_dict[index][1] : 0;
            let new_value = el.value.toString();
            //console.log( "new_value: <" + new_value + ">");
            if (!new_value){
                if (!filter_value){
                    //console.log( "skip_filter = true");
                    skip_filter = true
                } else {
                    //console.log( "delete filter_dict");
                    delete filter_dict[index];
                    //console.log( "deleted filter : ", filter_dict);
                }
            } else {
                new_value = new_value.toLowerCase()
                if (new_value === filter_value) {
                    skip_filter = true
                    //console.log( "skip_filter = true");
                } else {
                    filter_dict[index] = ["text", new_value]
                    //console.log( "filter_dict[index]: ", filter_dict[index]);
                }
            }
        }
        //console.log( "skip_filter: ", skip_filter);
        if (!skip_filter) {
            Filter_TableRows();
        } //  if (!skip_filter) {
    }; // function HandleFilterKeyup

//========= Filter_TableRows  =====  PR2020-08-27
    function Filter_TableRows() {  // PR2019-06-09
        //console.log( "===== Filter_TableRows=== ");
        const len = tblBody_datatable.rows.length;
        if (len){
            for (let i = 0, tblRow, show_row; tblRow = tblBody_datatable.rows[i]; i++) {
                show_row = ShowTableRow_dict(tblRow)
                add_or_remove_class(tblRow, cls_hide, !show_row)
            }
        };
    }; // Filter_TableRows

//========= ShowTableRow_dict  =====  PR2020-08-27
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
            const is_inactive = (!!get_attr_from_el_int(tblRow, "data-inactive"));
            hide_row = (filter_inactive && is_inactive)
            Object.keys(filter_dict).forEach(function(index_str) {
                if(!hide_row){
                    const col_index = Number(index_str);
                    const filter_arr = filter_dict[index_str];
                    const filter_tag = filter_arr[0];
                    const filter_value = filter_arr[1];
                    console.log( "filter_arr", filter_arr, typeof filter_arr);
                    console.log( "filter_tag", filter_tag, typeof filter_tag);
                    console.log( "filter_value", filter_value, typeof filter_value);

                    if(filter_tag === "text"){
                        const filter_blank = (filter_value ==="#")
                        let tbl_cell = tblRow.cells[col_index];
                        if (tbl_cell){
                            let el = tbl_cell; //.children[0];
                            if (el) {
                        // skip if no filter om this column
                                if(filter_value){
                        // get value from el.value, innerText or data-value
                                    if(col_index === 10){
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
                    }  // if(col_index === 10){
                }  // if(!hide_row){
            });  // Object.keys(filter_dict).forEach(function(key) {
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

// +++++++++++++++++ END FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++


////////////////////////////////


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
            //t_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            //(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );
    // reset filter tblBody_datatable (show all orders, therefore dont filter on selected_customer_pk
            //t_Filter_TableRows(tblBody_datatable, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);

// filter selecttable customer and order
            t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)
            t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter


// +++++++++++++++++ END FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//##################################################################################
// +++++++++++++++++ PRINT PLANNING ++++++++++++++++++++++++++++++++++++++++++++++++++
    function PrintPlanning(dont_download){
        //console.log(" === PrintPlanning ===")

        const option = "preview"
        PrintEmployeeOrOrderPlanning(loc, planning_agg_dict, option, true)  // true = is_order_planning
    }

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++
    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")

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
        //console.log("=== FillExcelRows  =====")
        let ws = {}

// title row
        let title_value = display_planning_period (selected_period, loc);
        ws["A1"] = {v: title_value, t: "s"};
// header row
        const header_rowindex = 3
        let headerrow = [loc.Customer, loc.Order, loc.Employee, loc.Date, loc.Shift,  loc.Start_Endtime, loc.Working_hours]
        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }
        //console.log("------------------ws:", ws)

// --- loop through rows of table planning
        const cell_types = ["s", "s", "s", "d", "s", "s", "n"]

        const first_row = 4
        const row_count = tblBody_datatable.rows.length;
        const last_row = first_row  + row_count;
        for (let i = 0; i < row_count; i++) {
            const row = tblBody_datatable.rows[i];
            //console.log ("row: " , row);
            for (let j = 0, len = row.cells.length, cell_index, cell_dict; j < len; j++) {
                const col = row.cells[j];
                cell_index = String.fromCharCode(65 + j) + (i + first_row).toString()

                let excel_cell_value = null;
                if ([0, 1, 4, 5].indexOf( j ) > -1){
                    excel_cell_value = col.children[0].value;
                } else if (j === 2){
                    excel_cell_value = col.children[0].title;
                    //console.log("excel_cell_value: ", excel_cell_value , typeof excel_cell_value)
                    if(!excel_cell_value){
                        excel_cell_value = col.children[0].value;
                    }
                } else if (j === 3){
                    excel_cell_value = get_attr_from_el( col.children[0], "data-value")
                } else if (j === 6){
                    const total_hours = get_attr_from_el( col.children[0], "data-total_duration") / 60
                    excel_cell_value = total_hours;
                }
                ws[cell_index] = {v: excel_cell_value, t: cell_types[j]};

                if (j === 6){
                    ws[cell_index]["z"] = "0.00"
                }
            }
        }
        ws["!ref"] = "A1:G" + last_row.toString();
        ws['!cols'] = [
                {wch:20},
                {wch:20},
                {wch:20},
                {wch:20},
                {wch:20},
                {wch:20},
                {wch:20}
            ];

        return ws;
    }  // FillExcelRows
// ##################################################################################
}); //$(document).ready(function()