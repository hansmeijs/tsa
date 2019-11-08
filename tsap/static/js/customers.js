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
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_active_lightgrey = get_attr_from_el(el_data, "data-imgsrc_active_lightgrey");

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

// ---  id of selected customer
        const id_sel_prefix = "sel_"
        let selected_customer_pk = 0;
        let selected_customer_dict = {};
        let selected_order_pk = 0;

        let selected_mode = "customer"
        let mod_upload_dict = {};
        let company_pk ;

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let filter_select = "";
        let filter_show_inactive = false;
        let filter_dict = {};

        let customer_map = new Map();
        let order_map = new Map();
        let pricerate_map = new Map();
        let roster_map = new Map();

        const tbl_col_count = {
            "customer": 3,
            "order": 6,
            "pricerate": 4};
        const thead_text = {
            "customer": ["txt_shortname", "txt_customer_name", ""],
            "order": ["txt_shortname", "txt_order_name", "txt_datefirst", "txt_datelast", "", ""],
            "pricerate": ["txt_orderschemeshift", "txt_pricerate", "txt_billable", "txt_asof"]}
        const field_names = {
            "customer": ["code", "name", "delete"],
            "order": ["code", "name", "datefirst", "datelast", "inactive", "delete"],
            "pricerate": ["code", "priceratejson", "billable", "datefirst"]}
        const field_tags = {
            "customer": ["input", "input", "a"],
            "order": ["input", "input", "input", "input", "a", "a"],
            "pricerate": ["input", "input", "a", "input"]}
        const field_width = {
            "customer": ["180", "220", "032"],
            "order": ["180", "220", "120", "120", "032", "032"],
            "pricerate": ["220", "150", "120", "150"]}
        const field_align = {
            "customer": ["left", "left", "right"],
            "order": ["left", "left", "left", "left", "right",  "right"],
            "pricerate": ["left", "right", "center", "left"]}

// get elements
        let tblHead_items = document.getElementById("id_thead_items");
        let tblBody_items = document.getElementById("id_tbody_items");
        let tblBody_select = document.getElementById("id_tbody_select");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

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
            btn.addEventListener("click", function() {HandleButtonSelect(mode)}, false )
        }

// === event handlers for MODAL ===

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

// --- create Submenu
        // no submenus yet

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_cust"));

        // skip cat: 512=absence, 4096=template, # inactive=None: show all
        const datalist_request = {
            "setting": {"page_customer": {"mode": "get"}, "selected_pk": {"mode": "get"}},
            "company": {value: true},
            "customer": {cat_lt: 512},
            "order": {cat_lt: 512, "inactive": true},
            "order_pricerate": {value: true}};
        DatalistDownload(datalist_request);
//  #############################################################################################################

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

        // --- hide loader
                el_loader.classList.add(cls_visible_hide)
                let fill_tblRows = false;
                if ("company_list" in response) {
                    const dict = response["company_list"][0];
                    company_pk = get_dict_value_by_key(dict, "pk")
                }
                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)

                    FillSelectTable();
                    FilterSelectRows;

                    fill_tblRows = true;

                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                }
                if ("order_pricerate_list" in response) {
                    get_datamap(response["order_pricerate_list"], pricerate_map)
                    //FillTableRows();
                }
                // setting_list must go after FillSelectTable() and before FillTableRows();
                if ("setting_list" in response) {
                    UpdateSettings(response["setting_list"])
                }
                if(fill_tblRows){
                    FillTableRows();
                    FilterTableRows_dict(tblBody_items);
                };

            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//##################################################################################
// +++++++++++++++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items and form input boxes
        tblBody_items.innerText = null;

// --- get  data_map
        const form_mode = (selected_mode === "customer_form");
        const tblName = (selected_mode === "customer_form") ? "customer" : selected_mode;
        const data_map = (selected_mode === "order") ? order_map :
                         (selected_mode === "pricerate") ? pricerate_map :
                         customer_map;
        let selected_pk = 0;
        if (selected_mode === "customer"){
            selected_pk = selected_customer_pk
        } else if (selected_mode === "order"){
            selected_pk = selected_order_pk
        };
        console.log("selected_mode", selected_mode);
        console.log("selected_customer_pk", selected_customer_pk);
        console.log("selected_order_pk", selected_order_pk);
        console.log("selected_pk", selected_pk);


        if (form_mode){
            UpdateForm()
        } else {
            if(!!data_map){
// --- loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const pk_int = get_pk_from_dict(item_dict)
                    const ppk_int = get_ppk_from_dict(item_dict)
                    const row_tblName = get_subdict_value_by_key(item_dict, "id", "table")

                    // in mode order or pricerate: show only rows of selected_customer_pk
                    let add_Row = false;
                    if (["order", "pricerate"].indexOf( selected_mode ) > -1){
                        const row_customer_pk = get_subdict_value_by_key(item_dict, "customer", "pk")
                        add_Row = (!!row_customer_pk && row_customer_pk === selected_customer_pk);
                    } else {
                        add_Row = true;
                    }
                    if(add_Row) {
                        let tblRow = CreateTblRow(row_tblName, pk_int.toString(), ppk_int.toString(), false)
                        UpdateTableRow(tblRow, item_dict)
        // --- highlight selected row
                        if (pk_int === selected_pk) {
                            tblRow.classList.add(cls_selected)
                        }
                    }  // if (add_Row)
                }  //  for (const [pk_int, item_dict] of data_map.entries())
            }  // if(!!data_map){

    // === add row 'add new'
            let show_new_row = false
            if (selected_mode === "order" && !!selected_customer_pk) {
                show_new_row = true;
            } else if (selected_mode === "customer") {
                show_new_row = true;
            }
            //console.log("sel_mode", selected_mode, "sel_custr_pk", selected_customer_pk, "show_new_row", show_new_row)
            if (show_new_row) {
                id_new = id_new + 1
                const pk_new = "new" + id_new.toString()
                const ppk_int = (selected_mode === "order") ? selected_customer_pk : company_pk

                let dict = {};
                dict["id"] = {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}

                let tblRow = CreateTblRow(tblName, pk_new, ppk_int.toString(), true)
                UpdateTableRow(tblRow, dict)
            }
        }  // if (form_mode)

        if (form_mode){
            document.getElementById("id_div_data_form").classList.remove("display_hide");
            document.getElementById("id_div_data_table").classList.add("display_hide");
        } else {
            document.getElementById("id_div_data_form").classList.add("display_hide");
            document.getElementById("id_div_data_table").classList.remove("display_hide");
            CreateTblHeader();
        };
    }  // FillTableRows(

//=========  CreateTblHeader  === PR2019-05-27
    function CreateTblHeader() {
        //console.log("===  CreateTblHeader == ");

        tblHead_items.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.
        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.

//--- insert td's to tblHead_items
        const tblName = selected_mode;
        const column_count = tbl_col_count[tblName];

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add div to th, margin not workign with th
            let el = document.createElement("div");
            th.appendChild(el)

// --- add img billable and delete
            //if ((tblName === "customer" && j === 2) || (tblName === "order" && j === 5))  {
            //    AppendChildIcon(el, imgsrc_delete)
            //    el.classList.add("ml-4")
            //} else if (tblName === "order" && j === 776)  {
           //     //AppendChildIcon(el, imgsrc_billable_black)
            //} else {
// --- add innerText to th
                el.innerText = get_attr_from_el(el_data, "data-" + thead_text[tblName][j])
                el.setAttribute("overflow-wrap", "break-word");
            //}

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}
// --- add width to el
            el.classList.add("td_width_" + field_width[selected_mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[selected_mode][j])

        }  // for (let j = 0; j < column_count; j++)
    };  //function CreateTblHeader

//=========  CreateTblRow  ================ PR2019-09-04
    function CreateTblRow(tblName, pk_str, ppk_str, is_new_row ) {
        //console.log("=========  CreateTblRow =========");

        let tblRow;
        if (!!tblName){

    // --- insert tblRow ino tblBody_items
            tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            const map_id = tblName + pk_str;
            tblRow.setAttribute("id", map_id);
            tblRow.setAttribute("data-map_id", map_id );
            tblRow.setAttribute("data-pk", pk_str);
            tblRow.setAttribute("data-ppk", ppk_str);
            tblRow.setAttribute("data-table", tblName);

    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow, tblName, "list");}, false )

    // --- add grey color to row 'order' and 'scheme' in list pricerate.
            if (selected_mode === "pricerate"){
                if (tblName === "order"){
                    tblRow.classList.add("tsa_bc_lightgrey")
                } else if (tblName === "scheme"){
                    tblRow.classList.add("tsa_bc_lightlightgrey")
                }
            }

//+++ insert td's into tblRow
            const column_count = tbl_col_count[selected_mode];
            for (let j = 0; j < column_count; j++) {
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);

    // --- create element with tag from field_tags
                let el = document.createElement(field_tags[selected_mode][j]);

    // --- add data-field Attribute.
                el.setAttribute("data-field", field_names[selected_mode][j]);

    // --- add img delete to col_delete, not in addnew row
                if ((tblName === "customer" && j === 2 ) || (tblName === "order" && j === 5)) {
                    if (!is_new_row){
                        CreateBtnInactiveDelete("delete", tblRow, el)
                    }
                } else if (selected_mode === "order" && j === 4 ) {
    // --- column inactive, , not in addnew row
                    if (!is_new_row){
                        CreateBtnInactiveDelete("inactive", tblRow, el)
                    }
    // --- column billable
                } else if (selected_mode === "pricerate" && j === 2 ) {
                    if(!is_new_row) {
                        el.setAttribute("href", "#");
                        el.addEventListener("click", function(){
                            HandleBillableClicked(el)
                            }, false )
                        AppendChildIcon(el, imgsrc_stat00)
                        el.setAttribute("data-field", field_names[selected_mode][j]);
                        el.classList.add("ml-4")
                        //td.appendChild(el);
                    };
                } else {

    // --- add type and input_text to el.
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");

    // --- add EventListener to td
                    if (selected_mode === "pricerate"){
                        if ([1].indexOf( j ) > -1){
                            el.addEventListener("change", function() {UploadElChanges(el);}, false)
                        };
                    } else {
                        if (tblName === "customer"){
                            if ([0, 1].indexOf( j ) > -1){
                                el.addEventListener("change", function() {UploadElChanges(el)}, false )
                            }
                        } else if (tblName === "order"){
                            if ([0, 1, 4].indexOf( j ) > -1){
                                el.addEventListener("change", function() {UploadElChanges(el);}, false)
                            } else if ([2, 3].indexOf( j ) > -1){
                                el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false);
                                // class input_popup_date is necessary to skip closing popup
                                el.classList.add("input_popup_date")
                            };
                        }
                    }  //  if (selected_mode === "pricerate"){

                }  // if ((tblName === "order" && j === 7) || (tblName === "customer" && j === 2 ))

// --- add placeholder, // only when is_new_row.
                if (j === 0 && is_new_row ){ // only when is_new_row
                    if (tblName === "customer"){
                        el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_customer_add") + "...")
                    } else if (tblName === "order"){
                        el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_order_add") + "...")
                    }
                }

    // --- add margin to first column
                if (j === 0 ){el.classList.add("ml-2")}
// --- add width to el
                el.classList.add("td_width_" + field_width[selected_mode][j])
// --- add text_align
                el.classList.add("text_align_" + field_align[selected_mode][j])


// --- add other classes to td - Necessary to skip closing popup
                el.classList.add("border_none");

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);

            }  // for (let j = 0; j < 8; j++)
        }  // if (!!tblName)
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
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_active_lightgrey;
        AppendChildIcon(el_input, img_src)
    }  // CreateBtnInactiveDelete

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
                const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
                const map_id = (!!pk_str) ? tblName + pk_str : null
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

// --- deleted record
            if (is_deleted){
            // TODO check if parameter tblRow works
                //const tblRow = document.getElementById(map_id)
                if (!!tblRow){tblRow.parentNode.removeChild(tblRow)}

// --- show error message of row
            } else if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    el_input.classList.add("border_bg_invalid");
                    const msg_offset = [-240, 200];
                    ShowMsgError(el_input, el_msg, msg_err, msg_offset);
                }

// --- new created record
            } else if (is_created){
// insert new row in alfabetic order
                let tblBody = tblRow.parentNode;
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                tblBody.insertBefore(tblRow, tblBody.childNodes[row_index]);

// update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_str);
                tblRow.setAttribute("data-ppk", ppk_str);
                tblRow.setAttribute("data-table", tblName);
// remove temp_pk from tblRow
                tblRow.removeAttribute("temp_pk");

// remove placeholder from element 'code
                let el_code = tblRow.cells[0].children[0];
                if (!!el_code){el_code.removeAttribute("placeholder")}
// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkClass(tblRow)
// add delete button, only if it does not exist
                const j = (tblName === "customer") ? 2 : (tblName === "order") ? 5 : null;
                if (!!j){
                    let el_delete = tblRow.cells[j].children[0];
                    if(!!el_delete){
                        // only if not exists, to prevent doucle images
                        if(el_delete.children.length === 0) {
                            CreateBtnInactiveDelete("delete", tblRow, el_delete)
                        }
                    }
                }
            };  // if (is_created){

            // tblRow can be deleted if (is_deleted)
            if (!!tblRow){
                const is_inactive = get_subdict_value_by_key (update_dict, "inactive", "value", false);
                tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        UpdateField(el_input, update_dict);
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                // add delete button in new row
                        if (is_created && fieldname === "delete") {
        console.log("--- IN USE ??? : add delete button in new row  --------------");
                            let el = document.createElement("a");
                            el.setAttribute("href", "#");
                            el.addEventListener("click", function(){ ModConfirmOpen("delete", el)}, false )
                            AppendChildIcon(el, imgsrc_delete)
                            td.appendChild(el);
                        }
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)
        };  // if (!isEmpty(update_dict) && !!tblRow)
    }  // function UpdateTableRow

//========= UpdateField  ============= PR2019-10-09
    function UpdateField(el_input, update_dict){
       // console.log("========= UpdateField  =========");
        //console.log(update_dict);

        const fieldname = get_attr_from_el(el_input, "data-field");
// --- reset fields when update_dict is empty
        if (isEmpty(update_dict)){
            if (fieldname === "inactive") {
                const field_dict = {value: false}
                format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active)
            } else {
                el_input.value = null
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-pk");
             }
        } else {
    // --- lookup field in update_dict, get data from field_dict
            if (fieldname in update_dict){
                const tblName = get_subdict_value_by_key (update_dict, "id", "table");
                const field_dict = get_dict_value_by_key (update_dict, fieldname);
                const value = get_dict_value_by_key (field_dict, "value");
                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_offset = (selected_mode === "customer_form") ? [-260, 210] : [-240, 210];

                if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

                if (["code", "name", "identifier"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict, msg_offset)
                } else if (["priceratejson"].indexOf( fieldname ) > -1){
                   format_price_element (el_input, el_msg, field_dict, msg_offset, user_lang)
                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                } else if (fieldname === "billable"){
                    format_billable_element (el_input, field_dict,
                    imgsrc_billable_black, imgsrc_billable_cross_red, imgsrc_billable_grey, imgsrc_billable_cross_grey,
                    title_billable, title_notbillable,)
                } else if (fieldname === "inactive") {
                   if(isEmpty(field_dict)){field_dict = {value: false}}
                   format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active_lightgrey)
                };
            }  // if (fieldname in update_dict)
        } // if (isEmpty(update_dict))

   }; // UpdateField

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked)
        tr_clicked.classList.add(cls_selected)

// ---  update selected_customer_pk
        // TODO in table pricerate table rows have differnet table names (order scheme, shift)
        const tblName = get_attr_from_el(tr_clicked, "data-table");
        const pk_str = get_attr_from_el(tr_clicked, "data-pk");
        console.log( "tblName: ", tblName);
        console.log( "pk_str: ", pk_str, typeof pk_str);
        let setting_dict = {}
        if (tblName === "customer"){
            let new_customer_pk = 0
            selected_customer_dict = {};
            const map_id = get_attr_from_el_str(tr_clicked, "data-map_id")
            if (!!map_id){
                selected_customer_dict = get_mapdict_from_datamap_by_id(customer_map, map_id);
                new_customer_pk = get_pk_from_dict(selected_customer_dict);
            };
// ---  update selected__pk
            // deselect selected_order_pk when selected customer changes
            if(new_customer_pk !== selected_customer_pk){selected_order_pk = 0}
            selected_customer_pk = new_customer_pk

// --- save selected_customer_pk in Usersettings
            setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};

// ---  update header text
            UpdateHeaderText();

    // ---  highlight row in select table
            const row_id = id_sel_prefix + tblName + selected_customer_pk.toString();
            let selectRow = document.getElementById(row_id);
            HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

        } else if (tblName === "order"){
            selected_order_pk = parseInt(pk_str);
            console.log( "selected_order_pk: ", selected_order_pk);

// --- save selected_customer_pk in Usersettings
            setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};

        };  // if (tblName === "customer")

        if(!isEmpty(setting_dict)){
            UploadSettings (setting_dict, url_settings_upload);
        }
    }


// TODO: add HandleButtonCustomerAdd and HandleCustomerAdd and UploadFormChanges and UploadPricerateChanges(??)
//========= HandleButtonCustomerAdd  ============= PR2019-10-12
//========= HandleCustomerAdd  ============= PR2019-09-24
    function HandleCustomerAdd(){
        console.log(" --- HandleCustomerAdd --- ")

        selected_customer_pk = 0
        //console.log( "selected_customer_pk", selected_customer_pk )

        // ---  remove highlights from select tables
        DeselectHighlightedTblbody(tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
        let el_form_code = document.getElementById("id_form_cust_code")
        document.getElementById("id_form_cust_name").value = null;
        el_form_code.value = null;
        el_form_code.value = null;
        el_form_code.placeholder = get_attr_from_el(el_data, "data-txt_cust_code_enter")

        el_form_code.focus();
        document.getElementById("id_form_btn_add").disabled = true;
    }

//##################################################################################
// +++++++++++++++++ FILL and UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

    //========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(){
        //console.log("========= UpdateForm  =========");

        const customer_pk = get_pk_from_dict (selected_customer_dict)
        const readonly = (!customer_pk);

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, len = form_elements.length; i < len; i++) {
            let el_input = form_elements[i];
            el_input.readOnly = readonly;
            UpdateField(el_input, selected_customer_dict);
        }
    };


//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable() {
        console.log("FillSelectTable");

        tblBody_select.innerText = null;
//--- loop through customer_map
        for (const [map_id, item_dict] of customer_map.entries()) {
            let selectRow = CreateSelectRow(item_dict)
// update values in SelectRow
             UpdateSelectRow(selectRow, item_dict)
        }  // for (let cust_key in customer_map) {
    } // FillSelectTable

//========= CreateSelectRow  ============= PR2019-10-20
    function CreateSelectRow(item_dict, row_index) {
        console.log("CreateSelectRow");

        const tblName = "customer";
        if(row_index == null){row_index = -1}
        let tblRow;
        if (!isEmpty(item_dict)) {
//--- get info from item_dict
            const id_dict = get_dict_value_by_key (item_dict, "id");
                const tblName = ("table" in id_dict) ? id_dict["table"] : null;
                const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
                const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
                const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
                const map_id = (!!pk_int) ? tblName + pk_int.toString() : null
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            const inactive_value = get_subdict_value_by_key(item_dict, "inactive", "value", false);

//--------- insert tblBody_select row
            const row_id = id_sel_prefix + map_id
            tblRow = tblBody_select.insertRow(row_index);
            tblRow.setAttribute("id", row_id);
            tblRow.setAttribute("data-map_id", map_id );
            tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-inactive", inactive_value);

            tblRow.classList.add(cls_bc_lightlightgrey);

    //- add hover to select row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

    // --- add first td to tblRow.
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            // el_a.innerText and el_a.setAttribute("data-value") are added in UpdateSelectRow
            let el_a = document.createElement("div");
                el_a.setAttribute("data-field", "code");
                td.appendChild(el_a);
            td.classList.add("px-2")

            td.addEventListener("click", function() {
                HandleSelectTable(tblRow);
            }, false)

    // --- add active img to second td in table
            td = tblRow.insertCell(-1);
                el_a = document.createElement("a");
                el_a.addEventListener("click", function(){
                    // HandleSelectTable(tblRow);
                    HandleBtnInactiveDeleteClicked("inactive", el_a)
                }, false )
                el_a.setAttribute("href", "#");
                el_a.setAttribute("data-field", "inactive");
                el_a.setAttribute("data-value", inactive_value);

                AppendChildIcon(el_a, imgsrc_active_lightgrey);
                td.appendChild(el_a);
            td.classList.add("td_width_032");

        }  //  if (!isEmpty(item_dict))
        return tblRow;
    } // CreateSelectRow

//========= UpdateSelectRow  ============= PR2019-10-20
    function UpdateSelectRow(selectRow, update_dict) {
        console.log("UpdateSelectRow");
        console.log("update_dict", update_dict);

        if(!!selectRow && !!update_dict){
            //const id_dict = get_dict_value_by_key (update_dict, "id");
            //const is_deleted = ("deleted" in id_dict);
            const is_deleted = (!!get_subdict_value_by_key (update_dict, "id", "deleted"));
            console.log( "is_deleted", is_deleted);

// --- deleted record
            if(!!is_deleted) {
                selectRow.parentNode.removeChild(selectRow)
            } else {

// --- get first td from selectRow.
                const code_value = get_subdict_value_by_key(update_dict, "code", "value", "")
                let el_input = selectRow.cells[0].children[0]
                el_input.innerText = code_value;
                el_input.setAttribute("data-value", code_value);

// --- add active img to second td in table
                const inactive_dict = get_dict_value_by_key(update_dict, "inactive")
                if(!isEmpty(inactive_dict)){
                    const inactive_value = get_dict_value_by_key(inactive_dict, "value", false);
                    selectRow.setAttribute("data-inactive", inactive_value);

                    let el_input = selectRow.cells[1].children[0]
                    format_inactive_element (el_input, inactive_dict, imgsrc_inactive, imgsrc_active_lightgrey)

// make el_input green for 2 seconds
                    if("updated" in inactive_dict){
                        // make el_input green for 2 seconds
                        el_input.classList.add("border_valid");
                        setTimeout(function (){
                            el_input.classList.remove("border_valid");
                            // let row disappear when inactive and not filter_show_inactive
                            if(!filter_show_inactive && inactive_value){
                                selectRow.classList.add("display_hide")
                            }
                        }, 2000);
                    }  //  if("updated" in inactive_dict){
                }  //  if(!isEmpty(inactive_dict))

            }  //  if(!!is_deleted)

        }  //  if(!!selectRow && !!update_dict){
    } // UpdateSelectRow

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");

        let header_text = null;
        if (selected_mode === "customer") { //show 'Customer list' in header when List button selected
            header_text = get_attr_from_el_str(el_data, "data-txt_customer_list")
        } else if (!!selected_customer_pk) {
            const customer_code = get_subdict_value_by_key(selected_customer_dict,"code", "value")
            if(!!selected_customer_pk){header_text = customer_code}
        } else {
            if (!!is_addnew_mode){
                // TODO is_addnew_mode is not defined yet
                header_text = get_attr_from_el_str(el_data, "data-txt_customer_add")
            } else {
                header_text = get_attr_from_el_str(el_data, "data-txt_customer_select")
            }
        }
        document.getElementById("id_hdr_text").innerText = header_text

    }  // UpdateHeaderText

//=========  UpdateFromResponse  ================ PR2019-10-20
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        //console.log("update_dict", update_dict, typeof update_dict);

//--- get info from update_dict["id"]
        const id_dict = get_dict_value_by_key (update_dict, "id");
            const tblName = ("table" in id_dict) ? id_dict["table"] : null;
            const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
            const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
            const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
            const map_id = (!!pk_int) ? tblName + pk_int.toString() : null
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);

        if(selected_mode === "customer_form"){
            UpdateForm()
        } else {

//--- reset selected_customer when deleted
            if(is_deleted){
                selected_customer_pk = 0;
                selected_customer_dict = {};
            }

//--- lookup table row of updated item
            // created row has id 'customernew_1', existing has id 'customer379'
            // 'is_created' is false when creating failed, use instead: (!is_created && !map_id)
            const row_id_str = ((is_created) || (!is_created && !map_id)) ? tblName + "_" + temp_pk_str : map_id;
            let tblRow = document.getElementById(row_id_str);

//--- update Table Row
            UpdateTableRow(tblRow, update_dict)

// add new empty row
            if (is_created){
                id_new = id_new + 1
                const pk_new = "new" + id_new.toString()
                const new_dict = {"id":{"pk": pk_new, "ppk": ppk_int}}
                let new_tblRow = CreateTblRow(tblName, pk_new, ppk_int.toString(), true)
                UpdateTableRow(new_tblRow, new_dict)
            }  // if (is_created)
        }  // if(selected_mode === "customer_form")

//--- save pk in settings when created, set selected_customer_pk
        if(is_created){
            if (tblName === "customer"){
                selected_customer_pk = pk_int
                selected_order_pk = 0
            } else if (tblName === "order"){
                selected_customer_pk = ppk_int;
                selected_order_pk = pk_int;
            };
            const setting_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
            UploadSettings (setting_dict, url_settings_upload);
        }  // if(is_created){

//--- insert new selectRow if is_created, highlight selected row
        if( tblName === "customer"){
            let selectRow;
            if(is_created){
                const row_index = GetNewSelectRowIndex(tblBody_select, 0, update_dict, user_lang);
                selectRow = CreateSelectRow(update_dict, row_index)
                HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);
            } else{
        //--- get existing  selectRow
                const rowid_str = id_sel_prefix + map_id
                selectRow = document.getElementById(rowid_str);
            };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
            UpdateSelectRow(selectRow, update_dict);
        }  // if( tblName === "customer")

//--- remove 'updated, deleted created and msg_err from update_dict
        remove_err_del_cre_updated__from_itemdict(update_dict)

//--- replace updated item in map or remove deleted item from map
        let data_map = (tblName === "customer") ? customer_map :
                       (tblName === "order") ? order_map :
                       (tblName === "teammember") ? teammember_map : null
        if(is_deleted){
            data_map.delete(map_id);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(map_id, update_dict)
        } else {
            data_map.set(map_id, update_dict)
        }

//--- refresh header text - alwas, not only when
        //if(pk_int === selected_customer_pk){
            UpdateHeaderText();
        //}
    }  // UpdateFromResponse


//##################################################################################
// +++++++++++++++++ EVENT HANDLERS ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  HandleButtonSelect  ================ PR2019-05-25
    function HandleButtonSelect(mode, btn_selected) {
        //console.log( "===== HandleButtonSelect ========= ", mode);

        selected_mode = mode

        const upload_dict = {"page_customer": {"mode": selected_mode}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  deselect all highlighted row, select clicked button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const data_mode = get_attr_from_el(btn,"data-mode")
            if (data_mode === selected_mode){
                btn.classList.add("tsa_btn_selected")
            } else {
                btn.classList.remove("tsa_btn_selected")
            }
        }

// --- update header text
        UpdateHeaderText()

// --- create header row
        CreateTblHeader();

// --- fill table
        FillTableRows();

    }  // HandleButtonSelect

//=========  HandleSelectTable ================ PR2019-08-28
    function HandleSelectTable(sel_tr_clicked) {
        //console.log( "===== HandleSelectTable  ========= ");
        //console.log( sel_tr_clicked);

        if(!!sel_tr_clicked) {
 // ---  highlight clicked row in select table
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// ---  update selected_customer_pk
            selected_customer_pk = 0
            selected_customer_dict = {};
            const map_id = get_attr_from_el_str(sel_tr_clicked, "data-map_id")
            if (!!map_id){
                selected_customer_dict = get_mapdict_from_datamap_by_id(customer_map, map_id);
                const customer_pk = get_pk_from_dict(selected_customer_dict);
                if(customer_pk !== selected_customer_pk){
                    selected_customer_pk = customer_pk;
// --- deselect selected_order_pk when selected customer changes
                    selected_order_pk = 0
// --- save selected_customer_pk in Usersettings
                    const upload_dict = {"selected_pk": { "sel_cust_pk": selected_customer_pk, "sel_order_pk": selected_order_pk}};
                    UploadSettings (upload_dict, url_settings_upload);
                }
            }

// ---  highlight row in list table
            HighlightSelectedTblRowByPk(tblBody_items, selected_customer_pk)

// ---  update header text
            UpdateHeaderText()

// ---  update customer form
            if(selected_mode === "customer_form"){
                if(!isEmpty(item_dict)){UpdateForm(item_dict)}
            } else {
                FillTableRows()
            };

// ---  enable delete button
            document.getElementById("id_form_btn_delete").disabled = (!selected_customer_pk)
        }  // if(!!sel_tr_clicked)


// ---  enable add button, also when no customer selected
        document.getElementById("id_form_btn_add").disabled = false;

    }  // HandleSelectTable

//========= HandleBillableClicked  ============= PR2019-09-27
    function HandleBillableClicked(el_changed) {
        console.log("======== HandleBillableClicked  ========");
        if(!!el_changed){
            const tblRow = get_tablerow_selected(el_changed);
            if(!!tblRow){
                const pk_str = get_attr_from_el(tblRow, "data-pk")
                const tblName = get_attr_from_el(tblRow, "data-table")
                const map_id = tblName + pk_str;
                const itemdict = get_mapdict_from_datamap_by_id(pricerate_map, map_id)
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


//##################################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= UploadFormChanges  ============= PR2019-10-05
//========= UploadPricerateChanges  ============= PR2019-10-09

//========= UploadFormChanges  ============= PR2019-09-23
    function UploadFormChanges(el_input) {
        console.log( " ==== UploadFormChanges ====");
        let id_dict = {}, upload_dict = {};
        if(!!el_input){
            if(!selected_customer_pk){
                // get new temp_pk
                id_new = id_new + 1
                const temp_pk_str = "new" + id_new.toString()
                id_dict = {temp_pk: temp_pk_str, "create": true, "table": "customer", "mode": selected_mode}
            } else {
                // update existing record
                // TODO check if this works
                const map_id = "customer" + selected_customer_pk.toString();
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

//========= HandleBtnInactiveDeleteClicked  ============= PR2019-09-23
    function HandleBtnInactiveDeleteClicked(mode, el_input) {
        console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        //console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const tblName = get_attr_from_el(tblRow, "data-table")
            const map_id = tblName + pk_str;
            let map_dict;
            if (tblName === "customer"){ map_dict = customer_map.get(map_id)} else
            if (tblName === "order") { map_dict = order_map.get(map_id)} else
            if (tblName === "roster"){ map_dict = roster_map.get(map_id)};

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
                format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive, imgsrc_active_lightgrey)
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


//========= UploadElChanges  ============= PR2019-09-23
    function UploadElChanges(el_input) {
        console.log( " ==== UploadElChanges ====");
        console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
// ---  create id_dict
            // 'get_iddict_from_element' gets 'data-pk', 'data-ppk', 'data-table', 'data-mode', 'data-cat' from element
            // and puts it as 'pk', 'ppk', 'temp_pk', 'create', 'mode', 'cat' in id_dict
            // id_dict = {'temp_pk': 'new_4', 'create': True, 'ppk': 120}
            let id_dict = get_iddict_from_element(tblRow);
            const tblName = get_dict_value_by_key(id_dict, "table")

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

//========= UploadDeleteChanges  ============= PR2019-10-23
    function UploadDeleteChanges(upload_dict, url_str) {

// if delete: add 'delete' to id_dict and make tblRow red
    const is_delete = (!!get_subdict_value_by_key(upload_dict, "id","delete"))

    if(is_delete){
        const pk_str = get_subdict_value_by_key(upload_dict, "id", "pk");
        const tblName = get_subdict_value_by_key(upload_dict, "id", "table");
        const id_str = tblName + pk_str;

        let tr_changed = document.getElementById(id_str);
        if(!!tr_changed){
            tr_changed.classList.add("tsa_tr_error");
            setTimeout(function (){
                tr_changed.classList.remove("tsa_tr_error");
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
            const parameters = {"upload": JSON.stringify (upload_dict)};



            console.log("url_str: ", url_str );
            console.log("upload: ", upload_dict);

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
                       // FillSelectTable();
                    }
                    if ("order_list" in response) {
                        get_datamap(response["order_list"], order_map)
                    }
                    if ("pricerate_list" in response) {
                        get_datamap(response["pricerate_list"], pricerate_map)
                        FillTableRows();
                        FilterTableRows_dict(tblBody_items);
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
        console.log("===  HandlePopupDateOpen  =====") ;

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
        console.log("===  function HandlePopupDateSave =========");

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
                console.log (">>> upload_dict: ", upload_dict);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_customer_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log (">>> response", response);
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
//=========  ModRateOpen  ================ PR2019-06-23
    function ModRateOpen(mode, tr_selected) {
        console.log(" -----  ModRateOpen   ----", mode)

        $("#id_mod_rate").modal({backdrop: true});

    }
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-06-23
    function ModConfirmOpen(mode, el_input) {
        console.log(" -----  ModConfirmOpen   ----", mode)

        const tblRow = get_tablerow_selected(el_input);

        let tblName, cust_code;
        // tblRow is undefined when el_input = undefined
        if(!!tblRow){
            tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const map_id = tblName + pk_str;
            let map_dict;
            if (tblName === "customer"){
                map_dict = customer_map.get(map_id);
            } else if (tblName === "order") {
                map_dict = order_map.get(map_id);
            };
            cust_code = get_subdict_value_by_key(map_dict, "code", "value")
        } else {
            // get info from mod_upload_dict
            tblName = get_subdict_value_by_key(mod_upload_dict, "id", "table")
            cust_code = get_subdict_value_by_key(mod_upload_dict, "code", "value")
        }

        let msg_01_txt;
        if (mode === "inactive"){
            if (tblName === "customer"){
                msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_inactive");
            } else if (tblName === "order") {
                // TODO add inactive order
            }
        } else if (mode === "delete"){
            if (tblName === "customer"){
                msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_customer_delete");
            } else if (tblName === "order") {
                msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_order_delete");
            }
        }
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
// ---  hide modal
        $("#id_mod_confirm").modal("hide");
// ---  Upload Changes
        const url_str = url_customer_upload
        UploadDeleteChanges(mod_upload_dict, url_str);

    }

//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive(el) {
        //console.log(" --- HandleFilterInactive --- ");
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive : imgsrc_active;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        FilterSelectRows();
        FilterTableRows_dict(tblBody_items);
    }  // function HandleFilterInactive

//========= HandleFilterSelect  ====================================
    function HandleFilterSelect() {
        console.log( "===== HandleFilterSelect  ========= ");
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
            FilterTableRows_dict(tblBody_items)
            FilterSelectRows()

        } //  if (!skip_filter) {
    }; // function HandleFilterSelect

//========= FilterSelectRows  ==================================== PR2019-08-28
    function FilterSelectRows() {
        //console.log( "===== FilterSelectRows  ========= ");
        for (let i = 0, len = tblBody_select.rows.length; i < len; i++) {
            let hide_row = false
            let tblRow = tblBody_select.rows[i];
            if (!!tblRow){
                // show all rows if filter_select = ""
                if (!!filter_select){
                    let found = false
                    if (!!tblRow.cells[0]) {
                        let el_value = tblRow.cells[0].innerText;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            //console.log( "el_value:", el_value);
                            found = (el_value.indexOf(filter_select) !== -1);
                        }
                    }
                    hide_row = (!found)
                }   // if (!!filter_select){
                if (hide_row) {
                    tblRow.classList.add("display_hide")
                } else {
                    tblRow.classList.remove("display_hide")
                };
            }  // if (!!tblRow){
        }
    }; // FilterSelectRows

//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict(tblBody) {  // PR2019-06-24
        //console.log( "===== FilterTableRows_dict  ========= ");
        const len = tblBody.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody.rows[i]
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
            // hide inactive rows if filter_show_inactive
                if(!filter_show_inactive){
                    const inactive_str = get_attr_from_el(tblRow, "data-inactive")
                    if (!!inactive_str) {
                        hide_row = (inactive_str.toLowerCase() === "true")
                    }
                }

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
                            // skip if no filter on this colums
                                    if(!!filter_text){
                            // get value from el.value, innerText or data-value
                                        const el_tagName = el.tagName.toLowerCase()
                                        let el_value = null;
                                        if (el_tagName === "select"){
                                            //el_value = el.options[el.selectedIndex].text;
                                            el_value = get_attr_from_el(el, "data-value")
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
                        }  // if(!hide_row){
                    });  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

//##################################################################################
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
                    if ("sel_cust_pk" in sel_dict ){
                        selected_customer_pk = sel_dict["sel_cust_pk"];
// check if selected_customer_pk exists and is not inactive.
                        const map_id = "customer" + sel_dict["sel_cust_pk"];
                        const map_dict = get_mapdict_from_datamap_by_id(customer_map, map_id);
                        if (!isEmpty(map_dict)) {
                            const inactive = get_subdict_value_by_key(map_dict, "inactive", "value", false)
                            if(!inactive){
                                selected_customer_pk = sel_dict["sel_cust_pk"];
                            } else {
                                selected_customer_pk = 0
                                selected_order_pk = 0
                            }
                        }
                        //console.log("selected_customer_pk", selected_customer_pk, typeof selected_customer_pk)
// ---  highlight row in item table, scrollIntoView
                        HighlightSelectedTblRowByPk(tblBody_items, selected_customer_pk)
// ---  highlight row in select table

                        HighlightSelectRowByPk(tblBody_select, selected_customer_pk, cls_bc_yellow, cls_bc_lightlightgrey)// ---  update header text
                        UpdateHeaderText();
                    }
                    if ("sel_order_pk" in sel_dict ){
                        selected_order_pk = sel_dict["sel_order_pk"];
                        //console.log("selected_order_pk", selected_order_pk, typeof selected_order_pk)
                    }
                }
                if (key === "page_customer"){
                    const page_dict = setting_dict[key];
                    //console.log("page_dict", page_dict)
                    if ("mode" in page_dict ){
                        selected_mode = page_dict["mode"];
                        HandleButtonSelect(selected_mode);

// ---  highlight row in order table lets HighlightSelectedTblRowByPk in customer table not work
                        //HighlightSelectedTblRowByPk(tblBody_items, selected_order_pk)
                        UpdateHeaderText();
                    }
                }
            });
        };
    }  // UpdateSettings

//========= function test printPDF  ====  PR2019-09-02
    function printPDF(log_list) {
            //console.log("printPDF")
			let doc = new jsPDF();

			doc.setFontSize(10);

			let startHeight = 25;
			let noOnFirstPage = 40;
			let noOfRows = 40;
			let z = 1;

            const pos_x = 15
            const line_height = 6
            const len = log_list.length;
            if (len > 0){

                // for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                for (let i = 0, item; i < len; i++) {
                    item = log_list[i];
                    if (!!item) {
                        if(i <= noOnFirstPage){
                            startHeight = startHeight + line_height;
                            addData(item, pos_x, startHeight, doc);
                        }else{
                            if(z ==1 ){
                                startHeight = 0;
                                doc.addPage();
                            }
                            if(z <= noOfRows){
                                startHeight = startHeight + line_height;
                                addData(item, pos_x, startHeight, doc);
                                z++;
                            }else{
                                z = 1;
                            }
                        }

                    }  //  if (!item.classList.contains("display_none")) {
                }
                //To View
                //doc.output('datauri');

            //console.log("printPDF before save")
                //To Save
                doc.save('samplePdf');
            //console.log("printPDF after save")
			}  // if (len > 0){
    }
    function addData(item, pos_x, height, doc){
        if(!!item){
            doc.text(pos_x, height, item);
        }  // if(!!tblRow){
    }  // function addData


}); //$(document).ready(function()