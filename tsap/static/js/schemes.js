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

        let setting_cust_pk = 0;
        let setting_order_pk = 0;
        let setting_scheme_pk = 0;
        let selected_btn = "";

        let loc = {};  // locale_dict
        let period_dict = {};
        let mod_upload_dict = {};

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
        let tblBody_scheme_select = document.getElementById("id_select_tbody_scheme")
        let tblBody_shift_select = document.getElementById("id_select_tbody_shift")
        let tblBody_team_select = document.getElementById("id_select_tbody_team")

        let tblBody_schemeitem = document.getElementById("id_tbody_schemeitem");

        let el_timepicker = document.getElementById("id_timepicker")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

        let customer_map = new Map();
        let order_map = new Map();

        let scheme_map = new Map();
        let schemeitem_map = new Map();

        let shift_map = new Map();
        let team_map = new Map();

        let teammember_map = new Map();
        let employee_map = new Map();

        const tbl_col_count = {"schemeitem": 8, "shift": 5, "teammember": 4}
        const thead_text = {
            "schemeitem": ["txt_date", "txt_shift", "txt_team", "txt_timestart", "txt_timeend", "txt_break"],
            "shift": ["txt_shift", , "txt_timestart", "txt_timeend", "txt_break"],
            "teammember": ["txt_employee", "txt_datefirst", "txt_datelast", ]}
        const field_names = {
            "schemeitem": ["rosterdate", "shift", "team", "offsetstart", "offsetend", "breakduration", "inactive", "delete"],
            "shift": ["code", "isrestshift", "offsetstart", "offsetend", "breakduration"],
            "teammember": ["employee", "datefirst", "datelast", "delete"]}
        const field_tags = {
            "schemeitem": ["input", "select", "select", "input","input", "input", "a", "a"],
            "shift": ["input", "a", "input", "input", "input"],
            "teammember": ["input", "input", "input", "a"]}
        const field_width = {"schemeitem": ["120", "120", "180", "090", "090", "090", "032", "032"],
            "shift": ["180", "060", "120", "120", "120"],
            "teammember": ["220", "120", "120", "032"]}
        const field_align = {
            "schemeitem": ["left", "left", "left", "right", "right", "right", "left", "left"],
            "shift": ["left", "left", "right", "right", "right"],
            "teammember": ["left", "left", "left", "right"]}

        const field_right_align = {"schemeitem": [3,4,5,6], "shift": [2,3,5], "teammember": [4]}
        const field_center_align = {"schemeitem": [], "shift": [], "teammember": []}

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

        const url_emplhour_fill_rosterdate = get_attr_from_el(el_data, "data-emplhour_fill_rosterdate_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive_grey = get_attr_from_el(el_data, "data-imgsrc_inactive_grey");
        const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");

        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
                const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_rest_black = get_attr_from_el(el_data, "data-imgsrc_rest_black");

        const title_restshift =  get_attr_from_el(el_data, "data-title_restshift");

        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const title_prev = get_attr_from_el(el_data, "data-timepicker_prevday_info");
        const title_next = get_attr_from_el(el_data, "data-timepicker_nextday_info");

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        moment.locale(user_lang)

//  ========== EventListeners  ======================

// --- create EventListener for buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSelect(mode)}, false )
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

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_mod_employee_body");
        document.getElementById("id_mod_employee_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() {ModEmployeeFilterEmployee("filter", event.key)}, 50)});
        document.getElementById("id_mod_employee_btn_save").addEventListener("click", function() {ModEmployeeSave("save")}, false )
        document.getElementById("id_mod_employee_btn_remove").addEventListener("click", function() {ModEmployeeSave("remove")}, false )

// ---  Modal Addnew
        let el_mod_cust = document.getElementById("id_mod_scheme_customer")
        el_mod_cust.addEventListener("change", function() {ModSchemeEdit("customer")}, false)
        let el_mod_order = document.getElementById("id_mod_scheme_order")
        el_mod_order.addEventListener("change", function() {ModSchemeEdit("order")}, false)
        let el_mod_code = document.getElementById("id_mod_scheme_code")
        el_mod_code.addEventListener("change", function() {
            setTimeout(function() {ModSchemeEdit("code")}, 250)}, false )
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
            el_confirm_btn_save.addEventListener("click", function(){ModConfirmSave()});

// ---  save and delete button in ModRosterdate
        document.getElementById("id_mod_rosterdate_input").addEventListener("change", function(){ModRosterdateEdit()}, false)
        document.getElementById("id_mod_rosterdate_btn_ok").addEventListener("click", function(){ModRosterdateSave()}, false)

// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )

        // buttons in  popup_wdy
        let el_popup_wdy = document.getElementById("id_popup_wdy");
             document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_save").addEventListener("click", function() {HandlePopupWdySave();}, false )

// ---  Input elements in scheme box
        let el_scheme_code = document.getElementById("id_scheme_code")
            el_scheme_code.addEventListener("change", function() {Upload_Scheme()}, false)
        let el_scheme_cycle = document.getElementById("id_scheme_cycle");
            el_scheme_cycle.addEventListener("change", function() {Upload_Scheme()}, false)
        let el_scheme_datefirst = document.getElementById("id_scheme_datefirst");
            el_scheme_datefirst.addEventListener("click", function() {HandlePopupDateOpen(el_scheme_datefirst)}, false);
        let el_scheme_datelast = document.getElementById("id_scheme_datelast");
            el_scheme_datelast.addEventListener("click", function() {HandlePopupDateOpen(el_scheme_datelast)}, false);

        let el_scheme_btn_add = document.getElementById("id_form_btn_add");
            el_scheme_btn_add.addEventListener("click", function() {ModSchemeOpen()}, false);

        let el_scheme_btn_delete = document.getElementById("id_form_btn_delete");
            el_scheme_btn_delete.addEventListener("click", function() {UploadDeleteSchemeFromForm()}, false);


// ---  Input elements in teamcode box
        let el_team_code = document.getElementById("id_team_code")
            el_team_code.addEventListener("change", function() {Upload_Team()}, false)

// --- close windows
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
    // close el_popup_wdy
            let close_popup = true
            if (event.target.classList.contains("input_popup_date")) {
                close_popup = false
            } else if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {
                close_popup = false
            }
            if (close_popup) {
                popupbox_removebackground();
                el_popup_wdy.classList.add(cls_hide);
            };

// close el_timepicker
            close_popup = true
            if (event.target.classList.contains("input_timepicker")) {close_popup = false} else
            //if (el_timepicker.contains(event.target) && !event.target.classList.contains("timepicker_close")) {close_popup = false}
            if (el_timepicker.contains(event.target)) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide)
            };

// close el_popup_date_container
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_date
            if (event.target.classList.contains("input_popup_date")) {
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_date_container.contains(event.target) && !event.target.classList.contains("popup_close")){
                close_popup = false
            }
            if (close_popup) {
                popupbox_removebackground();
                el_popup_date_container.classList.add(cls_hide)
            };
        }, false);


// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_schm"));

// --- create header row and addnew rows
        CreateSelectHeaderRows();
        CreateSelectAddnewRows();

// --- create header row and footer
        CreateTblHeaders();
        CreateTblFooters();

// --- first get locale, to make it faster
        DatalistDownload({setting: {page_scheme: {mode: "get"},
                                      selected_pk: {mode: "get"},
                                      },
                           quicksave: {mode: "get"},
                           locale: {page: "scheme"}
                           });

        const datalist_request = {customer: {isabsence: false, istemplate: null, inactive: false},
                                  order: {isabsence: false, istemplate: null, inactive: false},
                                  scheme: {istemplate: null, inactive: null, issingleshift: false},
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
                }
               // if ("period" in response) {
                //    period_dict= response["period"];
               //     CreateTblPeriod();
                //}
                // setting_list come before 'customer' and 'order'
                if ("setting_list" in response) {
                    UpdateSettings(response["setting_list"])
                }
                // 'order' must come before 'customer'
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                }
                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)

        // fill the three select customer elements
                    FillSelectOptionDict("customer", "customer_list response");
                    HandleSelectCustomer(el_select_customer, "customer_list response")
                }

                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                }

                if ("rosterdate_check" in response) {
                    ModRosterdateChecked(response["rosterdate_check"]);
                };

                if ("quicksave" in response) {
                    quicksave = get_subdict_value_by_key(response, "quicksave", "value", false)
                    console.log( "quicksave", quicksave, typeof quicksave)

                }

    // after select customer the following lists will be downloaded, filtered by selected_cust_pk:
                  // datalist_request = "scheme" "schemeitem" "shift" "team" "teammember"
                //FillSelectTable fills selecttable and makes visible

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

//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        // CreateSubmenuButton(el_div, id, btn_text, class_key, function_on_click)
        CreateSubmenuButton(el_div, "id_menubtn_copy_from_template", loc.menubtn_copy_from_template, null, ModCopyfromTemplateOpen);
        CreateSubmenuButton(el_div, "id_menubtn_copy_to_template", loc.menubtn_copy_to_template, "mx-2", ModCopytoTemplateOpen);
        CreateSubmenuButton(el_div, "id_menubtn_show_templates", loc.menubtn_show_templates, "mx-2", HandleSubmenubtnTemplateShow);
        CreateSubmenuButton(el_div, null, loc.menubtn_roster_create, "mx-2", ModRosterdateCreate);
        CreateSubmenuButton(el_div, null, loc.menubtn_roster_delete, "mx-2", ModRosterdateDelete);

        el_submenu.appendChild(el_div);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu

//=========  HandleSubmenubtnTemplateShow  ================ PR2019-09-15
    function HandleSubmenubtnTemplateShow(el) {
        console.log("--- HandleSubmenubtnTemplateShow")
        template_mode = !template_mode
        console.log("new template_mode: ", template_mode)

        const btn_txt = (template_mode) ? loc.menubtn_hide_templates : loc.menubtn_show_templates;
        document.getElementById("id_menubtn_show_templates").innerText = btn_txt;

// reset selected customer and order
        selected_cust_pk = (!template_mode) ? setting_cust_pk : 0;
        selected_order_pk = (!template_mode) ? setting_order_pk : 0;
        selected_scheme_pk =  (!template_mode) ? setting_scheme_pk : 0;

        FillSelectOptionDict("customer", "HandleSubmenubtnTemplateShow");
        HandleSelectCustomer(el_select_customer, "HandleSubmenubtnTemplateShow")

        if(template_mode){
            document.getElementById("id_select_customerorder_div").classList.add(cls_hide)
            document.getElementById("id_select_template_div").classList.remove(cls_hide)
        } else {
            document.getElementById("id_select_customerorder_div").classList.remove(cls_hide)
            document.getElementById("id_select_template_div").classList.add(cls_hide)
        }

        DisableSubmenubtnTemplate();
        HideTableTeammember(template_mode);
    }

//=========  HandleSelectCustomer  ================ PR2019-12-02
    function DisableSubmenubtnTemplate() {
        let btn_copyfrom = document.getElementById("id_menubtn_copy_from_template");
        let btn_copyto = document.getElementById("id_menubtn_copy_to_template");
        console.log("btn_copyfrom",btn_copyfrom)
        if(template_mode){
            btn_copyfrom.setAttribute("aria-disabled", true)
            btn_copyto.setAttribute("aria-disabled", true)

            btn_copyfrom.classList.add("tsa_color_mediumgrey")
            btn_copyto.classList.add("tsa_color_mediumgrey")
        } else {
            btn_copyfrom.removeAttribute("aria-disabled")
            btn_copyto.removeAttribute("aria-disabled")
            btn_copyfrom.classList.remove("tsa_color_mediumgrey")
            btn_copyto.classList.remove("tsa_color_mediumgrey")
        }
    }
//=========  HandleSelectCustomer  ================ PR2019-12-03
    function HideTableTeammember(is_template_mode) {
    // hide teammember list in template mode
        let tbl_teammember = document.getElementById("id_table_teammember")
        if (is_template_mode){
            tbl_teammember.classList.add(cls_hide)
        } else {
            tbl_teammember.classList.remove(cls_hide)
        }
    }

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(selected_btn) {
        console.log( "==== HandleBtnSelect ========= ", selected_btn );

// ---  highlight selected button
        let btn_container = document.getElementById("id_btn_container")
        HighlightBtnSelect(btn_container, selected_btn);

// ---  show / hide selected table
        const div_list = ["id_div_tbl_schemeitem", "id_div_tbl_shift", "id_div_tbl_teammember", "id_div_data_form"];
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
        HideTableTeammember(template_mode);

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
        console.log("--- HandleSelectCustomer --- ", called_by)
        // called by DatalistDownload , select_customer.Event.Change,  ModSchemeEdit

        // in FillSelectOptionDict the first row is set selected=true when there is only one row

// reset lists
        shift_map.clear();
        team_map.clear();
        teammember_map.clear();
        schemeitem_map.clear();

// reset selected customer
        selected_cust_pk = 0

// reset selected order
        selected_order_pk = 0
        el_select_order.innerText = null
        el_mod_order.innerText = null
        el_mod_copyfrom_order.innerText = null

// reset selected scheme
        selected_scheme_pk = 0;
        tblBody_scheme_select.innerText = null;
        ResetSchemeInputElements()

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
            // if there is only 1 customer, that one is selected (selected_cust_pk gets value in FillSelectOptionDict)
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
                FillSelectOptionDict("order", "HandleSelectCustomer", selected_cust_pk)

         // if there is only 1 order, that one is selected (selected_order_pk gets value in FillSelectOptionDict)
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

// download lists of this customer: schemes, schemeitems, shifts, teams
                const datalist_request = {schemeitem: {customer_pk: selected_cust_pk}, // , issingleshift: false},
                                          shift: {customer_pk: selected_cust_pk},
                                          team: {customer_pk: selected_cust_pk},
                                          teammember: {customer_pk: selected_cust_pk}};
                DatalistDownload(datalist_request);
            }  //  if (!!pk_int)
        }  // if(!!el)
    }  // HandleSelectCustomer

//=========  HandleSelectOrder  ================ PR2019-03-24
    function HandleSelectOrder(el, called_by) {
        console.log("--- HandleSelectOrder ---", called_by)
        //called by HandleSelectCustomer select_order.Event.Change, ModSchemeEdit

// reset lists
        // don't reset, all items from this customer are already downloaded

// reset selected order, scheme, shift, team and schemeitem
        selected_order_pk = 0

// reset tables scheme_select, schemeitems and teams
        selected_scheme_pk = 0;
        tblBody_scheme_select.innerText = null;
        ResetSchemeInputElements()

// get selected order
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false

        // after first DatalistDownload, when there is only 1 customer, selected_cust_pk gets this value
        //  HandleSelectOrder has then no parameter 'el' and selected_order_pk has valeu
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

                FillSelectTable("scheme", "HandleSelectOrder", selected_scheme_pk, true);

            } //  if (!!pk_int)
        }  // if(!!el){


// select table 'scheme' is filled by FillSelectTable("scheme"). This function is called in DatalistDownload

    }  // HandleSelectOrder

//=========  HandleSelectRow ================ PR2019-12-01
    function HandleSelectRow(sel_tr_clicked) {
        console.log( "===== HandleSelectRow  ========= ");
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

            } else  if (!isEmpty(map_dict)){

// ---  get info from mapdict
                const sel_pk_int = get_subdict_value_by_key(map_dict, "id", "pk", 0);
                const sel_ppk_int = get_subdict_value_by_key(map_dict, "id", "ppk", 0);
                sel_code_value = get_subdict_value_by_key(map_dict, "code", "value");

// ---  update selected_scheme_pk and save selected_scheme_pk in Usersettings, not in template mode
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
                    FillSelectTable("shift", "HandleSelectRow", selected_shift_pk, false); // false = is not curremt select table
                    FillSelectTable("team", "HandleSelectRow" , selected_team_pk, false); // false = is not curremt select table

// --- fill data table schemeitems
                    FillTableRows("schemeitem");
                    FillTableRows("shift");
                    FillTableRows("teammember");

// reset addnew row, fill options shifts and team
                    // dont, already called by FillTableRows
                    //ResetAddnewRow("schemeitem", "HandleSelectRow")

                } else if (sel_tblName === "shift"){
// ---  update selected_shift_pk
                    selected_shift_pk = sel_pk_int;

                } else if (sel_tblName === "team"){
// ---  update selected_team_pk
                    selected_team_pk = sel_pk_int;
                    FillTableRows("teammember");
                }
            }  //   if (!isEmpty(map_dict))

        } else {
            sel_tblName = "scheme";

        } // if(!!sel_tr_clicked)

        console.log( "sel_tblName ", sel_tblName);

// ---  highlight clicked row in select table
        // make all rows of this select_table light yellow
        // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
        if (sel_tblName === "scheme"){
            ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, false, sel_tr_clicked, cls_bc_yellow)
            ChangeBackgroundRows(tblBody_shift_select, cls_bc_lightlightgrey, false)
            ChangeBackgroundRows(tblBody_team_select, cls_bc_lightlightgrey, false)
        } else if (sel_tblName === "shift" || sel_tblName === "team"){
            ChangeBackgroundRows(tblBody_scheme_select, cls_bc_lightlightgrey, true)
            let tblBody_this = (sel_tblName === "shift") ? tblBody_shift_select : tblBody_team_select;
            let tblBody_other1 = (sel_tblName === "shift") ? tblBody_team_select : tblBody_shift_select;
            ChangeBackgroundRows(tblBody_this, cls_bc_yellow_lightlight, false, sel_tr_clicked, cls_bc_yellow)
            ChangeBackgroundRows(tblBody_other1, cls_bc_lightlightgrey, false)
        }

// ---  set focus to selecte itemrow or if addnew: to addnewrow
        if (sel_tblName === "shift"|| sel_tblName === "team"){
            // --- lookup row 'add new' in tFoot
            const tblName = (sel_tblName === "shift") ? "shift" : "teammember";
            let tblFoot = document.getElementById("id_tfoot_" + tblName);
            let tblRow = tblFoot.rows[0];
            let el_input = tblRow.cells[0].children[0];
            if (!!el_input){
                setTimeout(function() {el_input.focus()}, 50);
            }
        }  // if (sel_tblName === "shift"){

// --- get header_text
        UpdateHeaderText()

// reset input fields and tables
        //ResetSchemeInputElements()

// put selected team_code in el_team_code
        const team_code = (sel_tblName === "team" && !!sel_code_value) ? sel_code_value : null
        el_team_code.value = team_code

// hide or show tables
        // don't change selected_btn when other scheme is selected
        const selected_btn = (sel_tblName === "scheme") ? "btn_schemeitem" :
                             (sel_tblName === "shift") ? "btn_shift" :
                             (sel_tblName === "team") ? "btn_team" : null;
        if(!!selected_btn) {HandleBtnSelect(selected_btn)}
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

// ---  get clicked tablerow
        if(!!tr_clicked) {

            selected_item_pk = get_datapk_from_element(tr_clicked)

// ---  highlight row in selecttable
            const tblName = get_attr_from_el(tr_clicked, "data-table")
            if (["shift", "team"].indexOf( tblName ) > -1){
                let tblBody_select = (tblName === "shift") ? tblBody_shift_select : tblBody_team_select;
                //  params: tableBody, cls_selected, cls_background
                HighlightSelectRowByPk(tblBody_select, selected_item_pk, cls_bc_yellow, cls_bc_yellow_lightlight);
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
        let imgsrc;
        if (is_inactive) {imgsrc = imgsrc_inactive_black} else {imgsrc = imgsrc_inactive_grey}
        el_changed.children[0].setAttribute("src", imgsrc);

        UploadElChanged(el_changed)
    }  // HandleInactiveClicked

// +++++++++  HandleBtnSchemeitems  ++++++++++++++++++++++++++++++ PR2019-03-16 PR2019-06-14
    function HandleBtnSchemeitems(param_name) {
        //console.log("=== HandleBtnSchemeitems =========", param_name);

        // params are: prev, next, dayup, daydown, autofill, delete
        if (!!selected_scheme_pk){
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
        let img_src;
        if(filter_hide_inactive) {img_src = imgsrc_inactive_grey} else {img_src = imgsrc_inactive_black}
        el.firstChild.setAttribute("src", img_src);

        FilterTableRows(tblBody_scheme_select, "", 1, filter_hide_inactive)
    }  // function HandleFilterInactive

//##################################################################################

// +++++++++++++++++ CREATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= CreateSelectRow  ============= PR2019-10-20
    function CreateSelectRow(tblBody_select, item_dict, row_index) {
        console.log("CreateSelectRow");

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
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

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
                td.addEventListener("mouseenter", function(){
                    td.children[0].children[0].setAttribute("src", imgsrc_deletered);
                });
                td.addEventListener("mouseleave", function(){
                    td.children[0].children[0].setAttribute("src", imgsrc_delete);
                });
            td.appendChild(el_a);
            td.classList.add("td_width_032");

        }  //  if (!isEmpty(item_dict))
        return tblRow;
    } // CreateSelectRow


//========= FillScheme  ====================================
    function FillScheme(item_dict) {
        console.log( "===== FillScheme  ========= ");
        //console.log("item_dict", item_dict)

        el_scheme_code.value = null;
        el_scheme_cycle.value = null;
        el_scheme_datefirst.value = null;
        el_scheme_datelast.value = null;
        el_scheme_btn_delete.disabled = true

// fill scheme fields
        if (!!item_dict){
            const tblName = "scheme"
            const pk_int = get_pk_from_dict(item_dict);
            const ppk = get_ppk_from_dict(item_dict);

            let field, field_dict, value, wdmy
            const field_list = ["code", "cycle", "datefirst", "datelast"];
            for(let i = 0, el_input, fieldname, n_value, o_value, len = field_list.length; i < len; i++){
                fieldname = field_list[i];

                if (fieldname === "code"){el_input = el_scheme_code} else
                if (fieldname === "cycle"){el_input = el_scheme_cycle} else
                if (fieldname === "datefirst"){el_input = el_scheme_datefirst} else
                if (fieldname === "datelast"){el_input = el_scheme_datelast};

                field_dict = get_dict_value_by_key (item_dict, fieldname)
                //console.log("field_dict", field_dict)
                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_err = get_dict_value_by_key (field_dict, "error");

                if(!!msg_err){
                    ShowMsgError(el_input, el_msg, msg_err, [-160, 80])
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

                if (["code", "cycle"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict, false, [-220, 60] )
                };



                //value = get_dict_value_by_key (field_dict, "value")
                //wdmy = get_dict_value_by_key (field_dict, "wdmy");

                //el.setAttribute("data-value", value)
                //el.setAttribute("data-o_value", value)
                //el.setAttribute("data-pk", pk_int )
                //el.setAttribute("data-ppk", ppk)
                //el.setAttribute("data-table", tblName)

                //if (fieldname === "code" || fieldname === "cycle"){
                //    if(!value){value = null} // otherwise you'll get  error: "undefined" is not a valid number
                //    el.value = value
                //} else if (fieldname === "datefirst" || fieldname === "datelast"){
                //    if (!!wdmy){
                //        el.value = wdmy;
                //        el.setAttribute("data-wdmy", wdmy)
                //    };
                //}
                //if (is_updated(field_dict)){ ShowOkElement(el)};
            }  // for(let i = 0, fieldname,

            el_scheme_btn_delete.disabled = false;

        };  // if (!!item_dict){
    }  //function FillScheme


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

//========= FillSelectOptionDict  ====================================
    function FillSelectOptionDict(tblName, called_by, ppk_str) {
        console.log( "=== FillSelectOptionDict ", tblName, called_by, "ppk_str:" , ppk_str);

// ---  fill options of select box
        let option_text = "";
        let row_count = 0
        let ppk_int = 0

        // customer list has no ppk_str
        if (!!ppk_str){ppk_int = parseInt(ppk_str)};

        let select_text = get_attr_from_el(el_data, "data-txt_select_" + tblName);
        let select_text_none = get_attr_from_el(el_data, "data-txt_select_" + tblName + "_none");

        const data_map = (tblName === "customer") ? customer_map :
                      (tblName === "order") ? order_map : null

        const selected_pk = (tblName === "customer") ? selected_cust_pk :
                                (tblName === "order") ? selected_order_pk : null
        //console.log( "selected_pk", selected_pk);
//--- loop through option dict

// --- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_in_dict = get_ppk_from_dict(item_dict);
            const is_template = get_subdict_value_by_key(item_dict, "id", "istemplate", false);
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "-");

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
    }  //function FillSelectOptionDict


//========= FillSelectOptions  ====================================
    // TODO replace by FillSelectOptionDict
    function FillSelectOptions(el_select, option_list, select_text, select_text_none, parent_pk_str) {
        //console.log( "=== FillSelectOptions  ", option_list);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }
        //console.log("option_list", option_list);
        //console.log(select_text, select_text_none);
        //console.log("parent_pk_str", parent_pk_str);

// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0
        let parent_pk = 0

        // customer list has no parent_pk_str
        if (!!parent_pk_str){parent_pk = parseInt(parent_pk_str)};

        el_select.innerText = null

// --- loop through option list
        for (let i = 0, len = option_list.length; i < len; i++) {
            let dict = option_list[i];
            let pk = get_pk_from_dict(dict);
            let ppk_in_dict = get_ppk_from_dict(dict)

// skip if parent_pk exists and does not match ppk_in_dict
            let addrow = false;
            if (!!parent_pk){
                addrow = (ppk_in_dict === parent_pk)
            } else {
                addrow = true
            }
            if (addrow) {
                const field = "code";
                let value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                option_text += " data-ppk=\"" + ppk_in_dict + "\"";
                if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + value + "</option>";
                row_count += 1
            }
        }  // for (let i = 0, len = option_list.length;

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_none + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select.selectedIndex = 0
        }

    }  //function FillSelectOptions

   //========= FillOptionShift  ============= PR2019-08-10
    function FillOptionShift(sel_scheme_pk, with_rest_abbrev) {
        // console.log( "===== FillOptionShift  ========= ");

// add empty option on first row
        let option_text = "<option value=\"0\" data-ppk=\"0\">-</option>";

// --- loop through shift_map
        for (const [map_id, item_dict] of shift_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_int = get_ppk_from_dict(item_dict);

// skip if selected_scheme_pk exists and does not match ppk_int
            if (!!sel_scheme_pk && ppk_int === sel_scheme_pk) {
                let value = get_subdict_value_by_key(item_dict, "code", "value", "-")
                if (with_rest_abbrev){
                    const is_restshift = get_subdict_value_by_key(item_dict, "isrestshift", "value")
                    if (is_restshift) { value += " (R)"}
                }
                option_text += "<option value=\"" + pk_int + "\" data-ppk=\"" + ppk_int + "\">" + value + "</option>";
            }
        }  // for (let key in item_list)
        return option_text
    }  // FillOptionShift

   //========= FillOptionTeam  ============= PR2019-08-11
    function FillOptionTeam(sel_scheme_pk) {

// add empty option on first row
        let option_text = "<option value=\"0\" data-ppk=\"0\">-</option>";
// --- loop through team_map
        for (const [map_id, item_dict] of team_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_int = get_ppk_from_dict(item_dict);

// skip if selected_scheme_pk exists and does not match ppk_int
            if (!!sel_scheme_pk && ppk_int === sel_scheme_pk) {
                const value = get_subdict_value_by_key(item_dict, "code", "value", "-")
                option_text += "<option value=\"" + pk_int + "\"";
                option_text += " data-ppk=\"" + ppk_int + "\"";
                option_text +=  ">" + value + "</option>";
            }
        }
        return option_text
    }  // FillOptionTeam

//========= FillSelectTable  ============= PR2019-09-23
    function FillSelectTable(tblName, called_by, selected_pk, is_current_table) {
        console.log( "=== FillSelectTable === ", tblName, called_by);
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
            tblBody = tblBody_scheme_select

            // always delete innerText of tblBody_shift_select and of tblBody_team_select
            tblBody_shift_select.innerText = null;
            tblBody_team_select.innerText = null;

            selected_ppk_int = selected_order_pk;

            caption_one = loc.Scheme;
            caption_multiple = loc.Select_scheme + ":";

        } else if (tblName === "shift"){
            selected_ppk_int =  selected_scheme_pk;
            data_map = shift_map
            tblBody = tblBody_shift_select

            caption_one = loc.Shifts + ":";
            caption_multiple = caption_one

        } else if (tblName === "team"){
            selected_ppk_int =  selected_scheme_pk;
            data_map = team_map
            tblBody = tblBody_team_select

            caption_one = loc.Teams + ":";
            caption_multiple = caption_one

        }
        tblBody.innerText = null;

        let row_count = 0;
// --- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_int = get_ppk_from_dict(item_dict);
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "");
            const code_suffix = get_subdict_value_by_key(item_dict, "code", "suffix", "");
            const title_str = get_subdict_value_by_key(item_dict, "code", "title", "");
            const offsetstart = get_subdict_value_by_key(item_dict, "offsetstart", "offset");
            const offsetend = get_subdict_value_by_key(item_dict, "offsetend", "offset");
            const isrestshift = get_subdict_value_by_key(item_dict, "isrestshift", "value", false);
            const is_template = get_subdict_value_by_key(item_dict, "id", "istemplate", false);
//--- set title
            let title = ""
            if (tblName === "shift"){
                if (offsetstart != null || offsetend != null) {
                    const display_offsetstart = (offsetstart != null) ? display_offset_time (offsetstart, timeformat, user_lang) : "";
                    const display_offsetend =  (offsetend != null) ? display_offset_time (offsetend, timeformat, user_lang, true) : "";
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

//- set background color of table and selected row
                const class_bg_color = ((tblName === "template")) ? "tsa_bc_transparent" :
                               (!!is_current_table) ? cls_bc_yellow_lightlight : cls_bc_lightlightgrey;
                const cls_bc = (selected_map_id === map_id) ? cls_bc_yellow : class_bg_color;
                tblRow.classList.add(cls_bc);

//- add hover to select row
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

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
                } else if (tblName === "shift"){
                    td.addEventListener("click", function() {HandleSelectRow(tblRow, "event")}, false )
                } else if (tblName === "team"){
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
                        CreateBtnDeleteInactive("delete", tblRow, el_a);
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
        // TODO see if code is correct
        // Dont highlight yet, scheme info is not downoloaded yet so teams and shift are nit yet filled

        if (tblName === "scheme"){
            if (row_count === 1 && !!firstRow){
               //HandleSelectRow(firstRow, "firstRow");
            } else if(!!selectedRow){
                HandleSelectRow(selectedRow, "selectedRow");
            }
        }
    } // FillSelectTable

//========= CreateSelectHeaderRows  ============= PR2019-11-02
    function CreateSelectHeaderRows() {
        //console.log("CreateSelectHeaderRows tblName: " , tblName)

        const tblList = ["scheme", "shift", "team"]
        for (let i = 0; i < 3; i++) {
            const tblName = (tblList[i]);

            const caption = (tblName === "scheme") ? get_attr_from_el(el_data, "data-txt_select_scheme") + ":" :
                            (tblName === "shift") ?  get_attr_from_el(el_data, "data-txt_shifts") + ":" :
                            (tblName === "team") ? get_attr_from_el(el_data, "data-txt_teams") + ":" : "-"

        // ++++++ add tHeadRow  ++++++
            let tblHead = document.getElementById("id_select_thead_" + tblName)
            tblHead.innerText = null
            let tHeadRow = tblHead.insertRow(-1);
                let th = document.createElement('th');
                    th.innerText = caption
                    th.classList.add("px-2")
            tHeadRow.appendChild(th);
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
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

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
                const data_key = "data-" + thead_text[tblName][j];
                const data_text = get_attr_from_el(el_data, data_key);
                el_div.innerText = data_text;
                el_div.setAttribute("overflow-wrap", "break-word");

    // --- add margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")}

    // --- add width to el
                el_div.classList.add("td_width_" + field_width[tblName][j])

    // --- add textalign to el
                el_div.classList.add("text_align_" + field_align[tblName][j])

    // --- add imgsrc_rest_black to shift header, inactive_black toschemeitem
                if (tblName === "shift" && j === 1) {
                    AppendChildIcon(el_div, imgsrc_rest_black)
                    el_div.classList.add("ml-4")
                    el_div.title = get_attr_from_el(el_data, "data-txt_shift_rest")
                } else if (tblName === "schemeitem" && j === 6) {
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
        //console.log("===  CreateTblFooters == ");
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
        console.log("===  ResetAddnewRow == ", tblName, called_by);

        const ppk_int = (tblName === "team") ? selected_team_pk : selected_scheme_pk
        console.log("ppk_int ", ppk_int);
        console.log("rosterdate_dict ", rosterdate_dict);

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
                                        user_lang, comp_timezone, false, true)
                }
                if(!!selected_scheme_pk){
                    tblRow.cells[1].children[0].innerHTML = FillOptionShift(ppk_int, true)
                    tblRow.cells[2].children[0].innerHTML = FillOptionTeam(ppk_int)
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
             if ([6, 7].indexOf( j ) > -1){
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
        console.log( "===== FillTableRows  ========= ", tblName);
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
            console.log("rosterdate_dict", rosterdate_dict)
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

//+++ insert td's ino tblRow
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
            } else if (!is_addnew_row && tblName === "schemeitem" && j === 6){
                CreateBtnDeleteInactive("inactive", tblRow, el);
            } else if (!is_addnew_row && tblName === "shift" && j === 1){
                // restshift , not in addnew_row
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {HandleRestshiftClicked(el, tblName);}, false )
                AppendChildIcon(el, imgsrc_stat00)
                el.classList.add("ml-4")
            } else if (!is_addnew_row && tblName === "schemeitem" && j === 8){
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
                let data_txt, placeholder_txt;
                if (tblName === "schemeitem" && j === 1){data_txt = "data-txt_shift_add" } else
                if (tblName === "shift" && j === 0){data_txt = "data-txt_shift_add"} else
                if (tblName === "teammember" && j === 0){
                    if(!template_mode){
                        data_txt =  "data-txt_employee_add"
                    }
                }
                const placeholder = get_attr_from_el(el_data, data_txt) ;
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
                } else if ([1, 2, 6].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadElChanged(el)}, false)
                //} else if ([3, 4].indexOf( j ) > -1){
                    //el.addEventListener("click", function() { HandleTimepickerOpen(el)}, false )
                } else  if ([5, 6].indexOf( j ) > -1){
                    //el.addEventListener("click", function() {OpenPopupHM(el)}, false )
                };
            } else if (tblName === "shift"){
                if ([0, 1].indexOf( j ) > -1){
                     el.addEventListener("change", function() {UploadElChanged(el)}, false)
                } else if ([2, 3, 4].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandleTimepickerOpen(el)}, false)};
            } else if ((tblName === "teammember") && (!template_mode) ){
                if ( j === 0){
                    el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )} else
                if (([1, 2].indexOf( j ) > -1) && (!is_addnew_row)){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)};
            }

// --- add datalist_ to td shift, team, employee
            // called by DatalistDownload, info not downloaded yet when rows are created
            if (tblName === "schemeitem"){
                if (j === 1) {
                    el.innerHTML = FillOptionShift(ppk_int, true)
                } else if (j === 2) {
                    el.innerHTML = FillOptionTeam(ppk_int)
                }
            } else if (tblName === "teammember"){
               // if (j === 0) {
                    //el.setAttribute("list", "id_datalist_" + field_names[tblName][j] + "s")}
            }

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}
// --- add margin to last column, only in shift table column
            if (tblName === "shift" && j === column_count - 1 ){el.classList.add("mr-2")}

// --- add textalign to el
            el.classList.add("text_align_" + field_align[tblName][j])

// --- add width to fields
            el.classList.add("td_width_" + field_width[tblName][j])

// --- add textalign to el
            el.classList.add("text_align_" + field_align[tblName][j])


// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
            //el.classList.add("tsa_transparent");
            //el.classList.add("tsa_bc_transparent");
            if ( tblName === "schemeitem"){
                if (j === 0) {
                    el.classList.add("input_popup_date")
                    // TODO tsa_transparent necessaryfor now, is removed prom input_popup_date becasue of datepicker in scheme box. To be changed
                    el.classList.add("tsa_transparent")

            } else if ([3, 4].indexOf( j ) > -1){ el.classList.add("input_timepicker")}
                //if ([5, 6].indexOf( j ) > -1){  el.classList.add("input_popup_date") }
                else { el.classList.add("input_text"); }; // makes background transparent
            } else if ( tblName === "shift"){
                if ([0].indexOf( j ) > -1) { el.classList.add("input_text")} else  // makes background transparent
                if ([2, 3, 4].indexOf( j ) > -1){ el.classList.add("input_timepicker")}
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

//=========  CreateTblPeriod  ================ PR2019-11-16
    function CreateTblPeriod() {
        //console.log("===  CreateTblPeriod == ");
        //console.log(period_dict);
        let tBody = document.getElementById("id_mod_period_tblbody");
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
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag  to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }

        //let el_select = document.getElementById("id_mod_period_extend");
        //FillOptionsPeriodExtension(el_select, loc.period_extension)

    } // CreateTblPeriod

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

        el_scheme_btn_delete.disabled = true
        console.log(">>> el_scheme_btn_delete.disabled = true" );

    }

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23
    function CreateBtnDeleteInactive(mode, tblRow, el_input){
        el_input.setAttribute("href", "#");
        // dont shwo title 'delete'
        // const data_id = (tblName === "customer") ? "data-txt_customer_delete" : "data-txt_order_delete"
        // el.setAttribute("title", get_attr_from_el(el_data, data_id));
        el_input.addEventListener("click", function(){UploadDeleteInactive(mode, el_input)}, false )

//- add hover delete img
        if (mode ==="delete") {
            el_input.addEventListener("mouseenter", function(){
                el_input.children[0].setAttribute("src", imgsrc_deletered);
            });
            el_input.addEventListener("mouseleave", function(){
                el_input.children[0].setAttribute("src", imgsrc_delete);
            });
        }
        el_input.classList.add("ml-4")
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_lightgrey;
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
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

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
    function Upload_Scheme(dtp_dict) {
        console.log("======== Upload_Scheme");
        console.log("dtp_dict: ", dtp_dict);
        // dtp_dict contains value of datetimepicker datefirst/last, overrides value of element
        // when clicked on delete datefirst/last: dtp_dict = {"datefirst": {"value": null}}
        // when value of datetimepicker has changed: datefirst: {value: "2019-05-02", o_value: "2019-05-28"}

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
                const field_list = ["code", "cycle", "datefirst", "datelast"];
                for(let i = 0, fieldname, n_value, o_value, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
                    let el_input = document.getElementById("id_scheme_" + fieldname )
    // get n_value
                        // PR2019-03-17 debug: getAttribute("value");does not get the current value
                        // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                        // The 'value' property holds the current value (el_input.value).
                    n_value = null;
                    if (["code", "cycle"].indexOf( fieldname ) > -1){
                        if(!!el_input.value) {n_value = el_input.value};
                    } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                        if(!isEmpty(dtp_dict)){
                            // dtp_dict = {datelast: {value: "2019-06-10"}}
                            let field_dict = dtp_dict[fieldname]
                            //console.log("fieldname", fieldname, "field_dict", field_dict);
                            if (!isEmpty(field_dict)){
                                n_value =  get_dict_value_by_key (field_dict, "value");
                                //console.log("fieldname", fieldname, "dtp_dict n_value", n_value);
                            } else {
                                n_value = get_attr_from_el(el_input, "data-value")}
                        }  // if(!isEmpty(dtp_dict)

                    }; // data-value="2019-05-11"
                            //console.log("fieldname", fieldname, "el_input data-value n_value", n_value);
    // get o_value
                    o_value = get_attr_from_el(el_input, "data-o_value"); // data-value="2019-03-29"
                    //console.log("fieldname", fieldname, "n_value", n_value, "o_value", o_value);

                    // n_value can be blank when deleted, skip when both are blank
                    if(n_value !== o_value){
    // add n_value and 'update' to field_dict
                        let field_dict = {"update": true};
                        if(!!n_value){field_dict["value"] = n_value};
    // add field_dict to upload_dict
                        upload_dict[fieldname] = field_dict;
                    };
                };  //  for (let i = 0, el_input,

            }  // if(!!id_dict["arent_pk"])
        };  // if (!isEmpty(id_dict))

        console.log("upload_dict", upload_dict);

        const url_str =  url_scheme_shift_team_upload;
        UploadChanges(upload_dict, url_str);

    };  // function Upload_Scheme

//========= Upload_Team  ============= PR2019-10-18
    function Upload_Team() {
        console.log("======== Upload_Team");
        // This function is called by team input box

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

            const new_value = el_team_code.value;
            let field_dict = {"update": true};
            if (!!new_value){
                field_dict["value"] = new_value;
            }
            upload_dict["code"] = field_dict;

            const url_str =  url_scheme_shift_team_upload;
            UploadChanges(upload_dict, url_str);
        }
    };  // function Upload_Team

//=========  UploadTeam  ================ PR2019-08-23
    function UploadTeam(upload_dict) {
        console.log("========= UploadTeam ===" );
        // This function is called by ModEmployeeSave
        if (!!upload_dict){

            const ppk_int = get_ppk_from_dict(upload_dict)
            const tblName = get_subdict_value_by_key(upload_dict, "id", "table")
            console.log("tblName: ", tblName );

            const parameters = {"upload": JSON.stringify (upload_dict)}
            console.log("parameters", upload_dict);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_shift_team_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response:");
                    console.log (response);
                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            UpdateFromResponse(response["update_list"][i]);
                        }
                    }
                    if ("team_list" in response){
                        get_datamap(response["team_list"], team_map)
                //console.log("K FillSelectTable selected_team_pk", selected_team_pk)
                        //FillSelectTable("team", selected_team_pk);
                    }

                    if ("team_update" in response){
                        const team_update = response["team_update"]
                        if ("id" in team_update){
                            const id_dict = team_update["id"]
                            console.log("team_update id_dict", id_dict)
                            selected_team_pk = get_dict_value_by_key(team_update, "pk")

                            let tblRowSelected = document.getElementById("sel_team_" + selected_team_pk.toString())
                            XXXHandleSelectTable(tblRowSelected)

                        }
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  // if (!!tblRow)
    }  // function UploadTeam


//=========  UploadSchemeitem  ================ PR2019-10-30
    function UploadSchemeitem(mod_upload_dict, action) {
        console.log("========= UploadSchemeitem ===", action );
        console.log("mod_upload_dict ", mod_upload_dict );
        // mod_upload_dict: {id: {delete: true, pk: 363, ppk: 1208, table: "schemeitem"}}

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

            let tblRow = document.getElementById(map_id);
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

            const parameters = {"upload": JSON.stringify (upload_dict)}
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
    }  // function UploadSchemeitem

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
                        FillSelectTable("scheme", "UploadSchemeOrShiftOrTeam scheme_list", selected_scheme_pk);
                    }
                    if ("shift_list" in response) {
                        get_datamap(response["shift_list"], shift_map)
                        FillSelectTable("shift", "UploadSchemeOrShiftOrTeam shift_list", selected_shift_pk);
                    }
                    if ("team_list" in response) {
                        get_datamap(response["team_list"], team_map)
                        FillSelectTable("team", "UploadSchemeOrShiftOrTeam team_list", selected_team_pk, true);
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
        console.log("=== UploadTimepickerChanged");
        console.log("tp_dict", tp_dict);

        let upload_dict = {"id": tp_dict["id"]};
        // quicksaveis saved separately by uploadusetsettings
        //if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};

            const tblName = "shift";
            const map_id = get_map_id(tblName, get_subdict_value_by_key(tp_dict, "id", "pk").toString());
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

//========= UploadDeleteSchemeFromForm  ============= PR2019-12-03
    function UploadDeleteSchemeFromForm() {
        console.log( " ==== UploadDeleteSchemeFromForm ====");
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

    }  // UploadDeleteSchemeFromForm


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
                };

                if (mode === "delete"){
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
                    format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            // ---  show modal, only when made inactive
                    if(!!new_inactive){
                        mod_upload_dict["inactive"] = {"value": new_inactive, "update": true};
                        ModConfirmOpen("inactive", el_input);
                        return false;
                    }
                }
                const url_str = (tblName === "teammember") ? url_teammember_upload : url_scheme_shift_team_upload
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

                const url_str = (["scheme", "shift", "team"].indexOf( tblName ) > -1) ? url_scheme_shift_team_upload :
                                (tblName === "teammember") ? url_teammember_upload :
                                (tblName === "schemeitem") ? url_schemeitem_upload : null;
                UploadChanges(upload_dict, url_str);
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

//=========  UpdateFromResponse  ================ PR2019-10-14
    function UpdateFromResponse(update_dict) {
        console.log(" ==== UpdateFromResponse ====");
        console.log("update_dict", update_dict);

//----- get id_dict of updated item
        const id_dict = get_dict_value_by_key (update_dict, "id");
        const tblName = get_dict_value_by_key(id_dict, "table");
        const pk_int = get_dict_value_by_key(id_dict, "pk");
        const ppk_int = get_dict_value_by_key(id_dict, "ppk");
        const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
        const map_id = get_map_id(tblName, pk_int);
        const is_created = ("created" in id_dict);
        const is_deleted = ("deleted" in id_dict);

        let tblRow;
        if (!!map_id){
//----- replace updated item in map or remove deleted item from map
            update_map_item(map_id, update_dict);
//----- get tblRow
            tblRow = document.getElementById(map_id);
        }

// TODO add scheme form
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
            // reset select tablesshift and team when scheme is deleted
                document.getElementById("id_select_table_shift").classList.add(cls_hide)
                document.getElementById("id_select_table_team").classList.add(cls_hide)
            // delete innerText of tblBody_shift_select and of tblBody_team_select
                tblBody_shift_select.innerText = null;
                tblBody_team_select.innerText = null;
                selected_scheme_pk = 0
                ResetSchemeInputElements();
            }

// ++++ created ++++
        } else if (is_created){
//----- item is created: add new row on correct index of table, reset addnew row
            // parameters: tblName, pk_str, ppk_str, is_addnew, customer_pk
            if(tblName === "scheme" || tblName === "team"){
                // skip scheme, it has no table. team has table teammembers, is empty after creating new team
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
            format_text_element (el_team_code, el_msg, field_dict, false, [-220, 60])
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

//--- insert new selectRow if is_created, highlight selected row
        if (["scheme", "shift", "team"].indexOf( tblName ) > -1){
            let tblBody_select = (tblName === "scheme") ? tblBody_scheme_select :
                                 (tblName === "shift") ? tblBody_shift_select :
                                 (tblName === "team") ? tblBody_team_select : null;
            let selectRow;
            if(is_created && tblBody_select){
                const row_index = GetNewSelectRowIndex(tblBody_select, 0, update_dict, user_lang);
                selectRow = CreateSelectRow(tblBody_select, update_dict, row_index);
                HandleSelectRow(selectRow);
            } else{
        //--- get existing  selectRow
                const rowid_str = id_sel_prefix + map_id;
                selectRow = document.getElementById(rowid_str);
            };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
            // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey
            const filter_show_inactive = false; // no inactive filtering on this page
            UpdateSelectRow(selectRow, update_dict, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey);
        }  // if( tblName === "scheme"...

        if(tblName === "scheme"){
            UpdateSchemeInputElements(update_dict);
        }
        if (["shift"].indexOf( tblName ) > -1){
            console.log("xxx HighlightSelectShiftTeam")
            //HighlightSelectShiftTeam(tblName, tblRow)
        }

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
        console.log("--- UpdateTablesAfterResponse  --------------");
        //FillSelectTable fills selecttable and makes visible

        console.log("response[refresh_tables: ", response["refresh_tables"]);
        const new_scheme_pk = get_subdict_value_by_key(response, "refresh_tables", 'new_scheme_pk', 0)

        console.log("new_scheme_pk: ", new_scheme_pk);
        let fill_rows = false;
        if ("scheme_list" in response) {
            get_datamap(response["scheme_list"], scheme_map)
            FillSelectTable("scheme", "UpdateTablesAfterResponse", new_scheme_pk, true)
            fill_rows = true
        }
        if ("shift_list" in response) {
            get_datamap(response["shift_list"], shift_map)
            FillSelectTable("shift", "UpdateTablesAfterResponse", 0, false)
            fill_rows = true
            }
        if ("team_list" in response){
            get_datamap(response["team_list"], team_map);
            FillSelectTable("team", "UpdateTablesAfterResponse", 0, false)
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
        //console.log("--- UpdateTableRow  --------------");
        //console.log("update_dict", update_dict);
        //console.log("tblRow", tblRow);

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
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
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
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    let td = tblRow.cells[i];
                    let el_input = td.children[0];
                    if(!!el_input){
// --- lookup field in update_dict, get data from field_dict
                        UpdateField(el_input, update_dict, tblName)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)
        };  // if (!isEmpty(update_dict) && !!tblRow)
    }  // function UpdateTableRow

//========= UpdateField  =============
    function UpdateField(el_input, update_dict, tblName){
        //console.log("--- UpdateField  --------------");
        //console.log(update_dict);
        if(!!el_input){
// --- lookup field in update_dict, get data from field_dict
            const fieldname = get_attr_from_el(el_input, "data-field");
            //console.log("fieldname: ", fieldname);

            if (fieldname in update_dict){
                let field_dict = get_dict_value_by_key (update_dict, fieldname);

                const value = get_dict_value_by_key (field_dict, "value");
                let pk_int = parseInt(get_dict_value_by_key (field_dict, "pk"))
                let ppk_int = parseInt(get_dict_value_by_key (field_dict, "ppk"))
                if(!pk_int){pk_int = 0}
                if(!ppk_int){ppk_int = 0}

                if (fieldname === "rosterdate"){
                    //const hide_weekday = false, hide_year = true;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, false, true)
                } else if (["code", "employee"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict, false, [-240, 200])
            // put placeholder in employee field when employee is removed
                    if (fieldname === "employee" && !get_dict_value_by_key(field_dict, "pk")){
                        el_input.value = get_attr_from_el_str(el_data, "data-txt_employee_select") + "...";
                    }
                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                    const hide_weekday = false, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                } else if (fieldname === "isrestshift"){
                    format_restshift_element (el_input, field_dict,
                        imgsrc_rest_black, imgsrc_stat00, title_restshift)
                } else if (["shift", "team"].indexOf( fieldname ) > -1){
                    format_select_element (el_input, field_dict)
                } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                    // not in use
                    format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list)
                } else if (["offsetstart", "offsetend", "breakduration"].indexOf( fieldname ) > -1){
                    // in table schemeitem : when there is a shift: offset of shift is displayed, othereise: offset of schemeitem is displayed
                    if (tblName === "schemeitem")
                        if ('shift' in update_dict) {field_dict = get_subdict_value_by_key(update_dict, "shift", fieldname )
                    }
                    const blank_when_zero = (fieldname === "breakduration") ? true : false;
                    format_offset_element (el_input, el_msg, fieldname, field_dict, [-220, 80], timeformat, user_lang, title_prev, title_next, blank_when_zero)
                } else if ([ "timeduration"].indexOf( fieldname ) > -1){
                    format_duration_element (el_input, el_msg, field_dict, user_lang)
                } else if (fieldname === "inactive") {
                   if(isEmpty(field_dict)){field_dict = {value: false}}
                   format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
                };
            }  else {

// put placeholder in employee field when empty, except for new row
                if (fieldname === "employee"){
                    const tblRow = get_tablerow_selected(el_input)
                    const pk_int = get_attr_from_el_int(tblRow, "data-pk")
                    if(!!pk_int){el_input.value = get_attr_from_el_str(el_data, "data-txt_employee_select") + "...";}
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
                //console.log("F FillSelectTable tblName", tblName)
                        FillSelectTable(tblName, "UpdateSchemeOrTeam")

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
        console.log( "===== UpdateSchemeInputElements  ========= ");
        //console.log(item_dict);

        //ResetSchemeInputElements()

        if(!!item_dict) {
// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
            const msg_err = get_dict_value_by_key (item_dict, "error");
            //console.log("id_dict", id_dict);
            //console.log("is_created", is_created, typeof is_created);
            el_scheme_btn_delete.disabled = false

// --- error
            if (!!msg_err){
                ShowMsgError(el_scheme_code, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                ShowOkElement(el_scheme_code)
            }

            const pk_int = get_pk_from_dict(item_dict)
            const ppk_int = get_ppk_from_dict(item_dict);

            if(!!pk_int){

                const tblName = "scheme"
                const field_list = ["code", "cycle", "datefirst", "datelast"];
                for(let i = 0, el, field_dict, fieldname, value, wdmy, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
                    //console.log("fieldname", fieldname)
                    if (fieldname === "code"){el = el_scheme_code} else
                    if (fieldname === "cycle"){el = el_scheme_cycle} else
                    if (fieldname === "datefirst"){el = el_scheme_datefirst} else
                    if (fieldname === "datelast"){el = el_scheme_datelast};

                    field_dict = get_dict_value_by_key (item_dict, fieldname)

                    value = get_dict_value_by_key (field_dict, "value")

                    el.setAttribute("data-value", value)
                    el.setAttribute("data-field", fieldname)
                    el.setAttribute("data-pk", pk_int )
                    el.setAttribute("data-ppk", ppk_int)
                    el.setAttribute("data-table", tblName)

                    if (["code", "cycle"].indexOf( fieldname ) > -1){
                        format_text_element (el, el_msg, field_dict, false, [-220, 60])
                        el.readOnly = false;
                    } else if (fieldname === "datefirst" || fieldname === "datelast"){
                        let el_input = document.getElementById("id_scheme_" + fieldname)
                        const hide_weekday = true, hide_year = false;
                        format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                            user_lang, comp_timezone, hide_weekday, hide_year);
                    // in te,template_mode datefirst and datelast are readOnly
                        el.readOnly = (template_mode);
                    }

                }  // for(let i = 0, fieldname,

            }  // if(!!pk_int){
        } // if(!!tr_clicked)
    }  // function UpdateSchemeInputElements

// +++++++++  UpdateRosterdateFilled  ++++++++++++++++++++++++++++++ PR2019-11-12
    function UpdateRosterdateFilled(update_dict) {
        //console.log(" -----  UpdateRosterdateFilled   ----")
        //console.log("update_dict", update_dict)
        // update_dict: {row_count: 10, rosterdate: "2019-11-04"}

 // hide loader in modal form
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

// info
        const new_rosterdate = get_subdict_value_by_key(update_dict, "rosterdate", "rosterdate")
        const row_count = Number(get_subdict_value_by_key(update_dict, "rosterdate", "row_count"));
        const rosterdate_formatted = format_date_iso (new_rosterdate, month_list, weekday_list, false, false, user_lang)

        let info_01 = null
        if(!!row_count){
            if(row_count === 1){
                info_01 = loc.rosterdate_added_one; // One shift was added.'
            } else {
                info_01 = row_count.toString() + loc.rosterdate_added_multiple
            }
            info_01 +=  loc.rosterdate_added_success
        }
        document.getElementById("id_mod_rosterdate_info_01").innerText = info_01;
        document.getElementById("id_mod_rosterdate_btn_ok").innerText = loc.btn_close;

    }

//###########################################################################
// ++++++++++++  MODALS +++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++ MOD CONFRIM ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-10-23
    function ModConfirmOpen(mode, el_input) {
        console.log(" -----  ModConfirmOpen   ----", mode)
        console.log(">>>>>>>>>>>>>>>mod_upload_dict", mod_upload_dict)
        // modes are schemeitem_delete, delete, inactive
        const tblRow = get_tablerow_selected(el_input);

        let tblName, map_dict, pk_str;
        // tblRow is undefined when el_input = undefined
        if(!!tblRow){
            tblName = get_attr_from_el(tblRow, "data-table")
            pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id =  get_map_id(tblName, pk_str);
            map_dict = get_mapdict_from_tblRow(tblRow)

        } else if(mode === "schemeitem_delete"){
            tblName === "schemeitem";
            mod_upload_dict = {"schemeitem_delete": true};
        } else {
            // get info from mod_upload_dict
            tblName = get_subdict_value_by_key(mod_upload_dict, "id", "table")
        }

        let data_key = (tblName === "scheme") ? "data-txt_conf_scheme" :
                       (tblName === "schemeitem") ? "data-txt_conf_shift" :
                       (tblName === "shift") ? "data-txt_conf_shift" :
                       (tblName === "teammember") ? "data-txt_conf_teammember" :
                       (tblName === "team") ? "data-txt_conf_team" : null
        let msg_01_txt = get_attr_from_el(el_data, data_key);
        let msg_02_txt = null;

        if (mode === "schemeitem_delete"){
            msg_01_txt = get_attr_from_el(el_data, "data-msg_confdel_si_01");
        } else if (mode === "inactive"){
            msg_01_txt = msg_01_txt + " " + get_attr_from_el(el_data, "data-txt_conf_inactive");
        } else if (mode === "delete"){
            msg_01_txt = msg_01_txt + " " + get_attr_from_el(el_data, "data-txt_conf_delete");

            if (tblName === "team"){
                // count teammembers of this team
                let row_count = 0;
                if(!!teammember_map.size){}
                for (const [map_id, item_dict] of teammember_map.entries()) {
                    const ppk_int = get_ppk_from_dict(item_dict);
                    if (ppk_int.toString() === pk_str)
                        row_count += 1;
                    }
                if(!!row_count){
                    if(row_count === 1){
                        msg_02_txt = get_attr_from_el(el_data, "data-txt_conf_team_hasteammember");
                    } else {
                        msg_02_txt = get_attr_from_el(el_data, "data-txt_conf_team_hasteammembers01") +
                        row_count.toString +
                        get_attr_from_el(el_data, "data-txt_conf_team_hasteammembers02");
                    }
                }
                msg_02_txt = row_count.toString()
            }
        }
// put text in modal form
        let header_text = null;
        if (mode === "schemeitem_delete") {
             header_text = get_attr_from_el_str(el_data, "data-msg_confdel_si_hdr");
        } else {
            if (tblName === "schemeitem") {
                const rosterdate = get_subdict_value_by_key(map_dict,"rosterdate", "value" )
                let rosterdate_text = format_date_iso (rosterdate, month_list, weekday_list, false, false, user_lang);
                if(!rosterdate_text){ rosterdate_text = "-"}
                let shift_text = get_subdict_value_by_key(map_dict,"shift", "value" )
                if(!shift_text){ shift_text = "-"}
                header_text = get_attr_from_el_str(el_data, "data-txt_shift") + " '" + shift_text + "' " +
                              get_attr_from_el_str(el_data, "data-txt_of") + " " + rosterdate_text;
                //msg_01_txt = get_attr_from_el(el_data, "data-txt_conf_shift") +
                //             get_attr_from_el(el_data, "data-txt_conf_remove")    +
                //             get_attr_from_el(el_data, "data-txt_conf_scheme").toLowerCase() + "."

            } else if(tblName === "teammember"){
                header_text = get_subdict_value_by_key(mod_upload_dict, "employee", "value")
            } else {
            // TODO get all infro from mod_upload_dict
                let code_value = get_subdict_value_by_key(mod_upload_dict, "code", "value");
                if(!code_value) {code_value = get_subdict_value_by_key(map_dict, "code", "value")};
                header_text = code_value;
            }
        }  // if (mode === "schemeitem_delete")

        document.getElementById("id_confirm_header").innerText = header_text;
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        // TODO document.getElementById("id_confirm_msg02").innerText = msg_02_txt;

        data_key = (mode === "inactive") ? "data-txt_conf_btn_inactive" : "data-txt_conf_btn_delete";
        let el_btn_save = document.getElementById("id_confirm_btn_save")
        el_btn_save.innerText = get_attr_from_el(el_data, data_key);
        setTimeout(function() {el_btn_save.focus()}, 300);
// show modal
        $("#id_mod_confirm").modal({backdrop: true});
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-09-20
    function ModConfirmSave() {
        //console.log("========= ModConfirmSave ===" );
        //console.log("mod_upload_dict: ", mod_upload_dict );

// ---  hide modal
        $('#id_mod_confirm').modal('hide');

// ---  Upload Changes
        const tblName = get_subdict_value_by_key(mod_upload_dict,"id", "table")
        if(tblName === "schemeitem"){
            if ("schemeitem_delete" in mod_upload_dict) {

            } else if ("delete" in mod_upload_dict) {
                UploadSchemeitem (mod_upload_dict, "delete")
            } else {
                UploadChanges(mod_upload_dict, url_schemeitem_upload)
            }
        } else if(tblName === "teammember"){
            UploadTeammember(mod_upload_dict, url_teammember_upload)
        } else {
            UploadChanges(mod_upload_dict, url_scheme_shift_team_upload)
        }
    } // ModConfirmSave

// +++++++++ MOD ROSTERDATE ++++++++++++++++++++++++++++++++++++++++++++++++++++

    function ModRosterdateCreate() {
        ModRosterdateOpen("create")
    };
    function ModRosterdateDelete() {
        ModRosterdateOpen("delete")
    };
//=========  ModRosterdateOpen  ================ PR2019-11-11
    function ModRosterdateOpen(mode) {
        //console.log(" -----  ModRosterdateOpen   ----")
        //console.log("rosterdate_dict", rosterdate_dict)

        const is_delete = (mode === "delete")

// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

// reset mod_upload_dict
        mod_upload_dict = {};

// --- check if rosterdate has emplhour records and confirmed records
        const datalist_request = {"rosterdate_check": {"mode": mode}};
        DatalistDownload(datalist_request);
        // returns function ModRosterdateChecked

// set header
        const hdr_text = (is_delete) ? loc.rosterdate_hdr_delete : loc.rosterdate_hdr_create
        document.getElementById("id_mod_period_header").innerText = hdr_text;

// set value of input label
        document.getElementById("id_mod_rosterdate_label").innerText = loc.rosterdate + ": "

// set value of input element blank, set readOnly = true
        let el_input = document.getElementById("id_mod_rosterdate_input")
        el_input.value = null
        el_input.readOnly = true;

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_input.focus()
        }, 500);

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_class_remove = (is_delete) ? "btn-primary" :  "btn-outline-danger";
        const btn_text = (is_delete) ? loc.btn_delete : loc.btn_create
        let el_btn_ok = document.getElementById("id_mod_rosterdate_btn_ok")
            el_btn_ok.innerText = btn_text;
            el_btn_ok.classList.remove(btn_class_remove)
            el_btn_ok.classList.add(btn_class_add)
            el_btn_ok.classList.remove(cls_hide)
            el_btn_ok.disabled = true;
        let el_btn_cancel = document.getElementById("id_mod_rosterdate_btn_cancel")
            el_btn_cancel.innerText = loc.btn_cancel;

// ---  show modal
        $("#id_mod_rosterdate").modal({backdrop: true});
    };  // ModRosterdateOpen

// +++++++++  ModRosterdateEdit  ++++++++++++++++++++++++++++++ PR2019-11-12
    function ModRosterdateEdit() {
        //console.log("=== ModRosterdateEdit =========");
        //console.log("mod_upload_dict: ", mod_upload_dict);
        // called when date input changed

// reset mod_upload_dict, keep 'mode'
        const mode = get_dict_value_by_key(mod_upload_dict, "mode")
        const is_delete = (mode === "delete")
        mod_upload_dict = {"mode": mode}
        //console.log("vv mod_upload_dict: ", mod_upload_dict);

// get value from input element
        const new_value = document.getElementById("id_mod_rosterdate_input").value;

// update value of input label
        const label_txt = loc.rosterdate + ": " +
            format_date_iso (new_value, loc.months_long, loc.weekdays_long, false, false, user_lang);
        document.getElementById("id_mod_rosterdate_label").innerText = label_txt

// --- check if new rosterdate has emplhour records and confirmed records
        const datalist_request = {"rosterdate_check": {"mode": mode, "rosterdate": new_value}}
        DatalistDownload(datalist_request);
        // returns function ModRosterdateChecked

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_add_class = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_remove_class = (is_delete) ? "btn-primary" :  "btn-outline-danger";
        const btn_text = (is_delete) ? loc.btn_delete : loc.btn_create
        let el_btn_ok = document.getElementById("id_mod_rosterdate_btn_ok")
            el_btn_ok.innerText = btn_text;
            el_btn_ok.classList.remove(btn_remove_class)
            el_btn_ok.classList.add(btn_add_class)
            el_btn_ok.disabled = true;
        let el_btn_cancel = document.getElementById("id_mod_rosterdate_btn_cancel")
            el_btn_cancel.innerText = loc.btn_cancel;

    }  // ModRosterdateEdit

// +++++++++  ModRosterdateSave  ++++++++++++++++++++++++++++++ PR2019-11-14
    function ModRosterdateSave() {
        //console.log("=== ModRosterdateSave =========");
        //console.log("mod_upload_dict", mod_upload_dict);
        const mode = get_dict_value_by_key(mod_upload_dict, "mode")
        const is_delete = (mode === "delete")
        // mod_upload_dict: {mode: "create", rosterdate: "2019-12-20", confirmed: 0, count: 0}

    // make input field readonly
            document.getElementById("id_mod_rosterdate_input").readOnly = true;

    // show loader
            document.getElementById("id_mod_rosterdate_loader").classList.remove(cls_hide);

    // set info textboxes
            const info_txt = (is_delete) ? loc.rosterdate_deleting : loc.rosterdate_adding;
            document.getElementById("id_mod_rosterdate_info_01").innerText = info_txt + "...";
            document.getElementById("id_mod_rosterdate_info_02").innerText = null;
            document.getElementById("id_mod_rosterdate_info_03").innerText = null;

    // set buttons
            document.getElementById("id_mod_rosterdate_btn_ok").disabled = true;

    // Upload Changes:
           UploadChanges(mod_upload_dict, url_emplhour_fill_rosterdate);

    }  // function ModRosterdateSave

// +++++++++  ModRosterdateChecked  ++++++++++++++++++++++++++++++ PR2019-11-13
    function ModRosterdateChecked(response_dict) {
        //console.log("=== ModRosterdateChecked =========" );
        //console.log("response_dict:", response_dict );
        // response_dict: {mode: "last", value: "2019-12-19", count: 10, confirmed: 0}

        // when create: count is always > 0, otherwise this function is not called
        // hide loader in modal form

// add 'checked' to mod_upload_dict, so left button will know it must cancel
        mod_upload_dict = response_dict

// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

// remove input field readonly
        let el_input = document.getElementById("id_mod_rosterdate_input");
        el_input.value = get_dict_value_by_key(response_dict, "rosterdate");
        el_input.readOnly = false;

// set info textboxes
        set_label_and_infoboxes(response_dict)

    }  // function ModRosterdateChecked


// +++++++++  ModRosterdateFinished  ++++++++++++++++++++++++++++++ PR2019-11-13
    function ModRosterdateFinished(response_dict) {
        //console.log("=== ModRosterdateFinished =========" );
        //console.log("response_dict", response_dict );
        // rosterdate: {rosterdate: {…}, logfile:
        const mode = get_dict_value_by_key(response_dict,"mode")
        const is_delete = (mode === "delete")
        //console.log("mode", mode );
        //console.log("is_delete", is_delete );

// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

    // set info textboxes
        const info_txt = loc.rosterdate_finished + ((is_delete) ? loc.deleted : loc.created) + ".";

        document.getElementById("id_mod_rosterdate_info_01").innerText = info_txt;
        document.getElementById("id_mod_rosterdate_info_02").innerText = null;
        document.getElementById("id_mod_rosterdate_info_03").innerText = null;

    // hide ok button, put 'Close' on cancel button
        document.getElementById("id_mod_rosterdate_btn_ok").classList.add(cls_hide);
        document.getElementById("id_mod_rosterdate_btn_cancel").innerText = loc.close;

    }  // function ModRosterdateFinished


//=========  set_label_and_infoboxes  ================ PR2019-11-13
    function set_label_and_infoboxes(response_dict) {
        //console.log(" -----  set_label_and_infoboxes   ----")

// set info textboxes
        const mode = get_dict_value_by_key(response_dict, "mode");
        const is_delete = (mode === "delete");

        const rosterdate_iso = get_dict_value_by_key(response_dict,"rosterdate");
        const count = get_dict_value_by_key(response_dict,"count");
        const confirmed = get_dict_value_by_key(response_dict,"confirmed");

        let text_list = ["", "", "", ""];
        // set value of input label
        text_list[0] = loc.rosterdate + ": " +
            format_date_iso (rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, user_lang);

        if(!count){
    // This rosterdate has no shifts
             text_list[1] = loc.rosterdate_count_none;
        } else {
    // This rosterdate has [count] shifts
            text_list[1] = loc.rosterdate_count
            text_list[1] += ((count === 1) ? loc.one : count.toString()) + " ";
            text_list[1] += ((count === 1) ? loc.shift : loc.shifts);

            if(!confirmed){
                text_list[1] += ".";
            } else {
    // [confirmed] of them are confirmed shifts.
                text_list[1] += ((confirmed === 1) ?
                                    (", " + loc.rosterdate_confirmed_one) :
                                    (", " + confirmed.toString()) + " " + loc.rosterdate_confirmed_multiple);
            }

            if(!confirmed){
    // 'These shifts will be updated.' / deleted
                 text_list[2] = ((count === 1) ? loc.rosterdate_shift_willbe : loc.rosterdate_shifts_willbe) +
                                ((is_delete) ? loc.deleted : loc.updated) + ".";
            } else {
    // 'Shifts that are not confirmed will be updated/deleted, confirmed shifts will be skipped.')
                text_list[2] = loc.rosterdate_skip01 +
                               ((is_delete) ? loc.deleted : loc.updated) +
                               loc.rosterdate_skip02;
            }
            text_list[3] =  loc.want_to_continue
        }  // if(!count)

        document.getElementById("id_mod_rosterdate_label").innerText = text_list[0];
        document.getElementById("id_mod_rosterdate_info_01").innerText = text_list[1];
        document.getElementById("id_mod_rosterdate_info_02").innerText = text_list[2];
        document.getElementById("id_mod_rosterdate_info_03").innerText = text_list[3];

// set buttons
        // no record te be deleted, disable ok button
        // all records are confirmed, disable ok button
        // also disable when no rosterdate
        const is_disabled = ((!rosterdate_iso) || ((is_delete) && (!count || count === confirmed)))

        const ok_txt = (is_delete) ? ((!!count) ? loc.yes_delete : loc.btn_delete) :
                                     ((!!count) ? loc.yes_create : loc.btn_create);
        const cancel_txt = (!!count) ? loc.no_cancel : loc.btn_cancel

        let el_ok = document.getElementById("id_mod_rosterdate_btn_ok");
            el_ok.innerText = ok_txt;
            el_ok.disabled = is_disabled;

        let el_cancel = document.getElementById("id_mod_rosterdate_btn_cancel");
            el_cancel.innerText = cancel_txt;

    } // function set_label_and_infoboxes

// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModEmployeeOpen  ================ PR2019-08-23
    function ModEmployeeOpen(el_input) {
        console.log(" -----  ModEmployeeOpen   ----")

        // only called by teammember input employee

        // add empoloyee disabled in template mode
        if(template_mode){
            // TODO error: el_msg not showing yet
            // ShowMsgError(el_input, el_msg, msg_err, [200,200])
        } else{
    // reset mod_upload_dict, get id_dict from tlbRow, put id_dict in mod_upload_dict
            // mod_upload_dict contains selected row and employee.
            const tlbRow = get_tablerow_selected(el_input)
            const id_dict = get_iddict_from_element(tlbRow)
            mod_upload_dict = {"id": id_dict};

    // get current employee from el_input
            const fieldname = get_attr_from_el(el_input, "data-field")
            const pk_str = get_attr_from_el_str(el_input, "data-pk");
            const pk_int = parseInt(pk_str);

            const cur_employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, fieldname, pk_str)
            const code_value = get_subdict_value_by_key(cur_employee_dict, "code", "value");

    // ---  put employee name in header
            let el_header = document.getElementById("id_mod_employee_header")
            let el_div_remove = document.getElementById("id_mod_employee_div_remove")
            if (!!pk_int){
                el_header.innerText = code_value
                el_div_remove.classList.remove(cls_hide)
                if(!isEmpty(cur_employee_dict)) {
                    mod_upload_dict["employee"] = cur_employee_dict;
                }
                console.log("mod_upload_dict cur_employee", mod_upload_dict)
            } else {
    // ---  or header "select employee'
                el_header.innerText = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
                el_div_remove.classList.add(cls_hide)
            }

    // remove values from el_mod_employee_input
            let el_mod_employee_input = document.getElementById("id_mod_employee_input_employee")
            el_mod_employee_input.value = null

            //console.log("ModEmployeeFillSelectTableEmployee")
            ModEmployeeFillSelectTableEmployee(pk_int)

    // Set focus to el_mod_employee_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){
                el_mod_employee_input.focus()
            }, 500);

    // ---  show modal
            $("#id_mod_employee").modal({backdrop: true});

        }  //  if(!template_mode)
    };  // ModEmployeeOpen

//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        console.log( "===== ModEmployeeSelect ========= ");

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// get employee_dict from employee_map
            const select_pk = get_attr_from_el_int(tblRow, "data-pk")

            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk.toString());
            console.log("employee_dict", employee_dict);
            if (!isEmpty(employee_dict)){
// get code_value from employee_dict, put it in mod_upload_dict and el_input_employee
                const code_value = get_subdict_value_by_key(employee_dict, "code", "value")
                mod_upload_dict["employee"] = employee_dict;
// put code_value in el_input_employee
                document.getElementById("id_mod_employee_input_employee").value = code_value

// save selected employee
                // ModEmployeeSave()
            }  // if (!isEmpty(employee_dict)){
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-05-26
    function ModEmployeeFilterEmployee(option, event_key) {
        //console.log( "===== ModEmployeeFilterEmployee  ========= ", option);
        //console.log( "event_key", event_key);

        let el_input = document.getElementById("id_mod_employee_input_employee")

// save when clicked 'Enter', TODO  vonly if quicksave === true
        if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
            ModEmployeeSave()
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
// get map_dict from employee_map
            const map_id = get_map_id("employee", select_pk.toString());
            const map_dict = get_mapdict_from_datamap_by_id(employee_map, map_id);
            if (!isEmpty(map_dict)){
            // ---  get id_dict from map_dict
                const id_dict = get_dict_value_by_key(map_dict, "id")
                const code_dict = get_dict_value_by_key(map_dict, "code")
                const code_value = get_dict_value_by_key(code_dict, "value")
// put value of selected employee in employee_dict of mod_upload_dict
                const employee_dict = {"id": id_dict, "code": code_dict} ;
                if(!isEmpty(employee_dict)){mod_upload_dict["employee"] = employee_dict};
                if(!isEmpty(code_dict)){mod_upload_dict["code"] = code_dict};
                //console.log("mod_upload_dict", mod_upload_dict);

// put code_value of selected employee in el_input
                el_input.value = code_value
// data-quicksave = true enables saving by clicking 'Enter'
                el_input.setAttribute("data-quicksave", "true")
            }
        }
    }; // function ModEmployeeFilterEmployee

//=========  ModEmployeeSave  ================ PR2019-10-31
    function ModEmployeeSave(mode) {
        console.log("========= ModEmployeeSave ===" );
        console.log("mod_upload_dict: " );
        console.log(mod_upload_dict );
        let upload_dict = {"id": mod_upload_dict["id"]};
        if (mode ==="remove"){
// remove current employee from teammemember, is removed when {employee: {update: true} without pk
            upload_dict["employee"] = {"update": true}
        } else {
            const employee_dict = mod_upload_dict["employee"]
            console.log("employee_dict: ", employee_dict );
            upload_dict["employee"] = {"pk": employee_dict["id"]["pk"], "ppk": employee_dict["id"]["ppk"], "update": true}
        }
// ---  hide modal
    $("#id_mod_employee").modal("hide");
    UploadChanges(upload_dict, url_teammember_upload);
    } // ModEmployeeSave

//========= ModEmployeeFillSelectTableEmployee  ============= PR2019-08-18
    function ModEmployeeFillSelectTableEmployee(selected_employee_pk) {
        console.log( "=== ModEmployeeFillSelectTableEmployee ");

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = get_attr_from_el(el_data, "data-txt_employee_select_none") + ":";

        let tableBody = document.getElementById("id_mod_employee_tblbody");
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

            console.log( "item_dict: ", item_dict);
            console.log( "is_inactive: ", is_inactive);
//- skip selected employee
// PR20019-12-17 debug: also filter inactive, but keep inaclive in employee_map, to show them in teammember
                if (pk_int !== selected_employee_pk && !is_inactive){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE:  tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {ModEmployeeSelect(tblRow)}, false )

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
    } // ModEmployeeFillSelectTableEmployee

//=========  ModSchemeOpen  ================ PR2019-07-20
    function ModSchemeOpen() {
        //console.log("=========  ModSchemeOpen =========");

        el_mod_code.value = null
        el_mod_cycle.value = 7

        $("#id_mod_scheme").modal({backdrop: true});

    }  // ModSchemeEOpen

//=========  ModSchemeEdit  ================ PR2019-07-20
    function ModSchemeEdit(mode) {
        //console.log("=========  ModSchemeEdit =========");
        //console.log("mode", mode);

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
            let msg_err, el_err = document.getElementById("id_mod_scheme_code_err")
            if(!el_mod_code.value){
                msg_err = get_attr_from_el(el_data, "data-err_msg_code");
            }
            formcontrol_err_msg(el_mod_code, el_err, msg_err)
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
                        // FillSelectTable("scheme", "ModSchemeSave scheme_list", selected_scheme_pk);
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

                FillSelectTable("template", "ModCopyfromTemplateOpen", 0, false)

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

        let dict, el_err, msg_err, new_scheme_code;
        let err_template = false, err_customer = false, err_order = false, err_code = false;
        // TODO validation
         //console.log("el_mod_copyfrom_cust.value", el_mod_copyfrom_cust.value, typeof el_mod_copyfrom_cust.value);

       // dict = ModCopyfromTemplateValidateBlank()
        //const template_code = dict["code"];
        //err_template = dict["error"];
        //el_mod_copyfrom_code.value = template_code;

    // get selected_cust_pk and update SelectCustomer

        //dict = ModTemplateCopyfromValidateCustomerBlank()
        //err_customer = dict["error"];

        //dict = ModTemplateCopyfromValidateOrderBlank()
        //err_order = dict["error"];

        //if(mode === "customer"){
        //    HandleSelectCustomer(el_mod_copyfrom_cust)
        //}

     // get selected_order_pk and update SelectOrder
        //dict = ModTemplateCopyfromValidateOrderBlank()
        //err_order = dict["error"];
        //if(mode === "order"){
         //   HandleSelectOrder(el_mod_copyfrom_order)
        //}

       // dict = ModTemplateCopyfromValidateSchemeCode();
       // const scheme_code = dict["code"];
       // err_code = dict["error"];


        // get rosterdate of cyclestart record from schemeitem_template_list
        /*
            let startdate;
            msg_err = null;
            el_err = document.getElementById("id_mod_copyfrom_template_select_err")
            const template_pk = parseInt(el_mod_copyfrom_template_select.value)
            if(!template_pk){
                msg_err = get_attr_from_el(el_data, "data-err_msg_template_blank");
            } else {
                let rosterdate,  schemeitem_ppk, cyclestart = false;
                for(let i = 0, dict, len = schemeitem_template_list.length; i < len; i++){
                    dict = schemeitem_template_list[i];
                    schemeitem_ppk = get_subdict_value_by_key(dict,"id", "ppk")
                    if(schemeitem_ppk === template_pk){
                        cyclestart = get_subdict_value_by_key(dict,"cyclestart", "value", false)
                        if (!!cyclestart) {
                            startdate = get_subdict_value_by_key(dict,"rosterdate", "value")
                            break;
                        }
                    }
                } // for(let i = 0,

            */

            //}  // if(!template_pk){

           // if(!!startdate){
            //    el_mod_copyfrom_datestart.value = startdate
           // } else {
           //     const todayDate = moment().toISOString()
           //     const todayDate_str=  get_yyyymmdd_from_ISOstring(todayDate)
           //     el_mod_copyfrom_datestart.value = todayDate_str
           // }

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
       console.log("selected_scheme_pk: ", selected_scheme_pk) ;

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
        console.log("=========  ModCopytoTemplateEdit =========");

        let el_input = document.getElementById("id_mod_copyto_code");
        let value = el_input.value
        let msg_err = null;

        console.log("value:", value);
        if(!value){
            msg_err = loc.err_msg_template_blank;
        } else {
// --- loop through data_map
            let exists = false;
            for (const [map_id, item_dict] of scheme_map.entries()) {
        console.log("item_dict:", item_dict);
                const is_template = get_subdict_value_by_key(item_dict, "id", "istemplate")
                    const code = get_subdict_value_by_key(item_dict, "code", "value")
        console.log("code:", code, "is_template:", is_template);
                if(is_template){
        console.log("code:", code);
                    if (value.toLowerCase() === code.toLowerCase()) {
                        exists = true;
                        break;
                    }
                }
                console.log("exists:", exists);
            }
            if (exists){
                msg_err = loc.err_msg_name_exists;
            }
        }
        let el_err = document.getElementById("id_mod_copyto_code_err")
        formcontrol_err_msg(el_input, el_err, msg_err)

        console.log("msg_err:", msg_err);
        document.getElementById("id_mod_copyto_btn_save").disabled = (!!msg_err)

    }  // ModCopytoTemplateEdit

//=========  ModalCopytoTemplateSave  ================ PR2019-07-24
    function ModalCopytoTemplateSave() {
        console.log("=========  ModalCopytoTemplateSave =========");

        const dict ={"id": {"pk": selected_scheme_pk, "ppk": selected_order_pk,
                        "istemplate": true, "table": "scheme", "mode": "copyto"}}

        let template_code = document.getElementById("id_mod_copyto_code").value
        if (!!template_code){
            dict["code"] = {"value": template_code, "update": true}
        }
        let mod_upload_dict = {"copytotemplate": dict};

        $("#id_mod_copyto").modal("hide");

        UploadTemplate(mod_upload_dict)

    }  // ModalCopytoTemplateSave

//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        console.log("===  HandlePopupDateOpen  =====") ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)
        console.log(tr_selected) ;

// get info pk etc from tr_selected if called by tablerow
        let el
        if (!!tr_selected){ el = tr_selected } else {el = el_input}

        const data_table = get_attr_from_el(el, "data-table")
        const data_pk = get_attr_from_el(el, "data-pk")
        const data_ppk = get_attr_from_el(el, "data-ppk");
        console.log("data_table", data_table, "data_pk", data_pk, "data_ppk", data_ppk)

        if(!el_input.readOnly) {
// get values from el_input
            // el_id is stored in el_popup_date and used in HandlePopupDateSave
            const el_id = get_attr_from_el(el_input, "id");
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            console.log("data_field", data_field, "data_value", data_value)

            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");
            console.log("data_mindate", data_mindate, "data_maxdate", data_maxdate);

    // put values in el_popup_date
            el_popup_date.setAttribute("data-el_id", el_id);
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

// ---  get pk_str from id of el_popup
        // el_id is stored in el_popup_date in HandlePopupDateOpen
        const el_id = el_popup_date.getAttribute("data-el_id")  // id  of element clicked
        const pk_str = el_popup_date.getAttribute("data-pk")// pk of record  of element clicked
        const ppk_int = parseInt(el_popup_date.getAttribute("data-ppk"));
        const fieldname = el_popup_date.getAttribute("data-field");
        const tblName = el_popup_date.getAttribute("data-table");
        console.log("el_id:", el_id, typeof el_id);
        console.log("pk_str:", pk_str, "ppk_int:", ppk_int, "fieldname:", fieldname, "tblName:", tblName);

        if(!!pk_str && !! ppk_int){

            const row_id = tblName + pk_str;
            let tr_changed = document.getElementById(row_id)

            let row_upload = {};
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
                row_upload["id"] = id_dict
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

            let hide_weekday = false, hide_year = false;
            if (tblName === "teammember") {hide_year = true }
// create new_dhm string

            if (n_value !== o_value) {

                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {}
                if(!!n_value){field_dict["value"] = n_value};
                field_dict["update"] = true

// put new value in inputbox before new value is back from server
                let el_input = document.getElementById(el_id)
                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year)

    // ---  add field_dict to item_dict
                if (!isEmpty(field_dict)){row_upload[fieldname] = field_dict};
                console.log ("row_upload: ", row_upload);

                const url_str = (tblName === "teammember") ? url_teammember_upload :
                                (tblName === "schemeitem") ? url_schemeitem_upload : url_scheme_shift_team_upload;

                const parameters = {"upload": JSON.stringify (row_upload)}
                console.log("url_str:", url_str);

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
                            //FillSelectTable("team", "HandlePopupDateSave", selected_team_pk, true)
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
            }  // if (new_dhm_str !== old_dhm_str)
        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//========= OpenPopupWDY  ====================================
    function OpenPopupWDY(el_input) {
        console.log("===  OpenPopupWDY  =====") ;

        let el_popup_wdy = document.getElementById("id_popup_wdy")
        console.log(el_popup_wdy) ;

// ---  reset textbox 'rosterdate'
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")
        el_popup_wdy_rosterdate.innerText = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected, in scheme it is stored in el_scheme_code
        let el_info;
        if (!!tr_selected){el_info = tr_selected} else {el_info = el_scheme_code}
        const data_table = get_attr_from_el(el_info, "data-table")
        const id_str = get_attr_from_el(el_info, "data-pk")
        const parent_pk_str = get_attr_from_el(el_info, "data-ppk");
        //console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");
        const data_field_id = get_attr_from_el(el_input, "id");
        let data_value = get_attr_from_el(el_input, "data-value");
        let wdmy =  get_attr_from_el(el_input, "data-wdmy");
        //console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

 // if no rosterdate put today as rosterdate
        if (!data_value) {
            data_value = today_dict["value"]
            wdmy = today_dict["wdmy"]
        };

// put values in el_popup_wdy
        el_popup_wdy.setAttribute("data-table", data_table);
        el_popup_wdy.setAttribute("data-pk", id_str);
        el_popup_wdy.setAttribute("data-ppk", parent_pk_str);

        el_popup_wdy.setAttribute("data-field", data_field);
        el_popup_wdy.setAttribute("data-field_id", data_field_id);
        el_popup_wdy.setAttribute("data-value", data_value);
        el_popup_wdy.setAttribute("data-o_value", data_value);

        // if (!!wdmy){el_popup_wdy_rosterdate.value = wdmy};
        let field_dict = {"value": data_value}
        format_date_element (el_popup_wdy_rosterdate, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, false, false)

        let header;
        if (data_field === "rosterdate"){ header = get_attr_from_el(el_data, "data-txt_rosterdate")} else
        if (data_field === "datefirst"){header = get_attr_from_el(el_data, "data-txt_datefirst")} else
        if (data_field === "datelast"){header = get_attr_from_el(el_data, "data-txt_datelast")};
        document.getElementById("id_popup_wdy_header").innerText = header

// ---  position popup under el_input
        let popRect = el_popup_wdy.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();
        let topPos = inpRect.top + inpRect.height - 28;
        let leftPos = inpRect.left - 220;
        console.log("topPos", topPos)
        console.log("leftPos", leftPos)
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup_wdy.setAttribute("style", msgAttr)

// ---  show el_popup
        el_popup_wdy.classList.remove(cls_hide);


}; // function OpenPopupWDY

//=========  HandlePopupBtnWdy  ================ PR2019-04-14
    function HandlePopupBtnWdy() {
        //console.log("===  function HandlePopupBtnWdy ");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_date_from_ISOstring(o_value)
        //console.log("o_date: ", o_date, "o_value: ", o_value)

        const id = event.target.id
        if (id === "id_popup_wdy_today"){
            GetNewRosterdate(o_date)
        } else if (id === "id_popup_wdy_nextday"){
            GetNewRosterdate(o_date, 1)
        } else if (id === "id_popup_wdy_prev_day"){
            GetNewRosterdate(o_date, -1)
        } else if (id === "id_popup_wdy_nextmonth"){
            GetNewRosterdate(o_date, 0,1)
        } else if (id === "id_popup_wdy_prev_month"){
            GetNewRosterdate(o_date, 0,-1)
        }
    }

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
        console.log( " --- HighlightSelectShiftTeam ---");

// ---  remove highlights from tblBody_scheme_select
        console.log("?????????? ChangeBackgroundRows")
        ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey);

// ---  remove highlights from other select table
        let tblBody_other = (tblName === "shift") ? tblBody_team_select : tblBody_shift_select;
        ChangeBackgroundRows(tblBody_other, cls_bc_yellow_lightlight, cls_bc_lightlightgrey);

// ---  make background of this tblBody light yellow
        let tblBody_this = (tblName === "shift") ? tblBody_shift_select : tblBody_team_select;
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
        console.log(tr_selected) ;
        console.log(shift_map) ;
        const shift_dict = get_itemdict_from_datamap_by_tblRow(tr_selected, shift_map);

        console.log("shift_dict", shift_dict);

        HandleTableRowClicked(tr_selected);

        if(!isEmpty(shift_dict)){
            const fieldname = get_attr_from_el(el_input, "data-field")

            const id_dict = get_dict_value_by_key(shift_dict, "id")
            const field_dict = get_dict_value_by_key(shift_dict, fieldname)

            const offset = get_dict_value_by_key(field_dict, "value")
            let minoffset =  -720, maxoffset =  2160;
            if(!isEmpty(field_dict)){
                if ("minoffset" in field_dict){minoffset = field_dict["minoffset"]}
                if ("maxoffset" in field_dict){maxoffset = field_dict["maxoffset"]}
            }

            let tp_dict = {"id": id_dict, "field": fieldname, "rosterdate": field_dict["rosterdate"],
                "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
                "isampm": (timeformat === 'AmPm'), "quicksave": quicksave}

            const show_btn_delete = true;

            let st_dict = { "interval": interval, "comp_timezone": comp_timezone, "user_lang": user_lang,
                            "show_btn_delete": show_btn_delete, "weekday_list": weekday_list, "month_list": month_list,
                            "url_settings_upload": url_settings_upload};

            // only needed in scheme
            const text_curday = get_attr_from_el(el_data, "data-timepicker_curday");
            const text_prevday = get_attr_from_el(el_data, "data-timepicker_prevday");
            const text_nextday = get_attr_from_el(el_data, "data-timepicker_nextday");
            const txt_break = get_attr_from_el(el_data, "data-txt_break");
            if(!!text_curday){st_dict["text_curday"] = text_curday};
            if(!!text_prevday){st_dict["text_prevday"] = text_prevday};
            if(!!text_nextday){st_dict["text_nextday"] = text_nextday};
            if(!!txt_break){st_dict["txt_break"] = txt_break};

            const txt_save = get_attr_from_el(el_data, "data-txt_save");
            if(!!txt_save){st_dict["txt_save"] = txt_save};
            const txt_quicksave = get_attr_from_el(el_data, "data-txt_quicksave");
            if(!!txt_quicksave){st_dict["txt_quicksave"] = txt_quicksave};
            const txt_quicksave_remove = get_attr_from_el(el_data, "data-txt_quicksave_remove");
            if(!!txt_quicksave_remove){st_dict["txt_quicksave_remove"] = txt_quicksave_remove};

            const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
            if(!!imgsrc_delete){st_dict["imgsrc_delete"] = imgsrc_delete};

            OpenTimepicker(el_input, UploadTimepickerChanged, tp_dict, st_dict)
        }  //  if(!!pk_int)

    }; // function HandleTimepickerOpen

//###########################################################################
// +++++++++++++++++ FILTER +++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        console.log( "===== HandleFilterName  ========= ");

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
    }; // function FilterTableRows_dict

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
    function UpdateSettings(setting_list){
        console.log(" --- UpdateSettings ---")
        console.log("setting_list", setting_list)

        for (let i = 0, len = setting_list.length; i < len; i++) {
            const setting_dict = setting_list[i];
            //console.log("setting_dict", setting_dict)
            Object.keys(setting_dict).forEach(function(key) {
                if (key === "selected_pk"){
                    const sel_dict = setting_dict[key];
                    //console.log("sel_dict", sel_dict)

                    // these variables store pk of customer / order from setting.
                    // They are used in HandleSelectCustomer to go to saved customer / order
                    // field type is integer
                    setting_cust_pk = get_dict_value_by_key(sel_dict, "sel_cust_pk", 0);
                    setting_order_pk = get_dict_value_by_key(sel_dict, "sel_order_pk", 0);
                    setting_scheme_pk = get_dict_value_by_key(sel_dict, "sel_scheme_pk", 0);

                } else if (key === "quicksave"){
                    quicksave = setting_dict[key];
                }

            });
        };
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
            header_text = get_attr_from_el(el_data, "data-txt_template") + ":  "
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
            const code = get_subdict_value_by_key(map_dict, "code", "value")
            const cycle = get_subdict_value_by_key(map_dict, "cycle", "value")
            if(code){
                if(!template_mode && !!header_text) {header_text += "  -  "};
                header_text +=  code;
            }
            let hdr_right_text = null
            if(cycle){
                const days_cycle = get_attr_from_el(el_data, "data-txt_days_cycle")
                hdr_right_text = cycle.toString() + "-" + days_cycle;
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
    function update_map_item(map_id, update_dict){
        //console.log(" --- update_map_item ---") // PR2019-12-01

        const id_dict = get_dict_value_by_key (update_dict, "id");
        if(!isEmpty(id_dict)){
            const tblName = get_dict_value_by_key(id_dict, "table");
            const pk_int = get_dict_value_by_key(id_dict, "pk");
            const map_id = get_map_id(tblName, pk_int);
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);

        //--- replace updated item in map or remove deleted item from map
            let data_map = (tblName === "scheme") ? scheme_map :
                           (tblName === "shift") ? shift_map :
                           (tblName === "team") ? team_map :
                           (tblName === "schemeitem") ? schemeitem_map :
                           (tblName === "teammember") ? teammember_map : null
            if(is_deleted){
                data_map.delete(map_id);
            } else if(is_created){
        // insert new item in alphabetical order, but no solution found yet
                data_map.set(map_id, update_dict)
            } else {
                data_map.set(map_id, update_dict)
            }
        }  // if(!isEmpty(id_dict))
    }  // update_map_item


//========= GetDatetimeLocal  ====================================
    function GetDatetimeLocal(data_datetime, comp_timezone) {
        // PR2019-07-07
        let datetime_local;
        if (!!data_datetime && !!comp_timezone) {
            datetime_local = moment.tz(data_datetime, comp_timezone)
        };
        return datetime_local;
    }  // GetDatetimeLocal

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

}); //$(document).ready(function()