// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";

// ---  set selected menu button active
        const cls_active = "active";
        const cls_hover = "tr_hover";

        let btn_clicked = document.getElementById("id_hdr_ordr");
        SetMenubuttonActive(btn_clicked);

// ---  id of selected customer and selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let filter_customers = "";
        let filter_orders = "";
        let filter_inactive_included = false;

        let customer_list = [];
        let order_list = [];
        let scheme_list = [];
        let schemeitem_list = [];
        let shift_list = [];
        let team_list = [];
        let teammember_list = [];
        let employee_list = [];

        let tblBody_select_customers = document.getElementById("id_tbody_select")
        let tblBody_items = document.getElementById("id_tbody_items");

        let el_popup_wdy = document.getElementById("id_popup_wdy");

        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            let close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_dhm
            if (event.target.classList.contains("input_popup_wdy")) {
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {
                close_popup = false
            }
            if (close_popup) {
                // remove selected color from all input popups
                popupbox_removebackground();
                el_popup_wdy.classList.add("display_hide");
            };
            // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                selected_order_pk = 0;
                DeselectHighlightedRows(tblBody_items);
            }

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

        // buttons in  popup_wdy)
        let el_popup_date = document.getElementById("id_popup_date")
        el_popup_date.addEventListener("change", function() {HandlePopupWdySave();}, false )

        let el_popup_wdy_save = document.getElementById("id_popup_wdy_save")
        //el_popup_wdy_save.addEventListener("click", function() {HandlePopupWdySave();}, false )

// ---  event handler to filter inactive in
        document.getElementById("id_filter_inactive").addEventListener("click", function() {HandleFilterInactive();}, false )

// ---  add 'keyup' event handler to filter orders and customers
        document.getElementById("id_filter_orders").addEventListener("keyup", function() {
            setTimeout(function() {HandleFilterOrders();}, 25)});
        document.getElementById("id_filter_customers").addEventListener("keyup", function() {
            setTimeout(function() {HandleFilterCustomers();}, 25)});

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")



// --- get data stored in page
        let el_data = document.getElementById("id_data");
        customer_list = get_attr_from_element(el_data, "data-customer_list");

        const url_order_upload = get_attr_from_element(el_data, "data-order_upload_url");
        const url_datalist_download = get_attr_from_element(el_data, "data-datalist_download_url");

        const imgsrc_inactive = get_attr_from_element(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_element(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_element(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_element(el_data, "data-imgsrc_warning");

        const weekday_list = get_attr_from_element(el_data, "data-weekdays");
        const month_list = get_attr_from_element(el_data, "data-months");
        const today_dict =  get_attr_from_element(el_data, "data-today");

        const interval = get_attr_from_element(el_data, "data-interval");
        const timeformat = get_attr_from_element(el_data, "data-timeformat");

        const title_inactive = get_attr_from_element(el_data, "data-txt_order_make_inactive");
        const title_active = get_attr_from_element(el_data, "data-txt_order_make_active");

        DatalistDownload({"customers": {inactive: false}, "orders": {inactive: true}});

//  #############################################################################################################

//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable(tablename, tableBody, item_list) {
        console.log( "=== FillSelectTable ");

        const caption_one = get_attr_from_element(el_data, "data-txt_select_customer") + ":";
        const caption_none = get_attr_from_element(el_data, "data-txt_select_customer_none") + ":";

        tableBody.innerText = null;

        let len = item_list.length;
        let row_count = 0

//--- loop through item_list
        if (len === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = get_attr_from_element(el_data, "data-txt_select_customer_none");
        } else {
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
                // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
                const pk = get_pk_from_id (item_dict)
                const parent_pk = get_parent_pk (item_dict)
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                // console.log( "pk: ", pk, " parent_pk: ", parent_pk, " code_value: ", code_value);

    //--- only show items of selected_parent_pk
                // NIU:  if (parent_pk === selected_parent_pk){
                if(true) {   // if (ShowSearchRow(code_value, filter_customers)) {

    //--------- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    tblRow.setAttribute("id", tablename + "_" + pk.toString());
                    tblRow.setAttribute("data-pk", pk);
                    tblRow.setAttribute("data-parent_pk", parent_pk);
                    tblRow.setAttribute("data-value", code_value);
                    tblRow.setAttribute("data-table", tablename);

//--------- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//--------- add EventListener to tableBody row
                    tblRow.addEventListener("click", function() {HandleSelectCustomer(tblRow)}, false )

// --- add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                    let td = tblRow.insertCell(-1);
                    td.innerText = code;

    // --- add second td to tblRow.
                    // NIU: td = tblRow.insertCell(-1);

    // --- add delete img to second td in team table
                    // NIU: let el_a = document.createElement("a");
                    // NIU: el_a.setAttribute("href", "#");
                    // NIU: el_a.addEventListener("click", function() {UploadSchemeOrTeam(el_a, "delete")}, false )

                    // NIU: AppendChildIcon(el_a, imgsrc_delete);

                    // NIU: td.appendChild(el_a);
                    td.classList.add("td_width_032")

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
        let tbody_clicked = tblRow.parentNode;
        DeselectHighlightedRows(tbody_clicked)

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  get pk from id of tblRow
            selected_customer_pk = get_datapk_from_element (tblRow)
            const customer_code = get_attr_from_element(tblRow, "data-value");
            const header_text = get_attr_from_element(el_data, "data-txt_orders_of_customer");

// ---  highlight clicked row
            tblRow.classList.add("tsa_tr_selected")
            hdr_customer.innerText = header_text + ": " + customer_code

// ---  fill table with orders of  selected customer
            FillTableRows()

            console.log( "filter_inactive_included ", filter_inactive_included);

            FilterTableRows(tblBody_items, filter_orders, filter_inactive_included)
        }
    }

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked.parentNode)

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_order_pk = get_datapk_from_element(tr_clicked)
            tr_clicked.classList.add("tsa_tr_selected")
        }
    }


//========= GetItemFromTablerow  ============= PR2019-05-11
    function GetItemFromTablerow(tr_changed) {
        console.log("======== GetItemFromTablerow");

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
                        fieldname = get_attr_from_element(el_input, "data-field");
    // ---  get value
                        if (["code", "name"].indexOf( fieldname ) > -1){
                            value = el_input.value;
                        } else if (["datefirst", "datelast", "inactive"].indexOf( fieldname ) > -1){
                            value = get_attr_from_element(el_input, "data-value"); // data-value="2019-05-11"
                        };
                        o_value = get_attr_from_element(el_input, "data-o_value"); // data-value="2019-03-29"
                        // console.log("fieldname", fieldname, "value", value, "o_value", o_value);

    // ---  add value to dict when changed
                        if(value_has_changed(value, o_value)){
                            field_dict["update"] = true;
                            if(!!value){field_dict["value"] = value};
                        };
    // ---  add field_dict to item_dict
                        if (!isEmpty(field_dict)){
                            item_dict[fieldname] = field_dict;
                        };
                    } //  if(!!el_input){
                };  //  for (let i = 0, el_input,

            }  // if (!!tr_changed.cells){
        };  // if (!!id_dict){
        return item_dict;
    };  // function GetItemFromTablerow


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

        if (is_inactive_str === "true" && !filter_inactive_included) {
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
        let new_item = GetItemFromTablerow(tr_changed);
        console.log("new_item", new_item);

        if(!!new_item) {
            let parameters = {"upload": JSON.stringify (new_item)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_order_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"]}
                    if ("team_list" in response) {
                        team_list= response["team_list"]}
                    if ("teammember_list" in response) {
                        teammember_list= response["teammember_list"]}
                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        UpdateTableRow(tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        if (is_created){
                        // add ne empty row
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_parent_pk (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "parent_pk": parent_pk}

                            if (tblName === "schemeitems"){
                                let rosterdate_dict = get_dict_value_by_key (item_dict, "rosterdate")
                                if(isEmpty(rosterdate_dict)){rosterdate_dict = today_dict}
                                new_dict["rosterdate"] = rosterdate_dict
                            } else  if (tblName === "teammembers"){
                                const team_code = get_subdict_value_by_key (item_dict, "team", "value")
                                new_dict["team"] = {"pk": parent_pk, "value": team_code}
                            }
                            let tblRow = CreateTableRow(tblName, pk_new, parent_pk, {})
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

//=========  HandleDeleteTblrow  ================ PR2019-03-16
    function HandleDeleteTblrow(tblName, tblRow) {
        // console.log("=== HandleDeleteTblrow");

// ---  get pk from id of tblRow
            const pk_int = get_datapk_from_element (tblRow)
            const parent_pk_int = parseInt(get_attr_from_element(tblRow, "data-parent_pk"))

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
                    let parameters = {"schemeitem_upload": JSON.stringify (param)};
                    let response = "";

                    $.ajax({
                        type: "POST",
                        url: url_order_upload,
                        data: parameters,
                        dataType:'json',
                        success: function (response) {
                            console.log ("response:");
                            console.log (response);
                            if ("item_update" in response){
                                let update_dict = response["item_update"]
                                UpdateSchemeitemOrTeammmember(tblRow, update_dict)
                            };
                        },
                        error: function (xhr, msg) {
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
            console.log("pk: ", pk, "parent_pk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    let tblName = get_dict_value_by_key (id_dict, "table");
                    FillTableRows(tblName)
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
                    ShowMsgError(tblRow.cells[0], id_dict.error, -60)
                } // if (id_deleted){


            } // if (!!tblRow){
        }  // if (!!update_dict)
    }  // UpdateSchemeitemOrTeammmember



//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive() {
        console.log("=========  function HandleFilterInactive =========");
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
        FilterTableRows(tblBody_items, filter_orders, filter_inactive_included)
    }  // function HandleFilterInactive


//========= HandleFilterOrders  ====================================
    function HandleFilterOrders() {
        console.log( "===== HandleFilterOrders  ========= ");
        // don't skip, must run this code also when customer has changed. Was: skip filter if filter value has not changed, update variable filter_orders
        let new_filter = document.getElementById("id_filter_orders").value;
        filter_orders = new_filter.toLowerCase();

        FilterTableRows(tblBody_items, filter_orders, filter_inactive_included)

    }; // function HandleFilterOrders


//========= HandleFilterCustomers  ====================================
    function HandleFilterCustomers() {
        console.log( "===== HandleFilterCustomers  ========= ");
        // skip filter if filter value has not changed, update variable filter_customers
        let new_filter = document.getElementById("id_filter_customers").value;
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
            FillSelectTable("customers", tblBody_select_customers, customer_list)
        } //  if (!skip_filter) {
    }; // function HandleFilterCustomers


//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( datalist_request)
        // datalist_request: {"schemeitems": {"parent_pk": pk}, "teams": {"parent_pk": pk}, "shifts": {"parent_pk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customers") {customer_list = []};
            if (key === "orders") {order_list = []};
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

                if ("customers" in datalist_request) {
                    if ("customers" in response) {customer_list= response["customers"]}
                    let txt_select = get_attr_from_element(el_data, "data-txt_select_customer");
                    let txt_select_none = get_attr_from_element(el_data, "data-txt_select_customer_none");
                    FillSelectTable("customers", tblBody_select_customers, customer_list)
                }
                if ("orders" in datalist_request) {
                    if ("orders" in response) {order_list= response["orders"]}
                }
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//========= FillDatalist  ====================================
    function FillDatalist(id_datalist, data_list, scheme_pk) {
        console.log( "===== FillDatalist  ========= ");

        let el_datalist = document.getElementById(id_datalist);
        el_datalist.innerText = null
        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {

            let dict = data_list[row_index];
            let pk = get_pk_from_id (dict)
            let parent_pk = get_parent_pk (dict)
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
            let pk = get_pk_from_id(dict);
            let parent_pk_in_dict = get_parent_pk(dict)

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
                option_text += " data-parent_pk=\"" + parent_pk + "\"";
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
        console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list and  selected_parent_pk
        let item_list, selected_parent_pk;
        item_list = order_list;
        selected_parent_pk = selected_customer_pk

// --- loop through item_list
        const len = item_list.length;
        let rosterdate_dict = {};
        let tblRow;
        if (!!len && selected_parent_pk){
            for (let i = 0; i < len; i++) {
                let dict = item_list[i];
                let pk = get_pk_from_id (dict)
                let parent_pk = get_parent_pk (dict)

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

        dict["id"] = {"pk": pk_new, "parent_pk": selected_customer_pk, "new": true}

        tblRow = CreateTableRow(pk_new, selected_parent_pk)
        UpdateTableRow(tblRow, dict)
    }  // FillTableRows(

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow(pk, parent_pk, rosterdate_or_teamname) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "parent_pk", parent_pk, "new_name_or_date", rosterdate_or_teamname);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-parent_pk", parent_pk);
        tblRow.setAttribute("data-table", "orders");

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count = 5

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img inactive to last td
            if ([column_count - 1].indexOf( j ) > -1){
                if (!is_new_item){
            // --- add <a> element with EventListener to td
                    el = document.createElement("a");
                    el.addEventListener("click", function(){HandleInactiveClicked(el);}, false )
                    el.setAttribute("href", "#");
                    el.setAttribute("data-field", "inactive");
                    AppendChildIcon(el, imgsrc_active)
                    td.appendChild(el);

                    td.classList.add("td_width_032")
                }
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
                    el.setAttribute("placeholder", get_attr_from_element(el_data, "data-txt_order_add") + "...")
                }

// --- add EventListener to td
                if ([0, 1].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadChanges(el);}, false )} else
                if ([2, 3].indexOf( j ) > -1){
                    el.addEventListener("click", function() {OpenPopupWDY(el);}, false )};

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
                    el.classList.add("input_popup_wdy");
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
        console.log("--++- UpdateTableRow  --------------");

        if (!!item_dict && !!tblRow) {
            console.log("tblRow", tblRow);
            console.log("item_dict", item_dict);

            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // item_dict = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'namelast': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'namefirst': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

// get temp_pk_str and id_pk from item_dict["id"]
            // id: {temp_pk: "new_1", created: true, pk: 32, parent_pk: 18}
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let temp_pk_str, msg_err, is_new = false, is_created = false, is_deleted = false;
            if ("new" in id_dict) {is_new = true};
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};

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
                el_input.classList.add("border_invalid");

                ShowMsgError(el_input, msg_err, -60)

// --- new created record
            } else if (is_created){
                let id_attr = get_attr_from_element_int(tblRow,"id")
                console.log("id_attr", id_attr)

            // check if item_dict.id 'new_1' is same as tablerow.id
                if(temp_pk_str === id_attr){
                    // if 'created' exists then 'pk' also exists in id_dict
                    const id_pk = get_dict_value_by_key (id_dict, "pk");

            // update tablerow.id from temp_pk_str to id_pk
                    tblRow.setAttribute("id", id_pk);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", id_pk)

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
                        let wdm = "", wdmy = "", dmy = "", offset = "", team_pk = "", dhm = "", hm = "";
                        let employee_pk;

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
                                // console.log("updated: ", updated)

                                if(!!err){
                                    ShowMsgError(el_input, msg_err, -60)
                                } else if(updated){
                                    el_input.classList.add("border_valid");
                                    setTimeout(function (){
                                        el_input.classList.remove("border_valid");
                                        }, 2000);
                                }

                                if (["code", "name"].indexOf( fieldname ) > -1){
                                   format_text_element (el_input, field_dict)
                                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                                   format_date_element (el_input, field_dict, false,true) // show_weekday=false, show_year=true
                                };
                            }  // if (fieldname in item_dict)

                            if (fieldname === "inactive") {
                               if(!field_dict){field_dict = {value: false}}

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


//========= OpenPopupWDY  ====================================
    function OpenPopupWDY(el_input) {
        console.log("===  OpenPopupWDY  =====") ;

        let el_popup_wdy = document.getElementById("id_popup_wdy")

// ---  reset textbox 'date'

        //el_popup_date.innerText = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected,

        if (!!tr_selected){
            const data_table = get_attr_from_element(tr_selected, "data-table")
            const id_str = get_attr_from_element(tr_selected, "data-pk")
            const parent_pk_str = get_attr_from_element(tr_selected, "data-parent_pk");
            console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
            const data_field = get_attr_from_element(el_input, "data-field");
            const data_value = get_attr_from_element(el_input, "data-value");
            const wdmy =  get_attr_from_element(el_input, "data-wdmy");
            console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

    // put values in el_popup_wdy
            el_popup_wdy.setAttribute("data-table", data_table);
            el_popup_wdy.setAttribute("data-pk", id_str);
            el_popup_wdy.setAttribute("data-parent_pk", parent_pk_str);

            el_popup_wdy.setAttribute("data-field", data_field);
            el_popup_wdy.setAttribute("data-value", data_value);
            el_popup_wdy.setAttribute("data-o_value", data_value);

            if (!!data_value){el_popup_date.value = data_value};


    // ---  position popup under el_input
            let popRect = el_popup_wdy.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();
            let topPos = inpRect.top; // + inpRect.height;
            let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_popup_wdy.setAttribute("style", msgAttr)

    // ---  change background of el_input
            // first remove selected color from all imput popups
            elements = document.getElementsByClassName("el_input");
            popupbox_removebackground();
            el_input.classList.add("pop_background");

    // ---  show el_popup
            el_popup_wdy.classList.remove("display_hide");

        }  // if (!!tr_selected){

}; // function OpenPopupWDY



//=========  HandlePopupWdmySave  ================ PR2019-04-14
    function HandlePopupWdySave() {
console.log("===  function HandlePopupWdySave =========");

        //let el_popup_wdy = document.getElementById("id_popup_wdy")

// ---  get pk_str from id of el_popup
        const pk_str = el_popup_wdy.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_popup_wdy.getAttribute("data-parent_pk"))
        const fieldname =  el_popup_wdy.getAttribute("data-field")
        const tablename =  el_popup_wdy.getAttribute("data-table")
        // console.log("pk_str: ", pk_str, typeof pk_str)
        // console.log("parent_pk: ", parent_pk, typeof parent_pk)
        // console.log("fieldname: ", fieldname, typeof fieldname)
        // console.log("tablename: ", tablename, typeof tablename)

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
            id_dict["parent_pk"] = parent_pk
            id_dict["table"] = tablename

            if (!!id_dict){row_upload["id"] = id_dict};

            const name_str = el_popup_wdy.getAttribute("data-field") // nanme of element clicked
            //const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
            const n_value = el_popup_date.value
            const o_value = el_popup_wdy.getAttribute("data-o_value") // value of element clicked "-1;17;45"
                // console.log ("name_str: ",name_str );
                // console.log ("n_value: ",n_value );
                // console.log ("o_value: ",o_value );

// create new_dhm string

            if (n_value !== o_value) {

                let tr_selected = document.getElementById(pk_str)

                let field_dict = {"value": n_value, "update": true}
                row_upload[name_str] =  field_dict;
                console.log ("field_dict: ", field_dict);

                let parameters = {};
                parameters["upload"] = JSON.stringify (row_upload);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_order_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response", response);
                        if ("item_update" in response) {
                            if (tablename === "scheme"){
                                FillScheme( response["item_update"])
                            } else {
                                UpdateTableRow(tr_selected, response["item_update"])
                            }
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)

            //popupbox_removebackground();
            //el_popup_wdy.classList.add("display_hide");


            setTimeout(function() {
                popupbox_removebackground();
                el_popup_wdy.classList.add("display_hide");
            }, 2000);


        }  // if(!!pk_str && !! parent_pk){
    }  // HandlePopupWdySave



//========= function pop_background_remove  ====================================
    function popupbox_removebackground(){
        // remove selected color from all input popups
        // was: let elements = document.getElementsByClassName("input_popup_dhm");
        let elements =  document.querySelectorAll(".input_popup_dhm, .input_popup_wdy")
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }


//========= CreateInfo  ============= PR2019-02-21
    function CreateInfo(sel_checkbox, field, caption) {
        const id_chk = "id_mod_" + field;
        $("<div>").appendTo(sel_checkbox)
            .attr({"id": id_chk + "_div"})
            .addClass("checkbox ");
        let chk_div = $("#" +id_chk + "_div");

        $("<p>").appendTo("#" + id_chk + "_div")
             .html(caption);
    }

}); //$(document).ready(function()