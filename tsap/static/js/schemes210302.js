// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        // <PERMIT> PR2020-11-07
        // - only planner has acces to page 'schemes'
        // - planner can add / edit / delete items
        // - when perm_customers and/or perm_orders have value:
        //   - can only view / add / edit / delete absence of employees of allowed customer / orders

        // permits get value when setting_dict is downloaded
        //let permit_view_add_edit_delete_absence = false;
        let allowed_customers = [];  // list of allowed customers of request_user PR2020-11-03
        let allowed_orders = [];  // list of allowed orders of request_user PR2020-11-03
        let has_allowed_customers = false;
        let has_allowed_orders = false;

        const MAX_CYCLE_DAYS = 91;  // PR2021-01-02 changed from 28 to 91, request Guido // MAX_CYCLE_DAYS is defined in several places
        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";
        const cls_visible_hide = "visibility_hide";
        const cls_visible_show = "visibility_show";
        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_bc_yellow_light = "tsa_bc_yellow_light";
        const cls_bc_yellow = "tsa_bc_yellow";
        const cls_selected = "tsa_tr_selected";   // /* light grey; tsa_tr_selected*/
        const cls_error = "tsa_tr_error";   // /* light grey; tsa_tr_selected*/

// ---  id of selected customer and selected order
        const id_sel_prefix = "sel_"
        let rosterdate_dict = {};

        let company_dict = {};
        let employee_map = new Map();
        let order_map = new Map();
        let scheme_map = new Map();
        let shift_map = new Map();
        let schemeitem_map = new Map();
        let team_map = new Map();
        let teammember_map = new Map();
        let abscat_map = new Map();
        let absence_map = new Map();
        let wagefactor_map = new Map();
        let holiday_dict = {};

        let grid_dict = {};
        let grid_teams_dict = {};
        let grid_selected_team = {};

        // settings.customer_pk contains saved pk. Remains when switched to template mode.
        // selected.customer_pk can have value of template_cust, is not stored in settings
        let selected_btn = "btn_grid"

        let selected = {customer_pk: 0, order_pk: 0, scheme_pk: 0,
                        team_pk: 0, shift_pk: 0, employee_pk: 0, teammember_pk: null,
                        template_pk: 0};
        let settings = {customer_pk: 0, order_pk: 0, scheme_pk: 0};
        let is_quicksave = false;

        let loc = {};  // locale_dict
        let period_dict = {};
        let mod_dict = {};  // used to keep track op changes in mod absence and...
        let mod_MGT_dict = {};  // used to keep track op changes in mod_grid_team  -- or table teammember
        let mod_MGS_dict = {};  // used to keep track op changes in mod_shift_team
        let mod_MSCH_dict = {};  // used to keep track op changes in mod_scheme
        let mod_MSE_dict = {};  // used to keep track op changes in mod select e,ployee / replacement
        let mod_MSCO_dict = {};
        let mod_MAB_dict = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let idx = 0; // idx is id of each created (date) element 2019-07-28
        let filter_name = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};
        let is_template_mode = false;
        let is_absence_mode = false;

// ---  variables for print planning PR2020-11-04
        let selected_planning_period = {}
        let employee_planning_customer_dictlist = {}
        let employee_planning_order_dictlist = {}
        let employee_planning_selected_customer = null;  // null = all, -1 = no employee
        let employee_planning_selected_order = null;  // null = all, -1 = no employee
        let employee_planning_selected_employee_pk = null;
        let employee_planning_selected_employee_code = "";
        let planning_short_list_sorted = [];
        let employee_planning_print_ispending = false;

        let html_planning_agg_list = [];
        let html_planning_detail_list = [];

// ---  Select Scheme
        // EventHandler HandleSelect_Row is added in FillSelectTable
        const sidebar_tblBody_scheme = document.getElementById("id_select_tbody_scheme")

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");

        const el_grid_tbody_team = document.getElementById("id_grid_tbody_team");
        const el_grid_tbody_shift = document.getElementById("id_grid_tbody_shift");

        const el_timepicker = document.getElementById("id_timepicker")

        const el_loader = document.getElementById("id_loader");
        const el_msg = document.getElementById("id_msgbox");
        const field_settings = {
            schemeitem: { tbl_col_count: 8,
                        field_caption: ["Date", "Team", "Shift",  "Rest_shift" , "Start_time", "End_time", "", ""],
                        field_names: ["rosterdate", "team", "shift", "isrestshift", "offsetstart", "offsetend", "inactive", "delete"],
                        field_tags: ["div", "div", "div","div", "div", "div", "div", "div"],
                        field_width: ["150", "120", "150", "090", "090", "090", "032", "032"],
                        field_align: ["l", "l", "l", "c", "r", "l", "c", "c"]},
            scheme: { tbl_col_count: 7,
                        field_caption:  ["Scheme", "Rest_shift" , "Start_time", "End_time", "Break", "Hours", ""],
                        field_names: ["code", "isrestshift", "offsetstart", "offsetend", "breakduration", "timeduration", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["180", "090", "120", "120", "120", "120", "032"],
                        field_align: ["l", "c", "r", "l", "r", "r", "c"]},
            shift: { tbl_col_count: 7,
                        field_caption:  ["Shift", "Rest_shift" , "Start_time", "End_time", "Break", "Hours", ""],
                        field_names: ["code", "isrestshift", "offsetstart", "offsetend", "breakduration", "timeduration", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["180", "", "120", "120", "120", "120", "032"],
                        field_align: ["l", "c", "r", "r", "r", "r", "c"]},
            MGTteammember: { tbl_col_count: 6,
                        field_caption: ["Team", "Employee", "Start_date", "End_date", "Replacement_employee", "-"],
                        field_names: ["team", "employee", "datefirst", "datelast", "replacement", "delete"],
                        field_tags:  ["div", "div", "input", "input", "div", "div"],
                        field_width: ["120", "150", "150", "150", "150", "032"],
                        field_align: ["l", "l", "l", "l", "l", "r"]},
            teammember: { tbl_col_count: 6,
                        field_caption: ["Team", "Employee", "Start_date", "End_date", "Replacement_employee", "-"],
                        field_names: ["t_code", "e_code", "tm_df", "tm_dl", "rpl_code", "delete"],
                        field_tags:  ["div", "div", "div", "div", "div", "div"],
                        field_width: ["120", "180", "150", "150", "180", "032"],
                        field_align: ["l", "l", "l", "l", "l", "r"]},
            absence: { tbl_col_count: 10,
                        field_caption: ["", "Employee", "Absence_category", "First_date", "Last_date", "Start_time", "End_time", "Hours_per_day", "Replacement_employee"],
                        field_names: ["select", "e_code", "o_code", "s_df", "s_dl", "sh_os_arr", "sh_oe_arr", "sh_td_arr", "rpl_code", ""],
                        filter_tags: ["", "text", "text", "text", "text", "text", "text", "duration", "text"],
                        field_width:  ["016", "180", "180", "120", "120", "090", "090", "120", "180", "020"],
                        field_align: ["c", "l", "l", "r", "r", "r", "r", "r", "l",  "c"]},
            }
        const mapped_absence_fields = {e_code: "employee", o_code: "abscat", s_df: "datefirst", s_dl: "datelast",
            sh_os_arr: "offsetstart" , sh_oe_arr: "offsetend", sh_bd_arr: "breakduration", sh_td_arr: "timeduration", rpl_code: "replacement"}

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
        const url_scheme_template_upload = get_attr_from_el(el_data, "data-scheme_template_upload_url");

        const url_schemeitem_upload = get_attr_from_el(el_data, "data-schemeitem_upload_url");
        const url_schemeitem_fill = get_attr_from_el(el_data, "data-schemeitem_fill_url");
        const url_schemeitems_download = get_attr_from_el(el_data, "data-schemeitems_download_url");
        const url_scheme_shift_team_upload = get_attr_from_el(el_data, "data-schemeorshiftorteam_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");
        const url_grid_upload = get_attr_from_el(el_data, "data-grid_upload_url");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive_grey = get_attr_from_el(el_data, "data-imgsrc_inactive_grey");
        const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");

        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_chck01 = get_attr_from_el(el_data, "data-imgsrc_chck01");

//  ========== EVENT LISTENERS  ======================

// ---  Sidebar - Select Order
        const el_sidebar_select_order = document.getElementById("id_SBR_select_order");
            el_sidebar_select_order.addEventListener("click", function() {MSCO_Open()}, false );
            add_hover(el_sidebar_select_order);
// --- create EventListener for buttons in btn_container
        const el_btn_container = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = el_btn_container[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }
// ---  create EventListener for buttons above table schemeitems
        const el_btns_grid = document.getElementById("id_btns_grid");
        for (let i = 0, btn; btn = el_btns_grid.children[i]; i++) {
            btn.addEventListener("click", function() {Grid_Goto(btn)}, false )
        }

// ---  create EventListener of elements in scheme box grid page
        const elements = document.getElementById("id_grid_scheme_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = elements[i]; i++) {
            el.addEventListener("click", function() {MSCH_Open(el)}, false);
            add_hover(el);
        }

// ===================== EventListener for MODAL ===================================

// ---  MOD SELECT CUSTOMER / ORDER ------------------------------
        const el_MSCO_tblbody_custorder = document.getElementById("id_MSCO_tbody_select");
        const el_MSCO_input_custorder = document.getElementById("id_MSCO_input_custorder")
            el_MSCO_input_custorder.addEventListener("keyup", function(event){
                setTimeout(function() {MSCO_FilterCustOrder()}, 50)});
        const el_MSCO_btn_save = document.getElementById("id_MSCO_btn_save")
            el_MSCO_btn_save.addEventListener("click", function() {MSCO_Save()}, false )

// ---  MOD GRID TEAM ------------------------------------
        const el_MGT_teamcode = document.getElementById("id_MGT_teamcode");
            el_MGT_teamcode.addEventListener("change", function() {MGT_TeamcodeChanged(el_MGT_teamcode)}, false)
        const el_MGT_modifiedby = document.getElementById("id_MGT_modifiedby");
        const el_MGT_btn_save = document.getElementById("id_MGT_btn_save");
                el_MGT_btn_save.addEventListener("click", function() {MGT_Save("save")}, false )
        const el_MGT_btn_delete = document.getElementById("id_MGT_btn_delete");
                el_MGT_btn_delete.addEventListener("click", function() {MGT_Save("delete")}, false )

// ---  MOD GRID SHIFT ------------------------------------
        const el_MGS_header = document.getElementById("id_MGS_header");
        const el_MGS_shiftcode = document.getElementById("id_MGS_shiftcode");
            el_MGS_shiftcode.addEventListener("change", function() {MGS_ShiftcodeChanged(el_MGS_shiftcode)}, false);
        const el_MGS_offsetstart = document.getElementById("id_MGS_offsetstart");
            el_MGS_offsetstart.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_offsetstart, "grid_shift")}, false);
        const el_MGS_offsetend = document.getElementById("id_MGS_offsetend");
            el_MGS_offsetend.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_offsetend, "grid_shift")}, false);
        const el_MGS_breakduration = document.getElementById("id_MGS_breakduration");
            el_MGS_breakduration.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_breakduration, "grid_shift")}, false);
        const el_MGS_timeduration = document.getElementById("id_MGS_timeduration");
            el_MGS_timeduration.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_timeduration, "grid_shift")}, false);
        const el_MGS_restshift = document.getElementById("id_MGS_isrestshift");
            el_MGS_restshift.addEventListener("change", function() {MGS_RestshiftClicked(el_MGS_restshift)}, false);
        const el_MGS_modifiedby = document.getElementById("id_MGS_modifiedby");
        const el_MGS_btn_save = document.getElementById("id_MGS_btn_save");
                el_MGS_btn_save.addEventListener("click", function() {MGS_Save("save")}, false );
        const el_MGS_btn_delete = document.getElementById("id_MGS_btn_delete");
                el_MGS_btn_delete.addEventListener("click", function() {MGS_Save("delete")}, false );
        const el_allowance_header = document.getElementById("id_allowance_header");
                el_allowance_header.addEventListener("click", function() {MGS_AllowanceShow()}, false );
                add_hover(el_allowance_header);
        const el_allowance_container = document.getElementById("id_allowance_container");

        const el_wfc_header = document.getElementById("id_wfc_header");
                el_wfc_header.addEventListener("click", function() {MGS_WfcShow(el_wfc_header)}, false );
                add_hover(el_wfc_header);
        const el_wfc_container = document.getElementById("id_wfc_container");
        const wfc_input_select_els = el_wfc_container.querySelectorAll(".tsa_input_select")
        for (let i = 0, el; el = wfc_input_select_els[i]; i++) {
            el.addEventListener("change", function() {MGS_WfcInputChange(el)}, false )};
        const el_wfc_checkbox_container = document.getElementById("id_wfc_checkbox_container");
        const el_wfc_onwd_label = document.getElementById("id_wfc_onwd_label");
        const el_wfc_checkbox_diff = document.getElementById("id_wfc_checkbox_diff");
                el_wfc_checkbox_diff.addEventListener("change", function() {MGS_WfcDiffChange(el_wfc_checkbox_diff)}, false );

// ---  MDAL SELECT EMPLOYEE
        const el_modemployee_body = document.getElementById("id_ModSelEmp_select_employee_body");
        document.getElementById("id_MSE_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() {MSE_filter_employee("filter", event.key)}, 50)});
        const el_MSE_btn_save = document.getElementById("id_ModSelEmp_btn_save");
            el_MSE_btn_save.addEventListener("click", function() {MSE_Save("save")}, false )
        const el_MSE_btn_remove = document.getElementById("id_MSE_btn_remove");
            el_MSE_btn_remove.addEventListener("click", function() {MSE_Save("remove")}, false )

// ---  MODAL SCHEME
        // form-control is a bootstrap class, tsa_input_checkbox is a TSA class only used to select input checkboxes
        let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("keyup", function(event) { setTimeout(function() {MSCH_validate_and_disable(el)}, 150)}, false )
        }
        form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("change", function(event) { setTimeout(function() {MSCH_validate_and_disable(el)}, 50)}, false )
        }
        const el_MSCH_modifiedby = document.getElementById("id_MSCH_modifiedby");
        const el_MSCH_btn_delete = document.getElementById("id_MSCH_btn_delete");
            el_MSCH_btn_delete.addEventListener("click", function() {MSCH_Save("delete")}, false )
        const el_MSCH_btn_save = document.getElementById("id_MSCH_btn_save");
            el_MSCH_btn_save.addEventListener("click", function() {MSCH_Save("save")}, false )

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

// ---  Modal Copyfrom Template
        const el_MCFT_input_order = document.getElementById("id_MCFT_input_order")
            el_MCFT_input_order.addEventListener("keyup", function(event){
                    setTimeout(function() {MCFT_InputElementKeyup(el_MCFT_input_order)}, 50)});
        const el_MCFT_input_code = document.getElementById("id_mod_copyfrom_code")
             el_MCFT_input_code.addEventListener("keyup", function() {ModCopyfromTemplateEdit("code")})
        const el_MCFT_btn_save = document.getElementById("id_MCFT_btn_save");
            el_MCFT_btn_save.addEventListener("click", function() {MCFT_Save()});

// ---  Modal Copyto Template
        document.getElementById("id_mod_copyto_code").addEventListener("keyup", function() {ModCopytoTemplateEdit()})
        document.getElementById("id_mod_copyto_btn_save").addEventListener("click", function() {ModalCopytoTemplateSave()})

// ---  save button in ModConfirm
        const el_confirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_confirm_btn_save.addEventListener("click", function() {ModConfirmSave()});

// ---  MOD PERIOD ------------------------------------
        const el_mod_period_datefirst = document.getElementById("id_mod_period_datefirst");
            el_mod_period_datefirst.addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false );
        const el_mod_period_datelast = document.getElementById("id_mod_period_datelast");
            el_mod_period_datelast.addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false );
        const el_mod_period_oneday = document.getElementById("id_mod_period_oneday");
            el_mod_period_oneday.addEventListener("change", function() {ModPeriodDateChanged("oneday")}, false );
        const el_mod_period_btn_save = document.getElementById("id_mod_period_btn_save");
            el_mod_period_btn_save.addEventListener("click", function() {ModPeriodSave()}, false );

// --- close windows
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {

// ---  hide msgbox
            el_msg.classList.remove("show");

// remove highlight from team and schemeites in grid
            const tr_clicked = get_tablerow_selected(event.target);
            let skip_deselect = false
            if(!!tr_clicked && !!tr_clicked.parentNode && tr_clicked.parentNode.id) {
                skip_deselect = (["id_grid_tbody_team", "id_grid_tbody_shift"].indexOf(tr_clicked.parentNode.id) > -1)
            }
            // als slip when clicked on el_confirm_btn_save, to show cls_error when deleting team
            if(event.target === el_confirm_btn_save) {skip_deselect = true}
            if(!skip_deselect){ Grid_SelectTeam("init"); }

        }, false);  // document.addEventListener('click',

// === reset filter when clicked on Escape button === or  on sidebar_showall
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                ResetFilterRows();
            } else if (["Enter", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(event.key) > -1) {
                HandleEventKey(event.key, event.shiftKey )
            }
        });

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_schm"));

//>>>>>>>>>>>>>>> MOD TIMEPICKER >>>>>>>>>>>>>>>>>>> PR2020-04-13
    let el_mtp_container = document.getElementById("id_mtp_container");
    let el_mtp_modal = document.getElementById("id_mtp_modal")
    el_mtp_modal.addEventListener("click", function (e) {
      if (e.target !== el_mtp_modal && e.target !== el_mtp_container) return;
      el_mtp_modal.classList.add("hidden");
    });
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// --- Datalist Download
        // TODO set show_absence = false
        //show_absence = null is for testing, show_absence must be false in production
        //const show_absence_FOR_TESTING_ONLY = null;
        const show_absence_FOR_TESTING_ONLY = false;
        const now_arr = get_now_arr();
        const datalist_request = {
            setting: {page_scheme: {mode: "get"},
                      selected_pk: {mode: "get"}},
            quicksave: {mode: "get"},
            locale: {page: "scheme"},
            company: {value: true},
            planning_period: {get: true, now: now_arr},
            order_rows: {isabsence: show_absence_FOR_TESTING_ONLY, istemplate: false, inactive: false},
            // FOR TESTING order_list: {isabsence: show_absence_FOR_TESTING_ONLY, istemplate: null, inactive: null},
            // page_scheme_list: lists with all schemes, shifts, teams, schemeitems and teammembers of selected order_pk
            page_scheme_list: {mode: "get"},
            abscat_rows: {get: true},
            absence_rows: {get: true},
            wagefactor_rows: {get: true},
            employee_rows: {get: true}
            };
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
       console.log( "=== DatalistDownload ")
       console.log( "datalist_request", datalist_request)

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
                console.log(response)
// ---  hide loader
                el_loader.classList.add(cls_visible_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
// --- create Submenu after downloading locale
                    CreateSubmenu()
                    CreateSelectHeaderRow();
                    CreateSelectAddnewRow();
                }
                if ("planning_period" in response){
                    // this must come after locale_dict PR2020-10-23 debug
                    selected_planning_period = get_dict_value(response, ["planning_period"]);
                    //el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_planning_period);
                }
// --- retrieve setting_dict first. Settings will be used when filling tables
                if ("setting_dict" in response) {
                    UpdateSettings(response["setting_dict"])
                }
                if ("quicksave" in response) {
                    is_quicksave = get_dict_value(response, ["quicksave", "value"], false)
                }
// --- refresh maps and fill tables
                refresh_maps(response);
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                alert(msg + '\n' + xhr.responseText);
            }
        });
}  // DatalistDownload

//=========  refresh_maps  ================ PR2020-01-15
    function refresh_maps(response) {
        //console.log("refresh_maps:");
        //console.log(response);

        if ("company_dict" in response) {company_dict = response.company_dict}

    // 'order' must come before 'customer'
        if ("order_list" in response) {
            b_refresh_datamap(response["order_list"], order_map)
            // check if selected_order exists in order_map
            if(!selected_item_exists_in_map(order_map, "order", selected.order_pk)){
                selected.customer_pk = 0;
                selected.order_pk = 0;
                selected.scheme_pk = 0;
                selected.shift_pk = 0;
                selected.team_pk = 0;
                selected.tblRow_rowIndex = null;  // to be used in HandleEventKey
                }
        }
        if ("wagefactor_rows" in response) {fill_datamap(wagefactor_map, response.wagefactor_rows)};

//------------- employee_planning_list  -----------------------
// ---  for print planning PR2020-11-04

        if ("employee_planning_customer_dictlist" in response) {
            employee_planning_customer_dictlist = response.employee_planning_customer_dictlist
        }
        if ("employee_planning_order_dictlist" in response) {
            employee_planning_order_dictlist = response.employee_planning_order_dictlist
        }
        if ("employee_planning_listNEW" in response) {
           const employee_planning_listNEW = response["employee_planning_listNEW"]

// ---  convert dictionary to array  PR2020-10-26
            // not necessary, is already array
            //const planning_short_arr = Object.values(employee_planning_listNEW);

// ---  sort array with sort and b_comparator_code PR2020-10-26
            planning_short_list_sorted = employee_planning_listNEW.sort(b_comparator_e_code);

            //const planning_agg_list = t_calc_employeeplanning_agg_dict(planning_short_list_sorted, selected_planning_period, employee_map);

            const planning_customer_agg_dict = r_calc_customerplanning_agg_dict(loc, employee_planning_listNEW, company_dict,
                    selected_planning_period, selected.customer_pk, selected.order_pk)

            const planning_employee_agg_dict = r_calc_employeeplanning_agg_dict(loc, employee_planning_listNEW, company_dict,
                    selected_planning_period, null, null)  //PR2020-11-04
           //console.log("planning_employee_agg_dict", planning_employee_agg_dict)

            //t_CreateHTML_planning_agg_list(loc, planning_agg_list, html_planning_agg_list);
            //t_CreateHTML_planning_detail_list(loc, planning_short_list_sorted, html_planning_detail_list);
            if (employee_planning_print_ispending){
                employee_planning_print_ispending = false;
                r_PrintEmployeeOrOrderPlanning(loc, planning_employee_agg_dict, "print", false)
                r_PrintEmployeeOrOrderPlanning(loc, planning_customer_agg_dict, "print", true)   // true = is_order_planning
            }
        }

//-------------  end of employee_planning_list  ---------------------------

// ---  update tables
        UpdateTablesAfterResponse(response);
    }  // refresh_maps

//========= UpdateTablesAfterResponse  =============
    function UpdateTablesAfterResponse(response){
        //console.log("--- UpdateTablesAfterResponse  --------------");
        //SBR_FillSelectTable fills selecttable and makes visible

        // TODO check use of it
        // refresh_tables dict gets value in SchemeTemplateUploadView
        // update_wrap['refresh_tables'] = {'new_scheme_pk': new_scheme_pk}
        //console.log("response[copied_from_template: ", response["copied_from_template"]);

        if ("order_list" in response) {b_refresh_datamap(response["order_list"], order_map)}
        if ("scheme_list" in response) {b_refresh_datamap(response["scheme_list"], scheme_map)}
        // PR2021-01-03 use shift_rows instead of shift_list. Was: if ("shift_list" in response) {b_refresh_datamap(response.shift_list, shift_map)}
        if ("shift_rows" in response) {b_refresh_datamap(response.shift_rows, shift_map, "shift")}
        if ("team_rows" in response) {b_refresh_datamap(response.team_rows, team_map, "team")}
       // if ("team_list" in response) {b_refresh_datamap(response["team_list"], team_map)};
        // if ("teammember_list" in response) {b_refresh_datamap(response["teammember_list"], teammember_map)};
        if ("teammember_rows" in response) {b_refresh_datamap(response["teammember_rows"], teammember_map, "teammember") };
        if ("schemeitem_list" in response) {b_refresh_datamap(response["schemeitem_list"], schemeitem_map)};
        if ("employee_rows" in response) { b_refresh_datamap(response.employee_rows, employee_map, "employee") };
        if ("abscat_rows" in response) { b_refresh_datamap(response.abscat_rows, abscat_map, "abscat") };
        if ("absence_rows" in response) { b_refresh_datamap(response.absence_rows, absence_map, "absence") };

        if ("holiday_dict" in response) { holiday_dict = response["holiday_dict"]}

        if ("scheme_list" in response) {
            // tblNames are: shift, teammember, schemeitem, absence
        }

        if("copied_from_template" in response) {
            let new_scheme_pk = get_dict_value(response, ["copied_from_template", "scheme_pk"])
            let new_order_pk = get_dict_value(response, ["copied_from_template", "order_pk"])
            let new_customer_pk = get_dict_value(response, ["copied_from_template", "customer_pk"])
            if (new_scheme_pk && new_order_pk && new_customer_pk){
                //console.log( "is_template_mode", is_template_mode);
                // get saved scheme_pk from settings. Settings is retrieved from server before UpdateTablesAfterResponse
                settings.scheme_pk =  new_scheme_pk;
                settings.order_pk = new_order_pk;
                settings.customer_pk = new_customer_pk;

                selected.customer_pk = settings.customer_pk;
                selected.order_pk = settings.order_pk;
                selected.scheme_pk =  settings.scheme_pk;

                is_template_mode = false;
                selected_btn = "btn_grid" // btns are: btn_grid, btn_schemeitem, btn_shift, btn_teammember, btn_absence

            }
        }

        // tblNames are 'shift', 'teammember', 'scheme', 'absence', 'schemeitem'. Null for btn_grid
        const tblName = get_tblName_from_selectedBtn(selected_btn);
        // reset header text
        UpdateHeaderText("HandleSubmenubtnTemplateShow");
// --- reset grid
        Grid_Reset();
// reset sidebar_tblBody_scheme
        //>>>>>>>>>sidebar_tblBody_scheme.innerText = null;
        SBR_FillSelectTable("UpdateTablesAfterResponse")

        //FillTableRows(tblName);
        HandleBtnSelect(selected_btn, true)  // true = skip_upload

    };  //  UpdateTablesAfterResponse

//=========  selected_item_exists_in_map  === PR2020-05-01
    function selected_item_exists_in_map(data_map, tblName, selected_pk) {
        //console.log("===  selected_item_exists_in_map == selected_pk:", selected_pk);
        let exists = false;
        if(!!selected_pk && !!data_map.size){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, selected_pk)
            exists = !isEmpty(map_dict)
        }
        return exists;
    }

//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        // CreateSubmenuButton(el_div, id, btn_text, class_key, function_on_click)
        AddSubmenuButton(el_div, loc.Add_scheme, function (){HandleSubmenuBtnAddNew()}, null, "id_menubtn_add_scheme");
        AddSubmenuButton(el_div, loc.Delete_scheme, function (){HandleSubmenuBtnDelete()}, ["mx-2"], "id_menubtn_delete_scheme");
        AddSubmenuButton(el_div, loc.menubtn_copy_to_template, function (){ModCopyTemplateOpen()}, ["mx-2"], "id_menubtn_copy_template");
        AddSubmenuButton(el_div, loc.menubtn_show_templates, function (){HandleSubmenubtnTemplateShow()}, ["mx-2"], "id_menubtn_show_templates");
        AddSubmenuButton(el_div, loc.Download_planning, function() { ModPeriodOpen("preview")}, ["mx-2"], "id_submenu_planning_preview");

        el_submenu.appendChild(el_div);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu

//=========  RefreshSubmenuButtons  ================ PR2020-03-12
    function RefreshSubmenuButtons(is_absence_mode, is_template_mode) {
        let btn_add_scheme = document.getElementById("id_menubtn_add_scheme");
        let btn_delete_scheme = document.getElementById("id_menubtn_delete_scheme");
        let btn_copy_template = document.getElementById("id_menubtn_copy_template");
        let btn_show_templates = document.getElementById("id_menubtn_show_templates");
        let btn_planning_preview = document.getElementById("id_submenu_planning_preview");

        if(btn_add_scheme){btn_add_scheme.innerText = (is_absence_mode) ? loc.Add_absence : (is_template_mode) ? loc.Add_template : loc.Add_scheme};
        if(btn_show_templates){btn_show_templates.innerText = (is_template_mode) ? loc.menubtn_hide_templates :loc.menubtn_show_templates};

        if(btn_copy_template){
            btn_copy_template.innerText = (is_template_mode) ? loc.menubtn_copy_to_order : loc.menubtn_copy_to_template
            if(selected.scheme_pk && !is_absence_mode){
                btn_copy_template.removeAttribute("aria-disabled");
                btn_copy_template.classList.remove("tsa_color_mediumgrey");
            } else {
                btn_copy_template.setAttribute("aria-disabled", true);
                btn_copy_template.classList.add("tsa_color_mediumgrey");
            }
        }

        if(btn_delete_scheme){
            btn_delete_scheme.innerText = (is_absence_mode) ? loc.Delete_absence : (is_template_mode) ? loc.Delete_template :loc.Delete_scheme;

            if(is_absence_mode && selected.teammember_pk || !is_absence_mode && selected.scheme_pk){
                btn_delete_scheme.removeAttribute("aria-disabled");
                btn_delete_scheme.classList.remove("tsa_color_mediumgrey");
            } else {
                btn_delete_scheme.setAttribute("aria-disabled", true);
                btn_delete_scheme.classList.add("tsa_color_mediumgrey");
            }
        }
        if(btn_planning_preview){add_or_remove_class(btn_planning_preview, cls_hide, (is_template_mode || is_absence_mode) ) };

    }

//=========  HandleSubmenubtnTemplateShow  ================ PR2019-09-15 PR2020-05-28
    function HandleSubmenubtnTemplateShow() {
        //console.log("--- HandleSubmenubtnTemplateShow")
        // template order will be retrieved from database in function HandleSelectOrder
        is_template_mode = !is_template_mode
        let sel_customer_pk = null, sel_order_pk = null, sel_scheme_pk = null;

// reset header text
        UpdateHeaderText("HandleSubmenubtnTemplateShow");
// --- reset grid
        Grid_Reset();
// reset sidebar_tblBody_scheme
        sidebar_tblBody_scheme.innerText = null;

// reset selected customer and order
        if(is_template_mode){
            is_absence_mode = false;

            settings.customer_pk = 0;
            settings.order_pk = 0;
            settings.scheme_pk = 0;
            settings.template_pk = 0;

            selected.customer_pk = 0;
            selected.order_pk = 0;
            selected.scheme_pk = 0;
            selected.template_pk = 0;

// lookup template order in order_map
            if(!!order_map.size){
                for (const [map_id, item_dict] of order_map.entries()) {
                    const is_template = get_dict_value(item_dict, [ "id", "istemplate"], false)
                    if (is_template) {
                        sel_order_pk = get_dict_value(item_dict, [ "id", "pk"], 0)
                        sel_customer_pk = get_dict_value(item_dict, [ "id", "ppk"], 0)
                        break;
            }}};
        } else {
            selected.customer_pk = settings.customer_pk;
            selected.order_pk = settings.order_pk;
            selected.scheme_pk =  settings.scheme_pk;
            sel_customer_pk = selected.customer_pk
            sel_order_pk = selected.order_pk
        }

        HandleSelectOrder(sel_customer_pk, sel_order_pk);

// hide sidebar select_order in template mode
        add_or_remove_class(document.getElementById("id_sidebar_div_select_order"),cls_hide, is_template_mode )
        add_or_remove_class(document.getElementById("id_select_template_div"),cls_hide, !is_template_mode )

        RefreshSubmenuButtons();
    }  // HandleSubmenubtnTemplateShow

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25 PR2020-05-24
    function HandleBtnSelect(data_btn, skip_update) {
       //console.log( "==== HandleBtnSelect ========= " );
        // btns are: btn_grid, btn_schemeitem, btn_shift, btn_teammember, btn_absence

// ---   set value of selected_btn
        selected_btn = (data_btn) ? data_btn : "btn_grid";
        // change selected_btn if no permit (btn absence is hidden, this code should not be reached, let it stay)
        // if (!permit_view_add_edit_delete_absence && selected_btn === "btn_absence") {selected_btn = "btn_grid"}
        //console.log( "selected_btn:", selected_btn );

        settings.scheme_pk
// ---  upload new selected_btn, not after loading page (then skip_update = true)
        if(!skip_update){
            const upload_dict = {page_scheme: {sel_btn: selected_btn}};
            UploadSettings(upload_dict, url_settings_upload);
        }
// ---  get tblName, is null when btn = "btn_grid"
        // tblNames are 'shift', 'teammember', 'scheme', 'absence', 'schemeitem'. Null for btn_grid
        const tblName = get_tblName_from_selectedBtn(selected_btn);
// ---  set is_absence_mode
        is_absence_mode = (selected_btn === "btn_absence");
        if (is_absence_mode){is_template_mode = false};
// ---  set btntext 'Add scheme / Delete scheme', enable/disable delete btn
        RefreshSubmenuButtons(is_absence_mode, is_template_mode);
// ---  highlight selected button
        highlight_BtnSelect(document.getElementById("id_btn_container"), selected_btn);
// ---  show / hide tblBody_datatable or el_div_gridlayout
        const show_grid = (selected_btn === "btn_grid");
        let el_div_datatable = document.getElementById("id_div_datatable");
        let el_div_gridlayout = document.getElementById("id_div_gridlayout");
        add_or_remove_class(el_div_datatable,cls_hide, show_grid);
        add_or_remove_class(el_div_gridlayout, cls_hide, !show_grid);
// ---  show only the elements that are used in this tab
        show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn)
// +++  when is_absence_mode
        if (is_absence_mode){
            CreateAbsenceTblHeader();
            FillAbsenceTblRows();
        } else {
// +++  when is normal_mode / template mode
    // ---  fill TableRows, resets when tblName=null (when btn_grid)
            FillTableRows(tblName)
    // --- fill grid with selected.scheme, only when btn_grid, reset otherwise
            let scheme_dict = {};
            if (selected_btn === "btn_grid" && selected.scheme_pk){
                scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected.scheme_pk);
            }
            Grid_FillGrid("btn_grid")
        }  // if (is_absence_mode){
// ---  highlight row in datatable
        //FilterTableRows(tblBody_datatable)
// --- update header text
        UpdateHeaderText("HandleBtnSelect");
    }  // HandleBtnSelect

//=========  HandleSelectOrder  ================ PR2019-03-24 PR2020-05-21
    function HandleSelectOrder(sel_customer_pk, sel_order_pk ) {
        //console.log("=====  HandleSelectOrder =========");
        //console.log("mod_MSCO_dict: ", mod_MSCO_dict)
        //console.log( "sel_customer_pk", sel_customer_pk);
        //console.log( "sel_order_pk", sel_order_pk);
        //called by MSCO_Save, HandleSelectCustomer select_order.Event.Change, MSCH_Validate
        // retrieve the schemes etc of selected order from database
// ---  reset lists
        // reset after retrieving info from server

// --- reset grid and RefreshSubmenuButtons
        Grid_Reset();
        RefreshSubmenuButtons();

// ---  reset selected.order_pk etc.
        // put new value in selected after retrieving info from server

        settings.customer_pk = 0;
        settings.order_pk = 0;
        settings.scheme_pk = 0;
        settings.template_pk = 0;

        selected.customer_pk = 0;
        selected.order_pk = 0;
        selected.scheme_pk = 0;
        selected.team_pk = 0;
        selected.shift_pk = 0;

        el_MCFT_input_order.innerText = null

// ---  update header text
        UpdateHeaderText("HandleSelectOrder")

// reset header text in sidebar and above select buttons
        el_sidebar_select_order.value = loc.Select_customer_and_order;
        document.getElementById("id_hdr_text").innerText = loc.Select_customer_and_order;
        document.getElementById("id_hdr_right_text").innerText = null;

        sidebar_tblBody_scheme.innerText = null;
// reset tables schemeitems, shift and teammember
        tblHead_datatable.innerText = null;
        tblBody_datatable.innerText = null;

// ---  get is_absence_mode TODO
        //let is_absence_mode = false;
// ---  get sel_order_pk
        // TODO handle after first download
        // after first DatalistDownload, when there is only 1 customer, selected.customer_pk gets this value
        //  in that case HandleSelectOrder has no parameter 'el' and selected.order_pk has value

// get pk of selected order from parameters
// if no order selected: check if there is an order_pk in settings
        if (sel_order_pk){
// --- save selected.order_pk in Usersettings, not in template mode
            // PR20202-07-15 debug: must set sel_scheme_pk: 0, otherwise wrong scheme can be shown
            if(!is_template_mode){
                const upload_dict = {selected_pk: {
                    sel_customer_pk: sel_customer_pk,
                    sel_order_pk: sel_order_pk,
                    sel_scheme_pk: 0
                    }
                    };
                UploadSettings (upload_dict, url_settings_upload);
            }
        }
// TODO fix  el_MCFT_input_order
/*
        if (!!el_select_order){
            if (el_select_order.id === "id_select_order") {
                el_MCFT_input_order.selectedIndex = el_select_order.selectedIndex
            } else if (el_select_order.id === "id_mod_scheme_order") {
                el_select_order.selectedIndex = el_select_order.selectedIndex
                el_MCFT_input_order.selectedIndex = el_select_order.selectedIndex
            } else if (el_select_order.id === "id_mod_copyfrom_order") {
                el_select_order.selectedIndex = el_select_order.selectedIndex
            }
        }
        */
        // setting.selected_pk necessary to retrive saved order_pk when order_pk = null
        //const datalist_request = { setting: {selected_pk: {get: true}},
        //                            page_scheme_list: {order_pk: sel_order_pk,
        //                                                 istemplate: is_template_mode,
         //                                                isabsence: is_absence_mode}};
        const datalist_request = { setting: {selected_pk: {sel_customer_pk: sel_customer_pk,
                                                           sel_order_pk: sel_order_pk,
                                                           sel_scheme_pk: 0}},
                                    page_scheme_list: {customer_pk: sel_customer_pk, order_pk: sel_order_pk,
                                                         istemplate: is_template_mode,
                                                         isabsence: is_absence_mode}};
        DatalistDownload(datalist_request);

// select table 'scheme' is filled by SBR_FillSelectTable("scheme"). This function is called in DatalistDownload
        //SBR_FillSelectTable("HandleSelectOrder");
        //UpdateHeaderText("HandleSelectOrder")
    }  // HandleSelectOrder

//=========  HandleSelect_Row ================ PR2019-12-01 PR2020-07-02
    function HandleSelect_Row(sel_tr_clicked, event_target) {
        //console.log( "===== HandleSelect_Row  ========= ");
         // selectRow table = scheme
         // skip when clicked on inactive img
        const is_tag_img = (event_target && event_target.tagName === "IMG");
        let map_dict = {};
        if(sel_tr_clicked && !is_tag_img) {
// ---  get map_dict
            const data_pk = get_attr_from_el(sel_tr_clicked, "data-pk")
            const tblName = get_attr_from_el(sel_tr_clicked, "data-table")
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, tblName, data_pk);
            const is_addnew_row = !Number(data_pk);
            if (!isEmpty(map_dict)){
// ---  update selected.scheme_pk (and selected.order_pk to be on the safe side)
                selected.scheme_pk = get_dict_value(map_dict, ["id", "pk"], 0);
                selected.order_pk = get_dict_value(map_dict, ["id", "ppk"], 0);

// ---  deselect selected.shift_pk and selected.team_pk when selected.scheme_pk changes
                selected.shift_pk = 0;
                selected.team_pk = 0;
// ---  save selected.scheme_pk in Usersettings, not in template mode
                if(!is_template_mode){
                    const upload_dict = {selected_pk: {sel_order_pk: selected.order_pk, sel_scheme_pk: selected.scheme_pk}};
                    UploadSettings (upload_dict, url_settings_upload);
                }
// --- fill data table
                tblHead_datatable.innerText = null;
                tblBody_datatable.innerText = null;
                // btns are: btn_grid, btn_schemeitem, btn_shift, btn_teammember, btn_absence
                const fill_tblName = (selected_btn === "btn_schemeitem") ? "schemeitem" :
                                     (selected_btn === "btn_shift") ? "shift" :
                                     (selected_btn === "btn_teammember") ? "teammember" : null;
                if (fill_tblName){FillTableRows(fill_tblName);}
// reset addnew row, fill options shifts and team
                // needed to update ppk in addnew row PR2020-03-16 was: dont, already called by FillTableRows
// disable/enable menubutton delete scheme
                RefreshSubmenuButtons()
            }  //   if (!isEmpty(map_dict))

// ---  highlight clicked row in select table
        // make all rows of this select_table light yellow
        // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)

            ChangeBackgroundRows(sidebar_tblBody_scheme, cls_bc_lightlightgrey, false, sel_tr_clicked, cls_bc_yellow)


// happens in HandleBtnSelect
    // --- fill grid with new scheme
           // Grid_FillGrid("HandleSelect_Row")
    // --- get header_text
            //UpdateHeaderText("HandleSelect_Row")

// hide or show tables
            //console.log( "tblName", tblName);

            // change selected_btn to 'team' when team is selected, to 'shift' when shift is selected,
            // when scheme is selected and btn_mode = "btn_schemeitem : let it stay,
            // goto btn_grid otherwise

            // btns are: btn_grid, btn_schemeitem, btn_shift, btn_teammember, btn_absence
            const btn_mode = (tblName === "teammember") ? "btn_teammember" :
                             (tblName === "shift") ? "btn_shift" : selected_btn;
                           //  (tblName === "scheme" && selected_btn === "btn_schemeitem") ? "btn_schemeitem" : "btn_grid";
            HandleBtnSelect(btn_mode);

        } // if(!!sel_tr_clicked)

    }  // HandleSelect_Row

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked, skip_highlight_selectrow) {
       //console.log("=== HandleTableRowClicked");
       //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        const tblName = get_attr_from_el(tr_clicked, "data-table");

        DeselectHighlightedTblbody(tblBody_datatable, cls_selected)

        tr_clicked.classList.add(cls_selected)

// ---  get clicked tablerow
        if(tr_clicked) {
            const selected_tblRow_pk = get_datapk_from_element(tr_clicked);
            selected.tblRow_rowIndex = tr_clicked.rowIndex;  // to be used in HandleEventKey
            selected.mapid = tr_clicked.id;
            selected.teammember_pk = get_attr_from_el(tr_clicked, "data-pk");
        } else {
            selected.tblRow_rowIndex = null;
            selected.mapid = null;
            selected.teammember_pk = null;
        }
        RefreshSubmenuButtons();
    }  // HandleTableRowClicked

//========= HandleRestshiftClicked  ============= PR2019-10-01
    function HandleRestshiftClicked(el_changed, tblName) {
        //console.log("======== HandleRestshiftClicked  ========", tblName);

        const tr_changed = get_tablerow_selected(el_changed)
        const pk_str = get_attr_from_el(tr_changed, "data-pk")
        const map_id = get_map_id(tblName, pk_str);
        const itemdict = get_mapdict_from_datamap_by_id(shift_map, map_id);
        //console.log("pk_str", pk_str, "map_id", map_id);
        //console.log("itemdict");
        //console.log(itemdict);

        let is_restshift = get_dict_value(itemdict, ["isrestshift", "value"], false)
        //console.log("is_restshift", is_restshift, typeof is_restshift);

        is_restshift = (!is_restshift)
        el_changed.setAttribute("data-value", is_restshift);
        //console.log("is_restshift", is_restshift);

        // update icon
        const imgsrc = (is_restshift) ? imgsrc_rest : imgsrc_stat00;

        el_changed.children[0].setAttribute("src", imgsrc);

        let id_dict = get_dict_value(itemdict, ["id"])
        let upload_dict = {"id": id_dict, "isrestshift": {"value": is_restshift, "update": true}}

        const url_str = url_scheme_shift_team_upload;
        UploadChanges(upload_dict, url_str, "HandleRestshiftClicked");
    }  // HandleRestshiftClicked

// +++++++++  HandleBtnSchemeitems  ++++++++++++++++++++++++++++++ PR2019-03-16 PR2019-06-14
    function HandleBtnSchemeitems(param_name, skip_confirm) {
        //console.log("=== HandleBtnSchemeitems =========", param_name);

        if (!!selected.scheme_pk){
        // params are: prev, next, dayup, daydown, autofill, delete
            if (param_name === "delete" && !skip_confirm) {
                ModConfirmOpen("schemeitem_delete");
            } else {
                let parameters = {"upload": JSON.stringify ({mode: param_name, scheme_pk: selected.scheme_pk})};
                //console.log("parameters ", parameters);

                // show loader
                el_loader.classList.remove(cls_visible_hide)

                let response = "";
                $.ajax({
                    type: "POST",
                    url: url_schemeitem_fill,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                    console.log( "response");
                    console.log( response);
                        // hide loader
                        el_loader.classList.add(cls_visible_hide)
                        if ("schemeitem_list" in response) {
                            b_refresh_datamap(response["schemeitem_list"], schemeitem_map)
                            FillTableRows("schemeitem")
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        // hide loader
                        el_loader.classList.add(cls_visible_hide)
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }
        }
    } // HandleBtnSchemeitems

//=========  HandleTemplateSelect  ================ PR2019-05-24
    function HandleTemplateSelect(tblRow) {
        //console.log( "===== HandleTemplateSelect ========= ");
        //console.log( tblRow);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected);

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

            // el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");
            //console.log("value: ", value)

    // ---  get pk from id of select_tblRow
            let pk = get_datapk_from_element (tblRow)
            let ppk = get_datappk_from_element (tblRow)

            //console.log("pk: ", pk)
            //console.log("ppk: ", ppk)

            tblBody.setAttribute("data-pk", pk);
            tblBody.setAttribute("data-ppk", ppk);
        }
    }  // HandleTemplateSelect

//=========  HandleCreateSchemeItem  ================ PR2019-03-16
    function HandleCreateSchemeItemXXX() {
        //console.log("=== HandleCreateSchemeItem =========");

// ---  deselect all highlighted rows
       //DeselectHighlightedRows(tblRow, cls_selected);

//-- increase id_new
        id_new = id_new + 1
        const pk_new = "new" + id_new.toString()

        // TODO check if this is correct
        const parent_pk = document.getElementById("id_scheme").value
        //console.log("pk_new", pk_new, "ppk", parent_pk);

// get rosterdate from previous tablerow or today
        let item_dict = {};
        item_dict["id"] = {"pk": pk_new, "ppk": parent_pk};

// get last tblRow
        let rosterdate, timeend, value;

        rosterdate_dict = {};
        let timeend_dict = {};
        const len = tblBody_datatable.rows.length
        if (len > 0) {
            let tblRow = tblBody_datatable.rows[len -1];

            // el_input is first child of td, td is cell of tblRow
            const el_rosterdate = tblRow.cells[1].children[0];
                value = get_attr_from_el(el_rosterdate, "data-value"); // data-value = "2019-05-11"
                if(!!value){rosterdate_dict["value"] = value}
                const wdm = el_rosterdate.value; // value = "wo 1 mei"
                if(!!wdm){ rosterdate_dict["wdm"] = wdm}
                const wdmy = get_attr_from_el(el_rosterdate, "data-wdmy"); // data-wdmy = "wo 1 mei 2019"
                if(!!wdmy){ rosterdate_dict["wdmy"] = wdmy}
                const offset = get_attr_from_el(el_rosterdate, "data-offset"); // data-offset: "-1:di,0:wo,1:do"
                if(!!offset){ rosterdate_dict["offset"] = offset}
                // unknown o_value triggers save action in uploadcahnges
                rosterdate_dict["data_value"] = value
                rosterdate_dict["data_o_value"] = "---"

            const el_time_end = tblRow.cells[5].children[0];
            if(!!el_timeend){
                value = get_attr_from_el(el_timeend, "data-value"); // data-value = "0;5;0"
                if(!!value){ timeend_dict["value"] = value };
                const dhm = el_timeend.value; // value = "wo 1 mei"
                if(!!dhm){ timeend_dict["dhm"] = dhm }
                // unknown o_value triggers save action in uploadcahnges
                timeend_dict["data_o_value"] = "---"
            }
        } else {
            // TODO rosterdate_dict = today_dict
            rosterdate_dict["data_value"] = rosterdate_dict["value"];
            // unknown o_value triggers save action in uploadcahnges
            rosterdate_dict["data_o_value"] = "---"
        };

        item_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "create": true};
        item_dict["rosterdate"] = rosterdate_dict;
        if(!!timeend_dict){item_dict["timestart"] = timeend_dict}

        // this is not an add-new row! (add-new row is in footer)
        let row_index, order_by; // TODO
        const scheme_pk = parent_pk;
        let tblRow = CreateTblRow("schemeitem", false, pk_new, parent_pk, scheme_pk, row_index, order_by)

// Update TableRow
        //console.log("eitem_dict", item_dict);
        UpdateTblRow(tblRow, item_dict, "HandleCreateSchemeItem")
    }  // HandleCreateSchemeItem

//##################################################################################

// +++++++++++++++++ CREATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= CreateSelectRow  ============= PR2019-10-20
    // TODO switch to t_CreateSelectRow
    function CreateSelectRow(tblBody_select, item_dict, row_index) {
        //console.log("CreateSelectRow");
        // creates selectrow in tbody in sidebar
        if(row_index == null){row_index = -1}

        let tblRow;
        if (!isEmpty(item_dict)) {
//--- get info from item_dict
            const tblName = get_dict_value(item_dict, ["id", "table"]);
            const pk_int = get_dict_value(item_dict, ["id", "pk"]);
            const ppk_int =  get_dict_value(item_dict, ["id", "ppk"]);
            const temp_pk_str = get_dict_value(item_dict, ["id", "temp_pk"]);
            const map_id =  get_map_id(tblName, pk_int.toString());
            const is_created = get_dict_value(item_dict, ["id", "created"], false);  // can be null
            const is_deleted = get_dict_value(item_dict, ["id", "deleted"], false);  // can be null
            const msg_err =  get_dict_value(item_dict, ["id", "error"]);

            const code_value = get_dict_value(item_dict, ["code", "value"], "")
            const is_inactive = get_dict_value(item_dict, ["inactive", "value"], false);

//--------- insert tableBody row
            const row_id = id_sel_prefix + map_id
            tblRow = tblBody_select.insertRow(row_index);

            tblRow.setAttribute("id", row_id);
            tblRow.setAttribute("data-map_id", map_id );
             tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-inactive", is_inactive);

            tblRow.classList.add(cls_bc_lightlightgrey);

//--------- add hover to select row
            tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover)});

//--------- add first td to tblRow.
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

            let el_a = document.createElement("a");
                el_a = document.createElement("div");
                el_a.setAttribute("data-field", "code");
                el_a.setAttribute("data-value", code_value);
                td.appendChild(el_a);
            td.classList.add("px-2")

//--------- add addEventListener
            if (["scheme", "shift", "team"].indexOf( tblName ) > -1){
                td.addEventListener("click", function() {HandleSelect_Row(tblRow, "event")}, false)
            }
//--------- add active img to second td in table
            td = tblRow.insertCell(-1);
                el_a = document.createElement("a");
                const delete_inactive = (tblName === "scheme") ? "inactive" : "delete";
                CreateBtnDeleteInactive(delete_inactive, false, tblRow, el_a, is_inactive);
//--------- add hover delete img
                if(delete_inactive === "delete"){
                    td.addEventListener("mouseenter", function() {
                        td.children[0].children[0].setAttribute("src", imgsrc_deletered);
                    });
                    td.addEventListener("mouseleave", function() {
                        td.children[0].children[0].setAttribute("src", imgsrc_delete);
                    });
                }
            td.appendChild(el_a);
            td.classList.add("tw_032");
        }  //  if (!isEmpty(item_dict))
        return tblRow;
    } // CreateSelectRow

//=========  HandleSelectAddnewRow  ================ PR2019-08-08
    function HandleSelectAddnewRow(sel_tblRow) {
        //console.log("========= HandleSelectAddnewRow ===" );
        //console.log(sel_tblRow);

        if (!!sel_tblRow){

// ---  get pk from id of tblRow
            const tblName = get_attr_from_el(sel_tblRow, "data-table");
            const pk_str = sel_tblRow.getAttribute("data-pk");
            const ppk_int = parseInt(sel_tblRow.getAttribute("data-ppk"));

            if (tblName === "shift"){
                selected.shift_pk = 0
                HandleSelect_Row(sel_tblRow)
            } else  if (tblName === "team"){
                selected.team_pk = 0

// ---  create upload_dict
                const upload_dict = {"id":{"temp_pk": pk_str, "ppk": ppk_int, "table": tblName, "create": true}}
                const url_str = url_scheme_shift_team_upload;
                UploadChanges(upload_dict, url_str, "HandleSelectAddnewRow");
                //HandleSelectTable(sel_tblRow)
            }
        }  //  if (!!tblRow)
    }  // HandleSelectAddnewRow

//========= FillOption_Copyfrom_CustomerOrder  ====================================
    function FillOption_Copyfrom_CustomerOrderXXX(tblName, called_by, ppk_str) {
        //console.log( "=== FillOption_Copyfrom_CustomerOrder called by: ", called_by);

// ---  fill options of select box
        let option_text = "", row_count = 0, ppk_int = 0

        // customer list has no ppk_str
        if (!!ppk_str){ppk_int = parseInt(ppk_str)};

        let select_text =  (tblName === "order") ? loc.Select_order : null;
        let select_text_none =  (tblName === "order") ? loc.No_orders : null;

        const data_map = order_map

        const selected_pk = selected.order_pk
// --- loop through data_map

            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_dict_value (item_dict, ["id", "pk"])
                const ppk_in_dict = get_dict_value (item_dict, ["id", "ppk"])
                const is_template = get_dict_value(item_dict, ["id", "istemplate"], false);
                const code_value = get_dict_value(item_dict, ["code", "value"], "-");
                //console.log( "code_value  ", code_value, pk_int, ppk_in_dict, is_template);
        // filter is_template
                if (is_template === is_template_mode) {
                    // skip if ppk_int exists and does not match ppk_in_dict (not in tbl customer)
                    if ((!!ppk_int && ppk_int === ppk_in_dict) ) {
                        option_text += "<option value=\"" + pk_int + "\"";
                        option_text += " data-ppk=\"" + ppk_in_dict + "\"";
                        if (pk_int === selected_pk) {option_text += " selected=true" };
                        option_text +=  ">" + code_value + "</option>";
                        row_count += 1
                    }
                }
            }



        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_none + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        // put option_text in select elements -- only el_MCFT_input_order el_mod_copyfrom_cust
        let el_select = (tblName === "order") ? el_MCFT_input_order  : null;
        if(!!el_select){
            el_select.innerHTML = option_text;
            // if there is only 1 option: select first option
            if (select_first_option){el_select.selectedIndex = 0};
        }
    }  //function FillOption_Copyfrom_CustomerOrder

//========= SBR_FillSelectTable  ============= PR2019-09-23 PR2020-05-22
    function SBR_FillSelectTable(called_by) {
        //console.log( "=== SBR_FillSelectTable === ", called_by);
        // scheme is only select table PR2020-07-02

        const tblName = "scheme";
        const tblBody = sidebar_tblBody_scheme;
        const tblHead = document.getElementById("id_select_thead_scheme");

        const data_map = scheme_map;
        const include_parent_code = false ;
        const has_delete_btn = false
        const selected_pk = (is_template_mode) ? null : selected.scheme_pk;
        const filter_ppk = (is_template_mode) ? null : selected.order_pk;

        const filter_include_inactive = true;
        const filter_include_absence = (show_absence_FOR_TESTING_ONLY !== false);
        const filter_istemplate = is_template_mode;
        const addall_to_list_txt = null;

        const imgsrc_default = imgsrc_inactive_grey;
        const imgsrc_default_header = imgsrc_inactive_lightgrey;
        const imgsrc_default_black = imgsrc_inactive_black;
        const imgsrc_hover = null;

        const header_txt = loc.Schemes + ":";
        const title_header_btn = loc.Cick_show_inactive_schemes;
        const title_row_btn = null;
        let tblRow_selected = null;

// hide sidebar select_order in template mode
        add_or_remove_class(document.getElementById("id_sidebar_div_select_order"),cls_hide, is_template_mode )
        add_or_remove_class(document.getElementById("id_select_template_div"),cls_hide, !is_template_mode )

        t_Fill_SelectTable(tblBody, tblHead, data_map, tblName, selected_pk, include_parent_code,
            HandleSelect_Filter, HandleSelectFilterBtnInactive, HandleSelect_Row, HandleSelectRowButtonInactive, has_delete_btn,
            filter_ppk, filter_show_inactive, filter_include_inactive, filter_include_absence, filter_istemplate, addall_to_list_txt,
            cls_bc_lightlightgrey, cls_bc_yellow, cls_hover,
            imgsrc_default, imgsrc_default_header, imgsrc_default_black, imgsrc_hover,
            header_txt, title_header_btn, title_row_btn);

// --- filter inactive scheme's
        // has_ppk_filter = false, because only schemes of selected order are in the list

       t_Filter_TableRows(sidebar_tblBody_scheme, "scheme", {}, filter_show_inactive);

// --- show select_table scheme when selected.order_pk exists
       add_or_remove_class(document.getElementById("id_select_table_scheme"), cls_hide, !selected.order_pk)

// ++++++ select scheme if only 1 exists or when settings.scheme_pk has value and selectedRow exists ++++++
        // Dont highlight yet, scheme info is not downoloaded yet so teams and shift are not yet filled
        if(tblRow_selected){
            HandleSelect_Row(tblRow_selected, " SBR_FillSelectTable tblRow_selected");
        }
    } // SBR_FillSelectTable

function HandleSelect_Filter(){console.log("HandleSelect_Filter")}


//=========  HandleSelectFilterBtnInactive  ================ PR2019-07-18
    function HandleSelectFilterBtnInactive(el) {
        //console.log(" --- HandleSelectFilterBtnInactive --- ", selected_btn);
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        if(el){
            const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
            // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
            el.children[0].setAttribute("src", img_src);
        }
// Filter TableRows
        // TODO there is no scehem table yet
        // has_ppk_filter = false, because only schemes of selected order are in the list
        //t_Filter_TableRows(sidebar_tblBody_scheme, "scheme", {}, filter_show_inactive);

        t_Filter_SelectRows(sidebar_tblBody_scheme, null, filter_show_inactive);

    }  // HandleSelectFilterBtnInactive


//========= HandleSelectRowButtonInactive  ============= PR2020-05-21 PR2020-10-13
    function HandleSelectRowButtonInactive(el_input) {
       //console.log( " ==== HandleSelectRowButtonInactive ====");
       //console.log( "el_input", el_input);

        mod_dict = {};
        let tblRow = get_tablerow_selected(el_input)
        if(tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el_str(tblRow, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
            let map_dict;
            if (tblName === "scheme") { map_dict = scheme_map.get(map_id)}
            // NIU } else if (tblName === "order") { map_dict = order_map.get(map_id)}
            // NIU} else if (tblName === "roster"){ map_dict = roster_map.get(map_id)};

            // store el_input.id, so el_input can be changed after modconfirm.save
            // Note: event can be called by img element. In that case there is no id. Get id of parent instead
            let el_id = (!!el_input.id) ? el_input.id : el_input.parentNode.id

       //console.log( "map_dict", map_dict);
// ---  create upload_dict with id_dict
            mod_dict = {id: {pk: get_dict_value(map_dict, ["id", "pk"]),
                            ppk: get_dict_value(map_dict, ["id", "ppk"]),
                            table: get_dict_value(map_dict, ["id", "table"]),
                            isabsence: get_dict_value(map_dict, ["id", "isabsence"]),
                            istemplate: get_dict_value(map_dict, ["id", "istemplate"]),
                            el_id: el_id
                            },
                        code: {value: get_dict_value(map_dict, ["code", "value"])}
                        };

       //console.log( "mod_dict", mod_dict);
    // get inactive from map_dict
            const inactive = get_dict_value(map_dict, ["inactive", "value"], false)
    // toggle inactive
            const new_inactive = (!inactive);
            mod_dict.inactive = {value: new_inactive, update: true};
    // ---  show modal, only when made inactive
            if(new_inactive){
                ModConfirmOpen("scheme_inactive", el_input);
            } else {
                // change inactive icon, before uploading, not when new_inactive = true
                format_inactive_element (el_input, {value: new_inactive}, imgsrc_inactive_black, imgsrc_inactive_grey)
                UploadChanges(mod_dict, url_scheme_shift_team_upload);
            }

        }  // if(!!tblRow)
    }  // HandleSelectRowButtonInactive

//========= CreateSelectHeaderRow  ============= PR2019-11-02
    function CreateSelectHeaderRow() {
        //console.log(" === CreateSelectHeaderRow ===")
        const tblName = "scheme";

        const caption = loc.Select_scheme + ":";

    //console.log("caption: " , caption)
    // ++++++ add tHeadRow  ++++++
        let tblHead = document.getElementById("id_select_thead_scheme")
        tblHead.innerText = null
        let tHeadRow = tblHead.insertRow(-1);
            let th = document.createElement('th');
                th.innerText = caption
                th.classList.add("px-2")
        tHeadRow.appendChild(th);
        let td = tHeadRow.insertCell(-1);
            let el_a = document.createElement("a");
            CreateBtnDeleteInactive("inactive", false, tHeadRow, el_a, false);
        td.appendChild(el_a);
        td.classList.add("tw_032")

    }  // CreateSelectHeaderRow

//========= CreateSelectAddnewRow  ============= PR2019-11-01
    function CreateSelectAddnewRow() {
       //console.log(" ===CreateSelectAddnewRow tblName: ")

        const tblName ="scheme";
        let ppk_int = selected.order_pk
        // ppk_int has no value yet, because AddnewRow is added at startup

// ++++++ add addnew row  ++++++
        let tblFoot = document.getElementById("id_select_tfoot_scheme")

    //-- increase id_new
        id_new = id_new + 1
        const pk_new = "new" + id_new.toString()

    //--------- insert tblFoot row
        let tblRow = tblFoot.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "sel_scheme_addnew");
        tblRow.setAttribute("data-pk", pk_new);
        tblRow.setAttribute("data-ppk", ppk_int)
        tblRow.setAttribute("data-table", tblName);
        // --- put data-addnew in tr when is_addnew_row
        tblRow.setAttribute("data-addnew", true);
        tblRow.classList.add(cls_bc_lightlightgrey);
    //- add hover to tblFoot row
        // don't add hover to row 'Add scheme'
        //- add hover to inactive button
        tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover)});
        tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover)});

    // --- add first td to tblRow.
        // index -1 results in that the new cell will be inserted at the last position.
        let td = tblRow.insertCell(-1);
        let el_a = document.createElement("div");

    // --- add EventListener to input element, add innerText
            el_a.innerText = loc.Add_scheme + "..."
            el_a.addEventListener("click", function() {MSCH_Open()}, false )
            el_a.classList.add("tsa_color_darkgrey");
            el_a.classList.add("pointer_show")
        td.appendChild(el_a);
        td.setAttribute("colspan", "2");
        td.classList.add("px-2")

    }  // CreateSelectAddnewRow

//=========  CreateTblHeader  === PR2019-12-01 PR2020-05-22
    function CreateTblHeader(tblName) {
        //console.log("===  CreateTblHeader == =");
        //console.log("tblName: ", tblName);
        //console.log("field_settings: ", field_settings);

        // tblName = "schemeitem", "shift", "teammember"
        tblHead_datatable.innerText = null

//--- get column_count ,skip when tblName = 'formXX'
        const column_count = field_settings[tblName].tbl_col_count;
        if(column_count){
//--- insert tblRow
            let tblRow = tblHead_datatable.insertRow (-1);
//--- insert th's to tblHead_datatable
            for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
                let th = document.createElement("th");
// --- add div to th, margin not working with th
                let el_div = document.createElement("div");
// --- add innerText to el_div
                // loc must go here, because when field_settings is defined loc has no value yet
                const data_text = loc[field_settings[tblName].field_caption[j]];
                if(!!data_text) el_div.innerText = data_text;
// --- add left margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")}
// --- add left margin to offset end (left outlined, to keep '02.00 >' in line with '22.00'
                const fldName = field_settings[tblName].field_names[j];
                if (tblName === "schemeitem" && fldName ===  "offsetend"){el_div.classList.add("ml-4")}
// --- add imgsrc_inactive_black to schemeitem
                if (tblName === "schemeitem" &&  j === column_count - 2) {
                    AppendChildIcon(el_div, imgsrc_inactive_black);
                };
// --- add width, text_align
                el_div.classList.add("tw_" + field_settings[tblName].field_width[j],
                                     "ta_" + field_settings[tblName].field_align[j]);


                th.appendChild(el_div);
                tblRow.appendChild(th);
            }  // for (let j = 0; j < column_count; j++)
// --- add filter header row
            CreateTblHeaderFilter(tblName, column_count)
        }  // iif(column_count)
    };  // CreateTblHeader


//=========  CreateTblHeaderFilter  ================ PR2019-09-15 PR2020-05-22
    function CreateTblHeaderFilter(tblName, column_count) {
       //console.log("=========  CreateTblHeaderFilter =========");
       //console.log("tblName", tblName);

//+++ insert tblRow ino thead_datatable
        let tblRow = tblHead_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        //tblRow.setAttribute("id", "id_thead_filter");
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        for (let j = 0, td, el; j < column_count; j++) {
// insert td ino tblRow
            td = tblRow.insertCell(-1);
// create element with tag from field_tags
            let tag_name = field_settings[tblName].field_tags[j];
            // replace select tag with input tag
            if(tag_name === "select") {tag_name = "input"}
            tag_name = ([7, 8].indexOf( j ) > -1) ? "div" : "input"
            el = document.createElement(tag_name);
// --- add 'type' and 'data-field' Attribute.
            el.setAttribute("type", "text");
            el.setAttribute("data-field", field_settings[tblName].field_names[j]);
// --- skip inactve and delete row
             if ([7, 8].indexOf( j ) > -1){
                //el = document.createElement("a");
                //el.setAttribute("href", "#");
                //AppendChildIcon(el, imgsrc_inactive_black, "18");
                //el.classList.add("ml-2")
            } else {
// --- make text grey, not in calendar
               // if (tblName !== "planning") {el.classList.add("tsa_color_darkgrey")}
                el.classList.add("tsa_color_darkgrey")
                el.classList.add("tsa_transparent")
                //el.classList.add("tw_090")
// --- add other attributes to td
               // el.setAttribute("autocomplete", "off");
                //el.setAttribute("ondragstart", "return false;");
                //el.setAttribute("ondrop", "return false;");
            }  //if (j === 0)
// --- add EventListener to td
            el.addEventListener("keyup", function(event){HandleFilterName(el, j, event)});
            td.appendChild(el);

// --- add width and textalign to el
            el.classList.add("tw_" + field_settings[tblName].field_width[j]);
            el.classList.add("ta_" + field_settings[tblName].field_align[j]);

// --- add element to td
             td.appendChild(el);
        }  // for (let j = 0;
    };  //function CreateTblHeaderFilter
//##################################################################################
// +++++++++++++++++ ABSENCE TABLE ROWS +++++++++++++++++++++++++++++++++++++++

//=========  CreateAbsenceTblHeader  === PR2020-08-12
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
    };  //  CreateAbsenceTblHeader

//========= FillAbsenceTblRows === PR2020-09-10
    function FillAbsenceTblRows() {
       //console.log( "===== FillAbsenceTblRows  ========= ");
// --- reset tblBody
        tblBody_datatable.innerText = null;

        selected.mapid = null;
        selected.tblRow_rowIndex = null;  // to be used in HandleEventKey
// --- loop through absence_map
        // with empty data_map: !!data_map = true, data_map.size = 0
        if(absence_map.size){
            for (const [map_id, map_dict] of absence_map.entries()) {
                const tblRow = CreateAbsenceTblRow(map_id, map_dict.id, map_dict.t_id, map_dict.e_id, -1);
                RefreshTblRowNEW(tblRow, map_dict);
        }};
    }  // FillAbsenceTblRows

//=========  CreateAbsenceTblRow  ================ PR2019-08-29 PR2020-08-10
    function CreateAbsenceTblRow(map_id, pk_str, ppk_str, employee_pk, row_index) {
        //console.log("=========  CreateAbsenceTblRow =========");
        const tblName = "absence";
        const sel_btn = "absence";
        let tblRow = null;
        if(field_settings[sel_btn]){
// --- insert tblRow into tblBody
            tblRow = tblBody_datatable.insertRow(row_index)
            tblRow.id = map_id;
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-pk", pk_str);
            if(employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
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
                    append_background_class(el,"delete_0_1", "delete_0_2")
    // --- add EventListeners
                    el.addEventListener("click", function() {ModConfirmTblrowOpen("delete", "absence", el)}, false )
                } else if (j){
                    // function MAB_Open checks for permit_view_add_edit_delete_absence
                    el.addEventListener("click", function() {MAB_Open(el)}, false);
                    add_hover(el);
                }
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

//##################################################################################

//========= FillTableRows  ====================================
    function FillTableRows(tblName) {
        //console.log( "===== FillTableRows  ========= ", tblName);
        // tblNames are: "shift", "teammember", "scheme", "absence" (=teamemmber", "schemeitem" : null;

// --- reset tblBody
        tblHead_datatable.innerText = null;
        tblBody_datatable.innerText = null;

        selected.mapid = null;
        selected.tblRow_rowIndex = null;  // to be used in HandleEventKey

        if(tblName){
// --- get  item_list
            // TODO absence
            let data_map, sel_pk_int;
            const sel_scheme_pk = selected.scheme_pk;
            const is_absence = (tblName === "absence");
            if (tblName === "shift"){
                data_map = shift_map;
                sel_pk_int = selected.shift_pk
             } else if (tblName === "scheme"){
                data_map = scheme_map;
                sel_pk_int = selected.scheme_pk;
             } else if (tblName === "teammember"){
                data_map = teammember_map;
                sel_pk_int = selected.team_pk;
             } else if (tblName === "absence"){
                data_map = absence_map;
            } else if (tblName === "schemeitem"){
                data_map = schemeitem_map;
            };
            //console.log( "data_map ", data_map);

            rosterdate_dict = {};
            let tblRow, row_count = 0;
            if (sel_scheme_pk || is_absence){
// --- create header row and footer
                CreateTblHeader(tblName);
                //CreateTblFooter(tblName)
// --- loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const pk_int = get_dict_value(item_dict, ["id", "pk"]);
                    const ppk_int = get_dict_value(item_dict, ["id", "ppk"]);
                    const is_template = get_dict_value(item_dict ,["id", "istemplate"], false);
                    const row_scheme_pk = (tblName === "teammember") ?  get_dict_value(item_dict, ["scheme", "pk"]) :
                                                                        get_dict_value(item_dict, ["id", "ppk"]);
// --- get 'order_by'. This contains the number / string that must be used in ordering rows
                    const order_by = get_orderby(tblName, item_dict)
// --- get row_index
                    const row_index = t_get_rowindex_by_orderby(tblBody_datatable, order_by)

// --- add item if row_scheme_pk = selected_ppk_int (list contains items of all parents)
    //         also filter istemplate
                    const add_row = (is_absence) || (row_scheme_pk && row_scheme_pk === sel_scheme_pk && is_template === is_template_mode )
                    if (add_row){
                        tblRow = CreateTblRow(tblName, false, pk_int, ppk_int, row_scheme_pk, row_index, order_by);
                        UpdateTblRow(tblRow, item_dict, "FillTableRows");
// --- get rosterdate to be used in addnew row
                        rosterdate_dict =  get_dict_value(item_dict, ["rosterdate"]);
                        row_count += 1;
// --- highlight selected row
                        if (pk_int === sel_pk_int) {
                            tblRow.classList.add(cls_selected)
                        }
                    }
                }  // for (const [pk_int, item_dict] of data_map.entries())
            }  // if (!!len)

            if (tblName === "schemeitem"){
                if(isEmpty(rosterdate_dict)){
                // TODO rosterdate_dict = today_dict
                }
                //console.log("rosterdate_dict", rosterdate_dict)
                //(tblName, "FillTableRows");
            }
        }  //  if(tblName)
    }  // FillTableRows

//=========  CreateTblRow  ================ PR2019-04-27  PR2020-05-25
    function CreateTblRow(tblName, is_addnew_row, pk_int, ppk_int, scheme_pk, row_index, order_by) {
        //console.log("=========  CreateTblRow");
        //console.log("tblName", tblName, typeof tblName);
        //console.log("is_addnew_row", is_addnew_row);

//+++ insert tblRow into tblBody_datatable
        let tblRow = tblBody_datatable.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.
        const map_id = get_map_id(tblName, pk_int);
        // rows in datatable have id = map_id = 'shift_1656', rows in grid have id 'gridrow_shift_1656'
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_int);
        if(ppk_int){tblRow.setAttribute("data-ppk", ppk_int)};
        if(is_addnew_row){tblRow.setAttribute("data-is_addnew", is_addnew_row)};
        if(tblName === "teammember"){tblRow.setAttribute("data-scheme_pk", scheme_pk)};

        tblRow.setAttribute("data-table", tblName);
        if(order_by){tblRow.setAttribute("data-orderby", order_by)};
        tblRow.setAttribute("data-istable", true); // store if this row is in a table or a mod_grid

// --- add EventListener to tblRow (add EventListener to element will be done further).
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false )

//+++ insert td's into tblRow
        const settings_tblName =  tblName;
        const column_count = field_settings[settings_tblName].tbl_col_count;
        for (let j = 0; j < column_count; j++) {
            let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
            const field_tag = field_settings[settings_tblName].field_tags[j];
            let el = document.createElement(field_tag);
// --- add data-field Attribute
            const fldName = field_settings[settings_tblName].field_names[j];
            el.setAttribute("data-field", fldName);
// --- add field_width and text_align
            el.classList.add("tw_" + field_settings[settings_tblName].field_width[j],
                             "ta_" + field_settings[settings_tblName].field_align[j]);
// --- add left margin to first column
            if (j === 0 ){
                el.classList.add("ml-2");
            }

// ===== SHIFT  =====co
            if ( settings_tblName === "shift"){
// ---  add img to column restshift
                if (j === 1) {AppendChildIcon(el, imgsrc_stat00)}
// ---  add delete to last column, not in addnew row
                if (j === column_count - 1){
                    if (!is_addnew_row){CreateBtnDeleteInactive("delete", false, tblRow, el)};
// ---  add hover and pointer to all columns except last column 'delete'
                } else {
                    add_hover(el);
                    el.classList.add("pointer_show");
// ---  add addEventListener to all columns except last column
                    td.addEventListener("click", function() {MGS_Open("datatable", el, is_addnew_row)}, false)
                }

// ===== TEAMMEMBER  =====
            } else if ( settings_tblName === "teammember"){
// ---  add delete to last column, not in addnew row
                if (j === column_count - 1){
                    if (!is_addnew_row){CreateBtnDeleteInactive("delete", false, tblRow, el)};
// ---  add hover and pointer to all columns except last column 'delete'
                } else {
                    add_hover(el);
                    el.classList.add("pointer_show");
// ---  add addEventListener to all columns except last column
                    td.addEventListener("click", function() {MGT_Open("datatable", el)}, false)

                    el.classList.add("border_none");
            //el.classList.add("tsa_transparent");
            //el.classList.add("tsa_bc_transparent");
                }

// ===== SCHEMEITEM  =====
            } else if ( settings_tblName === "schemeitem"){
// ---  add delete to last column, not in addnew row
                if (j === column_count - 1){
                    if (!is_addnew_row){CreateBtnDeleteInactive("delete", false, tblRow, el)};
// --- add img inactive to second last column,  not when is_new_row
                } else if (j === column_count - 2){
                    const is_inactive = false; // is_inactive gives value to btn. Give value later in updateTblRow
                    CreateBtnDeleteInactive("inactive", false, tblRow, el, is_inactive);
                } else {
// ---  add img to column restshift
                    if (fldName === "isrestshift") {
                        AppendChildIcon(el, imgsrc_stat00)
                    } else if (fldName === "offsetend") {
// --- add left margin to offset end (left outlined, to keep '02.00 >' in line with '22.00'
                        el.classList.add("ml-4");
                    }
                }
                if (j !== column_count - 1){
// ---  add hover and pointer to all columns except last  columns  'delete'
                    add_hover(el);
                    el.classList.add("pointer_show");
                }
// ---  add addEventListener to all columns except last column
                    // TODO td.addEventListener("click", function() {MGT_Open("datatable", el)}, false)
 //} else {
// --- add EventListener to td
            //} else if ((settings_tblName === "teammember") && (!is_template_mode) ){
           //     if ([0, 3].indexOf( j ) > -1){
           //         el.addEventListener("click", function() {MSE_open(el)}, false )} else
           //     if (([1, 2].indexOf( j ) > -1) && (!is_addnew_row)){
           //         el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)};
          //  }

// --- add datalist_ to td shift, team, employee
            // called by DatalistDownload, info not downloaded yet when rows are created
            //if (settings_tblName === "schemeitem"){
            //    if (j === 1) {
                    //el.innerHTML = FillOptionShiftOrTeamFromMap(shift_map, ppk_int, null, true)
           //     } else if (j === 2) {
                   //el.innerHTML = FillOptionShiftOrTeamFromMap(team_map, ppk_int)
            //    }
           // }


// --- add margin to last column, only in shift table column
           //if (settings_tblName === "shift" && j === column_count - 1 ){el.classList.add("mr-2")}

// --- add other classes to td - Necessary to skip closing popup
            //el.classList.add("border_none");
            //el.classList.add("tsa_transparent");
            //el.classList.add("tsa_bc_transparent");
            //if ( settings_tblName === "schemeitem"){
            //    if (j === 0) {
                    //el.classList.add("input_popup_date")
                    // TODO tsa_transparent necessaryfor now, is removed prom input_popup_date becasue of datepicker in scheme box. To be changed
                    //el.classList.add("tsa_transparent")
             //   } else {
             //    el.classList.add("input_text"); // makes background transparent
           //     };

            //};
}  // end else

// --- add element to td.
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };  // CreateTblRow

//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        //console.log("===  CreateTblModSelectPeriod == ");
        //console.log(period_dict);
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        tBody.innerText = null;
//+++ insert td's ino tblRow
        const len = loc.period_select_list.length
        //console.log("loc.period_select_list", loc.period_select_list);
        // period_select_list = [["today", "Vandaag"], ["tom", "Morgen"], ... ["lm", "Last month"], ["other", "Andere periode..."]]
        for (let j = 0, tblRow, td, tuple; j < len; j++) {
            tuple = loc.period_select_list[j];
//+++ insert tblRow ino tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModPeriodSelect(tblRow, j);}, false )
    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});
            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag  to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }

        //let el_select = document.getElementById("id_mod_period_extend");
        //t_FillOptionsPeriodExtension(el_select, loc.period_extension)

    } // CreateTblModSelectPeriod

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23 PR2020-03-19 PR2020-04-13
    function CreateBtnDeleteInactive(mode, is_grid, tblRow, el_input, is_inactive){
        //console.log(" === CreateBtnDeleteInactive ===", mode)  // mode = 'delete' or 'inactive'
        //el_input.setAttribute("href", "#");
        el_input.classList.add("pointer_show");

        // don't show title 'delete'
        const tblName = get_attr_from_el(tblRow, "data-table")

        //const tbl_txt = (tblName === "teammember") ? loc.This_teammember :
        //                (tblName === "shift" || tblName === "schemeitem") ? loc.This_shift :
        //                (tblName === "scheme") ? loc.This_scheme :
        //                (tblName === "team") ? loc.This_team : loc.This_item
        //const del_inactive_txt = (mode ==="delete") ? loc.will_be_deleted : loc.will_be_made_inactive;
        //const title =  tbl_txt + " " + del_inactive_txt;
        //el_input.setAttribute("title", title);

        // was: if(tblName === "grid_teammember"){
        if(is_grid ){
            if(tblName === "teammember"){
                el_input.addEventListener("click", function() {MGT_DeleteTeammember(tblRow)}, false )
            };
        } else {
            //el_input.addEventListener("click", function() {UploadDeleteInactive(mode, el_input)}, false )
            el_input.addEventListener("click", function() {ModConfirmTblrowOpen(mode, tblName, el_input)}, false )
        }
//- add hover delete img
        if (mode ==="delete") {
            el_input.addEventListener("mouseenter", function() {
                el_input.children[0].setAttribute("src", imgsrc_deletered);
            });
            el_input.addEventListener("mouseleave", function() {
                el_input.children[0].setAttribute("src", imgsrc_delete);
            });
        }
       // el_input.classList.add("m-2")

        const img_src = (mode ==="delete") ? imgsrc_delete : (!!is_inactive) ? imgsrc_inactive_black : imgsrc_inactive_grey;
        AppendChildIcon(el_input, img_src)
    }  // CreateBtnDeleteInactive


//###########################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= Upload_Scheme  ============= PR2019-06-06
    function Upload_Scheme(el_input) {
        //console.log("======== Upload_Scheme");
        //console.log("el_input: ", el_input);

        let upload_dict = {};

// ---  get pk and ppk from el_input, is safer than getting from selected.scheme_pk
        const pk_int = get_attr_from_el_int(el_input, "data-pk")

// ---  create id_dict
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", pk_int)
        let id_dict = get_dict_value(map_dict, ["id"]);

        if (!isEmpty(id_dict)){

// ---  skip if parent_pk does not exist (then it is an empty scheme)
            if(!!id_dict["ppk"]){
// ---  add id_dict to upload_dict
                upload_dict["id"] = id_dict
                if(!!id_dict["pk"]){upload_dict["pk"] = id_dict["pk"]}

    // ---  loop through input elements of scheme
                const fldName = get_attr_from_el_str(el_input, "data-field")
                //console.log("fldName", fldName);
                //console.log("el_input", el_input);
// get n_value
                    // PR2019-03-17 debug: getAttribute("value");does not get the current value
                    // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                    // The 'value' property holds the current value (el_input.value).

// get o_value
                let o_value = null, n_value = null;
                if (el_input.type === "checkbox") {
                    n_value = el_input.checked;
                    o_value = (get_attr_from_el_str(el_input, "data-value", "false") === "true");

                } else {
                    n_value = el_input.value;
                    o_value = get_attr_from_el(el_input, "data-value"); // data-value="2019-03-29"
                };
                //console.log("o_value", o_value, typeof o_value);
                //console.log("n_value", n_value, typeof n_value);

// validate if value of cycle is within range
                if(fldName === "cycle") {
                    if (n_value < 1 || n_value > MAX_CYCLE_DAYS) {
                        el_input.value = (o_value >= 1 && o_value <= MAX_CYCLE_DAYS) ? o_value : 7;
                        return false;
                    }
                }

                // n_value can be blank when deleted, skip when both are blank
                if(n_value !== o_value){
// add n_value and 'update' to field_dict
                    let field_dict = {"update": true};
                    if(!!n_value){field_dict["value"] = n_value};
// add field_dict to upload_dict
                    upload_dict[fldName] = field_dict;
                };
// reset other field (in scheme, publichodilay)
                if(["divergentonpublicholiday", "excludepublicholiday"].indexOf(fldName) > -1) {
                    // in scheme:  if value of this field is true, set other field false
                    if(!!n_value){
                        const other_fldName = (fldName === "divergentonpublicholiday") ? "excludepublicholiday" : "divergentonpublicholiday"
                        upload_dict[other_fldName] = {value: false, update: true};
                    }
                }

                //console.log("upload_dict", upload_dict);

            }  // if(!!id_dict["parent_pk"])
        };  // if (!isEmpty(id_dict))


        const url_str =  url_scheme_shift_team_upload;
        UploadChanges(upload_dict, url_str, "Upload_Scheme");

    };  // function Upload_Scheme

//========= Upload_TeamXXX  ============= PR2019-10-18
    function Upload_TeamXXX() {
        //console.log("======== Upload_Team");
        // This function is called by el_input_team_code

// ---  create team_dict
        const map_id = get_map_id("team", selected.team_pk.toString());
        const team_dict = get_mapdict_from_datamap_by_id(team_map, map_id)
       //console.log("team_dict: ", team_dict);
        const team_code = get_subdict_value_by_key(team_dict, "code", "value")

// ---  create id_dict
        let id_dict = get_dict_value(team_dict, ["id"]);
       //console.log("id_dict: ", id_dict);
        // add id_dict to upload_dict
        if (!isEmpty(id_dict)){
            let upload_dict = {"id": id_dict};

            let new_value // = el_input_team_code.value;
            let field_dict = {"update": true};
            if (!!new_value){
                field_dict["value"] = new_value;
            }
            upload_dict["code"] = field_dict;

            const url_str =  url_scheme_shift_team_upload;
            UploadChanges(upload_dict, url_str, "Upload_TeamXXX");
        }
    };  // function Upload_TeamXXX

//=========  UploadSchemeitemDelete  ================ PR2019-10-30
    function UploadSchemeitemDelete(mod_dict, action) {
        console.log("========= UploadSchemeitemDelete ===", action );
        console.log("mod_dict ", mod_dict );
        // mod_dict: {id: {delete: true, pk: 363, ppk: 1208, table: "schemeitem"}}

        // UploadSchemeitemDelete is only called by ModConfirmSave after btn_delete in tblRow

        if (!!mod_dict){
            let id_dict = get_dict_value(mod_dict, ["id"]);
            const tblName = get_dict_value(id_dict, ["table"]);
            const pk_str = get_dict_value(id_dict, ["pk"]);
            const ppk_int = parseInt(get_dict_value(id_dict, ["ppk"]));
            const map_id = get_map_id(tblName, pk_str);

// ---  create id_dict
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!parseInt(pk_str)){
                id_dict["temp_pk"] = pk_str
            }
            id_dict[action] = true;

       //console.log("map_id ", map_id );
            let tblRow = document.getElementById(map_id);
       //console.log("tblRow ", tblRow );
            if (action === 'delete'){
                tblRow.classList.remove(cls_selected);
                tblRow.classList.add(cls_error);
            }
    // add id_dict to dict
            let upload_dict = {};
            if (!isEmpty(id_dict)){
                upload_dict["id"] = id_dict
                // el_input is first child of td, td is cell of tblRow
                let fieldname, value, o_value, n_value, field_dict = {};
                let el_input = tblRow.cells[0].children[0];

                if(!!el_input){
                    // PR2019-03-17 debug: getAttribute("value");does not get the current value
                    // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                    // The 'value' property holds the current value (el_input.value).
                    n_value = el_input.value // data-value="2019-05-11"

                    field_dict["update"] = true;
                    if(!!n_value){field_dict["value"] = n_value};
                };
                // add field_dict to upload_dict
                if (!isEmpty(field_dict)){upload_dict["code"] = field_dict;};
            };  // if (!isEmpty(id_dict))

// ---  upload upload_list, it can contain multiple upload_dicts (list added because of grid PR2020-03-15)
            let upload_list = [upload_dict];

            const parameters = {"upload": JSON.stringify (upload_list)}
            console.log("upload_dict", upload_dict);
            let response = "";
            $.ajax({
                type: "POST",
                url: url_schemeitem_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response:");
                    console.log (response);

                    if ("schemeitem_list" in response) {
                        b_refresh_datamap(response["schemeitem_list"], schemeitem_map)
                    }

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  // if (!!tblRow)
    }  // function UploadSchemeitemDelete

//=========  UploadSchemeOrShiftOrTeam  ================ PR2019-08-08
    function UploadSchemeOrShiftOrTeam(tblRow, action) {
        console.log("========= UploadSchemeOrShiftOrTeam ===", action );
        //console.log(" tblRow", tblRow);   // tblRow is SelectTableRow
        // selecttable scheme, shift, team; action 'inactive, create
        let tblName = get_attr_from_el(tblRow, "data-table");
        //console.log(" tblName", tblName);

        let upload_dict = {};
        if (!!tblRow){

// ---  get pk from id of tblRow
            const pk_str = tblRow.getAttribute("data-pk");
            let pk_int = parseInt(pk_str)

// ---  create id_dict
            let id_dict = {}
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int){
                id_dict["temp_pk"] = pk_str
            } else {
    // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };
            id_dict['table'] = tblName;
            id_dict[action] = true;

            if (action === 'delete'){
                tblRow.classList.remove(cls_selected);
                tblRow.classList.add(cls_error);
            }

    // get parent_pk
            const parent_pk_int = get_attr_from_el_int(tblRow, "data-ppk");
            id_dict["ppk"] = parent_pk_int;

        //console.log("id_dict", id_dict);

    // add id_dict to dict
            if (!isEmpty(id_dict)){
                upload_dict["id"] = id_dict
                // el_input is first child of td, td is cell of tblRow
                let fieldname, value, o_value, n_value, field_dict = {};
                let el_input = tblRow.cells[0].children[0];

                if(!!el_input){
                    // PR2019-03-17 debug: getAttribute("value");does not get the current value
                    // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                    // The 'value' property holds the current value (el_input.value).
                    n_value = el_input.value // data-value="2019-05-11"

                    field_dict["update"] = true;
                    if(!!n_value){field_dict["value"] = n_value};
                };
                // add field_dict to upload_dict
                if (!isEmpty(field_dict)){upload_dict["code"] = field_dict;};
            };  // if (!isEmpty(id_dict))

            const parameters = {"upload": JSON.stringify (upload_dict)}
            console.log("upload_dict", upload_dict);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_shift_team_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("UploadSchemeOrShiftOrTeam response:");
                    console.log (response);

                    if ("scheme_list" in response) {
                        b_refresh_datamap(response["scheme_list"], scheme_map)
                        // >>>> SBR_FillSelectTable("UploadSchemeOrShiftOrTeam scheme_list");
                    }
                    // PR2021-01-03 use shift_rows instead of shift_list.
                    // Was: if ("shift_list" in response) {b_refresh_datamap(response.shift_list, shift_map)}
                    if ("shift_rows" in response) {b_refresh_datamap(response.shift_rows, shift_map, "shift")}

                    if ("team_list" in response) {b_refresh_datamap(response["team_list"], team_map) }
                    if ("schemeitem_list" in response) {b_refresh_datamap(response["schemeitem_list"], schemeitem_map) }

                    if ("scheme_update" in response){UpdateFromResponse(response["scheme_update"]);};
                    if ("shift_update" in response){UpdateFromResponse(response["shift_update"]);};
                    //if ("team_update" in response){UpdateFromResponse(response["team_update"]);};
                    if ("teammember_update" in response){UpdateFromResponse(response["teammember_update"]);};
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  // if (!!tblRow)
    }  // function UploadSchemeOrShiftOrTeam

//========= UploadTimepickerChanged  ============= PR2019-10-12
    function UploadTimepickerChanged(tp_dict) {
        console.log("=== UploadTimepickerChanged");
        console.log("tp_dict", tp_dict);

        let upload_dict = {"id": tp_dict["id"]};
        // quicksaveis saved separately by uploadusersettings
        //if("quicksave" in tp_dict) {is_quicksave = tp_dict["quicksave"]};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            upload_dict[tp_dict.field] = {value: tp_dict.offset, update: true};

            const tblName = "shift";
            const map_id = get_map_id(tblName, get_dict_value(tp_dict, ["id", "pk"]));
            const map_dict = get_mapdict_from_datamap_by_id(shift_map, map_id)

            const cur_shift_code = get_dict_value(map_dict, ["code", "value"], "")
            let offset_start = get_dict_value(map_dict, ["offsetstart", "value"])
            let offset_end = get_dict_value(map_dict, ["offsetend", "value"])
            let break_duration = get_dict_value(map_dict, ["breakduration", "value"], 0)
            let time_duration = get_dict_value(map_dict, ["timeduration", "value"], 0)
            let is_restshift = get_dict_value(map_dict, ["isrestshift", "value"], false)
            let update_shift_code = false;
            if (tp_dict.field === "offsetstart") {
                offset_start = tp_dict.offset;
                upload_dict[tp_dict.field] = {value: tp_dict.offset, update: true};
                update_shift_code = true;
            } else if (tp_dict.field === "offsetend") {
                offset_end = tp_dict.offset;
                upload_dict[tp_dict.field] = {value: tp_dict.offset, update: true};
                update_shift_code = true;
            } else if (tp_dict.field === "breakduration") {
                break_duration = tp_dict.offset;
                upload_dict[tp_dict.field] = {value: tp_dict.offset, update: true};
            } else if (tp_dict.field === "timeduration") {
                time_duration = tp_dict.offset;
                upload_dict[tp_dict.field] = {value: tp_dict.offset, update: true};
            }
            if (update_shift_code) {
                const new_shift_code = f_create_shift_code(loc, offset_start, offset_end, time_duration, cur_shift_code);
                if (!!new_shift_code && new_shift_code !== cur_shift_code){
                    upload_dict["code"] = {value: new_shift_code, update: true};
                }
            }

            let tr_changed = document.getElementById(map_id)

            let parameters = {"upload": JSON.stringify (upload_dict)}
            const url_str = url_scheme_shift_team_upload;

            console.log("url_str", url_str);
            console.log("upload_dict", upload_dict);
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
                            UpdateFromResponse(response["update_list"][i]);
                        }
                    }
                    if ("schemeitem_list" in response) {
                        b_refresh_datamap(response["schemeitem_list"], schemeitem_map)
                     }
                    if ("shift_update" in response){
                        UpdateFromResponse(response["shift_update"]);
                    };
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }

 }  //UploadTimepickerChanged


//=========  HandleSubmenuBtnAddNew  ================ PR2020-05-31 PR2020-11-07
    function HandleSubmenuBtnAddNew() {
        if(is_absence_mode){
            // function MAB_Open checks for permit_view_add_edit_delete_absence
            MAB_Open();
        } else {
            MSCH_Open();
        };
    }

//========= HandleSubmenuBtnDelete  ============= PR2020-08-28 PR2020-11-07
    function HandleSubmenuBtnDelete() {
        //console.log( " ==== HandleSubmenuBtnDelete ====");
        let mode = null;
        if (selected_btn === "btn_grid"){
            mode = "scheme_delete";
            // ---  put info of selected scheme in mod_MSCH_dict, gets info for new scheme when selected scheme not found
            MSCH_get_scheme_dict();
        } else if (selected_btn === "btn_absence") {

            // PR2020-11-09 permit_customer_orders may add absence to employees that have shift in his orders
            // was: if(permit_view_add_edit_delete_absence){
            mode = "absence_delete";

        }
        if(mode) {ModConfirmOpen(mode)};
    }  // HandleSubmenuBtnDelete

//========= UploadDeleteInactive  ============= PR2019-09-23 PR2020-05-31
    function UploadDeleteInactive(mode, el_input) {
        console.log( " ==== UploadDeleteInactive ====", mode);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id = get_map_id(tblName, pk_str);
            const map_dict = get_mapdict_from_tblRow(tblRow);

            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                let upload_dict = {"id": map_dict["id"]};
                mod_dict = {"id": map_dict["id"]};
                if (tblName === "teammember" && !isEmpty(map_dict["employee"])){
                    mod_dict["employee"] = map_dict["employee"]
                } else if (tblName === "absence" && map_dict.employee){
                    mod_dict.employee = map_dict.employee;
                } else if (tblName === "schemeitem" && !isEmpty(map_dict.shift)){
                    mod_dict.shift = map_dict.shift;
                };
                if (mode === "delete"){
                    mod_dict["id"]["delete"] = true;
                    ModConfirmOpen("delete", el_input);
                    return false;
                } else if (mode === "inactive"){
            // get inactive from map_dict
                    const inactive = get_dict_value(map_dict, ["inactive", "value"], false)
            // toggle inactive
                    const new_inactive = (!inactive);
                    upload_dict.inactive = {value: new_inactive, update: true};
            // change inactive icon, before uploading
                    format_inactive_element (el_input, mod_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            // ---  show modal, only when made inactive
                    if(!!new_inactive){
                        mod_dict.inactive = {value: new_inactive, update: true};
                        ModConfirmOpen("inactive", el_input);
                        return false;
                    }
                }
                const url_str = (tblName === "teammember") ? url_teammember_upload :
                                (tblName === "schemeitem") ? url_schemeitem_upload : url_scheme_shift_team_upload

                UploadChanges(upload_dict, url_str, "UploadDeleteInactive");
            }  // if (!isEmpty(map_dict))
        }  //   if(!!tblRow)
    }  // UploadDeleteInactive


//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type
    function UploadChanges(upload_dict, url_str, calledby) {
        console.log("=== UploadChanges", calledby);
        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)}

            console.log("url_str: ", url_str );
            console.log("upload_dict: ", upload_dict );

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response", response);
                    //if ("schemeitem_list" in response) {
                    //    b_refresh_datamap(response["schemeitem_list"], schemeitem_map)
                    //    FillTableRows("schemeitem")
                    //}
                    // don't use schemeitem_list and schemeitem_update, new entry will be shown twice
                    if ("updated_absence_rows" in response) {
                        UpdateAbsenceRowsFromResponseNEW(response.updated_absence_rows)
                    };
                    if ("shift_update_list" in response) {
                        const shift_update_list = response["shift_update_list"];
                        if (selected_btn ==="btn_grid"){
                            Grid_UpdateFromResponse_shift(shift_update_list);
                        } else if (selected_btn ==="btn_shift"){
                            UpdateFromResponse_datatable_shift(shift_update_list)
                        }
                    }

                    if ("si_update_list" in response) {
                        Grid_UpdateFromResponse_si(response["si_update_list"]);
                    }
                    if ("team_update_list" in response) {
                        Grid_UpdateFromResponse_team(response.team_update_list);
                    }
                    if ("teammember_update_list" in response) {
                        Grid_UpdateFromResponse_teammember(response["teammember_update_list"]);
                    }
                    if ("schemeitem_update" in response) {
                        UpdateFromResponse(response["schemeitem_update"]);
                    }
                    if ("scheme_update" in response) {
                        const scheme_update = response["scheme_update"];
                        if(!isEmpty(scheme_update)){
                            const scheme_list = [scheme_update];
                            b_refresh_datamap(scheme_list, scheme_map)
                            UpdateFromResponse(scheme_update);
                        }
                    }
                    if ("scheme_list" in response) {
                        const scheme_list = response["scheme_list"];
                        if(scheme_list.length){
                            b_refresh_datamap(scheme_list, scheme_map)
                        }
                        SBR_FillSelectTable("MSCH_Save scheme_list");
                    }

                    if ("shift_update" in response) {
                        //UpdateFromResponse_datatable_shift(response["shift_update"])
                        UpdateTablesAfterResponse(response);
                    };
                    //if ("team_update" in response) { UpdateFromResponse(response["team_update"]) };
                    if ("teammember_update" in response) {UpdateFromResponse(response["teammember_update"])};

                    if ("rosterdate" in response) {ModRosterdateFinished(response["rosterdate"])}
                    if ("copied_from_template" in response) {
                        // only returned by SchemeTemplateUploadView
                        UpdateTablesAfterResponse(response);
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!row_upload)
    };  // UploadChanges


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  Grid_UpdateFromResponse_team  ================ PR2020-03-20
    function Grid_UpdateFromResponse_team(update_list) {
       //console.log(" ==== Grid_UpdateFromResponse_team ====");
       // called by UploadChanges / team_update_list
// --- loop through update_list
        for (let i = 0, update_dict; update_dict = update_list[i]; i++) {
            //console.log("update_dict", update_dict);
            // update_dict = { code: "Ploeg A", col: 0, deleted: true, id: 16, mapid: "team_16", rowid: "gridrow_team_16", s_id: 2, table: "team" }
//----- get id_dict of updated item
            const map_id = (update_dict.mapid) ? update_dict.mapid : null;
            //console.log("map_id", map_id);
            if (map_id){
//----- replace updated item in map or remove deleted item from map
                const tblName = "team";
                const is_deleted = (update_dict.deleted) ? update_dict.deleted : false;
                update_map_item_local(tblName, map_id, update_dict, is_deleted);
            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)

        Grid_FillTblTeams(selected.scheme_pk);   // functions also fills grid_teams_dict

    };  // Grid_UpdateFromResponse_team

//=========  Grid_UpdateFromResponse_teammember  ================ PR2020-03-20
    function Grid_UpdateFromResponse_teammember(update_list) {
        console.log(" ==== Grid_UpdateFromResponse_teammember ====");
        console.log("update_list", update_list);
        let cell_id_str = null, ppk_int = null;

// --- loop through update_list
        for (let i = 0, len = update_list.length; i < len; i++) {
            let update_dict = update_list[i];
//----- get id_dict of updated item
            const map_id = update_dict.mapid;
            const arr = map_id.split("_");
            const tblName = arr[0];
            const pk_int = Number(arr[1])
            if (map_id){
//----- replace updated item in map or remove deleted item from map
                const is_deleted = (update_dict.deleted) ? update_dict.deleted : false;
                update_map_item_local(tblName, map_id, update_dict, is_deleted);
            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)

        Grid_FillTblTeams();  // functions also fills grid_teams_dict

    };  // Grid_UpdateFromResponse_teammember

//=========  Grid_UpdateFromResponse_shift  ================ PR2020-03-20  PR2021-01-03
    function Grid_UpdateFromResponse_shift(update_list) {
        console.log(" ==== Grid_UpdateFromResponse_shift ====");
        console.log("update_list", update_list);
        // deleted: true, id: 8,  rowid: "gridrow_shift_8", s_id: 2, table: "shift"
        let cell_id_str = null, ppk_int = null, tblName = "shift";
        let pk_list = [] // for highlighting cells
        let new_shift_pk = null;  // for highlighting new shift
        const created_mapid_list = [];

// --- loop through update_list
        // create list of added rows, to make them green after updating map and crating table
        if(update_list){
            for (let i = 0, created_mapid, update_dict; update_dict = update_list[i]; i++) {
                created_mapid = Grid_Update_shiftmap_row(update_dict);
                if(created_mapid) {created_mapid_list.push(created_mapid)}
            }
        }
        Grid_FillTblShifts()

        if (tblName === "shift"){
            if (created_mapid_list.length){
                for (let i = 0, created_mapid; created_mapid = created_mapid_list[i]; i++) {
                    const row_id = "gridrow_" +  created_mapid;
                    const tblRow = document.getElementById(row_id);
                    console.log("tblRow", tblRow);
                    if(!!tblRow){
                        ShowOkElement(tblRow);
                    };
                }
            };
        } else {
            // TODO NOT IN USE, maybe code needes elsewhere
            /*
// ---  highlight cell when selected team in cell (after refresh tables
            for (let i = 0, len = pk_list.length; i < len; i++) {

                const cell_id = "cell_shift_" + pk_list[i].toString();
                let td = document.getElementById(cell_id);
                // cell might be deleted, must check if exists
                if(!!td){
                    td.classList.add("border_bg_valid");
                    setTimeout(function (){ td.classList.remove("border_bg_valid");}, 2000);
                }
            }
            */
        }

// ---  highlight shift cell after update


    };  // Grid_UpdateFromResponse_shift


//=========  Grid_Update_shiftmap_row  ================ PR2020-03-20  PR2021-01-03
    function Grid_Update_shiftmap_row(update_dict) {
        console.log(" ==== Grid_Update_shiftmap_row ====");
        console.log("update_dict", deepcopy_dict(update_dict))

        let created_mapid = null;
//----- get id_dict of updated item
        // PR2021-01-04 was:
            //tblName = update_dict.table;
            //const pk_int = update_dict.id;
            //const map_id = get_map_id(tblName, pk_int);
        if(!isEmpty(update_dict)){

    // ---  update or add shift in shift_map
            // rowid: "gridrow_shift_10",  mapid: "shift_10"
            const map_id = update_dict.mapid;
            const arr = (map_id) ? map_id.split("_") : null;
            const tblName = (arr && arr.length) ? arr[0] : null;

            //const pk_int = update_dict.id;
            //pk_list.push(pk_int)
            //if (tblName === "shift"){new_shift_pk = pk_int}

            const is_deleted =  (update_dict.deleted) ? update_dict.deleted : false;

// --- check if it is a created row
            // when row does not exist in data_map: it is a created row
            // put mapid as returnvalue,  It is used further to make the row green for 2 seconds
            const is_created = (!shift_map.has(map_id));
            if (is_created) { created_mapid = map_id}

    //--- remove 'updated', deleted created and msg_err from update_dict
            // TODO remove any added keys, like msg_err (if applicable) keu 'deleted can stay, because row will be deleted
            // NOTE: first set is_created and  is_deleted, then remove these keys from update_dict, then replace update_dict in map
            //remove_err_del_cre_updated__from_itemdict(update_dict)

            update_map_item_local(tblName, map_id, update_dict, is_deleted);
        }
        return created_mapid;
    };  // Grid_Update_shiftmap_row

//=========  UpdateFromResponse_datatable_shift  ================ PR2020-05-26
    function UpdateFromResponse_datatable_shift(update_list) {
        //console.log(" ==== UpdateFromResponse_datatable_shift ====");
        //console.log("update_list", update_list);

// --- loop through update_list
       for (let i = 0, len = update_list.length; i < len; i++) {
            const update_dict = update_list[i];
            //console.log("update_dict", update_dict);

//----- get id_dict of updated item
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id", "pk"]);
            const ppk_int = get_dict_value(update_dict, ["id", "ppk"]);
            const map_id = get_map_id(tblName, pk_int);
            const is_created = get_dict_value(update_dict, ["id", "created"], false);
            const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);

// ++++ deleted ++++
            if(is_deleted) {
// ---  reset selected scheme/shift/team when deleted
                //if (tblName === "scheme"){selected.scheme_pk = 0};
                if (["scheme", "shift"].indexOf(tblName) > -1 ){selected.shift_pk = 0};
                //if (["scheme", "team"].indexOf(tblName) > -1 ){selected.team_pk = 0};
// ---  delete tblRow from datatable
                let tblRow_delete = document.getElementById(map_id);
                if (!!tblRow_delete) {tblRow_delete.parentNode.removeChild(tblRow_delete)}
// ---  delete selectRow from select_table
                let selectRow = document.getElementById("sel_" + map_id);
                if (selectRow) {
                    selectRow.parentNode.removeChild(selectRow)
                }

            } else {
    //----- update tblRow
                let tblRow;
                if (is_created){
                // get row_index
                    let order_by = Number(get_dict_value(update_dict, ["offsetstart", "value"], 0));
                    if(!order_by) {order_by = 0}
                    const row_index = t_get_rowindex_by_orderby(tblBody_datatable, order_by)
                    const scheme_pk = ppk_int;
                    tblRow = CreateTblRow(tblName, false, pk_int, ppk_int, scheme_pk, row_index, order_by);
                } else {
                    tblRow = document.getElementById(map_id)
                }
                if(tblRow){
                   //console.log("tblRow", tblRow);
                    UpdateTblRow(tblRow, update_dict, "UpdateFromResponse_datatable_shift");

    //----- replace updated item in map or remove deleted item from map
                    if(is_deleted){

                    }
                }  // if(tblRow)
            }  // if(is_deleted)

//--- remove 'updated', deleted created and msg_err from update_dict
            // NOTE: first update tblRow, then remove these keys from update_dict, then replace update_dict in map
            remove_err_del_cre_updated__from_itemdict(update_dict)

//----- replace updated item in map or remove deleted item from map
            update_map_item_local(tblName, map_id, update_dict, is_deleted);

       }  //  for (let i = 0, len = update_list.length; i < len; i++)

    };  // UpdateFromResponse_datatable_shift

//=========  UpdateFromResponse  ================ PR2019-10-14
    function UpdateFromResponse(update_dict) {
       //console.log(" ==== UpdateFromResponse ====");
       //console.log("update_dict", deepcopy_dict(update_dict) );

//----- get id_dict of updated item
        const id_dict = get_dict_value(update_dict, ["id"]);
        const tblName = (is_absence_mode) ? "absence" : get_dict_value(update_dict, ["id", "table"]);
        const pk_int = get_dict_value(update_dict, ["id", "pk"]);
        const ppk_int = get_dict_value(update_dict, ["id", "ppk"]);
        const map_id = get_map_id(tblName, pk_int);
        const is_created = get_dict_value(update_dict, ["id", "created"], false);
        const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);

        let tblRow = document.getElementById(map_id);

       //console.log("is_created", is_created);
       //console.log("is_deleted", is_deleted);
// ++++ deleted ++++
        if(is_deleted){
// ---  reset selected scheme/shift/team when deleted
            if (tblName === "scheme"){selected.scheme_pk = 0};
            if (["scheme", "shift"].indexOf(tblName) > -1 ){selected.shift_pk = 0};
            if (["scheme", "team"].indexOf(tblName) > -1 ){selected.team_pk = 0};
// ---  delete tblRow from datatable
            if (tblRow) {tblRow.parentNode.removeChild(tblRow)};
// ---  delete selectRow from select_table
            let selectRow = document.getElementById("sel_" + map_id);
            if (selectRow) {selectRow.parentNode.removeChild(selectRow)};
// ---  when scheme is deleted:
            if (tblName === "scheme"){
        // ---  reset tblBody of schemeitem, shift, teammember, and set el_input_team_code = null
                tblBody_datatable.innerText = null;
                selected.scheme_pk = 0
            }

// ++++ created ++++
        } else if (is_created){
// ---  item is created: add new row on correct index of table, reset addnew row
            // parameters: tblName, pk_str, ppk_str, is_addnew, customer_pk
            if(tblName === "scheme"){
                // skip scheme, it has no table. team has table teammembers, is empty after creating new team
            } else if(tblName === "team"){
// ---  when team is created:
                // set focus to addnew row in table teammember
                // team has table teammembers, is empty after creating new team
            } else {
// ---  create new row
                // this is not an add-new row! (which is in the footer) but a created row
// --- get 'order_by'. This contains the number / string that must be used in ordering rows
                const order_by = get_orderby(tblName, update_dict)
                //console.log("order_by: <" + order_by + ">")
// --- get row_index
                const row_index = t_get_rowindex_by_orderby(tblBody_datatable, order_by)
                const scheme_pk = selected.scheme_pk; // scheme_pk will only put value in 'data-scheme_pk when table = teammember
                //console.log("row_index", row_index)
                tblRow = CreateTblRow(tblName, false, pk_int, ppk_int, scheme_pk, row_index, order_by)
                UpdateTblRow(tblRow, update_dict, "UpdateFromResponse 1")
// ---  set focus to code input of new row
                const index =  0;
                let el_input = tblRow.cells[index].children[0];
                if(!!el_input){
                    setTimeout(function() {el_input.focus()}, 50);
                }
                HandleTableRowClicked(tblRow);
// ---  scrollIntoView, only in table schemeitem
                if (tblName === "schemeitem"){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                };
// ---  clear addnew row
            }  // if(tblName !== "scheme")
        } else {

// ++++ updated  ++++
// ---  get existing tblRow
// ---  update input field team_code
            if (tblName === "team"){
                const field_dict = get_dict_value(update_dict, ["code"])
                const key_str = "value";
                //format_text_element (el_input_team_code, key_str, el_msg, field_dict, false, [-220, 60])

            } else if (tblName === "scheme"){
                // skip scheme, it has no table
            } else {

                // or use this one?? check: const tblRow = document.getElementById(map_id);
// ---  lookup tablerow of new and existing item
        // ---  created row has id 'teammemnber_new1', existing has id 'teammemnber_379'
        // ---  'is_created' is false when creating failed, use instead: (!is_created && !map_id)

// ---  update new and existing Row
                if(tblRow){
                    if (["shift", "teammember", "schemeitem" , "absence"].indexOf( tblName ) > -1){
                        UpdateTblRow(tblRow, update_dict, "UpdateFromResponse 2")
                    } else if (tblName === "absence") {
                        UpdateAbsenceTableRow(tblRow, update_dict);
                    }
                }
            };  // if (tblName === "team")
        } // if (is_created)


// ++++ update selectRow ++++
//--- insert new selectRow if is_created, highlight selected row
        if (["scheme", "shift", "team"].indexOf( tblName ) > -1){
            const sidebar_tblBody = sidebar_tblBody_scheme;
            const selected_pk =  selected.scheme_pk;
            let selectRow;
            if(is_created && !!sidebar_tblBody){
                const row_index = GetNewSelectRowIndex(sidebar_tblBody, 0, update_dict, loc.user_lang);
                 // TODO switch to t_CreateSelectRow
                //selectRow = CreateSelectRow(sidebar_tblBody, update_dict, row_index);
                // HandleSelectRowButtonInactive = UploadDeleteInactive

                let filter_ppk , filter_include_inactive, filter_include_absence, filter_istemplate, row_count = {},
                    bc_color_notselected, bc_color_selected,
                    imgsrc_default, imgsrc_default_header, imgsrc_black, imgsrc_hover,
                    title_row_btn, is_selected_row

                selectRow = t_CreateSelectRow(sidebar_tblBody, tblName, row_index, update_dict, selected_pk,
                    HandleSelect_Row, UploadDeleteInactive, false,
                    filter_ppk, filter_include_inactive, filter_include_absence, filter_istemplate, row_count,
                    bc_color_notselected, bc_color_selected,
                    imgsrc_default, imgsrc_default_header, imgsrc_black, imgsrc_hover,
                    title_row_btn, is_selected_row)

                HandleSelect_Row(selectRow);
            } else{
        //--- get existing  selectRow
                const rowid_str = id_sel_prefix + map_id;
                selectRow = document.getElementById(rowid_str);
            };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
            // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey
            //const filter_show_inactive = false; // no inactive filtering on this page
            const include_parent_code = false;
            t_UpdateSelectRow(selectRow, update_dict, include_parent_code, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)
        }  // if( tblName === "scheme"...

// --- fill grid
        if (selected_btn === "btn_grid") {
            Grid_FillGrid( "UpdateFromResponse")
        }
//--- remove 'updated', deleted created and msg_err from update_dict
        // NOTE: first update tblRow, then remove these keys from update_dict, then replace update_dict in map
        remove_err_del_cre_updated__from_itemdict(update_dict)
//--- replace updated item in map or remove deleted item from map
        // 'deleted' and 'created' are removed by remove_err_del_cre_updated__from_itemdict, therefore use parameters
        update_map_item_local(tblName, map_id, update_dict, is_deleted);
//--- refresh header text
// TODO correct
        UpdateHeaderText("UpdateFromResponse");
    }  // UpdateFromResponse

//========= UpdateAbsenceTableRow  =============
    function UpdateAbsenceTableRow(tblRow, update_dict, called_by){
        //console.log ("--- UpdateAbsenceTableRow  ------- ", called_by);
        //console.log("update_dict", update_dict);

        if (!isEmpty(update_dict) && !!tblRow) {
//--- get info from update_dict.id
            const tblName = get_dict_value (update_dict,["id", "table"]);
            const pk_int =  get_dict_value (update_dict,["id", "pk"]);
            const ppk_int =  get_dict_value (update_dict,["id", "ppk"]);
            const map_id = get_map_id(tblName, pk_int);
            const is_created =  get_dict_value (update_dict,["id", "created"], false);
            const is_deleted =  get_dict_value (update_dict,["id", "deleted"], false);
            const msg_err =  get_dict_value (update_dict,["id", "error"], false);
            const employee_pk = get_dict_value(update_dict, ["employee", "pk"]);
            if(employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

// --- new created record
            if (is_created){
// update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);

// move the new row in alfabetic order
                let tblBody = tblRow.parentNode
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, loc.user_lang);
                //tblBody.insertBefore(tblRow, tblBody.childNodes[row_index]);
// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in  if (is_deleted){
// --- loop through cells of tablerow
            if (!!tblRow){
                if(!!tblRow.cells){
                    for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                        let td = tblRow.cells[i];
                        let el_input = td.children[0];
                        if(el_input){
// --- lookup field in update_dict, get data from field_dict
                            const fldName = get_attr_from_el(el_input, "data-field");
                            let field_dict = get_dict_value (update_dict, [fldName]);
                            let value = get_dict_value (field_dict, ["value"]);
                            let is_updated = get_dict_value (field_dict, ["updated"], false);

                            let display_text = "";
                            if (["order", "employee"].indexOf( fldName ) > -1){
                                el_input.innerText = get_dict_value(field_dict, ["code"]);
                            } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                                const date_JS = get_dateJS_from_dateISO(value);
                                display_text = format_dateJS_vanilla (loc, date_JS, true, false);
                                // hard return necessary to display hover or green OK field when it is empty
                                if (!display_text){display_text = "\n"}
                                el_input.innerText = display_text;
                            } else if (["offsetstart", "offsetend", "breakduration", "timeduration"].indexOf(fldName) > -1){
                                if (["offsetstart", "offsetend"].indexOf( fldName ) > -1){
                                    display_text = display_offset_time (loc, value);

                                } else if (["breakduration", "timeduration"].indexOf( fldName ) > -1){
                                    display_text = display_duration (value, loc.user_lang);
                                }
                                // hard return necessary to display hover or green OK field when it is empty
                                if (!display_text){display_text = "\n"}
                                el_input.innerText = display_text;
                            }
                            if(is_updated){
                                ShowOkElement(el_input, "border_bg_valid")
                            };
                        };  // if(!!el_input)
                    }  //  for (let j = 0; j < 8; j++)
                }  // if(!!tblRow.cells){
            } // if (!!tblRow)
        };  // if (!isEmpty(update_dict) && !!tblRow)
    }  // UpdateAbsenceTableRow

//========= UpdateTblRow  =============
    function UpdateTblRow(tblRow, update_dict, called_by){
        //console.log ("--- UpdateTblRow  ------- ", called_by);
        //console.log("update_dict", update_dict);
        //console.log("tblRow", tblRow);

        if (!isEmpty(update_dict) && !!tblRow) {
//--- get info from update_dict.id
            const tblName = get_dict_value (update_dict,["id", "table"]);
            const pk_int =  get_dict_value (update_dict,["id", "pk"]);
            const ppk_int =  get_dict_value (update_dict,["id", "ppk"]);
            const map_id = get_map_id(tblName, pk_int);
            const is_created =  get_dict_value (update_dict,["id", "created"], false);
            const is_deleted =  get_dict_value (update_dict,["id", "deleted"], false);
            const msg_err =  get_dict_value (update_dict,["id", "error"], false);
            const employee_pk = get_dict_value(update_dict, ["employee", "pk"]);
            if(employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

// --- show error message of row
            if (!!msg_err){
                let td = tblRow.cells[2];
                let el_input = tblRow.cells[2].firstChild
                el_input.classList.add("border_bg_invalid");
                const msg_offset = [-160, 80];  // ^
                ShowMsgError(el_input, el_msg, msg_err, msg_offset)

// --- new created record
            } else if (is_created){
// update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);

// remove temp_pk from tblRow
                tblRow.removeAttribute("temp_pk");

// move the new row in alfabetic order
                // TODO: also when name has changed
                let tblBody = tblRow.parentNode
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, loc.user_lang);
                //tblBody.insertBefore(tblRow, tblBody.childNodes[row_index]);

// make row green, / --- remove class 'ok' after 2 seconds
               ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in  if (is_deleted){
            if (!!tblRow){
                const is_inactive = get_dict_value(update_dict, ["inactive", "value"], false);
                tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                if(!!tblRow.cells){
                    for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                        let td = tblRow.cells[i];
                        let el_input = td.children[0];
                        if(el_input){
                            UpdateField(el_input, update_dict, tblName)
                        };  // if(!!el_input)
                    }  //  for (let j = 0; j < 8; j++)
                }  // if(!!tblRow.cells){
            } // if (!!tblRow)
        };  // if (!isEmpty(update_dict) && !!tblRow)
    }  // UpdateTblRow

//========= UpdateField  =============
    function UpdateField(el_input, update_dict, tblName){
        //console.log("--- UpdateField  -------------- ", tblName);
        //console.log("update_dict", update_dict);
        if(el_input){
// --- lookup field in update_dict, get data from field_dict
            const fldName = get_attr_from_el(el_input, "data-field");
            let field_dict = get_dict_value (update_dict, [fldName]);
            let value = get_dict_value (field_dict, ["value"]);
            let is_updated = get_dict_value (field_dict, ["updated"]);
            const is_restshift = (tblName === "schemeitem") ? get_dict_value (update_dict, ["shift", "isrestshift"], false) :
                                                              get_dict_value (update_dict, ["isrestshift", "value"], false);
            let display_text = null;
            if (fldName === "rosterdate"){
                const date_JS = get_dateJS_from_dateISO(value);
                display_text = format_dateJS_vanilla (loc, date_JS,  false, false);
                // hard return necessary to display green OK field when it is empty
                //if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;
            } else if (["order", "team"].indexOf( fldName ) > -1){
                el_input.innerText = get_dict_value(field_dict, ["code"]);
            } else if (["employee", "replacement"].indexOf( fldName ) > -1){
                el_input.innerText = get_dict_value(field_dict, ["code"], "---");
            } else if ( (fldName === "code") || (tblName === "schemeitem" && fldName === "shift") ){
                display_text = (tblName === "shift") ? value : get_dict_value (update_dict, ["shift", "code"]);
                if (is_restshift){
                    if(!display_text) { display_text = loc.Rest_shift};
                    display_text += " (R)";
                }
                el_input.innerText = (display_text) ? display_text : "-";

            } else if (["offsetstart", "offsetend", "breakduration", "timeduration"].indexOf(fldName) > -1){
                // absence can have multiple shifts (although this should not be the case).
                // therefore shift has arr_agg ,use only first item of each arr
                const arr_value = (tblName === "schemeitem") ? ["shift", fldName] : [fldName, "value"]
                const arr_updated = (tblName === "schemeitem") ? ["shift", "updated"] : [fldName, "updated"]
                let value = get_dict_value (update_dict, arr_value);
                is_updated = get_dict_value (update_dict, arr_updated, false);

                if (["offsetstart", "offsetend"].indexOf( fldName ) > -1){
                    display_text = display_offset_time (loc, value);
                } else if (["breakduration", "timeduration"].indexOf( fldName ) > -1){
                    display_text = display_duration (value, loc.user_lang);
                }
                // hard return necessary to display hover or green OK field when it is empty
                if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;

            } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                let date_iso = value
                const date_JS = get_dateJS_from_dateISO(date_iso);
                display_text = format_dateJS_vanilla (loc, date_JS, true, false);

                // hard return necessary to display hover or green OK field when it is empty
                if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;
            } else if (["offsetstart", "offsetend"].indexOf( fldName ) > -1){
                display_text = display_offset_time (loc, value);
                // hard return necessary to display hover or green OK field when it is empty
                if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;
                el_input.title = (value < 0) ? loc.Previous_day_title : (value > 1440) ? loc.Next_day_title : "";
            } else if (["breakduration", "timeduration"].indexOf( fldName ) > -1){
                display_text = display_duration (value, loc.user_lang);
                // hard return necessary to display hover or green OK field when it is empty
                if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;
            } else if (fldName === "isrestshift"){
                const imgsrc = (is_restshift) ? imgsrc_chck01 : imgsrc_stat00;
                const el_img = el_input.children[0];
                if(!!el_img){el_img.setAttribute("src", imgsrc)};
            } else if (fldName === "inactive") {
               if(isEmpty(field_dict)){field_dict = {value: false}}
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
            };

            if(is_updated){
                // put hard return in display_text. Is necessary to display green OK field when it is empty
                ShowOkElement(el_input, "border_bg_valid")
            };


// ---  put '---' in employee field when empty, except for new row
            //if (fldName === "employee"){
            //    const tblRow = get_tablerow_selected(el_input)
           //     const pk_int = get_attr_from_el_int(tblRow, "data-pk")
           //     if(!!pk_int){el_input.value =  "---";}
            //}

        };  // if(!!el_input)
    }  // UpdateField

//========= UpdateSchemeitemOrTeammember  =============
    function UpdateSchemeitemOrTeammember(tblRow, update_dict){
        //console.log("=== UpdateSchemeitemOrTeammember ===");
        //console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        if (!isEmpty(update_dict)) {
// get pk_int and ppk_int from update_dict.id
            const pk_int = get_dict_value (update_dict, ["id", "pk"])
            const ppk_int = get_dict_value (update_dict, ["id", "ppk"])

            let id_dict = get_dict_value (update_dict, ["id"])
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    let tblName = get_dict_value (id_dict, ["table"]);
                    //FillTableRows(tblName, ppk_int)
                    const row_id = tblName + pk_int.toString();
                    let tblRowSelected = document.getElementById(row_id)
                    tblRowSelected.classList.remove("tsa_tr_selected");
                    tblRowSelected.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRowSelected.classList.remove("tsa_tr_ok");
                        tblRowSelected.classList.add(cls_selected);
                    }, 2000);
// --- remove deleted record from list
                } else if ("deleted" in id_dict) {
                    tblRow.parentNode.removeChild(tblRow);

// --- when err: show error message
                } else if ("error" in id_dict){
                    ShowMsgError(tblRow.cells[0], el_msg, id_dict.error, [-160, 80])
                } // if (id_deleted){


            } // if (!!tblRow){
        }  // if (!isEmpty(update_dict))
    }  // UpdateSchemeitemOrTeammember

//=========  UpdateSchemeInputElementsXXX  ================ PR2019-08-07
    function UpdateSchemeInputElementsXXX(item_dict, calledby) {
        //console.log( "===== UpdateSchemeInputElementsXX  ========= ", calledby);
        //console.log(item_dict);

// get temp_pk_str and id_pk from item_dict["id"]
        const pk_int = get_dict_value (item_dict, ["id", "pk"]);
        const ppk_int = get_dict_value (item_dict, ["id", "ppk"]);
        const is_created = get_dict_value (item_dict, ["id", "created"], false);
        const is_deleted = get_dict_value (item_dict, ["id", "deleted"], false);
        const msg_err = get_dict_value (item_dict, ["id", "error"]);
        const is_reset = (!pk_int);

// --- show id_dict error
        if (!!msg_err){
            const el_scheme_code = document.getElementById("id_scheme_code");
            ShowMsgError(el_scheme_code, el_msg, msg_err, [-160, 80])

// --- new created record
        } else if (is_created){
            const el_scheme_code = document.getElementById("id_scheme_code");
            ShowOkElement(el_scheme_code, "border_bg_valid")
        }

        const field_list = ["code", "cycle", "datefirst", "datelast", "excludepublicholiday", "excludecompanyholiday", "divergentonpublicholiday"];
        for(let i = 0, fieldname; fieldname = field_list[i]; i++){
            const field_dict = get_dict_value (item_dict, [fieldname])
            const value = get_dict_value (field_dict, ["value"])
            const updated = get_dict_value (field_dict, ["updated"]);
            const msg_err = get_dict_value (field_dict, ["error"]);

            let el = document.getElementById( "id_scheme_" + fieldname)
// ---  show field_dict error
            if(!!msg_err){
                ShowMsgError(el, el_msg, msg_err, [-160, 80])
            } else if(updated){
// ---  show updated ok
                if(el.type === "checkbox") {
                    // when checkbox: make parent div green imstead of input element
                    let el_parent = el.parentNode;
                    el_parent.classList.add("border_bg_valid");
                    setTimeout(function (){el_parent.classList.remove("border_bg_valid");}, 2000);
                } else {
                    // element must loose focus, otherwise border_bg_valid won't show
                    el.blur()
                    el.classList.add("border_bg_valid");
                    setTimeout(function (){el.classList.remove("border_bg_valid");}, 2000);
                }
            }

// ---  set attribute when value exists, otherwise remove attribute
            add_or_remove_attr(el, "data-value", (!!value), value);
            add_or_remove_attr(el, "data-pk", (!!pk_int), pk_int);
            add_or_remove_attr(el, "data-ppk", (!!ppk_int), ppk_int);
// ---  put value in input boxes
            if (["code", "cycle"].indexOf( fieldname ) > -1){
                const key_str = "value";
                format_text_element (el, key_str, el_msg, field_dict, false, [-220, 60])
                el.readOnly = is_reset;
            } else if (fieldname === "datefirst" || fieldname === "datelast"){
                el.value = value
                el.min = get_dict_value (field_dict, ["mindate"]);
                el.max = get_dict_value (field_dict, ["maxdate"]);
            // in template_mode datefirst and datelast are readOnly
                el.readOnly = (is_reset || is_template_mode);
            } else  if (["excludepublicholiday", "excludecompanyholiday", "divergentonpublicholiday"].indexOf( fieldname ) > -1){
                el.checked = (!!value);
                el.readOnly = is_reset;
            };
        }  // for(let i = 0, fieldname,

// ---  disable delete button when no scheme selected
        document.getElementById("id_menubtn_delete_scheme").disabled = is_reset;

    }  // UpdateSchemeInputElementsXXX


//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//###########################################################################
// +++++++++++++++++ UPDATE MAPS AND TABLEROWS +++++++++++++++++

//=========  FillAbsenceMap  ================ PR2020-08-28
    function FillAbsenceMap(absence_rows) {
       //console.log(" --- FillAbsenceMap  ---");
        //console.log("absence_rows", absence_rows);

        if (absence_rows && absence_rows.length) {
            for (let i = 0, map_dict; map_dict = absence_rows[i]; i++) {
                absence_map.set(map_dict.mapid, map_dict);
            }
        }
        //console.log("absence_map", absence_map);
    };  // FillAbsenceMap

//=========  UpdateAbsenceRowsFromResponseNEW  ================ PR2020-09-10
    function UpdateAbsenceRowsFromResponseNEW(updated_rows) {
        //console.log(" --- UpdateAbsenceRowsFromResponseNEW  ---");
        for (let i = 0, dict; dict = updated_rows[i]; i++) {
            UpdateAbsenceRowFromResponseNEW(dict)
        }
    } // UpdateAbsenceRowsFromResponseNEW

//=========  UpdateAbsenceRowFromResponseNEW  ================ PR2020-08-28 PR2020-09-10
    function UpdateAbsenceRowFromResponseNEW(update_dict) {
       //console.log(" =====  UpdateAbsenceRowFromResponseNEW  =====");
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
    }  // UpdateAbsenceRowFromResponseNEW


//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

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
        //console.log("el_input", el_input);
        // TODO tblRow is to put data-inactive in tblRow for filtering
        if(fldName && el_input && !isEmpty(update_dict)){
            const value = update_dict[fldName];
        //  absence: ["employee", "order", "datefirst", "datelast", "workminutesperday", "delete"],
            if (["o_code", "c_code", "t_code", "e_code", "rpl_code"].indexOf( fldName ) > -1){
                el_input.innerText = (value) ? value : "---";
            } else if (["s_df", "s_dl", "tm_df", "tm_dl"].indexOf( fldName ) > -1){
                const date_formatted = format_dateISO_vanilla (loc, value, true, false);
                 // add linebreak on empty cell, otherwise eventlistener doesn't work
                el_input.innerText = (date_formatted) ? date_formatted : "\n";
            } else if (["sh_os_arr", "sh_oe_arr"].indexOf( fldName ) > -1){
                const offset = (value) ? value[0] : null;
                let display_text = display_offset_time (loc, offset);
                 // hard return necessary to display hover or green OK field when it is empty
                if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;
            } else if (["sh_bd_arr", "sh_td_arr"].indexOf( fldName ) > -1){
                const duration = (value) ? value[0] : 0;
                el_input.innerText = display_duration (duration, loc.user_lang);
             }
        };  // if(!!el_input)
    }  // RefreshFieldNEW

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@


//###########################################################################
// ++++++++++++  MODALS +++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++ MODAL GRID SHIFT ++++++++++++++++++++++++++++++++++++++++++++++++ PR2020-03-16

//=========  MGS_Open  ================  PR2020-03-21
    function MGS_Open(mode, el_input, is_addnew_row) {
        console.log(" ======  MGS_Open  ======= mode: ", mode)
        //console.log("el_input:", el_input)
        // mode = "grid", "datatable"
// ---  reset mod_MGS_dict
        mod_MGS_dict = {};

        const tblRow = get_tablerow_selected(el_input)
        const fldName = get_attr_from_el(el_input, "data-field");
        let shift_pk = get_attr_from_el(tblRow, "data-pk");
        let scheme_pk = get_attr_from_el(tblRow, "data-ppk")

        if (mode === "datatable") {
            if(tblRow){
            }
        } else if (mode === "grid") {
            if(el_input.id === "gridrow_shift_new"){
                id_new = id_new + 1
                shift_pk = "new" + id_new.toString()
                scheme_pk = get_dict_value(grid_dict, ["scheme", "pk"])
            }
        }

        if(!!scheme_pk && shift_pk){

// ---  put map_dict_code in header
            const add_new_mode = MGS_fill_MGS_dict(scheme_pk, shift_pk);

// ---  fill wagefactor select options. t_FillOptionsAbscatFunction is also used for functioncodes
            for (let i = 0, el_select; el_select = wfc_input_select_els[i]; i++) {
                const fldName = get_attr_from_el(el_select, "data-field");
                t_FillOptionsAbscatFunction(loc, "wagefactor", el_select, wagefactor_map, mod_MGS_dict[fldName]);
            };

// ---  display values
            MGS_SetShiftInputboxes();

// ---  show / hide allowance box, wagefactor box
            MGS_AllowanceShow()
            MGS_WfcShow()
            MGS_WfcDiffChange();

// set focus to clicked field, to offsetstart element if no clicked field
            const el_id = (fldName) ?  "id_MGS_" + fldName : "id_MGS_offsetstart";
            let el = document.getElementById(el_id);
            if(!el){el = document.getElementById("id_MGS_offsetstart")}
            if(el){setTimeout(function() {el.focus()}, 150)}

// ---  enable save button
            MGS_BtnSaveDeleteEnable()

// ---  deselect selected team, if any
            //Grid_SelectTeam("MGS_Open")
// ---  show modal
            $("#id_modgrid_shift").modal({backdrop: true});
        }  //  if(!!scheme_pk)
    };  // MGS_Open

//=========  MGS_Save  ================ PR2019-11-23  PR2020-03-21
    function MGS_Save(crud_mode){
        console.log( "===== MGS_Save  ========= ");
        // crud_mode = "save" or "delete"
        const is_delete = (crud_mode === "delete");
        const action = "gridrow_shift_" + crud_mode;
        // use mod_dict, not upload_dict. mode_dict is used in ModConfirmOpen
        mod_dict = {shiftoption: "grid_shift", action: action}

// =========== SAVE SHIFT =====================
        const shift_dict = (mod_MGS_dict.shift) ? mod_MGS_dict.shift : {};
        console.log( "mod_MGS_dict", mod_MGS_dict);
        console.log( "shift_dict", shift_dict);
        if(!isEmpty(shift_dict)){
            const mode = (is_delete) ? "delete" : (shift_dict.mode) ? shift_dict.mode : "update";
            // shiftoption: "grid_shift" is needed in teammember_upload to go to the right function
            mod_dict.shift =  {mode: mode,
                                table: "shift",
                                mapid: "shift_" + shift_dict.id,
                                rowid: "gridrow_shift_" + shift_dict.id,
                                isabsence: false,
                                isrestshift: shift_dict.isrestshift,
                                id: shift_dict.id,
                                s_id: shift_dict.s_id,
                                code: shift_dict.code,

                                offsetstart: shift_dict.offsetstart,
                                offsetend: shift_dict.offsetend,
                                breakduration: shift_dict.breakduration,
                                timeduration: shift_dict.timeduration,

                                wagefactorcode: (shift_dict.wfc_onwd) ? shift_dict.wfc_onwd : null,
                                wagefactoronsat: (shift_dict.wfc_onsat) ? shift_dict.wfc_onsat : null,
                                wagefactoronsun: (shift_dict.wfc_onsun) ? shift_dict.wfc_onsun : null,
                                wagefactoronph: (shift_dict.wfc_onph) ? shift_dict.wfc_onph : null
                                }
        // always upload team, pk needed for teammembers

            if(is_delete){
                // don't make shift row red until clicked on btnSave of ModConfirm
                ModConfirmOpen(action, null)
            } else {
                UploadChanges(mod_dict, url_teammember_upload);
            } // if(is_delete)
        }  // if(!isEmpty(team_dict))
    }  // MGS_Save

//=========  MGS_fill_MGS_dict  ================  PR2020-03-21 PR2021-01-03
    function MGS_fill_MGS_dict(scheme_pk, shift_pk){
        //console.log( " ====  MGS_fill_MGS_dict  ====");
        //console.log( "scheme_pk", scheme_pk,  "shift_pk", shift_pk);
        //console.log( "shift_map", shift_map);

        const map_dict = get_mapdict_from_datamap_by_tblName_pk(shift_map, "shift", shift_pk)
        const add_new_mode = (isEmpty(map_dict));

// --- create mod_MGS_dict with shift
        const shift_dict = (map_dict) ? deepcopy_dict(map_dict) : {};
        shift_dict.mode = (add_new_mode) ? "create" : null;
        if(add_new_mode) {shift_dict.s_id = scheme_pk}
        shift_dict.values_changed = false;

        mod_MGS_dict.shift = shift_dict;

        return add_new_mode
    }  // MGS_fill_MGS_dict

//=========  MGS_ShiftcodeChanged  ================ PR2020-03-22
    function MGS_ShiftcodeChanged(el_input) {
        //console.log( "===== MGS_ShiftcodeChanged  ========= ");
        const new_code = el_input.value;
        if(mod_MGS_dict.shift){
            mod_MGS_dict.shift.code = new_code;
            mod_MGS_dict.shift.values_changed = true;
        }
// ---  enable save button
        MGS_BtnSaveDeleteEnable()
    }; // MGS_ShiftcodeChanged

//=========  MGS_RestshiftClicked  ================ PR2020-03-22 PR2021-01-03
    function MGS_RestshiftClicked(el_input) {
        //console.log( "===== MGS_RestshiftClicked  ========= ");
        //console.log( "mod_MGS_dict: ", mod_MGS_dict);
        if(el_input && mod_MGS_dict.shift){

            const is_restshift = el_input.checked
            const new_shift_code = f_create_shift_code( loc,
                                                    mod_MGS_dict.shift.offsetstart,
                                                    mod_MGS_dict.shift.offsetend,
                                                    mod_MGS_dict.shift.timeduration,
                                                    mod_MGS_dict.shift.code,
                                                    is_restshift);
            mod_MGS_dict.shift.code = new_shift_code;
            mod_MGS_dict.shift.isrestshift = el_input.checked;
            mod_MGS_dict.shift.values_changed = true;

            MGS_SetShiftInputboxes();
        }
// ---  enable save button
        MGS_BtnSaveDeleteEnable()
    }; // MGS_RestshiftClicked

//=========  MGS_TimepickerOpen  ================ PR2020-03-21  PR2021-01-03
    function MGS_TimepickerOpen(el_input, calledby) {
        //console.log("=== MGS_TimepickerOpen ===", calledby);
        //console.log("el_input", el_input);
        //console.log("mod_MGS_dict", mod_MGS_dict);

// ---  create tp_dict
        const fldName = get_attr_from_el(el_input, "data-field");
        const rosterdate = null; // keep rosterdate = null, to show 'current day' insteaa of Dec 1
        const cur_offset = mod_MGS_dict.shift[fldName];
        const is_ampm = (loc.timeformat === "AmPm")

        const is_absence = false;
        const minmax_offset = mtp_calc_minmax_offset_values(
            fldName, mod_MGS_dict.shift.offsetstart, mod_MGS_dict.shift.offsetend,
            mod_MGS_dict.shift.breakduration, mod_MGS_dict.shift.timeduration, is_absence);

        //console.log("minmax_offset", minmax_offset);
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
        //if(!!weekday){tp_dict['weekday'] = weekday}

        //console.log("tp_dict", tp_dict);

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
        //console.log("st_dict", st_dict);
        mtp_TimepickerOpen(loc, el_input, MGS_TimepickerResponse, tp_dict, st_dict)
    };  // MGS_TimepickerOpen

//========= MGS_TimepickerResponse  ============= PR2019-10-12
    function MGS_TimepickerResponse(tp_dict) {
       //console.log(" === MGS_TimepickerResponse ===" );
       //console.log("tp_dict", tp_dict);
       //console.log("mod_MGS_dict", mod_MGS_dict);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {is_quicksave = tp_dict["quicksave"]};
        //console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = tp_dict.field;

    // ---  get current values from mod_dict.shift
            let shift_code = mod_MGS_dict.shift.code;
            let offset_start = mod_MGS_dict.shift.offsetstart;
            let offset_end = mod_MGS_dict.shift.offsetend;
            let break_duration = mod_MGS_dict.shift.breakduration;
            let time_duration = mod_MGS_dict.shift.timeduration;
            let is_restshift = mod_MGS_dict.shift.isrestshift;

     // ---  get new value from tp_dict
            const new_offset = get_dict_value(tp_dict, ["offset"])
           //console.log( "offset_start: ", offset_start);
           //console.log( "new_offset: ", new_offset);

    // ---  put new value in variable
            if (fldName === "offsetstart") {
                offset_start = new_offset
            } else if (fldName === "offsetend") {
                offset_end = new_offset
            } else if (fldName === "breakduration") {
                break_duration = new_offset
            }

            if(fldName === "timeduration"){
                time_duration = new_offset
                if(!!time_duration){
                    offset_start = null;
                    offset_end = null;
                    break_duration = 0
                }
            } else {
                time_duration = (offset_start != null && offset_end != null) ? offset_end - offset_start - break_duration : 0;
            }

            console.log( "shift_code: ", shift_code);
            const new_shift_code = f_create_shift_code(loc, offset_start, offset_end, time_duration, shift_code);
            mod_MGS_dict.shift.code = new_shift_code
            mod_MGS_dict.shift.offsetstart = offset_start;
            mod_MGS_dict.shift.offsetend = offset_end;
            mod_MGS_dict.shift.breakduration = break_duration;
            mod_MGS_dict.shift.timeduration = time_duration;

            mod_MGS_dict.shift.values_changed = true;

           //console.log( "new_shift_code: ", new_shift_code);
            //const is_absence = false;
            //mtp_calc_minmax_offset(mod_MGS_dict.shift, is_absence)

// ---  display offset, selected values are shown because they are added to mod_MGS_dict
            MGS_SetShiftInputboxes();

// ---  enable save button
            MGS_BtnSaveDeleteEnable()

// set focus to next element
            const next_el_id = (fldName === "offsetstart") ? "id_MGS_offsetend" : "id_MGS_btn_save";
            setTimeout(function() { document.getElementById(next_el_id).focus()}, 50);

        }  // if("save_changes" in tp_dict) {
     }  //MGS_TimepickerResponse

//========= MGS_AllowanceShow  ============= PR2021-01-28
    function MGS_AllowanceShow() {
        console.log( "=== MGS_AllowanceShow ");

        const is_hidden = el_allowance_container.classList.contains("display_hide")
        add_or_remove_class(el_allowance_container, "display_hide", !is_hidden)
        const caption =  (is_hidden) ? loc.Allowances : loc.Show_allowances;
        el_allowance_header.innerHTML = caption.bold();
    };  //  MGS_AllowanceShow

//========= MGS_WfcShow  ============= PR2021-01-28
    function MGS_WfcShow(el_header) {
        console.log( "=== MGS_WfcShow ");
        console.log( "el_header", el_header);

        let show_wfc = false;
        if(el_header){
// ---  when clicked on header: toggle display_hide
            show_wfc = el_wfc_container.classList.contains("display_hide");
        } else {
// ---  when opening MGS form, el_header is undefined: show wagefactors when there are non-null wagefactor fields
            show_wfc = el_wfc_container.classList.contains("display_hide");
            show_wfc = !!(mod_MGS_dict.shift.wfc_onwd || mod_MGS_dict.shift.wfc_onsat ||
            mod_MGS_dict.shift.wfc_onsun || mod_MGS_dict.shift.wfc_onph);
        }
        console.log( "show_wfc", show_wfc);
// ---  if not show_wfc: hide container with wfc input boxes and container with checkbox
        add_or_remove_class(el_wfc_container, "display_hide", !show_wfc)
        add_or_remove_class(el_wfc_checkbox_container, "display_hide", !show_wfc)
// ---  change caption of wfc_header
        const caption =  (show_wfc) ? loc.Wage_component : loc.Show_wage_component;
        el_wfc_header.innerHTML = caption.bold()
    };  //  MGS_WfcShow

//========= MGS_WfcDiffChange  ============= PR2021-01-28

    function MGS_WfcDiffChange(el_clicked) {
        console.log(" -----  MGS_WfcDiffChange   ----")
        // if called by MGS_Open: el_clicked = undefined > set checked=true when any of dthe diff fields contain value
        // else: called by checkbox el_wfc_checkbox_diff: get value from checkbox

        let checked = false;
        if (el_clicked){
            checked = el_clicked.checked;
            if (!checked){
                // set value of onsat, unsun, onph to null when el_wfc_checkbox_diff is set to 'false'
                const els = el_wfc_container.querySelectorAll(".tsa_input_select")
                for (let i = 0, el; el = els[i]; i++) {
                    // skip wfc 'Weekdays'
                    const fldName =  get_attr_from_el(el, "data-field");
                    if (fldName !== "wfc_onwd") { el.value = null};
                    // also reset values in mod_MGS_dict
                    mod_MGS_dict.shift.wfc_onsat = null;
                    mod_MGS_dict.shift.wfc_onsun = null;
                    mod_MGS_dict.shift.wfc_onph = null;
                }
            }
        } else {
            // called by MGS_Open: el_clicked = undefined
            checked = mod_MGS_dict.shift.wfc_onsat || mod_MGS_dict.shift.wfc_onsun || mod_MGS_dict.shift.wfc_onph;
            // set checkbox checked
            el_wfc_checkbox_diff.checked = checked
        }
        // hide label 'Weekdays' when checked = false;
        add_or_remove_class(el_wfc_onwd_label, "display_hide", !checked)

        // hide checkboxes onsat, unsun, onph  when checked = false;
        const els = el_wfc_container.querySelectorAll(".wfc_satsunph")
        for (let i = 0, el; el = els[i]; i++) {
            add_or_remove_class(el, "display_hide", !checked)
        }
    } //  MGS_WfcDiffChange

//========= MGS_WfcInputChange  ============= R2021-02-15
    function MGS_WfcInputChange(el) {
        console.log( "=== MGS_WfcInputChange ");
        const fldName = get_attr_from_el(el, "data-field");
        console.log( "fldName.value", fldName);
        console.log( "el.value", el.value);
        const pk_int = (Number(el.value)) ? Number(el.value) : null;
        if(fldName) {
            mod_MGS_dict.shift[fldName] = pk_int
            mod_MGS_dict.shift.values_changed = true;
// ---  enable save button
            MGS_BtnSaveDeleteEnable()
        }
        console.log( "mod_MGS_dict", mod_MGS_dict);

    }  // MGS_WfcInputChange

//========= MGS_SetShiftInputboxes  ============= PR2019-12-07 PR2021-01-03
    function MGS_SetShiftInputboxes() {
        //console.log( "=== MGS_SetShiftInputboxes ");
        //console.log( "mod_MGS_dict", mod_MGS_dict);

    // ---  display values

        let code_display = (mod_MGS_dict.shift.code) ? mod_MGS_dict.shift.code : '';
        if(!!mod_MGS_dict.shift.isrestshift){ code_display += " (R)" }

        el_MGS_header.innerText = loc.Shift + ": " + code_display ;
        el_MGS_shiftcode.value = code_display;

        el_MGS_offsetstart.innerText = display_offset_time (loc, mod_MGS_dict.shift.offsetstart, false, false);
        el_MGS_offsetend.innerText = display_offset_time (loc, mod_MGS_dict.shift.offsetend, false, false);
        el_MGS_breakduration.innerText = display_duration (mod_MGS_dict.shift.breakduration, loc.user_lang);
        el_MGS_timeduration.innerText = display_duration (mod_MGS_dict.shift.timeduration, loc.user_lang);

        el_MGS_restshift.checked = mod_MGS_dict.shift.isrestshift;

console.log("wfc_input_select_els", wfc_input_select_els)
        for (let i = 0, el; el = wfc_input_select_els[i]; i++) {
            const fldName = get_attr_from_el(el, "data-field")
console.log("fldName", fldName)
console.log("mod_MGS_dict.shift[fldName]", mod_MGS_dict.shift[fldName])
            el.value =( mod_MGS_dict.shift[fldName]) ? mod_MGS_dict.shift[fldName] : null;
        };

// ---  display modified_by
        el_MGS_modifiedby.innerText = display_modifiedby(loc, mod_MGS_dict.shift.modat, mod_MGS_dict.shift.modby_usr);

    }  // MGS_SetShiftInputboxes


//=========  MGS_BtnSaveDeleteEnable  ================ PR2020-03-22
    function MGS_BtnSaveDeleteEnable(){
        //console.log( "MGS_BtnSaveDeleteEnable");
        //console.log( mod_MGS_dict);

        el_MGS_btn_save.disabled = (!selected.scheme_pk || !mod_MGS_dict.shift.values_changed);

        const shift_mode = mod_MGS_dict.shift.mode;
        const btn_delete_hidden = (!selected.scheme_pk || shift_mode === "create");
        add_or_remove_class (el_MGS_btn_delete, cls_hide, btn_delete_hidden) // args: el, classname, is_add
    }  // MGS_BtnSaveDeleteEnable


// ################################## MODAL GRID TEAM ################################## PR2020-03-16

//=========  MGT_Open  ================  PR2020-03-16 PR2020-05-27 PR2021-01-05
    function MGT_Open(mode, el_input) {
        console.log(" ======  MGT_Open  =======")
        console.log("mode", mode)

// ---  get scheme_pk and team_pk from el_input
        let scheme_pk = null, team_pk = null;
        if (mode === "datatable") {
            const tblRow = get_tablerow_selected(el_input)
            scheme_pk = get_attr_from_el_int(tblRow, "data-scheme_pk")
            team_pk = get_attr_from_el(tblRow, "data-ppk")
        } else if (mode === "grid") {
            scheme_pk = get_attr_from_el_int(el_input, "data-scheme_pk")
            team_pk = get_attr_from_el(el_input, "data-team_pk")
        }

// --- reset and fill mod_MGT_dict, get is_add_new_mode = isEmpty(team_mapdict)
        const is_add_new_mode = MGT_fill_MGT_dict(scheme_pk, team_pk);

        if(scheme_pk && team_pk){
// ---  put team_code in input element
            const team_code = get_dict_value(mod_MGT_dict, ["team", "code"])
            el_MGT_teamcode.value = team_code;
// ---  put team_code in header
            const header_text = (!!team_code) ? team_code : loc.Team + ":";
            document.getElementById("id_MGT_header").innerText = header_text;

// ---  display modified_by
            const modat = get_dict_value(mod_MGT_dict, ["team", "modat"])
            const modby_usr = get_dict_value(mod_MGT_dict, ["team", "modby_usr"])
            el_MGT_modifiedby.innerText = display_modifiedby(loc, modat, modby_usr);

// ---  fill table teammembers
            MGT_CreateTblTeammemberHeader();
            MGT_CreateTblTeammemberFooter()
            MGT_FillTableTeammember(team_pk);

// add 1 new teammember when is_add_new_mode
            if(is_add_new_mode)(MGT_AddTeammember());
// ---  enable save button
            MGT_BtnSaveDeleteEnable()
// ---  deselect selected team, if any
            Grid_SelectTeam("MGT_Open")
// ---  show modal
            $("#id_modgrid_team").modal({backdrop: true});
        }  //  if(!!scheme_pk)
console.log("mod_MGT_dict", deepcopy_dict(mod_MGT_dict));
    };  // MGT_Open

//=========  MGT_fill_MGT_dict  ================  PR2020-03-19 PR2021-01-05
    function MGT_fill_MGT_dict(scheme_pk, team_pk){
        console.log( "MGT_fill_MGT_dict");
        // only called by MGT_Open

// ---  get grid_team_dict from grid_teams_dict
        // grid_team_dict contains key 'team' and list of teammember_pks
        // key 'team' only contains keys: col, rowid and code:
        // grid_team_dict = {team: {col: 1, rowid: "team_new2", code: "< nieuwe ploeg >" }, 1597: {...} }

        const grid_team_dict = (grid_teams_dict[team_pk]) ? grid_teams_dict[team_pk] : {};
        const col_index = get_dict_value(grid_team_dict, ["team", "col"])

        /*
        // grid_teams_dict: {
        //      <team:> 2557: { team: {col: 2, rowid: "team_2557", code: "Ploeg C"}
                <teammembers:>  1597: {row: 2, row_id: "tm_1597", display: "chris"}
                                1598: {row: 3, row_id: "tm_1598", display: "ert"}
                       		1599: {row: 4, row_id: "tm_1599", display: "ik"}
						}
        */

        let add_new_mode = false;

// ---  reset mod_MGT_dict
        mod_MGT_dict = {};

// +++ create team_dict with all information of team_mapdict
        if(scheme_pk && team_pk){
            const team_mapdict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk)
            if(!isEmpty(team_mapdict)){
                mod_MGT_dict.team = deepcopy_dict(team_mapdict);
                mod_MGT_dict.team.col = col_index;
            } else {
                add_new_mode = true;
                mod_MGT_dict.update = true;
                // add values_changed. Value = true when add_new_mode because team_dict.code has changed
                mod_MGT_dict.team = {create: true, values_changed: true,
                                    id: team_pk,  s_id: scheme_pk,
                                    code: get_teamcode_with_sequence_from_map(loc, team_map, scheme_pk),
                                    col: col_index
                                    };
            }

       console.log( "grid_team_dict", grid_team_dict);

// +++ loop through teammember list of this team - using grid_teams_dict
            //for (const [key, tm_dict] of Object.entries(grid_team_dict)) {
            for (const key of Object.keys(grid_team_dict)) {
       console.log( "key", key);
                const teammember_pk = Number(key);
       console.log( "teammember_pk", teammember_pk);
                if(!!teammember_pk){
                    MGT_create_modMGT_tm_dict(teammember_pk);
                }
            }  // for (let key in grid_team_dict) {
        }  //  if(scheme_pk && team_pk){
        return add_new_mode
    }  // MGT_fill_MGT_dict

// ===== MGT_create_modMGT_tm_dict ===== PR2020-04-18
    function MGT_create_modMGT_tm_dict(teammember_pk, tm_ppk_str){
        console.log( ">>>>> ===== MGT_create_modMGT_tm_dict =====");
        console.log( "mod_MGT_dict", mod_MGT_dict);
        console.log( "teammember_pk", teammember_pk);
        if(teammember_pk){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk);
       console.log( "map_dict", map_dict);
            if(isEmpty(map_dict)){
// create empty teammember_dict with ppk and create=true
                mod_MGT_dict[teammember_pk] = {
                    pk: teammember_pk,
                    ppk: tm_ppk_str,
                    table: "teammember",
                    create: true,
                    employee: {},
                    replacement: {},
                    datefirst: null,
                    datelast: null,
                    o_s_datemin: null,
                    o_s_datemax:null }
            } else {
// create teammember_dict in mod_MGT_dict
                mod_MGT_dict[teammember_pk] = {
                    pk: map_dict.id,
                    ppk:  map_dict.t_id,
                    table: "teammember",
                    employee: {pk: map_dict.e_id, code: (map_dict.e_code) ? map_dict.e_code : "---"},
                    replacement: {pk: map_dict.r_id, code: (map_dict.r_code) ? map_dict.r_code : "---"},
                    datefirst: map_dict.tm_df,
                    datelast: map_dict.tm_dl,
                    o_s_datemin: map_dict.o_s_datemin,
                    o_s_datemax: map_dict.o_s_datemax
                }
            }
        };
    }  // MGT_create_modMGT_tm_dict

//=========  MGT_Save  ================  PR2019-11-23 PR2021-01-05
    function MGT_Save(crud_mode){
        console.log( "===== MGT_Save  ========= ");
        // crud_mode = "save" or "delete"
        const is_delete = (crud_mode === "delete");
        const shiftoption = "grid_team"
        // use mod_dict, not upload_dict. mode_dict is used in ModConfirmOpen
        mod_dict = {shiftoption: shiftoption}

// =========== SAVE TEAM =====================
        const team_dict = (mod_MGT_dict.team) ? mod_MGT_dict.team : {};
        console.log( "team_dict", deepcopy_dict(team_dict));
        if(!isEmpty(team_dict)){
        // always upload team, pk needed for teammembers
            const mode = (is_delete) ? "delete" : (team_dict.create) ? "create" : null;
            // shiftoption: "grid_team" is needed in teammember_upload to go to the right function
            mod_dict.team =  {mode: mode,
                                table: "team",
                                mapid: "team_" + team_dict.id,
                                rowid: "gridrow_team_" + team_dict.id,
                                id: team_dict.id,
                                s_id: team_dict.s_id,
                                code: team_dict.code,
                                col: team_dict.col,
                                }
            console.log( "mod_dict", deepcopy_dict(mod_dict));
            if(is_delete){
               // don't make team red until clicked on btnSave of ModConfirm
                ModConfirmOpen(shiftoption, null)
            } else {

// =========== SAVE TEAMMEMBERS =====================
    // --- loop through teammember list of this team - using mod_MGT_dict
    // format:  mod_dict: {teammembers_dict: {1094: {id: {pk: 1094, ppk: 2132, table: 'teammember, mode: 'delete', shiftoption: None},
                                                        // datefirst: '2020-03-24', datelast: '2020-03-26',
                                                        // employee: {pk: 2613}, replacement: {pk: 2617}},
                                              // new3: {id: {pk: 'new3', ppk: 2132, table: 'teammember', mode: 'create', shiftoption: None},
                                                        // 'datefirst': None, 'datelast': None,
                                                        // employee: {pk: 2778}, replacement: {pk: None}}},

console.log("mod_MGT_dict: ", deepcopy_dict(mod_MGT_dict))
                let teammembers_list = [];
                for (const [key, tm_dict] of Object.entries(mod_MGT_dict)) {
                    // keys in mod_MGT_dict are: mode, team and tm_pk's
                    // use constructor == Object to filter out non-dict values in mod_MGT_dict
                    // PR2021-01-07 from https://stackoverflow.com/questions/38304401/javascript-check-if-dictionary
                    if(tm_dict && key !== "team" && tm_dict.constructor == Object){
                        // add only teammembers with mode 'create, 'delete' or 'update'
                        if(tm_dict.create || tm_dict.delete || tm_dict.update){
                            tm_dict.mode = (tm_dict.delete) ? "delete" : (tm_dict.create) ? "create" : "update";
                            teammembers_list.push(tm_dict);
                        }
                    }
                }
                if(teammembers_list.length){
                    mod_dict.teammembers_list = teammembers_list;
                }

                UploadChanges(mod_dict, url_teammember_upload);
            } // if(is_delete)
        }  // if(!isEmpty(team_dict))
    }  // MGT_Save

//=========  MGT_CreateTblTeammemberHeader  === PR2020-03-16
    function MGT_CreateTblTeammemberHeader() {
        //console.log("===  MGT_CreateTblTeammemberHeader == ");
        let tblHead = document.getElementById("id_MGT_thead_teammember");
        tblHead.innerText = null
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        const col_count = field_settings.MGTteammember.tbl_col_count;
        // in field_settings col=0 contains team. Skip this column in MGT. Start at j=1
        for (let j = 1; j < col_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
    // --- add innerText to th
                const data_text = loc[field_settings.MGTteammember.field_caption[j]];
                if(data_text) el_div.innerText = data_text;
    // --- add margin to first column
                if (j === 1 ){el_div.classList.add("ml-2")}
    // --- add width to el
                el_div.classList.add("tw_" + field_settings.MGTteammember.field_width[j])
    // --- add text_align
                el_div.classList.add("ta_" + field_settings.MGTteammember.field_align[j])
            th.appendChild(el_div)
        }  // for (let j = 0; j < column_count; j++)
    };  // MGT_CreateTblTeammemberHeader

//=========  MGT_CreateTblTeammemberFooter  === PR2019-11-26
    function MGT_CreateTblTeammemberFooter(){
        //console.log("===  MGT_CreateTblTeammemberFooter == ");

        let tblFoot = document.getElementById("id_MGT_tfoot_teammember");
        tblFoot.innerText = null;

        let tblRow = tblFoot.insertRow(-1);
        // in field_settings col=0 contains team. Skip this column in MGT. Start at j=1
        for (let j = 1; j < field_settings.MGTteammember.tbl_col_count; j++) {
            let td = tblRow.insertCell(-1);
            if(j === 1){
// --- create element with tag from field_tags
                let el = document.createElement("p");
                el.setAttribute("tabindex", "0")
                el.classList.add("pointer_show")
                el.classList.add("tsa_color_darkgrey")
                el.classList.add("ml-2")

                el.innerText = loc.Add_employee + "..."
// --- add EventListener to td
                el.addEventListener("click", function() {MGT_AddTeammember()}, false);
                td.appendChild(el);
            }
        }
    };  // MGT_CreateTblTeammemberFooter

//========= MGT_FillTableTeammember  ====================================
    function MGT_FillTableTeammember(team_pk){
       //console.log( "===== MGT_FillTableTeammember  ========= ");

        /*
        format of tm_dict is :
            { pk: 11, ppk: 20, table: "teammember",
            employee: {pk: 7, code: "Giterson, Lisette"},
            datefirst: "2021-01-04", datelast: "2021-01-11",
            o_s_datemax: "2021-01-31", o_s_datemin: "2021-01-01",
            replacement: {pk: 8, code: "Gomes Bravio, Natasha",
            delete: true}
        */

// --- reset tblBody
        let tblBody = document.getElementById("id_MGT_tbody_teammember");
        tblBody.innerText = null;

// --- loop through teammember list of this team - using mod_MGT_dict
        for (const [key, tm_dict] of Object.entries(mod_MGT_dict)) {
            // use constructor == Object to filter out non-dict values in mod_MGT_dict
            // PR20221-01-07 from https://stackoverflow.com/questions/38304401/javascript-check-if-dictionary
            if(key !== "team" && tm_dict.constructor == Object){
// skip rows that have mode = "delete" in tm_dict
                if(!tm_dict.delete){
                    // no need to filter on selected.team_pk: mod_MGT_dict only contains tm_pk's of this team
                    let tblRow = MGT_TblTeammember_CreateRow(tblBody, tm_dict);
                    MGT_TblTeammember_UpdateRow(tblRow, tm_dict);
                }
            };
        }
    }  // MGT_FillTableTeammember

//=========  MGT_TblTeammember_CreateRow  ================ PR2019-09-04
    function MGT_TblTeammember_CreateRow(tblBody, tm_dict ){
        //console.log("--- MGT_TblTeammember_CreateRow  --------------");
        //console.log("tm_dict", deepcopy_dict(tm_dict));
        // tm_dict = { mode: "create", pk: "new3", ppk: 18, table: "teammember" }

        const tblName = "teammember";
        // pk_str and ppk_str can be 'new3
        const pk_str = (tm_dict.pk) ? tm_dict.pk : null;
        const ppk_str = (tm_dict.ppk) ? tm_dict.ppk : null;
        const map_id = get_map_id(tblName, pk_str)

// --- insert tblRow into tblBody or tfoot
        let tblRow = tblBody.insertRow(-1);

        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_str);
        tblRow.setAttribute("data-ppk", ppk_str);
        tblRow.setAttribute("data-table", tblName);
        tblRow.setAttribute("data-isgrid", true);

//+++ insert td's into tblRow
        const column_count = field_settings.MGTteammember.tbl_col_count
        // in field_settings col=0 contains team. Skip this column in MGT. Start at j=1
        for (let j = 1; j < column_count; j++) {
            let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
            let el = document.createElement( field_settings.MGTteammember.field_tags[j] );
// --- add data-field Attribute.
            el.setAttribute("data-field", field_settings.MGTteammember.field_names[j]);
// --- add img delete to col_delete
            if (j === column_count - 1) {
                CreateBtnDeleteInactive("delete", true, tblRow, el);
            } else {

// --- add type and input_text to el.
                //el.classList.add("input_text");

// --- add EventListeners to td
                if ([1, 4].indexOf( j ) > -1){
                    el.setAttribute("type", "text")
                    el.addEventListener("click", function() { MSE_open(el)}, false);
                    el.classList.add("pointer_show");
                } else if ([2, 3].indexOf( j ) > -1){
                    el.setAttribute("type", "date")
                    el.addEventListener("change", function() {MGT_TeammemberDateChanged(el)}, false);
                };
// --- add margin to first column
                if (j === 1 ){el.classList.add("ml-2")}
            }
// --- add width to el - not necessary, tblhead has width
           // el.classList.add("tw_" + field_settings.MGTteammember.field_width[j])
// --- add text_align
            el.classList.add("ta_" + field_settings.MGTteammember.field_align[j])
// --- add other classes to td
            el.classList.add("border_none");
            //el.setAttribute("autocomplete", "off");
            //el.setAttribute("ondragstart", "return false;");
            //el.setAttribute("ondrop", "return false;");
            td.appendChild(el);
        }
        return tblRow
    };// MGT_TblTeammember_CreateRow

//========= MGT_TblTeammember_UpdateRow  =============
    function MGT_TblTeammember_UpdateRow(tblRow, tm_dict){
       console.log("--- MGT_TblTeammember_UpdateRow  --------------");
       //console.log("tblRow", tblRow);
       console.log("tm_dict", tm_dict);

        if (!!tblRow && !isEmpty(tm_dict)) {
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
                        const pk_str = get_attr_from_el(el_input, "data-pk")
                        const code = get_attr_from_el(el_input, "data-code")

                        if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                            el_input.value = get_dict_value(tm_dict, [fldName]);
                            // TODO use o_s_datemin / max in teammember_rows
                            let min_date = (tm_dict.o_s_datemin) ? tm_dict.o_s_datemin : null;
                            let max_date = (tm_dict.o_s_datemax) ? tm_dict.o_s_datemax : null;
                            if(fldName === "datefirst"){
                                if(!!tm_dict.datelast){
                                    if ( (!max_date) || (!!max_date && tm_dict.datelast < max_date)) {
                                        max_date = tm_dict.datelast
                                }}
                            } else {
                                if(!!tm_dict.datefirst){
                                    if ( (!min_date) || (!!min_date && tm_dict.datefirst > min_date)) {
                                        min_date = tm_dict.datefirst
                                }}
                            }
                            el_input.min = min_date;
                            el_input.max = max_date;

                        } else if (["employee", "replacement"].indexOf( fldName ) > -1){
                            el_input.innerText = get_dict_value(tm_dict, [fldName, "code"], "---");
                        }
                    }
                }
            }
        };
    }  // function MGT_TblTeammember_UpdateRow

//========= MGT_AddTeammember  ============= PR2020-03-19 PR2021-01-05
    function MGT_AddTeammember() {
        console.log( " ==== MGT_AddTeammember ====");
        // function is called when clicked on footer 'New teammember or when is_add_new_mode
        const team_pk = get_dict_value(mod_MGT_dict, ["team", "id"]);
        if(team_pk){
// ---  create new pk_str
            id_new = id_new + 1
            const pk_str = "new" + id_new.toString()
// ---  createnew tm_dict in mod_MGT_dict
            mod_MGT_dict[pk_str] = {
                pk: pk_str,
                    ppk: team_pk,
                    table: "teammember",
                    create: true};
             mod_MGT_dict.update = true;

            MGT_BtnSaveDeleteEnable();
            MGT_FillTableTeammember(team_pk)
        }
        console.log( "mod_MGT_dict: " , deepcopy_dict(mod_MGT_dict));
    }  // MGT_AddTeammember

//========= MGT_DeleteTeammember  ============= PR2020-03-19
    function MGT_DeleteTeammember(tblRow) {
        console.log( " ==== MGT_DeleteTeammember ====");
        console.log( "tblRow", tblRow);

        const teammember_pk = get_attr_from_el(tblRow, "data-pk", 0);
        const team_pk = get_attr_from_el(tblRow, "data-ppk", 0);

        console.log( "teammember_pk", teammember_pk);
        console.log( "team_pk", team_pk);
        let teammember_dict = mod_MGT_dict[teammember_pk]
        if(teammember_dict) {
            teammember_dict.delete = true;
        }
        mod_MGT_dict.update = true;
        console.log( "mod_MGT_dict", mod_MGT_dict);

        MGT_BtnSaveDeleteEnable();

        MGT_FillTableTeammember(team_pk)
    }  // MGT_DeleteTeammember

//========= MGT_BtnDeleteClicked  ============= PR2019-09-23
    function MGT_BtnDeleteClicked(el_input) {
       //console.log( " ==== MGT_BtnDeleteClicked ====");
        // when clicked on delete button in table teammembers of MGT
       //console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const sel_teammember_pk = get_attr_from_el(tblRow, "data-pk");
            //console.log("sel_teammember_pk: ", sel_teammember_pk);

    // --- lookup teammember_dict in mod_dict.teammembers_list
            let index = -1, dict = {};

            const len = mod_dict.teammembers_list.length;
            if(!!len){
                for (let i = 0; i < len; i++) {
                    dict = mod_dict.teammembers_list[i];
                    if(!!dict){
                        const pk_int = get_dict_value(dict, ["id", "pk"]);
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
            }
            //console.log("index: ", index);
            if (index >= 0) {
            // if sel_teammember_pk = NaN, the row is an added row. Just remove it from the .teammembers_list

                if(Number.isNaN(sel_teammember_pk)){
                    // Array.splice( index, remove_count, item_list ) modifies an array by removing existing elements and/or adding new elements.
                    mod_dict.teammembers_list.splice(index, 1);
                } else {
            // if sel_teammember_pk is numeric, the row is a saved row. Put 'delete in id_dict for deletion
                    dict["id"]["mode"] = "delete";
                    //console.log("dict): ", dict);
                }
            }
           //console.log("mod_dict.teammembers_list: ");
           //console.log(mod_dict.teammembers_list);

            MGT_FillTableTeammember();

        }  // if(!!tblRow)
    }  // MGT_BtnDeleteClicked

//=========  MGT_TeammemberDateChanged  ================ PR2020-03-19
    function MGT_TeammemberDateChanged(el_input) {
       console.log( "===== MGT_TeammemberDateChanged  ========= ");

// --- get info from el_input
        const tblRow = get_tablerow_selected(el_input);
        const teammember_pk = get_attr_from_el(tblRow, "data-pk");
        const fldName = get_attr_from_el_str(el_input, "data-field")
        const new_date = el_input.value;

// --- update value in teammember_dict inmod_MGT_dict
        const tm_dict = mod_MGT_dict[teammember_pk];
        if(tm_dict) {
            tm_dict[fldName] = new_date;
            tm_dict.update = true;
        }
        mod_MGT_dict.update = true;

// --- get min/max date of order and scheme from teammember_dict in mod_MGT_dict
        let min_date = (tm_dict && tm_dict.o_s_datemin) ? tm_dict.o_s_datemin : null;
        let max_date = (tm_dict && tm_dict.o_s_datemax) ? tm_dict.o_s_datemax : null;

// ---  get date from other date field
        const other_fldName = (fldName === "datefirst")  ? "datelast" : "datefirst";
        const el_other = tblRow.querySelector("[data-field=" + other_fldName + "]");

// ---  calculate new min max of other date field, replace min/max with this one if  greater / less
        if(!!new_date){
            if(other_fldName === "datefirst"){
                if ( (!max_date) || (!!max_date && new_date < max_date)) {
                    max_date = new_date
                }
            } else {
                if ( (!min_date) || (!!min_date && new_date > min_date)) {
                    min_date = new_date
                }
            }
        }
        el_other.min = min_date
        el_other.max = max_date

        MGT_BtnSaveDeleteEnable();

    }; // MGT_TeammemberDateChanged


//=========  MGT_TeamAdd  ================ PR2020-03-18
    function MGT_TeamAdd() {
       //console.log( "===== MGT_TeamAdd  ========= ");

        id_new += 1;
        const pk_new = "new" + id_new.toString()

        const team_code = get_teamcode_with_sequence_from_map(loc, team_map, selected.scheme_pk);

        el_MGT_teamcode.value = team_code
        mod_MGT_dict.team = {id: {temp_pk: pk_new, ppk: selected.scheme_pk, table : "team", create: true}, code: { value: team_code}}

// ---  put team_code in header
        const header_text = (!!team_code) ? team_code : loc.Team + ":";
        document.getElementById("id_MGT_header").innerText = header_text;

// --- reset tblBody
        let tblBody = document.getElementById("id_MGT_tbody_teammember");
        tblBody.innerText = null;
// ---  create one teammember_row
        //let tblRow = MGT_TblTeammember_CreateRow(tblBody, teammember_dict);
        //MGT_TblTeammember_UpdateRow(tblRow, teammember_dict);





       //console.log( "mod_MGT_dict: ", mod_MGT_dict);

// ---  enable save button
        MGT_BtnSaveDeleteEnable()
    }; // MGT_TeamAdd


//=========  MGT_TeamcodeChanged  ================ PR2020-03-18
    function MGT_TeamcodeChanged(el_input) {
        console.log( "===== MGT_TeamcodeChanged  ========= ");
        const field ="code"
        const new_code = el_input.value;

        const MGT_team_dict = mod_MGT_dict.team;
// mod_MGT_dict: { team: {mode: "create", s_id: 2, code: "Ploeg A", values_changed: true} }
        if(MGT_team_dict){
            MGT_team_dict.code = new_code;
            MGT_team_dict.values_changed = true;
        }
        console.log( "mod_MGT_dict", deepcopy_dict(mod_MGT_dict));
// ---  enable save button
        MGT_BtnSaveDeleteEnable()
    }; // MGT_TeamcodeChanged


//=========  MGT_BtnSaveDeleteEnable  ================ PR2020-03-20
    function MGT_BtnSaveDeleteEnable(){
        console.log( "MGT_BtnSaveDeleteEnable");
        console.log( "mod_MGT_dict", mod_MGT_dict);
        console.log( "mod_MGT_dict.update", mod_MGT_dict.update);

        el_MGT_btn_save.disabled = !mod_MGT_dict.update;

        const team_mode = get_dict_value(mod_MGT_dict, ["team", "mode"])
        const btn_delete_hidden = (!selected.scheme_pk || team_mode === "create");
        console.log( "team_mode", team_mode);
        console.log( "btn_delete_hidden", btn_delete_hidden);
        add_or_remove_class (el_MGT_btn_delete, cls_hide, btn_delete_hidden) // args: el, classname, is_add
    }  // MGT_BtnSaveDeleteEnable


// +++++++++ MOD CONFIRM DELETE TABLEROW ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmTblrowOpen  ======= R2020-08-28
    function ModConfirmTblrowOpen(mode, tblName, el_input) {
       //console.log(" -----  ModConfirmTblrowOpen   ----")
       //console.log("mode", mode, "tblName", tblName)
        // values of mode are : "delete", "inactive"
        // called by submenu btn 'delete', then tblName = 'scheme' or 'absence', el_input=undefined

// ---  get selected_pk from tblRow or selected_customer_pk / selected_order_pk
        let selected_pk = null;
        mod_dict = {};
        // el_input is undefined when clicked on submenu_btn
        if(el_input){
            const tblRow = get_tablerow_selected(el_input);
            if(tblRow){
                selected_pk = get_attr_from_el(tblRow, "data-pk")
            }
        }
        if (!selected_pk) {
            // // tblRow is undefined when clicked on delete btn in submenu btn or form (no inactive btn)
            selected_pk = (tblName === "scheme") ? selected.scheme_pk :
                          (tblName === "absence") ? selected.teammember_pk :
                          (tblName === "teammember") ? selected.teammember_pk : null;
        }

// ---  get info from data_map
        const data_map = (tblName === "scheme") ? scheme_map :
                         (tblName === "absence") ? absence_map : null;
        const map_id = tblName + "_" + selected_pk;
        const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id)
        const pk_int = selected_pk;
        const ppk_int = (tblName === "scheme") ? get_dict_value(map_dict,["id", "ppk"]) :
                        (tblName === "absence") ? map_dict.t_id : null;
        const code_value = (tblName === "scheme") ? get_dict_value(map_dict, ["code", "value"]) :
                          (tblName === "absence") ? map_dict.o_code : null;
        const employee_code = (tblName === "absence") ? map_dict.e_code : null;

       //console.log("map_dict", map_dict)
        console.log("code_value", code_value)

        const has_selected_item = (!isEmpty(map_dict));
        console.log("has_selected_item", has_selected_item)
        if(has_selected_item){
// ---  create mod_dict
            mod_dict = {pk: pk_int,
                        ppk: ppk_int,
                        mapid: map_id,
                        table: tblName,
                        mode: mode,
                        code: code_value,
                        employee_code: employee_code,
                        TEMP_is_ModConfirmTblrow: true
                        };
        }
        console.log("mod_dict", mod_dict)

// ---  put header text in modal form
        let header_text = null
        if (mode === "delete") {
             if (tblName === "scheme") {
                header_text = loc.Delete_scheme;
             } else if (tblName === "absence") {
                header_text = loc.Delete_absence}
        } else if (mode === "inactive") {
             if (tblName === "scheme") {
                 header_text = (map_dict.inactive) ? loc.Make_scheme_active : loc.Make_scheme_inactive;
             } else if (tblName === "absence") {
                header_text = (map_dict.inactive) ? loc.Make_shift_active : loc.Make_shift_inactive}}
        document.getElementById("id_confirm_header").innerText = header_text;

// ---  put msg text in modal form
        let msg_01_txt = "", msg_02_txt = "", txt_01 = "", txt_02 = "";
        if(has_selected_item){
            if (tblName === "scheme") {
                msg_01_txt = loc.Scheme + " '" + mod_dict.code + "' "
            } else if (tblName === "absence") {
                msg_01_txt = loc.Absence + " '" + mod_dict.code + "' " + loc.of + " " + mod_dict.employee_code + " "
            }
             if (mode === "delete") {
                msg_01_txt += loc.will_be_deleted
             } else if (mode === "inactive") {
                msg_01_txt +=  (map_dict.inactive) ? loc.will_be_made_active : loc.will_be_made_inactive
             }
            msg_02_txt = loc.Do_you_want_to_continue;
        } else {
            msg_01_txt = (tblName === "scheme") ? loc.No_scheme_selected :
                           (tblName === "absence") ? loc.Please_select_absence: "";
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

    };  // ModConfirmTblrowOpen

// +++++++++ END OF MOD CONFIRM DELETE TABLEROW++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++ MOD CONFRIM ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-10-23 PR2020-05-03
    function ModConfirmOpen(shiftoption, el_input, get_header_text) {
        console.log(" -----  ModConfirmOpen   ----", shiftoption)

        // shiftoptions are: delete, inactive, schemeitem_delete, scheme_delete, scheme_inactive, absence_delete,
        //                   gridrow_shift_save, gridrow_shift_delete, grid_team, grid_si

        // modal opens when:
        // - delete grid scheme, team, shift, teammember (sel_btn =  'grid_si', 'grid_team_delete', 'gridrow_shift_delete'
        // - delete tblRow absence, teammember, schemeitem, shift (sel btn =
        // inactive: schemeitem

        // el_input only has vaue when caled by HandleSelectRowButtonInactive, UploadDeleteInactive

let btn_save_caption = loc.Save, btn_save_style = "btn-primary", btn_save_hidden = false, btn_save_focus = false;
let btn_cancel_caption = loc.Cancel, btn_cancel_style = "btn-outline-secondary";
let header_text = null, msg_01_txt = null, msg_02_txt = null, msg_03_txt = null;
let tblName = null;

if(shiftoption === "scheme_delete"){
    mod_dict = {mode: shiftoption,
                pk: mod_MSCH_dict.pk,
                ppk: mod_MSCH_dict.ppk,
                table: mod_MSCH_dict.table};

    header_text = loc.Delete_scheme;
    msg_01_txt = loc.Scheme + ": '" + mod_MSCH_dict.code + "'" + loc.will_be_deleted;
    msg_02_txt = loc.Do_you_want_to_continue;
    btn_save_caption = loc.Yes_delete
    btn_cancel_caption = loc.No_cancel
    btn_save_style = "btn-outline-danger";

} else if(shiftoption === "scheme_inactive"){
    // called by sbr_scheme_select
    // mod_dict already got value in  HandleSelectRowButtonInactive
    header_text = loc.Make_scheme_inactive;
    const code = get_dict_value(mod_dict, ["code", "value"])
    msg_01_txt = loc.Scheme + ": '" + code + "'" + loc.will_be_made_inactive
    msg_02_txt = loc.Do_you_want_to_continue;
    btn_save_caption = loc.Yes_make_inactive;
    btn_cancel_caption = loc.No_cancel;

} else if(shiftoption === "gridrow_shift_delete"){
    tblName = "shift";
    const shift_dict = (mod_dict.shift) ? mod_dict.shift : {};
    const shift_pk = (shift_dict) ? shift_dict.id : null;
    const shift_ppk = (shift_dict) ? shift_dict.s_id : null;
    const is_restshift = (shift_dict) ? shift_dict.isrestshift : false;
    let shift_code = (shift_dict.code) ? shift_dict.code : "---"
    if (is_restshift) { shift_code += " (R)"};

    header_text = loc.Delete_shift;
    msg_01_txt = (shift_pk) ? loc.Shift + " '" + shift_code + "' " + loc.will_be_deleted : loc.No_shift_selected;
    msg_02_txt = (shift_pk) ? loc.Do_you_want_to_continue : null;
    btn_save_caption = (shift_pk) ? loc.Yes_delete : null;
    btn_cancel_caption = (shift_pk) ? loc.No_cancel : loc.OK;
    btn_save_style = (shift_pk) ? "btn-outline-danger" : "btn-primary";
    btn_save_hidden = (!shift_pk);

} else if(shiftoption === "grid_team"){
        tblName = "team";
        const team_dict = (mod_MGT_dict.team) ? mod_MGT_dict.team : null;
        const team_pk = (team_dict) ? team_dict.id : null;
        const team_ppk = (team_dict) ? team_dict.s_id : null;
        const team_code = (team_dict) ? team_dict.code : null;

        header_text = loc.Delete_team;
        msg_01_txt = (team_pk) ? loc.Team + " '" + team_code + "' " + loc.will_be_deleted : loc.No_team_selected;
        msg_02_txt = (team_pk) ? loc.Do_you_want_to_continue : null;
        btn_save_caption = (team_pk) ? loc.Yes_delete : null;
        btn_cancel_caption = (team_pk) ? loc.No_cancel : loc.OK;
        btn_save_style = (team_pk) ? "btn-outline-danger" : "btn-primary";
        btn_save_hidden = (!team_pk);

} else {
// ---  get tblRow - tblRow is undefined when clicked on menubtn or modal
        let tblRow = get_tablerow_selected(el_input);
        console.log("tblRow: ", tblRow)
        if(!tblRow && selected_btn === "btn_absence"){
            tblRow = document.getElementById(selected.mapid)
        }
        let tblName = get_attr_from_el(tblRow, "data-table")  // can be 'absence' from UploadDeleteInactive
        console.log("tblName: ", tblName)
        const pk_str = get_attr_from_el(tblRow, "data-pk")
        const map_id =  get_map_id(tblName, pk_str);
        const map_dict = get_mapdict_from_tblRow(tblRow)

        if( shiftoption === "delete" && selected_btn === "btn_absence"){
                if(!isEmpty(map_dict)){
                    header_text = get_dict_value(map_dict, ["employee", "code"])
                } else {
                    header_text = mod_dict.selected_employee
                }

        } else if(shiftoption === "inactive"){
                // called by schemeitem table
                btn_save_hidden = (isEmpty(map_dict));
                if(!btn_save_hidden){
                    header_text = loc.Make_inactive;
                    if(tblName === "schemeitem") {
                        msg_01_txt = loc.Shift + " '" + get_dict_value(map_dict, ["shift", "code"], "-") + "' "
                    }
                    msg_01_txt += loc.will_be_made_inactive + "\n" + loc.Do_you_want_to_continue;
                    btn_save_caption = loc.Yes_make_inactive;
                    btn_save_focus = true;
                    btn_cancel_caption =  loc.No_cancel;
                }

        } else if(shiftoption === "grid_si"){
                    header_text = get_header_text;
                    msg_01_txt = loc.Select_team_first + " " +  loc.before_add_or_remove_a_shift;
                    msg_02_txt = loc.Click + " \u22BB " + loc.above_teamname_to_select_a_team;
                    btn_save_hidden = true;
                    btn_cancel_caption = loc.OK;

        } else {

                // tblRow is undefined when el_input = undefined
                if(tblRow){

                } else if (selected_btn === "btn_absence"){

                } else if(shiftoption === "schemeitem_delete"){
                    tblName = "schemeitem";
                    mod_dict = {id: {table: tblName}, schemeitem_delete: true};


                } else {
                    // get info from mod_dict
                    tblName = get_dict_value(mod_dict, ["id", "table"])
                }

        // ---  create header_text
                if (shiftoption === "schemeitem_delete") {
                     header_text = loc.Delete_scheme_shifts;

                } else if (shiftoption === "grid_si") {
                    header_text = header_text;
                } else if (tblName === "schemeitem") {
                    const rosterdate_iso = get_dict_value(map_dict, ["rosterdate", "value"])
                    let rosterdate_text = format_dateISO_vanilla (loc, rosterdate_iso, false, true);
                    if(!rosterdate_text){ rosterdate_text = "-"}
                    const shift_text = get_dict_value(mod_dict, ["shift", "code"], "-")
                    header_text = loc.Shift + " '" + shift_text + "' " + loc.of + " " + rosterdate_text;
                } else if(["teammember", "absence"].indexOf(tblName) > -1){
                    header_text = get_dict_value(mod_dict, ["employee", "code"], "")

                } else {
                    let code_value = get_dict_value(mod_dict, ["code", "value"]);
                    if(!code_value) {code_value = get_dict_value(map_dict, ["code", "value"], "-")};
                    header_text = code_value;
                }

        // ---  create msg_txt
                let msg_01_txtXX = (tblName === "scheme") ? loc.This_scheme :
                               (tblName === "schemeitem") ? loc.This_shift :
                               (tblName === "shift") ? loc.This_shift :
                               (tblName === "teammember") ? loc.This_teammember :
                               (tblName === "absence") ? loc.Absence + " '" + get_dict_value(map_dict, ["order", "code"], "-") + "'"  : null
                let msg_02_txt = null, msg_03_txt = loc.Do_you_want_to_continue;


                if (shiftoption === "schemeitem_delete"){
                    msg_01_txtXX = loc.All_schemeitems_willbe_deleted;
                }


        // hide ok button when (shiftoption === "grid_si")
                //add_or_remove_class (el_btn_save, cls_hide, (shiftoption === "grid_si"))
                //setTimeout(function() {el_btn_save.focus()}, 300);

        // set focus to cancel button (when delete) or save (when inactive), delay 500ms because of modal fade
                //let id_str = (shiftoption === "inactive") ? "id_confirm_btn_save" : "id_confirm_btn_cancel";
                //setTimeout(function (){document.getElementById(id_str).focus();}, 500);
                //const is_delete = (["delete", "schemeitem_delete", "grid_team_delete", "gridrow_shift_delete"].indexOf(shiftoption) > -1)
                //let btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary";
                //let btn_class_remove = (is_delete) ? "btn-primary" : "btn-outline-danger";
                //document.getElementById("id_confirm_btn_save").classList.remove(btn_class_remove)
                //document.getElementById("id_confirm_btn_save").classList.add(btn_class_add)

        }  //if(selected_btn === "btn_absence"){
}
        document.getElementById("id_confirm_header").innerText = header_text;

// put msg_txt in modal form
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        document.getElementById("id_confirm_msg02").innerText = msg_02_txt;
        document.getElementById("id_confirm_msg03").innerText = msg_03_txt;

// ---  set btn save
        const el_btn_save = document.getElementById("id_confirm_btn_save")
        el_btn_save.innerText = btn_save_caption
        el_btn_save.classList.remove("btn-primary", "btn-secondary", "btn-outline-danger")
        el_btn_save.classList.add(btn_save_style)
        add_or_remove_class(el_btn_save, cls_hide, btn_save_hidden);

// ---  set btn cancel
        const el_btn_cancel = document.getElementById("id_confirm_btn_cancel")
        el_btn_cancel.innerText = btn_cancel_caption
        el_btn_cancel.classList.remove("btn-primary", "btn-secondary", "btn-outline-secondary", "btn-outline-danger")
        el_btn_cancel.classList.add(btn_cancel_style)

// ---  set focus
        const el_focus = (btn_save_focus && !btn_save_hidden) ? el_btn_save : el_btn_cancel
        set_focus_on_el_with_timeout(el_focus, 50)

// show modal
        $("#id_mod_confirm").modal({backdrop: true});
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-09-20 PR2021-01-05
    function ModConfirmSave() {
        console.log("========= ModConfirmSave ===" );
        console.log("mod_dict: ", deepcopy_dict(mod_dict));

// ---  hide modal
        $('#id_mod_confirm').modal('hide');

        let url_str = null, upload_dict = {};
        // TODO mode is moved to shift_dict. Move in others tables aw well. mod_dict.mode is to be deprecated
        const mode = (mod_dict.mode) ? mod_dict.mode : "none";
        const shiftoption = (mod_dict.shiftoption) ? mod_dict.shiftoption : "none";
        const action = (mod_dict.action) ? mod_dict.action : "none";
        console.log("mode: ", mode );
        console.log("action: ", action );
        console.log("shiftoption: ", shiftoption );

        if(mode === "scheme_delete"){
            url_str = url_scheme_shift_team_upload
            upload_dict = {id: {pk: mod_dict.pk,
                                ppk: mod_dict.ppk,
                                table: mod_dict.table,
                                delete: true} }
            UploadChanges(upload_dict, url_str)

            // make scheme_container red
            const el = document.getElementById("id_grid_scheme_container");
            console.log(el)
            el.classList.add("tsa_tr_error");

        } else if(mode === "scheme_inactive"){
            // mod_dict already got value in  HandleSelectRowButtonInactive
            UploadChanges(mod_dict, url_scheme_shift_team_upload);
            // ---  toggle inactive icon, before uploading
            const el_input = document.getElementById(mod_dict.el_id)
            const tblRow = get_tablerow_selected(el_input)
            if (tblRow) {
                const is_inactive = get_dict_value(mod_dict, ["inactive", "value"])
                const el_input = tblRow.querySelector("[data-field=inactive]");
                const el_img = el_input.children[0];
                if (el_img){add_or_remove_class (el_img, "inactive_1_3", is_inactive, "inactive_0_2")}
            }

        } else if(action === "gridrow_shift_delete"){
            // mod_dict got value in ModConfirmOpen
            const shift_dict = (mod_dict.shift) ? mod_dict.shift : {};
            const row_id = (shift_dict.rowid) ? shift_dict.rowid : null;
            const tblRow = document.getElementById(row_id);
            console.log("tblRow: ", tblRow );
            if(tblRow){ ShowErrorRow(tblRow, cls_selected)}
            const upload_dict = { shiftoption: "grid_shift",
                                shift: {mode: shift_dict.mode,
                                        table: shift_dict.table,
                                        mapid: "shift_" + shift_dict.id,
                                        rowid: "gridrow_shift_" + shift_dict.id,
                                        id: shift_dict.id,
                                        s_id: shift_dict.s_id
                                        //code: shift_dict.code
                                    }
                                }
            UploadChanges(upload_dict, url_teammember_upload)

        } else if(shiftoption === "grid_team"){
            // mod_dict got value in ModConfirmOpen
            // mode is alway delete when called by grid_team
// ---  make team column red
            const col_index = get_dict_value(mod_dict, ["team", "col"])
            console.log(">>>>> mod_dict: ", mod_dict );
            console.log(">>>>> col_index: ", col_index );
            let tblBody = el_grid_tbody_team;
            for (let i = 0, cell, len = tblBody.rows.length; i < len; i++) {
                cell = tblBody.rows[i].cells[col_index];
                if (cell.classList.contains("grd_team_th")) {
                    cell.classList.remove("grd_team_th")
                    cell.classList.add("grd_team_th_delete")
                } else if (cell.classList.contains("grd_team_td")) {
                    cell.classList.remove("grd_team_td")
                    cell.classList.add("grd_team_td_delete")
                }
            }
            UploadChanges(mod_dict, url_teammember_upload)

        } else {
                const is_delete = (mode === "delete");
                console.log(">>>>>is_delete: ", is_delete );


        // ---  Upload Changes
                const tblName = get_dict_value(mod_dict, ["id", "table"])
                const pk_int = get_dict_value(mod_dict,["id", "pk"])
                if(is_absence_mode){tblName === "absence"}
                const map_id = get_map_id(tblName, pk_int)

                if(mod_dict.TEMP_is_ModConfirmTblrow) {
                        console.log(" --- ModConfirmTblrowSave --- ");
                        console.log("mod_dict: ", mod_dict);

                        let upload_dict = {};
                        if (mode === "delete") {
                             if (mod_dict.table === "scheme") {

                             } else if (mod_dict.table === "absence") {
                                upload_dict = {id: {pk: mod_dict.pk,
                                                    ppk: mod_dict.ppk,
                                                    table: 'teammember',
                                                    mapid: mod_dict.mapid,
                                                    isabsence: true,
                                                    delete: true,
                                                    shiftoption: "isabsence"} }
                                }
                        }
                        const tblRow = document.getElementById(mod_dict.mapid);
                // ---  when delete: make tblRow red, before uploading
                        if (mode === "delete"){
                            if (tblRow) { ShowErrorRow(tblRow, cls_selected ) }
                        } else if (mode === "inactive"){
                // toggle inactive
                            mod_dict.inactive = !mod_dict.inactive;
                            upload_dict.inactive = {value: mod_dict.inactive, update: true};
                            // change inactive icon, before uploading
                // ---  toggle inactive icon, before uploading
                            if (tblRow) {
                                const el_input = tblRow.querySelector("[data-field=inactive]");
                                const el_img = el_input.children[0];
                                if (el_img){add_or_remove_class (el_img, "inactive_1_3", mod_dict.inactive, "inactive_0_2")}
                            }
                      }
                // ---  hide modal
                        $("#id_mod_confirm").modal("hide");
                // ---  UploadChanges
                        UploadChanges(upload_dict, url_teammember_upload, "ModConfirmSave");
                } else {
                        if(tblName === "schemeitem"){
                            const is_delete_single_si = get_dict_value(mod_dict, ["id", "delete"])
                            console.log("is_delete_single_si: ", is_delete_single_si );
                            if(is_delete_single_si){
                                // this is called by btn_inactive in tblRow
                                let tblRow = document.getElementById(map_id);
                                tblRow.classList.remove(cls_selected);
                                tblRow.classList.add(cls_error);

                                // ---  upload upload_list, it can contain multiple upload_dicts (list added because of grid PR2020-03-15)
                                let upload_list = [mod_dict];
                                UploadChanges(upload_list, url_schemeitem_upload, "ModConfirmSave")

                            } else {
                                if ("schemeitem_delete" in mod_dict) {
                                    // schemeitem_delete is called by buttongroup schemeitem
                                    const skip_confirm = true;
                                    HandleBtnSchemeitems("delete", skip_confirm);
                                } else if ("delete" in mod_dict) {
                                    // delete is called by btn_delete in tblRow
                                    UploadSchemeitemDelete (mod_dict, "delete")
                                } else {
                                    // this is called by btn_inactive in tblRow
                                    // ---  upload upload_list, it can contain multiple upload_dicts (list added because of grid PR2020-03-15)
                                    let upload_list = [mod_dict];
                                    UploadChanges(upload_list, url_schemeitem_upload, "ModConfirmSave")
                                }
                            }  //  if(is_delete_single_si){
                        } else if(tblName === "teammember" || ["grid_team", "grid_shift", "datatable_shift_delete"].indexOf(shift_option) > -1){
                            UploadChanges(mod_dict, url_teammember_upload, "ModConfirmSave");
                        } else {
                            // tblName: scheme, shift, team, absence
                            UploadChanges(mod_dict, url_scheme_shift_team_upload, "ModConfirmSave")
                        }

                // ---  make selected tblRow red in datatable when delete
                        if (mode === "delete") {
                            const pk_int = get_dict_value(mod_dict, ["id", "pk"]);
                            let tblName = get_dict_value(mod_dict, ["id", "table"]);
                            if(is_absence_mode){tblName = "absence"}
                            const map_id = get_map_id(tblName, pk_int);
                            const tblRow = document.getElementById(map_id);
                            if(!!tblRow){ ShowErrorRow(tblRow, cls_selected)}
                        }
                }
            // ---  make selected tblRow red in datatable when delete
            if (["delete"].indexOf(mode) > -1) {
                const pk_int = get_dict_value(mod_dict, ["id", "pk"]);
                let tblName = get_dict_value(mod_dict, ["id", "table"]);
                if(is_absence_mode){tblName = "absence"}
                const map_id = get_map_id(tblName, pk_int);
                    console.log("map_id:", map_id) ;
                const tblRow = document.getElementById(map_id);
                    console.log("tblRow:", tblRow) ;
                if(!!tblRow){ ShowErrorRow(tblRow, cls_selected)}
            }
        }

    } // ModConfirmSave

// +++++++++++++++++ MODAL SELECT CUSTOMER ORDER +++++++++++++++++++++++++++++++++++++++++++

//========= MSCO_Open ====================================  PR2020-05-21
    function MSCO_Open () {
        console.log(" ===  MSCO_Open  =====") ;
        console.log("selected.order_pk:", selected.order_pk) ;

        // do not update selected_period.order_pk until MSCO_Save
// ---  reset mod_MSCO_dict
        // selected.order_pk is stored in mod_MSCO_dict in fucntion MSCO_FillSelectTableCustOrder
        mod_MSCO_dict = {customer_pk: 0, order_pk: 0};
        el_MSCO_input_custorder.value = null;
// ---  fill SelectTable Custorder
        MSCO_FillSelectTableCustOrder("msco")
// ---  hide 'remove_order' button
        document.getElementById("id_MSCO_div_remove_custorder").classList.add(cls_hide);
// ---  set focus to el_MSCO_input_custorder
        set_focus_on_el_with_timeout(el_MSCO_input_custorder, 150)
// ---  show modal
         $("#id_mod_select_custorder").modal({backdrop: true});
    }; // MSCO_Open

//=========  MSCO_FillSelectTableCustOrder  ================ PR2020-07-02
    function MSCO_FillSelectTableCustOrder(mod_name) {
        //console.log( "===== MSCO_FillSelectTableCustOrder ========= ");
        const tbl_id = (mod_name === "msco") ? "id_MSCO_tbody_select" :
                       (mod_name === "mcft") ? "id_mod_copyfrom_tblbody" : null
        let tableBody = document.getElementById(tbl_id);

        if (tableBody){
            const data_map = order_map
            tableBody.innerText = null;
            let row_count = 0;
            if (data_map) {

        //console.log( "data_map", data_map);
        //--- loop through data_map
                for (const [map_id, map_dict] of data_map.entries()) {

        //console.log( "map_dict", map_dict);
                    const add_to_list = MSCO_FillSelectRow(tableBody, map_dict, mod_name)
                    if (add_to_list) { row_count += 1 };
                };
                if(row_count === 0){
                    let tblRow = tableBody.insertRow(-1);
                    let td = tblRow.insertCell(-1);
                    td.innerText = loc.No_orders;
                } else if(row_count === 1){
                    let tblRow = tableBody.rows[0]
                    if(!!tblRow) {
        // ---  put order_pk in mod_MSCO_dict
                        if  (mod_name === "msco"){
                            mod_MSCO_dict.order_pk = get_attr_from_el(tblRow, "data-pk");
                            mod_MSCO_dict.customer_pk = get_attr_from_el(tblRow, "data-ppk");
                        }
        // ---  highlight first row
                        tblRow.classList.add(cls_selected);
                    }
                }
            }
        }
    }  // MSCO_FillSelectTableCustOrder

//=========  MSCO_FillSelectRow  ================ PR2020-05-21 cleaned
    function MSCO_FillSelectRow(tableBody, map_dict, mod_name) {
        //console.log( "===== MSCO_FillSelectRow ========= mod_name", mod_name);
        //console.log( "map_dict ", map_dict);

//--- check if item must be added to list
        let add_to_list = false, is_selected_pk = false;
        const is_absence = get_dict_value(map_dict, ["id", "isabsence"], false);
        if (is_absence === show_absence_FOR_TESTING_ONLY || show_absence_FOR_TESTING_ONLY == null){
            add_to_list = true
        } else {
            const customer_inactive = get_dict_value(map_dict, ["customer", "inactive"], false);
            const order_inactive = get_dict_value(map_dict, ["inactive", "value"], false);
            add_to_list = (!customer_inactive && !order_inactive);
        }
// ---  add item to list
        if (add_to_list){
// ---  get info from map_dict
            const pk_int = get_dict_value(map_dict, ["id", "pk"]);
            const ppk_int = get_dict_value(map_dict, ["id", "ppk"]);
            const customer_code = get_dict_value(map_dict, ["customer", "code"], "");
            const order_code = get_dict_value(map_dict, ["code", "value"], "");
            const code_value = customer_code + " - " + order_code;
// ---  insert tblRow  //index -1 results in that the new row will be inserted at the last position.
            let tblRow = tableBody.insertRow(-1);
            if (pk_int) {
                tblRow.id = "sel_order_" + pk_int.toString();
                tblRow.setAttribute("data-pk", pk_int)
                tblRow.setAttribute("data-ppk", ppk_int)
                tblRow.setAttribute("data-value", code_value);
            };
//- add EventListener to tblRow
            tblRow.addEventListener("click", function() {MSCO_SelecttableClicked(tblRow, mod_name)}, false )
// ---  add hover to tblRow
            add_hover(tblRow);
// ---  check if row is selected.order_pk, put order_pk in mod_MSCO_dict
            if (!!selected.order_pk &&  ppk_int === selected.order_pk){
                mod_MSCO_dict.order_pk = selected.order_pk;
                mod_MSCO_dict.customer_pk = selected.customer_pk;
// ---  highlight clicked row
                tblRow.classList.add(cls_selected);
            }
// ----  add td to tblRow.
            let td = tblRow.insertCell(-1);
// --- add a element to td., necessary to get same structure as item_table, used for filtering
            let el = document.createElement("div");
                el.innerText = code_value;
                el.classList.add("mx-1", "tw_180")
            td.appendChild(el);
        } // if (add_to_list)
        return add_to_list;
    }  // MSCO_FillSelectRow

//=========  MSCO_SelecttableClicked  ================ PR2020-05-21 cleaned
    function MSCO_SelecttableClicked(tblRow, mod_name) {
        //console.log( "===== MSCO_SelecttableClicked ========= ");
        //console.log( "mod_name", mod_name);

// ---  get clicked tablerow
        if(!!tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            if (mod_name === "mcft"){
                mod_dict.copyto_order_pk = get_attr_from_el_int(tblRow, "data-pk");
                mod_dict.copyto_order_ppk = get_attr_from_el_int(tblRow, "data-ppk");
                mod_dict.copyto_order_code = get_attr_from_el(tblRow, "data-value");
                el_MCFT_input_order.value = mod_dict.copyto_order_code;
                set_focus_on_el_with_timeout(el_MCFT_btn_save, 50);
            } else {
                mod_MSCO_dict.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                mod_MSCO_dict.customer_pk = get_attr_from_el_int(tblRow, "data-ppk");

                MSCO_Save();
            }
        }
    }  // MSCO_SelecttableClicked

//=========  MSCO_FilterCustOrder  ================ PR2020-05-21 cleaned
    function MSCO_FilterCustOrder() {
        //console.log( "===== MSCO_FilterCustOrder  ========= ");
        let new_filter = el_MSCO_input_custorder.value;
// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSCO_tblbody_custorder, cls_selected)
// ---  reset selected order_pk
        mod_dict.order_pk = 0;
// ---  filter select_customer rows
        if (!!el_MSCO_tblbody_custorder.rows.length){
            const filter_dict = t_Filter_SelectRows(el_MSCO_tblbody_custorder, new_filter);
            // filter_dict.selected_pk has only value when unique record found
// ---  if filter results have only one unique record: put selected order in el_MSCO_input_custorder
            if (filter_dict.selected_pk) {
                el_MSCO_input_custorder.value = filter_dict.selected_value;
// ---  put selected order_pk in mod_MSCO_dict
                mod_MSCO_dict.order_pk = Number(filter_dict.selected_pk);
                mod_MSCO_dict.customer_pk = Number(filter_dict.selected_ppk);
// ---  highlight selected row
                let tblRow = document.getElementById("sel_order_" + filter_dict.selected_pk );
                if(!!tblRow) {tblRow.classList.add(cls_selected)}
// ---  Set focus to btn_save
                el_MSCO_btn_save.focus();
            };
        };
        //MSOO_FillSelectTableOrder();
    }; // MSCO_FilterCustOrder

//=========  MSCO_Save  ================ PR2020-05-21 cleaned
    function MSCO_Save() {
        //console.log("=====  MSCO_Save =========");
        //console.log("mod_MSCO_dict", mod_MSCO_dict);
        // don't update selected.customer_pk and selected.order_pk until response
        HandleSelectOrder(mod_MSCO_dict.customer_pk, mod_MSCO_dict.order_pk );
// hide modal
        $("#id_mod_select_custorder").modal("hide");
    }  // MSCO_Save

// +++++++++++++++++ END OF MODAL SELECT CUSTOMER ORDER +++++++++++++++++++++++++++++++++++++++++++

// +++++++++ MOD SELECT EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  MSE_open  ================ PR2020-03-19
    function MSE_open(el_input) {
        console.log(" -----  MSE_open   ----")
        // called by EventListener of input employee and replacement in modal MGT_Teammember and (NIU yet: table teammember)
        // selected.team_pk and selected are only used in table teammember

        const tlbRow = get_tablerow_selected(el_input)
        const is_grid = (!!get_attr_from_el(tlbRow, "data-isgrid"))

// +++++ show modal confirm when is_template_mode or when no team selected in table view
        // ---  add employee disabled in template mode, also in table when no team selected (grid mode is allowed)
        if(is_template_mode || (!selected.team_pk && !is_grid ) ){
            // PR2020-07-02 debug mod_confirm was under modgrid_team, therefore not showing.
            // z-index didnt work, putting mod_confirm after modgrid_team in scheme.html worked.
            // ---  show modal confirm with message 'First select employee'
            const msg_err01 = (is_template_mode) ? loc.can_only_enter_teammember_without_employee : loc.err_first_select_team
            const msg_err02 = (is_template_mode) ? loc.can_enter_employee_after_copying_template : null
            document.getElementById("id_confirm_header").innerText = loc.Select_employee + "...";
            document.getElementById("id_confirm_msg01").innerText = msg_err01;
            document.getElementById("id_confirm_msg02").innerText = msg_err02;
            document.getElementById("id_confirm_msg03").innerText = null;

            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_btn_cancel.classList.add(cls_hide)
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            add_or_remove_class(el_btn_save, "btn-secondary" , true,"btn-primary"  )
            setTimeout(function() {el_btn_save.focus()}, 50);
            $("#id_mod_confirm").modal({backdrop: true});

        } else {

// +++++ initiate modal select employee

    // ---  get teammember_pk_ from tlbRow
            const teammember_pk_str = get_attr_from_el(tlbRow, "data-pk")
            const team_pk_str = get_attr_from_el(tlbRow, "data-ppk")
            const tblName = get_attr_from_el(tlbRow, "data-table")
            const is_table = (!!get_attr_from_el(tlbRow, "data-istable", false))

    // ---  get fldName from el_input, fldName = 'employee' or 'replacement'
            const fldName = get_attr_from_el(el_input, "data-field")
            const is_replacement = (fldName === "replacement")

    // ---  create mod_MGT_dict[teammember_pk_str] when called by table. In grid mode mod_MGT_dict has already values
            //if (is_table){
                // TODO check if correct
                //mod_MGT_dict = {};
                //MGT_create_modMGT_tm_dict(teammember_pk_str, team_pk_str);
            //}

// ---  get employee / replacement name from mod_MGT_dict
            const dict = get_dict_value(mod_MGT_dict, [teammember_pk_str, fldName]);
            const pk_str = (dict && dict.pk) ? dict.pk : null;
            const empl_repl_code = (dict && dict.code) ? dict.code : "---";

            // always add fldName and is_table, both in grid mode and in table mode
            // key 'field' is stored in root of mod_MGT_dict to store 'employee' or 'replacement' for modal MSE
            mod_MSE_dict = {
                field: fldName,
                istable: is_table,
                sel_tm_pk: teammember_pk_str, // can be 'new12'
                pk: pk_str,
                code: empl_repl_code
            }

// ---  put employee name in header
            let label_text = ((is_replacement) ? loc.Select_replacement_employee : loc.Select_employee ) + ":";
            let el_header = document.getElementById("id_ModSelEmp_hdr_employee")
            let el_label_input = document.getElementById("id_MSE_label_employee")
            let el_div_remove = document.getElementById("id_MSE_div_btn_remove")

            el_header.innerText = (pk_str) ?  empl_repl_code : label_text;
            add_or_remove_class(el_div_remove, cls_hide, !pk_str)
            document.getElementById("id_MSE_label_employee").innerText = label_text

// ---  remove values from el_mod_employee_input
            let el_mod_employee_input = document.getElementById("id_MSE_input_employee")
            el_mod_employee_input.value = null

// ---  fill selecttable employee
            // always filter out cur_employee_pk, not replacement. In that way employee cannot replace himself PR2020-10-21
            const cur_employee_pk =  get_dict_value(mod_MGT_dict, [teammember_pk_str, "employee", "pk"]);
            MSE_FillSelectTableEmployee(cur_employee_pk, is_replacement)
// ---  set focus to el_mod_employee_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){el_mod_employee_input.focus()}, 500);
// ---  show modal
            $("#id_mod_select_employee").modal({backdrop: true});
        }  //  if(!is_template_mode

    };  // MSE_open

//=========  MSE_Save  ================ PR2020-03-17
    function MSE_Save(action) {
        console.log("========= MSE_Save ===", action );  // action = 'save' or 'remove'
        // called by MSE_filter_employee, MSE_select_employee, MSE_btn_remove_employee, MSE_btn_remove_employee
        // mod_MSE_dict = {code: "Regales, Ruëny", field: "employee", istable: false, pk: 3, sel_tm_pk: "new3"}

        const tblName = "teammember";
        const is_remove = (action ==="remove");
        const fldName = mod_MSE_dict.field;
        const is_replacement = (fldName === "replacement");
        const is_calledby_tm_table = mod_MSE_dict.istable;

        const tm_pk = (mod_MSE_dict.sel_tm_pk) ? mod_MSE_dict.sel_tm_pk : null;
        const empl_repl_pk = (!is_remove && mod_MSE_dict.pk) ? mod_MSE_dict.pk : null;
        const empl_repl_code = (!is_remove && mod_MSE_dict.code) ? mod_MSE_dict.code : "---";

        mod_MGT_dict[tm_pk][fldName] = {
            pk: empl_repl_pk,
            code: empl_repl_code,
            };
        mod_MGT_dict[tm_pk].update= true;
        mod_MGT_dict.update = true;

        MGT_BtnSaveDeleteEnable();

// remove replacement pk if employee and replacement are the same
        // (this is not necessary after selecting replacement, because employee is filtered out in select list
        let remove_rpl = false;
        if (!is_replacement && empl_repl_pk){
            const rpl_field = "replacement";
            const rpl_pk = get_dict_value(mod_MGT_dict, [tm_pk, rpl_field, "pk"]);
            if(rpl_pk && rpl_pk === empl_repl_pk){
                mod_MGT_dict[tm_pk][rpl_field].pk = null;
                mod_MGT_dict[tm_pk][rpl_field].code = "---";
                remove_rpl = true;
            }
        }

// +++++ called bij grid ModGridTeam
// when called by ModGridTeam: save in tblRow, When called by table Teammember: uploadchanges

        if(!is_calledby_tm_table) {

// ---  put code in tblRow
            const row_id = "teammember_" + tm_pk.toString();
            let tblRow = document.getElementById(row_id);
            if(tblRow){
                const col_index = (is_replacement) ? 3 : 0;
                const td = tblRow.cells[col_index];
                if(td){ td.children[0].innerText = empl_repl_code;}
                if(remove_rpl){
                    const td_rpl = tblRow.cells[3];
                    if(td_rpl){ td_rpl.children[0].innerText = "---";}
                }
            }
        } else {

// +++++ called bij table Teammember
// when called by table Teammember: upload changes
// TODO
/*
            let upload_dict = {};
            // TODO: get team_pk from tblRow
            const tm_is_create = (!!get_dict_value(mod_MGT_dict, [tm_pk, "create"], false));
            const team_pk = null;
            if (tm_is_create) {
                upload_dict = {id: {temp_pk: tm_pk, ppk: team_pk, table: tblName, create: true}};
            } else {
                upload_dict = {id: {pk: tm_pk, ppk: team_pk, table: tblName}};
            }
            upload_dict[fldName] = {pk: empl_repl_pk, code: empl_repl_code, update: true};
            UploadChanges(upload_dict, url_teammember_upload, "MSE_Save");

// ---  put code in tblRow
            const row_id = "teammember_" + tm_pk.toString();
            let tblRow = document.getElementById(row_id);
            if(!!tblRow){
                const col_index = (is_replacement) ? 3 : 0;
                let td = tblRow.cells[col_index];
                if(!!td){
                    let cell = td.children[0];
                    cell.value = employee_code;
                }
            }
  */
        }
// ---  hide modal
        $("#id_mod_select_employee").modal("hide");

        console.log("mod_MGT_dict", deepcopy_dict(mod_MGT_dict) );
    } // MSE_Save

//=========  MSE_select_employee ================ PR2020-03-19 PR2020-09-09
    function MSE_select_employee(tblRow) {
        console.log( "===== MSE_select_employee ========= ");
        // tblRow is the selected tblRow in the employee table of Mod_Select_Employee

// ---  deselect all highlighted rows in the employee table
        DeselectHighlightedRows(tblRow, cls_selected)
        if(tblRow) {

// ---  highlight clicked row in the employee table
            tblRow.classList.add(cls_selected)

// ---  get map_dict from employee_map
            const selected_pk = get_attr_from_el_int(tblRow, "data-pk")
            const selected_value = get_attr_from_el(tblRow, "data-value")

            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_pk);
            if (!isEmpty(map_dict)){

// ---  put employee info in mod_MSE_dict
            mod_MSE_dict.pk = selected_pk
            mod_MSE_dict.code = selected_value

// ---  put employee_code / replacemenet_code  in el_input_employee
                document.getElementById("id_MSE_input_employee").value = selected_value // null value is ok, will show placeholder
// ---  save selected employee
                MSE_Save("save")
            }  // if (!isEmpty(map_dict)){
        }  // if(!!tblRow) {
    }  // MSE_select_employee

//=========  MSE_put_employee_in_MGT_dict  ================ PR2020-04-18 PR2020-09-09  PR2021-01-07
    function MSE_put_employee_in_MGT_dict(map_dict) {
        console.log( "  -----  MSE_put_employee_in_MGT_dict  -----");
        // ---  put employee info in field employee or replacement of selected teammember in mod_MGT_dict
        // will be null when no employee
        // function is called by MSE_filter_employee and MSE_select_employee

        const teammember_pk = mod_MGT_dict.sel_tm_pk;
        const field = mod_MGT_dict.field; // field is 'employee' or 'replacement'
        const teammember_dict = mod_MGT_dict[teammember_pk];
        if(teammember_dict && ["employee", "replacement"].indexOf(field) > -1){
            teammember_dict[field] = {pk: map_dict.id, code: map_dict.code}
        }
    }  // MSE_put_employee_in_MGT_dict

//=========  MSE_filter_employee  ================ PR2019-05-26
    function MSE_filter_employee(option, event_key) {
        console.log( "===== MSE_filter_employee  ========= ", option);
        //console.log( "event_key", event_key);

        let el_input = document.getElementById("id_MSE_input_employee")

        let new_filter = el_input.value;
        let skip_filter = false
 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
// remove selected employee from mod_employee_dict
                //mod_employee_dict = {};
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_employee) {
                skip_filter = true
            } else {
                filter_mod_employee = new_filter.toLowerCase();
            }
        }

        let has_selection = false, has_multiple = false;
        let select_value = null, select_pk = null, select_parentpk = null;
        let tblbody = document.getElementById("id_ModSelEmp_tbody_employee");
        if (!skip_filter){
            for (let row_index = 0, tblRow, show_row, el, pk_str, code_value; tblRow = tblbody.rows[row_index]; row_index++) {
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
// put select_pk from first selected row in select_value
                    if(!has_selection ) {
                        select_pk = get_attr_from_el_int(tblRow, "data-pk")
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

// ---  get employee_dict from employee_map
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk);
// ---  put employee info in mod_MSE_dict
            mod_MSE_dict.pk = select_pk
            mod_MSE_dict.code = (employee_dict.code) ? employee_dict.code : null;

            console.log( "mod_MSE_dict", mod_MSE_dict);
// ---  highlight selected row
            // TODO debug error: 'Failed to execute 'getElementById' on 'Document': 1 argument required, but only 0 present.
            // const tblRow = document.getElementById()
// put code_value of selected employee in el_input
            el_input.value = employee_dict.code;
            el_MSE_btn_save.focus();
        }
    }; // MSE_filter_employee

//========= MSE_FillSelectTableEmployee  ============= PR2019-08-18
    function MSE_FillSelectTableEmployee(cur_employee_pk, is_replacement) {
        //console.log( "=== MSE_FillSelectTableEmployee ");
        //console.log( "cur_employee_pk", cur_employee_pk);

        const caption_one = (is_replacement) ? loc.Select_replacement_employee : loc.Select_employee;
        const caption_none = loc.No_employees + ":";

        let tableBody = document.getElementById("id_ModSelEmp_tbody_employee");
        tableBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, map_dict] of employee_map.entries()) {
                const pk_int = map_dict.id;
                const ppk_int = map_dict.comp_id;
                const code = map_dict.code;
                const is_inactive = map_dict.inactive;

//- skip selected employee
// Note: cur_employee_pk gets value from el_input, not from selected.teammember_pk because it can also contain replacement
// PR20019-12-17 debug: also filter inactive, but keep inaclive in employee_map, to show them in teammember
// PR2020-10-21 debug: always filter out cur_employee_pk, not replacement. In that way employee cannot replace himself
                if (pk_int !== cur_employee_pk && !is_inactive){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE:  tblRow.id = pk_int.toString()
                    tblRow.id = "sel_employee_" + pk_int;
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code);

//- add hover to tableBody row
                    add_hover(tblRow)
//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {MSE_select_employee(tblRow)}, false )
// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected.teammember_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // MSE_FillSelectTableEmployee

// +++++++++ END MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++


//=========  MOD SCHEME  ================ PR2020-04-19
    function MSCH_Open(el_clicked) {
        //console.log("=========  MSCH_Open ========= ");
        //console.log("selected.scheme_pk:", selected.scheme_pk);
        //console.log("selected.order_pk:", selected.order_pk);

        // el_clicked is undefined when clicked on menubtn add_new
        if(!el_clicked){selected.scheme_pk = 0}

// ---  put info of selected scheme in mod_MSCH_dict, gets info for new scheme when selected scheme not found
        MSCH_get_scheme_dict();

        //console.log("selected.order_pk:", selected.order_pk);
        //console.log("mod_MSCH_dict:", mod_MSCH_dict);
        if(selected.order_pk){
            //console.log("mod_MSCH_dict:", mod_MSCH_dict);
            let el_field = get_attr_from_el(el_clicked, "data-field")
            // these field names in scheme box have multiple fields in mod scheme. Set focus to first of them
            if(el_field === "datefirstlast"){
                el_field = "datefirst"
            } else if(el_field === "dvg_excl_ph"){
                el_field = (mod_MSCH_dict.divergentonpublicholiday) ? "divergentonpublicholiday" : "excludepublicholiday";
            } else if(!el_field){
                el_field = "code"
            }

// ---  set input boxes
            // form-control is a bootstrap class, tsa_input_checkbox is a TSA class only used to select input checkboxes
            let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
            for (let i = 0, el; el = form_elements[i]; i++) {
                const fldName = get_attr_from_el(el, "data-field")
                if(el.type === "checkbox") {
                    el.checked = mod_MSCH_dict[fldName]
                } else {
                    el.value = mod_MSCH_dict[fldName]
                }
// ---  set focus to selected field
                if (el_field && fldName === el_field){
                    set_focus_on_el_with_timeout(el, 150);
                }
            }
            el_MSCH_modifiedby.innerText = display_modifiedby(loc, mod_MSCH_dict.modat, mod_MSCH_dict.modby_usr);

// ---  validate values, set save btn enabled
            MSCH_validate_and_disable();
// ---  open Modal Scheme Add
            $("#id_modscheme").modal({backdrop: true});

        } else {
            // open confirm box 'Please_select_order'
            MSCH_Please_select_msg("order");
        }  //  if(selected.scheme_pk){

    }  // MSCH_Open

//=========  MSCH_Save  ================ PR2020-04-20
    function MSCH_Save(crud_mode) {
        //console.log("=========  MSCH_Save =========");
        //console.log( "mod_MSCH_dict: ", mod_MSCH_dict);
        const is_create = (!!mod_MSCH_dict.create)
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: "scheme"}};

        if(is_delete){
            if(mod_MSCH_dict.pk) {
                upload_dict.id.pk = mod_MSCH_dict.pk;
                upload_dict.id.ppk = mod_MSCH_dict.ppk;
                upload_dict.id.delete = true
            }
// make scheme_container red
            const el = document.getElementById("id_grid_scheme_container");
            el.classList.add(cls_error);

            ModConfirmOpen("scheme_delete", null)

        } else {
            if(is_create) {
                upload_dict.id.ppk = mod_MSCH_dict.ppk;
                upload_dict.id.create = true;
            } else if(mod_MSCH_dict.pk) {
                upload_dict.id.pk = mod_MSCH_dict.pk;
                upload_dict.id.ppk = mod_MSCH_dict.ppk;
            }
    // ---  loop through input elements
            let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
            for (let i = 0, el_input; el_input = form_elements[i]; i++) {
                if(el_input){
                    const fldName = get_attr_from_el(el_input, "data-field");
                    let new_value = null;
                    if (el_input.type === "checkbox"){
                        new_value = el_input.checked
                    } else if (fldName === "cycle") {
                        if(el_input.value && Number(el_input.value) && Number(el_input.value) <= MAX_CYCLE_DAYS) {
                            new_value = Number(el_input.value)
                        } else {
                            new_value = 32767;
                        }
                    } else {
                        new_value = el_input.value
                    }
                    if(is_create){
                        if (new_value) {upload_dict[fldName] = {value: new_value, update: true}};
                    } else {
                        const old_value = get_dict_value(mod_MSCH_dict, ["scheme", fldName])
                        if (new_value !== old_value) { upload_dict[fldName] = {value: new_value, update: true}};
                    }
                };
            }
            // modal is closed by data-dismiss="modal"
            UploadChanges(upload_dict, url_scheme_shift_team_upload, "MSCH_Save")
        }
    }  // MSCH_Save

//=========  MSCH_Please_select_msg  ================ PR2020-06-07
    function MSCH_Please_select_msg(order_or_scheme) {
        // open confirn box 'Please_select_order' / scheme
        const header_text = (order_or_scheme === "order") ? loc.Select_order : loc.Select_scheme;
        const msg_text = (order_or_scheme === "order") ? loc.Please_select_order : loc.Please_select_scheme;
        document.getElementById("id_confirm_header").innerText = header_text;
        document.getElementById("id_confirm_msg01").innerText = msg_text;
        document.getElementById("id_confirm_msg02").innerText = null;
        document.getElementById("id_confirm_msg03").innerText = null;
        // hide save button
        const el_btn_save =  document.getElementById("id_confirm_btn_save")
        const el_btn_cancel =  document.getElementById("id_confirm_btn_cancel")
        el_btn_save. classList.add(cls_hide);
        el_btn_cancel.classList.remove(cls_hide);
        el_btn_cancel.innerText =  loc.Close
        setTimeout(function() {el_btn_save.focus()}, 50);
// ---  show modal, set focus on save button
        $("#id_mod_confirm").modal({backdrop: true});
    }  // MSCH_Please_select_msg

//=========  MSCH_get_scheme_dict  ================ PR2020-04-20 PR2020-08-30
    function MSCH_get_scheme_dict() {
        //console.log( "=== MSCH_get_scheme_dict === ")
        mod_MSCH_dict = {};
        if(!selected.order_pk){selected.scheme_pk = null};

        if(selected.order_pk){
// --- GET SCHEME ----------------------------------
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected.scheme_pk);
        //console.log( "map_dict", map_dict)
            if (isEmpty(map_dict)) {
                selected.scheme_pk = null
    // ---  create new scheme_dict if map_dict is empty, with default cycle = 7
                const new_code = get_schemecode_with_sequence(scheme_map, selected.order_pk, loc.Scheme);
                mod_MSCH_dict = {
                        ppk: selected.order_pk,
                        table: "scheme",
                        code: new_code,
                        cycle: 7,
                        nocycle: false,
                        create: true
                    };
            } else {
                let cycle =  get_dict_value(map_dict, ["cycle", "value"]);
                if (cycle > MAX_CYCLE_DAYS) {cycle = null};
                mod_MSCH_dict = { pk: get_dict_value(map_dict, ["id", "pk"]),
                        ppk: get_dict_value(map_dict, ["id", "ppk"]),
                        table: "scheme",
                        code: get_dict_value(map_dict, ["code", "value"]),
                        cycle: cycle,
                        nocycle: (!cycle),

                        datefirst: get_dict_value(map_dict, ["datefirst", "value"]),
                        datelast: get_dict_value(map_dict, ["datelast", "value"]),

                        excludecompanyholiday: get_dict_value(map_dict, ["excludecompanyholiday", "value"], false),
                        excludepublicholiday: get_dict_value(map_dict, ["excludepublicholiday", "value"], false),
                        divergentonpublicholiday: get_dict_value(map_dict, ["divergentonpublicholiday", "value"], false)
                };
            }
        }
    }  // MSCH_get_scheme_dict

//=========  MSCH_DateChanged  ================ PR2020-01-03
    function MSCH_DateChanged(fldName) {
        //console.log( "===== MSCH_DateChanged  ========= ");
        //console.log( "fldName ", fldName);

        if (fldName === "datefirst") {
            mod_dict.scheme.datefirst = {value: el_MSCH_input_datefirst.value, update: true}
        } else if (fldName === "datelast") {
            mod_dict.scheme.datelast = {value: el_MSCH_input_datelast.value, update: true}
        }
        //console.log( "mod_dict.scheme: ", mod_dict.scheme);
        // ---  set new min max of both date field
        let el_MSCO_date_container = document.getElementById("id_MSCO_date_container")
        //console.log( "el_MSCO_date_container.scheme: ", el_MSCO_date_container);
        // TODO replace similar to MGT_TeammemberDateChanged
        set_other_datefield_minmax(el_MSCO_date_container, fldName);

    }; // MSCH_DateChanged

//=========  MSCH_CheckedChanged  ================ PR2020-04-20
    function MSCH_CheckedChanged(el_input, fldName) {
        //console.log( "===== MSCH_CheckedChanged  ========= ");
        //console.log( "fldName ", fldName);
        mod_dict.scheme[fldName] = {value: el_input.checked, update: true}
        //console.log( "mod_dict ", mod_dict);

// reset other field (in scheme, publicholiday)
        if(["divergentonpublicholiday", "excludepublicholiday"].indexOf(fldName) > -1) {
            // in scheme:  if value of this field is true, set other field false
            if(el_input.checked){
                const other_field_id = (fldName === "divergentonpublicholiday") ? "id_MSCO_excl_ph" : "id_MSCO_also_ph"
                const other_el = document.getElementById(other_field_id)
                if(other_el && other_el.checked){
                    other_el.checked = false;
                    const other_fldName = (fldName === "divergentonpublicholiday") ? "excludepublicholiday" : "divergentonpublicholiday"
                    mod_dict.scheme[other_fldName] = {value: false, update: true}
        }}};

    }; // MSCH_CheckedChanged

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
// reset other field (in scheme, publicholiday)
        if(["divergentonpublicholiday", "excludepublicholiday"].indexOf(fldName) > -1) {
            // in scheme:  if value of this field is true, set other field false
            if(el_input.checked){
                const other_field_id = (fldName === "divergentonpublicholiday") ? "id_MSCO_excl_ph" : "id_MSCO_also_ph"
                const other_el = document.getElementById(other_field_id)
                if(other_el && other_el.checked){
                    other_el.checked = false;
                    const other_fldName = (fldName === "divergentonpublicholiday") ? "excludepublicholiday" : "divergentonpublicholiday"
                    mod_dict.scheme[other_fldName] = {value: false, update: true}
        }}};


    }; // function MSO_PublicholidayChanged

//=========  MSCH_validate_and_disable  ================ PR2020-06-07
    function MSCH_validate_and_disable (el_input) {
        //console.log(" -----  MSCH_validate_and_disable   ---- ")
        //console.log("mod_MSCH_dict", mod_MSCH_dict)

        let has_error = false;
        const input_field = get_attr_from_el(el_input, "data-field")
        //console.log("input_field", input_field)

        const el_nocycle = document.getElementById("id_MSCH_nocycle");
        const el_cycle = document.getElementById("id_MSCH_input_cycle")
// cycle
        // set cycle to default 7 when changed from nocycle to cycle
        if (input_field === "nocycle") {
            if (!el_nocycle.checked && mod_MSCH_dict.nocycle){
                el_cycle.value = 7;
            }
        }

/*
const cycle_int = Number(el_MSO_scheme_cycle.value);
const cycle_value = (!!cycle_int) ? cycle_int : null
mod_dict.scheme.cycle = {value: cycle_value, update: true}
*/

// ---  show error when scheme code is blank
        const no_code_error = (!!document.getElementById("id_MSCH_input_code").value)
        add_or_remove_class(document.getElementById("id_MSCH_err_code"), cls_hide, no_code_error)
        if(!no_code_error){has_error = true}

// ---  show error when cycle not a number or > MAX_CYCLE_DAYS, can be blank
        let cycle = el_cycle.value;
        let nocycle = el_nocycle.checked;
        if (nocycle){
            el_cycle.value = null;
        } else if( Number(cycle) && cycle === 32767) {
            nocycle = true;
            el_nocycle.checked = true;
            el_cycle.value = null;
        }
        el_cycle.readOnly = nocycle;
        let msg_err_cycle = null;
        if(!nocycle){
            // get_number_from_input also checks max_value, gives err_msg when > max
            // arr = [output_value, err_msg];
            const arr = get_number_from_input(loc, "cycle", cycle);
            msg_err_cycle = arr[1];
        }
        if(msg_err_cycle){has_error = true}
        const el_msg_cycle = document.getElementById("id_MSCH_msg_cycle")
        add_or_remove_class(el_msg_cycle, "text-danger", (msg_err_cycle))
        el_msg_cycle.innerText = (msg_err_cycle) ? msg_err_cycle : loc.Cycledays_must_be_between;

// ---  hide checkboxes exph, exch, div_ph when nocycle
        add_or_remove_class(document.getElementById("id_MSCH_div_exphch"), cls_hide, nocycle)
        add_or_remove_class(document.getElementById("id_MSCH_div_dvg_ph"), cls_hide, nocycle)

// only one of excludepublicholiday and divergentonpublicholiday can be true
        const fldName = get_attr_from_el(el_input, "data-field")
        if (["excludepublicholiday", "divergentonpublicholiday"].indexOf(fldName) > -1){
            if (el_input.checked){
                const other_id = (fldName === "excludepublicholiday") ? "id_MSCH_dvg_ph" : "id_MSCH_exph"
                const other_el = document.getElementById(other_id)
                other_el.checked = false;
            }
        }

// ---  create header text
        let header_text = (is_template_mode) ? (!!selected.scheme_pk) ? loc.Edit_template : loc.Add_template :
                                                 (!!selected.scheme_pk) ? loc.Edit_scheme : loc.Add_scheme;
        if(!has_error){
            header_text += "...";
        } else if(!is_template_mode) {
            const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_dict.selected_order_pk)
            const order_code = get_dict_value(order_dict, ["code", "value"]);
            const customer_code = get_dict_value(order_dict, ["customer", "code"]);
            header_text += " " + loc.to + ": " + customer_code + " - " + order_code;
        };
        document.getElementById("id_MSCH_header").innerText = header_text

// ---  disable save button when has_error
        el_MSCH_btn_save.disabled = (has_error);
    }  // MSCH_validate_and_disable

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++  MODAL ABSENCE  +++++++++++++++++++++++++++++++++++++++++

//=========  ModAbsence_Open  ================  PR2020-05-14 PR2020-09-10
    function MAB_Open(el_input) {
        console.log(" =====  MAB_Open =====")
        // when el_input doesn't exist it is a new absence, called by submenu_btn
        // MAB_Save adds 'create' to 'id' when  mod_MAB_dict.teammember.pk = null

        mod_MAB_dict = {};

        // PR2020-11-09 permit_customer_orders may add absence to employees that have shift in his orders
        //if(permit_view_add_edit_delete_absence){

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
        //console.log( "mod_MAB_dict", mod_MAB_dict);

        let tblBody = document.getElementById("id_MAB_tblbody_select");
        tblBody.innerText = null;

        const is_tbl_replacement = (tblName === "replacement");
        const is_tbl_abscat = (tblName === "abscat");

        const hdr_text = (is_tbl_abscat) ? loc.Absence_categories : (is_tbl_replacement) ? loc.Replacement_employee : loc.Employees;
        document.getElementById("id_MAB_hdr_selecttable").innerText = hdr_text;

        const data_map = (is_tbl_abscat) ? abscat_map : employee_map;
        let row_count = 0
        if (data_map.size){
//--- loop through employee_map
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
        console.log("=== MAB_TimepickerOpen ===");
        console.log("mod_MAB_dict", mod_MAB_dict);
        // disabled when no employee or no abscat selected
        const is_disabled = (!mod_MAB_dict.employee_pk || !mod_MAB_dict.order_pk);
        if(!is_disabled){
// ---  create tp_dict
            const fldName = get_attr_from_el(el_input, "data-field");
            //console.log("fldName", fldName);
            const rosterdate = null; // keep rosterdate = null, to show 'current day' instead of Dec 1

            const cur_offset = mod_MAB_dict[fldName];
            const is_absence = true;
            const is_ampm = (loc.timeformat === "AmPm")
            const minmax_offset = mtp_calc_minmax_offset_values(
                fldName, mod_MAB_dict.offsetstart, mod_MAB_dict.offsetend, mod_MAB_dict.breakduration, mod_MAB_dict.timeduration, is_absence);

        console.log("minmax_offset", minmax_offset);
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

// +++++++++++++++++ MODAL COPYFROM TEMPLATE  +++++++++++++++++++++++++++++++
//========= ModCopyTemplateOpen======= PR2020-05-31
    function ModCopyTemplateOpen () {
        if(is_template_mode){
            MCFT_Open ();
        } else {
            ModCopytoTemplateOpen ();
        }
    }
//========= MOD COPY FROM TEMPLATE Open====================================
    function MCFT_Open () {
        console.log("===  MCFT_Open  =====") ;

        // disable btn when templates are shown
        console.log("is_template_mode", is_template_mode) ;
        console.log("selected.scheme_pk", selected.scheme_pk) ;
        console.log("selected.order_pk", selected.order_pk) ;
        console.log("selected.customer_pk", selected.customer_pk) ;

        if(selected.scheme_pk) {  //&&elected.customer_pk) {
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected.scheme_pk)
            const template_scheme_pk = get_dict_value(map_dict, ["id", "pk"])
            const template_scheme_ppk = get_dict_value(map_dict, ["id", "ppk"])
            const template_scheme_code = get_dict_value(map_dict, ["code", "value"])
        console.log("template_scheme_code", template_scheme_code)

// remove 'template' from the scheme name
            const template_str = loc.Template;
            let new_code = null
            // The gi modifier is used to do a case insensitive search of all occurrences of a regular expression in a string.
            if(template_scheme_code){
                const pattern = new RegExp(template_str, "gi");
                new_code = template_scheme_code.replace(pattern, "").trim();
            }
            mod_dict = {
                template_scheme_pk: template_scheme_pk,
                template_scheme_ppk: template_scheme_ppk,
                scheme_code: new_code,
                copyto_order_pk: null,
                copyto_order_ppk: null
                };
        // reset input elements
            el_MCFT_input_order.value = null;
            el_MCFT_input_code.value = new_code
            const template_text = (template_scheme_code) ? "'" + template_scheme_code + "'" : loc.Template.toLowerCase();
            const header_text = loc.Copy + template_text + loc.to_order;
            document.getElementById("id_mod_copyfrom_header").innerText = header_text
// ---  fill SelectTable Custorder
            MSCO_FillSelectTableCustOrder("mcft");
              // selected.order_pk is the order to which de template scheme will be copied.
        // cannot copy if selected.order_pk is blank
            el_MCFT_btn_save.readOnly = (!selected.order_pk)
// ---  show modal
            $("#id_mod_copyfrom").modal({backdrop: true});
        }  //  if(!!selected.order_pk && selected.customer_pk) {
    }; // function MCFT_Open

//=========  ModCopyfromTemplateSave  ================ PR2019-07-24
    function MCFT_Save() {
        console.log("=========  MCFT_Save =========");
        let newscheme_code = document.getElementById("id_mod_copyfrom_code").value;
        const dict = {id: {pk: mod_dict.template_scheme_pk,
                           ppk: mod_dict.template_scheme_ppk,
                           istemplate: true, table: "scheme", mode: "copyfrom"},
                      copyto_order: {pk: mod_dict.copyto_order_pk,
                                     ppk: mod_dict.copyto_order_ppk},
                      code: {value: newscheme_code, update: true}
                     }
        const upload_dict = {"copyfromtemplate": dict};
        UploadChanges(upload_dict, url_scheme_template_upload)
        $("#id_mod_copyfrom").modal("hide");
    }  // MCFT_Save

//=========  MCFT_SelectOrder  ================ PR2019-11-22
    function MCFT_SelectOrder(tr_clicked) {
        console.log( "===== MCFT_SelectOrder ========= ", tr_clicked);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.remove("tsa_bc_transparent")
            tr_clicked.classList.add(cls_selected)

    // add pk_int to mod_dict
            const map_id = get_attr_from_el(tr_clicked, "data-map_id");
            const item_dict = scheme_map.get(map_id);
            const pk_int = get_dict_value(item_dict, ["id", "pk"])
            const ppk_int = get_dict_value(item_dict, ["id", "ppk"])
            const code = get_dict_value(item_dict, ["code", "value"])
            //console.log( "item_dict", item_dict);

            const template_txt = " " + loc.Template.toLowerCase();
            let code_txt = code.replace(template_txt,"");
            document.getElementById("id_mod_copyfrom_code").value = code_txt

            mod_dict.copyto_order_pk = pk_int;
            mod_dict.copyto_order_ppk = pppk_int;

            // Set focus to el_MCFT_input_code
        //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){
                el_MCFT_input_code.focus()
            }, 500);

        }
    }  // MCFT_SelectOrder

//=========  MCFT_InputElementKeyup  ================ PR2020-05-15
    function MCFT_InputElementKeyup(el_input) {
        console.log( "=== MCFT_InputElementKeyup  ")
        console.log( "mod_dict", mod_dict)

        const new_filter = el_input.value
        let tblBody_select = document.getElementById("id_mod_copyfrom_tblbody");
        if (tblBody_select && tblBody_select.rows.length && new_filter){
// ---  filter select rows
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
        console.log( "filter_dict", filter_dict)
// ---  get pk of selected item (when there is only one row in selection)
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (only_one_selected_pk) {
                let selected_order_pk = null;
// ---  highlight clicked row
                t_HighlightSelectedTblRowByPk(tblBody_select, only_one_selected_pk)
                //MAB_SetEmployeeDict(only_one_selected_pk);
// ---  put code_value in el_input_employee
                el_input.value =  get_dict_value(filter_dict, ["selected_value"])
// ---  enable el_shift, set focus to el_shift
                set_focus_on_el_with_timeout(el_MCFT_btn_save, 50)
    // ---  enable btn_save and input elements
                MAB_BtnSaveEnable();
            }  //  if (!!selected_pk) {
        }
    }  // MCFT_InputElementKeyup

 function ModCopyfromTemplateValidateBlank(){
    let el_err = document.getElementById("id_mod_copyfrom_template_select_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_template_select");
    return validate_select_blank(el_mod_copyfrom_template_select, el_err, msg_blank, true) // true = skip first option (Select template...)
 }

  function ModTemplateCopyfromValidateCustomerBlank(){
    //let el_err = document.getElementById("id_mod_copyfrom_customer_err");
    //const msg_blank = get_attr_from_el(el_data, "data-err_msg_customer");
    //return validate_select_blank(el_mod_copyfrom_cust, el_err, msg_blank, true) // true = skip first option (Select template...)
 }

  function ModTemplateCopyfromValidateOrderBlank(){
    //console.log(" --- ModTemplateCopyfromValidateOrderBlank ---")
    //let el_err = document.getElementById("id_mod_copyfrom_order_err");
    //const msg_blank = get_attr_from_el(el_data, "data-err_msg_order");
   // const dict = validate_select_blank(el_MCFT_input_order, el_err, msg_blank, true) // true = skip first option (Select template...)
    //console.log(dict)
    //return dict
 }

 function ModTemplateCopyfromValidateSchemeCode(){
    let el_err = document.getElementById("id_mod_copyfrom_code_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_code");
    const msg_exists = get_attr_from_el(el_data, "data-err_msg_name_exists");
    // TODO correct
    const err_schemecode = validate_input_code(el_MCFT_input_code, el_err, scheme_map, msg_blank, msg_exists)
    // TODO correct
    return validate_input_code(el_MCFT_input_code, el_err, scheme_map, msg_blank, msg_exists)
 }

// NIU??
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
    function validate_input_code(el_input, el_err, data_map, msg_blank, msg_exists){
        //console.log("=========  validate_input_code ========= ");
        //console.log(data_map);
        // functions checks if input.value is blank or already exists in data_map
        let msg_err = null, new_code = null;

        if(!el_input.value){
            msg_err = msg_blank;
        } else {
            new_code = el_input.value
// check if new_code already exists in scheme_map

// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_dict_value (item_dict, ["id", "pk"])
                const ppk_int = get_dict_value (item_dict, ["id", "ppk"])
                const code_value = get_dict_value(item_dict, ["code", "value"]);
                if (new_code.toLowerCase() === code_value.toLowerCase()) {
                    msg_err = msg_exists;
                    break;
                }
            }
        }
        formcontrol_err_msg(el_input, el_err, msg_err)
        return {"code": new_code, "error": (!!msg_err)}
    }  // validate_input_code


//========= ModCopyfromTemplateEdit====================================
    function ModCopyfromTemplateEdit () {
        // TODO validate
    }

//========= ModalTemplateCopyfrom====================================
    function ModalTemplateCopyfrom () {
        console.log("===  ModalTemplateCopyfrom  =====") ;
        let has_error = false;

        //let return_dict = ModCopyfromTemplateValidateBlank()
        //const template_code = return_dict["code"];
        //const err_template = return_dict["error"];
        //el_MCFT_input_code.value = template_code;

        //return_dict = ModTemplateCopyfromValidateCustomerBlank()
        //const err_customer = return_dict["error"];

        //return_dict = ModTemplateCopyfromValidateOrderBlank()
        //const err_order = return_dict["error"];

       // return_dict = ModTemplateCopyfromValidateSchemeCode();
        //const new_code = return_dict["code"];
        //const err_code = return_dict["error"];

        // = (err_template || err_customer || err_order || err_code);
        //el_MCFT_btn_save.disabled = has_error

        if(!has_error) {

            $("#id_modscheme").modal("hide");
// get template pk from modal select
            const template_pk = 0 // = parseInt(el_mod_copyfrom_template_select.value)

    // get template ppk from scheme_template_list
            let template_ppk;
            if(!!template_pk) {
                for(let i = 0, dict, pk_int, len = scheme_template_list.length; i < len; i++){
                    dict = scheme_template_list[i];
                    pk_int = get_dict_value(dict, ["pk"])
                    if(pk_int === template_pk){
                        template_ppk = get_dict_value(dict,["id", "ppk"])
                        break;
                    }
                } // for(let i = 0,
            }  // if(!!template_pk)

// get copyto ppk from selected order
            let selected_order_ppk;
            if(!!selected.order_pk) {
    // get template ppk and ppk from scheme_template_list

// --- loop through scheme_map
                for (const [map_id, item_dict] of scheme_map.entries()) {
                    const pk_int = get_dict_value (item_dict, ["id", "pk"])
                    const ppk_int = get_dict_value (item_dict, ["id", "ppk"])
                    if(pk_int === selected.order_pk){
                        selected_order_ppk = ppk_int
                        break;
                    }
                }
            }  // if(!!selected.order_pk)

// get rosterdate of cyclestart record from schemeitem_template_list
            //let new_datestart;
            //if(!!el_mod_copyfrom_datestart.value){ new_datestart = el_mod_copyfrom_datestart.value }
            //console.log("new_datestart", new_datestart);
            const template_code = el_MCFT_input_code.value
            const dict ={"id": {"pk": template_pk, "ppk": template_ppk, table: "template_scheme"}}
            if (!!template_code){
                dict["code"] = {"value": template_code, "update": true}
                dict["order"] = {"pk": selected.order_pk}
            }
            let parameters = {copyfromtemplate: JSON.stringify (dict)};
            console.log("parameters");

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_template_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);
                    if ("scheme_list" in response) {
                        b_refresh_datamap(response["scheme_list"], scheme_map)
                        is_template_mode = false;
                        HandleBtnSelect();
                    }
                },
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  //  if(!has_error)

    }; // function ModalTemplateCopyfrom

//========= ModCopytoTemplateOpen====================================
    function ModCopytoTemplateOpen () {
       console.log("===  ModCopytoTemplateOpen  =====") ;
       //console.log("selected.scheme_pk: ", selected.scheme_pk) ;

        // disable btn when templates are shown
        if(!is_template_mode){
            let el_input = document.getElementById("id_mod_copyto_code")
            el_input.innerText = null

        // get selected scheme from scheme_map
            if (!!selected.scheme_pk){

                const map_id = get_map_id("scheme", selected.scheme_pk);
                let item_dict = get_mapdict_from_datamap_by_id(scheme_map, map_id)
                let code_txt = get_dict_value (item_dict, ["code", "value"], "") + " " + loc.Template.toLowerCase()
                el_input.value = code_txt

                ModCopytoTemplateEdit();

                document.getElementById("id_mod_copyto_btn_save").disabled = false;

        // ---  show modal
                $("#id_mod_copyto").modal({backdrop: true});
            }
        }
}; // function ModCopytoTemplateOpen

//=========  ModCopytoTemplateEdit  ================ PR2019-07-20
    function ModCopytoTemplateEdit() {
        //console.log("=========  ModCopytoTemplateEdit =========");

        let el_input = document.getElementById("id_mod_copyto_code");
        let value = el_input.value
        let msg_err = null;

        if(!value){
            msg_err = loc.err_msg_template_blank;
        } else {
// --- loop through data_map
            let exists = false;
            for (const [map_id, item_dict] of scheme_map.entries()) {
                const is_template = get_dict_value(item_dict, ["id", "istemplate"], false)
                const code = get_dict_value(item_dict, ["code", "value"])
                if(is_template){
                    if (value.toLowerCase() === code.toLowerCase()) {
                        exists = true;
                        break;
                    }
                }
            }
            if (exists){
                msg_err = loc.err_msg_name_exists;
            }
        }
        let el_err = document.getElementById("id_mod_copyto_code_err")
        formcontrol_err_msg(el_input, el_err, msg_err)

        document.getElementById("id_mod_copyto_btn_save").disabled = (!!msg_err)

    }  // ModCopytoTemplateEdit

//=========  ModalCopytoTemplateSave  ================ PR2019-07-24
    function ModalCopytoTemplateSave() {
        console.log("=========  ModalCopytoTemplateSave =========");

        const dict ={id: {pk: selected.scheme_pk, ppk: selected.order_pk,
                        istemplate: true, table: "scheme", mode: "copyto"}}

        let template_code = document.getElementById("id_mod_copyto_code").value
        if (!!template_code){
            dict["code"] = {value: template_code, update: true}
        }
        let upload_dict = {copytotemplate: dict};

        $("#id_mod_copyto").modal("hide");

        UploadChanges(upload_dict, url_scheme_template_upload)
    }  // ModalCopytoTemplateSave


//###########################################################################
// ++++++++++++  TIMEPICKER +++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleTimepickerOpen  ====================================
    // TODO to be used in table teammember
    function HandleTimepickerOpeXXXn(el_input) {
        console.log("===  HandleTimepickerOpen  =====");

        let tr_selected = get_tablerow_selected(el_input);
        HandleTableRowClicked(tr_selected);

        const shift_dict = get_mapdict_from_datamap_by_el(el_input, shift_map);
        if(!isEmpty(shift_dict)){


// ---  create tp_dict
            const fldName = get_attr_from_el(el_input, "data-field");
            const id_dict = get_dict_value(shift_dict, ["id"])

            const rosterdate = null; // shift_dict has no rosterdate
            const offset = get_dict_value(shift_dict, [fldName, "value"])
            const minoffset = get_dict_value(shift_dict, [fldName, "minoffset"])
            const maxoffset = get_dict_value(shift_dict, [fldName, "maxoffset"])
            const is_ampm = (loc.timeformat === "AmPm")

            let tp_dict = { field: fldName,
                            page: "TODO",
                            id: id_dict,
                            rosterdate: rosterdate,
                            offset: offset,
                            minoffset: minoffset,
                            maxoffset: maxoffset,
                            isampm: is_ampm,
                            quicksave: is_quicksave
                          };

            console.log("tp_dict", tp_dict);

// ---  create st_dict
            const show_btn_delete = true;
            const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
                    const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ? loc.Working_hours : null
            let st_dict = { url_settings_upload: url_settings_upload,
                            text_curday: loc.Current_day, text_prevday: loc.Previous_day, text_nextday: loc.Next_day,
                            txt_dateheader: txt_dateheader, txt_title_btndelete: loc.Remove_time,
                            txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                            show_btn_delete: show_btn_delete};
            console.log("st_dict", st_dict);

            mtp_TimepickerOpen(loc, el_input, UploadTimepickerChanged, tp_dict, st_dict)

        }  //  if(!!pk_int)

    }; // function HandleTimepickerOpen

//##################################################################################
// +++++++++++++++++ PRINT PLANNING ++++++++++++++++++++++++++++ PR2020-11-04
    function HandlePrintPlanning(option, planning_agg_dict){
        // function creates list in format needed for print planning  PR2020-10-12
        console.log(" === HandlePrintPlanning ===")
        //console.log("employee_planning_selected_employee_pk", employee_planning_selected_employee_pk)
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
    //console.log( "item", item);

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


// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen=================== PR2020-07-12
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_planning_period", selected_planning_period) ;
        mod_dict = selected_planning_period;

// ---  fill select table period
        t_CreateTblModSelectPeriod(loc, ModPeriodSelectPeriod);

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

        set_focus_on_el_with_timeout(el_mod_period_btn_save);

// ---  show modal
        $("#id_mod_period").modal({backdrop: true});
}; // function ModPeriodOpen

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
        // remeber to print planning when info is back from server
        employee_planning_print_ispending = true;

        let employee_planning_dict = {
            employee_pk: (!!selected.employee_pk) ? selected.employee_pk : null,
            add_shifts_without_employee: false,
            skip_restshifts: false,
            orderby_rosterdate_customer: false
        };
        let datalist_request = {planning_period: selected_planning_period,
                                //employee_planning: employee_planning_dict
                                employee_planningNEW: {order_pk: selected.order_pk}
                                //employee_planningNEW: {mode: "get"}
                                };
        DatalistDownload(datalist_request);

        $("#id_mod_period").modal("hide");
    }

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

// +++++++++++++++++ end of PRINT PLANNING ++++++++++++++++++++++++++++
//##################################################################################


//###########################################################################
// +++++++++++++++++ FILTER +++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, event) {
        //console.log( "===== HandleFilterName  ========= ");

        //console.log( "el.value", el.value, index, typeof index);
        //console.log( "el.filter_dict", filter_dict, typeof filter_dict);
        // skip filter if filter value has not changed, update variable filter_text

// --- reset filter when clicked on 'Escape'
        let skip_filter = false
        if (event.key === "Escape") {
            filter_dict = {}

            let tblRow = get_tablerow_selected(el);
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    el.value = null
                }
            }
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
        //console.log( " filter_dict ", filter_dict);

        if (!skip_filter) {
            FilterTableRows_dict();
        } //  if (!skip_filter) {


    }; //  HandleFilterName

//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict() {  // PR2019-06-09
        //console.log( "===== FilterTableRows_dict  ========= ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tblBody_datatable.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody_datatable.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow_dict(tblRow)
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        };
    }; // FilterTableRows_dict

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15
        // console.log( "===== ShowTableRow_dict  ========= ");
        //console.log( tblRow);
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
        if (!!tblRow){
            const pk_str = get_attr_from_el(tblRow, "data-pk");

    // check if row is_new_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select customer has no id in tblrow)
            let is_new_row = false;
            if(!!pk_str){
    // skip new row (parseInt returns NaN if value is None or "", in that case !!parseInt returns false
                is_new_row = (!parseInt(pk_str))
            }
            //console.log( "pk_str", pk_str, "is_new_row", is_new_row, "show_inactive",  show_inactive);
            if(!is_new_row){
            // show inactive rows if filter_show_inactive
            /* TODO filter status
                if(col_inactive !== -1 && !show_inactive) {
                    // field 'inactive' has index col_inactive
                    let cell_inactive = tblRow.cells[col_inactive];
                    if (!!cell_inactive){
                        let el_inactive = cell_inactive.children[0];
                        if (!!el_inactive){
                            let value = get_attr_from_el(el_inactive,"data-value")
                            if (!!value) {
                                if (value.toLowerCase() === "true") {
                                    show_row = false;
                                }
                            }
                        }
                    }
                }; // if(col_inactive !== -1){
            */

// show all rows if filter_name = ""
            // console.log(  "show_row", show_row, "filter_name",  filter_name,  "col_length",  col_length);
                if (!hide_row){
                    Object.keys(filter_dict).forEach(function(key) {
                        const filter_text = filter_dict[key];
                        const filter_blank = (filter_text ==="#")
                        let tbl_cell = tblRow.cells[key];
                        //console.log( "tbl_cell", tbl_cell);
                        if(!hide_row){
                            if (!!tbl_cell){
                                let el = tbl_cell.children[0];
                                if (!!el) {
                            // skip if no filter om this colums
                                    if(!!filter_text){
                            // get value from el.value, innerText or data-value
                                        const el_tagName = el.tagName.toLowerCase()
                                        let el_value;
                                        if (el_tagName === "select"){
                                            //el_value = el.options[el.selectedIndex].text;
                                            el_value = get_attr_from_el(el, "data-value")
                                        } else if (el_tagName === "input"){
                                            el_value = el.value;
                                        } else {
                                            el_value = el.innerText;
                                        }
                                        if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                        //console.log( "el_value", el_value);
                                        if (!!el_value){
                                            if (filter_blank){
                                                hide_row = true
                                            } else {
                                                el_value = el_value.toLowerCase();
                                                // hide row if filter_text not found
                                                if (el_value.indexOf(filter_text) === -1) {
                                                    hide_row = true
                                                }
                                            }
                                        } else {
                                            if (!filter_blank){
                                                hide_row = true
                                            } // iif (filter_blank){
                                        }   // if (!!el_value)

                                        //console.log( "hide_row: ", hide_row);
                                    }  //  if(!!filter_text)
                                }  // if (!!el) {
                            }  //  if (!!tbl_cell){
                        }  // if(!hide_row){
                    });  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict


//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-06-02
        console.log( "===== ResetFilterRows  ========= ");
        filter_name = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        //selected_customer_pk = 0;
        //selected_order_pk = 0;

        const tblName = get_tblName_from_selectedBtn(selected_btn);
        // TODO not finished yet
// reset filter tblBody_datatable
    // reset filter tBody_customer

        t_Filter_TableRows(tblBody_datatable,tblName, filter_dict, filter_show_inactive, false);

        if (!!tblName){

// reset filter of tblHead
            b_reset_tblHead_filterRow(tblHead_datatable);

//--- reset filter of select table
            //t_reset_tblSelect_filter ("id_filter_select_input", "id_filter_select_btn", imgsrc_inactive_lightgrey)

           // t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)
            //t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

// --- save selected_customer_pk in Usersettings
            //const upload_dict = {selected_pk: {sel_customer_pk: selected_customer_pk, sel_order_pk: selected_order_pk}};
            //UploadSettings (upload_dict, url_settings_upload)

//--- reset highlighted
            // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
            //if(tblName === "customer"){
            //    ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
           // } else if(tblName === "order"){
           //     ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
           //     ChangeBackgroundRows(tblBody_select_order, cls_bc_lightlightgrey);

           // }

           // UpdateHeaderText();

        }  //  if (!!tblName){

    }  // function ResetFilterRows

//###########################################################################
// +++++++++++++++++ OTHER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleEventKey  ====================================
    function HandleEventKey(event_key, event_shiftKey){
        console.log(" --- HandleEventKey ---")

        console.log("select.tblRow_rowIndex", selected.tblRow_rowIndex)
        console.log("event_key", event_key)
        // event_shiftKey = true when shift key is pressed. Used for Shift+Tab (not in use yet

        if (["ArrowUp", "ArrowDown"].indexOf(event_key) > -1) {
            const add_index = (event_key === "ArrowUp") ? -1 : 1;
            const new_index = selected.tblRow_rowIndex + add_index
            // row index 0 is header, index 1 is filter row
            if (new_index > 1) {
                const datatable = tblBody_datatable.parentNode;
                const tblRow = datatable.rows[new_index];
                if(tblRow){ HandleTableRowClicked(tblRow, true)}; // true = skip_highlight_selectrow
            }
        } else  if (["Tab", "ArrowLeft", "ArrowRight"].indexOf(event_key) > -1) {

        } else  if (event_key === "Enter") {
            const skip_while_modal = (mod_dict.page === "modabsence")
            if(!skip_while_modal){
            const tblRow = document.getElementById(selected.mapid)
                if(tblRow){
                    // function MAB_Open checks for permit_view_add_edit_delete_absence
                    MAB_Open(tblRow);
                }
            }
        }

    }  // HandleEventKey

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_dict", setting_dict)
        // only called at opening of page

        selected_btn = get_dict_value(setting_dict, ["sel_btn"], "btn_grid");

// ---   <PERMIT> PR2020-11-07
        // permits get value when setting_dict is downloaded
        // when allowed_customers = [] it is truely, therefore check also allowed_customers.length
        allowed_customers = setting_dict.requsr_perm_customers
        allowed_orders = setting_dict.requsr_perm_orders
        // empty array [] is truely, therefore check also array.length
        has_allowed_customers = (!!allowed_customers && !!allowed_customers.length);
        has_allowed_orders = (!!allowed_orders && !!allowed_orders.length);
// ---  show/hide absence btn
        // PR2020-11-09 permit_customer_orders may add absence to employees that have shift in his orders
        //show_hide_element_by_id("id_btn_absence", permit_view_add_edit_delete_absence)

// ---  change selected_btn if necessary
        //if (!permit_view_add_edit_delete_absence && selected_btn === "btn_absence") {selected_btn = "btn_grid"}

        // these variables store pk of customer / order from setting.
        // They are used in HandleSelectCustomer to go to saved customer / order
        // field type is integer
        settings.order_pk = get_dict_value(setting_dict, ["sel_order_pk"], 0);
        settings.scheme_pk = get_dict_value(setting_dict, ["sel_scheme_pk"], 0);

        // selected.customer_pk can also contain pk of template customer,
        // settings.customer_pk only contains normal customers
        selected.customer_pk = settings.customer_pk;
        selected.order_pk = settings.order_pk;
        selected.scheme_pk = settings.scheme_pk;

// put grid_range in selected, default = 1 (1 week)
        // PR2021-01-02 selected.grid_range gets value after downloading setting_dict and after btn_goto clicked
        selected.grid_range = get_dict_value(setting_dict, ["grid_range"], 1);

        //console.log("selected_btn", selected_btn)
        //console.log("selected", selected)
    }  // UpdateSettings

//========= UpdateHeaderText  ================== PR2019-11-23
    function UpdateHeaderText(calledby){
        //console.log(" --- UpdateHeaderText ---", calledby )

        // from fill select order
        let header_text = "", hdr_right_text = "";
        let select_order_header_text = loc.Select_customer_and_order + "...";
        if(is_template_mode){
            header_text = loc.Template + ":  "
        } else if(selected_btn === "btn_absence"){
            header_text = loc.Absence
        } else {
            let pk_int = null;
            if(!!selected.order_pk){
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected.order_pk)
                pk_int = get_dict_value(map_dict, ["id", "pk"])

                const order_code = get_dict_value(map_dict, ["code", "value"], "")
                const customer_code = get_dict_value(map_dict, ["customer", "code"], "")
                header_text += customer_code + "  -  " + order_code;
                select_order_header_text = header_text;
            }
            // if selected.order_pk not found in order_map: reset
            if (!pk_int) {
                selected.order_pk = 0
                selected.customer_pk = 0
                selected.scheme_pk = 0

                // check if any orders
                let has_records = false;
                if(!!order_map.size){
                // --- loop through order_map
                    for (const [map_id, item_dict] of order_map.entries()) {
                        //istemplate: {value: true}
                        const is_template = get_dict_value(item_dict, ["istemplate", "value"], false)
                        if (is_template === is_template_mode) {
                            has_records = true;
                            break;
                        }
                    }
                }
                header_text = (has_records) ? loc.Select_customer_and_order + "..." : loc.No_orders;
                select_order_header_text = header_text;
            }
        }

// ---  update text of sidebar select customer-order  -- without scheme
        el_sidebar_select_order.value = header_text;
// get scheme name and cycle
        let scheme_dict = {};
        if(!!selected.scheme_pk){
            scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map,"scheme", selected.scheme_pk)
            const code = get_dict_value(scheme_dict, ["code", "value"])
            const cycle = get_dict_value(scheme_dict, ["cycle", "value"])

            // PR20202-07-15 debug. Must check if selected.order_pk equals scheme.order_pk, to prevent showing wrong scheme
            const scheme_order_pk = get_dict_value(scheme_dict, ["id", "ppk"]);
            if (scheme_order_pk === selected.order_pk){
                if(code){
                    if(!is_template_mode && !!header_text) {header_text += "  -  "};
                    header_text +=  code;
                }
                if(cycle){
                    if (cycle === 32767){
                        hdr_right_text = loc.No_cycle;
                    } else {
                        hdr_right_text = cycle.toString() + "-" + loc.days_cycle;
                    }
                }
            }
        }
        document.getElementById("id_hdr_text").innerText = header_text;
        document.getElementById("id_hdr_right_text").innerText = hdr_right_text;
    }   //  UpdateHeaderText

//========= get_mapdict_from_tblRow  ================== PR2019-10-30
    function get_mapdict_from_tblRow(tblRow){
        // function returns map_dict of this tblRow and map_id
        let map_dict;
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id = get_map_id(tblName, pk_str);
            if (tblName === "scheme"){ map_dict = scheme_map.get(map_id)} else
            if (tblName === "schemeitem") { map_dict = schemeitem_map.get(map_id)} else
            if (tblName === "shift") { map_dict = shift_map.get(map_id)} else
            if (tblName === "team") { map_dict = team_map.get(map_id)} else
            if (tblName === "teammember") { map_dict = teammember_map.get(map_id)} else
            if (tblName === "absence") { map_dict = absence_map.get(map_id)};
        }
        return map_dict
    }  // get_mapdict_from_tblRow


//========= update_map_item_local  ====================================
    function update_map_item_local(tblName, map_id, update_dict, is_deleted){  // PR2019-12-01 PR2020-05-31
        console.log(" --- update_map_item_local ---")
        console.log("tblName", tblName)
        console.log("map_id", map_id);
        console.log("is_deleted", is_deleted);
        console.log("update_dict", update_dict);


        // called by Grid_UpdateFromResponse_si, Grid_UpdateFromResponse_team, Grid_UpdateFromResponse_teammember,
        // Grid_UpdateFromResponse_shift, UpdateFromResponse_datatable_shift, UpdateFromResponse

        if(tblName && map_id && !isEmpty(update_dict)){

// ---  get  is_deleted from parameters
        // 'deleted'  is already removed by remove_err_del_cre_updated__from_itemdict, therefore use parameters

// ---  replace updated item in map or remove deleted item from map
            let data_map = (tblName === "scheme") ? scheme_map :
                           (tblName === "shift") ? shift_map :
                           (tblName === "team") ? team_map :
                           (tblName === "schemeitem") ? schemeitem_map :
                           (tblName === "teammember") ? teammember_map :
                           (tblName === "absence") ? absence_map : null

            console.log("data_map.size before: " + data_map.size)
// ---  remove deleted item from map
            if(is_deleted){
                if(!!data_map.size){
                    data_map.delete(map_id);
                }
            } else{
// ---  update or insert item in map
                // alphabetical order not necessary, will be done when inserting rows in table
                data_map.set(map_id, update_dict)
            }

            console.log("data_map.size after: " + data_map.size)
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id )
            console.log("data_map after update: " , data_map)

        }  // if(!isEmpty(id_dict))
    }  // update_map_item_local


//========= DatetimeWithinRange  ====================================
    function DatetimeWithinRange(cur_datetime, min_datetime, max_datetime) {
    // PR2019-07-07
        // within_range = false when cur_datetime is null
        let within_range = (!!cur_datetime);
        // within_range = false when min_datetime exists and cur_datetime < min_datetime
        if (within_range && !!min_datetime){
            if (cur_datetime.diff(min_datetime) < 0){
                within_range = false;
            }
        }
        // within_range = false when max_datetime exists and cur_datetime > min_datetime
        if (within_range && !!max_datetime){
            if (cur_datetime.diff(max_datetime) > 0){
                within_range = false;
            }
        }
        return within_range
    }  // DatetimeWithinRange

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//grid layout

//========= Grid_Reset  ==================== PR2020-07-02
    function Grid_Reset() {
        //console.log(" === Grid_Reset ===") // PR2020-07-06
        // function is called by Grid_FillGrid, UpdateTablesAfterResponse, HandleSubmenubtnTemplateShow, HandleSelectOrder
// ---  reset grid_dict
        grid_dict = {}
// ---  reset grid_tbody_team and el_grid_tbody_shift
        el_grid_tbody_team.innerText = null;
        el_grid_tbody_shift.innerText = null;
// ---  reset fields in scheme box of grid
        let elements = document.getElementById("id_grid_scheme_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = elements[i]; i++) {
            const fldName = get_attr_from_el(el,"data-field");
            let display_text = ""
            if(fldName === "code") {
                display_text = loc.Scheme + "..."
            } else if(fldName === "cycle") {
                display_text = loc.Cycle + "..."
            }
            el.innerText = display_text;
        }
    }  // Grid_Reset

//========= Grid_UpdateSchemeFields  ====================================
    function Grid_UpdateSchemeFields(scheme_dict) {
        //console.log(" === Grid_UpdateSchemeFields ===") // PR2020-07-06

// ---  get value from scheme_dict
        const scheme_pk = get_dict_value(scheme_dict, ["id", "pk"]);
        const scheme_code = get_dict_value(scheme_dict, ["code", "value"]);
        const cycle = get_dict_value(scheme_dict, ["cycle", "value"]);
        const nocycle = (!cycle || (Number(cycle) && cycle === 32767) )
        const datefirst_iso = get_dict_value(scheme_dict, ["datefirst", "value"], "")
        const datelast_iso = get_dict_value(scheme_dict, ["datelast", "value"], "")
        const excl_ph = get_dict_value(scheme_dict, ["excludepublicholiday", "value"], false);
        const dvg_onph = get_dict_value(scheme_dict, ["divergentonpublicholiday", "value"], false);
        const excl_ch = get_dict_value(scheme_dict, ["excludecompanyholiday", "value"], false)

// ---  loop through buttons / fields in scheme box of grid
        let elements = document.getElementById("id_grid_scheme_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = elements[i]; i++) {
            const fldName = get_attr_from_el(el,"data-field");
            let is_updated = get_dict_value(scheme_dict, [fldName, "updated"], false);
            let value = get_dict_value(scheme_dict, [fldName, "value"]);
            // temporarily remove current background of element when updated
            let cur_class = (["code", "cycle"].indexOf(fldName)> -1) ? cls_bc_yellow_lightlight : null;
            let display_text = "-"
            if(fldName === "code") {
                display_text = (value) ? value : loc.Scheme + "..."
            } else if(fldName === "cycle") {
                if(!value)
                    display_text = loc.Cycle + "..."
                if (value === 32767) {
                    display_text = loc.No_cycle;
                } else if(value) {
                    display_text = value.toString() + "-" + loc.days_cycle;
                }
            } else if(fldName === "datefirstlast") {
                const datefirst_iso = get_dict_value(scheme_dict, ["datefirst", "value"]);
                const datelast_iso = get_dict_value(scheme_dict, ["datelast", "value"]);
                is_updated = ( get_dict_value(scheme_dict, ["datefirst", "updated"], false) ||
                               get_dict_value(scheme_dict, ["datelast", "updated"], false) );
                let prefix = loc.Period + ": ";
                if(datefirst_iso && datelast_iso) {
                    display_text = f_get_periodtext_sidebar(loc, datefirst_iso, datelast_iso);
                } else if(datefirst_iso) {
                    prefix += loc.As_of_abbrev.toLowerCase()
                    display_text = f_get_periodtext_sidebar(loc, datefirst_iso, datelast_iso);
                } else if(datelast_iso) {
                    prefix += loc.Through.toLowerCase()
                    display_text = f_get_periodtext_sidebar(loc, datefirst_iso, datelast_iso);
                } else {
                    display_text = prefix + loc.All.toLowerCase()
                }
            } else if(fldName === "dvg_excl_ph") {
                const excl_ph =  get_dict_value(scheme_dict, ["excludepublicholiday", "value"], false);
                const dvg_onph =  get_dict_value(scheme_dict, ["divergentonpublicholiday", "value"], false);
                display_text = (excl_ph) ? loc.Not_on_public_holidays : (dvg_onph)
                                      ? loc.Divergent_shift_on_public_holidays
                                      : loc.Also_on_public_holidays;
            } else if(fldName === "excludecompanyholiday") {
                display_text = (excl_ch) ? loc.Not_on_company_holidays : loc.Also_on_company_holidays;
            }
            el.innerText = display_text
            if (["dvg_excl_ph", "excludecompanyholiday"].indexOf(fldName) > -1) {
                add_or_remove_class(el, cls_visible_hide, nocycle )
            }
            if(is_updated){ShowOkElement(el, "border_bg_valid", cur_class)};
        };

// ---  put values of scheme in grid_dict.scheme
        grid_dict.scheme = {
            pk: scheme_pk,
            code: scheme_code,
            cycle: cycle,
            datefirst: datefirst_iso,
            datelast: datelast_iso,
            exph: excl_ph,
            exch: excl_ch,
            dvg_onph: dvg_onph};

    } // Grid_UpdateSchemeFields

//========= Grid_FillGrid  ====================================
    function Grid_FillGrid(mode) {
        console.log(" === Grid_FillGrid ===") // PR2020-03-13
        // function is called by HandleBtnSelect, HandleSelect_Row, UpdateFromResponse
        // fills scheme etc of selected.scheme_pk

// ---  reset grid_dict, fields in scheme_box, grid_tbody_team and grid_tbody_shift
        Grid_Reset();

// ---  get scheme_pk value from scheme_dict
        const scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected.scheme_pk);
        if (!isEmpty(scheme_dict)){
            // PR20202-07-15 debug. Must check if selected.order_pk equals scheme.order_pk, to prevent showing wrong scheme
            const scheme_order_pk = get_dict_value(scheme_dict, ["id", "ppk"]);
            if (scheme_order_pk === selected.order_pk){
                grid_dict.scheme_pk = get_dict_value(scheme_dict, ["id", "pk"]);
                grid_dict.cycle = get_dict_value(scheme_dict, ["cycle", "value"], 32767);
                grid_dict.dvg_onph = get_dict_value(scheme_dict, ["divergentonpublicholiday", "value"], false)
                grid_dict.nocycle = (!grid_dict.cycle || grid_dict.cycle > MAX_CYCLE_DAYS)
                if (grid_dict.nocycle){ grid_dict.cycle = 0 }

// ---  get grid_range PR2021-01-02
        // - grid_range is stored in selected.grid_range, not in grid_dict.grid_range
        // - grid_range gets value in UpdateSettings and when clicked on btn_goto
        // - grid_range stays the same when switched between schemes

                grid_dict.grid_range = (selected.grid_range) ? selected.grid_range : 1;

// ---  put scheme values in scheme section, and in grid_dict.scheme
                Grid_UpdateSchemeFields(scheme_dict);

// ---  create grid teams and shift table
                Grid_FillTblTeams();  // functions also fills grid_teams_dict
                Grid_FillTblShifts();
            }
        }
    }  // Grid_FillGrid

//=========  Grid_FillTblTeams  === PR2020-03-13 PR2021-01-08
    function Grid_FillTblTeams() {
        console.log("===  Grid_FillTblTeams == ");
        // called by Grid_FillGrid, Grid_UpdateFromResponse_team, Grid_UpdateFromResponse_teammember
        // functions also fills grid_teams_dict
        // fills  scheme with grid_dict.scheme_pk

// ---  reset el_grid_tbody_team
        let tblBody = el_grid_tbody_team;
        tblBody.innerText = null

        grid_teams_dict = {};

/*  structure of  grid_teams_dict:  {team_pk: { id: {col:, rowid:, code:}, tm_pk: {row:, row_id:, display:}, ..}
       - keys are team_pk's,
       - value has id_dict:  {id: {col: index, row_id: id, code: team_code, abbrev: abbrev}};
                              key = tm_pk for every teammember of team
       2376: { id: {col: 4, row_id: "team_2376", code: "Ploeg E", abbrev: "E"}
               1327: {row: 2, row_id: "tm_1327", display: "---"} }
       new: {  id: {col: 5} }
*/

// ---  create Team select_row and header_row
        let tblRow_select = tblBody.insertRow (-1);
        let tblRow_header = tblBody.insertRow (-1);

// +++  loop through team_map +++++++++++++++++++++++++++++++++++++++
        let col_index = 0, colindex_createdcol = -1;
        if (grid_dict.scheme_pk){

            for (const [map_id, team_dict] of team_map.entries()) {

                // PR2021-01-05 was: const ppk_int = get_dict_value(team_dict, ["id", "ppk"], 0);
                const ppk_int = team_dict.s_id;
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict
                if (!!ppk_int && grid_dict.scheme_pk === ppk_int) {
                    // PR2021-01-05 was: const pk_int = get_dict_value(team_dict, ["id", "pk"], 0);
        //console.log("team_dict ", team_dict);
                    const team_pk_int = team_dict.id;
                    if(!!team_pk_int){
// ---  get abbrev of team_code
                        const team_code = (team_dict.code) ? team_dict.code : "---";
                        const is_created = (team_dict.created) ? team_dict.created : false;
                        colindex_createdcol = (is_created) ? col_index : -1;
                        const row_id ="team_" + team_pk_int.toString();

        //console.log("col_index ", col_index);
        //console.log("is_created ", is_created);
        //console.log("colindex_createdcol ", colindex_createdcol);

// ---  add info to grid_teams_dict
                        grid_teams_dict[team_pk_int] = {team: {col: col_index, rowid: row_id, code: team_code}};
                        col_index += 1

        //console.log("grid_teams_dict[team_pk_int] ",team_pk_int, grid_teams_dict[team_pk_int]);
// ---  add th to tblRow_select.
                        let th_select = document.createElement("th");
                        th_select.addEventListener("click", function() {Grid_SelectTeam("th_select", th_select)}, false )
                        th_select.classList.add("grd_team_th_selectrow");
                        if (!!row_id) { th_select.setAttribute("id", row_id)};
                        th_select.setAttribute("data-team_pk", team_pk_int);
                        th_select.innerText = "\u22BB";  // Xor sign (v with _)
                        tblRow_select.appendChild(th_select);
// ---  add th to tblRow_header.
                        let th_header = document.createElement("th");
                        th_header.classList.add("grd_team_th");
                        if(is_created){ ShowOkElement(th_header, "grd_team_th_create", "grd_team_th") }

                        th_header.innerText = team_code;
// ---  add EventListener to th_header
                        th_header.addEventListener("click", function() {MGT_Open("grid", th_header)}, false )
                        th_header.classList.add("pointer_show")
// ---  add data-pk and data-ppk to lookup_cell
                        th_header.setAttribute("data-team_pk", team_pk_int);
                        th_header.setAttribute("data-scheme_pk", grid_dict.scheme_pk);
// ---  append th_header to tblRow_header
                        tblRow_header.appendChild(th_header);
                    }
                 }
            }  // for (const [map_id, team_dict] of team_map.entries()) {

// ---  add column 'addnew' th to tblRow.
            id_new = id_new + 1
            const pk_new = "new" + id_new.toString()
            const row_id = "team_" + pk_new;
            const team_code = "< " + loc.New_team.toLowerCase() + " >";

// ---  add addnew info to grid_teams_dict
            grid_teams_dict[pk_new] = {team: {col: col_index, rowid: row_id, code: team_code}};
            col_index += 1
// ---  add th_select to tblRow_select.
            let th = document.createElement("th");
            th.classList.add("grd_team_th_selectrow");
            //if (!!row_id) { th_select.setAttribute("id", row_id)};
            //th_select.setAttribute("data-team_pk", pk_new);
            tblRow_select.appendChild(th);
// ---  add th_header to tblRow.
            th = document.createElement("th");
            th.classList.add("grd_team_th");
            th.classList.add("tsa_color_mediumgrey");
            th.setAttribute("id", row_id);
// ---  add EventListener to th_header
            th.addEventListener("click", function() {MGT_Open("grid", th)}, false )
            th.classList.add("pointer_show")
// ---  add data-pk and data-ppk to lookup_cell
            th.setAttribute("data-team_pk", pk_new);
            th.setAttribute("data-scheme_pk", grid_dict.scheme_pk);
            th.innerText = team_code;
// ---  append th_header to tblRow_header
            tblRow_header.appendChild(th);

// +++ loop through teammember_map, put info in grid_teams_dict
            let max_row_index = 0;
            for (const [map_id, teammember_dict] of teammember_map.entries()) {
                const scheme_pk_in_dict = (teammember_dict.s_id) ? teammember_dict.s_id : null;
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict,
                if (!!scheme_pk_in_dict && grid_dict.scheme_pk === scheme_pk_in_dict) {
                    //console.log("teammember_dict", teammember_dict);
                    const team_pk = (teammember_dict.t_id) ? teammember_dict.t_id : null;
                    if(team_pk){
                        let team_dict = grid_teams_dict[team_pk];
                    //console.log("team_dict", team_dict);
                        if (!!team_dict){
                            const tm_pk = (teammember_dict.id) ? teammember_dict.id : null;
// ---  count how many teammembers this team_dict already has
                            // team_dict also has key 'team', therefore count = length - 1
                            const teammember_dict_length = Object.keys(team_dict).length;
                            // select_row has index 0, header_row has index 1
                            // first teammember has row index 2 : index = teammember_dict_length + 1, min = 2
                            const row_index = (!!teammember_dict_length) ? teammember_dict_length + 1 : 2;
                            // add row to table when necessary
                            if (row_index > max_row_index) {
                                max_row_index = row_index
// ---  add new tblRow when row_index > max_row_index
                                let tblRow = tblBody.insertRow (-1);  // index -1: insert new cell at last position.
            // ---  add td's to tblRow.
                                for (let i = 0, td; i < col_index; i++) {
                                    td = document.createElement("td");
                                    // grd_border_right needed to display all cells with same width
                                    td.classList.add("grd_border_right");
                                    tblRow.appendChild(td);
                                }
                            }
                            const row_id ="tm_" + tm_pk.toString();
                            //const employee_pk = get_dict_value(teammember_dict, ["employee", "pk"]);
                            const employee_code = (teammember_dict.e_code) ? teammember_dict.e_code : "---";
                            //const datefirst = get_dict_value(teammember_dict, ["datefirst", "value"]);
                            //const datelast = get_dict_value(teammember_dict, ["datelast", "value"]);
                            //const replacement_pk = get_dict_value(teammember_dict, ["replacement", "pk"]);
                            //const replacement_code = get_dict_value(teammember_dict, ["replacement", "code"], "---");

                            //team_dict[tm_pk] = {employee_pk: employee_pk,
                            //                    employee_code: employee_code,
                            //                    replacement_pk: replacement_pk,
                            //                    replacement_code: replacement_code,
                           //                     row: row_index};
                            team_dict[tm_pk] = {row: row_index, row_id: row_id, display: employee_code};

            // lookup tblRow
                            let lookup_tblRow = tblBody.rows[row_index]
            // lookup cell of team - get col_index from id_dict of this team
                            const col_idx = get_dict_value(team_dict, ["team", "col"], -1);
                            if (!!lookup_tblRow && col_idx > -1){
                                const lookup_cell = lookup_tblRow.cells[col_idx]
                                lookup_cell.innerText = employee_code
                                lookup_cell.classList.add("grd_team_td");
                                if(col_idx === colindex_createdcol){
                                    ShowOkElement(lookup_cell, "grd_team_td_create", "grd_team_td")
                                }
            // add EventListener to lookup_cell
                                lookup_cell.addEventListener("click", function() {MGT_Open("grid", lookup_cell)}, false )
                                lookup_cell.classList.add("pointer_show")
            // add data-pk and data-ppk to lookup_cell
                                lookup_cell.setAttribute("data-team_pk", team_pk);
                                lookup_cell.setAttribute("data-scheme_pk", grid_dict.scheme_pk);
                            }
                        }  // if (!!team_dict)
                    }
                }
            }
        }  // if (!!scheme_pk)
    };  // Grid_FillTblTeams

//=========  Grid_FillTblShifts  === PR2020-03-13 PR2020-07-08 PR2021-01-05
    function Grid_FillTblShifts(col_index) {
        console.log("===  Grid_FillTblShifts == ")
        console.log("grid_dict ", deepcopy_dict(grid_dict))

        /* PR2021-01-02 structure of grid_dict:
        grid_dict: {
            col_count: 31
            cycle: 0
            dvg_onph: false
            first_rosterdate_JS: Fri Jan 01 2021 00:00:00 GMT-0400 (Venezuela Time) {}
            first_rosterdate_iso: "2020-12-25"
            grid_range: 5
            last_rosterdate_JS: Sun Jan 31 2021 00:00:00 GMT-0400 (Venezuela Time) {}
            last_rosterdate_iso: "2021-01-31"
            nocycle: true
            scheme: {
                code: "Schema 56"
                cycle: 32767
                datefirst: ""
                datelast: ""
                dvg_onph: false
                exch: false
                exph: false
                pk: 1
            }
        - for each cell in first colomn (shifts): dict with shift info, scheme_pk, cell_id Niu: rosterdate, schemeitems, onph
            gridcell_shift_1: {
                cell_id: "gridcell_shift_1"
                onph: false
                rosterdate: undefined
                scheme_pk: 1
                schemeitems: {}
                shift: {pk: 1, code: "06.00 - 14.00"
            }
        - for each cell in other colomns (schemeitems): dict with schemeitems, shift, cell_id , rosterdate, onph
            si_2021-01-19_1: {
                cell_id: "si_2021-01-19_1"
                onph: false
                rosterdate: "2021-01-19"
                scheme_pk: 1
                schemeitems: {
                    111: {
                        inactive: false
                        onpublicholiday: false
                        pk: 111
                        ppk: 1
                        rosterdate: "2021-01-19"
                        shift_pk: 1
                        team: {
                            abbrev: "A"
                            code: "Ploeg A"
                            pk: 1
                        }
                    }
                }
                shift: {pk: 1, code: "06.00 - 14.00"}
            }
        }
        */

        // PR2021-01-02 always show btns_grid. Was:
        // let hide_btns_grid = get_dict_value(grid_dict, ["nocycle"], false);
        // add_or_remove_class(el_btns_grid, cls_hide, !grid_dict.nocycle)

// ---  reset el_grid_tbody_shift
        const tblBody = el_grid_tbody_shift;
        tblBody.innerText = null

        grid_dict.first_rosterdate_JS = null
        grid_dict.last_rosterdate_JS = null
        grid_dict.col_count = null;

        if (grid_dict.scheme_pk){

// ---  when clicked on navigation buttons: change first_rosterdate_iso, last_rosterdate_iso, col_count

// ---  clicked on col_index = 3 (today) or when opening grid table
                // -- new Date(); also has current time. Convert to date without time
                // -- function: get_dateJS_from_dateISO (get_today_ISO()) gives date from UTC time,
                //    instead of '2020-05-02 T 20-12' it gives '2020-05-03 T 00-12' GMT-0400 (Bolivia Time)
                //    use today_JS_from_arr instead, remember month_index = today_arr[1] - 1
// --- get today if no value for grid_dict.first_rosterdate_iso

            const add_ph_column = (grid_dict.dvg_onph && !grid_dict.nocycle) ? 1 : 0;
            let col_index_ph = null;
            // PR2020-07-17 debug.  today_JS = new Date(); gives Fri Jul 17 2020 11:16:23 GMT-0400 (Bolivia Time)
            // this messes up the lookup dates in the grid.
            // instead use get_today_ISO():  today_JS = get_dateJS_from_dateISO(today_iso)
            const today_iso = get_today_ISO();
            const today_JS = get_today_JS()

            const today_weekday = (today_JS.getDay()) ? today_JS.getDay() : 7; // Sunday = 0 in JS, Sunday = 7 in ISO

// --- get first_rosterdate_iso:
            // - first of month when range is 5 (month)
            let first_rosterdate_JS = null
            if(grid_dict.grid_range > 4 ){
                first_rosterdate_JS = get_thismonth_firstJS_from_dateJS(today_JS)
            } else {
                // first day of range is monday
                grid_dict.first_rosterdate_JS = get_thisweek_monday_JS_from_DateJS(today_JS);
            }

            if(grid_dict.nocycle){
                // grid ranges are: 1: 1 week, 2: 2 weeks, 3: 3 weeks, 4: 5 weeks, 5: 1 month
                if(!grid_dict.first_rosterdate_iso){
                    if(grid_dict.grid_range > 4 ){
                        // range is one month
                        grid_dict.first_rosterdate_JS = get_thismonth_firstJS_from_dateJS(today_JS)
                    } else {
                        // first day of range is monday
                        grid_dict.first_rosterdate_JS = get_thisweek_monday_JS_from_DateJS(today_JS);
                    }
                    grid_dict.first_rosterdate_iso = get_dateISO_from_dateJS(grid_dict.first_rosterdate_JS);
                } else {
                    grid_dict.first_rosterdate_JS = get_dateJS_from_dateISO(grid_dict.first_rosterdate_iso)
                }
                if(grid_dict.grid_range > 4 ){
                    // rage is one month
                    const date_of_first_rosterdate = grid_dict.first_rosterdate_JS.getDate();
                    const last_JSday_of_month_of_first_rosterdate = get_thismonth_lastJS_from_dateJS(grid_dict.first_rosterdate_JS)
                    const last_date_of_month_of_first_rosterdate = last_JSday_of_month_of_first_rosterdate.getDate();
                    // PR2021-01-02 debug: this one goes wrong when first_rosterdate is not on first of month
                    if (date_of_first_rosterdate === 1) {
                        grid_dict.last_rosterdate_JS = last_JSday_of_month_of_first_rosterdate;
                        grid_dict.col_count = last_date_of_month_of_first_rosterdate;
                    } else {
                        // if first_rosterdate s not on the first of the month: show number of days of month of first_rosterdate
                        // get one day before  first_rosterdate + numbr_of_days of that month
                        grid_dict.col_count = last_date_of_month_of_first_rosterdate - 1;
                        grid_dict.last_rosterdate_JS = add_daysJS(grid_dict.first_rosterdate_JS, grid_dict.col_count);
                    }

                    //console.log("--- date_of_first_rosterdate", date_of_first_rosterdate)
                    //console.log("--- grid_dict.last_rosterdate_JS", grid_dict.last_rosterdate_JS)
                    //console.log("--- last_JSday_of_month_of_first_rosterdate", last_JSday_of_month_of_first_rosterdate)
                    //console.log("--- grid_dict.col_count", grid_dict.col_count)

                } else {
                    // range is 1 - 4 weeks
                    grid_dict.col_count = 7 * grid_dict.grid_range;
                    grid_dict.last_rosterdate_JS = add_daysJS(grid_dict.first_rosterdate_JS, grid_dict.col_count - 1);
                }
                grid_dict.last_rosterdate_iso = get_dateISO_from_dateJS(grid_dict.last_rosterdate_JS);
            } else {
            // when schem has cycle:
            // - if cycle < 4 then first rosterdate is today
                if(grid_dict.cycle < 4) {
                    grid_dict.first_rosterdate_JS = today_JS
                } else  {
            // - if cycle >= 4:
                    // - if cycle < 7 and weekday > cycle then Thursday is first rosterdate
                    // - else this week Monday is first rosterdate
                    const add_days = (grid_dict.cycle < 7 && today_weekday > grid_dict.cycle) ? 4 : 1;
                    grid_dict.first_rosterdate_JS = add_daysJS(today_JS, + add_days - today_weekday);
                }
                grid_dict.first_rosterdate = get_dateISO_from_dateJS(grid_dict.first_rosterdate_JS);
            }
// ---  create col_rosterdate_dict
            //  stores rosterdate of each column, used to create cell_id for each cell
            // cell_id = "2020-03-14_1784" (rosterdate + "_" + shift_pk)
            // col_rosterdate_dict =  {1: "2021-01-01", 2: "2021-01-02",  ....  8: "onph"}

            let col_rosterdate_dict = {};
// +++  create two header rows, one for the weekdays and the other for dates
            let tblRow_weekday = tblBody.insertRow (-1);  // index -1: insert new cell at last position.// ---  create Team header row
            let tblRow_date = tblBody.insertRow (-1);  // index -1: insert new cell at last position.

            // to keep rows at top when sorting
            tblRow_weekday.setAttribute("data-offsetstart", "-1001")
            tblRow_date.setAttribute("data-offsetstart", "-1000")

// +++  create table footer row
            let tblRow_footer = tblBody.insertRow (-1);  // index -1: insert new cell at last position.// ---  create Team header row
        // to keep row at bottom when sorting
            tblRow_footer.setAttribute("data-offsetstart", 10000)

// +++  add th's to header row with dates, number of columns = col_count + 1
            // add 1 extra column when dvg_onph (not when nocycle)
            if(!grid_dict.nocycle) { grid_dict.col_count = grid_dict.cycle + add_ph_column}

        // also add th's to footer row
            let first_month_index = -1, last_month_index = -1, first_year = 0, last_year = 0;
            // first_rosterdate_JS changes when date_JS changes. add_daysJS creates copy
            let date_JS = add_daysJS(grid_dict.first_rosterdate_JS, 0)
            let cell_weekday, cell_date;

            for (let col_index = 0, td; col_index < grid_dict.col_count + 1 ; col_index++) {
                const is_col_ph = (grid_dict.dvg_onph && !grid_dict.nocycle && col_index === grid_dict.cycle + add_ph_column);
                if(is_col_ph) { col_index_ph = col_index}

                const date_iso = get_dateISO_from_dateJS(date_JS);
                const weekday_index = (date_JS.getDay()) ? date_JS.getDay() : 7;  // Sunday = 0 in JS, Sunday = 7 in ISO
                let  cls = null;
                if (col_index === 0) {
                    cls = "grd_shift_th_first";
                } else if (is_col_ph) {
                    cls = "grd_shift_th_ph";
                } else if (date_iso === today_iso) {
                    cls =  "grd_shift_th_today";
                } else if ([6, 7].indexOf(weekday_index) > -1) {
                    cls = "grd_shift_th_wk";
                } else {
                   cls = "grd_shift_th";
                }

// ---  check if cell_date is holiday, if so: make color blue, set title
                const is_publicholiday = get_dict_value(holiday_dict, [date_iso, "ispublicholiday"], false)

// ---  add th to tblRow_weekday.
                const th_weekday = document.createElement("th");
                const th_date = document.createElement("th");
                th_weekday.classList.add(cls);
                th_date.classList.add(cls);

// ---  if cell_date is holiday or is_col_ph: make color blue
                if ( (grid_dict.nocycle && col_index && is_publicholiday) ||
                    (!grid_dict.nocycle && is_col_ph) ) {
                        th_weekday.classList.add("tsa_color_mediumblue")
                        th_date.classList.add("tsa_color_mediumblue");
                };

// ---  if cell_date is holiday or is_col_ph:  set title
                if (grid_dict.nocycle && col_index && is_publicholiday){
                    const title = get_dict_value(holiday_dict, [date_iso, "display"])
                    th_weekday.title = title;
                    th_date.title = title;
                }
                tblRow_weekday.appendChild(th_weekday);
                tblRow_date.appendChild(th_date);

                if (col_index){
// ---  add innerText to cell_weekday and cell_date
                    cell_weekday = tblRow_weekday.cells[col_index];
                    cell_date = tblRow_date.cells[col_index];

                    if (!grid_dict.nocycle && is_col_ph) {
                        cell_weekday.innerText = loc.Public;
                        cell_date.innerText = loc.holidays;
                    } else {
                        cell_weekday.innerText = loc.weekdays_abbrev[weekday_index];
                        cell_date.innerText = date_JS.getDate().toString();
                    }

// ---  add rosterdate to col_rosterdate_dict, 'onph' in column onph
                    col_rosterdate_dict[col_index] = (!grid_dict.nocycle && is_col_ph) ? "onph" :  date_iso;

// ---  these are used in get_month_year_text
                    const year_int = date_JS.getFullYear();
                    const month_index = date_JS.getMonth();
                    if ( col_index === 1){
                        first_year = year_int; // used in get_month_year_text
                        first_month_index = month_index;// used in get_month_year_text
                    }
                    last_year = year_int;  // used in get_month_year_text
                    last_month_index = month_index; // used in get_month_year_text
                }

// go to next date
                if (col_index){
                    change_dayJS_with_daysadd_vanilla(date_JS, 1);
                }
// put month / year in first column
                tblRow_date.cells[0].innerText = get_month_year_text(first_year, last_year, first_month_index, last_month_index, loc)
            }  //  for (let col_index = 0, td; col_index < col_count + 1 ; col_index++) {

// +++++++  add shift rows  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            let row_index = 2;
            let shifts_dict = {}

// ---  loop through shift_map
            for (const [map_id, shift_dict] of shift_map.entries()) {
                // PR2021-01-03 was: const ppk_int = get_dict_value(shift_dict, ["id", "ppk"], 0);
                const ppk_int = shift_dict.s_id;

// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict
                if (!!ppk_int && grid_dict.scheme_pk === ppk_int) {
                    // PR2021-01-03 Was:
                    //const shift_pk_int = get_dict_value(shift_dict, ["id", "pk"], 0);
                    //const is_restshift = get_dict_value(shift_dict, ["isrestshift", "value"], false);
                    //let shift_code = get_dict_value(shift_dict, ["code", "value"], "---");
                    // shift_offsetstart is for sorting shift rows
                    //let shift_offsetstart = get_dict_value(shift_dict, ["offsetstart", "value"], 0);

                console.log("--- shift_dict", shift_dict)
                    const shift_pk_int = shift_dict.id;
                    const is_restshift = shift_dict.isrestshift;
                    let shift_code = (shift_dict.code) ? shift_dict.code : "---";
                    // shift_offsetstart is for sorting shift rows
                    let shift_offsetstart =  (shift_dict.offsetstart) ? shift_dict.offsetstart : 0;

                    if (!shift_offsetstart) { shift_offsetstart = 1440};
                    if( is_restshift) {shift_code += " (R)"}
                    if(!!shift_pk_int){
                        const row_id ="gridrow_shift_" + shift_pk_int.toString();
                        shifts_dict[shift_pk_int] = {row: row_index};
                        row_index += 1
// ---  sort row.
                        let insert_at_index = -1;
                        for(let i = 0, tblRow; tblRow = tblBody.rows[i]; i++){
                            let row_offsetstart = get_attr_from_el_int(tblRow, "data-offsetstart");
                            if (!row_offsetstart) { row_offsetstart = 1440};
                            if (shift_offsetstart < row_offsetstart) {
                                insert_at_index = tblRow.rowIndex;
                                break;
                            }
                        }
// ---  add tblRow.
                        let tblRow_shift = tblBody.insertRow (insert_at_index);  // index -1: insert new cell at last position.
                        tblRow_shift.id = row_id;
                        tblRow_shift.setAttribute("data-pk", shift_pk_int)
                        tblRow_shift.setAttribute("data-ppk", ppk_int)
                        tblRow_shift.setAttribute("data-offsetstart", shift_offsetstart)
// ---  add td's to tblRow.
                        for (let col_index = 0, cell_id; col_index < grid_dict.col_count + 1  ; col_index++) {
                            // in col 'on_ph' there is no rosterdate, fill in min_rosterdate instead since field is required
                            const is_shift_cell = (col_index === 0);
                            const is_cell_ph = (!grid_dict.nocycle && grid_dict.dvg_onph && (col_index === col_index_ph));

                            let rosterdate_iso = col_rosterdate_dict[col_index]; // not in use when first_rosterdate_JS
    // ---  add id to cells
                            let td_si = document.createElement("td");
                            const prefix = (is_shift_cell) ? "gridcell_shift_" : "si_" + rosterdate_iso + "_"
                            const cell_id = prefix + shift_pk_int.toString();
                            td_si.id = cell_id;
                            if (is_shift_cell) { td_si.innerText =  shift_code};
                            td_si.classList.add((is_shift_cell) ? "grd_shift_td_first" : "grd_shift_td");
    // ---  add EventListener to cells
                            const mode_str = (col_index === 0) ? "shift_cell" : "si_cell"
                            td_si.addEventListener("click", function() {Grid_SchemitemClicked(td_si, mode_str)}, false )
    // ---  add hover to cells
                            add_hover(td_si);
                            tblRow_shift.appendChild(td_si);

    // ---  add cell_dict to grid_dict
                            const cell_dict = {cell_id: cell_id, rosterdate: rosterdate_iso,
                                               onph: is_cell_ph,
                                               shift: {pk: shift_pk_int, code: shift_code},
                                               scheme_pk: grid_dict.scheme_pk,
                                               schemeitems: {}};
                            grid_dict[cell_id] = cell_dict;
                        }  // for (let col_index = 0,
                    }
                 }
            }  // for (const [map_id, shift_dict] of shift_map.entries()) {
    console.log("grid_dict", grid_dict)

// +++++++++++++++  add footer row +++++++++++++++
            const td_foot = document.createElement("th");
                td_foot.id = "gridrow_shift_new";
                td_foot.innerText = "< " + loc.Add_shift + " >";
                td_foot.addEventListener("click", function() {Grid_SchemitemClicked(td_foot, "shift_cell")}, false )  // is_shift_cell = true
                td_foot.setAttribute("colspan", grid_dict.col_count + 1)
                add_hover(td_foot);
                td_foot.classList.add("grd_shift_th_first")
            tblRow_footer.appendChild(td_foot);
        }  // if (!!scheme_pk)

// +++++++++++  fill grid table shifts with schemitems +++++++++++++++++++++++++++++

// +++  loop through schemeitem_map and store schemeitems of this scheme in grid_schemeitem_map
        // iif weekly cycle: first date is Monday, if 1 day cycle: first date is today
        for (const [map_id, si_dict] of schemeitem_map.entries()) {
            const ppk_int = get_dict_value(si_dict, ["id", "ppk"], 0);
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict (should not happen)
            if (!!ppk_int && grid_dict.scheme_pk === ppk_int) {

// ---  lookup rosterdate in grid.
                // get difference in days between date of first column and rosterdate of schemeitem.
                // get remainder of diff / cycle (0 to 6 or -1 to -6 in weekcycle. Add 1 cycle when negative
                // get column index by adding remainder to first columns. Convert to cell_id

// ---  get info from .si_dict
                const rosterdate_iso = get_dict_value(si_dict, ["rosterdate", "value"]);
                const rosterdate_JS = get_dateJS_from_dateISO (rosterdate_iso)
                const shift_pk = get_dict_value(si_dict, ["shift", "pk"], 0);
                const on_publicholiday = get_dict_value(si_dict, ["onpublicholiday", "value"]);
                const inactive = get_dict_value(si_dict, ["inactive", "value"]);

                let cell_id = null;
// ---  calculate cell_id when scheme has cycle
                if(grid_dict.cycle && grid_dict.cycle <= MAX_CYCLE_DAYS){
                    const day_diff = get_days_diff_JS(rosterdate_JS, grid_dict.first_rosterdate_JS)
                    let days_add = (day_diff % grid_dict.cycle) // % is remainder: -1 % 2 = -1,  1 % 2  = 1
                    if (days_add < 0 ) {days_add += grid_dict.cycle }
                    const cell_date_JS = add_daysJS(grid_dict.first_rosterdate_JS, days_add)
                    const cell_date_iso = get_dateISO_from_dateJS(cell_date_JS)
// ---  convert rosterdate and shift_pk to cell_id, use "si_onph_" when on_publicholiday
                    const cell_date = (on_publicholiday) ? "onph" : cell_date_iso
                    cell_id = "si_" + cell_date + "_" + shift_pk.toString();
                } else {
// ---  calculate cell_id when scheme has no cycle
                    // show only schemeitems in range of first - last_rosterdate_iso
                    if (period_within_range_iso(rosterdate_iso, rosterdate_iso, grid_dict.first_rosterdate_iso, grid_dict.last_rosterdate_iso) ) {
                        cell_id = "si_" + rosterdate_iso + "_" + shift_pk.toString();
                    }
                }
                let cell = null;
                if(cell_id){cell = document.getElementById(cell_id)};

                if(!!cell){
// get team_dict from team_map, not from si_dict
                    const team_pk = get_dict_value(si_dict, ["team", "pk"], 0);
                    const team_dict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk);
                    const team_code = (team_dict.code) ? team_dict.code : "";

// add  schemeitem to cell_dict in grid_table
                    const cell_schemeitems_dict = get_dict_value(grid_dict, [cell_id, "schemeitems"]);
                    const si_pk_int = get_dict_value(si_dict, ["id", "pk"], 0);
                    cell_schemeitems_dict[si_pk_int] = {pk: si_pk_int, ppk: ppk_int,
                                                inactive: inactive, onpublicholiday: on_publicholiday,
                                                rosterdate: (on_publicholiday) ? "onph" : rosterdate_iso,
                                                shift_pk: shift_pk,
                                                team: {pk: team_pk, code: team_code} };

// ---  add class 'has_si' and team_row_id to classList of cell
                    // 'has_si' used in querySelectorAll, team_row_id used to highlight
                    cell.classList.add("has_si")
                    const team_row_id = get_dict_value(grid_teams_dict, [team_pk, "id", "row_id"])
                    if(!!team_row_id) {cell.classList.add(team_row_id)};

// ---  add team_code to cell.innerText
                    cell.innerText = set_cell_innertext(loc, cell.innerText, team_code)
                }  // if(!!cell){
            }  //  if (!!ppk_int && scheme_pk === ppk_int) {
        }  // for (const [map_id, si_dict] of schemeitem_map.entries())

console.log("grid_dict", deepcopy_dict(grid_dict))
    }  //  Grid_FillTblShifts

//=========  Grid_UpdateFromResponse_si  ================ PR2020-03-15
    function Grid_UpdateFromResponse_si(si_update_list) {
        console.log(" ==== Grid_UpdateFromResponse_si ====");
        console.log("si_update_list", si_update_list);
        let cell_id_str = null, ppk_int = null;

// --- loop through si_update_list
        for (let i = 0, update_dict; update_dict = si_update_list[i]; i++) {
            console.log("update_dict", deepcopy_dict(update_dict));

//----- get id_dict of updated item
            // all cell_id_str's and ppk_int's from items in si_update_list must be the same
            if(!cell_id_str) { cell_id_str = get_dict_value(update_dict, ["id", "cell_id"])};
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id", "pk"]);
            if(!ppk_int) { ppk_int = get_dict_value(update_dict, ["id","ppk"])};
            const temp_pk = get_dict_value(update_dict, ["id","temp_pk"]); // can be null
            const is_created = get_dict_value(update_dict, ["id", "created"], false);  // can be null
            const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);  // can be null

            const on_ph = get_dict_value(update_dict, ["onpublicholiday", "value"], false);
            const is_inactive = get_dict_value(update_dict, ["inactive", "value"], false);
            const rosterdate_iso = get_dict_value(update_dict, ["rosterdate", "value"]);
            const shift_pk = get_dict_value(update_dict, ["shift", "pk"]);
            const team_pk = get_dict_value(update_dict, ["team", "pk"]);

//----- get grid_table cell_dict
            const cell_dict = grid_dict[cell_id_str]
// if is new schemeitem: delete item with 'temp_pk' from cell_dict.schemeitems
            if(temp_pk){ delete cell_dict.schemeitems[temp_pk]};
// grid_dict = {si_onph_1128: {schemeitems: {3030: { deepcopy}} } }
// ---  add or replace cell_dict.schemeitems
            cell_dict.schemeitems[pk_int] = {pk: pk_int,
                                                ppk: ppk_int,
                                                rosterdate: rosterdate_iso,
                                                onpublicholiday: on_ph,
                                                inactive: is_inactive,
                                                shift_pk: shift_pk,
                                                team: {pk: team_pk, code: "??", abbrev: "??"}
                                             };

//----- replace updated item in map or remove deleted item from map
            const map_id = get_map_id(tblName, pk_int);
            update_map_item_local(tblName, map_id, update_dict, is_deleted);
        }  //  for (let j = 0; j < 8; j++)

        Grid_UpdateCell(cell_id_str)
    };  // Grid_UpdateFromResponse_si

//=========  Grid_UpdateCell  === PR2020-03-15
    function Grid_UpdateCell(cell_id_str) {
        // obly called by Grid_UpdateFromResponse_si
        //console.log("===  Grid_UpdateCell == cell_id_str: ", cell_id_str)

//----- get cell_dict
        const cell_dict = grid_dict[cell_id_str]
        //console.log("--- cell_dict", deepcopy_dict(cell_dict))

        const on_ph = cell_dict.onph;
        const cell_rosterdate = cell_dict.rosterdate;
        const cell_shift_pk = get_dict_value(cell_dict, ["shift", "pk"]);
        //console.log("on_ph", on_ph)
        //console.log("cell_rosterdate", cell_rosterdate)

// ---  get cell
        let cell = document.getElementById(cell_id_str);
        //console.log("cell", cell)
        //console.log("cell_rosterdate", cell_rosterdate)
        //console.log("on_ph", on_ph)
        //console.log("cell_shift_pk", cell_shift_pk)
        if(cell && (cell_rosterdate || on_ph ) && cell_shift_pk) {

// ---  reset attributes
            cell.classList.remove("has_si")
            cell.removeAttribute("data-si_pk")
            cell.removeAttribute("data-team_pk")
            const class_list = cell.classList;
            for (let i = 0, len = class_list.length; i < len ; i++) {
                const class_name = class_list[i]
                if(!!class_name){
                    const class_name_sliced = class_name.slice(0,5)
    //console.log("class_name_sliced", class_name_sliced)
                    if( class_name_sliced === "team_" ){
                        cell.classList.remove(class_name)
                    }
                }
            }
            cell.innerText = null;
            let cell_contains_selected_team = false;
// ---  loop through schemeitems of this cell_dict
            const schemeitems_dict = get_dict_value(cell_dict, ["schemeitems"]);
            for (let si_pk in schemeitems_dict) {
                if (schemeitems_dict.hasOwnProperty(si_pk)) {
                    const si_dict = schemeitems_dict[si_pk];
                    const si_pk_int = get_dict_value(si_dict, ["pk"], 0);
                    const ppk_int = get_dict_value(si_dict, [ "ppk"], 0);
                    //console.log(".................si_pk ", si_pk);
                    //console.log(".................si_dict ", deepcopy_dict(si_dict));
                    const shift_pk = get_dict_value(si_dict, ["shift_pk"], 0);
                    const on_ph = get_dict_value(si_dict, ["onpublicholiday"], false);
                    let rosterdate = get_dict_value(si_dict, ["rosterdate"]);
                    if (on_ph) { rosterdate = "on_ph"};

                    const team_pk = get_dict_value(si_dict, ["team", "pk"], 0);
console.log("grid_teams_dict", grid_teams_dict)
                    const team_code = get_dict_value(grid_teams_dict, [team_pk, "team", "code"])
                    const team_row_id = get_dict_value(grid_teams_dict, [team_pk, "team", "rowid"])
                    if(team_pk === grid_selected_team.pk){
                        cell_contains_selected_team = true
                    }
                    cell.classList.add("has_si")
                    if(!!team_row_id) {
                        cell.classList.add(team_row_id)
                    };

// ---  add team_abbrev to cell.innerText
                    cell.innerText = set_cell_innertext(loc, cell.innerText, team_code)
                }  //  if (schemeitems_dict.hasOwnProperty(si_pk))
            }  // for (let si_pk in schemeitems_dict)

// ---  show ok for 2 seconds, then highlight cell if cell_contains_selected_team
            cell.classList.remove(cls_bc_yellow_light);
            cell.classList.add("border_bg_valid");
            setTimeout(function (){
                cell.classList.remove("border_bg_valid");
                if (cell_contains_selected_team){ cell.classList.add(cls_bc_yellow_light)};
            }, 2000);

        }  //if(cell && (cell_rosterdate || on_ph ) && cell_shift_pk)

    }  //  Grid_UpdateCell

//=========  Grid_SelectTeam  === PR2020-03-14
    function Grid_SelectTeam(called_by, th_select) {
        //console.log("===  Grid_SelectTeam == ", called_by);
        // when th_select = null: deselect all (happens when clicked outside grid tables, or when mod_MGT opens)
        let th_select_cellIndex = -1, team_pk_str = null;
        grid_selected_team = {};
        if(!!th_select) {
// ---  get selected.team_pk from th_select
            team_pk_str = th_select.id;
            th_select_cellIndex = th_select.cellIndex
            const team_dict = get_mapdict_from_datamap_by_id(team_map, th_select.id);

// team_dict = {id: 5, mapid: "team_5", s_id: 2, code: "Ploeg A", s_code: "Schema 7", o_id: 9, o_istemplate: false,
//               c_isabsence: false, modat: "2021-01-03T12:20:26.276Z", modby_usr: "Hans" }

            grid_selected_team.pk = team_dict.id;
            grid_selected_team.ppk = team_dict.s_id;
            grid_selected_team.code = team_dict.code;
            grid_selected_team.abbrev = get_teamcode_abbrev(loc, team_dict.code);

        }
// ---  highlight cells of this team in el_grid_tbody_team
        for (let i = 1, row, len = el_grid_tbody_team.rows.length; i < len; i++) {
            row = el_grid_tbody_team.rows[i];
            const cls_selected = (i === 1) ? "grd_team_th_selected" : "grd_team_td_selected";
            //const cls_not_selected = (i === 1) ? "grd_team_th" : "grd_team_tdXXX";
            const cls_not_selected = (i === 1) ? "grd_team_th" : null;
            for (let j = 0, cell; cell = row.cells[j]; j++) {
                const add_selected = (!!get_attr_from_el(cell, "data-team_pk") && cell.cellIndex === th_select_cellIndex)
                add_or_remove_class(cell, cls_selected, add_selected);
                if(cls_not_selected){add_or_remove_class(cell, cls_not_selected, !add_selected)};
            }
        }

// ---  highlight cells with this team in tbody_shift
        let elements = el_grid_tbody_shift.querySelectorAll(".has_si")
        for (let i = 0, el; el = elements[i]; i++) {
            const is_selected_team = el.classList.contains(team_pk_str)
            add_or_remove_class(el, cls_bc_yellow_light,is_selected_team )
        };
    }  // Grid_SelectTeam

//=========  Grid_Goto  === PR2020-03-14 PR2021-01-02
    function Grid_Goto(btn) {
        console.log("===  Grid_Goto == ")

        console.log("btn ", btn)
        let mode = null, btn_index = null;
        if(btn){btn.blur()}

        btn_index = get_attr_from_el_int(btn, "data-index")
        if (btn_index){
            // button index are: 1: 1 month back, 2: 1 week back, 3: goto today, 4: 1 week further, 5: 1 month further,
            //                   6: show less dates, 7: show more dates
            // grid ranges are: 1: 1 week, 2: 2 weeks, 3: 3 weeks, 4: 5 weeks, 5: 1 month

            if([1,2,4,5].indexOf(btn_index) > -1){
                const old_first_rosterdate_JS = get_dateJS_from_dateISO_vanilla(grid_dict.first_rosterdate_iso);
                let first_rosterdate_JS = null;
                if([2,4].indexOf(btn_index) > -1){
                    // back / forward 1 week
                    const days_add = (btn_index === 2) ? -7 : 7;
                    first_rosterdate_JS = add_daysJS(old_first_rosterdate_JS, days_add);
                } else if([1,5].indexOf(btn_index) > -1){
                    if(btn_index === 1){
                        first_rosterdate_JS = get_previousmonth_firstJS_from_dateJS(old_first_rosterdate_JS)
                    } else if(btn_index === 5){
                        first_rosterdate_JS = get_nextmonth_firstJS_from_dateJS(old_first_rosterdate_JS)
                    }
                    const last_rosterdate_JS = get_thismonth_lastJS_from_dateJS(first_rosterdate_JS)
                    const last_dayofmonth = last_rosterdate_JS.getDate();
                    const col_count = last_dayofmonth;
                    grid_dict.col_count = col_count
                }
                grid_dict.first_rosterdate_iso = get_dateISO_from_dateJS(first_rosterdate_JS);
// ---  first change grid_range if clicked on collapse / expand
            } else if(btn_index === 3){
                // goto today's range: reset first_rosterdate_iso
                grid_dict.first_rosterdate_iso = null;

// ---  first change grid_range if clicked on collapse / expand
            } else if([6,7].indexOf(btn_index) > -1){

                // grid ranges are: 1: 1 week, 2: 2 weeks, 3: 3 weeks, 4: 5 weeks, 5: 1 month
                if(btn_index === 6){
                    if(grid_dict.grid_range >1) { grid_dict.grid_range -= 1}
                } else {
                    if(grid_dict.grid_range < 5) { grid_dict.grid_range += 1}
                }
                selected.grid_range = grid_dict.grid_range
                const upload_dict = {page_scheme: {grid_range: grid_dict.grid_range}};
                UploadSettings(upload_dict, url_settings_upload);
            }

// ---  in el_btns_grid: make first / last button grey when readonly
        for (let i = 0, btn; btn = el_btns_grid.children[i]; i++) {
            const btn_index = get_attr_from_el_int(btn, "data-index")
            if ( [1,5,6,7].indexOf(btn_index) > -1 ){
                const disable_btn = ([1,5].indexOf(btn_index)> -1 && btn_index === grid_dict.grid_range) ||
                                (btn_index === 6 && grid_dict.col_count === 7) ||
                                (btn_index === 7 && grid_dict.col_count > MAX_CYCLE_DAYS);
                add_or_remove_class(btn, "tsa_color_darkgrey", disable_btn)
            }
        }

// ---  refresh grid table
            Grid_FillTblShifts(btn_index);
        } else {
            // new shift
        }
    };  // Grid_Goto

//=========  Grid_SchemitemClicked  === PR2020-03-14
    function Grid_SchemitemClicked(td_clicked, mode) {
        console.log("===  Grid_SchemitemClicked == ");
        console.log("mode ", mode);
        // grid_selected_team = {pk: 2540, ppk: 2019, code: "Ploeg A", abbrev: "A"}

// ---  open ModGridShift when is_shift_cell
        if(mode === "shift_cell") {
            MGS_Open("grid", td_clicked)
        } else {

// ---  get cell_dict from grid_dict
            // cell_id_str = 'si_2021-01-06_50'
            const cell_id_str = td_clicked.id;
            const cell_dict = grid_dict[cell_id_str]
        console.log("cell_dict ", deepcopy_dict(cell_dict));

/* grid_dict = {
    si_2021-01-04_50: {
        cell_id: "si_2021-01-04_50",
        onph: false,
        rosterdate: "2021-01-04",
        scheme_pk: 2,
        shift: {pk: 50, code: "02.00 - "},
        schemeitems: {121: { pk: 121, ppk: 2, rosterdate: "2021-01-04", inactive: false, onpublicholiday: false,
                            shift_pk: 50
                            team: {pk: 5, code: "Ploeg A", abbrev: "A"}
                            }
                     }
        }
    }
*/

            const rosterdate_iso = cell_dict.rosterdate;
            const on_ph = cell_dict.onph;
            if(!grid_selected_team.pk) {
// ---  show message in ModConfirm when there is no team selected
                // PR2020-08-12 was: let rosterdate_text = (on_ph) ? loc.Public_holidays :
                                        //format_date_iso (rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);
                let rosterdate_text = (on_ph) ? loc.Public_holidays : format_dateISO_vanilla (loc, rosterdate_iso, false, true);
                if (rosterdate_text){ rosterdate_text = loc.of + " " + rosterdate_text};
                const shift_text =  get_dict_value(cell_dict, ["shift", "code"]);
                const header_text = loc.Shift + " '" + shift_text + "' " + rosterdate_text;
                ModConfirmOpen("grid_si", null, header_text)
            } else {

// ---  get info from cell_dict
                const shift_pk = get_dict_value(cell_dict, ["shift", "pk"]);
                const scheme_pk = get_dict_value(cell_dict, ["scheme_pk"]);

                console.log("shift_pk ", shift_pk);
                console.log("scheme_pk ", scheme_pk);
                console.log("rosterdate_iso ", rosterdate_iso);
                console.log("on_ph ", on_ph);

// ---  only if there is a (rosterdate_iso or 'onph') and shift_pk selected (must be always the case)
                if( (rosterdate_iso || on_ph) && shift_pk && scheme_pk) {
                   let upload_list = [];
                    let has_si_with_sel_team = false;  // checks if there is already a si with this team
                    let si_pk_without_team = null;

// ++++++++++ loop through schemeitems of this cell_dict
                    const schemeitems_dict = get_dict_value(cell_dict, ["schemeitems"]);
                console.log("===>>> schemeitems_dict ", deepcopy_dict(schemeitems_dict));

                    for (let si_pk in schemeitems_dict) {
                        if (schemeitems_dict.hasOwnProperty(si_pk)) {
                            const si_dict = schemeitems_dict[si_pk];
                            const ppk_int = get_dict_value(si_dict, ["ppk"], 0);
                            console.log(".................si_pk ", si_pk);
                            console.log("si_dict ", si_dict);
             //si_dict: {pk: 2992, ppk: 2019, rosterdate: "2020-05-07", shift_pk: 1121, team_pk: 2540, inactive: false, onpublicholiday: false}

                            if(!isEmpty(si_dict)){
// ---  lookup team in cell_dict.teams
                                const team_pk = get_dict_value(si_dict, ["team", "pk"], 0);
                                const team_code = get_dict_value(si_dict, ["team", "code"]);
                                //const team_abbrev = get_dict_value(si_dict, ["team", "abbrev"]);
// ++++++++++ when si_dict has no team:
                                if (!team_pk) {
    // ---  if si has no team, put si_pk in si_pk_without_team (only once, skip if si_pk_without_team has value)
            // this way we can re-use schemeitem records without team, instead of deleting and adding a new schemeitem record
                                    if (!si_pk_without_team) {
                                        si_pk_without_team = si_pk
                                    } else {
    // ---  if there are multiple schemeitems without team: delete other schemeitems withhout team
                                        upload_list.push({id: {mode: "grid", table: "schemeitem", delete: true,
                                                        pk: si_pk, ppk: scheme_pk, cell_id: cell_id_str},
                                                        team: {pk: null, ppk: scheme_pk, code: team_code}});
    // ---  remove schemeitem from cell_dict.schemeitems
                                        delete cell_dict.schemeitems[si_pk];
                                    };
// ++++++++++ when si_dict does have team:
    // ---  check if team_pk = grid_selected_team.pk
                                } else if (team_pk === grid_selected_team.pk){
                                    if (!has_si_with_sel_team){
            // has_si_with_sel_team is used to delete a team when it has a double schemeitem record
                                        has_si_with_sel_team = true;
    // ---  remove team_pk from first schemeitem: update schemeitem with team.pk = null, make inactive false
                                        upload_list.push({id: {mode: "grid", table: "schemeitem",
                                                        pk: si_pk, ppk: scheme_pk, cell_id: cell_id_str},
                                                        team: {pk: null, ppk: scheme_pk, code: team_code, update: true},
                                                        inactive: {value: false, update: true}})
                                    } else {
    // ---  if there are multiple schemeitems with this team: delete other schemeitems with this team
                                        upload_list.push({id: {mode: "grid", table: "schemeitem", delete: true,
                                                        pk: si_pk, ppk: scheme_pk, cell_id: cell_id_str},
                                                        team: {pk: null, ppk: scheme_pk, code: team_code}});
    // ---  remove schemeitem from cell_dict.schemeitems
                                        delete cell_dict.schemeitems[si_pk];
                                    }
                                }
                            }
                        }  // if (schemeitems_dict.hasOwnProperty(key))
                    }  // for (let si_pk in schemeitems_dict)

    // ---  update td_clicked.innerText, before upload response
                    const old_innertext = td_clicked.innerText;
                    const is_remove = has_si_with_sel_team

                console.log("===>>> is_remove ", is_remove);
                console.log("===>>> grid_selected_team.abbrev ", grid_selected_team.abbrev);
                    td_clicked.innerText = set_cell_innertext(loc, old_innertext, grid_selected_team.code, is_remove)
                    add_or_remove_class (td_clicked, cls_bc_yellow_light, !is_remove);

// ++++++++++ add schemeitem - when there are no schemeitems with this team in his cell
                    //console.log("si_pk_without_team: ", si_pk_without_team)
                    if(!is_remove) {

    // ---  add team to schemeitem - if there is a schemeitem without team: add team to that schemeitem
                        if(!!si_pk_without_team){
                        // ---  add team_pk to first schemeitem, make inactive false
                            upload_list.push({
                                id: {mode: "grid", table: "schemeitem", pk: si_pk_without_team, ppk: scheme_pk, cell_id: cell_id_str},
                                team: {pk: grid_selected_team.pk, ppk: scheme_pk, code: grid_selected_team.code, update: true},
                                inactive: {value: false, update: true}
                            })
    // ---  add team to existing schemeitem dict
                            schemeitems_dict[si_pk_without_team] = {pk: grid_selected_team.pk,
                                                                    code: grid_selected_team.code,
                                                                    abbrev: grid_selected_team.abbrev};

                        } else {
    // ---  create new schemeitem - if there is no schemeitem without team
                            // mode = 'grid' returns 'si_update_list' , otherwise 'schemeitem_update'

                            //-- increase id_new
                            id_new = id_new + 1
                            const pk_new = "new" + id_new.toString()
                            let new_upload_dict = {
                                            id: {pk: pk_new,
                                                ppk: scheme_pk,
                                                temp_pk: pk_new,
                                                table: "schemeitem",
                                                create: true,
                                                cell_id: cell_id_str,
                                                mode: "grid"},
                                rosterdate: {value: rosterdate_iso}, // required field or onph, key:'update'not necessary when create
                                onpublicholiday: {value: on_ph}, // key:'update'not necessary
                                shift: {pk: shift_pk}, // required field, key:'update'not necessary when create
                                team: {pk: grid_selected_team.pk, update: true}
                            }
                            upload_list.push(new_upload_dict);
    // ---  add new schemeitem to cell_dict.schemeitems
                            schemeitems_dict[pk_new] = {pk: pk_new,
                                                        ppk: scheme_pk,
                                                        rosterdate: rosterdate_iso,
                                                        onpublicholiday: on_ph,
                                                        inactive: false,
                                                        shift_pk: shift_pk,
                                                        team: {pk: grid_selected_team.pk,
                                                                code: grid_selected_team.code,
                                                                abbrev: grid_selected_team.abbrev}
                                                        };
                        }
                    }  //  if(!is_remove)
// ++++++++++ upload upload_list, it can contain multiple upload_dicts
                    if (upload_list.length){
                       UploadChanges(upload_list, url_schemeitem_upload, "Grid_SchemitemClicked");
                    }
                }  // if(!!rosterdate_iso && !!shift_pk && !!scheme_pk) {
            }  // if(!grid_selected_team.pk)
        }  // if(!!is_shift_cell)
        //console.log("grid_dict: ", grid_dict)
    }  // Grid_SchemitemClicked

//========= get_orderby  ================= PR2020-05-31
    function get_orderby(tblName, item_dict) {
        //console.log(" ===== get_orderby =====");
        // get 'order_by'. This contains the number / string that must be used in ordering rows
        let order_by = null
        if (tblName === "shift"){
            order_by = Number(get_dict_value(item_dict, ["offsetstart", "value"], 0));
            if(!order_by) {order_by = 0}
        } else if (tblName === "teammember"){
            const code = get_dict_value(item_dict, ["employee", "code"], "");
            order_by = code.toLowerCase();
        } else if (tblName === "absence"){
            const employee_code = get_dict_value(item_dict, ["employee", "code"], "") + "                        ";
            order_by = employee_code.slice(0, 24) + get_dict_value(item_dict, ["scheme", "datefirst"], "")
        } else if (tblName === "schemeitem"){
            order_by = get_dict_value(item_dict, ["rosterdate", "excelstart"]);
        }
        return order_by;
    }  // get_orderby

//========= get_tblName_from_selectedBtn  ================= PR2020-05-29
    function get_tblName_from_selectedBtn(selected_btn) {
        //console.log(" ===== get_tblName_from_selectedBtn =====");

        // btns are: btn_grid, btn_schemeitem, btn_shift, btn_teammember, btn_absence
// ---  get tblName, is null when btn = "btn_grid"
        const tblName = (selected_btn === "btn_schemeitem") ? "schemeitem" :
                        (selected_btn === "btn_shift") ? "shift" :
                        (selected_btn === "btn_teammember") ? "teammember" :
                        (selected_btn === "btn_absence") ? "absence" : null;
        return tblName;
    }

}); //$(document).ready(function()