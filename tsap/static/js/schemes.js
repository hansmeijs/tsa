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
        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_bc_yellow_light = "tsa_bc_yellow_light";
        const cls_bc_yellow = "tsa_bc_yellow";
        const cls_selected = "tsa_tr_selected";   // /* light grey; tsa_tr_selected*/
        const cls_error = "tsa_tr_error";   // /* light grey; tsa_tr_selected*/

// ---  id of selected customer and selected order
        const id_sel_prefix = "sel_"
        let rosterdate_dict = {};

        let employee_map = new Map();
        let order_map = new Map();
        let scheme_map = new Map();
        let shift_map = new Map();
        let schemeitem_map = new Map();
        let team_map = new Map();
        let teammember_map = new Map();
        let abscat_map = new Map();
        let absence_map = new Map();

        let grid_table_dict = {};
        let grid_teams_dict = {};
        let grid_selected_team = {};

        // settings.customer_pk contains saved pk. Remains when switched to template mode.
        // selected.customer_pk can have value of template_cust, is not stored in settings
        let selected_btn = "btn_grid"
        let selected_tblRow_id = null;  // used in handleEventKey
        let selected = {customer_pk: 0, order_pk: 0, scheme_pk: 0, team_pk: 0, shift_pk: 0, employee_pk: 0, teammember_pk: 0};
        let settings = {customer_pk: 0, order_pk: 0, scheme_pk: 0};

        let loc = {};  // locale_dict
        let period_dict = {};
        let mod_upload_dict = {};
        let mod_MGT_dict = {};  // used to keep track op changes in mod_grid_team  -- or table teammember
        let mod_MGS_dict = {};  // used to keep track op changes in mod_shift_team
        let mod_dict = {};  // used to keep track op changes in mod_select_order
        let mod_MSCH_dict = {};  // used to keep track op changes in mod_scheme
        let mod_MSCO_dict = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let idx = 0; // idx is id of each created (date) element 2019-07-28
        let filter_name = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};
        let is_template_mode = false;
        let is_absence_mode = false;

        let quicksave = false

// ---  Select Scheme
        // EventHandler HandleSelect_Row is added in FillSelectTable
        let sidebar_tblBody_scheme = document.getElementById("id_select_tbody_scheme")
        let sidebar_tblBody_shift = document.getElementById("id_select_tbody_shift")
        let sidebar_tblBody_team = document.getElementById("id_select_tbody_team")

        let tblHead_datatable = document.getElementById("id_tblHead_datatable");
        let tblBody_datatable = document.getElementById("id_tblBody_datatable");
        let tblFoot_datatable = document.getElementById("id_tblFoot_datatable");

        let el_timepicker = document.getElementById("id_timepicker")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");
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
            teammember: { tbl_col_count: 6,
                        field_caption: ["Team", "Employee", "Start_date", "End_date", "Replacement_employee", ""],
                        field_names: ["team", "employee", "datefirst", "datelast", "replacement", "delete"],
                        field_tags:  ["div", "div", "input", "input", "div", "div"],
                        field_width: ["120", "150", "150", "150", "150", "032"],
                        field_align: ["l", "l", "l", "l", "l", "r"]},
            absence: { tbl_col_count: 8,
                        field_caption: ["Employee", "Absence_category", "Start_date", "End_date", "Start_time", "End_time", "Hours", ""],
                        field_names: ["employee", "order", "datefirst", "datelast", "offsetstart", "offsetend", "timeduration", "delete"],
                        field_tags:  ["div", "div", "div", "div", "div", "div", "div", "div"],
                        field_width: ["2200", "180", "120", "120", "090", "090", "090", "032"],
                        field_align: ["l", "l", "r", "r", "r", "r", "r", "center"]},
            }
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

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        //moment.locale(loc.user_lang)

//  ========== EVENT LISTENERS  ======================

// ---  Sidebar - Select Order
        let el_sidebar_select_order = document.getElementById("id_sidebar_select_order");
            el_sidebar_select_order.addEventListener("click", function() {MSCO_Open()}, false );
            add_hover(el_sidebar_select_order);
// --- create EventListener for buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const btn_mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSelect(btn_mode)}, false )
        }
// ---  create EventListener for buttons above table schemeitems
        btns = document.getElementById("id_btns_schemeitem").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSchemeitems(mode)}, false )
        }

// ---  create EventListener of elements in scheme box grid page
        let elements = document.getElementById("id_grid_scheme_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = elements[i]; i++) {
            el.addEventListener("click", function() {MSCH_Open(el)}, false)
        }

// ===================== EventListener for MODAL ===================================

// ---  MOD SELECT CUSTOMER / ORDER ------------------------------
        let el_MSCO_tblbody_custorder = document.getElementById("id_MSCO_tbody_custorder");
        let el_MSCO_input_custorder = document.getElementById("id_MSCO_input_custorder")
            el_MSCO_input_custorder.addEventListener("keyup", function(event){
                setTimeout(function() {MSCO_FilterCustOrder()}, 50)});
        let el_MSCO_btn_save = document.getElementById("id_MSCO_btn_save")
            el_MSCO_btn_save.addEventListener("click", function() {MSCO_Save()}, false )

// ---  MOD GRID TEAM ------------------------------------
        let el_MGT_teamcode = document.getElementById("id_MGT_teamcode");
            el_MGT_teamcode.addEventListener("change", function() {MGT_TeamcodeChanged(el_MGT_teamcode)}, false)

        let el_MGT_btn_save = document.getElementById("id_MGT_btn_save");
                el_MGT_btn_save.addEventListener("click", function() {MGT_Save("update")}, false )
        let el_MGT_btn_delete = document.getElementById("id_MGT_btn_delete");
                el_MGT_btn_delete.addEventListener("click", function() {MGT_Save("delete")}, false )

// ---  MOD GRID SHIFT ------------------------------------
        let el_MGS_shiftcode = document.getElementById("id_MGS_shiftcode");
            el_MGS_shiftcode.addEventListener("change", function() {MGS_ShiftcodeChanged(el_MGS_shiftcode)}, false);
        let el_MGS_offsetstart = document.getElementById("id_MGS_offsetstart");
            el_MGS_offsetstart.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_offsetstart, "grid_shift")}, false);
        let el_MGS_offsetend = document.getElementById("id_MGS_offsetend");
            el_MGS_offsetend.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_offsetend, "grid_shift")}, false);
        let el_MGS_breakduration = document.getElementById("id_MGS_breakduration");
            el_MGS_breakduration.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_breakduration, "grid_shift")}, false);
        let el_MGS_timeduration = document.getElementById("id_MGS_timeduration");
            el_MGS_timeduration.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_timeduration, "grid_shift")}, false);
        let el_MGS_restshift = document.getElementById("id_MGS_isrestshift");
            el_MGS_restshift.addEventListener("change", function() {MGS_RestshiftClicked(el_MGS_restshift)}, false);

        let el_MGS_btn_save = document.getElementById("id_MGS_btn_save");
                el_MGS_btn_save.addEventListener("click", function() {MGS_Save("update")}, false );
        let el_MGS_btn_delete = document.getElementById("id_MGS_btn_delete");
                el_MGS_btn_delete.addEventListener("click", function() {MGS_Save("delete")}, false );

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_ModSelEmp_select_employee_body");
        document.getElementById("id_ModSelEmp_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() {MSE_filter_employee("filter", event.key)}, 50)});
        document.getElementById("id_ModSelEmp_btn_save").addEventListener("click", function() {MSE_Save("save")}, false )
        document.getElementById("id_ModSelEmp_btn_remove_employee").addEventListener("click", function() {MSE_Save("remove")}, false )

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
        let el_MSCH_btn_delete = document.getElementById("id_MSCH_btn_delete");
            el_MSCH_btn_delete.addEventListener("click", function() {MSCH_Save("delete")}, false )
        let el_MSCH_btn_save = document.getElementById("id_MSCH_btn_save");
            el_MSCH_btn_save.addEventListener("click", function() {MSCH_Save("save")}, false )

// ---  MODAL ABSENCE ------------------------------------
        let el_MAB_input_employee = document.getElementById("id_MAB_input_employee")
            el_MAB_input_employee.addEventListener("focus", function() {MAB_GotFocus("employee", el_MAB_input_employee)}, false )
            el_MAB_input_employee.addEventListener("keyup", function(event){
                    setTimeout(function() {MAB_InputElementKeyup("employee", el_MAB_input_employee)}, 50)});
        let el_MAB_input_abscat = document.getElementById("id_MAB_input_abscat")
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
        let el_MAB_nosat = document.getElementById("id_MAB_nosat");
            el_MAB_nosat.addEventListener("change", function() {MAB_nosatsunphChanged(el_MAB_nosat)}, false );
        let el_MAB_nosun = document.getElementById("id_MAB_nosun");
            el_MAB_nosun.addEventListener("change", function() {MAB_nosatsunphChanged(el_MAB_nosun)}, false );
        let el_MAB_noph = document.getElementById("id_MAB_noph");
            el_MAB_noph.addEventListener("change", function() {MAB_nosatsunphChanged(el_MAB_noph)}, false );
        let el_MAB_btn_save = document.getElementById("id_MAB_btn_save");
            el_MAB_btn_save.addEventListener("click", function() {MAB_Save("save")}, false );
        let el_MAB_btn_delete = document.getElementById("id_MAB_btn_delete");
            el_MAB_btn_delete.addEventListener("click", function() {MAB_Save("delete")}, false );

// ---  Modal Copyfrom Template
        let el_mod_copyfrom_cust = document.getElementById("id_mod_copyfrom_customer")
             el_mod_copyfrom_cust.addEventListener("change", function() {ModCopyfromTemplateEdit("customer")}, false)
        let el_mod_copyfrom_order = document.getElementById("id_mod_copyfrom_order")
             el_mod_copyfrom_order.addEventListener("change", function() {ModCopyfromTemplateEdit("order")}, false)
        let el_mod_copyfrom_code = document.getElementById("id_mod_copyfrom_code")
             el_mod_copyfrom_code.addEventListener("keyup", function() {ModCopyfromTemplateEdit("code")})
        //let el_mod_copyfrom_datestart = document.getElementById("id_mod_copyfrom_datestart")
        //    el_mod_copyfrom_datestart.addEventListener("change", function() {ModCopyfromTemplateEdit("datestart")})
        document.getElementById("id_mod_copyfrom_btn_save").addEventListener("click", function() {ModCopyfromTemplateSave()})

// ---  Modal Copyto Template
        document.getElementById("id_mod_copyto_code").addEventListener("keyup", function() {ModCopytoTemplateEdit()})
        document.getElementById("id_mod_copyto_btn_save").addEventListener("click", function() {ModalCopytoTemplateSave()})

// ---  save button in ModConfirm
        let el_confirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_confirm_btn_save.addEventListener("click", function() {ModConfirmSave()});

// ---  edit and save button in ModRosterdate
        //document.getElementById("id_mod_rosterdate_input").addEventListener("change", function() {ModRosterdateEdit()}, false)
        //document.getElementById("id_mod_rosterdate_btn_ok").addEventListener("click", function() {ModRosterdateSave()}, false)

// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )

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

// --- hide fill buttons
        ShowButtonsTableSchemeitem(false);
        
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
        // show_absence = null is for testing, show_absence must be false in production
        const show_absence_FOR_TESTING_ONLY = null;
        //const show_absence_FOR_TESTING_ONLY = false;
        const datalist_request = {
            setting: {page_scheme: {mode: "get"},
                      selected_pk: {mode: "get"}
                      },
            quicksave: {mode: "get"},
            locale: {page: "scheme"},
            order_list: {isabsence: show_absence_FOR_TESTING_ONLY, istemplate: false, inactive: false},
            order_schemes_list: {istemplate: false},
            employee_list: {inactive: null}
            };
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( "datalist_request", datalist_request)

        // show loader
        el_loader.classList.remove(cls_hide)
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
                el_loader.classList.add(cls_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
// --- create Submenu after downloading locale
                    CreateSubmenu()
// --- create select header row and addnew rows after downloading locale
                    CreateSelectHeaderRows();
                    CreateSelectAddnewRows();
                }

                // retrieve setting_dict first. Settings will be used when filling tables
                if ("setting_dict" in response) {
                    UpdateSettings(response["setting_dict"])
                }
                if ("quicksave" in response) {
                    quicksave = get_dict_value(response, ["quicksave", "value"], false)
                }

// --- refresh maps and fill tables
                refresh_maps(response);
                UpdateTablesAfterResponse(response);
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                // hide loader
                el_loader.classList.add(cls_hide)
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//=========  refresh_maps  ================ PR2020-01-15
    function refresh_maps(response) {

    // 'order' must come before 'customer'
        if ("order_list" in response) {
            get_datamap(response["order_list"], order_map)
            // check if selected_order exists in order_map
            if(!selected_item_exists_in_map(order_map, "order", selected.order_pk)){
                selected.customer_pk = 0;
                selected.order_pk = 0;
                selected.scheme_pk = 0;
                selected.shift_pk = 0;
                selected.team_pk = 0;
                selected.tblRow_rowIndex = null;
                }
        }
        if ("team_list" in response) {get_datamap(response["team_list"], team_map)}
        if ("scheme_list" in response) {get_datamap(response["scheme_list"], scheme_map)}
        if ("shift_list" in response) {get_datamap(response["shift_list"], shift_map)}
        if ("teammember_list" in response) {get_datamap(response["teammember_list"], teammember_map)}
        if ("schemeitem_list" in response) {get_datamap(response["schemeitem_list"], schemeitem_map)}
        if ("employee_list" in response) {get_datamap(response["employee_list"], employee_map)}
        if ("abscat_list" in response) {get_datamap(response["abscat_list"], abscat_map)}
        if ("absence_list" in response) {
            get_datamap(response["absence_list"], absence_map, "absence");
            console.log("absence_map", absence_map)
        }
    }  // refresh_maps

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
        AddSubmenuButton(el_div, loc.Add_scheme, function (){HandleAddNewBtn()}, null, "id_menubtn_add_scheme");
        AddSubmenuButton(el_div, loc.Delete_scheme, function (){HandleDeleteScheme()}, ["mx-2"], "id_menubtn_delete_scheme");
        AddSubmenuButton(el_div, loc.menubtn_copy_to_template, function (){ModCopyTemplateOpen()}, ["mx-2"], "id_menubtn_copy_template");
        AddSubmenuButton(el_div, loc.menubtn_show_templates, function (){HandleSubmenubtnTemplateShow()}, ["mx-2"], "id_menubtn_show_templates");

        el_submenu.appendChild(el_div);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu

//=========  RefreshSubmenuButtons  ================ PR2020-03-12
    function RefreshSubmenuButtons() {
        let btn_add_scheme = document.getElementById("id_menubtn_add_scheme");
        let btn_delete_scheme = document.getElementById("id_menubtn_delete_scheme");
        let btn_copy_template = document.getElementById("id_menubtn_copy_template");
        let btn_show_templates = document.getElementById("id_menubtn_show_templates");

        btn_add_scheme.innerText = (is_absence_mode) ? loc.Add_absence : (is_template_mode) ? loc.Add_template : loc.Add_scheme;
        btn_delete_scheme.innerText = (is_absence_mode) ? loc.Delete_absence : (is_template_mode) ? loc.Delete_template :loc.Delete_scheme;
        btn_show_templates.innerText = (is_template_mode) ? loc.menubtn_hide_templates :loc.menubtn_show_templates;

        btn_copy_template.innerText = (is_template_mode) ? loc.menubtn_copy_to_order : loc.menubtn_copy_to_template
        if(selected.scheme_pk && !is_absence_mode){
            btn_copy_template.removeAttribute("aria-disabled");
            btn_copy_template.classList.remove("tsa_color_mediumgrey");
        } else {
            btn_copy_template.setAttribute("aria-disabled", true);
            btn_copy_template.classList.add("tsa_color_mediumgrey");
        }

        if( (selected.scheme_pk && !is_absence_mode) || (selected.teammember_pk && is_absence_mode) ){
            btn_delete_scheme.removeAttribute("aria-disabled");
            btn_delete_scheme.classList.remove("tsa_color_mediumgrey");
        } else {
            btn_delete_scheme.setAttribute("aria-disabled", true);
            btn_delete_scheme.classList.add("tsa_color_mediumgrey");
        }
    }

//=========  HandleSubmenubtnTemplateShow  ================ PR2019-09-15 PR2020-05-28
    function HandleSubmenubtnTemplateShow() {
        console.log("--- HandleSubmenubtnTemplateShow")
        // template order will be retrieved from database in function HandleSelectOrder
        is_template_mode = !is_template_mode
        let sel_customer_pk = null, sel_order_pk = null;

// reset header text
        UpdateHeaderText("HandleSubmenubtnTemplateShow");

// reset selected customer and order
        if(is_template_mode){
            is_absence_mode = false;

            selected.customer_pk = 0;
            selected.order_pk = 0;
            selected.scheme_pk = 0;

// lookup template order in order_map
            if(!!order_map.size){
                for (const [map_id, item_dict] of order_map.entries()) {
                    const is_template = get_dict_value(item_dict, [ "id", "istemplate"], false)
                    if (is_template) {
                        console.log("--- is_template found")
                       sel_order_pk = get_dict_value(item_dict, [ "id", "pk"], 0)
                        sel_customer_pk = get_dict_value(item_dict, [ "id", "ppk"], 0)
                        //mod_dict.order_pk = get_dict_value(item_dict, [ "id", "pk"], 0)
                       // mod_dict.customer_pk = get_dict_value(item_dict, [ "id", "ppk"], 0)

                        console.log("--- selected.order_pk", selected.order_pk)
                        console.log("--- selected.customer_pk", selected.customer_pk)
                        break;
            }}};
        } else {
            selected.customer_pk = settings.customer_pk;
            selected.order_pk = settings.order_pk;
            selected.scheme_pk =  settings.scheme_pk;
        }

// reset scheme, team, shift
        sidebar_tblBody_scheme.innerText = null;
        sidebar_tblBody_shift.innerText = null;
        sidebar_tblBody_team.innerText = null;

        FillOption_Copyfrom_CustomerOrder("customer", "HandleSubmenubtnTemplateShow");

        HandleSelectOrder(sel_customer_pk, sel_order_pk);

        add_or_remove_class(document.getElementById("id_sidebar_div_select_order"),cls_hide, is_template_mode )
        add_or_remove_class(document.getElementById("id_select_template_div"),cls_hide, !is_template_mode )

        RefreshSubmenuButtons();
    }  // HandleSubmenubtnTemplateShow

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25 PR2020-05-24
    function HandleBtnSelect(btn_mode, skip_update) {
        console.log( "==== HandleBtnSelect ========= " );
        // btns are:"btn_grid", "btn_schemeitem", "btn_shift", "btn_team", "btn_scheme", "btn_absence"

        selected_btn = (btn_mode) ? btn_mode : "btn_grid";

// ---  get tblName, is null when btn = "btn_grid"
        // tblNames are 'shift', 'teammember', 'scheme', 'absence', 'schemeitem'. Null for btn_grid
        const tblName = get_tblName_from_selectedBtn(selected_btn);
        //console.log( "tblName: ", tblName );
        //console.log( "btn_mode: ", btn_mode );
        //console.log( "skip_update: ", skip_update );

// ---  set is_absence_mode
        is_absence_mode = (selected_btn === "btn_absence");
        if (is_absence_mode){is_template_mode = false};
        //console.log( "is_absence_mode: ", is_absence_mode ,"is_template_mode: ", is_template_mode );

// ---  upload new selected_btn, not after loading page (then skip_update = true)
        if(!skip_update){
            const upload_dict = {page_scheme: {btn: selected_btn}};
            UploadSettings(upload_dict, url_settings_upload);
        }

// ---  set btntext 'Add scheme / Delete scheme', enable/disable delete btn
        RefreshSubmenuButtons();

// ---  highlight selected button
        let btn_container = document.getElementById("id_btn_container")
        t_HighlightBtnSelect(btn_container, selected_btn);

// ---  show / hide tblBody_datatable or el_div_gridlayout
        const show_grid = (selected_btn === "btn_grid");
        let el_div_datatable = document.getElementById("id_div_datatable");
        let el_div_gridlayout = document.getElementById("id_div_gridlayout");
        add_or_remove_class(el_div_datatable,cls_hide, show_grid);
        add_or_remove_class(el_div_gridlayout, cls_hide, !show_grid);
        //console.log( "show_grid: ", show_grid );
        //console.log( "el_div_gridlayout: ", el_div_gridlayout );

// +++  when is_absence_mode
        if (is_absence_mode && !skip_update){
            if(!skip_update) {
                let datalist_request = {
                    abscat: {inactive: false},
                    teammember_list: {employee_nonull: false, is_template: false, is_absence: true},
                    };
                DatalistDownload(datalist_request);
            }
        } else {

    // ---  fill TableRows, resets when tblName=null (when btn_grid)
            FillTableRows(tblName, is_absence_mode)

    // --- fill grid with selected.scheme, only when btn_grid, reset otherwise
            let scheme_dict = {};
            if (selected_btn === "btn_grid" && selected.scheme_pk){
                scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected.scheme_pk);
            }
            Grid_FillGrid(scheme_dict, "HandleBtnSelect")

        }  // if (is_absence_mode){

// ---  highlight row in datatable
        //FilterTableRows(tblBody_datatable)

// --- update header text
        UpdateHeaderText("HandleBtnSelect");

    }  // HandleBtnSelect

//=========  HandleSelectCustomer  ================ PR2019-03-23
    function HandleSelectCustomerXXX(el, called_by) {
        //console.log("--- HandleSelectCustomer --- called by: ", called_by)
        // in FillOption_Copyfrom_CustomerOrder the first row is set selected=true when there is only one row

// reset lists
        // don't reset lists, all items are already downloaded

// reset selected customer
        selected.customer_pk = 0

// reset selected order
        selected.order_pk = 0
        el_mod_copyfrom_order.innerText = null

// reset tables scheme_select, schemeitems, teammember and team input box
        selected.scheme_pk = 0;
        sidebar_tblBody_scheme.innerText = null;
        sidebar_tblBody_shift.innerText = null;
        sidebar_tblBody_team.innerText = null;

        tblBody_datatable.innerText = null;

// --- reset grid and SchemeInputElements, disable SubmenuButtons
        Grid_FillGrid({}, "HandleSelectCustomer")
        //UpdateSchemeInputElements({}, "HandleSelectCustomer");
        RefreshSubmenuButtons();

// get selected customer, put name in header
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        // after first DatalistDownload, when there is only 1 customer, selected.customer_pk gets this value
        //  HandleSelectCustomer has then no parameter 'el' and selected.customer_pk has value
        if(!!el){
        // get selected customer from select element
            const sel_cust_value = parseInt(el.value);
            if (!!sel_cust_value){
                selected.customer_pk = sel_cust_value
                selected.order_pk = 0
// --- save selected.customer_pk in Usersettings, not in template mode
                if(!is_template_mode){
                    settings.customer_pk = selected.customer_pk
                    const upload_dict = {selected_pk: { sel_customer_pk: selected.customer_pk, sel_order_pk: selected.order_pk}};
                    UploadSettings (upload_dict, url_settings_upload);
                }

            }

            if (!!selected.customer_pk){
                el.value = selected.customer_pk

// copy selected customer, to other fields with selected customer
                if (el.id === "id_select_customer") {
                    el_mod_copyfrom_cust.selectedIndex = el.selectedIndex
                } else if (el.id === "id_mod_copyfrom_customer") {
                    //el_select_customer.selectedIndex = el.selectedIndex
                }

        // fill the three select order elements
                FillOption_Copyfrom_CustomerOrder("order", "HandleSelectCustomer", selected.customer_pk)

         // if there is only 1 order, that one is selected (selected.order_pk gets value in FillOption_Copyfrom_CustomerOrder)
        // else: use settings.order_pk if there is one

                const sel_order_value = parseInt(el_select_order.value);
                if (!!sel_order_value){
                    selected.order_pk = parseInt(sel_order_value);
                } else if (!!settings.order_pk){
                    // check if settings.order_pk exists
                    const map_id = get_map_id("order", settings.order_pk.toString());
                    const order_dict = get_mapdict_from_datamap_by_id(order_map, map_id);
                    if(!isEmpty(order_dict)){
                        selected.order_pk = parseInt(settings.order_pk);
        // reset settings.order_pk
                        settings.order_pk = 0
                        el_select_order.value = selected.order_pk
                    }
                }

                if (!!selected.order_pk){
                    HandleSelectOrder()
                };
            }  //  if (!!pk_int)
        }  // if(!!el)

        UpdateHeaderText("HandleSelectCustomer")
    }  // HandleSelectCustomer

//=========  HandleSelectOrder  ================ PR2019-03-24 PR2020-05-21
    function HandleSelectOrder(sel_customer_pk, sel_order_pk ) {
        console.log("=====  HandleSelectOrder =========");
        console.log("mod_MSCO_dict: ", mod_MSCO_dict)
        //called by MSCO_Save, HandleSelectCustomer select_order.Event.Change, MSCH_Validate
        // retrieve the schemes etc of selected order from database
// ---  reset lists
        // reset after retrieving info from server
// ---  update header text
        UpdateHeaderText("HandleSelectOrder")
// ---  reset selected.order_pk etc.
        // put new value in selected after retrieving info from server
        selected.customer_pk = 0;
        selected.order_pk = 0;
        selected.scheme_pk = 0;
        selected.team_pk = 0;
        selected.shift_pk = 0;
        el_mod_copyfrom_order.innerText = null
// reset header text in sidebar and above select buttons
        el_sidebar_select_order.value = loc.Select_customer_and_order;
        document.getElementById("id_hdr_text").innerText = loc.Select_customer_and_order;
        document.getElementById("id_hdr_right_text").innerText = null;

        sidebar_tblBody_scheme.innerText = null;
        sidebar_tblBody_shift.innerText = null;
        sidebar_tblBody_team.innerText = null;
// reset tables schemeitems, shift and teammember
        tblHead_datatable.innerText = null;
        tblBody_datatable.innerText = null;
        tblFoot_datatable.innerText = null;

// --- reset grid and SchemeInputElements, disable SubmenuButtons
        Grid_FillGrid({}, "HandleSelectOrder");
        //UpdateSchemeInputElements({}, "HandleSelectCustomer");
        RefreshSubmenuButtons();

// ---  get is_absence_mode TODO
        let is_absence_mode = false;
// ---  get sel_order_pk
        // TODO handle after first download
        // after first DatalistDownload, when there is only 1 customer, selected.customer_pk gets this value
        //  in that case HandleSelectOrder has no parameter 'el' and selected.order_pk has value

// get pk of selected order from parameters
// if no order selected: check if there is an order_pk in settings
        if (sel_order_pk){
// --- save selected.order_pk in Usersettings, not in template mode
            if(!is_template_mode){
                const upload_dict = {selected_pk: {sel_customer_pk: sel_customer_pk, sel_order_pk: sel_order_pk}};
                UploadSettings (upload_dict, url_settings_upload);
            }
        }
// TODO fix  el_mod_copyfrom_order
/*
        if (!!el_select_order){
            if (el_select_order.id === "id_select_order") {
                el_mod_copyfrom_order.selectedIndex = el_select_order.selectedIndex
            } else if (el_select_order.id === "id_mod_scheme_order") {
                el_select_order.selectedIndex = el_select_order.selectedIndex
                el_mod_copyfrom_order.selectedIndex = el_select_order.selectedIndex
            } else if (el_select_order.id === "id_mod_copyfrom_order") {
                el_select_order.selectedIndex = el_select_order.selectedIndex
            }
        }
        */
        // setting.selected_pk necessary to retrive saved order_pk when order_pk = null
        const datalist_request = { setting: {selected_pk: {get: true}},
                                    order_schemes_list: {order_pk: sel_order_pk,
                                                         istemplate: is_template_mode,
                                                         isabsence: is_absence_mode}};
        DatalistDownload(datalist_request);

        //SBR_FillSelectTable("scheme", "HandleSelectOrder", selected.scheme_pk, true);


// select table 'scheme' is filled by SBR_FillSelectTable("scheme"). This function is called in DatalistDownload
        //UpdateHeaderText("HandleSelectOrder")
    }  // HandleSelectOrder

//=========  HandleSelect_Row ================ PR2019-12-01 PR2020-05-22
    function HandleSelect_Row(sel_tr_clicked) {
        console.log( "===== HandleSelect_Row  ========= ");
        console.log( sel_tr_clicked);
        // selectRow tables are: scheme, shift, team
        // if sel_tr_clicked does not exist: it is a deleted scheme
        let sel_tblName = null, sel_pk_str = null;
        let map_dict = {};
        if(!!sel_tr_clicked) {
// ---  get map_dict
            sel_tblName = get_attr_from_el(sel_tr_clicked, "data-table")
            sel_pk_str = get_attr_from_el(sel_tr_clicked, "data-pk")
            const map_id = get_map_id(sel_tblName, sel_pk_str);
            if (sel_tblName === "scheme"){ map_dict = scheme_map.get(map_id)} else
            if (sel_tblName === "shift") { map_dict = shift_map.get(map_id)} else
            if (sel_tblName === "team") { map_dict = team_map.get(map_id)}

            const is_addnew_row = !Number(sel_pk_str);

            console.log( "sel_tblName", sel_tblName);
            console.log( "is_addnew_row", is_addnew_row);
            console.log( "map_dict", map_dict);

            if (is_addnew_row && sel_tblName === "shift"){
// ---  set focus to addnewrow
        // when selectteam: focus to addnew teammember will be set after response of new team
                let tblRow = tblFoot_datatable.rows[0];
                if (!!tblRow){
                    HandleTableRowClicked(tblRow, true) // true = skip_highlight_selectrow
                    let el_input = tblRow.cells[0].children[0];
                    if (!!el_input){
                        setTimeout(function() {el_input.focus()}, 50);
                    }
                }
            } else if (!isEmpty(map_dict)){

// ---  get info from mapdict
                const sel_pk_int = get_dict_value(map_dict, ["id", "pk"], 0);
                const sel_ppk_int = get_dict_value(map_dict, ["id", "ppk"], 0);

// ---  update selected.scheme_pk (and selected.order_pk to be on the safe side)
                if (sel_tblName === "scheme"){
                    // PR2020-04-19 always update team and shift. Was: if(sel_pk_int !== selected.scheme_pk){
                    selected.order_pk = sel_ppk_int;
                    selected.scheme_pk = sel_pk_int;
// --- deselect selected.shift_pk and selected.team_pk when selected.scheme_pk changes
                    selected.shift_pk = 0;
                    selected.team_pk = 0;
// ---  save selected.scheme_pk in Usersettings, not in template mode
                    if(!is_template_mode){
                        const upload_dict = {selected_pk: {sel_order_pk: sel_ppk_int,
                                                           sel_scheme_pk: sel_pk_int}};
                        UploadSettings (upload_dict, url_settings_upload);
                    }
// --- Add ppk_int to addnewRow of selecttable shift and team
                    document.getElementById("sel_shift_addnew").setAttribute("data-ppk", selected.scheme_pk)
                    document.getElementById("sel_team_addnew").setAttribute("data-ppk", selected.scheme_pk)
// --- Fill select table Shift and Teams
                    SBR_FillSelectTable("shift", "HandleSelect_Row", false); // false = is not curremt select table
                    SBR_FillSelectTable("team", "HandleSelect_Row" , false); // false = is not curremt select table
// --- fill data table
                    tblHead_datatable.innerText = null;
                    tblBody_datatable.innerText = null;
                    tblFoot_datatable.innerText = null;
                    //selected_btns / data_mode are: btn_schemeitem, btn_shift, btn_team, btn_scheme
                    const fill_tblName = (selected_btn === "btn_schemeitem") ? "schemeitem" :
                                         (selected_btn === "btn_shift") ? "shift" :
                                         (selected_btn === "btn_team") ? "teammember" : null;
                    if (fill_tblName){FillTableRows(fill_tblName);}
// reset addnew row, fill options shifts and team
                    // needed to update ppk in addnew row PR2020-03-16 was: dont, already called by FillTableRows

// disable/enable menubutton delete scheme
                    RefreshSubmenuButtons()
                } else if (sel_tblName === "shift"){
// ---  update selected.shift_pk
                    selected.shift_pk = sel_pk_int;

                // ---  set focus to selected shift row
                        // --- lookup row 'add new' in tfoot
                        const tblName = (sel_tblName === "shift") ? "shift" : "teammember";
                        const len = tblBody_datatable.rows.length;
                        if (!!len){
                            for (let i = 0; i < len; i++) {
                                const tblRow = tblBody_datatable.rows[i]
                                const row_shift_pk = get_attr_from_el(tblRow,"data-pk")
                                if (row_shift_pk === selected.shift_pk.toString()){
                                    HandleTableRowClicked(tblRow, true) // true = skip_highlight_selectrow
                                    let el_input = tblRow.cells[0].children[0];
                                    if (!!el_input){
                                        setTimeout(function() {el_input.focus()}, 50);
                                    }
                                    break;
                                }

                            }
                        };

                } else if (sel_tblName === "team"){
// ---  update selected.team_pk
                    selected.team_pk = sel_pk_int;
                    //console.log("before FillTableRows: selected.team_pk", selected.team_pk)
                    FillTableRows("teammember");
                }
            }  //   if (!isEmpty(map_dict))
        } else {
            sel_tblName = "scheme";
        } // if(!!sel_tr_clicked)

// ---  highlight clicked row in select table
        // make all rows of this select_table light yellow
        // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
        if (sel_tblName === "scheme"){
            ChangeBackgroundRows(sidebar_tblBody_scheme, cls_bc_yellow_lightlight, false, sel_tr_clicked, cls_bc_yellow)
            ChangeBackgroundRows(sidebar_tblBody_shift, cls_bc_lightlightgrey, false)
            ChangeBackgroundRows(sidebar_tblBody_team, cls_bc_lightlightgrey, false)

// --- fill grid with new scheme
            Grid_FillGrid(map_dict, "HandleSelect_Row")

// --- fill form input fields and tables
            //UpdateSchemeInputElements(map_dict, "HandleSelect_Row");

        } else if (sel_tblName === "shift" || sel_tblName === "team"){
            ChangeBackgroundRows(sidebar_tblBody_scheme, cls_bc_lightlightgrey, true)
            let tblBody_this = (sel_tblName === "shift") ? sidebar_tblBody_shift : sidebar_tblBody_team;
            let tblBody_other1 = (sel_tblName === "shift") ? sidebar_tblBody_team : sidebar_tblBody_shift;
            ChangeBackgroundRows(tblBody_this, cls_bc_yellow_lightlight, false, sel_tr_clicked, cls_bc_yellow)
            ChangeBackgroundRows(tblBody_other1, cls_bc_lightlightgrey, false)
        }

// --- get header_text
        UpdateHeaderText("HandleSelect_Row")
        //if (sel_tblName === "scheme"){
            //UpdateSchemeInputElements(map_dict, "HandleSelect_Row")
        //}

// hide or show tables
        //console.log( "sel_tblName", sel_tblName);

        // change selected_btn to 'team' when team is selected, to 'shift' when shift is selected,
        // when scheme is selected and btn_mode = "btn_schemeitem : let it stay,
        // goto btn_grid otherwise

        const btn_mode = (sel_tblName === "team") ? "btn_team" :
                         (sel_tblName === "shift") ? "btn_shift" : selected_btn;
                       //  (sel_tblName === "scheme" && selected_btn === "btn_schemeitem") ? "btn_schemeitem" : "btn_grid";
        HandleBtnSelect(btn_mode);
        /*
        const show_table_schemeitem = (sel_tblName === "scheme");
        const show_table_shift = (sel_tblName === "shift");
        const show_table_teammember = (sel_tblName === "team");
        if (sel_tblName === "scheme") { document.getElementById("id_div_tbl_schemeitem").classList.remove(cls_hide)
            } else { document.getElementById("id_div_tbl_schemeitem").classList.add(cls_hide)}
        if (sel_tblName === "shift") { document.getElementById("id_div_tbl_shift").classList.remove(cls_hide)
            } else { document.getElementById("id_div_tbl_shift").classList.add(cls_hide)}
        if (sel_tblName === "team") { document.getElementById("id_div_tbl_teammember").classList.remove(cls_hide)
            } else { document.getElementById("id_div_tbl_teammember").classList.add(cls_hide)}
*/
// put pk and ppk of selected customer in addnew row
        const sel_scheme_or_team_pk = (sel_tblName === "team") ? selected.team_pk : selected.scheme_pk
        const item_tblName = (sel_tblName === "team") ? "teammember" :
                             (sel_tblName === "shift") ? "shift" : "schemeitem";
        UpdateAddnewRow(item_tblName, sel_scheme_or_team_pk);

// --- hide or show fill buttons in schemeitems
        const show_buttons = (sel_tblName === "scheme")
        ShowButtonsTableSchemeitem(show_buttons);
    }  // HandleSelect_Row

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked, skip_highlight_selectrow) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        const tblName = get_attr_from_el(tr_clicked, "data-table");

        DeselectHighlightedTblbody(tblBody_datatable, cls_selected)
        DeselectHighlightedTblbody(tblFoot_datatable, cls_selected)

        tr_clicked.classList.add(cls_selected)

// ---  get clicked tablerow
        if(!!tr_clicked) {
            const selected_tblRow_pk = get_datapk_from_element(tr_clicked);
            selected.tblRow_rowIndex = tr_clicked.rowIndex;
            selected.tblRow_id = tr_clicked.id;

// ---  highlight row in selecttable, not when called by HandleSelect_Row
            if(!!skip_highlight_selectrow){
                const tblName = get_attr_from_el(tr_clicked, "data-table")
                if (["shift", "team"].indexOf( tblName ) > -1){
                    let tblBody_select = (tblName === "shift") ? sidebar_tblBody_shift : sidebar_tblBody_team;
                    //  params: tableBody, cls_selected, cls_background
                    HighlightSelectRowByPk(tblBody_select, selected_tblRow_pk, cls_bc_yellow, cls_bc_yellow_lightlight);
                }
            }
        } else {
            selected.tblRow_rowIndex = null;
            selected.tblRow_id = null;
        }
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
        console.log("=== HandleBtnSchemeitems =========", param_name);

        if (!!selected.scheme_pk){
        // params are: prev, next, dayup, daydown, autofill, delete
            if (param_name === "delete" && !skip_confirm) {
                ModConfirmOpen("schemeitem_delete");
            } else {
                let parameters = {"upload": JSON.stringify ({mode: param_name, scheme_pk: selected.scheme_pk})};
                //console.log("parameters ", parameters);

                // show loader
                el_loader.classList.remove(cls_hide)

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
                        el_loader.classList.add(cls_hide)
                        if ("schemeitem_list" in response) {
                            get_datamap(response["schemeitem_list"], schemeitem_map)
                            console.log( "schemeitem_list selected.scheme_pk", selected.scheme_pk, typeof selected.scheme_pk);
                            FillTableRows("schemeitem")
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        // hide loader
                        el_loader.classList.add(cls_hide)
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
        // console.log("pk_new", pk_new, "ppk", parent_pk);

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
        let tblRow = CreateTblRow(tblBody_datatable, "schemeitem", false, pk_new, parent_pk, scheme_pk, row_index, order_by)

// Update TableRow
        // console.log("eitem_dict", item_dict);
        UpdateTableRow(tblRow, item_dict, "HandleCreateSchemeItem")
    }  // HandleCreateSchemeItem

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        console.log("=========  function HandleFilterInactive =========");
        console.log(el);
// toggle value
        selected_order_pk = !selected_order_pk

// toggle icon
        let img_src = (selected_order_pk) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
        console.log("img_src", img_src);
        el.firstChild.setAttribute("src", img_src);

        //FilterTableRows(sidebar_tblBody_scheme, "", 1, selected_order_pk)
    }  // function HandleFilterInactive

//##################################################################################

// +++++++++++++++++ CREATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= CreateSelectRow  ============= PR2019-10-20
    // TODO switch to t_CreateSelectRow
    function CreateSelectRow(tblBody_select, item_dict, row_index) {
        console.log("CreateSelectRow");
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
        console.log("========= HandleSelectAddnewRow ===" );
        console.log(sel_tblRow);

        if (!!sel_tblRow){

// ---  get pk from id of tblRow
            const tblName = get_attr_from_el(sel_tblRow, "data-table");
            const pk_str = sel_tblRow.getAttribute("data-pk");
            const ppk_int = parseInt(sel_tblRow.getAttribute("data-ppk"));
            console.log(" tblName", tblName);
            console.log(" pk_str", pk_str);
            console.log(" ppk_int", ppk_int);

            if (tblName === "shift"){
                selected.shift_pk = 0
                HandleSelect_Row(sel_tblRow)
            } else  if (tblName === "team"){
                selected.team_pk = 0

        console.log( "HandleSelectAddnewRow: selected.team_pk", selected.team_pk);
// ---  create upload_dict
                const upload_dict = {"id":{"temp_pk": pk_str, "ppk": ppk_int, "table": tblName, "create": true}}
                const url_str = url_scheme_shift_team_upload;
                UploadChanges(upload_dict, url_str, "HandleSelectAddnewRow");
                //HandleSelectTable(sel_tblRow)
            }
        }  //  if (!!tblRow)
    }  // HandleSelectAddnewRow

//========= FillOption_Copyfrom_CustomerOrder  ====================================
    function FillOption_Copyfrom_CustomerOrder(tblName, called_by, ppk_str) {
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
        // put option_text in select elements -- only el_mod_copyfrom_order el_mod_copyfrom_cust
        let el_select = (tblName === "order") ? el_mod_copyfrom_order  : null;
        if(!!el_select){
            el_select.innerHTML = option_text;
            // if there is only 1 option: select first option
            if (select_first_option){el_select.selectedIndex = 0};
        }
    }  //function FillOption_Copyfrom_CustomerOrder

//========= SBR_FillSelectTable  ============= PR2019-09-23 PR2020-05-22
    function SBR_FillSelectTable(tblName, called_by, is_current_table) {
        //console.log( "=== SBR_FillSelectTable === ", tblName, called_by, is_current_table);

        let selected_ppk_int = 0;
        let tblBody, tblHead, data_map, include_parent_code = false, selected_pk, filter_ppk,
        filter_include_inactive = null, filter_include_absence = null, filter_istemplate = null, addall_to_list_txt = null,
        filter_show_inactive = null, title_header_btn = null, title_row_btn = null;
        let imgsrc_default, imgsrc_default_header, imgsrc_default_black, imgsrc_hover, has_delete_btn = false;
        let header_txt = null;
        if (tblName === "template"){
            // used in ModCopyfromTemplateOpen
            data_map = scheme_map;
            tblBody = document.getElementById("id_mod_copyfrom_tblbody");

        }


        if (tblName === "scheme"){
            // always delete innerText of sidebar_tblBody_shift and of sidebar_tblBody_team
            sidebar_tblBody_shift.innerText = null;
            sidebar_tblBody_team.innerText = null;

            tblBody = sidebar_tblBody_scheme;
            tblHead = document.getElementById("id_select_thead_scheme");
            data_map = scheme_map;
            selected_pk = selected.scheme_pk;
            filter_ppk = selected.order_pk;
            filter_show_inactive = true;
            filter_include_inactive = true;
            filter_include_absence = (show_absence_FOR_TESTING_ONLY !== false);
            filter_istemplate = is_template_mode;

            imgsrc_default = imgsrc_inactive_grey;
            imgsrc_default_header = imgsrc_inactive_lightgrey;
            imgsrc_default_black = imgsrc_inactive_black;
            imgsrc_hover = imgsrc_hover;
            header_txt = loc.Schemes + ":";
            title_header_btn = loc.Cick_show_inactive_schemes;
/*
            if ( !!has_rows_arr[0] && ["calendar", "planning"].indexOf(selected_btn) > -1){
                document.getElementById("id_div_tbody_select_order").classList.remove(cls_hide)
            } else {
                document.getElementById("id_div_tbody_select_order").classList.add(cls_hide)
            };
            */

        } else if (tblName === "shift"){
            selected_ppk_int = selected.scheme_pk;
            data_map = shift_map
            tblBody = sidebar_tblBody_shift

            tblBody = sidebar_tblBody_shift;
            tblHead = document.getElementById("id_select_thead_shift");
            data_map = shift_map;
            //tblName = "shift";
            selected_pk = selected.shift_pk;
            filter_ppk = selected.scheme_pk;
            // shift has no field inactive
            filter_show_inactive = null, filter_include_inactive = null;

            // table only shows shifs of this scheme. ABsnece and template are already filtered
            filter_include_absence = null, filter_istemplate = null;
            has_delete_btn = true;
            imgsrc_default = imgsrc_delete;
            imgsrc_hover = imgsrc_deletered;

            header_txt = loc.Shifts + ":";

        } else if (tblName === "team"){
            selected_ppk_int =  selected.scheme_pk;
            data_map = team_map
            tblBody = sidebar_tblBody_team

            selected_ppk_int = selected.scheme_pk;
            data_map = team_map
            tblBody = sidebar_tblBody_team
            tblHead = document.getElementById("id_select_thead_team");

            selected_pk = selected.team_pk;
            filter_ppk = selected.scheme_pk;
            // team has no field inactive
            filter_show_inactive = null, filter_include_inactive = null;

            // table only shows teams of this scheme. Absence and template are already filtered
            filter_include_absence = null, filter_istemplate = null;
            has_delete_btn = true;
            imgsrc_default = imgsrc_delete;
            imgsrc_hover = imgsrc_deletered;

            header_txt = loc.Teams + ":";

        }  // if (tblName === "scheme")

        let tblRow_selected = null;;

        t_Fill_SelectTable(tblBody, tblHead, data_map, tblName, selected_pk, include_parent_code,
            HandleSelect_Filter, HandleSelectFilterButton, HandleSelect_Row, HandleSelectRowButton, has_delete_btn,
            filter_ppk, filter_show_inactive, filter_include_inactive, filter_include_absence, filter_istemplate, addall_to_list_txt,
            cls_bc_lightlightgrey, cls_bc_yellow,
            imgsrc_default, imgsrc_default_header, imgsrc_default_black, imgsrc_hover,
            header_txt, title_header_btn, title_row_btn);
            // t_Filter_SelectRows(tblBody_select, filter_select, filter_show_inactive, has_ppk_filter, selected_ppk)
        //const filter_dict = t_Filter_SelectRows(sidebar_tblBody_scheme, null, filter_show_inactive, true, filter_ppk);

// --- show select_table scheme when selected.order_pk exists
        if (!!selected.order_pk){
            document.getElementById("id_select_table_scheme").classList.remove(cls_hide)
        } else {
            document.getElementById("id_select_table_scheme").classList.add(cls_hide)
        }
// --- show select_table shift and team hen selected.order_pk exists
        if (!!selected.scheme_pk){
            document.getElementById("id_select_table_shift").classList.remove(cls_hide)
            document.getElementById("id_select_table_team").classList.remove(cls_hide)
        } else {
            document.getElementById("id_select_table_shift").classList.add(cls_hide)
            document.getElementById("id_select_table_team").classList.add(cls_hide)
        }

// ++++++ select scheme if only 1 exists or when settings.scheme_pk has value and selectedRow exists ++++++
        // Dont highlight yet, scheme info is not downoloaded yet so teams and shift are not yet filled
        if (tblName === "scheme"){
            if(!!tblRow_selected){
                HandleSelect_Row(tblRow_selected, " SBR_FillSelectTable tblRow_selected");
            }
        }
    } // SBR_FillSelectTable


function HandleSelect_Filter(){console.log("HandleSelect_Filter")}

function HandleSelectFilterButton(){console.log("HandleSelectFilterButton")}


//========= HandleSelectRowButton  ============= PR2020-05-21
    function HandleSelectRowButton(el_input) {
        HandleBtnInactiveDeleteClicked("inactive", el_input);
    }
//========= HandleBtnDeleteClicked  ============= PR2020-05-21
    function HandleBtnDeleteClicked(el_input) {
        HandleBtnInactiveDeleteClicked("delete", el_input);
    }
//========= HandleBtnInactiveDeleteClicked  ============= PR2020-05-21
    function HandleBtnInactiveDeleteClicked(mode, el_input) {
        console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        console.log( "el_input", el_input);
        // values of mode are: "delete", "inactive"

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el_str(tblRow, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
            let map_dict;
            if (tblName === "order") { map_dict = order_map.get(map_id)} else
            if (tblName === "scheme") { map_dict = scheme_map.get(map_id)} else
            if (tblName === "roster"){ map_dict = roster_map.get(map_id)};

             console.log( "map_dict", map_dict);
        //console.log(map_dict);
    // ---  create upload_dict with id_dict
            const map_dict_id = get_dict_value(map_dict, ["id"])
            let upload_dict = {id:  {pk: get_dict_value(map_dict, ["id", "pk"]),
                                    ppk:  get_dict_value(map_dict, ["id", "ppk"]),
                                    table:  get_dict_value(map_dict, ["id", "table"]),
                                    isabsence:  get_dict_value(map_dict, ["id", "isabsence"]),
                                    istemplate:  get_dict_value(map_dict, ["id", "istemplate"])}
            };
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
                    // create mod_upload_dict, to store new_inactive
                    // store el_input.id, so el can be changed after modconfirm.save
                    // Note: event can be called by img element. In that case there is no id. Get id of parent instead
                    let el_id = (!!el_input.id) ? el_input.id : el_input.parentNode.id
                    mod_upload_dict = {inactive: upload_dict.inactive, el_id: el_id};
                    ModConfirmOpen("inactive", tblName, el_input);
                    return false;
                } else {
                    // change inactive icon, before uploading, not when new_inactive = true
                    format_inactive_element (el_input, {value: new_inactive}, imgsrc_inactive_black, imgsrc_inactive_grey)
                }
            }
            UploadDeleteChanges(upload_dict, url_scheme_shift_team_upload);
        }  // if(!!tblRow)
    }  // HandleBtnInactiveDeleteClicked


//========= CreateSelectHeaderRows  ============= PR2019-11-02
    function CreateSelectHeaderRows() {
        //console.log(" === CreateSelectHeaderRows ===")

        const tblList = ["scheme", "shift", "team"]
        for (let i = 0; i < 3; i++) {
            const tblName = (tblList[i]);

            const caption = (tblName === "scheme") ? loc.Select_scheme + ":" :
                            (tblName === "shift") ? loc.Shifts + ":" :
                            (tblName === "team") ? loc.Teams + ":" : "-"

        //console.log("caption: " , caption)
        // ++++++ add tHeadRow  ++++++
            let tblHead = document.getElementById("id_select_thead_" + tblName)
            tblHead.innerText = null
            let tHeadRow = tblHead.insertRow(-1);
                let th = document.createElement('th');
                    th.innerText = caption
                    th.classList.add("px-2")
            tHeadRow.appendChild(th);
            if(tblName === "scheme"){
                let td = tHeadRow.insertCell(-1);
                    let el_a = document.createElement("a");
                    CreateBtnDeleteInactive("inactive", false, tHeadRow, el_a, false);
                td.appendChild(el_a);
                td.classList.add("tw_032")
            }
        }
    }  // CreateSelectHeaderRows

//========= CreateSelectAddnewRow  ============= PR2019-11-01
    function CreateSelectAddnewRows() {
        //console.log(" ===CreateSelectAddnewRows tblName: " , tblName)


        const tblList = ["scheme", "shift", "team"]
        for (let i = 0; i < 3; i++) {
            const tblName = (tblList[i]);

            let ppk_int = (tblName === "scheme") ? selected.order_pk : selected.scheme_pk
            // ppk_int has no value yet, because AddnewRow is added at startup

    // ++++++ add addnew row  ++++++
            let tblFoot = document.getElementById("id_select_tfoot_" + tblName)

        //-- increase id_new
            id_new = id_new + 1
            const pk_new = "new" + id_new.toString()

        //--------- insert tblFoot row
            let tblRow = tblFoot.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            tblRow.setAttribute("id", "sel_" + tblName + "_addnew");
             tblRow.setAttribute("data-pk", pk_new);
            tblRow.setAttribute("data-ppk", ppk_int)
            tblRow.setAttribute("data-table", tblName);
            // --- put data-addnew in tr when is_addnew_row
            tblRow.setAttribute("data-addnew", true);

            tblRow.classList.add(cls_bc_lightlightgrey);
        //- add hover to tblFoot row
            // don't add hover to row 'Add scheme/Team'
            //- add hover to inactive button
            tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover)});

        // --- add first td to tblRow.
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el_a = document.createElement("div");

        // --- add EventListener to input element, add innerText
                if (tblName === "scheme"){
                    el_a.innerText = loc.Add_scheme + "..."
                    el_a.addEventListener("click", function() {MSCH_Open()}, false )
                } else if (tblName === "shift"){
                    el_a.innerText = "< " + loc.Add_shift + " >";
                    el_a.addEventListener("click", function() {HandleSelectAddnewRow(tblRow)}, false )
                } else if (tblName === "team"){
                    el_a.innerText = loc.Add_team + "..."
                    el_a.addEventListener("click", function() {HandleSelectAddnewRow(tblRow)}, false )
                };
                el_a.classList.add("tsa_color_darkgrey");
            td.appendChild(el_a);
            td.setAttribute("colspan", "2");
            td.classList.add("px-2")
        }
    }  // CreateSelectAddnewRows

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


//=========  CreateTblFooter  ===  PR2019-12-01 PR2020-05-26
    function CreateTblFooter(tblName) {
        console.log("===  CreateTblFooter == ");
        //console.log("tblName", tblName);
        // tblName = "schemeitem", "shift", "teammember", absence'
        tblFoot_datatable.innerText = null

// --- function adds row 'add new' in tfoot
        if(!!tblFoot_datatable){
            id_new += 1;
            const pk_new = "new" + id_new.toString()
            // selected.scheme_pk is still 0 when footer is created
            // this is an add-new row!
            const scheme_pk = (tblName !== "absence") ? selected.scheme_pk : null
            let tblRow = CreateTblRow(tblFoot_datatable, tblName, true, pk_new, selected.scheme_pk, scheme_pk);

            let dict = {id: {pk: pk_new, ppk: selected.scheme_pk, temp_pk: pk_new, table: tblName}};

            if (tblName === "shift"){dict.code = {value: "< " + loc.Add_shift + " >"}
            } else if (tblName === "shift"){dict.code = {value: "< " + loc.Add_teammember + " >"}
            } else if (tblName === "absence"){dict.employee = {code: "< " + loc.Add_absence + " >"}
            } else if (tblName === "schemeitem"){
                // TODO  dict.rosterdate = today_dict
                }

            UpdateTableRow(tblRow, dict, "CreateTblFooter");
        }
    };  // CreateTblFooter

//=========  CreateTblHeaderFilter  ================ PR2019-09-15 PR2020-05-22
    function CreateTblHeaderFilter(tblName, column_count) {
        //console.log("=========  CreateTblHeaderFilter =========");

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
            el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});
            td.appendChild(el);

// --- add width and textalign to el
            el.classList.add("tw_" + field_settings[tblName].field_width[j]);
            el.classList.add("ta_" + field_settings[tblName].field_align[j]);

// --- add element to td
             td.appendChild(el);
        }  // for (let j = 0;
    };  //function CreateTblHeaderFilter

//========= FillTableRows  ====================================
    function FillTableRows(tblName, is_absence_mode) {
        //console.log( "===== FillTableRows  ========= ");
        //console.log( "tblName:", tblName);
        // tblNames are: "shift", "teammember", "scheme", "absence" (=teamemmber", "schemeitem" : null;

// --- reset tblBody
        tblHead_datatable.innerText = null;
        tblBody_datatable.innerText = null;
        tblFoot_datatable.innerText = null;
        selected.tblRow_id = null;
        selected.tblRow_rowIndex = null;

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
                CreateTblFooter(tblName)
// --- loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const pk_int = get_dict_value(item_dict, ["id", "pk"]);
                    const ppk_int = get_dict_value(item_dict, ["id", "ppk"]);
                    const is_template = get_dict_value(item_dict ,["id", "istemplate"], false);
                    const row_scheme_pk = (tblName === "teammember") ?  get_dict_value(item_dict, ["scheme", "pk"]) :
                                                                        get_dict_value(item_dict, ["id", "ppk"]);
                    //console.log( "item_dict ", item_dict);
                    //console.log( "row_scheme_pk ", row_scheme_pk,  "sel_scheme_pk ", sel_scheme_pk);

// --- get 'order_by'. This contains the number / string that must be used in ordering rows
                    const order_by = get_orderby(tblName, item_dict)
// --- get row_index
                    const row_index = get_rowindex_by_orderby(tblBody_datatable, order_by)

// --- add item if row_scheme_pk = selected_ppk_int (list contains items of all parents)
    //         also filter istemplate
                    const add_row = (is_absence) || (row_scheme_pk && row_scheme_pk === sel_scheme_pk && is_template === is_template_mode )
                    if (add_row){
                        tblRow = CreateTblRow(tblBody_datatable, tblName, false, pk_int, ppk_int, row_scheme_pk, row_index, order_by);
                        UpdateTableRow(tblRow, item_dict, "FillTableRows");
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
    function CreateTblRow(tblBody_or_tfoot, tblName, is_addnew_row, pk_int, ppk_int, scheme_pk, row_index, order_by) {
        //console.log("=========  CreateTblRow");
        //console.log("tblName", tblName, typeof tblName);
        //console.log("is_addnew_row", is_addnew_row);

//+++ insert tblRow into tblBody_datatable
        let tblRow = tblBody_or_tfoot.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.
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
        // debug: in absence mode tblName = "teammember", got the wrong fieldsettings
        const settings_tblName = (is_absence_mode) ? "absence" : tblName;
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
// --- in addnew row: make text of first column grey for text 'Add shift...'
                if (is_addnew_row) {el.classList.add("tsa_color_darkgrey")};
            }

// ===== SHIFT  =====
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
                    td.addEventListener("click", function() {MGT_Open("datatable", el, is_addnew_row)}, false)
                }

// ===== ABSENCE  =====
            } else if ( settings_tblName === "absence"){
// ---  add delete to last column, not in addnew row
                if (j === column_count - 1){
                    if (!is_addnew_row){CreateBtnDeleteInactive("delete", false, tblRow, el)};
// ---  add hover and pointer to all columns except last column 'delete'
                } else {
                    add_hover(el);
                    el.classList.add("pointer_show");
// ---  add addEventListener to all columns except last column
                    td.addEventListener("click", function() {MAB_Open(is_addnew_row, el)}, false)
                }

// ===== SCHEMEITEM  =====
            } else if ( settings_tblName === "schemeitem"){
// ---  add delete to last column, not in addnew row
                if (j === column_count - 1){
                    if (!is_addnew_row){CreateBtnDeleteInactive("delete", false, tblRow, el)};
// --- add img inactive to second last column,  not when is_new_row
                } else if (!is_addnew_row && j === column_count - 2){
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
                    // TODO td.addEventListener("click", function() {MGT_Open("datatable", el, is_addnew_row)}, false)
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
                // el.classList.add("input_text"); // makes background transparent
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
        //FillOptionsPeriodExtension(el_select, loc.period_extension)

    } // CreateTblModSelectPeriod

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23 PR2020-03-19 PR2020-04-13
    function CreateBtnDeleteInactive(mode, is_grid, tblRow, el_input, is_inactive){
        //console.log(" === CreateBtnDeleteInactive ===", mode)  mode = 'delete' or 'inactive'
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
            el_input.addEventListener("click", function() {UploadDeleteInactive(mode, el_input)}, false )
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
        //el_input.classList.add("ml-4XX")

        const img_src = (mode ==="delete") ? imgsrc_delete : (!!is_inactive) ? imgsrc_inactive_black : imgsrc_inactive_grey;
        AppendChildIcon(el_input, img_src)
    }  // CreateBtnDeleteInactive

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= // NIU  FillDatalist  ====================================
    function FillDatalist(id_datalist, data_map, selected_ppk_int) {
        //console.log( "===== FillDatalist  ========= ", id_datalist);

        let el_datalist = document.getElementById(id_datalist);

        if(!!el_datalist){
        // --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_dict_value (item_dict, ["id", "pk"])
                const ppk_in_dict = get_dict_value (item_dict, ["id", "ppk"])
                const code_value = get_dict_value(item_dict, ["code", "value"], "");

                //let skip = (!!selected_ppk_int && selected_ppk_int !== ppk_int)
                //if (!skip){
                    // listitem = {id: {pk: 12, ppk_int: 29}, code: {value: "ab"}}
                    let el = document.createElement('option');
                    el.setAttribute("value", code_value);
                    // name can be looked up by datalist.options.namedItem PR2019-06-01
                    el.setAttribute("name", code_value);
                    if (!!pk_int){el.setAttribute("pk", pk_int)};
                    if (!!ppk_int){el.setAttribute("ppk", ppk_int)};

                    el_datalist.appendChild(el);
                //}
            }
        } //  if(!!el_datalist){
    };  // FillDatalist

//========= FillTableTemplate  ============= PR2019-07-19
    function FillTableTemplate() {
        //console.log( "=== FillTableTemplate ");

        let tblBody = document.getElementById("id_mod_copyfrom_tblbody")
        // TODO correct
        let data_map = scheme_map //   scheme_template_list
        tblBody.innerText = null;

        let len = data_map.size;
        let row_count = 0

        if (!!len){

// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_dict_value (item_dict, ["id", "pk"])
                const ppk_int = get_dict_value (item_dict, ["id", "ppk"])
                const code_value = get_dict_value(item_dict, ["code", "value"], "");

//- insert tblBody row
                let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                // NOT IN USE tblRow.setAttribute("id", tblName + pk.toString());
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                // NOT IN USE, put in tblBody. Was:  tblRow.setAttribute("data-table", tblName);

//- add hover to tblBody row
                tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                tblRow.addEventListener("click", function() {HandleTemplateSelect(tblRow)}, false )

// - add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                let el = document.createElement("div");
                    el.innerText = code;
                    el.classList.add("mx-1")
                    el.setAttribute("data-value", code_value);
                    el.setAttribute("data-field", "code");
                td.appendChild(el);

    // --- count tblRow
                    row_count += 1

            } // for (let i = 0; i < len; i++)
        }  // if (len === 0)
    } // FillTableTemplate

//###########################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= Upload_Scheme  ============= PR2019-06-06
    function Upload_Scheme(el_input) {
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>======== Upload_Scheme");
        console.log("el_input: ", el_input);

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
                console.log("fldName", fldName);
                console.log("el_input", el_input);
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
                console.log("o_value", o_value, typeof o_value);
                console.log("n_value", n_value, typeof n_value);

// validate if value of cycle is within range
                if(fldName === "cycle") {
                    if (n_value < 1 || n_value > 28) {
                        el_input.value = (o_value >= 1 && o_value <= 28) ? o_value : 7;
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

                console.log("upload_dict", upload_dict);

            }  // if(!!id_dict["parent_pk"])
        };  // if (!isEmpty(id_dict))

        console.log("upload_dict", upload_dict);

        const url_str =  url_scheme_shift_team_upload;
        UploadChanges(upload_dict, url_str, "Upload_Scheme");

    };  // function Upload_Scheme

//========= Upload_TeamXXX  ============= PR2019-10-18
    function Upload_TeamXXX() {
        console.log("======== Upload_Team");
        // This function is called by el_input_team_code

// ---  create team_dict
        const map_id = get_map_id("team", selected.team_pk.toString());
        console.log("map_id: ", map_id);
        const team_dict = get_mapdict_from_datamap_by_id(team_map, map_id)
        console.log("team_dict: ", team_dict);
        const team_code = get_subdict_value_by_key(team_dict, "code", "value")

// ---  create id_dict
        let id_dict = get_dict_value(team_dict, ["id"]);
        console.log("id_dict: ", id_dict);
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
    function UploadSchemeitemDelete(mod_upload_dict, action) {
        console.log("========= UploadSchemeitemDelete ===", action );
        console.log("mod_upload_dict ", mod_upload_dict );
        // mod_upload_dict: {id: {delete: true, pk: 363, ppk: 1208, table: "schemeitem"}}

        // UploadSchemeitemDelete is only called by ModConfirmSave after btn_delete in tblRow

        if (!!mod_upload_dict){
            let id_dict = get_dict_value(mod_upload_dict, ["id"]);
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

        console.log("map_id ", map_id );
            let tblRow = document.getElementById(map_id);
        console.log("tblRow ", tblRow );
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
                        get_datamap(response["schemeitem_list"], schemeitem_map)
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
                    console.log ("response:");
                    console.log (response);

                    if ("scheme_list" in response) {
                        get_datamap(response["scheme_list"], scheme_map)
                        SBR_FillSelectTable("scheme", "UploadSchemeOrShiftOrTeam scheme_list");
                    }
                    if ("shift_list" in response) {
                        get_datamap(response["shift_list"], shift_map)
                        SBR_FillSelectTable("shift", "UploadSchemeOrShiftOrTeam shift_list");
                    }
                    if ("team_list" in response) {
                        get_datamap(response["team_list"], team_map)
                        SBR_FillSelectTable("team", "UploadSchemeOrShiftOrTeam team_list", true);
                    }
                    if ("schemeitem_list" in response) {
                        get_datamap(response["schemeitem_list"], schemeitem_map)
                    }
                    if ("scheme_update" in response){
                        UpdateFromResponse(response["scheme_update"]);
                    };
                    if ("shift_update" in response){
                        UpdateFromResponse(response["shift_update"]);
                    };
                    if ("team_update" in response){
                        UpdateFromResponse(response["team_update"]);
                    };
                    if ("teammember_update" in response){
                        UpdateFromResponse(response["teammember_update"]);
                    };
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  // if (!!tblRow)
    }  // function UploadSchemeOrShiftOrTeam



//=========  UploadTemplate  ================ PR2019-11-21
    function UploadTemplate(mod_upload_dict) {
        console.log(" === UploadTemplate ===")

        if(!isEmpty(mod_upload_dict)) {
            UploadChanges(mod_upload_dict, url_scheme_template_upload, 'UploadTemplate')
        }
    }  // function UploadTemplate

//========= UploadTimepickerChanged  ============= PR2019-10-12
    function UploadTimepickerChanged(tp_dict) {
        //console.log("=== UploadTimepickerChanged");
        //console.log("tp_dict", tp_dict);

        let upload_dict = {"id": tp_dict["id"]};
        // quicksaveis saved separately by uploadusersettings
        //if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};

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
                const new_shift_code = create_shift_code(loc, offset_start, offset_end, time_duration, cur_shift_code);
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
                        get_datamap(response["schemeitem_list"], schemeitem_map)
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

//========= HandleDeleteScheme  ============= PR2020-03-12
    function HandleDeleteScheme() {
        console.log( " ==== HandleDeleteScheme ====");
        console.log( "selected.scheme_pk: ", selected.scheme_pk);
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected.scheme_pk);
        if(isEmpty(map_dict)){
            document.getElementById("id_confirm_header").innerText = loc.Delete_scheme + "...";
            document.getElementById("id_confirm_msg01").innerText = loc.Please_select_scheme;
            document.getElementById("id_confirm_msg02").innerText = null;
            document.getElementById("id_confirm_msg03").innerText = null;

            document.getElementById("id_confirm_btn_cancel").classList.add(cls_hide)
            const el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            setTimeout(function() {el_btn_save.focus()}, 50);
            $("#id_mod_confirm").modal({backdrop: true});
        } else {
    // ---  create upload_dict with id_dict
            mod_upload_dict = {"id": map_dict["id"]};
            mod_upload_dict["id"]["delete"] = true;
            mod_upload_dict["code"] = map_dict["code"];

            ModConfirmOpen("delete");

        }  // if(isEmpty(map_dict))

    }  // HandleDeleteScheme


//========= UploadDeleteInactive  ============= PR2019-09-23 PR2020-05-31
    function UploadDeleteInactive(mode, el_input) {
        console.log( " ==== UploadDeleteInactive ====", mode);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id = get_map_id(tblName, pk_str);
            const map_dict = get_mapdict_from_tblRow(tblRow);

            console.log( "tblName", tblName, typeof tblName);
            console.log( "pk_str", pk_str, typeof pk_str);
            console.log( "map_id", map_id, typeof map_id);
            console.log( "map_dict", map_dict);

        console.log( "tblName", tblName);
        console.log( "map_dict", map_dict);
            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                let upload_dict = {"id": map_dict["id"]};
                mod_upload_dict = {"id": map_dict["id"]};
                if (tblName === "teammember" && !isEmpty(map_dict["employee"])){
                    mod_upload_dict["employee"] = map_dict["employee"]
                } else if (tblName === "absence" && map_dict.employee){
                    mod_upload_dict.employee = map_dict.employee;
                } else if (tblName === "schemeitem" && !isEmpty(map_dict.shift)){
                    mod_upload_dict.shift = map_dict.shift;
                };
                if (mode === "delete"){
                    mod_upload_dict["id"]["delete"] = true;
                    ModConfirmOpen("delete", el_input);
                    return false;
                } else if (mode === "inactive"){
            // get inactive from map_dict
                    const inactive = get_dict_value(map_dict, ["inactive", "value"], false)
            // toggle inactive
                    const new_inactive = (!inactive);
                    upload_dict.inactive = {value: new_inactive, update: true};
            // change inactive icon, before uploading
                    format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            // ---  show modal, only when made inactive
                    if(!!new_inactive){
                        mod_upload_dict.inactive = {value: new_inactive, update: true};
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
                    //    get_datamap(response["schemeitem_list"], schemeitem_map)
                    //    FillTableRows("schemeitem")
                    //}
                    // don't use schemeitem_list and schemeitem_update, new entry will be shown twice

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
                        Grid_UpdateFromResponse_team(response["team_update_list"]);
                    }
                    if ("tm_update_list" in response) {
                        Grid_UpdateFromResponse_tm(response["tm_update_list"]);
                    }
                    if ("schemeitem_update" in response) {
                        UpdateFromResponse(response["schemeitem_update"]);
                    }
                    if ("scheme_update" in response) {
                        const scheme_update = response["scheme_update"];
                        if(!isEmpty(scheme_update)){
                            const scheme_list = [scheme_update];
                            get_datamap(scheme_list, scheme_map)
                            UpdateFromResponse(scheme_list);
                        }
                    }
                    if ("scheme_list" in response) {
                        const scheme_list = response["scheme_list"];
                        if(scheme_list.length){
                            get_datamap(scheme_list, scheme_map)
                        }
                        // SBR_FillSelectTable("scheme", "MSCH_Save scheme_list", selected.scheme_pk);
                    }

                    if ("shift_update" in response) {UpdateFromResponse_datatable_shift(response["shift_update"])};

                    if ("team_update" in response) {
                        UpdateFromResponse(response["team_update"]);
                    }
                    if ("teammember_update" in response) {
                        UpdateFromResponse(response["teammember_update"]);
                    }
                    if ("absence_update" in response) {
                        UpdateFromResponse(response["absence_update"]);
                    }
                    if ("rosterdate" in response) {
                        ModRosterdateFinished(response["rosterdate"]);
                    }
                    if ("refresh_tables" in response) {
                        // only returned by SchemeTemplateUploadView TODO: check its purpose
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
        let cell_id_str = null, ppk_int = null;
// --- loop through update_list
        for (let i = 0, len = update_list.length; i < len; i++) {
            let update_dict = update_list[i];
            //console.log("update_dict", update_dict);
//----- get id_dict of updated item
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id", "pk"]);
            const map_id = get_map_id(tblName, pk_int);
            //console.log("map_id", map_id);
            if (!!map_id){
//----- replace updated item in map or remove deleted item from map
                const is_created = get_dict_value(update_dict, ["id", "created"], false);
                const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);
                update_map_item_local(tblName, map_id, update_dict, is_created, is_deleted);
            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)

        Grid_CreateTblTeams(selected.scheme_pk);

    };  // Grid_UpdateFromResponse_team

//=========  Grid_UpdateFromResponse_tm  ================ PR2020-03-20
    function Grid_UpdateFromResponse_tm(update_list) {
        console.log(" ==== Grid_UpdateFromResponse_tm ====");
        console.log("update_list", update_list);
        let cell_id_str = null, ppk_int = null;
// --- loop through update_list
        for (let i = 0, len = update_list.length; i < len; i++) {
            let update_dict = update_list[i];
            console.log("update_dict", update_dict);
//----- get id_dict of updated item
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id", "pk"]);
            const map_id = get_map_id(tblName, pk_int);
            console.log("map_id", map_id);
            if (!!map_id){
//----- replace updated item in map or remove deleted item from map
                const is_created = get_dict_value(update_dict, ["id", "created"], false);
                const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);
                update_map_item_local(tblName, map_id, update_dict, is_created, is_deleted);
            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)

        Grid_CreateTblTeams(selected.scheme_pk);

    };  // Grid_UpdateFromResponse_tm

//=========  Grid_UpdateFromResponse_shift  ================ PR2020-03-20
    function Grid_UpdateFromResponse_shift(update_list) {
        console.log(" ==== Grid_UpdateFromResponse_shift ====");
        console.log("update_list", update_list);
        let cell_id_str = null, ppk_int = null, tblName = null;
        let pk_list = [] // for highlighting cells
        let new_shift_pk = null;  // for highlighting new shift
// --- loop through update_list
        for (let i = 0, len = update_list.length; i < len; i++) {
            let update_dict = update_list[i];
            console.log("update_dict", update_dict);
//----- get id_dict of updated item
            tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id", "pk"]);
            const map_id = get_map_id(tblName, pk_int);
            console.log("map_id", map_id);
            pk_list.push(pk_int)
            if (tblName === "shift"){new_shift_pk = pk_int}

//--- remove 'updated', deleted created and msg_err from update_dict
            // NOTE: first update tblRow, then remove these keys from update_dict, then replace update_dict in map
            remove_err_del_cre_updated__from_itemdict(update_dict)

//----- replace updated item in map or remove deleted item from map
            const is_created = get_dict_value(update_dict, ["id", "created"], false);
            const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);
            update_map_item_local(tblName, map_id, update_dict, is_created, is_deleted);

        }  //  for (let j = 0; j < 8; j++)

        Grid_CreateTblShifts(selected.scheme_pk)

        if (tblName === "shift"){
            const tr_id = "gridrow_shift_" +  new_shift_pk.toString();
            const tr = document.getElementById(tr_id);
            if(!!tr){
                tr.classList.add("border_bg_valid");
                setTimeout(function (){ tr.classList.remove("border_bg_valid");}, 2000);
            };
        } else {
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
        }

// ---  highlight shift cell after update


    };  // Grid_UpdateFromResponse_shift


//=========  UpdateFromResponse_datatable_shift  ================ PR2020-05-26
    function UpdateFromResponse_datatable_shift(update_list) {
        console.log(" ==== UpdateFromResponse_datatable_shift ====");
        console.log("update_list", update_list);

// --- loop through update_list
       for (let i = 0, len = update_list.length; i < len; i++) {
            const update_dict = update_list[i];
            console.log("update_dict", update_dict);

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
                console.log("selectRow map_id)", "sel_" + map_id);
                console.log("selectRow", selectRow);
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
                    const row_index = get_rowindex_by_orderby(tblBody_datatable, order_by)
                    const scheme_pk = ppk_int;
                    tblRow = CreateTblRow(tblBody_datatable, tblName, false, pk_int, ppk_int, scheme_pk, row_index, order_by);
                } else {
                    tblRow = document.getElementById(map_id)
                }
                if(tblRow){
                    console.log("tblRow", tblRow);
                    UpdateTableRow(tblRow, update_dict, "UpdateFromResponse_datatable_shift");

    //----- replace updated item in map or remove deleted item from map
                    if(is_deleted){

                    }
                }  // if(tblRow)
            }  // if(is_deleted)

//--- remove 'updated', deleted created and msg_err from update_dict
            // NOTE: first update tblRow, then remove these keys from update_dict, then replace update_dict in map
            remove_err_del_cre_updated__from_itemdict(update_dict)

//----- replace updated item in map or remove deleted item from map
            update_map_item_local(tblName, map_id, update_dict, is_created, is_deleted);

       }  //  for (let i = 0, len = update_list.length; i < len; i++)

    };  // UpdateFromResponse_datatable_shift

//=========  UpdateFromResponse  ================ PR2019-10-14
    function UpdateFromResponse(update_dict) {
        console.log(" ==== UpdateFromResponse ====");
        console.log("update_dict", deepcopy_dict(update_dict));

//----- get id_dict of updated item
        const tblName = (is_absence_mode) ? "absence" : get_dict_value(update_dict, ["id", "table"]);
        const pk_int = get_dict_value(update_dict, ["id", "pk"]);
        const ppk_int =  get_dict_value(update_dict, ["id", "ppk"]);
        const temp_pk_str = get_dict_value(update_dict, ["id", "temp_pk"]);
        const map_id = get_map_id(tblName, pk_int);
        const is_created = get_dict_value(update_dict, ["id", "created"], false);
        const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);

        let tblRow = document.getElementById(map_id);
// ++++ deleted ++++
        if(is_deleted){
// ---  reset selected scheme/shift/team when deleted
            if (tblName === "scheme"){selected.scheme_pk = 0};
            if (["scheme", "shift"].indexOf(tblName) > -1 ){selected.shift_pk = 0};
            if (["scheme", "team"].indexOf(tblName) > -1 ){selected.team_pk = 0};
// ---  delete tblRow from datatable
        console.log("delete tblRow from datatable",tblRow);
            if (tblRow) {tblRow.parentNode.removeChild(tblRow)};
// ---  delete selectRow from select_table
            let selectRow = document.getElementById("sel_" + map_id);
            if (selectRow) {selectRow.parentNode.removeChild(selectRow)};
// ---  when scheme is deleted:
            if (tblName === "scheme"){
        // ---  reset tblBody of schemeitem, shift, teammember, and set el_input_team_code = null
                tblBody_datatable.innerText = null;
        // ---  reset select_table shift and team
                document.getElementById("id_select_table_shift").classList.add(cls_hide)
                document.getElementById("id_select_table_team").classList.add(cls_hide)
        // ---  delete innerText of sidebar_tblBody_shift and of sidebar_tblBody_team
                sidebar_tblBody_shift.innerText = null;
                sidebar_tblBody_team.innerText = null;
                selected.scheme_pk = 0

                //UpdateSchemeInputElements({}, "UpdateFromResponse");
            }

// ++++ created ++++
        } else if (is_created){
            console.log("is_created, tblName: ", tblName);
// ---  item is created: add new row on correct index of table, reset addnew row
            // parameters: tblName, pk_str, ppk_str, is_addnew, customer_pk
            if(tblName === "scheme"){
                // skip scheme, it has no table. team has table teammembers, is empty after creating new team
            } else if(tblName === "team"){
// ---  when team is created:
                // set focus to addnew row in table teammember
                // team has table teammembers, is empty after creating new team
                let tblFoot_row = tblFoot_datatable.rows[0];
                if (!!tblFoot_row){
                    // HandleTableRowClicked sets Hihglight in table and selecttable
                    HandleTableRowClicked(tblFoot_row, true) // true = skip_highlight_selectrow
    // ---  in tblFoot_row: set el_input.value = null, set focus to addnew row
                    let el_input = tblFoot_row.cells[0].children[0];
                    el_input.value = null
                    if (!!el_input){
                        setTimeout(function() {el_input.focus()}, 50);
                    }
                }
            } else {
// ---  create new row
                // this is not an add-new row! (which is in the footer) but a created row
// --- get 'order_by'. This contains the number / string that must be used in ordering rows
                const order_by = get_orderby(tblName, update_dict)
                console.log("order_by: <" + order_by + ">")
// --- get row_index
                const row_index = get_rowindex_by_orderby(tblBody_datatable, order_by)
                const scheme_pk = selected.scheme_pk; // scheme_pk will only put value in 'data-scheme_pk when table = teammember
                console.log("row_index", row_index)
                tblRow = CreateTblRow(tblBody_datatable, tblName, false, pk_int, ppk_int, scheme_pk, row_index, order_by)
                console.log("++++++++++++++ UpdateFromResponse 1 update_dict")
                console.log(update_dict)
                UpdateTableRow(tblRow, update_dict, "UpdateFromResponse 1")
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

// ++++ existing  ++++
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
                    if (["shift", "teammember", "schemeitem", "absence"].indexOf( tblName ) > -1){
                        UpdateTableRow(tblRow, update_dict, "UpdateFromResponse 2")
                    }
                }
            };  // if (tblName === "team")
        } // if (is_created)


// ++++ update selectRow ++++
//--- insert new selectRow if is_created, highlight selected row
        if (["scheme", "shift", "team"].indexOf( tblName ) > -1){
            const sidebar_tblBody = (tblName === "scheme") ? sidebar_tblBody_scheme :
                                 (tblName === "shift") ? sidebar_tblBody_shift :
                                 (tblName === "team") ? sidebar_tblBody_team : null;
            const selected_pk = (tblName === "scheme") ? selected.scheme_pk :
                                 (tblName === "shift") ? selected.shift_pk :
                                 (tblName === "team") ? selected.team_pk : null;
            let selectRow;
            if(is_created && !!sidebar_tblBody){
                const row_index = GetNewSelectRowIndex(sidebar_tblBody, 0, update_dict, loc.user_lang);
                 // TODO switch to t_CreateSelectRow
                //selectRow = CreateSelectRow(sidebar_tblBody, update_dict, row_index);
                // HandleSelectRowButton = UploadDeleteInactive

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
            const filter_show_inactive = false; // no inactive filtering on this page
            const include_parent_code = false;
            t_UpdateSelectRow(selectRow, update_dict, include_parent_code, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)

        }  // if( tblName === "scheme"...

        //if(tblName === "scheme"){
            //UpdateSchemeInputElements(update_dict, "UpdateFromResponse");
        //}
        if (["shift"].indexOf( tblName ) > -1){
            console.log("xxx HighlightSelectShiftTeam")
            //HighlightSelectShiftTeam(tblName, tblRow)
        }
       // }  //  if(is_deleted){
// --- fill grid
        if (selected_btn === "btn_grid") {
            const scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected.scheme_pk);
            Grid_FillGrid(scheme_dict, "UpdateFromResponse")
        }
//--- remove 'updated', deleted created and msg_err from update_dict
        // NOTE: first update tblRow, then remove these keys from update_dict, then replace update_dict in map
        remove_err_del_cre_updated__from_itemdict(update_dict)
//--- replace updated item in map or remove deleted item from map
        // 'deleted' and 'created' are removed by remove_err_del_cre_updated__from_itemdict, therefore use parameters
        update_map_item_local(tblName, map_id, update_dict, is_created, is_deleted);
//--- refresh header text
// TODO correct
        UpdateHeaderText("UpdateFromResponse");
    }  // UpdateFromResponse


//========= UpdateTablesAfterResponse  =============
    function UpdateTablesAfterResponse(response){
        console.log("--- UpdateTablesAfterResponse  --------------");
        // selected_btns are: btn_grid, btn_schemeitem, btn_shift, btn_team, btn_scheme
        // tblNames are 'shift', 'teammember', 'scheme', 'absence', 'schemeitem'. Null for btn_grid
        const tblName = get_tblName_from_selectedBtn(selected_btn);
        //console.log("selected_btn:", selected_btn);
        console.log("tblName:", tblName);

        //SBR_FillSelectTable fills selecttable and makes visible

        HandleBtnSelect(selected_btn, true)  // true = skip_update

        // refresh_tables dict gets value in SchemeTemplateUploadView
        // update_wrap['refresh_tables'] = {'new_scheme_pk': new_scheme_pk}
        console.log("response[refresh_tables: ", response["refresh_tables"]);
        let new_scheme_pk = get_dict_value(response, ["refresh_tables", 'new_scheme_pk'], 0)
        //console.log("new_scheme_pk: ", new_scheme_pk);
        // get saved scheme_pk from settings. Settings is retrieved from server before UpdateTablesAfterResponse
        if(!new_scheme_pk){
            new_scheme_pk = settings.scheme_pk
        }

        let fill_rows = false;
        if ("scheme_list" in response) {
            get_datamap(response["scheme_list"], scheme_map)
            SBR_FillSelectTable("scheme", "UpdateTablesAfterResponse", true)
            fill_rows = true
        }
        if ("shift_list" in response) {
            get_datamap(response["shift_list"], shift_map)
            SBR_FillSelectTable("shift", "UpdateTablesAfterResponse", false)
            fill_rows = true
            }
        if ("team_list" in response){
            get_datamap(response["team_list"], team_map);
            SBR_FillSelectTable("team", "UpdateTablesAfterResponse", false)
            fill_rows = true
            }
        if ("teammember_list" in response){
            get_datamap(response["teammember_list"], teammember_map);
            fill_rows = true
            }
        if ("schemeitem_list" in response) {
            get_datamap(response["schemeitem_list"], schemeitem_map);
            fill_rows = true
            }
        if(fill_rows){
            // tblNames are: shift, teammember, schemeitem, absence
            //FillTableRows(tblName);

        }
        UpdateHeaderText("UpdateTablesAfterResponse");

    };  //  UpdateTablesAfterResponse

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, update_dict, called_by){
        //console.log ("--- UpdateTableRow  ------- ", called_by);
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
                //if(!is_addnew_row){
                    ShowOkRow(tblRow)
               // }

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
    }  // UpdateTableRow

//========= UpdateField  =============
    function UpdateField(el_input, update_dict, tblName){
        //console.log("--- UpdateField  -------------- ", tblName);
        //console.log("update_dict", update_dict);
        //console.log("el_input", el_input);
        if(!!el_input){
// --- lookup field in update_dict, get data from field_dict
            const fldName = get_attr_from_el(el_input, "data-field");
            let field_dict = get_dict_value (update_dict, [fldName]);
            let value = get_dict_value (field_dict, ["value"]);
            const is_updated = get_dict_value (field_dict, ["updated"]);
            const is_restshift = (tblName === "schemeitem") ? get_dict_value (update_dict, ["shift", "isrestshift"], false) :
                                                              get_dict_value (update_dict, ["isrestshift", "value"], false);

            let display_text = "";
            if (fldName === "rosterdate"){
                const date_JS = get_dateJS_from_dateISO(value);
                display_text = format_date_vanillaJS (date_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, false, false);
                // hard return necessary to display green OK field when it is empty
                //if (!display_text){display_text = "\n"}
                el_input.innerText = display_text;
            } else if (["order", "team", "employee", "replacement"].indexOf( fldName ) > -1){

                //console.log("--- fldName  -------------- ", fldName);
                //console.log("--- field_dict  -------------- ", field_dict);
                //console.log("--- code  -------------- ", get_dict_value(field_dict, ["code"]));

                el_input.innerText = get_dict_value(field_dict, ["code"]);
            } else if ( (tblName === "shift" && fldName === "code") || (tblName === "schemeitem" && fldName === "shift") ){
                display_text = (tblName === "shift") ? value : get_dict_value (update_dict, ["shift", "code"]);
                if (is_restshift){
                    if(!display_text) { display_text = loc.Rest_shift};
                    display_text += " (R)";
                }
                el_input.innerText = (display_text) ? display_text : "-";
            } else if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                let date_iso = (is_absence_mode) ? get_dict_value (update_dict, ["scheme", fldName]) : value
                const date_JS = get_dateJS_from_dateISO(date_iso);
                display_text = format_date_vanillaJS (date_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false);
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

//========= UpdateAddnewRow  ==================================== PR2019-12-01
    function UpdateAddnewRow(tblName, sel_scheme_or_team_pk) {
        //console.log(" --- UpdateAddnewRow --- ")
        // tblNames are: schemitem, shift, teammember
        if(tblFoot_datatable && tblFoot_datatable.rows.length){
            let tblRow = tblFoot_datatable.rows[0];
            if(!!tblRow){
        // add ppk of selected table in addnew row
            tblRow.setAttribute("data-ppk", sel_scheme_or_team_pk)

 // --- loop through other cells of tablerow, disable / enable tblRow.cells
                for (let i = 1, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        el_input.disabled = (!sel_scheme_or_team_pk);
                    };
                }
            }
        }
    }  // UpdateAddnewRow

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
                    console.log( "UpdateSchemeitemOrTeammember ppk_int", ppk_int, typeof ppk_int);
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


//###########################################################################
// ++++++++++++  MODALS +++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++ MODAL GRID TEAM ++++++++++++++++++++++++++++++++++++++++++++++++ PR2020-03-16

//=========  MGS_Open  ================  PR2020-03-21
    function MGS_Open(mode, el_input, is_addnew_row) {
        console.log(" ======  MGS_Open  =======")
        console.log("mode:", mode)
        console.log("el_input:", el_input)
        // mode = "grid", "datatable"
// ---  reset mod_MGS_dict
        mod_MGS_dict = {};

        const tblRow = get_tablerow_selected(el_input)
        console.log("tblRow:", tblRow)
        const fldName = get_attr_from_el(el_input, "data-field");
        let shift_pk = get_attr_from_el(tblRow, "data-pk");
        let scheme_pk = get_attr_from_el(tblRow, "data-ppk")

        if (mode === "datatable") {
            if(tblRow){
            }
        } else if (mode === "grid") {
            if(el_input.id === "shift_new"){
                id_new = id_new + 1
                shift_pk = "new" + id_new.toString()
                scheme_pk = get_dict_value(grid_table_dict, ["scheme", "pk"])
            } else {
    // ---  get  map_dict_pk from el_input.id
                const shift_dict = get_mapdict_from_datamap_by_id(shift_map, el_input.id )
                //shift_pk = get_dict_value(shift_dict, ["id", "pk"])
                //scheme_pk = get_dict_value(shift_dict, ["id", "ppk"])
            }
        }
        console.log("shift_pk:", shift_pk)
        console.log("scheme_pk:", scheme_pk)

        if(!!scheme_pk && shift_pk){

// ---  put map_dict_code in header
            const add_new_mode = MGS_fill_MGS_dict(scheme_pk, shift_pk);

            let shift_code_display = mod_MGS_dict.shift.code.value;
            if(!!mod_MGS_dict.shift.isrestshift.value){ shift_code_display += " (R)" }
            document.getElementById("id_MGS_header").innerText = loc.Shift + ": " + shift_code_display ;

// ---  put shift_code in input element
            el_MGS_shiftcode.value = shift_code_display;

            el_MGS_offsetstart.innerText = mod_MGS_dict.shift.offsetstart.display;
            el_MGS_offsetend.innerText = mod_MGS_dict.shift.offsetend.display;
            el_MGS_breakduration.innerText = mod_MGS_dict.shift.breakduration.display;
            el_MGS_timeduration.innerText = mod_MGS_dict.shift.timeduration.display;

            el_MGS_restshift.checked = mod_MGS_dict.shift.isrestshift.value;;


// set focus to clicked field, to offsetstart element if no clicked field
            const el_id = (fldName) ?  "id_MGS_" + fldName : "id_MGS_offsetstart";
        console.log("fldName:", fldName)
        console.log("el_id:", el_id)
            let el = document.getElementById(el_id);
        console.log("el:", el)
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

// ##############################################  MGT_Save  ############################################## PR2019-11-23
    function MGS_Save(crud_mode){
        console.log( "===== MGS_Save  ========= ");
        const is_delete = (crud_mode === "delete");
// =========== SAVE SHIFT =====================
        const shift_dict = mod_MGS_dict.shift
        console.log("shift_dict: ", shift_dict)
        if(!isEmpty(shift_dict)){

            // key id: {shiftoption: "grid_shift"} is needed in teammember_upload to go to the right function
            id: {shiftoption: "grid_shift"}

            // put mode = 'delete' in id of shift to delete shift
            const id_dict = shift_dict.id;
            if(is_delete){ shift_dict.id.mode = "delete"}

        console.log("id_dict: ", id_dict)
            const shift_code = shift_dict.code.value;
            const shift_offsetstart = shift_dict.offsetstart.value;
            const shift_offsetend = shift_dict.offsetend.value;
            const shift_breakduration = shift_dict.breakduration.value;
            const shift_timeduration = shift_dict.timeduration.value;
            const shift_isrestshift = shift_dict.isrestshift.value;

            mod_upload_dict = {id: {shiftoption: 'grid_shift'},
                                 shift: {id: id_dict,
                                        code: {value: shift_code},
                                        offsetstart: {value: shift_offsetstart},
                                        offsetend: {value: shift_offsetend},
                                        breakduration: {value: shift_breakduration},
                                        timeduration: {value: shift_timeduration},
                                        isrestshift: {value: shift_isrestshift}
                                        }
                                }
        // always upload team, pk needed for teammembers
        console.log("mod_MGS_dict: ", mod_MGS_dict)
            if(is_delete){
                        // make shift row red
            const row_id = "gridrow_shift_" + mod_upload_dict.shift.id.pk.toString();
        console.log("row_id: ", row_id)
            let tblRow = document.getElementById(row_id);
        console.log("tblRow: ", tblRow)
            tblRow.classList.add(cls_error);
                ModConfirmOpen("grid_shift_delete", null)
            } else {
                UploadChanges(mod_upload_dict, url_teammember_upload, "MGT_Save");
            } // if(is_delete)
        }  // if(!isEmpty(team_dict))
    }  // MGT_Save


//=========  MGS_fill_MGS_dict  ================  PR2020-03-21
    function MGS_fill_MGS_dict(scheme_pk, shift_pk){
        console.log( " ====  MGS_fill_MGS_dict  ====");

        const map_dict = get_mapdict_from_datamap_by_tblName_pk(shift_map, "shift", shift_pk)
        const add_new_mode = (isEmpty(map_dict));

        console.log( "map_dict");
        console.log( map_dict);
        const shift_code = get_dict_value(map_dict, ["code", "value"], "")
        const offset_start = get_dict_value(map_dict, ["offsetstart", "value"])
        const offsetstart_minoffset = get_dict_value(map_dict, ["offsetstart", "minoffset"])
        const offsetstart_maxoffset = get_dict_value(map_dict, ["offsetstart", "maxoffset"])
        const offset_end = get_dict_value(map_dict, ["offsetend", "value"])
        const offsetend_minoffset = get_dict_value(map_dict, ["offsetend", "minoffset"])
        const offsetend_maxoffset = get_dict_value(map_dict, ["offsetend", "maxoffset"])
        const break_duration = get_dict_value(map_dict, ["breakduration", "value"], 0)
        const time_duration = get_dict_value(map_dict, ["timeduration", "value"], 0)
        const is_restshift = get_dict_value(map_dict, ["isrestshift", "value"], false)

        const offsetstart_display = display_offset_time (loc, offset_start, false, false);
        const offsetend_display = display_offset_time (loc, offset_end, false, false);
        const breakduration_display = display_duration (break_duration, loc.user_lang);
        const timeduration_display = display_duration (time_duration, loc.user_lang);

// --- create mod_MGS_dict with team
        mod_MGS_dict = {shift: {id: {pk: shift_pk, ppk: scheme_pk, table: "shift",
                                    mode: (add_new_mode) ? "create" : "unchanged"} ,
                                code: {value: shift_code},
                                offsetstart: {value: offset_start,
                                              minoffset: offsetstart_minoffset,
                                              maxoffset: offsetstart_maxoffset,
                                              display: offsetstart_display},
                                offsetend: {value: offset_end,
                                              minoffset: offsetend_minoffset,
                                              maxoffset: offsetend_maxoffset,
                                              display: offsetend_display},
                                breakduration: {value: break_duration, display: breakduration_display},
                                timeduration: {value: time_duration, display: timeduration_display},
                                isrestshift: {value: is_restshift},
                                values_changed: false
                                }
                        }
        console.log( "mod_MGS_dict: ", mod_MGS_dict);
        return add_new_mode
    }  // MGS_fill_MGS_dict


//=========  MGS_ShiftcodeChanged  ================ PR2020-03-22
    function MGS_ShiftcodeChanged(el_input) {
        //console.log( "===== MGS_ShiftcodeChanged  ========= ");
        const new_code = el_input.value;
        if(!!mod_MGS_dict.shift){
            mod_MGS_dict.shift.code = {value: new_code, update: true}
            mod_MGS_dict.shift.values_changed = true;
        }
// ---  enable save button
        MGS_BtnSaveDeleteEnable()
    }; // MGS_ShiftcodeChanged

//=========  MGS_RestshiftClicked  ================ PR2020-03-22
    function MGS_RestshiftClicked(el_input) {
        console.log( "===== MGS_RestshiftClicked  ========= ");
        console.log( "mod_MGS_dict: ", mod_MGS_dict);
        if(el_input && mod_MGS_dict.shift){

            const is_restshift = el_input.checked
        console.log( "is_restshift: ", is_restshift);
            const new_shift_code = create_shift_code( loc,
                                                    mod_MGS_dict.shift.offsetstart.value,
                                                    mod_MGS_dict.shift.offsetend.value,
                                                    mod_MGS_dict.shift.timeduration.value,
                                                    mod_MGS_dict.shift.code.value,
                                                    is_restshift);
        console.log( "new_shift_code: ", new_shift_code);
            mod_MGS_dict.shift.code = { value: new_shift_code, update: true };
            mod_MGS_dict.shift.isrestshift = {value: el_input.checked, update: true}
            mod_MGS_dict.shift.values_changed = true;

            let shift_code_display = mod_MGS_dict.shift.code.value;
            if(!!mod_MGS_dict.shift.isrestshift.value){ shift_code_display += " (R)" }
            el_MGS_shiftcode.value = shift_code_display

        }
// ---  enable save button
        MGS_BtnSaveDeleteEnable()
    }; // MGS_RestshiftClicked

//=========  MGS_TimepickerOpen  ================ PR2020-03-21
    function MGS_TimepickerOpen(el_input, calledby) {
        console.log("=== MGS_TimepickerOpen ===", calledby);

        console.log("mod_MGS_dict", mod_MGS_dict);

// ---  create tp_dict
        const fldName = get_attr_from_el(el_input, "data-field");
        const rosterdate = null; // keep rosterdate = null, to show 'current day' insteaa of Dec 1
        const offset = get_dict_value(mod_MGS_dict.shift, [fldName, "value"])
        const minoffset = get_dict_value(mod_MGS_dict.shift, [fldName, "minoffset"])
        const maxoffset = get_dict_value(mod_MGS_dict.shift, [fldName, "maxoffset"])
        const is_ampm = (loc.timeformat === "AmPm")

        let tp_dict = { field: fldName,
                        page: "TODO",
                        // id: id_dict,
                        //mod: calledby,
                        rosterdate: rosterdate,
                        offset: offset,
                        minoffset: minoffset,
                        maxoffset: maxoffset,
                        isampm: is_ampm,
                        quicksave: quicksave
                       };
        //if(!!weekday){tp_dict['weekday'] = weekday}
// ---  create st_dict
        const show_btn_delete = true;
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
                const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ? loc.Working_hours : null;
        let st_dict = { interval: loc.interval, comp_timezone: loc.comp_timezone, user_lang: loc.user_lang,
                        weekday_list: loc.weekdays_abbrev, month_list: loc.months_abbrev,
                        url_settings_upload: url_settings_upload,
                        text_curday: loc.Current_day, text_prevday: loc.Previous_day, text_nextday: loc.Next_day,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete
                        };
        console.log("st_dict", st_dict);
        ModTimepickerOpen(el_input, MGS_TimepickerResponse, tp_dict, st_dict)
    };  // MGS_TimepickerOpen

//========= MGS_TimepickerResponse  ============= PR2019-10-12
    function MGS_TimepickerResponse(tp_dict) {
        console.log(" === MGS_TimepickerResponse ===" );
        console.log("tp_dict", tp_dict);
        console.log("mod_MGS_dict", mod_MGS_dict);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};
        //console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = tp_dict.field;

    // ---  get current values from mod_upload_dict.shift
            let shift_code = mod_MGS_dict.shift.code.value;
            let offset_start = mod_MGS_dict.shift.offsetstart.value;
            let offset_end = mod_MGS_dict.shift.offsetend.value;
            let break_duration = mod_MGS_dict.shift.breakduration.value;
            let time_duration = mod_MGS_dict.shift.timeduration.value;
            let is_restshift = mod_MGS_dict.shift.isrestshift.value;

     // ---  get new value from tp_dict
            const new_offset = get_dict_value(tp_dict, ["offset"])
            console.log( "new_offset: ", new_offset);

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

            const new_shift_code = create_shift_code(loc, offset_start, offset_end, time_duration, shift_code);
            mod_MGS_dict.shift.code.value = new_shift_code
            mod_MGS_dict.shift.offsetstart.value = offset_start;
            mod_MGS_dict.shift.offsetend.value = offset_end;
            mod_MGS_dict.shift.breakduration.value = break_duration;
            mod_MGS_dict.shift.timeduration.value = time_duration;
            mod_MGS_dict.shift.values_changed = true;

            const is_absence = false;
            mtp_calc_minmax_offset(mod_MGS_dict.shift, is_absence)

// ---  display offset, selected values are shown because they are added to mod_MGS_dict
            MGS_UpdateShiftInputboxes();

// ---  enable save button
            MGS_BtnSaveDeleteEnable()

// set focus to next element
            const next_el_id = (fldName === "offsetstart") ? "id_MGS_offsetend" : "id_MGS_btn_save";
            setTimeout(function() { document.getElementById(next_el_id).focus()}, 50);

        }  // if("save_changes" in tp_dict) {
     }  //MGS_TimepickerResponse

//========= MGS_UpdateShiftInputboxes  ============= PR2019-12-07
    function MGS_UpdateShiftInputboxes() {
        console.log( "=== MGS_UpdateShiftInputboxes ");
        console.log( mod_MGS_dict);

        let shift_code_display = mod_MGS_dict.shift.code.value;
        if(!!mod_MGS_dict.shift.isrestshift.value){ shift_code_display += " (R)" }

        const offset_start = get_dict_value(mod_MGS_dict.shift, ["offsetstart", "value"])
        const offset_end = get_dict_value(mod_MGS_dict.shift, ["offsetend", "value"])
        const break_duration = get_dict_value(mod_MGS_dict.shift, ["breakduration", "value"])
        const time_duration = get_dict_value(mod_MGS_dict.shift, ["timeduration", "value"])

        el_MGS_shiftcode.value = shift_code_display

        el_MGS_offsetstart.innerText = display_offset_time (loc, offset_start, false, false)
        el_MGS_offsetend.innerText = display_offset_time (loc, offset_end, false, false)
        el_MGS_breakduration.innerText = display_duration (break_duration, loc.user_lang)
        el_MGS_timeduration.innerText = display_duration (time_duration, loc.user_lang)

    }  // MGS_UpdateShiftInputboxes


//=========  MGS_BtnSaveDeleteEnable  ================ PR2020-03-22
    function MGS_BtnSaveDeleteEnable(){
        console.log( "MGS_BtnSaveDeleteEnable");
        console.log( mod_MGS_dict);

        el_MGS_btn_save.disabled = (!selected.scheme_pk || !mod_MGS_dict.shift.values_changed);

        const shift_id_mode = mod_MGS_dict.shift.id.mode;
        const btn_delete_hidden = (!selected.scheme_pk || shift_id_mode === "create");
        add_or_remove_class (el_MGS_btn_delete, cls_hide, btn_delete_hidden) // args: el, classname, is_add
    }  // MGS_BtnSaveDeleteEnable


// ################################## MODAL GRID TEAM ################################## PR2020-03-16

//=========  MGT_Open  ================  PR2020-03-16 PR2020-05-27
    function MGT_Open(mode, el_input, is_addnew_row) {
        console.log(" ======  MGT_Open  =======")
        console.log("mode", mode)
        // NIU is_addnew_row
// ---  reset mod_MGT_dict
        mod_MGT_dict = {};
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
        console.log("scheme_pk", scheme_pk)
        console.log("team_pk", team_pk)
        if(scheme_pk && team_pk){
// --- fill mod_MGT_dict, get is_add_new_mode = isEmpty(team_mapdict)
            const is_add_new_mode = MGT_fill_MGT_dict(scheme_pk, team_pk);
// ---  put team_code in header
            const team_code = get_dict_value(mod_MGT_dict, ["team", "code", "value"])
            const header_text = (!!team_code) ? team_code : loc.Team + ":";
            document.getElementById("id_MGT_header").innerText = header_text;
// ---  put team_code in input element
            el_MGT_teamcode.value = team_code;
// ---  fill table teammembers
            MGT_CreateTblTeammemberHeader();
            MGT_CreateTblTeammemberFooter()
            MGT_FillTableTeammember(team_pk);
// add 1 new teammember when
            if(is_add_new_mode)(MGT_AddTeammember());
// ---  enable save button
            MGT_BtnSaveDeleteEnable()
// ---  deselect selected team, if any
            Grid_SelectTeam("MGT_Open")
// ---  show modal
            $("#id_modgrid_team").modal({backdrop: true});
        }  //  if(!!scheme_pk)
    };  // MGT_Open

//=========  MGT_fill_MGT_dict  ================  PR2020-03-19
    function MGT_fill_MGT_dict(scheme_pk, team_pk){
        console.log( "MGT_fill_MGT_dict");
        console.log( "scheme_pk: ", scheme_pk);
        console.log( "team_pk: ", team_pk);

        console.log( "grid_teams_dict: ", deepcopy_dict(grid_teams_dict));
// ---  get grid_team_dict from grid_teams_dict
        const grid_team_dict = grid_teams_dict[team_pk];
        console.log( "grid_team_dict: ", deepcopy_dict(grid_team_dict));
        /*
        // grid_team_dict: 2557: { id: {col: 2, row_id: "team_2557", code: "Ploeg C", abbrev: "C"}
              teammembers:          1597: {row: 2, row_id: "tm_1597", display: "chris"}
                                    1598: {row: 3, row_id: "tm_1598", display: "ert"}
                                    1599: {row: 4, row_id: "tm_1599", display: "ik"}
        */
        const team_mapdict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk)
        const add_new_mode = (isEmpty(team_mapdict));
        console.log( "add_new_mode: ", add_new_mode);

// --- create mod_MGT_dict with team
        mod_MGT_dict = {team: {id: {pk: team_pk,
                                    ppk: scheme_pk,
                                    table: "team"
                                    // use 'create' instead of 'mode'. Was: mode: (add_new_mode) ? "create" : "unchanged"
                                    }}
                        }
        if (add_new_mode){ mod_MGT_dict.team.id.create = true };
// --- add team_code
        if (add_new_mode){
            const team_code = get_teamcode_with_sequence_from_map(team_map, scheme_pk, loc.Team);
            mod_MGT_dict.team.code = {value: team_code, update: true};
        } else {
            const team_code = get_dict_value(team_mapdict, ["code", "value"]);
            mod_MGT_dict.team.code = {value: team_code};
        }

// --- loop through teammember list of this team - using grid_teams_dict
        for (let key in grid_team_dict) {
            if (grid_team_dict.hasOwnProperty(key)) {
                const teammember_pk = Number(key);
                if(!!teammember_pk){
                    MGT_create_modMGT_tm_dict(teammember_pk);
                }
           }  // if (grid_team_dict.hasOwnProperty(key)) {
        }  // for (let key in grid_team_dict) {
        console.log(">>>>>>>>>>> mod_MGT_dict", mod_MGT_dict)
        return add_new_mode
    }  // MGT_fill_MGT_dict

// ===== MGT_create_modMGT_tm_dict ===== PR2020-04-18
    function MGT_create_modMGT_tm_dict(teammember_pk, tm_ppk_str){
        console.log( "===== MGT_create_modMGT_tm_dict  ========= ");
        if(!!teammember_pk){
            const tm_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk);
            if(isEmpty(tm_dict)){
// create empty tm_dict with ppk and create=true
                mod_MGT_dict[teammember_pk] = {
                    id: {pk: teammember_pk,
                        ppk: tm_ppk_str,
                        table: "teammember",
                        create: true},
                    employee: {},
                    replacement: {},
                    datefirst: {},
                    datelast: {} }
            } else {
// create tm_dict in mod_MGT_dict
                mod_MGT_dict[teammember_pk] = {
                    id: {pk: teammember_pk,
                        ppk: get_dict_value(tm_dict, ["id","ppk"]),
                        table: "teammember"},
                    employee: {pk: get_dict_value(tm_dict, ["employee","pk"]),
                               ppk: get_dict_value(tm_dict, ["employee","ppk"]),
                                code: get_dict_value(tm_dict, ["employee","code"], "---")},
                    replacement: {pk: get_dict_value(tm_dict, ["replacement","pk"]),
                                  ppk: get_dict_value(tm_dict, ["replacement","ppk"]),
                                code: get_dict_value(tm_dict, ["replacement","code"], "---")},
                    datefirst: {value: get_dict_value(tm_dict, ["datefirst","value"]),
                                mindate: get_dict_value(tm_dict, ["datefirst","mindate"]),
                                maxdate: get_dict_value(tm_dict, ["datefirst","maxdate"])},
                    datelast: {value: get_dict_value(tm_dict, ["datelast","value"]),
                                mindate: get_dict_value(tm_dict, ["datelast","mindate"]),
                                maxdate: get_dict_value(tm_dict, ["datelast","maxdate"])}
        }}};
    }  // MGT_create_modMGT_tm_dict

// ++++++++++++++++++++++++++++++++++++ MGT_Save ++++++++++++++++++++++++++++++++++++ PR2019-11-23
    function MGT_Save(crud_mode){
        console.log( "===== MGT_Save  ========= ");
        console.log("mod_MGT_dict: ", mod_MGT_dict)
        const is_delete = (crud_mode === "delete");

         // key id: {shiftoption: "grid_team"} is needed in teammember_upload to go to the right function
        let upload_dict = {id: {shiftoption: 'grid_team'}};

        // put mode = 'delete' in id of shift to delete shift

// =========== SAVE TEAM =====================
        const team_dict = mod_MGT_dict.team
        console.log("team_dict: ", team_dict)
        if(!isEmpty(team_dict)){
            let id_dict = team_dict.id;
        // always upload team, pk needed for teammembers
            if(is_delete){
                id_dict.mode = "delete"
                //upload_dict.team = {id: id_dict}
                //mod_upload_dict["id"]["delete"] = true;
                mod_upload_dict = {id: {shiftoption: 'grid_team'},
                                    grid_team_delete: true,
                                  team: team_dict };
// make team column red
                const grid_team_dict = grid_teams_dict[mod_upload_dict.team.id.pk]
                const col_index = grid_team_dict.id.col;
                let tblBody = document.getElementById("id_grid_tbody_team");
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

                ModConfirmOpen("grid_team_delete", null)
                return false;

            } else {
                upload_dict.team = {id: id_dict}
                // function 'update_instance_from_item_dict' uses "code: {value: 'Ploeg A'} .
                // Tag 'update' is not used, instead it detects changed values
                const is_update =  get_dict_value(team_dict, ["code", "update"], false);
                if (is_update) {
                    const code = get_dict_value(team_dict, ["code", "value"]);
                    upload_dict.team.code = (!!code) ? {value: code, update: true} : {update: true};
                }
    // =========== SAVE TEAMMEMBERS =====================
    // --- loop through teammember list of this team - using mod_MGT_dict
    // format:  upload_dict: {teammembers_dict: {1094: {id: {pk: 1094, ppk: 2132, table: 'teammember, mode: 'delete', shiftoption: None},
                                                        // datefirst: '2020-03-24', datelast: '2020-03-26',
                                                        // employee: {pk: 2613}, replacement: {pk: 2617}},
                                              // new3: {id: {pk: 'new3', ppk: 2132, table: 'teammember', mode: 'create', shiftoption: None},
                                                        // 'datefirst': None, 'datelast': None,
                                                        // employee: {pk: 2778}, replacement: {pk: None}}},

                let teammembers_list = [];
                for (let key in mod_MGT_dict) {
                    if (mod_MGT_dict.hasOwnProperty(key)) {
                        // keys in mod_MGT_dict are: mode, team and tm_pk's
                        if(["team", "mode"].indexOf(key) === -1){
                            const tm_dict = mod_MGT_dict[key]
                            if(!isEmpty(tm_dict)){
                                const mode = get_dict_value(tm_dict, ["id", "mode"]);
                                // add only teammembers with mode 'create, 'delete' or 'update'
                                if(["create", "delete", "update"].indexOf(mode) > -1){
                                    let teammember_dict = {id: get_dict_value(tm_dict, ["id"])}
                                    let fields = ["employee", "replacement", "datefirst", "datelast"];
                                    for(let i = 0, len = fields.length; i < len; i++){
                                        const fldName = fields[i]
                                        if(get_dict_value(tm_dict, [fldName, "update"], false)){
                                            const fld_dict = get_dict_value(tm_dict, [fldName]);
                                            if(!!fld_dict){
                                                teammember_dict[fldName] = fld_dict;
                                            }
                                        }
                                    }
                                    teammembers_list.push(teammember_dict)
                                }
                            }
                        }
                    }
                }
                if(!!teammembers_list.length){
                    upload_dict.teammembers_list = teammembers_list;
                }
                console.log("upload_dict: ", upload_dict)
            } // if(is_delete)
            UploadChanges(upload_dict, url_teammember_upload, "MGT_Save");

        }  // if(!isEmpty(team_dict))
    }  // MGT_Save

//=========  MGT_CreateTblTeammemberHeader  === PR2020-03-16
    function MGT_CreateTblTeammemberHeader() {
        //console.log("===  MGT_CreateTblTeammemberHeader == ");
        let tblHead = document.getElementById("id_MGT_thead_teammember");
        tblHead.innerText = null
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        const col_count = 5;
        // in field_settings col=0 contains team. Skip this column in MGT. Start at j=1
        for (let j = 1; j < col_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
    // --- add innerText to th
                const data_text =  loc[field_settings.teammember.field_caption[j]];
                if(!!data_text) el_div.innerText = data_text;
    // --- add margin to first column
                if (j === 1 ){el_div.classList.add("ml-2")}
    // --- add width to el
                el_div.classList.add("tw_" + field_settings.teammember.field_width[j])
    // --- add text_align
                el_div.classList.add("ta_" + field_settings.teammember.field_align[j])
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
        for (let j = 1; j < field_settings.teammember.tbl_col_count; j++) {
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
        console.log( "===== MGT_FillTableTeammember  ========= ");
        console.log( "team_pk", team_pk);
// --- reset tblBody
        let tblBody = document.getElementById("id_MGT_tbody_teammember");
        tblBody.innerText = null;
// --- loop through teammember list of this team - using mod_MGT_dict
        for (let key in mod_MGT_dict) {
            if (mod_MGT_dict.hasOwnProperty(key)) {
                const tm_dict = mod_MGT_dict[key]
                if(!isEmpty(tm_dict)){
                    const tblName = get_dict_value(tm_dict, ["id", "table"]);
                    const mode = get_dict_value(tm_dict, ["id", "mode"]);
                    // skip rows that have the "delete" mode
                    // was:  if(tblName === "grid_teammember" && mode !== "delete"){
                    if(tblName === "teammember" && mode !== "delete"){
                        // no need to filter on selected.team_pk: mod_MGT_dict only contains tm_pk's of this team
                        let tblRow = MGT_TblTeammember_CreateRow(tblBody, tm_dict);
                        MGT_TblTeammember_UpdateRow(tblRow, tm_dict);
                    }
                };
           }
        }
    }  // MGT_FillTableTeammember

//=========  MGT_TblTeammember_CreateRow  ================ PR2019-09-04
    function MGT_TblTeammember_CreateRow(tblBody, tm_dict ){
        console.log("--- MGT_TblTeammember_CreateRow  --------------");

        const tblName = "teammember";
        const pk_int = get_dict_value(tm_dict, ["id", "pk"])
        const ppk_int = get_dict_value(tm_dict, ["id", "ppk"])
        const map_id = get_map_id(tblName, pk_int)

// --- insert tblRow into tblBody or tfoot
        let tblRow = tblBody.insertRow(-1);

        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", tblName);
        tblRow.setAttribute("data-isgrid", true);

//+++ insert td's into tblRow
        const column_count = field_settings.teammember.tbl_col_count
        // in field_settings col=0 contains team. Skip this column in MGT. Start at j=1
        for (let j = 1; j < column_count; j++) {
            let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
            let el = document.createElement( field_settings.teammember.field_tags[j] );
// --- add data-field Attribute.
            el.setAttribute("data-field", field_settings.teammember.field_names[j]);
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
            console.log("add EventListener MGT_TeammemberDateChanged ",);
                    //el.classList.add("input_popup_date") // class input_popup_date is necessary to skip closing popup
                };
// --- add margin to first column
                if (j === 1 ){el.classList.add("ml-2")}
            }
// --- add width to el - not necessary, tblhead has width
           // el.classList.add("tw_" + field_settings.teammember.field_width[j])
// --- add text_align
            el.classList.add("ta_" + field_settings.teammember.field_align[j])
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
        console.log("tblRow", tblRow);
        console.log("tm_dict", tm_dict);

        // format of tm_dict is :
        // { id: {pk: --, ppk: --, table: --,  mode: "create" }
        //   employee: {pk: --, code: -- }
        //   replacement: {pk: --, code: -- }
        //   datefirst: {value: --, mode: "update"},
        //   datelast: {value: --},

        if (!!tblRow && !isEmpty(tm_dict)) {
// check if tblBody = tfoot, if so: is_addnew_row = true
            let tblBody = tblRow.parentNode;
            const tblBody_id_str = get_attr_from_el(tblBody, "id")
            const arr = tblBody_id_str.split("_");
            const is_addnew_row = (arr.length > 1 && arr[1] === "tfoot");

        console.log("is_addnew_row", is_addnew_row);
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
                        if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                            el_input.value = get_dict_value(tm_dict, [fldName, "value"]);
                            el_input.min = get_dict_value(tm_dict, [fldName, "mindate"]);
                            el_input.max = get_dict_value(tm_dict, [fldName, "maxdate"]);
                            // set min or max dat of other date field
                            set_other_datefield_minmax(tblRow, fldName, tm_dict);
                        } else if (["employee", "replacement"].indexOf( fldName ) > -1){
                            el_input.innerText = get_dict_value(tm_dict, [fldName, "code"]);
                        }
                    }
                }
            }
        };
    }  // function MGT_TblTeammember_UpdateRow

//========= MGT_AddTeammember  ============= PR2020-03-19
    function MGT_AddTeammember() {
        console.log( " ==== MGT_AddTeammember ====");
        const team_pk = get_dict_value(mod_MGT_dict, ["team", "id", "pk"]);
        if(!!team_pk){
// ---  create new pk_str
            id_new = id_new + 1
            const pk_str = "new" + id_new.toString()
// ---  createnew tm_dict in mod_MGT_dict
            mod_MGT_dict[pk_str] = {
                // was: id: {pk: pk_str, ppk: team_pk, table: "grid_teammember", mode: "create"},
                id: {pk: pk_str, ppk: team_pk, table: "teammember", mode: "create"},
                employee: {pk: null, code: "---"},
                replacement: {pk: null, code: "---"},
                datefirst: {value: null},
                datelast: {value: null},
            };
            mod_MGT_dict.mode = "update";
            MGT_BtnSaveDeleteEnable();
            MGT_FillTableTeammember(team_pk)
        console.log( " mod_MGT_dict[" + pk_str +  "]: " , deepcopy_dict(mod_MGT_dict[pk_str]));
        }
    }

//========= MGT_DeleteTeammember  ============= PR2020-03-19
    function MGT_DeleteTeammember(tblRow) {
        //console.log( " ==== MGT_DeleteTeammember ====");
        //console.log( "tblRow", tblRow);

        const tm_pk = get_attr_from_el(tblRow, "data-pk", 0);
        let id_dict = get_dict_value(mod_MGT_dict, [tm_pk, "id"])
        const team_pk = get_dict_value(id_dict, ["ppk"]);
        if(!!id_dict) {
            id_dict.mode = "delete";
        }
        mod_MGT_dict.mode = "update";
        //console.log( "mod_MGT_dict", mod_MGT_dict);

        MGT_FillTableTeammember(team_pk)
        MGT_BtnSaveDeleteEnable();

    }  // MGT_DeleteTeammember

//========= MGT_BtnDeleteClicked  ============= PR2019-09-23
    function MGT_BtnDeleteClicked(el_input) {
        console.log( " ==== MGT_BtnDeleteClicked ====");
        // when clicked on delete button in table teammembers of MGT
        console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const sel_teammember_pk = get_attr_from_el(tblRow, "data-pk");
            //console.log("sel_teammember_pk: ", sel_teammember_pk);

    // --- lookup teammember_dict in mod_upload_dict.teammembers_list
            let index = -1, dict = {};

            const len = mod_upload_dict.teammembers_list.length;
            if(!!len){
                for (let i = 0; i < len; i++) {
                    dict = mod_upload_dict.teammembers_list[i];
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
                    mod_upload_dict.teammembers_list.splice(index, 1);
                } else {
            // if sel_teammember_pk is numeric, the row is a saved row. Put 'delete in id_dict for deletion
                    dict["id"]["mode"] = "delete";
                    //console.log("dict): ", dict);
                }
            }
            console.log("mod_upload_dict.teammembers_list: ");
            console.log(mod_upload_dict.teammembers_list);

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
        console.log( "fldName: ", fldName);

// --- get teammember_dict in mod_MGT_dict
        let tm_dict = mod_MGT_dict[teammember_pk];
// ---  get new min max of other date field
        const min_max_date = MGT_get_datefield_minmax(tblRow, fldName, tm_dict);
        const mindate = min_max_date[0];
        const maxdate = min_max_date[1];

        tm_dict[fldName]["value"] = new_date;
        tm_dict[fldName]["update"] = true;

// ---  set new min max of both date field
        set_other_datefield_minmax(tblRow, fldName, tm_dict);

        // don't put 'update' in id.mode when id.mode is already 'create' or 'delete'
        const id_mode = get_dict_value(mod_MGT_dict, ["id", "mode"])
        if (["create", "delete"].indexOf(id_mode) === -1) {
            tm_dict.id.mode = "update"
        };
        mod_MGT_dict.mode = "update";

        MGT_BtnSaveDeleteEnable();

    }; // MGT_TeammemberDateChanged

//=========  MGT_get_datefield_minmax  ================ PR2020-04-19
    function MGT_get_datefield_minmax(tblRow, fldName, tm_dict) {
        console.log( "===== MGT_get_datefield_minmax  ========= ");

        const other_fldName = (fldName === "datefirst")  ? "datelast" : "datefirst";
        let el_other = tblRow.querySelector("[data-field=" + other_fldName + "]");
        let mindate = get_dict_value(tm_dict, [fldName, "mindate"]);
        let maxdate = get_dict_value(tm_dict, [fldName, "maxdate"]);
        let other_value = el_other.value;

        if (fldName === "datefirst") {
            if ( (!!other_value) && (!maxdate || other_value < maxdate) ) {
                maxdate = other_value};
        } else {
            if ( (!!other_value) && (!mindate || other_value > mindate) ) {
                mindate = other_value}};
        return [mindate, maxdate]
    }


//=========  MGT_TeamAdd  ================ PR2020-03-18
    function MGT_TeamAdd() {
        console.log( "===== MGT_TeamAdd  ========= ");

        id_new += 1;
        const pk_new = "new" + id_new.toString()

        const team_code = get_teamcode_with_sequence_from_map(team_map, selected.scheme_pk, loc.Team);

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





        console.log( "mod_MGT_dict: ", mod_MGT_dict);

// ---  enable save button
        MGT_BtnSaveDeleteEnable()
    }; // MGT_TeamAdd


//=========  MGT_TeamcodeChanged  ================ PR2020-03-18
    function MGT_TeamcodeChanged(el_input) {
        //console.log( "===== MGT_TeamcodeChanged  ========= ");
        const field ="code"
        const new_code = el_input.value;
        if(!!mod_MGT_dict.team){
            mod_MGT_dict.team.code = {value: new_code, update: true}
            mod_MGT_dict.team.id.mode = "update";
            mod_MGT_dict.mode = "update";
        }
// ---  enable save button
        MGT_BtnSaveDeleteEnable()
    }; // MGT_TeamcodeChanged


//=========  MGT_BtnSaveDeleteEnable  ================ PR2020-03-20
    function MGT_BtnSaveDeleteEnable(){
        console.log( "MGT_BtnSaveDeleteEnable");

        const mode = get_dict_value(mod_MGT_dict, ["mode"])
        el_MGT_btn_save.disabled = (!selected.scheme_pk || ["update", "create", "delete"].indexOf(mode) === -1);

        const team_mode = get_dict_value(mod_MGT_dict, ["team", "id", "mode"])
        const btn_delete_hidden = (!selected.scheme_pk || team_mode === "create");
        add_or_remove_class (el_MGT_btn_delete, cls_hide, btn_delete_hidden) // args: el, classname, is_add
    }  // MGT_BtnSaveDeleteEnable

// +++++++++ MOD CONFRIM ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-10-23 PR2020-05-03
    function ModConfirmOpen(mode, el_input, get_text) {
        console.log(" -----  ModConfirmOpen   ----", mode)
        console.log("mod_upload_dict: ", mod_upload_dict)
        //console.log("get_text: ", get_text)
        // modes are schemeitem_delete, delete, inactive, 'grid_si', 'grid_team_delete', 'grid_shift_delete'

        mod_upload_dict.mode = mode //used in ModConfirmSave
        const tblRow = get_tablerow_selected(el_input);

        let tblName, map_dict, pk_str;
        // tblRow is undefined when el_input = undefined
        if(!!tblRow){
            tblName = get_attr_from_el(tblRow, "data-table")  // can be 'absence' from UploadDeleteInactive
            pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id =  get_map_id(tblName, pk_str);
            map_dict = get_mapdict_from_tblRow(tblRow)
        } else if(mode === "schemeitem_delete"){
            tblName = "schemeitem";
            mod_upload_dict = {id: {table: tblName}, schemeitem_delete: true};
        } else if(mode === "grid_team_delete"){
            tblName = "team";
            // get pk_str from mod_MGT_dict
            const team_pk = get_dict_value(mod_MGT_dict, ["team", "id", "pk"]);
            pk_str = team_pk.toString();
        } else if(mode === "grid_shift_delete"){
            tblName = "shift";
            // get pk_str from mod_MGS_dict
            const shift_pk = mod_MGS_dict.shift.id.pk;
            pk_str = shift_pk.toString();
        } else {
            // get info from mod_upload_dict
            tblName = get_dict_value(mod_upload_dict, ["id", "table"])
        }

// ---  create header_text
        let header_text = null;
        if (mode === "schemeitem_delete") {
             header_text = loc.Delete_scheme_shifts;
        } else if (mode === "grid_team_delete") {
             header_text = loc.Team + ": " + mod_MGT_dict.team.code.value;
        } else if (mode === "grid_shift_delete") {
             header_text = loc.Shift + ": " + mod_MGS_dict.shift.code.value ;
             if (mod_MGS_dict.shift.isrestshift.value) { header_text += " (R)"};
        } else if (mode === "grid_si") {
            header_text = get_text;
        } else if (tblName === "schemeitem") {
            const rosterdate = get_dict_value(map_dict, ["rosterdate", "value"])
            let rosterdate_text = format_date_iso (rosterdate, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);
            if(!rosterdate_text){ rosterdate_text = "-"}
            const shift_text = get_dict_value(mod_upload_dict, ["shift", "code"], "-")
            header_text = loc.Shift + " '" + shift_text + "' " + loc.of + " " + rosterdate_text;
        } else if(["teammember", "absence"].indexOf(tblName) > -1){
            header_text = get_dict_value(mod_upload_dict, ["employee", "code"], "")

        } else {
            let code_value = get_dict_value(mod_upload_dict, ["code", "value"]);
            if(!code_value) {code_value = get_dict_value(map_dict, ["code", "value"], "-")};
            header_text = code_value;
        }
        document.getElementById("id_confirm_header").innerText = header_text;

// ---  create msg_txt
        let msg_01_txt = (tblName === "scheme") ? loc.This_scheme :
                       (tblName === "schemeitem") ? loc.This_shift :
                       (tblName === "shift") ? loc.This_shift :
                       (tblName === "teammember") ? loc.This_teammember :
                       (tblName === "absence") ? loc.Absence + " '" + get_dict_value(map_dict, ["order", "code"], "-") + "'"  :
                       (tblName === "team") ? loc.This_team : null
        let msg_02_txt = null, msg_03_txt = loc.Do_you_want_to_continue;;


        if (mode === "grid_si"){
            msg_01_txt = loc.Select_team_first;
            msg_02_txt = loc.before_add_or_remove;
            msg_03_txt = loc.Click + " \u22BB " + loc.above_teamname_to_select;
            // "Click OK to make this shift inactive.";
        } else if (mode === "schemeitem_delete"){
            msg_01_txt = loc.All_schemeitems_willbe_deleted;
        } else if (mode === "inactive"){
            msg_01_txt = msg_01_txt + " " + loc.will_be_made_inactive;
        } else if (["delete", "grid_team_delete", "grid_shift_delete"].indexOf(mode) > -1){
            msg_01_txt = msg_01_txt + " " + loc.will_be_deleted;
        }

// put msg_txt in modal form
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        document.getElementById("id_confirm_msg02").innerText = msg_02_txt;
        document.getElementById("id_confirm_msg03").innerText = msg_03_txt;

        let el_btn_save = document.getElementById("id_confirm_btn_save")
        el_btn_save.innerText = (mode === "inactive") ? loc.Yes_make_inactive : loc.Yes_delete;
        let el_btn_cancel = document.getElementById("id_confirm_btn_cancel")
        el_btn_cancel.innerText = (mode === "grid_si") ? loc.OK : loc.No_cancel;

// hide ok button when (mode === "grid_si")
        add_or_remove_class (el_btn_save, cls_hide, (mode === "grid_si"))
        //setTimeout(function() {el_btn_save.focus()}, 300);

// set focus to cancel button (when delete) or save (when inactive), delay 500ms because of modal fade
        let id_str = (mode === "inactive") ? "id_confirm_btn_save" : "id_confirm_btn_cancel";
        setTimeout(function (){document.getElementById(id_str).focus();}, 500);
        const is_delete = (["delete", "schemeitem_delete", "grid_team_delete", "grid_shift_delete"].indexOf(mode) > -1)
        let btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary";
        let btn_class_remove = (is_delete) ? "btn-primary" : "btn-outline-danger";
        document.getElementById("id_confirm_btn_save").classList.remove(btn_class_remove)
        document.getElementById("id_confirm_btn_save").classList.add(btn_class_add)

// show modal
        $("#id_mod_confirm").modal({backdrop: true});
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-09-20
    function ModConfirmSave() {
        console.log("========= ModConfirmSave ===" );
        console.log("mod_upload_dict: ", mod_upload_dict );

        const shift_option = get_dict_value(mod_upload_dict, ["id", "shiftoption"]);
        console.log("shift_option: ", shift_option );
        const is_delete = (mod_upload_dict.mode === "delete");
        console.log(">>>>>is_delete: ", is_delete );

// ---  hide modal
        $('#id_mod_confirm').modal('hide');

// ---  Upload Changes
        const tblName = get_dict_value(mod_upload_dict, ["id", "table"])
        const pk_int = get_dict_value(mod_upload_dict,["id", "pk"])
        if(is_absence_mode){tblName === "absence"}
        const map_id = get_map_id(tblName, pk_int)
        console.log(">>>>> map_id: ", map_id );

        if(tblName === "schemeitem"){
            const is_delete_single_si = get_dict_value(mod_upload_dict, ["id", "delete"])
            console.log("is_delete_single_si: ", is_delete_single_si );
            if(is_delete_single_si){
                // this is called by btn_inactive in tblRow
                let tblRow = document.getElementById(map_id);
                tblRow.classList.remove(cls_selected);
                tblRow.classList.add(cls_error);

                // ---  upload upload_list, it can contain multiple upload_dicts (list added because of grid PR2020-03-15)
                let upload_list = [mod_upload_dict];
                UploadChanges(upload_list, url_schemeitem_upload, "ModConfirmSave")

            } else {
                if ("schemeitem_delete" in mod_upload_dict) {
                    // schemeitem_delete is called by buttongroup schemeitem
                    const skip_confirm = true;
                    HandleBtnSchemeitems("delete", skip_confirm);
                } else if ("delete" in mod_upload_dict) {
                    // delete is called by btn_delete in tblRow
                    UploadSchemeitemDelete (mod_upload_dict, "delete")
                } else {
                    // this is called by btn_inactive in tblRow
                    // ---  upload upload_list, it can contain multiple upload_dicts (list added because of grid PR2020-03-15)
                    let upload_list = [mod_upload_dict];
                    UploadChanges(upload_list, url_schemeitem_upload, "ModConfirmSave")
                }
            }  //  if(is_delete_single_si){
        } else if(tblName === "teammember" || ["grid_team", "grid_shift", "datatable_shift_delete"].indexOf(shift_option) > -1){
            UploadChanges(mod_upload_dict, url_teammember_upload, "ModConfirmSave");

        //} else if(!!mod_upload_dict.grid_team_delete || !!mod_upload_dict.grid_shift_delete){
        //    UploadChanges(mod_upload_dict, url_teammember_upload);
        } else {
            // tblName: scheme, shift, team, absence
            UploadChanges(mod_upload_dict, url_scheme_shift_team_upload, "ModConfirmSave")
        }

// ---  make selected tblRow red in datatable when delete
        if (get_dict_value(mod_upload_dict, ["mode"]) === "delete") {
            const pk_int = get_dict_value(mod_upload_dict, ["id", "pk"]);
            let tblName = get_dict_value(mod_upload_dict, ["id", "table"]);
            if(is_absence_mode){tblName = "absence"}
            const map_id = get_map_id(tblName, pk_int);
            const tblRow = document.getElementById(map_id);
            if(!!tblRow){ ShowErrorRow(tblRow, cls_selected)}
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
        MSCO_FillSelectTableCustOrder()
// ---  hide 'remove_order' button
        document.getElementById("id_MSCO_div_remove_custorder").classList.add(cls_hide);
// ---  set focus to el_MSCO_input_custorder
        set_focus_on_el_with_timeout(el_MSCO_input_custorder, 150)
// ---  show modal
         $("#id_mod_select_custorder").modal({backdrop: true});
    }; // MSCO_Open

//=========  MSCO_FillSelectTableCustOrder  ================ PR2020-05-21 cleaned
    function MSCO_FillSelectTableCustOrder() {
        //console.log( "===== MSCO_FillSelectTableCustOrder ========= ");

        let tableBody = el_MSCO_tblbody_custorder;
        tableBody.innerText = null;

        let row_count = 0;
//--- loop through order_map
        for (const [map_id, item_dict] of order_map.entries()) {
            const add_to_list = MSCO_FillSelectRow(tableBody, item_dict)
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
                mod_MSCO_dict.order_pk = get_attr_from_el(tblRow, "data-pk");
                mod_MSCO_dict.customer_pk = get_attr_from_el(tblRow, "data-ppk");
// ---  highlight first row
                tblRow.classList.add(cls_selected);
            }
        }
    }  // MSCO_FillSelectTableCustOrder

//=========  MSCO_FillSelectRow  ================ PR2020-05-21 cleaned
    function MSCO_FillSelectRow(tableBody, item_dict) {
        //console.log( "===== MSCO_FillSelectRow ========= ", tblName);

//--- check if item must be added to list
        let add_to_list = false, is_selected_pk = false;
        const is_absence = get_dict_value(item_dict, ["id", "isabsence"], false);
        if (is_absence === show_absence_FOR_TESTING_ONLY || show_absence_FOR_TESTING_ONLY == null){
            add_to_list = true
        } else {
            const customer_inactive = get_dict_value(item_dict, ["customer", "inactive"], false);
            const order_inactive = get_dict_value(item_dict, ["inactive", "value"], false);
            add_to_list = (!customer_inactive && !order_inactive);
        }
// ---  add item to list
        if (add_to_list){
// ---  get info from item_dict
            const pk_int = get_dict_value(item_dict, ["id", "pk"]);
            const ppk_int = get_dict_value(item_dict, ["id", "ppk"]);
            const customer_code = get_dict_value(item_dict, ["customer", "code"], "");
            const order_code = get_dict_value(item_dict, ["code", "value"], "");
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
            tblRow.addEventListener("click", function() {MSCO_SelecttableClicked(tblRow)}, false )
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
    function MSCO_SelecttableClicked(tblRow) {
        //console.log( "===== MSCO_SelecttableClicked ========= ");

// ---  get clicked tablerow
        if(!!tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            mod_MSCO_dict.order_pk = get_attr_from_el_int(tblRow, "data-pk");
            mod_MSCO_dict.customer_pk = get_attr_from_el_int(tblRow, "data-ppk");
            MSCO_Save();
        }
    }  // MSCO_SelecttableClicked

//=========  MSCO_FilterCustOrder  ================ PR2020-05-21 cleaned
    function MSCO_FilterCustOrder() {
        console.log( "===== MSCO_FilterCustOrder  ========= ");
        let new_filter = el_MSCO_input_custorder.value;
// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSCO_tblbody_custorder, cls_selected)
// ---  reset selected order.pk
        mod_dict.order_pk = 0;
// ---  filter select_customer rows
        if (!!el_MSCO_tblbody_custorder.rows.length){
            const filter_dict = t_Filter_SelectRows(el_MSCO_tblbody_custorder, new_filter);
            // filter_dict.selected_pk has only value when unique record found
// ---  if filter results have only one unique record: put selected order in el_MSCO_input_custorder
            if (filter_dict.selected_pk) {
        console.log( "filter_dict", filter_dict);
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
        console.log("=====  MSCO_Save =========");
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
        // called by EventListener of input employee and replacement in table teammember and MGT_Teammember

        console.log(el_input)

        console.log("selected.scheme_pk", selected.scheme_pk)
        console.log("selected.team_pk", selected.team_pk)

        const tlbRow = get_tablerow_selected(el_input)
        const is_grid = (!!get_attr_from_el(tlbRow, "data-isgrid"))
        console.log("is_grid", is_grid)

// ---  add employee disabled in template mode, also in table when no team selected (grid mode is allowed)
        if(is_template_mode || (!selected.team_pk && !is_grid ) ){
            // TODO error: el_msg not showing yet
            // ShowMsgError(el_input, el_msg, msg_err, [200,200])
            // ---  show modal confirm with message 'First select employee'
            const msg_err = (is_template_mode) ? loc.err_cannot_enter_teammember_in_template : loc.err_first_select_team
            document.getElementById("id_confirm_header").innerText = loc.Select_employee + "...";
            document.getElementById("id_confirm_msg01").innerText = msg_err;
            document.getElementById("id_confirm_msg02").innerText = null;
            document.getElementById("id_confirm_msg03").innerText = null;

            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_btn_cancel.classList.add(cls_hide)
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            setTimeout(function() {el_btn_save.focus()}, 50);
            $("#id_mod_confirm").modal({backdrop: true});

        } else {
// ---  get tm_pk from tlbRow
            const tm_pk_str = get_attr_from_el(tlbRow, "data-pk")
            const tm_ppk_str = get_attr_from_el(tlbRow, "data-ppk")
            const team_pk = get_attr_from_el(tlbRow, "data-ppk")
            const tblName = get_attr_from_el(tlbRow, "data-table")
            const is_table = (!!get_attr_from_el(tlbRow, "data-istable", false))

// ---  get fldName from el_input, fldName = 'employee' or 'replacement'
            const fldName = get_attr_from_el(el_input, "data-field")
            const is_replacement = (fldName === "replacement")

// ---  create mod_MGT_dict[tm_pk_str] when called by table. In grid mode mod_MGT_dict has already values
            if (is_table){
                mod_MGT_dict = {};
                MGT_create_modMGT_tm_dict(tm_pk_str, tm_ppk_str);
            }
            // always add fldName and is_table, both in grid mode and in table mode
            mod_MGT_dict.field = fldName;
            mod_MGT_dict.istable = is_table;
            mod_MGT_dict.sel_tm_pk = tm_pk_str; // can be 'new12'
            console.log("mod_MGT_dict", mod_MGT_dict);

// ---  put employee name in header
            const pk = get_dict_value(mod_MGT_dict, [tm_pk_str, fldName, "pk"]);
            const empl_or_repl_code = get_dict_value(mod_MGT_dict, [tm_pk_str, fldName, "code"], "---");
            let label_text = ((is_replacement) ? loc.Select_replacement_employee : loc.Select_employee ) + ":";
            let el_header = document.getElementById("id_ModSelEmp_hdr_employee")
            let el_label_input = document.getElementById("id_ModSelEmp_lbl_input_employee")
            let el_div_remove = document.getElementById("id_ModSelEmp_div_remove_employee")
            if (!!pk){
                el_header.innerText = empl_or_repl_code
                el_div_remove.classList.remove(cls_hide)
            } else {
// ---  or header 'select employee' / 'select replacement' /
                el_header.innerText = label_text;
                el_div_remove.classList.add(cls_hide)
            }
            document.getElementById("id_ModSelEmp_lbl_input_employee").innerText = label_text
// ---  remove values from el_mod_employee_input
            let el_mod_employee_input = document.getElementById("id_ModSelEmp_input_employee")
            el_mod_employee_input.value = null
// ---  fill selecttable employee
            MSE_FillSelectTableEmployee(pk, is_replacement)
// ---  set focus to el_mod_employee_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){el_mod_employee_input.focus()}, 500);
// ---  show modal
            $("#id_mod_select_employee").modal({backdrop: true});
        }  //  if(!is_template_mode)
    };  // MSE_open

//=========  MSE_Save  ================ PR2020-03-17
    function MSE_Save(mode) {
        console.log("========= MSE_Save ===", mode );  // mode = 'save' or 'remove'
        // called by MSE_filter_employee, MSE_select_employee, MSE_btn_remove_employee, MSE_btn_remove_employee
        // mod_employee_dict = {teammember_pk, employee_pk, employee_ppk, employee_code, table, field}

        console.log("mod_MGT_dict: ", mod_MGT_dict)
        const tblName = "teammember";
        const fldName = mod_MGT_dict.field;
        const is_replacement = (fldName === "replacement");
        const is_calledby_tm_table = mod_MGT_dict.istable;

        const tm_pk = mod_MGT_dict.sel_tm_pk
        const team_pk = get_dict_value(mod_MGT_dict, [tm_pk, "id", "ppk"]);
        const tm_is_create = (!!get_dict_value(mod_MGT_dict, [tm_pk, "id", "create"], false));

        let employee_pk = null, employee_ppk = null, employee_code = "---";
        if (mode !=="remove"){
            employee_pk = get_dict_value(mod_MGT_dict, [tm_pk, fldName, "pk"]);
            employee_ppk = get_dict_value(mod_MGT_dict, [tm_pk, fldName,"ppk"]);
            employee_code = get_dict_value(mod_MGT_dict, [tm_pk, fldName, "code"]);
        }

// when called by ModGridTeam: save in tblRow, When called by table Teammember: uploadchanges

        if(!is_calledby_tm_table) {
            let tm_dict = mod_MGT_dict[tm_pk]
            if(!isEmpty(tm_dict)){
                if(!!employee_pk){
                    tm_dict[fldName] = {pk: employee_pk, ppk: employee_ppk, code: employee_code, update: true};
                } else {
                    tm_dict[fldName] = {update: true};
                }
            }
            const id_dict = get_dict_value(mod_MGT_dict[tm_pk], ["id"])
            const id_mode = get_dict_value(id_dict, ["mode"])

            // don't put 'update' in id.mode when id.mode is already 'create' or 'delete'
            if (["create", "delete"].indexOf(id_mode) === -1) {
                tm_dict.id.mode = "update"
            };
            mod_MGT_dict.mode = "update";

            MGT_BtnSaveDeleteEnable();
// ---  put code in tblRow
            const row_id = "teammember_" + tm_pk.toString();
            let tblRow = document.getElementById(row_id);
            if(!!tblRow){
                const col_index = (is_replacement) ? 3 : 0;
                let td = tblRow.cells[col_index];
                if(!!td){ td.children[0].innerText = employee_code;}
            }
        } else {
// when called by table Teammember: upload changes
            let upload_dict = {};
            if (tm_is_create) {
                upload_dict = {id: {temp_pk: tm_pk, ppk: team_pk, table: tblName, create: true}};
            } else {
                upload_dict = {id: {pk: tm_pk, ppk: team_pk, table: tblName}};
            }
            upload_dict[fldName] = {pk: employee_pk, ppk: employee_ppk, code: employee_code, update: true};
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
        }
// ---  hide modal
        $("#id_mod_select_employee").modal("hide");
    } // MSE_Save

//=========  MSE_select_employee ================ PR2020-03-19
    function MSE_select_employee(tblRow) {
        //console.log( "===== MSE_select_employee ========= ");
        // tblRow is the selected tblRow in the employee table of Mod_Select_Employee
// ---  deselect all highlighted rows in the employee table
        DeselectHighlightedRows(tblRow, cls_selected)
        if(!!tblRow) {
// ---  highlight clicked row in the employee table
            tblRow.classList.add(cls_selected)
// ---  get employee_dict from employee_map
            const selected_pk = get_attr_from_el_int(tblRow, "data-pk")
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_pk);
            if (!isEmpty(employee_dict)){
// ---  put employee info in mod_MGT_dict
                MSE_put_employee_in_MGT_dict(employee_dict);
// ---  put employee_code in el_input_employee
                const employee_code = get_dict_value(employee_dict, ["code", "value"])
                document.getElementById("id_ModSelEmp_input_employee").value = employee_code // null value is ok, will show placeholder
// ---  save selected employee
                MSE_Save("save")
            }  // if (!isEmpty(employee_dict)){
        }  // if(!!tblRow) {
    }  // MSE_select_employee

//=========  MSE_filter_employee  ================ PR2020-04-18
    function MSE_put_employee_in_MGT_dict(employee_dict) {
        // mod_MGT_dict = {  field: "employee", istable: true, sel_tm_pk: 1444,
        //                  1444: {id: {pk: 1444, ppk: 2488, table: "teammember", mode: "unchanged"},
        //                  employee: {pk: 2614, ppk: 3, code: "Cornelia CDT"}
        //                  replacement: {pk: 2611, ppk: 3, code: "Giterson LSE"}
        //                  datefirst: {value: null}, datelast: {value: null} },

// ---  put employee info in field employee or replacement of selected teammember in mod_MGT_dict
        // will be null when no employee
        const teammember_pk = mod_MGT_dict.sel_tm_pk;
        const field = mod_MGT_dict.field; // field is 'employee' or 'replaceement'
        mod_MGT_dict[teammember_pk][field].pk = get_dict_value(employee_dict, ["id", "pk"]);
        mod_MGT_dict[teammember_pk][field].ppk = get_dict_value(employee_dict, ["id", "ppk"]);
        mod_MGT_dict[teammember_pk][field].code = get_dict_value(employee_dict, ["code", "value"])
        mod_MGT_dict[teammember_pk].update = true;
    }
//=========  MSE_filter_employee  ================ PR2019-05-26
    function MSE_filter_employee(option, event_key) {
        console.log( "===== MSE_filter_employee  ========= ", option);
        console.log( "event_key", event_key);

        let el_input = document.getElementById("id_ModSelEmp_input_employee")

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
        let select_value, select_pk, select_parentpk;
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
            //if (!isEmpty(employee_dict)){
// ---  get code_value from employee_dict, put it in mod_employee_dict and el_input_employee
            //    const employee_code = get_dict_value(employee_dict, ["code", "value"])
            //    mod_employee_dict.employee_pk = get_dict_value(employee_dict, ["id", "pk"]);
            //    mod_employee_dict.employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
            //    mod_employee_dict.employee_code = employee_code;
// put code_value of selected employee in el_input
            //    el_input.value = employee_code
            //}
            MSE_put_employee_in_MGT_dict(employee_dict);
        console.log( "mod_MGT_dict:", mod_MGT_dict);



        }
    }; // MSE_filter_employee

//========= MSE_FillSelectTableEmployee  ============= PR2019-08-18
    function MSE_FillSelectTableEmployee(cur_employee_pk, is_replacement) {
        //console.log( "=== MSE_FillSelectTableEmployee ");

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
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_dict_value (item_dict, ["id", "pk"])
                const ppk_int = get_dict_value (item_dict, ["id", "ppk"])
                const code_value = get_dict_value(item_dict, ["code", "value"], "");
                const is_inactive = get_dict_value(item_dict, ["inactive", "value"], false);

//- skip selected employee
// Note: cur_employee_pk gets value from el_input, not from selected.teammember_pk because it can also contain replacement
// PR20019-12-17 debug: also filter inactive, but keep inaclive in employee_map, to show them in teammember
                if (pk_int !== cur_employee_pk && !is_inactive){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE:  tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {MSE_select_employee(tblRow)}, false )

// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected.teammember_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // MSE_FillSelectTableEmployee

// +++++++++ END MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  HandleAddNewBtn  ================ PR2020-05-31
    function HandleAddNewBtn() {
        if(is_absence_mode){
            MAB_Open(true);
        } else {
            MSCH_Open();
        };
    }

//=========  MOD SCHEME  ================ PR2020-04-19
    function MSCH_Open(el_clicked) {
        console.log("=========  MSCH_Open ========= ");
        //console.log("selected.scheme_pk:", selected.scheme_pk);
        const is_addnew = (!el_clicked)

        mod_MSCH_dict = {};
        if(selected.order_pk){
// ---  reset mod_MSCH_dict when is_addnew, otherwise: fill with scheme_dict
            if(is_addnew){selected.scheme_pk = 0}
            // MSCH_get_scheme_dict creates a new scheme when selected scheme not found
            const scheme_dict = MSCH_get_scheme_dict(selected.order_pk, selected.scheme_pk);
            mod_MSCH_dict = {selected_order_pk: selected.order_pk,
                              scheme: scheme_dict}
            console.log("mod_MSCH_dict:", mod_MSCH_dict);
            if(is_addnew || !isEmpty(scheme_dict) ) {

                let el_field = get_attr_from_el(el_clicked, "data-field")
                // these field names in scheme box have multiple fiels in mod scheme. Set focus to first of them
                if(el_field === "datefirstlast"){
                    el_field = "datefirst"
                } else if(el_field === "dvg_excl_ph"){
                    el_field = (scheme_dict.divergentonpublicholiday) ? "divergentonpublicholiday" : "excludepublicholiday";
                } else if(!el_field){
                    el_field = "code"
                }

// ---  set input boxes
                // form-control is a bootstrap class, tsa_input_checkbox is a TSA class only used to select input checkboxes
                let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
                for (let i = 0, el; el = form_elements[i]; i++) {
                    const fldName = get_attr_from_el(el, "data-field")
                    if(el.type === "checkbox") {
                        el.checked = scheme_dict[fldName]
                    } else {
                        el.value = scheme_dict[fldName]
                    }
// ---  set focus to selected field
                    if (el_field && fldName === el_field){
                        set_focus_on_el_with_timeout(el, 150);
                    }
                }

// ---  validate values, set save btn enabled
                MSCH_validate_and_disable();
// ---  open Modal Scheme Add
                $("#id_modscheme").modal({backdrop: true});

            } else {
               // open confirm box 'Please_select_scheme'
                MSCH_Please_select_msg("scheme");
            }
        } else {
            // open confirm box 'Please_select_order'
            MSCH_Please_select_msg("order");
        }  //  if(selected.scheme_pk){

    }  // MSCH_Open

//=========  MSCH_Please_select_msg  ================ PR2020-06-07
    function MSCH_Please_select_msg(order_or_scheme) {
        // open confirn box 'Please_select_order' / scheme
        const header_text = (order_or_scheme === "order") ? loc.Select_order + "..." : loc.Select_scheme + "...";
        const msg_text = (order_or_scheme === "order") ? loc.Please_select_order : loc.Please_select_scheme;
        document.getElementById("id_confirm_header").innerText =header_text;
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
//=========  MSCH_Save  ================ PR2020-04-20
    function MSCH_Save(crud_mode) {
        console.log("=========  MSCH_Save =========");
        console.log( "mod_MSCH_dict: ", mod_MSCH_dict);
        const is_create = (!!mod_MSCH_dict.scheme.create)
        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: 'scheme' } }

        if(is_create) {
            upload_dict.id.ppk = mod_MSCH_dict.selected_order_pk;
            upload_dict.id.create = true;
        } else if(mod_MSCH_dict.scheme.pk) {
            upload_dict.id.pk = mod_MSCH_dict.scheme.pk;
            upload_dict.id.ppk = mod_MSCH_dict.scheme.ppk;
            //upload_dict.id.rowindex = mod_MSCH_dict.scheme.rowindex;
            if(is_delete) {upload_dict.id.delete = true}
        }
// ---  loop through input elements
        let form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el_input; el_input = form_elements[i]; i++) {
            if(el_input){
                const fldName = get_attr_from_el(el_input, "data-field");
                const new_value = (el_input.type === "checkbox") ?  el_input.checked : (el_input.value) ? el_input.value : null;
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
    }  // MSCH_Save

//=========  MSCH_get_scheme_dict  ================ PR2020-04-20
    function MSCH_get_scheme_dict(order_pk, scheme_pk) {
        //console.log( "=== MSCH_get_scheme_dict === ")
        //console.log( "order_pk", order_pk)
        //console.log( "scheme_pk", scheme_pk)
// --- GET SCHEME ----------------------------------
        let scheme_ppk = null, scheme_code = null, scheme_cycle = null;
        let datefirst = null, datelast = null, excl_ph = false, dvg_onph = false, excl_ch = false;
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", scheme_pk);
        const is_addnew = (isEmpty(map_dict))
        let scheme_dict = {};
        if (is_addnew) {;
// ---  create new scheme_dict if map_dict is empty, with default cycle = 7
            //id_new = id_new + 1;
            scheme_dict = { //pk: "new" + id_new.toString(),
                    ppk: order_pk,
                    table: "scheme",
                    code: get_schemecode_with_sequence(scheme_map, order_pk, loc.Scheme),
                    cycle: 7,
                    create: true
                };
        } else {
            scheme_dict = { pk: get_dict_value(map_dict, ["id", "pk"]),
                    ppk: get_dict_value(map_dict, ["id", "ppk"]),
                    table: "scheme",
                    code: get_dict_value(map_dict, ["code", "value"]),
                    cycle: get_dict_value(map_dict, ["cycle", "value"]),
                    datefirst: get_dict_value(map_dict, ["datefirst", "value"]),
                    datelast: get_dict_value(map_dict, ["datelast", "value"]),
                    excludepublicholiday: get_dict_value(map_dict, ["excludepublicholiday", "value"], false),
                    divergentonpublicholiday: get_dict_value(map_dict, ["divergentonpublicholiday", "value"], false),
                    excludecompanyholiday: get_dict_value(map_dict, ["excludecompanyholiday", "value"], false)
                };
        }
        return scheme_dict
    }  // MSCH_get_scheme_dict

//=========  MSO_SchemeCycleChanged  ================ PR2020-01-03
    function MSO_SchemeCycleChanged(fldName) {
        console.log( "===== MSO_SchemeCycleChanged  ========= ");
        const cycle_int = Number(el_MSO_scheme_cycle.value);
        const cycle_value = (!!cycle_int) ? cycle_int : null
        mod_upload_dict.scheme.cycle = {value: cycle_value, update: true}

        MSO_SetSchemeCycleText(cycle_value);
    }; // MSO_SchemeCycleChanged

//=========  MSCH_DateChanged  ================ PR2020-01-03
    function MSCH_DateChanged(fldName) {
        console.log( "===== MSCH_DateChanged  ========= ");
        console.log( "fldName ", fldName);

        if (fldName === "datefirst") {
            mod_upload_dict.scheme.datefirst = {value: el_MSCH_input_datefirst.value, update: true}
        } else if (fldName === "datelast") {
            mod_upload_dict.scheme.datelast = {value: el_MSCH_input_datelast.value, update: true}
        }
        console.log( "mod_upload_dict.scheme: ", mod_upload_dict.scheme);
        // ---  set new min max of both date field
        let el_MSCO_date_container = document.getElementById("id_MSCO_date_container")
        console.log( "el_MSCO_date_container.scheme: ", el_MSCO_date_container);
        set_other_datefield_minmax(el_MSCO_date_container, fldName);

    }; // MSCH_DateChanged

//=========  MSCH_CheckedChanged  ================ PR2020-04-20
    function MSCH_CheckedChanged(el_input, fldName) {
        console.log( "===== MSCH_CheckedChanged  ========= ");
        console.log( "fldName ", fldName);
        mod_upload_dict.scheme[fldName] = {value: el_input.checked, update: true}
        console.log( "mod_upload_dict ", mod_upload_dict);

// reset other field (in scheme, publicholiday)
        if(["divergentonpublicholiday", "excludepublicholiday"].indexOf(fldName) > -1) {
            // in scheme:  if value of this field is true, set other field false
            if(el_input.checked){
                const other_field_id = (fldName === "divergentonpublicholiday") ? "id_MSCO_excl_ph" : "id_MSCO_also_ph"
                const other_el = document.getElementById(other_field_id)
                if(other_el && other_el.checked){
                    other_el.checked = false;
                    const other_fldName = (fldName === "divergentonpublicholiday") ? "excludepublicholiday" : "divergentonpublicholiday"
                    mod_upload_dict.scheme[other_fldName] = {value: false, update: true}
        }}};

    }; // MSCH_CheckedChanged

//=========  MSO_PublicholidayChanged  ================ PR2020-01-03
    function MSO_PublicholidayChanged(fldName) {
        //console.log( "===== MSO_PublicholidayChanged  ========= ");
        if (fldName === "excludepublicholiday") {
            mod_upload_dict.scheme.excludepublicholiday = {value: el_MSO_excl_ph.checked, update: true}
        } else if (fldName === "divergentonpublicholiday") {
            mod_upload_dict.scheme.divergentonpublicholiday = {value: el_MSO_also_ph.checked, update: true}
        } else if (fldName === "excludecompanyholiday") {
            mod_upload_dict.scheme.excludecompanyholiday = {value: el_MSO_excl_ch.checked, update: true}
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
                    mod_upload_dict.scheme[other_fldName] = {value: false, update: true}
        }}};


    }; // function MSO_PublicholidayChanged

//=========  MSCH_validate_and_disable  ================ PR2020-06-07
    function MSCH_validate_and_disable (el_input) {
        //console.log(" -----  MSCH_validate_and_disable   ---- ")

        let has_error = false;
// ---  show error when scheme code is blank
        const no_code_error = (!!document.getElementById("id_MSCH_input_code").value)
        add_or_remove_class(document.getElementById("id_MSCH_err_code"), cls_hide, no_code_error)
        if(!no_code_error){has_error = true}
// ---  show error when cycle not a number or > 28, can be blank
        const cycle = document.getElementById("id_MSCH_input_cycle").value
        let msg_err_cycle = null;
        if(cycle){
            const arr = get_number_from_input(loc, "cycle", cycle);
            msg_err_cycle = arr[1];
        }
        if(msg_err_cycle){has_error = true}
        const el_msg_cycle = document.getElementById("id_MSCH_msg_cycle")
        add_or_remove_class(el_msg_cycle, "text-danger", (msg_err_cycle))
        el_msg_cycle.innerText = (msg_err_cycle) ? msg_err_cycle : loc.Cycledays_must_be_between;

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
            const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_upload_dict.selected_order_pk)
            const order_code = get_dict_value(order_dict, ["code", "value"]);
            const customer_code = get_dict_value(order_dict, ["customer", "code"]);
            header_text += " " + loc.to + ": " + customer_code + " - " + order_code;
        };
        document.getElementById("id_MSCH_header").innerText = header_text

// ---  disable save button when has_error
        el_MSCH_btn_save.disabled = (has_error);
    }  // MSCH_validate_and_disable

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL ABSENCE +++++++++++++++++++++++++++++++++++++++++++

//=========  ModAbsence_Open  ================  PR2020-05-14
    function MAB_Open(is_addnew, el_input) {
        console.log(" =====  MAB_Open =====")
        console.log(el_input)

        mod_dict = {page: "modabsence",
                    skip_focus_event: false,
                    employee: {},
                    teammember: {},
                    order: {},
                    scheme: {},
                    shift: {},
                    team: {}};
        // when el_input doesn't exist it is a new absence, called by submenu_btn
        // MAB_Save adds 'create' to 'id' when  mod_dict.teammember.pk = null

// ---  get info from tblRow --------------------------------
        const tblRow = get_tablerow_selected(el_input)
        const tblRow_teammember_pk = get_attr_from_el(tblRow, "data-pk");
        const tblRow_employee_pk = get_attr_from_el(tblRow, "data-employee_pk");
        const tblRow_rowIndex = (tblRow) ? tblRow.rowIndex : null;
        const fldName = get_attr_from_el(el_input, "data-field");

// --- get info from data_maps
        // get info from absence_map, not teammember_map
        const absence_dict = get_mapdict_from_datamap_by_tblName_pk(absence_map, "absence", tblRow_teammember_pk)
        mod_dict.teammember = { pk: get_dict_value(absence_dict, ["id", "pk"]),
                                ppk: get_dict_value(absence_dict, ["id", "ppk"]),
                                rowindex: tblRow_rowIndex};
        if(is_addnew) { mod_dict.teammember.create = true} ;
        mod_dict.employee = deepcopy_dict(absence_dict.employee);
        mod_dict.scheme = deepcopy_dict(absence_dict.scheme);
        mod_dict.order = deepcopy_dict(absence_dict.order);
        mod_dict.shift = deepcopy_dict(absence_dict.shift);
        mod_dict.team = deepcopy_dict(absence_dict.team);
        mod_dict.absence_dict = (absence_dict) ? absence_dict : {};
// ---  update selected.teammember_pk
        selected.teammember_pk = (mod_dict.employee.pk) ? mod_dict.employee.pk : null;
        //console.log("selected.teammember_pk", selected.teammember_pk)
        console.log("mod_dict", mod_dict)
// --- when no employee selected: fill select table employee
        // MAB_FillSelectTable("employee") is called in MAB_GotFocus
// ---  put employee_code in header
        const header_text = (selected.teammember_pk) ? loc.Absence + " " + loc.of + " " + mod_dict.employee.code : loc.Absence;
        document.getElementById("id_MAB_hdr_absence").innerText = header_text;
// --- hide input element employee, when employee selected
        show_hide_element_by_id("id_MAB_div_input_employee", !selected.teammember_pk)
// --- hide delete button when no employee selected
        add_or_remove_class(document.getElementById("id_MAB_btn_delete"), cls_hide, !selected.teammember_pk)
// ---  update Inputboxes
        el_MAB_input_employee.value = mod_dict.employee.code;
        el_MAB_input_abscat.value = (mod_dict.order.code) ? mod_dict.order.code : null;
// --- make input_abscat readOnly
        el_MAB_input_abscat.readOnly = (!selected.teammember_pk);

        el_MAB_nosat.checked = (mod_dict.scheme.nohoursonsaturday) ? mod_dict.scheme.nohoursonsaturday : false;
        el_MAB_nosun.checked = (mod_dict.scheme.nohoursonsunday) ? mod_dict.scheme.nohoursonsunday : false;
        el_MAB_noph.checked = (mod_dict.scheme.nohoursonpublicholiday) ? mod_dict.scheme.nohoursonpublicholiday : false;

        MAB_UpdateDatefirstlastInputboxes();
        MOD_UpdateOffsetInputboxes();
        //el_MAB_input_abscat.value =  (mod_dict.employee.pk) ? mod_dict.order.code : null;
        MAB_BtnSaveEnable()
// ---  set focus to input_element, to abscat if not defined
        const el_focus = (is_addnew) ? el_MAB_input_employee :
                    (fldName === "datefirst") ? el_MAB_datefirst :
                    (fldName === "datelast") ? el_MAB_datelast :
                    (fldName === "offsetstart") ? el_MAB_offsetstart :
                    (fldName === "offsetend") ? el_MAB_offsetend :
                    (fldName === "breakduration") ? el_MAB_breakduration :
                    (fldName === "timeduration") ? el_MAB_timeduration : el_MAB_input_abscat;
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
            //upload_dict.id.temp_pk = mod_dict.teammember.temp_pk;
            upload_dict.id.create = true;
        }

        const old_order_pk = get_dict_value(mod_dict, ["absence_dict", "order", "pk"], 0);
        const old_order_ppk = get_dict_value(mod_dict, ["absence_dict", "order", "ppk"], 0);
        const new_order_pk = get_dict_value(mod_dict, ["order", "pk"], 0);
        const new_order_ppk = get_dict_value(mod_dict, ["order", "ppk"], 0);
        const new_order_code = get_dict_value(mod_dict, ["order", "code"]); // just for testing, is not used for update
        if (new_order_pk !== old_order_pk) {upload_dict.order = {pk: new_order_pk, ppk: new_order_ppk, code: mod_dict.order.code, update: true}}

        const old_datefirst = get_dict_value(mod_dict, ["absence_dict", "scheme", "datefirst"]);
        const new_datefirst = get_dict_value(mod_dict, ["scheme", "datefirst"]);
        if (new_datefirst !== old_datefirst) {upload_dict.datefirst = {value: new_datefirst, update: true}}

        const old_datelast = get_dict_value(mod_dict, ["absence_dict", "scheme", "datelast"]);
        const new_datelast = get_dict_value(mod_dict, ["scheme", "datelast"]);
        if (new_datelast !== old_datelast) {upload_dict.datelast = {value: new_datelast, update: true}}

        const old_offsetstart = get_dict_value(mod_dict, ["absence_dict", "shift", "offsetstart"]);
        const new_offsetstart = get_dict_value(mod_dict, ["shift", "offsetstart"]);
        if (new_offsetstart !== old_offsetstart) {upload_dict.offsetstart = {value: new_offsetstart, update: true}}

        const old_offsetend = get_dict_value(mod_dict, ["absence_dict", "shift", "offsetend"]);
        const new_offsetend = get_dict_value(mod_dict, ["shift", "offsetend"]);
        if (new_offsetend !== old_offsetend) {upload_dict.offsetend = {value: new_offsetend, update: true}}

        const old_breakduration = get_dict_value(mod_dict, ["absence_dict", "shift", "breakduration"], 0);
        const new_breakduration = get_dict_value(mod_dict, ["shift", "breakduration"], 0);
        if (new_breakduration !== old_breakduration) {upload_dict.breakduration = {value: new_breakduration, update: true}}

        const old_timeduration = get_dict_value(mod_dict, ["absence_dict", "shift", "timeduration"], 0);
        const new_timeduration = get_dict_value(mod_dict, ["shift", "timeduration"], 0);
        if (new_timeduration !== old_timeduration) {upload_dict.timeduration = {value: new_timeduration, update: true}}

        const old_shift_code = get_dict_value(mod_dict, ["absence_dict", "shift", "code"]);
        const new_shift_code = create_shift_code(loc, mod_dict.shift.offsetstart, mod_dict.shift.offsetend, mod_dict.shift.timeduration);
        if(new_shift_code !== old_shift_code) {upload_dict.shiftcode = {value: new_shift_code, update: true}}

        if(mod_dict.employee.pk) {
            upload_dict.employee = {pk: mod_dict.employee.pk, ppk: mod_dict.employee.ppk, code: mod_dict.employee.code, update: true};
        }

// =========== UploadChanges =====================
        UploadChanges(upload_dict, url_teammember_upload, "MAB_Save");

    }  // MAB_Save

//========= MAB_FillSelectTable  ============= PR2020-05-17
    function MAB_FillSelectTable(tblName, selected_pk) {
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
                const pk_int = get_dict_value (item_dict, ["id", "pk"])
                const ppk_int = get_dict_value (item_dict, ["id", "ppk"])
                const code_value = get_dict_value(item_dict, ["code", "value"], "");
// --- validate if employee can be added to list
                const is_inactive = get_dict_value(item_dict, ["inactive", "value"])
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
                } //  if (pk_int !== selected.teammember_pk){
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
            //console.log( "filter_dict", filter_dict)
// ---  get pk of selected item (when there is only one row in selection)
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (only_one_selected_pk) {
                let selected_order_pk = null;
                // dont skip skip_focus_event when tblName = employee, because abscat selecttable must be filled
                if(tblName !== "employee") {mod_dict.skip_focus_event = true};
                //console.log("only_one_selected_pk:", only_one_selected_pk)
// ---  highlight clicked row
                t_HighlightSelectedTblRowByPk(tblBody_select, only_one_selected_pk)
// ---  put value in input box, put employee_pk in mod_dict, set focus to select_abscatselect_abscat
// ---  put value of only_one_selected_pk in mod_dict and update selected.teammember_pk
                if(tblName === "employee"){
                    selected.teammember_pk = ModDict_SetEmployeeDict(only_one_selected_pk);
    // ---  put code_value in el_input_employee
                    el_MAB_input_employee.value = mod_dict.employee.code;
    // ---  update date input elements
                    MAB_UpdateDatefirstlastInputboxes();
    // ---  put hours in mod_dict.shift.timeduration and el_MAB_timeduration
                if (mod_dict.employee.workminutesperday){
                    mod_dict.shift.timeduration = mod_dict.employee.workminutesperday;
    //console.log( "mod_dict.employee.workminutesperday: ", mod_dict.employee.workminutesperday);
                    const display_text = display_duration (mod_dict.shift.timeduration, loc.user_lang);
    //console.log( "display_text: ", display_text);
                    el_MAB_timeduration.innerText = display_duration (mod_dict.shift.timeduration, loc.user_lang);
    //console.log( "el_MAB_timeduration: ", el_MAB_timeduration);
                }

    // ---  put employee_code in header
                    const header_text = (mod_dict.employee.code) ? loc.Absence + " " + loc.of + " " + mod_dict.employee.code : loc.Absence;
                    document.getElementById("id_MAB_hdr_absence").innerText = header_text
// ---  enable el_shift, set focus to el_shift
                    el_MAB_input_abscat.readOnly = false;
                    set_focus_on_el_with_timeout(el_MAB_input_abscat, 50)

                } else {
                    selected_order_pk = ModDict_SetAbscatDict(only_one_selected_pk);
        console.log("2 el_MAB_input_abscat.value", mod_dict.order.code)
                    el_MAB_input_abscat.value = (mod_dict.order.code) ? mod_dict.order.code : null;
                    set_focus_on_el_with_timeout(el_MAB_btn_save, 50)
                }
                MAB_BtnSaveEnable(selected.teammember_pk && selected_order_pk) // true = is_enable
            }  //  if (!!selected_pk) {
        }
    }  // MAB_InputElementKeyup

//=========  MAB_SelectRowClicked  ================ PR2020-05-15
    function MAB_SelectRowClicked(tblRow, tblName) {
        console.log( "===== MAB_SelectRowClicked ========= ", tblName);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            const selected_pk = get_attr_from_el_str(tblRow, "data-pk");
        console.log( "tblName: ", tblName);
        console.log( "selected_pk: ", selected_pk);

            mod_dict.skip_focus_event = true;
            console.log("MAB_SelectRowClicked set skip_focus_event:", mod_dict.skip_focus_event)
// ---  put value in input box, put employee_pk in mod_dict, set focus to select_abscatselect_abscat
            if (tblName === "employee") {

    // ---  put value of data-pk in mod_dict and update selected.teammember_pk
                selected.teammember_pk = ModDict_SetEmployeeDict(selected_pk);
        console.log( "selected.teammember_pk: ", selected.teammember_pk);
    // ---  put code_value in el_input_employee
        console.log( "mod_dict.employee: ", mod_dict.employee);
                el_MAB_input_employee.value = mod_dict.employee.code

    // ---  put hours in mod_dict.shift.timeduration and el_MAB_timeduration
                if (mod_dict.employee.workminutesperday){
                    mod_dict.shift.timeduration = mod_dict.employee.workminutesperday;
    console.log( "mod_dict.employee.workhoursperday: ", mod_dict.employee.workminutesperday);
                    const display_text = display_duration (mod_dict.shift.timeduration, loc.user_lang);
    console.log( "display_text: ", display_text);
                    el_MAB_timeduration.innerText = display_duration (mod_dict.shift.timeduration, loc.user_lang);
    console.log( "el_MAB_timeduration: ", el_MAB_timeduration);
                }
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

    // ---  put value of data-pk in mod_dict and update selected.teammember_pk
                const selected_order_pk = ModDict_SetAbscatDict(selected_pk);
        console.log( "selected.teammember_pk: ", selected.teammember_pk);
                console.log( "mod_dict: ", mod_dict);

    // ---  put code_value in el_input_employee
        console.log("MAB_SelectRowClicked el_MAB_input_abscat.value", mod_dict.order.code)
                el_MAB_input_abscat.value =  (mod_dict.order.code) ? mod_dict.order.code : null;
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
        console.log("MAB_GotFocus el_MAB_input_abscat.value null ")
                el_MAB_input_abscat.value = null
                // reset select table when input order got focus
                MAB_FillSelectTable(tblName);
            } else if (tblName === "order") {
                el_MAB_input_abscat.value =  (mod_dict.order.code) ? mod_dict.order.code : null;
                MAB_FillSelectTable(tblName, mod_dict.order.pk);
            }
        }
    }  // MAB_GotFocus

//========= ModDict_SetEmployeeDict  ============= PR2020-05-17
    function ModDict_SetEmployeeDict(data_pk){
        //console.log( "=== ModDict_SetEmployeeDict ===");
        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", data_pk)
        const employee_pk = get_dict_value(employee_dict, ["id", "pk"])

        mod_dict.employee = {
            pk: employee_pk,
            ppk: get_dict_value(employee_dict, ["id", "ppk"]),
            code: get_dict_value(employee_dict, ["code", "value"]),
            datefirst: get_dict_value(employee_dict, ["datefirst", "value"]),
            datelast: get_dict_value(employee_dict, ["datelast", "value"]),
            workminutesperday: get_dict_value(employee_dict, ["workminutesperday", "value"])
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

//=========  MAB_UpdateDatefirstlastInputboxes  ================ PR2020-05-17
    function MAB_UpdateDatefirstlastInputboxes(){
        console.log( " --- MAB_UpdateDatefirstlastInputboxes --- ");
        // absence datefirst / datelast are stored in scheme.datefirst / datelast
        const employee_datefirst = get_dict_value(mod_dict, ["employee", "datefirst"]);
        const employee_datelast = get_dict_value(mod_dict, ["employee", "datelast"]);

        console.log( "employee_datefirst", employee_datefirst);
        console.log( "employee_datelast", employee_datelast);
        el_MAB_datefirst.value = mod_dict.scheme.datefirst;
        el_MAB_datelast.value = mod_dict.scheme.datelast;
        const oneday_only = false;
        cal_SetDatefirstlastMinMax(el_MAB_datefirst, el_MAB_datelast, oneday_only, employee_datefirst, employee_datelast);

        el_MAB_datelast.readOnly = el_MAB_oneday.checked;
    }  // MAB_UpdateDatefirstlastInputboxes

//========= MAB_DateFirstLastChanged  ============= PR2020-06-01
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
        cal_SetDatefirstlastMinMax(el_MAB_datefirst, el_MAB_datelast, mod_dict.scheme.oneday,
                    mod_dict.employee.datefirst, mod_dict.employee.datelast)
        //MAB_UpdateDatefirstlastInputboxes();
    }  // MAB_DateFirstLastChanged


//=========  MAB_TimepickerOpen  ================ PR2020-03-21
    function MAB_TimepickerOpen(el_input, calledby) {
        console.log("=== MAB_TimepickerOpen ===", calledby);

        console.log("mod_MGS_dict", mod_MGS_dict);

// ---  create tp_dict
        const fldName = get_attr_from_el(el_input, "data-field");
        const rosterdate = null; // keep rosterdate = null, to show 'current day' insteaa of Dec 1
        const offset = get_dict_value(mod_MGS_dict.shift, [fldName, "value"])
        const minoffset = get_dict_value(mod_MGS_dict.shift, [fldName, "minoffset"])
        const maxoffset = get_dict_value(mod_MGS_dict.shift, [fldName, "maxoffset"])
        const is_ampm = (loc.timeformat === "AmPm")

        let tp_dict = { field: fldName,
                        page: "TODO",
                        // id: id_dict,
                        //mod: calledby,
                        rosterdate: rosterdate,
                        offset: offset,
                        minoffset: minoffset,
                        maxoffset: maxoffset,
                        isampm: is_ampm,
                        quicksave: quicksave
                       };
        //if(!!weekday){tp_dict['weekday'] = weekday}
// ---  create st_dict
        const show_btn_delete = true;
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
                const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ? loc.Working_hours : null;
        let st_dict = { interval: loc.interval, comp_timezone: loc.comp_timezone, user_lang: loc.user_lang,
                        weekday_list: loc.weekdays_abbrev, month_list: loc.months_abbrev,
                        url_settings_upload: url_settings_upload,
                        text_curday: loc.Current_day, text_prevday: loc.Previous_day, text_nextday: loc.Next_day,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete
                        };
        console.log("st_dict", st_dict);
        ModTimepickerOpen(el_input, MAB_TimepickerResponse, tp_dict, st_dict)
    };  // MAB_TimepickerOpen

//=========  MAB_TimepickerResponse  ================
    function MAB_TimepickerResponse(tp_dict){
        console.log( " === MAB_TimepickerResponse ");
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
       // const lookup_shift = MSE_lookup_same_shift(mod_dict.shift.offsetstart,
       //                                             mod_dict.shift.offsetend,
       //                                             mod_dict.shift.breakduration,
       //                                             mod_dict.shift.timeduration);
       // const lookup_shift_pk = lookup_shift.pk
       // const current_shift_pk = mod_dict.shift.pk
       // const shift_has_changed = (lookup_shift_pk !== current_shift_pk)
       // console.log( "current_shift_pk: ", current_shift_pk);
       // console.log( "lookup_shift.pk: ", lookup_shift.pk);
       // console.log( "shift_has_changed: ", shift_has_changed);

        // if same shift found: put info from lookup_shift in mod_dict
//(!!lookup_shift_pk){
            // same shift found: put info in mod_dict
           //>>>  mod_dict.shift.pk = lookup_shift.pk;
            // mod_dict.shift.ppk stays the same
      //      mod_dict.shift.code = lookup_shift.code;
      //      mod_dict.shift.offsetstart = lookup_shift.offsetstart;
      //      mod_dict.shift.offsetend = lookup_shift.offsetend;
      //      mod_dict.shift.breakduration = lookup_shift.breakduration;
      //      mod_dict.shift.timeduration = lookup_shift.timeduration;
      //  } else{
            // no same shift found: put info as new shift in mod_dict
            id_new += 1;
            //>>> mod_dict.shift.pk = "new" + id_new.toString()
            // mod_dict.shift.ppk stays the same
            mod_dict.shift.code = create_shift_code(loc,
                                                    mod_dict.shift.offsetstart,
                                                    mod_dict.shift.offsetend,
                                                    mod_dict.shift.timeduration,
                                                    mod_dict.shift.code);
      //  }

        const is_absence = (get_dict_value(mod_dict, ["shiftoption"]) === "isabsence");
        MSO_MSE_CalcMinMaxOffset(mod_dict.shift, is_absence)
        // if is_absence: also change shift_pk in schemeitems (is only oneschemeitem: cycle = 1
        if (is_absence && shift_has_changed ){
        }
        MOD_UpdateOffsetInputboxes();

    } // MAB_TimepickerResponse


//========= MAB_nosatsunphChanged  ============= PR2020-06-01
    function MAB_nosatsunphChanged(el_input){
        //console.log( "=== MAB_nosatsunphChanged ===");
        const fldName = get_attr_from_el(el_input, "data-field")
        mod_dict.scheme[fldName] = el_input.checked
    }  // MAB_nosatsunphChanged


//=========  MAB_BtnSaveEnable  ================ PR2020-05-15
    function MAB_BtnSaveEnable(){
        //console.log( " --- MAB_BtnSaveEnable --- ");
// --- enable save button
        const btn_save_enabled = (mod_dict.employee.pk && mod_dict.order.pk)
        el_MAB_btn_save.disabled = !btn_save_enabled;
    }  // MAB_BtnSaveEnable

//========= MOD_UpdateOffsetInputboxes  ============= PR2020-05-17

//========= MOD_UpdateOffsetInputboxes  ============= PR2020-05-17
    function MOD_UpdateOffsetInputboxes(pgeName) {
        console.log( " ----- MOD_UpdateOffsetInputboxes ----- ");
        //console.log( "mod_dict.page: ", mod_dict.page);
        //console.log( "mod_dict.shift: ", mod_dict.shift);
        const el_offsetstart = (mod_dict.page === "modabsence") ? el_MAB_offsetstart : el_modshift_offsetstart;
        const el_offsetend = (mod_dict.page === "modabsence") ? el_MAB_offsetend : el_modshift_offsetend;
        const el_breakduration = (mod_dict.page === "modabsence") ? el_MAB_breakduration : el_modshift_breakduration;
        const el_timeduration = (mod_dict.page === "modabsence") ? el_MAB_timeduration : el_modshift_timeduration;
        //display_offset_time (offset, timeformat, user_lang, skip_prefix_suffix, blank_when_zero)
        el_offsetstart.innerText = display_offset_time ({timeformat: loc.timeformat, user_lang: loc.user_lang}, mod_dict.shift.offsetstart, false, false)
        el_offsetend.innerText = display_offset_time ({timeformat: loc.timeformat, user_lang: loc.user_lang}, mod_dict.shift.offsetend, false, false)
        el_breakduration.innerText = display_duration (mod_dict.shift.breakduration, loc.user_lang)
        el_timeduration.innerText =  display_duration (mod_dict.shift.timeduration, loc.user_lang)


    }  // MOD_UpdateOffsetInputboxes


// +++++++++++++++++ MODAL COPYFROM TEMPLATE  +++++++++++++++++++++++++++++++

//========= ModCopyfromTemplateOpen======= PR2020-05-31
    function ModCopyTemplateOpen () {
        if(is_template_mode){
            ModCopyfromTemplateOpen ();
        } else {
            ModCopytoTemplateOpen ();
        }
    }
//========= ModCopyfromTemplateOpen====================================
    function ModCopyfromTemplateOpen () {
        console.log("===  ModCopyfromTemplateOpen  =====") ;

        // disable btn when templates are shown
        if(!is_template_mode) {
            if(!!selected.order_pk && selected.customer_pk) {
                mod_upload_dict = {copyto_order_pk: selected.order_pk, copyto_order_ppk: selected.customer_pk};
            // reset input elements
                //el_mod_copyfrom_template_select.value = null
                //let el_err = document.getElementById("id_mod_copyfrom_template_select_err");
                //formcontrol_err_msg(el_mod_copyfrom_template_select, el_err)

                //let el_err = document.getElementById("id_mod_copyfrom_customer_err");
                //formcontrol_err_msg(el_mod_copyfrom_cust, el_err)

                //el_err = document.getElementById("id_mod_copyfrom_order_err");
                //formcontrol_err_msg(el_mod_copyfrom_order, el_err)

                el_mod_copyfrom_code.value = null
                //el_err = document.getElementById("id_mod_copyfrom_code_err");
                //formcontrol_err_msg(el_mod_copyfrom_code, el_err)

                //el_mod_copyfrom_datestart.value = null
                //el_err = document.getElementById("id_mod_copyfrom_datestart_err");
                //formcontrol_err_msg(el_mod_copyfrom_datestart, el_err)

            // get ppk from scheme template ( = order 'Sjabloon')
                let template_scheme_ppk = null;

                SBR_FillSelectTable("template", "ModCopyfromTemplateOpen", false)

                  // selected.order_pk is the order to which de template scheme will be copied.
            // cannot copy if selected.order_pk is blank
                document.getElementById("id_mod_copyfrom_btn_save").readOnly = (!selected.order_pk)

            // ---  show modal
                $("#id_mod_copyfrom").modal({backdrop: true});

            }  //  if(!!selected.order_pk && selected.customer_pk) {
        }
}; // function ModCopyfromTemplateOpen

//=========  ModCopyfromSelect  ================ PR2019-11-22
    function ModCopyfromSelect(tr_clicked) {
        console.log( "===== ModCopyfromSelect ========= ", tr_clicked);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.remove("tsa_bc_transparent")
            tr_clicked.classList.add(cls_selected)

    // add pk_int to mod_upload_dict
            const map_id = get_attr_from_el(tr_clicked, "data-map_id");
            const item_dict = scheme_map.get(map_id);
            const pk_int = get_dict_value(item_dict, ["id", "pk"])
            const ppk_int = get_dict_value(item_dict, ["id", "ppk"])
            const code = get_dict_value(item_dict, ["code", "value"])
            //console.log( "item_dict", item_dict);

            const template_txt = " " + loc.Template.toLowerCase();
            let code_txt = code.replace(template_txt,"");
            document.getElementById("id_mod_copyfrom_code").value = code_txt

            mod_upload_dict["template_pk"] = pk_int;
            mod_upload_dict["template_ppk"] = ppk_int;

            // Set focus to el_mod_copyfrom_code
        //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){
                document.getElementById("id_mod_copyfrom_code").focus()
            }, 500);

        }
    }  // ModCopyfromSelect


//=========  ModCopyfromTemplateEdit  ================ PR2019-07-20
    function ModCopyfromTemplateEdit(mode) {
        console.log("=========  ModCopyfromTemplateEdit ========= mode:", mode);

        //let dict, el_err, msg_err, new_scheme_code;
        //let err_template = false, err_customer = false, err_order = false, err_code = false;
        // TODO validation

        const has_err = false //(err_template || err_customer || err_order || err_code);
        //el_mod_copyfrom_btn_save.disabled = has_err;

        return has_err

    }  // ModCopyfromTemplateEdit

//=========  ModCopyfromTemplateSave  ================ PR2019-07-24
    function ModCopyfromTemplateSave() {
        console.log("=========  ModCopyfromTemplateSave =========");

        console.log("mod_upload_dict", mod_upload_dict)
        const dict = {"id":
                        {"pk": mod_upload_dict["template_pk"],
                         "ppk": mod_upload_dict["template_ppk"],
                          "istemplate": true, "table": "scheme", "mode": "copyfrom"},
                     "copyto_order": {"pk": mod_upload_dict["copyto_order_pk"],
                                      "ppk": mod_upload_dict["copyto_order_ppk"]}
                     }

        let newscheme_code = document.getElementById("id_mod_copyfrom_code").value;
        if (!!newscheme_code){
            dict["code"] = {"value": newscheme_code, "update": true}
        }
        const upload_dict = {"copyfromtemplate": dict};

        $("#id_mod_copyfrom").modal("hide");

        UploadTemplate(upload_dict)

    }  // ModCopyfromTemplateSave

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
   // const dict = validate_select_blank(el_mod_copyfrom_order, el_err, msg_blank, true) // true = skip first option (Select template...)
    //console.log(dict)
    //return dict
 }

 function ModTemplateCopyfromValidateSchemeCode(){
    let el_err = document.getElementById("id_mod_copyfrom_code_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_code");
    const msg_exists = get_attr_from_el(el_data, "data-err_msg_name_exists");
    // TODO correct
    const err_schemecode = validate_input_code(el_mod_copyfrom_code, el_err, scheme_map, msg_blank, msg_exists)
    // TODO correct
    return validate_input_code(el_mod_copyfrom_code, el_err, scheme_map, msg_blank, msg_exists)
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

//========= ModalTemplateCopyfrom====================================
    function ModalTemplateCopyfrom () {
        console.log("===  ModalTemplateCopyfrom  =====") ;
        let has_error = false;

        //let return_dict = ModCopyfromTemplateValidateBlank()
        //const template_code = return_dict["code"];
        //const err_template = return_dict["error"];
        //el_mod_copyfrom_code.value = template_code;

        //return_dict = ModTemplateCopyfromValidateCustomerBlank()
        //const err_customer = return_dict["error"];

        //return_dict = ModTemplateCopyfromValidateOrderBlank()
        //const err_order = return_dict["error"];

       // return_dict = ModTemplateCopyfromValidateSchemeCode();
        //const new_code = return_dict["code"];
        //const err_code = return_dict["error"];

        // = (err_template || err_customer || err_order || err_code);
        //el_mod_copyfrom_btn_save.disabled = has_error

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

            const dict ={"id": {"pk": template_pk, "ppk": template_ppk, "table": "template_scheme"}}
            if (!!template_code){
                dict["code"] = {"value": template_code, "update": true}
                dict["order"] = {"pk": selected.order_pk}
            }
            let parameters = {"copyfromtemplate": JSON.stringify (dict)};
            //console.log("parameters");
            //console.log(parameters);

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
                        get_datamap(response["scheme_list"], scheme_map)
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
        let mod_upload_dict = {copytotemplate: dict};

        $("#id_mod_copyto").modal("hide");

        UploadTemplate(mod_upload_dict)

    }  // ModalCopytoTemplateSave

//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        console.log("===  HandlePopupDateOpen  =====") ;
        // popupdate only used in si-rosterdate and datfirst datelast of teammember

        let el_popup_date = document.getElementById("id_popup_date")
// ---  reset textbox 'date'
        el_popup_date.value = null
// ---  get tr_selected
        let tr_selected = get_tablerow_selected(el_input)
        const tr_selected_id = get_attr_from_el(tr_selected, "id");
// ---  get info pk etc from tr_selected if called by tablerow
        let el;
        if (!!tr_selected){ el = tr_selected } else {el = el_input}
        const data_table = get_attr_from_el(el, "data-table")
        const data_pk = get_attr_from_el(el, "data-pk")
        const data_ppk = get_attr_from_el(el, "data-ppk");

        if(!el_input.readOnly) {
// ---  get values from el_input
            // tr_id is stored in el_popup_date and used in HandlePopupDateSave
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");
// ---  put values in el_popup_date
            el_popup_date.setAttribute("data-tr_id", tr_selected_id);
            el_popup_date.setAttribute("data-table", data_table);
            el_popup_date.setAttribute("data-pk", data_pk);
            el_popup_date.setAttribute("data-ppk", data_ppk);

            el_popup_date.setAttribute("data-field", data_field);
            el_popup_date.setAttribute("data-value", data_value);

            if (!!data_mindate) {el_popup_date.setAttribute("min", data_mindate);
            } else {el_popup_date.removeAttribute("min")}
            if (!!data_maxdate) {el_popup_date.setAttribute("max", data_maxdate);
            } else {el_popup_date.removeAttribute("max")}

            if (!!data_value){el_popup_date.value = data_value};

// ---  position popup under el_input
            let el_popup_date_container = el_popup_date.parentNode
            let popRect = el_popup_date_container.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();

            const pop_width = 220; // to center popup under input box
            const correction_left = -120 - pop_width/2 ; // -240 because of sidebar
            const correction_top = -32; // -32 because of menubar

            let topPos = inpRect.top + inpRect.height + correction_top;
            let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;

            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_popup_date_container.setAttribute("style", msgAttr)
// ---  change background of el_input
            popupbox_removebackground();
            //el_input.classList.add("pop_background");
// ---  show el_popup
            el_popup_date_container.classList.remove(cls_hide);
        }  // if(!el_input.readOnly)
}; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-07-19
    function HandlePopupDateSave(el_popup_date) {
        console.log("===  HandlePopupDateSave =========");
        // popupdate only used in si-rosterdate and datfirst datelast of teammember

// ---  get pk_str from id of el_popup
        // tr_id is stored in el_popup_date in HandlePopupDateOpen
        const tr_id = el_popup_date.getAttribute("data-tr_id")  // id  of element clicked
        const pk_str = el_popup_date.getAttribute("data-pk")// pk of record  of element clicked
        const ppk_int = parseInt(el_popup_date.getAttribute("data-ppk"));
        const fieldname = el_popup_date.getAttribute("data-field");
        const tblName = el_popup_date.getAttribute("data-table");

        if(!!pk_str && !! ppk_int){

            let tr_changed = document.getElementById(tr_id)
            let cell_shift = tr_changed.cells[1].children[0];
            const has_shift = (!!cell_shift && !!Number(cell_shift.value))

            let upload_dict = {};
            let id_dict = {}
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
            id_dict["ppk"] = ppk_int
            id_dict["table"] = tblName

            if (!isEmpty(id_dict)){
                upload_dict["id"] = id_dict
            };

// ---  hide el_popup_date
            popupbox_removebackground();
            //el_popup_date_container.classList.add(cls_hide);
            el_popup_date.parentNode.classList.add(cls_hide);

// ---  get n_value and o_value from el_popup_date
            const n_value = el_popup_date.value
            const o_value = el_popup_date.getAttribute("data-value") // value of element clicked "-1;17;45"
            //const o_value = el_popup_date.getAttribute("data-value") // value of element clicked "-1;17;45"
            //console.log ("fieldname: ", fieldname, "n_value: ",n_value , "o_value: ",o_value );

// create new_dhm string
            if (n_value !== o_value) {
                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {}
                if(!!n_value){field_dict["value"] = n_value};
                field_dict["update"] = true

// put new value in inputbox before new value is back from server
                let el_input;
                if (tblName === "schemeitem"){
                    el_input = tr_changed.cells[0].children[0];
                } else if (tblName === "teammember") {
                    if (fieldname === "datefirst"){
                        el_input = tr_changed.cells[1].children[0];
                    } else if (fieldname === "datelast"){
                        el_input = tr_changed.cells[2].children[0];
                    }
                }
                const hide_weekday = false;
                const hide_year = (tblName === "schemeitem") ? true : false;
                format_date_elementMOMENT (el_input, el_msg, field_dict, loc.months_abbrev, loc.weekdays_abbrev,
                                    loc.user_lang, loc.comp_timezone, hide_weekday, hide_year)

// ---  add field_dict to item_dict
                if (!isEmpty(field_dict)){upload_dict[fieldname] = field_dict};
                console.log ("upload_dict: ", upload_dict);
                if(tblName === "schemeitem" && !has_shift){
                    // dont upload date of schemeitem, when there is no shift also shift PR2020-03-15
                } else {
                    let parameters = {}, url_str = null;
                    if (tblName === "teammember") {
                        url_str = url_teammember_upload;
                        parameters = {"upload": JSON.stringify (upload_dict)}
                    } else if (tblName === "schemeitem") {
                        url_str =url_schemeitem_upload
                        // schemeitem accept only list of upload_dicts
                        const upload_list = [upload_dict];
                        parameters = {"upload": JSON.stringify (upload_list)}
                    } else {
                        url_str =url_scheme_shift_team_upload
                        parameters = {"upload": JSON.stringify (upload_dict)}
                    }
                    console.log("url_str:", url_str);
                    console.log ("upload_dict", upload_dict);

                    let response;
                    $.ajax({
                        type: "POST",
                        url: url_str,
                        data: parameters,
                        dataType:'json',
                        success: function (response) {
                            console.log (">>> response", response);
                            if ("scheme_update" in response) {
                                UpdateFromResponse(response["scheme_update"]);
                            }
                            if ("schemeitem_list" in response) {
                                get_datamap(response["schemeitem_list"], schemeitem_map)
                                //FillTableRows("schemeitem")
                            }
                            if ("team_list" in response){
                                get_datamap(response["team_list"], team_map)
                                //SBR_FillSelectTable("team", "HandlePopupDateSave", selected.team_pk, true)
                            }
                            if ("teammember_update" in response){
                                UpdateFromResponse(response["teammember_update"]);
                            };
                            //if ("schemeitem_update" in response){
                            //    UpdateFromResponse(response["schemeitem_update"]);
                            //};
                        },
                        error: function (xhr, msg) {
                            console.log(msg + '\n' + xhr.responseText);
                            alert(msg + '\n' + xhr.responseText);
                        }
                    });
                }  //  if(tblName === "teammember")
            }  //if (n_value !== o_value) {
        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//=========  GetNewRosterdate  ================ PR2019-04-14
    function GetNewRosterdate(o_date, add_day, add_month, add_year) {
        console.log("---  function GetNewRosterdate ---");

// change o_date to next/previous day, month (year), or get Today if add_day=0, add_month=0 and add_year=0.
        let n_date = get_newdate_from_date(o_date, add_day, add_month, add_year)

// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        let n_weekday = n_date.getDay();
        if(n_weekday === 0){n_weekday = 7} // in ISO, weekday of Sunday is 7, not 0
        const new_wdy = loc.weekdays_abbrev[n_weekday] + ' ' + n_day + ' ' + loc.months_abbrev[n_month_index + 1] + ' ' + n_year


// put new_wdy in el_popup_wdy_rosterdate
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")
        el_popup_wdy_rosterdate.value = new_wdy

// change n_date to format "2019-05-06"
        const n_date_iso = n_date.toISOString();
        const n_date_yyymmdd = get_yyyymmdd_from_ISOstring(n_date_iso)

        //console.log("n_date_yyymmdd: ", n_date_yyymmdd, typeof n_date_yyymmdd)

// put n_date_yyymmdd in attr. data-value
        el_popup_wdy.setAttribute("data-value", n_date_yyymmdd)

}

//=========  HandlePopupWdmySave  ================ PR2019-04-14
    function HandlePopupWdySave() {
        console.log("===  function HandlePopupWdySave =========");

        popupbox_removebackground();
        el_popup_wdy.classList.add(cls_hide);

        const field_id = el_popup_wdy.getAttribute("data-field_id") // value of element clicked "-1;17;45"
        let el_input = document.getElementById(field_id)

        const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
        console.log ("n_value: ",n_value );

        if(!!n_value){
            el_input.setAttribute("data-value", n_value)
        } else {
            el_input.removeAttribute("data-value")
        }
// TODO correct
        UploadChanges(el_input)
    }  // HandlePopupWdySave

//=========  HighlightSelectShiftTeam  ================ PR2019-08-25
    function HighlightSelectShiftTeam(tblName, tr_selected) {
        //console.log( " --- HighlightSelectShiftTeam ---");

// ---  remove highlights from sidebar_tblBody_scheme
        ChangeBackgroundRows(sidebar_tblBody_scheme, cls_bc_yellow_lightlight, cls_bc_lightlightgrey);

// ---  remove highlights from other select table
        let tblBody_other = (tblName === "shift") ? sidebar_tblBody_team : sidebar_tblBody_shift;
        ChangeBackgroundRows(tblBody_other, cls_bc_yellow_lightlight, cls_bc_lightlightgrey);

// ---  make background of this tblBody light yellow
        let tblBody_this = (tblName === "shift") ? sidebar_tblBody_shift : sidebar_tblBody_team;
        ChangeBackgroundRows(tblBody_this, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)

        if (!!tr_selected){
// ---  highlight clicked row
            tr_selected.classList.remove(cls_bc_yellow_lightlight)
            tr_selected.classList.add(cls_bc_yellow)
        }
    }  // HighlightSelectShiftTeam

//========= function pop_background_remove  ====================================
    function popupbox_removebackground(class_name){
        // remove selected color from all input popups
        if(!class_name){class_name = ".pop_background"}
        let elements = document.getElementsByClassName(class_name);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

//========= ShowButtonsTableSchemeitem  ====================================
    function ShowButtonsTableSchemeitem(is_show){
    // btns
        let el_btns_schemeitem = document.getElementById("id_btns_schemeitem")
        if (is_show){
            el_btns_schemeitem.classList.remove(cls_hide);
        } else {
            el_btns_schemeitem.classList.add(cls_hide);
        }
    }

//###########################################################################
// ++++++++++++  TIMEPICKER +++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleTimepickerOpen  ====================================
    function HandleTimepickerOpen(el_input) {
        console.log("===  HandleTimepickerOpen  =====");

        let tr_selected = get_tablerow_selected(el_input);
        HandleTableRowClicked(tr_selected);

        const shift_dict = get_itemdict_from_datamap_by_el(el_input, shift_map);
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
                            quicksave: quicksave
                          };

            console.log("tp_dict", tp_dict);


// ---  create st_dict
            const show_btn_delete = true;
            const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
                    const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ? loc.Working_hours : null
            let st_dict = { interval: loc.interval, comp_timezone: loc.comp_timezone, user_lang: loc.user_lang,
                            weekday_list: loc.weekdays_abbrev, month_list: loc.months_abbrev,
                            url_settings_upload: url_settings_upload,
                            text_curday: loc.Current_day, text_prevday: loc.Previous_day, text_nextday: loc.Next_day,
                            txt_dateheader: txt_dateheader, txt_title_btndelete: loc.Remove_time,
                            txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                            show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete
                            };
            console.log("st_dict", st_dict);

            ModTimepickerOpen(el_input, UploadTimepickerChanged, tp_dict, st_dict)

        }  //  if(!!pk_int)

    }; // function HandleTimepickerOpen

//###########################################################################
// +++++++++++++++++ FILTER +++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        //console.log( "===== HandleFilterName  ========= ");

        //console.log( "el.value", el.value, index, typeof index);
        //console.log( "el.filter_dict", filter_dict, typeof filter_dict);
        // skip filter if filter value has not changed, update variable filter_text

        //console.log( "el_key", el_key);

// --- reset filter when clicked on 'Escape'
        let skip_filter = false
        if (el_key === 27) {
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
            f_reset_tblHead_filter(tblHead_datatable);

//--- reset filter of select table
            //f_reset_tblSelect_filter ("id_filter_select_input", "id_filter_select_btn", imgsrc_inactive_lightgrey)

           // t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)
            //t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

// --- save selected_customer_pk in Usersettings
            //const setting_dict = {"selected_pk": { "sel_customer_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
            //UploadSettings (setting_dict, url_settings_upload)

//--- reset highlighted
            // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
            //if(tblName === "customer"){
            //    ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
           // } else if(tblName === "order"){
           //     ChangeBackgroundRows(tblBody_select_customer, cls_bc_lightlightgrey);
           //     ChangeBackgroundRows(tblBody_select_order, cls_bc_lightlightgrey);

           // }

           // UpdateHeaderText();
            // reset customer name and pk in addnew row of tBody_order
            //if(tblName === "order"){
                //UpdateAddnewRow_Order();
            //}
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
            const tblRow = document.getElementById(selected.tblRow_id)
                if(tblRow){
                    const is_addnew = get_attr_from_el(tblRow, "data-is_addnew");
                    MAB_Open(is_addnew, tblRow);
                }
            }
        }

    }  // HandleEventKey

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_dict", setting_dict)
        // only called at opening of page

        let key = "selected_pk";
        if (key in setting_dict){
            const sel_dict = setting_dict[key];
            // these variables store pk of customer / order from setting.
            // They are used in HandleSelectCustomer to go to saved customer / order
            // field type is integer
            settings.order_pk = get_dict_value(sel_dict, ["sel_order_pk"], 0);
            settings.scheme_pk = get_dict_value(sel_dict, ["sel_scheme_pk"], 0);

            // selected.customer_pk can also contain pk of template customer,
            // settings.customer_pk only contains normal customers
            selected.customer_pk = settings.customer_pk;
            selected.order_pk = settings.order_pk;
            selected.scheme_pk = settings.scheme_pk;

            //console.log("settings", settings)
            //console.log("selected", selected)
        }
        key = "quicksave";
        if (key in setting_dict){
            quicksave = setting_dict[key];
        }
        key = "page_scheme";
        if (key in setting_dict){
            selected_btn = get_dict_value(setting_dict, [key, "btn"], "btn_grid")
        }
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
            if(code){
                if(!is_template_mode && !!header_text) {header_text += "  -  "};
                header_text +=  code;
            }
            if(cycle){
                hdr_right_text = cycle.toString() + "-" + loc.days_cycle;
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
    function update_map_item_local(tblName, map_id, update_dict, is_created, is_deleted){  // PR2019-12-01 PR2020-05-31
        console.log(" --- update_map_item_local ---")
        console.log("tblName", tblName)
        console.log("map_id", map_id)
        console.log("update_dict: ", update_dict)
        // called by UpdateFromResponse, Grid_UpdateFromResponse_si, Grid_UpdateFromResponse_tm
        // 'deleted' and 'created' are already removed by remove_err_del_cre_updated__from_itemdict, therefore use parameters
        if(!!tblName && !!map_id && !isEmpty(update_dict)){

// ---  get is_created and is_deleted from update_dict
            //console.log("is_created: " + is_created)
            //console.log("is_deleted: " + is_deleted)

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
            } else if(is_created){
// ---  insert new item in alphabetical order, but no solution found yet
                // alphabetical order not necessary, will be done when inserting rows in table
                data_map.set(map_id, update_dict)
            } else if(!!data_map.size){
            console.log("update: " + map_id)
                data_map.set(map_id, update_dict)
            }
            console.log("data_map.size after: " + data_map.size)
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id )
            console.log("map_dict after: " , map_dict)

        }  // if(!isEmpty(id_dict))
    }  // update_map_item_local

//========= GetDatetimeLocal  ====================================
  //  function GetDatetimeLocalXXX(data_datetime, loc.comp_timezone) {
        // PR2019-07-07
        //let datetime_local;
        //if (!!data_datetime && !!loc.comp_timezone) {
        //    datetime_local = moment.tz(data_datetime, loc.comp_timezone)
        //};
       // return datetime_local;
 //   }  // GetDatetimeLocal

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

//========= Grid_FillGrid  ====================================
    function Grid_FillGrid(scheme_dict, calledby) {
        console.log(" === Grid_FillGrid ===", calledby) // PR2020-03-13
        console.log("scheme_dict: ", deepcopy_dict(scheme_dict)) // PR2020-03-13

// ---  reset grid_table_dict
        grid_table_dict = {}

// ---  get value from scheme_dict
        const scheme_pk = get_dict_value(scheme_dict, ["id", "pk"]);
        const scheme_code = get_dict_value(scheme_dict, ["code", "value"]);
        const cycle = get_dict_value(scheme_dict, ["cycle", "value"]);
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
                display_text = (value) ? value.toString() + "-" + loc.days_cycle : loc.Cycle + "..."
            } else if(fldName === "datefirstlast") {
                const datefirst_iso = get_dict_value(scheme_dict, ["datefirst", "value"]);
                const datelast_iso = get_dict_value(scheme_dict, ["datelast", "value"]);
                is_updated = ( get_dict_value(scheme_dict, ["datefirst", "updated"], false) ||
                               get_dict_value(scheme_dict, ["datelast", "updated"], false) );
                let prefix = loc.Period + ": ";
                if(datefirst_iso && datelast_iso) {
                    display_text = get_periodtext_sidebar(datefirst_iso, datelast_iso,
                            prefix, null, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
                } else if(datefirst_iso) {
                    prefix += loc.As_of_abbrev.toLowerCase()
                    display_text = get_periodtext_sidebar(datefirst_iso, datelast_iso,
                            prefix, null, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
                } else if(datelast_iso) {
                    prefix += loc.Through.toLowerCase()
                    display_text = get_periodtext_sidebar(datefirst_iso, datelast_iso,
                            prefix, null, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
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
            if(is_updated){ShowOkElement(el, "border_bg_valid", cur_class)};
        };

// ---  put scheme values in scheme section
        if(!isEmpty(scheme_dict)){

// ---  put scheme in grid_table_dict
            grid_table_dict.scheme = {
                    pk: scheme_pk,
                    code: scheme_code,
                    cycle: cycle,
                    datefirst: datefirst_iso,
                    datelast: datelast_iso,
                    exph: excl_ph,
                    exch: excl_ch,
                    dvg_onph: dvg_onph};


            Grid_CreateTblTeams(scheme_pk);
            Grid_CreateTblShifts(scheme_pk);

        }  //if(!isEmpty(scheme_dict))
    }  // Grid_FillGrid

//=========  Grid_CreateTblTeams  === PR2020-03-13
    function Grid_CreateTblTeams(scheme_pk) {
        console.log("===  Grid_CreateTblTeams == ");
        // called by Grid_FillGrid, Grid_UpdateFromResponse_team, Grid_UpdateFromResponse_tm
        // functions also fills grid_teams_dict

        let tblBody = document.getElementById("id_grid_tbody_team");
        tblBody.innerText = null

        grid_teams_dict = {};

/*  structure of  grid_teams_dict:  {team_pk: { id: {col:, row_id:, code:, abbrev:}, tm_pk: {row:, row_id:, display:}, ..}
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

// +++  loop through team_map and add column for each team
        let col_index = 0, colindex_createdcol = -1;
        if (!!scheme_pk){
            for (const [map_id, team_dict] of team_map.entries()) {
                const ppk_int = get_dict_value(team_dict, ["id", "ppk"], 0);
        //console.log("team_dict", team_dict);
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict
                if (!!ppk_int && scheme_pk === ppk_int) {
                    const pk_int = get_dict_value(team_dict, ["id", "pk"], 0);
                    if(!!pk_int){
// ---  get abbrev of team_code
                        const team_code = get_dict_value(team_dict, ["code", "value"], "");
                        const abbrev = get_dict_value(team_dict, ["code", "abbrev"], "");
                        const is_created = get_dict_value(team_dict, ["id", "created"],false);
                        if(is_created){colindex_createdcol = col_index}
                        const row_id ="team_" + pk_int.toString();
// ---  add info to grid_teams_dict
                        grid_teams_dict[pk_int] = {id: {col: col_index, row_id: row_id, code: team_code, abbrev: abbrev}};
                        col_index += 1
// ---  add th to tblRow_select.
                        let th_select = document.createElement("th");
                        th_select.addEventListener("click", function() {Grid_SelectTeam("th_select", th_select)}, false )
                        th_select.classList.add("grd_team_th_selectrow");
                        if (!!row_id) { th_select.setAttribute("id", row_id)};
                        th_select.setAttribute("data-team_pk", pk_int);
                        th_select.innerText = "\u22BB";  // Xor sign (v with _)
                        tblRow_select.appendChild(th_select);
// ---  add th to tblRow_header.
                        let th_header = document.createElement("th");
                        th_header.classList.add("grd_team_th");
                        if(is_created){ ShowOkElement(th_header, "grd_team_th_create", "grd_team_th") }

                        th_header.innerText = get_dict_value(team_dict, ["code", "value"], "-");
// ---  add EventListener to th_header
                        th_header.addEventListener("click", function() {MGT_Open("grid", th_header)}, false )
                        th_header.classList.add("pointer_show")
// ---  add data-pk and data-ppk to lookup_cell
                        th_header.setAttribute("data-team_pk", pk_int);
                        th_header.setAttribute("data-scheme_pk", scheme_pk);
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
            grid_teams_dict[pk_new] = {id: {col: col_index, row_id: row_id, code: team_code, abbrev: ""}};
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
            th.setAttribute("data-scheme_pk", scheme_pk);
            th.innerText = team_code;
// ---  append th_header to tblRow_header
            tblRow_header.appendChild(th);

// --- loop through teammember_map, put info in grid_teams_dict
            let max_row_index = 0;
            for (const [map_id, tm_dict] of teammember_map.entries()) {
                const scheme_pk_in_dict = get_dict_value(tm_dict, ["team", "ppk"], 0);
        console.log("map_id", map_id);
        console.log("tm_dict", tm_dict);
        console.log("scheme_pk_in_dict", scheme_pk_in_dict);
        console.log("scheme_pk", scheme_pk);
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict,
                if (!!scheme_pk_in_dict && scheme_pk === scheme_pk_in_dict) {
                    const team_pk = get_dict_value(tm_dict, ["id", "ppk"], 0);
        console.log(",,,,,,team_pk", team_pk);
                    if(team_pk){
                        let team_dict = grid_teams_dict[team_pk];
        console.log("team_dict", team_dict);
                        if (!!team_dict){
                            const tm_pk = get_dict_value(tm_dict, ["id", "pk"], 0);
        console.log("tm_pk", tm_pk);
// ---  count how many teammembers this team_dict already has
                            // team_dict also has key 'id', therefore count = length - 1
                            const tm_dict_length = Object.keys(team_dict).length;
                            // select_row has index 0, header_row has index 1
                            // first teammember has row index 2 : index = tm_dict_length + 1, min = 2
                            const row_index = (!!tm_dict_length) ? tm_dict_length + 1 : 2;
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
                            //const employee_pk = get_dict_value(tm_dict, ["employee", "pk"]);
                            const employee_code = get_dict_value(tm_dict, ["employee", "code"], "---");
                            //const datefirst = get_dict_value(tm_dict, ["datefirst", "value"]);
                            //const datelast = get_dict_value(tm_dict, ["datelast", "value"]);
                            //const replacement_pk = get_dict_value(tm_dict, ["replacement", "pk"]);
                            //const replacement_code = get_dict_value(tm_dict, ["replacement", "code"], "---");

                            //team_dict[tm_pk] = {employee_pk: employee_pk,
                            //                    employee_code: employee_code,
                            //                    replacement_pk: replacement_pk,
                            //                    replacement_code: replacement_code,
                           //                     row: row_index};
                            team_dict[tm_pk] = {row: row_index, row_id: row_id, display: employee_code};

            // lookup tblRow
                            let lookup_tblRow = tblBody.rows[row_index]
            // lookup cell of team - get col_index from id_dict of this team
                            const col_idx = get_dict_value(team_dict, ["id", "col"], -1);
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
                                lookup_cell.setAttribute("data-scheme_pk", scheme_pk);
                            }
                        }  // if (!!team_dict)
                    }
                }
            }
            console.log( " grid_teams_dict", grid_teams_dict);
        }  // if (!!scheme_pk)
    };  // Grid_CreateTblTeams

//=========  Grid_CreateTblShifts  === PR2020-03-13
    function Grid_CreateTblShifts(scheme_pk) {
        //console.log("===  Grid_CreateTblShifts == ", scheme_pk)

        let tblBody = document.getElementById("id_grid_tbody_shift");
        tblBody.innerText = null
        let first_rosterdate_JS = null;

        let cycle = null, dvg_onph = false, add_ph_column = 0;
        if (!!scheme_pk){
// ---  get scheme from scheme_map
            const scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", scheme_pk)
            cycle = get_dict_value(scheme_dict, ["cycle", "value"])
            dvg_onph = get_dict_value(scheme_dict, ["divergentonpublicholiday", "value"], false)
            add_ph_column = (dvg_onph) ? 1 : 0;

// ---  get first rosterdate of grid: Monday when cycle >=7, Mon/Thu when cycle>= 4 and <7, today when cycle < 4
            // -- new Date(); also has current time. Convert to date without time
            // -- function: get_dateJS_from_dateISO (get_today_iso()) gives date from UTC time,
            //    instead of '2020-05-02 T 20-12' it gives '2020-05-03 T 00-12' GMT-0400 (Bolivia Time)
            //    use today_JS_from_arr instead, remember month_index =   today_arr[1] - 1

            const today_arr = get_now_arr_JS()
            const today_JS = new Date(today_arr[0], today_arr[1] - 1, today_arr[2]);
            let today_weekday = today_JS.getDay()
            if (today_weekday === 0 ) {today_weekday = 7}  // Sunday = 0 in JS, Sunday = 7 in ISO
            if(cycle < 4) {
                first_rosterdate_JS = today_JS  // first rosterdate is today if cycle < 4
            } else  {
                // first rosterdate is this week Monday, unless cycle < 7 and weekday > cycle. In that case Thursday is first day
                const add_days = (cycle < 7 && today_weekday > cycle) ? 4 : 1;
                first_rosterdate_JS = addDaysJS(today_JS, + add_days - today_weekday);
            }
            grid_table_dict.first_rosterdate = get_dateISO_from_dateJS_vanilla(first_rosterdate_JS);

// ---  create col_rosterdate_dict
        //  stores rosterdate of each column, used to create id for each cell "2020-03-14_1784" (rosterdate + "_" + shift_pk)
            let col_rosterdate_dict = {};

// +++  create two header rows, one for the weekdays and the other for dates
            let tblRow_weekday = tblBody.insertRow (-1);  // index -1: insert new cell at last position.// ---  create Team header row
            let tblRow_date = tblBody.insertRow (-1);  // index -1: insert new cell at last position.

            // to keep rows at top when sorting
            tblRow_weekday.setAttribute("data-offsetstart", "-1001")
            tblRow_date.setAttribute("data-offsetstart", "-1000")
// --- create header with dates, number of columns = cycle + 1
            let first_month_index = -1, last_month_index = -1, first_year = 0, last_year = 0;
            // first_rosterdate_JS chenges when dat_JS changes. addDaysJS creates copy
            let date_JS = addDaysJS(first_rosterdate_JS, 0)
            let cell_weekday, cell_date;
            // add 1 extra column when dvg_onph
            for (let col_index = 0, td; col_index < cycle + 1 + add_ph_column ; col_index++) {
                const is_col_ph = (dvg_onph && col_index === cycle + add_ph_column);
                let date_iso = null;

// ---  add th to tblRow_weekday.
                let th = document.createElement("th");
                const cls = (col_index === 0) ? "grd_shift_th_first" : (is_col_ph) ? "grd_shift_th_ph" : "grd_shift_th";
                th.classList.add(cls);
                if (is_col_ph) { th.classList.add("tsa_color_mediumblue")};
                tblRow_weekday.appendChild(th);
// ---  add th to tblRow_date.
                th = document.createElement("th");
                th.classList.add(cls);
                if (is_col_ph) { th.classList.add("tsa_color_mediumblue")};
                tblRow_date.appendChild(th);
                if (!!col_index){
// ---  add innerText to cell_weekday and cell_date
                    cell_weekday = tblRow_weekday.cells[col_index];
                    cell_date = tblRow_date.cells[col_index];

                    if (is_col_ph) {
                        date_iso = "onph"
                        cell_weekday.innerText = loc.Public;
                        cell_date.innerText = loc.holidays;
                    } else {
                        date_iso = get_dateISO_from_dateJS_vanilla(date_JS);
                        const weekday_index = (!!date_JS.getDay()) ? date_JS.getDay() : 7;  // Sunday = 0 in JS, Sunday = 7 in ISO
                        cell_weekday.innerText = loc.weekdays_abbrev[weekday_index];

                        cell_date.innerText = date_JS.getDate().toString();
                    }
// ---  add rosterdate to col_rosterdate_dict
                    col_rosterdate_dict[col_index] = date_iso;

    //  these are used in get_month_year_text
                    const year_int = date_JS.getFullYear();
                    const month_index = date_JS.getMonth();
                    if ( col_index === 1){
                        first_year = year_int; // used in get_month_year_text
                        first_month_index = month_index;// used in get_month_year_text
                    }
                    last_year = year_int;  // used in get_month_year_text
                    last_month_index = month_index; // used in get_month_year_text

    // go to next date
                    change_dayJS_with_daysadd_vanilla(date_JS, 1);

                }  // if (!!col_index){
    // put month / year in first column
                tblRow_date.cells[0].innerText = get_month_year_text(first_year, last_year, first_month_index, last_month_index, loc)
            }  //  for (let col_index = 0, td; col_index < cycle + 1 ; col_index++) {

// +++++++++++++++++++++++++++++++++++  add shift rows  ++++++++++++++++++++++++++++++++
            let row_index = 2;
            let shifts_dict = {}

// ---  loop through shift_map
            for (const [map_id, shift_dict] of shift_map.entries()) {
                const ppk_int = get_dict_value(shift_dict, ["id", "ppk"], 0);
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict
                if (!!ppk_int && scheme_pk === ppk_int) {
                    const shift_pk_int = get_dict_value(shift_dict, ["id", "pk"], 0);
                    const is_restshift = get_dict_value(shift_dict, ["isrestshift", "value"], false);
                    let shift_code = get_dict_value(shift_dict, ["code", "value"], "---");
                    // shift_offsetstart is for sorting shift rows
                    let shift_offsetstart = get_dict_value(shift_dict, ["offsetstart", "value"], 0);
                    if (!shift_offsetstart) { shift_offsetstart = 1440};
                    if( is_restshift) {shift_code += " (R)"}
                    if(!!shift_pk_int){
                        const row_id ="grid_shift_" + shift_pk_int.toString();
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
                        //tblRow_shift.setAttribute("id", row_id);
                        tblRow_shift.id = row_id;
                        tblRow_shift.setAttribute("data-pk", shift_pk_int)
                        tblRow_shift.setAttribute("data-ppk", ppk_int)
                        tblRow_shift.setAttribute("data-offsetstart", shift_offsetstart)
// ---  add td's to tblRow.
                        // add extra column when dvg_onph
                        for (let col_index = 0, cell_id; col_index < cycle + 1 + add_ph_column ; col_index++) {
                            // in col 'on_ph' there is no rosterdate, fill in min_rosterdate instead since field is required
                            const is_shift_cell = (col_index === 0);
                            const is_cell_ph = ((dvg_onph) && (col_index === cycle + add_ph_column));
                            let rosterdate_iso = col_rosterdate_dict[col_index]; // not in use when first_rosterdate_JS
    // ---  add id to cells
                            let td_si = document.createElement("td");
                            const prefix = (is_shift_cell) ? "gridcell_shift_" : (is_cell_ph) ? "si_onph_" : "si_" + rosterdate_iso + "_"
                            const cell_id = prefix + shift_pk_int.toString();
                            td_si.id = cell_id;
                            if (is_shift_cell) {  td_si.innerText =  shift_code};
                            td_si.classList.add((is_shift_cell) ? "grd_shift_td_first" : "grd_shift_td");
                            td_si.addEventListener("click", function() {Grid_SchemitemClicked(td_si, is_shift_cell)}, false )
    // ---  add hover to cells
                            td_si.addEventListener("mouseenter", function() {td_si.classList.add(cls_hover)});
                            td_si.addEventListener("mouseleave", function() {td_si.classList.remove(cls_hover)});

                            tblRow_shift.appendChild(td_si);

    // ---  add cell_dict to grid_table_dict
                            const cell_dict = {cell_id: cell_id, rosterdate: (is_cell_ph) ? "onph" : rosterdate_iso,
                                               onph: is_cell_ph,
                                               shift: {pk: shift_pk_int, code: shift_code},
                                               scheme_pk: scheme_pk,
                                               schemeitems: {}};
                            grid_table_dict[cell_id] = cell_dict;
                        }  // for (let col_index = 0,
                    }
                 }
            }  // for (const [map_id, shift_dict] of shift_map.entries()) {


// +++++++++++++++++++++++++++++++++++  add footer row  ++++++++++++++++++++++++++++++++
            let tblRow_footer = tblBody.insertRow (-1);  // index -1: insert new cell at last position.// ---  create Team header row
        // to keep row at bottom when sorting
            tblRow_footer.setAttribute("data-offsetstart", 10000)
// ---  add td's to tblRow_footer.
            for (let col_index = 0, cell_id; col_index < cycle + 1 + add_ph_column ; col_index++) {
// ---  add id to cells
                let td_si = document.createElement("th");
                if (col_index === 0) {
// ---  add cell 'addnew' th to tblRow.
                    const cell_id = "shift_new";
                    //td_si.setAttribute("id", cell_id);
                    td_si.id = cell_id;
                    td_si.innerText = "< " + loc.Add_shift + " >";
                    td_si.classList.add("tsa_color_mediumgrey");
                    td_si.addEventListener("click", function() {Grid_SchemitemClicked(td_si, true)}, false )  // is_shift_cell = true
    // ---  add hover to cells
                    td_si.addEventListener("mouseenter", function() {td_si.classList.add(cls_hover)});
                    td_si.addEventListener("mouseleave", function() {td_si.classList.remove(cls_hover)});
                }
                td_si.classList.add((col_index === 0) ? "grd_shift_th_first" : "grd_shift_th");
                tblRow_footer.appendChild(td_si);
            }  // for (let i = 0; i < cycle + 1 ; i++)
        }  // if (!!scheme_pk)

// +++++++++++++++++++++++++++++++++++  fill grid table ++++++++++++++++++++++++++++++++
        Grid_FillTblShifts(scheme_pk, first_rosterdate_JS, cycle);

    }  // Grid_CreateTblShifts

//=========  Grid_FillTblShifts  === PR2020-03-14
    function Grid_FillTblShifts(scheme_pk, first_rosterdate_JS, cycle) {
        console.log("===  Grid_FillTblShifts == ")
        let tblBody = document.getElementById("id_grid_tbody_shift");

// +++  loop through schemeitem_map and store schemeitems of this scheme in grid_schemeitem_map
        // iif weekly cycle: first date is Monday, if 1 day cycle: first date is today
        for (const [map_id, si_dict] of schemeitem_map.entries()) {
            const ppk_int = get_dict_value(si_dict, ["id", "ppk"], 0);
        //console.log("si_dict", si_dict)
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict
            if (!!ppk_int && scheme_pk === ppk_int) {

// ---  lookup rosterdate in grid.
                // get difference in days between date of first column and rosterdate of schemeitem.
                // get remainder of diff / cycle (0 to 6 or -1 to -6 in weekcycle. Add 1 cycle when negative
                // get column index by adding remainder to first columns. Convert to cell_id
                const rosterdate_iso = get_dict_value(si_dict, ["rosterdate", "value"]);
                const rosterdate_JS = get_dateJS_from_dateISO (rosterdate_iso)
                const day_diff = get_days_diff_JS(rosterdate_JS, first_rosterdate_JS)
                let days_add = (day_diff % cycle) // % is remainder: -1 % 2 = -1,  1 % 2  = 1
                if (days_add < 0 ) {days_add += cycle }
                const cell_date_JS = addDaysJS(first_rosterdate_JS, days_add)
                const cell_date_iso = get_dateISO_from_dateJS_vanilla(cell_date_JS)

// ---  convert rosterdate and shift_pk to cell_id, use "si_onph_" when on_publicholiday
                const shift_pk = get_dict_value(si_dict, ["shift", "pk"], 0);
                const on_publicholiday = get_dict_value(si_dict, ["onpublicholiday", "value"]);
                const inactive = get_dict_value(si_dict, ["inactive", "value"]);
                const cell_date = (on_publicholiday) ? "onph" : cell_date_iso
                const cell_id = "si_" + cell_date + "_" + shift_pk.toString();
                let cell = document.getElementById(cell_id);

                if(!!cell){
// get team_dict from team_map, not from si_dict
                    const team_pk = get_dict_value(si_dict, ["team", "pk"], 0);
                    const team_dict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk);
                    const team_code = get_dict_value(team_dict, ["code", "value"])
                    const team_abbrev = get_dict_value(team_dict, ["code", "abbrev"])

// add  schemeitem to cell_dict in grid_table
                    const cell_schemeitems_dict = get_dict_value(grid_table_dict, [cell_id, "schemeitems"]);
                    const si_pk_int = get_dict_value(si_dict, ["id", "pk"], 0);
                    cell_schemeitems_dict[si_pk_int] = {pk: si_pk_int, ppk: ppk_int,
                                                inactive: inactive, onpublicholiday: on_publicholiday,
                                                rosterdate: (on_publicholiday) ? "onph" : rosterdate_iso,
                                                shift_pk: shift_pk,
                                                team: {pk: team_pk, code: team_code, abbrev: team_abbrev} };

// ---  add class 'has_si' and team_row_id to classList of cell
                    // 'has_si' used in querySelectorAll, team_row_id used to highlight
                    cell.classList.add("has_si")
                    const team_row_id = get_dict_value(grid_teams_dict, [team_pk, "id", "row_id"])
                    if(!!team_row_id) {cell.classList.add(team_row_id)};

// ---  add team_abbrev to cell.innerText
                    cell.innerText = set_cell_innertext(cell.innerText, team_abbrev)
                }  // if(!!cell){
            }  //  if (!!ppk_int && scheme_pk === ppk_int) {
        }  // for (const [map_id, si_dict] of schemeitem_map.entries())

//console.log("grid_table_dict", deepcopy_dict(grid_table_dict))
    }  //  Grid_FillTblShifts

//=========  Grid_UpdateFromResponse_si  ================ PR2020-03-15
    function Grid_UpdateFromResponse_si(si_update_list) {
        //console.log(" ==== Grid_UpdateFromResponse_si ====");
        //console.log("si_update_list", si_update_list);
        let cell_id_str = null, ppk_int = null;

// --- loop through si_update_list
        for (let i = 0, update_dict; update_dict = si_update_list[i]; i++) {
            //console.log("update_dict", deepcopy_dict(update_dict));

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
            const cell_dict = grid_table_dict[cell_id_str]
// if is new schemeitem: delete item with 'temp_pk' from cell_dict.schemeitems
            if(temp_pk){ delete cell_dict.schemeitems[temp_pk]};
// grid_table_dict = {si_onph_1128: {schemeitems: {3030: { deepcopy}} } }
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
            update_map_item_local(tblName, map_id, update_dict, is_created, is_deleted);
        }  //  for (let j = 0; j < 8; j++)

        Grid_UpdateCell(cell_id_str)
    };  // Grid_UpdateFromResponse_si

//=========  Grid_UpdateCell  === PR2020-03-15
    function Grid_UpdateCell(cell_id_str) {
        // obly called by Grid_UpdateFromResponse_si
        //console.log("===  Grid_UpdateCell == cell_id_str: ", cell_id_str)

//----- get cell_dict
        const cell_dict = grid_table_dict[cell_id_str]
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
                    const team_abbrev = get_dict_value(grid_teams_dict, [team_pk, "id", "abbrev"])
                    const team_row_id = get_dict_value(grid_teams_dict, [team_pk, "id", "row_id"])
                    if(team_pk === grid_selected_team.pk){
                        cell_contains_selected_team = true
                    }
                    cell.classList.add("has_si")
                    if(!!team_row_id) {
                        cell.classList.add(team_row_id)
                    };

// ---  add team_abbrev to cell.innerText
                    cell.innerText = set_cell_innertext(cell.innerText, team_abbrev)
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
            grid_selected_team.pk = get_dict_value(team_dict, ["id", "pk"]);
            grid_selected_team.ppk = get_dict_value(team_dict, ["id", "ppk"]);
            grid_selected_team.code = get_dict_value(team_dict, ["code", "value"], "-");
            grid_selected_team.abbrev = get_dict_value(team_dict, ["code", "abbrev"]);
        }
// ---  highlight cells of this team in tbody_teams
        let tbody_teams = document.getElementById("id_grid_tbody_team");
        for (let i = 1, row, len = tbody_teams.rows.length; i < len; i++) {
            row = tbody_teams.rows[i];
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
        let tbody_shift = document.getElementById("id_grid_tbody_shift");
        let elements = tbody_shift.querySelectorAll(".has_si")
        for (let i = 0, el; el = elements[i]; i++) {
            const is_selected_team = el.classList.contains(team_pk_str)
            add_or_remove_class(el, cls_bc_yellow_light,is_selected_team )
        };
    }  // Grid_SelectTeam

//=========  Grid_SchemitemClicked  === PR2020-03-14
    function Grid_SchemitemClicked(td_clicked, is_shift_cell) {
        console.log("===  Grid_SchemitemClicked == ");
        //console.log("td_clicked ", td_clicked);
        // grid_selected_team = {pk: 2540, ppk: 2019, code: "Ploeg A", abbrev: "A"}

// ---  open ModGridShift when is_shift_cell
        if(!!is_shift_cell) {
            MGS_Open("grid", td_clicked)
        } else {
// ---  get cell_dict from grid_table_dict
            const cell_id_str = td_clicked.id;
            console.log("cell_id_str ", cell_id_str);
            const cell_dict = grid_table_dict[cell_id_str]
            const rosterdate_iso = cell_dict.rosterdate;
            const on_ph = cell_dict.onph;
            console.log("cell_dict ", cell_dict);
            if(!grid_selected_team.pk) {
// ---  show message in ModConfirm when there is no team selected
                let rosterdate_text = (on_ph) ? loc.Public_holidays :
                                    format_date_iso (rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);
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
                if( (rosterdate_iso || on_ph) && !!shift_pk && !!scheme_pk) {
                   let upload_list = [];
                    let has_si_with_sel_team = false;  // checks if there is already a si with this team
                    let si_pk_without_team = null;

// ++++++++++ loop through schemeitems of this cell_dict
                    const schemeitems_dict = get_dict_value(cell_dict, ["schemeitems"]);
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
                                const team_abbrev = get_dict_value(si_dict, ["team", "abbrev"]);
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
                    td_clicked.innerText = set_cell_innertext(old_innertext, grid_selected_team.abbrev, is_remove)
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
        //console.log("grid_table_dict: ", grid_table_dict)
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
            order_by = get_dict_value(item_dict, ["employee", "code"], "");
        } else if (tblName === "absence"){
            const employee_code = get_dict_value(item_dict, ["employee", "code"], "") + "                        ";
            order_by = employee_code.slice(0, 24) + get_dict_value(item_dict, ["scheme", "datefirst"], "")
        } else if (tblName === "schemeitem"){
            order_by = get_dict_value(item_dict, ["rosterdate", "excelstart"]);
        }
        return order_by;
    }  // get_orderby


//========= get_rowindex_by_orderby  ================= PR2020-05-26
    function get_rowindex_by_orderby(tblBody, search_orderby) {
        //console.log(" ===== get_rowindex_by_orderby =====");
        //console.log("search_orderby: <" + search_orderby + ">");
        let row_index = -1;
// --- loop through rows of tblBody_datatable
        if(!!search_orderby){
            for (let i = 0, tblRow; tblRow = tblBody.rows[i]; i++) {
                //console.log("tblRow", tblRow);
                const row_orderby = get_attr_from_el(tblRow, "data-orderby");
                //console.log("row_orderby: <" + row_orderby + ">");
                if(!!row_orderby && row_orderby > search_orderby) {
// --- search_rowindex = row_index - 1, to put new row above row with higher row_orderby
                    row_index = tblRow.rowIndex - 1;
                    //console.log("row_orderby > search_orderby --> row_index: ", row_index);
                    break;
        }}}
        if(!row_index){row_index = 0}
        if(row_index >= 0){ row_index -= 1 }
        return row_index
    }  // get_rowindex_by_orderby


//========= get_tblName_from_selectedBtn  ================= PR2020-05-29
    function get_tblName_from_selectedBtn(selected_btn) {
        //console.log(" ===== get_tblName_from_selectedBtn =====");
// ---  get tblName, is null when btn = "btn_grid"
        const tblName = (selected_btn === "btn_shift") ? "shift" :
                        (selected_btn === "btn_team") ? "teammember" :
                        (selected_btn === "btn_scheme") ? "scheme" :
                        (selected_btn === "btn_absence") ? "absence" :
                        (selected_btn === "btn_schemeitem") ? "schemeitem" : null;
        return tblName;
    }

}); //$(document).ready(function()