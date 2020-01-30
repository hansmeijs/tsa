// PR2019-6-16
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";
        //console.log("Customers document.ready");

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";

        const cls_visible_hide = "visibility_hide";

        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_bc_yellow_light = "tsa_bc_yellow_light";
        const cls_bc_yellow = "tsa_bc_yellow";

        const cls_selected = "tsa_tr_selected";
        const cls_btn_selected = "tsa_btn_selected";
        const cls_error = "tsa_tr_error";
        const cls_bc_transparent = "tsa_bc_transparent";

        let user_lang = "", comp_timezone = "" , interval = 15, timeformat = "24h";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
        const url_customer_upload = get_attr_from_el(el_data, "data-customer_upload_url");
        const url_pricerate_upload = get_attr_from_el(el_data, "data-pricerate_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive_grey = get_attr_from_el(el_data, "data-imgsrc_inactive_grey");
        const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");

        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");

        const imgsrc_billable_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_billable_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")
        const imgsrc_billable_cross_lightgrey = get_attr_from_el(el_data, "data-imgsrc_cross_lightgrey")
        const imgsrc_billable_grey = (user_lang === "en") ?
            get_attr_from_el(el_data, "data-imgsrc_b_grey") :
            get_attr_from_el(el_data, "data-imgsrc_d_grey");
        const imgsrc_billable_black = (user_lang === "en") ?
            get_attr_from_el(el_data, "data-imgsrc_b_black") :
            get_attr_from_el(el_data, "data-imgsrc_d_black");

// ---  id of selected customer
        const id_sel_prefix = "sel_";
        let selected_customer_pk = 0;
        let selected_order_pk = 0;

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

// for report
        let planning_display_duration_total = ""; // stores total hours, calculated when creating planning_customer_map

// locale_dict with translated text
        let loc = {};

        let selected_planning_period = {};
        let selected_calendar_period = {};
        let mod_upload_dict = {};
        let mod_employee_dict = {}; // only used for mod employee form
        let quicksave = false

        let filter_select = "";
        let filter_show_inactive = false;
        let filter_dict = {};
        let filter_mod_employee = "";

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const tbl_col_count = {
            customer: 4,
            order: 8,
            planning: 7};
        const thead_text = {
            customer: ["Short_name", "Customer_name", "Identifier", ""],
            order: ["Customer", "Order_code", "Order_name", "Start_date", "End_date", "Identifier", "", ""],
            planning: ["Customer", "Order", "Employee", "Date", "Shift", "Start_Endtime", "Working_hours"]}
        const field_names = {
            customer: ["code", "name", "identifier", "delete"],
            order: ["customer", "code", "name", "datefirst", "datelast", "identifier", "inactive", "delete"],
            planning: ["customer", "order", "employee", "rosterdate", "shift", "offsetstart", "timeduration"]}
        const field_tags = {
            customer: ["input", "input", "input", "a"],
            order: ["input", "input", "input", "input", "input", "input", "a", "a"],
            planning: ["input", "input", "input", "input", "input", "input", "input"]}
        const field_width = {
            customer: ["180", "220", "120", "032"],
            order: ["180", "180", "180", "120", "120", "120", "032", "032"],
            planning: ["120", "120", "180", "120", "120", "120", "090"]}
        const field_align = {
            customer: ["left", "left", "left", "right"],
            order: ["left", "left","left", "left", "left", "left", "right", "right"],
            planning: ["left", "left", "left", "left", "left", "right", "right"]}

        const fieldsettings_teammember = {tblName: "teammember", colcount: 5,
                                caption: ["Employee", "Start_date", "End_date", "Replacement_employee"],
                                name: ["employee", "datefirst", "datelast", "replacement", "delete"],
                                tag: ["div", "input", "input", "div", "a"],
                                width: ["150", "150", "150", "150", "032"],
                                align: ["left", "left", "left", "left", "right"]}

// get elements

        let tBody_customer = document.getElementById("id_tbody_customer");
        let tBody_order = document.getElementById("id_tbody_order");
        let tBody_planning = document.getElementById("id_tbody_planning");

        let tblBody_select_customer = document.getElementById("id_tbody_select_customer");
        let tblBody_select_order = document.getElementById("id_tbody_select_order");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === reset filter when clicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

// ---  add 'keyup' event handler to filter orders and customers
        //let el_filter_select = document.getElementById("id_filter_select_input")
        //    el_filter_select.addEventListener("keyup", function() {
        //        setTimeout(function() {HandleSelect_Filter()}, 50)});

       // let el_sel_inactive = document.getElementById("id_sel_inactive")
       //     el_sel_inactive.addEventListener("click", function() {HandleFilterInactive(el_sel_inactive)});

// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const data_mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSelect(data_mode, false)}, false )
        }

// ---  create EventListener for buttons in calendar (goto prev week, this week, nextweek)
        btns = document.getElementById("id_btns_calendar").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnCalendar(mode)}, false )
        }

// ===================== event handlers for MODAL ===================================

// ---  MOD SHIFT ------------------------------------
        let el_modshift_btn_save = document.getElementById("id_modshift_btn_save");
            el_modshift_btn_save.addEventListener("click", function() {MSO_Save("save")}, false );
        let el_modshift_btn_delete = document.getElementById("id_modshift_btn_delete");
            el_modshift_btn_delete.addEventListener("click", function() {MSO_Save("delete")}, false );

// ---  put datefirst datelast in input boxes
        let el_modshift_datefirst = document.getElementById("id_modshift_datefirst")
            el_modshift_datefirst.addEventListener("change", function() {MSO_SchemeDateChanged("datefirst")}, false );
        let el_modshift_datelast = document.getElementById("id_modshift_datelast")
            el_modshift_datelast.addEventListener("change", function() {MSO_SchemeDateChanged("datelast")}, false );

        let el_modshift_btn_shift = document.getElementById("id_modshift_btn_shift")
            el_modshift_btn_shift.addEventListener("click", function() {MSO_BtnShiftTeamClicked("mod_shift")}, false );
        let el_modshift_btn_employees = document.getElementById("id_modshift_btn_employees");
            el_modshift_btn_employees.addEventListener("click", function() {MSO_BtnShiftTeamClicked("mod_team")}, false );

        let el_modshift_shiftcode = document.getElementById("id_modshift_shiftcode");
            el_modshift_shiftcode.addEventListener("change", function() {MSO_ShiftcodeOrTeamcodeChanged(el_modshift_shiftcode)}, false)
        let el_modshift_selectshift = document.getElementById("id_modshift_selectshift")
            el_modshift_selectshift.addEventListener("change", function() {MSO_SelectShiftChanged(el_modshift_selectshift)}, false)
        let el_modshift_teamcode = document.getElementById("id_modshift_teamcode");
            el_modshift_teamcode.addEventListener("change", function() {MSO_ShiftcodeOrTeamcodeChanged(el_modshift_teamcode)}, false)
        let el_modshift_selectteam = document.getElementById("id_modshift_selectteam")
            el_modshift_selectteam.addEventListener("change", function() {MSO_SelectTeamChanged()}, false)

        let el_modshift_offsetstart = document.getElementById("id_modshift_offsetstart")
            el_modshift_offsetstart.addEventListener("click", function() {MSO_TimepickerOpen(el_modshift_offsetstart, "modshift")}, false );
        let el_modshift_offsetend = document.getElementById("id_modshift_offsetend");
            el_modshift_offsetend.addEventListener("click", function() {MSO_TimepickerOpen(el_modshift_offsetend, "modshift")}, false );
        let el_modshift_breakduration = document.getElementById("id_modshift_breakduration");
            el_modshift_breakduration.addEventListener("click", function() {MSO_TimepickerOpen(el_modshift_breakduration, "modshift")}, false );
        let el_modshift_timeduration = document.getElementById("id_modshift_timeduration");
            el_modshift_timeduration.addEventListener("click", function() {MSO_TimepickerOpen(el_modshift_timeduration, "modshift")}, false );
        let el_modshift_onceonly = document.getElementById("id_modshift_onceonly");
            el_modshift_onceonly.addEventListener("change", function() {MSO_OnceOnly()}, false );

// ---  create EventListener for buttons weekdays in modShft
        btns = document.getElementById("id_modshift_weekdays").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            btn.addEventListener("click", function() {MSO_BtnWeekdayClicked(btn)}, false )
        }
        let el_modshift_publicholiday = document.getElementById("id_modshift_publicholiday");
            el_modshift_publicholiday.addEventListener("change", function() {MSO_PublicholidayChanged("excludepublicholiday")}, false );
        let el_modshift_companyholiday = document.getElementById("id_modshift_companyholiday");
            el_modshift_companyholiday.addEventListener("change", function() {MSO_PublicholidayChanged("excludecompanyholiday")}, false );

// ---  MOD EMPLOYEE ------------------------------------
        let el_mod_employee_body = document.getElementById("id_mod_employee_body");
        document.getElementById("id_mod_employee_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() {
                    ModEmployeeFilterEmployee("filter", event.key)
                }, 50)});

        document.getElementById("id_mod_employee_btn_save").addEventListener("click", function() {ModEmployeeSave("update")}, false);
        document.getElementById("id_mod_employee_btn_remove").addEventListener("click", function() {ModEmployeeSave("delete")}, false);

// ---  MOD PERIOD ------------------------------------
// ---  header select period
        document.getElementById("id_hdr_period").addEventListener("click", function() {ModPeriodOpen()});
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
        let el_confirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_confirm_btn_save.addEventListener("click", function() {ModConfirmSave()});
// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )
// ---  customer form
        let el_form_cust_code = document.getElementById("id_form_code");
             el_form_cust_code.addEventListener("change", function() {UploadFormChanges(el_form_cust_code)}, false);
        let el_form_cust_name = document.getElementById("id_form_name");
             el_form_cust_name.addEventListener("change", function() {UploadFormChanges(el_form_cust_name)}, false);
        let el_form_btn_delete = document.getElementById("id_form_btn_delete");
            el_form_btn_delete.addEventListener("click", function() {ModConfirmOpen("delete", el_form_btn_delete)});
        document.getElementById("id_form_btn_add").addEventListener("click", function() {HandleCustomerAdd()});

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
    // hide msgbox
            el_msg.classList.remove("show");
    // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                // don't reset selected_customer_pk or  selected_order_pk
                DeselectHighlightedRows(tr_selected)}
    // close el_popup_date_container
            let close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_date
            if (event.target.classList.contains("input_popup_date")) {
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_date_container.contains(event.target) && !event.target.classList.contains("popup_close")){
                close_popup = false
            }
            if (close_popup) {
                el_popup_date_container.classList.add(cls_hide)
            };
        }, false);

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_cust"));

// ---  download settings and datalists
        const now_arr = get_now_arr_JS();
        const datalist_request = {
            setting: {page_customer: {mode: "get"},
                      selected_pk: {mode: "get"}},
            locale: {page: "customer"},
            quicksave: {mode: "get"},
            planning_period: {get: true, now: now_arr},
            calendar_period: {get: true, now: now_arr},
            company: {value: true},
            customer: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            scheme: {istemplate: false, inactive: null, issingleshift: null},
            schemeitem: {customer_pk: selected_customer_pk}, // , issingleshift: false},
            shift: {istemplate: false},
            team: {istemplate: false},
            teammember: {datefirst: null, datelast: null, employee_nonull: false},
            employee: {inactive: null}
        };

        DatalistDownload(datalist_request);

//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++
//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
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
                    refresh_locale(response["locale_dict"]);
                }
                // setting_dict must come after locale_dict, where weekday_list is loaded
                if ("setting_dict" in response) {
                    UpdateSettings(response["setting_dict"])
                }
                if ("quicksave" in response) {
                    quicksave = get_subdict_value_by_key(response, "quicksave", "value", false)
                }
                if ("planning_period" in response){
                    selected_planning_period = get_dict_value_by_key(response, "planning_period");
                    document.getElementById("id_hdr_period").innerText = display_planning_period (selected_planning_period, loc, user_lang);
                }
                if ("calendar_period" in response){
                    selected_calendar_period = get_dict_value_by_key(response, "calendar_period");
                    selected_calendar_period["calendar_type"] = "customer_calendar";
                    document.getElementById("id_calendar_hdr_text").innerText = display_planning_period (selected_calendar_period, loc, user_lang);

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
                alert(msg + '\n' + xhr.responseText);
            }
        });  // $.ajax({
}

//=========  refresh_maps  ================ PR2020-01-03
    function refresh_maps(response) {
        //console.log ("===== refresh_maps ==== ")

        if ("company_dict" in response) {
            company_dict = response["company_dict"];
        }
        if ("customer_list" in response) {
            get_datamap(response["customer_list"], customer_map)

            const title_inactive_btn = loc.TXT_Cick_show_inactive_customers;
            let tblHead = document.getElementById("id_thead_select");
            const filter_ppk_int = null, filter_include_inactive = true, addall_to_list_txt = null;
            fFill_SelectTable(tblBody_select_customer, tblHead, customer_map, "customer", selected_customer_pk, null,
                HandleSelect_Filter, HandleFilterInactive,
                HandleSelect_Row,  HandleSelectRowButton,
                filter_ppk_int, filter_include_inactive, addall_to_list_txt,
                cls_bc_lightlightgrey, cls_bc_yellow,
                imgsrc_inactive_grey, imgsrc_inactive_black,
                imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey, filter_show_inactive,
                title_inactive_btn);
            fFilter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive);

            FillTableRows("customer");
            f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);  // false = no ppk_filter
        }
        if ("order_list" in response) {
            get_datamap(response["order_list"], order_map);
            let tblHead = document.getElementById("id_thead_select");
            const filter_ppk_int = null, filter_include_inactive = true, addall_to_list_txt = null;
            fFill_SelectTable(tblBody_select_order, tblHead, order_map, "order", selected_order_pk, false,
                HandleSelect_Filter, HandleFilterInactive,
                HandleSelect_Row,  HandleSelectRowButton,
                filter_ppk_int, filter_include_inactive, addall_to_list_txt,
                cls_bc_lightlightgrey, cls_bc_yellow,
                imgsrc_inactive_grey, imgsrc_inactive_black,
                imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey, filter_show_inactive);
            const has_rows = fFilter_SelectRows(tblBody_select_order, null, filter_show_inactive, true, selected_customer_pk);

            if ( has_rows && ["calendar", "planning"].indexOf(selected_btn) > -1){
                document.getElementById("id_div_tbody_select_order").classList.remove(cls_hide)
            } else {
                document.getElementById("id_div_tbody_select_order").classList.add(cls_hide)
            };

            FillTableRows("order");
            f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk)  // true = has_ppk_filter

            UpdateHeaderText();
        }

        if ("employee_list" in response) {get_datamap(response["employee_list"], employee_map)}
        if ("scheme_list" in response) {get_datamap(response["scheme_list"], scheme_map)}
        if ("shift_list" in response) {get_datamap(response["shift_list"], shift_map)}
        if ("team_list" in response) {get_datamap(response["team_list"], team_map)}
        if ("teammember_list" in response) {get_datamap(response["teammember_list"], teammember_map)}
        if ("schemeitem_list" in response) {get_datamap(response["schemeitem_list"], schemeitem_map)}

        if ("customer_planning_list" in response) {
            // customer_planning_list is used for PDF planning (teammembers are grouped by team)
            const duration_sum = get_datamap(response["customer_planning_list"], planning_customer_map, true)
            planning_display_duration_total = display_duration (duration_sum, user_lang)
        }

        if ("employee_planning_list" in response) {
            console.log ("...................===== employee_planning_list in response ==== ")
            // employee_planning_list is used in table and Excel (each teammember on a separate row)
            get_datamap(response["employee_planning_list"], planning_employee_map, true)
            FillTableRows("planning");

            f_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);
        }

        if ("customer_calendar_list" in response) {
            get_datamap(response["customer_calendar_list"], calendar_map)
            //console.log("calendar_map", calendar_map )
            //console.log("calendar_map", calendar_map )
            console.log (",,,,,,,,,,,,,,,,,,,===== customer_calendar_list in response ==== ")
            UpdateHeaderText();
            CreateCalendar("order", selected_calendar_period, calendar_map, MSO_Open, loc, timeformat, user_lang);
        };

        // ---  always call HandleBtnSelect here, to unhide selected table
        HandleBtnSelect(selected_btn, true);  // true = skip_update

        //console.log( " UpdateSettings HandleBtnCalendar ====");
        //HandleBtnCalendar("thisweek")



    }  // refresh_maps

//=========  refresh_locale  ================ PR2020-01-19
    function refresh_locale(locale_dict) {
        //console.log ("===== refresh_locale ==== ")
        loc = locale_dict;
        CreateSubmenu()
        CreateTblHeaders();
        CreateTblFooters();
        CreateTblModSelectPeriod();

    }  // refresh_locale
//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        const tblName = get_attr_from_el(tr_clicked, "data-table");

        let tblBody = document.getElementById("id_tbody_" + tblName)
        DeselectHighlightedTblbody(tblBody, cls_selected)

        let tblFoot = document.getElementById("id_tfoot_" + tblName)
        DeselectHighlightedTblbody(tblFoot, cls_selected)

        tr_clicked.classList.add(cls_selected)

// ---  get map_dict
        const map_dict = get_mapdict_from_tblRow(tr_clicked)

// ---  update selected_customer_pk
        // TODO in table pricerate table rows have differnet table names (order scheme, shift)
        //console.log( "tblName: ", tblName, typeof tblName);

        if (tblName === "customer"){
// ---  update selected_customer_pk
            const new_customer_pk = parseInt(get_subdict_value_by_key (map_dict, "id", "pk", 0))
            // deselect selected_order_pk when selected customer changes
            if(new_customer_pk !== selected_customer_pk){
                selected_order_pk = 0
            }
            selected_customer_pk = new_customer_pk

// ---  highlight row in select table
            const row_id = id_sel_prefix + tblName + "_" + selected_customer_pk.toString();
            let selectRow = document.getElementById(row_id);

        console.log("row_id:", row_id);
        console.log("selectRow: ", selectRow);

            HighlightSelectRow(tblBody_select_customer, selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

        } else if (tblName === "order"){
            const pk_str = get_attr_from_el(tr_clicked, "data-pk");
            selected_order_pk = parseInt(pk_str);
            HandleTableRowClicked
        };  // if (tblName === "customer")

// ---  update header text
        UpdateHeaderText();

// --- save selected_customer_pk in Usersettings ( UploadSettings at the end of this function)
        const setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
        UploadSettings (setting_dict, url_settings_upload);

    };  // HandleTableRowClicked

// TODO: add HandleButtonCustomerAdd and HandleCustomerAdd and UploadFormChanges and UploadPricerateChanges(??)
//========= HandleButtonCustomerAdd  ============= PR2019-10-12
//========= HandleCustomerAdd  ============= PR2019-09-24
    function HandleCustomerAdd(){
        //console.log(" --- HandleCustomerAdd --- ")

        selected_customer_pk = 0
        //console.log( "selected_customer_pk", selected_customer_pk )

        // ---  remove highlights from select tables
        DeselectHighlightedTblbody(tblBody_select_customer, cls_bc_yellow, cls_bc_lightlightgrey)
        let el_form_code = document.getElementById("id_form_code")
        document.getElementById("id_form_name").value = null;
        el_form_code.value = null;
        el_form_code.value = null;
        el_form_code.placeholder = loc.Enter_short_name_of_customer;

        el_form_code.focus();
        document.getElementById("id_form_btn_add").disabled = true;
    }

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(btn_mode, skip_update) {
        //console.log( "===== HandleBtnSelect ========= ", btn_mode);
        //console.log( "skip_update", skip_update);

        selected_btn = btn_mode
        if(!selected_btn){selected_btn = "customer"}

// ---  upload new selected_btn
        if(!skip_update){
            const upload_dict = {"page_customer": {"btn": selected_btn}};
            UploadSettings (upload_dict, url_settings_upload);
        }
// ---  highlight selected button
        let btn_container = document.getElementById("id_btn_container")
        HighlightBtnSelect(btn_container, selected_btn);

// ---  show orderlist in selecttable when clicked on planning, otherwise: customer_list

        const tblName = (selected_btn === "calendar") ? "order" : "customer";

        if (selected_btn === "customer") {
        } else if (selected_btn === "order") {
        // ---  update addnew row: put pk and ppk of selected customer in addnew row of tBody_order
            //dont: selected_customer has no value yet
            UpdateAddnewRow("order")
        } else if (selected_btn === "calendar" && !skip_update) {
            if(skip_update){
                // create emptyy calendar when skip_update
                UpdateHeaderText();
                CreateCalendar("order", selected_calendar_period, calendar_map, MSO_Open, loc, timeformat, user_lang);
            } else {
            // ---  upload new selected_btn
            document.getElementById("id_tbody_calendar").innerText = null;

            let datalist_request = {customer_calendar: {
                                        order_pk: selected_order_pk},
                                        calendar_period: selected_calendar_period
                                    };

            console.log( "=== HandleBtnCalendar DatalistDownload ")
            DatalistDownload(datalist_request);
            }

        } else if (selected_btn === "planning" && !skip_update) {
            console.log( "=== HandleBtnSelect DatalistDownload ")
            DatalistDownload_Planning()

        } else if (selected_btn === "form") {

        }

/*
        const imgsrc_default = imgsrc_inactive_grey
        const imgsrc_hover = imgsrc_inactive_black

        if (selected_btn === "calendar") {
            const tblName = "order";
            const imgsrc_default = imgsrc_inactive_grey;
            const imgsrc_hover = imgsrc_inactive_black;
            const include_parent_code = "customer";

            console.log ("HandleBtnSelect fFill_SelectTable order");
            let tblHead = document.getElementById("id_thead_select");
            fFill_SelectTable(tblBody_select_order, tblHead, order_map, tblName, selected_order_pk, include_parent_code,
                HandleSelect_Filter, null,
                HandleSelect_Row,  null,
                cls_bc_lightlightgrey, cls_bc_yellow,
                imgsrc_default, imgsrc_hover)

        } else {
            const tblName = "customer";
            const imgsrc_default = imgsrc_inactive_grey;
            const imgsrc_hover = imgsrc_inactive_black;
            const title_inactive_btn = loc.TXT_Cick_show_inactive_customers;

            console.log ("HandleBtnSelect fFill_SelectTable customer");
            let tblHead = document.getElementById("id_thead_select");
            fFill_SelectTable(tblBody_select_customer, tblHead, customer_map, tblName, selected_customer_pk, null,
                HandleSelect_Filter, HandleFilterInactive,
                HandleSelect_Row, HandleSelectRowButton,
                cls_bc_lightlightgrey, cls_bc_yellow,
                imgsrc_default, imgsrc_hover,
                imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey, filter_show_inactive,
                title_inactive_btn)
        }

*/
        // ---  show / hide selected table
        let list = document.getElementsByClassName("tab_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i];
            const is_show = el.classList.contains("tab_" + selected_btn)
            show_hide_element(el, is_show)
            // class 'display_hide' is necessary to prevent showing all tables when page opens
        }

// ---  filter  table customer and table order
    // reset filter tBody_customer
        //f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, theregfore dont filter on selected_customer_pk
        //f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );


// ---  update header text -- >  cant update header text until customer- and order_map are filled
        UpdateHeaderText();

    }  // HandleBtnSelect

//=========  DatalistDownload_Planning ================ PR2020-01-20
    function DatalistDownload_Planning() {
        console.log( "===== DatalistDownload_Planning  ========= ");

        const now_arr = get_now_arr_JS();
        const planning_period = {mode: "get", dflt: "tweek", now: now_arr};
        const customer_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_empty_shifts: true
        };
        const employee_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_empty_shifts: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };

        document.getElementById("id_hdr_period").innerText = loc.Period + "..."
        tBody_planning.innerText = null;

        let datalist_request = {planning_period: planning_period,
                                customer_planning: customer_planning_dict,
                                employee_planning: employee_planning_dict,
        };

        console.log( "=== HandleBtnSelect DatalistDownload ")
        DatalistDownload(datalist_request);
    }  // DatalistDownload_Planning

//=========  HandleSelect_Row ================ PR2019-08-28
    function HandleSelect_Row(sel_tr_clicked, event_target) {
        console.log( "===== HandleSelect_Row  ========= ");

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
                    sel_cust_pk = get_subdict_value_by_key(map_dict, "id", "pk", 0);
                    sel_cust_ppk = get_subdict_value_by_key(map_dict, "id", "ppk");
                    sel_cust_code = get_subdict_value_by_key(map_dict, "code", "value");
// --- deselect selected_order_pk when selected customer changes
                    if(sel_cust_pk !== selected_customer_pk){
                        selected_customer_pk = sel_cust_pk
                        selected_order_pk = 0;
                        update_needed = true;
                    // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
                        ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey, false, sel_tr_clicked, cls_bc_yellow);
                    }
                } else{
                    sel_cust_pk = get_subdict_value_by_key(map_dict, "id", "ppk", 0);
                    sel_order_pk = get_subdict_value_by_key(map_dict, "id", "pk", 0);
                    sel_cust_code = get_subdict_value_by_key(map_dict, "customer", "code");
                    sel_order_code = get_subdict_value_by_key(map_dict, "code", "value");

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
                if(update_needed){

    // ---  update customer_calendar
            // ---  highlight row in tblBody
                    if(selected_btn === "customer"){
                    // reset filter tBody_customer
                        f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);

                        let tblRow = HighlightSelectedTblRowByPk(tBody_customer, selected_customer_pk)
                        // ---  scrollIntoView, only in tblBody customer
                        if (!!tblRow){
                            tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                        };
                    } else if(selected_btn === "order"){
            // reset filter tBody_order (show all orders, theregfore dont filter on selected_customer_pk
                        f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );

            // ---  update addnew row: put pk and ppk of selected customer in addnew row of tBody_order
                        //UpdateAddnewRow(selected_customer_pk, sel_cust_ppk, sel_cust_code)
                        UpdateAddnewRow("order")

                    } else  if(selected_btn === "calendar"){
                        let datalist_request = {calendar_period: selected_calendar_period,
                                                customer_calendar: {order_pk: selected_order_pk}};
                        console.log( "=== HandleSelect_Row DatalistDownload calendar")
                        DatalistDownload(datalist_request);

                    } else if(selected_btn === "planning"){
                        console.log( "=== HandleSelect_Row DatalistDownload ")
                        DatalistDownload_Planning()
            // reset filter tBody_planning not necessary, table will be refreshed

                    } else if(selected_btn === "form"){
                        UpdateForm()
                    // ---  enable delete button
                        document.getElementById("id_form_btn_delete").disabled = (!selected_customer_pk)
                    }


    // ---  update header text
                    UpdateHeaderText()

    // --- save selected_customer_pk and selected_order_pk in Usersettings
                    const upload_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
                    UploadSettings (upload_dict, url_settings_upload);
    // ---  filter selectrows of tbody_select_order
                    const has_rows = fFilter_SelectRows(tblBody_select_order, null, filter_show_inactive, true, selected_customer_pk)
                    if ( has_rows && ["calendar", "planning"].indexOf(selected_btn) > -1){
                        document.getElementById("id_div_tbody_select_order").classList.remove(cls_hide)
                    } else {
                        document.getElementById("id_div_tbody_select_order").classList.add(cls_hide)
                    };

                } // if(update_needed){

            }  //  if (["IMG", "A"].indexOf(event_target.nodeName) > -1)
        }  // if(!!sel_tr_clicked)

// ---  enable add button, also when no customer selected
        document.getElementById("id_form_btn_add").disabled = false;
    }  // HandleSelect_Row

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

                let is_override = get_subdict_value_by_key(itemdict, "billable", "override");
                let is_billable = get_subdict_value_by_key(itemdict, "billable", "billable");
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
        console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        console.log(el_input);

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
            let upload_dict = {"id": map_dict["id"]};
            if (mode === "delete"){
                mod_upload_dict = {"id": map_dict["id"]};
                mod_upload_dict["id"]["delete"] = true;
                ModConfirmOpen("delete", el_input);
                return false;

            } else if (mode === "inactive"){
        // get inactive from map_dict
                const inactive = get_subdict_value_by_key(map_dict, "inactive", "value", false)
        // toggle inactive
                const new_inactive = (!inactive);
                upload_dict["inactive"] = {"value": new_inactive, "update": true};
        // change inactive icon, before uploading
                format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
        // order has inactive button i nselect row and in tablerow. Als update the other one
                if (tblName === "order"){

                }
        // ---  show modal, only when made inactive
                if(!!new_inactive){
                    mod_upload_dict = {"id": map_dict["id"], "inactive": {"value": new_inactive, "update": true}};
                    ModConfirmOpen("inactive", el_input);
                    return false;
                }
            }

            const url_str = (tblName === "pricerate") ? url_pricerate_upload : url_customer_upload
            UploadDeleteChanges(upload_dict, url_str);
        }  // if(!!tblRow)
    }  // HandleBtnInactiveDeleteClicked

//========= HandleBtnCalendar  ============= PR2019-12-04
    function HandleBtnCalendar(mode) {
        //console.log( " ==== HandleBtnCalendar ====", mode);

        const datefirst_iso = get_dict_value_by_key(selected_calendar_period, "rosterdatefirst")
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
        if(mode === "thisweek") {
            selected_calendar_period =  {period_tag: "tweek", now: now_arr}
        } else{
            selected_calendar_period =  {period_tag: "other",
                                    rosterdatefirst: calendar_datefirst_iso,
                                    rosterdatelast: calendar_datelast_iso,
                                    now: now_arr}
        }
        let datalist_request = {customer_calendar: {
                                    order_pk: selected_order_pk},
                                    calendar_period: selected_calendar_period
                                };

        //console.log( "=== HandleBtnCalendar DatalistDownload ")
        DatalistDownload(datalist_request);

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

        //console.log("url_order_import: ", url_order_import);
        AddSubmenuButton(el_div, loc.Upload_customers_and_orders, null, "mx-2", "id_submenu_order_import", url_order_import)
        //AddSubmenuButton(el_div, el_data, "id_submenu_employee_add", function() {HandleButtonEmployeeAdd()}, "data-txt_employee_add", "mx-2")
        //AddSubmenuButton(el_div, el_data, "id_submenu_employee_delete", function() {ModConfirmOpen("delete")}, "data-txt_employee_delete", "mx-2")

        AddSubmenuButton(el_div, loc.Print_planning,
            function() { PrintOrderPlanning("preview", selected_planning_period, planning_customer_map,
                                planning_display_duration_total, loc, timeformat, user_lang)},
            "mx-2",
            "id_submenu_customer_planning_print"
        )
        // was: CreateSubmenuButton(el_submenu, null, loc.menubtn_export_excel, "mx-2", ExportToExcel);
        AddSubmenuButton(el_div, loc.menubtn_export_excel, ExportToExcel, "mx-2");

       // AddSubmenuButton(el_div, el_data, "id_submenu_customer_planning_print", function() {
       //     PrintOrderPlanning("preview", selected_planning_period, planning_customer_map, company_dict,
       //                 label_list, pos_x_list, colhdr_list, timeformat,
       //                 loc.months_abbrev, loc.weekdays_abbrev, user_lang)}, "data-txt_planning_preview", "mx-2")
       // AddSubmenuButton(el_div, el_data, "id_submenu_customer_planning_print", function() {
       //     PrintOrderPlanning("print", selected_planning_period, planning_customer_map, company_dict,
      //                  label_list, pos_x_list, colhdr_list, timeformat,
      //                  loc.months_abbrev, loc.weekdays_abbrev, user_lang)}, "data-txt_planning_download", "mx-2")

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//========= FillTableRows  ====================================
    function FillTableRows(tblName, selected_parent_pk) {
        //console.log( "===== FillTableRows  ========= ", tblName);

        // selected_btns are: customer, order, planning, calendar, form
        if (selected_btn === "form") { tblName = "customer"};

// --- reset tblBody
        // id_tbody_teammember is on modeordershift.html
        let tblBody = document.getElementById("id_tbody_" + tblName);
        tblBody.innerText = null;

// --- get  data_map
        const form_mode = (selected_btn === "form");
        const data_map = (tblName === "customer") ? customer_map :
                         (tblName === "order") ? order_map :
                         (tblName === "teammember") ? teammember_map :
                         (selected_btn === "planning") ? planning_employee_map :
                         null;


        const selected_pk = (selected_btn === "customer") ? selected_customer_pk :
                            (selected_btn === "order") ? selected_order_pk : 0;

        if (form_mode){
            UpdateForm()
        } else {
            if(!!data_map){
// --- loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const id_dict = get_dict_value_by_key(item_dict, "id");
                        const row_tblName = get_dict_value_by_key(id_dict, "table");
                        const pk_int = get_dict_value_by_key(id_dict, "pk");
                        const ppk_int = get_dict_value_by_key(id_dict, "ppk");
                        const data_customer_pk = get_subdict_value_by_key(item_dict, "customer", "pk")
                    // in table order: show only rows of selected_customer_pk, show all if null

                    // dont filter on customer when adding rows: they will be filtered by
                    //if (tblName === "teammember"){
                    //    const row_team_pk = get_subdict_value_by_key(item_dict, "id", "ppk")
                    //    add_Row = (!!row_team_pk && row_team_pk === selected_parent_pk);
                    //} else {
                    //    if (["pricerate"].indexOf( selected_btn ) > -1){
                    //        row_customer_pk = get_subdict_value_by_key(item_dict, "customer", "pk")
                    //        add_Row = (!!row_customer_pk && row_customer_pk === selected_customer_pk);
                    //    } else {
                    //        add_Row = true;
                    //    }
                    // }

                    // parameters: tblName, pk_str, ppk_str, is_addnew, row_customer_pk
                    // row_customer_pk not in use in teammember tbl

// --- insert tblRow ino tblBody or tFoot
                    // CreateTblRow(tblBody_or_tFoot, tblName, pk_str, ppk_str, is_addnew_row, data_customer_pk)
                    let tblRow = CreateTblRow(tblBody, row_tblName, pk_int, ppk_int, false, data_customer_pk)
                    UpdateTableRow(tblRow, item_dict)
// --- highlight selected row
                    if (pk_int === selected_pk) {
                        tblRow.classList.add(cls_selected)
                    }

                }  //  for (const [pk_int, item_dict] of data_map.entries())
            }  // if(!!data_map){
        }  // if (form_mode)
    }  // FillTableRows

//=========  CreateTblHeaders  === PR2019-11-09
    function CreateTblHeaders() {
        //console.log("===  CreateTblHeaders == ");

        const mode_list = ["customer", "order", "planning", "calendar"]
        mode_list.forEach(function (mode, index) {

            let tblHead = document.getElementById("id_thead_" + mode);
            tblHead.innerText = null

            let tblRow = tblHead.insertRow (-1); // index -1: insert new cell at last position.
    //--- insert th's to tblHead
            const column_count = tbl_col_count[mode];
            for (let j = 0; j < column_count; j++) {
    // --- add th to tblRow.
                let th = document.createElement("th");
                tblRow.appendChild(th);
    // --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
                th.appendChild(el_div)
    // --- add innerText to th
                const data_text = loc[thead_text[mode][j]];
                if(!!data_text) el_div.innerText = data_text;
                el_div.setAttribute("overflow-wrap", "break-word");
    // --- add margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")}
    // --- add width to el
                el_div.classList.add("td_width_" + field_width[mode][j])
    // --- add text_align
                el_div.classList.add("text_align_" + field_align[mode][j])
            }  // for (let j = 0; j < column_count; j++)
            CreateTblFilter(tblHead, mode)
        });  //  mode_list.forEach
    };  //function CreateTblHeaders

//=========  CreateTblFooters  === PR2019-11-26
    function CreateTblFooters() {
        //console.log("===  CreateTblFooters == ");
        const tblName_list = ["customer", "order"]
        tblName_list.forEach(function (tblName, index) {
    // --- function adds row 'add new' in tFoot
            CreateTblFooter(tblName)
        });
    };  //function CreateTblFooters

//=========  CreateTblFooter  === PR2019-11-26
    function CreateTblFooter(tblName) {
        //console.log("===  CreateTblFooter == ");
// --- function adds row 'add new' in tFoot
        id_new += 1;
        const pk_new = "new" + id_new.toString()

        let tblFoot = document.getElementById("id_tfoot_" + tblName);
        if(!!tblFoot){

            let ppk_int = 0, code_value = null
            if (tblName === "customer"){
                 ppk_int = get_subdict_value_by_key (company_dict, "id", "pk", 0);
            } else  if (tblName === "order"){
                ppk_int = selected_customer_pk
                const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", ppk_int);
                code_value = get_subdict_value_by_key(customer_dict, "code", "value")
            }


// --- insert tblRow into tFoot
            let tblRow = tblFoot.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            tblRow.setAttribute("data-pk", pk_new);
            tblRow.setAttribute("data-ppk", ppk_int);
            tblRow.setAttribute("data-table", tblName);

    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow, tblName, "list");}, false )

    //+++ insert td's into tblRow
            const column_count = tbl_col_count[tblName];
            for (let j = 0; j < column_count; j++) {
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);
                let el = document.createElement(field_tags[tblName][j]);
                el.setAttribute("data-field", field_names[tblName][j]);
                el.setAttribute("type", "text")
                el.classList.add("input_text");
    // --- add EventListener to el
                if(tblName === "order" && j === 0 && !!code_value){
                    el.value = code_value
                } else {
                    el.value = null;
                }
    // --- add EventListener to el
                if ((tblName === "customer" && [0, 1].indexOf( j ) > -1) || (tblName === "order" && j === 1)) {
                    el.addEventListener("change", function() {UploadElChanges(el)}, false);
                }
    // --- add readOnly to el
                const is_enabled = ((tblName === "customer" && [0, 1].indexOf( j ) > -1) || (tblName === "order" && j === 1))
                el.readOnly = !is_enabled

    // --- add placeholder, only when is_addnew_row.
                if((tblName === "customer" && j === 0) || (tblName === "order" && j === 1)){
                    const placeholder = (tblName === "customer") ? loc.Add_customer : loc.Add_order
                    el.setAttribute("placeholder", placeholder + "...")
                }
                if (j === 0 ){el.classList.add("ml-2")}
                el.classList.add("td_width_" + field_width[tblName][j])
                el.classList.add("text_align_" + field_align[tblName][j])
                el.classList.add("border_none");
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);

            }  // for (let j = 0; j < 8; j++)
        }  //  if(!!tblFoot)
    };  //function CreateTblFooter

//=========  UpdateAddnewRow  === PR2019-11-26
    function UpdateAddnewRow(tblName) {
        //console.log("===  UpdateAddnewRow == ", tblName);
        //console.log("selected_customer_pk ", selected_customer_pk);

// --- lookup row 'add new' in tFoot
        const tblFoot_id = "id_tfoot_" + tblName;
        let tblFoot = document.getElementById(tblFoot_id);
        if (!!tblFoot.rows.length){
            let tblRow = tblFoot.rows[0];
            if (!!tblRow){
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
                const customer_ppk = get_subdict_value_by_key(map_dict, "id", "ppk");
                const customer_value = get_subdict_value_by_key(map_dict, "code", "value")

                let el_input_customer = tblRow.cells[0].children[0];
                let el_input_order = tblRow.cells[1].children[0];
                // el_input_order contains customer_name in table customer
                el_input_order.value = null

                if (tblName === "customer") {
                    el_input_customer.value = null
                    el_input_customer.readOnly = false;
                    el_input_order.readOnly = false;
                    el_input_customer.classList.remove("tsa_color_darkgrey")

                } else if (tblName === "order") {
                    tblRow.setAttribute("data-ppk", selected_customer_pk)

                    el_input_customer.setAttribute("data-pk", selected_customer_pk)
                    el_input_customer.setAttribute("data-ppk", customer_ppk)
                    //el_input.setAttribute("data-field", "customer");
                    el_input_customer.value = (!!customer_value) ? customer_value : loc.Select_customer + "..."

                    el_input_customer.readOnly = true;
                    el_input_customer.classList.add("tsa_color_darkgrey")

        //console.log("(!selected_customer_pk) ", (!selected_customer_pk));
                    el_input_order.readOnly = (!selected_customer_pk);
                };  // else if (tblName === "order")
            };
    // remove placeholder from element 'code
                //let el_code = tblRow.cells[0].children[0];
                //if (!!el_code){el_code.removeAttribute("placeholder")}

        }  // if (!!rows_length){

    };  // UpdateAddnewRow

//=========  CreateTblFilter  ================ PR2019-11-09
    function CreateTblFilter(tblHead, tblName) {
        //console.log("=========  function CreateTblFilter =========");

//+++ insert tblRow ino tblHead
        let tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        const column_count = tbl_col_count[tblName];
        for (let j = 0, td, el; j < column_count; j++) {

// insert td into tblRow
            // index -1 results in that the new cell will be inserted at the last position.
            td = tblRow.insertCell(-1);

// create element with tag from field_tags
                // NIU replace select tag with input tag
                const field_tag = field_tags[tblName][j];
                // NIU const filter_tag = (field_tag === "select") ? "input" : field_tag
                let el = document.createElement(field_tag);

// --- add data-field Attribute.
               el.setAttribute("data-field", field_names[tblName][j]);
               el.setAttribute("data-table", tblName);

// --- add attributes to td
                if ((tblName === "customer" && j === 3) || (tblName === "order" && j === 6) || (tblName === "order" && j === 7)) {
                    // skip delete column
                } else {
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");

                    el.classList.add("tsa_color_darkgrey")
                    el.classList.add("tsa_transparent")
    // --- add other attributes to td
                    el.setAttribute("autocomplete", "off");
                    el.setAttribute("ondragstart", "return false;");
                    el.setAttribute("ondrop", "return false;");
                }  //if (j === 0)

// --- add EventListener to td
            el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}
// --- add width to el
            el.classList.add("td_width_" + field_width[tblName][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[tblName][j])

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblFilter

//=========  CreateTblRow  ================ PR2019-09-04
    function CreateTblRow(tblBody_or_tFoot, tblName, pk_str, ppk_str, is_addnew_row, data_customer_pk) {
       //console.log("=========  CreateTblRow =========");
       //console.log("tblName: ", tblName);

// --- insert tblRow ino tblBody or tFoot
        let tblRow = tblBody_or_tFoot.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        const map_id = get_map_id(tblName, pk_str)
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_str);
        tblRow.setAttribute("data-ppk", ppk_str);
        tblRow.setAttribute("data-table", tblName);
        if(!!data_customer_pk){tblRow.setAttribute("data-customer_pk", data_customer_pk)};

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow, tblName, "list");}, false )

//+++ insert td's into tblRow
        const column_count = tbl_col_count[tblName];
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// --- create element with tag from field_tags
            let el = document.createElement(field_tags[tblName][j]);

// --- add data-field Attribute.
            el.setAttribute("data-field", field_names[tblName][j]);

// --- add img delete to col_delete, not in addnew row
            if ((tblName === "customer" && j === 3 ) || (tblName === "order" && j === 7) ) {
                if (!is_addnew_row){
                    CreateBtnInactiveDelete("delete", tblRow, el)
                }
            } else if (tblName === "order" && j === 6 ) {
// --- column inactive, , not in addnew row
                if (!is_addnew_row){
                    CreateBtnInactiveDelete("inactive", tblRow, el)
                }
            } else {

// --- add type and input_text to el.
                el.setAttribute("type", "text")
                el.classList.add("input_text");

// --- add EventListener to td
                if (tblName === "customer"){
                    if ([0, 1].indexOf( j ) > -1){
                        el.addEventListener("change", function() {UploadElChanges(el)}, false )
                    }
                } else if (tblName === "order"){
                    if ([0, 1, 2, 5].indexOf( j ) > -1){
                        el.addEventListener("change", function() {UploadElChanges(el);}, false)
                    } else if ([3, 4].indexOf( j ) > -1){
                        el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false);
                        // class input_popup_date is necessary to skip closing popup
                        el.classList.add("input_popup_date")
                    };
                }
            }  // if ((tblName === "order" && j === 7) || (tblName === "customer" && j === 2 ))

// --- add placeholder, only when is_addnew_row.
            if (is_addnew_row ){
                if((tblName === "customer" && j === 0) || (tblName === "order" && j === 1)){
                    const placeholder = (tblName === "customer") ? loc.Add_customer : loc.Add_order
                    el.setAttribute("placeholder", placeholder + "...")
                }
            }

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}
// --- add width to el
            el.classList.add("td_width_" + field_width[tblName][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[tblName][j])

// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");

// --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };// CreateTblRow

//=========  CreateBtnInactiveDelete  ================ PR2019-10-23
    function CreateBtnInactiveDelete(mode, tblRow, el_input){
        //console.log("--- CreateBtnInactiveDelete  --------------");
        //console.log(tblRow);
        el_input.setAttribute("href", "#");
        // dont shwo title 'delete'
        // const data_id = (tblName === "customer") ? "data-txt_customer_delete" : "data-txt_order_delete"
        // el.setAttribute("title", get_attr_from_el(el_data, data_id));
        el_input.addEventListener("click", function() {HandleBtnInactiveDeleteClicked(mode, el_input)}, false )

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
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_grey;
        AppendChildIcon(el_input, img_src)
    }  // CreateBtnInactiveDelete


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2019-10-20
    function UpdateFromResponse(update_dict) {
        console.log("==== UpdateFromResponse ====");
        console.log("update_dict", update_dict);
        console.log("selected_btn", selected_btn);

//--- get info from update_dict["id"]
        const id_dict = get_dict_value_by_key (update_dict, "id");
        const tblName = get_dict_value_by_key(id_dict, "table");
        const pk_int = get_dict_value_by_key(id_dict, "pk");
        const ppk_int = get_dict_value_by_key(id_dict, "ppk");
        const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
        const map_id = get_map_id(tblName, pk_int);
        const is_created = ("created" in id_dict);
        const is_deleted = ("deleted" in id_dict);
        const inactive_changed = get_subdict_value_by_key(update_dict, "inactive", "updated")
        console.log("is_created", is_created);
        console.log("inactive_changed", inactive_changed);

        let tblRow;
        if (!!map_id){
            tblRow = document.getElementById(map_id);
        }

        if(selected_btn === "form"){
            UpdateForm()
        }

// ++++ deleted ++++
    //--- reset selected_customer and selected_order when deleted
        if(is_deleted){
            selected_order_pk = 0;
            if (tblName === "customer") {selected_customer_pk = 0;}
    //--- delete tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)}

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
            //console.log("focus el_input", el_input)
            if(!!el_input){
                setTimeout(function() {el_input.focus()}, 50);
            }

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
                const setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
                UploadSettings (setting_dict, url_settings_upload);
            }
    // reset addnew row
            UpdateAddnewRow(tblName)

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

                const title_inactive_btn = loc.TXT_Cick_show_inactive_customers;
                const imgsrc_default = imgsrc_inactive_grey, imgsrc_hover = imgsrc_inactive_black;
                selectRow = CreateSelectRow(false, tblBody_select_customer, tblName, row_index, update_dict, selected_customer_pk,
                                            HandleSelect_Row, HandleBtnInactiveDeleteClicked,
                                            imgsrc_default, imgsrc_hover, imgsrc_inactive_black, imgsrc_inactive_grey,
                                            imgsrc_inactive_lightgrey, title_inactive_btn)

                HandleSelect_Row(selectRow);
        // imgsrc_inactive_lightgrey
                //HighlightSelectRow(tblBody_select_customer, selectRow, cls_bc_yellow, cls_bc_lightlightgrey);
            } else{
        //--- get existing  selectRow
                const rowid_str = id_sel_prefix + map_id
                selectRow = document.getElementById(rowid_str);
            };
        //--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
            UpdateSelectRow(selectRow, update_dict, false, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)

        }  // if( tblName === "customer")
// ++++ update table filter when inactive changed ++++
        if (inactive_changed && !filter_show_inactive){
            // let row disappear when inactive and not filter_show_inactive
            setTimeout(function (){
                f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk)  // true = has_ppk_filter
            }, 2000);
          }

//--- refresh header text - alwas, not only when if(pk_int === selected_customer_pk)
        UpdateHeaderText();

//--- remove 'updated, deleted created and msg_err from update_dict
        //remove_err_del_cre_updated__from_itemdict(update_dict)

//--- replace updated item in map or remove deleted item from map
        // must be after remove_err_del_cre_updated__from_itemdict

         update_map_item(map_id, update_dict);

    }  // UpdateFromResponse

//========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(){
        console.log("========= UpdateForm  =========");
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
        const pk_int = Number(get_subdict_value_by_key(map_dict, "id", "pk", 0));
        const readonly = (!pk_int);

// ---  customer form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, len = form_elements.length; i < len; i++) {
            let el_input = form_elements[i];
            el_input.readOnly = readonly;
            UpdateField(el_input, map_dict, false);
        }
    };

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, update_dict){
        //console.log("--- UpdateTableRow  --------------");
        //console.log("update_dict", update_dict);
        //console.log("tblRow", tblRow);

// format of update_dict is : { id: {table: "customer", pk: 504, ppk: 2, temp_pk: "customer_504"}
//                              pk: 504,  code: {updated: true, value: "mmm2"},  name: {value: "mmm"},
//                              cat: {value: 0}, interval: {value: 0}}

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

// check if tblBody = tFoot, if so: is_addnew_row = true
            const tblBody_id_str = get_attr_from_el(tblBody, "id")
            const arr = tblBody_id_str.split("_");
            const is_addnew_row = (arr.length > 1 && arr[1] === "tfoot");
            //console.log("is_addnew_row", is_addnew_row);

// put or remove customer_pk in tblRow.data, for filtering rows
            const customer_dict = get_dict_value_by_key (update_dict, "customer");
            //console.log("customer_dict", customer_dict);

            let customer_pk = null, customer_ppk = null;
            if(!isEmpty(customer_dict)){
                customer_pk = get_dict_value_by_key(customer_dict, "pk", 0)
                customer_ppk = get_dict_value_by_key(customer_dict, "ppk", 0)
            };
            //console.log("customer_pk", customer_pk);
            //console.log("customer_ppk", customer_ppk);

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

// --- show error message of row
            if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    el_input.classList.add("border_bg_invalid");
                    const msg_offset = [-240, 100];
                    ShowMsgError(el_input, el_msg, msg_err, msg_offset);
                }

// --- new created record
            } else if (is_created){

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
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);

// make row green, / --- remove class 'ok' after 2 seconds, not in addnew row
                if(!is_addnew_row){
                    ShowOkRow(tblRow)
                }

            };  // if (is_created){

            // tblRow may not exist any more when (is_deleted). Not any more (delete is moved from this function), but let it stay
            if (!!tblRow){
                const is_inactive = get_subdict_value_by_key (update_dict, "inactive", "value", false);
                tblRow.setAttribute("data-inactive", is_inactive)

                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        UpdateField(el_input, update_dict, is_addnew_row);
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)
        };  // if (!isEmpty(update_dict) && !!tblRow)
    }  // function UpdateTableRow

//========= UpdateField  ============= PR2019-10-09
    function UpdateField(el_input, update_dict, is_addnew_row) {
        const fldName = get_attr_from_el(el_input, "data-field");
        //console.log("========= UpdateField  ========= ", fldName);
        //console.log("update_dict ", update_dict);

// --- reset fields when update_dict is empty
        if (isEmpty(update_dict)){
            if (fldName === "inactive") {
                const field_dict = {value: false}
        //console.log("+++++++++ format_inactive_element")
                format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
            } else {
                el_input.value = null
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-pk");
                el_input.removeAttribute("data-ppk");
             }
        } else {
    // --- lookup field in update_dict, get data from field_dict
            if (fldName in update_dict){
                const tblName = get_subdict_value_by_key (update_dict, "id", "table");
                const field_dict = get_dict_value_by_key (update_dict, fldName);
                const value = get_dict_value_by_key (field_dict, "value");
                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_offset = (selected_btn === "form") ? [-260, 210] : [-240, 210];

                if (["code", "name", "identifier"].indexOf( fldName ) > -1){
                   format_text_element (el_input, "value", el_msg, field_dict, is_addnew_row, msg_offset)
                } else if (["order", "shift"].indexOf( fldName ) > -1){
                   format_text_element (el_input, "code", el_msg, field_dict, is_addnew_row, msg_offset)
                } else if (fldName === "rosterdate"){
                    const display_str = get_dict_value_by_key (field_dict, "display");
                    const data_value_str = get_dict_value_by_key (field_dict, "value");

                    el_input.value = display_str;
                    el_input.setAttribute("data-value", data_value_str);
                } else if (fldName ===  "customer"){
                    // fldName "customer") is used in mode order
                    //console.log("fldName: ", fldName);
                    //console.log("field_dict: ", field_dict);
                    // abscat: use team_pk, but display order_code, is stored in 'value, team_code stored in 'code'
                    const customer_pk = get_dict_value_by_key (field_dict, "pk")
                    const customer_ppk = get_dict_value_by_key (field_dict, "ppk")
                    const customer_value = get_dict_value_by_key (field_dict, "code", "")
                    //console.log("customer_value: ", customer_value);
                    if (!!customer_value) {
                        el_input.value = customer_value;
                        el_input.setAttribute("data-value", customer_value);
                    } else {
                        el_input.value = null;
                        el_input.removeAttribute("data-value");
                    }
                    el_input.setAttribute("data-pk", customer_pk);
                    el_input.setAttribute("data-ppk", customer_ppk);
                    el_input.setAttribute("data-field", "customer");

                } else if (["priceratejson"].indexOf( fldName ) > -1){
                   format_price_element (el_input, el_msg, field_dict, msg_offset, user_lang)

                } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, loc.months_abbrev, loc.weekdays_abbrev,
                                user_lang, comp_timezone, hide_weekday, hide_year)

                } else if (fldName === "offsetstart"){
                    let display_time = null;
                    const offset_start = get_dict_value_by_key(update_dict, "offsetstart");
                    const offset_end = get_dict_value_by_key(update_dict, "offsetend");
                    if(!!offset_start || offset_end){
                        const offsetstart_formatted = display_offset_time (offset_start, timeformat, user_lang, true); // true = skip_prefix_suffix
                        const offsetend_formatted = display_offset_time (offset_end, timeformat, user_lang, true); // true = skip_prefix_suffix
                        display_time = offsetstart_formatted + " - " + offsetend_formatted
                    }
                    el_input.value = display_time

                } else if (fldName === "timeduration"){
                   //const tm_count = get_dict_value_by_key (update_dict, "tm_count");
                   const time_duration = get_dict_value_by_key(update_dict, "timeduration");
                   //const total_duration = (!!tm_count && time_duration) ? tm_count * time_duration : 0

                   //el_input.value = display_duration (total_duration, user_lang);
                   //const display_value = display_toFixed (total_duration, user_lang);
                   //el_input.value = display_toFixed (total_duration, user_lang);
                   //el_input.setAttribute("data-total_duration", total_duration);
                    el_input.value = display_toFixed (time_duration, user_lang);
                    el_input.setAttribute("data-total_duration", time_duration);
                } else if (fldName === "billable"){
                    format_billable_element (el_input, field_dict,
                    imgsrc_billable_black, imgsrc_billable_cross_red, imgsrc_billable_grey, imgsrc_billable_cross_grey,
                    loc.title_billable, loc.title_notbillable,)

                } else if (["employee", "replacement"].indexOf(fldName )> -1){
                    //const code_arr = get_dict_value_by_key (field_dict, "code");
                    //const len = code_arr.length;
                    //if(len === 0){
                    //    el_input.value = "---";
                    //} else if(len === 1){
                    //    el_input.value = code_arr[0];
                    //} else {
                    //    el_input.value = code_arr[0] + " (" + len.toString() + ")";
                    //    let title_str = "";
                    //    let data_value_str = ""
                    //    for (let i = 0; i < len; i++) {
                    //        let code = code_arr[i]
                    //        if (!code) {code = "---"};
                    //        title_str += "\n" + code;
                    //        data_value_str += ";" + code;
                    //    el_input.value = code_arr;
                    //    }
                    //    if (data_value_str.charAt(0) === ";") {data_value_str = data_value_str.slice(1)};
                    //    el_input.title = title_str
                    //    el_input.setAttribute("data-value", data_value_str);
                    const code_value =  get_dict_value_by_key (field_dict, "code");
                    el_input.value = get_dict_value_by_key (field_dict, "code", "---");

                } else if (fldName === "inactive") {
                   if(isEmpty(field_dict)){field_dict = {value: false}}
                   format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
                } else {
                    el_input.value = value
                    if(!!value){
                        el_input.setAttribute("data-value", value);
                    } else {
                        el_input.removeAttribute("data-value");
                    }
                };
            }  // if (fldName in update_dict)
        } // if (isEmpty(update_dict))

   }; // UpdateField


//========= UpdateAddnewRow  ==================================== PR2019-11-25
    function Update_AddnewRowXXX(sel_cust_pk, sel_cust_ppk, sel_cust_code ) {
        //console.log(" --- UpdateAddnewRow --- ", selected_btn)
        //console.log("sel_cust_pk: ", sel_cust_pk, "sel_cust_ppk: ", sel_cust_ppk, "sel_cust_code: ", sel_cust_code)
        // function puts pk and ppk of selected customer in addnew row
        // also add name and pk of selected customer in first field '(irst column is 'customer')
        // OLNY if selected_btn = "order"
        let tblFoot = document.getElementById("id_tfoot_order")  ;
        if(!!tblFoot.rows.length){
            let tblRow = tblFoot.rows[0];
            if(!!tblRow){
        // add pk and ppk of selected customer in addnew row
                    // put selected_customer_pk as ppk in tblRow
                    tblRow.setAttribute("data-ppk", sel_cust_pk)
        // first column is 'customer': add name and pk of selected customer in tis field
                    let el_input = tblRow.cells[0].children[0];
                    if(!!el_input){
                        if(!!sel_cust_pk){
                            el_input.setAttribute("data-pk", sel_cust_pk);
                            el_input.setAttribute("data-ppk", sel_cust_ppk);
                            el_input.setAttribute("data-value", sel_cust_code);
                            el_input.value = sel_cust_code;
                        } else {
                            el_input.removeAttribute("data-pk");
                            el_input.removeAttribute("data-ppk");
                            el_input.removeAttribute("data-value");
                            el_input.value = loc.Select_customer;
                        }
                    }
                    // always disable customer field
                    el_input.disabled = true;
 // --- loop through other cells of tablerow, disable / enable tblRow.cells
                for (let i = 1, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        el_input.disabled = (!sel_cust_pk);
                    };
                }
            }
        }  // if(!!tblFoot.rows.length)

    }  // UpdateAddnewRow

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");

        let header_text = "";
        if (selected_btn === "customer") { //show 'Customer list' in header when List button selected
            header_text = loc.Customer_list;
        } else {
            let customer_code = "", order_code = ""
            if (!!selected_customer_pk) {
                const dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
                customer_code = get_subdict_value_by_key(dict,"code", "value", "")
            }
            if (!!selected_order_pk) {
                const dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk)
                order_code = get_subdict_value_by_key(dict,"code", "value", "")
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

        user_lang = get_dict_value_by_key(setting_dict, "user_lang");
        comp_timezone = get_dict_value_by_key(setting_dict, "comp_timezone");
        interval = get_dict_value_by_key(setting_dict, "interval");
        timeformat = get_dict_value_by_key(setting_dict, "timeformat");

        const selected_pk_dict = get_dict_value_by_key(setting_dict, "selected_pk")
        if(!isEmpty(selected_pk_dict)){
        // selected_pk: {sel_cust_pk: 657, sel_order_pk: 1399, sel_scheme_pk: 1642}
            selected_customer_pk = get_dict_value_by_key(selected_pk_dict, "sel_cust_pk", 0)
            selected_order_pk = get_dict_value_by_key(selected_pk_dict, "sel_order_pk", )

        }  // if(!isEmpty(selected_pk_dict)){

        const page_dict = get_dict_value_by_key(setting_dict, "page_customer")
        if(!!page_dict){
            const saved_btn = get_dict_value_by_key(page_dict, "btn")
            selected_btn = (!!saved_btn) ? saved_btn : "customer";

// ---  always call HandleBtnSelect here, to unhide selected table
        // moved to refresh_maps, must be called after creating maps
            //HandleBtnSelect(selected_btn, true);  // true = skip_update

            //console.log( " UpdateSettings HandleBtnCalendar ====");
            //HandleBtnCalendar("thisweek")


        }  //  if(!!page_dict)
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

//========= update_map_item  ====================================
    function update_map_item(map_id, update_dict){
        //console.log(" --- update_map_item ---") // PR2019-11-26

        const id_dict = get_dict_value_by_key (update_dict, "id");
        if(!isEmpty(id_dict)){
            const tblName = get_dict_value_by_key(id_dict, "table");
            const pk_int = get_dict_value_by_key(id_dict, "pk");
            const map_id = get_map_id(tblName, pk_int);
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);

        //--- replace updated item in map or remove deleted item from map
            let data_map = (tblName === "customer") ? customer_map :
                           (tblName === "order") ? order_map :
                           (tblName === "teammember") ? teammember_map : null
            if(is_deleted){
                data_map.delete(map_id);
            } else if(is_created){
        // insert new item in alphabetical order,
                if (!!data_map.size){
                    insertInMapAtIndex(data_map, map_id, update_dict, 0, user_lang)
                } else {
                    data_map.set(map_id, update_dict)
                }
            } else {
                data_map.set(map_id, update_dict)
            }

        }  // if(!isEmpty(id_dict))
        //console.log(data_map) // PR2019-11-26
    }  // update_map_item


//###########################################################################
// +++++++++++++++++ UPLOAD +++++++++++++++++++++++++++++++++++++++++++++++++

//========= UploadDeleteChanges  ============= PR2019-10-23
    function UploadDeleteChanges(upload_dict, url_str) {
         console.log("--- UploadDeleteChanges  --------------");
        // console.log("upload_dict");

// if delete: add 'delete' to id_dict and make tblRow red
    const is_delete = (!!get_subdict_value_by_key(upload_dict, "id","delete"))
        // console.log("is_delete:", is_delete, typeof is_delete);

    if(is_delete){
        const pk_int = get_subdict_value_by_key(upload_dict, "id", "pk");
        const tblName = get_subdict_value_by_key(upload_dict, "id", "table");
        const map_id = get_map_id(tblName, pk_int);
        // console.log("is_delete:", is_delete, typeof is_delete);

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

//========= UploadFormChanges  ============= PR2019-09-23
    function UploadFormChanges(el_input) {
        // console.log( " ==== UploadFormChanges ====");
        let id_dict = {}, upload_dict = {};
        if(!!el_input){
            if(!selected_customer_pk){
                // get new temp_pk
                id_new = id_new + 1
                const pk_new = "new" + id_new.toString()
                id_dict = {temp_pk: pk_new, "create": true, "table": "customer", "mode": selected_btn}
            } else {
                // update existing record
                // TODO check if this works
                const tblName = get_attr_from_el(tblRow, "data-table")
                const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
                const map_id = get_map_id(tblName, pk_str);
                let itemdict = get_mapdict_from_datamap_by_id(customer_map, map_id)
                id_dict = get_dict_value_by_key(itemdict, "id")
            }  // if(!selected_customer_pk)
    // create upload_dict
            let upload_dict = {"id": id_dict};
    // create field_dict
            const fieldname = get_attr_from_el(el_input,"data-field")
            let field_dict = {"update": true}
            if(!!el_input.value) {field_dict["value"] = el_input.value}
            upload_dict[fieldname] = field_dict;

    // UploadChanges
            UploadChanges(upload_dict, url_customer_upload);
        } // if(!!el_input){
    }  // UploadFormChanges

//========= UploadElChanges  ============= PR2019-09-23
    function UploadElChanges(el_input) {
        //console.log( " ==== UploadElChanges ====");
        // console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){

// ---  create id_dict
            // 'get_iddict_from_element' gets 'data-pk', 'data-ppk', 'data-table', 'data-mode', 'data-cat' from element
            // and puts it as 'pk', 'ppk', 'temp_pk', 'create', 'mode', 'cat' in id_dict
            // id_dict = {'temp_pk': 'new_4', 'create': True, 'ppk': 120}
            let id_dict = get_iddict_from_element(tblRow);
            const tblName = get_dict_value_by_key(id_dict, "table")
            console.log( "id_dict", id_dict);

            let upload_dict = {"id": id_dict};

// ---  get fieldname from 'el_input.data-field'
            const fieldname = get_attr_from_el(el_input, "data-field");
            if (!!fieldname){
                let n_value = null;
                if (["code", "name", "identifier", "priceratejson"].indexOf( fieldname ) > -1){
                    n_value = (!!el_input.value) ? el_input.value : null
                } else {
                    n_value = get_attr_from_el(el_input, "data-value");
                };

                let field_dict = {};
                field_dict["value"] = n_value;
                field_dict["update"] = true;
                upload_dict[fieldname] = field_dict;

            }  // if (!!fieldname){

            const url_str = (tblName === "pricerate") ? url_pricerate_upload : url_customer_upload
            UploadChanges(upload_dict, url_str);
        }  // if(!!el_input){
    }  // UploadElChanges


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

                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const update_dict = response["update_list"][i];
                            UpdateFromResponse(update_dict);
                        }
                    };
// --- refresh maps and fill tables
                    refresh_maps(response);

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadChangesDict

//###########################################################################
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        // console.log("===  HandlePopupDateOpen  =====") ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected,

        if (!!tr_selected){
            const row_id = tr_selected.id;
            //const btnName = get_attr_from_el(tr_selected, "data-mode")
            const data_table = get_attr_from_el(tr_selected, "data-table")
            const data_pk = get_attr_from_el(tr_selected, "data-pk")
            const data_ppk = get_attr_from_el(tr_selected, "data-ppk");
            //console.log("data_table", data_table, "data_pk", data_pk, "data_ppk", data_ppk)


// get values from el_input
            //NIU const el_id = get_attr_from_el(el_input, "id");
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            //console.log("data_field", data_field, "data_value", data_value)

            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");
            //console.log("data_mindate", data_mindate, "data_maxdate", data_maxdate);

    // put values in el_popup_date_container
            // NIU el_popup_date_container.setAttribute("data-el_id", el_id);
            el_popup_date_container.setAttribute("data-row_id", row_id);
            //el_popup_date_container.setAttribute("data-mode", btnName);
            el_popup_date_container.setAttribute("data-table", data_table);
            el_popup_date_container.setAttribute("data-pk", data_pk);
            el_popup_date_container.setAttribute("data-ppk", data_ppk);

            el_popup_date_container.setAttribute("data-field", data_field);
            el_popup_date_container.setAttribute("data-value", data_value);

            if (!!data_mindate) {el_popup_date.setAttribute("min", data_mindate);
            } else {el_popup_date.removeAttribute("min")}
            if (!!data_maxdate) {el_popup_date.setAttribute("max", data_maxdate);
            } else {el_popup_date.removeAttribute("max")}

            if (!!data_value){el_popup_date.value = data_value};

    // ---  position popup under el_input
            let popRect = el_popup_date_container.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();

            const pop_width = 0; // to center popup under input box
            const correction_left = -240 - pop_width/2 ; // -240 because of sidebar
            const correction_top = -32; // -32 because of menubar
            let topPos = inpRect.top + inpRect.height + correction_top;
            let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;
            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_popup_date_container.setAttribute("style", msgAttr)

    // ---  show el_popup
            el_popup_date_container.classList.remove(cls_hide);
            //console.log("el_popup_date_container", el_popup_date_container);
        }  // if (!!tr_selected){

}; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-04-14
    function HandlePopupDateSave() {
        // console.log("===  function HandlePopupDateSave =========");

// ---  get pk_str from id of el_popup
        const row_id = get_attr_from_el(el_popup_date_container, "data-row_id");
        const pk_str = get_attr_from_el(el_popup_date_container, "data-pk", null) // pk of record  of element clicked
        const ppk_int = get_attr_from_el_int(el_popup_date_container, "data-ppk");
        const fieldname = get_attr_from_el(el_popup_date_container, "data-field");  // nanme of element clicked
        const tblName = get_attr_from_el(el_popup_date_container, "data-table");

        el_popup_date_container.classList.add(cls_hide);

        if(!!pk_str && !! ppk_int){
            let upload_dict = {};
            let id_dict = {"ppk": ppk_int, "table": tblName}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            let pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict["temp_pk"] = pk_str;
                id_dict["create"] = true;
            } else {
        // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };
            upload_dict["id"] = id_dict

            const n_value = el_popup_date.value
            const o_value = get_attr_from_el(el_popup_date_container, "data-value")
            if (n_value !== o_value) {
                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {"update": true}
                if(!!n_value){field_dict["value"] = n_value};
                upload_dict[fieldname] =  field_dict;

// put new value in inputbox before new value is back from server
                let tr_selected = document.getElementById(row_id)

                const parameters = {"upload": JSON.stringify (upload_dict)}
                // console.log (">>> upload_dict: ", upload_dict);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_customer_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        // console.log (">>> response", response);
                        if ("update_list" in response) {
                            const update_dict = response["update_list"]
                //--- loop through update_dict
                            for (let key in update_dict) {
                                if (update_dict.hasOwnProperty(key)) {
                                    UpdateTableRow(tr_selected, update_dict[key]);
                                }  // if (update_dict.hasOwnProperty(key))
                            }  // for (let key in update_dict)
                        }  // if ("update_list" in response)
                    },
                    error: function (xhr, msg) {
                        //console.log(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)
        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++ MODAL SHIFT ORDER ++++++++++++++++++++++++++++++++++++++++++++++++++++ PR2019-12-30

//=========  MSO_Open  ================ PR2019-10-28
    function MSO_Open(el_input) {
        console.log(" ======  MSO_Open  =======")

        let mod_shift_option = "mod_shift";
        let tr_selected = get_tablerow_selected(el_input)

        mod_upload_dict = {};
        let order_pk = null, order_ppk = null, order_code = null, customer_code = null;
        let scheme_dict = {};
        let scheme_pk = null,  scheme_code = null, scheme_cycle = null, scheme_datefirst = null, scheme_datelast = null;
        let scheme_excludepublicholiday = false, scheme_excludecompanyholiday = false;
        let shift_dict = {};
        let shift_pk = null, shift_ppk = null, shift_code = null, shiftcode_haschanged = false;
        let offset_start = null, offset_end = null;
        let break_duration = null, time_duration = null, offsetstart_haschanged = false;
        let team_dict = {};
        let team_pk = null, team_code = null;
        let schemeitem_pk = null, schemeitem_ppk = null, teammember_pk = null, teammember_ppk = null;

        // calendar_datefirst/last is used to create a new employee_calendar_list
        // calendar_period + {datefirst: "2019-12-09", datelast: "2019-12-15", employee_id: 1456}
        const calendar_datefirst = get_dict_value_by_key(selected_calendar_period, "rosterdatefirst");
        const calendar_datelast = get_dict_value_by_key(selected_calendar_period, "rosterdatelast");

// ---  get rosterdate and weekday from date_cell
        let tblCell = el_input.parentNode;
        const cell_index = tblCell.cellIndex
        let tblHead = document.getElementById("id_thead_calendar")
        const date_cell = tblHead.rows[1].cells[cell_index].children[0]
        const rosterdate_iso = get_attr_from_el_str(date_cell, "data-rosterdate")
        let cell_weekday_index = get_attr_from_el_int(date_cell, "data-weekday")

// ---  get row_index from tr_selected
        // getting weekday index from  data-weekday goes wrong, because of row span
        // must be corrected with the number of spanned row of this tablerow
        // number of spanned rows are stored in list spanned_rows, index is row-index

        // rowindex is stored in tblRow, rowindex, used to get the hour that is clicked on
        const row_index = get_attr_from_el_int(tr_selected, "data-rowindex")

// ---  count number of spanned columns till this column   [4, 1, 1, 0, 0, 1, 1, 0] (first column contains sum)
        const column_count = 7 // tbl_col_count["planning"];
        const spanned_column_sum = count_spanned_columns (tr_selected, column_count, cell_weekday_index)
        const weekday_index = cell_weekday_index + spanned_column_sum;

// ---  get info from calendar_map
        const map_id = get_attr_from_el(el_input, "data-pk");
        let selected_weekday_list = [], add_new_mode = false;
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(calendar_map, "planning", map_id);
        console.log("map_dict: ", map_dict)

// ++++++++++++++++ clicked on cell with item in calendar_map ++++++++++++++++
        if(!isEmpty(map_dict)){
// ---  get selected_weekday_list from map_dict, select weekday buttons (dont mix up with loc.weekdays_abbrev that contains names of weekdays)
            selected_weekday_list = get_dict_value_by_key(map_dict, "weekday_list");
            console.log("selected_weekday_list: ", selected_weekday_list)
// -------------------------------------
// ---  get order from shift if clicked on shift, otherwise: get selected_order_pk
            order_pk = get_subdict_value_by_key(map_dict, "order", "pk");
            order_ppk = get_subdict_value_by_key(map_dict, "order", "ppk");
            order_code = get_subdict_value_by_key(map_dict, "order", "code");
            customer_code = get_subdict_value_by_key(map_dict, "customer", "code");
// -------------------------------------
// ---  lookup scheme_map, get scheme info from scheme_map
            scheme_pk = get_subdict_value_by_key(map_dict, "scheme", "pk");
            if(!!scheme_pk){
                scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", scheme_pk)
                scheme_code = get_subdict_value_by_key(scheme_dict, "code", "value");
                scheme_cycle = get_subdict_value_by_key(scheme_dict, "cycle", "value");
                scheme_datefirst = get_subdict_value_by_key(scheme_dict, "datefirst", "value");
                scheme_datelast = get_subdict_value_by_key(scheme_dict, "datelast", "value");
                scheme_excludepublicholiday = get_subdict_value_by_key(scheme_dict, "excludepublicholiday", "value", false);
                scheme_excludecompanyholiday = get_subdict_value_by_key(scheme_dict, "excludecompanyholiday", "value", false);
            }
// -------------------------------------
// ---  lookup shift_map, get shift info from shift_map
            shift_pk = get_subdict_value_by_key(map_dict, "shift", "pk");
            shift_ppk = get_subdict_value_by_key(map_dict, "shift", "ppk");
            if(!!shift_pk){
                shift_dict = get_mapdict_from_datamap_by_tblName_pk(shift_map, "shift", shift_pk)
                shift_code = get_subdict_value_by_key(shift_dict, "code", "value");
                offset_start = get_subdict_value_by_key(shift_dict, "offsetstart", "value");
                offset_end = get_subdict_value_by_key(shift_dict, "offsetend", "value");
                break_duration = get_subdict_value_by_key(shift_dict, "breakduration", "value");
                time_duration = get_subdict_value_by_key(shift_dict, "timeduration", "value");
            }
// -------------------------------------
// ---  lookup team_map, get team info from team_map
            team_pk = get_subdict_value_by_key(map_dict, "team", "pk");
            if(!!team_pk){
                team_dict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk)
                team_code = get_subdict_value_by_key(team_dict, "code", "value");
            }
// -------------------------------------
            schemeitem_pk = get_subdict_value_by_key(map_dict, "schemeitem", "pk");
            schemeitem_ppk = get_subdict_value_by_key(map_dict, "schemeitem", "ppk");

        } else {
// ++++++++++++++++ clicked on empty cell ++++++++++++++++
            add_new_mode = true;

// ---  get selected order_pk when cliced on empty row
            order_pk= selected_order_pk;
            const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", order_pk);
            if(!isEmpty(order_dict)){
                order_pk = get_subdict_value_by_key(order_dict, "id", "pk");
                order_ppk = get_subdict_value_by_key(order_dict, "id", "ppk");
                order_code = get_subdict_value_by_key(order_dict, "code", "value");
                customer_code = get_subdict_value_by_key(order_dict, "customer", "code");
            };

// create scheme_dict
            id_new = id_new + 1
            const scheme_pk_str = "new" + id_new.toString();
            scheme_dict = {id: {pk: scheme_pk_str, ppk: order_pk, table: "scheme", create: true},
                     code: {value: null},
                     cycle: {value: 7},
                     datefirst: {value: null},
                     datelast: {value: null},
                     excludepublicholiday: {value: false},
                     excludecompanyholiday: {value: false}};

// create shift_dict
        // create new shift_pk
            id_new = id_new + 1
            shift_pk = "new" + id_new.toString();
            shift_ppk = scheme_pk_str;
            offset_start = 60 * row_index
            shift_code = MSO_CreateShiftname(offset_start);
            shiftcode_haschanged = true
            offsetstart_haschanged = true
        // shift_dict will be created further in in MSO_FillShiftValues

 // create team_dict
        // create new team_pk
            id_new = id_new + 1
            const team_pk_str = "new" + id_new.toString();
        // create new team_code
            team_code = get_teamcode_with_sequence(team_map, scheme_pk_str, loc)
        // create team_dict
            team_dict = {id: {pk: team_pk_str, ppk: scheme_pk_str, table: "team", create: true},
                        code: {value: team_code, update: true}};
        };  //  if(!isEmpty(map_dict)){

// --- reset mod_upload_dict
        // shift is filled in MSO_FillShiftValues
        mod_upload_dict = {map_id: map_id,
                            calendar: {mode: mod_shift_option,
                                       rosterdate: rosterdate_iso,
                                       weekday_index: weekday_index,
                                       weekday_list: selected_weekday_list,
                                       calendar_datefirst: calendar_datefirst,
                                       calendar_datelast: calendar_datelast},
                            order:  {id: {pk: order_pk, ppk: order_ppk, table: "order"},
                                     code: {value: order_code}},
                            scheme: scheme_dict,
                            shift: {},
                            team:   team_dict,
                            teammember: {id: {pk: null, ppk: null, table: "teammember"}},
                            schemeitem: {id: {pk: schemeitem_pk, ppk: schemeitem_ppk, table: "schemeitem"}},
                            shift_list: [],
                            team_list: [],
                            teammember_list: [],
                            schemeitem_list: []
                            };

// store offset in mod_upload_dict and calculate min max
        console.log("shift_code: ", shift_code)
        MSO_FillShiftValues(mod_upload_dict.shift, shift_pk, shift_ppk, shift_code, offset_start, offset_end, break_duration, time_duration,
                                shiftcode_haschanged, offsetstart_haschanged)


        // create new team with 1 teammmeber when clicked on empty hour
        if(add_new_mode){
            MSO_SelectTeamChanged();
        }
    // fill team_list with map_dicts of teams of this scheme
        // deepcopy the shifts, teams, teammembers and schemeitems of the selected scheme from the maps into the mod_upload lists.
        // the data_maps stay unchanged, so when updates are canceled the orginal values are still there.
        MSO_FillShiftTeamTeammemberSchemitemList(scheme_pk);

// ---  put order name in header
        const order_text = (!!order_code) ? customer_code + " - " + order_code : loc.Select_order + "...";
        document.getElementById("id_modshift_header").innerText = order_text;

// ---  put scheme name in sub header
        document.getElementById("id_modshift_header_scheme").innerText = scheme_code;

// ---  highlight selected button mod_shift / mod_team
        set_element_class("id_modshift_btn_shift", (mod_shift_option === "mod_shift"), cls_btn_selected)
        set_element_class("id_modshift_btn_employees", (mod_shift_option === "mod_team"), cls_btn_selected)

// ---  show only the elements that are used in this mod_shift_option
        let list = document.getElementsByClassName("mod_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains(mod_shift_option)
            show_hide_element(el, is_show)
        }

// ---  fill shift options, set select shift in selectbox
        let el_select = document.getElementById("id_modshift_selectshift");
        let new_option_txt =  "&lt;" +  loc.New_shift.toLowerCase() + "&gt;"
        const selected_shift_pk_int = (!!shift_pk) ? shift_pk : 0;
        console.log(">>>>>>>>>>>> selected_shift_pk_int: ", selected_shift_pk_int, typeof selected_shift_pk_int)
        el_select.innerHTML = FillOptionShiftOrTeam(shift_map, scheme_pk, selected_shift_pk_int, true, new_option_txt);
        //el_select.value = selected_shift_pk_int;

// ---  create shift name, pu it in el_modshift_shiftcode
        const cur_shift_code = el_modshift_shiftcode.value;
        const calc_shift_code = MSO_CreateShiftname(offset_start, offset_end, cur_shift_code);
        el_modshift_shiftcode.value = (!!calc_shift_code) ? calc_shift_code : null;

// ---  fill team options, set select team in selectbox
        el_select = document.getElementById("id_modshift_selectteam");
        new_option_txt =  "&lt;" +  loc.New_team.toLowerCase() + "&gt;"
        const selected_team_pk_int = (!!team_pk) ? team_pk : 0;
        el_select.innerHTML = FillOptionShiftOrTeam(team_map, scheme_pk, selected_team_pk_int, false, new_option_txt);
        //el_select.value = selected_team_pk_int;

        el_modshift_teamcode.value = team_code;

// ---  fill tabe teammembers
        MSO_CreateTblTeammemberHeader();
        MSO_CreateTblTeammemberFooter()
        MSO_FillTableTeammember();

// ---  display offset, selected values are shown because they are added to mod_upload_dict
        ModShiftUpdateInputboxes()

// ---  put datefirst datelast in input boxes
        el_modshift_datefirst.value = (!!scheme_datefirst) ? scheme_datefirst : null;
        el_modshift_datelast.value = (!!scheme_datelast) ? scheme_datelast : null;

// ---  show onceonly only in new shifts, reset checkbox, enable datefirst datelast
        document.getElementById("id_modshift_onceonly").checked = false
        let el_onceonly_container = document.getElementById("id_modshift_onceonly_container")
        if(isEmpty(map_dict)){
            el_onceonly_container.classList.remove(cls_hide)
        } else {
            el_onceonly_container.classList.add(cls_hide)
        }
        document.getElementById("id_modshift_datefirst").readOnly = false;
        document.getElementById("id_modshift_datelast").readOnly = false;

// ---  set weekdays, don't disable
        MSO_BtnWeekdaySchemeitemsFormat(false);

// --- set excluded checkboxen upload_dict, don't disable
        el_modshift_publicholiday.checked = scheme_excludepublicholiday;
        el_modshift_companyholiday.checked = scheme_excludecompanyholiday;
        el_modshift_publicholiday.disabled = false;
        el_modshift_companyholiday.disabled = false;

// ---  enable save button
        MSO_BtnSaveDeleteEnable()

        console.log("mod_upload_dict: ", mod_upload_dict)
// ---  show modal
        $("#id_modshift").modal({backdrop: true});
    };  // MSO_Open

//=========  MSO_Save  ================ PR2019-11-23
    function MSO_Save(mode){
        console.log( "===== MSO_Save  ========= ");
        console.log("mod_upload_dict: ", mod_upload_dict)

        const is_delete = (mode === "delete");

// ---  get map_dict - to check if values have changed
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(calendar_map, "planning", mod_upload_dict.map_id);
        const has_map = (!isEmpty(map_dict));

// ---  get selected schemeitem_pk
        const sel_scheme_pk = get_subsubdict_value_by_key(mod_upload_dict, "scheme", "id", "pk")

// ---  get weekdays - only in singleshift
        // data-selectedoptions are: 'selected', 'delete', 'create', 'not_selected', 'none'
        let old_weekday_list = mod_upload_dict.calendar.weekday_list;

        let new_weekday_list = [,,,,,,,];
        btns = document.getElementById("id_modshift_weekdays").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i];
            let btn_index = i + 1;
            const data_selected = get_attr_from_el(btn, "data-selected");
            const crud_txt = (data_selected === "delete") ? "delete" :
                             (data_selected === "create") ? "create" : "update"
            // weekday_arr = | update, 1678, 1200, 156, 567|  i.e. |update, schemeitem_pk, scheme_pk, team_pk, shift_pk|
            // weekday can have multiple schemitems

            let new_weekday_str = "";
            if(data_selected === "create"){
                new_weekday_str = new_weekday_str + "|" + crud_txt + ",0,0,0";
            } else if(data_selected === "selected" || data_selected === "delete"){
                if (!!old_weekday_list[btn_index]){
                    const old_schemeitem_arr = old_weekday_list[btn_index].split("|");
                    for (let j = 0, len = old_schemeitem_arr.length; j < len; j++) {
                        const arr = old_schemeitem_arr[j].split(",");
                        const scheme_pk = arr[2]
                        if(scheme_pk === sel_scheme_pk.toString()){
                            // for now the team_pk ans shift_pk of 'shift' and 'team' will be used to change scheitem
                            // all shcemeitems of this scheme on this date will be changed
                            // in the future when multiple schemeitems must be updated arr3 and arr4 wiil be used to specify per sschemitem
                            arr[3] = "-";
                            arr[4] = "-";
                            new_weekday_str = new_weekday_str + "|" + crud_txt + "," + arr[1] + "," + arr[2] + "," + arr[3] + "," + arr[4];
                        }
                    }  // for (let j = 0,
                };  // if (!!old_weekday_list[btn_index]){
            } else {
                new_weekday_str = "-"
            }
            if (new_weekday_str.charAt(0) === "|") {
                new_weekday_str = new_weekday_str.slice(1);
            }
            new_weekday_list[btn_index] = new_weekday_str;
        }
        // to prevent error: 'int' object is not subscriptable by: mode = weekdaylist_value[:6]
        new_weekday_list[0] = "-"

// ---  get changed teammembers - mod_upload_dict.teammember_list contains pk's of changed, created, deleted teammembers
        let teammembers_tobe_updated = []
        //console.log("mod_upload_dict.teammember_list")
        //console.log(mod_upload_dict.teammember_list)
        for (let i = 0, pk, len =  mod_upload_dict.teammember_list.length; i < len; i++) {
            const dict = mod_upload_dict.teammember_list[i];
            // id: {pk: 1092, ppk: 2131, table: "teammember"}
            //scheme: {value: "Schema 1", pk: 1658, ppk: 1420, code: "Schema 1"}
            //team: {pk: 2131, ppk: 1658, code: "Ploeg A"}
            //employee: {pk: 2625, ppk: 3, code: "Agata MM"}
            //replacement: {pk: 2612, ppk: 3, code: "Martis SA"}
            //datefirst: {mindate: "1991-10-20"}
            //datelast: {mindate: "1991-10-20"}

            const id_dict = get_dict_value_by_key(dict, "id");
            if(!isEmpty(id_dict)){
                let tobe_updated = ("create" in id_dict || "delete" in id_dict);
                let teammember_dict = {id: id_dict};
                const fields = ["scheme", "team", "employee", "replacement", "datefirst", "datelast"];
                for (let field of fields) {
                    const field_dict = get_dict_value_by_key(dict, field);
                    if(!isEmpty(field_dict)){
                        //console.log("field_dict: ", field_dict)
                        if ("update" in field_dict) {
                        //console.log("update in field_dict: ")
                            teammember_dict[field] = field_dict;
                            tobe_updated = true
                        }
                    }
                }
                if(tobe_updated) {
                    teammembers_tobe_updated.push(teammember_dict);
                    //console.log("teammembers_tobe_updated: ", dict)
                }  // if(!isEmpty(dict) && "update" in dict)
            }  // if(!isEmpty(id_dict)){


        }  //  for (let i = 0, pk, len =  mod_upload_dict.teammember_list.length; i < len; i++) {
        //console.log("teammembers_tobe_updated")
        //console.log(teammembers_tobe_updated)

// =========== CREATE UPLOAD DICT =====================
        let id_dict = {mode: "schemeshift"}
        if(!mod_upload_dict.map_id){
            id_dict["create"] = true};

        let upload_dict = {id: id_dict,
                            rosterdate: mod_upload_dict.calendar.rosterdate,
                            calendar_datefirst: mod_upload_dict.calendar.calendar_datefirst,
                            calendar_datelast: mod_upload_dict.calendar.calendar_datelast,
                            weekday_index: mod_upload_dict.calendar.weekday_index,
                            weekday_list: new_weekday_list,
                            teammember_list: teammembers_tobe_updated
                            };

// =========== ORDER INFO =====================
        // get order from mod_upload_dict
        const order_pk = get_subdict_value_by_key(mod_upload_dict.order, "id", "pk")
        const order_ppk = get_subdict_value_by_key(mod_upload_dict.order, "id", "ppk")
        upload_dict["order"] = {id: {pk: order_pk, ppk: order_ppk, table: "order"}};
        upload_dict["order"] = mod_upload_dict.order;

// =========== SCHEME INFO =====================
        upload_dict["scheme"] = mod_upload_dict.scheme;
        if(is_delete) upload_dict.scheme.id["delete"] = true;

// =========== SHIFT INFO =====================
        upload_dict["shift"] = mod_upload_dict.shift;

// =========== TEAM INFO =====================
        upload_dict["team"] = mod_upload_dict.team;

// =========== SCHEMEITEM INFO =====================
        // schemeitem_dict in upload only contains info of clicked schemeitem, in case day has multiple schemitems
        let schemeitem_dict = {id: {table: "schemeitem"}};
        const schemeitem_pk = get_subdict_value_by_key(mod_upload_dict.schemeitem, "id", "pk")
        const schemeitem_ppk = get_subdict_value_by_key(mod_upload_dict.schemeitem, "id", "ppk")
        if(!!schemeitem_pk){
            schemeitem_dict.id["pk"] = schemeitem_pk
            schemeitem_dict.id["ppk"] = schemeitem_ppk
        } else {
            schemeitem_dict.id["create"] = true
        }
        upload_dict["schemeitem"] = schemeitem_dict;

// =========== UploadChanges =====================
        UploadChanges(upload_dict, url_teammember_upload);
    }  // MSO_Save

//=========  MSO_TimepickerOpen  ================ PR2019-10-12
    function MSO_TimepickerOpen(el_input, calledby) {
        console.log("=== MSO_TimepickerOpen ===", calledby);

        const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk );
        //console.log("mod_upload_dict", mod_upload_dict);

// ---  create st_dict
        const show_btn_delete = true;
        let st_dict = { "interval": interval, "comp_timezone": comp_timezone, "user_lang": user_lang,
                        "show_btn_delete": show_btn_delete,
                        "weekday_list": loc.weekdays_abbrev, "month_list": loc.months_abbrev,
                        "url_settings_upload": url_settings_upload};
        // only needed in scheme
        if(!!loc.Current_day){st_dict["text_curday"] = loc.Current_day};
        if(!!loc.Previous_day){st_dict["text_prevday"] = loc.Previous_day};
        if(!!loc.Next_day){st_dict["text_nextday"] = loc.Next_day};
        if(!!loc.Break){st_dict["txt_break"] = loc.Break};
        if(!!loc.Working_hours){st_dict["txt_workhours"] = loc.Working_hours};

        if(!!loc.btn_save){st_dict["txt_save"] = loc.btn_save};
        if(!!loc.Quick_save){st_dict["txt_quicksave"] = loc.Quick_save};
        if(!!loc.Exit_Quicksave){st_dict["txt_quicksave_remove"] = loc.Exit_Quicksave};

        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        if(!!imgsrc_delete){st_dict["imgsrc_delete"] = imgsrc_delete};

// ---  create tp_dict
        let tp_dict = {}
        const fldName = get_attr_from_el(el_input, "data-field");

        const pk_int = get_subsubdict_value_by_key(mod_upload_dict, "shift", "id", "pk")
        const ppk_int = get_subsubdict_value_by_key(mod_upload_dict, "shift", "id", "ppk")
        const id_dict = {pk: pk_int, ppk: ppk_int, table: "shift"};
        const rosterdate = null; // keep rosterdate = null, to show 'current day' insteaa of Dec 1

        let offset = get_subdict_value_by_key(mod_upload_dict.shift, fldName, "value")
        let minoffset = get_subdict_value_by_key(mod_upload_dict.shift, fldName, "minoffset")
        let maxoffset = get_subdict_value_by_key(mod_upload_dict.shift, fldName, "maxoffset")

        tp_dict = {"id": id_dict, "field": fldName, "mod": calledby, "rosterdate": rosterdate,
            "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
            "isampm": (timeformat === 'AmPm'), "quicksave": quicksave}
        //if(!!weekday){tp_dict['weekday'] = weekday}

        ModTimepickerOpen(el_input, MSO_TimepickerResponse, tp_dict, st_dict)

    };  // MSO_TimepickerOpen

//========= MSO_TimepickerResponse  ============= PR2019-10-12
    function MSO_TimepickerResponse(tp_dict) {
        console.log(" === MSO_TimepickerResponse ===" );
        console.log("tp_dict", tp_dict);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};
        //console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = get_dict_value_by_key(tp_dict, "field")
            const shift_pk = get_subdict_value_by_key(tp_dict, "id", "pk")
            const shift_ppk = get_subdict_value_by_key(tp_dict, "id", "ppk")

    // ---  get current values from mod_upload_dict.shift
            let shift_code = get_subdict_value_by_key(mod_upload_dict.shift, "code", "value")
            let offset_start = get_subdict_value_by_key(mod_upload_dict.shift, "offsetstart", "value")
            let offset_end = get_subdict_value_by_key(mod_upload_dict.shift, "offsetend", "value")
            let break_duration = get_subdict_value_by_key(mod_upload_dict.shift, "breakduration", "value", 0)
            let time_duration = get_subdict_value_by_key(mod_upload_dict.shift, "timeduration", "value", 0)

     // ---  get new value from tp_dict
            const new_offset = get_dict_value_by_key(tp_dict, "offset")
            console.log( "new_offset: ", new_offset);

    // ---  put new value in variable
            let shiftcode_haschanged = false, offsetstart_haschanged = false, offsetend_haschanged = false;
            let breakduration_haschanged = false, timeduration_haschanged = false;
            if (fldName === "offsetstart") {
                offsetstart_haschanged = (new_offset !== offset_start)
                offset_start = new_offset
            } else if (fldName === "offsetend") {
                offsetend_haschanged = (new_offset !== offset_end)
                offset_end = new_offset
            } else if (fldName === "breakduration") {
                breakduration_haschanged = (new_offset !== break_duration)
                break_duration = new_offset
            }

            if(fldName === "timeduration"){
                timeduration_haschanged = (new_offset !== time_duration)
                time_duration = new_offset
                if(!!time_duration){
                    offset_start = null;
                    offset_end = null;
                    break_duration = 0
                }
            } else {
                time_duration = (offset_start != null && offset_end != null) ? offset_end - offset_start - break_duration : 0;
            }

            const value_has_changed = (offsetstart_haschanged || offsetend_haschanged || breakduration_haschanged || timeduration_haschanged)
            console.log( "value_has_changed: ", value_has_changed);

            if (value_has_changed){
                const new_shift_code = MSO_CreateShiftname(offset_start, offset_end, shift_code);
                if (new_shift_code !== shift_code){
                    shift_code = new_shift_code;
                    shiftcode_haschanged = true;
                }
                console.log( "shift_code: ", shift_code);
                console.log( "shiftcode_haschanged: ", shiftcode_haschanged);

    // check if this scheme already has a shift with the same times. If so: change pk instead of changing values
                const shift_list = mod_upload_dict.shift_list;
                const same_shift_pk = Lookup_Same_Shift(shift_list, shift_ppk, offset_start, offset_end, break_duration, time_duration, false )
                console.log( "same_shift_pk: ", same_shift_pk);
                if (!!same_shift_pk) {
                    // if shift with same offset already exists: change shift to same_shift, may have difefrent name
                        MSO_SelectShiftPkChanged(same_shift_pk);
                        el_modshift_selectshift.value = same_shift_pk;

                } else {
    // calculate min max values and store offset in mod_upload_dict
                    MSO_FillShiftValues(mod_upload_dict.shift, shift_pk, shift_ppk, shift_code, offset_start, offset_end, break_duration, time_duration,
                        shiftcode_haschanged, offsetstart_haschanged, offsetend_haschanged, breakduration_haschanged, timeduration_haschanged)

    // ---  display offset, selected values are shown because they are added to mod_upload_dict
                    ModShiftUpdateInputboxes()
                }
    // set focus to next element
                const next_el_id = (fldName === "offsetstart") ? "id_modshift_offsetend" : "id_modshift_btn_save";
                setTimeout(function() { document.getElementById(next_el_id).focus()}, 50);
            }  // if (value_has_changed)
        }  // if("save_changes" in tp_dict) {
     }  //MSO_TimepickerResponse

//========= ModShiftUpdateInputboxes  ============= PR2019-12-07
    function ModShiftUpdateInputboxes() {
        console.log( " === ModShiftUpdateInputboxes ");
        //console.log( mod_upload_dict);

        const shift_code = get_subdict_value_by_key(mod_upload_dict.shift, "code", "value")
        const offset_start = get_subdict_value_by_key(mod_upload_dict.shift, "offsetstart", "value")
        const offset_end = get_subdict_value_by_key(mod_upload_dict.shift, "offsetend", "value")
        const break_duration = get_subdict_value_by_key(mod_upload_dict.shift, "breakduration", "value")
        const time_duration = get_subdict_value_by_key(mod_upload_dict.shift, "timeduration", "value")

        el_modshift_shiftcode.value = shift_code
        el_modshift_offsetstart.innerText = display_offset_time (offset_start, timeformat, user_lang, false, false)
        el_modshift_offsetend.innerText = display_offset_time (offset_end, timeformat, user_lang, false, false)
        el_modshift_breakduration.innerText = display_offset_time (break_duration, timeformat, user_lang, false, true)
        el_modshift_timeduration.innerText = display_offset_time (time_duration, timeformat, user_lang, false, true)

    }  // ModShiftUpdateInputboxes

//========= MSO_CreateShiftname  ============= PR2019-12-24
    function MSO_CreateShiftname(offset_start, offset_end, cur_shift_code) {
        //console.log( "=== ModShiftCreateShiftname ");
        // shiftname will be replaced by calculated shiftname if:
         // 1) cur_shift_code is empty 2) starts with '-' 3) starts with '<' or 4) first 2 characters are digits

        //console.log( "=== cur_shift_code ", cur_shift_code, typeof cur_shift_code);

        const code_trimmed = (!!cur_shift_code) ? cur_shift_code.trim() : "";
        let may_override = false;
        let new_shift_code = null;
        if (!code_trimmed){
            may_override = true;
        } else if (code_trimmed[0] === "-"){
            may_override = true
        } else if (code_trimmed[0] === "<"){
            may_override = true
        } else {
            const code_sliced = code_trimmed.slice(0, 2);
            may_override = (!Number.isNaN(code_sliced));
        }
        if (may_override){
           //display_offset_time (offset, timeformat, user_lang, skip_prefix_suffix, blank_when_zero)
            new_shift_code = display_offset_time (offset_start, loc.timeformat, loc.user_lang, true, false) + ' - ' +
                             display_offset_time (offset_end, loc.timeformat, loc.user_lang, true, false)
        }
        return new_shift_code
    }  // MSO_CreateShiftname

//========= MSO_FillSchemeshifts  ============= PR2019-12-14
    function MSO_FillSchemeshiftsXXX() {
        //console.log( "=== MSO_FillSchemeshifts ");
        const caption_one = loc.Select_order + ":";

        const current_item = null;
        const tblName = "order";
        let data_map = order_map;
        let tblBody = document.getElementById("id_modshift_tblbody_order")
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
                const order_code = get_subdict_value_by_key(item_dict, "code", "value", "")
                const customer_code = get_subdict_value_by_key(item_dict, "customer", "code", "")
                const display_code = customer_code + " - " + order_code;

// ---  insert tblBody row
                let tblRow = tblBody.insertRow(-1);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);
                tblRow.setAttribute("data-display", display_code);

// ---  add hover to tblBody row
                tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});

// ---  add EventListener to row
                tblRow.addEventListener("click", function() {MSO_SelectOrderRowClicked(tblRow)}, false )

// ---  add first td to tblRow.
                let td = tblRow.insertCell(-1);

// ---  add a element to td., necessary to get same structure as item_table, used for filtering
                let el = document.createElement("div");
                    el.innerText = display_code;
                    el.classList.add("mx-1")
                td.appendChild(el);
            } // for (const [pk_int, item_dict] of data_map.entries())
        }  // if (data_map.size === 0)
    } // MSO_FillSchemeshifts


//=========  MSO_FilterEmployee  ================ PR2019-11-23
    function MSO_FilterEmployee(el_filter) {
        //console.log( "===== MSO_FilterEmployee  ========= ");
        let tblBody =  document.getElementById("id_modshift_select_order_tblBody")
        const filter_str = el_filter.value;
        fFilter_SelectRows(tblBody, filter_str, filter_show_inactive);
    }; // function MSO_FilterEmployee

//=========  MSO_OnceOnly  ================ PR2019-12-06
    function MSO_OnceOnly() {
        console.log( "===== MSO_OnceOnly  ========= ");

        let once_only = document.getElementById("id_modshift_onceonly").checked

        const weekday_index =mod_upload_dict.calendar.weekday_index;
        const selected_weekday_list = (once_only) ? [] : mod_upload_dict.calendar.weekday_list;
        const datefirst_value = (once_only) ? mod_upload_dict.calendar.rosterdate : null;

        console.log( "selected_weekday_list: ", selected_weekday_list);
        console.log( "weekday_index: ", weekday_index);

        let el_datefirst = document.getElementById("id_modshift_datefirst");
        let el_datelast = document.getElementById("id_modshift_datelast");
        el_datefirst.value = datefirst_value
        el_datefirst.readOnly = once_only;
        el_datelast.value = datefirst_value
        el_datelast.readOnly = once_only;
        if (once_only){
            el_modshift_publicholiday.checked = false;
            el_modshift_companyholiday.checked = false;
        }
        el_modshift_publicholiday.disabled = once_only;
        el_modshift_companyholiday.disabled = once_only;

        // reset weekdays, disable
        MSO_BtnWeekdaySchemeitemsFormat(once_only);

    }; // function MSO_OnceOnly

//=========  MSO_SchemeDateChanged  ================ PR2020-01-03
    function MSO_SchemeDateChanged(fldName) {
        console.log( "===== MSO_SchemeDateChanged  ========= ");
        //console.log( "===== MSO_SchemeDateChanged  ========= ");
        if (fldName === "datefirst") {
            mod_upload_dict.scheme.datefirst = {value: el_modshift_datefirst.value, update: true}
        } else if (fldName === "datelast") {
            mod_upload_dict.scheme.datelast = {value: el_modshift_datelast.value, update: true}
        }

    }; // function MSO_SchemeDateChanged

//=========  MSO_PublicholidayChanged  ================ PR2020-01-03
    function MSO_PublicholidayChanged(fldName) {
        //console.log( "===== MSO_PublicholidayChanged  ========= ");
        if (fldName === "excludepublicholiday") {
            mod_upload_dict.scheme.excludepublicholiday = {value: el_modshift_publicholiday.checked, update: true}
        } else if (fldName === "excludecompanyholiday") {
            mod_upload_dict.scheme.excludecompanyholiday = {value: el_modshift_companyholiday.checked, update: true}
        }
    }; // function MSO_PublicholidayChanged

//=========  MSO_BtnWeekdaySchemeitemsFormat  ================ PR2019-12-06
    function MSO_BtnWeekdaySchemeitemsFormat(is_disable_btns) {
        //console.log( "===== MSO_BtnWeekdaySchemeitemsFormat  ========= ");

        // this function resets weekdays
        // on 'onceonly' only weekday_index  has value: select this weekday_index, disable rest
        // existing shifts have weekday_list with schemitems of selected weekdays,
        // listindex is weekday index, first one is not in use
        // weekday_list: (8) [[], [], [[1057, null, 5677], [1058, 176, 455], ...], ... , []]
        // each weekday has list of schemeitem_arr
        // schemeitem_arr = [schemeitem_pk, team_pk, shift_pk]

        const weekday_index = get_subdict_value_by_key(mod_upload_dict, "calendar", "weekday_index")
        const selected_weekday_list = get_subdict_value_by_key(mod_upload_dict, "calendar", "weekday_list")
        //console.log( "mod_upload_dict: ", mod_upload_dict);
        //console.log( "selected_weekday_list: ", selected_weekday_list);

        btns = document.getElementById("id_modshift_weekdays").children;
        for (let i = 0, btn, btn_index, len = btns.length; i < len; i++) {
            btn = btns[i];

            let schemeitem_pk = 0;
            let has_schemeitem = false;
            const btn_weekday_index = get_attr_from_el_int(btn, "data-weekday");
            const is_selected_weekday = (btn_weekday_index === weekday_index);
            const weekday_arr = selected_weekday_list[btn_weekday_index];
            // TODO weekday
            if (!!weekday_arr){
                for (let j = 0, len = weekday_arr.length; j < len; j++) {
                    has_schemeitem = (!!weekday_arr[j]);
                    if (weekday_arr[j] === mod_upload_dict.schemeitem.pk ){
                        schemeitem_pk = weekday_arr[j];
                    }
                }
            }
            // existing schemeitem: can be selected > delete > unselected
            let data_value = "none";
            if (has_schemeitem){
                data_value = (is_selected_weekday) ? "selected" :"not_selected"
            } else if(is_selected_weekday){
                data_value = "create"
            }
            MSO_BtnWeekdaySetClass(btn, data_value);

            btn.disabled = is_disable_btns;
        }
    }; // MSO_BtnWeekdaySchemeitemsFormat

//=========  MSO_BtnWeekdayTeammemberFormat  ================ PR2019-12-06
    function MSO_BtnWeekdayTeammemberFormatXX() {
        console.log( "===== MSO_BtnWeekdayTeammemberFormat  ========= ");

        // this function resets weekdays of teammembers
        // existing shifts have weekday_list with schemitems of selected weekdays,
        // listindex is weekday index, first one is not in use
        // weekday_list: (8) [[], [], [1057, 1058, 1059], ... , []]
        // weekdays without schemeitem have white background
        const weekday_index = get_subdict_value_by_key(mod_upload_dict, "calendar", "weekday_index")
        const selected_weekday_list = get_subdict_value_by_key(mod_upload_dict, "calendar", "weekday_list")
        //console.log( "mod_upload_dict: ", mod_upload_dict);
        console.log( "selected_weekday_list: ", selected_weekday_list);
        // TODO weekday
        btns = document.getElementById("id_modshift_weekdays").children;
        for (let i = 0, btn, btn_index, len = btns.length; i < len; i++) {
            btn = btns[i];

            let schemeitem_pk = 0;
            let has_schemeitem = false, team_pk = null;
            let initial = "";
            const btn_weekday_index = get_attr_from_el_int(btn, "data-weekday");
            const is_selected_weekday = (btn_weekday_index === weekday_index);

            const arr = selected_weekday_list[btn_weekday_index];
            console.log(">>>>>>>>>> arr", arr)
            // TODO weekday
            if (!!arr){
                for (let j = 0, len = arr.length; j < len; j++) {
                    // arr =[1574, null,  544] is [schemitem_pk, team_pk, shift_pk]
                    has_schemeitem = (!!arr[j]);
            console.log(">>>>>>>>>> has_schemeitem", has_schemeitem)
                    team_pk = arr[j][1];
            console.log(">>>>>>>>>> team_pk", team_pk, typeof team_pk)
                    if (!!team_pk){
                        const team_dict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk)
                        if(!!team_dict){
                            const team_code = get_subdict_value_by_key(team_dict, "code", "value")
                            initial = get_teamcode_initial(team_code)
                        }
                    }
                console.log(">>>>>>>>>> initial", initial)

                }
            }  //  if (!!arr){
            console.log(">>>>>>>>>> initial", initial)


            if(has_schemeitem){
                // existing schemeitem: can be selected > delete > unselected
                if (is_selected_weekday){
                    cls_background = "tsa_bc_darkgrey";
                    data_value === "selected"
                } else{
                    data_value === "not_selected"
                    cls_background = "tsa_tr_selected";
                }
            } else if(is_selected_weekday){
                data_value === "create"
            }
            MSO_BtnWeekdaySetClass(btn, data_value);

            btn.disabled = is_disable_btns;
        }
    }; // MSO_BtnWeekdayTeammemberFormat

//========= MSO_BtnWeekdayClicked  ============= PR2019-11-23
    function MSO_BtnWeekdayClicked(btn) {
        //console.log( "=== MSO_BtnWeekdayClicked ");

        const btn_weekday = get_attr_from_el_int(btn, "data-weekday")
        const selected_weekday_list = get_subdict_value_by_key(mod_upload_dict, "calendar", "weekday_list")
        const schemeitem_arr =  selected_weekday_list[btn_weekday]
        //console.log( "btn_weekday", btn_weekday);
        //console.log( "schemeitem_arr", schemeitem_arr);
// TODO weekday
        let list_length = 0;
        if (!!selected_weekday_list[btn_weekday]){list_length = selected_weekday_list[btn_weekday].length}

        const current_data_value = get_attr_from_el(btn, "data-selected");
        //console.log( "current_data_value", current_data_value);
        let new_data_value;
        if (current_data_value === "selected"){
            new_data_value = "delete"
        } else if (current_data_value === "delete" || current_data_value === "create"){
            new_data_value = (!!list_length) ? "not_selected" : "none"
        } else { // if (current_data_value === "not_selected"){
            new_data_value = (!!list_length) ? "selected" : "create"
        }
        //console.log( "new_data_value", new_data_value);
        MSO_BtnWeekdaySetClass(btn, new_data_value);


    } // MSO_BtnWeekdayClicked

//=========  MSO_BtnShiftTeamClicked  ================ PR2020-01-05
    function MSO_BtnWeekdaySetClass(btn, data_value) {
        // functiuon stores data_value in btn and sets backgroundcolor
        btn.setAttribute("data-selected", data_value);

        btn.classList.remove("tsa_bc_white")
        btn.classList.remove("tsa_tr_selected") // Note: tsa_tr_selected is used for not_selected
        btn.classList.remove("tsa_bc_darkgrey");
        btn.classList.remove("tsa_bc_mediumred");
        btn.classList.remove("tsa_bc_medium_green");
        btn.classList.remove("tsa_color_white");

        if (data_value === "selected"){
            btn.classList.add("tsa_bc_darkgrey");
            btn.classList.add("tsa_color_white");
        } else if (data_value === "not_selected"){
            btn.classList.add("tsa_tr_selected");
        } else if (data_value === "create"){
            btn.classList.add("tsa_bc_medium_green")
        } else if (data_value === "delete"){
            btn.classList.add("tsa_bc_mediumred")
        } else {
            btn.classList.add("tsa_bc_white")
        };
    }

//=========  MSO_BtnShiftTeamClicked  ================ PR2019-12-06
    function MSO_BtnShiftTeamClicked(mod) {
        //console.log( "===== MSO_BtnShiftTeamClicked  ========= ");

// ---  select btn_singleshift / btn_schemeshift
        // mod_= mod_shift or mod_team
        mod_upload_dict["mode"] = mod

// ---  highlight selected button
        set_element_class("id_modshift_btn_shift", (mod === "mod_shift"), cls_btn_selected)
        set_element_class("id_modshift_btn_employees", (mod === "mod_team"), cls_btn_selected)

// ---  show only the elements that are used in this mod
        MSO_ShowElements(mod)

    }; // function MSO_BtnShiftTeamClicked

//=========  MSO_SelectShiftChanged  ================ PR2019-12-24
    function MSO_SelectShiftChanged(el_input) {
        MSO_SelectShiftPkChanged(el_input.value);
    }
//=========  MSO_SelectShiftPkChanged  ================ PR2019-12-24
    function MSO_SelectShiftPkChanged(pk_str) {
        console.log( "===== MSO_SelectShiftPkChanged  ========= ");
        console.log( "===== selected pk_str: ", pk_str);
        // also new shifts can be selected , with pk 'new3', only when pk = 0 a new shift must be created
        if(pk_str !== "0"){
            // when existing shift is selected: update mod_upload_dict.shift (is selected shift) and input boxes
            // get selected shift from shift_list in mod_upload_dict, NOT from shift_map (list contains changed values)
            // store values in mod_upload_dict.shift
            // update input boxes
            // was: const shift_dict = get_mapdict_from_datamap_by_tblName_pk(shift_map, "shift", pk_str)
            const shift_dict = MSO_lookup_dict_in_list(mod_upload_dict.shift_list, pk_str);

        console.log( "===== shift_dict: ", shift_dict);
            if (!isEmpty(shift_dict)){
// ---  get shift info from shift_map
                const shift_pk = get_subdict_value_by_key(shift_dict, "id", "pk");
                const shift_ppk = get_subdict_value_by_key(shift_dict, "id", "ppk");
                const shift_code = get_subdict_value_by_key(shift_dict, "code", "value");
                const offset_start = get_subdict_value_by_key(shift_dict, "offsetstart", "value");
                const offset_end = get_subdict_value_by_key(shift_dict, "offsetend", "value");
                const break_duration = get_subdict_value_by_key(shift_dict, "breakduration", "value");
                const time_duration = get_subdict_value_by_key(shift_dict, "timeduration", "value");

        console.log( "===== shift_code: ", shift_code);
        console.log( "===== shift_pk: ", shift_pk);
        console.log( "===== shift_ppk: ", shift_ppk);

                MSO_FillShiftValues(mod_upload_dict.shift, shift_pk, shift_ppk, shift_code, offset_start, offset_end, break_duration, time_duration)

// ---  create shift name
        // shiftname will be replaced by calculated shiftname if cur_shift_code is empty, starts with '-' or first 2 characters are digits
                //const cur_shift_code = el_modshift_shiftcode.value;
                //const new_shift_code = MSO_CreateShiftname(mod_upload_dict.shift.offsetstart, mod_upload_dict.shift.offsetend, cur_shift_code);
                //if(!!new_shift_code){el_modshift_shiftcode.value = new_shift_code};
        //console.log( "===== new_shift_code: ", new_shift_code);
             }
        } else {

// ---  create new shift
        // ---  get selected scheme_pk from mod_upload_dict
                const selected_scheme_pk = get_subdict_value_by_key(mod_upload_dict.scheme, "id", "pk")
                const selected_scheme_ppk = get_subdict_value_by_key(mod_upload_dict.scheme, "id", "ppk")
                const selected_scheme_code = get_subdict_value_by_key(mod_upload_dict.scheme, "code", "value")

        // ---  create new map_id
                // get new temp_pk
                id_new = id_new + 1
                const pk_str = "new" + id_new.toString()
                const new_map_id = get_map_id("shift", pk_str);

        // ---  create new_shift_dict
                const new_shift_code = "<" +  loc.New_shift.toLowerCase() + ">";
                let new_shift_dict = {
                        id: {pk: pk_str, ppk: selected_scheme_pk, create: true},
                        code: {value: new_shift_code, update: true},
                        offsetstart: {value: null},
                        offsetend: {value: null},
                        breakduration: {value: 0},
                        timeduration: {value: 0}};
        // put values in mod_upload_dict.shift and add to mod_upload_dict.shift_list
                mod_upload_dict.shift = new_shift_dict
                mod_upload_dict.shift_list.push(new_shift_dict)

        // ---  reset input boxes
                //MSO_FillTableTeammember()
        }
        console.log("mod_upload_dict")
        console.log(mod_upload_dict)
// ---  display offset
        ModShiftUpdateInputboxes()

        //console.log( "mod_upload_dict.value: ", mod_upload_dict);
    }; // function MSO_SelectShiftPkChanged

//=========  MSO_lookup_dict_in_list  ================ PR2019-12-24
    function MSO_lookup_dict_in_list(lookup_list, lookup_pk) {
        console.log( "===== MSO_lookup_dict_in_list  ========= ");
        let lookup_dict = {};
        if(!!lookup_pk && !! lookup_list){}
            for (let i = 0, len = lookup_list.length; i < len; i++) {
                const dict = lookup_list[i];
                const row_pk = get_subdict_value_by_key(dict,"id", "pk");
                if(row_pk.toString() === lookup_pk.toString()){
                    lookup_dict = dict;
                    break;
            }
        }
        return lookup_dict
    }; // function MSO_lookup_dict_in_list

//=========  MSO_SelectTeamChanged  ================ PR2019-12-24
    function MSO_SelectTeamChanged() {
        console.log( "===== MSO_SelectTeamChanged  ========= ");

        let el_input = document.getElementById("id_modshift_selectteam")
        const pk_str = el_input.value;
        console.log( "pk_str: ", pk_str, typeof pk_str);
        // also new shifts can be selected , with pk 'new3', only when pk = 0 a new shift must be created
        let team_code = "";
        const teammap_dict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", pk_str)
        console.log( "teammap_dict:::::::::", teammap_dict);

        if (!isEmpty(teammap_dict)){
            console.log( "teammap found!! ");
            const team_pk = get_subdict_value_by_key(teammap_dict, "id", "pk");
            const team_ppk = get_subdict_value_by_key(teammap_dict, "id", "ppk");
            team_code = get_subdict_value_by_key(teammap_dict, "code", "value");

            mod_upload_dict.team.id.pk = team_pk;
            mod_upload_dict.team.id.ppk = team_ppk;
            mod_upload_dict.team.code.value = team_code;
        } else {

// ---  create new team
    // ---  get selected scheme_pk from mod_upload_dict
            const selected_scheme_pk = (!!mod_upload_dict.scheme.pk) ? mod_upload_dict.scheme.pk : null
    // ---  create new pk_str
            id_new = id_new + 1
            const pk_str = "new" + id_new.toString()

    // ---  create new_team_dict, put values in mod_upload_dict.team
            team_code = get_teamcode_with_sequence(team_map, selected_scheme_pk, loc)
            mod_upload_dict.team = {
                    id: {pk: pk_str, ppk: selected_scheme_pk, table: "team", create: true},
                    code: {value: team_code, update: true}};
    // add new team to team_list
            mod_upload_dict.team_list.push(mod_upload_dict.team)
    // add new teammember to team
            MSO_AddTeammember();
        }
        el_modshift_teamcode.value = team_code;
        console.log( "<<<<<<<<<<<<< mod_upload_dict: ", mod_upload_dict);

        MSO_FillTableTeammember();

    }; // function MSO_SelectTeamChanged

//=========  MSO_ShiftcodeOrTeamcodeChanged  ================ PR2020-01-03
    function MSO_ShiftcodeOrTeamcodeChanged(el_input) {
        console.log( "===== MSO_ShiftcodeOrTeamcodeChanged  ========= ");

        const field = get_attr_from_el_str(el_input, "data-field")
        const new_code = el_input.value;

        console.log( "new_code: ", new_code);
        console.log( "field: ", field);
        // get pk of current item from mod_upload_dict[field]
        const pk_int = get_subsubdict_value_by_key(mod_upload_dict, field, "id", "pk");
        const ppk_int = get_subsubdict_value_by_key(mod_upload_dict, field, "id", "ppk");
        // lookup shift or team in list in mod_upload_dict
        const lookup_list = mod_upload_dict[field + "_list"];
        const dict = MSO_lookup_dict_in_list(lookup_list, pk_int);
        if(!isEmpty(dict)){
            dict["code"]["value"] = new_code
            dict["code"]["update"] = true
            dict["update"] = true
        }
        // also update shift/team in mod_upload_dict
        mod_upload_dict[field]["code"]["value"] = new_code
        mod_upload_dict[field]["code"]["update"] = true
        mod_upload_dict[field]["update"] = true
        // update select list

// ---  fill shift options, set select shift in selectbox
        let el_select = document.getElementById("id_modshift_selectshift");
        let new_option_txt =  "&lt;" +  loc.New_shift.toLowerCase() + "&gt;"
        const option_text = FillOptionShiftOrTeamFromList(lookup_list, ppk_int, pk_int, true, new_option_txt);
        console.log( "option_text: ",  option_text);
        el_select.innerHTML = FillOptionShiftOrTeamFromList(lookup_list, ppk_int, pk_int, true, new_option_txt);

        console.log( "mod_upload_dict: ",  mod_upload_dict);
    }; // function MSO_ShiftcodeOrTeamcodeChanged

//=========  MSO_TeammemberDateChanged  ================ PR2020-01-04
    function MSO_TeammemberDateChanged(el_input) {
        console.log( "===== MSO_TeammemberDateChanged  ========= ");
        console.log( "el_input: ", el_input);

        const tblRow = get_tablerow_selected(el_input);
        const sel_teammember_pk_str = get_attr_from_el(tblRow, "data-pk");
        const sel_date_field = get_attr_from_el_str(el_input, "data-field")
        const new_date = el_input.value;

// --- lookup teammember_dict in mod_upload_dict.teammember_list
        let sel_teammember_dict = {};
        for (let i = 0; i < mod_upload_dict.teammember_list.length; i++) {
            let sel_teammember_dict = mod_upload_dict.teammember_list[i];
            if(!isEmpty(sel_teammember_dict)){
                const pk_int = get_subdict_value_by_key(sel_teammember_dict, "id", "pk")
                if(!!pk_int && pk_int.toString() === sel_teammember_pk_str) {
                    console.log("==============---sel_teammember_dict", sel_teammember_dict );
                    if (!(sel_date_field in sel_teammember_dict)){ sel_teammember_dict[sel_date_field] = {} }
                    sel_teammember_dict[sel_date_field]["value"] = new_date;
                    sel_teammember_dict[sel_date_field]["update"] = true;
                    sel_teammember_dict["update"] = true;
                    break;
                }  // if((!!pk_int && pk_int === sel_teammember_pk)
            }  // if(!isEmpty(dict))
        }; //   for (let i = 0; i < mod_upload_dict.teammember_list.length; i++) {

        console.log( "mod_upload_dict: ", mod_upload_dict);
    }; // function MSO_TeammemberDateChanged

//=========  MSO_BtnSaveDeleteEnable  ================ PR2019-11-23
    function MSO_BtnSaveDeleteEnable(){
        //console.log( "MSO_BtnSaveDeleteEnable");
// --- enable save button. Order and Teammember must have value
        const order_pk = get_subdict_value_by_key(mod_upload_dict.order, "id", "pk")
        const scheme_pk = get_subdict_value_by_key(mod_upload_dict.scheme, "id", "pk")
        const teammember_pk = get_subdict_value_by_key(mod_upload_dict.teammember, "id", "pk")
        //console.log( "order_pk: ", order_pk), " scheme_pk: ", scheme_pk, " teammember_pk: ", teammember_pk);

        const is_enabled = (!!order_pk)
        const del_enabled = (is_enabled && !!teammember_pk);

        el_modshift_btn_save.disabled = !is_enabled;
        el_modshift_btn_delete.disabled = (!scheme_pk);

// --- hide select_order when order_pk has value
    }  // MSO_BtnSaveDeleteEnable

//=========  MSO_BtnSaveEnable  ================ PR2019-11-23
    function MSO_ShowElements(mod){
        //console.log( "===  MSO_BtnSaveEnable  =====");
// ---  show only the elements that are used in this mod
        let list = document.getElementsByClassName("mod_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains(mod)
            show_hide_element(el, is_show)
        }
// ---  show select order only when selected order has no value
    }

//=========  MSO_FillShiftTeamTeammemberSchemitemList  ================ PR2019-12-31
    function MSO_FillShiftTeamTeammemberSchemitemList(scheme_pk){
        //console.log(" --- MSO_FillShiftTeamTeammemberSchemitemList --- ")
// fill team_list with map_dicts of teams of this scheme
    // deepcopy the shifts, teams, teammembers and schemeitems of the selected scheme from the maps into the mod_upload lists.
    // the maps stay unchanged, so when updates are canceled the rginal values are still there.
    // the listst are empty when clciked on an empty calendar cell.

// fill teammember_list with map_dicts of teamemmebers of this scheme

// --- loop through shift_map
        if(!!shift_map.size){
            for (const [map_id, dict] of shift_map.entries()) {
                //console.log(" --- shift dict --- ", dict)
                // show only rows of selected_scheme_pk
                const row_scheme_pk = get_subdict_value_by_key(dict, "id", "ppk");
                if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                    let dict_clone = {id: {pk: dict.id.pk, ppk: dict.id.ppk, table: "shift"}};
                    const dict_keys = ["code", "scheme", "isrestshift", "offsetstart", "offsetend", "breakduration", "timeduration"];
                    const keys = ["value", "pk", "ppk", "code", "minoffset", "maxoffset"];
                    MSO_FillFieldDicts(dict_keys, keys, dict, dict_clone);
                    mod_upload_dict.shift_list.push(dict_clone);
        }}};
// fill team_list with map_dicts of teams of this scheme
        if(!!team_map.size){
            for (const [map_id, dict] of team_map.entries()) {
                const row_scheme_pk = get_subdict_value_by_key(dict, "id", "ppk");
                if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                    let dict_clone = {id: {pk: dict.id.pk, ppk: dict.id.ppk, table: "team"},
                        code: {value: "?"},
                        scheme: {pk: dict.scheme.pk, ppk: dict.scheme.ppk, code: dict.scheme.code}
                        };
                    const dict_keys = ["code", "scheme"];
                    const keys = ["value", "pk", "ppk", "code"];
                    MSO_FillFieldDicts(dict_keys, keys, dict, dict_clone);
                    mod_upload_dict.team_list.push(dict_clone);
        }}};

// fill teammember_list with map_dicts of teamemmebers of this scheme
// --- loop through teammember_map
        if(!!teammember_map.size){
            for (const [map_id, dict] of teammember_map.entries()) {
                // show only rows of selected_scheme_pk
                const row_scheme_pk = get_subdict_value_by_key(dict, "team", "ppk");
                if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                    let dict_clone = {id: {pk: dict.id.pk, ppk: dict.id.ppk, table: "teammember"}};
                    let dict_keys = ["scheme", "team", "employee", "replacement", "datefirst", "datelast"];
                    const keys = ["value", "pk", "ppk", "code", "mindate", "maxdate"];
                    MSO_FillFieldDicts(dict_keys, keys, dict, dict_clone);
                    mod_upload_dict.teammember_list.push(dict_clone);
        }}};

// --- loop through schemeitem_map
        if(!!schemeitem_map.size){
            for (const [map_id, dict] of schemeitem_map.entries()) {
                const row_scheme_pk = get_subdict_value_by_key(dict, "id", "ppk");
                if(!!row_scheme_pk && row_scheme_pk === scheme_pk){
                    let dict_clone = {id: {pk: dict.id.pk, ppk: dict.id.ppk, table: "schemeitem"},
                        scheme: {pk: dict.scheme.pk, ppk: dict.scheme.ppk, code: dict.scheme.code}
                        };
                    const dict_keys = ["shift", "team"];
                    const keys = ["value", "pk", "ppk", "code", "offsetstart", "offsetend", "breakduration", "timeduration"];
                    MSO_FillFieldDicts(dict_keys, keys, dict, dict_clone);
                    mod_upload_dict.team_list.push(dict_clone);
        }}};

        //console.log("mod_upload_dict ", mod_upload_dict)

    }  // MSO_FillShiftTeamTeammemberSchemitemList

//=========  MSO_FillFieldDicts  ================ PR2019-12-31
    function MSO_FillFieldDicts(dict_keys, keys, map_dict, dict_clone){
        // this function adds key-value pair "breakduration: {value: 0, minoffset: 0, maxoffset: 0}" to dict_clone
        // where 'breakduration' is in list of dict_keys and 'value' is in list of keys
        dict_keys.forEach(function(dict_key) {
            if(dict_key in map_dict){
                let field_dict = map_dict[dict_key];
                if(!isEmpty(field_dict)){
                    keys.forEach(function(key) {
                        if(key in field_dict){
                            if (!(dict_key in dict_clone)){
                                dict_clone[dict_key] = {}
                            };
                            dict_clone[dict_key][key] = field_dict[key]
                        };
                    });
                }
        }});

    }  // MSO_FillFieldDicts

//=========  MSO_FillShiftValues  ================ PR2019-12-27
    function MSO_FillShiftValues(shift_dict, shift_pk, shift_ppk, shift_code, offset_start, offset_end, break_duration, time_duration,
                       shiftcode_update, offsetstart_update, offsetend_update, breakduration_update, timeduration_update){
        // calculate min max of timefields, store in mod_upload_dict
        // (offset_start != null) is added to change undefined into null, 0 stays 0 (0.00 u is dfferent from null)

        //console.log( " ===  MSO_FillShiftValues  ===");

        if (!shift_dict){shift_dict = {}};

        if (!shift_dict.id){shift_dict.id = {table: "shift"}};
        shift_dict.id["pk"] = (!!shift_pk) ? shift_pk : null;
        shift_dict.id["ppk"] = (!!shift_ppk) ? shift_ppk : null;
        // add 'create' when pk = 'new3'
        if(isNaN(Number(shift_pk))){shift_dict.id["create"] = true};

        //when changing offset you cn skip shift_code, parameter shift_code = null
        if(shift_code != null){
            if (!shift_dict.code){shift_dict.code = {}};
            shift_dict.code["value"] = (!!shift_code) ? shift_code : null;
            if(!!shiftcode_update){shift_dict.code.update = true};
        }

        if (!shift_dict.offsetstart){shift_dict.offsetstart = {}};
        shift_dict.offsetstart.value = (offset_start != null) ? offset_start : null;
        shift_dict.offsetstart.minoffset = -720;
        shift_dict.offsetstart.maxoffset = (!!offset_end && offset_end <= 1440) ? offset_end - break_duration : 1440;
        if(!!offsetstart_update){shift_dict.offsetstart.update = true};

        if (!shift_dict.offsetend){shift_dict.offsetend = {}};
        shift_dict.offsetend.value = (offset_end != null) ? offset_end : null;
        shift_dict.offsetend.minoffset = (!!offset_start && offset_start >= 0) ? offset_start + break_duration : 0;
        shift_dict.offsetend.maxoffset = 2160;
        if(!!offsetend_update){shift_dict.offsetend.update = true};

        if (!shift_dict.breakduration){shift_dict.breakduration = {}};
        shift_dict.breakduration.value = (break_duration != null) ? break_duration : null;
        shift_dict.breakduration.minoffset = 0;
        shift_dict.breakduration.maxoffset = (!!offset_start && !!offset_end && offset_end - offset_start <= 1440) ?
                                      offset_end - offset_start : 1440;
        if(!!breakduration_update){shift_dict.breakduration.update = true};

        if (!shift_dict.timeduration){shift_dict.timeduration = {}};
        shift_dict.timeduration.value = (time_duration != null) ? time_duration : null;
        shift_dict.timeduration.minoffset = 0;
        shift_dict.timeduration.maxoffset = 1440;
        if(!!timeduration_update){shift_dict.timeduration.update = true};

        if (shiftcode_update || offsetstart_update || offsetend_update || breakduration_update || timeduration_update) {
            shift_dict["update"] = true;
        }
        console.log( " ===  shift_dict  ===");
        console.log( shift_dict);
    }  // MSO_FillShiftValues

//========= MSO_FillTableTeammember  ====================================
    function MSO_FillTableTeammember(){
        console.log( "===== MSO_FillTableTeammember  ========= ");

// --- reset tblBody
        // id_tbody_teammember is on modeordershift.html
        let tblBody = document.getElementById("id_tbody_teammember");
        tblBody.innerText = null;

// --- loop through mod_upload_dict.teammember_list
        let selected_team_pk = get_subsubdict_value_by_key(mod_upload_dict, "team", "id", "pk");
        //console.log( "selected_team_pk: ", selected_team_pk);

        const len = mod_upload_dict.teammember_list.length;
        if(!!len){
            for (let i = 0; i < len; i++) {
                let teammember_dict = mod_upload_dict.teammember_list[i];
                if(!isEmpty(teammember_dict)){
                    // show only rows of selected_team_pk, show none if null
                    // also skip rows when 'delete' in id
                    const row_team_pk = get_subdict_value_by_key(teammember_dict, "id", "ppk")
                    const row_is_delete = get_subdict_value_by_key(teammember_dict, "id", "delete", false)
                    if((!!row_team_pk && row_team_pk === selected_team_pk) && !row_is_delete) {
                        let tblRow = MSO_CreateTblTeammemberRow(tblBody, teammember_dict);
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
                el_div.classList.add("td_width_" + fieldsettings_teammember.width[j])
    // --- add text_align
                el_div.classList.add("text_align_" + fieldsettings_teammember.align[j])
            th.appendChild(el_div)
        }  // for (let j = 0; j < column_count; j++)
    };  //function MSO_CreateTblTeammemberHeader

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
    };  //function MSO_CreateTblTeammemberFooter

//=========  MSO_CreateTblTeammemberRow  ================ PR2019-09-04
    function MSO_CreateTblTeammemberRow(tblBody, teammember_dict){
        //console.log("--- MSO_CreateTblTeammemberRow  --------------");

        const tblName = "teammember";
        const id_dict = get_dict_value_by_key(teammember_dict, "id");
        const pk_int = get_subdict_value_by_key(teammember_dict, "id", "pk");
        const ppk_int = get_subdict_value_by_key(teammember_dict, "id", "ppk");

// --- insert tblRow ino tblBody or tFoot
        let tblRow = tblBody.insertRow(-1);

        const map_id = get_map_id(tblName, pk_int)
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
            if (j === 4) {
                CreateBtnDelete(el, loc, imgsrc_delete, imgsrc_deletered)
            } else {

// --- add type and input_text to el.
                el.classList.add("input_text");
// --- add EventListener to td

                if ([0, 3].indexOf( j ) > -1){
                    el.setAttribute("type", "text")
                    el.addEventListener("click", function() {
                        ModEmployeeOpen(el, ModEmployeeChanged)
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
            el.classList.add("td_width_" + fieldsettings_teammember.width[j])
// --- add text_align
            el.classList.add("text_align_" + fieldsettings_teammember.align[j])
// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
// --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);
        }
        return tblRow

    };// MSO_CreateTblTeammemberRow

//=========  CreateBtnDelete  ================ PR2019-10-23
    function CreateBtnDelete(el){
        //console.log("--- CreateBtnDelete  --------------");
        el.setAttribute("href", "#");
        el.setAttribute("title", loc.Delete_teammember);
        el.addEventListener("click", function() {MSO_BtnDeleteClicked(el)}, false )

//- add hover delete img
        el.addEventListener("mouseenter", function() {el.children[0].setAttribute("src", imgsrc_deletered)});
        el.addEventListener("mouseleave", function() {el.children[0].setAttribute("src", imgsrc_delete)});

        el.classList.add("ml-4")

        AppendChildIcon(el, imgsrc_delete)
    }  // CreateBtnDelete

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

// --- show error message of row
            if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    el_input.classList.add("border_bg_invalid");
                    const msg_offset = [-240, 100];
                    ShowMsgError(el_input, el_msg, msg_err, msg_offset);
                }

// --- new created record
            } else if (is_created){

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
                const is_inactive = get_subdict_value_by_key (update_dict, "inactive", "value", false);
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
                //format_date_element (el_input, el_msg, field_dict, loc.months_abbrev, loc.weekdays_abbrev,
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
        console.log( " ==== MSO_AddTeammember ====");
        console.log( "mod_upload_dict: ", mod_upload_dict);

// ---  get selected team_pk from mod_upload_dict
        const team_dict = get_dict_value_by_key(mod_upload_dict, "team");
        if(!isEmpty(team_dict)) {
            //console.log( "team_dict: ", team_dict);
            const selected_team_pk = get_subdict_value_by_key(team_dict, "id", "pk");
            const selected_team_ppk = get_subdict_value_by_key(team_dict, "id", "ppk");
            const selected_team_code = get_subdict_value_by_key(team_dict, "code", "value");
            console.log( "selected_team_pk: ", selected_team_pk);
            console.log( "selected_team_ppk: ", selected_team_ppk);
            console.log( "selected_team_code: ", selected_team_code);

    // ---  create new pk_str
            id_new = id_new + 1
            const pk_str = "new" + id_new.toString()

    // ---  create new_teammember_dict
            let new_teammember_dict = {
                    id: {pk: pk_str, ppk: selected_team_pk, table: "teammember", create: true},
                    team: {pk: selected_team_pk, ppk: selected_team_ppk, code: selected_team_code},
                    update: true
                    };
            //console.log( "new_teammember_dict: ", new_teammember_dict);
            mod_upload_dict.teammember_list.push(new_teammember_dict)
            //console.log("mod_upload_dict.")
            //console.log(mod_upload_dict)

            MSO_FillTableTeammember()
        }  //   if(!isEmpty(team_dict)) {

    }  // MSO_AddTeammember

//========= MSO_BtnDeleteClicked  ============= PR2019-09-23
    function MSO_BtnDeleteClicked(el_input) {
        console.log( " ==== MSO_BtnDeleteClicked ====");
        //console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const sel_teammember_pk = get_attr_from_el(tblRow, "data-pk");
            //console.log("sel_teammember_pk: ", sel_teammember_pk);

    // --- lookup teammember_dict in mod_upload_dict.teammember_list
            let index = -1, dict = {};
            for (let i = 0; i < mod_upload_dict.teammember_list.length; i++) {
                dict = mod_upload_dict.teammember_list[i];
                if(!!dict){
                    const pk_int = get_subdict_value_by_key(dict, "id", "pk");
                    if (!!pk_int){
                        //console.log("pk_int: ", pk_int, typeof pk_int);
                        //console.log("sel_teammember_pk ", sel_teammember_pk, typeof sel_teammember_pk);
                        //console.log("(!!(pk_int.toString() === sel_teammember_pk)) ", (pk_int.toString() === sel_teammember_pk));
                        if (pk_int.toString() === sel_teammember_pk) {
                            index = i;
                            break;
                        }
                    }
                }
            };
            //console.log("index: ", index);
            if (index >= 0) {
            // if sel_teammember_pk = NaN, the row is an added row. Just remove it from the .teammember_list

                if(Number.isNaN(sel_teammember_pk)){
                    mod_upload_dict.teammember_list.splice(index, 1);
                } else {
            // if sel_teammember_pk is numeric, the row is a saved row. Put 'delete in id_dict for deletion
                    dict["id"]["delete"] = true;
                    //console.log("dict): ", dict);
                }
            }
            //console.log("mod_upload_dict.teammember_list: ");
            //console.log(mod_upload_dict.teammember_list);

            MSO_FillTableTeammember();

        }  // if(!!tblRow)
    }  // MSO_BtnDeleteClicked

//############################################################################
// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++ PR2019-12-29
//=========  ModEmployeeOpen  ================ PR2019-11-06
    function ModEmployeeOpen(el_input, ModEmployeeChanged) {
        console.log(" -----  ModEmployeeOpen   ----")

        mod_employee_dict = {};

// get teammember pk etc from tr_selected, store in mod_employee_dict
        let tblRow = get_tablerow_selected(el_input);
        const row_id_str = get_attr_from_el_str(tblRow, "id")
        const data_table = get_attr_from_el(tblRow, "data-table")
        const teammember_pk = get_attr_from_el(tblRow, "data-pk");
        const teammember_ppk = get_attr_from_el(tblRow, "data-ppk");

// get field info from el_input (employee or replacemenet)
        const data_field = get_attr_from_el(el_input, "data-field")
        const employee_pk = get_attr_from_el_int(el_input, "data-pk");
        const employee_ppk = get_attr_from_el_int(el_input, "data-ppk");

        console.log("employee_map: ", employee_map)
        console.log("employee_pk: ", employee_pk)
        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
        const employee_code = get_subdict_value_by_key(employee_dict, "code", "value");

        mod_employee_dict = {row_id: row_id_str, data_table: data_table,
                            sel_teammember: {pk: teammember_pk, ppk: teammember_ppk},
                            sel_employee: {field: data_field, pk: employee_pk, ppk: employee_ppk, code: employee_code}};

        console.log("mod_employee_dict: ", mod_employee_dict)
// ---  put employee name in header
        let el_header = document.getElementById("id_mod_employee_header")
        let el_div_remove = document.getElementById("id_mod_employee_div_remove")
        if (!!employee_code){
            el_header.innerText = employee_code
            el_div_remove.classList.remove(cls_hide)
        } else {
// ---  or header "select employee'
            el_header.innerText = loc.Select_employee + ":";
            el_div_remove.classList.add(cls_hide)
        }

// remove values from el_mod_employee_input
        let el_mod_employee_input = document.getElementById("id_mod_employee_input_employee")
        el_mod_employee_input.value = null
        const employee_pk_int = Number(employee_pk);
        ModEmployeeFillSelectTableEmployee(employee_pk_int);

        console.log("employee_pk_int: ", employee_pk_int)
// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

        console.log("mod_employee_dict")
        console.log(mod_employee_dict)
        // data_table: "teammember"
        //    sel_teammember: {pk: NaN, ppk: 1893},
        //sel_employee: {field: "employee", pk: NaN, ppk: NaN, code: null}

// ---  show modal
        $("#id_mod_employee").modal({backdrop: true});

    };  // ModEmployeeOpen

//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        console.log( "===== ModEmployeeSelect ========= ");
        // called by ModEmployeeFillSelectTableEmployee in this js

        if(!!tblRow) {

// get employee_dict from employee_map
            const selected_employee_pk = get_attr_from_el_int(tblRow, "data-pk")
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk);
            if (!isEmpty(map_dict)){
// get code_value from employee_dict, put it in mod_employee_dict and el_input_employee
                const selected_employee_ppk = get_subdict_value_by_key(map_dict, "id", "ppk")
                const selected_employee_code = get_subdict_value_by_key(map_dict, "code", "value")

                mod_employee_dict["sel_employee"]["update"] = true;
                mod_employee_dict["sel_employee"]["pk"] = selected_employee_pk;
                mod_employee_dict["sel_employee"]["ppk"] = selected_employee_ppk;
                mod_employee_dict["sel_employee"]["code"] = selected_employee_code;

        console.log( "selected_employee_code", selected_employee_code);
        console.log( "mod_employee_dict.sel_employee", mod_employee_dict.sel_employee);

// put code_value in el_input_employee
                document.getElementById("id_mod_employee_input_employee").value = selected_employee_code
// save selected employee
                ModEmployeeSave("update")
            }
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//========= ModEmployeeChanged  ============= PR2019-12-29
    function ModEmployeeChanged(tp_dict) {
        console.log("XXXXXXXXXXXXXXXXX === ModEmployeeChanged ===" );
        console.log("tp_dict", tp_dict);

        const mode = get_dict_value_by_key(tp_dict, "mod")
        console.log("mode", mode);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};
        console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            // if mode = 'shifts', dont upload changes but put them in modal shifts
            if (mode ==="modshift") {
        // return value from ModTimepicker. Don't upload but put new value in ModShift
                MSO_TimepickerResponse(tp_dict);
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

//=========  ModEmployeeFilterEmployee  ================ PR2019-11-06
    function ModEmployeeFilterEmployee(option, event_key) {
        console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let el_input = document.getElementById("id_mod_employee_input_employee")
        console.log( el_input );
        // saving when only 1 employee found goes in 2 steps:
        // first step is adding "data-quicksave") === "true" to el_input
        // second step: if then ENTER is clicked the employee will be saved

        if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
            ModEmployeeSave("update")
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
        let tblbody = document.getElementById("id_mod_employee_tblbody");
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
                const selected_employee_ppk = get_subdict_value_by_key(map_dict, "id", "ppk")
                const selected_employee_code = get_subdict_value_by_key(map_dict, "code", "value")
                mod_employee_dict["sel_employee"]["update"] = true;
                mod_employee_dict["sel_employee"]["pk"] = selected_employee_pk;
                mod_employee_dict["sel_employee"]["ppk"] = selected_employee_ppk;
                mod_employee_dict["sel_employee"]["code"] = selected_employee_code;
// put code_value in el_input_employee
                el_input.value = selected_employee_code
// data-quicksave = true enables saving by clicking 'Enter'
                el_input.setAttribute("data-quicksave", "true")
// save selected employee .. not here, but at beginning of this function when data-quicksave = true
                //ModEmployeeSave("update")
            }
        }
    }; // function ModEmployeeFilterEmployee

//=========  ModEmployeeSave  ================ PR2019-12-30
    function ModEmployeeSave(mode) {
        console.log("========= ModEmployeeSave ===" );
        //console.log("mod_employee_dict: ", mod_employee_dict );
        //console.log("mode: ", mode ); // 'update' 'create' 'remove'

        // mod_employee_dict: {data_table: "teammember"
        // sel_teammember: {pk: 818, ppk: 1893}
        // sel_employee: {field: "employee", pk: 2568, ppk: 3, code: "Agata, Milaniek", update: true}

        let sel_employee_dict = get_dict_value_by_key(mod_employee_dict, "sel_employee")
        const sel_employee_field = get_dict_value_by_key(sel_employee_dict, "field")
        const sel_teammember_pk = get_subdict_value_by_key(mod_employee_dict, "sel_teammember", "pk")

        //console.log("sel_employee_dict", sel_employee_dict );
        //console.log("sel_employee_field", sel_employee_field );
        //console.log("sel_teammember_pk", sel_teammember_pk );

        if ("update" in sel_employee_dict || mode === "delete") {
        //console.log("update or delete");
            // put key 'update' or 'delete' in dict
            // wwhen mode delete: replace 'update by 'delete' in employee_dict
            if (mode === "delete"){
                sel_employee_dict = {pk: null, ppk: null, update: true}
            }

// --- lookup teammember_dict in mod_upload_dict.teammember_list
            let sel_teammember_dict = {};
            for (let i = 0; i < mod_upload_dict.teammember_list.length; i++) {
                let dict = mod_upload_dict.teammember_list[i];
                //console.log("dict", dict );
                if(!isEmpty(dict)){
                    const pk_int = get_subdict_value_by_key(dict, "id", "pk")
                //console.log("pk_int", pk_int , typeof pk_int );
                //console.log("sel_teammember_pk", sel_teammember_pk, typeof sel_teammember_pk );

                    if(!!pk_int && pk_int.toString() === sel_teammember_pk.toString()) {
                        sel_teammember_dict = dict;
                        //console.log("---dict", dict );
                        sel_teammember_dict[sel_employee_field] = sel_employee_dict;
                        sel_teammember_dict["update"] = true;

                        //console.log("--------sel_teammember_dict", sel_teammember_dict );
                        mod_upload_dict.teammember_list[i] = sel_teammember_dict;

                        break;
                    }  // if((!!pk_int && pk_int === sel_teammember_pk)
                }  // if(!isEmpty(dict))
            }; //   for (let i = 0; i < mod_upload_dict.teammember_list.length; i++) {

        }  // if ("update" in sel_employee_dict) {

        console.log("mod_upload_dict.teammember_list: ");
        console.log(mod_upload_dict.teammember_list);

        MSO_FillTableTeammember();


        //UploadChanges(upload_dict, url_teammember_upload);

// ---  hide modal
    $("#id_mod_employee").modal("hide");
    } // ModEmployeeSave

//=========  ModEmployeeDeleteOpen  ================ PR2019-09-15
    function ModXXXEmployeeDeleteOpen(tr_clicked, mode) {
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

//========= ModEmployeeFillSelectTableEmployee  ============= PR2019-08-18
    function ModEmployeeFillSelectTableEmployee(selected_employee_pk) {
        //console.log( "=== ModEmployeeFillSelectTableEmployee ");
        // called by ModEmployeeOpen in this modemployee.js

        const caption_one = loc.Select_employee + ":";
        const caption_none = loc.No_employees;

        let tblBody = document.getElementById("id_mod_employee_tblbody");
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
                const is_inactive = get_subdict_value_by_key(item_dict, "inactive", "value", false)

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
    } // ModEmployeeFillSelectTableEmployee

//>>>>>>>>>>> MOD PERIOD >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//=========  ModPeriodOpen  ================ PR2019-10-28
    function ModPeriodOpen() {
        console.log(" -----  ModPeriodOpen   ----")
        // when clicked on delete btn in form tehre is no tr_selected, use selected_customer_pk
        // https://stackoverflow.com/questions/7972446/is-there-a-not-in-operator-in-javascript-for-checking-object-properties/12573605#12573605

        console.log("selected_planning_period:", selected_planning_period)
        const period_tag = get_dict_value_by_key(selected_planning_period, "period_tag")
        if(!period_tag) { period_tag = "tweek" }
        const rosterdatefirst_iso = get_dict_value_by_key(selected_planning_period, "rosterdatefirst")
        const rosterdatelast_iso = get_dict_value_by_key(selected_planning_period, "rosterdatelast")

        console.log("period_tag:", period_tag)
        console.log("rosterdatefirst_iso:", rosterdatefirst_iso)
        console.log("rosterdatelast_iso:", rosterdatelast_iso)

        mod_upload_dict = selected_planning_period;

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
        document.getElementById("id_mod_period_datefirst").value = rosterdatefirst_iso;
        document.getElementById("id_mod_period_datelast").value = rosterdatelast_iso;
        let el_mod_period_tblbody = document.getElementById("id_modperiod_selectperiod_tblbody");

    // fill options of modperiod_selectcustomer
        let el_select = document.getElementById("id_modperiod_selectcustomer")
        let selectall_text =  "&lt;" +  loc.All_customers + "&gt;"
        let select_text_none =  "&lt;" +  loc.No_customers + "&gt;"
        let is_template_mode = false, has_selectall = true, hide_none = false;
        FillSelectOption2020(el_select, customer_map, "customer", is_template_mode, has_selectall, hide_none,
                    null, selected_customer_pk, selectall_text, select_text_none)

    // fill options of modperiod_selectorder
        el_select = document.getElementById("id_modperiod_selectorder")
        selectall_text =  "&lt;" +  loc.All_orders + "&gt;"
        select_text_none =  "&lt;" +  loc.No_orders + "&gt;"
        hide_none = (!selected_customer_pk);
        FillSelectOption2020(el_select, order_map, "order", is_template_mode, has_selectall, hide_none,
                    selected_customer_pk, selected_order_pk, selectall_text, select_text_none)

    // set min max of input fields
        ModPeriodDateChanged("datefirst");
        ModPeriodDateChanged("datelast");

        document.getElementById("id_mod_period_datefirst").disabled = !is_custom_period
        document.getElementById("id_mod_period_datelast").disabled = !is_custom_period

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

        let el_select_order = document.getElementById("id_modperiod_selectorder")
        el_select_order.innerText = null
        const selectall_text =  "&lt;" +  loc.All_orders + "&gt;"
        const select_text_none =  "&lt;" +  loc.No_orders + "&gt;"
        // when 'all customers is selected (selected_customer_pk): there are no orders in selectbox 'orders'
        // to display 'all orders' instead of 'no orders' we make have boolean 'hide_none' = true
        const is_template_mode = false, has_selectall = true, hide_none = (!selected_customer_pk);
        FillSelectOption2020(el_select_order, order_map, "order", is_template_mode, has_selectall, hide_none,
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

        const period_tag = get_dict_value_by_key(mod_upload_dict, "period_tag", "tweek");

        selected_planning_period = {period_tag: period_tag}
        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {selected_planning_period["rosterdatefirst"] = datefirst};
            if (!!datelast) {selected_planning_period["rosterdatelast"] = datelast};
        }
        // send 'now' as array to server, so 'now' of local computer will be used
        selected_planning_period["now"] = get_now_arr_JS();

// ---  upload new setting
        // settings are saved in function customer_planning, function 'period_get_and_save'
        let customer_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_empty_shifts: true
        };
        let employee_planning_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_empty_shifts: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };
        document.getElementById("id_hdr_period").innerText = loc.Period + "..."

        let datalist_request = {planning_period: selected_planning_period,
                                customer_planning: customer_planning_dict,
                                employee_planning: employee_planning_dict,
        };

        console.log( "=== ModPeriodSave DatalistDownload ")
        DatalistDownload(datalist_request);

        $("#id_mod_period").modal("hide");
    }

//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        // console.log("===  CreateTblModSelectPeriod == ");
        // console.log(period_dict);
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
//=========  ModConfirmOpen  ================ PR2019-06-23
    function ModConfirmOpen(mode, el_input) {
        // console.log(" -----  ModConfirmOpen   ----", mode)

        const tblRow = get_tablerow_selected(el_input);

        let tblName, cust_code;
        // tblRow is undefined when el_input = undefined
        if(!!tblRow){
            tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id = get_map_id(tblName, pk_str);
            const data_map = (tblName === "customer") ? customer_map :
                             (tblName === "order") ? order_map : null;
            const map_dict = data_map.get(map_id);

            cust_code = get_subdict_value_by_key(map_dict, "code", "value")
        } else {
            // get info from mod_upload_dict
            tblName = get_subdict_value_by_key(mod_upload_dict, "id", "table")
            cust_code = get_subdict_value_by_key(mod_upload_dict, "code", "value")
        }

        const txt_01 = (tblName === "customer") ? loc.This_customer :
                            (tblName === "order") ? loc.This_order : "";
        const txt_02 = (mode === "delete") ?  loc.will_be_deleted :
                            (mode === "inactive") ? loc.will_be_made_inactive : "";
        const msg_01_txt = txt_01 + " " + txt_02

// put text in modal form
        document.getElementById("id_confirm_header").innerText = cust_code;
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        const btn_txt = (mode === "delete") ? loc.Yes_delete : loc.Yes_make_inactive;
        document.getElementById("id_confirm_btn_save").innerText = btn_txt;

// set focus to cancel button
        setTimeout(function (){
            document.getElementById("id_confirm_btn_cancel").focus();
        }, 500);

// show modal
        $("#id_mod_confirm").modal({backdrop: true});

    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        // console.log(" --- ModConfirmSave --- ");
        // onsole.log("mod_upload_dict: ", mod_upload_dict);
// ---  hide modal
        $("#id_mod_confirm").modal("hide");
// ---  Upload Changes
        const url_str = url_customer_upload
        UploadDeleteChanges(mod_upload_dict, url_str);

    }

//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

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
            f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);

// filter selecttable customer and order
            fFilter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive, false)
            fFilter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        //console.log( "===== HandleFilterName  ========= ");

        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        let tblRow = get_tablerow_selected(el);
        const tblName = get_attr_from_el_str(el, "data-table");
        let tblBody = document.getElementById("id_tbody_" + tblName);

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
                    //console.log( "filter_dict[" + index + "]: ", filter_dict[index]);
                }
            }
        }

        if (!skip_filter) {
    // reset filter tBody_customer
            f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);

            fFilter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive);
        } //  if (!skip_filter) {


    }; // function HandleFilterName

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive(el) {
        //console.log("===== HandleFilterInactive ===== ");
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        // filter is on sidebar, use imgsrc_inactive_lightgrey
        const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter SelectRows
        fFilter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive);
        const has_rows = fFilter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk);
        if(has_rows){
            tblBody_select_order.classList.remove(cls_hide)
        } else {
            tblBody_select_order.classList.add(cls_hide)
        };
// Filter TableRows
    //f_Filter_TableRows(tblBody, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected_ppk)
    // reset filter tBody_customer
            f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, false );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, false);



    }  // function HandleFilterInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_customer_pk = 0;
        selected_order_pk = 0;

        const tblName = (selected_btn === "customer") ? "customer" :
                        (selected_btn === "order") ? "order" : null;
                        (selected_btn === "order") ? "order" : null;
        console.log( "tblName: ", tblName);
        console.log( "selected_customer_pk: ", selected_customer_pk);
        console.log( "selected_order_pk: ", selected_order_pk);

// reset filter tBody_customer
    // reset filter tBody_customer
            f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, false );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, false);

        if (!!tblName){

// reset filter of tblHead
            let tblHead = document.getElementById("id_thead_" + tblName)
            if(!!tblHead){f_reset_tblHead_filter(tblHead)}

//--- reset filter of select table
            f_reset_tblSelect_filter ("id_filter_select_input", "id_filter_select_btn", imgsrc_inactive_lightgrey)

            fFilter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)
            fFilter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

// --- save selected_customer_pk in Usersettings
            const setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
            UploadSettings (setting_dict, url_settings_upload)

//--- reset highlighted
            // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
            if(tblName === "customer"){
                ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
            } else if(tblName === "order"){
                ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
                ChangeBackgroundRows(tblBody_select_order, cls_bc_lightlightgrey);

            }

            UpdateHeaderText();

            // reset customer name and pk in addnew row of tBody_order

            UpdateAddnewRow(tblName)

        }  //  if (!!tblName){

    }  // function ResetFilterRows

// +++++++++++++++++ END FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++
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

        console.log("ws", ws)

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
        let title_value = display_planning_period (selected_planning_period, loc, user_lang); // UpdateHeaderPeriod();
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
        const row_count = tBody_planning.rows.length;
        const last_row = first_row  + row_count;
        for (let i = 0; i < row_count; i++) {
            const row = tBody_planning.rows[i];
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
                {wch:15},
                {wch:15},
                {wch:15},
                {wch:10}
            ];

        return ws;
    }  // FillExcelRows
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); //$(document).ready(function()