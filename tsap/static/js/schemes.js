// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
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
        const cls_selected = "tsa_tr_selected";

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_schm"));

// ---  id of selected customer and selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;
        let selected_scheme_pk = 0;
        let selected_shift_pk = 0;
        let selected_team_pk = 0;
        let selected_item_pk = 0;
        let show_templates = false;

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
            el_select_customer.addEventListener("change", function() {HandleSelectCustomer(el_select_customer);}, false )

// ---  Select Order
        let el_select_order = document.getElementById("id_select_order")
            el_select_order.addEventListener("click", function(event) {HandleSelectOrder(el_select_order)}, false )

// ---  Select Scheme
        // in FillSelectTable is created function HandleSelectScheme

        let tblBody_scheme_select = document.getElementById("id_tbody_scheme_select")
        let tblBody_shift_select = document.getElementById("id_tbody_shift_select")
        let tblBody_team_select = document.getElementById("id_tbody_team_select")

        let tblBody_items = document.getElementById("id_tbody_items");
        let tblHead_items = document.getElementById("id_thead_items");

        let el_timepicker = document.getElementById("id_timepicker")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")

        let customer_map = new Map();
        let order_map = new Map();

        let scheme_map = new Map();
        let schemeitem_map = new Map();

        let order_template_list = [];
        let scheme_template_list = [];
        let schemeitem_template_list = [];

        let shift_map = new Map();
        let team_map = new Map();

        let teammember_map = new Map();
        let employee_map = new Map();

        const tbl_col_count = {"schemeitem": 10, "shift": 8, "teammember": 5}

        const thead_text = {"schemeitem": ["txt_date", "txt_shift", "txt_employee", "txt_timestart",
                               "txt_timeend", "txt_break", "txt_pricerate", , , , ],
                "shift": ["txt_shift", , "txt_timestart", "txt_timeend",
                               "txt_break", "txt_pricerate",,,],
                "teammember": ["txt_employee", "txt_datefirst", "txt_datelast", "txt_pricerate" , ]}
        let field_names = {
                "schemeitem": ["rosterdate", "shift", "team", "timestart", "timeend",
                                "breakduration", "pricerate", "billable", "inactive", "delete_row" ],
                "shift": ["code", "isrestshift", "offsetstart", "offsetend",
                               "breakduration", "pricerate", "billable", "delete_row" ],
                "teammember": ["employee", "datefirst", "datelast", "pricerate", "delete_row"]}

        const field_tags = {"schemeitem": ["input", "select", "select", "input","input",
                                            "input","input", "a", "a", "a"],
                                 "shift": ["input", "a", "input", "input", "input", "input", "a", "a"],
                            "teammember": ["input", "input", "input", "input", "a"]}

        const field_width = {"schemeitem": ["120", "120", "180", "090", "090", "090", "090", "060", "060"],
            "shift": ["180", "060", "090", "090", "090", "090", "060"],
            "teammember": ["180", "150", "150", "090", "032"]}

        const field_right_align = {"schemeitem": [3,4,5,6], "shift": [2,3,4,5], "teammember": [4]}
        const field_center_align = {"schemeitem": [], "shift": [], "teammember": []}

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_scheme_template_upload = get_attr_from_el(el_data, "data-scheme_template_upload_url");

        const url_schemeitem_upload = get_attr_from_el(el_data, "data-schemeitem_upload_url");
        const url_schemeitem_fill = get_attr_from_el(el_data, "data-schemeitem_fill_url");
        const url_schemeitems_download = get_attr_from_el(el_data, "data-schemeitems_download_url");
        const url_scheme_upload = get_attr_from_el(el_data, "data-scheme_upload_url");
        const url_scheme_shift_team_upload = get_attr_from_el(el_data, "data-schemeorshiftorteam_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const url_emplhour_fill_rosterdate = get_attr_from_el(el_data, "data-emplhour_fill_rosterdate_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_active_lightgrey = get_attr_from_el(el_data, "data-imgsrc_active_lightgrey");

        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_billable_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_billable_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")
        const imgsrc_billable_grey = (user_lang === "en") ?
            get_attr_from_el(el_data, "data-imgsrc_b_grey") :
            get_attr_from_el(el_data, "data-imgsrc_d_grey");
        const imgsrc_billable_black = (user_lang === "en") ?
            get_attr_from_el(el_data, "data-imgsrc_b_black") :
            get_attr_from_el(el_data, "data-imgsrc_d_black");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_rest_black = get_attr_from_el(el_data, "data-imgsrc_rest_black");

        const title_billable =  get_attr_from_el(el_data, "data-title_billable");
        const title_notbillable =  get_attr_from_el(el_data, "data-title_notbillable");
        const title_restshift =  get_attr_from_el(el_data, "data-title_restshift");

        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const title_prev = get_attr_from_el(el_data, "data-timepicker_prevday_info");
        const title_next = get_attr_from_el(el_data, "data-timepicker_nextday_info");

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        moment.locale(user_lang)

//  ========== EventListeners  ======================

// ---  create EventListener for buttons in window
        let el_btn_dayup = document.getElementById("id_btn_dayup")
            el_btn_dayup.addEventListener("click", function() {HandleAutofillDayupDown("dayup")}, false )
        let el_btn_daydown = document.getElementById("id_btn_daydown")
            el_btn_daydown.addEventListener("click", function() {HandleAutofillDayupDown("daydown")}, false )
        let el_btn_autofill = document.getElementById("id_btn_autofill")
            el_btn_autofill.addEventListener("click", function() {HandleAutofillDayupDown("autofill")}, false )
        let el_btn_scheme_delete = document.getElementById("id_btn_scheme_delete")
            el_btn_scheme_delete.addEventListener("click", function() {ModConfirmDeleteOpen("schemeitems")}, false )

// --- hide fill buttons
        schemefillbuttons_hide();

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_mod_employee_body");
        let el_mod_employee_filter_employee = document.getElementById("id_mod_employee_filter_employee");
            el_mod_employee_filter_employee.addEventListener("keyup", function(){
                setTimeout(function() {ModEmployeeFilterEmployee("filter")}, 50)});

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
        let el_mod_copyfrom_template = document.getElementById("id_mod_copyfrom_template")
             el_mod_copyfrom_template.addEventListener("change", function() {ModalCopyfromTemplateEdit("template")})
        let el_mod_copyfrom_cust = document.getElementById("id_mod_copyfrom_customer")
             el_mod_copyfrom_cust.addEventListener("change", function() {ModalCopyfromTemplateEdit("customer")}, false)
        let el_mod_copyfrom_order = document.getElementById("id_mod_copyfrom_order")
             el_mod_copyfrom_order.addEventListener("change", function() {ModalCopyfromTemplateEdit("order")}, false)
        let el_mod_copyfrom_code = document.getElementById("id_mod_copyfrom_code")
             el_mod_copyfrom_code.addEventListener("keyup", function() {ModalCopyfromTemplateEdit("code")})
        //let el_mod_copyfrom_datestart = document.getElementById("id_mod_copyfrom_datestart")
        //    el_mod_copyfrom_datestart.addEventListener("change", function() {ModalCopyfromTemplateEdit("datestart")})
        let el_mod_copyfrom_btn_save = document.getElementById("id_mod_copyfrom_btn_save")
             el_mod_copyfrom_btn_save.addEventListener("click", function() {ModalCopyfromTemplateSave()})

// ---  Modal Copyto Template
        let el_mod_copyto_code = document.getElementById("id_mod_copyto_code")
             el_mod_copyto_code.addEventListener("keyup", function() {ModalCopytoTemplateEdit()})
        let el_mod_copyto_btn_save = document.getElementById("id_mod_copyto_btn_save")
             el_mod_copyto_btn_save.addEventListener("click", function() {ModalCopytoTemplateSave()})

// ---  Modal Confim delete
        document.getElementById("id_confdel_btn_save").addEventListener("click", function() {ModConfirmDeleteSave()})

// ---  Popup
        // popup_date
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

// ---  Input elements
        let el_scheme_code = document.getElementById("id_scheme_code")
            el_scheme_code.addEventListener("change", function() {Upload_Scheme()}, false)
        let el_scheme_cycle = document.getElementById("id_scheme_cycle");
            el_scheme_cycle.addEventListener("change", function() {Upload_Scheme()}, false)
        let el_scheme_datefirst = document.getElementById("id_scheme_datefirst");
            el_scheme_datefirst.addEventListener("click", function() {
                HandlePopupDateOpen(el_scheme_datefirst)}, false);
        let el_scheme_datelast = document.getElementById("id_scheme_datelast");
            el_scheme_datelast.addEventListener("click", function() {
                HandlePopupDateOpen(el_scheme_datelast)}, false);
        let el_scheme_pricerate = document.getElementById("id_scheme_pricerate");
            el_scheme_pricerate.addEventListener("change", function() {Upload_Scheme()}, false)
        let el_scheme_billable = document.getElementById("id_scheme_billable");
            el_scheme_billable.addEventListener("click", function() {
                HandleBillableClicked(el_scheme_billable, "scheme")}, false);

// --- close windows
        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another

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
            if (event.target.classList.contains("input_popup_date")) { close_popup = false} else
            if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground();
                el_popup_wdy.classList.add("display_hide");
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
            if (event.target.classList.contains("input_popup_date")) {close_popup = false} else
            // don't close popup when clicked on popup box, except for close button
            if (el_popup_date_container.contains(event.target) && !event.target.classList.contains("popup_close")){close_popup = false}
            if (close_popup) {
                popupbox_removebackground();
                el_popup_date_container.classList.add(cls_hide)
            };
        }, false);


// --- create Submenu
        CreateSubmenu()

// --- create header row
        CreateTableHeader("schemeitem");

        const cat_lt = 512  // less then 512 = absence // 4096 template
        const datalist_request = {"customer": {inactive: false, "cat_lt": cat_lt},
                                  "order": {inactive: false, "cat_lt": cat_lt},
                                  "order_template": {inactive: false},
                                  "scheme_template": {inactive: false},
                                  "schemeitem_template": {inactive: false},
                                  "employee": {inactive: false},
                                  "rosterdatefill": {next: true},
                                  "quicksave": {get: true}
                                  };
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")

// reset requested lists
        for (let key in datalist_request) {
            if (key === "order_template") {order_template_list = []};
            if (key === "scheme_template") {scheme_template_list = []};
            if (key === "schemeitem_template") {schemeitem_template_list = []};
        }

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

                // 'order' must come before 'customer'
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                }
                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                    let txt_select = get_attr_from_el(el_data, "data-txt_select_customer");
                    let txt_select_none = get_attr_from_el(el_data, "data-txt_select_customer_none");

                    FillSelectOptionDict(el_select_customer, customer_map, txt_select, txt_select_none);
                    FillSelectOptionDict(el_mod_cust, customer_map, txt_select, txt_select_none);
                    FillSelectOptionDict(el_mod_copyfrom_cust, customer_map, txt_select, txt_select_none);

            // if there is only 1 customer, ithat one is selected (selected_customer_pk gets value in FillSelectOptionDict)
                    console.log("el_select_customer", el_select_customer)
                    const sel_cust_value = parseInt(el_select_customer.value);
                    selected_customer_pk = (!!sel_cust_value) ? sel_cust_value : 0;
                    console.log("selected_customer_pk", selected_customer_pk, typeof selected_customer_pk)
                    if (!!selected_customer_pk){
                        el_select_customer.value = selected_customer_pk
                        HandleSelectCustomer(el_select_customer)
                    };
                }
                const data_txt = (show_templates) ? "data-txt_hide_templates" : "data-txt_show_templates" ;
                const btn_txt = get_attr_from_el_str(el_data, data_txt);
                document.getElementById("id_submenu_show_templates").innerText = btn_txt;

                if ("scheme_list" in response) {
                    get_datamap(response["scheme_list"], scheme_map)
                    FillSelectTable("scheme")
                }
                if ("schemeitem_list" in response) {
                    get_datamap(response["schemeitem_list"], schemeitem_map)
                }
                if ("order_template_list" in response) {
                    order_template_list = response["order_template_list"]}

                if ("scheme_template_list" in response) {
                    scheme_template_list = response["scheme_template_list"]}

                if ("schemeitem_template_list" in response) {
                    schemeitem_template_list = response["schemeitem_template_list"]}

                if ("shift_list" in response) {
                    get_datamap(response["shift_list"], shift_map)

                console.log("shift_map")
                console.log(shift_map)
                    // TODO NIU ???
                    FillDatalist("id_datalist_shifts", shift_map)
                }

                if ("team_list" in response){
                    get_datamap(response["team_list"], team_map)
                    FillSelectTable("team")
                }

                if ("teammember_list" in response){
                    get_datamap(response["teammember_list"], teammember_map)
                    FillDatalist("id_datalist_teammembers", teammember_map)
                }

                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                    FillDatalist("id_datalist_employees", employee_map)
                }

                if ("quicksave" in response) {
                    el_data.setAttribute("data-quicksave", get_subdict_value_by_key(response, "quicksave", "value", false))
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

//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        // console.log("pk", pk, "ppk", parent_pk);

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

    // --- first add <a> element with EventListener to td
        let el_a = document.createElement("a");
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_scheme_add");
        el_a.setAttribute("href", "#");
        el_a.addEventListener("click", function() {ModSchemeOpen()}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_current");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText =  get_attr_from_el_str(el_data, "data-txt_scheme_from_template");
        el_a.addEventListener("click", function() {ModalCopyfromTemplateOpen()}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_current");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_scheme_to_template");
        el_a.addEventListener("click", function() {ModalCopytoTemplateOpen()}, false )
        el_div.appendChild(el_a);

    // --- add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_submenu_show_templates");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_show_templates");
        el_a.addEventListener("click", function() {TemplateShow()}, false )
        el_div.appendChild(el_a);

        el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu

//=========  TemplateShow  ================ PR2019-09-15
    function TemplateShow(el) {
        //console.log("--- TemplateShow")
        show_templates = !show_templates

       // const data_txt = (show_templates) ? "data-txt_hide_templates" : "data-txt_show_templates" ;
        //const btn_txt = get_attr_from_el_str(el_data, data_txt);
       // document.getElementById("id_submenu_show_templates").innerText = btn_txt;

        //cat = 512= absence // ct = 4096 template
        let datalist_request;
        if(show_templates){
            datalist_request = {"customer": {inactive: false, "cat": 4096},
                                  "order": {inactive: false, "cat": 4096}
                                  };
        } else {
            datalist_request = {"customer": {inactive: false, "cat_lt": 512},
                                  "order": {inactive: false, "cat_lt": 512},
                                  };
        }
        DatalistDownload(datalist_request);
    }

//=========  HandleSelectCustomer  ================ PR2019-03-23
    function HandleSelectCustomer(el) {
        console.log("--- HandleSelectCustomer")
        console.log(el)

// reset lists
        scheme_map.clear();
        shift_map.clear();
        team_map.clear();
        teammember_map.clear();
        schemeitem_map.clear();

// reset selected customer
        selected_customer_pk = 0

// reset selected order
        selected_order_pk = 0
        el_select_order.innerText = null
        el_mod_order.innerText = null
        el_mod_copyfrom_order.innerText = null

// reset selected scheme
        selected_scheme_pk = 0;
        ResetSchemeInputElements()

// reset selected team and selected item  ((schemeitem or teammember)
        selected_shift_pk = 0;
        selected_team_pk = 0;
        selected_item_pk = 0;

// reset tables
        tblBody_scheme_select.innerText = null;
        tblBody_shift_select.innerText = null;
        tblBody_team_select.innerText = null;

        tblBody_items.innerText = null;

// get selected customer, put name in header
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        // after first DatalistDownload, when there is only 1 customer, selected_customer_pk gets this value
        //  HandleSelectCustomer has then no parameter 'el' and selected_customer_pk has value
        if(!!el){
            const pk_int = parseInt(el.value);
            if (!!pk_int){
// copy selected customer, to other fields with selected customer
                selected_customer_pk = pk_int
                console.log("selected_customer_pk", selected_customer_pk, typeof selected_customer_pk)

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

                hdr_customer.innerText =  el_select_customer.options[el_select_customer.selectedIndex].text;

                let select_text = get_attr_from_el(el_data, "data-txt_select_order");
                let select_text_none = get_attr_from_el(el_data, "data-txt_select_order_none");

        // fill select order
                FillSelectOptionDict(el_select_order, order_map, select_text, select_text_none, selected_customer_pk)
                FillSelectOptionDict(el_mod_order, order_map, select_text, select_text_none, selected_customer_pk)
                FillSelectOptionDict(el_mod_copyfrom_order, order_map, select_text, select_text_none, selected_customer_pk)

        // if there is only 1 order, that one is selected
                selected_order_pk = parseInt(el_select_order.value);
                if (!!selected_order_pk){HandleSelectOrder(el_select_order);};

        // download lists of this customer: schemes, schemeitems, shifts, teams
                const datalist_request = {"scheme": {"customer_pk": selected_customer_pk, "inactive": true},
                                          "schemeitem": {"customer_pk": selected_customer_pk},
                                          "shift": {"customer_pk": selected_customer_pk},
                                          "team": {"customer_pk": selected_customer_pk},
                                          "teammember": {"customer_pk": selected_customer_pk}};
                DatalistDownload(datalist_request);
            }  //  if (!!pk_int)
        }  // if(!!el)
    }

//=========  HandleSelectOrder  ================ PR2019-03-24
    function HandleSelectOrder(el) {
        console.log("--- HandleSelectOrder")
        //console.log(el)

// reset lists
        // don't reset, all items from this customer are already downloaded

// reset selected order, scheme, shift, team and schemeitem
        selected_order_pk = 0
        selected_scheme_pk = 0;
        selected_shift_pk = 0;
        selected_team_pk = 0;
        selected_item_pk = 0;

// reset tables scheme_select, schemeitems and teams
        tblBody_scheme_select.innerText = null;
        tblBody_shift_select.innerText = null;
        tblBody_team_select.innerText = null;
        tblBody_items.innerText = null;

        ResetSchemeInputElements()

// get selected order
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false

        // after first DatalistDownload, when there is only 1 customer, selected_customer_pk gets this value
        //  HandleSelectOrder has then no parameter 'el' and selected_order_pk has valeu
        if(!!el){
            const pk_int = parseInt(el.value);
            if (!!pk_int){
                selected_order_pk = pk_int
                //console.log("selected_order_pk", selected_order_pk)

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

                let header_text = "";
                if(el_select_customer.selectedIndex > -1){
                    if(!!el_select_customer.options[el_select_customer.selectedIndex].text){
                        header_text = el_select_customer.options[el_select_customer.selectedIndex].text
                    };
                }
                // index 0 contains 'select order' when there are multiple options)
                // skip if no option selected or when option = 0 with multiple options
                if ((el.selectedIndex < 0) || (el.selectedIndex === 0 && el.options.length === 1)) {
                    if(!!el.options[el.selectedIndex].text){
                        header_text += "  -  " + el.options[el.selectedIndex].text
                    };
                }
                hdr_customer.innerText = header_text
                //console.log("header_text", header_text)

                FillSelectTable("scheme")

            } //  if (!!pk_int)
        }  // if(!!el){


// select table 'scheme' is filled by FillSelectTable("scheme"). This function is called in DatalistDownload

    }  // HandleSelectOrder

//=========  HandleSelectScheme  ================ PR2019-05-24
    function HandleSelectScheme(sel_tr_clicked) {
        console.log( "===== HandleSelectScheme  ========= ");
        console.log(sel_tr_clicked);

        if(!!sel_tr_clicked) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(sel_tr_clicked, cls_selected);

// ---  highlight clicked row
            sel_tr_clicked.classList.add(cls_selected)

// reset input fields and tables
            selected_scheme_pk = 0

            tblBody_items.innerText = null;

            ResetSchemeInputElements()

            //let scheme_pk = get_attr_from_el_int(sel_tr_clicked, "data-pk");
            const pk_int = get_attr_from_el_int(sel_tr_clicked, "data-pk");
            const map_id = get_attr_from_el(sel_tr_clicked, "data-mapid")

            if(!!pk_int){
                selected_scheme_pk = pk_int

    // get selected scheme from scheme_map
                const item_dict = scheme_map.get(map_id)

    // fill scheme fields
                if (!!item_dict){
                    let header_text = "";
                    if(el_select_customer.selectedIndex > -1){
                        if(!!el_select_customer.options[el_select_customer.selectedIndex].text){
                            header_text = el_select_customer.options[el_select_customer.selectedIndex].text
                        };
                    }
                    if ((el_select_order.selectedIndex < 0) || (el_select_order.selectedIndex === 0 && el_select_order.options.length === 1)) {
                        if(!!el_select_order.options[el_select_order.selectedIndex].text){
                            header_text += "  -  " + el_select_order.options[el_select_order.selectedIndex].text
                        };
                    }
                    const scheme_code = get_subdict_value_by_key(item_dict,"code", "value")
                    if(!!scheme_code){header_text += "  -  " + scheme_code}
                    hdr_customer.innerText = header_text

                    UpdateSchemeInputElements(item_dict)

    // --- Fill select table Shift and Teams
                    FillSelectTable("shift")
                    FillSelectTable("team")

// ---  highlight clicked row
                ChangeBackgroundRows(sel_tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
                sel_tr_clicked.classList.remove(cls_bc_yellow_lightlight)
                sel_tr_clicked.classList.add(cls_bc_yellow)

// ---  remove highlightshift select tabel
                ChangeBackgroundRows(tblBody_shift_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
                ChangeBackgroundRows(tblBody_team_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)

    // --- fill data table schemeitems
                    CreateTableHeader("schemeitem");
                    FillTableRows("schemeitem", selected_scheme_pk);

    // --- make fill buttons visible
                    schemefillbuttons_show()

                }  // if (!!item_dict){
            }  // if(!!pk_int)
        } // if(!!sel_tr_clicked)
    }  // function HandleSelectScheme

//=========  HandleSelectShift  ================ PR2019-08-08
    function HandleSelectShift(sel_tr_clicked) {
       console.log( "===== HandleSelectShift  ========= ");
        console.log( sel_tr_clicked);
        if(!!sel_tr_clicked) {
// ---  get shift_pk from sel_tr_clicked
            const pk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-pk"));
            const ppk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-ppk"));
            console.log( "pk_int", pk_int,  "ppk_int", ppk_int);
            console.log( "selected_shift_pk", selected_shift_pk, typeof selected_shift_pk);

// ---  update selected__pk when not equal to pk_int
            if (pk_int !== selected_shift_pk) {
                selected_shift_pk = pk_int
// ---  reset selected_item_pk  selected_shift_pk has changed
                selected_item_pk = 0

// ---  highlight clicked row
                ChangeBackgroundRows(sel_tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
                sel_tr_clicked.classList.remove(cls_bc_yellow_lightlight)
                sel_tr_clicked.classList.add(cls_bc_yellow)
// ---  remove highlightshift select tabel
                ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
                ChangeBackgroundRows(tblBody_team_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
            }
// --- create header row
            CreateTableHeader("shift");
// --- fill data table shifts
            FillTableRows("shift", ppk_int)
// --- hide fill buttons
            schemefillbuttons_hide();
        }  // if(!!sel_tr_clicked)
    }  // HandleSelectShift

//=========  HandleSelectTeam  ================ PR2019-05-24
    function HandleSelectTeam(sel_tr_clicked) {
        //console.log( "===== HandleSelectTeam  ========= ");

// ---  get team_pk from id_dict or from sel_tr_clicked
        if(!!sel_tr_clicked) {
            let team_pk_int = get_attr_from_el_int(sel_tr_clicked, "data-pk");
            //console.log( "team_pk_int", team_pk_int);

            selected_team_pk = team_pk_int
// ---  reset selected_item_pk  selected_team_pk has changed
            selected_item_pk = 0// ---  highlight clicked row

            ChangeBackgroundRows(sel_tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
            sel_tr_clicked.classList.remove(cls_bc_yellow_lightlight)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// --- create header row
            CreateTableHeader("teammember");

// --- fill data table teammembers
            FillTableRows("teammember", selected_team_pk);

// --- hide fill buttons
            schemefillbuttons_hide();
        }
    }  // HandleSelectTeam

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        // console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked, cls_selected);

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_item_pk = get_datapk_from_element(tr_clicked)

            tr_clicked.classList.add(cls_selected)

// ---  highlight row in selecttable
            const tblName = get_attr_from_el(tr_clicked, "data-table")
            if(tblName === "shift"){HighlichtSelectShift(selected_item_pk)};
        }
    }  // HandleTableRowClicked

//========= HandleRestshiftClicked  ============= PR2019-10-01
    function HandleRestshiftClicked(el_changed, tablename) {
        console.log("======== HandleRestshiftClicked  ========", tablename);

        const tr_changed = get_tablerow_selected(el_changed)
        const pk_str = get_attr_from_el(tr_changed, "data-pk")
        const map_id = tablename + pk_str;
        const itemdict = get_itemdict_from_datamap_by_id(map_id, shift_map);
        console.log("pk_str", pk_str, "map_id", map_id);
        console.log("itemdict");
        console.log(itemdict);

        let cat_sum = get_subdict_value_by_key(itemdict, "cat", "value")
        let is_restshift = get_subdict_value_by_key(itemdict, "isrestshift", "value", false)
        console.log("is_restshift", is_restshift, typeof is_restshift);

        is_restshift = (!is_restshift)
        el_changed.setAttribute("data-value", is_restshift);
        console.log("is_restshift", is_restshift);

        // update icon
        const imgsrc = (is_restshift) ? imgsrc_rest_black : imgsrc_stat00;

        el_changed.children[0].setAttribute("src", imgsrc);

        let id_dict = get_dict_value_by_key(itemdict, "id")
        let upload_dict = {"id": id_dict, "isrestshift": {"value": is_restshift, "update": true}}

        UploadChanges(upload_dict, tr_changed);
    }  // HandleRestshiftClicked

//========= HandleBillableClicked  ============= PR2019-09-27
    function HandleBillableClicked(el_changed, tablename) {
        console.log("======== HandleBillableClicked  ========", tablename);
        let pk_str, itemdict, data_map, tr_changed;
        if (tablename === "scheme") {
            pk_str = get_attr_from_el(el_scheme_code, "data-pk")
        } else {
            tr_changed = get_tablerow_selected(el_changed)
            pk_str = get_attr_from_el(tr_changed, "data-pk")
        };

        if(tablename === "scheme"){
            data_map = scheme_map;
        } else  if(tablename === "shift"){
            data_map = shift_map;
        } else  if(tablename === "schemeitem"){
            data_map = schemeitem_map;
        }
        const map_id = tablename + pk_str;
        console.log("map_id", map_id);
        console.log("data_map", data_map);
        itemdict = get_itemdict_from_datamap_by_id(map_id, data_map);
        console.log("itemdict",itemdict);

        let cat_sum = get_subdict_value_by_key(itemdict, "cat", "value")
        let is_override = cat_found_in_catsum(2, cat_sum);  // SHIFT_CAT_0002_BILLABLE_OVERRIDE = 2
        let is_billable = cat_found_in_catsum(4, cat_sum);  // SHIFT_CAT_0004_BILLABLE = 4
        console.log("cat_sum", cat_sum, "is_override", is_override, "is_billable", is_billable);

        if (is_override){
            if (is_billable){  // cat = 2 + 4 = 6 (or +1, +8 etc)
                // is override billable: make override not billable
                is_billable = false;
                cat_sum -= 4 // cat = 2 + 0 = 2
            } else {  // cat = 2 + 0 = 2 (or +1, +8 etc)
                // is override not billable: remove override
                // lookup parent billable > on server
                is_override = false;
                cat_sum -= 2 // cat = 0 + 0 = 0
            }
        } else {
            if (is_billable){  // cat = 0 + 4 = 4 (or +1, +8 etc)
                // is inherited billable: make override + not billable
                is_override = true
                is_billable = false
                cat_sum -= 2  // cat += 2 and cat -= 4  --> cat = 2 + 0 = 2
            } else {    // cat = 0 + 0 = 0 (or +1, +8 etc)
                // is inherited not billable: make override + billable
                is_override = true
                is_billable = true
                cat_sum += 6 // cat += 2 and cat += 4 --> cat = 2 + 4 = 6
            }
        }

        el_changed.setAttribute("data-value", cat_sum);
        console.log("cat_sum", cat_sum, "is_billable", is_billable);

        // update icon
        const imgsrc =  (is_override) ?
            ((is_billable) ? imgsrc_billable_black : imgsrc_billable_cross_red) :
            ((is_billable) ? imgsrc_billable_grey : imgsrc_billable_cross_grey);

        el_changed.children[0].setAttribute("src", imgsrc);

        let id_dict = get_dict_value_by_key(itemdict, "id")
        let upload_dict = {"id": id_dict, "cat": {"value": cat_sum, "update": true}}

        UploadChanges(upload_dict, tr_changed);
    };

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
        if (is_inactive) {imgsrc = imgsrc_inactive} else {imgsrc = imgsrc_active}
        el_changed.children[0].setAttribute("src", imgsrc);

        UploadElChanged(el_changed)
    }  // HandleInactiveClicked

//=========  HandleCreateSchemeItem  ================ PR2019-03-16
    function HandleCreateSchemeItem() {
        //console.log("=== HandleCreateSchemeItem =========");

// ---  deselect all highlighted rows
       //DeselectHighlightedRows(tblRow, cls_selected);

//-- increase id_new
        id_new = id_new + 1
        const pk = "new_" + id_new.toString()
        // TODO check if this is correct
        const parent_pk = document.getElementById("id_scheme").value
        // console.log("pk", pk, "ppk", parent_pk);

// get rosterdate from previous tablerow or today
        let item_dict = {};
        item_dict["id"] = {"pk": pk, "ppk": parent_pk};

// get last tblRow
        let rosterdate, timeend, value;

        let rosterdate_dict = {};
        let timeend_dict = {};
        const len = tblBody_items.rows.length
        if (len > 0) {
            let tblRow = tblBody_items.rows[len -1];

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

        item_dict["id"] = {"pk": pk, "ppk": parent_pk, "create": true};
        item_dict["rosterdate"] = rosterdate_dict;
        if(!!timeend_dict){item_dict["timestart"] = timeend_dict}

        let tblRow = CreateTableRow("schemeitem", pk, parent_pk)

// Update TableRow
        // console.log("eitem_dict", item_dict);
        UpdateTableRow("schemeitem", tblRow, item_dict)
    }

//========= Upload_Scheme  ============= PR2019-06-06
    function Upload_Scheme(dtp_dict) {
        console.log("======== Upload_Scheme");
        console.log("dtp_dict: ", dtp_dict);
        // dtp_dict contains value of datetimepicker datefirst/last, overrides value of element
        // when clicked on delete datefirst/last: dtp_dict = {"datefirst": {"value": null}}
        // when value of datetimepicker has changed: datefirst: {value: "2019-05-02", o_value: "2019-05-28"}

        let upload_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(el_scheme_code);
        console.log("id_dict: ", id_dict);

// add id_dict to upload_dict
        if (!!id_dict){

// skip if parent_pk does not exist (then it is an empty scheme)
            if(!!id_dict["ppk"]){
                upload_dict["id"] = id_dict
                if(!!id_dict["pk"]){upload_dict["pk"] = id_dict["pk"]}

    // ---  loop through input elements of scheme
                const field_list = ["code", "cycle", "datefirst", "datelast", "pricerate"];
                for(let i = 0, fieldname, n_value, o_value, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
                    let el_input = document.getElementById("id_scheme_" + fieldname )
    // get n_value
                        // PR2019-03-17 debug: getAttribute("value");does not get the current value
                        // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                        // The 'value' property holds the current value (el_input.value).
                    n_value = null;
                    if (["code", "cycle", "pricerate"].indexOf( fieldname ) > -1){
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
        };  // if (!!id_dict){

        console.log("upload_dict", upload_dict);
        UploadChanges(upload_dict);

    };  // function Upload_Scheme

//========= UploadTimepickerChanged  ============= PR2019-10-12
    function UploadTimepickerChanged(tp_dict) {
        console.log("===> UploadTimepickerChanged");
        console.log("===> tp_dict", tp_dict);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict ) {upload_dict["quicksave"] = tp_dict["quicksave"]};
        upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};

        const tablename = "shift";
        const map_id = tablename + get_subdict_value_by_key(tp_dict, "id", "pk").toString()
        let tr_changed = document.getElementById(map_id)

        let parameters = {"upload": JSON.stringify (upload_dict)}
        console.log ("upload_dict", upload_dict);;

        const url_str = url_scheme_shift_team_upload;
        console.log ("url_str", url_str);

        let response;
        $.ajax({
            type: "POST",
            url: url_str,
            data: parameters,
            dataType:'json',
            success: function (response) {
                console.log ("response", response);
                if ("update_list" in response) {
                    let update_list = response["update_list"];
                    UpdateFromResponseNEW(tablename, update_list)
                }
                if ("schemeitem_list" in response) {
                    console.log( "schemeitem_list in response", response["schemeitem_list"]);
                    get_datamap(response["schemeitem_list"], schemeitem_map)
                    console.log( "schemeitem_map", schemeitem_map);
                    console.log( "selected_scheme_pk", selected_scheme_pk);
                    //FillTableRows("schemeitem", selected_scheme_pk)
                 }

            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });


 }  //UploadTimepickerChanged

//========= UploadElChanged  ============= PR2019-03-03
    function UploadElChanged(el_input) {
        console.log("--- UploadElChanged  --------------");
        //console.log("el_input", el_input);

        let upload_dict = {}, field_dict = {};
        let tr_changed = get_tablerow_selected(el_input)

// ---  create id_dict
        let id_dict = get_iddict_from_element(tr_changed);
        const tablename = get_dict_value_by_key(id_dict, "table")
        const is_create = get_dict_value_by_key(id_dict, "create")

// ---  get fieldname from 'el_input.data-field'
        const fieldname = get_attr_from_el(el_input, "data-field");

        const is_delete = (fieldname === "delete_row");
        //console.log("tablename: ", tablename,  "fieldname: ", fieldname,  "is_delete: ", is_delete);

// add id_dict to upload_dict
        if (!! tr_changed && !!id_dict){
// if delete: add 'delete' to id_dict and make tblRow red
            if(is_delete){
                id_dict["delete"] = true
                tr_changed.classList.add("tsa_tr_error");
            }
            upload_dict["id"] = id_dict;
// --- dont add fielddict when is_delete
            if(!is_delete){
                const ppk_int = get_attr_from_el_int(tr_changed, "data-ppk");
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

                if (tablename === "schemeitem") {
                    // parent of schemeitem, shift and team is: scheme
                    //console.log("ppk_int", ppk_int);
                    if (is_create) {
                        const el_rosterdate = tr_changed.cells[0].children[0];
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

                } else if (tablename === "shift") {
                    // parent of schemeitem, shift and team is: scheme
                    const ppk_int = get_attr_from_el_int(tr_changed, "data-ppk");
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
                } else if (tablename === "teammember") {
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
                }  // if (tablename === "schemeitem")

                upload_dict[fieldname] = field_dict;
            } // if(!is_delete){

            UploadChanges(upload_dict, tr_changed);
        }
    } // UploadElChanged(el_input)

//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type
    function UploadChanges(upload_dict, tr_changed) {
        console.log("=== UploadChanges");
        console.log("upload_dict", upload_dict);

        if(!!upload_dict) {
            const ppk_int = get_ppk_from_dict(upload_dict)
            const tablename = get_subdict_value_by_key(upload_dict, "id", "table")
            console.log("tablename: ", tablename );

            let url_str;
            if (tablename === "teammember") {
                url_str = url_teammember_upload
            } else if (["scheme", "shift"].indexOf( tablename ) > -1) {
                url_str = url_scheme_shift_team_upload
            } else if (tablename === "schemeitem") {
                url_str = url_schemeitem_upload
            }
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
                    //console.log( "response", response);
                    if ("schemeitem_list" in response) {
                        get_datamap(response["schemeitem_list"], schemeitem_map)
                        //FillTableRows("schemeitem", selected_scheme_pk)
                    }

                    if ("update_list" in response) {
                        let update_list = response["update_list"];
                        UpdateFromResponse(tablename, update_list)
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!row_upload)
    };  // UploadChanges

//========= UpdateFromResponse  ============= PR2019-10-16
    function UpdateFromResponse(tablename, update_list) {
        console.log(" --- UpdateFromResponse  ---");
        console.log(update_list);

        const len = update_list.length;
        if (len > 0) {
            for (let i = 0, len = update_list.length; i < len; i++) {
                let update_dict = update_list[i];
                if(!isEmpty(update_dict)){

            // get info from update_dict
                    let id_dict = get_dict_value_by_key(update_dict, "id")
                    const pk_int = get_dict_value_by_key(id_dict, "pk")
                    const ppk_int = get_dict_value_by_key(id_dict, "ppk")
                    if(!!pk_int){
                        const map_id = tablename + pk_int.toString();
                        console.log ("map_id", map_id);
            // lookup tablerow
                        let tr_changed = document.getElementById(map_id);

            // update or add update_dict in emplhour_map
                        if(tablename === "scheme"){
                            scheme_map.set(map_id, update_dict);
                            UpdateSchemeInputElements(update_dict);
                        } else if(tablename === "shift"){
                            shift_map.set(map_id, update_dict);
                            HighlichtSelectShift( pk_int)
                            UpdateTableRow(tablename, tr_changed, update_dict)
                        } else if(tablename === "team"){
                            team_map.set(map_id, update_dict);
                            UpdateTableRow(tablename, tr_changed, update_dict)
                        } else if(tablename === "schemeitem"){
                            schemeitem_map.set(map_id, update_dict);
                            UpdateTableRow(tablename, tr_changed, update_dict)
                        } else if(tablename === "teammmeber"){
                            teammmeber_map.set(map_id, update_dict);
                            UpdateTableRow(tablename, tr_changed, update_dict)
                        }

                        const is_created = get_subdict_value_by_key (update_dict, "id", "created", false)
                        console.log( "is_created =", is_created, typeof is_created);
                        if (!!is_created){
    // add new empty row
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_ppk_from_dict (update_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "temp_pk": pk_new}
                            console.log( "UploadChanges >>> add new empty row");
                            console.log( "new_dict[id]", new_dict["id"]);

                            if (tablename === "schemeitem"){
                                let rosterdate_dict = get_dict_value_by_key (update_dict, "rosterdate")
                    // remove 'updated' from dict, otherwise rosterdate in new row will become green also
                                delete rosterdate_dict["updated"];
                                // rosterdate_dict["update"] = true;

                                if(isEmpty(rosterdate_dict)){rosterdate_dict = today_dict}
                                new_dict["rosterdate"] = rosterdate_dict
                            } else  if (tablename === "teammember"){
                                const team_code = get_subdict_value_by_key (update_dict, "team", "value")
                                new_dict["team"] = {"pk": parent_pk, "value": team_code}
                            }
                            let tblRow = CreateTableRow(tablename, pk_new, parent_pk, {})
                            UpdateTableRow(tablename, tblRow, new_dict)
                        }  // if (!!is_created)


                    }  // if(!!pk_int)
                }  // if(!isEmpty(update_dict))
            }  // for (let i = 0, len = update_list.length; i < len; i++)
        }  // if (len > 0)
    };  // UpdateFromResponse

//========= UpdateSchemeitemOrTeammmember  =============
    function UpdateSchemeitemOrTeammmember(tblRow, update_dict){
        //console.log("=== UpdateSchemeitemOrTeammmember ===");
        //console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            const pk_int = get_pk_from_dict(update_dict);
            const ppk_int = get_ppk_from_dict(update_dict);
            //console.log("pk: ", pk, "ppk_int: ", ppk_int);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    let tblName = get_dict_value_by_key (id_dict, "table");
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
        }  // if (!!update_dict)
    }  // UpdateSchemeitemOrTeammmember

//========= FillScheme  ====================================
    function FillScheme(item_dict) {
        //console.log( "===== FillScheme  ========= ");
        //console.log("item_dict", item_dict)

        el_scheme_code.value = null;
        el_scheme_cycle.value = null;
        el_scheme_datefirst.value = null;
        el_scheme_datelast.value = null;

// fill scheme fields
        if (!!item_dict){
            const tablename = "scheme"
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
                   format_text_element (el_input, el_msg, field_dict, [-220, 60] )
                };



                //value = get_dict_value_by_key (field_dict, "value")
                //wdmy = get_dict_value_by_key (field_dict, "wdmy");

                //el.setAttribute("data-value", value)
                //el.setAttribute("data-o_value", value)
                //el.setAttribute("data-pk", pk_int )
                //el.setAttribute("data-ppk", ppk)
                //el.setAttribute("data-table", tablename)

                //if (fieldname === "code" || fieldname === "cycle"){
                //    if(!value){value = null} // otherwise you'll get  error: "undefined" is not a valid number
                //    el.value = value
                //} else if (fieldname === "datefirst" || fieldname === "datelast"){
                //    if (!!wdmy){
                //        el.value = wdmy;
                //        el.setAttribute("data-wdmy", wdmy)
                //    };
                //}
                //if (is_updated(field_dict)){ ShowOkClass(el)};
            }  // for(let i = 0, fieldname,
        };  // if (!!item_dict){
    }  //function FillScheme


//=========  HandleDatepickerChanged  ================ PR2019-06-22
    function HandleDatepickerChanged(e) {
        //console.log ("==== HandleDatepickerChanged ===" )
        //console.log (e.currentTarget )

        // target is the element that triggered the event (e.g., the user clicked on)
        // currentTarget is the element that the event listener is attached to.
        let el_input = e.currentTarget
        if (!!el_input) {
            const fieldname = get_attr_from_el(el_input, "data-field");
            if (!!fieldname) {
                let dtp_dict = {};
                let date_str = "";
                if(!!e.date){
                    const date_iso = e.date.format();
                    date_str = get_yyyymmdd_from_ISOstring(date_iso);
                }
                const o_value = el_input.getAttribute("data-o_value")
                let value_has_changed = (!!date_str && date_str !== o_value) || (!date_str && !!o_value)
                if (!!date_str) { dtp_dict[fieldname] = {"value": date_str};}
                if (value_has_changed){
                    Upload_Scheme(dtp_dict)
                }
            }  // if (!!fieldname)
        } // if (!!el_input) {
    }

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        //console.log("=========  function HandleFilterInactive =========");
// toggle value
        filter_hide_inactive = !filter_hide_inactive

// toggle icon
        let img_src;
        if(filter_hide_inactive) {img_src = imgsrc_active} else {img_src = imgsrc_inactive}
        el.firstChild.setAttribute("src", img_src);

        FilterTableRows(tblBody_scheme_select, "", 1, filter_hide_inactive)
    }  // function HandleFilterInactive


//=========  AddShift  ================ PR2019-08-08
    function AddShift(tblRow) {
        //console.log("========= AddShift ===" );
        //console.log(tblRow);
        let tblName = get_attr_from_el(tblRow, "data-table");
        //console.log(" tblName", tblName);

        let dict = {};
        if (!!tblRow){
            selected_shift_pk = 0
// ---  get pk from id of tblRow
            const pk_str = tblRow.getAttribute("data-pk");
            const ppk_int = parseInt(tblRow.getAttribute("data-ppk"));

// ---  create id_dict
            let id_dict = {}
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            id_dict["temp_pk"] = pk_str
            id_dict["ppk"] = ppk_int
            id_dict['table'] = tblName;
            //console.log(" id_dict", id_dict, typeof id_dict);

            HandleSelectShift(tblRow)


        }  //  if (!!tblRow)
    }


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
            if (!!id_dict){
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
            };  // if (!!id_dict){

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
                        FillSelectTable("scheme")
                    }
                    if ("shift_list" in response) {
                        get_datamap(response["shift_list"], shift_map)
                        FillSelectTable("shift")
                    }
                    if ("team_list" in response) {
                        get_datamap(response["team_list"], team_map)
                        FillSelectTable("team")
                    }
                    if ("schemeitem_list" in response) {
                        get_datamap(response["schemeitem_list"], schemeitem_map)
                    }
                    if ("teammember_list" in response){
                        get_datamap(response["teammember_list"], teammember_map)
                        // NIU FillDatalist("id_datalist_teammembers", teammember_map)
                    }
                    if ("scheme_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["scheme_update"])
                    };
                    if ("shift_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["shift_update"])
                    };
                    if ("team_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["team_update"])
                    };
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  // if (!!tblRow)
    }  // function UploadSchemeOrShiftOrTeam

//========= UpdateSchemeOrTeam  =============
    function UpdateSchemeOrTeam(tblName, tblRow, update_dict){
        console.log("=== UpdateSchemeOrTeam ===", tblName);
        console.log("update_dict: " , update_dict);
        console.log(tblRow.id); // tablerow is selecttablerow
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        const select_iddict = get_iddict_from_element(tblRow)
        const select_pk = get_dict_value_by_key(select_iddict, "pk")
        const select_ppk = get_dict_value_by_key(select_iddict, "ppk")
        console.log("select_pk: ", select_pk, "select_ppk: ", select_ppk);

        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            const pk = get_pk_from_dict(update_dict);
            const parent_pk = get_ppk_from_dict(update_dict);
            console.log("pk: ", pk, "parent_pk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- created record
                if ("created" in id_dict) {
                    tblRow.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRow.classList.remove("tsa_tr_ok");
                        FillSelectTable(tblName)
                        const row_id = tblName + pk.toString();
                        console.log("row_id: ", row_id);
                        let tblRowSelected = tblRow  //let tblRowSelected = document.getElementById(row_id)
                        console.log(tblRowSelected);

                        if (tblName ==="scheme"){
                            HandleSelectScheme(tblRowSelected)
                        } else if (tblName ==="shift"){
                            HandleSelectShift(tblRowSelected)
                        } else if (tblName ==="team"){
                            HandleSelectTeam(tblRowSelected)
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
        }  // if (!!update_dict)
    }  // UpdateSchemeOrTeam


//========= FillSelectOptionDict  ====================================
    function FillSelectOptionDict(el_select, data_map, select_text, select_text_none, ppk_str) {
        //console.log( "=== FillSelectOptionDict  ");

// ---  fill options of select box
        // NIU let curOption;
        let option_text = "";
        let row_count = 0
        let ppk_int = 0

        // customer list has no ppk_str
        if (!!ppk_str){ppk_int = parseInt(ppk_str)};

        el_select.innerText = null

//--- loop through option dict

// --- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_in_dict = get_ppk_from_dict(item_dict);
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "-");

    // skip if ppk_int exists and does not match ppk_in_dict
            if ((!!ppk_int && ppk_int === ppk_in_dict) || (!ppk_int)) {
                option_text += "<option value=\"" + pk_int + "\"";
                option_text += " data-ppk=\"" + ppk_in_dict + "\"";
                // NIU if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + code_value + "</option>";
                row_count += 1
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
        el_select.innerHTML = option_text;
        //console.log("row_count", row_count);
// if there is only 1 option: select first option
        if (select_first_option){
            el_select.selectedIndex = 0
        }
        //console.log("el_select.selectedIndex", el_select.selectedIndex);
    }  //function FillSelectOptionDict


//========= FillSelectOptions  ====================================
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

//========= FillSchemeItems  ====================================
    function FillSchemeItems(response) {
     //console.log( "===== FillSchemeItems  ========= ");
     //console.log( "response ", response);


        let curOption;
// ---  fill options of select box
        el_select.innerText = null
        let option_text = "";
        let parent_pk = 0
        let row_count = 0

        if (!!parent_pk_str){parent_pk = parseInt(parent_pk_str)};
         //console.log( "parent_pk ", parent_pk, typeof parent_pk );

        for (let i = 0, id, value, addrow, len = option_list.length; i < len; i++) {

        // skip if parent_pk does not match,
            addrow = false;
            if (!!parent_pk_str){
                parent_pk = parseInt(parent_pk_str);
                // addrow when parent_pk of order marches the id of customer
                addrow = (!!option_list[i]["ppk"] && option_list[i]["ppk"] === parent_pk)
            } else {
                // addrow if no parent_pk (is the case when filling customer_map)
                addrow = true
            }
            if (addrow) {
                id = option_list[i]["pk"]
                value = option_list[i]["value"]
                option_text += "<option value=\"" + id + "\"";
                option_text += " data-ppk=\"" + parent_pk + "\"";
                if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + value + "</option>";
                row_count += 1
            }
        }
        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;
    }

   //========= FillOptionShift  ============= PR2019-08-10
    function FillOptionShift(with_rest_abbrev) {
        //console.log( "===== FillOptionShift  ========= ");

// add empty option on first row
        let option_text = "<option value=\"0\" data-ppk=\"0\">-</option>";

// --- loop through shift_map
        for (const [map_id, item_dict] of shift_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_int = get_ppk_from_dict(item_dict);

// skip if selected_scheme_pk exists and does not match ppk_int
            if (!!selected_scheme_pk && ppk_int === selected_scheme_pk) {
                let value = get_subdict_value_by_key(item_dict, "code", "value", "-")
                if (with_rest_abbrev){
                    if (get_subdict_value_by_key(item_dict, "cat", "value") === 1) { value += " (R)"}
                }
                option_text += "<option value=\"" + pk_int + "\" data-ppk=\"" + ppk_int + "\">" + value + "</option>";
            }
        }  // for (let key in item_list)
        return option_text
    }  // FillOptionShift

   //========= FillOptionTeam  ============= PR2019-08-11
    function FillOptionTeam() {

// add empty option on first row
        let option_text = "<option value=\"0\" data-ppk=\"0\">-</option>";
// --- loop through team_map
        for (const [map_id, item_dict] of team_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_int = get_ppk_from_dict(item_dict);

// skip if selected_scheme_pk exists and does not match ppk_int
            if (!!selected_scheme_pk && ppk_int === selected_scheme_pk) {
                const value = get_subdict_value_by_key(item_dict, "code", "value", "-")
                option_text += "<option value=\"" + pk_int + "\"";
                option_text += " data-ppk=\"" + ppk_int + "\"";
                option_text +=  ">" + value + "</option>";
            }
        }
        return option_text
    }  // FillOptionTeam

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

//========= FillSelectTable  ============= PR2019-09-23
    function FillSelectTable(table_name, is_current_table, selected_row_pk) {
        console.log( "=== FillSelectTable ", table_name);

        let selected_parent_pk = 0
        let tableBody, data_map;
        let caption_one, caption_multiple ;
        let el_a;

        if (is_current_table == null){is_current_table = false}

        if (table_name === "scheme"){
            selected_parent_pk = selected_order_pk
            data_map = scheme_map
            tableBody = tblBody_scheme_select

            caption_one = get_attr_from_el(el_data, "data-txt_scheme");
            caption_multiple = get_attr_from_el(el_data, "data-txt_select_scheme") + ":";

            tblBody_scheme_select.innerText = null;
            // always delete innerText of tblBody_shift_select and of tblBody_team_select
            tblBody_shift_select.innerText = null;
            tblBody_team_select.innerText = null;
            document.getElementById("id_thead_team_select").innerText = null;

        } else if (table_name === "shift"){
            selected_parent_pk = selected_scheme_pk
            data_map = shift_map
            tableBody = tblBody_shift_select
            tableBody.innerText = null;

            caption_one = get_attr_from_el(el_data, "data-txt_shifts") + ":";
            caption_multiple = caption_one

        } else  if (table_name === "team"){
            selected_parent_pk = selected_scheme_pk
            data_map = team_map
            tableBody = tblBody_team_select
            tableBody.innerText = null;

            caption_one = get_attr_from_el(el_data, "data-txt_employees") + ":";
            caption_multiple = caption_one
        }

        let row_count = 0

// --- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict);
            const ppk_int = get_ppk_from_dict(item_dict);
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "");

//--- only show items of selected_parent_pk
            if (ppk_int === selected_parent_pk){
//--------- insert tableBody row
                let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                const map_id = table_name + pk_int.toString();
                tblRow.setAttribute("id", "sel_" + map_id);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-mapid", map_id);
                //tblRow.setAttribute("data-value", code_value);
                //tblRow.setAttribute("data-table", table_name);

//- set background color of table and selected row
                if(is_current_table) {
                    if (selected_row_pk === pk_int){
                        tblRow.classList.add(cls_bc_yellow);
                    } else {
                        tblRow.classList.add(cls_bc_yellow_lightlight);
                    }
                } else {
                    tblRow.classList.add(cls_bc_lightlightgrey);
                };

//- add hover to select row
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

// --- add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);

                let inner_text = code_value
                if (table_name === "shift"){
                    const is_restshift = get_subdict_value_by_key(item_dict, "isrestshift", "value", false)
                    if (is_restshift) { inner_text += " (R)"}
                }
                if (table_name === "team"){
                    const team_title = get_subdict_value_by_key(item_dict, "code", "title")
                    if(!!team_title){
                        inner_text += " +"
                        td.title = team_title
                    }
                }

                el_a = document.createElement("div");
                    el_a.innerText = inner_text;
                    el_a.setAttribute("data-field", "code");
                    el_a.setAttribute("data-value", code_value);
                td.appendChild(el_a);
                td.classList.add("px-2")

                if (table_name === "scheme"){
                    tblRow.addEventListener("click", function() {HandleSelectScheme(tblRow)}, false )
                } else if (table_name === "shift"){
                    td.addEventListener("click", function() {HandleSelectShift(tblRow)}, false )
                } else if (table_name === "team"){
                    td.addEventListener("click", function() {HandleSelectTeam(tblRow)}, false )
                }

// --- add active img to second td in table
                td = tblRow.insertCell(-1);
                    el_a = document.createElement("a");
                    el_a.addEventListener("click", function() {
                        // TODO mod confirm
                        UploadSchemeOrShiftOrTeam(tblRow, "inactive")}, false )
                    el_a.setAttribute("href", "#");
                    const field_name = "inactive", key_name = "value" ;
                    const inactive_value = get_subdict_value_by_key(item_dict, field_name, key_name, false)
                    el_a.setAttribute("data-field", field_name)
                    el_a.setAttribute("data-value",get_subdict_value_by_key(item_dict, field_name, key_name, false))

                    const imgsrc = (inactive_value) ? imgsrc_inactive : imgsrc_active_lightgrey;
                    AppendChildIcon(el_a, imgsrc);
                td.appendChild(el_a);
                td.classList.add("td_width_032")

// --- count tblRow
                row_count += 1
            } //  if (ppk_int === selected_order_pk)
        } // for (const [pk_int, item_dict] of data_map.entries())

// ++++++ add addnew row  ++++++
    // skip add shift when there are already shifts
    if (row_count === 0 || table_name !== "shift"){

    //-- increase id_new
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()
    //--------- insert tableBody row
        let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "sel_" + table_name + "_" + pk_new);
        tblRow.setAttribute("data-pk", pk_new);
        tblRow.setAttribute("data-ppk", selected_parent_pk)
        tblRow.setAttribute("data-table", table_name);

        tblRow.classList.add("tsa_bc_lightlightgrey");
    //- add hover to tableBody row
        // don't add hover to row 'Add scheme/Team'
        //- add hover to inactive button
        tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
        tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

    // --- add first td to tblRow.
        // index -1 results in that the new cell will be inserted at the last position.
        let td = tblRow.insertCell(-1);
        el_a = document.createElement("div");
    // --- add EventListener to input element, add innerText
            if (table_name === "scheme"){
                el_a.innerText = get_attr_from_el(el_data, "data-txt_scheme_add") + "..."
                el_a.addEventListener("click", function() {ModSchemeOpen()}, false )
            } else if (table_name === "shift"){
                el_a.innerText = get_attr_from_el(el_data, "data-txt_shift_add") + "..."
                el_a.addEventListener("click", function() {AddShift(tblRow)}, false )
            } else if (table_name === "team"){
                el_a.innerText = get_attr_from_el(el_data, "data-txt_employee_add") + "..."
                el_a.addEventListener("click", function() {ModEmployeeOpen(tblRow)}, false )
            };
            el_a.classList.add("tsa_color_darkgrey");
        td.appendChild(el_a);
        td.setAttribute("colspan", "2");

    } // if (row_count === 0 || table_name !== "shift")

// ++++++ add tHeadRow  ++++++
    // get selecttable 'scheme' or 'team'
        let tbl = tableBody.parentNode

    // skip when tHeadRow already exists (!!tbl.tHead now working, is always true)
        const tHead_exists = (!!tbl.tHead.innerText)
        if (!tHead_exists) {
            let tHeadRow = tbl.tHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            let th = document.createElement('th');
            if (row_count === 1){
                th.innerHTML = caption_one
            } else {
                th.innerHTML = caption_multiple;
            }
            tHeadRow.appendChild(th);

            // --- add active img to second td in team table
            let th_img = document.createElement('th');
                el_a = document.createElement("a");
                    el_a.setAttribute("href", "#");
                    el_a.addEventListener("click", function() {HandleFilterInactive(el_a)}, false )
                    AppendChildIcon(el_a, imgsrc_active);
                th_img.appendChild(el_a);
            th_img.classList.add("td_width_032")
            tHeadRow.appendChild(th_img);
        }  // if(!tHead_exists) {
    } // FillSelectTable

//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader(tblName) {
        console.log("===  CreateTableHeader == ", tblName);
        tblHead_items.innerText = null
        let tblRow = tblHead_items.insertRow (-1);  // index -1: insert new cell at last position.

//--- insert td's to tblHead_items
        let column_count = tbl_col_count[tblName];

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add width to th
            th.classList.add("td_width_" + field_width[tblName][j])

// --- add div to th, margin not workign with th
            let el = document.createElement("div");
            th.appendChild(el)

// --- add img t
            if (j === column_count - 1){
                AppendChildIcon(el, imgsrc_delete);
                el.classList.add("ml-2")

            } else if (tblName === "shift" && j === 1) {
                AppendChildIcon(el, imgsrc_rest_black)
                el.classList.add("ml-4")
                el.title = get_attr_from_el(el_data, "data-txt_shift_rest")
            } else if ((tblName === "schemeitem" && j === 7) || (tblName === "shift" && j === 6)) {
                AppendChildIcon(el, imgsrc_billable_black)
                el.classList.add("ml-4")
                el.title = get_attr_from_el(el_data, "data-txt_billable")
            } else if (tblName === "schemeitem" && j === 8) {
                AppendChildIcon(el, imgsrc_inactive);
                el.classList.add("ml-2")
            } else {
// --- add caption to el, keep last th empty (delete column) and second last one (billable column)
                let data_txt = get_attr_from_el(el_data, "data-" + thead_text[tblName][j]);
                if(!!data_txt){el.innerText = data_txt}
                // TODO break-word not working
                el.setAttribute("overflow-wrap", "break-word");

            }
// --- add textalign to el
            if (field_right_align[tblName].indexOf(j) > -1){el.classList.add("text_align_right")} else
            if (field_center_align[tblName].indexOf(j) > -1){el.classList.add("text_align_center")}
            else {el.classList.add("text_align_left")};

        }  // for (let j = 0; j < column_count; j++)

        if (tblName === "schemeitem"){CreateTableHeaderFilter(tblName)}

    };  //function CreateTableHeader

//=========  CreateTableHeaderFilter  ================ PR2019-09-15
    function CreateTableHeaderFilter(tblName) {
        //console.log("=========  function CreateTableFilter =========");

        let thead_items = document.getElementById("id_thead_items");
// only for table 'schemeitem'
//+++ insert tblRow ino thead_items
        let tblRow = thead_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "id_thead_filter");
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        const column_count = 10;
        for (let j = 0, td, el; j < column_count; j++) {
// insert td ino tblRow
            td = tblRow.insertCell(-1);
// create element
            let el_tag = ([7, 8, 9].indexOf( j ) > -1) ? "a" : "input"
            el = document.createElement(el_tag);
// add fieldname
            el.setAttribute("data-field", field_names[tblName][j])
// --- add img imgsrc_inactive
            if (j === 7){
                //el = document.createElement("a");
                //el.setAttribute("href", "#");
                //AppendChildIcon(el, imgsrc_billable_black, "18");
                //el.classList.add("ml-2")
            } else if ([8,].indexOf( j ) > -1){
                //el = document.createElement("a");
                //el.setAttribute("href", "#");
                //AppendChildIcon(el, imgsrc_inactive, "18");
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
            if (field_right_align[tblName].indexOf(j) > -1){el.classList.add("text_align_right")} else
            if (field_center_align[tblName].indexOf(j) > -1){el.classList.add("text_align_center")}
            else {el.classList.add("text_align_left")};

        }  // for (let j = 0;
    };  //function CreateTableHeaderFilter

//========= FillTableRows  ====================================
    function FillTableRows(tblName, selected_ppk_int) {
        //console.log( "===== FillTableRows  ========= ", tblName, selected_ppk_int);

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let data_map, selected_item_pk
        if (tblName === "shift"){
            data_map = shift_map;
            selected_item_pk = selected_shift_pk
        } else if (tblName === "teammember"){
            data_map = teammember_map;
        } else if (tblName === "schemeitem"){
            data_map = schemeitem_map;
        };
        //console.log( "data_map", data_map);

        let rosterdate_dict = {};
        let tblRow;
        let row_count = 0;

        if (!!selected_ppk_int){

// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_int = get_ppk_from_dict(item_dict);

// --- add item if ppk_int = selected_ppk_int (list contains items of all parents)
                if (!!ppk_int && ppk_int === selected_ppk_int){
                    tblRow = CreateTableRow(tblName, pk_int, selected_ppk_int)
                    UpdateTableRow(tblName, tblRow, item_dict)

// --- get rosterdate to be used in addnew row
                    rosterdate_dict =  get_dict_value_by_key(item_dict, 'rosterdate')
                    row_count += 1;
// --- highlight selected row
                    if (pk_int === selected_item_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }

            }  // for (const [pk_int, item_dict] of data_map.entries())
        }  // if (!!len)

// +++ add row 'add new' +++
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "ppk": selected_ppk_int, "temp_pk": pk_new}

        if (tblName === "schemeitem"){
            if(isEmpty(rosterdate_dict)){ rosterdate_dict = today_dict};
            dict["rosterdate"] = rosterdate_dict;
            tblRow = CreateTableRow(tblName, pk_new, selected_ppk_int)
            UpdateTableRow(tblName, tblRow, dict)

        } else if (tblName === "shift"){
            dict["scheme"] = {"pk": selected_ppk_int}
            tblRow = CreateTableRow(tblName, pk_new, selected_ppk_int)
            UpdateTableRow(tblName, tblRow, dict)

        } else if (tblName === "teammember"){
        // TODO to be corrected
            dict["team"] = {"pk": selected_ppk_int, "value": "team_code"}
            tblRow = CreateTableRow(tblName, pk_new, selected_ppk_int, row_count)
            UpdateTableRow(tblName, tblRow, dict)
        };
    }  // FillTableRows

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow(tblName, pk_int, ppk_int, row_count, row_index, is_new_item) {
        console.log("=========  function CreateTableRow =========");
        console.log("pk_int", pk_int, "ppk", ppk_int );

        const map_id = tblName + pk_int.toString();
        console.log("map_id", map_id );

// --- check if row is addnew row - when pk is NaN
// check if row is addnew row - when pk is NaN
        if(!parseInt(pk_int)){is_new_item = true};
        ("is_new_item", is_new_item);;

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-map_id", map_id );
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow (add EventListener to element will be done further).
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count = tbl_col_count[tblName];

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// --- add input element to td.
            // create element with tag from field_tags
            const tag_name = field_tags[tblName][j];
            let el = document.createElement(tag_name);
            td.appendChild(el);

// add id to each input element
            idx += 1;
            //el.setAttribute("id", "idx" + idx.toString());

            // last td is delete button
            if (j === column_count - 1){
            // --- first add <a> element with EventListener to td
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {UploadElChanged(el)}, false )
                AppendChildIcon(el, imgsrc_delete)
                el.classList.add("ml-2")

            } else if ( (tblName === "schemeitem" && j === 7) || (tblName === "shift" && j === 6)){
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {HandleBillableClicked(el, tblName);}, false )
                AppendChildIcon(el, imgsrc_stat00)
                el.classList.add("ml-4")
            } else if ( tblName === "shift" && j === 1){
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {HandleRestshiftClicked(el, tblName);}, false )
                AppendChildIcon(el, imgsrc_stat00)
                el.classList.add("ml-4")
            } else if (tblName === "schemeitem" && j === 8){
            // --- first add <a> element with EventListener to td inactive
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {HandleInactiveClicked(el);}, false )
                AppendChildIcon(el, imgsrc_stat00)
                el.classList.add("ml-2")
                td.appendChild(el);
            } else {
                el.setAttribute("type", "text");
            }

// --- add data-name Attribute.
            el.setAttribute("data-field", field_names[tblName][j]);

// --- add placeholder
            if (is_new_item ){
                let data_txt, placeholder_txt;
                if (tblName === "schemeitem" && j === 1){data_txt = "data-txt_shift_add" } else
                if (tblName === "shift" && j === 0){data_txt = "data-txt_shift_add"} else
                if (tblName === "teammember" && j === 0){
                   data_txt = (row_count === 0) ? "data-txt_employee_select" : "data-txt_employee_replacement_add"
                }
                const placeholder = get_attr_from_el(el_data, data_txt) ;
                if(!!placeholder){el.setAttribute("placeholder", placeholder +  "...")}
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
                if ([0, 1, 5].indexOf( j ) > -1){
                     el.addEventListener("change", function() {UploadElChanged(el);}, false)
                } else if ([2, 3, 4].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandleTimepickerOpen(el)}, false)};
            } else if (tblName === "teammember"){
                if ( j === 0){
                    el.addEventListener("change", function() {UploadElChanged(el);}, false)} else
                if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)};
            }

// --- add datalist_ to td shift, team, employee
            if (tblName === "schemeitem"){
                if (j === 1) {
                    el.innerHTML = FillOptionShift(true)
                } else if (j === 2) {
                    el.innerHTML = FillOptionTeam()
                }
            } else if (tblName === "teammember"){
                if (j === 0) {
                    el.setAttribute("list", "id_datalist_" + field_names[tblName][j] + "s")}
            }

// --- add textalign to el
            if (field_right_align[tblName].indexOf(j) > -1){el.classList.add("text_align_right")} else
            if (field_center_align[tblName].indexOf(j) > -1){el.classList.add("text_align_center")}
            else {el.classList.add("text_align_left")};

// --- add width to fields
            el.classList.add("td_width_" + field_width[tblName][j])

// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
            //el.classList.add("tsa_transparent");
            //el.classList.add("tsa_bc_transparent");
            if ( tblName === "schemeitem"){
                if (j === 0) { el.classList.add("input_popup_date")} else
                if ([3, 4].indexOf( j ) > -1){ el.classList.add("input_timepicker")}
                //if ([5, 6].indexOf( j ) > -1){  el.classList.add("input_popup_date") }
                else { el.classList.add("input_text"); }; // makes background transparent
            } else if ( tblName === "shift"){
                if ([0, 5].indexOf( j ) > -1) { el.classList.add("input_text")} else  // makes background transparent
                if ([2, 3, 4].indexOf( j ) > -1){ el.classList.add("input_timepicker")}
            } else if ( tblName === "teammember"){
                if (j === 0) { el.classList.add("input_text")} else  // makes background transparent
                if ([1, 2].indexOf( j ) > -1){
                    el.classList.add("input_popup_date");
                    el.classList.add("tsa_transparent");
                    }
            };
    // --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };  // function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tablename, tblRow, item_dict){
        console.log("--- UpdateTableRow  --------------", tablename);
        console.log("item_dict", item_dict);
        console.log("tblRow", tblRow);

        if (!!item_dict && !!tblRow) {
            const id_dict = get_dict_value_by_key (item_dict, "id");
            const is_created = ("created" in id_dict) ? true : false;
            const is_deleted = ("deleted" in id_dict) ? true : false;
            const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
            const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
            const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
            const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

            const map_id = tablename + pk_int.toString();
            console.log ("map_id", map_id);


            console.log("is_created", is_created);

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);

// --- show error message of row
            } else if (!!msg_err){
                let td = tblRow.cells[2];
                let el_input = tblRow.cells[2].firstChild
                el_input.classList.add("border_bg_invalid");
                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                let id_attr = get_attr_from_el(tblRow, "id")
                //console.log("id_attr", id_attr, "temp_pk_str", temp_pk_str);
            // check if item_dict.id 'new_1' is same as tablerow.id
                if((tablename + temp_pk_str) === id_attr){
            // update tablerow.id from temp_pk_str to id_pk
                    tblRow.setAttribute("id", pk_int);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", pk_int)
            // remove placeholder from element 'code
                    tblRow.cells[0].children[0].removeAttribute("placeholder");
                    tblRow.cells[1].children[0].removeAttribute("placeholder");
            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow )
                }
            };  // if (is_deleted){

            // tblRow can be deleted in  if (is_deleted){
            if (!!tblRow){
                const is_inactive = get_subdict_value_by_key (item_dict, "inactive", "value", false);
                tblRow.setAttribute("data-inactive", is_inactive)
// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    let td = tblRow.cells[i];
                    let el_input = td.children[0];
                    if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
                        UpdateField(el_input, item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)
        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow


//========= UpdateField  =============
    function UpdateField(el_input, item_dict){
        //console.log("--- UpdateField  --------------");
        if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
            const fieldname = get_attr_from_el(el_input, "data-field");

            if (fieldname in item_dict){
                const field_dict = get_dict_value_by_key (item_dict, fieldname);

                const value = get_dict_value_by_key (field_dict, "value");
                let pk_int = parseInt(get_dict_value_by_key (field_dict, "pk"))
                if(!pk_int){pk_int = 0}

                if (fieldname === "rosterdate"){
                    //const hide_weekday = false, hide_year = true;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, false, true)
                } else if (["code"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict, [-240, 200])
                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                    //console.log("fieldname", fieldname);
                    //console.log("field_dict", field_dict);
                    const hide_weekday = false, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                } else if (fieldname === "isrestshift"){
                    format_restshift_element (el_input, field_dict,
                        imgsrc_rest_black, imgsrc_stat00, title_restshift)
                } else if (fieldname === "pricerate"){
                    format_price_element (el_input, el_msg, field_dict, [-240, 200], user_lang)
                } else if (fieldname === "billable"){
                    format_billable_element (el_input, field_dict,
                        imgsrc_billable_black, imgsrc_billable_cross_red,
                        imgsrc_billable_grey, imgsrc_billable_cross_grey,
                        title_billable, title_notbillable,)
                } else if (fieldname === "employee"){
                    // temporary, till select box replces bij modselecvct employee
                    let tblRow = get_tablerow_selected(el_input)
                    const tablename = get_attr_from_el(tblRow, "data-table");
                    if(tablename === "teammember"){
                        const code = get_dict_value_by_key(field_dict, "code")
                        el_input.value = code
                        el_input.setAttribute("data-value", code);
                        el_input.setAttribute("data-pk", pk_int);
                    } else {
                    // TODO change 'value' in item_dicts into 'code', like in teammember
                        if(!!value){
                            el_input.value = value
                            el_input.setAttribute("data-value", value);
                            el_input.setAttribute("data-pk", pk_int);
                        } else {
                            el_input.value = null;
                            el_input.removeAttribute("data-value");
                            el_input.removeAttribute("data-pk");
                        }
                    }
                } else if (["shift", "team"].indexOf( fieldname ) > -1){
                    el_input.value = pk_int
                    el_input.setAttribute("data-value", value);
                    el_input.setAttribute("data-pk", pk_int);
                } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                    format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list)
                } else if (["offsetstart", "offsetend", "breakduration"].indexOf( fieldname ) > -1){
                    const blank_when_zero = (fieldname === "breakduration") ? true : false;
                    format_offset_element (el_input, el_msg, fieldname, field_dict, [-220, 80], timeformat, user_lang, title_prev, title_next, blank_when_zero)
                } else if ([ "timeduration"].indexOf( fieldname ) > -1){
                    format_duration_element (el_input, el_msg, field_dict, user_lang)

                } else if (fieldname === "inactive") {
                   if(isEmpty(field_dict)){field_dict = {value: false}}
                   format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active)
                };
            }  // if (fieldname in item_dict)
        };  // if(!!el_input)

    }


//=========  ResetSchemeInputElements  ================ PR2019-10-01
    function ResetSchemeInputElements() {
        const el_list = ["id_scheme_code", "id_scheme_cycle", "id_scheme_datefirst",
                    "id_scheme_datelast", "id_scheme_pricerate", "id_scheme_billable"];
        for(let i = 0, el, len = el_list.length; i < len; i++){
            el = document.getElementById(el_list[i]);

            if( el_list[i] === "id_scheme_billable"){
                el.children[0].setAttribute("src", imgsrc_stat00);
                el.removeAttribute("href")
            } else {

                el.value = null;
                el.readOnly = true;
                el.removeAttribute("data-pk");
                el.removeAttribute("data-ppk");
                if(el_list[i] === "id_scheme_pricerate"){
                    el.classList.remove("tsa_color_mediumgrey")
                }
            }
        }
    }

//=========  UpdateSchemeInputElements  ================ PR2019-08-07
    function UpdateSchemeInputElements(item_dict) {
        console.log( "===== UpdateSchemeInputElements  ========= ");
        console.log(item_dict);

        ResetSchemeInputElements()

        if(!!item_dict) {
// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
            const msg_err = get_dict_value_by_key (item_dict, "error");

            //console.log("id_dict", id_dict);

// --- error
            if (!!msg_err){
                ShowMsgError(el_scheme_code, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                let el_scheme_box = document.getElementById("id_scheme_box")
                ShowOkClass(el_scheme_box )
            }

            const pk_int = get_pk_from_dict(item_dict)
            const ppk_int = get_ppk_from_dict(item_dict);

            //console.log("pk_int", pk_int, "ppk_int", ppk_int);

            if(!!pk_int){
                selected_scheme_pk = pk_int

                const tablename = "scheme"
                const field_list = ["code", "cycle", "datefirst", "datelast", "pricerate", "billable"];
                for(let i = 0, el, field_dict, fieldname, value, wdmy, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
                    // console.log("fieldname", fieldname)
                    if (fieldname === "code"){el = el_scheme_code} else
                    if (fieldname === "cycle"){el = el_scheme_cycle} else
                    if (fieldname === "datefirst"){el = el_scheme_datefirst} else
                    if (fieldname === "datelast"){el = el_scheme_datelast} else
                    if (fieldname === "pricerate"){el = el_scheme_pricerate} else
                    if (fieldname === "billable"){el = el_scheme_billable};

                    field_dict = get_dict_value_by_key (item_dict, fieldname)
                    //console.log("field_dict", fieldname,  field_dict)

                    value = get_dict_value_by_key (field_dict, "value")

                    el.setAttribute("data-value", value)
                    el.setAttribute("data-field", fieldname)
                    el.setAttribute("data-pk", pk_int )
                    el.setAttribute("data-ppk", ppk_int)
                    el.setAttribute("data-table", tablename)

                    if (["code", "cycle"].indexOf( fieldname ) > -1){
                        format_text_element (el, el_msg, field_dict, [-220, 60])
                    } else if (fieldname === "datefirst" || fieldname === "datelast"){
                        let el_input = document.getElementById("id_scheme_" + fieldname)
                        const hide_weekday = true, hide_year = false;
                        format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                            user_lang, comp_timezone, hide_weekday, hide_year)
                    } else if (fieldname === "pricerate"){
                        format_price_element (el, el_msg, field_dict, [-220, 60], user_lang)
                    } else if (fieldname === "billable"){
                            format_billable_element (el, field_dict,
                                imgsrc_billable_black, imgsrc_billable_cross_red,
                                imgsrc_billable_grey, imgsrc_billable_cross_grey,
                            title_billable, title_notbillable, false)
                    }
                    el.readOnly = false;
                }  // for(let i = 0, fieldname,

            }  // if(!!pk_int){
        } // if(!!tr_clicked)
    }  // function UpdateSchemeInputElements

// +++++++++  HandleAutofillDayupDown  ++++++++++++++++++++++++++++++ PR2019-03-16 PR2019-06-14
    function HandleAutofillDayupDown(param_name) {
        //console.log("=== HandleAutofillDayupDown =========", param_name);
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
                        FillTableRows("schemeitem", selected_scheme_pk)
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
    } // function HandleAutofillDayupDown


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponseNEW  ================ PR2019-10-14
    function UpdateFromResponseNEW(tablename, update_list) {
        console.log(" --- UpdateFromResponseNEW  ---", tablename);
        console.log(update_list);

        const len = update_list.length;
        if (len > 0) {
            for (let i = 0, len = update_list.length; i < len; i++) {
                let update_dict = update_list[i];
                if(!isEmpty(update_dict)){

            // get info from update_dict
                    let id_dict = get_dict_value_by_key(update_dict, "id")
                    const pk_int = get_dict_value_by_key(id_dict, "pk")
                    const ppk_int = get_dict_value_by_key(id_dict, "ppk")
                    if(!!pk_int){
                        const map_id = tablename + pk_int.toString();
                        console.log ("map_id", map_id);

            // update or add update_dict in emplhour_map
                        if(tablename === "scheme"){scheme_map.set(map_id, update_dict)} else
                        if(tablename === "shift"){shift_map.set(map_id, update_dict)} else
                        if(tablename === "team"){team_map.set(map_id, update_dict)} else
                        if(tablename === "schemeitem"){schemeitem_map.set(map_id, update_dict)} else
                        if(tablename === "teammmeber"){
                            teammmeber_map.set(map_id, update_dict)
                        }

            // lookup tablerow
                        let tblRow = document.getElementById(map_id);

             // add new tblRow row if it does not exist
                        if(!tblRow){
             // get row_index
                            let row_index = get_dict_value_by_key(id_dict, "rowindex")
                            if(!row_index){row_index = 0}
                            row_index -= 1 // subtract 1 because of filter row (I think)

             // add new tablerow if it does not exist
                            // row_index = -1 (add after existing row), is_new_item = true
                            tblRow = CreateTableRow(pk_int, ppk_int, row_index, true)
                        }
            // update tablerow
                        UpdateTableRow(tablename, tblRow, update_dict)
                    }  // if(!!pk_int)
                }  // if(!isEmpty(update_dict))
            }  // for (let i = 0, len = update_list.length; i < len; i++)
        }  // if (len > 0)

    }  // UpdateFromResponseNEW






//=========  ModConfirmDeleteOpen  ================ PR2019-09-15
    function ModConfirmDeleteOpen(mode, tr_clicked) {
        console.log(" -----  ModConfirmDeleteOpen   ----")

// get tblRow_id, pk and ppk from tr_clicked; put values in el_mod_employee_body
        let el_mod_confdel_body = document.getElementById("id_mod_confdel_body")
        el_mod_confdel_body.setAttribute("data-mode", mode);

        //if(!!tr_clicked){
            //el_mod_confdel_body.setAttribute("data-tblrowid", tr_clicked.id);
            //el_mod_confdel_body.setAttribute("data-table", get_attr_from_el(tr_clicked, "data-table"));
            //el_mod_confdel_body.setAttribute("data-pk", get_attr_from_el(tr_clicked, "data-pk"));
           // el_mod_confdel_body.setAttribute("data-ppk", get_attr_from_el(tr_clicked, "data-ppk"));
        //}

// get employee name from el_empl_code
        const header_txt = get_attr_from_el_str(el_data, "data-msg_confdel_si_hdr"); // 'Delete scheme shifts'
        console.log("header_txt", header_txt)
        if(!!header_txt){document.getElementById("id_confdel_header").innerText = header_txt};

        const msg01_txt = get_attr_from_el_str(el_data, "data-msg_confdel_si_01");
        console.log("msg01_txt", msg01_txt)
        if(!!msg01_txt){document.getElementById("id_confdel_msg01").innerText = msg01_txt}; // 'All shifts of this scheme will be deleted.'

// ---  show modal
        $("#id_mod_confdel").modal({backdrop: true});

    };  // ModConfirmDeleteOpen


//=========  ModConfirmDeleteSave  ================ PR2019-09-20
    function ModConfirmDeleteSave() {
        console.log("========= ModConfirmDeleteSave ===" );

        const mode = document.getElementById("id_mod_confdel_body").getAttribute("data-mode")
        console.log("mode" , mode);
        if(mode === "schemeitems"){HandleAutofillDayupDown("delete")};
// ---  hide modal
        $('#id_mod_confdel').modal('hide');
    } // ModConfirmDeleteSave



// ++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModEmployeeOpen  ================ PR2019-08-23
    function ModEmployeeOpen(sel_tr_selected) {
        console.log(" -----  ModEmployeeOpen   ----")
        console.log(sel_tr_selected)

// get eplh_pk and eplh_ppk from sel_tr_selected
        const data_table = get_attr_from_el(sel_tr_selected, "data-table")
        const team_pk_str = get_attr_from_el(sel_tr_selected, "data-pk")
        const team_ppk_str = get_attr_from_el(sel_tr_selected, "data-ppk");
        console.log("data_table", data_table, "team_pk_str", team_pk_str, "team_ppk_str", team_ppk_str)

// put values in el_mod_employee_body
        let el_mod_employee_body = document.getElementById("id_mod_employee_body")
        el_mod_employee_body.setAttribute("data-table", data_table);
        el_mod_employee_body.setAttribute("data-team_pk", team_pk_str);
        el_mod_employee_body.setAttribute("data-team_ppk", team_ppk_str);

        let header_text;
        const value = get_attr_from_el(sel_tr_selected, "data-value")
        if (!!value) {
            header_text = value
        } else {
            header_text = get_attr_from_el(el_data, "data-txt_employee_add") + ":";
            // el_mod_employee_body_right.classList.add(cls_hide)
        }

        ModEmployeeFillSelectTableEmployee()
        document.getElementById("id_mod_employee_header").innerText = header_text
        el_mod_employee_filter_employee.value = null

        // Timeout funntion necessary, otherwise focus wont work because of fade(300)

        setTimeout(function (){
            el_mod_employee_filter_employee.focus()
        }, 500);

// ---  show modal
        $("#id_mod_employee").modal({backdrop: true});


    };  // ModEmployeeOpen


//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        console.log( "===== ModEmployeeSelect ========= ");
        //console.log( tblRow);
    // ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)
    // ---  get clicked tablerow
        if(!!tblRow) {
    // ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            ModEmployeeSave(tblRow);
        }
    }  // ModEmployeeSelect

//=========  ModEmployeeSave  ================ PR2019-08-08
    function ModEmployeeSave(tblRow) {
        console.log("========= ModEmployeeSave ===" );

   // ---  get team_pk and team_ppk from el_mod_employee_body
        let el_mod_employee_body = document.getElementById("id_mod_employee_body")
            const team_pk_str = get_attr_from_el(el_mod_employee_body, "data-team_pk");
            const team_ppk_int = get_attr_from_el_int(el_mod_employee_body, "data-team_ppk");

    // ---  get pk from id of select_tblRow
        const pk_int = parseInt(tblRow.id)
        const ppk_int = get_attr_from_el_int(tblRow, "data-ppk")
        const value = get_attr_from_el(tblRow, "data-value");
        console.log(" pk_int", pk_int, " ppk_int", ppk_int, " value", value);

        if (!!pk_int){
// ---  put employee_code in team_code
            let item_dict = {"id": {"table": "team", "temp_pk": team_pk_str, "ppk": team_ppk_int, "create": true},
                    "code":  {"field": "code", "value": value, "update": true},
                    "employee": {"table": "employee", "pk": pk_int, "ppk": ppk_int, "value": value, "update": true}
                }

// ---  hide modal
             $("#id_mod_employee").modal("hide");

            UploadTeam(item_dict)

        }  //  if (!!pk_str)
    } // ModEmployeeSave

//=========  UploadTeam  ================ PR2019-08-23
    function UploadTeam(upload_dict) {
        console.log("========= UploadTeam ===" );

        if (!!upload_dict){

            const ppk_int = get_ppk_from_dict(upload_dict)
            const tablename = get_subdict_value_by_key(upload_dict, "id", "table")
            console.log("tablename: ", tablename );

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
                        let update_list = response["update_list"];
                        UpdateFromResponseNEW(tablename, update_list)
                    }


                    if ("team_list" in response){
                        get_datamap(response["team_list"], team_map)
                        FillSelectTable("team")
                    }
                    if ("teammember_list" in response){
                        get_datamap(response["teammember_list"], teammember_map)
                        // NIU FillDatalist("id_datalist_teammembers", teammember_map)
                    }
                    if ("team_update" in response){
                        const team_update = response["team_update"]
                        if ("id" in team_update){
                            const id_dict = team_update["id"]
                            console.log("team_update id_dict", id_dict)
                            selected_team_pk = get_dict_value_by_key(team_update, "pk")

                            let tblRowSelected = document.getElementById("sel_team_" + selected_team_pk.toString())
                            HandleSelectTeam(tblRowSelected)

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


//=========  ModEmployeeFilterEmployee  ================ PR2019-05-26
    function ModEmployeeFilterEmployee(option) {
        console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let new_filter = el_mod_employee_filter_employee.value;
        let skip_filter = false

        let el_mod_employee_tblbody = document.getElementById("id_mod_employee_tblbody");

 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
// remove selected employee from selecttable when input element is cleared
                el_mod_employee_tblbody.removeAttribute("data-pk")
                el_mod_employee_tblbody.removeAttribute("data-ppk")
                el_mod_employee_tblbody.removeAttribute("data-value")
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

        let len = el_mod_employee_tblbody.rows.length;

        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, show_row, el, el_value; row_index < len; row_index++) {
                tblRow = el_mod_employee_tblbody.rows[row_index];
                el = tblRow.cells[0].children[0]

                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else if (!!el){
                    el_value = el.innerText;
                    if (!!el_value){
                        const el_value_lower = el_value.toLowerCase();
                        show_row = (el_value_lower.indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
// put values from first selected row in select_value
                    if(!has_selection ) {
                        select_value = el_value;
                        select_pk = tblRow.id
                        select_parentpk = get_attr_from_el(tblRow, "data-ppk");
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {
        if (has_selection && !has_multiple ) {
            el_mod_employee_tblbody.setAttribute("data-pk", select_pk)
            el_mod_employee_tblbody.setAttribute("data-ppk", select_parentpk)
            el_mod_employee_tblbody.setAttribute("data-value", select_value)
        }
    }; // function ModEmployeeFilterEmployee

//========= ModEmployeeFillSelectTableEmployee  ============= PR2019-08-18
    function ModEmployeeFillSelectTableEmployee(selected_employee_pk) {
        // console.log( "=== ModEmployeeFillSelectTableEmployee ");

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = get_attr_from_el(el_data, "data-txt_employee_select_none") + ":";

        let tableBody = document.getElementById("id_mod_employee_tblbody");
        tableBody.innerText = null;

//--- when no items found: show 'select_customer_none'
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

//- skip selected employee
                if (pk_int !== selected_employee_pk){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-ppk", ppk_int);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {ModEmployeeSelect(tblRow)}, false )

// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                    let td = tblRow.insertCell(-1);
                    tblRow.setAttribute("data-value", code);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected_employee_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // ModEmployeeFillSelectTableEmployee

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
                // NOT IN USE tblRow.setAttribute("id", tablename + pk.toString());
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                // NOT IN USE, put in tblBody. Was:  tblRow.setAttribute("data-table", tablename);

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


// ================ MODALS ========================

//=========  ModSchemeOpen  ================ PR2019-07-20
    function ModSchemeOpen() {
        //console.log("=========  ModSchemeOpen =========");

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
                selected_customer_pk = 0
            } else {
                selected_customer_pk = parseInt(el_mod_cust.value);
                HandleSelectCustomer(el_mod_cust)
            }
        }
        if(mode === "order"){
            //console.log("el_mod_order", el_mod_order);
            //console.log("el_mod_order.value: <", el_mod_order.value, "> " +  typeof el_mod_order.value);
            let msg_err, el_err = document.getElementById("id_mod_scheme_order_err")
            if(!el_mod_order.value){
                msg_err = get_attr_from_el(el_data, "data-err_msg_order");
            } else {
                HandleSelectOrder(el_mod_order)
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
            formcontrol_err_msg(el_mod_cycle, msg_err, msg_err)
        }
    }  // ModSchemeEdit

//=========  ModSchemeSave  ================ PR2019-07-20
    function ModSchemeSave() {
        //console.log("=========  ModSchemeSave =========");

            const code = el_mod_code.value
            const cycle_str = el_mod_cycle.value
            //console.log("el_mod_order", el_mod_order);
            //console.log("el_mod_order.value: <", el_mod_order.value, "> " +  typeof el_mod_order.value);

            let has_error = false
            if(!selected_customer_pk){
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
                const pk_str = "new_" + id_new.toString()

    // ---  create id_dict
                const tblName = "scheme"
                let id_dict = {"temp_pk": pk_str, "ppk": selected_order_pk, "table": tblName, "create": true}
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
                    url: url_scheme_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response:");
                        console.log (response);

                        if ("scheme_list" in response) {
                            get_datamap(response["scheme_list"], scheme_map)
                            FillSelectTable("scheme")
                        }
                        if ("update_dict" in response) {
                            let item_dict = response["update_dict"]
                            console.log( ">>>>>>>> item_dict =", item_dict);
                            UpdateSchemeInputElements(item_dict)
                        }

                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

            }   //  if(!has_error)

    }  // function ModSchemeSave

//========= ModalCopyfromTemplateOpen====================================
    function ModalCopyfromTemplateOpen () {
        //console.log("===  ModalCopyfromTemplateOpen  =====") ;

    // reset input elements
        el_mod_copyfrom_template.value = null
        let el_err = document.getElementById("id_mod_copyfrom_template_err");
        formcontrol_err_msg(el_mod_copyfrom_template, el_err)

        el_err = document.getElementById("id_mod_copyfrom_customer_err");
        formcontrol_err_msg(el_mod_copyfrom_cust, el_err)

        el_err = document.getElementById("id_mod_copyfrom_order_err");
        formcontrol_err_msg(el_mod_copyfrom_order, el_err)

        el_mod_copyfrom_code.value = null
        el_err = document.getElementById("id_mod_copyfrom_code_err");
        formcontrol_err_msg(el_mod_copyfrom_code, el_err)

        //el_mod_copyfrom_datestart.value = null
        //el_err = document.getElementById("id_mod_copyfrom_datestart_err");
        //formcontrol_err_msg(el_mod_copyfrom_datestart, el_err)

    // get ppk from scheme template ( = order 'Sjabloon')
        let template_ppk;
        const order_template_dict = order_template_list[0]
        if (!!order_template_dict){template_ppk = get_dict_value_by_key(order_template_dict, "pk")}

    // fill options with template schemes of order 'Sjabloon'
        const select_text = get_attr_from_el(el_data, "data-txt_copyfrom_select_template");
        const select_text_none = get_attr_from_el(el_data, "data-txt_copyfrom_select_none");

        (el_mod_copyfrom_template, scheme_template_list, select_text, select_text_none, template_ppk)

    // ---  show modal
        $("#id_mod_copyfrom").modal({backdrop: true});


}; // function ModalCopyfromTemplateOpen

//=========  ModalCopyfromTemplateEdit  ================ PR2019-07-20
    function ModalCopyfromTemplateEdit(mode) {
        //console.log("=========  ModalCopyfromTemplateEdit ========= mode:", mode);
        let dict, el_err, msg_err, new_scheme_code;
        let err_template = false, err_customer = false, err_order = false, err_code = false;
         //console.log("el_mod_copyfrom_cust.value", el_mod_copyfrom_cust.value, typeof el_mod_copyfrom_cust.value);

        dict = ModalCopyfromValidateTemplateBlank()
        const template_code = dict["code"];
        err_template = dict["error"];
        el_mod_copyfrom_code.value = template_code;

    // get selected_customer_pk and update SelectCustomer

        dict = ModalCopyfromValidateCustomerBlank()
        err_customer = dict["error"];

        dict = ModalCopyfromValidateOrderBlank()
        err_order = dict["error"];

        if(mode === "customer"){
            HandleSelectCustomer(el_mod_copyfrom_cust)
        }

     // get selected_order_pk and update SelectOrder
        //dict = ModalCopyfromValidateOrderBlank()
        //err_order = dict["error"];
        if(mode === "order"){
            HandleSelectOrder(el_mod_copyfrom_order)
        }

        dict = ModalCopyfromValidateSchemeCode();
        const scheme_code = dict["code"];
        err_code = dict["error"];


        // get rosterdate of cyclestart record from schemeitem_template_list
        /*
            let startdate;
            msg_err = null;
            el_err = document.getElementById("id_mod_copyfrom_template_err")
            const template_pk = parseInt(el_mod_copyfrom_template.value)
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

        const has_err = (err_template || err_customer || err_order || err_code);
        el_mod_copyfrom_btn_save.disabled = has_err;

        return has_err

    }  // ModalCopyfromTemplateEdit

 function ModalCopyfromValidateTemplateBlank(){
    let el_err = document.getElementById("id_mod_copyfrom_template_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_template_select");
    return validate_select_blank(el_mod_copyfrom_template, el_err, msg_blank, true) // true = skip first option (Select template...)
 }
  function ModalCopyfromValidateCustomerBlank(){
    let el_err = document.getElementById("id_mod_copyfrom_customer_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_customer");
    return validate_select_blank(el_mod_copyfrom_cust, el_err, msg_blank, true) // true = skip first option (Select template...)
 }
  function ModalCopyfromValidateOrderBlank(){
    //console.log(" --- ModalCopyfromValidateOrderBlank ---")
    let el_err = document.getElementById("id_mod_copyfrom_order_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_order");
    const dict = validate_select_blank(el_mod_copyfrom_order, el_err, msg_blank, true) // true = skip first option (Select template...)
    //console.log(dict)
    return dict
 }

 function ModalCopyfromValidateSchemeCode(){
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

//========= ModalCopyfromTemplateSave====================================
    function ModalCopyfromTemplateSave () {
        //console.log("===  ModalCopyfromTemplateSave  =====") ;
        let has_error = false;

        let return_dict = ModalCopyfromValidateTemplateBlank()
        const template_code = return_dict["code"];
        const err_template = return_dict["error"];
        el_mod_copyfrom_code.value = template_code;

        return_dict = ModalCopyfromValidateCustomerBlank()
        const err_customer = return_dict["error"];

        return_dict = ModalCopyfromValidateOrderBlank()
        const err_order = return_dict["error"];

        return_dict = ModalCopyfromValidateSchemeCode();
        const new_code = return_dict["code"];
        const err_code = return_dict["error"];

        has_error = (err_template || err_customer || err_order || err_code);
        el_mod_copyfrom_btn_save.disabled = has_error

        if(!has_error) {

            $("#id_mod_scheme").modal("hide");
// get template pk from modal select
            const template_pk = parseInt(el_mod_copyfrom_template.value)

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

    }; // function ModalCopyfromTemplateSave

//========= ModalCopytoTemplateOpen====================================
    function ModalCopytoTemplateOpen () {
        //console.log("===  ModalCopytoTemplateOpen  =====") ;

        let el_modal = document.getElementById("id_mod_copyto")
        let el_input = document.getElementById("id_mod_copyto_code")
        el_input.innerText = null

    // get selected scheme from scheme_map
        if (!!selected_scheme_pk){

            let item_dict = scheme_map.get(selected_scheme_pk) // lookup_itemdict_from_datadict(data_map, pk_int)
            // TODO check if it should be el_input.innerText OR el_input.value
            el_input.value = get_subdict_value_by_key (field_dict, "code", "value")

            ModalCopytoTemplateEdit();

    // ---  show modal
            $("#id_mod_copyto").modal({backdrop: true});
        }

}; // function ModalCopytoTemplateOpen

//=========  ModalCopytoTemplateEdit  ================ PR2019-07-20
    function ModalCopytoTemplateEdit() {
        //console.log("=========  ModalCopytoTemplateEdit =========");

        let el_input = document.getElementById("id_mod_copyto_code")
        let value = el_input.value

        let msg_err;
        if(!value){
            msg_err = get_attr_from_el(el_data, "data-err_msg_template_blank");
        } else {
            let exists = false;
            for (let i = 0, dict, code, len = scheme_template_list.length; i < len; i++) {
                dict = scheme_template_list[i]
                code = get_subdict_value_by_key(dict, "code", "value")
                if (value.toLowerCase() === code.toLowerCase()) {
                    exists = true;
                    break;
                }
            }
            if (exists){
                msg_err = get_attr_from_el(el_data, "data-err_msg_name_exists");
            }
        }
        let el_err = document.getElementById("id_mod_copyto_code_err")
        formcontrol_err_msg(el_input, el_err, msg_err)

        el_mod_copyto_btn_save.disabled = (!!msg_err)

    }  // ModalCopytoTemplateEdit

//=========  ModalCopytoTemplateSave  ================ PR2019-07-24
    function ModalCopytoTemplateSave() {
        //console.log("=========  ModalCopytoTemplateSave =========");

        $("#id_mod_copyto").modal("hide");

        if(!!selected_scheme_pk) {
            let el_mod_copyto_code = document.getElementById("id_mod_copyto_code")
            let template_code = el_mod_copyto_code.value

            const dict ={"id": {"pk": selected_scheme_pk, "ppk": selected_order_pk, "table": "scheme"}}
            if (!!template_code){
                dict["code"] = {"value": template_code, "update": true}
            }
            let parameters = {"copytotemplate": JSON.stringify (dict)};
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
                        scheme_map.clear()
                        for (let i = 0, len = response["scheme_list"].length; i < len; i++) {
                            const item_dict = response["scheme_list"][i];
                            const pk_int = parseInt(item_dict["pk"]);
                            scheme_map.set(pk_int, item_dict);
                        }
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
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
            //NIU const el_id = get_attr_from_el(el_input, "id");
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            console.log("data_field", data_field, "data_value", data_value)

            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");
            console.log("data_mindate", data_mindate, "data_maxdate", data_maxdate);

    // put values in el_popup_date
            // NIU el_popup_date.setAttribute("data-el_id", el_id);
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
        const el_id = el_popup_date.getAttribute("data-el_id")  // id  of element clicked
        const pk_str = el_popup_date.getAttribute("data-pk")// pk of record  of element clicked
        const ppk_int = parseInt(el_popup_date.getAttribute("data-ppk"));
        const fieldname = el_popup_date.getAttribute("data-field");
        const tablename = el_popup_date.getAttribute("data-table");
        console.log("pk_str:", pk_str, "ppk_int:", ppk_int, "fieldname:", fieldname, "tablename:", tablename);


        if(!!pk_str && !! ppk_int){

            const row_id = tablename + pk_str;
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
            id_dict["table"] = tablename

            if (!!id_dict){
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
            if (tablename === "teammember") {hide_year = true }
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

                const url_str = (tablename === "teammember") ? url_teammember_upload :
                                (tablename === "schemeitem") ? url_schemeitem_upload : url_scheme_upload;

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

                        if ("update_dict" in response) {
                            let item_dict = response["update_dict"]
                            console.log( ">>>>>>>> item_dict =", item_dict);
                            if (!!tr_changed) {
                                UpdateTableRow(tablename, tr_changed, item_dict)
                            } else {
                                UpdateSchemeInputElements(item_dict)
                            }
                        }
                        if ("team_list" in response){
                            get_datamap(response["team_list"], team_map)
                            FillSelectTable("team", true, ppk_int)
                        }
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

 // if no rosterdate put today as rostedate
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
        el_popup_wdy.classList.remove("display_hide");


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
        const n_date_arr = n_date_iso.split("T");
        const n_date_yyymmdd = n_date_arr[0]
        //console.log("n_date_yyymmdd: ", n_date_yyymmdd, typeof n_date_yyymmdd)

// put n_date_yyymmdd in attr. data-value
        el_popup_wdy.setAttribute("data-value", n_date_yyymmdd)

}

//=========  HandlePopupWdmySave  ================ PR2019-04-14
    function HandlePopupWdySave() {
        console.log("===  function HandlePopupWdySave =========");

        popupbox_removebackground();
        el_popup_wdy.classList.add("display_hide");

        const field_id = el_popup_wdy.getAttribute("data-field_id") // value of element clicked "-1;17;45"
        let el_input = document.getElementById(field_id)

        const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
        console.log ("n_value: ",n_value );

        if(!!n_value){
            el_input.setAttribute("data-value", n_value)
        } else {
            el_input.removeAttribute("data-value")
        }

        UploadChanges(el_input)
    }  // HandlePopupWdySave


//=========  HighlichtSelectShift  ================ PR2019-08-25
    function HighlichtSelectShift(pk_int) {
        //console.log( " --- HighlichtSelectShift ---", pk_int);
    // tr_selected is selected row in tblBody_shift_select
        let tr_selected = document.getElementById("sel_shift_" + pk_int.toString())

// ---  remove highlights from other select tables
        ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey);
        ChangeBackgroundRows(tblBody_team_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey);

// ---  make background of tblBody_shift_select light yellow
        ChangeBackgroundRows(tblBody_shift_select, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)

        if (!!tr_selected){
// ---  highlight clicked row
            tr_selected.classList.remove(cls_bc_yellow_lightlight)
            tr_selected.classList.add(cls_bc_yellow)
        }

    }  // HighlichtSelectShift


    //========= function pop_background_remove  ====================================
    function popupbox_removebackground(class_name){
        // remove selected color from all input popups
        if(!class_name){class_name = ".pop_background"}
        let elements = document.getElementsByClassName(class_name);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

    //========= function schemefillbuttons_hide  ====================================
    function schemefillbuttons_hide(){
            el_btn_dayup.classList.add(cls_hide);
            el_btn_daydown.classList.add(cls_hide);
            el_btn_autofill.classList.add(cls_hide);
            el_btn_scheme_delete.classList.add(cls_hide)
    }
    //========= function schemefillbuttons_hide  ====================================
    function schemefillbuttons_show(){
            el_btn_dayup.classList.remove(cls_hide);
            el_btn_daydown.classList.remove(cls_hide);
            el_btn_autofill.classList.remove(cls_hide);
            el_btn_scheme_delete.classList.remove(cls_hide)
    }

//0000000000000000000000000000000000000000000000000000000000000000000000000000000

// ++++++++++++  TIMEPICKER +++++++++++++++++++++++++++++++++++++++

//========= HandleTimepickerOpen  ====================================
    function HandleTimepickerOpen(el_input) {
        console.log("===  HandleTimepickerOpen  =====") ;

        let tr_selected = get_tablerow_selected(el_input);
        const shift_dict = get_itemdict_from_datamap_by_tblRow(tr_selected, shift_map);

        console.log("shift_dict", shift_dict);

        HandleTableRowClicked(tr_selected);

        if(!isEmpty(shift_dict)){
            const fieldname = get_attr_from_el(el_input, "data-field")

            const id_dict = get_dict_value_by_key(shift_dict, "id")
            const field_dict = get_dict_value_by_key(shift_dict, fieldname)

            const minoffset = ("minoffset" in field_dict) ? field_dict["minoffset"] : -720
            const maxoffset = ("maxoffset" in field_dict) ? field_dict["maxoffset"] : 2160

            let offset = null;
            if(fieldname === "breakduration"){
                if ("value" in field_dict){offset = field_dict["value"]}
            } else {
                if ("offset" in field_dict){offset = field_dict["offset"]}
            }

            let tp_dict = {"id": id_dict, "field": fieldname, "rosterdate": field_dict["rosterdate"],
                "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
                "isampm": (timeformat === 'AmPm'), "quicksave": {"value": quicksave}}

            const show_btn_delete = true;

            let st_dict = { "interval": interval, "comp_timezone": comp_timezone, "user_lang": user_lang,
                            "show_btn_delete": show_btn_delete, "weekday_list": weekday_list, "month_list": month_list};

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

// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

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
        const len = tblBody_items.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody_items.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow_dict(tblRow)
                if (show_row) {
                    tblRow.classList.remove("display_hide")
                } else {
                    tblRow.classList.add("display_hide")
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

    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX



}); //$(document).ready(function()