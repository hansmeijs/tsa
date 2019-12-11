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
        const cls_visible_show = "visibility_show";

        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_bc_yellow_light = "tsa_bc_yellow_light";
        const cls_bc_yellow = "tsa_bc_yellow";

        const cls_selected = "tsa_tr_selected";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
        const url_customer_upload = get_attr_from_el(el_data, "data-customer_upload_url");
        const url_pricerate_upload = get_attr_from_el(el_data, "data-pricerate_upload_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");

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

        const title_billable =  get_attr_from_el(el_data, "data-title_billable");
        const title_notbillable =  get_attr_from_el(el_data, "data-title_notbillable");

// const for report
        const label_list = [get_attr_from_el_str(el_data,"data-txt_company"),
                    get_attr_from_el_str(el_data,"data-txt_customer"),
                    get_attr_from_el_str(el_data,"data-txt_planning") + " " + get_attr_from_el_str(el_data,"data-txt_of"),
                    get_attr_from_el_str(el_data,"data-txt_printdate")];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [ get_attr_from_el_str(el_data,"data-txt_date"),
                            get_attr_from_el_str(el_data,"data-txt_timestart"),
                            get_attr_from_el_str(el_data,"data-txt_timeend"),
                            get_attr_from_el_str(el_data,"data-txt_shift"),
                            get_attr_from_el_str(el_data,"data-txt_order"),
                            get_attr_from_el_str(el_data,"data-txt_date")];

// ---  id of selected customer
        const id_sel_prefix = "sel_";
        let selected_customer_pk = 0;
        let selected_order_pk = 0;

        let selected_btn = "customer"
        let mod_upload_dict = {};
        let company_dict = {};
        let selected_period = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let filter_select = "";
        let filter_show_inactive = false;
        let filter_dict = {};

        let customer_map = new Map();
        let order_map = new Map();
        let pricerate_map = new Map();
        let planning_map = new Map();
        let roster_map = new Map();

        const tbl_col_count = {
            "customer": 3,
            "order": 7,
            "planning": 7,
            "pricerate": 4};
        const thead_text = {
            "customer": ["txt_shortname", "txt_customer_name", ""],
            "order": ["txt_customer", "txt_order_code", "txt_order_name", "txt_datefirst", "txt_datelast", "", ""],
            "planning": ["txt_customer", "txt_order", "txt_employee", "txt_rosterdate", "txt_shift", "txt_timestart", "txt_timeend"],
            "pricerate": ["txt_orderschemeshift", "txt_pricerate", "txt_billable", "txt_asof"]}
        const field_names = {
            "customer": ["code", "name", "delete"],
            "order": ["customer", "code", "name", "datefirst", "datelast", "inactive", "delete"],
            "planning": ["customer", "order", "employee", "rosterdate", "shift", "timestart", "timeend"],
            "pricerate": ["code", "priceratejson", "billable", "datefirst"]}
        const field_tags = {
            "customer": ["input", "input", "a"],
            "order": ["input", "input", "input", "input", "input", "a", "a"],
            "planning": ["input", "input", "input", "input", "input", "input", "input"],
            "pricerate": ["input", "input", "a", "input"]}
        const field_width = {
            "customer": ["180", "220", "032"],
            "order": ["180", "180", "180", "120", "120", "032", "032"],
            "planning": ["120", "120", "180", "120", "090", "090", "090"],
            "pricerate": ["220", "150", "120", "150"]}
        const field_align = {
            "customer": ["left", "left", "right"],
            "order": ["left", "left","left", "left", "left", "right", "right"],
            "planning": ["left", "left", "left", "left", "left", "right", "right"],
            "pricerate": ["left", "right", "center", "left"]}

// get elements
        let tblHead_items = document.getElementById("id_thead_items");
        let tblBody_items = document.getElementById("id_tbody_items");
        let tblBody_select = document.getElementById("id_tbody_select");

        console.log("tblBody_items: ", tblBody_items);

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

// ---  add 'keyup' event handler to filter orders and customers
        let el_filter_select = document.getElementById("id_flt_select")
            el_filter_select.addEventListener("keyup", function() {
                setTimeout(function() {HandleFilterSelect()}, 50)});

        let el_sel_inactive = document.getElementById("id_sel_inactive")
            el_sel_inactive.addEventListener("click", function(){HandleFilterInactive(el_sel_inactive)});

// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSelect(mode)}, false )
        }

// === event handlers for MODAL ===

// ---  select period header
        document.getElementById("id_div_hdr_period").addEventListener("click", function(){ModPeriodOpen()});
// ---  save button in ModPeriod
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function(){ModPeriodSave()});
// ---  save button in ModConfirm
        let el_confirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_confirm_btn_save.addEventListener("click", function(){ModConfirmSave()});
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
            el_form_btn_delete.addEventListener("click", function(){ModConfirmOpen("delete", el_form_btn_delete)});
        document.getElementById("id_form_btn_add").addEventListener("click", function(){HandleCustomerAdd()});

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
    // hide msgbox
            el_msg.classList.remove("show");
    // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                // don't reset selected_customer_pk
                selected_order_pk = 0;
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

// --- create Submenu
        CreateSubmenu()

// --- create header row and footer
        CreateTblHeaders();
        CreateTblFooters();

        // skip cat: 512=absence, 4096=template, # inactive=None: show all
        const datalist_request = {
            "setting": {"page_customer": {"mode": "get"},
                        "selected_pk": {"mode": "get"},
                        "planning_period": {"mode": "get"}},
            "company": {value: true},
            "customer": {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            "order": {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            "order_pricerate": {value: true}};
        DatalistDownload(datalist_request);

//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++
//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        //console.log( datalist_request)

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

                if ("company_dict" in response) {
                    company_dict = response["company_dict"];
                }

                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                    FillTableRows("order");
                    console.log("order_map: ", order_map)
                }

                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                    console.log("customer_map: ", customer_map)
                    const tblName = "customer";
                    FillSelectTable();
                    FilterSelectRows();

                    FillTableRows(tblName);
                    let el_tbody_customer = document.getElementById("id_tbody_customer");
                    FilterTableRows(el_tbody_customer);
                }
                if ("order_pricerate_list" in response) {
                    get_datamap(response["order_pricerate_list"], pricerate_map)
                    //FillTableRows();
                }
                if ("customer_planning_list" in response) {
                    get_datamap(response["customer_planning_list"], planning_map)
                    FillTableRows("planning");
                }
                // setting_list must go after FillSelectTable() and before FillTableRows();
                if ("setting_list" in response) {
                    UpdateSettings(response["setting_list"])
                }

        // --- hide loader
                el_loader.classList.add(cls_visible_hide)
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

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
        console.log( "tblName: ", tblName, typeof tblName);

        if (tblName === "customer"){
// ---  update selected_customer_pk
            const new_customer_pk = parseInt(get_subdict_value_by_key (map_dict, "id", "pk", 0))
            // deselect selected_order_pk when selected customer changes
            if(new_customer_pk !== selected_customer_pk){selected_order_pk = 0}
            selected_customer_pk = new_customer_pk

// ---  highlight row in select table
            const row_id = id_sel_prefix + tblName + selected_customer_pk.toString();
            let selectRow = document.getElementById(row_id);
            HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

        } else if (tblName === "order"){
            const pk_str = get_attr_from_el(tr_clicked, "data-pk");
            selected_order_pk = parseInt(pk_str);
        };  // if (tblName === "customer")

// ---  update header text
        UpdateHeaderText();

// --- save selected_customer_pk in Usersettings ( UploadSettings at the end of this function)
        const setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
        UploadSettings (setting_dict, url_settings_upload);

    };

// TODO: add HandleButtonCustomerAdd and HandleCustomerAdd and UploadFormChanges and UploadPricerateChanges(??)
//========= HandleButtonCustomerAdd  ============= PR2019-10-12
//========= HandleCustomerAdd  ============= PR2019-09-24
    function HandleCustomerAdd(){
        console.log(" --- HandleCustomerAdd --- ")

        selected_customer_pk = 0
        //console.log( "selected_customer_pk", selected_customer_pk )

        // ---  remove highlights from select tables
        DeselectHighlightedTblbody(tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
        let el_form_code = document.getElementById("id_form_code")
        document.getElementById("id_form_name").value = null;
        el_form_code.value = null;
        el_form_code.value = null;
        el_form_code.placeholder = get_attr_from_el(el_data, "data-txt_cust_code_enter")

        el_form_code.focus();
        document.getElementById("id_form_btn_add").disabled = true;
    }

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(mode, btn_selected) {
        //console.log( "===== HandleBtnSelect ========= ", mode);

        selected_btn = mode
        if(!selected_btn){selected_btn = "customer"}

// ---  upload new selected_btn
        const upload_dict = {"page_customer": {"mode": selected_btn}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const data_mode = get_attr_from_el(btn, "data-mode")
            if (data_mode === selected_btn){
                btn.classList.add("tsa_btn_selected")
            } else {
                btn.classList.remove("tsa_btn_selected")
            }
        }

// ---  show / hide selected table
        const mode_list = ["customer", "order", "planning"];
        for(let i = 0, tbl_mode, len = mode_list.length; i < len; i++){
            tbl_mode = mode_list[i];
            let div_tbl = document.getElementById("id_div_tbl_" + tbl_mode);
            if(!!div_tbl){
                if (tbl_mode === selected_btn){
// add addnew row to end of table, if not exists
                    div_tbl.classList.remove(cls_hide);
                } else {
                    div_tbl.classList.add(cls_hide);
                } // if (tbl_mode === selected_btn)
            }  // if(!!div_tbl){
        }

        if (selected_btn === "customer_form"){
            document.getElementById("id_div_data_form").classList.remove(cls_hide);
        } else {
            document.getElementById("id_div_data_form").classList.add(cls_hide);
        };

// ---  highlight row in list table
            let tblBody = document.getElementById("id_tbody_" + selected_btn);
            if(!!tblBody){
                FilterTableRows(tblBody)
            }

// --- update header text
        UpdateHeaderText();
        UpdateHeaderPeriod();

    }  // HandleBtnSelect

//=========  HandleSelectRow ================ PR2019-08-28
    function HandleSelectRow(sel_tr_clicked) {
        //console.log( "===== HandleSelectRow  ========= ");
        // selectRow contains customers

        if(!!sel_tr_clicked) {
// ---  get map_dict
            const tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
            const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
            // function 'get_mapdict_from_tblRow.....' returns empty dict if map or key not exist.
            const map_dict = get_mapdict_from_tblRow(sel_tr_clicked)
            if (!isEmpty(map_dict)){

// ---  update selected_customer_pk
                selected_customer_pk = get_subdict_value_by_key(map_dict, "id", "pk", 0);
                const sel_cust_ppk = get_subdict_value_by_key(map_dict, "id", "ppk", 0);
                const sel_cust_code = get_subdict_value_by_key(map_dict, "code", "value");

// --- deselect selected_order_pk when selected customer changes
                selected_order_pk = 0

// --- save selected_customer_pk in Usersettings
                const upload_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
                UploadSettings (upload_dict, url_settings_upload);

// ---  highlight clicked row in select table
                //DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
                // yelllow won/t show if you dont first remove background color
                //sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
                //sel_tr_clicked.classList.add(cls_bc_yellow)
                 // ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background)
                ChangeBackgroundRows(tblBody_select, cls_bc_lightlightgrey, false, sel_tr_clicked, cls_bc_yellow);


// ---  update header text
                UpdateHeaderText()

// ---  update customer form
                // btns are: 'customer', 'order', 'planning', 'customer_form'
                if(selected_btn === "customer_form"){
                    UpdateForm()
// ---  enable delete button
                    document.getElementById("id_form_btn_delete").disabled = (!selected_customer_pk)
                } else {
                    let tblBody = document.getElementById("id_tbody_" + selected_btn);
                    if(!!tblBody){
// ---  highlight row in tblBody
                       if(selected_btn === "customer"){
                           let tblRow = HighlightSelectedTblRowByPk(tblBody, selected_customer_pk)
// ---  scrollIntoView, only in tblBody customer
                            if (!!tblRow){
                                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                            };
                        } else if(selected_btn === "order"){
// Filter Table Rows in table 'order', 'planning',
                             FilterTableRows(tblBody)
// put pk and ppk of selected customer in addnew row of tbody_order
                            UpdateAddnewRow(selected_customer_pk, sel_cust_ppk, sel_cust_code)
                        }  // if(selected_btn === "customer")
                    }  // if(!!tblBody)
                };  // if(selected_btn === "customer_form")


            }  //  if (!isEmpty(map_dict))
        }  // if(!!sel_tr_clicked)

// ---  enable add button, also when no customer selected
        document.getElementById("id_form_btn_add").disabled = false;
    }  // HandleSelectRow

//========= HandleBillableClicked  ============= PR2019-09-27
    function HandleBillableClicked(el_changed) {
        console.log("======== HandleBillableClicked  ========");
        if(!!el_changed){
            const tblRow = get_tablerow_selected(el_changed);
            if(!!tblRow){
                const tblName = get_attr_from_el_str(tblRow, "data-table");
                const pk_str = get_attr_from_el_str(tblRow, "data-pk");
                const map_id = get_map_id(tblName, pk_str);

                const itemdict = get_mapdict_from_tblRow(tblRow)
                console.log("itemdict", itemdict);
                // billable: {override: false, billable: false}

                let is_override = get_subdict_value_by_key(itemdict, "billable", "override");
                let is_billable = get_subdict_value_by_key(itemdict, "billable", "billable");
                console.log("is_override", is_override, "is_billable", is_billable);
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

    function HandleBtnInactiveClicked(el_input) {
        HandleBtnInactiveDeleteClicked("inactive", el_input);
    }
    function HandleBtnDeleteClicked(el_input) {
        HandleBtnInactiveDeleteClicked("delete", el_input);
    }
//========= HandleBtnInactiveDeleteClicked  ============= PR2019-09-23
    function HandleBtnInactiveDeleteClicked(mode, el_input) {
        //console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        //console.log(el_input);

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

//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        //AddSubmenuButton(el_div, el_data, "id_submenu_employee_import", null, "data-txt_employee_import","mx-2", url_employee_import )
        //AddSubmenuButton(el_div, el_data, "id_submenu_employee_add", function() {HandleButtonEmployeeAdd()}, "data-txt_employee_add", "mx-2")
        //AddSubmenuButton(el_div, el_data, "id_submenu_employee_delete", function() {ModConfirmOpen("delete")}, "data-txt_employee_delete", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_customer_planning_print", function() {
            PrintCustomerPlanning("preview", selected_period, planning_map, company_dict,
                        label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang)}, "data-txt_planning_preview", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_customer_planning_print", function() {
            PrintCustomerPlanning("print", selected_period, planning_map, company_dict,
                        label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang)}, "data-txt_planning_download", "mx-2")

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//========= FillTableRows  ====================================
    function FillTableRows(tblName) {
        //console.log( "===== FillTableRows  ========= ", tblName);

        // selected_btns are: customer, order, planning, customer_form
        if (selected_btn === "customer_form") { tblName = "customer"};
        //console.log( "tblName: ", tblName);

// --- reset tblBody
        let tblBody = document.getElementById("id_tbody_" + tblName);
        tblBody.innerText = null;

// --- get  data_map
        const form_mode = (selected_btn === "customer_form");
        const data_map = (tblName === "customer") ? customer_map :
                         (tblName === "order") ? order_map :
                         (selected_btn === "planning") ? planning_map :
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

                    // in mode order or pricerate: show only rows of selected_customer_pk
                    let add_Row = false;
                    let row_customer_pk = null;
                    if (["order", "pricerate"].indexOf( selected_btn ) > -1){
                        row_customer_pk = get_subdict_value_by_key(item_dict, "customer", "pk")
                        add_Row = (!!row_customer_pk && row_customer_pk === selected_customer_pk);
                    } else {
                        add_Row = true;
                    }
                    if(add_Row) {
                        // parameters: tblName, pk_str, ppk_str, is_addnew, customer_pk
                        let tblRow = CreateTblRow("tbody", row_tblName, pk_int, ppk_int, false, row_customer_pk)
                        UpdateTableRow(tblRow, item_dict)
// --- highlight selected row
                        if (pk_int === selected_pk) {
                            tblRow.classList.add(cls_selected)
                        }
                    }  // if (add_Row)

                }  //  for (const [pk_int, item_dict] of data_map.entries())
            }  // if(!!data_map){

        }  // if (form_mode)

    }  // FillTableRows

//=========  CreateTblHeaders  === PR2019-11-09
    function CreateTblHeaders() {
        //console.log("===  CreateTblHeaders == ");

        const tblName_list = ["customer", "order", "planning"]
        tblName_list.forEach(function (tblName, index) {

            let tblHead = document.getElementById("id_thead_" + tblName);
            tblHead.innerText = null

            let tblRow = tblHead.insertRow (-1); // index -1: insert new cell at last position.

    //--- insert th's to tblHead
            const column_count = tbl_col_count[tblName];

            for (let j = 0; j < column_count; j++) {

    // --- add th to tblRow.
                let th = document.createElement("th");
                tblRow.appendChild(th);

    // --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
                th.appendChild(el_div)

    // --- add img billable and delete
                //if ((tblName === "customer" && j === 2) || (tblName === "order" && j === 5))  {
                //    AppendChildIcon(el_div, imgsrc_delete)
                //    el_div.classList.add("ml-4")
                //} else if (tblName === "order" && j === 776)  {
               //     //AppendChildIcon(el_div, imgsrc_billable_black)
                //} else {

    // --- add innerText to th
                    const data_key = "data-" + thead_text[tblName][j];
                    const data_text = get_attr_from_el(el_data, data_key);
                    el_div.innerText = data_text;
                    el_div.setAttribute("overflow-wrap", "break-word");
                //}

    // --- add margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")}
    // --- add width to el
                el_div.classList.add("td_width_" + field_width[tblName][j])
    // --- add text_align
                el_div.classList.add("text_align_" + field_align[tblName][j])
            }  // for (let j = 0; j < column_count; j++)

            CreateTblFilter(tblHead, tblName)
        });  //  tblName_list.forEach
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
            let tblRow;
            // ppk_int = company_pk when customer, otherwise: ppk_int = selected_customer_pk
            const ppk_int = (tblName === "customer") ? get_subdict_value_by_key (company_dict, "id", "pk", 0) : selected_customer_pk
            // CreateTblRow(prefix, tblName, pk_str, ppk_str, is_addnew, data_customer_pk)
            tblRow = CreateTblRow("tfoot", tblName, pk_new, ppk_int, true, selected_customer_pk)

            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new, "table": tblName}};

    // --- add customer in first columns  when tblName is 'order'
            if (tblName === "order") {

    // get info from selected customer, store in dict
                // if selected customer has value: create customer_dict, store value in field customer and tblRow of AddneRow
                if (!!ppk_int ){
                    const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", ppk_int);
                    const customer_ppk = get_subdict_value_by_key(customer_dict, "id", "ppk");
                    const code_value = get_subdict_value_by_key(customer_dict, "code", "value")
                    //console.log("code_value", code_value);
                    //dict["id"]["ppk"] = selected_customer_pk;
                    dict["customer"] = {"pk": ppk_int, "ppk": customer_ppk, "value": code_value, "field": "customer", "locked": true}
                } else {
                    // dict["customer"] is needed to put 'Select customer' in field 'customer'
                    dict["customer"] = {"pk": null, "ppk": null, "value": null, "field": "customer", "locked": false}
                }
            };

            //console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@ CreateTblFooter UpdateTableRow ");
            //console.log("tblRow  ", tblRow);
            UpdateTableRow(tblRow, dict)

        }  //  if(!!tblFoot)
    };  //function CreateTblFooter

//=========  ResetAddnewRow  === PR2019-11-26
    function ResetAddnewRow(tblName) {
        //console.log("===  ResetAddnewRow == ");

    // --- lookup row 'add new' in tFoot

        const tblFoot_id = "id_tfoot_" + tblName;
        let tblFoot = document.getElementById(tblFoot_id);
        if (!!tblFoot.rows.length){
            let tblRow = tblFoot.rows[0];

        // --- update addnew row when tblName is 'customer'
            let update_dict = {}
            // format of update_dict is : { id: {table: "customer", pk: 504, ppk: 2, temp_pk: "customer_504"}
            //                              pk: 504,  code: {updated: true, value: "mmm2"},  name: {value: "mmm"},
            //                              cat: {value: 0}, interval: {value: 0}}


            // parent of customer is company, get ppk_int from company_dict ( ppk_int = company_pk)
            // parent of order is selected_customer_pk
            const ppk_int = (tblName === "customer") ? get_subdict_value_by_key (company_dict, "id", "pk", 0) :
                                                       selected_customer_pk;

            update_dict = {"id": {"pk": 0, "ppk": ppk_int},
                            "code": {"value": null, "updated": true},
                            "name": {"value": null, "updated": true}};


        // --- update addnew row when tblName is 'order'
            if (tblName === "order") {
        // get info from selected customer, store in dict
                    // if selected customer has value: create customer_dict, store value in field customer and tblRow of AddneRow
                    if (!!ppk_int ){
                        const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", ppk_int);
                        const customer_ppk = get_subdict_value_by_key(customer_dict, "id", "ppk");
                        const code_value = get_subdict_value_by_key(customer_dict, "code", "value")
                        //dict["id"]["ppk"] = selected_customer_pk;
                        update_dict["customer"] = {"pk": ppk_int, "ppk": customer_ppk, "value": code_value, "field": "customer", "locked": true}
                    } else {
                        // dict["customer"] is needed to put 'Select customer' in field 'customer'
                        update_dict["customer"] = {"pk": null, "ppk": null, "value": null, "field": "customer", "locked": false}
                    }
                    update_dict["id"] = {"pk": null, "ppk": ppk_int, "temp_pk": null, "table": "order"};
                };  // else if (tblName === "order")

       // console.log("@@@@@@@@@@@@@@@@@@@@ UpdateTableRow ResetAddnewRow ");
        //console.log("tblRow  ", tblRow);
                UpdateTableRow(tblRow, update_dict)

// --- new created record

    // remove placeholder from element 'code
                //let el_code = tblRow.cells[0].children[0];
                //if (!!el_code){el_code.removeAttribute("placeholder")}


        }  // if (!!rows_length){

    };  //function ResetAddnewRow

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
               el.setAttribute("data-mode", tblName);

// --- add attributes to td
                if ((tblName === "customer" && j === 2) || (tblName === "order" && j === 5) || (tblName === "order" && j === 6)) {
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
    function CreateTblRow(prefix, tblName, pk_str, ppk_str, is_addnew_row, data_customer_pk) {
        //console.log("=========  CreateTblRow =========");
        //console.log("tblName", tblName);
        //console.log("pk_str", pk_str);
        //console.log("ppk_str", ppk_str);
        //console.log("is_addnew_row", is_addnew_row);
        //console.log("customer_pk", data_customer_pk);

// --- insert tblRow ino tblBody or tFoot
        let tblBody_or_tFoot = document.getElementById("id_" + prefix + "_" + tblName);
        let tblRow = tblBody_or_tFoot.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        const map_id = get_map_id(tblName, pk_str)
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_str);
        tblRow.setAttribute("data-ppk", ppk_str);
        tblRow.setAttribute("data-table", tblName);
        if(!!data_customer_pk){tblRow.setAttribute("data-customer_pk", data_customer_pk)};

// --- put data-addnew in tr when is_addnew_row
        // was: const is_new_row = !parseInt(pk_str); // don't use Number, "545-03" wil give NaN
        if (is_addnew_row){
            tblRow.setAttribute("data-addnew", true);
        }

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow, tblName, "list");}, false )

// --- add grey color to row 'order' and 'scheme' in list pricerate.
       // if (selected_btn === "pricerate"){
       //     if (tblName === "order"){
       //         tblRow.classList.add("tsa_bc_lightgrey")
       //     } else if (tblName === "scheme"){
       //         tblRow.classList.add("tsa_bc_lightlightgrey")
       //     }
       // }

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
            if ((tblName === "customer" && j === 2 ) || (tblName === "order" && j === 6)) {
                if (!is_addnew_row){
                    CreateBtnInactiveDelete("delete", tblRow, el)
                }
            } else if (tblName === "order" && j === 5 ) {
// --- column inactive, , not in addnew row
                if (!is_addnew_row){
                    CreateBtnInactiveDelete("inactive", tblRow, el)
                }
// --- column billable
            // } else if (selected_btn === "pricerate" && j === 2 ) {
            //     if(!is_addnew_row) {
            //         el.setAttribute("href", "#");
            //         el.addEventListener("click", function(){
            //             HandleBillableClicked(el)
            //             }, false )
            //         AppendChildIcon(el, imgsrc_stat00)
            //         el.setAttribute("data-field", field_names[selected_btn][j]);
            //         el.classList.add("ml-4")
            //         //td.appendChild(el);
            //     };
            } else {

// --- add type and input_text to el.
                el.setAttribute("type", "text")
                el.classList.add("input_text");

// --- add EventListener to td
                // if (selected_btn === "pricerate"){
                //     if ([1].indexOf( j ) > -1){
                //         el.addEventListener("change", function() {UploadElChanges(el);}, false)
                //     };
                // } else {
                    if (tblName === "customer"){
                        if ([0, 1].indexOf( j ) > -1){
                            el.addEventListener("change", function() {UploadElChanges(el)}, false )
                        }
                    } else if (tblName === "order"){
                        if ([0, 1, 2].indexOf( j ) > -1){
                            el.addEventListener("change", function() {UploadElChanges(el);}, false)
                        } else if ([3, 4].indexOf( j ) > -1){
                            el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false);
                            // class input_popup_date is necessary to skip closing popup
                            el.classList.add("input_popup_date")
                        };
                    }
                // }  //  if (selected_btn === "pricerate"){

            }  // if ((tblName === "order" && j === 7) || (tblName === "customer" && j === 2 ))

// --- add placeholder, only when is_addnew_row.
            if (is_addnew_row ){
                if((tblName === "customer" && j === 0) || (tblName === "order" && j === 1)){
                    el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_" + tblName + "_add") + "...")
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
        el_input.addEventListener("click", function(){HandleBtnInactiveDeleteClicked(mode, el_input)}, false )

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
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_grey;
        AppendChildIcon(el_input, img_src)
    }  // CreateBtnInactiveDelete

//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable() {
        //console.log("FillSelectTable");

        tblBody_select.innerText = null;
//--- loop through data_map
        for (const [map_id, item_dict] of customer_map.entries()) {
            const row_index = null // add at end when no rowindex
            let selectRow = CreateSelectRow(tblBody_select, el_data, "customer", row_index, item_dict,
                                        HandleSelectRow, HandleBtnInactiveClicked,
                                        imgsrc_inactive_grey);

// update values in SelectRow
            // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey
            UpdateSelectRow(selectRow, item_dict, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)
        }  // for (let cust_key in data_map) {
    } // FillSelectTable

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2019-10-20
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        //console.log("update_dict", update_dict);

//--- get info from update_dict["id"]
        const id_dict = get_dict_value_by_key (update_dict, "id");
        const tblName = get_dict_value_by_key(id_dict, "table");
        const pk_int = get_dict_value_by_key(id_dict, "pk");
        const ppk_int = get_dict_value_by_key(id_dict, "ppk");
        const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
        const map_id = get_map_id(tblName, pk_int);
        const is_created = ("created" in id_dict);
        const is_deleted = ("deleted" in id_dict);
        //console.log("is_deleted", is_deleted);

        let tblRow;
        if (!!map_id){
            tblRow = document.getElementById(map_id);
//--- replace updated item in map or remove deleted item from map
            update_map_item(map_id, update_dict);
        }

        if(selected_btn === "customer_form"){
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
            tblRow = CreateTblRow("tbody", tblName, pk_int, ppk_int)
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

    // reset addnew row
            ResetAddnewRow(tblName)

    //--- save pk in settings when created, set selected_customer_pk
            if (tblName === "customer"){
                selected_customer_pk = pk_int
                selected_order_pk = 0
            } else if (tblName === "order"){
                selected_customer_pk = ppk_int;
                selected_order_pk = pk_int;
            };
            const setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
            UploadSettings (setting_dict, url_settings_upload);

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
                const row_index = GetNewSelectRowIndex(tblBody_select, 0, update_dict, user_lang);
                const imgsrc_default = imgsrc_inactive_grey, imgsrc_hover = imgsrc_inactive_black;
                selectRow = CreateSelectRow(tblBody_select, el_data, tblName, row_index, update_dict,
                                            HandleSelectRow, HandleBtnInactiveDeleteClicked,
                                            imgsrc_default, imgsrc_hover )

        // imgsrc_inactive_lightgrey
                HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);
            } else{
        //--- get existing  selectRow
                const rowid_str = id_sel_prefix + map_id
                selectRow = document.getElementById(rowid_str);
            };
        console.log(" --- UpdateFromResponse  UpdateSelectRow---");
    //--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
            UpdateSelectRow(selectRow, update_dict, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)
        }  // if( tblName === "customer")

//--- remove 'updated, deleted created and msg_err from update_dict
        remove_err_del_cre_updated__from_itemdict(update_dict)

//--- refresh header text - alwas, not only when
        //if(pk_int === selected_customer_pk){
        UpdateHeaderText();

    }  // UpdateFromResponse

//========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(){
        //console.log("========= UpdateForm  =========");
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
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
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

// --- loop through cells of tablerow and UpdateField


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
        //console.log("========= UpdateField  ========= ", fldName, is_addnew_row);

// --- reset fields when update_dict is empty
        if (isEmpty(update_dict)){
            if (fldName === "inactive") {
                const field_dict = {value: false}
                // use
                format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_grey)
            } else {
                el_input.value = null
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-pk");
             }
        } else {
    // --- lookup field in update_dict, get data from field_dict
            if (fldName in update_dict){
                const tblName = get_subdict_value_by_key (update_dict, "id", "table");
                const field_dict = get_dict_value_by_key (update_dict, fldName);
                const value = get_dict_value_by_key (field_dict, "value");
                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_offset = (selected_btn === "customer_form") ? [-260, 210] : [-240, 210];

                if (["code", "name", "order", "identifier"].indexOf( fldName ) > -1){
                   format_text_element (el_input, el_msg, field_dict, is_addnew_row, msg_offset)

                } else if (fldName ===  "customer"){
                    // fldName "customer") is used in mode order
                    //console.log("field_dict: ", field_dict);
                    // abscat: use team_pk, but display order_code, is stored in 'value, team_code stored in 'code'
                    const customer_pk = get_dict_value_by_key (field_dict, "pk")
                    const customer_ppk = get_dict_value_by_key (field_dict, "ppk")
                    const customer_value = get_dict_value_by_key (field_dict, "value")
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
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                } else if (fldName === "rosterdate"){
                    const hide_weekday = (tblName === "planning") ? false : true;
                    const hide_year = (tblName === "planning") ?  true : false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, hide_weekday, hide_year)

                } else if (["timestart", "timeend"].indexOf( fldName ) > -1){
                    const title_overlap = null
                    format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)

                } else if (fldName === "billable"){
                    format_billable_element (el_input, field_dict,
                    imgsrc_billable_black, imgsrc_billable_cross_red, imgsrc_billable_grey, imgsrc_billable_cross_grey,
                    title_billable, title_notbillable,)
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
    function UpdateAddnewRow(sel_cust_pk, sel_cust_ppk, sel_cust_code ) {
        //console.log(" --- UpdateAddnewRow --- ", selected_btn)
       // console.log("sel_cust_pk: ", sel_cust_pk, "sel_cust_ppk: ", sel_cust_ppk, "sel_cust_code: ", sel_cust_code)
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
        //console.log(" >>>>>>>>>>>> txt_customer_select --- ")
                            el_input.value = get_attr_from_el(el_data, "data-txt_customer_select");
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

        let header_text = null;
        if (selected_btn === "customer") { //show 'Customer list' in header when List button selected
            header_text = get_attr_from_el_str(el_data, "data-txt_customer_list")
        } else if (!!selected_customer_pk) {
            const dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
            const customer_code = get_subdict_value_by_key(dict,"code", "value")
            if(!!selected_customer_pk){header_text = customer_code}
        } else {
            if (!!is_addnew_mode){
                // TODO is_addnew_mode is not defined yet
                header_text = get_attr_from_el_str(el_data, "data-txt_customer_add")
            } else {
                header_text = get_attr_from_el_str(el_data, "data-txt_customer_select");
            }
        }
        document.getElementById("id_hdr_text").innerText = header_text

    }  // UpdateHeaderText

//=========  UpdateHeaderPeriod ================ PR2019-11-09
    function UpdateHeaderPeriod() {
        // console.log( "===== UpdateHeaderPeriod  ========= ");
        let header_text = "";
        const period_txt = get_period_formatted(selected_period, month_list, weekday_list, user_lang);
        // console.log( "period_txt", period_txt);
        if (!!period_txt) {
            header_text = get_attr_from_el_str(el_data, "data-txt_period") + ": " + period_txt
        } else {
            header_text = get_attr_from_el_str(el_data, "data-txt_select_period") + "...";
        }
        // console.log( "header_text", header_text);
        document.getElementById("id_hdr_period").innerText = header_text
    }  // UpdateHeaderPeriod

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_list){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_list", setting_list)

        for (let i = 0, len = setting_list.length; i < len; i++) {
            const setting_dict = setting_list[i];
            //console.log("setting_dict", setting_dict)
            Object.keys(setting_dict).forEach(function(key) {
                if (key === "selected_pk"){
                    const sel_dict = setting_dict[key];
                    //console.log("sel_dict", sel_dict)
                    let sel_cust_pk = null, sel_cust_ppk = null, sel_cust_code = null; // used in UpdateAddnewRow
                    if ("sel_cust_pk" in sel_dict ){
                        selected_customer_pk = sel_dict["sel_cust_pk"];
// check if selected_customer_pk exists and is not inactive.
                        const map_id = get_map_id("customer", sel_dict["sel_cust_pk"]);
                        const map_dict = get_mapdict_from_datamap_by_id(customer_map, map_id);
                        if (!isEmpty(map_dict)) {
                            const inactive = get_subdict_value_by_key(map_dict, "inactive", "value", false)
                            if(!inactive){
                                selected_customer_pk = sel_dict["sel_cust_pk"];
                                sel_cust_pk = selected_customer_pk
                            } else {
                                selected_customer_pk = 0
                                selected_order_pk = 0
                            }
                            sel_cust_ppk = get_subdict_value_by_key(map_dict, "id", "ppk")
                            sel_cust_code = get_subdict_value_by_key(map_dict, "code", "value")
                        }

// ---  highlight row in item table, scrollIntoView
                        HighlightSelectedTblRowByPk(tblBody_items, selected_customer_pk)
// ---  highlight row in select table
                        HighlightSelectRowByPk(tblBody_select, selected_customer_pk, cls_bc_yellow, cls_bc_lightlightgrey)// ---  update header text
                        UpdateHeaderText();
// ---  put selected customer in addnew row of tbl 'order'

        // put pk and ppk of selected customer in addnew row of tbody_order
                        UpdateAddnewRow(sel_cust_pk, sel_cust_ppk, sel_cust_code)

                    }
                    if ("sel_order_pk" in sel_dict ){
                        selected_order_pk = sel_dict["sel_order_pk"];
                        //console.log("selected_order_pk", selected_order_pk, typeof selected_order_pk)
                    }
                }  // if (key === "selected_pk"){
                if (key === "page_customer"){
                    const page_dict = setting_dict[key];
                    //console.log("page_dict", page_dict)
                    if ("mode" in page_dict ){
                        selected_btn = page_dict["mode"];
                        HandleBtnSelect(selected_btn);

// ---  highlight row in order table lets HighlightSelectedTblRowByPk in customer table not work
                        //HighlightSelectedTblRowByPk(tblBody_items, selected_order_pk)
                        UpdateHeaderText();
                    }
                }  // if (key === "page_customer"){
                if (key === "planning_period"){
                    selected_period = setting_dict[key];
                    UpdateHeaderPeriod();
                }
            });
        };
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

            if(!!data_map.size){
                map_dict = data_map.get(map_id);
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
        // insert new item in alphabetical order, but no solution found yet
                data_map.set(map_id, update_dict)
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
        // console.log("--- UploadDeleteChanges  --------------");
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
            tr_changed.classList.add("tsa_tr_error");
            setTimeout(function (){
                tr_changed.classList.remove("tsa_tr_error");
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
            console.log("upload: ", upload_dict);

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

                    if ("customer_list" in response) {
                        get_datamap(response["customer_list"], customer_map)
                    }
                    if ("order_list" in response) {
                        get_datamap(response["order_list"], order_map)
                    }
                    if ("pricerate_list" in response) {
                        get_datamap(response["pricerate_list"], pricerate_map)
                        //FillTableRows();
                        //FilterTableRows(tblBody_items);
                    }
                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const update_dict = response["update_list"][i];
                            UpdateFromResponse(update_dict);
                        }
                    }
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
            const btnName = get_attr_from_el(tr_selected, "data-mode")
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
            el_popup_date_container.setAttribute("data-mode", btnName);
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
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//=========  ModPeriodOpen  ================ PR2019-10-28
    function ModPeriodOpen() {
        // console.log(" -----  ModPeriodOpen   ----")
        // when clicked on delete btn in form tehre is no tr_selected, use selected_customer_pk

        if(!isEmpty(selected_period)){
            if("datefirst" in selected_period){
                document.getElementById("id_mod_period_datefirst").value = selected_period["datefirst"]
            }
            if("datelast" in selected_period){
                document.getElementById("id_mod_period_datelast").value = selected_period["datelast"]
            }
        }
        //let el_mod_period_tblbody = document.getElementById("id_mod_period_tblbody");

        // ---  show modal, set focus on save button
        $("#id_mod_period").modal({backdrop: true});
    };  // ModPeriodOpen

//=========  ModPeriodSave  ================ PR2019-10-28
    function ModPeriodSave() {
        // console.log("===  ModPeriodSave  =====") ;
        $("#id_mod_period").modal("hide");

        const datefirst = document.getElementById("id_mod_period_datefirst").value
        const datelast = document.getElementById("id_mod_period_datelast").value

// ---  upload new selected_btn
        selected_period = {"datefirst": datefirst, "datelast": datelast};
        const upload_dict = {"planning_period": selected_period};
        UploadSettings (upload_dict, url_settings_upload);

        UpdateHeaderPeriod();
        let datalist_request = {"customer_planning": selected_period};
        DatalistDownload(datalist_request);
    }

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

        const data_key_01 = (tblName === "customer") ? "data-txt_this_customer" :
                            (tblName === "order") ? "data-txt_this_order" : null;
        const data_key_02 = (mode === "delete") ?  "data-txt_confirm_msg01_delete" :
                            (mode === "inactive") ? "data-txt_confirm_msg01_inactive" : null;
        const msg_01_txt = get_attr_from_el(el_data, data_key_01) + " " + get_attr_from_el(el_data, data_key_02)

// put text in modal form
        document.getElementById("id_confirm_header").innerText = cust_code;
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        const data_txt_btn_save = "data-txt_confirm_btn_" + mode
        document.getElementById("id_confirm_btn_save").innerText = get_attr_from_el(el_data, data_txt_btn_save);

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

//========= HandleFilterSelect  ====================================
    function HandleFilterSelect() {
        // console.log( "===== HandleFilterSelect  ========= ");
        // skip filter if filter value has not changed, update variable filter_select

        let new_filter = el_filter_select.value;

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
            FilterTableRows(tblBody_items)
            FilterSelectRows()

        } //  if (!skip_filter) {
    }; // function HandleFilterSelect

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        //console.log( "===== HandleFilterName  ========= ");

        //console.log( "el", el, typeof el);
        //console.log( "index", index, typeof index);
        //console.log( "el_key", el_key, typeof el_key);

        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        let tblRow = get_tablerow_selected(el);
        const mode = get_attr_from_el_str(el,"data-mode");
        let tblBody = document.getElementById("id_tbody_" + mode);

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
                    //console.log( "filter_dict[index]: ", filter_dict[index]);
                }
            }
        }

        if (!skip_filter) {
            FilterTableRows(tblBody);// Filter TableRows
            FilterSelectRows();
        } //  if (!skip_filter) {


    }; // function HandleFilterName

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive(el) {
        //console.log(" --- HandleFilterInactive --- ");
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        // filter is on sidebar, use imgsrc_inactive_lightgrey
        const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        FilterSelectRows();
        let tblBody = document.getElementById("id_tbody_" + selected_btn);
        //console.log("selected_btn", selected_btn);
        //console.log("tblBody", tblBody);
        FilterTableRows(tblBody);
    }  // function HandleFilterInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        //console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_customer_pk = 0;
        selected_order_pk = 0;

        const tblName = (selected_btn === "customer") ? "customer" :
                        (selected_btn === "order") ? "order" : null;
        if (!!tblName){
            let tblBody = document.getElementById("id_tbody_" + tblName)
            if(!!tblBody){
                FilterTableRows(tblBody);
            }

            let tblHead = document.getElementById("id_thead_" + tblName)
            if(!!tblHead){
                let filterRow = tblHead.rows[1];
                if(!!filterRow){
                    const column_count = tbl_col_count[tblName];
                    for (let j = 0, el; j < column_count; j++) {
                        el = filterRow.cells[j].children[0]
                        if(!!el){el.value = null}
                    }
                }
            }

            //--- reset filter of select table
            el_filter_select.value = null
            // reset icon of filter select table
            // debug: dont use el.firstChild, it also returns text and comment nodes, can give error
            // select table is in sidebar: use lightgrey instead of imgsrc_inactive_grey
            el_sel_inactive.children[0].setAttribute("src", imgsrc_inactive_lightgrey);

            FilterSelectRows()
            UpdateHeaderText();

            // reset customer name and pk in addnew row of tbody_order
            UpdateAddnewRow(0, 0, null);

        }  //  if (!!tblName){

    }  // function ResetFilterRows

//========= FilterSelectRows  ==================================== PR2019-08-28
    function FilterSelectRows() {
        // console.log( "===== FilterSelectRows  ========= ");
        // console.log( "filter_show_inactive", filter_show_inactive);
        for (let i = 0, len = tblBody_select.rows.length; i < len; i++) {
            let tblRow = tblBody_select.rows[i];
            if (!!tblRow){
                let hide_row = false
        // hide inactive rows when filter_show_inactive = false
                if(!filter_show_inactive){
                    const inactive_str = get_attr_from_el(tblRow, "data-inactive")
                    if (!!inactive_str) {
                        hide_row = (inactive_str.toLowerCase() === "true")
                    }
                }
        // show all rows if filter_select = ""
                if (!hide_row && !!filter_select){
                    let found = false
                    if (!!tblRow.cells[0]) {
                        let el_value = tblRow.cells[0].innerText;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
        // show row if filter_select is found in el_value
                            found = (el_value.indexOf(filter_select) !== -1)
                        }
                    }
                    hide_row = (!found)
                }  // if (!!filter_select)
                if (hide_row) {
                    tblRow.classList.add(cls_hide)
                } else {
                    tblRow.classList.remove(cls_hide)
                };
            }  // if (!!tblRow){
        }
    }; // FilterSelectRows

//========= FilterTableRows  ====================================
    function FilterTableRows(tblBody) {  // PR2019-06-24
        //console.log( "===== FilterTableRows  ========= ");
        let tblRows = tblBody.rows
        const len = tblBody.rows.length;
        //console.log( "tblBody.rows.length", len);

        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody.rows[i]
        //console.log( "tblRow", tblRow);

                show_row = ShowTableRow_dict(tblRow)
        //console.log( "show_row", show_row);

                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        };
    }; // function FilterTableRows

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15
        //console.log( "===== ShowTableRow_dict  ========= ");
        //console.log( "tblRow: ", tblRow);

        // function filters by inactive and substring of fields
        // also filters selected customer pk in table order
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

// 1. skip new row
    // check if row is_addnew_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select customer has no id in tblrow)
            const is_addnew_row = (get_attr_from_el(tblRow, "data-addnew") === "true");
            if(!is_addnew_row){

// 2. hide other customers when selected_customer_pk has value
            // only in table order, planning
                const tblName = get_attr_from_el(tblRow, "data-table");

                //console.log( "tblName: ", tblName);
                if (!hide_row && !!selected_customer_pk) {
                    if (["order", "planning"].indexOf(tblName) > -1) {
                        const row_customer_pk_str = get_attr_from_el(tblRow, "data-ppk");
                        //console.log( "row_customer_pk_str", row_customer_pk_str, typeof row_customer_pk_str);
                        //console.log( "selected_customer_pk", selected_customer_pk, typeof selected_customer_pk);
                        hide_row = (row_customer_pk_str !== selected_customer_pk.toString())
                        //console.log( "hide_row", hide_row, typeof hide_row);
                    }
                }

                // hide inactive rows if filter_show_inactive
                if(!hide_row && !filter_show_inactive){
                    const inactive_str = get_attr_from_el(tblRow, "data-inactive")
                    if (!!inactive_str && (inactive_str.toLowerCase() === "true")) {
                        hide_row = true;
                    }
                }

// show all rows if filter_name = ""
            // console.log(  "show_row", show_row, "filter_name",  filter_name,  "col_length",  col_length);
                if (!hide_row){
                    Object.keys(filter_dict).forEach(function(key) {
                        const filter_text = filter_dict[key];
                        const filter_blank = (filter_text ==="#")
                        let tbl_cell = tblRow.cells[key];
                        if (!!tbl_cell){
                            let el = tbl_cell.children[0];
                            if (!!el) {
                        // skip if no filter on this colums
                                if(!!filter_text){
                        // get value from el.value, innerText or data-value
                                    const el_tagName = el.tagName.toLowerCase()
                                    let el_value = null;
                                    if (el_tagName === "select"){
                                        el_value = el.options[el.selectedIndex].text;
                                    } else if (el_tagName === "input"){
                                        el_value = el.value;
                                    } else if (el_tagName === "a"){
                                        // skip
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
                    });  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)
            } //  if(!is_addnew_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

//##################################################################################

}); //$(document).ready(function()