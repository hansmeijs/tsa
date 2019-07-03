// PR2019-6-16
$(function() {
        "use strict";

// ---  set selected menu button active
        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_hide = "display_hide";
        const index_el_inactive = 2;
        const col_count = 3;

        SetMenubuttonActive(document.getElementById("id_hdr_cust"));

// ---  id of selected customer
        let selected_customer_pk = 0;

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let filter_name = "";
        let filter_show_inactive = false;

        let customer_list = [];

        let tblBody_items = document.getElementById("id_tbody_items");

        let el_loader = document.getElementById("id_loading_img");
        let el_msg = document.getElementById("id_msgbox");

        document.addEventListener('click', function (event) {
// hide msgbox
            el_msg.classList.remove("show");
// remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                selected_customer_pk = 0;
                DeselectHighlightedRows(tblBody_items)}
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
        document.getElementById("id_filter").addEventListener("keyup", function() {
            setTimeout(function() {HandleFilterName();}, 50)});

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer");

// --- get data stored in page
        let el_data = document.getElementById("id_data");

        const parent_pk = get_attr_from_element(el_data, "data-ppk");

        const url_customer_upload = get_attr_from_element(el_data, "data-customer_upload_url");
        const url_datalist_download = get_attr_from_element(el_data, "data-datalist_download_url");

        const imgsrc_inactive = get_attr_from_element(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_element(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_element(el_data, "data-imgsrc_delete");

        const title_inactive = get_attr_from_element(el_data, "data-txt_make_inactive");
        const title_active = get_attr_from_element(el_data, "data-txt_make_active");

        const user_lang = get_attr_from_element(el_data, "data-lang");

        DatalistDownload({"customer": {inactive: true}});

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        // console.log( "=== DatalistDownload ")
        // console.log( datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customer") {customer_list = []};
        }

        // show loader
        el_loader.classList.remove(cls_hide)

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
                el_loader.classList.add(cls_hide)

                if ("customer" in datalist_request) {
                    if ("customer" in response) {customer_list= response["customer"]}
                    FillTableRows();
                    FilterTableRows(tblBody_items, filter_name, filter_show_inactive);
                }
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list and  selected_parent_pk
        let item_list;
        item_list = customer_list;
        console.log( "===== item_list  ========= ", item_list);

// --- loop through item_list
        const len = item_list.length;
        let rosterdate_dict = {};
        let tblRow;
        if (!!len){
            for (let i = 0; i < len; i++) {
                let dict = item_list[i];
                let pk = get_pk_from_id (dict)

                tblRow =  CreateTableRow(pk, parent_pk)
                UpdateTableRow(tblRow, dict)

// --- highlight selected row
                if (pk === selected_customer_pk) {
                    tblRow.classList.add("tsa_tr_selected")
                }
            }  // for (let i = 0; i
        }  //  if (!!len){

// === add row 'add new'
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "new": true}

        tblRow = CreateTableRow(pk_new, parent_pk)
        UpdateTableRow(tblRow, dict)
    }  // FillTableRows(

//=========  CreateTableRow  ================ PR2019-06-16
    function CreateTableRow(pk, parent_pk) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "ppk", parent_pk, "new_name_or_date", rosterdate_or_teamname);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", parent_pk);
        tblRow.setAttribute("data-table", "customer");

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow
        for (let j = 0; j < col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img inactive to index_el_inactive
            if (j === index_el_inactive){
                if(!is_new_item){
        // --- add <a> element with EventListener to td
                    el = document.createElement("a");
                    el.setAttribute("href", "#");
                    AppendChildIcon(el, imgsrc_active)}
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
                if (j === index_el_inactive){ fieldname = "inactive"}
                el.setAttribute("data-field", fieldname);

                if (j === 0 && is_new_item ){
                    el.setAttribute("placeholder", get_attr_from_element(el_data, "data-txt_customer_add") + "...")
                }

    // --- add EventListener to td
                if ([0, 1].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadChanges(el)}, false )} else
                if (j === index_el_inactive) {
                    el.addEventListener("click", function(){HandleInactiveClicked(el)}, false )
                }
    // --- add text_align
                if ( ([0, 1].indexOf( j ) > -1) ){
                    td.classList.add("text_align_left")
                }

    // --- add margin to first column
                if (j === 0 ){el.classList.add("mx-2")}

    // --- add width to time fields and date fileds
                if (j === 0 ){el.classList.add("td_width_180")} else
                if (j === 1 ){el.classList.add("td_width_240")} else
                if (j === index_el_inactive ){el.classList.add("td_width_032")};

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
        // console.log("--++- UpdateTableRow  --------------");

        if (!!item_dict && !!tblRow) {
            // console.log("tblRow", tblRow);
            // console.log("item_dict", item_dict);

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
                let td = tblRow.cells[0];
                //console.log("td", td)
                //console.log("td.child[0]",td.child[0])
                let el_input = tblRow.cells[0].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_invalid");

                ShowMsgError(el_input, el_msg, msg_err, -60)

// --- new created record
            } else if (is_created){
                let id_attr = get_attr_from_element(tblRow,"id")
                console.log(" is_created   id_attr:", id_attr)

                console.log(" temp_pk_str:", temp_pk_str)
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
                        let field_dict = {}, fieldname, updated, msg_err;
                        let value = "", o_value, n_value, data_value, data_o_value;

                        // el_input is first child of td, td is cell of tblRow
                        let el_input = tblRow.cells[i].children[0];
                        if(!!el_input){
    // --- lookup field in item_dict, get data from field_dict
                            fieldname = get_attr_from_element(el_input, "data-field");
                            // console.log("fieldname: ", fieldname)

                            field_dict = {};
                            if (fieldname in item_dict){
                                field_dict = get_dict_value_by_key (item_dict, fieldname);
                                updated = get_dict_value_by_key (field_dict, "updated");
                                msg_err = get_dict_value_by_key (field_dict, "error");
                                // console.log("field_dict: ", field_dict)
                                // console.log("msg_err: ", msg_err)

                                if(!!msg_err){
                                    ShowMsgError(el_input, el_msg, msg_err, -60)
                                } else if(updated){
                                    el_input.classList.add("border_valid");
                                    setTimeout(function (){
                                        el_input.classList.remove("border_valid");
                                        }, 2000);
                                }

                                if (["code", "name", "identifier"].indexOf( fieldname ) > -1){
                                   format_text_element (el_input, el_msg, field_dict)
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
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked.parentNode)

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_customer_pk = get_datapk_from_element(tr_clicked)
            tr_clicked.classList.add("tsa_tr_selected")
        }
    }

//========= HandleInactiveClicked  ============= PR2019-03-03
    function HandleInactiveClicked(el_changed) {
        console.log("======== HandleInactiveClicked  ========");
        console.log(el_changed);

        let is_inactive_str = get_attr_from_element(el_changed, "data-value")
        // toggle value of is_inactive
        if (is_inactive_str === "true"){is_inactive_str = "false"} else {is_inactive_str = "true"}
        console.log("is_inactive_str: ", is_inactive_str, typeof is_inactive_str);
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
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadTblrowChanged(tr_changed) {
        console.log("=== UploadTblrowChanged");
        let new_item = GetItemDictFromTablerow(tr_changed);
        console.log("upload");
        console.log(new_item);

        if(!!new_item) {

            // show loader
            el_loader.classList.remove(cls_hide)

            let parameters = {"upload": JSON.stringify (new_item)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_customer_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);
                    // hide loader
                    el_loader.classList.add(cls_hide)

                    if ("item_dict" in response) {
                        ReplaceItemDict(customer_list, response["item_dict"])};

                    if ("item_update" in response) {
                        let item_update = response["item_update"]
                        // const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        UpdateTableRow(tr_changed, item_update)

                        // sort list and update table when code has changed
                        const field = "code";
                        const fld_dict = get_dict_value_by_key (item_update, field)
                        if (!isEmpty(fld_dict)){
                            const fld_val = get_dict_value_by_key (fld_dict, "updated")
                            if (!!fld_val) {
                                customer_list = SortItemList (customer_list, "code", user_lang)
                                FillTableRows()
                                FilterTableRows(tblBody_items, filter_name, filter_show_inactive);
                            }
                        }
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_update, "id", "created", false)

                    // add new empty row
                        if (is_created){
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_parent_pk (item_update)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk}

                            let tblRow = CreateTableRow(pk_new)
                            UpdateTableRow(tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    // hide loader
                    el_loader.classList.add(cls_hide)
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadTblrowChanged

//=========  HandleDeleteTblrow  ================ PR2019-03-16
    function HandleDeleteTblrow(tblName, tblRow) {
        // console.log("=== HandleDeleteTblrow");

// ---  get pk from id of tblRow
            const pk_int = get_datapk_from_element (tblRow)
            const parent_pk_int = parseInt(get_attr_from_element(tblRow, "data-ppk"))

            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int) {
            // when pk_int = 'new_2' row is new row and is not yet saved, can be deleted without ajax
                tblRow.parentNode.removeChild(tblRow);
            } else {

// ---  create id_dict
                const id_dict = get_iddict_from_element(tblRow);
                // add id_dict to new_item
                if (!!id_dict){
    // ---  create param
                    id_dict["delete"] = true;
                    let param = {"id": id_dict}
                    console.log( "param: ");
                    console.log(param);
    // delete  record
                    // make row red
                    tblRow.classList.add("tsa_tr_error");

        // show loader
        el_loader.classList.remove(cls_hide)

                    let parameters = {"schemeitem_upload": JSON.stringify (param)};
                    let response = "";

                    $.ajax({
                        type: "POST",
                        url: url_customer_upload,
                        data: parameters,
                        dataType:'json',
                        success: function (response) {
                            console.log ("response:");
                            console.log (response);
        // hide loader
                            el_loader.classList.add(cls_hide)

                            if ("item_update" in response){
                                let update_dict = response["item_update"]
                                UpdateSchemeitemOrTeammmember(tblRow, update_dict)
                            };
                        },
                        error: function (xhr, msg) {
                            // hide loader
                            el_loader.classList.add(cls_hide)
                            console.log(msg + '\n' + xhr.responseText);
                            alert(msg + '\n' + xhr.responseText);
                        }
                    });

                }  // if (!!id_dict)
            }; // if (!pk_int)

    }

//========= UpdateSchemeitemOrTeammmember  =============
    function UpdateSchemeitemOrTeammmember(tblRow, update_dict){
        console.log("=== UpdateSchemeitemOrTeammmember ===");
        console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            const pk = get_pk_from_id(update_dict);
            const parent_pk = get_parent_pk(update_dict);
            console.log("pk: ", pk, "ppk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    let tblName = get_dict_value_by_key (id_dict, "table");
                    FillTableRows()
                    let tblRowSelected = document.getElementById(pk.toString())
                    tblRowSelected.classList.remove("tsa_tr_selected");
                    tblRowSelected.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRowSelected.classList.remove("tsa_tr_ok");
                        tblRowSelected.classList.add("tsa_tr_selected");
                    }, 2000);
// --- remove deleted record from list
                } else if ("deleted" in id_dict) {
                    tblRow.parentNode.removeChild(tblRow);

// --- when err: show error message
                } else if ("error" in id_dict){
                    ShowMsgError(tblRow.cells[0], el_msg, id_dict.error, -60)
                } // if (id_deleted){


            } // if (!!tblRow){
        }  // if (!!update_dict)
    }  // UpdateSchemeitemOrTeammmember


//=========  HandleFilterInactive  ================ PR2019-06-18
    function HandleFilterInactive() {
        console.log("=======XXXXXXXXXXX==  function HandleFilterInactive =========");

// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        let data_value, img_src;
        if (filter_show_inactive){data_value = true} else {data_value = false};
        if (filter_show_inactive){img_src = imgsrc_inactive} else {img_src = imgsrc_active};

        let el_img_filter_inactive = document.getElementById("id_img_filter_inactive");
        el_img_filter_inactive.setAttribute("src", img_src);
        el_img_filter_inactive.setAttribute("data-value", data_value);

        FilterTableRows(tblBody_items, filter_name, filter_show_inactive)


    }  // function HandleFilterInactive


//=========  DeselectHighlightedRows  ================ PR2019-04-30
    function DeselectHighlightedRows(tableBody) {
        //console.log("=========  DeselectHighlightedRows =========");
        if(!!tableBody){
            let tblrows = tableBody.getElementsByClassName("tsa_tr_selected");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_tr_selected")
            }
// don't remove tsa_tr_error
            //tblrows = tableBody.getElementsByClassName("tsa_tr_error");
            //for (let i = 0, len = tblrows.length; i < len; i++) {
            //   tblrows[i].classList.remove("tsa_tr_error")
            //}
            tblrows = tableBody.getElementsByClassName("tsa_bc_yellow_lightlight");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_bc_yellow_lightlight")
            }
        }
    }
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive() {
        console.log("=========  function HandleFilterInactive =========");
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        let el_img_filter_inactive = document.getElementById("id_img_filter_inactive");
        if (filter_show_inactive) {
            el_img_filter_inactive.setAttribute("src", imgsrc_inactive);
        } else {
            el_img_filter_inactive.setAttribute("src", imgsrc_active);
        }
        FilterTableRows(tblBody_items, filter_name, filter_show_inactive);

    }  // function HandleFilterInactive

//========= HandleFilterName  ====================================
    function HandleFilterName() {
        // console.log( "===== HandleFilterName  ========= ");
        // skip filter if filter value has not changed, update variable filter_name
        let new_filter = document.getElementById("id_filter").value;
        let skip_filter = false
        if (!new_filter){
            if (!filter_name){
                skip_filter = true
            } else {
                filter_name = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_name) {
                skip_filter = true
            } else {
                filter_name = new_filter.toLowerCase();
            }
        }
        if (!skip_filter) {
            FilterTableRows(tblBody_items, filter_name, filter_show_inactive)
        } //  if (!skip_filter) {
    }; // function HandleFilterName



}); //$(document).ready(function()