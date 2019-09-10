// PR2019-6-16
$(function() {
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
        const ppk_int = get_attr_from_el_int(el_data, "data-ppk");
        const user_lang = get_attr_from_el(el_data, "data-lang");

        const url_customer_upload = get_attr_from_el(el_data, "data-customer_upload_url");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");

        const title_inactive = get_attr_from_el(el_data, "data-txt_make_inactive");
        const title_active = get_attr_from_el(el_data, "data-txt_make_active");

// ---  id of selected customer
        let selected_customer_pk = 0;
        let selected_mode = "list"

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let filter_select = "";
        let filter_show_inactive = false;

        let customer_list = [];

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
                selected_customer_pk = 0;
                DeselectHighlightedRows(tr_selected)}
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

    // ---  add 'keyup' event handler to filter orders and customers
        let el_filter_select = document.getElementById("id_flt_select")
            el_filter_select.addEventListener("keyup", function() {
                setTimeout(function() {HandleFilterSelect();}, 150)});

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_cust"));

        HandleButtonSelect()

// --- create header row
        CreateTableHeader("list");

        // skip cat: 512=absence, 4096=template, # inactive=None: show all
        DatalistDownload({"customer": {cat_lt: 512}});

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

        // show loader
        el_loader.classList.remove(cls_visible_hide)

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customer") {customer_list = []};
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

                // hide loader
               el_loader.classList.add(cls_visible_hide)

                if ("customer" in response) {
                    customer_list= response["customer"];
                    FillSelectTable();
                    FillTableRows();
                    const col_inactive = 2;
                    FilterTableRows(tblBody_items, filter_select, col_inactive, filter_show_inactive);
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
        console.log( "===== HandleSelectCustomer  ========= ");
        //console.log( sel_tr_clicked);
        if(!!sel_tr_clicked) {
// ---  get shift_pk from sel_tr_clicked
            const pk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-pk"));
            const ppk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-ppk"));
            const code_value = get_attr_from_el(sel_tr_clicked, "data-value");

// ---  update selected__pk
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
            CreateTableHeader("list");

// --- fill data table shifts
            FillTableRows("list")

        }  // if(!!sel_tr_clicked)
    }  // HandleSelectCustomer

//=========  HandleButtonSelect  ================ PR2019-05-25
    function HandleButtonSelect() {
        //console.log( "===== HandleButtonSelect ========= ");

        let el_btn_container = document.getElementById("id_btn_container")
            el_btn_container.setAttribute("data-mode", selected_mode);

// ---  deselect all highlighted row
        let btns = el_btn_container.children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            if (!!btn){
                btn.classList.remove("tsa_btn_selected")
            }
        }
        let btn_selected = document.getElementById("id_btn_" + selected_mode )
        btn_selected.classList.add("tsa_btn_selected")

        CreateTableHeader(selected_mode)

// --- fill data table shifts
        FillTableRows()

    }  // HandleButtonSelect

// ++++ FILL TABLE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader() {
        // console.log("===  CreateTableHeader == ");
        // console.log("pk", pk, "ppk", parent_pk);

        tblHead_items.innerText = null

        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.

//--- insert td's to tblHead_items
        let column_count;
        if (selected_mode === "list"){column_count = 4}
        // dont forget to set value of col_inactive in  HandleFilterInactive
        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add img to last th
            // if (j === 0 && selected_mode === "schemeitem"){AppendChildIcon(th, imgsrc_warning)} else
            if (j === column_count - 1){
                // TODO: delete button AppendChildIcon(th, imgsrc_delete);
                AppendChildIcon(th, imgsrc_active);
                th.classList.add("td_width_032");

                    // ---  event handler to filter inactive in
                th.addEventListener("click", function() {HandleFilterInactive(th);}, false )

            }
        if (selected_mode === "list"){
// --- add innerText to th
                if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_shortname")} else
                if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_customer_name")} else
                if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_identifier")};
// --- add width to th
                if (j === 1){th.classList.add("td_width_220")} else
                if ([0, 2].indexOf( j ) > -1){th.classList.add("td_width_120")}
// --- add text_align
                th.classList.add("text_align_left");
        }
        }  // for (let j = 0; j < column_count; j++)
    };  //function CreateTableHeader

//========= FillTableRows  ====================================
    function FillTableRows() {
        //console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list and  selected_parent_pk
        let item_list;
        item_list = customer_list;

        let ppk_int = get_attr_from_el(el_data, "data-ppk");

// --- loop through item_list
        let tblRow;
        const len = item_list.length;
        if (!!len){
            for (let i = 0; i < len; i++) {
                const dict = item_list[i];
                const pk_int = get_pk_from_id (dict);

                tblRow =  CreateTableRow(pk_int, ppk_int)
                UpdateTableRow(tblRow, dict)

// --- highlight selected row
                if (pk_int === selected_customer_pk) {
                    tblRow.classList.add("tsa_tr_selected")
                }
            }  // for (let i = 0; i
        }  //  if (!!len){

// === add row 'add new'
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "ppk": ppk_int, "new": true}

        tblRow = CreateTableRow(pk_new, ppk_int)
        UpdateTableRow(tblRow, dict)
    }  // FillTableRows(

//=========  CreateTableRow  ================ PR2019-09-04
    function CreateTableRow(pk, ppk_int ) {
        //console.log("=========  function CreateTableRow =========");
        //console.log("pk", pk, "ppk", ppk_int);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);

// get default ppk when is_new_item (default ppk = company_pk)
        if(!ppk_int) {ppk_int = get_attr_from_el(el_data, "data-ppk")};

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        const row_id = pk.toString();
        tblRow.setAttribute("id", row_id);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", "customer");
        tblRow.setAttribute("data-mode", selected_mode);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow
        let col_count;
        if (selected_mode === "list"){col_count = 4}

        for (let j = 0; j < col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img inactive to col_inactive
            if (j === col_count - 1){
        // --- add <a> element with EventListener to td
                el = document.createElement("a");
                el.setAttribute("href", "#");
                el.addEventListener("click", function(){HandleInactiveClicked(el)}, false )
                // TODO: make delete button AppendChildIcon(el, imgsrc_delete);   el.addEventListener("click", function() {UploadChanges(el)}, false )

                AppendChildIcon(el, imgsrc_active)
                td.appendChild(el);
                td.classList.add("td_width_032")

// --- add input element to td.
            } else {
                el = document.createElement("input");
                el.setAttribute("type", "text")
            };
            if(!!el){
// --- add data-field Attribute.
                let fieldname;
                if (j === 0){fieldname = "code"} else
                if (j === 1){ fieldname = "name"} else
                if (j === 2){ fieldname = "identifier"} else
                if (j === col_count - 1){ fieldname = "inactive"}
                el.setAttribute("data-field", fieldname);

                if (j === 0 && is_new_item ){ // only when is_new_item
                    el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_customer_add") + "...")
                }

    // --- add EventListener to td
                if ([0, 1, 2].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadChanges(el)}, false )} else
                if (j === col_count - 1) {
                }
    // --- add text_align
                td.classList.add("text_align_left")

    // --- add margin to first column
                if (j === 0 ){el.classList.add("mx-2")}

    // --- add width to fields
                if ([0, 2].indexOf( j ) > -1){el.classList.add("td_width_180")} else
                if (j === 1 ){el.classList.add("td_width_240")} else
                if (j === col_count - 1 ){el.classList.add("td_width_032")};

    // --- add other classes to td
                el.classList.add("border_none");
                el.classList.add("input_text");

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  // if(!!el){

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, item_dict){
        //console.log("--++- UpdateTableRow  --------------");

        if (!!item_dict && !!tblRow) {
            //console.log("item_dict", item_dict);

// get temp_pk_str and id_pk from item_dict["id"]
            // id: {temp_pk: "new_1", created: true, pk: 32, parent_pk: 18}
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let temp_pk_str, msg_err, is_new = false, is_created = false, is_deleted = false;
            let pk_int, ppk_int;
            if ("new" in id_dict) {is_new = true};
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("pk" in id_dict) {pk_int = id_dict["pk"]};
            if ("ppk" in id_dict) {ppk_int = id_dict["ppk"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            console.log("id_dict:", id_dict);
            console.log("is_created:", is_created, "temp_pk_str:", temp_pk_str)
            console.log("pk_int:", pk_int, "ppk_int:", ppk_int)

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                //console.log("msg_err", msg_err);

                // was: let el_input = tblRow.querySelector("[name=code]");
                //console.log("tblRow", tblRow)
                let td = tblRow.cells[0];
                //console.log("td", td)
                //console.log("td.child[0]",td.child[0])
                let el_input = tblRow.cells[0].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err,  [-160, 80])

// --- new created record
            } else if (is_created){
                let id_attr = get_attr_from_el(tblRow, "id")
                console.log(" is_created   id_attr:", id_attr)

                console.log(" temp_pk_str:", temp_pk_str)
            // check if item_dict.id 'new_1' is same as tablerow.id
                if(temp_pk_str === id_attr){
                    // if 'created' exists then 'pk' also exists in id_dict

            // update tablerow.id from temp_pk_str to id_pk
                    tblRow.setAttribute("id", pk_int);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", pk_int)
                    tblRow.setAttribute("data-ppk", ppk_int)

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
                        let el_input = tblRow.cells[i].children[0];
                        if(!!el_input){
    // --- lookup field in item_dict, get data from field_dict
                            fieldname = get_attr_from_el(el_input, "data-field");
                            // console.log("fieldname: ", fieldname)

                            // ShowMsgError is in function format_text_element
                            field_dict = {};
                            if (fieldname in item_dict){
                                field_dict = get_dict_value_by_key (item_dict, fieldname);
                                updated = get_dict_value_by_key (field_dict, "updated", false);

                                if(updated){
                                    el_input.classList.add("border_valid");
                                    setTimeout(function (){
                                        el_input.classList.remove("border_valid");
                                        }, 2000);
                                }

                                if (["code", "name", "identifier"].indexOf( fieldname ) > -1){
                                   //console.log("field_dict:", field_dict);
                                   format_text_element (el_input, el_msg, field_dict, [-220, 60])
                                };
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

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked)

// ---  highlight clicked row
        if(!!tr_clicked) {
            selected_customer_pk = get_datapk_from_element(tr_clicked)
            tr_clicked.classList.add("tsa_tr_selected")

// ---  highlight row in selecttable
            const tblName = get_attr_from_el(tr_clicked, "data-table")
            if (tblName === "customer"){HighlichtSelectTable(selected_customer_pk)};
        }
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
        if (is_inactive_str === "true") {imgsrc = imgsrc_inactive} else  {imgsrc = imgsrc_active}
        el_changed.children[0].setAttribute("src", imgsrc);

        if (is_inactive_str === "true" && !filter_show_inactive) {
            let tr_clicked = get_tablerow_clicked(el_changed);
            tr_clicked.classList.add("display_hide")
        }

        UploadChanges(el_changed)
    }

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        let tr_changed = get_tablerow_clicked(el_changed)
        UploadTblrowChanged(tr_changed);
    }

//========= UploadTblrowChanged  ============= PR2019-03-03
    function UploadTblrowChanged(tr_changed) {
        console.log( " ==== UploadTblrowChanged ====");
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input

        //console.log("=== UploadTblrowChanged");
        let new_item = GetItemDictFromTablerow(tr_changed);

        if(!!new_item) {
            let parameters = {"upload": JSON.stringify (new_item)};
            console.log( "upload", new_item);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_customer_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("item_dict" in response) {
                        ReplaceItemDict(customer_list, response["item_dict"])};

                    if ("item_update" in response) {
                        let item_update = response["item_update"]
                        UpdateTableRow(tr_changed, item_update)

                        // sort list and update table when code has changed
                        const field = "code";
                        const fld_dict = get_dict_value_by_key (item_update, field)

                        const is_created = get_subdict_value_by_key (item_update, "id", "created", false)

                    // add new empty row
                        if (is_created){
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const ppk_int = get_ppk_from_id (item_update)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": ppk_int}

                            let tblRow = CreateTableRow(pk_new, ppk_int)
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

//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable() {
        //console.log( "=== FillSelectTable ", table_name);

        const table_name = "customer"
        let selected_parent_pk = ppk_int
        let item_list = customer_list

        const caption_one = get_attr_from_el(el_data, "data-txt_customer_add");
        const caption_multiple = get_attr_from_el(el_data, "data-txt_select_scheme") + ":";

        tblBody_select.innerText = null;

        let len = item_list.length;
        let row_count = 0

//--- loop through item_list
        for (let i = 0, el_a; i < len; i++) {
            let item_dict = item_list[i];
            //console.log("item_dict:", item_dict)
            // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
            // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
            const pk = get_pk_from_id (item_dict)
            const parent_pk = get_ppk_from_id (item_dict)
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            //console.log("parent_pk", parent_pk, "selected_parent_pk", selected_parent_pk );

//--- only show items of selected_parent_pk
            if (parent_pk === selected_parent_pk){
//--------- insert tableBody row
                let tblRow = tblBody_select.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                tblRow.setAttribute("id", "sel_" + table_name + "_" + pk.toString());
                tblRow.setAttribute("data-pk", pk);
                tblRow.setAttribute("data-ppk", parent_pk);
                tblRow.setAttribute("data-value", code_value);
                tblRow.setAttribute("data-table", table_name);

                tblRow.classList.add(cls_bc_lightlightgrey);

//- add hover to select row
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

// --- add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);
                let inner_text = code_value
                if (table_name === "shift"){
                    // SHIFT_CAT_0256_RESTSHIFT
                    if (get_subdict_value_by_key(item_dict, "cat", "value") === 256) { inner_text += " (R)"}
                }
                td.innerText = inner_text;

// --- add active img to second td in table
                td = tblRow.insertCell(-1);
                    el_a = document.createElement("a");
                    el_a.setAttribute("href", "#");
                    //TODO ?? el_a.addEventListener("click", function() {UploadSchemeOrShiftOrTeam(tblRow, "inactive")}, false )

                    const field_name = "inactive", key_name = "value" ;
                    const inactive_value = get_subdict_value_by_key(item_dict, field_name, key_name, false)
                    el_a.setAttribute("data-field", field_name)
                    el_a.setAttribute("data-value",get_subdict_value_by_key(item_dict, field_name, key_name, false))

                    AppendChildIcon(el_a, imgsrc_active);
                td.appendChild(el_a);
                td.classList.add("td_width_032")

//- add hover to inactive button
                td.addEventListener("mouseenter", function(){
                    td.firstChild.firstChild.setAttribute("src", imgsrc_inactive);
                });
                td.addEventListener("mouseleave", function(){
                    td.firstChild.firstChild.setAttribute("src", imgsrc_active);
                });

// --- count tblRow
                row_count += 1
            } //  if (parent_pk === selected_order_pk)
        } // for (let i = 0; i < len; i++)

// ++++++ add addnew row  ++++++
    // skip add shift when there are already shifts
    if (row_count === 0 || table_name !== "shift"){

    //-- increase id_new
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()
    //--------- insert tableBody row
        let tblRow = tblBody_select.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "sel_" + table_name + "_" + pk_new);
        tblRow.setAttribute("data-pk", pk_new);
        tblRow.setAttribute("data-ppk", selected_parent_pk)
        tblRow.setAttribute("data-table", table_name);

        tblRow.classList.add("tsa_bc_lightlightgrey");
    //- add hover to tblBody_select row
        // don't add hover to row 'Add scheme/Team'
        //- add hover to inactive button
        tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
        tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

    // --- add first td to tblRow.
        // index -1 results in that the new cell will be inserted at the last position.
        let td = tblRow.insertCell(-1);
        let el_a = document.createElement("div");

    // --- add EventListener to input element, add innerText
                el_a.innerText = get_attr_from_el(el_data, "data-txt_shift_add") + "..."
                //TODO ?? el_a.addEventListener("click", function() {AddShift(tblRow)}, false )

            el_a.classList.add("tsa_color_darkgrey");

            //el_a.classList.add("tsa_bc_transparent");

        td.appendChild(el_a);
        td.setAttribute("colspan", "2");

    } // if (row_count === 0 || table_name !== "shift")

// ++++++ add tHeadRow  ++++++
    // get selecttable 'scheme' or 'team'
        let tbl = tblBody_select.parentNode

    // skip when tHeadRow already exists (!!tbl.tHead now working, is always true)
        const tHead_exists = (!!tbl.tHead.innerText)
        if (!tHead_exists) {
            let tHeadRow = tbl.tHead.insertRow(-1); // index -1: the new row will be inserted at the last position.

            //th.innerHTML = caption_one


            let th = document.createElement('td');
                let el_input = document.createElement('input');
                el_input.setAttribute("id", "id_flt_select");
                el_input.setAttribute("type", "text");
                el_input.classList.add("td_width_150");
                el_input.classList.add("line_height_normal");
                el_input.setAttribute("placeholder", "filter ...");
            // th.appendChild(el_input);
           // th.classList.add("td_width_150")

            th.innerHTML = "row 1"
            tHeadRow.appendChild(th);

            // --- add active img to second td in team table
            let th_img = document.createElement('td');
                //th_img.innerHTML = "img"
                el_a = document.createElement("a");
                el_a.setAttribute("href", "#");
                el_a.addEventListener("click", function() {HandleFilterInactive(el_a)}, false )
                AppendChildIcon(el_a, imgsrc_active);
            //th_img.appendChild(el_a);
            th_img.innerHTML = "row 2"
            //th_img.classList.add("td_width_032")
            tHeadRow.appendChild(th_img);

        }  // if(!tHead_exists) {

    } // FillSelectTable

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive(el) {
        console.log(" --- HandleFilterInactive --- ");
        console.log(el);
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        let img_src;
        if(filter_show_inactive) {img_src = imgsrc_inactive} else {img_src = imgsrc_active}
        const img = el.firstChild
        img.setAttribute("src", img_src);
        const col_inactive = 3;
        FilterTableRows(tblBody_items, filter_select, col_inactive, filter_show_inactive);

    }  // function HandleFilterInactive

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
            const col_inactive = 2;
            FilterTableRows(tblBody_items, filter_select, col_inactive, filter_show_inactive)
            FilterTableRows(tblBody_select, filter_select)

        } //  if (!skip_filter) {
    }; // function HandleFilterSelect

}); //$(document).ready(function()