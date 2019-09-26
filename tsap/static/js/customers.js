// PR2019-6-16
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";
        console.log("Customers document.ready");

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
        const url_customer_upload = get_attr_from_el(el_data, "data-customer_upload_url");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_active_lightgrey = get_attr_from_el(el_data, "data-imgsrc_active_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");

// ---  id of selected customer
        let selected_customer_pk = 0;
        let selected_order_pk = 0;
        let selected_mode = "id_btn_cust"
        const id_sel_prefix = "sel_"
        let mod_confirm_upload_dict = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let filter_select = "";
        let filter_show_inactive = false;

        let customer_map = new Map();
        let order_map = new Map();
        let roster_map = new Map();

// get elements
        let tblHead_items = document.getElementById("id_thead_items");
        let tblBody_items = document.getElementById("id_tbody_items");
        let tblBody_select = document.getElementById("id_tbody_select");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// add Event Listeners
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
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
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

    // ---  create EventListener for class input_text
        // PR2019-03-03 from https://stackoverflow.com/questions/14377590/queryselector-and-queryselectorall-vs-getelementsbyclassname-and-getelementbyid
        let elements = document.getElementsByClassName("input_text");
        for (let i = 0, len = elements.length; i < len; i++) {
            let el = elements[i];
            el.addEventListener("change", function() {
                setTimeout(function() {
                    UploadElChanges(el);
                }, 250);
            }, false )
        }

// ---  add 'keyup' event handler to filter orders and customers
        let el_filter_select = document.getElementById("id_flt_select")
            el_filter_select.addEventListener("keyup", function() {
                setTimeout(function() {HandleFilterSelect()}, 50)});

        let el_sel_inactive = document.getElementById("id_sel_inactive")
            el_sel_inactive.addEventListener("click", function(){HandleFilterInactive(el_sel_inactive)});

// buttons in  modal
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            btn.addEventListener("click", function() {HandleButtonSelect(btn.id)}, false )
        }

// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )

// ---  add event handler for save button in ModConfirm
        document.getElementById("id_confirm_btn_save").addEventListener("click", function(){ModConfirmSave()});

// ---  add event handlers for customer form
        let el_form_cust_code = document.getElementById("id_form_cust_code");
             el_form_cust_code.addEventListener("change", function() {UploadFormChanges(el_form_cust_code)}, false);
        let el_form_cust_name = document.getElementById("id_form_cust_name");
             el_form_cust_name.addEventListener("change", function() {UploadFormChanges(el_form_cust_name)}, false);
        document.getElementById("id_form_cust_btn_delete").addEventListener("click", function(){ModConfirmOpen("delete")});
        document.getElementById("id_form_cust_btn_add").addEventListener("click", function(){HandleCustomerAdd()});

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_cust"));

        HandleButtonSelect(selected_mode)

// --- create header row
        CreateTableHeader();

        // skip cat: 512=absence, 4096=template, # inactive=None: show all
        DatalistDownload({"customer": {cat_lt: 512}, "order": {cat_lt: 512}});

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

        // show loader
        el_loader.classList.remove(cls_visible_hide)

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

                // hide loader
               el_loader.classList.add(cls_visible_hide)

                if ("customer" in response) {
                    customer_map.clear()
                    for (let i = 0, len = response["customer"].length; i < len; i++) {
                        const item_dict = response["customer"][i];
                        const pk_int = parseInt(item_dict["pk"]);
                        customer_map.set(pk_int, item_dict);
                    }
                    FillSelectTable();
                    FillTableRows();
                    FilterTableRows(tblBody_items, filter_select);
                }
                if ("order" in response) {
                    order_map.clear();
                    for (let i = 0, len = response["order"].length; i < len; i++) {
                        const item_dict = response["order"][i];
                        const pk_int = parseInt(item_dict["pk"]);
                        order_map.set(pk_int, item_dict);
                    }
                    FillTableRows();
                    FilterTableRows(tblBody_items, filter_select);
                }
                if ("roster" in response) {
                    roster_map.clear()
                    for (let i = 0, len = response["roster"].length; i < len; i++) {
                        const item_dict = response["roster"][i];
                        const pk_int = parseInt(item_dict["pk"]);
                        roster_map.set(pk_int, item_dict);
                    }
                }
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//=========  HandleSelectCustomer ================ PR2019-08-28
    function HandleSelectCustomer(sel_tr_clicked) {
        //console.log( "===== HandleSelectCustomer  ========= ");
        //console.log( sel_tr_clicked);
        if(!!sel_tr_clicked) {
// ---  get shift_pk from sel_tr_clicked
            const pk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-pk"));
            const ppk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-ppk"));
            const code_value = get_attr_from_el(sel_tr_clicked, "data-value");

// ---  update selected__pk
            // deselect selected_order_pk when selected customer changes
            if(pk_int !== selected_customer_pk){selected_order_pk = 0}
            selected_customer_pk = pk_int
            let el = sel_tr_clicked.firstChild
            document.getElementById("id_hdr_customer").innerText = el.innerText

// ---  highlight clicked row
            //ChangeBackgroundRows(sel_tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// --- create header row
            CreateTableHeader();

// --- fill data table shifts
            FillTableRows()

// ---  enable delete button
            document.getElementById("id_form_cust_btn_delete").disabled = (!selected_customer_pk)
        }  // if(!!sel_tr_clicked)
// ---  enable add button, also when no customer selected
        document.getElementById("id_form_cust_btn_add").disabled = false;

    }  // HandleSelectCustomer

//=========  HandleButtonSelect  ================ PR2019-05-25
    function HandleButtonSelect(btn_id) {
        //console.log( "===== HandleButtonSelect ========= ", btn_id);

        selected_mode = btn_id

// ---  deselect all highlighted row, select clicked button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            if (!!btn){
                btn.classList.remove("tsa_btn_selected")
            }
        }
        document.getElementById(btn_id).classList.add("tsa_btn_selected")

        FillTableRows();

    }  // HandleButtonSelect

// ++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items and form input boxes
        tblBody_items.innerText = null;

        let el_form_cust_code = document.getElementById("id_form_cust_code")
        let el_form_cust_name = document.getElementById("id_form_cust_name")
        el_form_cust_code.value = null;
        el_form_cust_name.value = null;


        let form_mode = false;
        let tblRow, data_map, selected_pk;
        if (selected_mode === "id_btn_data"){
            data_map = customer_map;
            form_mode = true;
        } else if (selected_mode === "id_btn_cust"){
            data_map = customer_map;
            selected_pk = selected_customer_pk
        } else if (selected_mode === "id_btn_order"){
            data_map = order_map;
            selected_pk = selected_order_pk
        } else if (selected_mode === "id_btn_roster"){
            data_map = roster_map;
        };

        if (form_mode){
            document.getElementById("id_div_data_form").classList.remove("display_hide");
            document.getElementById("id_div_data_table").classList.add("display_hide");
        } else {
            document.getElementById("id_div_data_form").classList.add("display_hide");
            document.getElementById("id_div_data_table").classList.remove("display_hide");
            CreateTableHeader();
        };

        if (form_mode){
// --- get item_dict
            const item_dict = data_map.get(selected_customer_pk);

// --- fill textboxes
            el_form_cust_code.value = get_subdict_value_by_key(item_dict, "code", "value");
            el_form_cust_name.value = get_subdict_value_by_key(item_dict, "name", "value");
        } else {

// --- loop through data_map
            for (const [pk_int, item_dict] of data_map.entries()) {
                const ppk_int = get_ppk_from_dict(item_dict)

                let show_row = true;
                if (selected_mode === "id_btn_order"){
                    show_row = (ppk_int === selected_customer_pk);
                }
                if(show_row) {
                    tblRow =  CreateTableRow(pk_int, ppk_int)
                    UpdateTableRow(tblRow, item_dict)
    // --- highlight selected row
                    if (pk_int === selected_pk) {
                        tblRow.classList.add("tsa_tr_selected")
                    }
                }
            }  //  for (const [pk_int, item_dict] of data_map.entries())

    // === add row 'add new'
            let dict = {};
            const hide_row = (selected_mode === "id_btn_order" && !selected_customer_pk) || (selected_mode === "id_btn_roster")
            if (!hide_row) {
                id_new = id_new + 1
                const pk_new = "new_" + id_new.toString()

                dict["id"] = {"pk": pk_new, "new": true}
                const ppk_int = (selected_mode === "id_btn_order") ? selected_customer_pk : null
                tblRow = CreateTableRow(pk_new, ppk_int)
                UpdateTableRow(tblRow, dict)

            }
        }  // if (form_mode){
    }  // FillTableRows(

//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader() {
        //console.log("===  CreateTableHeader == ");
        //console.log("selected_mode", selected_mode);

        tblHead_items.innerText = null

        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.

//--- insert td's to tblHead_items
        let column_count;
        if (selected_mode === "id_btn_cust"){column_count = 3} else
        if (selected_mode === "id_btn_order"){column_count = 5} else
        if (selected_mode === "id_btn_roster"){column_count = 4}

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- keep last th empty (delete column)
            if (j === column_count - 1){
                th.classList.add("td_width_032");
            } else {
                if (selected_mode === "id_btn_cust"){
    // --- add innerText to th
                    if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_shortname")} else
                    if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_customer_name")}// else
                    //if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_identifier")};
    // --- add width to th
                    if (j === 1){th.classList.add("td_width_220")} else
                    if ([0, ].indexOf( j ) > -1){th.classList.add("td_width_120")}
    // --- add text_align
                    th.classList.add("text_align_left");

                } else if (selected_mode === "id_btn_order"){
    // --- add innerText to th
                    if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_shortname")} else
                    if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_order_name")} else
                    if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_datefirst")}else
                    if (j === 3){th.innerText = get_attr_from_el(el_data, "data-txt_datelast")};
    // --- add width to th
                    if (j === 0){th.classList.add("td_width_180")} else
                    if (j === 1){th.classList.add("td_width_240")} else
                    if ([2, 3].indexOf( j ) > -1){th.classList.add("td_width_120")}
    // --- add text_align
                    if ([0, 1].indexOf( j ) > -1){th.classList.add("text_align_left")} else {
                    th.classList.add("text_align_right");}
                }
            }  // if (j === column_count - 1)

        }  // for (let j = 0; j < column_count; j++)
    };  //function CreateTableHeader

//=========  CreateTableRow  ================ PR2019-09-04
    function CreateTableRow(pk_int, ppk_int ) {
        //console.log("=========  function CreateTableRow =========");
        //console.log("pk", pk_int);

// check if row is addnew row - when pk_int is NaN
        let is_new_item = !parseInt(pk_int);

        let column_count, tblName;
        if (selected_mode === "id_btn_cust"){column_count = 3; tblName = "customer"} else
        if (selected_mode === "id_btn_order"){column_count = 5; tblName = "order"} else
        if (selected_mode === "id_btn_roster"){column_count = 4; tblName = "roster"}

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        const row_id = pk_int.toString();
        tblRow.setAttribute("id", row_id);
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);

        tblRow.setAttribute("data-table", tblName);
        tblRow.setAttribute("data-mode", selected_mode);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow


        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img delete to col_delete
            if (j === column_count - 1){
                if (!is_new_item){
                    el = document.createElement("a");
                    el.setAttribute("href", "#");
                    el.addEventListener("click", function(){
                        ModConfirmOpen("delete", tblRow)
                        }, false )
                    AppendChildIcon(el, imgsrc_delete)
                    td.appendChild(el);
                } else {
                    td.setAttribute("data-field", "delete");
                }
                td.classList.add("td_width_032")

// --- add input element to td.
            } else {
                el = document.createElement("input");
                el.setAttribute("type", "text")
                el.classList.add("input_text");

// --- add data-field Attribute.
                let fieldnames = {"customer": ["code", "name", "delete"],
                    "order": ["code", "name", "datefirst", "datelast", "delete"],
                    "roster": ["", "", "", ""]}
                el.setAttribute("data-field", fieldnames[tblName][j]);

    // --- add placeholder, // only when is_new_item.
                if (j === 0 && is_new_item ){ // only when is_new_item
                    if (tblName === "customer"){
                        el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_customer_add") + "...")
                    } else if (tblName === "order"){
                        el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_order_add") + "...")
                    }
                }

    // --- add EventListener to td
                if (tblName === "customer"){
                    el.addEventListener("change", function() {UploadElChanges(el)}, false )
                } else if (tblName === "order"){
                    if ([0, 1].indexOf( j ) > -1){
                        el.addEventListener("change", function() {UploadElChanges
                        (el);}, false)} else
                    if ([2, 3].indexOf( j ) > -1){
                        el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false);
                        // class input_popup_date is necessary to skip closing popup
                        el.classList.add("input_popup_date")
                    };
                } else if (tblName === "roster"){
                    el.addEventListener("change", function() {UploadElChanges(el)}, false )
                }

    // --- add text_align
                if (tblName === "order"){
                    if ([0, 1].indexOf( j ) > -1){el.classList.add("text_align_left")} else {
                    el.classList.add("text_align_right");}
                } else {
                    el.classList.add("text_align_left")
                }
    // --- add margin to first column
                if (j === 0 ){el.classList.add("mx-2")}

    // --- add width to fields
                if (tblName === "customer"){
                    if ([0, ].indexOf( j ) > -1){el.classList.add("td_width_180")} else
                    if (j === 1 ){el.classList.add("td_width_240")}
               } else if (tblName === "order"){
                    if (j === 0){el.classList.add("td_width_180")} else
                    if (j === 1){el.classList.add("td_width_240")} else
                    if ([2, 3].indexOf( j ) > -1){el.classList.add("td_width_120")}
               } else if (tblName === "roster"){
               }

// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  // if (j === column_count - 1)

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, item_dict){
        //console.log("--- UpdateTableRow  --------------");
        //console.log("item_dict", item_dict);

        if (!!item_dict && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            const is_created = ("created" in id_dict) ? true : false;
            const is_deleted = ("deleted" in id_dict) ? true : false;
            const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
            const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
            const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
            const msg_err = ("error" in id_dict) ? id_dict["error"] : null;
            //console.log("is_created", is_created, typeof is_created);
            //console.log("is_deleted", is_deleted, typeof is_deleted);

// --- deleted record
            if (is_deleted){
                // row in select table
                tblRow.parentNode.removeChild(tblRow);
                // row in list
                const tablerow = document.getElementById(pk_int.toString())
                if (!!tablerow){tablerow.parentNode.removeChild(tablerow)}

            } else if (!!msg_err){
                //console.log("msg_err", msg_err);

                let td = tblRow.cells[0];
                //console.log("td", td)
                //console.log("td.child[0]",td.child[0])
                let el_input = tblRow.cells[0].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err, [-240, 200])

// --- new created record
            } else if (is_created){
                let id_attr = get_attr_from_el(tblRow, "id")
            // check if item_dict.id 'new_1' is same as tablerow.id
                if(temp_pk_str === id_attr){
                    // if 'created' exists then 'pk' also exists in id_dict
            // update tablerow.id from temp_pk_str to id_pk
                    tblRow.setAttribute("id", pk_int);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", pk_int)
            // remove placeholder from element 'code
                    let el_code = tblRow.cells[0].children[0];
                    if (!!el_code){el_code.removeAttribute("placeholder")}
            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow)
                }  //  if(temp_pk_str === id_attr){
            };  // if (is_deleted){

            // tblRow can be deleted if (is_deleted){
            if (!!tblRow){

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)
                if(!!tblRow.cells){
// --- loop through cells of tablerow
                    for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                        let field_dict = {}, fieldname, updated, msg_err;
                        let value = "", o_value, n_value, data_value, data_o_value;

                        // el_input is first child of td, td is cell of tblRow
                        let td = tblRow.cells[i];
                        let el_input = td.children[0];
                        //console.log("el_input: ", el_input)
                        if(!!el_input){
                            fieldname = get_attr_from_el(el_input, "data-field");
                            // ShowMsgError is in function format_text_element
                            if (fieldname in item_dict){
                                field_dict = get_dict_value_by_key (item_dict, fieldname);

                                //console.log("fieldname", fieldname, typeof fieldname);
                                //console.log("field_dict", field_dict, typeof field_dict);

                                if (["code", "name", "identifier"].indexOf( fieldname ) > -1){
                                   format_text_element (el_input, el_msg, field_dict, [-240, 200])
                                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                                    const hide_weekday = true, hide_year = false;
                                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                user_lang, comp_timezone, hide_weekday, hide_year)
                                };
                            }  // if (fieldname in item_dict)

                            if (fieldname === "inactive") {
                               if(isEmpty(field_dict)){field_dict = {value: false}}
                               format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active_lightgrey)
                            };
                        } else {
                            // field "delete" has no el_input, td has field name 'detete
                            fieldname = get_attr_from_el(td, "data-field");
                    // add delete button in new row
                            if (is_created && fieldname === "delete") {
                                let el = document.createElement("a");
                                el.setAttribute("href", "#");
                                el.addEventListener("click", function(){ ModConfirmOpen("delete", tblRow)}, false )
                                AppendChildIcon(el, imgsrc_delete)
                                td.appendChild(el);
                            }
                        };  // if(!!el_input)
                    }  //  for (let j = 0; j < 8; j++)
                }  // if(!!tblRow.cells){

//---  update filter
                //>>> FilterTableRows()


            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows,  highlight selected row
        DeselectHighlightedRows(tr_clicked)
        tr_clicked.classList.add("tsa_tr_selected")

        const pk_int = get_datapk_from_element(tr_clicked)
        const tblName = get_attr_from_el(tr_clicked, "data-table");
        if (tblName === "customer"){
// ---  update selected__pk
            // deselect selected_order_pk when selected customer changes
            if(pk_int !== selected_customer_pk){selected_order_pk = 0}
            selected_customer_pk = pk_int

// ---  update header text
            let el_code = tr_clicked.cells[0].children[0];
            const code_value = el_code.value
            document.getElementById("id_hdr_customer").innerText = code_value

// ---  highlight clicked
            let el_tbody_select = document.getElementById("id_tbody_select")
            //was: ChangeBackgroundRows(sel_tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
            DeselectHighlightedTblbody(el_tbody_select, cls_bc_yellow, cls_bc_lightlightgrey)

            let sel_tablerow = document.getElementById(id_sel_prefix + pk_int.toString());
            if(!!sel_tablerow){
                // yelllow won/t show if you dont first remove background color
                sel_tablerow.classList.remove(cls_bc_lightlightgrey)
                sel_tablerow.classList.add(cls_bc_yellow)
            }
        } else if (tblName === "order"){
            selected_order_pk = pk_int;
        };  // if (tblName === "customer")
    }

//=========  HighlichtSelectTable  ================ PR2019-08-25
    function HighlichtSelectTable(pk_int) {
        console.log( " --- HighlichtSelectTable ---", pk_int);
    // tr_selected is selected row in tblBody_select
        let tr_selected = document.getElementById("sel_customer_" + pk_int.toString())

// ---  remove highlights from select tables
        DeselectHighlightedRows(tr_selected, cls_bc_yellow, cls_bc_lightlightgrey)
        if (!!tr_selected){
// ---  highlight clicked row
            tr_selected.classList.remove(cls_bc_lightlightgrey)
            tr_selected.classList.add(cls_bc_yellow)
        }

    }  // HighlichtSelectTable

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
        if (is_inactive_str === "true") {
            imgsrc = imgsrc_inactive
        } else {
            imgsrc = imgsrc_active_lightgrey
            }
        el_changed.children[0].setAttribute("src", imgsrc);

        if (is_inactive_str === "true" && !filter_show_inactive) {
            let tr_clicked = get_tablerow_selected(el_changed);
            tr_clicked.classList.add("display_hide")
        }



        UploadElChanges(el_changed)
    }

//========= HandleInactiveClicked  ============= PR2019-09-24
    function HandleCustomerAdd(){
        console.log(" --- HandleCustomerAdd --- ")

        selected_customer_pk = 0
        // ---  remove highlights from select tables
        DeselectHighlightedTblbody(tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
        let el_form_code = document.getElementById("id_form_cust_code")
        document.getElementById("id_form_cust_name").value = null;
        el_form_code.value = null;
        el_form_code.value = null;
        el_form_code.placeholder = get_attr_from_el(el_data, "data-txt_cust_code_enter")

        el_form_code.focus();
        document.getElementById("id_form_cust_btn_add").disabled = true;
    }

//========= UploadFormChanges  ============= PR2019-09-23
    function UploadFormChanges(el_input) {
        console.log( " ==== UploadFormChanges ====");
        let upload_dict = {};
        const tblName = (selected_mode === "id_btn_data") ? "customer" : null
        if(!!el_input && tblName){
            if(!selected_customer_pk){
                // new record if  selected_customer_pk = 0
                console.log( " ==== new record ====");
        // get new temp_pk
                id_new = id_new + 1
                const temp_pk_str = "new_" + id_new.toString()
        // create id_dict
                // {id: {temp_pk: "new_1", create: true, table: "customer", mode: "id_btn_cust"} code: {value: "55", update: true}
                const id_dict = {temp_pk: temp_pk_str, "create": true, "table": tblName, "mode": selected_mode}
                upload_dict["id"] = id_dict;

                console.log("el_input.value");
                console.log(el_input.value);
        // create field_dict
                const fieldname = get_attr_from_el(el_input,"data-field")
                let field_dict = {"update": true}
                let field_value = el_input.value
                if(!!el_input.value) {
                    field_dict["value"] = el_input.value
                }
                upload_dict[fieldname] = field_dict;
                console.log("upload_dict");
                console.log(upload_dict);
        // UploadChanges
                UploadChanges(upload_dict);
            } else {
                // update existing record
        console.log( " ==== update existing record ====");
            }

        } // if(!!el_input){
    }  // UploadFormChanges
//========= UploadElChanges  ============= PR2019-09-23
    function UploadElChanges(el_input) {
        console.log( " ==== Upload El Changes ====");
        //console.log(el_input);
        if(!!el_input){
            let tr_changed = get_tablerow_selected(el_input)
    // ---  create id_dict
            // 'get_iddict_from_element' gets 'data-pk', 'data-ppk', 'data-table', 'data-mode', 'data-cat' from element
            // and puts it as 'pk', 'ppk', 'temp_pk', 'create', 'mode', 'cat' in id_dict
            // id_dict = {'temp_pk': 'new_4', 'create': True, 'ppk': 120}
            let id_dict = get_iddict_from_element(tr_changed);
            let upload_dict = {"id": id_dict};

    // ---  get fieldname from 'el_input.data-field'
            const fieldname = get_attr_from_el(el_input, "data-field");
            if (!!fieldname){
                if (fieldname === "delete"){
                    upload_dict["id"]["delete"] = true;
                } else {
                    let o_value = null, n_value = null;
                    if (["code", "name", "identifier"].indexOf( fieldname ) > -1){
                        n_value = (!!el_input.value) ? el_input.value : null
                        o_value = get_attr_from_el(el_input, "data-value");
                    } else {
                        n_value = get_attr_from_el(el_input, "data-value");
                    };
                    // ---  put value in 'dict.value'
                    if(n_value !== o_value){
                        let field_dict = {};
                        field_dict["value"] = n_value;
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;
                    };
                }  //  if (fieldname === "delete")
            }  // if (!!fieldname){

            UploadChanges(upload_dict);

        }  // if(!!el_input){
    }

//========= UploadTrChanges  ============= PR2019-09-22
    function UploadTrChanges(tr_changed) {
        let upload_dict = CreateUploadDict(tr_changed);
        UploadChanges(upload_dict);
    }

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(upload_dict) {
        console.log( " ==== UploadChanges ====");
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input

        if(!!upload_dict) {
            let parameters = {"upload": JSON.stringify (upload_dict)};
            console.log( "upload", upload_dict);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_customer_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);

                    if ("customer" in response) {
                        customer_map.clear()
                        for (let i = 0, len = response["customer"].length; i < len; i++) {
                            const item_dict = response["customer"][i];
                            const pk_int = parseInt(item_dict["pk"]);
                            customer_map.set(pk_int, item_dict);
                        }
                        FillSelectTable();
                    }
                    if ("order" in response) {
                        order_map.clear()
                        for (let i = 0, len = response["order"].length; i < len; i++) {
                            const item_dict = response["order"][i];
                            const pk_int = parseInt(item_dict["pk"]);
                            order_map.set(pk_int, item_dict);
                        }
                    }
                    if ("update_list" in response) {
                        // update_dict: {  216: {pk: 216, ppk: 2, id: {pk: 216, ppk: 2, table: "order"},
                        //         code: {value: "MCB"},  name: {value: "MCB"}, inactive: {updated: true} }

                        //--- loop through update_list
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const item_dict = response["update_list"][i];
                            const id_dict = get_dict_value_by_key (item_dict, "id");
                            const pk_int = parseInt(id_dict["pk"]);  // item_dict["pk"] does not exist when item is deleted

                            const is_created = ("created" in id_dict) ? true : false;
                            const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
                            const pk_str = (!!temp_pk_str) ? temp_pk_str : pk_int.toString();
                            console.log( "pk_str", pk_str, typeof pk_str);

                            let tr_selected = document.getElementById(pk_str);
                            console.log( "tr_selected", tr_selected);
                            if(selected_mode === "id_btn_data") {
                                const cust_code = get_subdict_value_by_key(item_dict, "code", "value")
                                document.getElementById("id_form_cust_code").value = (!!cust_code) ? cust_code : null
                                const cust_name = get_subdict_value_by_key(item_dict, "name", "value")
                                document.getElementById("id_form_cust_name").value = (!!cust_name) ? cust_name : null
                            } else {
                                UpdateTableRow(tr_selected, item_dict);
                            // add new empty row
                                if (is_created){
                                    id_new = id_new + 1
                                    const pk_new = "new_" + id_new.toString()
                                    const ppk_int = get_ppk_from_dict (item_dict)

                                    let new_dict = {}
                                    new_dict["id"] = {"pk": pk_new, "ppk": ppk_int}

                                    let tblRow = CreateTableRow(pk_new, ppk_int)
                                    UpdateTableRow(tblRow, new_dict)
                                }  // if (is_created)
                            }  // if(selected_mode === "id_btn_data")

                        }  // for (let i = 0, len = response["order"].length; i < len; i++)
                    }  // if ("update_list" in response)
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadChanges

//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable() {
        console.log("FillSelectTable");
        console.log(customer_map);

        tblBody_select.innerText = null;
        let el_a;
//--- loop through customer_map
        for (const [pk_int, item_dict] of customer_map.entries()) {
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            const inactive_value = get_subdict_value_by_key(item_dict, "inactive", "value", false);

//--------- insert tableBody row
            let tblRow = tblBody_select.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            tblRow.setAttribute("id", id_sel_prefix + pk_int);
            tblRow.setAttribute("data-pk", pk_int);
            //tblRow.setAttribute("data-value", code_value);
           // tblRow.setAttribute("data-inactive", inactive_value);
            tblRow.classList.add(cls_bc_lightlightgrey);

//- add hover to select row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

// --- add first td to tblRow.
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

            el_a = document.createElement("a");
            //td.innerText = code_value;
            //td.setAttribute("data-field", "customer");
                el_a = document.createElement("div");
                el_a.innerText = code_value;
                el_a.setAttribute("data-field", "code");
                el_a.setAttribute("data-value", code_value);
                td.appendChild(el_a);
            td.classList.add("px-2")

            td.addEventListener("click", function() {
                HandleSelectCustomer(tblRow);
            }, false)

            // --- add active img to second td in table
            td = tblRow.insertCell(-1);
                el_a = document.createElement("a");
                el_a.addEventListener("click", function(){
                    HandleSelectCustomer(tblRow);
                    ModConfirmOpen("inactive", tblRow)
                    }, false )
                el_a.setAttribute("href", "#");
                el_a.setAttribute("data-field", "inactive");
                el_a.setAttribute("data-value", inactive_value);

                const imgsrc = (inactive_value) ? imgsrc_inactive : imgsrc_active_lightgrey;
                AppendChildIcon(el_a, imgsrc);
                td.appendChild(el_a);
            td.classList.add("td_width_032");

        }  // for (let cust_key in customer_map) {
    } // FillSelectTable

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive(el) {
        console.log(" --- HandleFilterInactive --- ");
        console.log(el);
// toggle value
        filter_show_inactive = !filter_show_inactive
        console.log("filter_show_inactive", filter_show_inactive);
// toggle icon
        let img_src;
        if(filter_show_inactive) {img_src = imgsrc_inactive} else {img_src = imgsrc_active_lightgrey}
        const img = document.getElementById("id_sel_img_inactive")
        console.log("img");
        console.log(img);
        img.setAttribute("src", img_src);
        const col_inactive = 3;
        FilterTableRows(tblBody_items, filter_select, col_inactive, filter_show_inactive);

    }  // function HandleFilterInactive

//========= HandleFilterSelect  ====================================
    function HandleFilterSelect() {
        console.log( "===== HandleFilterSelect  ========= ");
        // skip filter if filter value has not changed, update variable filter_select
        let new_filter = el_filter_select.value;
        console.log( "new_filter", new_filter);
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
            const col_inactive = 2;
            FilterTableRows(tblBody_items, filter_select)
            FilterTableRows(tblBody_select, filter_select)

        } //  if (!skip_filter) {
    }; // function HandleFilterSelect

//========= CreateUploadDict  ============= PR2019-05-11
    function CreateUploadDict(tr_changed) {
        console.log("======== CreateUploadDict");
        console.log("tr_changed", tr_changed);
        let item_dict = {};

// ---  create id_dict
        // 'get_iddict_from_element' gets 'data-pk', 'data-ppk', 'data-table', 'data-mode', 'data-cat' from element
        // and puts it as 'pk', 'ppk', 'temp_pk', 'create', 'mode', 'cat' in id_dict
        // id_dict = {'temp_pk': 'new_4', 'create': True, 'ppk': 120}
        let id_dict = get_iddict_from_element(tr_changed);
        console.log("---> id_dict", id_dict);

// add id_dict to item_dict
        if (!! tr_changed && !!id_dict){
            item_dict["id"] = id_dict
            if (!!tr_changed.cells){
    // ---  loop through cells of tr_changed
                for (let i = 0, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    let el_input = tr_changed.cells[i].children[0];
                    if(!!el_input){
                        let o_value, n_value = null, field_dict = {};
    // ---  get fieldname from 'el_input.data-field'
                        const fieldname = get_attr_from_el(el_input, "data-field");
                        if (!!fieldname){
                            console.log("fieldname", fieldname);
                            console.log("el_input", el_input);
                            if (fieldname === "delete"){
                                item_dict["id"]["delete"] = true;
                            } else {
    // ---  get value from 'el_input.value' or from 'el_input.data-value'
                                // PR2019-03-17 debug: getAttribute("value");does not get the current value
                                // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                                // The 'value' property holds the current value (el_input.value).

                                if (["code", "name", "identifier"].indexOf( fieldname ) > -1){
                                    if (!!el_input.value){
                                        n_value = el_input.value;
                                    }
                                } else {
                                    n_value = get_attr_from_el(el_input, "data-value");
                                };
                                //console.log("n_value", n_value);
        // ---  put value in 'dict.value'
                                if(!!n_value){
                                    field_dict["value"] = el_input.value;
                                    field_dict["update"] = true;
                                };

    // get pk from element
                                let pk;
                                if (["shift", "team", "employee", "order"].indexOf( fieldname ) > -1){
        // get pk from datalist when field is a look_up field
                                    if (!!n_value){
                                        pk = parseInt(get_pk_from_datalist("id_datalist_" + fieldname + "s", n_value));
                                    }
                                } else if (fieldname === "orderhour"){
        // Note: pk in get pk from datalist when field is a look_up field
                                    if (!!n_value){
                                        field_dict["order_pk"] = parseInt(get_pk_from_datalist("id_datalist_orders", n_value));

                                    }

        // get pk from attribute 'data-pk'
                                } else {
                                    pk = parseInt(get_attr_from_el(el_input, "data-pk"));
                                }
                                if(!!pk){
                                    field_dict["pk"] = pk
                                };

    // ---  add field_dict to item_dict
                                item_dict[fieldname] = field_dict;
                            }  // if (!!fieldname === "delete"){

                        }  //  if (!!fieldname)
                    } //  if(!!el_input){
                };  //  for (let i = 0, el_input,
            }  // if (!!tr_changed.cells){
        };  // if (!!id_dict){
        console.log("item_dict", item_dict);
        return item_dict;
    };  // function CreateUploadDict

// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++
// TODO NOT IN USE YET
//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict() {  // PR2019-06-24
        console.log( "===== FilterTableRows_dict  ========= ");
        const len = tblBody_items.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody_items.rows[i]
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

//##################################################################################
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
            console.log("data_table", data_table, "data_pk", data_pk, "data_ppk", data_ppk)


// get values from el_input
            //NIU const el_id = get_attr_from_el(el_input, "id");
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            console.log("data_field", data_field, "data_value", data_value)

            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");
            console.log("data_mindate", data_mindate, "data_maxdate", data_maxdate);

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
            console.log("el_popup_date_container", el_popup_date_container);
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
        const tablename = get_attr_from_el(el_popup_date_container, "data-table");

        el_popup_date_container.classList.add(cls_hide);

        if(!!pk_str && !! ppk_int){
            let upload_dict = {};
            let id_dict = {"ppk": ppk_int, "table": tablename}
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
                                    const item_dict = update_dict[key];
                                    UpdateTableRow(tr_selected, item_dict);
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

//##################################################################################


//========= function test printPDF  ====  PR2019-09-02
    function printPDF(log_list) {
            console.log("printPDF")
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

            console.log("printPDF before save")
                //To Save
                doc.save('samplePdf');
            console.log("printPDF after save")
			}  // if (len > 0){
    }
    function addData(item, pos_x, height, doc){
        if(!!item){
            doc.text(pos_x, height, item);
        }  // if(!!tblRow){
    }  // function addData

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX


// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2019-06-23
    function ModConfirmOpen(mode, tr_selected) {
        console.log(" -----  ModConfirmOpen   ----", mode)
        //TODO tr_selected undefined in new item, find a way to solve it


// ---  create id_dict
        let pk_int, tablename;
        if(!!tr_selected){
            pk_int = get_datapk_from_element(tr_selected);
            tablename = get_attr_from_el (tr_selected, "data-table");
        } else {
            // when clicked on delete button in data form
            tablename = "customer";
            pk_int = selected_customer_pk
            // lookup tablerow
            tr_selected = document.getElementById(pk_int.toString());
        }
        console.log("tr_selected")
        console.log(tr_selected)

        if(!!pk_int && !!tablename){
            let data_map, selected_pk;
            if (tablename === "customer"){
                data_map = customer_map;
            } else if (tablename === "order") {
                data_map = order_map;
             } else if (tablename === "roster"){
                data_map = roster_map;
            };

            console.log("pk_int", pk_int, "tablename", tablename)
            console.log(data_map)
            mod_confirm_upload_dict = data_map.get(pk_int) // lookup_itemdict_from_datadict(data_map, pk_int)
            console.log(" -----  mod_confirm_upload_dict   ----", mod_confirm_upload_dict)
            // data-txt_confirm_msg01_customer_delete
            const data_txt_msg01 = "data-txt_confirm_msg01_" + tablename + "_" +mode
            const data_txt_btn_save = "data-txt_confirm_btn_" + mode

            document.getElementById("id_confirm_header").innerText =  get_subdict_value_by_key(mod_confirm_upload_dict,"code","value")

            document.getElementById("id_confirm_msg01").innerText = get_attr_from_el(el_data, data_txt_msg01);
            document.getElementById("id_confirm_btn_save").innerText = get_attr_from_el(el_data, data_txt_btn_save);


            if(mode === "delete"){
        // ---  create param
                mod_confirm_upload_dict["id"]["delete"] = true;
        // ---  show modal
                $("#id_mod_confirm").modal({backdrop: true});
            } else if(mode === "inactive"){
        // get code from select table
                const el_code = tr_selected.cells[0].children[0];
                const customer_code = (!!el_code) ? get_attr_from_el(el_code, "data-value") : null;
                let header_text = (!!customer_code) ? customer_code : get_attr_from_el(tr_selected, data_txt_msg01);
                document.getElementById("id_confirm_header").innerText = header_text;
        // get inactive from select table
                const el_inactive = tr_selected.cells[1].children[0];
                console.log("el_inactive", el_inactive, typeof el_inactive)
                const o_inactive = (!!el_inactive) ? get_attr_from_el(el_inactive, "data-value") : "false";
                console.log("o_inactive", o_inactive, typeof o_inactive)
        // toggle inactive
                const customer_inactive = (o_inactive === "true" ) ? false : true;
                console.log("customer_inactive", customer_inactive, typeof customer_inactive)

                mod_confirm_upload_dict["inactive"] = {"value": customer_inactive, "update": true}
                if(!!customer_inactive){
        // ---  show modal
                    $("#id_mod_confirm").modal({backdrop: true});
                } else {
        // ---  dont show confirm box when make active:
                    UploadChanges(mod_confirm_upload_dict)
                }
            }  // if(mode === "delete")

        }  // if(!!pk_int && !!tablename)
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        $("#id_mod_confirm").modal("hide");
        UploadChanges(mod_confirm_upload_dict)
    }

}); //$(document).ready(function()