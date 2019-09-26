// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        console.log("Orders document.ready");

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_hide = "display_hide";

        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";

        const col_inactive = 4;
        const col_count = 5;

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_ordr"));

// ---  id of selected customer and selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;

// ---  id_new assigns fake id to new records
        let id_new = 0;
        //let idx = 0; // idx is id of each created element NOT IN USE YET 2019-07-28

        let filter_customers = "";
        let filter_orders = "";
        let filter_inactive_included = false;

        let customer_dict = {};
        let order_dict = {};

        let tblBody_select_customers = document.getElementById("id_tbody_select")
        let tblBody_items = document.getElementById("id_tbody_items");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// popup_date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
            el_popup_date.addEventListener("change", function() {HandlePopupDateSave();}, false )

        document.addEventListener('click', function (event) {
// hide msgbox
            el_msg.classList.remove("show");
// remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                selected_order_pk = 0;
                DeselectHighlightedRows(tr_selected)};

// hide el_popup_date_container
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            let close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_dhm
            if (event.target.classList.contains("input_popup_date")) {close_popup = false} else
            // don't close popup when clicked on popup box, except for close button
            if (el_popup_date_container.contains(event.target) && !event.target.classList.contains("popup_close")){close_popup = false}
            if (close_popup) {
                popupbox_removebackground();
                el_popup_date_container.classList.add(cls_hide)};
        }, false);

// ---  create EventListener for class input_text
        // PR2019-03-03 from https://stackoverflow.com/questions/14377590/queryselector-and-queryselectorall-vs-getelementsbyclassname-and-getelementbyid
        let elements = document.getElementsByClassName("input_text");
        for (let i = 0, len = elements.length; i < len; i++) {
            let el = elements[i];
            el.addEventListener("change", function() {
                setTimeout(function() {
                    UploadChanges(el);
                }, 250);
            }, false )
        }

// ---  event handler to filter inactive in
        document.getElementById("id_filter_inactive").addEventListener("click", function() {HandleFilterInactive();}, false )

// ---  add 'keyup' event handler to filter orders and customers
        document.getElementById("id_filter_orders").addEventListener("keyup", function() {
            setTimeout(function() {HandleFilterOrders();}, 25)});
        document.getElementById("id_flt_select").addEventListener("keyup", function() {
            setTimeout(function() {HandleFilterCustomers();}, 25)});


// --- get data stored in page
        let el_data = document.getElementById("id_data");
        customer_dict = get_attr_from_el(el_data, "data-customer_list");

        const url_order_upload = get_attr_from_el(el_data, "data-order_upload_url");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        moment.locale(user_lang)

        const title_inactive = get_attr_from_el(el_data, "data-txt_order_make_inactive");
        const title_active = get_attr_from_el(el_data, "data-txt_order_make_active");

        let quicksave = false
        if (get_attr_from_el_int(el_data, "data-quicksave") === 1 ) { quicksave = true};
        const timeformat = get_attr_from_el(el_data, "data-timeformat");

        DatalistDownload({"customer": {inactive: false, cat_lt: 512}, "order": {inactive: true, cat_lt: 512}});

// #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        //console.log( "=== DatalistDownload ")
        //console.log( datalist_request)

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customer") {customer_dict = {}};
            if (key === "order") {order_dict = {}};
        }
        let param = {"datalist_download": JSON.stringify (datalist_request)};
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response")
                console.log(response)

                if ("customer" in response) {customer_dict= response["customer"]}
                let txt_select = get_attr_from_el(el_data, "data-txt_select_customer");
                let txt_select_none = get_attr_from_el(el_data, "data-txt_select_customer_none");
                FillSelectTable("customer", tblBody_select_customers, customer_dict)

                if ("order" in response) {order_dict= response["order"]}

            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//========= FillDatalist  ====================================
    function FillDatalist(id_datalist, data_list, scheme_pk) {
        //console.log( "===== FillDatalist  ========= ");

        let el_datalist = document.getElementById(id_datalist);
        el_datalist.innerText = null
        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {

            let dict = data_list[row_index];
            let pk = get_pk_from_dict (dict)
            let parent_pk = get_ppk_from_dict (dict)
            let code = get_subdict_value_by_key (dict, "code", "value", "")

            let skip = (!!scheme_pk && scheme_pk !== parent_pk)
            if (!skip){
                // console.log( "listitem", listitem)
                // listitem = {id: {pk: 12, parent_pk: 29}, code: {value: "ab"}}
                let el = document.createElement('option');
                el.setAttribute("value", code);
                // name can be looked up by datalist.options.namedItem PR2019-06-01
                el.setAttribute("name", code);
                if (!!pk){el.setAttribute("pk", pk)};

                el_datalist.appendChild(el);
            }
        }
    }; // function FillDatalist

//========= FillSelectTable  ============= PR2019-09-22
    function FillSelectTable() {
        let tblBody_select = document.getElementById("id_tbody_select")
        tblBody_select.innerText = null;
        let el_a;
        const id_prefix = "sel_"
//--- loop through customer_dict
        for (let cust_key in customer_dict) {
            if (customer_dict.hasOwnProperty(cust_key)) {
                const pk_int = parseInt(cust_key);
                const item_dict = customer_dict[cust_key];
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
//--------- insert tableBody row
                let tblRow = tblBody_select.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                tblRow.setAttribute("id", id_prefix + cust_key);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-value", code_value);
                tblRow.classList.add(cls_bc_lightlightgrey);
//- add hover to select row
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

//- add EventListener to tableBody row
                tblRow.addEventListener("click", function() {HandleSelectCustomer(tblRow)}, false )

// --- add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);
                td.innerText = code_value;
                td.classList.add("px-2")
            }  // if (customer_dict.hasOwnProperty(cust_key)) {
        }  // for (let cust_key in customer_dict) {
    } // FillSelectTable


//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTablXXXe(tablename, tableBody, item_list) {
        //console.log( "=== FillSelectTable ");

        const caption_one = get_attr_from_el(el_data, "data-txt_select_customer") + ":";
        const caption_none = get_attr_from_el(el_data, "data-txt_select_customer_none") + ":";

        tableBody.innerText = null;

        let len = item_list.length;
        let row_count = 0

//--- when no items found: show 'select_customer_none'
        if (len === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through item_list
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
                // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
                const pk = get_pk_from_dict (item_dict)
                const parent_pk = get_ppk_from_dict (item_dict)
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                // console.log( "pk: ", pk, " parent_pk: ", parent_pk, " code_value: ", code_value);

//- only show items of selected_parent_pk
                // NIU:  if (parent_pk === selected_parent_pk){
                if(true) {   // if (ShowSearchRow(code_value, filter_customers)) {

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE tblRow.setAttribute("id", tablename + "_" + pk.toString());
                    tblRow.setAttribute("data-pk", pk);
                    tblRow.setAttribute("data-ppk", parent_pk);
                    // NOT IN USE, put in tableBody. Was:  tblRow.setAttribute("data-table", tablename);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to tableBody row
                    tblRow.addEventListener("click", function() {HandleSelectCustomer(tblRow)}, false )

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
                } //  if (ShowSearchRow(code_value, filter_customers)) {
            } // for (let i = 0; i < len; i++)
        }  // if (len === 0)
    } // FillSelectTable

//=========  HandleSelectCustomer  ================ PR2019-05-24
    function HandleSelectCustomer(tblRow) {
        console.log( "===== HandleSelectCustomer ========= ");

// reset selected customer
        selected_customer_pk = 0

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow)

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  get pk from id of tblRow
            selected_customer_pk = get_datapk_from_element (tblRow)
            const customer_code = get_attr_from_el_str(tblRow.cells[0].children[0], "data-value");
            const header_text = get_attr_from_el(el_data, "data-txt_orders_of_customer");

            console.log( "selected_customer_pk ", selected_customer_pk);
            console.log( "customer_code ", customer_code);
            console.log( "header_text ", header_text);


// ---  highlight clicked row
            tblRow.classList.add("tsa_tr_selected")
            hdr_customer.innerText = header_text + ": " + customer_code

// ---  fill table with orders of  selected customer
            FillTableRows()

// ---  filter table rows
            FilterTableRows(tblBody_items, filter_orders, col_inactive, filter_inactive_included)
        }
    }

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked)

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_order_pk = get_datapk_from_element(tr_clicked)
            tr_clicked.classList.add("tsa_tr_selected")
        }
    }

//========= GetItemFromTablerow  ============= PR2019-05-11
    function GetItemFromTablerow(tr_changed) {
        //console.log("======== GetItemFromTablerow");

        let item_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(tr_changed);
        // console.log("--- id_dict", id_dict);

// add id_dict to item_dict
        if (!! tr_changed && !!id_dict){
            item_dict["id"] = id_dict
            if (!!tr_changed.cells){
    // ---  loop through cells of tr_changed
                for (let i = 0, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    let fieldname, o_value, value, field_dict = {};
                    let el_input = tr_changed.cells[i].children[0];
                    if(!!el_input){
    // ---  get fieldname
                        fieldname = get_attr_from_el(el_input, "data-field");
    // ---  get value
                        if (["code", "name"].indexOf( fieldname ) > -1){
                            value = el_input.value;
                        } else if (["datefirst", "datelast", "inactive"].indexOf( fieldname ) > -1){
                            value = get_attr_from_el(el_input, "data-value"); // data-value="2019-05-11"
                        };
                        o_value = get_attr_from_el(el_input, "data-o_value"); // data-value="2019-03-29"
                        //console.log("fieldname", fieldname, typeof fieldname);
                        //console.log("value", value, typeof value);
                        //console.log("o_value", o_value, typeof o_value);

    // ---  add value to dict when changed
                        if(value_has_changed(value, o_value)){
                            field_dict["update"] = true;
                            if(!!value){field_dict["value"] = value};
                        };
    // ---  add field_dict to item_dict
                        if (!isEmpty(field_dict)){
                            item_dict[fieldname] = field_dict;
                        };
                    } //  if(!!el_input)
                };  //  for (let i = 0, el_input,

            }  // if (!!tr_changed.cells){
        };  // if (!!id_dict){
        return item_dict;
    };  // function GetItemFromTablerow

//========= HandleInactiveClicked  ============= PR2019-03-03
    function HandleInactiveClicked(el_changed) {
        //console.log("======== HandleInactiveClicked  ========");
        //console.log(el_changed);

        let is_inactive_str = get_attr_from_el(el_changed, "data-value")
        // toggle value of is_inactive
        if (is_inactive_str === "true"){is_inactive_str = "false"} else {is_inactive_str = "true"}
        //console.log("is_inactive_str: ", is_inactive_str, typeof is_inactive_str);
        el_changed.setAttribute("data-value", is_inactive_str);

        // update icon
        let imgsrc;
        if (is_inactive_str === "true") {imgsrc = imgsrc_inactive} else  {imgsrc = imgsrc_active}
        el_changed.children[0].setAttribute("src", imgsrc);

        if (is_inactive_str === "true" && !filter_inactive_included) {
            let tr_clicked = get_tablerow_selected(el_changed);
            tr_clicked.classList.add(cls_hide)
        }


        UploadChanges(el_changed)
    }

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        let tr_changed = get_tablerow_selected(el_changed)
        UploadTblrowChanged(tr_changed);
    }

//========= UploadTblrowChanged  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadTblrowChanged(tr_changed) {
        //console.log("=== UploadTblrowChanged");
        let new_item = GetItemFromTablerow(tr_changed);
        //console.log("new_item", new_item);

        if(!!new_item) {
            let parameters = {"upload": JSON.stringify (new_item)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_order_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);

                    if ("item_update" in response) {
                        const item_dict = response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        UpdateTableRow(tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        if (is_created){
                        // add new empty row
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_ppk_from_dict (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk}

                            let tblRow = CreateTableRow(pk_new, parent_pk)
                            UpdateTableRow(tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadTblrowChanged

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive() {
        //console.log("=========  function HandleFilterInactive =========");
// toggle value
        filter_inactive_included = !filter_inactive_included
// toggle icon
        let el_img_filter_inactive = document.getElementById("id_img_filter_inactive");
        if (filter_inactive_included) {
            el_img_filter_inactive.setAttribute("src", imgsrc_inactive);
            el_img_filter_inactive.setAttribute("data-value", "true");
        } else {
            el_img_filter_inactive.setAttribute("src", imgsrc_active);
            el_img_filter_inactive.setAttribute("data-value", "false");
        }
        FilterTableRows(tblBody_items, filter_orders, col_inactive, filter_inactive_included)
    }  // function HandleFilterInactive

//========= HandleFilterOrders  ====================================
    function HandleFilterOrders() {
        //console.log( "===== HandleFilterOrders  ========= ");
        // don't skip, must run this code also when customer has changed. Was: skip filter if filter value has not changed, update variable filter_orders
        let new_filter = document.getElementById("id_filter_orders").value;
        filter_orders = new_filter.toLowerCase();

        FilterTableRows(tblBody_items, filter_orders, col_inactive, filter_inactive_included)

    }; // function HandleFilterOrders

//========= HandleFilterCustomers  ====================================
    function HandleFilterCustomers() {
        //console.log( "===== HandleFilterCustomers  ========= ");

        // skip filter if filter value has not changed, update variable filter_customers
        let new_filter = document.getElementById("id_flt_select").value;
        let skip_filter = false
        if (!new_filter){
            if (!filter_customers){
                skip_filter = true
            } else {
                filter_customers = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_customers) {
                skip_filter = true
            } else {
                filter_customers = new_filter.toLowerCase();
            }
        }
        if (!skip_filter) {
            FilterTableRows(tblBody_select_customers, new_filter, col_inactive, true) // table has no column inactive, teherefore set show_inactive = true
        } //  if (!skip_filter) {
    }; // function HandleFilterCustomers

//========= FillSelectOptions  ====================================
    function FillSelectOptions(el_select, option_list, select_text, select_text_none, parent_pk_str) {
        //console.log( "=== FillSelectOptions  ", option_list);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }
        //console.log(select_text, select_text_none);

// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0
        let parent_pk = 0
        if (!!parent_pk_str){parent_pk = parseInt(parent_pk_str)};

        el_select.innerText = null

// --- loop through option list
        for (let i = 0, len = option_list.length; i < len; i++) {
            let dict = option_list[i];
            let pk = get_pk_from_dict(dict);
            let parent_pk_in_dict = get_ppk_from_dict(dict)

// skip if parent_pk exists and does not match parent_pk_in_dict
            let addrow = false;
            if (!!parent_pk){
                addrow = (parent_pk_in_dict === parent_pk)
            } else {
                addrow = true
            }
            if (addrow) {
                const field = "code";
                let value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                option_text += " data-ppk=\"" + parent_pk + "\"";
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
// if there is only 1 option: select first option
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){el_select.selectedIndex = 0}

    }  //function FillSelectOptions

//========= FillTableRows  ====================================
    function FillTableRows() {
        //console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list and  selected_parent_pk
        let item_list, selected_parent_pk;
        item_list = order_dict;
        selected_parent_pk = selected_customer_pk

// --- loop through item_list
        let tblRow;
        const len = item_list.length;
        if (!!len && selected_parent_pk){
            for (let i = 0; i < len; i++) {
                let dict = item_list[i];
                let pk = get_pk_from_dict (dict)
                let parent_pk = get_ppk_from_dict (dict)

// --- add item if parent_pk = selected_parent_pk
                if (!!parent_pk && parent_pk === selected_parent_pk){
                        tblRow =  CreateTableRow(pk, selected_parent_pk)
                        UpdateTableRow(tblRow, dict)

// --- highlight selected row
                        if (pk === selected_order_pk) {
                            tblRow.classList.add("tsa_tr_selected")
                        }
                }  // if (!!parent_pk && parent_pk === selected_parent_pk){
            }  // for (let i = 0; i
        }  //  if (!!len && selected_parent_pk){

// === add row 'add new'
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "ppk": selected_customer_pk, "new": true}

        tblRow = CreateTableRow(pk_new, selected_parent_pk)
        UpdateTableRow(tblRow, dict)
    }  // FillTableRows(

//=========  CreateTableRow  ================ PR2019-07-18
    function CreateTableRow(pk, parent_pk) {
        // console.log("=========  function CreateTableRow =========");

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", parent_pk);
        tblRow.setAttribute("data-table", "order");

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow
        for (let j = 0; j < col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img inactive to last td
            if (j === col_inactive){
                //if (!is_new_item){
            // --- add <a> element with EventListener to td
                    el = document.createElement("a");
                    el.addEventListener("click", function(){HandleInactiveClicked(el);}, false )
                    el.setAttribute("href", "#");
                    el.setAttribute("data-field", "inactive");
                    AppendChildIcon(el, imgsrc_active)
                    td.appendChild(el);

                    td.classList.add("td_width_032")
               // }
            } else {

// --- add input element to td.
                let el = document.createElement("input");
                if ([0, 1, 2, 3].indexOf( j ) > -1){
                    el.setAttribute("type", "text");
                }
// --- add data-name Attribute.
                let fieldname;
                if (j === 0){fieldname = "code"} else
                if (j === 1){fieldname = "name"} else
                if (j === 2){fieldname = "datefirst"} else
                if (j === 3){fieldname = "datelast"};
                el.setAttribute("data-field", fieldname);

                if (j === 0 && is_new_item ){
                    el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_order_add") + "...")
                }

// --- add EventListener to td
                if ([0, 1].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadChanges(el);}, false )} else
                if ([2, 3].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el);}, false )};

// --- add text_align
                if ( ([0, 1].indexOf( j ) > -1) ){
                    td.classList.add("text_align_left")
                }

// --- add margin to first column
                 if (j === 0 ){
                    el.classList.add("mx-2")
                }

// --- add width to time fields and date fileds
                if ( ([0, 1].indexOf( j ) > -1) ){
                    el.classList.add("td_width_180");
                } else {
                    el.classList.add("td_width_180");
                };

// --- add other classes to td
                el.classList.add("border_none");
                el.classList.add("input_text");

                if ([2, 3].indexOf( j ) > -1){
                    el.classList.add("input_popup_date");
                };

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  //if (j === 0)

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, item_dict){
        //console.log("--++- UpdateTableRow  --------------");

        if (!!item_dict && !!tblRow) {
            //console.log("tblRow", tblRow);
            //console.log("item_dict", item_dict);

            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // item_dict = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'namelast': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'namefirst': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

// get temp_pk_str and id_pk from item_dict["id"]
            // id: {temp_pk: "new_1", created: true, pk: 32, parent_pk: 18}
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let temp_pk_str, msg_err, is_new = false, is_created = false, is_deleted = false;
            let pk_int, parent_pk;
            if ("new" in id_dict) {is_new = true};
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("pk" in id_dict) {pk_int = id_dict["pk"]};
            if ("ppk" in id_dict) {parent_pk = id_dict["ppk"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            //console.log("id_dict:", id_dict);
            //console.log("is_created:", is_created, "temp_pk_str:", temp_pk_str)
            //console.log("pk_int:", pk_int, "parent_pk:", parent_pk)

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                //console.log("msg_err", msg_err);

                // was: let el_input = tblRow.querySelector("[name=code]");
                //console.log("tblRow", tblRow)
                let td = tblRow.cells[2];
                //console.log("td", td)
                //console.log("td.child[0]",td.child[0])
                let el_input = tblRow.cells[2].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                let id_attr = get_attr_from_el(tblRow,"id")
                // console.log(" is_created   id_attr:", id_attr)
                // console.log(" temp_pk_str:", temp_pk_str)

            // check if item_dict.id 'new_1' is same as tablerow.id
                if(temp_pk_str === id_attr){
                    // if 'created' exists then 'pk' also exists in id_dict

            // update tablerow.id from temp_pk_str to id_pk
                    tblRow.setAttribute("id", pk_int);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", pk_int)
                    tblRow.setAttribute("data-ppk", parent_pk)

            // remove placeholder from element 'code
                    let el_code = tblRow.cells[0].children[0];
                    if (!!el_code){el_code.removeAttribute("placeholder")}

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow )
                }  //  if(temp_pk_str === id_attr){
            };  // if (is_deleted){

            // tblRow can be deleted in  if (is_deleted){
            if (!!tblRow){

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)
                if(!!tblRow.cells){
// --- loop through cells of tablerow
                    for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                        let field_dict = {}, fieldname, updated, err;
                        let value = "", o_value, n_value, data_value, data_o_value;
                        let wdm = "", wdmy = "", dmy = "", offset = "", dhm = "", hm = "";

                        // el_input is first child of td, td is cell of tblRow
                        let el_input = tblRow.cells[i].children[0];
                        if(!!el_input){
    // --- lookup field in item_dict, get data from field_dict
                            fieldname = get_attr_from_el(el_input, "data-field");
                            // console.log("fieldname: ", fieldname)

                            field_dict = {};
                            if (fieldname in item_dict){
                                field_dict = get_dict_value_by_key (item_dict, fieldname);
                                updated = get_dict_value_by_key (field_dict, "updated", false);
                                msg_err = get_dict_value_by_key (field_dict, "error");

                                // console.log("updated: ", updated)
                                if (["code", "name", "identifier"].indexOf( fieldname ) > -1){
                                   format_text_element (el_input, el_msg, field_dict, [-220, 60])
                                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                                    const hide_weekday = true, hide_year = false;
                                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                user_lang, comp_timezone, hide_weekday, hide_year)
                                };

                                if(!!err){
                                    ShowMsgError(el_input, el_msg, msg_err, [-160, 80])
                                } else if(updated){
                                    el_input.classList.add("border_valid");
                                    setTimeout(function (){
                                        el_input.classList.remove("border_valid");
                                        }, 2000);
                                }
                            }  // if (fieldname in item_dict)

                            if (fieldname === "inactive") {
                               if(isEmpty(field_dict)){field_dict = {value: false}}
                               format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active, title_inactive, title_active)
                            };

                        };  // if(!!el_input)
                    }  //  for (let j = 0; j < 8; j++)
                }  // if(!!tblRow.cells){

//---  update filter
                //>>> FilterTableRows()


            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        //console.log("===  HandlePopupDateOpen  =====") ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected,

        if (!!tr_selected){
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

    // ---  change background of el_input
            popupbox_removebackground();
            //el_input.classList.add("pop_background");

    // ---  show el_popup
            el_popup_date_container.classList.remove(cls_hide);

        }  // if (!!tr_selected){

}; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-04-14
    function HandlePopupDateSave() {
        //console.log("===  function HandlePopupDateSave =========");

// ---  get pk_str from id of el_popup
        const pk_str = el_popup_date_container.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk = parseInt(el_popup_date_container.getAttribute("data-ppk"));
        const fieldname = el_popup_date_container.getAttribute("data-field");  // nanme of element clicked
        const tablename = el_popup_date_container.getAttribute("data-table");
        //console.log("pk_str: ", pk_str, typeof pk_str)
        //console.log("parent_pk: ", parent_pk, typeof parent_pk)
        //console.log("fieldname: ", fieldname, typeof fieldname)
        //console.log("tablename: ", tablename, typeof tablename)

        if(!!pk_str && !! parent_pk){
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
            id_dict["ppk"] = parent_pk
            id_dict["table"] = tablename

            if (!!id_dict){
                row_upload["id"] = id_dict
            };

            popupbox_removebackground();
            el_popup_date_container.classList.add(cls_hide);

            //const n_value = el_popup_date_container.getAttribute("data-value") // value of element clicked "-1;17;45"
            const n_value = el_popup_date.value
            const o_value = el_popup_date_container.getAttribute("data-o_value") // value of element clicked "-1;17;45"
            //console.log ("n_value: ", n_value ,"o_value: ", o_value);


// create new_dhm string

            if (n_value !== o_value) {

                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {}
                if(!!n_value){field_dict["value"] = n_value};
                field_dict["update"] = true

// put new value in inputbox before new value is back from server
                let tr_selected = document.getElementById(pk_str)
                let col_index;
                if (fieldname === "datefirst") {col_index = 2} else{col_index = 3}
                let el_input = tr_selected.cells[col_index].firstChild
                const hide_weekday = true, hide_year = false;
                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year)

                field_dict["update"] = true
                row_upload[fieldname] =  field_dict;
                //console.log ("field_dict: ", field_dict);
                let parameters = {};
                parameters["upload"] = JSON.stringify (row_upload);

                //console.log (">>> parameters: ", row_upload);
                let response;
                $.ajax({
                    type: "POST",
                    url: url_order_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        //console.log (">>> response", response);
                        if ("item_update" in response) {
                            const item_dict = response["item_update"]
                            UpdateTableRow(tr_selected, item_dict)
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)

            setTimeout(function() {
                popupbox_removebackground();
                el_popup_date_container.classList.add(cls_hide);
            }, 2000);


        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//========= function pop_background_remove  ====================================
    function popupbox_removebackground(){
        // remove selected color from all input popups
        // was: let elements = document.getElementsByClassName("input_popup_dhm");
        let elements =  document.querySelectorAll(".input_popup_dhm, .input_popup_wdy")
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

}); //$(document).ready(function()