// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";
        console.log("Schemes document.ready");

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

// ---  id of selected customer and selected order
        const id_sel_prefix = "sel_"
        let selected_cust_pk = 0;
        let selected_order_pk = 0;
        let selected_scheme_pk = 0;
        let selected_shift_pk = 0;
        let selected_team_pk = 0;
        let selected_item_pk = 0;
        let template_mode = false;
        let rosterdate_dict = {};

        let employee_map = new Map();
        let customer_map = new Map();
        let order_map = new Map();
        let scheme_map = new Map();
        let shift_map = new Map();
        let schemeitem_map = new Map();
        let team_map = new Map();
        let teammember_map = new Map();

        let grid_teams_dict = {};
        let grid_selected_team_pk = 0;
        let grid_schemeitem_list = [];

        // setting_cust_pk contains saved pk. Remains when switched to template mode.
        // selected_cust_pk can have value of template_cust, is not stored in settings
        let setting_cust_pk = 0;
        let setting_order_pk = 0;
        let setting_scheme_pk = 0;
        let selected_btn = "";

        let loc = {};  // locale_dict
        let period_dict = {};
        let mod_upload_dict = {};
        let mod_MGT_dict = {};  // used to keep track op changes in mod_grid_team
        let mod_MGS_dict = {};  // used to keep track op changes in mod_shift_team
        let mod_employee_dict = {};  // used to tranfer data to mod_employee

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let idx = 0; // idx is id of each created (date) element 2019-07-28
        let filter_name = "";
        let filter_mod_employee = "";
        let filter_hide_inactive = true;
        let filter_dict = {};

        let quicksave = false

// ---  Select Customer
        let el_select_customer = document.getElementById("id_select_customer");
            el_select_customer.addEventListener("change", function() {HandleSelectCustomer(el_select_customer, "select_customer change");}, false )

// ---  Select Order
        let el_select_order = document.getElementById("id_select_order")
            el_select_order.addEventListener("click", function(event) {HandleSelectOrder(el_select_order, "select_order change")}, false )

// ---  Select Scheme
        // EventHandler HandleSelectRow is added in FillSelectTable
        let sidebar_tblBody_scheme = document.getElementById("id_select_tbody_scheme")
        let sidebar_tblBody_shift = document.getElementById("id_select_tbody_shift")
        let sidebar_tblBody_team = document.getElementById("id_select_tbody_team")

        let tblBody_schemeitem = document.getElementById("id_tbody_schemeitem");
        let tblBody_shift = document.getElementById("id_tbody_shift");
        let tblBody_teammember = document.getElementById("id_tbody_teammember");

        let el_timepicker = document.getElementById("id_timepicker")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");


        const tbl_col_count = {schemeitem: 5, shift: 6, teammember: 5}
        const field_names = {
            schemeitem: ["rosterdate", "shift", "team", "inactive", "delete"],
            shift: ["code", "isrestshift", "offsetstart", "offsetend", "breakduration", "timeduration"],
            teammember: ["employee", "datefirst", "datelast", "replacement", "delete"]}
        const field_tags = {
            schemeitem: ["input", "select", "select","a", "a"],
            shift: ["input", "a", "input", "input", "input", "input"],
            teammember: ["input", "input", "input", "input", "a"]}
        const field_width = {
            schemeitem: ["090", "180", "180", "032", "032"],
            shift: ["180", "060", "120", "120", "120", "120"],
            teammember: ["220", "120", "120", "220", "032"]}
        const field_align = {
            schemeitem: ["left", "left", "left", "right", "right"],
            shift: ["left", "left", "right", "right", "right", "right"],
            teammember: ["left", "left", "left", "left", "right"]}

        const fieldsettings_teammember = {tblName: "teammember", colcount: 5,
                                caption: ["Employee", "Start_date", "End_date", "Replacement_employee"],
                                name: ["employee", "datefirst", "datelast", "replacement", "delete"],
                                tag: ["div", "input", "input", "div", "a"],
                                width: ["150", "150", "150", "150", "032"],
                                align: ["left", "left", "left", "left", "right"]}

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
        const imgsrc_rest_black = get_attr_from_el(el_data, "data-imgsrc_rest_black");

        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        //moment.locale(loc.user_lang)

//  ========== EventListeners  ======================

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

// --- hide fill buttons
        ShowButtonsTableSchemeitem(false);

// ===================== event handlers for MODAL ===================================

// ---  MOD GRID TEAM ------------------------------------
        let el_MGT_teamcode = document.getElementById("id_MGT_teamcode");
            el_MGT_teamcode.addEventListener("change", function() {MGT_TeamcodeChanged(el_MGT_teamcode)}, false)

        let el_MGT_btn_save = document.getElementById("id_MGT_btn_save");
                el_MGT_btn_save.addEventListener("click", function() {MGT_Save("update")}, false )
        let el_MGT_btn_delete = document.getElementById("id_MGT_btn_delete");
                el_MGT_btn_delete.addEventListener("click", function() {MGT_Save("delete")}, false )

// ---  MOD GRID SHIFT ------------------------------------
        let el_MGS_shiftcode = document.getElementById("id_MGS_shiftcode");
            el_MGS_shiftcode.addEventListener("change", function() {MGS_ShiftcodeChanged(el_MGS_shiftcode)}, false)

        let el_MGS_offsetstart = document.getElementById("id_MGS_offsetstart");
            el_MGS_offsetstart.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_offsetstart, "grid_shift")}, false)
        let el_MGS_offsetend = document.getElementById("id_MGS_offsetend");
            el_MGS_offsetend.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_offsetend, "grid_shift")}, false)
        let el_MGS_breakduration = document.getElementById("id_MGS_breakduration");
            el_MGS_breakduration.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_breakduration, "grid_shift")}, false)
        let el_MGS_timeduration = document.getElementById("id_MGS_timeduration");
            el_MGS_timeduration.addEventListener("click", function() {MGS_TimepickerOpen(el_MGS_timeduration, "grid_shift")}, false)
        let el_MGS_restshift = document.getElementById("id_MGS_restshift");
            el_MGS_restshift.addEventListener("change", function() {MGS_RestshiftClicked(el_MGS_restshift)}, false)

        let el_MGS_btn_save = document.getElementById("id_MGS_btn_save");
                el_MGS_btn_save.addEventListener("click", function() {MGS_Save("update")}, false )
        let el_MGS_btn_delete = document.getElementById("id_MGS_btn_delete");
                el_MGS_btn_delete.addEventListener("click", function() {MGS_Save("delete")}, false )

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_ModSelEmp_select_employee_body");
        document.getElementById("id_ModSelEmp_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() {MSE_filter_employee("filter", event.key)}, 50)});
        document.getElementById("id_ModSelEmp_btn_save").addEventListener("click", function() {MSE_Save("save")}, false )
        document.getElementById("id_ModSelEmp_btn_remove_employee").addEventListener("click", function() {MSE_Save("remove")}, false )

// ---  Modal Addnew
        let el_mod_cust = document.getElementById("id_mod_scheme_customer")
        el_mod_cust.addEventListener("change", function() {ModSchemeEdit("customer")}, false)
        let el_mod_order = document.getElementById("id_mod_scheme_order")
        el_mod_order.addEventListener("change", function() {ModSchemeEdit("order")}, false)
        let el_mod_code = document.getElementById("id_mod_scheme_code")
        el_mod_code.addEventListener("keyup", function(event) {
            setTimeout(function() {ModSchemeEdit("code", event.key)}, 250)}, false )
        let el_mod_cycle = document.getElementById("id_mod_scheme_cycle")
             el_mod_cycle.addEventListener("change", function() {
                setTimeout(function() {ModSchemeEdit("cycle")}, 250)}, false )
        let el_mod_scheme_add_btn_save = document.getElementById("id_mod_scheme_btn_save");
                el_mod_scheme_add_btn_save.addEventListener("click", function() {ModSchemeSave()}, false )

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

// ---  Input elements in scheme box
        let el_data_form = document.getElementById("id_div_data_form");
        let els = el_data_form.getElementsByClassName("frm_input");
        for (let i=0, len = els.length; i<len; i++) {
            let el = els[i];
            const event_type = (el.type === "checkbox") ? "click" : (el.type === "date") ? "change" : "blur";
            el.addEventListener(event_type, function() {Upload_Scheme(el)}, false);
        }

// ---  Input elements in teamcode box
        let el_input_team_code = document.getElementById("id_team_code")
            el_input_team_code.addEventListener("change", function() {Upload_Team()}, false)

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
            // als slip when clicked on el_confirm_btn_save, to show tsa_tr_error whe ndeleting team
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
        // show_absence = null is for testing, show_absence must be false in production
        const show_absence = null;
        // const show_absence = false;
        const datalist_request = {
            setting: {page_scheme: {mode: "get"},
                      selected_pk: {mode: "get"}
                      },
            quicksave: {mode: "get"},
            locale: {page: "scheme"},
            customer: {isabsence: show_absence, istemplate: null, inactive: false},
            order: {isabsence: show_absence, istemplate: null, inactive: false},
            scheme: {isabsence: show_absence, istemplate: null, inactive: null, issingleshift: null},
            shift: {customer_pk: null},
            team: {customer_pk: null, isabsence: show_absence},
            teammember: {customer_pk: null, isabsence: show_absence},
            schemeitem: {customer_pk: null, isabsence: show_absence},
            employee: {inactive: null}};
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

                // hide loader
                el_loader.classList.add(cls_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];

                    // --- create Submenu after downloading locale
                    CreateSubmenu()

                    // --- create header row and addnew rows after downloading locale
                    CreateSelectHeaderRows();
                    CreateSelectAddnewRows();


// --- create header row and footer
                    CreateTblHeaders();
                    CreateTblFooters();

                }
               // if ("period" in response) {
                //    period_dict= response["period"];
               //     CreateTblModSelectPeriod();
                //}
                // setting_dict come before 'customer' and 'order'
                if ("setting_dict" in response) {
                    UpdateSettings(response["setting_dict"])
                }

                if ("rosterdate_check" in response) {
                    ModRosterdateChecked(response["rosterdate_check"]);
                };

                if ("quicksave" in response) {
                    quicksave = get_subdict_value_by_key(response, "quicksave", "value", false)
                    //console.log( "quicksave", quicksave, typeof quicksave)
                }

    // after select customer the following lists will be downloaded, filtered by selected_cust_pk:
                  // datalist_request = "scheme" "schemeitem" "shift" "team" "teammember"
                //SBR_FillSelectTable fills selecttable and makes visible

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
        }
        if ("customer_list" in response) {
            get_datamap(response["customer_list"], customer_map)

    // fill the three select customer elements
            SBR_FillOptionCustomerOrder("customer", "customer_list response");
            HandleSelectCustomer(el_select_customer, "customer_list response")
        }
        if ("team_list" in response) {
            get_datamap(response["team_list"], team_map)
            SBR_FillSelectTable("team", "refresh_maps team_list", selected_team_pk, true);
        }
        if ("scheme_list" in response) {
            get_datamap(response["scheme_list"], scheme_map)
            SBR_FillSelectTable("scheme", "refresh_maps scheme_list", selected_scheme_pk);
            Grid_FillGrid({})
        }
        if ("shift_list" in response) {
            get_datamap(response["shift_list"], shift_map)

            SBR_FillSelectTable("shift", "refresh_maps shift_list", selected_shift_pk);
        }

        if ("teammember_list" in response) {
            get_datamap(response["teammember_list"], teammember_map)
        }
        if ("schemeitem_list" in response) {
            get_datamap(response["schemeitem_list"], schemeitem_map)
        }

        if ("employee_list" in response) {
            get_datamap(response["employee_list"], employee_map)
        }

    }  // refresh_maps
//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        // CreateSubmenuButton(el_div, id, btn_text, class_key, function_on_click)
        AddSubmenuButton(el_div, loc.Add_scheme, function (){ModSchemeOpen()}, null, "id_menubtn_add_scheme");
        AddSubmenuButton(el_div, loc.Delete_scheme, function (){HandleDeleteScheme()}, ["mx-2"], "id_menubtn_delete_scheme");
        AddSubmenuButton(el_div, loc.menubtn_copy_from_template, function (){ModCopyfromTemplateOpen()}, ["mx-2"], "id_menubtn_copy_from_template");
        AddSubmenuButton(el_div, loc.menubtn_copy_to_template, function (){ModCopytoTemplateOpen()}, ["mx-2"], "id_menubtn_copy_to_template");
        AddSubmenuButton(el_div, loc.menubtn_show_templates, function (){HandleSubmenubtnTemplateShow()}, ["mx-2"], "id_menubtn_show_templates");

        el_submenu.appendChild(el_div);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu

//=========  HandleSubmenubtnTemplateShow  ================ PR2019-09-15
    function HandleSubmenubtnTemplateShow(el) {
        //console.log("--- HandleSubmenubtnTemplateShow")

        template_mode = !template_mode
        //console.log("new template_mode: ", template_mode)

        const btn_txt = (template_mode) ? loc.menubtn_hide_templates : loc.menubtn_show_templates;
        document.getElementById("id_menubtn_show_templates").innerText = btn_txt;

// reset selected customer and order
        selected_cust_pk = (!template_mode) ? setting_cust_pk : 0;
        selected_order_pk = (!template_mode) ? setting_order_pk : 0;
        selected_scheme_pk =  (!template_mode) ? setting_scheme_pk : 0;
// reset scheme, team, shift
        sidebar_tblBody_scheme.innerText = null;
        sidebar_tblBody_shift.innerText = null;
        sidebar_tblBody_team.innerText = null;

        SBR_FillOptionCustomerOrder("customer", "HandleSubmenubtnTemplateShow");
        HandleSelectCustomer(el_select_customer, "HandleSubmenubtnTemplateShow")

        if(template_mode){
            document.getElementById("id_select_customerorder_div").classList.add(cls_hide)
            document.getElementById("id_select_template_div").classList.remove(cls_hide)
        } else {
            document.getElementById("id_select_customerorder_div").classList.remove(cls_hide)
            document.getElementById("id_select_template_div").classList.add(cls_hide)
        }

        DisableSubmenuButtons();
    }

//=========  DisableSubmenuButtons  ================ PR2020-03-12
    function DisableSubmenuButtons() {
        let btn_copyfrom = document.getElementById("id_menubtn_copy_from_template");
        let btn_copyto = document.getElementById("id_menubtn_copy_to_template");
        let btn_delete = document.getElementById("id_menubtn_delete_scheme");
        if(template_mode){
            btn_copyfrom.setAttribute("aria-disabled", true);
            btn_copyfrom.classList.add("tsa_color_mediumgrey");

            btn_copyto.setAttribute("aria-disabled", true);
            btn_copyto.classList.add("tsa_color_mediumgrey");
        } else {
            btn_copyfrom.removeAttribute("aria-disabled");
            btn_copyfrom.classList.remove("tsa_color_mediumgrey");

            if(!!selected_scheme_pk){
                btn_copyto.removeAttribute("aria-disabled");
                btn_copyto.classList.remove("tsa_color_mediumgrey");
            } else {
                btn_copyto.setAttribute("aria-disabled", true);
                btn_copyto.classList.add("tsa_color_mediumgrey");
            }
        }

        if(!!selected_scheme_pk){
            btn_delete.removeAttribute("aria-disabled");
            btn_delete.classList.remove("tsa_color_mediumgrey");
        } else {
            btn_delete.setAttribute("aria-disabled", true);
            btn_delete.classList.add("tsa_color_mediumgrey");
        }
    }

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(btn_mode, skip_update) {
        //console.log( "==== HandleBtnSelect ========= ", selected_btn );

        selected_btn = btn_mode
        if(!selected_btn){selected_btn = "btn_gridlayout"}

// ---  upload new selected_btn
        if(!skip_update){
            const upload_dict = {"page_scheme": {"btn": selected_btn}};
            UploadSettings (upload_dict, url_settings_upload);
        }

// ---  highlight selected button
        let btn_container = document.getElementById("id_btn_container")
        t_HighlightBtnSelect(btn_container, selected_btn);

// ---  show / hide selected table
        const div_list = ["id_div_tbl_newlayout", "id_div_tbl_schemeitem", "id_div_tbl_shift", "id_div_tbl_teammember", "id_div_data_form"];
        for(let i = 0, div_id, len = div_list.length; i < len; i++){
            let div_tbl = document.getElementById(div_list[i]);
            if(!!div_tbl){
                const data_mode = get_attr_from_el(div_tbl, "data-mode")
                //selected_btns / data_mode are: btn_schemeitem, btn_shift, btn_team, btn_scheme
                if (data_mode === selected_btn){
                    div_tbl.classList.remove(cls_hide);
                } else {
                    div_tbl.classList.add(cls_hide);
                }  // if (tbl_mode === selected_btn)
            }  // if(!!div_tbl){
        }

// ---  highlight row in list table
            let tblBody = document.getElementById("id_tbody_" + selected_btn);
            if(!!tblBody){
                FilterTableRows(tblBody)
            }
// --- update header text
        UpdateHeaderText();

    }  // HandleBtnSelect

//=========  HandleSelectCustomer  ================ PR2019-03-23
    function HandleSelectCustomer(el, called_by) {
        //console.log("--- HandleSelectCustomer --- called by: ", called_by)
        // called by DatalistDownload , select_customer.Event.Change,  ModSchemeEdit

        // in SBR_FillOptionCustomerOrder the first row is set selected=true when there is only one row

// reset lists
        // don't reset lists, all items are already downloaded

// reset selected customer
        selected_cust_pk = 0

// reset selected order
        selected_order_pk = 0
        el_select_order.innerText = null
        el_mod_order.innerText = null
        el_mod_copyfrom_order.innerText = null

// reset tables scheme_select, schemeitems, teammember and team input box
        selected_scheme_pk = 0;
        sidebar_tblBody_scheme.innerText = null;
        sidebar_tblBody_shift.innerText = null;
        sidebar_tblBody_team.innerText = null;

        tblBody_schemeitem.innerText = null;
        tblBody_shift.innerText = null;
        tblBody_teammember.innerText = null;
        el_input_team_code.value = null

        ResetSchemeInputElements();
        DisableSubmenuButtons();

// get selected customer, put name in header
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        // after first DatalistDownload, when there is only 1 customer, selected_cust_pk gets this value
        //  HandleSelectCustomer has then no parameter 'el' and selected_cust_pk has value
        if(!!el){

        // get selected customer from select element
            const sel_cust_value = parseInt(el.value);
            if (!!sel_cust_value){
                selected_cust_pk = sel_cust_value
                selected_order_pk = 0
// --- save selected_cust_pk in Usersettings, not in template mode
                if(!template_mode){
                    setting_cust_pk = selected_cust_pk
                    const upload_dict = {"selected_pk": { "sel_cust_pk": selected_cust_pk, "sel_order_pk": selected_order_pk}};
                    UploadSettings (upload_dict, url_settings_upload);
                }
            // if there is only 1 customer, that one is selected (selected_cust_pk gets value in SBR_FillOptionCustomerOrder)
            // else: use settings_customer if there is one

            } else if (!!setting_cust_pk){
                // check if setting_cust_pk exists
                const map_id = get_map_id ("customer", setting_cust_pk.toString());
                const customer_dict = get_mapdict_from_datamap_by_id(customer_map, map_id);
                if(!isEmpty(customer_dict)){
                    selected_cust_pk = setting_cust_pk
                } else {
                    setting_cust_pk = 0
                }
            }
            UpdateHeaderText();

            if (!!selected_cust_pk){
                el.value = selected_cust_pk

// copy selected customer, to other fields with selected customer
                if (el.id === "id_select_customer") {
                    el_mod_cust.selectedIndex = el.selectedIndex
                    el_mod_copyfrom_cust.selectedIndex = el.selectedIndex
                } else if (el.id === "id_mod_scheme_customer") {
                    el_select_customer.selectedIndex = el.selectedIndex
                    el_mod_copyfrom_cust.selectedIndex = el.selectedIndex
                } else if (el.id === "id_mod_copyfrom_customer") {
                    el_select_customer.selectedIndex = el.selectedIndex
                    el_mod_cust.selectedIndex = el.selectedIndex
                }

        // fill the three select order elements
                SBR_FillOptionCustomerOrder("order", "HandleSelectCustomer", selected_cust_pk)

         // if there is only 1 order, that one is selected (selected_order_pk gets value in SBR_FillOptionCustomerOrder)
        // else: use setting_order_pk if there is one

                const sel_order_value = parseInt(el_select_order.value);
                if (!!sel_order_value){
                    selected_order_pk = parseInt(sel_order_value);
                } else if (!!setting_order_pk){
                    // check if setting_order_pk exists
                    const map_id = get_map_id("order", setting_order_pk.toString());
                    const order_dict = get_mapdict_from_datamap_by_id(order_map, map_id);
                    if(!isEmpty(order_dict)){
                        selected_order_pk = parseInt(setting_order_pk);
        // reset setting_order_pk
                        setting_order_pk = 0
                        el_select_order.value = selected_order_pk
                    }
                }

                if (!!selected_order_pk){
                    HandleSelectOrder(el_select_order, "HandleSelectCustomer")
                };
            }  //  if (!!pk_int)
        }  // if(!!el)
    }  // HandleSelectCustomer

//=========  HandleSelectOrder  ================ PR2019-03-24
    function HandleSelectOrder(el, called_by) {
        console.log("--- HandleSelectOrder ---", called_by)
        //called by HandleSelectCustomer select_order.Event.Change, ModSchemeEdit

// reset lists
        // don't reset, all items from this customer are already downloaded

// reset selected_order_pk order, selected_scheme_pk
        selected_order_pk = 0
        selected_scheme_pk = 0;
// reset select tables
        sidebar_tblBody_scheme.innerText = null;
        sidebar_tblBody_shift.innerText = null;
        sidebar_tblBody_team.innerText = null;
// reset tables scheme_select, schemeitems, teammember and team input box
        tblBody_schemeitem.innerText = null;
        tblBody_shift.innerText = null;
        tblBody_teammember.innerText = null;
        el_input_team_code.value = null;

        ResetSchemeInputElements();
        DisableSubmenuButtons();

// get selected order
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false

        // after first DatalistDownload, when there is only 1 customer, selected_cust_pk gets this value
        //  in that case HandleSelectOrder has no parameter 'el' and selected_order_pk has value
        if(!!el){
            const sel_order_value = parseInt(el.value);
            if (!sel_order_value){
                if (!!setting_order_pk){
                    // check if setting_order_pk exists
                    const map_id = get_map_id("order", setting_order_pk.toString());
                    const order_dict = get_mapdict_from_datamap_by_id(order_map, map_id);
                    if(!isEmpty(order_dict)){
                        selected_order_pk = parseInt(setting_order_pk);
                        setting_order_pk = 0
                    }
                }
            } else {
                selected_order_pk = parseInt(sel_order_value);
    // --- save selected_order_pk in Usersettings, not in template mode
                if(!template_mode){
                    const upload_dict = {"selected_pk": { "sel_cust_pk": selected_cust_pk, "sel_order_pk": selected_order_pk}};
                    UploadSettings (upload_dict, url_settings_upload);
                }
            }
            UpdateHeaderText();

            if (!!selected_order_pk){
                if (el.id === "id_select_order") {
                    el_mod_order.selectedIndex = el.selectedIndex
                    el_mod_copyfrom_order.selectedIndex = el.selectedIndex
                } else if (el.id === "id_mod_scheme_order") {
                    el_select_order.selectedIndex = el.selectedIndex
                    el_mod_copyfrom_order.selectedIndex = el.selectedIndex
                } else if (el.id === "id_mod_copyfrom_order") {
                    el_select_order.selectedIndex = el.selectedIndex
                    el_mod_order.selectedIndex = el.selectedIndex
                }
                SBR_FillSelectTable("scheme", "HandleSelectOrder", selected_scheme_pk, true);
            } //  if (!!pk_int)
        }  // if(!!el){

// select table 'scheme' is filled by SBR_FillSelectTable("scheme"). This function is called in DatalistDownload

    }  // HandleSelectOrder

//=========  HandleSelectRow ================ PR2019-12-01
    function HandleSelectRow(sel_tr_clicked) {
        //console.log( "===== HandleSelectRow  ========= ");
        // selectRow tables are: scheme, shift, team
        // if sel_tr_clicked does not exist: it is a deleted scheme
        let sel_tblName = null, sel_code_value = null, is_addnew_row = false;
        if(!!sel_tr_clicked) {

// ---  get map_dict
            sel_tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
            const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
            const map_id = get_map_id(sel_tblName, pk_str);
            // function 'get_mapdict_from_tblRow.....' returns empty dict if map or key not exist.
            const map_dict = get_mapdict_from_tblRow(sel_tr_clicked)

            is_addnew_row = (get_attr_from_el_str(sel_tr_clicked, "data-addnew") === "true");
            if (is_addnew_row && sel_tblName === "shift"){
// ---  set focus to addnewrow
        // when selectteam: focus to addnew teammember will be set after response of new team
                let tblFoot = document.getElementById("id_tfoot_shift");
                let tblRow = tblFoot.rows[0];
                if (!!tblRow){
                    HandleTableRowClicked(tblRow, true) // true = skip_highlight_selectrow
                    let el_input = tblRow.cells[0].children[0];
                    if (!!el_input){
                        setTimeout(function() {el_input.focus()}, 50);
                    }
                }
            } else  if (!isEmpty(map_dict)){

// ---  get info from mapdict
                const sel_pk_int = get_subdict_value_by_key(map_dict, "id", "pk", 0);
                const sel_ppk_int = get_subdict_value_by_key(map_dict, "id", "ppk", 0);
                sel_code_value = get_subdict_value_by_key(map_dict, "code", "value");

// ---  update selected_scheme_pk
                if (sel_tblName === "scheme"){
                    if(sel_pk_int !== selected_scheme_pk){
                        selected_scheme_pk = sel_pk_int;

// --- deselect selected_shift_pk and selected_team_pk when selected_scheme_pk changes
                        selected_shift_pk = 0;
                        selected_team_pk = 0;

// ---  save selected_scheme_pk in Usersettings, not in template mode
                        if(!template_mode){
                            const upload_dict = {"selected_pk": {"sel_cust_pk": selected_cust_pk,
                                                                 "sel_order_pk": selected_order_pk,
                                                                 "sel_scheme_pk": selected_scheme_pk}};
                            UploadSettings (upload_dict, url_settings_upload);
                        }
                    }
                    UpdateSchemeInputElements(map_dict)

// --- Add ppk_int to _addnewRow of selecttable
                    document.getElementById("sel_shift_addnew").setAttribute("data-ppk", selected_scheme_pk)
                    document.getElementById("sel_team_addnew").setAttribute("data-ppk", selected_scheme_pk)

// --- Fill select table Shift and Teams
                    SBR_FillSelectTable("shift", "HandleSelectRow", selected_shift_pk, false); // false = is not curremt select table
                    SBR_FillSelectTable("team", "HandleSelectRow" , selected_team_pk, false); // false = is not curremt select table

// --- fill data table schemeitems
                    FillTableRows("schemeitem");
                    FillTableRows("shift");
                    FillTableRows("teammember");

// --- fill grid with new scheme
                    Grid_FillGrid(map_dict)

// reset addnew row, fill options shifts and team
                    // needed to update ppk in addnew row PR2020-03-16 was: dont, already called by FillTableRows
                    ResetAddnewRow("schemeitem", "HandleSelectRow")
                    ResetAddnewRow("shift", "HandleSelectRow")
                    ResetAddnewRow("teammember", "HandleSelectRow")
// disable/enable menubutton delete scheme
                    DisableSubmenuButtons()

                } else if (sel_tblName === "shift"){
// ---  update selected_shift_pk
                    selected_shift_pk = sel_pk_int;

                // ---  set focus to selected shift row
                        // --- lookup row 'add new' in tFoot
                        const tblName = (sel_tblName === "shift") ? "shift" : "teammember";
                        const len = tblBody_shift.rows.length;
                        if (!!len){
                            for (let i = 0; i < len; i++) {
                                const tblRow = tblBody_shift.rows[i]
                                const row_shift_pk = get_attr_from_el(tblRow,"data-pk")
                                if (row_shift_pk === selected_shift_pk.toString()){
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
// ---  update selected_team_pk
                    selected_team_pk = sel_pk_int;
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
        } else if (sel_tblName === "shift" || sel_tblName === "team"){
            ChangeBackgroundRows(sidebar_tblBody_scheme, cls_bc_lightlightgrey, true)
            let tblBody_this = (sel_tblName === "shift") ? sidebar_tblBody_shift : sidebar_tblBody_team;
            let tblBody_other1 = (sel_tblName === "shift") ? sidebar_tblBody_team : sidebar_tblBody_shift;
            ChangeBackgroundRows(tblBody_this, cls_bc_yellow_lightlight, false, sel_tr_clicked, cls_bc_yellow)
            ChangeBackgroundRows(tblBody_other1, cls_bc_lightlightgrey, false)
        }

// --- get header_text
        UpdateHeaderText()

// reset input fields and tables
        //ResetSchemeInputElements()

// put selected team_code in el_input_team_code
        const team_code = (sel_tblName === "team" && !!sel_code_value) ? sel_code_value : null
        el_input_team_code.value = team_code

// hide or show tables
        //console.log( "sel_tblName", sel_tblName);

        // change selected_btn to 'team' when team is selected, to 'shift' when shift is selected,
        // when scheme is selected and btn_mode = "btn_schemeitem : let it stay,
        // goto btn_gridlayout otherwise

        const btn_mode = (sel_tblName === "team") ? "btn_team" :
                         (sel_tblName === "shift") ? "btn_shift" :
                         (sel_tblName === "scheme" && selected_btn === "btn_schemeitem") ? "btn_schemeitem" : "btn_gridlayout";
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
        const sel_scheme_or_team_pk = (sel_tblName === "team") ? selected_team_pk : selected_scheme_pk
        const item_tblName = (sel_tblName === "team") ? "teammember" :
                             (sel_tblName === "shift") ? "shift" : "schemeitem";
        UpdateAddnewRow(item_tblName, sel_scheme_or_team_pk);

// --- hide or show fill buttons in schemeitems
        const show_buttons = (sel_tblName === "scheme")
        ShowButtonsTableSchemeitem(show_buttons);
    }  // HandleSelectRow

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked, skip_highlight_selectrow) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        const tblName = get_attr_from_el(tr_clicked, "data-table");

        let tblBody = document.getElementById("id_tbody_" + tblName)
        DeselectHighlightedTblbody(tblBody, cls_selected)

        let tblFoot = document.getElementById("id_tfoot_" + tblName)
        DeselectHighlightedTblbody(tblFoot, cls_selected)

        tr_clicked.classList.add(cls_selected)

// ---  get clicked tablerow
        if(!!tr_clicked) {

            selected_item_pk = get_datapk_from_element(tr_clicked)

// ---  highlight row in selecttable, not when called by handleselectrow
            if(!!skip_highlight_selectrow){
                const tblName = get_attr_from_el(tr_clicked, "data-table")
                if (["shift", "team"].indexOf( tblName ) > -1){
                    let tblBody_select = (tblName === "shift") ? sidebar_tblBody_shift : sidebar_tblBody_team;
                    //  params: tableBody, cls_selected, cls_background
                    HighlightSelectRowByPk(tblBody_select, selected_item_pk, cls_bc_yellow, cls_bc_yellow_lightlight);
                }
            }
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

        let cat_sum = get_subdict_value_by_key(itemdict, "cat", "value")
        let is_restshift = get_subdict_value_by_key(itemdict, "isrestshift", "value", false)
        //console.log("is_restshift", is_restshift, typeof is_restshift);

        is_restshift = (!is_restshift)
        el_changed.setAttribute("data-value", is_restshift);
        //console.log("is_restshift", is_restshift);

        // update icon
        const imgsrc = (is_restshift) ? imgsrc_rest_black : imgsrc_stat00;

        el_changed.children[0].setAttribute("src", imgsrc);

        let id_dict = get_dict_value_by_key(itemdict, "id")
        let upload_dict = {"id": id_dict, "isrestshift": {"value": is_restshift, "update": true}}

        const url_str = url_scheme_shift_team_upload;
        UploadChanges(upload_dict, url_str);
    }  // HandleRestshiftClicked

//========= HandleInactiveClicked  ============= PR2019-08-10
    function HandleInactiveClicked(el_changed) {
        //console.log("======== HandleInactiveClicked  ========");
        //console.log(el_changed);

        let is_inactive_str = get_attr_from_el(el_changed, "data-value")
        let is_inactive = false;
        if (is_inactive_str === "true"){is_inactive = true};

        // toggle value of is_inactive
        is_inactive = !is_inactive;
        //console.log("is_inactive: ", is_inactive, typeof is_inactive);
        el_changed.setAttribute("data-value", is_inactive);

        // update icon
        let imgsrc = (!!is_inactive) ? imgsrc_inactive_black : imgsrc_inactive_grey
        el_changed.children[0].setAttribute("src", imgsrc);

        UploadElChanged(el_changed)
    }  // HandleInactiveClicked

// +++++++++  HandleBtnSchemeitems  ++++++++++++++++++++++++++++++ PR2019-03-16 PR2019-06-14
    function HandleBtnSchemeitems(param_name, skip_confirm) {
        console.log("=== HandleBtnSchemeitems =========", param_name);

        if (!!selected_scheme_pk){
        // params are: prev, next, dayup, daydown, autofill, delete
            if (param_name === "delete" && !skip_confirm) {
                ModConfirmOpen("schemeitem_delete");
            } else {
                let parameters = {"upload": JSON.stringify ({"mode": param_name, "scheme_pk": selected_scheme_pk})};
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
                            console.log( "schemeitem_list selected_scheme_pk", selected_scheme_pk, typeof selected_scheme_pk);
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
    } // function HandleBtnSchemeitems
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
    function HandleCreateSchemeItem() {
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
        const len = tblBody_schemeitem.rows.length
        if (len > 0) {
            let tblRow = tblBody_schemeitem.rows[len -1];

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
            rosterdate_dict = today_dict
            rosterdate_dict["data_value"] = rosterdate_dict["value"];
            // unknown o_value triggers save action in uploadcahnges
            rosterdate_dict["data_o_value"] = "---"
        };

        item_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "create": true};
        item_dict["rosterdate"] = rosterdate_dict;
        if(!!timeend_dict){item_dict["timestart"] = timeend_dict}

        // CreateTblRow(tblName, pk_int, ppk_int, is_new_item, row_count, row_index
        let tblRow = CreateTblRow("tbody", "schemeitem", pk_new, parent_pk, true)

// Update TableRow
        // console.log("eitem_dict", item_dict);
        UpdateTableRow(tblRow, item_dict)
    }

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        //console.log("=========  function HandleFilterInactive =========");
// toggle value
        filter_hide_inactive = !filter_hide_inactive

// toggle icon
        let imgsrc = (!!is_inactive) ? imgsrc_inactive_black : imgsrc_inactive_grey;
        el.firstChild.setAttribute("src", img_src);

        FilterTableRows(sidebar_tblBody_scheme, "", 1, filter_hide_inactive)
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
            const id_dict = get_dict_value_by_key (item_dict, "id");
                const tblName = ("table" in id_dict) ? id_dict["table"] : null;
                const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
                const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
                const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
                const map_id =  get_map_id(tblName, pk_int.toString());
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            const inactive_value = get_subdict_value_by_key(item_dict, "inactive", "value", false);

//--------- insert tableBody row
            const row_id = id_sel_prefix + map_id
            tblRow = tblBody_select.insertRow(row_index);

            tblRow.setAttribute("id", row_id);
            tblRow.setAttribute("data-map_id", map_id );
            tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-inactive", inactive_value);

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
                td.addEventListener("click", function() {HandleSelectRow(tblRow, "event")}, false)
            }
//--------- add active img to second td in table
            td = tblRow.insertCell(-1);
                el_a = document.createElement("a");
                CreateBtnDeleteInactive("delete", tblRow, el_a);
//--------- add hover delete img
                td.addEventListener("mouseenter", function() {
                    td.children[0].children[0].setAttribute("src", imgsrc_deletered);
                });
                td.addEventListener("mouseleave", function() {
                    td.children[0].children[0].setAttribute("src", imgsrc_delete);
                });
            td.appendChild(el_a);
            td.classList.add("td_width_032");

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
                selected_shift_pk = 0
                HandleSelectRow(sel_tblRow)
            } else  if (tblName === "team"){
                selected_team_pk = 0
// ---  create upload_dict
                const upload_dict = {"id":{"temp_pk": pk_str, "ppk": ppk_int, "table": tblName, "create": true}}
                const url_str = url_scheme_shift_team_upload;
                UploadChanges(upload_dict, url_str);
                //HandleSelectTable(sel_tblRow)
            }


        }  //  if (!!tblRow)
    }  // HandleSelectAddnewRow

//========= SBR_FillOptionCustomerOrder  ====================================
    function SBR_FillOptionCustomerOrder(tblName, called_by, ppk_str) {
        //console.log( "=== SBR_FillOptionCustomerOrder called by: ", called_by);

// ---  fill options of select box
        let option_text = "";
        let row_count = 0
        let ppk_int = 0

        // customer list has no ppk_str
        if (!!ppk_str){ppk_int = parseInt(ppk_str)};

        let select_text = (tblName === "customer") ? loc.Select_customer : (tblName === "order") ? loc.Select_order : null;
        let select_text_none = (tblName === "customer") ? loc.No_customes : (tblName === "order") ? loc.No_orders : null;

        const data_map = (tblName === "customer") ? customer_map :
                         (tblName === "order") ? order_map : null

        const selected_pk = (tblName === "customer") ? selected_cust_pk :
                            (tblName === "order") ? selected_order_pk : null

        //console.log( "selected_pk", selected_pk);
        //console.log( "ppk_int", ppk_int);
        //console.log( "select_text_none", select_text_none);
//--- loop through option dict

// --- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_in_dict = get_ppk_from_dict(item_dict);
            const is_template = get_dict_value(item_dict, ["id", "istemplate"], false);
            const code_value = get_dict_value(item_dict, ["code", "value"], "-");
            //console.log( "code_value  ", code_value, pk_int, ppk_in_dict, is_template);
    // filter is_template
            if (is_template === template_mode) {
                // skip if ppk_int exists and does not match ppk_in_dict (not in tbl customer)
                if ((!!ppk_int && ppk_int === ppk_in_dict) || (tblName === "customer")) {
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
        // put option_text in select elements
        let el_select;
        for (let i = 0; i < 3; i++) {
            if (tblName === "order") {
                el_select = (i === 0) ? el_select_order : (i === 1) ? el_mod_order : el_mod_copyfrom_order;
            } else if (tblName === "customer") {
                el_select = (i === 0) ? el_select_customer : (i === 1) ? el_mod_cust : el_mod_copyfrom_cust;
            }
            el_select.innerHTML = option_text;
            // if there is only 1 option: select first option
            if (select_first_option){
                el_select.selectedIndex = 0
            }
        }
        //console.log("el_select.selectedIndex", el_select.selectedIndex);
    }  //function SBR_FillOptionCustomerOrder


//========= SBR_FillSelectTable  ============= PR2019-09-23
    function SBR_FillSelectTable(tblName, called_by, selected_pk, is_current_table) {
        console.log( "=== SBR_FillSelectTable === ", tblName, called_by);
        //console.log( "tblName: ", tblName, "is_current_table: ", is_current_table);
        //console.log( "selected_pk: ", selected_pk, "selected_order_pk: ", selected_order_pk);

        let selected_ppk_int = 0;
        const selected_map_id = get_map_id(tblName, selected_pk.toString());

        let caption_one, caption_multiple ;
        let tblBody, data_map, el_a, firstRow, selectedRow;

        if (tblName === "template"){
            // used in ModCopyfromTemplateOpen
            data_map = scheme_map;
            tblBody = document.getElementById("id_mod_copyfrom_tblbody");

            caption_one = loc.Template;
            caption_multiple = loc.Select_template + ":"

        } else if (tblName === "scheme"){
            data_map = scheme_map;
            tblBody = sidebar_tblBody_scheme

            // always delete innerText of sidebar_tblBody_shift and of sidebar_tblBody_team
            sidebar_tblBody_shift.innerText = null;
            sidebar_tblBody_team.innerText = null;

            selected_ppk_int = selected_order_pk;

            caption_one = loc.Scheme;
            caption_multiple = loc.Select_scheme + ":";

        } else if (tblName === "shift"){
            selected_ppk_int =  selected_scheme_pk;
            data_map = shift_map
            tblBody = sidebar_tblBody_shift

            caption_one = loc.Shifts + ":";
            caption_multiple = caption_one

        } else if (tblName === "team"){
            selected_ppk_int =  selected_scheme_pk;
            data_map = team_map
            tblBody = sidebar_tblBody_team

            caption_one = loc.Teams + ":";
            caption_multiple = caption_one

        }
        tblBody.innerText = null;

        let row_count = 0;
// --- loop through data_map
        //console.log( "data_map: ", data_map);
        for (const [map_id, item_dict] of data_map.entries()) {
            const pk_int = get_dict_value(item_dict, ["id", "pk"], 0);
            const ppk_int = get_dict_value(item_dict, ["id", "ppk"], 0);
            const code_value = get_dict_value(item_dict, ["code", "value"], "");
            const code_suffix = get_dict_value(item_dict, ["code", "suffix"], "");
            const title_str = get_dict_value(item_dict, ["code", "title"], "");
            const offsetstart = get_dict_value(item_dict,["offsetstart", "offset"]);
            const offsetend = get_dict_value(item_dict, ["offsetend", "offset"]);
            const isrestshift = get_dict_value(item_dict, ["isrestshift", "value"], false);
            const is_inactive = get_dict_value(item_dict, ["inactive", "value"], false);
            const is_template = get_dict_value(item_dict, ["id", "istemplate"], false);

//--- set title
            let title = ""
            if (tblName === "shift"){
                if (offsetstart != null || offsetend != null) {
                    const display_offsetstart = (offsetstart != null) ? display_offset_time (loc, offsetstart) : "";
                    const display_offsetend =  (offsetend != null) ? display_offset_time (loc, offsetend, true) : "";
                    title = display_offsetstart + " - " + display_offsetend
                }
                if(isrestshift){
                    if (!!title) {title += "\n"};
                    title += loc.Rest_shift;
                }
            } else if (tblName === "team"){
            // put line breaks instead of ";" "&#10" not working)
                title = title_str.replace(/; /g, "\n")
            }
            //console.log( "ppk_int: ", ppk_int, "selected_ppk_int: ", selected_ppk_int, "are equal: ", (ppk_int === selected_parent_pk));

//--- only show items of ppk_int
            // didn't show scheme because selected_ppk_int was string, coudn't find why, I've put parseInt everywhere
            let add_row = false
            if (tblName === "template"){
                add_row = (is_template)
            } else {
                add_row = (ppk_int === selected_ppk_int)
            }
            if (add_row){
//--------- insert tblBody row
                let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                const row_id = "sel_" + map_id;
                tblRow.setAttribute("id", row_id);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-map_id", map_id);
                tblRow.setAttribute("data-table", tblName);
                tblRow.setAttribute("data-inactive", is_inactive);
//- set background color of table and selected row
                const class_bg_color = ((tblName === "template")) ? "tsa_bc_transparent" :
                               (!!is_current_table) ? cls_bc_yellow_lightlight : cls_bc_lightlightgrey;
                const cls_bc = (selected_map_id === map_id) ? cls_bc_yellow : class_bg_color;
                tblRow.classList.add(cls_bc);
// --- add hover to select row
                tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover)});
                tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover)});
// --- add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);
                let inner_text = code_value
                if (tblName === "shift"){
                    const is_restshift = get_subdict_value_by_key(item_dict, "isrestshift", "value", false)
                    if (is_restshift) { inner_text += " (R)"}
                } else if (tblName === "team"){
                    if (!!code_suffix) { inner_text += code_suffix}
                }
// --- create div element
                el_a = document.createElement("div");
                    el_a.innerText = inner_text;
                    el_a.title = title;
                    el_a.setAttribute("data-field", "code");
                    el_a.setAttribute("data-value", code_value);
                td.appendChild(el_a);
                td.classList.add("px-2")
// --- add EventListener
                if (tblName === "scheme"){
                    tblRow.addEventListener("click", function() {HandleSelectRow(tblRow, "event")}, false )
                } else if(["shift","team"].indexOf(tblName) > -1) {
                    td.addEventListener("click", function() {HandleSelectRow(tblRow, "event")}, false )
                } else if (tblName === "template"){
                    td.addEventListener("click", function() {ModCopyfromSelect(tblRow)}, false )
                }
//--------- set width of template
                if (tblName === "template") {
                    td.classList.add("td_width_200")
//--------- add delete img to second td in table, not in modtemplate
                } else {
                    td = tblRow.insertCell(-1);
                        el_a = document.createElement("a");
                        const delete_inactive = (tblName === "scheme") ? "inactive" : "delete";
                        CreateBtnDeleteInactive(delete_inactive, tblRow, el_a, is_inactive);
                    td.appendChild(el_a);
                    td.classList.add("td_width_032")
                }
// --- remember first row
                if(!firstRow){firstRow = tblRow}
// --- count tblRow
                row_count += 1
// --- check if selected_scheme exists
                if (tblName === "scheme" && !selectedRow && pk_int === selected_scheme_pk){
                    selectedRow = tblRow;
                }
            } //  if (add_row)
        } // for (const [pk_int, item_dict] of data_map.entries())

// --- show select_table scheme when selected_order_pk exists
        if (!!selected_order_pk){
            document.getElementById("id_select_table_scheme").classList.remove(cls_hide)
        } else {
            document.getElementById("id_select_table_scheme").classList.add(cls_hide)
        }
// --- show select_table shift and team hen selected_order_pk exists
        if (!!selected_scheme_pk){
            document.getElementById("id_select_table_shift").classList.remove(cls_hide)
            document.getElementById("id_select_table_team").classList.remove(cls_hide)
        } else {
            document.getElementById("id_select_table_shift").classList.add(cls_hide)
            document.getElementById("id_select_table_team").classList.add(cls_hide)
        }

// ++++++ select scheme if only 1 exists or when setting_scheme_pk has value and selectedRow exists ++++++
        // Dont highlight yet, scheme info is not downoloaded yet so teams and shift are not yet filled
        if (tblName === "scheme"){
            if (row_count === 1 && !!firstRow){
               //HandleSelectRow(firstRow, "firstRow");
            } else if(!!selectedRow){
                HandleSelectRow(selectedRow, "selectedRow");
            }
        }
    } // SBR_FillSelectTable

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
                    CreateBtnDeleteInactive("inactive", tHeadRow, el_a, false);
                td.appendChild(el_a);
                td.classList.add("td_width_032")
            }
        }
    }  // CreateSelectHeaderRows

//========= CreateSelectAddnewRow  ============= PR2019-11-01
    function CreateSelectAddnewRows() {
        //console.log(" ===CreateSelectAddnewRows tblName: " , tblName)


        const tblList = ["scheme", "shift", "team"]
        for (let i = 0; i < 3; i++) {
            const tblName = (tblList[i]);

            let ppk_int = (tblName === "scheme") ? selected_order_pk : selected_scheme_pk
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
                    el_a.innerText = get_attr_from_el(el_data, "data-txt_scheme_add") + "..."
                    el_a.addEventListener("click", function() {ModSchemeOpen()}, false )
                } else if (tblName === "shift"){
                    el_a.innerText = get_attr_from_el(el_data, "data-txt_shift_add") + "..."
                    el_a.addEventListener("click", function() {HandleSelectAddnewRow(tblRow)}, false )
                } else if (tblName === "team"){
                    el_a.innerText = get_attr_from_el(el_data, "data-txt_team_add") + "..."
                    el_a.addEventListener("click", function() {HandleSelectAddnewRow(tblRow)}, false )
                };
                el_a.classList.add("tsa_color_darkgrey");
            td.appendChild(el_a);
            td.setAttribute("colspan", "2");
            td.classList.add("px-2")

        }
    }  // CreateSelectAddnewRows

//=========  CreateTblHeader  === PR2019-12-01
    function CreateTblHeaders() {
        //console.log("===  CreateTblHeaders == ");

        const thead_text = {schemeitem: [loc.Date, loc.Shift, loc.Team, "", ""],
                          shift: [loc.Shift, "" , loc.Start_time, loc.End_time, loc.Break, loc.Hours],
                          teammember: [loc.Employee, loc.Start_date, loc.End_date, loc.Replacement_employee, ""]}

        const tblName_list = ["schemeitem", "shift", "teammember"]
        tblName_list.forEach(function (tblName, index) {

            let tblHead = document.getElementById("id_thead_" + tblName);
            tblHead.innerText = null

            let tblRow = tblHead.insertRow (-1);  // index -1: insert new cell at last position.

//--- insert td's to tblHead
            for (let j = 0; j < tbl_col_count[tblName]; j++) {

// --- add th to tblRow.
                let th = document.createElement("th");
                tblRow.appendChild(th);

// --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
                th.appendChild(el_div)

// --- add innerText to el_div
                el_div.innerText = thead_text[tblName][j];
                el_div.setAttribute("overflow-wrap", "break-word");

// --- add margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")}
// --- add left margin to offset end (left outlined, to keep '02.00 >' in line with '22.00'
                if (tblName === "schemeitem" && j ===  4){el_div.classList.add("ml-4")}
// --- add width to el
                el_div.classList.add("td_width_" + field_width[tblName][j])
// --- add textalign to el
                el_div.classList.add("text_align_" + field_align[tblName][j])

// --- add imgsrc_rest_black to shift header, inactive_black to schemeitem
                if (tblName === "shift" && j === 1) {
                    AppendChildIcon(el_div, imgsrc_rest_black)
                    el_div.classList.add("ml-4")
                    el_div.title = get_attr_from_el(el_data, "data-txt_shift_rest")
                } else if (tblName === "schemeitem" && j === 7) {
                    AppendChildIcon(el_div, imgsrc_inactive_black);
                    el_div.classList.add("ml-4")
                }
            }  // for (let j = 0; j < column_count; j++)
            if (tblName === "schemeitem"){
                CreateTblHeaderFilter(tblName)
            }
        })  // tblName_list.forEach(function (tblName, index)
    };  //function CreateTblHeader

//=========  CreateTblFooters  === PR2019-12-01
    function CreateTblFooters() {
        console.log("===  CreateTblFooters == ");
        const tblName_list = ["schemeitem", "shift", "teammember"]
        tblName_list.forEach(function (tblName, index) {
// --- function adds row 'add new' in tFoot
            CreateTblFooter(tblName)
        });
    };  //function CreateTblFooters

//=========  CreateTblFooter  === PR2019-12-01
    function CreateTblFooter(tblName) {
        //console.log("===  CreateTblFooter == ");
// --- function adds row 'add new' in tFoot
        let tblFoot = document.getElementById("id_tfoot_" + tblName);
        if(!!tblFoot){
            let dict = {};
            id_new += 1;
            const pk_new = "new" + id_new.toString()

            // CreateTblRow(prefix, tblName, pk_int, ppk_int, is_new_row, row_count, row_index)
            // selected_scheme_pk is still 0 when footer is created
            let tblRow = CreateTblRow("tfoot", tblName, pk_new, selected_scheme_pk, true);

            dict["id"] = {"pk": pk_new, "ppk": selected_scheme_pk, "temp_pk": pk_new, "table": tblName};
            if (tblName === "schemeitem"){dict["rosterdate"] = today_dict; }
            UpdateTableRow(tblRow, dict);

        }  //  if(!!tblFoot)
    };  //function CreateTblFooter

//=========  ResetAddnewRow === PR2019-12-01
    function ResetAddnewRow(tblName, called_by) {
       // console.log("===  ResetAddnewRow == ", tblName, called_by);

        const ppk_int = (tblName === "team") ? selected_team_pk : selected_scheme_pk
        //console.log("ppk_int ", ppk_int);
        //console.log("rosterdate_dict ", rosterdate_dict);

    // --- lookup row 'add new' in tFoot
        let tblFoot = document.getElementById("id_tfoot_" + tblName);
        let tblRow = tblFoot.rows[0];
        tblRow.setAttribute("data-ppk", selected_scheme_pk);

        let el_input_firstfield = tblRow.cells[0].children[0];
        if(!!el_input_firstfield){
            el_input_firstfield.value = null

        // in schemeitems: fill option list shift and team
            if(tblName === "schemeitem"){
                if(!isEmpty(rosterdate_dict)){
                    const field_dict = rosterdate_dict //{"value: "2019-11-30"
                    //const hide_weekday = false, hide_year = true;
                    format_date_element (el_input_firstfield, el_msg, field_dict, month_list, weekday_list,
                                        loc.user_lang, loc.comp_timezone, false, true)
                }
                if(!!selected_scheme_pk){
                    tblRow.cells[1].children[0].innerHTML = FillOptionShiftOrTeamFromMap(shift_map, ppk_int, null, true)
                    tblRow.cells[2].children[0].innerHTML = FillOptionShiftOrTeamFromMap(team_map, ppk_int)
                }

        // in schemeitems: disable add teammember when template
            } else if(tblName === "teammember"){
                el_input_firstfield = template_mode;
                // cannot adddate in addnewrow
                tblRow.cells[1].children[0].disabled = true;
                tblRow.cells[2].children[0].disabled = true;
            }

        }  // if(!!el_input_firstfield){


        tblRow.classList.remove(cls_selected);

    };  //function ResetAddnewRow


//=========  CreateTblHeaderFilter  ================ PR2019-09-15
    function CreateTblHeaderFilter(tblName) {
        //console.log("=========  CreateTblHeaderFilter =========");

        let thead_items = document.getElementById("id_thead_schemeitem");
        // only table 'schemeitem' has filter row
//+++ insert tblRow ino thead_items
        let tblRow = thead_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "id_thead_filter");
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        let column_count = tbl_col_count[tblName];
        for (let j = 0, td, el; j < column_count; j++) {
// insert td ino tblRow
            td = tblRow.insertCell(-1);
// create element
            let tag_name = field_tags[tblName][j];
            if(tag_name === "select") {tag_name = "input"}
            el = document.createElement(tag_name);
// add fieldname
            el.setAttribute("data-field", field_names[tblName][j])
// --- skip inactve and delete row
             if ([7, 8].indexOf( j ) > -1){
                //el = document.createElement("a");
                //el.setAttribute("href", "#");
                //AppendChildIcon(el, imgsrc_inactive_black, "18");
                //el.classList.add("ml-2")
            } else {
// --- add input element to td.
                el.setAttribute("type", "text");
                el.classList.add("tsa_color_darkgrey")
                el.classList.add("tsa_transparent")
                el.classList.add("td_width_090")
// --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");
            }  //if (j === 0)
// --- add EventListener to td
            el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});
            td.appendChild(el);

// --- add width to td
            el.classList.add("td_width_" + field_width[tblName][j])

// --- add textalign to th
            el.classList.add("text_align_" + field_align[tblName][j])

        }  // for (let j = 0;
    };  //function CreateTblHeaderFilter

//========= FillTableRows  ====================================
    function FillTableRows(tblName) {
        //console.log( "===== FillTableRows  ========= ", tblName);
        // tblNames are: schemeitem, shift, teammember
// --- reset tblBody
        let tblBody = document.getElementById("id_tbody_" + tblName);
        tblBody.innerText = null;

// --- get  item_list
        let data_map, sel_pk_int, sel_ppk_int;
        if (tblName === "shift"){
            data_map = shift_map;
            sel_ppk_int = selected_scheme_pk
            sel_pk_int = selected_shift_pk
        } else if (tblName === "teammember"){
            data_map = teammember_map;
            sel_ppk_int = selected_team_pk
        } else if (tblName === "schemeitem"){
            data_map = schemeitem_map;
            sel_ppk_int = selected_scheme_pk
        };

        rosterdate_dict = {};
        let tblRow;
        let row_count = 0;

        if (!!sel_ppk_int){
        console.log( "sel_ppk_int", sel_ppk_int);

// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const id_dict = get_dict_value_by_key(item_dict, "id")
                const pk_int = get_dict_value_by_key(id_dict, "pk");
                const ppk_int = get_dict_value_by_key(id_dict, "ppk");
                const is_template = get_dict_value_by_key(id_dict, "istemplate", false)

// --- add item if ppk_int = selected_ppk_int (list contains items of all parents)
//         also filter istemplate
                if (!!ppk_int && ppk_int === sel_ppk_int && template_mode === is_template){
                    // CreateTblRow(prefix, tblName, pk_int, ppk_int, is_new_row, row_count, row_index) {
                    tblRow = CreateTblRow("tbody", tblName, pk_int, sel_ppk_int, false);
                    UpdateTableRow(tblRow, item_dict);
// --- get rosterdate to be used in addnew row
                    rosterdate_dict =  get_dict_value_by_key(item_dict, 'rosterdate');
                    row_count += 1;
// --- highlight selected row
                    if (pk_int === sel_pk_int) {
                        tblRow.classList.add(cls_selected)
                    }
                }
            }  // for (const [pk_int, item_dict] of data_map.entries())
        }  // if (!!len)

        if (tblName === "schemeitem"){
            if(isEmpty(rosterdate_dict)){rosterdate_dict = today_dict}
            //console.log("rosterdate_dict", rosterdate_dict)
            ResetAddnewRow(tblName, "FillTableRows");
        }
    }  // FillTableRows

//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(prefix, tblName, pk_int, ppk_int, is_addnew_row, row_count, row_index) {
        //console.log("=========  CreateTblRow =========");
        //console.log("tblName", tblName, typeof tblName);
        //console.log("pk_int", pk_int, typeof pk_int);
        //console.log("ppk_int", ppk_int, typeof ppk_int);
        //console.log("is_addnew_row", is_addnew_row, typeof is_addnew_row);
        //console.log("template_mode", template_mode, typeof template_mode);

// --- insert tblRow ino tblBody or tFoot
        let tblBody_or_tFoot = document.getElementById("id_" + prefix + "_" + tblName);
        let tblRow = tblBody_or_tFoot.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        const map_id = get_map_id(tblName, pk_int);
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", tblName);

// --- put data-addnew in tr when is_addnew_row
        if (is_addnew_row){
            tblRow.setAttribute("data-addnew", true);
        }

// --- add EventListener to tblRow (add EventListener to element will be done further).
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's into tblRow
        let column_count = tbl_col_count[tblName];
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// create element with tag from field_tags
            let el = document.createElement(field_tags[tblName][j]);

            // last td is delete button, not in shift table
            if (!is_addnew_row && tblName !== "shift" && j === column_count - 1){
            // --- first add <a> element with EventListener to td
                CreateBtnDeleteInactive("delete", tblRow, el);
            } else if (!is_addnew_row && tblName === "shift" && j === 1){
                // restshift , not in addnew_row
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {HandleRestshiftClicked(el, tblName);}, false )
                AppendChildIcon(el, imgsrc_stat00)
                el.classList.add("ml-4")
            } else if (!is_addnew_row && tblName === "schemeitem" && j === column_count - 2){
                // BtnDeleteInactive , not in addnew_row
            // --- first add <a> element with EventListener to td inactive
                CreateBtnDeleteInactive("inactive", tblRow, el);

            } else {
                el.setAttribute("type", "text");
            }

// --- add data-name Attribute.
            el.setAttribute("data-field", field_names[tblName][j]);

// --- add placeholder
            if (is_addnew_row ){
                const placeholder = (tblName === "schemeitem" && j === 1) ? loc.Add_shift :
                                  (tblName === "shift" && j === 0) ? loc.Add_shift :
                                  (tblName === "teammember" && j === 0 && !template_mode) ? loc.Add_employee : null;
                if(!!placeholder){el.setAttribute("placeholder", placeholder +  "...")}
            }

// --- make rosterdate grey in new schemeitem
            if (tblName === "schemeitem" && j === 0){
                if(is_addnew_row){
                    el.classList.add("tr_color_disabled")
                } else {
                    el.classList.remove("tr_color_disabled")
                }
            }

// --- disable inpout in addnewrow, exept for first col (schemeitem also second colum
            const col_first = ( tblName === "schemeitem") ? 2:1;
            if (is_addnew_row && j >= col_first){
                el.disabled = true;
            }

// --- add EventListener to td
            if (tblName === "schemeitem"){
                if (j === 0) {
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false);
                } else if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadElChanged(el)}, false)
                };
            } else if (tblName === "shift"){
                if ([0, 1].indexOf( j ) > -1){
                     el.addEventListener("change", function() {UploadElChanged(el)}, false)
                } else if ([2, 3, 4, 5].indexOf( j ) > -1){
                    // both data-toggle and href needed for toggle modal form
                    el.setAttribute("data-toggle", "modal")
                    el.setAttribute("href", "#id_mod_timepicker")
                    el.addEventListener("click", function() {HandleTimepickerOpen(el)}, false)};
            } else if ((tblName === "teammember") && (!template_mode) ){
                if ([0, 3].indexOf( j ) > -1){
                    el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )} else
                if (([1, 2].indexOf( j ) > -1) && (!is_addnew_row)){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)};
            }

// --- add datalist_ to td shift, team, employee
            // called by DatalistDownload, info not downloaded yet when rows are created
            if (tblName === "schemeitem"){
                if (j === 1) {
                    el.innerHTML = FillOptionShiftOrTeamFromMap(shift_map, ppk_int, null, true)
                } else if (j === 2) {
                    el.innerHTML = FillOptionShiftOrTeamFromMap(team_map, ppk_int)
                }
            } else if (tblName === "teammember"){
               // if (j === 0) {
                    //el.setAttribute("list", "id_datalist_" + field_names[tblName][j] + "s")}
            }

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}

// --- add margin to last column, only in shift table column
            if (tblName === "shift" && j === column_count - 1 ){el.classList.add("mr-2")}

// --- add text_align and width to fields
            el.classList.add("text_align_" + field_align[tblName][j])
            el.classList.add("td_width_" + field_width[tblName][j])

// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
            //el.classList.add("tsa_transparent");
            //el.classList.add("tsa_bc_transparent");
            if ( tblName === "schemeitem"){
                if (j === 0) {
                    el.classList.add("input_popup_date")
                    // TODO tsa_transparent necessaryfor now, is removed prom input_popup_date becasue of datepicker in scheme box. To be changed
                    el.classList.add("tsa_transparent")
                } else { el.classList.add("input_text"); }; // makes background transparent
            } else if ( tblName === "shift"){
                if ([0].indexOf( j ) > -1) { el.classList.add("input_text")} else  // makes background transparent
                // TODO enable timeduration if ([2, 3, 4, 5].indexOf( j ) > -1
                if ([2, 3, 4, 5].indexOf( j ) > -1){ el.classList.add("input_timepicker")}
            } else if ( tblName === "teammember"){
                if ([0, 3].indexOf( j ) > -1) { el.classList.add("input_text")} else  // makes background transparent
                if ([1, 2].indexOf( j ) > -1){
                    el.classList.add("input_popup_date");
                    el.classList.add("tsa_transparent");
                }
            };
    // --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

// --- add input element to td.
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

//=========  ResetSchemeInputElements  ================ PR2019-12-01
    function ResetSchemeInputElements() {
        // reset el_input in scheme_form
        const el_list = ["id_scheme_code", "id_scheme_cycle", "id_scheme_datefirst", "id_scheme_datelast"];
        el_list.forEach(function (id_str, index) {
            let el_input = document.getElementById(id_str)
            el_input.value = null;
            el_input.readOnly = true;
            el_input.removeAttribute("data-pk");
            el_input.removeAttribute("data-ppk");
            //if(index === "id_scheme_pricerate"){
            //    el_input.classList.remove("tsa_color_mediumgrey")
            //}
        });

        document.getElementById("id_scheme_excludepublicholiday").checked = false
        document.getElementById("id_scheme_excludecompanyholiday").checked = false

        document.getElementById("id_menubtn_delete_scheme").disabled = true
    }

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23 PR2020-03-19 PR2020-04-13
    function CreateBtnDeleteInactive(mode, tblRow, el_input, is_inactive){
        //console.log(" === CreateBtnDeleteInactive ===", mode)
        el_input.setAttribute("href", "#");

        // dont shwo title 'delete'
        // const data_id = (tblName === "customer") ? "data-txt_customer_delete" : "data-txt_order_delete"
        // el.setAttribute("title", get_attr_from_el(el_data, data_id));
        const tblName = get_attr_from_el(tblRow, "data-table")
        // was: if(tblName === "grid_teammember"){
        if(tblName === "teammember"){
            el_input.addEventListener("click", function() {MGT_DeleteTeammember(tblRow)}, false )
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
        el_input.classList.add("ml-4")

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
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "");

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
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "");

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
        console.log("======== Upload_Scheme");

        let upload_dict = {};

// ---  create id_dict
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected_scheme_pk)
        let id_dict = get_dict_value_by_key(map_dict, "id");
        console.log("id_dict: ", id_dict);

// add id_dict to upload_dict
        if (!isEmpty(id_dict)){

// skip if parent_pk does not exist (then it is an empty scheme)
            if(!!id_dict["ppk"]){
                upload_dict["id"] = id_dict
                if(!!id_dict["pk"]){upload_dict["pk"] = id_dict["pk"]}

    // ---  loop through input elements of scheme
                const fieldname = get_attr_from_el_str(el_input, "data-field")
                console.log("fieldname", fieldname);
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

                // n_value can be blank when deleted, skip when both are blank
                if(n_value !== o_value){
// add n_value and 'update' to field_dict
                    let field_dict = {"update": true};
                    if(!!n_value){field_dict["value"] = n_value};
// add field_dict to upload_dict
                    upload_dict[fieldname] = field_dict;
                };
                console.log("upload_dict", upload_dict);

            }  // if(!!id_dict["parent_pk"])
        };  // if (!isEmpty(id_dict))

        console.log("upload_dict", upload_dict);

        const url_str =  url_scheme_shift_team_upload;
        UploadChanges(upload_dict, url_str);

    };  // function Upload_Scheme

//========= Upload_Team  ============= PR2019-10-18
    function Upload_Team() {
        console.log("======== Upload_Team");
        // This function is called by el_input_team_code

// ---  create team_dict
        const map_id = get_map_id("team", selected_team_pk.toString());
        console.log("map_id: ", map_id);
        const team_dict = get_mapdict_from_datamap_by_id(team_map, map_id)
        console.log("team_dict: ", team_dict);
        const team_code = get_subdict_value_by_key(team_dict, "code", "value")

// ---  create id_dict
        let id_dict = get_dict_value_by_key(team_dict, "id");
        console.log("id_dict: ", id_dict);
        // add id_dict to upload_dict
        if (!isEmpty(id_dict)){
            let upload_dict = {"id": id_dict};

            const new_value = el_input_team_code.value;
            let field_dict = {"update": true};
            if (!!new_value){
                field_dict["value"] = new_value;
            }
            upload_dict["code"] = field_dict;

            const url_str =  url_scheme_shift_team_upload;
            UploadChanges(upload_dict, url_str);
        }
    };  // function Upload_Team

//=========  UploadSchemeitemDelete  ================ PR2019-10-30
    function UploadSchemeitemDelete(mod_upload_dict, action) {
        console.log("========= UploadSchemeitemDelete ===", action );
        console.log("mod_upload_dict ", mod_upload_dict );
        // mod_upload_dict: {id: {delete: true, pk: 363, ppk: 1208, table: "schemeitem"}}

        // UploadSchemeitemDelete is only called by ModConfirmSave after btn_delete in tblRow

        if (!!mod_upload_dict){
            let id_dict = get_dict_value_by_key(mod_upload_dict, "id");
            const tblName = get_dict_value_by_key(id_dict, "table");
            const pk_str = get_dict_value_by_key(id_dict, "pk");
            const ppk_int = parseInt(get_dict_value_by_key(id_dict, "ppk"));
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
                tblRow.classList.add("tsa_tr_error");
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
                tblRow.classList.add("tsa_tr_error");
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
                        SBR_FillSelectTable("scheme", "UploadSchemeOrShiftOrTeam scheme_list", selected_scheme_pk);
                    }
                    if ("shift_list" in response) {
                        get_datamap(response["shift_list"], shift_map)
                        SBR_FillSelectTable("shift", "UploadSchemeOrShiftOrTeam shift_list", selected_shift_pk);
                    }
                    if ("team_list" in response) {
                        get_datamap(response["team_list"], team_map)
                        SBR_FillSelectTable("team", "UploadSchemeOrShiftOrTeam team_list", selected_team_pk, true);
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

//=========  UploadTeammember  ================ PR2019-11-11
    function UploadTeammember(mod_upload_dict) {
        console.log(" === UploadTeammember ===")
        console.log("mod_upload_dict " , mod_upload_dict)
        const id_dict = get_dict_value_by_key(mod_upload_dict, "id")
        const is_delete = get_dict_value_by_key(mod_upload_dict, "delete", false)

    // make tblRow red when delete
        if("delete" in id_dict){
        console.log("id_dict " , id_dict)
            const pk_int = get_dict_value_by_key(id_dict, "pk");
            const tblName = get_dict_value_by_key(id_dict, "table");
            const map_id = get_map_id(tblName, pk_int);
            let tr_changed = document.getElementById(map_id);

            if(!!tr_changed){
                tr_changed.classList.add("tsa_tr_error");
                setTimeout(function (){
                    tr_changed.classList.remove("tsa_tr_error");
                    }, 2000);
            }
        }

        UploadChanges(mod_upload_dict, url_teammember_upload)
        // TODO refresh selecttable
    }  // function UploadTeammember


//=========  UploadTemplate  ================ PR2019-11-21
    function UploadTemplate(mod_upload_dict) {
        console.log(" === UploadTemplate ===")

        if(!isEmpty(mod_upload_dict)) {
            UploadChanges(mod_upload_dict, url_scheme_template_upload)
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
        console.log( "selected_scheme_pk: ", selected_scheme_pk);

        if(!!selected_scheme_pk){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected_scheme_pk);
        console.log( "map_dict: ", map_dict);
            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                mod_upload_dict = {"id": map_dict["id"]};
                mod_upload_dict["id"]["delete"] = true;
                mod_upload_dict["code"] = map_dict["code"];

                ModConfirmOpen("delete");
            }  // if (selected_scheme_pk)
        }  //   if(!!tblRow)

    }  // HandleDeleteScheme


//========= UploadDeleteInactive  ============= PR2019-09-23
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

            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                let upload_dict = {"id": map_dict["id"]};
                mod_upload_dict = {"id": map_dict["id"]};
                if (tblName === "teammember" && !isEmpty(map_dict["employee"])){
                    mod_upload_dict["employee"] = map_dict["employee"]
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
                UploadChanges(upload_dict, url_str);
            }  // if (!isEmpty(map_dict))
        }  //   if(!!tblRow)
    }  // UploadDeleteInactive


//========= UploadElChanged  ============= PR2019-03-03
    function UploadElChanged(el_input) {
        console.log("--- UploadElChanged  --------------");

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            console.log("el_input", el_input);

    // ---  create id_dict
            let field_dict = {};

    // ---  create id_dict
            // 'get_iddict_from_element' gets 'data-pk', 'data-ppk', 'data-table', 'data-mode', 'data-cat' from element
            // and puts it as 'pk', 'ppk', 'temp_pk', 'create', 'mode', 'cat' in id_dict
            // id_dict = {'temp_pk': 'new_4', 'create': True, 'ppk': 120}
            const id_dict = get_iddict_from_element(tblRow);
                const tblName = ("table" in id_dict) ? id_dict["table"] : null;
                const pk_str = ("pk" in id_dict) ? id_dict["pk"].toString() : null;
                const ppk_str = ("ppk" in id_dict) ? id_dict["ppk"].toString() : null;
                const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
                const map_id =  get_map_id(tblName, pk_str);

                const is_create = ("create" in id_dict)

            console.log("id_dict", id_dict);
            console.log("pk_str", pk_str);
            console.log("temp_pk_str", temp_pk_str);
            console.log("map_id", map_id);
            console.log("is_create", is_create);

            let upload_dict = {"id": id_dict};

    // ---  get fieldname from 'el_input.data-field'
            const fieldname = get_attr_from_el(el_input, "data-field");
            if (!!fieldname){
                if (fieldname === "delete"){
                    upload_dict["id"]["delete"] = true;
                    tblRow.classList.add("tsa_tr_error");
                } else {
                    let n_value = null;
                    if (["code", "name", "identifier", "priceratejson"].indexOf( fieldname ) > -1){
                        n_value = (!!el_input.value) ? el_input.value : null
                    } else {
                        n_value = get_attr_from_el(el_input, "data-value");
                    };

                    let field_dict = {};
                    field_dict["value"] = n_value;
                    field_dict["update"] = true;

                    const ppk_int = get_attr_from_el_int(tblRow, "data-ppk");
                    if (fieldname === "pricerate") {
                        const new_value = (!!el_input.value) ? el_input.value : null;
                        field_dict["value"] = new_value;
                        field_dict["update"] = true;
                    } else if (fieldname === "inactive") {
                        let inactive = false;
                        if (get_attr_from_el(el_input, "data-value") === "true"){inactive = true}
                        field_dict["value"] = inactive;
                        field_dict["update"] = true;
                    }

                    if (tblName === "schemeitem") {
                        // parent of schemeitem, shift and team is: scheme
                        //console.log("ppk_int", ppk_int);
                        if (is_create) {
                            const el_rosterdate = tblRow.cells[0].children[0];
                            //console.log(el_rosterdate);
                            let rosterdate = get_attr_from_el(el_rosterdate, "data-value");
                            //console.log("rosterdate", rosterdate);
                            let rosterdict = {}
                            rosterdict["value"] = rosterdate
                            rosterdict["update"] = true
                            upload_dict["rosterdate"] = rosterdict;
                        }
                        let pk_int, code;
                        if (fieldname === "rosterdate") {
                            const value = get_attr_from_el(el_input, "data-value");
                            if(!!value){
                                field_dict["value"] = value
                            }
                            field_dict["update"] = true;

                        } else if (["shift", "team"].indexOf( fieldname ) > -1){
                            pk_int = parseInt(el_input.value);
                            if(!!pk_int){
                                field_dict["pk"] = pk_int
                                if (el_input.selectedIndex > -1) {
                                    code = el_input.options[el_input.selectedIndex].text;
                                    if(!!code){field_dict["value"] = code};
                                    if(!!ppk_int){field_dict["ppk"] = ppk_int};
                                }
                            }
                            field_dict["update"] = true;
                        }

                    } else if (tblName === "shift") {
                        // parent of schemeitem, shift and team is: scheme
                        const ppk_int = get_attr_from_el_int(tblRow, "data-ppk");
                        //console.log("ppk_int", ppk_int);

                        if (fieldname === "code", "breakduration") {
                            const code = el_input.value
                            if (!!code){
                                field_dict["value"] = code;
                                field_dict["update"] = true;
                            }
                        } else if (["cat"].indexOf( fieldname ) > -1){
                            let value_int = parseInt(el_input.value);
                            if(!value_int){value_int = 0}
                            field_dict["value"] = value_int;
                            field_dict["update"] = true;
                        }
                    } else if (tblName === "teammember") {
                        // parent is team
                        if (fieldname === "employee") {
                            // get pk from datalist when field is a look_up field
                            const value = el_input.value;
                            if(!!value){
                                const pk_int = parseInt(get_pk_from_datalist("id_datalist_employees", value, "pk"));
                                const ppk_int = parseInt(get_pk_from_datalist("id_datalist_employees", value, "ppk"));
                                if(!!pk_int){
                                    field_dict["pk"] = pk_int
                                    field_dict["ppk"] = ppk_int
                                    if(!!value){field_dict["value"] = value};
                                    field_dict["update"] = true;
                                }
                            }  // if(!!value)
                        }
                    }  // if (tblName === "schemeitem")

                    upload_dict[fieldname] = field_dict;
                }  //  if (fieldname === "delete")
            }  // if (!!fieldname){

            //console.log("tblName: ", tblName,  "fieldname: ", fieldname,  "is_delete: ", is_delete);

    // add id_dict to upload_dict
            if (!! tblRow && !!id_dict){
    // if delete: add 'delete' to id_dict and make tblRow red
                if(fieldname === "delete"){
                    id_dict["delete"] = true
                    tblRow.classList.add("tsa_tr_error");
                }
                upload_dict["id"] = id_dict;
    // --- dont add fielddict when is_delete
                if(fieldname !== "delete"){

                } // if(!is_delete){

                if (["scheme", "shift", "team"].indexOf( tblName ) > -1) {
                    UploadChanges(upload_dict, url_scheme_shift_team_upload);
                } else if (tblName === "teammember") {
                    UploadChanges(upload_dict, url_teammember_upload);
                } else if (tblName === "schemeitem") {
                    let upload_list = [];
                    upload_list.push(upload_dict);
                    if (upload_list.length){
                        UploadChanges(upload_list, url_schemeitem_upload)
                    };
                }
            }  // if (!! tblRow && !!id_dict){
        }  // if(!!el_input)
    } // UploadElChanged(el_input)

//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type
    function UploadChanges(upload_dict, url_str) {
        console.log("=== UploadChanges");
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

                    if ("si_update_list" in response) {
                        Grid_UpdateFromResponse_si(response["si_update_list"]);
                    }
                    if ("team_update_list" in response) {
                        Grid_UpdateFromResponse_team(response["team_update_list"]);
                    }
                    if ("shift_update_list" in response) {
                        Grid_UpdateFromResponse_shift(response["shift_update_list"]);
                    }
                    if ("tm_update_list" in response) {
                        Grid_UpdateFromResponse_tm(response["tm_update_list"]);
                    }
                    if ("schemeitem_update" in response) {
                        UpdateFromResponse(response["schemeitem_update"]);
                    }
                    if ("scheme_update" in response) {
                        UpdateFromResponse(response["scheme_update"]);
                    }
                    if ("shift_update" in response) {
                        UpdateFromResponse(response["shift_update"]);
                    }
                    if ("team_update" in response) {
                        UpdateFromResponse(response["team_update"]);
                    }
                    if ("teammember_update" in response) {
                        UpdateFromResponse(response["teammember_update"]);
                    }
                    if ("rosterdate" in response) {
                        ModRosterdateFinished(response["rosterdate"]);
                    }
                    if ("refresh_tables" in response) {
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

//=========  Grid_UpdateFromResponse_si  ================ PR2020-03-15
    function Grid_UpdateFromResponse_si(si_update_list) {
        console.log(" ==== Grid_UpdateFromResponse_si ====");
        console.log("si_update_list", si_update_list);
        console.log ("-------- grid_schemeitem_list.length", grid_schemeitem_list.length)
        let cell_id_str = null, ppk_int = null;
// --- loop through si_update_list
        for (let i = 0, len = si_update_list.length; i < len; i++) {
            let update_dict = si_update_list[i];
            if(!cell_id_str) { cell_id_str = get_dict_value(update_dict, ["id", "cell_id"])};
            if(!ppk_int) { ppk_int = get_dict_value(update_dict, ["id", "ppk"])};

//----- get id_dict of updated item
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id", "pk"]);
            const map_id = get_map_id(tblName, pk_int);

            if (!!map_id){
//----- replace updated item in map or remove deleted item from map
                update_map_item(tblName, map_id, update_dict);

//----- add or remove map_id of this schemeitem to grid_schemeitem_list
                const id_dict = get_dict_value(update_dict, ["id"]);
                const exists = grid_schemeitem_list.includes(map_id);
                if(("deleted" in id_dict)){
                // skip if map_id  does not exist in grid_schemeitem_list
                    if (exists) {
                        removeA(grid_schemeitem_list, map_id);
                    }
                } else {
                // skip if map_id already exists in grid_schemeitem_list
                    if (!exists) {
                        grid_schemeitem_list.push(map_id)
                    }
                }
            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)

        Grid_UpdateCell(cell_id_str)
    };  // Grid_UpdateFromResponse_si

//=========  Grid_UpdateFromResponse_team  ================ PR2020-03-20
    function Grid_UpdateFromResponse_team(update_list) {
        console.log(" ==== Grid_UpdateFromResponse_team ====");
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
                update_map_item(tblName, map_id, update_dict);
            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)
// fill grid_teams_dict, teams and shifts
        Grid_CreateTblTeams(selected_scheme_pk);
        //Grid_CreateTblShifts(selected_scheme_pk)
        //Grid_FillTblShifts(selected_scheme_pk)
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
                update_map_item(tblName, map_id, update_dict);
            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)
// fill grid_teams_dict, teams and shifts
        Grid_CreateTblTeams(selected_scheme_pk);
        //Grid_CreateTblShifts(selected_scheme_pk)
        //Grid_FillTblShifts(selected_scheme_pk)
    };  // Grid_UpdateFromResponse_tm

//=========  Grid_UpdateFromResponse_shift  ================ PR2020-03-20
    function Grid_UpdateFromResponse_shift(update_list) {
        console.log(" ==== Grid_UpdateFromResponse_shift ====");
        console.log("update_list", update_list);
        let cell_id_str = null, ppk_int = null;
        let pk_list = [] // for highlighting cells
// --- loop through update_list
        for (let i = 0, len = update_list.length; i < len; i++) {
            let update_dict = update_list[i];
            console.log("update_dict", update_dict);
//----- get id_dict of updated item
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id", "pk"]);
            const map_id = get_map_id(tblName, pk_int);
            console.log("map_id", map_id);
            pk_list.push(pk_int)
            if (!!map_id){
//----- replace updated item in map or remove deleted item from map
                update_map_item(tblName, map_id, update_dict);

            }  // if (!!map_id){
        }  //  for (let j = 0; j < 8; j++)
// fill grid_teams_dict, teams and shifts
        //Grid_CreateTblTeams(selected_scheme_pk);
        Grid_CreateTblShifts(selected_scheme_pk)
        Grid_FillTblShifts(selected_scheme_pk)

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

// ---  highlight shift cell after update







    };  // Grid_UpdateFromResponse_shift


//=========  UpdateFromResponse  ================ PR2019-10-14
    function UpdateFromResponse(update_dict) {
        console.log(" ==== UpdateFromResponse ====");
        console.log("update_dict", update_dict);

//----- get id_dict of updated item
        const id_dict = get_dict_value(update_dict, ["id"]);
        const tblName = get_dict_value(id_dict, ["table"]);
        const pk_int = get_dict_value(id_dict, ["pk"]);
        const ppk_int = get_dict_value(id_dict, ["ppk"]);
        const temp_pk_str = get_dict_value(id_dict, ["temp_pk"]);
        const map_id = get_map_id(tblName, pk_int);
        const is_created = ("created" in id_dict);
        const is_deleted = ("deleted" in id_dict);
        console.log("map_id", map_id);

        let tblRow;
        if (!!map_id){
//----- replace updated item in map or remove deleted item from map
            update_map_item(tblName, map_id, update_dict);
//----- get tblRow
            tblRow = document.getElementById(map_id);
        }

        //if(tblName === "scheme_form"){
            //UpdateForm()
        //}

// ++++ deleted ++++
//----- reset selected scheme/shift/team when deleted
        if(is_deleted){
            if (tblName === "scheme"){selected_scheme_pk = 0} else
            if (tblName === "shift"){selected_shift_pk = 0} else
            if (tblName === "team"){selected_team_pk = 0};
//----- delete tblRow
            if (!!tblRow) {tblRow.parentNode.removeChild(tblRow)}
            if (tblName === "scheme"){
                // reset id_table_schemeitem id_table_shift  el_input_team_code tblBody_teammember  when scheme is deleted

                tblBody_schemeitem.innerText = null;
                tblBody_shift.innerText = null;
                tblBody_teammember.innerText = null;
                el_input_team_code.value = null;

            // reset select tablesshift and team when scheme is deleted
                document.getElementById("id_select_table_shift").classList.add(cls_hide)
                document.getElementById("id_select_table_team").classList.add(cls_hide)
            // delete innerText of sidebar_tblBody_shift and of sidebar_tblBody_team
                sidebar_tblBody_shift.innerText = null;
                sidebar_tblBody_team.innerText = null;
                selected_scheme_pk = 0
                ResetSchemeInputElements();
            }

// ++++ created ++++
        } else if (is_created){
        console.log("===============tblName", tblName);
//----- item is created: add new row on correct index of table, reset addnew row
            // parameters: tblName, pk_str, ppk_str, is_addnew, customer_pk
            if(tblName === "scheme"){
                // skip scheme, it has no table. team has table teammembers, is empty after creating new team
            } else if(tblName === "team"){
                // set focus to addnew row in table teammember

                let tblFoot = document.getElementById("id_tfoot_teammember");
                let tblRow = tblFoot.rows[0];
                if (!!tblRow){
                    //HandleTableRowClicked(tblRow, true) // true = skip_highlight_selectrow
                    let el_input = tblRow.cells[0].children[0];
                    if (!!el_input){
                        setTimeout(function() {el_input.focus()}, 50);
                    }
                }
            } else {
                tblRow = CreateTblRow("tbody", tblName, pk_int, ppk_int)
                UpdateTableRow(tblRow, update_dict)

//----- set focus to code input of added row
                const index =  0;
                let el_input = tblRow.cells[index].children[0];
                //console.log("focus el_input", el_input)
                if(!!el_input){
                    setTimeout(function() {el_input.focus()}, 50);
                }
                HandleTableRowClicked(tblRow);
//----- scrollIntoView, only in table schemeitem
                if (tblName === "schemeitem"){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                };

//----- clear addnew row
                ResetAddnewRow(tblName, "UpdateFromResponse")
            }  // if(tblName !== "scheme")

        } // else if (is_created)

//----- update input field team_code
        if (tblName === "team"){
            const field_dict = get_dict_value_by_key(update_dict, "code")
            const key_str = "value";
            format_text_element (el_input_team_code, key_str, el_msg, field_dict, false, [-220, 60])

        } else if (tblName === "scheme"){
            // skip scheme, it has no table
        } else {
//----- lookup tablerow of updated item
            // created row has id 'teammemnber_new1', existing has id 'teammemnber_379'
            // 'is_created' is false when creating failed, use instead: (!is_created && !map_id)
            let row_id_str = ((is_created) || (!is_created && !map_id)) ? tblName + "_" + temp_pk_str : map_id;
            let tblRow = document.getElementById(row_id_str);

//----- update Table Row
            if (["shift", "teammember", "schemeitem"].indexOf( tblName ) > -1){
                UpdateTableRow(tblRow, update_dict)
            }
        };  // if (tblName === "team"){

// ++++ update selectRow ++++
//--- insert new selectRow if is_created, highlight selected row
        if (["scheme", "shift", "team"].indexOf( tblName ) > -1){
            let sidebar_tblBody = (tblName === "scheme") ? sidebar_tblBody_scheme :
                                 (tblName === "shift") ? sidebar_tblBody_shift :
                                 (tblName === "team") ? sidebar_tblBody_team : null;
            let selectRow;
            if(is_created && !!sidebar_tblBody){
                const row_index = GetNewSelectRowIndex(sidebar_tblBody, 0, update_dict, loc.user_lang);
                 // TODO switch to t_CreateSelectRow
                selectRow = CreateSelectRow(sidebar_tblBody, update_dict, row_index);
                HandleSelectRow(selectRow);
            } else{
        //--- get existing  selectRow
                const rowid_str = id_sel_prefix + map_id;
                selectRow = document.getElementById(rowid_str);
            };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
            // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey
            const filter_show_inactive = false; // no inactive filtering on this page
            const include_parent_code = false;
            UpdateSelectRow(selectRow, update_dict, include_parent_code, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)
        }  // if( tblName === "scheme"...

        if(tblName === "scheme"){
            UpdateSchemeInputElements(update_dict);
        }
        if (["shift"].indexOf( tblName ) > -1){
            console.log("xxx HighlightSelectShiftTeam")
            //HighlightSelectShiftTeam(tblName, tblRow)
        }

// --- update grid
        const scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", selected_scheme_pk);
        Grid_FillGrid(scheme_dict)

//--- remove 'updated', deleted created and msg_err from update_dict
        // NOTE: first update tblRow, then remove these keys from update_dict, then replace update_dict in map
        remove_err_del_cre_updated__from_itemdict(update_dict)

//--- replace updated item in map or remove deleted item from map
        if(is_deleted){
            if (tblName === "scheme"){scheme_map.delete(map_id)} else
            if (tblName === "shift"){shift_map.delete(map_id)} else
            if (tblName === "team"){team_map.delete(map_id)} else
            if (tblName === "schemeitem"){schemeitem_map.delete(map_id)} else
            if (tblName === "teammmeber"){teammmeber_map.delete(map_id)};
        } else {
            if (tblName === "scheme"){scheme_map.set(map_id, update_dict)} else
            if (tblName === "shift"){shift_map.set(map_id, update_dict)} else
            if (tblName === "team"){team_map.set(map_id, update_dict)}else
            if (tblName === "schemeitem"){schemeitem_map.set(map_id, update_dict)} else
            if (tblName === "teammmeber"){teammmeber_map.set(map_id, update_dict)};
        }

//--- refresh header text
// TODO correct
        UpdateHeaderText();
    }  // UpdateFromResponse


//========= UpdateTablesAfterResponse  =============
    function UpdateTablesAfterResponse(response){
        //console.log("--- UpdateTablesAfterResponse  --------------");
        //SBR_FillSelectTable fills selecttable and makes visible

        //console.log("response[refresh_tables: ", response["refresh_tables"]);
        const new_scheme_pk = get_subdict_value_by_key(response, "refresh_tables", 'new_scheme_pk', 0)

        //console.log("new_scheme_pk: ", new_scheme_pk);
        let fill_rows = false;
        if ("scheme_list" in response) {
            get_datamap(response["scheme_list"], scheme_map)
            SBR_FillSelectTable("scheme", "UpdateTablesAfterResponse", new_scheme_pk, true)
            fill_rows = true
        }
        if ("shift_list" in response) {
            get_datamap(response["shift_list"], shift_map)
            SBR_FillSelectTable("shift", "UpdateTablesAfterResponse", 0, false)
            fill_rows = true
            }
        if ("team_list" in response){
            get_datamap(response["team_list"], team_map);
            SBR_FillSelectTable("team", "UpdateTablesAfterResponse", 0, false)
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
            // tblNames are: shift, teammember, schemeitem
            FillTableRows("shift");
            FillTableRows("teammember");
            FillTableRows("schemeitem");
        }
    };  //  UpdateTablesAfterResponse

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, update_dict){
        console.log("--- UpdateTableRow  --------------");
        console.log("update_dict", update_dict);
        console.log("tblRow", tblRow);

        if (!isEmpty(update_dict) && !!tblRow) {
//--- get info from update_dict["id"]
            const id_dict = get_dict_value_by_key (update_dict, "id");
                const tblName = ("table" in id_dict) ? id_dict["table"] : null;
                const pk_str = ("pk" in id_dict) ? id_dict["pk"].toString() : null;
                const ppk_str = ("ppk" in id_dict) ? id_dict["ppk"].toString() : null;
                const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
                const map_id = get_map_id(tblName, pk_str);
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

                const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
                const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;

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
                tblRow.setAttribute("data-pk", pk_str);
                tblRow.setAttribute("data-ppk", ppk_str);
                tblRow.setAttribute("data-table", tblName);
// remove temp_pk from tblRow
                tblRow.removeAttribute("temp_pk");
// remove placeholder from element 'code
                tblRow.cells[0].children[0].removeAttribute("placeholder");
                tblRow.cells[1].children[0].removeAttribute("placeholder");

// move the new row in alfabetic order
                // TODO: also when name has changed
                let tblBody = tblRow.parentNode
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, loc.user_lang);
                //tblBody.insertBefore(tblRow, tblBody.childNodes[row_index]);

// make row green, / --- remove class 'ok' after 2 seconds
                //if(!is_addnew_row){
                    ShowOkRow(tblRow)
               // }
// TODO add delete button on created row
// add delete button
                //const j = (tblName === "customer") ? 2 : (tblName === "order") ? 5 : null;
                //if (!!j){
                //    let el_delete = tblRow.cells[j].children[0];
                //    if(!!el_delete){
                //        CreateDeleteButton(tblRow, el_delete)
                //    }
                //}
            };  // if (is_created){

            // tblRow can be deleted in  if (is_deleted){
            if (!!tblRow){
                const is_inactive = get_subdict_value_by_key (update_dict, "inactive", "value", false);
                tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                if(!!tblRow.cells){
                    for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                        let td = tblRow.cells[i];
                        let el_input = td.children[0];
                        if(!!el_input){
    // --- lookup field in update_dict, get data from field_dict
                            UpdateField(el_input, update_dict, tblName)
                        };  // if(!!el_input)
                    }  //  for (let j = 0; j < 8; j++)
                }  // if(!!tblRow.cells){
            } // if (!!tblRow)
        };  // if (!isEmpty(update_dict) && !!tblRow)
    }  // function UpdateTableRow

//========= UpdateField  =============
    function UpdateField(el_input, update_dict, tblName){
        //console.log("--- UpdateField  -------------- ", tblName);
        //console.log(update_dict);
        if(!!el_input){
// --- lookup field in update_dict, get data from field_dict
            const fieldname = get_attr_from_el(el_input, "data-field");
            if (fieldname in update_dict){
                let field_dict = get_dict_value (update_dict, [fieldname]);

                const value = get_dict_value (field_dict, ["value"]);
                let pk_int = parseInt(get_dict_value (field_dict, ["pk"]), 0)
                let ppk_int = parseInt(get_dict_value (field_dict, ["ppk"]), 0)
                if(!pk_int){pk_int = 0}
                if(!ppk_int){ppk_int = 0}

                if (tblName === "schemeitem") {
                    if (fieldname === "rosterdate"){
                        //const hide_weekday = false, hide_year = true;
                        format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                            loc.user_lang, loc.comp_timezone, false, true)
                    } else if (["shift", "team"].indexOf( fieldname ) > -1){
                        format_select_element (el_input, "code", field_dict)
                    } else if (["offsetstart", "offsetend"].indexOf( fieldname ) > -1){
                        // offset fields are readonly in schemeitem
                        const offset = get_dict_value(update_dict, ["shift", fieldname] )
                        const blank_when_zero = (["breakduration", "timeduration"].indexOf( fieldname ) > -1) ? true : false;
                        format_offset_element (el_input, el_msg, fieldname, field_dict, [-220, 80], loc.timeformat, loc.user_lang,
                                                loc.Previous_day_title, loc.Next_day_title, blank_when_zero)
                        const display_text = display_offset_time (loc, offset, blank_when_zero)

                    } else if (["breakduration", "timeduration"].indexOf( fieldname ) > -1){
                        format_duration_element (el_input, el_msg, field_dict, loc.user_lang)
                    } else if (fieldname === "inactive") {
                       if(isEmpty(field_dict)){field_dict = {value: false}}
                       format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
                    };
                } else {
                    if (["code", "employee", "replacement"].indexOf( fieldname ) > -1){
                       const key_str = (fieldname === "code") ? "value" : "code";
                       format_text_element (el_input, key_str, el_msg, field_dict, false, [0, 0])
                // put placeholder in employee field when employee is removed
                        //if (fieldname === "employee" && !get_dict_value_by_key(field_dict, "pk")){
                            //el_input.value = loc.Select_employee + "...";
                        //}
                    } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                        const hide_weekday = false, hide_year = false;
                        format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    loc.user_lang, loc.comp_timezone, hide_weekday, hide_year)
                    } else if (fieldname === "isrestshift"){
                        format_restshift_element (el_input, field_dict,
                            imgsrc_rest_black, imgsrc_stat00, loc.Rest_shift)
                    } else if (["shift", "team"].indexOf( fieldname ) > -1){
                        const key_str = "code";
                        format_select_element (el_input, key_str, field_dict)
                    } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                        // not in use
                        format_datetime_element (el_input, el_msg, field_dict, loc.comp_timezone, loc.timeformat, month_list, weekday_list)
                    } else if (["offsetstart", "offsetend"].indexOf( fieldname ) > -1){
                        // in table schemeitem : when there is a shift: offset of shift is displayed, othereise: offset of schemeitem is displayed
                        if (tblName === "schemeitem") {
                            field_dict = get_dict_value(update_dict, ["shift"] )
                        }
                        const blank_when_zero = (["breakduration", "timeduration"].indexOf( fieldname ) > -1) ? true : false;
                        format_offset_element (el_input, el_msg, fieldname, field_dict, [-220, 80], loc.timeformat, loc.user_lang,
                                                loc.Previous_day_title, loc.Next_day_title, blank_when_zero)
                    } else if (["breakduration", "timeduration"].indexOf( fieldname ) > -1){
                        format_duration_element (el_input, el_msg, field_dict, loc.user_lang)
                    } else if (fieldname === "inactive") {
                       if(isEmpty(field_dict)){field_dict = {value: false}}
                       format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
                    };
                }  // if (tblName === "schemeitem") {
            }  else {

// put placeholder in employee field when empty, except for new row
                if (fieldname === "employee"){
                    const tblRow = get_tablerow_selected(el_input)
                    const pk_int = get_attr_from_el_int(tblRow, "data-pk")
                    if(!!pk_int){el_input.value = loc.Select_employee + "...";}
                }
            } // if (fieldname in update_dict)
        };  // if(!!el_input)
    }

//========= UpdateAddnewRow  ==================================== PR2019-12-01
    function UpdateAddnewRow(tblName, sel_scheme_or_team_pk) {
        //console.log(" --- UpdateAddnewRow --- ")
        // tblNames are: schemitem, shift, teammember
        let tblFoot = document.getElementById("id_tfoot_" + tblName);
        if(!!tblFoot.rows.length){
            let tblRow = tblFoot.rows[0];
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
        }  // if(!!tblFoot.rows.length)
    }  // UpdateAddnewRow

//========= UpdateSchemeOrTeam  =============
    function XXXUpdateSchemeOrTeam(tblName, tblRow, update_dict){
        //console.log("=== UpdateSchemeOrTeam ===", tblName);
        //console.log("update_dict: " , update_dict);
        //console.log(tblRow.id); // tablerow is selecttablerow
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        const select_iddict = get_iddict_from_element(tblRow)
        const select_pk = get_dict_value_by_key(select_iddict, "pk")
        const select_ppk = get_dict_value_by_key(select_iddict, "ppk")
        //console.log("select_pk: ", select_pk, "select_ppk: ", select_ppk);

        if (!isEmpty(update_dict)) {
// get id_new and id_pk from update_dict["id"]
            const pk = get_pk_from_dict(update_dict);
            const parent_pk = get_ppk_from_dict(update_dict);
            //console.log("pk: ", pk, "parent_pk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- created record
                if ("created" in id_dict) {
                    tblRow.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRow.classList.remove("tsa_tr_ok");
                //console.log("SBR_FillSelectTable tblName", tblName)
                        SBR_FillSelectTable(tblName, "UpdateSchemeOrTeam")

                        const row_id = tblName + pk.toString();
                        //console.log("row_id: ", row_id);
                        let tblRowSelected = tblRow  //let tblRowSelected = document.getElementById(row_id)
                        //console.log(tblRowSelected);

                        if (tblName ==="scheme"){
                            HandleSelectRow(tblRowSelected, "tblRowSelected")
                        } else if (tblName ==="shift"){
                            XXXHandleSelectTable(tblRowSelected)
                        } else if (tblName ==="team"){
                            XXXHandleSelectTable(tblRowSelected)
                        }
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
    }  // UpdateSchemeOrTeam

//========= UpdateSchemeitemOrTeammember  =============
    function UpdateSchemeitemOrTeammember(tblRow, update_dict){
        //console.log("=== UpdateSchemeitemOrTeammember ===");
        //console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        if (!isEmpty(update_dict)) {
// get id_new and id_pk from update_dict["id"]
            const pk_int = get_pk_from_dict(update_dict);
            const ppk_int = get_ppk_from_dict(update_dict);
            //console.log("pk: ", pk, "ppk_int: ", ppk_int);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    let tblName = get_dict_value_by_key (id_dict, "table");
                    console.log( "UpdateSchemeitemOrTeammember ppk_int", ppk_int, typeof ppk_int);
                    FillTableRows(tblName, ppk_int)
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

//=========  UpdateSchemeInputElements  ================ PR2019-08-07
    function UpdateSchemeInputElements(item_dict) {
        //console.log( "===== UpdateSchemeInputElements  ========= ");
        //console.log(item_dict);

        const field_list = ["code", "cycle", "datefirst", "datelast", "excludepublicholiday", "excludecompanyholiday"];

        ResetSchemeInputElements()
        //for(let i = 0, el_input, fieldname, el, len = field_list.length; i < len; i++){
        //    el = document.getElementById( "id_scheme_" + field_list[i])
        //    if (["excludepublicholiday", "excludecompanyholiday"].indexOf( fieldname ) > -1){
        //        el.checked = false
        //    } else {
        //        el.value = null
        //    }
        //}

        if(!!item_dict) {
// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
            const msg_err = get_dict_value_by_key (item_dict, "error");
            //console.log("id_dict", id_dict);
            //console.log("is_created", is_created, typeof is_created);
            document.getElementById("id_menubtn_delete_scheme").disabled = false

// --- error
            if (!!msg_err){
                const el_scheme_code = document.getElementById("id_scheme_code");
                ShowMsgError(el_scheme_code, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                const el_scheme_code = document.getElementById("id_scheme_code");
                ShowOkElement(el_scheme_code)
            }

            const pk_int = get_pk_from_dict(item_dict)
            const ppk_int = get_ppk_from_dict(item_dict);

            if(!!pk_int){

                for(let i = 0, el, field_dict, fieldname, value, updated, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
        //console.log("fieldname", fieldname);
                    field_dict = get_dict_value_by_key (item_dict, fieldname)
        //console.log("field_dict", field_dict);
                    value = get_dict_value_by_key (field_dict, "value")
                    updated = get_dict_value_by_key (field_dict, "updated");
                    const msg_err = get_dict_value_by_key (field_dict, "error");
        //console.log("value", value);
        //console.log("updated", updated);

                    el = document.getElementById( "id_scheme_" + fieldname)
        //console.log("el", el);

                    if(!!msg_err){
                        ShowMsgError(el, el_msg, msg_err, [-160, 80])
                    } else if(updated){
                        // el must loose focus, otherwise border_bg_valid won't show
                        el.blur()
                        el.classList.add("border_bg_valid");
                        setTimeout(function (){
                           el.classList.remove("border_bg_valid");
                            }, 2000);
                    }
                    el.setAttribute("data-field", fieldname)
                    if(!!value) {
                        el.setAttribute("data-value", value)
                    } else {
                        el.removeAttribute("data-value")
                    }
                    if(!!pk_int) {
                        el.setAttribute("data-pk", pk_int)
                    } else {
                        el.removeAttribute("data-pk")
                    }
                    if(!!ppk_int) {
                        el.setAttribute("data-ppk", ppk_int)
                    } else {
                        el.removeAttribute("ppk-pk")
                    }

                    if (["code", "cycle"].indexOf( fieldname ) > -1){
                        const key_str = "value";
                        format_text_element (el, key_str, el_msg, field_dict, false, [-220, 60])
                        el.readOnly = false;
                    } else if (fieldname === "datefirst" || fieldname === "datelast"){
                        el.value = value
                        el.min = get_dict_value_by_key (field_dict, "mindate");
                        el.max = get_dict_value_by_key (field_dict, "maxdate");
                    // in tetemplate_mode datefirst and datelast are readOnly
                        el.readOnly = (template_mode);
                    } else  if (["excludepublicholiday", "excludecompanyholiday"].indexOf( fieldname ) > -1){
                        el.checked = (!!value);
                        el.readOnly = false;
                    };
                }  // for(let i = 0, fieldname,
            }  // if(!!pk_int){
        } // if(!!tr_clicked)
    }  // function UpdateSchemeInputElements

//###########################################################################
// ++++++++++++  MODALS +++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++ MODAL GRID TEAM ++++++++++++++++++++++++++++++++++++++++++++++++ PR2020-03-16

//=========  MGS_Open  ================  PR2020-03-21
    function MGS_Open(el_input) {
        console.log(" ======  MGS_Open  =======")

// ---  reset mod_MGS_dict
        mod_MGS_dict = {};

// ---  get scheme_pk and map_dict_pk from el_input
        const tblRow = get_tablerow_selected(el_input)
        const shift_pk = get_attr_from_el(tblRow, "data-shift_pk")
        const scheme_pk = get_attr_from_el(tblRow, "data-shift_ppk")

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


// set focus to offsetstart element
            setTimeout(function() { document.getElementById("id_MGS_offsetstart").focus()}, 500);

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
            const row_id = "grid_shift_" + mod_upload_dict.shift.id.pk.toString();
            let tblRow = document.getElementById(row_id);
            tblRow.classList.add("tsa_tr_error");
                ModConfirmOpen("grid_shift_delete", null)
            } else {
                UploadChanges(mod_upload_dict, url_teammember_upload);
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
        if(!!mod_MGS_dict.shift){
            const new_shift_code = create_shift_code( loc,
                                                    mod_MGS_dict.shift.offsetstart.value,
                                                    mod_MGS_dict.shift.offsetend.value,
                                                    mod_MGS_dict.shift.timeduration.value,
                                                    mod_MGS_dict.shift.code.value);
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
            const new_offset = get_dict_value_by_key(tp_dict, "offset")
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

        el_MGS_btn_save.disabled = (!selected_scheme_pk || !mod_MGS_dict.shift.values_changed);

        const shift_id_mode = mod_MGS_dict.shift.id.mode;
        const btn_delete_hidden = (!selected_scheme_pk || shift_id_mode === "create");
        add_or_remove_class (el_MGS_btn_delete, cls_hide, btn_delete_hidden) // args: el, classname, is_add
    }  // MGS_BtnSaveDeleteEnable


// ################################## MODAL GRID TEAM ################################## PR2020-03-16

//=========  MGT_Open  ================  PR2020-03-16
    function MGT_Open(el_input) {
        console.log(" ======  MGT_Open  =======")
// ---  reset mod_MGT_dict
        mod_MGT_dict = {};
// ---  get scheme_pk and team_pk from el_input
        const scheme_pk = get_attr_from_el_int(el_input, "data-scheme_pk")
        const team_pk = get_attr_from_el(el_input, "data-team_pk")
        if(!!scheme_pk && team_pk){
// --- fill  mod_MGT_dict, get is_add_new_mode = isEmpty(team_mapdict)
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

// ---  get grid_team_dict from grid_teams_dict
        const grid_team_dict = grid_teams_dict[team_pk];
        // grid_team_dict:
        // { 2376: {id: {col: 4, row_id: "team_2376", code: "Ploeg E", abbrev: "E"}
        //          1327: {row: 2, row_id: "tm_1327", display: "---"} }

        const team_mapdict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", team_pk)
        const add_new_mode = (isEmpty(team_mapdict));

// --- create mod_MGT_dict with team
        mod_MGT_dict = {team: {id: {pk: team_pk,
                                    ppk: scheme_pk,
                                    table: "team",
                                    mode: (add_new_mode) ? "create" : "unchanged"}
                        }}
// --- add team_code
        if (!!add_new_mode){
            const team_code = get_teamcode_with_sequence(team_map, scheme_pk, loc.Team);
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
                    const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk)
                    if(!isEmpty(teammember_dict)){
// create tm_dict in mod_MGT_dict
                        mod_MGT_dict[teammember_pk] = {
                            id: {pk: teammember_pk,
                                ppk: get_dict_value(teammember_dict, ["id","ppk"]),
                                table: "teammember", // was:   table: "grid_teammember",
                                mode: "unchanged"},
                            employee: {pk: get_dict_value(teammember_dict, ["employee","pk"]),
                                       ppk: get_dict_value(teammember_dict, ["employee","ppk"]),
                                        code: get_dict_value(teammember_dict, ["employee","code"], "---")},
                            replacement: {pk: get_dict_value(teammember_dict, ["replacement","pk"]),
                                          ppk: get_dict_value(teammember_dict, ["replacement","ppk"]),
                                        code: get_dict_value(teammember_dict, ["replacement","code"], "---")},
                            datefirst: {value: get_dict_value(teammember_dict, ["datefirst","value"])},
                            datelast: {value: get_dict_value(teammember_dict, ["datelast","value"])},
                        };
                    };
                }
           }  // if (grid_team_dict.hasOwnProperty(key)) {
        }  // for (let key in grid_team_dict) {
        console.log(">>>>>>>>>>> mod_MGT_dict", mod_MGT_dict)
        return add_new_mode
    }  // MGT_fill_MGT_dict

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
            UploadChanges(upload_dict, url_teammember_upload);

        }  // if(!isEmpty(team_dict))
    }  // MGT_Save

//=========  MGT_CreateTblTeammemberHeader  === PR2020-03-16
    function MGT_CreateTblTeammemberHeader() {
        //console.log("===  MGT_CreateTblHeader == ");
        let tblHead = document.getElementById("id_MGT_thead_teammember");
        tblHead.innerText = null
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        const col_count = 5;
        for (let j = 0; j < col_count; j++) {
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
    };  // MGT_CreateTblTeammemberHeader

//=========  MGT_CreateTblTeammemberFooter  === PR2019-11-26
    function MGT_CreateTblTeammemberFooter(){
        //console.log("===  MGT_CreateTblTeammemberFooter == ");

        let tblFoot = document.getElementById("id_MGT_tfoot_teammember");
        tblFoot.innerText = null;

        let tblRow = tblFoot.insertRow(-1);
        for (let j = 0; j < fieldsettings_teammember.colcount; j++) {
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
                el.addEventListener("click", function() {MGT_AddTeammember()}, false);
                td.appendChild(el);
            }
        }
    };  // MGT_CreateTblTeammemberFooter

//========= MGT_FillTableTeammember  ====================================
    function MGT_FillTableTeammember(team_pk){
        console.log( "===== MGT_FillTableTeammember  ========= ");
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
                        // no need to filter on selected_team_pk: mod_MGT_dict only contains tm_pk's of this team
                        let tblRow = MGT_CreateTblTeammemberRow(tblBody, tm_dict);
                        MGT_TeammemberUpdateTableRow(tblRow, tm_dict);
                    }
                };
           }
        }
    }  // MGT_FillTableTeammember

//=========  MGT_CreateTblTeammemberRow  ================ PR2019-09-04
    function MGT_CreateTblTeammemberRow(tblBody, tm_dict ){
        //console.log("--- MGT_CreateTblTeammemberRow  --------------");

        const teammember_pk = get_dict_value(tm_dict, ["id", "pk"])
        const team_pk = get_dict_value(tm_dict, ["id", "ppk"])
        const tblName = get_dict_value(tm_dict, ["id", "table"])

// --- insert tblRow into tblBody or tFoot
        let tblRow = tblBody.insertRow(-1);
// --- add id and data-field to tblRow
        tblRow.setAttribute("id", "teammember_" + teammember_pk);
        tblRow.setAttribute("data-pk", teammember_pk);
        tblRow.setAttribute("data-ppk", team_pk);
        tblRow.setAttribute("data-table", tblName);

//+++ insert td's into tblRow
        for (let j = 0; j < fieldsettings_teammember.colcount; j++) {
            let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
            let el = document.createElement( fieldsettings_teammember.tag[j] );
// --- add data-field Attribute.
            el.setAttribute("data-field", fieldsettings_teammember.name[j]);
// --- add img delete to col_delete
            if (j === fieldsettings_teammember.colcount - 1) {
                CreateBtnDeleteInactive("delete", tblRow, el);
            } else {
// --- add type and input_text to el.
                el.classList.add("input_text");
// --- add EventListener to td
                if ([0, 3].indexOf( j ) > -1){
                    el.setAttribute("type", "text")
                    el.addEventListener("click", function() { ModEmployeeOpen(el)}, false);
                    el.classList.add("pointer_show");
                } else if ([1, 2].indexOf( j ) > -1){
                    el.setAttribute("type", "date")
                    el.addEventListener("change", function() {MGT_TeammemberDateChanged(el)}, false);
                    //el.classList.add("input_popup_date") // class input_popup_date is necessary to skip closing popup
                };
// --- add margin to first column
                if (j === 0 ){el.classList.add("ml-2")}
            }
// --- add width and text_align to el
            el.classList.add("td_width_" + fieldsettings_teammember.width[j])
            el.classList.add("text_align_" + fieldsettings_teammember.align[j])
// --- add other classes to td
            el.classList.add("border_none");
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");
            td.appendChild(el);
        }
        return tblRow
    };// MGT_CreateTblTeammemberRow

//========= MGT_TeammemberUpdateTableRow  =============
    function MGT_TeammemberUpdateTableRow(tblRow, tm_dict){
        //console.log("--- MGT_TeammemberUpdateTableRow  --------------");
        //console.log("tm_dict", tm_dict);

        // format of tm_dict is :
        // { id: {pk: --, ppk: --, table: --,  mode: "create" }
        //   employee: {pk: --, code: -- }
        //   replacement: {pk: --, code: -- }
        //   datefirst: {value: --, mode: "update"},
        //   datelast: {value: --},

        if (!!tblRow && !isEmpty(tm_dict)) {
// check if tblBody = tFoot, if so: is_addnew_row = true
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
                        if (["datefirst", "datelast"].indexOf( fldName ) > -1){
                            el_input.value = get_dict_value(tm_dict, [fldName, "value"]);
                            // set min or max dat of other date field
                            MGT_set_datefield_minmax(tblRow, fldName, el_input.value);
                        } else if (["employee", "replacement"].indexOf( fldName ) > -1){
                            el_input.innerText = get_dict_value(tm_dict, [fldName, "code"], "---");
                        }
                    }
                }
            }
        };
    }  // function MGT_TeammemberUpdateTableRow

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
        console.log( " mod_MGT_dict[pk_str]: " + JSON.stringify( mod_MGT_dict[pk_str]));
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
        if (!!new_date){
            tm_dict[fldName] = {value: new_date, update: true};
        } else {
            tm_dict[fldName] = {update: true};
        }
        // don't put 'update' in id.mode when id.mode is already 'create' or 'delete'
        const id_mode = get_dict_value(mod_MGT_dict, ["id", "mode"])
        if (["create", "delete"].indexOf(id_mode) === -1) {
            tm_dict.id.mode = "update"
        };
        mod_MGT_dict.mode = "update";

// ---  set min max of other date field
        MGT_set_datefield_minmax(tblRow, fldName, new_date);

        MGT_BtnSaveDeleteEnable();

    }; // MGT_TeammemberDateChanged

//=========  datefield_minmax  ================ PR2020-04-13
    function MGT_set_datefield_minmax(tblRow, fldName, new_date ) {
    // ---  set min max of other date field
        const other_field = (fldName === "datefirst") ? "datelast" : "datefirst";
        const min_max = (other_field === "datefirst") ? "max" : "min";
        let el_other_field = tblRow.querySelector("[data-field=" + other_field + "]");
        if(!!el_other_field){
            if (!!new_date){
                el_other_field.setAttribute(min_max, new_date);
            } else {
                el_other_field.removeAttribute(min_max);
            }
        }
    }

//=========  MGT_TeamAdd  ================ PR2020-03-18
    function MGT_TeamAdd() {
        console.log( "===== MGT_TeamAdd  ========= ");

        id_new += 1;
        const pk_new = "new" + id_new.toString()

        const team_code = get_teamcode_with_sequence(team_map, selected_scheme_pk, loc.Team);

        el_MGT_teamcode.value = team_code
        mod_MGT_dict.team = {id: {temp_pk: pk_new, ppk: selected_scheme_pk, table : "team", create: true}, code: { value: team_code}}

// ---  put team_code in header
        const header_text = (!!team_code) ? team_code : loc.Team + ":";
        document.getElementById("id_MGT_header").innerText = header_text;

// --- reset tblBody
        let tblBody = document.getElementById("id_MGT_tbody_teammember");
        tblBody.innerText = null;
// ---  create one teammember_row
        //let tblRow = MGT_CreateTblTeammemberRow(tblBody, teammember_dict);
        //MGT_TeammemberUpdateTableRow(tblRow, teammember_dict);





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
        el_MGT_btn_save.disabled = (!selected_scheme_pk || ["update", "create", "delete"].indexOf(mode) === -1);

        const team_mode = get_dict_value(mod_MGT_dict, ["team", "id", "mode"])
        const btn_delete_hidden = (!selected_scheme_pk || team_mode === "create");
        add_or_remove_class (el_MGT_btn_delete, cls_hide, btn_delete_hidden) // args: el, classname, is_add
    }  // MGT_BtnSaveDeleteEnable

// +++++++++ MOD CONFRIM ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-10-23
    function ModConfirmOpen(mode, el_input) {
        console.log(" -----  ModConfirmOpen   ----", mode)
        console.log("mod_upload_dict: ", mod_upload_dict)
        console.log("mod_MGS_dict: ", mod_MGS_dict)
        // modes are schemeitem_delete, delete, inactive, 'grid_si', 'grid_team_delete', 'grid_shift_delete'
        const tblRow = get_tablerow_selected(el_input);

        let tblName, map_dict, pk_str;
        // tblRow is undefined when el_input = undefined
        if(!!tblRow){
            tblName = get_attr_from_el(tblRow, "data-table")
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
        } else if (tblName === "grid_si") {
            const rosterdate = get_attr_from_el_str(el_input, "data-rosterdate");
            let rosterdate_text = format_date_iso (rosterdate, month_list, weekday_list, false, true, loc.user_lang);
            if(!rosterdate_text){ rosterdate_text = "-"}
            const shift_text = get_attr_from_el_str(tblRow, "data-shift_code", "-");
            header_text = loc.Shift + " '" + shift_text + "' " + loc.of + " " + rosterdate_text;
        } else if (tblName === "schemeitem") {
            const rosterdate = get_dict_value(map_dict, ["rosterdate", "value"])
            let rosterdate_text = format_date_iso (rosterdate, month_list, weekday_list, false, true, loc.user_lang);
            if(!rosterdate_text){ rosterdate_text = "-"}
            const shift_text = get_dict_value(mod_upload_dict, ["shift", "code"], "-")
            header_text = loc.Shift + " '" + shift_text + "' " + loc.of + " " + rosterdate_text;
        } else if(tblName === "teammember"){
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
                       (tblName === "team") ? loc.This_team :
                       (tblName === "grid_si") ? loc.This_shift : null
        let msg_02_txt = null, msg_03_txt = loc.want_to_continue;;

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
        el_btn_cancel.innerText = (tblName === "grid_si") ? loc.OK : loc.No_cancel;

// hide ok button when (tblName === "grid_si")
        add_or_remove_class (el_btn_save, cls_hide, (tblName === "grid_si"))
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

        const shift_option =  mod_upload_dict.id.shiftoption;
        console.log("shift_option: ", shift_option );

// ---  hide modal
        $('#id_mod_confirm').modal('hide');

// ---  Upload Changes
        const tblName = get_dict_value(mod_upload_dict, ["id", "table"])
        console.log("tblName: ", tblName );
        if(tblName === "schemeitem"){
            const is_delete_single_si = get_dict_value(mod_upload_dict, ["id", "delete"])
            console.log("is_delete_single_si: ", is_delete_single_si );
            if(is_delete_single_si){
                // this is called by btn_inactive in tblRow
                const pk_int = get_dict_value(mod_upload_dict,["id", "pk"])
                const map_id = get_map_id(tblName, pk_int)
                console.log("map_id ", map_id );
                let tblRow = document.getElementById(map_id);
                console.log("tblRow ", tblRow );
                tblRow.classList.remove(cls_selected);
                tblRow.classList.add("tsa_tr_error");

                // ---  upload upload_list, it can contain multiple upload_dicts (list added because of grid PR2020-03-15)
                let upload_list = [mod_upload_dict];
                UploadChanges(upload_list, url_schemeitem_upload)

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
                    UploadChanges(upload_list, url_schemeitem_upload)
                }
            }  //  if(is_delete_single_si){
        } else if(tblName === "teammember"){
            UploadTeammember(mod_upload_dict, url_teammember_upload)
        //} else if(!!mod_upload_dict.grid_team_delete || !!mod_upload_dict.grid_shift_delete){
        //    UploadChanges(mod_upload_dict, url_teammember_upload);
        } else if(shift_option === "grid_team"){
            UploadChanges(mod_upload_dict, url_teammember_upload);
        } else if(shift_option === "grid_shift"){
            UploadChanges(mod_upload_dict, url_teammember_upload);
        } else {
            // tblName: scheme, shift, team
            UploadChanges(mod_upload_dict, url_scheme_shift_team_upload)
        }
    } // ModConfirmSave

// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModEmployeeOpen  ================ PR2020-03-19
    function ModEmployeeOpen(el_input) {
        console.log(" -----  ModEmployeeOpen   ----")
        // called by EventListener of input employee and replacement in table teammember and MGT_Teammember

        console.log("mod_MGT_dict: ", mod_MGT_dict)
        mod_employee_dict = {};

// ---  add employee disabled in template mode
        if(template_mode){
            // TODO error: el_msg not showing yet
            // ShowMsgError(el_input, el_msg, msg_err, [200,200])
        } else {
// ---  get tm_pk from tlbRow
            const tlbRow = get_tablerow_selected(el_input)
            const tm_pk = get_attr_from_el(tlbRow, "data-pk")
            const team_pk = get_attr_from_el(tlbRow, "data-ppk")
            const tblName = get_attr_from_el(tlbRow, "data-table")
        console.log("tblName: ", tblName)
// ---  get fldName from el_input
            const fldName = get_attr_from_el(el_input, "data-field")
            const is_replacement = (fldName === "replacement")
// ---  get info from from mod_MGT_dict[tm_pk]
            let pk = null, ppk = null, code = null;
            // TODO: make difference betrween grid and tbale
            // was: if (tblName === "grid_teammember")
            if (tblName === "teammember"){
                pk = get_dict_value(mod_MGT_dict, [tm_pk, fldName, "pk"]);
                ppk = get_dict_value(mod_MGT_dict, [tm_pk, fldName, "ppk"]);
                code = get_dict_value(mod_MGT_dict, [tm_pk, fldName, "code"]);
            } else {
                pk = get_attr_from_el_int(el_input, "data-pk")
                ppk = get_attr_from_el_int(el_input, "data-ppk")
                code = get_attr_from_el(el_input, "data-value")
            }

            console.log( ".... mod_MGT_dict[" + tm_pk + "]: " + JSON.stringify( mod_MGT_dict[tm_pk]));
            mod_employee_dict = {teammember_pk: tm_pk, team_pk, team_pk, employee_pk: pk, employee_ppk: ppk, employee_code: code, table: tblName, field: fldName}

            console.log( ",,,,, mod_MGT_dict[" + tm_pk + "]: " + JSON.stringify( mod_MGT_dict[tm_pk]));
// ---  put employee name in header
            let label_text = ((is_replacement) ? loc.Select_replacement_employee : loc.Select_employee ) + ":";
            let el_header = document.getElementById("id_ModSelEmp_hdr_employee")
            let el_label_input = document.getElementById("id_ModSelEmp_lbl_input_employee")
            let el_div_remove = document.getElementById("id_ModSelEmp_div_remove_employee")
            if (!!pk){
                el_header.innerText = code
                el_div_remove.classList.remove(cls_hide)
            } else {
// ---  or header 'select employee' / 'select replacement' /
                el_header.innerText = label_text;
                el_div_remove.classList.add(cls_hide)
            }
            document.getElementById("id_ModSelEmp_lbl_input_employee").innerText = label_text

// remove values from el_mod_employee_input
            let el_mod_employee_input = document.getElementById("id_ModSelEmp_input_employee")
            el_mod_employee_input.value = null

// ---  fill selecttable employee
            MSE_FillSelectTableEmployee(pk, is_replacement)

// ---  set focus to el_mod_employee_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){el_mod_employee_input.focus()}, 500);

// ---  show modal
            $("#id_mod_select_employee").modal({backdrop: true});

        }  //  if(!template_mode)
    };  // ModEmployeeOpen

//=========  MSE_Save  ================ PR2020-03-17
    function MSE_Save(mode) {
        console.log("========= MSE_Save ===", mode );  // mode = 'save' or 'remove'
        // called by MSE_filter_employee, MSE_select_employee, MSE_btn_remove_employee, MSE_btn_remove_employee
        // mod_employee_dict = {teammember_pk, employee_pk, employee_ppk, employee_code, table, field}

        const tblName = get_dict_value(mod_employee_dict, ["table"])
        const fldName = get_dict_value(mod_employee_dict, ["field"])
        const is_replacement = (fldName === "replacement");

        const tm_pk = get_dict_value(mod_employee_dict, ["teammember_pk"])
        const team_pk = get_dict_value(mod_employee_dict, ["team_pk"])

        let employee_pk = null, employee_ppk = null, employee_code = "---";
        if (mode !=="remove"){
            employee_pk = get_dict_value(mod_employee_dict, ["employee_pk"]);
            employee_ppk = get_dict_value(mod_employee_dict, ["employee_ppk"]);
            employee_code = get_dict_value(mod_employee_dict, ["employee_code"]);
        }

// when called by ModGridTeam: save in tblRow, When called by table Teammember: uploadchanges
        //was: if(tblName === "grid_teammember") {
        if(tblName === "teammember") {
            let tm_dict = mod_MGT_dict[tm_pk]
            if(!isEmpty(tm_dict)){
                if(!!employee_pk){
                    tm_dict[fldName] = {pk: employee_pk, ppk: employee_ppk, code: employee_code, update: true};
                } else {
                    tm_dict[fldName] = {update: true};
                }
            }

            console.log( "--- mod_MGT_dict[" + tm_pk + "]: " + JSON.stringify( mod_MGT_dict[tm_pk]));
            const id_dict = get_dict_value(mod_MGT_dict[tm_pk], ["id"])
            console.log( "--- id_dict: " + JSON.stringify( id_dict));
            const id_mode = get_dict_value(id_dict, ["mode"])
            console.log( "--- id_mode: " + id_mode);

            // don't put 'update' in id.mode when id.mode is already 'create' or 'delete'
            if (["create", "delete"].indexOf(id_mode) === -1) {
                tm_dict.id.mode = "update"
            console.log( ".... mod_MGT_dict[" + tm_pk + "]: " + JSON.stringify( mod_MGT_dict[tm_pk]));
            };
            mod_MGT_dict.mode = "update";


            console.log( ",,,, mod_MGT_dict[" + tm_pk + "]: " + JSON.stringify( mod_MGT_dict[tm_pk]));

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
            const pk_int = Number(tm_pk);
            let upload_dict = {id: {pk: pk_int, ppk: team_pk, table: tblName}};
            upload_dict[fldName] = {pk: employee_pk, ppk: employee_ppk, code: employee_code, update: true};

        console.log("upload_dict", upload_dict );
            UploadChanges(upload_dict, url_teammember_upload);

// ---  put code in tblRow
            const row_id = "teammember_" + tm_pk.toString();
            let tblRow = document.getElementById(row_id);
        console.log("tblRow", tblRow );
            if(!!tblRow){
                const col_index = (is_replacement) ? 3 : 0;
                let td = tblRow.cells[col_index];
        console.log("td", td );
                if(!!td){
                    let cell = td.children[0];
        console.log("cell", cell );
                    cell.value = employee_code;
                }
            }

        }
// ---  hide modal
        $("#id_mod_select_employee").modal("hide");
    } // MSE_Save

//=========  MSE_select_employee  ================ PR2020-03-19
    function MSE_select_employee(tblRow) {
        console.log( "===== MSE_select_employee ========= ");
        //console.log( tblRow);
        // tblRow is the selected tblRow in the employee table of the mod page
// ---  deselect all highlighted rows in the employee table
        DeselectHighlightedRows(tblRow, cls_selected)
        if(!!tblRow) {
// ---  highlight clicked row in the employee table
            tblRow.classList.add(cls_selected)
// ---  get employee_dict from employee_map
            const select_pk = get_attr_from_el_int(tblRow, "data-pk")
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk);
            if (!isEmpty(employee_dict)){
// ---  get code_value from employee_dict, put it in mod_employee_dict and el_input_employee
                const employee_code = get_dict_value(employee_dict, ["code", "value"])
                mod_employee_dict.employee_pk = get_dict_value(employee_dict, ["id", "pk"]);
                mod_employee_dict.employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
                mod_employee_dict.employee_code = employee_code;
// ---  put code_value in el_input_employee
                document.getElementById("id_ModSelEmp_input_employee").value = employee_code // null value is ok, will show placeholder
// save selected employee
                MSE_Save("save")
            }  // if (!isEmpty(employee_dict)){
        }  // if(!!tblRow) {
    }  // MSE_select_employee

//=========  MSE_filter_employee  ================ PR2019-05-26
    function MSE_filter_employee(option, event_key) {
        //console.log( "===== MSE_filter_employee  ========= ", option);
        //console.log( "event_key", event_key);

        let el_input = document.getElementById("id_ModSelEmp_input_employee")

// save when clicked 'Enter', TODO only if quicksave === true
        if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
            MSE_Save("save")
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
// remove selected employee from mod_employee_dict
                mod_employee_dict = {};
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

// if only one employee in filtered list: put value in el_input /  mod_employee_dict
        if (has_selection && !has_multiple ) {
// ---  get employee_dict from employee_map
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk);
            if (!isEmpty(employee_dict)){
// ---  get code_value from employee_dict, put it in mod_employee_dict and el_input_employee
                const employee_code = get_dict_value(employee_dict, ["code", "value"])
                mod_employee_dict.employee_pk = get_dict_value(employee_dict, ["id", "pk"]);
                mod_employee_dict.employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
                mod_employee_dict.employee_code = employee_code;
// put code_value of selected employee in el_input
                el_input.value = employee_code
// data-quicksave = true enables saving by clicking 'Enter'
                el_input.setAttribute("data-quicksave", "true")
            }
        }
    }; // MSE_filter_employee

//========= MSE_FillSelectTableEmployee  ============= PR2019-08-18
    function MSE_FillSelectTableEmployee(cur_employee_pk, is_replacement) {
        console.log( "=== MSE_FillSelectTableEmployee ");

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
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                const is_inactive = (!!get_subdict_value_by_key(item_dict, "inactive", "value", false))

//- skip selected employee
// Note: cur_employee_pk gets value from el_input, not from selected_employee_pk because it can also contain replacement
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
                } //  if (pk_int !== selected_employee_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // MSE_FillSelectTableEmployee

// +++++++++ END MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++


//=========  ModSchemeOpen  ================ PR2019-07-20
    function ModSchemeOpen() {
        console.log("=========  ModSchemeOpen =========");

        // hide input box customer and order when in template_mode
        add_or_remove_class (document.getElementById("id_mod_scheme_div_customer_order"), cls_hide, template_mode)
        document.getElementById("id_mod_scheme_header").innerText = (template_mode) ? loc.Add_template : loc.Add_scheme;

        el_mod_code.value = null
        el_mod_cycle.value = 7

        // set focus to el_mod_code, delay 500ms because of modal fade
        setTimeout(function (){el_mod_code.focus();}, 500);

        $("#id_mod_scheme").modal({backdrop: true});

    }  // ModSchemeEOpen

//=========  ModSchemeEdit  ================ PR2019-07-20
    function ModSchemeEdit(mode, event_key) {
        console.log("=========  ModSchemeEdit =========");
        console.log("mode", mode);
        console.log("event_key", event_key);
        // event_key only ued when mode = code
        if(mode === "customer"){
            //console.log("el_mod_cust", el_mod_cust);
            //console.log("el_mod_cust.value", el_mod_cust.value, typeof el_mod_cust.value);
            if(!el_mod_cust.value){
                selected_cust_pk = 0
            } else {
                selected_cust_pk = parseInt(el_mod_cust.value);
                HandleSelectCustomer(el_mod_cust, "ModSchemeEdit")
            }
        }
        if(mode === "order"){
            //console.log("el_mod_order", el_mod_order);
            //console.log("el_mod_order.value: <", el_mod_order.value, "> " +  typeof el_mod_order.value);
            let msg_err, el_err = document.getElementById("id_mod_scheme_order_err")
            if(!el_mod_order.value){
                msg_err = get_attr_from_el(el_data, "data-err_msg_order");
            } else {
                HandleSelectOrder(el_mod_order, "ModSchemeEdit")
            }
            formcontrol_err_msg(el_mod_order, el_err, msg_err)
        }
        if(mode === "code"){
            if(event_key === "Enter") {
                ModSchemeSave()
            } else {
                let msg_err, el_err = document.getElementById("id_mod_scheme_code_err")
                if(!el_mod_code.value){
                    msg_err = get_attr_from_el(el_data, "data-err_msg_code");
                }
                formcontrol_err_msg(el_mod_code, el_err, msg_err)
            }
        }
        if(mode === "cycle"){
            let msg_err, el_err = document.getElementById("id_mod_scheme_cycle_err")
            if(!el_mod_cycle.value){
                const msg_err = get_attr_from_el(el_data, "data-err_msg_cycle");
            }
            formcontrol_err_msg(el_mod_cycle, el_err, msg_err)
        }
    }  // ModSchemeEdit

//=========  ModSchemeSave  ================ PR2019-07-20
    function ModSchemeSave() {
        console.log("=========  ModSchemeSave =========");

        const code = el_mod_code.value
        const cycle_str = el_mod_cycle.value
        //console.log("el_mod_order", el_mod_order);
        //console.log("el_mod_order.value: <", el_mod_order.value, "> " +  typeof el_mod_order.value);

        let has_error = false
        if(!selected_cust_pk){
            msg_err = get_attr_from_el(el_data, "data-err_msg_customer");
            formcontrol_err_msg(el_mod_cust, el_err, msg_err)
            has_error = true
        }
        let msg_err, el_err = document.getElementById("id_mod_scheme_customer_err")
        formcontrol_err_msg(el_mod_cust, el_err, msg_err)

        msg_err = null;
        if(!selected_order_pk){
            msg_err = get_attr_from_el(el_data, "data-err_msg_order");
            has_error = true
        }
        el_err = document.getElementById("id_mod_scheme_order_err")
        formcontrol_err_msg(el_mod_order, el_err, msg_err)

        msg_err = null;
        if (!code){
            msg_err = get_attr_from_el(el_data, "data-err_msg_code");
            has_error = true
        }
        el_err = document.getElementById("id_mod_scheme_code_err")
        formcontrol_err_msg(el_mod_order, el_err, msg_err)

        msg_err = null;
        if (!cycle_str){
            msg_err = get_attr_from_el(el_data, "data-err_msg_cycle");
            has_error = true
        }
        el_err = document.getElementById("id_mod_scheme_cycle_err")
        formcontrol_err_msg(el_mod_order, el_err, msg_err)

        if(!has_error){
//-- increase id_new
            id_new = id_new + 1
            const pk_new = "new" + id_new.toString()

// ---  create id_dict
            const tblName = "scheme"
            let id_dict = {"temp_pk": pk_new, "ppk": selected_order_pk, "table": tblName, "create": true}
            //console.log("id_dict", id_dict);

    // add id_dict to dict
            let dict = {"id": id_dict};
            if (!!code) {dict["code"] = {"value": code, "update": true}}
            const cycle = document.getElementById("id_mod_scheme_cycle").value
            dict["cycle"] = {"value": cycle, "update": true}
            //console.log("dict", dict);

            $("#id_mod_scheme").modal("hide");

            let parameters = {};
            parameters["upload"] = JSON.stringify (dict);
            let response = "";
            $.ajax({
                type: "POST",
                // TODO test new url, was url_scheme__upload
                url: url_scheme_shift_team_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response:");
                    console.log (response);

                    if ("scheme_list" in response) {
                        get_datamap(response["scheme_list"], scheme_map)
                        // SBR_FillSelectTable("scheme", "ModSchemeSave scheme_list", selected_scheme_pk);
                    }
                    if ("scheme_update" in response) {
                        UpdateFromResponse(response["scheme_update"]);
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }   //  if(!has_error)

    }  // function ModSchemeSave


// +++++++++++++++++ MODAL COPYFROM TEMPLATE  +++++++++++++++++++++++++++++++

//========= ModCopyfromTemplateOpen====================================
    function ModCopyfromTemplateOpen () {
        console.log("===  ModCopyfromTemplateOpen  =====") ;

        // disable btn when templates are shown
        if(!template_mode) {
            if(!!selected_order_pk && selected_cust_pk) {
                mod_upload_dict = {"copyto_order_pk": selected_order_pk, "copyto_order_ppk": selected_cust_pk};
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

                SBR_FillSelectTable("template", "ModCopyfromTemplateOpen", 0, false)

                  // selected_order_pk is the order to which de template scheme will be copied.
            // cannot copy if selected_order_pk is blank
                document.getElementById("id_mod_copyfrom_btn_save").readOnly = (!selected_order_pk)

            // ---  show modal
                $("#id_mod_copyfrom").modal({backdrop: true});

            }  //  if(!!selected_order_pk && selected_cust_pk) {
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
            const pk_int = get_subdict_value_by_key(item_dict, "id", "pk")
            const ppk_int = get_subdict_value_by_key(item_dict, "id", "ppk")
            const code = get_subdict_value_by_key(item_dict, "code", "value")
            console.log( "item_dict", item_dict);

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
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_subdict_value_by_key(item_dict, "code", "value");
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

            $("#id_mod_scheme").modal("hide");
// get template pk from modal select
            const template_pk = 0 // = parseInt(el_mod_copyfrom_template_select.value)

    // get template ppk from scheme_template_list
            let template_ppk;
            if(!!template_pk) {
                for(let i = 0, dict, pk_int, len = scheme_template_list.length; i < len; i++){
                    dict = scheme_template_list[i];
                    pk_int = get_dict_value_by_key(dict, "pk")
                    if(pk_int === template_pk){
                        template_ppk = get_subdict_value_by_key(dict,"id", "ppk")
                        break;
                    }
                } // for(let i = 0,
            }  // if(!!template_pk)

// get copyto ppk from selected order
            let selected_order_ppk;
            if(!!selected_order_pk) {
    // get template ppk and ppk from scheme_template_list

// --- loop through scheme_map
                for (const [map_id, item_dict] of scheme_map.entries()) {
                    const pk_int = get_pk_from_dict(item_dict);
                    const ppk_int = get_ppk_from_dict(item_dict);
                    if(pk_int === selected_order_pk){
                        selected_order_ppk = ppk_int
                        break;
                    }
                }
            }  // if(!!selected_order_pk)

// get rosterdate of cyclestart record from schemeitem_template_list
            //let new_datestart;
            //if(!!el_mod_copyfrom_datestart.value){ new_datestart = el_mod_copyfrom_datestart.value }
            //console.log("new_datestart", new_datestart);

            const dict ={"id": {"pk": template_pk, "ppk": template_ppk, "table": "template_scheme"}}
            if (!!template_code){
                dict["code"] = {"value": template_code, "update": true}
                dict["order"] = {"pk": selected_order_pk}
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
       //console.log("selected_scheme_pk: ", selected_scheme_pk) ;

        // disable btn when templates are shown
        if(!template_mode){
            let el_input = document.getElementById("id_mod_copyto_code")
            el_input.innerText = null

        // get selected scheme from scheme_map
            if (!!selected_scheme_pk){

                const map_id = get_map_id("scheme", selected_scheme_pk);
                let item_dict = get_mapdict_from_datamap_by_id(scheme_map, map_id)
                let code_txt = get_subdict_value_by_key (item_dict, "code", "value") + " " + loc.Template.toLowerCase()
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
                const is_template = get_subdict_value_by_key(item_dict, "id", "istemplate")
                    const code = get_subdict_value_by_key(item_dict, "code", "value")
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

        const dict ={id: {pk: selected_scheme_pk, ppk: selected_order_pk,
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

        console.log("el_popup_date", el_popup_date) ;
// ---  reset textbox 'date'
        el_popup_date.value = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)
        const tr_selected_id = get_attr_from_el(tr_selected, "id");

// get info pk etc from tr_selected if called by tablerow
        let el;
        if (!!tr_selected){ el = tr_selected } else {el = el_input}

        const data_table = get_attr_from_el(el, "data-table")
        const data_pk = get_attr_from_el(el, "data-pk")
        const data_ppk = get_attr_from_el(el, "data-ppk");
        console.log("data_table", data_table, "data_pk", data_pk, "data_ppk", data_ppk)

        if(!el_input.readOnly) {
// get values from el_input
            // tr_id is stored in el_popup_date and used in HandlePopupDateSave
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            console.log("data_field", data_field, "data_value", data_value)

            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");
            console.log("data_mindate", data_mindate, "data_maxdate", data_maxdate);

    // put values in el_popup_date
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
            //console.log("inpRect", inpRect)
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
        console.log("tr_id:", tr_id, typeof tr_id);
        console.log("pk_str:", pk_str, "ppk_int:", ppk_int, "fieldname:", fieldname, "tblName:", tblName);

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
        console.log("tr_changed", tr_changed);
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
                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
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
                                FillTableRows("schemeitem")
                            }
                            if ("team_list" in response){
                                get_datamap(response["team_list"], team_map)
                                //SBR_FillSelectTable("team", "HandlePopupDateSave", selected_team_pk, true)
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
        const new_wdy = weekday_list[n_weekday] + ' ' + n_day + ' ' + month_list[n_month_index + 1] + ' ' + n_year


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
                            txt_dateheader: txt_dateheader,
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


    }; // function HandleFilterName

//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict() {  // PR2019-06-09
        //console.log( "===== FilterTableRows_dict  ========= ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tblBody_schemeitem.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody_schemeitem.rows[i]
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
            // hide inactive rows if filter_hide_inactive
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

//###########################################################################
// +++++++++++++++++ OTHER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_dict", setting_dict)
        // only called at openign op page

        let key = "selected_pk";
        if (key in setting_dict){
            const sel_dict = setting_dict[key];
            //console.log("sel_dict", sel_dict)

            // these variables store pk of customer / order from setting.
            // They are used in HandleSelectCustomer to go to saved customer / order
            // field type is integer
            setting_cust_pk = get_dict_value_by_key(sel_dict, "sel_cust_pk", 0);
            setting_order_pk = get_dict_value_by_key(sel_dict, "sel_order_pk", 0);
            setting_scheme_pk = get_dict_value_by_key(sel_dict, "sel_scheme_pk", 0);

            // selected_cust_pk can also contain pk of template customer
            selected_cust_pk = setting_cust_pk;
            selected_order_pk = setting_order_pk;
            selected_scheme_pk = setting_scheme_pk;
        }
        key = "quicksave";
        if (key in setting_dict){
            quicksave = setting_dict[key];
        }
        key = "page_scheme";
        if (key in setting_dict){
            const page_dict = setting_dict[key];
            if ("btn" in page_dict ){
                selected_btn = page_dict["btn"];
                HandleBtnSelect(selected_btn, true);
            }
        }

        console.log("setting_cust_pk", setting_cust_pk)
        console.log("selected_cust_pk", selected_cust_pk)


    }  // UpdateSettings



//========= UpdateHeaderText  ================== PR2019-11-23
    function UpdateHeaderText(){
        //console.log(" --- UpdateHeaderText ---")
        // from fill select order
        let header_text = "";
        // Was:
        //if(!template_mode){
        //    if(el_select_customer.selectedIndex > -1){
        //        if(!!el_select_customer.options[el_select_customer.selectedIndex].text){
        //            header_text = el_select_customer.options[el_select_customer.selectedIndex].text
        //        };
        //    }
        //}

        if(!!template_mode){
            header_text = loc.Template + ":  "
        } else {
            if(!!selected_cust_pk){
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map,"customer", selected_cust_pk)
                const cust_code = get_subdict_value_by_key(map_dict, "code", "value")
                if(cust_code){header_text = cust_code;}
            }
            // index 0 contains 'select order' when there are multiple options)
            // skip if no option selected or when option = 0 with multiple options
            if(!!selected_order_pk){
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(order_map,"order", selected_order_pk)
                const order_code = get_subdict_value_by_key(map_dict, "code", "value")
                if(order_code){
                    if(!!header_text) {header_text += "  -  "};
                    header_text += order_code;
                }
            }
        }
        if(!!selected_scheme_pk){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map,"scheme", selected_scheme_pk)
            const code = get_dict_value(map_dict, ["code", "value"])
            const cycle = get_dict_value(map_dict, ["cycle", "value"])
            if(code){
                if(!template_mode && !!header_text) {header_text += "  -  "};
                header_text +=  code;
            }
            let hdr_right_text = null
            if(cycle){
                hdr_right_text = cycle.toString() + "-" + loc.days_cycle;
            }
            document.getElementById("id_hdr_right_text").innerText = hdr_right_text
        }
        document.getElementById("id_hdr_text").innerText = header_text
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
            if (tblName === "teammember") { map_dict = teammember_map.get(map_id)};
        }
        return map_dict
    }  // get_mapdict_from_tblRow


//========= update_map_item  ====================================
    function update_map_item(tblName, map_id, update_dict){  // PR2019-12-01 PR2020-03-15
        console.log(" --- update_map_item ---", tblName, map_id)
        console.log("update_dict: ", update_dict)
        // called by UpdateFromResponse, Grid_UpdateFromResponse_si, Grid_UpdateFromResponse_tm
        if(!!tblName && !!map_id && !isEmpty(update_dict)){
            const id_dict = get_dict_value(update_dict, ["id"]);

// ---  get is_created and is_deleted from id_dict
            let is_created = false, is_deleted = false;
            const mode = get_dict_value(update_dict, ["id", "mode"])
            console.log("mode: ", ">" + mode + "<")
            if(!!mode){
                // 'mode' is used in grid teammemmber_update_list
                is_created = (mode === "created");
                is_deleted = (mode === "deleted");
            } else {
                is_created = get_dict_value(update_dict, ["id", "created"], false)
                is_deleted = get_dict_value(update_dict, ["id", "deleted"], false)
             }

// ---  replace updated item in map or remove deleted item from map
            let data_map = (tblName === "scheme") ? scheme_map :
                           (tblName === "shift") ? shift_map :
                           (tblName === "team") ? team_map :
                           (tblName === "schemeitem") ? schemeitem_map :
                           (tblName === "teammember") ? teammember_map : null

        console.log("data_map.size before: ", data_map.size)
        console.log("map_id: ", map_id)
            if(is_deleted){
                if(!!data_map.size){
                    data_map.delete(map_id);
                    console.log("is_deleted")
                }
            } else if(is_created){
// ---  insert new item in alphabetical order, but no solution found yet
                data_map.set(map_id, update_dict)
                console.log("is_created")
            } else {
                if(!!data_map.size){
                    data_map.set(map_id, update_dict)
                    console.log("is_updated")
                }
            }
        console.log("data_map: ", data_map)
        }  // if(!isEmpty(id_dict))
    }  // update_map_item

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
    function Grid_FillGrid(scheme_dict) {
        console.log(" === Grid_FillGrid ===") // PR2020-03-13
        console.log("scheme_dict: ", scheme_dict) // PR2020-03-13

        let el_btn_code = document.getElementById("id_grid_scheme_btn_code")
        let el_btn_cycle = document.getElementById("id_grid_scheme_btn_cycle")
        let el_btn_datefirstlast = document.getElementById("id_grid_scheme_btn_datefirstlast")
        let el_btn_exph = document.getElementById("id_grid_scheme_btn_exph")
        let el_btn_exch = document.getElementById("id_grid_scheme_btn_exch")

// ---  reset scheme fields
        el_btn_code.innerText = loc.Scheme + ":";
        el_btn_cycle.innerText = loc.Cycle + ":";
        el_btn_datefirstlast.innerText = "-";
        el_btn_exph.innerText = "-";
        el_btn_exch.innerText = "-";

// ---  put scheme values in scheme section
        if(!isEmpty(scheme_dict)){
            const scheme_pk = get_dict_value(scheme_dict, ["id", "pk"])
            const scheme_code = get_dict_value(scheme_dict, ["code", "value"]);
            el_btn_code.innerText = get_dict_value(scheme_dict, ["code", "value"])
            const cycle = get_dict_value(scheme_dict, ["cycle", "value"])
            if(cycle){el_btn_cycle.innerText = cycle.toString() + "-" + loc.days_cycle};
            const exph = get_dict_value(scheme_dict, ["excludepublicholiday", "value"], false)
            el_btn_exph.innerText = (exph) ? loc.Not_on_public_holidays : loc.Also_on_public_holidays;
            const exch = get_dict_value(scheme_dict, ["excludecompanyholiday", "value"], false)
            el_btn_exch.innerText = (exch)  ? loc.Not_on_company_holidays : loc.Also_on_company_holidays;
            const datefirst_iso = get_dict_value(scheme_dict, ["datefirst", "value"], "")
            const datelast_iso = get_dict_value(scheme_dict, ["datelast", "value"], "")

            let periodtext = "", prefix = "";
            if(!!datefirst_iso && !!datelast_iso) {
                prefix = loc.Period + ":"
                periodtext = get_periodtext_sidebar(datefirst_iso, datelast_iso,
                        prefix, null, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
            } else if(!!datefirst_iso) {
                prefix = loc.Period + ": " + loc.As_of_abbrev.toLowerCase()
                periodtext = get_periodtext_sidebar(datefirst_iso, datelast_iso,
                        prefix, null, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
            } else if(!!datelast_iso) {
                prefix = loc.Period + ": " + loc.Through.toLowerCase()
                periodtext = get_periodtext_sidebar(datefirst_iso, datelast_iso,
                        prefix, null, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang);
            } else {
                periodtext = loc.Period + ": " + loc.All.toLowerCase()
            }
            el_btn_datefirstlast.innerText = periodtext;

// fill grid_teams_dict, teams and shifts
            Grid_CreateTblTeams(scheme_pk);
            Grid_CreateTblShifts(scheme_pk)
            Grid_FillTblShifts(scheme_pk)
        }  //if(!isEmpty(scheme_dict)){
    }  // Grid_FillGrid

//=========  Grid_CreateTblTeams  === PR2020-03-13
    function Grid_CreateTblTeams(scheme_pk) {
        console.log("===  Grid_CreateTblTeams == ");

        let tblBody = document.getElementById("id_grid_tbody_team");
        tblBody.innerText = null

        grid_teams_dict = {}

/*  structure of  grid_teams_dict:
       keys are team_pk's,
       value has id_dict:  {id: {col: index, row_id: id, code: team_code, abbrev: abbrev}};
       plus dict for every teammember of team
       2376: { id: {col: 4, row_id: "team_2376", code: "Ploeg E", abbrev: "E"}
               1327: {row: 2, row_id: "tm_1327", display: "---"} }
       new: {  id: {col: 5} }
*/
// ---  create Team select_row and header_row
        let tblRow_select = tblBody.insertRow (-1);
        let tblRow_header = tblBody.insertRow (-1);

// --- loop through team_map and add column for each team
        let col_index = 0;
        if (!!scheme_pk){
            for (const [map_id, team_dict] of team_map.entries()) {
                const ppk_int = get_dict_value(team_dict, ["id", "ppk"], 0);
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict
                if (!!ppk_int && scheme_pk === ppk_int) {
                    const pk_int = get_dict_value(team_dict, ["id", "pk"], 0);
                    if(!!pk_int){
// ---  get abbrev of team_code
                        const team_code = get_dict_value(team_dict, ["code", "value"], "");
                        const abbrev = get_dict_value(team_dict, ["code", "abbrev"], "");
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
                        th_select.innerText = "\u22BB";
                        tblRow_select.appendChild(th_select);
// ---  add th to tblRow_header.
                        let th_header = document.createElement("th");
                        th_header.classList.add("grd_team_th");
                        th_header.innerText = get_dict_value(team_dict, ["code", "value"], "-");
// ---  add EventListener to th_header
                        th_header.addEventListener("click", function() {MGT_Open(th_header)}, false )
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
            const team_code = "< " + loc.New.toLowerCase() + " >";
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
            th.addEventListener("click", function() {MGT_Open(th)}, false )
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
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict,
                if (!!scheme_pk_in_dict && scheme_pk === scheme_pk_in_dict) {
                    const team_pk = get_dict_value(tm_dict, ["id", "ppk"], 0);
                    if(!!team_pk){
                        let team_dict = grid_teams_dict[team_pk];
                        if (!!team_dict){
                            const tm_pk = get_dict_value(tm_dict, ["id", "pk"], 0);
// ---  count how many teammembers this team_dict already has
                            // team_dict also has key 'id', therefore count = length - 1
                            const tm_dict_length = Object.keys(team_dict).length;
                //console.log("tm_dict_length", tm_dict_length)
                            // select_row has index 0, header_row has index 1
                            // first teammember has row index 2 : index = tm_dict_length + 1, min = 2
                            const row_index = (!!tm_dict_length) ? tm_dict_length + 1 : 2;
                //console.log("row_index", row_index)
                //console.log("max_row_index", max_row_index)
                            // add row to table when necessary
                            if (row_index > max_row_index) {
                                max_row_index = row_index
// add new tblRow when row_index > max_row_index
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

            // add EventListener to lookup_cell
                                lookup_cell.addEventListener("click", function() {MGT_Open(lookup_cell)}, false )
                                lookup_cell.classList.add("pointer_show")
            // add data-pk and data-ppk to lookup_cell
                                lookup_cell.setAttribute("data-team_pk", team_pk);
                                lookup_cell.setAttribute("data-scheme_pk", scheme_pk);

            //console.log("tm_employee_code", tm_employee_code)
            //console.log("lookup_column", lookup_column)
                            }
                        }  // if (!!team_dict)
                    }
                }
            }
            //console.log( " grid_teams_dict", grid_teams_dict);
        }  // if (!!scheme_pk)
    };  // Grid_CreateTblTeams

//=========  Grid_CreateTblShifts  === PR2020-03-13
    function Grid_CreateTblShifts(scheme_pk) {
        //console.log("===  Grid_CreateTblShifts == ", scheme_pk, cycle)

        let tblBody = document.getElementById("id_grid_tbody_shift");
        tblBody.innerText = null

// --- reset list of map_id's of the schemeitems of the selected scheme
        grid_schemeitem_list = [];

        let min_rosterdate = null, cycle = null
        if (!!scheme_pk){
            const scheme_dict = get_mapdict_from_datamap_by_tblName_pk(scheme_map, "scheme", scheme_pk)
            cycle = get_dict_value(scheme_dict, ["cycle", "value"])

// +++  loop through schemeitem_map to get first rosterdate and store schemeitems of this scheme in grid_schemeitem_map
            for (const [map_id, si_dict] of schemeitem_map.entries()) {
                const ppk_int = get_dict_value(si_dict, ["id", "ppk"], 0);
// ---  skip if scheme_pk_in_dict does not exist or does not match ppk_in_dict
                if (!!ppk_int && scheme_pk === ppk_int) {
                    const pk_int = get_dict_value(si_dict, ["id", "pk"], 0);
                    const rosterdate = get_dict_value(si_dict, ["rosterdate", "value"]);
                    const shift_pk = get_dict_value(si_dict, ["shift", "pk"]);
                    const team_pk = get_dict_value(si_dict, ["team", "pk"]);

// ---  add map_id of this schemeitem to grid_schemeitem_list
                    grid_schemeitem_list.push(map_id);

// ---  get min_rosterdate
                    // localeCompare() returns 0 if both strings are equal,
                    //  -1 if string 1 is sorted before string 2 and 1 if string 2 is sorted before string 1.
                    //var result = string1.localeCompare(string2);
                    if (!min_rosterdate || rosterdate.localeCompare(min_rosterdate) < 0) {
                        min_rosterdate = rosterdate
                    }
                }
            }
        }  // if (!!scheme_pk)

        if(!min_rosterdate){min_rosterdate = today_dict.value}
        console.log("min_rosterdate ", min_rosterdate)
        if(!!min_rosterdate){
            // col_rosterdate_dict stores rosterdate of each column, used to create id for each cell "2020-03-14_1784" (rosterdate + "_" + shift_pk)
            let col_rosterdate_dict = {};

// +++  create two header rows, one for the weekdays and the other for dates
            let tblRow_weekday = tblBody.insertRow (-1);  // index -1: insert new cell at last position.// ---  create Team header row
            let tblRow_date = tblBody.insertRow (-1);  // index -1: insert new cell at last position.
// --- create header with dates, number of columns = cycle + 1
            let first_month_index = -1, last_month_index = -1, first_year = 0, last_year = 0;
            let date_JS = get_dateJS_from_dateISO_vanilla(min_rosterdate)
            let cell_weekday, cell_date;
            for (let col_index = 0, td; col_index < cycle + 1 ; col_index++) {
// ---  add th to tblRow_weekday.
                let th = document.createElement("th");
                const cls = (col_index === 0) ? "grd_shift_th_first" : "grd_shift_th";
                th.classList.add(cls);
                tblRow_weekday.appendChild(th);
// ---  add th to tblRow_date.
                th = document.createElement("th");
                th.classList.add(cls);
                tblRow_date.appendChild(th);
                if (!!col_index){
// ---  add rosterdate to col_rosterdate_dict
                    col_rosterdate_dict[col_index] = get_dateISO_from_dateJS_vanilla(date_JS);

                    cell_weekday = tblRow_weekday.cells[col_index];
                    const weekday_index = (!!date_JS.getDay()) ? date_JS.getDay() : 7;  // index 0 is index 7 in weekday_list
                    cell_weekday.innerText = loc.weekdays_abbrev[weekday_index];

                    cell_date = tblRow_date.cells[col_index];
                    cell_date.innerText = date_JS.getDate().toString();

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
                    const pk_int = get_dict_value(shift_dict, ["id", "pk"], 0);
                    const is_restshift = get_dict_value(shift_dict, ["isrestshift", "value"], false);
                    let shift_code = get_dict_value(shift_dict, ["code", "value"], "---");
                    if( is_restshift) {shift_code += " (R)"}
                    if(!!pk_int){
                        const row_id ="grid_shift_" + pk_int.toString();
                        shifts_dict[pk_int] = {row: row_index};
                        row_index += 1
// ---  add tblRow.
                        let tblRow_shift = tblBody.insertRow (-1);  // index -1: insert new cell at last position.
                        tblRow_shift.setAttribute("id", row_id);
                        tblRow_shift.setAttribute("data-table", "grid_si");
                        tblRow_shift.setAttribute("data-shift_pk", pk_int);
                        tblRow_shift.setAttribute("data-shift_ppk", ppk_int);
                        tblRow_shift.setAttribute("data-shift_code", shift_code);
// ---  add td's to tblRow.
                        for (let col_index = 0, cell_id; col_index < cycle + 1 ; col_index++) {
                            let rosterdate = col_rosterdate_dict[col_index];
                            const is_shift_cell = (col_index === 0);
// ---  add id to cells
                            let td_si = document.createElement("td");
                            if (is_shift_cell) {
                                cell_id = "cell_shift_" + pk_int.toString();
                                td_si.innerText =  shift_code;
                            } else {
                                cell_id = "si_" + rosterdate + "_" + pk_int.toString();
                                td_si.setAttribute("data-rosterdate", rosterdate);
                            }
                            td_si.setAttribute("id", cell_id);
                            td_si.classList.add((is_shift_cell) ? "grd_shift_td_first" : "grd_shift_td");
                            td_si.addEventListener("click", function() {Grid_SchemitemClicked(td_si, is_shift_cell)}, false )
// ---  add hover to cells
                            td_si.addEventListener("mouseenter", function() {td_si.classList.add(cls_hover)});
                            td_si.addEventListener("mouseleave", function() {td_si.classList.remove(cls_hover)});

                            tblRow_shift.appendChild(td_si);
                        }  // for (let i = 0; i < cycle + 1 ; i++)
                    }
                 }
            }  // for (const [map_id, shift_dict] of shift_map.entries()) {


// +++++++++++++++++++++++++++++++++++  add footer row  ++++++++++++++++++++++++++++++++

// +++  create two header rows, one for the weekdays and the other for dates
            let tblRow_footer = tblBody.insertRow (-1);  // index -1: insert new cell at last position.// ---  create Team header row

            id_new = id_new + 1
            const pk_new = "new" + id_new.toString()
            tblRow_footer.setAttribute("data-shift_pk", pk_new);
            tblRow_footer.setAttribute("data-shift_ppk", scheme_pk);

// ---  add td's to tblRow_footer.
            for (let col_index = 0, cell_id; col_index < cycle + 1 ; col_index++) {
// ---  add id to cells
                let td_si = document.createElement("th");
                if (col_index === 0) {
// ---  add cell 'addnew' th to tblRow.
                    const cell_id = "shift_" + pk_new;
                    td_si.setAttribute("id", cell_id);
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


        } //  if(!!min_rosterdate)
    }  // Grid_CreateTblShifts

//=========  Grid_FillTblShifts  === PR2020-03-14
    function Grid_FillTblShifts(scheme_pk) {
        //console.log("===  Grid_FillTblShifts == ")
        let tblBody = document.getElementById("id_grid_tbody_shift");

        //console.log("scheme_pk ", scheme_pk)
        //console.log("selected_scheme_pk ", selected_scheme_pk)
        //console.log("grid_schemeitem_list ", grid_schemeitem_list)

// ---  loop through grid_schemeitem_list. This contains the map_id's of the schemeitems of selected scheme
        for (let i = 0, len = grid_schemeitem_list.length; i < len ; i++) {
            const map_id = grid_schemeitem_list[i];
            const si_dict = get_mapdict_from_datamap_by_id(schemeitem_map, map_id);
            if (!isEmpty(si_dict)) {
                //console.log("si_dict", si_dict)
                const si_pk_int = get_dict_value(si_dict, ["id", "pk"], 0);
                const ppk_int = get_dict_value(si_dict, ["id", "ppk"], 0);
                const rosterdate = get_dict_value(si_dict, ["rosterdate", "value"]);
                const team_pk = get_dict_value(si_dict, ["team", "pk"], 0);
                let team_row_id, team_abbrev = "";
                if (!!team_pk){
                    team_abbrev = get_dict_value(grid_teams_dict, [team_pk, "id", "abbrev"])
                    team_row_id = get_dict_value(grid_teams_dict, [team_pk, "id", "row_id"])
                }
                const shift_pk = get_dict_value(si_dict, ["shift", "pk"], 0);
// ---  lookup cell of this rosterdate and shift_pk
                const cell_id = "si_" + rosterdate + "_" + shift_pk.toString();
                let cell = document.getElementById(cell_id);
                if(!!cell){
                    cell.classList.add("has_si")
                    if(!!team_row_id) {cell.classList.add(team_row_id)};

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
                    cell.innerText = set_cell_innertext(cell.innerText, team_abbrev)
                }
            }
        }
    }  //  Grid_FillTblShifts

//=========  Grid_UpdateCell  === PR2020-03-15
    function Grid_UpdateCell(cell_id) {
        //console.log("===  Grid_UpdateCell == ")
// ---  get rosterdate from cell
        let cell = document.getElementById(cell_id);
        if(!!cell){
            const cell_rosterdate = get_attr_from_el(cell, "data-rosterdate");
    // ---  get shift_pk from tblRow
            const cell_shift_pk = get_attr_from_el_int(cell.parentNode, "data-shift_pk");

            if(!!cell_rosterdate && !!cell_shift_pk) {
    // reset attributes
                cell.classList.remove("has_si")
                cell.removeAttribute("data-si_pk")
                cell.removeAttribute("data-team_pk")
                const class_list = cell.classList;
                for (let i = 0, len = class_list.length; i < len ; i++) {
                    const class_name = class_list[i]
                    if(!!class_name){
                        const class_name_sliced = class_name.slice(0,5)
                        if( class_name_sliced === "team_" ){
                            cell.classList.remove(class_name)
                        }
                    }
                }
                cell.innerText = null;
                let cell_contains_selected_team = false;
    // ---  loop through grid_schemeitem_list. This contains the map_id's of the schemeitems of selected scheme
                for (let i = 0, len = grid_schemeitem_list.length; i < len ; i++) {
                    const map_id = grid_schemeitem_list[i];
                    const si_dict = get_mapdict_from_datamap_by_id(schemeitem_map, map_id);
                    if (!isEmpty(si_dict)) {
    // ---  get only de schemeitems of this shift and this rosterdate
                        const shift_pk = get_dict_value(si_dict, ["shift", "pk"], 0);
                        const rosterdate = get_dict_value(si_dict, ["rosterdate", "value"]);
                        if(shift_pk === cell_shift_pk && rosterdate === cell_rosterdate ){
                            const si_pk_int = get_dict_value(si_dict, ["id", "pk"], 0);
                            const team_pk = get_dict_value(si_dict, ["team", "pk"], 0);
                            let team_row_id, team_abbrev = "";
                            if (!!team_pk){
                                team_abbrev = get_dict_value(grid_teams_dict, [team_pk, "id", "abbrev"])
                                team_row_id = get_dict_value(grid_teams_dict, [team_pk, "id", "row_id"])
                                if(team_pk === grid_selected_team_pk){
                                    cell_contains_selected_team = true
                                }
                            }
                            cell.classList.add("has_si")
                            if(!!team_row_id) {cell.classList.add(team_row_id)};

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
                            cell.innerText = set_cell_innertext(cell.innerText, team_abbrev)

                        }  //   if(shift_pk === cell_shift_pk && rosterdate === cell_rosterdate ){
                    }  //  if (!isEmpty(si_dict)) {
                }  // for (let i = 0, len = grid_schemeitem_list.length; i < len ; i++) {

    // ---  highlight cell when selected team in cell
                cell.classList.remove(cls_bc_yellow);
                cell.classList.add("border_bg_valid");
                setTimeout(function (){
                    cell.classList.remove("border_bg_valid");
                    if (cell_contains_selected_team){ cell.classList.add(cls_bc_yellow)};
                }, 2000);

            }  // if(!!cell_rosterdate && !!cell_shift_pk)

        }  //  if(!!cell)
    }  //  Grid_UpdateCell

//=========  Grid_SelectTeam  === PR2020-03-14
    function Grid_SelectTeam(called_by, th_select) {
        console.log("===  Grid_SelectTeam == ", called_by);
        // when th_select = null: deselect all (happens when clicked outside grid tables, or when mod_MGT opens)
        let th_select_cellIndex = -1, team_pk_str = null;
        grid_selected_team_pk = 0;
        if(!!th_select) {
// ---  get selected_team_pk from th_select
            th_select_cellIndex = th_select.cellIndex
            team_pk_str = th_select.id.toString();
            grid_selected_team_pk = get_attr_from_el_int(th_select, "data-team_pk")
        }

// ---  highlight cells of this team in tbody_teams
        let tbody_teams = document.getElementById("id_grid_tbody_team");
        for (let i = 1, row, len = tbody_teams.rows.length; i < len; i++) {
            row = tbody_teams.rows[i];
            const cls_selected = (i === 1) ? "grd_team_th_selected" : "grd_team_td_selected";
            const cls_not_selected = (i === 1) ? "grd_team_th" : "grd_team_td";
            for (let j = 0, cell, len = row.cells.length; j < len; j++) {
                cell = row.cells[j];
                const team_pk = get_attr_from_el(cell, "data-team_pk")
                if(!!team_pk) {
                    if (cell.cellIndex === th_select_cellIndex){
                        cell.classList.add(cls_selected);
                        cell.classList.remove(cls_not_selected);
                    } else {
                        cell.classList.add(cls_not_selected);
                        cell.classList.remove(cls_selected);
                    }
                }
            }
        }

// ---  highlight cells with this team in tbody_shift
        let tbody_shift = document.getElementById("id_grid_tbody_shift");
        let elements = tbody_shift.querySelectorAll(".has_si")
        for (let i = 0, el, len = elements.length; i < len; i++) {
            el = elements[i]
            const is_selected_team = el.classList.contains(team_pk_str)
            if (is_selected_team){
                el.classList.add(cls_bc_yellow_light);
            } else {
                el.classList.remove(cls_bc_yellow_light);
            }
        };
    }  // Grid_SelectTeam

//=========  Grid_SchemitemClicked  === PR2020-03-14
    function Grid_SchemitemClicked(td_clicked, is_shift_cell) {
        console.log("===  Grid_SchemitemClicked == ");
        console.log("grid_selected_team_pk ", grid_selected_team_pk);
        console.log("is_shift_cell ", is_shift_cell);

// open ModConfirm if there is no team selected

        if(!!is_shift_cell) {
            MGS_Open(td_clicked)

        } else if(!!grid_selected_team_pk) {
// ---  get team_abbrev from team_map
            const team_dict = get_mapdict_from_datamap_by_tblName_pk(team_map, "team", grid_selected_team_pk)
            const team_abbrev = get_dict_value(team_dict, ["code", "abbrev"], "")
// ---  get info from tnlRow tr_clicked
            const tr_clicked = td_clicked.parentNode
            const shift_pk = Number(get_attr_from_el(tr_clicked, "data-shift_pk"))
            const scheme_pk = Number(get_attr_from_el(tr_clicked, "data-shift_ppk"))
// ---  get cell_id_str and rosterdate from cell td_clicked
            const cell_id_str = get_attr_from_el(td_clicked, "id", "");
            const rosterdate = get_attr_from_el(td_clicked, "data-rosterdate")
            // only if there is a rosterdate and shift_pk selected (must be always the case)
            if(!!rosterdate && !!shift_pk && !!scheme_pk) {
               let upload_list = [];
// ---  get si_pk_arr from td_clicked. It can be array string: '2132;2128;2128'
                const si_pk_str = get_attr_from_el(td_clicked, "data-si_pk", "");
                const si_pk_arr = si_pk_str.split(";");
                console.log("si_pk_arr ", si_pk_arr, typeof si_pk_arr);
// ---  loop through si_pk_arr, get info from schemitem_map and check if team_pk = grid_selected_team_pk
                let has_si_with_sel_team = false;
                let si_pk_without_team = null;  // when team is added: store in si_without_team, if any
                for (let i = 0, team_pk, si_pk, len = si_pk_arr.length; i < len; i++) {
                    si_pk = Number(si_pk_arr[i]);
                    if(!!si_pk){
// ---  get info from schemitem_map and check if team_pk = grid_selected_team_pk
                        const si_dict = get_mapdict_from_datamap_by_tblName_pk(schemeitem_map, "schemeitem", si_pk )
                        if(!isEmpty(si_dict)){
                            team_pk = get_dict_value(si_dict, ["team", "pk"])
                            const team_code = get_dict_value(si_dict, ["team", "code"], "-")
                                // if no team_pk, put si_pk in si_pk_without_team (skip if si_pk_without_team = true)
                            if (!team_pk && !si_pk_without_team) { si_pk_without_team = si_pk};
// ---  check if team_pk = grid_selected_team_pk
                            if(!!team_pk && team_pk === grid_selected_team_pk){
                                if (!has_si_with_sel_team){
                                    has_si_with_sel_team = true;
// ---  remove team_pk from first schemeitem, make inactive false
                                    upload_list.push({id: {mode: "grid", table: "schemeitem",
                                                    pk: si_pk, ppk: scheme_pk, cell_id: cell_id_str},
                                                    team: {pk: null, ppk: scheme_pk, code: team_code, update: true},
                                                    inactive: {value: false, update: true}})
                                } else {
// ---  if there are multiple schemeitems with this team: delete other schemeitems with this team
                                    upload_list.push({id: {mode: "grid", table: "schemeitem", delete: true,
                                                    pk: si_pk, ppk: scheme_pk,  cell_id: cell_id_str},
                                                    team: {pk: null, ppk: scheme_pk, code: team_code}});
                                }
                            }
                        }
                    }
                }
                // add or remove new team already in cell, before upload response
                const old_innertext = td_clicked.innerText;
                const is_remove = has_si_with_sel_team
                td_clicked.innerText = set_cell_innertext(old_innertext, team_abbrev, is_remove)
                if(is_remove){
                    td_clicked.classList.remove(cls_bc_yellow)
                } else {
                    td_clicked.classList.add(cls_bc_yellow)
                }
// ---  when there are no schemeitems with this team in his cell: add schemeitem
                if(!has_si_with_sel_team) {
                    // first look if there are anu schemitems without team. If so add team,
                    if(!!si_pk_without_team){
                    // ---  remove team_pk from first schemeitem, make inactive false
                        upload_list.push({
                            id: {mode: "grid", table: "schemeitem", pk: si_pk_without_team, ppk: scheme_pk, cell_id: cell_id_str},
                            team: {pk: grid_selected_team_pk, ppk: scheme_pk, update: true},
                            inactive: {value: false, update: true}
                        })
                    } else {
                        // otherwise: create new schemitm
                        // mode = 'grid' returns 'si_update_list' , otherwise 'schemeitem_update'
                        upload_list.push( {
                            id: {mode: "grid", table: "schemeitem", create: true, ppk: scheme_pk, cell_id: cell_id_str},
                            rosterdate: { value: rosterdate}, // required field, update: true not necessary when create
                            shift: {pk: shift_pk, ppk: scheme_pk }, // required field, update: true not necessary when create
                            team: {pk: grid_selected_team_pk, ppk: scheme_pk, update: true}
                        });
                    }
                }
// ---  upload upload_list, it can contain multiple upload_dicts
                if (upload_list.length){
                    UploadChanges(upload_list, url_schemeitem_upload);
                }
            }  // if(!!rosterdate && !!shift_pk)

        } else  {
            // show message to select team first
            ModConfirmOpen("grid_si", td_clicked)
        }  // if(!!grid_selected_team_pk)
    }  // Grid_SchemitemClicked

}); //$(document).ready(function()